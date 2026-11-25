import type {
  IndustryType,
  ModuleKey,
  OperationMode,
  ThemePreset,
} from '@/types/database';
import type { CostResourceType, StaffModality } from './cost-metadata';

export interface IndustryStarterCost {
  id: string;
  servicio: string;
  tipo_evento: string;
  resourceType: CostResourceType;
  staffCount: number;
  staffHours: string;
  staffModality: StaffModality;
  tipo_doc_costo: 'factura' | 'boleta';
  aplicaIvaVenta: boolean;
  costo: number;
  ganancia: number;
  detail: string;
}

export interface IndustryTerminology {
  projectSingular: string;
  projectPlural: string;
  newProjectCta: string;
  clientLabel: string;
  catalogLabel: string;
  analyticsLabel: string;
  locationLabel: string;
  retailModeLabel: string;
  retailModeDesc: string;
}

export interface IndustryCapabilityHighlight {
  title: string;
  description: string;
  metric: string;
}

export interface IndustryExpressTemplateItem {
  servicio: string;
  detalle: string;
  tipo_evento: string;
  cantidad: number;
  costo: number;
  ganancia: number;
  tipo_doc_costo: 'factura' | 'boleta';
}

export interface IndustryExpressTemplate {
  id: string;
  name: string;
  clientPlaceholder: string;
  locationPlaceholder: string;
  description: string;
  hasRetailSales: boolean;
  items: IndustryExpressTemplateItem[];
}

export type IndustryIconName =
  | 'PartyPopper'
  | 'Clapperboard'
  | 'HardHat'
  | 'UtensilsCrossed'
  | 'LayoutGrid'
  | 'Wrench'
  | 'Wind'
  | 'Scale'
  | 'Plane';

export interface IndustryBlueprint {
  id: IndustryType;
  name: string;
  shortName: string;
  iconName: IndustryIconName;
  tagline: string;
  ownerPainPoint: string;
  heroHeadlinePrefix: string;
  heroHeadlineAccent: string;
  heroHeadlineSuffix: string;
  heroValueProp: string;
  quickWinStat: string;
  capabilityHighlights: IndustryCapabilityHighlight[];
  planSpecialtyFeatures: Record<'free' | 'essential' | 'growth' | 'scale', string[]>;
  expressTemplates: IndustryExpressTemplate[];
  recommendedTheme: ThemePreset;
  recommendedOperationMode: OperationMode;
  targetMarginPct: number;
  recommendedModules: ModuleKey[];
  terminology: IndustryTerminology;
  categories: string[];
  aiDomainPrompt: string;
  starterCatalog: IndustryStarterCost[];
}

export interface ThemePresetDefinition {
  id: ThemePreset;
  name: string;
  subtitle: string;
  accentHex: string;
  badgeClass: string;
  previewGradient: string;
}

export const THEME_PRESETS: Record<ThemePreset, ThemePresetDefinition> = {
  obsidian_gold: {
    id: 'obsidian_gold',
    name: 'Nordic Cobalt & Abyssal',
    subtitle: 'Precisión suiza, dirección ejecutiva y claridad financiera',
    accentHex: '#1261E0',
    badgeClass: 'bg-[#1261E0]/10 text-[#0F4FB8] border-[#1261E0]/25',
    previewGradient: 'from-[#080E1A] via-[#0F1B2E] to-[#1261E0]/80',
  },
  sapphire_executive: {
    id: 'sapphire_executive',
    name: 'Glacial Sapphire',
    subtitle: 'Transparencia operativa, velocidad y control B2B',
    accentHex: '#0284C7',
    badgeClass: 'bg-[#0284C7]/10 text-[#0369A1] border-[#0284C7]/25',
    previewGradient: 'from-[#080E1A] via-[#0C2438] to-[#0284C7]/80',
  },
  emerald_sovereign: {
    id: 'emerald_sovereign',
    name: 'Mineral Teal',
    subtitle: 'Ingeniería, operaciones en terreno y rentabilidad neta',
    accentHex: '#0D8A72',
    badgeClass: 'bg-[#0D8A72]/10 text-[#0A6C59] border-[#0D8A72]/25',
    previewGradient: 'from-[#080E1A] via-[#0B2824] to-[#0D8A72]/80',
  },
  terracotta_atelier: {
    id: 'terracotta_atelier',
    name: 'Steel Graphite',
    subtitle: 'Sobriedad arquitectónica y foco absoluto en los datos',
    accentHex: '#43536B',
    badgeClass: 'bg-slate-500/10 text-slate-700 border-slate-400/30',
    previewGradient: 'from-[#0A111F] via-[#1E293B] to-[#334155]',
  },
  amethyst_studio: {
    id: 'amethyst_studio',
    name: 'Precision Indigo',
    subtitle: 'Agencias creativas, audiovisual y producción moderna',
    accentHex: '#2544D8',
    badgeClass: 'bg-[#2544D8]/10 text-[#1D35AD] border-[#2544D8]/25',
    previewGradient: 'from-[#080E1A] via-[#17214C] to-[#2544D8]/80',
  },
};

