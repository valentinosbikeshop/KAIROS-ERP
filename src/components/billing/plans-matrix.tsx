'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Sparkles,
  Layers,
  CreditCard,
  Loader2,
  ShieldCheck,
  Zap,
  ArrowRight,
  Sliders,
  Eye,
  Lock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AnimatedNumber } from '@/components/ui/motion-primitives';
import { PlanDetailModal } from './plan-detail-modal';
import { cn, formatCLP } from '@/lib/utils';
import { calculateCustomPriceClp } from '@/lib/entitlements';
import type { IndustryBlueprint } from '@/lib/industries';
import type {
  ModuleKey,
  SubscriptionAddon,
  SubscriptionPlan,
  SubscriptionTier,
} from '@/types/database';

const PLAN_MISSING_HIGHLIGHTS: Record<string, string[]> = {
  free: [
    'Sin Cotizador PDF comercial',
    'Sin control de abonos ni IVA F29',
    'Sin Suite IA ni lectura OCR',
  ],
  essential: [
    'Tope de 12 proyectos al mes y 25 consultas IA',
    'Sin Consolidación, Recetas ni Prorrateo Retail',
    'Sin Analítica P&L ni Excel Contable F29',
  ],
  growth: [
    'Hasta 5 usuarios colaboradores',
    'Sin Marca Blanca PDF propia',
  ],
  scale: [],
};

const PLAN_ROI_NUDGE: Record<string, string> = {
  free: 'Ideal para probar el cálculo neto/IVA antes de cotizar en volumen.',
  essential: 'Ordena cotizaciones PDF, caja e inicia con 25 IA/mes por ~$1.166/día.',
  growth: 'Protegiendo 4,5% de margen en un proyecto de $1,5M recuperas el valor del plan.',
  scale: 'Ahorras $37.930/mes frente a módulos sueltos, con equipo ilimitado y 800 IA/mes.',
};

interface PlansMatrixProps {
  plans: SubscriptionPlan[];
  addons: SubscriptionAddon[];
  currentTier?: SubscriptionTier;
  currentModules?: ModuleKey[];
  industry?: IndustryBlueprint;
  industryName?: string;
  khipuReady?: boolean;
  isSuperAdmin?: boolean;
  isOnboarding?: boolean;
  surface?: 'light' | 'obsidian';
  onSelectCheckout: (
    tier: SubscriptionTier,
    selectedModules: ModuleKey[],
    simulateSuperAdminPayment?: boolean
  ) => Promise<void>;
  loadingTier?: string | null;
}

