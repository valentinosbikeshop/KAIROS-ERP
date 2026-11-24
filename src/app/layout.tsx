import type { Metadata } from 'next';
import { Manrope, Instrument_Serif, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

const manrope = Manrope({
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

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500', '600'],
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
      className={`${manrope.variable} ${instrumentSerif.variable} ${ibmPlexMono.variable}`}
    >
      <body className="font-sans antialiased selection:bg-[#9A7B4F]/20 selection:text-foreground">
        {children}
      </body>
    </html>
  );
}
