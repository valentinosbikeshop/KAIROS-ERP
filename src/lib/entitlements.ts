import { DUO_ORG_SLUG } from './constants';
import type {
  ModuleKey,
  Organization,
  SubscriptionAddon,
  SubscriptionPlan,
  SubscriptionTier,
} from '@/types/database';
import type { ResolvedEntitlements } from '@/types';

export const ALL_MODULE_KEYS: ModuleKey[] = [
  'mod_unlimited_projects',
  'mod_pdf_quotes',
  'mod_transactions_sii',
  'mod_consolidation_retail',
  'mod_ai_suite',
  'mod_analytics_excel',
  'mod_team_branding',
];

export const DEFAULT_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Semilla',
    tagline: 'Para validar tu estructura inicial sin costo',
    description:
      'Organiza tus primeros presupuestos con cálculo neto/IVA SII automático. Ideal para probar la plataforma antes de escalar.',
    price_clp: 0,
    is_recommended: false,
    badge_text: 'Gratis',
    max_projects: 2,
    max_costs: 25,
    max_users: 1,
    ai_calls_limit: 0,
    included_modules: [],
    features: [
      'Hasta 2 proyectos activos en simultáneo',
      'Hasta 25 ítems o tarifas en catálogo maestro',
      '1 usuario administrador',
      'Cálculo automático Neto, IVA 19%, Exento y Margen real',
      'Resguardo histórico garantizado (nunca pierdes datos)',
    ],
    sort_order: 1,
    is_active: true,
  },
  {
    id: 'essential',
    name: 'Operación Esencial',
    tagline: 'Cotizador PDF, consolidación, caja SII y Suite IA Inicial',
    description:
      'Pensado para empresas en marcha que necesitan emitir propuestas PDF con sus datos bancarios, agrupar partidas padre/hijo, controlar abonos/F29 e iniciar con IA y OCR.',
    price_clp: 34990,
    is_recommended: false,
    badge_text: 'Inicial',
    max_projects: 20,
    max_costs: 150,
    max_users: 2,
    ai_calls_limit: 30,
    included_modules: [
      'mod_pdf_quotes',
      'mod_transactions_sii',
      'mod_consolidation_retail',
      'mod_ai_suite',
    ],
    features: [
      'Hasta 20 proyectos nuevos al mes y 150 tarifas',
      '2 usuarios en tu espacio',
      'Cotizador PDF + Portal web con tus datos bancarios',
      'Consolidación padre/hijo, recetas y prorrateo por unidad',
      'Abonos, Gastos Reales SII, F29 y 30 consultas IA + OCR/mes',
    ],
    sort_order: 2,
    is_active: true,
  },
  {
    id: 'growth',
    name: 'Crecimiento Inteligente IA',
    tagline: 'Ilimitado + IA Pro + OCR + Analítica P&L y Logo propio',
    description:
      'La opción más rentable: automatiza cotizaciones desde PDF/Excel/Fotos con IA, domina tu IVA F29 con conciliador bancario/RCV, luce tu logo y protege tu margen neto.',
    price_clp: 69990,
    is_recommended: true,
    badge_text: 'Recomendado',
    max_projects: null,
    max_costs: null,
    max_users: 5,
    ai_calls_limit: 250,
    included_modules: [
      'mod_unlimited_projects',
      'mod_pdf_quotes',
      'mod_transactions_sii',
      'mod_consolidation_retail',
      'mod_ai_suite',
      'mod_analytics_excel',
    ],
    features: [
      'Proyectos y catálogo maestro ILIMITADOS',
      'Hasta 5 usuarios colaboradores + logo propio en PDF y Portal',
      'Suite IA Pro (250 consultas/mes) + OCR PDF, Excel y Fotos',
      'Asesor CFO IA, Optimizador de Márgenes y Consolidación avanzada',
      'Conciliador Cartola/RCV SII, Analítica P&L y Excel contable F29',
    ],
    sort_order: 3,
    is_active: true,
  },
  {
    id: 'scale',
    name: 'Corporativo & Escala',
    tagline: 'Equipo ilimitado, RBAC, auditoría, Marca Blanca 100% y 800 IA',
    description:
      'Para productoras, constructoras, consultoras y operaciones consolidadas que exigen roles granulares, auditoría, aprobación de márgenes y Marca Blanca 100%.',
    price_clp: 119990,
    is_recommended: false,
    badge_text: 'Enterprise',
    max_projects: null,
    max_costs: null,
    max_users: null,
    ai_calls_limit: 800,
    included_modules: [
      'mod_unlimited_projects',
      'mod_pdf_quotes',
      'mod_transactions_sii',
      'mod_consolidation_retail',
      'mod_ai_suite',
      'mod_analytics_excel',
      'mod_team_branding',
    ],
    features: [
      'Todo lo de Crecimiento Inteligente IA incluido',
      'Usuarios ILIMITADOS con roles granulares (RBAC) y auditoría',
      '800 consultas IA/mes con prioridad CFO y control de margen mínimo',
      'Marca Blanca 100% (sin huella FIGURA, pie legal y multi-cuenta)',
      'Gobernanza avanzada, centros de costo y soporte prioritario',
    ],
    sort_order: 4,
    is_active: true,
  },
];

