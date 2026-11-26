import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient, getAuthenticatedContext } from '@/lib/supabase/admin';
import { extractClientIp } from '@/lib/ai-optimizer';
import { SUPER_ADMIN_EMAIL } from '@/lib/constants';
import { resolveOrgEntitlements } from '@/lib/entitlements';
import { fetchPlansAndAddonsServer, hydrateOrganizationSaas } from '@/lib/saas-storage';
import { can, hasGranularRbac } from '@/lib/rbac';
import { buildAuditLogsCsv, logAudit } from '@/lib/audit';
import type { AuditLog, Organization } from '@/types/database';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CreateAuditLogSchema = z.object({
  action: z.string().trim().min(2).max(64),
  entity_type: z.string().trim().min(2).max(64),
  entity_id: z.string().trim().max(128).nullable().optional(),
  entity_label: z.string().trim().max(240).nullable().optional(),
  before_data: z.record(z.unknown()).nullable().optional(),
  after_data: z.record(z.unknown()).nullable().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext(req);
    if (!ctx?.profile || ctx.profile.status !== 'active') {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    const isSuperAdmin =
      Boolean(ctx.profile.is_super_admin) ||
      ctx.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

    if (!isSuperAdmin && ctx.organization?.is_demo) {
      return NextResponse.json(
        { error: 'La bitácora corporativa del servidor no está disponible en Demo.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const requestedOrgId = searchParams.get('organizationId');
    const targetOrgId =
      isSuperAdmin && requestedOrgId ? requestedOrgId : ctx.profile.organization_id;

    if (!targetOrgId) {
      return NextResponse.json({ error: 'Sin organización activa.' }, { status: 400 });
    }

    const admin = createAdminClient();
    let targetOrg = ctx.organization ? hydrateOrganizationSaas(ctx.organization) : null;
    if (!targetOrg || targetOrg.id !== targetOrgId) {
      const { data: orgRow } = await admin
        .from('organizations')
        .select('*')
        .eq('id', targetOrgId)
        .single();
      targetOrg = hydrateOrganizationSaas((orgRow as Organization | null) ?? null);
    }

    const { plans, addons } = await fetchPlansAndAddonsServer();
    const entitlements = resolveOrgEntitlements(targetOrg, plans, addons);

    if (!isSuperAdmin && !hasGranularRbac(entitlements)) {
      return NextResponse.json(
        {
          error:
            'La Bitácora de Auditoría Inmutable requiere el Plan Corporativo & Escala ($119.990/mes) o el módulo Equipo & Marca Blanca.',
          upgradeRequired: true,
          requiredPlan: 'scale',
        },
        { status: 403 }
      );
    }

    if (!can(ctx.profile, 'view_audit_logs', entitlements)) {
      return NextResponse.json(
        { error: 'Su rol actual no tiene permisos para consultar la bitácora de auditoría.' },
        { status: 403 }
      );
    }

    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') || 25)));
    const actor = searchParams.get('actor')?.trim() || '';
    const action = searchParams.get('action')?.trim() || '';
    const entityType = searchParams.get('entityType')?.trim() || '';
    const from = searchParams.get('from')?.trim() || '';
    const to = searchParams.get('to')?.trim() || '';
    const search = searchParams.get('search')?.trim() || '';
    const format = searchParams.get('format')?.trim() || 'json';

    let query = admin
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .eq('organization_id', targetOrgId)
      .order('created_at', { ascending: false });

    if (actor) {
      query = query.ilike('actor_email', `%${actor}%`);
    }
    if (action) {
      query = query.eq('action', action);
    }
    if (entityType) {
      query = query.eq('entity_type', entityType);
    }
    if (from) {
      query = query.gte('created_at', new Date(from).toISOString());
    }
    if (to) {
      const endDate = new Date(to);
      if (!Number.isNaN(endDate.getTime())) {
        endDate.setUTCHours(23, 59, 59, 999);
        query = query.lte('created_at', endDate.toISOString());
      }
    }
    if (search) {
      const cleanSearch = search.replace(/[%_,]/g, '');
      if (cleanSearch) {
        query = query.or(
          `entity_label.ilike.%${cleanSearch}%,actor_email.ilike.%${cleanSearch}%,action.ilike.%${cleanSearch}%`
        );
      }
    }

    if (format === 'csv') {
      const { data: csvRows, error } = await query.limit(1000);
      if (error) {
        if (error.code === '42P01' || error.code === 'PGRST205') {
          return NextResponse.json(
            { error: 'La tabla audit_logs aún no ha sido migrada en Supabase.' },
            { status: 503 }
          );
        }
        throw error;
      }

      const csv = buildAuditLogsCsv((csvRows || []) as AuditLog[]);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="FIGURA_Auditoria_${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    const fromIdx = (page - 1) * pageSize;
    const toIdx = fromIdx + pageSize - 1;
    const { data, error, count } = await query.range(fromIdx, toIdx);

    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST205') {
        return NextResponse.json({
          logs: [],
          total: 0,
          page,
          pageSize,
          hasMore: false,
          migrationRequired: true,
        });
      }
      throw error;
    }

    const total = count || 0;
    return NextResponse.json({
      logs: (data || []) as AuditLog[],
      total,
      page,
      pageSize,
      hasMore: fromIdx + (data?.length || 0) < total,
    });
  } catch (err: any) {
    console.error('Error GET /api/audit:', err);
    return NextResponse.json(
      { error: 'No se pudo consultar la bitácora de auditoría.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext(req);
    if (!ctx?.profile || ctx.profile.status !== 'active' || !ctx.profile.organization_id) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    if (ctx.organization?.is_demo) {
      return NextResponse.json({ ok: true, demoLocalOnly: true });
    }

    const rawBody = await req.json();
    const parsed = CreateAuditLogSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || 'Evento de auditoría inválido.' },
        { status: 400 }
      );
    }

    const body = parsed.data;
    const result = await logAudit({
      action: body.action,
      entityType: body.entity_type,
      entityId: body.entity_id ?? null,
      entityLabel: body.entity_label ?? null,
      before: body.before_data ?? null,
      after: body.after_data ?? null,
      metadata: body.metadata ?? null,
      organizationId: ctx.profile.organization_id,
      actor: {
        id: ctx.userId,
        email: ctx.email,
        role: ctx.profile.role,
      },
      ipAddress: extractClientIp(req.headers),
    });

    return NextResponse.json({ ok: result.ok, id: result.id ?? null }, { status: 201 });
  } catch (err: any) {
    console.error('Error POST /api/audit:', err);
    return NextResponse.json(
      { error: 'No se pudo registrar el evento de auditoría.' },
      { status: 500 }
    );
  }
}
