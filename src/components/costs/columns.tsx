'use client'

import { ColumnDef } from '@tanstack/react-table'
import { HonorariosRetentionPolicy, MasterCost, QuoteCurrency } from '@/types'
import { formatCLP, formatPercentage } from '@/lib/utils'
import { formatMoney, type CurrencyRates } from '@/lib/finance-core'
import { computeCostTaxBreakdown, RESOURCE_TYPE_LABELS } from '@/lib/cost-metadata'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Pencil, Trash2, ArrowUpDown, Users, Wrench, Utensils, Truck } from 'lucide-react'

export interface CostColumnOptions {
  currency?: QuoteCurrency
  rates?: CurrencyRates
  retentionPolicy?: HonorariosRetentionPolicy
  canEdit?: boolean
  hideMargins?: boolean
  insumoLabel?: string
}

const RESOURCE_BADGE_STYLES = {
  personal: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  servicio: 'bg-slate-100 text-slate-700 border-slate-200',
  insumo: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  logistica: 'bg-sky-50 text-sky-700 border-sky-200',
} as const

function ResourceIcon({ type }: { type: 'personal' | 'servicio' | 'insumo' | 'logistica' }) {
  if (type === 'personal') return <Users className="h-3 w-3" />
  if (type === 'insumo') return <Utensils className="h-3 w-3" />
  if (type === 'logistica') return <Truck className="h-3 w-3" />
  return <Wrench className="h-3 w-3" />
}

