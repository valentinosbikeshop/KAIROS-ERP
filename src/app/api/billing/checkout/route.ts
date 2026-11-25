import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedContext } from '@/lib/supabase/admin';
import { calculateCheckoutAmountClp, isDuoProducciones } from '@/lib/entitlements';
import {
  fetchPlansAndAddonsServer,
  recordBillingPayment,
  updateOrganizationSaasConfig,
} from '@/lib/saas-storage';
import { createKhipuPayment, isKhipuConfigured } from '@/lib/khipu';
import { SUPER_ADMIN_EMAIL } from '@/lib/constants';
import type { ModuleKey } from '@/types/database';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CheckoutSchema = z.object({
  tier: z.enum(['free', 'essential', 'growth', 'scale', 'custom']),
  selectedModules: z
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
    .optional()
    .default([]),
  simulateSuperAdminPayment: z.boolean().optional().default(false),
});

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext(req);
    if (!ctx || !ctx.profile?.organization_id || !ctx.organization) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (ctx.profile.status !== 'active' || ctx.organization.is_active === false) {
      return NextResponse.json({ error: 'Cuenta o empresa inactiva.' }, { status: 403 });
    }

    if (ctx.profile.role !== 'admin' && !ctx.profile.is_super_admin) {
      return NextResponse.json(
        { error: 'Solo el administrador de la empresa puede gestionar la suscripción.' },
        { status: 403 }
      );
    }

    if (ctx.organization.is_demo) {
      return NextResponse.json(
        { error: 'La sesión de prueba no requiere pagos ni suscripciones.' },
        { status: 400 }
      );
    }

    if (isDuoProducciones(ctx.organization)) {
      return NextResponse.json({
        exempt: true,
        message: 'DUO Producciones cuenta con exención total de cobros y acceso completo.',
      });
    }

    const body = await req.json();
    const parsed = CheckoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || 'Datos de suscripción inválidos.' },
        { status: 400 }
      );
    }

    const { tier, selectedModules, simulateSuperAdminPayment } = parsed.data;

    // 1. Si baja a Plan Gratuito ("Semilla"): activar de inmediato sin borrar ningún dato histórico
    if (tier === 'free') {
      const updated = await updateOrganizationSaasConfig(ctx.organization.id, {
        subscription_tier: 'free',
        subscription_status: 'active',
        selected_modules: [],
        current_period_end: null,
      });

      return NextResponse.json({
        activated: true,
        tier: 'free',
        organization: updated,
        message: 'Plan Semilla gratuito activado. Tus datos históricos permanecen intactos.',
      });
    }

    // 2. Calcular monto exacto EN EL SERVIDOR filtrando módulos activos reales
    const { plans, addons } = await fetchPlansAndAddonsServer();
    const activeModuleIds = new Set(
      addons.filter((a) => a.category === 'module' && a.is_active !== false).map((a) => a.id)
    );
    const uniqueModules = Array.from(new Set(selectedModules)).filter((m) =>
      activeModuleIds.has(m)
    ) as ModuleKey[];

    const amountClp = calculateCheckoutAmountClp(tier, uniqueModules, plans, addons);

    if (amountClp <= 0) {
      return NextResponse.json({ error: 'Monto de suscripción inválido.' }, { status: 400 });
    }

    const planName =
      tier === 'custom'
        ? `Plan A tu Medida (${uniqueModules.length} módulos)`
        : plans.find((p) => p.id === tier)?.name || tier;

    const transactionId = `KAIROS-${ctx.organization.id.slice(0, 8).toUpperCase()}-${Date.now()}`;
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || req.nextUrl.origin;
    const returnUrl = `${origin}/billing?payment=success&tx=${encodeURIComponent(transactionId)}`;
    const cancelUrl = `${origin}/billing?payment=canceled&tx=${encodeURIComponent(transactionId)}`;
    const notifyUrl = `${origin}/api/webhooks/khipu`;

    const isSuperAdmin =
      Boolean(ctx.profile.is_super_admin) ||
      ctx.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

    // 3. Simulación controlada exclusiva para SuperAdmin cuando aún no hay llave Khipu en .env
    if (!isKhipuConfigured()) {
      if (simulateSuperAdminPayment && isSuperAdmin) {
        const now = new Date();
        const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        await recordBillingPayment({
          organization_id: ctx.organization.id,
          khipu_payment_id: null,
          transaction_id: transactionId,
          tier,
          selected_modules: uniqueModules,
          amount_clp: amountClp,
          currency: 'CLP',
          status: 'paid',
          payment_url: null,
          payer_email: ctx.email,
          period_start: now.toISOString(),
          period_end: periodEnd.toISOString(),
          paid_at: now.toISOString(),
        });

        const updated = await updateOrganizationSaasConfig(ctx.organization.id, {
          subscription_tier: tier,
          subscription_status: 'active',
          selected_modules: uniqueModules,
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
        });

        return NextResponse.json({
          activated: true,
          simulated: true,
          amountClp,
          organization: updated,
          message: `Suscripción "${planName}" activada en modo verificación SuperAdmin.`,
        });
      }

      return NextResponse.json(
        {
          khipuConfigured: false,
          error: isSuperAdmin
            ? 'La pasarela Khipu aún no tiene configurada la variable KHIPU_API_KEY en el servidor. Configura KHIPU_API_KEY y KHIPU_WEBHOOK_SECRET en Vercel.'
            : 'Los pagos en línea están temporalmente en mantenimiento. Contacta a soporte para activar tu plan.',
          amountClp,
          planName,
        },
        { status: 503 }
      );
    }

    // 4. Crear orden de pago real en Khipu API v3 y registrar en ledger sin silenciar errores
    const khipuRes = await createKhipuPayment({
      amountClp,
      subject: `KAIROS ERP — Suscripción Mensual: ${planName}`,
      body: `Renovación mensual (${ctx.organization.name}) · Plan ${planName}. Acceso inmediato tras confirmación bancaria Khipu.`,
      transactionId,
      returnUrl,
      cancelUrl,
      notifyUrl,
      payerEmail: ctx.email,
    });

    await recordBillingPayment({
      organization_id: ctx.organization.id,
      khipu_payment_id: khipuRes.payment_id,
      transaction_id: transactionId,
      tier,
      selected_modules: uniqueModules,
      amount_clp: amountClp,
      currency: 'CLP',
      status: 'pending',
      payment_url: khipuRes.payment_url,
      payer_email: ctx.email,
      period_start: null,
      period_end: null,
      paid_at: null,
    });

    return NextResponse.json({
      paymentId: khipuRes.payment_id,
      paymentUrl: khipuRes.payment_url,
      transactionId,
      amountClp,
      planName,
    });
  } catch (err: any) {
    console.error('Error POST /api/billing/checkout:', err);
    return NextResponse.json(
      { error: 'No se pudo iniciar el proceso de pago en línea.' },
      { status: 500 }
    );
  }
}
