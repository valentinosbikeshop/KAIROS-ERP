'use client';

import { calculateFinancials } from '@/lib/utils';
import { formatCostMetadata, type CostResourceType, type StaffModality } from '@/lib/cost-metadata';
import { INDUSTRY_BLUEPRINTS } from '@/lib/industries';
import type {
  Event,
  EventItem,
  HonorariosRetentionPolicy,
  IndustryType,
  MasterCost,
  Organization,
  Profile,
  ThemePreset,
} from '@/types/database';

export const LOCAL_DEMO_COOKIE = 'kairos_local_demo_mode';
export const LOCAL_DEMO_STORAGE_KEY = 'kairos_real_erp_demo_v3';
export const LOCAL_DEMO_CONSENT_KEY = 'kairos_demo_cache_consent';

export const LOCAL_DEMO_ORG_ID = 'd0000000-0000-4000-8000-000000000000';
export const LOCAL_DEMO_USER_ID = 'd0000000-0000-4000-8000-000000000099';
export const LOCAL_DEMO_EMAIL = 'visitante@kairos-sandbox.cl';

const EVENT_GALA_ID = 'd0000002-0000-4000-8000-000000000001';
const EVENT_FONDA_ID = 'd0000002-0000-4000-8000-000000000002';
const EVENT_BODA_ID = 'd0000002-0000-4000-8000-000000000003';
const EVENT_CUMBRE_ID = 'd0000002-0000-4000-8000-000000000004';
const EVENT_LANZAMIENTO_ID = 'd0000002-0000-4000-8000-000000000005';
const EVENT_SUNSET_ID = 'd0000002-0000-4000-8000-000000000006';

interface LocalDemoDatabase {
  organization: Organization;
  profile: Profile;
  master_costs: MasterCost[];
  events: Event[];
  event_items: EventItem[];
}

const INDUSTRY_DEMO_COMPANIES: Record<IndustryType, { name: string; legal: string; rut: string }> = {
  eventos_banqueteria: {
    name: 'Productora Horizonte (Demo)',
    legal: 'Productora Horizonte Eventos SpA',
    rut: '76.890.123-4',
  },
  marketing_audiovisual: {
    name: 'Estudio Vértice Creative (Demo)',
    legal: 'Vértice Producciones Audiovisuales SpA',
    rut: '77.194.320-8',
  },
  construccion_arquitectura: {
    name: 'Constructora Cordillera (Demo)',
    legal: 'Constructora Cordillera Ingeniería SpA',
    rut: '76.519.440-2',
  },
  catering_foodservice: {
    name: 'Atelier Gastronómico Sur (Demo)',
    legal: 'Atelier Gastronómico Sur SpA',
    rut: '76.993.112-K',
  },
  ferias_stands_b2b: {
    name: 'ExpoStand Arquitectura (Demo)',
    legal: 'ExpoStand Arquitectura B2B SpA',
    rut: '77.084.510-6',
  },
  maestranza_muebles: {
    name: 'Maestranza Austral (Demo)',
    legal: 'Maestranza & Mobiliario Austral SpA',
    rut: '76.312.880-1',
  },
  ingenieria_hvac: {
    name: 'TermoClima Ingeniería (Demo)',
    legal: 'TermoClima Proyectos HVAC SpA',
    rut: '76.771.209-9',
  },
  consultoria_juridico: {
    name: 'B&R Consultores (Demo)',
    legal: 'B&R Consultores Estratégicos SpA',
    rut: '77.450.912-3',
  },
  turismo_mice: {
    name: 'Andes MICE & Travel (Demo)',
    legal: 'Andes MICE Corporate Travel SpA',
    rut: '76.628.340-5',
  },
};

function makeCost(params: {
  id: string;
  servicio: string;
  tipo_evento: string;
  resourceType: CostResourceType;
  staffCount: number;
  staffHours: string;
  staffModality: StaffModality;
  aplicaIvaVenta: boolean;
  detail: string;
  costo: number;
  ganancia: number;
  tipo_doc_costo: 'factura' | 'boleta';
}): MasterCost {
  const fin = calculateFinancials(params.costo, params.ganancia, params.tipo_doc_costo, params.aplicaIvaVenta);
  return {
    id: params.id,
    organization_id: LOCAL_DEMO_ORG_ID,
    servicio: params.servicio,
    tipo_evento: params.tipo_evento,
    tiempo_detalle: formatCostMetadata({
      resourceType: params.resourceType,
      staffCount: params.staffCount,
      staffHours: params.staffHours,
      staffModality: params.staffModality,
      aplicaIvaVenta: params.aplicaIvaVenta,
      cleanDetail: params.detail,
    }),
    costo: params.costo,
    ganancia: params.ganancia,
    valor_neto: fin.valorNeto,
    valor_total: fin.valorTotal,
    tipo_doc_costo: params.tipo_doc_costo,
    is_demo_base: true,
    created_at: '2026-01-10T10:00:00Z',
  };
}

