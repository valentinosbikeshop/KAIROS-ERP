-- ============================================================================
-- KAIROS ERP — Migración SaaS Multi-Rubro, Personalización & Suscripciones Khipu v3
-- 100% Idempotente y No-Destructiva.
-- Preserva intacta a DUO Producciones (is_exempt = true, onboarding_completed = true).
-- ============================================================================

-- 1. Nuevas columnas en organizations para personalización por rubro y suscripción
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS industry_type TEXT NOT NULL DEFAULT 'eventos_banqueteria',
  ADD COLUMN IF NOT EXISTS theme_preset TEXT NOT NULL DEFAULT 'obsidian_gold',
  ADD COLUMN IF NOT EXISTS operation_mode TEXT NOT NULL DEFAULT 'project',
  ADD COLUMN IF NOT EXISTS custom_terminology JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_exempt BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS selected_modules JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS khipu_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS ai_calls_used INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_calls_reset_at TIMESTAMPTZ NOT NULL DEFAULT (date_trunc('month', now()) + interval '1 month');

-- 2. Backfill seguro de organizaciones existentes
UPDATE public.organizations
SET is_exempt = true,
    onboarding_completed = true,
    subscription_tier = 'scale',
    subscription_status = 'active'
WHERE slug = 'duo-producciones';

UPDATE public.organizations
SET onboarding_completed = true
WHERE is_demo = true OR created_at < now();

-- 3. Tabla de Planes de Suscripción Mensual (Editables por SuperAdmin)
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tagline TEXT NOT NULL,
  description TEXT NOT NULL,
  price_clp INTEGER NOT NULL DEFAULT 0,
  is_recommended BOOLEAN NOT NULL DEFAULT false,
  badge_text TEXT,
  max_projects INTEGER, -- NULL = ilimitado
  max_costs INTEGER,    -- NULL = ilimitado
  max_users INTEGER,    -- NULL = ilimitado
  ai_calls_limit INTEGER NOT NULL DEFAULT 0,
  included_modules JSONB NOT NULL DEFAULT '[]'::jsonb,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscription_plans_select_all" ON public.subscription_plans;
CREATE POLICY "subscription_plans_select_all" ON public.subscription_plans
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "subscription_plans_admin_write" ON public.subscription_plans;
CREATE POLICY "subscription_plans_admin_write" ON public.subscription_plans
  FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- 4. Tabla de Módulos "Paga lo que usas" (Editables por SuperAdmin)
