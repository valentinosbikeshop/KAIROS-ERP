'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  AlertTriangle,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Copy,
  FileCheck2,
  Landmark,
  Loader2,
  MapPin,
  Printer,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import {
  cn,
  formatCLP,
  formatCurrencyAmount,
  formatDateCL,
  formatRutCL,
  validateRutCL,
} from '@/lib/utils';
import { DEFAULT_PLANS, resolveOrgEntitlements } from '@/lib/entitlements';
import { computeItemFinancials, formatMoney } from '@/lib/finance-core';
import { brandingCapabilities } from '@/lib/plan-guards';
import { parsePaymentTerms } from '@/components/events/project-helpers';
import { LOCAL_DEMO_STORAGE_KEY } from '@/lib/supabase/local-demo-client';
import { CompanyLogoMark } from '@/components/ui/figura-logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Event, EventItem, Organization, QuoteCurrency, QuotePortalStatus, TaxRegime } from '@/types/database';

interface PublicQuoteItem {
  id: string;
  servicio: string;
  detalle: string | null;
  tipo_evento: string | null;
  cantidad: number;
  valor_neto_unitario: number;
  iva_unitario: number;
  valor_total_unitario: number;
  valor_neto_subtotal: number;
  iva_subtotal: number;
  valor_total_subtotal: number;
  iva_incluido: boolean;
}

interface PublicBankInfo {
  banco?: string;
  tipo_cuenta?: string;
  numero_cuenta?: string;
  titular?: string;
  rut?: string;
  email?: string;
}

interface PublicQuoteData {
  isDemoLocal?: boolean;
  event: {
    id: string;
    name: string;
    client_company: string | null;
    location: string | null;
    event_date: string | null;
    description: string | null;
    status: 'planning' | 'approved' | 'completed';
    quote_status: QuotePortalStatus;
    quote_sent_at: string | null;
    quote_accepted_at: string | null;
    quote_accepted_by_name: string | null;
    currency: QuoteCurrency;
    exchange_rate: number;
    payment_terms?: string | null;
    tax_regime?: TaxRegime;
  };
  organization: {
    name: string;
    legal_name: string | null;
    rut: string | null;
    subtitle: string | null;
    location: string | null;
    contact_email: string | null;
    contact_phone: string | null;
    logo_url: string | null;
    bank_info: PublicBankInfo | null;
    secondary_accounts?: PublicBankInfo[];
    white_label_footer?: string | null;
    hide_figura_branding?: boolean;
  } | null;
  branding?: {
    bankInfo: boolean;
    logo: boolean;
    whiteLabel: boolean;
    customLegalFooter: boolean;
    multipleBankAccounts: boolean;
  };
  items: PublicQuoteItem[];
  totals: {
    valorNeto: number;
    iva: number;
    valorTotal: number;
    suggestedDepositClp: number;
  };
  khipuAvailable: boolean;
}

