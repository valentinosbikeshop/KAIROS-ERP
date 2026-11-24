import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { getAuthenticatedContext } from '@/lib/supabase/admin';
import {
  OPTIMIZED_GEMINI_MODELS,
  compactChatHistory,
  guardAiEndpoint,
  serializeApprovedCompact,
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
    const { messages, eventData, approvedItems, filesText } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Formato de mensajes inválido' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Falta configurar GEMINI_API_KEY en el servidor.' },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const budgetContext = serializeApprovedCompact(approvedItems || []);

    const systemPrompt = `Asesor Financiero Senior de ${orgName} (Chile). ${guard.industryPrompt}
PROYECTO: ${eventData?.name || '-'} | Cliente: ${eventData?.client || '-'} | Estado: ${eventData?.status || '-'}
DESCRIPCIÓN: ${String(eventData?.description || 'Sin descripción').slice(0, 600)}
PRESUPUESTO ACTUAL:
${budgetContext}

REGLAS:
- Responde directo en Markdown es-CL (tablas o viñetas ejecutivas, sin rellenos).
- Identifica ítems con margen bajo, costos hundidos u omisiones operativas críticas del rubro.
- Si el margen global < 30%, alerta y sugiere ajustes concretos en CLP.`;

    const formattedMessages = compactChatHistory(messages, 6);
    if (formattedMessages.length === 0) {
      formattedMessages.push({
        role: 'user',
        parts: [{ text: 'Analiza la rentabilidad actual de este presupuesto.' }],
      });
    }

    if (filesText && String(filesText).trim()) {
      const lastUserMsg = [...formattedMessages].reverse().find((m) => m.role === 'user');
      if (lastUserMsg) {
        lastUserMsg.parts.push({
          text: `\n[ARCHIVO ADJUNTO COMPLETO]:\n${String(filesText).trim().slice(0, 12000)}`,
        });
      }
    }

    let response;
    let lastError: any = null;

    for (const model of OPTIMIZED_GEMINI_MODELS) {
      try {
        response = await ai.models.generateContent({
          model,
          contents: formattedMessages,
          config: {
            systemInstruction: systemPrompt,
            maxOutputTokens: 4096,
          },
        });
        if (response?.text) break;
      } catch (e: any) {
        lastError = e;
      }
    }

    if (!response?.text) {
      throw new Error(lastError?.message || 'Sin respuesta del asesor IA');
    }

    await guard.consumeCredit();
    return NextResponse.json({ reply: response.text });
  } catch (error: any) {
    console.error('Error en financial advisor:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
