'use client';

import Link from 'next/link';
import { ArrowRight, CheckCircle2, FileCheck2, LockKeyhole, Shield, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Reveal, SpotlightCard } from '@/components/ui/motion-primitives';
import { cn, formatCLP } from '@/lib/utils';
import { CHILE_BENCHMARK_ROWS } from './industry-data';

interface BenchmarkAndEnterpriseSectionProps {
  isDark: boolean;
  essentialPriceClp: number;
  growthPriceClp: number;
  scalePriceClp: number;
  scaleAiLimit: number;
  industryShortName: string;
  onSelectEnterprise: () => void;
}

const ENTERPRISE_PILLARS = [
  {
    icon: Users,
    title: 'RBAC Granular de 6 Roles',
    description:
      'Separe Gerencia, Comercial, Operaciones/Terreno, Finanzas y Contador solo lectura. Proteja costos internos y márgenes de la operación diaria.',
  },
  {
    icon: LockKeyhole,
    title: 'Aprobación de Piso de Margen',
    description:
      'Defina un margen mínimo por empresa (excluyendo gastos reembolsables): ninguna propuesta bajo piso se aprueba sin visto bueno gerencial.',
  },
  {
    icon: FileCheck2,
    title: 'Bitácora Inmutable de Auditoría',
    description:
      'Trazabilidad completa de cambios en costos, precios, anulaciones y pagos ejecutados para control interno y revisiones contables.',
  },
  {
    icon: Shield,
    title: 'Marca Blanca 100% & 800 IA CFO',
    description:
      'PDFs y Portal /q sin huella FIGURA, pie legal y garantía editable, múltiples cuentas bancarias y prioridad en motor IA CFO.',
  },
] as const;

