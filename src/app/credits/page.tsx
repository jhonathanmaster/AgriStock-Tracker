
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
import { Progress } from '@/components/ui/progress';
import { 
  Plus, 
  Search, 
  Pencil,
  Trash2,
  CalendarDays,
  Eye,
  Package,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  User,
  Phone,
  HandCoins,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CreditCard,
  Coins,
  History
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
import { Credit, CreditStatus, Customer, CreditCollection, CreditItem, UnitType } from '@/lib/types';
import { LoadingScreen } from '@/components/LoadingScreen';
import { Separator } from '@/components/ui/separator';

type SortConfig = {
  key: keyof Credit | 'customerName';
  direction: 'asc' | 'desc' | null;
};

export default function CreditsPage() {
  const { 
    credits, 
    creditCollections,
    products, 
    customers,
    addCredit, 
    updateCredit,
    deleteCredit,
    addCreditCollection,
    deleteCreditCollection,
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
  const [statusFilter, setStatusFilter] = useState<CreditStatus | 'all'>('all');
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCredit, setEditingCredit] = useState<Credit | null>(null);
  const [viewingCredit, setViewingCredit] = useState<Credit | null>(null);
  const [managingCollectionsFor, setManagingCollectionsFor] = useState<Credit | null>(null);
  const [creditToDelete, setCreditToDelete] = useState<Credit | null>(null);

  const [newCollectionAmount, setNewCollectionAmount] = useState('');
  const [newCollectionDate, setNewCollectionDate] = useState('');
  const [newCollectionNotes, setNewCollectionNotes] = useState('');

  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [formItems, setFormItems] = useState<CreditItem[]>([]);
  
  const [newItemProductId, setNewItemProductId] = useState('');
  const [newItemQty, setNewItemQty] = useState('1');
  const [newItemUnit, setNewItemUnit] = useState<UnitType>('kilos');
  const [newItemPrice, setNewItemPrice] = useState('');

  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'agreementDate', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  const [formData, setFormData] = useState({
    customerId: '', 
    customerName: '',
    customerPhone: '',
    installments: '1',
    status: 'active' as CreditStatus,
    agreementDate: '',
    expectedEndDate: '',
    description: '',
    notes: ''
  });

  useEffect(() => {
    setMounted(true);
    if (!isUserLoading && !user) {
      router.push('/login');
    }
    const today = new Date().toISOString().split('T')[0];
    setFormData(prev => ({ ...prev, agreementDate: prev.agreementDate || today }));
    setNewCollectionDate(today);
  }, [user, isUserLoading, router]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, itemsPerPage, sortConfig]);

  const handleSort = (key: SortConfig['key']) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        if (prev.direction === 'asc') return { key, direction: 'desc' };
        if (prev.direction === 'desc') return { key: 'agreementDate', direction: 'desc' };
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
      customerName: c.name,
      customerPhone: c.phone
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

    const newItem: CreditItem = {
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

  const currentTotalValue = useMemo(() => formItems.reduce((sum, item) => sum + item.total, 0), [formItems]);

  const filteredCredits = useMemo(() => {
    let list = (credits || []).filter(c => {
      const searchString = `${c.customerName || ''} ${c.description || ''}`.toLowerCase();
      const matchesSearch = searchString.includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    if (sortConfig.direction) {
      list = [...list].sort((a, b) => {
        let valA = a[sortConfig.key as keyof Credit] ?? '';
        let valB = b[sortConfig.key as keyof Credit] ?? '';
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return list;
  }, [credits, searchTerm, statusFilter, sortConfig]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (formItems.length === 0 || !formData.customerName || !formData.customerPhone || !formData.agreementDate) {
      toast({ variant: "destructive", title: "Error", description: "Completa los datos del cliente y agrega al menos un producto." });
      return;
    }

    saveCustomer({
      id: formData.customerId || undefined,
      name: formData.customerName,
      phone: formData.customerPhone
    });

    const creditData: Omit<Credit, 'id'> = {
      customerId: formData.customerId || '',
      customerName: formData.customerName,
      customerPhone: formData.customerPhone,
      items: formItems,
      totalValue: currentTotalValue,
      installments: parseInt(formData.installments),
      status: formData.status,
      agreementDate: formData.agreementDate,
      expectedEndDate: formData.expectedEndDate || null,
      description: formData.description,
      createdAt: editingCredit?.createdAt || new Date().toISOString(),
      notes: formData.notes
    };

    if (editingCredit) {
      updateCredit(editingCredit.id, creditData);
      toast({ title: "Crédito Actualizado" });
    } else {
      addCredit(creditData);
      toast({ title: "Crédito Registrado" });
    }

    resetForm();
    setIsCreateOpen(false);
  };

  const handleAddCollection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!managingCollectionsFor || !newCollectionAmount || !newCollectionDate) return;

    const amount = parseFloat(newCollectionAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ variant: "destructive", title: "Error", description: "El valor debe ser mayor a cero." });
      return;
    }

    addCreditCollection({
      creditId: managingCollectionsFor.id,
      amount: amount,
      date: new Date(newCollectionDate).toISOString(),
      notes: newCollectionNotes
    });

    setNewCollectionAmount('');
    setNewCollectionNotes('');
    toast({ title: "Abono Registrado" });
  };

  const getCollectionsForCredit = (creditId: string) => {
    return (creditCollections || []).filter(c => c.creditId === creditId);
  };

  const getTotalCollected = (creditId: string) => {
    return getCollectionsForCredit(creditId).reduce((sum, c) => sum + (c.amount || 0), 0);
  };

  const resetForm = () => {
    setFormData({ 
      customerId: '',
      customerName: '',
      customerPhone: '',
      installments: '1',
      status: 'active',
      agreementDate: new Date().toISOString().split('T')[0],
      expectedEndDate: '',
      description: '',
      notes: '' 
    });
    setFormItems([]);
    setEditingCredit(null);
    setCustomerSearchQuery('');
  };

  const handleEdit = (credit: Credit) => {
    setEditingCredit(credit);
    setFormItems(credit.items || []);
    setFormData({
      customerId: credit.customerId,
      customerName: credit.customerName,
      customerPhone: credit.customerPhone,
      installments: credit.installments.toString(),
      status: credit.status,
      agreementDate: credit.agreementDate || '',
      expectedEndDate: credit.expectedEndDate || '',
      description: credit.description,
      notes: credit.notes || ''
    });
    setIsCreateOpen(true);
  };

  const confirmDelete = () => {
    if (creditToDelete) {
      deleteCredit(creditToDelete.id);
      const collections = getCollectionsForCredit(creditToDelete.id);
      collections.forEach(c => deleteCreditCollection(c.id));
      toast({ title: "Crédito Eliminado" });
      setCreditToDelete(null);
    }
  };

  const getStatusBadge = (status: CreditStatus) => {
    switch(status) {
      case 'active': return <Badge variant="outline" className="gap-1 text-accent border-accent bg-accent/5"><Clock className="w-3 h-3" /> Activo</Badge>;
      case 'paid': return <Badge variant="outline" className="gap-1 text-primary border-primary bg-primary/5"><CheckCircle2 className="w-3 h-3" /> Pagado</Badge>;
      case 'cancelled': return <Badge variant="outline" className="gap-1 text-destructive border-destructive bg-destructive/5"><XCircle className="w-3 h-3" /> Cancelado</Badge>;
    }
  };

  const paginatedCredits = filteredCredits.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredCredits.length / itemsPerPage);

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
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <HandCoins className="w-8 h-8 text-primary" />
              Gestión de Créditos
            </h1>
            <p className="text-muted-foreground">Registro de ventas a crédito y acuerdos de pago</p>
          </div>
        </div>
        <Button onClick={() => { resetForm(); setIsCreateOpen(true); }} className="gap-2 shadow-sm">
          <Plus className="w-4 h-4" />
          Nuevo Crédito
        </Button>
      </header>

      <div className="flex flex-col space-y-4 bg-white p-6 rounded-xl border border-border shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-end">
          <div className="flex items-center gap-3 px-4 py-2 bg-accent/5 rounded-lg border border-accent/10 h-11">
            <div className="p-1.5 bg-accent/10 rounded-full text-accent">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[9px] uppercase font-black text-muted-foreground leading-tight tracking-wider">Créditos Activos</p>
              <p className="text-sm font-black text-accent leading-tight">
                {credits.filter(c => c.status === 'active').length} Acuerdos
              </p>
            </div>
          </div>

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
                <SelectItem value="active">Activos</SelectItem>
                <SelectItem value="paid">Pagados</SelectItem>
                <SelectItem value="cancelled">Cancelados</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button variant="outline" className="h-11 gap-2 border-primary/20" onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}>
            <X className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-bold uppercase tracking-tight">Limpiar</span>
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
              <TableHead className="cursor-pointer hover:bg-secondary/30 transition-colors" onClick={() => handleSort('customerName')}>
                <div className="flex items-center">Cliente <SortIcon column="customerName" /></div>
              </TableHead>
              <TableHead>Contenido</TableHead>
              <TableHead className="text-right">Saldo Pend.</TableHead>
              <TableHead className="text-right cursor-pointer hover:bg-secondary/30 transition-colors" onClick={() => handleSort('totalValue')}>
                <div className="flex items-center justify-end">Valor Acuerdo <SortIcon column="totalValue" /></div>
              </TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedCredits.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  No se encontraron registros de crédito.
                </TableCell>
              </TableRow>
            ) : paginatedCredits.map(credit => {
              const totalCollected = getTotalCollected(credit.id);
              const balance = credit.totalValue - totalCollected;
              
              return (
                <TableRow key={credit.id}>
                  <TableCell>{getStatusBadge(credit.status)}</TableCell>
                  <TableCell>
                    <div className="text-xs font-bold text-primary">{credit.customerName}</div>
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Phone className="w-2.5 h-2.5" /> {credit.customerPhone}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[10px]">{credit.items?.length || 0} productos</Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs font-bold text-destructive">
                    ${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right font-black text-accent">${credit.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <button className="h-8 w-8 flex items-center justify-center text-green-600 hover:bg-green-50 rounded-md transition-colors" title="Abonos / Recaudos" onClick={() => setManagingCollectionsFor(credit)}>
                        <Coins className="w-4 h-4" />
                      </button>
                      <button className="h-8 w-8 flex items-center justify-center text-blue-500 hover:bg-blue-50 rounded-md transition-colors" onClick={() => setViewingCredit(credit)}>
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="h-8 w-8 flex items-center justify-center text-primary hover:bg-primary/5 rounded-md transition-colors" onClick={() => handleEdit(credit)}>
                        <Pencil className="w-4 h-4" />
                      </button>
                      {isAdmin && (
                        <button className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:bg-destructive/5 hover:text-destructive rounded-md transition-colors" onClick={() => setCreditToDelete(credit)}>
                          <Trash2 className="w-4 h-4" />
                        </button>
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
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="gap-1 h-8">
              <ChevronLeft className="w-4 h-4" /> Anterior
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages || totalPages === 0} className="gap-1 h-8">
              Siguiente <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={isCreateOpen} onOpenChange={(o) => { setIsCreateOpen(o); if(!o) resetForm(); }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCredit ? 'Editar Acuerdo de Crédito' : 'Registrar Nuevo Crédito'}</DialogTitle>
            <DialogDescription>Define las condiciones del pago a plazos para el cliente y agrega productos.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-8 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase text-muted-foreground flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" /> Datos del Cliente
                </h3>
                <div className="relative">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Buscar Cliente</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      placeholder="Nombre o teléfono..." 
                      className="pl-9 h-10 text-sm bg-primary/5 border-primary/20" 
                      value={customerSearchQuery}
                      onChange={e => setCustomerSearchQuery(e.target.value)}
                    />
                  </div>
                  {customerSearchResults.length > 0 && (
                    <div className="absolute z-20 w-full mt-1 bg-white border border-border rounded-lg shadow-xl overflow-hidden">
                      {customerSearchResults.map(c => (
                        <button key={c.id} type="button" className="w-full text-left px-4 py-2 hover:bg-primary/5 transition-colors border-b last:border-0" onClick={() => handleSelectCustomer(c)}>
                          <span className="font-bold text-sm text-primary">{c.name}</span>
                          <div className="text-[10px] text-muted-foreground">{c.phone}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Nombre Completo *</Label>
                  <Input value={formData.customerName} onChange={e => setFormData({...formData, customerName: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label>Teléfono *</Label>
                  <Input value={formData.customerPhone} onChange={e => setFormData({...formData, customerPhone: e.target.value})} required />
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
                      <SelectContent>
                        {sortedProductsForSelect.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
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
                        <SelectContent><SelectItem value="kilos">Kg</SelectItem><SelectItem value="libras">Lb</SelectItem><SelectItem value="bultos">Bl</SelectItem><SelectItem value="unidades">Un</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1 space-y-1">
                      <Label className="text-[9px] uppercase font-bold text-primary">Precio Venta ($)</Label>
                      <Input type="number" step="0.01" value={newItemPrice} onChange={e => setNewItemPrice(e.target.value)} placeholder="0.00" />
                    </div>
                    <Button type="button" onClick={handleAddItem} size="icon" className="shrink-0 h-10 w-10"><Plus className="w-4 h-4" /></Button>
                  </div>
                </div>
                
                <div className="border rounded-lg overflow-hidden max-h-40 overflow-y-auto bg-muted/5">
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
                            <button 
                              type="button" 
                              onClick={(e) => {
                                e.preventDefault();
                                handleRemoveItem(idx);
                              }} 
                              className="h-6 w-6 text-destructive flex items-center justify-center rounded-full hover:bg-destructive/10"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {formItems.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-4 text-[10px] text-muted-foreground italic">Agregue productos al crédito.</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase text-muted-foreground flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-primary" /> Plazos y Estado
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5"><CalendarDays className="w-3 h-3" /> Fecha Acuerdo *</Label>
                    <Input type="date" value={formData.agreementDate} onChange={e => setFormData({...formData, agreementDate: e.target.value})} required />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5">Fin Esperado</Label>
                    <Input type="date" value={formData.expectedEndDate} onChange={e => setFormData({...formData, expectedEndDate: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Número de Cuotas *</Label>
                    <Input type="number" value={formData.installments} onChange={e => setFormData({...formData, installments: e.target.value})} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <Select value={formData.status} onValueChange={(v: CreditStatus) => setFormData({...formData, status: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Activo</SelectItem>
                        <SelectItem value="paid">Pagado</SelectItem>
                        <SelectItem value="cancelled">Cancelados</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="bg-muted/30 p-6 rounded-2xl space-y-4 border border-border">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-black uppercase text-foreground">VALOR TOTAL ACUERDO:</span>
                  <span className="text-3xl font-black text-accent">${currentTotalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">Condiciones Especiales</Label>
                  <textarea 
                    className="w-full min-h-[80px] p-3 rounded-md border border-input bg-background text-sm"
                    placeholder="Fechas de pago, compromisos..."
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
              <Button type="submit" size="lg" className="px-12 font-bold shadow-lg">{editingCredit ? 'Guardar Cambios' : 'Registrar Crédito'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!managingCollectionsFor} onOpenChange={(o) => !o && setManagingCollectionsFor(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-green-600" />
              Gestión de Abonos: {managingCollectionsFor?.customerName}
            </DialogTitle>
            <DialogDescription>Registra pagos parciales y revisa el historial de recaudos.</DialogDescription>
          </DialogHeader>
          
          {managingCollectionsFor && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4 bg-muted/20 border-none shadow-none">
                  <p className="text-[10px] uppercase font-black text-muted-foreground mb-1">Valor Total</p>
                  <p className="text-lg font-bold">${managingCollectionsFor.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                </Card>
                <Card className="p-4 bg-green-50 border-none shadow-none">
                  <p className="text-[10px] uppercase font-black text-green-600 mb-1">Abonado a la Fecha</p>
                  <p className="text-lg font-bold text-green-700">${getTotalCollected(managingCollectionsFor.id).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                </Card>
                <Card className="p-4 bg-destructive/5 border-none shadow-none">
                  <p className="text-[10px] uppercase font-black text-destructive mb-1">Saldo Restante</p>
                  <p className="text-lg font-bold text-destructive">${(managingCollectionsFor.totalValue - getTotalCollected(managingCollectionsFor.id)).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                </Card>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold uppercase text-muted-foreground px-1">
                  <span>Progreso de Pago</span>
                  <span>{((getTotalCollected(managingCollectionsFor.id) / managingCollectionsFor.totalValue) * 100).toFixed(1)}%</span>
                </div>
                <Progress value={(getTotalCollected(managingCollectionsFor.id) / managingCollectionsFor.totalValue) * 100} className="h-2" />
              </div>

              <Separator />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="text-sm font-bold flex items-center gap-2">
                    <Plus className="w-4 h-4 text-primary" /> Registrar Nuevo Abono
                  </h4>
                  <form onSubmit={handleAddCollection} className="space-y-4 bg-muted/10 p-4 rounded-xl border border-border">
                    <div className="space-y-2">
                      <Label>Fecha del Abono</Label>
                      <Input type="date" value={newCollectionDate} onChange={e => setNewCollectionDate(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Valor del Abono ($) *</Label>
                      <Input type="number" step="0.01" value={newCollectionAmount} onChange={e => setNewCollectionAmount(e.target.value)} placeholder="0.00" required className="font-bold text-green-700" />
                    </div>
                    <div className="space-y-2">
                      <Label>Notas / Comentarios</Label>
                      <Input value={newCollectionNotes} onChange={e => setNewCollectionNotes(e.target.value)} placeholder="Ej: Pago cuota 1" />
                    </div>
                    <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">Guardar Abono</Button>
                  </form>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-bold flex items-center gap-2">
                    <History className="w-4 h-4 text-blue-500" /> Historial de Pagos
                  </h4>
                  <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2">
                    {getCollectionsForCredit(managingCollectionsFor.id).length === 0 ? (
                      <p className="text-xs text-center py-10 text-muted-foreground italic">No hay abonos registrados.</p>
                    ) : getCollectionsForCredit(managingCollectionsFor.id).map(coll => (
                      <div key={coll.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-border group hover:border-primary/30 transition-colors">
                        <div>
                          <p className="text-[10px] font-bold text-muted-foreground">{new Date(coll.date).toLocaleDateString()}</p>
                          <p className="text-sm font-bold text-primary">${coll.amount.toLocaleString()}</p>
                          {coll.notes && <p className="text-[9px] text-muted-foreground italic">{coll.notes}</p>}
                        </div>
                        {isAdmin && (
                          <button 
                            type="button"
                            className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-destructive rounded-full hover:bg-destructive/10"
                            onClick={(e) => {
                              e.preventDefault();
                              deleteCreditCollection(coll.id);
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setManagingCollectionsFor(null)} className="w-full">Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingCredit} onOpenChange={(o) => !o && setViewingCredit(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HandCoins className="w-5 h-5 text-primary" />
              Detalle del Crédito
            </DialogTitle>
          </DialogHeader>
          {viewingCredit && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-8 bg-muted/20 p-4 rounded-xl border border-border">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-black text-muted-foreground">Cliente</p>
                  <p className="text-sm font-black text-primary">{viewingCredit.customerName}</p>
                  <p className="text-xs">{viewingCredit.customerPhone}</p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-[10px] uppercase font-black text-muted-foreground">Estado</p>
                  <div>{getStatusBadge(viewingCredit.status)}</div>
                  <p className="text-[10px] mt-2">Registro: {new Date(viewingCredit.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-[10px] uppercase font-black text-muted-foreground tracking-widest px-1">Productos Incluidos</h4>
                <div className="border rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50"><TableRow><TableHead>Descripción</TableHead><TableHead className="text-right">Cant.</TableHead><TableHead className="text-right">Precio</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {viewingCredit.items?.map((item, i) => (
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

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
                  <p className="text-[10px] uppercase text-muted-foreground font-bold">Acuerdo</p>
                  <p className="text-sm font-bold">{new Date(viewingCredit.agreementDate + 'T00:00:00').toLocaleDateString()}</p>
                </div>
                <div className="p-3 bg-primary/5 rounded-lg border border-primary/10 text-right">
                  <p className="text-[10px] uppercase text-muted-foreground font-bold">Valor Total</p>
                  <p className="text-lg font-black text-accent">${viewingCredit.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] uppercase text-muted-foreground font-bold">Descripción / Condiciones</p>
                <div className="text-xs text-muted-foreground bg-muted/20 p-3 rounded-lg border border-dashed border-border italic whitespace-pre-wrap">
                  {viewingCredit.description || 'Sin descripción adicional.'}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingCredit(null)} className="w-full">Cerrar Vista</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!creditToDelete} onOpenChange={(open) => !open && setCreditToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              ¿Confirmar Eliminación?
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar este crédito de <strong>{creditToDelete?.customerName}</strong>? 
              Se eliminarán también todos los abonos registrados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90 text-white">
              Eliminar Definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
