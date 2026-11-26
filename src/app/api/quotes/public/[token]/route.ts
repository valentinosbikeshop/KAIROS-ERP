import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkSlidingWindowLimit, extractClientIp } from '@/lib/ai-optimizer';
import { resolveOrgEntitlements } from '@/lib/entitlements';
import { brandingCapabilities } from '@/lib/plan-guards';
import { fetchPlansAndAddonsServer, hydrateOrganizationSaas } from '@/lib/saas-storage';
import type { Event, EventItem, Organization } from '@/types/database';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    if (!token || token.length < 6 || token.length > 100) {
      return NextResponse.json({ error: 'Enlace de cotización inválido.' }, { status: 400 });
    }

    if (token.startsWith('demo-')) {
      return NextResponse.json({ isDemoToken: true }, { status: 200 });
    }

    const clientIp = extractClientIp(_req.headers);
    const allowed = checkSlidingWindowLimit(`quote_pub:${clientIp}:${token}`, 25, 60_000);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Demasiadas consultas en pocos segundos. Intenta nuevamente.' },
        { status: 429 }
      );
    }

    const admin = createAdminClient();
    const { data: eventData, error: eventErr } = await admin
      .from('events')
      .select(
        'id, organization_id, name, client_company, location, event_date, description, status, quote_status, quote_sent_at, quote_accepted_at, quote_accepted_by_name, currency, exchange_rate, payment_terms, tax_regime'
      )
      .eq('quote_token', token)
      .is('deleted_at', null)
      .maybeSingle();

    if (eventErr) {
      throw eventErr;
    }

    if (!eventData) {
      return NextResponse.json(
        { error: 'Esta cotización no existe, fue archivada o su enlace expiró.' },
        { status: 404 }
      );
    }

    const event = eventData as Partial<Event>;

    const [{ data: orgData }, { data: itemsData }, { plans, addons }] = await Promise.all([
      admin
        .from('organizations')
        .select(
          'id, name, slug, legal_name, rut, subtitle, location, contact_email, contact_phone, logo_url, bank_info, is_demo, is_exempt, subscription_tier, subscription_status, selected_modules, current_period_end, industry_type, theme_preset, operation_mode'
        )
        .eq('id', event.organization_id!)
        .single(),
      admin
        .from('event_items')
        .select(
          'id, servicio, detalle, tipo_evento, cantidad, valor_neto, iva, valor_total, iva_incluido, es_insumo, es_exento, is_pass_through, es_reembolsable, currency'
        )
        .eq('event_id', event.id!)
        .eq('approved', true)
        .is('parent_id', null)
        .order('created_at', { ascending: true }),
      fetchPlansAndAddonsServer(),
    ]);

    const rawOrg = orgData as Organization | null;
    const org = hydrateOrganizationSaas(rawOrg);
    const entitlements = org ? resolveOrgEntitlements(org, plans, addons) : null;
    const caps = entitlements
      ? brandingCapabilities(entitlements)
      : { bankInfo: false, logo: false, whiteLabel: false, customLegalFooter: false, multipleBankAccounts: false };

    const rawBank = (org?.bank_info || {}) as Record<string, unknown>;
    const publicBankInfo = caps.bankInfo
      ? {
          banco: typeof rawBank.banco === 'string' ? rawBank.banco : '',
          tipo_cuenta: typeof rawBank.tipo_cuenta === 'string' ? rawBank.tipo_cuenta : '',
          numero_cuenta: typeof rawBank.numero_cuenta === 'string' ? rawBank.numero_cuenta : '',
          titular: typeof rawBank.titular === 'string' ? rawBank.titular : '',
          rut: typeof rawBank.rut === 'string' ? rawBank.rut : '',
          email: typeof rawBank.email === 'string' ? rawBank.email : '',
        }
      : null;

    const secondaryAccounts =
      caps.multipleBankAccounts && Array.isArray(org?.secondary_accounts)
        ? org.secondary_accounts
        : [];

    // Proyección estrictamente pública: NUNCA expone costo, ganancia, margen, abonos ni gastos reales
    const publicItems = ((itemsData as Partial<EventItem>[] | null) || [])
      .filter(
        (i) =>
          i.tipo_evento !== 'ABONO_CLIENTE' &&
          i.tipo_evento !== 'GASTO_REAL' &&
          i.servicio !== 'ABONO_CLIENTE' &&
          i.servicio !== 'GASTO_REAL' &&
          !i.es_insumo
      )
      .map((i) => {
        const qty = Number(i.cantidad) || 1;
        return {
          id: i.id,
          servicio: i.servicio,
          detalle: i.detalle || null,
          tipo_evento: i.tipo_evento || null,
          cantidad: qty,
          valor_neto_unitario: Number(i.valor_neto || 0),
          iva_unitario: Number(i.iva || 0),
          valor_total_unitario: Number(i.valor_total || 0),
          valor_neto_subtotal: Number(i.valor_neto || 0) * qty,
          iva_subtotal: Number(i.iva || 0) * qty,
          valor_total_subtotal: Number(i.valor_total || 0) * qty,
          iva_incluido: i.iva_incluido !== false,
        };
      });

    const totalNeto = publicItems.reduce((sum, i) => sum + i.valor_neto_subtotal, 0);
    const totalIva = publicItems.reduce((sum, i) => sum + i.iva_subtotal, 0);
    const totalVenta = publicItems.reduce((sum, i) => sum + i.valor_total_subtotal, 0);

    return NextResponse.json({
      event: {
        id: event.id,
        name: event.name,
        client_company: event.client_company,
        location: event.location,
        event_date: event.event_date,
        description: event.description,
        status: event.status,
        quote_status: event.quote_status || 'sent',
        quote_sent_at: event.quote_sent_at || null,
        quote_accepted_at: event.quote_accepted_at || null,
        quote_accepted_by_name: event.quote_accepted_by_name || null,
        currency: event.currency || 'CLP',
        exchange_rate: Number(event.exchange_rate || 1),
        payment_terms: event.payment_terms || null,
        tax_regime: event.tax_regime || org?.tax_regime || 'afecto_iva',
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
            bank_info: publicBankInfo,
            secondary_accounts: secondaryAccounts,
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
        suggestedDepositClp: Math.round(totalVenta * 0.5),
      },
      khipuAvailable: false,
    });
  } catch (err: any) {
    console.error('Error GET /api/quotes/public/[token]:', err);
    return NextResponse.json(
      { error: 'No se pudo cargar la cotización pública.' },
      { status: 500 }
    );
  }
}
