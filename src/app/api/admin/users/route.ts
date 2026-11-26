import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient, getAuthenticatedContext } from '@/lib/supabase/admin';
import { extractClientIp } from '@/lib/ai-optimizer';
import { SUPER_ADMIN_EMAIL } from '@/lib/constants';
import { isDuoProducciones, resolveOrgEntitlements } from '@/lib/entitlements';
import { fetchPlansAndAddonsServer, hydrateOrganizationSaas } from '@/lib/saas-storage';
import { hasGranularRbac } from '@/lib/rbac';
import { logAudit } from '@/lib/audit';
import type { Organization, Profile, ProfileRole } from '@/types/database';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROLE_ENUM = z.enum([
  'owner',
  'admin',
  'comercial',
  'finanzas',
  'operaciones',
  'contador_lectura',
  'member',
]);

const GRANULAR_ONLY_ROLES = new Set<ProfileRole>([
  'comercial',
  'finanzas',
  'operaciones',
  'contador_lectura',
]);

const UpdateUserSchema = z.object({
  userId: z.string().uuid(),
  status: z.enum(['pending', 'active']).optional(),
  role: ROLE_ENUM.optional(),
  organization_id: z.string().uuid().nullable().optional(),
});

const CreateUserSchema = z.object({
  email: z.string().trim().email('Ingrese un correo electrónico válido.'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres.')
    .max(128),
  full_name: z.string().trim().max(120).optional().nullable(),
  role: ROLE_ENUM.default('comercial'),
  organization_id: z.string().uuid().optional(),
});

function getAuthFlags(ctx: Awaited<ReturnType<typeof getAuthenticatedContext>>) {
  if (!ctx || !ctx.profile || ctx.profile.status !== 'active') {
    return {
      allowed: false,
      isSuperAdmin: false,
      isOwner: false,
      orgId: null as string | null,
    };
  }
  const isSuperAdmin =
    Boolean(ctx.profile.is_super_admin) ||
    ctx.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

  if (!isSuperAdmin && ctx.organization?.is_demo) {
    return {
      allowed: false,
      isSuperAdmin: false,
      isOwner: false,
      orgId: null as string | null,
    };
  }

  const isCompanyAdmin =
    (ctx.profile.role === 'owner' || ctx.profile.role === 'admin') &&
    Boolean(ctx.profile.organization_id);
  const isOwner = isSuperAdmin || ctx.profile.role === 'owner';

  return {
    allowed: isSuperAdmin || isCompanyAdmin,
    isSuperAdmin,
    isOwner,
    orgId: ctx.profile.organization_id,
  };
}

async function resolveTargetOrgEntitlements(
  admin: ReturnType<typeof createAdminClient>,
  orgId: string
) {
  const { data: orgRaw } = await admin
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .single();
  if (!orgRaw) return null;
  const org = hydrateOrganizationSaas(orgRaw as Organization)!;
  const { plans, addons } = await fetchPlansAndAddonsServer();
  const entitlements = resolveOrgEntitlements(org, plans, addons);
  return { org, entitlements };
}

export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext(req);
    const flags = getAuthFlags(ctx);
    if (!flags.allowed) {
      return NextResponse.json({ error: 'Acceso restringido.' }, { status: 403 });
    }

    const admin = createAdminClient();
    let query = admin
      .from('profiles')
      .select('*, organizations(id, name, slug, is_demo)')
      .order('created_at', { ascending: false });

    if (!flags.isSuperAdmin && flags.orgId) {
      query = query.eq('organization_id', flags.orgId).eq('is_super_admin', false);
    }

    const { data, error } = await query;
    if (error) throw error;

    let seatSummary: {
      activeCount: number;
      maxUsers: number | null;
      hasGranularRbac: boolean;
      tier: string;
    } | null = null;

    if (flags.orgId) {
      const resolved = await resolveTargetOrgEntitlements(admin, flags.orgId);
      if (resolved) {
        const activeCount = (data || []).filter(
          (u: any) =>
            u.organization_id === flags.orgId &&
            u.status === 'active' &&
            !u.is_super_admin
        ).length;
        seatSummary = {
          activeCount,
          maxUsers: resolved.entitlements.maxUsers,
          hasGranularRbac: hasGranularRbac(resolved.entitlements),
          tier: resolved.entitlements.effectiveTier,
        };
      }
    }

    return NextResponse.json({ users: data || [], seatSummary });
  } catch (err: any) {
    console.error('Error GET /api/admin/users:', err);
    return NextResponse.json({ error: 'Error al obtener usuarios.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext(req);
    const flags = getAuthFlags(ctx);
    if (!flags.allowed || !ctx?.profile) {
      return NextResponse.json({ error: 'Acceso restringido.' }, { status: 403 });
    }

    const rawBody = await req.json();
    const parsed = CreateUserSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || 'Datos inválidos.' },
        { status: 400 }
      );
    }

    const { email, password, full_name, role, organization_id } = parsed.data;
    const normalizedEmail = email.toLowerCase();
    const targetOrgId =
      flags.isSuperAdmin && organization_id ? organization_id : flags.orgId;

    if (!targetOrgId) {
      return NextResponse.json(
        { error: 'Debe especificar una empresa destino.' },
        { status: 400 }
      );
    }

    if (role === 'owner' && !flags.isOwner) {
      return NextResponse.json(
        { error: 'Solo el Propietario o Super Administrador puede crear otro Propietario.' },
        { status: 403 }
      );
    }

    const admin = createAdminClient();
    const resolved = await resolveTargetOrgEntitlements(admin, targetOrgId);
    if (!resolved) {
      return NextResponse.json({ error: 'Organización no encontrada.' }, { status: 404 });
    }

    if (
      !flags.isSuperAdmin &&
      GRANULAR_ONLY_ROLES.has(role) &&
      !hasGranularRbac(resolved.entitlements)
    ) {
      return NextResponse.json(
        {
          error:
            'Los roles granulares (Comercial, Finanzas, Operaciones, Contador) están disponibles en Corporativo & Escala ($119.990/mes).',
          upgradeRequired: true,
        },
        { status: 403 }
      );
    }

    if (!isDuoProducciones(resolved.org) && !resolved.org.is_demo && resolved.entitlements.maxUsers !== null) {
      const { count: activeCount } = await admin
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', targetOrgId)
        .eq('status', 'active')
        .eq('is_super_admin', false);

      if ((activeCount || 0) >= resolved.entitlements.maxUsers) {
        return NextResponse.json(
          {
            error: `Su plan actual permite hasta ${resolved.entitlements.maxUsers} usuario(s) activo(s). Amplíe su plan en Suscripción para sumar más integrantes.`,
            upgradeRequired: true,
          },
          { status: 403 }
        );
      }
    }

    const { data: existingProfile } = await admin
      .from('profiles')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existingProfile) {
      return NextResponse.json(
        { error: 'Ya existe una cuenta registrada con ese correo electrónico.' },
        { status: 409 }
      );
    }

    const { data: authCreated, error: authErr } = await admin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name || normalizedEmail.split('@')[0] },
    });

    if (authErr || !authCreated.user) {
      return NextResponse.json(
        { error: authErr?.message || 'No se pudo crear la cuenta de acceso.' },
        { status: 400 }
      );
    }

    const { data: profileRow, error: profileErr } = await admin
      .from('profiles')
      .upsert(
        {
          id: authCreated.user.id,
          email: normalizedEmail,
          full_name: full_name || null,
          role,
          status: 'active',
          organization_id: targetOrgId,
          is_super_admin: false,
        } as any,
        { onConflict: 'id' }
      )
      .select('*, organizations(id, name, slug, is_demo)')
      .single();

    if (profileErr) {
      await admin.auth.admin.deleteUser(authCreated.user.id).catch(() => {});
      throw profileErr;
    }

    await logAudit({
      action: 'create',
      entityType: 'profile',
      entityId: authCreated.user.id,
      entityLabel: normalizedEmail,
      before: null,
      after: { email: normalizedEmail, role, status: 'active', organization_id: targetOrgId },
      organizationId: targetOrgId,
      actor: {
        id: ctx.userId,
        email: ctx.email,
        role: ctx.profile.role,
      },
      ipAddress: extractClientIp(req.headers),
    });

    return NextResponse.json({ user: profileRow }, { status: 201 });
  } catch (err: any) {
    console.error('Error POST /api/admin/users:', err);
    return NextResponse.json({ error: 'Error al crear usuario.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext(req);
    const flags = getAuthFlags(ctx);
    if (!flags.allowed || !ctx?.profile) {
      return NextResponse.json({ error: 'Acceso restringido.' }, { status: 403 });
    }

    const rawBody = await req.json();
    const parsed = UpdateUserSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || 'Datos inválidos' },
        { status: 400 }
      );
    }

    const { userId, status, role, organization_id } = parsed.data;

    // OWASP: nadie puede escalar su propio rol ni modificar su propio estado
    if (userId === ctx.userId) {
      return NextResponse.json(
        { error: 'Por seguridad, no puede modificar su propio rol ni estado de cuenta.' },
        { status: 403 }
      );
    }

    const admin = createAdminClient();

    const { data: targetProfile } = await admin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!targetProfile) {
      return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 });
    }

    if (targetProfile.is_super_admin) {
      return NextResponse.json(
        { error: 'No se puede modificar al administrador principal de la plataforma.' },
        { status: 403 }
      );
    }

    if (!flags.isSuperAdmin && targetProfile.organization_id !== flags.orgId) {
      return NextResponse.json(
        { error: 'No tiene permisos sobre usuarios de otra empresa.' },
        { status: 403 }
      );
    }

    if (!flags.isOwner && (role === 'owner' || targetProfile.role === 'owner')) {
      return NextResponse.json(
        { error: 'Solo el Propietario o Super Administrador puede asignar o modificar el rol Propietario.' },
        { status: 403 }
      );
    }

    const updatePayload: Partial<Omit<Profile, 'id'>> = {};
    if (status !== undefined) updatePayload.status = status;
    if (role !== undefined) updatePayload.role = role;
    if (organization_id !== undefined) {
      if (!flags.isSuperAdmin) {
        return NextResponse.json(
          { error: 'Solo el administrador principal puede reasignar empresas.' },
          { status: 403 }
        );
      }
      updatePayload.organization_id = organization_id;
    }

    const finalOrgId =
      updatePayload.organization_id !== undefined
        ? updatePayload.organization_id
        : targetProfile.organization_id;
    const finalStatus = updatePayload.status ?? targetProfile.status;

    if (finalStatus === 'active' && !finalOrgId) {
      return NextResponse.json(
        { error: 'Debe asignar una empresa antes de aprobar la cuenta del usuario.' },
        { status: 400 }
      );
    }

    if (finalOrgId) {
      const resolved = await resolveTargetOrgEntitlements(admin, finalOrgId);
      if (resolved) {
        if (
          !flags.isSuperAdmin &&
          role !== undefined &&
          GRANULAR_ONLY_ROLES.has(role) &&
          !hasGranularRbac(resolved.entitlements)
        ) {
          return NextResponse.json(
            {
              error:
                'Los roles granulares (Comercial, Finanzas, Operaciones, Contador) requieren el Plan Corporativo & Escala ($119.990/mes).',
              upgradeRequired: true,
            },
            { status: 403 }
          );
        }

        const isActivating = finalStatus === 'active' && targetProfile.status !== 'active';
        const isMovingActiveIntoOrg =
          finalStatus === 'active' && finalOrgId !== targetProfile.organization_id;

        if (
          (isActivating || isMovingActiveIntoOrg) &&
          !isDuoProducciones(resolved.org) &&
          !resolved.org.is_demo &&
          resolved.entitlements.maxUsers !== null
        ) {
          const { count: activeCount } = await admin
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', finalOrgId)
            .eq('status', 'active')
            .eq('is_super_admin', false)
            .neq('id', userId);

          if ((activeCount || 0) >= resolved.entitlements.maxUsers) {
            return NextResponse.json(
              {
                error: `Su plan actual permite hasta ${resolved.entitlements.maxUsers} usuario(s) activo(s). Amplíe su plan o active el módulo Equipo & Marca Blanca en Suscripción.`,
                upgradeRequired: true,
              },
              { status: 403 }
            );
          }
        }
      }
    }

    const { data: updated, error } = await admin
      .from('profiles')
      .update(updatePayload)
      .eq('id', userId)
      .select('*, organizations(id, name, slug, is_demo)')
      .single();

    if (error) throw error;

    const auditAction =
      targetProfile.status !== 'active' && updated.status === 'active'
        ? 'approve_user'
        : role !== undefined && role !== targetProfile.role
        ? 'role_change'
        : 'update';

    const auditOrgId = finalOrgId || ctx.profile.organization_id;
    if (auditOrgId) {
      await logAudit({
        action: auditAction,
        entityType: 'profile',
        entityId: userId,
        entityLabel: targetProfile.email,
        before: {
          role: targetProfile.role,
          status: targetProfile.status,
          organization_id: targetProfile.organization_id,
        },
        after: {
          role: updated.role,
          status: updated.status,
          organization_id: updated.organization_id,
        },
        organizationId: auditOrgId,
        actor: {
          id: ctx.userId,
          email: ctx.email,
          role: ctx.profile.role,
        },
        ipAddress: extractClientIp(req.headers),
      });
    }

    return NextResponse.json({ user: updated });
  } catch (err: any) {
    console.error('Error PATCH /api/admin/users:', err);
    return NextResponse.json({ error: 'Error al actualizar usuario.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext(req);
    const flags = getAuthFlags(ctx);
    if (!flags.allowed || !ctx?.profile) {
      return NextResponse.json({ error: 'Acceso restringido.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'Falta userId.' }, { status: 400 });
    }

    if (userId === ctx.userId) {
      return NextResponse.json(
        { error: 'No puede eliminar su propia cuenta.' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const { data: targetProfile } = await admin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!targetProfile) {
      return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 });
    }

    if (targetProfile.is_super_admin) {
      return NextResponse.json(
        { error: 'No se puede eliminar al super administrador.' },
        { status: 403 }
      );
    }

    if (!flags.isSuperAdmin && targetProfile.organization_id !== flags.orgId) {
      return NextResponse.json(
        { error: 'No tiene permisos sobre usuarios de otra empresa.' },
        { status: 403 }
      );
    }

    if (!flags.isOwner && targetProfile.role === 'owner') {
      return NextResponse.json(
        { error: 'Solo el Propietario o Super Administrador puede eliminar a otro Propietario.' },
        { status: 403 }
      );
    }

    const { error: delAuthErr } = await admin.auth.admin.deleteUser(userId);
    if (delAuthErr) {
      await admin.from('profiles').delete().eq('id', userId);
    }

    const auditOrgId = targetProfile.organization_id || ctx.profile.organization_id;
    if (auditOrgId) {
      await logAudit({
        action: 'delete',
        entityType: 'profile',
        entityId: userId,
        entityLabel: targetProfile.email,
        before: {
          role: targetProfile.role,
          status: targetProfile.status,
          organization_id: targetProfile.organization_id,
        },
        after: null,
        organizationId: auditOrgId,
        actor: {
          id: ctx.userId,
          email: ctx.email,
          role: ctx.profile.role,
        },
        ipAddress: extractClientIp(req.headers),
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error DELETE /api/admin/users:', err);
    return NextResponse.json(
      { error: err.message || 'Error al eliminar usuario.' },
      { status: 500 }
    );
  }
}
