import crypto from 'crypto';
import { NextResponse } from 'next/server';
import {
  GoogleGenAI,
  MediaResolution,
  ThinkingLevel,
  type GenerateContentConfig,
  type GenerateContentParameters,
  type GenerateContentResponse,
} from '@google/genai';
import type { AuthenticatedContext } from '@/lib/supabase/admin';
import { resolveOrgEntitlements, isDuoProducciones } from '@/lib/entitlements';
import {
  fetchPlansAndAddonsServer,
  hydrateOrganizationSaas,
  updateOrganizationSaasConfig,
} from '@/lib/saas-storage';
import { getIndustryBlueprint } from '@/lib/industries';
import type { MasterCost, Organization } from '@/types/database';

/**
 * Perfiles de motor Gemini especializados por función de FIGURA.
 * Cada ruta utiliza el modelo + thinkingLevel + mediaResolution óptimo en relación costo/calidad:
 * - ocr: Transcripción visual de facturas/boletas/PDF escaneados (máxima velocidad, bajo costo, alta resolución visual).
 * - draft_edit: Manipulación ágil del borrador en JSON (reordenar, consolidar, editar ítems).
 * - draft_document: Extracción estructurada desde documentos adjuntos en el asistente de borradores.
 * - suggest_costs: Cotización inteligente por rubro en CLP con lógica tributaria SII (sin olvidar costos ocultos).
 * - optimize_margins: Calibración ponderada de márgenes por elasticidad para alcanzar meta global.
 * - financial_advisor: Asesor CFO Senior (razonamiento estratégico Gemini 4 Hydrogen con thinking acotado).
 * - demo_sandbox: Motor liviano protegido para sesiones Demo / prueba inicial.
 */
export type AiTaskKey =
  | 'ocr'
  | 'draft_edit'
  | 'draft_document'
  | 'suggest_costs'
  | 'optimize_margins'
  | 'financial_advisor'
  | 'demo_sandbox';

export interface AiEngineProfile {
  models: string[];
  thinkingLevel: ThinkingLevel;
  mediaResolution?: MediaResolution;
  maxOutputTokens: number;
  temperature?: number;
}

export const AI_ENGINE_PROFILES: Record<AiTaskKey, AiEngineProfile> = {
  ocr: {
    models: ['gemini-3.5-flash-lite', 'gemini-3.8-flash', 'gemini-4-hydrogen'],
    thinkingLevel: ThinkingLevel.MINIMAL,
    mediaResolution: MediaResolution.MEDIA_RESOLUTION_HIGH,
    maxOutputTokens: 3072,
    temperature: 0.1,
  },
  draft_edit: {
    models: ['gemini-3.5-flash-lite', 'gemini-3.8-flash', 'gemini-4-hydrogen'],
    thinkingLevel: ThinkingLevel.LOW,
    maxOutputTokens: 1400,
    temperature: 0.15,
  },
  draft_document: {
    models: ['gemini-3.8-flash', 'gemini-4-hydrogen', 'gemini-3.5-flash-lite'],
    thinkingLevel: ThinkingLevel.LOW,
    maxOutputTokens: 4096,
    temperature: 0.15,
  },
  suggest_costs: {
    models: ['gemini-3.8-flash', 'gemini-4-hydrogen', 'gemini-3.5-flash-lite'],
    thinkingLevel: ThinkingLevel.LOW,
    maxOutputTokens: 4096,
    temperature: 0.25,
  },
  optimize_margins: {
    models: ['gemini-3.8-flash', 'gemini-4-hydrogen', 'gemini-3.5-flash-lite'],
    thinkingLevel: ThinkingLevel.MEDIUM,
    maxOutputTokens: 3072,
  },
  financial_advisor: {
    models: ['gemini-4-hydrogen', 'gemini-3.8-flash', 'gemini-3.5-flash-lite'],
    thinkingLevel: ThinkingLevel.LOW,
    maxOutputTokens: 1200,
  },
  demo_sandbox: {
    models: ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.8-flash'],
    thinkingLevel: ThinkingLevel.MINIMAL,
    mediaResolution: MediaResolution.MEDIA_RESOLUTION_MEDIUM,
    maxOutputTokens: 1000,
    temperature: 0.2,
  },
};

