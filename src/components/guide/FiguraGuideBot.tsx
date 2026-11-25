'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  Compass,
  Crosshair,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFiguraTour, TourPlacement } from './FiguraTourProvider';
import { SpotlightOverlay, SpotlightRect, getRootZoom } from './SpotlightOverlay';
import { useUser } from '@/hooks/use-user';

type MascotMood = 'greeting' | 'explaining' | 'celebrating';

function FiguraMascot({ mood }: { mood: MascotMood }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#141925] via-[#0B0E15] to-[#06070A] border border-[#D8C39E]/45 shadow-md"
      animate={
        shouldReduceMotion
          ? undefined
          : mood === 'greeting'
          ? { rotate: [0, -5, 5, -2, 0], scale: [1, 1.04, 1] }
          : mood === 'celebrating'
          ? { y: [0, -4, 0], scale: [1, 1.06, 1] }
          : { y: [0, -2, 0] }
      }
      transition={{
        duration: mood === 'greeting' ? 1.2 : 2.2,
        repeat: mood === 'celebrating' ? 2 : Infinity,
        ease: 'easeInOut',
      }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 36 36" className="h-6 w-6" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect
          x="4"
          y="7"
          width="28"
          height="22"
          rx="8"
          className="fill-[#0B0E15] stroke-[#D8C39E]"
          strokeWidth="1.8"
        />
        {mood === 'celebrating' ? (
          <>
            <path d="M11 17C12 15 14 15 15 17" stroke="#EDE0C8" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M21 17C22 15 24 15 25 17" stroke="#EDE0C8" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M14 21.5C15.5 23.5 20.5 23.5 22 21.5" stroke="#4FA88B" strokeWidth="2" strokeLinecap="round" />
          </>
        ) : mood === 'greeting' ? (
          <>
            <circle cx="13" cy="17" r="2.2" fill="#D8C39E" />
            <circle cx="23" cy="17" r="2.2" fill="#D8C39E" />
            <path d="M14.5 22C16 23.2 20 23.2 21.5 22" stroke="#D8C39E" strokeWidth="2" strokeLinecap="round" />
          </>
        ) : (
          <>
            <rect x="11" y="15.5" width="4" height="3" rx="1.5" fill="#5E89E8" />
            <rect x="21" y="15.5" width="4" height="3" rx="1.5" fill="#5E89E8" />
            <path d="M15 22H21" stroke="#96A1B5" strokeWidth="2" strokeLinecap="round" />
          </>
        )}
      </svg>

      <span
        className={`absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-[#06070A] ${
          mood === 'celebrating'
            ? 'bg-[#4FA88B]'
            : mood === 'greeting'
            ? 'bg-[#D8C39E]'
            : 'bg-[#5E89E8]'
        }`}
      />
    </motion.div>
  );
}

const POPOVER_WIDTH = 368;
const VIEWPORT_MARGIN = 16;
const GAP = 14;

