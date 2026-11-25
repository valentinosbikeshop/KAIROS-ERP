'use client';

import { useEffect } from 'react';
import {
  ArrowRight,
  Check,
  CreditCard,
  Lock,
  Sparkles,
  X,
  ShieldCheck,
  Layers,
  Users,
  FolderKanban,
  Cpu,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn, formatCLP } from '@/lib/utils';
import type { IndustryBlueprint } from '@/lib/industries';
import type { ModuleKey, SubscriptionPlan, SubscriptionTier } from '@/types/database';

interface PlanDetailModalProps {
  plan: SubscriptionPlan | null;
  industry?: IndustryBlueprint;
  industryName?: string;
  isCurrent?: boolean;
  loadingTier?: string | null;
  onClose: () => void;
  onSelectPlan: (tier: SubscriptionTier) => void;
  onSwitchToRecommended?: () => void;
}

const MODULE_DESCRIPTIONS: Record<
  ModuleKey,
  { title: string; benefit: string }
> = {
  mod_unlimited_projects: {
    title: 'Proyectos & Catálogo Ilimitados',
    benefit: 'Opera sin topes mensuales ni límites de tarifas maestras cuando tu demanda crece.',
  },
  mod_pdf_quotes: {
    title: 'Cotizador PDF Ejecutivo',
    benefit: 'Emite propuestas comerciales e informes internos con desglose neto, IVA 19% y condiciones listas para aprobar.',
  },
  mod_transactions_sii: {
    title: 'Trazabilidad Caja, Abonos & IVA F29',
    benefit: 'Sabe exactamente cuánto IVA Débito vs. Crédito pagarás a fin de mes, más abonos y gastos reales.',
  },
  mod_consolidation_retail: {
    title: 'Consolidación, Recetas & Retail',
    benefit: 'Agrupa partidas padre/hijo, prorratea insumos unitarios y evita fugas ocultas por flete o merma.',
  },
  mod_ai_suite: {
    title: 'Suite IA + OCR Documental',
    benefit: 'Sube PDF, Excel o fotos de facturas/cotizaciones y transfórmalas en presupuestos en segundos.',
  },
  mod_analytics_excel: {
    title: 'Analítica P&L & Excel Contable F29',
    benefit: 'Dashboards de rentabilidad real por proyecto, distribución de costos y libro contable descargable.',
  },
  mod_team_branding: {
    title: 'Equipo Multi-Usuario & Marca Blanca',
    benefit: 'Tu logo, cuenta bancaria y pie legal en cada documento, con permisos granulares para tu equipo.',
  },
};

const ALL_MODULES_ORDER: ModuleKey[] = [
  'mod_unlimited_projects',
  'mod_pdf_quotes',
  'mod_transactions_sii',
  'mod_consolidation_retail',
  'mod_ai_suite',
  'mod_analytics_excel',
  'mod_team_branding',
];

const PERSUASIVE_PITCH: Record<
  string,
  {
    headline: string;
    audience: string;
    roiNote: string;
  }
> = {
  free: {
    headline: 'Valida la precisión financiera sin riesgo ni tarjeta',
    audience: 'Ideal para estructurar tus primeras 2 cotizaciones con IVA 19% y margen real antes de operar en escala.',
    roiNote: 'Tus datos nunca se borran: cuando estés listo para emitir PDFs, controlar IVA F29 o usar IA, subes de nivel en 1 clic.',
  },
  essential: {
    headline: 'Orden comercial, flujo de caja e impulso inicial con IA',
    audience: 'Diseñado para empresas en marcha que necesitan cotizar formalmente en PDF, controlar abonos/gastos reales e iniciar con 25 consultas IA/OCR al mes.',
    roiNote: 'Evita errores manuales de IVA y retenciones 15,25%. Si haces más de 12 proyectos al mes, prorrateas insumos o necesitas Analítica P&L + 250 créditos IA, el plan de $59.990 se paga solo.',
  },
  growth: {
    headline: 'El punto óptimo de rentabilidad: control total de IVA, fugas e IA Pro',
    audience: 'El preferido por productoras, constructoras, agencias y empresas de servicios que buscan cero sorpresas a fin de mes.',
    roiNote: 'Protegiendo apenas un 4,5% de margen oculto en un proyecto de $1.500.000, recuperas $67.500: más que el valor mensual completo.',
  },
  scale: {
    headline: 'Gobernanza corporativa, equipo ilimitado y Marca Blanca',
    audience: 'Pensado para operaciones consolidadas con múltiples jefes de proyecto, vendedores y exigencia de identidad propia.',
    roiNote: 'Ahorras $37.930/mes frente a contratar todos los módulos por separado, sumando usuarios ilimitados y 800 créditos IA con motor CFO.',
  },
};

