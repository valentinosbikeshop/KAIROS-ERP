'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogBody } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Loader2, Trash2, AlertTriangle, Calendar as CalendarIcon, FileText, CreditCard, Receipt, Users, Camera, CheckCircle2 } from 'lucide-react';
import { EventItem } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { useWorkspaceConfig } from '@/hooks/use-workspace-config';
import { useUser } from '@/hooks/use-user';
import {
  applyRetentionPolicy,
  CHILE_HONORARIOS_RETENTION_2026,
  extractIvaFromGross,
} from '@/lib/finance-core';
import { canUseAi, canUseModule } from '@/lib/plan-guards';
import { can } from '@/lib/rbac';
import { logAudit } from '@/lib/audit';
import { formatCLP } from '@/lib/utils';

type ExpenseDocMode = 'factura' | 'honorarios' | 'boleta';

type TransactionDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  type: 'ABONO' | 'GASTO';
  transactionToEdit?: EventItem;
  onSaved: () => void;
};

function inferInitialDocMode(item?: EventItem): ExpenseDocMode {
  if (!item) return 'factura';
  if (item.tipo_doc_costo === 'factura') return 'factura';
  if (
    item.servicio?.toLowerCase().includes('honorarios') ||
    item.detalle?.toLowerCase().includes('honorarios')
  ) {
    return 'honorarios';
  }
  return 'boleta';
}

function parseChileanReceiptOcr(rawText: string): {
  amount: number | null;
  fecha: string | null;
  docMode: ExpenseDocMode;
  descripcion: string;
} {
  const text = rawText || '';
  const lower = text.toLowerCase();

  let docMode: ExpenseDocMode = 'boleta';
  if (/honorarios|retenci[oó]n|segunda\s+categor[ií]a/i.test(lower)) {
    docMode = 'honorarios';
  } else if (/factura\s+electr[oó]nica|iva\s*19%|i\.v\.a\.|monto\s+neto/i.test(lower)) {
    docMode = 'factura';
  }

  // Extract total amount (prefer explicit TOTAL lines, fallback to largest CLP integer)
  const totalMatches: number[] = [];
  const totalRegex = /(?:total\s*(?:a\s*pagar|bruto|l[ií]quido|final|general)?|monto\s+total)\s*[:$]?\s*\$?\s*([0-9]{1,3}(?:[.\s][0-9]{3})+|[0-9]{3,9})/gi;
  let m: RegExpExecArray | null;
  while ((m = totalRegex.exec(text)) !== null) {
    const val = parseInt(m[1].replace(/[^\d]/g, ''), 10);
    if (val >= 100 && val < 500000000) totalMatches.push(val);
  }
  if (totalMatches.length === 0) {
    const currencyRegex = /\$\s*([0-9]{1,3}(?:\.[0-9]{3})+|[0-9]{4,9})/g;
    while ((m = currencyRegex.exec(text)) !== null) {
      const val = parseInt(m[1].replace(/[^\d]/g, ''), 10);
      if (val >= 500 && val < 500000000) totalMatches.push(val);
    }
  }
  const amount = totalMatches.length > 0 ? Math.max(...totalMatches) : null;

  // Extract date
  let fecha: string | null = null;
  const isoDate = text.match(/(\d{4}-\d{2}-\d{2})/);
  const clDate = text.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
  if (isoDate) {
    fecha = isoDate[1];
  } else if (clDate) {
    const dd = clDate[1].padStart(2, '0');
    const mm = clDate[2].padStart(2, '0');
    const yyyy = clDate[3];
    if (Number(mm) >= 1 && Number(mm) <= 12 && Number(dd) >= 1 && Number(dd) <= 31) {
      fecha = `${yyyy}-${mm}-${dd}`;
    }
  }

  // Extract merchant / description line
  const emisorMatch = text.match(/(?:raz[oó]n\s+social|emisor|proveedor|se[ñn]or(?:\(es\))?)\s*[:\-]\s*([^\n]{3,65})/i);
  let descripcion = '';
  if (emisorMatch?.[1]) {
    descripcion = emisorMatch[1].trim();
  } else {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(
        (l) =>
          l.length >= 4 &&
          l.length <= 65 &&
          !/^(rut|r\.u\.t|fecha|s\.i\.i|folio|boleta|factura|total|neto|iva)/i.test(l) &&
          /[a-zA-ZáéíóúñÁÉÍÓÚÑ]{3,}/.test(l)
      );
    descripcion = lines[0] || 'Comprobante escaneado';
  }

  return {
    amount,
    fecha,
    docMode,
    descripcion: descripcion.slice(0, 120),
  };
}

