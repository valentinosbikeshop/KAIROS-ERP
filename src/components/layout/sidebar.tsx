'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { KairosLogo, CompanyLogoMark } from '@/components/ui/kairos-logo';
import { Button } from '@/components/ui/button';
import { CreditCard, Lock, LogOut } from 'lucide-react';
import { navLinks, adminLinks } from './nav-links';
import type { IndustryTerminology } from '@/lib/industries';
import type { ResolvedEntitlements } from '@/types';

interface SidebarProps {
  isAdmin: boolean;
  isSuperAdmin?: boolean;
  isDemo?: boolean;
  isDuoExempt?: boolean;
  organizationName?: string;
  organizationLogoUrl?: string | null;
  userEmail?: string | null;
  terms?: IndustryTerminology;
  entitlements?: ResolvedEntitlements;
  onSignOut?: () => void;
}

export function Sidebar({
  isAdmin,
  isSuperAdmin = false,
  isDemo = false,
  isDuoExempt = false,
  organizationName = 'KAIROS ERP',
  organizationLogoUrl,
  userEmail,
  terms,
  entitlements,
  onSignOut,
}: SidebarProps) {
  const pathname = usePathname();

  const visibleAdminLinks = adminLinks.filter((link) => {
    if (link.href === '/governance') {
      return isSuperAdmin || (!isDemo && isAdmin);
    }
    return true;
  });

  const resolveNavLabel = (href: string, defaultLabel: string) => {
    if (!terms || isDuoExempt) return defaultLabel;
    if (href === '/costs') return terms.catalogLabel;
    if (href === '/events') return terms.projectPlural;
    if (href === '/analytics') return terms.analyticsLabel;
    return defaultLabel;
  };

  const isDarkExecutiveShell =
    !isDuoExempt &&
    !isDemo &&
    (entitlements?.effectiveTier === 'growth' || entitlements?.effectiveTier === 'scale');

  return (
    <aside
      className={cn(
        'w-64 fixed left-0 top-0 bottom-0 h-full border-r flex flex-col z-50 transition-colors duration-300',
        isDarkExecutiveShell
          ? 'bg-[#121210]/95 backdrop-blur-2xl border-white/[0.08] text-[#F7F5F0]'
          : 'border-border/70 bg-[#FCFBF9]/80 backdrop-blur-2xl'
      )}
    >
      <div
        className={cn(
          'h-16 flex items-center px-4 border-b shrink-0 gap-2.5',
          isDarkExecutiveShell ? 'border-white/[0.08]' : 'border-border/65'
        )}
      >
        <CompanyLogoMark
          name={organizationName}
          logoUrl={organizationLogoUrl}
          isDemo={isDemo}
          size="sm"
        />
        <div className="min-w-0 flex-1 flex items-center gap-1.5">
          <span className="font-semibold text-sm tracking-tight truncate" title={organizationName}>
            {organizationName}
          </span>
          <span
            className={cn(
              'font-mono text-[9px] px-1.5 py-0.5 rounded-full font-medium tracking-wider border shrink-0',
              isDemo
                ? 'bg-[#9A7B4F]/12 text-[#85673E] border-[#9A7B4F]/25'
                : isDarkExecutiveShell
                ? 'bg-[#9A7B4F]/18 text-[#D7BE96] border-[#9A7B4F]/30'
                : 'bg-secondary text-muted-foreground border-border/80'
            )}
          >
            {isDemo ? 'DEMO' : 'ERP'}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4 custom-scrollbar">
        <nav className="px-3.5 space-y-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive =
              pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
            const label = resolveNavLabel(link.href, link.label);
            const isAnalyticsLocked =
              link.href === '/analytics' &&
              !isDuoExempt &&
              !isDemo &&
              entitlements &&
              !entitlements.modules.mod_analytics_excel;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'relative flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 tactile-press',
                  isActive
                    ? isDarkExecutiveShell
                      ? 'bg-white/[0.08] text-[#F7F5F0] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
                      : 'bg-[#171715]/[0.055] text-foreground font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]'
                    : isDarkExecutiveShell
                    ? 'text-stone-400 hover:bg-white/[0.04] hover:text-[#F7F5F0]'
                    : 'text-muted-foreground hover:bg-secondary/65 hover:text-foreground'
                )}
              >
                {isActive && (
                  <span
                    className="absolute left-0 top-2 bottom-2 w-[2px] rounded-r-full bg-[#9A7B4F]"
                    aria-hidden="true"
                  />
                )}
                <span className="flex items-center gap-3 truncate">
                  <Icon className={cn('h-4 w-4 shrink-0 transition-colors', isActive && 'text-[#9A7B4F]')} />
                  <span className="truncate">{label}</span>
                </span>
                {isAnalyticsLocked && <Lock className="h-3 w-3 opacity-60 shrink-0" />}
              </Link>
            );
          })}
        </nav>

        {(isAdmin || isSuperAdmin) && visibleAdminLinks.length > 0 && (
          <div className="mt-8">
            <h4
              className={cn(
                'px-6.5 mb-2 font-mono text-[10px] font-medium uppercase tracking-[0.18em]',
                isDarkExecutiveShell ? 'text-stone-500' : 'text-muted-foreground/80'
              )}
            >
              Administración
            </h4>
            <nav className="px-3.5 space-y-1">
              {visibleAdminLinks.map((link) => {
                const Icon = link.icon;
                const isActive =
                  pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
                const label =
                  link.href === '/governance'
                    ? isSuperAdmin
                      ? 'Gobernanza y Empresas'
                      : 'Equipo y Accesos'
                    : link.label;

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      'relative flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 tactile-press',
                      isActive
                        ? isDarkExecutiveShell
                          ? 'bg-white/[0.08] text-[#F7F5F0] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
                          : 'bg-[#171715]/[0.055] text-foreground font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]'
                        : isDarkExecutiveShell
                        ? 'text-stone-400 hover:bg-white/[0.04] hover:text-[#F7F5F0]'
                        : 'text-muted-foreground hover:bg-secondary/65 hover:text-foreground'
                    )}
                  >
                    {isActive && (
                      <span
                        className="absolute left-0 top-2 bottom-2 w-[2px] rounded-r-full bg-[#9A7B4F]"
                        aria-hidden="true"
                      />
                    )}
                    <Icon className={cn('h-4 w-4 transition-colors', isActive && 'text-[#9A7B4F]')} />
                    {label}
                  </Link>
                );
              })}

              {/* Suscripción & Estilo solo para tenants SaaS (exento DUO Producciones y Demo) */}
              {!isDuoExempt && !isDemo && (
                <Link
                  href="/billing"
                  className={cn(
                    'relative flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 tactile-press',
                    pathname.startsWith('/billing')
                      ? isDarkExecutiveShell
                        ? 'bg-white/[0.08] text-[#F7F5F0] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
                        : 'bg-[#171715]/[0.055] text-foreground font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]'
                      : isDarkExecutiveShell
                      ? 'text-stone-400 hover:bg-white/[0.04] hover:text-[#F7F5F0]'
                      : 'text-muted-foreground hover:bg-secondary/65 hover:text-foreground'
                  )}
                >
                  {pathname.startsWith('/billing') && (
                    <span
                      className="absolute left-0 top-2 bottom-2 w-[2px] rounded-r-full bg-[#9A7B4F]"
                      aria-hidden="true"
                    />
                  )}
                  <CreditCard className={cn('h-4 w-4 transition-colors', pathname.startsWith('/billing') && 'text-[#9A7B4F]')} />
                  Suscripción & Estilo
                </Link>
              )}
            </nav>
          </div>
        )}
      </div>

      <div
        className={cn(
          'px-4 py-3.5 border-t shrink-0 space-y-2.5',
          isDarkExecutiveShell ? 'border-white/[0.08] bg-white/[0.02]' : 'border-border/65 bg-secondary/35'
        )}
      >
        {userEmail && (
          <p
            className={cn(
              'font-mono text-[11px] truncate px-1',
              isDarkExecutiveShell ? 'text-stone-400' : 'text-muted-foreground'
            )}
            title={isDemo ? 'visitante@kairos-sandbox.cl' : userEmail}
          >
            {isDemo ? 'visitante@kairos-sandbox.cl' : userEmail}
          </p>
        )}
        {onSignOut && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onSignOut}
            className={cn(
              'w-full justify-start gap-2 h-8 text-xs font-medium transition-colors',
              isDarkExecutiveShell
                ? 'bg-transparent border-white/10 text-stone-300 hover:bg-[#9E3B33]/20 hover:text-[#F2B8B3] hover:border-[#9E3B33]/35'
                : 'text-muted-foreground border-border/80 hover:bg-[#9E3B33]/8 hover:text-[#9E3B33] hover:border-[#9E3B33]/25'
            )}
          >
            <LogOut className="h-3.5 w-3.5" />
            Cerrar Sesión
          </Button>
        )}
        <div className="flex items-center justify-center pt-1">
          <KairosLogo
            size="sm"
            subtitle="Multi-Tenant Cloud"
            wordmarkClassName={isDarkExecutiveShell ? 'text-[#F7F5F0]' : undefined}
          />
        </div>
      </div>
    </aside>
  );
}
