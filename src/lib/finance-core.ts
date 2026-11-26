import {
  CHILE_HONORARIOS_RETENTION_2026,
  CHILE_IVA_RATE,
  DEFAULT_UF_RATE_CLP,
  DEFAULT_USD_RATE_CLP,
} from '@/lib/constants';
import { parseCostMetadata } from '@/lib/cost-metadata';
import type {
  HonorariosRetentionPolicy,
  PurchaseDocType,
  QuoteCurrency,
  TaxRegime,
} from '@/types/database';

export { CHILE_HONORARIOS_RETENTION_2026, CHILE_IVA_RATE, DEFAULT_UF_RATE_CLP, DEFAULT_USD_RATE_CLP };
export type { HonorariosRetentionPolicy, PurchaseDocType, QuoteCurrency, TaxRegime };

export interface CurrencyRates {
  uf?: number | null;
  usd?: number | null;
}

export interface FinanceItemLike {
  id?: string | null;
  parent_id?: string | null;
  servicio?: string | null;
  detalle?: string | null;
  tiempo_detalle?: string | null;
  tipo_evento?: string | null;
  cantidad?: number | null;
  costo?: number | null;
  ganancia?: number | null;
  valor_neto?: number | null;
  iva?: number | null;
  valor_total?: number | null;
  margen?: number | null;
  tipo_doc_costo?: PurchaseDocType | string | null;
  iva_incluido?: boolean | null;
  aplicaIvaVenta?: boolean | null;
  es_insumo?: boolean | null;
  es_exento?: boolean | null;
  es_exento_compra?: boolean | null;
  es_reembolsable?: boolean | null;
  is_pass_through?: boolean | null;
  is_passthrough?: boolean | null;
  approved?: boolean | null;
  currency?: QuoteCurrency | null;
  exchange_rate?: number | null;
}

export interface ItemFinancials {
  cantidad: number;
  costoBrutoUnit: number;
  costoNetoUnit: number;
  ivaCreditoUnit: number;
  gananciaUnit: number;
  ventaNetaUnit: number;
  ivaDebitoUnit: number;
  ventaTotalUnit: number;
  costoBruto: number;
  costoNeto: number;
  ivaCredito: number;
  gananciaTotal: number;
  ventaNeta: number;
  ivaDebito: number;
  ventaTotal: number;
  utilidadNeta: number;
  /** Margen comercial sobre venta neta: (ventaNeta - costoNeto) / ventaNeta * 100 */
  margenVentaPct: number;
  /** Markup sobre costo neto: (ventaNeta - costoNeto) / costoNeto * 100 */
  markupCostoPct: number;
  isExemptSale: boolean;
  isPassthrough: boolean;
  tipoDocCompra: PurchaseDocType;
}

export interface ExecutedCashSummary {
  abonosBrutos: number;
  abonosNetos: number;
  abonosIvaDebito: number;
  gastosBrutos: number;
  gastosNetos: number;
  gastosIvaCredito: number;
  retencionHonorariosTotal: number;
  retencionDescuentoPrestador: number;
  retencionAporteEmpresa: number;
  cajaNetaEjecutada: number;
}

export interface ProjectFinancials {
  facturacionBruta: number;
  facturacionNeta: number;
  facturacionNetaSinReembolsables: number;
  reembolsablesTotal: number;
  ivaDebito: number;
  costoBrutoTotal: number;
  costoNetoTotal: number;
  ivaCredito: number;
  utilidadNeta: number;
  /** Margen sobre venta neta (%) — fórmula canónica de rentabilidad */
  margenVentaPct: number;
  /** Margen operacional excluyendo gastos reembolsables (pass-through) */
  margenOperacionalPct: number;
  /** Markup sobre costo neto (%) */
  markupCostoPct: number;
  ivaNetoF29: number;
  remanenteIvaF29: number;
  retencionHonorariosEstimada: number;
  executed: ExecutedCashSummary;
}

export interface F29Projection {
  ivaDebito: number;
  ivaCredito: number;
  ivaAPagar: number;
  remanenteIva: number;
  retencionHonorarios: number;
  ppmEstimado: number;
  totalF29Estimado: number;
}

