import type { IndustryType, ModuleKey, OperationMode, SubscriptionStatus, SubscriptionTier, ThemePreset } from './database';

export * from './database';

export type AiSuggestion = {
  id?: string;
  servicio: string;
  detalle: string;
  tipo_evento: string;
  cantidad: number;
  costo: number;
  ganancia: number;
  valor_neto: number;
  iva: number;
  valor_total: number;
  margen: number;
  tipo_doc_costo?: 'factura' | 'boleta';
  sin_ganancia?: boolean;
  iva_incluido?: boolean;
  es_insumo?: boolean;
  source_item_id?: string | null;
  cantidad_original?: number | null;
};

export type FinancialSummary = {
  totalIngresosBrutos: number;
  facturacionNeta: number;
  costosOperativos: number;
  utilidadNeta: number;
  margenPromedio: number;
  ivaDebitoFiscal: number;
};

export type MonthlyData = {
  month: string;
  ventas: number;
  costos: number;
};

export type CostCategory = {
  name: string;
  value: number;
  percentage: number;
};

export type ResolvedEntitlements = {
  tier: SubscriptionTier;
  effectiveTier: SubscriptionTier;
  status: SubscriptionStatus;
  isExempt: boolean;
  isDemo: boolean;
  isExpiredLock: boolean;
  maxProjects: number | null;
  maxCosts: number | null;
  maxUsers: number | null;
  aiCallsLimit: number;
  aiCallsUsed: number;
  aiCallsRemaining: number;
  modules: Record<ModuleKey, boolean>;
  currentPeriodEnd: string | null;
  industryType: IndustryType;
  themePreset: ThemePreset;
  operationMode: OperationMode;
};
