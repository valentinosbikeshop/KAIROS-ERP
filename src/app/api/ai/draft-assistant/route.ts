import { NextRequest, NextResponse } from 'next/server';
import { Type } from '@google/genai';
import { getAuthenticatedContext } from '@/lib/supabase/admin';
import {
  compactChatHistory,
  executeGeminiWithCascade,
  extractClientIp,
  guardAiEndpoint,
  sanitizeAiErrorForClient,
  serializeDraftCompact,
} from '@/lib/ai-optimizer';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext(req);
    if (!ctx || !ctx.profile?.organization_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const guard = await guardAiEndpoint(ctx, extractClientIp(req.headers));
    if (!guard.allowed && guard.response) {
      return guard.response;
    }

    const orgName = guard.org.name || 'KAIROS ERP';
    const { messages, draftItems, fileText } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Mensajes inválidos' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Falta configurar GEMINI_API_KEY en el servidor.' },
        { status: 500 }
      );
    }

    const itemsContext = serializeDraftCompact(draftItems || []);
    const cleanFileText = typeof fileText === 'string' ? fileText.trim().slice(0, 15000) : '';
    const hasHeavyDocument = cleanFileText.length >= 300;

    // Prefijo estático arriba para aprovechar implicit prompt caching
    const systemInstruction = `Asistente de Borradores de ${orgName} (Chile). ${guard.industryPrompt}
ACCIONES DISPONIBLES (JSON):
1. CONSOLIDATE: {type, parentName, parentDetail?, parentQuantity?, itemIds:[IDs exactos]}
2. UNCONSOLIDATE: {type, parentId? | itemIds?}
3. REORDER: {type, orderedIds:[TODOS los IDs]}
4. SWAP_NAME_DETAIL: {type, itemIds:[IDs]}
5. UPDATE_ITEMS: {type, updates:[{id, servicio?, detalle?, cantidad?, costo?, ganancia?, tipo_doc_costo?, es_insumo?}]}
6. ADD_ITEMS: {type, parentName?, asConsolidated?, newItems:[{servicio, detalle?, cantidad?, costo?, ganancia?, tipo_doc_costo?('factura'|'boleta'), es_insumo?}]}
7. DELETE_ITEMS: {type, itemIds:[IDs]}

REGLAS:
- Responde conciso y directo en 'reply' (español de Chile, sin comillas envolventes ni emojis innecesarios).
- Si hay [DOCUMENTO], extrae todos los ítems con ADD_ITEMS (asConsolidated=true si corresponden a un grupo/proveedor), respetando 'factura' vs 'boleta' en tipo_doc_costo y precios numéricos enteros en CLP.
- En CONSOLIDATE siempre incluye 'itemIds' exactos no vacío.
- Si el usuario solo hace una pregunta sin pedir cambios, devuelve actions: [].

BORRADOR ACTUAL (ID|P_ID|Serv|Det|Tipo|Cant|CostoU|GanU|Doc(F/B)|Ins(1/0)|IvaInc):
${itemsContext}`;

    // Esquema tipado con valores numéricos/booleanos nativos (evita errores de parseo en CLP)
    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        reply: { type: Type.STRING },
        actions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              type: {
                type: Type.STRING,
                enum: [
                  'CONSOLIDATE',
                  'UNCONSOLIDATE',
                  'REORDER',
                  'SWAP_NAME_DETAIL',
                  'UPDATE_ITEMS',
                  'ADD_ITEMS',
                  'DELETE_ITEMS',
                ],
              },
              parentName: { type: Type.STRING },
              parentDetail: { type: Type.STRING },
              parentId: { type: Type.STRING },
              parentQuantity: { type: Type.NUMBER },
              itemIds: { type: Type.ARRAY, items: { type: Type.STRING } },
              orderedIds: { type: Type.ARRAY, items: { type: Type.STRING } },
              updates: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    servicio: { type: Type.STRING },
                    detalle: { type: Type.STRING },
                    cantidad: { type: Type.NUMBER },
                    costo: { type: Type.NUMBER },
                    ganancia: { type: Type.NUMBER },
                    tipo_doc_costo: { type: Type.STRING, enum: ['factura', 'boleta'] },
                    es_insumo: { type: Type.BOOLEAN },
                  },
                  required: ['id'],
                },
              },
              newItems: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    servicio: { type: Type.STRING },
                    detalle: { type: Type.STRING },
                    cantidad: { type: Type.NUMBER },
                    costo: { type: Type.NUMBER },
                    ganancia: { type: Type.NUMBER },
                    tipo_doc_costo: { type: Type.STRING, enum: ['factura', 'boleta'] },
                    es_insumo: { type: Type.BOOLEAN },
                  },
                  required: ['servicio'],
                },
              },
              asConsolidated: { type: Type.BOOLEAN },
            },
            required: ['type'],
          },
        },
      },
      required: ['reply', 'actions'],
    };

    const sanitizedMessages = compactChatHistory(messages, 6);
    if (sanitizedMessages.length === 0) {
      sanitizedMessages.push({
        role: 'user',
        parts: [{ text: 'Asísteme con este borrador.' }],
      });
    }

    if (cleanFileText) {
      const lastUserMsg = [...sanitizedMessages].reverse().find((m) => m.role === 'user');
      if (lastUserMsg) {
        lastUserMsg.parts.push({
          text: `\n[DOCUMENTO]:\n${cleanFileText}`,
        });
      }
    }

    // Ruteo inteligente por complejidad: documento largo -> gemini-3.8-flash; edición rápida -> gemini-3.5-flash-lite
    const taskKey = guard.isDemoMode
      ? 'demo_sandbox'
      : hasHeavyDocument
      ? 'draft_document'
      : 'draft_edit';

    const { text: responseText } = await executeGeminiWithCascade({
      task: taskKey,
      routeLabel: `draft-assistant:${taskKey}`,
      systemInstruction,
      contents: sanitizedMessages,
      responseMimeType: 'application/json',
      responseSchema,
      validateResponse: (txt) => {
        const parsed = JSON.parse(txt);
        if (typeof parsed?.reply !== 'string' || !Array.isArray(parsed?.actions)) {
          throw new Error('Estructura inválida en draft-assistant');
        }
      },
    });

    await guard.consumeCredit();
    return NextResponse.json(JSON.parse(responseText));
  } catch (error: any) {
    console.error('Error en draft assistant:', error);
    const sanitized = sanitizeAiErrorForClient(error);
    return NextResponse.json({ error: sanitized.message }, { status: sanitized.status });
  }
}
