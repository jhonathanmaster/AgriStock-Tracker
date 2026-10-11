"use client";

import { useEffect, useState, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useUser, signOut, refreshSession } from '@/lib/session';
import { api } from '@/lib/data-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Sprout, Loader2, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { LoadingScreen } from '@/components/LoadingScreen';
import { useToast } from '@/hooks/use-toast';
import { SignInOptions } from '@/components/SignInOptions';

type Status = 'idle' | 'loading' | 'success' | 'expired' | 'invalid' | 'need-login' | 'wrong-account';

function AcceptInvitationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  const [status, setStatus] = useState<Status>('idle');
  const emailParam = searchParams.get('email')?.toLowerCase() || null;
  const tokenParam = searchParams.get('token') || null;
  const returnTo = `/accept-invitation?${searchParams.toString()}`;

  const processActivation = useCallback(async () => {
    if (!emailParam || !tokenParam) return;
    setStatus('loading');
    try {
      const r = await api<{ status: Status | 'success' }>('POST', '/api/auth/invitation', { email: emailParam, token: tokenParam });
      if (r.status === 'success') {
        await refreshSession();
        setStatus('success');
        toast({ title: "Cuenta Activada", description: "Ya puedes acceder al sistema." });
        setTimeout(() => router.push('/'), 2000);
      } else {
        setStatus(r.status as Status);
      }
    } catch (error) {
      console.error("Error al activar invitación:", error);
      setStatus('invalid');
    }
  }, [emailParam, tokenParam, router, toast]);

  useEffect(() => {
    if (!emailParam || !tokenParam) {
      setStatus('invalid');
      return;
    }
    if (status !== 'idle' || isUserLoading) return;
    if (user) {
      void processActivation();
      return;
    }
    // Not signed in yet: check the link first so we can tell the visitor what to do.
    api<{ status: string }>('GET', `/api/auth/invitation?email=${encodeURIComponent(emailParam)}&token=${encodeURIComponent(tokenParam)}`)
      .then((r) => setStatus(r.status === 'valid' || r.status === 'accepted' ? 'need-login' : (r.status as Status)))
      .catch(() => setStatus('invalid'));
  }, [user, isUserLoading, status, emailParam, tokenParam, processActivation]);

  const useAnotherAccount = async () => {
    await signOut();
    setStatus('need-login');
  };

  if (status === 'loading' || status === 'idle' || isUserLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F6F8ED] p-4 text-foreground">
      <Card className="w-full max-w-md shadow-xl border-none overflow-hidden">
        <CardHeader className="text-center space-y-4 bg-primary text-white pb-8">
          <div className="mx-auto w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-white shadow-lg">
            <Sprout className="w-10 h-10" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">Activación de Cuenta</CardTitle>
            <CardDescription className="text-white/80">GeiaTienda Tracker - Sistema de Gestión</CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="text-center py-8 px-6 -mt-4 bg-white rounded-t-[2rem]">
          {status === 'success' && (
            <div className="space-y-6 animate-in zoom-in duration-300">
              <div className="flex flex-col items-center gap-2">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-2">
                  <CheckCircle2 className="w-12 h-12 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-primary">¡Bienvenido al equipo!</h2>
              </div>
              <p className="text-muted-foreground text-sm">
                Tu cuenta ha sido activada con éxito. Estamos redirigiéndote al tablero principal...
              </p>
              <div className="flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            </div>
          )}

          {status === 'need-login' && (
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-2">
                <ShieldCheck className="w-16 h-16 text-accent mb-2" />
                <h2 className="text-xl font-bold">Verifica tu Identidad</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Has sido invitado con el correo <br/><b className="text-foreground">{emailParam}</b>.<br/>
                Entra con Google o crea una contraseña para completar la activación.
              </p>
              <SignInOptions
                returnTo={returnTo}
                email={emailParam || undefined}
                preferRegister
                onSignedIn={() => setStatus('idle')}
                onError={(message) => toast({ variant: "destructive", title: "Error de autenticación", description: message })}
              />
            </div>
          )}

          {status === 'wrong-account' && (
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-2">
                <XCircle className="w-16 h-16 text-destructive mb-2" />
                <h2 className="text-xl font-bold">Cuenta Incorrecta</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Estás autenticado como <b>{user?.email}</b>, pero la invitación es para <b>{emailParam}</b>.
              </p>
              <Button onClick={useAnotherAccount} variant="outline" className="w-full">
                Usar otra cuenta
              </Button>
            </div>
          )}

          {(status === 'expired' || status === 'invalid') && (
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-2">
                <XCircle className="w-16 h-16 text-destructive mb-2" />
                <h2 className="text-xl font-bold">Enlace Inválido o Expirado</h2>
              </div>
              <p className="text-muted-foreground text-sm">
                Este enlace de invitación ya no es válido o ha caducado. Por favor, solicita una nueva invitación al administrador.
              </p>
              <Button asChild variant="outline" className="w-full h-12">
                <Link href="/login">Ir al Inicio</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <AcceptInvitationContent />
    </Suspense>
  );
}