function makeItem(params: {
  id: string;
  event_id: string;
  servicio: string;
  detalle: string;
  tipo_evento: string;
  cantidad: number;
  costo: number;
  ganancia: number;
  tipo_doc_costo: 'factura' | 'boleta';
  approved: boolean;
  parent_id?: string | null;
  es_insumo?: boolean;
  created_at?: string;
}): EventItem {
  const esInsumo = Boolean(params.es_insumo);
  const fin = calculateFinancials(params.costo, esInsumo ? 0 : params.ganancia, params.tipo_doc_costo, true, esInsumo);
  return {
    id: params.id,
    organization_id: LOCAL_DEMO_ORG_ID,
    event_id: params.event_id,
    servicio: params.servicio,
    detalle: params.detalle,
    tipo_evento: params.tipo_evento,
    cantidad: params.cantidad,
    costo: params.costo,
    ganancia: esInsumo ? 0 : params.ganancia,
    valor_neto: fin.valorNeto,
    iva: fin.ivaDebito,
    valor_total: fin.valorTotal,
    margen: fin.margen,
    tipo_doc_costo: params.tipo_doc_costo,
    approved: params.approved,
    parent_id: params.parent_id ?? null,
    es_insumo: esInsumo,
    iva_incluido: true,
    is_demo_base: true,
    created_at: params.created_at || '2026-09-15T10:00:00Z',
  };
}

function makeTx(params: {
  id: string;
  event_id: string;
  type: 'ABONO_CLIENTE' | 'GASTO_REAL';
  monto: number;
  fecha: string;
  descripcion: string;
  docType: 'factura' | 'boleta' | 'transferencia';
}): EventItem {
  const isGasto = params.type === 'GASTO_REAL';
  const isFactura = isGasto && params.docType === 'factura';
  const valorNeto = isGasto
    ? isFactura
      ? Math.round(params.monto / 1.19)
      : params.monto
    : Math.round(params.monto / 1.19);
  const iva = params.monto - valorNeto;

  return {
    id: params.id,
    organization_id: LOCAL_DEMO_ORG_ID,
    event_id: params.event_id,
    servicio: isGasto ? (isFactura ? 'Factura de Proveedor' : 'Boleta de Proveedor') : 'Abono de Cliente',
    detalle: `${params.fecha} | ${params.descripcion}`,
    tipo_evento: params.type,
    cantidad: 1,
    costo: isGasto ? params.monto : 0,
    ganancia: isGasto ? 0 : params.monto,
    valor_neto: valorNeto,
    iva,
    valor_total: params.monto,
    margen: isGasto ? 0 : 100,
    tipo_doc_costo: params.docType === 'factura' ? 'factura' : 'boleta',
    approved: true,
    parent_id: null,
    es_insumo: false,
    iva_incluido: true,
    is_demo_base: true,
    created_at: `${params.fecha}T12:00:00Z`,
  };
}

