'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Database,
  FileText,
  FlaskConical,
  HardDrive,
  Lock,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { INDUSTRY_BLUEPRINTS, INDUSTRY_LIST, THEME_PRESETS } from '@/lib/industries';
import { KairosLogo } from '@/components/ui/kairos-logo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { calculateFinancials, cn, formatCLP, formatPercentage } from '@/lib/utils';
import type { HonorariosRetentionPolicy, IndustryType, SubscriptionTier } from '@/types/database';

interface LocalDemoProject {
  id: string;
  name: string;
  client: string;
  costo: number;
  ganancia: number;
  docType: 'factura' | 'boleta';
  status: 'planning' | 'approved' | 'completed';
}

const STORAGE_KEY = 'kairos_local_sandbox_v1';
const CONSENT_KEY = 'kairos_demo_cache_consent';
const MAX_LOCAL_PROJECTS = 3;

const TIER_SIM_INFO: Record<
  SubscriptionTier,
  {
    name: string;
    hasAi: boolean;
    hasPdf: boolean;
    hasAnalytics: boolean;
    shellClass: string;
    badgeClass: string;
  }
> = {
  free: {
    name: 'Semilla (Gratis)',
    hasAi: false,
    hasPdf: false,
    hasAnalytics: false,
    shellClass: 'bg-white border-slate-200 text-slate-900',
    badgeClass: 'bg-slate-200 text-slate-800',
  },
  essential: {
    name: 'Operación Esencial',
    hasAi: false,
    hasPdf: true,
    hasAnalytics: false,
    shellClass: 'bg-blue-50/70 border-blue-200 text-blue-950',
    badgeClass: 'bg-blue-600 text-white',
  },
  growth: {
    name: 'Crecimiento Inteligente IA',
    hasAi: true,
    hasPdf: true,
    hasAnalytics: true,
    shellClass: 'glass-luxury text-white border-amber-400/30',
    badgeClass: 'bg-amber-400 text-slate-950',
  },
  scale: {
    name: 'Corporativo & Escala',
    hasAi: true,
    hasPdf: true,
    hasAnalytics: true,
    shellClass: 'bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white border-emerald-400/30',
    badgeClass: 'bg-emerald-400 text-slate-950',
  },
  custom: {
    name: 'Paga lo que usas',
    hasAi: true,
    hasPdf: true,
    hasAnalytics: false,
    shellClass: 'bg-slate-900 text-white border-slate-700',
    badgeClass: 'bg-white text-slate-950',
  },
};

