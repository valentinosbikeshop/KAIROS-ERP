import { NextRequest, NextResponse } from 'next/server';
import pdf from 'pdf-parse';
import * as XLSX from 'xlsx';
import { getAuthenticatedContext } from '@/lib/supabase/admin';
import {
  executeGeminiWithCascade,
  extractClientIp,
  guardAiEndpoint,
  sanitizeAiErrorForClient,
} from '@/lib/ai-optimizer';

export const runtime = 'nodejs';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
]);

const ALLOWED_EXTENSIONS = new Set([
  '.pdf',
  '.xlsx',
  '.xls',
  '.csv',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.heic',
]);

const OCR_INSTRUCTION =
  'Extrae en formato tabular compacto (sin texto introductorio): Título/Proveedor si existe, luego una línea por ítem: Cantidad | Descripción | Monto CLP | Doc (Factura/Boleta). Preserva montos exactos.';

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

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No se adjuntó ningún archivo.' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `El archivo excede el tamaño máximo de ${MAX_FILE_SIZE / 1024 / 1024} MB.` },
        { status: 400 }
      );
    }

    const fileType = file.type;
    const fileName = file.name.toLowerCase();
    const extension = '.' + fileName.split('.').pop();

    if (!ALLOWED_TYPES.has(fileType) && !ALLOWED_EXTENSIONS.has(extension)) {
      return NextResponse.json(
        { error: 'Formato no soportado. Use PDF, XLSX, CSV o Imágenes (JPG, PNG, WEBP).' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let text = '';
    let pages = 0;
    let usedGeminiOcr = false;

    const runMultimodalOcr = async (mimeType: string) => {
      if (!process.env.GEMINI_API_KEY) {
        throw Object.assign(new Error('Falta GEMINI_API_KEY en el servidor.'), { status: 401 });
      }
      const base64Data = buffer.toString('base64');
      const { text: ocrResult } = await executeGeminiWithCascade({
        task: guard.isDemoMode ? 'demo_sandbox' : 'ocr',
        routeLabel: 'parse-file',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  data: base64Data,
                  mimeType,
                },
              },
              { text: OCR_INSTRUCTION },
            ],
          },
        ],
      });
      usedGeminiOcr = true;
      return ocrResult;
    };

    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      const pdfData = await pdf(buffer);
      text = pdfData.text || '';
      pages = pdfData.numpages || 1;

      // Fallback automático a Gemini Vision OCR si el PDF es escaneado o basado en imagen (< 60 chars útiles)
      if (text.replace(/\s+/g, '').length < 60) {
        text = await runMultimodalOcr('application/pdf');
      }
    } else if (
      fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      fileType === 'application/vnd.ms-excel' ||
      fileType === 'text/csv' ||
      fileName.endsWith('.xlsx') ||
      fileName.endsWith('.xls') ||
      fileName.endsWith('.csv')
    ) {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      text = workbook.SheetNames.map((sheetName) => {
        const sheet = workbook.Sheets[sheetName];
        const csv = XLSX.utils
          .sheet_to_csv(sheet, { blankrows: false })
          .replace(/,{2,}/g, ',')
          .replace(/^,+$/gm, '')
          .trim();
        return csv ? `--- Hoja: ${sheetName} ---\n${csv}` : '';
      })
        .filter(Boolean)
        .join('\n\n');
    } else if (
      fileType.startsWith('image/') ||
      ['.jpg', '.jpeg', '.png', '.webp', '.heic'].some((ext) => fileName.endsWith(ext))
    ) {
      text = await runMultimodalOcr(fileType || 'image/jpeg');
    } else {
      return NextResponse.json({ error: 'Formato de archivo no soportado.' }, { status: 400 });
    }

    if (usedGeminiOcr && text) {
      await guard.consumeCredit();
    }

    // Compactar líneas vacías repetidas para ahorrar tokens en llamadas posteriores
    text = text.replace(/\n{3,}/g, '\n\n').trim();

    const MAX_TEXT_LENGTH = 24000;
    if (text.length > MAX_TEXT_LENGTH) {
      text = text.substring(0, MAX_TEXT_LENGTH) + '\n... (truncado)';
    }

    return NextResponse.json({ text, type: fileType, pages, ocrApplied: usedGeminiOcr });
  } catch (error: any) {
    console.error('Error parsing file:', error);
    const sanitized = sanitizeAiErrorForClient(error);
    return NextResponse.json({ error: sanitized.message }, { status: sanitized.status });
  }
}