export function BenchmarkAndEnterpriseSection({
  isDark,
  essentialPriceClp,
  growthPriceClp,
  scalePriceClp,
  scaleAiLimit,
  industryShortName,
  onSelectEnterprise,
}: BenchmarkAndEnterpriseSectionProps) {
  return (
    <div className="space-y-12">
      {/* Anclaje ROI + Benchmark Transparente Chile */}
      <section
        className={cn(
          'py-14 px-4 sm:px-8 border-t transition-colors duration-300',
          isDark ? 'border-white/[0.08] bg-[#0B0D13]/55' : 'border-slate-200/70 bg-white/50'
        )}
      >
        <div className="max-w-7xl mx-auto space-y-7">
          <Reveal>
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
              <div className="max-w-2xl space-y-2">
                <span
                  className={cn(
                    'text-[11px] uppercase tracking-[0.16em] font-semibold block',
                    isDark ? 'text-[#D8C39E]' : 'text-[#7A5F36]'
                  )}
                >
                  Comparativa Mercado Chile 2026 (Ref. 1 UF = $41.405 CLP)
                </span>
                <h2
                  className={cn(
                    'text-2xl sm:text-3xl font-semibold tracking-tight',
                    isDark ? 'text-[#EEF1F6]' : 'text-slate-950'
                  )}
                >
                  41%–65% menor costo que ERPs contables en{' '}
                  <span className={cn('editorial-italic', isDark ? 'text-[#D8C39E]' : 'text-[#7A5F36]')}>
                    UF + IVA
                  </span>
                </h2>
                <p className={cn('text-sm leading-relaxed', isDark ? 'text-[#A3AFC2]' : 'text-slate-600')}>
                  La mayoría de los ERPs en Chile cobran en UF + IVA y están pensados para registrar ventas pasadas. FIGURA cobra en CLP fijo con IVA incluido y protege el margen antes de cotizar.
                </p>
              </div>

              <div
                className={cn(
                  'rounded-2xl border px-4 py-3 text-xs max-w-md',
                  isDark
                    ? 'bg-[#4FA88B]/12 border-[#4FA88B]/30 text-[#D8F3E8]'
                    : 'bg-[#467366]/10 border-[#467366]/25 text-[#1F4A3F]'
                )}
              >
                <strong>Anclaje directo de ROI:</strong> si recupera apenas un <strong>3%</strong> de margen en un proyecto de{' '}
                <strong>$2.500.000</strong> (<strong>$75.000</strong>),{' '}
                <strong>Crecimiento Inteligente IA ({formatCLP(growthPriceClp)}/mes)</strong> se paga solo por todo el mes.
              </div>
            </div>
          </Reveal>

          <SpotlightCard
            variant={isDark ? 'obsidian' : 'light'}
            className="rounded-3xl overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[680px]">
                <thead>
                  <tr
                    className={cn(
                      'border-b text-[11px] uppercase tracking-wider',
                      isDark
                        ? 'border-white/10 text-[#A3AFC2] bg-white/[0.02]'
                        : 'border-slate-200/80 text-slate-600 bg-slate-50/70'
                    )}
                  >
                    <th className="py-3.5 px-4 sm:px-5 font-semibold">Plataforma</th>
                    <th className="py-3.5 px-4 font-semibold">Enfoque Principal</th>
                    <th className="py-3.5 px-4 font-semibold">Tarifa Lista</th>
                    <th className="py-3.5 px-4 font-semibold">Desembolso Real (c/IVA)</th>
                    <th className="py-3.5 px-4 sm:px-5 font-semibold">Brecha Operativa en {industryShortName}</th>
                  </tr>
                </thead>
                <tbody className="text-xs sm:text-sm">
                  {CHILE_BENCHMARK_ROWS.map((row) => {
                    const dynamicPrice = row.isFigura
                      ? `${formatCLP(essentialPriceClp)} / ${formatCLP(growthPriceClp)} / ${formatCLP(scalePriceClp)}`
                      : row.monthlyClpWithIva;
                    return (
                      <tr
                        key={row.competitor}
                        className={cn(
                          'border-b last:border-b-0 transition-colors',
                          row.isFigura
                            ? isDark
                              ? 'bg-[#D8C39E]/[0.11] border-[#D8C39E]/30'
                              : 'bg-[#8C7148]/[0.09] border-[#8C7148]/25'
                            : isDark
                            ? 'border-white/8 hover:bg-white/[0.03]'
                            : 'border-slate-200/70 hover:bg-white/70'
                        )}
                      >
                        <td className="py-3.5 px-4 sm:px-5 font-semibold whitespace-nowrap">
                          <span className={cn(row.isFigura && (isDark ? 'text-[#EDE0C8]' : 'text-[#0F172A]'))}>
                            {row.competitor}
                          </span>
                          {row.isFigura && (
                            <Badge
                              className={cn(
                                'ml-2 text-[10px] border',
                                isDark
                                  ? 'bg-[#D8C39E] text-[#06070A] border-transparent'
                                  : 'bg-[#0F172A] text-[#EDE0C8] border-transparent'
                              )}
                            >
                              CLP Fijo
                            </Badge>
                          )}
                        </td>
                        <td className={cn('py-3.5 px-4', isDark ? 'text-[#A3AFC2]' : 'text-slate-600')}>
                          {row.focus}
                        </td>
                        <td className={cn('py-3.5 px-4 tabular-nums whitespace-nowrap', isDark ? 'text-[#EEF1F6]' : 'text-slate-800')}>
                          {row.marketListPrice}
                        </td>
                        <td
                          className={cn(
                            'py-3.5 px-4 tabular-nums font-semibold whitespace-nowrap',
                            row.isFigura
                              ? isDark
                                ? 'text-[#5AC2A0]'
                                : 'text-[#245A4C]'
                              : isDark
                              ? 'text-[#EEF1F6]'
                              : 'text-slate-900'
                          )}
                        >
                          {dynamicPrice}
                        </td>
                        <td
                          className={cn(
                            'py-3.5 px-4 sm:px-5 text-xs leading-relaxed',
                            row.isFigura
                              ? isDark
                                ? 'text-[#EEF1F6] font-medium'
                                : 'text-slate-900 font-medium'
                              : isDark
                              ? 'text-[#A3AFC2]'
                              : 'text-slate-600'
                          )}
                        >
                          {row.limitationVsFigura}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </SpotlightCard>
        </div>
      </section>

      {/* Salto Enterprise Real: Corporativo & Escala */}
      <section className="px-4 sm:px-8">
        <div className="max-w-7xl mx-auto">
          <SpotlightCard
            variant={isDark ? 'obsidian-luxury' : 'light'}
            className={cn(
              'rounded-3xl p-6 sm:p-8 space-y-6',
              !isDark && 'glass-luxury ring-1 ring-[#8C7148]/25'
            )}
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b pb-5 border-current/10">
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    className={cn(
                      'text-[10px] tracking-[0.14em] uppercase border',
                      isDark
                        ? 'bg-[#D8C39E]/15 text-[#EDE0C8] border-[#D8C39E]/35'
                        : 'bg-[#0F172A] text-[#EDE0C8] border-transparent'
                    )}
                  >
                    Corporativo & Escala · {formatCLP(scalePriceClp)}/mes IVA incl.
                  </Badge>
                  <span className={cn('text-xs font-medium', isDark ? 'text-[#5AC2A0]' : 'text-[#245A4C]')}>
                    Usuarios ilimitados · {scaleAiLimit} IA CFO/mes
                  </span>
                </div>
                <h3
                  className={cn(
                    'text-2xl font-semibold tracking-tight',
                    isDark ? 'text-[#EEF1F6]' : 'text-slate-950'
                  )}
                >
                  Gobernanza real cuando su equipo y volumen{' '}
                  <span className={cn('editorial-italic', isDark ? 'text-[#D8C39E]' : 'text-[#7A5F36]')}>
                    exigen control
                  </span>
                </h3>
                <p className={cn('text-xs sm:text-sm leading-relaxed', isDark ? 'text-[#A3AFC2]' : 'text-slate-600')}>
                  Pensado para empresas consolidadas que necesitan delegar cotizaciones sin exponer sus márgenes ni perder trazabilidad ante su directorio o contador.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <Button
                  type="button"
                  onClick={onSelectEnterprise}
                  className={cn(
                    'font-semibold gap-2 tactile-press',
                    isDark
                      ? 'bg-[#D8C39E] text-[#06070A] hover:bg-[#EDE0C8]'
                      : 'bg-[#0F172A] text-[#EDE0C8] hover:bg-[#1E293B]'
                  )}
                >
                  Elegir Corporativo & Escala
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Link href="/demo">
                  <Button
                    variant="outline"
                    className={cn(
                      'font-medium tactile-press',
                      isDark
                        ? 'border-white/15 bg-white/[0.04] text-[#EEF1F6] hover:bg-white/[0.1]'
                        : 'border-slate-300 bg-white/80 text-slate-800 hover:bg-white'
                    )}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1.5" />
                    Evaluar arquitectura
                  </Button>
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {ENTERPRISE_PILLARS.map((pillar) => {
                const Icon = pillar.icon;
                return (
                  <div
                    key={pillar.title}
                    className={cn(
                      'rounded-2xl p-4 border space-y-2',
                      isDark
                        ? 'bg-white/[0.03] border-white/10'
                        : 'bg-white/75 border-slate-200/80'
                    )}
                  >
                    <div
                      className={cn(
                        'h-9 w-9 rounded-xl flex items-center justify-center border',
                        isDark
                          ? 'bg-[#D8C39E]/12 border-[#D8C39E]/30 text-[#D8C39E]'
                          : 'bg-[#8C7148]/10 border-[#8C7148]/25 text-[#7A5F36]'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <h4 className={cn('text-sm font-semibold', isDark ? 'text-[#EEF1F6]' : 'text-slate-900')}>
                      {pillar.title}
                    </h4>
                    <p className={cn('text-xs leading-relaxed', isDark ? 'text-[#A3AFC2]' : 'text-slate-600')}>
                      {pillar.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </SpotlightCard>
        </div>
      </section>
    </div>
  );
}
