import { LOCAL_DEMO_STORAGE_KEY, isLocalDemoModeClient } from '@/lib/supabase/local-demo-client';
import type { AuditLog } from '@/types/database';

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'restore'
  | 'approve_margin'
  | 'approve_user'
  | 'role_change'
  | 'branding_change'
  | 'policy_change'
  | 'quote_sent'
  | 'quote_accepted'
  | 'quote_rejected'
  | 'transaction_recorded'
  | 'export_csv'
  | 'export_excel'
  | 'login_mfa'
  | (string & {});

export type AuditEntityType =
  | 'event'
  | 'event_item'
  | 'master_cost'
  | 'profile'
  | 'organization'
  | 'transaction'
  | 'quote'
  | 'margin_policy'
  | 'audit_logs'
  | (string & {});

export interface AuditActorContext {
  id?: string | null;
  email?: string | null;
  role?: string | null;
}

export interface AuditEntityRef {
  type: AuditEntityType;
  id?: string | null;
  label?: string | null;
}

export interface LogAuditInput {
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string | null;
  entityLabel?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  organizationId?: string | null;
  actor?: AuditActorContext | null;
  ipAddress?: string | null;
}

export interface AuditLogQueryFilters {
  page?: number;
  pageSize?: number;
  actor?: string;
  action?: string;
  entityType?: string;
  from?: string;
  to?: string;
  search?: string;
  organizationId?: string;
}

export interface AuditLogsPageResult {
  logs: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

const DEMO_AUDIT_MAX_ENTRIES = 300;

function appendLocalDemoAuditLog(entry: AuditLog): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(LOCAL_DEMO_STORAGE_KEY);
    if (!raw) return;
    const db = JSON.parse(raw);
    const existing: AuditLog[] = Array.isArray(db.audit_logs) ? db.audit_logs : [];
    db.audit_logs = [entry, ...existing].slice(0, DEMO_AUDIT_MAX_ENTRIES);
    window.localStorage.setItem(LOCAL_DEMO_STORAGE_KEY, JSON.stringify(db));
    window.dispatchEvent(new CustomEvent('figura:local-db-changed'));
  } catch {
    // No bloquear operación principal por cuota de localStorage
  }
}

export function readLocalDemoAuditLogs(filters: AuditLogQueryFilters = {}): AuditLogsPageResult {
  if (typeof window === 'undefined') {
    return { logs: [], total: 0, page: 1, pageSize: 25, hasMore: false };
  }
  try {
    const raw = window.localStorage.getItem(LOCAL_DEMO_STORAGE_KEY);
    const db = raw ? JSON.parse(raw) : null;
    let list: AuditLog[] = Array.isArray(db?.audit_logs) ? db.audit_logs : [];

    if (filters.actor) {
      const q = filters.actor.toLowerCase();
      list = list.filter((l) => (l.actor_email || '').toLowerCase().includes(q));
    }
    if (filters.action) {
      list = list.filter((l) => l.action === filters.action);
    }
    if (filters.entityType) {
      list = list.filter((l) => l.entity_type === filters.entityType);
    }
    if (filters.from) {
      const fromTs = new Date(filters.from).getTime();
      if (!Number.isNaN(fromTs)) {
        list = list.filter((l) => new Date(l.created_at).getTime() >= fromTs);
      }
    }
    if (filters.to) {
      const toDate = new Date(filters.to);
      toDate.setHours(23, 59, 59, 999);
      const toTs = toDate.getTime();
      if (!Number.isNaN(toTs)) {
        list = list.filter((l) => new Date(l.created_at).getTime() <= toTs);
      }
    }
    if (filters.search) {
      const s = filters.search.toLowerCase();
      list = list.filter(
        (l) =>
          (l.entity_label || '').toLowerCase().includes(s) ||
          (l.actor_email || '').toLowerCase().includes(s) ||
          (l.action || '').toLowerCase().includes(s) ||
          (l.entity_type || '').toLowerCase().includes(s)
      );
    }

    list = [...list].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const page = Math.max(1, Number(filters.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize) || 25));
    const start = (page - 1) * pageSize;
    const paged = list.slice(start, start + pageSize);

    return {
      logs: paged,
      total: list.length,
      page,
      pageSize,
      hasMore: start + paged.length < list.length,
    };
  } catch {
    return { logs: [], total: 0, page: 1, pageSize: 25, hasMore: false };
  }
}

