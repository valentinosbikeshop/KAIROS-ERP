import { createAdminClient } from '@/lib/supabase/admin';
import { DEFAULT_ADDONS, DEFAULT_PLANS } from './entitlements';
import type {
  BillingPayment,
  ModuleKey,
  Organization,
  OrganizationBankInfo,
  OrganizationSaasConfig,
  SubscriptionAddon,
  SubscriptionPlan,
  SubscriptionTier,
} from '@/types/database';

/**
 * Lee planes y módulos desde Supabase. Si las tablas aún no han sido migradas
 * en el entorno remoto, retorna el catálogo oficial por defecto sin romper el runtime.
 */
export async function fetchPlansAndAddonsServer(): Promise<{
  plans: SubscriptionPlan[];
  addons: SubscriptionAddon[];
  usingDatabaseTables: boolean;
}> {
  try {
    const admin = createAdminClient();
    const [plansRes, addonsRes] = await Promise.all([
      admin.from('subscription_plans').select('*').order('sort_order', { ascending: true }),
      admin.from('subscription_addons').select('*').order('sort_order', { ascending: true }),
    ]);

    if (!plansRes.error && !addonsRes.error && plansRes.data?.length && addonsRes.data?.length) {
      let plans = plansRes.data as SubscriptionPlan[];
      let addons = addonsRes.data as SubscriptionAddon[];

      // Auto-sync one-time si Supabase aún conserva el seed antiguo ($49.990 / $11.990)
      const growthDb = plans.find((p) => p.id === 'growth');
      const essentialDb = plans.find((p) => p.id === 'essential');
      const scaleDb = plans.find((p) => p.id === 'scale');
      const baseDb = addons.find((a) => a.id === 'base_custom');
      if (
        (growthDb?.price_clp === 49990 || growthDb?.price_clp === 99990) &&
        (baseDb?.price_clp === 11990 || baseDb?.price_clp === 29990)
      ) {
        await Promise.all([
          admin.from('subscription_plans').upsert(
            DEFAULT_PLANS.map((p) => ({
              id: p.id,
              name: p.name,
              tagline: p.tagline,
              description: p.description,
              price_clp: p.price_clp,
              is_recommended: p.is_recommended,
              badge_text: p.badge_text,
              max_projects: p.max_projects,
              max_costs: p.max_costs,
              max_users: p.max_users,
              ai_calls_limit: p.ai_calls_limit,
              included_modules: p.included_modules,
              features: p.features,
              sort_order: p.sort_order,
              is_active: p.is_active,
            })),
            { onConflict: 'id' }
          ),
          admin.from('subscription_addons').upsert(
            DEFAULT_ADDONS.map((a) => ({
              id: a.id,
              name: a.name,
              description: a.description,
              price_clp: a.price_clp,
              category: a.category,
              ai_calls_bonus: a.ai_calls_bonus,
              sort_order: a.sort_order,
              is_active: a.is_active,
            })),
            { onConflict: 'id' }
          ),
        ]);
        plans = DEFAULT_PLANS;
        addons = DEFAULT_ADDONS;
      } else if (
        essentialDb?.ai_calls_limit === 0 &&
        growthDb?.ai_calls_limit === 200 &&
        scaleDb?.ai_calls_limit === 600
      ) {
        // Actualización estratégica no-destructiva de cuotas IA preservando precios editados en vivo
        await Promise.all([
          ...DEFAULT_PLANS.filter((p) => p.id !== 'free').map((p) =>
            admin
              .from('subscription_plans')
              .update({
                ai_calls_limit: p.ai_calls_limit,
                included_modules: p.included_modules,
                features: p.features,
                tagline: p.tagline,
              })
              .eq('id', p.id)
          ),
          admin
            .from('subscription_addons')
            .update({
              name: DEFAULT_ADDONS.find((a) => a.id === 'mod_ai_suite')!.name,
              description: DEFAULT_ADDONS.find((a) => a.id === 'mod_ai_suite')!.description,
              ai_calls_bonus: 180,
            })
            .eq('id', 'mod_ai_suite'),
        ]);
        plans = plans.map((p) => {
          const def = DEFAULT_PLANS.find((d) => d.id === p.id);
          return def && p.id !== 'free'
            ? {
                ...p,
                ai_calls_limit: def.ai_calls_limit,
                included_modules: def.included_modules,
                features: def.features,
                tagline: def.tagline,
              }
            : p;
        });
        addons = addons.map((a) =>
          a.id === 'mod_ai_suite'
            ? {
                ...a,
                name: DEFAULT_ADDONS.find((d) => d.id === 'mod_ai_suite')!.name,
                description: DEFAULT_ADDONS.find((d) => d.id === 'mod_ai_suite')!.description,
                ai_calls_bonus: 180,
              }
            : a
        );
      }

      return {
        plans,
        addons,
        usingDatabaseTables: true,
      };
    }
  } catch {
    // Fallback silencioso a catálogo en memoria
  }

  return {
    plans: DEFAULT_PLANS,
    addons: DEFAULT_ADDONS,
    usingDatabaseTables: false,
  };
}

