'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/use-user';
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
import {
  applyRetentionPolicy,
  computeF29Projection,
  computeItemFinancials,
  computePortfolioFinancials,
  computeProjectFinancials,
  isBoletaHonorariosItem,
  isBudgetLineItem,
} from '@/lib/finance-core';
import { canUseAnalytics } from '@/lib/plan-guards';
import { can } from '@/lib/rbac';
import { Loader2, Download, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AnalyticsPage() {
  const { profile } = useUser();
  const { organization, entitlements, terms, industry } = useWorkspaceConfig();
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
  const [taxMetrics, setTaxMetrics] = useState({
    ivaCreditoFiscal: 0,
    ivaNetoF29: 0,
    remanenteIvaF29: 0,
    retencionHonorarios: 0,
    totalF29Estimado: 0,
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

  const orgTaxRegime = organization?.bank_info?.__saas_config?.tax_regime;
  const honorariosPolicy =
    organization?.bank_info?.__saas_config?.honorarios_retention_policy || 'contractor';

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
        month,
        year,
        location,
        status,
        tax_regime,
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
      setTaxMetrics({
        ivaCreditoFiscal: 0,
        ivaNetoF29: 0,
        remanenteIvaF29: 0,
        retencionHonorarios: 0,
        totalF29Estimado: 0,
      });
      setMonthlyData([]);
      setCostDistribution([]);
      setTrendInsight(null);
      setFilteredEventsRaw([]);
      setLoading(false);
      return;
    }

    const validEvents = events.filter((event) => {
      let year = Number(event.year) || 0;
      let monthNum = Number(event.month) || 0;
      if (event.event_date) {
        const parsed = parseDateSafe(event.event_date);
        if (parsed.year) year = parsed.year;
        if (parsed.month) monthNum = parsed.month;
      }
      if (!year || String(year) !== selectedYear) return false;
      if (selectedMonth !== '0' && String(monthNum) !== selectedMonth) return false;
      return true;
    });

    const portfolio = computePortfolioFinancials(validEvents, {
      taxRegime: orgTaxRegime,
      honorariosPolicy,
      includeStatuses: ['completed'],
      onlyApprovedItems: true,
    });

    let totalRetencionHonorarios = 0;
    const costMap = new Map<string, number>();

    validEvents.forEach((event) => {
      const items = event.event_items || [];
      const childrenMap = new Map<string, EventItem[]>();
      items.forEach((it) => {
        if (it.parent_id && isBudgetLineItem(it)) {
          const list = childrenMap.get(it.parent_id) || [];
          list.push(it);
          childrenMap.set(it.parent_id, list);
        }
      });

      const evTaxRegime = event.tax_regime || orgTaxRegime;

      items.forEach((item) => {
        if (item.parent_id || !item.approved || !isBudgetLineItem(item)) return;
        const children = childrenMap.get(item.id) || [];
        const costLines = children.length > 0 ? children : [item];

        costLines.forEach((line) => {
          const lineFin = computeItemFinancials(line, { taxRegime: evTaxRegime });
          if (isBoletaHonorariosItem(line)) {
            totalRetencionHonorarios += applyRetentionPolicy(
              lineFin.costoBruto,
              honorariosPolicy
            ).retencionTotal;
          }
          const category =
            (line.tipo_evento && line.tipo_evento.trim()) ||
            (item.tipo_evento && item.tipo_evento.trim()) ||
            COST_CATEGORIES[line.servicio] ||
            industry.categories[0] ||
            'Operación General';
          costMap.set(category, (costMap.get(category) || 0) + lineFin.costoNeto);
        });
      });
    });

    const f29 = computeF29Projection({
      ivaDebito: portfolio.ivaDebito,
      ivaCredito: portfolio.ivaCredito,
      retencionHonorarios: totalRetencionHonorarios,
    });

    setSummary({
      totalIngresosBrutos: portfolio.facturacionBruta,
      facturacionNeta: portfolio.facturacionNeta,
      costosOperativos: portfolio.costosNetos,
      utilidadNeta: portfolio.utilidadNeta,
      margenPromedio: portfolio.margenPromedioVentaPct,
      ivaDebitoFiscal: portfolio.ivaDebito,
    });

    setTaxMetrics({
      ivaCreditoFiscal: portfolio.ivaCredito,
      ivaNetoF29: f29.ivaAPagar,
      remanenteIvaF29: f29.remanenteIva,
      retencionHonorarios: f29.retencionHonorarios,
      totalF29Estimado: f29.totalF29Estimado,
    });

    const sortedMonthly: MonthlyData[] = portfolio.monthlySeries.map((m) => ({
      month: getMonthName(m.monthNumber),
      ventas: m.ventasNetas,
      costos: m.costosNetos,
    }));
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
  }, [selectedYear, selectedMonth, orgTaxRegime, honorariosPolicy, industry.categories]);

  useEffect(() => {
    fetchData();
    const onRefresh = () => fetchData();
    window.addEventListener('figura:local-db-changed', onRefresh);
    window.addEventListener('figura:org-updated', onRefresh);
    return () => {
      window.removeEventListener('figura:local-db-changed', onRefresh);
      window.removeEventListener('figura:org-updated', onRefresh);
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
    const periodName =
      selectedMonth === '0'
        ? `Año ${selectedYear}`
        : `${months.find((m) => m.value === selectedMonth)?.label} ${selectedYear}`;

    const wsResumen = XLSX.utils.json_to_sheet([
      {
        Período: periodName,
        'Total Ingresos Brutos (c/IVA)': summary.totalIngresosBrutos,
        'Facturación Neta (ex-IVA)': summary.facturacionNeta,
        'Costos Operativos Netos (ex-IVA)': summary.costosOperativos,
        'Utilidad Neta Real (ex-IVA)': summary.utilidadNeta,
        'Margen s/ Venta Neta (%)': Number(summary.margenPromedio.toFixed(1)),
        'IVA Débito Fiscal': summary.ivaDebitoFiscal,
        'IVA Crédito Fiscal': taxMetrics.ivaCreditoFiscal,
        'IVA Neto F29 (a pagar)': taxMetrics.ivaNetoF29,
        'Remanente IVA a Favor': taxMetrics.remanenteIvaF29,
        'Retención Honorarios 15,25%': taxMetrics.retencionHonorarios,
        'Total F29 Estimado': taxMetrics.totalF29Estimado,
      },
    ]);

    const eventosExport = filteredEventsRaw.map((ev) => {
      const evFin = computeProjectFinancials(ev.event_items || [], {
        taxRegime: ev.tax_regime || orgTaxRegime,
        honorariosPolicy,
        onlyApproved: true,
      });
      const evF29 = computeF29Projection({
        ivaDebito: evFin.ivaDebito,
        ivaCredito: evFin.ivaCredito,
        retencionHonorarios: evFin.retencionHonorariosEstimada,
      });
      return {
        ID: ev.id,
        Proyecto: ev.name,
        Cliente: ev.client_company || '',
        Fecha: ev.event_date || '',
        Lugar: ev.location || '',
        'Facturación Neta': evFin.facturacionNeta,
        'Costos Netos': evFin.costoNetoTotal,
        'Utilidad Neta': evFin.utilidadNeta,
        'Margen s/ Venta (%)': evFin.margenVentaPct,
        'IVA Débito': evFin.ivaDebito,
        'IVA Crédito': evFin.ivaCredito,
        'Retención Honorarios 15,25%': evFin.retencionHonorariosEstimada,
        'F29 Estimado': evF29.totalF29Estimado,
      };
    });
    const wsEventos = XLSX.utils.json_to_sheet(eventosExport);

    const itemsExport: Record<string, string | number>[] = [];
    filteredEventsRaw.forEach((ev) => {
      const evTaxRegime = ev.tax_regime || orgTaxRegime;
      const childrenParentIds = new Set(
        (ev.event_items || [])
          .filter((it) => it.parent_id && isBudgetLineItem(it))
          .map((it) => it.parent_id as string)
      );

      (ev.event_items || [])
        .filter((item) => item.approved && isBudgetLineItem(item))
        .forEach((item) => {
          const fin = computeItemFinancials(item, { taxRegime: evTaxRegime });
          const isParentWithChildren = childrenParentIds.has(item.id);
          const effectiveIvaCredito = isParentWithChildren ? 0 : fin.ivaCredito;
          const effectiveCostoNeto = isParentWithChildren ? 0 : fin.costoNeto;
          const retencionHon =
            !isParentWithChildren && isBoletaHonorariosItem(item)
              ? applyRetentionPolicy(fin.costoBruto, honorariosPolicy).retencionTotal
              : 0;
          const f29Linea = Math.max(0, fin.ivaDebito - effectiveIvaCredito) + retencionHon;

          itemsExport.push({
            Proyecto: ev.name,
            Rol_Partida: item.parent_id
              ? 'Subpartida Hijo'
              : isParentWithChildren
              ? 'Consolidado Padre'
              : 'Partida Directa',
            Servicio: item.servicio,
            Categoría: item.tipo_evento || 'General',
            Detalle: item.detalle || '',
            Cantidad: fin.cantidad,
            'Costo Unit. Bruto': fin.costoBrutoUnit,
            'Costos Netos Total': effectiveCostoNeto,
            'Valor Neto Total': item.es_insumo || item.parent_id ? 0 : fin.ventaNeta,
            'IVA Débito': item.es_insumo || item.parent_id ? 0 : fin.ivaDebito,
            'IVA Crédito': effectiveIvaCredito,
            'Retención Honorarios (15,25%)': retencionHon,
            'F29 Estimado': f29Linea,
            'Valor Total Cliente': item.es_insumo || item.parent_id ? 0 : fin.ventaTotal,
            'Margen Venta (%)': item.es_insumo || item.parent_id ? 0 : fin.margenVentaPct,
            'Tipo Doc. Compra': fin.tipoDocCompra,
            'Exento IVA Venta': fin.isExemptSale ? 'Sí' : 'No',
            'URL Factura': item.factura_url || 'No adjunta',
          });
        });
    });
    const wsItems = XLSX.utils.json_to_sheet(itemsExport);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen_Financiero_F29');
    XLSX.utils.book_append_sheet(wb, wsEventos, 'Proyectos_Completados');
    XLSX.utils.book_append_sheet(wb, wsItems, 'Detalle_Partidas');

    const periodSlug =
      selectedMonth === '0' ? 'Anual' : getMonthName(Number(selectedMonth));
    const fileName = `FIGURA_Analitica_Contable_${selectedYear}_${periodSlug}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const analyticsLocked =
    !canUseAnalytics(entitlements) || !can(profile, 'view_costs_margins', entitlements);

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
              <div className="flex flex-wrap items-center gap-3 text-muted-foreground tabular-nums">
                <span>
                  IVA Crédito: <strong className="text-foreground">{formatCLP(taxMetrics.ivaCreditoFiscal)}</strong>
                </span>
                <span>·</span>
                <span>
                  F29 est.: <strong className="text-amber-800">{formatCLP(taxMetrics.totalF29Estimado)}</strong>
                </span>
                <span>·</span>
                <span>
                  Margen s/ venta{' '}
                  <strong className="text-foreground">{summary.margenPromedio.toFixed(1)}%</strong>{' '}
                  vs meta {industry.shortName} (<strong>{industry.targetMarginPct}%</strong>)
                </span>
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
