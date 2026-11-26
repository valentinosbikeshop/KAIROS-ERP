import { computeProjectFinancials, isBudgetLineItem, type FinanceItemLike } from '@/lib/finance-core';
import { isDuoProducciones } from '@/lib/entitlements';
import type { ResolvedEntitlements } from '@/types';
import type { Event, Organization, Profile, ProfileRole } from '@/types/database';

export type GranularRole =
  | 'owner'
  | 'admin'
  | 'comercial'
  | 'finanzas'
  | 'operaciones'
  | 'contador_lectura';

export type Permission =
  | 'view_costs_margins'
  | 'edit_catalog'
  | 'create_edit_quotes'
  | 'send_quotes'
  | 'approve_low_margin'
  | 'view_treasury'
  | 'record_transactions'
  | 'export_f29_excel'
  | 'manage_users'
  | 'manage_branding'
  | 'view_audit_logs';

export interface RoleMetadata {
  value: ProfileRole;
  label: string;
  shortLabel: string;
  description: string;
  badgeClass: string;
  requiresScale: boolean;
}

export const ALL_PROFILE_ROLES: ProfileRole[] = [
  'owner',
  'admin',
  'comercial',
  'finanzas',
  'operaciones',
  'contador_lectura',
  'member',
];

export const GRANULAR_SCALE_ROLES: ProfileRole[] = [
  'owner',
  'admin',
  'comercial',
  'finanzas',
  'operaciones',
  'contador_lectura',
];

export const ROLE_METADATA: Record<ProfileRole, RoleMetadata> = {
  owner: {
    value: 'owner',
    label: 'Propietario / Gerencia General',
    shortLabel: 'Propietario',
    description: 'Control total de empresa, usuarios, marca blanca, finanzas y aprobación de márgenes.',
    badgeClass: 'bg-slate-900 text-amber-300 border-slate-700',
    requiresScale: false,
  },
  admin: {
    value: 'admin',
    label: 'Administrador de Empresa',
    shortLabel: 'Admin',
    description: 'Gestión integral de equipo, catálogo, proyectos, tesorería y políticas comerciales.',
    badgeClass: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
    requiresScale: false,
  },
  comercial: {
    value: 'comercial',
    label: 'Comercial / Ventas',
    shortLabel: 'Comercial',
    description: 'Crea y envía cotizaciones; oculta costos internos sensibles y tesorería. Bloqueado bajo piso de margen.',
    badgeClass: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
    requiresScale: true,
  },
  finanzas: {
    value: 'finanzas',
    label: 'Finanzas & Control',
    shortLabel: 'Finanzas',
    description: 'Acceso completo a costos, márgenes, tesorería, F29, auditoría y aprobación de excepciones de margen.',
    badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    requiresScale: true,
  },
  operaciones: {
    value: 'operaciones',
    label: 'Operaciones / Terreno',
    shortLabel: 'Operaciones',
    description: 'Gestiona catálogo y partidas operativas sin ver márgenes comerciales, utilidades ni tesorería.',
    badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
    requiresScale: true,
  },
  contador_lectura: {
    value: 'contador_lectura',
    label: 'Contador (Solo Lectura)',
    shortLabel: 'Contador',
    description: 'Consulta costos, tesorería, auditoría y exporta libros F29/Excel sin permisos de modificación.',
    badgeClass: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
    requiresScale: true,
  },
  member: {
    value: 'member',
    label: 'Colaborador (Estándar)',
    shortLabel: 'Colaborador',
    description: 'Rol estándar de planes iniciales: opera proyectos sin privilegios administrativos.',
    badgeClass: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30',
    requiresScale: false,
  },
};