export function PlanDetailModal({
  plan,
  industry,
  industryName,
  isCurrent = false,
  loadingTier = null,
  onClose,
  onSelectPlan,
  onSwitchToRecommended,
}: PlanDetailModalProps) {
  useEffect(() => {
    if (!plan) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [plan, onClose]);

  if (!plan) return null;

  const isRec = Boolean(plan.is_recommended);
  const includedSet = new Set(plan.included_modules || []);
  const includedModules = ALL_MODULES_ORDER.filter((m) => includedSet.has(m));
  const missingModules = ALL_MODULES_ORDER.filter((m) => !includedSet.has(m));
  const pitch = PERSUASIVE_PITCH[plan.id] || PERSUASIVE_PITCH.growth;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/25 backdrop-blur-md"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="plan-detail-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'relative w-full max-w-3xl max-h-[88vh] flex flex-col rounded-3xl overflow-hidden animate-modal-in glass-luxury text-foreground'
        )}
      >
        {/* Header */}
        <div className="px-6 sm:px-8 py-5 border-b border-slate-200/80 flex items-start justify-between gap-4 shrink-0">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              {plan.badge_text && (
                <Badge
                  className={cn(
                    'text-[10px] tracking-[0.14em] uppercase',
                    isRec
                      ? 'bg-[#467366]/15 text-[#2E5248] border border-[#467366]/30'
                      : 'bg-[#4A607A]/12 text-[#3B4F66] border border-[#4A607A]/25'
                  )}
                >
                  {isRec && <Sparkles className="h-3 w-3 mr-1 inline" />}
                  {plan.badge_text}
                </Badge>
              )}
              {industryName && (
                <span className="text-[11px] font-medium text-[#4A607A]">
                  Configurado para {industryName}
                </span>
              )}
            </div>
            <h2 id="plan-detail-title" className="text-2xl sm:text-3xl font-semibold tracking-tight">
              {plan.name}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {pitch.headline}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right hidden sm:block">
              <div className="text-2xl font-semibold tabular-nums text-foreground">
                {plan.price_clp === 0 ? '$0' : formatCLP(plan.price_clp)}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {plan.price_clp === 0 ? '/ mes' : '/ mes · IVA incl.'}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar detalle del plan"
              className="h-9 w-9 rounded-full flex items-center justify-center border border-slate-200 bg-white/70 hover:bg-white text-muted-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-6 sm:px-8 py-6 space-y-6 custom-scrollbar">
          {/* Capacidades cuantitativas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-white/75 border border-slate-200/80">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                <FolderKanban className="h-3.5 w-3.5 text-[#4A607A]" />
                Proyectos
              </div>
              <div className="text-base font-semibold mt-1 tabular-nums">
                {plan.max_projects === null ? 'Ilimitados' : `${plan.max_projects} / mes`}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/75 border border-slate-200/80">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                <Layers className="h-3.5 w-3.5 text-[#467366]" />
                Tarifas
              </div>
              <div className="text-base font-semibold mt-1 tabular-nums">
                {plan.max_costs === null ? 'Ilimitadas' : `${plan.max_costs} ítems`}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/75 border border-slate-200/80">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                <Users className="h-3.5 w-3.5 text-[#4A607A]" />
                Equipo
              </div>
              <div className="text-base font-semibold mt-1 tabular-nums">
                {plan.max_users === null ? 'Ilimitados' : `${plan.max_users} usuario${plan.max_users > 1 ? 's' : ''}`}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/75 border border-slate-200/80">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                <Cpu className="h-3.5 w-3.5 text-[#467366]" />
                Consultas IA
              </div>
              <div className="text-base font-semibold mt-1 tabular-nums">
                {plan.ai_calls_limit === 0 ? 'Sin IA' : `${plan.ai_calls_limit} / mes`}
              </div>
            </div>
          </div>

          {/* Pitch de valor */}
          <div className="p-4 rounded-2xl border bg-white/75 border-slate-200/80 space-y-1.5 text-xs sm:text-sm leading-relaxed">
            <p className="font-medium text-foreground">{pitch.audience}</p>
            <p className="text-xs text-[#467366]">
              <strong>Impacto financiero:</strong> {pitch.roiNote}
            </p>
          </div>

          {/* Lo que incluye */}
          <div className="space-y-3">
            <h3 className="text-[11px] uppercase tracking-[0.14em] text-[#467366] font-semibold">
              Lo que incluye este plan
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {(plan.features || []).map((f, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl border bg-white/75 border-slate-200/80 flex items-start gap-2.5 text-xs"
                >
                  <Check className="h-4 w-4 text-[#467366] shrink-0 mt-0.5" />
                  <span>{f}</span>
                </div>
              ))}
              {includedModules.map((modKey) => {
                const info = MODULE_DESCRIPTIONS[modKey];
                return (
                  <div
                    key={modKey}
                    className="p-3 rounded-xl border bg-white/75 border-slate-200/80 flex items-start gap-2.5 text-xs"
                  >
                    <Check className="h-4 w-4 text-[#467366] shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold">{info.title}</div>
                      <div className="text-[11px] mt-0.5 text-muted-foreground">
                        {info.benefit}
                      </div>
                    </div>
                  </div>
                );
              })}
              {industry?.planSpecialtyFeatures?.[plan.id]?.map((specFeat, sIdx) => (
                <div
                  key={`modal-spec-${sIdx}`}
                  className="p-3 rounded-xl border bg-[#1261E0]/[0.06] border-[#1261E0]/20 flex items-start gap-2.5 text-xs sm:col-span-2"
                >
                  <Sparkles className="h-4 w-4 text-[#1261E0] shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-[#0F4FB8]">
                      Especializado para {industry.shortName}
                    </div>
                    <div className="text-[11px] mt-0.5 text-foreground/85">{specFeat}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Lo que le falta */}
          {missingModules.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
                Lo que no incluye (disponible en planes superiores)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {missingModules.map((modKey) => {
                  const info = MODULE_DESCRIPTIONS[modKey];
                  return (
                    <div
                      key={modKey}
                      className="p-3 rounded-xl border bg-slate-100/60 border-slate-200/70 text-muted-foreground flex items-start gap-2.5 text-xs opacity-85"
                    >
                      <Lock className="h-3.5 w-3.5 shrink-0 mt-0.5 opacity-70" />
                      <div>
                        <div className="font-medium">{info.title}</div>
                        <div className="text-[11px] mt-0.5">{info.benefit}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div className="px-6 sm:px-8 py-4 border-t border-slate-200/80 bg-white/60 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-[#467366]" />
            Tus datos históricos nunca se eliminan si cambias o pausas tu plan.
          </span>

          <div className="flex flex-wrap items-center gap-2.5 ml-auto">
            {!isRec && (plan.id === 'free' || plan.id === 'essential') && onSwitchToRecommended && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onSwitchToRecommended}
                className="text-xs gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5 text-[#4A607A]" />
                Ver Recomendado ($59.990)
              </Button>
            )}
            <Button
              type="button"
              disabled={Boolean(loadingTier)}
              onClick={() => onSelectPlan(plan.id)}
              className="font-semibold gap-2 tactile-press"
            >
              {plan.price_clp === 0 ? <ArrowRight className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
              {isCurrent && plan.price_clp > 0
                ? 'Renovar este Plan'
                : plan.price_clp === 0
                ? 'Comenzar Gratis'
                : `Elegir ${plan.name}`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
