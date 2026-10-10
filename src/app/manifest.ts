
import { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'GeiaTienda Tracker',
    short_name: 'GeiaTienda',
    description: 'Sistema Profesional de Gestión de Inventario Agrícola',
    start_url: '/',
    display: 'standalone',
    background_color: '#F6F8ED',
    theme_color: '#4D7C0F',
    icons: [
      {
        src: '/icon',
        sizes: 'any',
        type: 'image/png',
      },
    ],
  }
}
