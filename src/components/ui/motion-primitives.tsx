'use client';

import * as React from 'react';
import { cn, formatCLP, formatPercentage } from '@/lib/utils';

interface AnimatedNumberProps {
  value: number;
  format?: 'clp' | 'percent' | 'integer' | 'decimal';
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
}

export function AnimatedNumber({
  value,
  format = 'integer',
  prefix = '',
  suffix = '',
  duration = 680,
  className,
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = React.useState(value);
  const prevValueRef = React.useRef(value);
  const ref = React.useRef<HTMLSpanElement>(null);
  const hasAnimatedInitialRef = React.useRef(false);

  React.useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      setDisplayValue(value);
      prevValueRef.current = value;
      return;
    }

    const startVal = hasAnimatedInitialRef.current ? prevValueRef.current : 0;
    const endVal = value;
    hasAnimatedInitialRef.current = true;

    if (startVal === endVal) {
      setDisplayValue(endVal);
      return;
    }

    let frameId = 0;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (endVal - startVal) * eased;

      prevValueRef.current = current;
      setDisplayValue(current);

      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      } else {
        setDisplayValue(endVal);
        prevValueRef.current = endVal;
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [value, duration]);

  const formatted = React.useMemo(() => {
    if (format === 'clp') return formatCLP(Math.round(displayValue));
    if (format === 'percent') return formatPercentage(displayValue);
    if (format === 'decimal') return displayValue.toFixed(1);
    return Math.round(displayValue).toLocaleString('es-CL');
  }, [displayValue, format]);

  return (
    <span ref={ref} className={cn('tabular-nums', className)}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

interface RevealProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

export function Reveal({ children, delay = 0, className }: RevealProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -24px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn(
        'transition-all duration-700 ease-out will-change-transform',
        visible
          ? 'opacity-100 translate-y-0 blur-0'
          : 'opacity-0 translate-y-4 blur-[2px]',
        className
      )}
    >
      {children}
    </div>
  );
}

interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'light' | 'obsidian' | 'obsidian-luxury';
  tilt?: boolean;
}

export function SpotlightCard({
  children,
  variant = 'light',
  tilt = false,
  className,
  onMouseMove,
  onMouseLeave,
  ...props
}: SpotlightCardProps) {
  const ref = React.useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      el.style.setProperty('--mx', `${x}px`);
      el.style.setProperty('--my', `${y}px`);

      if (tilt && typeof window !== 'undefined' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const px = (x / Math.max(1, rect.width) - 0.5) * 2;
        const py = (y / Math.max(1, rect.height) - 0.5) * 2;
        el.style.transform = `perspective(1100px) rotateX(${(-py * 1.6).toFixed(2)}deg) rotateY(${(px * 1.8).toFixed(2)}deg) translate3d(0, -1px, 0)`;
      }
    }
    onMouseMove?.(e);
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (el && tilt) {
      el.style.transform = 'perspective(1100px) rotateX(0deg) rotateY(0deg) translate3d(0, 0, 0)';
    }
    onMouseLeave?.(e);
  };

  const surfaceCls =
    variant === 'obsidian-luxury'
      ? 'obsidian-glass-luxury obsidian-spotlight'
      : variant === 'obsidian'
      ? 'obsidian-glass obsidian-spotlight'
      : 'glass-card spotlight-card';

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn(surfaceCls, 'rounded-2xl', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function ScrollProgressHairline({ className }: { className?: string }) {
  const barRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const doc = document.documentElement;
      const scrollable = Math.max(1, doc.scrollHeight - window.innerHeight);
      const ratio = Math.min(1, Math.max(0, window.scrollY / scrollable));
      if (barRef.current) {
        barRef.current.style.transform = `scaleX(${ratio})`;
      }
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className={cn('fixed top-0 left-0 right-0 z-[60] h-[2px] pointer-events-none bg-transparent', className)}
    >
      <div
        ref={barRef}
        style={{ transform: 'scaleX(0)' }}
        className="h-full w-full origin-left bg-gradient-to-r from-[#9A8460] via-[#D8C39E] to-[#EDE0C8] transition-transform duration-150 ease-out"
      />
    </div>
  );
}

interface AnimatedProgressBarProps {
  value: number; // 0-100
  barClassName?: string;
  trackClassName?: string;
}

export function AnimatedProgressBar({
  value,
  barClassName,
  trackClassName,
}: AnimatedProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className={cn('h-1.5 w-full rounded-full bg-slate-200/80 overflow-hidden', trackClassName)}>
      <div
        className={cn(
          'h-full rounded-full transition-all duration-700 ease-out bg-[#1261E0]',
          barClassName
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
