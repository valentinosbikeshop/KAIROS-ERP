import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import type { NextRequest } from 'next/server';
import type { Database, Organization, Profile } from '@/types/database';

/**
 * Creates a privileged Supabase Admin client using SUPABASE_SERVICE_ROLE_KEY.
 * MUST ONLY BE CALLED ON THE SERVER (Route Handlers / Server Actions).
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el servidor.'
    );
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export interface AuthenticatedContext {
  userId: string;
  email: string;
  profile: Profile | null;
  organization: Organization | null;
}

/**
 * Extracts and validates the authenticated user, their profile, and their organization
 * from an incoming NextRequest without trusting any client-supplied tenant IDs.
 */
export async function getAuthenticatedContext(
  req: NextRequest,
  options: { allowLocalDemo?: boolean } = {}
): Promise<AuthenticatedContext | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) return null;

  const supabase = createServerClient<Database>(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll() {},
    },
  });

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      // Soporte para Modo Demo en Caché Local (opt-in exclusivo en endpoints de IA/OCR con mínimo privilegio)
      const isLocalDemo =
        Boolean(options.allowLocalDemo) &&
        req.cookies.get('figura_local_demo_mode')?.value === '1';
      if (isLocalDemo) {
        const demoOrgId = 'd0000000-0000-4000-8000-000000000000';
        const demoUserId = 'd0000000-0000-4000-8000-000000000099';
        return {
          userId: demoUserId,
          email: 'visitante@figura-sandbox.cl',
          profile: {
            id: demoUserId,
            email: 'visitante@figura-sandbox.cl',
            role: 'member',
            status: 'active',
            organization_id: demoOrgId,
            is_super_admin: false,
            full_name: 'Visitante Demo',
            created_at: new Date().toISOString(),
          },
          organization: {
            id: demoOrgId,
            name: 'Productora Horizonte (Demo)',
            slug: 'productora-horizonte-demo',
            invite_code: 'FIGURA-DEMO-2026',
            legal_name: 'Productora Horizonte Eventos SpA',
            rut: '76.890.123-4',
            subtitle: 'SANDBOX LOCAL',
            location: 'Santiago, Chile',
            contact_email: 'contacto@horizonte-demo.cl',
            contact_phone: '+56 9 8420 1190',
            bank_info: null,
            is_demo: true,
            is_active: true,
            max_demo_events: 8,
            max_demo_costs: 15,
            created_at: new Date().toISOString(),
          },
        };
      }
      return null;
    }

    // Enforce 2FA (AAL2) when the user has a verified MFA factor enrolled
    const hasVerifiedMfa = Boolean(user.factors?.some((f) => f.status === 'verified'));
    if (hasVerifiedMfa) {
      const { data: aalData, error: aalError } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalError || !aalData || aalData.currentLevel !== 'aal2') {
        return null;
      }
    }

    const admin = createAdminClient();
    const { data: profileData } = await admin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    const profile = (profileData as Profile | null) ?? null;

    let organization: Organization | null = null;
    if (profile?.organization_id) {
      const { data: orgData } = await admin
        .from('organizations')
        .select('*')
        .eq('id', profile.organization_id)
        .single();
      organization = (orgData as Organization | null) ?? null;
    }

    return {
      userId: user.id,
      email: user.email || '',
      profile,
      organization,
    };
  } catch (err) {
    console.error('Error getting authenticated context:', err);
    return null;
  }
}
