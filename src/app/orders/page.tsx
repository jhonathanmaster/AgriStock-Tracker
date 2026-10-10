
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAgriStock } from '@/lib/store';
import { useUser } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
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
  CalendarDays,
  Eye,
  Info,
  Package,
  DollarSign,
  FileText,
  BadgeDollarSign,
  X,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  User,
  Phone,
  Mail,
  MapPin,
  Fingerprint,
  CalendarCheck,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CreditCard,
  Wallet,
  PiggyBank,
  TrendingUp,
  Banknote,
  Receipt,
  ListPlus,
  Coins
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
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
import { useToast } from '@/hooks/use-toast';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Order, OrderStatus, UnitType, Customer, OrderItem, OrderPayment, PaymentMethod } from '@/lib/types';
import { LoadingScreen } from '@/components/LoadingScreen';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

type SortConfig = {
  key: keyof Order | 'customerName';
  direction: 'asc' | 'desc' | null;
};

export default function OrdersPage() {
  const { 
    orders, 
    products, 
    customers,
    addOrder, 
    updateOrder,
    deleteOrder, 
    saveCustomer,
    convertQuantity,
    isLoading,
    isAdmin
  } = useAgriStock();
  
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);

  // Cliente buscador state
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');

  // Items State (dentro del formulario)
  const [formItems, setFormItems] = useState<OrderItem[]>([]);
  const [formPayments, setFormPayments] = useState<OrderPayment[]>([]);
  
  // New Item Temporary State
  const [newItemProductId, setNewItemProductId] = useState('');
  const [newItemQty, setNewItemQty] = useState('1');
  const [newItemUnit, setNewItemUnit] = useState<UnitType>('kilos');
  const [newItemPrice, setNewItemPrice] = useState('');

  // New Payment Temporary State
  const [newPayAmount, setNewPayAmount] = useState('');
  const [newPayMethod, setNewPayMethod] = useState<PaymentMethod>('efectivo');
  const [newPayNotes, setNewPayNotes] = useState('');

  // Sorting State - Adjusted to deliveryDate DESC by default
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'deliveryDate', direction: 'desc' });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  const [formData, setFormData] = useState({
    requestDate: '',
    deliveryDate: '',
    customerId: '', 
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    customerAddress: '',
    identificationNumber: '',
    status: 'pending' as OrderStatus,
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
  }, [searchTerm, statusFilter, itemsPerPage, sortConfig]);

  const handleSort = (key: SortConfig['key']) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        if (prev.direction === 'asc') return { key, direction: 'desc' };
        if (prev.direction === 'desc') return { key: 'deliveryDate', direction: 'desc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const customerSearchResults = useMemo(() => {
    if (!customerSearchQuery || customerSearchQuery.length < 2) return [];
    const query = customerSearchQuery.toLowerCase();
    return (customers || []).filter(c => 
      c.name.toLowerCase().includes(query) || 
      c.phone.includes(query) || 
      c.identificationNumber?.includes(query)
    ).slice(0, 5);
  }, [customerSearchQuery, customers]);

  const sortedProductsForSelect = useMemo(() => 
    [...products].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'es', { sensitivity: 'base' })), 
  [products]);

  const handleSelectCustomer = (c: Customer) => {
    setFormData(prev => ({
      ...prev,
      customerId: c.id,
      customerName: c.name || prev.customerName,
      customerPhone: c.phone || prev.customerPhone,
      customerEmail: c.email || prev.customerEmail,
      customerAddress: c.address || prev.customerAddress,
      identificationNumber: c.identificationNumber || prev.identificationNumber
    }));
    setCustomerSearchQuery('');
    toast({ title: "Cliente Seleccionado" });
  };

  const handleAddItem = () => {
    const product = products.find(p => p.id === newItemProductId);
    if (!product || !newItemQty || parseFloat(newItemQty) <= 0) return;

    const qty = parseFloat(newItemQty);
    const price = parseFloat(newItemPrice) || product.salePrice;
    const qtyInBase = convertQuantity(qty, newItemUnit, product.mainUnit);
    const total = qtyInBase * price;

    const newItem: OrderItem = {
      productId: product.id,
      productName: product.name,
      quantity: qty,
      unit: newItemUnit,
      price: price,
      total: total
    };

    setFormItems(prev => [...prev, newItem]);
    setNewItemProductId('');
    setNewItemQty('1');
    setNewItemPrice('');
  };

  const handleRemoveItem = (index: number) => {
    setFormItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddPayment = () => {
    if (!newPayAmount || parseFloat(newPayAmount) <= 0) return;

    const newPayment: OrderPayment = {
      id: Math.random().toString(36).substring(7),
      date: new Date().toISOString(),
      amount: parseFloat(newPayAmount),
      method: newPayMethod,
      notes: newPayNotes || ''
    };

    setFormPayments(prev => [...prev, newPayment]);
    setNewPayAmount('');
    setNewPayNotes('');
  };

  const handleRemovePayment = (id: string) => {
    setFormPayments(prev => prev.filter(p => p.id !== id));
  };

  const totalValue = useMemo(() => formItems.reduce((sum, item) => sum + item.total, 0), [formItems]);
  const totalPaid = useMemo(() => formPayments.reduce((sum, p) => sum + p.amount, 0), [formPayments]);
  const balance = totalValue - totalPaid;

  const filteredOrders = useMemo(() => {
    let list = orders.filter(o => {
      const searchString = `${o.customerName || ''} ${o.notes || ''}`.toLowerCase();
      const matchesSearch = searchString.includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    if (sortConfig.direction) {
      list = [...list].sort((a, b) => {
        let valA = a[sortConfig.key as keyof Order] ?? '';
        let valB = b[sortConfig.key as keyof Order] ?? '';
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return list;
  }, [orders, searchTerm, statusFilter, sortConfig]);

  const orderTotalsSummary = useMemo(() => {
    return filteredOrders.reduce((acc, order) => {
      const paid = (order.payments || []).reduce((s, p) => s + p.amount, 0);
      acc.total += order.totalValue;
      acc.totalPaid += paid;
      acc.totalPending += (order.totalValue - paid);
      return acc;
    }, { total: 0, totalPaid: 0, totalPending: 0 });
  }, [filteredOrders]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (formItems.length === 0 || !formData.customerName || !formData.customerPhone) {
      toast({ variant: "destructive", title: "Error", description: "Completa los datos del cliente y agrega al menos un producto." });
      return;
    }

    saveCustomer({
      id: formData.customerId || undefined,
      name: formData.customerName,
      phone: formData.customerPhone,
      email: formData.customerEmail || '',
      address: formData.customerAddress || '',
      identificationNumber: formData.identificationNumber || ''
    });

    const orderData: Omit<Order, 'id'> = {
      items: formItems,
      payments: formPayments,
      totalValue: totalValue,
      status: formData.status,
      requestDate: formData.requestDate ? new Date(formData.requestDate).toISOString() : new Date().toISOString(),
      deliveryDate: formData.deliveryDate ? new Date(formData.deliveryDate).toISOString() : null,
      customerName: formData.customerName,
      customerPhone: formData.customerPhone,
      customerEmail: formData.customerEmail || '',
      customerAddress: formData.customerAddress || '',
      customerIdentification: formData.identificationNumber || '',
      notes: formData.notes || ''
    };

    if (editingOrder) {
      updateOrder(editingOrder.id, orderData);
      toast({ title: "Encargo Actualizado" });
    } else {
      addOrder(orderData);
      toast({ title: "Encargo Registrado" });
    }

    resetForm();
    setIsCreateOpen(false);
  };

  const resetForm = () => {
    setFormData({ 
      status: 'pending', 
      requestDate: new Date().toISOString().split('T')[0],
      deliveryDate: '', 
      customerId: '',
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      customerAddress: '',
      identificationNumber: '',
      notes: '' 
    });
    setFormItems([]);
    setFormPayments([]);
    setEditingOrder(null);
    setCustomerSearchQuery('');
  };

  const handleEdit = (order: Order) => {
    setEditingOrder(order);
    setFormItems(order.items || []);
    setFormPayments(order.payments || []);
    setFormData({
      status: order.status,
      requestDate: order.requestDate ? order.requestDate.split('T')[0] : new Date().toISOString().split('T')[0],
      deliveryDate: order.deliveryDate ? order.deliveryDate.split('T')[0] : '',
      customerId: order.customerId || '',
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail || '',
      customerAddress: order.customerAddress || '',
      identificationNumber: order.customerIdentification || '',
      notes: order.notes || ''
    });
    setIsCreateOpen(true);
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch(status) {
      case 'pending': return <Badge variant="outline" className="gap-1 text-accent border-accent bg-accent/5"><Clock className="w-3 h-3" /> Pendiente</Badge>;
      case 'paid': return <Badge variant="outline" className="gap-1 text-blue-600 border-blue-600 bg-blue-50"><CheckCircle2 className="w-3 h-3" /> Pagado</Badge>;
      case 'delivered': return <Badge variant="outline" className="gap-1 text-primary border-primary bg-primary/5"><Package className="w-3 h-3" /> Entregado</Badge>;
      case 'cancelled': return <Badge variant="outline" className="gap-1 text-destructive border-destructive bg-destructive/5"><XCircle className="w-3 h-3" /> Cancelado</Badge>;
    }
  };

  const paginatedOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);

  const SortIcon = ({ column }: { column: SortConfig['key'] }) => {
    if (sortConfig.key !== column) return <ArrowUpDown className="ml-2 h-3 w-3 opacity-30" />;
    if (sortConfig.direction === 'asc') return <ArrowUp className="ml-2 h-3 w-3 text-primary" />;
    if (sortConfig.direction === 'desc') return <ArrowDown className="ml-2 h-3 w-3 text-primary" />;
    return <ArrowUpDown className="ml-2 h-3 w-3 opacity-30" />;
  };

  if (isUserLoading || isLoading || !mounted) return <LoadingScreen />;
  if (!user) return null;

  return (
    <main className="flex-1 p-8 space-y-6 overflow-auto">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Encargos de Clientes</h1>
            <p className="text-muted-foreground">Gestión de pedidos anticipados y abonos</p>
          </div>
        </div>
        <Button onClick={() => { resetForm(); setIsCreateOpen(true); }} className="gap-2 shadow-sm">
          <Plus className="w-4 h-4" />
          Nuevo Encargo
        </Button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-end bg-white p-6 rounded-xl border border-border shadow-sm">
        <div className="relative">
          <Label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Buscar</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Cliente, notas..." 
              className="pl-10 h-11 border-muted bg-muted/5" 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div>
          <Label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Estado</Label>
          <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
            <SelectTrigger className="h-11 bg-muted/5">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Ver Todos</SelectItem>
              <SelectItem value="pending">Pendientes</SelectItem>
              <SelectItem value="paid">Pagados</SelectItem>
              <SelectItem value="delivered">Entregados</SelectItem>
              <SelectItem value="cancelled">Cancelados</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="lg:col-span-2 flex justify-end">
          <Button variant="outline" className="h-11 gap-2 border-primary/20" onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}>
            <X className="w-4 h-4" /> Limpiar
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-secondary/20">
            <TableRow>
              <TableHead className="cursor-pointer hover:bg-secondary/30 transition-colors" onClick={() => handleSort('status')}>
                <div className="flex items-center">Estado <SortIcon column="status" /></div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-secondary/30 transition-colors" onClick={() => handleSort('deliveryDate')}>
                <div className="flex items-center">Fecha Entrega <SortIcon column="deliveryDate" /></div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-secondary/30 transition-colors" onClick={() => handleSort('customerName')}>
                <div className="flex items-center">Cliente <SortIcon column="customerName" /></div>
              </TableHead>
              <TableHead>Productos</TableHead>
              <TableHead className="text-right cursor-pointer hover:bg-secondary/30 transition-colors" onClick={() => handleSort('totalValue')}>
                <div className="flex items-center justify-end">V. Total <SortIcon column="totalValue" /></div>
              </TableHead>
              <TableHead className="text-right">Saldo Pend.</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedOrders.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="h-32 text-center text-muted-foreground italic">No se encontraron encargos.</TableCell></TableRow>
            ) : paginatedOrders.map(order => {
              const paid = (order.payments || []).reduce((sum, p) => sum + p.amount, 0);
              const balance = order.totalValue - paid;
              return (
                <TableRow key={order.id}>
                  <TableCell>{getStatusBadge(order.status)}</TableCell>
                  <TableCell className="text-xs font-bold text-accent">
                    {order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString() : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="text-xs font-bold">{order.customerName}</div>
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Phone className="w-2.5 h-2.5" /> {order.customerPhone}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    <Badge variant="secondary" className="text-[10px]">{order.items?.length || 0} ítems</Badge>
                  </TableCell>
                  <TableCell className="text-right font-bold text-primary">${order.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-right font-black text-destructive">${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-500 hover:bg-blue-50" onClick={() => setViewingOrder(order)}><Eye className="w-4 h-4" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-primary hover:bg-primary/5" onClick={() => handleEdit(order)}><Pencil className="w-4 h-4" /></Button>
                      {isAdmin && <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setOrderToDelete(order)}><Trash2 className="w-4 h-4" /></Button>}
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
      </div>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="p-4 pb-2"><CardDescription className="text-[10px] uppercase font-black text-primary">Venta Total Encargos</CardDescription></CardHeader>
          <CardContent className="p-4 pt-0"><div className="text-xl font-black text-primary">${orderTotalsSummary.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div></CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardHeader className="p-4 pb-2"><CardDescription className="text-[10px] uppercase font-black text-green-600">Total Abonado</CardDescription></CardHeader>
          <CardContent className="p-4 pt-0"><div className="text-xl font-black text-green-700">${orderTotalsSummary.totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div></CardContent>
        </Card>
        <Card className="bg-destructive/5 border-destructive/20">
          <CardHeader className="p-4 pb-2"><CardDescription className="text-[10px] uppercase font-black text-destructive">Por Recaudar</CardDescription></CardHeader>
          <CardContent className="p-4 pt-0"><div className="text-xl font-black text-destructive">${orderTotalsSummary.totalPending.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div></CardContent>
        </Card>
      </section>

      <Dialog open={isCreateOpen} onOpenChange={(o) => { setIsCreateOpen(o); if(!o) resetForm(); }}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingOrder ? 'Editar Encargo' : 'Nuevo Encargo Detallado'}</DialogTitle>
            <DialogDescription>Agrega múltiples productos y gestiona el historial de abonos del cliente.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-8 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase text-muted-foreground flex items-center gap-2"><User className="w-4 h-4" /> Datos del Cliente</h3>
                <div className="relative">
                  <Input 
                    placeholder="Buscar por nombre o teléfono..." 
                    className="h-10 text-sm bg-primary/5" 
                    value={customerSearchQuery}
                    onChange={e => setCustomerSearchQuery(e.target.value)}
                  />
                  {customerSearchResults.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-border rounded-lg shadow-xl overflow-hidden">
                      {customerSearchResults.map(c => (
                        <button key={c.id} type="button" className="w-full text-left px-4 py-2 hover:bg-primary/5 border-b last:border-0" onClick={() => handleSelectCustomer(c)}>
                          <span className="font-bold text-sm">{c.name}</span>
                          <div className="text-[10px] text-muted-foreground">{c.phone}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input placeholder="Nombre Completo *" value={formData.customerName} onChange={e => setFormData({...formData, customerName: e.target.value})} required />
                  <Input placeholder="Teléfono de Contacto *" value={formData.customerPhone} onChange={e => setFormData({...formData, customerPhone: e.target.value})} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input placeholder="Correo Electrónico" type="email" value={formData.customerEmail} onChange={e => setFormData({...formData, customerEmail: e.target.value})} />
                  <Input placeholder="ID Fiscal (CC / NIT)" value={formData.identificationNumber} onChange={e => setFormData({...formData, identificationNumber: e.target.value})} />
                </div>
                <Input placeholder="Dirección / Finca" value={formData.customerAddress} onChange={e => setFormData({...formData, customerAddress: e.target.value})} />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold">Fecha Pedido</Label>
                    <Input type="date" value={formData.requestDate} onChange={e => setFormData({...formData, requestDate: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-accent">Fecha Entrega *</Label>
                    <Input type="date" value={formData.deliveryDate} onChange={e => setFormData({...formData, deliveryDate: e.target.value})} />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase text-muted-foreground flex items-center gap-2"><Package className="w-4 h-4" /> Agregar Productos</h3>
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex gap-2">
                    <Select value={newItemProductId} onValueChange={(val) => {
                      setNewItemProductId(val);
                      const p = products.find(prod => prod.id === val);
                      if (p) {
                        setNewItemUnit(p.mainUnit as UnitType);
                        setNewItemPrice(p.salePrice.toString());
                      }
                    }}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Producto..." /></SelectTrigger>
                      <SelectContent>{sortedProductsForSelect.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2 items-end">
                    <div className="flex-1 space-y-1">
                      <Label className="text-[9px] uppercase font-bold text-muted-foreground">Cant.</Label>
                      <Input type="number" step="0.01" value={newItemQty} onChange={e => setNewItemQty(e.target.value)} />
                    </div>
                    <div className="w-24 space-y-1">
                      <Label className="text-[9px] uppercase font-bold text-muted-foreground">Unidad</Label>
                      <Select value={newItemUnit} onValueChange={(v: UnitType) => setNewItemUnit(v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="kilos">Kilos</SelectItem><SelectItem value="libras">Libras</SelectItem><SelectItem value="bultos">Bultos</SelectItem><SelectItem value="unidades">Unds</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1 space-y-1">
                      <Label className="text-[9px] uppercase font-bold text-primary">Precio Venta ($)</Label>
                      <Input type="number" step="0.01" value={newItemPrice} onChange={e => setNewItemPrice(e.target.value)} placeholder="0.00" />
                    </div>
                    <Button type="button" onClick={handleAddItem} size="icon" className="shrink-0 h-10 w-10"><Plus className="w-4 h-4" /></Button>
                  </div>
                </div>
                
                <div className="border rounded-lg overflow-hidden max-h-48 overflow-y-auto bg-muted/5">
                  <Table>
                    <TableBody>
                      {formItems.map((item, idx) => (
                        <TableRow key={idx} className="h-10">
                          <TableCell className="py-1 text-xs font-bold">{item.productName}</TableCell>
                          <TableCell className="py-1 text-xs text-muted-foreground">
                            {item.quantity}{item.unit} x ${item.price.toLocaleString()}
                          </TableCell>
                          <TableCell className="py-1 text-xs text-right font-bold text-primary">${item.total.toLocaleString()}</TableCell>
                          <TableCell className="py-1 text-right">
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="icon" 
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleRemoveItem(idx);
                              }} 
                              className="h-6 w-6 text-destructive"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {formItems.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-4 text-[10px] text-muted-foreground italic">No hay productos agregados.</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase text-muted-foreground flex items-center gap-2"><Banknote className="w-4 h-4" /> Gestión de Abonos</h3>
                <div className="flex gap-2">
                  <Input type="number" placeholder="Monto $" value={newPayAmount} onChange={e => setNewPayAmount(e.target.value)} className="flex-1" />
                  <Select value={newPayMethod} onValueChange={(v: PaymentMethod) => setNewPayMethod(v)}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="efectivo">Efectivo</SelectItem><SelectItem value="transferencia">Transf.</SelectItem></SelectContent>
                  </Select>
                  <Button type="button" onClick={handleAddPayment} variant="secondary" size="icon" className="shrink-0"><ListPlus className="w-4 h-4" /></Button>
                </div>
                <Input placeholder="Nota de pago (opcional)" value={newPayNotes} onChange={e => setNewPayNotes(e.target.value)} className="h-8 text-xs" />
                
                <div className="border rounded-lg max-h-40 overflow-y-auto">
                  <Table>
                    <TableBody>
                      {formPayments.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="py-1 text-[10px]">{new Date(p.date).toLocaleDateString()}</TableCell>
                          <TableCell className="py-1 text-xs font-bold capitalize">{p.method}</TableCell>
                          <TableCell className="py-1 text-xs text-right font-black text-green-600">${p.amount.toLocaleString()}</TableCell>
                          <TableCell className="py-1 text-right">
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="icon" 
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleRemovePayment(p.id);
                              }} 
                              className="h-6 w-6"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="bg-muted/30 p-6 rounded-2xl space-y-4 border border-border">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold text-muted-foreground"><span>Sub-Total Bruto:</span><span>${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
                  <div className="flex justify-between text-xs font-bold text-green-600"><span>Total Abonado:</span><span>-${totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
                  <Separator className="my-2" />
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-black uppercase text-foreground">Saldo Pendiente:</span>
                    <span className="text-2xl font-black text-destructive">${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Estado del Encargo</Label>
                  <Select value={formData.status} onValueChange={(v: OrderStatus) => setFormData({...formData, status: v})}>
                    <SelectTrigger className="h-10 font-bold"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="pending">Pendiente</SelectItem><SelectItem value="paid">Pagado (Completado)</SelectItem><SelectItem value="delivered">Entregado</SelectItem><SelectItem value="cancelled">Cancelado</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <DialogFooter className="border-t pt-6 gap-3">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
              <Button type="submit" size="lg" className="px-12 font-bold shadow-lg">Guardar Encargo</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingOrder} onOpenChange={(o) => !o && setViewingOrder(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Receipt className="w-5 h-5 text-primary" /> Recibo de Encargo</DialogTitle>
          </DialogHeader>
          {viewingOrder && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-8 bg-muted/20 p-4 rounded-xl border border-border">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-black text-muted-foreground">Cliente</p>
                  <p className="text-sm font-black text-primary">{viewingOrder.customerName}</p>
                  <p className="text-xs">{viewingOrder.customerPhone}</p>
                  <p className="text-[10px] text-muted-foreground italic">{viewingOrder.customerAddress}</p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-[10px] uppercase font-black text-muted-foreground">Logística</p>
                  <p className="text-xs font-bold">Solicitud: {new Date(viewingOrder.requestDate).toLocaleDateString()}</p>
                  <p className="text-sm font-black text-accent">Entrega: {viewingOrder.deliveryDate ? new Date(viewingOrder.deliveryDate).toLocaleDateString() : '-'}</p>
                  <div className="mt-2">{getStatusBadge(viewingOrder.status)}</div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-[10px] uppercase font-black text-muted-foreground tracking-widest px-1">Productos Solicitados</h4>
                <div className="border rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50"><TableRow><TableHead>Descripción</TableHead><TableHead className="text-right">Cantidad</TableHead><TableHead className="text-right">Precio</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {viewingOrder.items?.map((item, i) => (
                        <TableRow key={i}>
                          <TableCell className="py-2 font-bold text-xs">{item.productName}</TableCell>
                          <TableCell className="py-2 text-right text-xs">{item.quantity} {item.unit}</TableCell>
                          <TableCell className="py-2 text-right text-xs">${item.price.toLocaleString()}</TableCell>
                          <TableCell className="py-2 text-right font-bold text-xs">${item.total.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <h4 className="text-[10px] uppercase font-black text-muted-foreground tracking-widest px-1">Historial de Abonos</h4>
                  <div className="border rounded-xl p-3 space-y-2 bg-green-50/30">
                    {viewingOrder.payments?.map((p, i) => (
                      <div key={i} className="flex justify-between items-center text-xs border-b border-green-100 pb-1 last:border-0 last:pb-0">
                        <div className="space-y-0.5">
                          <p className="font-bold capitalize">{p.method}</p>
                          <p className="text-[10px] text-muted-foreground">{new Date(p.date).toLocaleDateString()}</p>
                        </div>
                        <p className="font-black text-green-700">${p.amount.toLocaleString()}</p>
                      </div>
                    ))}
                    {(!viewingOrder.payments || viewingOrder.payments.length === 0) && <p className="text-center text-[10px] text-muted-foreground italic py-4">No hay abonos registrados.</p>}
                  </div>
                </div>

                <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 flex flex-col justify-between">
                  <div className="flex justify-between items-center"><span className="text-[10px] uppercase font-bold text-muted-foreground">Valor del Pedido:</span><span className="font-bold">${viewingOrder.totalValue.toLocaleString()}</span></div>
                  <div className="flex justify-between items-center"><span className="text-[10px] uppercase font-bold text-green-600">Total Abonado:</span><span className="font-bold text-green-700">-${(viewingOrder.payments || []).reduce((s, p) => s + p.amount, 0).toLocaleString()}</span></div>
                  <Separator className="my-2" />
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-black text-destructive">Saldo Pendiente</p>
                    <p className="text-2xl font-black text-destructive">
                      ${(viewingOrder.totalValue - (viewingOrder.payments || []).reduce((s, p) => s + p.amount, 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setViewingOrder(null)} className="w-full">Cerrar Detalle</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!orderToDelete} onOpenChange={(open) => !open && setOrderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-destructive" /> ¿Confirmar Eliminación?</AlertDialogTitle>
            <AlertDialogDescription>¿Estás seguro de que deseas eliminar el encargo de <strong>{orderToDelete?.customerName}</strong>? Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (orderToDelete) deleteOrder(orderToDelete.id); setOrderToDelete(null); }} className="bg-destructive hover:bg-destructive/90 text-white">Eliminar Definitivamente</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
