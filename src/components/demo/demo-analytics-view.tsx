'use client';

import { useMemo } from 'react';
import { FileSpreadsheet, Receipt, CheckCircle2 } from 'lucide-react';
import { KpiCards } from '@/components/analytics/kpi-cards';
import { RevenueChart } from '@/components/analytics/revenue-chart';
import { CostDistribution } from '@/components/analytics/cost-distribution';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AnimatedNumber, AnimatedProgressBar } from '@/components/ui/motion-primitives';
import { computeDemoProjectFinancials, type DemoProject } from '@/lib/demo-local-data';
import { formatCLP } from '@/lib/utils';
import type { CostCategory, FinancialSummary, MonthlyData } from '@/types';
import type { HonorariosRetentionPolicy } from '@/types/database';

interface DemoAnalyticsViewProps {
  projects: DemoProject[];
  retentionPolicy: HonorariosRetentionPolicy;
  analyticsLabel: string;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export function DemoAnalyticsView({
  projects,
  retentionPolicy,
  analyticsLabel,
}: DemoAnalyticsViewProps) {
  const { summary, monthlyData, costDist, totalIvaCredito, totalRetenciones, ivaNetoF29 } = useMemo(() => {
    let totalIngresosBrutos = 0;
    let facturacionNeta = 0;
    let costosOperativos = 0;
    let utilidadNeta = 0;
    let ivaDebitoFiscal = 0;
    let ivaCreditoAcum = 0;
    let retencionesAcum = 0;
    let margenSum = 0;

    const monthMap = new Map<string, { ventas: number; costos: number }>();
    const catMap = new Map<string, number>();

    projects.forEach((proj) => {
      const fin = computeDemoProjectFinancials(proj, retentionPolicy);
      totalIngresosBrutos += fin.ventaTotal;
      facturacionNeta += fin.ventaNeta;
      costosOperativos += fin.costoTotal;
      utilidadNeta += fin.utilidadPresupuestada;
      ivaDebitoFiscal += fin.ivaDebito;
      ivaCreditoAcum += fin.ivaCredito;
      retencionesAcum += fin.retencionHonorarios;
      margenSum += fin.margenPct;

      const mIdx = Math.max(0, Math.min(11, (Number(proj.event_date.split('-')[1]) || 11) - 1));
      const mKey = MONTH_NAMES[mIdx];
      const prev = monthMap.get(mKey) || { ventas: 0, costos: 0 };
      monthMap.set(mKey, {
        ventas: prev.ventas + fin.ventaTotal,
        costos: prev.costos + fin.costoTotal,
      });

      proj.items.forEach((item) => {
        const cat = item.categoria || 'Otros';
        catMap.set(cat, (catMap.get(cat) || 0) + item.costo * Math.max(1, item.cantidad));
      });
    });

    const summaryData: FinancialSummary = {
      totalIngresosBrutos,
      facturacionNeta,
      costosOperativos,
      utilidadNeta,
      margenPromedio: projects.length > 0 ? margenSum / projects.length : 0,
      ivaDebitoFiscal,
    };

    const mData: MonthlyData[] = Array.from(monthMap.entries()).map(([month, v]) => ({
      month,
      ventas: v.ventas,
      costos: v.costos,
    }));

    const totalCat = Array.from(catMap.values()).reduce((a, b) => a + b, 0);
    const cData: CostCategory[] = Array.from(catMap.entries())
      .map(([name, value]) => ({
        name,
        value,
        percentage: totalCat > 0 ? (value / totalCat) * 100 : 0,
      }))
      .filter((c) => c.value > 0);

    return {
      summary: summaryData,
      monthlyData: mData,
      costDist: cData,
      totalIvaCredito: ivaCreditoAcum,
      totalRetenciones: retencionesAcum,
      ivaNetoF29: Math.max(0, ivaDebitoFiscal - ivaCreditoAcum),
    };
  }, [projects, retentionPolicy]);

  const creditoRatio =
    summary.ivaDebitoFiscal > 0
      ? Math.round((totalIvaCredito / summary.ivaDebitoFiscal) * 100)
      : 0;

  return (
    <div className="space-y-6 animate-reveal-up">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            {analyticsLabel} &amp; Tributación F29
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Métricas P&amp;L en vivo recalculadas automáticamente desde tus proyectos locales.
          </p>
        </div>
        <Badge className="bg-[#0D8A72]/12 text-[#0D8A72] border border-[#0D8A72]/25 font-mono text-xs gap-1.5">
          <FileSpreadsheet className="h-3.5 w-3.5" />
          Exportación Excel F29 (Incluida en Enterprise)
        </Badge>
      </div>

      {/* KPIs animados reales */}
      <KpiCards data={summary} />

      {/* Panel Tributario IVA F29 Sin Sorpresas */}
      <Card className="glass-luxury hairline-shimmer text-slate-100 rounded-3xl">
        <CardHeader className="pb-3 border-b border-white/10">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Receipt className="h-5 w-5 text-[#38BDF8]" />
                Proyección Consolidada Formulario 29 (IVA a Fin de Mes)
              </CardTitle>
              <CardDescription className="text-slate-300 text-xs mt-1">
                Cero sorpresas tributarias: visualiza tu IVA Débito, IVA Crédito recuperable y retenciones de honorarios (15,25%).
              </CardDescription>
            </div>
            <Badge className="bg-[#2DD4BF] text-[#080E1A] font-mono text-[10px] font-bold">
              ACTUALIZADO EN VIVO
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-5 space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 font-mono tabular-nums">
            <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10">
              <span className="text-[10px] text-slate-400 uppercase block font-sans">IVA Débito (Ventas)</span>
              <span className="text-xl font-semibold text-white mt-1 block">
                <AnimatedNumber value={summary.ivaDebitoFiscal} format="clp" duration={500} />
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10">
              <span className="text-[10px] text-slate-400 uppercase block font-sans">IVA Crédito (Facturas)</span>
              <span className="text-xl font-semibold text-[#5EEAD4] mt-1 block">
                -<AnimatedNumber value={totalIvaCredito} format="clp" duration={500} />
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10">
              <span className="text-[10px] text-slate-400 uppercase block font-sans">Retenciones 15,25%</span>
              <span className="text-xl font-semibold text-sky-300 mt-1 block">
                <AnimatedNumber value={totalRetenciones} format="clp" duration={500} />
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#1261E0]/20 border border-sky-400/35">
              <span className="text-[10px] text-sky-200 uppercase block font-sans">Saldo IVA F29 a Pagar</span>
              <span className="text-xl font-bold text-[#38BDF8] mt-1 block">
                <AnimatedNumber value={ivaNetoF29} format="clp" duration={500} />
              </span>
            </div>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-300">
              <span>Cobertura de IVA Crédito sobre Débito</span>
              <span className="font-mono text-[#5EEAD4]">{creditoRatio}% compensado</span>
            </div>
            <AnimatedProgressBar
              value={creditoRatio}
              trackClassName="bg-white/10"
              barClassName="bg-[#2DD4BF]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Gráficos animados Recharts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueChart data={monthlyData} />
        <CostDistribution data={costDist} />
      </div>

      {/* Vista previa libro contable */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#0D8A72]" />
            Resumen Contable por Proyecto (Vista previa Libro Excel)
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-border/80 text-muted-foreground font-mono text-[10px] uppercase">
                <th className="py-2 pr-3">Proyecto</th>
                <th className="py-2 px-3">Estado</th>
                <th className="py-2 px-3 text-right">Venta Neta</th>
                <th className="py-2 px-3 text-right">Costo</th>
                <th className="py-2 px-3 text-right">IVA Neto F29</th>
                <th className="py-2 pl-3 text-right">Utilidad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 font-mono tabular-nums">
              {projects.map((p) => {
                const fin = computeDemoProjectFinancials(p, retentionPolicy);
                return (
                  <tr key={p.id} className="hover:bg-secondary/35">
                    <td className="py-2.5 pr-3 font-sans font-medium">{p.name}</td>
                    <td className="py-2.5 px-3 font-sans">
                      <Badge variant="outline" className="text-[10px]">
                        {p.status === 'completed' ? 'Completado' : p.status === 'approved' ? 'Aprobado' : 'Planificación'}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-right">{formatCLP(fin.ventaNeta)}</td>
                    <td className="py-2.5 px-3 text-right">{formatCLP(fin.costoTotal)}</td>
                    <td className="py-2.5 px-3 text-right text-[#1261E0]">{formatCLP(fin.ivaNetoPagar)}</td>
                    <td className="py-2.5 pl-3 text-right font-semibold text-[#0D8A72]">
                      +{formatCLP(fin.utilidadPresupuestada)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
