'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  Crown,
  ImagePlus,
  Landmark,
  Loader2,
  Lock,
  Percent,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useWorkspaceConfig } from '@/hooks/use-workspace-config';
import type {
  HonorariosRetentionPolicy,
  Organization,
  OrganizationBankInfo,
} from '@/types';
import { isDuoProducciones, resolveOrgEntitlements } from '@/lib/entitlements';
import { brandingCapabilities } from '@/lib/plan-guards';
import { logAudit } from '@/lib/audit';
import { fileToNormalizedPngDataUrl } from '@/lib/image-to-png';
import { CompanyLogoMark } from '@/components/ui/figura-logo';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  Dialog,
  DialogBody,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface LogoUploadFieldProps {
  companyName: string;
  logoUrl: string;
  onChange: (nextUrl: string) => void;
  disabled?: boolean;
  lockedNotice?: string;
}

export function LogoUploadField({
  companyName,
  logoUrl,
  onChange,
  disabled = false,
  lockedNotice,
}: LogoUploadFieldProps) {
  const [processing, setProcessing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const file = e.target.files?.[0];
    if (!file) return;
    setProcessing(true);
    setUploadError(null);
    try {
      const pngDataUrl = await fileToNormalizedPngDataUrl(file, 256);
      onChange(pngDataUrl);
    } catch (err: any) {
      setUploadError(err?.message || 'No se pudo procesar el logo.');
    } finally {
      setProcessing(false);
      e.target.value = '';
    }
  };

  return (
    <div className="p-3.5 rounded-xl border bg-muted/20 space-y-2.5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <CompanyLogoMark name={companyName || 'Empresa'} logoUrl={logoUrl || null} size="md" />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs font-semibold">Logo Corporativo</p>
              {disabled && (
                <Badge
                  variant="outline"
                  className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 gap-1"
                >
                  <Lock className="h-2.5 w-2.5" />
                  Crecimiento Inteligente IA
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Visible en la barra lateral, PDFs y Portal /q. Formatos: PNG, JPG o WEBP.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <label
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium transition-colors ${
              disabled
                ? 'bg-muted text-muted-foreground opacity-50 cursor-not-allowed'
                : 'bg-background hover:bg-accent cursor-pointer'
            }`}
            aria-disabled={disabled}
          >
            {processing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ImagePlus className="h-3.5 w-3.5" />
            )}
            <span>{logoUrl ? 'Cambiar' : 'Subir Logo'}</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleFileChange}
              disabled={processing || disabled}
              className="hidden"
            />
          </label>
          {logoUrl && !disabled && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange('')}
              className="h-8 px-2 text-destructive hover:text-destructive"
              title="Quitar logo"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {disabled && lockedNotice && (
        <p className="text-[11px] text-amber-700 dark:text-amber-300 flex items-center justify-between gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1.5">
          <span>{lockedNotice}</span>
          <Link href="/billing" className="underline font-semibold shrink-0">
            Mejorar Plan
          </Link>
        </p>
      )}

      {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
    </div>
  );
}

type SecondaryAccount = {
  banco?: string;
  tipo_cuenta?: string;
  numero_cuenta?: string;
  titular?: string;
  rut?: string;
  email?: string;
};

interface CompanyBrandingDialogProps {
  company: Organization | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (message: string) => void;
}

export function CompanyBrandingDialog({
  company,
  open,
  onOpenChange,
  onSaved,
}: CompanyBrandingDialogProps) {
  const { plans, addons, isDuoExempt, isSuperAdmin, profile } = useWorkspaceConfig();

  const targetEntitlements = useMemo(
    () => resolveOrgEntitlements(company, plans, addons),
    [company, plans, addons]
  );
  const caps = useMemo(() => brandingCapabilities(targetEntitlements), [targetEntitlements]);

  const targetIsExempt = Boolean(isDuoExempt || isDuoProducciones(company));
  const canEditBank = isSuperAdmin || targetIsExempt || caps.bankInfo;
  const canEditLogo = isSuperAdmin || targetIsExempt || caps.logo;
  const canEditWhiteLabel = isSuperAdmin || targetIsExempt || caps.whiteLabel;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [rut, setRut] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [location, setLocation] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [bankInfo, setBankInfo] = useState<OrganizationBankInfo>({});
  const [minMarginPct, setMinMarginPct] = useState('15');
  const [ufRateClp, setUfRateClp] = useState('41405');
  const [usdRateClp, setUsdRateClp] = useState('1025');
  const [retentionPolicy, setRetentionPolicy] =
    useState<HonorariosRetentionPolicy>('contractor');
  const [hideFiguraBranding, setHideFiguraBranding] = useState(false);
  const [whiteLabelFooter, setWhiteLabelFooter] = useState('');
  const [secondaryAccounts, setSecondaryAccounts] = useState<SecondaryAccount[]>([]);

  useEffect(() => {
    if (company && open) {
      setError(null);
      setName(company.name || '');
      setLegalName(company.legal_name || '');
      setRut(company.rut || '');
      setSubtitle(company.subtitle || '');
      setLocation(company.location || '');
      setContactEmail(company.contact_email || '');
      setContactPhone(company.contact_phone || '');
      setLogoUrl(company.logo_url || '');
      setBankInfo({
        banco: company.bank_info?.banco || '',
        tipo_cuenta: company.bank_info?.tipo_cuenta || '',
        numero_cuenta: company.bank_info?.numero_cuenta || '',
        titular: company.bank_info?.titular || '',
        rut: company.bank_info?.rut || '',
        email: company.bank_info?.email || '',
      });
      setMinMarginPct(
        String(company.min_margin_pct ?? company.bank_info?.__saas_config?.min_margin_pct ?? 15)
      );
      setUfRateClp(
        String(company.uf_rate_clp ?? company.bank_info?.__saas_config?.uf_rate_clp ?? 41405)
      );
      setUsdRateClp(
        String(company.usd_rate_clp ?? company.bank_info?.__saas_config?.usd_rate_clp ?? 1025)
      );
      setRetentionPolicy(
        company.honorarios_retention_policy ||
          company.bank_info?.__saas_config?.honorarios_retention_policy ||
          'contractor'
      );
      setHideFiguraBranding(
        Boolean(
          company.hide_figura_branding ??
            company.bank_info?.hide_figura_branding ??
            company.bank_info?.__saas_config?.hide_figura_branding
        )
      );
      setWhiteLabelFooter(
        String(
          company.white_label_footer ??
            company.bank_info?.white_label_footer ??
            company.bank_info?.__saas_config?.white_label_footer ??
            ''
        )
      );
      const rawSec =
        company.secondary_accounts ??
        company.bank_info?.secondary_accounts ??
        company.bank_info?.__saas_config?.secondary_accounts;
      setSecondaryAccounts(Array.isArray(rawSec) ? rawSec : []);
    }
  }, [company, open]);

  const handleAddSecondaryAccount = () => {
    if (!canEditWhiteLabel || secondaryAccounts.length >= 5) return;
    setSecondaryAccounts((prev) => [
      ...prev,
      { banco: '', tipo_cuenta: 'Cuenta Corriente USD', numero_cuenta: '', titular: '', rut: '', email: '' },
    ]);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;

    const rawMargin = minMarginPct.trim();
    const rawUf = ufRateClp.trim();
    const rawUsd = usdRateClp.trim();
    const parsedMinMargin =
      rawMargin === '' ? 15 : Math.min(95, Math.max(0, Number(rawMargin)));
    const parsedUfRate =
      rawUf === '' ? 41405 : Math.min(500000, Math.max(1000, Math.round(Number(rawUf))));
    const parsedUsdRate =
      rawUsd === '' ? 1025 : Math.min(10000, Math.max(100, Math.round(Number(rawUsd))));

    if (
      Number.isNaN(parsedMinMargin) ||
      Number.isNaN(parsedUfRate) ||
      Number.isNaN(parsedUsdRate)
    ) {
      setError('Verifique que el piso de margen y las tasas UF/USD sean valores numéricos válidos.');
      return;
    }

    setSaving(true);
    setError(null);

    const cleanedSecondary = secondaryAccounts.filter(
      (acc) => (acc.banco || '').trim() || (acc.numero_cuenta || '').trim()
    );

    try {
      if (company.is_demo && typeof window !== 'undefined') {
        const raw = window.localStorage.getItem('figura_real_erp_demo_v4');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.organization) {
            parsed.organization = {
              ...parsed.organization,
              name: name.trim(),
              legal_name: legalName.trim() || null,
              rut: rut.trim() || null,
              subtitle: subtitle.trim() || null,
              location: location.trim() || null,
              contact_email: contactEmail.trim() || null,
              contact_phone: contactPhone.trim() || null,
              ...(canEditLogo ? { logo_url: logoUrl.trim() || null } : {}),
              bank_info: {
                ...(parsed.organization.bank_info || {}),
                ...(canEditBank ? bankInfo : {}),
              },
              min_margin_pct: parsedMinMargin,
              uf_rate_clp: parsedUfRate,
              usd_rate_clp: parsedUsdRate,
              honorarios_retention_policy: retentionPolicy,
            };
            window.localStorage.setItem('figura_real_erp_demo_v4', JSON.stringify(parsed));
          }
        }
        window.dispatchEvent(new Event('figura:org-updated'));
        onOpenChange(false);
        onSaved(`Configuración de "${name.trim()}" guardada en Sandbox Local.`);
        return;
      }

      const payload: Record<string, unknown> = {
        id: company.id,
        name: name.trim(),
        legal_name: legalName.trim() || null,
        rut: rut.trim() || null,
        subtitle: subtitle.trim() || null,
        location: location.trim() || null,
        contact_email: contactEmail.trim() || null,
        contact_phone: contactPhone.trim() || null,
        min_margin_pct: parsedMinMargin,
        uf_rate_clp: parsedUfRate,
        usd_rate_clp: parsedUsdRate,
        honorarios_retention_policy: retentionPolicy,
      };

      if (canEditLogo) {
        payload.logo_url = logoUrl.trim() || null;
      }
      if (canEditBank) {
        payload.bank_info = bankInfo;
      }
      if (canEditWhiteLabel) {
        payload.hide_figura_branding = hideFiguraBranding;
        payload.white_label_footer = whiteLabelFooter.trim() || null;
        payload.secondary_accounts = cleanedSecondary;
      }

      const res = await fetch('/api/admin/companies', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No se pudo actualizar la configuración de la empresa.');
        return;
      }

      await logAudit({
        action: 'branding_change',
        entityType: 'organization',
        entityId: company.id,
        entityLabel: name.trim(),
        before: {
          min_margin_pct: company.min_margin_pct ?? 15,
          honorarios_retention_policy: company.honorarios_retention_policy ?? 'contractor',
          hide_figura_branding: Boolean(company.hide_figura_branding),
        },
        after: {
          min_margin_pct: parsedMinMargin,
          honorarios_retention_policy: retentionPolicy,
          ...(canEditWhiteLabel ? { hide_figura_branding: hideFiguraBranding } : {}),
          ...(canEditBank ? { bank_info_updated: true } : {}),
          ...(canEditLogo ? { logo_updated: Boolean(logoUrl.trim()) } : {}),
        },
        organizationId: company.id,
        actor: {
          id: profile?.id,
          email: profile?.email,
          role: profile?.role,
        },
      });

      const savedParts = ['datos corporativos', 'políticas comerciales'];
      if (canEditBank) savedParts.push('datos bancarios');
      if (canEditLogo) savedParts.push('logo');
      if (canEditWhiteLabel) savedParts.push('marca blanca');

      window.dispatchEvent(new Event('figura:org-updated'));
      onOpenChange(false);
      onSaved(
        `Configuración de "${name.trim()}" guardada (${savedParts.join(', ')}).`
      );
    } catch {
      setError('Error de conexión al guardar cambios.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} className="max-w-2xl">
      <form onSubmit={handleSave} className="flex flex-col max-h-[85dvh]">
        <DialogHeader>
          <DialogTitle>
            <Building2 className="h-5 w-5 text-primary" />
            Identidad, Marca Blanca y Políticas Comerciales
          </DialogTitle>
          <DialogDescription>
            Configure los datos visibles en cotizaciones PDF y Portal /q según las capacidades activas de su plan.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-xs text-destructive">
              {error}
            </div>
          )}

          {/* Plan capability summary strip */}
          <div className="grid grid-cols-3 gap-2 text-[11px]">
            <div
              className={`rounded-lg border px-2.5 py-2 flex items-center justify-between gap-1 ${
                canEditBank
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                  : 'bg-muted/50 border-border text-muted-foreground'
              }`}
            >
              <span className="font-medium truncate">Datos Bancarios</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {canEditBank ? 'Activo' : 'Esencial'}
              </Badge>
            </div>
            <div
              className={`rounded-lg border px-2.5 py-2 flex items-center justify-between gap-1 ${
                canEditLogo
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                  : 'bg-muted/50 border-border text-muted-foreground'
              }`}
            >
              <span className="font-medium truncate">Logo Propio</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {canEditLogo ? 'Activo' : 'Crecimiento'}
              </Badge>
            </div>
            <div
              className={`rounded-lg border px-2.5 py-2 flex items-center justify-between gap-1 ${
                canEditWhiteLabel
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                  : 'bg-muted/50 border-border text-muted-foreground'
              }`}
            >
              <span className="font-medium truncate">Marca Blanca 100%</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {canEditWhiteLabel ? 'Activo' : 'Escala'}
              </Badge>
            </div>
          </div>

          <LogoUploadField
            companyName={name}
            logoUrl={logoUrl}
            onChange={setLogoUrl}
            disabled={!canEditLogo}
            lockedNotice="El logo corporativo en PDF y Portal /q se desbloquea desde Crecimiento Inteligente IA ($69.990/mes)."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Nombre Comercial *</label>
              <Input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Razón Social</label>
              <Input
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">RUT Empresa</label>
              <Input
                value={rut}
                onChange={(e) => setRut(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Ciudad / Ubicación</label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-medium">Subtítulo / Giro en Cotización PDF</label>
              <Input
                placeholder="Ej: INGENIERÍA Y EJECUCIÓN DE PROYECTOS"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Email Comercial</label>
              <Input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Teléfono Comercial</label>
              <Input
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
              />
            </div>
          </div>

          {/* Commercial rules & SII retention policy */}
          <div className="pt-3 border-t space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Percent className="h-3.5 w-3.5 text-primary" />
              Reglas Comerciales, SII &amp; Tasas Multimoneda
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">Piso de Margen Mínimo (%)</label>
                <Input
                  type="number"
                  min={0}
                  max={95}
                  step={0.5}
                  value={minMarginPct}
                  onChange={(e) => setMinMarginPct(e.target.value)}
                />
                <p className="text-[10px] text-muted-foreground">
                  Bloquea envío/aceptación bajo este margen hasta aprobación gerencial.
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Política Retención Boletas 15,25% (2026)</label>
                <Select
                  value={retentionPolicy}
                  onChange={(e) =>
                    setRetentionPolicy(e.target.value as HonorariosRetentionPolicy)
                  }
                  options={[
                    {
                      value: 'contractor',
                      label: 'Prestador asume retención (se descuenta 15,25%)',
                    },
                    {
                      value: 'company',
                      label: 'Empresa asume gross-up completo (líquido pactado)',
                    },
                    {
                      value: 'split_50_50',
                      label: 'Compartida 50% empresa / 50% prestador',
                    },
                  ]}
                />
                <p className="text-[10px] text-muted-foreground">
                  Aplica en costeo de honorarios y proyección F29.
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Valor UF Referencia (CLP)</label>
                <Input
                  type="number"
                  min={1000}
                  max={500000}
                  step={1}
                  value={ufRateClp}
                  onChange={(e) => setUfRateClp(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Valor USD Referencia (CLP)</label>
                <Input
                  type="number"
                  min={100}
                  max={10000}
                  step={1}
                  value={usdRateClp}
                  onChange={(e) => setUsdRateClp(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Bank Info (Essential+) */}
          <div className="pt-3 border-t space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Landmark className="h-3.5 w-3.5 text-primary" />
                Datos Bancarios para Transferencia (PDF y Portal /q)
              </p>
              {!canEditBank && (
                <Badge
                  variant="outline"
                  className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 gap-1"
                >
                  <Lock className="h-2.5 w-2.5" />
                  Operación Esencial
                </Badge>
              )}
            </div>

            {!canEditBank && (
              <div className="p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-[11px] text-amber-800 dark:text-amber-200 flex items-center justify-between gap-2">
                <span>
                  Los datos bancarios en cotizaciones se desbloquean desde <strong>Operación Esencial ($34.990/mes)</strong>.
                </span>
                <Link href="/billing" className="underline font-semibold shrink-0">
                  Ver planes
                </Link>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">Banco</label>
                <Input
                  disabled={!canEditBank}
                  placeholder="Ej: Banco de Chile / Santander"
                  value={bankInfo.banco || ''}
                  onChange={(e) => setBankInfo({ ...bankInfo, banco: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Tipo de Cuenta</label>
                <Input
                  disabled={!canEditBank}
                  placeholder="Ej: Cuenta Corriente"
                  value={bankInfo.tipo_cuenta || ''}
                  onChange={(e) => setBankInfo({ ...bankInfo, tipo_cuenta: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">N° de Cuenta</label>
                <Input
                  disabled={!canEditBank}
                  value={bankInfo.numero_cuenta || ''}
                  onChange={(e) => setBankInfo({ ...bankInfo, numero_cuenta: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Titular</label>
                <Input
                  disabled={!canEditBank}
                  value={bankInfo.titular || ''}
                  onChange={(e) => setBankInfo({ ...bankInfo, titular: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">RUT Titular</label>
                <Input
                  disabled={!canEditBank}
                  value={bankInfo.rut || ''}
                  onChange={(e) => setBankInfo({ ...bankInfo, rut: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Email Notificación Pago</label>
                <Input
                  disabled={!canEditBank}
                  value={bankInfo.email || ''}
                  onChange={(e) => setBankInfo({ ...bankInfo, email: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* 100% White-Label (Scale) */}
          <div className="pt-3 border-t space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Crown className="h-3.5 w-3.5 text-amber-500" />
                Marca Blanca 100% &amp; Múltiples Cuentas (Corporativo &amp; Escala)
              </p>
              {!canEditWhiteLabel && (
                <Badge
                  variant="outline"
                  className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 gap-1"
                >
                  <Lock className="h-2.5 w-2.5" />
                  Corporativo &amp; Escala
                </Badge>
              )}
            </div>

            {!canEditWhiteLabel && (
              <div className="p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-[11px] text-amber-800 dark:text-amber-200 flex items-center justify-between gap-2">
                <span>
                  Elimine la huella &ldquo;FIGURA&rdquo;, defina su pie legal propio y agregue cuentas USD/SWIFT en{' '}
                  <strong>Corporativo &amp; Escala ($119.990/mes)</strong>.
                </span>
                <Link href="/billing" className="underline font-semibold shrink-0">
                  Mejorar Plan
                </Link>
              </div>
            )}

            <label
              className={`flex items-center gap-2.5 p-3 rounded-lg border text-xs ${
                canEditWhiteLabel
                  ? 'bg-muted/20 cursor-pointer'
                  : 'bg-muted/40 opacity-60 cursor-not-allowed'
              }`}
            >
              <input
                type="checkbox"
                disabled={!canEditWhiteLabel}
                checked={hideFiguraBranding}
                onChange={(e) => setHideFiguraBranding(e.target.checked)}
                className="h-4 w-4 rounded"
              />
              <span className="font-medium">
                Ocultar toda referencia o pie &ldquo;FIGURA&rdquo; en PDFs y Portal /q (Marca Blanca 100%)
              </span>
            </label>

            <div className="space-y-1">
              <label className="text-xs font-medium">Pie Legal / Garantía Propia en Documentos</label>
              <textarea
                rows={2}
                disabled={!canEditWhiteLabel}
                placeholder="Ej: Cotización válida por 15 días. Garantía técnica de 12 meses sujeta a condiciones contractuales."
                value={whiteLabelFooter}
                onChange={(e) => setWhiteLabelFooter(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">Cuentas Adicionales (ej. USD / SWIFT / Banco secundario)</span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!canEditWhiteLabel || secondaryAccounts.length >= 5}
                  onClick={handleAddSecondaryAccount}
                  className="h-7 text-[11px] gap-1"
                >
                  <Plus className="h-3 w-3" />
                  Agregar Cuenta
                </Button>
              </div>

              {secondaryAccounts.map((acc, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg border bg-muted/20 grid grid-cols-1 sm:grid-cols-3 gap-2 items-center"
                >
                  <Input
                    disabled={!canEditWhiteLabel}
                    placeholder="Banco / SWIFT"
                    value={acc.banco || ''}
                    onChange={(e) =>
                      setSecondaryAccounts((prev) =>
                        prev.map((row, i) => (i === idx ? { ...row, banco: e.target.value } : row))
                      )
                    }
                    className="h-8 text-xs"
                  />
                  <Input
                    disabled={!canEditWhiteLabel}
                    placeholder="Tipo (Cuenta USD / IBAN)"
                    value={acc.tipo_cuenta || ''}
                    onChange={(e) =>
                      setSecondaryAccounts((prev) =>
                        prev.map((row, i) =>
                          i === idx ? { ...row, tipo_cuenta: e.target.value } : row
                        )
                      )
                    }
                    className="h-8 text-xs"
                  />
                  <div className="flex items-center gap-1.5">
                    <Input
                      disabled={!canEditWhiteLabel}
                      placeholder="N° Cuenta / Routing"
                      value={acc.numero_cuenta || ''}
                      onChange={(e) =>
                        setSecondaryAccounts((prev) =>
                          prev.map((row, i) =>
                            i === idx ? { ...row, numero_cuenta: e.target.value } : row
                          )
                        )
                      }
                      className="h-8 text-xs"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={!canEditWhiteLabel}
                      onClick={() =>
                        setSecondaryAccounts((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="h-8 px-2 text-destructive"
                      title="Eliminar cuenta"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Guardar Configuración
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
