'use client';

import Link from 'next/link';
import {
  BarChart3,
  Building2,
  Calendar,
  DollarSign,
  Home,
  ArrowLeft,
  Sparkles,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CompanyLogoMark, KairosLogo } from '@/components/ui/kairos-logo';
import { Button } from '@/components/ui/button';
import type { IndustryTerminology } from '@/lib/industries';

export type DemoSectionKey = 'dashboard' | 'catalog' | 'projects' | 'analytics' | 'branding';

interface DemoSidebarProps {
  activeSection: DemoSectionKey;
  onSelectSection: (section: DemoSectionKey) => void;
  companyName: string;
  terms: IndustryTerminology;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function DemoSidebar({
  activeSection,
  onSelectSection,
  companyName,
  terms,
  mobileOpen,
  onCloseMobile,
}: DemoSidebarProps) {
  const mainItems: Array<{ id: DemoSectionKey; label: string; icon: typeof Home }> = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'catalog', label: terms.catalogLabel, icon: DollarSign },
    { id: 'projects', label: terms.projectPlural, icon: Calendar },
    { id: 'analytics', label: `${terms.analyticsLabel} & F29`, icon: BarChart3 },
  ];

  const handleNav = (id: DemoSectionKey) => {
    onSelectSection(id);
    onCloseMobile();
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#080E1A]/60 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}
      <aside
        className={cn(
          'w-64 fixed left-0 top-0 bottom-0 h-full border-r flex flex-col z-50 transition-transform duration-300 lg:translate-x-0',
          'bg-[#080E1A]/95 backdrop-blur-2xl border-white/[0.08] text-slate-100',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/[0.08] shrink-0 gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <CompanyLogoMark name={companyName} isDemo={false} size="sm" />
            <div className="min-w-0 flex-1 flex items-center gap-1.5">
              <span className="font-semibold text-sm tracking-tight truncate" title={companyName}>
                {companyName}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
            aria-label="Cerrar menú"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-4 pt-3 pb-1">
          <div className="px-3 py-2 rounded-xl bg-[#1261E0]/15 border border-[#38BDF8]/25 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#38BDF8] font-semibold flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-[#2DD4BF]" />
              Plan Enterprise
            </span>
            <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-[#2DD4BF] text-[#080E1A] font-bold">
              DEMO
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-3 custom-scrollbar">
          <nav className="px-3.5 space-y-1">
            {mainItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNav(item.id)}
                  className={cn(
                    'w-full relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 tactile-press text-left',
                    isActive
                      ? 'bg-white/[0.09] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
                      : 'text-slate-400 hover:bg-white/[0.04] hover:text-white'
                  )}
                >
                  {isActive && (
                    <span
                      className="absolute left-0 top-2 bottom-2 w-[2.5px] rounded-r-full bg-[#38BDF8]"
                      aria-hidden="true"
                    />
                  )}
                  <Icon
                    className={cn(
                      'h-4 w-4 shrink-0 transition-colors',
                      isActive && 'text-[#38BDF8]'
                    )}
                  />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="mt-7">
            <h4 className="px-6 mb-2 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">
              Administración
            </h4>
            <nav className="px-3.5 space-y-1">
              <button
                type="button"
                onClick={() => handleNav('branding')}
                className={cn(
                  'w-full relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 tactile-press text-left',
                  activeSection === 'branding'
                    ? 'bg-white/[0.09] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
                    : 'text-slate-400 hover:bg-white/[0.04] hover:text-white'
                )}
              >
                {activeSection === 'branding' && (
                  <span
                    className="absolute left-0 top-2 bottom-2 w-[2.5px] rounded-r-full bg-[#38BDF8]"
                    aria-hidden="true"
                  />
                )}
                <Building2
                  className={cn(
                    'h-4 w-4 shrink-0 transition-colors',
                    activeSection === 'branding' && 'text-[#38BDF8]'
                  )}
                />
                <span className="truncate">Equipo &amp; Marca Blanca</span>
              </button>
            </nav>
          </div>
        </div>

        <div className="px-4 py-3.5 border-t border-white/[0.08] bg-white/[0.02] shrink-0 space-y-2.5">
          <p className="font-mono text-[11px] truncate px-1 text-slate-400">
            visitante@kairos-sandbox.cl
          </p>
          <Link href="/welcome#planes" className="block">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2 h-8 text-xs font-medium bg-transparent border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Volver a Planes Oficiales
            </Button>
          </Link>
          <div className="flex items-center justify-center pt-1">
            <KairosLogo size="sm" subtitle="Sandbox Local" darkSurface />
          </div>
        </div>
      </aside>
    </>
  );
}
