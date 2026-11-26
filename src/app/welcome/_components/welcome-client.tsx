'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Clapperboard,
  FlaskConical,
  HardHat,
  Layers,
  LayoutGrid,
  Moon,
  PartyPopper,
  Plane,
  Receipt,
  Scale,
  ShieldCheck,
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
import { Reveal, SpotlightCard, ScrollProgressHairline } from '@/components/ui/motion-primitives';
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
import { HeroConsole } from './hero-console';
import { BeforeAfterSection } from './before-after-section';
import { BenchmarkAndEnterpriseSection } from './benchmark-and-enterprise-section';
import { FaqSection } from './faq-section';

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

interface WelcomeClientProps {
  initialPlans: SubscriptionPlan[];
  initialAddons: SubscriptionAddon[];
}

export function WelcomeClient({ initialPlans, initialAddons }: WelcomeClientProps) {
  const router = useRouter();
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');
  const [selectedIndustry, setSelectedIndustry] = useState<IndustryType>('eventos_banqueteria');
  const [simScale, setSimScale] = useState<1 | 3 | 5>(1);
  const [excludedItemIds, setExcludedItemIds] = useState<string[]>([]);

  const plans = initialPlans.length > 0 ? initialPlans : DEFAULT_PLANS;
  const addons = initialAddons.length > 0 ? initialAddons : DEFAULT_ADDONS;
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
  }, []);

  const toggleTheme = (next: 'light' | 'dark') => {
    setThemeMode(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Ignore storage write errors
    }
  };

  const scrollToSection = useCallback((sectionId: string) => {
    if (typeof window === 'undefined') return;
    const target = document.getElementById(sectionId);
    if (!target) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
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

    const duration = Math.min(520, Math.max(320, Math.abs(distance) * 0.3));
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
  }, []);

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

  const { freePlan, essentialPlan, recommendedPlan, scalePlan, baseAddon } = useMemo(() => {
    const free = plans.find((p) => p.id === 'free') || DEFAULT_PLANS[0];
    const essential = plans.find((p) => p.id === 'essential') || DEFAULT_PLANS[1];
    const recommended =
      plans.find((p) => p.is_recommended) ||
      plans.find((p) => p.id === 'growth') ||
      DEFAULT_PLANS[2];
    const scale = plans.find((p) => p.id === 'scale') || DEFAULT_PLANS[3];
    const base = addons.find((a) => a.id === 'base_custom') || DEFAULT_ADDONS[0];
    return {
      freePlan: free,
      essentialPlan: essential,
      recommendedPlan: recommended,
      scalePlan: scale,
      baseAddon: base,
    };
  }, [plans, addons]);

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

      {/* Navbar Glassmórfica Superior */}
      <header
        className={cn(
          'sticky top-0 z-50 border-b backdrop-blur-2xl transition-colors duration-300',
          isDark
            ? 'border-white/[0.08] bg-[#06070A]/82'
            : 'border-white/85 bg-white/80 shadow-[0_1px_20px_-8px_rgba(15,23,42,0.08)]'
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
              'hidden md:flex items-center gap-6 text-xs font-medium tracking-wide',
              isDark ? 'text-[#A3AFC2]' : 'text-slate-700'
            )}
          >
            <a
              href="#rubros"
              onClick={(e) => handleNavClick(e, 'rubros')}
              className={cn(
                'py-1 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6F42]',
                isDark ? 'hover:text-[#EDE0C8]' : 'hover:text-slate-950'
              )}
            >
              Su Rubro
            </a>
            <a
              href="#capacidades"
              onClick={(e) => handleNavClick(e, 'capacidades')}
              className={cn(
                'py-1 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6F42]',
                isDark ? 'hover:text-[#EDE0C8]' : 'hover:text-slate-950'
              )}
            >
              Capacidades SII
            </a>
            <a
              href="#planes"
              onClick={(e) => handleNavClick(e, 'planes')}
              className={cn(
                'py-1 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6F42]',
                isDark ? 'hover:text-[#EDE0C8]' : 'hover:text-slate-950'
              )}
            >
              Planes CLP
            </a>
            <a
              href="#faq"
              onClick={(e) => handleNavClick(e, 'faq')}
              className={cn(
                'py-1 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6F42]',
                isDark ? 'hover:text-[#EDE0C8]' : 'hover:text-slate-950'
              )}
            >
              Preguntas
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
                  : 'bg-slate-200/75 border-slate-300/75'
              )}
            >
              <button
                type="button"
                aria-pressed={!isDark}
                aria-label="Activar modo claro"
                onClick={() => toggleTheme('light')}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6F42]',
                  !isDark
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-[#A3AFC2] hover:text-[#EEF1F6]'
                )}
              >
                <Sun className="h-3 w-3 text-[#8C6F42]" />
                <span className="hidden sm:inline">Claro</span>
              </button>
              <button
                type="button"
                aria-pressed={isDark}
                aria-label="Activar modo oscuro"
                onClick={() => toggleTheme('dark')}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D8C39E]',
                  isDark
                    ? 'bg-[#D8C39E] text-[#06070A] shadow-xs font-semibold'
                    : 'text-slate-700 hover:text-slate-950'
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
                    : 'border-slate-300/90 bg-white/85 text-slate-800 hover:bg-white hover:border-[#8C7148]/50'
                )}
              >
                <FlaskConical className={cn('h-3.5 w-3.5', isDark ? 'text-[#D8C39E]' : 'text-[#7A5F36]')} />
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

      <main>
        {/* Hero Editorial + Selector 9 Rubros + Consola Financiera SII */}
        <section className="relative pt-6 pb-14 px-4 sm:px-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Selector Inmediato de Rubro */}
            <div
              id="rubros"
              className={cn(
                'scroll-mt-20 rounded-3xl p-4 sm:p-5 space-y-3 animate-reveal-up',
                isDark ? 'obsidian-glass-luxury' : 'glass-luxury'
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                <span
                  className={cn(
                    'text-[11px] uppercase tracking-[0.14em] font-semibold flex items-center gap-2',
                    isDark ? 'text-[#EDE0C8]' : 'text-slate-800'
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
                  Paso 1 · Elija su rubro en Chile para adaptar tarifas, flujo SII y planes en vivo
                </span>
                <Badge
                  className={cn(
                    'text-[10px] font-semibold border',
                    isDark
                      ? 'bg-[#4FA88B]/12 text-[#7FD3B6] border-[#4FA88B]/30'
                      : 'bg-[#467366]/12 text-[#245246] border-[#467366]/25'
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
                        'relative group text-left rounded-2xl p-2.5 sm:p-3 border transition-all duration-200 tactile-press flex flex-col justify-between gap-2 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6F42]',
                        isDark
                          ? active
                            ? 'border-[#D8C39E]/70 bg-gradient-to-br from-[#EDE0C8] via-[#D8C39E] to-[#C2A677] text-[#06070A] shadow-md'
                            : 'bg-white/[0.03] text-[#EEF1F6] border-white/[0.08] hover:border-[#D8C39E]/35 hover:bg-white/[0.06]'
                          : active
                          ? 'border-[#0F172A] bg-gradient-to-br from-[#161C2A] via-[#0F172A] to-[#1E293B] text-[#EEF1F6] shadow-md'
                          : 'bg-white/80 text-slate-900 border-slate-200/90 hover:border-[#8C7148]/50 hover:bg-white'
                      )}
                    >
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
                              : 'bg-slate-900/[0.06] text-[#7A5F36] group-hover:bg-[#8C7148]/15'
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
                                : 'text-[#A3AFC2]'
                              : active
                              ? 'text-[#EDE0C8]/90'
                              : 'text-slate-600'
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

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
              <div className="lg:col-span-7 space-y-5">
                <div
                  className={cn(
                    'inline-flex flex-wrap items-center gap-2 px-3.5 py-1 rounded-full border backdrop-blur-md text-[11px] font-medium tracking-[0.06em] uppercase',
                    isDark
                      ? 'border-[#D8C39E]/25 bg-white/[0.04] text-[#EDE0C8]'
                      : 'border-[#8C7148]/30 bg-white/85 text-slate-800'
                  )}
                >
                  <span>{blueprint.shortName}</span>
                  <span className={isDark ? 'text-white/25' : 'text-slate-300'}>•</span>
                  <span>Meta {blueprint.targetMarginPct}% s/ Venta Neta</span>
                  <span className={isDark ? 'text-white/25' : 'text-slate-300'}>•</span>
                  <span className={cn('font-semibold', isDark ? 'text-[#5AC2A0]' : 'text-[#245A4C]')}>
                    {blueprint.quickWinStat}
                  </span>
                </div>

                <div key={blueprint.id} className="space-y-3.5 animate-reveal-up">
                  <h1
                    className={cn(
                      'text-3xl sm:text-5xl lg:text-[3.25rem] font-semibold tracking-[-0.035em] leading-[1.06]',
                      isDark ? 'text-[#EEF1F6]' : 'text-slate-950'
                    )}
                  >
                    {blueprint.heroHeadlinePrefix}{' '}
                    <span
                      className={cn(
                        'editorial-italic font-normal',
                        isDark ? 'text-[#D8C39E]' : 'text-[#7A5F36]'
                      )}
                    >
                      {blueprint.heroHeadlineAccent}
                    </span>{' '}
                    {blueprint.heroHeadlineSuffix}
                  </h1>

                  <p
                    className={cn(
                      'text-base sm:text-lg leading-relaxed max-w-2xl',
                      isDark ? 'text-[#A3AFC2]' : 'text-slate-700'
                    )}
                  >
                    {blueprint.heroValueProp}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-1">
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
                      Probar Demo sin Tarjeta
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
                          : 'border-slate-300/90 bg-white/85 text-slate-900 hover:bg-white hover:border-[#8C7148]/50'
                      )}
                    >
                      Ver Planes desde {formatCLP(freePlan.price_clp)} · Recomendado{' '}
                      {formatCLP(recommendedPlan.price_clp)}
                    </Button>
                  </a>
                </div>

                <p className={cn('text-xs flex flex-wrap items-center gap-x-4 gap-y-1', isDark ? 'text-[#A3AFC2]' : 'text-slate-600')}>
                  <span>✓ Precios fijos en CLP con IVA incluido</span>
                  <span>✓ Sin tarjeta en Demo ni Plan Semilla ({freePlan.max_projects ?? 2} activos / {freePlan.max_costs ?? 25} tarifas)</span>
                </p>

                {/* Ficha técnica compacta del rubro */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
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
                          isDark ? 'text-[#A3AFC2]' : 'text-slate-600'
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
                              : 'text-[#7A5F36]'
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

              {/* Consola SII en Vivo */}
              <div className="lg:col-span-5">
                <HeroConsole
                  blueprint={blueprint}
                  isDark={isDark}
                  simScale={simScale}
                  onChangeSimScale={setSimScale}
                  excludedItemIds={excludedItemIds}
                  onToggleSampleItem={toggleSampleItem}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Antes en Excel vs Con FIGURA + Simulador de ROI */}
        <BeforeAfterSection
          key={blueprint.id}
          blueprint={blueprint}
          isDark={isDark}
          recommendedPriceClp={recommendedPlan.price_clp}
          essentialPriceClp={essentialPlan.price_clp}
          demoHref={demoHref}
        />

        {/* Sección Capacidades Específicas del Rubro + Capacidades v3 */}
        <section
          id="capacidades"
          className={cn(
            'scroll-mt-20 py-14 px-4 sm:px-8 border-t transition-colors duration-300',
            isDark ? 'border-white/[0.08]' : 'border-slate-200/70'
          )}
        >
          <div className="max-w-7xl mx-auto space-y-8">
            <Reveal>
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="max-w-2xl space-y-2">
                  <span
                    className={cn(
                      'text-[11px] uppercase tracking-[0.16em] font-semibold block',
                      isDark ? 'text-[#D8C39E]' : 'text-[#7A5F36]'
                    )}
                  >
                    Diseñado para {blueprint.name}
                  </span>
                  <h2
                    className={cn(
                      'text-2xl sm:text-3xl font-semibold tracking-tight',
                      isDark ? 'text-[#EEF1F6]' : 'text-slate-950'
                    )}
                  >
                    Lo que resuelve FIGURA en su{' '}
                    <span className={cn('editorial-italic', isDark ? 'text-[#D8C39E]' : 'text-[#7A5F36]')}>
                      operación diaria
                    </span>
                  </h2>
                  <p className={cn('text-sm leading-relaxed', isDark ? 'text-[#A3AFC2]' : 'text-slate-600')}>
                    {blueprint.ownerPainPoint} Cada peso cotizado, abonado y rendido queda trazado para proteger su utilidad neta ex-IVA.
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
                    Explorar {blueprint.shortName} en vivo
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </Reveal>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {blueprint.capabilityHighlights.map((cap, idx) => (
                <Reveal key={cap.title} delay={idx * 50}>
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
                          {blueprint.shortName}
                        </Badge>
                        <span
                          className={cn(
                            'text-[11px] font-semibold',
                            isDark ? 'text-[#5AC2A0]' : 'text-[#245A4C]'
                          )}
                        >
                          {cap.metric}
                        </span>
                      </div>
                      <h3 className={cn('text-lg font-semibold leading-snug', isDark ? 'text-[#EEF1F6]' : 'text-slate-900')}>
                        {cap.title}
                      </h3>
                      <p className={cn('text-xs sm:text-sm leading-relaxed', isDark ? 'text-[#A3AFC2]' : 'text-slate-600')}>
                        {cap.description}
                      </p>
                    </div>
                  </SpotlightCard>
                </Reveal>
              ))}

              <Reveal delay={150}>
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
                    Matemática SII Exacta &amp; F29 en Vivo
                  </h3>
                  <p className={cn('text-xs sm:text-sm leading-relaxed', isDark ? 'text-[#A3AFC2]' : 'text-slate-600')}>
                    Extrae el 19% de IVA Crédito real desde facturas brutas (<code className="text-[11px]">/ 1,19</code>), aplica retención Ley 21.133 (<strong>15,25%</strong>) configurable, respeta ítems exentos y separa gastos reembolsables (<em>pass-through</em>).
                  </p>
                </SpotlightCard>
              </Reveal>

              <Reveal delay={200}>
                <SpotlightCard variant={isDark ? 'obsidian' : 'light'} className="p-6 h-full space-y-3">
                  <div
                    className={cn(
                      'h-10 w-10 rounded-xl flex items-center justify-center border',
                      isDark
                        ? 'bg-[#4FA88B]/12 border-[#4FA88B]/25 text-[#7FD3B6]'
                        : 'bg-[#467366]/10 border-[#467366]/20 text-[#245A4C]'
                    )}
                  >
                    <Layers className="h-5 w-5" />
                  </div>
                  <h3 className={cn('text-lg font-semibold', isDark ? 'text-[#EEF1F6]' : 'text-slate-900')}>
                    Consolidación Padre/Hijo &amp; Portal /q
                  </h3>
                  <p className={cn('text-xs sm:text-sm leading-relaxed', isDark ? 'text-[#A3AFC2]' : 'text-slate-600')}>
                    Incluida desde <strong>Operación Esencial ({formatCLP(essentialPlan.price_clp)})</strong>: agrupa sub-partidas, recetas o prorrateos por PAX ocultando su costo interno, con PDF comercial y Portal <code className="text-[11px]">/q</code> con datos bancarios y aceptación por RUT.
                  </p>
                </SpotlightCard>
              </Reveal>

              <Reveal delay={250}>
                <SpotlightCard variant={isDark ? 'obsidian' : 'light'} className="p-6 h-full space-y-3">
                  <div
                    className={cn(
                      'h-10 w-10 rounded-xl flex items-center justify-center border',
                      isDark
                        ? 'bg-[#D8C39E]/12 border-[#D8C39E]/25 text-[#EDE0C8]'
                        : 'bg-[#8C7148]/10 border-[#8C7148]/20 text-[#7A5F36]'
                    )}
                  >
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <h3 className={cn('text-lg font-semibold', isDark ? 'text-[#EEF1F6]' : 'text-slate-900')}>
                    IA OCR Documental + Excel Contable F29
                  </h3>
                  <p className={cn('text-xs sm:text-sm leading-relaxed', isDark ? 'text-[#A3AFC2]' : 'text-slate-600')}>
                    Sube PDF, Excel o fotos de proveedores para armar borradores calibrados a <strong>{blueprint.shortName}</strong>, concilia cartola/RCV SII y exporta reportes P&amp;L ex-IVA y libro F29 para su contador.
                  </p>
                </SpotlightCard>
              </Reveal>
            </div>
          </div>
        </section>

        {/* Sección Planes & Arma tu ERP v3 */}
        <section
          id="planes"
          className={cn(
            'scroll-mt-20 py-14 px-4 sm:px-8 border-t transition-colors duration-300',
            isDark ? 'border-white/[0.08]' : 'border-slate-200/70'
          )}
        >
          <div className="max-w-7xl mx-auto space-y-7">
            <Reveal>
              <div className="text-center max-w-3xl mx-auto space-y-2.5">
                <Badge
                  className={cn(
                    'text-[10px] tracking-[0.14em] uppercase border',
                    isDark
                      ? 'bg-[#D8C39E]/12 text-[#EDE0C8] border-[#D8C39E]/25'
                      : 'bg-[#8C7148]/10 text-[#6F5835] border-[#8C7148]/25'
                  )}
                >
                  Catálogo Transparente CLP · IVA Incluido vía Khipu
                </Badge>
                <h2
                  className={cn(
                    'text-3xl sm:text-4xl font-semibold tracking-tight',
                    isDark ? 'text-[#EEF1F6]' : 'text-slate-950'
                  )}
                >
                  Invierta según su etapa o{' '}
                  <span className={cn('editorial-italic', isDark ? 'text-[#D8C39E]' : 'text-[#7A5F36]')}>
                    arme su ERP
                  </span>{' '}
                  a medida
                </h2>
                <p className={cn('text-sm leading-relaxed', isDark ? 'text-[#A3AFC2]' : 'text-slate-600')}>
                  Planes calibrados para <strong className={isDark ? 'text-[#EEF1F6]' : 'text-slate-900'}>{blueprint.shortName}</strong>: desde{' '}
                  <strong>Semilla ({formatCLP(freePlan.price_clp)})</strong>,{' '}
                  <strong>{essentialPlan.name} ({formatCLP(essentialPlan.price_clp)})</strong>,{' '}
                  <strong>{recommendedPlan.name} ({formatCLP(recommendedPlan.price_clp)})</strong> o{' '}
                  <strong>{scalePlan.name} ({formatCLP(scalePlan.price_clp)})</strong>, hasta modalidad modular desde{' '}
                  <strong>{formatCLP(baseAddon.price_clp)}</strong> base.
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

        {/* Benchmark Chile + Salto Enterprise */}
        <BenchmarkAndEnterpriseSection
          isDark={isDark}
          essentialPriceClp={essentialPlan.price_clp}
          growthPriceClp={recommendedPlan.price_clp}
          scalePriceClp={scalePlan.price_clp}
          scaleAiLimit={scalePlan.ai_calls_limit}
          industryShortName={blueprint.shortName}
          onSelectEnterprise={() => handleSelectPlanBeforeRegister('scale', [])}
        />

        {/* FAQs orientadas a dueños en Chile */}
        <FaqSection isDark={isDark} />

        {/* Cierre de Conversión */}
        <section className="py-12 px-4 sm:px-8">
          <div className="max-w-5xl mx-auto">
            <SpotlightCard
              variant={isDark ? 'obsidian-luxury' : 'light'}
              className={cn(
                'rounded-3xl p-7 sm:p-10 text-center space-y-5',
                !isDark && 'glass-luxury ring-1 ring-[#8C7148]/25'
              )}
            >
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em]">
                <ShieldCheck className={cn('h-4 w-4', isDark ? 'text-[#5AC2A0]' : 'text-[#245A4C]')} />
                <span className={isDark ? 'text-[#EDE0C8]' : 'text-[#7A5F36]'}>
                  Configurado para {blueprint.name}
                </span>
              </div>
              <h2
                className={cn(
                  'text-2xl sm:text-3xl font-semibold tracking-tight max-w-2xl mx-auto',
                  isDark ? 'text-[#EEF1F6]' : 'text-slate-950'
                )}
              >
                Evalúe su operación real en 60 segundos, sin tarjeta ni compromisos
              </h2>
              <p className={cn('text-sm max-w-xl mx-auto leading-relaxed', isDark ? 'text-[#A3AFC2]' : 'text-slate-600')}>
                Ingrese a la Demo Interactiva de <strong>{blueprint.shortName}</strong> con catálogo, proyectos y proyección F29 precargados, o inicie gratis con el Plan Semilla ({formatCLP(freePlan.price_clp)}).
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                <Link href={demoHref}>
                  <Button
                    size="lg"
                    className={cn(
                      'font-semibold gap-2 px-6 tactile-press',
                      isDark
                        ? 'obsidian-shimmer bg-[#D8C39E] text-[#06070A] hover:bg-[#EDE0C8]'
                        : 'hairline-shimmer bg-[#0F172A] text-[#EDE0C8] hover:bg-[#1E293B]'
                    )}
                  >
                    <FlaskConical className="h-4 w-4" />
                    Probar Demo de {blueprint.shortName}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  onClick={() => handleSelectPlanBeforeRegister('free', [])}
                  className={cn(
                    'font-medium tactile-press',
                    isDark
                      ? 'border-white/15 bg-white/[0.04] text-[#EEF1F6] hover:bg-white/[0.1]'
                      : 'border-slate-300 bg-white/85 text-slate-900 hover:bg-white'
                  )}
                >
                  Crear cuenta Semilla ({formatCLP(freePlan.price_clp)})
                </Button>
              </div>
            </SpotlightCard>
          </div>
        </section>
      </main>

      {/* Footer Editorial Minimalista */}
      <footer
        className={cn(
          'border-t py-8 px-4 sm:px-8 backdrop-blur-xl text-xs transition-colors duration-300',
          isDark
            ? 'border-white/[0.08] bg-[#06070A]/80 text-[#A3AFC2]'
            : 'border-white/80 bg-white/70 text-slate-600'
        )}
      >
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <FiguraLogo size="sm" surface={isDark ? 'obsidian' : 'light'} />
            <span className="text-[11px] tracking-wide">
              © 2026 FIGURA · Arquitectura Financiera Multi-Rubro · Chile
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
