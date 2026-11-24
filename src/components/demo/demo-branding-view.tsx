'use client';

import { ShieldCheck, Users, Palette, KeyRound } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { THEME_PRESETS } from '@/lib/industries';
import type { DemoBrandConfig } from '@/lib/demo-local-data';
import type { HonorariosRetentionPolicy, ThemePreset } from '@/types/database';

interface DemoBrandingViewProps {
  brand: DemoBrandConfig;
  onChangeBrand: (patch: Partial<DemoBrandConfig>) => void;
}

export function DemoBrandingView({ brand, onChangeBrand }: DemoBrandingViewProps) {
  return (
    <div className="space-y-6 animate-reveal-up">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            Equipo, Tributación &amp; Marca Blanca
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Personaliza tu identidad comercial para los PDFs, define quién asume el 15,25% de honorarios y gestiona roles de equipo.
          </p>
        </div>
        <Badge className="bg-[#0D1829] text-[#38BDF8] border border-sky-400/25 font-mono text-xs">
          Exclusivo Enterprise &amp; Custom
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-7 glass-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Palette className="h-4 w-4 text-[#1261E0]" />
              Identidad de Empresa &amp; Regla de Retención 15,25%
            </CardTitle>
            <CardDescription className="text-xs">
              Cambia estos datos para ver cómo se reflejan al instante en el Cotizador PDF Marca Blanca y en los costos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <Label className="text-xs">Razón Social / Nombre Comercial</Label>
                <Input
                  value={brand.companyName}
                  onChange={(e) => onChangeBrand({ companyName: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">RUT Empresa</Label>
                <Input
                  value={brand.rut}
                  onChange={(e) => onChangeBrand({ rut: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Correo Comercial</Label>
                <Input
                  value={brand.email}
                  onChange={(e) => onChangeBrand({ email: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Teléfono</Label>
                <Input
                  value={brand.phone}
                  onChange={(e) => onChangeBrand({ phone: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Banco Transferencias</Label>
                <Input
                  value={brand.banco}
                  onChange={(e) => onChangeBrand({ banco: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Número de Cuenta</Label>
                <Input
                  value={brand.cuenta}
                  onChange={(e) => onChangeBrand({ cuenta: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-border/60">
              <div className="space-y-1.5">
                <Label className="text-xs">Política Retención Boletas Honorarios (15,25%)</Label>
                <Select
                  value={brand.retentionPolicy}
                  onChange={(e) =>
                    onChangeBrand({ retentionPolicy: e.target.value as HonorariosRetentionPolicy })
                  }
                  options={[
                    { value: 'contractor', label: 'Asume el Contratado (100%)' },
                    { value: 'company', label: 'Asume la Empresa (100%)' },
                    { value: 'split_50_50', label: 'Reparto 50 / 50' },
                  ]}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tema Visual Ejecutivo</Label>
                <Select
                  value={brand.themePreset}
                  onChange={(e) =>
                    onChangeBrand({ themePreset: e.target.value as ThemePreset })
                  }
                  options={Object.values(THEME_PRESETS).map((t) => ({
                    value: t.id,
                    label: t.name,
                  }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-5 glass-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-[#0D8A72]" />
              Equipo Multi-Usuario &amp; Roles (Simulación)
            </CardTitle>
            <CardDescription className="text-xs">
              En el Plan Enterprise invitas a tu equipo ilimitado mediante código único de organización.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3.5 rounded-xl bg-[#0D1829] text-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs">
                <KeyRound className="h-4 w-4 text-[#38BDF8]" />
                <span>Código de Invitación:</span>
              </div>
              <span className="font-mono font-bold text-[#2DD4BF] text-xs">KAIROS-DEMO-2026</span>
            </div>

            <div className="space-y-2.5 text-xs">
              {[
                { name: 'Dirección General (Tú)', email: 'visitante@kairos-sandbox.cl', role: 'Admin' },
                { name: 'Jefatura de Operaciones', email: 'operaciones@empresa-demo.cl', role: 'Editor' },
                { name: 'Contabilidad & F29', email: 'finanzas@empresa-demo.cl', role: 'Auditor P&L' },
              ].map((u) => (
                <div
                  key={u.email}
                  className="p-3 rounded-xl bg-white/80 border border-border/75 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{u.name}</div>
                    <div className="text-[11px] text-muted-foreground font-mono truncate">{u.email}</div>
                  </div>
                  <Badge variant="outline" className="font-mono text-[10px] shrink-0">
                    {u.role}
                  </Badge>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-[#0D8A72]/10 border border-[#0D8A72]/25 text-[11px] text-[#0A6C59] flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span>Cada usuario ve exclusivamente los datos de su empresa bajo aislamiento RLS.</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