export const DEFAULT_ADDONS: SubscriptionAddon[] = [
  {
    id: 'base_custom',
    name: 'Plataforma Activa Base',
    description:
      'Acceso base al ERP personalizado para tu rubro: hasta 8 proyectos activos, 60 tarifas maestras y 1 usuario.',
    price_clp: 14990,
    category: 'base',
    ai_calls_bonus: 0,
    sort_order: 0,
    is_active: true,
  },
  {
    id: 'mod_pdf_quotes',
    name: 'Cotizador PDF Ejecutivo & Portal Cliente',
    description:
      'Genera propuestas comerciales en PDF y enlaces de aprobación web (/q) con tus datos bancarios.',
    price_clp: 9990,
    category: 'module',
    ai_calls_bonus: 0,
    sort_order: 1,
    is_active: true,
  },
  {
    id: 'mod_transactions_sii',
    name: 'Flujo de Caja, Abonos, Cartola RCV y F29',
    description:
      'Control de abonos de clientes, gastos reales rendidos, retención boletas 15,25%, conciliador SII y cálculo F29.',
    price_clp: 9990,
    category: 'module',
    ai_calls_bonus: 0,
    sort_order: 2,
    is_active: true,
  },
  {
    id: 'mod_consolidation_retail',
    name: 'Consolidación, Recetas y Modo Retail',
    description:
      'Agrupa ítems padre/hijo, escandallos y prorrateo unitario ocultando el desglose interno al cliente.',
    price_clp: 12990,
    category: 'module',
    ai_calls_bonus: 0,
    sort_order: 3,
    is_active: true,
  },
  {
    id: 'mod_unlimited_projects',
    name: 'Proyectos y Catálogo Ilimitados',
    description:
      'Elimina los topes de proyectos activos y tarifas maestras en tu organización.',
    price_clp: 18990,
    category: 'module',
    ai_calls_bonus: 0,
    sort_order: 4,
    is_active: true,
  },
  {
    id: 'mod_analytics_excel',
    name: 'Analítica P&L & Exportación Excel Contable',
    description:
      'Dashboards de rentabilidad neta mensual, distribución de costos y descarga de libro Excel + F29.',
    price_clp: 18990,
    category: 'module',
    ai_calls_bonus: 0,
    sort_order: 5,
    is_active: true,
  },
  {
    id: 'mod_ai_suite',
    name: 'Suite IA + OCR Documental (180 créditos/mes)',
    description:
      'Asistente de borradores, desglose automático de costos, optimizador de márgenes, asesor CFO y OCR de PDF/Excel/Fotos.',
    price_clp: 24990,
    category: 'module',
    ai_calls_bonus: 180,
    sort_order: 6,
    is_active: true,
  },
  {
    id: 'mod_team_branding',
    name: 'Equipo Multi-Usuario, RBAC & Marca Blanca 100%',
    description:
      'Habilita hasta 8 usuarios con roles, auditoría y documentos 100% Marca Blanca sin huella externa.',
    price_clp: 29990,
    category: 'module',
    ai_calls_bonus: 0,
    sort_order: 7,
    is_active: true,
  },
];

