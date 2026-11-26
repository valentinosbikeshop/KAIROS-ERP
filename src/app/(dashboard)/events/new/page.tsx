'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Zap, ArrowRight, Loader2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { computeItemFinancials, formatMoney } from '@/lib/finance-core';
import {
  canCreateProject,
  canUseModule,
  countProjectsForQuota,
  requiredPlanForModule,
} from '@/lib/plan-guards';
import { EventForm } from '@/components/events/event-form';
import { FeatureLockCard } from '@/components/billing/feature-gate';
import { useWorkspaceConfig } from '@/hooks/use-workspace-config';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { IndustryExpressTemplate } from '@/lib/industries';

export default function NewEventPage() {
  const router = useRouter();
  const { terms, industry, organization, entitlements, plans, isDuoExempt } =
    useWorkspaceConfig();
  const [creatingTplId, setCreatingTplId] = useState<string | null>(null);
  const [quotaLoading, setQuotaLoading] = useState(true);
  const [allEvents, setAllEvents] = useState<
    Array<{ id: string; status: string; created_at: string; deleted_at: string | null }>
  >([]);
  const [expressError, setExpressError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    supabase
      .from('events')
      .select('id, status, created_at, deleted_at')
      .then(({ data }) => {
        if (!active) return;
        setAllEvents((data as any[]) || []);
        setQuotaLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const counts = countProjectsForQuota(allEvents);
  const projectGuard = canCreateProject(entitlements, counts);
  const creationBlocked = !isDuoExempt && !quotaLoading && !projectGuard.allowed;
  const canUseConsolidation =
    isDuoExempt || canUseModule(entitlements, 'mod_consolidation_retail');
  const orgTaxRegime = organization?.tax_regime || 'afecto_iva';

  const requiredUpgradePlanName =
    plans.find((p) => p.id === projectGuard.requiredPlan)?.name ||
    requiredPlanForModule('mod_unlimited_projects', plans).name;

  const handleExpressCreate = async (tpl: IndustryExpressTemplate) => {
    setExpressError(null);
    if (!isDuoExempt && !projectGuard.allowed) {
      setExpressError(
        projectGuard.reason ||
          `Alcanzó el límite de proyectos de su plan. Actualice a ${requiredUpgradePlanName}.`
      );
      return;
    }

    setCreatingTplId(tpl.id);
    const supabase = createClient();
    try {
      // Revalidación fresca antes de insertar
      if (!isDuoExempt) {
        const { data: freshRows } = await supabase
          .from('events')
          .select('id, status, created_at, deleted_at');
        const freshGuard = canCreateProject(
          entitlements,
          countProjectsForQuota((freshRows as any[]) || [])
        );
        if (!freshGuard.allowed) {
          throw new Error(
            freshGuard.reason ||
              `Alcanzó el límite de proyectos (${freshGuard.current}/${freshGuard.limit}).`
          );
        }
      }

      const today = new Date();
      const eventDate = today.toISOString().split('T')[0];

      const fullInsertPayload: Record<string, unknown> = {
        organization_id: organization?.id,
        name: tpl.name,
        client_company: tpl.clientPlaceholder,
        location: tpl.locationPlaceholder,
        event_date: eventDate,
        month: today.getMonth() + 1,
        year: today.getFullYear(),
        description: tpl.description,
        status: 'planning',
        has_retail_sales: canUseConsolidation ? tpl.hasRetailSales : false,
        currency: 'CLP',
        exchange_rate: 1,
        tax_regime: orgTaxRegime,
        is_demo_base: false,
      };

      let { data: created, error: evErr } = await (supabase.from('events') as any)
        .insert(fullInsertPayload)
        .select()
        .single();

      if (evErr && (evErr.code === 'PGRST204' || String(evErr.message || '').includes('column'))) {
        const { tax_regime: _tr, ...basePayload } = fullInsertPayload;
        const retry = await (supabase.from('events') as any)
          .insert(basePayload)
          .select()
          .single();
        created = retry.data;
        evErr = retry.error;
      }

      if (evErr || !created) throw evErr || new Error('No se pudo crear la cotización express');

      const rows = tpl.items.map((it) => {
        const fin = computeItemFinancials(
          {
            costo: it.costo,
            ganancia: it.ganancia,
            cantidad: 1,
            tipo_doc_costo: it.tipo_doc_costo,
            iva_incluido: true,
          },
          { taxRegime: orgTaxRegime }
        );
        const isExempt = fin.isExemptSale;
        return {
          organization_id: created.organization_id || organization?.id,
          event_id: created.id,
          servicio: it.servicio,
          detalle: it.detalle,
          tipo_evento: it.tipo_evento,
          cantidad: it.cantidad,
          costo: it.costo,
          ganancia: it.ganancia,
          valor_neto: fin.ventaNetaUnit,
          iva: fin.ivaDebitoUnit,
          valor_total: fin.ventaTotalUnit,
          margen: fin.margenVentaPct,
          tipo_doc_costo: it.tipo_doc_costo,
          approved: false,
          parent_id: null,
          es_insumo: false,
          iva_incluido: !isExempt,
          es_exento: isExempt,
          is_demo_base: false,
        };
      });

      if (rows.length > 0) {
        const { error: itemsErr } = await (supabase.from('event_items') as any).insert(rows);
        if (itemsErr && (itemsErr.code === 'PGRST204' || String(itemsErr.message || '').includes('column'))) {
          const fallbackRows = rows.map(({ es_exento: _ee, ...rest }) => rest);
          await (supabase.from('event_items') as any).insert(fallbackRows);
        }
      }

      router.push(`/events/${created.id}`);
    } catch (err: any) {
      console.error('Error creating express quote:', err);
      setExpressError(err?.message || 'No se pudo generar la cotización express.');
      setCreatingTplId(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-24">
      <div>
        <Link
          href="/events"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver a {terms.projectPlural}
        </Link>
        <h1 className="text-3xl font-bold mb-2">{terms.newProjectCta}</h1>
        <p className="text-muted-foreground">
          Cree una cotización en 1 clic con plantillas de <strong>{industry.shortName}</strong> o complete los datos manualmente.
        </p>
      </div>

      {creationBlocked && (
        <FeatureLockCard
          isExpiredLock={entitlements.isExpiredLock}
          title={
            entitlements.isExpiredLock
              ? 'Suscripción pendiente de renovación'
              : projectGuard.mode === 'monthly'
              ? `Cupo mensual completo (${projectGuard.current}/${projectGuard.limit})`
              : `Cupo de ${terms.projectPlural.toLowerCase()} activos completo (${projectGuard.current}/${projectGuard.limit})`
          }
          description={
            projectGuard.reason ||
            `Sus ${terms.projectPlural.toLowerCase()} existentes siguen disponibles. Actualice su plan para crear o duplicar nuevos registros.`
          }
          requiredPlanLabel={requiredUpgradePlanName}
        />
      )}

      {expressError && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs text-destructive flex items-center gap-2"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{expressError}</span>
        </div>
      )}

      {industry.expressTemplates.length > 0 && (
        <Card className="glass-card border-[#1261E0]/25 bg-gradient-to-br from-[#1261E0]/[0.04] via-white to-[#0D8A72]/[0.03]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-[#1261E0]" />
                Cotización Express (1 Clic) · {industry.shortName}
              </CardTitle>
              <Badge variant="outline" className="text-[10px] bg-[#1261E0]/10 text-[#0F4FB8] border-[#1261E0]/20">
                Carga partidas automáticamente
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Ideal para cotizar rápido: crea el {terms.projectSingular.toLowerCase()} con sus partidas listas en Borrador para ajustar cantidades, optimizar con IA y exportar a PDF.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {industry.expressTemplates.map((tpl) => {
              const isBusy = creatingTplId === tpl.id;
              // Matemática única vía finance-core: coincide al peso con las filas creadas
              const estTotal = tpl.items.reduce((acc, it) => {
                const fin = computeItemFinancials(
                  {
                    costo: it.costo,
                    ganancia: it.ganancia,
                    cantidad: it.cantidad,
                    tipo_doc_costo: it.tipo_doc_costo,
                    iva_incluido: true,
                  },
                  { taxRegime: orgTaxRegime }
                );
                return acc + fin.ventaTotal;
              }, 0);
              const isExemptRegime =
                orgTaxRegime === 'sociedad_profesionales' ||
                orgTaxRegime === 'exportacion_turismo';

              return (
                <div
                  key={tpl.id}
                  className="rounded-xl border border-border/80 bg-white p-4 flex flex-col justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="font-semibold text-sm text-foreground leading-snug">
                      {tpl.name}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{tpl.description}</p>
                    <div className="text-[11px] font-medium text-[#0D8A72] pt-1 tabular-nums">
                      {tpl.items.length} partidas listas · Total {formatMoney(estTotal, 'CLP')}{' '}
                      {isExemptRegime ? 'Exento' : 'c/IVA'}
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    disabled={Boolean(creatingTplId) || creationBlocked || quotaLoading}
                    onClick={() => handleExpressCreate(tpl)}
                    className="w-full gap-1.5 text-xs font-semibold tactile-press"
                  >
                    {isBusy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Zap className="h-3.5 w-3.5" />
                    )}
                    {creationBlocked ? 'Cupo Alcanzado' : 'Crear Cotización Express'}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <EventForm disabled={creationBlocked} initialQuotaCount={counts} />
    </div>
  );
}
