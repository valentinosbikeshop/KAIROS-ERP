'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Download,
  ExternalLink,
  FileSpreadsheet,
  Landmark,
  Loader2,
  Receipt,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useWorkspaceConfig } from '@/hooks/use-workspace-config';
import { CHILE_HONORARIOS_RETENTION_2026, EVENT_STATUS_LABELS } from '@/lib/constants';
import { cn, formatCLP, formatDateCL, getMonthName, parseDateSafe } from '@/lib/utils';
import { FeatureLockCard } from '@/components/billing/feature-gate';
import { BankReconciler } from '@/components/events/bank-reconciler';
import { ResourceCalendar, detectScheduleConflicts } from '@/components/events/resource-calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import type { Event, EventItem } from '@/types/database';
import type { CashflowBucket } from '@/components/treasury/cashflow-chart';

const CashflowChart = dynamic(
  () => import('@/components/treasury/cashflow-chart').then((m) => m.CashflowChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-[340px] rounded-2xl border bg-muted/20 flex items-center justify-center text-xs text-muted-foreground">
        Cargando gráfico de flujo proyectado...
      </div>
    ),
  }
);

type TreasuryTab = 'cashflow' | 'reconciler' | 'agenda';

interface EventTreasurySummary {
  event: Event & { event_items?: EventItem[] };
  presupuestadoVenta: number;
  presupuestadoNeto: number;
  presupuestadoIvaDebito: number;
  presupuestadoCostoTotal: number;
  abonosRecibidos: number;
  gastosReales: number;
  cxcPendiente: number;
  costoPendiente: number;
  daysUntilEvent: number | null;
}

