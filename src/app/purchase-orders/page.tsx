
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAgriStock } from '@/lib/store';
import { useUser } from '@/lib/session';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Search, 
  Pencil,
  Trash2,
  Timer,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  ListTodo,
  CalendarDays,
  Eye,
  Info,
  Truck,
  Package,
  DollarSign,
  FileText,
  BadgeDollarSign,
  X,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Coins
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { PurchaseOrder, UnitType } from '@/lib/types';
import { LoadingScreen } from '@/components/LoadingScreen';
import { Separator } from '@/components/ui/separator';

type SortConfig = {
  key: keyof PurchaseOrder | 'productName' | 'supplierName';
  direction: 'asc' | 'desc' | null;
};

export default function PurchaseOrdersPage() {
  const { 
    purchaseOrders, 
    products, 
    suppliers, 
    purchaseOrderStatusDefinitions,
    addPurchaseOrder, 
    updatePurchaseOrder,
    deletePurchaseOrder, 
    isLoading,
    isAdmin
  } = useAgriStock();
  
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const [viewingOrder, setViewingOrder] = useState<PurchaseOrder | null>(null);

  // Sorting State
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'requestDate', direction: 'desc' });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  const [formData, setFormData] = useState({
    productId: '',
    supplierId: '',
    quantity: '',
    unit: 'kilos' as UnitType,
    status: '',
    requestDate: '',
    deliveryDate: '',
    receivedDate: '',
    expirationDays: '',
    notes: ''
  });

  useEffect(() => {
    setMounted(true);
    if (!isUserLoading && !user) {
      router.push('/login');
    }
    const today = new Date().toISOString().split('T')[0];
    setFormData(prev => ({ ...prev, requestDate: prev.requestDate || today }));
  }, [user, isUserLoading, router]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, startDate, endDate, itemsPerPage, sortConfig]);

  const handleSort = (key: SortConfig['key']) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        if (prev.direction === 'asc') return { key, direction: 'desc' };
        if (prev.direction === 'desc') return { key: 'requestDate', direction: 'desc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const sortedProducts = useMemo(() => 
    [...products].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'es', { sensitivity: 'base' })), 
  [products]);

  const selectedProduct = useMemo(() => 
    products.find(p => p.id === formData.productId), 
  [products, formData.productId]);

  const currentUnitPrice = selectedProduct?.costPrice || 0;
  const currentTransportPrice = selectedProduct?.transportPricePerBundle || 0;
  
  const currentTotalCost = useMemo(() => {
    const qty = parseFloat(formData.quantity) || 0;
    return qty * (currentUnitPrice + currentTransportPrice);
  }, [formData.quantity, currentUnitPrice, currentTransportPrice]);

  const filteredOrders = useMemo(() => {
    let list = purchaseOrders.filter(o => {
      const product = products.find(p => p.id === o.productId);
      const supplier = suppliers.find(s => s.id === o.supplierId);
      const searchString = `${product?.name || ''} ${supplier?.name || ''} ${o.id || ''} ${o.status || ''}`.toLowerCase();
      const matchesSearch = searchString.includes(searchTerm.toLowerCase());

      let matchesDate = true;
      if (o.requestDate) {
        const orderDateStr = o.requestDate.split('T')[0]; 
        if (startDate && orderDateStr < startDate) matchesDate = false;
        if (endDate && orderDateStr > endDate) matchesDate = false;
      } else if (startDate || endDate) {
        matchesDate = false;
      }

      return matchesSearch && matchesDate;
    });

    if (sortConfig.direction) {
      list = [...list].sort((a, b) => {
        let valA: any;
        let valB: any;

        if (sortConfig.key === 'productName') {
          valA = products.find(p => p.id === a.productId)?.name || '';
          valB = products.find(p => p.id === b.productId)?.name || '';
        } else if (sortConfig.key === 'supplierName') {
          valA = suppliers.find(s => s.id === a.supplierId)?.name || '';
          valB = suppliers.find(s => s.id === b.supplierId)?.name || '';
        } else {
          valA = a[sortConfig.key as keyof PurchaseOrder] ?? '';
          valB = b[sortConfig.key as keyof PurchaseOrder] ?? '';
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return list;
  }, [purchaseOrders, products, suppliers, searchTerm, startDate, endDate, sortConfig]);

  // Cálculo de totales por estado para los cuadros de resumen
  const statusTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    purchaseOrderStatusDefinitions.forEach(status => {
      totals[status.name] = 0;
    });
    
    // Solo sumamos de los pedidos filtrados actualmente
    filteredOrders.forEach(order => {
      totals[order.status] = (totals[order.status] || 0) + (order.totalCost || 0);
    });
    return totals;
  }, [filteredOrders, purchaseOrderStatusDefinitions]);

  const finishedOrdersTotal = useMemo(() => {
    return filteredOrders
      .filter(o => (o.status?.toLowerCase().trim() || '') === 'finalizado')
      .reduce((sum, order) => sum + (order.totalCost || 0), 0);
  }, [filteredOrders]);

  useEffect(() => {
    if (isCreateOpen && !formData.status && purchaseOrderStatusDefinitions.length > 0) {
      setFormData(prev => ({ ...prev, status: purchaseOrderStatusDefinitions[0].name }));
    }
  }, [isCreateOpen, purchaseOrderStatusDefinitions, formData.status]);

  if (isUserLoading || isLoading || !mounted) {
    return <LoadingScreen />;
  }

  if (!user) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.productId || !formData.supplierId || !formData.quantity || !formData.status) {
      toast({ variant: "destructive", title: "Error", description: "Completa los campos obligatorios." });
      return;
    }

    const orderData: any = {
      productId: formData.productId,
      supplierId: formData.supplierId,
      quantity: parseFloat(formData.quantity),
      unit: formData.unit,
      status: formData.status,
      requestDate: formData.requestDate ? new Date(formData.requestDate).toISOString() : new Date().toISOString(),
      deliveryDate: formData.deliveryDate || null,
      receivedDate: formData.receivedDate || null,
      expirationDays: formData.expirationDays ? parseInt(formData.expirationDays) : null,
      notes: formData.notes || '',
      unitPrice: currentUnitPrice,
      transportPrice: currentTransportPrice,
      totalCost: currentTotalCost
    };

    if (editingOrder) {
      updatePurchaseOrder(editingOrder.id, orderData);
      toast({ title: "Orden Actualizada", description: "Los cambios han sido guardados." });
    } else {
      addPurchaseOrder(orderData);
      toast({ title: "Orden Creada", description: `La orden se ha registrado con el estado "${formData.status}".` });
    }

    setFormData({ 
      productId: '', 
      supplierId: '', 
      quantity: '', 
      unit: 'kilos', 
      status: '', 
      requestDate: new Date().toISOString().split('T')[0],
      deliveryDate: '', 
      receivedDate: '',
      expirationDays: '', 
      notes: '' 
    });
    setIsCreateOpen(false);
    setEditingOrder(null);
  };

  const handleEdit = (order: PurchaseOrder) => {
    setEditingOrder(order);
    setFormData({
      productId: order.productId,
      supplierId: order.supplierId,
      quantity: order.quantity.toString(),
      unit: order.unit,
      status: order.status,
      requestDate: order.requestDate ? order.requestDate.split('T')[0] : new Date().toISOString().split('T')[0],
      deliveryDate: order.deliveryDate || '',
      receivedDate: order.receivedDate || '',
      expirationDays: order.expirationDays?.toString() || '',
      notes: order.notes || ''
    });
    setIsCreateOpen(true);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
  };

  const getStatusBadge = (statusName: string) => {
    const definition = purchaseOrderStatusDefinitions.find(d => d.name === statusName);
    if (definition) {
      return (
        <Badge 
          variant="outline" 
          style={{ 
            borderColor: definition.color, 
            color: definition.color, 
            backgroundColor: `${definition.color}10` 
          }}
        >
          {definition.name}
        </Badge>
      );
    }
    return <Badge variant="outline">{statusName}</Badge>;
  };

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const SortIcon = ({ column }: { column: SortConfig['key'] }) => {
    if (sortConfig.key !== column) return <ArrowUpDown className="ml-2 h-3 w-3 opacity-30" />;
    if (sortConfig.direction === 'asc') return <ArrowUp className="ml-2 h-3 w-3 text-primary" />;
    if (sortConfig.direction === 'desc') return <ArrowDown className="ml-2 h-3 w-3 text-primary" />;
    return <ArrowUpDown className="ml-2 h-3 w-3 opacity-30" />;
  };

  return (
    <main className="flex-1 p-8 space-y-6 overflow-auto">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Órdenes de Compra</h1>
            <p className="text-muted-foreground">Gestiona el reabastecimiento con tus proveedores</p>
          </div>
        </div>
        <Button onClick={() => {
          setEditingOrder(null);
          setFormData({
            productId: '',
            supplierId: '',
            quantity: '',
            unit: 'kilos',
            status: purchaseOrderStatusDefinitions[0]?.name || '',
            requestDate: new Date().toISOString().split('T')[0],
            deliveryDate: '',
            receivedDate: '',
            expirationDays: '',
            notes: ''
          });
          setIsCreateOpen(true);
        }} className="gap-2 shadow-sm">
          <Plus className="w-4 h-4" />
          Nueva Orden
        </Button>
      </header>

      <div className="flex flex-col space-y-4 bg-white p-6 rounded-xl border border-border shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-end">
          <div className="flex items-center gap-3 px-4 py-2 bg-primary/5 rounded-lg border border-primary/10 h-11">
            <div className="p-1.5 bg-primary/10 rounded-full text-primary">
              <BadgeDollarSign className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[9px] uppercase font-black text-muted-foreground leading-tight tracking-wider">Inversión Finalizada</p>
              <p className="text-sm font-black text-primary leading-tight">
                ${finishedOrdersTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <div className="relative">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Buscar</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Producto, proveedor..." 
                className="pl-10 h-11 border-muted bg-muted/5" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Desde</Label>
              <Input 
                type="date" 
                value={startDate} 
                onChange={e => setStartDate(e.target.value)} 
                className="h-11 border-muted bg-muted/5 text-xs block w-full"
              />
            </div>
            <div>
              <Label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Hasta</Label>
              <Input 
                type="date" 
                value={endDate} 
                onChange={e => setEndDate(e.target.value)} 
                className="h-11 border-muted bg-muted/5 text-xs block w-full"
              />
            </div>
          </div>

          <div className="flex gap-2">
            {(searchTerm || startDate || endDate) && (
              <Button variant="ghost" size="icon" onClick={clearFilters} className="h-11 w-11 text-muted-foreground hover:text-destructive" title="Limpiar Filtros">
                <X className="w-5 h-5" />
              </Button>
            )}
            <Button variant="outline" className="h-11 flex-1 gap-2 border-primary/20">
              <Filter className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold uppercase tracking-tight">Filtrar</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-secondary/20">
            <TableRow>
              <TableHead className="cursor-pointer hover:bg-secondary/30 transition-colors" onClick={() => handleSort('status')}>
                <div className="flex items-center">Estado <SortIcon column="status" /></div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-secondary/30 transition-colors" onClick={() => handleSort('productName')}>
                <div className="flex items-center">Producto <SortIcon column="productName" /></div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-secondary/30 transition-colors" onClick={() => handleSort('supplierName')}>
                <div className="flex items-center">Proveedor <SortIcon column="supplierName" /></div>
              </TableHead>
              <TableHead className="text-right cursor-pointer hover:bg-secondary/30 transition-colors" onClick={() => handleSort('quantity')}>
                <div className="flex items-center justify-end">Cant. <SortIcon column="quantity" /></div>
              </TableHead>
              <TableHead className="text-right cursor-pointer hover:bg-secondary/30 transition-colors" onClick={() => handleSort('totalCost')}>
                <div className="flex items-center justify-end">Costo Total <SortIcon column="totalCost" /></div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-secondary/30 transition-colors" onClick={() => handleSort('requestDate')}>
                <div className="flex items-center">Solicitud <SortIcon column="requestDate" /></div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-secondary/30 transition-colors" onClick={() => handleSort('deliveryDate')}>
                <div className="flex items-center">Entrega Est. <SortIcon column="deliveryDate" /></div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-secondary/30 transition-colors" onClick={() => handleSort('receivedDate')}>
                <div className="flex items-center">Recibido <SortIcon column="receivedDate" /></div>
              </TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                  No se encontraron órdenes de compra que coincidan con los filtros.
                </TableCell>
              </TableRow>
            ) : paginatedOrders.map(order => {
              const product = products.find(p => p.id === order.productId);
              const supplier = suppliers.find(s => s.id === order.supplierId);
              
              return (
                <TableRow key={order.id}>
                  <TableCell>{getStatusBadge(order.status)}</TableCell>
                  <TableCell className="font-bold text-primary">{product?.name || 'Desconocido'}</TableCell>
                  <TableCell className="text-sm">{supplier?.name || 'Desconocido'}</TableCell>
                  <TableCell className="text-right font-medium">{order.quantity} <span className="text-[10px] text-muted-foreground">{order.unit}</span></TableCell>
                  <TableCell className="text-right font-bold text-accent">
                    ${(order.totalCost || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {order.requestDate ? new Date(order.requestDate).toLocaleDateString('es-ES', { timeZone: 'UTC' }) : '-'}
                  </TableCell>
                  <TableCell className="text-xs">
                    {order.deliveryDate ? (
                      <div className="flex items-center gap-1 text-blue-600 font-medium">
                        <Timer className="w-3 h-3" />
                        {new Date(order.deliveryDate).toLocaleDateString('es-ES', { timeZone: 'UTC' })}
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic text-[10px]">No pactada</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs font-bold text-green-600">
                    {order.receivedDate ? (
                      <div className="flex items-center gap-1">
                        <CalendarCheck className="w-3 h-3" />
                        {new Date(order.receivedDate).toLocaleDateString('es-ES', { timeZone: 'UTC' })}
                      </div>
                    ) : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-500 hover:bg-blue-50" onClick={() => setViewingOrder(order)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-primary hover:bg-primary/5" onClick={() => handleEdit(order)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      {isAdmin && (
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:bg-destructive/5 hover:text-destructive" onClick={() => {
                          if (confirm('¿Seguro que deseas eliminar esta orden?')) {
                            deletePurchaseOrder(order.id);
                            toast({ title: "Orden Eliminada" });
                          }
                        }}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t bg-muted/10 gap-4">
          <div className="flex items-center gap-4 order-2 sm:order-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Filas:</span>
              <Select value={itemsPerPage.toString()} onValueChange={(v) => setItemsPerPage(Number(v))}>
                <SelectTrigger className="h-8 w-[70px] bg-white">
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
              <span className="font-medium">{filteredOrders.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span>-
              <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredOrders.length)}</span> de 
              <span className="font-medium"> {filteredOrders.length}</span>
            </div>
          </div>
          <div className="flex gap-2 order-1 sm:order-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="gap-1 h-8">
              <ChevronLeft className="w-4 h-4" /> Anterior
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages || totalPages === 0} className="gap-1 h-8">
              Siguiente <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* CUADROS DE RESUMEN POR ESTADO ABAJO DEL LISTADO */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in duration-500">
        {purchaseOrderStatusDefinitions.map(status => {
          const total = statusTotals[status.name] || 0;
          return (
            <Card key={status.id} className="border-none shadow-sm overflow-hidden" style={{ backgroundColor: `${status.color}08` }}>
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider opacity-70" style={{ color: status.color }}>{status.name}</span>
                  <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: status.color }} />
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="flex items-baseline gap-1">
                  <span className="text-[10px] font-bold opacity-50">$</span>
                  <div className="text-xl font-black tracking-tight" style={{ color: status.color }}>
                    {total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mt-2 opacity-60">
                  <Coins className="w-3 h-3" style={{ color: status.color }} />
                  <p className="text-[9px] font-bold uppercase tracking-tighter">Costo Acumulado</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <Dialog open={!!viewingOrder} onOpenChange={(o) => !o && setViewingOrder(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-500" />
              Detalle de Orden de Compra
            </DialogTitle>
          </DialogHeader>
          {viewingOrder && (
            <div className="space-y-6 py-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase text-muted-foreground font-bold">Estado del Pedido</p>
                  {getStatusBadge(viewingOrder.status)}
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase text-muted-foreground font-bold">ID Referencia</p>
                  <p className="text-xs font-mono font-bold">#{viewingOrder.id.substring(0, 8).toUpperCase()}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 space-y-3">
                  <div className="flex items-start gap-3">
                    <Package className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] uppercase text-muted-foreground font-bold">Producto Solicitado</p>
                      <p className="font-bold text-primary">{products.find(p => p.id === viewingOrder.productId)?.name || 'Desconocido'}</p>
                      <p className="text-xs font-medium mt-1">
                        Cantidad: {viewingOrder.quantity} <span className="uppercase text-[10px]">{viewingOrder.unit}</span>
                      </p>
                    </div>
                  </div>
                  <Separator className="opacity-20" />
                  <div className="flex items-start gap-3">
                    <Truck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] uppercase text-muted-foreground font-bold">Proveedor</p>
                      <p className="font-bold">{suppliers.find(s => s.id === viewingOrder.supplierId)?.name || 'Desconocido'}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-accent/5 p-4 rounded-xl border border-accent/10 space-y-3">
                  <h4 className="text-[10px] uppercase text-accent font-black tracking-widest flex items-center gap-2">
                    <DollarSign className="w-3 h-3" /> Análisis Financiero
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-muted-foreground">Precio Unitario:</span>
                      <p className="font-bold">${(viewingOrder.unitPrice || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Flete Unitario:</span>
                      <p className="font-bold">${(viewingOrder.transportPrice || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-accent/10 flex justify-between items-center">
                    <span className="text-sm font-bold text-accent">COSTO TOTAL ESTIMADO:</span>
                    <span className="text-lg font-black text-accent">${(viewingOrder.totalCost || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 bg-muted/30 p-4 rounded-xl border border-border">
                  <h4 className="text-[10px] uppercase text-muted-foreground font-black tracking-widest flex items-center gap-2">
                    <CalendarDays className="w-3 h-3" /> Cronograma Logístico
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Fecha de Solicitud:</span>
                      <span className="font-medium">{viewingOrder.requestDate ? new Date(viewingOrder.requestDate).toLocaleDateString('es-ES', { dateStyle: 'long', timeZone: 'UTC' }) : '-'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Entrega Estimada:</span>
                      <span className={viewingOrder.deliveryDate ? "text-blue-600 font-bold" : "italic text-muted-foreground"}>
                        {viewingOrder.deliveryDate ? new Date(viewingOrder.deliveryDate).toLocaleDateString('es-ES', { dateStyle: 'long', timeZone: 'UTC' }) : 'No definida'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-border/50">
                      <span className="text-muted-foreground">Recepción Real:</span>
                      <span className={viewingOrder.receivedDate ? "text-green-600 font-black" : "italic text-muted-foreground"}>
                        {viewingOrder.receivedDate ? new Date(viewingOrder.receivedDate).toLocaleDateString('es-ES', { dateStyle: 'long', timeZone: 'UTC' }) : 'Pendiente'}
                      </span>
                    </div>
                  </div>
                </div>

                {viewingOrder.notes && (
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase text-muted-foreground font-bold flex items-center gap-1.5">
                      <FileText className="w-3 h-3" /> Notas Adicionales
                    </p>
                    <p className="text-xs text-muted-foreground bg-muted/20 p-3 rounded-lg border border-dashed border-border italic">
                      {viewingOrder.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingOrder(null)} className="w-full">Cerrar Vista</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateOpen} onOpenChange={(o) => {
        setIsCreateOpen(o);
        if(!o) setEditingOrder(null);
      }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingOrder ? 'Editar Orden de Compra' : 'Nueva Orden de Compra'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Producto</Label>
              <Select 
                value={formData.productId} 
                onValueChange={(v) => {
                  const selectedProd = products.find(p => p.id === v);
                  setFormData(prev => ({
                    ...prev,
                    productId: v,
                    supplierId: selectedProd?.supplierId || prev.supplierId,
                    unit: (selectedProd?.mainUnit as UnitType) || prev.unit
                  }));
                }}
              >
                <SelectTrigger><SelectValue placeholder="Seleccionar producto" /></SelectTrigger>
                <SelectContent>
                  {sortedProducts.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Proveedor</Label>
              <Select value={formData.supplierId} onValueChange={(v) => setFormData({...formData, supplierId: v})}>
                <SelectTrigger><SelectValue placeholder="Seleccionar proveedor" /></SelectTrigger>
                <SelectContent>
                  {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <ListTodo className="w-3.5 h-3.5 text-primary" />
                Estado de la Orden
              </Label>
              <Select 
                value={formData.status} 
                onValueChange={(v) => setFormData({...formData, status: v})}
                disabled={!isAdmin}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  {purchaseOrderStatusDefinitions.map(s => (
                    <SelectItem key={s.id} value={s.name}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                        {s.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!isAdmin && (
                <p className="text-[10px] text-muted-foreground italic">
                  * Solo administradores pueden cambiar el estado manualmente.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cantidad</Label>
                <Input type="number" step="0.01" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>Unidad</Label>
                <Select value={formData.unit} onValueChange={(v) => setFormData({...formData, unit: v as UnitType})}>
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
                <Label className="text-[10px] uppercase text-muted-foreground font-bold">Precio Unitario ($)</Label>
                <Input value={currentUnitPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })} readOnly className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase text-muted-foreground font-bold">Costo Flete ($)</Label>
                <Input value={currentTransportPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })} readOnly className="bg-muted" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] uppercase text-muted-foreground font-bold">Costo Total Estimado ($)</Label>
              <Input value={currentTotalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })} readOnly className="bg-primary/10 font-bold" />
            </div>

            <div className="space-y-2 bg-muted/20 p-3 rounded-lg border border-dashed border-border">
              <Label className="flex items-center gap-2 mb-2">
                <CalendarDays className="w-4 h-4 text-primary" />
                Fecha de Solicitud (Request)
              </Label>
              <Input 
                type="date" 
                value={formData.requestDate} 
                onChange={e => setFormData({...formData, requestDate: e.target.value})} 
                required
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                * Determina cuándo se inició oficialmente el proceso de compra.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha Entrega Est.</Label>
                <Input type="date" value={formData.deliveryDate} onChange={e => setFormData({...formData, deliveryDate: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Fecha Recibido (Real)</Label>
                <Input type="date" value={formData.receivedDate} onChange={e => setFormData({...formData, receivedDate: e.target.value})} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notas</Label>
              <Input value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
              <Button type="submit">{editingOrder ? 'Guardar Cambios' : 'Generar Orden'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
