import crypto from 'crypto';
import { NextResponse } from 'next/server';
import type { AuthenticatedContext } from '@/lib/supabase/admin';
import { resolveOrgEntitlements, isDuoProducciones } from '@/lib/entitlements';
import {
  fetchPlansAndAddonsServer,
  hydrateOrganizationSaas,
  updateOrganizationSaasConfig,
} from '@/lib/saas-storage';
import { getIndustryBlueprint } from '@/lib/industries';
import type { MasterCost, Organization } from '@/types/database';

// Cascada de modelos activos ordenada por eficiencia costo/latencia + respaldo
export const OPTIMIZED_GEMINI_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.6-flash',
  'gemini-3.8-flash',
];

// Caché LRU en memoria con TTL de 5 minutos para deduplicar clics repetidos y ahorrar tokens
interface CacheEntry {
  expiresAt: number;
  data: unknown;
}
const AI_LRU_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_ENTRIES = 120;

export function buildAiCacheKey(orgId: string, route: string, payload: unknown): string {
  const hash = crypto
    .createHash('sha256')
    .update(`${orgId}:${route}:${JSON.stringify(payload)}`)
    .digest('hex');
  return hash;
}

export function getCachedAiResponse<T>(key: string): T | null {
  const entry = AI_LRU_CACHE.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    AI_LRU_CACHE.delete(key);
    return null;
  }
  // Refresh LRU position
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

export interface AiGuardResult {
  allowed: boolean;
  response?: NextResponse;
  org: Organization;
  industryPrompt: string;
  isExempt: boolean;
  consumeCredit: () => Promise<void>;
}

/**
 * Guardia centralizada para todos los endpoints de IA y OCR:
 * - Exime al 100% a DUO Producciones.
 * - Valida que el plan contratado incluya mod_ai_suite (o sea Demo).
 * - Controla la cuota mensual de consultas IA sin borrar jamás datos.
 */
export async function guardAiEndpoint(ctx: AuthenticatedContext): Promise<AiGuardResult> {
  const hydratedOrg = hydrateOrganizationSaas(ctx.organization)!;
  const { plans, addons } = await fetchPlansAndAddonsServer();
  const entitlements = resolveOrgEntitlements(hydratedOrg, plans, addons);
  const blueprint = getIndustryBlueprint(entitlements.industryType);

  if (isDuoProducciones(hydratedOrg)) {
    return {
      allowed: true,
      org: hydratedOrg,
      industryPrompt: blueprint.aiDomainPrompt,
      isExempt: true,
      consumeCredit: async () => {},
    };
  }

  if (!entitlements.modules.mod_ai_suite) {
    return {
      allowed: false,
      org: hydratedOrg,
      industryPrompt: blueprint.aiDomainPrompt,
      isExempt: false,
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
    consumeCredit: async () => {
      try {
        const { createAdminClient } = await import('@/lib/supabase/admin');
        const admin = createAdminClient();
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
 * Serializa ítems del borrador en formato tabular compacto (ahorra ~70% de tokens vs texto multilínea).
 */
export function serializeDraftCompact(items: any[]): string {
  if (!items || items.length === 0) return 'BORRADOR_VACIO';
  const header = 'ID|P_ID|Serv|Det|Tipo|Cant|CostoU|GanU|Doc|Ins|IvaInc';
  const rows = items.slice(0, 500).map((it) => {
    const clean = (v: unknown) => String(v ?? '').replace(/[\r\n|]+/g, ' ').trim().slice(0, 80);
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

  const totalCosto = items.reduce((s, it) => s + (Number(it.costo) || 0) * (Number(it.cantidad) || 1), 0);
  return `${header}\n${rows.join('\n')}\nTOT_ITEMS:${items.length}|COSTO_ACUM:${Math.round(totalCosto)}`;
}

/**
 * Serializa ítems aprobados en formato compacto para el Asesor Financiero.
 */
export function serializeApprovedCompact(items: any[]): string {
  if (!items || items.length === 0) return 'SIN_ITEMS_APROBADOS';
  let tCosto = 0;
  let tGan = 0;
  let tVenta = 0;

  const rows = items.slice(0, 100).map((it) => {
    const qty = Number(it.cantidad) || 1;
    const c = Number(it.costo) || 0;
    const g = Number(it.ganancia) || 0;
    const vt = Number(it.valor_total) || 0;
    tCosto += c * qty;
    tGan += g * qty;
    tVenta += vt * qty;
    const cleanName = String(it.servicio || '').replace(/[\r\n|]+/g, ' ').slice(0, 60);
    return `${qty}x ${cleanName}|C:$${Math.round(c)}|G:$${Math.round(g)}|VTot:$${Math.round(vt * qty)}`;
  });

  const margen = tCosto > 0 ? ((tGan / tCosto) * 100).toFixed(1) : '0';
  return `RESUMEN: Costo=$${Math.round(tCosto)} | Ganancia=$${Math.round(tGan)} | Venta=$${Math.round(tVenta)} | Margen=${margen}%\n${rows.join('\n')}`;
}

/**
 * Filtra el catálogo maestro a los Top-25 ítems más relevantes al prompt del usuario,
 * evitando enviar catálogos de cientos de filas en cada llamada LLM.
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
 * Ventana deslizante de historial: conserva los últimos `maxTurns` mensajes alternando user/model
 * y elimina mensajes de bienvenida largos para ahorrar tokens.
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
