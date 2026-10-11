
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAgriStock } from '@/lib/store';
import { useUser } from '@/lib/session';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Search, 
  ReceiptText, 
  Trash2, 
  Pencil, 
  ChevronLeft, 
  ChevronRight,
  Filter,
  DollarSign,
  CalendarDays,
  Tags,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CircleHelp,
  Info,
  CheckCircle2
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { LoadingScreen } from '@/components/LoadingScreen';
import { Expense } from '@/lib/types';
import { ExpenseForm } from '@/components/ExpenseForm';

type SortConfig = {
  key: keyof Expense;
  direction: 'asc' | 'desc' | null;
};

export default function ExpensesPage() {
  const { expenses, addExpense, updateExpense, deleteExpense, isLoading, isSuperAdmin } = useAgriStock();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Sorting State
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'date', direction: 'desc' });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, itemsPerPage, sortConfig]);

  const handleSort = (key: SortConfig['key']) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        if (prev.direction === 'asc') return { key, direction: 'desc' };
        if (prev.direction === 'desc') return { key: 'date', direction: null };
      }
      return { key, direction: 'asc' };
    });
  };

  const filteredExpenses = useMemo(() => {
    let list = expenses.filter(e => 
      e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (sortConfig.direction) {
      list = [...list].sort((a, b) => {
        const valA = a[sortConfig.key] ?? '';
        const valB = b[sortConfig.key] ?? '';

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return list;
  }, [expenses, searchTerm, sortConfig]);

  const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage);
  const paginatedExpenses = filteredExpenses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const totalAmount = filteredExpenses.reduce((sum, e) => sum + e.total, 0);

  const handleSave = (expenseData: Omit<Expense, 'id'>) => {
    if (editingExpense) {
      updateExpense(editingExpense.id, expenseData);
      toast({ title: "Gasto Actualizado", description: "Los cambios han sido guardados exitosamente." });
    } else {
      addExpense(expenseData);
      toast({ title: "Gasto Registrado", description: "Se ha añadido el nuevo registro de egreso." });
    }
    setIsCreateOpen(false);
    setEditingExpense(null);
  };

  const handleDelete = () => {
    if (deletingId) {
      deleteExpense(deletingId);
      setDeletingId(null);
      toast({ title: "Gasto Eliminado" });
    }
  };

  const SortIcon = ({ column }: { column: SortConfig['key'] }) => {
    if (sortConfig.key !== column) return <ArrowUpDown className="ml-2 h-3 w-3 opacity-30" />;
    if (sortConfig.direction === 'asc') return <ArrowUp className="ml-2 h-3 w-3 text-primary" />;
    if (sortConfig.direction === 'desc') return <ArrowDown className="ml-2 h-3 w-3 text-primary" />;
    return <ArrowUpDown className="ml-2 h-3 w-3 opacity-30" />;
  };

  if (isUserLoading || isLoading) {
    return <LoadingScreen />;
  }

  if (!user) return null;

  return (
    <main className="flex-1 p-8 space-y-6 overflow-auto">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Control de Gastos</h1>
            <p className="text-muted-foreground">Registro detallado de egresos operativos y fijos</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" className="h-10 w-10 text-muted-foreground hover:text-primary border-primary/20 shadow-sm">
                <CircleHelp className="w-5 h-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-2">
                  <Info className="w-6 h-6" />
                </div>
                <DialogTitle className="text-xl font-bold">Guía: Control de Gastos</DialogTitle>
                <DialogDescription>
                  Administra los egresos de la empresa para mantener un balance financiero saludable.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">1</div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-foreground">Clasificación</p>
                    <p className="text-xs text-muted-foreground">Asegúrate de tener categorías (Nómina, Servicios, etc.) creadas en el panel administrativo antes de empezar.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">2</div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-foreground">Registra el Egreso</p>
                    <p className="text-xs text-muted-foreground">Pulsa en "Nuevo Gasto". Es obligatorio asociar un proveedor y una descripción clara del pago.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">3</div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-foreground">Cálculos de Impuestos</p>
                    <p className="text-xs text-muted-foreground">Ingresa el valor unitario y el porcentaje de IVA. El sistema calculará automáticamente el subtotal y el total neto.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">4</div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-foreground">Impacto en Dashboard</p>
                    <p className="text-xs text-muted-foreground">Cada gasto registrado resta de la "Utilidad Neta" que ves en la pantalla de inicio y en los reportes globales.</p>
                  </div>
                </div>
                
                <div className="mt-6 p-3 bg-secondary/20 rounded-lg border border-border">
                  <p className="text-[10px] uppercase font-black text-primary mb-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Control Total
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed italic">
                    Un registro riguroso de gastos te permitirá identificar fugas de capital y optimizar la rentabilidad de GeiaTienda.
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isCreateOpen} onOpenChange={(open) => {
            setIsCreateOpen(open);
            if (!open) setEditingExpense(null);
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-sm">
                <Plus className="w-4 h-4" />
                Nuevo Gasto
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingExpense ? 'Editar Gasto' : 'Registrar Nuevo Egreso'}</DialogTitle>
              </DialogHeader>
              <ExpenseForm 
                onSave={handleSave} 
                initialData={editingExpense} 
              />
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-accent" />
              Egreso Total (Filtrado)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-primary">
              ${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
        
        <Card className="md:col-span-2 bg-white flex items-center px-6 py-0">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por descripción o categoría..." 
              className="pl-10 h-11 border-none bg-muted/20" 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </Card>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="w-[120px] cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('date')}>
                <div className="flex items-center">Fecha <SortIcon column="date" /></div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('description')}>
                <div className="flex items-center">Descripción <SortIcon column="description" /></div>
              </TableHead>
              <TableHead className="text-right cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('quantity')}>
                <div className="flex items-center justify-end">Cant. <SortIcon column="quantity" /></div>
              </TableHead>
              <TableHead className="text-right cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('subTotal')}>
                <div className="flex items-center justify-end">Sub-Total <SortIcon column="subTotal" /></div>
              </TableHead>
              <TableHead className="text-right">IVA</TableHead>
              <TableHead className="text-right font-bold text-primary cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('total')}>
                <div className="flex items-center justify-end">Total <SortIcon column="total" /></div>
              </TableHead>
              <TableHead className="text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedExpenses.map(e => (
              <TableRow key={e.id} className="hover:bg-muted/10">
                <TableCell className="text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <CalendarDays className="w-3 h-3" />
                    {new Date(e.date).toLocaleDateString()}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-bold text-sm">{e.description}</div>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
                    <Tags className="w-2.5 h-2.5" />
                    {e.category}
                  </div>
                </TableCell>
                <TableCell className="text-right text-sm">{e.quantity.toFixed(1)}</TableCell>
                <TableCell className="text-right text-xs text-muted-foreground">
                  ${e.subTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="text-right text-[10px] text-accent font-medium">
                  {e.ivaPercentage}% (${e.ivaValue.toLocaleString('en-US', { minimumFractionDigits: 2 })})
                </TableCell>
                <TableCell className="text-right font-black text-primary">
                  ${e.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center gap-1">
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8 text-primary" 
                      onClick={() => {
                        setEditingExpense(e);
                        setIsCreateOpen(true);
                      }}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    {isSuperAdmin && (
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8 text-destructive" 
                        onClick={() => setDeletingId(e.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredExpenses.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground italic">
                  No se han registrado gastos aún.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t bg-muted/10 gap-4">
          <div className="text-sm text-muted-foreground">
            Página <span className="font-medium">{currentPage}</span> de <span className="font-medium">{totalPages || 1}</span>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages || totalPages === 0}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este registro de gasto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer y afectará el balance de egresos global.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive" onClick={handleDelete}>
              Confirmar Eliminación
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
