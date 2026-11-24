'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Trash2, Receipt, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { computeEffectiveItemCost, type DemoCatalogItem } from '@/lib/demo-local-data';
import { calculateFinancials, formatCLP, formatPercentage } from '@/lib/utils';
import type { HonorariosRetentionPolicy } from '@/types/database';

interface DemoCatalogViewProps {
  catalog: DemoCatalogItem[];
  catalogLabel: string;
  categories: string[];
  retentionPolicy: HonorariosRetentionPolicy;
  customCount: number;
  maxCustomRates: number;
  onAddRate: (item: Omit<DemoCatalogItem, 'id' | 'isCustom'>) => void;
  onDeleteRate: (id: string) => void;
}

export function DemoCatalogView({
  catalog,
  catalogLabel,
  categories,
  retentionPolicy,
  customCount,
  maxCustomRates,
  onAddRate,
  onDeleteRate,
}: DemoCatalogViewProps) {
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('ALL');
  const [showAdd, setShowAdd] = useState(false);

  const [servicio, setServicio] = useState('');
  const [categoria, setCategoria] = useState(categories[0] || 'General');

  useEffect(() => {
    setCategoria(categories[0] || 'General');
    setSelectedCat('ALL');
  }, [categories]);
  const [detalle, setDetalle] = useState('');
  const [costo, setCosto] = useState('180000');
  const [ganancia, setGanancia] = useState('85000');
  const [docType, setDocType] = useState<'factura' | 'boleta'>('factura');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return catalog.filter((item) => {
      const matchesCat = selectedCat === 'ALL' || item.categoria === selectedCat;
      const matchesQ =
        !q ||
        item.servicio.toLowerCase().includes(q) ||
        item.detalle.toLowerCase().includes(q) ||
        item.categoria.toLowerCase().includes(q);
      return matchesCat && matchesQ;
    });
  }, [catalog, search, selectedCat]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!servicio.trim() || customCount >= maxCustomRates) return;
    onAddRate({
      servicio: servicio.trim(),
      categoria: categoria || categories[0] || 'General',
      detalle: detalle.trim() || 'Tarifa creada en sesión de prueba',
      costo: Math.max(0, Number(costo) || 0),
      ganancia: Math.max(0, Number(ganancia) || 0),
      tipo_doc_costo: docType,
    });
    setServicio('');
    setDetalle('');
    setShowAdd(false);
  };

  return (
    <div className="space-y-6 animate-reveal-up">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{catalogLabel}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Catálogo maestro pre-configurado con cálculo automático de IVA 19% y retención de Boletas 15,25%.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Badge variant="outline" className="font-mono text-xs">
            Tarifas propias: {customCount}/{maxCustomRates}
          </Badge>
          <Button
            type="button"
            onClick={() => setShowAdd((v) => !v)}
            disabled={customCount >= maxCustomRates}
            className="gap-1.5 tactile-press"
          >
            <Plus className="h-4 w-4" />
            Nueva Tarifa
          </Button>
        </div>
      </div>

      {showAdd && (
        <Card className="glass-card border-[#1261E0]/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Agregar Tarifa al Catálogo Local</CardTitle>
            <CardDescription className="text-xs">
              Se guarda solo en tu navegador para que puedas reutilizarla dentro de tus proyectos demo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
              <div className="lg:col-span-2 space-y-1">
                <Label className="text-xs">Nombre del Servicio / Ítem *</Label>
                <Input
                  value={servicio}
                  onChange={(e) => setServicio(e.target.value)}
                  placeholder="Ej. Técnico Iluminación Jornada"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Categoría</Label>
                <Select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  options={categories.map((c) => ({ value: c, label: c }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Documento SII</Label>
                <Select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value as 'factura' | 'boleta')}
                  options={[
                    { value: 'factura', label: 'Factura (IVA)' },
                    { value: 'boleta', label: 'Boleta (15,25%)' },
                  ]}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Costo Base CLP</Label>
                <Input type="number" min={0} value={costo} onChange={(e) => setCosto(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Ganancia CLP</Label>
                <Input type="number" min={0} value={ganancia} onChange={(e) => setGanancia(e.target.value)} />
              </div>
              <div className="lg:col-span-4 space-y-1">
                <Label className="text-xs">Detalle Técnico</Label>
                <Input
                  value={detalle}
                  onChange={(e) => setDetalle(e.target.value)}
                  placeholder="Descripción breve para cotización PDF"
                />
              </div>
              <div className="lg:col-span-2 flex gap-2">
                <Button type="submit" className="flex-1">
                  Guardar Tarifa
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar servicio o detalle..."
            className="pl-9 bg-white/80"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedCat('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
              selectedCat === 'ALL'
                ? 'bg-[#0D1829] text-white border-[#0D1829]'
                : 'bg-white/80 text-muted-foreground border-border hover:text-foreground'
            }`}
          >
            Todas ({catalog.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCat(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                selectedCat === cat
                  ? 'bg-[#0D1829] text-white border-[#0D1829]'
                  : 'bg-white/80 text-muted-foreground border-border hover:text-foreground'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla / Tarjetas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((item) => {
          const { effectiveCosto, retencion1525 } = computeEffectiveItemCost(
            item.costo,
            item.tipo_doc_costo,
            retentionPolicy
          );
          const fin = calculateFinancials(effectiveCosto, item.ganancia, item.tipo_doc_costo, true);

          return (
            <Card key={item.id} className="glass-card">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px]">
                        {item.categoria}
                      </Badge>
                      <Badge
                        className={
                          item.tipo_doc_costo === 'factura'
                            ? 'bg-[#1261E0]/10 text-[#0F4FB8] border border-[#1261E0]/20 text-[10px]'
                            : 'bg-[#0284C7]/10 text-[#0369A1] border border-[#0284C7]/20 text-[10px]'
                        }
                      >
                        {item.tipo_doc_costo === 'factura' ? (
                          <span className="inline-flex items-center gap-1">
                            <Receipt className="h-3 w-3" /> Factura (IVA Créd.)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1">
                            <FileText className="h-3 w-3" /> Boleta 15,25%
                          </span>
                        )}
                      </Badge>
                    </div>
                    <CardTitle className="text-base leading-snug">{item.servicio}</CardTitle>
                    <CardDescription className="text-xs">{item.detalle}</CardDescription>
                  </div>

                  {item.isCustom && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => onDeleteRate(item.id)}
                      className="h-7 w-7 text-rose-600 hover:bg-rose-50 shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-2 border-t border-border/60 grid grid-cols-3 gap-2 text-xs font-mono tabular-nums">
                <div>
                  <span className="text-[10px] font-sans text-muted-foreground block">Costo Efectivo</span>
                  <span className="font-semibold text-foreground">{formatCLP(effectiveCosto)}</span>
                  {retencion1525 > 0 && (
                    <span className="block text-[10px] text-[#0369A1]">Ret. {formatCLP(retencion1525)}</span>
                  )}
                </div>
                <div>
                  <span className="text-[10px] font-sans text-muted-foreground block">Utilidad</span>
                  <span className="font-semibold text-[#0D8A72]">+{formatCLP(item.ganancia)}</span>
                  <span className="block text-[10px] text-muted-foreground">{formatPercentage(fin.margen)}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-sans text-muted-foreground block">Venta c/ IVA</span>
                  <span className="font-bold text-[#1261E0]">{formatCLP(fin.valorTotal)}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
