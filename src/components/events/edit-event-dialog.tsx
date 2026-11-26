'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Edit2,
  Loader2,
  Building2,
  Calendar,
  MapPin,
  FileText,
  CalendarDays,
  Save,
  Store,
  Sparkles,
  Coins,
  AlertTriangle,
  Hash,
  Tag,
  Receipt,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useWorkspaceConfig } from '@/hooks/use-workspace-config';
import { canUseModule, requiredPlanForModule } from '@/lib/plan-guards';
import { DEFAULT_UF_RATE_CLP, DEFAULT_USD_RATE_CLP } from '@/lib/finance-core';
import {
  getBaseQuantityConfig,
  getProjectTypeOptions,
  TAX_REGIME_OPTIONS,
} from '@/components/events/project-helpers';
import { formatDateCL, parseDateSafe } from '@/lib/utils';
import { Event } from '@/types';
import type { QuoteCurrency, TaxRegime } from '@/types/database';

interface EditEventDialogProps {
  event: Event;
  onUpdate: (updated: Event) => void;
}

export function EditEventDialog({ event, onUpdate }: EditEventDialogProps) {
  const { entitlements, isDuoExempt, organization, terms, industry, plans } =
    useWorkspaceConfig();
  const canUseConsolidation =
    isDuoExempt || canUseModule(entitlements, 'mod_consolidation_retail');
  const consolidationPlan = requiredPlanForModule('mod_consolidation_retail', plans);
  const baseQtyCfg = getBaseQuantityConfig(industry.id);
  const projectTypeOptions = getProjectTypeOptions(industry.id);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sameDateAlert, setSameDateAlert] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: event.name || '',
    client_company: event.client_company || '',
    location: event.location || '',
    event_date: event.event_date || '',
    description: event.description || '',
    has_retail_sales: event.has_retail_sales || false,
    currency: (event.currency || 'CLP') as QuoteCurrency,
    exchange_rate: String(event.exchange_rate || 1),
    base_quantity: event.base_quantity ? String(event.base_quantity) : '',
    project_type: event.project_type || projectTypeOptions[0] || '',
    tax_regime: (event.tax_regime || organization?.tax_regime || 'afecto_iva') as TaxRegime,
  });

  useEffect(() => {
    if (open) {
      setFormData({
        name: event.name || '',
        client_company: event.client_company || '',
        location: event.location || '',
        event_date: event.event_date || '',
        description: event.description || '',
        has_retail_sales: event.has_retail_sales || false,
        currency: (event.currency || 'CLP') as QuoteCurrency,
        exchange_rate: String(
          event.exchange_rate ||
            (event.currency === 'UF'
              ? organization?.uf_rate_clp ?? DEFAULT_UF_RATE_CLP
              : event.currency === 'USD'
              ? organization?.usd_rate_clp ?? DEFAULT_USD_RATE_CLP
              : 1)
        ),
        base_quantity: event.base_quantity ? String(event.base_quantity) : '',
        project_type: event.project_type || projectTypeOptions[0] || '',
        tax_regime: (event.tax_regime || organization?.tax_regime || 'afecto_iva') as TaxRegime,
      });
      setErrorMsg(null);
    }
  }, [
    open,
    event,
    organization?.uf_rate_clp,
    organization?.usd_rate_clp,
    organization?.tax_regime,
    projectTypeOptions,
  ]);

  useEffect(() => {
    if (!open || !formData.event_date) {
      setSameDateAlert(null);
      return;
    }
    let active = true;
    const supabase = createClient();
    supabase
      .from('events')
      .select('id, name, status, quote_status')
      .eq('event_date', formData.event_date)
      .is('deleted_at', null)
      .then(({ data }) => {
        if (!active || !data) return;
        const others = (data as any[]).filter(
          (e) =>
            e.id !== event.id &&
            (e.status === 'planning' || e.status === 'approved') &&
            e.quote_status !== 'rejected'
        );
        if (others.length > 0) {
          setSameDateAlert(
            `Tope de agenda detectado el ${formatDateCL(formData.event_date)} con "${others[0].name}".`
          );
        } else {
          setSameDateAlert(null);
        }
      });
    return () => {
      active = false;
    };
  }, [open, formData.event_date, event.id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMsg(`El nombre del ${terms.projectSingular.toLowerCase()} es obligatorio.`);
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    const supabase = createClient();

    let month = null;
    let year = null;
    if (formData.event_date) {
      const parsed = parseDateSafe(formData.event_date);
      month = parsed.month;
      year = parsed.year;
    }

    try {
      const parsedRate =
        formData.currency === 'CLP' ? 1 : Math.max(1, Number(formData.exchange_rate) || 1);
      const parsedBaseQty =
        formData.base_quantity.trim() !== ''
          ? Math.max(1, Number(formData.base_quantity) || 0)
          : null;

      let { data, error } = await (supabase.from('events') as any)
        .update({
          name: formData.name.trim(),
          client_company: formData.client_company.trim() || null,
          location: formData.location.trim() || null,
          event_date: formData.event_date || null,
          description: formData.description.trim() || null,
          month,
          year,
          has_retail_sales: canUseConsolidation ? formData.has_retail_sales : false,
          currency: formData.currency,
          exchange_rate: parsedRate,
          base_quantity: parsedBaseQty,
          project_type: formData.project_type || null,
          tax_regime: formData.tax_regime,
        })
        .eq('id', event.id)
        .select()
        .single();

      if (
        error &&
        (error.message?.includes('has_retail_sales') ||
          error.message?.includes('currency') ||
          error.message?.includes('exchange_rate') ||
          error.message?.includes('base_quantity') ||
          error.message?.includes('project_type') ||
          error.message?.includes('tax_regime') ||
          error.code === 'PGRST204')
      ) {
        console.warn('Optional columns missing in schema, retrying base update.');
        const retry = await (supabase.from('events') as any)
          .update({
            name: formData.name.trim(),
            client_company: formData.client_company.trim() || null,
            location: formData.location.trim() || null,
            event_date: formData.event_date || null,
            description: formData.description.trim() || null,
            month,
            year,
          })
          .eq('id', event.id)
          .select()
          .single();
        data = retry.data;
        error = retry.error;
      }

      if (error) {
        throw error;
      }

      if (data) {
        onUpdate(data as Event);
        setOpen(false);
      }
    } catch (err: any) {
      console.error('Error al actualizar proyecto:', err);
      setErrorMsg(
        err.message ||
          `Error al actualizar el ${terms.projectSingular.toLowerCase()}. Intente nuevamente.`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        disabled={entitlements.isExpiredLock}
        className="ml-3 h-8 gap-1.5 rounded-lg border-border/80 bg-background/80 hover:bg-muted/80 text-xs font-medium shadow-xs transition-all hover:border-primary/40"
        onClick={() => setOpen(true)}
      >
        <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
        <span>Editar</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 max-h-[inherit] overflow-hidden">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle>Editar {terms.projectSingular}</DialogTitle>
                <DialogDescription>
                  Modifique los detalles generales, fechas, moneda y régimen tributario.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4.5 custom-scrollbar">
            {errorMsg && (
              <div className="p-3 text-xs font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-xl">
                {errorMsg}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="edit-name" className="text-xs font-medium text-foreground flex items-center gap-1">
                Nombre de {terms.projectSingular} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder={`Ej. ${terms.projectSingular} Corporativo 2026`}
                className="rounded-xl border-border/80 focus-visible:ring-primary/20"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-client_company" className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  {terms.clientLabel}
                </Label>
                <Input
                  id="edit-client_company"
                  name="client_company"
                  value={formData.client_company}
                  onChange={handleChange}
                  placeholder="Empresa o mandante"
                  className="rounded-xl border-border/80 focus-visible:ring-primary/20"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-event_date" className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  Fecha Programada
                </Label>
                <Input
                  id="edit-event_date"
                  name="event_date"
                  type="date"
                  value={formData.event_date}
                  onChange={handleChange}
                  className="rounded-xl border-border/80 focus-visible:ring-primary/20"
                />
              </div>
            </div>

            {sameDateAlert && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] text-amber-900 flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                <span>{sameDateAlert}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-base_quantity" className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <Hash className="h-3.5 w-3.5 text-primary" />
                  {baseQtyCfg.label}
                </Label>
                <div className="relative">
                  <Input
                    id="edit-base_quantity"
                    type="number"
                    min={1}
                    value={formData.base_quantity}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, base_quantity: e.target.value }))
                    }
                    placeholder={baseQtyCfg.placeholder}
                    className="rounded-xl pr-14"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-muted-foreground font-medium pointer-events-none">
                    {baseQtyCfg.unit}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-project_type" className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                  Tipo de {terms.projectSingular}
                </Label>
                <select
                  id="edit-project_type"
                  value={formData.project_type}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, project_type: e.target.value }))
                  }
                  className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-1 text-xs"
                >
                  {projectTypeOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Moneda y Régimen SII */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-xl border border-border/80 bg-muted/20 p-3">
              <div className="space-y-1">
                <Label htmlFor="edit_currency" className="text-xs font-medium flex items-center gap-1.5">
                  <Coins className="h-3.5 w-3.5 text-primary" />
                  Moneda
                </Label>
                <select
                  id="edit_currency"
                  value={formData.currency}
                  onChange={(e) => {
                    const next = e.target.value as QuoteCurrency;
                    const nextRate =
                      next === 'UF'
                        ? String(organization?.uf_rate_clp ?? DEFAULT_UF_RATE_CLP)
                        : next === 'USD'
                        ? String(organization?.usd_rate_clp ?? DEFAULT_USD_RATE_CLP)
                        : '1';
                    setFormData((prev) => ({
                      ...prev,
                      currency: next,
                      exchange_rate: nextRate,
                    }));
                  }}
                  className="flex h-9 w-full rounded-xl border border-input bg-background px-2.5 py-1 text-xs"
                >
                  <option value="CLP">CLP</option>
                  <option value="UF">UF</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit_exchange_rate" className="text-xs font-medium">
                  Valor (CLP)
                </Label>
                <Input
                  id="edit_exchange_rate"
                  type="number"
                  min={1}
                  disabled={formData.currency === 'CLP'}
                  value={formData.exchange_rate}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, exchange_rate: e.target.value }))
                  }
                  className="rounded-xl h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit_tax_regime" className="text-xs font-medium flex items-center gap-1">
                  <Receipt className="h-3.5 w-3.5 text-primary" />
                  Régimen SII
                </Label>
                <select
                  id="edit_tax_regime"
                  value={formData.tax_regime}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, tax_regime: e.target.value as TaxRegime }))
                  }
                  className="flex h-9 w-full rounded-xl border border-input bg-background px-2 py-1 text-xs"
                >
                  {TAX_REGIME_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.shortLabel}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-location" className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                {terms.locationLabel}
              </Label>
              <Input
                id="edit-location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="Ej. Av. Apoquindo 3000, Las Condes / Remoto"
                className="rounded-xl border-border/80 focus-visible:ring-primary/20"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-description" className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  Descripción / Alcance
                </Label>
                <span className="text-[11px] text-muted-foreground">Opcional</span>
              </div>
              <textarea
                id="edit-description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                placeholder="Describa detalles operativos, cronograma, requerimientos u observaciones..."
                className="flex min-h-[95px] w-full rounded-xl border border-input bg-background/50 px-3.5 py-2.5 text-sm font-normal ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all custom-scrollbar resize-y"
              />
            </div>

            <div className="rounded-xl border border-border/80 bg-card/60 p-4 space-y-3 transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <Label htmlFor="edit_has_retail_sales" className="text-xs font-semibold flex items-center gap-1.5 cursor-pointer">
                    <Store className="h-3.5 w-3.5 text-primary" />
                    {terms.retailModeLabel}
                  </Label>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {terms.retailModeDesc}
                  </p>
                </div>
                <input
                  type="checkbox"
                  id="edit_has_retail_sales"
                  checked={canUseConsolidation ? formData.has_retail_sales : false}
                  disabled={!canUseConsolidation}
                  onChange={(e) => {
                    if (!canUseConsolidation) return;
                    setFormData((prev) => ({ ...prev, has_retail_sales: e.target.checked }));
                  }}
                  className="h-4 w-4 mt-0.5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                />
              </div>
              {!canUseConsolidation && (
                <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900">
                  Requiere <strong>{consolidationPlan.name}</strong> o módulo{' '}
                  <strong>Consolidación &amp; Retail</strong>.
                </div>
              )}
              {canUseConsolidation && formData.has_retail_sales && (
                <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-[11px] text-primary font-medium flex items-center gap-2">
                  <Sparkles className="h-3 w-3 shrink-0" />
                  <span>Consolidación padre/hijo y prorrateo habilitado.</span>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="rounded-xl"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="rounded-xl gap-1.5 shadow-sm">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Guardar Cambios</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
}