export function PlansMatrix({
  plans,
  addons,
  currentTier,
  currentModules = [],
  industry,
  industryName,
  khipuReady = false,
  isSuperAdmin = false,
  isOnboarding = false,
  surface = 'light',
  onSelectCheckout,
  loadingTier = null,
}: PlansMatrixProps) {
  const [selectedModules, setSelectedModules] = useState<ModuleKey[]>(currentModules);
  const [detailPlan, setDetailPlan] = useState<SubscriptionPlan | null>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(3);
  const isObsidian = surface === 'obsidian';

  useEffect(() => {
    const updateVisible = () => {
      if (typeof window === 'undefined') return;
      const w = window.innerWidth;
      if (w < 768) setVisibleCount(1);
      else if (w < 1024) setVisibleCount(2);
      else setVisibleCount(3);
    };
    updateVisible();
    window.addEventListener('resize', updateVisible);
    return () => window.removeEventListener('resize', updateVisible);
  }, []);

  const maxCarouselIndex = Math.max(0, plans.length - visibleCount);
  const clampedIndex = Math.min(carouselIndex, maxCarouselIndex);

  useEffect(() => {
    if (carouselIndex > maxCarouselIndex) {
      setCarouselIndex(maxCarouselIndex);
    }
  }, [carouselIndex, maxCarouselIndex]);

  const currentModulesKey = currentModules.join(',');
  useEffect(() => {
    setSelectedModules(currentModules);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentModulesKey]);

  const baseAddon = useMemo(
    () => addons.find((a) => a.id === 'base_custom'),
    [addons]
  );
  const selectableAddons = useMemo(
    () => addons.filter((a) => a.category === 'module' && a.is_active !== false),
    [addons]
  );

  const customTotalClp = useMemo(
    () => calculateCustomPriceClp(selectedModules, addons),
    [selectedModules, addons]
  );

  const recommendedPlan = useMemo(
    () => plans.find((p) => p.is_recommended) || plans.find((p) => p.id === 'growth'),
    [plans]
  );
  const scalePlan = useMemo(
    () => plans.find((p) => p.id === 'scale'),
    [plans]
  );

  const customExceedsScale =
    Boolean(scalePlan && scalePlan.price_clp > 0 && customTotalClp > scalePlan.price_clp);
  const customExceedsRecommended =
    Boolean(
      !customExceedsScale &&
        recommendedPlan &&
        recommendedPlan.price_clp > 0 &&
        customTotalClp >= recommendedPlan.price_clp
    );

  const toggleModule = (modId: ModuleKey) => {
    setSelectedModules((prev) =>
      prev.includes(modId) ? prev.filter((m) => m !== modId) : [...prev, modId]
    );
  };

  return (
    <div className="space-y-10">
      {/* Carrusel de Planes (3 visibles por defecto en desktop con transición suave) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'text-xs font-medium tabular-nums',
                isObsidian ? 'text-[#96A1B5]' : 'text-slate-600'
              )}
            >
              Mostrando{' '}
              <strong className={isObsidian ? 'text-[#EEF1F6]' : 'text-slate-900'}>
                {clampedIndex + 1}–{Math.min(plans.length, clampedIndex + visibleCount)}
              </strong>{' '}
              de {plans.length} planes
            </span>
            {maxCarouselIndex > 0 && (
              <div className="hidden sm:flex items-center gap-1.5 ml-2">
                {Array.from({ length: maxCarouselIndex + 1 }).map((_, dotIdx) => {
                  const activeDot = dotIdx === clampedIndex;
                  return (
                    <button
                      key={dotIdx}
                      type="button"
                      aria-label={`Ver vista ${dotIdx + 1} de planes`}
                      onClick={() => setCarouselIndex(dotIdx)}
                      className={cn(
                        'h-1.5 rounded-full transition-all duration-300',
                        activeDot
                          ? isObsidian
                            ? 'w-6 bg-[#D8C39E]'
                            : 'w-6 bg-[#0F172A]'
                          : isObsidian
                          ? 'w-1.5 bg-white/20 hover:bg-white/40'
                          : 'w-1.5 bg-slate-300 hover:bg-slate-400'
                      )}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {maxCarouselIndex > 0 && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Planes anteriores"
                disabled={clampedIndex === 0}
                onClick={() => setCarouselIndex((prev) => Math.max(0, prev - 1))}
                className={cn(
                  'h-9 w-9 rounded-full tactile-press transition-all',
                  isObsidian
                    ? 'border-white/15 bg-white/[0.05] text-[#EEF1F6] hover:bg-white/[0.12] hover:border-[#D8C39E]/45 disabled:opacity-30'
                    : 'border-slate-300/90 bg-white/85 text-slate-800 hover:bg-white hover:border-[#8C7148]/50 disabled:opacity-35'
                )}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Siguientes planes"
                disabled={clampedIndex >= maxCarouselIndex}
                onClick={() => setCarouselIndex((prev) => Math.min(maxCarouselIndex, prev + 1))}
                className={cn(
                  'h-9 w-9 rounded-full tactile-press transition-all',
                  isObsidian
                    ? 'border-[#D8C39E]/35 bg-[#D8C39E]/12 text-[#EDE0C8] hover:bg-[#D8C39E] hover:text-[#06070A] disabled:opacity-30'
                    : 'border-[#0F172A]/20 bg-[#0F172A] text-[#EDE0C8] hover:bg-[#1E293B] disabled:opacity-35'
                )}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <div className="overflow-hidden py-3 px-1 -mx-1">
          <div
            className="flex gap-5 transition-transform duration-500 will-change-transform"
            style={{
              transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
              transform: `translate3d(calc(-${clampedIndex} * (${100 / visibleCount}% + ${20 / visibleCount}px)), 0, 0)`,
            }}
          >
            {plans.map((plan) => {
              const isCurrent = currentTier === plan.id;
              const isRec = Boolean(plan.is_recommended);
              const isBusy = loadingTier === plan.id;

              return (
                <div
                  key={plan.id}
                  onClick={() => setDetailPlan(plan)}
                  style={{
                    flex: `0 0 calc((100% - ${(visibleCount - 1) * 20}px) / ${visibleCount})`,
                  }}
                  className={cn(
                    'group relative rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 cursor-pointer text-left',
                    isObsidian
                      ? isRec
                        ? 'obsidian-glass-luxury obsidian-shimmer text-[#EEF1F6]'
                        : 'obsidian-glass obsidian-spotlight text-[#EEF1F6] hover:-translate-y-1'
                      : isRec
                      ? 'glass-luxury hairline-shimmer text-foreground ring-1 ring-[#8C7148]/35'
                      : 'glass-card spotlight-card text-foreground hover:-translate-y-1'
                  )}
                >
              <div>
                {plan.badge_text && (
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <Badge
                      className={cn(
                        'text-[10px] font-semibold tracking-[0.12em] uppercase px-2.5 py-0.5',
                        isObsidian
                          ? isRec
                            ? 'bg-[#D8C39E]/15 text-[#EDE0C8] border border-[#D8C39E]/35'
                            : plan.id === 'free'
                            ? 'bg-white/8 text-[#96A1B5] border border-white/12'
                            : 'bg-[#5E89E8]/12 text-[#A7C0F7] border border-[#5E89E8]/25'
                          : isRec
                          ? 'bg-[#467366]/15 text-[#2E5248] border border-[#467366]/30'
                          : plan.id === 'free'
                          ? 'bg-slate-200/70 text-slate-700 border border-slate-300/70'
                          : 'bg-[#4A607A]/12 text-[#3B4F66] border border-[#4A607A]/25'
                      )}
                    >
                      {isRec && <Sparkles className="h-3 w-3 mr-1 inline" />}
                      {plan.badge_text}
                    </Badge>
                    {isCurrent && (
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px]',
                          isObsidian
                            ? 'border-[#4FA88B]/40 text-[#4FA88B] bg-[#4FA88B]/10'
                            : 'border-[#467366]/35 text-[#34594E] bg-[#467366]/10'
                        )}
                      >
                        Plan Actual
                      </Badge>
                    )}
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <h3 className={cn('text-xl font-semibold tracking-tight', isObsidian ? 'text-[#EEF1F6]' : 'text-foreground')}>
                      {plan.name}
                    </h3>
                    <p className={cn('text-xs mt-1 leading-relaxed', isObsidian ? 'text-[#96A1B5]' : 'text-muted-foreground')}>
                      {plan.tagline}
                    </p>
                  </div>

                  <div className={cn('pt-2 pb-3 border-b', isObsidian ? 'border-white/10' : 'border-slate-200/80')}>
                    <div className="flex items-baseline gap-1.5">
                      <span
                        className={cn(
                          'text-3xl font-semibold tabular-nums tracking-tight',
                          isObsidian
                            ? isRec
                              ? 'text-[#EDE0C8]'
                              : 'text-[#EEF1F6]'
                            : isRec
                            ? 'text-[#3B4F66]'
                            : 'text-foreground'
                        )}
                      >
                        {plan.price_clp === 0 ? '$0' : formatCLP(plan.price_clp)}
                      </span>
                      <span className={cn('text-xs font-medium', isObsidian ? 'text-[#96A1B5]' : 'text-muted-foreground')}>
                        {plan.price_clp === 0 ? '/ mes' : '/ mes · IVA incl.'}
                      </span>
                    </div>
                    <p className={cn('text-[11px] mt-2 leading-relaxed', isObsidian ? 'text-[#96A1B5]' : 'text-muted-foreground')}>
                      {plan.description}
                    </p>
                  </div>

                  <ul className="space-y-2 pt-1 text-xs">
                    {(plan.features || []).map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className={cn('h-4 w-4 shrink-0 mt-0.5', isObsidian ? 'text-[#4FA88B]' : 'text-[#467366]')} />
                        <span className={isObsidian ? 'text-[#EEF1F6]/88' : 'text-foreground/85'}>{feat}</span>
                      </li>
                    ))}
                    {industry?.planSpecialtyFeatures?.[plan.id]?.map((specFeat, sIdx) => (
                      <li
                        key={`spec-${sIdx}`}
                        className={cn(
                          'flex items-start gap-2 rounded-lg border px-2 py-1.5',
                          isObsidian
                            ? 'bg-[#D8C39E]/[0.08] border-[#D8C39E]/25'
                            : 'bg-[#1261E0]/[0.06] border-[#1261E0]/15'
                        )}
                      >
                        <Sparkles className={cn('h-3.5 w-3.5 shrink-0 mt-0.5', isObsidian ? 'text-[#D8C39E]' : 'text-[#1261E0]')} />
                        <span className={cn('font-medium leading-snug', isObsidian ? 'text-[#EDE0C8]' : 'text-[#0F4FB8]')}>
                          <span className="text-[10px] uppercase tracking-wider font-bold block">
                            Para {industry.shortName}:
                          </span>
                          {specFeat}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {(PLAN_MISSING_HIGHLIGHTS[plan.id] || []).length > 0 && (
                    <div className={cn('pt-2 border-t space-y-1.5', isObsidian ? 'border-white/10' : 'border-slate-200/70')}>
                      <span className={cn('text-[10px] uppercase tracking-wider font-semibold block', isObsidian ? 'text-[#96A1B5]' : 'text-muted-foreground')}>
                        Qué le falta en este nivel
                      </span>
                      <ul className={cn('space-y-1 text-[11px]', isObsidian ? 'text-[#96A1B5]' : 'text-muted-foreground')}>
                        {PLAN_MISSING_HIGHLIGHTS[plan.id].map((missing, mIdx) => (
                          <li key={mIdx} className="flex items-start gap-1.5">
                            <Lock className={cn('h-3 w-3 shrink-0 mt-0.5', isObsidian ? 'text-[#646F84]' : 'text-slate-400')} />
                            <span>{missing}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {PLAN_ROI_NUDGE[plan.id] && (
                    <div
                      className={cn(
                        'p-2.5 rounded-xl border text-[11px] leading-snug',
                        isObsidian
                          ? 'bg-white/[0.04] border-white/10 text-[#96A1B5]'
                          : 'bg-slate-100/75 border-slate-200/80 text-slate-700'
                      )}
                    >
                      {PLAN_ROI_NUDGE[plan.id]}
                    </div>
                  )}
                </div>
              </div>

              <div
                className={cn('pt-5 mt-6 border-t space-y-2', isObsidian ? 'border-white/10' : 'border-slate-200/80')}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => setDetailPlan(plan)}
                  className={cn(
                    'w-full flex items-center justify-center gap-1.5 text-[11px] font-medium py-1.5 rounded-lg transition-colors',
                    isObsidian
                      ? 'text-[#D8C39E] hover:bg-white/6'
                      : 'text-[#4A607A] hover:bg-[#4A607A]/10'
                  )}
                >
                  <Eye className="h-3.5 w-3.5" />
                  Ver detalle completo y qué incluye
                </button>

                <Button
                  type="button"
                  disabled={Boolean(loadingTier) || (!isOnboarding && isCurrent && plan.id === 'free')}
                  onClick={() => onSelectCheckout(plan.id, [])}
                  variant={plan.id === 'free' ? 'outline' : 'default'}
                  className={cn(
                    'w-full tactile-press font-semibold gap-2',
                    isObsidian
                      ? isRec
                        ? 'bg-[#D8C39E] hover:bg-[#EDE0C8] text-[#06070A] shadow-[0_10px_28px_-10px_rgba(216,195,158,0.5)]'
                        : plan.id === 'free'
                        ? 'border-white/15 bg-white/5 text-[#EEF1F6] hover:bg-white/10 hover:text-white'
                        : 'bg-white/12 hover:bg-white/20 text-[#EEF1F6] border border-white/15 shadow-none'
                      : isRec && 'bg-[#467366] hover:bg-[#3A6155] text-white'
                  )}
                >
                  {isBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : plan.price_clp === 0 ? (
                    <ArrowRight className="h-4 w-4" />
                  ) : (
                    <CreditCard className="h-4 w-4" />
                  )}
                  {isOnboarding && plan.price_clp === 0
                    ? 'Comenzar con Plan Gratis'
                    : isCurrent
                    ? plan.price_clp === 0
                      ? 'Plan Activo'
                      : 'Renovar con Khipu'
                    : plan.price_clp === 0
                    ? 'Comenzar Gratis'
                    : 'Suscribir con Khipu'}
                </Button>

                {!khipuReady && isSuperAdmin && plan.price_clp > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={Boolean(loadingTier)}
                    onClick={() => onSelectCheckout(plan.id, [], true)}
                    className={cn(
                      'w-full text-[11px] h-7',
                      isObsidian
                        ? 'text-[#D8C39E] hover:bg-white/6'
                        : 'text-[#4A607A] hover:bg-[#4A607A]/10'
                    )}
                  >
                    Simular Activación (SuperAdmin)
                  </Button>
                )}
              </div>
            </div>
          );
        })}
          </div>
        </div>
      </div>

      {/* Configurador Modular "Paga lo que usas" */}
      <div
        className={cn(
          'rounded-3xl p-6 sm:p-8 space-y-6',
          isObsidian ? 'obsidian-glass text-[#EEF1F6]' : 'glass-card text-foreground'
        )}
      >
        <div
          className={cn(
            'flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b pb-6',
            isObsidian ? 'border-white/10' : 'border-slate-200/80'
          )}
        >
          <div className="space-y-1.5">
            <div
              className={cn(
                'inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-semibold tracking-[0.12em] uppercase',
                isObsidian
                  ? 'bg-[#D8C39E]/10 text-[#EDE0C8] border-[#D8C39E]/25'
                  : 'bg-[#4A607A]/12 text-[#3B4F66] border-[#4A607A]/25'
              )}
            >
              <Sliders className={cn('h-3.5 w-3.5', isObsidian ? 'text-[#D8C39E]' : 'text-[#4A607A]')} />
              Modalidad Flexible · Paga lo que usas
            </div>
            <h3 className="text-2xl font-semibold tracking-tight">
              Arma tu propio ERP{' '}
              <span className={cn('editorial-italic', isObsidian ? 'text-[#D8C39E]' : 'text-[#4A607A]')}>
                a medida
              </span>
            </h3>
            <p className={cn('text-sm max-w-2xl', isObsidian ? 'text-[#96A1B5]' : 'text-muted-foreground')}>
              Parte con la <strong className={isObsidian ? 'text-[#EEF1F6]' : ''}>{baseAddon?.name || 'Plataforma Activa Base'}</strong> (
              <span className={cn('font-semibold tabular-nums', isObsidian ? 'text-[#EDE0C8]' : 'text-foreground')}>
                {formatCLP(baseAddon?.price_clp ?? 19990)}
              </span>
              /mes) y enciende exclusivamente los módulos que tu operación necesita hoy. Si armas un paquete grande, te avisamos cuando te conviene más un plan cerrado.
            </p>
          </div>

          <div
            className={cn(
              'rounded-2xl p-5 min-w-[280px] max-w-sm space-y-3',
              isObsidian ? 'obsidian-glass-luxury' : 'glass-luxury'
            )}
          >
            <div className={cn('flex items-center justify-between text-xs', isObsidian ? 'text-[#96A1B5]' : 'text-muted-foreground')}>
              <span>Tu inversión mensual</span>
              <span className="tabular-nums font-medium">{selectedModules.length} módulos</span>
            </div>
            <div className={cn('text-3xl font-semibold tabular-nums', isObsidian ? 'text-[#EDE0C8]' : 'text-[#3B4F66]')}>
              <AnimatedNumber value={customTotalClp} format="clp" duration={360} />
              <span className={cn('text-xs font-normal ml-1.5', isObsidian ? 'text-[#96A1B5]' : 'text-muted-foreground')}>
                / mes
              </span>
            </div>

            {customExceedsScale && scalePlan && (
              <div
                className={cn(
                  'p-3 rounded-xl border text-[11px] leading-snug space-y-1',
                  isObsidian
                    ? 'bg-[#4FA88B]/12 border-[#4FA88B]/30 text-[#A9E0CD]'
                    : 'bg-[#467366]/12 border-[#467366]/30 text-[#2E5248]'
                )}
              >
                <div>
                  <Zap className="h-3.5 w-3.5 inline mr-1 text-[#4FA88B]" />
                  <strong>¡Te conviene Enterprise!</strong> Por{' '}
                  <strong>{formatCLP(scalePlan.price_clp)}/mes</strong> tienes TODO incluido, usuarios ilimitados y {scalePlan.ai_calls_limit} IA/mes. Ahorras{' '}
                  <strong>{formatCLP(customTotalClp - scalePlan.price_clp)}/mes</strong>.
                </div>
                <button
                  type="button"
                  onClick={() => setDetailPlan(scalePlan)}
                  className="underline font-semibold"
                >
                  Comparar con {scalePlan.name} →
                </button>
              </div>
            )}

            {customExceedsRecommended && recommendedPlan && (
              <div
                className={cn(
                  'p-3 rounded-xl border text-[11px] leading-snug space-y-1',
                  isObsidian
                    ? 'bg-[#D8C39E]/12 border-[#D8C39E]/30 text-[#EDE0C8]'
                    : 'bg-[#4A607A]/12 border-[#4A607A]/25 text-[#3B4F66]'
                )}
              >
                <div>
                  <Zap className="h-3.5 w-3.5 inline mr-1" />
                  Por <strong>{formatCLP(recommendedPlan.price_clp)}/mes</strong> obtienes{' '}
                  <strong>{recommendedPlan.name}</strong> con casi todo incluido y ahorras{' '}
                  <strong>{formatCLP(Math.max(0, customTotalClp - recommendedPlan.price_clp))}/mes</strong>.
                </div>
                <button
                  type="button"
                  onClick={() => setDetailPlan(recommendedPlan)}
                  className="underline font-semibold"
                >
                  Ver qué incluye {recommendedPlan.name} →
                </button>
              </div>
            )}

            <Button
              type="button"
              disabled={Boolean(loadingTier)}
              onClick={() => onSelectCheckout('custom', selectedModules)}
              className={cn(
                'w-full font-semibold gap-2 tactile-press',
                isObsidian && 'bg-[#D8C39E] text-[#06070A] hover:bg-[#EDE0C8]'
              )}
            >
              {loadingTier === 'custom' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CreditCard className="h-4 w-4" />
              )}
              Contratar a Medida con Khipu
            </Button>

            {!khipuReady && isSuperAdmin && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={Boolean(loadingTier)}
                onClick={() => onSelectCheckout('custom', selectedModules, true)}
                className={cn(
                  'w-full text-[11px] h-7',
                  isObsidian ? 'text-[#D8C39E] hover:bg-white/6' : 'text-[#4A607A] hover:bg-[#4A607A]/10'
                )}
              >
                Simular Custom (SuperAdmin)
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {selectableAddons.map((addon) => {
            const modId = addon.id as ModuleKey;
            const active = selectedModules.includes(modId);

            return (
              <button
                key={addon.id}
                type="button"
                aria-pressed={active}
                onClick={() => toggleModule(modId)}
                className={cn(
                  'text-left rounded-2xl p-4 border transition-all duration-200 tactile-press flex flex-col justify-between gap-3 backdrop-blur-md',
                  isObsidian
                    ? active
                      ? 'bg-[#D8C39E]/[0.11] text-[#EEF1F6] border-[#D8C39E]/45 shadow-sm'
                      : 'bg-white/[0.03] hover:bg-white/[0.06] text-[#EEF1F6] border-white/10 hover:border-white/20'
                    : active
                    ? 'bg-white/95 text-foreground border-[#4A607A]/50 shadow-sm ring-1 ring-[#4A607A]/20'
                    : 'bg-white/55 hover:bg-white/80 text-foreground border-slate-200/80 hover:border-slate-300'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Layers
                        className={cn(
                          'h-4 w-4 shrink-0',
                          isObsidian
                            ? active
                              ? 'text-[#D8C39E]'
                              : 'text-[#96A1B5]'
                            : active
                            ? 'text-[#4A607A]'
                            : 'text-muted-foreground'
                        )}
                      />
                      <span className="font-semibold text-sm leading-tight">{addon.name}</span>
                    </div>
                    <p className={cn('text-xs leading-relaxed', isObsidian ? 'text-[#96A1B5]' : 'text-muted-foreground')}>
                      {addon.description}
                    </p>
                  </div>
                  <div
                    className={cn(
                      'h-5 w-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5',
                      isObsidian
                        ? active
                          ? 'bg-[#D8C39E] border-[#D8C39E] text-[#06070A]'
                          : 'border-white/20 bg-white/5'
                        : active
                        ? 'bg-[#467366] border-[#467366] text-white'
                        : 'border-slate-300 bg-white/80'
                    )}
                  >
                    {active && <Check className="h-3.5 w-3.5 stroke-[2.5]" />}
                  </div>
                </div>

                <div
                  className={cn(
                    'flex items-center justify-between pt-2 border-t text-xs',
                    isObsidian ? 'border-white/10' : 'border-slate-200/70'
                  )}
                >
                  <span className={isObsidian ? 'text-[#96A1B5]' : 'text-muted-foreground'}>
                    Cargo mensual adicional
                  </span>
                  <span
                    className={cn(
                      'font-semibold tabular-nums',
                      isObsidian
                        ? active
                          ? 'text-[#EDE0C8]'
                          : 'text-[#EEF1F6]'
                        : active
                        ? 'text-[#4A607A]'
                        : 'text-foreground'
                    )}
                  >
                    +{formatCLP(addon.price_clp)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div className={cn('flex flex-wrap items-center justify-between gap-3 pt-2 text-xs', isObsidian ? 'text-[#96A1B5]' : 'text-muted-foreground')}>
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className={cn('h-4 w-4', isObsidian ? 'text-[#4FA88B]' : 'text-[#467366]')} />
            Pagos procesados mediante transferencia bancaria certificada por <strong className={isObsidian ? 'text-[#EEF1F6]' : ''}>Khipu</strong>.
          </span>
          <span>
            Si decides pausar tu pago, tus datos históricos nunca se eliminan (solo se restringen módulos premium).
          </span>
        </div>
      </div>

      {/* Modal de Detalle Extendido por Plan */}
      <PlanDetailModal
        plan={detailPlan}
        industry={industry}
        industryName={industryName}
        isCurrent={Boolean(detailPlan && currentTier === detailPlan.id)}
        loadingTier={loadingTier}
        surface={surface}
        onClose={() => setDetailPlan(null)}
        onSelectPlan={(tier) => {
          setDetailPlan(null);
          onSelectCheckout(tier, []);
        }}
        onSwitchToRecommended={
          recommendedPlan
            ? () => setDetailPlan(recommendedPlan)
            : undefined
        }
      />
    </div>
  );
}
