'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Shield,
  Loader2,
  Building2,
  Users,
  Plus,
  Copy,
  Check,
  RotateCcw,
  Trash2,
  KeyRound,
  Lock,
  Sparkles,
  Power,
  Paintbrush,
  LogIn,
  ShieldCheck,
  CreditCard,
  FileText,
  Percent,
  UserPlus,
  RefreshCw,
} from 'lucide-react';
import { PlansAdminTab } from '@/components/governance/plans-admin-tab';
import { AuditLogsTab } from '@/components/governance/audit-logs-tab';
import { PendingUsersTable } from '@/components/governance/pending-users-table';
import {
  CompanyBrandingDialog,
  LogoUploadField,
} from '@/components/governance/company-branding-dialog';
import { MfaSettingsCard } from '@/components/auth/mfa-settings-card';
import { useWorkspaceConfig } from '@/hooks/use-workspace-config';
import type {
  HonorariosRetentionPolicy,
  Organization,
  Profile,
  ProfileRole,
} from '@/types';
import {
  ROLE_METADATA,
  getAssignableRoles,
  getScalePermissionMatrix,
  type GranularRole,
} from '@/lib/rbac';
import { logAudit } from '@/lib/audit';
import { CompanyLogoMark } from '@/components/ui/figura-logo';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DUO_ORG_SLUG } from '@/lib/constants';

interface CompanyRow extends Organization {
  users_count: number;
  events_count: number;
}

interface UserRow extends Profile {
  organizations?: {
    id: string;
    name: string;
    slug: string;
    is_demo: boolean;
  } | null;
}

interface SeatSummary {
  activeCount: number;
  maxUsers: number | null;
  hasGranularRbac: boolean;
  tier: string;
}

