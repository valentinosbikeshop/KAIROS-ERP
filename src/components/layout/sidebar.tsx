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
        'w-64 fixed left-0 top-0 bottom-0 h-full border-r flex flex-col z-50 shadow-xs transition-colors',
        isDarkExecutiveShell
          ? 'bg-slate-950 border-slate-800 text-slate-100'
          : 'border-border/60 bg-card/90 backdrop-blur-xl'
      )}
    >
      <div
        className={cn(
          'h-16 flex items-center px-4 border-b shrink-0 gap-2.5',
          isDarkExecutiveShell ? 'border-slate-800' : 'border-border/60'
        )}
      >
        <CompanyLogoMark
          name={organizationName}
          logoUrl={organizationLogoUrl}
          isDemo={isDemo}
          size="sm"
        />
        <div className="min-w-0 flex-1 flex items-center gap-1.5">
          <span className="font-semibold text-sm truncate" title={organizationName}>
            {organizationName}
          </span>
          <span
            className={cn(
              'text-[10px] px-1.5 py-0.5 rounded-full font-semibold border shrink-0',
              isDemo
                ? 'bg-amber-100 text-amber-800 border-amber-300'
                : isDarkExecutiveShell
                ? 'bg-amber-400/15 text-amber-300 border-amber-400/30'
                : 'bg-primary/10 text-primary border-primary/20'
            )}
          >
            {isDemo ? 'DEMO' : 'ERP'}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <nav className="px-4 space-y-1">
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
                  'flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all tactile-press',
                  isActive
                    ? isDarkExecutiveShell
                      ? 'bg-amber-400 text-slate-950 font-semibold'
                      : 'bg-primary text-primary-foreground'
                    : isDarkExecutiveShell
                    ? 'text-slate-300 hover:bg-slate-900 hover:text-white'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <span className="flex items-center gap-3 truncate">
                  <Icon className="h-4 w-4 shrink-0" />
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
                'px-7 mb-2 text-xs font-semibold uppercase tracking-wider',
                isDarkExecutiveShell ? 'text-slate-400' : 'text-muted-foreground'
              )}
            >
              Administración
            </h4>
            <nav className="px-4 space-y-1">
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
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all tactile-press',
                      isActive
                        ? isDarkExecutiveShell
                          ? 'bg-amber-400 text-slate-950 font-semibold'
                          : 'bg-primary text-primary-foreground'
                        : isDarkExecutiveShell
                        ? 'text-slate-300 hover:bg-slate-900 hover:text-white'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                );
              })}

              {/* Suscripción & Estilo solo para tenants SaaS (exento DUO Producciones y Demo) */}
              {!isDuoExempt && !isDemo && (
                <Link
                  href="/billing"
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all tactile-press',
                    pathname.startsWith('/billing')
                      ? isDarkExecutiveShell
                        ? 'bg-amber-400 text-slate-950 font-semibold'
                        : 'bg-primary text-primary-foreground'
                      : isDarkExecutiveShell
                      ? 'text-slate-300 hover:bg-slate-900 hover:text-white'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <CreditCard className="h-4 w-4" />
                  Suscripción & Estilo
                </Link>
              )}
            </nav>
          </div>
        )}
      </div>

      <div
        className={cn(
          'px-4 py-3 border-t shrink-0 space-y-2.5',
          isDarkExecutiveShell ? 'border-slate-800 bg-slate-900/50' : 'bg-muted/15'
        )}
      >
        {userEmail && (
          <p
            className={cn(
              'text-[11px] truncate px-1',
              isDarkExecutiveShell ? 'text-slate-400' : 'text-muted-foreground'
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
              'w-full justify-start gap-2 h-8 text-xs font-medium',
              isDarkExecutiveShell
                ? 'bg-transparent border-slate-700 text-rose-300 hover:bg-rose-950/50 hover:text-rose-200'
                : 'text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700'
            )}
          >
            <LogOut className="h-3.5 w-3.5" />
            Cerrar Sesión
          </Button>
        )}
        <div className="flex items-center justify-center pt-1">
          <KairosLogo size="sm" subtitle="Multi-Tenant Cloud" />
        </div>
      </div>
    </aside>
  );
}
