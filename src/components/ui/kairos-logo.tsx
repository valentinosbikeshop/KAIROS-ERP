'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface KairosLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showWordmark?: boolean;
  subtitle?: string;
  className?: string;
  wordmarkClassName?: string;
}

const SIZE_MAP = {
  sm: { icon: 28, title: 'text-sm', badge: 'text-[9px]' },
  md: { icon: 36, title: 'text-base', badge: 'text-[10px]' },
  lg: { icon: 46, title: 'text-xl', badge: 'text-[11px]' },
};

export function KairosLogo({
  size = 'md',
  showWordmark = true,
  subtitle,
  className,
  wordmarkClassName,
}: KairosLogoProps) {
  const uid = React.useId().replace(/:/g, '');
  const dims = SIZE_MAP[size];

  return (
    <div className={cn('group inline-flex items-center gap-3 select-none', className)}>
      <svg
        width={dims.icon}
        height={dims.icon}
        viewBox="0 0 44 44"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`kairosObsidian-${uid}`} x1="4" y1="4" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1B1B19" />
            <stop offset="100%" stopColor="#0E0E0D" />
          </linearGradient>
          <linearGradient id={`kairosChampagne-${uid}`} x1="16" y1="11" x2="31" y2="33" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#D7BE96" />
            <stop offset="55%" stopColor="#9A7B4F" />
            <stop offset="100%" stopColor="#7C613B" />
          </linearGradient>
          <linearGradient id={`kairosRing-${uid}`} x1="2" y1="2" x2="42" y2="42" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#C9AD82" stopOpacity="0.65" />
            <stop offset="50%" stopColor="#9A7B4F" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#C9AD82" stopOpacity="0.65" />
          </linearGradient>
        </defs>

        {/* Base architectural medallion */}
        <rect
          x="2"
          y="2"
          width="40"
          height="40"
          rx="12"
          fill={`url(#kairosObsidian-${uid})`}
          stroke={`url(#kairosRing-${uid})`}
          strokeWidth="1"
        />

        {/* Rotating precision astrolabe calibration ring */}
        <g
          style={{ transformOrigin: '22px 22px' }}
          className="transition-transform duration-700 ease-out group-hover:rotate-[15deg]"
        >
          <circle
            cx="22"
            cy="22"
            r="15.5"
            stroke="#9A7B4F"
            strokeOpacity="0.28"
            strokeWidth="0.75"
            strokeDasharray="2.5 3.5"
          />
          <circle cx="22" cy="6.5" r="0.9" fill="#C9AD82" fillOpacity="0.75" />
          <circle cx="22" cy="37.5" r="0.9" fill="#C9AD82" fillOpacity="0.45" />
        </g>

        {/* Monogram K: Vertical architectural pillar */}
        <path
          d="M15.25 13V31"
          stroke="#F7F5F0"
          strokeWidth="2.1"
          strokeLinecap="round"
        />

        {/* Monogram K: Upper gnomon vector in brushed champagne */}
        <path
          d="M28.5 13.5L17.6 22.1"
          stroke={`url(#kairosChampagne-${uid})`}
          strokeWidth="2.1"
          strokeLinecap="round"
        />

        {/* Monogram K: Lower precision counter-diagonal */}
        <path
          d="M20.2 20.4L28.8 30.5"
          stroke="#E7E2D8"
          strokeOpacity="0.9"
          strokeWidth="1.9"
          strokeLinecap="round"
        />

        {/* Nexus focal point */}
        <circle cx="17.6" cy="22.1" r="1.75" fill="#C9AD82" />
      </svg>

      {showWordmark && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'font-semibold tracking-[0.22em] text-foreground transition-colors',
                dims.title,
                wordmarkClassName
              )}
            >
              KAIROS
            </span>
            <span className="h-3.5 w-px bg-border/80" aria-hidden="true" />
            <span
              className={cn(
                'font-mono font-medium tracking-[0.24em] uppercase text-[#9A7B4F]',
                dims.badge
              )}
            >
              ERP
            </span>
          </div>
          {subtitle && (
            <span className="text-[10px] font-medium text-muted-foreground tracking-[0.06em] mt-1">
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
          ? 'bg-[#9A7B4F]/12 text-[#85673E] border-[#9A7B4F]/30'
          : 'bg-[#171715] text-[#C9AD82] border-[#9A7B4F]/30',
        boxClass,
        className
      )}
      title={name}
    >
      {initials}
    </div>
  );
}
