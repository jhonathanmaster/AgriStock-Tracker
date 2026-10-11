
import { MetadataRoute } from 'next'

/**
 * Generador de sitemap para SEO de GeiaTienda.
 * Incluye las rutas principales del portal público.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://geiatienda.com';

  const routes = [
    '',
    '/about',
    '/contact',
    '/transporte',
    '/login',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1 : 0.8,
  }));

  return routes;
}
