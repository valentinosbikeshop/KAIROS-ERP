'use client'

import { useMemo, useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  flexRender,
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { getColumns } from './columns'
import { MasterCost, QuoteCurrency } from '@/types'
import { computeCostTaxBreakdown, CostResourceType, RESOURCE_TYPE_LABELS } from '@/lib/cost-metadata'
import { useWorkspaceConfig } from '@/hooks/use-workspace-config'
import { useUser } from '@/hooks/use-user'
import { can } from '@/lib/rbac'
import { DEFAULT_UF_RATE_CLP, DEFAULT_USD_RATE_CLP } from '@/lib/finance-core'
import { Receipt, Search } from 'lucide-react'

interface CostsTableProps {
  data: MasterCost[]
  onEdit: (cost: MasterCost) => void
  onDelete: (id: string) => void
  canEdit?: boolean
}

export function CostsTable({ data, onEdit, onDelete, canEdit }: CostsTableProps) {
  const { industry, organization, entitlements } = useWorkspaceConfig()
  const { profile } = useUser()
  const [sorting, setSorting] = useState<SortingState>([])
  const [searchText, setSearchText] = useState('')
  const [resourceFilter, setResourceFilter] = useState<'all' | CostResourceType>('all')
  const [docFilter, setDocFilter] = useState<'all' | 'factura' | 'boleta'>('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [showTaxBreakdown, setShowTaxBreakdown] = useState(false)
  const [currency, setCurrency] = useState<QuoteCurrency>('CLP')

  const retentionPolicy =
    organization?.bank_info?.__saas_config?.honorarios_retention_policy || 'contractor'
  const currencyRates = useMemo(
    () => ({
      uf: organization?.uf_rate_clp || organization?.bank_info?.__saas_config?.uf_rate_clp || DEFAULT_UF_RATE_CLP,
      usd: organization?.usd_rate_clp || organization?.bank_info?.__saas_config?.usd_rate_clp || DEFAULT_USD_RATE_CLP,
    }),
    [organization]
  )

  const insumoLabel =
    industry.id === 'eventos_banqueteria' ? 'Banquetería / Insumos' : RESOURCE_TYPE_LABELS.insumo

  const resourceTabs: { value: 'all' | CostResourceType; label: string }[] = useMemo(
    () => [
      { value: 'all', label: 'Todos' },
      { value: 'personal', label: RESOURCE_TYPE_LABELS.personal },
      { value: 'servicio', label: 'Servicios / Equipos' },
      { value: 'insumo', label: insumoLabel },
      { value: 'logistica', label: RESOURCE_TYPE_LABELS.logistica },
    ],
    [insumoLabel]
  )

  const categoryOptions = useMemo(() => {
    const set = new Set<string>(industry.categories || [])
    data.forEach((cost) => {
      if (cost.tipo_evento && cost.tipo_evento.trim()) {
        set.add(cost.tipo_evento.trim())
      }
    })
    return [
      { value: 'all', label: 'Todas las Categorías' },
      ...Array.from(set).map((cat) => ({ value: cat, label: cat })),
    ]
  }, [industry.categories, data])

  const filteredData = useMemo(() => {
    const query = searchText.trim().toLowerCase()
    return data.filter((cost) => {
      const b = computeCostTaxBreakdown(cost, retentionPolicy)
      if (resourceFilter !== 'all' && b.meta.resourceType !== resourceFilter) {
        return false
      }
      if (docFilter !== 'all' && b.tipoDocCompra !== docFilter) {
        return false
      }
      if (typeFilter !== 'all' && cost.tipo_evento !== typeFilter) {
        return false
      }
      if (query) {
        const matchesService = cost.servicio.toLowerCase().includes(query)
        const matchesDetail = (b.meta.cleanDetail || '').toLowerCase().includes(query)
        if (!matchesService && !matchesDetail) return false
      }
      return true
    })
  }, [data, searchText, resourceFilter, docFilter, typeFilter, retentionPolicy])

  const effectiveCanEdit =
    canEdit !== undefined ? canEdit : can(profile, 'edit_catalog', entitlements)
  const hideMargins = !can(profile, 'view_costs_margins', entitlements)

  const columns = useMemo(
    () =>
      getColumns(onEdit, onDelete, showTaxBreakdown, {
        currency,
        rates: currencyRates,
        retentionPolicy,
        canEdit: effectiveCanEdit,
        hideMargins,
        insumoLabel,
      }),
    [
      onEdit,
      onDelete,
      showTaxBreakdown,
      currency,
      currencyRates,
      retentionPolicy,
      effectiveCanEdit,
      hideMargins,
      insumoLabel,
    ]
  )

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    initialState: {
      pagination: {
        pageSize: 15,
      },
    },
    state: {
      sorting,
    },
  })

  return (
    <div className="space-y-3">
      {/* Filtros por Naturaleza + Conversión Moneda + Toggle Desglose Tributario */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 bg-muted/40 p-1 rounded-xl border border-border/60">
          {resourceTabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setResourceFilter(tab.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                resourceFilter === tab.value
                  ? 'bg-background text-foreground shadow-2xs border border-border/60'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex items-center rounded-lg border border-border/70 bg-muted/30 p-0.5 text-[11px] font-semibold"
            role="group"
            aria-label="Moneda de visualización"
          >
            {(['CLP', 'UF', 'USD'] as QuoteCurrency[]).map((curr) => (
              <button
                key={curr}
                type="button"
                onClick={() => setCurrency(curr)}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  currency === curr
                    ? 'bg-background text-foreground shadow-2xs border border-border/60'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {curr}
              </button>
            ))}
          </div>

          <Button
            type="button"
            variant={showTaxBreakdown ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowTaxBreakdown((prev) => !prev)}
            className="h-8 gap-1.5 text-xs font-medium"
          >
            <Receipt className="h-3.5 w-3.5" />
            {showTaxBreakdown ? 'Ocultar Desglose IVA' : 'Ver Desglose IVA Crédito / Débito'}
          </Button>
        </div>
      </div>

      {/* Buscador y Selects */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-2.5" />
          <Input
            placeholder="Buscar ítem, cargo o alcance..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <Select
          value={docFilter}
          onChange={(e) => setDocFilter(e.target.value as 'all' | 'factura' | 'boleta')}
          options={[
            { value: 'all', label: 'Todos los Docs Compra' },
            { value: 'factura', label: 'Factura (IVA Crédito)' },
            { value: 'boleta', label: 'Boleta / Honorarios' },
          ]}
          className="w-[195px] h-9 text-xs"
        />
        <Select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          options={categoryOptions}
          className="w-[200px] h-9 text-xs"
        />
      </div>

      <div className="rounded-xl border bg-card overflow-x-auto shadow-2xs">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="whitespace-nowrap">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="hover:bg-muted/30">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  No se encontraron servicios con los filtros seleccionados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between py-2">
        <p className="text-xs text-muted-foreground">
          Mostrando {filteredData.length} de {data.length} tarifas registradas
        </p>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Anterior
          </Button>
          <div className="text-xs font-medium">
            Página {table.getState().pagination.pageIndex + 1} de {Math.max(1, table.getPageCount())}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  )
}
