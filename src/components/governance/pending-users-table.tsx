'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import type { Organization, Profile, ProfileRole } from '@/types';
import type { RoleMetadata } from '@/lib/rbac';
import { Check, X, Loader2 } from 'lucide-react';

interface PendingUsersTableProps {
  users: Profile[];
  onApprove: (userId: string, options?: { role?: ProfileRole; organization_id?: string }) => Promise<void>;
  onReject: (userId: string) => Promise<void>;
  assignableRoles?: RoleMetadata[];
  selectedRoles?: Record<string, ProfileRole>;
  onRoleSelect?: (userId: string, role: ProfileRole) => void;
  companies?: Organization[];
  selectedOrgs?: Record<string, string>;
  onOrgSelect?: (userId: string, organizationId: string) => void;
  showCompanyColumn?: boolean;
  seatLimitReached?: boolean;
  busyUserId?: string | null;
}

export function PendingUsersTable({
  users,
  onApprove,
  onReject,
  assignableRoles = [
    {
      value: 'member',
      label: 'Colaborador (Estándar)',
      shortLabel: 'Colaborador',
      description: '',
      badgeClass: '',
      requiresScale: false,
    },
    {
      value: 'admin',
      label: 'Administrador de Empresa',
      shortLabel: 'Admin',
      description: '',
      badgeClass: '',
      requiresScale: false,
    },
  ],
  selectedRoles,
  onRoleSelect,
  companies = [],
  selectedOrgs,
  onOrgSelect,
  showCompanyColumn = false,
  seatLimitReached = false,
  busyUserId = null,
}: PendingUsersTableProps) {
  const [localLoadingId, setLocalLoadingId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [fallbackRoles, setFallbackRoles] = useState<Record<string, ProfileRole>>({});
  const [fallbackOrgs, setFallbackOrgs] = useState<Record<string, string>>({});

  const companyOptions = companies.map((c) => ({ value: c.id, label: c.name }));
  const roleOptions = assignableRoles.map((r) => ({ value: r.value, label: r.label }));

  const handleApprove = async (user: Profile) => {
    const chosenRole =
      selectedRoles?.[user.id] ?? fallbackRoles[user.id] ?? user.role ?? assignableRoles[0]?.value ?? 'member';
    const chosenOrg =
      selectedOrgs?.[user.id] ?? fallbackOrgs[user.id] ?? user.organization_id ?? companies[0]?.id;

    setLocalLoadingId(user.id);
    setActionType('approve');
    try {
      await onApprove(user.id, {
        role: chosenRole,
        ...(chosenOrg ? { organization_id: chosenOrg } : {}),
      });
    } finally {
      setLocalLoadingId(null);
      setActionType(null);
    }
  };

  const handleReject = async (userId: string) => {
    if (!window.confirm('¿Está seguro de rechazar y eliminar esta solicitud de acceso?')) return;
    setLocalLoadingId(userId);
    setActionType('reject');
    try {
      await onReject(userId);
    } finally {
      setLocalLoadingId(null);
      setActionType(null);
    }
  };

  if (users.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground border rounded-xl bg-muted/20">
        No hay solicitudes pendientes de aprobación en este momento.
      </div>
    );
  }

  return (
    <div className="border rounded-xl overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Usuario</TableHead>
            {showCompanyColumn && <TableHead>Empresa Asignada</TableHead>}
            <TableHead>Rol Asignado</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => {
            const isBusy = busyUserId === user.id || localLoadingId === user.id;
            const currentOrg =
              selectedOrgs?.[user.id] ?? fallbackOrgs[user.id] ?? user.organization_id ?? companies[0]?.id ?? '';
            const currentRole =
              selectedRoles?.[user.id] ?? fallbackRoles[user.id] ?? (assignableRoles.some((r) => r.value === user.role) ? user.role : assignableRoles[0]?.value || 'member');

            return (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="font-medium text-sm">{user.email}</div>
                  <div className="text-xs text-muted-foreground">
                    Solicitado el{' '}
                    {new Date(user.created_at || '').toLocaleDateString('es-CL', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                </TableCell>

                {showCompanyColumn && (
                  <TableCell className="min-w-[180px]">
                    <Select
                      value={currentOrg}
                      options={companyOptions}
                      disabled={isBusy}
                      onChange={(e) => {
                        if (onOrgSelect) onOrgSelect(user.id, e.target.value);
                        else setFallbackOrgs((prev) => ({ ...prev, [user.id]: e.target.value }));
                      }}
                    />
                  </TableCell>
                )}

                <TableCell className="min-w-[190px]">
                  <Select
                    value={currentRole}
                    options={roleOptions}
                    disabled={isBusy}
                    onChange={(e) => {
                      const nextRole = e.target.value as ProfileRole;
                      if (onRoleSelect) onRoleSelect(user.id, nextRole);
                      else setFallbackRoles((prev) => ({ ...prev, [user.id]: nextRole }));
                    }}
                  />
                </TableCell>

                <TableCell>
                  <Badge
                    variant="outline"
                    className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
                  >
                    Pendiente
                  </Badge>
                </TableCell>

                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 border-emerald-500/30 gap-1"
                      onClick={() => handleApprove(user)}
                      disabled={isBusy || seatLimitReached || (showCompanyColumn && !currentOrg)}
                      title={
                        seatLimitReached
                          ? 'Alcanzó el máximo de usuarios activos de su plan'
                          : 'Aprobar ingreso'
                      }
                    >
                      {isBusy && actionType === 'approve' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      Aprobar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10 border-destructive/30 gap-1"
                      onClick={() => handleReject(user.id)}
                      disabled={isBusy}
                    >
                      {isBusy && actionType === 'reject' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                      Rechazar
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
