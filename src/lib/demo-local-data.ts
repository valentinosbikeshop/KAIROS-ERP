import { getIndustryBlueprint } from '@/lib/industries';
import { calculateFinancials } from '@/lib/utils';
import type {
  HonorariosRetentionPolicy,
  IndustryType,
  ThemePreset,
} from '@/types/database';

export interface DemoLineItem {
  id: string;
  servicio: string;
  detalle: string;
  categoria: string;
  cantidad: number;
  costo: number;
  ganancia: number;
  tipo_doc_costo: 'factura' | 'boleta';
  es_insumo?: boolean;
  parent_id?: string | null;
  approved: boolean;
}

export interface DemoTransaction {
  id: string;
  type: 'ABONO_CLIENTE' | 'GASTO_REAL';
  concepto: string;
  monto: number;
  fecha: string;
  docType: 'factura' | 'boleta' | 'transferencia';
}

export interface DemoProject {
  id: string;
  name: string;
  client_company: string;
  location: string;
  event_date: string;
  status: 'planning' | 'approved' | 'completed';
  scenarioBadge: string;
  scenarioDesc: string;
  has_retail_sales?: boolean;
  isCustom?: boolean;
  items: DemoLineItem[];
  transactions: DemoTransaction[];
}

export interface DemoCatalogItem {
  id: string;
  servicio: string;
  categoria: string;
  detalle: string;
  costo: number;
  ganancia: number;
  tipo_doc_costo: 'factura' | 'boleta';
  isCustom?: boolean;
}

export interface DemoBrandConfig {
  companyName: string;
  rut: string;
  email: string;
  phone: string;
  banco: string;
  cuenta: string;
  retentionPolicy: HonorariosRetentionPolicy;
  themePreset: ThemePreset;
}

export interface DemoAiSuggestion {
  id: string;
  title: string;
  reason: string;
  servicio: string;
  categoria: string;
  detalle: string;
  costo: number;
  ganancia: number;
  tipo_doc_costo: 'factura' | 'boleta';
  impactClp: number;
}

export interface DemoOcrSampleDoc {
  id: string;
  fileName: string;
  supplier: string;
  docTypeLabel: string;
  items: Array<{
    servicio: string;
    categoria: string;
    detalle: string;
    cantidad: number;
    costo: number;
    ganancia: number;
    tipo_doc_costo: 'factura' | 'boleta';
  }>;
}

export interface DemoIndustrySeed {
  brand: DemoBrandConfig;
  catalog: DemoCatalogItem[];
  projects: DemoProject[];
  aiSuggestions: DemoAiSuggestion[];
  ocrSamples: DemoOcrSampleDoc[];
}

const INDUSTRY_META_PROFILES: Record<
  IndustryType,
  {
    companyName: string;
    rut: string;
    email: string;
    locationDefault: string;
    clients: [string, string, string, string];
    projectNames: [string, string, string, string];
    missingCostTitle: string;
    missingCostService: string;
    missingCostDetail: string;
    missingCostAmount: number;
    missingCostGain: number;
    ocrSupplier1: string;
    ocrFile1: string;
    ocrSupplier2: string;
    ocrFile2: string;
  }
