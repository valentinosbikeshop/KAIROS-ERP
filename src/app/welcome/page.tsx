'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
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
import { KairosLogo } from '@/components/ui/kairos-logo';
import {
  AnimatedNumber,
  AnimatedProgressBar,
  Reveal,
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
  const [plans, setPlans] = useState<SubscriptionPlan[]>(DEFAULT_PLANS);
  const [addons, setAddons] = useState<SubscriptionAddon[]>(DEFAULT_ADDONS);
  const [selectedIndustry, setSelectedIndustry] = useState<IndustryType>('eventos_banqueteria');

  useEffect(() => {
    fetch('/api/plans')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data?.plans) && data.plans.length > 0) setPlans(data.plans);
        if (Array.isArray(data?.addons) && data.addons.length > 0) setAddons(data.addons);
      })
      .catch(() => {});
  }, []);

  const blueprint = INDUSTRY_BLUEPRINTS[selectedIndustry];
  const themeDef = THEME_PRESETS[blueprint.recommendedTheme];
  const demoHref = `/demo?industry=${selectedIndustry}`;

  const heroTotalSample = useMemo(
    () =>
      blueprint.starterCatalog
        .slice(0, 3)
        .reduce((acc, item) => acc + item.costo + item.ganancia, 0),
    [blueprint]
  );
  const heroIvaDebito = Math.round(heroTotalSample * 0.19);
  const heroIvaCredito = Math.round(
    blueprint.starterCatalog
      .slice(0, 3)
      .filter((i) => i.tipo_doc_costo === 'factura')
      .reduce((acc, i) => acc + i.costo * 0.19, 0)
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
    <div className="min-h-screen bg-background text-foreground relative overflow-x-clip">
      {/* Fondo arquitectónico con grilla sutil y orbes perlados suaves */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-precision-grid"
        aria-hidden="true"
      >
        <div className="absolute -top-44 -left-32 h-[540px] w-[540px] rounded-full bg-[#647A94]/[0.12] blur-[120px] animate-ambient-drift" />
        <div
          className="absolute top-[24%] -right-40 h-[500px] w-[500px] rounded-full bg-[#5C857A]/[0.1] blur-[125px] animate-ambient-drift"
          style={{ animationDelay: '-9s' }}
        />
      </div>

      {/* Navbar Glassmórfica */}
      <header className="sticky top-0 z-50 border-b border-white/80 bg-white/70 backdrop-blur-2xl shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-4">
          <KairosLogo size="md" responsive subtitle="Precisión Financiera Multi-Rubro" />

          <nav className="hidden md:flex items-center gap-8 text-xs font-medium tracking-wide text-muted-foreground">
            <a href="#rubros" className="hover:text-foreground transition-colors">
              Tu Rubro
            </a>
            <a href="#capacidades" className="hover:text-foreground transition-colors">
              Capacidades
            </a>
            <a href="#planes" className="hover:text-foreground transition-colors">
              Planes
            </a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-2.5">
            <Link href={demoHref}>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs font-medium tactile-press">
                <FlaskConical className="h-3.5 w-3.5 text-[#4A607A]" />
                <span className="hidden sm:inline">Probar Demo</span>
                <span className="sm:hidden">Demo</span>
              </Button>
            </Link>
            <Link href="/login">
              <Button size="sm" className="text-xs font-medium tactile-press">
                Iniciar Sesión
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Editorial + Selector Arquitectónico de Rubro */}
      <section className="relative pt-8 pb-16 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto space-y-9">
          {/* Selector Inmediato de Rubro (Deck Arquitectónico) */}
          <div id="rubros" className="glass-luxury rounded-3xl p-4 sm:p-5 space-y-3.5 animate-reveal-up">
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <span className="text-[11px] uppercase tracking-[0.14em] text-[#3B4F66] font-semibold flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-pulse-ring absolute inline-flex h-full w-full rounded-full bg-[#1261E0] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#1261E0]" />
                </span>
                Paso 1 · Elige tu rubro para adaptar el ERP, sus tarifas y planes en vivo
              </span>
              <Badge className="bg-[#467366]/12 text-[#2E5248] border border-[#467366]/25 text-[10px] font-semibold">
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
                    onClick={() => setSelectedIndustry(ind.id)}
                    className={cn(
                      'group text-left rounded-2xl p-2.5 sm:p-3 border transition-all duration-200 tactile-press flex flex-col justify-between gap-2',
                      active
                        ? 'bg-[#1261E0] text-white border-[#1261E0] shadow-md ring-2 ring-[#1261E0]/25'
                        : 'bg-white/75 text-foreground border-slate-200/90 hover:border-[#1261E0]/45 hover:bg-white'
                    )}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span
                        className={cn(
                          'h-7 w-7 rounded-xl flex items-center justify-center transition-colors',
                          active
                            ? 'bg-white/20 text-white'
                            : 'bg-[#4A607A]/10 text-[#4A607A] group-hover:bg-[#1261E0]/10 group-hover:text-[#1261E0]'
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <span
                        className={cn(
                          'text-[10px] font-mono font-semibold tabular-nums',
                          active ? 'text-white/90' : 'text-muted-foreground'
                        )}
                      >
                        {ind.targetMarginPct}%
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold leading-tight line-clamp-2">
                      {ind.shortName}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex flex-wrap items-center gap-2 px-3 py-1 rounded-full border border-[#4A607A]/25 bg-white/75 backdrop-blur-md text-[11px] font-medium tracking-[0.08em] uppercase text-[#3B4F66] animate-reveal-up">
                <span>{blueprint.shortName}</span>
                <span className="text-slate-300">•</span>
                <span>Meta {blueprint.targetMarginPct}% Neto</span>
                <span className="text-slate-300">•</span>
                <span className="text-[#467366] font-semibold">{blueprint.quickWinStat}</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-[3.35rem] font-semibold tracking-[-0.035em] text-foreground leading-[1.07] animate-reveal-up stagger-1">
                {blueprint.heroHeadlinePrefix}{' '}
                <span className="editorial-italic text-[#1261E0] font-normal">
                  {blueprint.heroHeadlineAccent}
                </span>{' '}
                {blueprint.heroHeadlineSuffix}
              </h1>

              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl animate-reveal-up stagger-2">
                {blueprint.heroValueProp}
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1 animate-reveal-up stagger-3">
                <Link href={demoHref}>
                  <Button size="lg" className="font-semibold gap-2 px-6 tactile-press">
                    <FlaskConical className="h-4 w-4" />
                    Probar Demo Interactiva
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <a href="#planes">
                  <Button size="lg" variant="outline" className="gap-2 font-medium tactile-press">
                    Ver Planes desde $0 · Recomendado $59.990
                  </Button>
                </a>
              </div>

              {/* Ficha rápida del rubro seleccionado */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 animate-reveal-up stagger-4">
                <div className="p-3 rounded-xl glass-subtle">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">
                    Módulo Central
                  </span>
                  <strong className="text-xs sm:text-sm text-foreground mt-0.5 block">
                    {blueprint.terminology.projectPlural}
                  </strong>
                </div>
                <div className="p-3 rounded-xl glass-subtle">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">
                    Catálogo
                  </span>
                  <strong className="text-xs sm:text-sm text-foreground mt-0.5 block">
                    {blueprint.terminology.catalogLabel}
                  </strong>
                </div>
                <div className="p-3 rounded-xl glass-subtle">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">
                    Contraparte
                  </span>
                  <strong className="text-xs sm:text-sm text-foreground mt-0.5 block">
                    {blueprint.terminology.clientLabel}
                  </strong>
                </div>
                <div className="p-3 rounded-xl glass-subtle">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">
                    Estilo Sugerido
                  </span>
                  <strong className="text-xs text-[#4A607A] mt-0.5 block truncate">
                    {themeDef.name}
                  </strong>
                </div>
              </div>
            </div>

            {/* Consola Ejecutiva Glassmórfica Luminosa (IVA + Partidas del Rubro) */}
            <div className="lg:col-span-5 animate-reveal-up stagger-3">
              <div className="rounded-3xl glass-luxury hairline-shimmer p-6 sm:p-7 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.18em] text-[#4A607A] font-semibold">
                      Simulación en Vivo · {blueprint.terminology.catalogLabel}
                    </div>
                    <div className="text-lg font-semibold tracking-tight mt-1 text-foreground">
                      {blueprint.name}
                    </div>
                  </div>
                  <Badge className="bg-[#467366]/12 text-[#34594E] border border-[#467366]/25 text-[11px] font-medium shrink-0">
                    Meta {blueprint.targetMarginPct}%
                  </Badge>
                </div>

                {/* Bloque IVA a fin de mes sin sorpresas */}
                <div className="p-4 rounded-2xl bg-white/75 border border-slate-200/80 space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-foreground font-medium">Proyección IVA F29 ({blueprint.terminology.projectSingular})</span>
                    <span className="text-[10px] text-[#467366] font-semibold uppercase tracking-wider">
                      Cálculo SII en vivo
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs tabular-nums">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">IVA Débito</span>
                      <span className="text-foreground font-semibold">
                        <AnimatedNumber value={heroIvaDebito} format="clp" duration={500} />
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">IVA Crédito</span>
                      <span className="text-[#467366] font-semibold">
                        -<AnimatedNumber value={heroIvaCredito} format="clp" duration={500} />
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-muted-foreground block">Neto a Pagar</span>
                      <span className="text-[#4A607A] font-bold">
                        <AnimatedNumber value={heroIvaNeto} format="clp" duration={500} />
                      </span>
                    </div>
                  </div>
                  <AnimatedProgressBar
                    value={heroIvaDebito > 0 ? Math.round((heroIvaCredito / heroIvaDebito) * 100) : 0}
                    trackClassName="bg-slate-200/80"
                    barClassName="bg-[#467366]"
                  />
                </div>

                {/* Partidas de ejemplo del rubro */}
                <div className="space-y-2 text-xs">
                  {blueprint.starterCatalog.slice(0, 3).map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-2xl bg-white/70 border border-slate-200/80 flex items-center justify-between gap-3 transition-colors hover:bg-white/90"
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-foreground truncate">{item.servicio}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          {item.tipo_doc_costo === 'factura'
                            ? 'Factura (recupera 19% IVA Crédito)'
                            : 'Boleta Honorarios (15,25% configurable)'}
                        </div>
                      </div>
                      <div className="text-right shrink-0 tabular-nums">
                        <div className="text-foreground font-semibold">
                          {formatCLP(item.costo + item.ganancia)}
                        </div>
                        <div className="text-[10px] text-[#467366] font-medium">
                          +{formatCLP(item.ganancia)} util.
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sección Capacidades Específicas del Rubro + Núcleo Financiero */}
      <section id="capacidades" className="py-16 px-4 sm:px-8 border-t border-white/80 bg-white/35">
        <div className="max-w-7xl mx-auto space-y-10">
          <Reveal>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="max-w-2xl space-y-2">
                <span className="text-[10px] uppercase tracking-[0.18em] text-[#4A607A] font-semibold">
                  Diseñado para {blueprint.name}
                </span>
                <h2 className="text-3xl font-semibold tracking-tight text-foreground">
                  Lo que resuelve KAIROS en tu{' '}
                  <span className="editorial-italic text-[#4A607A]">operación diaria</span>
                </h2>
                <p className="text-sm text-muted-foreground">
                  {blueprint.ownerPainPoint} Cada peso cotizado, abonado y rendido queda conectado para proteger tu margen neto.
                </p>
              </div>
              <Link href={demoHref}>
                <Button variant="outline" size="sm" className="gap-1.5 font-semibold shrink-0">
                  Ver {blueprint.shortName} en vivo
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {blueprint.capabilityHighlights.map((cap, idx) => (
              <Reveal key={cap.title} delay={idx * 60}>
                <SpotlightCard className="p-6 h-full flex flex-col justify-between gap-4 border-[#1261E0]/15">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <Badge className="bg-[#1261E0]/10 text-[#0F4FB8] border border-[#1261E0]/20 text-[10px] font-semibold">
                        Especial {blueprint.shortName}
                      </Badge>
                      <span className="text-[11px] font-semibold text-[#467366]">{cap.metric}</span>
                    </div>
                    <h3 className="text-lg font-semibold leading-snug">{cap.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{cap.description}</p>
                  </div>
                </SpotlightCard>
              </Reveal>
            ))}

            <Reveal delay={180}>
              <SpotlightCard className="p-6 h-full space-y-3">
                <div className="h-10 w-10 rounded-xl bg-[#4A607A]/10 text-[#4A607A] flex items-center justify-center">
                  <Receipt className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold">IVA F29 &amp; Flujo de Caja en Vivo</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Calcula automáticamente tu <strong>IVA Débito</strong> vs. <strong>IVA Crédito</strong> por compras con factura, abonos recibidos y gastos reales de cada {blueprint.terminology.projectSingular.toLowerCase()}.
                </p>
              </SpotlightCard>
            </Reveal>

            <Reveal delay={240}>
              <SpotlightCard className="p-6 h-full space-y-3">
                <div className="h-10 w-10 rounded-xl bg-[#467366]/10 text-[#467366] flex items-center justify-center">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold">Cotización Express + Suite IA OCR</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Crea una cotización completa en 1 clic desde plantillas de <strong>{blueprint.shortName}</strong> o sube PDF/Excel de proveedores para que la IA sugiera costos y márgenes.
                </p>
              </SpotlightCard>
            </Reveal>

            <Reveal delay={300}>
              <SpotlightCard className="p-6 h-full space-y-3">
                <div className="h-10 w-10 rounded-xl bg-[#4A607A]/10 text-[#4A607A] flex items-center justify-center">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold">PDF Comercial &amp; Excel Contable</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Genera propuestas PDF listas para enviar a tu {blueprint.terminology.clientLabel.toLowerCase()} y exporta libros contables en Excel con desglose tributario para tu contador.
                </p>
              </SpotlightCard>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Sección Planes & Paga lo que usas */}
      <section id="planes" className="py-16 px-4 sm:px-8 border-t border-white/80">
        <div className="max-w-7xl mx-auto space-y-8">
          <Reveal>
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <Badge className="bg-[#4A607A]/10 text-[#3B4F66] border border-[#4A607A]/25 text-[10px] tracking-[0.14em] uppercase">
                Comparativa transparente · Incluye lo que tiene y lo que falta en cada plan
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
                Invierte según tu etapa o{' '}
                <span className="editorial-italic text-[#4A607A]">arma tu ERP</span> a medida
              </h2>
              <p className="text-sm text-muted-foreground">
                Planes adaptados a <strong>{blueprint.shortName}</strong>. Selecciona cualquier plan para ver el desglose completo o contratar con Khipu.
              </p>
            </div>
          </Reveal>

          <PlansMatrix
            plans={plans}
            addons={addons}
            currentModules={blueprint.recommendedModules}
            industry={blueprint}
            industryName={blueprint.shortName}
            onSelectCheckout={handleSelectPlanBeforeRegister}
          />
        </div>
      </section>

      {/* Footer Glassmórfico Luminoso */}
      <footer className="border-t border-white/80 py-8 px-4 sm:px-8 bg-white/60 backdrop-blur-xl text-muted-foreground text-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <KairosLogo size="sm" />
            <span className="text-[11px] tracking-wide">
              © {new Date().getFullYear()} · Plataforma Multi-Empresa Chile
            </span>
          </div>
          <div className="flex items-center gap-6">
            <Link href={demoHref} className="hover:text-foreground transition-colors">
              Probar Demo Interactiva
            </Link>
            <Link href="/login" className="hover:text-foreground transition-colors">
              Acceso Clientes
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
