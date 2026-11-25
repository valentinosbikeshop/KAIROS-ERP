'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  Check,
  Clapperboard,
  FileSpreadsheet,
  FlaskConical,
  HardHat,
  LayoutGrid,
  PartyPopper,
  Plane,
  Receipt,
  Scale,
  Sparkles,
  UtensilsCrossed,
  Wind,
  Wrench,
  Zap,
} from 'lucide-react';
import {
  INDUSTRY_BLUEPRINTS,
  INDUSTRY_LIST,
  THEME_PRESETS,
  type IndustryIconName,
} from '@/lib/industries';
import { DEFAULT_ADDONS, DEFAULT_PLANS } from '@/lib/entitlements';
import { PlansMatrix } from '@/components/billing/plans-matrix';
import { FiguraLogo } from '@/components/ui/figura-logo';
import {
  AnimatedNumber,
  AnimatedProgressBar,
  Reveal,
  ScrollProgressHairline,
  SpotlightCard,
} from '@/components/ui/motion-primitives';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn, formatCLP } from '@/lib/utils';
import type {
  IndustryType,
  ModuleKey,
  SubscriptionAddon,
  SubscriptionPlan,
  SubscriptionTier,
} from '@/types/database';

const INDUSTRY_ICONS: Record<IndustryIconName, typeof PartyPopper> = {
  PartyPopper,
  Clapperboard,
  HardHat,
  UtensilsCrossed,
  LayoutGrid,
  Wrench,
  Wind,
  Scale,
  Plane,
};

