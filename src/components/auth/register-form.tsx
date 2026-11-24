'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
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
import { Badge } from '@/components/ui/badge';
import { KairosLogo } from '@/components/ui/kairos-logo';
import { Building2, KeyRound, Sparkles, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

type RegisterMode = 'owner' | 'invite';

const PLAN_LABELS: Record<string, string> = {
  free: 'Plan Semilla (Gratis $0)',
  essential: 'Operación Esencial',
  growth: 'Crecimiento Inteligente IA (Recomendado)',
  scale: 'Corporativo & Escala',
  custom: 'Paga lo que usas (A tu Medida)',
};

export function RegisterForm() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const urlPlan = searchParams.get('plan');
  const urlIndustry = searchParams.get('industry');
  const urlModules = searchParams.get('modules');

  const [mode, setMode] = useState<RegisterMode>('owner');
  const [companyName, setCompanyName] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (urlPlan || urlIndustry || urlModules) {
      try {
        sessionStorage.setItem(
          'kairos_preselected_onboarding',
          JSON.stringify({
            plan: urlPlan || 'free',
            industry: urlIndustry || 'eventos_banqueteria',
            modules: urlModules ? urlModules.split(',').filter(Boolean) : [],
          })
        );
      } catch {
        // Ignorar
      }
    }
  }, [urlPlan, urlIndustry, urlModules]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      setLoading(false);
      return;
    }

    try {
      if (mode === 'owner') {
        if (companyName.trim().length < 2) {
          setError('Ingresa el nombre comercial de tu empresa o negocio.');
          setLoading(false);
          return;
        }

        const res = await fetch('/api/auth/register-owner', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyName: companyName.trim(),
            fullName: fullName.trim() || undefined,
            email: email.trim(),
            password,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'No se pudo crear la empresa.');
        }

        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

        if (signInErr) {
          throw signInErr;
        }

        setSuccessMessage('Empresa creada. Preparando tu estudio de personalización...');
        window.location.href = '/onboarding';
        return;
      }

      const { error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            invite_code: inviteCode.trim().toUpperCase() || null,
          },
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      setSuccessMessage(
        'Registro exitoso. Tu cuenta quedará pendiente hasta que el administrador de tu empresa apruebe tu acceso.'
      );
      setTimeout(() => {
        window.location.href = '/';
      }, 2500);
    } catch (err: any) {
      setError(err.message || 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full glass-card border-border/80 shadow-xl animate-reveal-up">
      <CardHeader className="space-y-3 text-center pb-4">
        <div className="flex justify-center">
          <KairosLogo size="lg" />
        </div>
        <CardTitle className="sr-only">KAIROS ERP</CardTitle>
        <CardDescription className="text-muted-foreground text-sm">
          Configura tu ERP a medida en menos de 2 minutos
        </CardDescription>

        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-secondary/80 border border-border/80 mt-2">
          <button
            type="button"
            onClick={() => {
              setMode('owner');
              setError(null);
            }}
            className={cn(
              'flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all tactile-press',
              mode === 'owner'
                ? 'bg-[#4A607A] text-white shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Building2 className="h-3.5 w-3.5" />
            Crear mi Empresa
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('invite');
              setError(null);
            }}
            className={cn(
              'flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all tactile-press',
              mode === 'invite'
                ? 'bg-[#4A607A] text-white shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <KeyRound className="h-3.5 w-3.5" />
            Tengo Invitación
          </button>
        </div>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-3.5">
          {mode === 'owner' && (
            <div className="p-3.5 rounded-2xl glass-luxury text-foreground text-xs flex items-center justify-between gap-2">
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase tracking-[0.14em] text-[#4A607A] font-semibold block">
                  Plan Preseleccionado
                </span>
                <span className="font-semibold">
                  {urlPlan ? PLAN_LABELS[urlPlan] || urlPlan : 'Elige un plan antes o durante el onboarding'}
                </span>
              </div>
              <Link href="/welcome#planes">
                <Badge className="bg-[#467366]/15 hover:bg-[#467366]/25 text-[#2E5248] border border-[#467366]/30 cursor-pointer">
                  {urlPlan ? 'Cambiar' : 'Ver Planes'}
                </Badge>
              </Link>
            </div>
          )}

          {error && (
            <div className="p-3 text-xs font-medium text-red-700 bg-red-50 rounded-lg border border-red-200">
              {error}
            </div>
          )}
          {successMessage && (
            <div className="p-3 text-xs font-medium text-emerald-800 bg-emerald-50 rounded-lg border border-emerald-200">
              {successMessage}
            </div>
          )}

          {mode === 'owner' && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="companyName">Nombre de tu Empresa / Negocio *</Label>
                <Input
                  id="companyName"
                  type="text"
                  placeholder="Ej. Constructora Andes SpA"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Tu Nombre (Opcional)</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Ej. Camila Rojas"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={loading}
                />
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email">Correo electrónico *</Label>
            <Input
              id="email"
              type="email"
              placeholder="tu@empresa.cl"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {mode === 'invite' && (
            <div className="space-y-1.5">
              <Label htmlFor="inviteCode">Código de Empresa *</Label>
              <Input
                id="inviteCode"
                type="text"
                placeholder="Ej. EMPRESA-2026"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                required
                disabled={loading}
                className="uppercase font-mono"
              />
              <p className="text-[11px] text-slate-500">
                Solicita este código al administrador de tu organización.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="password">Contraseña *</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirmar *</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>

          {mode === 'owner' && (
            <div className="p-2.5 rounded-xl bg-[#1261E0]/[0.07] border border-[#1261E0]/20 text-[11px] text-[#0F4FB8] flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-[#1261E0] shrink-0" />
              <span>
                Luego confirmarás tu rubro, personalización visual y activación con Khipu (o plan gratuito).
              </span>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col space-y-3 pt-2">
          <Button type="submit" className="w-full tactile-press font-semibold" disabled={loading}>
            {loading
              ? 'Configurando...'
              : mode === 'owner'
              ? 'Crear Cuenta y Personalizar ERP'
              : 'Enviar Solicitud de Acceso'}
          </Button>
          <div className="flex items-center justify-between w-full text-xs text-slate-500">
            <Link href="/welcome" className="inline-flex items-center gap-1 hover:text-primary transition-colors">
              <ArrowLeft className="h-3 w-3" />
              Volver a Landing
            </Link>
            <Link href="/login" className="font-medium hover:text-primary transition-colors hover:underline">
              ¿Ya tienes cuenta? Inicia sesión
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