> = {
  eventos_banqueteria: {
    companyName: 'Horizonte Eventos & Banquetería SpA',
    rut: '76.842.190-4',
    email: 'contacto@horizonteeventos.cl',
    locationDefault: 'Centro Parque Araucano, Las Condes',
    clients: ['Banco Austral Corporativo', 'Festival Primavera Sur', 'Sofía & Tomás', 'Cámara Chilena Tech'],
    projectNames: [
      'Gala Anual TechChile 2026',
      'Fonda & Barra Primavera (Retail)',
      'Matrimonio Sofía & Tomás (180 PAX)',
      'Lanzamiento Corporativo Fintech',
    ],
    missingCostTitle: 'Flete Refrigerado + Hielo & Montaje Nocturno',
    missingCostService: 'Logística Flete Refrigerado + Hielo en Cubos',
    missingCostDetail: 'Camión frío ida/vuelta + 180 kg hielo + 2 cargadores desmontaje 03:00 AM',
    missingCostAmount: 185000,
    missingCostGain: 75000,
    ocrSupplier1: 'Banquetería & Cristalería Central',
    ocrFile1: 'Cotizacion_Menaje_Cristaleria_2026.pdf',
    ocrSupplier2: 'AudioPro Iluminación Chile',
    ocrFile2: 'Presupuesto_Sonido_Escenario.xlsx',
  },
  marketing_audiovisual: {
    companyName: 'Estudio Vértice Creative SpA',
    rut: '77.194.320-8',
    email: 'hola@verticecreative.cl',
    locationDefault: 'Providencia / Locación Estudio',
    clients: ['Retail Andes S.A.', 'Clínica Vida Salud', 'Startup PayFast', 'Automotora Pacífico'],
    projectNames: [
      'Campaña Comercial TV + Reels Q4',
      'Producción Banco de Contenidos (Packs)',
      'Documental Marca Empleadora',
      'Lanzamiento Digital Automotriz',
    ],
    missingCostTitle: 'Respaldo Storage Cloud + Licencias Musicales',
    missingCostService: 'Licencias Audio Comercial + Respaldo LTO/Cloud',
    missingCostDetail: 'Derechos sincronización 12 meses + almacenamiento RAW 4TB',
    missingCostAmount: 140000,
    missingCostGain: 65000,
    ocrSupplier1: 'Rental Cámaras & Ópticas Cine',
    ocrFile1: 'Rental_Sony_FX6_Opticas_Cine.pdf',
    ocrSupplier2: 'Color & Postproducción Studio',
    ocrFile2: 'Tarifario_ColorGrading_VFX.xlsx',
  },
  construccion_arquitectura: {
    companyName: 'Constructora Cordillera Ingeniería SpA',
    rut: '76.519.440-2',
    email: 'proyectos@cordilleraing.cl',
    locationDefault: 'Parque Empresarial ENEA, Pudahuel',
    clients: ['Inmobiliaria Cerro Alto', 'Farmacias del Sur', 'Oficinas Torre Titanium', 'Logística Central'],
    projectNames: [
      'Habilitación Oficinas Piso 14',
      'Remodelación Sucursal Comercial (Por m²)',
      'Ampliación Bodega & Radier Industrial',
      'Proyecto Arquitectura & Permiso DOM',
    ],
    missingCostTitle: 'Retiro de Escombros + Aseo Fino de Entrega',
    missingCostService: 'Contenedor Escombros 7m³ + Aseo Final Obra',
    missingCostDetail: 'Incluye certificado disposición autorizada + cuadrilla aseo fino',
    missingCostAmount: 290000,
    missingCostGain: 110000,
    ocrSupplier1: 'Materiales & Acero Santiago',
    ocrFile1: 'Cotizacion_Tabiqueria_Volcanita_Perfiles.pdf',
    ocrSupplier2: 'Instalaciones Eléctricas SEC',
    ocrFile2: 'Presupuesto_Tablero_Trifasico_TE1.xlsx',
  },
  catering_foodservice: {
    companyName: 'Atelier Gastronómico Sur SpA',
    rut: '76.993.112-K',
    email: 'pedidos@ateliersur.cl',
    locationDefault: 'Vitacura / Cocina Central',
    clients: ['Minera Los Andes', 'Colegio Internacional', 'Corporación Salud', 'Eventos Empresariales'],
    projectNames: [
      'Casino Ejecutivo Mensual (300 Raciones)',
      'Coffee Break & Brunch Corporativo (Retail)',
      'Cena Maridaje Directorio 60 PAX',
      'Servicio Alimentación Congreso Médico',
    ],
    missingCostTitle: 'Merma Insumos Frescos + Despacho Térmico',
    missingCostService: 'Logística Cajas Isotérmicas + Contingencia Merma 5%',
    missingCostDetail: 'Transporte refrigerado certificado Seremi + buffer perecibles',
    missingCostAmount: 135000,
    missingCostGain: 55000,
    ocrSupplier1: 'Distribuidora Agrícola Lo Valledor',
    ocrFile1: 'Factura_Insumos_Gastronomicos_Semana.pdf',
    ocrSupplier2: 'Envases Compostables EcoPack',
    ocrFile2: 'Lista_Precios_Packaging_Termico.xlsx',
  },
  ferias_stands_b2b: {
    companyName: 'ExpoStand Arquitectura B2B SpA',
    rut: '77.084.510-6',
    email: 'comercial@expostand.cl',
    locationDefault: 'Espacio Riesco, Huechuraba',
    clients: ['Siemens Energía Chile', 'AgroSuper Export', 'TechMining Global', 'Laboratorio BioMed'],
    projectNames: [
      'Stand Modular 54m² Expomin',
      'Activación Punto Venta Mall (Packs)',
      'Pabellón Corporativo Feria Alimentaria',
      'Stand Isla Pantalla LED 36m²',
    ],
    missingCostTitle: 'Derechos Eléctricos Recinto + Seguro Montaje',
    missingCostService: 'Empalme Trifásico Recinto + Seguro RC Montaje',
    missingCostDetail: 'Gestión técnica con Espacio Riesco + póliza accidente cuadrilla',
    missingCostAmount: 320000,
    missingCostGain: 120000,
    ocrSupplier1: 'Gráfica Gran Formato & Impresión',
    ocrFile1: 'Presupuesto_Tela_Backlight_Vinilos.pdf',
    ocrSupplier2: 'Pantallas LED & Tótem Táctil',
    ocrFile2: 'Cotizacion_LED_P2_6_Feria.xlsx',
  },
  maestranza_muebles: {
    companyName: 'Maestranza & Mobiliario Austral SpA',
    rut: '76.312.880-1',
    email: 'taller@maestranzaaustral.cl',
    locationDefault: 'San Bernardo / Planta Industrial',
    clients: ['Retail Moda Norte', 'Café & Tostaduría', 'Hotel Costanera', 'Oficinas CoWork'],
    projectNames: [
      'Mobiliario Tienda Flagship Costanera',
      'Línea Mesas & Estanterías Acero (Por Unidad)',
      'Reja Perimetral & Portón Automatizado',
      'Recepción Roble + Cubierta Cuarzo',
    ],
    missingCostTitle: 'Pintura Electrostática + Embalaje & Instalación',
    missingCostService: 'Horno Pintura Polvo + Flete Grúa Pluma',
    missingCostDetail: 'Tratamiento anticorrosivo + traslado protegido + anclaje en obra',
    missingCostAmount: 240000,
    missingCostGain: 95000,
    ocrSupplier1: 'Acero & Perfiles Industriales',
    ocrFile1: 'Cotizacion_Planchas_Tubos_Inox.pdf',
    ocrSupplier2: 'Maderas & Tableros Melamina',
    ocrFile2: 'Despiece_Tableros_Cubiertas.xlsx',
  },
  ingenieria_hvac: {
    companyName: 'TermoClima Ingeniería & Proyectos SpA',
    rut: '76.771.209-9',
    email: 'ingenieria@termoclima.cl',
    locationDefault: 'Las Condes / Data Center',
    clients: ['Clínica Santa María', 'DataCenter Sur', 'Supermercados Express', 'Edificio Corporativo'],
    projectNames: [
      'Climatización VRF Torre Oficina',
      'Mantención Preventiva 24 Equipos (Por Unidad)',
      'Extracción Industrial Cocina Central',
      'Sistema Precisión Sala Servidores',
    ],
    missingCostTitle: 'Cañería Cobre Aislada + Puesta en Marcha Certificada',
    missingCostService: 'Kit Cañerías Cobre + Vacío Nitrógeno & Protocolo',
    missingCostDetail: 'Soldadura plata, prueba hermeticidad 400 PSI y certificación',
    missingCostAmount: 260000,
    missingCostGain: 105000,
    ocrSupplier1: 'Distribuidora Clima & VRF',
    ocrFile1: 'Cotizacion_Equipos_Inverter_VRF.pdf',
    ocrSupplier2: 'Ductos Galvanizados & Rejillas',
    ocrFile2: 'Cubicacion_Ductos_Aislacion.xlsx',
  },
  consultoria_juridico: {
    companyName: 'B&R Consultores Estratégicos SpA',
    rut: '77.450.912-3',
    email: 'socios@brconsultores.cl',
    locationDefault: 'El Golf, Las Condes',
    clients: ['Holding Inversiones Sur', 'Grupo Logístico Valpo', 'Fintech Créditos', 'Agrícola Central'],
    projectNames: [
      'Due Diligence Financiero & Tributario',
      'Retainer Mensual Directorio & Compliance',
      'Reestructuración Societaria Holding',
      'Implementación Gobierno Corporativo',
    ],
    missingCostTitle: 'Gastos Notariales, CBR & Peritaje Técnico',
    missingCostService: 'Derechos Notaría, Conservador y Publicación Diario Oficial',
    missingCostDetail: 'Aranceles legales protocolización e inscripciones societarias',
    missingCostAmount: 195000,
    missingCostGain: 55000,
    ocrSupplier1: 'Auditoría Tributaria Externa',
    ocrFile1: 'Propuesta_Horas_Senior_Auditoria.pdf',
    ocrSupplier2: 'Peritaje Valorización Activos',
    ocrFile2: 'Honorarios_Perito_Tasador.xlsx',
  },
  turismo_mice: {
    companyName: 'Andes MICE & Corporate Travel SpA',
    rut: '76.628.340-5',
    email: 'operaciones@andesmice.cl',
    locationDefault: 'Valle de Colchagua / Santiago',
    clients: ['Multinacional Pharma', 'Banco Regional Latam', 'Convención Minera', 'Tech Summit Chile'],
    projectNames: [
      'Convención Anual Latam 120 Ejecutivos',
      'Excursiones VIP Viñas & Cordillera (Por PAX)',
      'Incentivo Corporativo Patagonia 4 Días',
      'Traslados & Logística VIP Summit',
    ],
    missingCostTitle: 'Peajes, TAG, Seguro Pasajeros & Coordinador',
    missingCostService: 'Peajes Autopistas + Seguro Asistencia + Coordinador Bilingüe',
    missingCostDetail: 'Cobertura total ruta + staff en terreno 24/7',
    missingCostAmount: 165000,
    missingCostGain: 68000,
    ocrSupplier1: 'Hotel Boutique Valle Colchagua',
    ocrFile1: 'Bloqueo_Habitaciones_Salones_MICE.pdf',
    ocrSupplier2: 'Flota Buses Ejecutivo Turístico',
    ocrFile2: 'Cotizacion_Traslados_Aeropuerto_Vina.xlsx',
  },
};

