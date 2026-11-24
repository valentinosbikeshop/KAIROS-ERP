export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { createAdminClient, getAuthenticatedContext } from '@/lib/supabase/admin';
import { calculateFinancials } from '@/lib/utils';
import {
  OPTIMIZED_GEMINI_MODELS,
  buildAiCacheKey,
  filterRelevantCatalog,
  getCachedAiResponse,
  guardAiEndpoint,
  setCachedAiResponse,
} from '@/lib/ai-optimizer';
import type { MasterCost } from '@/types/database';

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext(req);
    if (!ctx || !ctx.profile?.organization_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const guard = await guardAiEndpoint(ctx);
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
        { error: 'Falta configurar GEMINI_API_KEY en el servidor.' },
        { status: 500 }
      );
    }

    // Deduplicador LRU para evitar gasto de tokens en dobles clics
    const cacheKey = buildAiCacheKey(orgId, `suggest-costs:${mode}`, {
      eventDescription,
      eventType,
      customPrompt,
      customQuoteLocation,
      targetMargin,
      parsedDocuments: String(parsedDocuments).slice(0, 8000),
      itemIds: mode === 'optimize_margins' ? items.map((i: any) => `${i.id}:${i.costo}:${i.margen}`) : [],
    });

    const cached = getCachedAiResponse(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // MODO 1: Optimización de Márgenes
    if (mode === 'optimize_margins') {
      if (!items || items.length === 0) {
        return NextResponse.json({ error: 'No se enviaron ítems para optimizar' }, { status: 400 });
      }

      const desiredMargin = typeof targetMargin === 'number' ? targetMargin : 35;

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
                ganancia_sugerida: { type: Type.NUMBER },
                justificacion: { type: Type.STRING },
              },
              required: ['id', 'margen_sugerido', 'ganancia_sugerida', 'justificacion'],
            },
          },
          resumen_estrategia: { type: Type.STRING },
        },
        required: ['suggestions', 'resumen_estrategia'],
      };

      const itemsText = items
        .filter((it: any) => !it.es_insumo)
        .slice(0, 80)
        .map(
          (it: any) =>
            `${it.id}|${it.servicio}|C:$${it.costo}|Q:${it.cantidad}|M:${it.margen || 0}%|${it.tipo_doc_costo === 'boleta' ? 'B' : 'F'}`
        )
        .join('\n');

      const optimizePrompt = `Director Financiero de ${orgName}. ${guard.industryPrompt}
META MARGEN NETO GLOBAL: ${desiredMargin}%.
ÍTEMS (ID|Servicio|CostoU|Cant|MargenActual|Doc):
${itemsText}
Asigna margen_sugerido (15%-55% según elasticidad del mercado chileno) y ganancia_sugerida = Math.round(costoNeto * margen_sugerido/100) logrando promedio ponderado ~${desiredMargin}%. Justificación breve (<12 palabras).`;

      let optResponse;
      for (const model of OPTIMIZED_GEMINI_MODELS) {
        try {
          optResponse = await ai.models.generateContent({
            model,
            contents: [{ role: 'user', parts: [{ text: optimizePrompt }] }],
            config: {
              responseMimeType: 'application/json',
              responseSchema: optimizeSchema,
              maxOutputTokens: 4096,
            },
          });
          if (optResponse?.text) break;
        } catch {
          // Intentar siguiente modelo de la cascada
        }
      }

      if (!optResponse?.text) {
        throw new Error('Sin respuesta del motor de optimización de márgenes');
      }

      const parsedOpt = JSON.parse(optResponse.text);
      setCachedAiResponse(cacheKey, parsedOpt);
      await guard.consumeCredit();
      return NextResponse.json(parsedOpt);
    }

    // MODO 2: Sugerencia de Costos (calcula Neto/IVA/Total/Margen en TypeScript -> -35% tokens output y 0 errores matemáticos)
    if (!eventDescription && !customPrompt && !parsedDocuments) {
      return NextResponse.json(
        { error: 'Se requiere al menos una descripción, prompt o documento' },
        { status: 400 }
      );
    }

    let catalogString = 'SIN_CATALOGO';
    if (orgId !== 'd0000000-0000-4000-8000-000000000000') {
      try {
        const supabaseClient = createAdminClient();
        const { data: masterCosts } = await supabaseClient
          .from('master_costs')
          .select('id, servicio, tiempo_detalle, tipo_evento, costo, ganancia')
          .eq('organization_id', orgId);

        if (masterCosts && masterCosts.length > 0) {
          catalogString = filterRelevantCatalog(
            masterCosts as MasterCost[],
            `${customPrompt} ${eventDescription} ${eventType}`,
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
            required: ['servicio', 'detalle', 'tipo_evento', 'cantidad', 'costo', 'ganancia'],
          },
        },
        reasoning: { type: Type.STRING },
      },
      required: ['suggestions', 'reasoning'],
    };

    const marginRule = targetMargin
      ? `Calibra ganancia para margen promedio ~${targetMargin}% sobre costo.`
      : 'Margen sugerido 25%-40% realista en Chile (CLP).';

    const systemPrompt = `Cotizador experto de ${orgName}. ${guard.industryPrompt}
CATÁLOGO RELEVANTE (Serv|Cat|Costo|Ganancia):
${catalogString}
REGLAS: CLP reales en Chile. ${marginRule} Indica tipo_doc_costo ('factura'|'boleta'). No omitas logística oculta ni mano de obra.`;

    const userPrompt = customPrompt?.trim()
      ? `PEDIDO: "${customPrompt.trim()}"${customQuoteLocation ? ` | Proveedor/Lugar: "${customQuoteLocation.trim()}"` : ''}. Contexto: ${eventDescription || '-'} (${eventType || 'General'}). Desglosa insumos, cantidades exactas y mano de obra.`
      : `Proyecto: ${eventDescription.slice(0, 2000)} | Tipo: ${eventType} | Docs: ${String(parsedDocuments).slice(0, 8000)}`;

    let response;
    let lastError: any = null;

    for (const model of OPTIMIZED_GEMINI_MODELS) {
      try {
        response = await ai.models.generateContent({
          model,
          contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
          config: {
            responseMimeType: 'application/json',
            responseSchema: compactResponseSchema,
            maxOutputTokens: 4096,
          },
        });
        if (response?.text) break;
      } catch (e: any) {
        lastError = e;
      }
    }

    if (!response?.text) {
      throw new Error(lastError?.message || 'Sin respuesta de Gemini');
    }

    const rawParsed = JSON.parse(response.text);
    // Cálculo determinístico SII Chile en TypeScript (ahorro de tokens + precisión 100%)
    const enrichedSuggestions = (rawParsed.suggestions || []).map((s: any) => {
      const costo = Math.max(0, Math.round(Number(s.costo) || 0));
      const ganancia = Math.max(0, Math.round(Number(s.ganancia) || 0));
      const docType = s.tipo_doc_costo === 'boleta' ? 'boleta' : 'factura';
      const fin = calculateFinancials(costo, ganancia, docType, true);
      return {
        servicio: s.servicio,
        detalle: s.detalle,
        tipo_evento: s.tipo_evento,
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
      reasoning: rawParsed.reasoning || '',
    };

    setCachedAiResponse(cacheKey, finalPayload);
    await guard.consumeCredit();

    return NextResponse.json(finalPayload);
  } catch (error: any) {
    console.error('Error in suggest-costs endpoint:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