export const PERMISSION_LABELS: Record<Permission, string> = {
  view_costs_margins: 'Ver costos internos y márgenes',
  edit_catalog: 'Editar catálogo maestro',
  create_edit_quotes: 'Crear y editar cotizaciones',
  send_quotes: 'Enviar PDF y Portal /q',
  approve_low_margin: 'Aprobar cotizaciones bajo margen mínimo',
  view_treasury: 'Ver tesorería y F29',
  record_transactions: 'Registrar abonos, gastos y conciliar',
  export_f29_excel: 'Exportar Excel contable y F29',
  manage_users: 'Gestionar usuarios y roles',
  manage_branding: 'Configurar marca, banco y políticas',
  view_audit_logs: 'Consultar y exportar bitácora de auditoría',
};

const SCALE_PERMISSION_MATRIX: Record<GranularRole, Record<Permission, boolean>> = {
  owner: {
    view_costs_margins: true,
    edit_catalog: true,
    create_edit_quotes: true,
    send_quotes: true,
    approve_low_margin: true,
    view_treasury: true,
    record_transactions: true,
    export_f29_excel: true,
    manage_users: true,
    manage_branding: true,
    view_audit_logs: true,
  },
  admin: {
    view_costs_margins: true,
    edit_catalog: true,
    create_edit_quotes: true,
    send_quotes: true,
    approve_low_margin: true,
    view_treasury: true,
    record_transactions: true,
    export_f29_excel: true,
    manage_users: true,
    manage_branding: true,
    view_audit_logs: true,
  },
  comercial: {
    view_costs_margins: false,
    edit_catalog: true,
    create_edit_quotes: true,
    send_quotes: true,
    approve_low_margin: false,
    view_treasury: false,
    record_transactions: false,
    export_f29_excel: false,
    manage_users: false,
    manage_branding: false,
    view_audit_logs: false,
  },
  finanzas: {
    view_costs_margins: true,
    edit_catalog: true,
    create_edit_quotes: true,
    send_quotes: true,
    approve_low_margin: true,
    view_treasury: true,
    record_transactions: true,
    export_f29_excel: true,
    manage_users: false,
    manage_branding: false,
    view_audit_logs: true,
  },
  operaciones: {
    view_costs_margins: false,
    edit_catalog: true,
    create_edit_quotes: true,
    send_quotes: false,
    approve_low_margin: false,
    view_treasury: false,
    record_transactions: false,
    export_f29_excel: false,
    manage_users: false,
    manage_branding: false,
    view_audit_logs: false,
  },
  contador_lectura: {
    view_costs_margins: true,
    edit_catalog: false,
    create_edit_quotes: false,
    send_quotes: false,
    approve_low_margin: false,
    view_treasury: true,
    record_transactions: false,
    export_f29_excel: true,
    manage_users: false,
    manage_branding: false,
    view_audit_logs: true,
  },
};

const LEGACY_PERMISSION_MATRIX: Record<'admin' | 'member', Record<Permission, boolean>> = {
  admin: {
    view_costs_margins: true,
    edit_catalog: true,
    create_edit_quotes: true,
    send_quotes: true,
    approve_low_margin: true,
    view_treasury: true,
    record_transactions: true,
    export_f29_excel: true,
    manage_users: true,
    manage_branding: true,
    view_audit_logs: false,
  },
  member: {
    view_costs_margins: true,
    edit_catalog: false,
    create_edit_quotes: true,
    send_quotes: true,
    approve_low_margin: false,
    view_treasury: true,
    record_transactions: true,
    export_f29_excel: true,
    manage_users: false,
    manage_branding: false,
    view_audit_logs: false,
  },
};

/**
 * Indica si la organización tiene RBAC granular y Bitácora habilitados (Plan Corporativo & Escala o exento).
 */
export function hasGranularRbac(entitlements?: ResolvedEntitlements | null): boolean {
  if (!entitlements) return false;
  if (entitlements.isExempt) return true;
  if (entitlements.isExpiredLock) return false;
  return Boolean(entitlements.modules?.mod_team_branding);
}

/**
 * Verifica si un perfil posee rol administrativo de empresa o SuperAdmin.
 */
