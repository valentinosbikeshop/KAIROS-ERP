import type { Metadata } from 'next';
import { Inter, Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['500', '600', '700', '800'],
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500', '600'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'KAIROS ERP | Gestión Financiera & Proyectos por Rubro con IA',
  description:
    'KAIROS ERP — Plataforma SaaS Multi-Empresa de gestión operativa, cotizaciones y planificación financiera con IA',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${jakarta.variable} ${jetbrainsMono.variable}`}
    >
      <body className="font-sans antialiased selection:bg-primary/15 selection:text-primary">
        {children}
      </body>
    </html>
  );
}
