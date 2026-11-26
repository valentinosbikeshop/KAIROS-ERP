'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/use-user';
import { useWorkspaceConfig } from '@/hooks/use-workspace-config';
import { canUseAi, canUseModule, requiredPlanForModule } from '@/lib/plan-guards';
import { can, evaluateMarginPolicy, isAdminRole } from '@/lib/rbac';
import { logAudit } from '@/lib/audit';
import {
  computeItemFinancials,
  computeProjectFinancials,
  formatMoney,
  isBoletaHonorariosItem,
} from '@/lib/finance-core';
import {
  getBaseQuantityConfig,
  TAX_REGIME_OPTIONS,
} from '@/components/events/project-helpers';
import { FeatureLockCard } from '@/components/billing/feature-gate';
import { useParams } from 'next/navigation';
import { Event, EventItem } from '@/types';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileUpload } from '@/components/events/file-upload';
import { AiSuggestionsGrid } from '@/components/events/ai-suggestions-grid';
import { EventItemsTable } from '@/components/events/event-items-table';
import { FloatingFinancialAdvisor } from '@/components/events/floating-financial-advisor';
import { EditEventDialog } from '@/components/events/edit-event-dialog';
import { TransactionDialog } from '@/components/events/transaction-dialog';
import { ClientQuotePdfDialog } from '@/components/reports/client-quote-pdf-dialog';
import { EVENT_STATUS_LABELS, EVENT_STATUS_COLORS } from '@/lib/constants';
import { formatDateCL, formatCLP, formatPercentage } from '@/lib/utils';
import {
  Sparkles,
  FileText,
  CheckCircle,
  Loader2,
  Calendar,
  MapPin,
  Building2,
  DollarSign,
  CreditCard,
  Lock,
  ArrowLeft,
  Wand2,
  FileSpreadsheet,
  Store,
  Upload,
  Receipt,
  Share2,
  ExternalLink,
  Copy,
  Check,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Coins,
  Hash,
  Tag,
} from 'lucide-react';
import Link from 'next/link';

