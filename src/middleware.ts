
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware de seguridad para GeiaTienda Tracker.
 * Bloquea/Ignora peticiones comunes de bots que buscan vulnerabilidades (WordPress, PHP, etc.)
 * para mantener los logs limpios y ahorrar recursos del servidor.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Lista extendida de patrones comunes de escaneos de bots y ataques automatizados
  const suspiciousPatterns = [
    '/wp-',
    '/wordpress',
    '/xmlrpc',
    '/phpmyadmin',
    '/pma',
    '/.env',
    '/.git',
    '/sito',
    '/cms',
    '/setup-config',
    '/license.txt',
    '/readme.html',
    '/web.config',
    '/config.php',
    '/login.php'
  ];

  const isSuspicious = suspiciousPatterns.some(pattern => 
    pathname.toLowerCase().includes(pattern)
  ) || pathname.endsWith('.php') || pathname.endsWith('.xml');

  if (isSuspicious) {
    // Retornamos un 404 inmediato y ligero para estas rutas maliciosas/inexistentes
    return new NextResponse(null, { status: 404 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Coincidir con todas las rutas excepto:
     * - api (rutas de API)
     * - _next/static (archivos estáticos)
     * - _next/image (optimización de imágenes)
     * - favicon.ico, icon, apple-icon (iconos)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|icon|apple-icon).*)',
  ],
};
