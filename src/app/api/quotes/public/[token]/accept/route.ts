import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatRutCL, validateRutCL } from '@/lib/utils';
import type { Event } from '@/types/database';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const AcceptQuoteSchema = z.object({
  decision: z.enum(['accepted', 'rejected']),
  name: z.string().trim().min(2, 'Ingresa tu nombre completo.').max(120),
  rut: z.string().trim().min(7, 'Ingresa tu RUT chileno.').max(20),
  email: z.string().trim().email('Ingresa un correo electrónico válido.').max(150),
  notes: z.string().trim().max(1000).optional().nullable(),
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

    const rawBody = await req.json();
    const parsed = AcceptQuoteSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || 'Datos incompletos para firmar.' },
        { status: 400 }
      );
    }

    const { decision, name, rut, email, notes } = parsed.data;

    if (!validateRutCL(rut)) {
      return NextResponse.json(
        { error: 'RUT inválido según dígito verificador Módulo 11 (Ej: 12.345.678-9).' },
        { status: 400 }
      );
    }

    const formattedRut = formatRutCL(rut);
    const admin = createAdminClient();

    const { data: eventData, error: findErr } = await admin
      .from('events')
      .select('id, status, quote_status')
      .eq('quote_token', token)
      .is('deleted_at', null)
      .maybeSingle();

    if (findErr) throw findErr;
    if (!eventData) {
      return NextResponse.json({ error: 'Cotización no encontrada.' }, { status: 404 });
    }

    const existing = eventData as Pick<Event, 'id' | 'status' | 'quote_status'>;

    if (existing.quote_status === 'accepted' && decision === 'accepted') {
      return NextResponse.json({
        ok: true,
        alreadyAccepted: true,
        quote_status: 'accepted',
        status: existing.status,
      });
    }

    if (existing.quote_status === 'accepted' && decision === 'rejected') {
      return NextResponse.json(
        { error: 'Esta cotización ya fue aceptada y confirmada.' },
        { status: 409 }
      );
    }

    const nowIso = new Date().toISOString();
    const nextEventStatus =
      decision === 'accepted' && existing.status === 'planning' ? 'approved' : existing.status;

    const { error: updateErr } = await admin
      .from('events')
      .update({
        quote_status: decision,
        quote_accepted_at: decision === 'accepted' ? nowIso : null,
        quote_accepted_by_name: name,
        quote_accepted_by_rut: formattedRut,
        quote_accepted_by_email: email,
        quote_notes: notes || null,
        status: nextEventStatus,
      } as any)
      .eq('id', existing.id);

    if (updateErr) throw updateErr;

    return NextResponse.json({
      ok: true,
      quote_status: decision,
      status: nextEventStatus,
      acceptedAt: decision === 'accepted' ? nowIso : null,
      acceptedBy: name,
      acceptedRut: formattedRut,
    });
  } catch (err: any) {
    console.error('Error POST /api/quotes/public/[token]/accept:', err);
    return NextResponse.json(
      { error: err?.message || 'Error al registrar aceptación digital.' },
      { status: 500 }
    );
  }
}
