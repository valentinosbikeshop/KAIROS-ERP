'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { HonorariosRetentionPolicy, MasterCost } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { useWorkspaceConfig } from '@/hooks/use-workspace-config';
import { DUO_ORG_SLUG } from '@/lib/constants';
import { formatCLP, formatPercentage, calculateFinancials } from '@/lib/utils';
import {
  applyRetentionPolicy,
  CHILE_HONORARIOS_RETENTION_2026,
  netFromGross,
} from '@/lib/finance-core';
import { parseCostMetadata } from '@/lib/cost-metadata';
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Check,
  X,
  Loader2,
  ShieldCheck,
  Search,
  Scale,
  TrendingUp,
} from 'lucide-react';

interface StrategicPricingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentCosts: MasterCost[];
  onSuccess: () => void;
}

export interface ProposalItem {
  id: string;
  servicio: string;
  tiempo_detalle: string;
  tipo_evento: string;
  selected: boolean;
  tipo_doc: 'boleta' | 'factura';
  aplicaIvaVenta: boolean;
  costoAnterior: number;
  netoAnterior: number;
  costoBrutoTotal: number;
  liquidoProveedor: number;
  aporteEmpresa: number;
  descuentoPrestador: number;
  retencionSII: number;
  netoSugerido: number;
  totalClienteIva: number;
  gananciaNeta: number;
  margenVentaPct: number;
  justificacion: string;
}

const TASA_REPARTO_50_50 = 0.07625;

function buildDuoPresetOverride(
  c: MasterCost
): { tipo_doc: 'boleta' | 'factura'; costoBruto: number; netoSugerido: number; justificacion: string } | null {
  const servLower = c.servicio.toLowerCase();
  const calc5050 = (base: number) => Math.round(base * (1 + TASA_REPARTO_50_50));

  if (servLower === 'solista') {
    return {
      tipo_doc: 'boleta',
      costoBruto: calc5050(70000),
      netoSugerido: 160000,
      justificacion: 'Esquema 50/50 sobre base $70.000: aporte empresa +$5.338 y retención total SII $11.489.',
    };
  }
  if (servLower === 'duo' || servLower === 'dúo') {
    return {
      tipo_doc: 'boleta',
      costoBruto: calc5050(100000),
      netoSugerido: 235000,
      justificacion: 'Esquema 50/50 sobre base $100.000: costo empresa $107.625, utilidad limpia $127.375.',
    };
  }
  if (servLower === 'trío' || servLower === 'trio') {
    return {
      tipo_doc: 'boleta',
      costoBruto: calc5050(150000),
      netoSugerido: 330000,
      justificacion: 'Esquema 50/50 sobre base $150.000: costo empresa $161.438, utilidad $168.562.',
    };
  }
  if (servLower.includes('sexteto fiamma')) {
    return {
      tipo_doc: 'boleta',
      costoBruto: calc5050(480000),
      netoSugerido: 890000,
      justificacion: 'Convenio preferente 50/50: desembolso $516.600, utilidad neta $373.400.',
    };
  }
  if (servLower.includes('orquesta fiamma')) {
    return {
      tipo_doc: 'boleta',
      costoBruto: calc5050(960000),
      netoSugerido: 1850000,
      justificacion: 'Esquema 50/50 (12 músicos): desembolso $1.033.200, utilidad $816.800.',
    };
  }
  if (c.tiempo_detalle?.includes('25 a 50 fotos') || (servLower.includes('fotografía') && c.costo === 65000)) {
    return {
      tipo_doc: 'factura',
      costoBruto: 65000,
      netoSugerido: 95000,
      justificacion: 'Factura comercial exenta de retención: conserva costo $65.000 y recupera IVA Crédito.',
    };
  }
  return null;
}

