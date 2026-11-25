import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, getAuthenticatedContext } from '@/lib/supabase/admin';
import { hydrateOrganizationSaas } from '@/lib/saas-storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext(req);
    if (!ctx || !ctx.profile?.organization_id || !ctx.organization) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (ctx.profile.status !== 'active' || ctx.organization.is_active === false) {
      return NextResponse.json({ error: 'Cuenta o empresa inactiva.' }, { status: 403 });
    }

    if (ctx.profile.role !== 'admin' && !ctx.profile.is_super_admin) {
      return NextResponse.json({ error: 'Acceso restringido a administradores.' }, { status: 403 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('billing_payments')
      .select(
        'id, khipu_payment_id, transaction_id, tier, selected_modules, amount_clp, currency, status, payment_url, period_start, period_end, paid_at, created_at'
      )
      .eq('organization_id', ctx.profile.organization_id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      return NextResponse.json({ payments: data });
    }

    const hydrated = hydrateOrganizationSaas(ctx.organization);
    const fallbackPayments = hydrated?.bank_info?.__saas_config?.pending_payments || [];
    return NextResponse.json({ payments: fallbackPayments });
  } catch {
    return NextResponse.json({ payments: [] });
  }
}
