'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { enableLocalDemoMode } from '@/lib/supabase/local-demo-client';
import { INDUSTRY_BLUEPRINTS } from '@/lib/industries';
import { KairosLogo } from '@/components/ui/kairos-logo';
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
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 gap-4">
      <div className="glass-card rounded-3xl p-8 flex flex-col items-center gap-4 max-w-md text-center">
        <KairosLogo size="md" subtitle="Preparando Entorno de Prueba Interactivo" />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-[#4A607A]" />
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
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin text-[#4A607A]" />
        </div>
      }
    >
      <DemoEntryContent />
    </Suspense>
  );
}
