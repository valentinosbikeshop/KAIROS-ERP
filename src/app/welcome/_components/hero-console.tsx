'use client';

import { useMemo } from 'react';
import { Check, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { AnimatedNumber, AnimatedProgressBar, SpotlightCard } from '@/components/ui/motion-primitives';
import {
  computeItemFinancials,
  computeProjectFinancials,
  type FinanceItemLike,
} from '@/lib/finance-core';
import type { IndustryBlueprint } from '@/lib/industries';
import { cn, formatCLP } from '@/lib/utils';

interface HeroConsoleProps {
  blueprint: IndustryBlueprint;
  isDark: boolean;
  simScale: 1 | 3 | 5;
  onChangeSimScale: (scale: 1 | 3 | 5) => void;
  excludedItemIds: string[];
  onToggleSampleItem: (itemId: string) => void;
}

export function HeroConsole({
  blueprint,
  isDark,
  simScale,
  onChangeSimScale,
  excludedItemIds,
  onToggleSampleItem,
}: HeroConsoleProps) {
  const sampleBase = useMemo(() => blueprint.starterCatalog.slice(0, 3), [blueprint]);

  const activeSampleItems = useMemo(() => {
    const active = sampleBase.filter((item) => !excludedItemIds.includes(item.id));
    return active.length > 0 ? active : sampleBase;
  }, [sampleBase, excludedItemIds]);

  const financeItems = useMemo<FinanceItemLike[]>(
    () =>
      activeSampleItems.map((item) => ({
        id: item.id,
        servicio: item.servicio,
        tipo_evento: item.tipo_evento,
        cantidad: simScale,
        costo: item.costo,
        ganancia: item.ganancia,
        tipo_doc_costo: item.tipo_doc_costo,
        aplicaIvaVenta: item.aplicaIvaVenta,
        tiempo_detalle: `[${item.resourceType} | ${item.staffModality}]`,
      })),
    [activeSampleItems, simScale]
  );

  const projectSummary = useMemo(
    () => computeProjectFinancials(financeItems),
    [financeItems]
  );

  const f29CoveragePct =
    projectSummary.ivaDebito > 0
      ? Math.min(100, Math.round((projectSummary.ivaCredito / projectSummary.ivaDebito) * 100))
      : 0;

  return (
    <SpotlightCard
      variant={isDark ? 'obsidian-luxury' : 'light'}
      tilt
      className={cn(
        'rounded-3xl p-5 sm:p-6 space-y-4',
        isDark ? 'obsidian-shimmer' : 'glass-luxury hairline-shimmer'
      )}
    >
      <div
        className={cn(
          'flex items-start justify-between border-b pb-3.5 gap-3',
          isDark ? 'border-white/10' : 'border-slate-200/80'
        )}
      >
        <div className="min-w-0">
          <div
            className={cn(
              'text-[10px] uppercase tracking-[0.16em] font-semibold',
              isDark ? 'text-[#D8C39E]' : 'text-[#7A5F36]'
            )}
          >
            Consola SII en Vivo · {blueprint.terminology.catalogLabel}
          </div>
          <div
            className={cn(
              'text-base sm:text-lg font-semibold tracking-tight mt-0.5 truncate',
              isDark ? 'text-[#EEF1F6]' : 'text-slate-950'
            )}
          >
            {blueprint.name}
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <Badge
            className={cn(
              'text-[11px] font-semibold border tabular-nums',
              isDark
                ? 'bg-[#4FA88B]/15 text-[#7FD3B6] border-[#4FA88B]/30'
                : 'bg-[#467366]/12 text-[#245246] border-[#467366]/25'
            )}
          >
            Margen {projectSummary.margenVentaPct.toFixed(1)}% (Meta {blueprint.targetMarginPct}%)
          </Badge>
          <div
            role="group"
            aria-label="Cantidad de proyectos simulados"
            className={cn(
              'inline-flex items-center rounded-lg border p-0.5 text-[10px]',
              isDark
                ? 'bg-white/[0.05] border-white/10'
                : 'bg-slate-100/90 border-slate-200/90'
            )}
          >
            {([1, 3, 5] as const).map((mult) => (
              <button
                key={mult}
                type="button"
                aria-pressed={simScale === mult}
                onClick={() => onChangeSimScale(mult)}
                className={cn(
                  'px-2 py-0.5 rounded-md font-semibold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6F42]',
                  simScale === mult
                    ? isDark
                      ? 'bg-[#D8C39E] text-[#06070A]'
                      : 'bg-[#0F172A] text-[#EDE0C8]'
                    : isDark
                    ? 'text-[#A3AFC2] hover:text-[#EEF1F6]'
                    : 'text-slate-600 hover:text-slate-900'
                )}
                title={`Simular ${mult} ${mult === 1 ? blueprint.terminology.projectSingular : blueprint.terminology.projectPlural}`}
              >
                {mult}×
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Proyección exacta F29 SII */}
      <div
        className={cn(
          'p-4 rounded-2xl border space-y-2.5',
          isDark
            ? 'bg-white/[0.04] border-white/10'
            : 'bg-white/85 border-slate-200/80 shadow-2xs'
        )}
      >
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className={cn('font-semibold', isDark ? 'text-[#EEF1F6]' : 'text-slate-900')}>
            Proyección F29 ({simScale}{' '}
            {simScale === 1
              ? blueprint.terminology.projectSingular
              : blueprint.terminology.projectPlural}
            )
          </span>
          <span
            className={cn(
              'text-[10px] font-semibold uppercase tracking-wider shrink-0',
              isDark ? 'text-[#5AC2A0]' : 'text-[#245A4C]'
            )}
          >
            Fórmula SII (/ 1,19)
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs tabular-nums">
          <div>
            <span className={cn('text-[10px] block', isDark ? 'text-[#A3AFC2]' : 'text-slate-600')}>
              IVA Débito
            </span>
            <span className={cn('font-semibold', isDark ? 'text-[#EEF1F6]' : 'text-slate-900')}>
              <AnimatedNumber value={projectSummary.ivaDebito} format="clp" duration={380} />
            </span>
          </div>
          <div>
            <span className={cn('text-[10px] block', isDark ? 'text-[#A3AFC2]' : 'text-slate-600')}>
              IVA Crédito
            </span>
            <span className={cn('font-semibold', isDark ? 'text-[#5AC2A0]' : 'text-[#245A4C]')}>
              -<AnimatedNumber value={projectSummary.ivaCredito} format="clp" duration={380} />
            </span>
          </div>
          <div className="text-right">
            <span className={cn('text-[10px] block', isDark ? 'text-[#A3AFC2]' : 'text-slate-600')}>
              {projectSummary.remanenteIvaF29 > 0 ? 'Remanente IVA' : 'IVA Neto F29'}
            </span>
            <span className={cn('font-bold', isDark ? 'text-[#EDE0C8]' : 'text-[#7A5F36]')}>
              <AnimatedNumber
                value={
                  projectSummary.remanenteIvaF29 > 0
                    ? projectSummary.remanenteIvaF29
                    : projectSummary.ivaNetoF29
                }
                format="clp"
                duration={380}
              />
            </span>
          </div>
        </div>

        <AnimatedProgressBar
          value={f29CoveragePct}
          trackClassName={isDark ? 'bg-white/10' : 'bg-slate-200/80'}
          barClassName={
            isDark
              ? 'bg-gradient-to-r from-[#4FA88B] to-[#D8C39E]'
              : 'bg-gradient-to-r from-[#245A4C] to-[#8C6F42]'
          }
        />

        <div
          className={cn(
            'flex flex-wrap items-center justify-between gap-2 text-[11px] pt-0.5 tabular-nums',
            isDark ? 'text-[#A3AFC2]' : 'text-slate-600'
          )}
        >
          <span>
            Utilidad Neta ex-IVA:{' '}
            <strong className={cn(isDark ? 'text-[#5AC2A0]' : 'text-[#245A4C]')}>
              +<AnimatedNumber value={projectSummary.utilidadNeta} format="clp" duration={380} />
            </strong>
          </span>
          {projectSummary.retencionHonorariosEstimada > 0 && (
            <span className={cn(isDark ? 'text-[#D8C39E]' : 'text-[#7A5F36]')}>
              Ret. 15,25%: <strong>{formatCLP(projectSummary.retencionHonorariosEstimada)}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Partidas interactivas */}
      <div className="space-y-2 text-xs">
        <div
          className={cn(
            'flex items-center justify-between text-[10px] uppercase tracking-wider px-1',
            isDark ? 'text-[#A3AFC2]' : 'text-slate-600'
          )}
        >
          <span>Partidas del rubro (clic para simular)</span>
          <span className="tabular-nums">{activeSampleItems.length}/3 activas</span>
        </div>

        {sampleBase.map((item) => {
          const included = !excludedItemIds.includes(item.id);
          const fin = computeItemFinancials({
            id: item.id,
            servicio: item.servicio,
            tipo_evento: item.tipo_evento,
            cantidad: simScale,
            costo: item.costo,
            ganancia: item.ganancia,
            tipo_doc_costo: item.tipo_doc_costo,
            aplicaIvaVenta: item.aplicaIvaVenta,
            tiempo_detalle: `[${item.resourceType} | ${item.staffModality}]`,
          });

          const taxSublabel =
            !item.aplicaIvaVenta
              ? 'Venta Exenta de IVA (sin 19% Débito)'
              : item.tipo_doc_costo === 'factura'
              ? `Factura · recupera ${formatCLP(fin.ivaCredito)} IVA Crédito`
              : item.staffModality === 'honorarios'
              ? 'Boleta Honorarios · retención 15,25% (2026)'
              : 'Boleta / Trato sin IVA Crédito';

          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={included}
              onClick={() => onToggleSampleItem(item.id)}
              className={cn(
                'w-full text-left p-3 rounded-2xl border flex items-center justify-between gap-3 transition-all duration-200 tactile-press focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6F42]',
                isDark
                  ? included
                    ? 'bg-white/[0.05] border-white/12 hover:border-[#D8C39E]/35 hover:bg-white/[0.08]'
                    : 'bg-white/[0.015] border-white/5 opacity-45 hover:opacity-75'
                  : included
                  ? 'bg-white/80 border-slate-200/90 hover:border-[#8C7148]/45 hover:bg-white'
                  : 'bg-white/40 border-slate-200/50 opacity-50 hover:opacity-80'
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
                      'text-[11px] mt-0.5 truncate',
                      isDark ? 'text-[#A3AFC2]' : 'text-slate-600'
                    )}
                  >
                    {taxSublabel}
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0 tabular-nums">
                <div className={cn('font-semibold', isDark ? 'text-[#EEF1F6]' : 'text-slate-900')}>
                  {formatCLP(fin.ventaNeta)} <span className="text-[10px] font-normal opacity-75">neto</span>
                </div>
                <div className={cn('text-[10px] font-semibold', isDark ? 'text-[#5AC2A0]' : 'text-[#245A4C]')}>
                  +{formatCLP(fin.utilidadNeta)} ({fin.margenVentaPct.toFixed(0)}%)
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div
        className={cn(
          'flex items-center justify-between gap-2 pt-2 border-t text-[11px]',
          isDark ? 'border-white/10 text-[#A3AFC2]' : 'border-slate-200/80 text-slate-600'
        )}
      >
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className={cn('h-3.5 w-3.5 shrink-0', isDark ? 'text-[#5AC2A0]' : 'text-[#245A4C]')} />
          Total cliente c/IVA: <strong className={cn('tabular-nums', isDark ? 'text-[#EEF1F6]' : 'text-slate-900')}>{formatCLP(projectSummary.facturacionBruta)}</strong>
        </span>
        <span className="tabular-nums font-medium">Sin fugas de cálculo</span>
      </div>
    </SpotlightCard>
  );
}
