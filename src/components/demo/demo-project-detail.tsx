'use client';

import { Fragment, useState } from 'react';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  GitBranch,
  Loader2,
  Plus,
  Printer,
  Receipt,
  Sparkles,
  Trash2,
  Upload,
  Wallet,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { AnimatedNumber, AnimatedProgressBar } from '@/components/ui/motion-primitives';
import {
  computeDemoProjectFinancials,
  computeEffectiveItemCost,
  type DemoAiSuggestion,
  type DemoBrandConfig,
  type DemoCatalogItem,
  type DemoLineItem,
  type DemoOcrSampleDoc,
  type DemoProject,
  type DemoTransaction,
} from '@/lib/demo-local-data';
import { calculateFinancials, cn, formatCLP, formatPercentage } from '@/lib/utils';
import type { IndustryTerminology } from '@/lib/industries';

type DetailTab = 'budget' | 'cashflow' | 'ai_ocr' | 'pdf';

interface DemoProjectDetailProps {
  project: DemoProject;
  brand: DemoBrandConfig;
  catalog: DemoCatalogItem[];
  categories: string[];
  terms: IndustryTerminology;
  aiSuggestions: DemoAiSuggestion[];
  ocrSamples: DemoOcrSampleDoc[];
  onBack: () => void;
  onUpdateProject: (updated: DemoProject) => void;
}

