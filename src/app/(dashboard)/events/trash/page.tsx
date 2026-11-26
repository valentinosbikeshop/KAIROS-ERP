'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Trash, RefreshCcw, AlertTriangle, Lock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/use-user';
import { useWorkspaceConfig } from '@/hooks/use-workspace-config';
import {
  canCreateProject,
  countProjectsForQuota,
  requiredPlanForModule,
} from '@/lib/plan-guards';
import { FeatureLockCard } from '@/components/billing/feature-gate';
import { Button } from '@/components/ui/button';
import { Event } from '@/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export default function TrashPage() {
  const supabase = createClient();
  const { isAdmin, isDemo } = useUser();
  const { terms, entitlements, plans, isDuoExempt } = useWorkspaceConfig();
  const [events, setEvents] = useState<Event[]>([]);
  const [allEventsForQuota, setAllEventsForQuota] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  const fetchTrashedEvents = useCallback(async () => {
    setLoading(true);
    const [{ data, error }, { data: allRows }] = await Promise.all([
      supabase
        .from('events')
        .select('*')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false }),
      supabase.from('events').select('id, status, created_at, deleted_at'),
    ]);

    if (!error && data) {
      setEvents(data as Event[]);
    }
    if (allRows) {
      setAllEventsForQuota(allRows as Event[]);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchTrashedEvents();
  }, [fetchTrashedEvents]);

  const counts = countProjectsForQuota(allEventsForQuota);
  const projectGuard = canCreateProject(entitlements, counts);

  const canRestoreEvent = (ev: Event): { allowed: boolean; reason?: string } => {
    if (isDuoExempt) return { allowed: true };
    if (entitlements.isExpiredLock) {
      return {
        allowed: false,
        reason:
          'Su suscripción está vencida. Reactive su plan en Suscripción para recuperar registros desde la papelera.',
      };
    }
    // En planes con cupo por proyectos ACTIVOS (free/custom/demo), restaurar un proyecto no completado suma 1 activo
    if (projectGuard.mode === 'active' && ev.status !== 'completed' && !projectGuard.allowed) {
      return {
        allowed: false,
        reason:
          projectGuard.reason ||
          `Alcanzó el máximo de ${projectGuard.limit} ${terms.projectPlural.toLowerCase()} activos. Complete uno existente o amplíe su plan.`,
      };
    }
    return { allowed: true };
  };

  const handleRestore = async (ev: Event) => {
    setRestoreError(null);
    const check = canRestoreEvent(ev);
    if (!check.allowed) {
      setRestoreError(check.reason || 'No es posible restaurar con su plan actual.');
      return;
    }

    const confirm = window.confirm(
      `¿Está seguro de que desea recuperar este ${terms.projectSingular.toLowerCase()}? Volverá a la sección principal de ${terms.projectPlural}.`
    );
    if (!confirm) return;

    try {
      const { error } = await (supabase.from('events') as any)
        .update({ deleted_at: null })
        .eq('id', ev.id);

      if (error) throw error;
      await fetchTrashedEvents();
    } catch (err: any) {
      console.error('Error al recuperar:', err);
      setRestoreError(err?.message || `Error al recuperar el ${terms.projectSingular.toLowerCase()}.`);
    }
  };

  const handlePermanentDelete = async (id: string) => {
    if (entitlements.isExpiredLock) {
      setRestoreError('Su suscripción está vencida. Reactive su plan antes de eliminar registros.');
      return;
    }

    const confirm = window.prompt(
      `¡ADVERTENCIA! Esta acción no se puede deshacer. Todas las partidas e información del ${terms.projectSingular.toLowerCase()} se borrarán permanentemente. Escriba "BORRAR" para continuar.`
    );
    if (confirm !== 'BORRAR') {
      if (confirm !== null) alert('Cancelado.');
      return;
    }

    try {
      const { error } = await supabase.from('events').delete().eq('id', id);

      if (error) throw error;
      setEvents((prev) => prev.filter((ev) => ev.id !== id));
    } catch (err) {
      console.error('Error al eliminar permanentemente:', err);
      alert(`Error al eliminar permanentemente el ${terms.projectSingular.toLowerCase()}.`);
    }
  };

  const requiredPlanLabel =
    plans.find((p) => p.id === projectGuard.requiredPlan)?.name ||
    requiredPlanForModule('mod_unlimited_projects', plans).name;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Link href="/events" className="hover:text-primary flex items-center">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Volver a {terms.projectPlural}
            </Link>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-red-600 flex items-center gap-2">
            <Trash className="h-8 w-8" /> Papelera de {terms.projectPlural}
          </h1>
          <p className="text-muted-foreground mt-1">
            Los registros enviados a papelera se conservan 30 días antes de su eliminación definitiva.
          </p>
        </div>
      </div>

      {(entitlements.isExpiredLock || (projectGuard.mode === 'active' && !projectGuard.allowed)) && (
        <FeatureLockCard
          compact
          isExpiredLock={entitlements.isExpiredLock}
          title={
            entitlements.isExpiredLock
              ? 'Restauración bloqueada por suscripción vencida'
              : `Cupo de ${terms.projectPlural.toLowerCase()} activos completo (${projectGuard.current}/${projectGuard.limit})`
          }
          description={
            projectGuard.reason ||
            `Para restaurar registros activos desde la papelera debe liberar un cupo completando otro ${terms.projectSingular.toLowerCase()} o ampliar su plan.`
          }
          requiredPlanLabel={requiredPlanLabel}
        />
      )}

      {restoreError && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs text-destructive flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{restoreError}</span>
          </div>
          <Link href="/billing" className="underline font-semibold shrink-0">
            Gestionar Plan
          </Link>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : events.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {events.map((event) => {
            const deletedDate = new Date(event.deleted_at!);
            const expiryDate = new Date(deletedDate);
            expiryDate.setDate(expiryDate.getDate() + 30);
            const daysLeft = Math.ceil(
              (expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
            );
            const restoreCheck = canRestoreEvent(event);

            return (
              <Card key={event.id} className="border-red-200 bg-red-50/30">
                <CardHeader>
                  <CardTitle className="text-xl font-bold line-clamp-1">{event.name}</CardTitle>
                  <CardDescription>{event.client_company || 'Sin cliente asignado'}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>
                      Se eliminará permanentemente en <strong>{Math.max(0, daysLeft)} días</strong>.
                    </span>
                  </div>

                  <div className="flex gap-2 justify-end mt-4">
                    <Button
                      onClick={() => handleRestore(event)}
                      variant="outline"
                      disabled={!restoreCheck.allowed}
                      title={!restoreCheck.allowed ? restoreCheck.reason : 'Recuperar registro'}
                      className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                    >
                      {restoreCheck.allowed ? (
                        <RefreshCcw className="h-4 w-4 mr-2" />
                      ) : (
                        <Lock className="h-4 w-4 mr-2 text-amber-600" />
                      )}
                      Recuperar
                    </Button>
                    {(isAdmin || (isDemo && !event.is_demo_base)) && !entitlements.isExpiredLock && (
                      <Button onClick={() => handlePermanentDelete(event.id)} variant="destructive">
                        <Trash className="h-4 w-4 mr-2" />
                        Borrar Definitivamente
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 border rounded-lg bg-muted/20 border-dashed">
          <Trash className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium">La papelera está vacía</h3>
          <p className="text-muted-foreground mt-2">
            No tiene {terms.projectPlural.toLowerCase()} eliminados.
          </p>
        </div>
      )}
    </div>
  );
}
