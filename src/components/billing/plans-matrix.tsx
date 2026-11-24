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
                'relative rounded-2xl p-6 flex flex-col justify-between transition-all duration-300',
                isRec
                  ? 'glass-luxury text-white ring-2 ring-amber-400/70 shadow-2xl xl:-translate-y-1.5'
                  : 'glass-card text-slate-900 hover:-translate-y-0.5'
              )}
            >
              {plan.badge_text && (
                <div className="flex items-center justify-between gap-2 mb-4">
                  <Badge
                    className={cn(
                      'border-0 text-[11px] font-bold tracking-wide uppercase px-2.5 py-0.5',
                      isRec
                        ? 'bg-amber-400 text-slate-950'
                        : plan.id === 'free'
                        ? 'bg-slate-200 text-slate-800'
                        : 'bg-slate-900 text-white'
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
                        isRec
                          ? 'border-emerald-400/50 text-emerald-300 bg-emerald-500/10'
                          : 'border-emerald-300 text-emerald-700 bg-emerald-50'
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
                      'text-xl font-bold tracking-tight',
                      isRec ? 'text-white' : 'text-slate-900'
                    )}
                  >
                    {plan.name}
                  </h3>
                  <p
                    className={cn(
                      'text-xs mt-1 leading-relaxed',
                      isRec ? 'text-slate-300' : 'text-slate-600'
                    )}
                  >
                    {plan.tagline}
                  </p>
                </div>

                <div className="pt-2 pb-3 border-b border-current/10">
                  <div className="flex items-baseline gap-1.5">
                    <span
                      className={cn(
                        'text-3xl font-extrabold font-mono tabular-nums tracking-tight',
                        isRec ? 'text-amber-300' : 'text-slate-950'
                      )}
                    >
                      {plan.price_clp === 0 ? '$0' : formatCLP(plan.price_clp)}
                    </span>
                    <span
                      className={cn(
                        'text-xs font-medium',
                        isRec ? 'text-slate-400' : 'text-slate-500'
                      )}
                    >
                      / mes + IVA
                    </span>
                  </div>
                  <p
                    className={cn(
                      'text-[11px] mt-2 leading-relaxed',
                      isRec ? 'text-slate-300' : 'text-slate-500'
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
                          isRec ? 'text-amber-400' : 'text-emerald-600'
                        )}
                      />
                      <span className={isRec ? 'text-slate-200' : 'text-slate-700'}>
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
                    'w-full tactile-press font-semibold gap-2',
                    isRec
                      ? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                      : plan.id === 'free'
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-300'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
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
      <div className="rounded-3xl border border-slate-200/90 glass-card p-6 sm:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 text-white text-[11px] font-semibold">
              <Sliders className="h-3.5 w-3.5 text-amber-400" />
              MODALIDAD FLEXIBLE · PAGA LO QUE USAS
            </div>
            <h3 className="text-2xl font-bold tracking-tight text-slate-950">
              Arma tu propio ERP a medida
            </h3>
            <p className="text-sm text-slate-600 max-w-2xl">
              Parte con la <strong>{baseAddon?.name || 'Plataforma Activa Base'}</strong> (
              <span className="font-mono font-semibold text-slate-900">
                {formatCLP(baseAddon?.price_clp ?? 11990)}
              </span>
              /mes) y enciende exclusivamente los módulos que tu operación necesita hoy.
            </p>
          </div>

          <div className="rounded-2xl bg-slate-950 text-white p-5 min-w-[260px] space-y-3 shadow-lg">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Tu inversión mensual</span>
              <span className="font-mono">{selectedModules.length} módulos</span>
            </div>
            <div className="text-3xl font-extrabold font-mono tabular-nums text-amber-300">
              {formatCLP(customTotalClp)}
              <span className="text-xs font-sans font-normal text-slate-400 ml-1.5">/ mes</span>
            </div>

            {customExceedsRecommended && recommendedPlan && (
              <div className="p-2.5 rounded-xl bg-amber-400/15 border border-amber-400/30 text-[11px] text-amber-200 leading-snug">
                <Zap className="h-3.5 w-3.5 inline mr-1 text-amber-300" />
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
              className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold gap-2 tactile-press"
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
                className="w-full text-[11px] h-7 text-amber-200 hover:bg-white/10"
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
                    ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                    : 'bg-white/80 hover:bg-white text-slate-900 border-slate-200 hover:border-slate-300'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Layers
                        className={cn(
                          'h-4 w-4 shrink-0',
                          active ? 'text-amber-400' : 'text-slate-500'
                        )}
                      />
                      <span className="font-semibold text-sm leading-tight">{addon.name}</span>
                    </div>
                    <p
                      className={cn(
                        'text-xs leading-relaxed',
                        active ? 'text-slate-300' : 'text-slate-600'
                      )}
                    >
                      {addon.description}
                    </p>
                  </div>
                  <div
                    className={cn(
                      'h-5 w-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5',
                      active
                        ? 'bg-amber-400 border-amber-400 text-slate-950'
                        : 'border-slate-300 bg-white'
                    )}
                  >
                    {active && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-current/10 text-xs">
                  <span className={active ? 'text-slate-400' : 'text-slate-500'}>
                    Cargo mensual adicional
                  </span>
                  <span
                    className={cn(
                      'font-mono font-bold tabular-nums',
                      active ? 'text-amber-300' : 'text-slate-900'
                    )}
                  >
                    +{formatCLP(addon.price_clp)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
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
