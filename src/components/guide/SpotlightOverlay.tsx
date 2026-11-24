'use client';

import React, { useEffect, useId, useState } from 'react';

export interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
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
  padding = 10,
  borderRadius = 14,
  onRectChange,
}: SpotlightOverlayProps) {
  const maskId = useId();
  const [rect, setRect] = useState<SpotlightRect | null>(null);

  useEffect(() => {
    if (!isActive) {
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

      const domRect = el.getBoundingClientRect();
      const nextRect: SpotlightRect = {
        top: Math.max(0, domRect.top - padding),
        left: Math.max(0, domRect.left - padding),
        width: domRect.width + padding * 2,
        height: domRect.height + padding * 2,
      };

      setRect(nextRect);
      onRectChange?.(nextRect);
    };

    const scheduleUpdate = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updateRect);
    };

    // Initial measurement after smooth scroll settles
    updateRect();
    const settleTimer = window.setTimeout(updateRect, 350);

    const targetEl = document.querySelector<HTMLElement>(targetSelector);
    if (targetEl && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(scheduleUpdate);
      resizeObserver.observe(targetEl);
      resizeObserver.observe(document.body);
    }

    window.addEventListener('scroll', scheduleUpdate, true);
    window.addEventListener('resize', scheduleUpdate);

    return () => {
      window.clearTimeout(settleTimer);
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
      <svg
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <mask id={maskId}>
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {rect && (
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
          className="fill-slate-950/70"
          mask={`url(#${maskId})`}
        />
      </svg>

      {/* Subtle highlight ring around the spotlighted element */}
      {rect && (
        <div
          className="fixed border-2 border-[#1261E0] shadow-[0_0_0_4px_rgba(18,97,224,0.2)] transition-all duration-200 ease-out pointer-events-none"
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
