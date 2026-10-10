
import type { Metadata } from 'next';
import { PT_Sans } from 'next/font/google';
import './globals.css';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Navigation } from '@/components/Navigation';
import { Toaster } from '@/components/ui/toaster';
import { CookieConsent } from '@/components/CookieConsent';

// Optimización nativa de fuentes de Next.js
const ptSans = PT_Sans({
  weight: ['400', '700'],
  subsets: ['latin'],
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
        <FirebaseClientProvider>
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
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
