
"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { useFirestore, useUser, useAuth } from '@/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Sprout, LogIn, Loader2, ShieldCheck } from 'lucide-react';
import { Invitation } from '@/lib/types';
import Link from 'next/link';
import { LoadingScreen } from '@/components/LoadingScreen';
import { useToast } from '@/hooks/use-toast';

function AcceptInvitationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const db = useFirestore();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'expired' | 'invalid' | 'need-login' | 'wrong-account'>('idle');
  const [invitationData, setInvData] = useState<Invitation | null>(null);
  const [emailParam, setEmailParam] = useState<string | null>(null);
  const [tokenParam, setTokenParam] = useState<string | null>(null);

  useEffect(() => {
    const email = searchParams.get('email')?.toLowerCase();
    const token = searchParams.get('token');
    
    setEmailParam(email || null);
    setTokenParam(token || null);

    if (!email || !token) {
      setStatus('invalid');
    } else {
      setStatus('idle');
    }
  }, [searchParams]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error de autenticación", description: error.message });
    }
  };

  const processActivation = async () => {
    if (!db || !user || !emailParam || !tokenParam) return;

    setStatus('loading');
    try {
      const invRef = doc(db, 'invitations', emailParam);
      const invDoc = await getDoc(invRef);

      if (!invDoc.exists()) {
        setStatus('invalid');
        return;
      }

      const data = invDoc.data() as Invitation;
      setInvData(data);

      // Validar token
      if (data.token !== tokenParam) {
        setStatus('invalid');
        return;
      }

      // Validar expiración
      const expiresAt = new Date(data.expiresAt).getTime();
      if (Date.now() > expiresAt && data.status !== 'accepted') {
        setStatus('expired');
        return;
      }

      // Validar cuenta de correo
      if (user.email?.toLowerCase() !== emailParam) {
        setStatus('wrong-account');
        return;
      }

      // Proceder con la activación
      const now = new Date().toISOString();
      
      // 1. Actualizar invitación
      await updateDoc(invRef, {
        status: 'accepted',
        acceptedAt: now,
        enabled: true
      });

      // 2. Crear/Actualizar Perfil de Usuario
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || emailParam.split('@')[0],
        photoURL: user.photoURL,
        enabled: true,
        lastLogin: now,
        accessHistory: [now],
        role: 'operario'
      }, { merge: true });

      setStatus('success');
      toast({ title: "Cuenta Activada", description: "Ya puedes acceder al sistema." });
      
      // Redirigir después de un momento
      setTimeout(() => router.push('/'), 2000);

    } catch (error: any) {
      console.error("Error al activar invitación:", error);
      setStatus('invalid');
    }
  };

  useEffect(() => {
    if (status === 'idle' && emailParam && tokenParam) {
      if (!isUserLoading) {
        if (!user) {
          setStatus('need-login');
        } else {
          processActivation();
        }
      }
    }
  }, [user, isUserLoading, status, emailParam, tokenParam]);

  if (status === 'loading' || isUserLoading) {
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
                Inicia sesión para completar la activación.
              </p>
              <Button onClick={handleLogin} className="w-full gap-2 h-12" size="lg">
                <LogIn className="w-5 h-5" />
                Entrar con Google
              </Button>
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
              <Button onClick={handleLogin} variant="outline" className="w-full">
                Usar otra cuenta de Google
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
