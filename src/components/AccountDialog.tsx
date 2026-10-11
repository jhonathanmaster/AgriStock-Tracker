"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { api, RequestError } from '@/lib/data-store';
import { refreshSession } from '@/lib/session';

/** "Mi cuenta": create or change the password (useful for accounts that came from Google/Firebase). */
export function AccountDialog({
  open,
  onOpenChange,
  email,
  hasPassword,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  hasPassword: boolean;
}) {
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirm) {
      toast({ variant: 'destructive', title: 'Las contraseñas no coinciden' });
      return;
    }
    setBusy(true);
    try {
      await api('POST', '/api/auth/password', { currentPassword: hasPassword ? currentPassword : undefined, newPassword });
      await refreshSession();
      toast({ title: hasPassword ? 'Contraseña cambiada' : 'Contraseña creada', description: 'Se cerró la sesión en tus otros dispositivos.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirm('');
      onOpenChange(false);
    } catch (err) {
      toast({ variant: 'destructive', title: 'No se pudo guardar', description: err instanceof RequestError ? err.message : 'Revisa tu conexión.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Mi cuenta</DialogTitle>
          <DialogDescription>
            {email}. {hasPassword ? 'Cambia tu contraseña.' : 'Entras con Google; puedes crear también una contraseña.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          {hasPassword && (
            <div className="space-y-1">
              <Label htmlFor="currentPassword">Contraseña actual</Label>
              <Input id="currentPassword" type="password" autoComplete="current-password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            </div>
          )}
          <div className="space-y-1">
            <Label htmlFor="newPassword">Nueva contraseña</Label>
            <Input id="newPassword" type="password" autoComplete="new-password" minLength={8} required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="confirmPassword">Repite la nueva contraseña</Label>
            <Input id="confirmPassword" type="password" autoComplete="new-password" minLength={8} required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={busy}>{busy ? 'Guardando...' : 'Guardar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
