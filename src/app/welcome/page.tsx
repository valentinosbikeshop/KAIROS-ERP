'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  FileSpreadsheet,
  FlaskConical,
  GitBranch,
  Layers,
  Receipt,
  Sparkles,
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
              IVA &amp; Trazabilidad
            </a>
            <a href="#planes" className="hover:text-foreground transition-colors">
              Planes
            </a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-2.5">
            <Link href="/demo">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs font-medium tactile-press">
                <FlaskConical className="h-3.5 w-3.5 text-[#4A607A]" />
                <span className="hidden sm:inline">Probar Demo Completa</span>
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
          <div id="rubros" className="glass-card rounded-2xl p-3.5 sm:p-4 space-y-3 animate-reveal-up">
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <span className="text-[11px] uppercase tracking-[0.14em] text-[#4A607A] font-semibold flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-pulse-ring absolute inline-flex h-full w-full rounded-full bg-[#4A607A] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#4A607A]" />
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
                        ? 'bg-[#4A607A] text-white border-[#4A607A] shadow-xs'
                        : 'bg-white/75 text-muted-foreground border-slate-200/90 hover:border-[#4A607A]/40 hover:text-foreground'
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
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#4A607A]/25 bg-white/70 backdrop-blur-md text-[11px] font-medium tracking-[0.1em] uppercase text-[#3B4F66] animate-reveal-up">
                {blueprint.shortName} · Meta {blueprint.targetMarginPct}% Neto
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-semibold tracking-[-0.035em] text-foreground leading-[1.06] animate-reveal-up stagger-1">
                Cero sorpresas con tu{' '}
                <span className="editorial-italic text-[#4A607A] font-normal">
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
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </a>
                <Link href="/demo">
                  <Button size="lg" variant="outline" className="gap-2 font-medium tactile-press">
                    <FlaskConical className="h-4 w-4 text-[#4A607A]" />
                    Probar Demo Completa en Caché
                  </Button>
                </Link>
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

            {/* Consola Ejecutiva Glassmórfica Luminosa (IVA + Trazabilidad) */}
            <div className="lg:col-span-5 animate-reveal-up stagger-3">
              <div className="rounded-3xl glass-luxury hairline-shimmer p-6 sm:p-7 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.18em] text-[#4A607A] font-semibold">
                      Telemetría Financiera en Vivo
                    </div>
                    <div className="text-lg font-semibold tracking-tight mt-1 text-foreground">
                      {blueprint.shortName}
                    </div>
                  </div>
                  <Badge className="bg-[#467366]/12 text-[#34594E] border border-[#467366]/25 text-[11px] font-medium">
                    Meta {blueprint.targetMarginPct}%
                  </Badge>
                </div>

                {/* Bloque IVA a fin de mes sin sorpresas */}
                <div className="p-4 rounded-2xl bg-white/75 border border-slate-200/80 space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-foreground font-medium">Proyección IVA F29 (Ejemplo)</span>
                    <span className="text-[10px] text-[#467366] font-semibold uppercase tracking-wider">
                      Sin sorpresas
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

      {/* Sección Capacidades Profundas: IVA, Trazabilidad, Detalle Operativo e IA */}
      <section id="capacidades" className="py-16 px-4 sm:px-8 border-t border-white/80 bg-white/35">
        <div className="max-w-7xl mx-auto space-y-10">
          <Reveal>
            <div className="max-w-2xl space-y-2">
              <span className="text-[10px] uppercase tracking-[0.18em] text-[#4A607A] font-semibold">
                Ingeniería Operativa &amp; Fiscal · {blueprint.shortName}
              </span>
              <h2 className="text-3xl font-semibold tracking-tight text-foreground">
                Todo lo que puedes dominar con{' '}
                <span className="editorial-italic text-[#4A607A]">precisión financiera</span>
              </h2>
              <p className="text-sm text-muted-foreground">
                Cada peso cotizado, abonado, gastado y rendido queda conectado para que tomes decisiones rápidas y sin incertidumbre tributaria.
              </p>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <Reveal delay={60}>
              <SpotlightCard className="p-6 h-full space-y-3">
                <div className="h-10 w-10 rounded-xl bg-[#4A607A]/10 text-[#4A607A] flex items-center justify-center">
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
                <div className="h-10 w-10 rounded-xl bg-[#467366]/10 text-[#467366] flex items-center justify-center">
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
                <div className="h-10 w-10 rounded-xl bg-[#4A607A]/10 text-[#4A607A] flex items-center justify-center">
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
                <div className="h-10 w-10 rounded-xl bg-[#467366]/10 text-[#467366] flex items-center justify-center">
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
                <div className="h-10 w-10 rounded-xl bg-[#4A607A]/10 text-[#4A607A] flex items-center justify-center">
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
                <div className="h-10 w-10 rounded-xl bg-[#467366]/10 text-[#467366] flex items-center justify-center">
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

      {/* Sección Planes & Paga lo que usas */}
      <section id="planes" className="py-16 px-4 sm:px-8 border-t border-white/80">
        <div className="max-w-7xl mx-auto space-y-8">
          <Reveal>
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <Badge className="bg-[#4A607A]/10 text-[#3B4F66] border border-[#4A607A]/25 text-[10px] tracking-[0.14em] uppercase">
                Haz clic en cualquier plan para ver el detalle completo
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
                Invierte según tu etapa o{' '}
                <span className="editorial-italic text-[#4A607A]">arma tu ERP</span> a medida
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
            <Link href="/demo" className="hover:text-foreground transition-colors">
              Demo en Caché Local
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