// Alias de compatibilidad para importaciones existentes
export const OPTIMIZED_GEMINI_MODELS = AI_ENGINE_PROFILES.suggest_costs.models;

// Caché LRU en memoria con TTL de 10 minutos para deduplicar clics repetidos y ahorrar tokens
interface CacheEntry {
  expiresAt: number;
  data: unknown;
}
const AI_LRU_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_CACHE_ENTRIES = 160;

// Rate limiter deslizante en memoria para proteger la API key contra ráfagas o abuso en Demo
interface RateBucket {
  timestamps: number[];
}
const RATE_LIMIT_BUCKETS = new Map<string, RateBucket>();
const DEMO_LOCAL_ORG_ID = 'd0000000-0000-4000-8000-000000000000';

export function checkSlidingWindowLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = RATE_LIMIT_BUCKETS.get(key) || { timestamps: [] };
  const active = bucket.timestamps.filter((ts) => now - ts < windowMs);
  if (active.length >= maxRequests) {
    RATE_LIMIT_BUCKETS.set(key, { timestamps: active });
    return false;
  }
  active.push(now);
  RATE_LIMIT_BUCKETS.set(key, { timestamps: active });

  // Evitar crecimiento ilimitado de llaves antiguas
  if (RATE_LIMIT_BUCKETS.size > 500) {
    const firstKey = RATE_LIMIT_BUCKETS.keys().next().value;
    if (firstKey) RATE_LIMIT_BUCKETS.delete(firstKey);
  }
  return true;
}

export function extractClientIp(headers: Headers): string {
  const ip =
    headers.get('x-real-ip') ||
    headers.get('x-vercel-forwarded-for')?.split(',').pop()?.trim() ||
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'local';
  return ip.slice(0, 64) || 'local';
}

export function buildAiCacheKey(orgId: string, route: string, payload: unknown): string {
  return crypto
    .createHash('sha256')
    .update(`${orgId}:${route}:${JSON.stringify(payload)}`)
    .digest('hex');
}

export function getCachedAiResponse<T>(key: string): T | null {
  const entry = AI_LRU_CACHE.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    AI_LRU_CACHE.delete(key);
    return null;
  }
  AI_LRU_CACHE.delete(key);
  AI_LRU_CACHE.set(key, entry);
  return entry.data as T;
}

export function setCachedAiResponse(key: string, data: unknown): void {
  if (AI_LRU_CACHE.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = AI_LRU_CACHE.keys().next().value;
    if (oldestKey) AI_LRU_CACHE.delete(oldestKey);
  }
  AI_LRU_CACHE.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, data });
}

/**
 * Clasifica errores del proveedor Gemini y ejecuta backoff exponencial sólo en errores transitorios.
 */
function getHttpStatusFromError(err: any): number {
  if (typeof err?.status === 'number') return err.status;
  if (typeof err?.code === 'number') return err.code;
  const msg = String(err?.message || '');
  const match = msg.match(/\b(400|401|403|404|429|500|502|503|504)\b/);
  return match ? Number(match[1]) : 500;
}

function isRetryableProviderError(status: number, message: string): boolean {
  if ([429, 500, 502, 503, 504].includes(status)) return true;
  if (status === 404) return true; // Modelo no disponible en el tier -> pasar al siguiente inmediatamente
  const lower = message.toLowerCase();
  return (
    lower.includes('overload') ||
    lower.includes('rate') ||
    lower.includes('resource_exhausted') ||
    lower.includes('temporarily') ||
    lower.includes('unavailable') ||
    lower.includes('timeout')
  );
}

