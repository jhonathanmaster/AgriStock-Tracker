
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
import { Badge } from '@/components/ui/badge';
import { Truck as TruckIcon, Plus, Pencil, Trash2, ShieldAlert, X, Save, Fuel } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { LoadingScreen } from '@/components/LoadingScreen';
import { Truck, TruckStatus } from '@/lib/types';

export default function TrucksPage() {
  const { trucks, addTruck, updateTruck, deleteTruck, isLoading, isAdmin } = useAgriStock();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    plate: '',
    model: '',
    brand: '',
    capacityTons: '6',
    fuelType: 'Diesel',
    averageKmPerGallon: '15',
    status: 'available' as TruckStatus
  });

  useEffect(() => {
    setMounted(true);
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || isLoading || !mounted) return <LoadingScreen />;
  if (!user || !isAdmin) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...formData,
      capacityTons: parseFloat(formData.capacityTons),
      averageKmPerGallon: parseFloat(formData.averageKmPerGallon)
    };

    if (editingId) {
      updateTruck(editingId, data);
      toast({ title: "Vehículo Actualizado" });
      setEditingId(null);
    } else {
      addTruck(data);
      toast({ title: "Vehículo Registrado" });
    }

    setFormData({ plate: '', model: '', brand: '', capacityTons: '6', fuelType: 'Diesel', averageKmPerGallon: '15', status: 'available' });
  };

  const handleEdit = (t: Truck) => {
    setEditingId(t.id);
    setFormData({
      plate: t.plate,
      model: t.model || '',
      brand: t.brand || '',
      capacityTons: t.capacityTons.toString(),
      fuelType: t.fuelType || 'Diesel',
      averageKmPerGallon: (t.averageKmPerGallon || 15).toString(),
      status: t.status
    });
  };

  return (
    <main className="flex-1 p-8 space-y-8 overflow-auto">
      <header className="flex justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <TruckIcon className="w-8 h-8 text-primary" />
              Gestión de Flota
            </h1>
            <p className="text-muted-foreground">Administra los camiones y vehículos de carga</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>{editingId ? 'Editar Vehículo' : 'Nuevo Vehículo'}</CardTitle>
            <CardDescription>Configura los detalles técnicos del camión.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Placa / Identificación *</Label>
                <Input value={formData.plate} onChange={e => setFormData({...formData, plate: e.target.value.toUpperCase()})} placeholder="XYZ-123" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Marca</Label>
                  <Input value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} placeholder="Ej: Hino, JAC" />
                </div>
                <div className="space-y-2">
                  <Label>Modelo (Año)</Label>
                  <Input value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} placeholder="2023" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Capacidad (Tons) *</Label>
                  <Input type="number" step="0.1" value={formData.capacityTons} onChange={e => setFormData({...formData, capacityTons: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label>Tipo Combustible</Label>
                  <Select value={formData.fuelType} onValueChange={v => setFormData({...formData, fuelType: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Diesel">Diesel</SelectItem>
                      <SelectItem value="Gasolina">Gasolina</SelectItem>
                      <SelectItem value="Gas">Gas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><Fuel className="w-3 h-3" /> Rendimiento Promedio (Km/Galón)</Label>
                <Input type="number" step="0.1" value={formData.averageKmPerGallon} onChange={e => setFormData({...formData, averageKmPerGallon: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Estado Inicial</Label>
                <Select value={formData.status} onValueChange={(v: TruckStatus) => setFormData({...formData, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Disponible</SelectItem>
                    <SelectItem value="in_service">En Servicio</SelectItem>
                    <SelectItem value="maintenance">En Mantenimiento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-2">
                {editingId && (
                  <Button type="button" variant="outline" className="flex-1" onClick={() => { setEditingId(null); setFormData({ plate: '', model: '', brand: '', capacityTons: '6', fuelType: 'Diesel', averageKmPerGallon: '15', status: 'available' }); }}>
                    <X className="w-4 h-4 mr-1" /> Cancelar
                  </Button>
                )}
                <Button type="submit" className="flex-1">
                  <Save className="w-4 h-4 mr-1" /> {editingId ? 'Guardar' : 'Registrar'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Flota Registrada ({trucks.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehículo</TableHead>
                  <TableHead>Especificaciones</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trucks.map(t => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <div className="font-bold text-primary">{t.plate}</div>
                      <div className="text-[10px] text-muted-foreground uppercase">{t.brand} {t.model}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">Capacidad: <b>{t.capacityTons} Ton</b></div>
                      <div className="text-[10px] text-muted-foreground">{t.fuelType} - {t.averageKmPerGallon} km/gal</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={t.status === 'available' ? 'secondary' : t.status === 'maintenance' ? 'destructive' : 'default'}>
                        {t.status === 'available' ? 'Disponible' : t.status === 'maintenance' ? 'Mantenimiento' : 'En Viaje'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => handleEdit(t)}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { if(confirm('¿Eliminar vehículo?')) deleteTruck(t.id); }}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {trucks.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center text-muted-foreground italic">No hay vehículos registrados.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
