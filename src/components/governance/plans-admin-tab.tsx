'use client';

import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  CreditCard,
  Loader2,
  Save,
  ShieldCheck,
  Sparkles,
  AlertTriangle,
  Crown,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { DUO_ORG_SLUG } from '@/lib/constants';
import { hydrateOrganizationSaas } from '@/lib/saas-storage-client';
import { formatCLP, formatDateCL, cn } from '@/lib/utils';
import type {
  Organization,
  SubscriptionAddon,
  SubscriptionPlan,
  SubscriptionTier,
} from '@/types/database';

interface PlansAdminTabProps {
  companies: (Organization & { users_count: number; events_count: number })[];
  onRefreshCompanies: () => Promise<void>;
}

export function PlansAdminTab({ companies, onRefreshCompanies }: PlansAdminTabProps) {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [addons, setAddons] = useState<SubscriptionAddon[]>([]);
  const [khipuReady, setKhipuReady] = useState(false);
  const [khipuWebhookReady, setKhipuWebhookReady] = useState(false);
  const [usingDbTables, setUsingDbTables] = useState(true);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/plans');
      const data = await res.json();
      if (res.ok) {
        setPlans(data.plans || []);
        setAddons(data.addons || []);
        setKhipuReady(Boolean(data.khipuReady));
        setKhipuWebhookReady(Boolean(data.khipuWebhookReady));
        setUsingDbTables(Boolean(data.usingDatabaseTables));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleSavePlan = async (plan: SubscriptionPlan) => {
    setSavingId(plan.id);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/plans', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'plan',
          id: plan.id,
          name: plan.name,
          tagline: plan.tagline,
          description: plan.description,
          price_clp: Number(plan.price_clp) || 0,
          is_recommended: Boolean(plan.is_recommended),
          badge_text: plan.badge_text || null,
          max_projects: plan.max_projects ? Number(plan.max_projects) : null,
          max_costs: plan.max_costs ? Number(plan.max_costs) : null,
          max_users: plan.max_users ? Number(plan.max_users) : null,
          ai_calls_limit: Number(plan.ai_calls_limit) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error guardando plan');
      setFeedback({ type: 'success', message: `Plan "${plan.name}" actualizado en vivo.` });
      if (data.plans) setPlans(data.plans);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setSavingId(null);
    }
  };

  const handleSaveAddon = async (addon: SubscriptionAddon) => {
    setSavingId(addon.id);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/plans', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'addon',
          id: addon.id,
          name: addon.name,
          description: addon.description,
          price_clp: Number(addon.price_clp) || 0,
          ai_calls_bonus: Number(addon.ai_calls_bonus) || 0,
          is_active: addon.is_active !== false,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error guardando módulo');
      setFeedback({ type: 'success', message: `Módulo "${addon.name}" actualizado.` });
      if (data.addons) setAddons(data.addons);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setSavingId(null);
    }
  };

  const handleOrgSubAction = async (
    orgId: string,
    payload: {
      subscription_tier?: SubscriptionTier;
      extend_days?: number;
      is_exempt?: boolean;
    }
  ) => {
    setSavingId(orgId);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/plans', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'organization_subscription',
          organization_id: orgId,
          ...payload,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error actualizando suscripción');
      setFeedback({ type: 'success', message: 'Estado de suscripción de la empresa actualizado.' });
      await onRefreshCompanies();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {feedback && (
        <div
          className={cn(
            'p-3.5 rounded-xl border text-xs font-medium flex items-center gap-2',
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          )}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Laboratorio de Previsualización SuperAdmin */}
      <Card className="glass-luxury text-white border-amber-400/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-white">
            <Sparkles className="h-4 w-4 text-amber-400" />
            Laboratorio de Previsualización (Sin Crear Cuentas)
          </CardTitle>
          <CardDescription className="text-xs text-slate-300">
            Inspecciona directamente la Landing Page comercial, la Demo en Caché Local, el Onboarding de nuevos clientes y la vista de Suscripción Khipu.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2.5">
          <a href="/welcome" target="_blank" rel="noreferrer">
            <Button size="sm" className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs">
              Abrir Landing Page (/welcome)
            </Button>
          </a>
          <a href="/demo" target="_blank" rel="noreferrer">
            <Button size="sm" variant="secondary" className="text-xs font-semibold">
              Abrir Demo Caché Local (/demo)
            </Button>
          </a>
          <a href="/onboarding?preview=1">
            <Button size="sm" variant="outline" className="text-xs bg-white/10 border-white/20 text-white hover:bg-white/20">
              Abrir Onboarding Studio (/onboarding?preview=1)
            </Button>
          </a>
          <a href="/billing?preview=1">
            <Button size="sm" variant="outline" className="text-xs bg-white/10 border-white/20 text-white hover:bg-white/20">
              Vista Previa Suscripción (/billing?preview=1)
            </Button>
          </a>
        </CardContent>
      </Card>

      {/* Diagnóstico Khipu y Migración */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            Estado Pasarela Khipu API v3 & Persistencia
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3 text-xs">
          <Badge
            variant="outline"
            className={khipuReady ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-300'}
          >
            KHIPU_API_KEY: {khipuReady ? 'Configurada' : 'Pendiente en .env / Vercel'}
          </Badge>
          <Badge
            variant="outline"
            className={khipuWebhookReady ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-300'}
          >
            KHIPU_WEBHOOK_SECRET: {khipuWebhookReady ? 'Configurado' : 'Pendiente en .env / Vercel'}
          </Badge>
          <Badge
            variant="outline"
            className={usingDbTables ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-800 border-blue-200'}
          >
            Tablas SQL SaaS: {usingDbTables ? 'Sincronizadas en Supabase' : 'Modo Fallback Seguro (ejecutar migración para editar precios en vivo)'}
          </Badge>
        </CardContent>
      </Card>

      {/* Editor de Planes Mensuales */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-bold">Planes Mensuales (Gratis + 3 Suscripciones)</h3>
          <p className="text-xs text-muted-foreground">
            Edita precios en CLP, descripciones, cuotas y marca qué plan se destaca como Recomendado.
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {plans.map((plan) => (
            <Card key={plan.id} className="glass-card">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    {plan.name}
                    <span className="font-mono text-xs text-muted-foreground">({plan.id})</span>
                  </CardTitle>
                  <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(plan.is_recommended)}
                      onChange={(e) =>
                        setPlans((prev) =>
                          prev.map((p) =>
                            p.id === plan.id
                              ? { ...p, is_recommended: e.target.checked }
                              : e.target.checked
                              ? { ...p, is_recommended: false }
                              : p
                          )
                        )
                      }
                    />
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    Recomendado
                  </label>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Nombre del Plan</Label>
                    <Input
                      value={plan.name}
                      onChange={(e) =>
                        setPlans((prev) =>
                          prev.map((p) => (p.id === plan.id ? { ...p, name: e.target.value } : p))
                        )
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Precio Mensual CLP</Label>
                    <Input
                      type="number"
                      min={0}
                      value={plan.price_clp}
                      onChange={(e) =>
                        setPlans((prev) =>
                          prev.map((p) =>
                            p.id === plan.id ? { ...p, price_clp: Number(e.target.value) } : p
                          )
                        )
                      }
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Subtítulo / Tagline</Label>
                  <Input
                    value={plan.tagline}
                    onChange={(e) =>
                      setPlans((prev) =>
                        prev.map((p) => (p.id === plan.id ? { ...p, tagline: e.target.value } : p))
                      )
                    }
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Descripción Comercial</Label>
                  <textarea
                    rows={2}
                    value={plan.description}
                    onChange={(e) =>
                      setPlans((prev) =>
                        prev.map((p) =>
                          p.id === plan.id ? { ...p, description: e.target.value } : p
                        )
                      )
                    }
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                  />
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[11px]">Máx. Proy.</Label>
                    <Input
                      type="number"
                      placeholder="∞"
                      value={plan.max_projects ?? ''}
                      onChange={(e) =>
                        setPlans((prev) =>
                          prev.map((p) =>
                            p.id === plan.id
                              ? { ...p, max_projects: e.target.value ? Number(e.target.value) : null }
                              : p
                          )
                        )
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Máx. Tarifas</Label>
                    <Input
                      type="number"
                      placeholder="∞"
                      value={plan.max_costs ?? ''}
                      onChange={(e) =>
                        setPlans((prev) =>
                          prev.map((p) =>
                            p.id === plan.id
                              ? { ...p, max_costs: e.target.value ? Number(e.target.value) : null }
                              : p
                          )
                        )
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Máx. Usuar.</Label>
                    <Input
                      type="number"
                      placeholder="∞"
                      value={plan.max_users ?? ''}
                      onChange={(e) =>
                        setPlans((prev) =>
                          prev.map((p) =>
                            p.id === plan.id
                              ? { ...p, max_users: e.target.value ? Number(e.target.value) : null }
                              : p
                          )
                        )
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Créditos IA</Label>
                    <Input
                      type="number"
                      min={0}
                      value={plan.ai_calls_limit}
                      onChange={(e) =>
                        setPlans((prev) =>
                          prev.map((p) =>
                            p.id === plan.id
                              ? { ...p, ai_calls_limit: Number(e.target.value) || 0 }
                              : p
                          )
                        )
                      }
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  size="sm"
                  disabled={savingId === plan.id}
                  onClick={() => handleSavePlan(plan)}
                  className="w-full gap-2"
                >
                  {savingId === plan.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  Guardar Plan ({formatCLP(plan.price_clp)})
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Editor de Módulos "Paga lo que usas" */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">Precios Modulares &ldquo;Paga lo que usas&rdquo;</CardTitle>
          <CardDescription className="text-xs">
            Ajusta el valor base y el precio mensual individual de cada módulo activable.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {addons.map((addon) => (
            <div
              key={addon.id}
              className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center p-3 rounded-xl border bg-background/60 text-xs"
            >
              <div className="md:col-span-4 space-y-1">
                <Input
                  value={addon.name}
                  onChange={(e) =>
                    setAddons((prev) =>
                      prev.map((a) => (a.id === addon.id ? { ...a, name: e.target.value } : a))
                    )
                  }
                />
              </div>
              <div className="md:col-span-5">
                <Input
                  value={addon.description}
                  onChange={(e) =>
                    setAddons((prev) =>
                      prev.map((a) =>
                        a.id === addon.id ? { ...a, description: e.target.value } : a
                      )
                    )
                  }
                />
              </div>
              <div className="md:col-span-2">
                <Input
                  type="number"
                  min={0}
                  value={addon.price_clp}
                  onChange={(e) =>
                    setAddons((prev) =>
                      prev.map((a) =>
                        a.id === addon.id ? { ...a, price_clp: Number(e.target.value) } : a
                      )
                    )
                  }
                />
              </div>
              <div className="md:col-span-1">
                <Button
                  type="button"
                  size="sm"
                  disabled={savingId === addon.id}
                  onClick={() => handleSaveAddon(addon)}
                  className="w-full"
                >
                  {savingId === addon.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Control Maestro de Suscripciones por Empresa */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Control de Suscripciones por Empresa
          </CardTitle>
          <CardDescription className="text-xs">
            DUO Producciones está exenta por diseño. Puedes asignar planes, extender 30 días o probar el Soft-Lock en cualquier otra empresa sin borrar sus datos.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-4">Empresa</th>
                <th className="py-2 pr-4">Rubro</th>
                <th className="py-2 pr-4">Plan</th>
                <th className="py-2 pr-4">Vencimiento</th>
                <th className="py-2">Acciones Rápidas</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((raw) => {
                const org = hydrateOrganizationSaas(raw)!;
                const isDuo = org.slug === DUO_ORG_SLUG;
                return (
                  <tr key={org.id} className="border-b last:border-0">
                    <td className="py-3 pr-4 font-semibold">
                      <div className="flex items-center gap-2">
                        <span>{org.name}</span>
                        {isDuo && (
                          <Badge className="bg-amber-400 text-slate-950 border-0 text-[10px] gap-1">
                            <Crown className="h-3 w-3" />
                            EXENTA
                          </Badge>
                        )}
                        {org.is_demo && (
                          <Badge variant="outline" className="text-[10px]">
                            DEMO
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">{org.industry_type}</td>
                    <td className="py-3 pr-4">
                      {isDuo ? (
                        <span className="font-semibold text-emerald-700">Acceso Total Ilimitado</span>
                      ) : (
                        <Select
                          value={org.subscription_tier || 'free'}
                          onChange={(e) =>
                            handleOrgSubAction(org.id, {
                              subscription_tier: e.target.value as SubscriptionTier,
                              extend_days: e.target.value === 'free' ? undefined : 30,
                            })
                          }
                          options={[
                            { value: 'free', label: 'Semilla (Gratis)' },
                            { value: 'essential', label: 'Operación Esencial' },
                            { value: 'growth', label: 'Crecimiento IA' },
                            { value: 'scale', label: 'Corporativo' },
                            { value: 'custom', label: 'Paga lo que usas' },
                          ]}
                        />
                      )}
                    </td>
                    <td className="py-3 pr-4 font-mono">
                      {org.current_period_end ? formatDateCL(org.current_period_end) : 'Sin vencimiento'}
                    </td>
                    <td className="py-3">
                      {!isDuo && !org.is_demo && (
                        <div className="flex flex-wrap gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[11px]"
                            disabled={savingId === org.id}
                            onClick={() => handleOrgSubAction(org.id, { extend_days: 30 })}
                          >
                            +30 días
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[11px] text-amber-700 border-amber-200 hover:bg-amber-50"
                            disabled={savingId === org.id}
                            onClick={() => handleOrgSubAction(org.id, { extend_days: 0 })}
                          >
                            Simular Impago
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
