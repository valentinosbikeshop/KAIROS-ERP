'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface KairosLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showWordmark?: boolean;
  subtitle?: string;
  responsive?: boolean;
  compactOnMobile?: boolean;
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

export function KairosLogo({
  size = 'md',
  showWordmark = true,
  subtitle,
  responsive = true,
  compactOnMobile = false,
  darkSurface = false,
  className,
  wordmarkClassName,
}: KairosLogoProps) {
  const uid = React.useId().replace(/:/g, '');
  const dims = SIZE_MAP[size];

  return (
    <div className={cn('group inline-flex items-center gap-2 sm:gap-3 select-none', className)}>
      <svg
        viewBox="0 0 44 44"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn(
          'shrink-0 transition-transform duration-500 ease-out group-hover:scale-[1.03]',
          responsive ? dims.iconCls : size === 'sm' ? 'w-7 h-7' : size === 'lg' ? 'w-11 h-11' : 'w-9 h-9'
        )}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`kairosAbyss-${uid}`} x1="2" y1="2" x2="42" y2="42" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0D1829" />
            <stop offset="100%" stopColor="#070C15" />
          </linearGradient>
          <linearGradient id={`kairosCobalt-${uid}`} x1="16" y1="11" x2="31" y2="33" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="50%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#2DD4BF" />
          </linearGradient>
          <linearGradient id={`kairosRim-${uid}`} x1="2" y1="2" x2="42" y2="42" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#93C5FD" stopOpacity="0.55" />
            <stop offset="50%" stopColor="#2DD4BF" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#60A5FA" stopOpacity="0.55" />
          </linearGradient>
        </defs>

        {/* Base squircle en Azul Abisal */}
        <rect
          x="2"
          y="2"
          width="40"
          height="40"
          rx="12"
          fill={`url(#kairosAbyss-${uid})`}
          stroke={`url(#kairosRim-${uid})`}
          strokeWidth="1"
        />

        {/* Anillo de calibración de precisión con rotación suave al hover */}
        <g
          style={{ transformOrigin: '22px 22px' }}
          className="transition-transform duration-700 ease-out group-hover:rotate-[12deg]"
        >
          <circle
            cx="22"
            cy="22"
            r="15.5"
            stroke="#60A5FA"
            strokeOpacity="0.26"
            strokeWidth="0.75"
            strokeDasharray="2 3.5"
          />
          <circle cx="22" cy="6.5" r="1" fill="#38BDF8" fillOpacity="0.85" />
          <circle cx="22" cy="37.5" r="0.9" fill="#2DD4BF" fillOpacity="0.65" />
        </g>

        {/* Eje vertical arquitectónico del monograma K */}
        <path
          d="M15.25 13V31"
          stroke="#F8FAFC"
          strokeWidth="2.15"
          strokeLinecap="round"
        />

        {/* Brazo superior de precisión en Cobalto → Mineral Teal */}
        <path
          d="M28.5 13.5L17.6 22.1"
          stroke={`url(#kairosCobalt-${uid})`}
          strokeWidth="2.2"
          strokeLinecap="round"
        />

        {/* Contra-diagonal inferior */}
        <path
          d="M20.2 20.4L28.8 30.5"
          stroke="#E2E8F0"
          strokeOpacity="0.92"
          strokeWidth="1.95"
          strokeLinecap="round"
        />

        {/* Nodo focal cinético */}
        <circle cx="17.6" cy="22.1" r="1.85" fill="#2DD4BF" />
      </svg>

      {showWordmark && (
        <div className={cn('flex flex-col leading-none', compactOnMobile && 'hidden sm:flex')}>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span
              className={cn(
                'font-semibold tracking-[0.2em] transition-colors',
                darkSurface ? 'text-[#F8FAFC]' : 'text-foreground',
                dims.title,
                wordmarkClassName
              )}
            >
              KAIROS
            </span>
            <span
              className={cn(
                'h-3 sm:h-3.5 w-px',
                darkSurface ? 'bg-white/20' : 'bg-border/90'
              )}
              aria-hidden="true"
            />
            <span
              className={cn(
                'font-mono font-medium tracking-[0.22em] uppercase',
                darkSurface ? 'text-[#38BDF8]' : 'text-[#1261E0]',
                dims.badge
              )}
            >
              ERP
            </span>
          </div>
          {subtitle && (
            <span
              className={cn(
                'hidden sm:block text-[10px] font-medium tracking-[0.05em] mt-1',
                darkSurface ? 'text-slate-400' : 'text-muted-foreground'
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
          'shrink-0 overflow-hidden border border-border/70 bg-card flex items-center justify-center p-0.5 shadow-2xs',
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
      : name.slice(0, 2).toUpperCase() || 'KE';

  return (
    <div
      className={cn(
        'shrink-0 flex items-center justify-center font-mono font-semibold tracking-wider border shadow-2xs',
        isDemo
          ? 'bg-[#1261E0]/10 text-[#0F4FB8] border-[#1261E0]/25'
          : 'bg-[#0D1829] text-[#38BDF8] border-[#38BDF8]/25',
        boxClass,
        className
      )}
      title={name}
    >
      {initials}
    </div>
  );
}
