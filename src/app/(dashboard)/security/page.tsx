'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  KeyRound,
  Loader2,
  LockKeyhole,
  LogOut,
  MonitorSmartphone,
  Shield,
  ShieldCheck,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useWorkspaceConfig } from '@/hooks/use-workspace-config';
import { ROLE_METADATA } from '@/lib/rbac';
import { MfaSettingsCard } from '@/components/auth/mfa-settings-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function SecurityPage() {
  const { loading, isDemo, profile, organization, role, isAdmin, isSuperAdmin, hasGranularRbac } =
    useWorkspaceConfig();
  const supabase = createClient();

  const [aalLevel, setAalLevel] = useState<string | null>(null);
  const [nextLevel, setNextLevel] = useState<string | null>(null);
  const [lastSignInAt, setLastSignInAt] = useState<string | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [revokingScope, setRevokingScope] = useState<'others' | 'global' | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const loadSessionSecurity = useCallback(async () => {
    if (isDemo) {
      setSessionLoading(false);
      return;
    }
    setSessionLoading(true);
    try {
      const [userRes, aalRes] = await Promise.all([
        supabase.auth.getUser(),
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      ]);
      setLastSignInAt(userRes.data?.user?.last_sign_in_at || null);
      setAalLevel(aalRes.data?.currentLevel || null);
      setNextLevel(aalRes.data?.nextLevel || null);
    } catch {
      // Ignorar errores transitorios
    } finally {
      setSessionLoading(false);
    }
  }, [isDemo, supabase]);

  useEffect(() => {
    if (!loading) {
      loadSessionSecurity();
    }
  }, [loading, loadSessionSecurity]);

  const handleRevokeSessions = async (scope: 'others' | 'global') => {
    const confirmMsg =
      scope === 'global'
        ? '¿Cerrar TODAS sus sesiones activas incluyendo este navegador? Deberá iniciar sesión nuevamente.'
        : '¿Cerrar todas las demás sesiones activas en otros navegadores o dispositivos?';

    if (!window.confirm(confirmMsg)) return;

    setRevokingScope(scope);
    setFeedback(null);
    try {
      const { error } = await supabase.auth.signOut({ scope });
      if (error) throw error;
      if (scope === 'global') {
        window.location.href = '/login';
        return;
      }
      setFeedback({
        type: 'success',
        message: 'Se han revocado todas las sesiones abiertas en otros dispositivos.',
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'No se pudieron revocar las sesiones activas.',
      });
    } finally {
      setRevokingScope(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const roleMeta = ROLE_METADATA[role];

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-xl border border-primary/20">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Seguridad de la Cuenta y Sesiones</h1>
            <p className="text-sm text-muted-foreground">
              Gestione su verificación en dos pasos (2FA / TOTP), sesiones activas y controles de acceso.
            </p>
          </div>
        </div>
        {(isAdmin || isSuperAdmin) && !isDemo && (
          <Link href="/governance?tab=audit">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <ShieldCheck className="h-3.5 w-3.5" />
              Ir a Gobernanza y Auditoría
            </Button>
          </Link>
        )}
      </div>

      {feedback && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
              : 'bg-destructive/10 border-destructive/30 text-destructive'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {isDemo ? (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-8 text-center space-y-2">
            <LockKeyhole className="h-8 w-8 text-amber-600 mx-auto" />
            <p className="text-sm font-semibold">No disponible en Sesión de Prueba</p>
            <p className="text-xs text-muted-foreground">
              La configuración 2FA y gestión de sesiones está reservada para cuentas privadas de empresas reales.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <MfaSettingsCard />

          {/* Active Session & Device Controls */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary">
                    <MonitorSmartphone className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Sesión Actual y Revocación de Dispositivos</CardTitle>
                    <CardDescription className="text-xs mt-1">
                      Cierre sesiones activas en otros navegadores o dispositivos si sospecha acceso no autorizado.
                    </CardDescription>
                  </div>
                </div>
                {!sessionLoading && (
                  <Badge variant="outline" className="font-mono text-xs shrink-0">
                    Nivel: {aalLevel?.toUpperCase() || 'AAL1'}
                    {nextLevel === 'aal2' && aalLevel === 'aal2' ? ' · 2FA Verificado' : ''}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl border bg-muted/20">
                  <span className="text-muted-foreground block">Cuenta Autenticada</span>
                  <span className="font-semibold break-all">{profile?.email || '—'}</span>
                </div>
                <div className="p-3 rounded-xl border bg-muted/20">
                  <span className="text-muted-foreground block">Organización y Rol</span>
                  <span className="font-semibold">
                    {organization?.name || '—'} · {roleMeta?.shortLabel || role}
                  </span>
                </div>
                <div className="p-3 rounded-xl border bg-muted/20">
                  <span className="text-muted-foreground block">Último Inicio de Sesión</span>
                  <span className="font-mono font-medium">
                    {lastSignInAt
                      ? new Date(lastSignInAt).toLocaleString('es-CL', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })
                      : 'Sesión vigente'}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={revokingScope !== null}
                  onClick={() => handleRevokeSessions('others')}
                  className="gap-1.5 text-xs"
                >
                  {revokingScope === 'others' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <KeyRound className="h-3.5 w-3.5" />
                  )}
                  Cerrar Otras Sesiones Activas
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={revokingScope !== null}
                  onClick={() => handleRevokeSessions('global')}
                  className="gap-1.5 text-xs text-destructive hover:text-destructive border-destructive/30"
                >
                  {revokingScope === 'global' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <LogOut className="h-3.5 w-3.5" />
                  )}
                  Cerrar Todas las Sesiones
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* OWASP & Tenant Isolation Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Controles Activos de Seguridad Empresarial</CardTitle>
              <CardDescription className="text-xs">
                Protecciones aplicadas en servidor y base de datos para su organización.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl border bg-muted/15 flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Aislamiento Multi-Empresa (RLS)</p>
                  <p className="text-muted-foreground">
                    Cada consulta exige <code>organization_id</code> verificado en PostgreSQL y JWT del servidor.
                  </p>
                </div>
              </div>
              <div className="p-3 rounded-xl border bg-muted/15 flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Protección Anti-Escalamiento de Privilegios</p>
                  <p className="text-muted-foreground">
                    Ningún usuario puede modificar su propio rol ni aprobar cotizaciones bajo margen sin permiso RBAC en servidor.
                  </p>
                </div>
              </div>
              <div className="p-3 rounded-xl border bg-muted/15 flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Enforcement 2FA (AAL2) en APIs</p>
                  <p className="text-muted-foreground">
                    Cuando el 2FA está activo, el middleware bloquea rutas y APIs hasta validar el código TOTP.
                  </p>
                </div>
              </div>
              <div className="p-3 rounded-xl border bg-muted/15 flex items-start gap-2.5">
                <CheckCircle2
                  className={`h-4 w-4 shrink-0 mt-0.5 ${
                    hasGranularRbac ? 'text-emerald-600' : 'text-muted-foreground'
                  }`}
                />
                <div>
                  <p className="font-semibold">
                    RBAC Granular &amp; Bitácora {hasGranularRbac ? '(Activo)' : '(Corporativo & Escala)'}
                  </p>
                  <p className="text-muted-foreground">
                    {hasGranularRbac
                      ? 'Su empresa cuenta con 6 roles granulares y registro inmutable en Bitácora.'
                      : 'Disponible al activar el Plan Corporativo & Escala ($119.990/mes).'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
