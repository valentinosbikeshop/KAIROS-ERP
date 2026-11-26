import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import type { NextRequest } from 'next/server';
import type { Database, IndustryType, Organization, Profile } from '@/types/database';

const VALID_DEMO_INDUSTRIES = new Set<IndustryType>([
  'eventos_banqueteria',
  'marketing_audiovisual',
  'construccion_arquitectura',
  'catering_foodservice',
  'ferias_stands_b2b',
  'maestranza_muebles',
  'ingenieria_hvac',
  'consultoria_juridico',
  'turismo_mice',
]);

const DEMO_ORG_LABELS: Record<IndustryType, { name: string; slug: string; email: string }> = {
  eventos_banqueteria: {
    name: 'Productora Horizonte (Demo)',
    slug: 'eventos-horizonte-demo',
    email: 'contacto@eventos-demo.cl',
  },
  marketing_audiovisual: {
    name: 'Estudio Vértice Creative (Demo)',
    slug: 'vertice-creative-demo',
    email: 'contacto@vertice-demo.cl',
  },
  construccion_arquitectura: {
    name: 'Constructora Cordillera (Demo)',
    slug: 'constructora-cordillera-demo',
    email: 'contacto@cordillera-demo.cl',
  },
  catering_foodservice: {
    name: 'Atelier Gastronómico Sur (Demo)',
    slug: 'atelier-gastronomico-demo',
    email: 'contacto@atelier-demo.cl',
  },
  ferias_stands_b2b: {
    name: 'ExpoStand Arquitectura (Demo)',
    slug: 'expostand-b2b-demo',
    email: 'contacto@expostand-demo.cl',
  },
  maestranza_muebles: {
    name: 'Maestranza Austral (Demo)',
    slug: 'maestranza-austral-demo',
    email: 'contacto@maestranza-demo.cl',
  },
  ingenieria_hvac: {
    name: 'TermoClima Ingeniería (Demo)',
    slug: 'termoclima-hvac-demo',
    email: 'contacto@termoclima-demo.cl',
  },
  consultoria_juridico: {
    name: 'B&R Consultores (Demo)',
    slug: 'br-consultores-demo',
    email: 'contacto@consultores-demo.cl',
  },
  turismo_mice: {
    name: 'Andes MICE & Travel (Demo)',
    slug: 'andes-mice-demo',
    email: 'contacto@andesmice-demo.cl',
  },
};

function resolveDemoIndustryFromRequest(req: NextRequest): IndustryType {
  const raw =
    req.headers.get('x-figura-demo-industry')?.trim() ||
    req.cookies.get('figura_demo_industry')?.value?.trim() ||
    '';
  if (VALID_DEMO_INDUSTRIES.has(raw as IndustryType)) {
    return raw as IndustryType;
  }
  return 'eventos_banqueteria';
}

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
        const demoIndustry = resolveDemoIndustryFromRequest(req);
        const demoMeta = DEMO_ORG_LABELS[demoIndustry];
        return {
          userId: demoUserId,
          email: 'visitante@figura-sandbox.cl',
          profile: {
            id: demoUserId,
            email: 'visitante@figura-sandbox.cl',
            role: 'admin',
            status: 'active',
            organization_id: demoOrgId,
            is_super_admin: false,
            full_name: 'Visitante Demo',
            created_at: new Date().toISOString(),
          },
          organization: {
            id: demoOrgId,
            name: demoMeta.name,
            slug: demoMeta.slug,
            invite_code: 'FIGURA-DEMO-2026',
            legal_name: demoMeta.name,
            rut: '76.890.123-4',
            subtitle: 'SANDBOX LOCAL',
            location: 'Santiago, Chile',
            contact_email: demoMeta.email,
            contact_phone: '+56 9 8420 1190',
            bank_info: {
              __saas_config: {
                industry_type: demoIndustry,
                theme_preset: 'obsidian_gold',
                operation_mode: 'project',
                onboarding_completed: true,
                is_exempt: false,
                subscription_tier: 'growth',
                subscription_status: 'active',
                selected_modules: [
                  'mod_pdf_quotes',
                  'mod_transactions_sii',
                  'mod_consolidation_retail',
                  'mod_ai_suite',
                  'mod_analytics_excel',
                ],
                current_period_start: null,
                current_period_end: null,
                ai_calls_used: 0,
                ai_calls_reset_at: new Date().toISOString(),
              },
            },
            industry_type: demoIndustry,
            subscription_tier: 'growth',
            subscription_status: 'active',
            is_demo: true,
            is_active: true,
            max_demo_events: 10,
            max_demo_costs: 25,
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