function buildInitialDemoDatabase(industryType: IndustryType = 'eventos_banqueteria'): LocalDemoDatabase {
  const bp = INDUSTRY_BLUEPRINTS[industryType] || INDUSTRY_BLUEPRINTS.eventos_banqueteria;
  const companyMeta = INDUSTRY_DEMO_COMPANIES[industryType] || INDUSTRY_DEMO_COMPANIES.eventos_banqueteria;

  const organization: Organization = {
    id: LOCAL_DEMO_ORG_ID,
    name: companyMeta.name,
    slug: 'productora-horizonte-demo',
    invite_code: 'KAIROS-DEMO-2026',
    legal_name: companyMeta.legal,
    rut: companyMeta.rut,
    subtitle: bp.tagline.toUpperCase(),
    location: 'Santiago, Chile',
    contact_email: 'contacto@horizonte-demo.cl',
    contact_phone: '+56 9 8420 1190',
    bank_info: {
      banco: 'Banco de Chile',
      tipo_cuenta: 'Cuenta Corriente',
      numero_cuenta: '00-184-99210-04',
      titular: companyMeta.legal,
      rut: companyMeta.rut,
      email: 'finanzas@horizonte-demo.cl',
      __saas_config: {
        industry_type: industryType,
        theme_preset: bp.recommendedTheme,
        operation_mode: bp.recommendedOperationMode,
        onboarding_completed: true,
        is_exempt: false,
        subscription_tier: 'scale',
        subscription_status: 'active',
        selected_modules: [
          'mod_unlimited_projects',
          'mod_pdf_quotes',
          'mod_transactions_sii',
          'mod_consolidation_retail',
          'mod_ai_suite',
          'mod_analytics_excel',
          'mod_team_branding',
        ],
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
        ai_calls_used: 2,
        ai_calls_reset_at: new Date(Date.now() + 30 * 86400000).toISOString(),
        honorarios_retention_policy: 'contractor',
      },
    },
    is_demo: true,
    is_active: true,
    max_demo_events: 8,
    max_demo_costs: 15,
    created_at: '2026-01-01T00:00:00Z',
    industry_type: industryType,
    theme_preset: bp.recommendedTheme,
    operation_mode: bp.recommendedOperationMode,
    onboarding_completed: true,
    is_exempt: false,
    subscription_tier: 'scale',
    subscription_status: 'active',
  };

  const profile: Profile = {
    id: LOCAL_DEMO_USER_ID,
    email: LOCAL_DEMO_EMAIL,
    role: 'admin',
    status: 'active',
    organization_id: LOCAL_DEMO_ORG_ID,
    is_super_admin: false,
    full_name: 'Visitante Demo',
    created_at: '2026-01-01T00:00:00Z',
  };

  const baseCosts: MasterCost[] = [
    makeCost({
      id: 'd0000001-0000-4000-8000-000000000001',
      servicio: 'Cuarteto de Cuerdas Gala',
      tipo_evento: 'Matrimonio',
      resourceType: 'personal',
      staffCount: 4,
      staffHours: '90 min',
      staffModality: 'honorarios',
      aplicaIvaVenta: true,
      detail: 'Ceremonia y cóctel con repertorio clásico/moderno',
      costo: 260000,
      ganancia: 160000,
      tipo_doc_costo: 'boleta',
    }),
    makeCost({
      id: 'd0000001-0000-4000-8000-000000000002',
      servicio: 'Banda Live Corporativa (6 músicos)',
      tipo_evento: 'Empresa',
      resourceType: 'personal',
      staffCount: 6,
      staffHours: '2 bloques 45m',
      staffModality: 'honorarios',
      aplicaIvaVenta: true,
      detail: 'Show bailable en vivo + prueba de sonido incluida',
      costo: 680000,
      ganancia: 320000,
      tipo_doc_costo: 'boleta',
    }),
    makeCost({
      id: 'd0000001-0000-4000-8000-000000000003',
      servicio: 'DJ & VJ Profesional con Consola',
      tipo_evento: 'Privado',
      resourceType: 'personal',
      staffCount: 1,
      staffHours: '5 hrs',
      staffModality: 'honorarios',
      aplicaIvaVenta: true,
      detail: '5 horas continuas + consola Pioneer + visuales',
      costo: 210000,
      ganancia: 140000,
      tipo_doc_costo: 'boleta',
    }),
    makeCost({
      id: 'd0000001-0000-4000-8000-000000000004',
      servicio: 'Sonido Line Array (300 pax)',
      tipo_evento: 'Empresa',
      resourceType: 'servicio',
      staffCount: 1,
      staffHours: 'Jornada',
      staffModality: 'factura_subcontrato',
      aplicaIvaVenta: true,
      detail: 'Sistema PA + consola digital 32ch + microfonía Shure',
      costo: 357000,
      ganancia: 180000,
      tipo_doc_costo: 'factura',
    }),
    makeCost({
      id: 'd0000001-0000-4000-8000-000000000005',
      servicio: 'Iluminación Robótica & Pantalla LED 4x2.5m',
      tipo_evento: 'Empresa',
      resourceType: 'servicio',
      staffCount: 1,
      staffHours: 'Jornada',
      staffModality: 'factura_subcontrato',
      aplicaIvaVenta: true,
      detail: '12 cabezas móviles Beam + pantalla P3.9 + procesador',
      costo: 476000,
      ganancia: 240000,
      tipo_doc_costo: 'factura',
    }),
    makeCost({
      id: 'd0000001-0000-4000-8000-000000000006',
      servicio: 'Banquetería 3 Tiempos Premium (por persona)',
      tipo_evento: 'Empresa',
      resourceType: 'insumo',
      staffCount: 1,
      staffHours: 'Evento',
      staffModality: 'factura_subcontrato',
      aplicaIvaVenta: true,
      detail: 'Entrada, fondo, postre + vajilla y cristalería fina',
      costo: 33320,
      ganancia: 14000,
      tipo_doc_costo: 'factura',
    }),
    makeCost({
      id: 'd0000001-0000-4000-8000-000000000007',
      servicio: 'Cóctel Recepción 6 Bocados (por persona)',
      tipo_evento: 'Privado',
      resourceType: 'insumo',
      staffCount: 1,
      staffHours: '90 min',
      staffModality: 'factura_subcontrato',
      aplicaIvaVenta: true,
      detail: 'Por asistente, incluye espumante, sour y jugos naturales',
      costo: 14280,
      ganancia: 6500,
      tipo_doc_costo: 'factura',
    }),
    makeCost({
      id: 'd0000001-0000-4000-8000-000000000008',
      servicio: 'Barra Libre Coctelería de Autor (por persona)',
      tipo_evento: 'Matrimonio',
      resourceType: 'insumo',
      staffCount: 1,
      staffHours: '4 hrs',
      staffModality: 'factura_subcontrato',
      aplicaIvaVenta: true,
      detail: 'Gin Tonic, Aperol Spritz, Pisco Sour Catedral + mixers',
      costo: 11900,
      ganancia: 5500,
      tipo_doc_costo: 'factura',
    }),
    makeCost({
      id: 'd0000001-0000-4000-8000-000000000009',
      servicio: 'Cobertura Fotográfica + Reel 4K',
      tipo_evento: 'Empresa',
      resourceType: 'personal',
      staffCount: 2,
      staffHours: '8 hrs',
      staffModality: 'factura_subcontrato',
      aplicaIvaVenta: true,
      detail: 'Fotógrafo + filmmaker con entrega aftermovie en 72h',
      costo: 297500,
      ganancia: 150000,
      tipo_doc_costo: 'factura',
    }),
    makeCost({
      id: 'd0000001-0000-4000-8000-000000000010',
      servicio: 'Brigada de Garzones Banquetería (6 pers.)',
      tipo_evento: 'Matrimonio',
      resourceType: 'personal',
      staffCount: 6,
      staffHours: '8 hrs',
      staffModality: 'turno',
      aplicaIvaVenta: true,
      detail: 'Atención en mesa, descorche y servicio de cóctel',
      costo: 330000,
      ganancia: 145000,
      tipo_doc_costo: 'boleta',
    }),
    makeCost({
      id: 'd0000001-0000-4000-8000-000000000011',
      servicio: 'Flete Camión Cerrado + Cuadrilla Carga',
      tipo_evento: 'Empresa',
      resourceType: 'logistica',
      staffCount: 3,
      staffHours: 'Ida/Vuelta',
      staffModality: 'turno',
      aplicaIvaVenta: true,
      detail: 'Traslado ida y vuelta RM + 2 peonetas carga y descarga',
      costo: 115000,
      ganancia: 45000,
      tipo_doc_costo: 'boleta',
    }),
    makeCost({
      id: 'd0000001-0000-4000-8000-000000000012',
      servicio: 'Generador Eléctrico Silencioso 40 kVA',
      tipo_evento: 'Matrimonio',
      resourceType: 'logistica',
      staffCount: 1,
      staffHours: 'Jornada',
      staffModality: 'factura_subcontrato',
      aplicaIvaVenta: true,
      detail: 'Respaldo eléctrico completo con tablero trifásico y petróleo',
      costo: 214200,
      ganancia: 80000,
      tipo_doc_costo: 'factura',
    }),
  ];

  // Si el usuario eligió otro rubro distinto a eventos_banqueteria, anteponemos las tarifas propias de ese rubro
  const industryCosts: MasterCost[] =
    industryType === 'eventos_banqueteria'
      ? []
      : bp.starterCatalog.map((item, idx) =>
          makeCost({
            id: `ind-${industryType}-${idx}`,
            servicio: item.servicio,
            tipo_evento: item.tipo_evento,
            resourceType: item.resourceType,
            staffCount: item.staffCount || 1,
            staffHours: item.staffHours || 'Jornada',
            staffModality: item.staffModality,
            aplicaIvaVenta: item.aplicaIvaVenta,
            detail: item.detail,
            costo: item.costo,
            ganancia: item.ganancia,
            tipo_doc_costo: item.tipo_doc_costo,
          })
        );

  const events: Event[] = [
    {
      id: EVENT_GALA_ID,
      organization_id: LOCAL_DEMO_ORG_ID,
      name: 'Gala TechChile 2026',
      client_company: 'Asociación Chilena de Tecnología A.G.',
      location: 'Centro Parque, Las Condes',
      event_date: '2026-09-18',
      month: 9,
      year: 2026,
      description:
        'Cena anual de premiación para 250 ejecutivos. Incluye sonido Line Array, pantalla LED, cena 3 tiempos, banda en vivo y cobertura audiovisual.',
      status: 'completed',
      created_by: LOCAL_DEMO_USER_ID,
      created_at: '2026-08-20T10:00:00Z',
      deleted_at: null,
      has_retail_sales: false,
      is_demo_base: true,
    },
    {
      id: EVENT_FONDA_ID,
      organization_id: LOCAL_DEMO_ORG_ID,
      name: 'Fonda Primavera 2026',
      client_company: 'Venta Directa Público & Stands',
      location: 'Parque Padre Hurtado, La Reina',
      event_date: '2026-09-19',
      month: 9,
      year: 2026,
      description:
        'Operación de barra y gastronomía al detalle con recetas prorrateadas por unidad vendida (Terremotos, Empanadas de Pino y Parrilla).',
      status: 'approved',
      created_by: LOCAL_DEMO_USER_ID,
      created_at: '2026-09-01T10:00:00Z',
      deleted_at: null,
      has_retail_sales: true,
      is_demo_base: true,
    },
    {
      id: EVENT_BODA_ID,
      organization_id: LOCAL_DEMO_ORG_ID,
      name: 'Matrimonio Sofía & Tomás',
      client_company: 'Familia Edwards - Valdés',
      location: 'Viña Santa Carolina, Macul',
      event_date: '2026-11-28',
      month: 11,
      year: 2026,
      description:
        'Boda civil y fiesta para 180 invitados en jardines patrimoniales. Requiere cuarteto de cuerdas, carpa cristal, banquetería y barra libre.',
      status: 'planning',
      created_by: LOCAL_DEMO_USER_ID,
      created_at: '2026-10-15T10:00:00Z',
      deleted_at: null,
      has_retail_sales: false,
      is_demo_base: true,
    },
    {
      id: EVENT_CUMBRE_ID,
      organization_id: LOCAL_DEMO_ORG_ID,
      name: 'Cumbre Minera Andina 2026',
      client_company: 'Cámara Minera del Pacífico',
      location: 'Espacio Riesco, Huechuraba',
      event_date: '2026-10-22',
      month: 10,
      year: 2026,
      description:
        'Congreso internacional de 400 asistentes con streaming multicámara, traducción simultánea y coffee break continuo.',
      status: 'completed',
      created_by: LOCAL_DEMO_USER_ID,
      created_at: '2026-09-25T10:00:00Z',
      deleted_at: null,
      has_retail_sales: false,
      is_demo_base: true,
    },
    {
      id: EVENT_LANZAMIENTO_ID,
      organization_id: LOCAL_DEMO_ORG_ID,
      name: 'Lanzamiento SUV Eléctrico 2026',
      client_company: 'Automotora Pacífico S.A.',
      location: 'Museo Interactivo Mirador, Vitacura',
      event_date: '2026-11-14',
      month: 11,
      year: 2026,
      description:
        'Reveal nocturno con show de iluminación robótica, mapping LED, cóctel 6 bocados y DJ.',
      status: 'approved',
      created_by: LOCAL_DEMO_USER_ID,
      created_at: '2026-10-18T10:00:00Z',
      deleted_at: null,
      has_retail_sales: false,
      is_demo_base: true,
    },
    {
      id: EVENT_SUNSET_ID,
      organization_id: LOCAL_DEMO_ORG_ID,
      name: 'Sunset FinTech Chile',
      client_company: 'FinTech Chile SpA',
      location: 'Terraza W Santiago, Las Condes',
      event_date: '2026-12-04',
      month: 12,
      year: 2026,
      description:
        'Networking de fin de año para 120 fundadores e inversionistas con barra de autor y DJ.',
      status: 'planning',
      created_by: LOCAL_DEMO_USER_ID,
      created_at: '2026-11-01T10:00:00Z',
      deleted_at: null,
      has_retail_sales: false,
      is_demo_base: true,
    },
  ];

  const RETAIL_PARENT_1 = 'd0000003-0000-4000-8000-000000000201';
  const RETAIL_PARENT_2 = 'd0000003-0000-4000-8000-000000000205';

  const event_items: EventItem[] = [
    // Evento 1: Gala TechChile (Completed)
    makeItem({
      id: 'd0000003-0000-4000-8000-000000000101',
      event_id: EVENT_GALA_ID,
      servicio: 'Banquetería 3 Tiempos Premium (250 PAX)',
      detalle: 'Servicio completo cena de gala con maridaje reserva',
      tipo_evento: 'Gastronomía',
      cantidad: 250,
      costo: 33320,
      ganancia: 14000,
      tipo_doc_costo: 'factura',
      approved: true,
    }),
    makeItem({
      id: 'd0000003-0000-4000-8000-000000000102',
      event_id: EVENT_GALA_ID,
      servicio: 'Banda Live Corporativa (6 músicos)',
      detalle: 'Show principal 90 minutos + backline',
      tipo_evento: 'Música',
      cantidad: 1,
      costo: 680000,
      ganancia: 320000,
      tipo_doc_costo: 'boleta',
      approved: true,
    }),
    makeItem({
      id: 'd0000003-0000-4000-8000-000000000103',
      event_id: EVENT_GALA_ID,
      servicio: 'Iluminación Robótica & Pantalla LED 4x2.5m',
      detalle: 'Montaje escénico principal y circuito cerrado',
      tipo_evento: 'Audiovisual',
      cantidad: 1,
      costo: 476000,
      ganancia: 240000,
      tipo_doc_costo: 'factura',
      approved: true,
    }),
    makeTx({
      id: 'd0000003-0000-4000-8000-000000000104',
      event_id: EVENT_GALA_ID,
      type: 'ABONO_CLIENTE',
      monto: 7500000,
      fecha: '2026-09-02',
      descripcion: 'Anticipo 50% Reserva Gala TechChile',
      docType: 'transferencia',
    }),
    makeTx({
      id: 'd0000003-0000-4000-8000-000000000105',
      event_id: EVENT_GALA_ID,
      type: 'GASTO_REAL',
      monto: 8330000,
      fecha: '2026-09-16',
      descripcion: 'Factura Proveedor Banquetería & Menaje',
      docType: 'factura',
    }),
    makeTx({
      id: 'd0000003-0000-4000-8000-000000000106',
      event_id: EVENT_GALA_ID,
      type: 'ABONO_CLIENTE',
      monto: 8228851,
      fecha: '2026-09-21',
      descripcion: 'Pago Saldo Final OC-9941',
      docType: 'transferencia',
    }),

    // Evento 2: Fonda Primavera (Retail con Padre/Hijo)
    makeItem({
      id: RETAIL_PARENT_1,
      event_id: EVENT_FONDA_ID,
      servicio: 'Terremoto Tradicional 500cc (Venta Unitaria)',
      detalle: 'Vaso 500cc con pipeño, helado de piña y granadina',
      tipo_evento: 'Gastronomía',
      cantidad: 400,
      costo: 1450,
      ganancia: 2750,
      tipo_doc_costo: 'factura',
      approved: true,
    }),
    makeItem({
      id: 'd0000003-0000-4000-8000-000000000202',
      event_id: EVENT_FONDA_ID,
      servicio: 'Pipeño Seleccionado (Bidón 5L)',
      detalle: 'Insumo base para 12 terremotos por bidón',
      tipo_evento: 'Gastronomía',
      cantidad: 34,
      costo: 9800,
      ganancia: 0,
      tipo_doc_costo: 'factura',
      approved: true,
      parent_id: RETAIL_PARENT_1,
      es_insumo: true,
    }),
    makeItem({
      id: 'd0000003-0000-4000-8000-000000000203',
      event_id: EVENT_FONDA_ID,
      servicio: 'Helado de Piña Artesanal (Casata 10L)',
      detalle: 'Rendimiento 80 porciones por casata',
      tipo_evento: 'Gastronomía',
      cantidad: 5,
      costo: 24500,
      ganancia: 0,
      tipo_doc_costo: 'factura',
      approved: true,
      parent_id: RETAIL_PARENT_1,
      es_insumo: true,
    }),
    makeItem({
      id: RETAIL_PARENT_2,
      event_id: EVENT_FONDA_ID,
      servicio: 'Empanada de Pino Horno (Venta Unitaria)',
      detalle: 'Empanada artesanal 220g horneada en recinto',
      tipo_evento: 'Gastronomía',
      cantidad: 350,
      costo: 1180,
      ganancia: 2020,
      tipo_doc_costo: 'factura',
      approved: true,
    }),
    makeItem({
      id: 'd0000003-0000-4000-8000-000000000206',
      event_id: EVENT_FONDA_ID,
      servicio: 'Pino Vacuno Picado + Cebolla & Aceitunas (Lote)',
      detalle: 'Materia prima preparada en cocina central',
      tipo_evento: 'Gastronomía',
      cantidad: 1,
      costo: 295000,
      ganancia: 0,
      tipo_doc_costo: 'factura',
      approved: true,
      parent_id: RETAIL_PARENT_2,
      es_insumo: true,
    }),

    // Evento 3: Matrimonio Sofía & Tomás (Borrador + IA)
    makeItem({
      id: 'd0000003-0000-4000-8000-000000000301',
      event_id: EVENT_BODA_ID,
      servicio: 'Carpa Cristal 10x20m Iluminada con Guirnaldas',
      detalle: 'Montaje 48h antes en jardín central',
      tipo_evento: 'Mobiliario',
      cantidad: 1,
      costo: 1071000,
      ganancia: 420000,
      tipo_doc_costo: 'factura',
      approved: true,
    }),
    makeItem({
      id: 'd0000003-0000-4000-8000-000000000302',
      event_id: EVENT_BODA_ID,
      servicio: 'Cuarteto de Cuerdas Gala',
      detalle: 'Recepción civil y cóctel en terraza',
      tipo_evento: 'Música',
      cantidad: 1,
      costo: 260000,
      ganancia: 160000,
      tipo_doc_costo: 'boleta',
      approved: false,
    }),
    makeItem({
      id: 'd0000003-0000-4000-8000-000000000303',
      event_id: EVENT_BODA_ID,
      servicio: 'Barra Libre Coctelería de Autor (180 PAX)',
      detalle: '4 horas de barra abierta con 3 bartenders',
      tipo_evento: 'Gastronomía',
      cantidad: 180,
      costo: 11900,
      ganancia: 5500,
      tipo_doc_costo: 'factura',
      approved: false,
    }),
    makeItem({
      id: 'd0000003-0000-4000-8000-000000000304',
      event_id: EVENT_BODA_ID,
      servicio: 'Brigada de Garzones Banquetería (6 pers.)',
      detalle: 'Servicio de cena y descorche',
      tipo_evento: 'Personal',
      cantidad: 2,
      costo: 330000,
      ganancia: 145000,
      tipo_doc_costo: 'boleta',
      approved: false,
    }),

    // Evento 4: Cumbre Minera (Completed en Octubre para gráficos multi-mes)
    makeItem({
      id: 'd0000003-0000-4000-8000-000000000401',
      event_id: EVENT_CUMBRE_ID,
      servicio: 'Streaming Multicámara Full HD + Circuitos CCTV',
      detalle: 'Transmisión bilingüe para 400 delegados',
      tipo_evento: 'Audiovisual',
      cantidad: 2,
      costo: 595000,
      ganancia: 270000,
      tipo_doc_costo: 'factura',
      approved: true,
    }),
    makeItem({
      id: 'd0000003-0000-4000-8000-000000000402',
      event_id: EVENT_CUMBRE_ID,
      servicio: 'Sonido Line Array & Microfonía Conferencia',
      detalle: 'Salón plenario Espacio Riesco',
      tipo_evento: 'Audiovisual',
      cantidad: 2,
      costo: 357000,
      ganancia: 180000,
      tipo_doc_costo: 'factura',
      approved: true,
    }),
  ];

  return {
    organization,
    profile,
    master_costs: [...industryCosts, ...baseCosts],
    events,
    event_items,
  };
}

