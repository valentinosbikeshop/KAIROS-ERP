'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useWorkspaceConfig } from '@/hooks/use-workspace-config';
import { FeatureLockCard } from '@/components/billing/feature-gate';
import { KpiCards } from '@/components/analytics/kpi-cards';
import { RevenueChart } from '@/components/analytics/revenue-chart';
import { CostDistribution } from '@/components/analytics/cost-distribution';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FinancialSummary, MonthlyData, CostCategory, Event, EventItem } from '@/types';
import { COST_CATEGORIES } from '@/lib/constants';
import { formatCLP, getMonthName, parseDateSafe } from '@/lib/utils';
import { Loader2, Download, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AnalyticsPage() {
  const { entitlements, isDuoExempt, isDemo, terms, industry } = useWorkspaceConfig();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState('0');
  const [loading, setLoading] = useState(true);

  const [summary, setSummary] = useState<FinancialSummary>({
    totalIngresosBrutos: 0,
    facturacionNeta: 0,
    costosOperativos: 0,
    utilidadNeta: 0,
    margenPromedio: 0,
    ivaDebitoFiscal: 0,
  });
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [costDistribution, setCostDistribution] = useState<CostCategory[]>([]);
  const [filteredEventsRaw, setFilteredEventsRaw] = useState<(Event & { event_items: EventItem[] })[]>([]);
  const [trendInsight, setTrendInsight] = useState<{
    peakMonth: string;
    peakVentas: number;
    lowMonth: string;
    lowVentas: number;
    momPct: number | null;
  } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    const { data, error } = await supabase
      .from('events')
      .select(`
        id,
        name,
        client_company,
        event_date,
        location,
        event_items (*)
      `)
      .eq('status', 'completed')
      .is('deleted_at', null);

    const events = (data as (Event & { event_items: EventItem[] })[]) || [];

    if (error || !events.length) {
      setSummary({
        totalIngresosBrutos: 0,
        facturacionNeta: 0,
        costosOperativos: 0,
        utilidadNeta: 0,
        margenPromedio: 0,
        ivaDebitoFiscal: 0,
      });
      setMonthlyData([]);
      setCostDistribution([]);
      setTrendInsight(null);
      setFilteredEventsRaw([]);
      setLoading(false);
      return;
    }

    let totalIngresosBrutos = 0;
    let facturacionNeta = 0;
    let costosOperativos = 0;
    let utilidadNeta = 0;
    let ivaDebitoFiscal = 0;
    let margenSum = 0;
    let itemCount = 0;

    const monthlyMap = new Map<number, { month: string; ventas: number; costos: number }>();
    const costMap = new Map<string, number>();
    const validEvents: typeof events = [];

    events.forEach((event) => {
      if (!event.event_date) return;

      const parsed = parseDateSafe(event.event_date);
      const year = parsed.year.toString();
      const monthNum = parsed.month;

      if (year !== selectedYear) return;
      if (selectedMonth !== '0' && monthNum.toString() !== selectedMonth) return;

      validEvents.push(event);

      if (!monthlyMap.has(monthNum)) {
        monthlyMap.set(monthNum, { month: getMonthName(monthNum), ventas: 0, costos: 0 });
      }

      event.event_items.forEach((item: any) => {
        if (
          !item.approved ||
          item.es_insumo ||
          item.tipo_evento === 'ABONO_CLIENTE' ||
          item.tipo_evento === 'GASTO_REAL'
        ) {
          return;
        }
        const qty = item.cantidad || 1;
        const vTotal = (item.valor_total || 0) * qty;
        const vNeto = (item.valor_neto || 0) * qty;
        const costo = (item.costo || 0) * qty;
        const ganancia = (item.ganancia || 0) * qty;
        const iva = (item.iva || 0) * qty;

        totalIngresosBrutos += vTotal;
        facturacionNeta += vNeto;
        costosOperativos += costo;
        utilidadNeta += ganancia;
        ivaDebitoFiscal += iva;

        if (item.margen) {
          margenSum += item.margen;
          itemCount++;
        }

        const mData = monthlyMap.get(monthNum)!;
        mData.ventas += vTotal;
        mData.costos += costo;

        const categoryOptions: Record<string, string> =
          typeof COST_CATEGORIES === 'object' ? COST_CATEGORIES : {};
        const category =
          (item.tipo_evento && item.tipo_evento.trim()) ||
          categoryOptions[item.servicio] ||
          'Operación General';
        costMap.set(category, (costMap.get(category) || 0) + costo);
      });
    });

    setSummary({
      totalIngresosBrutos,
      facturacionNeta,
      costosOperativos,
      utilidadNeta,
      margenPromedio: itemCount > 0 ? margenSum / itemCount : 0,
      ivaDebitoFiscal,
    });

    const sortedMonthly = Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([, d]) => d);
    setMonthlyData(sortedMonthly);

    if (sortedMonthly.length > 0) {
      const peak = sortedMonthly.reduce((a, b) => (b.ventas > a.ventas ? b : a), sortedMonthly[0]);
      const low = sortedMonthly.reduce((a, b) => (b.ventas < a.ventas ? b : a), sortedMonthly[0]);
      let momPct: number | null = null;
      if (sortedMonthly.length >= 2) {
        const last = sortedMonthly[sortedMonthly.length - 1].ventas;
        const prev = sortedMonthly[sortedMonthly.length - 2].ventas;
        if (prev > 0) momPct = ((last - prev) / prev) * 100;
      }
      setTrendInsight({
        peakMonth: peak.month,
        peakVentas: peak.ventas,
        lowMonth: low.month,
        lowVentas: low.ventas,
        momPct,
      });
    } else {
      setTrendInsight(null);
    }

    const totalCosts = Array.from(costMap.values()).reduce((a, b) => a + b, 0);
    setCostDistribution(
      Array.from(costMap.entries())
        .map(([name, value]) => ({
          name,
          value,
          percentage: totalCosts > 0 ? (value / totalCosts) * 100 : 0,
        }))
        .filter((c) => c.value > 0)
    );

    setFilteredEventsRaw(validEvents);
    setLoading(false);
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    fetchData();
    const onRefresh = () => fetchData();
    window.addEventListener('kairos:local-db-changed', onRefresh);
    window.addEventListener('kairos:org-updated', onRefresh);
    return () => {
      window.removeEventListener('kairos:local-db-changed', onRefresh);
      window.removeEventListener('kairos:org-updated', onRefresh);
    };
  }, [fetchData, industry.id]);

  const years = ['2024', '2025', '2026', '2027'];
  const months = [
    { value: '0', label: 'Todos' },
    { value: '1', label: 'Enero' },
    { value: '2', label: 'Febrero' },
    { value: '3', label: 'Marzo' },
    { value: '4', label: 'Abril' },
    { value: '5', label: 'Mayo' },
    { value: '6', label: 'Junio' },
    { value: '7', label: 'Julio' },
    { value: '8', label: 'Agosto' },
    { value: '9', label: 'Septiembre' },
    { value: '10', label: 'Octubre' },
    { value: '11', label: 'Noviembre' },
    { value: '12', label: 'Diciembre' },
  ];

  const handleExportExcel = async () => {
    const XLSX = await import('xlsx');

    const wsResumen = XLSX.utils.json_to_sheet([
      {
        Período:
          selectedMonth === '0'
            ? `Año ${selectedYear}`
            : `${months.find((m) => m.value === selectedMonth)?.label} ${selectedYear}`,
        'Total Ingresos Brutos': summary.totalIngresosBrutos,
        'Facturación Neta': summary.facturacionNeta,
        'Costos Operativos': summary.costosOperativos,
        'Utilidad Neta (Ganancia)': summary.utilidadNeta,
        'IVA Débito Fiscal': summary.ivaDebitoFiscal,
        'Margen Promedio (%)': summary.margenPromedio.toFixed(2),
      },
    ]);

    const eventosExport = filteredEventsRaw.map((ev) => ({
      ID: ev.id,
      Nombre: ev.name,
      Cliente: ev.client_company,
      Fecha: ev.event_date,
      Lugar: ev.location,
      'Ítems Totales': ev.event_items.length,
    }));
    const wsEventos = XLSX.utils.json_to_sheet(eventosExport);

    const itemsExport: any[] = [];
    filteredEventsRaw.forEach((ev) => {
      ev.event_items
        .filter(
          (item: any) =>
            item.approved &&
            !item.es_insumo &&
            item.tipo_evento !== 'ABONO_CLIENTE' &&
            item.tipo_evento !== 'GASTO_REAL'
        )
        .forEach((item: any) => {
          itemsExport.push({
            Proyecto: ev.name,
            Servicio: item.servicio,
            Categoría: item.tipo_evento,
            Detalle: item.detalle,
            Cantidad: item.cantidad,
            'Costo Unit.': item.costo,
            'Ganancia Unit.': item.ganancia,
            'Valor Neto': item.valor_neto,
            IVA: item.iva,
            'Valor Total': item.valor_total,
            'Margen (%)': item.margen,
            'Tipo Doc. Costo': item.tipo_doc_costo,
            'URL Factura': item.factura_url || 'No adjunta',
          });
        });
    });
    const wsItems = XLSX.utils.json_to_sheet(itemsExport);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen Financiero');
    XLSX.utils.book_append_sheet(wb, wsEventos, 'Proyectos Completados');
    XLSX.utils.book_append_sheet(wb, wsItems, 'Detalle de Costos');

    const fileName = `Reporte_Contable_${selectedYear}_${
      selectedMonth === '0' ? 'Anual' : selectedMonth
    }.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const analyticsLocked =
    !isDuoExempt && !isDemo && !entitlements.modules.mod_analytics_excel;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{terms.analyticsLabel}</h1>
          <p className="text-muted-foreground">
            Análisis de rendimiento, estacionalidad y métricas de {terms.projectPlural.toLowerCase()} completados.
          </p>
        </div>
        {!analyticsLocked && (
          <div className="flex gap-2" data-tour-id="analytics-controls">
            <Select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              options={years.map((y) => ({ value: y, label: y }))}
            />
            <Select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              options={months}
            />
            <Button
              onClick={handleExportExcel}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={loading || summary.totalIngresosBrutos === 0}
            >
              <Download className="mr-2 h-4 w-4" /> Exportar Excel
            </Button>
          </div>
        )}
      </div>

      {analyticsLocked ? (
        <FeatureLockCard
          isExpiredLock={entitlements.isExpiredLock}
          title="Módulo Analítica P&L & Exportación Excel F29"
          description="Desbloquea gráficos mensuales de ventas vs costos, distribución por categoría, cálculo de IVA débito y libro contable Excel descargable."
          requiredPlanLabel="Crecimiento Inteligente IA o Módulo Analítica"
        />
      ) : loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : summary.totalIngresosBrutos === 0 ? (
        <div className="flex justify-center items-center h-64 border rounded-lg border-dashed bg-muted/20">
          <p className="text-muted-foreground">No hay datos financieros para el período seleccionado.</p>
        </div>
      ) : (
        <>
          <div data-tour-id="analytics-kpis">
            <KpiCards data={summary} />
          </div>

          {trendInsight && (
            <div className="rounded-2xl glass-card px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Mejor mes: {trendInsight.peakMonth} ({formatCLP(trendInsight.peakVentas)})
                </Badge>
                <Badge className="bg-amber-50 text-amber-800 border border-amber-200">
                  <TrendingDown className="h-3 w-3 mr-1" />
                  Menor actividad: {trendInsight.lowMonth} ({formatCLP(trendInsight.lowVentas)})
                </Badge>
              </div>
              <div className="text-muted-foreground">
                Margen promedio{' '}
                <strong className="text-foreground">{summary.margenPromedio.toFixed(1)}%</strong>{' '}
                vs meta {industry.shortName} (<strong>{industry.targetMarginPct}%</strong>)
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" data-tour-id="analytics-charts">
            <RevenueChart data={monthlyData} />
            <CostDistribution data={costDistribution} />
          </div>
        </>
      )}
    </div>
  );
}
