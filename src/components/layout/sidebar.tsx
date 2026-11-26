'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { FiguraLogo, CompanyLogoMark } from '@/components/ui/figura-logo';
import { Button } from '@/components/ui/button';
import { CreditCard, Lock, LogOut } from 'lucide-react';
import { navLinks, adminLinks } from './nav-links';
import { canUseAnalytics, canUseTreasury } from '@/lib/plan-guards';
import { can } from '@/lib/rbac';
import type { IndustryTerminology } from '@/lib/industries';
import type { Profile } from '@/types/database';
import type { ResolvedEntitlements } from '@/types';

interface SidebarProps {
  isAdmin: boolean;
  isSuperAdmin?: boolean;
  isDemo?: boolean;
  isDuoExempt?: boolean;
  organizationName?: string;
  organizationLogoUrl?: string | null;
  userEmail?: string | null;
  profile?: Profile | null;
  terms?: IndustryTerminology;
  entitlements?: ResolvedEntitlements;
  onSignOut?: () => void;
}

export function Sidebar({
  isAdmin,
  isSuperAdmin = false,
  isDemo = false,
  isDuoExempt = false,
  organizationName = 'FIGURA',
  organizationLogoUrl,
  userEmail,
  profile,
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

  return (
    <aside className="w-64 fixed left-0 top-0 bottom-0 h-full border-r border-white/80 bg-white/75 backdrop-blur-2xl flex flex-col z-50 shadow-[0_8px_30px_rgba(71,85,105,0.06)] transition-colors duration-300">
      <div className="h-16 flex items-center px-4 border-b border-slate-200/75 shrink-0 gap-2.5">
        <CompanyLogoMark
          name={organizationName}
          logoUrl={organizationLogoUrl}
          isDemo={isDemo}
          size="sm"
        />
        <div className="min-w-0 flex-1 flex items-center gap-1.5">
          <span className="font-semibold text-sm tracking-tight truncate text-foreground" title={organizationName}>
            {organizationName}
          </span>
          <span
            className={cn(
              'text-[9px] px-1.5 py-0.5 rounded-full font-semibold tracking-wider border shrink-0',
              isDemo
                ? 'bg-[#467366]/12 text-[#2E5248] border-[#467366]/25'
                : 'bg-[#4A607A]/12 text-[#3B4F66] border-[#4A607A]/25'
            )}
          >
            {isDemo ? 'DEMO' : 'ERP'}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4 custom-scrollbar">
        <nav className="px-3.5 space-y-1" data-tour-id="sidebar-nav">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive =
              pathname === link.href ||
              (link.href !== '/dashboard' && link.href !== '/' && pathname.startsWith(link.href));
            const label = resolveNavLabel(link.href, link.label);
            const isAnalyticsLocked =
              link.href === '/analytics' && entitlements
                ? !canUseAnalytics(entitlements) ||
                  (profile ? !can(profile, 'view_costs_margins', entitlements) : false)
                : false;
            const isTreasuryLocked =
              link.href === '/treasury' && entitlements
                ? !canUseTreasury(entitlements) ||
                  (profile ? !can(profile, 'view_treasury', entitlements) : false)
                : false;
            const isLocked = isAnalyticsLocked || isTreasuryLocked;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'relative flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 tactile-press',
                  isActive
                    ? 'bg-white/90 text-foreground font-semibold shadow-2xs border border-slate-200/80'
                    : 'text-muted-foreground hover:bg-white/60 hover:text-foreground'
                )}
              >
                {isActive && (
                  <span
                    className="absolute left-0 top-2 bottom-2 w-[2.5px] rounded-r-full bg-[#4A607A]"
                    aria-hidden="true"
                  />
                )}
                <span className="flex items-center gap-3 truncate">
                  <Icon
                    className={cn(
                      'h-4 w-4 shrink-0 transition-colors',
                      isActive && 'text-[#4A607A]'
                    )}
                  />
                  <span className="truncate">{label}</span>
                </span>
                {isLocked && <Lock className="h-3 w-3 opacity-60 shrink-0" />}
              </Link>
            );
          })}
        </nav>

        {/* En Modo Demo NO se muestra la sección Administración */}
        {!isDemo && (isAdmin || isSuperAdmin) && visibleAdminLinks.length > 0 && (
          <div className="mt-8">
            <h4 className="px-6.5 mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/80">
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
                      'relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 tactile-press',
                      isActive
                        ? 'bg-white/90 text-foreground font-semibold shadow-2xs border border-slate-200/80'
                        : 'text-muted-foreground hover:bg-white/60 hover:text-foreground'
                    )}
                  >
                    {isActive && (
                      <span
                        className="absolute left-0 top-2 bottom-2 w-[2.5px] rounded-r-full bg-[#4A607A]"
                        aria-hidden="true"
                      />
                    )}
                    <Icon
                      className={cn(
                        'h-4 w-4 transition-colors',
                        isActive && 'text-[#4A607A]'
                      )}
                    />
                    {label}
                  </Link>
                );
              })}

              {!isDuoExempt && (
                <Link
                  href="/billing"
                  className={cn(
                    'relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 tactile-press',
                    pathname.startsWith('/billing')
                      ? 'bg-white/90 text-foreground font-semibold shadow-2xs border border-slate-200/80'
                      : 'text-muted-foreground hover:bg-white/60 hover:text-foreground'
                  )}
                >
                  {pathname.startsWith('/billing') && (
                    <span
                      className="absolute left-0 top-2 bottom-2 w-[2.5px] rounded-r-full bg-[#4A607A]"
                      aria-hidden="true"
                    />
                  )}
                  <CreditCard
                    className={cn(
                      'h-4 w-4 transition-colors',
                      pathname.startsWith('/billing') && 'text-[#4A607A]'
                    )}
                  />
                  Suscripción &amp; Estilo
                </Link>
              )}
            </nav>
          </div>
        )}
      </div>

      <div className="px-4 py-3.5 border-t border-slate-200/75 bg-white/50 shrink-0 space-y-2.5">
        {userEmail && (
          <p
            className="text-[11px] truncate px-1 text-muted-foreground"
            title={isDemo ? 'visitante@figura-sandbox.cl' : userEmail}
          >
            {isDemo ? 'visitante@figura-sandbox.cl' : userEmail}
          </p>
        )}
        {onSignOut && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onSignOut}
            className="w-full justify-start gap-2 h-8 text-xs font-medium text-muted-foreground border-slate-200/90 hover:bg-rose-50/80 hover:text-rose-700 hover:border-rose-200"
          >
            <LogOut className="h-3.5 w-3.5" />
            {isDemo ? 'Salir de Demo' : 'Cerrar Sesión'}
          </Button>
        )}
        <div className="flex items-center justify-center pt-1">
          <FiguraLogo size="sm" subtitle="Arquitectura Financiera" />
        </div>
      </div>
    </aside>
  );
}
