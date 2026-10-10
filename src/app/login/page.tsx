"use client";

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useUser } from '@/lib/session';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sprout, ShieldAlert, ArrowLeft } from 'lucide-react';
import { LoadingScreen } from '@/components/LoadingScreen';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { SignInOptions } from '@/components/SignInOptions';

const GOOGLE_ERRORS: Record<string, string> = {
  google_not_configured: 'El acceso con Google no está configurado en el servidor (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).',
  google_denied: 'Cancelaste el acceso con Google.',
  google_state: 'La sesión de Google expiró. Intenta de nuevo.',
  google_failed: 'No se pudo completar el acceso con Google. Intenta de nuevo.',
  google_unverified: 'Tu correo de Google no está verificado.',
  google_conflict: 'Este correo ya está vinculado a otra cuenta de Google.',
};

function LoginContent() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('auth_error');
    if (code) setAuthError(GOOGLE_ERRORS[code] || 'No se pudo completar el inicio de sesión.');
  }, [searchParams]);

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading) return <LoadingScreen />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F6F8ED] p-4 text-center">
      <Card className="w-full max-w-md shadow-xl border-none overflow-hidden">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-white shadow-lg">
            <Sprout className="w-10 h-10" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-3xl font-bold text-primary">GeiaTienda</CardTitle>
            <CardDescription className="text-lg">Acceso Administrativo</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {authError && (
            <Alert variant="destructive" className="text-left">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>Fallo de Acceso</AlertTitle>
              <AlertDescription className="text-[11px] mt-2">
                {authError}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <p className="text-center text-muted-foreground text-sm px-4">
              Inicia sesión con tu cuenta autorizada para gestionar el sistema.
            </p>
            <SignInOptions onSignedIn={() => router.push('/')} onError={setAuthError} />
          </div>

          <div className="pt-4 border-t border-border/50">
            <Button asChild variant="ghost" className="w-full gap-2 text-muted-foreground hover:text-primary h-10">
              <Link href="/">
                <ArrowLeft className="w-4 h-4" />
                Regresar al Catálogo
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <LoginContent />
    </Suspense>
  );
}
