import type { IndustryType, TaxRegime } from '@/types/database';

export interface BaseQuantityConfig {
  label: string;
  unit: string;
  placeholder: string;
  showProminent: boolean;
}

const BASE_QTY_BY_INDUSTRY: Record<IndustryType, BaseQuantityConfig> = {
  eventos_banqueteria: {
    label: 'Cantidad de Invitados (PAX)',
    unit: 'PAX',
    placeholder: 'Ej. 150',
    showProminent: true,
  },
  catering_foodservice: {
    label: 'Cantidad de Raciones / Porciones',
    unit: 'raciones',
    placeholder: 'Ej. 600',
    showProminent: true,
  },
  turismo_mice: {
    label: 'Cantidad de Pasajeros (PAX)',
    unit: 'PAX',
    placeholder: 'Ej. 24',
    showProminent: true,
  },
  construccion_arquitectura: {
    label: 'Superficie Base (m²)',
    unit: 'm²',
    placeholder: 'Ej. 85',
    showProminent: true,
  },
  ferias_stands_b2b: {
    label: 'Superficie de Stand (m²)',
    unit: 'm²',
    placeholder: 'Ej. 18',
    showProminent: true,
  },
  maestranza_muebles: {
    label: 'Unidades / Lote a Fabricar',
    unit: 'un',
    placeholder: 'Ej. 12',
    showProminent: true,
  },
  ingenieria_hvac: {
    label: 'Equipos / Puntos Técnicos',
    unit: 'equipos',
    placeholder: 'Ej. 18',
    showProminent: true,
  },
  consultoria_juridico: {
    label: 'Horas Estimadas del Caso',
    unit: 'hrs',
    placeholder: 'Ej. 40',
    showProminent: true,
  },
  marketing_audiovisual: {
    label: 'Entregables / Cápsulas Base',
    unit: 'piezas',
    placeholder: 'Ej. 12',
    showProminent: true,
  },
};

export function getBaseQuantityConfig(industryId: IndustryType): BaseQuantityConfig {
  return BASE_QTY_BY_INDUSTRY[industryId] || BASE_QTY_BY_INDUSTRY.eventos_banqueteria;
}

const PROJECT_TYPES_BY_INDUSTRY: Record<IndustryType, string[]> = {
  eventos_banqueteria: ['Corporativo', 'Matrimonio / Gala', 'Activación / Fonda', 'Privado'],
  marketing_audiovisual: ['Campaña / Spot', 'Retainer Mensual', 'Cobertura / Reel', 'Paid Media'],
  construccion_arquitectura: ['Remodelación Corporativa', 'Obra Menor', 'Ampliación Residencial', 'Licitación'],
  catering_foodservice: ['Contrato Casino Mensual', 'Coffee Break Ejecutivo', 'Evento Corporativo', 'Colaciones'],
  ferias_stands_b2b: ['Stand Modular', 'Stand Custom / Isla', 'Activación Punto de Venta', 'Pabellón'],
  maestranza_muebles: ['Mobiliario Corporativo', 'Estructura Metálica', 'Fabricación a Medida', 'Mantención'],
  ingenieria_hvac: ['Instalación Nueva', 'Mantención Preventiva', 'Reparación Correctiva', 'Contrato SLA'],
  consultoria_juridico: ['Auditoría / Diagnóstico', 'Retainer Mensual', 'Juicio / Defensa', 'Societario / Compliance'],
  turismo_mice: ['Viaje de Incentivo', 'Congreso / Convención', 'Full Day Ejecutivo', 'Receptivo Extranjero'],
};

export function getProjectTypeOptions(industryId: IndustryType): string[] {
  return PROJECT_TYPES_BY_INDUSTRY[industryId] || ['Corporativo', 'Estándar', 'Licitación'];
}

export interface PaymentTermPreset {
  id: '50_50' | '30_40_30' | '30_dias_oc' | '100_contado' | 'custom';
  label: string;
  depositPct: number;
  clauses: string[];
}

