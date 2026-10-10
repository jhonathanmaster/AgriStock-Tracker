"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAgriStock } from '@/lib/store';
import { useUser } from '@/lib/session';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, Truck, ShieldAlert, Pencil, Mail, Phone, MapPin, X, AlertTriangle, ChevronLeft, ChevronRight, Fingerprint } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { LoadingScreen } from '@/components/LoadingScreen';
import { Supplier } from '@/lib/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function AdminSuppliersPage() {
  const { suppliers, addSupplier, deleteSupplier, updateSupplier, isLoading, isAdmin, profile } = useAgriStock();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  const [formData, setFormData] = useState({
    name: '',
    identificationNumber: '',
    contactName: '',
    phone: '',
    email: '',
    address: ''
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lógica de protección de ruta mejorada
  useEffect(() => {
    if (mounted && !isUserLoading && !isLoading) {
      if (!user) {
        router.push('/login');
      } else if (!isAdmin) {
        toast({
          variant: "destructive",
          title: "Acceso Denegado",
          description: "No tienes permisos de administrador para ver este módulo."
        });
        router.push('/');
      }
    }
  }, [user, isUserLoading, isLoading, router, isAdmin, mounted, toast]);

  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);

  if (isUserLoading || isLoading || !mounted || (user && !isAdmin)) {
    return <LoadingScreen />;
  }

  if (!user || !isAdmin) return null;

  const totalPages = Math.ceil(suppliers.length / itemsPerPage);
  const paginatedSuppliers = suppliers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingSupplierId) {
      updateSupplier(editingSupplierId, formData);
      toast({ title: "Proveedor Actualizado", description: "Los cambios han sido guardados exitosamente." });
      setEditingSupplierId(null);
    } else {
      addSupplier(formData);
      toast({ title: "Proveedor Registrado", description: `${formData.name} añadido.` });
    }
    
    setFormData({ name: '', identificationNumber: '', contactName: '', phone: '', email: '', address: '' });
  };

  const handleEditClick = (sup: Supplier) => {
    setEditingSupplierId(sup.id);
    setFormData({
      name: sup.name,
      identificationNumber: sup.identificationNumber || '',
      contactName: sup.contactName || '',
      phone: sup.phone || '',
      email: sup.email || '',
      address: sup.address || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => {
    setEditingSupplierId(null);
    setFormData({ name: '', identificationNumber: '', contactName: '', phone: '', email: '', address: '' });
  };

  const confirmDelete = () => {
    if (supplierToDelete) {
      deleteSupplier(supplierToDelete.id);
      if (editingSupplierId === supplierToDelete.id) handleCancel();
      toast({ 
        title: "Proveedor Eliminado", 
        description: `El proveedor ${supplierToDelete.name} ha sido removido.` 
      });
      setSupplierToDelete(null);
    }
  };

  return (
    <main className="flex-1 p-8 space-y-8 overflow-auto">
      <header className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Gestión de Proveedores</h1>
            <p className="text-muted-foreground">Administra quién suministra productos e insumos</p>
          </div>
        </div>
        <Badge variant="outline" className="gap-2 px-4 py-1 text-accent border-accent">
          <ShieldAlert className="w-4 h-4" />
          Administrador: {profile?.displayName || user.email}
        </Badge>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="h-fit border-primary/20 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              {editingSupplierId ? <Pencil className="w-5 h-5 text-primary" /> : <Plus className="w-5 h-5 text-primary" />}
              {editingSupplierId ? 'Editar Proveedor' : 'Nuevo Proveedor'}
            </CardTitle>
            <CardDescription>
              {editingSupplierId ? 'Modifica la información del proveedor seleccionado' : 'Registra un nuevo contacto para tu cadena de suministro'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre de la Empresa *</Label>
                <Input 
                  value={formData.name} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})} 
                  placeholder="Ej: AgroInsumos del Norte"
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Fingerprint className="w-3.5 h-3.5 text-muted-foreground" />
                  Identificación (NIT / CC)
                </Label>
                <Input 
                  value={formData.identificationNumber} 
                  onChange={(e) => setFormData({...formData, identificationNumber: e.target.value})} 
                  placeholder="Documento tributario o personal"
                />
              </div>
              <div className="space-y-2">
                <Label>Nombre de Contacto</Label>
                <Input 
                  value={formData.contactName} 
                  onChange={(e) => setFormData({...formData, contactName: e.target.value})} 
                  placeholder="Persona encargada"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input 
                    value={formData.phone} 
                    onChange={(e) => setFormData({...formData, phone: e.target.value})} 
                    placeholder="300..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Correo</Label>
                  <Input 
                    type="email"
                    value={formData.email} 
                    onChange={(e) => setFormData({...formData, email: e.target.value})} 
                    placeholder="proveedor@email.com"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Dirección</Label>
                <Input 
                  value={formData.address} 
                  onChange={(e) => setFormData({...formData, address: e.target.value})} 
                  placeholder="Ubicación física"
                />
              </div>
              <div className="flex gap-2 pt-2">
                {editingSupplierId && (
                  <Button type="button" variant="outline" className="flex-1 gap-2" onClick={handleCancel}>
                    <X className="w-4 h-4" />
                    Cancelar
                  </Button>
                )}
                <Button type="submit" className="flex-1 gap-2">
                  {editingSupplierId ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {editingSupplierId ? 'Guardar Cambios' : 'Guardar Proveedor'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Truck className="w-5 h-5 text-primary" />
              Proveedores Registrados ({suppliers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa / ID</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Información</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-10 text-muted-foreground italic">
                      No hay proveedores registrados aún.
                    </TableCell>
                  </TableRow>
                ) : paginatedSuppliers.map((sup) => (
                  <TableRow key={sup.id} className={editingSupplierId === sup.id ? "bg-primary/5" : ""}>
                    <TableCell>
                      <div className="font-bold text-primary">{sup.name}</div>
                      <div className="text-[10px] text-muted-foreground uppercase font-mono">
                        {sup.identificationNumber || 'Sin identificación'}
                      </div>
                      <div className="text-[9px] text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="w-2.5 h-2.5" /> {sup.address || 'Sin dirección'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{sup.contactName || '-'}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {sup.phone && <div className="text-xs flex items-center gap-1.5"><Phone className="w-3 h-3 text-muted-foreground" /> {sup.phone}</div>}
                        {sup.email && <div className="text-xs flex items-center gap-1.5"><Mail className="w-3 h-3 text-muted-foreground" /> {sup.email}</div>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-primary hover:bg-primary/10"
                          onClick={() => handleEditClick(sup)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={() => setSupplierToDelete(sup)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-4 border-t bg-muted/10 mt-4 gap-4">
              <div className="flex items-center gap-4 order-2 sm:order-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">Ver:</span>
                  <Select value={itemsPerPage.toString()} onValueChange={(v) => setItemsPerPage(Number(v))}>
                    <SelectTrigger className="h-8 w-[70px] bg-white text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[5, 10, 20, 50, 100].map(n => (
                        <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-sm text-muted-foreground">
                  Página <span className="font-medium">{currentPage}</span> de <span className="font-medium">{totalPages || 1}</span>
                </div>
              </div>
              <div className="flex gap-2 order-1 sm:order-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Anterior
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="gap-1"
                >
                  Siguiente
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!supplierToDelete} onOpenChange={(open) => !open && setSupplierToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              ¿Confirmar Eliminación?
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar al proveedor <strong>{supplierToDelete?.name}</strong>? 
              Esta acción no se puede deshacer y el proveedor dejará de estar disponible en el sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90 text-white"
            >
              Eliminar Proveedor
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}