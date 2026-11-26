'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';
import { EventItem, Event, QuoteCurrency } from '@/types';
import { useUser } from '@/hooks/use-user';
import { useWorkspaceConfig } from '@/hooks/use-workspace-config';
import { isFounderOrg } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/client';
import {
  computeItemFinancials,
  formatMoney,
  isBudgetLineItem,
} from '@/lib/finance-core';
import { brandingCapabilities } from '@/lib/plan-guards';
import { evaluateMarginPolicy } from '@/lib/rbac';
import { logAudit } from '@/lib/audit';
import {
  PAYMENT_TERM_PRESETS,
  PaymentTermPreset,
  parsePaymentTerms,
  serializePaymentTerms,
} from '@/components/events/project-helpers';
import { formatCLP, formatCurrencyAmount, formatDateCL } from '@/lib/utils';
import { tryAddOrgLogoToPdf } from '@/lib/pdf-logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from '@/components/ui/dialog';
import {
  FileText,
  Download,
  Loader2,
  Video,
  Building2,
  Clock,
  Plus,
  Trash2,
  AlertTriangle,
  Lock,
  Landmark,
} from 'lucide-react';

interface ClientQuotePdfDialogProps {
  event: Event;
  items: EventItem[];
  triggerButton?: React.ReactNode;
  onEventUpdated?: (updated: Event) => void;
}

interface VideoPreset {
  id: string;
  title: string;
  url: string;
}

const DEFAULT_VIDEO_PRESETS: VideoPreset[] = [
  {
    id: 'duo-cuerdas',
    title: 'Dúo de Cuerdas (Violín & Chelo) - Ceremonias y Cóctel',
    url: 'https://www.youtube.com/watch?v=sample-duo-cuerdas',
  },
  {
    id: 'solista-violin',
    title: 'Solista Violín Clásico & Pop - Show en Vivo',
    url: 'https://www.youtube.com/watch?v=sample-solista-violin',
  },
  {
    id: 'cuarteto-gala',
    title: 'Cuarteto de Cuerdas de Gala - Eventos Corporativos',
    url: 'https://www.youtube.com/watch?v=sample-cuarteto-gala',
  },
  {
    id: 'trio-jazz',
    title: 'Trío Jazz & Bossa Nova - Recepciones y Cenas',
    url: 'https://www.youtube.com/watch?v=sample-trio-jazz',
  },
];

