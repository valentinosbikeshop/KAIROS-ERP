import { calculateFinancials } from '@/lib/utils';
import { formatCostMetadata, type CostResourceType, type StaffModality } from '@/lib/cost-metadata';
import { INDUSTRY_BLUEPRINTS } from '@/lib/industries';
import type { Event, EventItem, IndustryType, MasterCost } from '@/types/database';

interface RawCostSpec {
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
}

interface RawItemSpec {
  servicio: string;
  detalle: string;
  tipo_evento: string;
  cantidad: number;
  costo: number;
  ganancia: number;
  tipo_doc_costo: 'factura' | 'boleta';
  approved: boolean;
  es_insumo?: boolean;
  children?: Array<{
    servicio: string;
    detalle: string;
    tipo_evento: string;
    cantidad: number;
    costo: number;
    tipo_doc_costo: 'factura' | 'boleta';
  }>;
}

interface RawProjectSpec {
  id: string;
  name: string;
  client_company: string;
  location: string;
  event_date: string;
  month: number;
  year: number;
  description: string;
  status: 'planning' | 'approved' | 'completed';
  has_retail_sales: boolean;
  items: RawItemSpec[];
  transactions?: Array<{
    type: 'ABONO_CLIENTE' | 'GASTO_REAL';
    monto: number;
    fecha: string;
    descripcion: string;
    docType: 'factura' | 'boleta' | 'transferencia';
  }>;
}

interface IndustrySeedBlueprint {
  extraCosts: RawCostSpec[];
  projects: RawProjectSpec[];
}

export const SHOWCASE_COMPLETED_ID = 'd0000002-0000-4000-8000-000000000001';
export const SHOWCASE_CONSOLIDATED_ID = 'd0000002-0000-4000-8000-000000000002';
export const SHOWCASE_PLANNING_ID = 'd0000002-0000-4000-8000-000000000003';

