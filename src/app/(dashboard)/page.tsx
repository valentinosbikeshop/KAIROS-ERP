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
import { AnimatedNumber } from '@/components/ui/motion-primitives'

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
              ? 'glass-luxury hairline-shimmer text-white rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-reveal-up'
              : entitlements.effectiveTier === 'scale'
              ? 'rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-[#080E1A] via-[#0B1C28] to-[#0B2E2B] text-white border border-[#2DD4BF]/30 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-reveal-up'
              : entitlements.effectiveTier === 'essential'
              ? 'glass-card rounded-3xl p-6 sm:p-8 border-[#1261E0]/25 bg-gradient-to-r from-[#1261E0]/[0.06] via-white to-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-reveal-up'
              : entitlements.effectiveTier === 'custom'
              ? 'glass-card rounded-3xl p-6 sm:p-8 border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-reveal-up'
              : 'glass-card rounded-2xl p-6 border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-reveal-up'
          }
        >
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                className={
                  entitlements.effectiveTier === 'growth'
                    ? 'bg-[#2DD4BF] text-[#080E1A] border-0 font-mono text-[10px] tracking-wider uppercase font-semibold'
                    : entitlements.effectiveTier === 'scale'
                    ? 'bg-[#38BDF8] text-[#080E1A] border-0 font-mono text-[10px] tracking-wider uppercase font-semibold'
                    : entitlements.effectiveTier === 'essential'
                    ? 'bg-[#1261E0] text-white border-0 font-mono text-[10px] tracking-wider uppercase'
                    : 'bg-[#0D1829] text-white border-0 font-mono text-[10px] tracking-wider uppercase'
                }
              >
                {industry.shortName} · Meta {industry.targetMarginPct}%
              </Badge>
              {entitlements.modules.mod_ai_suite && (
                <Badge variant="outline" className="border-[#38BDF8]/40 text-[#38BDF8] bg-[#38BDF8]/10 font-mono text-[10px]">
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
        <Card className="glass-card spotlight-card animate-reveal-up opacity-0" style={{ animationDelay: '0ms' }}>
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

        <Card className="glass-card spotlight-card animate-reveal-up opacity-0" style={{ animationDelay: '80ms' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{terms.projectPlural} Aprobados</CardTitle>
            <CheckCircle className="h-4 w-4 text-[#0D8A72]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold font-mono tabular-nums">
              <AnimatedNumber value={data.eventsApproved} duration={550} />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card spotlight-card animate-reveal-up opacity-0" style={{ animationDelay: '160ms' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{terms.projectPlural} Completados</CardTitle>
            <Calendar className="h-4 w-4 text-[#0284C7]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold font-mono tabular-nums">
              <AnimatedNumber value={data.eventsCompleted} duration={550} />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card spotlight-card animate-reveal-up opacity-0" style={{ animationDelay: '240ms' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Totales (Completados)</CardTitle>
            <DollarSign className="h-4 w-4 text-[#0D8A72]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold font-mono tabular-nums">
              <AnimatedNumber value={data.totalRevenue} format="clp" duration={700} />
            </div>
          </CardContent>
        </Card>

        {!isDemo && data.pendingUsers > 0 && (
          <Card className="glass-card animate-reveal-up md:col-span-2 lg:col-span-4 bg-[#1261E0]/[0.05] border-[#1261E0]/25" style={{ animationDelay: '320ms' }}>
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

      {/* Demo Sandbox Guided Tour */}
      {isDemo && (
        <Card className="glass-card border-[#1261E0]/25 bg-gradient-to-br from-[#1261E0]/[0.05] via-white to-[#0D8A72]/[0.04]">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FlaskConical className="h-5 w-5 text-[#1261E0]" />
                <CardTitle className="text-lg">Guía de Exploración de la Sesión de Prueba</CardTitle>
              </div>
              <Badge variant="outline" className="bg-[#1261E0]/10 text-[#0F4FB8] border-[#1261E0]/25 font-mono text-[11px] font-semibold">
                4 Escenarios Base Profundos
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 text-xs">
            <Link
              href="/events/d0000002-0000-4000-8000-000000000001"
              className="group rounded-xl border border-border/80 bg-white p-4 hover:border-[#1261E0]/40 hover:shadow-sm transition-all flex flex-col justify-between gap-2"
            >
              <div className="space-y-1.5">
                <Badge className="bg-[#0D8A72]/12 text-[#0D8A72] hover:bg-[#0D8A72]/15 border-0">Completado + Cierre</Badge>
                <h3 className="font-bold text-sm text-foreground group-hover:text-[#1261E0]">Gala TechChile 2026</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Explora ítems consolidados, abonos, gastos reales, flujo de caja e informe contable PDF.
                </p>
              </div>
              <span className="inline-flex items-center gap-1 font-semibold text-[#1261E0]">
                Investigar evento <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>

            <Link
              href="/events/d0000002-0000-4000-8000-000000000002"
              className="group rounded-xl border border-border/80 bg-white p-4 hover:border-[#1261E0]/40 hover:shadow-sm transition-all flex flex-col justify-between gap-2"
            >
              <div className="space-y-1.5">
                <Badge className="bg-[#0284C7]/12 text-[#0369A1] hover:bg-[#0284C7]/15 border-0 inline-flex items-center gap-1">
                  <Store className="h-3 w-3" /> Retail / Bar
                </Badge>
                <h3 className="font-bold text-sm text-foreground group-hover:text-[#1261E0]">Fonda Primavera 2026</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Revisa recetas e insumos prorrateados por unidad vendida (terremotos, empanadas y barra).
                </p>
              </div>
              <span className="inline-flex items-center gap-1 font-semibold text-[#1261E0]">
                Investigar retail <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>

            <Link
              href="/events/d0000002-0000-4000-8000-000000000003"
              className="group rounded-xl border border-border/80 bg-white p-4 hover:border-[#1261E0]/40 hover:shadow-sm transition-all flex flex-col justify-between gap-2"
            >
              <div className="space-y-1.5">
                <Badge className="bg-[#1261E0]/12 text-[#0F4FB8] hover:bg-[#1261E0]/15 border-0 inline-flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Borrador + IA
                </Badge>
                <h3 className="font-bold text-sm text-foreground group-hover:text-[#1261E0]">Matrimonio Sofía & Tomás</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Prueba el Borrador de Costos, optimización de márgenes IA, Drag & Drop y cotizador PDF.
                </p>
              </div>
              <span className="inline-flex items-center gap-1 font-semibold text-[#1261E0]">
                Probar borrador <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>

            <Link
              href="/analytics"
              className="group rounded-xl border border-border/80 bg-white p-4 hover:border-[#1261E0]/40 hover:shadow-sm transition-all flex flex-col justify-between gap-2"
            >
              <div className="space-y-1.5">
                <Badge className="bg-slate-200/80 text-slate-800 hover:bg-slate-200 border-0">Consolidación</Badge>
                <h3 className="font-bold text-sm text-foreground group-hover:text-[#1261E0]">Analítica & Excel</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Revisa métricas P&L, gráficos mensuales de ventas vs costos, IVA F29 y descarga Excel contable.
                </p>
              </div>
              <span className="inline-flex items-center gap-1 font-semibold text-[#1261E0]">
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
