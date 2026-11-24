import crypto from 'crypto';

const KHIPU_BASE_URL = 'https://payment-api.khipu.com/v3';

export interface CreateKhipuPaymentInput {
  amountClp: number;
  subject: string;
  body: string;
  transactionId: string;
  returnUrl: string;
  cancelUrl: string;
  notifyUrl: string;
  payerEmail?: string | null;
}

export interface KhipuPaymentResponse {
  payment_id: string;
  payment_url: string;
  simplified_transfer_url?: string;
  transfer_url?: string;
  app_url?: string;
  ready_for_terminal?: boolean;
}

export function isKhipuConfigured(): boolean {
  return Boolean(process.env.KHIPU_API_KEY && process.env.KHIPU_API_KEY.trim().length > 0);
}

export function isKhipuWebhookConfigured(): boolean {
  return Boolean(process.env.KHIPU_WEBHOOK_SECRET && process.env.KHIPU_WEBHOOK_SECRET.trim().length > 0);
}

/**
 * Crea un cobro en Khipu API v3 usando x-api-key.
 * Documentación: POST https://payment-api.khipu.com/v3/payments
 */
export async function createKhipuPayment(
  input: CreateKhipuPaymentInput
): Promise<KhipuPaymentResponse> {
  const apiKey = process.env.KHIPU_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('KHIPU_API_KEY no configurada en variables de entorno.');
  }

  const payload = {
    amount: Math.round(input.amountClp),
    currency: 'CLP',
    subject: input.subject.slice(0, 255),
    body: input.body.slice(0, 1000),
    transaction_id: input.transactionId.slice(0, 255),
    return_url: input.returnUrl,
    cancel_url: input.cancelUrl,
    notify_url: input.notifyUrl,
    notify_api_version: '3.0',
    ...(input.payerEmail ? { payer_email: input.payerEmail } : {}),
  };

  const res = await fetch(`${KHIPU_BASE_URL}/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Error Khipu API v3 (${res.status}): ${errText || res.statusText}`);
  }

  return (await res.json()) as KhipuPaymentResponse;
}

/**
 * Consulta el estado real de un pago en Khipu API v3.
 */
export async function getKhipuPaymentStatus(paymentId: string): Promise<{
  payment_id: string;
  status: 'pending' | 'verifying' | 'done';
  amount?: number;
  currency?: string;
  transaction_id?: string;
  conciliation_date?: string;
}> {
  const apiKey = process.env.KHIPU_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('KHIPU_API_KEY no configurada.');
  }

  const res = await fetch(`${KHIPU_BASE_URL}/payments/${encodeURIComponent(paymentId)}`, {
    method: 'GET',
    headers: {
      'x-api-key': apiKey,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Error consultando pago Khipu (${res.status}): ${errText}`);
  }

  return await res.json();
}

/**
 * Verifica la firma criptográfica HMAC-SHA256 del webhook Khipu API v3.
 * Header: X-Khipu-Signature: t=<timestamp>,s=<signature>
 * Payload firmado: `${t}.${rawBody}`
 */
export function verifyKhipuWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  webhookSecret: string | undefined = process.env.KHIPU_WEBHOOK_SECRET
): boolean {
  if (!signatureHeader || !webhookSecret) {
    return false;
  }

  try {
    const parts = signatureHeader.split(',').map((p) => p.trim());
    const tPart = parts.find((p) => p.startsWith('t='));
    const sPart = parts.find((p) => p.startsWith('s='));
    if (!tPart || !sPart) return false;

    const timestamp = tPart.slice(2);
    const receivedSig = sPart.slice(2);
    if (!timestamp || !receivedSig) return false;

    // Protección anti-replay estricta (t= debe ser numérico positivo dentro de 10 minutos)
    const numericTs = Number(timestamp);
    if (!Number.isFinite(numericTs) || numericTs <= 0) {
      return false;
    }
    const tsMs = numericTs > 1e12 ? numericTs : numericTs * 1000;
    if (Math.abs(Date.now() - tsMs) > 10 * 60 * 1000) {
      return false;
    }

    const signedPayload = `${timestamp}.${rawBody}`;
    const hmacBase64 = crypto
      .createHmac('sha256', webhookSecret.trim())
      .update(signedPayload, 'utf8')
      .digest('base64');

    const hmacHex = crypto
      .createHmac('sha256', webhookSecret.trim())
      .update(signedPayload, 'utf8')
      .digest('hex');

    const receivedBuf = Buffer.from(receivedSig);
    const b64Buf = Buffer.from(hmacBase64);
    const hexBuf = Buffer.from(hmacHex);

    if (receivedBuf.length === b64Buf.length && crypto.timingSafeEqual(receivedBuf, b64Buf)) {
      return true;
    }
    if (receivedBuf.length === hexBuf.length && crypto.timingSafeEqual(receivedBuf, hexBuf)) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}