/**
 * Hidrata los campos SaaS de una organización leyendo primero columnas nativas SQL
 * y haciendo fallback transparente a bank_info.__saas_config si la migración SQL
 * todavía no se ejecutó en Supabase.
 */
export function hydrateOrganizationSaas(org: Organization | null): Organization | null {
  if (!org) return null;
  const fallback = org.bank_info?.__saas_config;

  return {
    ...org,
    industry_type: org.industry_type || fallback?.industry_type || 'eventos_banqueteria',
    theme_preset: org.theme_preset || fallback?.theme_preset || 'obsidian_gold',
    operation_mode: org.operation_mode || fallback?.operation_mode || 'project',
    custom_terminology: org.custom_terminology ?? fallback?.custom_terminology ?? {},
    onboarding_completed:
      org.onboarding_completed !== undefined
        ? org.onboarding_completed
        : fallback?.onboarding_completed ?? (org.slug === 'duo-producciones' || org.is_demo),
    is_exempt:
      org.is_exempt !== undefined
        ? org.is_exempt
        : fallback?.is_exempt ?? org.slug === 'duo-producciones',
    subscription_tier: org.subscription_tier || fallback?.subscription_tier || 'free',
    subscription_status: org.subscription_status || fallback?.subscription_status || 'active',
    selected_modules: org.selected_modules ?? fallback?.selected_modules ?? [],
    current_period_start: org.current_period_start ?? fallback?.current_period_start ?? null,
    current_period_end: org.current_period_end ?? fallback?.current_period_end ?? null,
    khipu_subscription_id: org.khipu_subscription_id ?? fallback?.khipu_subscription_id ?? null,
    ai_calls_used: org.ai_calls_used ?? fallback?.ai_calls_used ?? 0,
    ai_calls_reset_at:
      org.ai_calls_reset_at ??
      fallback?.ai_calls_reset_at ??
      new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString(),
    min_margin_pct: org.min_margin_pct ?? fallback?.min_margin_pct ?? 15,
    uf_rate_clp: org.uf_rate_clp ?? fallback?.uf_rate_clp ?? 41405,
    usd_rate_clp: org.usd_rate_clp ?? fallback?.usd_rate_clp ?? 1025,
  };
}

/**
 * Actualiza campos SaaS en organizations con fallback automático a bank_info.__saas_config
 * cuando las columnas SQL nuevas aún no existen en el esquema remoto.
 */