export default function LocalDemoSandboxPage() {
  const [mounted, setMounted] = useState(false);
  const [cacheAccepted, setCacheAccepted] = useState(true);
  const [industryType, setIndustryType] = useState<IndustryType>('eventos_banqueteria');
  const [simulatedTier, setSimulatedTier] = useState<SubscriptionTier>('growth');
  const [retentionPolicy, setRetentionPolicy] = useState<HonorariosRetentionPolicy>('contractor');
  const [projects, setProjects] = useState<LocalDemoProject[]>([]);

  // Form para crear proyecto local
  const [newName, setNewName] = useState('');
  const [newClient, setNewClient] = useState('');
  const [newCosto, setNewCosto] = useState('450000');
  const [newGanancia, setNewGanancia] = useState('180000');
  const [newDocType, setNewDocType] = useState<'factura' | 'boleta'>('factura');
  const [simNotice, setSimNotice] = useState<string | null>(null);

  const blueprint = INDUSTRY_BLUEPRINTS[industryType];
  const themeDef = THEME_PRESETS[blueprint.recommendedTheme];
  const tierMeta = TIER_SIM_INFO[simulatedTier];

  // Cargar desde localStorage (NUNCA Supabase)
  useEffect(() => {
    setMounted(true);
    try {
      const consent = localStorage.getItem(CONSENT_KEY);
      setCacheAccepted(consent === 'accepted');

      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.industryType && parsed.industryType in INDUSTRY_BLUEPRINTS) {
          setIndustryType(parsed.industryType);
        }
        if (parsed.simulatedTier) setSimulatedTier(parsed.simulatedTier);
        if (Array.isArray(parsed.projects)) {
          setProjects(parsed.projects.slice(0, MAX_LOCAL_PROJECTS));
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
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ industryType, simulatedTier, projects })
      );
    } catch {
      // Ignorar
    }
  }, [mounted, industryType, simulatedTier, projects]);

  const handleAcceptCache = () => {
    try {
      localStorage.setItem(CONSENT_KEY, 'accepted');
    } catch {
      // Ignorar
    }
    setCacheAccepted(true);
  };

  const handleResetCache = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignorar
    }
    setProjects([]);
    setSimNotice('Caché local limpiado. Tu navegador volvió al estado inicial de evaluación.');
  };

  const handleAddProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (projects.length >= MAX_LOCAL_PROJECTS) {
      setSimNotice(
        `Límite de evaluación alcanzado (${MAX_LOCAL_PROJECTS} registros en caché). Para operar proyectos ilimitados y respaldo en la nube, elige un plan oficial.`
      );
      return;
    }
    if (!newName.trim()) return;

    const item: LocalDemoProject = {
      id: `local-${Date.now()}`,
      name: newName.trim(),
      client: newClient.trim() || 'Cliente de Prueba',
      costo: Math.max(0, Number(newCosto) || 0),
      ganancia: Math.max(0, Number(newGanancia) || 0),
      docType: newDocType,
      status: 'planning',
    };
    setProjects((prev) => [item, ...prev]);
    setNewName('');
    setNewClient('');
    setSimNotice(null);
  };

  const sampleProjects: LocalDemoProject[] = useMemo(() => {
    return blueprint.starterCatalog.slice(0, 2).map((tpl, idx) => ({
      id: `sample-${blueprint.id}-${idx}`,
      name: tpl.servicio,
      client: idx === 0 ? 'Cliente Corporativo Demo' : 'Mandante de Referencia',
      costo: tpl.costo,
      ganancia: tpl.ganancia,
      docType: tpl.tipo_doc_costo,
      status: idx === 0 ? 'completed' : 'approved',
    }));
  }, [blueprint]);

  const allDisplayedProjects = [...projects, ...sampleProjects];

  return (
    <div
      data-theme-preset={blueprint.recommendedTheme}
      className="min-h-screen bg-background pb-24"
    >
      {/* Top Bar Sandbox */}
      <header className="sticky top-0 z-40 border-b border-border/70 bg-slate-950 text-white px-4 sm:px-8 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <KairosLogo size="sm" subtitle="Evaluación en Caché" />
            <Badge className="bg-amber-400 text-slate-950 border-0 font-bold gap-1">
              <FlaskConical className="h-3 w-3" />
              MODO DEMO LOCAL
            </Badge>
            <span className="hidden md:inline text-xs text-slate-400">
              Cero guardado en servidor · Solo caché de tu navegador
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleResetCache}
              className="h-8 text-xs bg-transparent border-slate-700 text-slate-200 hover:bg-slate-800 gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Resetear Caché
            </Button>
            <Link href="/welcome#planes">
              <Button
                size="sm"
                className="h-8 text-xs bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold gap-1.5 tactile-press"
              >
                Elegir Plan Oficial
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8">
        {/* Selector de Rubro + Simulador de Interfaz según Plan */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          <Card className="lg:col-span-7 glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                1. Prueba KAIROS adaptado a tu Rubro
              </CardTitle>
              <CardDescription className="text-xs">
                Cambia de industria para ver cómo el ERP transforma su lenguaje, catálogo CLP y márgenes recomendados.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Rubro de Negocio</Label>
                  <Select
                    value={industryType}
                    onChange={(e) => setIndustryType(e.target.value as IndustryType)}
                    options={INDUSTRY_LIST.map((ind) => ({
                      value: ind.id,
                      label: ind.shortName,
                    }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Retención Boleta Honorarios (15,25%)</Label>
                  <Select
                    value={retentionPolicy}
                    onChange={(e) =>
                      setRetentionPolicy(e.target.value as HonorariosRetentionPolicy)
                    }
                    options={[
                      { value: 'contractor', label: 'Asume Contratado (100%)' },
                      { value: 'company', label: 'Asume Empresa (100%)' },
                      { value: 'split_50_50', label: 'Reparto 50 / 50' },
                    ]}
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div>
                  <span className="text-slate-500">Módulo activo:</span>{' '}
                  <strong className="text-slate-900">{blueprint.terminology.projectPlural}</strong>
                  <span className="mx-2 text-slate-300">|</span>
                  <span className="text-slate-500">Catálogo:</span>{' '}
                  <strong className="text-slate-900">{blueprint.terminology.catalogLabel}</strong>
                </div>
                <Badge variant="outline" className="font-mono text-[11px]">
                  Meta: {blueprint.targetMarginPct}% · {themeDef.name}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className={cn('lg:col-span-5 transition-all', tierMeta.shellClass)}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">2. Simula el Plan Contratado</CardTitle>
                <Badge className={cn('border-0 text-[10px] font-bold', tierMeta.badgeClass)}>
                  {tierMeta.name}
                </Badge>
              </div>
              <CardDescription
                className={cn(
                  'text-xs',
                  simulatedTier === 'growth' || simulatedTier === 'scale' || simulatedTier === 'custom'
                    ? 'text-slate-300'
                    : 'text-slate-600'
                )}
              >
                Observa cómo cambia la interfaz y qué herramientas se habilitan según tu suscripción.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {(['free', 'essential', 'growth', 'scale', 'custom'] as SubscriptionTier[]).map(
                  (t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSimulatedTier(t)}
                      className={cn(
                        'px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all tactile-press',
                        simulatedTier === t
                          ? 'bg-amber-400 text-slate-950 border-amber-400'
                          : 'bg-black/10 border-current/20 hover:bg-black/20'
                      )}
                    >
                      {TIER_SIM_INFO[t].name}
                    </button>
                  )
                )}
              </div>
              <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
                <span className="inline-flex items-center gap-1">
                  {tierMeta.hasPdf ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Lock className="h-3.5 w-3.5 opacity-60" />}
                  Cotizador PDF
                </span>
                <span className="inline-flex items-center gap-1">
                  {tierMeta.hasAi ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Lock className="h-3.5 w-3.5 opacity-60" />}
                  Suite IA + OCR
                </span>
                <span className="inline-flex items-center gap-1">
                  {tierMeta.hasAnalytics ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Lock className="h-3.5 w-3.5 opacity-60" />}
                  Analítica P&L
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {simNotice && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-950 flex flex-wrap items-center justify-between gap-3">
            <span>{simNotice}</span>
            <Link href="/welcome#planes">
              <Button size="sm" className="h-7 text-xs bg-slate-900 text-white">
                Ver Planes Oficiales
              </Button>
            </Link>
          </div>
        )}

        {/* Simulador Operativo de Proyectos + Cálculo Tributario SII */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <Card className="lg:col-span-4 glass-card">
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span>{blueprint.terminology.newProjectCta} (Caché)</span>
                <Badge variant="outline" className="font-mono text-[10px]">
                  {projects.length}/{MAX_LOCAL_PROJECTS}
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Se guarda únicamente en tu navegador.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddProject} className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Nombre de {blueprint.terminology.projectSingular}</Label>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder={`Ej. ${blueprint.terminology.projectSingular} Demo`}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{blueprint.terminology.clientLabel}</Label>
                  <Input
                    value={newClient}
                    onChange={(e) => setNewClient(e.target.value)}
                    placeholder="Empresa o cliente"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <Label className="text-xs">Costo Base CLP</Label>
                    <Input
                      type="number"
                      min={0}
                      value={newCosto}
                      onChange={(e) => setNewCosto(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Ganancia CLP</Label>
                    <Input
                      type="number"
                      min={0}
                      value={newGanancia}
                      onChange={(e) => setNewGanancia(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Documento de Costo SII</Label>
                  <Select
                    value={newDocType}
                    onChange={(e) => setNewDocType(e.target.value as 'factura' | 'boleta')}
                    options={[
                      { value: 'factura', label: 'Factura (IVA Crédito)' },
                      { value: 'boleta', label: 'Boleta Honorarios (15,25%)' },
                    ]}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={projects.length >= MAX_LOCAL_PROJECTS}
                  className="w-full gap-2 tactile-press"
                >
                  <Plus className="h-4 w-4" />
                  Simular en Caché Local
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="lg:col-span-8 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xl font-bold tracking-tight">
                {blueprint.terminology.projectPlural} en Evaluación
              </h2>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!tierMeta.hasPdf}
                  onClick={() =>
                    setSimNotice(
                      'Simulación PDF: En la versión oficial generas el documento comercial con tu logo, firma y datos bancarios.'
                    )
                  }
                  className="gap-1.5 text-xs"
                >
                  {tierMeta.hasPdf ? <FileText className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                  Probar PDF
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!tierMeta.hasAi}
                  onClick={() =>
                    setSimNotice(
                      'Simulación Suite IA: En la versión oficial Gemini analiza tus PDF/Excel y calibra márgenes en segundos.'
                    )
                  }
                  className="gap-1.5 text-xs"
                >
                  {tierMeta.hasAi ? <Sparkles className="h-3.5 w-3.5 text-amber-600" /> : <Lock className="h-3.5 w-3.5" />}
                  Probar Asistente IA
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allDisplayedProjects.map((proj) => {
                const isLocal = proj.id.startsWith('local-');
                const effectiveCosto =
                  proj.docType === 'boleta'
                    ? retentionPolicy === 'company'
                      ? Math.round(proj.costo / (1 - 0.1525))
                      : retentionPolicy === 'split_50_50'
                      ? Math.round(proj.costo * (1 + 0.1525 / 2))
                      : proj.costo
                    : proj.costo;
                const fin = calculateFinancials(effectiveCosto, proj.ganancia, proj.docType, true);
                const retencion1525 =
                  proj.docType === 'boleta' ? Math.round(effectiveCosto * 0.1525) : 0;
                const liquidoContratado =
                  proj.docType === 'boleta' ? effectiveCosto - retencion1525 : effectiveCosto;

                return (
                  <Card key={proj.id} className="glass-card">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Badge variant="outline" className="text-[10px] mb-1.5">
                            {isLocal ? 'Creado en Caché' : `Ejemplo ${blueprint.shortName}`}
                          </Badge>
                          <CardTitle className="text-base leading-snug">{proj.name}</CardTitle>
                          <CardDescription className="text-xs">{proj.client}</CardDescription>
                        </div>
                        {isLocal && (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() =>
                              setProjects((prev) => prev.filter((p) => p.id !== proj.id))
                            }
                            className="h-7 w-7 text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 text-xs pt-2 border-t border-border/50">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Costo Bruto ({proj.docType}):</span>
                        <span className="font-mono font-semibold tabular-nums">
                          {formatCLP(effectiveCosto)}
                        </span>
                      </div>
                      {proj.docType === 'boleta' && (
                        <div className="flex flex-col gap-0.5 text-[11px] text-amber-800 bg-amber-50 px-2 py-1.5 rounded">
                          <div className="flex justify-between">
                            <span>Retención 15,25% ({retentionPolicy === 'company' ? 'Empresa' : retentionPolicy === 'split_50_50' ? '50/50' : 'Contratado'}):</span>
                            <span className="font-mono font-semibold">{formatCLP(retencion1525)}</span>
                          </div>
                          <div className="flex justify-between text-emerald-800">
                            <span>Líquido Contratado:</span>
                            <span className="font-mono font-semibold">{formatCLP(liquidoContratado)}</span>
                          </div>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Venta Total c/ IVA:</span>
                        <span className="font-mono font-bold text-slate-950 tabular-nums">
                          {formatCLP(fin.valorTotal)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Margen Neto:</span>
                        <span className="font-mono font-bold text-emerald-700 tabular-nums">
                          {formatPercentage(fin.margen)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* Aviso No Invasivo de Caché Local (Estilo Consentimiento Estándar) */}
      {mounted && !cacheAccepted && (
        <div
          role="dialog"
          aria-label="Aviso de almacenamiento en caché local"
          className="fixed bottom-4 left-4 right-4 z-50 max-w-3xl mx-auto rounded-2xl glass-luxury text-white p-4 sm:p-5 shadow-2xl border border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-400/15 border border-amber-400/30 text-amber-300 shrink-0">
              <HardDrive className="h-4 w-4" />
            </div>
            <div className="space-y-0.5 text-xs">
              <p className="font-semibold text-white flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5 text-amber-300" />
                Modo Evaluación: Almacenamiento Exclusivo en Caché Local
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
            className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold shrink-0 tactile-press"
          >
            Entendido, continuar
          </Button>
        </div>
      )}
    </div>
  );
}
