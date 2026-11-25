import { NextRequest, NextResponse } from 'next/server';
import { ThinkingLevel } from '@google/genai';
import { getAuthenticatedContext } from '@/lib/supabase/admin';
import {
  compactChatHistory,
  executeGeminiWithCascade,
  extractClientIp,
  guardAiEndpoint,
  sanitizeAiErrorForClient,
  serializeApprovedCompact,
} from '@/lib/ai-optimizer';

export const runtime = 'nodejs';

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

    const orgName = guard.org.name || 'KAIROS ERP';
    const { messages, eventData, approvedItems, filesText } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Formato de mensajes inválido' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'El motor de IA no está disponible temporalmente. Contacta a soporte.' },
        { status: 500 }
      );
    }

    const budgetContext = serializeApprovedCompact(approvedItems || []);

    // Prefijo estático arriba para aprovechar implicit prompt caching en Gemini 4 Hydrogen
    const systemInstruction = `Asesor Financiero Senior (CFO) de ${orgName} (Chile). ${guard.industryPrompt}
REGLAS DE ANÁLISIS:
- Responde en español de Chile (es-CL), tono ejecutivo directo, en Markdown limpio (tablas o viñetas de alto impacto, sin rellenos ni emojis excesivos).
- Evalúa rentabilidad neta real, exposición tributaria F29 (IVA Débito vs IVA Crédito por Facturas vs Boletas de Honorarios con retención 15,25% vigente 2026) y costos hundidos.
- Detecta omisiones operativas críticas del rubro (fletes, montaje, mermas, mano de obra adicional, viáticos) y partidas con margen débil.
- Si el margen global es inferior al objetivo del rubro o < 30%, alerta de inmediato y propón ajustes concretos de precio/margen en CLP.

PROYECTO: ${eventData?.name || '-'} | Cliente: ${eventData?.client || '-'} | Estado: ${eventData?.status || '-'}
DESCRIPCIÓN: ${String(eventData?.description || 'Sin descripción').slice(0, 600)}
PRESUPUESTO OFICIAL:
${budgetContext}`;

    const formattedMessages = compactChatHistory(messages, 6);
    if (formattedMessages.length === 0) {
      formattedMessages.push({
        role: 'user',
        parts: [{ text: 'Analiza la rentabilidad actual de este presupuesto.' }],
      });
    }

    const lastUserText =
      [...formattedMessages].reverse().find((m) => m.role === 'user')?.parts[0]?.text || '';
    const isDeepAudit =
      /exhaustiv|auditor|f29|iva|rentabilidad|margen|omisi|critica|completo|compar/i.test(
        lastUserText
      ) || Boolean(filesText && String(filesText).trim().length > 200);

    if (filesText && String(filesText).trim()) {
      const lastUserMsg = [...formattedMessages].reverse().find((m) => m.role === 'user');
      if (lastUserMsg) {
        lastUserMsg.parts.push({
          text: `\n[ARCHIVO ADJUNTO]:\n${String(filesText).trim().slice(0, 12000)}`,
        });
      }
    }

    const { text: reply } = await executeGeminiWithCascade({
      task: guard.isDemoMode ? 'demo_sandbox' : 'financial_advisor',
      routeLabel: 'financial-advisor',
      systemInstruction,
      contents: formattedMessages,
      // Calibración dinámica: MEDIUM para auditorías profundas/documentos, LOW para consultas rápidas
      thinkingLevelOverride: guard.isDemoMode
        ? ThinkingLevel.MINIMAL
        : isDeepAudit
        ? ThinkingLevel.MEDIUM
        : ThinkingLevel.LOW,
    });

    await guard.consumeCredit();
    return NextResponse.json({ reply });
  } catch (error: any) {
    console.error('Error en financial advisor:', error);
    const sanitized = sanitizeAiErrorForClient(error);
    return NextResponse.json({ error: sanitized.message }, { status: sanitized.status });
  }
}
