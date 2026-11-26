'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowRight,
  Check,
  CreditCard,
  Lock,
  Sparkles,
  X,
  ShieldCheck,
  Layers,
  Users,
  FolderKanban,
  Cpu,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn, formatCLP } from '@/lib/utils';
import {
  ALL_MODULE_KEYS,
  calculateCustomPriceClp,
  DEFAULT_ADDONS,
  DEFAULT_PLANS,
} from '@/lib/entitlements';
import type { IndustryBlueprint } from '@/lib/industries';
import type { ModuleKey, SubscriptionAddon, SubscriptionPlan, SubscriptionTier } from '@/types/database';

interface PlanDetailModalProps {
  plan: SubscriptionPlan | null;
  plans?: SubscriptionPlan[];
  addons?: SubscriptionAddon[];
  industry?: IndustryBlueprint;
  industryName?: string;
  isCurrent?: boolean;
  isOnboarding?: boolean;
  loadingTier?: string | null;
  surface?: 'light' | 'obsidian';
  onClose: () => void;
  onSelectPlan: (tier: SubscriptionTier) => void;
  onSwitchToRecommended?: () => void;
}

const MODULE_DESCRIPTIONS: Record<
  ModuleKey,
  { title: string; benefit: string }
> = {
  mod_unlimited_projects: {
    title: 'Proyectos & Catálogo Ilimitados',
    benefit: 'Opera sin topes mensuales ni límites de tarifas maestras cuando su demanda crece.',
  },
  mod_pdf_quotes: {
    title: 'Cotizador PDF Ejecutivo & Portal /q',
    benefit: 'Emite propuestas comerciales en PDF y enlaces web /q con sus datos bancarios para aprobación directa.',
  },
  mod_transactions_sii: {
    title: 'Tesorería, Abonos, Cartola RCV & F29',
    benefit: 'Controla abonos, gastos reales, retención 15,25%, conciliación bancaria/RCV y proyección F29 SII.',
  },
  mod_consolidation_retail: {
    title: 'Consolidación, Recetas & Modo Retail',
    benefit: 'Agrupa partidas padre/hijo, escandallos y prorrateo unitario ocultando el desglose interno al cliente.',
  },
  mod_ai_suite: {
    title: 'Suite IA + OCR Documental',
    benefit: 'Sube PDF, Excel o fotos de facturas y transfórmalas en presupuestos calibrados al margen de su rubro.',
  },
  mod_analytics_excel: {
    title: 'Analítica P&L & Excel Contable F29',
    benefit: 'Dashboards de rentabilidad neta ex-IVA por período y libro contable + F29 Excel descargable.',
  },
  mod_team_branding: {
    title: 'RBAC Granular, Auditoría & Marca Blanca 100%',
    benefit: 'Roles por área (Comercial, Operaciones, Finanzas, Contador), bitácora inmutable, piso de margen y PDF sin huella FIGURA.',
  },
};

const ALL_MODULES_ORDER: ModuleKey[] = [
  'mod_unlimited_projects',
  'mod_pdf_quotes',
  'mod_transactions_sii',
  'mod_consolidation_retail',
  'mod_ai_suite',
  'mod_analytics_excel',
  'mod_team_branding',
];

