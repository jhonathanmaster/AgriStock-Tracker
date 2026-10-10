
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, ArrowLeft, SearchX } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

/**
 * Página personalizada para errores 404 (Ruta no encontrada).
 * Optimizada para ser ligera y manejar peticiones de bots sin sobrecarga.
 */
export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F6F8ED] p-4">
      <Card className="w-full max-w-md shadow-2xl border-primary/10 overflow-hidden">
        <CardHeader className="text-center space-y-2 bg-primary/5 pb-8">
          <div className="mx-auto w-20 h-20 bg-white rounded-2xl shadow-sm flex items-center justify-center text-primary mb-4 mt-4">
            <SearchX className="w-12 h-12" />
          </div>
          <CardTitle className="text-3xl font-black text-primary tracking-tight">404</CardTitle>
          <h2 className="text-xl font-bold text-foreground">Página no encontrada</h2>
          <p className="text-muted-foreground text-sm px-6">
            El recurso que buscas no existe o ha sido movido en el sistema GeiaTienda.
          </p>
        </CardHeader>
        
        <CardContent className="pt-8 text-center">
          <div className="bg-muted/30 p-4 rounded-lg border border-dashed border-border/50">
            <p className="text-[10px] text-muted-foreground italic">
              Si crees que esto es un error del sistema, por favor contacta al administrador.
            </p>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 pb-8 px-8">
          <Link href="/" passHref className="w-full">
            <Button className="w-full gap-2 font-bold h-12 text-base shadow-md">
              <Home className="w-5 h-5" />
              Ir al Inicio
            </Button>
          </Link>
          <Button 
            variant="outline" 
            onClick={() => router.back()} 
            className="w-full gap-2 h-12 border-primary/20 hover:bg-primary/5"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver Atrás
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
