'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  CheckCircle2,
  CreditCard,
  Loader2,
  Palette,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Building2,
} from 'lucide-react';
import { useWorkspaceConfig } from '@/hooks/use-workspace-config';
import { PlansMatrix } from '@/components/billing/plans-matrix';
import { INDUSTRY_LIST, THEME_PRESETS } from '@/lib/industries';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { formatCLP, formatDateCL, cn } from '@/lib/utils';
import type {
  BillingPayment,
  IndustryType,
  ModuleKey,
  OperationMode,
  SubscriptionTier,
  ThemePreset,
} from '@/types/database';

function BillingPageContent() {
  const searchParams = useSearchParams();
  const {
    loading,
    organization,
    isDuoExempt,
    isSuperAdmin,
    entitlements,
    plans,
    addons,
    khipuReady,
  } = useWorkspaceConfig();

  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [payments, setPayments] = useState<BillingPayment[]>([]);
  const [banner, setBanner] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Estado de re-personalización del ERP
  const [industryType, setIndustryType] = useState<IndustryType>(entitlements.industryType);
  const [themePreset, setThemePreset] = useState<ThemePreset>(entitlements.themePreset);
  const [operationMode, setOperationMode] = useState<OperationMode>(entitlements.operationMode);
  const [savingStyle, setSavingStyle] = useState(false);

  useEffect(() => {
    setIndustryType(entitlements.industryType);
    setThemePreset(entitlements.themePreset);
    setOperationMode(entitlements.operationMode);
  }, [entitlements.industryType, entitlements.themePreset, entitlements.operationMode]);

  const loadPayments = async () => {
    try {
      const res = await fetch('/api/billing/payments');
      const data = await res.json();
      if (res.ok && Array.isArray(data.payments)) {
        setPayments(data.payments);
      }
    } catch {
      // Ignorar
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  // Verificar retorno desde Khipu (?payment=success&tx=...)
  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    const tx = searchParams.get('tx');
    if (paymentStatus === 'canceled') {
      setBanner({
        type: 'info',
        message: 'El proceso de pago en Khipu fue cancelado. Tus datos siguen intactos.',
      });
      return;
    }

    if (paymentStatus === 'success' && tx) {
      setVerifying(true);
      fetch('/api/billing/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: tx }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.verified) {
            setBanner({
              type: 'success',
              message: '¡Pago confirmado con Khipu! Tu suscripción mensual ya está activa.',
            });
            window.dispatchEvent(new Event('kairos:org-updated'));
            loadPayments();
          } else {
            setBanner({
              type: 'info',
              message: 'Tu transferencia está siendo conciliada por Khipu. Se activará automáticamente en segundos.',
            });
          }
        })
        .catch(() => {})
        .finally(() => setVerifying(false));
    }
  }, [searchParams]);

  const handleCheckout = async (
    tier: SubscriptionTier,
    selectedModules: ModuleKey[],
    simulateSuperAdminPayment = false
  ) => {
    if (isPreviewMode) {
      setBanner({
        type: 'info',
        message:
          'Modo Vista Previa SuperAdmin: no se ejecutan cobros ni cambios reales sobre la empresa actual.',
      });
      return;
    }
    setCheckoutLoading(tier);
    setBanner(null);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, selectedModules, simulateSuperAdminPayment }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo iniciar el pago con Khipu.');
      }
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
        return;
      }
      setBanner({
        type: 'success',
        message: data.message || 'Suscripción actualizada exitosamente.',
      });
      window.dispatchEvent(new Event('kairos:org-updated'));
      loadPayments();
    } catch (err: any) {
      setBanner({ type: 'error', message: err.message || 'Error procesando suscripción.' });
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleSavePersonalization = async () => {
    if (isPreviewMode) {
      setBanner({
        type: 'info',
        message:
          'Modo Vista Previa SuperAdmin: la personalización visual se previsualiza sin modificar la base de datos.',
      });
      return;
    }
    setSavingStyle(true);
    setBanner(null);
    try {
      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          industryType,
          themePreset,
          operationMode,
          seedIndustryCatalog: false,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo actualizar la personalización.');
      if (data.exempt) {
        setBanner({
          type: 'info',
          message: data.message || 'Organización exenta: conserva su configuración original.',
        });
        return;
      }
      setBanner({
        type: 'success',
        message: 'Personalización del ERP actualizada. El vocabulario y estilo visual ya reflejan tu rubro.',
      });
      window.dispatchEvent(new Event('kairos:org-updated'));
    } catch (err: any) {
      setBanner({ type: 'error', message: err.message });
    } finally {
      setSavingStyle(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isPreviewMode = isSuperAdmin && searchParams.get('preview') === '1';

  if (isDuoExempt && !isPreviewMode) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="glass-luxury text-white border-amber-400/30">
          <CardHeader>
            <Badge className="w-fit bg-amber-400 text-slate-950 border-0 font-bold">
              Organización Exenta · Fundadora
            </Badge>
            <CardTitle className="text-2xl text-white mt-2">
              {organization?.name} cuenta con Acceso Total Ilimitado
            </CardTitle>
            <CardDescription className="text-slate-300">
              Esta empresa está exenta de suscripciones, límites de módulos y cobros Khipu. Para editar precios de otros clientes o previsualizar esta vista, ingresa a Gobernanza.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const currentModulesArray = (Object.keys(entitlements.modules) as ModuleKey[]).filter(
    (k) => entitlements.modules[k]
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {isPreviewMode && (
        <div className="p-3.5 rounded-2xl bg-indigo-950 text-white border border-indigo-400/30 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span>
            <strong>Vista Previa SuperAdmin:</strong> Así ven sus clientes el Centro de Suscripción y Estilo (DUO Producciones sigue 100% exenta).
          </span>
          <a href="/governance" className="underline text-amber-300 font-semibold">
            Volver a Gobernanza
          </a>
        </div>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Suscripción Khipu & Personalización</h1>
          <p className="text-muted-foreground text-sm">
            Gestiona tu plan mensual, arma módulos a medida o adapta el ERP al giro de tu negocio.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              'px-3 py-1 text-xs font-semibold',
              entitlements.isExpiredLock
                ? 'bg-amber-50 text-amber-800 border-amber-300'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            )}
          >
            {entitlements.isExpiredLock ? 'Soft-Lock Activo · Datos Intactos' : 'Suscripción al día'}
          </Badge>
        </div>
      </div>

      {(verifying || banner) && (
        <div
          className={cn(
            'p-4 rounded-2xl border text-sm font-medium flex items-center gap-3',
            banner?.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : banner?.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-blue-50 border-blue-200 text-blue-900'
          )}
        >
          {verifying ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Verificando conciliación de pago con Khipu...</span>
            </>
          ) : (
            <>
              {banner?.type === 'error' ? (
                <ShieldAlert className="h-4 w-4 shrink-0" />
              ) : (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              )}
              <span>{banner?.message}</span>
            </>
          )}
        </div>
      )}

      {/* Personalización del Rubro y Paleta */}
      <Card className="glass-card">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-slate-700" />
            <CardTitle className="text-lg">Identidad de Rubro y Estética del ERP</CardTitle>
          </div>
          <CardDescription>
            Ajusta el giro de tu negocio, el modelo operativo o la paleta ejecutiva en cualquier momento.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="space-y-1.5">
            <Label>Tipo de Negocio</Label>
            <Select
              value={industryType}
              onChange={(e) => setIndustryType(e.target.value as IndustryType)}
              options={INDUSTRY_LIST.map((i) => ({ value: i.id, label: i.shortName }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Paleta Ejecutiva</Label>
            <Select
              value={themePreset}
              onChange={(e) => setThemePreset(e.target.value as ThemePreset)}
              options={Object.values(THEME_PRESETS).map((t) => ({ value: t.id, label: t.name }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Modelo Operativo</Label>
            <Select
              value={operationMode}
              onChange={(e) => setOperationMode(e.target.value as OperationMode)}
              options={[
                { value: 'project', label: 'Por Proyecto / Obra' },
                { value: 'retail_mixed', label: 'Mixto / Prorrateo Insumos' },
                { value: 'retainer_hours', label: 'Tarifas Hora & Fee' },
              ]}
            />
          </div>
          <Button
            type="button"
            onClick={handleSavePersonalization}
            disabled={savingStyle}
            className="tactile-press gap-2"
          >
            {savingStyle ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Aplicar Estilo
          </Button>
        </CardContent>
      </Card>

      {/* Matriz de Planes + Paga lo que usas */}
      <PlansMatrix
        plans={plans}
        addons={addons}
        currentTier={entitlements.tier}
        currentModules={currentModulesArray}
        khipuReady={khipuReady}
        isSuperAdmin={isSuperAdmin}
        onSelectCheckout={handleCheckout}
        loadingTier={checkoutLoading}
      />

      {/* Historial de Pagos Khipu */}
      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-slate-700" />
              Historial de Pagos Khipu
            </CardTitle>
            <CardDescription>Registro auditado de tus renovaciones y cambios de plan.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadPayments} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            Actualizar
          </Button>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-xs text-muted-foreground py-6 text-center border rounded-xl bg-muted/20">
              Aún no registras pagos en Khipu. Cuando contrates un plan mensual aparecerá aquí con su comprobante.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4">Fecha</th>
                    <th className="py-2 pr-4">Transacción</th>
                    <th className="py-2 pr-4">Plan / Modalidad</th>
                    <th className="py-2 pr-4">Monto CLP</th>
                    <th className="py-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="py-2.5 pr-4">{formatDateCL(p.created_at)}</td>
                      <td className="py-2.5 pr-4 font-mono">{p.transaction_id}</td>
                      <td className="py-2.5 pr-4 capitalize font-medium">{p.tier}</td>
                      <td className="py-2.5 pr-4 font-mono font-semibold tabular-nums">
                        {formatCLP(p.amount_clp)}
                      </td>
                      <td className="py-2.5">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px]',
                            p.status === 'paid'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : p.status === 'pending'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-red-50 text-red-700 border-red-200'
                          )}
                        >
                          {p.status === 'paid'
                            ? 'Pagado'
                            : p.status === 'pending'
                            ? 'Pendiente'
                            : p.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <BillingPageContent />
    </Suspense>
  );
}
