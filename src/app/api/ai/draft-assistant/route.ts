import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { getAuthenticatedContext } from '@/lib/supabase/admin';
import {
  OPTIMIZED_GEMINI_MODELS,
  compactChatHistory,
  guardAiEndpoint,
  serializeDraftCompact,
} from '@/lib/ai-optimizer';

export const runtime = 'nodejs';

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

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const itemsContext = serializeDraftCompact(draftItems || []);

    const systemInstruction = `Asistente de Borradores de ${orgName}. ${guard.industryPrompt}
BORRADOR ACTUAL (columnas ID|P_ID|Serv|Det|Tipo|Cant|CostoU|GanU|Doc(F/B)|Ins(1/0)|IvaInc):
${itemsContext}

ACCIONES DISPONIBLES (JSON):
1. CONSOLIDATE: {type, parentName, parentDetail?, parentQuantity?, itemIds:[IDs exactos]}
2. UNCONSOLIDATE: {type, parentId? | itemIds?}
3. REORDER: {type, orderedIds:[TODOS los IDs]}
4. SWAP_NAME_DETAIL: {type, itemIds:[IDs]}
5. UPDATE_ITEMS: {type, updates:[{id, servicio?, detalle?, cantidad?, costo?, ganancia?, tipo_doc_costo?, es_insumo?}]}
6. ADD_ITEMS: {type, parentName?, asConsolidated?, newItems:[{servicio, detalle?, cantidad?, costo?, ganancia?, tipo_doc_costo?('factura'|'boleta'), es_insumo?}]}
7. DELETE_ITEMS: {type, itemIds:[IDs]}

REGLAS:
- Responde conciso en 'reply' (es-CL).
- Si hay [DOCUMENTO], extrae grupos con ADD_ITEMS (asConsolidated=true) respetando Boleta/Factura en tipo_doc_costo.
- En CONSOLIDATE siempre incluye 'itemIds' no vacío.
- Si no hay cambios, devuelve actions: [].`;

    // Esquema esbelto: sólo 'type' es obligatorio por acción, ahorrando cientos de tokens de campos vacíos
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
                    cantidad: { type: Type.STRING },
                    costo: { type: Type.STRING },
                    ganancia: { type: Type.STRING },
                    tipo_doc_costo: { type: Type.STRING },
                    es_insumo: { type: Type.STRING },
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
                    cantidad: { type: Type.STRING },
                    costo: { type: Type.STRING },
                    ganancia: { type: Type.STRING },
                    tipo_doc_costo: { type: Type.STRING },
                    es_insumo: { type: Type.STRING },
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

    if (fileText && fileText.trim()) {
      const lastUserMsg = [...sanitizedMessages].reverse().find((m) => m.role === 'user');
      if (lastUserMsg) {
        lastUserMsg.parts.push({
          text: `\n[DOCUMENTO]:\n${fileText.trim().slice(0, 18000)}`,
        });
      }
    }

    let responseText: string | null = null;
    let lastError: any = null;

    for (const model of OPTIMIZED_GEMINI_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: sanitizedMessages,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema,
            maxOutputTokens: 4096,
          },
        });

        if (response?.text) {
          let cleaned = response.text.trim();
          if (cleaned.startsWith('```')) {
            cleaned = cleaned.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
          }
          JSON.parse(cleaned);
          responseText = cleaned;
          break;
        }
      } catch (e: any) {
        lastError = e;
      }
    }

    if (!responseText) {
      throw new Error(lastError?.message || 'No hubo respuesta válida de la IA');
    }

    await guard.consumeCredit();
    return NextResponse.json(JSON.parse(responseText));
  } catch (error: any) {
    console.error('Error en draft assistant:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno al procesar con IA' },
      { status: 500 }
    );
  }
}
