'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useWorkspaceConfig } from '@/hooks/use-workspace-config';
import {
  canCreateProject,
  canUseModule,
  countProjectsForQuota,
  requiredPlanForModule,
  type ProjectUsageCounts,
} from '@/lib/plan-guards';
import { DEFAULT_UF_RATE_CLP, DEFAULT_USD_RATE_CLP } from '@/lib/finance-core';
import {
  getBaseQuantityConfig,
  getProjectTypeOptions,
  TAX_REGIME_OPTIONS,
} from '@/components/events/project-helpers';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { formatDateCL, parseDateSafe } from '@/lib/utils';
import { AlertTriangle, Coins, Store, Sparkles, Hash, Tag, Receipt } from 'lucide-react';
import type { QuoteCurrency, TaxRegime } from '@/types/database';

interface EventFormProps {
  disabled?: boolean;
  initialQuotaCount?: ProjectUsageCounts;
}

export function EventForm({ disabled = false }: EventFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const { terms, industry, entitlements, plans, isDuoExempt, organization } =
    useWorkspaceConfig();
  const canUseConsolidation =
    isDuoExempt || canUseModule(entitlements, 'mod_consolidation_retail');
  const consolidationPlan = requiredPlanForModule('mod_consolidation_retail', plans);

  const baseQtyCfg = getBaseQuantityConfig(industry.id);
  const projectTypeOptions = getProjectTypeOptions(industry.id);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasRetailSales, setHasRetailSales] = useState(false);
  const [eventDate, setEventDate] = useState('');
  const [baseQuantity, setBaseQuantity] = useState('');
  const [projectType, setProjectType] = useState(projectTypeOptions[0] || '');
  const [taxRegime, setTaxRegime] = useState<TaxRegime>(
    organization?.tax_regime || 'afecto_iva'
  );
  const [sameDateConflicts, setSameDateConflicts] = useState<{ id: string; name: string }[]>([]);
  const [currency, setCurrency] = useState<QuoteCurrency>('CLP');
  const [exchangeRate, setExchangeRate] = useState('1');

  useEffect(() => {
    setProjectType(projectTypeOptions[0] || '');
  }, [industry.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (organization?.tax_regime) {
      setTaxRegime(organization.tax_regime);
    }
  }, [organization?.tax_regime]);

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
      setExchangeRate(String(organization?.uf_rate_clp ?? DEFAULT_UF_RATE_CLP));
    } else if (next === 'USD') {
      setExchangeRate(String(organization?.usd_rate_clp ?? DEFAULT_USD_RATE_CLP));
    } else {
      setExchangeRate('1');
    }
  };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (disabled) return;
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const name = String(formData.get('name') || '').trim();
    const client_company = String(formData.get('client_company') || '').trim();
    const location = String(formData.get('location') || '').trim();
    const event_date = eventDate || (formData.get('event_date') as string);
    const description = String(formData.get('description') || '').trim();
    const parsedRate = currency === 'CLP' ? 1 : Math.max(1, Number(exchangeRate) || 1);
    const parsedBaseQty = baseQuantity.trim() !== '' ? Math.max(1, Number(baseQuantity) || 0) : null;

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error('No se pudo autenticar al usuario. Por favor inicie sesión.');
      }

      if (!isDuoExempt) {
        const { data: existingRows } = await supabase
          .from('events')
          .select('id, status, created_at, deleted_at');

        const guard = canCreateProject(
          entitlements,
          countProjectsForQuota((existingRows as any[]) || [])
        );
        if (!guard.allowed) {
          throw new Error(
            guard.reason ||
              `Alcanzó el máximo de ${guard.limit} ${terms.projectPlural.toLowerCase()} de su plan actual.`
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

      const fullPayload: Record<string, unknown> = {
        organization_id: organization?.id,
        name,
        client_company: client_company || null,
        location: location || null,
        event_date: event_date || null,
        description: description || null,
        status: 'planning',
        created_by: user.id,
        month,
        year,
        has_retail_sales: canUseConsolidation ? hasRetailSales : false,
        currency,
        exchange_rate: parsedRate,
        base_quantity: parsedBaseQty,
        project_type: projectType || null,
        tax_regime: taxRegime,
      };

      let { data: created, error: insertError } = await (supabase.from('events') as any)
        .insert(fullPayload)
        .select()
        .single();

      if (
        insertError &&
        (insertError.message?.includes('has_retail_sales') ||
          insertError.message?.includes('currency') ||
          insertError.message?.includes('exchange_rate') ||
          insertError.message?.includes('base_quantity') ||
          insertError.message?.includes('project_type') ||
          insertError.message?.includes('tax_regime') ||
          insertError.code === 'PGRST204')
      ) {
        console.warn('Optional columns missing in schema, retrying base insert.');
        const retry = await (supabase.from('events') as any)
          .insert({
            organization_id: organization?.id,
            name,
            client_company: client_company || null,
            location: location || null,
            event_date: event_date || null,
            description: description || null,
            status: 'planning',
            created_by: user.id,
            month,
            year,
          })
          .select()
          .single();
        created = retry.data;
        insertError = retry.error;
      }

      if (insertError) throw insertError;

      if (created?.id) {
        router.push(`/events/${created.id}`);
      } else {
        router.push('/events');
      }
      router.refresh();
    } catch (err: any) {
      console.error(err);
      if (err?.code === '42501') {
        setError(
          'Alcanzó el límite de registros de prueba simultáneos. Presione "Restaurar Demo" en la barra superior para limpiar sus pruebas.'
        );
      } else {
        setError(err.message || `Ocurrió un error al crear el ${terms.projectSingular.toLowerCase()}.`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {error && (
        <div role="alert" className="bg-destructive/15 text-destructive p-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Nombre de {terms.projectSingular} *</Label>
        <Input
          id="name"
          name="name"
          required
          disabled={disabled}
          placeholder={`Ej. ${terms.projectSingular} Corporativo 2026`}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="client_company">{terms.clientLabel}</Label>
          <Input
            id="client_company"
            name="client_company"
            disabled={disabled}
            placeholder="Nombre de la empresa o cliente"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="project_type" className="flex items-center gap-1.5">
            <Tag className="h-3.5 w-3.5 text-muted-foreground" />
            Tipo de {terms.projectSingular}
          </Label>
          <select
            id="project_type"
            disabled={disabled}
            value={projectType}
            onChange={(e) => setProjectType(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {projectTypeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="event_date">Fecha</Label>
          <Input
            id="event_date"
            name="event_date"
            type="date"
            disabled={disabled}
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
          />
          {sameDateConflicts.length > 0 && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-900 flex items-start gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Ya existe {sameDateConflicts.length} {terms.projectSingular.toLowerCase()} el{' '}
                {formatDateCL(eventDate)} ({sameDateConflicts.map((c) => c.name).slice(0, 2).join(', ')}).
              </span>
            </div>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="location">{terms.locationLabel}</Label>
          <Input
            id="location"
            name="location"
            disabled={disabled}
            placeholder="Dirección, recinto o modalidad"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="base_quantity" className="flex items-center gap-1.5">
            <Hash className="h-3.5 w-3.5 text-primary" />
            {baseQtyCfg.label}
          </Label>
          <div className="relative">
            <Input
              id="base_quantity"
              type="number"
              min={1}
              disabled={disabled}
              value={baseQuantity}
              onChange={(e) => setBaseQuantity(e.target.value)}
              placeholder={baseQtyCfg.placeholder}
              className="pr-16"
            />
            <span className="absolute right-3 top-2.5 text-xs text-muted-foreground font-medium pointer-events-none">
              {baseQtyCfg.unit}
            </span>
          </div>
        </div>
      </div>

      {/* Multimoneda y Régimen Tributario SII */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-xl border border-border/80 bg-muted/20 p-3.5">
        <div className="space-y-1.5">
          <Label htmlFor="currency" className="text-xs font-medium flex items-center gap-1.5">
            <Coins className="h-3.5 w-3.5 text-primary" />
            Moneda de Cotización
          </Label>
          <select
            id="currency"
            disabled={disabled}
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
            {currency === 'CLP' ? 'Tipo de Cambio (Base CLP)' : `Valor 1 ${currency} (CLP)`}
          </Label>
          <Input
            id="exchange_rate"
            type="number"
            min={1}
            step={1}
            disabled={disabled || currency === 'CLP'}
            value={exchangeRate}
            onChange={(e) => setExchangeRate(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tax_regime" className="text-xs font-medium flex items-center gap-1.5">
            <Receipt className="h-3.5 w-3.5 text-primary" />
            Régimen Tributario SII
          </Label>
          <select
            id="tax_regime"
            disabled={disabled}
            value={taxRegime}
            onChange={(e) => setTaxRegime(e.target.value as TaxRegime)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-2xs"
          >
            {TAX_REGIME_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.shortLabel}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descripción y Alcance</Label>
        <textarea
          id="description"
          name="description"
          disabled={disabled}
          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="Describa el alcance, requerimientos técnicos, cantidades o especificaciones..."
          rows={4}
        />
        <p className="text-xs text-muted-foreground mt-1">
          En el siguiente paso podrá adjuntar documentos PDF o Excel para extraer costos automáticamente si su plan incluye Suite IA.
        </p>
      </div>

      {/* Selector de Modo de Venta / Consolidación */}
      <div className="rounded-xl border border-border/80 bg-card/60 p-4.5 space-y-3 transition-all">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <Label htmlFor="has_retail_sales" className="text-sm font-semibold flex items-center gap-2 cursor-pointer">
              <Store className="h-4 w-4 text-primary" />
              {terms.retailModeLabel}
            </Label>
            <p className="text-xs text-muted-foreground leading-relaxed">{terms.retailModeDesc}</p>
          </div>
          <input
            type="checkbox"
            id="has_retail_sales"
            checked={canUseConsolidation ? hasRetailSales : false}
            disabled={disabled || !canUseConsolidation}
            onChange={(e) => {
              if (!canUseConsolidation) return;
              setHasRetailSales(e.target.checked);
            }}
            className="h-5 w-5 mt-0.5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
          />
        </div>
        {!canUseConsolidation && (
          <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
            Disponible desde <strong>{consolidationPlan.name}</strong> o módulo{' '}
            <strong>Consolidación &amp; Retail</strong>.
          </div>
        )}
        {hasRetailSales && canUseConsolidation && (
          <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20 text-xs text-primary font-medium flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            <span>
              Consolidación padre/hijo y prorrateo activados para este{' '}
              {terms.projectSingular.toLowerCase()}.
            </span>
          </div>
        )}
      </div>

      <Button type="submit" disabled={loading || disabled} className="w-full tactile-press">
        {loading
          ? 'Creando...'
          : disabled
          ? 'Cupo de Plan Alcanzado'
          : `Crear ${terms.projectSingular} y Continuar`}
      </Button>
    </form>
  );
}
