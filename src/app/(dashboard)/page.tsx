'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-user'
import { useWorkspaceConfig } from '@/hooks/use-workspace-config'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCLP } from '@/lib/utils'
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
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface DashboardData {
  eventsPlanning: number
  eventsApproved: number
  eventsCompleted: number
  totalRevenue: number
  pendingUsers: number
}

export default function DashboardPage() {
  const { organization, isAdmin, isDemo } = useUser()
  const { terms, industry, isDuoExempt, entitlements } = useWorkspaceConfig()
  const [data, setData] = useState<DashboardData>({
    eventsPlanning: 0,
    eventsApproved: 0,
    eventsCompleted: 0,
    totalRevenue: 0,
    pendingUsers: 0,
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchData() {
      setLoading(true)

      try {
        // Fetch events counts (scoped by RLS to user's organization)
        const { data: eventsData, error: eventsError } = await supabase
          .from('events')
          .select('status')
          .is('deleted_at', null)

        if (eventsError) throw eventsError

        const events = (eventsData as any[]) || []

        let planning = 0
        let approved = 0
        let completed = 0

        events.forEach((e) => {
          if (e.status === 'planning') planning++
          else if (e.status === 'approved') approved++
          else if (e.status === 'completed') completed++
        })

        // Fetch total revenue from approved official items on completed events
        const { data: revenueData, error: revenueError } = await supabase
          .from('event_items')
          .select('cantidad, valor_total, tipo_evento, es_insumo, approved, events!inner(status, deleted_at)')
          .eq('events.status', 'completed')
          .is('events.deleted_at', null)
          .eq('approved', true)

        if (revenueError) throw revenueError

        let revenue = 0
        revenueData?.forEach((item: any) => {
          if (
            item.tipo_evento === 'ABONO_CLIENTE' ||
            item.tipo_evento === 'GASTO_REAL' ||
            item.es_insumo
          ) {
            return
          }
          revenue += (item.valor_total || 0) * (item.cantidad || 1)
        })

        // Fetch pending users (only for non-demo admins)
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
          pendingUsers: pendingCount,
        })
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [supabase, isAdmin, isDemo])

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const orgName = organization?.name || 'KAIROS ERP'
  const activeModulesCount = Object.values(entitlements.modules).filter(Boolean).length

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {!isDuoExempt && !isDemo ? (
        <div
          className={
            entitlements.effectiveTier === 'growth'
              ? 'glass-luxury text-white rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4'
              : entitlements.effectiveTier === 'scale'
              ? 'rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white border border-emerald-400/25 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4'
              : entitlements.effectiveTier === 'essential'
              ? 'glass-card rounded-3xl p-6 sm:p-8 border-blue-200/80 bg-gradient-to-r from-blue-50/70 via-white to-white flex flex-col sm:flex-row sm:items-center justify-between gap-4'
              : entitlements.effectiveTier === 'custom'
              ? 'glass-card rounded-3xl p-6 sm:p-8 border-slate-300/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4'
              : 'glass-card rounded-2xl p-6 border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4'
          }
        >
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                className={
                  entitlements.effectiveTier === 'growth'
                    ? 'bg-amber-400 text-slate-950 border-0 font-bold'
                    : entitlements.effectiveTier === 'scale'
                    ? 'bg-emerald-400 text-slate-950 border-0 font-bold'
                    : entitlements.effectiveTier === 'essential'
                    ? 'bg-blue-600 text-white border-0'
                    : 'bg-slate-900 text-white border-0'
                }
              >
                {industry.shortName} · Meta {industry.targetMarginPct}%
              </Badge>
              {entitlements.modules.mod_ai_suite && (
                <Badge variant="outline" className="border-amber-400/40 text-amber-300 bg-amber-400/10">
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
            <p
              className={
                entitlements.effectiveTier === 'growth' || entitlements.effectiveTier === 'scale'
                  ? 'text-slate-300 text-sm sm:text-base'
                  : 'text-muted-foreground text-sm sm:text-base'
              }
            >
              Panel de control, rentabilidad y gestión de {terms.projectPlural.toLowerCase()}
            </p>
          </div>

          <Link href="/billing" className="shrink-0">
            <Button
              size="sm"
              className={
                entitlements.effectiveTier === 'growth' || entitlements.effectiveTier === 'scale'
                  ? 'bg-white text-slate-950 hover:bg-slate-100 font-semibold tactile-press'
                  : 'bg-slate-900 text-white hover:bg-slate-800 font-semibold tactile-press'
              }
            >
              {entitlements.effectiveTier === 'free' ? 'Desbloquear IA y PDF' : 'Gestionar Suscripción'}
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Bienvenido a {orgName} ERP</h1>
          <p className="text-muted-foreground text-lg">
            Panel de control, planificación financiera y gestión de eventos
          </p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-card animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '0ms' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{terms.projectPlural} en Planificación</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tabular-nums">{data.eventsPlanning}</div>
            <Link href="/events" className="text-xs text-blue-600 hover:underline mt-1 inline-block">
              Ver {terms.projectPlural.toLowerCase()} →
            </Link>
          </CardContent>
        </Card>

        <Card className="glass-card animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '100ms' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{terms.projectPlural} Aprobados</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tabular-nums">{data.eventsApproved}</div>
          </CardContent>
        </Card>

        <Card className="glass-card animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '200ms' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{terms.projectPlural} Completados</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tabular-nums">{data.eventsCompleted}</div>
          </CardContent>
        </Card>

        <Card className="glass-card animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '300ms' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Totales (Completados)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tabular-nums">{formatCLP(data.totalRevenue)}</div>
          </CardContent>
        </Card>

        {!isDemo && data.pendingUsers > 0 && (
          <Card className="hover:shadow-md transition-shadow animate-in fade-in slide-in-from-bottom-4 duration-500 md:col-span-2 lg:col-span-4 bg-yellow-50/50 border-yellow-200" style={{ animationDelay: '400ms' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-yellow-800">Atención Requerida</CardTitle>
              <Users className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="text-sm text-yellow-700">
                Hay <span className="font-bold">{data.pendingUsers}</span> solicitudes de usuarios pendientes de aprobación.
              </div>
              <Link href="/governance">
                <Button variant="outline" size="sm" className="border-yellow-300 text-yellow-800 hover:bg-yellow-100">
                  Ir a Gobernanza
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Demo Sandbox Guided Tour */}
      {isDemo && (
        <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50/80 via-white to-amber-50/60 shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FlaskConical className="h-5 w-5 text-indigo-600" />
                <CardTitle className="text-lg">Guía de Exploración de la Sesión de Prueba</CardTitle>
              </div>
              <Badge variant="outline" className="bg-amber-100 text-amber-900 border-amber-300 font-semibold">
                4 Escenarios Base Profundos
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 text-xs">
            <Link
              href="/events/d0000002-0000-4000-8000-000000000001"
              className="group rounded-xl border border-border/80 bg-white p-4 hover:border-indigo-300 hover:shadow-sm transition-all flex flex-col justify-between gap-2"
            >
              <div className="space-y-1.5">
                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-0">Completado + Cierre</Badge>
                <h3 className="font-bold text-sm text-foreground group-hover:text-indigo-700">Gala TechChile 2026</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Explora ítems consolidados, abonos, gastos reales, flujo de caja e informe contable PDF.
                </p>
              </div>
              <span className="inline-flex items-center gap-1 font-semibold text-indigo-600">
                Investigar evento <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>

            <Link
              href="/events/d0000002-0000-4000-8000-000000000002"
              className="group rounded-xl border border-border/80 bg-white p-4 hover:border-indigo-300 hover:shadow-sm transition-all flex flex-col justify-between gap-2"
            >
              <div className="space-y-1.5">
                <Badge className="bg-indigo-100 text-indigo-800 hover:bg-indigo-100 border-0 inline-flex items-center gap-1">
                  <Store className="h-3 w-3" /> Retail / Bar
                </Badge>
                <h3 className="font-bold text-sm text-foreground group-hover:text-indigo-700">Fonda Primavera 2026</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Revisa recetas e insumos prorrateados por unidad vendida (terremotos, empanadas y barra).
                </p>
              </div>
              <span className="inline-flex items-center gap-1 font-semibold text-indigo-600">
                Investigar retail <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>

            <Link
              href="/events/d0000002-0000-4000-8000-000000000003"
              className="group rounded-xl border border-border/80 bg-white p-4 hover:border-indigo-300 hover:shadow-sm transition-all flex flex-col justify-between gap-2"
            >
              <div className="space-y-1.5">
                <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-0 inline-flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Borrador + IA
                </Badge>
                <h3 className="font-bold text-sm text-foreground group-hover:text-indigo-700">Matrimonio Sofía & Tomás</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Prueba el Borrador de Costos, optimización de márgenes IA, Drag & Drop y cotizador PDF.
                </p>
              </div>
              <span className="inline-flex items-center gap-1 font-semibold text-indigo-600">
                Probar borrador <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>

            <Link
              href="/analytics"
              className="group rounded-xl border border-border/80 bg-white p-4 hover:border-indigo-300 hover:shadow-sm transition-all flex flex-col justify-between gap-2"
            >
              <div className="space-y-1.5">
                <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-0">Consolidación</Badge>
                <h3 className="font-bold text-sm text-foreground group-hover:text-indigo-700">Analítica & Excel</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Revisa métricas P&L, gráficos mensuales de ventas vs costos, IVA F29 y descarga Excel contable.
                </p>
              </div>
              <span className="inline-flex items-center gap-1 font-semibold text-indigo-600">
                Ver consolidación <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4 pt-2">
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
