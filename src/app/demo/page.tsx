'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { enableLocalDemoMode } from '@/lib/supabase/local-demo-client';
import { INDUSTRY_BLUEPRINTS } from '@/lib/industries';
import { FiguraLogo } from '@/components/ui/figura-logo';
import type { IndustryType } from '@/types/database';

function DemoEntryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const rawIndustry = searchParams.get('industry');
    const validIndustry =
      rawIndustry && rawIndustry in INDUSTRY_BLUEPRINTS
        ? (rawIndustry as IndustryType)
        : undefined;
    enableLocalDemoMode(validIndustry);
    router.replace('/dashboard');
  }, [router, searchParams]);

  return (
    <div className="min-h-screen alabaster-canvas alabaster-grid bg-grain flex flex-col items-center justify-center p-6 gap-4">
      <div className="glass-luxury rounded-3xl p-8 flex flex-col items-center gap-4 max-w-md text-center">
        <FiguraLogo size="md" surface="light" subtitle="Preparando Entorno de Prueba Interactivo" />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-[#8C6F42]" />
          <span>Cargando catálogo, proyectos y analítica financiera de tu rubro...</span>
        </div>
      </div>
    </div>
  );
}

export default function DemoEntryRedirectPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen alabaster-canvas flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin text-[#8C6F42]" />
        </div>
      }
    >
      <DemoEntryContent />
    </Suspense>
  );
}