export default function EventDetailPage() {
  const params = useParams();
  const id = String(params?.id || '');
  const supabase = createClient();
  const { isDemo, profile, organization } = useUser();
  const { entitlements, isDuoExempt, terms, industry, plans } = useWorkspaceConfig();

  const aiGuard = canUseAi(entitlements);
  const canUseAiFlag = isDuoExempt || aiGuard.allowed;
  const aiPlan = requiredPlanForModule('mod_ai_suite', plans);
  const canUsePdf = isDuoExempt || canUseModule(entitlements, 'mod_pdf_quotes');
  const pdfPlan = requiredPlanForModule('mod_pdf_quotes', plans);
  const canUseTransactions =
    isDuoExempt || canUseModule(entitlements, 'mod_transactions_sii');
  const siiPlan = requiredPlanForModule('mod_transactions_sii', plans);

  const canViewMargins = isDuoExempt || can(profile, 'view_costs_margins', entitlements);
  const canEditQuotes =
    !entitlements.isExpiredLock &&
    (isDuoExempt || can(profile, 'create_edit_quotes', entitlements));
  const canSendQuotes =
    !entitlements.isExpiredLock &&
    (isDuoExempt || can(profile, 'send_quotes', entitlements));
  const canRecordTx =
    canUseTransactions &&
    !entitlements.isExpiredLock &&
    (isDuoExempt || can(profile, 'record_transactions', entitlements));
  const canManageStatus =
    !entitlements.isExpiredLock &&
    (isDuoExempt || isAdminRole(profile) || can(profile, 'approve_low_margin', entitlements));

  const baseQtyCfg = getBaseQuantityConfig(industry.id);

  const [event, setEvent] = useState<Event | null>(null);
  const [items, setItems] = useState<EventItem[]>([]);
  const [draftItems, setDraftItems] = useState<EventItem[]>([]);
  const [transactions, setTransactions] = useState<EventItem[]>([]);
  const [parsedText, setParsedText] = useState<string>('');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [customQuoteLocation, setCustomQuoteLocation] = useState<string>('');
  const [aiTargetMargin, setAiTargetMargin] = useState<number>(industry.targetMarginPct || 35);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [customAiLoading, setCustomAiLoading] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  const [sharingLink, setSharingLink] = useState(false);
  const [sharedUrl, setSharedUrl] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [approvingOverride, setApprovingOverride] = useState(false);
  const [sameDateCollisions, setSameDateCollisions] = useState<{ id: string; name: string }[]>([]);

  const [isTransactionOpen, setIsTransactionOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<'ABONO' | 'GASTO'>('ABONO');
  const [transactionToEdit, setTransactionToEdit] = useState<EventItem | undefined>();

  useEffect(() => {
    setAiTargetMargin(industry.targetMarginPct || 35);
  }, [industry.targetMarginPct]);

  const fetchEventData = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      // Null-guard estricto (evita TypeError al leer quote_token sobre null)
      if (eventError || !eventData) {
        setEvent(null);
        setItems([]);
        setDraftItems([]);
        setTransactions([]);
        return;
      }

      const loadedEvent = eventData as Event;
      setEvent(loadedEvent);
      if (loadedEvent.quote_token) {
        setSharedUrl(`/q/${loadedEvent.quote_token}`);
      } else if (isDemo && loadedEvent.quote_status && loadedEvent.quote_status !== 'draft') {
        setSharedUrl(`/q/demo-${loadedEvent.id}`);
      } else {
        setSharedUrl(null);
      }

      if (loadedEvent.event_date) {
        const { data: sameDayRows } = await supabase
          .from('events')
          .select('id, name, status, quote_status')
          .eq('event_date', loadedEvent.event_date)
          .is('deleted_at', null);

        if (sameDayRows) {
          setSameDateCollisions(
            (sameDayRows as any[])
              .filter(
                (r) =>
                  r.id !== loadedEvent.id &&
                  (r.status === 'planning' || r.status === 'approved') &&
                  r.quote_status !== 'rejected'
              )
              .map((r) => ({ id: r.id, name: r.name }))
          );
        }
      } else {
        setSameDateCollisions([]);
      }

      const { data: itemsData, error: itemsError } = await supabase
        .from('event_items')
        .select('*')
        .eq('event_id', id)
        .order('created_at', { ascending: true });

      if (itemsError) throw itemsError;

      const allItems = (itemsData as EventItem[]) || [];
      setItems(
        allItems.filter(
          (item) =>
            item.approved &&
            item.tipo_evento !== 'ABONO_CLIENTE' &&
            item.tipo_evento !== 'GASTO_REAL' &&
            item.servicio !== 'ABONO_CLIENTE' &&
            item.servicio !== 'GASTO_REAL'
        )
      );
      setDraftItems(
        allItems.filter(
          (item) =>
            !item.approved &&
            item.tipo_evento !== 'ABONO_CLIENTE' &&
            item.tipo_evento !== 'GASTO_REAL' &&
            item.servicio !== 'ABONO_CLIENTE' &&
            item.servicio !== 'GASTO_REAL'
        )
      );
      setTransactions(
        allItems.filter(
          (item) =>
            item.tipo_evento === 'ABONO_CLIENTE' ||
            item.tipo_evento === 'GASTO_REAL' ||
            item.servicio === 'ABONO_CLIENTE' ||
            item.servicio === 'GASTO_REAL'
        )
      );
    } catch (error) {
      console.error('Error fetching event data:', error);
    } finally {
      setLoading(false);
    }
  }, [id, supabase, isDemo]);

  useEffect(() => {
    fetchEventData();

    const channel = supabase
      .channel(`event_items_changes_${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_items',
          filter: `event_id=eq.${id}`,
        },
        () => {
          fetchEventData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchEventData, id, supabase]);

  const handleOpenTransaction = (type: 'ABONO' | 'GASTO', item?: EventItem) => {
    if (!canRecordTx) return;
    setTransactionType(type);
    setTransactionToEdit(item);
    setIsTransactionOpen(true);
  };

  const insertAiDraftSuggestions = async (suggestions: any[]) => {
    const activeTaxRegime = event?.tax_regime || organization?.tax_regime || 'afecto_iva';
    const newDrafts = suggestions.map((s: any) => {
      const tipoDoc = s.tipo_doc_costo === 'boleta' ? 'boleta' : 'factura';
      const rawCosto = Math.round(Number(s.costo) || 0);
      const ganancia = Math.round(Number(s.ganancia) || 0);
      const fin = computeItemFinancials(
        {
          costo: rawCosto,
          ganancia,
          cantidad: 1,
          tipo_doc_costo: tipoDoc,
          iva_incluido: s.iva_incluido ?? true,
        },
        { taxRegime: activeTaxRegime }
      );
      return {
        organization_id: event?.organization_id || organization?.id,
        event_id: id,
        servicio: s.servicio,
        detalle: s.detalle,
        tipo_evento: s.tipo_evento || 'AI',
        cantidad: s.cantidad || 1,
        costo: rawCosto,
        ganancia,
        valor_neto: fin.ventaNetaUnit,
        iva: fin.ivaDebitoUnit,
        valor_total: fin.ventaTotalUnit,
        margen: fin.margenVentaPct,
        tipo_doc_costo: tipoDoc,
        iva_incluido: !fin.isExemptSale,
        approved: false,
      };
    });
    await (supabase.from('event_items') as any).insert(newDrafts);
  };

  const handleGenerateSuggestions = async () => {
    if (!event) return;
    if (!canUseAiFlag) {
      alert(aiGuard.reason || `La Suite IA requiere ${aiPlan.name}.`);
      return;
    }
    setAiLoading(true);
    try {
      const response = await fetch('/api/ai/suggest-costs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventDescription: event.description,
          parsedDocuments: parsedText,
          eventType: event.status,
          targetMargin: aiTargetMargin,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(
          errData.error || `Error al generar sugerencias (HTTP ${response.status})`
        );
      }

      const data = await response.json();
      if (data.suggestions && data.suggestions.length > 0) {
        await insertAiDraftSuggestions(data.suggestions);
        await fetchEventData();
      }
    } catch (error: any) {
      console.error('Error generating suggestions:', error);
      alert('Error de IA: ' + error.message);
    } finally {
      setAiLoading(false);
    }
  };

  const handleGenerateCustomBreakdown = async () => {
    if (!customPrompt.trim()) return;
    if (!canUseAiFlag) {
      alert(aiGuard.reason || `La Suite IA requiere ${aiPlan.name}.`);
      return;
    }
    setCustomAiLoading(true);
    try {
      const response = await fetch('/api/ai/suggest-costs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customPrompt: customPrompt.trim(),
          customQuoteLocation: customQuoteLocation.trim(),
          eventDescription: event?.description || '',
          eventType: event?.status || '',
          targetMargin: aiTargetMargin,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(
          errData.error || `Error al generar desglose con IA (HTTP ${response.status})`
        );
      }

      const data = await response.json();
      if (data.suggestions && data.suggestions.length > 0) {
        await insertAiDraftSuggestions(data.suggestions);
        setCustomPrompt('');
        await fetchEventData();
      }
    } catch (error: any) {
      console.error('Error generating custom breakdown:', error);
      alert('Error de IA: ' + error.message);
    } finally {
      setCustomAiLoading(false);
    }
  };

  const handleFinalizeEvent = async () => {
    if (!event || !canManageStatus) return;

    const confirm = window.confirm(
      `¿Está seguro de que desea finalizar este ${terms.projectSingular.toLowerCase()}? Ya no podrá agregar ni editar partidas a menos que lo vuelva a reabrir.`
    );
    if (!confirm) return;

    setFinalizing(true);
    try {
      const { error } = await (supabase.from('events') as any)
        .update({ status: 'completed' })
        .eq('id', id);

      if (error) throw error;

      await logAudit('update', 'event', {
        entityId: event.id,
        entityLabel: event.name,
        before: { status: event.status },
        after: { status: 'completed' },
      });

      setEvent({ ...event, status: 'completed' });
    } catch (error) {
      console.error('Error finalizing project:', error);
    } finally {
      setFinalizing(false);
    }
  };

  const handleReopenEvent = async () => {
    if (!event || !canManageStatus) return;

    const confirm = window.confirm(
      `¿Está seguro de que desea reabrir este ${terms.projectSingular.toLowerCase()} para edición?`
    );
    if (!confirm) return;

    setFinalizing(true);
    try {
      const { error } = await (supabase.from('events') as any)
        .update({ status: 'planning' })
        .eq('id', id);

      if (error) throw error;

      await logAudit('update', 'event', {
        entityId: event.id,
        entityLabel: event.name,
        before: { status: event.status },
        after: { status: 'planning' },
      });

      setEvent({ ...event, status: 'planning' });
    } catch (error) {
      console.error('Error reopening project:', error);
    } finally {
      setFinalizing(false);
    }
  };

  if (loading && !event) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">{terms.projectSingular} no encontrado.</p>
        <Link href="/events">
          <Button variant="link" className="mt-4">
            Volver a {terms.projectPlural}
          </Button>
        </Link>
      </div>
    );
  }

  const isCompleted = event.status === 'completed';
  const activeTaxRegime = event.tax_regime || organization?.tax_regime || 'afecto_iva';
  const honorariosPolicy = organization?.honorarios_retention_policy || 'contractor';

  const marginEval = evaluateMarginPolicy(event, organization, items, profile, entitlements);
  const belowMarginFloor = marginEval.requiresApproval;
  const isMarginBlockedForUser = marginEval.blockedForUser;

  const projectFin = computeProjectFinancials([...items, ...transactions], {
    taxRegime: activeTaxRegime,
    honorariosPolicy,
    onlyApproved: true,
  });

  const handleShareInteractiveQuote = async () => {
    if (!event) return;
    if (!canSendQuotes) {
      setShareError('Su rol actual o estado de suscripción no permite enviar cotizaciones.');
      return;
    }
    if (isMarginBlockedForUser) {
      setShareError(
        marginEval.reason ||
          `El margen actual (${marginEval.currentMarginPct.toFixed(1)}%) está bajo el piso mínimo (${marginEval.minMarginPct}%).`
      );
      return;
    }

    setSharingLink(true);
    setShareError(null);
    try {
      if (isDemo) {
        const demoUrl = `/q/demo-${event.id}`;
        const nowIso = new Date().toISOString();
        const nextStatus = event.quote_status === 'accepted' ? 'accepted' : 'sent';
        await (supabase.from('events') as any)
          .update({
            quote_token: `demo-${event.id}`,
            quote_status: nextStatus,
            quote_sent_at: nowIso,
          })
          .eq('id', event.id);
        setSharedUrl(demoUrl);
        setEvent({
          ...event,
          quote_token: `demo-${event.id}`,
          quote_status: nextStatus,
          quote_sent_at: nowIso,
        });
        await logAudit('quote_sent', 'quote', {
          entityId: event.id,
          entityLabel: event.name,
          after: { url: demoUrl, quote_status: nextStatus },
        });
        if (navigator?.clipboard) {
          navigator.clipboard.writeText(`${window.location.origin}${demoUrl}`).catch(() => {});
          setCopiedLink(true);
          setTimeout(() => setCopiedLink(false), 3000);
        }
        return;
      }

      const res = await fetch('/api/quotes/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: event.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setShareError(data?.error || 'No se pudo generar el enlace del portal.');
        return;
      }

      setSharedUrl(data.url);
      setEvent({
        ...event,
        quote_token: data.token,
        quote_status: data.quote_status || 'sent',
        quote_sent_at: data.quote_sent_at || event.quote_sent_at,
      });
      await logAudit('quote_sent', 'quote', {
        entityId: event.id,
        entityLabel: event.name,
        after: { url: data.url, quote_status: data.quote_status || 'sent' },
      });
      if (navigator?.clipboard && data.url) {
        navigator.clipboard.writeText(`${window.location.origin}${data.url}`).catch(() => {});
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 3000);
      }
    } catch {
      setShareError('Error de conexión al generar el portal interactivo.');
    } finally {
      setSharingLink(false);
    }
  };

  const handleApproveMarginOverride = async () => {
    if (!event || !marginEval.canApprove) return;
    setApprovingOverride(true);
    try {
      const { error } = await (supabase.from('events') as any)
        .update({ min_margin_override_approved: true })
        .eq('id', event.id);

      if (
        error &&
        error.code !== 'PGRST204' &&
        !String(error.message || '').includes('min_margin_override')
      ) {
        throw error;
      }
      setEvent({ ...event, min_margin_override_approved: true });
      setShareError(null);
      await logAudit('approve_margin', 'margin_policy', {
        entityId: event.id,
        entityLabel: event.name,
        before: {
          min_margin_override_approved: false,
          marginPct: marginEval.currentMarginPct,
        },
        after: {
          min_margin_override_approved: true,
          minMarginPct: marginEval.minMarginPct,
        },
      });
    } catch (err: any) {
      setShareError(err?.message || 'No se pudo aprobar la excepción de margen.');
    } finally {
      setApprovingOverride(false);
    }
  };

  const taxRegimeLabel =
    TAX_REGIME_OPTIONS.find((r) => r.value === activeTaxRegime)?.shortLabel || 'Afecto IVA 19%';

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-4">
        <Link href="/events" className="hover:text-primary flex items-center">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Volver a {terms.projectPlural}
        </Link>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3 flex-wrap">
            {event.name}
            {isCompleted && <Lock className="h-5 w-5 text-muted-foreground" />}
            {!isCompleted && canEditQuotes && <EditEventDialog event={event} onUpdate={setEvent} />}
          </h2>
          <div className="flex items-center flex-wrap gap-2 mt-2">
            <Badge className={EVENT_STATUS_COLORS[event.status as keyof typeof EVENT_STATUS_COLORS]}>
              {EVENT_STATUS_LABELS[event.status as keyof typeof EVENT_STATUS_LABELS] || event.status}
            </Badge>
            {event.project_type && (
              <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700 text-[11px]">
                {event.project_type}
              </Badge>
            )}
            {event.base_quantity && event.base_quantity > 0 && (
              <Badge variant="outline" className="border-indigo-200 bg-indigo-50 text-indigo-800 text-[11px]">
                {event.base_quantity} {baseQtyCfg.unit}
              </Badge>
            )}
            <Badge variant="outline" className="border-slate-200 bg-white text-slate-700 text-[11px]">
              {taxRegimeLabel}
            </Badge>
            {event.currency && event.currency !== 'CLP' && (
              <Badge variant="outline" className="border-slate-300 bg-slate-50 text-slate-800 font-mono text-[11px]">
                <Coins className="mr-1 h-3 w-3 text-primary" />
                {event.currency} ({formatCLP(event.exchange_rate || 1)})
              </Badge>
            )}
            {event.quote_status === 'sent' && (
              <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-50 font-medium">
                Cotización Enviada (Portal)
              </Badge>
            )}
            {event.quote_status === 'accepted' && (
              <Badge variant="outline" className="border-emerald-300 text-emerald-700 bg-emerald-50 font-medium">
                <ShieldCheck className="mr-1 h-3 w-3" />
                Aceptada Digitalmente{event.quote_accepted_by_name ? ` (${event.quote_accepted_by_name})` : ''}
              </Badge>
            )}
            {event.quote_status === 'rejected' && (
              <Badge variant="outline" className="border-rose-300 text-rose-700 bg-rose-50 font-medium">
                Ajustes Solicitados
              </Badge>
            )}
            {event.has_retail_sales && (
              <Badge variant="outline" className="border-indigo-300 text-indigo-700 bg-indigo-50 font-medium">
                <Store className="mr-1 h-3 w-3" />
                Consolidación / Prorrateo
              </Badge>
            )}
            {event.is_demo_base && (
              <Badge variant="outline" className="border-amber-300 text-amber-800 bg-amber-50 font-medium">
                Ejemplo Base
              </Badge>
            )}
            {isCompleted && (
              <Badge variant="outline" className="border-green-600 text-green-600 bg-green-50">
                <CheckCircle className="mr-1 h-3 w-3" />
                {terms.projectSingular} Finalizado
              </Badge>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2" data-tour-id="event-pdf-actions">
          {event && canUsePdf && canSendQuotes && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleShareInteractiveQuote}
              disabled={sharingLink || items.length === 0 || isMarginBlockedForUser}
              className="h-8 gap-1.5 text-xs border-primary/30 text-primary hover:bg-primary/5"
              data-testid="share-quote-portal-btn"
            >
              {sharingLink ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Share2 className="h-3.5 w-3.5" />
              )}
              Portal Cliente
            </Button>
          )}
          {event && canUsePdf && canSendQuotes && (
            <ClientQuotePdfDialog
              event={event}
              items={items}
              onEventUpdated={setEvent}
            />
          )}
          {!canUsePdf && (
            <Link href="/billing">
              <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                <Lock className="h-3.5 w-3.5 text-amber-600" />
                PDF / Portal ({pdfPlan.name})
              </Button>
            </Link>
          )}
          {isCompleted ? (
            <div className="flex gap-2">
              {canManageStatus && (
                <Button
                  onClick={handleReopenEvent}
                  disabled={finalizing}
                  variant="outline"
                  className="border-orange-200 text-orange-700 hover:bg-orange-50"
                >
                  {finalizing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowLeft className="mr-2 h-4 w-4" />}
                  Reabrir Edición
                </Button>
              )}
              <Link href={`/events/${id}/report`}>
                <Button variant="default">
                  <FileText className="mr-2 h-4 w-4" />
                  Ver Informe
                </Button>
              </Link>
            </div>
          ) : (
            canManageStatus && (
              <Button
                onClick={handleFinalizeEvent}
                disabled={finalizing || items.length === 0 || isMarginBlockedForUser}
                variant="outline"
                className="bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800 border-green-200"
              >
                {finalizing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                Finalizar {terms.projectSingular}
              </Button>
            )
          )}
        </div>
      </div>

      {/* Banners Operativos: Portal Link / Piso de Margen / Choque de Fechas */}
      {(sharedUrl || shareError || belowMarginFloor || sameDateCollisions.length > 0) && (
        <div className="space-y-2">
          {sharedUrl && (
            <div className="rounded-xl border border-blue-200 bg-blue-50/70 px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <Share2 className="h-4 w-4 text-blue-700 shrink-0" />
                <span className="font-semibold text-blue-950 shrink-0">Portal Interactivo Activo:</span>
                <code className="text-[11px] bg-white/80 border border-blue-200 rounded px-2 py-0.5 truncate font-mono text-blue-900">
                  {sharedUrl}
                </code>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1 bg-white"
                  onClick={() => {
                    navigator.clipboard?.writeText(`${window.location.origin}${sharedUrl}`).catch(() => {});
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2500);
                  }}
                >
                  {copiedLink ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                  {copiedLink ? 'Copiado' : 'Copiar URL'}
                </Button>
                <Link href={sharedUrl} target="_blank" rel="noopener noreferrer" data-testid="open-quote-portal-link">
                  <Button type="button" size="sm" className="h-7 text-xs gap-1">
                    Abrir Portal
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {shareError && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-xs text-destructive flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{shareError}</span>
            </div>
          )}

          {belowMarginFloor && (
            <div className="rounded-xl border border-amber-300 bg-amber-50/80 px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-950">
              <div className="flex items-start gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                <span>
                  <strong>Requiere Aprobación de Margen:</strong> El margen operacional ({marginEval.currentMarginPct.toFixed(1)}%) está bajo el mínimo configurado ({marginEval.minMarginPct}%).
                  {isMarginBlockedForUser
                    ? ' Solicite autorización de Gerencia o Finanzas antes de enviar PDF, portal o finalizar.'
                    : ' Puede autorizar una excepción comercial para habilitar el envío.'}
                </span>
              </div>
              {marginEval.canApprove && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleApproveMarginOverride}
                  disabled={approvingOverride}
                  className="h-7 text-xs border-amber-400 bg-white hover:bg-amber-100 shrink-0 gap-1"
                >
                  {approvingOverride ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3 w-3 text-emerald-700" />}
                  Aprobar Excepción
                </Button>
              )}
            </div>
          )}

          {sameDateCollisions.length > 0 && (
            <div className="rounded-xl border border-amber-300 bg-amber-50/60 px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-900">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Tope de Fecha:</strong> Coincide el {formatDateCL(event.event_date || '')} con {sameDateCollisions.length} {terms.projectSingular.toLowerCase()}(s) ({sameDateCollisions.map((c) => c.name).slice(0, 2).join(', ')}).
                </span>
              </div>
              <Link href="/treasury" className="text-primary font-semibold hover:underline shrink-0">
                Ver Agenda en Tesorería →
              </Link>
            </div>
          )}
        </div>
      )}

      <Tabs defaultValue="info" className="space-y-6 mt-6">
        <TabsList data-tour-id="event-tabs" className="inline-flex h-11 items-center justify-center rounded-lg bg-muted/60 p-1 text-muted-foreground w-full md:w-auto overflow-x-auto shadow-sm">
          <TabsTrigger value="info" className="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
            <Building2 className="h-4 w-4" />
            Información
          </TabsTrigger>
          <TabsTrigger value="draft" className="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
            <Sparkles className="h-4 w-4" />
            Borrador de Costos
            {draftItems.length > 0 && (
              <Badge variant="secondary" className="px-1.5 py-0.5 text-[10px] ml-1 bg-amber-500/10 text-amber-600 border-0">
                {draftItems.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="items" className="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
            <CheckCircle className="h-4 w-4" />
            Presupuesto Oficial
            {items.length > 0 && (
              <Badge variant="secondary" className="px-1.5 py-0.5 text-[10px] ml-1 bg-primary/10 text-primary border-0">
                {items.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="finances" className="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
            <DollarSign className="h-4 w-4" />
            Finanzas
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Información */}
        <TabsContent value="info" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="shadow-xs glass-card border-border/70">
              <CardHeader className="pb-4 border-b border-border/40">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  Detalles de {terms.projectSingular}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3.5 pt-4">
                <div className="flex items-center gap-3 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="font-medium w-28">{terms.clientLabel}:</span>
                  <span>{event.client_company || 'No especificado'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="font-medium w-28">Fecha:</span>
                  <span>{event.event_date ? formatDateCL(event.event_date) : 'No especificada'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="font-medium w-28">{terms.locationLabel}:</span>
                  <span>{event.location || 'No especificada'}</span>
                </div>
                {event.base_quantity && event.base_quantity > 0 && (
                  <div className="flex items-center gap-3 text-sm">
                    <Hash className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="font-medium w-28">Base ({baseQtyCfg.unit}):</span>
                    <span>
                      {event.base_quantity} {baseQtyCfg.unit}
                    </span>
                  </div>
                )}
                {event.project_type && (
                  <div className="flex items-center gap-3 text-sm">
                    <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="font-medium w-28">Categoría:</span>
                    <span>{event.project_type}</span>
                  </div>
                )}
                <div className="mt-4 pt-4 border-t border-border/40 bg-muted/30 -mx-6 -mb-6 px-6 py-4 rounded-b-xl">
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary/70" />
                    Descripción y Alcance:
                  </h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {event.description || 'Sin descripción registrada.'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-xs glass-card border-border/70">
              <CardHeader className="pb-4 border-b border-border/40">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-primary" />
                  Documentos Adjuntos &amp; OCR
                </CardTitle>
                <CardDescription className="text-xs">
                  Suba cotizaciones de proveedores, especificaciones o planillas para extraer costos con IA.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {!isCompleted ? (
                  <div className="space-y-4">
                    <FileUpload onParsed={(text) => setParsedText((prev) => prev + '\n' + text)} />
                    {parsedText && (
                      <div className="mt-4 p-3 bg-muted/30 rounded-md border text-xs max-h-40 overflow-y-auto">
                        <p className="font-semibold mb-1">Texto extraído:</p>
                        <p className="whitespace-pre-wrap">{parsedText}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center p-4 bg-muted/20 rounded-md border">
                    <p className="text-sm text-muted-foreground">
                      Este {terms.projectSingular.toLowerCase()} está finalizado. No se pueden adjuntar más documentos.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 2: Borrador de Costos */}
        <TabsContent value="draft" className="space-y-6">
          {!canUseAiFlag ? (
            <FeatureLockCard
              compact
              isExpiredLock={entitlements.isExpiredLock}
              title="Suite IA + OCR Documental"
              description={
                aiGuard.reason ||
                'Genere presupuestos automáticamente, desglose insumos desde PDF/Excel/Fotos y optimice márgenes con IA. Su grilla manual de borrador sigue 100% operativa.'
              }
              requiredPlanLabel={aiPlan.name}
            />
          ) : (
            <Card className="border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card shadow-sm overflow-hidden mb-2">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-foreground text-sm">
                    Asistente IA de Costos · {industry.shortName}
                  </h3>
                  <span className="text-xs text-muted-foreground ml-2 hidden sm:inline-block">
                    Calcula insumos, personal y extrae cotizaciones automáticamente.
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  <div className="md:col-span-8 flex flex-col relative">
                    <div className="relative h-full flex flex-col">
                      <textarea
                        rows={2}
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        placeholder={`Describa requerimientos para ${industry.shortName} (ej. partidas, cantidades, personal o insumos)...`}
                        className="w-full h-full min-h-[76px] rounded-xl border border-input/80 bg-background/90 px-3 py-2 pb-9 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 custom-scrollbar resize-none font-normal shadow-xs"
                        disabled={customAiLoading || isCompleted || !canEditQuotes}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey && customPrompt.trim()) {
                            e.preventDefault();
                            handleGenerateCustomBreakdown();
                          }
                        }}
                      />
                      <div className="absolute bottom-1.5 right-1.5 left-1.5 flex justify-between items-center gap-2">
                        <div className="flex items-center gap-2" data-tour-id="event-pdf-actions">
                          {event.has_retail_sales ? (
                            <input
                              type="text"
                              value={customQuoteLocation}
                              onChange={(e) => setCustomQuoteLocation(e.target.value)}
                              placeholder="Ubicación / Zona (Opcional)"
                              className="w-36 rounded-md border-0 bg-transparent px-1.5 py-1 text-[11px] text-muted-foreground focus-visible:outline-none focus-visible:ring-0"
                              disabled={customAiLoading || isCompleted || !canEditQuotes}
                            />
                          ) : (
                            <span className="text-[10px] text-muted-foreground/60 pl-1 hidden sm:inline">
                              Enter para enviar
                            </span>
                          )}
                          <div
                            className="flex items-center gap-1 bg-background/80 border border-border/80 rounded px-1.5 py-0.5"
                            title="Margen objetivo sugerido para la IA"
                          >
                            <span className="text-[10px] text-muted-foreground font-semibold">
                              Margen IA:
                            </span>
                            <input
                              type="number"
                              min="0"
                              max="300"
                              value={aiTargetMargin}
                              onChange={(e) =>
                                setAiTargetMargin(Math.max(0, parseFloat(e.target.value) || 0))
                              }
                              className="w-8 text-center text-[11px] font-bold bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-indigo-700"
                            />
                            <span className="text-[10px] text-muted-foreground font-bold">%</span>
                          </div>
                        </div>
                        <Button
                          onClick={handleGenerateCustomBreakdown}
                          disabled={
                            customAiLoading || !customPrompt.trim() || isCompleted || !canEditQuotes
                          }
                          size="sm"
                          className="h-6 rounded-md text-[11px] px-2 font-semibold bg-[#4A607A] hover:bg-[#3F536B] text-white shadow-2xs"
                        >
                          {customAiLoading ? (
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          ) : (
                            <Sparkles className="h-3 w-3 mr-1" />
                          )}
                          Generar
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-4 flex flex-col gap-2 justify-center">
                    <Button
                      variant="outline"
                      onClick={handleGenerateSuggestions}
                      disabled={aiLoading || isCompleted || !canEditQuotes}
                      size="sm"
                      className="w-full justify-start gap-2 text-xs border-primary/20 hover:bg-primary/5 h-[36px] rounded-xl font-medium"
                    >
                      {aiLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                      ) : (
                        <Wand2 className="h-3.5 w-3.5 text-primary" />
                      )}
                      Sugerir desde Ficha
                    </Button>

                    <div className="relative w-full">
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.xlsx,.csv"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                        disabled={aiLoading || isCompleted || !canEditQuotes}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;

                          setAiLoading(true);
                          const formData = new FormData();
                          formData.append('file', file);

                          try {
                            const res = await fetch('/api/parse-file', {
                              method: 'POST',
                              body: formData,
                            });
                            if (!res.ok) {
                              const parseErr = await res.json().catch(() => ({}));
                              throw new Error(
                                parseErr.error || `Error al procesar archivo (HTTP ${res.status})`
                              );
                            }
                            const { text } = await res.json();

                            const aiRes = await fetch('/api/ai/suggest-costs', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                customPrompt:
                                  'Extrae de este documento (factura/boleta/cotización) todos los artículos, cantidades, precios CLP y tipo de documento (factura o boleta) para el borrador de costos.',
                                parsedDocuments: text,
                                eventDescription: event?.description || '',
                                eventType: event?.status || '',
                                targetMargin: aiTargetMargin,
                              }),
                            });

                            if (!aiRes.ok) {
                              const errBody = await aiRes.json().catch(() => ({}));
                              throw new Error(errBody.error || 'Error al generar desglose');
                            }
                            const data = await aiRes.json();

                            if (data.suggestions && data.suggestions.length > 0) {
                              await insertAiDraftSuggestions(data.suggestions);
                              await fetchEventData();
                            } else {
                              alert('No se detectaron partidas en el documento.');
                            }
                          } catch (err: any) {
                            alert(err.message);
                          } finally {
                            setAiLoading(false);
                            if (e.target) e.target.value = '';
                          }
                        }}
                      />
                      <Button
                        variant="outline"
                        disabled={aiLoading || isCompleted || !canEditQuotes}
                        size="sm"
                        className="w-full justify-start gap-2 text-xs bg-emerald-50/50 text-emerald-700 hover:bg-emerald-100/50 border-emerald-200 h-[36px] rounded-xl relative pointer-events-none font-medium"
                      >
                        {aiLoading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
                        ) : (
                          <Upload className="h-3.5 w-3.5 text-emerald-600" />
                        )}
                        Subir Cotización (PDF/IMG)
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="shadow-xs glass-card border-border/70">
            <CardContent className="p-4 sm:p-6">
              <AiSuggestionsGrid
                draftItems={draftItems}
                eventId={id}
                onDraftChanged={fetchEventData}
                hasRetailSales={event.has_retail_sales ?? false}
                taxRegime={activeTaxRegime}
                initialMermasPct={event.mermas_pct ?? 0}
                baseQuantity={event.base_quantity}
                currency={event.currency || 'CLP'}
                exchangeRate={event.exchange_rate || 1}
                readOnly={isCompleted}
                onMermasSaved={(m) =>
                  setEvent((prev) => (prev ? { ...prev, mermas_pct: m } : prev))
                }
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Presupuesto Oficial */}
        <TabsContent value="items" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/40">
              <div>
                <CardTitle>Presupuesto Oficial</CardTitle>
                <CardDescription>
                  Listado de partidas y costos aprobados para este {terms.projectSingular.toLowerCase()}.
                </CardDescription>
              </div>
              {event && canUsePdf && canSendQuotes ? (
                <ClientQuotePdfDialog
                  event={event}
                  items={items}
                  onEventUpdated={setEvent}
                />
              ) : !canUsePdf ? (
                <Link href="/billing">
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                    <Lock className="h-3.5 w-3.5 text-amber-600" />
                    Activar Cotizador PDF ({pdfPlan.name})
                  </Button>
                </Link>
              ) : null}
            </CardHeader>
            <CardContent>
              <EventItemsTable
                items={items}
                onItemDeleted={fetchEventData}
                isCompleted={isCompleted}
                eventId={id}
                hasRetailSales={event.has_retail_sales ?? false}
                isDemo={isDemo}
                taxRegime={activeTaxRegime}
                mermasPct={event.mermas_pct ?? 0}
                baseQuantity={event.base_quantity}
                currency={event.currency || 'CLP'}
                exchangeRate={event.exchange_rate || 1}
              />
            </CardContent>
          </Card>
          {canUseAiFlag && canViewMargins && (
            <FloatingFinancialAdvisor event={event} items={items} />
          )}
        </TabsContent>

        {/* Tab 4: Finanzas */}
        <TabsContent value="finances" className="space-y-6">
          {(!canUseTransactions || entitlements.isExpiredLock) && (
            <FeatureLockCard
              compact
              isExpiredLock={entitlements.isExpiredLock}
              title="Control de Abonos, Gastos Reales y F29"
              description="Registre pagos recibidos, facturas de proveedores con IVA Crédito y boletas de honorarios (15,25%). Sus registros históricos permanecen visibles en modo lectura."
              requiredPlanLabel={siiPlan.name}
            />
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="shadow-xs glass-card border-border/70 md:col-span-2">
              <CardHeader className="pb-4 border-b border-border/40 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-primary" />
                    Control de Abonos y Pagos
                  </CardTitle>
                  <CardDescription className="text-xs mt-1.5">
                    Registre los pagos recibidos (abonos) del cliente y los gastos reales (facturas/boletas).
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {canRecordTx ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-2 shadow-xs text-xs"
                        onClick={() => handleOpenTransaction('ABONO')}
                      >
                        <CreditCard className="h-3.5 w-3.5" />
                        Abono
                      </Button>
                      <Button
                        size="sm"
                        variant="default"
                        className="h-8 gap-2 shadow-xs text-xs"
                        onClick={() => handleOpenTransaction('GASTO')}
                      >
                        <Upload className="h-3.5 w-3.5" />
                        Documento (Gasto)
                      </Button>
                    </>
                  ) : (
                    <Link href="/billing">
                      <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs">
                        <Lock className="h-3.5 w-3.5 text-amber-600" />
                        {entitlements.isExpiredLock
                          ? 'Reactivar Plan'
                          : !canUseTransactions
                          ? `Activar (${siiPlan.name})`
                          : 'Solo Lectura'}
                      </Button>
                    </Link>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {transactions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center space-y-4 border-2 border-dashed border-border/60 rounded-xl bg-muted/20">
                    <div className="p-3 bg-primary/10 text-primary rounded-full">
                      <DollarSign className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground text-sm">
                        Aún no hay transacciones registradas
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                        Agregue el primer abono del cliente o suba el primer documento de gasto.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {transactions.map((t, idx) => {
                      const isAbono =
                        t.tipo_evento === 'ABONO_CLIENTE' || t.servicio === 'ABONO_CLIENTE';
                      const isFactura = !isAbono && t.tipo_doc_costo === 'factura';
                      const isHonorarios = !isAbono && isBoletaHonorariosItem(t);
                      const ivaCreditoItem = isFactura
                        ? t.iva && t.iva > 0
                          ? t.iva
                          : Math.round(t.valor_total - t.valor_total / 1.19)
                        : 0;
                      const ivaDebitoItem =
                        isAbono && t.iva_incluido !== false
                          ? t.iva && t.iva > 0
                            ? t.iva
                            : Math.round(t.valor_total - t.valor_total / 1.19)
                          : 0;

                      return (
                        <div
                          key={t.id || idx}
                          className={`flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 p-3 border border-border/50 rounded-lg bg-card/50 transition-colors ${
                            canRecordTx ? 'hover:bg-muted/50 cursor-pointer' : 'opacity-90 cursor-default'
                          }`}
                          onClick={() => {
                            if (!canRecordTx) return;
                            handleOpenTransaction(isAbono ? 'ABONO' : 'GASTO', t);
                          }}
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                  isAbono
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-rose-100 text-rose-700'
                                }`}
                              >
                                {isAbono ? 'ABONO' : 'GASTO'}
                              </span>
                              <span className="font-medium text-sm text-foreground">
                                {t.servicio}
                              </span>
                              {isFactura && (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                  Factura · IVA Créd. +${ivaCreditoItem.toLocaleString('es-CL')}
                                </span>
                              )}
                              {isHonorarios && (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  Honorarios 15,25% · $0 IVA Créd.
                                </span>
                              )}
                              {!isAbono && !isFactura && !isHonorarios && (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                                  Boleta · $0 IVA Créd.
                                </span>
                              )}
                              {isAbono && ivaDebitoItem > 0 && (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                                  IVA Débito ${ivaDebitoItem.toLocaleString('es-CL')}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{t.detalle || '-'}</p>
                          </div>
                          <div className="text-left sm:text-right shrink-0">
                            <p
                              className={`font-semibold ${
                                isAbono ? 'text-emerald-600' : 'text-rose-600'
                              }`}
                            >
                              {isAbono ? '+' : '-'}${t.valor_total.toLocaleString('es-CL')}
                            </p>
                            <p className="text-[10px] text-muted-foreground uppercase">
                              {t.tipo_doc_costo || 'N/A'}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-4">
              {canViewMargins && (
                <Card className="shadow-xs glass-card border-border/70">
                  <CardHeader className="pb-4 border-b border-border/40 bg-muted/10">
                    <CardTitle className="text-base flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-emerald-600" />
                      Resumen de Flujo de Caja
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    {(() => {
                      const totalPresupuestado = projectFin.facturacionBruta;
                      const costoTotalItems = projectFin.costoBrutoTotal;
                      const cashProyectado = totalPresupuestado - costoTotalItems;
                      const abonosRecibidos = projectFin.executed.abonosBrutos;
                      const gastosReales = projectFin.executed.gastosBrutos;
                      const cashActualMano = projectFin.executed.cajaNetaEjecutada;
                      const saldoPorCobrar = totalPresupuestado - abonosRecibidos;
                      const pctCobrado =
                        totalPresupuestado > 0
                          ? Math.min(100, Math.round((abonosRecibidos / totalPresupuestado) * 100))
                          : 0;
                      const pctGastoEjecutado =
                        costoTotalItems > 0
                          ? Math.min(150, Math.round((gastosReales / costoTotalItems) * 100))
                          : 0;
                      const canonicalMarginPct =
                        projectFin.facturacionNetaSinReembolsables > 0
                          ? projectFin.margenOperacionalPct
                          : projectFin.margenVentaPct;
                      const meetsTargetMargin = canonicalMarginPct >= industry.targetMarginPct;
                      const fxRates =
                        event.currency === 'UF'
                          ? { uf: event.exchange_rate }
                          : event.currency === 'USD'
                          ? { usd: event.exchange_rate }
                          : undefined;

                      return (
                        <>
                          <div className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/70 space-y-2.5 text-xs">
                            <div className="flex items-center justify-between font-semibold text-foreground">
                              <span>Control Presupuesto vs. Real</span>
                              <span
                                className={
                                  meetsTargetMargin
                                    ? 'text-emerald-700 font-bold'
                                    : 'text-amber-700 font-bold'
                                }
                              >
                                Margen s/ Venta: {formatPercentage(canonicalMarginPct)} (Meta {industry.targetMarginPct}%)
                              </span>
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between text-[11px] text-muted-foreground">
                                <span>Cobranza ({pctCobrado}%)</span>
                                <span>
                                  ${abonosRecibidos.toLocaleString('es-CL')} / $
                                  {totalPresupuestado.toLocaleString('es-CL')}
                                </span>
                              </div>
                              <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                                <div
                                  className="h-full bg-emerald-600 rounded-full"
                                  style={{ width: `${pctCobrado}%` }}
                                />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between text-[11px] text-muted-foreground">
                                <span>Ejecución Costos ({pctGastoEjecutado}%)</span>
                                <span>
                                  ${gastosReales.toLocaleString('es-CL')} / $
                                  {costoTotalItems.toLocaleString('es-CL')}
                                </span>
                              </div>
                              <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    pctGastoEjecutado > 100 ? 'bg-rose-600' : 'bg-[#4A607A]'
                                  }`}
                                  style={{ width: `${Math.min(100, pctGastoEjecutado)}%` }}
                                />
                              </div>
                            </div>
                          </div>

                          <div className="flex justify-between items-end border-b border-border/40 pb-3">
                            <div>
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Total Presupuestado
                              </p>
                              <p className="text-sm font-semibold text-foreground mt-1">
                                ${totalPresupuestado.toLocaleString('es-CL')}
                              </p>
                              {event.currency &&
                                event.currency !== 'CLP' &&
                                (event.exchange_rate || 1) > 1 && (
                                  <p className="text-[11px] font-mono text-primary">
                                    {formatMoney(totalPresupuestado, event.currency, fxRates)}
                                  </p>
                                )}
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Costo Presupuestado
                              </p>
                              <p className="text-sm font-semibold text-red-600 mt-1">
                                -${costoTotalItems.toLocaleString('es-CL')}
                              </p>
                            </div>
                          </div>

                          <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200/60 dark:bg-emerald-950/30 dark:border-emerald-900/40">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200 uppercase tracking-wider">
                                  Flujo Bruto Proyectado
                                </p>
                                <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300">
                                  Utilidad Neta ex-IVA: {formatCLP(projectFin.utilidadNeta)}
                                </p>
                              </div>
                              <p className="text-lg font-black text-emerald-700 dark:text-emerald-300">
                                ${cashProyectado.toLocaleString('es-CL')}
                              </p>
                            </div>
                          </div>

                          <div className="flex justify-between items-end border-b border-border/40 pb-3">
                            <div>
                              <p className="text-xs font-medium text-emerald-600/80 uppercase tracking-wider">
                                Abonos Recibidos
                              </p>
                              <p className="text-sm font-semibold text-emerald-600 mt-1">
                                +${abonosRecibidos.toLocaleString('es-CL')}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-medium text-rose-600/80 uppercase tracking-wider">
                                Gastos Reales Pagados
                              </p>
                              <p className="text-sm font-semibold text-rose-600 mt-1">
                                -${gastosReales.toLocaleString('es-CL')}
                              </p>
                            </div>
                          </div>

                          <div className="flex justify-between items-center border-b border-border/40 pb-3">
                            <div>
                              <p className="text-xs font-bold text-foreground uppercase tracking-wider">
                                Cash Actual en Caja
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                Abonos recaudados menos gastos pagados
                              </p>
                            </div>
                            <p
                              className={`text-base font-bold ${
                                cashActualMano >= 0 ? 'text-emerald-600' : 'text-rose-600'
                              }`}
                            >
                              ${cashActualMano.toLocaleString('es-CL')}
                            </p>
                          </div>

                          <div className="flex justify-between items-end pt-1">
                            <div>
                              <p className="text-xs font-bold text-foreground uppercase tracking-wider">
                                Saldo por Cobrar
                              </p>
                              <p className="text-xl font-bold text-foreground mt-1">
                                ${saldoPorCobrar.toLocaleString('es-CL')}
                              </p>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </CardContent>
                </Card>
              )}

              <Card className="shadow-xs glass-card border-amber-200/70 bg-amber-50/15">
                <CardHeader className="pb-3 border-b border-border/40">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-amber-600" />
                    Balance Tributario SII (F29 Real)
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-2.5 text-xs">
                  {(() => {
                    const balanceF29Real =
                      projectFin.executed.abonosIvaDebito -
                      projectFin.executed.gastosIvaCredito;

                    return (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">IVA Débito Presupuestado:</span>
                          <span className="font-semibold text-foreground">
                            ${projectFin.ivaDebito.toLocaleString('es-CL')}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">IVA Débito en Abonos:</span>
                          <span className="font-semibold text-amber-700">
                            ${projectFin.executed.abonosIvaDebito.toLocaleString('es-CL')}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">IVA Crédito Facturas Reales:</span>
                          <span className="font-semibold text-blue-700">
                            -${projectFin.executed.gastosIvaCredito.toLocaleString('es-CL')}
                          </span>
                        </div>
                        <div className="flex justify-between items-center border-t border-border/40 pt-2">
                          <span className="text-muted-foreground">
                            Retención Honorarios 15,25%:
                          </span>
                          <span className="font-semibold text-indigo-700">
                            ${projectFin.executed.retencionHonorariosTotal.toLocaleString('es-CL')}
                          </span>
                        </div>
                        <div
                          className={`p-2.5 rounded-lg border flex justify-between items-center font-bold ${
                            balanceF29Real > 0
                              ? 'bg-amber-50 border-amber-200 text-amber-900'
                              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          }`}
                        >
                          <span>
                            {balanceF29Real > 0
                              ? 'IVA Neto a Reservar F29:'
                              : 'Remanente IVA a Favor:'}
                          </span>
                          <span>${Math.abs(balanceF29Real).toLocaleString('es-CL')}</span>
                        </div>
                      </>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {isTransactionOpen && canRecordTx && (
        <TransactionDialog
          isOpen={isTransactionOpen}
          onOpenChange={setIsTransactionOpen}
          eventId={id}
          type={transactionType}
          transactionToEdit={transactionToEdit}
          onSaved={fetchEventData}
        />
      )}
    </div>
  );
}