CREATE TABLE IF NOT EXISTS public.subscription_addons (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price_clp INTEGER NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'module', -- 'base' | 'module'
  ai_calls_bonus INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_addons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscription_addons_select_all" ON public.subscription_addons;
CREATE POLICY "subscription_addons_select_all" ON public.subscription_addons
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "subscription_addons_admin_write" ON public.subscription_addons;
CREATE POLICY "subscription_addons_admin_write" ON public.subscription_addons
  FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- 5. Tabla de Historial de Pagos & Conciliación Khipu v3 (Idempotente)
CREATE TABLE IF NOT EXISTS public.billing_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  khipu_payment_id TEXT UNIQUE,
  transaction_id TEXT UNIQUE NOT NULL,
  tier TEXT NOT NULL,
  selected_modules JSONB NOT NULL DEFAULT '[]'::jsonb,
  amount_clp INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'CLP',
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'paid' | 'failed' | 'expired'
  payment_url TEXT,
  payer_email TEXT,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  raw_webhook JSONB,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_payments_org_id ON public.billing_payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_billing_payments_status ON public.billing_payments(status);
CREATE INDEX IF NOT EXISTS idx_billing_payments_khipu_id ON public.billing_payments(khipu_payment_id);

ALTER TABLE public.billing_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "billing_payments_select" ON public.billing_payments;
CREATE POLICY "billing_payments_select" ON public.billing_payments
  FOR SELECT USING (
    organization_id = public.get_my_org_id() OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "billing_payments_insert_admin" ON public.billing_payments;
CREATE POLICY "billing_payments_insert_admin" ON public.billing_payments
  FOR INSERT WITH CHECK (
    public.is_super_admin() OR (
      organization_id = public.get_my_org_id()
      AND public.get_my_role() = 'admin'
      AND public.get_my_status() = 'active'
    )
  );

DROP POLICY IF EXISTS "billing_payments_update_super" ON public.billing_payments;
CREATE POLICY "billing_payments_update_super" ON public.billing_payments
  FOR UPDATE USING (public.is_super_admin());

-- 6. Seed Idempotente de Planes Mensuales y Módulos "Paga lo que usas"
INSERT INTO public.subscription_plans (
  id, name, tagline, description, price_clp, is_recommended, badge_text,
  max_projects, max_costs, max_users, ai_calls_limit, included_modules, features, sort_order
) VALUES
(
  'free',
  'Semilla',
  'Para validar tu estructura inicial sin costo',
  'Organiza tus primeros presupuestos con cálculo neto/IVA SII automático. Ideal para probar la plataforma antes de escalar.',
  0,
  false,
  'Gratis',
  2,
  12,
  1,
  0,
  '[]'::jsonb,
  '["Hasta 2 proyectos activos","Hasta 12 ítems en catálogo maestro","1 usuario administrador","Cálculo automático Neto, IVA 19% y Margen","Resguardo histórico garantizado (nunca pierdes datos)"]'::jsonb,
  1
),
(
  'essential',
  'Operación Esencial',
  'Cotización formal y control de flujo de caja',
  'Pensado para empresas en marcha que necesitan emitir propuestas PDF profesionales y controlar abonos y gastos reales.',
  59990,
  false,
  'Inicial',
  12,
  120,
  2,
  0,
  '["mod_pdf_quotes","mod_transactions_sii"]'::jsonb,
  '["Hasta 12 proyectos activos al mes","Hasta 120 tarifas en catálogo maestro","2 usuarios en tu espacio","Cotizador PDF comercial de alta presentación","Registro de Abonos, Gastos Reales y Boletas/Facturas"]'::jsonb,
  2
),
(
  'growth',
  'Crecimiento Inteligente IA',
  'Máximo retorno: IA + OCR + Control Total',
  'La opción más rentable: automatiza cotizaciones desde PDF/Excel/Fotos con IA, consolida recetas e insumos y domina tu P&L.',
  99990,
  true,
  'Recomendado',
  NULL,
  NULL,
  5,
  200,
  '["mod_unlimited_projects","mod_pdf_quotes","mod_transactions_sii","mod_consolidation_retail","mod_ai_suite","mod_analytics_excel"]'::jsonb,
  '["Proyectos y catálogo maestro ILIMITADOS","Hasta 5 usuarios colaboradores","Suite IA Optimizada (200 consultas/mes) + OCR Facturas/Excel","Asesor Financiero IA + Optimizador de Márgenes","Consolidación, Recetas / Prorrateo Retail y Analítica P&L + Excel F29"]'::jsonb,
  3
),
(
  'scale',
  'Corporativo & Escala',
  'Multi-equipo, marca blanca y alta demanda IA',
  'Para productoras, constructoras, consultoras y operaciones consolidadas que exigen gobernanza avanzada y equipo ilimitado.',
  179990,
  false,
  'Enterprise',
  NULL,
  NULL,
  NULL,
  600,
  '["mod_unlimited_projects","mod_pdf_quotes","mod_transactions_sii","mod_consolidation_retail","mod_ai_suite","mod_analytics_excel","mod_team_branding"]'::jsonb,
  '["Todo lo de Crecimiento Inteligente incluido","Usuarios ILIMITADOS con roles y auditoría","600 consultas de IA mensuales de alta prioridad","Marca Blanca PDF (tu logo, datos bancarios y pie legal)","Gobernanza avanzada de equipo y soporte prioritario"]'::jsonb,
  4
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.subscription_addons (
  id, name, description, price_clp, category, ai_calls_bonus, sort_order
) VALUES
(
  'base_custom',
  'Plataforma Activa Base',
  'Acceso base al ERP personalizado para tu rubro: hasta 5 proyectos activos, 50 tarifas maestras y 1 usuario.',
  29990,
  'base',
  0,
  0
),
(
  'mod_unlimited_projects',
  'Proyectos y Catálogo Ilimitados',
  'Elimina los topes de proyectos activos y tarifas maestras en tu organización.',
  19990,
  'module',
  0,
  1
),
(
  'mod_pdf_quotes',
  'Cotizador PDF Ejecutivo',
  'Genera propuestas comerciales e informes contables en PDF listos para enviar al cliente.',
  16990,
  'module',
  0,
  2
),
(
  'mod_transactions_sii',
  'Flujo de Caja, Abonos y Tributación SII',
  'Control de abonos de clientes, gastos reales rendidos, boletas de honorarios y cálculo F29.',
  14990,
  'module',
  0,
  3
),
(
  'mod_consolidation_retail',
  'Consolidación, Recetas y Modo Retail',
  'Agrupa ítems padre/hijo, prorratea insumos unitarios y gestiona venta al detalle.',
  16990,
  'module',
  0,
  4
),
(
  'mod_ai_suite',
  'Suite IA + OCR Documental (150 créditos/mes)',
  'Asistente de borradores, desglose automático de costos, optimizador de márgenes y lectura de PDF/Excel/Fotos.',
  29990,
  'module',
  150,
  5
),
(
  'mod_analytics_excel',
  'Analítica P&L & Exportación Excel Contable',
  'Dashboards de rentabilidad mensual, distribución de costos y descarga de libro Excel.',
  18990,
  'module',
  0,
  6
),
(
  'mod_team_branding',
  'Equipo Multi-Usuario & Marca Blanca',
  'Habilita hasta 8 usuarios en tu organización, códigos de invitación y personalización de marca en documentos.',
  24990,
  'module',
  0,
  7
)
ON CONFLICT (id) DO NOTHING;


-- 7. Blindaje RLS de Cuotas por Plan y Soft-Lock (PostgREST / Direct API)
CREATE OR REPLACE FUNCTION public.can_org_insert_event()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org RECORD;
  v_effective_tier TEXT;
  v_max_projects INTEGER;
  v_current_count INTEGER;
BEGIN
  SELECT * INTO v_org FROM public.organizations WHERE id = public.get_my_org_id() LIMIT 1;
  IF NOT FOUND THEN RETURN false; END IF;
  IF v_org.slug = 'duo-producciones' OR v_org.is_exempt = true THEN RETURN true; END IF;

  IF v_org.is_demo = true THEN
    SELECT count(*) INTO v_current_count FROM public.events
    WHERE organization_id = v_org.id AND is_demo_base = false;
    RETURN v_current_count < COALESCE(v_org.max_demo_events, 8);
  END IF;

  v_effective_tier := COALESCE(v_org.subscription_tier, 'free');
  IF v_effective_tier <> 'free' AND (
    v_org.subscription_status <> 'active'
    OR (v_org.current_period_end IS NOT NULL AND v_org.current_period_end < now())
  ) THEN
    v_effective_tier := 'free';
  END IF;

  IF v_effective_tier = 'custom' THEN
    IF v_org.selected_modules ? 'mod_unlimited_projects' THEN
      RETURN true;
    END IF;
    v_max_projects := 5;
  ELSE
    SELECT max_projects INTO v_max_projects FROM public.subscription_plans WHERE id = v_effective_tier LIMIT 1;
    IF v_max_projects IS NULL AND v_effective_tier = 'free' THEN
      v_max_projects := 2;
    END IF;
  END IF;

  IF v_max_projects IS NULL THEN RETURN true; END IF;

  SELECT count(*) INTO v_current_count FROM public.events
  WHERE organization_id = v_org.id AND deleted_at IS NULL;
  RETURN v_current_count < v_max_projects;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_org_insert_master_cost()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org RECORD;
  v_effective_tier TEXT;
  v_max_costs INTEGER;
  v_current_count INTEGER;
BEGIN
  SELECT * INTO v_org FROM public.organizations WHERE id = public.get_my_org_id() LIMIT 1;
  IF NOT FOUND THEN RETURN false; END IF;
  IF v_org.slug = 'duo-producciones' OR v_org.is_exempt = true THEN RETURN true; END IF;

  IF v_org.is_demo = true THEN
    SELECT count(*) INTO v_current_count FROM public.master_costs
    WHERE organization_id = v_org.id AND is_demo_base = false;
    RETURN v_current_count < COALESCE(v_org.max_demo_costs, 15);
  END IF;

  v_effective_tier := COALESCE(v_org.subscription_tier, 'free');
  IF v_effective_tier <> 'free' AND (
    v_org.subscription_status <> 'active'
    OR (v_org.current_period_end IS NOT NULL AND v_org.current_period_end < now())
  ) THEN
    v_effective_tier := 'free';
  END IF;

  IF v_effective_tier = 'custom' THEN
    IF v_org.selected_modules ? 'mod_unlimited_projects' THEN
      RETURN true;
    END IF;
    v_max_costs := 50;
  ELSE
    SELECT max_costs INTO v_max_costs FROM public.subscription_plans WHERE id = v_effective_tier LIMIT 1;
    IF v_max_costs IS NULL AND v_effective_tier = 'free' THEN
      v_max_costs := 12;
    END IF;
  END IF;

  IF v_max_costs IS NULL THEN RETURN true; END IF;

  SELECT count(*) INTO v_current_count FROM public.master_costs
  WHERE organization_id = v_org.id AND servicio NOT LIKE '\_\_SYSTEM\_%';
  RETURN v_current_count < v_max_costs;
END;
$$;

DROP POLICY IF EXISTS "events_insert" ON public.events;
CREATE POLICY "events_insert" ON public.events
  FOR INSERT WITH CHECK (
    organization_id = public.get_my_org_id()
    AND public.get_my_status() = 'active'
    AND public.can_org_insert_event()
  );

DROP POLICY IF EXISTS "master_costs_insert_admin" ON public.master_costs;
CREATE POLICY "master_costs_insert_admin" ON public.master_costs
  FOR INSERT WITH CHECK (
    organization_id = public.get_my_org_id()
    AND public.get_my_role() = 'admin'
    AND public.get_my_status() = 'active'
    AND public.can_org_insert_master_cost()
  );
