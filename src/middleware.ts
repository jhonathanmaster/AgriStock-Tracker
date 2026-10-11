
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware de seguridad para GeiaTienda Tracker.
 * Bloquea/Ignora peticiones comunes de bots que buscan vulnerabilidades.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Excluir rutas legítimas de Next.js y metadatos
  if (
    pathname.startsWith('/_next') || 
    pathname.startsWith('/api') ||
    pathname === '/sitemap.xml' ||
    pathname === '/robots.txt' ||
    pathname === '/manifest.webmanifest' ||
    pathname === '/favicon.ico' ||
    pathname === '/icon' ||
    pathname === '/apple-icon'
  ) {
    return NextResponse.next();
  }

  // Lista de patrones de escaneo de bots conocidos
  const suspiciousPatterns = [
    '/wp-admin',
    '/wp-login',
    '/wp-content',
    '/xmlrpc.php',
    '/phpmyadmin',
    '/.env',
    '/.git',
    '/config.php',
    '/login.php',
    '/setup-config'
  ];

  const isSuspicious = suspiciousPatterns.some(pattern => 
    pathname.toLowerCase().startsWith(pattern) || pathname.toLowerCase().includes(pattern)
  ) || (pathname.endsWith('.php') && !pathname.includes('api'));

  if (isSuspicious) {
    // Retornamos un 404 inmediato y ligero para estas rutas maliciosas
    return new NextResponse(null, { status: 404 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Coincidir con todas las rutas excepto archivos estáticos explícitos
     */
    '/((?!_next/static|_next/image|favicon.ico|icon|apple-icon).*)',
  ],
};
