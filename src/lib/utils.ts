import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  DEFAULT_UF_RATE_CLP,
  DEFAULT_USD_RATE_CLP,
  formatMoney,
} from '@/lib/finance-core';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCLP(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCurrencyAmount(
  amountClp: number,
  currency: 'CLP' | 'UF' | 'USD' = 'CLP',
  exchangeRate = 1
): string {
  if (currency === 'UF') {
    const rate = exchangeRate > 1 ? exchangeRate : DEFAULT_UF_RATE_CLP;
    return formatMoney(amountClp, 'UF', rate);
  }
  if (currency === 'USD') {
    const rate = exchangeRate > 1 ? exchangeRate : DEFAULT_USD_RATE_CLP;
    return formatMoney(amountClp, 'USD', rate);
  }
  return formatCLP(amountClp);
}

/**
 * Formatea un RUT chileno a XX.XXX.XXX-X
 */
export function formatRutCL(raw: string): string {
  const clean = String(raw || '')
    .replace(/[^0-9kK]/g, '')
    .toUpperCase();
  if (clean.length <= 1) return clean;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${formattedBody}-${dv}`;
}

/**
 * Valida un RUT chileno mediante algoritmo Módulo 11.
 */
export function validateRutCL(raw: string): boolean {
  const clean = String(raw || '')
    .replace(/[^0-9kK]/g, '')
    .toUpperCase();
  if (clean.length < 7 || clean.length > 10) return false;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  if (!/^\d+$/.test(body)) return false;

  let sum = 0;
  let multiplier = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const mod = 11 - (sum % 11);
  const expectedDv = mod === 11 ? '0' : mod === 10 ? 'K' : String(mod);
  return dv === expectedDv;
}

export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function calculateFinancialsFromMargin(
  costo: number,
  margenPorcentaje: number,
  tipoDoc: 'factura' | 'boleta' | 'exento' = 'factura',
  aplicaIvaVenta: boolean = true,
  esInsumo: boolean = false
) {
  const costoNeto = tipoDoc === 'boleta' || tipoDoc === 'exento' ? costo : Math.round(costo / 1.19);
  const ivaCredito = costo - costoNeto;

  if (esInsumo) {
    return {
      costoNeto,
      ivaCredito,
      ganancia: 0,
      valorNeto: 0,
      iva: 0,
      ivaDebito: 0,
      valorTotal: 0,
      margen: 0
    };
  }

  // Margen sobre costo neto (Markup)
  const safeMargin = Math.max(0, margenPorcentaje || 0);
  const ganancia = Math.round(costoNeto * (safeMargin / 100));
  const valorNeto = costoNeto + ganancia;
  const ivaDebito = aplicaIvaVenta ? Math.round(valorNeto * 0.19) : 0;
  const valorTotal = valorNeto + ivaDebito;

  return {
    costoNeto,
    ivaCredito,
    ganancia,
    valorNeto,
    iva: ivaDebito,
    ivaDebito,
    valorTotal,
    margen: Math.round(safeMargin * 10) / 10
  };
}

export function calculateFinancials(
  costo: number, 
  ganancia: number, 
  tipoDoc: 'factura' | 'boleta' | 'exento' = 'factura',
  aplicaIvaVenta: boolean = true,
  esInsumo: boolean = false
) {
  // IVA Crédito (Egresos)
  const costoNeto = tipoDoc === 'boleta' || tipoDoc === 'exento' ? costo : Math.round(costo / 1.19);
  const ivaCredito = costo - costoNeto;

  if (esInsumo) {
    return {
      costoNeto,
      ivaCredito,
      valorNeto: 0,
      iva: 0,
      ivaDebito: 0,
      valorTotal: 0,
      margen: 0
    };
  }

  // IVA Débito (Ingresos)
  const valorNeto = costoNeto + ganancia;
  const ivaDebito = aplicaIvaVenta ? Math.round(valorNeto * 0.19) : 0;
  
  const valorTotal = valorNeto + ivaDebito;
  const margen = costoNeto > 0 ? (ganancia / costoNeto) * 100 : 0;
  
  return { 
    costoNeto, 
    ivaCredito, 
    valorNeto, 
    iva: ivaDebito, 
    ivaDebito,
    valorTotal, 
    margen: Math.round(margen * 10) / 10 
  };
}

export function calculateGananciaFromTotal(
  costo: number, 
  valorTotal: number, 
  tipoDoc: 'factura' | 'boleta' | 'exento' = 'factura',
  aplicaIvaVenta: boolean = true,
  esInsumo: boolean = false
) {
  // IVA Crédito (Egresos)
  const costoNeto = tipoDoc === 'boleta' || tipoDoc === 'exento' ? costo : Math.round(costo / 1.19);
  const ivaCredito = costo - costoNeto;

  if (esInsumo) {
    return {
      costoNeto,
      ivaCredito,
      ganancia: 0,
      valorNeto: 0,
      iva: 0,
      ivaDebito: 0,
      valorTotal: 0,
      margen: 0
    };
  }

  // IVA Débito (Ingresos)
  const valorNeto = aplicaIvaVenta ? Math.round(valorTotal / 1.19) : valorTotal;
  const ivaDebito = valorTotal - valorNeto;
  
  const ganancia = valorNeto - costoNeto;
  const margen = costoNeto > 0 ? (ganancia / costoNeto) * 100 : 0;
  
  return { 
    costoNeto,
    ivaCredito,
    ganancia, 
    valorNeto, 
    iva: ivaDebito, 
    ivaDebito,
    valorTotal,
    margen: Math.round(margen * 10) / 10 
  };
}

export function getMonthName(month: number): string {
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return months[month - 1] || '';
}

/**
 * Parse a YYYY-MM-DD date string safely without timezone shift.
 * new Date('2026-09-13') interprets as UTC midnight, which in Chile (UTC-4)
 * becomes Sept 12. This function parses the string directly.
 */
export function parseDateSafe(dateStr: string): { year: number; month: number; day: number } {
  if (!dateStr) return { year: 0, month: 0, day: 0 };
  const cleanDate = String(dateStr).trim().split('T')[0].split(' ')[0];
  const [y, m, d] = cleanDate.split('-').map(Number);
  return { year: y, month: m, day: d };
}

/**
 * Format a YYYY-MM-DD date string for display in Chilean locale, 
 * without timezone drift.
 */
export function formatDateCL(dateStr: string, options?: { long?: boolean }): string {
  const { year, month, day } = parseDateSafe(dateStr);
  if (!year || !month || !day) return 'Fecha inválida';

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  // Create date at noon to avoid any timezone edge cases
  const dateObj = new Date(year, month - 1, day, 12, 0, 0);
  const weekday = dayNames[dateObj.getDay()];

  if (options?.long) {
    return `${weekday}, ${day} de ${monthNames[month - 1]} de ${year}`;
  }
  return `${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}-${year}`;
}

