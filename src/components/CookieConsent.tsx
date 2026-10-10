
"use client";

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Cookie, X, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Verificar si el usuario ya aceptó las cookies anteriormente
    const consent = localStorage.getItem('geiatienda-cookie-consent');
    if (!consent) {
      // Pequeño retraso para que no aparezca abruptamente al cargar
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('geiatienda-cookie-consent', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 left-0 right-0 z-[100] px-4 animate-in fade-in slide-in-from-bottom-10 duration-700">
      <Card className="max-w-3xl mx-auto shadow-2xl border-primary/20 bg-white/95 backdrop-blur-sm p-6 relative">
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          onClick={() => setIsVisible(false)}
        >
          <X className="w-4 h-4" />
        </Button>
        
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="bg-primary/10 p-4 rounded-2xl shrink-0">
            <Cookie className="w-10 h-10 text-primary" />
          </div>
          
          <div className="flex-1 space-y-2 text-center md:text-left">
            <h3 className="font-bold text-lg text-foreground flex items-center justify-center md:justify-start gap-2">
              Aviso de Cookies y Privacidad
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Utilizamos cookies propias y de terceros para mejorar tu experiencia en <b>GeiaTienda Tracker</b>, 
              gestionar el inicio de sesión con Google y realizar el seguimiento de tus operaciones de inventario. 
              Al continuar navegando, aceptas nuestra política de uso de datos.
            </p>
          </div>
          
          <div className="shrink-0 w-full md:w-auto flex flex-col gap-2">
            <Button 
              onClick={handleAccept} 
              className="w-full md:w-auto gap-2 bg-primary hover:bg-primary/90 text-white font-bold h-12 px-8"
            >
              <CheckCircle2 className="w-5 h-5" />
              Aceptar y Continuar
            </Button>
            <Button 
              variant="outline" 
              className="w-full md:w-auto text-xs"
              onClick={() => setIsVisible(false)}
            >
              Cerrar
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
