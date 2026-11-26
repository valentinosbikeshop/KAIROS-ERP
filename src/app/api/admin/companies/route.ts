import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient, getAuthenticatedContext } from '@/lib/supabase/admin';
import { SUPER_ADMIN_EMAIL, DUO_ORG_SLUG } from '@/lib/constants';
import { calculateFinancials } from '@/lib/utils';
import { COMPANY_COST_TEMPLATES, formatCostMetadata } from '@/lib/cost-metadata';
import { isDuoProducciones, resolveOrgEntitlements } from '@/lib/entitlements';
import { brandingCapabilities } from '@/lib/plan-guards';
import { fetchPlansAndAddonsServer, hydrateOrganizationSaas, updateOrganizationSaasConfig } from '@/lib/saas-storage';
import type { Organization } from '@/types/database';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BankInfoSchema = z.object({
  banco: z.string().trim().max(100).optional(),
  tipo_cuenta: z.string().trim().max(100).optional(),
  numero_cuenta: z.string().trim().max(100).optional(),
  titular: z.string().trim().max(150).optional(),
  rut: z.string().trim().max(40).optional(),
  email: z.string().trim().max(150).optional(),
});

const SafeLogoUrlSchema = z
  .string()
  .trim()
  .max(500000)
  .refine(
    (val) =>
      val === '' ||
      /^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/i.test(val) ||
      /^https:\/\/[a-z0-9.-]+\.supabase\.co\/storage\/v1\/object\/public\//i.test(val),
    'El logo debe ser PNG, JPEG o WEBP válido (no se permite SVG ni esquemas externos).'
  )
  .optional()
  .nullable();

const CreateCompanySchema = z.object({
  name: z.string().trim().min(2, 'El nombre de la empresa es obligatorio').max(100),
  legal_name: z.string().trim().max(150).optional().nullable(),
  rut: z.string().trim().max(30).optional().nullable(),
  subtitle: z.string().trim().max(200).optional().nullable(),
  location: z.string().trim().max(120).optional().nullable(),
  contact_email: z.string().trim().email('Email de contacto inválido').optional().or(z.literal('')).nullable(),
  contact_phone: z.string().trim().max(40).optional().nullable(),
  logo_url: SafeLogoUrlSchema,
  bank_info: BankInfoSchema.optional(),
  invite_code: z.string().trim().min(4).max(32).optional(),
  seedStarterCatalog: z.boolean().optional().default(true),
  adminEmail: z.string().trim().email('Email del administrador inválido').optional().or(z.literal('')),
  adminPassword: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').optional().or(z.literal('')),
});

const SecondaryAccountSchema = z.object({
  banco: z.string().trim().max(100).optional(),
  tipo_cuenta: z.string().trim().max(100).optional(),
  numero_cuenta: z.string().trim().max(100).optional(),
  titular: z.string().trim().max(150).optional(),
  rut: z.string().trim().max(40).optional(),
  email: z.string().trim().max(150).optional(),
});

const UpdateCompanySchema = z.object({
  id: z.string().uuid(),
  is_active: z.boolean().optional(),
  name: z.string().trim().min(2).max(100).optional(),
  legal_name: z.string().trim().max(150).optional().nullable(),
  rut: z.string().trim().max(30).optional().nullable(),
  subtitle: z.string().trim().max(200).optional().nullable(),
  location: z.string().trim().max(120).optional().nullable(),
  contact_email: z.string().trim().optional().nullable(),
  contact_phone: z.string().trim().optional().nullable(),
  logo_url: SafeLogoUrlSchema,
  bank_info: BankInfoSchema.optional(),
  invite_code: z.string().trim().min(4).max(32).optional(),
  min_margin_pct: z.coerce.number().min(0).max(95).optional(),
  uf_rate_clp: z.coerce.number().min(1000).max(500000).optional(),
  usd_rate_clp: z.coerce.number().min(100).max(10000).optional(),
  honorarios_retention_policy: z.enum(['company', 'contractor', 'split_50_50']).optional(),
  tax_regime: z.enum(['afecto_iva', 'sociedad_profesionales', 'exportacion_turismo']).optional(),
  white_label_footer: z.string().trim().max(400).optional().nullable(),
  hide_figura_branding: z.boolean().optional(),
  secondary_accounts: z.array(SecondaryAccountSchema).max(5).optional(),
});

function isAuthorizedSuperAdmin(ctx: Awaited<ReturnType<typeof getAuthenticatedContext>>) {
  if (!ctx || !ctx.profile || ctx.profile.status !== 'active') return false;
  return Boolean(ctx.profile.is_super_admin) || ctx.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 48);
}

