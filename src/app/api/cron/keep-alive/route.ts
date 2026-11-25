import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { cleanupStaleDemoData } from '@/lib/demo-seed';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const expected = process.env.CRON_SECRET?.trim();
    if (process.env.NODE_ENV === 'production' && !expected) {
      return NextResponse.json({ error: 'CRON_SECRET no configurado' }, { status: 500 });
    }
    if (expected) {
      const authHeader = req.headers.get('authorization') || '';
      const expectedHeader = `Bearer ${expected}`;
      const a = Buffer.from(authHeader);
      const b = Buffer.from(expectedHeader);
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Variables de Supabase no configuradas' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Consulta ligera a la base de datos para registrar actividad y prevenir la pausa automática
    const { data, error } = await supabase
      .from('master_costs')
      .select('id')
      .limit(1);

    if (error) {
      console.error('Error en keep-alive Supabase ping:', error);
      return NextResponse.json({ status: 'error', message: 'Error de conexión con base de datos.' }, { status: 500 });
    }

    // Limpieza automática de datos de prueba antiguos (>24h) si service role está disponible
    let demoCleaned = false;
    let expiredSubscriptionsMarked = 0;
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const admin = createAdminClient();
        const res = await cleanupStaleDemoData(admin);
        demoCleaned = res.cleaned;

        // Soft-Lock automático de suscripciones vencidas (NUNCA borra datos, solo marca past_due)
        const { data: expiredOrgs } = await admin
          .from('organizations')
          .select('id')
          .eq('is_exempt', false)
          .eq('is_demo', false)
          .neq('subscription_tier', 'free')
          .eq('subscription_status', 'active')
          .lt('current_period_end', new Date().toISOString());

        if (expiredOrgs && expiredOrgs.length > 0) {
          const ids = expiredOrgs.map((o: any) => o.id);
          await admin
            .from('organizations')
            .update({ subscription_status: 'past_due' } as any)
            .in('id', ids);
          expiredSubscriptionsMarked = ids.length;
        }
      } catch (cleanupErr) {
        console.warn('Advertencia en mantenimiento automático cron:', cleanupErr);
      }
    }

    return NextResponse.json({
      status: 'active',
      timestamp: new Date().toISOString(),
      recordFound: !!data && data.length > 0,
      demoCleaned,
      expiredSubscriptionsMarked,
      message: 'Supabase mantenido activo exitosamente.',
    });
  } catch (err: any) {
    console.error('Excepción en keep-alive:', err);
    return NextResponse.json({ status: 'error', message: 'Error interno en tarea programada.' }, { status: 500 });
  }
}
