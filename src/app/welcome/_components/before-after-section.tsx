'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, CheckCircle2, Clock, Calculator } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AnimatedNumber, Reveal, SpotlightCard } from '@/components/ui/motion-primitives';
import type { IndustryBlueprint } from '@/lib/industries';
import { cn, formatCLP } from '@/lib/utils';
import { INDUSTRY_LANDING_COPY } from './industry-data';

interface BeforeAfterSectionProps {
  blueprint: IndustryBlueprint;
  isDark: boolean;
  recommendedPriceClp: number;
  essentialPriceClp: number;
  demoHref: string;
}

const TICKET_STEPS = [1500000, 2500000, 4500000, 8000000] as const;

export function BeforeAfterSection({
  blueprint,
  isDark,
  recommendedPriceClp,
  essentialPriceClp,
  demoHref,
}: BeforeAfterSectionProps) {
  const copy = INDUSTRY_LANDING_COPY[blueprint.id];
  const [ticketClp, setTicketClp] = useState<number>(copy.roiTicketClp);
  const [leakPct, setLeakPct] = useState<number>(copy.roiLeakPct);

  // Sincroniza ticket/fuga sugeridos cuando cambia el rubro mediante botón explícito o reseteo suave
  const activeTicket = ticketClp > 0 ? ticketClp : copy.roiTicketClp;
  const recoveredMonthly = Math.round(activeTicket * (leakPct / 100));
  const roiRatioGrowth = recommendedPriceClp > 0 ? recoveredMonthly / recommendedPriceClp : 0;

  return (
    <section
      className={cn(
        'py-14 px-4 sm:px-8 border-t transition-colors duration-300',
        isDark ? 'border-white/[0.08] bg-[#0B0D13]/45' : 'border-slate-200/70 bg-white/45'
      )}
    >
      <div className="max-w-7xl mx-auto space-y-8">
        <Reveal>
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div className="max-w-2xl space-y-2">
              <span
                className={cn(
                  'text-[11px] uppercase tracking-[0.16em] font-semibold block',
                  isDark ? 'text-[#D8C39E]' : 'text-[#7A5F36]'
                )}
              >
                Alivio operativo para {blueprint.shortName}
              </span>
              <h2
                className={cn(
                  'text-2xl sm:text-3xl font-semibold tracking-tight',
                  isDark ? 'text-[#EEF1F6]' : 'text-slate-950'
                )}
              >
                Menos planillas rotas, menos sorpresas en el{' '}
                <span className={cn('editorial-italic', isDark ? 'text-[#D8C39E]' : 'text-[#7A5F36]')}>
                  F29 y margen protegido
                </span>
              </h2>
              <p className={cn('text-sm leading-relaxed', isDark ? 'text-[#A3AFC2]' : 'text-slate-600')}>
                {copy.taxRuleSummary}
              </p>
            </div>
            <Badge
              className={cn(
                'self-start lg:self-auto text-xs font-semibold px-3 py-1.5 border',
                isDark
                  ? 'bg-[#4FA88B]/12 text-[#7FD3B6] border-[#4FA88B]/30'
                  : 'bg-[#467366]/12 text-[#245246] border-[#467366]/25'
              )}
            >
              <Clock className="h-3.5 w-3.5 mr-1.5" />
              {copy.reliefTimeSaved}
            </Badge>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Antes en Excel */}
          <SpotlightCard
            variant={isDark ? 'obsidian' : 'light'}
            className="lg:col-span-4 p-5 sm:p-6 flex flex-col justify-between gap-4"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider',
                    isDark ? 'text-[#E59292]' : 'text-[#9B2C2C]'
                  )}
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Antes en Excel suelto
                </span>
                <span className={cn('text-[11px] font-medium', isDark ? 'text-[#A3AFC2]' : 'text-slate-500')}>
                  Fuga silenciosa
                </span>
              </div>
              <ul className="space-y-3 text-xs sm:text-sm">
                {copy.beforeExcel.map((pain, idx) => (
                  <li
                    key={idx}
                    className={cn(
                      'flex items-start gap-2.5 leading-relaxed',
                      isDark ? 'text-[#A3AFC2]' : 'text-slate-700'
                    )}
                  >
                    <span
                      className={cn(
                        'mt-1.5 h-1.5 w-1.5 rounded-full shrink-0',
                        isDark ? 'bg-[#D46A6A]' : 'bg-[#B83B3B]'
                      )}
                    />
                    <span>{pain}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div
              className={cn(
                'pt-3 border-t text-[11px]',
                isDark ? 'border-white/10 text-[#A3AFC2]' : 'border-slate-200/80 text-slate-600'
              )}
            >
              Resultado habitual: descubre que perdió dinero cuando el trabajo ya está entregado.
            </div>
          </SpotlightCard>

          {/* Con FIGURA */}
          <SpotlightCard
            variant={isDark ? 'obsidian-luxury' : 'light'}
            className={cn(
              'lg:col-span-4 p-5 sm:p-6 flex flex-col justify-between gap-4',
              !isDark && 'ring-1 ring-[#8C7148]/30'
            )}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider',
                    isDark ? 'text-[#5AC2A0]' : 'text-[#245A4C]'
                  )}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Con FIGURA ({blueprint.shortName})
                </span>
                <span className={cn('text-[11px] font-semibold', isDark ? 'text-[#D8C39E]' : 'text-[#7A5F36]')}>
                  Desde {formatCLP(essentialPriceClp)}/mes
                </span>
              </div>
              <ul className="space-y-3 text-xs sm:text-sm">
                {copy.withFigura.map((relief, idx) => (
                  <li
                    key={idx}
                    className={cn(
                      'flex items-start gap-2.5 leading-relaxed',
                      isDark ? 'text-[#EEF1F6]' : 'text-slate-900'
                    )}
                  >
                    <CheckCircle2
                      className={cn(
                        'h-4 w-4 mt-0.5 shrink-0',
                        isDark ? 'text-[#5AC2A0]' : 'text-[#245A4C]'
                      )}
                    />
                    <span>{relief}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div
              className={cn(
                'pt-3 border-t flex items-center justify-between gap-2 text-[11px]',
                isDark ? 'border-white/10 text-[#EDE0C8]' : 'border-slate-200/80 text-slate-700'
              )}
            >
              <span>Consolidación padre/hijo incluida desde Operación Esencial</span>
              <Link
                href={demoHref}
                className={cn(
                  'font-semibold inline-flex items-center gap-1 shrink-0 hover:underline',
                  isDark ? 'text-[#D8C39E]' : 'text-[#7A5F36]'
                )}
              >
                Ver flujo
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </SpotlightCard>

          {/* Simulador de ROI & Margen Recuperado */}
          <SpotlightCard
            variant={isDark ? 'obsidian' : 'light'}
            className="lg:col-span-4 p-5 sm:p-6 flex flex-col justify-between gap-4"
          >
            <div className="space-y-3.5">
              <div className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider',
                    isDark ? 'text-[#D8C39E]' : 'text-[#7A5F36]'
                  )}
                >
                  <Calculator className="h-3.5 w-3.5" />
                  Simulador de Retorno ({blueprint.shortName})
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className={isDark ? 'text-[#A3AFC2]' : 'text-slate-600'}>
                    Venta neta de 1 proyecto ({copy.roiCaseLabel})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setTicketClp(copy.roiTicketClp);
                      setLeakPct(copy.roiLeakPct);
                    }}
                    className={cn(
                      'text-[10px] underline font-medium',
                      isDark ? 'text-[#D8C39E]' : 'text-[#7A5F36]'
                    )}
                  >
                    Valor sugerido
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {TICKET_STEPS.map((val) => {
                    const selected = activeTicket === val;
                    return (
                      <button
                        key={val}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setTicketClp(val)}
                        className={cn(
                          'py-1.5 px-1 rounded-xl text-[11px] font-semibold tabular-nums border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6F42]',
                          selected
                            ? isDark
                              ? 'bg-[#D8C39E] text-[#06070A] border-[#D8C39E]'
                              : 'bg-[#0F172A] text-[#EDE0C8] border-[#0F172A]'
                            : isDark
                            ? 'bg-white/[0.04] border-white/10 text-[#EEF1F6] hover:border-[#D8C39E]/40'
                            : 'bg-white/75 border-slate-200 text-slate-800 hover:border-[#8C6F42]'
                        )}
                      >
                        ${(val / 1000000).toFixed(1).replace('.0', '')}M
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className={isDark ? 'text-[#A3AFC2]' : 'text-slate-600'}>
                    Margen oculto recuperado / fugas evitadas
                  </span>
                  <span className={cn('font-semibold tabular-nums', isDark ? 'text-[#EDE0C8]' : 'text-slate-900')}>
                    {leakPct.toFixed(1)}%
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[3.0, 4.0, 5.0, 6.5].map((pct) => {
                    const selected = leakPct === pct;
                    return (
                      <button
                        key={pct}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setLeakPct(pct)}
                        className={cn(
                          'py-1 rounded-xl text-[11px] font-semibold tabular-nums border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6F42]',
                          selected
                            ? isDark
                              ? 'bg-[#4FA88B] text-[#06070A] border-[#4FA88B]'
                              : 'bg-[#245A4C] text-white border-[#245A4C]'
                            : isDark
                            ? 'bg-white/[0.04] border-white/10 text-[#A3AFC2] hover:text-[#EEF1F6]'
                            : 'bg-white/75 border-slate-200 text-slate-700 hover:border-slate-400'
                        )}
                      >
                        {pct.toFixed(1)}%
                      </button>
                    );
                  })}
                </div>
              </div>

              <div
                className={cn(
                  'p-3.5 rounded-2xl border space-y-1',
                  isDark ? 'bg-white/[0.05] border-white/12' : 'bg-white/90 border-slate-200/90'
                )}
              >
                <div className={cn('text-[11px]', isDark ? 'text-[#A3AFC2]' : 'text-slate-600')}>
                  Utilidad protegida en un solo {blueprint.terminology.projectSingular.toLowerCase()}
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className={cn('text-2xl font-bold tabular-nums', isDark ? 'text-[#5AC2A0]' : 'text-[#245A4C]')}>
                    +<AnimatedNumber value={recoveredMonthly} format="clp" duration={320} />
                  </span>
                  <span className={cn('text-[11px] font-semibold tabular-nums', isDark ? 'text-[#EDE0C8]' : 'text-[#7A5F36]')}>
                    {roiRatioGrowth.toFixed(1)}× el plan de {formatCLP(recommendedPriceClp)}
                  </span>
                </div>
              </div>
            </div>

            <Link href={demoHref}>
              <Button
                size="sm"
                className={cn(
                  'w-full font-semibold gap-1.5 tactile-press',
                  isDark
                    ? 'bg-[#D8C39E] text-[#06070A] hover:bg-[#EDE0C8]'
                    : 'bg-[#0F172A] text-[#EDE0C8] hover:bg-[#1E293B]'
                )}
              >
                Simular mi {blueprint.terminology.projectSingular} en Demo
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </SpotlightCard>
        </div>
      </div>
    </section>
  );
}
