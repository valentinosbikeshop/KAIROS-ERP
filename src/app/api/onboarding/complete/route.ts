import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient, getAuthenticatedContext } from '@/lib/supabase/admin';
import { getIndustryBlueprint } from '@/lib/industries';
import { formatCostMetadata } from '@/lib/cost-metadata';
import { calculateFinancials } from '@/lib/utils';
import { updateOrganizationSaasConfig } from '@/lib/saas-storage';
import { isDuoProducciones } from '@/lib/entitlements';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const OnboardingSchema = z.object({
  industryType: z.enum([
    'eventos_banqueteria',
    'marketing_audiovisual',
    'construccion_arquitectura',
    'catering_foodservice',
    'ferias_stands_b2b',
    'maestranza_muebles',
    'ingenieria_hvac',
    'consultoria_juridico',
    'turismo_mice',
  ]),
  themePreset: z.enum([
    'obsidian_gold',
    'emerald_sovereign',
    'sapphire_executive',
    'terracotta_atelier',
    'amethyst_studio',
  ]),
  operationMode: z.enum(['project', 'retail_mixed', 'retainer_hours']),
  companyName: z.string().trim().min(2).max(100).optional(),
  location: z.string().trim().max(120).optional(),
  seedIndustryCatalog: z.boolean().optional().default(true),
  honorariosRetentionPolicy: z.enum(['company', 'contractor', 'split_50_50']).optional(),
  customTerminology: z
    .object({
      projectSingular: z.string().trim().max(40).optional(),
      projectPlural: z.string().trim().max(40).optional(),
      clientLabel: z.string().trim().max(40).optional(),
      catalogLabel: z.string().trim().max(40).optional(),
      locationLabel: z.string().trim().max(40).optional(),
    })
    .optional(),
});

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext(req);
    if (!ctx || !ctx.profile?.organization_id || !ctx.organization) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (isDuoProducciones(ctx.organization)) {
      return NextResponse.json({
        exempt: true,
        message: 'DUO Producciones mantiene su configuración original intacta.',
      });
    }

    const body = await req.json();
    const parsed = OnboardingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || 'Configuración inválida' },
        { status: 400 }
      );
    }

    const {
      industryType,
      themePreset,
      operationMode,
      companyName,
      location,
      seedIndustryCatalog,
      honorariosRetentionPolicy,
      customTerminology,
    } = parsed.data;

    const admin = createAdminClient();
    const orgId = ctx.profile.organization_id;

    if (companyName || location) {
      await admin
        .from('organizations')
        .update({
          ...(companyName ? { name: companyName } : {}),
          ...(location ? { location } : {}),
        } as any)
        .eq('id', orgId);
    }

    const updatedOrg = await updateOrganizationSaasConfig(orgId, {
      industry_type: industryType,
      theme_preset: themePreset,
      operation_mode: operationMode,
      ...(honorariosRetentionPolicy ? { honorarios_retention_policy: honorariosRetentionPolicy } : {}),
      custom_terminology: customTerminology || {},
      onboarding_completed: true,
    });

    // Precargar catálogo maestro adaptado al rubro (solo si no existe ya)
    if (seedIndustryCatalog) {
      const { count } = await admin
        .from('master_costs')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId);

      if (!count || count === 0) {
        const blueprint = getIndustryBlueprint(industryType);
        const rows = blueprint.starterCatalog.map((tpl) => {
          const fin = calculateFinancials(tpl.costo, tpl.ganancia, tpl.tipo_doc_costo, tpl.aplicaIvaVenta);
          return {
            organization_id: orgId,
            servicio: tpl.servicio,
            tiempo_detalle: formatCostMetadata({
              resourceType: tpl.resourceType,
              staffCount: tpl.staffCount,
              staffHours: tpl.staffHours,
              staffModality: tpl.staffModality,
              aplicaIvaVenta: tpl.aplicaIvaVenta,
              cleanDetail: tpl.detail,
            }),
            tipo_evento: tpl.tipo_evento,
            costo: tpl.costo,
            ganancia: tpl.ganancia,
            valor_neto: fin.valorNeto,
            valor_total: fin.valorTotal,
            tipo_doc_costo: tpl.tipo_doc_costo,
          };
        });

        await admin.from('master_costs').insert(rows as any);
      }
    }

    return NextResponse.json({
      success: true,
      organization: updatedOrg,
    });
  } catch (err: any) {
    console.error('Error POST /api/onboarding/complete:', err);
    return NextResponse.json(
      { error: err.message || 'Error al guardar personalización.' },
      { status: 500 }
    );
  }
}
