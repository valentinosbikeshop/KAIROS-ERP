'use client';

import { jsPDF } from 'jspdf';
import { EventItem, Event } from '@/types';
import { useUser } from '@/hooks/use-user';
import { useWorkspaceConfig } from '@/hooks/use-workspace-config';
import {
  computeItemFinancials,
  computeProjectFinancials,
  isBudgetLineItem,
} from '@/lib/finance-core';
import { brandingCapabilities } from '@/lib/plan-guards';
import { can } from '@/lib/rbac';
import { formatCLP, formatPercentage, formatDateCL } from '@/lib/utils';
import { tryAddOrgLogoToPdf } from '@/lib/pdf-logo';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { useState } from 'react';

export function PdfGenerator({ event, items }: { event: Event; items: EventItem[] }) {
  const [loading, setLoading] = useState(false);
  const { organization, profile } = useUser();
  const { entitlements, isDuoExempt, terms } = useWorkspaceConfig();
  const caps = brandingCapabilities(entitlements);
  const canViewMargins = isDuoExempt || can(profile, 'view_costs_margins', entitlements);

  const orgTitle = (organization?.name || 'FIGURA').toUpperCase();
  const orgFooter = organization?.name || 'FIGURA';

  const generatePDF = async () => {
    setLoading(true);
    try {
      const doc = new jsPDF('p', 'mm', 'letter');
      const dateStr = new Date().toLocaleDateString('es-CL');

      if (caps.logo) {
        tryAddOrgLogoToPdf(doc, organization?.logo_url, 20, 12, 13);
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text(orgTitle, 105, 20, { align: 'center' });

      doc.setFontSize(13);
      doc.setFont('helvetica', 'normal');
      doc.text(`Informe Contable de ${terms.projectSingular}`, 105, 29, { align: 'center' });

      doc.setFontSize(9.5);
      doc.text(`Fecha de emisión: ${dateStr}`, 105, 36, { align: 'center' });

      doc.setLineWidth(0.5);
      doc.line(20, 40, 196, 40);

      // Project Info
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`Información del ${terms.projectSingular}`, 20, 48);

      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'normal');
      const eventDate = event.event_date ? formatDateCL(event.event_date) : 'N/A';
      doc.text(`${terms.projectSingular}: ${event.name}`, 20, 56);
      doc.text(`${terms.clientLabel}: ${event.client_company || 'N/A'}`, 20, 62);
      doc.text(`Fecha: ${eventDate}`, 20, 68);
      doc.text(`${terms.locationLabel}: ${event.location || 'N/A'}`, 20, 74);

      const activeTaxRegime = event.tax_regime || organization?.tax_regime || 'afecto_iva';
      const honorariosPolicy = organization?.honorarios_retention_policy || 'contractor';

      const officialTopLevel = items.filter(
        (it) => it.approved && !it.parent_id && !it.es_insumo && isBudgetLineItem(it)
      );

      const projectFin = computeProjectFinancials(items, {
        taxRegime: activeTaxRegime,
        honorariosPolicy,
        onlyApproved: true,
      });

      // Table Header
      let y = 86;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);

      const cols = {
        servicio: 20,
        detalle: 60,
        cant: 96,
        costo: 110,
        utilidad: 132,
        neto: 154,
        iva: 172,
        total: 196,
      };

      doc.text('Partida', cols.servicio, y);
      doc.text('Detalle', cols.detalle, y);
      doc.text('Cant.', cols.cant, y);
      if (canViewMargins) {
        doc.text('Costo Tot.', cols.costo, y);
        doc.text('Util. Neta', cols.utilidad, y);
      }
      doc.text('Neto Tot.', cols.neto, y);
      doc.text('IVA Tot.', cols.iva, y);
      doc.text('Total', cols.total, y, { align: 'right' });

      doc.setLineWidth(0.2);
      doc.line(20, y + 2, 196, y + 2);
      y += 7;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);

      officialTopLevel.forEach((item) => {
        const fin = computeItemFinancials(item, { taxRegime: activeTaxRegime });
        const servicioText = (item.servicio || '').substring(0, 20);
        const detalleText = (item.detalle || '').substring(0, 20);

        doc.text(servicioText, cols.servicio, y);
        doc.text(detalleText, cols.detalle, y);
        doc.text(String(fin.cantidad), cols.cant, y);
        if (canViewMargins) {
          doc.text(formatCLP(fin.costoBruto), cols.costo, y);
          doc.text(formatCLP(fin.utilidadNeta), cols.utilidad, y);
        }
        doc.text(formatCLP(fin.ventaNeta), cols.neto, y);
        doc.text(fin.isExemptSale ? 'Exento' : formatCLP(fin.ivaDebito), cols.iva, y);
        doc.text(formatCLP(fin.ventaTotal), cols.total, y, { align: 'right' });

        y += 6;
        if (y > 245) {
          doc.addPage();
          y = 20;
        }
      });

      doc.line(20, y, 196, y);
      y += 9;

      if (canViewMargins) {
        if (y > 210) {
          doc.addPage();
          y = 20;
        }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('Resumen Financiero & Tributario (SII)', 20, y);
        y += 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);

        doc.text(`Total Costo Neto (ex-IVA): ${formatCLP(projectFin.costoNetoTotal)}`, 20, y);
        doc.text(`Total Costo Bruto: ${formatCLP(projectFin.costoBrutoTotal)}`, 112, y);
        y += 5.5;

        doc.text(`Facturación Neta (ex-IVA): ${formatCLP(projectFin.facturacionNeta)}`, 20, y);
        doc.text(`Facturación Bruta c/IVA: ${formatCLP(projectFin.facturacionBruta)}`, 112, y);
        y += 5.5;

        doc.text(`IVA Débito: ${formatCLP(projectFin.ivaDebito)}`, 20, y);
        doc.text(`IVA Crédito Real: -${formatCLP(projectFin.ivaCredito)}`, 112, y);
        y += 5.5;

        doc.setFont('helvetica', 'bold');
        doc.text(`Utilidad Neta Real (ex-IVA): ${formatCLP(projectFin.utilidadNeta)}`, 20, y);
        doc.text(`Margen s/ Venta: ${formatPercentage(projectFin.margenVentaPct)}`, 112, y);
        y += 8;

        doc.text('Ejecución Real de Caja (Abonos & Gastos Rendidos)', 20, y);
        y += 5.5;
        doc.setFont('helvetica', 'normal');
        doc.text(`Abonos Recibidos: ${formatCLP(projectFin.executed.abonosBrutos)}`, 20, y);
        doc.text(`Gastos Reales: ${formatCLP(projectFin.executed.gastosBrutos)}`, 112, y);
        y += 5.5;
        doc.text(
          `Retención Honorarios 15,25%: ${formatCLP(projectFin.executed.retencionHonorariosTotal)}`,
          20,
          y
        );
        doc.text(
          `Caja Neta Ejecutada: ${formatCLP(projectFin.executed.cajaNetaEjecutada)}`,
          112,
          y
        );
      }

      const hideFigura = caps.whiteLabel && Boolean(organization?.hide_figura_branding ?? true);
      const customFooter =
        caps.customLegalFooter && organization?.white_label_footer
          ? organization.white_label_footer
          : null;

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.text(
        customFooter ||
          (hideFigura
            ? `Documento emitido por ${orgFooter} - ${dateStr}`
            : `Documento generado por ${orgFooter} vía FIGURA ERP - ${dateStr}`),
        105,
        270,
        { align: 'center' }
      );

      doc.save(`informe-${event.name}-${dateStr}.pdf`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={generatePDF} disabled={loading}>
      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
      Descargar PDF
    </Button>
  );
}
