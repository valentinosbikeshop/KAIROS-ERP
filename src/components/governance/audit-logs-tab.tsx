'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Filter,
  Loader2,
  RotateCcw,
  Search,
} from 'lucide-react';
import { useWorkspaceConfig } from '@/hooks/use-workspace-config';
import {
  AUDIT_ACTION_LABELS,
  AUDIT_ENTITY_LABELS,
  buildAuditLogsCsv,
  fetchAuditLogs,
  logAudit,
} from '@/lib/audit';
import { ROLE_METADATA } from '@/lib/rbac';
import { FeatureLockCard } from '@/components/billing/feature-gate';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { AuditLog, ProfileRole } from '@/types/database';

interface AuditLogsTabProps {
  organizationId?: string | null;
}

const ACTION_OPTIONS = [
  { value: '', label: 'Todas las acciones' },
  { value: 'approve_margin', label: 'Aprobación de Margen' },
  { value: 'role_change', label: 'Cambio de Rol' },
  { value: 'approve_user', label: 'Aprobación de Usuario' },
  { value: 'branding_change', label: 'Cambio de Marca / Banco' },
  { value: 'policy_change', label: 'Cambio de Política' },
  { value: 'create', label: 'Creación' },
  { value: 'update', label: 'Modificación' },
  { value: 'delete', label: 'Eliminación' },
  { value: 'quote_sent', label: 'Envío de Cotización' },
  { value: 'quote_accepted', label: 'Aceptación Cliente' },
  { value: 'transaction_recorded', label: 'Movimiento Financiero' },
  { value: 'export_csv', label: 'Exportación CSV' },
  { value: 'export_excel', label: 'Exportación Excel' },
];

const ENTITY_OPTIONS = [
  { value: '', label: 'Todas las entidades' },
  { value: 'event', label: 'Proyecto / Cotización' },
  { value: 'event_item', label: 'Partida Presupuestaria' },
  { value: 'master_cost', label: 'Tarifa de Catálogo' },
  { value: 'profile', label: 'Usuario / Rol' },
  { value: 'organization', label: 'Empresa / Marca' },
  { value: 'transaction', label: 'Transacción / Caja' },
  { value: 'quote', label: 'Portal Cotización' },
  { value: 'margin_policy', label: 'Política de Margen' },
];