export function TransactionDialog({
  isOpen,
  onOpenChange,
  eventId,
  type,
  transactionToEdit,
  onSaved,
}: TransactionDialogProps) {
  const [monto, setMonto] = useState<string>(
    transactionToEdit ? transactionToEdit.valor_total.toString() : ''
  );
  const [fecha, setFecha] = useState<string>(
    transactionToEdit?.detalle?.match(/\d{4}-\d{2}-\d{2}/)?.[0] || new Date().toISOString().split('T')[0]
  );
  const [descripcion, setDescripcion] = useState<string>(
    transactionToEdit?.detalle?.replace(/^\d{4}-\d{2}-\d{2}\s*\|\s*/, '').replace(/\d{4}-\d{2}-\d{2}/, '').trim() || ''
  );
  const [docMode, setDocMode] = useState<ExpenseDocMode>(() => inferInitialDocMode(transactionToEdit));
  const [aplicaIvaAbono, setAplicaIvaAbono] = useState<boolean>(
    transactionToEdit ? (transactionToEdit.iva_incluido ?? true) : true
  );

  const getInitialMetodoPago = () => {
    if (!transactionToEdit) return 'transferencia';
    if (transactionToEdit.tipo_doc_costo === 'factura' || transactionToEdit.tipo_doc_costo === 'boleta') {
      return 'transferencia';
    }
    return transactionToEdit.tipo_doc_costo || 'transferencia';
  };

  const { entitlements, isDuoExempt, organization } = useWorkspaceConfig();
  const { profile } = useUser();
  const aiGuard = canUseAi(entitlements);
  const canUseOcr = isDuoExempt || aiGuard.allowed;
  const canWriteTransactions =
    isDuoExempt ||
    (canUseModule(entitlements, 'mod_transactions_sii') &&
      can(profile, 'record_transactions', entitlements));
  const retentionPolicy = organization?.honorarios_retention_policy || 'contractor';

  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrStatus, setOcrStatus] = useState<{ type: 'ok' | 'err'; message: string } | null>(null);

  const [metodoPago, setMetodoPago] = useState<string>(
    !type || type === 'ABONO' ? getInitialMetodoPago() : 'transferencia'
  );
  const [loading, setLoading] = useState(false);

  const handleReceiptOcr = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!canUseOcr) {
      setOcrStatus({
        type: 'err',
        message: 'El escáner OCR de boletas/facturas requiere Plan Operación Esencial+ o Suite IA.',
      });
      e.target.value = '';
      return;
    }

    setOcrLoading(true);
    setOcrStatus(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/parse-file', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) {
        setOcrStatus({
          type: 'err',
          message: data?.error || 'No se pudo leer el comprobante con OCR.',
        });
        return;
      }

      const parsed = parseChileanReceiptOcr(String(data?.text || ''));
      if (parsed.amount) setMonto(String(parsed.amount));
      if (parsed.fecha) setFecha(parsed.fecha);
      if (parsed.descripcion) setDescripcion(parsed.descripcion);
      setDocMode(parsed.docMode);

      setOcrStatus({
        type: 'ok',
        message: parsed.amount
          ? `OCR detectó ${formatCLP(parsed.amount)} (${parsed.docMode.toUpperCase()}). Verifica antes de guardar.`
          : 'Texto extraído correctamente. Completa el monto final antes de guardar.',
      });
    } catch {
      setOcrStatus({
        type: 'err',
        message: 'Error de conexión durante el escaneo OCR.',
      });
    } finally {
      setOcrLoading(false);
      e.target.value = '';
    }
  };

  // States for delete confirmation
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteStep, setDeleteStep] = useState(0);

  const isGasto = type === 'GASTO';
  const parsedMonto = parseInt(monto.replace(/\D/g, ''), 10) || 0;

  useEffect(() => {
    if (isOpen) {
      setMonto(transactionToEdit ? transactionToEdit.valor_total.toString() : '');
      setFecha(
        transactionToEdit?.detalle?.match(/\d{4}-\d{2}-\d{2}/)?.[0] ||
          new Date().toISOString().split('T')[0]
      );
      setDescripcion(
        transactionToEdit?.detalle
          ?.replace(/^\d{4}-\d{2}-\d{2}\s*\|\s*/, '')
          .replace(/\d{4}-\d{2}-\d{2}/, '')
          .trim() || ''
      );
      setDocMode(inferInitialDocMode(transactionToEdit));
      setAplicaIvaAbono(transactionToEdit ? (transactionToEdit.iva_incluido ?? true) : true);
      setMetodoPago(
        !transactionToEdit
          ? 'transferencia'
          : transactionToEdit.tipo_doc_costo === 'factura' || transactionToEdit.tipo_doc_costo === 'boleta'
          ? 'transferencia'
          : transactionToEdit.tipo_doc_costo || 'transferencia'
      );
      setDeleteStep(0);
      setIsDeleting(false);
    }
  }, [isOpen, transactionToEdit]);

  const resetForm = () => {
    setMonto('');
    setDescripcion('');
    setFecha(new Date().toISOString().split('T')[0]);
    setDocMode('factura');
    setAplicaIvaAbono(true);
    setMetodoPago('transferencia');
    setDeleteStep(0);
    setIsDeleting(false);
  };

  // Live tax math via finance-core
  const facturaParts = extractIvaFromGross(parsedMonto);
  const facturaNeto = facturaParts.net;
  const facturaIvaCredito = docMode === 'factura' ? facturaParts.iva : 0;
  const honorariosCalc = applyRetentionPolicy(
    parsedMonto,
    retentionPolicy,
    CHILE_HONORARIOS_RETENTION_2026
  );
  const honorariosRetencion = docMode === 'honorarios' ? honorariosCalc.retencionTotal : 0;
  const abonoParts = extractIvaFromGross(parsedMonto);
  const abonoNeto = aplicaIvaAbono ? abonoParts.net : parsedMonto;
  const abonoIvaDebito = aplicaIvaAbono ? abonoParts.iva : 0;

  const handleSave = async () => {
    if (!canWriteTransactions) {
      alert('No cuenta con permisos o módulo activo para registrar transacciones.');
      return;
    }
    if (!parsedMonto || isNaN(parsedMonto)) {
      alert('Debe ingresar un monto válido.');
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const cleanDesc = descripcion.replace(/\s*\[Ret\.\s*15[.,]25%[^\]]*\]/gi, '').trim();
    const honorariosTag =
      isGasto && docMode === 'honorarios'
        ? ` [Ret. 15,25%: ${formatCLP(honorariosCalc.retencionTotal)}]`
        : '';
    const fullDetail = `${fecha} | ${cleanDesc}${honorariosTag}`.trim();
    const isFacturaDoc = isGasto && docMode === 'factura';

    const servicioLabel = isGasto
      ? docMode === 'factura'
        ? 'Factura de Proveedor'
        : docMode === 'honorarios'
        ? 'Boleta de Honorarios (Personal)'
        : 'Boleta de Proveedor'
      : 'Abono de Cliente';

    const transactionData = {
      organization_id: organization?.id,
      event_id: eventId,
      servicio: servicioLabel,
      detalle: fullDetail,
      tipo_evento: isGasto ? 'GASTO_REAL' : 'ABONO_CLIENTE',
      cantidad: 1,
      costo: isGasto ? (docMode === 'honorarios' ? honorariosCalc.costoTotalEmpresa : parsedMonto) : 0,
      ganancia: isGasto ? 0 : parsedMonto,
      valor_neto: isGasto
        ? isFacturaDoc
          ? facturaNeto
          : docMode === 'honorarios'
          ? honorariosCalc.bruto
          : parsedMonto
        : abonoNeto,
      iva: isGasto
        ? isFacturaDoc
          ? facturaIvaCredito
          : 0
        : abonoIvaDebito,
      valor_total: parsedMonto,
      margen: isGasto ? 0 : 100,
      tipo_doc_costo: isGasto ? (isFacturaDoc ? 'factura' : 'boleta') : metodoPago,
      iva_incluido: isGasto ? isFacturaDoc : aplicaIvaAbono,
      approved: true,
    };

    try {
      if (transactionToEdit) {
        const { error } = await (supabase.from('event_items') as any)
          .update(transactionData)
          .eq('id', transactionToEdit.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from('event_items') as any).insert([transactionData]);
        if (error) throw error;
      }
      await logAudit('transaction_recorded', 'transaction', {
        entityId: transactionToEdit?.id || eventId,
        entityLabel: `${servicioLabel} (${formatCLP(parsedMonto)})`,
        before: transactionToEdit ? { valor_total: transactionToEdit.valor_total } : null,
        after: { tipo: transactionData.tipo_evento, valor_total: parsedMonto, docMode },
      });
      onSaved();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error(error);
      alert('Hubo un error al guardar la transacción.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!canWriteTransactions) {
      alert('No cuenta con permisos o módulo activo para eliminar transacciones.');
      return;
    }
    if (deleteStep === 0) {
      setDeleteStep(1);
      return;
    }
    if (deleteStep === 1) {
      setDeleteStep(2);
      return;
    }

    if (!transactionToEdit) return;

    setIsDeleting(true);
    const supabase = createClient();
    try {
      const { error } = await (supabase.from('event_items') as any)
        .delete()
        .eq('id', transactionToEdit.id);
      if (error) throw error;
      await logAudit('delete', 'transaction', {
        entityId: transactionToEdit.id,
        entityLabel: `${transactionToEdit.servicio} (${formatCLP(transactionToEdit.valor_total)})`,
        before: { valor_total: transactionToEdit.valor_total, tipo: transactionToEdit.tipo_evento },
      });
      onSaved();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      alert('Hubo un error al eliminar.');
    } finally {
      setIsDeleting(false);
      setDeleteStep(0);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(val) => {
        if (!val) resetForm();
        onOpenChange(val);
      }}
    >
      <DialogHeader>
        <DialogTitle>
          {transactionToEdit
            ? 'Editar Transacción'
            : isGasto
            ? 'Registrar Gasto Real'
            : 'Agregar Abono de Cliente'}
        </DialogTitle>
        <DialogDescription>
          {isGasto
            ? 'Ingresa el documento tributario de respaldo para calcular el IVA Crédito Fiscal.'
            : 'Registra el pago recibido e identifica el IVA Débito Fiscal asociado.'}
        </DialogDescription>
      </DialogHeader>

      <DialogBody className="space-y-4">
        {isGasto && (
          <div className="rounded-xl border border-dashed border-primary/35 bg-primary/5 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Camera className="h-3.5 w-3.5 text-primary shrink-0" />
                  Escanear Boleta o Factura (OCR)
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Toma una foto desde el celular o sube PDF/imagen para autocompletar monto, fecha y tipo SII.
                </p>
              </div>
              <label
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium cursor-pointer shrink-0 transition-colors"
                data-testid="ocr-receipt-trigger"
              >
                {ocrLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Camera className="h-3.5 w-3.5" />
                )}
                <span>{ocrLoading ? 'Leyendo...' : 'Escanear'}</span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleReceiptOcr}
                  disabled={ocrLoading}
                  className="hidden"
                />
              </label>
            </div>
            {ocrStatus && (
              <div
                className={`text-[11px] rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 ${
                  ocrStatus.type === 'ok'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-destructive/10 text-destructive border border-destructive/20'
                }`}
              >
                {ocrStatus.type === 'ok' ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                )}
                <span>{ocrStatus.message}</span>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Monto Total ($)</Label>
            <Input
              type="text"
              placeholder="Ej. 150000"
              value={monto}
              onChange={(e) => setMonto(e.target.value.replace(/\D/g, ''))}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Fecha</Label>
            <div className="relative">
              <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                className="pl-9"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Descripción / Observación</Label>
          <div className="relative">
            <FileText className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={
                isGasto
                  ? 'Ej. Factura arriendo pantallas / Boleta honorarios técnicos'
                  : 'Ej. Transferencia Banco Reserva 50%'
              }
              className="pl-9"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </div>
        </div>

        {!isGasto ? (
          <>
            <div className="space-y-1.5">
              <Label>Método de Pago</Label>
              <div className="relative flex items-center">
                <CreditCard className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Select
                  className="pl-9"
                  value={metodoPago}
                  onChange={(e) => setMetodoPago(e.target.value)}
                  options={[
                    { value: 'transferencia', label: 'Transferencia Bancaria' },
                    { value: 'efectivo', label: 'Efectivo' },
                    { value: 'tarjeta', label: 'Tarjeta (Débito/Crédito)' },
                    { value: 'cheque', label: 'Cheque' },
                    { value: 'otro', label: 'Otro' },
                  ]}
                />
              </div>
            </div>

            <div className="flex items-center gap-2.5 pt-1">
              <input
                type="checkbox"
                id="aplicaIvaAbono"
                className="rounded border-gray-300"
                checked={aplicaIvaAbono}
                onChange={(e) => setAplicaIvaAbono(e.target.checked)}
              />
              <Label htmlFor="aplicaIvaAbono" className="cursor-pointer text-xs font-medium">
                Cobro afecto a IVA Débito Fiscal (19% incluido en el monto recibido)
              </Label>
            </div>

            {parsedMonto > 0 && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-xs flex flex-wrap justify-between gap-2">
                <div>
                  <span className="text-muted-foreground block text-[10px]">Ingreso Neto Empresa</span>
                  <span className="font-bold text-slate-900">{formatCLP(abonoNeto)}</span>
                </div>
                <div className="text-right">
                  <span className="text-amber-800 block text-[10px] font-medium">
                    IVA Débito Fiscal (SII F29)
                  </span>
                  <span className="font-bold text-amber-700">
                    {aplicaIvaAbono ? formatCLP(abonoIvaDebito) : '$0 (Exento)'}
                  </span>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-2.5">
            <Label className="text-xs font-semibold">Documento Tributario Recibido</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDocMode('factura')}
                className={`rounded-xl border p-2.5 text-left transition-all cursor-pointer ${
                  docMode === 'factura'
                    ? 'border-blue-400 bg-blue-50 text-blue-950 ring-1 ring-blue-300'
                    : 'border-border bg-background text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <Receipt className="h-3.5 w-3.5 text-blue-600" />
                  Factura Afecta
                </div>
                <p className="text-[10px] mt-0.5 opacity-80">Recupera 19% IVA Crédito</p>
              </button>

              <button
                type="button"
                onClick={() => setDocMode('honorarios')}
                className={`rounded-xl border p-2.5 text-left transition-all cursor-pointer ${
                  docMode === 'honorarios'
                    ? 'border-indigo-400 bg-indigo-50 text-indigo-950 ring-1 ring-indigo-300'
                    : 'border-border bg-background text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <Users className="h-3.5 w-3.5 text-indigo-600" />
                  Boleta Honorarios
                </div>
                <p className="text-[10px] mt-0.5 opacity-80">Personal RR.HH. ($0 IVA Créd.)</p>
              </button>

              <button
                type="button"
                onClick={() => setDocMode('boleta')}
                className={`rounded-xl border p-2.5 text-left transition-all cursor-pointer ${
                  docMode === 'boleta'
                    ? 'border-amber-400 bg-amber-50 text-amber-950 ring-1 ring-amber-300'
                    : 'border-border bg-background text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <FileText className="h-3.5 w-3.5 text-amber-600" />
                  Boleta / Recibo
                </div>
                <p className="text-[10px] mt-0.5 opacity-80">Sin IVA Crédito Fiscal</p>
              </button>
            </div>

            {parsedMonto > 0 && (
              <div className="rounded-xl border border-border/80 bg-muted/30 p-3 text-xs flex flex-wrap justify-between gap-2">
                {docMode === 'factura' ? (
                  <>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Costo Neto Factura</span>
                      <span className="font-bold">{formatCLP(facturaNeto)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-blue-700 block text-[10px] font-medium">
                        IVA Crédito Recuperable (19%)
                      </span>
                      <span className="font-bold text-blue-700">+{formatCLP(facturaIvaCredito)}</span>
                    </div>
                  </>
                ) : docMode === 'honorarios' ? (
                  <>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">
                        Líquido / Retención 15,25% ({retentionPolicy === 'company' ? 'Asume empresa' : retentionPolicy === 'split_50_50' ? '50/50' : 'Asume prestador'})
                      </span>
                      <span className="font-semibold text-indigo-900">
                        Líq. {formatCLP(honorariosCalc.liquidoAPagar)} + Ret. {formatCLP(honorariosRetencion)} (Bruto {formatCLP(honorariosCalc.bruto)})
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-muted-foreground block text-[10px]">IVA Crédito</span>
                      <span className="font-bold text-amber-700">$0 (Boleta Honorarios)</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Gasto Directo</span>
                      <span className="font-bold">{formatCLP(parsedMonto)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-muted-foreground block text-[10px]">IVA Crédito</span>
                      <span className="font-bold text-amber-700">$0 (Boleta Simple)</span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </DialogBody>

      <DialogFooter className="flex flex-col sm:flex-row gap-2 justify-between items-center sm:items-end">
        {transactionToEdit ? (
          <div className="w-full sm:w-auto">
            {deleteStep === 0 && (
              <Button
                variant="ghost"
                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 w-full sm:w-auto"
                onClick={handleDelete}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar
              </Button>
            )}
            {deleteStep === 1 && (
              <Button variant="destructive" className="w-full sm:w-auto text-xs" onClick={handleDelete}>
                <AlertTriangle className="h-4 w-4 mr-1" />
                ¿Seguro?
              </Button>
            )}
            {deleteStep === 2 && (
              <Button
                variant="destructive"
                className="w-full sm:w-auto text-xs font-bold bg-rose-700"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar Eliminación'}
              </Button>
            )}
          </div>
        ) : (
          <div className="w-full sm:w-auto"></div>
        )}

        <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading || isDeleting}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading || isDeleting || !monto}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Guardar
          </Button>
        </div>
      </DialogFooter>
    </Dialog>
  );
}