export function ClientQuotePdfDialog({
  event,
  items,
  triggerButton,
  onEventUpdated,
}: ClientQuotePdfDialogProps) {
  const { organization, profile } = useUser();
  const { entitlements, industry, terms, plans } = useWorkspaceConfig();
  const isFounder = isFounderOrg(organization);
  const caps = brandingCapabilities(entitlements);
  const planName = (tier: string) => plans.find((p) => p.id === tier)?.name || tier;

  const orgName = organization?.name || 'FIGURA';
  const orgLegalName = organization?.legal_name || orgName;
  const orgSubtitle =
    organization?.subtitle || `PROPUESTA COMERCIAL — ${industry.shortName.toUpperCase()}`;
  const orgRut = organization?.rut || '';
  const orgLocation = organization?.location || 'Chile';
  const orgEmail = organization?.contact_email || '';
  const orgPhone = organization?.contact_phone || '';
  const bankInfo = organization?.bank_info || {};
  const secondaryAccounts = Array.isArray(organization?.secondary_accounts)
    ? organization.secondary_accounts
    : [];

  const [isOpen, setIsOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [savingTerms, setSavingTerms] = useState(false);
  const [statusNote, setStatusNote] = useState<string | null>(null);

  const isEventosMusic = isFounder || industry.id === 'eventos_banqueteria';
  const effectiveTaxRegime = event.tax_regime || organization?.tax_regime || 'afecto_iva';

  const initialParsedTerms = useMemo(
    () => parsePaymentTerms(event.payment_terms),
    [event.payment_terms]
  );

  // Form states
  const [clientName, setClientName] = useState(event.client_company || event.name || '');
  const [clientRut, setClientRut] = useState('');
  const [eventLocation, setEventLocation] = useState(event.location || orgLocation);
  const [eventDate, setEventDate] = useState(
    event.event_date ? formatDateCL(event.event_date) : ''
  );
  const [eventDuration, setEventDuration] = useState(
    isEventosMusic ? '2 horas de servicio musical' : 'Según cronograma acordado'
  );
  const [eventSchedule] = useState(
    isEventosMusic
      ? 'Horario a coordinar según pauta'
      : 'Coordinación de inicio según pauta del cliente'
  );
  const [eventCalltime] = useState(
    isEventosMusic
      ? 'Llegada previa 45-60 min para montaje y prueba de sonido'
      : 'Coordinación logística previa según planificación operativa'
  );
  const [eventRepertoire, setEventRepertoire] = useState(
    isEventosMusic
      ? 'Repertorio personalizado y selección de estilos según la ocasión'
      : 'Alcance técnico y partidas detalladas según propuesta económica'
  );

  // Payment terms & validity state
  const [paymentPresetId, setPaymentPresetId] = useState<PaymentTermPreset['id']>(
    initialParsedTerms.presetId
  );
  const [depositPctInput, setDepositPctInput] = useState<string>(
    String(Math.round(initialParsedTerms.depositPct * 100))
  );
  const [paymentClausesText, setPaymentClausesText] = useState<string>(
    initialParsedTerms.clauses.join('\n')
  );
  const [validityDaysInput, setValidityDaysInput] = useState<string>(
    String(initialParsedTerms.validityDays || 7)
  );

  useEffect(() => {
    const parsed = parsePaymentTerms(event.payment_terms);
    setPaymentPresetId(parsed.presetId);
    setDepositPctInput(String(Math.round(parsed.depositPct * 100)));
    setPaymentClausesText(parsed.clauses.join('\n'));
    setValidityDaysInput(String(parsed.validityDays || 7));
  }, [event.payment_terms]);

  const validityDays = Math.max(1, Math.min(90, parseInt(validityDaysInput, 10) || 7));
  const depositPctNum = Math.max(
    0,
    Math.min(100, Number(depositPctInput === '' ? 0 : depositPctInput) || 0)
  );

  // Política de margen unificada (excluye pass-through vía finance-core)
  const marginPolicy = useMemo(
    () => evaluateMarginPolicy(event, organization, items, profile, entitlements),
    [event, organization, items, profile, entitlements]
  );
  const isMarginBlocked = marginPolicy.blockedForUser;
  const minMarginFloor = marginPolicy.minMarginPct;
  const currentProjectMargin = marginPolicy.currentMarginPct;

  // Partidas cotizables (aprobadas, no insumo, no abono/gasto, nivel superior para evitar doble conteo de hijos)
  const nonInsumoItems = useMemo(
    () =>
      items.filter(
        (it) =>
          !it.parent_id &&
          !it.es_insumo &&
          isBudgetLineItem(it) &&
          Number(it.valor_total || 0) > 0
      ),
    [items]
  );

  const [selectedItemIds, setSelectedItemIds] = useState<string[]>(() =>
    nonInsumoItems.map((it) => it.id).filter(Boolean) as string[]
  );
  const knownItemIdsRef = useRef<Set<string>>(
    new Set(nonInsumoItems.map((it) => it.id).filter(Boolean) as string[])
  );

  // Re-sincronizar automáticamente cuando se aprueban nuevos ítems en Borrador o cambia el listado
  useEffect(() => {
    const currentIds = nonInsumoItems.map((it) => it.id).filter(Boolean) as string[];
    const currentSet = new Set(currentIds);
    const newlyAdded = currentIds.filter((id) => !knownItemIdsRef.current.has(id));

    setSelectedItemIds((prev) => {
      const stillValid = prev.filter((id) => currentSet.has(id));
      const merged = new Set([...stillValid, ...newlyAdded]);
      return Array.from(merged);
    });

    knownItemIdsRef.current = currentSet;
  }, [nonInsumoItems]);

  // Enlaces / anexos digitales opcionales
  const [includeVideos, setIncludeVideos] = useState(false);
  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>([
    'duo-cuerdas',
    'solista-violin',
  ]);
  const [customVideos, setCustomVideos] = useState<{ title: string; url: string }[]>([]);
  const [newCustomTitle, setNewCustomTitle] = useState('');
  const [newCustomUrl, setNewCustomUrl] = useState('');

  const handleSelectPreset = (presetId: PaymentTermPreset['id']) => {
    setPaymentPresetId(presetId);
    const preset = PAYMENT_TERM_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setDepositPctInput(String(Math.round(preset.depositPct * 100)));
      setPaymentClausesText(preset.clauses.join('\n'));
    }
  };

  const buildSerializedTerms = () => {
    const clauses = paymentClausesText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    return serializePaymentTerms({
      presetId: paymentPresetId,
      depositPct: depositPctNum / 100,
      clauses:
        clauses.length > 0
          ? clauses
          : ['Condiciones de pago según acuerdo comercial entre las partes.'],
      validityDays,
      customText: paymentPresetId === 'custom' ? paymentClausesText.trim() : undefined,
    });
  };

  const persistPaymentTermsIfNeeded = async () => {
    const serialized = buildSerializedTerms();
    if (serialized === (event.payment_terms || '')) return;

    setSavingTerms(true);
    try {
      const supabase = createClient();
      const { error } = await (supabase.from('events') as any)
        .update({ payment_terms: serialized })
        .eq('id', event.id);

      if (!error) {
        onEventUpdated?.({ ...event, payment_terms: serialized });
        setStatusNote('Condiciones de pago guardadas en el proyecto.');
        setTimeout(() => setStatusNote(null), 2600);
        await logAudit('update', 'event', {
          entityId: event.id,
          before: { payment_terms: event.payment_terms || null },
          after: { payment_terms: serialized },
          metadata: { source: 'client_quote_pdf_dialog' },
        });
      }
    } catch {
      // No bloquear la exportación del PDF si falla el guardado secundario
    } finally {
      setSavingTerms(false);
    }
  };

  const handleAddCustomVideo = () => {
    if (!newCustomTitle.trim() || !newCustomUrl.trim()) return;
    setCustomVideos((prev) => [
      ...prev,
      { title: newCustomTitle.trim(), url: newCustomUrl.trim() },
    ]);
    setNewCustomTitle('');
    setNewCustomUrl('');
  };

  const handleRemoveCustomVideo = (index: number) => {
    setCustomVideos((prev) => prev.filter((_, idx) => idx !== index));
  };

  const toggleItemSelection = (id: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleAllItems = () => {
    if (selectedItemIds.length === nonInsumoItems.length) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(nonInsumoItems.map((it) => it.id).filter(Boolean) as string[]);
    }
  };

  const toggleVideoPreset = (id: string) => {
    setSelectedVideoIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Totales en vivo de los ítems seleccionados (para previsualización y PDF)
  const quoteSummary = useMemo(() => {
    const selected = nonInsumoItems.filter((it) => it.id && selectedItemIds.includes(it.id));
    let subtotalAfectoNeto = 0;
    let subtotalExentoNeto = 0;
    let subtotalReembolsable = 0;
    let totalIva = 0;

    selected.forEach((it) => {
      const fin = computeItemFinancials(it, { taxRegime: effectiveTaxRegime });
      if (fin.isPassthrough) {
        subtotalReembolsable += fin.ventaNeta;
      } else if (fin.isExemptSale) {
        subtotalExentoNeto += fin.ventaNeta;
      } else {
        subtotalAfectoNeto += fin.ventaNeta;
      }
      totalIva += fin.ivaDebito;
    });

    const subtotalNeto = subtotalAfectoNeto + subtotalExentoNeto + subtotalReembolsable;
    const totalGeneral = subtotalNeto + totalIva;

    return {
      selected,
      subtotalAfectoNeto,
      subtotalExentoNeto,
      subtotalReembolsable,
      subtotalNeto,
      totalIva,
      totalGeneral,
    };
  }, [nonInsumoItems, selectedItemIds, effectiveTaxRegime]);

  const currency: QuoteCurrency = event.currency || 'CLP';
  const exchangeRate = Number(event.exchange_rate || 1);
  const hasForeignCurrency = currency !== 'CLP' && exchangeRate > 1;
  const currencyRates = useMemo(
    () => ({
      uf: currency === 'UF' ? exchangeRate : organization?.uf_rate_clp,
      usd: currency === 'USD' ? exchangeRate : organization?.usd_rate_clp,
    }),
    [currency, exchangeRate, organization?.uf_rate_clp, organization?.usd_rate_clp]
  );

  const handleGeneratePDF = async () => {
    setGenerating(true);
    try {
      await persistPaymentTermsIfNeeded();

      const doc = new jsPDF('p', 'mm', 'letter');
      const pageWidth = 215.9;
      const marginX = 16;
      const contentWidth = pageWidth - marginX * 2;
      const todayStr = new Date().toLocaleDateString('es-CL', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });

      let currentY = 18;

      const checkPageBreak = (neededHeight: number) => {
        if (currentY + neededHeight > 258) {
          doc.addPage();
          currentY = 20;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(140, 140, 140);
          doc.text(`${orgName} • Propuesta comercial: ${clientName}`, marginX, 12);
          doc.text(`Página ${doc.getNumberOfPages()}`, marginX + contentWidth - 15, 12);
          doc.setDrawColor(220, 225, 230);
          doc.line(marginX, 14, marginX + contentWidth, 14);
        }
      };

      // 1. HEADER INSTITUCIONAL (Logo solo si el plan lo habilita)
      const hasLogo = caps.logo
        ? tryAddOrgLogoToPdf(doc, organization?.logo_url, marginX, currentY - 6, 13)
        : false;
      const headerTextX = hasLogo ? marginX + 16 : marginX;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(19);
      doc.setTextColor(18, 28, 48);
      doc.text(orgName.toUpperCase(), headerTextX, currentY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(90, 105, 125);
      doc.text(orgSubtitle.toUpperCase(), headerTextX, currentY + 5);

      // Bloque derecho de cotización
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(18, 28, 48);
      doc.text('COTIZACIÓN FORMAL', marginX + contentWidth, currentY, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 115, 130);
      doc.text(`Fecha: ${todayStr}`, marginX + contentWidth, currentY + 5, { align: 'right' });
      doc.text(`Validez: ${validityDays} días hábiles`, marginX + contentWidth, currentY + 9, {
        align: 'right',
      });

      currentY += 14;
      doc.setDrawColor(200, 210, 220);
      doc.setLineWidth(0.6);
      doc.line(marginX, currentY, marginX + contentWidth, currentY);
      currentY += 8;

      // 2. SALUDO FORMAL (sin clichés de "evento")
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(24, 34, 54);
      doc.text(
        `Estimado/a ${clientName || terms.clientLabel}${clientRut ? ` (RUT ${clientRut})` : ''}:`,
        marginX,
        currentY
      );
      currentY += 5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(60, 75, 95);
      const greetingParagraph = `Como equipo ${orgName} agradecemos la oportunidad de presentar nuestra propuesta técnica y económica para el desarrollo de ${terms.projectSingular.toLowerCase()} "${event.name}". A continuación detallamos los alcances, partidas y condiciones comerciales:`;
      const splitGreeting = doc.splitTextToSize(greetingParagraph, contentWidth);
      doc.text(splitGreeting, marginX, currentY);
      currentY += splitGreeting.length * 4.2 + 4;

      // 3. CUADRO DE ANTECEDENTES GENERALES
      checkPageBreak(38);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.roundedRect(marginX, currentY, contentWidth, 34, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text(`ANTECEDENTES DE ${terms.projectSingular.toUpperCase()}`, marginX + 4, currentY + 6);

      const colLeftX = marginX + 4;
      const colRightX = marginX + contentWidth / 2 + 2;

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.text(`${terms.projectSingular}:`, colLeftX, currentY + 13);
      doc.setFont('helvetica', 'normal');
      doc.text((event.name || terms.projectSingular).substring(0, 36), colLeftX + 24, currentY + 13);

      doc.setFont('helvetica', 'bold');
      doc.text('Fecha:', colLeftX, currentY + 19);
      doc.setFont('helvetica', 'normal');
      doc.text(eventDate || 'Por definir', colLeftX + 13, currentY + 19);

      doc.setFont('helvetica', 'bold');
      doc.text(`${terms.locationLabel}:`, colLeftX, currentY + 25);
      doc.setFont('helvetica', 'normal');
      doc.text((eventLocation || orgLocation).substring(0, 32), colLeftX + 22, currentY + 25);

      doc.setFont('helvetica', 'bold');
      doc.text('Plazo / Duración:', colLeftX, currentY + 31);
      doc.setFont('helvetica', 'normal');
      doc.text((eventDuration || 'Según cronograma').substring(0, 28), colLeftX + 28, currentY + 31);

      // Columna Derecha
      doc.setFont('helvetica', 'bold');
      doc.text('Coordinación:', colRightX, currentY + 13);
      doc.setFont('helvetica', 'normal');
      doc.text((eventSchedule || 'Por coordinar').substring(0, 34), colRightX + 23, currentY + 13);

      doc.setFont('helvetica', 'bold');
      doc.text(isEventosMusic ? 'Montaje:' : 'Inicio:', colRightX, currentY + 19);
      doc.setFont('helvetica', 'normal');
      doc.text(eventCalltime.substring(0, 36), colRightX + 16, currentY + 19);

      doc.setFont('helvetica', 'bold');
      doc.text(isEventosMusic ? 'Repertorio:' : 'Alcance:', colRightX, currentY + 25);
      doc.setFont('helvetica', 'normal');
      const repLines = doc.splitTextToSize(
        eventRepertoire || 'Según especificaciones detalladas',
        contentWidth / 2 - 22
      );
      doc.text(repLines.slice(0, 2), colRightX + 20, currentY + 25);

      currentY += 40;

      // 4. FICHA TÉCNICA Y PROTOCOLO OPERATIVO
      checkPageBreak(28);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text('ALCANCE TÉCNICO & ESTÁNDARES DE SERVICIO', marginX, currentY);
      currentY += 5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(70, 85, 105);
      const technicalBullets = isFounder
        ? [
            '• Personal y Músicos: Intérpretes profesionales egresados de conservatorio y staff técnico capacitado.',
            '• Equipamiento de Sonido: Amplificación profesional propia e inalámbrica según la acústica del recinto.',
            '• Mobiliario & Atriles: Atriles profesionales de concierto, banquetas e iluminación autónoma de partituras.',
            '• Vestimenta: Rigurosa etiqueta formal institucional acorde a la solemnidad de la actividad.',
            '• Requisitos de Instalación: Punto eléctrico 220V a menos de 15 metros y espacio protegido de lluvia o sol directo.',
          ]
        : [
            `• Equipo Profesional: Especialistas acreditados y supervisión asignada bajo estándares de ${industry.shortName}.`,
            '• Alcance e Insumos: Provisión integral de materiales, recursos o servicios conforme a partidas detalladas.',
            '• Supervisión & Calidad: Coordinación operativa continua, control de cumplimiento y trazabilidad en terreno.',
            '• Respaldo Tributario: Documentación tributaria SII vigente y estricto cumplimiento normativo laboral.',
          ];
      technicalBullets.forEach((bullet) => {
        doc.text(bullet, marginX + 2, currentY);
        currentY += 4.2;
      });
      currentY += 4;

      // 5. TABLA DE PROPUESTA ECONÓMICA (VALORES CLIENTE + EXENTOS + MONEDA)
      checkPageBreak(32);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(18, 28, 48);
      doc.text('PROPUESTA ECONÓMICA DE SERVICIOS Y PARTIDAS', marginX, currentY);
      currentY += 4;

      doc.setFillColor(26, 38, 57);
      doc.rect(marginX, currentY, contentWidth, 7, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text('N°', marginX + 3, currentY + 4.8);
      doc.text('Partida / Servicio', marginX + 10, currentY + 4.8);
      doc.text('Cant.', marginX + 104, currentY + 4.8, { align: 'center' });
      doc.text('Unit. Neto', marginX + 130, currentY + 4.8, { align: 'right' });
      doc.text('IVA', marginX + 150, currentY + 4.8, { align: 'right' });
      doc.text(
        hasForeignCurrency ? `Subtotal (${currency})` : 'Total c/IVA',
        marginX + contentWidth - 4,
        currentY + 4.8,
        { align: 'right' }
      );
      currentY += 7;

      quoteSummary.selected.forEach((item, index) => {
        checkPageBreak(12);
        const fin = computeItemFinancials(item, { taxRegime: effectiveTaxRegime });
        const rowHeight = hasForeignCurrency ? 10 : 7.5;

        doc.setFillColor(index % 2 === 0 ? 255 : 248, index % 2 === 0 ? 255 : 250, index % 2 === 0 ? 255 : 252);
        doc.rect(marginX, currentY, contentWidth, rowHeight, 'F');
        doc.setDrawColor(235, 240, 245);
        doc.line(marginX, currentY + rowHeight, marginX + contentWidth, currentY + rowHeight);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(40, 50, 65);

        const title = `${item.servicio || 'Servicio'}${fin.isPassthrough ? ' [Reemb.]' : fin.isExemptSale ? ' [Exento]' : ''}`;
        doc.text(String(index + 1), marginX + 3, currentY + 4.8);
        doc.text(title.substring(0, 44), marginX + 10, currentY + 4.8);
        doc.text(String(fin.cantidad), marginX + 104, currentY + 4.8, { align: 'center' });
        doc.text(formatCLP(fin.ventaNetaUnit), marginX + 130, currentY + 4.8, { align: 'right' });
        doc.text(
          fin.ivaDebito > 0 ? formatCLP(fin.ivaDebito) : 'Exento',
          marginX + 150,
          currentY + 4.8,
          { align: 'right' }
        );
        doc.setFont('helvetica', 'bold');
        doc.text(
          hasForeignCurrency
            ? formatMoney(fin.ventaTotal, currency, currencyRates)
            : formatCLP(fin.ventaTotal),
          marginX + contentWidth - 4,
          currentY + 4.8,
          { align: 'right' }
        );

        if (hasForeignCurrency) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(6.8);
          doc.setTextColor(110, 120, 135);
          doc.text(`Ref: ${formatCLP(fin.ventaTotal)}`, marginX + contentWidth - 4, currentY + 8.5, {
            align: 'right',
          });
        }

        currentY += rowHeight;
      });

      // Cuadro de Totales
      currentY += 3;
      const showMixedBreakdown =
        quoteSummary.subtotalAfectoNeto > 0 &&
        (quoteSummary.subtotalExentoNeto > 0 || quoteSummary.subtotalReembolsable > 0);
      const boxLines =
        (showMixedBreakdown ? 2 : 0) + (hasForeignCurrency ? 1 : 0) + 3;
      const boxHeight = 8 + boxLines * 5.6;

      checkPageBreak(boxHeight + 8);
      const totalsBoxWidth = 96;
      const totalsBoxX = marginX + contentWidth - totalsBoxWidth;

      doc.setFillColor(245, 248, 252);
      doc.setDrawColor(215, 225, 235);
      doc.roundedRect(totalsBoxX, currentY, totalsBoxWidth, boxHeight, 2, 2, 'FD');

      let ty = currentY + 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(60, 75, 95);

      if (showMixedBreakdown) {
        doc.text('Neto Afecto:', totalsBoxX + 5, ty);
        doc.text(formatCLP(quoteSummary.subtotalAfectoNeto), totalsBoxX + totalsBoxWidth - 5, ty, {
          align: 'right',
        });
        ty += 5.4;

        doc.text('Exento / Reembolsable:', totalsBoxX + 5, ty);
        doc.text(
          formatCLP(quoteSummary.subtotalExentoNeto + quoteSummary.subtotalReembolsable),
          totalsBoxX + totalsBoxWidth - 5,
          ty,
          { align: 'right' }
        );
        ty += 5.4;
      }

      doc.text('Total Neto:', totalsBoxX + 5, ty);
      doc.text(formatCLP(quoteSummary.subtotalNeto), totalsBoxX + totalsBoxWidth - 5, ty, {
        align: 'right',
      });
      ty += 5.6;

      doc.text(quoteSummary.totalIva > 0 ? 'IVA Débito (19%):' : 'IVA (Exento SII):', totalsBoxX + 5, ty);
      doc.text(formatCLP(quoteSummary.totalIva), totalsBoxX + totalsBoxWidth - 5, ty, {
        align: 'right',
      });
      ty += 6.6;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(18, 28, 48);
      doc.text('VALOR TOTAL (CLP):', totalsBoxX + 5, ty);
      doc.setTextColor(16, 120, 70);
      doc.text(formatCLP(quoteSummary.totalGeneral), totalsBoxX + totalsBoxWidth - 5, ty, {
        align: 'right',
      });

      if (hasForeignCurrency) {
        ty += 5.8;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(74, 96, 122);
        const eqText = `${formatCurrencyAmount(quoteSummary.totalGeneral, currency, exchangeRate)} (1 ${currency} = ${formatCLP(exchangeRate)})`;
        doc.text(eqText, totalsBoxX + totalsBoxWidth - 5, ty, { align: 'right' });
      }

      currentY += boxHeight + 6;

      // 6. CONDICIONES COMERCIALES CONFIGURABLES
      const parsedClauses = paymentClausesText
        .split('\n')
        .map((c) => c.trim())
        .filter(Boolean);
      const conditionsToRender = [
        ...parsedClauses.map((c, idx) => `${idx + 1}. ${c}`),
        `${parsedClauses.length + 1}. Validez de Oferta: Esta cotización mantiene sus valores vigentes durante ${validityDays} días hábiles desde su emisión.`,
      ];

      checkPageBreak(14 + conditionsToRender.length * 5);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(18, 28, 48);
      doc.text('CONDICIONES COMERCIALES & FORMA DE PAGO', marginX, currentY);
      currentY += 4.5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(60, 75, 95);
      conditionsToRender.forEach((cond) => {
        const lines = doc.splitTextToSize(cond, contentWidth - 4);
        checkPageBreak(lines.length * 4.2 + 2);
        doc.text(lines, marginX + 2, currentY);
        currentY += lines.length * 4.2;
      });
      currentY += 4;

      // 7. CUADRO BANCARIO (solo si plan incluye caps.bankInfo)
      if (caps.bankInfo) {
        const accountsToPrint = [
          {
            label: 'Cuenta Principal',
            banco: bankInfo.banco,
            tipo_cuenta: bankInfo.tipo_cuenta,
            numero_cuenta: bankInfo.numero_cuenta,
            titular: bankInfo.titular || orgLegalName,
            rut: bankInfo.rut || orgRut,
            email: bankInfo.email || orgEmail,
          },
          ...(caps.multipleBankAccounts
            ? secondaryAccounts.map((acc, idx) => ({
                label: `Cuenta Adicional ${idx + 1}`,
                banco: acc.banco,
                tipo_cuenta: acc.tipo_cuenta,
                numero_cuenta: acc.numero_cuenta,
                titular: acc.titular || orgLegalName,
                rut: acc.rut || orgRut,
                email: acc.email || orgEmail,
              }))
            : []),
        ];

        accountsToPrint.forEach((acc, accIdx) => {
          checkPageBreak(28);
          doc.setFillColor(250, 250, 252);
          doc.setDrawColor(200, 215, 230);
          doc.setLineWidth(0.4);
          doc.roundedRect(marginX, currentY, contentWidth, 24, 2, 2, 'FD');

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.setTextColor(18, 28, 48);
          const bankHeading =
            accIdx === 0
              ? `DATOS OFICIALES PARA TRANSFERENCIA BANCARIA${
                  depositPctNum > 0
                    ? ` (ANTICIPO ${depositPctNum}%: ${formatCLP(
                        Math.round(quoteSummary.totalGeneral * (depositPctNum / 100))
                      )})`
                    : ''
                }`
              : `${acc.label.toUpperCase()} PARA TRANSFERENCIA`;
          doc.text(bankHeading, marginX + 5, currentY + 5.5);

          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(50, 65, 85);

          doc.text(`• Banco: ${acc.banco || 'Por definir'}`, marginX + 5, currentY + 11);
          doc.text(
            `• Tipo de Cuenta: ${acc.tipo_cuenta || 'Cuenta Corriente'}`,
            marginX + 5,
            currentY + 16
          );
          doc.text(`• N° de Cuenta: ${acc.numero_cuenta || 'Por definir'}`, marginX + 5, currentY + 21);

          doc.text(`• Titular: ${acc.titular || orgLegalName}`, marginX + 90, currentY + 11);
          doc.text(`• RUT: ${acc.rut || orgRut || '—'}`, marginX + 90, currentY + 16);
          doc.text(
            `• Correo comprobantes: ${acc.email || orgEmail || '—'}`,
            marginX + 90,
            currentY + 21
          );

          currentY += 28;
        });
      }

      // 8. ANEXOS DIGITALES / REFERENCIAS OPCIONALES
      if (includeVideos) {
        const activePresets = isFounder
          ? DEFAULT_VIDEO_PRESETS.filter((vp) => selectedVideoIds.includes(vp.id))
          : [];
        const allVideosToInclude = [
          ...activePresets.map((p) => ({ title: p.title, url: p.url })),
          ...customVideos,
        ];

        if (allVideosToInclude.length > 0) {
          checkPageBreak(20 + allVideosToInclude.length * 5.5);
          doc.setFillColor(243, 246, 252);
          doc.setDrawColor(200, 215, 240);
          doc.roundedRect(
            marginX,
            currentY,
            contentWidth,
            8 + allVideosToInclude.length * 5.5,
            2,
            2,
            'FD'
          );

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.setTextColor(26, 54, 93);
          doc.text(
            isEventosMusic
              ? 'REGISTRO AUDIOVISUAL & MUESTRAS DEMOSTRATIVAS'
              : 'ANEXOS DIGITALES & REFERENCIAS TÉCNICAS',
            marginX + 5,
            currentY + 5
          );

          let videoY = currentY + 10.5;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);

          allVideosToInclude.forEach((video) => {
            doc.setTextColor(40, 60, 90);
            doc.text(`▶ ${video.title.substring(0, 38)}:`, marginX + 6, videoY);
            doc.setTextColor(20, 80, 180);
            doc.textWithLink(video.url.substring(0, 55), marginX + 85, videoY, { url: video.url });
            videoY += 5.5;
          });

          currentY = videoY + 4;
        }
      }

      // 9. PIE DE PÁGINA FINAL (respeta Marca Blanca Corporativo & Escala)
      checkPageBreak(18);
      currentY += 4;
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(110, 125, 140);

      const isWhiteLabel = caps.whiteLabel && organization?.hide_figura_branding !== false;
      const customFooter = caps.customLegalFooter
        ? organization?.white_label_footer?.trim()
        : '';

      if (customFooter) {
        doc.text(customFooter, marginX + contentWidth / 2, currentY, { align: 'center' });
      } else {
        doc.text(
          `${orgLegalName} • ${orgLocation}`,
          marginX + contentWidth / 2,
          currentY,
          { align: 'center' }
        );
      }

      const contactLine = isWhiteLabel || isFounder
        ? `Contacto Comercial: ${orgEmail || '—'}${orgPhone ? ` | ${orgPhone}` : ''}`
        : `Contacto: ${orgEmail || '—'}${orgPhone ? ` | ${orgPhone}` : ''} • Emitido vía FIGURA ERP`;
      doc.text(contactLine, marginX + contentWidth / 2, currentY + 4.5, { align: 'center' });

      const sanitizedName = (clientName || 'Cliente').replace(/[^a-zA-Z0-9_-]/g, '_');
      const orgPrefix = (orgName || 'FIGURA').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 16);
      doc.save(
        `Cotizacion_${orgPrefix}_${sanitizedName}_${new Date().toISOString().slice(0, 10)}.pdf`
      );
      setIsOpen(false);
    } catch (err: any) {
      console.error('Error al generar PDF de cotización:', err);
      setStatusNote(`Error al generar el PDF: ${err?.message || 'Revise los datos.'}`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      {triggerButton ? (
        <span onClick={() => setIsOpen(true)} className="cursor-pointer inline-flex">
          {triggerButton}
        </span>
      ) : (
        <Button
          type="button"
          onClick={() => setIsOpen(true)}
          variant="default"
          size="sm"
          className="h-8 gap-1.5 text-xs bg-[#4A607A] hover:bg-[#3F536B] text-white shadow-xs font-medium cursor-pointer"
        >
          <FileText className="h-3.5 w-3.5" />
          Cotización Formal (PDF)
        </Button>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen} className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-[#4A607A]/12 border border-[#4A607A]/25 text-[#3B4F66]">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Generador de Cotización Formal para {terms.clientLabel}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Emite un PDF formal de {orgName} ocultando costos y márgenes internos.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <DialogBody className="space-y-4 pt-3">
          {/* Aviso de capacidades de branding según plan */}
          {(!caps.logo || !caps.bankInfo || !caps.whiteLabel) && (
            <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground flex flex-wrap items-center gap-2">
              <Lock className="h-3.5 w-3.5 shrink-0 text-amber-600" />
              <span>
                Branding activo:
                {!caps.bankInfo &&
                  ` Datos bancarios desde ${planName(caps.requiredPlanForBankInfo)}.`}
                {!caps.logo && ` Logotipo desde ${planName(caps.requiredPlanForLogo)}.`}
                {!caps.whiteLabel &&
                  ` Marca blanca sin sello FIGURA en ${planName(caps.requiredPlanForWhiteLabel)}.`}
              </span>
            </div>
          )}

          {/* Bloque 1: Datos del Cliente */}
          <div className="bg-muted/30 border border-border/70 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-primary" />
              Información de {terms.clientLabel} y {terms.projectSingular}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] text-muted-foreground">
                  Nombre {terms.clientLabel} / Empresa
                </Label>
                <Input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ej: Constructora / Empresa S.A."
                  className="h-8 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-[11px] text-muted-foreground">RUT (Opcional)</Label>
                <Input
                  value={clientRut}
                  onChange={(e) => setClientRut(e.target.value)}
                  placeholder="Ej: 76.123.456-7"
                  className="h-8 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-[11px] text-muted-foreground">{terms.locationLabel}</Label>
                <Input
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                  placeholder="Ej: Av. Apoquindo 4500, Las Condes / Región Metropolitana"
                  className="h-8 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-[11px] text-muted-foreground">Fecha Programada</Label>
                <Input
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  placeholder="Ej: 15 de Diciembre de 2026"
                  className="h-8 text-xs mt-1"
                />
              </div>
            </div>
          </div>

          {/* Bloque 2: Especificaciones Técnicas & Condiciones Comerciales */}
          <div className="bg-muted/30 border border-border/70 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-primary" />
              Especificaciones y Condiciones de Pago
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <Label className="text-[11px] text-muted-foreground">Plazo / Duración del Servicio</Label>
                <Input
                  value={eventDuration}
                  onChange={(e) => setEventDuration(e.target.value)}
                  placeholder="Ej: 30 días corridos / Jornada completa"
                  className="h-8 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-[11px] text-muted-foreground">Validez (Días)</Label>
                <Input
                  type="number"
                  min={1}
                  max={90}
                  value={validityDaysInput}
                  onChange={(e) => setValidityDaysInput(e.target.value)}
                  className="h-8 text-xs mt-1"
                />
              </div>
              <div className="sm:col-span-3">
                <Label className="text-[11px] text-muted-foreground">
                  {isEventosMusic ? 'Curaduría Musical / Repertorio' : 'Alcance & Notas Técnicas'}
                </Label>
                <Input
                  value={eventRepertoire}
                  onChange={(e) => setEventRepertoire(e.target.value)}
                  placeholder={
                    isEventosMusic
                      ? 'Ej: Repertorio clásico en ceremonia y jazz contemporáneo en recepción'
                      : 'Ej: Especificaciones de entrega, hitos y estándares técnicos acordados'
                  }
                  className="h-8 text-xs mt-1"
                />
              </div>
            </div>

            {/* Condiciones de pago configurables */}
            <div className="pt-2 border-t border-border/50 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                  <Landmark className="h-3.5 w-3.5 text-primary" />
                  Modalidad de Pago (se sincroniza con el Portal Cliente)
                </Label>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground">Anticipo %:</span>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={depositPctInput}
                    onChange={(e) => {
                      setDepositPctInput(e.target.value);
                      setPaymentPresetId('custom');
                    }}
                    className="h-7 w-16 text-xs text-right font-mono"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {PAYMENT_TERM_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset.id)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                      paymentPresetId === preset.id
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <textarea
                rows={3}
                value={paymentClausesText}
                onChange={(e) => {
                  setPaymentClausesText(e.target.value);
                  setPaymentPresetId('custom');
                }}
                placeholder="Una cláusula por línea..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>

          {/* Bloque 3: Selección de Ítems a Cotizar */}
          <div className="border border-border/70 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Partidas a Incluir ({selectedItemIds.length}/{nonInsumoItems.length})
              </h4>
              <button
                type="button"
                onClick={toggleAllItems}
                className="text-[11px] text-primary hover:underline font-medium"
              >
                {selectedItemIds.length === nonInsumoItems.length
                  ? 'Deseleccionar todos'
                  : 'Seleccionar todos'}
              </button>
            </div>

            {nonInsumoItems.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-2">
                No hay partidas aprobadas en el presupuesto oficial. Apruébelas desde Borrador.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {nonInsumoItems.map((item) => {
                  const isSelected = item.id ? selectedItemIds.includes(item.id) : false;
                  const fin = computeItemFinancials(item, { taxRegime: effectiveTaxRegime });
                  return (
                    <label
                      key={item.id}
                      className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-primary/5 border-primary/30 text-foreground'
                          : 'bg-background border-border/60 text-muted-foreground hover:bg-muted/40'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => item.id && toggleItemSelection(item.id)}
                          className="h-3.5 w-3.5 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <div>
                          <span className="font-semibold text-foreground">{item.servicio}</span>
                          {fin.cantidad > 1 && (
                            <span className="text-[11px] text-muted-foreground ml-1.5">
                              × {fin.cantidad}
                            </span>
                          )}
                          {item.detalle && (
                            <span className="text-[11px] text-muted-foreground ml-2">
                              ({item.detalle})
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <span className="font-semibold text-foreground font-mono">
                          {hasForeignCurrency
                            ? `${formatMoney(fin.ventaNeta, currency, currencyRates)} (${formatCLP(fin.ventaNeta)})`
                            : formatCLP(fin.ventaNeta)}
                          {fin.isPassthrough
                            ? ' (Reemb.)'
                            : fin.isExemptSale
                              ? ' (Exento)'
                              : ' + IVA'}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            {quoteSummary.selected.length > 0 && (
              <div className="pt-2 border-t border-border/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-muted-foreground">
                  Neto: <strong className="text-foreground">{formatCLP(quoteSummary.subtotalNeto)}</strong> ·
                  IVA: <strong className="text-foreground">{formatCLP(quoteSummary.totalIva)}</strong>
                </span>
                <span className="font-bold text-foreground font-mono">
                  Total: {formatCLP(quoteSummary.totalGeneral)}
                  {hasForeignCurrency &&
                    ` · ${formatMoney(quoteSummary.totalGeneral, currency, currencyRates)}`}
                </span>
              </div>
            )}
          </div>

          {/* Bloque 4: Anexos / Enlaces Demostrativos (Opcional) */}
          <div className="border border-border/70 rounded-xl p-4 space-y-3 bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-blue-600" />
                <div>
                  <h4 className="text-xs font-semibold text-foreground">
                    {isEventosMusic
                      ? 'Enlaces a Videos Demostrativos'
                      : 'Anexos Digitales y Portafolio'}
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    {isEventosMusic
                      ? 'Adjunte muestras audiovisuales de referencia directamente en el PDF.'
                      : 'Adjunte fichas técnicas, portafolio o enlaces de referencia en el PDF.'}
                  </p>
                </div>
              </div>
              <label
                className="relative inline-flex items-center cursor-pointer"
                data-testid="pdf-videos-toggle"
              >
                <input
                  type="checkbox"
                  checked={includeVideos}
                  onChange={(e) => setIncludeVideos(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {includeVideos && (
              <div className="pt-2 space-y-3">
                {isFounder && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-medium text-foreground">
                      Muestras del catálogo institucional:
                    </span>
                    {DEFAULT_VIDEO_PRESETS.map((preset) => (
                      <label
                        key={preset.id}
                        className="flex items-center justify-between p-2 rounded-md border border-border/60 bg-background text-xs cursor-pointer hover:bg-muted/40"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedVideoIds.includes(preset.id)}
                            onChange={() => toggleVideoPreset(preset.id)}
                            className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600"
                          />
                          <span className="font-medium text-foreground">{preset.title}</span>
                        </div>
                        <span className="text-[10px] text-blue-600 underline truncate max-w-[200px]">
                          {preset.url}
                        </span>
                      </label>
                    ))}
                  </div>
                )}

                {customVideos.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-medium text-foreground">
                      Enlaces adicionales adjuntos:
                    </span>
                    {customVideos.map((cv, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-md border border-border/60 bg-background text-xs"
                      >
                        <span className="font-medium text-foreground">{cv.title}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-blue-600 underline truncate max-w-[180px]">
                            {cv.url}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveCustomVideo(idx)}
                            className="text-red-500 hover:text-red-700 p-1"
                            aria-label="Eliminar enlace"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-2 border-t border-border/50">
                  <span className="text-[11px] font-medium text-muted-foreground mb-1.5 block">
                    + Adjuntar enlace personalizado:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                    <Input
                      placeholder={
                        isEventosMusic
                          ? 'Título (Ej: Formato Cuarteto)'
                          : 'Título (Ej: Ficha Técnica / Portafolio)'
                      }
                      value={newCustomTitle}
                      onChange={(e) => setNewCustomTitle(e.target.value)}
                      className="sm:col-span-2 h-7 text-xs"
                    />
                    <Input
                      placeholder="URL (Drive / Web / YouTube)"
                      value={newCustomUrl}
                      onChange={(e) => setNewCustomUrl(e.target.value)}
                      className="sm:col-span-2 h-7 text-xs"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddCustomVideo}
                      disabled={!newCustomTitle.trim() || !newCustomUrl.trim()}
                      className="h-7 text-xs gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      Agregar
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {statusNote && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
              {statusNote}
            </div>
          )}
        </DialogBody>

        {isMarginBlocked && (
          <div className="mx-6 mb-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Margen actual ({currentProjectMargin.toFixed(1)}%) está bajo el piso mínimo (
              {minMarginFloor}%). Un Administrador debe aprobar la excepción antes de exportar el
              PDF.
            </span>
          </div>
        )}

        <DialogFooter className="mt-auto flex sm:justify-between items-center gap-2 border-t border-border/50 pt-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="text-xs text-muted-foreground"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={handleGeneratePDF}
            disabled={generating || savingTerms || selectedItemIds.length === 0 || isMarginBlocked}
            className="h-9 px-4 text-xs font-semibold bg-[#4A607A] hover:bg-[#3F536B] text-white gap-2 shadow-sm"
          >
            {generating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            Generar y Descargar Cotización PDF
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