function buildPersuasivePitch(
  plan: SubscriptionPlan,
  recommendedPlan: SubscriptionPlan,
  fullCustomClp: number
): { headline: string; audience: string; roiNote: string } {
  if (plan.id === 'free') {
    const activeCap = plan.max_projects ?? 2;
    return {
      headline: 'Valide la precisión financiera sin riesgo ni tarjeta',
      audience: `Ideal para estructurar sus primeros ${activeCap} proyectos activos y ${plan.max_costs ?? 25} tarifas con IVA 19% y margen real antes de operar en volumen.`,
      roiNote:
        'Su historial nunca se elimina: cuando necesite emitir PDFs formales, usar Portal /q, controlar F29 o activar IA, sube de nivel en 1 clic.',
    };
  }
  if (plan.id === 'essential') {
    return {
      headline: 'Orden comercial, consolidación, flujo SII e impulso inicial con IA',
      audience: `Diseñado para empresas en marcha que necesitan cotizar en PDF con datos bancarios, consolidar partidas padre/hijo, controlar F29 e iniciar con ${plan.ai_calls_limit} consultas IA/OCR al mes.`,
      roiNote: `Evita errores manuales de IVA y retenciones 15,25%. Si supera ${plan.max_projects ?? 20} proyectos al mes o necesita Analítica P&L, Excel F29, Logo propio y ${recommendedPlan.ai_calls_limit} créditos IA, ${recommendedPlan.name} (${formatCLP(recommendedPlan.price_clp)}/mes) se paga solo.`,
    };
  }
  if (plan.id === 'scale') {
    const savingsVsCustom = Math.max(0, fullCustomClp - plan.price_clp);
    return {
      headline: 'Gobernanza corporativa, RBAC, auditoría y Marca Blanca 100%',
      audience:
        'Pensado para operaciones consolidadas con múltiples jefes de proyecto, vendedores, control de margen mínimo y exigencia de identidad propia.',
      roiNote: `Ahorra ${formatCLP(savingsVsCustom)}/mes frente a contratar todos los módulos por separado, sumando usuarios ilimitados, RBAC, bitácora y ${plan.ai_calls_limit} créditos IA con motor CFO.`,
    };
  }
  return {
    headline: 'El punto óptimo de rentabilidad: control total de IVA, fugas e IA Pro',
    audience:
      'El preferido por productoras, constructoras, agencias y empresas de servicios que buscan cero sorpresas a fin de mes.',
    roiNote:
      'Protegiendo apenas un 4,5% de margen oculto en un proyecto de $1.600.000, recupera $72.000: más que el valor mensual completo.',
  };
}

