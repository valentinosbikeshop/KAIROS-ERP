import { DEFAULT_PLANS } from '@/lib/entitlements';
import type { ResolvedEntitlements } from '@/types';
import type { ModuleKey, SubscriptionPlan, SubscriptionTier } from '@/types/database';

export interface ProjectUsageCounts {
  /** Proyectos activos actuales (`deleted_at IS NULL AND status <> 'completed'`) */
  activeCount: number;
  /** Proyectos creados en el mes calendario vigente (incluye papelera/completados) */
  monthlyCreatedCount: number;
}

export interface ProjectCreationGuardResult {
  allowed: boolean;
  mode: 'unlimited' | 'active' | 'monthly' | 'locked';
  limit: number | null;
  current: number;
  remaining: number | null;
  reason?: string;
  requiredPlan: SubscriptionTier;
}

export interface CostCreationGuardResult {
  allowed: boolean;
  limit: number | null;
  current: number;
  remaining: number | null;
  reason?: string;
  requiredPlan: SubscriptionTier;
}

export interface AiGuardCheckResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  used: number;
  reason?: string;
  requiredPlan: SubscriptionTier;
}

export interface BrandingCapabilities {
  /** Datos bancarios para transferencias en PDF/Portal (Essential+) */
  bankInfo: boolean;
  /** Logo propio en PDF/Portal (Growth+ / Demo) */
  logo: boolean;
  /** Marca Blanca 100% sin huella FIGURA (Scale) */
  whiteLabel: boolean;
  /** Pie legal y garantía editable en PDF/Portal (Scale) */
  customLegalFooter: boolean;
  /** Múltiples cuentas bancarias / USD-SWIFT (Scale) */
  multipleBankAccounts: boolean;
  requiredPlanForBankInfo: SubscriptionTier;
  requiredPlanForLogo: SubscriptionTier;
  requiredPlanForWhiteLabel: SubscriptionTier;
}

/**
 * Determina el plan cerrado más económico que incluye un módulo dado.
 */
export function requiredPlanForModule(
  mod: ModuleKey,
  plans: SubscriptionPlan[] = DEFAULT_PLANS
): SubscriptionPlan {
  const sourcePlans = plans.length > 0 ? plans : DEFAULT_PLANS;
  const sorted = [...sourcePlans]
    .filter((p) => p.is_active !== false)
    .sort((a, b) => a.price_clp - b.price_clp);

  const match = sorted.find((p) => (p.included_modules || []).includes(mod));
  return match || sorted[sorted.length - 1] || DEFAULT_PLANS[DEFAULT_PLANS.length - 1];
}

/**
 * Verifica si una organización tiene habilitado un módulo respetando Soft-Lock por vencimiento.
 */
export function canUseModule(entitlements: ResolvedEntitlements, mod: ModuleKey): boolean {
  if (entitlements.isExempt) return true;
  if (entitlements.isExpiredLock) return false;
  return Boolean(entitlements.modules?.[mod]);
}

/**
 * Tesorería, F29 y Cartola RCV dependen exclusivamente de `mod_transactions_sii` (Essential+).
 */
export function canUseTreasury(entitlements: ResolvedEntitlements): boolean {
  return canUseModule(entitlements, 'mod_transactions_sii');
}

/**
 * Analítica P&L avanzada depende de `mod_analytics_excel` (Growth+).
 */
export function canUseAnalytics(entitlements: ResolvedEntitlements): boolean {
  return canUseModule(entitlements, 'mod_analytics_excel');
}

/**
 * Exportación de libro Excel contable y F29 depende de `mod_analytics_excel` (Growth+).
 */
export function canExportExcelF29(entitlements: ResolvedEntitlements): boolean {
  return canUseModule(entitlements, 'mod_analytics_excel');
}

/**
 * Calcula los contadores de uso de proyectos requeridos por `canCreateProject`:
 * - `activeCount`: proyectos no eliminados y no completados (`!deleted_at && status !== 'completed'`).
 * - `monthlyCreatedCount`: proyectos creados dentro del mes calendario actual (mover a papelera no libera cupo mensual).
 */
export function countProjectsForQuota(
  events: Array<{
    deleted_at?: string | null;
    status?: string | null;
    created_at?: string | null;
    is_demo_base?: boolean | null;
  }>,
  referenceDate: Date = new Date()
): ProjectUsageCounts {
  const targetYear = referenceDate.getFullYear();
  const targetMonth = referenceDate.getMonth();

  let activeCount = 0;
  let monthlyCreatedCount = 0;

  for (const ev of events || []) {
    if (!ev.deleted_at && ev.status !== 'completed') {
      activeCount++;
    }
    if (ev.created_at) {
      const created = new Date(ev.created_at);
      if (
        !Number.isNaN(created.getTime()) &&
        created.getFullYear() === targetYear &&
        created.getMonth() === targetMonth
      ) {
        monthlyCreatedCount++;
      }
    }
  }

  return { activeCount, monthlyCreatedCount };
}

