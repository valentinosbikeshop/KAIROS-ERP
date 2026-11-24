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
import type { ModuleKey, SubscriptionPlan, SubscriptionTier } from '@/types/database';

interface PlanDetailModalProps {
  plan: SubscriptionPlan | null;
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
    headline: 'Orden comercial y flujo de caja al día sin planillas sueltas',
    audience: 'Diseñado para empresas en marcha que necesitan cotizar formalmente en PDF y saber qué abonos y gastos reales ocurrieron.',
    roiNote: 'Evita errores manuales de IVA y retenciones 15,25%. Si haces más de 8 proyectos al mes o quieres OCR con IA, el plan de $59.990 se paga solo.',
  },
  growth: {
    headline: 'El punto óptimo de rentabilidad: control total de IVA, fugas e IA',
    audience: 'El preferido por productoras, constructoras, agencias y empresas de servicios que buscan cero sorpresas a fin de mes.',
    roiNote: 'Protegiendo apenas un 4,5% de margen oculto en un proyecto de $1.500.000, recuperas $67.500: más que el valor mensual completo.',
  },
  scale: {
    headline: 'Gobernanza corporativa, equipo ilimitado y Marca Blanca',
    audience: 'Pensado para operaciones consolidadas con múltiples jefes de proyecto, vendedores y exigencia de identidad propia.',
    roiNote: 'Ahorras $37.930/mes frente a contratar todos los módulos por separado, sumando usuarios ilimitados y 600 créditos IA.',
  },
};