function round1(val: number): number {
  return Math.round(val * 10) / 10;
}

/**
 * Extrae el Neto y el IVA (19%) desde un monto bruto CLP usando redondeo estándar SII.
 */
export function extractIvaFromGross(bruto: number): { net: number; iva: number } {
  const gross = Math.round(Number(bruto) || 0);
  const net = Math.round(gross / (1 + CHILE_IVA_RATE));
  return { net, iva: gross - net };
}

/**
 * Retorna solo el monto neto (ex-IVA) desde un valor bruto con IVA 19% incluido.
 */
export function netFromGross(bruto: number): number {
  return Math.round((Number(bruto) || 0) / (1 + CHILE_IVA_RATE));
}

/**
 * Normaliza el tipo de documento de compra ('factura' | 'boleta' | 'exento').
 */
export function normalizePurchaseDocType(
  tipoDoc?: string | null,
  isPurchaseExempt?: boolean | null
): PurchaseDocType {
  if (isPurchaseExempt || tipoDoc === 'exento') return 'exento';
  if (tipoDoc === 'boleta' || tipoDoc === 'transferencia') return 'boleta';
  return 'factura';
}

/**
 * Calcula el IVA Crédito unitario de una compra según su documento tributario.
 * Factura afecta: costo - Math.round(costo / 1.19). Boleta / Exento: 0.
 */
export function ivaCreditForUnit(
  costoUnit: number,
  tipoDoc?: PurchaseDocType | string | null,
  isPurchaseExempt = false
): number {
  const normalized = normalizePurchaseDocType(tipoDoc, isPurchaseExempt);
  if (normalized !== 'factura') return 0;
  const c = Math.max(0, Math.round(Number(costoUnit) || 0));
  return c - Math.round(c / (1 + CHILE_IVA_RATE));
}

/**
 * Calcula el IVA Crédito para un ítem o línea presupuestaria.
 * Por defecto multiplica por `item.cantidad ?? 1` (pasar `{ perUnit: true }` para unitario).
 */
export function ivaCreditForItem(
  item: Pick<FinanceItemLike, 'costo' | 'cantidad' | 'tipo_doc_costo' | 'es_exento_compra'>,
  options?: { perUnit?: boolean }
): number {
  const unitCredit = ivaCreditForUnit(
    Number(item.costo) || 0,
    item.tipo_doc_costo,
    Boolean(item.es_exento_compra)
  );
  if (options?.perUnit) return unitCredit;
  const qty = Math.max(1, Number(item.cantidad) || 1);
  return unitCredit * qty;
}

/**
 * Calcula el monto bruto y retención SII desde un monto líquido pagado en Boleta de Honorarios.
 * Ley 21.133 año 2026: tasa 15,25% (divisor 0,8475).
 */
export function honorariosGrossUp(
  liquido: number,
  rate: number = CHILE_HONORARIOS_RETENTION_2026
): { bruto: number; retencion: number; liquido: number } {
  const liq = Math.max(0, Math.round(Number(liquido) || 0));
  const r = rate > 0 && rate < 1 ? rate : CHILE_HONORARIOS_RETENTION_2026;
  const bruto = Math.round(liq / (1 - r));
  return {
    bruto,
    retencion: Math.max(0, bruto - liq),
    liquido: liq,
  };
}

/**
 * Calcula la retención y el líquido a pagar desde el monto bruto de una Boleta de Honorarios.
 */
export function retentionFromGross(
  bruto: number,
  rate: number = CHILE_HONORARIOS_RETENTION_2026
): { bruto: number; retencion: number; liquido: number } {
  const gross = Math.max(0, Math.round(Number(bruto) || 0));
  const r = rate > 0 && rate < 1 ? rate : CHILE_HONORARIOS_RETENTION_2026;
  const retencion = Math.round(gross * r);
  return {
    bruto: gross,
    retencion,
    liquido: Math.max(0, gross - retencion),
  };
}

