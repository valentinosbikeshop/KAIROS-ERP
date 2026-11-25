-- ============================================================================
-- KAIROS ERP — Recalibración Estratégica de Cuotas IA, Cupo Mensual y RPC Atómico
-- 100% Idempotente y No-Destructiva.
-- Preserva precios personalizados si fueron editados desde /governance.
-- ============================================================================

-- 1. RPC atómico para consumir 1 crédito IA sin race conditions ni pérdida de espejo JSONB
CREATE OR REPLACE FUNCTION public.increment_org_ai_calls(p_org_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_used INTEGER;
BEGIN
  UPDATE public.organizations
  SET ai_calls_used = CASE
    WHEN now() >= COALESCE(ai_calls_reset_at, now()) THEN 1
    ELSE COALESCE(ai_calls_used, 0) + 1
  END,
  ai_calls_reset_at = CASE
    WHEN now() >= COALESCE(ai_calls_reset_at, now()) THEN (date_trunc('month', now()) + interval '1 month')
    ELSE ai_calls_reset_at
  END
  WHERE id = p_org_id
  RETURNING ai_calls_used INTO v_new_used;

  RETURN COALESCE(v_new_used, 0);
END;
$$;

-- 2. Actualizar can_org_insert_event() para que el tope de planes pagados (ej. 12/mes)
--    cuente proyectos creados EN EL MES CALENDARIO ACTUAL (y Free cuente 2 activos totales).
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

  IF v_effective_tier = 'free' THEN
    SELECT count(*) INTO v_current_count FROM public.events
    WHERE organization_id = v_org.id AND deleted_at IS NULL;
  ELSE
    -- Planes pagados con tope mensual (Essential 12/mes, Custom base 5/mes)
    SELECT count(*) INTO v_current_count FROM public.events
    WHERE organization_id = v_org.id
      AND deleted_at IS NULL
      AND created_at >= date_trunc('month', now());
  END IF;

  RETURN v_current_count < v_max_projects;
END;
$$;

-- 3. Recalibrar cuotas IA estratégicas (solo si aún conservan los valores previos)
UPDATE public.subscription_plans
SET
  tagline = 'Cotización formal, flujo de caja y Suite IA Inicial',
  description = 'Pensado para empresas en marcha que necesitan emitir propuestas PDF profesionales, controlar abonos/gastos reales e iniciar con IA y OCR.',
  ai_calls_limit = 25,
  included_modules = '["mod_pdf_quotes","mod_transactions_sii","mod_ai_suite"]'::jsonb,
  features = '["Hasta 12 proyectos nuevos al mes","Hasta 120 tarifas en catálogo maestro","2 usuarios en tu espacio","Cotizador PDF comercial + Abonos y Gastos Reales SII","Suite IA Inicial (25 consultas/mes + OCR de Boletas/Facturas)"]'::jsonb
WHERE id = 'essential' AND ai_calls_limit = 0;

UPDATE public.subscription_plans
SET
  tagline = 'Máximo retorno: IA Pro + OCR + IVA F29 sin sorpresas',
  ai_calls_limit = 250,
  features = '["Proyectos y catálogo maestro ILIMITADOS","Hasta 5 usuarios colaboradores","Suite IA Pro (250 consultas/mes) + OCR PDF/Excel/Fotos","Asesor Financiero CFO IA + Optimizador de Márgenes","Consolidación, Recetas / Prorrateo Retail y Analítica P&L + Excel F29"]'::jsonb
WHERE id = 'growth' AND ai_calls_limit = 200;

UPDATE public.subscription_plans
SET
  ai_calls_limit = 800,
  features = '["Todo lo de Crecimiento Inteligente incluido","Usuarios ILIMITADOS con roles y auditoría","800 consultas de IA mensuales con prioridad CFO","Marca Blanca PDF (tu logo, datos bancarios y pie legal)","Gobernanza avanzada de equipo y soporte prioritario"]'::jsonb
WHERE id = 'scale' AND ai_calls_limit = 600;

UPDATE public.subscription_addons
SET
  name = 'Suite IA + OCR Documental (180 créditos/mes)',
  description = 'Asistente de borradores, desglose automático de costos, optimizador de márgenes, asesor CFO y OCR de PDF/Excel/Fotos.',
  ai_calls_bonus = 180
WHERE id = 'mod_ai_suite' AND ai_calls_bonus = 150;