export default function GovernancePage() {
  const {
    profile,
    organization,
    loading: userLoading,
    isAdmin,
    isOwner,
    isSuperAdmin,
    isDemo,
    entitlements,
    brandingCaps,
    hasGranularRbac,
  } = useWorkspaceConfig();

  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [seatSummary, setSeatSummary] = useState<SeatSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('');

  // Pending user assignment state
  const [pendingOrgChoice, setPendingOrgChoice] = useState<Record<string, string>>({});
  const [pendingRoleChoice, setPendingRoleChoice] = useState<Record<string, ProfileRole>>({});

  // Create company & branding dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [brandingTarget, setBrandingTarget] = useState<Organization | null>(null);
  const [formState, setFormState] = useState({
    name: '',
    legal_name: '',
    rut: '',
    location: '',
    contact_email: '',
    contact_phone: '',
    logo_url: '',
    invite_code: '',
    seedStarterCatalog: true,
    adminEmail: '',
    adminPassword: '',
  });

  // Invite / Create user dialog state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: '',
    full_name: '',
    password: '',
    role: 'comercial' as ProfileRole,
    organization_id: '',
  });

  // Quick policy form state (Margin floor + 15.25% retention policy)
  const [quickMarginFloor, setQuickMarginFloor] = useState('15');
  const [quickRetentionPolicy, setQuickRetentionPolicy] =
    useState<HonorariosRetentionPolicy>('contractor');
  const [savingPolicy, setSavingPolicy] = useState(false);

  const canAccess = !userLoading && (isSuperAdmin || (!isDemo && isAdmin));

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const t = sp.get('tab');
      if (t) setActiveTab(t);
    }
  }, []);

  useEffect(() => {
    if (!activeTab && !userLoading) {
      setActiveTab(isSuperAdmin ? 'companies' : 'users');
    }
  }, [activeTab, isSuperAdmin, userLoading]);

  useEffect(() => {
    if (organization) {
      setQuickMarginFloor(
        String(
          organization.min_margin_pct ??
            organization.bank_info?.__saas_config?.min_margin_pct ??
            15
        )
      );
      setQuickRetentionPolicy(
        organization.honorarios_retention_policy ||
          organization.bank_info?.__saas_config?.honorarios_retention_policy ||
          'contractor'
      );
    }
  }, [organization]);

  const assignableRoles = useMemo(
    () =>
      getAssignableRoles(entitlements, {
        actorIsOwnerOrSuperAdmin: isOwner || isSuperAdmin,
      }),
    [entitlements, isOwner, isSuperAdmin]
  );

  useEffect(() => {
    if (assignableRoles.length > 0 && !assignableRoles.some((r) => r.value === inviteForm.role)) {
      setInviteForm((prev) => ({
        ...prev,
        role: assignableRoles[assignableRoles.length - 1]?.value || 'member',
      }));
    }
  }, [assignableRoles, inviteForm.role]);

  const fetchGovernanceData = useCallback(async () => {
    if (!canAccess) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const requests: Promise<Response>[] = [fetch('/api/admin/users')];
      if (isSuperAdmin) {
        requests.push(fetch('/api/admin/companies'));
      }

      const [usersRes, companiesRes] = await Promise.all(requests);
      const usersJson = await usersRes.json();

      if (usersRes.ok) {
        const fetchedUsers: UserRow[] = usersJson.users || [];
        setUsers(fetchedUsers);
        if (usersJson.seatSummary) {
          setSeatSummary(usersJson.seatSummary);
        }

        const orgDefaults: Record<string, string> = {};
        const roleDefaults: Record<string, ProfileRole> = {};
        fetchedUsers.forEach((u) => {
          orgDefaults[u.id] = u.organization_id || organization?.id || '';
          roleDefaults[u.id] = u.role || 'member';
        });
        setPendingOrgChoice(orgDefaults);
        setPendingRoleChoice(roleDefaults);
      }

      if (companiesRes) {
        const companiesJson = await companiesRes.json();
        if (companiesRes.ok) {
          setCompanies(companiesJson.companies || []);
        }
      }
    } catch (err) {
      console.error('Error fetching governance data:', err);
      setFeedback({ type: 'error', message: 'Error al cargar los datos de gobernanza.' });
    } finally {
      setLoading(false);
    }
  }, [canAccess, isSuperAdmin, organization?.id]);

  useEffect(() => {
    if (!userLoading) {
      fetchGovernanceData();
    }
  }, [userLoading, fetchGovernanceData]);

  const handleCopyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(label);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      alert(text);
    }
  };

  const handleRegenerateInviteCode = async () => {
    if (!organization) return;
    if (
      !window.confirm(
        '¿Desea generar un nuevo código de invitación? El código anterior dejará de vincular nuevos registros.'
      )
    ) {
      return;
    }

    setActionLoadingId('regen-invite');
    setFeedback(null);
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const prefix = (organization.name || 'EMP')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 5) || 'EMP';
    const nextCode = `${prefix}-${randomSuffix}`;

    try {
      const res = await fetch('/api/admin/companies', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: organization.id, invite_code: nextCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: 'error', message: data.error || 'No se pudo regenerar el código.' });
        return;
      }
      await logAudit({
        action: 'policy_change',
        entityType: 'organization',
        entityId: organization.id,
        entityLabel: 'Regeneración código de invitación',
        before: { invite_code: organization.invite_code },
        after: { invite_code: nextCode },
        organizationId: organization.id,
        actor: { id: profile?.id, email: profile?.email, role: profile?.role },
      });
      window.dispatchEvent(new Event('figura:org-updated'));
      setFeedback({ type: 'success', message: `Nuevo código de invitación activo: ${nextCode}` });
      await fetchGovernanceData();
    } catch {
      setFeedback({ type: 'error', message: 'Error de red al regenerar el código.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSaveQuickPolicies = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization) return;

    const raw = quickMarginFloor.trim();
    const parsedFloor = raw === '' ? 15 : Math.min(95, Math.max(0, Number(raw)));
    if (Number.isNaN(parsedFloor)) {
      setFeedback({ type: 'error', message: 'Ingrese un porcentaje de margen válido (0 a 95).' });
      return;
    }

    setSavingPolicy(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/companies', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: organization.id,
          min_margin_pct: parsedFloor,
          honorarios_retention_policy: quickRetentionPolicy,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: 'error', message: data.error || 'No se pudieron guardar las políticas.' });
        return;
      }
      await logAudit({
        action: 'policy_change',
        entityType: 'margin_policy',
        entityId: organization.id,
        entityLabel: `Piso margen ${parsedFloor}% · Honorarios ${quickRetentionPolicy}`,
        before: {
          min_margin_pct: organization.min_margin_pct ?? 15,
          honorarios_retention_policy: organization.honorarios_retention_policy ?? 'contractor',
        },
        after: {
          min_margin_pct: parsedFloor,
          honorarios_retention_policy: quickRetentionPolicy,
        },
        organizationId: organization.id,
        actor: { id: profile?.id, email: profile?.email, role: profile?.role },
      });
      window.dispatchEvent(new Event('figura:org-updated'));
      setFeedback({
        type: 'success',
        message: 'Política de margen mínimo y retención 15,25% actualizada.',
      });
    } catch {
      setFeedback({ type: 'error', message: 'Error de conexión al guardar políticas.' });
    } finally {
      setSavingPolicy(false);
    }
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/admin/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formState),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: 'error', message: data.error || 'No se pudo crear la empresa.' });
        return;
      }

      setFeedback({
        type: 'success',
        message: data.warning ? `${data.message} (${data.warning})` : data.message,
      });
      setCreateOpen(false);
      setFormState({
        name: '',
        legal_name: '',
        rut: '',
        location: '',
        contact_email: '',
        contact_phone: '',
        logo_url: '',
        invite_code: '',
        seedStarterCatalog: true,
        adminEmail: '',
        adminPassword: '',
      });
      await fetchGovernanceData();
    } catch {
      setFeedback({ type: 'error', message: 'Error de red al crear la empresa.' });
    } finally {
      setCreating(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inviteForm.password.length < 8) {
      setFeedback({
        type: 'error',
        message: 'La contraseña temporal debe tener al menos 8 caracteres.',
      });
      return;
    }

    setInviting(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteForm.email.trim(),
          full_name: inviteForm.full_name.trim() || undefined,
          password: inviteForm.password,
          role: inviteForm.role,
          ...(isSuperAdmin && inviteForm.organization_id
            ? { organization_id: inviteForm.organization_id }
            : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: 'error', message: data.error || 'No se pudo crear el usuario.' });
        return;
      }

      setInviteOpen(false);
      setInviteForm({
        email: '',
        full_name: '',
        password: '',
        role: assignableRoles[assignableRoles.length - 1]?.value || 'member',
        organization_id: '',
      });
      setFeedback({
        type: 'success',
        message: `Usuario ${data.user?.email} activado con rol ${
          ROLE_METADATA[data.user?.role as ProfileRole]?.shortLabel || data.user?.role
        }.`,
      });
      await fetchGovernanceData();
    } catch {
      setFeedback({ type: 'error', message: 'Error de conexión al crear el usuario.' });
    } finally {
      setInviting(false);
    }
  };

  const handleToggleCompanyActive = async (company: CompanyRow) => {
    const actionLabel = company.is_active ? 'suspender' : 'reactivar';
    if (!confirm(`¿Desea ${actionLabel} el acceso a "${company.name}"?`)) return;

    setActionLoadingId(company.id);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/companies', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: company.id, is_active: !company.is_active }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: 'error', message: data.error || 'No se pudo actualizar la empresa.' });
        return;
      }
      setFeedback({
        type: 'success',
        message: `Empresa "${company.name}" ${!company.is_active ? 'reactivada' : 'suspendida'}.`,
      });
      await fetchGovernanceData();
    } catch {
      setFeedback({ type: 'error', message: 'Error de conexión al actualizar la empresa.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleResetDemoSandbox = async () => {
    if (
      !confirm(
        '¿Resetear ahora la Sesión de Prueba?\nSe eliminarán los registros creados por visitantes externos y se restaurarán los ejemplos base intactos.'
      )
    ) {
      return;
    }

    setActionLoadingId('reset-demo');
    setFeedback(null);
    try {
      const res = await fetch('/api/demo/reset', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: 'error', message: data.error || 'No se pudo resetear el sandbox.' });
        return;
      }
      setFeedback({
        type: 'success',
        message: 'Sesión de Prueba reseteada y restaurada a su estado base.',
      });
      await fetchGovernanceData();
    } catch {
      setFeedback({ type: 'error', message: 'Error de conexión al resetear la demo.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSwitchCompany = async (targetOrgId: string) => {
    setActionLoadingId(`switch-${targetOrgId}`);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/switch-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: targetOrgId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: 'error', message: data.error || 'No se pudo cambiar de empresa.' });
        setActionLoadingId(null);
        return;
      }
      window.location.href = '/';
    } catch {
      setFeedback({ type: 'error', message: 'Error de conexión al cambiar de entorno.' });
      setActionLoadingId(null);
    }
  };

  const handleUpdateUser = async (
    userId: string,
    payload: { status?: 'pending' | 'active'; role?: ProfileRole; organization_id?: string }
  ) => {
    setActionLoadingId(userId);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...payload }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: 'error', message: data.error || 'No se pudo actualizar el usuario.' });
        return;
      }
      setFeedback({ type: 'success', message: 'Permisos y rol del usuario actualizados.' });
      await fetchGovernanceData();
    } catch {
      setFeedback({ type: 'error', message: 'Error de conexión al actualizar el usuario.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteUser = async (userRow: UserRow) => {
    if (!confirm(`¿Eliminar permanentemente la cuenta de "${userRow.email}"?`)) return;

    setActionLoadingId(userRow.id);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/users?userId=${encodeURIComponent(userRow.id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: 'error', message: data.error || 'No se pudo eliminar el usuario.' });
        return;
      }
      setFeedback({ type: 'success', message: `Usuario ${userRow.email} eliminado.` });
      await fetchGovernanceData();
    } catch {
      setFeedback({ type: 'error', message: 'Error de conexión al eliminar el usuario.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  if (userLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Cargando panel de gobernanza...</p>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-10 text-center space-y-3">
            <Lock className="h-10 w-10 text-destructive mx-auto" />
            <h2 className="text-lg font-semibold">Acceso Restringido</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {isDemo
                ? 'La gestión de empresas, usuarios y auditoría del servidor está deshabilitada en la Sesión de Prueba.'
                : 'Solo el Propietario o Administrador autorizado de la empresa puede gestionar accesos, roles y políticas.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pendingUsers = users.filter((u) => u.status === 'pending');
  const activeUsers = users.filter((u) => u.status === 'active');
  const selectableCompanies = companies.filter((c) => !c.is_demo);

  const orgActiveUsersCount = seatSummary
    ? seatSummary.activeCount
    : activeUsers.filter((u) => u.organization_id === organization?.id && !u.is_super_admin).length;
  const maxUsersLimit = seatSummary ? seatSummary.maxUsers : entitlements.maxUsers;
  const seatLimitReached =
    !isSuperAdmin && maxUsersLimit !== null && orgActiveUsersCount >= maxUsersLimit;

  const inviteUrl =
    typeof window !== 'undefined' && organization?.invite_code
      ? `${window.location.origin}/register?invite=${encodeURIComponent(organization.invite_code)}`
      : '';

  const currentTabValue = activeTab || (isSuperAdmin ? 'companies' : 'users');

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-xl border border-primary/20">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {isSuperAdmin
                ? 'Gobernanza Multi-Empresa & Accesos'
                : `Gobernanza, Roles y Auditoría — ${organization?.name}`}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isSuperAdmin
                ? 'Aprovisione empresas aisladas por RLS, administre roles RBAC, audite cambios y gestione planes.'
                : 'Administre su equipo, políticas de margen mínimo, marca blanca y bitácora de auditoría.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          {isSuperAdmin && (
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Nueva Empresa
            </Button>
          )}
          <Badge variant="outline" className="py-1.5 px-3">
            {isSuperAdmin
              ? 'Super Admin Global'
              : isOwner
              ? 'Propietario de Empresa'
              : 'Admin de Empresa'}
          </Badge>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
              : 'bg-destructive/10 border-destructive/30 text-destructive'
          }`}
        >
          <span>{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs underline opacity-80 hover:opacity-100 cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Company Invite Code & Branding Quick Banner */}
      {organization?.invite_code && !organization.is_demo && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <KeyRound className="h-5 w-5 text-primary shrink-0" />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold">
                    Invitación Privada de {organization.name}
                  </p>
                  <Badge variant="outline" className="text-[11px] font-mono">
                    Cupos activos: {orgActiveUsersCount}
                    {maxUsersLimit !== null ? ` / ${maxUsersLimit}` : ' / Ilimitados'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Comparta este código o enlace directo para que sus colaboradores se registren pre-vinculados a su empresa.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBrandingTarget(organization)}
                className="gap-1.5 bg-background"
              >
                <Paintbrush className="h-3.5 w-3.5" />
                Marca y Políticas
              </Button>
              <code className="px-3 py-1.5 rounded-lg bg-background border font-mono text-sm font-semibold tracking-wider">
                {organization.invite_code}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopyText(organization.invite_code!, 'code')}
                title="Copiar código"
              >
                {copiedCode === 'code' ? (
                  <Check className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
              {inviteUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyText(inviteUrl, 'link')}
                  className="gap-1.5 text-xs"
                >
                  {copiedCode === 'link' ? (
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  Copiar Enlace
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRegenerateInviteCode}
                disabled={actionLoadingId === 'regen-invite'}
                title="Regenerar código de invitación"
              >
                {actionLoadingId === 'regen-invite' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Navigation Tabs */}
      <Tabs value={currentTabValue} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex-wrap h-auto">
          {isSuperAdmin && (
            <TabsTrigger value="companies" className="gap-2">
              <Building2 className="h-4 w-4" />
              Empresas y Demo ({companies.length})
            </TabsTrigger>
          )}
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            Equipo y Roles
            {pendingUsers.length > 0 && (
              <Badge className="ml-1 bg-amber-500 text-white border-0 px-1.5 py-0 text-[10px]">
                {pendingUsers.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="policies" className="gap-2">
            <Percent className="h-4 w-4" />
            Marca y Políticas
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-2">
            <FileText className="h-4 w-4" />
            Bitácora de Auditoría
            {!hasGranularRbac && !isSuperAdmin && <Lock className="h-3 w-3 opacity-60" />}
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <ShieldCheck className="h-4 w-4" />
            Seguridad y 2FA
          </TabsTrigger>
          {isSuperAdmin && (
            <TabsTrigger value="plans" className="gap-2">
              <CreditCard className="h-4 w-4" />
              Planes, Precios y Khipu
            </TabsTrigger>
          )}
        </TabsList>

        {/* TAB: COMPANIES (SuperAdmin only) */}
        {isSuperAdmin && (
          <TabsContent value="companies" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {companies.map((company) => {
                const isDuo = company.slug === DUO_ORG_SLUG;
                return (
                  <Card
                    key={company.id}
                    className={`flex flex-col justify-between transition-all ${
                      company.is_demo
                        ? 'border-amber-500/40 bg-amber-500/[0.03]'
                        : isDuo
                        ? 'border-primary/40 bg-primary/[0.02]'
                        : ''
                    }`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <CompanyLogoMark
                            name={company.name}
                            logoUrl={company.logo_url}
                            isDemo={company.is_demo}
                            size="md"
                          />
                          <div className="space-y-1 min-w-0">
                            <CardTitle className="text-base truncate" title={company.name}>
                              {company.name}
                            </CardTitle>
                            <CardDescription className="text-xs font-mono truncate">
                              slug: {company.slug}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {company.is_demo && (
                            <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30">
                              <Sparkles className="h-3 w-3 mr-1" />
                              Demo Pública
                            </Badge>
                          )}
                          {isDuo && (
                            <Badge className="bg-primary/15 text-primary border-primary/30">
                              Casa Matriz
                            </Badge>
                          )}
                          {!company.is_demo && !isDuo && (
                            <Badge variant={company.is_active ? 'outline' : 'destructive'}>
                              {company.is_active ? 'Activa' : 'Suspendida'}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4 text-sm">
                      <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-muted/40 border border-border/50 text-xs">
                        <div>
                          <span className="text-muted-foreground block">Usuarios</span>
                          <span className="font-semibold text-sm">{company.users_count}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Proyectos Activos</span>
                          <span className="font-semibold text-sm">{company.events_count}</span>
                        </div>
                      </div>

                      {company.invite_code && !company.is_demo && (
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="text-muted-foreground">Código Invitación:</span>
                          <button
                            type="button"
                            onClick={() => handleCopyText(company.invite_code!, company.id)}
                            className="inline-flex items-center gap-1.5 font-mono font-semibold bg-muted px-2 py-1 rounded hover:bg-muted/80 cursor-pointer"
                            title="Copiar código"
                          >
                            {company.invite_code}
                            {copiedCode === company.id ? (
                              <Check className="h-3 w-3 text-emerald-500" />
                            ) : (
                              <Copy className="h-3 w-3 text-muted-foreground" />
                            )}
                          </button>
                        </div>
                      )}

                      {company.is_demo && (
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Cuota por sesión: máx. {company.max_demo_events} proyectos nuevos y{' '}
                          {company.max_demo_costs} ítems de tarifario.
                        </p>
                      )}

                      <div className="pt-2 border-t space-y-2">
                        {organization?.id === company.id ? (
                          <div className="text-center py-1 text-xs font-semibold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 rounded-md">
                            Entorno Visualizado Actualmente
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleSwitchCompany(company.id)}
                            disabled={actionLoadingId === `switch-${company.id}`}
                            className={`w-full gap-2 ${
                              company.is_demo
                                ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold'
                                : ''
                            }`}
                          >
                            {actionLoadingId === `switch-${company.id}` ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <LogIn className="h-3.5 w-3.5" />
                            )}
                            {company.is_demo ? 'Entrar a Cuenta Demo' : 'Entrar / Inspeccionar'}
                          </Button>
                        )}

                        <div className="flex items-center justify-between gap-2">
                          {company.is_demo ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleResetDemoSandbox}
                              disabled={actionLoadingId === 'reset-demo'}
                              className="w-full gap-2 border-amber-500/40 hover:bg-amber-500/10"
                            >
                              {actionLoadingId === 'reset-demo' ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <RotateCcw className="h-3.5 w-3.5" />
                              )}
                              Resetear Demo Ahora
                            </Button>
                          ) : (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setBrandingTarget(company)}
                                className="gap-1.5 flex-1"
                              >
                                <Paintbrush className="h-3.5 w-3.5" />
                                Marca / Políticas
                              </Button>
                              {!isDuo && (
                                <Button
                                  variant={company.is_active ? 'outline' : 'default'}
                                  size="sm"
                                  onClick={() => handleToggleCompanyActive(company)}
                                  disabled={actionLoadingId === company.id}
                                  className="gap-1.5 flex-1"
                                >
                                  <Power className="h-3.5 w-3.5" />
                                  {company.is_active ? 'Suspender' : 'Reactivar'}
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        )}

        {/* TAB: USERS & GRANULAR RBAC */}
        <TabsContent value="users" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              {hasGranularRbac ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-medium">
                  <ShieldCheck className="h-4 w-4" />
                  RBAC Granular Activo (6 roles corporativos con control por módulo y ocultamiento de márgenes)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5" />
                  Su plan actual opera con roles estándar (Administrador / Colaborador).{' '}
                  <Link href="/billing" className="underline font-semibold text-primary">
                    Desbloquee 6 roles granulares en Corporativo &amp; Escala
                  </Link>
                </span>
              )}
            </div>
            <Button
              type="button"
              size="sm"
              disabled={seatLimitReached}
              onClick={() => setInviteOpen(true)}
              className="gap-1.5 self-start sm:self-auto"
            >
              <UserPlus className="h-4 w-4" />
              Agregar Colaborador
            </Button>
          </div>

          {seatLimitReached && (
            <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-800 dark:text-amber-200 flex items-center justify-between gap-3">
              <span>
                Alcanzó el máximo de <strong>{maxUsersLimit}</strong> usuario(s) activo(s) de su plan actual ({orgActiveUsersCount}/{maxUsersLimit}).
              </span>
              <Link href="/billing" className="underline font-semibold shrink-0">
                Ampliar Cupos
              </Link>
            </div>
          )}

          <UsersManagementSection
            pendingUsers={pendingUsers}
            activeUsers={activeUsers}
            companies={isSuperAdmin ? selectableCompanies : organization ? [organization] : []}
            isSuperAdmin={isSuperAdmin}
            isOwner={isOwner}
            currentUserId={profile?.id}
            actionLoadingId={actionLoadingId}
            assignableRoles={assignableRoles}
            pendingOrgChoice={pendingOrgChoice}
            setPendingOrgChoice={setPendingOrgChoice}
            pendingRoleChoice={pendingRoleChoice}
            setPendingRoleChoice={setPendingRoleChoice}
            seatLimitReached={seatLimitReached}
            onUpdateUser={handleUpdateUser}
            onDeleteUser={handleDeleteUser}
          />

          {/* Permission Matrix Reference */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <CardTitle className="text-base">Matriz de Permisos por Rol (RBAC)</CardTitle>
                  <CardDescription className="text-xs">
                    Aislamiento de costos sensibles, tesorería y aprobaciones de margen en Corporativo &amp; Escala.
                  </CardDescription>
                </div>
                {!hasGranularRbac && !isSuperAdmin && (
                  <Badge
                    variant="outline"
                    className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[11px]"
                  >
                    Corporativo &amp; Escala
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[240px]">Capacidad / Permiso</TableHead>
                    {(['owner', 'admin', 'comercial', 'finanzas', 'operaciones', 'contador_lectura'] as GranularRole[]).map(
                      (r) => (
                        <TableHead key={r} className="text-center text-xs">
                          {ROLE_METADATA[r].shortLabel}
                        </TableHead>
                      )
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getScalePermissionMatrix().map((row) => (
                    <TableRow key={row.permission}>
                      <TableCell className="text-xs font-medium">{row.label}</TableCell>
                      {(['owner', 'admin', 'comercial', 'finanzas', 'operaciones', 'contador_lectura'] as GranularRole[]).map(
                        (r) => (
                          <TableCell key={r} className="text-center">
                            {row.roles[r] ? (
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                                ✓
                              </span>
                            ) : (
                              <span className="text-muted-foreground/50 text-xs">—</span>
                            )}
                          </TableCell>
                        )
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: COMMERCIAL POLICIES & BRANDING */}
        <TabsContent value="policies" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Percent className="h-4 w-4 text-primary" />
                  Aprobación de Margen Mínimo &amp; Retención SII
                </CardTitle>
                <CardDescription className="text-xs">
                  Las cotizaciones bajo este margen pasan a estado &ldquo;Requiere Aprobación&rdquo; hasta que Gerencia o Finanzas las aprueben.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveQuickPolicies} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">
                      Piso de Margen Operacional Mínimo (%)
                    </label>
                    <Input
                      type="number"
                      min={0}
                      max={95}
                      step={0.5}
                      value={quickMarginFloor}
                      onChange={(e) => setQuickMarginFloor(e.target.value)}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Excluye gastos reembolsables al costo (pass-through). Cada excepción aprobada se registra en la bitácora.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">
                      Política de Retención Boletas de Honorarios 15,25% (Ley 21.133)
                    </label>
                    <Select
                      value={quickRetentionPolicy}
                      onChange={(e) =>
                        setQuickRetentionPolicy(e.target.value as HonorariosRetentionPolicy)
                      }
                      options={[
                        {
                          value: 'contractor',
                          label: 'Prestador asume 15,25% (retención sobre bruto)',
                        },
                        {
                          value: 'company',
                          label: 'Empresa asume gross-up completo (líquido pactado)',
                        },
                        {
                          value: 'split_50_50',
                          label: 'Compartida 50% empresa / 50% prestador',
                        },
                      ]}
                    />
                  </div>

                  <Button type="submit" disabled={savingPolicy} className="gap-2">
                    {savingPolicy && <Loader2 className="h-4 w-4 animate-spin" />}
                    Guardar Políticas Comerciales
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Paintbrush className="h-4 w-4 text-primary" />
                  Capacidades de Marca y Datos Bancarios
                </CardTitle>
                <CardDescription className="text-xs">
                  Desbloqueo progresivo en cotizaciones PDF y Portal /q según su plan activo.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="p-3 rounded-xl border flex items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">Datos Bancarios de Transferencia</p>
                    <p className="text-muted-foreground">Visible en PDF y Portal /q desde Operación Esencial.</p>
                  </div>
                  <Badge variant={brandingCaps.bankInfo || isSuperAdmin ? 'default' : 'outline'}>
                    {brandingCaps.bankInfo || isSuperAdmin ? 'Desbloqueado' : 'Esencial ($34.990)'}
                  </Badge>
                </div>

                <div className="p-3 rounded-xl border flex items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">Logo Corporativo Propio</p>
                    <p className="text-muted-foreground">Visible en barra lateral, PDFs y Portal /q desde Crecimiento IA.</p>
                  </div>
                  <Badge variant={brandingCaps.logo || isSuperAdmin ? 'default' : 'outline'}>
                    {brandingCaps.logo || isSuperAdmin ? 'Desbloqueado' : 'Crecimiento ($69.990)'}
                  </Badge>
                </div>

                <div className="p-3 rounded-xl border flex items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">Marca Blanca 100% + Pie Legal + Multi-Cuenta</p>
                    <p className="text-muted-foreground">Elimina huella FIGURA y habilita cuentas USD/SWIFT.</p>
                  </div>
                  <Badge variant={brandingCaps.whiteLabel || isSuperAdmin ? 'default' : 'outline'}>
                    {brandingCaps.whiteLabel || isSuperAdmin ? 'Desbloqueado' : 'Escala ($119.990)'}
                  </Badge>
                </div>

                {organization && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setBrandingTarget(organization)}
                    className="w-full gap-2 mt-2"
                  >
                    <Paintbrush className="h-4 w-4" />
                    Abrir Editor Completo de Identidad y Banco
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB: AUDIT LOGS */}
        <TabsContent value="audit">
          <AuditLogsTab organizationId={organization?.id} />
        </TabsContent>

        {/* TAB: SECURITY & 2FA */}
        <TabsContent value="security" className="space-y-4">
          <MfaSettingsCard />
        </TabsContent>

        {/* TAB: PLANS, PRICING & KHIPU (SuperAdmin only) */}
        {isSuperAdmin && (
          <TabsContent value="plans" className="space-y-4">
            <PlansAdminTab
              companies={companies}
              onRefreshCompanies={fetchGovernanceData}
            />
          </TabsContent>
        )}
      </Tabs>

      {/* CREATE COMPANY DIALOG */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen} className="max-w-2xl">
        <form onSubmit={handleCreateCompany} className="flex flex-col max-h-[85dvh]">
          <DialogHeader>
            <DialogTitle>
              <Building2 className="h-5 w-5 text-primary" />
              Crear Nueva Empresa Cliente (Tenant Privado)
            </DialogTitle>
            <DialogDescription>
              Cada empresa cuenta con base de datos aislada mediante RLS estricto, catálogo propio y branding en cotizaciones PDF.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4">
            <LogoUploadField
              companyName={formState.name}
              logoUrl={formState.logo_url}
              onChange={(nextUrl) => setFormState({ ...formState, logo_url: nextUrl })}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Nombre Comercial *</label>
                <Input
                  required
                  placeholder="Ej: Productora Andes SpA"
                  value={formState.name}
                  onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Razón Social (Opcional)</label>
                <Input
                  placeholder="Ej: Andes Eventos y Producción Ltda."
                  value={formState.legal_name}
                  onChange={(e) => setFormState({ ...formState, legal_name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">RUT Empresa (Opcional)</label>
                <Input
                  placeholder="76.123.456-7"
                  value={formState.rut}
                  onChange={(e) => setFormState({ ...formState, rut: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Ciudad / Ubicación</label>
                <Input
                  placeholder="Santiago, Chile"
                  value={formState.location}
                  onChange={(e) => setFormState({ ...formState, location: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Email de Contacto</label>
                <Input
                  type="email"
                  placeholder="contacto@empresa.cl"
                  value={formState.contact_email}
                  onChange={(e) => setFormState({ ...formState, contact_email: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Código de Invitación (Opcional)</label>
                <Input
                  placeholder="Auto-generado si se deja vacío"
                  value={formState.invite_code}
                  onChange={(e) =>
                    setFormState({ ...formState, invite_code: e.target.value.toUpperCase() })
                  }
                />
              </div>
            </div>

            <label className="flex items-center gap-2.5 p-3 rounded-lg border bg-muted/30 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={formState.seedStarterCatalog}
                onChange={(e) =>
                  setFormState({ ...formState, seedStarterCatalog: e.target.checked })
                }
                className="h-4 w-4 rounded"
              />
              <span>
                Incluir tarifario inicial base (5 servicios de ejemplo editables para agilizar onboarding)
              </span>
            </label>

            <div className="pt-3 border-t space-y-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Administrador Inicial de la Empresa (Opcional)
                </p>
                <p className="text-xs text-muted-foreground">
                  Si completa estos campos, el usuario se creará activo y listo para iniciar sesión.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Email Administrador</label>
                  <Input
                    type="email"
                    placeholder="gerencia@cliente.cl"
                    value={formState.adminEmail}
                    onChange={(e) => setFormState({ ...formState, adminEmail: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Contraseña Inicial</label>
                  <Input
                    type="password"
                    placeholder="Mínimo 8 caracteres"
                    value={formState.adminPassword}
                    onChange={(e) => setFormState({ ...formState, adminPassword: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={creating} className="gap-2">
              {creating && <Loader2 className="h-4 w-4 animate-spin" />}
              Crear Empresa Aislada
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* INVITE / CREATE USER DIALOG */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen} className="max-w-lg">
        <form onSubmit={handleCreateUser} className="flex flex-col max-h-[85dvh]">
          <DialogHeader>
            <DialogTitle>
              <UserPlus className="h-5 w-5 text-primary" />
              Agregar Colaborador al Equipo
            </DialogTitle>
            <DialogDescription>
              Cree una cuenta activa directamente con el rol RBAC asignado (respetando el límite de usuarios de su plan).
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-3.5">
            {isSuperAdmin && selectableCompanies.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Empresa Destino</label>
                <Select
                  value={inviteForm.organization_id || organization?.id || ''}
                  options={selectableCompanies.map((c) => ({ value: c.id, label: c.name }))}
                  onChange={(e) =>
                    setInviteForm((prev) => ({ ...prev, organization_id: e.target.value }))
                  }
                />
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Nombre Completo (Opcional)</label>
              <Input
                placeholder="Ej: Rodrigo Soto"
                value={inviteForm.full_name}
                onChange={(e) => setInviteForm((prev) => ({ ...prev, full_name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Correo Corporativo *</label>
              <Input
                type="email"
                required
                placeholder="colaborador@empresa.cl"
                value={inviteForm.email}
                onChange={(e) => setInviteForm((prev) => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Contraseña Inicial * (mín. 8 caracteres)</label>
              <Input
                type="password"
                required
                minLength={8}
                placeholder="Mínimo 8 caracteres"
                value={inviteForm.password}
                onChange={(e) => setInviteForm((prev) => ({ ...prev, password: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Rol y Permisos *</label>
              <Select
                value={inviteForm.role}
                options={assignableRoles.map((r) => ({ value: r.value, label: r.label }))}
                onChange={(e) =>
                  setInviteForm((prev) => ({ ...prev, role: e.target.value as ProfileRole }))
                }
              />
              <p className="text-[11px] text-muted-foreground">
                {ROLE_METADATA[inviteForm.role]?.description}
              </p>
            </div>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={inviting} className="gap-2">
              {inviting && <Loader2 className="h-4 w-4 animate-spin" />}
              Crear y Activar Usuario
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      <CompanyBrandingDialog
        company={brandingTarget}
        open={Boolean(brandingTarget)}
        onOpenChange={(open) => {
          if (!open) setBrandingTarget(null);
        }}
        onSaved={async (message) => {
          setFeedback({ type: 'success', message });
          await fetchGovernanceData();
        }}
      />
    </div>
  );
}

interface UsersManagementSectionProps {
  pendingUsers: UserRow[];
  activeUsers: UserRow[];
  companies: Organization[];
  isSuperAdmin: boolean;
  isOwner: boolean;
  currentUserId?: string;
  actionLoadingId: string | null;
  assignableRoles: ReturnType<typeof getAssignableRoles>;
  pendingOrgChoice: Record<string, string>;
  setPendingOrgChoice: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  pendingRoleChoice: Record<string, ProfileRole>;
  setPendingRoleChoice: React.Dispatch<React.SetStateAction<Record<string, ProfileRole>>>;
  seatLimitReached: boolean;
  onUpdateUser: (
    userId: string,
    payload: { status?: 'pending' | 'active'; role?: ProfileRole; organization_id?: string }
  ) => Promise<void>;
  onDeleteUser: (userRow: UserRow) => Promise<void>;
}

function UsersManagementSection({
  pendingUsers,
  activeUsers,
  companies,
  isSuperAdmin,
  isOwner,
  currentUserId,
  actionLoadingId,
  assignableRoles,
  pendingOrgChoice,
  setPendingOrgChoice,
  pendingRoleChoice,
  setPendingRoleChoice,
  seatLimitReached,
  onUpdateUser,
  onDeleteUser,
}: UsersManagementSectionProps) {
  const roleOptions = assignableRoles.map((r) => ({ value: r.value, label: r.label }));

  return (
    <div className="space-y-6">
      {/* Pending Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            Solicitudes Pendientes de Aprobación
            <Badge variant="outline">{pendingUsers.length}</Badge>
          </CardTitle>
          <CardDescription className="text-xs">
            Asigne el rol correspondiente antes de autorizar el ingreso del colaborador.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PendingUsersTable
            users={pendingUsers}
            companies={companies}
            showCompanyColumn={isSuperAdmin}
            assignableRoles={assignableRoles}
            selectedRoles={pendingRoleChoice}
            onRoleSelect={(userId, role) =>
              setPendingRoleChoice((prev) => ({ ...prev, [userId]: role }))
            }
            selectedOrgs={pendingOrgChoice}
            onOrgSelect={(userId, orgId) =>
              setPendingOrgChoice((prev) => ({ ...prev, [userId]: orgId }))
            }
            seatLimitReached={seatLimitReached}
            busyUserId={actionLoadingId}
            onApprove={(userId, opts) =>
              onUpdateUser(userId, {
                status: 'active',
                role: opts?.role,
                ...(isSuperAdmin && opts?.organization_id
                  ? { organization_id: opts.organization_id }
                  : {}),
              })
            }
            onReject={async (userId) => {
              const target = pendingUsers.find((u) => u.id === userId);
              if (target) await onDeleteUser(target);
            }}
          />
        </CardContent>
      </Card>

      {/* Active Users */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            Usuarios Activos
            <Badge variant="outline">{activeUsers.length}</Badge>
          </CardTitle>
          <CardDescription className="text-xs">
            Cada cuenta opera aislada en su organización con validación de permisos en servidor.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  {isSuperAdmin && <TableHead>Empresa</TableHead>}
                  <TableHead>Rol</TableHead>
                  <TableHead className="text-right">Gestión</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeUsers.map((u) => {
                  const isSelf = u.id === currentUserId;
                  const isBusy = actionLoadingId === u.id;
                  const orgLabel = u.organizations?.name || 'Sin empresa';
                  const targetIsProtectedOwner = u.role === 'owner' && !isOwner && !isSuperAdmin;
                  const currentRoleMeta = ROLE_METADATA[u.role];
                  const hasRoleInOptions = roleOptions.some((o) => o.value === u.role);
                  const rowOptions = hasRoleInOptions
                    ? roleOptions
                    : [
                        { value: u.role, label: currentRoleMeta?.label || u.role },
                        ...roleOptions,
                      ];

                  return (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{u.email}</span>
                          {u.full_name && (
                            <span className="text-xs text-muted-foreground">({u.full_name})</span>
                          )}
                          {u.is_super_admin && (
                            <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px]">
                              Super Admin
                            </Badge>
                          )}
                          {isSelf && (
                            <Badge variant="outline" className="text-[10px]">
                              Usted
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      {isSuperAdmin && (
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-sm">
                            <span>{orgLabel}</span>
                            {u.organizations?.is_demo && (
                              <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-[10px]">
                                Demo
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      )}
                      <TableCell>
                        {u.is_super_admin ? (
                          <Badge variant="outline">Propietario Plataforma</Badge>
                        ) : (
                          <Select
                            value={u.role}
                            disabled={isBusy || isSelf || targetIsProtectedOwner}
                            options={rowOptions}
                            onChange={(e) =>
                              onUpdateUser(u.id, { role: e.target.value as ProfileRole })
                            }
                            className="w-[210px] h-8 text-xs"
                          />
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {!u.is_super_admin && !isSelf && !targetIsProtectedOwner && (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isBusy}
                              onClick={() => onUpdateUser(u.id, { status: 'pending' })}
                            >
                              Suspender
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={isBusy}
                              onClick={() => onDeleteUser(u)}
                              className="text-destructive hover:text-destructive"
                              title="Eliminar cuenta"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
