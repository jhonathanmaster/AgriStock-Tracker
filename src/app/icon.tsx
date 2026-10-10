import { ImageResponse } from 'next/og'
import { SproutSvg } from './sprout-svg'
 
/**
 * Generador dinámico de favicon e iconos para GeiaTienda.
 * Next.js utilizará este archivo para servir favicon.ico automáticamente.
 */
export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'
 
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 24,
          background: '#4D7C0F',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '20%',
          color: 'white',
        }}
      >
        <SproutSvg size={22} />
      </div>
    ),
    {
      ...size,
    }
  )
}