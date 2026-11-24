'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  Database,
  DollarSign,
  FlaskConical,
  HardDrive,
  Menu,
  Plus,
  Receipt,
  RotateCcw,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { INDUSTRY_BLUEPRINTS, INDUSTRY_LIST } from '@/lib/industries';
import {
  buildDemoSeedForIndustry,
  computeDemoProjectFinancials,
  type DemoBrandConfig,
  type DemoCatalogItem,
  type DemoProject,
} from '@/lib/demo-local-data';
import { DemoSidebar, type DemoSectionKey } from '@/components/demo/demo-sidebar';
import { DemoCatalogView } from '@/components/demo/demo-catalog-view';
import { DemoProjectDetail } from '@/components/demo/demo-project-detail';
import { DemoAnalyticsView } from '@/components/demo/demo-analytics-view';
import { DemoBrandingView } from '@/components/demo/demo-branding-view';
import { AnimatedNumber, SpotlightCard } from '@/components/ui/motion-primitives';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { cn, formatCLP, formatPercentage } from '@/lib/utils';
import type { IndustryType } from '@/types/database';

const STORAGE_KEY = 'kairos_enterprise_demo_v2';
const CONSENT_KEY = 'kairos_demo_cache_consent';
const MAX_CUSTOM_PROJECTS = 3;
const MAX_CUSTOM_RATES = 6;

interface PersistedDemoState {
  industryType: IndustryType;
  brand: DemoBrandConfig;
  catalog: DemoCatalogItem[];
  projects: DemoProject[];
}

