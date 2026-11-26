import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient, getAuthenticatedContext } from '@/lib/supabase/admin';
import { resolveOrgEntitlements } from '@/lib/entitlements';
import { computeProjectFinancials } from '@/lib/finance-core';
import { canUseModule } from '@/lib/plan-guards';
import { fetchPlansAndAddonsServer, hydrateOrganizationSaas } from '@/lib/saas-storage';
import type { Event, EventItem, Organization } from '@/types/database';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ShareQuoteSchema = z.object({
  eventId: z.string().min(4).max(100),
});

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext(req);
    if (!ctx?.profile || ctx.profile.status !== 'active' || !ctx.organization) {
      return NextResponse.json({ error: 'No autenticado o sin empresa activa.' }, { status: 401 });
    }

    const rawBody = await req.json();
    const parsed = ShareQuoteSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Identificador de proyecto inválido.' }, { status: 400 });
    }

    const { eventId } = parsed.data;

    if (ctx.organization.is_demo) {
      const demoToken = `demo-${eventId}`;
      return NextResponse.json({
        token: demoToken,
        url: `/q/${demoToken}`,
        quote_status: 'sent',
      });
    }

    const org = hydrateOrganizationSaas(ctx.organization as Organization)!;
    const { plans, addons } = await fetchPlansAndAddonsServer();
    const entitlements = resolveOrgEntitlements(org, plans, addons);

    if (!canUseModule(entitlements, 'mod_pdf_quotes')) {
      return NextResponse.json(
        {
          error:
            'El Portal Web Interactivo de Cotización requiere el Plan Operación Esencial ($34.990/mes) o el módulo Cotizaciones PDF.',
          upgradeRequired: true,
        },
        { status: 403 }
      );
    }

    const admin = createAdminClient();
    const { data: eventData, error: eventErr } = await admin
      .from('events')
      .select('*')
      .eq('id', eventId)
      .eq('organization_id', org.id)
      .is('deleted_at', null)
      .single();

    if (eventErr || !eventData) {
      return NextResponse.json({ error: 'Proyecto no encontrado en tu empresa.' }, { status: 404 });
    }

    const event = eventData as Event;

    const { data: itemsData } = await admin
      .from('event_items')
      .select('*')
      .eq('event_id', event.id)
      .eq('approved', true)
      .is('parent_id', null);

    const quoteItems = ((itemsData as EventItem[] | null) || []).filter(
      (i) =>
        i.tipo_evento !== 'ABONO_CLIENTE' &&
        i.tipo_evento !== 'GASTO_REAL' &&
        i.servicio !== 'ABONO_CLIENTE' &&
        i.servicio !== 'GASTO_REAL'
    );

    const projectFin = computeProjectFinancials(quoteItems, {
      taxRegime: event.tax_regime || org.tax_regime,
      onlyApproved: true,
    });
    const projectMargin =
      projectFin.facturacionNetaSinReembolsables > 0
        ? projectFin.margenOperacionalPct
        : 100;
    const minMarginFloor = org.min_margin_pct ?? 15;
    const isAdminUser =
      ctx.profile.role === 'admin' ||
      ctx.profile.role === 'owner' ||
      ctx.profile.role === 'finanzas' ||
      Boolean(ctx.profile.is_super_admin);

    if (
      !isAdminUser &&
      quoteItems.length > 0 &&
      projectMargin < minMarginFloor &&
      !event.min_margin_override_approved
    ) {
      return NextResponse.json(
        {
          error: `Margen del proyecto (${projectMargin.toFixed(1)}%) está bajo el piso autorizado (${minMarginFloor}%). Un Administrador debe aprobar la excepción antes de compartir la cotización.`,
          marginBlocked: true,
        },
        { status: 403 }
      );
    }

    const token = event.quote_token || crypto.randomBytes(18).toString('base64url');
    const nextQuoteStatus = event.quote_status === 'accepted' ? 'accepted' : 'sent';
    const sentAt = new Date().toISOString();

    const { error: updateErr } = await admin
      .from('events')
      .update({
        quote_token: token,
        quote_status: nextQuoteStatus,
        quote_sent_at: sentAt,
      } as any)
      .eq('id', event.id);

    if (updateErr) {
      const errMsg = String(updateErr.message || '');
      if (
        updateErr.code === 'PGRST204' ||
        errMsg.includes('quote_token') ||
        errMsg.includes('quote_status')
      ) {
        console.error('Missing migration 20261126_competitive_erp_features.sql:', updateErr.message);
        return NextResponse.json(
          {
            error:
              'El portal público de cotizaciones aún no está habilitado en la base de datos. Contacta a soporte.',
            migrationRequired: true,
          },
          { status: 503 }
        );
      }
      throw updateErr;
    }

    return NextResponse.json({
      token,
      url: `/q/${token}`,
      quote_status: nextQuoteStatus,
      quote_sent_at: sentAt,
    });
  } catch (err: any) {
    console.error('Error POST /api/quotes/share:', err);
    return NextResponse.json(
      { error: 'No se pudo generar el enlace de cotización.' },
      { status: 500 }
    );
  }
}