export function AuditLogsTab({ organizationId }: AuditLogsTabProps) {
  const {
    entitlements,
    hasGranularRbac,
    isDuoExempt,
    isSuperAdmin,
    isDemo,
    profile,
    organization,
  } = useWorkspaceConfig();

  const canView = isSuperAdmin || isDuoExempt || hasGranularRbac;

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [actorFilter, setActorFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const loadLogs = useCallback(async () => {
    if (!canView) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAuditLogs({
        page,
        pageSize,
        search: search.trim() || undefined,
        actor: actorFilter.trim() || undefined,
        action: actionFilter || undefined,
        entityType: entityFilter || undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
        organizationId: isSuperAdmin && organizationId ? organizationId : undefined,
      });
      setLogs(res.logs);
      setTotal(res.total);
      setHasMore(res.hasMore);
    } catch (err: any) {
      setError(err?.message || 'No se pudo cargar la bitácora de auditoría.');
    } finally {
      setLoading(false);
    }
  }, [
    canView,
    page,
    pageSize,
    search,
    actorFilter,
    actionFilter,
    entityFilter,
    fromDate,
    toDate,
    isSuperAdmin,
    organizationId,
  ]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleResetFilters = () => {
    setSearch('');
    setActorFilter('');
    setActionFilter('');
    setEntityFilter('');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  const handleExportCsv = async () => {
    setExporting(true);
    setError(null);
    try {
      let csvContent = '';
      if (isDemo) {
        const allDemo = await fetchAuditLogs({
          page: 1,
          pageSize: 100,
          search: search.trim() || undefined,
          actor: actorFilter.trim() || undefined,
          action: actionFilter || undefined,
          entityType: entityFilter || undefined,
          from: fromDate || undefined,
          to: toDate || undefined,
        });
        csvContent = buildAuditLogsCsv(allDemo.logs);
      } else {
        const params = new URLSearchParams({ format: 'csv' });
        if (search.trim()) params.set('search', search.trim());
        if (actorFilter.trim()) params.set('actor', actorFilter.trim());
        if (actionFilter) params.set('action', actionFilter);
        if (entityFilter) params.set('entityType', entityFilter);
        if (fromDate) params.set('from', fromDate);
        if (toDate) params.set('to', toDate);
        if (isSuperAdmin && organizationId) params.set('organizationId', organizationId);

        const res = await fetch(`/api/audit?${params.toString()}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'No se pudo exportar la bitácora.');
        }
        csvContent = await res.text();
      }

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FIGURA_Auditoria_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      await logAudit({
        action: 'export_csv',
        entityType: 'audit_logs',
        entityLabel: `Exportación CSV (${total} registros filtrados)`,
        organizationId: organizationId || organization?.id,
        actor: {
          id: profile?.id,
          email: profile?.email,
          role: profile?.role,
        },
      });
    } catch (err: any) {
      setError(err?.message || 'Error al exportar CSV.');
    } finally {
      setExporting(false);
    }
  };

  if (!canView) {
    return (
      <div className="space-y-4">
        <FeatureLockCard
          title="Bitácora de Auditoría Inmutable"
          description="Registre cada aprobación bajo margen mínimo, cambio de rol RBAC, edición de costos/precios, configuración bancaria y exportación contable con detalle Antes/Después y descarga CSV."
          requiredPlanLabel="Corporativo & Escala ($119.990/mes)"
          isExpiredLock={entitlements.isExpiredLock}
        />
        <Card className="border-dashed">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Qué audita Corporativo &amp; Escala</CardTitle>
            <CardDescription className="text-xs">
              Trazabilidad inmutable exigida por gerencias financieras, auditorías internas y directorios.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-muted-foreground">
            <div className="p-3 rounded-xl border bg-muted/20">
              <p className="font-semibold text-foreground mb-1">Aprobaciones de Margen</p>
              <p>Queda registrado quién autorizó cotizar bajo el piso mínimo de la empresa.</p>
            </div>
            <div className="p-3 rounded-xl border bg-muted/20">
              <p className="font-semibold text-foreground mb-1">Cambios de Roles y Accesos</p>
              <p>Historial de altas, suspensiones y cambios entre Comercial, Finanzas y Operaciones.</p>
            </div>
            <div className="p-3 rounded-xl border bg-muted/20">
              <p className="font-semibold text-foreground mb-1">Difusión Antes / Después</p>
              <p>Comparativa exacta de valores modificados y exportación en formato CSV auditable.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Bitácora de Auditoría Inmutable
              <Badge variant="outline" className="text-xs">
                {total} eventos
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              Registro cronológico de eventos críticos de gobernanza, márgenes, usuarios y marca blanca.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetFilters}
              className="gap-1.5 text-xs"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Limpiar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleExportCsv}
              disabled={exporting || logs.length === 0}
              className="gap-1.5 text-xs"
            >
              {exporting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              Exportar CSV
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filter bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 p-3 rounded-xl border bg-muted/20">
          <div className="lg:col-span-2 relative">
            <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Buscar detalle, usuario o acción..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-8 h-9 text-xs"
            />
          </div>
          <div>
            <Input
              placeholder="Filtrar por correo..."
              value={actorFilter}
              onChange={(e) => {
                setActorFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 text-xs"
            />
          </div>
          <div>
            <Select
              value={actionFilter}
              options={ACTION_OPTIONS}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 text-xs"
            />
          </div>
          <div>
            <Select
              value={entityFilter}
              options={ENTITY_OPTIONS}
              onChange={(e) => {
                setEntityFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 text-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <Input
              type="date"
              aria-label="Fecha desde"
              title="Desde"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
              className="h-9 text-[11px] px-2"
            />
            <Input
              type="date"
              aria-label="Fecha hasta"
              title="Hasta"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
              className="h-9 text-[11px] px-2"
            />
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-xs text-destructive">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-12 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Consultando bitácora de auditoría...
          </div>
        ) : logs.length === 0 ? (
          <div className="py-10 text-center border rounded-xl bg-muted/10 space-y-1">
            <Filter className="h-6 w-6 text-muted-foreground mx-auto" />
            <p className="text-sm font-medium">Sin eventos registrados para este filtro</p>
            <p className="text-xs text-muted-foreground">
              Los cambios de roles, políticas, marcas y aprobaciones de margen aparecerán aquí automáticamente.
            </p>
          </div>
        ) : (
          <div className="border rounded-xl overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha y Hora</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Acción</TableHead>
                  <TableHead>Entidad / Detalle</TableHead>
                  <TableHead className="text-right">Antes / Después</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => {
                  const isExpanded = expandedId === log.id;
                  const roleMeta = ROLE_METADATA[(log.actor_role || 'member') as ProfileRole];
                  const hasDiff = Boolean(log.before_data || log.after_data);

                  return (
                    <Fragment key={log.id}>
                      <TableRow>
                        <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                          {new Date(log.created_at).toLocaleString('es-CL', {
                            dateStyle: 'short',
                            timeStyle: 'medium',
                          })}
                        </TableCell>
                        <TableCell>
                          <div className="text-xs font-medium">{log.actor_email || 'Sistema'}</div>
                          {log.actor_role && (
                            <Badge
                              variant="outline"
                              className={`mt-0.5 text-[10px] ${roleMeta?.badgeClass || ''}`}
                            >
                              {roleMeta?.shortLabel || log.actor_role}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[11px] font-medium">
                            {AUDIT_ACTION_LABELS[log.action] || log.action}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs font-medium">
                            {AUDIT_ENTITY_LABELS[log.entity_type] || log.entity_type}
                          </div>
                          {log.entity_label && (
                            <div className="text-[11px] text-muted-foreground truncate max-w-[260px]">
                              {log.entity_label}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {hasDiff ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setExpandedId(isExpanded ? null : log.id)}
                              className="h-7 text-xs gap-1"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              {isExpanded ? 'Ocultar' : 'Ver detalle'}
                            </Button>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow key={`${log.id}-diff`} className="bg-muted/20">
                          <TableCell colSpan={5} className="p-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                              <div className="p-2.5 rounded-lg border bg-background">
                                <p className="font-semibold text-muted-foreground mb-1">
                                  Estado Anterior
                                </p>
                                <pre className="overflow-x-auto font-mono whitespace-pre-wrap break-all">
                                  {log.before_data
                                    ? JSON.stringify(log.before_data, null, 2)
                                    : 'Sin estado previo (creación)'}
                                </pre>
                              </div>
                              <div className="p-2.5 rounded-lg border bg-background">
                                <p className="font-semibold text-emerald-700 dark:text-emerald-300 mb-1">
                                  Estado Nuevo
                                </p>
                                <pre className="overflow-x-auto font-mono whitespace-pre-wrap break-all">
                                  {log.after_data
                                    ? JSON.stringify(log.after_data, null, 2)
                                    : 'Registro eliminado'}
                                </pre>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        {total > 0 && (
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
            <span>
              Mostrando {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} de {total} registros
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-8 gap-1 text-xs"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Anterior
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!hasMore || loading}
                onClick={() => setPage((p) => p + 1)}
                className="h-8 gap-1 text-xs"
              >
                Siguiente
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
