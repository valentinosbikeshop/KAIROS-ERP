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
  title: 'FIGURA | Arquitectura Financiera & ERP Multi-Rubro con IA',
  description:
    'FIGURA — Plataforma SaaS Multi-Empresa de arquitectura financiera, cotizaciones inteligentes IA OCR y control tributario F29 con precisión ejecutiva.',
  openGraph: {
    title: 'FIGURA | Arquitectura Financiera & ERP Multi-Rubro',
    description:
      'Precisión en cada cifra. Control en cada margen. Cotizador IA OCR, IVA F29 en vivo, retenciones 15,25% y portal de aprobación digital.',
    type: 'website',
  },
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
