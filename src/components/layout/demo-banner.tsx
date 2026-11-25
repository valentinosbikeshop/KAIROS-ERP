'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import {
  Dialog,
  DialogBody,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  FlaskConical,
  RotateCcw,
  LogOut,
  ShieldAlert,
  CheckCircle2,
  Compass,
  HardDrive,
  Database,
  ArrowRight,
} from 'lucide-react';
import { INDUSTRY_LIST } from '@/lib/industries';
import { useWorkspaceConfig } from '@/hooks/use-workspace-config';
import {
  LOCAL_DEMO_CONSENT_KEY,
  disableLocalDemoMode,
  getLocalDemoStats,
  resetLocalDemoData,
  switchLocalDemoIndustry,
} from '@/lib/supabase/local-demo-client';
import type { IndustryType } from '@/types/database';

export function DemoBanner({
  onSignOut,
}: {
  isSuperAdmin?: boolean;
  onSignOut?: () => Promise<void> | void;
}) {
  const { terms } = useWorkspaceConfig();
  const [mounted, setMounted] = useState(false);
  const [cacheAccepted, setCacheAccepted] = useState(true);
  const [stats, setStats] = useState(() => getLocalDemoStats());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const refreshStats = useCallback(() => {
    setStats(getLocalDemoStats());
  }, []);

  useEffect(() => {
    setMounted(true);
    try {
      setCacheAccepted(localStorage.getItem(LOCAL_DEMO_CONSENT_KEY) === 'accepted');
    } catch {
      setCacheAccepted(true);
    }
    refreshStats();

    window.addEventListener('figura:local-db-changed', refreshStats);
    window.addEventListener('figura:org-updated', refreshStats);
    return () => {
      window.removeEventListener('figura:local-db-changed', refreshStats);
      window.removeEventListener('figura:org-updated', refreshStats);
    };
  }, [refreshStats]);

  const handleAcceptCache = () => {
    try {
      localStorage.setItem(LOCAL_DEMO_CONSENT_KEY, 'accepted');
    } catch {
      // ignore
    }
    setCacheAccepted(true);
  };

  const handleIndustryChange = (nextIndustry: IndustryType) => {
    switchLocalDemoIndustry(nextIndustry);
    refreshStats();
  };

  const handleReset = () => {
    resetLocalDemoData();
    refreshStats();
    setResetMessage('Datos de demostración restaurados al estado inicial.');
    setTimeout(() => {
      setConfirmOpen(false);
      window.location.href = '/dashboard';
    }, 450);
  };

  const handleExitDemo = async () => {
    disableLocalDemoMode();
    if (onSignOut) {
      await onSignOut();
      return;
    }
    window.location.href = '/welcome';
  };

  return (
    <>
      <div
        role="region"
        aria-label="Barra de sesión de prueba en caché local"
        className="bg-white/80 backdrop-blur-2xl text-foreground border-b border-slate-200/80 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-2xs"
      >
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <Badge className="bg-[#467366]/15 text-[#2E5248] border border-[#467366]/30 font-semibold tracking-wide uppercase px-2.5 py-0.5 flex items-center gap-1.5">
            <FlaskConical className="h-3.5 w-3.5 text-[#467366]" />
            Sesión de Prueba · Plan Enterprise
          </Badge>

          <div className="w-48 sm:w-56" data-tour-id="demo-industry-switcher">
            <Select
              value={stats.industryType}
              onChange={(e) => handleIndustryChange(e.target.value as IndustryType)}
              options={INDUSTRY_LIST.map((ind) => ({
                value: ind.id,
                label: `Rubro: ${ind.shortName}`,
              }))}
              className="h-8 text-xs font-medium bg-white/90"
            />
          </div>

          <span className="hidden xl:inline-flex items-center gap-2 rounded-lg bg-slate-100/80 border border-slate-200/80 px-2.5 py-1 text-[11px] font-medium text-muted-foreground tabular-nums">
            <span>{terms.projectPlural} propios: {stats.userEventsCount}/{stats.maxEvents}</span>
            <span>•</span>
            <span>{terms.catalogLabel} propios: {stats.userCostsCount}/{stats.maxCosts}</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            data-tour-id="demo-guide-btn"
            onClick={() =>
              window.dispatchEvent(new CustomEvent('figura:open-guide', { detail: { tab: 'tour' } }))
            }
            className="h-8 gap-1.5 text-xs font-medium"
          >
            <Compass className="h-3.5 w-3.5 text-[#4A607A]" />
            <span className="hidden sm:inline">Guía Interactiva</span>
          </Button>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              setResetMessage(null);
              setConfirmOpen(true);
            }}
            className="h-8 gap-1.5 text-xs font-medium"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Restaurar Demo</span>
          </Button>

          <Link href="/welcome#planes">
            <Button
              type="button"
              size="sm"
              className="h-8 gap-1.5 text-xs font-semibold tactile-press"
            >
              <span>Elegir Plan Oficial</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleExitDemo}
            className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Salir</span>
          </Button>
        </div>
      </div>

      {/* Aviso No Invasivo de Caché Local */}
      {mounted && !cacheAccepted && (
        <div
          role="dialog"
          aria-label="Aviso de almacenamiento en caché local"
          className="fixed bottom-4 left-4 right-4 z-[60] max-w-3xl mx-auto rounded-2xl glass-luxury p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-[#4A607A]/12 border border-[#4A607A]/25 text-[#3B4F66] shrink-0">
              <HardDrive className="h-4 w-4" />
            </div>
            <div className="space-y-0.5 text-xs">
              <p className="font-semibold text-foreground flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5 text-[#4A607A]" />
                Modo Evaluación: Almacenamiento Exclusivo en Caché Local
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Para proteger tu privacidad, ningún dato que edites o crees en esta sesión de prueba se guarda en Supabase; todo permanece temporalmente en el caché de tu navegador.
              </p>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={handleAcceptCache}
            className="font-semibold shrink-0 tactile-press"
          >
            Entendido, continuar
          </Button>
        </div>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen} className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <RotateCcw className="h-4 w-4 text-[#4A607A]" />
            Restaurar Sesión de Prueba
          </DialogTitle>
          <DialogDescription>
            Esta acción limpiará los cambios realizados en tu navegador y restaurará los ejemplos base del rubro.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-3 text-sm">
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-foreground text-xs space-y-1.5">
            <p className="font-semibold flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4 text-[#4A607A] shrink-0" />
              ¿Qué ocurrirá al confirmar?
            </p>
            <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
              <li>Se restaurarán los proyectos y tarifas maestras originales de tu rubro en el navegador.</li>
              <li>Ningún servidor externo es afectado.</li>
            </ul>
          </div>
          {resetMessage && (
            <div className="rounded-xl border border-[#467366]/30 bg-[#467366]/10 p-3 text-[#2E5248] text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{resetMessage}</span>
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setConfirmOpen(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleReset}
            className="font-semibold gap-1.5"
          >
            <RotateCcw className="h-4 w-4" />
            Sí, Restaurar Datos
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
