
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { GoogleAuthProvider, signInWithPopup, User } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sprout, Loader2, ShieldAlert, ArrowLeft } from 'lucide-react';
import { LoadingScreen } from '@/components/LoadingScreen';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function LoginPage() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  const syncUserProfile = async (loggedUser: User) => {
    const now = new Date().toISOString();
    const userRef = doc(db, 'users', loggedUser.uid);
    
    try {
      const userDoc = await getDoc(userRef);
      const cleanEmail = (loggedUser.email || '').toLowerCase().trim();
      const isInitialAdmin = cleanEmail === 'jhonathanmaster@gmail.com' || loggedUser.uid === 'SvWvlCyfZugtPerM2IUhbxNsUVz2';

      if (!userDoc.exists()) {
        const invitationRef = doc(db, 'invitations', cleanEmail);
        const invitationDoc = await getDoc(invitationRef);
        
        const hasInvitation = invitationDoc.exists();
        const invData = invitationDoc.data();

        // El usuario está habilitado si es el administrador principal o tiene una invitación
        const isEnabled = isInitialAdmin || hasInvitation;

        await setDoc(userRef, {
          uid: loggedUser.uid,
          email: loggedUser.email,
          displayName: loggedUser.displayName || cleanEmail.split('@')[0],
          photoURL: loggedUser.photoURL,
          enabled: isEnabled,
          lastLogin: now,
          accessHistory: [now],
          identificationNumber: invData?.identificationNumber || '',
          phone: invData?.phone || '',
          address: invData?.address || '',
          role: isInitialAdmin ? 'admin' : (invData?.role || 'operario')
        });

        if (hasInvitation && invData && invData.status === 'pending') {
          await updateDoc(invitationRef, { 
            status: 'accepted',
            acceptedAt: now,
            enabled: true 
          });
        }
      } else {
        const existingData = userDoc.data();
        const history = existingData.accessHistory || [];
        const newHistory = [now, ...history].slice(0, 10);

        // Actualizar último login y asegurar que el admin principal siempre tenga rol admin y esté habilitado
        await setDoc(userRef, {
          lastLogin: now,
          accessHistory: newHistory,
          enabled: existingData.enabled || isInitialAdmin,
          role: isInitialAdmin ? 'admin' : (existingData.role || 'operario'),
          displayName: existingData.displayName || loggedUser.displayName,
          photoURL: loggedUser.photoURL || existingData.photoURL,
        }, { merge: true });
      }
    } catch (error) {
      console.error("Error sincronizando perfil:", error);
    }
  };

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setAuthError(null);
    setIsLoggingIn(true);
    
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    
    try {
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        await syncUserProfile(result.user);
      }
    } catch (error: any) {
      console.error("Error iniciando sesion:", error);
      let errorMessage = "No se pudo completar el inicio de sesion.";
      
      if (error.code === 'auth/unauthorized-domain') {
        errorMessage = "Error de Red: Dominio no autorizado en Firebase.";
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = "La ventana emergente fue bloqueada por el navegador.";
      }

      setAuthError(errorMessage);
      toast({
        variant: "destructive",
        title: "Fallo de Autenticacion",
        description: errorMessage
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

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
              Inicia sesión con tu cuenta de Google autorizada para gestionar el sistema.
            </p>
            <Button 
              onClick={handleLogin} 
              disabled={isLoggingIn}
              className="w-full h-12 text-lg font-semibold gap-3 bg-white text-foreground border border-border hover:bg-secondary/50 shadow-sm"
              variant="outline"
            >
              {isLoggingIn ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 6.13l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              )}
              {isLoggingIn ? 'Conectando...' : 'Entrar con Google'}
            </Button>
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
