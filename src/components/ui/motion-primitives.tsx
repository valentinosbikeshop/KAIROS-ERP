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
      // Cubic ease-out for crisp financial deceleration
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
}

export function SpotlightCard({ children, className, onMouseMove, ...props }: SpotlightCardProps) {
  const ref = React.useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${e.clientX - rect.left}px`);
      el.style.setProperty('--my', `${e.clientY - rect.top}px`);
    }
    onMouseMove?.(e);
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      className={cn('glass-card spotlight-card rounded-2xl', className)}
      {...props}
    >
      {children}
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
