import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedContext } from '@/lib/supabase/admin';
import { getKhipuPaymentStatus, isKhipuConfigured } from '@/lib/khipu';
import { claimAndActivateBillingPayment, findBillingPayment } from '@/lib/saas-storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VerifyBillingSchema = z.object({
  transactionId: z.string().trim().min(1).max(128).optional(),
  paymentId: z.string().trim().min(1).max(128).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext(req);
    if (!ctx || !ctx.profile?.organization_id || !ctx.organization) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (ctx.profile.status !== 'active' || ctx.organization.is_active === false) {
      return NextResponse.json({ error: 'Cuenta o empresa inactiva.' }, { status: 403 });
    }

    if (ctx.profile.role !== 'admin' && !ctx.profile.is_super_admin) {
      return NextResponse.json(
        { error: 'Solo el administrador de la empresa puede verificar pagos.' },
        { status: 403 }
      );
    }

    const rawBody = await req.json();
    const parsed = VerifyBillingSchema.safeParse(rawBody);
    if (!parsed.success || (!parsed.data.transactionId && !parsed.data.paymentId)) {
      return NextResponse.json({ error: 'Parámetros de verificación inválidos.' }, { status: 400 });
    }

    const { transactionId, paymentId } = parsed.data;

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
    return NextResponse.json({ error: 'Error verificando el estado del pago.' }, { status: 500 });
  }
}
