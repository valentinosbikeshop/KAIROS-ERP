'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
  Moon,
  PartyPopper,
  Plane,
  Receipt,
  Scale,
  Sparkles,
  Sun,
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

const THEME_STORAGE_KEY = 'figura_welcome_theme';

export default function WelcomeLandingPage() {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');
  const [plans, setPlans] = useState<SubscriptionPlan[]>(DEFAULT_PLANS);
  const [addons, setAddons] = useState<SubscriptionAddon[]>(DEFAULT_ADDONS);
  const [selectedIndustry, setSelectedIndustry] = useState<IndustryType>('eventos_banqueteria');
  const [simScale, setSimScale] = useState<1 | 3 | 5>(1);
  const [excludedItemIds, setExcludedItemIds] = useState<string[]>([]);

  const isDark = themeMode === 'dark';

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'dark' || saved === 'light') {
        setThemeMode(saved);
      }
    } catch {
      // Ignore storage read errors
    }

    fetch('/api/plans')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data?.plans) && data.plans.length > 0) setPlans(data.plans);
        if (Array.isArray(data?.addons) && data.addons.length > 0) setAddons(data.addons);
      })
      .catch(() => {});
  }, []);

  const toggleTheme = (next: 'light' | 'dark') => {
    setThemeMode(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Ignore storage write errors
    }
  };

  /**
   * Smooth, crisp scroll animation (~480ms easeInOutCubic) compensating for sticky header + root zoom.
   */
  const scrollToSection = useCallback(
    (sectionId: string) => {
      if (typeof window === 'undefined') return;
      const target = document.getElementById(sectionId);
      if (!target) return;

      if (shouldReduceMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        target.scrollIntoView({ behavior: 'auto', block: 'start' });
        return;
      }

      const rawZoom = parseFloat(window.getComputedStyle(document.documentElement).zoom || '1');
      const zoom = Number.isFinite(rawZoom) && rawZoom > 0 ? rawZoom : 1;
      const headerOffset = 76;
      const rectTop = target.getBoundingClientRect().top / zoom;
      const startY = window.scrollY;
      const endY = Math.max(0, startY + rectTop - headerOffset);
      const distance = endY - startY;

      if (Math.abs(distance) < 4) return;

      const duration = Math.min(540, Math.max(360, Math.abs(distance) * 0.32));
      const startTime = performance.now();

      const easeInOutCubic = (t: number) =>
        t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      const step = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        window.scrollTo({ top: startY + distance * easeInOutCubic(progress), behavior: 'auto' });
        if (progress < 1) {
          requestAnimationFrame(step);
        }
      };

      requestAnimationFrame(step);
    },
    [shouldReduceMotion]
  );

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    e.preventDefault();
    scrollToSection(sectionId);
  };

  const handleSelectIndustry = (indId: IndustryType) => {
    setSelectedIndustry(indId);
    setExcludedItemIds([]);
  };

  const toggleSampleItem = (itemId: string) => {
    setExcludedItemIds((prev) => {
      const sampleIds = blueprint.starterCatalog.slice(0, 3).map((i) => i.id);
      const isExcluded = prev.includes(itemId);
      if (isExcluded) return prev.filter((id) => id !== itemId);
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
    <div
      className={cn(
        'min-h-screen relative overflow-x-clip transition-colors duration-300',
        isDark
          ? 'obsidian-canvas text-[#EEF1F6] selection:bg-[#D8C39E]/25 selection:text-[#EDE0C8]'
          : 'alabaster-canvas text-slate-900 selection:bg-[#8C7148]/15 selection:text-slate-900'
      )}
    >
      <ScrollProgressHairline />

      {/* Fondo arquitectónico adaptativo con grilla fina */}
      <div
        className={cn(
          'pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-grain',
          isDark ? 'obsidian-grid' : 'alabaster-grid'
        )}
        aria-hidden="true"
      >
        <div
          className={cn(
            'absolute -top-48 -left-32 h-[540px] w-[540px] rounded-full blur-[135px] animate-ambient-drift',
            isDark ? 'bg-[#D8C39E]/[0.06]' : 'bg-[#B59666]/[0.11]'
          )}
        />
        <div
          className={cn(
            'absolute top-[28%] -right-40 h-[500px] w-[500px] rounded-full blur-[140px] animate-ambient-drift',
            isDark ? 'bg-[#5E89E8]/[0.06]' : 'bg-[#4A607A]/[0.09]'
          )}
          style={{ animationDelay: '-10s' }}
        />
      </div>

      {/* Navbar Glassmórfica Superior con Switch Claro / Oscuro */}
      <header
        className={cn(
          'sticky top-0 z-50 border-b backdrop-blur-2xl transition-colors duration-300',
          isDark
            ? 'border-white/[0.08] bg-[#06070A]/78'
            : 'border-white/85 bg-white/75 shadow-[0_1px_20px_-8px_rgba(15,23,42,0.08)]'
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-3">
          <FiguraLogo
            size="md"
            surface={isDark ? 'obsidian' : 'light'}
            responsive
            subtitle="Arquitectura Financiera Multi-Rubro"
          />

          <nav
            aria-label="Navegación principal"
            className={cn(
              'hidden md:flex items-center gap-7 text-xs font-medium tracking-wide',
              isDark ? 'text-[#96A1B5]' : 'text-slate-600'
            )}
          >
            <a
              href="#rubros"
              onClick={(e) => handleNavClick(e, 'rubros')}
              className={cn(
                'py-1 transition-colors',
                isDark ? 'hover:text-[#EDE0C8]' : 'hover:text-slate-950'
              )}
            >
              Tu Rubro
            </a>
            <a
              href="#capacidades"
              onClick={(e) => handleNavClick(e, 'capacidades')}
              className={cn(
                'py-1 transition-colors',
                isDark ? 'hover:text-[#EDE0C8]' : 'hover:text-slate-950'
              )}
            >
              Capacidades
            </a>
            <a
              href="#planes"
              onClick={(e) => handleNavClick(e, 'planes')}
              className={cn(
                'py-1 transition-colors',
                isDark ? 'hover:text-[#EDE0C8]' : 'hover:text-slate-950'
              )}
            >
              Planes
            </a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Switch Modo Claro / Oscuro */}
            <div
              role="group"
              aria-label="Selector de apariencia"
              className={cn(
                'inline-flex items-center rounded-full p-0.5 border transition-colors',
                isDark
                  ? 'bg-white/[0.05] border-white/12'
                  : 'bg-slate-200/70 border-slate-300/75'
              )}
            >
              <button
                type="button"
                aria-pressed={!isDark}
                aria-label="Activar modo claro"
                onClick={() => toggleTheme('light')}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all',
                  !isDark
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-[#96A1B5] hover:text-[#EEF1F6]'
                )}
              >
                <Sun className="h-3 w-3 text-[#9A7E54]" />
                <span className="hidden sm:inline">Claro</span>
              </button>
              <button
                type="button"
                aria-pressed={isDark}
                aria-label="Activar modo oscuro"
                onClick={() => toggleTheme('dark')}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all',
                  isDark
                    ? 'bg-[#D8C39E] text-[#06070A] shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                <Moon className="h-3 w-3" />
                <span className="hidden sm:inline">Oscuro</span>
              </button>
            </div>

            <Link href={demoHref}>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  'gap-1.5 text-xs font-medium tactile-press',
                  isDark
                    ? 'border-white/15 bg-white/[0.04] text-[#EEF1F6] hover:bg-white/[0.1] hover:border-[#D8C39E]/40 hover:text-[#EDE0C8]'
                    : 'border-slate-300/90 bg-white/80 text-slate-800 hover:bg-white hover:border-[#8C7148]/50'
                )}
              >
                <FlaskConical className={cn('h-3.5 w-3.5', isDark ? 'text-[#D8C39E]' : 'text-[#8C7148]')} />
                <span className="hidden sm:inline">Probar Demo</span>
                <span className="sm:hidden">Demo</span>
              </Button>
            </Link>
            <Link href="/login">
              <Button
                size="sm"
                className={cn(
                  'text-xs font-semibold tactile-press',
                  isDark
                    ? 'bg-[#D8C39E] text-[#06070A] hover:bg-[#EDE0C8] shadow-[0_8px_24px_-8px_rgba(216,195,158,0.45)]'
                    : 'bg-[#0F172A] text-[#EDE0C8] hover:bg-[#1E293B] shadow-sm'
                )}
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
          <div
            id="rubros"
            className={cn(
              'scroll-mt-20 rounded-3xl p-4 sm:p-5 space-y-3.5 animate-reveal-up',
              isDark ? 'obsidian-glass-luxury' : 'glass-luxury'
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <span
                className={cn(
                  'text-[11px] uppercase tracking-[0.14em] font-semibold flex items-center gap-2',
                  isDark ? 'text-[#EDE0C8]' : 'text-slate-700'
                )}
              >
                <span className="relative flex h-2 w-2">
                  <span
                    className={cn(
                      'animate-pulse-ring absolute inline-flex h-full w-full rounded-full opacity-75',
                      isDark ? 'bg-[#D8C39E]' : 'bg-[#8C7148]'
                    )}
                  />
                  <span
                    className={cn(
                      'relative inline-flex rounded-full h-2 w-2',
                      isDark ? 'bg-[#D8C39E]' : 'bg-[#8C7148]'
                    )}
                  />
                </span>
                Paso 1 · Elige tu rubro para adaptar FIGURA, sus tarifas y planes en vivo
              </span>
              <Badge
                className={cn(
                  'text-[10px] font-semibold border',
                  isDark
                    ? 'bg-[#4FA88B]/12 text-[#7FD3B6] border-[#4FA88B]/30'
                    : 'bg-[#467366]/12 text-[#2E5248] border-[#467366]/25'
                )}
              >
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
                      isDark
                        ? active
                          ? 'border-[#D8C39E]/60 text-[#06070A]'
                          : 'bg-white/[0.03] text-[#EEF1F6] border-white/[0.08] hover:border-[#D8C39E]/35 hover:bg-white/[0.06]'
                        : active
                        ? 'border-[#0F172A] text-[#EEF1F6] shadow-md'
                        : 'bg-white/75 text-slate-900 border-slate-200/90 hover:border-[#8C7148]/50 hover:bg-white'
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId={shouldReduceMotion ? undefined : 'active-industry-highlight'}
                        transition={{ type: 'spring', stiffness: 360, damping: 32 }}
                        className={cn(
                          'absolute inset-0 -z-0',
                          isDark
                            ? 'bg-gradient-to-br from-[#EDE0C8] via-[#D8C39E] to-[#C2A677]'
                            : 'bg-gradient-to-br from-[#161C2A] via-[#0F172A] to-[#1E293B]'
                        )}
                        aria-hidden="true"
                      />
                    )}
                    <div className="relative z-10 flex items-center justify-between gap-1.5">
                      <span
                        className={cn(
                          'h-7 w-7 rounded-xl flex items-center justify-center transition-colors',
                          isDark
                            ? active
                              ? 'bg-[#06070A]/12 text-[#06070A]'
                              : 'bg-white/[0.06] text-[#D8C39E] group-hover:bg-[#D8C39E]/15'
                            : active
                            ? 'bg-white/12 text-[#D8C39E]'
                            : 'bg-slate-900/[0.06] text-[#8C7148] group-hover:bg-[#8C7148]/15'
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <span
                        className={cn(
                          'text-[10px] font-mono font-semibold tabular-nums',
                          isDark
                            ? active
                              ? 'text-[#06070A]/80'
                              : 'text-[#96A1B5]'
                            : active
                            ? 'text-[#EDE0C8]/90'
                            : 'text-slate-500'
                        )}
                      >
                        {ind.targetMarginPct}%
                      </span>
                    </div>
                    <span
                      className={cn(
                        'relative z-10 text-[11px] font-semibold leading-tight line-clamp-2',
                        isDark
                          ? active
                            ? 'text-[#06070A]'
                            : 'text-[#EEF1F6]'
                          : active
                          ? 'text-[#EEF1F6]'
                          : 'text-slate-900'
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
              <div
                className={cn(
                  'inline-flex flex-wrap items-center gap-2 px-3.5 py-1 rounded-full border backdrop-blur-md text-[11px] font-medium tracking-[0.08em] uppercase animate-reveal-up',
                  isDark
                    ? 'border-[#D8C39E]/25 bg-white/[0.04] text-[#EDE0C8]'
                    : 'border-[#8C7148]/30 bg-white/80 text-slate-700'
                )}
              >
                <span>{blueprint.shortName}</span>
                <span className={isDark ? 'text-white/20' : 'text-slate-300'}>•</span>
                <span>Meta {blueprint.targetMarginPct}% Neto</span>
                <span className={isDark ? 'text-white/20' : 'text-slate-300'}>•</span>
                <span className={cn('font-semibold', isDark ? 'text-[#4FA88B]' : 'text-[#2E6F5E]')}>
                  {blueprint.quickWinStat}
                </span>
              </div>

              <motion.div
                key={blueprint.id}
                initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-4"
              >
                <h1
                  className={cn(
                    'text-4xl sm:text-5xl lg:text-[3.4rem] font-semibold tracking-[-0.035em] leading-[1.06]',
                    isDark ? 'text-[#EEF1F6]' : 'text-slate-950'
                  )}
                >
                  {blueprint.heroHeadlinePrefix}{' '}
                  <span
                    className={cn(
                      'editorial-italic font-normal',
                      isDark ? 'text-[#D8C39E]' : 'text-[#8C6F42]'
                    )}
                  >
                    {blueprint.heroHeadlineAccent}
                  </span>{' '}
                  {blueprint.heroHeadlineSuffix}
                </h1>

                <p
                  className={cn(
                    'text-base sm:text-lg leading-relaxed max-w-2xl',
                    isDark ? 'text-[#96A1B5]' : 'text-slate-600'
                  )}
                >
                  {blueprint.heroValueProp}
                </p>
              </motion.div>

              <div className="flex flex-wrap items-center gap-3 pt-1 animate-reveal-up stagger-3">
                <Link href={demoHref}>
                  <Button
                    size="lg"
                    className={cn(
                      'font-semibold gap-2 px-6 tactile-press',
                      isDark
                        ? 'obsidian-shimmer bg-[#D8C39E] text-[#06070A] hover:bg-[#EDE0C8] shadow-[0_14px_34px_-12px_rgba(216,195,158,0.5)]'
                        : 'hairline-shimmer bg-[#0F172A] text-[#EDE0C8] hover:bg-[#1E293B] shadow-md'
                    )}
                  >
                    <FlaskConical className="h-4 w-4" />
                    Probar Demo Interactiva
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <a href="#planes" onClick={(e) => handleNavClick(e, 'planes')}>
                  <Button
                    size="lg"
                    variant="outline"
                    className={cn(
                      'gap-2 font-medium tactile-press',
                      isDark
                        ? 'border-white/15 bg-white/[0.04] text-[#EEF1F6] hover:bg-white/[0.09] hover:border-[#D8C39E]/35 hover:text-[#EDE0C8]'
                        : 'border-slate-300/90 bg-white/80 text-slate-800 hover:bg-white hover:border-[#8C7148]/50'
                    )}
                  >
                    Ver Planes desde $0 · Recomendado $59.990
                  </Button>
                </a>
              </div>

              {/* Ficha técnica compacta del rubro */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 animate-reveal-up stagger-4">
                {[
                  { label: 'Módulo Central', value: blueprint.terminology.projectPlural },
                  { label: 'Catálogo', value: blueprint.terminology.catalogLabel },
                  { label: 'Contraparte', value: blueprint.terminology.clientLabel },
                  { label: 'Estilo Sugerido', value: themeDef.name, accent: true },
                ].map((spec) => (
                  <div
                    key={spec.label}
                    className={cn('p-3 rounded-xl', isDark ? 'obsidian-glass-subtle' : 'glass-subtle')}
                  >
                    <span
                      className={cn(
                        'text-[10px] uppercase tracking-wider block',
                        isDark ? 'text-[#96A1B5]' : 'text-slate-500'
                      )}
                    >
                      {spec.label}
                    </span>
                    <strong
                      className={cn(
                        'text-xs sm:text-sm mt-0.5 block truncate',
                        spec.accent
                          ? isDark
                            ? 'text-[#D8C39E]'
                            : 'text-[#8C6F42]'
                          : isDark
                          ? 'text-[#EEF1F6]'
                          : 'text-slate-900'
                      )}
                    >
                      {spec.value}
                    </strong>
                  </div>
                ))}
              </div>
            </div>

            {/* Consola Ejecutiva Glassmórfica (Simulación Reactiva IVA + Partidas) */}
            <div className="lg:col-span-5 animate-reveal-up stagger-3">
              <SpotlightCard
                variant={isDark ? 'obsidian-luxury' : 'light'}
                tilt
                className={cn(
                  'rounded-3xl p-6 sm:p-7 space-y-5',
                  isDark ? 'obsidian-shimmer' : 'glass-luxury hairline-shimmer'
                )}
              >
                <div
                  className={cn(
                    'flex items-start justify-between border-b pb-4 gap-3',
                    isDark ? 'border-white/10' : 'border-slate-200/80'
                  )}
                >
                  <div>
                    <div
                      className={cn(
                        'text-[10px] uppercase tracking-[0.18em] font-semibold',
                        isDark ? 'text-[#D8C39E]' : 'text-[#8C6F42]'
                      )}
                    >
                      Consola en Vivo · {blueprint.terminology.catalogLabel}
                    </div>
                    <div
                      className={cn(
                        'text-lg font-semibold tracking-tight mt-1',
                        isDark ? 'text-[#EEF1F6]' : 'text-slate-950'
                      )}
                    >
                      {blueprint.name}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <Badge
                      className={cn(
                        'text-[11px] font-medium border',
                        isDark
                          ? 'bg-[#4FA88B]/15 text-[#7FD3B6] border-[#4FA88B]/30'
                          : 'bg-[#467366]/12 text-[#2E5248] border-[#467366]/25'
                      )}
                    >
                      Meta {blueprint.targetMarginPct}%
                    </Badge>
                    <div
                      className={cn(
                        'inline-flex items-center rounded-lg border p-0.5 text-[10px]',
                        isDark
                          ? 'bg-white/[0.05] border-white/10'
                          : 'bg-slate-100/80 border-slate-200/90'
                      )}
                    >
                      {([1, 3, 5] as const).map((mult) => (
                        <button
                          key={mult}
                          type="button"
                          onClick={() => setSimScale(mult)}
                          className={cn(
                            'px-2 py-0.5 rounded-md font-semibold tabular-nums transition-colors',
                            simScale === mult
                              ? isDark
                                ? 'bg-[#D8C39E] text-[#06070A]'
                                : 'bg-[#0F172A] text-[#EDE0C8]'
                              : isDark
                              ? 'text-[#96A1B5] hover:text-[#EEF1F6]'
                              : 'text-slate-600 hover:text-slate-900'
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
                <div
                  className={cn(
                    'p-4 rounded-2xl border space-y-2.5',
                    isDark
                      ? 'bg-white/[0.04] border-white/10'
                      : 'bg-white/80 border-slate-200/80 shadow-2xs'
                  )}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className={cn('font-medium', isDark ? 'text-[#EEF1F6]' : 'text-slate-900')}>
                      Proyección IVA F29 ({simScale}{' '}
                      {simScale === 1
                        ? blueprint.terminology.projectSingular
                        : blueprint.terminology.projectPlural}
                      )
                    </span>
                    <span
                      className={cn(
                        'text-[10px] font-semibold uppercase tracking-wider',
                        isDark ? 'text-[#4FA88B]' : 'text-[#2E6F5E]'
                      )}
                    >
                      Cálculo SII en vivo
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs tabular-nums">
                    <div>
                      <span className={cn('text-[10px] block', isDark ? 'text-[#96A1B5]' : 'text-slate-500')}>
                        IVA Débito
                      </span>
                      <span className={cn('font-semibold', isDark ? 'text-[#EEF1F6]' : 'text-slate-900')}>
                        <AnimatedNumber value={heroIvaDebito} format="clp" duration={450} />
                      </span>
                    </div>
                    <div>
                      <span className={cn('text-[10px] block', isDark ? 'text-[#96A1B5]' : 'text-slate-500')}>
                        IVA Crédito
                      </span>
                      <span className={cn('font-semibold', isDark ? 'text-[#4FA88B]' : 'text-[#2E6F5E]')}>
                        -<AnimatedNumber value={heroIvaCredito} format="clp" duration={450} />
                      </span>
                    </div>
                    <div className="text-right">
                      <span className={cn('text-[10px] block', isDark ? 'text-[#96A1B5]' : 'text-slate-500')}>
                        Neto a Pagar
                      </span>
                      <span className={cn('font-bold', isDark ? 'text-[#EDE0C8]' : 'text-[#8C6F42]')}>
                        <AnimatedNumber value={heroIvaNeto} format="clp" duration={450} />
                      </span>
                    </div>
                  </div>
                  <AnimatedProgressBar
                    value={heroIvaDebito > 0 ? Math.round((heroIvaCredito / heroIvaDebito) * 100) : 0}
                    trackClassName={isDark ? 'bg-white/10' : 'bg-slate-200/80'}
                    barClassName={
                      isDark
                        ? 'bg-gradient-to-r from-[#4FA88B] to-[#D8C39E]'
                        : 'bg-gradient-to-r from-[#2E6F5E] to-[#8C6F42]'
                    }
                  />
                  <div
                    className={cn(
                      'flex items-center justify-between text-[11px] pt-0.5 tabular-nums',
                      isDark ? 'text-[#96A1B5]' : 'text-slate-600'
                    )}
                  >
                    <span>Utilidad Neta Proyectada</span>
                    <span className={cn('font-semibold', isDark ? 'text-[#4FA88B]' : 'text-[#2E6F5E]')}>
                      +<AnimatedNumber value={heroTotalProfit} format="clp" duration={450} />
                    </span>
                  </div>
                </div>

                {/* Partidas interactivas del rubro */}
                <div className="space-y-2 text-xs">
                  <div
                    className={cn(
                      'flex items-center justify-between text-[10px] uppercase tracking-wider px-1',
                      isDark ? 'text-[#96A1B5]' : 'text-slate-500'
                    )}
                  >
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
                          isDark
                            ? included
                              ? 'bg-white/[0.05] border-white/12 hover:border-[#D8C39E]/35 hover:bg-white/[0.08]'
                              : 'bg-white/[0.015] border-white/5 opacity-45 hover:opacity-75'
                            : included
                            ? 'bg-white/75 border-slate-200/90 hover:border-[#8C7148]/45 hover:bg-white'
                            : 'bg-white/35 border-slate-200/50 opacity-50 hover:opacity-80'
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={cn(
                              'h-4 w-4 rounded flex items-center justify-center border shrink-0 transition-colors',
                              included
                                ? isDark
                                  ? 'bg-[#D8C39E] border-[#D8C39E] text-[#06070A]'
                                  : 'bg-[#0F172A] border-[#0F172A] text-[#EDE0C8]'
                                : isDark
                                ? 'border-white/25 bg-transparent'
                                : 'border-slate-300 bg-white'
                            )}
                          >
                            {included && <Check className="h-3 w-3 stroke-[2.6]" />}
                          </span>
                          <div className="min-w-0">
                            <div
                              className={cn(
                                'font-medium truncate',
                                isDark ? 'text-[#EEF1F6]' : 'text-slate-900'
                              )}
                            >
                              {item.servicio}
                            </div>
                            <div
                              className={cn(
                                'text-[11px] mt-0.5',
                                isDark ? 'text-[#96A1B5]' : 'text-slate-500'
                              )}
                            >
                              {item.tipo_doc_costo === 'factura'
                                ? 'Factura (recupera 19% IVA Crédito)'
                                : 'Boleta Honorarios (15,25% configurable)'}
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0 tabular-nums">
                          <div
                            className={cn(
                              'font-semibold',
                              isDark ? 'text-[#EEF1F6]' : 'text-slate-900'
                            )}
                          >
                            {formatCLP((item.costo + item.ganancia) * simScale)}
                          </div>
                          <div
                            className={cn(
                              'text-[10px] font-medium',
                              isDark ? 'text-[#4FA88B]' : 'text-[#2E6F5E]'
                            )}
                          >
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
      <section
        id="capacidades"
        className={cn(
          'scroll-mt-20 py-16 px-4 sm:px-8 border-t transition-colors duration-300',
          isDark
            ? 'border-white/[0.08] bg-[#0B0D13]/60'
            : 'border-white/80 bg-white/40'
        )}
      >
        <div className="max-w-7xl mx-auto space-y-10">
          <Reveal>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="max-w-2xl space-y-2">
                <span
                  className={cn(
                    'text-[10px] uppercase tracking-[0.18em] font-semibold',
                    isDark ? 'text-[#D8C39E]' : 'text-[#8C6F42]'
                  )}
                >
                  Diseñado para {blueprint.name}
                </span>
                <h2
                  className={cn(
                    'text-3xl font-semibold tracking-tight',
                    isDark ? 'text-[#EEF1F6]' : 'text-slate-950'
                  )}
                >
                  Lo que resuelve FIGURA en tu{' '}
                  <span className={cn('editorial-italic', isDark ? 'text-[#D8C39E]' : 'text-[#8C6F42]')}>
                    operación diaria
                  </span>
                </h2>
                <p className={cn('text-sm', isDark ? 'text-[#96A1B5]' : 'text-slate-600')}>
                  {blueprint.ownerPainPoint} Cada peso cotizado, abonado y rendido queda conectado para proteger tu margen neto.
                </p>
              </div>
              <Link href={demoHref}>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    'gap-1.5 font-semibold shrink-0',
                    isDark
                      ? 'border-white/15 bg-white/[0.04] text-[#EEF1F6] hover:bg-white/[0.1] hover:border-[#D8C39E]/40 hover:text-[#EDE0C8]'
                      : 'border-slate-300 bg-white/85 text-slate-800 hover:bg-white'
                  )}
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
                  variant={isDark ? 'obsidian' : 'light'}
                  className="p-6 h-full flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <Badge
                        className={cn(
                          'text-[10px] font-semibold border',
                          isDark
                            ? 'bg-[#D8C39E]/12 text-[#EDE0C8] border-[#D8C39E]/25'
                            : 'bg-[#8C7148]/10 text-[#6F5835] border-[#8C7148]/25'
                        )}
                      >
                        Especial {blueprint.shortName}
                      </Badge>
                      <span
                        className={cn(
                          'text-[11px] font-semibold',
                          isDark ? 'text-[#4FA88B]' : 'text-[#2E6F5E]'
                        )}
                      >
                        {cap.metric}
                      </span>
                    </div>
                    <h3 className={cn('text-lg font-semibold leading-snug', isDark ? 'text-[#EEF1F6]' : 'text-slate-900')}>
                      {cap.title}
                    </h3>
                    <p className={cn('text-xs leading-relaxed', isDark ? 'text-[#96A1B5]' : 'text-slate-600')}>
                      {cap.description}
                    </p>
                  </div>
                </SpotlightCard>
              </Reveal>
            ))}

            <Reveal delay={180}>
              <SpotlightCard variant={isDark ? 'obsidian' : 'light'} className="p-6 h-full space-y-3">
                <div
                  className={cn(
                    'h-10 w-10 rounded-xl flex items-center justify-center border',
                    isDark
                      ? 'bg-[#5E89E8]/12 border-[#5E89E8]/25 text-[#8FB0F7]'
                      : 'bg-[#4A607A]/10 border-[#4A607A]/20 text-[#3B4F66]'
                  )}
                >
                  <Receipt className="h-5 w-5" />
                </div>
                <h3 className={cn('text-lg font-semibold', isDark ? 'text-[#EEF1F6]' : 'text-slate-900')}>
                  IVA F29 &amp; Flujo de Caja en Vivo
                </h3>
                <p className={cn('text-xs leading-relaxed', isDark ? 'text-[#96A1B5]' : 'text-slate-600')}>
                  Calcula automáticamente tu <strong className={isDark ? 'text-[#EEF1F6]' : 'text-slate-900'}>IVA Débito</strong> vs.{' '}
                  <strong className={isDark ? 'text-[#EEF1F6]' : 'text-slate-900'}>IVA Crédito</strong> por compras con factura, abonos recibidos y gastos reales de cada{' '}
                  {blueprint.terminology.projectSingular.toLowerCase()}.
                </p>
              </SpotlightCard>
            </Reveal>

            <Reveal delay={240}>
              <SpotlightCard variant={isDark ? 'obsidian' : 'light'} className="p-6 h-full space-y-3">
                <div
                  className={cn(
                    'h-10 w-10 rounded-xl flex items-center justify-center border',
                    isDark
                      ? 'bg-[#4FA88B]/12 border-[#4FA88B]/25 text-[#7FD3B6]'
                      : 'bg-[#467366]/10 border-[#467366]/20 text-[#2E6F5E]'
                  )}
                >
                  <Sparkles className="h-5 w-5" />
                </div>
                <h3 className={cn('text-lg font-semibold', isDark ? 'text-[#EEF1F6]' : 'text-slate-900')}>
                  Cotización Express + Suite IA OCR
                </h3>
                <p className={cn('text-xs leading-relaxed', isDark ? 'text-[#96A1B5]' : 'text-slate-600')}>
                  Crea una cotización completa en 1 clic desde plantillas de{' '}
                  <strong className={isDark ? 'text-[#EEF1F6]' : 'text-slate-900'}>{blueprint.shortName}</strong> o sube PDF/Excel de proveedores para que la IA sugiera costos y márgenes.
                </p>
              </SpotlightCard>
            </Reveal>

            <Reveal delay={300}>
              <SpotlightCard variant={isDark ? 'obsidian' : 'light'} className="p-6 h-full space-y-3">
                <div
                  className={cn(
                    'h-10 w-10 rounded-xl flex items-center justify-center border',
                    isDark
                      ? 'bg-[#D8C39E]/12 border-[#D8C39E]/25 text-[#EDE0C8]'
                      : 'bg-[#8C7148]/10 border-[#8C7148]/20 text-[#6F5835]'
                  )}
                >
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <h3 className={cn('text-lg font-semibold', isDark ? 'text-[#EEF1F6]' : 'text-slate-900')}>
                  PDF Comercial &amp; Excel Contable
                </h3>
                <p className={cn('text-xs leading-relaxed', isDark ? 'text-[#96A1B5]' : 'text-slate-600')}>
                  Genera propuestas PDF listas para enviar a tu {blueprint.terminology.clientLabel.toLowerCase()} y exporta libros contables en Excel con desglose tributario para tu contador.
                </p>
              </SpotlightCard>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Sección Planes & Paga lo que usas */}
      <section
        id="planes"
        className={cn(
          'scroll-mt-20 py-16 px-4 sm:px-8 border-t transition-colors duration-300',
          isDark ? 'border-white/[0.08]' : 'border-white/80'
        )}
      >
        <div className="max-w-7xl mx-auto space-y-8">
          <Reveal>
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <Badge
                className={cn(
                  'text-[10px] tracking-[0.14em] uppercase border',
                  isDark
                    ? 'bg-[#D8C39E]/12 text-[#EDE0C8] border-[#D8C39E]/25'
                    : 'bg-[#8C7148]/10 text-[#6F5835] border-[#8C7148]/25'
                )}
              >
                Comparativa transparente · Incluye lo que tiene y lo que falta en cada plan
              </Badge>
              <h2
                className={cn(
                  'text-3xl sm:text-4xl font-semibold tracking-tight',
                  isDark ? 'text-[#EEF1F6]' : 'text-slate-950'
                )}
              >
                Invierte según tu etapa o{' '}
                <span className={cn('editorial-italic', isDark ? 'text-[#D8C39E]' : 'text-[#8C6F42]')}>
                  arma tu ERP
                </span>{' '}
                a medida
              </h2>
              <p className={cn('text-sm', isDark ? 'text-[#96A1B5]' : 'text-slate-600')}>
                Planes adaptados a <strong className={isDark ? 'text-[#EEF1F6]' : 'text-slate-900'}>{blueprint.shortName}</strong>. Selecciona cualquier plan para ver el desglose completo o contratar con Khipu.
              </p>
            </div>
          </Reveal>

          <PlansMatrix
            plans={plans}
            addons={addons}
            currentModules={blueprint.recommendedModules}
            industry={blueprint}
            industryName={blueprint.shortName}
            surface={isDark ? 'obsidian' : 'light'}
            onSelectCheckout={handleSelectPlanBeforeRegister}
          />
        </div>
      </section>

      {/* Footer Editorial Minimalista */}
      <footer
        className={cn(
          'border-t py-8 px-4 sm:px-8 backdrop-blur-xl text-xs transition-colors duration-300',
          isDark
            ? 'border-white/[0.08] bg-[#06070A]/80 text-[#96A1B5]'
            : 'border-white/80 bg-white/65 text-slate-600'
        )}
      >
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <FiguraLogo size="sm" surface={isDark ? 'obsidian' : 'light'} />
            <span className="text-[11px] tracking-wide">
              © {new Date().getFullYear()} FIGURA · Arquitectura Financiera Multi-Empresa · Chile
            </span>
          </div>
          <div className="flex items-center gap-6">
            <Link
              href={demoHref}
              className={cn('transition-colors', isDark ? 'hover:text-[#EDE0C8]' : 'hover:text-slate-950')}
            >
              Probar Demo Interactiva
            </Link>
            <Link
              href="/login"
              className={cn('transition-colors', isDark ? 'hover:text-[#EDE0C8]' : 'hover:text-slate-950')}
            >
              Acceso Clientes
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
