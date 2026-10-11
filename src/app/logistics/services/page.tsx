
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
  Truck, 
  Plus, 
  Search, 
  MapPin, 
  User, 
  Coins, 
  Eye, 
  Pencil, 
  Trash2, 
  ChevronRight, 
  X,
  Clock,
  CheckCircle2,
  Route,
  Navigation as NavIcon,
  History as HistoryIcon,
  Zap,
  Save,
  Loader2,
  HandCoins,
  DollarSign as DollarSignIcon,
  Info,
  CircleHelp,
  Phone
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { LoadingScreen } from '@/components/LoadingScreen';
import { TransportService, TransportStatus, TransportPaymentStatus } from '@/lib/types';
import { TransportServiceForm } from '@/components/TransportServiceForm';
import { cn } from '@/lib/utils';

export default function TransportServicesPage() {
  const { transportServices, transportCollections, trucks, deleteTransportService, addTransportCollection, deleteTransportCollection, addTransportService, isLoading, isEnabled } = useAgriStock();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<TransportStatus | 'all'>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [viewingService, setViewingService] = useState<TransportService | null>(null);
  const [editingService, setEditingService] = useState<TransportService | null>(null);
  const [managingCollectionsFor, setManagingCollectionsFor] = useState<TransportService | null>(null);

  const [quickData, setQuickData] = useState({
    customerName: '',
    customerPhone: '',
    origin: '',
    destination: '',
    totalFreightPrice: '',
    truckId: ''
  });

  const [newCollAmount, setNewCollAmount] = useState('');
  const [newCollMethod, setNewCollMethod] = useState('Efectivo');
  const [newCollDate, setNewCollDate] = useState('');

  useEffect(() => {
    setMounted(true);
    if (!isUserLoading && !user) router.push('/login');
    // Set today's date on client side
    setNewCollDate(new Date().toISOString().split('T')[0]);
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (isQuickCreateOpen && trucks.length === 1 && !quickData.truckId) {
      setQuickData(prev => ({ ...prev, truckId: trucks[0].id }));
    }
  }, [isQuickCreateOpen, trucks, quickData.truckId]);

  const filteredServices = useMemo(() => {
    return transportServices.filter(s => {
      const searchStr = `${s.customerName} ${s.origin} ${s.destination} ${s.driverName}`.toLowerCase();
      const matchesSearch = searchStr.includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [transportServices, searchTerm, statusFilter]);

  if (isUserLoading || isLoading || !mounted) return <LoadingScreen />;
  if (!user || !isEnabled) return null;

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickData.customerName || !quickData.origin || !quickData.destination || !quickData.totalFreightPrice || !quickData.truckId) {
      toast({ variant: "destructive", title: "Faltan datos", description: "Por favor completa los campos obligatorios del servicio rápido." });
      return;
    }

    addTransportService({
      truckId: quickData.truckId,
      customerName: quickData.customerName,
      customerPhone: quickData.customerPhone,
      origin: quickData.origin,
      destination: quickData.destination,
      totalFreightPrice: parseFloat(quickData.totalFreightPrice),
      serviceDate: new Date().toISOString(),
      status: 'pending',
      paymentStatus: 'pending',
      totalPaid: 0,
      driverName: 'Por asignar',
      driverId: '',
      driverPhone: '',
      distanceKm: 0,
      estimatedTime: '',
      expenses: [],
      notes: 'Registrado mediante entrada rápida.'
    });

    toast({ title: "Servicio Registrado", description: "Se ha creado el servicio rápido con éxito." });
    setQuickData({ customerName: '', customerPhone: '', origin: '', destination: '', totalFreightPrice: '', truckId: '' });
    setIsQuickCreateOpen(false);
  };

  const handleAddCollection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!managingCollectionsFor || !newCollAmount) return;
    
    const amount = parseFloat(newCollAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ variant: "destructive", title: "Valor inválido", description: "El monto del abono debe ser mayor a cero." });
      return;
    }

    addTransportCollection({
      serviceId: managingCollectionsFor.id,
      amount: amount,
      method: newCollMethod,
      date: new Date(newCollDate).toISOString(),
      notes: ''
    });

    setNewCollAmount('');
    toast({ title: "Abono Registrado", description: "El pago se ha vinculado correctamente al servicio." });
  };

  const getCollectionsFor = (sid: string) => transportCollections.filter(c => c.serviceId === sid);

  const getStatusBadge = (status: TransportStatus) => {
    switch(status) {
      case 'pending': return <Badge variant="outline" className="gap-1 bg-yellow-50 text-yellow-600 border-yellow-200"><Clock className="w-3 h-3" /> Pendiente</Badge>;
      case 'in_progress': return <Badge variant="default" className="gap-1 bg-blue-500"><NavIcon className="w-3 h-3" /> En Ruta</Badge>;
      case 'finished': return <Badge variant="outline" className="gap-1 bg-green-50 text-green-600 border-green-200"><CheckCircle2 className="w-3 h-3" /> Finalizado</Badge>;
      case 'cancelled': return <Badge variant="destructive" className="gap-1"><X className="w-3 h-3" /> Cancelado</Badge>;
    }
  };

  const getPaymentBadge = (status: TransportPaymentStatus) => {
    switch(status) {
      case 'pending': return <Badge variant="outline" className="text-destructive border-destructive bg-destructive/5">Sin Pago</Badge>;
      case 'partial': return <Badge variant="outline" className="text-accent border-accent bg-accent/5 font-bold">Abono Parcial</Badge>;
      case 'paid': return <Badge variant="outline" className="text-primary border-primary bg-primary/5 font-black">Pagado Total</Badge>;
    }
  };

  return (
    <main className="flex-1 p-8 space-y-6 overflow-auto">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Route className="w-8 h-8 text-primary" />
              Servicios de Transporte
            </h1>
            <p className="text-muted-foreground">Registro de fletes y logística de carga fijos</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsQuickCreateOpen(true)} className="gap-2 border-accent text-accent hover:bg-accent/5 shadow-sm">
            <Zap className="w-4 h-4" /> Servicio Rápido
          </Button>
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2 shadow-md">
            <Plus className="w-4 h-4" /> Nuevo Servicio
          </Button>
        </div>
      </header>

      <div className="bg-white p-6 rounded-xl border border-border shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div className="md:col-span-2 relative">
          <Label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Buscar Viaje</Label>
          <Search className="absolute left-3 bottom-3 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Cliente, ruta, conductor..." className="pl-10 h-11" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <div>
          <Label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Estado Viaje</Label>
          <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
            <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendiente</SelectItem>
              <SelectItem value="in_progress">En Ruta</SelectItem>
              <SelectItem value="finished">Finalizado</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" className="h-11 gap-2" onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}>
          <X className="w-4 h-4" /> Limpiar
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead>Fecha / Estado</TableHead>
              <TableHead>Ruta (Origen - Destino)</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Seguimiento de Pago</TableHead>
              <TableHead className="text-right">Valor Flete</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredServices.map(s => (
              <TableRow key={s.id} className="hover:bg-muted/5 transition-colors">
                <TableCell>
                  <div className="text-xs font-bold">{new Date(s.serviceDate).toLocaleDateString()}</div>
                  <div className="mt-1">{getStatusBadge(s.status)}</div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-sm font-bold text-primary">
                    <MapPin className="w-3 h-3 text-accent" /> {s.origin} <ChevronRight className="w-3 h-3 text-muted-foreground" /> {s.destination}
                  </div>
                  <div className="text-[10px] text-muted-foreground flex items-center gap-2 mt-1">
                    <Truck className="w-3 h-3" /> {trucks.find(t => t.id === s.truckId)?.plate} | <User className="w-3 h-3 ml-1" /> {s.driverName}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-xs font-bold text-foreground">{s.customerName}</div>
                  <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Phone className="w-2.5 h-2.5" /> {s.customerPhone}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1.5 min-w-[120px]">
                    {getPaymentBadge(s.paymentStatus)}
                    <div className="flex justify-between items-end">
                      <span className="text-[10px] text-muted-foreground font-mono">
                        Abonado: <b className="text-primary">${s.totalPaid?.toLocaleString() || '0'}</b>
                      </span>
                      <span className="text-[9px] text-muted-foreground font-bold">
                        {Math.round(((s.totalPaid || 0) / s.totalFreightPrice) * 100)}%
                      </span>
                    </div>
                    <Progress value={((s.totalPaid || 0) / s.totalFreightPrice) * 100} className="h-1" />
                  </div>
                </TableCell>
                <TableCell className="text-right">
                   <div className="font-black text-primary text-sm">${s.totalFreightPrice.toLocaleString()}</div>
                   {s.totalPaid < s.totalFreightPrice && (
                     <div className="text-[9px] text-destructive font-bold">Saldo: ${(s.totalFreightPrice - (s.totalPaid || 0)).toLocaleString()}</div>
                   )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:bg-green-50" title="Asociar Pagos / Abonos" onClick={() => setManagingCollectionsFor(s)}>
                      <HandCoins className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:bg-blue-50" title="Ver Detalles" onClick={() => setViewingService(s)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/5" title="Editar" onClick={() => setEditingService(s)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/5" onClick={() => { if(confirm('¿Eliminar servicio?')) deleteTransportService(s.id); }}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredServices.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground italic">No hay servicios registrados.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isQuickCreateOpen} onOpenChange={setIsQuickCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-accent" />
              Servicio de Transporte Rápido
            </DialogTitle>
            <DialogDescription>Registra lo básico ahora y completa los detalles técnicos después.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleQuickSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Nombre Cliente *</Label>
                <Input value={quickData.customerName} onChange={e => setQuickData({...quickData, customerName: e.target.value})} placeholder="Ej: Juan Perez" required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Teléfono Contacto</Label>
                <Input value={quickData.customerPhone} onChange={e => setQuickData({...quickData, customerPhone: e.target.value})} placeholder="321..." />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Origen *</Label>
                <Input value={quickData.origin} onChange={e => setQuickData({...quickData, origin: e.target.value})} placeholder="Ciudad Origen" required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Destino *</Label>
                <Input value={quickData.destination} onChange={e => setQuickData({...quickData, destination: e.target.value})} placeholder="Ciudad Destino" required />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Seleccionar Camión *</Label>
              <Select value={quickData.truckId} onValueChange={v => setQuickData({...quickData, truckId: v})}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Elegir vehículo..." />
                </SelectTrigger>
                <SelectContent>
                  {trucks.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.plate} - {t.brand} ({t.capacityTons} Ton)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 bg-primary/5 p-4 rounded-xl border border-primary/10">
              <Label className="text-sm font-black text-primary">VALOR TOTAL FLETE ($) *</Label>
              <Input 
                type="number" 
                step="0.01" 
                value={quickData.totalFreightPrice} 
                onChange={e => setQuickData({...quickData, totalFreightPrice: e.target.value})} 
                className="h-11 text-xl font-black text-primary bg-white text-center" 
                placeholder="0.00"
                required 
              />
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsQuickCreateOpen(false)} className="flex-1">Cancelar</Button>
              <Button type="submit" className="flex-1 gap-2">
                <Save className="w-4 h-4" /> Guardar Rápido
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateOpen || !!editingService} onOpenChange={open => { if(!open) { setIsCreateOpen(false); setEditingService(null); } }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingService ? 'Editar Servicio' : 'Nuevo Servicio de Transporte'}</DialogTitle>
          </DialogHeader>
          <TransportServiceForm 
            initialData={editingService} 
            onClose={() => { setIsCreateOpen(false); setEditingService(null); }} 
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingService} onOpenChange={o => !o && setViewingService(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Detalle del Viaje: #{viewingService?.id.substring(0,6).toUpperCase()}</DialogTitle></DialogHeader>
          {viewingService && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-8 bg-muted/20 p-4 rounded-xl border border-border">
                <div className="space-y-2">
                  <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Información Logística</p>
                  <div className="flex items-center gap-2 font-bold text-primary"><MapPin className="w-4 h-4 text-accent" /> {viewingService.origin} <ChevronRight className="w-3 h-3 text-muted-foreground" /> {viewingService.destination}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1"><Truck className="w-3 h-3" /> Placa: {trucks.find(t => t.id === viewingService.truckId)?.plate}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2"><User className="w-3 h-3" /> Conductor: {viewingService.driverName} ({viewingService.driverPhone})</div>
                </div>
                <div className="text-right space-y-2">
                  <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Estado Viaje</p>
                  <div>{getStatusBadge(viewingService.status)}</div>
                  <div className="text-xs font-bold mt-2">Fecha: {new Date(viewingService.serviceDate).toLocaleDateString()}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase text-muted-foreground border-b pb-1 tracking-wider">Análisis de Ruta</h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-2 bg-primary/5 rounded border border-primary/10"><b>Distancia:</b><br/>{viewingService.distanceKm} km</div>
                    <div className="p-2 bg-primary/5 rounded border border-primary/10"><b>Tiempo Est.:</b><br/>{viewingService.estimatedTime}</div>
                    <div className="col-span-2">
                      <Button variant="outline" size="sm" className="w-full gap-2 text-xs h-8" asChild>
                        <a href={`https://www.google.com/maps/dir/${encodeURIComponent(viewingService.origin)}/${encodeURIComponent(viewingService.destination)}`} target="_blank">
                          <MapPin className="w-3 h-3" /> Ver Ruta en Google Maps
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b pb-1">
                    <h4 className="text-xs font-black uppercase text-muted-foreground tracking-wider">Balance Financiero</h4>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 px-2 text-[10px] font-bold text-green-600 gap-1 hover:bg-green-50"
                      onClick={() => { setViewingService(null); setManagingCollectionsFor(viewingService); }}
                    >
                      <HandCoins className="w-3 h-3" /> Asociar Pago
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs"><span>Valor Flete:</span><span className="font-bold">${viewingService.totalFreightPrice.toLocaleString()}</span></div>
                    <div className="flex justify-between text-xs text-green-600"><span>Total Abonado:</span><span className="font-bold">-${viewingService.totalPaid?.toLocaleString()}</span></div>
                    <div className="flex justify-between pt-1 border-t text-sm font-black text-destructive">
                      <span>Saldo Pendiente:</span>
                      <span>${(viewingService.totalFreightPrice - (viewingService.totalPaid || 0)).toLocaleString()}</span>
                    </div>
                    <div className="space-y-1.5 pt-2">
                      <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase">
                         <span>Progreso Recaudo</span>
                         <span>{Math.round(((viewingService.totalPaid || 0) / viewingService.totalFreightPrice) * 100)}%</span>
                      </div>
                      <Progress value={((viewingService.totalPaid || 0) / viewingService.totalFreightPrice) * 100} className="h-1.5" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase text-muted-foreground border-b pb-1 tracking-wider">Gastos del Viaje</h4>
                <div className="border rounded-xl overflow-hidden shadow-sm">
                  <Table>
                    <TableBody>
                      {(viewingService.expenses || []).map((exp, i) => (
                        <TableRow key={i} className="h-8 hover:bg-muted/10">
                          <TableCell className="py-1 text-[10px] uppercase font-bold text-muted-foreground">{exp.type.replace('_',' ')}</TableCell>
                          <TableCell className="py-1 text-[10px]">{exp.notes || '-'}</TableCell>
                          <TableCell className="py-1 text-right font-bold text-xs">${exp.amount.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                      {(viewingService.expenses || []).length === 0 && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-6 text-[10px] text-muted-foreground italic">Sin gastos operativos registrados.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest px-1">Observaciones / Notas</p>
                <div className="p-3 bg-muted/20 border border-dashed rounded-lg text-xs italic text-muted-foreground whitespace-pre-wrap">
                  {viewingService.notes || 'No se registraron notas adicionales para este servicio.'}
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setViewingService(null)} className="w-full h-11">Cerrar Detalle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!managingCollectionsFor} onOpenChange={o => !o && setManagingCollectionsFor(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HandCoins className="w-5 h-5 text-green-600" />
              Gestión de Abonos y Avances
            </DialogTitle>
            <DialogDescription>
              Asocia pagos del cliente: {managingCollectionsFor?.customerName}
            </DialogDescription>
          </DialogHeader>
          {managingCollectionsFor && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-3 bg-primary/5 border-none shadow-none text-center">
                  <p className="text-[9px] uppercase font-black text-muted-foreground tracking-tighter">Flete Acordado</p>
                  <p className="font-black text-lg text-primary">${managingCollectionsFor.totalFreightPrice.toLocaleString()}</p>
                </Card>
                <Card className="p-3 bg-destructive/5 border-none shadow-none text-center">
                  <p className="text-[9px] uppercase font-black text-destructive tracking-tighter">Saldo por Cobrar</p>
                  <p className="font-black text-lg text-destructive">${(managingCollectionsFor.totalFreightPrice - (managingCollectionsFor.totalPaid || 0)).toLocaleString()}</p>
                </Card>
              </div>

              <form onSubmit={handleAddCollection} className="space-y-4 bg-muted/30 p-5 rounded-2xl border border-dashed border-border shadow-inner">
                <h4 className="text-[10px] font-black uppercase text-foreground tracking-widest flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Registrar Nuevo Avance
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold">Fecha Abono</Label>
                    <Input type="date" value={newCollDate} onChange={e => setNewCollDate(e.target.value)} className="h-9 bg-white" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-green-700">Monto del Avance $</Label>
                    <Input type="number" step="0.01" value={newCollAmount} onChange={e => setNewCollAmount(e.target.value)} required className="h-9 font-black text-green-700 bg-white" placeholder="0.00" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold">Medio de Recepción</Label>
                  <Select value={newCollMethod} onValueChange={setNewCollMethod}>
                    <SelectTrigger className="h-9 bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Efectivo">Efectivo (Caja)</SelectItem>
                      <SelectItem value="Transferencia">Transferencia Bancaria</SelectItem>
                      <SelectItem value="Bancolombia">A la mano / Bancolombia</SelectItem>
                      <SelectItem value="Nequi">Nequi</SelectItem>
                      <SelectItem value="Cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full h-10 bg-green-600 hover:bg-green-700 font-bold shadow-md">
                  Vincular Pago al Servicio
                </Button>
              </form>

              <div className="space-y-3">
                <h4 className="text-[10px] font-black uppercase flex items-center gap-2 tracking-widest text-muted-foreground border-b pb-1">
                  <HistoryIcon className="w-3 h-3" /> Historial de Avances Realizados
                </h4>
                <div className="max-h-[200px] overflow-y-auto space-y-2 pr-2">
                  {getCollectionsFor(managingCollectionsFor.id).map(coll => (
                    <div key={coll.id} className="flex justify-between items-center p-3 bg-white rounded-xl border border-border text-xs group hover:border-green-200 transition-colors shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="bg-green-100 p-2 rounded-full text-green-600">
                          <DollarSignIcon className="w-3 h-3" />
                        </div>
                        <div>
                          <p className="font-black text-primary text-sm">${coll.amount.toLocaleString()}</p>
                          <p className="text-[9px] text-muted-foreground uppercase font-bold">{new Date(coll.date).toLocaleDateString()} — {coll.method}</p>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/5 opacity-0 group-hover:opacity-100 transition-opacity" 
                        onClick={() => { if(confirm('¿Eliminar este abono?')) deleteTransportCollection(coll.id); }}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                  {getCollectionsFor(managingCollectionsFor.id).length === 0 && (
                    <div className="text-center py-8">
                       <HandCoins className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                       <p className="text-[10px] text-muted-foreground italic">No hay avances o abonos registrados aún.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setManagingCollectionsFor(null)} className="w-full h-11">Finalizar Gestión</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