/**
 * Valida la creación o restauración de proyectos distinguiendo:
 * - `free` / `custom` / `demo`: tope por proyectos ACTIVOS simultáneos.
 * - `essential`: tope estricto por proyectos NUEVOS creados en el mes (mover a papelera no libera cupo).
 * - `growth` / `scale` / `custom+mod_unlimited_projects` / `isExempt`: ilimitados.
 */
export function canCreateProject(
  entitlements: ResolvedEntitlements,
  counts: ProjectUsageCounts
): ProjectCreationGuardResult {
  if (entitlements.isExempt) {
    return {
      allowed: true,
      mode: 'unlimited',
      limit: null,
      current: counts.activeCount,
      remaining: null,
      requiredPlan: 'free',
    };
  }

  if (entitlements.isExpiredLock) {
    return {
      allowed: false,
      mode: 'locked',
      limit: entitlements.maxProjects,
      current: counts.activeCount,
      remaining: 0,
      reason:
        'Su suscripción está vencida o impaga. Sus datos históricos están resguardados; reactive su plan en Suscripción para crear o restaurar proyectos.',
      requiredPlan: entitlements.tier === 'free' ? 'essential' : entitlements.tier,
    };
  }

  const hasUnlimitedModule = canUseModule(entitlements, 'mod_unlimited_projects');
  if (
    !entitlements.isDemo &&
    (entitlements.maxProjects === null || hasUnlimitedModule)
  ) {
    return {
      allowed: true,
      mode: 'unlimited',
      limit: null,
      current: counts.activeCount,
      remaining: null,
      requiredPlan: 'growth',
    };
  }

  const limit = entitlements.maxProjects ?? (entitlements.isDemo ? 10 : 2);

  if (entitlements.effectiveTier === 'essential' && !entitlements.isDemo) {
    const current = Math.max(0, counts.monthlyCreatedCount || 0);
    const remaining = Math.max(0, limit - current);
    const allowed = current < limit;
    return {
      allowed,
      mode: 'monthly',
      limit,
      current,
      remaining,
      requiredPlan: 'growth',
      ...(allowed
        ? {}
        : {
            reason: `Alcanzó el tope mensual de ${limit} proyectos nuevos de Operación Esencial (${current}/${limit} este mes). Actualice a Crecimiento Inteligente IA para proyectos ilimitados.`,
          }),
    };
  }

  const current = Math.max(0, counts.activeCount || 0);
  const remaining = Math.max(0, limit - current);
  const allowed = current < limit;
  const requiredPlan: SubscriptionTier = entitlements.isDemo
    ? 'growth'
    : entitlements.effectiveTier === 'free'
    ? 'essential'
    : 'growth';

  return {
    allowed,
    mode: 'active',
    limit,
    current,
    remaining,
    requiredPlan,
    ...(allowed
      ? {}
      : {
          reason: entitlements.isDemo
            ? `El entorno Demo permite hasta ${limit} proyectos activos simultáneos (${current}/${limit}). Archive uno o cree su cuenta.`
            : `Alcanzó el máximo de ${limit} proyectos activos de su plan actual (${current}/${limit}). Complete proyectos existentes o suba a ${requiredPlan === 'essential' ? 'Operación Esencial' : 'Crecimiento Inteligente IA'}.`,
        }),
  };
}

/**
 * Valida la creación de ítems en el catálogo maestro (`/costs`).
 */
export function canCreateCost(
  entitlements: ResolvedEntitlements,
  currentCostCount: number
): CostCreationGuardResult {
  if (entitlements.isExempt) {
    return {
      allowed: true,
      limit: null,
      current: currentCostCount,
      remaining: null,
      requiredPlan: 'free',
    };
  }

  if (entitlements.isExpiredLock) {
    return {
      allowed: false,
      limit: entitlements.maxCosts,
      current: currentCostCount,
      remaining: 0,
      requiredPlan: entitlements.tier === 'free' ? 'essential' : entitlements.tier,
      reason:
        'Su suscripción está vencida. Reactive su plan en Suscripción para agregar nuevas tarifas al catálogo.',
    };
  }

  const hasUnlimited = canUseModule(entitlements, 'mod_unlimited_projects');
  if (!entitlements.isDemo && (entitlements.maxCosts === null || hasUnlimited)) {
    return {
      allowed: true,
      limit: null,
      current: currentCostCount,
      remaining: null,
      requiredPlan: 'growth',
    };
  }

  const limit = entitlements.maxCosts ?? (entitlements.isDemo ? 25 : 25);
  const current = Math.max(0, currentCostCount || 0);
  const remaining = Math.max(0, limit - current);
  const allowed = current < limit;
  const requiredPlan: SubscriptionTier =
    entitlements.effectiveTier === 'free' ? 'essential' : 'growth';

  return {
    allowed,
    limit,
    current,
    remaining,
    requiredPlan,
    ...(allowed
      ? {}
      : {
          reason: `Alcanzó el límite de ${limit} ítems en su catálogo maestro (${current}/${limit}). Actualice su plan para ampliar o liberar el catálogo.`,
        }),
  };
}