export default function WelcomeLandingPage() {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const [plans, setPlans] = useState<SubscriptionPlan[]>(DEFAULT_PLANS);
  const [addons, setAddons] = useState<SubscriptionAddon[]>(DEFAULT_ADDONS);
  const [selectedIndustry, setSelectedIndustry] = useState<IndustryType>('eventos_banqueteria');
  const [simScale, setSimScale] = useState<1 | 3 | 5>(1);
  const [excludedItemIds, setExcludedItemIds] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/plans')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data?.plans) && data.plans.length > 0) setPlans(data.plans);
        if (Array.isArray(data?.addons) && data.addons.length > 0) setAddons(data.addons);
      })
      .catch(() => {});
  }, []);

  const handleSelectIndustry = (indId: IndustryType) => {
    setSelectedIndustry(indId);
    setExcludedItemIds([]);
  };

  const toggleSampleItem = (itemId: string) => {
    setExcludedItemIds((prev) => {
      const sampleIds = blueprint.starterCatalog.slice(0, 3).map((i) => i.id);
      const isExcluded = prev.includes(itemId);
      if (isExcluded) return prev.filter((id) => id !== itemId);
      // Keep at least one item active so live projection remains informative
      const remaining = sampleIds.filter((id) => !prev.includes(id) && id !== itemId);
      if (remaining.length === 0) return prev;
      return [...prev, itemId];
    });
  };

  const blueprint = INDUSTRY_BLUEPRINTS[selectedIndustry];
  const themeDef = THEME_PRESETS[blueprint.recommendedTheme];
  const demoHref = `/demo?industry=${selectedIndustry}`;

  const activeSampleItems = useMemo(() => {
    const base = blueprint.starterCatalog.slice(0, 3);
    const active = base.filter((i) => !excludedItemIds.includes(i.id));
    return active.length > 0 ? active : base;
  }, [blueprint, excludedItemIds]);

  const heroTotalSample = useMemo(
    () =>
      activeSampleItems.reduce((acc, item) => acc + (item.costo + item.ganancia) * simScale, 0),
    [activeSampleItems, simScale]
  );
  const heroTotalProfit = useMemo(
    () => activeSampleItems.reduce((acc, item) => acc + item.ganancia * simScale, 0),
    [activeSampleItems, simScale]
  );
  const heroIvaDebito = Math.round(heroTotalSample * 0.19);
  const heroIvaCredito = Math.round(
    activeSampleItems
      .filter((i) => i.tipo_doc_costo === 'factura')
      .reduce((acc, i) => acc + i.costo * 0.19 * simScale, 0)
  );
  const heroIvaNeto = Math.max(0, heroIvaDebito - heroIvaCredito);

  const handleSelectPlanBeforeRegister = async (
    tier: SubscriptionTier,
    selectedModules: ModuleKey[]
  ) => {
    const params = new URLSearchParams();
    params.set('plan', tier);
    params.set('industry', selectedIndustry);
    if (selectedModules.length > 0) {
      params.set('modules', selectedModules.join(','));
    }
    router.push(`/register?${params.toString()}`);
  };

  return (
    <div className="min-h-screen obsidian-canvas text-[#EEF1F6] relative overflow-x-clip selection:bg-[#D8C39E]/25 selection:text-[#EDE0C8]">
      <ScrollProgressHairline />

      {/* Fondo arquitectónico Obsidian con grilla fina y difusión atmosférica */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden obsidian-grid bg-grain"
        aria-hidden="true"
      >
        <div className="absolute -top-48 -left-32 h-[560px] w-[560px] rounded-full bg-[#D8C39E]/[0.06] blur-[140px] animate-ambient-drift" />
        <div
          className="absolute top-[28%] -right-40 h-[520px] w-[520px] rounded-full bg-[#5E89E8]/[0.06] blur-[145px] animate-ambient-drift"
          style={{ animationDelay: '-10s' }}
        />
      </div>

      {/* Navbar Glassmórfica Obsidian */}
      <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#06070A]/75 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-4">
          <FiguraLogo
            size="md"
            surface="obsidian"
            responsive
            subtitle="Arquitectura Financiera Multi-Rubro"
          />

          <nav className="hidden md:flex items-center gap-8 text-xs font-medium tracking-wide text-[#96A1B5]">
            <a href="#rubros" className="hover:text-[#EDE0C8] transition-colors">
              Tu Rubro
            </a>
            <a href="#capacidades" className="hover:text-[#EDE0C8] transition-colors">
              Capacidades
            </a>
            <a href="#planes" className="hover:text-[#EDE0C8] transition-colors">
              Planes
            </a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-2.5">
            <Link href={demoHref}>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs font-medium tactile-press border-white/15 bg-white/[0.04] text-[#EEF1F6] hover:bg-white/[0.1] hover:border-[#D8C39E]/40 hover:text-[#EDE0C8]"
              >
                <FlaskConical className="h-3.5 w-3.5 text-[#D8C39E]" />
                <span className="hidden sm:inline">Probar Demo</span>
                <span className="sm:hidden">Demo</span>
              </Button>
            </Link>
            <Link href="/login">
              <Button
                size="sm"
                className="text-xs font-semibold tactile-press bg-[#D8C39E] text-[#06070A] hover:bg-[#EDE0C8] shadow-[0_8px_24px_-8px_rgba(216,195,158,0.45)]"
              >
                Iniciar Sesión
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Editorial + Dock de Rubros + Consola Financiera Reactiva */}
      <section className="relative pt-7 pb-16 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto space-y-9">
          {/* Selector Inmediato de Rubro */}
          <div id="rubros" className="obsidian-glass-luxury rounded-3xl p-4 sm:p-5 space-y-3.5 animate-reveal-up">
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <span className="text-[11px] uppercase tracking-[0.14em] text-[#EDE0C8] font-semibold flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-pulse-ring absolute inline-flex h-full w-full rounded-full bg-[#D8C39E] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#D8C39E]" />
                </span>
                Paso 1 · Elige tu rubro para adaptar FIGURA, sus tarifas y planes en vivo
              </span>
              <Badge className="bg-[#4FA88B]/12 text-[#7FD3B6] border border-[#4FA88B]/30 text-[10px] font-semibold">
                <Zap className="h-3 w-3 mr-1" />
                {blueprint.quickWinStat}
              </Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-2">
              {INDUSTRY_LIST.map((ind) => {
                const active = selectedIndustry === ind.id;
                const Icon = INDUSTRY_ICONS[ind.iconName] || PartyPopper;
                return (
                  <button
                    key={ind.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => handleSelectIndustry(ind.id)}
                    className={cn(
                      'relative group text-left rounded-2xl p-2.5 sm:p-3 border transition-colors duration-200 tactile-press flex flex-col justify-between gap-2 overflow-hidden',
                      active
                        ? 'border-[#D8C39E]/60 text-[#06070A]'
                        : 'bg-white/[0.03] text-[#EEF1F6] border-white/[0.08] hover:border-[#D8C39E]/35 hover:bg-white/[0.06]'
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId={shouldReduceMotion ? undefined : 'active-industry-highlight'}
                        transition={{ type: 'spring', stiffness: 360, damping: 32 }}
                        className="absolute inset-0 bg-gradient-to-br from-[#EDE0C8] via-[#D8C39E] to-[#C2A677] -z-0"
                        aria-hidden="true"
                      />
                    )}
                    <div className="relative z-10 flex items-center justify-between gap-1.5">
                      <span
                        className={cn(
                          'h-7 w-7 rounded-xl flex items-center justify-center transition-colors',
                          active
                            ? 'bg-[#06070A]/12 text-[#06070A]'
                            : 'bg-white/[0.06] text-[#D8C39E] group-hover:bg-[#D8C39E]/15'
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <span
                        className={cn(
                          'text-[10px] font-mono font-semibold tabular-nums',
                          active ? 'text-[#06070A]/80' : 'text-[#96A1B5]'
                        )}
                      >
                        {ind.targetMarginPct}%
                      </span>
                    </div>
                    <span
                      className={cn(
                        'relative z-10 text-[11px] font-semibold leading-tight line-clamp-2',
                        active ? 'text-[#06070A]' : 'text-[#EEF1F6]'
                      )}
                    >
                      {ind.shortName}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex flex-wrap items-center gap-2 px-3.5 py-1 rounded-full border border-[#D8C39E]/25 bg-white/[0.04] backdrop-blur-md text-[11px] font-medium tracking-[0.08em] uppercase text-[#EDE0C8] animate-reveal-up">
                <span>{blueprint.shortName}</span>
                <span className="text-white/20">•</span>
                <span>Meta {blueprint.targetMarginPct}% Neto</span>
                <span className="text-white/20">•</span>
                <span className="text-[#4FA88B] font-semibold">{blueprint.quickWinStat}</span>
              </div>

              <motion.div
                key={blueprint.id}
                initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-4"
              >
                <h1 className="text-4xl sm:text-5xl lg:text-[3.4rem] font-semibold tracking-[-0.035em] text-[#EEF1F6] leading-[1.06]">
                  {blueprint.heroHeadlinePrefix}{' '}
                  <span className="editorial-italic text-[#D8C39E] font-normal">
                    {blueprint.heroHeadlineAccent}
                  </span>{' '}
                  {blueprint.heroHeadlineSuffix}
                </h1>

                <p className="text-base sm:text-lg text-[#96A1B5] leading-relaxed max-w-2xl">
                  {blueprint.heroValueProp}
                </p>
              </motion.div>

              <div className="flex flex-wrap items-center gap-3 pt-1 animate-reveal-up stagger-3">
                <Link href={demoHref}>
                  <Button
                    size="lg"
                    className="obsidian-shimmer font-semibold gap-2 px-6 tactile-press bg-[#D8C39E] text-[#06070A] hover:bg-[#EDE0C8] shadow-[0_14px_34px_-12px_rgba(216,195,158,0.5)]"
                  >
                    <FlaskConical className="h-4 w-4" />
                    Probar Demo Interactiva
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <a href="#planes">
                  <Button
                    size="lg"
                    variant="outline"
                    className="gap-2 font-medium tactile-press border-white/15 bg-white/[0.04] text-[#EEF1F6] hover:bg-white/[0.09] hover:border-[#D8C39E]/35 hover:text-[#EDE0C8]"
                  >
                    Ver Planes desde $0 · Recomendado $59.990
                  </Button>
                </a>
              </div>

              {/* Ficha técnica compacta del rubro */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 animate-reveal-up stagger-4">
                <div className="p-3 rounded-xl obsidian-glass-subtle">
                  <span className="text-[10px] uppercase tracking-wider text-[#96A1B5] block">
                    Módulo Central
                  </span>
                  <strong className="text-xs sm:text-sm text-[#EEF1F6] mt-0.5 block">
                    {blueprint.terminology.projectPlural}
                  </strong>
                </div>
                <div className="p-3 rounded-xl obsidian-glass-subtle">
                  <span className="text-[10px] uppercase tracking-wider text-[#96A1B5] block">
                    Catálogo
                  </span>
                  <strong className="text-xs sm:text-sm text-[#EEF1F6] mt-0.5 block">
                    {blueprint.terminology.catalogLabel}
                  </strong>
                </div>
                <div className="p-3 rounded-xl obsidian-glass-subtle">
                  <span className="text-[10px] uppercase tracking-wider text-[#96A1B5] block">
                    Contraparte
                  </span>
                  <strong className="text-xs sm:text-sm text-[#EEF1F6] mt-0.5 block">
                    {blueprint.terminology.clientLabel}
                  </strong>
                </div>
                <div className="p-3 rounded-xl obsidian-glass-subtle">
                  <span className="text-[10px] uppercase tracking-wider text-[#96A1B5] block">
                    Estilo Sugerido
                  </span>
                  <strong className="text-xs text-[#D8C39E] mt-0.5 block truncate">
                    {themeDef.name}
                  </strong>
                </div>
              </div>
            </div>

            {/* Consola Ejecutiva Obsidian Glass (Simulación Reactiva IVA + Partidas) */}
            <div className="lg:col-span-5 animate-reveal-up stagger-3">
              <SpotlightCard
                variant="obsidian-luxury"
                tilt
                className="obsidian-shimmer rounded-3xl p-6 sm:p-7 space-y-5"
              >
                <div className="flex items-start justify-between border-b border-white/10 pb-4 gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.18em] text-[#D8C39E] font-semibold">
                      Consola en Vivo · {blueprint.terminology.catalogLabel}
                    </div>
                    <div className="text-lg font-semibold tracking-tight mt-1 text-[#EEF1F6]">
                      {blueprint.name}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <Badge className="bg-[#4FA88B]/15 text-[#7FD3B6] border border-[#4FA88B]/30 text-[11px] font-medium">
                      Meta {blueprint.targetMarginPct}%
                    </Badge>
                    <div className="inline-flex items-center rounded-lg bg-white/[0.05] border border-white/10 p-0.5 text-[10px]">
                      {([1, 3, 5] as const).map((mult) => (
                        <button
                          key={mult}
                          type="button"
                          onClick={() => setSimScale(mult)}
                          className={cn(
                            'px-2 py-0.5 rounded-md font-semibold tabular-nums transition-colors',
                            simScale === mult
                              ? 'bg-[#D8C39E] text-[#06070A]'
                              : 'text-[#96A1B5] hover:text-[#EEF1F6]'
                          )}
                          title={`Simular ${mult} proyecto${mult > 1 ? 's' : ''}`}
                        >
                          {mult}×
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bloque IVA a fin de mes */}
                <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#EEF1F6] font-medium">
                      Proyección IVA F29 ({simScale} {simScale === 1 ? blueprint.terminology.projectSingular : blueprint.terminology.projectPlural})
                    </span>
                    <span className="text-[10px] text-[#4FA88B] font-semibold uppercase tracking-wider">
                      Cálculo SII en vivo
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs tabular-nums">
                    <div>
                      <span className="text-[10px] text-[#96A1B5] block">IVA Débito</span>
                      <span className="text-[#EEF1F6] font-semibold">
                        <AnimatedNumber value={heroIvaDebito} format="clp" duration={450} />
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#96A1B5] block">IVA Crédito</span>
                      <span className="text-[#4FA88B] font-semibold">
                        -<AnimatedNumber value={heroIvaCredito} format="clp" duration={450} />
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-[#96A1B5] block">Neto a Pagar</span>
                      <span className="text-[#EDE0C8] font-bold">
                        <AnimatedNumber value={heroIvaNeto} format="clp" duration={450} />
                      </span>
                    </div>
                  </div>
                  <AnimatedProgressBar
                    value={heroIvaDebito > 0 ? Math.round((heroIvaCredito / heroIvaDebito) * 100) : 0}
                    trackClassName="bg-white/10"
                    barClassName="bg-gradient-to-r from-[#4FA88B] to-[#D8C39E]"
                  />
                  <div className="flex items-center justify-between text-[11px] pt-0.5 text-[#96A1B5] tabular-nums">
                    <span>Utilidad Neta Proyectada</span>
                    <span className="font-semibold text-[#4FA88B]">
                      +<AnimatedNumber value={heroTotalProfit} format="clp" duration={450} />
                    </span>
                  </div>
                </div>

                {/* Partidas interactivas del rubro */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-[#96A1B5] px-1">
                    <span>Partidas de muestra (clic para simular)</span>
                    <span className="tabular-nums">{activeSampleItems.length}/3 activas</span>
                  </div>
                  {blueprint.starterCatalog.slice(0, 3).map((item) => {
                    const included = !excludedItemIds.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleSampleItem(item.id)}
                        className={cn(
                          'w-full text-left p-3 rounded-2xl border flex items-center justify-between gap-3 transition-all duration-200 tactile-press',
                          included
                            ? 'bg-white/[0.05] border-white/12 hover:border-[#D8C39E]/35 hover:bg-white/[0.08]'
                            : 'bg-white/[0.015] border-white/5 opacity-45 hover:opacity-75'
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={cn(
                              'h-4 w-4 rounded flex items-center justify-center border shrink-0 transition-colors',
                              included
                                ? 'bg-[#D8C39E] border-[#D8C39E] text-[#06070A]'
                                : 'border-white/25 bg-transparent'
                            )}
                          >
                            {included && <Check className="h-3 w-3 stroke-[2.6]" />}
                          </span>
                          <div className="min-w-0">
                            <div className="font-medium text-[#EEF1F6] truncate">{item.servicio}</div>
                            <div className="text-[11px] text-[#96A1B5] mt-0.5">
                              {item.tipo_doc_costo === 'factura'
                                ? 'Factura (recupera 19% IVA Crédito)'
                                : 'Boleta Honorarios (15,25% configurable)'}
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0 tabular-nums">
                          <div className="text-[#EEF1F6] font-semibold">
                            {formatCLP((item.costo + item.ganancia) * simScale)}
                          </div>
                          <div className="text-[10px] text-[#4FA88B] font-medium">
                            +{formatCLP(item.ganancia * simScale)} util.
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </SpotlightCard>
            </div>
          </div>
        </div>
      </section>

      {/* Sección Capacidades Específicas del Rubro + Núcleo Financiero */}
      <section id="capacidades" className="py-16 px-4 sm:px-8 border-t border-white/[0.08] bg-[#0B0D13]/60">
        <div className="max-w-7xl mx-auto space-y-10">
          <Reveal>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="max-w-2xl space-y-2">
                <span className="text-[10px] uppercase tracking-[0.18em] text-[#D8C39E] font-semibold">
                  Diseñado para {blueprint.name}
                </span>
                <h2 className="text-3xl font-semibold tracking-tight text-[#EEF1F6]">
                  Lo que resuelve FIGURA en tu{' '}
                  <span className="editorial-italic text-[#D8C39E]">operación diaria</span>
                </h2>
                <p className="text-sm text-[#96A1B5]">
                  {blueprint.ownerPainPoint} Cada peso cotizado, abonado y rendido queda conectado para proteger tu margen neto.
                </p>
              </div>
              <Link href={demoHref}>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 font-semibold shrink-0 border-white/15 bg-white/[0.04] text-[#EEF1F6] hover:bg-white/[0.1] hover:border-[#D8C39E]/40 hover:text-[#EDE0C8]"
                >
                  Ver {blueprint.shortName} en vivo
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {blueprint.capabilityHighlights.map((cap, idx) => (
              <Reveal key={cap.title} delay={idx * 60}>
                <SpotlightCard
                  variant="obsidian"
                  className="p-6 h-full flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <Badge className="bg-[#D8C39E]/12 text-[#EDE0C8] border border-[#D8C39E]/25 text-[10px] font-semibold">
                        Especial {blueprint.shortName}
                      </Badge>
                      <span className="text-[11px] font-semibold text-[#4FA88B]">{cap.metric}</span>
                    </div>
                    <h3 className="text-lg font-semibold leading-snug text-[#EEF1F6]">{cap.title}</h3>
                    <p className="text-xs text-[#96A1B5] leading-relaxed">{cap.description}</p>
                  </div>
                </SpotlightCard>
              </Reveal>
            ))}

            <Reveal delay={180}>
              <SpotlightCard variant="obsidian" className="p-6 h-full space-y-3">
                <div className="h-10 w-10 rounded-xl bg-[#5E89E8]/12 border border-[#5E89E8]/25 text-[#8FB0F7] flex items-center justify-center">
                  <Receipt className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-[#EEF1F6]">IVA F29 &amp; Flujo de Caja en Vivo</h3>
                <p className="text-xs text-[#96A1B5] leading-relaxed">
                  Calcula automáticamente tu <strong className="text-[#EEF1F6]">IVA Débito</strong> vs.{' '}
                  <strong className="text-[#EEF1F6]">IVA Crédito</strong> por compras con factura, abonos recibidos y gastos reales de cada{' '}
                  {blueprint.terminology.projectSingular.toLowerCase()}.
                </p>
              </SpotlightCard>
            </Reveal>

            <Reveal delay={240}>
              <SpotlightCard variant="obsidian" className="p-6 h-full space-y-3">
                <div className="h-10 w-10 rounded-xl bg-[#4FA88B]/12 border border-[#4FA88B]/25 text-[#7FD3B6] flex items-center justify-center">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-[#EEF1F6]">Cotización Express + Suite IA OCR</h3>
                <p className="text-xs text-[#96A1B5] leading-relaxed">
                  Crea una cotización completa en 1 clic desde plantillas de{' '}
                  <strong className="text-[#EEF1F6]">{blueprint.shortName}</strong> o sube PDF/Excel de proveedores para que la IA sugiera costos y márgenes.
                </p>
              </SpotlightCard>
            </Reveal>

            <Reveal delay={300}>
              <SpotlightCard variant="obsidian" className="p-6 h-full space-y-3">
                <div className="h-10 w-10 rounded-xl bg-[#D8C39E]/12 border border-[#D8C39E]/25 text-[#EDE0C8] flex items-center justify-center">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-[#EEF1F6]">PDF Comercial &amp; Excel Contable</h3>
                <p className="text-xs text-[#96A1B5] leading-relaxed">
                  Genera propuestas PDF listas para enviar a tu {blueprint.terminology.clientLabel.toLowerCase()} y exporta libros contables en Excel con desglose tributario para tu contador.
                </p>
              </SpotlightCard>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Sección Planes & Paga lo que usas */}
      <section id="planes" className="py-16 px-4 sm:px-8 border-t border-white/[0.08]">
        <div className="max-w-7xl mx-auto space-y-8">
          <Reveal>
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <Badge className="bg-[#D8C39E]/12 text-[#EDE0C8] border border-[#D8C39E]/25 text-[10px] tracking-[0.14em] uppercase">
                Comparativa transparente · Incluye lo que tiene y lo que falta en cada plan
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#EEF1F6]">
                Invierte según tu etapa o{' '}
                <span className="editorial-italic text-[#D8C39E]">arma tu ERP</span> a medida
              </h2>
              <p className="text-sm text-[#96A1B5]">
                Planes adaptados a <strong className="text-[#EEF1F6]">{blueprint.shortName}</strong>. Selecciona cualquier plan para ver el desglose completo o contratar con Khipu.
              </p>
            </div>
          </Reveal>

          <PlansMatrix
            plans={plans}
            addons={addons}
            currentModules={blueprint.recommendedModules}
            industry={blueprint}
            industryName={blueprint.shortName}
            surface="obsidian"
            onSelectCheckout={handleSelectPlanBeforeRegister}
          />
        </div>
      </section>

      {/* Footer Editorial Minimalista */}
      <footer className="border-t border-white/[0.08] py-8 px-4 sm:px-8 bg-[#06070A]/80 backdrop-blur-xl text-[#96A1B5] text-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <FiguraLogo size="sm" surface="obsidian" />
            <span className="text-[11px] tracking-wide">
              © {new Date().getFullYear()} FIGURA · Arquitectura Financiera Multi-Empresa · Chile
            </span>
          </div>
          <div className="flex items-center gap-6">
            <Link href={demoHref} className="hover:text-[#EDE0C8] transition-colors">
              Probar Demo Interactiva
            </Link>
            <Link href="/login" className="hover:text-[#EDE0C8] transition-colors">
              Acceso Clientes
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
