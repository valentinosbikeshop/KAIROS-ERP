'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import confetti from 'canvas-confetti';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  MousePointerClick,
  Sparkles,
  Trophy,
  X,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useKairosTour, TourPlacement } from './KairosTourProvider';
import { SpotlightOverlay, SpotlightRect } from './SpotlightOverlay';

type MascotMood = 'greeting' | 'explaining' | 'celebrating';

function KairosMascot({ mood }: { mood: MascotMood }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1261E0] via-[#0F4FB8] to-[#0D8A72] border border-white/60 shadow-md"
      animate={
        shouldReduceMotion
          ? undefined
          : mood === 'greeting'
          ? { rotate: [0, -8, 8, -4, 0], scale: [1, 1.05, 1] }
          : mood === 'celebrating'
          ? { y: [0, -5, 0], scale: [1, 1.08, 1] }
          : { y: [0, -2, 0] }
      }
      transition={{
        duration: mood === 'greeting' ? 1.2 : 2.2,
        repeat: mood === 'celebrating' ? 2 : Infinity,
        ease: 'easeInOut',
      }}
      aria-hidden="true"
    >
      {/* Core KAIROS Eye / Visor */}
      <svg
        viewBox="0 0 36 36"
        className="h-7 w-7"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect
          x="4"
          y="7"
          width="28"
          height="22"
          rx="8"
          className="fill-slate-950 stroke-amber-400"
          strokeWidth="2"
        />
        {mood === 'celebrating' ? (
          <>
            <path
              d="M11 17C12 15 14 15 15 17"
              stroke="#FBBF24"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <path
              d="M21 17C22 15 24 15 25 17"
              stroke="#FBBF24"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <path
              d="M14 21.5C15.5 23.5 20.5 23.5 22 21.5"
              stroke="#34D399"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </>
        ) : mood === 'greeting' ? (
          <>
            <circle cx="13" cy="17" r="2.2" fill="#FBBF24" />
            <circle cx="23" cy="17" r="2.2" fill="#FBBF24" />
            <path
              d="M14.5 22C16 23.2 20 23.2 21.5 22"
              stroke="#FBBF24"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </>
        ) : (
          <>
            <rect x="11" y="15.5" width="4" height="3" rx="1.5" fill="#38BDF8" />
            <rect x="21" y="15.5" width="4" height="3" rx="1.5" fill="#38BDF8" />
            <path
              d="M15 22H21"
              stroke="#94A3B8"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </>
        )}
      </svg>

      {/* Status indicator dot */}
      <span
        className={`absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-slate-950 ${
          mood === 'celebrating'
            ? 'bg-emerald-400'
            : mood === 'greeting'
            ? 'bg-amber-400'
            : 'bg-sky-400'
        }`}
      />
    </motion.div>
  );
}

const POPOVER_WIDTH = 360;
const POPOVER_HEIGHT_ESTIMATE = 250;
const VIEWPORT_MARGIN = 16;
const GAP = 16;

function computePopoverPosition(
  rect: SpotlightRect | null,
  preferred: TourPlacement
): { top: number; left: number } {
  if (typeof window === 'undefined') {
    return { top: 120, left: 24 };
  }

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cardWidth = Math.min(POPOVER_WIDTH, vw - VIEWPORT_MARGIN * 2);

  if (!rect) {
    return {
      top: Math.max(VIEWPORT_MARGIN, vh / 2 - POPOVER_HEIGHT_ESTIMATE / 2),
      left: Math.max(VIEWPORT_MARGIN, vw / 2 - cardWidth / 2),
    };
  }

  const fits: Record<TourPlacement, boolean> = {
    bottom: rect.top + rect.height + GAP + POPOVER_HEIGHT_ESTIMATE <= vh - VIEWPORT_MARGIN,
    top: rect.top - GAP - POPOVER_HEIGHT_ESTIMATE >= VIEWPORT_MARGIN,
    right: rect.left + rect.width + GAP + cardWidth <= vw - VIEWPORT_MARGIN,
    left: rect.left - GAP - cardWidth >= VIEWPORT_MARGIN,
  };

  const order: TourPlacement[] = [preferred, 'bottom', 'top', 'right', 'left'];
  const chosen = order.find((p) => fits[p]) ?? 'bottom';

  let top = VIEWPORT_MARGIN;
  let left = VIEWPORT_MARGIN;

  if (chosen === 'bottom') {
    top = rect.top + rect.height + GAP;
    left = rect.left + rect.width / 2 - cardWidth / 2;
  } else if (chosen === 'top') {
    top = rect.top - POPOVER_HEIGHT_ESTIMATE - GAP;
    left = rect.left + rect.width / 2 - cardWidth / 2;
  } else if (chosen === 'right') {
    top = rect.top + rect.height / 2 - POPOVER_HEIGHT_ESTIMATE / 2;
    left = rect.left + rect.width + GAP;
  } else {
    top = rect.top + rect.height / 2 - POPOVER_HEIGHT_ESTIMATE / 2;
    left = rect.left - cardWidth - GAP;
  }

  // Clamp within viewport
  top = Math.max(
    VIEWPORT_MARGIN,
    Math.min(top, vh - POPOVER_HEIGHT_ESTIMATE - VIEWPORT_MARGIN)
  );
  left = Math.max(
    VIEWPORT_MARGIN,
    Math.min(left, vw - cardWidth - VIEWPORT_MARGIN)
  );

  return { top, left };
}

