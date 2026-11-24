'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  BarChart3,
  Check,
  FileSpreadsheet,
  FlaskConical,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { INDUSTRY_BLUEPRINTS, INDUSTRY_LIST, THEME_PRESETS } from '@/lib/industries';
import { DEFAULT_ADDONS, DEFAULT_PLANS } from '@/lib/entitlements';
import { PlansMatrix } from '@/components/billing/plans-matrix';
import { KairosLogo } from '@/components/ui/kairos-logo';
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

  // Calculadora ROI: estima el margen recuperado (4.5% típico por costos ocultos/retenciones SII)
  const monthlyRevenue = projectsPerMonth * avgTicketClp;
  const recoveredMarginMonthly = Math.round(monthlyRevenue * 0.045);
  const recommendedPlan = plans.find((p) => p.is_recommended) || plans[2] || DEFAULT_PLANS[2];
  const roiMultiple =
    recommendedPlan && recommendedPlan.price_clp > 0
      ? (recoveredMarginMonthly / recommendedPlan.price_clp).toFixed(1)
      : '10.0';

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
      {/* Ambient architectural light orbs */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-grain"
        aria-hidden="true"
      >
        <div className="absolute -top-40 -left-32 h-[520px] w-[520px] rounded-full bg-[#9A7B4F]/[0.07] blur-[110px] animate-ambient-drift" />
        <div
          className="absolute top-[28%] -right-40 h-[460px] w-[460px] rounded-full bg-[#171715]/[0.045] blur-[120px] animate-ambient-drift"
          style={{ animationDelay: '-9s' }}
        />
      </div>

      {/* Navbar Glassmórfica */}
      <header className="sticky top-0 z-50 border-b border-border/65 bg-[#FCFBF9]/75 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-4">
          <KairosLogo size="md" subtitle="Arquitectura Financiera Multi-Rubro" />

          <nav className="hidden md:flex items-center gap-8 text-xs font-medium tracking-wide text-muted-foreground">
            <a href="#rubros" className="hover:text-foreground transition-colors">
              Rubros
            </a>
            <a href="#roi" className="hover:text-foreground transition-colors">
              Retorno Financiero
            </a>
            <a href="#planes" className="hover:text-foreground transition-colors">
              Planes &amp; Paga lo que usas
            </a>
          </nav>

          <div className="flex items-center gap-2.5">
            <Link href="/demo">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs font-medium tactile-press">
                <FlaskConical className="h-3.5 w-3.5 text-[#9A7B4F]" />
                Probar Demo Local
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

      {/* Hero Editorial */}
      <section className="relative pt-14 pb-20 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#9A7B4F]/30 bg-[#9A7B4F]/[0.07] text-[11px] font-mono font-medium tracking-[0.14em] uppercase text-[#7C613B] animate-reveal-up">
              <span className="h-1.5 w-1.5 rounded-full bg-[#9A7B4F]" />
              Ingeniería Financiera &amp; IA · Chile
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[3.65rem] font-semibold tracking-[-0.035em] text-foreground leading-[1.06] animate-reveal-up stagger-1">
              Deja de cotizar al ojo.{' '}
              <span className="editorial-italic text-[#9A7B4F] font-normal">
                Protege el margen real
              </span>{' '}
              de cada proyecto.
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl animate-reveal-up stagger-2">
              KAIROS ERP se adapta al giro exacto de tu empresa: convierte cotizaciones PDF o Excel en presupuestos con IVA 19% y retenciones SII (15,25%) calculadas al peso, controla abonos vs. gastos reales y revela cuánta utilidad neta queda en caja.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2 animate-reveal-up stagger-3">
              <a href="#planes">
                <Button size="lg" className="font-medium gap-2 px-6 tactile-press">
                  Elegir Plan y Comenzar
                  <ArrowRight className="h-4 w-4 text-[#C9AD82]" />
                </Button>
              </a>
              <Link href="/demo">
                <Button size="lg" variant="outline" className="gap-2 font-medium tactile-press">
                  <FlaskConical className="h-4 w-4 text-[#9A7B4F]" />
                  Explorar Demo en Caché
                </Button>
              </Link>
            </div>

            <div className="flex flex-wrap gap-6 pt-3 text-xs text-muted-foreground animate-reveal-up stagger-4">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-[#356854]" />
                Pagos mensuales con Khipu
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-[#9A7B4F]" />
                Asistente IA optimizado para CLP &amp; SII
              </span>
              <span className="inline-flex items-center gap-1.5">
                <FileSpreadsheet className="h-4 w-4 text-foreground/70" />
                Exportación PDF Comercial &amp; Excel F29
              </span>
            </div>
          </div>

          {/* Maqueta Glassmórfica de Precisión */}
          <div className="lg:col-span-5 animate-reveal-up stagger-3">
            <div className="rounded-3xl glass-luxury hairline-shimmer text-[#F7F5F0] p-6 sm:p-7 space-y-5">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#C9AD82]">
                    Control Ejecutivo en Vivo
                  </div>
                  <div className="text-lg font-semibold tracking-tight mt-1">{blueprint.shortName}</div>
                </div>
                <Badge className="bg-[#356854]/20 text-[#9FD3BC] border border-[#356854]/40 font-mono text-[11px]">
                  Meta {blueprint.targetMarginPct}%
                </Badge>
              </div>

              <div className="space-y-2.5 text-xs">
                {blueprint.starterCatalog.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl bg-white/[0.035] border border-white/[0.08] flex items-center justify-between gap-3 transition-colors hover:bg-white/[0.06]"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-[#F7F5F0] truncate">{item.servicio}</div>
                      <div className="text-[11px] text-stone-400 mt-0.5">
                        {item.tipo_doc_costo === 'factura' ? 'Factura (IVA Crédito)' : 'Boleta Honorarios (15,25%)'}
                      </div>
                    </div>
                    <div className="text-right font-mono shrink-0 tabular-nums">
                      <div className="text-[#D7BE96] font-semibold">
                        {formatCLP(item.costo + item.ganancia)}
                      </div>
                      <div className="text-[10px] text-[#9FD3BC]">
                        +{formatCLP(item.ganancia)} util.
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl bg-black/35 border border-[#9A7B4F]/25 p-4 flex items-center justify-between">
                <div className="text-xs text-stone-300">
                  Fugas evitadas por proyecto
                  <span className="block text-[11px] text-stone-400 mt-0.5">
                    Fletes, insumos prorrateados y retenciones
                  </span>
                </div>
                <div className="text-xl font-semibold font-mono text-[#9FD3BC] tabular-nums">
                  +4.5% Margen
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Selector Interactivo de los 9 Rubros */}
      <section id="rubros" className="py-16 px-4 sm:px-8 border-t border-border/65 bg-secondary/35">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="max-w-2xl space-y-2">
            <span className="inline-block font-mono text-[10px] uppercase tracking-[0.2em] text-[#9A7B4F]">
              9 Industrias Pre-Configuradas
            </span>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground">
              Un ERP que habla el <span className="editorial-italic text-[#9A7B4F]">idioma exacto</span> de tu negocio
            </h2>
            <p className="text-sm text-muted-foreground">
              Selecciona tu rubro para inspeccionar cómo KAIROS adapta módulos, catálogo y reglas financieras al instante.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {INDUSTRY_LIST.map((ind) => {
              const active = selectedIndustry === ind.id;
              return (
                <button
                  key={ind.id}
                  type="button"
                  onClick={() => setSelectedIndustry(ind.id)}
                  className={cn(
                    'px-3.5 py-2 rounded-xl text-xs font-medium border transition-all duration-200 tactile-press',
                    active
                      ? 'bg-[#171715] text-[#F7F5F0] border-[#171715] shadow-sm'
                      : 'bg-card/80 text-muted-foreground border-border/80 hover:border-[#9A7B4F]/40 hover:text-foreground'
                  )}
                >
                  {ind.shortName}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            <div className="lg:col-span-7 glass-card rounded-3xl p-6 sm:p-8 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-2xl font-semibold tracking-tight text-foreground">{blueprint.name}</h3>
                <Badge className="bg-[#171715] text-[#D7BE96] border border-[#9A7B4F]/30 font-mono text-[10px] tracking-wider">
                  {themeDef.name}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{blueprint.ownerPainPoint}</p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-background/80 border border-border/75">
                  <span className="text-muted-foreground block text-[10px] uppercase tracking-wider font-mono">Módulo Central</span>
                  <strong className="text-foreground mt-1 block font-semibold">{blueprint.terminology.projectPlural}</strong>
                </div>
                <div className="p-3.5 rounded-2xl bg-background/80 border border-border/75">
                  <span className="text-muted-foreground block text-[10px] uppercase tracking-wider font-mono">Catálogo</span>
                  <strong className="text-foreground mt-1 block font-semibold">{blueprint.terminology.catalogLabel}</strong>
                </div>
                <div className="p-3.5 rounded-2xl bg-background/80 border border-border/75">
                  <span className="text-muted-foreground block text-[10px] uppercase tracking-wider font-mono">Contraparte</span>
                  <strong className="text-foreground mt-1 block font-semibold">{blueprint.terminology.clientLabel}</strong>
                </div>
                <div className="p-3.5 rounded-2xl bg-background/80 border border-border/75">
                  <span className="text-muted-foreground block text-[10px] uppercase tracking-wider font-mono">Margen Meta</span>
                  <strong className="text-[#356854] font-mono mt-1 block font-semibold">{blueprint.targetMarginPct}% Neto</strong>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {blueprint.categories.map((cat) => (
                  <span
                    key={cat}
                    className="px-3 py-1 rounded-full bg-background/90 border border-border/80 text-[11px] font-medium text-muted-foreground"
                  >
                    {cat}
                  </span>
                ))}
              </div>
            </div>

            {/* Calculadora ROI */}
            <div id="roi" className="lg:col-span-5 rounded-3xl glass-luxury hairline-shimmer text-[#F7F5F0] p-6 sm:p-8 flex flex-col justify-between space-y-5">
              <div className="space-y-1">
                <div className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-[#C9AD82] flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Calculadora de Retorno (ROI)
                </div>
                <h3 className="text-xl font-semibold tracking-tight">¿Cuánto dinero recuperas al mes?</h3>
              </div>

              <div className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-stone-300">{blueprint.terminology.projectPlural} al mes</span>
                    <span className="font-mono font-semibold text-[#D7BE96]">{projectsPerMonth}</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={40}
                    value={projectsPerMonth}
                    onChange={(e) => setProjectsPerMonth(Number(e.target.value))}
                    className="w-full accent-[#C9AD82] cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-stone-300">Ticket promedio por {blueprint.terminology.projectSingular.toLowerCase()}</span>
                    <span className="font-mono font-semibold text-[#D7BE96] tabular-nums">
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
                    className="w-full accent-[#C9AD82] cursor-pointer"
                  />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.06] border border-[#9A7B4F]/30 space-y-1.5">
                <div className="text-xs text-stone-300">Utilidad protegida estimada / mes</div>
                <div className="text-3xl font-semibold font-mono text-[#9FD3BC] tabular-nums">
                  +{formatCLP(recoveredMarginMonthly)}
                </div>
                <div className="text-[11px] text-[#D7BE96]">
                  Equivale a <strong>{roiMultiple}x</strong> el valor mensual del Plan Recomendado.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sección Planes & Paga lo que usas (Previo a Crear Cuenta) */}
      <section id="planes" className="py-16 px-4 sm:px-8 border-t border-border/65">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <Badge className="bg-[#9A7B4F]/12 text-[#7C613B] border border-[#9A7B4F]/30 font-mono text-[10px] tracking-[0.16em] uppercase">
              Paso 1 antes de crear tu cuenta
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
              Elige tu plan o <span className="editorial-italic text-[#9A7B4F]">arma tu ERP</span> a medida
            </h2>
            <p className="text-sm text-muted-foreground">
              Selecciona la modalidad que mejor calza con tu operación en <strong>{blueprint.shortName}</strong> y pasa directo a crear tu espacio privado.
            </p>
          </div>

          <PlansMatrix
            plans={plans}
            addons={addons}
            currentModules={blueprint.recommendedModules}
            onSelectCheckout={handleSelectPlanBeforeRegister}
          />
        </div>
      </section>

      {/* Footer Sobrio */}
      <footer className="border-t border-white/[0.08] py-8 px-4 sm:px-8 bg-[#121210] text-stone-400 text-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <span className="font-mono text-[11px] tracking-wide">
            © {new Date().getFullYear()} KAIROS ERP · Plataforma Multi-Empresa Chile
          </span>
          <div className="flex items-center gap-6">
            <Link href="/demo" className="hover:text-[#F7F5F0] transition-colors">
              Demo en Caché Local
            </Link>
            <Link href="/login" className="hover:text-[#F7F5F0] transition-colors">
              Acceso Clientes
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
