
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAgriStock } from '@/lib/store';
import { useUser } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Pencil, ChevronLeft, ChevronRight, Tags } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ExpenseCategory } from '@/lib/types';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { LoadingScreen } from '@/components/LoadingScreen';

export default function AdminExpenseCategoriesPage() {
  const { expenseCategories, addExpenseCategory, deleteExpenseCategory, updateExpenseCategory, seedCommonExpenseCategories, isLoading, isAdmin } = useAgriStock();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [newName, setNewName] = useState('');
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [editName, setEditName] = useState('');

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
  }, [itemsPerPage]);

  if (isUserLoading || isLoading || !mounted) {
    return <LoadingScreen />;
  }

  if (!user || !isAdmin) return null;

  const totalPages = Math.ceil(expenseCategories.length / itemsPerPage);
  const paginatedCategories = expenseCategories.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    addExpenseCategory(newName.trim());
    setNewName('');
    toast({ title: "Categoría de Gasto Registrada", description: `${newName} ha sido añadida.` });
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editName.trim()) return;
    updateExpenseCategory(editingCategory.id, editName.trim());
    setEditingCategory(null);
    setEditName('');
    toast({ title: "Categoría Actualizada" });
  };

  return (
    <main className="flex-1 p-8 space-y-8 overflow-auto">
      <header className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Tags className="w-8 h-8 text-primary" />
              Categorías de Gastos
            </h1>
            <p className="text-muted-foreground">Administra las clasificaciones para tus egresos</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => seedCommonExpenseCategories()}>Cargar Categorías Base</Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>{editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={editingCategory ? handleUpdate : handleAdd} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="categoryName">Nombre de la Clasificación</Label>
                <Input 
                  id="categoryName" 
                  value={editingCategory ? editName : newName} 
                  onChange={(e) => editingCategory ? setEditName(e.target.value) : setNewName(e.target.value)} 
                  placeholder="Ej: Impuestos"
                  required 
                />
              </div>
              <div className="flex gap-2">
                {editingCategory && (
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setEditingCategory(null)}>Cancelar</Button>
                )}
                <Button type="submit" className="flex-1">{editingCategory ? 'Actualizar' : 'Guardar'}</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Clasificaciones Registradas</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedCategories.map((cat) => (
                  <TableRow key={cat.id}>
                    <TableCell className="font-medium">{cat.name}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => { setEditingCategory(cat); setEditName(cat.name); }}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => {
                        if(confirm(`¿Eliminar la categoría "${cat.name}"?`)) {
                          deleteExpenseCategory(cat.id);
                          toast({ title: "Categoría Eliminada" });
                        }
                      }}><Trash2 className="w-4 h-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {expenseCategories.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center py-8 text-muted-foreground italic">
                      No hay categorías de gastos definidas.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-4 border-t bg-muted/10 mt-4 gap-4">
              <div className="flex items-center gap-4 order-2 sm:order-1">
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
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Ant.
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages || totalPages === 0}
                >
                  Sig.
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
