-- Recalibración comercial de planes y add-ons KAIROS ERP
-- Plan Recomendado (growth): $59.990 CLP/mes
-- Plan Enterprise (scale): $109.990 CLP/mes (ahorro de 25,6% frente a armar todos los módulos sueltos = $147.920)

INSERT INTO public.subscription_plans (
  id, name, tagline, description, price_clp, is_recommended, badge_text
) VALUES
  ('free', 'Semilla', 'Para validar tu estructura inicial sin costo', 'Organiza tus primeros presupuestos con cálculo neto/IVA SII automático. Ideal para probar la plataforma antes de escalar.', 0, false, 'Gratis'),
  ('essential', 'Operación Esencial', 'Cotización formal y control de flujo de caja', 'Pensado para empresas en marcha que necesitan emitir propuestas PDF profesionales y controlar abonos, gastos reales e IVA SII.', 34990, false, 'Inicial'),
  ('growth', 'Crecimiento Inteligente IA', 'Máximo retorno: IA + OCR + IVA F29 sin sorpresas', 'La opción más rentable: automatiza cotizaciones desde PDF/Excel/Fotos con IA, domina tu IVA mensual y protege tu margen neto.', 59990, true, 'Recomendado'),
  ('scale', 'Corporativo & Escala', 'Multi-equipo, marca blanca y alta demanda IA', 'Para productoras, constructoras, consultoras y operaciones consolidadas que exigen gobernanza avanzada y equipo ilimitado.', 109990, false, 'Enterprise')
ON CONFLICT (id) DO UPDATE SET
  price_clp = EXCLUDED.price_clp,
  tagline = EXCLUDED.tagline,
  description = EXCLUDED.description,
  is_recommended = EXCLUDED.is_recommended,
  badge_text = EXCLUDED.badge_text;

INSERT INTO public.subscription_addons (
  id, name, description, price_clp, category, ai_calls_bonus, sort_order
) VALUES
  ('base_custom', 'Plataforma Activa Base', 'Acceso base al ERP personalizado para tu rubro: hasta 5 proyectos activos, 50 tarifas maestras y 1 usuario.', 19990, 'base', 0, 0),
  ('mod_unlimited_projects', 'Proyectos y Catálogo Ilimitados', 'Elimina los topes de proyectos activos y tarifas maestras en tu organización.', 16990, 'module', 0, 1),
  ('mod_pdf_quotes', 'Cotizador PDF Ejecutivo', 'Genera propuestas comerciales e informes contables en PDF listos para enviar al cliente.', 14990, 'module', 0, 2),
  ('mod_transactions_sii', 'Flujo de Caja, Abonos y Tributación SII', 'Control de abonos de clientes, gastos reales rendidos, boletas de honorarios y cálculo F29.', 14990, 'module', 0, 3),
  ('mod_consolidation_retail', 'Consolidación, Recetas y Modo Retail', 'Agrupa ítems padre/hijo, prorratea insumos unitarios y gestiona venta al detalle.', 15990, 'module', 0, 4),
  ('mod_ai_suite', 'Suite IA + OCR Documental (150 créditos/mes)', 'Asistente de borradores, desglose automático de costos, optimizador de márgenes y lectura de PDF/Excel/Fotos.', 24990, 'module', 150, 5),
  ('mod_analytics_excel', 'Analítica P&L & Exportación Excel Contable', 'Dashboards de rentabilidad mensual, distribución de costos y descarga de libro Excel.', 16990, 'module', 0, 6),
  ('mod_team_branding', 'Equipo Multi-Usuario & Marca Blanca', 'Habilita hasta 8 usuarios en tu organización, códigos de invitación y personalización de marca en documentos.', 22990, 'module', 0, 7)
ON CONFLICT (id) DO UPDATE SET
  price_clp = EXCLUDED.price_clp,
  description = EXCLUDED.description;