export default function PublicQuotePortalPage() {
  const params = useParams<{ token: string }>();
  const token = String(params?.token || '');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PublicQuoteData | null>(null);

  // Acceptance form state
  const [signerName, setSignerName] = useState('');
  const [signerRut, setSignerRut] = useState('');
  const [signerEmail, setSignerEmail] = useState('');
  const [signerNotes, setSignerNotes] = useState('');
  const [submittingDecision, setSubmittingDecision] = useState<'accepted' | 'rejected' | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [copiedBank, setCopiedBank] = useState(false);

  useEffect(() => {
    if (!token) return;
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);

      // Modo Sandbox Demo Local (sin llamadas a backend ni Supabase)
      if (token.startsWith('demo-')) {
        try {
          const eventId = token.slice(5);
          const raw = window.localStorage.getItem(LOCAL_DEMO_STORAGE_KEY);
          if (!raw) {
            setError('No se encontró la sesión de Sandbox Demo en este navegador.');
            setLoading(false);
            return;
          }
          const parsed = JSON.parse(raw) as {
            organization?: Organization;
            events?: Event[];
            event_items?: EventItem[];
          };
          const ev = (parsed.events || []).find((e) => e.id === eventId && !e.deleted_at);
          if (!ev) {
            setError('Cotización demo no encontrada.');
            setLoading(false);
            return;
          }

          const org = parsed.organization || null;
          const entitlements = resolveOrgEntitlements(org, DEFAULT_PLANS);
          const caps = brandingCapabilities(entitlements);
          const eventTaxRegime: TaxRegime = ev.tax_regime || org?.tax_regime || 'afecto_iva';

          const publicItems: PublicQuoteItem[] = (parsed.event_items || [])
            .filter(
              (i) =>
                i.event_id === ev.id &&
                i.approved &&
                !i.parent_id &&
                i.tipo_evento !== 'ABONO_CLIENTE' &&
                i.tipo_evento !== 'GASTO_REAL' &&
                i.servicio !== 'ABONO_CLIENTE' &&
                i.servicio !== 'GASTO_REAL' &&
                !i.es_insumo
            )
            .map((i) => {
              const fin = computeItemFinancials(i, { taxRegime: eventTaxRegime });
              return {
                id: i.id,
                servicio: i.servicio,
                detalle: i.detalle || null,
                tipo_evento: i.tipo_evento || null,
                cantidad: fin.cantidad,
                valor_neto_unitario: fin.ventaNetaUnit,
                iva_unitario: fin.ivaDebitoUnit,
                valor_total_unitario: fin.ventaTotalUnit,
                valor_neto_subtotal: fin.ventaNeta,
                iva_subtotal: fin.ivaDebito,
                valor_total_subtotal: fin.ventaTotal,
                iva_incluido: !fin.isExemptSale,
              };
            });

          const totalNeto = publicItems.reduce((s, i) => s + i.valor_neto_subtotal, 0);
          const totalIva = publicItems.reduce((s, i) => s + i.iva_subtotal, 0);
          const totalVenta = publicItems.reduce((s, i) => s + i.valor_total_subtotal, 0);
          const parsedTerms = parsePaymentTerms(ev.payment_terms);

          if (!active) return;
          setData({
            isDemoLocal: true,
            event: {
              id: ev.id,
              name: ev.name,
              client_company: ev.client_company,
              location: ev.location,
              event_date: ev.event_date,
              description: ev.description,
              status: ev.status,
              quote_status: ev.quote_status || 'sent',
              quote_sent_at: ev.quote_sent_at || null,
              quote_accepted_at: ev.quote_accepted_at || null,
              quote_accepted_by_name: ev.quote_accepted_by_name || null,
              currency: ev.currency || 'CLP',
              exchange_rate: Number(ev.exchange_rate || 1),
              payment_terms: ev.payment_terms || null,
              tax_regime: eventTaxRegime,
            },
            organization: org
              ? {
                  name: org.name,
                  legal_name: org.legal_name,
                  rut: org.rut,
                  subtitle: org.subtitle,
                  location: org.location,
                  contact_email: org.contact_email,
                  contact_phone: org.contact_phone,
                  logo_url: caps.logo ? org.logo_url || null : null,
                  bank_info: caps.bankInfo
                    ? {
                        banco: org.bank_info?.banco || 'Banco de Chile',
                        tipo_cuenta: org.bank_info?.tipo_cuenta || 'Cuenta Corriente',
                        numero_cuenta: org.bank_info?.numero_cuenta || '00-123-45678-90',
                        titular: org.bank_info?.titular || org.legal_name || org.name,
                        rut: org.bank_info?.rut || org.rut || '',
                        email: org.bank_info?.email || org.contact_email || '',
                      }
                    : null,
                  secondary_accounts: caps.multipleBankAccounts ? org.secondary_accounts || [] : [],
                  white_label_footer: caps.customLegalFooter ? org.white_label_footer || null : null,
                  hide_figura_branding: caps.whiteLabel && Boolean(org.hide_figura_branding ?? true),
                }
              : null,
            branding: {
              bankInfo: caps.bankInfo,
              logo: caps.logo,
              whiteLabel: caps.whiteLabel,
              customLegalFooter: caps.customLegalFooter,
              multipleBankAccounts: caps.multipleBankAccounts,
            },
            items: publicItems,
            totals: {
              valorNeto: totalNeto,
              iva: totalIva,
              valorTotal: totalVenta,
              suggestedDepositClp: Math.round(totalVenta * parsedTerms.depositPct),
            },
            khipuAvailable: false,
          });
        } catch {
          if (active) setError('Error al leer la cotización demo local.');
        } finally {
          if (active) setLoading(false);
        }
        return;
      }

      // Modo Producción (Supabase vía endpoint público filtrado)
      try {
        const res = await fetch(`/api/quotes/public/${encodeURIComponent(token)}`, {
          cache: 'no-store',
        });
        const json = await res.json();
        if (!res.ok) {
          if (active) setError(json.error || 'Cotización no disponible.');
          return;
        }
        if (active) setData(json);
      } catch {
        if (active) setError('Error de conexión al cargar la propuesta.');
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [token]);

  const rutLooksTyped = signerRut.trim().length >= 7;
  const rutIsValid = validateRutCL(signerRut);

  const handleDecision = async (decision: 'accepted' | 'rejected') => {
    if (!data) return;
    setFormError(null);

    if (signerName.trim().length < 2) {
      setFormError('Por favor ingrese su nombre completo para registrar la respuesta.');
      return;
    }
    if (!validateRutCL(signerRut)) {
      setFormError('El RUT ingresado no es válido según el dígito verificador chileno (Ej: 12.345.678-9).');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signerEmail.trim())) {
      setFormError('Ingrese un correo electrónico válido para enviarle el respaldo.');
      return;
    }

    const formattedRut = formatRutCL(signerRut);
    setSignerRut(formattedRut);
    setSubmittingDecision(decision);

    try {
      if (data.isDemoLocal) {
        const raw = window.localStorage.getItem(LOCAL_DEMO_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          const nowIso = new Date().toISOString();
          parsed.events = (parsed.events || []).map((ev: Event) => {
            if (ev.id !== data.event.id) return ev;
            const nextStatus =
              decision === 'accepted' && ev.status === 'planning' ? 'approved' : ev.status;
            return {
              ...ev,
              quote_status: decision,
              quote_accepted_at: decision === 'accepted' ? nowIso : null,
              quote_accepted_by_name: signerName.trim(),
              quote_accepted_by_rut: formattedRut,
              quote_accepted_by_email: signerEmail.trim(),
              quote_notes: signerNotes.trim() || null,
              status: nextStatus,
            };
          });
          window.localStorage.setItem(LOCAL_DEMO_STORAGE_KEY, JSON.stringify(parsed));
        }

        const nowIso = new Date().toISOString();
        setData({
          ...data,
          event: {
            ...data.event,
            quote_status: decision,
            quote_accepted_at: decision === 'accepted' ? nowIso : null,
            quote_accepted_by_name: signerName.trim(),
            status:
              decision === 'accepted' && data.event.status === 'planning'
                ? 'approved'
                : data.event.status,
          },
        });
        return;
      }

      const res = await fetch(`/api/quotes/public/${encodeURIComponent(token)}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision,
          name: signerName.trim(),
          rut: formattedRut,
          email: signerEmail.trim(),
          notes: signerNotes.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setFormError(json.error || 'No se pudo procesar tu respuesta.');
        return;
      }

      setData({
        ...data,
        event: {
          ...data.event,
          quote_status: json.quote_status || decision,
          quote_accepted_at: json.acceptedAt || data.event.quote_accepted_at,
          quote_accepted_by_name: json.acceptedBy || signerName.trim(),
          status: json.status || data.event.status,
        },
      });
    } catch {
      setFormError('Error de conexión al registrar firma digital.');
    } finally {
      setSubmittingDecision(null);
    }
  };

  const handleCopyBank = () => {
    if (!data?.organization?.bank_info) return;
    const b = data.organization.bank_info;
    const depositPct = parsePaymentTerms(data.event.payment_terms).depositPct;
    const depositAmount = Math.round(data.totals.valorTotal * depositPct);
    const lines = [
      `Titular: ${b.titular || data.organization.legal_name || data.organization.name}`,
      `RUT: ${b.rut || data.organization.rut || ''}`,
      `Banco: ${b.banco || ''}`,
      `Tipo Cuenta: ${b.tipo_cuenta || ''}`,
      `N° Cuenta: ${b.numero_cuenta || ''}`,
      b.email ? `Email comprobante: ${b.email}` : '',
      depositPct > 0
        ? `Monto Abono (${Math.round(depositPct * 100)}%): ${formatCLP(depositAmount)}`
        : `Total Propuesta: ${formatCLP(data.totals.valorTotal)}`,
      `Referencia: ${data.event.name}`,
    ]
      .filter(Boolean)
      .join('\n');
    navigator.clipboard.writeText(lines);
    setCopiedBank(true);
    setTimeout(() => setCopiedBank(false), 2400);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3 p-6">
        <Loader2 className="h-8 w-8 animate-spin text-[#4A607A]" />
        <p className="text-sm text-muted-foreground font-medium">Cargando propuesta comercial...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full border-slate-200 shadow-sm">
          <CardContent className="p-8 text-center space-y-3">
            <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
            <h1 className="text-lg font-semibold text-slate-900">Cotización No Disponible</h1>
            <p className="text-sm text-muted-foreground">
              {error || 'El enlace solicitado no es válido o fue revocado.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { event, organization, items, totals, branding } = data;
  const currency = event.currency || 'CLP';
  const rate = Number(event.exchange_rate || 1);
  const showForeignCurrency = currency !== 'CLP' && rate > 1;
  const currencyRates = currency === 'UF' ? { uf: rate } : currency === 'USD' ? { usd: rate } : undefined;
  const parsedTerms = parsePaymentTerms(event.payment_terms);
  const depositPct = parsedTerms.depositPct;
  const suggestedDepositClp =
    depositPct > 0 ? Math.round(totals.valorTotal * depositPct) : totals.valorTotal;
  const showBankCard = branding?.bankInfo !== false && Boolean(organization?.bank_info);
  const isWhiteLabel = Boolean(branding?.whiteLabel && organization?.hide_figura_branding);
  const isAccepted = event.quote_status === 'accepted';
  const isRejected = event.quote_status === 'rejected';

  return (
    <div className="min-h-screen bg-slate-50/90 py-8 px-4 sm:px-6 print:bg-white print:py-0">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Status banners */}
        {data.isDemoLocal && (
          <div className="rounded-xl border border-amber-300/70 bg-amber-50 px-4 py-2.5 text-xs text-amber-900 flex items-center justify-between gap-2 print:hidden">
            <span>
              <strong>Modo Sandbox Demo Local:</strong> Esta vista previa simula el portal público que recibe tu cliente final. Los cambios se guardan en tu navegador.
            </span>
            <Badge variant="outline" className="border-amber-400 text-amber-900 shrink-0">
              DEMO PORTAL
            </Badge>
          </div>
        )}

        {/* Header Corporate Card */}
        <Card className="border-slate-200/90 shadow-sm overflow-hidden">
          <div className="h-1.5 w-full bg-[#4A607A]" />
          <CardContent className="p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex items-start gap-3.5">
                {organization && (
                  <CompanyLogoMark
                    name={organization.name}
                    logoUrl={branding?.logo !== false ? organization.logo_url : null}
                    size="md"
                  />
                )}
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#4A607A]">
                    {organization?.subtitle || 'Propuesta Comercial Oficial'}
                  </p>
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                    {organization?.name || 'FIGURA'}
                  </h1>
                  {(organization?.legal_name || organization?.rut) && (
                    <p className="text-xs text-muted-foreground">
                      {organization.legal_name}
                      {organization.rut ? ` · RUT ${organization.rut}` : ''}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:justify-end print:hidden">
                {isAccepted && (
                  <Badge className="bg-emerald-600 text-white gap-1 px-3 py-1 text-xs">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Cotización Aprobada
                  </Badge>
                )}
                {isRejected && (
                  <Badge variant="destructive" className="gap-1 px-3 py-1 text-xs">
                    <XCircle className="h-3.5 w-3.5" />
                    Ajustes Solicitados
                  </Badge>
                )}
                {!isAccepted && !isRejected && (
                  <Badge variant="secondary" className="gap-1 px-3 py-1 text-xs">
                    <FileCheck2 className="h-3.5 w-3.5" />
                    Pendiente de Aprobación
                  </Badge>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => window.print()}
                  className="gap-1.5"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Imprimir / PDF
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100 text-sm">
              <div className="space-y-1">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-[#4A607A]" />
                  Proyecto &amp; Cliente
                </span>
                <p className="font-semibold text-slate-900">{event.name}</p>
                {event.client_company && (
                  <p className="text-xs text-muted-foreground">{event.client_company}</p>
                )}
              </div>

              <div className="space-y-1">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-[#4A607A]" />
                  Fecha Programada
                </span>
                <p className="font-semibold text-slate-900">
                  {event.event_date ? formatDateCL(event.event_date, { long: true }) : 'Por definir'}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-[#4A607A]" />
                  Ubicación
                </span>
                <p className="font-semibold text-slate-900">{event.location || 'Por coordinar'}</p>
              </div>
            </div>

            {event.description && (
              <div className="rounded-lg bg-slate-50 border border-slate-100 p-3.5 text-xs text-slate-700 leading-relaxed">
                {event.description}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Line Items Card */}
        <Card className="border-slate-200/90 shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base font-semibold">Detalle de Servicios y Partidas</CardTitle>
            {showForeignCurrency && (
              <Badge variant="outline" className="text-xs font-mono">
                Moneda Referencia: {currency} (1 {currency} = {formatCLP(rate)})
              </Badge>
            )}
          </CardHeader>
          <CardContent className="p-0 sm:p-6 sm:pt-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-slate-200 bg-slate-50/70 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="text-left py-2.5 px-4 font-semibold">Servicio / Partida</th>
                    <th className="text-center py-2.5 px-2 font-semibold">Cant.</th>
                    <th className="text-right py-2.5 px-4 font-semibold">Neto</th>
                    <th className="text-right py-2.5 px-4 font-semibold">IVA (19%)</th>
                    <th className="text-right py-2.5 px-4 font-semibold">Subtotal CLP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground text-xs">
                        Aún no hay partidas aprobadas publicadas en esta cotización.
                      </td>
                    </tr>
                  ) : (
                    items.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4">
                          <p className="font-medium text-slate-900">{item.servicio}</p>
                          {item.detalle && (
                            <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-line">
                              {item.detalle}
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-2 text-center font-mono text-xs">{item.cantidad}</td>
                        <td className="py-3 px-4 text-right font-mono text-xs text-slate-700">
                          <div>{formatCLP(item.valor_neto_subtotal)}</div>
                          {showForeignCurrency && (
                            <div className="text-[10px] text-muted-foreground">
                              {formatMoney(item.valor_neto_subtotal, currency, currencyRates)}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-xs text-muted-foreground">
                          {item.iva_incluido && item.iva_subtotal > 0
                            ? formatCLP(item.iva_subtotal)
                            : 'Exento'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900">
                          {formatCLP(item.valor_total_subtotal)}
                          {showForeignCurrency && (
                            <div className="text-[11px] font-normal text-muted-foreground">
                              {formatCurrencyAmount(item.valor_total_subtotal, currency, rate)}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Totals Summary */}
            <div className="mt-4 p-4 sm:p-5 bg-slate-50/80 border-t border-slate-200 sm:rounded-xl flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="text-xs text-muted-foreground space-y-1 max-w-md">
                <p className="font-medium text-slate-700">Condiciones Comerciales</p>
                {parsedTerms.clauses.map((clause, idx) => (
                  <p key={idx}>• {clause}</p>
                ))}
                <p>• Validez de la oferta: {parsedTerms.validityDays} días hábiles desde su emisión.</p>
                <p>
                  • Valores expresados en pesos chilenos (CLP) según normativa tributaria SII vigente
                  {totals.iva === 0 ? ' (operación exenta de IVA)' : ''}.
                </p>
              </div>
              <div className="w-full sm:w-72 space-y-1.5 text-sm">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Total Neto</span>
                  <span className="font-mono">{formatCLP(totals.valorNeto)}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>IVA Débito (19%)</span>
                  <span className="font-mono">{formatCLP(totals.iva)}</span>
                </div>
                <div className="flex justify-between items-baseline pt-2 border-t border-slate-200 font-bold text-base text-slate-900">
                  <span>Total Propuesta</span>
                  <div className="text-right font-mono">
                    <div>{formatCLP(totals.valorTotal)}</div>
                    {showForeignCurrency && (
                      <div className="text-xs font-semibold text-[#4A607A]">
                        {formatCurrencyAmount(totals.valorTotal, currency, rate)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Acceptance / Signature + Deposit Card */}
        <div
          className={cn(
            'grid grid-cols-1 gap-6 print:hidden',
            showBankCard ? 'md:grid-cols-2' : 'max-w-2xl mx-auto w-full'
          )}
        >
          <Card className="border-slate-200/90 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Aceptación Digital con RUT
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3.5">
              {isAccepted ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    Propuesta Aceptada Oficialmente
                  </div>
                  <p className="text-xs text-emerald-900">
                    Confirmada por <strong>{event.quote_accepted_by_name || 'Cliente'}</strong>. El proyecto pasó automáticamente a estado <strong>Aprobado</strong>.
                  </p>
                  {event.quote_accepted_at && (
                    <p className="text-[11px] text-emerald-700 font-mono">
                      Timbre digital: {new Date(event.quote_accepted_at).toLocaleString('es-CL')}
                    </p>
                  )}
                </div>
              ) : (
                <>
                  {isRejected && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                      Se registraron comentarios de ajuste. Puedes enviar una nueva confirmación cuando estés conforme.
                    </div>
                  )}

                  {formError && (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
                      {formError}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">Nombre Completo Autorizado *</label>
                    <Input
                      placeholder="Ej: Carolina Méndez Rojas"
                      value={signerName}
                      onChange={(e) => setSignerName(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium flex items-center justify-between">
                        <span>RUT Firmante / Empresa *</span>
                        {rutLooksTyped && (
                          <span
                            className={cn(
                              'text-[10px] font-semibold',
                              rutIsValid ? 'text-emerald-600' : 'text-destructive'
                            )}
                          >
                            {rutIsValid ? 'RUT válido' : 'DV inválido'}
                          </span>
                        )}
                      </label>
                      <Input
                        placeholder="12.345.678-9"
                        value={signerRut}
                        onChange={(e) => setSignerRut(e.target.value)}
                        onBlur={() => {
                          if (signerRut.trim().length > 2) setSignerRut(formatRutCL(signerRut));
                        }}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium">Email de Respaldo *</label>
                      <Input
                        type="email"
                        placeholder="cliente@empresa.cl"
                        value={signerEmail}
                        onChange={(e) => setSignerEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">Notas u Observaciones (Opcional)</label>
                    <Input
                      placeholder="Ej: N° de Orden de Compra, horario de coordinación o facturación..."
                      value={signerNotes}
                      onChange={(e) => setSignerNotes(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <Button
                      type="button"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                      disabled={submittingDecision !== null || items.length === 0}
                      onClick={() => handleDecision('accepted')}
                    >
                      {submittingDecision === 'accepted' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      Aprobar Cotización
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={submittingDecision !== null}
                      onClick={() => handleDecision('rejected')}
                      className="gap-1.5"
                    >
                      {submittingDecision === 'rejected' && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      Solicitar Ajustes
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Payment / Transfer Box (solo si branding.bankInfo está habilitado) */}
          {showBankCard && organization?.bank_info && (
            <Card className="border-slate-200/90 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Landmark className="h-4 w-4 text-[#4A607A]" />
                  {depositPct > 0
                    ? `Transferencia y Pago de Abono (${Math.round(depositPct * 100)}%)`
                    : 'Datos Bancarios para Pago'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                      {depositPct > 0 ? 'Abono Inicial Sugerido' : 'Monto Total Propuesta'}
                    </p>
                    <p className="text-lg font-bold font-mono text-slate-900">
                      {formatCLP(suggestedDepositClp)}
                    </p>
                  </div>
                  {showForeignCurrency && (
                    <Badge variant="outline" className="font-mono text-xs">
                      {formatCurrencyAmount(suggestedDepositClp, currency, rate)}
                    </Badge>
                  )}
                </div>

                <div className="rounded-xl border border-slate-200 p-3.5 space-y-1.5 text-xs">
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Titular:</span>
                    <span className="font-medium text-right">
                      {organization.bank_info.titular || organization.legal_name || organization.name}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">RUT:</span>
                    <span className="font-mono">{organization.bank_info.rut || organization.rut || '—'}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Banco:</span>
                    <span className="font-medium">{organization.bank_info.banco || 'Por confirmar'}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Cuenta:</span>
                    <span className="font-mono">
                      {organization.bank_info.tipo_cuenta || 'Cuenta Corriente'} ·{' '}
                      {organization.bank_info.numero_cuenta || '—'}
                    </span>
                  </div>
                  {organization.bank_info.email && (
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Notificar a:</span>
                      <span className="font-mono">{organization.bank_info.email}</span>
                    </div>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyBank}
                    className="w-full mt-2 gap-1.5"
                  >
                    {copiedBank ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        Datos Bancarios Copiados
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copiar Datos de Transferencia
                      </>
                    )}
                  </Button>
                </div>

                {branding?.multipleBankAccounts &&
                  Array.isArray(organization.secondary_accounts) &&
                  organization.secondary_accounts.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Cuentas Bancarias Adicionales
                      </p>
                      {organization.secondary_accounts.map((acc, idx) => (
                        <div
                          key={idx}
                          className="rounded-lg border border-slate-200/80 bg-slate-50/60 p-3 space-y-1 text-xs"
                        >
                          <div className="flex justify-between gap-2">
                            <span className="text-muted-foreground">Banco:</span>
                            <span className="font-medium">{acc.banco || '—'}</span>
                          </div>
                          <div className="flex justify-between gap-2">
                            <span className="text-muted-foreground">Cuenta:</span>
                            <span className="font-mono">
                              {acc.tipo_cuenta || 'Cuenta Corriente'} · {acc.numero_cuenta || '—'}
                            </span>
                          </div>
                          {acc.titular && (
                            <div className="flex justify-between gap-2">
                              <span className="text-muted-foreground">Titular:</span>
                              <span>{acc.titular}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
              </CardContent>
            </Card>
          )}
        </div>

        <footer className="text-center text-[11px] text-muted-foreground pb-6">
          {isWhiteLabel
            ? organization?.white_label_footer ||
              `${organization?.legal_name || organization?.name || ''} · ${organization?.contact_email || ''}`
            : `Documento emitido digitalmente vía FIGURA · ${organization?.contact_email || ''}`}
        </footer>
      </div>
    </div>
  );
}