export const PAYMENT_TERM_PRESETS: PaymentTermPreset[] = [
  {
    id: '50_50',
    label: '50% Anticipo / 50% Contra Entrega',
    depositPct: 0.5,
    clauses: [
      'Anticipo del 50% al aceptar la propuesta para reserva de fecha y programación operativa.',
      'Saldo restante (50%) pagadero previo al inicio o contra recepción conforme según acuerdo.',
    ],
  },
  {
    id: '30_40_30',
    label: '30% Inicio / 40% Avance / 30% Entrega',
    depositPct: 0.3,
    clauses: [
      'Anticipo del 30% al aprobar la propuesta para inicio y adquisición de insumos/materiales.',
      'Segundo hito del 40% contra avance operativo intermedio o Estado de Pago.',
      'Saldo final del 30% contra recepción conforme y entrega definitiva.',
    ],
  },
  {
    id: '30_dias_oc',
    label: '30 Días Fecha Factura (OC + HES)',
    depositPct: 0,
    clauses: [
      'Requiere emisión de Orden de Compra (OC) oficial previa al inicio de los trabajos.',
      'Facturación contra Hoja de Entrada de Servicios (HES) o Acta de Recepción; pago a 30 días.',
    ],
  },
  {
    id: '100_contado',
    label: '100% Contado / Transferencia Previa',
    depositPct: 1,
    clauses: [
      'Pago del 100% del monto total mediante transferencia bancaria previa a la ejecución o despacho.',
    ],
  },
];

export interface ParsedPaymentTerms {
  presetId: PaymentTermPreset['id'];
  depositPct: number;
  clauses: string[];
  validityDays: number;
  customText?: string;
}

export function serializePaymentTerms(terms: ParsedPaymentTerms): string {
  return JSON.stringify(terms);
}

export function parsePaymentTerms(raw?: string | null): ParsedPaymentTerms {
  const fallback: ParsedPaymentTerms = {
    presetId: '50_50',
    depositPct: 0.5,
    clauses: PAYMENT_TERM_PRESETS[0].clauses,
    validityDays: 7,
  };
  if (!raw || typeof raw !== 'string') return fallback;
  const trimmed = raw.trim();
  if (!trimmed) return fallback;

  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as Partial<ParsedPaymentTerms>;
      const preset = PAYMENT_TERM_PRESETS.find((p) => p.id === parsed.presetId);
      const depositPct =
        typeof parsed.depositPct === 'number' && parsed.depositPct >= 0 && parsed.depositPct <= 1
          ? parsed.depositPct
          : preset?.depositPct ?? 0.5;
      const clauses =
        Array.isArray(parsed.clauses) && parsed.clauses.length > 0
          ? parsed.clauses.filter((c) => typeof c === 'string' && c.trim().length > 0)
          : parsed.customText?.trim()
          ? parsed.customText.split('\n').map((s) => s.trim()).filter(Boolean)
          : preset?.clauses ?? fallback.clauses;
      return {
        presetId: parsed.presetId || '50_50',
        depositPct,
        clauses,
        validityDays:
          typeof parsed.validityDays === 'number' && parsed.validityDays >= 1
            ? parsed.validityDays
            : 7,
        customText: parsed.customText,
      };
    } catch {
      return fallback;
    }
  }

  return {
    presetId: 'custom',
    depositPct: 0.5,
    clauses: trimmed.split('\n').map((s) => s.trim()).filter(Boolean),
    validityDays: 7,
    customText: trimmed,
  };
}

export const TAX_REGIME_OPTIONS: Array<{ value: TaxRegime; label: string; shortLabel: string }> = [
  {
    value: 'afecto_iva',
    label: 'Régimen General Afecto (IVA 19%)',
    shortLabel: 'Afecto IVA 19%',
  },
  {
    value: 'sociedad_profesionales',
    label: 'Sociedad de Profesionales Exenta (Art. 12 E N°8)',
    shortLabel: 'Exento Soc. Prof.',
  },
  {
    value: 'exportacion_turismo',
    label: 'Exportación Turística Exenta (Art. 12 E N°17)',
    shortLabel: 'Exento Exp. Turismo',
  },
];

export interface ViaticoZoneConfig {
  id: string;
  title: string;
  detail: string;
  costo: number;
  ganancia: number;
}

export const GENERIC_VIATICO_ZONES: ViaticoZoneConfig[] = [
  {
    id: 'local',
    title: 'Viático Zona Local (0–20 km)',
    detail: 'Desplazamiento dentro del radio urbano base (sin recargo adicional)',
    costo: 0,
    ganancia: 0,
  },
  {
    id: 'interurbano',
    title: 'Viático Traslado Interurbano (20–60 km)',
    detail: 'Movilización periférica, peajes y logística de cuadrilla/equipo',
    costo: 25000,
    ganancia: 10000,
  },
  {
    id: 'regional',
    title: 'Viático Regional (60–150 km)',
    detail: 'Traslado interregional, combustible, peajes TAG y colación en ruta',
    costo: 55000,
    ganancia: 20000,
  },
  {
    id: 'larga_distancia',
    title: 'Viático Larga Distancia / Estadía (>150 km)',
    detail: 'Viaje de larga distancia, peajes, alojamiento o pasajes según alcance',
    costo: 95000,
    ganancia: 30000,
  },
];
