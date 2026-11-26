'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useWorkspaceConfig } from '@/hooks/use-workspace-config';
import { useUser } from '@/hooks/use-user';
import {
  computeItemFinancials,
  computeProjectFinancials,
  isBudgetLineItem,
} from '@/lib/finance-core';
import { canUseModule, requiredPlanForModule } from '@/lib/plan-guards';
import { can } from '@/lib/rbac';
import { Event, EventItem } from '@/types';
import { PdfGenerator } from '@/components/reports/pdf-generator';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatCLP, formatPercentage } from '@/lib/utils';
import Link from 'next/link';
import { ArrowLeft, Loader2, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ReportPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { entitlements, isDuoExempt, organization, terms, plans } = useWorkspaceConfig();
  const { profile } = useUser();
  const canExportPdf = isDuoExempt || canUseModule(entitlements, 'mod_pdf_quotes');
  const pdfPlan = requiredPlanForModule('mod_pdf_quotes', plans);
  const canViewMargins = isDuoExempt || can(profile, 'view_costs_margins', entitlements);

  const [event, setEvent] = useState<Event | null>(null);
  const [allItems, setAllItems] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', params.id)
        .maybeSingle();

      if (eventError || !eventData) {
        setLoading(false);
        return;
      }

      const loaded = eventData as Event;
      if (loaded.status !== 'completed') {
        router.push(`/events/${params.id}`);
        return;
      }

      setEvent(loaded);

      const { data: itemsData } = await supabase
        .from('event_items')
        .select('*')
        .eq('event_id', params.id);

      if (itemsData) {
        setAllItems(itemsData as EventItem[]);
      }
      setLoading(false);
    };

    fetchData();
  }, [params.id, router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">{terms.projectSingular} no encontrado.</p>
        <Link href="/events">
          <Button variant="link" className="mt-2">
            Volver a {terms.projectPlural}
          </Button>
        </Link>
      </div>
    );
  }

  const activeTaxRegime = event.tax_regime || organization?.tax_regime || 'afecto_iva';
  const honorariosPolicy = organization?.honorarios_retention_policy || 'contractor';

  // Filtrar !it.parent_id para la tabla visible, pero pasar allItems a computeProjectFinancials
  // para consolidar padre = suma(hijos) en IVA Crédito + ejecutado real (ABONO_CLIENTE / GASTO_REAL + 15,25%)
  const topLevelOfficialItems = allItems.filter(
    (it) =>
      it.approved &&
      !it.parent_id &&
      !it.es_insumo &&
      isBudgetLineItem(it)
  );

  const projectFin = computeProjectFinancials(allItems, {
    taxRegime: activeTaxRegime,
    honorariosPolicy,
    onlyApproved: true,
  });

  const mermasPct = Number(event.mermas_pct || 0);
  const costoInsumosParaMerma = allItems.reduce((sum, it) => {
    if (it.approved && isBudgetLineItem(it) && (it.es_insumo || it.parent_id)) {
      const f = computeItemFinancials(it, { taxRegime: activeTaxRegime });
      return sum + f.costoNeto;
    }
    return sum;
  }, 0);
  const baseMerma = costoInsumosParaMerma > 0 ? costoInsumosParaMerma : projectFin.costoNetoTotal;
  const montoMermas = mermasPct > 0 ? Math.round(baseMerma * (mermasPct / 100)) : 0;

  const utilidadNetaReal = projectFin.utilidadNeta - montoMermas;
  const margenVentaReal =
    projectFin.facturacionNeta > 0
      ? Math.round((utilidadNetaReal / projectFin.facturacionNeta) * 1000) / 10
      : 0;
  const cashInmediatoPresupuestado = projectFin.facturacionBruta - projectFin.costoBrutoTotal;
  const balanceF29Ejecutado =
    projectFin.executed.abonosIvaDebito - projectFin.executed.gastosIvaCredito;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Link href={`/events/${params.id}`} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Informe Contable de {terms.projectSingular}
            </h1>
            <p className="text-muted-foreground">{event.name}</p>
          </div>
        </div>
        {canExportPdf ? (
          <PdfGenerator event={event} items={allItems} />
        ) : (
          <Link href="/billing">
            <Button variant="outline" className="gap-2 text-xs">
              <Lock className="h-3.5 w-3.5 text-amber-600" />
              Activar Exportación PDF ({pdfPlan.name})
            </Button>
          </Link>
        )}
      </div>

      {canViewMargins ? (
        <>
          {/* Bloque 1: Presupuestado Oficial */}
          <div className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              1. Presupuesto Oficial Aprobado (Criterio Neto SII)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Costos Netos (ex-IVA)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {formatCLP(projectFin.costoNetoTotal)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Bruto: {formatCLP(projectFin.costoBrutoTotal)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Facturación Neta (ex-IVA)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCLP(projectFin.facturacionNeta)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Bruto c/IVA: {formatCLP(projectFin.facturacionBruta)}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-emerald-500/10 border-emerald-300 dark:border-emerald-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                    Flujo Bruto Proyectado
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
                    {formatCLP(cashInmediatoPresupuestado)}
                  </div>
                  <p className="text-xs text-emerald-700/80 dark:text-emerald-300 mt-1">
                    Cobro bruto menos costos brutos
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">IVA Presupuestado (F29)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">IVA Débito:</span>
                    <span className="font-medium text-orange-600">{formatCLP(projectFin.ivaDebito)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">IVA Crédito:</span>
                    <span className="font-medium text-green-600">-{formatCLP(projectFin.ivaCredito)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold pt-1 border-t mt-1">
                    <span>Neto SII:</span>
                    <span className={projectFin.ivaNetoF29 > 0 ? 'text-amber-600' : 'text-green-600'}>
                      {projectFin.ivaNetoF29 > 0
                        ? formatCLP(projectFin.ivaNetoF29)
                        : `${formatCLP(projectFin.remanenteIvaF29)} (a favor)`}
                    </span>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-blue-50/50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-blue-800 dark:text-blue-300">
                    Utilidad Neta Real
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                    {formatCLP(utilidadNetaReal)}
                  </div>
                  <p className="text-xs text-blue-600/80 mt-1">
                    Margen s/ Venta: {formatPercentage(margenVentaReal)}
                    {montoMermas > 0 ? ` (Mermas -${formatCLP(montoMermas)})` : ''}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Bloque 2: Ejecutado Real (Caja + Retención 15,25%) */}
          <div className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              2. Ejecución Real de Caja &amp; Retenciones SII (Abonos y Gastos Rendidos)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Abonos Recibidos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-emerald-700">
                    {formatCLP(projectFin.executed.abonosBrutos)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    IVA Débito: {formatCLP(projectFin.executed.abonosIvaDebito)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Gastos Reales Pagados</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-rose-600">
                    {formatCLP(projectFin.executed.gastosBrutos)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    IVA Crédito: {formatCLP(projectFin.executed.gastosIvaCredito)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Retención Honorarios 15,25%</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-indigo-700">
                    {formatCLP(projectFin.executed.retencionHonorariosTotal)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Proyectado en boletas: {formatCLP(projectFin.retencionHonorariosEstimada)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Caja Neta Ejecutada</CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className={`text-xl font-bold ${
                      projectFin.executed.cajaNetaEjecutada >= 0 ? 'text-emerald-700' : 'text-rose-600'
                    }`}
                  >
                    {formatCLP(projectFin.executed.cajaNetaEjecutada)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Balance IVA F29 Real:{' '}
                    {balanceF29Ejecutado >= 0
                      ? `${formatCLP(balanceF29Ejecutado)} a pagar`
                      : `${formatCLP(Math.abs(balanceF29Ejecutado))} a favor`}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Su rol actual tiene restringida la visualización de costos internos, márgenes y utilidades. Puede consultar el detalle comercial de partidas a continuación.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Detalle de Partidas del {terms.projectSingular}</CardTitle>
          <CardDescription>
            Valores unitarios y subtotales multiplicados por cantidad (excluye insumos internos consolidados).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-muted/50">
                <tr>
                  <th className="px-4 py-3">Partida / Servicio</th>
                  <th className="px-4 py-3">Detalle</th>
                  <th className="px-4 py-3 text-center">Cant.</th>
                  {canViewMargins && <th className="px-4 py-3 text-right">Costo Total</th>}
                  {canViewMargins && <th className="px-4 py-3 text-right">Utilidad Neta</th>}
                  <th className="px-4 py-3 text-right">Total Venta</th>
                </tr>
              </thead>
              <tbody>
                {topLevelOfficialItems.map((item) => {
                  const fin = computeItemFinancials(item, { taxRegime: activeTaxRegime });
                  return (
                    <tr key={item.id} className="border-b">
                      <td className="px-4 py-3 font-medium">{item.servicio}</td>
                      <td className="px-4 py-3 text-muted-foreground">{item.detalle || '—'}</td>
                      <td className="px-4 py-3 text-center font-mono">{fin.cantidad}</td>
                      {canViewMargins && (
                        <td className="px-4 py-3 text-right font-mono">
                          {formatCLP(fin.costoBruto)}
                        </td>
                      )}
                      {canViewMargins && (
                        <td className="px-4 py-3 text-right font-mono">
                          {formatCLP(fin.utilidadNeta)}
                        </td>
                      )}
                      <td className="px-4 py-3 text-right font-mono font-semibold">
                        {formatCLP(fin.ventaTotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