function normalizeAuditInput(
  eventOrInput: AuditAction | LogAuditInput,
  entity?: AuditEntityType | AuditEntityRef,
  diffOrOptions?: {
    entityId?: string | null;
    entityLabel?: string | null;
    before?: Record<string, unknown> | null;
    after?: Record<string, unknown> | null;
    metadata?: Record<string, unknown> | null;
    organizationId?: string | null;
    actor?: AuditActorContext | null;
    ipAddress?: string | null;
  }
): LogAuditInput {
  if (typeof eventOrInput === 'object' && eventOrInput !== null) {
    return eventOrInput;
  }

  const entityRef: AuditEntityRef =
    typeof entity === 'object' && entity !== null
      ? entity
      : { type: entity || 'event' };

  return {
    action: eventOrInput,
    entityType: entityRef.type,
    entityId: diffOrOptions?.entityId ?? entityRef.id ?? null,
    entityLabel: diffOrOptions?.entityLabel ?? entityRef.label ?? null,
    before: diffOrOptions?.before ?? null,
    after: diffOrOptions?.after ?? null,
    metadata: diffOrOptions?.metadata ?? null,
    organizationId: diffOrOptions?.organizationId ?? null,
    actor: diffOrOptions?.actor ?? null,
    ipAddress: diffOrOptions?.ipAddress ?? null,
  };
}

/**
 * Registra un evento inmutable en la Bitácora de Auditoría (`audit_logs`):
 * - En servidor: inserta directo en Supabase con `service_role`.
 * - En cliente autenticado: envía a `POST /api/audit` (actor/org derivados del JWT en servidor).
 * - En Modo Demo local: persiste en el ledger de `localStorage`.
 */
