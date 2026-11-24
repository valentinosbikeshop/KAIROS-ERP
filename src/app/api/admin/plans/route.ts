import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient, getAuthenticatedContext } from '@/lib/supabase/admin';
import { DUO_ORG_SLUG, SUPER_ADMIN_EMAIL } from '@/lib/constants';
import { fetchPlansAndAddonsServer, updateOrganizationSaasConfig } from '@/lib/saas-storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isAuthorizedSuperAdmin(ctx: Awaited<ReturnType<typeof getAuthenticatedContext>>) {
  if (!ctx || !ctx.profile || ctx.profile.status !== 'active') return false;
  return Boolean(ctx.profile.is_super_admin) || ctx.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
}

const UpdatePlanSchema = z.object({
  kind: z.literal('plan'),
  id: z.enum(['free', 'essential', 'growth', 'scale']),
  name: z.string().trim().min(2).max(80).optional(),
  tagline: z.string().trim().min(2).max(160).optional(),
  description: z.string().trim().min(4).max(500).optional(),
  price_clp: z.number().int().min(0).max(5000000).optional(),
  is_recommended: z.boolean().optional(),
  badge_text: z.string().trim().max(32).nullable().optional(),
  max_projects: z.number().int().min(1).nullable().optional(),
  max_costs: z.number().int().min(1).nullable().optional(),
  max_users: z.number().int().min(1).nullable().optional(),
  ai_calls_limit: z.number().int().min(0).max(100000).optional(),
  features: z.array(z.string().trim().min(2).max(200)).max(12).optional(),
});

const UpdateAddonSchema = z.object({
  kind: z.literal('addon'),
  id: z.enum([
    'base_custom',
    'mod_unlimited_projects',
    'mod_pdf_quotes',
    'mod_transactions_sii',
    'mod_consolidation_retail',
    'mod_ai_suite',
    'mod_analytics_excel',
    'mod_team_branding',
  ]),
  name: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().min(4).max(400).optional(),
  price_clp: z.number().int().min(0).max(5000000).optional(),
  ai_calls_bonus: z.number().int().min(0).max(50000).optional(),
  is_active: z.boolean().optional(),
});

const UpdateOrgSubscriptionSchema = z.object({
  kind: z.literal('organization_subscription'),
  organization_id: z.string().uuid(),
  subscription_tier: z.enum(['free', 'essential', 'growth', 'scale', 'custom']).optional(),
  subscription_status: z.enum(['active', 'past_due', 'canceled']).optional(),
  selected_modules: z
    .array(
      z.enum([
        'mod_unlimited_projects',
        'mod_pdf_quotes',
        'mod_transactions_sii',
        'mod_consolidation_retail',
        'mod_ai_suite',
        'mod_analytics_excel',
        'mod_team_branding',
      ])
    )
    .optional(),
  is_exempt: z.boolean().optional(),
  extend_days: z.number().int().min(0).max(3650).optional(),
});

const PatchBodySchema = z.discriminatedUnion('kind', [
  UpdatePlanSchema,
  UpdateAddonSchema,
  UpdateOrgSubscriptionSchema,
]);

export async function PATCH(req: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext(req);
    if (!isAuthorizedSuperAdmin(ctx)) {
      return NextResponse.json({ error: 'Acceso restringido al Super Administrador.' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = PatchBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || 'Payload inválido.' },
        { status: 400 }
      );
    }

    const payload = parsed.data;
    const admin = createAdminClient();

    if (payload.kind === 'plan') {
      const { kind: _k, id, ...updates } = payload;
      if (updates.is_recommended) {
        await admin.from('subscription_plans').update({ is_recommended: false }).neq('id', id);
      }
      const { data, error } = await admin
        .from('subscription_plans')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        return NextResponse.json(
          {
            error:
              'Para editar planes en vivo, asegúrate de haber ejecutado la migración SQL 20261124_saas_industries_khipu_billing.sql en Supabase.',
            detail: error.message,
          },
          { status: 400 }
        );
      }

      const fresh = await fetchPlansAndAddonsServer();
      return NextResponse.json({ plan: data, plans: fresh.plans, addons: fresh.addons });
    }

    if (payload.kind === 'addon') {
      const { kind: _k, id, ...updates } = payload;
      const { data, error } = await admin
        .from('subscription_addons')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        return NextResponse.json(
          {
            error:
              'Para editar módulos en vivo, asegúrate de haber ejecutado la migración SQL 20261124_saas_industries_khipu_billing.sql en Supabase.',
            detail: error.message,
          },
          { status: 400 }
        );
      }

      const fresh = await fetchPlansAndAddonsServer();
      return NextResponse.json({ addon: data, plans: fresh.plans, addons: fresh.addons });
    }

    // Actualización de suscripción o exención de una organización
    const { organization_id, extend_days, ...orgUpdates } = payload;

    // Proteger exención inmutable de DUO Producciones
    const { data: targetOrg } = await admin
      .from('organizations')
      .select('slug')
      .eq('id', organization_id)
      .single();

    if (targetOrg?.slug === DUO_ORG_SLUG && orgUpdates.is_exempt === false) {
      return NextResponse.json(
        { error: 'DUO Producciones está protegida como organización exenta.' },
        { status: 400 }
      );
    }

    const periodPatch: Record<string, unknown> = { ...orgUpdates };
    if (typeof extend_days === 'number') {
      const now = new Date();
      periodPatch.current_period_start = now.toISOString();
      if (extend_days === 0) {
        // Expirar intencionalmente para validar Soft-Lock
        periodPatch.current_period_end = new Date(now.getTime() - 60 * 1000).toISOString();
        periodPatch.subscription_status = 'past_due';
      } else {
        periodPatch.current_period_end = new Date(
          now.getTime() + extend_days * 24 * 60 * 60 * 1000
        ).toISOString();
        periodPatch.subscription_status = 'active';
      }
    }

    const updatedOrg = await updateOrganizationSaasConfig(organization_id, periodPatch as any);
    return NextResponse.json({ organization: updatedOrg });
  } catch (err: any) {
    console.error('Error PATCH /api/admin/plans:', err);
    return NextResponse.json({ error: err.message || 'Error al actualizar configuración.' }, { status: 500 });
  }
}