export function isAdminRole(profile?: Pick<Profile, 'role' | 'is_super_admin' | 'status'> | null): boolean {
  if (!profile) return false;
  if (profile.is_super_admin) return profile.status === 'active';
  return profile.status === 'active' && (profile.role === 'owner' || profile.role === 'admin');
}

/**
 * Normaliza roles legados (`admin`/`member`) y degrada roles granulares a `admin`/`member` fuera de Scale.
 */
export function normalizeEffectiveRole(
  role?: ProfileRole | string | null,
  entitlements?: ResolvedEntitlements | null
): ProfileRole {
  const safeRole = (ALL_PROFILE_ROLES.includes(role as ProfileRole) ? role : 'member') as ProfileRole;

  if (!hasGranularRbac(entitlements)) {
    return safeRole === 'owner' || safeRole === 'admin' ? 'admin' : 'member';
  }

  // En Scale, un `member` legado opera con perfil comercial estándar sin privilegios administrativos
  if (safeRole === 'member') {
    return 'comercial';
  }

  return safeRole;
}

/**
 * Evaluador único de permisos RBAC.
 * - SuperAdmin activo tiene acceso total.
 * - Fuera de `scale` (`!mod_team_branding`), degrada limpiamente a `admin` / `member`.
 * - Dentro de `scale`, aplica la matriz granular de 6 roles.
 */
export function can(
  profile: Pick<Profile, 'role' | 'status' | 'is_super_admin'> | null | undefined,
  permission: Permission,
  entitlements?: ResolvedEntitlements | null
): boolean {
  if (!profile) return false;
  if (profile.status !== 'active') return false;
  if (profile.is_super_admin) return true;

  if (hasGranularRbac(entitlements)) {
    const effective = normalizeEffectiveRole(profile.role, entitlements);
    const matrixRole = (effective === 'member' ? 'comercial' : effective) as GranularRole;
    return Boolean(SCALE_PERMISSION_MATRIX[matrixRole]?.[permission]);
  }

  const legacyRole: 'admin' | 'member' =
    profile.role === 'owner' || profile.role === 'admin' ? 'admin' : 'member';
  return Boolean(LEGACY_PERMISSION_MATRIX[legacyRole][permission]);
}

/**
 * Devuelve los roles asignables según el plan actual de la organización.
 */
export function getAssignableRoles(
  entitlements?: ResolvedEntitlements | null,
  options?: { actorIsOwnerOrSuperAdmin?: boolean }
): RoleMetadata[] {
  const granular = hasGranularRbac(entitlements);
  const pool: ProfileRole[] = granular
    ? ['owner', 'admin', 'comercial', 'finanzas', 'operaciones', 'contador_lectura']
    : ['admin', 'member'];

  return pool
    .filter((r) => (r === 'owner' ? Boolean(options?.actorIsOwnerOrSuperAdmin) : true))
    .map((r) => ROLE_METADATA[r]);
}

export type MarginCheckProject = Partial<
  Pick<Event, 'id' | 'name' | 'min_margin_override_approved' | 'tax_regime'>
> & {
  items?: FinanceItemLike[];
  margin_pct?: number;
  margen_pct?: number;
};

export interface MarginPolicyEvaluation {
  requiresApproval: boolean;
  status: 'ok' | 'requires_approval' | 'override_approved';
  currentMarginPct: number;
  minMarginPct: number;
  canApprove: boolean;
  blockedForUser: boolean;
  reason?: string;
}

/**
 * Calcula el margen operacional del proyecto (excluyendo gastos reembolsables / pass-through)
 * y determina si está por debajo de `org.min_margin_pct` sin excepción aprobada.
 */
