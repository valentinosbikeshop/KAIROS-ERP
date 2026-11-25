'use client';

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Sparkles,
  Upload,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { CHILE_HONORARIOS_RETENTION_2026 } from '@/lib/constants';
import { cn, formatCLP, parseDateSafe } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Event, EventItem } from '@/types/database';

type ReconcileKind = 'ABONO_CLIENTE' | 'GASTO_REAL';
type ExpenseDocMode = 'factura' | 'honorarios' | 'boleta';

interface ParsedMovementRow {
  rowKey: string;
  fecha: string;
  descripcion: string;
  amount: number;
  kind: ReconcileKind;
  docMode: ExpenseDocMode;
  aplicaIva: boolean;
  eventId: string;
  selected: boolean;
  isDuplicate: boolean;
  sourceTag: 'bank' | 'sii_rcv' | 'demo';
}

interface BankReconcilerProps {
  events: (Event & { event_items?: EventItem[] })[];
  onReconciled: () => void | Promise<void>;
}

function normalizeChileanNumber(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  const s = String(raw || '').trim();
  if (!s) return 0;
  const isParenNegative = s.startsWith('(') && s.endsWith(')');
  const stripped = s.replace(/[$\s()]/g, '');
  // Si tiene punto como separador de miles y opcional coma decimal: 1.250.000,50
  const hasComma = stripped.includes(',');
  const hasDot = stripped.includes('.');
  let normalized = stripped;
  if (hasComma && hasDot) {
    normalized = stripped.replace(/\./g, '').replace(',', '.');
  } else if (hasDot) {
    const parts = stripped.split('.');
    // En CLP los montos suelen usar puntos de miles (3 dígitos tras cada punto)
    if (parts.length > 2 || (parts[1] && parts[1].length === 3)) {
      normalized = stripped.replace(/\./g, '');
    }
  } else if (hasComma) {
    normalized = stripped.replace(',', '.');
  }
  const num = Number(normalized.replace(/[^0-9.-]/g, ''));
  if (!Number.isFinite(num)) return 0;
  return isParenNegative ? -Math.abs(num) : num;
}

function normalizeChileanDate(raw: unknown): string {
  if (typeof raw === 'number' && raw > 20000 && raw < 80000) {
    // Excel serial date
    const utcDays = Math.floor(raw - 25569);
    const d = new Date(utcDays * 86400 * 1000);
    return d.toISOString().slice(0, 10);
  }
  const s = String(raw || '').trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const dmy = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/);
  if (dmy) {
    const dd = dmy[1].padStart(2, '0');
    const mm = dmy[2].padStart(2, '0');
    const yyyy = dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3];
    return `${yyyy}-${mm}-${dd}`;
  }
  return new Date().toISOString().slice(0, 10);
}

