import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Deshabilitado para cobros con la credencial SaaS global:
 * cada empresa recauda los abonos de sus cotizaciones directamente
 * en su propia cuenta bancaria (transferencia informada en /q/[token]).
 */
export async function POST() {
  return NextResponse.json(
    {
      khipuConfigured: false,
      error:
        'El abono de esta cotización se realiza directamente mediante transferencia bancaria a la cuenta de la empresa emisora.',
    },
    { status: 410 }
  );
}