function loadDb(): LocalDemoDatabase {
  if (typeof window === 'undefined') {
    return buildInitialDemoDatabase('eventos_banqueteria');
  }
  try {
    const raw = localStorage.getItem(LOCAL_DEMO_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as LocalDemoDatabase;
      if (parsed && parsed.organization && Array.isArray(parsed.events)) {
        return parsed;
      }
    }
  } catch {
    // Fallback
  }
  const initial = buildInitialDemoDatabase('eventos_banqueteria');
  saveDb(initial);
  return initial;
}

function saveDb(db: LocalDemoDatabase) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_DEMO_STORAGE_KEY, JSON.stringify(db));
    window.dispatchEvent(new CustomEvent('kairos:local-db-changed'));
  } catch {
    // Ignore quota errors
  }
}

export function isLocalDemoModeClient(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    document.cookie.includes(`${LOCAL_DEMO_COOKIE}=1`) ||
    localStorage.getItem(LOCAL_DEMO_COOKIE) === '1'
  );
}

export function enableLocalDemoMode(industryType?: IndustryType) {
  if (typeof window === 'undefined') return;
  document.cookie = `${LOCAL_DEMO_COOKIE}=1; path=/; max-age=86400; SameSite=Lax`;
  localStorage.setItem(LOCAL_DEMO_COOKIE, '1');
  if (industryType) {
    switchLocalDemoIndustry(industryType);
  } else {
    loadDb();
  }
}

