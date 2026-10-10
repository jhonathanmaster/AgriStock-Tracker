
"use client";

import { Sprout } from 'lucide-react';

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-[#F6F8ED] p-4">
      <div className="relative mb-8 flex flex-col items-center">
        {/* Círculo de progreso animado con mayor radio para impacto visual */}
        <div className="absolute -inset-6 rounded-[2.5rem] border-4 border-primary/10 animate-pulse" />
        <div className="absolute -inset-6 rounded-[2.5rem] border-t-4 border-primary animate-spin" style={{ animationDuration: '2s' }} />
        
        {/* Contenedor del Logo centralizado */}
        <div className="relative w-28 h-28 bg-primary rounded-[2rem] flex items-center justify-center text-white shadow-2xl transform transition-transform duration-500 hover:scale-105">
          <Sprout className="w-16 h-16 animate-pulse" />
        </div>
      </div>
      
      <div className="text-center space-y-4 animate-in fade-in slide-in-from-bottom-6 duration-1000">
        <h1 className="text-5xl font-bold text-primary tracking-tighter">
          GeiaTienda
        </h1>
        <div className="flex items-center justify-center gap-3">
          <div className="h-1.5 w-10 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1s' }} />
          <div className="h-1.5 w-10 bg-accent rounded-full animate-bounce" style={{ animationDelay: '200ms', animationDuration: '1s' }} />
          <div className="h-1.5 w-10 bg-accent rounded-full animate-bounce" style={{ animationDelay: '400ms', animationDuration: '1s' }} />
        </div>
        <p className="text-muted-foreground font-bold uppercase tracking-[0.4em] text-[10px] pt-6 opacity-80">
          Cargando Sistema de Gestión
        </p>
      </div>
    </div>
  );
}
