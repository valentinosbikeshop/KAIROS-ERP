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
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar Glassmórfica */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-white/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-4">
          <KairosLogo size="md" subtitle="ERP Financiero Multi-Rubro" />

          <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-slate-600">
            <a href="#rubros" className="hover:text-slate-950 transition-colors">
              Rubros
            </a>
            <a href="#roi" className="hover:text-slate-950 transition-colors">
              Retorno Financiero
            </a>
            <a href="#planes" className="hover:text-slate-950 transition-colors">
              Planes & Paga lo que usas
            </a>
          </nav>

          <div className="flex items-center gap-2.5">
            <Link href="/demo">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs font-semibold tactile-press">
                <FlaskConical className="h-3.5 w-3.5 text-amber-600" />
                Probar Demo Local
              </Button>
            </Link>
            <Link href="/login">
              <Button size="sm" className="text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white tactile-press">
                Iniciar Sesión
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Editorial */}
      <section className="relative overflow-hidden pt-14 pb-20 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <Badge className="bg-slate-900 text-amber-300 border-0 px-3 py-1 text-[11px] font-semibold tracking-wide">
              INGENIERÍA FINANCIERA + IA PARA EMPRESAS EN CHILE
            </Badge>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-950 leading-[1.06]">
              Deja de cotizar al ojo.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-amber-700 to-slate-900">
                Protege el margen real
              </span>{' '}
              de cada proyecto.
            </h1>

            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
              KAIROS ERP se adapta al giro exacto de tu empresa: convierte cotizaciones PDF o Excel en presupuestos con IVA 19% y retenciones SII (15,25%) calculadas al peso, controla abonos vs. gastos reales y te muestra cuánta utilidad neta queda en caja.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <a href="#planes">
                <Button size="lg" className="bg-slate-900 hover:bg-slate-800 text-white font-semibold gap-2 tactile-press">
                  Elegir Plan y Comenzar
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </a>
              <Link href="/demo">
                <Button size="lg" variant="outline" className="gap-2 font-semibold tactile-press">
                  <FlaskConical className="h-4 w-4 text-amber-600" />
                  Explorar Demo en Caché (Sin Registro)
                </Button>
              </Link>
            </div>

            <div className="flex flex-wrap gap-6 pt-3 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Pagos mensuales con Khipu
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-amber-600" />
                Asistente IA optimizado para CLP & SII
              </span>
              <span className="inline-flex items-center gap-1.5">
                <FileSpreadsheet className="h-4 w-4 text-slate-700" />
                Exportación PDF Comercial & Excel F29
              </span>
            </div>
          </div>

          {/* Maqueta Glassmórfica de Precisión */}
          <div className="lg:col-span-5">
            <div className="rounded-3xl glass-luxury text-white p-6 sm:p-7 space-y-5 shadow-2xl border border-white/15">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-amber-300 font-bold">
                    Control Ejecutivo en Vivo
                  </div>
                  <div className="text-lg font-bold mt-0.5">{blueprint.shortName}</div>
                </div>
                <Badge className="bg-emerald-400/15 text-emerald-300 border border-emerald-400/30 font-mono">
                  Meta {blueprint.targetMarginPct}%
                </Badge>
              </div>

              <div className="space-y-2.5 text-xs">
                {blueprint.starterCatalog.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-white truncate">{item.servicio}</div>
                      <div className="text-[11px] text-slate-400">
                        {item.tipo_doc_costo === 'factura' ? 'Factura (IVA Crédito)' : 'Boleta Honorarios (15,25%)'}
                      </div>
                    </div>
                    <div className="text-right font-mono shrink-0 tabular-nums">
                      <div className="text-amber-300 font-bold">
                        {formatCLP(item.costo + item.ganancia)}
                      </div>
                      <div className="text-[10px] text-emerald-300">
                        +{formatCLP(item.ganancia)} util.
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl bg-black/30 border border-white/10 p-4 flex items-center justify-between">
                <div className="text-xs text-slate-300">
                  Fugas evitadas por proyecto
                  <span className="block text-[11px] text-slate-400">
                    Fletes, insumos prorrateados y retenciones
                  </span>
                </div>
                <div className="text-xl font-extrabold font-mono text-emerald-300 tabular-nums">
                  +4.5% Margen
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Selector Interactivo de los 9 Rubros */}
      <section id="rubros" className="py-16 px-4 sm:px-8 border-t border-border/60 bg-slate-50/70">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="max-w-2xl space-y-2">
            <Badge variant="outline" className="bg-white text-xs font-semibold">
              9 Industrias Pre-Configuradas
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight text-slate-950">
              Un ERP que habla el idioma exacto de tu negocio
            </h2>
            <p className="text-sm text-slate-600">
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
                    'px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all tactile-press',
                    active
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
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
                <h3 className="text-2xl font-bold text-slate-950">{blueprint.name}</h3>
                <Badge className="bg-slate-900 text-amber-300 border-0">
                  {themeDef.name}
                </Badge>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">{blueprint.ownerPainPoint}</p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 block text-[10px]">Módulo Central</span>
                  <strong className="text-slate-900">{blueprint.terminology.projectPlural}</strong>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 block text-[10px]">Catálogo</span>
                  <strong className="text-slate-900">{blueprint.terminology.catalogLabel}</strong>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 block text-[10px]">Contraparte</span>
                  <strong className="text-slate-900">{blueprint.terminology.clientLabel}</strong>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 block text-[10px]">Margen Meta</span>
                  <strong className="text-emerald-700 font-mono">{blueprint.targetMarginPct}% Neto</strong>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {blueprint.categories.map((cat) => (
                  <span
                    key={cat}
                    className="px-2.5 py-1 rounded-full bg-white border border-slate-200 text-[11px] font-medium text-slate-700"
                  >
                    {cat}
                  </span>
                ))}
              </div>
            </div>

            {/* Calculadora ROI */}
            <div id="roi" className="lg:col-span-5 rounded-3xl glass-luxury text-white p-6 sm:p-8 flex flex-col justify-between space-y-5">
              <div className="space-y-1">
                <div className="text-[11px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Calculadora de Retorno (ROI)
                </div>
                <h3 className="text-xl font-bold">¿Cuánto dinero recuperas al mes?</h3>
              </div>

              <div className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-300">{blueprint.terminology.projectPlural} al mes</span>
                    <span className="font-mono font-bold text-amber-300">{projectsPerMonth}</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={40}
                    value={projectsPerMonth}
                    onChange={(e) => setProjectsPerMonth(Number(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-300">Ticket promedio por {blueprint.terminology.projectSingular.toLowerCase()}</span>
                    <span className="font-mono font-bold text-amber-300 tabular-nums">
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
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/10 border border-white/15 space-y-1.5">
                <div className="text-xs text-slate-300">Utilidad protegida estimada / mes</div>
                <div className="text-3xl font-extrabold font-mono text-emerald-300 tabular-nums">
                  +{formatCLP(recoveredMarginMonthly)}
                </div>
                <div className="text-[11px] text-amber-200">
                  Equivale a <strong>{roiMultiple}x</strong> el valor mensual del Plan Recomendado.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sección Planes & Paga lo que usas (Previo a Crear Cuenta) */}
      <section id="planes" className="py-16 px-4 sm:px-8 border-t border-border/60">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <Badge className="bg-amber-500/15 text-amber-800 border border-amber-500/30">
              Paso 1 antes de crear tu cuenta
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-950">
              Elige tu plan o arma tu ERP a medida
            </h2>
            <p className="text-sm text-slate-600">
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
      <footer className="border-t border-border/60 py-8 px-4 sm:px-8 bg-slate-950 text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <span>© {new Date().getFullYear()} KAIROS ERP · Plataforma Multi-Empresa Chile</span>
          <div className="flex items-center gap-4">
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