const INDUSTRY_DATASETS: Partial<Record<IndustryType, IndustrySeedBlueprint>> = {
  eventos_banqueteria: {
    extraCosts: [
      { servicio: 'Banda Live Corporativa (6 músicos)', tipo_evento: 'Música', resourceType: 'personal', staffCount: 6, staffHours: '2 bloques', staffModality: 'honorarios', aplicaIvaVenta: true, detail: 'Show bailable en vivo + prueba de sonido', costo: 680000, ganancia: 320000, tipo_doc_costo: 'boleta' },
      { servicio: 'Sonido Line Array (300 pax)', tipo_evento: 'Audiovisual', resourceType: 'servicio', staffCount: 1, staffHours: 'Jornada', staffModality: 'factura_subcontrato', aplicaIvaVenta: true, detail: 'Sistema PA + consola digital 32ch + Shure', costo: 357000, ganancia: 180000, tipo_doc_costo: 'factura' },
      { servicio: 'Iluminación Robótica & Pantalla LED 4x2.5m', tipo_evento: 'Audiovisual', resourceType: 'servicio', staffCount: 1, staffHours: 'Jornada', staffModality: 'factura_subcontrato', aplicaIvaVenta: true, detail: '12 cabezas móviles Beam + pantalla P3.9', costo: 476000, ganancia: 240000, tipo_doc_costo: 'factura' },
      { servicio: 'Banquetería 3 Tiempos Premium (por persona)', tipo_evento: 'Gastronomía', resourceType: 'insumo', staffCount: 1, staffHours: 'Evento', staffModality: 'factura_subcontrato', aplicaIvaVenta: true, detail: 'Entrada, fondo, postre + cristalería fina', costo: 33320, ganancia: 14000, tipo_doc_costo: 'factura' },
      { servicio: 'Barra Libre Coctelería de Autor (por persona)', tipo_evento: 'Gastronomía', resourceType: 'insumo', staffCount: 1, staffHours: '4 hrs', staffModality: 'factura_subcontrato', aplicaIvaVenta: true, detail: 'Gin Tonic, Aperol Spritz, Pisco Sour', costo: 11900, ganancia: 5500, tipo_doc_costo: 'factura' },
      { servicio: 'Carpa Cristal 10x20m Iluminada con Guirnaldas', tipo_evento: 'Mobiliario', resourceType: 'logistica', staffCount: 1, staffHours: '48 hrs', staffModality: 'factura_subcontrato', aplicaIvaVenta: true, detail: 'Piso madera y cielo estrellado LED', costo: 1071000, ganancia: 420000, tipo_doc_costo: 'factura' },
      { servicio: 'Generador Eléctrico Silencioso 40 kVA', tipo_evento: 'Logística', resourceType: 'logistica', staffCount: 1, staffHours: 'Jornada', staffModality: 'factura_subcontrato', aplicaIvaVenta: true, detail: 'Tablero trifásico y petróleo incluido', costo: 214200, ganancia: 80000, tipo_doc_costo: 'factura' },
      { servicio: 'Guardias Seguridad Acreditados OS-10', tipo_evento: 'Personal', resourceType: 'personal', staffCount: 4, staffHours: '8 hrs', staffModality: 'factura_subcontrato', aplicaIvaVenta: true, detail: 'Control de accesos y perímetro', costo: 285600, ganancia: 115000, tipo_doc_costo: 'factura' },
    ],
    projects: [
      {
        id: 'd0000002-0000-4000-8000-000000000004',
        name: 'Kickoff Comercial Banco Andino',
        client_company: 'Banco Andino Chile S.A.',
        location: 'Hotel Mandarin Oriental, Las Condes',
        event_date: '2026-03-19',
        month: 3,
        year: 2026,
        description: 'Desayuno y plenario comercial Q1 para 130 ejecutivos con audio, pantalla LED y cóctel de cierre.',
        status: 'completed',
        has_retail_sales: false,
        items: [
          { servicio: 'Banquetería Cóctel Ejecutivo (Por Persona)', detalle: 'Cóctel + coffee continuo 130 pax', tipo_evento: 'Gastronomía', cantidad: 130, costo: 14500, ganancia: 8500, tipo_doc_costo: 'factura', approved: true },
          { servicio: 'Sonido Line Array (300 pax)', detalle: 'Refuerzo sonoro salón plenario', tipo_evento: 'Audiovisual', cantidad: 1, costo: 357000, ganancia: 180000, tipo_doc_costo: 'factura', approved: true },
          { servicio: 'Staff Garzones & Maitre (Turno Evento)', detalle: 'Servicio de salón', tipo_evento: 'Personal', cantidad: 1, costo: 180000, ganancia: 75000, tipo_doc_costo: 'boleta', approved: true },
        ],
      },
      {
        id: 'd0000002-0000-4000-8000-000000000005',
        name: 'Convención Retail Sur 2026',
        client_company: 'Holding Comercial Sur S.A.',
        location: 'Centro Eventos Casapiedra, Vitacura',
        event_date: '2026-04-23',
        month: 4,
        year: 2026,
        description: 'Convención anual de gerentes de tienda con almuerzo 3 tiempos, banda en vivo e iluminación.',
        status: 'completed',
        has_retail_sales: false,
        items: [
          { servicio: 'Banquetería 3 Tiempos Premium (por persona)', detalle: 'Almuerzo ejecutivo 180 pax', tipo_evento: 'Gastronomía', cantidad: 180, costo: 33320, ganancia: 14000, tipo_doc_costo: 'factura', approved: true },
          { servicio: 'Iluminación Robótica & Pantalla LED 4x2.5m', detalle: 'Escenario principal', tipo_evento: 'Audiovisual', cantidad: 1, costo: 476000, ganancia: 240000, tipo_doc_costo: 'factura', approved: true },
          { servicio: 'Flete Camión Cerrado + Carga/Descarga', detalle: 'Logística de equipamiento', tipo_evento: 'Logística', cantidad: 2, costo: 95000, ganancia: 35000, tipo_doc_costo: 'factura', approved: true },
        ],
      },
      {
        id: 'd0000002-0000-4000-8000-000000000006',
        name: 'Aniversario 25 Años Logística Pacífico',
        client_company: 'Logística Pacífico Ltda.',
        location: 'Centro Parque, Las Condes',
        event_date: '2026-05-21',
        month: 5,
        year: 2026,
        description: 'Cena de aniversario para 260 colaboradores con banda live, carpa climatizada y barra libre.',
        status: 'completed',
        has_retail_sales: false,
        items: [
          { servicio: 'Banquetería 3 Tiempos Premium (por persona)', detalle: 'Cena 260 pax', tipo_evento: 'Gastronomía', cantidad: 260, costo: 33320, ganancia: 14000, tipo_doc_costo: 'factura', approved: true },
          { servicio: 'Banda Live Corporativa (6 músicos)', detalle: 'Show bailable estelar', tipo_evento: 'Música', cantidad: 1, costo: 680000, ganancia: 320000, tipo_doc_costo: 'boleta', approved: true },
          { servicio: 'Carpa Cristal 10x20m Iluminada con Guirnaldas', detalle: 'Montaje jardín central', tipo_evento: 'Mobiliario', cantidad: 1, costo: 1071000, ganancia: 420000, tipo_doc_costo: 'factura', approved: true },
        ],
      },
      {
        id: 'd0000002-0000-4000-8000-000000000007',
        name: 'Foro Invierno Energía Limpia',
        client_company: 'Asociación Energías Renovables',
        location: 'Hotel W Santiago',
        event_date: '2026-06-18',
        month: 6,
        year: 2026,
        description: 'Jornada de paneles y networking de invierno (temporada baja) para 110 asistentes.',
        status: 'completed',
        has_retail_sales: false,
        items: [
          { servicio: 'Banquetería Cóctel Ejecutivo (Por Persona)', detalle: 'Coffee + cóctel de cierre', tipo_evento: 'Gastronomía', cantidad: 110, costo: 14500, ganancia: 8500, tipo_doc_costo: 'factura', approved: true },
          { servicio: 'Sonido Line Array (300 pax)', detalle: 'Audio conferencias', tipo_evento: 'Audiovisual', cantidad: 1, costo: 357000, ganancia: 180000, tipo_doc_costo: 'factura', approved: true },
        ],
      },
      {
        id: 'd0000002-0000-4000-8000-000000000008',
        name: 'Cumbre Minera Andina 2026',
        client_company: 'Cámara Minera del Pacífico',
        location: 'Espacio Riesco, Huechuraba',
        event_date: '2026-08-20',
        month: 8,
        year: 2026,
        description: 'Congreso B2B para 200 delegados con producción audiovisual, seguridad OS-10 y cóctel.',
        status: 'completed',
        has_retail_sales: false,
        items: [
          { servicio: 'Banquetería 3 Tiempos Premium (por persona)', detalle: 'Almuerzo ejecutivos 200 pax', tipo_evento: 'Gastronomía', cantidad: 200, costo: 33320, ganancia: 14000, tipo_doc_costo: 'factura', approved: true },
          { servicio: 'Guardias Seguridad Acreditados OS-10', detalle: 'Control de accesos', tipo_evento: 'Personal', cantidad: 1, costo: 285600, ganancia: 115000, tipo_doc_costo: 'factura', approved: true },
        ],
      },
      {
        id: SHOWCASE_COMPLETED_ID,
        name: 'Gala TechChile 2026',
        client_company: 'Asociación Chilena de Tecnología A.G.',
        location: 'Hotel W Santiago — Gran Ballroom',
        event_date: '2026-10-18',
        month: 10,
        year: 2026,
        description: 'Cena anual de premiación para 290 ejecutivos. Incluye banquetería 3 tiempos, banda en vivo, pantalla LED y conciliación completa.',
        status: 'completed',
        has_retail_sales: false,
        items: [
          { servicio: 'Banquetería 3 Tiempos Premium (por persona)', detalle: 'Cena de gala maridaje reserva 290 pax', tipo_evento: 'Gastronomía', cantidad: 290, costo: 33320, ganancia: 14000, tipo_doc_costo: 'factura', approved: true },
          { servicio: 'Banda Live Corporativa (6 músicos)', detalle: 'Show principal 90 min + backline', tipo_evento: 'Música', cantidad: 1, costo: 680000, ganancia: 320000, tipo_doc_costo: 'boleta', approved: true },
          { servicio: 'Iluminación Robótica & Pantalla LED 4x2.5m', detalle: 'Montaje escénico principal', tipo_evento: 'Audiovisual', cantidad: 1, costo: 476000, ganancia: 240000, tipo_doc_costo: 'factura', approved: true },
          { servicio: 'Flete Camión Cerrado + Carga/Descarga', detalle: 'Traslado equipamiento y montaje', tipo_evento: 'Logística', cantidad: 2, costo: 95000, ganancia: 35000, tipo_doc_costo: 'factura', approved: true },
        ],
        transactions: [
          { type: 'ABONO_CLIENTE', monto: 8500000, fecha: '2026-10-02', descripcion: 'Anticipo 50% Gala TechChile', docType: 'transferencia' },
          { type: 'GASTO_REAL', monto: 9662800, fecha: '2026-10-16', descripcion: 'Factura Banquetería & Proveedores', docType: 'factura' },
          { type: 'ABONO_CLIENTE', monto: 8500000, fecha: '2026-10-21', descripcion: 'Saldo Final OC-9941', docType: 'transferencia' },
        ],
      },
      {
        id: SHOWCASE_CONSOLIDATED_ID,
        name: 'Festival & Barra Primavera 2026',
        client_company: 'Parque Empresarial Huechuraba',
        location: 'Parque Titanium, Las Condes',
        event_date: '2026-11-12',
        month: 11,
        year: 2026,
        description: 'Operación de barra y gastronomía unitaria con materias primas prorrateadas por unidad vendida.',
        status: 'approved',
        has_retail_sales: true,
        items: [
          {
            servicio: 'Terremoto Tradicional 500cc (Venta Unitaria)',
            detalle: 'Vaso 500cc con pipeño, helado de piña y granadina',
            tipo_evento: 'Gastronomía',
            cantidad: 400,
            costo: 1450,
            ganancia: 2750,
            tipo_doc_costo: 'factura',
            approved: true,
            children: [
              { servicio: 'Pipeño Seleccionado (Bidón 5L)', detalle: 'Insumo base 12 tragos por bidón', tipo_evento: 'Gastronomía', cantidad: 34, costo: 9800, tipo_doc_costo: 'factura' },
              { servicio: 'Helado de Piña Artesanal (Casata 10L)', detalle: '80 porciones por casata', tipo_evento: 'Gastronomía', cantidad: 5, costo: 24500, tipo_doc_costo: 'factura' },
            ],
          },
          { servicio: 'DJ Profesional + Audio & Iluminación Base', detalle: 'Música ambiental y fiesta', tipo_evento: 'Música', cantidad: 1, costo: 220000, ganancia: 140000, tipo_doc_costo: 'boleta', approved: true },
        ],
        transactions: [
          { type: 'ABONO_CLIENTE', monto: 1200000, fecha: '2026-11-03', descripcion: 'Reserva Barra Corporativa', docType: 'transferencia' },
          { type: 'GASTO_REAL', monto: 455700, fecha: '2026-11-10', descripcion: 'Compra Lote Pipeño y Helado', docType: 'factura' },
        ],
      },
      {
        id: SHOWCASE_PLANNING_ID,
        name: 'Matrimonio Sofía & Tomás',
        client_company: 'Sofía Valdivieso & Tomás Errázuriz',
        location: 'Hacienda Santa Martina, Lo Barnechea',
        event_date: '2026-12-05',
        month: 12,
        year: 2026,
        description: 'Matrimonio 180 invitados: ceremonia jardín, cóctel terraza y fiesta. Posee partidas oficiales y borradores listos para optimizar con IA.',
        status: 'planning',
        has_retail_sales: false,
        items: [
          { servicio: 'Carpa Cristal 10x20m Iluminada con Guirnaldas', detalle: 'Montaje 48h antes', tipo_evento: 'Mobiliario', cantidad: 1, costo: 1071000, ganancia: 420000, tipo_doc_costo: 'factura', approved: true },
          { servicio: 'Barra Libre Coctelería de Autor (180 PAX)', detalle: '4 horas barra abierta', tipo_evento: 'Gastronomía', cantidad: 180, costo: 11900, ganancia: 5500, tipo_doc_costo: 'factura', approved: false },
          { servicio: 'Staff Garzones & Maitre (Turno Evento)', detalle: 'Brigada 8 personas', tipo_evento: 'Personal', cantidad: 2, costo: 180000, ganancia: 75000, tipo_doc_costo: 'boleta', approved: false },
          { servicio: 'Generador Eléctrico Silencioso 40 kVA', detalle: 'Respaldo nocturno', tipo_evento: 'Logística', cantidad: 1, costo: 214200, ganancia: 80000, tipo_doc_costo: 'factura', approved: false },
        ],
        transactions: [
          { type: 'ABONO_CLIENTE', monto: 1000000, fecha: '2026-11-05', descripcion: 'Reserva Fecha Hacienda', docType: 'transferencia' },
        ],
      },
      {
        id: 'd0000002-0000-4000-8000-000000000009',
        name: 'Sunset Fin de Año FinTech Chile',
        client_company: 'FinTech Chile SpA',
        location: 'Terraza Titanium, Las Condes',
        event_date: '2026-12-18',
        month: 12,
        year: 2026,
        description: 'After-office de cierre anual para 140 fundadores con barra de autor, DJ y cóctel.',
        status: 'planning',
        has_retail_sales: false,
        items: [
          { servicio: 'Banquetería Cóctel Ejecutivo (Por Persona)', detalle: '140 pax cóctel premium', tipo_evento: 'Gastronomía', cantidad: 140, costo: 14500, ganancia: 8500, tipo_doc_costo: 'factura', approved: false },
          { servicio: 'DJ Profesional + Audio & Iluminación Base', detalle: 'Set sunset 5 hrs', tipo_evento: 'Música', cantidad: 1, costo: 220000, ganancia: 140000, tipo_doc_costo: 'boleta', approved: false },
        ],
      },
    ],
  },

  construccion_arquitectura: {
    extraCosts: [
      { servicio: 'Radier Hormigón H25 + Malla Acma (m²)', tipo_evento: 'Obra Gruesa', resourceType: 'insumo', staffCount: 0, staffHours: 'Por m²', staffModality: 'factura_subcontrato', aplicaIvaVenta: true, detail: 'Hormigón premezclado e=10cm, polietileno y vibrado', costo: 28500, ganancia: 10500, tipo_doc_costo: 'factura' },
      { servicio: 'Instalación Porcelanato Gran Formato (m²)', tipo_evento: 'Terminaciones', resourceType: 'insumo', staffCount: 0, staffHours: 'Por m²', staffModality: 'factura_subcontrato', aplicaIvaVenta: true, detail: 'Adhesivo Bekron AC, niveladores y fragüe epóxico', costo: 21000, ganancia: 9500, tipo_doc_costo: 'factura' },
      { servicio: 'Cielo Falso Modular / Volcanita 10mm (m²)', tipo_evento: 'Terminaciones', resourceType: 'insumo', staffCount: 0, staffHours: 'Por m²', staffModality: 'factura_subcontrato', aplicaIvaVenta: true, detail: 'Estructura perfiles C/omega, aislación y empaste', costo: 18500, ganancia: 7500, tipo_doc_costo: 'factura' },
      { servicio: 'Pintura Látex Lavable + Sellador (2 Manos m²)', tipo_evento: 'Terminaciones', resourceType: 'servicio', staffCount: 2, staffHours: 'Por m²', staffModality: 'turno', aplicaIvaVenta: true, detail: 'Preparación superficie, pasta muro y terminación', costo: 5800, ganancia: 3200, tipo_doc_costo: 'boleta' },
      { servicio: 'Gasfitería PEX + Grifería & Sanitarios (Punto)', tipo_evento: 'Instalaciones', resourceType: 'servicio', staffCount: 1, staffHours: 'Por punto', staffModality: 'factura_subcontrato', aplicaIvaVenta: true, detail: 'Red agua fría/caliente termofusión o PEX certificado', costo: 85000, ganancia: 35000, tipo_doc_costo: 'factura' },
      { servicio: 'Ventanal Termopanel PVC Folio Madera (m²)', tipo_evento: 'Terminaciones', resourceType: 'insumo', staffCount: 0, staffHours: 'Por m²', staffModality: 'factura_subcontrato', aplicaIvaVenta: true, detail: 'Doble vidriado hermético 4/12/4 + sellado poliuretano', costo: 145000, ganancia: 48000, tipo_doc_costo: 'factura' },
      { servicio: 'Impermeabilización Membrana Asfáltica (m²)', tipo_evento: 'Obra Gruesa', resourceType: 'servicio', staffCount: 2, staffHours: 'Por m²', staffModality: 'factura_subcontrato', aplicaIvaVenta: true, detail: 'Imprimante + membrana 4mm termofusionada', costo: 19500, ganancia: 8500, tipo_doc_costo: 'factura' },
      { servicio: 'Proyecto Arquitectura & Permiso Edificación DOM', tipo_evento: 'Subcontratos', resourceType: 'personal', staffCount: 1, staffHours: 'Por proyecto', staffModality: 'honorarios', aplicaIvaVenta: false, detail: 'Planos arquitectura, cálculo EETT e ingreso municipal', costo: 650000, ganancia: 350000, tipo_doc_costo: 'boleta' },
    ],
    projects: [
      {
        id: 'd0000002-0000-4000-8000-000000000004',
        name: 'Remodelación Clínica Dental Providencia',
        client_company: 'Clínica Odontológica Norte SpA',
        location: 'Av. Providencia 1920, Piso 4',
        event_date: '2026-03-22',
        month: 3,
        year: 2026,
        description: 'Habilitación de 3 boxes dentales con tabiquería sanitaria, red PEX, tablero SEC y porcelanato.',
        status: 'completed',
        has_retail_sales: false,
        items: [
          { servicio: 'Tabiquería Metalcon + Placa Volcanita 15mm (m²)', detalle: 'Tabiques acústicos boxes clínicos', tipo_evento: 'Obra Gruesa', cantidad: 85, costo: 24500, ganancia: 9500, tipo_doc_costo: 'factura', approved: true },
          { servicio: 'Gasfitería PEX + Grifería & Sanitarios (Punto)', detalle: '6 puntos hidráulicos clínicos', tipo_evento: 'Instalaciones', cantidad: 6, costo: 85000, ganancia: 35000, tipo_doc_costo: 'factura', approved: true },
          { servicio: 'Certificación & Tablero Eléctrico SEC (Subcontrato)', detalle: 'Tablero trifásico + TE1', tipo_evento: 'Instalaciones', cantidad: 1, costo: 320000, ganancia: 95000, tipo_doc_costo: 'factura', approved: true },
        ],
      },
      {
        id: 'd0000002-0000-4000-8000-000000000005',
        name: 'Ampliación Bodega & Oficinas ENEA',
        client_company: 'Distribuidora Logística Central Ltda.',
        location: 'Parque Industrial ENEA, Pudahuel',
        event_date: '2026-04-26',
        month: 4,
        year: 2026,
        description: 'Construcción de radier H25 140 m², oficinas en segundo nivel con tabiquería y pintura completa.',
        status: 'completed',
        has_retail_sales: false,
        items: [
          { servicio: 'Radier Hormigón H25 + Malla Acma (m²)', detalle: 'Losa industrial 140 m²', tipo_evento: 'Obra Gruesa', cantidad: 140, costo: 28500, ganancia: 10500, tipo_doc_costo: 'factura', approved: true },
          { servicio: 'Cielo Falso Modular / Volcanita 10mm (m²)', detalle: 'Oficinas administrativas 90 m²', tipo_evento: 'Terminaciones', cantidad: 90, costo: 18500, ganancia: 7500, tipo_doc_costo: 'factura', approved: true },
          { servicio: 'Cuadrilla Maestros Carpinteros / Terminaciones (Día)', detalle: '8 jornadas cuadrilla', tipo_evento: 'Mano de Obra', cantidad: 8, costo: 95000, ganancia: 32000, tipo_doc_costo: 'boleta', approved: true },
        ],
      },
      {
        id: 'd0000002-0000-4000-8000-000000000006',
        name: 'Habilitación Casa Matriz Fintech',
        client_company: 'Inversiones Australes S.A.',
        location: 'Av. Apoquindo 4700, Las Condes',
        event_date: '2026-05-24',
        month: 5,
        year: 2026,
        description: 'Remodelación piso completo de 240 m²: salas de directorio termopanel, porcelanato y certificación eléctrica.',
        status: 'completed',
        has_retail_sales: false,
        items: [
          { servicio: 'Instalación Porcelanato Gran Formato (m²)', detalle: 'Piso completo 210 m²', tipo_evento: 'Terminaciones', cantidad: 210, costo: 21000, ganancia: 9500, tipo_doc_costo: 'factura', approved: true },
          { servicio: 'Ventanal Termopanel PVC Folio Madera (m²)', detalle: 'Mamparas acústicas directorio 24 m²', tipo_evento: 'Terminaciones', cantidad: 24, costo: 145000, ganancia: 48000, tipo_doc_costo: 'factura', approved: true },
          { servicio: 'Certificación & Tablero Eléctrico SEC (Subcontrato)', detalle: 'Normalización completa + TE1', tipo_evento: 'Instalaciones', cantidad: 2, costo: 320000, ganancia: 95000, tipo_doc_costo: 'factura', approved: true },
        ],
      },
      {
        id: 'd0000002-0000-4000-8000-000000000007',
        name: 'Impermeabilización Cubierta Edificio Sur',
        client_company: 'Comunidad Edificio Parque Sur',
        location: 'Ñuñoa, Santiago',
        event_date: '2026-06-20',
        month: 6,
        year: 2026,
        description: 'Obra de mantención invernal en terraza de 110 m² con membrana asfáltica y retiro de escombros.',
        status: 'completed',
        has_retail_sales: false,
        items: [
          { servicio: 'Impermeabilización Membrana Asfáltica (m²)', detalle: 'Cubierta terraza superior 110 m²', tipo_evento: 'Obra Gruesa', cantidad: 110, costo: 19500, ganancia: 8500, tipo_doc_costo: 'factura', approved: true },
          { servicio: 'Camión Tolva Retiro de Escombros (6 m³)', detalle: 'Retiro membrana antigua', tipo_evento: 'Fletes & Retiro', cantidad: 2, costo: 135000, ganancia: 35000, tipo_doc_costo: 'factura', approved: true },
        ],
      },
      {
        id: 'd0000002-0000-4000-8000-000000000008',
        name: 'Local Comercial Cafetería Vitacura',
        client_company: 'Café Origen SpA',
        location: 'Av. Vitacura 3450',
        event_date: '2026-08-25',
        month: 8,
        year: 2026,
        description: 'Habilitación local gastronómico con red hidráulica, tabiquería, pintura lavable y tablero SEC.',
        status: 'completed',
        has_retail_sales: false,
        items: [
          { servicio: 'Tabiquería Metalcon + Placa Volcanita 15mm (m²)', detalle: 'Separación cocina y salón', tipo_evento: 'Obra Gruesa', cantidad: 75, costo: 24500, ganancia: 9500, tipo_doc_costo: 'factura', approved: true },
          { servicio: 'Instalación Porcelanato Gran Formato (m²)', detalle: 'Salón y cocina 95 m²', tipo_evento: 'Terminaciones', cantidad: 95, costo: 21000, ganancia: 9500, tipo_doc_costo: 'factura', approved: true },
          { servicio: 'Pintura Látex Lavable + Sellador (2 Manos m²)', detalle: 'Muros interiores 180 m²', tipo_evento: 'Terminaciones', cantidad: 180, costo: 5800, ganancia: 3200, tipo_doc_costo: 'boleta', approved: true },
        ],
      },
      {
        id: SHOWCASE_COMPLETED_ID,
        name: 'Remodelación Integral Casa Los Dominicos',
        client_company: 'Familia Matte — Guzmán',
        location: 'Camino El Alba 9200, Las Condes',
        event_date: '2026-10-15',
        month: 10,
        year: 2026,
        description: 'Ampliación 95 m² + cambio completo de ventanales termopanel, porcelanato, tablero eléctrico SEC y terminaciones de alto estándar. Obra entregada y conciliada.',
        status: 'completed',
        has_retail_sales: false,
        items: [
          { servicio: 'Radier Hormigón H25 + Malla Acma (m²)', detalle: 'Ampliación sector quincho y estar', tipo_evento: 'Obra Gruesa', cantidad: 95, costo: 28500, ganancia: 10500, tipo_doc_costo: 'factura', approved: true },
          { servicio: 'Ventanal Termopanel PVC Folio Madera (m²)', detalle: '26 m² ventanales piso a cielo', tipo_evento: 'Terminaciones', cantidad: 26, costo: 145000, ganancia: 48000, tipo_doc_costo: 'factura', approved: true },
          { servicio: 'Instalación Porcelanato Gran Formato (m²)', detalle: '120 m² piso interior/terraza', tipo_evento: 'Terminaciones', cantidad: 120, costo: 21000, ganancia: 9500, tipo_doc_costo: 'factura', approved: true },
          { servicio: 'Cuadrilla Maestros Carpinteros / Terminaciones (Día)', detalle: '14 jornadas cuadrilla completa', tipo_evento: 'Mano de Obra', cantidad: 14, costo: 95000, ganancia: 32000, tipo_doc_costo: 'boleta', approved: true },
        ],
        transactions: [
          { type: 'ABONO_CLIENTE', monto: 7500000, fecha: '2026-09-20', descripcion: 'Estado de Pago #1 Inicio Obra', docType: 'transferencia' },
          { type: 'GASTO_REAL', monto: 8420000, fecha: '2026-10-08', descripcion: 'Facturas Hormigón, Termopanel y Porcelanato', docType: 'factura' },
          { type: 'ABONO_CLIENTE', monto: 8200000, fecha: '2026-10-18', descripcion: 'Estado de Pago Final Entrega', docType: 'transferencia' },
        ],
      },
      {
        id: SHOWCASE_CONSOLIDATED_ID,
        name: 'Habilitación Oficinas Piso 12 — Torre Costanera',
        client_company: 'Consultora Pacífico S.A.',
        location: 'Av. Vitacura 2900, Piso 12',
        event_date: '2026-11-18',
        month: 11,
        year: 2026,
        description: 'Partidas constructivas consolidadas con desglose de materiales e insumos (perfiles, volcanita, lana mineral) bajo cada partida presupuestada.',
        status: 'approved',
        has_retail_sales: true,
        items: [
          {
            servicio: 'Partida Tabiquería Acústica Oficinas (90 m²)',
            detalle: 'Muros divisorios doble placa + aislación',
            tipo_evento: 'Obra Gruesa',
            cantidad: 90,
            costo: 24500,
            ganancia: 9500,
            tipo_doc_costo: 'factura',
            approved: true,
            children: [
              { servicio: 'Placas Volcanita RF 15mm (Lote 65 unid.)', detalle: 'Material base tabiquería', tipo_evento: 'Obra Gruesa', cantidad: 65, costo: 14200, tipo_doc_costo: 'factura' },
              { servicio: 'Perfiles Metalcon 90mm + Lana Mineral', detalle: 'Estructura y aislación acústica', tipo_evento: 'Obra Gruesa', cantidad: 1, costo: 980000, tipo_doc_costo: 'factura' },
            ],
          },
          { servicio: 'Certificación & Tablero Eléctrico SEC (Subcontrato)', detalle: 'Normalización 18 puestos de trabajo', tipo_evento: 'Instalaciones', cantidad: 1, costo: 320000, ganancia: 95000, tipo_doc_costo: 'factura', approved: true },
        ],
        transactions: [
          { type: 'ABONO_CLIENTE', monto: 2100000, fecha: '2026-11-04', descripcion: 'Anticipo 50% Habilitación', docType: 'transferencia' },
          { type: 'GASTO_REAL', monto: 1903000, fecha: '2026-11-10', descripcion: 'Factura Materiales Sodimac / Construmart', docType: 'factura' },
        ],
      },
      {
        id: SHOWCASE_PLANNING_ID,
        name: 'Quincho & Piscina Arquitectónica Chicureo',
        client_company: 'Rodrigo Errázuriz',
        location: 'Piedra Roja, Chicureo',
        event_date: '2026-12-10',
        month: 12,
        year: 2026,
        description: 'Proyecto en etapa de cubicación: incluye permiso de edificación aprobado y partidas de obra gruesa/terminaciones en Borrador listas para ajustar margen con IA.',
        status: 'planning',
        has_retail_sales: false,
        items: [
          { servicio: 'Proyecto Arquitectura & Permiso Edificación DOM', detalle: 'Planos y tramitación municipal', tipo_evento: 'Subcontratos', cantidad: 1, costo: 650000, ganancia: 350000, tipo_doc_costo: 'boleta', approved: true },
          { servicio: 'Radier Hormigón H25 + Malla Acma (m²)', detalle: 'Base quincho 45 m²', tipo_evento: 'Obra Gruesa', cantidad: 45, costo: 28500, ganancia: 10500, tipo_doc_costo: 'factura', approved: false },
          { servicio: 'Instalación Porcelanato Gran Formato (m²)', detalle: 'Terraza antideslizante 55 m²', tipo_evento: 'Terminaciones', cantidad: 55, costo: 21000, ganancia: 9500, tipo_doc_costo: 'factura', approved: false },
          { servicio: 'Camión Tolva Retiro de Escombros (6 m³)', detalle: 'Excavación y limpieza faena', tipo_evento: 'Fletes & Retiro', cantidad: 2, costo: 135000, ganancia: 35000, tipo_doc_costo: 'factura', approved: false },
        ],
        transactions: [
          { type: 'ABONO_CLIENTE', monto: 600000, fecha: '2026-11-08', descripcion: 'Anticipo Anteproyecto Arquitectura', docType: 'transferencia' },
        ],
      },
    ],
  },

  marketing_audiovisual: {
    extraCosts: [
      { servicio: 'Arriendo Estudio Ciclórama + Iluminación (Día)', tipo_evento: 'Rodaje & Cámaras', resourceType: 'logistica', staffCount: 0, staffHours: '10 hrs', staffModality: 'factura_subcontrato', aplicaIvaVenta: true, detail: 'Estudio 120 m² + 4 focos Aputure 600d', costo: 420000, ganancia: 160000, tipo_doc_costo: 'factura' },
      { servicio: 'Sonidista Directo + Kit Boom & Lavaliers', tipo_evento: 'Rodaje & Cámaras', resourceType: 'personal', staffCount: 1, staffHours: '10 hrs', staffModality: 'honorarios', aplicaIvaVenta: true, detail: 'Grabación multipista Sound Devices', costo: 190000, ganancia: 95000, tipo_doc_costo: 'boleta' },
      { servicio: 'Motion Graphics & Animación 2D/3D (Pack)', tipo_evento: 'Postproducción', resourceType: 'personal', staffCount: 1, staffHours: '20 hrs', staffModality: 'honorarios', aplicaIvaVenta: true, detail: 'Lower thirds, transiciones y cierre marca', costo: 240000, ganancia: 180000, tipo_doc_costo: 'boleta' },
      { servicio: 'Talento / Actor Principal (Jornada + Derechos)', tipo_evento: 'Talento / Influencers', resourceType: 'personal', staffCount: 1, staffHours: '10 hrs', staffModality: 'honorarios', aplicaIvaVenta: false, detail: 'Uso digital 12 meses territorio Chile', costo: 320000, ganancia: 140000, tipo_doc_costo: 'boleta' },
      { servicio: 'Operador Drone FPV / Inspire 4K Certificado DGAC', tipo_evento: 'Rodaje & Cámaras', resourceType: 'servicio', staffCount: 1, staffHours: '6 hrs', staffModality: 'factura_subcontrato', aplicaIvaVenta: true, detail: 'Permiso DGAC y tomas aéreas RAW', costo: 280000, ganancia: 150000, tipo_doc_costo: 'factura' },
      { servicio: 'Dirección Creativa & Guión Comercial', tipo_evento: 'Preproducción', resourceType: 'personal', staffCount: 1, staffHours: 'Proyecto', staffModality: 'honorarios', aplicaIvaVenta: true, detail: 'Concepto creativo, storyboard y shooting board', costo: 260000, ganancia: 220000, tipo_doc_costo: 'boleta' },
    ],
    projects: [
      {
        id: 'd0000002-0000-4000-8000-000000000004',
        name: 'Campaña Lanzamiento App Financiera Q1',
        client_company: 'Banca Digital Chile S.A.',
        location: 'Estudio Providencia',
        event_date: '2026-03-15',
        month: 3,
        year: 2026,
        description: 'Spot digital y 6 cápsulas testimoniales para lanzamiento de cuenta corriente digital.',
        status: 'completed',
        has_retail_sales: false,
        items: [
          { servicio: 'Jornada Dirección de Fotografía + Cámara Cinema 4K', detalle: '1 jornada grabación', tipo_evento: 'Rodaje & Cámaras', cantidad: 2, costo: 350000, ganancia: 230000, tipo_doc_costo: 'boleta', approved: true },
          { servicio: 'Edición, Colorización & Masterización Reel/Spot', detalle: '6 entregables 9:16 y 16:9', tipo_evento: 'Postproducción', cantidad: 3, costo: 180000, ganancia: 150000, tipo_doc_costo: 'boleta', approved: true },
        ],
      },
      {
        id: 'd0000002-0000-4000-8000-000000000005',
        name: 'Producción Comercial Automotriz Otoño',
        client_company: 'Automotora Cordillera S.A.',
        location: 'Cajón del Maipo / Locación Exterior',
        event_date: '2026-04-18',
        month: 4,
        year: 2026,
        description: 'Comercial outdoor con drone FPV, cámara cinema 4K, colorización DaVinci y sonido directo.',
        status: 'completed',
        has_retail_sales: false,
        items: [
          { servicio: 'Jornada Dirección de Fotografía + Cámara Cinema 4K', detalle: '2 jornadas exterior', tipo_evento: 'Rodaje & Cámaras', cantidad: 2, costo: 350000, ganancia: 230000, tipo_doc_costo: 'boleta', approved: true },
          { servicio: 'Operador Drone FPV / Inspire 4K Certificado DGAC', detalle: 'Seguimiento ruta montaña', tipo_evento: 'Rodaje & Cámaras', cantidad: 2, costo: 280000, ganancia: 150000, tipo_doc_costo: 'factura', approved: true },
          { servicio: 'Motion Graphics & Animación 2D/3D (Pack)', detalle: 'Gráfica de ficha técnica', tipo_evento: 'Postproducción', cantidad: 2, costo: 240000, ganancia: 180000, tipo_doc_costo: 'boleta', approved: true },
        ],
      },
      {
        id: 'd0000002-0000-4000-8000-000000000006',
        name: 'Campaña CyberDay Retail 2026',
        client_company: 'Tiendas Andes S.A.',
        location: 'Estudio Ciclórama Las Condes',
        event_date: '2026-05-28',
        month: 5,
        year: 2026,
        description: 'Mega producción de 15 piezas CyberDay con estudio ciclórama, 3 talentos, motion graphics y paid media.',
        status: 'completed',
        has_retail_sales: false,
        items: [
          { servicio: 'Arriendo Estudio Ciclórama + Iluminación (Día)', detalle: '3 días estudio completo', tipo_evento: 'Rodaje & Cámaras', cantidad: 3, costo: 420000, ganancia: 160000, tipo_doc_costo: 'factura', approved: true },
          { servicio: 'Talento / Actor Principal (Jornada + Derechos)', detalle: '3 talentos comerciales', tipo_evento: 'Talento / Influencers', cantidad: 3, costo: 320000, ganancia: 140000, tipo_doc_costo: 'boleta', approved: true },
          { servicio: 'Gestión Mensual Paid Media (Meta + Google Ads)', detalle: 'Campaña full funnel Cyber', tipo_evento: 'Pauta Digital', cantidad: 2, costo: 220000, ganancia: 260000, tipo_doc_costo: 'factura', approved: true },
        ],
      },
      {
        id: 'd0000002-0000-4000-8000-000000000007',
        name: 'Video Corporativo Memoria Anual',
        client_company: 'Grupo Industrial Sur',
        location: 'Oficinas Centrales, Santiago',
        event_date: '2026-06-22',
        month: 6,
        year: 2026,
        description: 'Cápsula institucional breve (período estacional bajo) con entrevistas a gerencia.',
        status: 'completed',
        has_retail_sales: false,
        items: [
          { servicio: 'Jornada Dirección de Fotografía + Cámara Cinema 4K', detalle: '1 jornada entrevistas', tipo_evento: 'Rodaje & Cámaras', cantidad: 1, costo: 350000, ganancia: 230000, tipo_doc_costo: 'boleta', approved: true },
          { servicio: 'Edición, Colorización & Masterización Reel/Spot', detalle: 'Master institucional', tipo_evento: 'Postproducción', cantidad: 1, costo: 180000, ganancia: 150000, tipo_doc_costo: 'boleta', approved: true },
        ],
      },
      {
        id: 'd0000002-0000-4000-8000-000000000008',
        name: 'Documental Marca Viña Colchagua',
        client_company: 'Viña Valle Dorado S.A.',
        location: 'Santa Cruz, VI Región',
        event_date: '2026-08-19',
        month: 8,
        year: 2026,
        description: 'Mini documental de vendimia y enoturismo con drone, sonido directo y colorización.',
        status: 'completed',
        has_retail_sales: false,
        items: [
          { servicio: 'Jornada Dirección de Fotografía + Cámara Cinema 4K', detalle: '2 jornadas viñedos', tipo_evento: 'Rodaje & Cámaras', cantidad: 2, costo: 350000, ganancia: 230000, tipo_doc_costo: 'boleta', approved: true },
          { servicio: 'Sonidista Directo + Kit Boom & Lavaliers', detalle: 'Entrevistas enólogos', tipo_evento: 'Rodaje & Cámaras', cantidad: 2, costo: 190000, ganancia: 95000, tipo_doc_costo: 'boleta', approved: true },
          { servicio: 'Dirección Creativa & Guión Comercial', detalle: 'Guión narrativo bilingüe', tipo_evento: 'Preproducción', cantidad: 1, costo: 260000, ganancia: 220000, tipo_doc_costo: 'boleta', approved: true },
        ],
      },
      {
        id: SHOWCASE_COMPLETED_ID,
        name: 'Campaña Black Friday & Spot TV Nacional',
        client_company: 'ElectroMarket Chile S.A.',
        location: 'Estudio Ciclórama + Locación Urbana',
        event_date: '2026-10-20',
        month: 10,
        year: 2026,
        description: 'Campaña omnicanal de alto impacto con 2 días de estudio, drone, talentos, motion 3D y pauta digital. Cerrada con conciliación completa.',
        status: 'completed',
        has_retail_sales: false,
        items: [
          { servicio: 'Arriendo Estudio Ciclórama + Iluminación (Día)', detalle: '2 días set comercial', tipo_evento: 'Rodaje & Cámaras', cantidad: 2, costo: 420000, ganancia: 160000, tipo_doc_costo: 'factura', approved: true },
          { servicio: 'Jornada Dirección de Fotografía + Cámara Cinema 4K', detalle: '3 jornadas rodaje', tipo_evento: 'Rodaje & Cámaras', cantidad: 3, costo: 350000, ganancia: 230000, tipo_doc_costo: 'boleta', approved: true },
          { servicio: 'Motion Graphics & Animación 2D/3D (Pack)', detalle: 'Paquete gráficos TV y RRSS', tipo_evento: 'Postproducción', cantidad: 3, costo: 240000, ganancia: 180000, tipo_doc_costo: 'boleta', approved: true },
          { servicio: 'Gestión Mensual Paid Media (Meta + Google Ads)', detalle: 'Fee gestión campaña Q4', tipo_evento: 'Pauta Digital', cantidad: 2, costo: 220000, ganancia: 260000, tipo_doc_costo: 'factura', approved: true },
        ],
        transactions: [
          { type: 'ABONO_CLIENTE', monto: 3000000, fecha: '2026-10-02', descripcion: 'Anticipo 50% Producción Spot', docType: 'transferencia' },
          { type: 'GASTO_REAL', monto: 2850000, fecha: '2026-10-14', descripcion: 'Pago Estudio, Crew y Post', docType: 'factura' },
          { type: 'ABONO_CLIENTE', monto: 3080000, fecha: '2026-10-24', descripcion: 'Saldo Entrega Master Final', docType: 'transferencia' },
        ],
      },
      {
        id: SHOWCASE_CONSOLIDATED_ID,
        name: 'Pack 12 Cápsulas Reels — Retainer Noviembre',
        client_company: 'Clínica Estética Aura',
        location: 'Estudio Agencia, Providencia',
        event_date: '2026-11-15',
        month: 11,
        year: 2026,
        description: 'Prorrateo de jornada de grabación y edición entre 12 cápsulas verticales mensuales.',
        status: 'approved',
        has_retail_sales: true,
        items: [
          {
            servicio: 'Cápsula Vertical Reel/TikTok (12 Entregables)',
            detalle: 'Guión, grabación en set, edición y subtítulos',
            tipo_evento: 'Postproducción',
            cantidad: 12,
            costo: 55000,
            ganancia: 45000,
            tipo_doc_costo: 'boleta',
            approved: true,
            children: [
              { servicio: 'Jornada Dirección de Fotografía + Cámara Cinema 4K', detalle: '1 día rodaje consolidado', tipo_evento: 'Rodaje & Cámaras', cantidad: 1, costo: 350000, tipo_doc_costo: 'boleta' },
              { servicio: 'Catering & Coffee Break de Rodaje (Equipo 12 pax)', detalle: 'Alimentación set', tipo_evento: 'Logística Set', cantidad: 1, costo: 110000, tipo_doc_costo: 'factura' },
            ],
          },
        ],
        transactions: [
          { type: 'ABONO_CLIENTE', monto: 700000, fecha: '2026-11-03', descripcion: 'Fee Mensual Retainer', docType: 'transferencia' },
        ],
      },
      {
        id: SHOWCASE_PLANNING_ID,
        name: 'Campaña Verano 2027 — Bebida Isotónica',
        client_company: 'Bebidas del Sur S.A.',
        location: 'Pichilemu / Locación Playa',
        event_date: '2026-12-12',
        month: 12,
        year: 2026,
        description: 'Propuesta creativa en evaluación con partidas en Borrador para simular márgenes con IA.',
        status: 'planning',
        has_retail_sales: false,
        items: [
          { servicio: 'Dirección Creativa & Guión Comercial', detalle: 'Aprobado en etapa 1', tipo_evento: 'Preproducción', cantidad: 1, costo: 260000, ganancia: 220000, tipo_doc_costo: 'boleta', approved: true },
          { servicio: 'Jornada Dirección de Fotografía + Cámara Cinema 4K', detalle: '2 días costa', tipo_evento: 'Rodaje & Cámaras', cantidad: 2, costo: 350000, ganancia: 230000, tipo_doc_costo: 'boleta', approved: false },
          { servicio: 'Operador Drone FPV / Inspire 4K Certificado DGAC', detalle: 'Tomas surf y costa', tipo_evento: 'Rodaje & Cámaras', cantidad: 1, costo: 280000, ganancia: 150000, tipo_doc_costo: 'factura', approved: false },
        ],
      },
    ],
  },
};

