export type IndustryType =
  | 'eventos_banqueteria'
  | 'marketing_audiovisual'
  | 'construccion_arquitectura'
  | 'catering_foodservice'
  | 'ferias_stands_b2b'
  | 'maestranza_muebles'
  | 'ingenieria_hvac'
  | 'consultoria_juridico'
  | 'turismo_mice';

export type ThemePreset =
  | 'obsidian_gold'
  | 'emerald_sovereign'
  | 'sapphire_executive'
  | 'terracotta_atelier'
  | 'amethyst_studio';

export type OperationMode = 'project' | 'retail_mixed' | 'retainer_hours';

export type HonorariosRetentionPolicy = 'company' | 'contractor' | 'split_50_50';

export type QuoteCurrency = 'CLP' | 'UF' | 'USD';

export type QuotePortalStatus = 'draft' | 'sent' | 'accepted' | 'rejected';

export type SubscriptionTier = 'free' | 'essential' | 'growth' | 'scale' | 'custom';

export type SubscriptionStatus = 'active' | 'past_due' | 'canceled';

export type ModuleKey =
  | 'mod_unlimited_projects'
  | 'mod_pdf_quotes'
  | 'mod_transactions_sii'
  | 'mod_consolidation_retail'
  | 'mod_ai_suite'
  | 'mod_analytics_excel'
  | 'mod_team_branding';

export type CustomTerminology = {
  projectSingular?: string;
  projectPlural?: string;
  clientLabel?: string;
  catalogLabel?: string;
  locationLabel?: string;
};

export type OrganizationSaasConfig = {
  industry_type: IndustryType;
  theme_preset: ThemePreset;
  operation_mode: OperationMode;
  custom_terminology?: CustomTerminology;
  onboarding_completed: boolean;
  is_exempt: boolean;
  subscription_tier: SubscriptionTier;
  subscription_status: SubscriptionStatus;
  selected_modules: ModuleKey[];
  current_period_start: string | null;
  current_period_end: string | null;
  khipu_subscription_id?: string | null;
  ai_calls_used: number;
  ai_calls_reset_at: string;
  honorarios_retention_policy?: HonorariosRetentionPolicy;
  min_margin_pct?: number;
  uf_rate_clp?: number;
  usd_rate_clp?: number;
  pending_payments?: BillingPayment[];
};

export type OrganizationBankInfo = {
  banco?: string;
  tipo_cuenta?: string;
  numero_cuenta?: string;
  titular?: string;
  rut?: string;
  email?: string;
  __saas_config?: OrganizationSaasConfig;
  [key: string]: unknown;
};

export type Organization = {
  id: string;
  name: string;
  slug: string;
  invite_code: string;
  legal_name: string | null;
  rut: string | null;
  subtitle: string | null;
  location: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  logo_url?: string | null;
  bank_info: OrganizationBankInfo | null;
  is_demo: boolean;
  is_active: boolean;
  max_demo_events: number;
  max_demo_costs: number;
  created_at: string;
  // Campos SaaS (pueden venir de columnas SQL o hidratados desde bank_info.__saas_config)
  industry_type?: IndustryType;
  theme_preset?: ThemePreset;
  operation_mode?: OperationMode;
  custom_terminology?: CustomTerminology | null;
  onboarding_completed?: boolean;
  is_exempt?: boolean;
  subscription_tier?: SubscriptionTier;
  subscription_status?: SubscriptionStatus;
  selected_modules?: ModuleKey[];
  current_period_start?: string | null;
  current_period_end?: string | null;
  khipu_subscription_id?: string | null;
  ai_calls_used?: number;
  ai_calls_reset_at?: string;
  min_margin_pct?: number;
  uf_rate_clp?: number;
  usd_rate_clp?: number;
};

export type SubscriptionPlan = {
  id: Exclude<SubscriptionTier, 'custom'>;
  name: string;
  tagline: string;
  description: string;
  price_clp: number;
  is_recommended: boolean;
  badge_text: string | null;
  max_projects: number | null;
  max_costs: number | null;
  max_users: number | null;
  ai_calls_limit: number;
  included_modules: ModuleKey[];
  features: string[];
  sort_order: number;
  is_active: boolean;
  updated_at?: string;
};