export function buildDemoSeedForIndustry(industryType: IndustryType): DemoIndustrySeed {
  const bp = getIndustryBlueprint(industryType);
  const meta = INDUSTRY_META_PROFILES[industryType];

  const catalog: DemoCatalogItem[] = bp.starterCatalog.map((item) => ({
    id: item.id,
    servicio: item.servicio,
    categoria: item.tipo_evento || bp.categories[0] || 'General',
    detalle: item.detail,
    costo: item.costo,
    ganancia: item.ganancia,
    tipo_doc_costo: item.tipo_doc_costo,
  }));

  const s0 = catalog[0] || {
    id: 'fallback-0',
    servicio: 'Partida Principal del Proyecto',
    categoria: bp.categories[0] || 'Operación',
    detalle: 'Ejecución técnica especializada',
    costo: 450000,
    ganancia: 220000,
    tipo_doc_costo: 'factura' as const,
  };
  const s1 = catalog[1] || s0;
  const s2 = catalog[2] || s0;
  const s3 = catalog[3] || s1;

  const p1Items: DemoLineItem[] = [
    {
      id: 'p1-i1',
      servicio: s0.servicio,
      detalle: s0.detalle,
      categoria: s0.categoria,
      cantidad: 2,
      costo: s0.costo,
      ganancia: s0.ganancia,
      tipo_doc_costo: s0.tipo_doc_costo,
      approved: true,
    },
    {
      id: 'p1-i2',
      servicio: s1.servicio,
      detalle: s1.detalle,
      categoria: s1.categoria,
      cantidad: 3,
      costo: s1.costo,
      ganancia: s1.ganancia,
      tipo_doc_costo: s1.tipo_doc_costo,
      approved: true,
    },
    {
      id: 'p1-i3',
      servicio: s2.servicio,
      detalle: s2.detalle,
      categoria: s2.categoria,
      cantidad: 1,
      costo: s2.costo,
      ganancia: s2.ganancia,
      tipo_doc_costo: s2.tipo_doc_costo,
      approved: true,
    },
  ];

  const p1VentaEst = p1Items.reduce(
    (sum, i) => sum + calculateFinancials(i.costo, i.ganancia, i.tipo_doc_costo, true).valorTotal * i.cantidad,
    0
  );
  const p1CostoEst = p1Items.reduce((sum, i) => sum + i.costo * i.cantidad, 0);

  const projects: DemoProject[] = [
    {
      id: 'demo-proj-1',
      name: meta.projectNames[0],
      client_company: meta.clients[0],
      location: meta.locationDefault,
      event_date: '2026-10-18',
      status: 'completed',
      scenarioBadge: 'Completado + Cierre F29',
      scenarioDesc:
        'Explora ítems consolidados, abonos al 100%, gastos reales rendidos, IVA F29 y vista previa PDF Marca Blanca.',
      items: p1Items,
      transactions: [
        {
          id: 'tx-101',
          type: 'ABONO_CLIENTE',
          concepto: 'Anticipo 50% firma de propuesta',
          monto: Math.round(p1VentaEst * 0.5),
          fecha: '2026-10-02',
          docType: 'transferencia',
        },
        {
          id: 'tx-102',
          type: 'GASTO_REAL',
          concepto: `Pago proveedor ${s0.servicio}`,
          monto: Math.round(p1CostoEst * 0.65),
          fecha: '2026-10-12',
          docType: s0.tipo_doc_costo,
        },
        {
          id: 'tx-103',
          type: 'ABONO_CLIENTE',
          concepto: 'Pago saldo final contra entrega conforme',
          monto: p1VentaEst - Math.round(p1VentaEst * 0.5),
          fecha: '2026-10-21',
          docType: 'transferencia',
        },
        {
          id: 'tx-104',
          type: 'GASTO_REAL',
          concepto: 'Rendición honorarios y cierre operativo',
          monto: p1CostoEst - Math.round(p1CostoEst * 0.65),
          fecha: '2026-10-22',
          docType: 'boleta',
        },
      ],
    },
    {
      id: 'demo-proj-2',
      name: meta.projectNames[1],
      client_company: meta.clients[1],
      location: meta.locationDefault,
      event_date: '2026-11-12',
      status: 'approved',
      has_retail_sales: true,
      scenarioBadge: 'Consolidación / Retail',
      scenarioDesc:
        'Revisa partidas padre con sub-insumos prorrateados por unidad para detectar fugas de margen al detalle.',
      items: [
        {
          id: 'p2-parent',
          servicio: s3.servicio,
          detalle: s3.detalle,
          categoria: s3.categoria,
          cantidad: 4,
          costo: s3.costo,
          ganancia: s3.ganancia,
          tipo_doc_costo: s3.tipo_doc_costo,
          approved: true,
        },
        {
          id: 'p2-child-1',
          servicio: 'Insumos Directos Prorrateados',
          detalle: 'Materiales consumibles y reposición por unidad',
          categoria: bp.categories[1] || 'Insumos',
          cantidad: 4,
          costo: Math.round(s3.costo * 0.25),
          ganancia: 0,
          tipo_doc_costo: 'factura',
          es_insumo: true,
          parent_id: 'p2-parent',
          approved: true,
        },
        {
          id: 'p2-i2',
          servicio: s1.servicio,
          detalle: s1.detalle,
          categoria: s1.categoria,
          cantidad: 2,
          costo: s1.costo,
          ganancia: s1.ganancia,
          tipo_doc_costo: s1.tipo_doc_costo,
          approved: true,
        },
      ],
      transactions: [
        {
          id: 'tx-201',
          type: 'ABONO_CLIENTE',
          concepto: 'Abono inicial 40% reserva de fecha',
          monto: Math.round((s3.costo + s3.ganancia) * 4 * 1.19 * 0.4),
          fecha: '2026-11-01',
          docType: 'transferencia',
        },
        {
          id: 'tx-202',
          type: 'GASTO_REAL',
          concepto: 'Compra anticipada de insumos con factura',
          monto: Math.round(s3.costo * 2),
          fecha: '2026-11-05',
          docType: 'factura',
        },
      ],
    },
    {
      id: 'demo-proj-3',
      name: meta.projectNames[2],
      client_company: meta.clients[2],
      location: meta.locationDefault,
      event_date: '2026-11-28',
      status: 'planning',
      scenarioBadge: 'Borrador + Suite IA',
      scenarioDesc:
        'Prueba el Auditor de Márgenes IA, importa cotizaciones OCR PDF/Excel en 1 clic y ajusta retenciones 15,25%.',
      items: [
        {
          id: 'p3-i1',
          servicio: s0.servicio,
          detalle: s0.detalle,
          categoria: s0.categoria,
          cantidad: 1,
          costo: s0.costo,
          ganancia: Math.round(s0.costo * 0.14), // Margen bajo intencional para que el Auditor IA lo detecte
          tipo_doc_costo: s0.tipo_doc_costo,
          approved: false,
        },
        {
          id: 'p3-i2',
          servicio: s2.servicio,
          detalle: s2.detalle,
          categoria: s2.categoria,
          cantidad: 2,
          costo: s2.costo,
          ganancia: s2.ganancia,
          tipo_doc_costo: 'boleta',
          approved: false,
        },
      ],
      transactions: [],
    },
    {
      id: 'demo-proj-4',
      name: meta.projectNames[3],
      client_company: meta.clients[3],
      location: meta.locationDefault,
      event_date: '2026-12-09',
      status: 'approved',
      scenarioBadge: 'Ejecución & Cobranza',
      scenarioDesc:
        'Controla el saldo por cobrar al cliente, facturas pendientes y flujo de caja proyectado.',
      items: [
        {
          id: 'p4-i1',
          servicio: s1.servicio,
          detalle: s1.detalle,
          categoria: s1.categoria,
          cantidad: 2,
          costo: s1.costo,
          ganancia: s1.ganancia,
          tipo_doc_costo: s1.tipo_doc_costo,
          approved: true,
        },
        {
          id: 'p4-i2',
          servicio: s3.servicio,
          detalle: s3.detalle,
          categoria: s3.categoria,
          cantidad: 1,
          costo: s3.costo,
          ganancia: s3.ganancia,
          tipo_doc_costo: 'boleta',
          approved: true,
        },
      ],
      transactions: [
        {
          id: 'tx-401',
          type: 'ABONO_CLIENTE',
          concepto: 'Orden de compra + primer estado de pago',
          monto: Math.round((s1.costo + s1.ganancia) * 1.19),
          fecha: '2026-11-18',
          docType: 'transferencia',
        },
      ],
    },
  ];

  const aiSuggestions: DemoAiSuggestion[] = [
    {
      id: 'ai-sug-1',
      title: `Costo oculto detectado: ${meta.missingCostTitle}`,
      reason: `En proyectos de ${bp.shortName}, omitir este ítem erosiona entre un 4% y 7% el margen neto final.`,
      servicio: meta.missingCostService,
      categoria: bp.categories[bp.categories.length - 1] || 'Logística',
      detalle: meta.missingCostDetail,
      costo: meta.missingCostAmount,
      ganancia: meta.missingCostGain,
      tipo_doc_costo: 'factura',
      impactClp: meta.missingCostGain,
    },
    {
      id: 'ai-sug-2',
      title: `Calibración de margen a meta ${bp.targetMarginPct}% en ${bp.shortName}`,
      reason:
        'Detectamos partidas con margen inferior al estándar de tu industria. Ajustar al rango recomendado protege tu caja contra imprevistos.',
      servicio: 'Contingencia Operativa & Supervisión Técnica',
      categoria: bp.categories[0] || 'Operación',
      detalle: 'Reserva técnica de coordinación y aseguramiento de calidad',
      costo: 95000,
      ganancia: 75000,
      tipo_doc_costo: 'boleta',
      impactClp: 75000,
    },
  ];

  const ocrSamples: DemoOcrSampleDoc[] = [
    {
      id: 'ocr-1',
      fileName: meta.ocrFile1,
      supplier: meta.ocrSupplier1,
      docTypeLabel: 'PDF Cotización Proveedor',
      items: [
        {
          servicio: `${s0.servicio} (Anexo Proveedor)`,
          categoria: s0.categoria,
          detalle: `Extraído vía OCR desde ${meta.ocrFile1}`,
          cantidad: 1,
          costo: Math.round(s0.costo * 0.85),
          ganancia: Math.round(s0.costo * 0.35),
          tipo_doc_costo: 'factura',
        },
        {
          servicio: 'Traslado y Seguro Técnico Especializado',
          categoria: bp.categories[bp.categories.length - 1] || 'Logística',
          detalle: `Ítem detectado en pie de página de ${meta.ocrSupplier1}`,
          cantidad: 1,
          costo: 85000,
          ganancia: 35000,
          tipo_doc_costo: 'factura',
        },
      ],
    },
    {
      id: 'ocr-2',
      fileName: meta.ocrFile2,
      supplier: meta.ocrSupplier2,
      docTypeLabel: 'Planilla Excel Proveedor',
      items: [
        {
          servicio: `${s2.servicio} (Desglose Excel)`,
          categoria: s2.categoria,
          detalle: `Importado automáticamente desde ${meta.ocrFile2}`,
          cantidad: 2,
          costo: Math.round(s2.costo * 0.9),
          ganancia: Math.round(s2.ganancia * 1.1),
          tipo_doc_costo: 'factura',
        },
      ],
    },
  ];

  return {
    brand: {
      companyName: meta.companyName,
      rut: meta.rut,
      email: meta.email,
      phone: '+56 9 8420 1190',
      banco: 'Banco de Chile',
      cuenta: 'Cuenta Corriente N° 00-184-99210-04',
      retentionPolicy: 'contractor',
      themePreset: bp.recommendedTheme,
    },
    catalog,
    projects,
    aiSuggestions,
    ocrSamples,
  };
}

