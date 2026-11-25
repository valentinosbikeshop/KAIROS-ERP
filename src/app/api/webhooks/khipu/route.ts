import { NextRequest, NextResponse } from 'next/server';
import { verifyKhipuWebhookSignature } from '@/lib/khipu';
import {
  claimAndActivateBillingPayment,
  findBillingPayment,
  markBillingPaymentFailed,
} from '@/lib/saas-storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Webhook oficial de Khipu API v3.
 * Verifica firma HMAC-SHA256 con X-Khipu-Signature sobre el raw body,
 * valida monto/moneda y reclama atómicamente la orden sin TOCTOU.
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signatureHeader = req.headers.get('x-khipu-signature');

    if (!verifyKhipuWebhookSignature(rawBody, signatureHeader)) {
      return NextResponse.json({ error: 'Firma Khipu inválida o faltante.' }, { status: 401 });
    }

    const event = JSON.parse(rawBody);
    const paymentId: string | undefined = event.payment_id || event.data?.payment_id;
    const transactionId: string | undefined = event.transaction_id || event.data?.transaction_id;
    const eventType: string = String(event.type || event.status || '').toLowerCase();
    const webhookCurrency: string | undefined = event.currency || event.data?.currency;
    const webhookAmount = event.amount ?? event.data?.amount;

    if (!paymentId && !transactionId) {
      return NextResponse.json({ received: true, ignored: 'Sin identificador de pago' });
    }

    if (
      transactionId &&
      !String(transactionId).startsWith('FIGURA-') &&
      !String(transactionId).startsWith('KAIROS-')
    ) {
      return NextResponse.json({
        received: true,
        ignored: 'Transacción fuera del ámbito SaaS',
      });
    }

    const paymentRow = await findBillingPayment({ paymentId, transactionId });
    if (!paymentRow) {
      return NextResponse.json({ received: true, ignored: 'Transacción no registrada' });
    }

    if (paymentRow.status === 'paid') {
      return NextResponse.json({ received: true, idempotent: true });
    }

    const isSuccess =
      eventType.includes('conciliated') ||
      eventType.includes('done') ||
      eventType.includes('paid') ||
      event.status === 'done';

    const isFailed =
      eventType.includes('reject') ||
      eventType.includes('expired') ||
      eventType.includes('cancel') ||
      eventType.includes('failed');

    if (isSuccess) {
      if (webhookCurrency && String(webhookCurrency).toUpperCase() !== 'CLP') {
        return NextResponse.json({ error: 'Moneda inválida en webhook' }, { status: 400 });
      }
      if (
        webhookAmount !== undefined &&
        Math.round(Number(webhookAmount)) !== paymentRow.amount_clp
      ) {
        return NextResponse.json({ error: 'Monto en webhook no coincide con la orden' }, { status: 400 });
      }

      const claim = await claimAndActivateBillingPayment(paymentRow, event);
      return NextResponse.json({ received: true, idempotent: claim.alreadyProcessed });
    }

    if (isFailed) {
      // Solo marca esta orden de pago como fallida; nunca bloquea a un cliente con mes vigente activo
      await markBillingPaymentFailed(paymentRow, event);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('Error POST /api/webhooks/khipu:', err);
    return NextResponse.json({ error: 'Webhook processing error' }, { status: 400 });
  }
}
