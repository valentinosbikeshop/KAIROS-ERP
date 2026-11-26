import type { IndustryType } from '@/types/database';

export interface IndustryLandingCopy {
  beforeExcel: string[];
  withFigura: string[];
  taxRuleSummary: string;
  roiTicketClp: number;
  roiLeakPct: number;
  roiCaseLabel: string;
  reliefTimeSaved: string;
}

export const INDUSTRY_LANDING_COPY: Record<IndustryType, IndustryLandingCopy> = {
  eventos_banqueteria: {
    beforeExcel: [
      'Olvida fletes nocturnos, hielo o horas extra de garzones al cotizar apurado.',
      'Calcula el 19% de IVA Crédito multiplicando el bruto en vez de extraerlo (/ 1,19).',
      'Desconoce el impacto real de retenciones del 15,25% en boletas de DJs y staff.',
    ],
    withFigura: [
      'Consolida barra, gastronomía y montaje padre/hijo en propuestas PDF por PAX en < 2 min.',
      'Proyecta IVA Débito, IVA Crédito y F29 en vivo con política de retención configurable.',
      'Compara abonos recibidos frente a gastos rendidos para cerrar cada evento con utilidad real.',
    ],
    taxRuleSummary:
      'Facturas de banquetería y audio recuperan 19% IVA Crédito (/ 1,19); boletas de DJs y garzones aplican retención Ley 21.133 (15,25% en 2026) directo en F29.',
    roiTicketClp: 2500000,
    roiLeakPct: 4.5,
    roiCaseLabel: 'Evento corporativo 100 PAX',
    reliefTimeSaved: '5 hrs/semana menos en planillas',
  },
  marketing_audiovisual: {
    beforeExcel: [
      'Mezcla pauta digital de terceros con honorarios creativos, inflando ingresos e IVA.',
      'Regala horas de edición, colorización o jornadas extra de cámara por cotizar a ojo.',
      'Digita línea por línea las cotizaciones PDF de casas de rental y talento.',
    ],
    withFigura: [
      'Prorratea jornadas de rodaje entre cápsulas y separa gastos reembolsables pass-through.',
      'Extrae presupuestos de rental con IA OCR y aplica su margen objetivo automáticamente.',
      'Mide rentabilidad neta por campaña y retainer sin contaminar el margen operacional.',
    ],
    taxRuleSummary:
      'Separa pauta digital reembolsable (Art. 16 DL 825) sin inflar IVA Débito, y calcula retención 15,25% en boletas de crew y realizadores.',
    roiTicketClp: 2800000,
    roiLeakPct: 5.0,
    roiCaseLabel: 'Campaña + Rodaje 4K',
    reliefTimeSaved: '6 hrs/semana menos cotizando',
  },
  construccion_arquitectura: {
    beforeExcel: [
      'Las compras menores de ferretería y tolvas de escombros quedan fuera del presupuesto.',
      'No cruza Estados de Pago contra facturas reales hasta que la obra ya cerró.',
      'Confunde markup sobre costo con margen real sobre venta neta.',
    ],
    withFigura: [
      'Agrupa materiales y cuadrilla bajo partidas constructivas claras por m² (APU padre/hijo).',
      'Controla cada Estado de Pago frente a facturas de proveedores y tratos en faena.',
      'Calcula IVA Crédito real en materiales y retención 15,25% en maestros a trato.',
    ],
    taxRuleSummary:
      'Cada factura de ferretería descuenta su 19% IVA Crédito exacto (/ 1,19) y separa subcontratos afectos de cuadrillas con retención 15,25%.',
    roiTicketClp: 6500000,
    roiLeakPct: 3.5,
    roiCaseLabel: 'Habilitación oficina 85 m²',
    reliefTimeSaved: '6 hrs/semana menos en cubicación',
  },
  catering_foodservice: {
    beforeExcel: [
      'Las alzas semanales de proteínas y abarrotes erosionan el margen sin alertar a tiempo.',
      'Omite mermas del 5% y packaging biodegradable en el cálculo por ración.',
      'Pierde trazabilidad entre facturas de distribuidoras y colaciones entregadas.',
    ],
    withFigura: [
      'Arma escandallos padre/hijo por ración con merma, envases y furgón refrigerado.',
      'Lee facturas de distribuidoras con IA OCR para recalcular costos al instante.',
      'Monitorea contratos mensuales de casinos corporativos y flujo de caja quincenal.',
    ],
    taxRuleSummary:
      'Recupera 19% IVA Crédito en insumos afectos y distingue compras agrícolas exentas sin sobreestimar su saldo favorable en el F29.',
    roiTicketClp: 4200000,
    roiLeakPct: 4.0,
    roiCaseLabel: 'Contrato mensual 600 raciones',
    reliefTimeSaved: '4 hrs/semana en escandallos',
  },
  ferias_stands_b2b: {
    beforeExcel: [
      'Montajes nocturnos en recintos feriales y m² extra de gráfica absorben la utilidad.',
      'Envía cotizaciones estáticas sin seguimiento ni aceptación formal del expositor.',
      'Cierra la feria sin saber cuánto dejó realmente tras fletes y desmontaje.',
    ],
    withFigura: [
      'Consolida carpintería, Trovicel, pantallas LED y montaje por zona del stand.',
      'Entrega propuestas PDF B2B + Portal web /q con aceptación por RUT y datos bancarios.',
      'Registra anticipos del 50% y gastos nocturnos en tiempo real contra el presupuesto.',
    ],
    taxRuleSummary:
      'Cuadra facturas de impresión y arriendo LED con boletas de cuadrillas de montaje (15,25%) para conocer la utilidad ex-IVA por stand.',
    roiTicketClp: 3800000,
    roiLeakPct: 4.5,
    roiCaseLabel: 'Stand modular 18 m² + LED',
    reliefTimeSaved: '5 hrs/semana en presupuestos B2B',
  },
  maestranza_muebles: {
    beforeExcel: [
      'Cubica planchas, perfiles de acero y pintura al ojo, olvidando discos y soldadura.',
      'Financia materiales del cliente con caja propia por falta de control de anticipos.',
      'No distingue cuánto ganó cada Orden de Trabajo al final del mes.',
    ],
    withFigura: [
      'Despieza tableros, acero 40x40, quincallería y horas de maestro dentro de cada OT.',
      'Controla pie del 50% para compra de materiales y saldo contra entrega o factura.',
      'Asistente IA sugiere consumibles de taller y protege el margen mínimo antes de aprobar.',
    ],
    taxRuleSummary:
      'Extrae el 19% IVA Crédito real de acero, tableros y pintura electrostática, y ordena las horas de taller sin mezclar IVA en su ganancia.',
    roiTicketClp: 3200000,
    roiLeakPct: 4.5,
    roiCaseLabel: 'OT mobiliario / estructura metálica',
    reliefTimeSaved: '4,5 hrs/semana en cubicaciones OT',
  },
  ingenieria_hvac: {
    beforeExcel: [
      'Mezcla equipos Inverter, cañería de cobre y viáticos a región sin margen claro por ítem.',
      'Pierde control de contratos de mantención preventiva facturados a 30 días OC/HES.',
      'Demora horas pasando listas de precios de importadores a cotizaciones comerciales.',
    ],
    withFigura: [
      'Consolida equipos BTU, repuestos y cuadrilla certificada en órdenes técnicas limpias.',
      'Sube listas de proveedores con IA OCR para cotizar instalaciones en menos de 2 minutos.',
      'Cruza facturas a 30 días, retenciones y proyección F29 por sucursal o planta.',
    ],
    taxRuleSummary:
      'Mantiene trazabilidad exacta entre facturas de equipos importados (19% IVA Crédito) y facturación de mantenciones a 30 días.',
    roiTicketClp: 3600000,
    roiLeakPct: 4.0,
    roiCaseLabel: 'Instalación + mantención HVAC',
    reliefTimeSaved: '4 hrs/semana en órdenes técnicas',
  },
  consultoria_juridico: {
    beforeExcel: [
      'Proyectos de tarifa fija consumen más horas de Socio y Analista de lo cotizado.',
      'Cobra 19% IVA por error sobre derechos notariales o Conservador de Bienes Raíces.',
      'Carece de un flujo adaptado a Sociedades de Profesionales exentas (Ley 21.420).',
    ],
    withFigura: [
      'Mide la rentabilidad real de cada hora senior frente al retainer o fee acordado.',
      'Separa partidas exentas de IVA (notaría/CBR) y soporta régimen exento Art. 12 E N°8.',
      'Emite propuestas PDF sobrias para directorios con aprobación digital por RUT.',
    ],
    taxRuleSummary:
      'Soporta empresas afectas a 19% IVA y Sociedades de Profesionales exentas (Art. 12 E N°8), además de gastos notariales/CBR sin IVA Débito.',
    roiTicketClp: 3500000,
    roiLeakPct: 5.0,
    roiCaseLabel: 'Auditoría / Asesoría corporativa',
    reliefTimeSaved: '5 hrs/semana en control de fees',
  },
  turismo_mice: {
    beforeExcel: [
      'Prorratear buses, hoteles y guías por pasajero en Excel falla cuando cambia el grupo.',
      'Opera con cotizaciones en USD/UF sin trazabilidad frente a gastos en pesos chilenos.',
      'Mezcla facturas de viñas/hoteles con boletas de guías bilingües en el cálculo de caja.',
    ],
    withFigura: [
      'Prorratea costos grupales automáticamente por PAX y consolida itinerarios padre/hijo.',
      'Genera propuestas en CLP, USD o UF con portal de aprobación grupal y datos bancarios.',
      'Soporta régimen de exportación turística (Art. 12 E N°17) y retención 15,25% a guías.',
    ],
    taxRuleSummary:
      'Contempla exportación de servicios turísticos (Art. 12 E N°17) o venta afecta nacional, más retención 15,25% para guías bilingües.',
    roiTicketClp: 4800000,
    roiLeakPct: 3.5,
    roiCaseLabel: 'Programa incentivo 24 PAX',
    reliefTimeSaved: '5 hrs/semana en tarifarios PAX',
  },
};