function computePopoverPosition(
  rect: SpotlightRect | null,
  preferred: TourPlacement,
  cardHeight: number
): { top: number; left: number; placement: TourPlacement } {
  if (typeof window === 'undefined') {
    return { top: 120, left: 24, placement: 'bottom' };
  }

  const z = getRootZoom();
  const vw = rect?.vw ?? window.innerWidth / z;
  const vh = rect?.vh ?? window.innerHeight / z;
  const cardWidth = Math.min(POPOVER_WIDTH, vw - VIEWPORT_MARGIN * 2);

  if (!rect || !rect.isInViewport) {
    return {
      top: Math.max(VIEWPORT_MARGIN, vh - cardHeight - VIEWPORT_MARGIN * 1.5),
      left: Math.max(VIEWPORT_MARGIN, vw - cardWidth - VIEWPORT_MARGIN * 1.5),
      placement: 'bottom',
    };
  }

  const spaceBottom = vh - (rect.top + rect.height + GAP) - VIEWPORT_MARGIN;
  const spaceTop = rect.top - GAP - VIEWPORT_MARGIN;
  const spaceRight = vw - (rect.left + rect.width + GAP) - VIEWPORT_MARGIN;
  const spaceLeft = rect.left - GAP - VIEWPORT_MARGIN;

  const fits: Record<TourPlacement, boolean> = {
    bottom: spaceBottom >= cardHeight,
    top: spaceTop >= cardHeight,
    right: spaceRight >= cardWidth,
    left: spaceLeft >= cardWidth,
  };

  const order: TourPlacement[] = [preferred, 'bottom', 'top', 'left', 'right'];
  let chosen = order.find((p) => fits[p]);

  if (!chosen) {
    const candidates: Array<{ p: TourPlacement; ratio: number }> = [
      { p: 'bottom', ratio: spaceBottom / Math.max(1, cardHeight) },
      { p: 'top', ratio: spaceTop / Math.max(1, cardHeight) },
      { p: 'left', ratio: spaceLeft / Math.max(1, cardWidth) },
      { p: 'right', ratio: spaceRight / Math.max(1, cardWidth) },
    ];
    candidates.sort((a, b) => b.ratio - a.ratio);
    chosen = candidates[0].p;
  }

  let top = VIEWPORT_MARGIN;
  let left = VIEWPORT_MARGIN;

  if (chosen === 'bottom') {
    top = rect.top + rect.height + GAP;
    left = rect.left + rect.width / 2 - cardWidth / 2;
  } else if (chosen === 'top') {
    top = rect.top - cardHeight - GAP;
    left = rect.left + rect.width / 2 - cardWidth / 2;
  } else if (chosen === 'right') {
    top = rect.top + rect.height / 2 - cardHeight / 2;
    left = rect.left + rect.width + GAP;
  } else {
    top = rect.top + rect.height / 2 - cardHeight / 2;
    left = rect.left - cardWidth - GAP;
  }

  top = Math.max(VIEWPORT_MARGIN, Math.min(top, vh - cardHeight - VIEWPORT_MARGIN));
  left = Math.max(VIEWPORT_MARGIN, Math.min(left, vw - cardWidth - VIEWPORT_MARGIN));

  return { top, left, placement: chosen };
}

