'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-user'
import { useWorkspaceConfig } from '@/hooks/use-workspace-config'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RevenueChart } from '@/components/analytics/revenue-chart'
import { formatCLP, getMonthName, parseDateSafe } from '@/lib/utils'
import type { MonthlyData } from '@/types'
import {
  Calendar,
  DollarSign,
  CheckCircle,
  Clock,
  Users,
  Loader2,
  Plus,
  BarChart,
  List,
  FlaskConical,
  ArrowRight,
  Sparkles,
  Store,
  TrendingUp,
  TrendingDown,
  Receipt,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { AnimatedNumber } from '@/components/ui/motion-primitives'

interface ShowcaseEvent {
  id: string
  name: string
  status: string
  has_retail_sales?: boolean
}

interface DashboardData {
  eventsPlanning: number
  eventsApproved: number
  eventsCompleted: number
  totalRevenue: number
  totalCosts: number
  netProfit: number
  ivaNetoF29: number
  avgMarginPct: number
  momChangePct: number | null
  monthlySeries: MonthlyData[]
  pendingUsers: number
  completedShowcase: ShowcaseEvent | null
  consolidatedShowcase: ShowcaseEvent | null
  planningShowcase: ShowcaseEvent | null
}

export default function DashboardPage() {
  const { organization, isAdmin, isDemo } = useUser()
  const { terms, industry, isDuoExempt, entitlements } = useWorkspaceConfig()
  const [data, setData] = useState<DashboardData>({
    eventsPlanning: 0,
    eventsApproved: 0,
    eventsCompleted: 0,
    totalRevenue: 0,
    totalCosts: 0,
    netProfit: 0,
    ivaNetoF29: 0,
    avgMarginPct: 0,
    momChangePct: null,
    monthlySeries: [],
    pendingUsers: 0,
    completedShowcase: null,
    consolidatedShowcase: null,
    planningShowcase: null,
  })
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    try {
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('id, name, status, event_date, has_retail_sales, event_items(*)')
        .is('deleted_at', null)

      if (eventsError) throw eventsError

      const events = (eventsData as any[]) || []

      let planning = 0
      let approved = 0
      let completed = 0
      let revenue = 0
      let costs = 0
      let ivaDebito = 0
      let ivaCredito = 0
      let marginSum = 0
      let marginCount = 0

      let completedShowcase: ShowcaseEvent | null = null
      let consolidatedShowcase: ShowcaseEvent | null = null
      let planningShowcase: ShowcaseEvent | null = null

      const monthlyMap = new Map<number, { month: string; ventas: number; costos: number }>()

      events.forEach((e) => {
        if (e.status === 'planning') {
          planning++
          if (!planningShowcase) planningShowcase = e
        } else if (e.status === 'approved') {
          approved++
          if (e.has_retail_sales && !consolidatedShowcase) consolidatedShowcase = e
        } else if (e.status === 'completed') {
          completed++
          completedShowcase = e
        }

        if (e.status !== 'completed') return

        const parsed = e.event_date ? parseDateSafe(e.event_date) : null
        const monthNum = parsed?.month || 0
        if (monthNum > 0 && !monthlyMap.has(monthNum)) {
          monthlyMap.set(monthNum, { month: getMonthName(monthNum), ventas: 0, costos: 0 })
        }

        const items = Array.isArray(e.event_items) ? e.event_items : []
        items.forEach((item: any) => {
          if (
            !item.approved ||
            item.es_insumo ||
            item.tipo_evento === 'ABONO_CLIENTE' ||
            item.tipo_evento === 'GASTO_REAL'
          ) {
            return
          }
          const qty = item.cantidad || 1
          const vTotal = (item.valor_total || 0) * qty
          const itemCost = (item.costo || 0) * qty
          const itemIva = (item.iva || 0) * qty

          revenue += vTotal
          costs += itemCost
          ivaDebito += itemIva
          if (item.tipo_doc_costo === 'factura') {
            ivaCredito += Math.round(itemCost * 0.19)
          }
          if (typeof item.margen === 'number' && item.margen > 0) {
            marginSum += item.margen
            marginCount++
          }

          if (monthNum > 0) {
            const mEntry = monthlyMap.get(monthNum)!
            mEntry.ventas += vTotal
            mEntry.costos += itemCost
          }
        })
      })

      if (!consolidatedShowcase) {
        consolidatedShowcase = events.find((e) => e.has_retail_sales) || events.find((e) => e.status === 'approved') || null
      }

      const sortedSeries = Array.from(monthlyMap.entries())
        .sort(([a], [b]) => a - b)
        .map(([, val]) => val)

      let momChangePct: number | null = null
      if (sortedSeries.length >= 2) {
        const last = sortedSeries[sortedSeries.length - 1].ventas
        const prev = sortedSeries[sortedSeries.length - 2].ventas
        if (prev > 0) {
          momChangePct = ((last - prev) / prev) * 100
        }
      }

      let pendingCount = 0
      if (isAdmin && !isDemo) {
        const { count } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending')
        pendingCount = count || 0
      }

      setData({
        eventsPlanning: planning,
        eventsApproved: approved,
        eventsCompleted: completed,
        totalRevenue: revenue,
        totalCosts: costs,
        netProfit: Math.max(0, revenue - costs),
        ivaNetoF29: Math.max(0, ivaDebito - ivaCredito),
        avgMarginPct: marginCount > 0 ? marginSum / marginCount : 0,
        momChangePct,
        monthlySeries: sortedSeries,
        pendingUsers: pendingCount,
        completedShowcase,
        consolidatedShowcase,
        planningShowcase,
      })
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }, [isAdmin, isDemo])

  useEffect(() => {
    fetchData()
    const onRefresh = () => fetchData()
    window.addEventListener('figura:local-db-changed', onRefresh)
    window.addEventListener('figura:org-updated', onRefresh)
    return () => {
      window.removeEventListener('figura:local-db-changed', onRefresh)
      window.removeEventListener('figura:org-updated', onRefresh)
    }
  }, [fetchData, industry.id])

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const orgName = organization?.name || 'FIGURA'
  const activeModulesCount = Object.values(entitlements.modules).filter(Boolean).length

  return (
    <div className="p-4 sm:p-6 space-y-7 max-w-7xl mx-auto">
      {!isDuoExempt && !isDemo ? (
        <div className="glass-luxury hairline-shimmer text-foreground rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-reveal-up">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-[#4A607A]/12 text-[#3B4F66] border border-[#4A607A]/25 text-[10px] tracking-wider uppercase font-semibold">
                {industry.shortName} · Meta {industry.targetMarginPct}%
              </Badge>
              {entitlements.modules.mod_ai_suite && (
                <Badge variant="outline" className="border-[#467366]/35 text-[#2E5248] bg-[#467366]/10 text-[10px]">
                  <Sparkles className="h-3 w-3 mr-1" />
                  IA ACTIVA ({entitlements.aiCallsRemaining} disp.)
                </Badge>
              )}
              {entitlements.effectiveTier === 'custom' && (
                <Badge variant="outline" className="text-xs">
                  {activeModulesCount} módulos activos
                </Badge>
              )}
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Bienvenido a {orgName} ERP</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Panel de control, rentabilidad y gestión de {terms.projectPlural.toLowerCase()}
            </p>
          </div>

          <Link href="/billing" className="shrink-0">
            <Button size="sm" className="font-semibold tactile-press">
              {entitlements.effectiveTier === 'free' ? 'Desbloquear IA y PDF' : 'Gestionar Suscripción'}
            </Button>
          </Link>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-[#1261E0]/10 text-[#0F4FB8] border border-[#1261E0]/20 text-[10px] tracking-wider uppercase font-semibold">
                {industry.shortName} · Meta {industry.targetMarginPct}%
              </Badge>
              {data.momChangePct !== null && (
                <Badge
                  variant="outline"
                  className={
                    data.momChangePct >= 0
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 text-[10px]'
                      : 'border-rose-200 bg-rose-50 text-rose-700 text-[10px]'
                  }
                >
                  {data.momChangePct >= 0 ? (
                    <TrendingUp className="h-3 w-3 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 mr-1" />
                  )}
                  Último mes {data.momChangePct >= 0 ? '+' : ''}
                  {data.momChangePct.toFixed(1)}%
                </Badge>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Bienvenido a {orgName}</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Control ejecutivo, flujo financiero y gestión de {terms.projectPlural.toLowerCase()}
            </p>
          </div>
          <Link href="/events/new" data-tour-id="simulate-action-btn" className="shrink-0">
            <Button className="tactile-press gap-2 font-semibold">
              <Plus className="h-4 w-4" />
              {terms.newProjectCta}
            </Button>
          </Link>
        </div>
      )}

      {/* KPIs Principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-tour-id="inventory-grid" className="glass-card spotlight-card animate-reveal-up">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{terms.projectPlural} en Planificación</CardTitle>
            <Clock className="h-4 w-4 text-[#1261E0]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold font-mono tabular-nums">
              <AnimatedNumber value={data.eventsPlanning} duration={550} />
            </div>
            <Link href="/events" className="text-xs text-[#1261E0] hover:underline mt-1 inline-block">
              Ver {terms.projectPlural.toLowerCase()} →
            </Link>
          </CardContent>
        </Card>

        <Card className="glass-card spotlight-card animate-reveal-up">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{terms.projectPlural} Aprobados</CardTitle>
            <CheckCircle className="h-4 w-4 text-[#0D8A72]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold font-mono tabular-nums">
              <AnimatedNumber value={data.eventsApproved} duration={550} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              En ejecución activa
            </p>
          </CardContent>
        </Card>

        <Card data-tour-id="quick-invoice-btn" className="glass-card spotlight-card animate-reveal-up">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">IVA Neto Proyectado F29</CardTitle>
            <Receipt className="h-4 w-4 text-[#0284C7]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold font-mono tabular-nums">
              <AnimatedNumber value={data.ivaNetoF29} format="clp" duration={600} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.eventsCompleted} {terms.projectPlural.toLowerCase()} cerrados
            </p>
          </CardContent>
        </Card>

        <Card data-tour-id="kpi-ebitda" className="glass-card spotlight-card animate-reveal-up">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Totales (Cerrados)</CardTitle>
            <DollarSign className="h-4 w-4 text-[#0D8A72]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold font-mono tabular-nums">
              <AnimatedNumber value={data.totalRevenue} format="clp" duration={700} />
            </div>
            <p className="text-xs text-[#0D8A72] font-medium mt-1 tabular-nums">
              Utilidad neta: {formatCLP(data.netProfit)} · Margen {data.avgMarginPct.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        {!isDemo && data.pendingUsers > 0 && (
          <Card className="glass-card animate-reveal-up md:col-span-2 lg:col-span-4 bg-[#1261E0]/[0.05] border-[#1261E0]/25">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-[#0F4FB8]">Atención Requerida</CardTitle>
              <Users className="h-4 w-4 text-[#1261E0]" />
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="text-sm text-foreground/85">
                Hay <span className="font-bold font-mono">{data.pendingUsers}</span> solicitudes de usuarios pendientes de aprobación.
              </div>
              <Link href="/governance">
                <Button variant="outline" size="sm" className="border-[#1261E0]/30 text-[#0F4FB8] hover:bg-[#1261E0]/10">
                  Ir a Gobernanza
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Gráfico de Evolución Mensual (Crecimiento y Caídas Estacionales) */}
      {data.monthlySeries.length > 0 && (
        <div data-tour-id="dashboard-trend" className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          <div className="lg:col-span-2">
            <RevenueChart data={data.monthlySeries} />
          </div>
          <Card className="glass-card flex flex-col justify-between p-6 space-y-4">
            <div className="space-y-2">
              <Badge variant="outline" className="text-[10px] uppercase tracking-wider text-[#3B4F66] border-[#4A607A]/25">
                Pulso Ejecutivo · {industry.shortName}
              </Badge>
              <h3 className="text-lg font-semibold tracking-tight">
                Salud de Margen &amp; Estacionalidad
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Visualice los meses de expansión y las bajas estacionales para anticipar flujo de caja, compras con factura y capacidad de equipo.
              </p>
            </div>
            <div className="space-y-3 text-xs border-t border-slate-200/75 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Costos Operativos Cerrados</span>
                <span className="font-semibold font-mono tabular-nums text-rose-700">
                  {formatCLP(data.totalCosts)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Margen Promedio vs Meta ({industry.targetMarginPct}%)</span>
                <span className="font-semibold font-mono tabular-nums text-[#0D8A72]">
                  {data.avgMarginPct.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Meses con Cierre Registrado</span>
                <span className="font-semibold font-mono tabular-nums">
                  {data.monthlySeries.length} meses
                </span>
              </div>
            </div>
            <Link href="/analytics" className="block">
              <Button variant="outline" className="w-full justify-between text-xs font-semibold">
                Abrir {terms.analyticsLabel} Completa
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </Card>
        </div>
      )}

      {/* Demo Sandbox Guided Scenarios (100% dinámicos según el rubro activo) */}
      {isDemo && (
        <Card data-tour-id="demo-scenarios" className="glass-card border-[#1261E0]/25 bg-gradient-to-br from-[#1261E0]/[0.05] via-white to-[#0D8A72]/[0.04]">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FlaskConical className="h-5 w-5 text-[#1261E0]" />
                <CardTitle className="text-lg">
                  Escenarios Reales de {industry.shortName}
                </CardTitle>
              </div>
              <Badge variant="outline" className="bg-[#1261E0]/10 text-[#0F4FB8] border-[#1261E0]/25 font-mono text-[11px] font-semibold">
                Explora cada etapa en vivo
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 text-xs">
            {data.completedShowcase && (
              <Link
                href={`/events/${data.completedShowcase.id}`}
                className="group rounded-xl border border-border/80 bg-white p-4 hover:border-[#1261E0]/40 hover:shadow-sm transition-all flex flex-col justify-between gap-2"
              >
                <div className="space-y-1.5">
                  <Badge className="bg-[#0D8A72]/12 text-[#0D8A72] hover:bg-[#0D8A72]/15 border-0">
                    Completado + Cierre
                  </Badge>
                  <h3 className="font-bold text-sm text-foreground group-hover:text-[#1261E0] line-clamp-2">
                    {data.completedShowcase.name}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Revisa partidas aprobadas, abonos, gastos reales, balance IVA F29 y reporte PDF.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 font-semibold text-[#1261E0]">
                  Ver cierre <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            )}

            {data.consolidatedShowcase && (
              <Link
                href={`/events/${data.consolidatedShowcase.id}`}
                className="group rounded-xl border border-border/80 bg-white p-4 hover:border-[#1261E0]/40 hover:shadow-sm transition-all flex flex-col justify-between gap-2"
              >
                <div className="space-y-1.5">
                  <Badge className="bg-[#0284C7]/12 text-[#0369A1] hover:bg-[#0284C7]/15 border-0 inline-flex items-center gap-1">
                    <Store className="h-3 w-3" /> Insumos Agrupados
                  </Badge>
                  <h3 className="font-bold text-sm text-foreground group-hover:text-[#1261E0] line-clamp-2">
                    {data.consolidatedShowcase.name}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Explora partidas padre/hijo con materiales prorrateados por unidad y margen real.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 font-semibold text-[#1261E0]">
                  Ver desglose <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            )}

            {data.planningShowcase && (
              <Link
                href={`/events/${data.planningShowcase.id}`}
                className="group rounded-xl border border-border/80 bg-white p-4 hover:border-[#1261E0]/40 hover:shadow-sm transition-all flex flex-col justify-between gap-2"
              >
                <div className="space-y-1.5">
                  <Badge className="bg-[#1261E0]/12 text-[#0F4FB8] hover:bg-[#1261E0]/15 border-0 inline-flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> Borrador + IA
                  </Badge>
                  <h3 className="font-bold text-sm text-foreground group-hover:text-[#1261E0] line-clamp-2">
                    {data.planningShowcase.name}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Prueba el Borrador de Costos, optimización de márgenes IA y cotizador PDF en 1 clic.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 font-semibold text-[#1261E0]">
                  Probar borrador <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            )}

            <Link
              href="/analytics"
              className="group rounded-xl border border-border/80 bg-white p-4 hover:border-[#1261E0]/40 hover:shadow-sm transition-all flex flex-col justify-between gap-2"
            >
              <div className="space-y-1.5">
                <Badge className="bg-slate-200/80 text-slate-800 hover:bg-slate-200 border-0">
                  {terms.analyticsLabel}
                </Badge>
                <h3 className="font-bold text-sm text-foreground group-hover:text-[#1261E0]">
                  Analítica &amp; Excel F29
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Analiza crecimiento y caídas mensuales, distribución de costos y exporta tu libro Excel.
                </p>
              </div>
              <span className="inline-flex items-center gap-1 font-semibold text-[#1261E0]">
                Ver analítica <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4 pt-2" data-tour-id="dashboard-quick-actions">
        <h2 className="text-xl font-semibold tracking-tight">Acciones Rápidas</h2>
        <div className="flex flex-wrap gap-4">
          <Link href="/events/new">
            <Button className="tactile-press">
              <Plus className="mr-2 h-4 w-4" />
              {terms.newProjectCta}
            </Button>
          </Link>
          <Link href="/costs">
            <Button variant="outline" className="tactile-press">
              <List className="mr-2 h-4 w-4" />
              Ver {terms.catalogLabel}
            </Button>
          </Link>
          <Link href={entitlements.modules.mod_analytics_excel || isDuoExempt || isDemo ? '/analytics' : '/billing'}>
            <Button variant="outline" className="tactile-press">
              <BarChart className="mr-2 h-4 w-4" />
              {terms.analyticsLabel}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
