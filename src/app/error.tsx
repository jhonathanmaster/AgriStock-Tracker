"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, RefreshCcw, Home } from "lucide-react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Runtime Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F6F8ED] p-4">
      <Card className="w-full max-w-md shadow-2xl border-destructive/20">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center text-destructive mb-2">
            <AlertCircle className="w-10 h-10" />
          </div>
          <CardTitle className="text-2xl font-bold text-destructive">Algo salió mal</CardTitle>
          <p className="text-muted-foreground text-sm leading-relaxed px-4">
            La aplicación encontró un error inesperado durante la carga.
          </p>
        </CardHeader>
        <CardContent className="bg-muted/30 mx-6 rounded-lg p-4 mb-6 border border-border/50">
          <p className="text-[10px] font-mono text-muted-foreground break-all overflow-hidden line-clamp-4">
            {error.message || "Error desconocido en el servidor."}
          </p>
          {error.digest && (
            <p className="text-[9px] font-mono text-muted-foreground/50 mt-2">
              ID: {error.digest}
            </p>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button onClick={() => reset()} className="w-full gap-2 font-bold py-6">
            <RefreshCcw className="w-4 h-4" />
            Reintentar Carga
          </Button>
          <Link href="/" passHref className="w-full">
            <Button variant="outline" className="w-full gap-2 py-6">
              <Home className="w-4 h-4" />
              Volver al Inicio
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
