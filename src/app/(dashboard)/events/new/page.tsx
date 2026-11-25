'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, ArrowRight, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { calculateFinancials, formatCLP } from '@/lib/utils';
import { EventForm } from '@/components/events/event-form';
import { useWorkspaceConfig } from '@/hooks/use-workspace-config';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { IndustryExpressTemplate } from '@/lib/industries';

export default function NewEventPage() {
  const router = useRouter();
  const { terms, industry, organization } = useWorkspaceConfig();
  const [creatingTplId, setCreatingTplId] = useState<string | null>(null);

  const handleExpressCreate = async (tpl: IndustryExpressTemplate) => {
    setCreatingTplId(tpl.id);
    const supabase = createClient();
    try {
      const today = new Date();
      const eventDate = today.toISOString().split('T')[0];

      const { data: created, error: evErr } = await (supabase.from('events') as any)
        .insert({
          organization_id: organization?.id,
          name: tpl.name,
          client_company: tpl.clientPlaceholder,
          location: tpl.locationPlaceholder,
          event_date: eventDate,
          month: today.getMonth() + 1,
          year: today.getFullYear(),
          description: tpl.description,
          status: 'planning',
          has_retail_sales: tpl.hasRetailSales,
          is_demo_base: false,
        })
        .select()
        .single();

      if (evErr || !created) throw evErr || new Error('No se pudo crear la cotización express');

      const rows = tpl.items.map((it) => {
        const fin = calculateFinancials(it.costo, it.ganancia, it.tipo_doc_costo, true, false);
        return {
          organization_id: created.organization_id || organization?.id,
          event_id: created.id,
          servicio: it.servicio,
          detalle: it.detalle,
          tipo_evento: it.tipo_evento,
          cantidad: it.cantidad,
          costo: it.costo,
          ganancia: it.ganancia,
          valor_neto: fin.valorNeto,
          iva: fin.ivaDebito,
          valor_total: fin.valorTotal,
          margen: fin.margen,
          tipo_doc_costo: it.tipo_doc_costo,
          approved: false,
          parent_id: null,
          es_insumo: false,
          iva_incluido: true,
          is_demo_base: false,
        };
      });

      if (rows.length > 0) {
        await (supabase.from('event_items') as any).insert(rows);
      }

      router.push(`/events/${created.id}`);
    } catch (err: any) {
      console.error('Error creating express quote:', err);
      alert(err?.message || 'No se pudo generar la cotización express.');
      setCreatingTplId(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">{terms.newProjectCta}</h1>
        <p className="text-muted-foreground">
          Crea una cotización en 1 clic con plantillas de <strong>{industry.shortName}</strong> o completa los datos manualmente.
        </p>
      </div>

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
              Ideal para cotizar rápido: crea el proyecto con sus partidas listas en Borrador para ajustar cantidades, optimizar con IA y exportar a PDF.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {industry.expressTemplates.map((tpl) => {
              const isBusy = creatingTplId === tpl.id;
              const estTotal = tpl.items.reduce(
                (acc, it) => acc + Math.round((it.costo + it.ganancia) * 1.19 * it.cantidad),
                0
              );
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
                      {tpl.items.length} partidas listas · Est. {formatCLP(estTotal)} c/IVA
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    disabled={Boolean(creatingTplId)}
                    onClick={() => handleExpressCreate(tpl)}
                    className="w-full gap-1.5 text-xs font-semibold tactile-press"
                  >
                    {isBusy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Zap className="h-3.5 w-3.5" />
                    )}
                    Crear Cotización Express
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <EventForm />
    </div>
  );
}
