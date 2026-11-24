'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

export type TourPlacement = 'top' | 'bottom' | 'left' | 'right';

export interface TourStep {
  id: string;
  targetSelector: string;
  title: string;
  message: string;
  placement: TourPlacement;
  requireAction?: boolean;
  actionLabel?: string;
}

export const KAIROS_TOUR_STORAGE_KEY = 'kairos_tour_completed';

export const DEFAULT_KAIROS_TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome-ebitda',
    targetSelector: '[data-tour-id="kpi-ebitda"]',
    title: 'Control Financiero y Margen Real',
    message:
      'Bienvenido a KAIROS ERP. Aquí monitorea sus ingresos proyectados, costos operativos y utilidad neta en tiempo real, descontando el IVA Crédito recuperable.',
    placement: 'bottom',
  },
  {
    id: 'operations-grid',
    targetSelector: '[data-tour-id="inventory-grid"]',
    title: 'Operaciones y Proyectos Activos',
    message:
      'Centralice la planificación, ejecución y cierre de cada proyecto. Detecte cuellos de botella operativos antes de que afecten su flujo de caja.',
    placement: 'top',
  },
  {
    id: 'finance-rates',
    targetSelector: '[data-tour-id="quick-invoice-btn"]',
    title: 'Tarifario, Personal e IVA SII',
    message:
      'Configure costos con Factura o Boleta de Honorarios para calcular automáticamente el impacto tributario (F29) en cada cotización.',
    placement: 'left',
  },
  {
    id: 'final-aha-action',
    targetSelector: '[data-tour-id="simulate-action-btn"]',
    title: 'Su Primer Flujo Operativo',
    message:
      'Haga clic en el botón resaltado para iniciar una nueva operación o explorar el módulo en vivo y completar su recorrido.',
    placement: 'left',
    requireAction: true,
    actionLabel: 'Esperando su clic en el botón resaltado…',
  },
];

interface KairosTourContextValue {
  isActive: boolean;
  currentStepIndex: number;
  steps: TourStep[];
  isCompleted: boolean;
  isCelebrating: boolean;
  currentStep: TourStep | null;
  skipTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  restartTour: () => void;
  finishCelebration: () => void;
}

const KairosTourContext = createContext<KairosTourContextValue | null>(null);

export function KairosTourProvider({
  children,
  steps = DEFAULT_KAIROS_TOUR_STEPS,
}: {
  children: React.ReactNode;
  steps?: TourStep[];
}) {
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isCelebrating, setIsCelebrating] = useState(false);
  const hasAutoStarted = useRef(false);

  // Hydrate completion state from localStorage on client mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(KAIROS_TOUR_STORAGE_KEY) === 'true';
    setIsCompleted(stored);

    if (!stored && !hasAutoStarted.current) {
      hasAutoStarted.current = true;
      const timer = window.setTimeout(() => {
        setIsActive(true);
        setCurrentStepIndex(0);
      }, 650);
      return () => window.clearTimeout(timer);
    }
  }, []);

  const markCompleted = useCallback(() => {
    setIsCompleted(true);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(KAIROS_TOUR_STORAGE_KEY, 'true');
    }
  }, []);

  const skipTour = useCallback(() => {
    setIsActive(false);
    setIsCelebrating(false);
    markCompleted();
  }, [markCompleted]);

  const nextStep = useCallback(() => {
    setCurrentStepIndex((prev) => {
      if (prev + 1 >= steps.length) {
        setIsCelebrating(true);
        markCompleted();
        return prev;
      }
      return prev + 1;
    });
  }, [steps.length, markCompleted]);

  const prevStep = useCallback(() => {
    setCurrentStepIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const restartTour = useCallback(() => {
    setIsCelebrating(false);
    setCurrentStepIndex(0);
    setIsActive(true);
  }, []);

  const finishCelebration = useCallback(() => {
    setIsCelebrating(false);
    setIsActive(false);
  }, []);

  // Close on Escape key
  useEffect(() => {
    if (!isActive) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        skipTour();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, skipTour]);

  const currentStep = useMemo(
    () => (isActive && steps[currentStepIndex] ? steps[currentStepIndex] : null),
    [isActive, steps, currentStepIndex]
  );

  // Auto-scroll target into view and attach requireAction listener
  useEffect(() => {
    if (!isActive || !currentStep || isCelebrating) return;

    const target = document.querySelector<HTMLElement>(currentStep.targetSelector);
    if (!target) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    target.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'center',
      inline: 'nearest',
    });

    if (!currentStep.requireAction) return;

    const handleTargetInteraction = () => {
      // Small delay so native click/navigation or visual feedback registers
      window.setTimeout(() => {
        nextStep();
      }, 150);
    };

    target.addEventListener('click', handleTargetInteraction, { once: true });
    return () => {
      target.removeEventListener('click', handleTargetInteraction);
    };
  }, [isActive, currentStep, isCelebrating, nextStep]);

  const value = useMemo<KairosTourContextValue>(
    () => ({
      isActive,
      currentStepIndex,
      steps,
      isCompleted,
      isCelebrating,
      currentStep,
      skipTour,
      nextStep,
      prevStep,
      restartTour,
      finishCelebration,
    }),
    [
      isActive,
      currentStepIndex,
      steps,
      isCompleted,
      isCelebrating,
      currentStep,
      skipTour,
      nextStep,
      prevStep,
      restartTour,
      finishCelebration,
    ]
  );

  return (
    <KairosTourContext.Provider value={value}>
      {children}
    </KairosTourContext.Provider>
  );
}

export function useKairosTour(): KairosTourContextValue {
  const ctx = useContext(KairosTourContext);
  if (!ctx) {
    throw new Error('useKairosTour debe utilizarse dentro de KairosTourProvider');
  }
  return ctx;
}
