import { NextResponse } from 'next/server';
import { fetchPlansAndAddonsServer } from '@/lib/saas-storage';
import { isKhipuConfigured, isKhipuWebhookConfigured } from '@/lib/khipu';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { plans, addons, usingDatabaseTables } = await fetchPlansAndAddonsServer();
    return NextResponse.json({
      plans: plans.filter((p) => p.is_active !== false),
      addons: addons.filter((a) => a.is_active !== false),
      khipuReady: isKhipuConfigured(),
      khipuWebhookReady: isKhipuWebhookConfigured(),
      usingDatabaseTables,
    });
  } catch (err: any) {
    console.error('Error GET /api/plans:', err);
    return NextResponse.json({ error: 'No se pudieron cargar los planes.' }, { status: 500 });
  }
}