export function disableLocalDemoMode() {
  if (typeof window === 'undefined') return;
  document.cookie = `${LOCAL_DEMO_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
  localStorage.removeItem(LOCAL_DEMO_COOKIE);
}

export function resetLocalDemoData(industryType?: IndustryType) {
  const current = loadDb();
  const targetIndustry = industryType || current.organization.industry_type || 'eventos_banqueteria';
  const fresh = buildInitialDemoDatabase(targetIndustry);
  saveDb(fresh);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('kairos:org-updated'));
  }
  return fresh;
}

export function switchLocalDemoIndustry(industryType: IndustryType) {
  const fresh = buildInitialDemoDatabase(industryType);
  saveDb(fresh);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('kairos:org-updated'));
  }
  return fresh;
}

export function updateLocalDemoRetentionPolicy(policy: HonorariosRetentionPolicy) {
  const db = loadDb();
  if (db.organization.bank_info?.__saas_config) {
    db.organization.bank_info.__saas_config.honorarios_retention_policy = policy;
  }
  saveDb(db);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('kairos:org-updated'));
  }
}

export function updateLocalDemoTheme(theme: ThemePreset) {
  const db = loadDb();
  db.organization.theme_preset = theme;
  if (db.organization.bank_info?.__saas_config) {
    db.organization.bank_info.__saas_config.theme_preset = theme;
  }
  saveDb(db);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('kairos:org-updated'));
  }
}

export function getLocalDemoStats() {
  const db = loadDb();
  const userEventsCount = db.events.filter((e) => !e.is_demo_base && !e.deleted_at).length;
  const userCostsCount = db.master_costs.filter((c) => !c.is_demo_base).length;
  const userItemsCount = db.event_items.filter((i) => !i.is_demo_base).length;
  return {
    userEventsCount,
    maxEvents: 8,
    userCostsCount,
    maxCosts: 15,
    userItemsCount,
    maxItems: 120,
    industryType: db.organization.industry_type || 'eventos_banqueteria',
    retentionPolicy:
      db.organization.bank_info?.__saas_config?.honorarios_retention_policy || 'contractor',
  };
}

class LocalQueryBuilder {
  private table: string;
  private op: 'select' | 'insert' | 'update' | 'upsert' | 'delete' = 'select';
  private selectCols = '*';
  private selectOpts: { count?: string; head?: boolean } = {};
  private payload: any = null;
  private filters: Array<(row: any) => boolean> = [];
  private orderBy: { col: string; ascending: boolean } | null = null;
  private singleMode: 'none' | 'single' | 'maybeSingle' = 'none';

  constructor(table: string) {
    this.table = table;
  }

  select(cols = '*', opts?: { count?: string; head?: boolean }) {
    this.selectCols = cols;
    if (opts) this.selectOpts = opts;
    return this;
  }

  insert(rows: any) {
    this.op = 'insert';
    this.payload = rows;
    return this;
  }

  update(patch: any) {
    this.op = 'update';
    this.payload = patch;
    return this;
  }

  upsert(rows: any) {
    this.op = 'upsert';
    this.payload = rows;
    return this;
  }

  delete() {
    this.op = 'delete';
    return this;
  }

  eq(col: string, val: any) {
    this.filters.push((row) => {
      if (col.includes('.')) {
        const [rel, field] = col.split('.');
        return row[rel]?.[field] === val;
      }
      return row[col] === val;
    });
    return this;
  }

  neq(col: string, val: any) {
    this.filters.push((row) => row[col] !== val);
    return this;
  }

  in(col: string, vals: any[]) {
    const set = new Set(vals);
    this.filters.push((row) => set.has(row[col]));
    return this;
  }

  is(col: string, val: any) {
    this.filters.push((row) => {
      if (col.includes('.')) {
        const [rel, field] = col.split('.');
        return (row[rel]?.[field] ?? null) === val;
      }
      return (row[col] ?? null) === val;
    });
    return this;
  }

  lt(col: string, val: any) {
    this.filters.push((row) => row[col] < val);
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }) {
    this.orderBy = { col, ascending: opts?.ascending ?? true };
    return this;
  }

  single() {
    this.singleMode = 'single';
    return this;
  }

  maybeSingle() {
    this.singleMode = 'maybeSingle';
    return this;
  }

  private getTableRows(db: LocalDemoDatabase): any[] {
    if (this.table === 'organizations') return [db.organization];
    if (this.table === 'profiles') return [db.profile];
    if (this.table === 'master_costs') return db.master_costs;
    if (this.table === 'events') return db.events;
    if (this.table === 'event_items') return db.event_items;
    return [];
  }

  private setTableRows(db: LocalDemoDatabase, rows: any[]) {
    if (this.table === 'organizations' && rows[0]) db.organization = rows[0];
    else if (this.table === 'profiles' && rows[0]) db.profile = rows[0];
    else if (this.table === 'master_costs') db.master_costs = rows;
    else if (this.table === 'events') db.events = rows;
    else if (this.table === 'event_items') db.event_items = rows;
  }

  private execute(): { data: any; error: any; count?: number } {
    const db = loadDb();
    let rows = [...this.getTableRows(db)];

    if (this.op === 'insert') {
      const incoming = Array.isArray(this.payload) ? this.payload : [this.payload];
      const inserted = incoming.map((item, idx) => ({
        ...item,
        id: item.id || `local-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
        organization_id: item.organization_id || LOCAL_DEMO_ORG_ID,
        is_demo_base: item.is_demo_base ?? false,
        created_at: item.created_at || new Date().toISOString(),
        ...(this.table === 'events' ? { deleted_at: item.deleted_at ?? null } : {}),
      }));
      this.setTableRows(db, [...rows, ...inserted]);
      saveDb(db);
      const out = this.singleMode !== 'none' ? inserted[0] ?? null : inserted;
      return { data: out, error: null };
    }

    if (this.op === 'upsert') {
      const incoming = Array.isArray(this.payload) ? this.payload : [this.payload];
      const upserted: any[] = [];
      incoming.forEach((item, idx) => {
        const existingIdx = rows.findIndex((r) => r.id && item.id && r.id === item.id);
        if (existingIdx >= 0) {
          rows[existingIdx] = { ...rows[existingIdx], ...item };
          upserted.push(rows[existingIdx]);
        } else {
          const created = {
            ...item,
            id: item.id || `local-${Date.now()}-${idx}`,
            organization_id: item.organization_id || LOCAL_DEMO_ORG_ID,
            is_demo_base: item.is_demo_base ?? false,
            created_at: item.created_at || new Date().toISOString(),
          };
          rows.push(created);
          upserted.push(created);
        }
      });
      this.setTableRows(db, rows);
      saveDb(db);
      const out = this.singleMode !== 'none' ? upserted[0] ?? null : upserted;
      return { data: out, error: null };
    }

    if (this.op === 'update') {
      const updated: any[] = [];
      rows = rows.map((row) => {
        const matches = this.filters.every((fn) => fn(row));
        if (!matches) return row;
        const next = { ...row, ...this.payload };
        updated.push(next);
        return next;
      });
      this.setTableRows(db, rows);
      saveDb(db);
      const out = this.singleMode !== 'none' ? updated[0] ?? null : updated;
      return { data: out, error: null };
    }

    if (this.op === 'delete') {
      const remaining = rows.filter((row) => !this.filters.every((fn) => fn(row)));
      this.setTableRows(db, remaining);
      saveDb(db);
      return { data: null, error: null };
    }

    // SELECT with relational joins
    const wantsEventsJoin = this.table === 'event_items' && this.selectCols.includes('events');
    const wantsEventItemsJoin = this.table === 'events' && this.selectCols.includes('event_items');

    let enriched = rows.map((row) => {
      if (wantsEventsJoin) {
        const parentEvent = db.events.find((e) => e.id === row.event_id) || null;
        return { ...row, events: parentEvent };
      }
      if (wantsEventItemsJoin) {
        const childItems = db.event_items.filter((i) => i.event_id === row.id);
        return { ...row, event_items: childItems };
      }
      return { ...row };
    });

    if (wantsEventsJoin && this.selectCols.includes('events!inner')) {
      enriched = enriched.filter((r) => Boolean(r.events));
    }

    let filtered = enriched.filter((row) => this.filters.every((fn) => fn(row)));

    if (this.orderBy) {
      const { col, ascending } = this.orderBy;
      filtered.sort((a, b) => {
        const va = a[col] ?? '';
        const vb = b[col] ?? '';
        if (va < vb) return ascending ? -1 : 1;
        if (va > vb) return ascending ? 1 : -1;
        return 0;
      });
    }

    const count = filtered.length;
    if (this.selectOpts.head) {
      return { data: null, error: null, count };
    }

    if (this.singleMode === 'single') {
      return { data: filtered[0] ?? null, error: null };
    }
    if (this.singleMode === 'maybeSingle') {
      return { data: filtered[0] ?? null, error: null };
    }

    return { data: filtered, error: null, count };
  }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: any; count?: number }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected);
  }
}

