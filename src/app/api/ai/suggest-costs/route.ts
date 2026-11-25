export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { Type } from '@google/genai';
import { createAdminClient, getAuthenticatedContext } from '@/lib/supabase/admin';
import { calculateFinancials, calculateFinancialsFromMargin } from '@/lib/utils';
import {
  buildAiCacheKey,
  executeGeminiWithCascade,
  extractClientIp,
  filterRelevantCatalog,
  getCachedAiResponse,
  guardAiEndpoint,
  sanitizeAiErrorForClient,
  setCachedAiResponse,
} from '@/lib/ai-optimizer';
import type { MasterCost } from '@/types/database';

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext(req, { allowLocalDemo: true });
    if (!ctx || !ctx.profile?.organization_id || !ctx.organization) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    if (ctx.profile.status !== 'active' || ctx.organization.is_active === false) {
      return NextResponse.json({ error: 'Cuenta o empresa inactiva.' }, { status: 403 });
    }

    const guard = await guardAiEndpoint(ctx, extractClientIp(req.headers));
    if (!guard.allowed && guard.response) {
      return guard.response;
    }

    const orgId = ctx.profile.organization_id;
    const orgName = guard.org.name || 'KAIROS ERP';

    const body = await req.json();
    const {
      eventDescription = '',
      parsedDocuments = '',
      eventType = '',
      customPrompt = '',
      customQuoteLocation = '',
      targetMargin,
      mode = 'suggest_costs',
      items = [],
    } = body;

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'El motor de IA no está disponible temporalmente. Contacta a soporte.' },
        { status: 500 }
      );
    }

    // Deduplicador LRU para evitar gasto de tokens y doble consumo en clics repetidos
    const cacheKey = buildAiCacheKey(orgId, `suggest-costs:${mode}`, {
      eventDescription: String(eventDescription).slice(0, 4000),
      eventType,
      customPrompt,
      customQuoteLocation,
      targetMargin,
      parsedDocuments: String(parsedDocuments).slice(0, 12000),
      itemIds:
        mode === 'optimize_margins'
          ? items.map((i: any) => `${i.id}:${i.costo}:${i.margen}:${i.tipo_doc_costo}`)
          : [],
    });

    const cached = getCachedAiResponse(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // MODO 1: Optimización Ponderada de Márgenes (usa gemini-3.8-flash con Thinking MEDIUM; ganancia se calcula en TS)
    if (mode === 'optimize_margins') {
      if (!items || items.length === 0) {
        return NextResponse.json({ error: 'No se enviaron ítems para optimizar' }, { status: 400 });
      }

      const desiredMargin = typeof targetMargin === 'number' ? targetMargin : 35;

      // Esquema ultra-compacto: no pide ganancia_sugerida al LLM (se calcula determinísticamente en TypeScript -> -20% output tokens)
      const optimizeSchema = {
        type: Type.OBJECT,
        properties: {
          suggestions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                margen_sugerido: { type: Type.NUMBER },
                justificacion: { type: Type.STRING },
              },
              required: ['id', 'margen_sugerido', 'justificacion'],
            },
          },
          resumen_estrategia: { type: Type.STRING },
        },
        required: ['suggestions', 'resumen_estrategia'],
      };

      const eligibleItems = items.filter((it: any) => !it.es_insumo).slice(0, 80);
      const itemsText = eligibleItems
        .map(
          (it: any) =>
            `${it.id}|${String(it.servicio || '').slice(0, 50)}|C:$${Math.round(Number(it.costo) || 0)}|Q:${it.cantidad || 1}|M:${it.margen || 0}%|${it.tipo_doc_costo === 'boleta' ? 'B' : 'F'}`
        )
        .join('\n');

      const optimizePrompt = `Director Financiero B2B de ${orgName} (Chile). ${guard.industryPrompt}
META MARGEN PONDERADO GLOBAL: ${desiredMargin}%.
ÍTEMS (ID|Servicio|CostoU_CLP|Cant|MargenActual|Doc):
${itemsText}
Reglas:
1. Asigna margen_sugerido (15%-60% según elasticidad del mercado chileno: mayor margen en servicios/talento propio, menor en commodities/subcontratos) para que el promedio ponderado global quede cerca de ${desiredMargin}%.
2. Justificación ejecutiva en español de Chile (<12 palabras, sin comillas dobles ni emojis).`;

      const { text: rawOptText } = await executeGeminiWithCascade({
        task: guard.isDemoMode ? 'demo_sandbox' : 'optimize_margins',
        routeLabel: 'suggest-costs:optimize_margins',
        contents: [{ role: 'user', parts: [{ text: optimizePrompt }] }],
        responseMimeType: 'application/json',
        responseSchema: optimizeSchema,
        validateResponse: (txt) => {
          const parsed = JSON.parse(txt);
          if (!Array.isArray(parsed?.suggestions)) {
            throw new Error('Falta array suggestions en optimize_margins');
          }
        },
      });

      const parsedOpt = JSON.parse(rawOptText);
      const itemMap = new Map<string, any>(eligibleItems.map((it: any) => [it.id, it]));

      // Enriquecer determinísticamente con ganancia_sugerida exacta SII
      const enrichedOpt = {
        suggestions: (parsedOpt.suggestions || []).map((s: any) => {
          const orig = itemMap.get(s.id);
          const clampedMargin = Math.max(5, Math.min(150, Number(s.margen_sugerido) || desiredMargin));
          const fin = orig
            ? calculateFinancialsFromMargin(
                Number(orig.costo) || 0,
                clampedMargin,
                orig.tipo_doc_costo === 'boleta' ? 'boleta' : 'factura',
                orig.iva_incluido ?? true,
                false
              )
            : { ganancia: 0 };

          return {
            id: s.id,
            margen_sugerido: Math.round(clampedMargin * 10) / 10,
            ganancia_sugerida: fin.ganancia,
            justificacion: String(s.justificacion || '')
              .replace(/^["']|["']$/g, '')
              .trim(),
          };
        }),
        resumen_estrategia: String(parsedOpt.resumen_estrategia || '')
          .replace(/^["']|["']$/g, '')
          .trim(),
      };

      setCachedAiResponse(cacheKey, enrichedOpt);
      await guard.consumeCredit();
      return NextResponse.json(enrichedOpt);
    }

    // MODO 2: Sugerencia de Costos y Extracción de Cotizaciones (gemini-3.8-flash + cálculo SII en TS)
    if (!eventDescription && !customPrompt && !parsedDocuments) {
      return NextResponse.json(
        { error: 'Se requiere al menos una descripción, prompt o documento' },
        { status: 400 }
      );
    }

    const docSnippet = String(parsedDocuments || '').trim().slice(0, 12000);
    const descSnippet = String(eventDescription || '').trim().slice(0, 4000);

    let catalogString = 'SIN_CATALOGO';
    if (!guard.isDemoMode && orgId !== 'd0000000-0000-4000-8000-000000000000') {
      try {
        const supabaseClient = createAdminClient();
        const { data: masterCosts } = await supabaseClient
          .from('master_costs')
          .select('id, servicio, tiempo_detalle, tipo_evento, costo, ganancia')
          .eq('organization_id', orgId);

        if (masterCosts && masterCosts.length > 0) {
          catalogString = filterRelevantCatalog(
            masterCosts as MasterCost[],
            `${customPrompt} ${descSnippet} ${docSnippet.slice(0, 2000)} ${eventType}`,
            25
          );
        }
      } catch {
        // Continuar sin catálogo
      }
    }

    const compactResponseSchema = {
      type: Type.OBJECT,
      properties: {
        suggestions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              servicio: { type: Type.STRING },
              detalle: { type: Type.STRING },
              tipo_evento: { type: Type.STRING },
              cantidad: { type: Type.INTEGER },
              costo: { type: Type.NUMBER },
              ganancia: { type: Type.NUMBER },
              tipo_doc_costo: { type: Type.STRING, enum: ['factura', 'boleta'] },
            },
            required: ['servicio', 'detalle', 'tipo_evento', 'cantidad', 'costo', 'ganancia', 'tipo_doc_costo'],
          },
        },
        reasoning: { type: Type.STRING },
      },
      required: ['suggestions', 'reasoning'],
    };

    const marginRule = targetMargin
      ? `Calibra ganancia para lograr margen promedio ~${targetMargin}% sobre costo neto.`
      : 'Aplica margen realista en Chile (25%-40% sobre costo neto).';

    // Prefijo estático arriba para aprovechar implicit prompt caching
    const systemInstruction = `Cotizador Senior especialista en presupuestos chilenos (CLP) para ${orgName}.
${guard.industryPrompt}
REGLAS:
- Usa precios unitarios reales en CLP de Chile y cantidades exactas según magnitud.
- ${marginRule}
- Asigna tipo_doc_costo: 'factura' (proveedores/materiales/arriendos que recuperan 19% IVA Crédito) o 'boleta' (personal/honorarios con retención 15,25% 2026 o boleta simple sin IVA crédito).
- Nunca omitas logística oculta (fletes, montaje, viáticos, consumibles, merma o imprevistos) cuando aplique al pedido.
- Responde conciso en español de Chile sin comillas envolventes ni rellenos.`;

    const userPromptParts: string[] = [`CATÁLOGO RELEVANTE (Serv|Cat|Costo|Ganancia):\n${catalogString}`];

    if (customPrompt?.trim()) {
      userPromptParts.push(
        `PEDIDO: "${customPrompt.trim()}"${customQuoteLocation ? ` | Lugar/Proveedor: "${customQuoteLocation.trim()}"` : ''}`
      );
    }
    if (descSnippet) {
      userPromptParts.push(`CONTEXTO PROYECTO (${eventType || 'General'}):\n${descSnippet}`);
    }
    if (docSnippet) {
      userPromptParts.push(`DOCUMENTO ADJUNTO:\n${docSnippet}`);
    }

    const { text: rawCostText } = await executeGeminiWithCascade({
      task: guard.isDemoMode ? 'demo_sandbox' : 'suggest_costs',
      routeLabel: 'suggest-costs:suggest',
      systemInstruction,
      contents: [{ role: 'user', parts: [{ text: userPromptParts.join('\n\n') }] }],
      responseMimeType: 'application/json',
      responseSchema: compactResponseSchema,
      validateResponse: (txt) => {
        const parsed = JSON.parse(txt);
        if (!Array.isArray(parsed?.suggestions)) {
          throw new Error('Falta array suggestions en suggest_costs');
        }
      },
    });

    const rawParsed = JSON.parse(rawCostText);
    // Cálculo determinístico SII Chile en TypeScript (ahorro de tokens + precisión 100%)
    const enrichedSuggestions = (rawParsed.suggestions || []).map((s: any) => {
      const costo = Math.max(0, Math.round(Number(s.costo) || 0));
      const ganancia = Math.max(0, Math.round(Number(s.ganancia) || 0));
      const docType = s.tipo_doc_costo === 'boleta' ? 'boleta' : 'factura';
      const fin = calculateFinancials(costo, ganancia, docType, true);
      return {
        servicio: String(s.servicio || 'Servicio').trim(),
        detalle: String(s.detalle || '').trim(),
        tipo_evento: String(s.tipo_evento || 'General').trim(),
        cantidad: Math.max(1, Math.round(Number(s.cantidad) || 1)),
        costo,
        ganancia,
        valor_neto: fin.valorNeto,
        iva: fin.iva,
        valor_total: fin.valorTotal,
        margen: fin.margen,
        tipo_doc_costo: docType,
      };
    });

    const finalPayload = {
      suggestions: enrichedSuggestions,
      reasoning: String(rawParsed.reasoning || '')
        .replace(/^["']|["']$/g, '')
        .trim(),
    };

    setCachedAiResponse(cacheKey, finalPayload);
    await guard.consumeCredit();

    return NextResponse.json(finalPayload);
  } catch (error: any) {
    console.error('Error in suggest-costs endpoint:', error);
    const sanitized = sanitizeAiErrorForClient(error);
    return NextResponse.json({ error: sanitized.message }, { status: sanitized.status });
  }
}
