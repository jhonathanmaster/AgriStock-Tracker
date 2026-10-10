
"use client";

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAgriStock } from '@/lib/store';
import { useUser } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  UserPlus, 
  Eye, 
  Trash2, 
  Pencil, 
  ChevronLeft, 
  ChevronRight, 
  Mail, 
  CheckCircle2, 
  ShieldCheck, 
  ShieldAlert,
  UserCircle
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { UserProfile, UserRole } from '@/lib/types';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { LoadingScreen } from '@/components/LoadingScreen';

interface DisplayUser extends Partial<UserProfile> {
  uid: string;
  email: string;
  isInvitationOnly?: boolean;
  status?: 'pending' | 'accepted';
}

export default function AdminPage() {
  const { users, invitations, deleteUser, inviteUser, approveInvitation, updateUserDetails, updateUserRole, isLoading, isAdmin, isSuperAdmin } = useAgriStock();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [userToDelete, setUserToDelete] = useState<DisplayUser | null>(null);
  const [viewingUserDetails, setViewingUserDetails] = useState<DisplayUser | null>(null);

  const [editingUser, setEditingUser] = useState<DisplayUser | null>(null);
  const [editDetails, setEditDetails] = useState({
    identificationNumber: '',
    phone: '',
    address: '',
    photoURL: '',
    role: 'operario' as UserRole
  });

  useEffect(() => {
    setMounted(true);
    if (!isUserLoading && !user) {
      router.push('/login');
    } else if (!isUserLoading && !isLoading && user && !isAdmin) {
      router.push('/');
    }
  }, [user, isUserLoading, isLoading, isAdmin, router]);

  const combinedUsers = useMemo(() => {
    const list: DisplayUser[] = (users || []).map(u => ({ ...u, status: 'accepted' as const }));
    (invitations || []).forEach(inv => {
      if (!(users || []).some(u => u.email.toLowerCase() === inv.email.toLowerCase())) {
        list.push({
          uid: `inv-${inv.email}`,
          email: inv.email,
          displayName: inv.email.split('@')[0],
          photoURL: inv.photoURL || null,
          enabled: inv.enabled !== false,
          role: inv.role || 'operario',
          lastLogin: inv.acceptedAt || inv.invitedAt,
          isInvitationOnly: true,
          status: inv.status,
          identificationNumber: inv.identificationNumber,
          phone: inv.phone,
          address: inv.address
        });
      }
    });
    return list.sort((a, b) => a.email.localeCompare(b.email));
  }, [users, invitations]);

  const totalPages = Math.ceil(combinedUsers.length / itemsPerPage);
  const paginatedUsers = combinedUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (isUserLoading || isLoading || !mounted) return <LoadingScreen />;
  if (!user || !isAdmin) return null;

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setIsSending(true);
    try {
      await inviteUser(inviteEmail.trim());
      setInviteEmail('');
      setIsInviteOpen(false);
      toast({ title: "Invitación Enviada" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsSending(false);
    }
  };

  const handleUpdateDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      updateUserDetails(editingUser.uid, editingUser.email, {
        identificationNumber: editDetails.identificationNumber,
        phone: editDetails.phone,
        address: editDetails.address,
        photoURL: editDetails.photoURL
      });
      
      // Solo el superadmin puede cambiar roles de otros
      if (isSuperAdmin) {
        updateUserRole(editingUser.uid, editingUser.email, editDetails.role);
      }

      setEditingUser(null);
      toast({ title: "Perfil Actualizado" });
    }
  };

  return (
    <main className="flex-1 p-8 space-y-8 overflow-auto">
      <header className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <div>
            <h1 className="text-3xl font-bold">Gestión de Acceso</h1>
            <p className="text-muted-foreground">Administra privilegios y perfiles de operarios</p>
          </div>
        </div>
        <Button className="gap-2" onClick={() => setIsInviteOpen(true)}>
          <UserPlus className="w-4 h-4" /> Invitar Operario
        </Button>
      </header>

      <Card className="shadow-md">
        <CardHeader className="border-b pb-4">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> 
            Equipo de Trabajo ({combinedUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Rol / Privilegios</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedUsers.map((u) => (
                <TableRow key={u.uid} className="hover:bg-muted/20">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border">
                        <AvatarImage src={u.photoURL || ''} />
                        <AvatarFallback className="bg-primary/10 text-primary">{u.email.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-bold text-sm text-primary">{u.displayName || u.email.split('@')[0]}</span>
                        <span className="text-[10px] text-muted-foreground italic flex items-center gap-1">
                          <Mail className="w-2.5 h-2.5" /> {u.email}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {u.role === 'admin' ? (
                      <Badge variant="default" className="gap-1 bg-accent hover:bg-accent">
                        <ShieldCheck className="w-3 h-3" /> Administrador
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 text-muted-foreground">
                        <UserCircle className="w-3 h-3" /> Operario
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.enabled ? "secondary" : "destructive"} className="text-[10px]">
                      {u.enabled ? "Habilitado" : "Inhabilitado"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {u.status === 'pending' && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600" title="Aprobar Manual" onClick={() => approveInvitation(u.email)}>
                          <CheckCircle2 className="w-4 h-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500" title="Ver Detalles" onClick={() => setViewingUserDetails(u)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" title="Editar Perfil" onClick={() => { 
                        setEditingUser(u); 
                        setEditDetails({ 
                          identificationNumber: u.identificationNumber || '', 
                          phone: u.phone || '', 
                          address: u.address || '', 
                          photoURL: u.photoURL || '',
                          role: u.role || 'operario'
                        }); 
                      }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      {isSuperAdmin && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Eliminar Acceso" onClick={() => setUserToDelete(u)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          <div className="flex items-center justify-between p-4 border-t bg-muted/10">
            <div className="text-xs text-muted-foreground italic">
              Página {currentPage} de {totalPages || 1}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages || totalPages === 0}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* DIALOG DE INVITACIÓN */}
      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              Invitar Operario
            </DialogTitle>
            <CardDescription>Envía una invitación por correo para acceder al sistema.</CardDescription>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Correo Electrónico (Google)</Label>
              <Input type="email" placeholder="ejemplo@gmail.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} required />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsInviteOpen(false)} type="button">Cancelar</Button>
              <Button type="submit" disabled={isSending}>
                {isSending ? 'Enviando...' : 'Enviar Invitación'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG DE EDICIÓN */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Perfil: {editingUser?.email}</DialogTitle>
            <CardDescription>Actualiza los datos personales y asigna roles.</CardDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateDetails} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Identificación</Label>
                <Input value={editDetails.identificationNumber} onChange={e => setEditDetails({...editDetails, identificationNumber: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input value={editDetails.phone} onChange={e => setEditDetails({...editDetails, phone: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Dirección</Label>
              <Input value={editDetails.address} onChange={e => setEditDetails({...editDetails, address: e.target.value})} />
            </div>

            {isSuperAdmin && (
              <div className="space-y-2 bg-accent/5 p-4 rounded-lg border border-accent/20">
                <Label className="text-accent font-bold flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" /> Asignar Rol Administrativo
                </Label>
                <Select value={editDetails.role} onValueChange={(v) => setEditDetails({...editDetails, role: v as UserRole})}>
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="operario">Operario (Solo Ventas y Movimientos)</SelectItem>
                    <SelectItem value="admin">Administrador (Control Total)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground mt-1">
                  * Los administradores pueden gestionar inventario, proveedores y configuraciones globales.
                </p>
              </div>
            )}

            <DialogFooter className="pt-4">
              <Button variant="outline" onClick={() => setEditingUser(null)} type="button">Cancelar</Button>
              <Button type="submit">Guardar Cambios</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG DE VISUALIZACIÓN */}
      <Dialog open={!!viewingUserDetails} onOpenChange={(o) => !o && setViewingUserDetails(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Información del Usuario</DialogTitle>
          </DialogHeader>
          {viewingUserDetails && (
            <div className="space-y-6 py-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border">
                  <AvatarImage src={viewingUserDetails.photoURL || ''} />
                  <AvatarFallback className="text-xl">{viewingUserDetails.email.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-bold">{viewingUserDetails.displayName || 'Sin nombre'}</h3>
                  <p className="text-sm text-muted-foreground">{viewingUserDetails.email}</p>
                  <Badge className="mt-1 uppercase text-[9px]">{viewingUserDetails.role}</Badge>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 text-sm bg-muted/30 p-4 rounded-xl border">
                <p><b>ID Fiscal:</b> {viewingUserDetails.identificationNumber || 'N/A'}</p>
                <p><b>Teléfono:</b> {viewingUserDetails.phone || 'N/A'}</p>
                <p><b>Dirección:</b> {viewingUserDetails.address || 'N/A'}</p>
                <p><b>Último Acceso:</b> {viewingUserDetails.lastLogin ? new Date(viewingUserDetails.lastLogin).toLocaleString() : 'Nunca'}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingUserDetails(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ALERTA DE ELIMINACIÓN */}
      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="w-5 h-5" /> ¿Confirmar Eliminación?
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas revocar el acceso a <b>{userToDelete?.email}</b>? 
              Se eliminará su perfil y cualquier invitación pendiente. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (userToDelete) deleteUser(userToDelete.uid, userToDelete.email); setUserToDelete(null); }} className="bg-destructive hover:bg-destructive/90">
              Revocar Acceso
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