// Helper to synthesize full coherent datasets for remaining 6 industries using their own starterCatalog + categories
function buildSynthesizedIndustryDataset(industryType: IndustryType): IndustrySeedBlueprint {
  const bp = INDUSTRY_BLUEPRINTS[industryType];
  const cat = bp.starterCatalog;
  const c0 = cat[0];
  const c1 = cat[1] || cat[0];
  const c2 = cat[2] || cat[0];
  const c3 = cat[3] || cat[0];

  const monthsSpec = [
    { id: 'd0000002-0000-4000-8000-000000000004', m: 3, d: '2026-03-18', mult: 1, suffix: 'Fase Q1' },
    { id: 'd0000002-0000-4000-8000-000000000005', m: 4, d: '2026-04-21', mult: 2, suffix: 'Expansión Abril' },
    { id: 'd0000002-0000-4000-8000-000000000006', m: 5, d: '2026-05-24', mult: 3, suffix: 'Peak Mayo' },
    { id: 'd0000002-0000-4000-8000-000000000007', m: 6, d: '2026-06-19', mult: 1, suffix: 'Temporada Baja Junio' },
    { id: 'd0000002-0000-4000-8000-000000000008', m: 8, d: '2026-08-22', mult: 2, suffix: 'Recuperación Agosto' },
    { id: SHOWCASE_COMPLETED_ID, m: 10, d: '2026-10-18', mult: 4, suffix: 'Proyecto Estrella Octubre' },
  ];

  const projects: RawProjectSpec[] = monthsSpec.map((ms, idx) => ({
    id: ms.id,
    name: `${bp.terminology.projectSingular} ${bp.shortName.split('&')[0].trim()} — ${ms.suffix}`,
    client_company: idx % 2 === 0 ? 'Corporación Pacífico S.A.' : 'Grupo Empresarial Andes Ltda.',
    location: 'Santiago, Región Metropolitana',
    event_date: ms.d,
    month: ms.m,
    year: 2026,
    description: `${bp.tagline} Ejecución completa con trazabilidad de costos, facturas/boletas y cierre P&L (${ms.suffix}).`,
    status: 'completed',
    has_retail_sales: false,
    items: [
      { servicio: c0.servicio, detalle: c0.detail, tipo_evento: c0.tipo_evento, cantidad: ms.mult * 4, costo: c0.costo, ganancia: c0.ganancia, tipo_doc_costo: c0.tipo_doc_costo, approved: true },
      { servicio: c1.servicio, detalle: c1.detail, tipo_evento: c1.tipo_evento, cantidad: ms.mult * 2, costo: c1.costo, ganancia: c1.ganancia, tipo_doc_costo: c1.tipo_doc_costo, approved: true },
      { servicio: c2.servicio, detalle: c2.detail, tipo_evento: c2.tipo_evento, cantidad: ms.mult, costo: c2.costo, ganancia: c2.ganancia, tipo_doc_costo: c2.tipo_doc_costo, approved: true },
    ],
    transactions: ms.id === SHOWCASE_COMPLETED_ID
      ? [
          { type: 'ABONO_CLIENTE', monto: Math.round((c0.costo + c0.ganancia) * 8), fecha: '2026-10-03', descripcion: `Anticipo 50% ${bp.terminology.projectSingular}`, docType: 'transferencia' },
          { type: 'GASTO_REAL', monto: Math.round(c0.costo * 10 + c1.costo * 4), fecha: '2026-10-14', descripcion: 'Facturas Proveedores e Insumos', docType: 'factura' },
          { type: 'ABONO_CLIENTE', monto: Math.round((c1.costo + c1.ganancia) * 6), fecha: '2026-10-20', descripcion: 'Saldo Final Contra Entrega', docType: 'transferencia' },
        ]
      : undefined,
  }));

  projects.push(
    {
      id: SHOWCASE_CONSOLIDATED_ID,
      name: `${bp.terminology.projectSingular} Consolidado & Insumos`,
      client_company: 'Holding Inversiones Sur S.A.',
      location: 'Providencia, Santiago',
      event_date: '2026-11-14',
      month: 11,
      year: 2026,
      description: `Operación aprobada con agrupación de insumos y costos unitarios prorrateados para ${bp.shortName}.`,
      status: 'approved',
      has_retail_sales: true,
      items: [
        {
          servicio: c0.servicio,
          detalle: c0.detail,
          tipo_evento: c0.tipo_evento,
          cantidad: 10,
          costo: c0.costo,
          ganancia: c0.ganancia,
          tipo_doc_costo: c0.tipo_doc_costo,
          approved: true,
          children: [
            { servicio: `Insumo Base — ${c3.servicio}`, detalle: c3.detail, tipo_evento: c3.tipo_evento, cantidad: 2, costo: Math.round(c3.costo * 0.6), tipo_doc_costo: c3.tipo_doc_costo },
          ],
        },
        { servicio: c2.servicio, detalle: c2.detail, tipo_evento: c2.tipo_evento, cantidad: 2, costo: c2.costo, ganancia: c2.ganancia, tipo_doc_costo: c2.tipo_doc_costo, approved: true },
      ],
      transactions: [
        { type: 'ABONO_CLIENTE', monto: Math.round((c0.costo + c0.ganancia) * 5), fecha: '2026-11-04', descripcion: 'Anticipo Inicial Aprobado', docType: 'transferencia' },
      ],
    },
    {
      id: SHOWCASE_PLANNING_ID,
      name: `Cotización ${bp.shortName} — Cliente Estratégico`,
      client_company: 'Comercial Cordillera SpA',
      location: 'Las Condes, Santiago',
      event_date: '2026-12-08',
      month: 12,
      year: 2026,
      description: `Propuesta en evaluación para ${bp.shortName}. Incluye ítems aprobados y partidas en Borrador de Costos listas para optimizar con IA.`,
      status: 'planning',
      has_retail_sales: false,
      items: [
        { servicio: c0.servicio, detalle: c0.detail, tipo_evento: c0.tipo_evento, cantidad: 5, costo: c0.costo, ganancia: c0.ganancia, tipo_doc_costo: c0.tipo_doc_costo, approved: true },
        { servicio: c1.servicio, detalle: c1.detail, tipo_evento: c1.tipo_evento, cantidad: 3, costo: c1.costo, ganancia: c1.ganancia, tipo_doc_costo: c1.tipo_doc_costo, approved: false },
        { servicio: c3.servicio, detalle: c3.detail, tipo_evento: c3.tipo_evento, cantidad: 2, costo: c3.costo, ganancia: c3.ganancia, tipo_doc_costo: c3.tipo_doc_costo, approved: false },
      ],
    }
  );

  return { extraCosts: [], projects };
}

