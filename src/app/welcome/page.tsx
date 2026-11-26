import type { Metadata } from 'next';
import { fetchPlansAndAddonsServer } from '@/lib/saas-storage';
import { WelcomeClient } from './_components/welcome-client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'FIGURA | Arquitectura Financiera, Cotizador IA & Control F29 para 9 Rubros en Chile',
  description:
    'ERP financiero para empresas de proyectos en Chile: cotizaciones PDF y Portal /q, consolidación padre/hijo, IA OCR, retención 15,25% e IVA F29 en vivo en CLP fijo.',
};

export default async function WelcomeLandingPage() {
  const { plans, addons } = await fetchPlansAndAddonsServer();
  const activePlans = plans.filter((p) => p.is_active !== false);
  const activeAddons = addons.filter((a) => a.is_active !== false);

  return <WelcomeClient initialPlans={activePlans} initialAddons={activeAddons} />;
}
