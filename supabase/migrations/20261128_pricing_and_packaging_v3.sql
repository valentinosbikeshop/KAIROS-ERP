-- ============================================================================
-- FIGURA ERP — Migración v3: Pricing & Packaging 2026, Cuotas Activo vs Mensual,
-- RBAC Extendido, Bitácora Inmutable de Auditoría y Soporte Multi-Moneda/Régimen SII
-- 100% Idempotente y No-Destructiva. Preserva intacta a DUO Producciones.
-- ============================================================================

-- 1. Nuevas columnas en public.organizations (régimen tributario, retención, marca blanca)
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS honorarios_retention_policy TEXT NOT NULL DEFAULT 'contractor',
  ADD COLUMN IF NOT EXISTS tax_regime TEXT NOT NULL DEFAULT 'afecto_iva',
  ADD COLUMN IF NOT EXISTS white_label_footer TEXT,
  ADD COLUMN IF NOT EXISTS hide_figura_branding BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS secondary_accounts JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 2. Nuevas columnas en public.events (cantidad base PAX/m², tipo proyecto, mermas, condiciones pago, régimen)
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS base_quantity NUMERIC,
  ADD COLUMN IF NOT EXISTS project_type TEXT,
  ADD COLUMN IF NOT EXISTS mermas_pct NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_terms TEXT,
  ADD COLUMN IF NOT EXISTS tax_regime TEXT;

-- 3. Nuevas columnas en public.event_items y public.master_costs (moneda por ítem, pass-through y exentos)
ALTER TABLE public.event_items
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'CLP',
  ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_pass_through BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS es_reembolsable BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS es_exento BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS es_exento_compra BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.master_costs
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'CLP',
  ADD COLUMN IF NOT EXISTS es_reembolsable BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS es_exento_compra BOOLEAN NOT NULL DEFAULT false;

-- 4. Ampliar roles permitidos en public.profiles (RBAC Scale + compatibilidad owner/admin/member)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%role%'
  LOOP
    EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('owner', 'admin', 'comercial', 'finanzas', 'operaciones', 'contador_lectura', 'member'));