export interface BenchmarkRow {
  competitor: string;
  focus: string;
  marketListPrice: string;
  monthlyClpWithIva: string;
  limitationVsFigura: string;
  isFigura?: boolean;
}

export const CHILE_BENCHMARK_ROWS: BenchmarkRow[] = [
  {
    competitor: 'Chipax',
    focus: 'Flujo de Caja & Conciliación',
    marketListPrice: '2,4 – 4,8 UF + IVA',
    monthlyClpWithIva: '$118.253 – $236.505',
    limitationVsFigura:
      'Sin cotizador PDF por rubro, sin escandallos padre/hijo ni portal /q; plan entrada limitado a 1 usuario.',
  },
  {
    competitor: 'Defontana',
    focus: 'Contabilidad & ERP PYME',
    marketListPrice: '2,5 – 3,5 UF + IVA',
    monthlyClpWithIva: '$123.180 – $172.452',
    limitationVsFigura:
      'ERP contable posterior: no cotiza por PAX/m²/ración, sin IA OCR ni portal cliente; cobra implementación y usuarios extra.',
  },
  {
    competitor: 'Nubox',
    focus: 'Contabilidad & Facturación',
    marketListPrice: '1,75 – 3,02 UF + IVA',
    monthlyClpWithIva: '$86.226 – $213.339',
    limitationVsFigura:
      'Módulos separados; sin costeo de proyectos, mermas, retenciones de honorarios ni presupuestos comerciales.',
  },
  {
    competitor: 'Siigo Kame',
    focus: 'ERP Contable PYME',
    marketListPrice: '2,0 – 4,0 UF + IVA',
    monthlyClpWithIva: '$98.544 – $197.088',
    limitationVsFigura:
      'Orientado a contadores post-venta; no calcula margen por obra/OT/evento ni prorratea insumos antes de cotizar.',
  },
  {
    competitor: 'Clay',
    focus: 'Finanzas & Contabilidad IA',
    marketListPrice: '3,0 – 6,0 UF + IVA',
    monthlyClpWithIva: '$147.816 – $295.632',
    limitationVsFigura:
      'Ticket de entrada alto y enfoque retrospectivo; no genera presupuestos comerciales ni controla partidas de proyecto.',
  },
  {
    competitor: 'FIGURA ERP',
    focus: 'Cotización IA, Margen & F29 Multi-Rubro',
    marketListPrice: 'CLP fijo IVA incl. (~0,85 – 2,90 UF)',
    monthlyClpWithIva: '$34.990 / $69.990 / $119.990',
    limitationVsFigura:
      '41%–65% menor desembolso mensual, sin reajuste UF ni cobros sorpresa: incluye 9 rubros, IA OCR, F29 en vivo y Portal /q.',
    isFigura: true,
  },
];

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export const LANDING_FAQS: FaqItem[] = [
  {
    id: 'excel-migration',
    question: '¿Cómo paso mis cotizaciones y listas de costos desde Excel a FIGURA sin perder días cargando datos?',
    answer:
      'No parte desde cero. Cada uno de los 9 rubros incluye un catálogo maestro inicial calibrado en CLP y plantillas Express listas en 1 clic. Además, desde Operación Esencial puede subir sus planillas Excel, cotizaciones PDF o fotos de facturas para que la Suite IA OCR extraiga automáticamente ítems, costos netos e IVA Crédito.',
  },
  {
    id: 'sii-f29-accuracy',
    question: '¿El cálculo de IVA F29, partidas exentas y Boletas de Honorarios (15,25%) cumple la normativa SII 2026?',
    answer:
      'Sí. El motor financiero extrae el 19% de IVA Crédito desde montos brutos de factura (/ 1,19) sin inflar créditos, respeta partidas exentas de venta, regímenes de Sociedad de Profesionales (Art. 12 E N°8) o Exportación Turística (Art. 12 E N°17), excluye gastos reembolsables (Art. 16 DL 825) y aplica la retención vigente 2026 de 15,25% (Ley 21.133) con política configurable (prestador, empresa o 50/50).',
  },
  {
    id: 'demo-no-card',
    question: '¿Puedo probar la plataforma con datos de mi rubro sin ingresar tarjeta ni crear cuenta?',
    answer:
      'Sí. Al hacer clic en "Probar Demo Interactiva" ingresa en segundos a un entorno aislado precargado con proyectos, catálogo, Portal /q y proyecciones reales de su rubro seleccionado. No solicitamos tarjeta de crédito ni registro previo para evaluar el sistema.',
  },
  {
    id: 'pricing-clp-khipu',
    question: '¿Los precios están en UF + IVA o en pesos chilenos fijos?',
    answer:
      'Todos los planes de FIGURA se cobran en CLP fijos con IVA incluido mediante Khipu, a diferencia de los ERPs tradicionales en UF + IVA. Así evita variaciones mensuales por el valor de la UF y conoce de antemano su desembolso exacto.',
  },
  {
    id: 'soft-lock-data',
    question: '¿Qué ocurre con mis proyectos, clientes e historial si decido pausar o cambiar de plan?',
    answer:
      'Sus datos son de su exclusiva propiedad y nunca se eliminan. Si su suscripción vence o vuelve al Plan Semilla ($0), el sistema activa un resguardo histórico en modo lectura (Soft-Lock): mantiene intactos sus presupuestos, documentos y registros contables para consultarlos o retomar cuando lo requiera.',
  },
  {
    id: 'security-rbac',
    question: '¿Puedo ocultar mis márgenes y tesorería a vendedores, taller o cuadrillas en terreno?',
    answer:
      'Sí. En Corporativo & Escala dispone de control de acceso por roles (RBAC de 6 perfiles: Gerencia, Comercial, Operaciones/Terreno, Finanzas y Contador solo lectura), aprobación gerencial obligatoria bajo piso de margen mínimo y bitácora inmutable de auditoría para cada cambio crítico.',
  },
];
