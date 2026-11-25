-- ============================================================================
-- KAIROS ERP — Funcionalidades Competitivas Nativas (Sin APIs Externas)
-- 1) Portal Interactivo de Cotizaciones (/q/[token]) + Aceptación Digital
-- 2) Multimoneda (CLP / UF / USD) con tasas configurables por empresa
-- 3) Gobernanza Comercial: Piso de Margen Mínimo y Aprobación de Excepciones
-- 100% Idempotente y No-Destructiva.
-- ============================================================================

-- 1. Nuevas columnas en organizations (tasas FX configurables y piso de margen)
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS min_margin_pct NUMERIC NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS uf_rate_clp NUMERIC NOT NULL DEFAULT 41405,
  ADD COLUMN IF NOT EXISTS usd_rate_clp NUMERIC NOT NULL DEFAULT 1025;

-- 2. Nuevas columnas en events (portal interactivo, aceptación digital, multimoneda y excepción de margen)
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS quote_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS quote_status TEXT NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS quote_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS quote_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS quote_accepted_by_name TEXT,
  ADD COLUMN IF NOT EXISTS quote_accepted_by_rut TEXT,
  ADD COLUMN IF NOT EXISTS quote_accepted_by_email TEXT,
  ADD COLUMN IF NOT EXISTS quote_notes TEXT,
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'CLP',
  ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS min_margin_override_approved BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_events_quote_token ON public.events(quote_token) WHERE quote_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_org_date ON public.events(organization_id, event_date) WHERE deleted_at IS NULL;