export function sanitizeAiErrorForClient(err: unknown): { message: string; status: number } {
  const status = getHttpStatusFromError(err);
  if (status === 429) {
    return {
      status: 503,
      message:
        'El servicio de Inteligencia Artificial está con alta demanda momentánea. Intenta nuevamente en unos segundos.',
    };
  }
  if (status === 401 || status === 403) {
    return {
      status: 503,
      message:
        'El motor de Inteligencia Artificial requiere revisión de credenciales en el servidor.',
    };
  }
  return {
    status: 500,
    message: 'No se pudo completar el análisis con IA en este momento. Intenta nuevamente.',
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Ejecuta una llamada a Gemini siguiendo la cascada del perfil asignado a la tarea,
 * aplicando thinkingConfig, mediaResolution, backoff exponencial en 429/503 y telemetría de tokens.
 */
export async function executeGeminiWithCascade(params: {
  task: AiTaskKey;
  contents: GenerateContentParameters['contents'];
  systemInstruction?: string;
  responseMimeType?: string;
  responseSchema?: unknown;
  thinkingLevelOverride?: ThinkingLevel;
  routeLabel: string;
  validateResponse?: (text: string) => void;
}): Promise<{ text: string; modelUsed: string }> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw Object.assign(new Error('Falta GEMINI_API_KEY'), { status: 401 });
  }

  const ai = new GoogleGenAI({ apiKey });
  const profile = AI_ENGINE_PROFILES[params.task];
  const effectiveThinking = params.thinkingLevelOverride || profile.thinkingLevel;

  let lastError: any = null;

  for (const model of profile.models) {
    const isGemini4 = model.startsWith('gemini-4');
    // Gemini 4 Hydrogen soporta LOW/MEDIUM/HIGH (no MINIMAL)
    const modelThinking =
      isGemini4 && effectiveThinking === ThinkingLevel.MINIMAL
        ? ThinkingLevel.LOW
        : effectiveThinking;

    const config: GenerateContentConfig = {
      maxOutputTokens: profile.maxOutputTokens,
      thinkingConfig: {
        thinkingLevel: modelThinking,
        includeThoughts: false,
      },
      ...(params.systemInstruction ? { systemInstruction: params.systemInstruction } : {}),
      ...(params.responseMimeType ? { responseMimeType: params.responseMimeType } : {}),
      ...(params.responseSchema ? { responseSchema: params.responseSchema as any } : {}),
      ...(profile.mediaResolution ? { mediaResolution: profile.mediaResolution } : {}),
      // Gemini 4 ignora sampling bajo thinking activo; mantenemos temperature solo en 3.x
      ...(!isGemini4 && typeof profile.temperature === 'number'
        ? { temperature: profile.temperature }
        : {}),
    };

    // Hasta 2 intentos por modelo si hay error transitorio 429/503, luego downgrade al siguiente modelo
    const maxAttempts = 2;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response: GenerateContentResponse = await ai.models.generateContent({
          model,
          contents: params.contents,
          config,
        });

        let text = response?.text?.trim() || '';
        if (params.responseMimeType === 'application/json' && text.startsWith('```')) {
          text = text
            .replace(/^```json\s*/i, '')
            .replace(/^```\s*/, '')
            .replace(/\s*```$/, '')
            .trim();
        }

        if (!text) {
          throw new Error('Respuesta vacía del modelo');
        }

        if (params.validateResponse) {
          params.validateResponse(text);
        }

        const usage = response?.usageMetadata;
        if (usage) {
          console.info(
            `[AI_USAGE] route=${params.routeLabel} task=${params.task} model=${model} in=${usage.promptTokenCount ?? 0} out=${usage.candidatesTokenCount ?? 0} think=${usage.thoughtsTokenCount ?? 0} cached=${usage.cachedContentTokenCount ?? 0}`
          );
        }

        return { text, modelUsed: model };
      } catch (err: any) {
        lastError = err;
        const status = getHttpStatusFromError(err);
        const msg = String(err?.message || '');

        console.warn(
          `[AI_FALLBACK] route=${params.routeLabel} model=${model} attempt=${attempt + 1} status=${status} msg=${msg.slice(0, 140)}`
        );

        // Si es error de autenticación o payload inválido (400/401/403), abortar rápido
        if ([400, 401, 403].includes(status)) {
          throw err;
        }

        // Si el modelo no existe (404), saltar de inmediato al siguiente modelo de la cascada
        if (status === 404) {
          break;
        }

        if (attempt === 0 && isRetryableProviderError(status, msg)) {
          await sleep(350 + Math.floor(Math.random() * 200));
          continue;
        }
        break;
      }
    }
  }

  throw lastError || new Error('Sin respuesta de los motores Gemini');
}

export interface AiGuardResult {
  allowed: boolean;
  response?: NextResponse;
  org: Organization;
  industryPrompt: string;
  isExempt: boolean;
  isDemoMode: boolean;
  consumeCredit: () => Promise<void>;
}

/**
 * Guardia centralizada para todos los endpoints de IA y OCR:
 * - Exime al 100% a DUO Producciones (empresa matriz fundadora).
 * - Protege el Modo Demo (local o BD) contra abuso de bots con tope por IP/sesión.
 * - Valida que el plan contratado incluya mod_ai_suite y controla cuota mensual atómica.
 */
export async function guardAiEndpoint(
  ctx: AuthenticatedContext,
  clientIp = 'local'
): Promise<AiGuardResult> {
  const hydratedOrg = hydrateOrganizationSaas(ctx.organization)!;
  const { plans, addons } = await fetchPlansAndAddonsServer();
  const entitlements = resolveOrgEntitlements(hydratedOrg, plans, addons);
  const blueprint = getIndustryBlueprint(entitlements.industryType);

  // 1. Exención exclusiva para DUO Producciones (nunca para demo local)
  if (isDuoProducciones(hydratedOrg)) {
    return {
      allowed: true,
      org: hydratedOrg,
      industryPrompt: blueprint.aiDomainPrompt,
      isExempt: true,
      isDemoMode: false,
      consumeCredit: async () => {},
    };
  }

  // 2. Modo Demo (Sandbox local o BD): protegido con cuota real + límite anti-bots por IP
  if (hydratedOrg.id === DEMO_LOCAL_ORG_ID || hydratedOrg.is_demo) {
    const allowedBurst = checkSlidingWindowLimit(
      `demo_ip:${clientIp}`,
      12,
      60 * 60 * 1000 // Máximo 12 llamadas IA por hora por IP en Demo
    );
    if (!allowedBurst) {
      return {
        allowed: false,
        org: hydratedOrg,
        industryPrompt: blueprint.aiDomainPrompt,
        isExempt: false,
        isDemoMode: true,
        consumeCredit: async () => {},
        response: NextResponse.json(
          {
            error:
              'Alcanzaste el límite de pruebas IA por hora del entorno Demo. Crea tu cuenta gratuita o contrata un plan para uso continuo.',
            quotaExceeded: true,
          },
          { status: 429 }
        ),
      };
    }

    return {
      allowed: true,
      org: hydratedOrg,
      industryPrompt: blueprint.aiDomainPrompt,
      isExempt: false,
      isDemoMode: true,
      consumeCredit: async () => {
        if (hydratedOrg.id === DEMO_LOCAL_ORG_ID) return;
        try {
          const { createAdminClient } = await import('@/lib/supabase/admin');
          const admin = createAdminClient();
          await (admin as any).rpc('increment_org_ai_calls', { p_org_id: hydratedOrg.id });
        } catch {
          // No bloqueante en demo
        }
      },
    };
  }

  // 3. Validación de módulo IA según plan
  if (!entitlements.modules.mod_ai_suite) {
    return {
      allowed: false,
      org: hydratedOrg,
      industryPrompt: blueprint.aiDomainPrompt,
      isExempt: false,
      isDemoMode: false,
      consumeCredit: async () => {},
      response: NextResponse.json(
        {
          error: entitlements.isExpiredLock
            ? 'Tu suscripción está vencida. Tus datos están seguros; reactiva tu plan en Suscripción para volver a usar la Suite IA.'
            : 'Tu plan actual no incluye la Suite IA. Activa el Plan Crecimiento Inteligente o añade el módulo Suite IA en Suscripción.',
          upgradeRequired: true,
          module: 'mod_ai_suite',
        },
        { status: 403 }
      ),
    };
  }

  // Protección anti-ráfaga por organización (máx. 25 llamadas por minuto)
  if (!checkSlidingWindowLimit(`org_burst:${hydratedOrg.id}`, 25, 60 * 1000)) {
    return {
      allowed: false,
      org: hydratedOrg,
      industryPrompt: blueprint.aiDomainPrompt,
      isExempt: false,
      isDemoMode: false,
      consumeCredit: async () => {},
      response: NextResponse.json(
        {
          error: 'Demasiadas consultas seguidas. Espera unos segundos antes de volver a consultar.',
        },
        { status: 429 }
      ),
    };
  }

  // Verificar si corresponde resetear contador mensual
  const now = new Date();
  const resetAt = hydratedOrg.ai_calls_reset_at ? new Date(hydratedOrg.ai_calls_reset_at) : now;
  let currentUsed = hydratedOrg.ai_calls_used || 0;
  let nextResetIso = resetAt.toISOString();

  if (now.getTime() >= resetAt.getTime()) {
    currentUsed = 0;
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    nextResetIso = nextMonth.toISOString();
    await updateOrganizationSaasConfig(hydratedOrg.id, {
      ai_calls_used: 0,
      ai_calls_reset_at: nextResetIso,
    }).catch(() => {});
  }

  if (currentUsed >= entitlements.aiCallsLimit) {
    return {
      allowed: false,
      org: hydratedOrg,
      industryPrompt: blueprint.aiDomainPrompt,
      isExempt: false,
      isDemoMode: false,
      consumeCredit: async () => {},
      response: NextResponse.json(
        {
          error: `Alcanzaste el límite de ${entitlements.aiCallsLimit} consultas IA de este mes. Puedes ampliar tu plan en la sección Suscripción.`,
          quotaExceeded: true,
        },
        { status: 429 }
      ),
    };
  }

  return {
    allowed: true,
    org: hydratedOrg,
    industryPrompt: blueprint.aiDomainPrompt,
    isExempt: false,
    isDemoMode: false,
    consumeCredit: async () => {
      try {
        const { createAdminClient } = await import('@/lib/supabase/admin');
        const admin = createAdminClient();
        // Intento atómico vía RPC SQL (evita race condition en llamadas paralelas)
        const { error: rpcErr } = await (admin as any).rpc('increment_org_ai_calls', {
          p_org_id: hydratedOrg.id,
        });
        if (!rpcErr) return;

        // Fallback seguro si la migración RPC aún no se ejecutó en Supabase
        const { data: freshOrg } = await admin
          .from('organizations')
          .select('*')
          .eq('id', hydratedOrg.id)
          .single();
        const freshHydrated = hydrateOrganizationSaas((freshOrg as Organization) || hydratedOrg)!;
        const freshUsed = freshHydrated.ai_calls_used || 0;
        await updateOrganizationSaasConfig(hydratedOrg.id, {
          ai_calls_used: freshUsed + 1,
          ai_calls_reset_at: nextResetIso,
        });
      } catch {
        // Fallback no bloqueante
      }
    },
  };
}

/**
 * Serializa ítems del borrador en formato tabular compacto (máx 180 filas para evitar saturar tokens).
 */
export function serializeDraftCompact(items: any[]): string {
  if (!items || items.length === 0) return 'BORRADOR_VACIO';
  const header = 'ID|P_ID|Serv|Det|Tipo|Cant|CostoU|GanU|Doc|Ins|IvaInc';
  const clean = (v: unknown) => String(v ?? '').replace(/[\r\n|]+/g, ' ').trim().slice(0, 65);
  const sliced = items.slice(0, 180);

  const rows = sliced.map((it) => {
    return [
      it.id,
      it.parent_id || '-',
      clean(it.servicio),
      clean(it.detalle),
      clean(it.tipo_evento || 'AI'),
      it.cantidad ?? 1,
      Math.round(Number(it.costo) || 0),
      Math.round(Number(it.ganancia) || 0),
      it.tipo_doc_costo === 'boleta' ? 'B' : 'F',
      it.es_insumo ? '1' : '0',
      it.iva_incluido !== false ? '1' : '0',
    ].join('|');
  });

  const totalCosto = items.reduce(
    (s, it) => s + (Number(it.costo) || 0) * (Number(it.cantidad) || 1),
    0
  );
  const omittedNote = items.length > sliced.length ? ` (mostrando ${sliced.length}/${items.length})` : '';
  return `${header}\n${rows.join('\n')}\nTOT_ITEMS:${items.length}${omittedNote}|COSTO_ACUM:${Math.round(totalCosto)}`;
}

/**
 * Serializa ítems aprobados en formato compacto para el Asesor Financiero CFO.
 */
export function serializeApprovedCompact(items: any[]): string {
  if (!items || items.length === 0) return 'SIN_ITEMS_APROBADOS';
  let tCosto = 0;
  let tGan = 0;
  let tVenta = 0;
  let tIvaDebito = 0;
  let tIvaCreditoEst = 0;

  const topItems = items.filter((it) => !it.parent_id);
  const rows = topItems.slice(0, 100).map((it) => {
    const qty = Number(it.cantidad) || 1;
    const c = Number(it.costo) || 0;
    const g = Number(it.ganancia) || 0;
    const vt = Number(it.valor_total) || 0;
    const iva = Number(it.iva) || 0;
    const isFactura = it.tipo_doc_costo !== 'boleta';

    tCosto += c * qty;
    if (!it.es_insumo) {
      tGan += g * qty;
      tVenta += vt * qty;
      tIvaDebito += iva * qty;
    }
    if (isFactura) {
      tIvaCreditoEst += Math.round((c - c / 1.19) * qty);
    }

    const cleanName = String(it.servicio || '').replace(/[\r\n|]+/g, ' ').slice(0, 60);
    return `${qty}x ${cleanName}|C:$${Math.round(c)}|G:$${Math.round(g)}|VTot:$${Math.round(vt * qty)}|${isFactura ? 'F' : 'B'}`;
  });

  const margen = tCosto > 0 ? ((tGan / tCosto) * 100).toFixed(1) : '0';
  const f29Est = Math.max(0, tIvaDebito - tIvaCreditoEst);
  return `RESUMEN: Costo=$${Math.round(tCosto)} | Ganancia=$${Math.round(tGan)} | VentaBruta=$${Math.round(tVenta)} | Margen=${margen}% | IVA_F29_Est=$${Math.round(f29Est)}\n${rows.join('\n')}`;
}

/**
 * Filtra el catálogo maestro a los Top-25 ítems más relevantes al contexto,
 * evitando enviar catálogos completos en cada llamada LLM.
 */
export function filterRelevantCatalog(costs: MasterCost[], queryText: string, limit = 25): string {
  const visible = costs.filter((c) => !c.servicio.startsWith('__SYSTEM_'));
  if (visible.length === 0) return 'SIN_CATALOGO';

  const tokens = queryText
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3);

  const scored = visible.map((item) => {
    const hay = `${item.servicio} ${item.tipo_evento} ${item.tiempo_detalle}`
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    let score = 0;
    for (const tk of tokens) {
      if (hay.includes(tk)) score += 2;
    }
    return { item, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored
    .slice(0, limit)
    .map(({ item }) => `${item.servicio}|${item.tipo_evento}|C:${item.costo}|G:${item.ganancia}`)
    .join('\n');
}

/**
 * Ventana deslizante de historial: conserva los últimos `maxTurns` mensajes alternando user/model.
 */
export function compactChatHistory(
  messages: Array<{ role: string; content: string }>,
  maxTurns = 6
): Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> {
  const sliced = messages.slice(-maxTurns);
  const sanitized: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

  for (const msg of sliced) {
    const role = msg.role === 'assistant' || msg.role === 'model' ? 'model' : 'user';
    const text = (msg.content || '').trim();
    if (!text) continue;
    if (sanitized.length === 0 && role === 'model') continue;

    const clipped = role === 'model' && text.length > 900 ? `${text.slice(0, 900)}...` : text;
    if (sanitized.length > 0 && sanitized[sanitized.length - 1].role === role) {
      sanitized[sanitized.length - 1].parts[0].text += `\n${clipped}`;
    } else {
      sanitized.push({ role, parts: [{ text: clipped }] });
    }
  }

  return sanitized;
}