export type SubscriptionAddon = {
  id: 'base_custom' | ModuleKey;
  name: string;
  description: string;
  price_clp: number;
  category: 'base' | 'module';
  ai_calls_bonus: number;
  sort_order: number;
  is_active: boolean;
  updated_at?: string;
};

export type BillingPayment = {
  id: string;
  organization_id: string;
  khipu_payment_id: string | null;
  transaction_id: string;
  tier: SubscriptionTier;
  selected_modules: ModuleKey[];
  amount_clp: number;
  currency: string;
  status: 'pending' | 'paid' | 'failed' | 'expired';
  payment_url: string | null;
  payer_email: string | null;
  period_start: string | null;
  period_end: string | null;
  raw_webhook?: unknown;
  paid_at: string | null;
  created_at: string;
};

export type Profile = {
  id: string;
  email: string;
  role: 'admin' | 'member';
  status: 'pending' | 'active';
  organization_id: string | null;
  is_super_admin?: boolean;
  full_name?: string | null;
  created_at: string;
};

export type MasterCost = {
  id: string;
  organization_id?: string;
  servicio: string;
  tiempo_detalle: string;
  tipo_evento: string;
  costo: number;
  valor_neto: number;
  valor_total: number;
  ganancia: number;
  tipo_doc_costo?: 'factura' | 'boleta';
  is_demo_base?: boolean;
  created_at: string;
};

export type Event = {
  id: string;
  organization_id?: string;
  name: string;
  client_company: string | null;
  location: string | null;
  event_date: string | null;
  month: number | null;
  year: number | null;
  description: string | null;
  status: 'planning' | 'approved' | 'completed';
  created_by: string | null;
  created_at: string;
  deleted_at: string | null;
  has_retail_sales?: boolean;
  is_demo_base?: boolean;
  quote_token?: string | null;
  quote_status?: QuotePortalStatus;
  quote_sent_at?: string | null;
  quote_accepted_at?: string | null;
  quote_accepted_by_name?: string | null;
  quote_accepted_by_rut?: string | null;
  quote_accepted_by_email?: string | null;
  quote_notes?: string | null;
  currency?: QuoteCurrency;
  exchange_rate?: number;
  min_margin_override_approved?: boolean;
};

export type EventItem = {
  id: string;
  organization_id?: string;
  event_id: string;
  servicio: string;
  detalle: string | null;
  tipo_evento: string | null;
  cantidad: number;
  costo: number;
  ganancia: number;
  valor_neto: number;
  iva: number;
  valor_total: number;
  margen: number;
  tipo_doc_costo?: 'factura' | 'boleta';
  factura_url?: string | null;
  approved: boolean;
  created_at: string;
  parent_id?: string | null;
  iva_incluido?: boolean;
  es_insumo?: boolean;
  source_item_id?: string | null;
  cantidad_original?: number | null;
  is_demo_base?: boolean;
};

// For Supabase client type safety
export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: Organization;
        Insert: Omit<Organization, 'id' | 'created_at' | 'max_demo_events' | 'max_demo_costs'> & {
          id?: string;
          created_at?: string;
          max_demo_events?: number;
          max_demo_costs?: number;
        };
        Update: Partial<Omit<Organization, 'id'>>;
        Relationships: [];
      };
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at'> & { created_at?: string };
        Update: Partial<Omit<Profile, 'id'>>;
        Relationships: [];
      };
      master_costs: {
        Row: MasterCost;
        Insert: Omit<MasterCost, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<MasterCost, 'id'>>;
        Relationships: [];
      };
      events: {
        Row: Event;
        Insert: Omit<Event, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<Event, 'id'>>;
        Relationships: [];
      };
      event_items: {
        Row: EventItem;
        Insert: Omit<EventItem, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<EventItem, 'id'>>;
        Relationships: [];
      };
      subscription_plans: {
        Row: SubscriptionPlan;
        Insert: SubscriptionPlan;
        Update: Partial<Omit<SubscriptionPlan, 'id'>>;
        Relationships: [];
      };
      subscription_addons: {
        Row: SubscriptionAddon;
        Insert: SubscriptionAddon;
        Update: Partial<Omit<SubscriptionAddon, 'id'>>;
        Relationships: [];
      };
      billing_payments: {
        Row: BillingPayment;
        Insert: Omit<BillingPayment, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<BillingPayment, 'id'>>;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
