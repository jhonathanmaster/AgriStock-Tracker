
import { MetadataRoute } from 'next'
 
/**
 * Configuración de robots.txt para GeiaTienda.
 * Instruye a los buscadores sobre qué partes del sitio pueden rastrear.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin/',
        '/settings/',
        '/inventory/',
        '/sales/',
        '/purchase-orders/',
        '/purchase-tracking/',
        '/movements/',
        '/expenses/',
        '/credits/',
        '/orders/',
        '/inventory-audit/',
        '/login',
        '/accept-invitation',
        '/wp-admin/',
        '/wordpress/',
        '/*.php',
        '/*.xml',
        '/*.env',
        '/.git/'
      ],
    },
    sitemap: 'https://geiatienda.com/sitemap.xml',
  }
}