export async function updateOrganizationSaasConfig(
  organizationId: string,
  patch: Partial<OrganizationSaasConfig>
): Promise<Organization | null> {
  const admin = createAdminClient();
  const { data: currentOrgRaw } = await admin
    .from('organizations')
    .select('*')
    .eq('id', organizationId)
    .single();

  if (!currentOrgRaw) return null;
  const currentOrg = hydrateOrganizationSaas(currentOrgRaw as Organization)!;

  const mergedSaas: OrganizationSaasConfig = {
    industry_type: patch.industry_type ?? currentOrg.industry_type ?? 'eventos_banqueteria',
    theme_preset: patch.theme_preset ?? currentOrg.theme_preset ?? 'obsidian_gold',
    operation_mode: patch.operation_mode ?? currentOrg.operation_mode ?? 'project',
    custom_terminology: patch.custom_terminology ?? currentOrg.custom_terminology ?? {},
    onboarding_completed: patch.onboarding_completed ?? currentOrg.onboarding_completed ?? false,
    is_exempt: patch.is_exempt ?? currentOrg.is_exempt ?? false,
    subscription_tier: patch.subscription_tier ?? currentOrg.subscription_tier ?? 'free',
    subscription_status: patch.subscription_status ?? currentOrg.subscription_status ?? 'active',
    selected_modules: patch.selected_modules ?? currentOrg.selected_modules ?? [],
    current_period_start:
      patch.current_period_start !== undefined
        ? patch.current_period_start
        : currentOrg.current_period_start ?? null,
    current_period_end:
      patch.current_period_end !== undefined
        ? patch.current_period_end
        : currentOrg.current_period_end ?? null,
    khipu_subscription_id:
      patch.khipu_subscription_id !== undefined
        ? patch.khipu_subscription_id
        : currentOrg.khipu_subscription_id ?? null,
    ai_calls_used: patch.ai_calls_used ?? currentOrg.ai_calls_used ?? 0,
    ai_calls_reset_at:
      patch.ai_calls_reset_at ??
      currentOrg.ai_calls_reset_at ??
      new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString(),
    honorarios_retention_policy:
      patch.honorarios_retention_policy ??
      currentOrg.bank_info?.__saas_config?.honorarios_retention_policy,
    min_margin_pct: patch.min_margin_pct ?? currentOrg.min_margin_pct ?? 15,
    uf_rate_clp: patch.uf_rate_clp ?? currentOrg.uf_rate_clp ?? 41405,
    usd_rate_clp: patch.usd_rate_clp ?? currentOrg.usd_rate_clp ?? 1025,
    pending_payments:
      patch.pending_payments !== undefined
        ? patch.pending_payments
        : currentOrg.bank_info?.__saas_config?.pending_payments,
  };

  const nextBankInfo: OrganizationBankInfo = {
    ...(currentOrg.bank_info || {}),
    __saas_config: mergedSaas,
  };

  // Intento 1: actualizar columnas nativas + espejo en bank_info
  const { pending_payments: _pp, ...nativePatch } = patch;
  const { data: updatedNative, error: nativeError } = await admin
    .from('organizations')
    .update({
      ...nativePatch,
      bank_info: nextBankInfo,
    } as any)
    .eq('id', organizationId)
    .select('*')
    .single();

  if (!nativeError && updatedNative) {
    return hydrateOrganizationSaas(updatedNative as Organization);
  }

  // Intento 2 (si faltan columnas SQL aún): persistir limpiamente en bank_info.__saas_config
  const { data: updatedFallback, error: fallbackError } = await admin
    .from('organizations')
    .update({ bank_info: nextBankInfo } as any)
    .eq('id', organizationId)
    .select('*')
    .single();

  if (fallbackError) {
    throw fallbackError;
  }

  return hydrateOrganizationSaas(updatedFallback as Organization);
}

export type BillingPaymentRecord = BillingPayment & { source: 'table' | 'fallback' };

/**
 * Registra una orden de pago en billing_payments o en el ledger fallback de la organización.
 * Nunca silencia errores reales para evitar redirigir al usuario a Khipu con una orden huérfana.
 */
export async function recordBillingPayment(
  input: Omit<BillingPayment, 'id' | 'created_at'>
): Promise<BillingPaymentRecord> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('billing_payments')
    .insert(input as any)
    .select('*')
    .single();

  if (!error && data) {
    return { ...(data as BillingPayment), source: 'table' };
  }

  const isMissingTable =
    error?.code === '42P01' ||
    error?.code === 'PGRST205' ||
    error?.message?.toLowerCase().includes('billing_payments');

  if (!isMissingTable) {
    throw new Error(`No se pudo registrar la orden de pago: ${error?.message || 'error desconocido'}`);
  }

  const { data: orgRaw } = await admin
    .from('organizations')
    .select('*')
    .eq('id', input.organization_id)
    .single();

  if (!orgRaw) {
    throw new Error('Organización no encontrada al registrar pago.');
  }

  const org = hydrateOrganizationSaas(orgRaw as Organization)!;
  const existing = org.bank_info?.__saas_config?.pending_payments || [];
  const newRow: BillingPayment = {
    ...input,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  };

  await updateOrganizationSaasConfig(input.organization_id, {
    pending_payments: [newRow, ...existing].slice(0, 25),
  });

  return { ...newRow, source: 'fallback' };
}

export async function findBillingPayment(params: {
  paymentId?: string;
  transactionId?: string;
  organizationId?: string;
}): Promise<BillingPaymentRecord | null> {
  const admin = createAdminClient();
  if (params.paymentId || params.transactionId) {
    let query = admin.from('billing_payments').select('*');
    if (params.organizationId) {
      query = query.eq('organization_id', params.organizationId);
    }
    if (params.paymentId) {
      query = query.eq('khipu_payment_id', params.paymentId);
    } else if (params.transactionId) {
      query = query.eq('transaction_id', params.transactionId);
    }

    const { data, error } = await query.maybeSingle();
    if (!error && data) {
      return { ...(data as BillingPayment), source: 'table' };
    }
  }

  // Buscar en ledger fallback si la tabla aún no existe o no tuvo match
  if (params.organizationId) {
    const { data: orgRaw } = await admin
      .from('organizations')
      .select('bank_info')
      .eq('id', params.organizationId)
      .single();
    const list: BillingPayment[] = (orgRaw as any)?.bank_info?.__saas_config?.pending_payments || [];
    const match = list.find(
      (p) =>
        (params.paymentId && p.khipu_payment_id === params.paymentId) ||
        (params.transactionId && p.transaction_id === params.transactionId)
    );
    return match ? { ...match, source: 'fallback' } : null;
  }

  const { data: allOrgs } = await admin.from('organizations').select('id, bank_info');
  for (const org of (allOrgs || []) as any[]) {
    const list: BillingPayment[] = org?.bank_info?.__saas_config?.pending_payments || [];
    const match = list.find(
      (p) =>
        (params.paymentId && p.khipu_payment_id === params.paymentId) ||
        (params.transactionId && p.transaction_id === params.transactionId)
    );
    if (match) {
      return { ...match, source: 'fallback' };
    }
  }

  return null;
}