export function evaluateMarginPolicy(
  project: MarginCheckProject | null | undefined,
  org: Organization | null | undefined,
  items?: FinanceItemLike[],
  profile?: Pick<Profile, 'role' | 'status' | 'is_super_admin'> | null,
  entitlements?: ResolvedEntitlements | null
): MarginPolicyEvaluation {
  const minMarginPct = Math.max(
    0,
    Number(org?.min_margin_pct ?? org?.bank_info?.__saas_config?.min_margin_pct ?? 15)
  );
  const canApprove = can(profile, 'approve_low_margin', entitlements);

  if (!project || isDuoProducciones(org) || minMarginPct <= 0) {
    return {
      requiresApproval: false,
      status: 'ok',
      currentMarginPct: 100,
      minMarginPct,
      canApprove,
      blockedForUser: false,
    };
  }

  const candidateItems = Array.isArray(items)
    ? items
    : Array.isArray(project.items)
    ? project.items
    : null;

  let currentMarginPct = 100;
  let hasBudgetLines = false;

  if (candidateItems) {
    const budgetItems = candidateItems.filter((it) => isBudgetLineItem(it));
    const approvedBudgetItems = budgetItems.filter((it) => it.approved !== false);
    const scopeItems = approvedBudgetItems.length > 0 ? approvedBudgetItems : budgetItems;
    hasBudgetLines = scopeItems.length > 0;

    if (hasBudgetLines) {
      const fin = computeProjectFinancials(scopeItems, {
        taxRegime: project.tax_regime || org?.tax_regime || 'afecto_iva',
        honorariosPolicy:
          org?.honorarios_retention_policy ||
          org?.bank_info?.__saas_config?.honorarios_retention_policy ||
          'contractor',
      });
      currentMarginPct =
        fin.facturacionNetaSinReembolsables > 0
          ? fin.margenOperacionalPct
          : fin.facturacionNeta > 0
          ? fin.margenVentaPct
          : 100;
    }
  } else if (
    typeof project.margin_pct === 'number' ||
    typeof project.margen_pct === 'number'
  ) {
    hasBudgetLines = true;
    currentMarginPct = Number(project.margin_pct ?? project.margen_pct ?? 100);
  }

  const belowFloor = hasBudgetLines && currentMarginPct < minMarginPct;
  const overrideApproved = Boolean(project.min_margin_override_approved);

  if (!belowFloor) {
    return {
      requiresApproval: false,
      status: 'ok',
      currentMarginPct,
      minMarginPct,
      canApprove,
      blockedForUser: false,
    };
  }

  if (overrideApproved) {
    return {
      requiresApproval: false,
      status: 'override_approved',
      currentMarginPct,
      minMarginPct,
      canApprove,
      blockedForUser: false,
    };
  }

  const reason = `El margen operacional (${currentMarginPct.toFixed(1)}%) está bajo el piso mínimo autorizado (${minMarginPct}%). Requiere aprobación de Gerencia o Finanzas antes de emitir o aceptar la cotización.`;

  return {
    requiresApproval: true,
    status: 'requires_approval',
    currentMarginPct,
    minMarginPct,
    canApprove,
    blockedForUser: !canApprove,
    reason,
  };
}

/**
 * Helper booleano directo para bloquear envío/aceptación de cotizaciones bajo el margen mínimo.
 */
export function requiresMarginApproval(
  project: MarginCheckProject | null | undefined,
  org: Organization | null | undefined,
  items?: FinanceItemLike[]
): boolean {
  return evaluateMarginPolicy(project, org, items).requiresApproval;
}

export function getScalePermissionMatrix(): Array<{
  permission: Permission;
  label: string;
  roles: Record<GranularRole, boolean>;
}> {
  return (Object.keys(PERMISSION_LABELS) as Permission[]).map((permission) => ({
    permission,
    label: PERMISSION_LABELS[permission],
    roles: {
      owner: SCALE_PERMISSION_MATRIX.owner[permission],
      admin: SCALE_PERMISSION_MATRIX.admin[permission],
      comercial: SCALE_PERMISSION_MATRIX.comercial[permission],
      finanzas: SCALE_PERMISSION_MATRIX.finanzas[permission],
      operaciones: SCALE_PERMISSION_MATRIX.operaciones[permission],
      contador_lectura: SCALE_PERMISSION_MATRIX.contador_lectura[permission],
    },
  }));
}
