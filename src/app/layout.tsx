import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, Instrument_Serif } from 'next/font/google';
import './globals.css';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  variable: '--font-serif',
  weight: '400',
  style: ['normal', 'italic'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'KAIROS ERP | Arquitectura Financiera & Proyectos por Rubro con IA',
  description:
    'KAIROS ERP — Plataforma SaaS Multi-Empresa de gestión operativa, cotizaciones y planificación financiera con precisión arquitectónica',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      className={`${plusJakarta.variable} ${instrumentSerif.variable}`}
    >
      <body className="font-sans antialiased selection:bg-[#4A607A]/15 selection:text-foreground">
        {children}
      </body>
    </html>
  );
}
