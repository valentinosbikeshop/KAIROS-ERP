import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedContext } from '@/lib/supabase/admin';
import { getKhipuPaymentStatus, isKhipuConfigured } from '@/lib/khipu';
import { claimAndActivateBillingPayment, findBillingPayment } from '@/lib/saas-storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext(req);
    if (!ctx || !ctx.profile?.organization_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { transactionId, paymentId } = await req.json();
    if (!transactionId && !paymentId) {
      return NextResponse.json({ error: 'Falta transactionId o paymentId' }, { status: 400 });
    }

    const paymentRow = await findBillingPayment({
      paymentId,
      transactionId,
      organizationId: ctx.profile.organization_id,
    });

    if (!paymentRow) {
      return NextResponse.json({ error: 'Transacción no encontrada.' }, { status: 404 });
    }

    if (paymentRow.status === 'paid') {
      return NextResponse.json({
        verified: true,
        alreadyProcessed: true,
        tier: paymentRow.tier,
      });
    }

    if (!isKhipuConfigured() || !paymentRow.khipu_payment_id) {
      return NextResponse.json({ verified: false, status: paymentRow.status });
    }

    const khipuStatus = await getKhipuPaymentStatus(paymentRow.khipu_payment_id);
    if (khipuStatus.status !== 'done') {
      return NextResponse.json({
        verified: false,
        status: khipuStatus.status,
      });
    }

    // Validación estricta de monto y moneda CLP antes de activar
    if (khipuStatus.currency && khipuStatus.currency.toUpperCase() !== 'CLP') {
      return NextResponse.json({ error: 'Moneda de pago inválida.' }, { status: 400 });
    }
    if (
      khipuStatus.amount !== undefined &&
      Math.round(Number(khipuStatus.amount)) !== paymentRow.amount_clp
    ) {
      return NextResponse.json({ error: 'Monto pagado no coincide con la orden.' }, { status: 400 });
    }

    const claim = await claimAndActivateBillingPayment(paymentRow);

    return NextResponse.json({
      verified: true,
      alreadyProcessed: claim.alreadyProcessed,
      tier: paymentRow.tier,
      periodEnd: claim.periodEnd,
    });
  } catch (err: any) {
    console.error('Error POST /api/billing/verify:', err);
    return NextResponse.json({ error: err.message || 'Error verificando pago.' }, { status: 500 });
  }
}
