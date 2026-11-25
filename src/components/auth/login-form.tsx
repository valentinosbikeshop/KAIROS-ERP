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
      <Card className="w-full glass-card border-border/80 shadow-xl">
        <CardHeader className="space-y-3 text-center">
          <div className="flex justify-center">
            <FiguraLogo size="lg" surface="light" />
          </div>
          <CardTitle className="sr-only">FIGURA</CardTitle>
          <CardDescription className="text-muted-foreground">
            Acceso privado multiempresa para arquitectura financiera, cotizaciones y control tributario
          </CardDescription>
        </CardHeader>
        {mfaFactorId ? (
          <form onSubmit={handleVerifyMfa}>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 text-sm font-medium text-red-600 bg-red-50 rounded-md border border-red-100">
                  {error}
                </div>
              )}
              <div className="p-3.5 rounded-lg bg-slate-100 border border-slate-200 text-xs text-slate-800 flex items-start gap-2.5">
                <KeyRound className="h-4 w-4 text-[#8C6F42] shrink-0 mt-0.5" />
                <span>
                  Cuenta protegida con Verificación en Dos Pasos (2FA). Ingresa el código de 6 dígitos de tu app autenticadora para <strong>{email}</strong>.
                </span>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mfaCode">Código 2FA (6 dígitos)</Label>
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
                  className="text-center font-mono text-xl tracking-[0.45em] focus-visible:ring-primary"
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-3">
              <Button type="submit" className="w-full bg-[#0F172A] text-[#EDE0C8] hover:bg-[#1E293B]" disabled={busy}>
                {loading ? 'Verificando...' : 'Confirmar Acceso'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCancelMfa}
                disabled={busy}
                className="w-full text-slate-500 gap-1.5"
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
              <div className="p-3 text-sm font-medium text-red-600 bg-red-50 rounded-md border border-red-100">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@empresa.cl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={busy}
                className="focus-visible:ring-primary"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Contraseña</Label>
                <Button
                  type="button"
                  variant="link"
                  className="px-0 h-auto text-xs"
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
                className="focus-visible:ring-primary"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full bg-[#0F172A] text-[#EDE0C8] hover:bg-[#1E293B]" disabled={busy}>
              {loading ? 'Cargando...' : 'Iniciar sesión'}
            </Button>
            <div className="flex items-center justify-between w-full text-xs text-slate-500">
              <Link href="/welcome" className="inline-flex items-center gap-1 hover:text-slate-900 transition-colors">
                <ArrowLeft className="h-3 w-3" />
                Volver a Landing
              </Link>
              <Link href="/register" className="font-medium hover:text-slate-900 transition-colors hover:underline">
                ¿No tienes cuenta? Regístrate
              </Link>
            </div>
          </CardFooter>
        </form>
        )}
      </Card>

      {/* Interactive Demo Sandbox Entry Card */}
      <Card className="w-full glass-luxury hairline-shimmer text-foreground">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8C6F42]">
                <Sparkles className="h-3.5 w-3.5" />
                Evaluación para Clientes Externos
              </div>
              <h3 className="text-base font-semibold tracking-tight text-foreground">
                Explorar Sesión de Prueba Interactiva
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Prueba FIGURA completo adaptado a cualquiera de los 9 rubros directamente en tu navegador, sin registro ni tarjeta.
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-[#8C7148]/12 border border-[#8C7148]/25 text-[#6F5835] shrink-0">
              <FlaskConical className="h-5 w-5" />
            </div>
          </div>

          <Button
            type="button"
            onClick={handleEnterDemo}
            disabled={busy}
            className="w-full font-semibold gap-2 transition-all"
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

          <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-[#2E6F5E] shrink-0" />
            Entorno sandbox 100% aislado de empresas privadas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