export default function TreasuryPage() {
  const { entitlements, isDuoExempt, isDemo, terms, loading: workspaceLoading } = useWorkspaceConfig();
  const [activeTab, setActiveTab] = useState<TreasuryTab>('cashflow');
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<(Event & { event_items?: EventItem[] })[]>([]);
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1));

  const treasuryLocked =
    !workspaceLoading &&
    !isDuoExempt &&
    !isDemo &&
    !entitlements.modules.mod_transactions_sii &&
    !entitlements.modules.mod_analytics_excel;

  const fetchTreasuryData = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('events')
        .select('*, event_items(*)')
        .is('deleted_at', null)
        .order('event_date', { ascending: true });

      setEvents((data as (Event & { event_items?: EventItem[] })[]) || []);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (workspaceLoading) return;
    if (!treasuryLocked) {
      fetchTreasuryData();
    } else {
      setLoading(false);
    }
  }, [fetchTreasuryData, treasuryLocked, workspaceLoading]);

  const nowDate = useMemo(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate(), 12, 0, 0);
  }, []);

  const summaries: EventTreasurySummary[] = useMemo(() => {
    return events
      .filter((e) => !e.deleted_at && e.quote_status !== 'rejected')
      .map((ev) => {
        const items = ev.event_items || [];
        let presupuestadoVenta = 0;
        let presupuestadoNeto = 0;
        let presupuestadoIvaDebito = 0;
        let presupuestadoCostoTotal = 0;
        let abonosRecibidos = 0;
        let gastosReales = 0;

        items.forEach((item) => {
          if (item.tipo_evento === 'ABONO_CLIENTE') {
            abonosRecibidos += Number(item.valor_total || 0);
            return;
          }
          if (item.tipo_evento === 'GASTO_REAL') {
            gastosReales += Number(item.valor_total || 0);
            return;
          }
          if (!item.approved || item.parent_id) return;

          const qty = Number(item.cantidad) || 1;
          presupuestadoCostoTotal += Number(item.costo || 0) * qty;
          if (!item.es_insumo) {
            presupuestadoVenta += Number(item.valor_total || 0) * qty;
            presupuestadoNeto += Number(item.valor_neto || 0) * qty;
            presupuestadoIvaDebito += Number(item.iva || 0) * qty;
          }
        });

        let daysUntilEvent: number | null = null;
        if (ev.event_date) {
          const p = parseDateSafe(ev.event_date);
          if (p.year && p.month && p.day) {
            const target = new Date(p.year, p.month - 1, p.day, 12, 0, 0);
            daysUntilEvent = Math.round((target.getTime() - nowDate.getTime()) / (86400 * 1000));
          }
        }

        const cxcPendiente = Math.max(0, presupuestadoVenta - abonosRecibidos);
        const costoPendiente = Math.max(0, presupuestadoCostoTotal - gastosReales);

        return {
          event: ev,
          presupuestadoVenta,
          presupuestadoNeto,
          presupuestadoIvaDebito,
          presupuestadoCostoTotal,
          abonosRecibidos,
          gastosReales,
          cxcPendiente,
          costoPendiente,
          daysUntilEvent,
        };
      });
  }, [events, nowDate]);

  const kpis = useMemo(() => {
    let cxcConfirmada = 0;
    let cxcPipeline = 0;
    let totalAbonos = 0;
    let totalGastos = 0;
    let flujo90d = 0;

    summaries.forEach((s) => {
      totalAbonos += s.abonosRecibidos;
      totalGastos += s.gastosReales;

      if (s.event.status === 'approved') {
        cxcConfirmada += s.cxcPendiente;
      } else if (s.event.status === 'planning') {
        cxcPipeline += s.cxcPendiente;
      }

      if (
        (s.event.status === 'approved' || s.event.status === 'planning') &&
        (s.daysUntilEvent === null || s.daysUntilEvent <= 90)
      ) {
        flujo90d += s.cxcPendiente - s.costoPendiente;
      }
    });

    const cajaNetaRealizada = totalAbonos - totalGastos;
    return {
      cxcConfirmada,
      cxcPipeline,
      cxcTotalActiva: cxcConfirmada + cxcPipeline,
      cajaNetaRealizada,
      flujoProyectado90d: cajaNetaRealizada + flujo90d,
    };
  }, [summaries]);

  const buckets: CashflowBucket[] = useMemo(() => {
    const b0_30 = { bucket: '0 a 30 días', cobrosPendientes: 0, egresosPendientes: 0, flujoNeto: 0 };
    const b31_60 = { bucket: '31 a 60 días', cobrosPendientes: 0, egresosPendientes: 0, flujoNeto: 0 };
    const b61_90 = { bucket: '61 a 90 días', cobrosPendientes: 0, egresosPendientes: 0, flujoNeto: 0 };
    const bLater = { bucket: '+90d / S.F.', cobrosPendientes: 0, egresosPendientes: 0, flujoNeto: 0 };

    summaries
      .filter((s) => s.event.status === 'approved' || s.event.status === 'planning')
      .forEach((s) => {
        const d = s.daysUntilEvent;
        const target =
          d === null || d > 90
            ? bLater
            : d <= 30
            ? b0_30
            : d <= 60
            ? b31_60
            : b61_90;

        target.cobrosPendientes += s.cxcPendiente;
        target.egresosPendientes += s.costoPendiente;
        target.flujoNeto += s.cxcPendiente - s.costoPendiente;
      });

    return [b0_30, b31_60, b61_90, bLater];
  }, [summaries]);

  const f29Consolidado = useMemo(() => {
    const yearNum = Number(selectedYear);
    const monthNum = Number(selectedMonth); // 0 = todo el año

    let ventasNetasReales = 0;
    let ivaDebitoReales = 0;
    let comprasNetasReales = 0;
    let ivaCreditoReales = 0;
    let retencionHonorarios = 0;
    let movCount = 0;

    let ventasNetasDevengadas = 0;
    let ivaDebitoDevengado = 0;
    let ivaCreditoProyectado = 0;

    summaries.forEach((s) => {
      const ev = s.event;
      const evDateParsed = ev.event_date ? parseDateSafe(ev.event_date) : null;
      const eventMatchesPeriod =
        evDateParsed &&
        evDateParsed.year === yearNum &&
        (monthNum === 0 || evDateParsed.month === monthNum);

      // Base Devengada (proyectos aprobados/completados en el período)
      if (eventMatchesPeriod && (ev.status === 'approved' || ev.status === 'completed')) {
        (ev.event_items || []).forEach((item) => {
          if (
            !item.approved ||
            item.parent_id ||
            item.tipo_evento === 'ABONO_CLIENTE' ||
            item.tipo_evento === 'GASTO_REAL'
          ) {
            return;
          }
          const qty = Number(item.cantidad) || 1;
          const costoBruto = Number(item.costo || 0) * qty;
          const costoNeto =
            item.tipo_doc_costo === 'boleta' ? costoBruto : Math.round(costoBruto / 1.19);
          ivaCreditoProyectado += Math.max(0, costoBruto - costoNeto);

          if (!item.es_insumo) {
            ventasNetasDevengadas += Number(item.valor_neto || 0) * qty;
            ivaDebitoDevengado += Number(item.iva || 0) * qty;
          }
        });
      }

      // Base Flujo Real (movimientos contabilizados con su fecha individual)
      (ev.event_items || []).forEach((item) => {
        if (item.tipo_evento !== 'ABONO_CLIENTE' && item.tipo_evento !== 'GASTO_REAL') return;
        const txDateStr = String(item.detalle || '').split('|')[0]?.trim() || ev.event_date || '';
        const p = parseDateSafe(txDateStr);
        if (!p.year || p.year !== yearNum) return;
        if (monthNum !== 0 && p.month !== monthNum) return;

        movCount += 1;
        if (item.tipo_evento === 'ABONO_CLIENTE') {
          ventasNetasReales += Number(item.valor_neto || 0);
          ivaDebitoReales += Number(item.iva || 0);
        } else {
          comprasNetasReales += Number(item.valor_neto || 0);
          ivaCreditoReales += Number(item.iva || 0);
          const isHon = item.servicio.toLowerCase().includes('honorario');
          if (isHon) {
            retencionHonorarios += Math.round(
              Number(item.valor_total || 0) * CHILE_HONORARIOS_RETENTION_2026
            );
          }
        }
      });
    });

    const ivaAPagarReal = Math.max(0, ivaDebitoReales - ivaCreditoReales);
    const remanenteCreditoReal = Math.max(0, ivaCreditoReales - ivaDebitoReales);
    const totalF29Estimado = ivaAPagarReal + retencionHonorarios;

    return {
      ventasNetasReales,
      ivaDebitoReales,
      comprasNetasReales,
      ivaCreditoReales,
      retencionHonorarios,
      ivaAPagarReal,
      remanenteCreditoReal,
      totalF29Estimado,
      movCount,
      ventasNetasDevengadas,
      ivaDebitoDevengado,
      ivaCreditoProyectado,
    };
  }, [summaries, selectedYear, selectedMonth]);

  const cxcList = useMemo(
    () =>
      summaries
        .filter(
          (s) =>
            (s.event.status === 'approved' || s.event.status === 'planning') &&
            (s.cxcPendiente > 0 || s.presupuestadoVenta > 0)
        )
        .sort((a, b) => b.cxcPendiente - a.cxcPendiente),
    [summaries]
  );

  const conflictsCount = useMemo(
    () => detectScheduleConflicts(events).length,
    [events]
  );

  const handleExportF29Excel = async () => {
    const XLSX = await import('xlsx');
    const periodLabel =
      Number(selectedMonth) === 0
        ? `Anual_${selectedYear}`
        : `${getMonthName(Number(selectedMonth))}_${selectedYear}`;

    const resumenRows = [
      { Concepto: 'Período Tributario SII F29', Monto_CLP: periodLabel },
      { Concepto: 'Ventas Netas (Abonos Reales con IVA)', Monto_CLP: f29Consolidado.ventasNetasReales },
      { Concepto: 'IVA Débito Fiscal (Abonos Reales)', Monto_CLP: f29Consolidado.ivaDebitoReales },
      { Concepto: 'Compras Netas (Gastos con Factura/Boleta)', Monto_CLP: f29Consolidado.comprasNetasReales },
      { Concepto: 'IVA Crédito Fiscal Recuperable', Monto_CLP: f29Consolidado.ivaCreditoReales },
      { Concepto: 'IVA Neto a Pagar (Débito - Crédito)', Monto_CLP: f29Consolidado.ivaAPagarReal },
      { Concepto: 'Remanente Crédito Fiscal a Favor', Monto_CLP: f29Consolidado.remanenteCreditoReal },
      {
        Concepto: `Retención Honorarios ${Math.round(CHILE_HONORARIOS_RETENTION_2026 * 10000) / 100}%`,
        Monto_CLP: f29Consolidado.retencionHonorarios,
      },
      { Concepto: 'TOTAL ESTIMADO F29 A DECLARAR', Monto_CLP: f29Consolidado.totalF29Estimado },
    ];

    const cxcRows = cxcList.map((s) => ({
      Proyecto: s.event.name,
      Cliente: s.event.client_company || '',
      Estado: EVENT_STATUS_LABELS[s.event.status] || s.event.status,
      Fecha: s.event.event_date || '',
      Total_Venta_CLP: s.presupuestadoVenta,
      Abonos_Recibidos_CLP: s.abonosRecibidos,
      Saldo_Por_Cobrar_CLP: s.cxcPendiente,
      Gastos_Reales_CLP: s.gastosReales,
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumenRows), 'Resumen_F29');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(cxcRows), 'Cuentas_Por_Cobrar');
    XLSX.writeFile(wb, `FIGURA_Tesoreria_F29_${periodLabel}.xlsx`);
  };

  const yearOptions = useMemo(() => {
    const cur = new Date().getFullYear();
    return [cur - 1, cur, cur + 1].map((y) => ({ value: String(y), label: String(y) }));
  }, []);

  const monthOptions = useMemo(
    () => [
      { value: '0', label: 'Todo el Año' },
      ...Array.from({ length: 12 }, (_, idx) => ({
        value: String(idx + 1),
        label: getMonthName(idx + 1),
      })),
    ],
    []
  );

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Tesorería, Flujo 30/60/90d &amp; F29
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Control multi-proyecto de cuentas por cobrar, IVA consolidado SII, cartola bancaria/RCV y choques de agenda.
          </p>
        </div>

        {!treasuryLocked && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant={activeTab === 'cashflow' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('cashflow')}
              className="gap-1.5"
            >
              <Wallet className="h-3.5 w-3.5" />
              Flujo &amp; F29
            </Button>
            <Button
              type="button"
              variant={activeTab === 'reconciler' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('reconciler')}
              className="gap-1.5"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Cartola &amp; RCV SII
            </Button>
            <Button
              type="button"
              variant={activeTab === 'agenda' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('agenda')}
              className="gap-1.5"
            >
              <CalendarDays className="h-3.5 w-3.5" />
              Agenda
              {conflictsCount > 0 && (
                <Badge variant="destructive" className="px-1.5 py-0 text-[10px] ml-0.5">
                  {conflictsCount}
                </Badge>
              )}
            </Button>
          </div>
        )}
      </div>

      {workspaceLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : treasuryLocked ? (
        <FeatureLockCard
          isExpiredLock={entitlements.isExpiredLock}
          title="Tesorería, Flujo Proyectado 30/60/90d y Conciliador Cartola/RCV"
          description="Controla tus cuentas por cobrar multi-proyecto, calcula el F29 consolidado SII mensual y concilia cartolas bancarias en segundos desde el Plan Operación Esencial."
          requiredPlanLabel="Plan Operación Esencial+"
        />
      ) : loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* KPI Summary Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="glass-card">
              <CardContent className="p-4 space-y-1">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                  <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" />
                  Por Cobrar Confirmado
                </span>
                <p className="text-2xl font-bold font-mono text-slate-900">
                  {formatCLP(kpis.cxcConfirmada)}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  +{formatCLP(kpis.cxcPipeline)} en propuestas en planificación
                </p>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardContent className="p-4 space-y-1">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                  <Landmark className="h-3.5 w-3.5 text-[#4A607A]" />
                  Caja Neta Realizada
                </span>
                <p
                  className={cn(
                    'text-2xl font-bold font-mono',
                    kpis.cajaNetaRealizada >= 0 ? 'text-emerald-700' : 'text-rose-700'
                  )}
                >
                  {formatCLP(kpis.cajaNetaRealizada)}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Abonos reales menos gastos contabilizados
                </p>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardContent className="p-4 space-y-1">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-primary" />
                  Flujo Proyectado (90d)
                </span>
                <p className="text-2xl font-bold font-mono text-slate-900">
                  {formatCLP(kpis.flujoProyectado90d)}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Caja actual + CxC 90d - egresos pendientes
                </p>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardContent className="p-4 space-y-1">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                  <Receipt className="h-3.5 w-3.5 text-amber-600" />
                  F29 Estimado ({Number(selectedMonth) === 0 ? selectedYear : `${getMonthName(Number(selectedMonth)).slice(0, 3)} ${selectedYear}`})
                </span>
                <p className="text-2xl font-bold font-mono text-amber-800">
                  {formatCLP(f29Consolidado.totalF29Estimado)}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  IVA neto + retención honorarios 15,25%
                </p>
              </CardContent>
            </Card>
          </div>

          {activeTab === 'cashflow' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <CashflowChart data={buckets} />
                </div>

                {/* Global F29 Tax Card */}
                <Card className="glass-card flex flex-col justify-between">
                  <CardHeader className="pb-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-base font-semibold">
                        Consolidado SII F29 Global
                      </CardTitle>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleExportF29Excel}
                        className="gap-1.5 text-xs"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Excel F29
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        options={monthOptions}
                      />
                      <Select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        options={yearOptions}
                      />
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-2.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-muted-foreground">IVA Débito (Abonos reales):</span>
                      <span className="font-mono font-semibold text-rose-700">
                        +{formatCLP(f29Consolidado.ivaDebitoReales)}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-muted-foreground">IVA Crédito (Facturas gasto):</span>
                      <span className="font-mono font-semibold text-emerald-700">
                        -{formatCLP(f29Consolidado.ivaCreditoReales)}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-muted-foreground">
                        Ret. Honorarios ({Math.round(CHILE_HONORARIOS_RETENTION_2026 * 10000) / 100}%):
                      </span>
                      <span className="font-mono font-semibold">
                        +{formatCLP(f29Consolidado.retencionHonorarios)}
                      </span>
                    </div>
                    {f29Consolidado.remanenteCreditoReal > 0 && (
                      <div className="flex justify-between py-1 text-emerald-700">
                        <span>Remanente IVA a favor:</span>
                        <span className="font-mono font-semibold">
                          {formatCLP(f29Consolidado.remanenteCreditoReal)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-baseline pt-2 border-t text-sm font-bold">
                      <span>Total F29 Real Estimado:</span>
                      <span className="font-mono text-amber-800">
                        {formatCLP(f29Consolidado.totalF29Estimado)}
                      </span>
                    </div>
                    <div className="rounded-lg bg-muted/40 p-2.5 text-[11px] text-muted-foreground space-y-0.5 mt-2">
                      <p className="font-semibold text-foreground">
                        Referencia Devengada en Período ({f29Consolidado.movCount} movs caja):
                      </p>
                      <p>
                        IVA Débito Presupuestado: {formatCLP(f29Consolidado.ivaDebitoDevengado)} · Crédito: {formatCLP(f29Consolidado.ivaCreditoProyectado)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Accounts Receivable Table */}
              <Card>
                <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
                  <CardTitle className="text-base font-semibold">
                    Cuentas por Cobrar por {terms.projectSingular} ({cxcList.length})
                  </CardTitle>
                  {conflictsCount > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveTab('agenda')}
                      className="gap-1.5 text-amber-800 border-amber-300 bg-amber-50 hover:bg-amber-100"
                    >
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Ver {conflictsCount} topes de fecha
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  {cxcList.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-8">
                      No hay {terms.projectPlural.toLowerCase()} activos con saldos pendientes por cobrar.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground">
                            <th className="py-2.5 px-3 text-left">{terms.projectSingular}</th>
                            <th className="py-2.5 px-3 text-left">Fecha</th>
                            <th className="py-2.5 px-3 text-left">Estado</th>
                            <th className="py-2.5 px-3 text-right">Venta Total</th>
                            <th className="py-2.5 px-3 text-right">Abonado</th>
                            <th className="py-2.5 px-3 text-right">Saldo CxC</th>
                            <th className="py-2.5 px-3 text-right">Acción</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {cxcList.map((s) => {
                            const pctPaid =
                              s.presupuestadoVenta > 0
                                ? Math.min(100, Math.round((s.abonosRecibidos / s.presupuestadoVenta) * 100))
                                : 0;
                            return (
                              <tr key={s.event.id} className="hover:bg-muted/20">
                                <td className="py-2.5 px-3">
                                  <p className="font-semibold text-slate-900">{s.event.name}</p>
                                  <p className="text-[11px] text-muted-foreground">
                                    {s.event.client_company || 'Sin cliente'}
                                  </p>
                                </td>
                                <td className="py-2.5 px-3 whitespace-nowrap font-mono">
                                  {s.event.event_date ? formatDateCL(s.event.event_date) : 'Por definir'}
                                </td>
                                <td className="py-2.5 px-3">
                                  <Badge variant="outline" className="text-[10px]">
                                    {EVENT_STATUS_LABELS[s.event.status] || s.event.status}
                                  </Badge>
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono">
                                  {formatCLP(s.presupuestadoVenta)}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono text-emerald-700">
                                  {formatCLP(s.abonosRecibidos)} ({pctPaid}%)
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                                  {formatCLP(s.cxcPendiente)}
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  <Link href={`/events/${s.event.id}`}>
                                    <Button type="button" variant="ghost" size="sm" className="gap-1 h-7">
                                      Abrir
                                      <ExternalLink className="h-3 w-3" />
                                    </Button>
                                  </Link>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'reconciler' && (
            <BankReconciler events={events} onReconciled={() => fetchTreasuryData(true)} />
          )}

          {activeTab === 'agenda' && (
            <ResourceCalendar events={events} projectPluralLabel={terms.projectPlural} />
          )}
        </>
      )}
    </div>
  );
}