export function PlanDetailModal({
  plan,
  plans = DEFAULT_PLANS,
  addons = DEFAULT_ADDONS,
  industry,
  industryName,
  isCurrent = false,
  isOnboarding = false,
  loadingTier = null,
  surface = 'light',
  onClose,
  onSelectPlan,
  onSwitchToRecommended,
}: PlanDetailModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!plan) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown, true);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown, true);
    };
  }, [plan, onClose]);

  if (!plan || !mounted) return null;

  const isRec = Boolean(plan.is_recommended);
  const isObsidian = surface === 'obsidian';
  const includedSet = new Set(plan.included_modules || []);
  const includedModules = ALL_MODULES_ORDER.filter((m) => includedSet.has(m));
  const missingModules = ALL_MODULES_ORDER.filter((m) => !includedSet.has(m));
  const recommendedPlan =
    plans.find((p) => p.is_recommended) ||
    plans.find((p) => p.id === 'growth') ||
    DEFAULT_PLANS[2];
  const fullCustomClp = calculateCustomPriceClp(ALL_MODULE_KEYS, addons);
  const pitch = buildPersuasivePitch(plan, recommendedPlan, fullCustomClp);
  const projectsQuotaLabel =
    plan.max_projects === null
      ? 'Ilimitados'
      : plan.id === 'free'
      ? `${plan.max_projects} activos`
      : `${plan.max_projects} / mes`;

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 backdrop-blur-md',
        isObsidian ? 'bg-black/70' : 'bg-slate-900/25'
      )}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="plan-detail-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'relative w-full max-w-3xl max-h-[88vh] flex flex-col rounded-3xl overflow-hidden animate-modal-in',
          isObsidian
            ? 'obsidian-glass-luxury text-[#EEF1F6]'
            : 'glass-luxury text-foreground'
        )}
      >
        {/* Header */}
        <div
          className={cn(
            'px-6 sm:px-8 py-5 border-b flex items-start justify-between gap-4 shrink-0',
            isObsidian ? 'border-white/10' : 'border-slate-200/80'
          )}
        >
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              {plan.badge_text && (
                <Badge
                  className={cn(
                    'text-[10px] tracking-[0.14em] uppercase',
                    isObsidian
                      ? isRec
                        ? 'bg-[#D8C39E]/15 text-[#EDE0C8] border border-[#D8C39E]/35'
                        : 'bg-white/8 text-[#96A1B5] border border-white/12'
                      : isRec
                      ? 'bg-[#467366]/15 text-[#2E5248] border border-[#467366]/30'
                      : 'bg-[#4A607A]/12 text-[#3B4F66] border border-[#4A607A]/25'
                  )}
                >
                  {isRec && <Sparkles className="h-3 w-3 mr-1 inline" />}
                  {plan.badge_text}
                </Badge>
              )}
              {industryName && (
                <span
                  className={cn(
                    'text-[11px] font-medium',
                    isObsidian ? 'text-[#D8C39E]' : 'text-[#4A607A]'
                  )}
                >
                  Configurado para {industryName}
                </span>
              )}
            </div>
            <h2 id="plan-detail-title" className="text-2xl sm:text-3xl font-semibold tracking-tight">
              {plan.name}
            </h2>
            <p className={cn('text-xs sm:text-sm', isObsidian ? 'text-[#96A1B5]' : 'text-muted-foreground')}>
              {pitch.headline}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right hidden sm:block">
              <div className="text-2xl font-semibold tabular-nums">
                {plan.price_clp === 0 ? '$0' : formatCLP(plan.price_clp)}
              </div>
              <div className={cn('text-[11px]', isObsidian ? 'text-[#96A1B5]' : 'text-muted-foreground')}>
                {plan.price_clp === 0 ? '/ mes' : '/ mes · IVA incl.'}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar detalle del plan"
              className={cn(
                'h-9 w-9 rounded-full flex items-center justify-center border transition-colors',
                isObsidian
                  ? 'border-white/12 bg-white/5 hover:bg-white/12 text-[#96A1B5] hover:text-[#EEF1F6]'
                  : 'border-slate-200 bg-white/70 hover:bg-white text-muted-foreground'
              )}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-6 sm:px-8 py-6 space-y-6 custom-scrollbar">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: FolderKanban, label: 'Proyectos', val: projectsQuotaLabel, cls: isObsidian ? 'text-[#D8C39E]' : 'text-[#4A607A]' },
              { icon: Layers, label: 'Tarifas', val: plan.max_costs === null ? 'Ilimitadas' : `${plan.max_costs} ítems`, cls: isObsidian ? 'text-[#4FA88B]' : 'text-[#467366]' },
              { icon: Users, label: 'Equipo', val: plan.max_users === null ? 'Ilimitados' : `${plan.max_users} usuario${plan.max_users > 1 ? 's' : ''}`, cls: isObsidian ? 'text-[#D8C39E]' : 'text-[#4A607A]' },
              { icon: Cpu, label: 'Consultas IA', val: plan.ai_calls_limit === 0 ? 'Sin IA' : `${plan.ai_calls_limit} / mes`, cls: isObsidian ? 'text-[#5E89E8]' : 'text-[#467366]' },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className={cn(
                    'p-3.5 rounded-2xl border',
                    isObsidian ? 'bg-white/[0.04] border-white/10' : 'bg-white/75 border-slate-200/80'
                  )}
                >
                  <div className={cn('flex items-center gap-1.5 text-[10px] uppercase tracking-wider', isObsidian ? 'text-[#96A1B5]' : 'text-muted-foreground')}>
                    <Icon className={cn('h-3.5 w-3.5', stat.cls)} />
                    {stat.label}
                  </div>
                  <div className="text-base font-semibold mt-1 tabular-nums">{stat.val}</div>
                </div>
              );
            })}
          </div>

          <div
            className={cn(
              'p-4 rounded-2xl border space-y-1.5 text-xs sm:text-sm leading-relaxed',
              isObsidian ? 'bg-white/[0.04] border-white/10' : 'bg-white/75 border-slate-200/80'
            )}
          >
            <p className="font-medium">{pitch.audience}</p>
            <p className={cn('text-xs', isObsidian ? 'text-[#4FA88B]' : 'text-[#467366]')}>
              <strong>Impacto financiero:</strong> {pitch.roiNote}
            </p>
          </div>

          <div className="space-y-3">
            <h3 className={cn('text-[11px] uppercase tracking-[0.14em] font-semibold', isObsidian ? 'text-[#4FA88B]' : 'text-[#467366]')}>
              Lo que incluye este plan
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {(plan.features || []).map((f, i) => (
                <div
                  key={i}
                  className={cn(
                    'p-3 rounded-xl border flex items-start gap-2.5 text-xs',
                    isObsidian ? 'bg-white/[0.04] border-white/10' : 'bg-white/75 border-slate-200/80'
                  )}
                >
                  <Check className={cn('h-4 w-4 shrink-0 mt-0.5', isObsidian ? 'text-[#4FA88B]' : 'text-[#467366]')} />
                  <span>{f}</span>
                </div>
              ))}
              {includedModules.map((modKey) => {
                const info = MODULE_DESCRIPTIONS[modKey];
                return (
                  <div
                    key={modKey}
                    className={cn(
                      'p-3 rounded-xl border flex items-start gap-2.5 text-xs',
                      isObsidian ? 'bg-white/[0.04] border-white/10' : 'bg-white/75 border-slate-200/80'
                    )}
                  >
                    <Check className={cn('h-4 w-4 shrink-0 mt-0.5', isObsidian ? 'text-[#4FA88B]' : 'text-[#467366]')} />
                    <div>
                      <div className="font-semibold">{info.title}</div>
                      <div className={cn('text-[11px] mt-0.5', isObsidian ? 'text-[#96A1B5]' : 'text-muted-foreground')}>
                        {info.benefit}
                      </div>
                    </div>
                  </div>
                );
              })}
              {industry?.planSpecialtyFeatures?.[plan.id]?.map((specFeat, sIdx) => (
                <div
                  key={`modal-spec-${sIdx}`}
                  className={cn(
                    'p-3 rounded-xl border flex items-start gap-2.5 text-xs sm:col-span-2',
                    isObsidian
                      ? 'bg-[#D8C39E]/[0.08] border-[#D8C39E]/25'
                      : 'bg-[#1261E0]/[0.06] border-[#1261E0]/20'
                  )}
                >
                  <Sparkles className={cn('h-4 w-4 shrink-0 mt-0.5', isObsidian ? 'text-[#D8C39E]' : 'text-[#1261E0]')} />
                  <div>
                    <div className={cn('font-semibold', isObsidian ? 'text-[#EDE0C8]' : 'text-[#0F4FB8]')}>
                      Especializado para {industry.shortName}
                    </div>
                    <div className={cn('text-[11px] mt-0.5', isObsidian ? 'text-[#EEF1F6]/85' : 'text-foreground/85')}>
                      {specFeat}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {missingModules.length > 0 && (
            <div className="space-y-3">
              <h3 className={cn('text-[11px] uppercase tracking-[0.14em] font-semibold', isObsidian ? 'text-[#96A1B5]' : 'text-muted-foreground')}>
                Lo que no incluye (disponible en planes superiores)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {missingModules.map((modKey) => {
                  const info = MODULE_DESCRIPTIONS[modKey];
                  return (
                    <div
                      key={modKey}
                      className={cn(
                        'p-3 rounded-xl border flex items-start gap-2.5 text-xs opacity-85',
                        isObsidian
                          ? 'bg-white/[0.02] border-white/8 text-[#96A1B5]'
                          : 'bg-slate-100/60 border-slate-200/70 text-muted-foreground'
                      )}
                    >
                      <Lock className="h-3.5 w-3.5 shrink-0 mt-0.5 opacity-70" />
                      <div>
                        <div className="font-medium">{info.title}</div>
                        <div className="text-[11px] mt-0.5">{info.benefit}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div
          className={cn(
            'px-6 sm:px-8 py-4 border-t flex flex-wrap items-center justify-between gap-3 shrink-0',
            isObsidian ? 'border-white/10 bg-black/30' : 'border-slate-200/80 bg-white/60'
          )}
        >
          <span className={cn('text-xs flex items-center gap-1.5', isObsidian ? 'text-[#96A1B5]' : 'text-muted-foreground')}>
            <ShieldCheck className={cn('h-4 w-4', isObsidian ? 'text-[#4FA88B]' : 'text-[#467366]')} />
            Tus datos históricos nunca se eliminan si cambias o pausas tu plan.
          </span>

          <div className="flex flex-wrap items-center gap-2.5 ml-auto">
            {!isRec && (plan.id === 'free' || plan.id === 'essential') && onSwitchToRecommended && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onSwitchToRecommended}
                className={cn(
                  'text-xs gap-1.5',
                  isObsidian && 'border-[#D8C39E]/30 bg-white/5 text-[#EDE0C8] hover:bg-white/10 hover:text-white'
                )}
              >
                <Sparkles className={cn('h-3.5 w-3.5', isObsidian ? 'text-[#D8C39E]' : 'text-[#4A607A]')} />
                Ver Recomendado ({formatCLP(recommendedPlan.price_clp)})
              </Button>
            )}
            <Button
              type="button"
              disabled={Boolean(loadingTier)}
              onClick={() => onSelectPlan(plan.id)}
              className={cn(
                'font-semibold gap-2 tactile-press',
                isObsidian && 'bg-[#D8C39E] text-[#06070A] hover:bg-[#EDE0C8]'
              )}
            >
              {plan.price_clp === 0 ? <ArrowRight className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
              {isCurrent && !isOnboarding && plan.price_clp > 0
                ? 'Renovar este Plan'
                : plan.price_clp === 0
                ? 'Comenzar Gratis'
                : `Elegir ${plan.name}`}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
