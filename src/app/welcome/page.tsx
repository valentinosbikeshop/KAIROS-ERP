'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  FileSpreadsheet,
  FlaskConical,
  GitBranch,
  Layers,
  Receipt,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { INDUSTRY_BLUEPRINTS, INDUSTRY_LIST, THEME_PRESETS } from '@/lib/industries';
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

export default function WelcomeLandingPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<SubscriptionPlan[]>(DEFAULT_PLANS);
  const [addons, setAddons] = useState<SubscriptionAddon[]>(DEFAULT_ADDONS);
  const [selectedIndustry, setSelectedIndustry] = useState<IndustryType>('eventos_banqueteria');
  const [projectsPerMonth, setProjectsPerMonth] = useState<number>(8);
  const [avgTicketClp, setAvgTicketClp] = useState<number>(1800000);
  const [invoiceSharePct, setInvoiceSharePct] = useState<number>(65);

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

  // Simulador Financiero + IVA F29 + ROI
  const monthlyRevenue = projectsPerMonth * avgTicketClp;
  const ivaDebito = Math.round(monthlyRevenue * 0.19);
  const estimatedCostsNet = Math.round(monthlyRevenue * (1 - blueprint.targetMarginPct / 100));
  const ivaCredito = Math.round(estimatedCostsNet * (invoiceSharePct / 100) * 0.19);
  const ivaNetoPagar = Math.max(0, ivaDebito - ivaCredito);
  const recoveredMarginMonthly = Math.round(monthlyRevenue * 0.045);

  const recommendedPlan =
    plans.find((p) => p.is_recommended) || plans.find((p) => p.id === 'growth') || DEFAULT_PLANS[2];
  const roiMultiple =
    recommendedPlan && recommendedPlan.price_clp > 0
      ? (recoveredMarginMonthly / recommendedPlan.price_clp).toFixed(1)
      : '10.0';

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
      {/* Fondo arquitectónico con grilla de precisión y orbes glaciales */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-precision-grid"
        aria-hidden="true"
      >
        <div className="absolute -top-44 -left-32 h-[540px] w-[540px] rounded-full bg-[#1261E0]/[0.075] blur-[115px] animate-ambient-drift" />
        <div
          className="absolute top-[24%] -right-40 h-[500px] w-[500px] rounded-full bg-[#0D8A72]/[0.065] blur-[120px] animate-ambient-drift"
          style={{ animationDelay: '-9s' }}
        />
      </div>

      {/* Navbar Glassmórfica */}
      <header className="sticky top-0 z-50 border-b border-border/70 bg-white/75 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-4">
          <KairosLogo size="md" responsive subtitle="Precisión Financiera Multi-Rubro" />

          <nav className="hidden md:flex items-center gap-8 text-xs font-medium tracking-wide text-muted-foreground">
            <a href="#rubros" className="hover:text-foreground transition-colors">
              Tu Rubro
            </a>
            <a href="#capacidades" className="hover:text-foreground transition-colors">
              IVA &amp; Trazabilidad
            </a>
            <a href="#simulador" className="hover:text-foreground transition-colors">
              Simulador F29 &amp; ROI
            </a>
            <a href="#planes" className="hover:text-foreground transition-colors">
              Planes
            </a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-2.5">
            <Link href="/demo">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs font-medium tactile-press">
                <FlaskConical className="h-3.5 w-3.5 text-[#1261E0]" />
                <span className="hidden sm:inline">Probar Demo Local</span>
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

      {/* Hero Editorial + Selector Inmediato de Rubro */}
      <section className="relative pt-10 pb-16 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto space-y-10">
          {/* Barra superior de selección de rubro (Primera interacción inmediata) */}
          <div id="rubros" className="glass-card rounded-2xl p-3 sm:p-4 space-y-3 animate-reveal-up">
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#1261E0] font-semibold flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-pulse-ring absolute inline-flex h-full w-full rounded-full bg-[#1261E0] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#1261E0]" />
                </span>
                Paso 1 · Elige tu rubro para adaptar todo el ERP en vivo
              </span>
              <span className="text-[11px] text-muted-foreground hidden sm:inline">
                9 industrias configuradas con catálogo CLP, retenciones SII y márgenes reales
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {INDUSTRY_LIST.map((ind) => {
                const active = selectedIndustry === ind.id;
                return (
                  <button
                    key={ind.id}
                    type="button"
                    onClick={() => setSelectedIndustry(ind.id)}
                    className={cn(
                      'px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-medium border transition-all duration-200 tactile-press',
                      active
                        ? 'bg-[#0D1829] text-white border-[#0D1829] shadow-sm'
                        : 'bg-white/80 text-muted-foreground border-border/80 hover:border-[#1261E0]/40 hover:text-foreground'
                    )}
                  >
                    {ind.shortName}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#1261E0]/25 bg-[#1261E0]/[0.06] text-[11px] font-mono font-medium tracking-[0.12em] uppercase text-[#0F4FB8] animate-reveal-up">
                {blueprint.shortName} · Meta {blueprint.targetMarginPct}% Neto
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-semibold tracking-[-0.035em] text-foreground leading-[1.06] animate-reveal-up stagger-1">
                Cero sorpresas con tu{' '}
                <span className="editorial-italic text-[#1261E0] font-normal">
                  IVA a fin de mes
                </span>
                . Control total peso a peso.
              </h1>

              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl animate-reveal-up stagger-2">
                {blueprint.ownerPainPoint} KAIROS ERP unifica cotizaciones, trazabilidad de abonos y gastos reales, retenciones de honorarios (15,25%) e IVA Débito vs. Crédito en tiempo real para <strong>{blueprint.name}</strong>.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1 animate-reveal-up stagger-3">
                <a href="#planes">
                  <Button size="lg" className="font-semibold gap-2 px-6 tactile-press">
                    Ver Planes desde $0 · Recomendado $59.990
                    <ArrowRight className="h-4 w-4 text-[#38BDF8]" />
                  </Button>
                </a>
                <Link href="/demo">
                  <Button size="lg" variant="outline" className="gap-2 font-medium tactile-press">
                    <FlaskConical className="h-4 w-4 text-[#1261E0]" />
                    Probar Demo en Caché
                  </Button>
                </Link>
              </div>

              {/* Ficha rápida del rubro seleccionado */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 animate-reveal-up stagger-4">
                <div className="p-3 rounded-xl bg-white/80 border border-border/80">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground block">
                    Módulo Central
                  </span>
                  <strong className="text-xs sm:text-sm text-foreground mt-0.5 block">
                    {blueprint.terminology.projectPlural}
                  </strong>
                </div>
                <div className="p-3 rounded-xl bg-white/80 border border-border/80">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground block">
                    Catálogo
                  </span>
                  <strong className="text-xs sm:text-sm text-foreground mt-0.5 block">
                    {blueprint.terminology.catalogLabel}
                  </strong>
                </div>
                <div className="p-3 rounded-xl bg-white/80 border border-border/80">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground block">
                    Contraparte
                  </span>
                  <strong className="text-xs sm:text-sm text-foreground mt-0.5 block">
                    {blueprint.terminology.clientLabel}
                  </strong>
                </div>
                <div className="p-3 rounded-xl bg-white/80 border border-border/80">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground block">
                    Estilo Sugerido
                  </span>
                  <strong className="text-xs text-[#1261E0] mt-0.5 block truncate">
                    {themeDef.name}
                  </strong>
                </div>
              </div>
            </div>

            {/* Consola Ejecutiva en Vivo (IVA + Trazabilidad) */}
            <div className="lg:col-span-5 animate-reveal-up stagger-3">
              <div className="rounded-3xl glass-luxury hairline-shimmer text-slate-100 p-6 sm:p-7 space-y-5">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#38BDF8]">
                      Telemetría Financiera en Vivo
                    </div>
                    <div className="text-lg font-semibold tracking-tight mt-1">
                      {blueprint.shortName}
                    </div>
                  </div>
                  <Badge className="bg-[#0D8A72]/25 text-[#5EEAD4] border border-[#2DD4BF]/35 font-mono text-[11px]">
                    Meta {blueprint.targetMarginPct}%
                  </Badge>
                </div>

                {/* Bloque IVA a fin de mes sin sorpresas */}
                <div className="p-4 rounded-2xl bg-white/[0.04] border border-sky-400/20 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-medium">Proyección IVA F29 (Ejemplo)</span>
                    <span className="font-mono text-[10px] text-[#5EEAD4] uppercase tracking-wider">
                      Sin sorpresas
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs font-mono tabular-nums">
                    <div>
                      <span className="text-[10px] text-slate-400 block">IVA Débito</span>
                      <span className="text-slate-200 font-semibold">
                        <AnimatedNumber value={heroIvaDebito} format="clp" duration={500} />
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">IVA Crédito</span>
                      <span className="text-[#5EEAD4] font-semibold">
                        -<AnimatedNumber value={heroIvaCredito} format="clp" duration={500} />
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">Neto a Pagar</span>
                      <span className="text-[#38BDF8] font-bold">
                        <AnimatedNumber value={heroIvaNeto} format="clp" duration={500} />
                      </span>
                    </div>
                  </div>
                  <AnimatedProgressBar
                    value={heroIvaDebito > 0 ? Math.round((heroIvaCredito / heroIvaDebito) * 100) : 0}
                    trackClassName="bg-white/10"
                    barClassName="bg-[#2DD4BF]"
                  />
                </div>

                {/* Partidas de ejemplo del rubro */}
                <div className="space-y-2 text-xs">
                  {blueprint.starterCatalog.slice(0, 3).map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-2xl bg-white/[0.035] border border-white/[0.08] flex items-center justify-between gap-3 transition-colors hover:bg-white/[0.06]"
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-white truncate">{item.servicio}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {item.tipo_doc_costo === 'factura'
                            ? 'Factura (recupera 19% IVA Crédito)'
                            : 'Boleta Honorarios (15,25% configurable)'}
                        </div>
                      </div>
                      <div className="text-right font-mono shrink-0 tabular-nums">
                        <div className="text-[#38BDF8] font-semibold">
                          {formatCLP(item.costo + item.ganancia)}
                        </div>
                        <div className="text-[10px] text-[#5EEAD4]">
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

      {/* Sección Capacidades Profundas: IVA, Trazabilidad, Detalle Operativo e IA */}
      <section id="capacidades" className="py-16 px-4 sm:px-8 border-t border-border/70 bg-white/50">
        <div className="max-w-7xl mx-auto space-y-10">
          <Reveal>
            <div className="max-w-2xl space-y-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#1261E0] font-semibold">
                Ingeniería Operativa &amp; Fiscal · {blueprint.shortName}
              </span>
              <h2 className="text-3xl font-semibold tracking-tight text-foreground">
                Todo lo que puedes dominar con{' '}
                <span className="editorial-italic text-[#1261E0]">precisión financiera</span>
              </h2>
              <p className="text-sm text-muted-foreground">
                Cada peso cotizado, abonado, gastado y rendido queda conectado para que tomes decisiones rápidas y sin incertidumbre tributaria.
              </p>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <Reveal delay={60}>
              <SpotlightCard className="p-6 h-full space-y-3">
                <div className="h-10 w-10 rounded-xl bg-[#1261E0]/10 text-[#1261E0] flex items-center justify-center">
                  <Receipt className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold">IVA a Fin de Mes Sin Sorpresas</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  KAIROS calcula en vivo tu <strong>IVA Débito</strong> por ventas facturadas menos tu <strong>IVA Crédito</strong> de compras con factura. Sabes desde el día 1 cuánto pagarás en el Formulario 29, evitando sustos de caja.
                </p>
              </SpotlightCard>
            </Reveal>

            <Reveal delay={120}>
              <SpotlightCard className="p-6 h-full space-y-3">
                <div className="h-10 w-10 rounded-xl bg-[#0D8A72]/10 text-[#0D8A72] flex items-center justify-center">
                  <GitBranch className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold">Trazabilidad Peso a Peso</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Sigue el ciclo completo de cada {blueprint.terminology.projectSingular.toLowerCase()}: <strong>Cotización → Aprobación → Abonos de Clientes → Gastos Reales → Cierre P&amp;L</strong>. Nada se pierde entre chats o planillas sueltas.
                </p>
              </SpotlightCard>
            </Reveal>

            <Reveal delay={180}>
              <SpotlightCard className="p-6 h-full space-y-3">
                <div className="h-10 w-10 rounded-xl bg-[#0284C7]/10 text-[#0284C7] flex items-center justify-center">
                  <Layers className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold">Operación al Detalle &amp; Cero Fugas</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Agrupa partidas padre/hijo, prorratea insumos unitarios, controla fletes y configura quién asume la retención del <strong>15,25% en Boletas de Honorarios</strong> (Empresa, Contratado o 50/50).
                </p>
              </SpotlightCard>
            </Reveal>

            <Reveal delay={240}>
              <SpotlightCard className="p-6 h-full space-y-3">
                <div className="h-10 w-10 rounded-xl bg-[#1261E0]/10 text-[#1261E0] flex items-center justify-center">
                  <Wallet className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold">Flujo de Caja &amp; Cobranza Clara</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Visualiza al instante cuánto te han abonado, qué saldo está pendiente por cobrar y cuánto margen real queda libre después de pagar proveedores y personal.
                </p>
              </SpotlightCard>
            </Reveal>

            <Reveal delay={300}>
              <SpotlightCard className="p-6 h-full space-y-3">
                <div className="h-10 w-10 rounded-xl bg-[#0D8A72]/10 text-[#0D8A72] flex items-center justify-center">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold">Suite IA + OCR Documental</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Sube un PDF, Excel o foto de cotización de proveedor y nuestra IA optimizada extrae ítems, detecta costos ocultos y sugiere mejoras de margen en segundos.
                </p>
              </SpotlightCard>
            </Reveal>

            <Reveal delay={360}>
              <SpotlightCard className="p-6 h-full space-y-3">
                <div className="h-10 w-10 rounded-xl bg-[#0D1829]/10 text-[#0D1829] flex items-center justify-center">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold">PDF Comercial &amp; Excel Contable</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Genera cotizaciones PDF ejecutivas para enviar a tu {blueprint.terminology.clientLabel.toLowerCase()} e informes contables con desglose tributario listos para tu contador.
                </p>
              </SpotlightCard>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Simulador Interactivo de IVA F29 & Retorno (ROI) */}
      <section id="simulador" className="py-16 px-4 sm:px-8 border-t border-border/70">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          <div className="lg:col-span-6 glass-card rounded-3xl p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#1261E0] font-semibold">
                Simulador Financiero &amp; Tributario
              </span>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
                Proyecta tu operación mensual en {blueprint.shortName}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Ajusta tu volumen mensual para ver tu facturación, el IVA F29 estimado y cuánto margen recuperas evitando fugas operativas.
              </p>
            </div>

            <div className="space-y-5 text-xs">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium text-foreground">{blueprint.terminology.projectPlural} al mes</span>
                  <span className="font-mono font-semibold text-[#1261E0]">{projectsPerMonth}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={40}
                  value={projectsPerMonth}
                  onChange={(e) => setProjectsPerMonth(Number(e.target.value))}
                  className="w-full accent-[#1261E0] cursor-pointer"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium text-foreground">
                    Ticket neto promedio por {blueprint.terminology.projectSingular.toLowerCase()}
                  </span>
                  <span className="font-mono font-semibold text-[#1261E0] tabular-nums">
                    {formatCLP(avgTicketClp)}
                  </span>
                </div>
                <input
                  type="range"
                  min={300000}
                  max={15000000}
                  step={100000}
                  value={avgTicketClp}
                  onChange={(e) => setAvgTicketClp(Number(e.target.value))}
                  className="w-full accent-[#1261E0] cursor-pointer"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium text-foreground">
                    % de tus costos respaldados con Factura (IVA Crédito)
                  </span>
                  <span className="font-mono font-semibold text-[#0D8A72]">{invoiceSharePct}%</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={100}
                  step={5}
                  value={invoiceSharePct}
                  onChange={(e) => setInvoiceSharePct(Number(e.target.value))}
                  className="w-full accent-[#0D8A72] cursor-pointer"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {blueprint.categories.map((cat) => (
                <span
                  key={cat}
                  className="px-2.5 py-1 rounded-full bg-secondary/70 border border-border/80 text-[11px] font-medium text-muted-foreground"
                >
                  {cat}
                </span>
              ))}
            </div>
          </div>

          <div className="lg:col-span-6 rounded-3xl glass-luxury hairline-shimmer text-slate-100 p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[#38BDF8]">
                <TrendingUp className="h-4 w-4" />
                Resultado Proyectado Mensual
              </div>
              <Badge className="bg-white/10 text-slate-200 border border-white/15 font-mono text-[10px]">
                Plan Recomendado: $59.990
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-1">
                <span className="text-xs text-slate-400">Facturación Neta Mensual</span>
                <div className="text-2xl font-semibold font-mono text-white">
                  <AnimatedNumber value={monthlyRevenue} format="clp" duration={420} />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.04] border border-sky-400/25 space-y-1">
                <span className="text-xs text-slate-300">IVA F29 Estimado a Pagar</span>
                <div className="text-2xl font-semibold font-mono text-[#38BDF8]">
                  <AnimatedNumber value={ivaNetoPagar} format="clp" duration={420} />
                </div>
                <span className="text-[10px] text-slate-400 block font-mono">
                  Débito {formatCLP(ivaDebito)} − Crédito {formatCLP(ivaCredito)}
                </span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[#0D8A72]/20 border border-[#2DD4BF]/35 space-y-1.5">
              <div className="text-xs text-slate-200 flex items-center justify-between">
                <span>Utilidad protegida estimada / mes (+4,5% control de fugas)</span>
                <CheckCircle2 className="h-4 w-4 text-[#2DD4BF]" />
              </div>
              <div className="text-3xl font-semibold font-mono text-[#5EEAD4]">
                +<AnimatedNumber value={recoveredMarginMonthly} format="clp" duration={450} />
              </div>
              <div className="text-xs text-slate-200">
                Equivale a <strong className="text-white">{roiMultiple}x</strong> el valor del Plan Crecimiento Inteligente ($59.990/mes).
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sección Planes & Paga lo que usas */}
      <section id="planes" className="py-16 px-4 sm:px-8 border-t border-border/70 bg-white/40">
        <div className="max-w-7xl mx-auto space-y-8">
          <Reveal>
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <Badge className="bg-[#1261E0]/10 text-[#0F4FB8] border border-[#1261E0]/25 font-mono text-[10px] tracking-[0.16em] uppercase">
                Haz clic en cualquier plan para ver el detalle completo
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
                Invierte según tu etapa o{' '}
                <span className="editorial-italic text-[#1261E0]">arma tu ERP</span> a medida
              </h2>
              <p className="text-sm text-muted-foreground">
                Selecciona tu modalidad para <strong>{blueprint.shortName}</strong> y pasa directo a crear tu espacio privado con Khipu o en plan gratuito.
              </p>
            </div>
          </Reveal>

          <PlansMatrix
            plans={plans}
            addons={addons}
            currentModules={blueprint.recommendedModules}
            industryName={blueprint.shortName}
            onSelectCheckout={handleSelectPlanBeforeRegister}
          />
        </div>
      </section>

      {/* Footer Sobrio */}
      <footer className="border-t border-white/[0.08] py-8 px-4 sm:px-8 bg-[#080E1A] text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <KairosLogo size="sm" darkSurface />
            <span className="font-mono text-[11px] tracking-wide text-slate-400">
              © {new Date().getFullYear()} · Plataforma Multi-Empresa Chile
            </span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/demo" className="hover:text-white transition-colors">
              Demo en Caché Local
            </Link>
            <Link href="/login" className="hover:text-white transition-colors">
              Acceso Clientes
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
