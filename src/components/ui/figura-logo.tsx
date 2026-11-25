'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface FiguraLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showWordmark?: boolean;
  subtitle?: string;
  responsive?: boolean;
  compactOnMobile?: boolean;
  surface?: 'light' | 'obsidian';
  darkSurface?: boolean;
  className?: string;
  wordmarkClassName?: string;
}

const SIZE_MAP = {
  sm: {
    iconCls: 'w-7 h-7',
    title: 'text-xs sm:text-sm',
    badge: 'text-[9px]',
  },
  md: {
    iconCls: 'w-8 h-8 sm:w-9 sm:h-9',
    title: 'text-sm sm:text-base',
    badge: 'text-[9px] sm:text-[10px]',
  },
  lg: {
    iconCls: 'w-10 h-10 sm:w-11 sm:h-11',
    title: 'text-lg sm:text-xl',
    badge: 'text-[10px] sm:text-[11px]',
  },
};

export function FiguraLogo({
  size = 'md',
  showWordmark = true,
  subtitle,
  responsive = true,
  compactOnMobile = false,
  surface = 'light',
  darkSurface = false,
  className,
  wordmarkClassName,
}: FiguraLogoProps) {
  const uid = React.useId().replace(/:/g, '');
  const dims = SIZE_MAP[size];
  const isObsidian = surface === 'obsidian';

  return (
    <div className={cn('group inline-flex items-center gap-2.5 sm:gap-3 select-none', className)}>
      <svg
        viewBox="0 0 44 44"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn(
          'shrink-0 transition-transform duration-500 ease-out group-hover:scale-[1.04]',
          responsive ? dims.iconCls : size === 'sm' ? 'w-7 h-7' : size === 'lg' ? 'w-11 h-11' : 'w-9 h-9'
        )}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`figuraBg-${uid}`} x1="2" y1="2" x2="42" y2="42" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#161C2A" />
            <stop offset="55%" stopColor="#0B0E15" />
            <stop offset="100%" stopColor="#06070A" />
          </linearGradient>
          <linearGradient id={`figuraRim-${uid}`} x1="2" y1="2" x2="42" y2="42" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#EDE0C8" stopOpacity="0.62" />
            <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#D8C39E" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id={`figuraChampagne-${uid}`} x1="15" y1="12.5" x2="29.5" y2="12.5" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#EDE0C8" />
            <stop offset="100%" stopColor="#C7AB7B" />
          </linearGradient>
        </defs>

        <rect
          x="2"
          y="2"
          width="40"
          height="40"
          rx="11"
          fill={`url(#figuraBg-${uid})`}
          stroke={`url(#figuraRim-${uid})`}
          strokeWidth="1"
        />

        {/* Drafting grid bracket */}
        <path
          d="M22.5 31.5H30.5V25.5"
          stroke="#D8C39E"
          strokeOpacity="0.42"
          strokeWidth="1.15"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <line
          x1="26.5"
          y1="31.5"
          x2="26.5"
          y2="29.5"
          stroke="#D8C39E"
          strokeOpacity="0.35"
          strokeWidth="1"
          strokeLinecap="round"
        />

        {/* Architectural F Monogram */}
        <path
          d="M15 12.5V31.5"
          stroke="#EEF1F6"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <path
          d="M15 12.5H29.5"
          stroke={`url(#figuraChampagne-${uid})`}
          strokeWidth="2.6"
          strokeLinecap="round"
          className="transition-all duration-500 ease-out group-hover:translate-x-[0.5px]"
        />
        <path
          d="M15 21.5H25"
          stroke="#EEF1F6"
          strokeWidth="2.4"
          strokeLinecap="round"
        />

        {/* Calibration node */}
        <circle
          cx="25.5"
          cy="21.5"
          r="2.15"
          fill="#D8C39E"
          className="transition-transform duration-500 ease-out origin-center group-hover:scale-110"
        />
        <circle cx="25.5" cy="21.5" r="0.75" fill="#0B0E15" />
      </svg>

      {showWordmark && (
        <div className={cn('flex flex-col leading-none', compactOnMobile && 'hidden sm:flex')}>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span
              className={cn(
                'font-semibold tracking-[0.22em] transition-colors',
                isObsidian
                  ? 'text-[#EEF1F6]'
                  : darkSurface
                  ? 'text-slate-800'
                  : 'text-foreground',
                dims.title,
                wordmarkClassName
              )}
            >
              FIGURA
            </span>
            <span
              className={cn(
                'h-3 sm:h-3.5 w-px',
                isObsidian ? 'bg-[#D8C39E]/30' : 'bg-border'
              )}
              aria-hidden="true"
            />
            <span
              className={cn(
                'font-medium tracking-[0.2em] uppercase',
                isObsidian ? 'text-[#D8C39E]' : 'text-[#7C6847]',
                dims.badge
              )}
            >
              ERP
            </span>
          </div>
          {subtitle && (
            <span
              className={cn(
                'hidden sm:block text-[10px] font-medium tracking-[0.04em] mt-1',
                isObsidian ? 'text-[#96A1B5]' : 'text-muted-foreground'
              )}
            >
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

interface CompanyLogoMarkProps {
  name: string;
  logoUrl?: string | null;
  isDemo?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function CompanyLogoMark({
  name,
  logoUrl,
  isDemo = false,
  size = 'sm',
  className,
}: CompanyLogoMarkProps) {
  const [imgError, setImgError] = React.useState(false);

  React.useEffect(() => {
    setImgError(false);
  }, [logoUrl]);

  const boxClass = size === 'md' ? 'h-10 w-10 rounded-xl text-xs' : 'h-8 w-8 rounded-lg text-[11px]';

  if (logoUrl && !imgError) {
    return (
      <div
        className={cn(
          'shrink-0 overflow-hidden border border-border/70 bg-white/80 backdrop-blur-md flex items-center justify-center p-0.5 shadow-2xs',
          boxClass,
          className
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoUrl}
          alt={`Logo de ${name}`}
          onError={() => setImgError(true)}
          className="h-full w-full object-contain rounded-[6px]"
        />
      </div>
    );
  }

  const words = name.trim().split(/\s+/).filter(Boolean);
  const initials =
    words.length >= 2
      ? `${words[0][0]}${words[1][0]}`.toUpperCase()
      : name.slice(0, 2).toUpperCase() || 'FG';

  return (
    <div
      className={cn(
        'shrink-0 flex items-center justify-center font-semibold tracking-wider border shadow-2xs backdrop-blur-md',
        isDemo
          ? 'bg-[#4A607A]/12 text-[#3B4F66] border-[#4A607A]/25'
          : 'bg-[#0B0E15]/90 text-[#EDE0C8] border-[#D8C39E]/35',
        boxClass,
        className
      )}
      title={name}
    >
      {initials}
    </div>
  );
}