function buildProposalRow(
  c: MasterCost,
  policy: HonorariosRetentionPolicy,
  targetMarginPct: number,
  isDuoOrg: boolean
): ProposalItem {
  const meta = parseCostMetadata(c.tiempo_detalle, c.tipo_evento, c.servicio);
  const duoOverride = isDuoOrg ? buildDuoPresetOverride(c) : null;

  const tipo_doc: 'boleta' | 'factura' =
    duoOverride?.tipo_doc || (c.tipo_doc_costo === 'boleta' ? 'boleta' : 'factura');
  const isHonorarios =
    tipo_doc === 'boleta' && (meta.resourceType === 'personal' || meta.staffModality === 'honorarios');

  const costoBase = duoOverride ? c.costo : Number(c.costo) || 0;
  let costoBrutoTotal = duoOverride ? duoOverride.costoBruto : costoBase;
  let liquidoProveedor = costoBrutoTotal;
  let aporteEmpresa = 0;
  let descuentoPrestador = 0;
  let retencionSII = 0;

  if (isHonorarios) {
    if (duoOverride) {
      retencionSII = Math.round(costoBrutoTotal * CHILE_HONORARIOS_RETENTION_2026);
      liquidoProveedor = costoBrutoTotal - retencionSII;
      aporteEmpresa = Math.max(0, costoBrutoTotal - costoBase);
      descuentoPrestador = Math.max(0, retencionSII - aporteEmpresa);
    } else {
      const ret = applyRetentionPolicy(costoBase, policy);
      costoBrutoTotal = ret.costoTotalEmpresa;
      liquidoProveedor = ret.liquidoAPagar;
      aporteEmpresa = ret.aporteEmpresa;
      descuentoPrestador = ret.descuentoPrestador;
      retencionSII = ret.retencionTotal;
    }
  }

  const costoNeto = tipo_doc === 'factura' ? netFromGross(costoBrutoTotal) : costoBrutoTotal;
  const currentNeto = Number(c.valor_neto) || 0;
  const minNetoForTarget =
    targetMarginPct > 0 && targetMarginPct < 90
      ? Math.round(costoNeto / (1 - targetMarginPct / 100))
      : costoNeto;
  const netoSugerido = duoOverride
    ? duoOverride.netoSugerido
    : Math.max(currentNeto, minNetoForTarget);

  const gananciaNeta = netoSugerido - costoNeto;
  const margenVentaPct = netoSugerido > 0 ? Math.round((gananciaNeta / netoSugerido) * 1000) / 10 : 0;
  const totalClienteIva = meta.aplicaIvaVenta ? Math.round(netoSugerido * 1.19) : netoSugerido;

  const justificacion = duoOverride
    ? duoOverride.justificacion
    : isHonorarios
    ? `Boleta Honorarios 15,25% (${policy === 'company' ? 'Empresa 100%' : policy === 'split_50_50' ? 'Reparto 50/50' : 'Prestador'}) + meta margen ${targetMarginPct}%.`
    : tipo_doc === 'factura'
    ? `Factura afecta (recupera IVA Crédito) calibrada hacia meta ${targetMarginPct}% sobre venta neta.`
    : `Boleta exenta de IVA calibrada hacia meta ${targetMarginPct}% sobre venta neta.`;

  return {
    id: c.id,
    servicio: c.servicio,
    tiempo_detalle: meta.cleanDetail || c.tiempo_detalle || '',
    tipo_evento: c.tipo_evento || 'General',
    selected: true,
    tipo_doc,
    aplicaIvaVenta: meta.aplicaIvaVenta,
    costoAnterior: Number(c.costo) || 0,
    netoAnterior: currentNeto,
    costoBrutoTotal,
    liquidoProveedor,
    aporteEmpresa,
    descuentoPrestador,
    retencionSII,
    netoSugerido,
    totalClienteIva,
    gananciaNeta,
    margenVentaPct,
    justificacion,
  };
}

