import { NextRequest, NextResponse } from 'next/server';
import pdf from 'pdf-parse';
import * as XLSX from 'xlsx';
import { GoogleGenAI } from '@google/genai';
import { getAuthenticatedContext } from '@/lib/supabase/admin';
import { OPTIMIZED_GEMINI_MODELS, guardAiEndpoint } from '@/lib/ai-optimizer';

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

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext(req);
    if (!ctx || !ctx.profile?.organization_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Guardia de plan (OCR / Parsing documental pertenece a Suite IA)
    const guard = await guardAiEndpoint(ctx);
    if (!guard.allowed && guard.response) {
      return guard.response;
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `El archivo excede el tamaño máximo de ${MAX_FILE_SIZE / 1024 / 1024} MB` },
        { status: 400 }
      );
    }

    const fileType = file.type;
    const fileName = file.name.toLowerCase();
    const extension = '.' + fileName.split('.').pop();

    if (!ALLOWED_TYPES.has(fileType) && !ALLOWED_EXTENSIONS.has(extension)) {
      return NextResponse.json(
        { error: 'Formato de archivo no soportado. Use PDF, XLSX, CSV o Imágenes (JPG, PNG, WEBP).' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let text = '';
    let pages = 0;

    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      const pdfData = await pdf(buffer);
      text = pdfData.text;
      pages = pdfData.numpages;
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
        return `--- Hoja: ${sheetName} ---\n` + XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
      }).join('\n\n');
    } else if (
      fileType.startsWith('image/') ||
      ['.jpg', '.jpeg', '.png', '.webp', '.heic'].some((ext) => fileName.endsWith(ext))
    ) {
      if (!process.env.GEMINI_API_KEY) {
        return NextResponse.json(
          { error: 'Falta configurar GEMINI_API_KEY en el servidor.' },
          { status: 500 }
        );
      }
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const base64Data = buffer.toString('base64');

      let ocrText = '';
      for (const model of OPTIMIZED_GEMINI_MODELS) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    inlineData: {
                      data: base64Data,
                      mimeType: fileType || 'image/jpeg',
                    },
                  },
                  {
                    text: 'Extrae en formato compacto: Título/Categoría si existe, luego cada ítem con Cantidad | Descripción | Precio CLP | Doc (Factura/Boleta). Sin texto introductorio.',
                  },
                ],
              },
            ],
            config: { maxOutputTokens: 4096 },
          });
          if (response?.text) {
            ocrText = response.text;
            break;
          }
        } catch {
          // Intentar siguiente modelo
        }
      }

      text = ocrText;
      if (text) {
        await guard.consumeCredit();
      }
    } else {
      return NextResponse.json({ error: 'Unsupported file format' }, { status: 400 });
    }

    // Compactar líneas vacías repetidas para ahorrar tokens en llamadas posteriores
    text = text.replace(/\n{3,}/g, '\n\n').trim();

    const MAX_TEXT_LENGTH = 30000;
    if (text.length > MAX_TEXT_LENGTH) {
      text = text.substring(0, MAX_TEXT_LENGTH) + '\n... (truncado)';
    }

    return NextResponse.json({ text, type: fileType, pages });
  } catch (error: any) {
    console.error('Error parsing file:', error);
    return NextResponse.json({ error: 'Error al procesar el archivo' }, { status: 500 });
  }
}