export function KairosGuideBot() {
  const {
    isActive,
    currentStepIndex,
    steps,
    isCelebrating,
    currentStep,
    skipTour,
    nextStep,
    prevStep,
    finishCelebration,
  } = useKairosTour();

  const shouldReduceMotion = useReducedMotion();
  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(null);

  const handleRectChange = useCallback((rect: SpotlightRect | null) => {
    setSpotlightRect(rect);
  }, []);

  // Trigger lightweight confetti on Aha! Moment celebration
  useEffect(() => {
    if (!isCelebrating || shouldReduceMotion) return;
    try {
      confetti({
        particleCount: 55,
        spread: 65,
        origin: { y: 0.65 },
        colors: ['#fbbf24', '#38bdf8', '#34d399', '#818cf8'],
        disableForReducedMotion: true,
      });
    } catch {
      // Ignore confetti errors in headless/restricted environments
    }
  }, [isCelebrating, shouldReduceMotion]);

  const mood: MascotMood = useMemo(() => {
    if (isCelebrating) return 'celebrating';
    if (currentStepIndex === 0) return 'greeting';
    return 'explaining';
  }, [isCelebrating, currentStepIndex]);

  const position = useMemo(() => {
    if (isCelebrating) {
      return computePopoverPosition(null, 'bottom');
    }
    return computePopoverPosition(
      spotlightRect,
      currentStep?.placement ?? 'bottom'
    );
  }, [isCelebrating, spotlightRect, currentStep?.placement]);

  const progressPercent = useMemo(() => {
    if (isCelebrating) return 100;
    return Math.round(((currentStepIndex + 1) / Math.max(1, steps.length)) * 100);
  }, [isCelebrating, currentStepIndex, steps.length]);

  if (!isActive) return null;

  return (
    <>
      <SpotlightOverlay
        targetSelector={currentStep?.targetSelector ?? ''}
        isActive={isActive && !isCelebrating && Boolean(currentStep)}
        onRectChange={handleRectChange}
      />

      <AnimatePresence mode="wait">
        <motion.aside
          key={isCelebrating ? 'kairos-celebration' : 'kairos-guide-popover'}
          role="dialog"
          aria-modal="false"
          aria-label={
            isCelebrating
              ? 'Recorrido completado en KAIROS ERP'
              : currentStep?.title || 'Guía Interactiva KAIROS ERP'
          }
          layout={!shouldReduceMotion}
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
          animate={{
            opacity: 1,
            scale: 1,
            top: position.top,
            left: position.left,
          }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
          transition={
            shouldReduceMotion
              ? { duration: 0.12 }
              : { type: 'spring', stiffness: 260, damping: 24 }
          }
          className="fixed z-[100] w-[calc(100vw-2rem)] max-w-[360px] rounded-2xl border border-slate-200/90 bg-white/95 text-slate-900 shadow-[0_20px_50px_rgba(15,23,42,0.18)] backdrop-blur-xl p-4"
        >
          {/* Top Progress & Skip Bar */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#1261E0]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#1261E0] border border-[#1261E0]/20">
                <Sparkles className="h-3 w-3" />
                {isCelebrating
                  ? '¡Completado!'
                  : `Paso ${currentStepIndex + 1} de ${steps.length}`}
              </span>
            </div>
            <button
              type="button"
              onClick={skipTour}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1261E0]"
            >
              Omitir tour
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Gamified Progress Track */}
          <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden mb-4">
            <motion.div
              className="h-full bg-gradient-to-r from-[#1261E0] via-[#0284C7] to-[#0D8A72]"
              initial={false}
              animate={{ width: `${progressPercent}%` }}
              transition={
                shouldReduceMotion
                  ? { duration: 0 }
                  : { type: 'spring', stiffness: 220, damping: 26 }
              }
            />
          </div>

          {/* Mascot + Speech Content */}
          {isCelebrating ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <KairosMascot mood="celebrating" />
                <div>
                  <h3 className="text-base font-semibold text-slate-900 flex items-center gap-1.5">
                    <Trophy className="h-4 w-4 text-[#0D8A72]" />
                    ¡Listo! Ya domina KAIROS ERP
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    Ha completado el flujo central: control financiero, operaciones y
                    cálculo tributario SII en tiempo real.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={finishCelebration}
                  className="text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                >
                  Seguir explorando
                </Button>
                <Link href="/register" onClick={finishCelebration}>
                  <Button
                    type="button"
                    size="sm"
                    className="gap-1.5 bg-[#1261E0] text-white hover:bg-[#0F4FB8] font-semibold text-xs shadow-sm"
                  >
                    Crear cuenta empresarial
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            currentStep && (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <KairosMascot mood={mood} />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-slate-900 leading-snug">
                      {currentStep.title}
                    </h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                      {currentStep.message}
                    </p>
                  </div>
                </div>

                {/* Action / Navigation Footer */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={prevStep}
                    disabled={currentStepIndex === 0}
                    className="h-8 px-2.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-40"
                  >
                    <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                    Anterior
                  </Button>

                  {currentStep.requireAction ? (
                    <div className="inline-flex items-center gap-1.5 rounded-lg bg-[#1261E0]/10 border border-[#1261E0]/25 px-3 py-1.5 text-xs font-medium text-[#1261E0]">
                      <MousePointerClick className="h-3.5 w-3.5 animate-pulse" />
                      <span>{currentStep.actionLabel || 'Interactúe para continuar'}</span>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      onClick={nextStep}
                      className="h-8 px-3.5 text-xs bg-[#1261E0] text-white hover:bg-[#0F4FB8] font-semibold shadow-sm"
                    >
                      {currentStepIndex + 1 === steps.length ? 'Finalizar' : 'Siguiente'}
                      <ChevronRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  )}
                </div>
              </div>
            )
          )}
        </motion.aside>
      </AnimatePresence>
    </>
  );
}