export default function EnterpriseLocalDemoPage() {
  const initialSeed = useMemo(() => buildDemoSeedForIndustry('eventos_banqueteria'), []);

  const [mounted, setMounted] = useState(false);
  const [cacheAccepted, setCacheAccepted] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [industryType, setIndustryType] = useState<IndustryType>('eventos_banqueteria');
  const [brand, setBrand] = useState<DemoBrandConfig>(initialSeed.brand);
  const [catalog, setCatalog] = useState<DemoCatalogItem[]>(initialSeed.catalog);
  const [projects, setProjects] = useState<DemoProject[]>(initialSeed.projects);

  const [activeSection, setActiveSection] = useState<DemoSectionKey>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectFilter, setProjectFilter] = useState<'all' | 'planning' | 'approved' | 'completed'>('all');
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [newProjName, setNewProjName] = useState('');
  const [newProjClient, setNewProjClient] = useState('');
  const [newProjLocation, setNewProjLocation] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  const blueprint = INDUSTRY_BLUEPRINTS[industryType];
  const seedHelpers = useMemo(() => buildDemoSeedForIndustry(industryType), [industryType]);

  // Cargar exclusivamente desde localStorage (Cero llamadas a Supabase)
  useEffect(() => {
    setMounted(true);
    try {
      const consent = localStorage.getItem(CONSENT_KEY);
      setCacheAccepted(consent === 'accepted');

      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as PersistedDemoState;
        if (parsed.industryType && parsed.industryType in INDUSTRY_BLUEPRINTS) {
          setIndustryType(parsed.industryType);
          if (parsed.brand) setBrand(parsed.brand);
          if (Array.isArray(parsed.catalog) && parsed.catalog.length > 0) setCatalog(parsed.catalog);
          if (Array.isArray(parsed.projects) && parsed.projects.length > 0) setProjects(parsed.projects);
        }
      }
    } catch {
      // Ignorar errores de almacenamiento privado
    }
  }, []);

  // Persistir exclusivamente en localStorage
  useEffect(() => {
    if (!mounted) return;
    try {
      const payload: PersistedDemoState = { industryType, brand, catalog, projects };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignorar
    }
  }, [mounted, industryType, brand, catalog, projects]);

  const handleAcceptCache = () => {
    try {
      localStorage.setItem(CONSENT_KEY, 'accepted');
    } catch {
      // Ignorar
    }
    setCacheAccepted(true);
  };

  const handleSwitchIndustry = (nextIndustry: IndustryType) => {
    const nextSeed = buildDemoSeedForIndustry(nextIndustry);
    setIndustryType(nextIndustry);
    setBrand(nextSeed.brand);
    setCatalog(nextSeed.catalog);
    setProjects(nextSeed.projects);
    setSelectedProjectId(null);
    setNotice(`Entorno Enterprise adaptado al instante para ${INDUSTRY_BLUEPRINTS[nextIndustry].name}.`);
  };

  const handleResetCache = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignorar
    }
    const fresh = buildDemoSeedForIndustry(industryType);
    setBrand(fresh.brand);
    setCatalog(fresh.catalog);
    setProjects(fresh.projects);
    setSelectedProjectId(null);
    setActiveSection('dashboard');
    setNotice('Caché local restaurado al estado inicial de evaluación.');
  };

  const customProjectsCount = projects.filter((p) => p.isCustom).length;
  const customRatesCount = catalog.filter((c) => c.isCustom).length;

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim()) return;
    if (customProjectsCount >= MAX_CUSTOM_PROJECTS) {
      setNotice(`Límite de evaluación alcanzado (${MAX_CUSTOM_PROJECTS} proyectos propios en caché).`);
      return;
    }
    const starterItem = catalog[0];
    const newProj: DemoProject = {
      id: `demo-custom-${Date.now()}`,
      name: newProjName.trim(),
      client_company: newProjClient.trim() || 'Cliente de Evaluación',
      location: newProjLocation.trim() || 'Santiago, Chile',
      event_date: new Date().toISOString().slice(0, 10),
      status: 'planning',
      scenarioBadge: 'Creado en Caché',
      scenarioDesc: 'Proyecto creado localmente para evaluar cotización, IA, flujo de caja y PDF.',
      isCustom: true,
      items: starterItem
        ? [
            {
              id: `item-${Date.now()}`,
              servicio: starterItem.servicio,
              detalle: starterItem.detalle,
              categoria: starterItem.categoria,
              cantidad: 1,
              costo: starterItem.costo,
              ganancia: starterItem.ganancia,
              tipo_doc_costo: starterItem.tipo_doc_costo,
              approved: false,
            },
          ]
        : [],
      transactions: [],
    };
    setProjects((prev) => [newProj, ...prev]);
    setNewProjName('');
    setNewProjClient('');
    setNewProjLocation('');
    setShowCreateProject(false);
    setActiveSection('projects');
    setSelectedProjectId(newProj.id);
  };

  const handleDeleteProject = (id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    if (selectedProjectId === id) setSelectedProjectId(null);
  };

  const handleAddRate = (item: Omit<DemoCatalogItem, 'id' | 'isCustom'>) => {
    if (customRatesCount >= MAX_CUSTOM_RATES) return;
    setCatalog((prev) => [
      { ...item, id: `rate-${Date.now()}`, isCustom: true },
      ...prev,
    ]);
  };

  const handleDeleteRate = (id: string) => {
    setCatalog((prev) => prev.filter((c) => c.id !== id));
  };

  const dashboardMetrics = useMemo(() => {
    let planning = 0;
    let approved = 0;
    let completed = 0;
    let completedRevenue = 0;
    let totalIvaNeto = 0;

    projects.forEach((p) => {
      if (p.status === 'planning') planning++;
      else if (p.status === 'approved') approved++;
      else if (p.status === 'completed') completed++;

      const fin = computeDemoProjectFinancials(p, brand.retentionPolicy);
      if (p.status === 'completed') {
        completedRevenue += fin.ventaTotal;
      }
      totalIvaNeto += fin.ivaNetoPagar;
    });

    return { planning, approved, completed, completedRevenue, totalIvaNeto };
  }, [projects, brand.retentionPolicy]);

  const activeProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId) || null,
    [projects, selectedProjectId]
  );

  const filteredProjects = useMemo(() => {
    if (projectFilter === 'all') return projects;
    return projects.filter((p) => p.status === projectFilter);
  }, [projects, projectFilter]);

  return (
    <div data-theme-preset={brand.themePreset} className="min-h-screen bg-background flex">
      <DemoSidebar
        activeSection={activeSection}
        onSelectSection={(sec) => {
          setActiveSection(sec);
          setSelectedProjectId(null);
        }}
        companyName={brand.companyName}
        terms={blueprint.terminology}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Top Sandbox Command Bar */}
        <header className="sticky top-0 z-40 border-b border-border/75 bg-white/85 backdrop-blur-2xl px-4 sm:px-6 py-2.5">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setMobileSidebarOpen(true)}
                className="lg:hidden h-8 w-8 shrink-0"
                aria-label="Abrir menú lateral"
              >
                <Menu className="h-4 w-4" />
              </Button>

              <Badge className="bg-[#0D1829] text-[#38BDF8] border-0 font-mono text-[10px] tracking-wider gap-1 shrink-0">
                <FlaskConical className="h-3 w-3 text-[#2DD4BF]" />
                DEMO ENTERPRISE
              </Badge>

              <div className="w-48 sm:w-56">
                <Select
                  value={industryType}
                  onChange={(e) => handleSwitchIndustry(e.target.value as IndustryType)}
                  options={INDUSTRY_LIST.map((ind) => ({
                    value: ind.id,
                    label: `Rubro: ${ind.shortName}`,
                  }))}
                  className="h-8 text-xs font-medium bg-white"
                />
              </div>

              <span className="hidden xl:inline font-mono text-[11px] text-muted-foreground">
                Caché local · Propios: {customProjectsCount}/{MAX_CUSTOM_PROJECTS} proy. · {customRatesCount}/{MAX_CUSTOM_RATES} tarifas
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleResetCache}
                className="h-8 text-xs gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Resetear</span>
              </Button>
              <Link href="/welcome#planes">
                <Button
                  size="sm"
                  className="h-8 text-xs bg-[#1261E0] hover:bg-[#0F4FB8] text-white font-semibold gap-1.5 tactile-press"
                >
                  Elegir Plan Oficial
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6 pb-24">
          {notice && (
            <div className="p-3.5 rounded-2xl bg-[#1261E0]/[0.07] border border-[#1261E0]/25 text-xs text-foreground flex items-center justify-between gap-3">
              <span>{notice}</span>
              <button
                type="button"
                onClick={() => setNotice(null)}
                className="text-muted-foreground hover:text-foreground font-mono text-[11px]"
              >
                Cerrar
              </button>
            </div>
          )}

          {/* VISTA: DETALLE PROFUNDO DE PROYECTO (4 TABS ENTERPRISE) */}
          {activeSection === 'projects' && activeProject ? (
            <DemoProjectDetail
              project={activeProject}
              brand={brand}
              catalog={catalog}
              categories={blueprint.categories}
              terms={blueprint.terminology}
              aiSuggestions={seedHelpers.aiSuggestions}
              ocrSamples={seedHelpers.ocrSamples}
              onBack={() => setSelectedProjectId(null)}
              onUpdateProject={(updated) =>
                setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
              }
            />
          ) : activeSection === 'catalog' ? (
            <DemoCatalogView
              catalog={catalog}
              catalogLabel={blueprint.terminology.catalogLabel}
              categories={blueprint.categories}
              retentionPolicy={brand.retentionPolicy}
              customCount={customRatesCount}
              maxCustomRates={MAX_CUSTOM_RATES}
              onAddRate={handleAddRate}
              onDeleteRate={handleDeleteRate}
            />
          ) : activeSection === 'analytics' ? (
            <DemoAnalyticsView
              projects={projects}
              retentionPolicy={brand.retentionPolicy}
              analyticsLabel={blueprint.terminology.analyticsLabel}
            />
          ) : activeSection === 'branding' ? (
            <DemoBrandingView
              brand={brand}
              onChangeBrand={(patch) => setBrand((prev) => ({ ...prev, ...patch }))}
            />
          ) : activeSection === 'projects' ? (
            /* VISTA: LISTADO DE PROYECTOS */
            <div className="space-y-6 animate-reveal-up">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
                    {blueprint.terminology.projectPlural}
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    Haz clic en cualquier {blueprint.terminology.projectSingular.toLowerCase()} para abrir su presupuesto, consolidación, caja, Suite IA/OCR y PDF.
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <Badge variant="outline" className="font-mono text-xs">
                    Propios: {customProjectsCount}/{MAX_CUSTOM_PROJECTS}
                  </Badge>
                  <Button
                    type="button"
                    disabled={customProjectsCount >= MAX_CUSTOM_PROJECTS}
                    onClick={() => setShowCreateProject((v) => !v)}
                    className="gap-1.5 tactile-press"
                  >
                    <Plus className="h-4 w-4" />
                    {blueprint.terminology.newProjectCta}
                  </Button>
                </div>
              </div>

              {showCreateProject && (
                <Card className="glass-card border-[#1261E0]/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{blueprint.terminology.newProjectCta} (En Caché Local)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleCreateProject} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                      <div className="space-y-1">
                        <Label className="text-xs">Nombre *</Label>
                        <Input
                          value={newProjName}
                          onChange={(e) => setNewProjName(e.target.value)}
                          placeholder={`Ej. ${blueprint.terminology.projectSingular} Corporativo`}
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">{blueprint.terminology.clientLabel}</Label>
                        <Input
                          value={newProjClient}
                          onChange={(e) => setNewProjClient(e.target.value)}
                          placeholder="Empresa mandante"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">{blueprint.terminology.locationLabel}</Label>
                        <Input
                          value={newProjLocation}
                          onChange={(e) => setNewProjLocation(e.target.value)}
                          placeholder="Ciudad o recinto"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" className="flex-1">
                          Crear y Abrir
                        </Button>
                        <Button type="button" variant="outline" onClick={() => setShowCreateProject(false)}>
                          Cancelar
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { id: 'all', label: `Todos (${projects.length})` },
                    { id: 'planning', label: 'Planificación' },
                    { id: 'approved', label: 'Aprobados' },
                    { id: 'completed', label: 'Completados' },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setProjectFilter(f.id)}
                    className={cn(
                      'px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors',
                      projectFilter === f.id
                        ? 'bg-[#0D1829] text-white border-[#0D1829]'
                        : 'bg-white/80 text-muted-foreground border-border hover:text-foreground'
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filteredProjects.map((proj) => {
                  const fin = computeDemoProjectFinancials(proj, brand.retentionPolicy);
                  return (
                    <SpotlightCard
                      key={proj.id}
                      onClick={() => setSelectedProjectId(proj.id)}
                      className="p-5 cursor-pointer flex flex-col justify-between gap-4"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge
                              className={cn(
                                'text-[10px] border-0',
                                proj.status === 'completed'
                                  ? 'bg-[#0D8A72]/15 text-[#0D8A72]'
                                  : proj.status === 'approved'
                                  ? 'bg-[#1261E0]/12 text-[#0F4FB8]'
                                  : 'bg-slate-200 text-slate-800'
                              )}
                            >
                              {proj.status === 'completed'
                                ? 'Completado'
                                : proj.status === 'approved'
                                ? 'Aprobado'
                                : 'Planificación'}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] font-mono">
                              {proj.scenarioBadge}
                            </Badge>
                          </div>
                          {proj.isCustom && (
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteProject(proj.id);
                              }}
                              className="h-7 w-7 text-rose-600 hover:bg-rose-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>

                        <h3 className="text-lg font-semibold tracking-tight">{proj.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {proj.client_company} · {proj.location}
                        </p>
                        <p className="text-xs text-muted-foreground/90 leading-relaxed">
                          {proj.scenarioDesc}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-border/60 grid grid-cols-3 gap-2 text-xs font-mono tabular-nums">
                        <div>
                          <span className="text-[10px] font-sans text-muted-foreground block">Venta c/ IVA</span>
                          <span className="font-bold text-foreground">{formatCLP(fin.ventaTotal)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-sans text-muted-foreground block">IVA F29</span>
                          <span className="font-semibold text-[#1261E0]">{formatCLP(fin.ivaNetoPagar)}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-sans text-muted-foreground block">Margen</span>
                          <span className="font-bold text-[#0D8A72]">{formatPercentage(fin.margenPct)}</span>
                        </div>
                      </div>
                    </SpotlightCard>
                  );
                })}
              </div>
            </div>
          ) : (
            /* VISTA PRINCIPAL: DASHBOARD ENTERPRISE COMPLETO */
            <div className="space-y-6 animate-reveal-up">
              {/* Banner Ejecutivo Enterprise */}
              <div className="glass-luxury hairline-shimmer text-slate-100 rounded-3xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="bg-[#2DD4BF] text-[#080E1A] border-0 font-mono text-[10px] tracking-wider uppercase font-bold">
                      Plan Corporativo &amp; Escala (Desbloqueado)
                    </Badge>
                    <Badge variant="outline" className="border-sky-400/35 text-[#38BDF8] bg-[#38BDF8]/10 font-mono text-[10px]">
                      <Sparkles className="h-3 w-3 mr-1" />
                      IA + OCR + F29 + Marca Blanca Activos
                    </Badge>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
                    Bienvenido a {brand.companyName}
                  </h1>
                  <p className="text-slate-300 text-xs sm:text-sm max-w-2xl">
                    Estás explorando el ERP completo adaptado a <strong>{blueprint.name}</strong>. Todo funciona localmente en tu navegador para que pruebes cotizaciones, consolidación, flujo de caja e IVA F29 sin límites visuales.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2.5 shrink-0">
                  <Button
                    type="button"
                    onClick={() => {
                      setActiveSection('projects');
                      setShowCreateProject(true);
                    }}
                    className="bg-[#2DD4BF] hover:bg-[#5EEAD4] text-[#080E1A] font-semibold gap-1.5 tactile-press"
                  >
                    <Plus className="h-4 w-4" />
                    {blueprint.terminology.newProjectCta}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveSection('analytics')}
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20 gap-1.5"
                  >
                    <BarChart3 className="h-4 w-4 text-[#38BDF8]" />
                    Ver Analítica F29
                  </Button>
                </div>
              </div>

              {/* 4 KPIs Principales + Proyección IVA F29 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <SpotlightCard className="p-5">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>En Planificación</span>
                    <Clock className="h-4 w-4 text-[#1261E0]" />
                  </div>
                  <div className="text-2xl font-semibold font-mono mt-2">
                    <AnimatedNumber value={dashboardMetrics.planning} duration={450} />
                  </div>
                </SpotlightCard>

                <SpotlightCard className="p-5">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Aprobados</span>
                    <CheckCircle2 className="h-4 w-4 text-[#0D8A72]" />
                  </div>
                  <div className="text-2xl font-semibold font-mono mt-2">
                    <AnimatedNumber value={dashboardMetrics.approved} duration={450} />
                  </div>
                </SpotlightCard>

                <SpotlightCard className="p-5">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Completados</span>
                    <Calendar className="h-4 w-4 text-[#0284C7]" />
                  </div>
                  <div className="text-2xl font-semibold font-mono mt-2">
                    <AnimatedNumber value={dashboardMetrics.completed} duration={450} />
                  </div>
                </SpotlightCard>

                <SpotlightCard className="p-5">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Ingresos Cerrados</span>
                    <DollarSign className="h-4 w-4 text-[#0D8A72]" />
                  </div>
                  <div className="text-2xl font-semibold font-mono mt-2">
                    <AnimatedNumber value={dashboardMetrics.completedRevenue} format="clp" duration={550} />
                  </div>
                </SpotlightCard>

                <SpotlightCard className="p-5 border-[#1261E0]/30 bg-[#1261E0]/[0.04]">
                  <div className="flex items-center justify-between text-xs text-[#0F4FB8] font-medium">
                    <span>IVA F29 Acumulado</span>
                    <Receipt className="h-4 w-4 text-[#1261E0]" />
                  </div>
                  <div className="text-2xl font-semibold font-mono text-[#1261E0] mt-2">
                    <AnimatedNumber value={dashboardMetrics.totalIvaNeto} format="clp" duration={550} />
                  </div>
                </SpotlightCard>
              </div>

              {/* Guía de Exploración de los 4 Escenarios Profundos */}
              <Card className="glass-card border-[#1261E0]/25">
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FlaskConical className="h-5 w-5 text-[#1261E0]" />
                        Guía de Exploración Enterprise ({blueprint.shortName})
                      </CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        Haz clic en cualquier escenario para abrir el módulo real interactivo.
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="bg-[#1261E0]/10 text-[#0F4FB8] border-[#1261E0]/25 font-mono text-[11px]">
                      4 Escenarios Profundos + Analítica
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 text-xs">
                  {projects.slice(0, 3).map((proj) => (
                    <button
                      key={proj.id}
                      type="button"
                      onClick={() => {
                        setActiveSection('projects');
                        setSelectedProjectId(proj.id);
                      }}
                      className="group text-left rounded-2xl border border-border/80 bg-white/90 p-4 hover:border-[#1261E0]/45 hover:shadow-md transition-all flex flex-col justify-between gap-3 tactile-press"
                    >
                      <div className="space-y-1.5">
                        <Badge className="bg-[#1261E0]/10 text-[#0F4FB8] border-0 font-mono text-[10px]">
                          {proj.scenarioBadge}
                        </Badge>
                        <h3 className="font-semibold text-sm text-foreground group-hover:text-[#1261E0] transition-colors">
                          {proj.name}
                        </h3>
                        <p className="text-muted-foreground leading-relaxed">{proj.scenarioDesc}</p>
                      </div>
                      <span className="inline-flex items-center gap-1 font-semibold text-[#1261E0]">
                        Abrir {blueprint.terminology.projectSingular.toLowerCase()} <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => setActiveSection('analytics')}
                    className="group text-left rounded-2xl border border-border/80 bg-white/90 p-4 hover:border-[#0D8A72]/45 hover:shadow-md transition-all flex flex-col justify-between gap-3 tactile-press"
                  >
                    <div className="space-y-1.5">
                      <Badge className="bg-[#0D8A72]/12 text-[#0D8A72] border-0 font-mono text-[10px]">
                        P&amp;L + F29 en Vivo
                      </Badge>
                      <h3 className="font-semibold text-sm text-foreground group-hover:text-[#0D8A72] transition-colors">
                        {blueprint.terminology.analyticsLabel} &amp; Excel
                      </h3>
                      <p className="text-muted-foreground leading-relaxed">
                        Inspecciona gráficos animados de ventas vs. costos, distribución de gastos e IVA F29 consolidado.
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 font-semibold text-[#0D8A72]">
                      Abrir analítica <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </button>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>

      {/* Aviso No Invasivo de Caché Local */}
      {mounted && !cacheAccepted && (
        <div
          role="dialog"
          aria-label="Aviso de almacenamiento en caché local"
          className="fixed bottom-4 left-4 right-4 z-50 max-w-3xl mx-auto rounded-2xl glass-luxury text-white p-4 sm:p-5 shadow-2xl border border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-modal-in"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-[#1261E0]/20 border border-sky-400/30 text-[#38BDF8] shrink-0">
              <HardDrive className="h-4 w-4" />
            </div>
            <div className="space-y-0.5 text-xs">
              <p className="font-semibold text-white flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5 text-[#38BDF8]" />
                Modo Evaluación Enterprise: Caché Local Exclusivo
              </p>
              <p className="text-slate-300 leading-relaxed">
                Para proteger tu privacidad, ningún dato que ingreses en esta sesión de prueba se guarda en nuestros servidores ni en Supabase; todo permanece temporalmente en el caché de tu navegador.
              </p>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={handleAcceptCache}
            className="bg-[#2DD4BF] hover:bg-[#5EEAD4] text-[#080E1A] font-bold shrink-0 tactile-press"
          >
            Entendido, continuar
          </Button>
        </div>
      )}
    </div>
  );
}
