'use client';

import { calculateFinancials } from '@/lib/utils';
import { INDUSTRY_BLUEPRINTS } from '@/lib/industries';
import { buildIndustryDemoDataset } from '@/lib/industry-demo-datasets';
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

export const LOCAL_DEMO_COOKIE = 'figura_local_demo_mode';
export const LOCAL_DEMO_STORAGE_KEY = 'figura_real_erp_demo_v4';
export const LOCAL_DEMO_CONSENT_KEY = 'figura_demo_cache_consent';

export const LOCAL_DEMO_ORG_ID = 'd0000000-0000-4000-8000-000000000000';
export const LOCAL_DEMO_USER_ID = 'd0000000-0000-4000-8000-000000000099';
export const LOCAL_DEMO_EMAIL = 'visitante@figura-sandbox.cl';

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

function buildInitialDemoDatabase(industryType: IndustryType = 'eventos_banqueteria'): LocalDemoDatabase {
  const bp = INDUSTRY_BLUEPRINTS[industryType] || INDUSTRY_BLUEPRINTS.eventos_banqueteria;
  const companyMeta = INDUSTRY_DEMO_COMPANIES[industryType] || INDUSTRY_DEMO_COMPANIES.eventos_banqueteria;

  const organization: Organization = {
    id: LOCAL_DEMO_ORG_ID,
    name: companyMeta.name,
    slug: 'productora-horizonte-demo',
    invite_code: 'FIGURA-DEMO-2026',
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

  const dataset = buildIndustryDemoDataset(
    industryType,
    LOCAL_DEMO_ORG_ID,
    LOCAL_DEMO_USER_ID
  );

  return {
    organization,
    profile,
    master_costs: dataset.master_costs,
    events: dataset.events,
    event_items: dataset.event_items,
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
    window.dispatchEvent(new CustomEvent('figura:local-db-changed'));
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
    window.dispatchEvent(new Event('figura:org-updated'));
  }
  return fresh;
}

export function switchLocalDemoIndustry(industryType: IndustryType) {
  const fresh = buildInitialDemoDatabase(industryType);
  saveDb(fresh);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('figura:org-updated'));
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
    window.dispatchEvent(new Event('figura:org-updated'));
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
    window.dispatchEvent(new Event('figura:org-updated'));
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
            window.addEventListener('figura:local-db-changed', listener);
          }
          return ch;
        },
        _cleanup: () => {
          if (typeof window !== 'undefined') {
            window.removeEventListener('figura:local-db-changed', listener);
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
