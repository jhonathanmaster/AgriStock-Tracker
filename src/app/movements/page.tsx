"use client";

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAgriStock } from '@/lib/store';
import { useUser } from '@/lib/session';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  TrendingUp, 
  TrendingDown, 
  ShoppingCart, 
  ChevronLeft, 
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  User as UserIcon
} from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { LoadingScreen } from '@/components/LoadingScreen';
import { StockMovement } from '@/lib/types';

type SortConfig = {
  key: keyof StockMovement;
  direction: 'asc' | 'desc' | null;
};

export default function MovementsPage() {
  const { movements, products, isLoading } = useAgriStock();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // Sorting State
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'movementDateTime', direction: 'desc' });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  useEffect(() => {
    setMounted(true);
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage, sortConfig]);

  const handleSort = (key: SortConfig['key']) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        if (prev.direction === 'asc') return { key, direction: 'desc' };
        if (prev.direction === 'desc') return { key: 'movementDateTime', direction: null };
      }
      return { key, direction: 'asc' };
    });
  };

  const sortedMovements = useMemo(() => {
    let list = [...movements];
    if (sortConfig.direction) {
      list.sort((a, b) => {
        const valA = a[sortConfig.key] ?? '';
        const valB = b[sortConfig.key] ?? '';

        if (valA < (valB as any)) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > (valB as any)) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return list;
  }, [movements, sortConfig]);

  const SortIcon = ({ column }: { column: SortConfig['key'] }) => {
    if (sortConfig.key !== column) return <ArrowUpDown className="ml-2 h-3 w-3 opacity-30" />;
    if (sortConfig.direction === 'asc') return <ArrowUp className="ml-2 h-3 w-3 text-primary" />;
    if (sortConfig.direction === 'desc') return <ArrowDown className="ml-2 h-3 w-3 text-primary" />;
    return <ArrowUpDown className="ml-2 h-3 w-3 opacity-30" />;
  };

  if (isUserLoading || isLoading || !mounted) {
    return <LoadingScreen />;
  }

  if (!user) return null;

  const totalPages = Math.ceil(sortedMovements.length / itemsPerPage);
  const paginatedMovements = sortedMovements.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getProductTitle = (id: string) => products.find(p => p.id === id)?.name || 'Producto Desconocido';

  return (
    <main className="flex-1 p-8 space-y-6 overflow-auto">
      <header className="flex items-center gap-4">
        <SidebarTrigger />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Historial de Movimientos</h1>
          <p className="text-muted-foreground">Registro detallado de entradas, salidas y ventas</p>
        </div>
      </header>

      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-secondary/20">
            <TableRow>
              <TableHead className="cursor-pointer hover:bg-secondary/30 transition-colors" onClick={() => handleSort('movementDateTime')}>
                <div className="flex items-center">Fecha <SortIcon column="movementDateTime" /></div>
              </TableHead>
              <TableHead>Producto</TableHead>
              <TableHead className="cursor-pointer hover:bg-secondary/30 transition-colors" onClick={() => handleSort('type')}>
                <div className="flex items-center">Tipo <SortIcon column="type" /></div>
              </TableHead>
              <TableHead className="text-right cursor-pointer hover:bg-secondary/30 transition-colors" onClick={() => handleSort('quantity')}>
                <div className="flex items-center justify-end">Cantidad <SortIcon column="quantity" /></div>
              </TableHead>
              <TableHead>Unidad Orig.</TableHead>
              <TableHead>Operario</TableHead>
              <TableHead>Notas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedMovements.map(m => (
              <TableRow key={m.id}>
                <TableCell className="text-muted-foreground text-sm">
                  {m.movementDateTime ? new Date(m.movementDateTime).toLocaleString('es-ES') : '-'}
                </TableCell>
                <TableCell className="font-bold text-primary">
                  {getProductTitle(m.productId)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {m.type === 'entrada' && <TrendingUp className="w-4 h-4 text-primary" />}
                    {m.type === 'salida' && <TrendingDown className="w-4 h-4 text-destructive" />}
                    {m.type === 'venta' && <ShoppingCart className="w-4 h-4 text-accent" />}
                    <span className="capitalize">{m.type}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {m.type === 'entrada' ? '+' : '-'}{m.quantity.toFixed(2)}
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">{m.unit}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-xs">
                    <UserIcon className="w-3 h-3 text-muted-foreground" />
                    <span className="font-medium">{m.performedByName || 'Sistema'}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground italic text-sm">{m.notes || '-'}</TableCell>
              </TableRow>
            ))}
            {movements.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  No hay movimientos registrados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t bg-muted/10 gap-4">
          <div className="flex items-center gap-4 order-2 sm:order-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Mostrar:</span>
              <Select value={itemsPerPage.toString()} onValueChange={(v) => setItemsPerPage(Number(v))}>
                <SelectTrigger className="h-8 w-[70px] bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[5, 10, 15, 20, 50, 100].map(n => (
                    <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-muted-foreground">
              Mostrando <span className="font-medium">{sortedMovements.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span>-
              <span className="font-medium">{Math.min(currentPage * itemsPerPage, sortedMovements.length)}</span> de 
              <span className="font-medium"> {sortedMovements.length}</span>
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
      </div>
    </main>
  );
}
