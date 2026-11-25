import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkSlidingWindowLimit, extractClientIp } from '@/lib/ai-optimizer';
import { updateOrganizationSaasConfig } from '@/lib/saas-storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RegisterOwnerSchema = z.object({
  companyName: z.string().trim().min(2, 'El nombre de tu empresa es obligatorio').max(100),
  email: z.string().trim().email('Correo electrónico inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(128),
  fullName: z.string().trim().max(100).optional(),
});

function slugify(input: string) {
  return (
    input
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'empresa'
  );
}

function generateInviteCode(name: string) {
  const prefix =
    name
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 6) || 'EMP';
  const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${suffix}`;
}

export async function POST(req: NextRequest) {
  try {
    const clientIp = extractClientIp(req.headers);
    const allowed = checkSlidingWindowLimit(`register_owner:${clientIp}`, 5, 60 * 60_000);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Demasiados intentos de registro desde esta red. Intenta más tarde.' },
        { status: 429 }
      );
    }

    const rawBody = await req.json();
    const parsed = RegisterOwnerSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || 'Datos de registro inválidos' },
        { status: 400 }
      );
    }

    const { companyName, email, password, fullName } = parsed.data;
    const admin = createAdminClient();

    // 1. Verificar que no exista el usuario previamente
    const { data: existingProfile } = await admin
      .from('profiles')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (existingProfile) {
      return NextResponse.json(
        { error: 'Ya existe una cuenta registrada con este correo electrónico.' },
        { status: 409 }
      );
    }

    // 2. Crear organización privada en estado onboarding_completed = false y plan free
    const slug = `${slugify(companyName)}-${Math.random().toString(36).slice(2, 6)}`;
    const inviteCode = generateInviteCode(companyName);

    const { data: newOrg, error: orgError } = await admin
      .from('organizations')
      .insert({
        name: companyName,
        slug,
        invite_code: inviteCode,
        legal_name: companyName,
        contact_email: email.toLowerCase(),
        is_demo: false,
        is_active: true,
        bank_info: {},
      } as any)
      .select('*')
      .single();

    if (orgError || !newOrg) {
      throw orgError || new Error('No se pudo crear la organización.');
    }

    // Estampar configuración SaaS inicial (onboarding pendiente)
    await updateOrganizationSaasConfig(newOrg.id, {
      industry_type: 'eventos_banqueteria',
      theme_preset: 'obsidian_gold',
      operation_mode: 'project',
      onboarding_completed: false,
      is_exempt: false,
      subscription_tier: 'free',
      subscription_status: 'active',
      selected_modules: [],
      current_period_start: null,
      current_period_end: null,
      ai_calls_used: 0,
      ai_calls_reset_at: new Date(
        new Date().getFullYear(),
        new Date().getMonth() + 1,
        1
      ).toISOString(),
    });

    // 3. Crear usuario autenticado en Supabase Auth con email confirmado para onboarding fluido
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: email.toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName || companyName,
      },
    });

    if (authError || !authData.user) {
      await admin.from('organizations').delete().eq('id', newOrg.id);
      return NextResponse.json(
        { error: 'No se pudo crear la cuenta de usuario. Verifica tus datos.' },
        { status: 400 }
      );
    }

    // 4. Vincular perfil como administrador activo de su nueva empresa
    const { error: profileError } = await admin
      .from('profiles')
      .upsert(
        {
          id: authData.user.id,
          email: email.toLowerCase(),
          full_name: fullName || null,
          role: 'admin',
          status: 'active',
          organization_id: newOrg.id,
          is_super_admin: false,
        } as any,
        { onConflict: 'id' }
      );

    if (profileError) {
      throw profileError;
    }

    return NextResponse.json({
      success: true,
      organizationId: newOrg.id,
      inviteCode,
    });
  } catch (err: any) {
    console.error('Error POST /api/auth/register-owner:', err);
    return NextResponse.json(
      { error: 'Error interno al crear tu empresa.' },
      { status: 500 }
    );
  }
}
