'use client';

import React, { useEffect, useId, useState } from 'react';

export interface SpotlightRect {
  /** Viewport-space CSS coordinates (compensated for root html zoom) */
  top: number;
  left: number;
  width: number;
  height: number;
  /** Viewport dimensions in the same CSS coordinate space */
  vw: number;
  vh: number;
  isInViewport: boolean;
}

export function getRootZoom(): number {
  if (typeof window === 'undefined') return 1;
  const raw = window.getComputedStyle(document.documentElement).zoom;
  const parsed = parseFloat(raw || '1');
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

interface SpotlightOverlayProps {
  targetSelector: string;
  isActive: boolean;
  padding?: number;
  borderRadius?: number;
  onRectChange?: (rect: SpotlightRect | null) => void;
}

export function SpotlightOverlay({
  targetSelector,
  isActive,
  padding = 8,
  borderRadius = 14,
  onRectChange,
}: SpotlightOverlayProps) {
  const maskId = useId();
  const [rect, setRect] = useState<SpotlightRect | null>(null);

  useEffect(() => {
    if (!isActive || !targetSelector) {
      setRect(null);
      onRectChange?.(null);
      return;
    }

    let rafId = 0;
    let resizeObserver: ResizeObserver | null = null;

    const updateRect = () => {
      const el = document.querySelector<HTMLElement>(targetSelector);
      if (!el) {
        setRect(null);
        onRectChange?.(null);
        return;
      }

      const z = getRootZoom();
      const domRect = el.getBoundingClientRect();
      const rawVw = window.innerWidth;
      const rawVh = window.innerHeight;
      const isInViewport =
        domRect.bottom > 0 &&
        domRect.top < rawVh &&
        domRect.right > 0 &&
        domRect.left < rawVw;

      const nextRect: SpotlightRect = {
        top: domRect.top / z - padding,
        left: domRect.left / z - padding,
        width: domRect.width / z + padding * 2,
        height: domRect.height / z + padding * 2,
        vw: rawVw / z,
        vh: rawVh / z,
        isInViewport,
      };

      setRect(nextRect);
      onRectChange?.(nextRect);
    };

    const scheduleUpdate = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updateRect);
    };

    updateRect();
    const t1 = window.setTimeout(updateRect, 120);
    const t2 = window.setTimeout(updateRect, 380);
    const t3 = window.setTimeout(updateRect, 720);

    const targetEl = document.querySelector<HTMLElement>(targetSelector);
    if (targetEl && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(scheduleUpdate);
      resizeObserver.observe(targetEl);
      resizeObserver.observe(document.body);
    }

    window.addEventListener('scroll', scheduleUpdate, true);
    window.addEventListener('resize', scheduleUpdate);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      if (rafId) cancelAnimationFrame(rafId);
      resizeObserver?.disconnect();
      window.removeEventListener('scroll', scheduleUpdate, true);
      window.removeEventListener('resize', scheduleUpdate);
    };
  }, [isActive, targetSelector, padding, onRectChange]);

  if (!isActive) return null;

  return (
    <div
      className="fixed inset-0 z-[90] pointer-events-none"
      aria-hidden="true"
    >
      <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <mask id={maskId}>
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {rect && rect.isInViewport && (
              <rect
                x={rect.left}
                y={rect.top}
                width={rect.width}
                height={rect.height}
                rx={borderRadius}
                ry={borderRadius}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          className="fill-slate-950/65"
          mask={`url(#${maskId})`}
        />
      </svg>

      {rect && rect.isInViewport && (
        <div
          className="fixed border-2 border-[#1261E0] shadow-[0_0_0_4px_rgba(18,97,224,0.22)] transition-[top,left,width,height] duration-75 ease-out pointer-events-none"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            borderRadius,
          }}
        />
      )}
    </div>
  );
}
