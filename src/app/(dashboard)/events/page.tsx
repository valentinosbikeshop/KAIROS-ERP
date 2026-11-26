'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useWorkspaceConfig } from '@/hooks/use-workspace-config';
import {
  canCreateProject,
  canUseModule,
  countProjectsForQuota,
  requiredPlanForModule,
} from '@/lib/plan-guards';
import { FeatureLockCard } from '@/components/billing/feature-gate';
import { EventCard } from '@/components/events/event-card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Event } from '@/types';

export default function EventsPage() {
  const { terms, industry, entitlements, plans, isDuoExempt, isDemo, organization } =
    useWorkspaceConfig();
  const [events, setEvents] = useState<Event[]>([]);
  const [allEventsForQuota, setAllEventsForQuota] = useState<
    Array<{ id: string; status: string; created_at: string; deleted_at: string | null }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const [{ data, error }, { data: quotaRows }] = await Promise.all([
      supabase
        .from('events')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false }),
      supabase
        .from('events')
        .select('id, status, created_at, deleted_at'),
    ]);

    if (!error && data) {
      setEvents(data as Event[]);
      setAllEventsForQuota(
        ((quotaRows as any[]) || (data as any[])).map((r) => ({
          id: r.id,
          status: r.status,
          created_at: r.created_at,
          deleted_at: r.deleted_at ?? null,
        }))
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchEvents();
    const onRefresh = () => fetchEvents();
    window.addEventListener('figura:local-db-changed', onRefresh);
    window.addEventListener('figura:org-updated', onRefresh);
    return () => {
      window.removeEventListener('figura:local-db-changed', onRefresh);
      window.removeEventListener('figura:org-updated', onRefresh);
    };
  }, [fetchEvents, industry.id]);

  const counts = countProjectsForQuota(
    allEventsForQuota.length > 0 ? allEventsForQuota : events
  );
  const projectGuard = canCreateProject(entitlements, counts);
  const canDuplicate = isDuoExempt || projectGuard.allowed;
  const canUseConsolidation =
    isDuoExempt || canUseModule(entitlements, 'mod_consolidation_retail');

  const requiredUpgradePlanName =
    plans.find((p) => p.id === projectGuard.requiredPlan)?.name ||
    requiredPlanForModule('mod_unlimited_projects', plans).name;

  const handleDuplicate = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setErrorMsg(null);

    if (!canDuplicate) {
      setErrorMsg(
        projectGuard.reason ||
          `Alcanzó el tope de proyectos de su plan. Actualice a ${requiredUpgradePlanName} para duplicar o crear nuevos.`
      );
      return;
    }

    const source = events.find((ev) => ev.id === id);
    if (!source) return;

    setDuplicatingId(id);
    const supabase = createClient();
    try {
      // Re-validar cuota fresca en BD antes de insertar
      if (!isDuoExempt) {
        const { data: freshRows } = await supabase
          .from('events')
          .select('id, status, created_at, deleted_at');
        const freshGuard = canCreateProject(
          entitlements,
          countProjectsForQuota((freshRows as any[]) || [])
        );
        if (!freshGuard.allowed) {
          setErrorMsg(
            freshGuard.reason ||
              `Alcanzó el límite de proyectos de su plan (${freshGuard.current}/${freshGuard.limit}).`
          );
          return;
        }
      }

      const fullInsertPayload: Record<string, unknown> = {
        organization_id: source.organization_id || organization?.id,
        name: `${source.name} (Copia)`,
        client_company: source.client_company,
        location: source.location,
        event_date: source.event_date,
        month: source.month,
        year: source.year,
        description: source.description,
        status: 'planning',
        has_retail_sales: canUseConsolidation ? Boolean(source.has_retail_sales) : false,
        currency: source.currency || 'CLP',
        exchange_rate: source.exchange_rate || 1,
        base_quantity: source.base_quantity ?? null,
        project_type: source.project_type ?? null,
        mermas_pct: 0,
        payment_terms: source.payment_terms ?? null,
        tax_regime: source.tax_regime || organization?.tax_regime || 'afecto_iva',
        is_demo_base: false,
      };

      let { data: createdEvent, error: evErr } = await (supabase.from('events') as any)
        .insert(fullInsertPayload)
        .select()
        .single();

      if (evErr && (evErr.code === 'PGRST204' || String(evErr.message || '').includes('column'))) {
        const {
          base_quantity: _bq,
          project_type: _pt,
          mermas_pct: _mp,
          payment_terms: _pay,
          tax_regime: _tr,
          ...basePayload
        } = fullInsertPayload;
        const retry = await (supabase.from('events') as any)
          .insert(basePayload)
          .select()
          .single();
        createdEvent = retry.data;
        evErr = retry.error;
      }

      if (evErr || !createdEvent) throw evErr || new Error('No se pudo duplicar');

      const { data: sourceItems } = await supabase
        .from('event_items')
        .select('*')
        .eq('event_id', id);

      const copyItems = ((sourceItems as any[]) || [])
        .filter(
          (it) =>
            !it.parent_id &&
            it.tipo_evento !== 'ABONO_CLIENTE' &&
            it.tipo_evento !== 'GASTO_REAL' &&
            it.servicio !== 'ABONO_CLIENTE' &&
            it.servicio !== 'GASTO_REAL'
        )
        .map((it) => ({
          organization_id: createdEvent.organization_id || organization?.id,
          event_id: createdEvent.id,
          servicio: it.servicio,
          detalle: it.detalle,
          tipo_evento: it.tipo_evento,
          cantidad: it.cantidad,
          costo: it.costo,
          ganancia: it.ganancia,
          valor_neto: it.valor_neto,
          iva: it.iva,
          valor_total: it.valor_total,
          margen: it.margen,
          tipo_doc_costo: it.tipo_doc_costo,
          approved: false,
          parent_id: null,
          es_insumo: Boolean(it.es_insumo),
          iva_incluido: it.iva_incluido ?? true,
          es_exento: Boolean(it.es_exento),
          es_exento_compra: Boolean(it.es_exento_compra),
          is_pass_through: Boolean(it.is_pass_through || it.es_reembolsable),
          es_reembolsable: Boolean(it.es_reembolsable || it.is_pass_through),
          currency: it.currency || 'CLP',
          exchange_rate: it.exchange_rate || 1,
          is_demo_base: false,
        }));

      if (copyItems.length > 0) {
        const { error: itemsErr } = await (supabase.from('event_items') as any).insert(copyItems);
        if (itemsErr && (itemsErr.code === 'PGRST204' || String(itemsErr.message || '').includes('column'))) {
          const fallbackItems = copyItems.map(
            ({
              es_exento: _ee,
              es_exento_compra: _ec,
              is_pass_through: _pt,
              es_reembolsable: _er,
              currency: _cu,
              exchange_rate: _xr,
              ...rest
            }) => rest
          );
          await (supabase.from('event_items') as any).insert(fallbackItems);
        }
      }

      await fetchEvents();
      setToastMsg(`"${source.name}" duplicado en Borrador (${copyItems.length} partidas).`);
      setTimeout(() => setToastMsg(null), 3000);
    } catch (err: any) {
      console.error('Error duplicando proyecto:', err);
      setErrorMsg(err?.message || 'No se pudo duplicar el registro.');
    } finally {
      setDuplicatingId(null);
    }
  };

  const handleDeleteToTrash = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const targetEvent = events.find((ev) => ev.id === id);
    if (targetEvent?.is_demo_base) {
      alert(
        'Este registro es un Ejemplo Base del Sandbox y está protegido. Puede duplicarlo o crear sus propios registros para probar eliminaciones.'
      );
      return;
    }

    if (entitlements.isExpiredLock) {
      setErrorMsg(
        'Su suscripción está vencida. Reactive su plan para modificar o archivar registros.'
      );
      return;
    }

    const firstConfirm = window.confirm(
      `¿Está seguro de que desea mover este ${terms.projectSingular.toLowerCase()} a la papelera?`
    );
    if (!firstConfirm) return;

    const doubleConfirm = window.prompt('Para confirmar, escriba la palabra "ELIMINAR"');
    if (doubleConfirm !== 'ELIMINAR') {
      if (doubleConfirm !== null) alert('Cancelado. No se escribió "ELIMINAR" correctamente.');
      return;
    }

    const supabase = createClient();
    try {
      const { error } = await (supabase.from('events') as any)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      await fetchEvents();
    } catch (err) {
      console.error('Error al enviar a papelera:', err);
      alert('Hubo un error al mover a la papelera.');
    }
  };

  const filteredEvents = events.filter((event) => {
    const matchesSearch =
      event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (event.client_company && event.client_company.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || event.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const reachedProjectLimit = !isDuoExempt && !projectGuard.allowed;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{terms.projectPlural}</h1>
          <p className="text-muted-foreground mt-1">
            Gestión de {terms.projectPlural.toLowerCase()} y planificación financiera
          </p>
        </div>
        <div className="flex gap-2" data-tour-id="events-new-btn">
          <Link href="/events/trash">
            <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
              <Trash2 className="mr-2 h-4 w-4" /> Papelera
            </Button>
          </Link>
          {reachedProjectLimit ? (
            <Link href="/billing">
              <Button className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold">
                {entitlements.isExpiredLock
                  ? 'Reactivar Plan'
                  : `Ampliar Cupo (${projectGuard.current}/${projectGuard.limit ?? '∞'})`}
              </Button>
            </Link>
          ) : (
            <Link href="/events/new">
              <Button className="tactile-press">
                <Plus className="mr-2 h-4 w-4" /> {terms.newProjectCta}
              </Button>
            </Link>
          )}
        </div>
      </div>

      {toastMsg && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-800 flex items-center gap-2"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{toastMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-xs font-medium text-destructive flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <Link href="/billing" className="underline font-semibold shrink-0">
            Ver Planes
          </Link>
        </div>
      )}

      {reachedProjectLimit && (
        <FeatureLockCard
          compact
          isExpiredLock={entitlements.isExpiredLock}
          title={
            entitlements.isExpiredLock
              ? 'Suscripción pendiente de renovación'
              : projectGuard.mode === 'monthly'
              ? `Alcanzó el límite mensual de ${projectGuard.limit} ${terms.projectPlural.toLowerCase()} nuevos`
              : `Alcanzó el límite de ${projectGuard.limit} ${terms.projectPlural.toLowerCase()} activos`
          }
          description={
            projectGuard.reason ||
            `Todos sus ${terms.projectPlural.toLowerCase()} históricos permanecen intactos y visibles. Actualice su suscripción para crear o duplicar ${terms.projectPlural.toLowerCase()}.`
          }
          requiredPlanLabel={requiredUpgradePlanName}
        />
      )}

      <div className="flex flex-col sm:flex-row gap-4" data-tour-id="events-filters">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Buscar por nombre o ${terms.clientLabel.toLowerCase()}...`}
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: 'all', label: 'Todos' },
            { value: 'planning', label: 'En Planificación' },
            { value: 'approved', label: 'Aprobado' },
            { value: 'completed', label: 'Completado' },
          ]}
        />
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredEvents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-tour-id="events-grid">
          {filteredEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onDelete={handleDeleteToTrash}
              onDuplicate={handleDuplicate}
              duplicating={duplicatingId === event.id}
              canDuplicate={canDuplicate}
              projectSingular={terms.projectSingular}
              isDemo={isDemo}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 border rounded-lg bg-muted/20">
          <h3 className="text-lg font-medium">No se encontraron {terms.projectPlural.toLowerCase()}</h3>
          <p className="text-muted-foreground mt-2">
            {events.length === 0
              ? `No hay ${terms.projectPlural.toLowerCase()} registrados. Cree su primer ${terms.projectSingular.toLowerCase()}.`
              : `No hay ${terms.projectPlural.toLowerCase()} que coincidan con los filtros actuales.`}
          </p>
        </div>
      )}
    </div>
  );
}
