'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Trash2, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useWorkspaceConfig } from '@/hooks/use-workspace-config';
import { FeatureLockCard } from '@/components/billing/feature-gate';
import { EventCard } from '@/components/events/event-card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Event } from '@/types';

export default function EventsPage() {
  const { terms, industry, entitlements, isDuoExempt, isDemo, organization } = useWorkspaceConfig();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setEvents(data as Event[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchEvents();
    const onRefresh = () => fetchEvents();
    window.addEventListener('kairos:local-db-changed', onRefresh);
    window.addEventListener('kairos:org-updated', onRefresh);
    return () => {
      window.removeEventListener('kairos:local-db-changed', onRefresh);
      window.removeEventListener('kairos:org-updated', onRefresh);
    };
  }, [fetchEvents, industry.id]);

  const handleDuplicate = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const source = events.find((ev) => ev.id === id);
    if (!source) return;

    setDuplicatingId(id);
    const supabase = createClient();
    try {
      const { data: createdEvent, error: evErr } = await (supabase.from('events') as any)
        .insert({
          organization_id: source.organization_id || organization?.id,
          name: `${source.name} (Copia)`,
          client_company: source.client_company,
          location: source.location,
          event_date: source.event_date,
          month: source.month,
          year: source.year,
          description: source.description,
          status: 'planning',
          has_retail_sales: Boolean(source.has_retail_sales),
          is_demo_base: false,
        })
        .select()
        .single();

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
            it.tipo_evento !== 'GASTO_REAL'
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
          is_demo_base: false,
        }));

      if (copyItems.length > 0) {
        await (supabase.from('event_items') as any).insert(copyItems);
      }

      await fetchEvents();
      setToastMsg(`"${source.name}" duplicado en Borrador (${copyItems.length} partidas).`);
      setTimeout(() => setToastMsg(null), 3000);
    } catch (err) {
      console.error('Error duplicando proyecto:', err);
      alert('No se pudo duplicar el registro.');
    } finally {
      setDuplicatingId(null);
    }
  };

  const handleDeleteToTrash = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const targetEvent = events.find((ev) => ev.id === id);
    if (targetEvent?.is_demo_base) {
      alert('Este registro es un Ejemplo Base del Sandbox y está protegido. Puedes duplicarlo o crear los tuyos para probar eliminaciones.');
      return;
    }

    const firstConfirm = window.confirm(`¿Estás seguro de que deseas mover este ${terms.projectSingular.toLowerCase()} a la papelera?`);
    if (!firstConfirm) return;

    const doubleConfirm = window.prompt('Para confirmar, escribe la palabra "ELIMINAR"');
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
      setEvents(events.filter((ev) => ev.id !== id));
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

  const startOfCurrentMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  const projectsCountingAgainstLimit =
    entitlements.effectiveTier === 'free'
      ? events.length
      : events.filter((ev) => {
          const ts = ev.created_at ? new Date(ev.created_at).getTime() : 0;
          return ts >= startOfCurrentMonth;
        }).length;

  const reachedProjectLimit =
    !isDuoExempt &&
    !isDemo &&
    entitlements.maxProjects !== null &&
    projectsCountingAgainstLimit >= entitlements.maxProjects;

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
                Ampliar Cupo ({projectsCountingAgainstLimit}/{entitlements.maxProjects})
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
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{toastMsg}</span>
        </div>
      )}

      {reachedProjectLimit && (
        <FeatureLockCard
          compact
          isExpiredLock={entitlements.isExpiredLock}
          title={`Alcanzaste el límite de ${entitlements.maxProjects} ${terms.projectPlural.toLowerCase()} de tu plan actual`}
          description={`Todos tus ${terms.projectPlural.toLowerCase()} históricos permanecen intactos y visibles. Mejora tu suscripción para crear ${terms.projectPlural.toLowerCase()} adicionales o ilimitados.`}
          requiredPlanLabel="Operación Esencial / Ilimitado"
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
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 border rounded-lg bg-muted/20">
          <h3 className="text-lg font-medium">No se encontraron {terms.projectPlural.toLowerCase()}</h3>
          <p className="text-muted-foreground mt-2">
            {events.length === 0
              ? `No hay ${terms.projectPlural.toLowerCase()} registrados. Crea tu primer ${terms.projectSingular.toLowerCase()}.`
              : `No hay ${terms.projectPlural.toLowerCase()} que coincidan con los filtros actuales.`}
          </p>
        </div>
      )}
    </div>
  );
}