export function getColumns(
  onEdit: (cost: MasterCost) => void,
  onDelete: (id: string) => void,
  showTaxBreakdown: boolean = false,
  options: CostColumnOptions = {}
): ColumnDef<MasterCost>[] {
  const currency: QuoteCurrency = options.currency || 'CLP'
  const rates = options.rates
  const retentionPolicy: HonorariosRetentionPolicy = options.retentionPolicy || 'contractor'
  const canEdit = options.canEdit !== false
  const hideMargins = Boolean(options.hideMargins)
  const insumoLabel = options.insumoLabel || RESOURCE_TYPE_LABELS.insumo
  const fmt = (amountClp: number) => formatMoney(amountClp, currency, rates)

  const cols: ColumnDef<MasterCost>[] = [
    {
      accessorKey: 'servicio',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Servicio / Recurso
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const cost = row.original
        const b = computeCostTaxBreakdown(cost, retentionPolicy)
        const typeLabel =
          b.meta.resourceType === 'insumo'
            ? insumoLabel
            : b.meta.resourceType === 'personal' && b.meta.staffCount > 1
            ? `Personal (${b.meta.staffCount} pers.)`
            : RESOURCE_TYPE_LABELS[b.meta.resourceType]
        return (
          <div className="space-y-1 min-w-[200px]">
            <div className="font-semibold text-sm text-foreground">{cost.servicio}</div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge
                variant="outline"
                className={`text-[10px] px-1.5 py-0 font-medium gap-1 ${RESOURCE_BADGE_STYLES[b.meta.resourceType]}`}
              >
                <ResourceIcon type={b.meta.resourceType} />
                {typeLabel}
              </Badge>
              <Badge
                variant="outline"
                className={`text-[10px] px-1.5 py-0 font-semibold ${
                  b.tipoDocCompra === 'factura'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}
              >
                {b.tipoDocCompra === 'factura' ? 'Factura (IVA Créd.)' : 'Boleta / Honorarios'}
              </Badge>
              {!b.meta.aplicaIvaVenta && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-zinc-100 text-zinc-700 border-zinc-300">
                  Exento IVA
                </Badge>
              )}
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'tiempo_detalle',
      header: 'Detalle / Jornada',
      cell: ({ row }) => {
        const cost = row.original
        const b = computeCostTaxBreakdown(cost, retentionPolicy)
        return (
          <div className="text-xs text-muted-foreground max-w-[240px]">
            <p className="line-clamp-2">{b.meta.cleanDetail || 'Sin detalle adicional'}</p>
            {b.meta.resourceType === 'personal' && (
              <p className="text-[11px] text-indigo-700 font-medium mt-0.5">
                {b.meta.staffHours} ·{' '}
                {b.meta.staffModality === 'honorarios'
                  ? 'Honorarios SII'
                  : b.meta.staffModality === 'factura_subcontrato'
                  ? 'Subcontrato Factura'
                  : 'Turno / Nómina'}
              </p>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'tipo_evento',
      header: 'Categoría',
      cell: ({ row }) => (
        <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-muted text-foreground whitespace-nowrap">
          {row.getValue('tipo_evento')}
        </span>
      ),
    },
    {
      accessorKey: 'costo',
      header: ({ column }) => (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Costo Compra
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      ),
      cell: ({ row }) => {
        const cost = row.original
        const b = computeCostTaxBreakdown(cost, retentionPolicy)
        return (
          <div className="text-right tabular-nums">
            <div className="font-semibold text-sm">{fmt(b.costoBruto)}</div>
            {currency !== 'CLP' && (
              <div className="text-[10px] text-muted-foreground">{formatCLP(b.costoBruto)}</div>
            )}
            {b.ivaCredito > 0 && !showTaxBreakdown && (
              <div className="text-[10px] text-blue-700 font-medium">
                IVA Créd: {fmt(b.ivaCredito)}
              </div>
            )}
          </div>
        )
      },
    },
  ]

  if (showTaxBreakdown) {
    cols.push({
      id: 'iva_credito',
      header: () => <div className="text-right text-blue-700">IVA Crédito</div>,
      cell: ({ row }) => {
        const b = computeCostTaxBreakdown(row.original, retentionPolicy)
        return (
          <div className="text-right text-xs font-semibold text-blue-700 tabular-nums">
            {b.ivaCredito > 0 ? `+${fmt(b.ivaCredito)}` : fmt(0)}
          </div>
        )
      },
    })
  }

  if (!hideMargins) {
    cols.push({
      accessorKey: 'ganancia',
      header: () => <div className="text-right">Ganancia / Margen</div>,
      cell: ({ row }) => {
        const b = computeCostTaxBreakdown(row.original, retentionPolicy)
        const marginOnNetSale = b.valorNetoVenta > 0 ? (b.gananciaNeta / b.valorNetoVenta) * 100 : 0
        return (
          <div className="text-right tabular-nums">
            <div className="font-semibold text-sm text-emerald-700">{fmt(b.gananciaNeta)}</div>
            <div className="text-[10px] text-muted-foreground">
              Margen {formatPercentage(marginOnNetSale)}
            </div>
          </div>
        )
      },
    })
  }

  if (showTaxBreakdown) {
    cols.push(
      {
        accessorKey: 'valor_neto',
        header: () => <div className="text-right">Valor Neto</div>,
        cell: ({ row }) => {
          const b = computeCostTaxBreakdown(row.original, retentionPolicy)
          return <div className="text-right text-xs font-medium tabular-nums">{fmt(b.valorNetoVenta)}</div>
        },
      },
      {
        id: 'iva_debito',
        header: () => <div className="text-right text-amber-700">IVA Débito</div>,
        cell: ({ row }) => {
          const b = computeCostTaxBreakdown(row.original, retentionPolicy)
          return (
            <div className="text-right text-xs font-semibold text-amber-700 tabular-nums">
              {b.ivaDebito > 0 ? fmt(b.ivaDebito) : fmt(0)}
            </div>
          )
        },
      },
      {
        id: 'balance_f29',
        header: () => <div className="text-right">IVA F29 (SII)</div>,
        cell: ({ row }) => {
          const b = computeCostTaxBreakdown(row.original, retentionPolicy)
          return (
            <div
              className={`text-right text-xs font-bold tabular-nums ${
                b.balanceIvaF29 > 0 ? 'text-rose-700' : 'text-emerald-700'
              }`}
            >
              {b.balanceIvaF29 > 0
                ? fmt(b.balanceIvaF29)
                : `${fmt(Math.abs(b.balanceIvaF29))} fav.`}
            </div>
          )
        },
      }
    )
  }

  cols.push({
    accessorKey: 'valor_total',
    header: ({ column }) => (
      <div className="flex justify-end">
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Total Cliente
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      </div>
    ),
    cell: ({ row }) => {
      const b = computeCostTaxBreakdown(row.original, retentionPolicy)
      return (
        <div className="text-right tabular-nums">
          <div className="font-bold text-sm">{fmt(b.valorTotalVenta)}</div>
          {currency !== 'CLP' && (
            <div className="text-[10px] text-muted-foreground">{formatCLP(b.valorTotalVenta)}</div>
          )}
          <div className="text-[10px] text-muted-foreground">
            {b.meta.aplicaIvaVenta ? 'IVA Débito incl.' : 'Exento IVA'}
          </div>
        </div>
      )
    },
  })

  if (canEdit) {
    cols.push({
      id: 'actions',
      header: () => <div className="text-right">Acciones</div>,
      cell: ({ row }) => {
        const cost = row.original
        return (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="icon" onClick={() => onEdit(cost)} title="Editar tarifa">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-red-500 hover:text-red-700 hover:bg-red-100"
              onClick={() => onDelete(cost.id)}
              title="Eliminar tarifa"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )
      },
    })
  }

  return cols
}
