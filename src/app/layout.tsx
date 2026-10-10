
import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { DataProvider } from '@/lib/session';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Navigation } from '@/components/Navigation';
import { Toaster } from '@/components/ui/toaster';
import { CookieConsent } from '@/components/CookieConsent';

// PT Sans incluida en el proyecto (no depende de Google Fonts al compilar ni al cargar).
const ptSans = localFont({
  src: [
    { path: '../../node_modules/@fontsource/pt-sans/files/pt-sans-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: '../../node_modules/@fontsource/pt-sans/files/pt-sans-latin-700-normal.woff2', weight: '700', style: 'normal' },
  ],
  display: 'swap',
  variable: '--font-pt-sans',
});

export const metadata: Metadata = {
  title: 'GeiaTienda Tracker - Sistema de Inventario',
  description: 'Gestión profesional de productos e insumos para el campo',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning className={ptSans.variable}>
      <head />
      <body className="antialiased" suppressHydrationWarning>
        <DataProvider>
          <SidebarProvider defaultOpen={true}>
            <div className="flex min-h-screen w-full bg-background font-sans">
              <Navigation />
              <div className="flex-1 flex flex-col min-w-0">
                {children}
              </div>
            </div>
            <Toaster />
            <CookieConsent />
          </SidebarProvider>
        </DataProvider>
      </body>
    </html>
  );
}
