
"use client";

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAgriStock } from '@/lib/store';
import { useUser } from '@/lib/session';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { QuickSale } from '@/components/QuickSale';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  DollarSign, 
  Eye, 
  Pencil, 
  Trash2, 
  User, 
  Phone, 
  MapPin, 
  Mail, 
  Fingerprint, 
  Info, 
  ChevronLeft, 
  ChevronRight, 
  History,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Percent,
  CalendarDays,
  Search,
  X,
  Filter
} from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StockMovement, UnitType } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { LoadingScreen } from '@/components/LoadingScreen';
import { cn } from '@/lib/utils';

type SortConfig = {
  key: keyof StockMovement;
  direction: 'asc' | 'desc' | null;
};

export default function SalesPage() {
  const { products, movements, customers, recordMovement, deleteMovement, updateMovement, saveCustomer, dailyIncome, isLoading, isAdmin } = useAgriStock();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);

  const [viewingSale, setViewingSale] = useState<StockMovement | null>(null);
  const [editingSale, setEditingSale] = useState<StockMovement | null>(null);
  const [deletingSaleId, setDeletingSaleId] = useState<string | null>(null);
  
  // States para Filtros
  const [filterRecent, setFilterRecent] = useState(false);
  const [searchProductName, setSearchProductName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Sorting State
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'movementDateTime', direction: 'desc' });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Edit States
  const [editDate, setEditDate] = useState('');
  const [editQty, setEditQty] = useState('');
  const [editUnit, setEditUnit] = useState<UnitType>('kilos');
  const [editTotal, setEditTotal] = useState('');
  const [editIvaPerc, setEditIvaPerc] = useState('0');
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editCustomerPhone, setEditCustomerPhone] = useState('');
  const [editCustomerEmail, setEditCustomerEmail] = useState('');
  const [editCustomerIdentification, setEditCustomerIdentification] = useState('');
  const [editCustomerAddress, setEditCustomerAddress] = useState('');

  useEffect(() => {
    setMounted(true);
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage, filterRecent, searchProductName, startDate, endDate, sortConfig]);

  useEffect(() => {
    if (!editingSale) return;
    const phoneClean = editCustomerPhone.trim();
    const hasPhone = phoneClean.length >= 7;

    if (hasPhone) {
      const found = (customers || []).find(c => c.phone === phoneClean);
      if (found) {
        if (found.name && editCustomerName !== found.name) setEditCustomerName(found.name);
        if (found.email && !editCustomerEmail) setEditCustomerEmail(found.email);
        if (found.address && editCustomerAddress !== found.address) setEditCustomerAddress(found.address);
        if (found.identificationNumber && editCustomerIdentification !== found.identificationNumber) 
          setEditCustomerIdentification(found.identificationNumber);
      }
    }
  }, [editCustomerPhone, customers, editingSale]);

  const handleSort = (key: SortConfig['key']) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        if (prev.direction === 'asc') return { key, direction: 'desc' };
        if (prev.direction === 'desc') return { key: 'movementDateTime', direction: null };
      }
      return { key, direction: 'asc' };
    });
  };

  const salesHistory = useMemo(() => {
    let list = movements.filter(m => m.type === 'venta');
    
    // Filtro por Recientes (7 días)
    if (filterRecent) {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      list = list.filter(sale => new Date(sale.movementDateTime) >= sevenDaysAgo);
    }

    // Filtro por Nombre de Producto
    if (searchProductName.trim()) {
      list = list.filter(sale => {
        const product = products.find(p => p.id === sale.productId);
        return (product?.name || '').toLowerCase().includes(searchProductName.toLowerCase());
      });
    }

    // Filtro por Rango de Fechas
    if (startDate) {
      list = list.filter(sale => sale.movementDateTime.split('T')[0] >= startDate);
    }
    if (endDate) {
      list = list.filter(sale => sale.movementDateTime.split('T')[0] <= endDate);
    }

    // Ordenamiento
    if (sortConfig.direction) {
      list = [...list].sort((a, b) => {
        let valA: any;
        let valB: any;

        if (sortConfig.key === 'productId') {
          valA = products.find(p => p.id === a.productId)?.name || '';
          valB = products.find(p => p.id === b.productId)?.name || '';
        } else {
          valA = a[sortConfig.key] ?? '';
          valB = b[sortConfig.key] ?? '';
        }

        if (valA < (valB as any)) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > (valB as any)) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    
    return list;
  }, [movements, filterRecent, searchProductName, startDate, endDate, sortConfig, products]);

  const clearFilters = () => {
    setSearchProductName('');
    setStartDate('');
    setEndDate('');
    setFilterRecent(false);
  };

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

  const totalPages = Math.ceil(salesHistory.length / itemsPerPage);
  const paginatedSales = salesHistory.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleEditClick = (sale: StockMovement) => {
    setEditingSale(sale);
    setEditDate(sale.movementDateTime ? sale.movementDateTime.split('T')[0] : '');
    setEditQty(sale.quantity.toString());
    setEditUnit(sale.unit);
    setEditTotal(sale.totalValue?.toString() || '0');
    setEditIvaPerc(sale.ivaPercentage?.toString() || '0');
    setEditCustomerName(sale.customerName || '');
    setEditCustomerPhone(sale.customerPhone || '');
    setEditCustomerEmail(sale.customerEmail || '');
    setEditCustomerIdentification(sale.customerIdentification || '');
    setEditCustomerAddress(sale.customerAddress || '');
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSale) return;

    const totalVal = parseFloat(editTotal) || 0;
    const ivaPerc = parseFloat(editIvaPerc) || 0;
    const subTotal = totalVal / (1 + ivaPerc / 100);
    const ivaValue = totalVal - subTotal;

    let finalDateTime = editingSale.movementDateTime;
    if (editDate) {
      const originalTime = editingSale.movementDateTime?.split('T')[1] || '00:00:00.000Z';
      finalDateTime = `${editDate}T${originalTime}`;
    }

    updateMovement(editingSale.id, {
      movementDateTime: finalDateTime,
      quantity: parseFloat(editQty),
      unit: editUnit,
      totalValue: totalVal,
      ivaPercentage: ivaPerc,
      subTotal: subTotal,
      ivaValue: ivaValue,
      customerName: editCustomerName,
      customerPhone: editCustomerPhone,
      customerEmail: editCustomerEmail,
      customerIdentification: editCustomerIdentification,
      customerAddress: editCustomerAddress
    });

    setEditingSale(null);
    toast({
      title: "Venta Actualizada",
      description: "Los cambios han sido aplicados y el stock ajustado."
    });
  };

  const handleDelete = () => {
    if (deletingSaleId) {
      deleteMovement(deletingSaleId);
      setDeletingSaleId(null);
      toast({
        title: "Venta Eliminada",
        description: "El registro ha sido removido y el stock reintegrado."
      });
    }
  };

  return (
    <main className="flex-1 p-8 space-y-8 overflow-auto">
      <header className="flex items-center gap-4">
        <SidebarTrigger />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Ventas Rápidas</h1>
          <p className="text-muted-foreground">Registra nuevas ventas y revisa el historial reciente</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-6">
          <QuickSale 
            products={products} 
            onSale={(pId, qty, unit, totalValue, ivaPercentage, subTotal, ivaValue, saleDate, customerData) => {
              if (customerData && customerData.name && customerData.phone) {
                saveCustomer({
                  name: customerData.name,
                  phone: customerData.phone,
                  email: customerData.email,
                  address: customerData.address,
                  identificationNumber: customerData.identificationNumber
                });
              }

              const baseMovement = {
                productId: pId,
                type: 'venta' as const,
                quantity: qty,
                unit: unit,
                totalValue: totalValue,
                ivaPercentage: ivaPercentage,
                subTotal: subTotal,
                ivaValue: ivaValue,
                movementDateTime: saleDate
              };

              const movementData = (customerData && customerData.name && customerData.phone) ? {
                ...baseMovement,
                customerName: customerData.name,
                customerPhone: customerData.phone,
                customerEmail: customerData.email,
                customerAddress: customerData.address,
                customerIdentification: customerData.identificationNumber
              } : baseMovement;

              recordMovement(movementData);
              toast({ title: "Venta Registrada", description: "La transacción se guardó exitosamente." });
            }} 
          />
          
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-accent" />
                Ventas de Hoy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${dailyIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">Ingresos reales por ventas hoy</p>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6">
              <CardTitle>Historial de Ventas</CardTitle>
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant={filterRecent ? "default" : "outline"} 
                  size="sm" 
                  className={cn("gap-2 h-8 font-bold text-[10px] uppercase tracking-wider", filterRecent && "bg-accent hover:bg-accent/90")}
                  onClick={() => setFilterRecent(!filterRecent)}
                >
                  {filterRecent ? <History className="w-3.5 h-3.5" /> : <Calendar className="w-3.5 h-3.5" />}
                  {filterRecent ? "Ver Todo" : "Recientes (7d)"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* BARRA DE FILTROS AVANZADOS */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-muted/20 p-4 rounded-xl border border-border shadow-inner">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Buscar Producto</Label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input 
                      placeholder="Nombre..." 
                      className="pl-8 h-9 text-xs bg-white" 
                      value={searchProductName}
                      onChange={e => setSearchProductName(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Desde</Label>
                  <Input 
                    type="date" 
                    className="h-9 text-xs bg-white" 
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Hasta</Label>
                  <Input 
                    type="date" 
                    className="h-9 text-xs bg-white" 
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-9 flex-1 gap-2 border-primary/20 hover:bg-primary/5"
                    onClick={clearFilters}
                  >
                    <X className="w-3.5 h-3.5" />
                    <span className="text-[10px] uppercase font-bold">Limpiar</span>
                  </Button>
                  <div className="bg-primary/10 p-2 rounded-lg text-primary flex items-center justify-center h-9 w-9 border border-primary/20">
                    <Filter className="w-4 h-4" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('movementDateTime')}>
                        <div className="flex items-center">Fecha <SortIcon column="movementDateTime" /></div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('productId')}>
                        <div className="flex items-center">Producto <SortIcon column="productId" /></div>
                      </TableHead>
                      <TableHead className="text-right cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('quantity')}>
                        <div className="flex items-center justify-end">Cant. <SortIcon column="quantity" /></div>
                      </TableHead>
                      <TableHead className="text-right cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('totalValue')}>
                        <div className="flex items-center justify-end">Total <SortIcon column="totalValue" /></div>
                      </TableHead>
                      <TableHead className="text-center">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedSales.map(sale => {
                      const product = products.find(p => p.id === sale.productId);
                      const displayTotal = sale.totalValue || 0;

                      return (
                        <TableRow key={sale.id} className="hover:bg-muted/10 transition-colors">
                          <TableCell className="text-[10px] text-muted-foreground">
                            {sale.movementDateTime ? new Date(sale.movementDateTime).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}
                          </TableCell>
                          <TableCell className="font-bold text-primary text-xs">
                            {product?.name || 'Producto Desconocido'}
                          </TableCell>
                          <TableCell className="text-right font-medium text-xs">
                            {sale.quantity.toFixed(1)} <span className="text-[10px] lowercase text-muted-foreground">{sale.unit.substring(0, 2)}</span>
                          </TableCell>
                          <TableCell className="text-right font-black text-accent text-xs">
                            ${displayTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center gap-1">
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-blue-500 hover:bg-blue-50" onClick={() => setViewingSale(sale)}>
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-primary hover:bg-primary/5" onClick={() => handleEditClick(sale)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              {isAdmin && (
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:bg-destructive/5" onClick={() => setDeletingSaleId(sale.id)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {salesHistory.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="h-32 text-center text-muted-foreground italic">
                          No se encontraron ventas que coincidan con los filtros aplicados.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-4 border-t bg-muted/10 rounded-xl gap-4">
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
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium">{salesHistory.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span>-
                    <span className="font-medium">{Math.min(currentPage * itemsPerPage, salesHistory.length)}</span> de 
                    <span className="font-medium"> {salesHistory.length}</span>
                  </div>
                </div>
                <div className="flex gap-2 order-1 sm:order-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* DIALOGS Y ALERTDIALOGS */}
      <Dialog open={!!viewingSale} onOpenChange={(o) => !o && setViewingSale(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-500" />
              Detalle de la Venta
            </DialogTitle>
          </DialogHeader>
          {viewingSale && (
            <div className="space-y-6 py-4">
              <div className="space-y-2 bg-muted/30 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4 pb-2 border-b border-border/50">
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase text-muted-foreground font-bold">Fecha y Hora</p>
                    <p className="text-sm font-medium">{new Date(viewingSale.movementDateTime).toLocaleString('es-ES')}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase text-muted-foreground font-bold">Producto</p>
                    <p className="text-sm font-bold text-primary">{products.find(p => p.id === viewingSale.productId)?.name}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 py-2 border-b border-border/50">
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase text-muted-foreground font-bold">Cantidad</p>
                    <p className="text-sm font-medium">{viewingSale.quantity} {viewingSale.unit}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase text-muted-foreground font-bold">IVA ({viewingSale.ivaPercentage || 0}%)</p>
                    <p className="text-sm font-bold text-accent">${(viewingSale.ivaValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase text-muted-foreground font-bold">Sub-Total</p>
                    <p className="text-sm font-medium">${(viewingSale.subTotal || viewingSale.totalValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase text-primary font-bold">VALOR TOTAL</p>
                    <p className="text-lg font-black text-primary">${(viewingSale.totalValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
              </div>

              {viewingSale.customerName && (
                <div className="space-y-3 border-t pt-4">
                  <h4 className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                    <User className="w-3 h-3" /> Información del Cliente
                  </h4>
                  <div className="grid grid-cols-1 gap-2 text-sm">
                    <p className="flex items-center gap-2"><User className="w-3.5 h-3.5 text-muted-foreground" /> <b>Nombre:</b> {viewingSale.customerName}</p>
                    <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-muted-foreground" /> <b>Teléfono:</b> {viewingSale.customerPhone}</p>
                    {viewingSale.customerIdentification && (
                      <p className="flex items-center gap-2"><Fingerprint className="w-3.5 h-3.5 text-muted-foreground" /> <b>ID:</b> {viewingSale.customerIdentification}</p>
                    )}
                    {viewingSale.customerEmail && (
                      <p className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-muted-foreground" /> <b>Email:</b> {viewingSale.customerEmail}</p>
                    )}
                    {viewingSale.customerAddress && (
                      <p className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-muted-foreground" /> <b>Dirección:</b> {viewingSale.customerAddress}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingSale(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingSale} onOpenChange={(o) => !o && setEditingSale(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Registro de Venta</DialogTitle>
            <DialogDescription>Modifica los datos de la transacción. El stock se recalculará automáticamente.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4 py-4">
            <div className="space-y-2 bg-muted/20 p-3 rounded-lg border border-dashed border-border">
              <Label className="flex items-center gap-2 mb-2">
                <CalendarDays className="w-4 h-4 text-primary" />
                Fecha de la Venta
              </Label>
              <Input 
                type="date" 
                value={editDate} 
                onChange={e => setEditDate(e.target.value)} 
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cantidad</Label>
                <Input type="number" step="0.01" value={editQty} onChange={e => setEditQty(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Unidad</Label>
                <Select value={editUnit} onValueChange={(v) => setEditUnit(v as UnitType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kilos">Kilos</SelectItem>
                    <SelectItem value="libras">Libras</SelectItem>
                    <SelectItem value="bultos">Bultos</SelectItem>
                    <SelectItem value="unidades">Unidades</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><Percent className="w-3 h-3" /> IVA (%)</Label>
                <Input type="number" step="1" value={editIvaPerc} onChange={e => setEditIvaPerc(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Valor Total ($)</Label>
                <Input type="number" step="0.01" value={editTotal} onChange={e => setEditTotal(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-4 border-t pt-4">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Datos del Cliente</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input value={editCustomerPhone} onChange={e => setEditCustomerPhone(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Correo</Label>
                  <Input type="email" value={editCustomerEmail} onChange={e => setEditCustomerEmail(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Identificación</Label>
                <Input value={editCustomerIdentification} onChange={e => setEditCustomerIdentification(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input value={editCustomerName} onChange={e => setEditCustomerName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Dirección</Label>
                <Input value={editCustomerAddress} onChange={e => setEditCustomerAddress(e.target.value)} />
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setEditingSale(null)}>Cancelar</Button>
              <Button type="submit">Guardar Cambios</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingSaleId} onOpenChange={(o) => !o && setDeletingSaleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta venta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará el registro de ingresos y devolverá la cantidad vendida al stock del producto.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleDelete}>
              Confirmar Eliminación
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
