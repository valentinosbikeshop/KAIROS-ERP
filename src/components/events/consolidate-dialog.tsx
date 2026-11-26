'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EventItem } from '@/types';
import { useWorkspaceConfig } from '@/hooks/use-workspace-config';
import { formatMoney, computeItemFinancials } from '@/lib/finance-core';
import { formatPercentage } from '@/lib/utils';
import { getBaseQuantityConfig } from '@/components/events/project-helpers';
import { Combine, Loader2, Layers, Calculator } from 'lucide-react';

interface ConsolidateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItems: EventItem[];
  initialName?: string;
  defaultQuantity?: number | null;
  onConsolidate: (params: {
    name: string;
    quantity: number;
    unitPrice?: number;
    assignedQuantities: Record<string, number>;
  }) => Promise<void>;
}

export function ConsolidateDialog({
  open,
  onOpenChange,
  selectedItems,
  initialName = '',
  defaultQuantity,
  onConsolidate,
}: ConsolidateDialogProps) {
  const { industry } = useWorkspaceConfig();
  const baseQtyCfg = getBaseQuantityConfig(industry.id);

  const [name, setName] = useState(initialName || '');
  const [quantityStr, setQuantityStr] = useState<string>(
    defaultQuantity && defaultQuantity > 0 ? String(defaultQuantity) : '1'
  );
  const [unitPrice, setUnitPrice] = useState<string>('');
  const [assignedQuantities, setAssignedQuantities] = useState<Record<string, number | ''>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(initialName || '');
      setQuantityStr(defaultQuantity && defaultQuantity > 0 ? String(defaultQuantity) : '1');
      setUnitPrice('');
      setError(null);
      const initial: Record<string, number> = {};
      selectedItems.forEach((item) => {
        if (item.id) {
          initial[item.id] = item.cantidad || 1;
        }
      });
      setAssignedQuantities(initial);
    }
  }, [open, selectedItems, initialName, defaultQuantity]);

  const totalCost = selectedItems.reduce((acc, item) => {
    const rawQty = item.id ? assignedQuantities[item.id] : undefined;
    const qty = rawQty === '' ? 0 : rawQty !== undefined ? rawQty : item.cantidad || 1;
    return acc + (item.costo || 0) * qty;
  }, 0);

  const parsedQty = parseInt(quantityStr, 10);
  const validQty = Number.isFinite(parsedQty) && parsedQty > 0 ? parsedQty : 1;
  const realUnitCost = Math.round(totalCost / validQty);
  const parsedUnitPrice = parseInt(unitPrice, 10) || 0;
  const totalRevenue = parsedUnitPrice > 0 ? parsedUnitPrice * validQty : 0;

  const previewFin =
    parsedUnitPrice > 0
      ? computeItemFinancials({
          costo: realUnitCost,
          ganancia: Math.max(0, Math.round(parsedUnitPrice / 1.19) - realUnitCost),
          cantidad: validQty,
          tipo_doc_costo: 'factura',
          iva_incluido: true,
        })
      : null;

  const handleItemQtyChange = (itemId: string, maxQty: number, valStr: string) => {
    if (valStr === '') {
      setAssignedQuantities((prev) => ({ ...prev, [itemId]: '' }));
      return;
    }
    let val = parseInt(valStr, 10);
    if (Number.isNaN(val) || val < 1) val = 1;
    if (val > maxQty) val = maxQty;
    setAssignedQuantities((prev) => ({ ...prev, [itemId]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Por favor ingrese un nombre para la partida consolidada.');
      return;
    }
    if (!Number.isFinite(parsedQty) || parsedQty <= 0) {
      setError('La cantidad debe ser mayor a cero.');
      return;
    }

    const normalizedAssignments: Record<string, number> = {};
    selectedItems.forEach((item) => {
      if (!item.id) return;
      const val = assignedQuantities[item.id];
      normalizedAssignments[item.id] =
        typeof val === 'number' && val >= 1 ? val : item.cantidad || 1;
    });

    setLoading(true);
    setError(null);
    try {
      await onConsolidate({
        name: name.trim(),
        quantity: validQty,
        unitPrice: parsedUnitPrice > 0 ? parsedUnitPrice : undefined,
        assignedQuantities: normalizedAssignments,
      });
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Error al consolidar las partidas.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 max-h-[inherit] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 border border-blue-200 shadow-xs">
              <Combine className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Consolidar Partidas &amp; Prorrateo</DialogTitle>
              <DialogDescription>
                Agrupe insumos o sub-partidas bajo un ítem padre para cotizar al cliente ocultando el desglose interno.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 custom-scrollbar">
          {error && (
            <div className="p-3 text-xs font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-xl">
              {error}
            </div>
          )}

          {/* Resumen de insumos a consolidar */}
          <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground pb-2 border-b border-border/50">
              <span className="flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-primary" />
                {selectedItems.length} partidas seleccionadas
              </span>
              <span className="text-foreground font-bold">
                Costo Asignado: <span className="text-red-600">{formatMoney(totalCost)}</span>
              </span>
            </div>

            <p className="text-[11px] text-muted-foreground">
              Ajuste la cantidad a asignar de cada ítem. Si utiliza menos del total, el saldo permanecerá disponible en la línea original.
            </p>

            <div className="max-h-48 overflow-y-auto space-y-2 pr-1 custom-scrollbar text-xs">
              {selectedItems.map((item) => {
                const rawVal = item.id ? assignedQuantities[item.id] : undefined;
                const assignedNum =
                  rawVal === '' ? 0 : rawVal !== undefined ? rawVal : item.cantidad || 1;
                const max = item.cantidad || 1;
                const remaining = Math.max(0, max - assignedNum);
                const itemSubtotal = (item.costo || 0) * assignedNum;

                return (
                  <div
                    key={item.id}
                    className="p-2 rounded-lg bg-background border border-border/70 space-y-1.5 shadow-2xs"
                  >
                    <div className="flex justify-between items-center gap-2">
                      <span className="font-medium text-foreground truncate">{item.servicio}</span>
                      <span className="font-bold text-red-600 shrink-0">
                        {formatMoney(itemSubtotal)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/40 text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px]">Asignar:</span>
                        <Input
                          type="number"
                          min="1"
                          max={max}
                          value={rawVal === undefined ? max : rawVal}
                          onChange={(e) => item.id && handleItemQtyChange(item.id, max, e.target.value)}
                          className="h-6.5 w-14 text-center text-xs font-bold px-1 rounded-md"
                        />
                        <span className="text-[11px]">de {max} un.</span>
                      </div>

                      {remaining > 0 ? (
                        <span className="text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                          Quedan {remaining} en origen
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                          Uso total (100%)
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-3.5">
            <div className="space-y-1.5">
              <Label htmlFor="cons-name" className="text-xs font-medium">
                Nombre de la Partida / Ítem Consolidado <span className="text-destructive">*</span>
              </Label>
              <Input
                id="cons-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`Ej: Paquete Integral / Unidad (${industry.shortName})`}
                className="rounded-xl"
                required
                autoFocus={!initialName}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cons-qty" className="text-xs font-medium flex items-center justify-between">
                  <span>Cantidad / Rendimiento ({baseQtyCfg.unit}) *</span>
                </Label>
                <Input
                  id="cons-qty"
                  type="number"
                  min="1"
                  value={quantityStr}
                  onChange={(e) => setQuantityStr(e.target.value)}
                  placeholder="Ej: 1"
                  className="rounded-xl font-bold"
                  required
                  autoFocus={!!initialName}
                />
                <p className="text-[11px] text-muted-foreground">
                  Unidades o {baseQtyCfg.unit} entre las que se prorratea el costo.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cons-price" className="text-xs font-medium flex items-center justify-between">
                  <span>Precio de Venta Unitario c/IVA (Opcional)</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-muted-foreground">$</span>
                  <Input
                    id="cons-price"
                    type="number"
                    min="0"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    placeholder="Ej: 35000"
                    className="rounded-xl pl-7"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Valor final unitario a cobrar al cliente.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-primary">
              <Calculator className="h-4 w-4" />
              <span>Prorrateo y Desglose Unitario:</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
              <div className="bg-background/80 rounded-lg p-2.5 border text-center">
                <span className="text-[10px] text-muted-foreground block uppercase font-medium">
                  Costo Total Grupo
                </span>
                <span className="text-sm font-bold text-red-600">{formatMoney(totalCost)}</span>
              </div>
              <div className="bg-background/80 rounded-lg p-2.5 border text-center">
                <span className="text-[10px] text-muted-foreground block uppercase font-medium">
                  Divisor ({baseQtyCfg.unit})
                </span>
                <span className="text-sm font-bold text-foreground">{validQty}</span>
              </div>
              <div className="bg-background/80 rounded-lg p-2.5 border border-primary/40 text-center col-span-2 sm:col-span-1 shadow-2xs">
                <span className="text-[10px] text-primary block uppercase font-bold">
                  Costo Unitario
                </span>
                <span className="text-sm font-extrabold text-primary">
                  {formatMoney(realUnitCost)} / {baseQtyCfg.unit}
                </span>
              </div>
            </div>

            {parsedUnitPrice > 0 && previewFin && (
              <div className="flex flex-wrap items-center justify-between text-xs pt-1 border-t border-primary/20 text-muted-foreground">
                <span>
                  Venta Total: <strong className="text-emerald-700">{formatMoney(totalRevenue)}</strong>
                </span>
                <span>
                  Utilidad Neta:{' '}
                  <strong className="text-emerald-600">{formatMoney(previewFin.utilidadNeta)}</strong>
                </span>
                <span>
                  Margen s/ Venta:{' '}
                  <strong className="text-emerald-700">
                    {formatPercentage(previewFin.margenVentaPct)}
                  </strong>
                </span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="rounded-xl"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={loading || !name.trim() || !Number.isFinite(parsedQty) || parsedQty <= 0}
            className="rounded-xl gap-1.5 shadow-sm bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Consolidando...</span>
              </>
            ) : (
              <>
                <Combine className="h-4 w-4" />
                <span>Consolidar Partida</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