/**
 * Distribuye la retención de honorarios (15,25% en 2026) según la política de la organización:
 * - 'contractor': el prestador asume la retención (empresa paga líquido, retiene y entera al SII).
 * - 'company': la empresa asume el gross-up completo (costo total = bruto aumentado).
 * - 'split_50_50': empresa y prestador comparten la retención en partes iguales.
 */
export function applyRetentionPolicy(
  montoBase: number,
  policy: HonorariosRetentionPolicy = 'contractor',
  rate: number = CHILE_HONORARIOS_RETENTION_2026
): {
  bruto: number;
  retencionTotal: number;
  descuentoPrestador: number;
  aporteEmpresa: number;
  liquidoAPagar: number;
  costoTotalEmpresa: number;
} {
  const base = Math.max(0, Math.round(Number(montoBase) || 0));
  if (policy === 'company') {
    const grossed = honorariosGrossUp(base, rate);
    return {
      bruto: grossed.bruto,
      retencionTotal: grossed.retencion,
      descuentoPrestador: 0,
      aporteEmpresa: grossed.retencion,
      liquidoAPagar: base,
      costoTotalEmpresa: grossed.bruto,
    };
  }

  const fromGross = retentionFromGross(base, rate);
  if (policy === 'split_50_50') {
    const aporteEmpresa = Math.round(fromGross.retencion / 2);
    const descuentoPrestador = fromGross.retencion - aporteEmpresa;
    return {
      bruto: fromGross.bruto,
      retencionTotal: fromGross.retencion,
      descuentoPrestador,
      aporteEmpresa,
      liquidoAPagar: Math.max(0, fromGross.bruto - descuentoPrestador),
      costoTotalEmpresa: fromGross.bruto + aporteEmpresa,
    };
  }

  return {
    bruto: fromGross.bruto,
    retencionTotal: fromGross.retencion,
    descuentoPrestador: fromGross.retencion,
    aporteEmpresa: 0,
    liquidoAPagar: fromGross.liquido,
    costoTotalEmpresa: fromGross.bruto,
  };
}

/**
 * Determina si un ítem está exento de IVA Débito en la venta al cliente:
 * - Regímenes exentos de organización (Sociedad de Profesionales Art. 12 E N°8, Exportación Turismo Art. 12 E N°17)
 * - Bandera explícita `iva_incluido === false` o `aplicaIvaVenta === false` o `es_exento === true`
 * - Gastos reembolsables pass-through (Art. 16 DL 825)
 * - Metadatos estructurados `[... Sin IVA Venta ...]` en `tiempo_detalle` / `detalle`
 */
export function isItemExempt(item: FinanceItemLike, orgTaxRegime?: TaxRegime): boolean {
  if (orgTaxRegime === 'sociedad_profesionales' || orgTaxRegime === 'exportacion_turismo') {
    return true;
  }
  if (item.es_exento === true) return true;
  if (item.es_reembolsable === true || item.is_pass_through === true || item.is_passthrough === true) {
    return true;
  }
  if (item.iva_incluido === false || item.aplicaIvaVenta === false) return true;

  if (
    item.iva_incluido === undefined &&
    item.aplicaIvaVenta === undefined &&
    typeof item.tiempo_detalle === 'string' &&
    item.tiempo_detalle.includes('[')
  ) {
    const meta = parseCostMetadata(item.tiempo_detalle, item.tipo_evento, item.servicio);
    if (!meta.aplicaIvaVenta) return true;
  }

  return false;
}

/**
 * Indica si una fila de `event_items` corresponde a partida presupuestaria (excluye ABONO_CLIENTE y GASTO_REAL).
 */
export function isBudgetLineItem(item: Pick<FinanceItemLike, 'tipo_evento' | 'servicio'>): boolean {
  return (
    item.tipo_evento !== 'ABONO_CLIENTE' &&
    item.tipo_evento !== 'GASTO_REAL' &&
    item.servicio !== 'ABONO_CLIENTE' &&
    item.servicio !== 'GASTO_REAL'
  );
}

