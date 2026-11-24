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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AnimatedNumber } from '@/components/ui/motion-primitives';
import { PlanDetailModal } from './plan-detail-modal';
import { cn, formatCLP } from '@/lib/utils';
import { calculateCustomPriceClp } from '@/lib/entitlements';
import type {
  ModuleKey,
  SubscriptionAddon,
  SubscriptionPlan,
  SubscriptionTier,
} from '@/types/database';

interface PlansMatrixProps {
  plans: SubscriptionPlan[];
  addons: SubscriptionAddon[];
  currentTier?: SubscriptionTier;
  currentModules?: ModuleKey[];
  industryName?: string;
  khipuReady?: boolean;
  isSuperAdmin?: boolean;
  isOnboarding?: boolean;
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
  industryName,
  khipuReady = false,
  isSuperAdmin = false,
  isOnboarding = false,
  onSelectCheckout,
  loadingTier = null,
}: PlansMatrixProps) {
  const [selectedModules, setSelectedModules] = useState<ModuleKey[]>(currentModules);
  const [detailPlan, setDetailPlan] = useState<SubscriptionPlan | null>(null);

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
      {/* Grid de 4 Planes (Gratis + 3 Suscripciones Mensuales) - 100% Glassmorfismo Luminoso */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 items-stretch">
        {plans.map((plan) => {
          const isCurrent = currentTier === plan.id;
          const isRec = Boolean(plan.is_recommended);
          const isBusy = loadingTier === plan.id;

          return (
            <div
              key={plan.id}
              onClick={() => setDetailPlan(plan)}
              className={cn(
                'group relative rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 cursor-pointer text-left text-foreground',
                isRec
                  ? 'glass-luxury hairline-shimmer ring-1 ring-[#4A607A]/35 xl:-translate-y-1.5'
                  : 'glass-card spotlight-card hover:-translate-y-1'
              )}
            >
              <div>
                {plan.badge_text && (
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <Badge
                      className={cn(
                        'text-[10px] font-semibold tracking-[0.12em] uppercase px-2.5 py-0.5',
                        isRec
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
                        className="text-[10px] border-[#467366]/35 text-[#34594E] bg-[#467366]/10"
                      >
                        Plan Actual
                      </Badge>
                    )}
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <h3 className="text-xl font-semibold tracking-tight text-foreground">
                      {plan.name}
                    </h3>
                    <p className="text-xs mt-1 leading-relaxed text-muted-foreground">
                      {plan.tagline}
                    </p>
                  </div>

                  <div className="pt-2 pb-3 border-b border-slate-200/80">
                    <div className="flex items-baseline gap-1.5">
                      <span
                        className={cn(
                          'text-3xl font-semibold tabular-nums tracking-tight',
                          isRec ? 'text-[#3B4F66]' : 'text-foreground'
                        )}
                      >
                        {plan.price_clp === 0 ? '$0' : formatCLP(plan.price_clp)}
                      </span>
                      <span className="text-xs font-medium text-muted-foreground">
                        / mes + IVA
                      </span>
                    </div>
                    <p className="text-[11px] mt-2 leading-relaxed text-muted-foreground">
                      {plan.description}
                    </p>
                  </div>

                  <ul className="space-y-2.5 pt-1 text-xs">
                    {(plan.features || []).map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="h-4 w-4 shrink-0 mt-0.5 text-[#467366]" />
                        <span className="text-foreground/85">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div
                className="pt-5 mt-6 border-t border-slate-200/80 space-y-2"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => setDetailPlan(plan)}
                  className="w-full flex items-center justify-center gap-1.5 text-[11px] font-medium py-1.5 rounded-lg transition-colors text-[#4A607A] hover:bg-[#4A607A]/10"
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
                    isRec && 'bg-[#467366] hover:bg-[#3A6155] text-white'
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
                    className="w-full text-[11px] h-7 text-[#4A607A] hover:bg-[#4A607A]/10"
                  >
                    Simular Activación (SuperAdmin)
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Configurador Modular "Paga lo que usas" - Glassmorfismo Luminoso */}
      <div className="rounded-3xl glass-card p-6 sm:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#4A607A]/12 text-[#3B4F66] border border-[#4A607A]/25 text-[10px] font-semibold tracking-[0.12em] uppercase">
              <Sliders className="h-3.5 w-3.5 text-[#4A607A]" />
              Modalidad Flexible · Paga lo que usas
            </div>
            <h3 className="text-2xl font-semibold tracking-tight text-foreground">
              Arma tu propio ERP <span className="editorial-italic text-[#4A607A]">a medida</span>
            </h3>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Parte con la <strong>{baseAddon?.name || 'Plataforma Activa Base'}</strong> (
              <span className="font-semibold text-foreground tabular-nums">
                {formatCLP(baseAddon?.price_clp ?? 19990)}
              </span>
              /mes) y enciende exclusivamente los módulos que tu operación necesita hoy. Si armas un paquete grande, te avisamos cuando te conviene más un plan cerrado.
            </p>
          </div>

          <div className="rounded-2xl glass-luxury p-5 min-w-[280px] max-w-sm space-y-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Tu inversión mensual</span>
              <span className="tabular-nums font-medium">{selectedModules.length} módulos</span>
            </div>
            <div className="text-3xl font-semibold tabular-nums text-[#3B4F66]">
              <AnimatedNumber value={customTotalClp} format="clp" duration={360} />
              <span className="text-xs font-normal text-muted-foreground ml-1.5">/ mes</span>
            </div>

            {customExceedsScale && scalePlan && (
              <div className="p-3 rounded-xl bg-[#467366]/12 border border-[#467366]/30 text-[11px] text-[#2E5248] leading-snug space-y-1">
                <div>
                  <Zap className="h-3.5 w-3.5 inline mr-1 text-[#467366]" />
                  <strong>¡Te conviene Enterprise!</strong> Por{' '}
                  <strong>{formatCLP(scalePlan.price_clp)}/mes</strong> tienes TODO incluido, usuarios ilimitados y 600 IA/mes. Ahorras{' '}
                  <strong>{formatCLP(customTotalClp - scalePlan.price_clp)}/mes</strong>.
                </div>
                <button
                  type="button"
                  onClick={() => setDetailPlan(scalePlan)}
                  className="underline font-semibold text-[#2E5248] hover:text-[#1F3A32]"
                >
                  Comparar con {scalePlan.name} →
                </button>
              </div>
            )}

            {customExceedsRecommended && recommendedPlan && (
              <div className="p-3 rounded-xl bg-[#4A607A]/12 border border-[#4A607A]/25 text-[11px] text-[#3B4F66] leading-snug space-y-1">
                <div>
                  <Zap className="h-3.5 w-3.5 inline mr-1 text-[#4A607A]" />
                  Por <strong>{formatCLP(recommendedPlan.price_clp)}/mes</strong> obtienes{' '}
                  <strong>{recommendedPlan.name}</strong> con casi todo incluido y ahorras{' '}
                  <strong>{formatCLP(Math.max(0, customTotalClp - recommendedPlan.price_clp))}/mes</strong>.
                </div>
                <button
                  type="button"
                  onClick={() => setDetailPlan(recommendedPlan)}
                  className="underline font-semibold text-[#3B4F66] hover:text-foreground"
                >
                  Ver qué incluye {recommendedPlan.name} →
                </button>
              </div>
            )}

            <Button
              type="button"
              disabled={Boolean(loadingTier)}
              onClick={() => onSelectCheckout('custom', selectedModules)}
              className="w-full font-semibold gap-2 tactile-press"
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
                className="w-full text-[11px] h-7 text-[#4A607A] hover:bg-[#4A607A]/10"
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
                  active
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
                          active ? 'text-[#4A607A]' : 'text-muted-foreground'
                        )}
                      />
                      <span className="font-semibold text-sm leading-tight">{addon.name}</span>
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {addon.description}
                    </p>
                  </div>
                  <div
                    className={cn(
                      'h-5 w-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5',
                      active
                        ? 'bg-[#467366] border-[#467366] text-white'
                        : 'border-slate-300 bg-white/80'
                    )}
                  >
                    {active && <Check className="h-3.5 w-3.5 stroke-[2.5]" />}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200/70 text-xs">
                  <span className="text-muted-foreground">
                    Cargo mensual adicional
                  </span>
                  <span
                    className={cn(
                      'font-semibold tabular-nums',
                      active ? 'text-[#4A607A]' : 'text-foreground'
                    )}
                  >
                    +{formatCLP(addon.price_clp)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-[#467366]" />
            Pagos procesados mediante transferencia bancaria certificada por <strong>Khipu</strong>.
          </span>
          <span>
            Si decides pausar tu pago, tus datos históricos nunca se eliminan (solo se restringen módulos premium).
          </span>
        </div>
      </div>

      {/* Modal de Detalle Extendido por Plan */}
      <PlanDetailModal
        plan={detailPlan}
        industryName={industryName}
        isCurrent={Boolean(detailPlan && currentTier === detailPlan.id)}
        loadingTier={loadingTier}
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
