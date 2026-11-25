'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FiguraLogo } from '@/components/ui/figura-logo';
import { Loader2, ShieldCheck, LogOut } from 'lucide-react';

export default function MfaChallengePage() {
  const supabase = createClient();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.replace(/\D/g, '');
    if (cleanCode.length !== 6) {
      setError('Ingresa los 6 dígitos de tu aplicación autenticadora.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data: factorsData, error: factorsErr } = await supabase.auth.mfa.listFactors();
      if (factorsErr) throw factorsErr;

      const totpFactor = factorsData?.totp?.find((f) => f.status === 'verified');
      if (!totpFactor) {
        window.location.href = '/';
        return;
      }

      const { error: verifyErr } = await supabase.auth.mfa.challengeAndVerify({
        factorId: totpFactor.id,
        code: cleanCode,
      });

      if (verifyErr) {
        throw new Error('Código incorrecto o expirado. Intenta nuevamente.');
      }

      window.location.href = '/';
    } catch (err: any) {
      setError(err.message || 'No se pudo validar el código 2FA.');
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <Card className="w-full obsidian-glass border-white/12 text-[#EEF1F6] shadow-2xl">
      <CardHeader className="space-y-3 text-center">
        <div className="flex justify-center">
          <FiguraLogo size="md" surface="obsidian" />
        </div>
        <div className="mx-auto p-3 rounded-full bg-[#D8C39E]/12 border border-[#D8C39E]/30 text-[#D8C39E] w-fit">
          <ShieldCheck className="h-7 w-7" />
        </div>
        <CardTitle className="text-xl font-bold text-[#EEF1F6]">
          Verificación en Dos Pasos (2FA)
        </CardTitle>
        <CardDescription className="text-[#96A1B5]">
          Esta cuenta está protegida. Ingresa el código temporal de 6 dígitos generado por tu app autenticadora.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleVerify}>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 text-sm font-medium text-rose-200 bg-rose-500/15 rounded-lg border border-rose-400/30">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="mfa-code" className="text-[#EEF1F6]">Código de 6 dígitos</Label>
            <Input
              id="mfa-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="text-center font-mono text-xl tracking-[0.45em] bg-white/[0.05] border-white/15 text-[#EEF1F6] placeholder:text-[#646F84] focus-visible:ring-[#D8C39E]"
              required
              disabled={loading}
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <Button
            type="submit"
            className="w-full gap-2 bg-[#D8C39E] text-[#06070A] hover:bg-[#EDE0C8] font-semibold"
            disabled={loading}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Verificar y Acceder
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={handleSignOut}
            disabled={loading}
            className="w-full text-xs text-[#96A1B5] hover:text-[#EEF1F6] hover:bg-white/5 gap-1.5"
          >
            <LogOut className="h-3.5 w-3.5" />
            Cerrar sesión / Usar otra cuenta
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
