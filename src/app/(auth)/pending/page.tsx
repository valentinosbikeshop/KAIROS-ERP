'use client';

import { useState } from 'react';
import { Clock, LogOut, Loader2 } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FiguraLogo } from '@/components/ui/figura-logo';
import { createClient } from '@/lib/supabase/client';

export default function PendingPage() {
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      window.location.href = '/login';
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <Card className="w-full obsidian-glass border-white/12 text-[#EEF1F6] shadow-2xl animate-reveal-up">
      <CardHeader className="space-y-4 text-center pb-6">
        <div className="flex justify-center">
          <FiguraLogo size="md" surface="obsidian" />
        </div>
        <div className="flex justify-center">
          <div className="rounded-full bg-[#D8C39E]/12 p-4 shadow-sm border border-[#D8C39E]/30">
            <Clock className="h-10 w-10 text-[#D8C39E] animate-pulse" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight text-[#EEF1F6]">
          Cuenta Pendiente de Aprobación
        </CardTitle>
        <CardDescription className="text-base text-[#96A1B5]">
          Tu registro ha sido recibido exitosamente. Un administrador revisará y aprobará tu cuenta pronto.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center pb-6">
        <p className="text-sm text-[#96A1B5] bg-white/[0.04] p-4 rounded-xl border border-white/10">
          Recibirás acceso al sistema una vez que tu cuenta sea activada.
        </p>
      </CardContent>
      <CardFooter className="flex justify-center pt-2">
        <Button
          type="button"
          variant="outline"
          disabled={signingOut}
          onClick={handleSignOut}
          className="w-full font-medium border-white/15 bg-white/[0.04] text-[#EEF1F6] hover:bg-white/10 gap-2"
        >
          {signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
          {signingOut ? 'Cerrando sesión...' : 'Cerrar sesión y volver al login'}
        </Button>
      </CardFooter>
    </Card>
  );
}