export function computeEffectiveItemCost(
  costo: number,
  docType: 'factura' | 'boleta',
  retentionPolicy: HonorariosRetentionPolicy
): { effectiveCosto: number; retencion1525: number; liquidoContratado: number } {
  if (docType !== 'boleta') {
    return { effectiveCosto: costo, retencion1525: 0, liquidoContratado: costo };
  }
  const effectiveCosto =
    retentionPolicy === 'company'
      ? Math.round(costo / (1 - 0.1525))
      : retentionPolicy === 'split_50_50'
      ? Math.round(costo * (1 + 0.1525 / 2))
      : costo;
  const retencion1525 = Math.round(effectiveCosto * 0.1525);
  const liquidoContratado = effectiveCosto - retencion1525;
  return { effectiveCosto, retencion1525, liquidoContratado };
}

export function computeDemoProjectFinancials(
  project: DemoProject,
  retentionPolicy: HonorariosRetentionPolicy
) {
  let ventaNeta = 0;
  let ivaDebito = 0;
  let ventaTotal = 0;
  let costoTotal = 0;
  let ivaCredito = 0;
  let retencionHonorarios = 0;
  let utilidadPresupuestada = 0;

  project.items.forEach((item) => {
    const qty = Math.max(1, item.cantidad || 1);
    const { effectiveCosto, retencion1525 } = computeEffectiveItemCost(
      item.costo,
      item.tipo_doc_costo,
      retentionPolicy
    );
    const fin = calculateFinancials(effectiveCosto, item.ganancia, item.tipo_doc_costo, true);

    if (item.es_insumo) {
      // Sub-insumo prorrateado suma a costo e IVA crédito si es factura
      costoTotal += effectiveCosto * qty;
      if (item.tipo_doc_costo === 'factura') {
        ivaCredito += Math.round(effectiveCosto * 0.19) * qty;
      }
      retencionHonorarios += retencion1525 * qty;
      return;
    }

    ventaNeta += fin.valorNeto * qty;
    ivaDebito += fin.iva * qty;
    ventaTotal += fin.valorTotal * qty;
    costoTotal += effectiveCosto * qty;
    if (item.tipo_doc_costo === 'factura') {
      ivaCredito += Math.round(effectiveCosto * 0.19) * qty;
    }
    retencionHonorarios += retencion1525 * qty;
    utilidadPresupuestada += item.ganancia * qty;
  });

  const ivaNetoPagar = Math.max(0, ivaDebito - ivaCredito);
  const margenPct = ventaNeta > 0 ? (utilidadPresupuestada / ventaNeta) * 100 : 0;

  const totalAbonos = project.transactions
    .filter((t) => t.type === 'ABONO_CLIENTE')
    .reduce((acc, t) => acc + t.monto, 0);
  const totalGastosReales = project.transactions
    .filter((t) => t.type === 'GASTO_REAL')
    .reduce((acc, t) => acc + t.monto, 0);

  const saldoPorCobrar = Math.max(0, ventaTotal - totalAbonos);
  const cajaRealNeta = totalAbonos - totalGastosReales;

  return {
    ventaNeta,
    ivaDebito,
    ventaTotal,
    costoTotal,
    ivaCredito,
    ivaNetoPagar,
    retencionHonorarios,
    utilidadPresupuestada,
    margenPct,
    totalAbonos,
    totalGastosReales,
    saldoPorCobrar,
    cajaRealNeta,
  };
}