export const INDUSTRY_BLUEPRINTS: Record<IndustryType, IndustryBlueprint> = {
  eventos_banqueteria: {
    id: 'eventos_banqueteria',
    name: 'Productoras de Eventos y Banqueterías',
    shortName: 'Eventos & Banquetería',
    iconName: 'PartyPopper',
    tagline: 'Bodas, galas corporativas, barras, riders técnicos y banquetería.',
    ownerPainPoint: 'Evita olvidar fletes, hielo, garzones o retenciones de boletas al cotizar rápido.',
    heroHeadlinePrefix: 'Cotiza un evento completo en',
    heroHeadlineAccent: '3 clics con IVA y staff',
    heroHeadlineSuffix: 'bajo control.',
    heroValueProp:
      'Deja atrás los Excel donde un flete olvidado o una boleta de DJ mal calculada destruye tu ganancia. Arma propuestas PDF ejecutivas por PAX, controla abonos de clientes y proyecta tu F29 en vivo.',
    quickWinStat: 'Cotización PDF por PAX en < 2 min',
    capabilityHighlights: [
      {
        title: 'Plantillas de Gala, Matrimonio y Barra',
        description:
          'Duplica eventos exitosos o usa Cotización Express para cargar audio, iluminación, banquetería y garzones al instante.',
        metric: 'Ahorro 5 hrs/sem en presupuestos',
      },
      {
        title: 'Prorrateo de Barra & Ventas al Detalle',
        description:
          'Desglosa bidones, hielo, bartenders y cristalería por trago o plato servido para conocer tu margen unitario real.',
        metric: '+6,4% margen recuperado en barras',
      },
      {
        title: 'Honorarios de Artistas y Staff (15,25%)',
        description:
          'Configura quién asume la retención de boletas de DJs, músicos y garzones sin recalcular a mano cada evento.',
        metric: '0 errores de retención SII',
      },
    ],
    planSpecialtyFeatures: {
      free: ['Plantilla de tarifas para Banquetería, Audio y Staff'],
      essential: ['Propuestas PDF ejecutivas por PAX con desglose de abonos'],
      growth: ['Prorrateo de barra/recetas e IA anti-olvidos de fletes e insumos'],
      scale: ['Cotizaciones Marca Blanca para bodas VIP y licitaciones corporativas'],
    },
    expressTemplates: [
      {
        id: 'ev-tpl-gala',
        name: 'Gala Corporativa 150 PAX (Llave en Mano)',
        clientPlaceholder: 'Empresa Corporativa S.A.',
        locationPlaceholder: 'Salón Gran Ballroom, Las Condes',
        description:
          'Cena de 3 tiempos, refuerzo sonoro Line Array, iluminación robótica, DJ/animación y brigada de garzones.',
        hasRetailSales: false,
        items: [
          {
            servicio: 'Banquetería Cóctel & Cena 3 Tiempos (Por Persona)',
            detalle: 'Entrada, fondo, postre + cristalería fina',
            tipo_evento: 'Gastronomía',
            cantidad: 150,
            costo: 28500,
            ganancia: 12500,
            tipo_doc_costo: 'factura',
          },
          {
            servicio: 'Audio Line Array + Iluminación Escénica',
            detalle: 'Sonido profesional 300 pax + 8 cabezas móviles',
            tipo_evento: 'Audiovisual',
            cantidad: 1,
            costo: 390000,
            ganancia: 210000,
            tipo_doc_costo: 'factura',
          },
          {
            servicio: 'Brigada Garzones & Maitre (6 pers.)',
            detalle: 'Turno 8 hrs servicio completo en mesa',
            tipo_evento: 'Personal',
            cantidad: 1,
            costo: 310000,
            ganancia: 130000,
            tipo_doc_costo: 'boleta',
          },
        ],
      },
      {
        id: 'ev-tpl-barra',
        name: 'Sunset & Barra Coctelería (Venta Unitaria)',
        clientPlaceholder: 'Evento Corporativo / Activación',
        locationPlaceholder: 'Terraza Panorámica, Vitacura',
        description:
          'Operación de barra con venta unitaria, bartenders, hielo, cristalería y DJ profesional.',
        hasRetailSales: true,
        items: [
          {
            servicio: 'Barra Coctelería de Autor (Tragos Unitarios)',
            detalle: 'Pisco Sour, Aperol Spritz y Gin Tonic',
            tipo_evento: 'Gastronomía',
            cantidad: 300,
            costo: 1850,
            ganancia: 3150,
            tipo_doc_costo: 'factura',
          },
          {
            servicio: 'Equipo Bartenders Turno Evento (3 pers.)',
            detalle: 'Mixólogos con mise en place y barra móvil',
            tipo_evento: 'Personal',
            cantidad: 1,
            costo: 210000,
            ganancia: 95000,
            tipo_doc_costo: 'boleta',
          },
        ],
      },
    ],
    recommendedTheme: 'obsidian_gold',
    recommendedOperationMode: 'retail_mixed',
    targetMarginPct: 35,
    recommendedModules: [
      'mod_unlimited_projects',
      'mod_pdf_quotes',
      'mod_transactions_sii',
      'mod_consolidation_retail',
      'mod_ai_suite',
      'mod_analytics_excel',
    ],
    terminology: {
      projectSingular: 'Evento',
      projectPlural: 'Eventos',
      newProjectCta: 'Nuevo Evento',
      clientLabel: 'Empresa / Cliente',
      catalogLabel: 'Tarifas',
      analyticsLabel: 'Consolidación',
      locationLabel: 'Centro de Eventos / Lugar',
      retailModeLabel: '¿Habilitar Ventas al por Menor (Bar / Fondas / Venta Unitaria)?',
      retailModeDesc: 'Activa consolidación de tragos/platos, prorrateo unitario de insumos y separación de materias primas.',
    },
    categories: ['Gastronomía', 'Música', 'Personal', 'Mobiliario', 'Audiovisual', 'Logística'],
    aiDomainPrompt: 'Rubro: Productora de Eventos y Banquetería en Chile. Cuida logística oculta (flete, hielo, montaje, garzones, boletas honorarios 15,25%/retención o factura).',
    starterCatalog: [
      {
        id: 'ev-1',
        servicio: 'Banquetería Cóctel Ejecutivo (Por Persona)',
        tipo_evento: 'Gastronomía',
        resourceType: 'insumo',
        staffCount: 0,
        staffHours: 'Servicio 3 hrs',
        staffModality: 'factura_subcontrato',
        tipo_doc_costo: 'factura',
        aplicaIvaVenta: true,
        costo: 14500,
        ganancia: 8500,
        detail: '10 bocados salados/dulces + jugo natural + cristalería',
      },
      {
        id: 'ev-2',
        servicio: 'DJ Profesional + Audio & Iluminación Base',
        tipo_evento: 'Música',
        resourceType: 'servicio',
        staffCount: 1,
        staffHours: '6 hrs',
        staffModality: 'honorarios',
        tipo_doc_costo: 'boleta',
        aplicaIvaVenta: true,
        costo: 220000,
        ganancia: 140000,
        detail: 'Cabina, 2 cajas activas, micrófono inalámbrico y cabezas móviles',
      },
      {
        id: 'ev-3',
        servicio: 'Staff Garzones & Maitre (Turno Evento)',
        tipo_evento: 'Personal',
        resourceType: 'personal',
        staffCount: 4,
        staffHours: '7 hrs',
        staffModality: 'honorarios',
        tipo_doc_costo: 'boleta',
        aplicaIvaVenta: true,
        costo: 180000,
        ganancia: 75000,
        detail: '1 Maitre + 3 Garzones uniformados',
      },
      {
        id: 'ev-4',
        servicio: 'Flete Camión Cerrado + Carga/Descarga',
        tipo_evento: 'Logística',
        resourceType: 'logistica',
        staffCount: 2,
        staffHours: 'Ida y vuelta',
        staffModality: 'factura_subcontrato',
        tipo_doc_costo: 'factura',
        aplicaIvaVenta: true,
        costo: 95000,
        ganancia: 35000,
        detail: 'Traslado equipamiento dentro de radio urbano',
      },
    ],
  },

  marketing_audiovisual: {
    id: 'marketing_audiovisual',
    name: 'Agencias de Marketing, Publicidad y Audiovisual',
    shortName: 'Marketing & Audiovisual',
    iconName: 'Clapperboard',
    tagline: 'Campañas, rodajes comerciales, diseño, pauta y entregables digitales.',
    ownerPainPoint: 'Controla el costo real de días de rodaje, equipos arrendados y horas creativas frente al fee.',
    heroHeadlinePrefix: 'Presupuesta rodajes y retainers',
    heroHeadlineAccent: 'sin regalar horas creativas',
    heroHeadlineSuffix: 'ni equipos.',
    heroValueProp:
      'Convierte un brief de marca en una propuesta comercial rentable en minutos. Separa pauta de terceros, renta de cámaras, honorarios de crew y edición para proteger tu margen real.',
    quickWinStat: 'Rate Card + Presupuesto Rodaje en 90 seg',
    capabilityHighlights: [
      {
        title: 'Desglose Crew, Renta & Postproducción',
        description:
          'Agrupa jornadas de Dirección de Fotografía, gaffer, arriendo de lentes y colorización con cálculo exacto de boletas.',
        metric: '+11% rentabilidad por campaña',
      },
      {
        title: 'Control de Retainers y Entregables',
        description:
          'Prorratea un día de rodaje entre 12 cápsulas Reels/TikTok y verifica si el fee mensual sigue siendo sano.',
        metric: 'Trazabilidad hora a hora',
      },
      {
        title: 'OCR de Cotizaciones de Renta & Talento',
        description:
          'Sube el PDF de tu casa de rental o casting y la IA extrae cada ítem con tu margen objetivo aplicado.',
        metric: 'Cotización lista en 3 clics',
      },
    ],
    planSpecialtyFeatures: {
      free: ['Rate Card base para jornadas 4K, edición y Paid Media'],
      essential: ['Propuestas PDF ejecutivas para marcas y control de abonos 50/50'],
      growth: ['OCR de rentals + prorrateo de jornadas entre cápsulas y reels'],
      scale: ['Múltiples productores cotizando con Marca Blanca de agencia'],
    },
    expressTemplates: [
      {
        id: 'mk-tpl-rodaje',
        name: 'Campaña Comercial + Spot 4K (1 Jornada)',
        clientPlaceholder: 'Marca Retail Chile S.A.',
        locationPlaceholder: 'Estudio Lo Barnechea / Locación',
        description:
          'Rodaje comercial 1 día completo con cámara cinema 4K, sonidista, catering de set y edición master 16:9 + 9:16.',
        hasRetailSales: false,
        items: [
          {
            servicio: 'Jornada Dirección de Fotografía + Cámara Cinema 4K',
            detalle: 'Cuerpo 4K, set lentes prime y tarjetas',
            tipo_evento: 'Rodaje & Cámaras',
            cantidad: 1,
            costo: 350000,
            ganancia: 230000,
            tipo_doc_costo: 'boleta',
          },
          {
            servicio: 'Edición, Colorización & Masterización Spot',
            detalle: '2 rondas de feedback, entrega multiformato',
            tipo_evento: 'Postproducción',
            cantidad: 1,
            costo: 180000,
            ganancia: 150000,
            tipo_doc_costo: 'boleta',
          },
          {
            servicio: 'Catering & Coffee Break de Rodaje (12 pax)',
            detalle: 'Desayuno, almuerzo e hidratación en set',
            tipo_evento: 'Logística Set',
            cantidad: 1,
            costo: 110000,
            ganancia: 30000,
            tipo_doc_costo: 'factura',
          },
        ],
      },
      {
        id: 'mk-tpl-retainer',
        name: 'Pack 12 Cápsulas Reels + Paid Media Mensual',
        clientPlaceholder: 'Startup B2B / Ecommerce',
        locationPlaceholder: 'Remoto + Estudio Agencia',
        description:
          'Producción mensual de contenido vertical prorrateando jornada de grabación y gestión de pauta Meta/Google.',
        hasRetailSales: true,
        items: [
          {
            servicio: 'Cápsula Vertical Reel/TikTok (Unidad)',
            detalle: 'Guión, grabación, subtítulos dinámicos y color',
            tipo_evento: 'Postproducción',
            cantidad: 12,
            costo: 42000,
            ganancia: 38000,
            tipo_doc_costo: 'boleta',
          },
          {
            servicio: 'Gestión Mensual Paid Media (Meta + Google Ads)',
            detalle: 'Píxeles, audiencias y reporte KPI semanal',
            tipo_evento: 'Pauta Digital',
            cantidad: 1,
            costo: 220000,
            ganancia: 260000,
            tipo_doc_costo: 'factura',
          },
        ],
      },
    ],
    recommendedTheme: 'amethyst_studio',
    recommendedOperationMode: 'project',
    targetMarginPct: 42,
    recommendedModules: [
      'mod_unlimited_projects',
      'mod_pdf_quotes',
      'mod_transactions_sii',
      'mod_ai_suite',
      'mod_analytics_excel',
    ],
    terminology: {
      projectSingular: 'Campaña',
      projectPlural: 'Campañas & Rodajes',
      newProjectCta: 'Nueva Campaña',
      clientLabel: 'Marca / Anunciante',
      catalogLabel: 'Rate Card',
      analyticsLabel: 'Rentabilidad',
      locationLabel: 'Locación / Estudio',
      retailModeLabel: '¿Desglosar entregables con costos unitarios compartidos?',
      retailModeDesc: 'Útil para prorratear jornadas de cámara, locación o catering de rodaje entre múltiples cápsulas o piezas.',
    },
    categories: ['Preproducción', 'Rodaje & Cámaras', 'Postproducción', 'Talento / Influencers', 'Pauta Digital', 'Logística Set'],
    aiDomainPrompt: 'Rubro: Agencia de Marketing y Productora Audiovisual en Chile. Prioriza jornadas de equipo técnico, renta de cámaras, postproducción, honorarios creativos y derechos de uso.',
    starterCatalog: [
      {
        id: 'mk-1',
        servicio: 'Jornada Dirección de Fotografía + Cámara Cinema 4K',
        tipo_evento: 'Rodaje & Cámaras',
        resourceType: 'servicio',
        staffCount: 1,
        staffHours: '10 hrs',
        staffModality: 'honorarios',
        tipo_doc_costo: 'boleta',
        aplicaIvaVenta: true,
        costo: 350000,
        ganancia: 230000,
        detail: 'Incluye cuerpo 4K, set de lentes prime y tarjetas',
      },
      {
        id: 'mk-2',
        servicio: 'Edición, Colorización & Masterización Reel/Spot',
        tipo_evento: 'Postproducción',
        resourceType: 'personal',
        staffCount: 1,
        staffHours: '16 hrs',
        staffModality: 'honorarios',
        tipo_doc_costo: 'boleta',
        aplicaIvaVenta: true,
        costo: 180000,
        ganancia: 150000,
        detail: '2 rondas de feedback incluidas, entrega 16:9 y 9:16',
      },
      {
        id: 'mk-3',
        servicio: 'Gestión Mensual Paid Media (Meta + Google Ads)',
        tipo_evento: 'Pauta Digital',
        resourceType: 'servicio',
        staffCount: 1,
        staffHours: 'Mensual',
        staffModality: 'factura_subcontrato',
        tipo_doc_costo: 'factura',
        aplicaIvaVenta: true,
        costo: 220000,
        ganancia: 260000,
        detail: 'Setup de audiencias, píxeles y reporte semanal KPI',
      },
      {
        id: 'mk-4',
        servicio: 'Catering & Coffee Break de Rodaje (Equipo 12 pax)',
        tipo_evento: 'Logística Set',
        resourceType: 'insumo',
        staffCount: 0,
        staffHours: '1 jornada',
        staffModality: 'factura_subcontrato',
        tipo_doc_costo: 'factura',
        aplicaIvaVenta: true,
        costo: 110000,
        ganancia: 30000,
        detail: 'Desayuno, almuerzo en set e hidratación continua',
      },
    ],
  },

  construccion_arquitectura: {
    id: 'construccion_arquitectura',
    name: 'Constructoras Menores, Remodelaciones y Arquitectura',
    shortName: 'Construcción & Obras',
    iconName: 'HardHat',
    tagline: 'Cubicaciones, partidas de obra, subcontratos, materiales y estados de pago.',
    ownerPainPoint: 'Evita que los materiales extras y subcontratos sin factura se coman el margen de la obra.',
    heroHeadlinePrefix: 'Cotiza partidas y obras',
    heroHeadlineAccent: 'sin que los extras devoren',
    heroHeadlineSuffix: 'tu margen.',
    heroValueProp:
      'Cubicaciones claras por m², control de estados de pago frente a gastos reales en ferretería y subcontratos SEC, e IVA Crédito recuperado en cada factura de materiales.',
    quickWinStat: 'Presupuesto de Obra por m² en 3 clics',
    capabilityHighlights: [
      {
        title: 'Partidas Agrupadas (Materiales + Mano de Obra)',
        description:
          'Consolida tabiquería Metalcon, Volcanita, tornillería y cuadrilla bajo una sola partida clara para el mandante.',
        metric: 'Desviación < 3% en faena',
      },
      {
        title: 'Control de Estados de Pago vs. Gasto Real',
        description:
          'Registra cada anticipo del propietario y compáralo en vivo con facturas de materiales, tolvas y tratos.',
        metric: 'Visibilidad de caja por obra',
      },
      {
        title: 'Lectura IA de Planillas Excel y Cubicaciones',
        description:
          'Sube una planilla de especificaciones técnicas o presupuesto base y obtén costos unitarios + margen sugerido.',
        metric: 'Ahorro +6 hrs/sem en cubicación',
      },
    ],
    planSpecialtyFeatures: {
      free: ['Maestro de Partidas base (m² tabiquería, cuadrillas, SEC, tolvas)'],
      essential: ['Presupuestos PDF formales para mandantes + control de estados de pago'],
      growth: ['Agrupación de materiales por partida + OCR de facturas ferretería'],
      scale: ['Múltiples administradores de obra con Marca Blanca constructora'],
    },
    expressTemplates: [
      {
        id: 'co-tpl-oficina',
        name: 'Habilitación Oficina Corporativa 85 m²',
        clientPlaceholder: 'Inmobiliaria / Empresa Mandante',
        locationPlaceholder: 'Torre Empresarial, Providencia',
        description:
          'Remodelación integral de planta libre: tabiquería acústica Metalcon, tablero eléctrico SEC, pintura y retiro de escombros.',
        hasRetailSales: true,
        items: [
          {
            servicio: 'Tabiquería Metalcon + Placa Volcanita 15mm (m²)',
            detalle: 'Incluye perfiles, lana mineral, masilla y cinta',
            tipo_evento: 'Obra Gruesa',
            cantidad: 65,
            costo: 24500,
            ganancia: 9500,
            tipo_doc_costo: 'factura',
          },
          {
            servicio: 'Certificación & Tablero Eléctrico SEC (Subcontrato)',
            detalle: 'Instalador autorizado clase B + tramitación TE1',
            tipo_evento: 'Instalaciones',
            cantidad: 1,
            costo: 320000,
            ganancia: 95000,
            tipo_doc_costo: 'factura',
          },
          {
            servicio: 'Cuadrilla Maestros Terminaciones (5 Jornadas)',
            detalle: 'Maestro primera + ayudante terminaciones finas',
            tipo_evento: 'Mano de Obra',
            cantidad: 5,
            costo: 95000,
            ganancia: 32000,
            tipo_doc_costo: 'boleta',
          },
        ],
      },
      {
        id: 'co-tpl-remodelacion',
        name: 'Ampliación & Terminaciones Residenciales',
        clientPlaceholder: 'Propietario Particular',
        locationPlaceholder: 'Las Condes / Vitacura',
        description:
          'Obra menor residencial con radier, tabiquería exterior, piso porcelanato y retiro de escombros certificado.',
        hasRetailSales: false,
        items: [
          {
            servicio: 'Instalación Porcelanato Gran Formato (m²)',
            detalle: 'Adhesivo Bekron AC, crucetas niveladoras y fragüe',
            tipo_evento: 'Terminaciones',
            cantidad: 48,
            costo: 21000,
            ganancia: 9500,
            tipo_doc_costo: 'factura',
          },
          {
            servicio: 'Camión Tolva Retiro de Escombros (6 m³)',
            detalle: 'Incluye disposición en botadero autorizado',
            tipo_evento: 'Fletes & Retiro',
            cantidad: 2,
            costo: 135000,
            ganancia: 35000,
            tipo_doc_costo: 'factura',
          },
        ],
      },
    ],
    recommendedTheme: 'emerald_sovereign',
    recommendedOperationMode: 'project',
    targetMarginPct: 26,
    recommendedModules: [
      'mod_unlimited_projects',
      'mod_pdf_quotes',
      'mod_transactions_sii',
      'mod_consolidation_retail',
      'mod_ai_suite',
      'mod_analytics_excel',
    ],
    terminology: {
      projectSingular: 'Obra',
      projectPlural: 'Obras y Proyectos',
      newProjectCta: 'Nueva Obra',
      clientLabel: 'Mandante / Propietario',
      catalogLabel: 'Maestro de Partidas',
      analyticsLabel: 'Control de Obra',
      locationLabel: 'Dirección de Faena',
      retailModeLabel: '¿Agrupar Materiales e Insumos por Partida Constructiva?',
      retailModeDesc: 'Permite consolidar materiales (cemento, tabiquería, tornillería) bajo cada partida presupuestada.',
    },
    categories: ['Obra Gruesa', 'Terminaciones', 'Instalaciones', 'Mano de Obra', 'Subcontratos', 'Fletes & Retiro'],
    aiDomainPrompt: 'Rubro: Constructora Menor, Remodelación y Arquitectura en Chile. Desglosa partidas con materiales en CLP (m2/ml/unidad), mano de obra, retiro de escombros y 10% imprevistos.',
    starterCatalog: [
      {
        id: 'co-1',
        servicio: 'Tabiquería Metalcon + Placa Volcanita 15mm (m²)',
        tipo_evento: 'Obra Gruesa',
        resourceType: 'insumo',
        staffCount: 0,
        staffHours: 'Por m²',
        staffModality: 'factura_subcontrato',
        tipo_doc_costo: 'factura',
        aplicaIvaVenta: true,
        costo: 24500,
        ganancia: 9500,
        detail: 'Incluye perfiles, aislación lana mineral, tornillos y masilla',
      },
      {
        id: 'co-2',
        servicio: 'Cuadrilla Maestros Carpinteros / Terminaciones (Día)',
        tipo_evento: 'Mano de Obra',
        resourceType: 'personal',
        staffCount: 2,
        staffHours: '8.5 hrs',
        staffModality: 'turno',
        tipo_doc_costo: 'boleta',
        aplicaIvaVenta: true,
        costo: 95000,
        ganancia: 32000,
        detail: 'Maestro primera + ayudante con leyes sociales/epp',
      },
      {
        id: 'co-3',
        servicio: 'Certificación & Tablero Eléctrico SEC (Subcontrato)',
        tipo_evento: 'Instalaciones',
        resourceType: 'servicio',
        staffCount: 1,
        staffHours: 'Por proyecto',
        staffModality: 'factura_subcontrato',
        tipo_doc_costo: 'factura',
        aplicaIvaVenta: true,
        costo: 320000,
        ganancia: 95000,
        detail: 'Instalador autorizado SEC clase B + tramitación TE1',
      },
      {
        id: 'co-4',
        servicio: 'Camión Tolva Retiro de Escombros (6 m³)',
        tipo_evento: 'Fletes & Retiro',
        resourceType: 'logistica',
        staffCount: 1,
        staffHours: '1 viaje',
        staffModality: 'factura_subcontrato',
        tipo_doc_costo: 'factura',
        aplicaIvaVenta: true,
        costo: 135000,
        ganancia: 35000,
        detail: 'Incluye disposición en botadero autorizado',
      },
    ],
  },

  catering_foodservice: {
    id: 'catering_foodservice',
    name: 'Catering Corporativo y Food Service Industrial',
    shortName: 'Catering & Food Service',
    iconName: 'UtensilsCrossed',
    tagline: 'Casinos corporativos, coffee breaks, colaciones y recetas por porción.',
    ownerPainPoint: 'Controla el costo exacto por ración/porción y las alzas de materias primas con factura.',
    heroHeadlinePrefix: 'Domina el costo por ración',
    heroHeadlineAccent: 'y protege tu margen',
    heroHeadlineSuffix: 'en cada contrato.',
    heroValueProp:
      'Calcula recetas exactas con merma y packaging, cotiza coffee breaks o casinos mensuales en segundos y recupera el 19% de IVA Crédito de todas tus compras mayoristas.',
    quickWinStat: 'Escandallo por Ración en 1 clic',
    capabilityHighlights: [
      {
        title: 'Escandallo y Prorrateo de Materias Primas',
        description:
          'Divide compras mayoristas de proteínas, abarrotes y envases biodegradables por la cantidad exacta de raciones.',
        metric: 'Control exacto de merma (5%)',
      },
      {
        title: 'Contratos Mensuales & Despachos Diarios',
        description:
          'Monitorea facturación mensual de casinos corporativos, abonos quincenales y costo de furgones refrigerados.',
        metric: '+8% margen neto en contratos',
      },
      {
        title: 'OCR de Facturas de Distribuidoras',
        description:
          'Detecta alzas de precios de proveedores subiendo su factura y recalcula automáticamente el precio de venta.',
        metric: 'Actualización de costos en segundos',
      },
    ],
    planSpecialtyFeatures: {
      free: ['Recetario base por ración, coffee break y despacho refrigerado'],
      essential: ['Propuestas PDF para licitaciones de casinos y control de cobranza'],
      growth: ['Prorrateo automático de insumos por porción + alertas IA de alzas'],
      scale: ['Múltiples plantas o concesiones operando bajo una sola matriz'],
    },
    expressTemplates: [
      {
        id: 'ca-tpl-casino',
        name: 'Contrato Mensual Colaciones Corporativas (600 Raciones)',
        clientPlaceholder: 'Planta Industrial / Oficina Central',
        locationPlaceholder: 'Parque Industrial ENEA, Pudahuel',
        description:
          'Servicio mensual de almuerzo transportado con entrada, fondo, postre, pan, cubiertos y despacho térmico diario.',
        hasRetailSales: true,
        items: [
          {
            servicio: 'Almuerzo Ejecutivo Transportado (Por Ración)',
            detalle: 'Plato fondo 350g + ensalada + postre + pan',
            tipo_evento: 'Menú Corporativo',
            cantidad: 600,
            costo: 4200,
            ganancia: 2100,
            tipo_doc_costo: 'factura',
          },
          {
            servicio: 'Despacho en Furgón Refrigerado Urbano (20 Rutas)',
            detalle: 'Cadena de frío controlada 0°C-4°C',
            tipo_evento: 'Despacho Refrigerado',
            cantidad: 20,
            costo: 35000,
            ganancia: 15000,
            tipo_doc_costo: 'factura',
          },
        ],
      },
      {
        id: 'ca-tpl-coffee',
        name: 'Coffee Break Ejecutivo Jornada Completa (80 PAX)',
        clientPlaceholder: 'Corporación / Directorio',
        locationPlaceholder: 'Edificio Corporativo, Santiago Centro',
        description:
          'Doble coffee break AM/PM con café en grano, pastelería artesanal, fruta fresca y montaje en sala.',
        hasRetailSales: false,
        items: [
          {
            servicio: 'Coffee Break Premium (Por Persona)',
            detalle: 'Café grano, té, 2 tapaditos, 2 dulces y fruta',
            tipo_evento: 'Coffee Break',
            cantidad: 80,
            costo: 3800,
            ganancia: 2400,
            tipo_doc_costo: 'factura',
          },
          {
            servicio: 'Chef + Ayudante de Producción & Montaje',
            detalle: 'Manipulación certificada resolución sanitaria',
            tipo_evento: 'Personal Cocina',
            cantidad: 1,
            costo: 105000,
            ganancia: 38000,
            tipo_doc_costo: 'boleta',
          },
        ],
      },
    ],
    recommendedTheme: 'terracotta_atelier',
    recommendedOperationMode: 'retail_mixed',
    targetMarginPct: 32,
    recommendedModules: [
      'mod_unlimited_projects',
      'mod_pdf_quotes',
      'mod_transactions_sii',
      'mod_consolidation_retail',
      'mod_ai_suite',
      'mod_analytics_excel',
    ],
    terminology: {
      projectSingular: 'Servicio Catering',
      projectPlural: 'Servicios & Contratos',
      newProjectCta: 'Nuevo Servicio',
      clientLabel: 'Empresa / Casino',
      catalogLabel: 'Recetario & Tarifas',
      analyticsLabel: 'Margen & Raciones',
      locationLabel: 'Planta / Oficina Cliente',
      retailModeLabel: '¿Activar Prorrateo de Recetas e Insumos por Ración?',
      retailModeDesc: 'Divide compras mayoristas de abarrotes, proteínas y envases entre la cantidad exacta de porciones vendidas.',
    },
    categories: ['Menú Corporativo', 'Coffee Break', 'Materias Primas', 'Packaging', 'Personal Cocina', 'Despacho Refrigerado'],
    aiDomainPrompt: 'Rubro: Catering Corporativo y Food Service en Chile. Calcula gramajes reales por ración, merma 5%, packaging desechable/biodegradable y logística térmica.',
    starterCatalog: [
      {
        id: 'ca-1',
        servicio: 'Almuerzo Ejecutivo Transportado (Por Ración)',
        tipo_evento: 'Menú Corporativo',
        resourceType: 'insumo',
        staffCount: 0,
        staffHours: 'Diario',
        staffModality: 'factura_subcontrato',
        tipo_doc_costo: 'factura',
        aplicaIvaVenta: true,
        costo: 4200,
        ganancia: 2100,
        detail: 'Plato fondo 350g + ensalada + postre + pan + cubiertos',
      },
      {
        id: 'ca-2',
        servicio: 'Coffee Break Premium (Por Persona)',
        tipo_evento: 'Coffee Break',
        resourceType: 'insumo',
        staffCount: 0,
        staffHours: '2 hrs',
        staffModality: 'factura_subcontrato',
        tipo_doc_costo: 'factura',
        aplicaIvaVenta: true,
        costo: 3800,
        ganancia: 2400,
        detail: 'Café grano, té, 2 tapaditos, 2 dulces y fruta fresca',
      },
      {
        id: 'ca-3',
        servicio: 'Chef + Ayudante de Cocina (Jornada Producción)',
        tipo_evento: 'Personal Cocina',
        resourceType: 'personal',
        staffCount: 2,
        staffHours: '8 hrs',
        staffModality: 'turno',
        tipo_doc_costo: 'boleta',
        aplicaIvaVenta: true,
        costo: 105000,
        ganancia: 38000,
        detail: 'Manipulación certificada resolución sanitaria',
      },
      {
        id: 'ca-4',
        servicio: 'Despacho en Furgón Refrigerado Urbano',
        tipo_evento: 'Despacho Refrigerado',
        resourceType: 'logistica',
        staffCount: 1,
        staffHours: 'Ruta AM',
        staffModality: 'factura_subcontrato',
        tipo_doc_costo: 'factura',
        aplicaIvaVenta: true,
        costo: 35000,
        ganancia: 15000,
        detail: 'Cadena de frío controlada 0°C-4°C',
      },
    ],
  },

  ferias_stands_b2b: {
    id: 'ferias_stands_b2b',
    name: 'Productoras de Ferias, Stands y Montajes B2B',
    shortName: 'Ferias & Stands B2B',
    iconName: 'LayoutGrid',
    tagline: 'Diseño y montaje de stands, gráfica, pantallas LED y activaciones de marca.',
    ownerPainPoint: 'Evita perder dinero en horas extras de montaje nocturno, gráfica de último minuto y fletes.',
    heroHeadlinePrefix: 'Cotiza stands feriales B2B',
    heroHeadlineAccent: 'sin fugas en montaje',
    heroHeadlineSuffix: 'ni gráfica de última hora.',
    heroValueProp:
      'Presupuesta estructuras modulares, metros cuadrados de Trovicel, pantallas LED y cuadrillas nocturnas en minutos. Controla adelantos de expositores y cierre real tras el desmontaje.',
    quickWinStat: 'Cotización Stand Modular en 3 clics',
    capabilityHighlights: [
      {
        title: 'Consolidación por Zona del Stand',
        description:
          'Agrupa carpintería, gráfica gran formato, iluminación y mobiliario bajo un solo ítem cotizado al expositor.',
        metric: 'Propuestas limpias para gerencia',
      },
      {
        title: 'Control de Turnos Nocturnos & Fletes',
        description:
          'Registra boletas de cuadrillas de montaje en recintos feriales y fletes sin que queden fuera del P&L.',
        metric: '+9% margen protegido en feria',
      },
      {
        title: 'Licitaciones & Cotizador PDF B2B',
        description:
          'Genera propuestas técnicas formales con IVA desglosado, plazos de montaje y datos bancarios de transferencia.',
        metric: 'Aprobación 2x más rápida',
      },
    ],
    planSpecialtyFeatures: {
      free: ['Inventario modular base (stands, gráfica m², LED y montaje)'],
      essential: ['Cotizaciones PDF B2B con datos bancarios para expositores'],
      growth: ['Agrupación de insumos por módulo + IA anti-sobrecostos nocturnos'],
      scale: ['Equipo comercial multi-ejecutivo con Marca Blanca de productora'],
    },
    expressTemplates: [
      {
        id: 'fe-tpl-stand18',
        name: 'Stand Modular Premium 18 m² + Pantalla LED',
        clientPlaceholder: 'Marca Expositora B2B',
        locationPlaceholder: 'Espacio Riesco — Pabellón Central',
        description:
          'Stand isla/esquina de 18 m² con gráfica en Trovicel, pantalla LED P2.6 3x2m, mobiliario y cuadrilla de montaje.',
        hasRetailSales: true,
        items: [
          {
            servicio: 'Stand Modular Melamina + Counter Corporativo (18 m²)',
            detalle: 'Tarima alfombrada, muros 2.5m, bodega y counter',
            tipo_evento: 'Estructuras & Carpintería',
            cantidad: 1,
            costo: 980000,
            ganancia: 620000,
            tipo_doc_costo: 'factura',
          },
          {
            servicio: 'Impresión e Instalación Gráfica Trovicel (m²)',
            detalle: '1440dpi laminado mate anti-reflejo',
            tipo_evento: 'Gráfica & Impresión',
            cantidad: 24,
            costo: 18500,
            ganancia: 12500,
            tipo_doc_costo: 'factura',
          },
          {
            servicio: 'Arriendo Pantalla LED Pitch 2.6 (3x2 mts)',
            detalle: 'Procesador Novastar, truss soporte y técnico',
            tipo_evento: 'Pantallas & Audio',
            cantidad: 1,
            costo: 450000,
            ganancia: 280000,
            tipo_doc_costo: 'factura',
          },
        ],
      },
      {
        id: 'fe-tpl-activacion',
        name: 'Activación Punto de Venta & Tótem Digital',
        clientPlaceholder: 'Brand Marketing Cliente',
        locationPlaceholder: 'Centro Comercial / Feria Regional',
        description:
          'Módulo de activación rápida con gráfica backlight, counter promocional y cuadrilla de montaje/desmontaje.',
        hasRetailSales: false,
        items: [
          {
            servicio: 'Cuadrilla Montaje y Desmontaje Nocturno (4 pax)',
            detalle: 'EPP, seguro accidentes y herramientas',
            tipo_evento: 'Cuadrilla Montaje',
            cantidad: 1,
            costo: 280000,
            ganancia: 110000,
            tipo_doc_costo: 'boleta',
          },
          {
            servicio: 'Impresión e Instalación Gráfica Trovicel (m²)',
            detalle: 'Gráfica corporativa de alto impacto',
            tipo_evento: 'Gráfica & Impresión',
            cantidad: 14,
            costo: 18500,
            ganancia: 12500,
            tipo_doc_costo: 'factura',
          },
        ],
      },
    ],
    recommendedTheme: 'sapphire_executive',
    recommendedOperationMode: 'project',
    targetMarginPct: 38,
    recommendedModules: [
      'mod_unlimited_projects',
      'mod_pdf_quotes',
      'mod_transactions_sii',
      'mod_consolidation_retail',
      'mod_ai_suite',
      'mod_analytics_excel',
    ],
    terminology: {
      projectSingular: 'Montaje',
      projectPlural: 'Ferias y Stands',
      newProjectCta: 'Nuevo Montaje',
      clientLabel: 'Expositor / Marca',
      catalogLabel: 'Inventario Modular',
      analyticsLabel: 'Rentabilidad Stands',
      locationLabel: 'Recinto Ferial / Pabellón',
      retailModeLabel: '¿Consolidar insumos por zona del Stand?',
      retailModeDesc: 'Agrupa gráfica, carpintería, iluminación y mobiliario bajo módulos cotizados al expositor.',
    },
    categories: ['Estructuras & Carpintería', 'Gráfica & Impresión', 'Pantallas & Audio', 'Mobiliario', 'Cuadrilla Montaje', 'Logística Ferial'],
    aiDomainPrompt: 'Rubro: Productora de Ferias y Stands B2B en Chile (Espacio Riesco, Casapiedra, centros feriales). Considera montaje/desmontaje nocturno, impresión gran formato, energía y acreditación.',
    starterCatalog: [
      {
        id: 'fe-1',
        servicio: 'Stand Modular Melamina + Counter Corporativo (18 m²)',
        tipo_evento: 'Estructuras & Carpintería',
        resourceType: 'servicio',
        staffCount: 0,
        staffHours: '3 días feria',
        staffModality: 'factura_subcontrato',
        tipo_doc_costo: 'factura',
        aplicaIvaVenta: true,
        costo: 980000,
        ganancia: 620000,
        detail: 'Piso tarima alfombrada, muros 2.5m, bodega con llave y counter',
      },
      {
        id: 'fe-2',
        servicio: 'Impresión e Instalación Gráfica Trovicel / Vinilo (m²)',
        tipo_evento: 'Gráfica & Impresión',
        resourceType: 'insumo',
        staffCount: 0,
        staffHours: 'Por m²',
        staffModality: 'factura_subcontrato',
        tipo_doc_costo: 'factura',
        aplicaIvaVenta: true,
        costo: 18500,
        ganancia: 12500,
        detail: 'Alta resolución 1440dpi laminado mate anti-reflejo',
      },
      {
        id: 'fe-3',
        servicio: 'Arriendo Pantalla LED Pitch 2.6 (3x2 mts)',
        tipo_evento: 'Pantallas & Audio',
        resourceType: 'servicio',
        staffCount: 1,
        staffHours: '3 días',
        staffModality: 'factura_subcontrato',
        tipo_doc_costo: 'factura',
        aplicaIvaVenta: true,
        costo: 450000,
        ganancia: 280000,
        detail: 'Incluye procesador Novastar, truss soporte y técnico',
      },
      {
        id: 'fe-4',
        servicio: 'Cuadrilla Montaje y Desmontaje Nocturno (4 pax)',
        tipo_evento: 'Cuadrilla Montaje',
        resourceType: 'personal',
        staffCount: 4,
        staffHours: '2 jornadas',
        staffModality: 'honorarios',
        tipo_doc_costo: 'boleta',
        aplicaIvaVenta: true,
        costo: 280000,
        ganancia: 110000,
        detail: 'Incluye EPP, seguro accidentes y herramientas',
      },
    ],
  },

  maestranza_muebles: {
    id: 'maestranza_muebles',
    name: 'Talleres de Maestranza, Carpintería Metálica y Muebles',
    shortName: 'Maestranza & Muebles',
    iconName: 'Wrench',
    tagline: 'Órdenes de trabajo (OT), fabricación a medida, cubicación de planchas y pintura.',
    ownerPainPoint: 'Calcula el margen real por cada Orden de Trabajo sumando fierro/tableros, consumibles y horas de taller.',
    heroHeadlinePrefix: 'Controla cada Orden de Trabajo',
    heroHeadlineAccent: 'desde la plancha y el fierro',
    heroHeadlineSuffix: 'hasta la entrega final.',
    heroValueProp:
      'Deja de cotizar al ojo. Suma planchas de melamina, perfiles de acero, pintura electrostática y horas de soldador/mueblista con IVA Crédito recuperable para ganar dinero en cada OT.',
    quickWinStat: 'Desglose de OT a medida en 2 min',
    capabilityHighlights: [
      {
        title: 'Consolidación de Materias Primas por Mueble',
        description:
          'Agrupa tableros, quincallería, tapacantos y horas de taller dentro de cada mueble o estructura de la OT.',
        metric: 'Costo real exacto por unidad',
      },
      {
        title: 'Control de Anticipos 50% y Saldos Contra Entrega',
        description:
          'Registra el pie del cliente para comprar materiales y monitorea facturas de proveedores contra el presupuesto.',
        metric: 'Caja sana desde el día 1',
      },
      {
        title: 'Asistente IA de Despiece y Consumibles',
        description:
          'Describe el mueble o estructura metálica y la IA sugiere discos, soldadura, pintura al horno y margen objetivo.',
        metric: '0 consumibles olvidados',
      },
    ],
    planSpecialtyFeatures: {
      free: ['Matriz de Taller base (melamina, perfiles acero, hora soldador)'],
      essential: ['Órdenes de Trabajo en PDF formal con control de anticipo 50%'],
      growth: ['Agrupación de materiales por mueble + IA de despiece y consumibles'],
      scale: ['Múltiples jefes de taller y vendedores con Marca Blanca propia'],
    },
    expressTemplates: [
      {
        id: 'ma-tpl-oficina',
        name: 'OT Mobiliario Corporativo (12 Estaciones de Trabajo)',
        clientPlaceholder: 'Empresa / Estudio Arquitectura',
        locationPlaceholder: 'Planta Cliente, Santiago',
        description:
          'Fabricación e instalación de 12 escritorios estructura acero 40x40 con cubierta melamina 18mm y pintura electrostática.',
        hasRetailSales: true,
        items: [
          {
            servicio: 'Tablero Melamina / Terciado 18mm (Plancha)',
            detalle: 'Corte dimensionado y tapacanto PVC 2mm',
            tipo_evento: 'Tableros & Madera',
            cantidad: 14,
            costo: 36000,
            ganancia: 14000,
            tipo_doc_costo: 'factura',
          },
          {
            servicio: 'Perfil Acero Estructural 40x40x2mm (Tira 6m)',
            detalle: 'Acero laminado en frío con primer',
            tipo_evento: 'Acero & Perfiles',
            cantidad: 18,
            costo: 19500,
            ganancia: 8500,
            tipo_doc_costo: 'factura',
          },
          {
            servicio: 'Hora Taller Soldador / Mueblista',
            detalle: 'Soldadura MIG, armado y embalaje',
            tipo_evento: 'Horas Maestro',
            cantidad: 32,
            costo: 14000,
            ganancia: 10000,
            tipo_doc_costo: 'boleta',
          },
        ],
      },
      {
        id: 'ma-tpl-porton',
        name: 'OT Estructura Metálica & Pintura al Horno',
        clientPlaceholder: 'Comunidad / Bodega Industrial',
        locationPlaceholder: 'Comuna Industrial, RM',
        description:
          'Fabricación de portón o reja perimetral en acero estructural con tratamiento anticorrosivo y pintura poliéster.',
        hasRetailSales: false,
        items: [
          {
            servicio: 'Perfil Acero Estructural 40x40x2mm (Tira 6m)',
            detalle: 'Estructura principal y bastidores',
            tipo_evento: 'Acero & Perfiles',
            cantidad: 22,
            costo: 19500,
            ganancia: 8500,
            tipo_doc_costo: 'factura',
          },
          {
            servicio: 'Pintura Electrostática al Horno (m²)',
            detalle: 'Desengrase, fosfatizado y curado poliéster',
            tipo_evento: 'Consumibles Taller',
            cantidad: 28,
            costo: 12000,
            ganancia: 6000,
            tipo_doc_costo: 'factura',
          },
        ],
      },
    ],
    recommendedTheme: 'terracotta_atelier',
    recommendedOperationMode: 'project',
    targetMarginPct: 35,
    recommendedModules: [
      'mod_unlimited_projects',
      'mod_pdf_quotes',
      'mod_transactions_sii',
      'mod_consolidation_retail',
      'mod_ai_suite',
      'mod_analytics_excel',
    ],
    terminology: {
      projectSingular: 'Orden de Trabajo',
      projectPlural: 'Órdenes de Trabajo',
      newProjectCta: 'Nueva OT',
      clientLabel: 'Comitente / Empresa',
      catalogLabel: 'Matriz Taller',
      analyticsLabel: 'Margen por OT',
      locationLabel: 'Planta / Dirección Instalación',
      retailModeLabel: '¿Agrupar materias primas por mueble o estructura fabricada?',
      retailModeDesc: 'Consolida tableros, perfiles, soldadura, quincallería y lacado dentro de cada producto de la OT.',
    },
    categories: ['Acero & Perfiles', 'Tableros & Madera', 'Quincallería', 'Consumibles Taller', 'Horas Maestro', 'Despacho & Instalación'],
    aiDomainPrompt: 'Rubro: Maestranza y Carpintería a Medida en Chile. Desglosa planchas/perfiles, discos de corte, soldadura, pintura electrostática/poliuretano, quincallería y horas de maestro.',
    starterCatalog: [
      {
        id: 'ma-1',
        servicio: 'Tablero Melamina / Terciado Mueblería 18mm (Plancha)',
        tipo_evento: 'Tableros & Madera',
        resourceType: 'insumo',
        staffCount: 0,
        staffHours: 'Unidad',
        staffModality: 'factura_subcontrato',
        tipo_doc_costo: 'factura',
        aplicaIvaVenta: true,
        costo: 36000,
        ganancia: 14000,
        detail: 'Formato 1.52x2.44m con corte dimensionado y tapacanto PVC',
      },
      {
        id: 'ma-2',
        servicio: 'Perfil Acero Estructural 40x40x2mm (Tira 6m)',
        tipo_evento: 'Acero & Perfiles',
        resourceType: 'insumo',
        staffCount: 0,
        staffHours: 'Tira 6m',
        staffModality: 'factura_subcontrato',
        tipo_doc_costo: 'factura',
        aplicaIvaVenta: true,
        costo: 19500,
        ganancia: 8500,
        detail: 'Acero laminado en frío con primer anticorrosivo',
      },
      {
        id: 'ma-3',
        servicio: 'Hora Taller Soldador Calificado / Mueblista',
        tipo_evento: 'Horas Maestro',
        resourceType: 'personal',
        staffCount: 1,
        staffHours: 'Por hora',
        staffModality: 'turno',
        tipo_doc_costo: 'boleta',
        aplicaIvaVenta: true,
        costo: 14000,
        ganancia: 10000,
        detail: 'Incluye uso de maquinaria TIG/MIG y consumibles menores',
      },
      {
        id: 'ma-4',
        servicio: 'Pintura Electrostática al Horno (Servicio por m²)',
        tipo_evento: 'Consumibles Taller',
        resourceType: 'servicio',
        staffCount: 0,
        staffHours: 'Por m²',
        staffModality: 'factura_subcontrato',
        tipo_doc_costo: 'factura',
        aplicaIvaVenta: true,
        costo: 12000,
        ganancia: 6000,
        detail: 'Desengrase, fosfatizado y curado poliéster microtexturado',
      },
    ],
  },

  ingenieria_hvac: {
    id: 'ingenieria_hvac',
    name: 'Ingeniería, Mantenimiento Industrial y Climatización HVAC',
    shortName: 'Ingeniería & HVAC',
    iconName: 'Wind',
    tagline: 'Instalaciones técnicas, mantención preventiva, repuestos y cuadrillas en terreno.',
    ownerPainPoint: 'Ordena cotizaciones técnicas con repuestos, horas-técnico y viáticos sin perder rentabilidad.',
    heroHeadlinePrefix: 'Cotiza proyectos HVAC y mantención',
    heroHeadlineAccent: 'con repuestos, técnicos y viáticos',
    heroHeadlineSuffix: 'cuadrados al peso.',
    heroValueProp:
      'Convierte levantamientos técnicos en propuestas ejecutivas con equipos Inverter, cañería de cobre, cuadrillas certificadas y traslados. Controla el IVA Crédito de importadores y el margen por orden técnica.',
    quickWinStat: 'Orden Técnica + PDF en 2 minutos',
    capabilityHighlights: [
      {
        title: 'Equipos + Repuestos + Cuadrilla en Terreno',
        description:
          'Consolida unidades BTU, gas refrigerante, filtros y jornadas técnicas sin perder rentabilidad en salidas a región.',
        metric: '+7,5% margen en instalaciones',
      },
      {
        title: 'Contratos de Mantención Preventiva',
        description:
          'Replica órdenes técnicas mensuales por edificio o planta y haz seguimiento de pagos contra factura 30 días.',
        metric: 'Facturación recurrente ordenada',
      },
      {
        title: 'OCR de Listas de Repuestos & Proveedores',
        description:
          'Carga la cotización de tu proveedor de climatización y la IA arma el borrador comercial con tu margen.',
        metric: 'Ahorro 4 hrs/sem en cotizaciones',
      },
    ],
    planSpecialtyFeatures: {
      free: ['Tarifario Técnico base (equipos BTU, mantención y cuadrillas)'],
      essential: ['Órdenes Técnicas PDF para edificios y control de pagos a 30 días'],
      growth: ['OCR de listas de repuestos + IA para viáticos y consumibles'],
      scale: ['Múltiples supervisores en terreno con Marca Blanca corporativa'],
    },
    expressTemplates: [
      {
        id: 'hv-tpl-multisplit',
        name: 'Instalación Climatización Sala Servidores / Oficinas',
        clientPlaceholder: 'Empresa / Clínica / Edificio',
        locationPlaceholder: 'Edificio Corporativo, Santiago',
        description:
          'Suministro e instalación de 3 equipos Split Inverter 18.000 BTU con kit completo, pruebas de vacío y puesta en marcha.',
        hasRetailSales: false,
        items: [
          {
            servicio: 'Equipo Split Inverter 18.000 BTU + Kit Instalación',
            detalle: 'Incluye 4m cañería cobre, aislación y soportes',
            tipo_evento: 'Equipos & Maquinaria',
            cantidad: 3,
            costo: 460000,
            ganancia: 170000,
            tipo_doc_costo: 'factura',
          },
          {
            servicio: 'Jornada Cuadrilla Técnica Especializada (2 Técnicos)',
            detalle: 'Certificación altura y EPP completo',
            tipo_evento: 'Técnicos Terreno',
            cantidad: 2,
            costo: 115000,
            ganancia: 65000,
            tipo_doc_costo: 'boleta',
          },
        ],
      },
      {
        id: 'hv-tpl-mantencion',
        name: 'Plan Mantención Preventiva Trimestral (18 Equipos)',
        clientPlaceholder: 'Administración Edificio / Planta',
        locationPlaceholder: 'Sucursal Corporativa, RM',
        description:
          'Mantención preventiva integral de 18 equipos Split/Cassette con informe técnico, medición de amperaje y presiones.',
        hasRetailSales: false,
        items: [
          {
            servicio: 'Mantención Preventiva Split / Cassette (Por Equipo)',
            detalle: 'Limpieza serpentín, desagüe y medición de gas',
            tipo_evento: 'Equipos & Maquinaria',
            cantidad: 18,
            costo: 28000,
            ganancia: 24000,
            tipo_doc_costo: 'factura',
          },
          {
            servicio: 'Traslado Camioneta Técnica + Viático',
            detalle: 'Desplazamiento cuadrilla y herramientas',
            tipo_evento: 'Viáticos & Traslado',
            cantidad: 2,
            costo: 55000,
            ganancia: 20000,
            tipo_doc_costo: 'factura',
          },
        ],
      },
    ],
    recommendedTheme: 'emerald_sovereign',
    recommendedOperationMode: 'project',
    targetMarginPct: 36,
    recommendedModules: [
      'mod_unlimited_projects',
      'mod_pdf_quotes',
      'mod_transactions_sii',
      'mod_ai_suite',
      'mod_analytics_excel',
    ],
    terminology: {
      projectSingular: 'Orden Técnica',
      projectPlural: 'Proyectos Técnicos',
      newProjectCta: 'Nueva Orden Técnica',
      clientLabel: 'Planta / Edificio',
      catalogLabel: 'Tarifario Técnico',
      analyticsLabel: 'Rentabilidad Técnica',
      locationLabel: 'Planta / Sucursal',
      retailModeLabel: '¿Consolidar repuestos e insumos por equipo intervenido?',
      retailModeDesc: 'Agrupa refrigerante, cañerías, filtros y mano de obra bajo cada equipo o zona climatizada.',
    },
    categories: ['Equipos & Maquinaria', 'Repuestos & Insumos', 'Técnicos Terreno', 'Certificaciones', 'Viáticos & Traslado'],
    aiDomainPrompt: 'Rubro: Ingeniería, Mantenimiento Industrial y Climatización HVAC en Chile. Considera equipos BTU, cañería cobre, refrigerante, vacío/presurización, técnicos certificados y viáticos.',
    starterCatalog: [
      {
        id: 'hv-1',
        servicio: 'Mantención Preventiva Split / Cassette (Por Equipo)',
        tipo_evento: 'Equipos & Maquinaria',
        resourceType: 'servicio',
        staffCount: 1,
        staffHours: '2 hrs',
        staffModality: 'turno',
        tipo_doc_costo: 'factura',
        aplicaIvaVenta: true,
        costo: 28000,
        ganancia: 24000,
        detail: 'Limpieza serpentín, desagüe, medición amperaje y presión gas',
      },
      {
        id: 'hv-2',
        servicio: 'Equipo Split Inverter 18.000 BTU + Kit Instalación',
        tipo_evento: 'Equipos & Maquinaria',
        resourceType: 'insumo',
        staffCount: 0,
        staffHours: 'Unidad',
        staffModality: 'factura_subcontrato',
        tipo_doc_costo: 'factura',
        aplicaIvaVenta: true,
        costo: 460000,
        ganancia: 170000,
        detail: 'Incluye 4m cañería cobre, aislación y soportes muro',
      },
      {
        id: 'hv-3',
        servicio: 'Jornada Cuadrilla Técnica Especializada (2 Técnicos)',
        tipo_evento: 'Técnicos Terreno',
        resourceType: 'personal',
        staffCount: 2,
        staffHours: '8 hrs',
        staffModality: 'turno',
        tipo_doc_costo: 'boleta',
        aplicaIvaVenta: true,
        costo: 115000,
        ganancia: 65000,
        detail: 'Técnicos con certificación trabajo en altura y EPP completo',
      },
      {
        id: 'hv-4',
        servicio: 'Traslado Camioneta Técnica + Viático Región',
        tipo_evento: 'Viáticos & Traslado',
        resourceType: 'logistica',
        staffCount: 0,
        staffHours: 'Por salida',
        staffModality: 'factura_subcontrato',
        tipo_doc_costo: 'factura',
        aplicaIvaVenta: true,
        costo: 55000,
        ganancia: 20000,
        detail: 'Combustible, peajes y colación de cuadrilla en terreno',
      },
    ],
  },

  consultoria_juridico: {
    id: 'consultoria_juridico',
    name: 'Consultoras (TI, RR.HH., Finanzas) y Estudios Jurídicos',
    shortName: 'Consultoría & Legal',
    iconName: 'Scale',
    tagline: 'Proyectos por horas, retainers corporativos, peritajes e implementaciones.',
    ownerPainPoint: 'Mide si tus proyectos de tarifa fija realmente dejan margen según las horas senior invertidas.',
    heroHeadlinePrefix: 'Mide la rentabilidad real de',
    heroHeadlineAccent: 'cada hora senior y retainer',
    heroHeadlineSuffix: 'de tu firma.',
    heroValueProp:
      'Cotiza implementaciones, auditorías y defensas corporativas con horas de Socios y Analistas, separa gastos notariales exentos de IVA y detecta qué clientes consumen más tiempo del presupuestado.',
    quickWinStat: 'Propuesta de Fee Corporativo en 2 min',
    capabilityHighlights: [
      {
        title: 'Control de Horas Senior vs. Tarifa Fija',
        description:
          'Compara las horas de consultores y abogados realmente pagadas contra el fee acordado con el cliente.',
        metric: '+14% margen en proyectos fijos',
      },
      {
        title: 'Separación de Gastos Reembolsables / Notaría',
        description:
          'Distingue claramente honorarios afectos o exentos de tasas notariales y Conservador de Bienes Raíces.',
        metric: 'Claridad tributaria SII',
      },
      {
        title: 'Propuestas Ejecutivas para Directorios',
        description:
          'Emite documentos PDF sobrios e institucionales listos para aprobación de gerencia general o fiscalía.',
        metric: 'Imagen de firma de primer nivel',
      },
    ],
    planSpecialtyFeatures: {
      free: ['Tarifario Hora (Fee) para Socios, Analistas y gastos notariales'],
      essential: ['Propuestas PDF sobrias para directorios y control de hitos de pago'],
      growth: ['Analítica de rentabilidad por cliente y detección IA de desviación de horas'],
      scale: ['Socios y consultores ilimitados con Marca Blanca de estudio/firma'],
    },
    expressTemplates: [
      {
        id: 'cs-tpl-auditoria',
        name: 'Auditoría Corporativa & Roadmap 90 Días',
        clientPlaceholder: 'Directorio / Gerencia General',
        locationPlaceholder: 'Las Condes / Modalidad Híbrida',
        description:
          'Diagnóstico integral financiero/legal con entrevistas clave, revisión contractual y presentación ejecutiva al directorio.',
        hasRetailSales: false,
        items: [
          {
            servicio: 'Hora Consultor Senior / Abogado Socio',
            detalle: 'Dirección estratégica y revisión contractual',
            tipo_evento: 'Consultoría Senior',
            cantidad: 18,
            costo: 45000,
            ganancia: 55000,
            tipo_doc_costo: 'boleta',
          },
          {
            servicio: 'Hora Analista / Especialista Implementación',
            detalle: 'Levantamiento operativo y documentación',
            tipo_evento: 'Analistas & Desarrollo',
            cantidad: 35,
            costo: 22000,
            ganancia: 26000,
            tipo_doc_costo: 'boleta',
          },
        ],
      },
      {
        id: 'cs-tpl-societario',
        name: 'Reestructuración Societaria & Compliance',
        clientPlaceholder: 'Holding Inversiones SpA',
        locationPlaceholder: 'Oficina Central, Santiago',
        description:
          'Redacción de estatutos, pacto de accionistas, inscripciones en CBR y protocolo de cumplimiento.',
        hasRetailSales: false,
        items: [
          {
            servicio: 'Diagnóstico Integral & Roadmap Ejecutivo (Pack 20 hrs)',
            detalle: 'Informe directorio + plan implementación',
            tipo_evento: 'Auditoría',
            cantidad: 1,
            costo: 520000,
            ganancia: 480000,
            tipo_doc_costo: 'factura',
          },
          {
            servicio: 'Gestión Notarial / Conservador / Certificados SII',
            detalle: 'Derechos notariales y protocolización',
            tipo_evento: 'Gastos Notariales / Tasas',
            cantidad: 2,
            costo: 65000,
            ganancia: 15000,
            tipo_doc_costo: 'boleta',
          },
        ],
      },
    ],
    recommendedTheme: 'sapphire_executive',
    recommendedOperationMode: 'retainer_hours',
    targetMarginPct: 48,
    recommendedModules: [
      'mod_unlimited_projects',
      'mod_pdf_quotes',
      'mod_transactions_sii',
      'mod_ai_suite',
      'mod_analytics_excel',
    ],
    terminology: {
      projectSingular: 'Proyecto / Caso',
      projectPlural: 'Proyectos y Casos',
      newProjectCta: 'Nuevo Proyecto',
      clientLabel: 'Cliente Corporativo',
      catalogLabel: 'Tarifas Hora (Fee)',
      analyticsLabel: 'Rentabilidad Fee',
      locationLabel: 'Modalidad (Remoto / Oficina)',
      retailModeLabel: '¿Agrupar entregables o fases del proyecto?',
      retailModeDesc: 'Consolida horas de consultores senior, analistas y gastos notariales/licencias por etapa.',
    },
    categories: ['Consultoría Senior', 'Analistas & Desarrollo', 'Gastos Notariales / Tasas', 'Licencias Software', 'Auditoría'],
    aiDomainPrompt: 'Rubro: Consultora Empresarial / Estudio Jurídico en Chile. Calcula horas de Socio/Senior, Analista Junior, boletas de honorarios, gastos notariales/CBR y licencias.',
    starterCatalog: [
      {
        id: 'cs-1',
        servicio: 'Hora Consultor Senior / Abogado Socio',
        tipo_evento: 'Consultoría Senior',
        resourceType: 'personal',
        staffCount: 1,
        staffHours: '1 hora',
        staffModality: 'honorarios',
        tipo_doc_costo: 'boleta',
        aplicaIvaVenta: true,
        costo: 45000,
        ganancia: 55000,
        detail: 'Dirección estratégica, revisión contractual o arquitectura',
      },
      {
        id: 'cs-2',
        servicio: 'Hora Analista / Especialista Implementación',
        tipo_evento: 'Analistas & Desarrollo',
        resourceType: 'personal',
        staffCount: 1,
        staffHours: '1 hora',
        staffModality: 'honorarios',
        tipo_doc_costo: 'boleta',
        aplicaIvaVenta: true,
        costo: 22000,
        ganancia: 26000,
        detail: 'Ejecución operativa, levantamiento y documentación',
      },
      {
        id: 'cs-3',
        servicio: 'Gestión Notarial / Conservador / Certificados SII',
        tipo_evento: 'Gastos Notariales / Tasas',
        resourceType: 'logistica',
        staffCount: 0,
        staffHours: 'Por trámite',
        staffModality: 'factura_subcontrato',
        tipo_doc_costo: 'boleta',
        aplicaIvaVenta: false,
        costo: 65000,
        ganancia: 15000,
        detail: 'Derechos notariales, protocolización y copias autorizadas',
      },
      {
        id: 'cs-4',
        servicio: 'Diagnóstico Integral & Roadmap Ejecutivo (Pack 20 hrs)',
        tipo_evento: 'Auditoría',
        resourceType: 'servicio',
        staffCount: 2,
        staffHours: '20 hrs',
        staffModality: 'factura_subcontrato',
        tipo_doc_costo: 'factura',
        aplicaIvaVenta: true,
        costo: 520000,
        ganancia: 480000,
        detail: 'Informe directorio + plan de implementación 90 días',
      },
    ],
  },

  turismo_mice: {
    id: 'turismo_mice',
    name: 'Turismo Corporativo, MICE y Agencias a Medida',
    shortName: 'Turismo & MICE',
    iconName: 'Plane',
    tagline: 'Viajes de incentivo, congresos, traslados, hotelería y experiencias grupales.',
    ownerPainPoint: 'Consolida hoteles, transfers, guías y excursiones por pasajero sin errores de margen.',
    heroHeadlinePrefix: 'Arma programas MICE y grupos',
    heroHeadlineAccent: 'prorrateando por pasajero',
    heroHeadlineSuffix: 'en segundos.',
    heroValueProp:
      'Cotiza hoteles, vans ejecutivas, guías bilingües y tours privados en un solo flujo. Calcula el valor exacto por PAX sin perder margen cuando cambia el tamaño del grupo.',
    quickWinStat: 'Cotización Programa por PAX en 3 clics',
    capabilityHighlights: [
      {
        title: 'Prorrateo Automático por Pasajero (PAX)',
        description:
          'Divide buses privados, guías y salones entre la cantidad exacta de asistentes para fijar la tarifa por persona.',
        metric: '0 errores de cálculo grupal',
      },
      {
        title: 'Control de Operadores, Hoteles y Boletas',
        description:
          'Distingue facturas de hoteles/viñas de boletas de guías bilingües y monitorea anticipos del grupo.',
        metric: 'Conciliación de viaje limpia',
      },
      {
        title: 'Itinerario Comercial PDF Listo para Enviar',
        description:
          'Entrega propuestas ejecutivas a comités de incentivo o agencias internacionales en minutos.',
        metric: 'Cierre comercial más ágil',
      },
    ],
    planSpecialtyFeatures: {
      free: ['Tarifario Operadores base (vans, guías bilingües, hotelería, viñas)'],
      essential: ['Cotizaciones PDF ejecutivas por programa y control de prepagos'],
      growth: ['Prorrateo por PAX + optimizador IA de tarifas de operadores'],
      scale: ['Equipo de ejecutivos MICE con Marca Blanca de agencia'],
    },
    expressTemplates: [
      {
        id: 'tu-tpl-incentivo',
        name: 'Viaje de Incentivo Valle de Colchagua (24 PAX · 2 Noches)',
        clientPlaceholder: 'Empresa Multinacional',
        locationPlaceholder: 'Valle de Colchagua / Santa Cruz',
        description:
          'Programa corporativo 3D/2N con hotelería 4★, transfers privados, tour viña reserva y guía bilingüe.',
        hasRetailSales: true,
        items: [
          {
            servicio: 'Alojamiento Hotel 4★ Habitación Single c/ Desayuno',
            detalle: '2 noches tarifa convenio corporativo',
            tipo_evento: 'Hotelería',
            cantidad: 48,
            costo: 98000,
            ganancia: 28000,
            tipo_doc_costo: 'factura',
          },
          {
            servicio: 'Tour Corporativo Viña + Degustación Reserva (Por PAX)',
            detalle: 'Recorrido privado + cata 4 etiquetas',
            tipo_evento: 'Experiencias & Tours',
            cantidad: 24,
            costo: 32000,
            ganancia: 14000,
            tipo_doc_costo: 'factura',
          },
          {
            servicio: 'Transfer Privado Van Ejecutiva (Ida y Vuelta)',
            detalle: '2 vans Mercedes Sprinter con conductor',
            tipo_evento: 'Traslados & Vans',
            cantidad: 4,
            costo: 65000,
            ganancia: 25000,
            tipo_doc_costo: 'factura',
          },
        ],
      },
      {
        id: 'tu-tpl-fullday',
        name: 'Full Day Directorio & Viña Casablanca (12 PAX)',
        clientPlaceholder: 'Delegación Extranjera',
        locationPlaceholder: 'Valle de Casablanca, V Región',
        description:
          'Jornada ejecutiva con transfer aeropuerto/hotel, guía bilingüe Sernatur y almuerzo maridaje.',
        hasRetailSales: false,
        items: [
          {
            servicio: 'Guía Turístico Bilingüe Certificado (Full Day)',
            detalle: 'Inglés/Español credencial Sernatur',
            tipo_evento: 'Guías Bilingües',
            cantidad: 1,
            costo: 110000,
            ganancia: 45000,
            tipo_doc_costo: 'boleta',
          },
          {
            servicio: 'Tour Corporativo Viña + Degustación Reserva (Por PAX)',
            detalle: 'Degustación privada y tabla de quesos',
            tipo_evento: 'Experiencias & Tours',
            cantidad: 12,
            costo: 32000,
            ganancia: 14000,
            tipo_doc_costo: 'factura',
          },
        ],
      },
    ],
    recommendedTheme: 'obsidian_gold',
    recommendedOperationMode: 'retail_mixed',
    targetMarginPct: 28,
    recommendedModules: [
      'mod_unlimited_projects',
      'mod_pdf_quotes',
      'mod_transactions_sii',
      'mod_consolidation_retail',
      'mod_ai_suite',
      'mod_analytics_excel',
    ],
    terminology: {
      projectSingular: 'Programa',
      projectPlural: 'Programas e Itinerarios',
      newProjectCta: 'Nuevo Programa',
      clientLabel: 'Grupo / Empresa',
      catalogLabel: 'Tarifario Operadores',
      analyticsLabel: 'Margen por Grupo',
      locationLabel: 'Destino / Ruta',
      retailModeLabel: '¿Prorratear costos grupales por Pasajero (PAX)?',
      retailModeDesc: 'Divide buses privados, guías y salas entre la cantidad de pasajeros para obtener el valor exacto por persona.',
    },
    categories: ['Hotelería', 'Traslados & Vans', 'Experiencias & Tours', 'Guías Bilingües', 'Salones MICE', 'Seguros'],
    aiDomainPrompt: 'Rubro: Agencia de Turismo Corporativo y MICE en Chile. Desglosa noches de hotel, transfers privados, guías bilingües, tickets de parques/viñas y prorrateo por PAX.',
    starterCatalog: [
      {
        id: 'tu-1',
        servicio: 'Transfer Privado Van Ejecutiva (Aeropuerto / Hotel)',
        tipo_evento: 'Traslados & Vans',
        resourceType: 'logistica',
        staffCount: 1,
        staffHours: 'Por tramo',
        staffModality: 'factura_subcontrato',
        tipo_doc_costo: 'factura',
        aplicaIvaVenta: true,
        costo: 65000,
        ganancia: 25000,
        detail: 'Mercedes Sprinter hasta 12 pax con conductor profesional',
      },
      {
        id: 'tu-2',
        servicio: 'Guía Turístico Bilingüe Certificado (Jornada Full Day)',
        tipo_evento: 'Guías Bilingües',
        resourceType: 'personal',
        staffCount: 1,
        staffHours: '9 hrs',
        staffModality: 'honorarios',
        tipo_doc_costo: 'boleta',
        aplicaIvaVenta: true,
        costo: 110000,
        ganancia: 45000,
        detail: 'Inglés/Portugués/Español con credencial Sernatur',
      },
      {
        id: 'tu-3',
        servicio: 'Tour Corporativo Viña + Degustación Reserva (Por PAX)',
        tipo_evento: 'Experiencias & Tours',
        resourceType: 'servicio',
        staffCount: 0,
        staffHours: '3 hrs',
        staffModality: 'factura_subcontrato',
        tipo_doc_costo: 'factura',
        aplicaIvaVenta: true,
        costo: 32000,
        ganancia: 14000,
        detail: 'Recorrido privado bodega + cata 4 etiquetas + tabla quesos',
      },
      {
        id: 'tu-4',
        servicio: 'Alojamiento Hotel 4★ Habitación Single c/ Desayuno',
        tipo_evento: 'Hotelería',
        resourceType: 'insumo',
        staffCount: 0,
        staffHours: 'Por noche',
        staffModality: 'factura_subcontrato',
        tipo_doc_costo: 'factura',
        aplicaIvaVenta: true,
        costo: 98000,
        ganancia: 28000,
        detail: 'Tarifa convenio corporativo con desayuno buffet y Wi-Fi',
      },
    ],
  },
};

export const INDUSTRY_LIST: IndustryBlueprint[] = Object.values(INDUSTRY_BLUEPRINTS);

export function getIndustryBlueprint(industryType?: string | null): IndustryBlueprint {
  if (industryType && industryType in INDUSTRY_BLUEPRINTS) {
    return INDUSTRY_BLUEPRINTS[industryType as IndustryType];
  }
  return INDUSTRY_BLUEPRINTS.eventos_banqueteria;
}
