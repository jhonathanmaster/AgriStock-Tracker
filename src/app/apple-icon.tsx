import { ImageResponse } from 'next/og'
 
/**
 * Generador dinámico de Apple Touch Icon para GeiaTienda.
 */
export const size = {
  width: 180,
  height: 180,
}
export const contentType = 'image/png'
 
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 120,
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
        🌾
      </div>
    ),
    {
      ...size,
    }
  )
}