export async function logAudit(input: LogAuditInput): Promise<{ ok: boolean; id?: string }>;
export async function logAudit(
  action: AuditAction,
  entity: AuditEntityType | AuditEntityRef,
  options?: {
    entityId?: string | null;
    entityLabel?: string | null;
    before?: Record<string, unknown> | null;
    after?: Record<string, unknown> | null;
    metadata?: Record<string, unknown> | null;
    organizationId?: string | null;
    actor?: AuditActorContext | null;
    ipAddress?: string | null;
  }
): Promise<{ ok: boolean; id?: string }>;
export async function logAudit(
  eventOrInput: AuditAction | LogAuditInput,
  entity?: AuditEntityType | AuditEntityRef,
  diffOrOptions?: {
    entityId?: string | null;
    entityLabel?: string | null;
    before?: Record<string, unknown> | null;
    after?: Record<string, unknown> | null;
    metadata?: Record<string, unknown> | null;
    organizationId?: string | null;
    actor?: AuditActorContext | null;
    ipAddress?: string | null;
  }
): Promise<{ ok: boolean; id?: string }> {
  const payload = normalizeAuditInput(eventOrInput, entity, diffOrOptions);

  // Cliente (navegador)
  if (typeof window !== 'undefined') {
    if (isLocalDemoModeClient()) {
      let demoOrgId = payload.organizationId || 'd0000000-0000-4000-8000-000000000000';
      let demoActorEmail = payload.actor?.email || 'visitante@figura-sandbox.cl';
      let demoActorRole = payload.actor?.role || 'admin';
      let demoActorId = payload.actor?.id || 'd0000000-0000-4000-8000-000000000099';

      try {
        const raw = window.localStorage.getItem(LOCAL_DEMO_STORAGE_KEY);
        const db = raw ? JSON.parse(raw) : null;
        if (db?.organization?.id) demoOrgId = db.organization.id;
        if (db?.profile) {
          demoActorEmail = payload.actor?.email || db.profile.email || demoActorEmail;
          demoActorRole = payload.actor?.role || db.profile.role || demoActorRole;
          demoActorId = payload.actor?.id || db.profile.id || demoActorId;
        }
      } catch {
        // Ignorar
      }

      const id = `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      appendLocalDemoAuditLog({
        id,
        organization_id: demoOrgId,
        actor_id: demoActorId,
        actor_email: demoActorEmail,
        actor_role: demoActorRole,
        action: payload.action,
        entity_type: payload.entityType,
        entity_id: payload.entityId ?? null,
        entity_label: payload.entityLabel ?? null,
        before_data: payload.before ?? null,
        after_data: payload.after ?? null,
        metadata: payload.metadata ?? null,
        ip_address: null,
        created_at: new Date().toISOString(),
      });
      return { ok: true, id };
    }

    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: payload.action,
          entity_type: payload.entityType,
          entity_id: payload.entityId ?? null,
          entity_label: payload.entityLabel ?? null,
          before_data: payload.before ?? null,
          after_data: payload.after ?? null,
          metadata: payload.metadata ?? null,
        }),
      });
      if (!res.ok) return { ok: false };
      const data = await res.json().catch(() => ({}));
      return { ok: true, id: data?.log?.id };
    } catch {
      return { ok: false };
    }
  }

  // Servidor (Node.js Route Handlers)
  if (!payload.organizationId) {
    return { ok: false };
  }

  try {
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('audit_logs')
      .insert({
        organization_id: payload.organizationId,
        actor_id: payload.actor?.id ?? null,
        actor_email: payload.actor?.email ?? null,
        actor_role: payload.actor?.role ?? null,
        action: payload.action,
        entity_type: payload.entityType,
        entity_id: payload.entityId ?? null,
        entity_label: payload.entityLabel ?? null,
        before_data: payload.before ?? null,
        after_data: payload.after ?? null,
        metadata: payload.metadata ?? null,
        ip_address: payload.ipAddress ?? null,
      })
      .select('id')
      .single();

    if (error) {
      // No romper operación principal si la tabla aún no fue migrada en remoto
      if (error.code !== '42P01' && error.code !== 'PGRST205') {
        console.warn('[audit] No se pudo insertar audit_log:', error.message);
      }
      return { ok: false };
    }

    return { ok: true, id: data?.id };
  } catch (err) {
    console.warn('[audit] Error registrando auditoría server-side:', err);
    return { ok: false };
  }
}

/**
 * Consulta paginada de bitácora (desde `/api/audit` o ledger Demo en `localStorage`).
 */
export async function fetchAuditLogs(
  filters: AuditLogQueryFilters = {}
): Promise<AuditLogsPageResult> {
  if (typeof window !== 'undefined' && isLocalDemoModeClient()) {
    return readLocalDemoAuditLogs(filters);
  }

  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
  if (filters.actor) params.set('actor', filters.actor);
  if (filters.action) params.set('action', filters.action);
  if (filters.entityType) params.set('entityType', filters.entityType);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (filters.search) params.set('search', filters.search);
  if (filters.organizationId) params.set('organizationId', filters.organizationId);

  const res = await fetch(`/api/audit?${params.toString()}`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || 'No se pudo consultar la bitácora de auditoría.');
  }

  return {
    logs: data.logs || [],
    total: Number(data.total) || 0,
    page: Number(data.page) || 1,
    pageSize: Number(data.pageSize) || 25,
    hasMore: Boolean(data.hasMore),
  };
}

function escapeCsvCell(val: unknown): string {
  const raw = val === null || val === undefined ? '' : typeof val === 'string' ? val : JSON.stringify(val);
  const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function buildAuditLogsCsv(logs: AuditLog[]): string {
  const headers = [
    'Fecha (ISO)',
    'Usuario',
    'Rol',
    'Acción',
    'Entidad',
    'ID Entidad',
    'Detalle / Etiqueta',
    'Antes',
    'Después',
  ];
  const rows = logs.map((log) => [
    log.created_at,
    log.actor_email || '',
    log.actor_role || '',
    log.action,
    log.entity_type,
    log.entity_id || '',
    log.entity_label || '',
    log.before_data ? JSON.stringify(log.before_data) : '',
    log.after_data ? JSON.stringify(log.after_data) : '',
  ]);
  return '\uFEFF' + [headers, ...rows].map((r) => r.map(escapeCsvCell).join(',')).join('\r\n');
}

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  create: 'Creación',
  update: 'Modificación',
  delete: 'Eliminación',
  restore: 'Restauración',
  approve_margin: 'Aprobación de Margen',
  approve_user: 'Aprobación de Usuario',
  role_change: 'Cambio de Rol',
  branding_change: 'Cambio de Marca / Banco',
  policy_change: 'Cambio de Política',
  quote_sent: 'Envío de Cotización',
  quote_accepted: 'Aceptación Cliente',
  quote_rejected: 'Rechazo Cliente',
  transaction_recorded: 'Movimiento Financiero',
  export_csv: 'Exportación CSV',
  export_excel: 'Exportación Excel',
  login_mfa: 'Verificación 2FA',
};

export const AUDIT_ENTITY_LABELS: Record<string, string> = {
  event: 'Proyecto / Cotización',
  event_item: 'Partida Presupuestaria',
  master_cost: 'Tarifa de Catálogo',
  profile: 'Usuario / Rol',
  organization: 'Empresa / Marca',
  transaction: 'Transacción / Caja',
  quote: 'Portal Cotización',
  margin_policy: 'Política de Margen',
  audit_logs: 'Bitácora',
};