export function DemoProjectDetail({
  project,
  brand,
  catalog,
  categories,
  terms,
  aiSuggestions,
  ocrSamples,
  onBack,
  onUpdateProject,
}: DemoProjectDetailProps) {
  const [tab, setTab] = useState<DetailTab>('budget');

  // Estado para agregar partida manual o desde catálogo
  const [selectedCatalogId, setSelectedCatalogId] = useState<string>(catalog[0]?.id || '');
  const [manualName, setManualName] = useState('');
  const [manualCost, setManualCost] = useState('120000');
  const [manualGain, setManualGain] = useState('55000');
  const [manualDoc, setManualDoc] = useState<'factura' | 'boleta'>('factura');

  // Estado para agregar abono / gasto real
  const [txType, setTxType] = useState<'ABONO_CLIENTE' | 'GASTO_REAL'>('ABONO_CLIENTE');
  const [txConcept, setTxConcept] = useState('');
  const [txAmount, setTxAmount] = useState('350000');
  const [txDocType, setTxDocType] = useState<'factura' | 'boleta' | 'transferencia'>('transferencia');

  // Estado IA & OCR simulado
  const [aiScanning, setAiScanning] = useState(false);
  const [aiAuditDone, setAiAuditDone] = useState(false);
  const [appliedSugIds, setAppliedSugIds] = useState<string[]>([]);
  const [ocrProcessingId, setOcrProcessingId] = useState<string | null>(null);
  const [importedOcrIds, setImportedOcrIds] = useState<string[]>([]);

  const fin = computeDemoProjectFinancials(project, brand.retentionPolicy);
  const ivaCoverage = fin.ivaDebito > 0 ? Math.round((fin.ivaCredito / fin.ivaDebito) * 100) : 0;

  const handleStatusChange = (status: DemoProject['status']) => {
    onUpdateProject({ ...project, status });
  };

  const handleAddFromCatalog = () => {
    const tpl = catalog.find((c) => c.id === selectedCatalogId);
    if (!tpl) return;
    const newItem: DemoLineItem = {
      id: `item-${Date.now()}`,
      servicio: tpl.servicio,
      detalle: tpl.detalle,
      categoria: tpl.categoria,
      cantidad: 1,
      costo: tpl.costo,
      ganancia: tpl.ganancia,
      tipo_doc_costo: tpl.tipo_doc_costo,
      approved: project.status !== 'planning',
    };
    onUpdateProject({ ...project, items: [...project.items, newItem] });
  };

  const handleAddManualItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim()) return;
    const newItem: DemoLineItem = {
      id: `item-${Date.now()}`,
      servicio: manualName.trim(),
      detalle: 'Partida agregada en demo local',
      categoria: categories[0] || 'Operación',
      cantidad: 1,
      costo: Math.max(0, Number(manualCost) || 0),
      ganancia: Math.max(0, Number(manualGain) || 0),
      tipo_doc_costo: manualDoc,
      approved: project.status !== 'planning',
    };
    onUpdateProject({ ...project, items: [...project.items, newItem] });
    setManualName('');
  };

  const handleUpdateItem = (itemId: string, patch: Partial<DemoLineItem>) => {
    onUpdateProject({
      ...project,
      items: project.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)),
    });
  };

  const handleDeleteItem = (itemId: string) => {
    onUpdateProject({
      ...project,
      items: project.items.filter((it) => it.id !== itemId && it.parent_id !== itemId),
    });
  };

  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!txConcept.trim()) return;
    const tx: DemoTransaction = {
      id: `tx-${Date.now()}`,
      type: txType,
      concepto: txConcept.trim(),
      monto: Math.max(0, Number(txAmount) || 0),
      fecha: new Date().toISOString().slice(0, 10),
      docType: txDocType,
    };
    onUpdateProject({ ...project, transactions: [tx, ...project.transactions] });
    setTxConcept('');
  };

  const handleRunAiAudit = () => {
    setAiScanning(true);
    setTimeout(() => {
      setAiScanning(false);
      setAiAuditDone(true);
    }, 650);
  };

  const handleApplySuggestion = (sug: DemoAiSuggestion) => {
    if (appliedSugIds.includes(sug.id)) return;
    const newItem: DemoLineItem = {
      id: `ai-item-${Date.now()}`,
      servicio: sug.servicio,
      detalle: sug.detalle,
      categoria: sug.categoria,
      cantidad: 1,
      costo: sug.costo,
      ganancia: sug.ganancia,
      tipo_doc_costo: sug.tipo_doc_costo,
      approved: true,
    };
    onUpdateProject({ ...project, items: [...project.items, newItem] });
    setAppliedSugIds((prev) => [...prev, sug.id]);
  };

  const handleImportOcr = (doc: DemoOcrSampleDoc) => {
    if (importedOcrIds.includes(doc.id)) return;
    setOcrProcessingId(doc.id);
    setTimeout(() => {
      const added: DemoLineItem[] = doc.items.map((it, idx) => ({
        id: `ocr-${Date.now()}-${idx}`,
        servicio: it.servicio,
        detalle: it.detalle,
        categoria: it.categoria,
        cantidad: it.cantidad,
        costo: it.costo,
        ganancia: it.ganancia,
        tipo_doc_costo: it.tipo_doc_costo,
        approved: false,
      }));
      onUpdateProject({ ...project, items: [...project.items, ...added] });
      setOcrProcessingId(null);
      setImportedOcrIds((prev) => [...prev, doc.id]);
    }, 600);
  };

  const parentItems = project.items.filter((i) => !i.parent_id);

  return (
    <div className="space-y-6 animate-reveal-up">
      {/* Header del Proyecto */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button type="button" variant="outline" size="icon" onClick={onBack} className="shrink-0 mt-0.5">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-[#1261E0]/10 text-[#0F4FB8] border border-[#1261E0]/20 font-mono text-[10px]">
                {project.scenarioBadge}
              </Badge>
              <span className="text-xs text-muted-foreground font-mono">{project.event_date}</span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight mt-1">{project.name}</h1>
            <p className="text-xs text-muted-foreground">
              {terms.clientLabel}: <strong>{project.client_company}</strong> · {project.location}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-white/80 p-1 rounded-xl border border-border/80">
          {(['planning', 'approved', 'completed'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => handleStatusChange(st)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                project.status === st
                  ? 'bg-[#0D1829] text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {st === 'planning' ? 'Planificación' : st === 'approved' ? 'Aprobado' : 'Completado'}
            </button>
          ))}
        </div>
      </div>

      {/* 4 KPIs Financieros Animados del Proyecto */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardHeader className="pb-1.5">
            <CardTitle className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              Venta Total c/ IVA
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xl sm:text-2xl font-semibold font-mono text-foreground">
            <AnimatedNumber value={fin.ventaTotal} format="clp" duration={450} />
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-1.5">
            <CardTitle className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              Utilidad Neta Proyectada
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xl sm:text-2xl font-semibold font-mono text-[#0D8A72]">
            +<AnimatedNumber value={fin.utilidadPresupuestada} format="clp" duration={450} />
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-1.5">
            <CardTitle className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              IVA F29 del Proyecto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-semibold font-mono text-[#1261E0]">
              <AnimatedNumber value={fin.ivaNetoPagar} format="clp" duration={450} />
            </div>
            <span className="text-[10px] text-muted-foreground font-mono">
              Déb. {formatCLP(fin.ivaDebito)} − Créd. {formatCLP(fin.ivaCredito)}
            </span>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-1.5">
            <CardTitle className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              Margen Neto Real
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xl sm:text-2xl font-semibold font-mono text-[#0284C7]">
            <AnimatedNumber value={fin.margenPct} format="percent" duration={450} />
          </CardContent>
        </Card>
      </div>

      {/* Navegación Interna de 4 Tabs Enterprise */}
      <div className="flex flex-wrap gap-2 border-b border-border/80 pb-3">
        {[
          { id: 'budget' as const, label: 'Presupuesto & Consolidación', icon: GitBranch },
          { id: 'cashflow' as const, label: 'Flujo de Caja (Abonos & Gastos)', icon: Wallet },
          { id: 'ai_ocr' as const, label: 'Suite IA & OCR PDF/Excel', icon: Sparkles },
          { id: 'pdf' as const, label: 'Cotizador PDF Marca Blanca', icon: Printer },
        ].map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all tactile-press',
                active
                  ? 'bg-[#0D1829] text-white border-[#0D1829] shadow-sm'
                  : 'bg-white/80 text-muted-foreground border-border/80 hover:text-foreground'
              )}
            >
              <Icon className={cn('h-3.5 w-3.5', active && 'text-[#38BDF8]')} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: Presupuesto & Consolidación */}
      {tab === 'budget' && (
        <div className="space-y-5">
          {/* Barra IVA F29 del proyecto */}
          <Card className="glass-card p-4 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-semibold flex items-center gap-1.5">
                <Receipt className="h-4 w-4 text-[#1261E0]" />
                Trazabilidad Tributaria del {terms.projectSingular} (IVA Débito vs. Crédito)
              </span>
              <span className="font-mono text-[#0D8A72] font-semibold">
                {ivaCoverage}% de IVA cubierto por facturas de costo
              </span>
            </div>
            <AnimatedProgressBar value={ivaCoverage} barClassName="bg-[#0D8A72]" />
          </Card>

          {/* Controles rápidos: Agregar desde catálogo o manual */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Agregar desde {terms.catalogLabel}</CardTitle>
              </CardHeader>
              <CardContent className="flex gap-2">
                <Select
                  value={selectedCatalogId}
                  onChange={(e) => setSelectedCatalogId(e.target.value)}
                  options={catalog.map((c) => ({
                    value: c.id,
                    label: `${c.servicio} (${formatCLP(c.costo + c.ganancia)})`,
                  }))}
                />
                <Button type="button" onClick={handleAddFromCatalog} className="shrink-0 gap-1.5">
                  <Plus className="h-4 w-4" />
                  Agregar
                </Button>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Agregar Partida Manual Rápida</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddManualItem} className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <Input
                    className="sm:col-span-5"
                    placeholder="Nombre partida..."
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    required
                  />
                  <Input
                    className="sm:col-span-2"
                    type="number"
                    min={0}
                    value={manualCost}
                    onChange={(e) => setManualCost(e.target.value)}
                    title="Costo CLP"
                  />
                  <Input
                    className="sm:col-span-2"
                    type="number"
                    min={0}
                    value={manualGain}
                    onChange={(e) => setManualGain(e.target.value)}
                    title="Ganancia CLP"
                  />
                  <Select
                    className="sm:col-span-2"
                    value={manualDoc}
                    onChange={(e) => setManualDoc(e.target.value as 'factura' | 'boleta')}
                    options={[
                      { value: 'factura', label: 'Fact.' },
                      { value: 'boleta', label: 'Bol.' },
                    ]}
                  />
                  <Button type="submit" size="icon" className="sm:col-span-1 w-full">
                    <Plus className="h-4 w-4" />
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Tabla de ítems interactiva */}
          <Card className="glass-card overflow-hidden">
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-secondary/60 border-b border-border/80 font-mono text-[10px] uppercase text-muted-foreground">
                  <tr>
                    <th className="py-3 px-4">Partida / Detalle</th>
                    <th className="py-3 px-3">Doc. SII</th>
                    <th className="py-3 px-3 text-center">Cant.</th>
                    <th className="py-3 px-3 text-right">Costo Unit.</th>
                    <th className="py-3 px-3 text-right">Ganancia Unit.</th>
                    <th className="py-3 px-3 text-right">Total c/ IVA</th>
                    <th className="py-3 px-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {parentItems.map((item) => {
                    const children = project.items.filter((c) => c.parent_id === item.id);
                    const { effectiveCosto } = computeEffectiveItemCost(
                      item.costo,
                      item.tipo_doc_costo,
                      brand.retentionPolicy
                    );
                    const itemFin = calculateFinancials(
                      effectiveCosto,
                      item.ganancia,
                      item.tipo_doc_costo,
                      true
                    );

                    return (
                      <Fragment key={item.id}>
                        <tr className="hover:bg-secondary/25">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-foreground">{item.servicio}</div>
                            <div className="text-[11px] text-muted-foreground">{item.detalle}</div>
                          </td>
                          <td className="py-3 px-3">
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateItem(item.id, {
                                  tipo_doc_costo:
                                    item.tipo_doc_costo === 'factura' ? 'boleta' : 'factura',
                                })
                              }
                              className={cn(
                                'px-2 py-1 rounded-md font-mono text-[10px] border transition-colors',
                                item.tipo_doc_costo === 'factura'
                                  ? 'bg-[#1261E0]/10 text-[#0F4FB8] border-[#1261E0]/25'
                                  : 'bg-[#0284C7]/10 text-[#0369A1] border-[#0284C7]/25'
                              )}
                              title="Clic para alternar Factura / Boleta 15,25%"
                            >
                              {item.tipo_doc_costo === 'factura' ? 'Factura' : 'Boleta 15,25%'}
                            </button>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <Input
                              type="number"
                              min={1}
                              value={item.cantidad}
                              onChange={(e) =>
                                handleUpdateItem(item.id, {
                                  cantidad: Math.max(1, Number(e.target.value) || 1),
                                })
                              }
                              className="h-7 w-14 text-center font-mono mx-auto"
                            />
                          </td>
                          <td className="py-3 px-3 text-right font-mono tabular-nums">
                            {formatCLP(effectiveCosto)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono tabular-nums text-[#0D8A72] font-semibold">
                            +{formatCLP(item.ganancia)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono tabular-nums font-bold">
                            {formatCLP(itemFin.valorTotal * item.cantidad)}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDeleteItem(item.id)}
                              className="h-7 w-7 text-rose-600 hover:bg-rose-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                        {children.map((ch) => (
                          <tr key={ch.id} className="bg-secondary/35 text-[11px]">
                            <td className="py-2 pl-9 pr-4 text-muted-foreground">
                              ↳ <strong className="text-foreground">{ch.servicio}</strong> · {ch.detalle}
                            </td>
                            <td className="py-2 px-3 font-mono text-[10px]">Insumo Prorr.</td>
                            <td className="py-2 px-3 text-center font-mono">{ch.cantidad}</td>
                            <td className="py-2 px-3 text-right font-mono">{formatCLP(ch.costo)}</td>
                            <td className="py-2 px-3 text-right font-mono text-muted-foreground">—</td>
                            <td className="py-2 px-3 text-right font-mono text-muted-foreground">
                              Incluido en padre
                            </td>
                            <td className="py-2 px-3 text-right">
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={() => handleDeleteItem(ch.id)}
                                className="h-6 w-6 text-rose-600"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: Flujo de Caja, Abonos & Gastos Reales */}
      {tab === 'cashflow' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="glass-card p-4">
              <span className="text-[11px] font-mono uppercase text-muted-foreground">Abonos Recibidos</span>
              <div className="text-xl font-semibold font-mono text-[#0D8A72] mt-1">
                <AnimatedNumber value={fin.totalAbonos} format="clp" duration={400} />
              </div>
            </Card>
            <Card className="glass-card p-4">
              <span className="text-[11px] font-mono uppercase text-muted-foreground">Saldo por Cobrar</span>
              <div className="text-xl font-semibold font-mono text-[#1261E0] mt-1">
                <AnimatedNumber value={fin.saldoPorCobrar} format="clp" duration={400} />
              </div>
            </Card>
            <Card className="glass-card p-4">
              <span className="text-[11px] font-mono uppercase text-muted-foreground">Gastos Reales Rendidos</span>
              <div className="text-xl font-semibold font-mono text-[#B9382C] mt-1">
                <AnimatedNumber value={fin.totalGastosReales} format="clp" duration={400} />
              </div>
            </Card>
            <Card className="glass-card p-4">
              <span className="text-[11px] font-mono uppercase text-muted-foreground">Caja Neta Actual</span>
              <div className="text-xl font-semibold font-mono text-foreground mt-1">
                <AnimatedNumber value={fin.cajaRealNeta} format="clp" duration={400} />
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <Card className="lg:col-span-5 glass-card">
              <CardHeader>
                <CardTitle className="text-base">Registrar Movimiento en Caja</CardTitle>
                <CardDescription className="text-xs">
                  Registra un abono del cliente o un gasto real rendido para ver cómo cambia la liquidez al instante.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddTransaction} className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Tipo de Movimiento</Label>
                    <Select
                      value={txType}
                      onChange={(e) => setTxType(e.target.value as 'ABONO_CLIENTE' | 'GASTO_REAL')}
                      options={[
                        { value: 'ABONO_CLIENTE', label: 'Abono de Cliente (+ Ingreso)' },
                        { value: 'GASTO_REAL', label: 'Gasto Real Rendido (- Egreso)' },
                      ]}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Concepto</Label>
                    <Input
                      value={txConcept}
                      onChange={(e) => setTxConcept(e.target.value)}
                      placeholder="Ej. Pago cuota 2 o Factura proveedor"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <Label className="text-xs">Monto CLP</Label>
                      <Input
                        type="number"
                        min={0}
                        value={txAmount}
                        onChange={(e) => setTxAmount(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Respaldo</Label>
                      <Select
                        value={txDocType}
                        onChange={(e) =>
                          setTxDocType(e.target.value as 'factura' | 'boleta' | 'transferencia')
                        }
                        options={[
                          { value: 'transferencia', label: 'Transferencia' },
                          { value: 'factura', label: 'Factura' },
                          { value: 'boleta', label: 'Boleta' },
                        ]}
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full gap-1.5">
                    <Plus className="h-4 w-4" />
                    Registrar en Trazabilidad Local
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="lg:col-span-7 glass-card">
              <CardHeader>
                <CardTitle className="text-base">Historial Trazable de Caja</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {project.transactions.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-6 text-center">
                    Este proyecto aún no tiene abonos ni gastos registrados. Agrega uno a la izquierda.
                  </p>
                ) : (
                  project.transactions.map((t) => (
                    <div
                      key={t.id}
                      className="p-3 rounded-xl bg-white/80 border border-border/75 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-semibold">{t.concepto}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">
                          {t.fecha} · {t.docType}
                        </div>
                      </div>
                      <span
                        className={cn(
                          'font-mono font-bold tabular-nums',
                          t.type === 'ABONO_CLIENTE' ? 'text-[#0D8A72]' : 'text-[#B9382C]'
                        )}
                      >
                        {t.type === 'ABONO_CLIENTE' ? '+' : '-'}
                        {formatCLP(t.monto)}
                      </span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 3: Suite IA & OCR Documental */}
      {tab === 'ai_ocr' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="glass-luxury text-slate-100 rounded-3xl">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[#38BDF8]" />
                Auditor Financiero IA (Simulación en Vivo)
              </CardTitle>
              <CardDescription className="text-slate-300 text-xs">
                Escanea las partidas actuales de este proyecto para detectar fugas ocultas y márgenes bajo meta.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                type="button"
                onClick={handleRunAiAudit}
                disabled={aiScanning}
                className="w-full bg-[#2DD4BF] hover:bg-[#5EEAD4] text-[#080E1A] font-semibold gap-2"
              >
                {aiScanning ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analizando estructura de costos y SII...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    {aiAuditDone ? 'Volver a Escanear con IA' : 'Ejecutar Auditoría de Márgenes IA'}
                  </>
                )}
              </Button>

              {aiAuditDone && (
                <div className="space-y-3">
                  {aiSuggestions.map((sug) => {
                    const applied = appliedSugIds.includes(sug.id);
                    return (
                      <div
                        key={sug.id}
                        className="p-4 rounded-2xl bg-white/[0.06] border border-sky-400/25 space-y-2 text-xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-semibold text-[#38BDF8]">{sug.title}</span>
                          <Badge className="bg-[#0D8A72]/25 text-[#5EEAD4] border-0 font-mono">
                            +{formatCLP(sug.impactClp)} util.
                          </Badge>
                        </div>
                        <p className="text-slate-300 leading-relaxed">{sug.reason}</p>
                        <Button
                          type="button"
                          size="sm"
                          disabled={applied}
                          onClick={() => handleApplySuggestion(sug)}
                          className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/15 gap-1.5"
                        >
                          {applied ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-[#2DD4BF]" />
                              Aplicado al Presupuesto
                            </>
                          ) : (
                            <>
                              <Plus className="h-3.5 w-3.5" />
                              Aplicar al Presupuesto ({formatCLP(sug.costo + sug.ganancia)} neto)
                            </>
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card rounded-3xl">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Upload className="h-5 w-5 text-[#1261E0]" />
                OCR Inteligente de PDF / Excel de Proveedores
              </CardTitle>
              <CardDescription className="text-xs">
                Prueba cómo KAIROS lee documentos de proveedores de tu rubro e importa las líneas al presupuesto en 1 clic.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {ocrSamples.map((doc) => {
                const imported = importedOcrIds.includes(doc.id);
                const busy = ocrProcessingId === doc.id;
                return (
                  <div
                    key={doc.id}
                    className="p-4 rounded-2xl bg-white/85 border border-border/80 space-y-2.5 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        {doc.fileName.endsWith('.pdf') ? (
                          <FileText className="h-5 w-5 text-[#B9382C] shrink-0" />
                        ) : (
                          <FileSpreadsheet className="h-5 w-5 text-[#0D8A72] shrink-0" />
                        )}
                        <div>
                          <div className="font-semibold">{doc.fileName}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {doc.supplier} · {doc.docTypeLabel}
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {doc.items.length} ítems
                      </Badge>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      disabled={busy || imported}
                      onClick={() => handleImportOcr(doc)}
                      className="w-full gap-1.5"
                    >
                      {busy ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Extrayendo ítems con OCR IA...
                        </>
                      ) : imported ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 text-[#2DD4BF]" />
                          Ítems importados al presupuesto
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3.5 w-3.5 text-[#38BDF8]" />
                          Procesar Documento e Importar Ítems
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 4: Cotizador PDF Marca Blanca */}
      {tab === 'pdf' && (
        <Card className="glass-card rounded-3xl overflow-hidden relative">
          <div
            className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.045] select-none"
            aria-hidden="true"
          >
            <span className="text-5xl sm:text-7xl font-mono font-bold tracking-widest -rotate-12">
              MODO DEMO · KAIROS
            </span>
          </div>

          <CardContent className="p-6 sm:p-10 space-y-6 bg-white/95 relative">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
              <div>
                <Badge className="bg-[#0D1829] text-[#38BDF8] font-mono text-[10px] mb-2">
                  PROPUESTA COMERCIAL MARCA BLANCA
                </Badge>
                <h2 className="text-2xl font-bold text-[#0A111F]">{brand.companyName}</h2>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  RUT {brand.rut} · {brand.email} · {brand.phone}
                </p>
              </div>
              <div className="text-right text-xs space-y-1">
                <div className="font-mono font-bold text-[#1261E0]">
                  COTIZACIÓN #{project.id.replace('demo-proj-', '00')}
                </div>
                <div>Fecha: {project.event_date}</div>
                <div>
                  {terms.clientLabel}: <strong>{project.client_company}</strong>
                </div>
              </div>
            </div>

            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-border text-muted-foreground font-mono text-[10px] uppercase">
                  <th className="py-2">Descripción del Servicio</th>
                  <th className="py-2 text-center">Cant.</th>
                  <th className="py-2 text-right">Neto Unit.</th>
                  <th className="py-2 text-right">Subtotal Neto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {parentItems.map((it) => {
                  const { effectiveCosto } = computeEffectiveItemCost(
                    it.costo,
                    it.tipo_doc_costo,
                    brand.retentionPolicy
                  );
                  const itFin = calculateFinancials(effectiveCosto, it.ganancia, it.tipo_doc_costo, true);
                  return (
                    <tr key={it.id}>
                      <td className="py-2.5 pr-4">
                        <div className="font-semibold">{it.servicio}</div>
                        <div className="text-[11px] text-muted-foreground">{it.detalle}</div>
                      </td>
                      <td className="py-2.5 text-center font-mono">{it.cantidad}</td>
                      <td className="py-2.5 text-right font-mono">{formatCLP(itFin.valorNeto)}</td>
                      <td className="py-2.5 text-right font-mono font-semibold">
                        {formatCLP(itFin.valorNeto * it.cantidad)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 pt-4 border-t border-border">
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="font-semibold text-foreground">Datos de Transferencia:</div>
                <div className="font-mono">
                  {brand.banco} · {brand.cuenta}
                </div>
                <div className="font-mono">RUT: {brand.rut} · {brand.email}</div>
              </div>

              <div className="w-full sm:w-64 space-y-1.5 text-xs font-mono tabular-nums">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Neto:</span>
                  <span>{formatCLP(fin.ventaNeta)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">IVA (19%):</span>
                  <span>{formatCLP(fin.ivaDebito)}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-[#0D1829] pt-1.5 border-t border-border">
                  <span>TOTAL:</span>
                  <span className="text-[#1261E0]">{formatCLP(fin.ventaTotal)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
