
"use client";

import { LoadingScreen } from '@/components/LoadingScreen';

/**
 * Componente de carga global de Next.js.
 * Se muestra automáticamente durante las transiciones de ruta y la carga inicial.
 */
export default function Loading() {
  return <LoadingScreen />;
}