export function FiguraGuideBot() {
  const { isDemo } = useUser();
  const {
    isActive,
    currentStepIndex,
    steps,
    isCelebrating,
    currentStep,
    sectionLabel,
    nextSection,
    skipTour,
    nextStep,
    prevStep,
    restartTour,
    finishCelebration,
    goToNextSection,
    centerCurrentTarget,
  } = useFiguraTour();

  const shouldReduceMotion = useReducedMotion();
  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(null);
  const cardRef = useRef<HTMLElement | null>(null);
  const [cardHeight, setCardHeight] = useState(240);

  const handleRectChange = useCallback((rect: SpotlightRect | null) => {
    setSpotlightRect(rect);
  }, []);

  useEffect(() => {
    if (!cardRef.current || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.height > 0) {
          setCardHeight(entry.contentRect.height + 34);
        }
      }
    });
    ro.observe(cardRef.current);
    return () => ro.disconnect();
  }, [isActive, isCelebrating, currentStepIndex]);

  useEffect(() => {
    if (!isCelebrating || shouldReduceMotion) return;
    try {
      confetti({
        particleCount: 55,
        spread: 65,
        origin: { y: 0.65 },
        colors: ['#D8C39E', '#4FA88B', '#5E89E8', '#EDE0C8'],
        disableForReducedMotion: true,
      });
    } catch {
      // Ignore confetti errors
    }
  }, [isCelebrating, shouldReduceMotion]);

  const mood: MascotMood = useMemo(() => {
    if (isCelebrating) return 'celebrating';
    if (currentStepIndex === 0) return 'greeting';
    return 'explaining';
  }, [isCelebrating, currentStepIndex]);

  const position = useMemo(() => {
    if (isCelebrating) {
      return computePopoverPosition(null, 'bottom', cardHeight);
    }
    return computePopoverPosition(
      spotlightRect,
      currentStep?.placement ?? 'bottom',
      cardHeight
    );
  }, [isCelebrating, spotlightRect, currentStep?.placement, cardHeight]);

  const progressPercent = useMemo(() => {
    if (isCelebrating) return 100;
    return Math.round(((currentStepIndex + 1) / Math.max(1, steps.length)) * 100);
  }, [isCelebrating, currentStepIndex, steps.length]);

  if (!isActive) {
    if (!isDemo) return null;
    return (
      <button
        type="button"
        onClick={restartTour}
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-[#0B0E15] text-[#EEF1F6] px-4 py-2.5 text-xs font-semibold shadow-lg border border-[#D8C39E]/35 hover:border-[#D8C39E]/70 transition-colors tactile-press"
      >
        <Compass className="h-4 w-4 text-[#D8C39E]" />
        Bot Guía Demo · {sectionLabel}
      </button>
    );
  }

  return (
    <>
      <SpotlightOverlay
        targetSelector={currentStep?.targetSelector ?? ''}
        isActive={isActive && !isCelebrating && Boolean(currentStep)}
        onRectChange={handleRectChange}
      />

      <AnimatePresence mode="wait">
        <motion.aside
          ref={cardRef}
          key={isCelebrating ? 'figura-celebration' : `figura-guide-${currentStep?.id || currentStepIndex}`}
          role="dialog"
          aria-modal="false"
          aria-label={
            isCelebrating
              ? 'Recorrido completado en FIGURA'
              : currentStep?.title || 'Guía Interactiva FIGURA'
          }
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
          animate={{
            opacity: 1,
            scale: 1,
            top: position.top,
            left: position.left,
          }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
          transition={
            shouldReduceMotion
              ? { duration: 0.12 }
              : { type: 'spring', stiffness: 280, damping: 26 }
          }
          className="fixed z-[100] w-[calc(100vw-2rem)] max-w-[368px] rounded-2xl border border-slate-200/95 bg-white/95 text-slate-900 shadow-[0_22px_55px_rgba(15,23,42,0.22)] backdrop-blur-xl p-4"
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#0B0E15]/8 px-2.5 py-0.5 text-[11px] font-semibold text-[#1E293B] border border-[#D8C39E]/45">
                <Sparkles className="h-3 w-3 text-[#9A8460]" />
                {isCelebrating
                  ? '¡Sección lista!'
                  : `${sectionLabel} · ${currentStepIndex + 1}/${steps.length}`}
              </span>
              {spotlightRect && !spotlightRect.isInViewport && !isCelebrating && (
                <button
                  type="button"
                  onClick={centerCurrentTarget}
                  className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-800 hover:bg-amber-100"
                >
                  <Crosshair className="h-3 w-3" />
                  Centrar
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={skipTour}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4A607A]"
            >
              Cerrar
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden mb-3.5">
            <motion.div
              className="h-full bg-gradient-to-r from-[#0B0E15] via-[#9A8460] to-[#4FA88B]"
              initial={false}
              animate={{ width: `${progressPercent}%` }}
              transition={
                shouldReduceMotion
                  ? { duration: 0 }
                  : { type: 'spring', stiffness: 220, damping: 26 }
              }
            />
          </div>

          {isCelebrating ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <FiguraMascot mood="celebrating" />
                <div>
                  <h3 className="text-base font-semibold text-slate-900 flex items-center gap-1.5">
                    <Trophy className="h-4 w-4 text-[#4FA88B]" />
                    ¡Domina {sectionLabel}!
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    Ya conoce las herramientas clave de esta vista. Puede continuar el recorrido en el siguiente módulo o activar su cuenta empresarial.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                {nextSection ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={goToNextSection}
                    className="gap-1.5 text-xs font-semibold border-slate-300 text-slate-800 hover:bg-slate-100"
                  >
                    {nextSection.label}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={finishCelebration}
                    className="text-xs text-slate-600"
                  >
                    Seguir explorando
                  </Button>
                )}

                <Link href="/welcome#planes" onClick={finishCelebration}>
                  <Button
                    type="button"
                    size="sm"
                    className="gap-1.5 bg-[#0B0E15] text-[#EDE0C8] hover:bg-[#161C2A] font-semibold text-xs shadow-sm"
                  >
                    Elegir Plan
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            currentStep && (
              <div className="space-y-3.5">
                <div className="flex items-start gap-3">
                  <FiguraMascot mood={mood} />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-slate-900 leading-snug">
                      {currentStep.title}
                    </h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                      {currentStep.message}
                    </p>
                  </div>
                </div>

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
                    <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-800">
                      <MousePointerClick className="h-3.5 w-3.5 animate-pulse" />
                      <span>{currentStep.actionLabel || 'Interactúe para continuar'}</span>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      onClick={nextStep}
                      className="h-8 px-3.5 text-xs bg-[#0B0E15] text-[#EDE0C8] hover:bg-[#161C2A] font-semibold shadow-sm"
                    >
                      {currentStepIndex + 1 === steps.length ? 'Finalizar sección' : 'Siguiente'}
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
