'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Palette,
  Search,
  Sparkles,
  Building2,
  Loader2,
  Sliders,
} from 'lucide-react';
import {
  INDUSTRY_BLUEPRINTS,
  INDUSTRY_LIST,
  THEME_PRESETS,
} from '@/lib/industries';
import { useWorkspaceConfig } from '@/hooks/use-workspace-config';
import { PlansMatrix } from '@/components/billing/plans-matrix';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { FiguraLogo } from '@/components/ui/figura-logo';
import { cn, formatCLP } from '@/lib/utils';
import type {
  IndustryType,
  ModuleKey,
  OperationMode,
  SubscriptionTier,
  ThemePreset,
} from '@/types/database';

export default function OnboardingStudioPage() {
  const { organization, plans, addons, khipuReady, isSuperAdmin } = useWorkspaceConfig();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [searchIndustry, setSearchIndustry] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState<IndustryType>('eventos_banqueteria');
  const [selectedTheme, setSelectedTheme] = useState<ThemePreset>('obsidian_gold');
  const [operationMode, setOperationMode] = useState<OperationMode>('project');
  const [companyName, setCompanyName] = useState(organization?.name || '');
  const [location, setLocation] = useState(organization?.location || '');
  const initializedOrgRef = useRef(false);

  useEffect(() => {
    if (organization && !initializedOrgRef.current) {
      initializedOrgRef.current = true;
      if (organization.name) setCompanyName(organization.name);
      if (organization.location) setLocation(organization.location);
    }
  }, [organization]);
  const [seedCatalog, setSeedCatalog] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [preselectedPlan, setPreselectedPlan] = useState<SubscriptionTier | undefined>(undefined);
  const [preselectedModules, setPreselectedModules] = useState<ModuleKey[]>([]);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('preview') === '1' && isSuperAdmin) {
        setIsPreviewMode(true);
      }
      const raw = sessionStorage.getItem('figura_preselected_onboarding');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.industry && parsed.industry in INDUSTRY_BLUEPRINTS) {
          handleSelectIndustry(parsed.industry as IndustryType);
        }
        if (parsed.plan) {
          setPreselectedPlan(parsed.plan as SubscriptionTier);
        }
        if (Array.isArray(parsed.modules)) {
          setPreselectedModules(parsed.modules as ModuleKey[]);
        }
      }
    } catch {
      // Ignorar
    }
  }, [isSuperAdmin]);

  const blueprint = INDUSTRY_BLUEPRINTS[selectedIndustry];
  const themeDef = THEME_PRESETS[selectedTheme];

  const filteredIndustries = useMemo(() => {
    const q = searchIndustry.trim().toLowerCase();
    if (!q) return INDUSTRY_LIST;
    return INDUSTRY_LIST.filter(
      (ind) =>
        ind.name.toLowerCase().includes(q) ||
        ind.tagline.toLowerCase().includes(q) ||
        ind.categories.some((c) => c.toLowerCase().includes(q))
    );
  }, [searchIndustry]);

  const handleSelectIndustry = (indId: IndustryType) => {
    const bp = INDUSTRY_BLUEPRINTS[indId];
    setSelectedIndustry(indId);
    // Aplicar sugerencias inteligentes automáticamente según el rubro
    setSelectedTheme(bp.recommendedTheme);
    setOperationMode(bp.recommendedOperationMode);
  };

  const persistPersonalization = async () => {
    if (isPreviewMode) {
      return true;
    }
    setSavingConfig(true);
    setError(null);
    try {
      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          industryType: selectedIndustry,
          themePreset: selectedTheme,
          operationMode,
          companyName: companyName.trim() || organization?.name,
          location: location.trim() || undefined,
          seedIndustryCatalog: seedCatalog,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo guardar tu configuración.');
      }
      return true;
    } catch (err: any) {
      setError(err.message || 'Error guardando configuración');
      return false;
    } finally {
      setSavingConfig(false);
    }
  };

  const handleNextToPlans = async () => {
    const ok = await persistPersonalization();
    if (ok) {
      setStep(3);
    }
  };

  const handleCheckout = async (
    tier: SubscriptionTier,
    selectedModules: ModuleKey[],
    simulateSuperAdminPayment = false
  ) => {
    if (isPreviewMode) {
      window.location.href = '/governance';
      return;
    }
    setCheckoutLoading(tier);
    setError(null);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, selectedModules, simulateSuperAdminPayment }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'No se pudo procesar la suscripción.');
      }

      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
        return;
      }

      window.location.href = '/';
    } catch (err: any) {
      setError(err.message || 'Error al activar el plan');
    } finally {
      setCheckoutLoading(null);
    }
  };

  return (
    <div
      data-theme-preset={selectedTheme}
      className="min-h-screen bg-background px-4 py-8 sm:px-8 lg:px-12"
    >
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Top Bar */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border/70 pb-5">
          <div className="flex items-center gap-4">
            <FiguraLogo size="md" subtitle="Estudio de Personalización" />
          </div>

          <div className="flex items-center gap-2">
            {[
              { num: 1, label: '1. Tu Rubro' },
              { num: 2, label: '2. Personalización' },
              { num: 3, label: '3. Plan Khipu' },
            ].map((s) => (
              <div
                key={s.num}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
                  step === s.num
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : step > s.num
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-white/70 text-slate-500 border-slate-200'
                )}
              >
                {step > s.num ? '✓ ' : ''}
                {s.label}
              </div>
            ))}
          </div>
        </header>

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800 font-medium">
            {error}
          </div>
        )}

        {/* PASO 1 y 2: Grid con Live Preview */}
        {step !== 3 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7 space-y-6">
              {step === 1 && (
                <>
                  <div className="space-y-2">
                    <Badge className="bg-amber-500/15 text-amber-800 border border-amber-500/30">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Arquitectura Adaptativa por Industria
                    </Badge>
                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-950">
                      ¿Cuál es el giro principal de tu negocio?
                    </h1>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      El ERP reconfigurará su vocabulario, categorías de costos en CLP, márgenes objetivo e Inteligencia Artificial para pensar exactamente como el dueño de tu rubro.
                    </p>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      value={searchIndustry}
                      onChange={(e) => setSearchIndustry(e.target.value)}
                      placeholder="Buscar rubro (ej. construcción, agencia, catering, maestranza, turismo...)"
                      className="pl-10 h-11 glass"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {filteredIndustries.map((ind) => {
                      const active = selectedIndustry === ind.id;
                      return (
                        <button
                          key={ind.id}
                          type="button"
                          onClick={() => handleSelectIndustry(ind.id)}
                          className={cn(
                            'text-left rounded-2xl p-4 border transition-all duration-200 tactile-press flex flex-col justify-between gap-2.5',
                            active
                              ? 'bg-slate-900 text-white border-slate-900 shadow-lg ring-2 ring-amber-400/50'
                              : 'glass-card text-slate-900 hover:border-slate-300'
                          )}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-sm leading-snug">
                                {ind.shortName}
                              </span>
                              {active && (
                                <span className="h-5 w-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shrink-0">
                                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                                </span>
                              )}
                            </div>
                            <p
                              className={cn(
                                'text-xs leading-relaxed',
                                active ? 'text-slate-300' : 'text-slate-600'
                              )}
                            >
                              {ind.tagline}
                            </p>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t border-current/10 text-[11px]">
                            <span className={active ? 'text-amber-300' : 'text-slate-500'}>
                              Margen ref. {ind.targetMarginPct}%
                            </span>
                            <span className={active ? 'text-slate-300' : 'text-slate-500'}>
                              {ind.terminology.projectPlural}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button
                      type="button"
                      size="lg"
                      onClick={() => setStep(2)}
                      className="tactile-press gap-2 font-semibold"
                    >
                      Continuar a Personalización
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <div className="space-y-2">
                    <Badge className="bg-slate-900 text-amber-300 border-0">
                      <Sliders className="h-3 w-3 mr-1" />
                      Configuración Recomendada para {blueprint.shortName}
                    </Badge>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                      Personaliza tu Espacio de Trabajo
                    </h1>
                    <p className="text-sm text-slate-600">
                      Preseleccionamos los ajustes más rentables para tu rubro. Puedes ajustarlos a tu estilo.
                    </p>
                  </div>

                  <div className="glass-card rounded-2xl p-6 space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="onb-company">Nombre Comercial</Label>
                        <Input
                          id="onb-company"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          placeholder={organization?.name || 'Tu Empresa SpA'}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="onb-location">Ciudad / Base Operativa</Label>
                        <Input
                          id="onb-location"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          placeholder="Ej. Santiago, Chile"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Palette className="h-4 w-4 text-slate-500" />
                        Paleta Ejecutiva del Entorno
                      </Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {Object.values(THEME_PRESETS).map((preset) => {
                          const isSelected = selectedTheme === preset.id;
                          const isRecommended = blueprint.recommendedTheme === preset.id;
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => setSelectedTheme(preset.id)}
                              className={cn(
                                'p-3 rounded-xl border text-left transition-all tactile-press flex items-center gap-3',
                                isSelected
                                  ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                                  : 'bg-white/80 border-slate-200 hover:border-slate-300'
                              )}
                            >
                              <div
                                className={cn(
                                  'h-8 w-8 rounded-lg bg-gradient-to-br shrink-0 border border-white/20',
                                  preset.previewGradient
                                )}
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold truncate">{preset.name}</span>
                                  {isRecommended && (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 font-bold">
                                      Sugerido
                                    </span>
                                  )}
                                </div>
                                <p
                                  className={cn(
                                    'text-[11px] truncate',
                                    isSelected ? 'text-slate-300' : 'text-slate-500'
                                  )}
                                >
                                  {preset.subtitle}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Modelo Operativo Principal</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        {[
                          { id: 'project' as OperationMode, title: 'Por Proyecto / Obra', desc: 'Presupuestos cerrados y partidas' },
                          { id: 'retail_mixed' as OperationMode, title: 'Mixto / Prorrateo', desc: 'Recetas, barras e insumos por unidad' },
                          { id: 'retainer_hours' as OperationMode, title: 'Horas & Fee', desc: 'Tarifas por hora y retainers' },
                        ].map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setOperationMode(m.id)}
                            className={cn(
                              'p-3 rounded-xl border text-left transition-all tactile-press',
                              operationMode === m.id
                                ? 'bg-slate-900 text-white border-slate-900'
                                : 'bg-white/80 border-slate-200 hover:border-slate-300'
                            )}
                          >
                            <div className="text-xs font-bold">{m.title}</div>
                            <div
                              className={cn(
                                'text-[11px] mt-0.5',
                                operationMode === m.id ? 'text-slate-300' : 'text-slate-500'
                              )}
                            >
                              {m.desc}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <Label htmlFor="seed-catalog" className="text-sm font-semibold text-emerald-950 cursor-pointer">
                          Precargar Catálogo Maestro de {blueprint.shortName} ({blueprint.starterCatalog.length} ítems CLP)
                        </Label>
                        <p className="text-xs text-emerald-800/90">
                          Incluye costos reales de referencia en Chile y modalidad tributaria SII (Factura / Boleta) listos para editar.
                        </p>
                      </div>
                      <input
                        id="seed-catalog"
                        type="checkbox"
                        checked={seedCatalog}
                        onChange={(e) => setSeedCatalog(e.target.checked)}
                        className="h-5 w-5 mt-0.5 rounded border-emerald-400 text-emerald-700 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <Button type="button" variant="outline" onClick={() => setStep(1)} className="gap-2">
                      <ArrowLeft className="h-4 w-4" />
                      Cambiar Rubro
                    </Button>
                    <Button
                      type="button"
                      size="lg"
                      disabled={savingConfig}
                      onClick={handleNextToPlans}
                      className="tactile-press gap-2 font-semibold"
                    >
                      {savingConfig ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ArrowRight className="h-4 w-4" />
                      )}
                      Guardar y Elegir Plan
                    </Button>
                  </div>
                </>
              )}
            </div>

            {/* Live ERP Preview Glassmórfico */}
            <div className="lg:col-span-5 lg:sticky lg:top-8">
              <div
                className={cn(
                  'rounded-3xl p-6 text-white shadow-2xl border border-white/15 bg-gradient-to-br transition-all duration-500 space-y-5',
                  themeDef.previewGradient
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
                      <Building2 className="h-4 w-4 text-amber-300" />
                    </div>
                    <div>
                      <div className="text-xs text-white/60 uppercase tracking-wider font-semibold">
                        Vista Previa en Vivo
                      </div>
                      <div className="font-bold text-sm truncate max-w-[200px]">
                        {companyName.trim() || organization?.name || 'Tu Empresa'}
                      </div>
                    </div>
                  </div>
                  <Badge className="bg-white/15 text-white border-white/20 text-[10px]">
                    {themeDef.name}
                  </Badge>
                </div>

                <div className="rounded-2xl bg-black/25 border border-white/10 p-4 space-y-3">
                  <div className="text-[11px] uppercase tracking-wider text-amber-300 font-bold">
                    Vocabulario Adaptado al Rubro
                  </div>
                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                      <div className="text-white/50 text-[10px]">Módulo Principal</div>
                      <div className="font-semibold mt-0.5">{blueprint.terminology.projectPlural}</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                      <div className="text-white/50 text-[10px]">Base de Precios</div>
                      <div className="font-semibold mt-0.5">{blueprint.terminology.catalogLabel}</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                      <div className="text-white/50 text-[10px]">Cliente / Contraparte</div>
                      <div className="font-semibold mt-0.5">{blueprint.terminology.clientLabel}</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                      <div className="text-white/50 text-[10px]">Meta Rentabilidad IA</div>
                      <div className="font-mono font-bold text-emerald-300 mt-0.5">
                        {blueprint.targetMarginPct}% Neto
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl bg-black/25 border border-white/10 p-4 space-y-2.5">
                  <div className="text-[11px] uppercase tracking-wider text-white/70 font-semibold">
                    Ejemplo de Catálogo Precargado ({blueprint.shortName})
                  </div>
                  <div className="space-y-2">
                    {blueprint.starterCatalog.slice(0, 3).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-2 text-xs py-1.5 border-b border-white/10 last:border-0"
                      >
                        <span className="truncate text-white/90">{item.servicio}</span>
                        <span className="font-mono text-amber-300 shrink-0 tabular-nums">
                          {formatCLP(item.costo + item.ganancia)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <p className="text-xs text-white/75 leading-relaxed italic border-l-2 border-amber-400/70 pl-3">
                  “{blueprint.ownerPainPoint}”
                </p>
              </div>
            </div>
          </div>
        )}

        {/* PASO 3: Selección de Suscripción o Paga lo que usas */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <Badge className="bg-slate-900 text-amber-300 border-0">
                  Paso Final · Activación Instantánea
                </Badge>
                <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                  Elige el plan ideal para {companyName.trim() || organization?.name || 'tu empresa'}
                </h1>
                <p className="text-sm text-slate-600">
                  Puedes iniciar con el <strong>Plan Semilla Gratuito ($0)</strong>, elegir la opción{' '}
                  <strong>Recomendada con IA</strong> o armar tu plan <strong>Paga lo que usas</strong>.
                </p>
              </div>
              <Button type="button" variant="outline" onClick={() => setStep(2)} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Volver a Personalización
              </Button>
            </div>

            <PlansMatrix
              plans={plans}
              addons={addons}
              isOnboarding={true}
              currentTier={preselectedPlan}
              currentModules={
                preselectedModules.length > 0 ? preselectedModules : blueprint.recommendedModules
              }
              khipuReady={khipuReady}
              isSuperAdmin={isSuperAdmin}
              onSelectCheckout={handleCheckout}
              loadingTier={checkoutLoading}
            />
          </div>
        )}
      </div>
    </div>
  );
}
