import type { Organization } from '@/types/database';

/**
 * Helper puro seguro para cliente (sin imports de servidor) para hidratar
 * la configuración SaaS desde columnas nativas o desde bank_info.__saas_config.
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
    ai_calls_reset_at: org.ai_calls_reset_at ?? fallback?.ai_calls_reset_at,
    min_margin_pct: org.min_margin_pct ?? fallback?.min_margin_pct ?? 15,
    uf_rate_clp: org.uf_rate_clp ?? fallback?.uf_rate_clp ?? 41405,
    usd_rate_clp: org.usd_rate_clp ?? fallback?.usd_rate_clp ?? 1025,
  };
}