function generateInviteCode(name: string) {
  const prefix = name
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6) || 'EMP';
  const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${suffix}`;
}

const EXTRA_STARTER_COSTS = [
  {
    servicio: 'Banda Live / Música en Vivo (Formato Evento)',
    tiempo_detalle: formatCostMetadata({
      resourceType: 'personal',
      staffCount: 5,
      staffHours: '2 bloques 45 min',
      staffModality: 'honorarios',
      aplicaIvaVenta: true,
      cleanDetail: 'Músicos en vivo + backline básico',
    }),
    tipo_evento: 'Empresa',
    costo: 550000,
    ganancia: 260000,
    tipo_doc_costo: 'boleta' as const,
    aplicaIvaVenta: true,
  },
  {
    servicio: 'Cobertura Fotográfica + Reel Audiovisual',
    tiempo_detalle: formatCostMetadata({
      resourceType: 'personal',
      staffCount: 2,
      staffHours: '6 hrs',
      staffModality: 'honorarios',
      aplicaIvaVenta: true,
      cleanDetail: 'Fotógrafo + realizador con entrega digital 72h',
    }),
    tipo_evento: 'Privado',
    costo: 240000,
    ganancia: 120000,
    tipo_doc_costo: 'boleta' as const,
    aplicaIvaVenta: true,
  },
];

const STARTER_COSTS = [
  ...COMPANY_COST_TEMPLATES.map((tpl) => ({
    servicio: tpl.servicio,
    tiempo_detalle: formatCostMetadata({
      resourceType: tpl.resourceType,
      staffCount: tpl.staffCount,
      staffHours: tpl.staffHours,
      staffModality: tpl.staffModality,
      aplicaIvaVenta: tpl.aplicaIvaVenta,
      cleanDetail: tpl.detail,
    }),
    tipo_evento: tpl.tipo_evento,
    costo: tpl.costo,
    ganancia: tpl.ganancia,
    tipo_doc_costo: tpl.tipo_doc_costo,
    aplicaIvaVenta: tpl.aplicaIvaVenta,
  })),
  ...EXTRA_STARTER_COSTS,
];

export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext(req);
    if (!isAuthorizedSuperAdmin(ctx)) {
      return NextResponse.json({ error: 'Acceso restringido al administrador principal.' }, { status: 403 });
    }

    const admin = createAdminClient();
    const { data: orgs, error } = await admin
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Attach lightweight counts per org
    const enriched = await Promise.all(
      (orgs || []).map(async (org) => {
        const [usersRes, eventsRes] = await Promise.all([
          admin.from('profiles').select('id', { count: 'exact', head: true }).eq('organization_id', org.id),
          admin.from('events').select('id', { count: 'exact', head: true }).eq('organization_id', org.id).is('deleted_at', null),
        ]);
        return {
          ...org,
          users_count: usersRes.count || 0,
          events_count: eventsRes.count || 0,
        };
      })
    );

    return NextResponse.json({ companies: enriched });
  } catch (err: any) {
    console.error('Error GET /api/admin/companies:', err);
    return NextResponse.json({ error: err.message || 'Error al obtener empresas' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext(req);
    if (!isAuthorizedSuperAdmin(ctx)) {
      return NextResponse.json({ error: 'Acceso restringido al administrador principal.' }, { status: 403 });
    }

    const rawBody = await req.json();
    const parsed = CreateCompanySchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || 'Datos inválidos' },
        { status: 400 }
      );
    }

    const data = parsed.data;
    if (data.adminEmail && !data.adminPassword) {
      return NextResponse.json(
        { error: 'Debes indicar una contraseña inicial para el administrador de la empresa.' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const baseSlug = slugify(data.name) || 'empresa';
    const uniqueSlug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;
    const inviteCode = (data.invite_code || generateInviteCode(data.name)).toUpperCase();

    const { data: newOrg, error: orgErr } = await admin
      .from('organizations')
      .insert({
        name: data.name,
        slug: uniqueSlug,
        invite_code: inviteCode,
        legal_name: data.legal_name || data.name,
        rut: data.rut || null,
        subtitle: data.subtitle || 'GESTIÓN INTEGRAL DE EVENTOS & PRESUPUESTOS',
        location: data.location || 'Chile',
        contact_email: data.contact_email || null,
        contact_phone: data.contact_phone || null,
        logo_url: data.logo_url || null,
        bank_info: data.bank_info || {},
        is_demo: false,
        is_active: true,
      })
      .select()
      .single();

    if (orgErr || !newOrg) {
      throw new Error(orgErr?.message || 'No se pudo crear la empresa.');
    }

    if (data.seedStarterCatalog) {
      const starterRows = STARTER_COSTS.map((c) => {
        const fin = calculateFinancials(
          c.costo,
          c.ganancia,
          c.tipo_doc_costo,
          c.aplicaIvaVenta,
          false
        );
        return {
          organization_id: newOrg.id,
          servicio: c.servicio,
          tiempo_detalle: c.tiempo_detalle,
          tipo_evento: c.tipo_evento,
          costo: c.costo,
          ganancia: c.ganancia,
          valor_neto: fin.valorNeto,
          valor_total: fin.valorTotal,
          tipo_doc_costo: c.tipo_doc_costo,
          is_demo_base: false,
        };
      });
      await admin.from('master_costs').insert(starterRows);
    }

    let createdAdminEmail: string | null = null;
    if (data.adminEmail && data.adminPassword) {
      const { data: authCreated, error: authErr } = await admin.auth.admin.createUser({
        email: data.adminEmail,
        password: data.adminPassword,
        email_confirm: true,
        user_metadata: { full_name: `Admin ${data.name}` },
      });

      if (authErr || !authCreated.user) {
        return NextResponse.json(
          {
            company: newOrg,
            warning: `Empresa creada, pero no se pudo crear el usuario administrador (${authErr?.message}). Puedes asignarlo manualmente luego.`,
          },
          { status: 201 }
        );
      }

      await admin.from('profiles').upsert({
        id: authCreated.user.id,
        email: data.adminEmail,
        role: 'admin',
        status: 'active',
        organization_id: newOrg.id,
        is_super_admin: false,
        full_name: `Administrador ${data.name}`,
      });
      createdAdminEmail = data.adminEmail;
    }

    return NextResponse.json(
      {
        company: newOrg,
        createdAdminEmail,
        message: 'Empresa creada con entorno privado y aislado correctamente.',
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('Error POST /api/admin/companies:', err);
    return NextResponse.json({ error: err.message || 'Error al crear empresa' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext(req);
    const rawBody = await req.json();
    const parsed = UpdateCompanySchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || 'Datos inválidos' },
        { status: 400 }
      );
    }

    const {
      id,
      min_margin_pct,
      uf_rate_clp,
      usd_rate_clp,
      honorarios_retention_policy,
      tax_regime,
      white_label_footer,
      hide_figura_branding,
      secondary_accounts,
      ...rawUpdates
    } = parsed.data;
    const isSuper = isAuthorizedSuperAdmin(ctx);
    const isOwnCompanyAdmin =
      Boolean(ctx?.profile) &&
      ctx?.profile?.status === 'active' &&
      (ctx?.profile?.role === 'admin' || ctx?.profile?.role === 'owner') &&
      ctx?.profile?.organization_id === id &&
      !ctx?.organization?.is_demo;

    if (!isSuper && !isOwnCompanyAdmin) {
      return NextResponse.json(
        { error: 'No tiene permisos para editar la configuración de esta empresa.' },
        { status: 403 }
      );
    }

    const updates = { ...rawUpdates };
    if (!isSuper) {
      delete updates.is_active;
    }
    if (updates.invite_code) {
      updates.invite_code = updates.invite_code.toUpperCase();
    }

    const admin = createAdminClient();

    // Cargar organización completa para preservar __saas_config y validar capacidades por plan
    const { data: targetOrgRaw } = await admin
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single();

    if (!targetOrgRaw) {
      return NextResponse.json({ error: 'Empresa no encontrada.' }, { status: 404 });
    }

    const targetOrg = hydrateOrganizationSaas(targetOrgRaw as Organization)!;

    if (targetOrg.slug === DUO_ORG_SLUG && updates.is_active === false) {
      return NextResponse.json(
        { error: 'No se puede desactivar la empresa matriz DUO Producciones.' },
        { status: 400 }
      );
    }

    const logoChanged =
      updates.logo_url !== undefined &&
      (updates.logo_url || null) !== (targetOrgRaw.logo_url || null);

    const bankChanged = (() => {
      if (!updates.bank_info) return false;
      const prevBank = (targetOrgRaw.bank_info || {}) as Record<string, unknown>;
      const nextBank = updates.bank_info as Record<string, unknown>;
      const keys = ['banco', 'tipo_cuenta', 'numero_cuenta', 'titular', 'rut', 'email'];
      return keys.some((k) => String(nextBank[k] ?? '') !== String(prevBank[k] ?? ''));
    })();

    const whiteLabelChanged =
      (white_label_footer !== undefined &&
        (white_label_footer || null) !== (targetOrg.white_label_footer || null)) ||
      (hide_figura_branding !== undefined &&
        Boolean(hide_figura_branding) !== Boolean(targetOrg.hide_figura_branding)) ||
      secondary_accounts !== undefined;

    if (!isSuper && !isDuoProducciones(targetOrg) && !targetOrg.is_demo) {
      const { plans, addons } = await fetchPlansAndAddonsServer();
      const entitlements = resolveOrgEntitlements(targetOrg, plans, addons);
      const caps = brandingCapabilities(entitlements);

      if (bankChanged && !caps.bankInfo) {
        return NextResponse.json(
          {
            error:
              'Guardar datos bancarios para cotizaciones y transferencias requiere el Plan Operación Esencial ($34.990/mes) o el módulo Cotizador PDF.',
            upgradeRequired: true,
            requiredPlan: caps.requiredPlanForBankInfo,
            blockedField: 'bank_info',
          },
          { status: 403 }
        );
      }

      if (logoChanged && !caps.logo) {
        return NextResponse.json(
          {
            error:
              'El logo corporativo propio en PDF y Portal requiere el Plan Crecimiento Inteligente IA ($69.990/mes) o superior.',
            upgradeRequired: true,
            requiredPlan: caps.requiredPlanForLogo,
            blockedField: 'logo_url',
          },
          { status: 403 }
        );
      }

      if (whiteLabelChanged && !caps.whiteLabel) {
        return NextResponse.json(
          {
            error:
              'La Marca Blanca 100% (sin huella FIGURA, pie legal propio y multi-cuenta) requiere el Plan Corporativo & Escala ($119.990/mes) o el módulo Marca Blanca.',
            upgradeRequired: true,
            requiredPlan: caps.requiredPlanForWhiteLabel,
            blockedField: 'white_label',
          },
          { status: 403 }
        );
      }
    }

    // Preservar siempre bank_info.__saas_config y espejar branding white-label en bank_info
    if (updates.bank_info || whiteLabelChanged) {
      const baseBank = (targetOrgRaw.bank_info || {}) as Record<string, unknown>;
      const mergedBank: Record<string, unknown> = {
        ...baseBank,
        ...(updates.bank_info || {}),
      };
      if (white_label_footer !== undefined) mergedBank.white_label_footer = white_label_footer;
      if (hide_figura_branding !== undefined) mergedBank.hide_figura_branding = hide_figura_branding;
      if (secondary_accounts !== undefined) mergedBank.secondary_accounts = secondary_accounts;
      if (targetOrgRaw.bank_info?.__saas_config) {
        mergedBank.__saas_config = targetOrgRaw.bank_info.__saas_config;
      }
      (updates as any).bank_info = mergedBank;
    }

    let updatedCompany: Organization = targetOrgRaw as Organization;
    if (Object.keys(updates).length > 0) {
      const { data: updated, error } = await admin
        .from('organizations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (updated) {
        updatedCompany = updated as Organization;
      }
    }

    if (
      min_margin_pct !== undefined ||
      uf_rate_clp !== undefined ||
      usd_rate_clp !== undefined ||
      honorarios_retention_policy !== undefined ||
      tax_regime !== undefined ||
      white_label_footer !== undefined ||
      hide_figura_branding !== undefined ||
      secondary_accounts !== undefined
    ) {
      const saasPatch: Record<string, unknown> = {};
      if (min_margin_pct !== undefined) saasPatch.min_margin_pct = Math.round(min_margin_pct * 10) / 10;
      if (uf_rate_clp !== undefined) saasPatch.uf_rate_clp = Math.round(uf_rate_clp);
      if (usd_rate_clp !== undefined) saasPatch.usd_rate_clp = Math.round(usd_rate_clp);
      if (honorarios_retention_policy !== undefined) {
        saasPatch.honorarios_retention_policy = honorarios_retention_policy;
      }
      if (tax_regime !== undefined) saasPatch.tax_regime = tax_regime;
      if (white_label_footer !== undefined) saasPatch.white_label_footer = white_label_footer;
      if (hide_figura_branding !== undefined) saasPatch.hide_figura_branding = hide_figura_branding;
      if (secondary_accounts !== undefined) saasPatch.secondary_accounts = secondary_accounts;

      const updatedSaas = await updateOrganizationSaasConfig(id, saasPatch as any);
      if (updatedSaas) {
        updatedCompany = updatedSaas;
      }
    }

    return NextResponse.json({ company: hydrateOrganizationSaas(updatedCompany) });
  } catch (err: any) {
    console.error('Error PATCH /api/admin/companies:', err);
    return NextResponse.json({ error: 'Error al actualizar la empresa.' }, { status: 500 });
  }
}
