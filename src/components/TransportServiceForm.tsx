
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useAgriStock } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Truck, 
  User, 
  MapPin, 
  ChevronRight, 
  Plus, 
  Trash2, 
  Navigation as NavIcon, 
  Fuel, 
  Coins, 
  History as HistoryIcon,
  CalendarDays,
  Search,
  CheckCircle2,
  AlertTriangle,
  BadgeDollarSign
} from 'lucide-react';
import { TransportService, Truck as TruckType, TripExpense, TransportStatus, Customer } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface TransportServiceFormProps {
  initialData?: TransportService | null;
  onClose: () => void;
}

export function TransportServiceForm({ initialData, onClose }: TransportServiceFormProps) {
  const { trucks, customers, saveCustomer, addTransportService, updateTransportService } = useAgriStock();
  const { toast } = useToast();

  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [formExpenses, setFormExpenses] = useState<TripExpense[]>(initialData?.expenses || []);
  
  const [formData, setFormData] = useState({
    truckId: initialData?.truckId || '',
    customerId: initialData?.customerId || '',
    customerName: initialData?.customerName || '',
    customerPhone: initialData?.customerPhone || '',
    origin: initialData?.origin || '',
    destination: initialData?.destination || '',
    distanceKm: initialData?.distanceKm?.toString() || '0',
    estimatedTime: initialData?.estimatedTime || '',
    serviceDate: initialData?.serviceDate?.split('T')[0] || new Date().toISOString().split('T')[0],
    status: initialData?.status || 'pending' as TransportStatus,
    totalFreightPrice: initialData?.totalFreightPrice?.toString() || '0',
    driverName: initialData?.driverName || '',
    driverId: initialData?.driverId || '',
    driverPhone: initialData?.driverPhone || '',
    notes: initialData?.notes || ''
  });

  // Expense temporary form
  const [newExpType, setNewExpType] = useState<TripExpense['type']>('gasoline');
  const [newExpAmount, setNewExpAmount] = useState('');
  const [newExpNotes, setNewExpNotes] = useState('');

  const selectedTruck = useMemo(() => trucks.find(t => t.id === formData.truckId), [trucks, formData.truckId]);
  
  const projectedFuelCost = useMemo(() => {
    if (!selectedTruck || !formData.distanceKm) return 0;
    const dist = parseFloat(formData.distanceKm);
    const performance = selectedTruck.averageKmPerGallon || 15;
    const gallonsNeeded = dist / performance;
    const estimatedPricePerGallon = 15000; 
    return gallonsNeeded * estimatedPricePerGallon;
  }, [selectedTruck, formData.distanceKm]);

  const customerSearchResults = useMemo(() => {
    if (!customerSearchQuery || customerSearchQuery.length < 2) return [];
    const query = customerSearchQuery.toLowerCase();
    return (customers || []).filter(c => 
      c.name.toLowerCase().includes(query) || 
      c.phone.includes(query)
    ).slice(0, 5);
  }, [customerSearchQuery, customers]);

  const handleSelectCustomer = (c: Customer) => {
    setFormData(prev => ({
      ...prev,
      customerId: c.id,
      customerName: c.name,
      customerPhone: c.phone
    }));
    setCustomerSearchQuery('');
  };

  const handleAddExpense = () => {
    if (!newExpAmount || parseFloat(newExpAmount) <= 0) return;
    const newExp: TripExpense = {
      id: Math.random().toString(36).substring(7),
      type: newExpType,
      amount: parseFloat(newExpAmount),
      date: new Date().toISOString(),
      notes: newExpNotes
    };
    setFormExpenses(prev => [...prev, newExp]);
    setNewExpAmount('');
    setNewExpNotes('');
  };

  const handleRemoveExpense = (id: string) => {
    setFormExpenses(prev => prev.filter(e => e.id !== id));
  };

  const totalExpenses = useMemo(() => formExpenses.reduce((sum, e) => sum + e.amount, 0), [formExpenses]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.truckId || !formData.customerName || !formData.origin || !formData.destination) {
      toast({ variant: "destructive", title: "Error", description: "Completa los campos obligatorios." });
      return;
    }

    const cId = await saveCustomer({
      id: formData.customerId || undefined,
      name: formData.customerName,
      phone: formData.customerPhone
    });

    const serviceData = {
      ...formData,
      customerId: cId,
      distanceKm: parseFloat(formData.distanceKm),
      totalFreightPrice: parseFloat(formData.totalFreightPrice),
      totalPaid: initialData?.totalPaid || 0,
      paymentStatus: (initialData?.paymentStatus || 'pending') as any,
      serviceDate: new Date(formData.serviceDate).toISOString(),
      expenses: formExpenses,
      createdAt: initialData?.createdAt || new Date().toISOString()
    };

    if (initialData) {
      updateTransportService(initialData.id, serviceData);
      toast({ title: "Servicio Actualizado" });
    } else {
      addTransportService(serviceData);
      toast({ title: "Servicio Registrado" });
    }

    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 py-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase text-muted-foreground flex items-center gap-2"><User className="w-4 h-4" /> Datos del Cliente</h3>
            <div className="relative">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground">Buscador Clientes</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Nombre o teléfono..." 
                  className="h-9 pl-9 bg-primary/5 border-primary/20" 
                  value={customerSearchQuery}
                  onChange={e => setCustomerSearchQuery(e.target.value)}
                />
              </div>
              {customerSearchResults.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-xl overflow-hidden">
                  {customerSearchResults.map(c => (
                    <button key={c.id} type="button" className="w-full text-left px-4 py-2 hover:bg-primary/5 transition-colors border-b last:border-0" onClick={() => handleSelectCustomer(c)}>
                      <span className="font-bold text-sm text-primary">{c.name}</span>
                      <div className="text-[10px] text-muted-foreground">{c.phone}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label className="text-xs">Nombre *</Label><Input value={formData.customerName} onChange={e => setFormData({...formData, customerName: e.target.value})} required /></div>
              <div className="space-y-1.5"><Label className="text-xs">Teléfono *</Label><Input value={formData.customerPhone} onChange={e => setFormData({...formData, customerPhone: e.target.value})} required /></div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase text-muted-foreground flex items-center gap-2"><MapPin className="w-4 h-4" /> Ruta del Servicio</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label className="text-xs">Origen *</Label><Input value={formData.origin} onChange={e => setFormData({...formData, origin: e.target.value})} placeholder="Punto de carga" required /></div>
              <div className="space-y-1.5"><Label className="text-xs">Destino *</Label><Input value={formData.destination} onChange={e => setFormData({...formData, destination: e.target.value})} placeholder="Punto de entrega" required /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Distancia (Km)</Label>
                <Input type="number" step="0.1" value={formData.distanceKm} onChange={e => setFormData({...formData, distanceKm: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tiempo Estimado</Label>
                <Input value={formData.estimatedTime} onChange={e => setFormData({...formData, estimatedTime: e.target.value})} placeholder="Ej: 2h 30m" />
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-accent/5 border border-accent/10 rounded-lg">
              <Fuel className="w-4 h-4 text-accent" />
              <div className="flex-1">
                <p className="text-[9px] uppercase font-black text-muted-foreground leading-tight">Proyección de Combustible</p>
                <p className="text-sm font-bold text-accent">~ ${projectedFuelCost.toLocaleString()} COP</p>
              </div>
              <Badge variant="outline" className="text-[9px] h-5">Est. {selectedTruck?.averageKmPerGallon || 15} km/gal</Badge>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase text-muted-foreground flex items-center gap-2"><Truck className="w-4 h-4" /> Asignación de Camión</h3>
            <div className="space-y-1.5">
              <Label className="text-xs">Seleccionar Vehículo *</Label>
              <Select value={formData.truckId} onValueChange={v => setFormData({...formData, truckId: v})}>
                <SelectTrigger><SelectValue placeholder="Elegir camión..." /></SelectTrigger>
                <SelectContent>
                  {trucks.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.plate} - {t.brand} ({t.capacityTons} Ton)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase text-muted-foreground flex items-center gap-2"><User className="w-4 h-4" /> Datos del Conductor</h3>
            <div className="grid grid-cols-1 gap-3">
              <Input placeholder="Nombre del Conductor" value={formData.driverName} onChange={e => setFormData({...formData, driverName: e.target.value})} className="h-9" />
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="ID / Cédula" value={formData.driverId} onChange={e => setFormData({...formData, driverId: e.target.value})} className="h-9" />
                <Input placeholder="Teléfono" value={formData.driverPhone} onChange={e => setFormData({...formData, driverPhone: e.target.value})} className="h-9" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase text-muted-foreground flex items-center gap-2"><Coins className="w-4 h-4" /> Gastos de Viaje</h3>
            <div className="grid grid-cols-1 gap-2 bg-muted/20 p-4 rounded-xl border">
              <div className="grid grid-cols-2 gap-2">
                <Select value={newExpType} onValueChange={(v: any) => setNewExpType(v)}>
                  <SelectTrigger className="h-9 bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gasoline">Gasolina</SelectItem>
                    <SelectItem value="toll">Peajes</SelectItem>
                    <SelectItem value="driver_pay">Pago Conductor</SelectItem>
                    <SelectItem value="maintenance">Mantenimiento</SelectItem>
                    <SelectItem value="other">Otros</SelectItem>
                  </SelectContent>
                </Select>
                <Input type="number" placeholder="Monto $" value={newExpAmount} onChange={e => setNewExpAmount(e.target.value)} className="h-9 font-bold bg-white" />
              </div>
              <div className="flex gap-2">
                <Input placeholder="Notas del gasto..." value={newExpNotes} onChange={e => setNewExpNotes(e.target.value)} className="h-9 flex-1 text-xs bg-white" />
                <Button type="button" variant="secondary" size="icon" className="h-9 w-9 shrink-0" onClick={handleAddExpense}><Plus className="w-4 h-4" /></Button>
              </div>
              
              <div className="mt-4 border rounded overflow-hidden bg-white">
                <Table>
                  <TableBody>
                    {formExpenses.map(exp => (
                      <TableRow key={exp.id} className="h-8">
                        <TableCell className="py-1 text-[10px] uppercase font-bold">{exp.type.replace('_',' ')}</TableCell>
                        <TableCell className="py-1 text-right font-black text-destructive text-xs">-${exp.amount.toLocaleString()}</TableCell>
                        <TableCell className="py-1 text-right w-10">
                          <button type="button" onClick={() => handleRemoveExpense(exp.id)} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {formExpenses.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-4 text-[10px] text-muted-foreground italic">Sin gastos registrados.</TableCell>
                      </TableRow>
                    )}
                    {formExpenses.length > 0 && (
                      <TableRow className="bg-muted/30">
                        <TableCell className="py-1 text-[10px] font-black">TOTAL GASTOS</TableCell>
                        <TableCell className="py-1 text-right font-black text-destructive text-xs">-${totalExpenses.toLocaleString()}</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase text-muted-foreground flex items-center gap-2"><BadgeDollarSign className="w-4 h-4 text-primary" /> Precio de Venta</h3>
            <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10 space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-black text-primary">VALOR TOTAL FLETE ($) *</Label>
                <Input type="number" step="0.01" value={formData.totalFreightPrice} onChange={e => setFormData({...formData, totalFreightPrice: e.target.value})} className="h-12 text-2xl font-black text-primary bg-white text-center" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold">Fecha Viaje</Label>
                  <Input type="date" value={formData.serviceDate} onChange={e => setFormData({...formData, serviceDate: e.target.value})} className="h-9 bg-white" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold">Estado Viaje</Label>
                  <Select value={formData.status} onValueChange={(v: TransportStatus) => setFormData({...formData, status: v})}>
                    <SelectTrigger className="h-9 bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pendiente</SelectItem>
                      <SelectItem value="in_progress">En Ruta</SelectItem>
                      <SelectItem value="finished">Finalizado</SelectItem>
                      <SelectItem value="cancelled">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-primary/10">
                <span className="text-xs font-bold text-muted-foreground uppercase">Utilidad Estimada:</span>
                <span className="text-lg font-black text-green-700">${(parseFloat(formData.totalFreightPrice || '0') - totalExpenses).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-black uppercase text-muted-foreground">Notas Adicionales del Servicio</Label>
        <Textarea placeholder="Detalles de la carga, requerimientos especiales..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="min-h-[100px]" />
      </div>

      <Separator />

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onClose} className="px-8">Cancelar</Button>
        <Button type="submit" className="px-12 font-black shadow-lg bg-primary">
          {initialData ? 'Guardar Cambios' : 'Confirmar Registro de Viaje'}
        </Button>
      </div>
    </form>
  );
}