/**
 * Valida si la organización puede ejecutar consultas de IA / OCR y cuánto cupo resta.
 */
export function canUseAi(entitlements: ResolvedEntitlements): AiGuardCheckResult {
  const aiPlan = requiredPlanForModule('mod_ai_suite');

  if (entitlements.isExempt) {
    return {
      allowed: true,
      remaining: entitlements.aiCallsRemaining,
      limit: entitlements.aiCallsLimit,
      used: entitlements.aiCallsUsed,
      requiredPlan: aiPlan.id,
    };
  }

  if (entitlements.isExpiredLock) {
    return {
      allowed: false,
      remaining: 0,
      limit: entitlements.aiCallsLimit,
      used: entitlements.aiCallsUsed,
      requiredPlan: aiPlan.id,
      reason:
        'Su suscripción está vencida. Reactive su plan en Suscripción para volver a utilizar la Suite IA.',
    };
  }

  if (!canUseModule(entitlements, 'mod_ai_suite')) {
    return {
      allowed: false,
      remaining: 0,
      limit: 0,
      used: entitlements.aiCallsUsed,
      requiredPlan: aiPlan.id,
      reason: `La Suite IA y OCR documental está disponible desde ${aiPlan.name} ($${aiPlan.price_clp.toLocaleString('es-CL')}/mes).`,
    };
  }

  const remaining = Math.max(0, entitlements.aiCallsLimit - entitlements.aiCallsUsed);
  if (remaining <= 0) {
    return {
      allowed: false,
      remaining: 0,
      limit: entitlements.aiCallsLimit,
      used: entitlements.aiCallsUsed,
      requiredPlan: entitlements.effectiveTier === 'essential' ? 'growth' : 'scale',
      reason: `Agotó sus ${entitlements.aiCallsLimit} créditos de IA de este mes. Amplíe su plan para obtener más capacidad.`,
    };
  }

  return {
    allowed: true,
    remaining,
    limit: entitlements.aiCallsLimit,
    used: entitlements.aiCallsUsed,
    requiredPlan: aiPlan.id,
  };
}

/**
 * Jerarquía comercial exacta de Branding y Datos Bancarios:
 * - `bankInfo`: Essential+ (o `mod_pdf_quotes` / `mod_transactions_sii`)
 * - `logo`: Growth+ y Demo (o `custom` con `mod_team_branding` o `mod_pdf_quotes` + `mod_analytics_excel`)
 * - `whiteLabel`, `customLegalFooter`, `multipleBankAccounts`: Scale (o `mod_team_branding`)
 */
export function brandingCapabilities(entitlements: ResolvedEntitlements): BrandingCapabilities {
  if (entitlements.isExempt) {
    return {
      bankInfo: true,
      logo: true,
      whiteLabel: true,
      customLegalFooter: true,
      multipleBankAccounts: true,
      requiredPlanForBankInfo: 'essential',
      requiredPlanForLogo: 'growth',
      requiredPlanForWhiteLabel: 'scale',
    };
  }

  if (entitlements.isExpiredLock) {
    return {
      bankInfo: false,
      logo: false,
      whiteLabel: false,
      customLegalFooter: false,
      multipleBankAccounts: false,
      requiredPlanForBankInfo: 'essential',
      requiredPlanForLogo: 'growth',
      requiredPlanForWhiteLabel: 'scale',
    };
  }

  const hasTeamBranding = canUseModule(entitlements, 'mod_team_branding');
  const hasPdfOrSii =
    canUseModule(entitlements, 'mod_pdf_quotes') ||
    canUseModule(entitlements, 'mod_transactions_sii');
  const isGrowthOrScale =
    entitlements.isDemo ||
    entitlements.effectiveTier === 'growth' ||
    entitlements.effectiveTier === 'scale';

  const bankInfo = isGrowthOrScale || entitlements.effectiveTier === 'essential' || hasPdfOrSii || hasTeamBranding;
  const logo =
    isGrowthOrScale ||
    hasTeamBranding ||
    (canUseModule(entitlements, 'mod_pdf_quotes') &&
      canUseModule(entitlements, 'mod_analytics_excel'));
  const whiteLabel = hasTeamBranding;

  return {
    bankInfo,
    logo,
    whiteLabel,
    customLegalFooter: whiteLabel,
    multipleBankAccounts: whiteLabel,
    requiredPlanForBankInfo: 'essential',
    requiredPlanForLogo: 'growth',
    requiredPlanForWhiteLabel: 'scale',
  };
}
