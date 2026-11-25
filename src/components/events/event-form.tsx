'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useWorkspaceConfig } from '@/hooks/use-workspace-config';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { formatDateCL, parseDateSafe } from '@/lib/utils';
import { AlertTriangle, Coins, Store, Sparkles } from 'lucide-react';
import type { QuoteCurrency } from '@/types/database';

export function EventForm() {
  const router = useRouter();
  const supabase = createClient();
  const { terms, entitlements, isDuoExempt, isDemo, organization } = useWorkspaceConfig();
  const canUseConsolidation =
    isDuoExempt || isDemo || entitlements.modules.mod_consolidation_retail;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasRetailSales, setHasRetailSales] = useState(false);
  const [eventDate, setEventDate] = useState('');
  const [sameDateConflicts, setSameDateConflicts] = useState<{ id: string; name: string }[]>([]);
  const [currency, setCurrency] = useState<QuoteCurrency>('CLP');
  const [exchangeRate, setExchangeRate] = useState('1');

  useEffect(() => {
    if (!eventDate) {
      setSameDateConflicts([]);
      return;
    }
    let active = true;
    supabase
      .from('events')
      .select('id, name, status, quote_status')
      .eq('event_date', eventDate)
      .is('deleted_at', null)
      .then(({ data }) => {
        if (!active || !data) return;
        const activeOnDate = (data as any[]).filter(
          (e) => (e.status === 'planning' || e.status === 'approved') && e.quote_status !== 'rejected'
        );
        setSameDateConflicts(activeOnDate.map((e) => ({ id: e.id, name: e.name })));
      });
    return () => {
      active = false;
    };
  }, [eventDate, supabase]);

  const handleCurrencyChange = (next: QuoteCurrency) => {
    setCurrency(next);
    if (next === 'UF') {
      setExchangeRate(String(organization?.uf_rate_clp ?? 41405));
    } else if (next === 'USD') {
      setExchangeRate(String(organization?.usd_rate_clp ?? 1025));
    } else {
      setExchangeRate('1');
    }
  };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const client_company = formData.get('client_company') as string;
    const location = formData.get('location') as string;
    const event_date = eventDate || (formData.get('event_date') as string);
    const description = formData.get('description') as string;
    const parsedRate = currency === 'CLP' ? 1 : Math.max(1, Number(exchangeRate) || 1);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('No se pudo autenticar al usuario. Por favor inicie sesión.');
      }

      // Soft-Lock en creación por cuota de plan (mensual en planes de pago; total en Free; exento DUO y Demo)
      if (!isDuoExempt && !isDemo && entitlements.maxProjects !== null) {
        const { data: existingRows } = await supabase
          .from('events')
          .select('id, created_at')
          .is('deleted_at', null);

        const now = new Date();
        const monthStartIso = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const counting =
          entitlements.effectiveTier === 'free'
            ? (existingRows || []).length
            : (existingRows || []).filter((r: any) => !r.created_at || r.created_at >= monthStartIso).length;

        if (counting >= entitlements.maxProjects) {
          throw new Error(
            `Alcanzaste el máximo de ${entitlements.maxProjects} ${terms.projectPlural.toLowerCase()} de tu plan actual. Mejora tu plan en Suscripción & Estilo (tus datos existentes no se pierden).`
          );
        }
      }

      let month = null;
      let year = null;
      if (event_date) {
        const parsed = parseDateSafe(event_date);
        month = parsed.month;
        year = parsed.year;
      }

      let { error: insertError } = await supabase.from('events').insert({
        name,
        client_company: client_company || null,
        location: location || null,
        event_date: event_date || null,
        description: description || null,
        status: 'planning',
        created_by: user.id,
        month,
        year,
        has_retail_sales: hasRetailSales,
        currency,
        exchange_rate: parsedRate,
      } as any).select().single();

      if (
        insertError &&
        (insertError.message?.includes('has_retail_sales') ||
          insertError.message?.includes('currency') ||
          insertError.message?.includes('exchange_rate') ||
          insertError.code === 'PGRST204')
      ) {
        console.warn('Optional columns missing in schema, retrying base insert.');
        const retry = await supabase.from('events').insert({
          name,
          client_company: client_company || null,
          location: location || null,
          event_date: event_date || null,
          description: description || null,
          status: 'planning',
          created_by: user.id,
          month,
          year,
        } as any).select().single();
        insertError = retry.error;
      }

      if (insertError) throw insertError;

      router.push('/events');
      router.refresh();
    } catch (err: any) {
      console.error(err);
      if (err?.code === '42501') {
        setError('Alcanzaste el límite de eventos de prueba simultáneos. Presiona "Resetear Prueba" en la barra superior para limpiar tus pruebas y crear nuevos eventos.');
      } else {
        setError(err.message || 'Ocurrió un error al crear el evento.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {error && (
        <div className="bg-destructive/15 text-destructive p-3 rounded-md text-sm">
          {error}
        </div>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="name">Nombre de {terms.projectSingular} *</Label>
        <Input id="name" name="name" required placeholder={`Ej. ${terms.projectSingular} Anual 2026`} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="client_company">{terms.clientLabel}</Label>
        <Input id="client_company" name="client_company" placeholder="Nombre de la empresa o cliente" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="event_date">Fecha</Label>
          <Input
            id="event_date"
            name="event_date"
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
          />
          {sameDateConflicts.length > 0 && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-900 flex items-start gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Ya existe {sameDateConflicts.length} {terms.projectSingular.toLowerCase()} el {formatDateCL(eventDate)} ({sameDateConflicts.map((c) => c.name).slice(0, 2).join(', ')}). Revisa disponibilidad en Tesorería → Agenda.
              </span>
            </div>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="location">{terms.locationLabel}</Label>
          <Input id="location" name="location" placeholder="Dirección o recinto" />
        </div>
      </div>

      {/* Multimoneda del Presupuesto */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-border/80 bg-muted/20 p-3.5">
        <div className="space-y-1.5">
          <Label htmlFor="currency" className="text-xs font-medium flex items-center gap-1.5">
            <Coins className="h-3.5 w-3.5 text-primary" />
            Moneda de Cotización al Cliente
          </Label>
          <select
            id="currency"
            value={currency}
            onChange={(e) => handleCurrencyChange(e.target.value as QuoteCurrency)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-2xs"
          >
            <option value="CLP">Peso Chileno (CLP)</option>
            <option value="UF">Unidad de Fomento (UF)</option>
            <option value="USD">Dólar Estadounidense (USD)</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="exchange_rate" className="text-xs font-medium">
            {currency === 'CLP' ? 'Tipo de Cambio (Base CLP)' : `Valor Referencia 1 ${currency} (CLP)`}
          </Label>
          <Input
            id="exchange_rate"
            type="number"
            min={1}
            step={1}
            disabled={currency === 'CLP'}
            value={exchangeRate}
            onChange={(e) => setExchangeRate(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descripción y Alcance</Label>
        <textarea 
          id="description" 
          name="description" 
          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="Describe el alcance, requerimientos técnicos, cantidades o especificaciones..."
          rows={4}
        />
        <p className="text-xs text-muted-foreground mt-1">
          En el siguiente paso podrás adjuntar documentos PDF o Excel para extraer costos automáticamente si tu plan incluye Suite IA.
        </p>
      </div>

      {/* Selector de Modo de Venta / Tipo de Operación */}
      <div className="rounded-xl border border-border/80 bg-card/60 p-4.5 space-y-3 transition-all">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <Label htmlFor="has_retail_sales" className="text-sm font-semibold flex items-center gap-2 cursor-pointer">
              <Store className="h-4 w-4 text-primary" />
              {terms.retailModeLabel}
            </Label>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {terms.retailModeDesc}
            </p>
          </div>
          <input 
            type="checkbox" 
            id="has_retail_sales" 
            checked={canUseConsolidation ? hasRetailSales : false}
            disabled={!canUseConsolidation}
            onChange={(e) => {
              if (!canUseConsolidation) return;
              setHasRetailSales(e.target.checked);
            }}
            className="h-5 w-5 mt-0.5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
          />
        </div>
        {!canUseConsolidation && (
          <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
            Disponible en <strong>Crecimiento Inteligente IA</strong> o módulo <strong>Consolidación & Retail</strong>.
          </div>
        )}
        {hasRetailSales && (
          <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20 text-xs text-primary font-medium flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            <span>Sección de retail y consolidación de costos activada para este evento.</span>
          </div>
        )}
      </div>

      <Button type="submit" disabled={loading} className="w-full tactile-press">
        {loading ? 'Creando...' : `Crear ${terms.projectSingular} y Continuar`}
      </Button>
    </form>
  );
}
