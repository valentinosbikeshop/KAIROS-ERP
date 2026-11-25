import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { createKhipuPayment, isKhipuConfigured } from '@/lib/khipu';
import type { Event, EventItem, Organization } from '@/types/database';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PayDepositSchema = z.object({
  depositPercent: z.union([z.literal(50), z.literal(100)]).optional().default(50),
  payerEmail: z.string().trim().email().optional().nullable(),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    if (!token || token.length < 6 || token.length > 100) {
      return NextResponse.json({ error: 'Token inválido.' }, { status: 400 });
    }

    const bodyRaw = await req.json().catch(() => ({}));
    const parsed = PayDepositSchema.safeParse(bodyRaw);
    const depositPercent = parsed.success ? parsed.data.depositPercent : 50;
    const payerEmail = parsed.success ? parsed.data.payerEmail : null;

    const admin = createAdminClient();
    const { data: eventData } = await admin
      .from('events')
      .select('id, organization_id, name, client_company')
      .eq('quote_token', token)
      .is('deleted_at', null)
      .maybeSingle();

    if (!eventData) {
      return NextResponse.json({ error: 'Cotización no encontrada.' }, { status: 404 });
    }

    const event = eventData as Pick<Event, 'id' | 'organization_id' | 'name' | 'client_company'>;

    const [{ data: itemsData }, { data: orgData }] = await Promise.all([
      admin
        .from('event_items')
        .select('servicio, tipo_evento, cantidad, valor_total, es_insumo')
        .eq('event_id', event.id)
        .eq('approved', true)
        .is('parent_id', null),
      admin
        .from('organizations')
        .select('name')
        .eq('id', event.organization_id!)
        .single(),
    ]);

    const totalVenta = ((itemsData as Partial<EventItem>[] | null) || [])
      .filter(
        (i) =>
          i.tipo_evento !== 'ABONO_CLIENTE' &&
          i.tipo_evento !== 'GASTO_REAL' &&
          i.servicio !== 'ABONO_CLIENTE' &&
          i.servicio !== 'GASTO_REAL' &&
          !i.es_insumo
      )
      .reduce((sum, i) => sum + Number(i.valor_total || 0) * (Number(i.cantidad) || 1), 0);

    const amountClp = Math.round(totalVenta * (depositPercent / 100));

    if (!isKhipuConfigured()) {
      return NextResponse.json({
        khipuConfigured: false,
        amountClp,
        message: 'Pago en línea Khipu no configurado en esta instancia. Realiza tu abono por transferencia bancaria.',
      });
    }

    if (amountClp < 500) {
      return NextResponse.json(
        { error: 'El monto del abono debe ser igual o superior a $500 CLP.' },
        { status: 400 }
      );
    }

    const origin =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
      req.nextUrl.origin;

    const orgName = (orgData as Pick<Organization, 'name'> | null)?.name || 'KAIROS ERP';
    const txId = `QUOTE-${event.id.slice(0, 8)}-${depositPercent}-${Date.now()}`;

    const khipu = await createKhipuPayment({
      amountClp,
      subject: `Abono ${depositPercent}% · ${event.name} (${orgName})`,
      body: `Reserva comercial de cotización "${event.name}" para ${event.client_company || 'Cliente'}`,
      transactionId: txId,
      returnUrl: `${origin}/q/${encodeURIComponent(token)}?payment=success`,
      cancelUrl: `${origin}/q/${encodeURIComponent(token)}?payment=cancelled`,
      notifyUrl: `${origin}/api/webhooks/khipu`,
      payerEmail,
    });

    return NextResponse.json({
      khipuConfigured: true,
      amountClp,
      paymentId: khipu.payment_id,
      paymentUrl: khipu.payment_url,
    });
  } catch (err: any) {
    console.error('Error POST /api/quotes/public/[token]/pay-deposit:', err);
    return NextResponse.json(
      { error: err?.message || 'Error al iniciar pago de abono.' },
      { status: 500 }
    );
  }
}