export function calculateCustomPriceClp(
  selectedModules: ModuleKey[],
  addons: SubscriptionAddon[] = DEFAULT_ADDONS
): number {
  const baseAddon = addons.find((a) => a.id === 'base_custom');
  const basePrice = baseAddon?.price_clp ?? 14990;
  // Evita doble cobro si 'base_custom' llega accidentalmente en selectedModules
  const uniqueModules = Array.from(new Set(selectedModules)).filter(
    (modId) => (modId as string) !== 'base_custom'
  );
  const modulesTotal = uniqueModules.reduce((sum, modId) => {
    const addon = addons.find(
      (a) => a.id === modId && a.category === 'module' && a.is_active !== false
    );
    return sum + (addon?.price_clp ?? 0);
  }, 0);
  return basePrice + modulesTotal;
}

export function calculateCheckoutAmountClp(
  tier: SubscriptionTier,
  selectedModules: ModuleKey[],
  plans: SubscriptionPlan[] = DEFAULT_PLANS,
  addons: SubscriptionAddon[] = DEFAULT_ADDONS
): number {
  if (tier === 'custom') {
    return calculateCustomPriceClp(selectedModules, addons);
  }
  const plan = plans.find((p) => p.id === tier);
  return plan?.price_clp ?? 0;
}

export function buildModulesRecord(enabled: ModuleKey[]): Record<ModuleKey, boolean> {
  const set = new Set(enabled);
  return {
    mod_unlimited_projects: set.has('mod_unlimited_projects'),
    mod_pdf_quotes: set.has('mod_pdf_quotes'),
    mod_transactions_sii: set.has('mod_transactions_sii'),
    mod_consolidation_retail: set.has('mod_consolidation_retail'),
    mod_ai_suite: set.has('mod_ai_suite'),
    mod_analytics_excel: set.has('mod_analytics_excel'),
    mod_team_branding: set.has('mod_team_branding'),
  };
}

export function isFounderOrg(org?: Pick<Organization, 'slug'> | Partial<Organization> | null): boolean {
  if (!org) return false;
  return org.slug === DUO_ORG_SLUG;
}

export function isDuoProducciones(org?: Partial<Organization> | null): boolean {
  if (!org) return false;
  return org.slug === DUO_ORG_SLUG || Boolean(org.is_exempt) || Boolean(org.bank_info?.__saas_config?.is_exempt);
}

/**
 * Resuelve los permisos efectivos de una organización aplicando:
 * 1) Exención total para DUO Producciones (y organizaciones con is_exempt=true).
 * 2) Cuotas de Sandbox para Demo.
 * 3) Soft-Lock automático si la suscripción pagada venció o está inactiva (nunca borra datos).
 */
