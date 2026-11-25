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
import { usePathname, useRouter } from 'next/navigation';
import { useWorkspaceConfig } from '@/hooks/use-workspace-config';

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

export interface NextSectionLink {
  href: string;
  label: string;
}

export const KAIROS_TOUR_STORAGE_KEY = 'kairos_tour_completed';

interface KairosTourContextValue {
  isActive: boolean;
  currentStepIndex: number;
  steps: TourStep[];
  isCompleted: boolean;
  isCelebrating: boolean;
  currentStep: TourStep | null;
  sectionLabel: string;
  nextSection: NextSectionLink | null;
  skipTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  restartTour: () => void;
  finishCelebration: () => void;
  goToNextSection: () => void;
  centerCurrentTarget: () => void;
}

const KairosTourContext = createContext<KairosTourContextValue | null>(null);

export function KairosTourProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { industry, terms } = useWorkspaceConfig();

  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isCelebrating, setIsCelebrating] = useState(false);
  const hasAutoStarted = useRef(false);

  const { steps, sectionLabel, nextSection } = useMemo<{
    steps: TourStep[];
    sectionLabel: string;
    nextSection: NextSectionLink | null;
  }>(() => {
    const indName = industry.shortName;
    const projPlural = terms.projectPlural;
    const projSingular = terms.projectSingular;
    const catalogLabel = terms.catalogLabel;

    if (pathname.startsWith('/costs')) {
      return {
        sectionLabel: catalogLabel,
        nextSection: { href: '/events', label: `Explorar ${projPlural}` },
        steps: [
          {
            id: 'costs-kpis',
            targetSelector: '[data-tour-id="costs-kpis"]',
            title: `Radiografía Tributaria de ${catalogLabel}`,
            message: `Visualice al instante cuántas tarifas recuperan 19% de IVA Crédito (Facturas) versus Boletas de Honorarios y su margen promedio en ${indName}.`,
            placement: 'bottom',
          },
          {
            id: 'costs-actions',
            targetSelector: '[data-tour-id="costs-actions"]',
            title: 'Plantillas Listas y Tarifas Propias',
            message: `Cargue plantillas especializadas de ${indName} o agregue nuevos servicios y cuadrillas con cálculo automático de retención.`,
            placement: 'bottom',
          },
          {
            id: 'costs-table',
            targetSelector: '[data-tour-id="costs-table"]',
            title: 'Edición de Márgenes en Tiempo Real',
            message: 'Edite cualquier tarifa: KAIROS recalcula automáticamente el valor neto, IVA 19% y utilidad neta antes de que usted envíe una cotización.',
            placement: 'top',
          },
        ],
      };
    }

    if (pathname.startsWith('/events/')) {
      return {
        sectionLabel: `Ficha de ${projSingular}`,
        nextSection: { href: '/analytics', label: `Ver ${terms.analyticsLabel}` },
        steps: [
          {
            id: 'event-tabs',
            targetSelector: '[data-tour-id="event-tabs"]',
            title: 'Flujo Completo en 4 Pestañas',
            message: `Pase desde el Borrador de Costos (con IA y OCR) al Presupuesto Oficial, y controle Abonos vs. Gastos Reales en Finanzas.`,
            placement: 'bottom',
          },
          {
            id: 'event-pdf-actions',
            targetSelector: '[data-tour-id="event-pdf-actions"]',
            title: 'Cotización PDF y Cierre Ejecutivo',
            message: 'Genere propuestas comerciales en PDF listas para su cliente con un clic, protegiendo su rentabilidad desde el primer contacto.',
            placement: 'bottom',
          },
        ],
      };
    }

    if (pathname.startsWith('/events')) {
      return {
        sectionLabel: projPlural,
        nextSection: { href: '/analytics', label: `Ver ${terms.analyticsLabel}` },
        steps: [
          {
            id: 'events-new-btn',
            targetSelector: '[data-tour-id="events-new-btn"]',
            title: `${terms.newProjectCta} o Cotización Express`,
            message: `Cree un nuevo ${projSingular.toLowerCase()} desde cero o use las plantillas Express de ${indName} para cotizar en menos de 2 minutos.`,
            placement: 'bottom',
          },
          {
            id: 'events-filters',
            targetSelector: '[data-tour-id="events-filters"]',
            title: 'Filtros por Estado Operativo',
            message: 'Filtre rápidamente entre cotizaciones en Planificación, Aprobadas en ejecución o Cerradas para auditoría.',
            placement: 'bottom',
          },
          {
            id: 'events-grid',
            targetSelector: '[data-tour-id="events-grid"]',
            title: 'Duplica Cotizaciones en 1 Clic',
            message: `Use el ícono de copiar en cualquier tarjeta para clonar un ${projSingular.toLowerCase()} exitoso con todas sus partidas en segundos.`,
            placement: 'top',
          },
        ],
      };
    }

    if (pathname.startsWith('/analytics')) {
      return {
        sectionLabel: terms.analyticsLabel,
        nextSection: { href: '/dashboard', label: 'Volver al Dashboard' },
        steps: [
          {
            id: 'analytics-controls',
            targetSelector: '[data-tour-id="analytics-controls"]',
            title: 'Filtros de Período y Excel Contable',
            message: 'Filtre por año o mes y descargue el libro contable en Excel con desglose de ventas, costos e IVA Débito para su contador.',
            placement: 'bottom',
          },
          {
            id: 'analytics-kpis',
            targetSelector: '[data-tour-id="analytics-kpis"]',
            title: 'Indicadores P&L Consolidados',
            message: `Monitoree ingresos brutos, facturación neta, utilidad real y margen promedio frente a la meta de ${industry.targetMarginPct}% de ${indName}.`,
            placement: 'bottom',
          },
          {
            id: 'analytics-charts',
            targetSelector: '[data-tour-id="analytics-charts"]',
            title: 'Crecimiento, Caídas y Centros de Costo',
            message: 'Detecte meses peak, bajas estacionales y qué categorías consumen mayor presupuesto en su empresa.',
            placement: 'top',
          },
        ],
      };
    }

    // Default: /dashboard
    return {
      sectionLabel: 'Dashboard Ejecutivo',
      nextSection: { href: '/costs', label: `Explorar ${catalogLabel}` },
      steps: [
        {
          id: 'welcome-ebitda',
          targetSelector: '[data-tour-id="kpi-ebitda"]',
          title: `Bienvenido a KAIROS · ${indName}`,
          message: `Aquí monitorea ingresos cerrados, utilidad neta y margen real de su empresa de ${indName} en tiempo real, sin sorpresas de IVA a fin de mes.`,
          placement: 'bottom',
        },
        {
          id: 'dashboard-trend',
          targetSelector: '[data-tour-id="dashboard-trend"]',
          title: 'Evolución Mensual de Ventas y Costos',
          message: 'Visualice meses de crecimiento y caídas estacionales para anticipar su caja y ajustar precios antes de perder margen.',
          placement: 'top',
        },
        {
          id: 'demo-scenarios',
          targetSelector: '[data-tour-id="demo-scenarios"]',
          title: `Casos Reales de ${indName}`,
          message: `Explore un ${projSingular.toLowerCase()} cerrado con conciliación F29, uno con insumos prorrateados y un borrador listo para optimizar con IA.`,
          placement: 'top',
        },
        {
          id: 'demo-industry-switcher',
          targetSelector: '[data-tour-id="demo-industry-switcher"]',
          title: 'Adapte el ERP a su Rubro en Vivo',
          message: 'Puede cambiar de rubro aquí en cualquier momento para ver cómo KAIROS transforma terminología, tarifas y proyectos al instante.',
          placement: 'bottom',
        },
      ],
    };
  }, [pathname, industry, terms]);

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

  const goToNextSection = useCallback(() => {
    if (!nextSection) return;
    setIsCelebrating(false);
    setCurrentStepIndex(0);
    setIsActive(true);
    router.push(nextSection.href);
  }, [nextSection, router]);

  // Reset step index when route changes while active
  useEffect(() => {
    setCurrentStepIndex(0);
    setIsCelebrating(false);
  }, [pathname]);

  // Listen to DemoBanner or floating button 'kairos:open-guide'
  useEffect(() => {
    const handleOpenGuide = () => {
      restartTour();
    };
    window.addEventListener('kairos:open-guide', handleOpenGuide);
    return () => window.removeEventListener('kairos:open-guide', handleOpenGuide);
  }, [restartTour]);

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

  const centerCurrentTarget = useCallback(() => {
    if (!currentStep) return;
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
  }, [currentStep]);

  // Auto-scroll target into view when step changes
  useEffect(() => {
    if (!isActive || !currentStep || isCelebrating) return;
    const timer = window.setTimeout(() => {
      centerCurrentTarget();
    }, 80);

    if (!currentStep.requireAction) {
      return () => window.clearTimeout(timer);
    }

    const target = document.querySelector<HTMLElement>(currentStep.targetSelector);
    if (!target) return () => window.clearTimeout(timer);

    const handleTargetInteraction = () => {
      window.setTimeout(() => nextStep(), 150);
    };
    target.addEventListener('click', handleTargetInteraction, { once: true });
    return () => {
      window.clearTimeout(timer);
      target.removeEventListener('click', handleTargetInteraction);
    };
  }, [isActive, currentStep, isCelebrating, nextStep, centerCurrentTarget]);

  const value = useMemo<KairosTourContextValue>(
    () => ({
      isActive,
      currentStepIndex,
      steps,
      isCompleted,
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
    }),
    [
      isActive,
      currentStepIndex,
      steps,
      isCompleted,
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
