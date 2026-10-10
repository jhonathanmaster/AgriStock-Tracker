
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
import { Trash2, Pencil, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AnimalType } from '@/lib/types';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { LoadingScreen } from '@/components/LoadingScreen';

export default function AdminAnimalsPage() {
  const { animalTypes, addAnimalType, deleteAnimalType, updateAnimalType, seedCommonAnimals, isLoading, isAdmin } = useAgriStock();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [newName, setNewName] = useState('');
  const [editingAnimal, setEditingAnimal] = useState<AnimalType | null>(null);
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

  const totalPages = Math.ceil(animalTypes.length / itemsPerPage);
  const paginatedAnimals = animalTypes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    addAnimalType(newName.trim());
    setNewName('');
    toast({ title: "Animal Registrado", description: `${newName} ha sido añadido.` });
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAnimal || !editName.trim()) return;
    updateAnimalType(editingAnimal.id, editName.trim());
    setEditingAnimal(null);
    setEditName('');
    toast({ title: "Registro Actualizado" });
  };

  return (
    <main className="flex-1 p-8 space-y-8 overflow-auto">
      <header className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Gestión de Animales</h1>
            <p className="text-muted-foreground">Configura los tipos de animales</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => seedCommonAnimals()}>Cargar Animales Comunes</Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card>
          <CardHeader><CardTitle>Nuevo Tipo</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="animalName">Nombre</Label>
                <Input id="animalName" value={newName} onChange={(e) => setNewName(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full">Guardar Tipo</Button>
            </form>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader><CardTitle>Tipos Registrados</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedAnimals.map((animal) => (
                  <TableRow key={animal.id}>
                    <TableCell className="font-medium">{animal.name}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => { setEditingAnimal(animal); setEditName(animal.name); }}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteAnimalType(animal.id)}><Trash2 className="w-4 h-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-4 border-t bg-muted/10 mt-4 gap-4">
              <div className="flex items-center gap-4 order-2 sm:order-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">Filas:</span>
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
