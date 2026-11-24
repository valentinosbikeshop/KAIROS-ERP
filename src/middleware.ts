import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { DUO_ORG_SLUG } from '@/lib/constants';

export async function middleware(request: NextRequest) {
  try {
    const { supabaseResponse, user, supabase } = await updateSession(request);
    const { pathname } = request.nextUrl;

    const isPublicRoute =
      pathname === '/login' ||
      pathname === '/register' ||
      pathname === '/welcome' ||
      pathname === '/demo';
    const isMfaRoute = pathname === '/mfa-challenge';
    const isPendingRoute = pathname === '/pending';
    const isOnboardingRoute = pathname === '/onboarding';
    const isApiRoute = pathname.startsWith('/api/');
    const isAuthCallback = pathname === '/api/auth/callback';
    const isPublicApi =
      isAuthCallback ||
      pathname === '/api/cron/keep-alive' ||
      pathname === '/api/auth/register-owner' ||
      pathname === '/api/plans' ||
      pathname === '/api/webhooks/khipu';

    if (isPublicApi) {
      return supabaseResponse;
    }

    // Check if authenticated user still needs to complete 2FA (TOTP AAL2)
    let requiresMfaVerification = false;
    if (user && Array.isArray(user.factors)) {
      const hasVerifiedMfa = user.factors.some((f: any) => f.status === 'verified');
      if (hasVerifiedMfa) {
        const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (!aalData || aalData.currentLevel !== 'aal2') {
          requiresMfaVerification = true;
        }
      }
    }

    if (isApiRoute) {
      if (!user || requiresMfaVerification) {
        return NextResponse.json(
          {
            error: requiresMfaVerification
              ? 'Se requiere verificación en dos pasos (2FA)'
              : 'No autorizado',
          },
          { status: 401 }
        );
      }
      return supabaseResponse;
    }

    if (isPublicRoute && !user) {
      return supabaseResponse;
    }

    if (!user) {
      if (pathname === '/') {
        return NextResponse.redirect(new URL('/welcome', request.url));
      }
      return NextResponse.redirect(new URL('/login', request.url));
    }

    if (requiresMfaVerification) {
      if (!isMfaRoute) {
        return NextResponse.redirect(new URL('/mfa-challenge', request.url));
      }
      return supabaseResponse;
    }

    if (isMfaRoute) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    if (pathname === '/login' || pathname === '/register') {
      return NextResponse.redirect(new URL('/', request.url));
    }

    // Check user profile status, role, organization, and onboarding state
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('status, role, is_super_admin, organization_id, organizations(*)')
      .eq('id', user.id)
      .single();

    if (!error && profile) {
      const org = (profile as any).organizations as any;
      const isSuperAdmin = Boolean((profile as any).is_super_admin);

      const isPendingOrUnassigned =
        profile.status === 'pending' ||
        !profile.organization_id ||
        (!isSuperAdmin && org && org.is_active === false);

      if (isPendingOrUnassigned && !isPendingRoute) {
        return NextResponse.redirect(new URL('/pending', request.url));
      }

      if (!isPendingOrUnassigned && isPendingRoute) {
        return NextResponse.redirect(new URL('/', request.url));
      }

      // Onboarding check (EXEMPT: DUO Producciones, Demo Sandbox, and SuperAdmin)
      const isDuo = org?.slug === DUO_ORG_SLUG || Boolean(org?.is_exempt) || Boolean(org?.bank_info?.__saas_config?.is_exempt);
      const isDemo = Boolean(org?.is_demo);
      const onboardingCompleted =
        org?.onboarding_completed !== undefined
          ? Boolean(org.onboarding_completed)
          : Boolean(org?.bank_info?.__saas_config?.onboarding_completed);

      if (!isPendingOrUnassigned && !isDuo && !isDemo && !isSuperAdmin && !onboardingCompleted) {
        if (!isOnboardingRoute && profile.role === 'admin') {
          return NextResponse.redirect(new URL('/onboarding', request.url));
        }
      }

      if (pathname.startsWith('/governance')) {
        const isNonDemoCompanyAdmin = profile.role === 'admin' && !isDemo;
        if (!isSuperAdmin && !isNonDemoCompanyAdmin) {
          return NextResponse.redirect(new URL('/', request.url));
        }
      }
    }

    return supabaseResponse;
  } catch (error) {
    console.error('Middleware error:', error);
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