export function buildIndustryDemoDataset(
  industryType: IndustryType,
  orgId: string,
  userId: string
): {
  master_costs: MasterCost[];
  events: Event[];
  event_items: EventItem[];
} {
  const bp = INDUSTRY_BLUEPRINTS[industryType] || INDUSTRY_BLUEPRINTS.eventos_banqueteria;
  const spec =
    INDUSTRY_DATASETS[industryType] || buildSynthesizedIndustryDataset(industryType);

  const starterAsCosts: RawCostSpec[] = bp.starterCatalog.map((item) => ({
    servicio: item.servicio,
    tipo_evento: item.tipo_evento,
    resourceType: item.resourceType,
    staffCount: item.staffCount,
    staffHours: item.staffHours,
    staffModality: item.staffModality,
    aplicaIvaVenta: item.aplicaIvaVenta,
    detail: item.detail,
    costo: item.costo,
    ganancia: item.ganancia,
    tipo_doc_costo: item.tipo_doc_costo,
  }));

  const allCostSpecs = [...starterAsCosts, ...spec.extraCosts];
  const master_costs: MasterCost[] = allCostSpecs.map((c, idx) => {
    const fin = calculateFinancials(c.costo, c.ganancia, c.tipo_doc_costo, c.aplicaIvaVenta, false);
    return {
      id: `d0000001-0000-4000-8000-${String(idx + 1).padStart(12, '0')}`,
      organization_id: orgId,
      servicio: c.servicio,
      tipo_evento: c.tipo_evento,
      tiempo_detalle: formatCostMetadata({
        resourceType: c.resourceType,
        staffCount: c.staffCount,
        staffHours: c.staffHours,
        staffModality: c.staffModality,
        aplicaIvaVenta: c.aplicaIvaVenta,
        cleanDetail: c.detail,
      }),
      costo: c.costo,
      ganancia: c.ganancia,
      valor_neto: fin.valorNeto,
      valor_total: fin.valorTotal,
      tipo_doc_costo: c.tipo_doc_costo,
      is_demo_base: true,
      created_at: '2026-01-10T10:00:00Z',
    };
  });

  const events: Event[] = [];
  const event_items: EventItem[] = [];
  let itemSeq = 1;

  const nextItemId = () => `d0000003-0000-4000-8000-${String(itemSeq++).padStart(12, '0')}`;

  spec.projects.forEach((proj) => {
    events.push({
      id: proj.id,
      organization_id: orgId,
      name: proj.name,
      client_company: proj.client_company,
      location: proj.location,
      event_date: proj.event_date,
      month: proj.month,
      year: proj.year,
      description: proj.description,
      status: proj.status,
      created_by: userId,
      created_at: `${proj.event_date}T10:00:00Z`,
      deleted_at: null,
      has_retail_sales: proj.has_retail_sales,
      is_demo_base: true,
    });

    proj.items.forEach((it) => {
      const parentId = nextItemId();
      const fin = calculateFinancials(it.costo, it.ganancia, it.tipo_doc_costo, true, Boolean(it.es_insumo));
      event_items.push({
        id: parentId,
        organization_id: orgId,
        event_id: proj.id,
        servicio: it.servicio,
        detalle: it.detalle,
        tipo_evento: it.tipo_evento,
        cantidad: it.cantidad,
        costo: it.costo,
        ganancia: it.es_insumo ? 0 : it.ganancia,
        valor_neto: fin.valorNeto,
        iva: fin.ivaDebito,
        valor_total: fin.valorTotal,
        margen: fin.margen,
        tipo_doc_costo: it.tipo_doc_costo,
        approved: it.approved,
        parent_id: null,
        es_insumo: Boolean(it.es_insumo),
        iva_incluido: true,
        is_demo_base: true,
        created_at: `${proj.event_date}T11:00:00Z`,
      });

      if (it.children) {
        it.children.forEach((child) => {
          const cFin = calculateFinancials(child.costo, 0, child.tipo_doc_costo, true, true);
          event_items.push({
            id: nextItemId(),
            organization_id: orgId,
            event_id: proj.id,
            servicio: child.servicio,
            detalle: child.detalle,
            tipo_evento: child.tipo_evento,
            cantidad: child.cantidad,
            costo: child.costo,
            ganancia: 0,
            valor_neto: cFin.valorNeto,
            iva: cFin.ivaDebito,
            valor_total: cFin.valorTotal,
            margen: cFin.margen,
            tipo_doc_costo: child.tipo_doc_costo,
            approved: true,
            parent_id: parentId,
            es_insumo: true,
            iva_incluido: true,
            is_demo_base: true,
            created_at: `${proj.event_date}T11:30:00Z`,
          });
        });
      }
    });

    if (proj.transactions) {
      proj.transactions.forEach((tx) => {
        const isGasto = tx.type === 'GASTO_REAL';
        const isFactura = isGasto && tx.docType === 'factura';
        const valorNeto = isGasto
          ? isFactura
            ? Math.round(tx.monto / 1.19)
            : tx.monto
          : Math.round(tx.monto / 1.19);
        const iva = tx.monto - valorNeto;

        event_items.push({
          id: nextItemId(),
          organization_id: orgId,
          event_id: proj.id,
          servicio: isGasto ? (isFactura ? 'Factura de Proveedor' : 'Boleta de Proveedor') : 'Abono de Cliente',
          detalle: `${tx.fecha} | ${tx.descripcion}`,
          tipo_evento: tx.type,
          cantidad: 1,
          costo: isGasto ? tx.monto : 0,
          ganancia: isGasto ? 0 : tx.monto,
          valor_neto: valorNeto,
          iva,
          valor_total: tx.monto,
          margen: isGasto ? 0 : 100,
          tipo_doc_costo: tx.docType === 'factura' ? 'factura' : 'boleta',
          approved: true,
          parent_id: null,
          es_insumo: false,
          iva_incluido: true,
          is_demo_base: true,
          created_at: `${tx.fecha}T12:00:00Z`,
        });
      });
    }
  });

  return { master_costs, events, event_items };
}
