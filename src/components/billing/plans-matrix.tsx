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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  khipuReady = false,
  isSuperAdmin = false,
  isOnboarding = false,
  onSelectCheckout,
  loadingTier = null,
}: PlansMatrixProps) {
  const [selectedModules, setSelectedModules] = useState<ModuleKey[]>(currentModules);

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

  const customExceedsRecommended =
    recommendedPlan && customTotalClp >= recommendedPlan.price_clp;

  const toggleModule = (modId: ModuleKey) => {
    setSelectedModules((prev) =>
      prev.includes(modId) ? prev.filter((m) => m !== modId) : [...prev, modId]
    );
  };

  return (
    <div className="space-y-10">
      {/* Grid de 4 Planes (Gratis + 3 Suscripciones Mensuales) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 items-stretch">
        {plans.map((plan) => {
          const isCurrent = currentTier === plan.id;
          const isRec = Boolean(plan.is_recommended);
          const isBusy = loadingTier === plan.id;

          return (
            <div
              key={plan.id}
              className={cn(
                'relative rounded-3xl p-6 flex flex-col justify-between transition-all duration-300',
                isRec
                  ? 'glass-luxury hairline-shimmer text-[#F7F5F0] ring-1 ring-[#9A7B4F]/50 xl:-translate-y-1.5'
                  : 'glass-card text-foreground hover:-translate-y-0.5'
              )}
            >
              {plan.badge_text && (
                <div className="flex items-center justify-between gap-2 mb-4">
                  <Badge
                    className={cn(
                      'font-mono text-[10px] font-medium tracking-[0.14em] uppercase px-2.5 py-0.5',
                      isRec
                        ? 'bg-[#C9AD82] text-[#171715] border-0'
                        : plan.id === 'free'
                        ? 'bg-secondary text-muted-foreground border border-border/80'
                        : 'bg-[#171715] text-[#F7F5F0] border-0'
                    )}
                  >
                    {isRec && <Sparkles className="h-3 w-3 mr-1 inline" />}
                    {plan.badge_text}
                  </Badge>
                  {isCurrent && (
                    <Badge
                      variant="outline"
                      className={cn(
                        'font-mono text-[10px]',
                        isRec
                          ? 'border-[#356854]/60 text-[#9FD3BC] bg-[#356854]/20'
                          : 'border-[#356854]/40 text-[#356854] bg-[#356854]/10'
                      )}
                    >
                      Plan Actual
                    </Badge>
                  )}
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <h3
                    className={cn(
                      'text-xl font-semibold tracking-tight',
                      isRec ? 'text-[#F7F5F0]' : 'text-foreground'
                    )}
                  >
                    {plan.name}
                  </h3>
                  <p
                    className={cn(
                      'text-xs mt-1 leading-relaxed',
                      isRec ? 'text-stone-300' : 'text-muted-foreground'
                    )}
                  >
                    {plan.tagline}
                  </p>
                </div>

                <div className="pt-2 pb-3 border-b border-current/10">
                  <div className="flex items-baseline gap-1.5">
                    <span
                      className={cn(
                        'text-3xl font-semibold font-mono tabular-nums tracking-tight',
                        isRec ? 'text-[#D7BE96]' : 'text-foreground'
                      )}
                    >
                      {plan.price_clp === 0 ? '$0' : formatCLP(plan.price_clp)}
                    </span>
                    <span
                      className={cn(
                        'text-xs font-medium',
                        isRec ? 'text-stone-400' : 'text-muted-foreground'
                      )}
                    >
                      / mes + IVA
                    </span>
                  </div>
                  <p
                    className={cn(
                      'text-[11px] mt-2 leading-relaxed',
                      isRec ? 'text-stone-300' : 'text-muted-foreground'
                    )}
                  >
                    {plan.description}
                  </p>
                </div>

                <ul className="space-y-2.5 pt-1 text-xs">
                  {(plan.features || []).map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check
                        className={cn(
                          'h-4 w-4 shrink-0 mt-0.5',
                          isRec ? 'text-[#C9AD82]' : 'text-[#356854]'
                        )}
                      />
                      <span className={isRec ? 'text-stone-200' : 'text-foreground/85'}>
                        {feat}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-6 mt-6 border-t border-current/10 space-y-2">
                <Button
                  type="button"
                  disabled={Boolean(loadingTier) || (!isOnboarding && isCurrent && plan.id === 'free')}
                  onClick={() => onSelectCheckout(plan.id, [])}
                  className={cn(
                    'w-full tactile-press font-medium gap-2',
                    isRec
                      ? 'bg-[#C9AD82] hover:bg-[#D7BE96] text-[#171715]'
                      : plan.id === 'free'
                      ? 'bg-secondary hover:bg-secondary/80 text-foreground border border-border/80'
                      : 'bg-[#171715] hover:bg-[#2A2A27] text-[#F7F5F0]'
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
                      isRec
                        ? 'text-amber-200 hover:bg-white/10'
                        : 'text-indigo-700 hover:bg-indigo-50'
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

      {/* Configurador Modular "Paga lo que usas" */}
      <div className="rounded-3xl border border-border/80 glass-card p-6 sm:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border/75 pb-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#171715] text-[#F7F5F0] font-mono text-[10px] tracking-[0.14em] uppercase">
              <Sliders className="h-3.5 w-3.5 text-[#C9AD82]" />
              Modalidad Flexible · Paga lo que usas
            </div>
            <h3 className="text-2xl font-semibold tracking-tight text-foreground">
              Arma tu propio ERP <span className="editorial-italic text-[#9A7B4F]">a medida</span>
            </h3>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Parte con la <strong>{baseAddon?.name || 'Plataforma Activa Base'}</strong> (
              <span className="font-mono font-semibold text-foreground">
                {formatCLP(baseAddon?.price_clp ?? 29990)}
              </span>
              /mes) y enciende exclusivamente los módulos que tu operación necesita hoy.
            </p>
          </div>

          <div className="rounded-2xl glass-luxury text-[#F7F5F0] p-5 min-w-[260px] space-y-3">
            <div className="flex items-center justify-between text-xs text-stone-400">
              <span>Tu inversión mensual</span>
              <span className="font-mono">{selectedModules.length} módulos</span>
            </div>
            <div className="text-3xl font-semibold font-mono tabular-nums text-[#D7BE96]">
              {formatCLP(customTotalClp)}
              <span className="text-xs font-sans font-normal text-stone-400 ml-1.5">/ mes</span>
            </div>

            {customExceedsRecommended && recommendedPlan && (
              <div className="p-2.5 rounded-xl bg-[#9A7B4F]/18 border border-[#9A7B4F]/35 text-[11px] text-[#E9D7BA] leading-snug">
                <Zap className="h-3.5 w-3.5 inline mr-1 text-[#D7BE96]" />
                Por{' '}
                <strong>{formatCLP(recommendedPlan.price_clp)}/mes</strong> obtienes{' '}
                <strong>{recommendedPlan.name}</strong> con casi todo incluido y ahorras{' '}
                {formatCLP(Math.max(0, customTotalClp - recommendedPlan.price_clp))}.
              </div>
            )}

            <Button
              type="button"
              disabled={Boolean(loadingTier)}
              onClick={() => onSelectCheckout('custom', selectedModules)}
              className="w-full bg-[#C9AD82] hover:bg-[#D7BE96] text-[#171715] font-semibold gap-2 tactile-press"
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
                className="w-full text-[11px] h-7 text-[#D7BE96] hover:bg-white/10"
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
                onClick={() => toggleModule(modId)}
                className={cn(
                  'text-left rounded-2xl p-4 border transition-all duration-200 tactile-press flex flex-col justify-between gap-3',
                  active
                    ? 'bg-[#171715] text-[#F7F5F0] border-[#9A7B4F]/45 shadow-md'
                    : 'bg-card/85 hover:bg-card text-foreground border-border/80 hover:border-[#9A7B4F]/35'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Layers
                        className={cn(
                          'h-4 w-4 shrink-0',
                          active ? 'text-[#C9AD82]' : 'text-muted-foreground'
                        )}
                      />
                      <span className="font-semibold text-sm leading-tight">{addon.name}</span>
                    </div>
                    <p
                      className={cn(
                        'text-xs leading-relaxed',
                        active ? 'text-stone-300' : 'text-muted-foreground'
                      )}
                    >
                      {addon.description}
                    </p>
                  </div>
                  <div
                    className={cn(
                      'h-5 w-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5',
                      active
                        ? 'bg-[#C9AD82] border-[#C9AD82] text-[#171715]'
                        : 'border-border bg-background'
                    )}
                  >
                    {active && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-current/10 text-xs">
                  <span className={active ? 'text-stone-400' : 'text-muted-foreground'}>
                    Cargo mensual adicional
                  </span>
                  <span
                    className={cn(
                      'font-mono font-semibold tabular-nums',
                      active ? 'text-[#D7BE96]' : 'text-foreground'
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
            <ShieldCheck className="h-4 w-4 text-[#356854]" />
            Pagos procesados mediante transferencia bancaria certificada por <strong>Khipu</strong>.
          </span>
          <span>
            Si decides pausar tu pago, tus datos históricos nunca se eliminan (solo se restringen módulos premium).
          </span>
        </div>
      </div>
    </div>
  );
}