export function resolveOrgEntitlements(
  org: Organization | null | undefined,
  plans: SubscriptionPlan[] = DEFAULT_PLANS,
  addons: SubscriptionAddon[] = DEFAULT_ADDONS
): ResolvedEntitlements {
  const saas = org?.bank_info?.__saas_config;
  const industryType = org?.industry_type || saas?.industry_type || 'eventos_banqueteria';
  const themePreset = org?.theme_preset || saas?.theme_preset || 'obsidian_gold';
  const operationMode = org?.operation_mode || saas?.operation_mode || 'project';
  const aiCallsUsed = org?.ai_calls_used ?? saas?.ai_calls_used ?? 0;

  // 1. DUO Producciones o empresa exenta: acceso total sin límites
  if (isDuoProducciones(org)) {
    return {
      tier: 'scale',
      effectiveTier: 'scale',
      status: 'active',
      isExempt: true,
      isDemo: false,
      isExpiredLock: false,
      maxProjects: null,
      maxCosts: null,
      maxUsers: null,
      aiCallsLimit: 999999,
      aiCallsUsed,
      aiCallsRemaining: 999999,
      modules: buildModulesRecord(ALL_MODULE_KEYS),
      currentPeriodEnd: null,
      industryType,
      themePreset,
      operationMode,
    };
  }

  // 2. Entorno Demo Sandbox: mantiene sus cuotas demo y habilita funciones para evaluar
  if (org?.is_demo) {
    return {
      tier: 'growth',
      effectiveTier: 'growth',
      status: 'active',
      isExempt: false,
      isDemo: true,
      isExpiredLock: false,
      maxProjects: org.max_demo_events || 10,
      maxCosts: org.max_demo_costs || 25,
      maxUsers: 1,
      aiCallsLimit: 30,
      aiCallsUsed,
      aiCallsRemaining: Math.max(0, 30 - aiCallsUsed),
      modules: buildModulesRecord([
        'mod_pdf_quotes',
        'mod_transactions_sii',
        'mod_consolidation_retail',
        'mod_ai_suite',
        'mod_analytics_excel',
      ]),
      currentPeriodEnd: null,
      industryType,
      themePreset,
      operationMode,
    };
  }

  const tier: SubscriptionTier = org?.subscription_tier || saas?.subscription_tier || 'free';
  const status = org?.subscription_status || saas?.subscription_status || 'active';
  const currentPeriodEnd = org?.current_period_end ?? saas?.current_period_end ?? null;
  const selectedModules: ModuleKey[] = org?.selected_modules || saas?.selected_modules || [];

  // Verificar si un plan de pago está vencido o impago -> Soft-Lock a 'free'
  const isPaidTier = tier !== 'free';
  const isPeriodExpired =
    isPaidTier &&
    Boolean(currentPeriodEnd) &&
    new Date(currentPeriodEnd as string).getTime() < Date.now();
  const isExpiredLock = isPaidTier && (status !== 'active' || isPeriodExpired);

  const effectiveTier: SubscriptionTier = isExpiredLock ? 'free' : tier;

  if (effectiveTier === 'custom') {
    const mods = buildModulesRecord(selectedModules);
    const aiAddon = addons.find((a) => a.id === 'mod_ai_suite');
    const aiLimit = mods.mod_ai_suite ? aiAddon?.ai_calls_bonus ?? 180 : 0;
    return {
      tier,
      effectiveTier,
      status: isExpiredLock ? 'past_due' : status,
      isExempt: false,
      isDemo: false,
      isExpiredLock,
      maxProjects: mods.mod_unlimited_projects ? null : 8,
      maxCosts: mods.mod_unlimited_projects ? null : 60,
      maxUsers: mods.mod_team_branding ? 8 : 1,
      aiCallsLimit: aiLimit,
      aiCallsUsed,
      aiCallsRemaining: Math.max(0, aiLimit - aiCallsUsed),
      modules: mods,
      currentPeriodEnd,
      industryType,
      themePreset,
      operationMode,
    };
  }

  const plan = plans.find((p) => p.id === effectiveTier) || DEFAULT_PLANS[0];
  const mods = buildModulesRecord(plan.included_modules || []);

  return {
    tier,
    effectiveTier,
    status: isExpiredLock ? 'past_due' : status,
    isExempt: false,
    isDemo: false,
    isExpiredLock,
    maxProjects: plan.max_projects,
    maxCosts: plan.max_costs,
    maxUsers: plan.max_users,
    aiCallsLimit: plan.ai_calls_limit,
    aiCallsUsed,
    aiCallsRemaining: Math.max(0, plan.ai_calls_limit - aiCallsUsed),
    modules: mods,
    currentPeriodEnd,
    industryType,
    themePreset,
    operationMode,
  };
}
