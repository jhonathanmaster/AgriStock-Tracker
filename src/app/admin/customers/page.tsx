
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAgriStock } from '@/lib/store';
import { useUser } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Trash2, 
  Pencil, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  UserPlus, 
  Contact, 
  Mail, 
  Phone, 
  MapPin, 
  Fingerprint,
  CalendarDays,
  X,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Customer } from '@/lib/types';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { LoadingScreen } from '@/components/LoadingScreen';
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

export default function AdminCustomersPage() {
  const { customers, saveCustomer, deleteCustomer, isLoading, isAdmin, isSuperAdmin } = useAgriStock();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [formData, setFormData] = useState({
    id: '',
    name: '',
    identificationNumber: '',
    phone: '',
    email: '',
    address: ''
  });

  useEffect(() => {
    setMounted(true);
    if (!isUserLoading && !user) {
      router.push('/login');
    } else if (!isUserLoading && !isLoading && user && !isAdmin) {
      router.push('/');
    }
  }, [user, isUserLoading, isLoading, router, isAdmin]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, itemsPerPage]);

  // Autocomplete logic for existing customers based on phone or email
  useEffect(() => {
    if (editingCustomer) return;

    const hasPhone = formData.phone.length >= 7;
    const hasEmail = formData.email.includes('@') && formData.email.includes('.');

    if (hasPhone || hasEmail) {
      const found = (customers || []).find(c => 
        (formData.phone && c.phone === formData.phone) || 
        (formData.email && c.email?.toLowerCase() === formData.email.toLowerCase())
      );

      if (found) {
        setFormData(prev => ({
          ...prev,
          id: found.id,
          name: found.name || prev.name,
          identificationNumber: found.identificationNumber || prev.identificationNumber,
          address: found.address || prev.address,
          email: found.email || prev.email,
          phone: found.phone || prev.phone
        }));
      }
    }
  }, [formData.phone, formData.email, customers, editingCustomer]);

  if (isUserLoading || isLoading || !mounted) {
    return <LoadingScreen />;
  }

  if (!user || !isAdmin) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Nombre y teléfono son campos obligatorios." });
      return;
    }
    
    saveCustomer(formData);
    resetForm();
    toast({ 
      title: editingCustomer ? "Cliente Actualizado" : "Cliente Registrado",
      description: `Los datos de ${formData.name} se han guardado exitosamente.`
    });
  };

  const resetForm = () => {
    setFormData({ id: '', name: '', identificationNumber: '', phone: '', email: '', address: '' });
    setEditingCustomer(null);
  };

  const handleEdit = (cust: Customer) => {
    setEditingCustomer(cust);
    setFormData({
      id: cust.id,
      name: cust.name,
      identificationNumber: cust.identificationNumber || '',
      phone: cust.phone,
      email: cust.email || '',
      address: cust.address || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const confirmDelete = () => {
    if (customerToDelete) {
      deleteCustomer(customerToDelete.id);
      if (editingCustomer?.id === customerToDelete.id) resetForm();
      toast({ title: "Cliente Eliminado", description: `${customerToDelete.name} ha sido removido del directorio.` });
      customerToDelete && setCustomerToDelete(null);
    }
  };

  const filteredCustomers = (customers || []).filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm) ||
    c.identificationNumber?.includes(searchTerm) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const paginatedCustomers = filteredCustomers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <main className="flex-1 p-8 space-y-8 overflow-auto">
      <header className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Directorio de Clientes</h1>
            <p className="text-muted-foreground">Base de datos centralizada de compradores y prospectos</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="h-fit shadow-md border-primary/10">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              {editingCustomer ? <Pencil className="w-5 h-5 text-primary" /> : <UserPlus className="w-5 h-5 text-primary" />}
              {editingCustomer ? 'Editar Información' : 'Nuevo Cliente'}
            </CardTitle>
            <CardDescription>Completa todos los campos para mantener un registro detallado.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> Teléfono *</Label>
                <Input 
                  value={formData.phone} 
                  onChange={(e) => setFormData({...formData, phone: e.target.value})} 
                  placeholder="Ej: 3001234567"
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Contact className="w-3.5 h-3.5" /> Nombre Completo *</Label>
                <Input 
                  value={formData.name} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})} 
                  placeholder="Nombre del cliente o empresa"
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Fingerprint className="w-3.5 h-3.5" /> Identificación (CC / NIT)</Label>
                <Input 
                  value={formData.identificationNumber} 
                  onChange={(e) => setFormData({...formData, identificationNumber: e.target.value})} 
                  placeholder="Documento de identidad"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> Correo Electrónico</Label>
                <Input 
                  type="email"
                  value={formData.email} 
                  onChange={(e) => setFormData({...formData, email: e.target.value})} 
                  placeholder="cliente@ejemplo.com"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" /> Dirección de Entrega</Label>
                <Input 
                  value={formData.address} 
                  onChange={(e) => setFormData({...formData, address: e.target.value})} 
                  placeholder="Ubicación o finca"
                />
              </div>
              
              <div className="flex gap-2 pt-2">
                {editingCustomer && (
                  <Button type="button" variant="outline" className="flex-1" onClick={resetForm}>
                    <X className="w-4 h-4 mr-2" /> Cancelar
                  </Button>
                )}
                <Button type="submit" className="flex-1">
                  {editingCustomer ? 'Guardar Cambios' : 'Registrar Cliente'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
            <CardTitle className="text-lg">Listado de Clientes ({filteredCustomers.length})</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar..." 
                className="pl-9" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead>Cliente / ID</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Ubicación</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedCustomers.map((cust) => (
                  <TableRow key={cust.id} className="hover:bg-muted/20">
                    <TableCell>
                      <div className="font-bold text-primary">{cust.name}</div>
                      <div className="text-[10px] text-muted-foreground font-mono uppercase">
                        {cust.identificationNumber || 'Sin identificación'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="text-xs flex items-center gap-1.5"><Phone className="w-3 h-3 text-primary" /> {cust.phone}</div>
                        {cust.email && <div className="text-[10px] text-muted-foreground flex items-center gap-1.5"><Mail className="w-3 h-3" /> {cust.email}</div>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-accent" />
                        {cust.address || 'No registrada'}
                      </div>
                      {cust.lastPurchaseDate && (
                        <div className="text-[9px] mt-1 flex items-center gap-1 text-muted-foreground">
                          <CalendarDays className="w-2.5 h-2.5" /> Últ. Venta: {new Date(cust.lastPurchaseDate).toLocaleDateString()}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => handleEdit(cust)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive" 
                          onClick={() => setCustomerToDelete(cust)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredCustomers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center text-muted-foreground italic">
                      No se encontraron clientes que coincidan con la búsqueda.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t bg-muted/10 gap-4">
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
                <div className="text-xs text-muted-foreground">
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
                  <ChevronLeft className="w-4 h-4" /> Anterior
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="gap-1"
                >
                  Siguiente <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!customerToDelete} onOpenChange={(open) => !open && setCustomerToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              ¿Confirmar Eliminación?
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar a <strong>{customerToDelete?.name}</strong>? 
              Esta acción no se puede deshacer y el registro se perderá permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90 text-white"
            >
              Eliminar Cliente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