/**
 * Detecta de forma precisa si un ítem o gasto ejecutado corresponde a Boleta de Honorarios (retención 15,25%).
 * Evita falsos positivos por substring ingenuo de "honorario".
 */
export function isBoletaHonorariosItem(item: FinanceItemLike): boolean {
  const docType = item.tipo_doc_costo;
  const detalle = String(item.tiempo_detalle || item.detalle || '').trim();
  const servicio = String(item.servicio || '').trim();

  if (item.tipo_evento === 'GASTO_REAL') {
    if (docType === 'factura') return false;
    return (
      servicio === 'Boleta de Honorarios (Personal)' ||
      /\[Ret\.\s*15[.,]25%/i.test(detalle) ||
      /\bboleta\s+de\s+honorarios\b/i.test(`${servicio} ${detalle}`)
    );
  }

  if (docType !== 'boleta') return false;
  if (detalle.includes('[')) {
    const meta = parseCostMetadata(detalle, item.tipo_evento, servicio);
    return meta.staffModality === 'honorarios';
  }
  const meta = parseCostMetadata(detalle, item.tipo_evento, servicio);
  return meta.resourceType === 'personal' && meta.staffModality === 'honorarios';
}

/**
 * Cálculo financiero único y canónico por línea de presupuesto o catálogo.
 * Margen (%) = Utilidad Neta / Venta Neta (separado de Markup % = Utilidad Neta / Costo Neto).
 */
export function computeItemFinancials(
  item: FinanceItemLike,
  options?: { taxRegime?: TaxRegime }
): ItemFinancials {
  const cantidad = Math.max(1, Number(item.cantidad) || 1);
  const costoBrutoUnit = Math.max(0, Math.round(Number(item.costo) || 0));
  const tipoDocCompra = normalizePurchaseDocType(item.tipo_doc_costo, item.es_exento_compra);
  const costoNetoUnit =
    tipoDocCompra === 'factura' ? netFromGross(costoBrutoUnit) : costoBrutoUnit;
  const ivaCreditoUnit = costoBrutoUnit - costoNetoUnit;
  const isExemptSale = isItemExempt(item, options?.taxRegime);
  const isPassthrough = Boolean(
    item.es_reembolsable || item.is_pass_through || item.is_passthrough
  );
  const isInsumo = Boolean(item.es_insumo);

  let gananciaUnit = 0;
  let ventaNetaUnit = 0;
  let ivaDebitoUnit = 0;
  let ventaTotalUnit = 0;

  if (!isInsumo) {
    gananciaUnit = isPassthrough ? 0 : Math.round(Number(item.ganancia) || 0);
    ventaNetaUnit = costoNetoUnit + gananciaUnit;
    ivaDebitoUnit = isExemptSale ? 0 : Math.round(ventaNetaUnit * CHILE_IVA_RATE);
    ventaTotalUnit = ventaNetaUnit + ivaDebitoUnit;
  }

  const costoBruto = costoBrutoUnit * cantidad;
  const costoNeto = costoNetoUnit * cantidad;
  const ivaCredito = ivaCreditoUnit * cantidad;
  const gananciaTotal = gananciaUnit * cantidad;
  const ventaNeta = ventaNetaUnit * cantidad;
  const ivaDebito = ivaDebitoUnit * cantidad;
  const ventaTotal = ventaTotalUnit * cantidad;
  const utilidadNeta = isInsumo ? 0 : ventaNeta - costoNeto;

  const margenVentaPct = ventaNeta > 0 ? round1((utilidadNeta / ventaNeta) * 100) : 0;
  const markupCostoPct = costoNeto > 0 ? round1((utilidadNeta / costoNeto) * 100) : 0;

  return {
    cantidad,
    costoBrutoUnit,
    costoNetoUnit,
    ivaCreditoUnit,
    gananciaUnit,
    ventaNetaUnit,
    ivaDebitoUnit,
    ventaTotalUnit,
    costoBruto,
    costoNeto,
    ivaCredito,
    gananciaTotal,
    ventaNeta,
    ivaDebito,
    ventaTotal,
    utilidadNeta,
    margenVentaPct,
    markupCostoPct,
    isExemptSale,
    isPassthrough,
    tipoDocCompra,
  };
}

/**
 * Cálculo financiero único de proyecto completo:
 * - Respeta jerarquía padre/hijo (los hijos aportan su costo neto e IVA Crédito por documento real).
 * - Excluye abonos/gastos reales del presupuesto y los consolida en `executed`.
 * - Calcula Utilidad Neta ex-IVA real (permite valores negativos) y Margen sobre Venta Neta (%).
 */
export function computeProjectFinancials(
  items: FinanceItemLike[],
  options?: {
    taxRegime?: TaxRegime;
    honorariosPolicy?: HonorariosRetentionPolicy;
    onlyApproved?: boolean;
  }
): ProjectFinancials {
  const safeItems = Array.isArray(items) ? items : [];
  const childrenMap = new Map<string, FinanceItemLike[]>();

  for (const item of safeItems) {
    if (item.parent_id && isBudgetLineItem(item)) {
      const list = childrenMap.get(item.parent_id) || [];
      list.push(item);
      childrenMap.set(item.parent_id, list);
    }
  }

  let facturacionBruta = 0;
  let facturacionNeta = 0;
  let reembolsablesTotal = 0;
  let ivaDebito = 0;
  let costoBrutoTotal = 0;
  let costoNetoTotal = 0;
  let ivaCredito = 0;
  let retencionHonorariosEstimada = 0;

  const policy = options?.honorariosPolicy || 'contractor';

  for (const item of safeItems) {
    if (item.parent_id) continue;
    if (!isBudgetLineItem(item)) continue;
    if (options?.onlyApproved && item.approved === false) continue;

    const children = item.id ? childrenMap.get(item.id) || [] : [];
    const parentFin = computeItemFinancials(item, { taxRegime: options?.taxRegime });

    if (!item.es_insumo) {
      facturacionBruta += parentFin.ventaTotal;
      facturacionNeta += parentFin.ventaNeta;
      ivaDebito += parentFin.ivaDebito;
      if (parentFin.isPassthrough) {
        reembolsablesTotal += parentFin.ventaNeta;
      }
    }

    if (children.length > 0) {
      for (const child of children) {
        const childFin = computeItemFinancials(child, { taxRegime: options?.taxRegime });
        costoBrutoTotal += childFin.costoBruto;
        costoNetoTotal += childFin.costoNeto;
        ivaCredito += childFin.ivaCredito;
        if (isBoletaHonorariosItem(child)) {
          retencionHonorariosEstimada += applyRetentionPolicy(
            childFin.costoBruto,
            policy
          ).retencionTotal;
        }
      }
    } else {
      costoBrutoTotal += parentFin.costoBruto;
      costoNetoTotal += parentFin.costoNeto;
      ivaCredito += parentFin.ivaCredito;
      if (isBoletaHonorariosItem(item)) {
        retencionHonorariosEstimada += applyRetentionPolicy(
          parentFin.costoBruto,
          policy
        ).retencionTotal;
      }
    }
  }

  const utilidadNeta = facturacionNeta - costoNetoTotal;
  const facturacionNetaSinReembolsables = Math.max(0, facturacionNeta - reembolsablesTotal);
  const costoNetoSinReembolsables = costoNetoTotal - reembolsablesTotal;
  const utilidadOperacional = facturacionNetaSinReembolsables - costoNetoSinReembolsables;

  const margenVentaPct =
    facturacionNeta > 0 ? round1((utilidadNeta / facturacionNeta) * 100) : 0;
  const margenOperacionalPct =
    facturacionNetaSinReembolsables > 0
      ? round1((utilidadOperacional / facturacionNetaSinReembolsables) * 100)
      : 0;
  const markupCostoPct =
    costoNetoTotal > 0 ? round1((utilidadNeta / costoNetoTotal) * 100) : 0;

  const ivaNetoF29 = Math.max(0, ivaDebito - ivaCredito);
  const remanenteIvaF29 = Math.max(0, ivaCredito - ivaDebito);

  // Ejecución real (Abonos de clientes & Gastos reales rendidos)
  let abonosBrutos = 0;
  let abonosNetos = 0;
  let abonosIvaDebito = 0;
  let gastosBrutos = 0;
  let gastosNetos = 0;
  let gastosIvaCredito = 0;
  let retencionHonorariosTotal = 0;
  let retencionDescuentoPrestador = 0;
  let retencionAporteEmpresa = 0;

  for (const item of safeItems) {
    if (item.tipo_evento === 'ABONO_CLIENTE' || item.servicio === 'ABONO_CLIENTE') {
      const qty = Math.max(1, Number(item.cantidad) || 1);
      const gross = Math.round((Number(item.valor_total) || Number(item.ganancia) || 0) * qty);
      const exempt = isItemExempt(item, options?.taxRegime);
      const net = exempt ? gross : netFromGross(gross);
      const iva = gross - net;
      abonosBrutos += gross;
      abonosNetos += net;
      abonosIvaDebito += iva;
    } else if (item.tipo_evento === 'GASTO_REAL' || item.servicio === 'GASTO_REAL') {
      const qty = Math.max(1, Number(item.cantidad) || 1);
      const gross = Math.round((Number(item.costo) || Number(item.valor_total) || 0) * qty);
      const isFactura = normalizePurchaseDocType(item.tipo_doc_costo, item.es_exento_compra) === 'factura';
      const net = isFactura ? netFromGross(gross) : gross;
      const iva = gross - net;

      gastosBrutos += gross;
      gastosNetos += net;
      gastosIvaCredito += iva;

      if (isBoletaHonorariosItem(item)) {
        const ret = applyRetentionPolicy(gross, policy);
        retencionHonorariosTotal += ret.retencionTotal;
        retencionDescuentoPrestador += ret.descuentoPrestador;
        retencionAporteEmpresa += ret.aporteEmpresa;
      }
    }
  }

  return {
    facturacionBruta,
    facturacionNeta,
    facturacionNetaSinReembolsables,
    reembolsablesTotal,
    ivaDebito,
    costoBrutoTotal,
    costoNetoTotal,
    ivaCredito,
    utilidadNeta,
    margenVentaPct,
    margenOperacionalPct,
    markupCostoPct,
    ivaNetoF29,
    remanenteIvaF29,
    retencionHonorariosEstimada,
    executed: {
      abonosBrutos,
      abonosNetos,
      abonosIvaDebito,
      gastosBrutos,
      gastosNetos,
      gastosIvaCredito,
      retencionHonorariosTotal,
      retencionDescuentoPrestador,
      retencionAporteEmpresa,
      cajaNetaEjecutada: abonosBrutos - gastosBrutos,
    },
  };
}

/**
 * Proyecta el Formulario 29 SII mensual con IVA a pagar / remanente, retenciones 15,25% y PPM opcional.
 */
export function computeF29Projection(params: {
  ivaDebito: number;
  ivaCredito: number;
  retencionHonorarios?: number;
  ppmRatePct?: number;
  ventasNetasAfectasYExentas?: number;
}): F29Projection {
  const ivaDebito = Math.max(0, Math.round(params.ivaDebito || 0));
  const ivaCredito = Math.max(0, Math.round(params.ivaCredito || 0));
  const ivaAPagar = Math.max(0, ivaDebito - ivaCredito);
  const remanenteIva = Math.max(0, ivaCredito - ivaDebito);
  const retencionHonorarios = Math.max(0, Math.round(params.retencionHonorarios || 0));
  const ppmRate = Math.max(0, Number(params.ppmRatePct || 0));
  const ppmEstimado =
    ppmRate > 0 && params.ventasNetasAfectasYExentas
      ? Math.round(Math.max(0, params.ventasNetasAfectasYExentas) * (ppmRate / 100))
      : 0;

  return {
    ivaDebito,
    ivaCredito,
    ivaAPagar,
    remanenteIva,
    retencionHonorarios,
    ppmEstimado,
    totalF29Estimado: ivaAPagar + retencionHonorarios + ppmEstimado,
  };
}

function resolveEffectiveRate(currency: QuoteCurrency, rates?: CurrencyRates | number): number {
  if (typeof rates === 'number') {
    if (currency === 'UF') return rates > 1 ? rates : DEFAULT_UF_RATE_CLP;
    if (currency === 'USD') return rates > 1 ? rates : DEFAULT_USD_RATE_CLP;
    return 1;
  }
  if (currency === 'UF') {
    return rates?.uf && rates.uf > 1 ? rates.uf : DEFAULT_UF_RATE_CLP;
  }
  if (currency === 'USD') {
    return rates?.usd && rates.usd > 1 ? rates.usd : DEFAULT_USD_RATE_CLP;
  }
  return 1;
}

/**
 * Convierte un monto en CLP hacia 'CLP', 'UF' o 'USD' con tasas configuradas o por defecto.
 */
export function convertCurrency(
  montoClp: number,
  targetCurrency: QuoteCurrency,
  rates?: CurrencyRates | number
): number {
  const clp = Number(montoClp) || 0;
  if (targetCurrency === 'CLP') return Math.round(clp);
  const rate = resolveEffectiveRate(targetCurrency, rates);
  return clp / rate;
}

/**
 * Convierte un monto en 'CLP', 'UF' o 'USD' hacia pesos chilenos (CLP).
 */
export function convertToClp(
  monto: number,
  sourceCurrency: QuoteCurrency,
  rates?: CurrencyRates | number
): number {
  const val = Number(monto) || 0;
  if (sourceCurrency === 'CLP') return Math.round(val);
  const rate = resolveEffectiveRate(sourceCurrency, rates);
  return Math.round(val * rate);
}

/**
 * Formatea un monto CLP en la moneda objetivo ('CLP' | 'UF' | 'USD') usando tasas seguras.
 * Nunca divide UF/USD por 1 cuando `rates` no fue informado.
 */
export function formatMoney(
  amountClp: number,
  currency: QuoteCurrency = 'CLP',
  rates?: CurrencyRates | number
): string {
  const safeClp = Number(amountClp) || 0;
  if (currency === 'UF') {
    const uf = convertCurrency(safeClp, 'UF', rates);
    return `UF ${uf.toLocaleString('es-CL', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  if (currency === 'USD') {
    const usd = convertCurrency(safeClp, 'USD', rates);
    return `US$ ${usd.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(safeClp));
}

export interface PortfolioEventLike {
  id?: string;
  status?: string | null;
  deleted_at?: string | null;
  event_date?: string | null;
  month?: number | null;
  year?: number | null;
  tax_regime?: TaxRegime | null;
  event_items?: FinanceItemLike[] | null;
}

export interface PortfolioFinancials {
  eventsCount: number;
  planningCount: number;
  approvedCount: number;
  completedCount: number;
  facturacionBruta: number;
  facturacionNeta: number;
  costosBrutos: number;
  costosNetos: number;
  utilidadNeta: number;
  /** Margen comercial ponderado sobre Venta Neta (%) */
  margenPromedioVentaPct: number;
  /** Markup ponderado sobre Costo Neto (%) */
  markupPromedioCostoPct: number;
  ivaDebito: number;
  ivaCredito: number;
  ivaNetoF29: number;
  remanenteIvaF29: number;
  monthlySeries: Array<{
    monthNumber: number;
    year: number;
    ventasNetas: number;
    ventasBrutas: number;
    costosNetos: number;
    costosBrutos: number;
    utilidadNeta: number;
  }>;
}

/**
 * Rollup canónico de portafolio para `/dashboard` y `/analytics`:
 * - Misma definición única: Facturación Neta ex-IVA, Costos Netos ex-IVA (extrayendo IVA Crédito
 *   solo de `factura`, nunca `costo * 0.19`), Utilidad Neta real sin clamp a 0 y Margen % ponderado s/ Venta Neta.
 */
export function computePortfolioFinancials(
  events: PortfolioEventLike[],
  options?: {
    taxRegime?: TaxRegime;
    honorariosPolicy?: HonorariosRetentionPolicy;
    includeStatuses?: Array<'planning' | 'approved' | 'completed'>;
    onlyApprovedItems?: boolean;
  }
): PortfolioFinancials {
  const allowedStatuses = new Set(options?.includeStatuses || ['completed']);
  const onlyApproved = options?.onlyApprovedItems ?? true;

  let planningCount = 0;
  let approvedCount = 0;
  let completedCount = 0;

  let facturacionBruta = 0;
  let facturacionNeta = 0;
  let costosBrutos = 0;
  let costosNetos = 0;
  let ivaDebito = 0;
  let ivaCredito = 0;

  const monthlyMap = new Map<
    string,
    {
      monthNumber: number;
      year: number;
      ventasNetas: number;
      ventasBrutas: number;
      costosNetos: number;
      costosBrutos: number;
      utilidadNeta: number;
    }
  >();

  for (const ev of events || []) {
    if (ev.deleted_at) continue;
    if (ev.status === 'planning') planningCount++;
    else if (ev.status === 'approved') approvedCount++;
    else if (ev.status === 'completed') completedCount++;

    if (!ev.status || !allowedStatuses.has(ev.status as 'planning' | 'approved' | 'completed')) {
      continue;
    }

    const evFin = computeProjectFinancials(ev.event_items || [], {
      taxRegime: ev.tax_regime || options?.taxRegime,
      honorariosPolicy: options?.honorariosPolicy,
      onlyApproved,
    });

    facturacionBruta += evFin.facturacionBruta;
    facturacionNeta += evFin.facturacionNeta;
    costosBrutos += evFin.costoBrutoTotal;
    costosNetos += evFin.costoNetoTotal;
    ivaDebito += evFin.ivaDebito;
    ivaCredito += evFin.ivaCredito;

    let monthNumber = Number(ev.month) || 0;
    let year = Number(ev.year) || 0;
    if ((!monthNumber || !year) && ev.event_date) {
      const clean = String(ev.event_date).trim().split('T')[0];
      const [yStr, mStr] = clean.split('-');
      year = Number(yStr) || year;
      monthNumber = Number(mStr) || monthNumber;
    }
    if (monthNumber >= 1 && monthNumber <= 12) {
      const safeYear = year || new Date().getFullYear();
      const key = `${safeYear}-${String(monthNumber).padStart(2, '0')}`;
      const existing = monthlyMap.get(key) || {
        monthNumber,
        year: safeYear,
        ventasNetas: 0,
        ventasBrutas: 0,
        costosNetos: 0,
        costosBrutos: 0,
        utilidadNeta: 0,
      };
      existing.ventasNetas += evFin.facturacionNeta;
      existing.ventasBrutas += evFin.facturacionBruta;
      existing.costosNetos += evFin.costoNetoTotal;
      existing.costosBrutos += evFin.costoBrutoTotal;
      existing.utilidadNeta += evFin.utilidadNeta;
      monthlyMap.set(key, existing);
    }
  }

  const utilidadNeta = facturacionNeta - costosNetos;
  const margenPromedioVentaPct =
    facturacionNeta > 0 ? round1((utilidadNeta / facturacionNeta) * 100) : 0;
  const markupPromedioCostoPct =
    costosNetos > 0 ? round1((utilidadNeta / costosNetos) * 100) : 0;

  const monthlySeries = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, val]) => val);

  return {
    eventsCount: planningCount + approvedCount + completedCount,
    planningCount,
    approvedCount,
    completedCount,
    facturacionBruta,
    facturacionNeta,
    costosBrutos,
    costosNetos,
    utilidadNeta,
    margenPromedioVentaPct,
    markupPromedioCostoPct,
    ivaDebito,
    ivaCredito,
    ivaNetoF29: Math.max(0, ivaDebito - ivaCredito),
    remanenteIvaF29: Math.max(0, ivaCredito - ivaDebito),
    monthlySeries,
  };
}

