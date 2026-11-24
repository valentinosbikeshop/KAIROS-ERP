'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { enableLocalDemoMode } from '@/lib/supabase/local-demo-client';
import { KairosLogo } from '@/components/ui/kairos-logo';

export default function DemoEntryRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    enableLocalDemoMode();
    router.replace('/');
  }, [router]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 gap-4">
      <div className="glass-card rounded-3xl p-8 flex flex-col items-center gap-4 max-w-md text-center">
        <KairosLogo size="md" subtitle="Iniciando ERP Completo en Caché Local" />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-[#4A607A]" />
          <span>Cargando todos los módulos del ERP en tu navegador...</span>
        </div>
      </div>
    </div>
  );
}
