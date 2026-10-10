
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
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Plus, ListTodo, ShieldAlert, Pencil, ArrowDown01, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { LoadingScreen } from '@/components/LoadingScreen';
import { PurchaseOrderStatusDefinition } from '@/lib/types';

export default function AdminPurchaseOrderStatusPage() {
  const { 
    purchaseOrderStatusDefinitions, 
    addPurchaseOrderStatusDefinition, 
    updatePurchaseOrderStatusDefinition, 
    deletePurchaseOrderStatusDefinition, 
    isLoading,
    isAdmin,
    isSuperAdmin
  } = useAgriStock();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  
  const [mounted, setMounted] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    description: '', 
    color: '#4D7C0F', 
    order: '0' 
  });

  useEffect(() => {
    setMounted(true);
    if (!isUserLoading && !user) {
      router.push('/login');
    } else if (!isUserLoading && !isLoading && user && !isAdmin) {
      router.push('/');
    }
  }, [user, isUserLoading, isLoading, router, isAdmin]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const statusData = {
      name: formData.name,
      description: formData.description,
      color: formData.color,
      order: Number(formData.order)
    };

    if (editingId) {
      updatePurchaseOrderStatusDefinition(editingId, statusData);
      setEditingId(null);
      toast({
        title: "Estado Actualizado",
        description: `El estado "${formData.name}" ha sido modificado exitosamente.`
      });
    } else {
      addPurchaseOrderStatusDefinition(statusData);
      toast({
        title: "Estado Registrado",
        description: `El estado "${formData.name}" ha sido añadido al sistema.`
      });
    }

    setFormData({ name: '', description: '', color: '#4D7C0F', order: '0' });
  };

  const handleEditClick = (status: PurchaseOrderStatusDefinition) => {
    setEditingId(status.id);
    setFormData({
      name: status.name,
      description: status.description || '',
      color: status.color || '#4D7C0F',
      order: (status.order || 0).toString()
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ name: '', description: '', color: '#4D7C0F', order: '0' });
  };

  if (isUserLoading || !user || !isAdmin || !mounted || isLoading) {
    return <LoadingScreen />;
  }

  return (
    <main className="flex-1 p-8 space-y-8 overflow-auto">
      <header className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Estados de Órdenes de Compra</h1>
            <p className="text-muted-foreground">Define las etapas y su representación visual</p>
          </div>
        </div>
        <Badge variant="outline" className="gap-2 px-4 py-1 text-accent border-accent">
          <ShieldAlert className="w-4 h-4" />
          Administrador
        </Badge>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="h-fit border-primary/20 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              {editingId ? <Pencil className="w-5 h-5 text-primary" /> : <Plus className="w-5 h-5 text-primary" />}
              {editingId ? 'Editar Estado' : 'Nuevo Estado'}
            </CardTitle>
            <CardDescription>
              {editingId ? 'Modifica los detalles del estado seleccionado' : 'Crea un nuevo estado con color personalizado'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre del Estado</Label>
                <Input 
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Ej: Pendiente de Pago"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="color">Color</Label>
                  <div className="flex gap-2 items-center">
                    <Input 
                      id="color"
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({...formData, color: e.target.value})}
                      className="w-full h-10 p-1 cursor-pointer"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="order">Posición/Orden</Label>
                  <Input 
                    id="order"
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData({...formData, order: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea 
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Explica qué significa este estado..."
                  className="h-24"
                />
              </div>
              <div className="flex gap-2">
                {editingId && (
                  <Button type="button" variant="outline" className="flex-1 gap-2" onClick={cancelEdit}>
                    <X className="w-4 h-4" />
                    Cancelar
                  </Button>
                )}
                <Button type="submit" className="flex-1 gap-2">
                  {editingId ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {editingId ? 'Actualizar Estado' : 'Guardar Estado'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ListTodo className="w-5 h-5 text-primary" />
              Estados Definidos ({purchaseOrderStatusDefinitions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Orden</TableHead>
                  <TableHead className="w-12">Color</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10">Cargando...</TableCell>
                  </TableRow>
                ) : purchaseOrderStatusDefinitions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                      No hay estados definidos aún.
                    </TableCell>
                  </TableRow>
                ) : purchaseOrderStatusDefinitions.map((status) => (
                  <TableRow key={status.id} className={editingId === status.id ? "bg-primary/5" : ""}>
                    <TableCell className="font-mono font-bold text-center">
                      <div className="flex items-center justify-center gap-1">
                         <ArrowDown01 className="w-3 h-3 text-muted-foreground" />
                         {status.order}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div 
                        className="w-6 h-6 rounded-full border border-border shadow-sm" 
                        style={{ backgroundColor: status.color || '#4D7C0F' }}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <Badge 
                        variant="outline" 
                        style={{ borderColor: status.color, color: status.color, backgroundColor: `${status.color}10` }}
                      >
                        {status.name}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{status.description || '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-primary hover:text-primary hover:bg-primary/10"
                          onClick={() => handleEditClick(status)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            if(confirm('¿Seguro que deseas eliminar este estado?')) {
                              deletePurchaseOrderStatusDefinition(status.id);
                              if (editingId === status.id) cancelEdit();
                              toast({ title: "Estado Eliminado" });
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