-- 5. Catálogo v3 definitivo en subscription_plans y subscription_addons (CLP IVA incl.)
INSERT INTO public.subscription_plans (
  id, name, tagline, description, price_clp, is_recommended, badge_text,
  max_projects, max_costs, max_users, ai_calls_limit, included_modules, features, sort_order, is_active
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
  25,
  1,
  0,
  '[]'::jsonb,
  '["Hasta 2 proyectos activos en simultáneo","Hasta 25 ítems o tarifas en catálogo maestro","1 usuario administrador","Cálculo automático Neto, IVA 19%, Exento y Margen real","Resguardo histórico garantizado (nunca pierdes datos)"]'::jsonb,
  1,
  true
),
(
  'essential',
  'Operación Esencial',
  'Cotizador PDF, consolidación, caja SII y Suite IA Inicial',
  'Pensado para empresas en marcha que necesitan emitir propuestas PDF con sus datos bancarios, agrupar partidas padre/hijo, controlar abonos/F29 e iniciar con IA y OCR.',
  34990,
  false,
  'Inicial',
  20,
  150,
  2,
  30,
  '["mod_pdf_quotes","mod_transactions_sii","mod_consolidation_retail","mod_ai_suite"]'::jsonb,
  '["Hasta 20 proyectos nuevos al mes y 150 tarifas","2 usuarios en tu espacio","Cotizador PDF + Portal web con tus datos bancarios","Consolidación padre/hijo, recetas y prorrateo por unidad","Abonos, Gastos Reales SII, F29 y 30 consultas IA + OCR/mes"]'::jsonb,
  2,
  true
),
(
  'growth',
  'Crecimiento Inteligente IA',
  'Ilimitado + IA Pro + OCR + Analítica P&L y Logo propio',
  'La opción más rentable: automatiza cotizaciones desde PDF/Excel/Fotos con IA, domina tu IVA F29 con conciliador bancario/RCV, luce tu logo y protege tu margen neto.',
  69990,
  true,
  'Recomendado',
  NULL,
  NULL,
  5,
  250,
  '["mod_unlimited_projects","mod_pdf_quotes","mod_transactions_sii","mod_consolidation_retail","mod_ai_suite","mod_analytics_excel"]'::jsonb,
  '["Proyectos y catálogo maestro ILIMITADOS","Hasta 5 usuarios colaboradores + logo propio en PDF y Portal","Suite IA Pro (250 consultas/mes) + OCR PDF, Excel y Fotos","Asesor CFO IA, Optimizador de Márgenes y Consolidación avanzada","Conciliador Cartola/RCV SII, Analítica P&L y Excel contable F29"]'::jsonb,
  3,
  true
),
(
  'scale',
  'Corporativo & Escala',
  'Equipo ilimitado, RBAC, auditoría, Marca Blanca 100% y 800 IA',
  'Para productoras, constructoras, consultoras y operaciones consolidadas que exigen roles granulares, auditoría, aprobación de márgenes y Marca Blanca 100%.',
  119990,
  false,
  'Enterprise',
  NULL,
  NULL,
  NULL,
  800,
  '["mod_unlimited_projects","mod_pdf_quotes","mod_transactions_sii","mod_consolidation_retail","mod_ai_suite","mod_analytics_excel","mod_team_branding"]'::jsonb,
  '["Todo lo de Crecimiento Inteligente IA incluido","Usuarios ILIMITADOS con roles granulares (RBAC) y auditoría","800 consultas IA/mes con prioridad CFO y control de margen mínimo","Marca Blanca 100% (sin huella FIGURA, pie legal y multi-cuenta)","Gobernanza avanzada, centros de costo y soporte prioritario"]'::jsonb,
  4,
  true
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tagline = EXCLUDED.tagline,
  description = EXCLUDED.description,
  price_clp = EXCLUDED.price_clp,
  is_recommended = EXCLUDED.is_recommended,
  badge_text = EXCLUDED.badge_text,
  max_projects = EXCLUDED.max_projects,
  max_costs = EXCLUDED.max_costs,
  max_users = EXCLUDED.max_users,
  ai_calls_limit = EXCLUDED.ai_calls_limit,
  included_modules = EXCLUDED.included_modules,
  features = EXCLUDED.features,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  updated_at = now();

INSERT INTO public.subscription_addons (
  id, name, description, price_clp, category, ai_calls_bonus, sort_order, is_active
) VALUES
(
  'base_custom',
  'Plataforma Activa Base',
  'Acceso base al ERP personalizado para tu rubro: hasta 8 proyectos activos, 60 tarifas maestras y 1 usuario.',
  14990,
  'base',
  0,
  0,
  true
),
(
  'mod_pdf_quotes',
  'Cotizador PDF Ejecutivo & Portal Cliente',
  'Genera propuestas comerciales en PDF y enlaces de aprobación web (/q) con tus datos bancarios.',
  9990,
  'module',
  0,
  1,
  true
),
(
  'mod_transactions_sii',
  'Flujo de Caja, Abonos, Cartola RCV y F29',
  'Control de abonos de clientes, gastos reales rendidos, retención boletas 15,25%, conciliador SII y cálculo F29.',
  9990,
  'module',
  0,
  2,
  true
),
(
  'mod_consolidation_retail',
  'Consolidación, Recetas y Modo Retail',
  'Agrupa ítems padre/hijo, escandallos y prorrateo unitario ocultando el desglose interno al cliente.',
  12990,
  'module',
  0,
  3,
  true
),
(
  'mod_unlimited_projects',
  'Proyectos y Catálogo Ilimitados',
  'Elimina los topes de proyectos activos y tarifas maestras en tu organización.',
  18990,
  'module',
  0,
  4,
  true
),
(
  'mod_analytics_excel',
  'Analítica P&L & Exportación Excel Contable',
  'Dashboards de rentabilidad neta mensual, distribución de costos y descarga de libro Excel + F29.',
  18990,
  'module',
  0,
  5,
  true
),
(
  'mod_ai_suite',
  'Suite IA + OCR Documental (180 créditos/mes)',
  'Asistente de borradores, desglose automático de costos, optimizador de márgenes, asesor CFO y OCR de PDF/Excel/Fotos.',
  24990,
  'module',
  180,
  6,
  true
),
(
  'mod_team_branding',
  'Equipo Multi-Usuario, RBAC & Marca Blanca 100%',
  'Habilita hasta 8 usuarios con roles, auditoría y documentos 100% Marca Blanca sin huella externa.',
  29990,
  'module',
  0,
  7,
  true
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_clp = EXCLUDED.price_clp,
  category = EXCLUDED.category,
  ai_calls_bonus = EXCLUDED.ai_calls_bonus,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- 6. Alinear Demo Sandbox a Growth completo con topes sandbox (10 eventos / 25 costos)
UPDATE public.organizations
SET max_demo_events = 10,
    max_demo_costs = 25,
    subscription_tier = 'growth',
    subscription_status = 'active',
    contact_email = 'contacto@figura-sandbox.cl'
WHERE is_demo = true;

-- 7. Tabla inmutable de Bitácora de Auditoría (Scale / RBAC)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  actor_id UUID,
  actor_email TEXT,
  actor_role TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  entity_label TEXT,
  before_data JSONB,
  after_data JSONB,
  metadata JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_org_created
  ON public.audit_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_entity
  ON public.audit_logs(organization_id, entity_type);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_select_org" ON public.audit_logs;
CREATE POLICY "audit_logs_select_org" ON public.audit_logs
  FOR SELECT USING (
    public.is_super_admin() OR (
      organization_id = public.get_my_org_id()
      AND public.get_my_status() = 'active'
      AND public.get_my_role() IN ('owner', 'admin', 'finanzas', 'contador_lectura')
    )
  );

DROP POLICY IF EXISTS "audit_logs_insert_org" ON public.audit_logs;
CREATE POLICY "audit_logs_insert_org" ON public.audit_logs
  FOR INSERT WITH CHECK (
    public.is_super_admin() OR (
      organization_id = public.get_my_org_id()
      AND public.get_my_status() = 'active'
    )
  );

-- 8. Actualizar can_org_insert_event() y can_org_insert_master_cost() según spec v3:
--    - free / custom: proyectos ACTIVOS (deleted_at IS NULL AND status <> 'completed')
--    - essential: proyectos NUEVOS creados en el mes calendario (mover a papelera no libera cupo)
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
    WHERE organization_id = v_org.id
      AND is_demo_base = false
      AND deleted_at IS NULL;
    RETURN v_current_count < COALESCE(v_org.max_demo_events, 10);
  END IF;

  v_effective_tier := COALESCE(v_org.subscription_tier, 'free');
  IF v_effective_tier <> 'free' AND (
    v_org.subscription_status <> 'active'
    OR (v_org.current_period_end IS NOT NULL AND v_org.current_period_end < now())
  ) THEN
    RETURN false;
  END IF;

  IF v_effective_tier = 'custom' THEN
    IF v_org.selected_modules ? 'mod_unlimited_projects' THEN
      RETURN true;
    END IF;
    v_max_projects := 8;
  ELSE
    SELECT max_projects INTO v_max_projects FROM public.subscription_plans WHERE id = v_effective_tier LIMIT 1;
    IF v_max_projects IS NULL AND v_effective_tier = 'free' THEN
      v_max_projects := 2;
    END IF;
  END IF;

  IF v_max_projects IS NULL THEN RETURN true; END IF;

  IF v_effective_tier = 'essential' THEN
    SELECT count(*) INTO v_current_count FROM public.events
    WHERE organization_id = v_org.id
      AND created_at >= date_trunc('month', now());
    RETURN v_current_count < v_max_projects;
  END IF;

  SELECT count(*) INTO v_current_count FROM public.events
  WHERE organization_id = v_org.id
    AND deleted_at IS NULL
    AND status <> 'completed';
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
    RETURN v_current_count < COALESCE(v_org.max_demo_costs, 25);
  END IF;

  v_effective_tier := COALESCE(v_org.subscription_tier, 'free');
  IF v_effective_tier <> 'free' AND (
    v_org.subscription_status <> 'active'
    OR (v_org.current_period_end IS NOT NULL AND v_org.current_period_end < now())
  ) THEN
    RETURN false;
  END IF;

  IF v_effective_tier = 'custom' THEN
    IF v_org.selected_modules ? 'mod_unlimited_projects' THEN
      RETURN true;
    END IF;
    v_max_costs := 60;
  ELSE
    SELECT max_costs INTO v_max_costs FROM public.subscription_plans WHERE id = v_effective_tier LIMIT 1;
    IF v_max_costs IS NULL AND v_effective_tier = 'free' THEN
      v_max_costs := 25;
    END IF;
  END IF;

  IF v_max_costs IS NULL THEN RETURN true; END IF;

  SELECT count(*) INTO v_current_count FROM public.master_costs
  WHERE organization_id = v_org.id AND servicio NOT LIKE '\_\_SYSTEM\_%';
  RETURN v_current_count < v_max_costs;
END;
$$;

-- 9. Actualizar triggers y políticas RLS para soportar roles RBAC ('owner', 'admin', 'finanzas')
CREATE OR REPLACE FUNCTION public.guard_events_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_is_admin BOOLEAN;
  v_can_approve_margin BOOLEAN;
BEGIN
  IF current_setting('role', true) = 'service_role' OR public.is_super_admin() THEN
    RETURN NEW;
  END IF;

  v_role := public.get_my_role();
  v_is_admin := (v_role IN ('owner', 'admin') AND public.get_my_status() = 'active');
  v_can_approve_margin := (v_role IN ('owner', 'admin', 'finanzas') AND public.get_my_status() = 'active');

  IF TG_OP = 'INSERT' THEN
    NEW.organization_id := public.get_my_org_id();
    NEW.created_by := auth.uid();
    NEW.is_demo_base := false;
    NEW.quote_token := NULL;
    NEW.quote_status := 'draft';
    NEW.quote_sent_at := NULL;
    NEW.quote_accepted_at := NULL;
    NEW.quote_accepted_by_name := NULL;
    NEW.quote_accepted_by_rut := NULL;
    NEW.quote_accepted_by_email := NULL;
    IF NOT v_can_approve_margin THEN
      NEW.min_margin_override_approved := false;
    END IF;
    IF NOT v_is_admin THEN
      NEW.status := 'planning';
    END IF;
    RETURN NEW;
  END IF;

  NEW.organization_id := OLD.organization_id;
  NEW.created_by := OLD.created_by;
  NEW.is_demo_base := OLD.is_demo_base;
  NEW.quote_accepted_at := OLD.quote_accepted_at;
  NEW.quote_accepted_by_name := OLD.quote_accepted_by_name;
  NEW.quote_accepted_by_rut := OLD.quote_accepted_by_rut;
  NEW.quote_accepted_by_email := OLD.quote_accepted_by_email;

  IF NOT v_can_approve_margin THEN
    NEW.min_margin_override_approved := OLD.min_margin_override_approved;
  END IF;

  IF NOT v_is_admin THEN
    NEW.quote_token := OLD.quote_token;
    NEW.quote_status := OLD.quote_status;
    NEW.quote_sent_at := OLD.quote_sent_at;
    IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('approved', 'completed') THEN
      IF v_role NOT IN ('comercial', 'finanzas') THEN
        RAISE EXCEPTION 'Su rol actual no tiene permisos para aprobar o cerrar un proyecto.';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS "organizations_update_admin" ON public.organizations;
CREATE POLICY "organizations_update_admin" ON public.organizations
  FOR UPDATE USING (
    public.is_super_admin() OR (
      id = public.get_my_org_id()
      AND public.get_my_role() IN ('owner', 'admin')
      AND public.get_my_status() = 'active'
    )
  );

DROP POLICY IF EXISTS "billing_payments_select" ON public.billing_payments;
CREATE POLICY "billing_payments_select" ON public.billing_payments
  FOR SELECT USING (
    public.is_super_admin() OR (
      organization_id = public.get_my_org_id()
      AND public.get_my_role() IN ('owner', 'admin', 'finanzas')
      AND public.get_my_status() = 'active'
    )
  );

DROP POLICY IF EXISTS "master_costs_insert_admin" ON public.master_costs;
CREATE POLICY "master_costs_insert_admin" ON public.master_costs
  FOR INSERT WITH CHECK (
    organization_id = public.get_my_org_id()
    AND public.get_my_role() IN ('owner', 'admin', 'operaciones', 'comercial')
    AND public.get_my_status() = 'active'
    AND public.can_org_insert_master_cost()
  );
