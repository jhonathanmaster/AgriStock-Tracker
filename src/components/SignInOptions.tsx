"use client";

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { api, RequestError } from '@/lib/data-store';
import { refreshSession } from '@/lib/session';

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 6.13l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

interface Props {
  /** Where to come back after Google sign-in (relative path). */
  returnTo?: string;
  /** Pre-filled (and fixed) email, e.g. from an invitation link. */
  email?: string;
  /** Start on "create account" (invitations). */
  preferRegister?: boolean;
  onSignedIn: () => void;
  onError: (message: string) => void;
}

/** Google button + email/password form, depending on what the server has enabled. */
export function SignInOptions({ returnTo = '/', email: fixedEmail, preferRegister, onSignedIn, onError }: Props) {
  const [config, setConfig] = useState<{ google: boolean; passwordLogin: boolean } | null>(null);
  const [mode, setMode] = useState<'login' | 'register'>(preferRegister ? 'register' : 'login');
  const [email, setEmail] = useState(fixedEmail || '');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    api<{ google: boolean; passwordLogin: boolean }>('GET', '/api/auth/config')
      .then(setConfig)
      .catch(() => setConfig({ google: false, passwordLogin: true }));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === 'login') await api('POST', '/api/auth/login', { email, password });
      else await api('POST', '/api/auth/register', { email, password, displayName: displayName || undefined });
      await refreshSession();
      onSignedIn();
    } catch (err) {
      onError(err instanceof RequestError ? err.message : 'No se pudo iniciar sesión. Revisa tu conexión.');
    } finally {
      setBusy(false);
    }
  };

  if (!config) return <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />;

  return (
    <div className="space-y-4 text-left">
      {config.google && (
        <Button
          type="button"
          onClick={() => {
            setRedirecting(true);
            window.location.href = `/api/auth/google/start?returnTo=${encodeURIComponent(returnTo)}`;
          }}
          disabled={redirecting}
          className="w-full h-12 text-lg font-semibold gap-3 bg-white text-foreground border border-border hover:bg-secondary/50 shadow-sm"
          variant="outline"
        >
          {redirecting ? <Loader2 className="w-5 h-5 animate-spin" /> : <GoogleIcon />}
          {redirecting ? 'Conectando...' : 'Entrar con Google'}
        </Button>
      )}

      {config.google && config.passwordLogin && (
        <div className="flex items-center gap-3 text-[10px] uppercase tracking-wider text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> o con tu correo <div className="h-px flex-1 bg-border" />
        </div>
      )}

      {config.passwordLogin && (
        <form onSubmit={submit} className="space-y-3">
          {mode === 'register' && (
            <div className="space-y-1">
              <Label htmlFor="displayName">Nombre</Label>
              <Input id="displayName" autoComplete="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
          )}
          <div className="space-y-1">
            <Label htmlFor="email">Correo</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              readOnly={!!fixedEmail}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
              minLength={mode === 'register' ? 8 : 1}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {mode === 'register' && <p className="text-[11px] text-muted-foreground">Mínimo 8 caracteres.</p>}
          </div>
          <Button type="submit" className="w-full h-11 font-semibold" disabled={busy}>
            {busy && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            {mode === 'login' ? 'Entrar' : 'Crear cuenta'}
          </Button>
          <button
            type="button"
            className="w-full text-xs text-muted-foreground hover:text-primary underline-offset-4 hover:underline"
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          >
            {mode === 'login' ? '¿Te invitaron y no tienes contraseña? Crea tu cuenta' : 'Ya tengo cuenta: iniciar sesión'}
          </button>
        </form>
      )}

      {!config.google && !config.passwordLogin && (
        <p className="text-sm text-muted-foreground text-center">No hay ningún método de acceso configurado en el servidor.</p>
      )}
    </div>
  );
}