function scoreEventMatch(
  description: string,
  activeEvents: (Event & { event_items?: EventItem[] })[]
): string {
  const cleanDesc = description
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  let bestId = activeEvents[0]?.id || '';
  let bestScore = 0;

  for (const ev of activeEvents) {
    const haystack = `${ev.name} ${ev.client_company || ''} ${ev.location || ''}`
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    const tokens = haystack
      .split(/\s+/)
      .filter((t) => t.length >= 4 && !['evento', 'proyecto', 'demo', 'spa'].includes(t));

    let score = 0;
    for (const token of tokens) {
      if (cleanDesc.includes(token)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      bestId = ev.id;
    }
  }
  return bestId;
}

export function BankReconciler({ events, onReconciled }: BankReconcilerProps) {
  const [rows, setRows] = useState<ParsedMovementRow[]>([]);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; message: string } | null>(null);

  const activeEvents = useMemo(
    () => events.filter((e) => !e.deleted_at),
    [events]
  );

  const existingTxFingerprints = useMemo(() => {
    const set: { eventId: string; kind: ReconcileKind; amount: number; fecha: string }[] = [];
    for (const ev of activeEvents) {
      for (const item of ev.event_items || []) {
        if (item.tipo_evento !== 'ABONO_CLIENTE' && item.tipo_evento !== 'GASTO_REAL') continue;
        const fechaPart = String(item.detalle || '').split('|')[0]?.trim() || '';
        set.push({
          eventId: ev.id,
          kind: item.tipo_evento,
          amount: Math.round(Number(item.valor_total || 0)),
          fecha: fechaPart,
        });
      }
    }
    return set;
  }, [activeEvents]);

  const checkDuplicate = (eventId: string, kind: ReconcileKind, amount: number, fecha: string) => {
    const rounded = Math.round(amount);
    const pTarget = parseDateSafe(fecha);
    return existingTxFingerprints.some((ex) => {
      if (ex.kind !== kind || ex.amount !== rounded) return false;
      if (eventId && ex.eventId !== eventId) return false;
      if (!ex.fecha || !pTarget.year) return false;
      const pEx = parseDateSafe(ex.fecha);
      if (!pEx.year) return false;
      const diffDays = Math.abs(
        new Date(pTarget.year, pTarget.month - 1, pTarget.day).getTime() -
          new Date(pEx.year, pEx.month - 1, pEx.day).getTime()
      );
      return diffDays <= 86400 * 1000;
    });
  };

  const handleLoadSample = () => {
    setFeedback(null);
    if (activeEvents.length === 0) {
      setFeedback({ type: 'err', message: 'Crea al menos un proyecto antes de conciliar movimientos.' });
      return;
    }

    const firstEv = activeEvents[0];
    const secondEv = activeEvents[1] || firstEv;
    const today = new Date().toISOString().slice(0, 10);

    const samples: Omit<ParsedMovementRow, 'selected' | 'isDuplicate'>[] = [
      {
        rowKey: `sample-1-${Date.now()}`,
        fecha: today,
        descripcion: `TEF ABONO CLIENTE ${firstEv.client_company || firstEv.name}`,
        amount: 650000,
        kind: 'ABONO_CLIENTE',
        docMode: 'factura',
        aplicaIva: true,
        eventId: firstEv.id,
        sourceTag: 'bank',
      },
      {
        rowKey: `sample-2-${Date.now()}`,
        fecha: today,
        descripcion: `SII RCV FACTURA COMPRA PROVEEDOR INSUMOS (${secondEv.name.slice(0, 22)})`,
        amount: 238000,
        kind: 'GASTO_REAL',
        docMode: 'factura',
        aplicaIva: true,
        eventId: secondEv.id,
        sourceTag: 'sii_rcv',
      },
      {
        rowKey: `sample-3-${Date.now()}`,
        fecha: today,
        descripcion: `PAGO BOLETA HONORARIOS EQUIPO OPERATIVO`,
        amount: 180000,
        kind: 'GASTO_REAL',
        docMode: 'honorarios',
        aplicaIva: false,
        eventId: firstEv.id,
        sourceTag: 'demo',
      },
    ];

    setFileName('Cartola_SII_RCV_Simulada.csv');
    setRows(
      samples.map((s) => {
        const dup = checkDuplicate(s.eventId, s.kind, s.amount, s.fecha);
        return { ...s, isDuplicate: dup, selected: !dup };
      })
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParsing(true);
    setFeedback(null);
    setFileName(file.name);

    try {
      const XLSX = await import('xlsx');
      const buf = await file.arrayBuffer();
      const workbook = XLSX.read(buf, { type: 'array', cellDates: false });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const matrix = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
        header: 1,
        defval: '',
      });

      if (!matrix || matrix.length < 2) {
        setFeedback({ type: 'err', message: 'El archivo no contiene suficientes filas para conciliar.' });
        setParsing(false);
        return;
      }

      // Buscar fila de cabecera dentro de las primeras 15 líneas (formato bancos chilenos / SII RCV)
      let headerIdx = -1;
      for (let i = 0; i < Math.min(15, matrix.length); i++) {
        const line = (matrix[i] || []).map((c) => String(c || '').toLowerCase()).join(' | ');
        if (
          (line.includes('fecha') && (line.includes('cargo') || line.includes('abono') || line.includes('monto') || line.includes('total'))) ||
          (line.includes('folio') && (line.includes('razon social') || line.includes('razón social') || line.includes('monto total')))
        ) {
          headerIdx = i;
          break;
        }
      }

      if (headerIdx === -1) headerIdx = 0;
      const headers = (matrix[headerIdx] || []).map((h) =>
        String(h || '')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .trim()
      );

      const findCol = (keywords: string[]) =>
        headers.findIndex((h) => keywords.some((k) => h.includes(k)));

      const colFecha = findCol(['fecha docto', 'fecha', 'f. contable', 'dia']);
      const colDesc = findCol(['descripcion', 'detalle', 'glosa', 'razon social', 'nombre', 'concepto']);
      const colAbono = findCol(['abono', 'haber', 'deposito', 'ingreso', 'credito']);
      const colCargo = findCol(['cargo', 'debe', 'giro', 'egreso', 'debito']);
      const colMonto = findCol(['monto total', 'monto', 'importe', 'valor', 'total']);
      const colTipoDoc = findCol(['tipo doc', 'documento', 'tipo dte']);

      const isSiiRcv = headers.some((h) => h.includes('folio') || h.includes('iva recuperable') || h.includes('razon social'));

      const parsedRows: ParsedMovementRow[] = [];
      for (let r = headerIdx + 1; r < matrix.length; r++) {
        const row = matrix[r] || [];
        if (row.every((c) => String(c || '').trim() === '')) continue;

        const fecha = normalizeChileanDate(colFecha >= 0 ? row[colFecha] : '');
        const descripcion = String(colDesc >= 0 ? row[colDesc] : row.slice(0, 3).join(' ')).trim();
        if (!descripcion) continue;

        const abono = colAbono >= 0 ? Math.abs(normalizeChileanNumber(row[colAbono])) : 0;
        const cargo = colCargo >= 0 ? Math.abs(normalizeChileanNumber(row[colCargo])) : 0;
        const montoRaw = colMonto >= 0 ? normalizeChileanNumber(row[colMonto]) : 0;

        let kind: ReconcileKind = 'GASTO_REAL';
        let amount = 0;

        if (abono > 0 && cargo === 0) {
          kind = 'ABONO_CLIENTE';
          amount = abono;
        } else if (cargo > 0 && abono === 0) {
          kind = 'GASTO_REAL';
          amount = cargo;
        } else if (montoRaw !== 0) {
          kind = montoRaw > 0 && !isSiiRcv ? 'ABONO_CLIENTE' : 'GASTO_REAL';
          amount = Math.abs(montoRaw);
        }

        amount = Math.round(amount);
        if (amount <= 0) continue;

        const docText = `${colTipoDoc >= 0 ? row[colTipoDoc] : ''} ${descripcion}`.toLowerCase();
        const docMode: ExpenseDocMode =
          docText.includes('honorario')
            ? 'honorarios'
            : isSiiRcv || docText.includes('factura') || docText.includes('iva') || docText.includes('33')
            ? 'factura'
            : docText.includes('boleta')
            ? 'boleta'
            : 'factura';

        const matchedEventId = scoreEventMatch(descripcion, activeEvents);
        const isDuplicate = checkDuplicate(matchedEventId, kind, amount, fecha);

        parsedRows.push({
          rowKey: `row-${r}-${Date.now()}`,
          fecha,
          descripcion: descripcion.slice(0, 140),
          amount,
          kind,
          docMode,
          aplicaIva: kind === 'ABONO_CLIENTE' ? true : docMode === 'factura',
          eventId: matchedEventId,
          selected: !isDuplicate && Boolean(matchedEventId),
          isDuplicate,
          sourceTag: isSiiRcv ? 'sii_rcv' : 'bank',
        });
      }

      if (parsedRows.length === 0) {
        setFeedback({
          type: 'err',
          message: 'No pudimos detectar columnas válidas de fecha y monto. Usa un CSV/XLSX de cartola bancaria o RCV SII.',
        });
      } else {
        setRows(parsedRows.slice(0, 150));
      }
    } catch (err: any) {
      setFeedback({ type: 'err', message: err?.message || 'Error leyendo el archivo.' });
    } finally {
      setParsing(false);
      e.target.value = '';
    }
  };

  const handleBatchReconcile = async () => {
    const selectedRows = rows.filter((r) => r.selected && r.eventId && r.amount > 0);
    if (selectedRows.length === 0) return;

    setSaving(true);
    setFeedback(null);

    try {
      const supabase = createClient();
      const payload = selectedRows.map((row) => {
        const isGasto = row.kind === 'GASTO_REAL';
        const isFacturaDoc = isGasto && row.docMode === 'factura';
        const monto = Math.round(row.amount);
        const facturaNeto = Math.round(monto / 1.19);
        const facturaIvaCredito = isFacturaDoc ? monto - facturaNeto : 0;
        const abonoNeto = row.aplicaIva ? Math.round(monto / 1.19) : monto;
        const abonoIvaDebito = row.aplicaIva ? monto - abonoNeto : 0;

        const honorariosNote =
          isGasto && row.docMode === 'honorarios'
            ? ` [Ret. ${Math.round(CHILE_HONORARIOS_RETENTION_2026 * 10000) / 100}%: ${formatCLP(Math.round(monto * CHILE_HONORARIOS_RETENTION_2026))}]`
            : '';

        const servicioLabel = isGasto
          ? row.docMode === 'factura'
            ? 'Factura de Proveedor'
            : row.docMode === 'honorarios'
            ? 'Boleta de Honorarios (Personal)'
            : 'Boleta de Proveedor'
          : 'Abono de Cliente';

        return {
          event_id: row.eventId,
          servicio: servicioLabel,
          detalle: `${row.fecha} | ${row.descripcion}${honorariosNote}`.trim(),
          tipo_evento: isGasto ? 'GASTO_REAL' : 'ABONO_CLIENTE',
          cantidad: 1,
          costo: isGasto ? monto : 0,
          ganancia: isGasto ? 0 : monto,
          valor_neto: isGasto ? (isFacturaDoc ? facturaNeto : monto) : abonoNeto,
          iva: isGasto ? (isFacturaDoc ? facturaIvaCredito : 0) : abonoIvaDebito,
          valor_total: monto,
          margen: isGasto ? 0 : 100,
          tipo_doc_costo: isGasto ? (isFacturaDoc ? 'factura' : 'boleta') : 'transferencia',
          iva_incluido: isGasto ? isFacturaDoc : row.aplicaIva,
          approved: true,
        };
      });

      const { error } = await (supabase.from('event_items') as any).insert(payload);
      if (error) throw error;

      setRows([]);
      setFileName(null);
      setFeedback({
        type: 'ok',
        message: `${selectedRows.length} movimiento(s) conciliados y contabilizados exitosamente en sus proyectos.`,
      });
      await onReconciled();
    } catch (err: any) {
      setFeedback({
        type: 'err',
        message: err?.message || 'No se pudieron contabilizar los movimientos seleccionados.',
      });
    } finally {
      setSaving(false);
    }
  };

  const selectedCount = rows.filter((r) => r.selected && r.eventId).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-primary" />
                Conciliador Automático: Cartola Bancaria &amp; RCV del SII
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Sube un CSV o Excel de tu banco (Chile, Santander, BCI, BancoEstado) o Registro de Compras/Ventas del SII. Detecta duplicados y asigna abonos o gastos reales en 1 clic sin API bancaria externa.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleLoadSample}
                disabled={parsing || activeEvents.length === 0}
                className="gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Cargar Cartola Demo (3 movs)
              </Button>
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium cursor-pointer transition-colors">
                {parsing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="h-3.5 w-3.5" />
                )}
                <span>Subir CSV / XLSX</span>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={handleFileUpload}
                  disabled={parsing || activeEvents.length === 0}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {feedback && (
            <div
              className={cn(
                'rounded-xl border p-3.5 text-xs flex items-center gap-2.5',
                feedback.type === 'ok'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                  : 'border-destructive/30 bg-destructive/10 text-destructive'
              )}
            >
              {feedback.type === 'ok' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {rows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-muted/20 p-8 text-center space-y-2">
              <FileSpreadsheet className="h-8 w-8 text-muted-foreground mx-auto opacity-60" />
              <p className="text-sm font-medium text-slate-800">
                Listo para conciliar tu cartola bancaria o libro RCV SII
              </p>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Procesamiento 100% privado en tu navegador: ninguna credencial bancaria sale de tu sesión. Haz clic en <strong>Subir CSV / XLSX</strong> o prueba con <strong>Cargar Cartola Demo</strong>.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono">
                    {fileName}
                  </Badge>
                  <span className="text-muted-foreground">
                    {rows.length} movimientos detectados · {selectedCount} seleccionados
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setRows([]);
                      setFileName(null);
                    }}
                  >
                    Limpiar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={saving || selectedCount === 0}
                    onClick={handleBatchReconcile}
                    className="gap-1.5"
                  >
                    {saving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                    Contabilizar ({selectedCount})
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/40 border-b text-muted-foreground uppercase tracking-wider text-[10px]">
                      <th className="p-2.5 text-center w-10">Inc.</th>
                      <th className="p-2.5 text-left">Fecha</th>
                      <th className="p-2.5 text-left">Glosa / Proveedor</th>
                      <th className="p-2.5 text-left">Tipo &amp; Respaldo</th>
                      <th className="p-2.5 text-left">Proyecto Asignado</th>
                      <th className="p-2.5 text-right">Monto CLP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {rows.map((row) => (
                      <tr
                        key={row.rowKey}
                        className={cn(
                          'hover:bg-muted/20',
                          row.isDuplicate && 'bg-amber-50/60'
                        )}
                      >
                        <td className="p-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={row.selected}
                            onChange={(e) =>
                              setRows((prev) =>
                                prev.map((r) =>
                                  r.rowKey === row.rowKey ? { ...r, selected: e.target.checked } : r
                                )
                              )
                            }
                            className="h-4 w-4 rounded border-slate-300"
                          />
                        </td>
                        <td className="p-2.5 font-mono whitespace-nowrap">{row.fecha}</td>
                        <td className="p-2.5 min-w-44">
                          <p className="font-medium text-slate-900 line-clamp-2">{row.descripcion}</p>
                          {row.isDuplicate && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-amber-800 font-semibold mt-0.5">
                              <AlertTriangle className="h-3 w-3" />
                              Posible duplicado detectado
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 space-y-1 min-w-36">
                          <select
                            value={row.kind}
                            onChange={(e) =>
                              setRows((prev) =>
                                prev.map((r) =>
                                  r.rowKey === row.rowKey
                                    ? { ...r, kind: e.target.value as ReconcileKind }
                                    : r
                                )
                              )
                            }
                            className="w-full rounded-md border bg-background px-2 py-1 text-xs"
                          >
                            <option value="ABONO_CLIENTE">Abono Cliente (+)</option>
                            <option value="GASTO_REAL">Gasto Real (-)</option>
                          </select>
                          {row.kind === 'GASTO_REAL' && (
                            <select
                              value={row.docMode}
                              onChange={(e) =>
                                setRows((prev) =>
                                  prev.map((r) =>
                                    r.rowKey === row.rowKey
                                      ? { ...r, docMode: e.target.value as ExpenseDocMode }
                                      : r
                                  )
                                )
                              }
                              className="w-full rounded-md border bg-background px-2 py-1 text-[11px]"
                            >
                              <option value="factura">Factura (IVA 19%)</option>
                              <option value="honorarios">Honorarios (15,25%)</option>
                              <option value="boleta">Boleta Exenta / Sin IVA</option>
                            </select>
                          )}
                        </td>
                        <td className="p-2.5 min-w-44">
                          <select
                            value={row.eventId}
                            onChange={(e) =>
                              setRows((prev) =>
                                prev.map((r) =>
                                  r.rowKey === row.rowKey
                                    ? {
                                        ...r,
                                        eventId: e.target.value,
                                        isDuplicate: checkDuplicate(
                                          e.target.value,
                                          r.kind,
                                          r.amount,
                                          r.fecha
                                        ),
                                      }
                                    : r
                                )
                              )
                            }
                            className="w-full rounded-md border bg-background px-2 py-1 text-xs"
                          >
                            {activeEvents.map((ev) => (
                              <option key={ev.id} value={ev.id}>
                                {ev.name} ({ev.client_company || 'S/C'})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td
                          className={cn(
                            'p-2.5 text-right font-mono font-semibold whitespace-nowrap',
                            row.kind === 'ABONO_CLIENTE' ? 'text-emerald-700' : 'text-rose-700'
                          )}
                        >
                          {row.kind === 'ABONO_CLIENTE' ? '+' : '-'}
                          {formatCLP(row.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
