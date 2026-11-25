-- ============================================================================
-- KAIROS ERP — Hardening RLS, Triggers de Integridad de Columnas y RPCs
-- 100% Idempotente y No-Destructiva
-- ============================================================================

-- 1. Revocar EXECUTE en funciones SECURITY DEFINER
REVOKE ALL ON FUNCTION public.increment_org_ai_calls(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_org_ai_calls(UUID) TO service_role;

REVOKE ALL ON FUNCTION public.get_my_org_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_org_id() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_my_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_my_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_status() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_super_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_my_org_demo() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_my_org_demo() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.can_org_insert_event() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_org_insert_event() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.can_org_insert_master_cost() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_org_insert_master_cost() TO authenticated, service_role;

-- 2. Proteger columnas sensibles de public.organizations (incluyendo bank_info.__saas_config)
CREATE OR REPLACE FUNCTION public.guard_organizations_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('role', true) = 'service_role' OR public.is_super_admin() THEN
    RETURN NEW;
  END IF;

  NEW.slug := OLD.slug;
  NEW.is_demo := OLD.is_demo;
  NEW.is_active := OLD.is_active;
  NEW.max_demo_events := OLD.max_demo_events;
  NEW.max_demo_costs := OLD.max_demo_costs;
  NEW.is_exempt := OLD.is_exempt;
  NEW.subscription_tier := OLD.subscription_tier;
  NEW.subscription_status := OLD.subscription_status;
  NEW.selected_modules := OLD.selected_modules;
  NEW.current_period_start := OLD.current_period_start;
  NEW.current_period_end := OLD.current_period_end;
  NEW.khipu_subscription_id := OLD.khipu_subscription_id;
  NEW.ai_calls_used := OLD.ai_calls_used;
  NEW.ai_calls_reset_at := OLD.ai_calls_reset_at;

  IF OLD.bank_info ? '__saas_config' THEN
    NEW.bank_info := jsonb_set(
      COALESCE(NEW.bank_info, '{}'::jsonb) - '__saas_config',
      '{__saas_config}',
      OLD.bank_info->'__saas_config',
      true
    );
  ELSE
    NEW.bank_info := COALESCE(NEW.bank_info, '{}'::jsonb) - '__saas_config';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_organizations_update ON public.organizations;
CREATE TRIGGER trg_guard_organizations_update
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.guard_organizations_update();

-- 3. Proteger columnas de gobernanza comercial y aceptación digital en public.events
CREATE OR REPLACE FUNCTION public.guard_events_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  IF current_setting('role', true) = 'service_role' OR public.is_super_admin() THEN
    RETURN NEW;
  END IF;

  v_is_admin := (public.get_my_role() = 'admin' AND public.get_my_status() = 'active');

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
    IF NOT v_is_admin THEN
      NEW.min_margin_override_approved := false;
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

  IF NOT v_is_admin THEN
    NEW.min_margin_override_approved := OLD.min_margin_override_approved;
    NEW.quote_token := OLD.quote_token;
    NEW.quote_status := OLD.quote_status;
    NEW.quote_sent_at := OLD.quote_sent_at;
    IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('approved', 'completed') THEN
      RAISE EXCEPTION 'Solo un administrador puede aprobar o cerrar un proyecto.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_events_write ON public.events;
CREATE TRIGGER trg_guard_events_write
  BEFORE INSERT OR UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.guard_events_write();

-- 4. Proteger is_demo_base y organization_id en public.event_items
CREATE OR REPLACE FUNCTION public.guard_event_items_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('role', true) = 'service_role' OR public.is_super_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.is_demo_base := false;
    RETURN NEW;
  END IF;

  NEW.organization_id := OLD.organization_id;
  NEW.is_demo_base := OLD.is_demo_base;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_event_items_write ON public.event_items;
CREATE TRIGGER trg_guard_event_items_write
  BEFORE INSERT OR UPDATE ON public.event_items
  FOR EACH ROW EXECUTE FUNCTION public.guard_event_items_write();

-- 5. Proteger cuotas de master_costs (bloquear prefijo __SYSTEM_ e is_demo_base)
CREATE OR REPLACE FUNCTION public.guard_master_costs_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('role', true) = 'service_role' OR public.is_super_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.servicio LIKE '\_\_SYSTEM\_%' THEN
    RAISE EXCEPTION 'Prefijo reservado por el sistema.';
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.is_demo_base := false;
    NEW.organization_id := public.get_my_org_id();
  ELSE
    NEW.organization_id := OLD.organization_id;
    NEW.is_demo_base := OLD.is_demo_base;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_master_costs_write ON public.master_costs;
CREATE TRIGGER trg_guard_master_costs_write
  BEFORE INSERT OR UPDATE ON public.master_costs
  FOR EACH ROW EXECUTE FUNCTION public.guard_master_costs_write();

-- 6. Proteger columnas inmutables en public.profiles
CREATE OR REPLACE FUNCTION public.guard_profiles_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('role', true) = 'service_role' OR public.is_super_admin() THEN
    RETURN NEW;
  END IF;

  NEW.email := OLD.email;
  NEW.is_super_admin := OLD.is_super_admin;
  NEW.organization_id := OLD.organization_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_profiles_update ON public.profiles;
CREATE TRIGGER trg_guard_profiles_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profiles_update();

-- 7. Endurecer políticas RLS de billing_payments
DROP POLICY IF EXISTS "billing_payments_select" ON public.billing_payments;
CREATE POLICY "billing_payments_select" ON public.billing_payments
  FOR SELECT USING (
    public.is_super_admin() OR (
      organization_id = public.get_my_org_id()
      AND public.get_my_role() = 'admin'
      AND public.get_my_status() = 'active'
    )
  );

DROP POLICY IF EXISTS "billing_payments_insert_admin" ON public.billing_payments;
DROP POLICY IF EXISTS "billing_payments_insert_super" ON public.billing_payments;
CREATE POLICY "billing_payments_insert_super" ON public.billing_payments
  FOR INSERT WITH CHECK (public.is_super_admin());