/**
 * Reclama atómicamente una orden 'pending' (eliminando TOCTOU) y activa el plan mensual.
 */
export async function claimAndActivateBillingPayment(
  paymentRow: BillingPaymentRecord,
  rawWebhook?: unknown
): Promise<{ alreadyProcessed: boolean; periodEnd?: string }> {
  const admin = createAdminClient();
  const now = new Date();
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const nowIso = now.toISOString();

  if (paymentRow.source === 'table') {
    const { data: claimed, error } = await admin
      .from('billing_payments')
      .update({
        status: 'paid',
        period_start: nowIso,
        period_end: periodEnd,
        paid_at: nowIso,
        ...(rawWebhook ? { raw_webhook: rawWebhook } : {}),
      } as any)
      .eq('id', paymentRow.id)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle();

    if (error) {
      throw error;
    }
    if (!claimed) {
      return { alreadyProcessed: true };
    }

    await updateOrganizationSaasConfig(paymentRow.organization_id, {
      subscription_tier: paymentRow.tier as SubscriptionTier,
      subscription_status: 'active',
      selected_modules: (paymentRow.selected_modules as ModuleKey[]) || [],
      current_period_start: nowIso,
      current_period_end: periodEnd,
      khipu_subscription_id: paymentRow.khipu_payment_id || null,
    });

    return { alreadyProcessed: false, periodEnd };
  }

  // Fallback JSONB
  const { data: orgRaw } = await admin
    .from('organizations')
    .select('*')
    .eq('id', paymentRow.organization_id)
    .single();

  if (!orgRaw) {
    throw new Error('Organización no encontrada.');
  }

  const org = hydrateOrganizationSaas(orgRaw as Organization)!;
  const list = org.bank_info?.__saas_config?.pending_payments || [];
  const target = list.find((p) => p.transaction_id === paymentRow.transaction_id);
  if (!target || target.status !== 'pending') {
    return { alreadyProcessed: true };
  }

  const nextList = list.map((p) =>
    p.transaction_id === paymentRow.transaction_id
      ? { ...p, status: 'paid' as const, period_start: nowIso, period_end: periodEnd, paid_at: nowIso }
      : p
  );

  await updateOrganizationSaasConfig(paymentRow.organization_id, {
    subscription_tier: paymentRow.tier as SubscriptionTier,
    subscription_status: 'active',
    selected_modules: (paymentRow.selected_modules as ModuleKey[]) || [],
    current_period_start: nowIso,
    current_period_end: periodEnd,
    khipu_subscription_id: paymentRow.khipu_payment_id || null,
    pending_payments: nextList,
  });

  return { alreadyProcessed: false, periodEnd };
}

export async function markBillingPaymentFailed(
  paymentRow: BillingPaymentRecord,
  rawWebhook?: unknown
): Promise<void> {
  const admin = createAdminClient();
  if (paymentRow.source === 'table') {
    await admin
      .from('billing_payments')
      .update({
        status: 'failed',
        ...(rawWebhook ? { raw_webhook: rawWebhook } : {}),
      } as any)
      .eq('id', paymentRow.id)
      .eq('status', 'pending');
    return;
  }

  const { data: orgRaw } = await admin
    .from('organizations')
    .select('*')
    .eq('id', paymentRow.organization_id)
    .single();
  if (!orgRaw) return;
  const org = hydrateOrganizationSaas(orgRaw as Organization)!;
  const list = org.bank_info?.__saas_config?.pending_payments || [];
  const nextList = list.map((p) =>
    p.transaction_id === paymentRow.transaction_id && p.status === 'pending'
      ? { ...p, status: 'failed' as const }
      : p
  );
  await updateOrganizationSaasConfig(paymentRow.organization_id, {
    pending_payments: nextList,
  });
}