export function StrategicPricingDialog({
  open,
  onOpenChange,
  currentCosts,
  onSuccess,
}: StrategicPricingDialogProps) {
  const { organization, industry } = useWorkspaceConfig();
  const isDuoOrg = organization?.slug === DUO_ORG_SLUG;
  const orgPolicy: HonorariosRetentionPolicy =
    organization?.bank_info?.__saas_config?.honorarios_retention_policy || 'contractor';

  const [policy, setPolicy] = useState<HonorariosRetentionPolicy>(orgPolicy);
  const [targetMarginInput, setTargetMarginInput] = useState<string>(String(industry.targetMarginPct));
  const [costDeltaPct, setCostDeltaPct] = useState<string>('0');
  const [proposals, setProposals] = useState<ProposalItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!open) return;
    setPolicy(orgPolicy);
    setTargetMarginInput(String(industry.targetMarginPct));
    setCostDeltaPct('0');
    setProposals(
      currentCosts.map((c) => buildProposalRow(c, orgPolicy, industry.targetMarginPct, isDuoOrg))
    );
  }, [open, currentCosts, orgPolicy, industry.targetMarginPct, isDuoOrg]);

  const recalibrateAll = (nextPolicy: HonorariosRetentionPolicy, nextMarginPct: number, deltaPct: number) => {
    const factor = 1 + deltaPct / 100;
    setProposals(
      currentCosts.map((c) => {
        const adjustedCost = Math.max(0, Math.round((Number(c.costo) || 0) * factor));
        return buildProposalRow(
          { ...c, costo: adjustedCost },
          nextPolicy,
          nextMarginPct,
          isDuoOrg && deltaPct === 0 && nextPolicy === orgPolicy
        );
      })
    );
  };

  const handlePolicyChange = (nextPolicy: HonorariosRetentionPolicy) => {
    setPolicy(nextPolicy);
    recalibrateAll(
      nextPolicy,
      Math.min(85, Math.max(0, Number(targetMarginInput) || industry.targetMarginPct)),
      Number(costDeltaPct) || 0
    );
  };

  const handleApplyGlobalAdjustment = () => {
    const margin = Math.min(85, Math.max(0, Number(targetMarginInput) || industry.targetMarginPct));
    const delta = Number(costDeltaPct) || 0;
    recalibrateAll(policy, margin, delta);
  };

  const handleCostChange = (id: string, rawVal: string) => {
    const nextCost = Math.max(0, parseInt(rawVal.replace(/\D/g, ''), 10) || 0);
    setProposals((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const costoNeto = item.tipo_doc === 'factura' ? netFromGross(nextCost) : nextCost;
        const ganancia = item.netoSugerido - costoNeto;
        const margen = item.netoSugerido > 0 ? Math.round((ganancia / item.netoSugerido) * 1000) / 10 : 0;
        const ret = item.tipo_doc === 'boleta' ? applyRetentionPolicy(nextCost, policy) : null;
        return {
          ...item,
          costoBrutoTotal: nextCost,
          liquidoProveedor: ret ? ret.liquidoAPagar : nextCost,
          aporteEmpresa: ret ? ret.aporteEmpresa : 0,
          descuentoPrestador: ret ? ret.descuentoPrestador : 0,
          retencionSII: ret ? ret.retencionTotal : 0,
          gananciaNeta: ganancia,
          margenVentaPct: margen,
        };
      })
    );
  };

  const handleNetoChange = (id: string, rawVal: string) => {
    const newNeto = Math.max(0, parseInt(rawVal.replace(/\D/g, ''), 10) || 0);
    setProposals((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const costoNeto = item.tipo_doc === 'factura' ? netFromGross(item.costoBrutoTotal) : item.costoBrutoTotal;
        const ganancia = newNeto - costoNeto;
        const margen = newNeto > 0 ? Math.round((ganancia / newNeto) * 1000) / 10 : 0;
        const totalIva = item.aplicaIvaVenta ? Math.round(newNeto * 1.19) : newNeto;
        return {
          ...item,
          netoSugerido: newNeto,
          totalClienteIva: totalIva,
          gananciaNeta: ganancia,
          margenVentaPct: margen,
        };
      })
    );
  };

  const handleTipoDocToggle = (id: string) => {
    setProposals((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const newTipo: 'boleta' | 'factura' = item.tipo_doc === 'boleta' ? 'factura' : 'boleta';
        const ret = newTipo === 'boleta' ? applyRetentionPolicy(item.costoAnterior, policy) : null;
        const costoBruto = ret ? ret.costoTotalEmpresa : item.costoAnterior;
        const costoNeto = newTipo === 'factura' ? netFromGross(costoBruto) : costoBruto;
        const ganancia = item.netoSugerido - costoNeto;
        const margen = item.netoSugerido > 0 ? Math.round((ganancia / item.netoSugerido) * 1000) / 10 : 0;
        return {
          ...item,
          tipo_doc: newTipo,
          costoBrutoTotal: costoBruto,
          liquidoProveedor: ret ? ret.liquidoAPagar : costoBruto,
          aporteEmpresa: ret ? ret.aporteEmpresa : 0,
          descuentoPrestador: ret ? ret.descuentoPrestador : 0,
          retencionSII: ret ? ret.retencionTotal : 0,
          gananciaNeta: ganancia,
          margenVentaPct: margen,
        };
      })
    );
  };

  const toggleSelect = (id: string) => {
    setProposals((prev) => prev.map((p) => (p.id === id ? { ...p, selected: !p.selected } : p)));
  };

  const toggleSelectAll = (checked: boolean) => {
    setProposals((prev) => prev.map((p) => ({ ...p, selected: checked })));
  };

  const handleSaveDefinitive = async () => {
    const selectedItems = proposals.filter((p) => p.selected);
    if (selectedItems.length === 0) {
      alert('Debe seleccionar al menos un ítem para actualizar.');
      return;
    }

    const confirmSave = window.confirm(
      `¿Confirma actualizar ${selectedItems.length} tarifa(s) en el catálogo maestro?`
    );
    if (!confirmSave) return;

    setLoading(true);
    const supabase = createClient();
    try {
      const updates = selectedItems.map((item) => {
        const fin = calculateFinancials(
          item.costoBrutoTotal,
          item.gananciaNeta,
          item.tipo_doc,
          item.aplicaIvaVenta,
          false
        );
        return (supabase.from('master_costs') as any)
          .update({
            costo: item.costoBrutoTotal,
            ganancia: item.gananciaNeta,
            valor_neto: fin.valorNeto,
            valor_total: fin.valorTotal,
            tipo_doc_costo: item.tipo_doc,
          })
          .eq('id', item.id);
      });

      await Promise.all(updates);

      if (isDuoOrg) {
        await (supabase.from('master_costs') as any).insert({
          servicio: '__SYSTEM_STRATEGIC_PROPOSAL_2026_APPLIED__',
          tiempo_detalle: '2026_applied_50_50',
          tipo_evento: 'System',
          costo: 0,
          ganancia: 0,
          valor_neto: 0,
          valor_total: 0,
          tipo_doc_costo: 'factura',
        });
        if (typeof window !== 'undefined') {
          localStorage.setItem('duo_strategic_proposal_2026_applied', 'true');
        }
      }

      onSuccess();
      onOpenChange(false);
    } catch (e: any) {
      console.error(e);
      alert('Error al guardar las tarifas: ' + (e?.message || 'Error inesperado'));
    } finally {
      setLoading(false);
    }
  };

  const selectedCount = proposals.filter((p) => p.selected).length;
  const filteredProposals = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return proposals;
    return proposals.filter(
      (p) =>
        p.servicio.toLowerCase().includes(q) ||
        p.tiempo_detalle.toLowerCase().includes(q) ||
        p.tipo_evento.toLowerCase().includes(q)
    );
  }, [proposals, searchTerm]);

  const totalGananciaProyectada = proposals
    .filter((p) => p.selected)
    .reduce((acc, curr) => acc + curr.gananciaNeta, 0);
  const totalRetencionSii = proposals
    .filter((p) => p.selected && currIsBoleta(p))
    .reduce((acc, curr) => acc + curr.retencionSII, 0);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      className="w-[96vw] max-w-[1440px] h-[92vh] flex flex-col p-0 overflow-hidden"
    >
      <DialogHeader className="px-6 py-4 border-b border-border/60 bg-slate-900 text-white shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <DialogTitle className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  {isDuoOrg
                    ? 'Propuesta Estratégica 2026: Esquema 50/50'
                    : `Ajuste Masivo de Tarifas & Márgenes · ${industry.shortName}`}
                </DialogTitle>
                <Badge className="bg-emerald-500 text-slate-950 font-bold text-[10px] uppercase border-0">
                  Meta {industry.targetMarginPct}%
                </Badge>
              </div>
              <DialogDescription className="text-xs text-slate-300 mt-1">
                Recalibre costos de compra, política de retención Boleta Honorarios 15,25% (2026) y precios netos de venta en lote.
              </DialogDescription>
            </div>
          </div>

          <Badge variant="outline" className="text-xs font-semibold bg-white/10 text-white border-white/20 px-3 py-1">
            {selectedCount} de {proposals.length} seleccionados
          </Badge>
        </div>
      </DialogHeader>

      <DialogBody className="flex-1 overflow-y-auto px-6 py-4 space-y-4 custom-scrollbar bg-slate-50/50">
        {/* Barra de Calibración Masiva */}
        <div className="rounded-xl border border-border/80 bg-white p-3.5 flex flex-wrap items-end justify-between gap-3 shadow-2xs">
          <div className="relative w-full sm:w-64">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar ítem o categoría..."
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex flex-wrap items-end gap-2.5">
            <div className="space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                Política Honorarios 15,25%
              </span>
              <Select
                value={policy}
                onChange={(e) => handlePolicyChange(e.target.value as HonorariosRetentionPolicy)}
                className="h-9 text-xs w-52"
                options={[
                  { value: 'contractor', label: 'Prestador asume 15,25%' },
                  { value: 'company', label: 'Empresa asume 15,25% (Gross-up)' },
                  { value: 'split_50_50', label: 'Reparto 50/50 (7,625% c/u)' },
                ]}
              />
            </div>

            <div className="space-y-1 w-28">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                Var. Costo (%)
              </span>
              <Input
                type="number"
                step="0.5"
                value={costDeltaPct}
                onChange={(e) => setCostDeltaPct(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1 w-28">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                Margen Piso (%)
              </span>
              <Input
                type="number"
                step="1"
                min={0}
                max={85}
                value={targetMarginInput}
                onChange={(e) => setTargetMarginInput(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <Button type="button" variant="outline" size="sm" onClick={handleApplyGlobalAdjustment} className="h-9 gap-1.5 text-xs">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
              Recalibrar Lote
            </Button>
          </div>
        </div>

        {/* Tabla */}
        <div className="border border-border/80 rounded-xl bg-white shadow-xs overflow-x-auto">
          <Table className="min-w-[1180px] text-xs">
            <TableHeader className="bg-slate-900 text-white sticky top-0 z-20">
              <TableRow className="hover:bg-slate-900 border-b border-slate-800 text-[11px]">
                <TableHead className="w-[42px] text-center text-white">
                  <input
                    type="checkbox"
                    checked={selectedCount === proposals.length && proposals.length > 0}
                    onChange={(e) => toggleSelectAll(e.target.checked)}
                    className="h-4 w-4 rounded cursor-pointer"
                    aria-label="Seleccionar todos"
                  />
                </TableHead>
                <TableHead className="text-white font-semibold">Ítem / Categoría</TableHead>
                <TableHead className="text-center text-white font-semibold">Doc.</TableHead>
                <TableHead className="text-right text-white font-semibold">Costo Anterior</TableHead>
                <TableHead className="text-right text-amber-300 font-semibold">Costo Nuevo ($)</TableHead>
                <TableHead className="text-right text-red-200 font-semibold">Ret. 15,25%</TableHead>
                <TableHead className="text-right text-emerald-300 font-semibold">Venta Neta ($)</TableHead>
                <TableHead className="text-right text-emerald-200 font-semibold">Ganancia Neta</TableHead>
                <TableHead className="text-center text-emerald-300 font-semibold">Margen %</TableHead>
                <TableHead className="text-right text-slate-200 font-semibold">Total Cliente</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/60">
              {filteredProposals.map((item) => (
                <TableRow key={item.id} className={item.selected ? 'bg-background' : 'opacity-45 bg-muted/20'}>
                  <TableCell className="text-center">
                    <input
                      type="checkbox"
                      checked={item.selected}
                      onChange={() => toggleSelect(item.id)}
                      className="h-4 w-4 rounded cursor-pointer"
                    />
                  </TableCell>
                  <TableCell className="py-2.5 max-w-[260px]">
                    <div className="font-semibold text-foreground">{item.servicio}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{item.justificacion}</div>
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 mt-1">
                      {item.tipo_evento}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <button
                      type="button"
                      onClick={() => handleTipoDocToggle(item.id)}
                      disabled={!item.selected}
                      className={`text-[10px] font-bold px-2 py-1 rounded-md border cursor-pointer ${
                        item.tipo_doc === 'boleta'
                          ? 'bg-amber-100 text-amber-900 border-amber-300'
                          : 'bg-blue-100 text-blue-800 border-blue-300'
                      }`}
                    >
                      {item.tipo_doc === 'boleta' ? 'Boleta' : 'Factura'}
                    </button>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground font-mono tabular-nums">
                    {formatCLP(item.costoAnterior)}
                  </TableCell>
                  <TableCell className="p-2 w-32">
                    <Input
                      type="text"
                      value={item.costoBrutoTotal.toLocaleString('es-CL')}
                      onChange={(e) => handleCostChange(item.id, e.target.value)}
                      disabled={!item.selected}
                      className="h-7 text-xs text-right font-semibold tabular-nums"
                    />
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-rose-700">
                    {item.retencionSII > 0 ? formatCLP(item.retencionSII) : '$0'}
                  </TableCell>
                  <TableCell className="p-2 w-32">
                    <Input
                      type="text"
                      value={item.netoSugerido.toLocaleString('es-CL')}
                      onChange={(e) => handleNetoChange(item.id, e.target.value)}
                      disabled={!item.selected}
                      className="h-7 text-xs text-right font-bold text-emerald-800 tabular-nums"
                    />
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold text-emerald-700 tabular-nums">
                    {formatCLP(item.gananciaNeta)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-bold tabular-nums ${
                        item.margenVentaPct >= industry.targetMarginPct
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}
                    >
                      {formatPercentage(item.margenVentaPct)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold tabular-nums">
                    {formatCLP(item.totalClienteIva)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogBody>

      <DialogFooter className="px-6 py-3.5 border-t border-border/80 bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Ganancia Total Proyectada:</span>
            <span className="font-bold text-emerald-400 text-sm tabular-nums">
              {formatCLP(totalGananciaProyectada)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 border-l border-slate-700 pl-4">
            <span className="text-slate-400">Retención SII 15,25%:</span>
            <span className="font-semibold text-amber-300 tabular-nums">
              {formatCLP(totalRetencionSii)}
            </span>
          </div>
          <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-slate-400 border-l border-slate-700 pl-4">
            <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />
            <span>Actualización masiva en su catálogo maestro.</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="text-xs text-slate-300 hover:text-white hover:bg-slate-800"
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSaveDefinitive}
            disabled={loading || selectedCount === 0}
            className="text-xs font-bold gap-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-md px-4 h-9"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Aplicar a {selectedCount} Tarifa(s)
          </Button>
        </div>
      </DialogFooter>
    </Dialog>
  );
}

function currIsBoleta(item: ProposalItem): boolean {
  return item.tipo_doc === 'boleta';
}
