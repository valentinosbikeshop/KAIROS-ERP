'use client';

import Link from 'next/link';
import { Lock, Sparkles, ArrowUpRight, ShieldAlert, Crown, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ResolvedEntitlements } from '@/types';
import type { SubscriptionTier } from '@/types/database';

interface FeatureLockCardProps {
  title: string;
  description: string;
  requiredPlanLabel?: string;
  isExpiredLock?: boolean;
  compact?: boolean;
  className?: string;
}

export function FeatureLockCard({
  title,
  description,
  requiredPlanLabel = 'Crecimiento Inteligente IA',
  isExpiredLock = false,
  compact = false,
  className,
}: FeatureLockCardProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-slate-200/80 glass-card',
        compact ? 'p-4' : 'p-6',
        className
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div
            className={cn(
              'rounded-xl p-2.5 shrink-0 border',
              isExpiredLock
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-700'
                : 'bg-slate-900 text-amber-300 border-slate-800'
            )}
          >
            {isExpiredLock ? <ShieldAlert className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-semibold text-sm text-slate-900">{title}</h4>
              <Badge
                variant="outline"
                className="text-[10px] font-semibold bg-amber-50 text-amber-800 border-amber-200"
              >
                {isExpiredLock ? 'Suscripción vencida · Datos seguros' : requiredPlanLabel}
              </Badge>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed max-w-xl">
              {isExpiredLock
                ? 'Tu historial completo está intacto y visible. Reactiva tu suscripción vía Khipu para desbloquear nuevamente esta herramienta.'
                : description}
            </p>
          </div>
        </div>

        <Link href="/billing" className="shrink-0">
          <Button
            size="sm"
            className="tactile-press bg-slate-900 hover:bg-slate-800 text-white gap-1.5 font-semibold"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            {isExpiredLock ? 'Reactivar Plan' : 'Activar Módulo'}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

const TIER_VISUAL_META: Record<
  SubscriptionTier,
  {
    label: string;
    shellName: string;
    bannerClass: string;
    badgeClass: string;
    icon: typeof Crown;
  }
> = {
  free: {
    label: 'Plan Semilla (Gratuito)',
    shellName: 'Interfaz Esencial Lite',
    bannerClass: 'bg-slate-50/90 border-slate-200 text-slate-800',
    badgeClass: 'bg-slate-200 text-slate-800',
    icon: Layers,
  },
  essential: {
    label: 'Operación Esencial',
    shellName: 'Interfaz Executive Sapphire',
    bannerClass: 'bg-blue-50/80 border-blue-200/80 text-blue-950',
    badgeClass: 'bg-blue-600 text-white',
    icon: Layers,
  },
  growth: {
    label: 'Crecimiento Inteligente IA',
    shellName: 'Interfaz Signature IA Gold',
    bannerClass:
      'bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-amber-400/30 text-white',
    badgeClass: 'bg-amber-400 text-slate-950',
    icon: Sparkles,
  },
  scale: {
    label: 'Corporativo & Escala',
    shellName: 'Interfaz Obsidian Titanium',
    bannerClass:
      'bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 border-emerald-400/30 text-white',
    badgeClass: 'bg-emerald-400 text-slate-950',
    icon: Crown,
  },
  custom: {
    label: 'Paga lo que usas (A tu Medida)',
    shellName: 'Interfaz Atelier Modular',
    bannerClass:
      'bg-gradient-to-r from-slate-900 to-slate-800 border-slate-700 text-white',
    badgeClass: 'bg-white text-slate-950',
    icon: Layers,
  },
};

export function TierWorkspaceBanner({
  entitlements,
  projectCount,
  costCount,
}: {
  entitlements: ResolvedEntitlements;
  projectCount?: number;
  costCount?: number;
}) {
  if (entitlements.isExempt || entitlements.isDemo) return null;

  const meta = TIER_VISUAL_META[entitlements.effectiveTier] || TIER_VISUAL_META.free;
  const Icon = meta.icon;
  const isDark =
    entitlements.effectiveTier === 'growth' ||
    entitlements.effectiveTier === 'scale' ||
    entitlements.effectiveTier === 'custom';

  if (entitlements.isExpiredLock) {
    return (
      <div className="bg-amber-50 border-b border-amber-200 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-amber-950">
          <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
          <span>
            <strong>Suscripción pendiente de renovación.</strong> Todos tus datos siguen resguardados en modo lectura; reactiva tu plan con Khipu para recuperar tus módulos.
          </span>
        </div>
        <Link href="/billing">
          <Button size="sm" className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold">
            Renovar con Khipu
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'border-b px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-3 text-xs transition-colors',
        meta.bannerClass
      )}
    >
      <div className="flex flex-wrap items-center gap-2.5">
        <Badge className={cn('border-0 font-bold gap-1', meta.badgeClass)}>
          <Icon className="h-3 w-3" />
          {meta.label}
        </Badge>
        <span className={cn('hidden sm:inline font-medium', isDark ? 'text-slate-300' : 'text-slate-600')}>
          {meta.shellName}
        </span>

        {entitlements.maxProjects !== null && typeof projectCount === 'number' && (
          <span
            className={cn(
              'font-mono text-[11px] px-2 py-0.5 rounded-md border',
              isDark
                ? 'bg-white/10 border-white/15 text-slate-200'
                : 'bg-white border-slate-200 text-slate-700'
            )}
          >
            Proyectos: {projectCount}/{entitlements.maxProjects}
          </span>
        )}

        {entitlements.maxCosts !== null && typeof costCount === 'number' && (
          <span
            className={cn(
              'font-mono text-[11px] px-2 py-0.5 rounded-md border',
              isDark
                ? 'bg-white/10 border-white/15 text-slate-200'
                : 'bg-white border-slate-200 text-slate-700'
            )}
          >
            Catálogo: {costCount}/{entitlements.maxCosts}
          </span>
        )}

        {entitlements.modules.mod_ai_suite && (
          <span
            className={cn(
              'font-mono text-[11px] px-2 py-0.5 rounded-md border',
              isDark
                ? 'bg-amber-400/15 border-amber-400/30 text-amber-200'
                : 'bg-indigo-50 border-indigo-200 text-indigo-800'
            )}
          >
            IA: {entitlements.aiCallsRemaining}/{entitlements.aiCallsLimit} disp.
          </span>
        )}
      </div>

      <Link href="/billing">
        <Button
          size="sm"
          variant={isDark ? 'secondary' : 'outline'}
          className="h-7 text-[11px] font-semibold gap-1 tactile-press"
        >
          {entitlements.effectiveTier === 'free' ? 'Mejorar Plan' : 'Gestionar Plan'}
          <ArrowUpRight className="h-3 w-3" />
        </Button>
      </Link>
    </div>
  );
}
