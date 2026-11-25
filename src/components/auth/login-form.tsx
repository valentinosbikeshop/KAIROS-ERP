'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { FlaskConical, Loader2, Sparkles, ShieldCheck, KeyRound, ArrowLeft } from 'lucide-react';
import { FiguraLogo } from '@/components/ui/figura-logo';

export function LoginForm() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        throw signInError;
      }

      const [{ data: aalData }, { data: factorsData }] = await Promise.all([
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
        supabase.auth.mfa.listFactors(),
      ]);

      if (aalData?.nextLevel === 'aal2' && aalData?.currentLevel !== 'aal2') {
        const verifiedTotp = factorsData?.totp?.find((f) => f.status === 'verified');
        if (verifiedTotp) {
          setMfaFactorId(verifiedTotp.id);
          setMfaCode('');
          return;
        }
      }

      router.push('/');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaFactorId) return;

    const cleanCode = mfaCode.replace(/\D/g, '');
    if (cleanCode.length !== 6) {
      setError('Ingresa los 6 dígitos de tu app autenticadora.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { error: mfaError } = await supabase.auth.mfa.challengeAndVerify({
        factorId: mfaFactorId,
        code: cleanCode,
      });
      if (mfaError) {
        throw new Error('Código 2FA incorrecto o expirado.');
      }

      router.push('/');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Error al validar código 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelMfa = async () => {
    await supabase.auth.signOut();
    setMfaFactorId(null);
    setMfaCode('');
    setPassword('');
    setError(null);
  };

  const handleEnterDemo = () => {
    setDemoLoading(true);
    router.push('/demo');
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError('Por favor, ingresa tu correo electrónico primero para recuperar tu contraseña.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (resetError) throw resetError;
      alert('Se han enviado las instrucciones de recuperación a tu correo.');
    } catch (err: any) {
      setError(err.message || 'Error al solicitar cambio de contraseña');
    } finally {
      setLoading(false);
    }
  };

  const busy = loading || demoLoading;

  return (
    <div className="space-y-4 w-full animate-reveal-up">
      <Card className="w-full obsidian-glass border-white/12 text-[#EEF1F6] shadow-2xl">
        <CardHeader className="space-y-3 text-center">
          <div className="flex justify-center">
            <FiguraLogo size="lg" surface="obsidian" />
          </div>
          <CardTitle className="sr-only">FIGURA</CardTitle>
          <CardDescription className="text-[#96A1B5]">
            Acceso privado multiempresa para arquitectura financiera, cotizaciones y control tributario
          </CardDescription>
        </CardHeader>
        {mfaFactorId ? (
          <form onSubmit={handleVerifyMfa}>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 text-sm font-medium text-rose-200 bg-rose-500/15 rounded-lg border border-rose-400/30">
                  {error}
                </div>
              )}
              <div className="p-3.5 rounded-xl bg-[#5E89E8]/12 border border-[#5E89E8]/30 text-xs text-[#C7D8FC] flex items-start gap-2.5">
                <KeyRound className="h-4 w-4 text-[#8FB0F7] shrink-0 mt-0.5" />
                <span>
                  Cuenta protegida con Verificación en Dos Pasos (2FA). Ingresa el código de 6 dígitos de tu app autenticadora para <strong>{email}</strong>.
                </span>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mfaCode" className="text-[#EEF1F6]">Código 2FA (6 dígitos)</Label>
                <Input
                  id="mfaCode"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  maxLength={6}
                  placeholder="000000"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  disabled={busy}
                  className="text-center font-mono text-xl tracking-[0.45em] bg-white/[0.05] border-white/15 text-[#EEF1F6] placeholder:text-[#646F84] focus-visible:ring-[#D8C39E]"
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-3">
              <Button
                type="submit"
                className="w-full bg-[#D8C39E] text-[#06070A] hover:bg-[#EDE0C8] font-semibold"
                disabled={busy}
              >
                {loading ? 'Verificando...' : 'Confirmar Acceso'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCancelMfa}
                disabled={busy}
                className="w-full text-[#96A1B5] hover:text-[#EEF1F6] hover:bg-white/5 gap-1.5"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Volver e iniciar con otra cuenta
              </Button>
            </CardFooter>
          </form>
        ) : (
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-sm font-medium text-rose-200 bg-rose-500/15 rounded-lg border border-rose-400/30">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#EEF1F6]">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@empresa.cl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={busy}
                className="bg-white/[0.05] border-white/15 text-[#EEF1F6] placeholder:text-[#646F84] focus-visible:ring-[#D8C39E]"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-[#EEF1F6]">Contraseña</Label>
                <Button
                  type="button"
                  variant="link"
                  className="px-0 h-auto text-xs text-[#D8C39E] hover:text-[#EDE0C8]"
                  onClick={handleResetPassword}
                  disabled={busy}
                >
                  ¿Olvidaste tu contraseña?
                </Button>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={busy}
                className="bg-white/[0.05] border-white/15 text-[#EEF1F6] focus-visible:ring-[#D8C39E]"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full bg-[#D8C39E] text-[#06070A] hover:bg-[#EDE0C8] font-semibold"
              disabled={busy}
            >
              {loading ? 'Cargando...' : 'Iniciar sesión'}
            </Button>
            <div className="text-sm text-center text-[#96A1B5]">
              <Link href="/register" className="font-medium hover:text-[#EDE0C8] transition-colors hover:underline">
                ¿No tienes cuenta? Regístrate
              </Link>
            </div>
          </CardFooter>
        </form>
        )}
      </Card>

      {/* Interactive Demo Sandbox Entry Card */}
      <Card className="w-full obsidian-glass-luxury obsidian-shimmer text-[#EEF1F6]">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#D8C39E]">
                <Sparkles className="h-3.5 w-3.5" />
                Evaluación para Clientes Externos
              </div>
              <h3 className="text-base font-semibold tracking-tight text-[#EEF1F6]">
                Explorar Sesión de Prueba Interactiva
              </h3>
              <p className="text-xs text-[#96A1B5] leading-relaxed">
                Prueba FIGURA completo adaptado a cualquiera de los 9 rubros directamente en tu navegador, sin registro ni tarjeta.
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-[#D8C39E]/12 border border-[#D8C39E]/30 text-[#EDE0C8] shrink-0">
              <FlaskConical className="h-5 w-5" />
            </div>
          </div>

          <Button
            type="button"
            onClick={handleEnterDemo}
            disabled={busy}
            variant="outline"
            className="w-full font-semibold gap-2 transition-all border-[#D8C39E]/35 bg-white/[0.05] text-[#EDE0C8] hover:bg-[#D8C39E] hover:text-[#06070A]"
          >
            {demoLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Preparando entorno de prueba...
              </>
            ) : (
              <>
                <FlaskConical className="h-4 w-4" />
                Entrar a Sesión de Prueba (Sin Registro)
              </>
            )}
          </Button>

          <p className="text-[11px] text-[#96A1B5] flex items-center justify-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-[#4FA88B] shrink-0" />
            Entorno sandbox 100% aislado de empresas privadas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