export function createLocalDemoSupabaseClient(): any {
  const demoUser = {
    id: LOCAL_DEMO_USER_ID,
    email: LOCAL_DEMO_EMAIL,
    factors: [],
  };

  return {
    auth: {
      getUser: async () => ({ data: { user: demoUser }, error: null }),
      getSession: async () => ({
        data: { session: { user: demoUser, access_token: 'local-demo-token' } },
        error: null,
      }),
      onAuthStateChange: () => ({
        data: {
          subscription: {
            unsubscribe: () => {},
          },
        },
      }),
      signOut: async () => {
        disableLocalDemoMode();
        return { error: null };
      },
      mfa: {
        getAuthenticatorAssuranceLevel: async () => ({
          data: { currentLevel: 'aal1', nextLevel: 'aal1' },
          error: null,
        }),
        listFactors: async () => ({ data: { totp: [] }, error: null }),
      },
    },
    from: (table: string) => new LocalQueryBuilder(table),
    channel: () => {
      let handler: (() => void) | null = null;
      const listener = () => {
        if (handler) handler();
      };
      const ch = {
        on: (_type: string, _filter: any, cb: () => void) => {
          handler = cb;
          return ch;
        },
        subscribe: () => {
          if (typeof window !== 'undefined') {
            window.addEventListener('kairos:local-db-changed', listener);
          }
          return ch;
        },
        _cleanup: () => {
          if (typeof window !== 'undefined') {
            window.removeEventListener('kairos:local-db-changed', listener);
          }
        },
      };
      return ch;
    },
    removeChannel: (ch: any) => {
      if (ch && typeof ch._cleanup === 'function') {
        ch._cleanup();
      }
    },
  };
}