export function PlanDetailModal({
  plan,
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#080E1A]/65 backdrop-blur-md"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="plan-detail-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'relative w-full max-w-3xl max-h-[88vh] flex flex-col rounded-3xl overflow-hidden animate-modal-in shadow-2xl',
          isRec
            ? 'glass-luxury text-slate-100 border border-sky-400/30'
            : 'bg-white/95 backdrop-blur-2xl text-foreground border border-border/90'
        )}
      >
        {/* Header */}
        <div
          className={cn(
            'px-6 sm:px-8 py-5 border-b flex items-start justify-between gap-4 shrink-0',
            isRec ? 'border-white/10' : 'border-border/75'
          )}
        >
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              {plan.badge_text && (
                <Badge
                  className={cn(
                    'font-mono text-[10px] tracking-[0.16em] uppercase',
                    isRec
                      ? 'bg-[#2DD4BF] text-[#080E1A] border-0'
                      : 'bg-[#1261E0]/10 text-[#1261E0] border border-[#1261E0]/25'
                  )}
                >
                  {isRec && <Sparkles className="h-3 w-3 mr-1 inline" />}
                  {plan.badge_text}
                </Badge>
              )}
              {industryName && (
                <span
                  className={cn(
                    'text-[11px] font-medium',
                    isRec ? 'text-sky-300' : 'text-[#1261E0]'
                  )}
                >
                  Configurado para {industryName}
                </span>
              )}
            </div>
            <h2 id="plan-detail-title" className="text-2xl sm:text-3xl font-semibold tracking-tight">
              {plan.name}
            </h2>
            <p className={cn('text-xs sm:text-sm', isRec ? 'text-slate-300' : 'text-muted-foreground')}>
              {pitch.headline}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right hidden sm:block">
              <div
                className={cn(
                  'text-2xl font-semibold font-mono tabular-nums',
                  isRec ? 'text-[#38BDF8]' : 'text-foreground'
                )}
              >
                {plan.price_clp === 0 ? '$0' : formatCLP(plan.price_clp)}
              </div>
              <div className={cn('text-[11px]', isRec ? 'text-slate-400' : 'text-muted-foreground')}>
                / mes + IVA
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar detalle del plan"
              className={cn(
                'h-9 w-9 rounded-full flex items-center justify-center border transition-colors',
                isRec
                  ? 'border-white/15 hover:bg-white/10 text-slate-300'
                  : 'border-border hover:bg-secondary text-muted-foreground'
              )}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-6 sm:px-8 py-6 space-y-6 custom-scrollbar">
          {/* Capacidades cuantitativas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div
              className={cn(
                'p-3.5 rounded-2xl border',
                isRec ? 'bg-white/[0.04] border-white/10' : 'bg-secondary/50 border-border/75'
              )}
            >
              <div className={cn('flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider', isRec ? 'text-slate-400' : 'text-muted-foreground')}>
                <FolderKanban className="h-3.5 w-3.5 text-[#1261E0]" />
                Proyectos
              </div>
              <div className="text-base font-semibold mt-1 font-mono">
                {plan.max_projects === null ? 'Ilimitados' : `${plan.max_projects} / mes`}
              </div>
            </div>

            <div
              className={cn(
                'p-3.5 rounded-2xl border',
                isRec ? 'bg-white/[0.04] border-white/10' : 'bg-secondary/50 border-border/75'
              )}
            >
              <div className={cn('flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider', isRec ? 'text-slate-400' : 'text-muted-foreground')}>
                <Layers className="h-3.5 w-3.5 text-[#0D8A72]" />
                Tarifas
              </div>
              <div className="text-base font-semibold mt-1 font-mono">
                {plan.max_costs === null ? 'Ilimitadas' : `${plan.max_costs} ítems`}
              </div>
            </div>

            <div
              className={cn(
                'p-3.5 rounded-2xl border',
                isRec ? 'bg-white/[0.04] border-white/10' : 'bg-secondary/50 border-border/75'
              )}
            >
              <div className={cn('flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider', isRec ? 'text-slate-400' : 'text-muted-foreground')}>
                <Users className="h-3.5 w-3.5 text-[#0284C7]" />
                Equipo
              </div>
              <div className="text-base font-semibold mt-1 font-mono">
                {plan.max_users === null ? 'Ilimitados' : `${plan.max_users} usuario${plan.max_users > 1 ? 's' : ''}`}
              </div>
            </div>

            <div
              className={cn(
                'p-3.5 rounded-2xl border',
                isRec ? 'bg-white/[0.04] border-white/10' : 'bg-secondary/50 border-border/75'
              )}
            >
              <div className={cn('flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider', isRec ? 'text-slate-400' : 'text-muted-foreground')}>
                <Cpu className="h-3.5 w-3.5 text-[#2DD4BF]" />
                Consultas IA
              </div>
              <div className="text-base font-semibold mt-1 font-mono">
                {plan.ai_calls_limit === 0 ? 'Sin IA' : `${plan.ai_calls_limit} / mes`}
              </div>
            </div>
          </div>

          {/* Pitch de valor */}
          <div
            className={cn(
              'p-4 rounded-2xl border space-y-1.5 text-xs sm:text-sm leading-relaxed',
              isRec
                ? 'bg-[#1261E0]/15 border-sky-400/25 text-slate-200'
                : 'bg-[#1261E0]/[0.05] border-[#1261E0]/20 text-foreground/90'
            )}
          >
            <p className="font-medium">{pitch.audience}</p>
            <p className={cn('text-xs', isRec ? 'text-[#5EEAD4]' : 'text-[#0D8A72]')}>
              <strong>Impacto financiero:</strong> {pitch.roiNote}
            </p>
          </div>

          {/* Lo que incluye */}
          <div className="space-y-3">
            <h3 className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#0D8A72] font-semibold">
              Lo que incluye este plan
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {(plan.features || []).map((f, i) => (
                <div
                  key={i}
                  className={cn(
                    'p-3 rounded-xl border flex items-start gap-2.5 text-xs',
                    isRec ? 'bg-white/[0.04] border-white/10' : 'bg-card border-border/75'
                  )}
                >
                  <Check className="h-4 w-4 text-[#0D8A72] shrink-0 mt-0.5" />
                  <span>{f}</span>
                </div>
              ))}
              {includedModules.map((modKey) => {
                const info = MODULE_DESCRIPTIONS[modKey];
                return (
                  <div
                    key={modKey}
                    className={cn(
                      'p-3 rounded-xl border flex items-start gap-2.5 text-xs',
                      isRec ? 'bg-white/[0.04] border-white/10' : 'bg-card border-border/75'
                    )}
                  >
                    <Check className="h-4 w-4 text-[#2DD4BF] shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold">{info.title}</div>
                      <div className={cn('text-[11px] mt-0.5', isRec ? 'text-slate-400' : 'text-muted-foreground')}>
                        {info.benefit}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Lo que le falta (transparencia total para impulsar upgrade) */}
          {missingModules.length > 0 && (
            <div className="space-y-3">
              <h3 className={cn('font-mono text-[11px] uppercase tracking-[0.16em]', isRec ? 'text-slate-400' : 'text-muted-foreground')}>
                Lo que no incluye (disponible en planes superiores)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {missingModules.map((modKey) => {
                  const info = MODULE_DESCRIPTIONS[modKey];
                  return (
                    <div
                      key={modKey}
                      className={cn(
                        'p-3 rounded-xl border flex items-start gap-2.5 text-xs opacity-80',
                        isRec
                          ? 'bg-white/[0.02] border-white/10 text-slate-400'
                          : 'bg-secondary/40 border-border/60 text-muted-foreground'
                      )}
                    >
                      <Lock className="h-3.5 w-3.5 shrink-0 mt-0.5 opacity-70" />
                      <div>
                        <div className="font-medium">{info.title}</div>
                        <div className="text-[11px] mt-0.5 opacity-85">{info.benefit}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div
          className={cn(
            'px-6 sm:px-8 py-4 border-t flex flex-wrap items-center justify-between gap-3 shrink-0',
            isRec ? 'border-white/10 bg-black/20' : 'border-border/75 bg-secondary/35'
          )}
        >
          <span className={cn('text-xs flex items-center gap-1.5', isRec ? 'text-slate-300' : 'text-muted-foreground')}>
            <ShieldCheck className="h-4 w-4 text-[#0D8A72]" />
            Tus datos históricos nunca se eliminan si cambias o pausas tu plan.
          </span>

          <div className="flex flex-wrap items-center gap-2.5 ml-auto">
            {!isRec && (plan.id === 'free' || plan.id === 'essential') && onSwitchToRecommended && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onSwitchToRecommended}
                className="text-xs gap-1.5 border-[#1261E0]/35 text-[#1261E0] hover:bg-[#1261E0]/10"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Ver Recomendado ($59.990)
              </Button>
            )}
            <Button
              type="button"
              disabled={Boolean(loadingTier)}
              onClick={() => onSelectPlan(plan.id)}
              className={cn(
                'font-semibold gap-2 tactile-press',
                isRec
                  ? 'bg-[#2DD4BF] hover:bg-[#5EEAD4] text-[#080E1A]'
                  : 'bg-[#0D1829] hover:bg-[#172842] text-white'
              )}
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
