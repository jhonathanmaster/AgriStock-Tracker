
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAgriStock } from '@/lib/store';
import { useUser } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  ShieldCheck, 
  History, 
  Search, 
  Trash2, 
  Plus, 
  AlertTriangle, 
  CheckCircle2, 
  CalendarDays, 
  User as UserIcon,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Info
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { LoadingScreen } from '@/components/LoadingScreen';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from '@/lib/utils';

export default function InventoryAuditPage() {
  const { products, audits, addInventoryAudit, deleteInventoryAudit, applyAuditAdjustment, isLoading, profile, isAdmin } = useAgriStock();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);

  // Form State
  const [selectedProductId, setSelectedProductId] = useState('');
  const [verifiedQty, setVerifiedQty] = useState('');
  const [notes, setNotes] = useState('');
  
  // UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [auditToDelete, setAuditToDelete] = useState<string | null>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    setMounted(true);
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const selectedProduct = useMemo(() => 
    products.find(p => p.id === selectedProductId), 
  [products, selectedProductId]);

  const difference = useMemo(() => {
    if (!selectedProduct || !verifiedQty) return 0;
    return parseFloat(verifiedQty) - (selectedProduct.stock || 0);
  }, [selectedProduct, verifiedQty]);

  const sortedProducts = useMemo(() => 
    [...products].sort((a, b) => (a.name || '').localeCompare(b.name || '')), 
  [products]);

  const filteredAudits = useMemo(() => {
    return (audits || []).filter(a => 
      a.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.performedByName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [audits, searchTerm]);

  const totalPages = Math.ceil(filteredAudits.length / itemsPerPage);
  const paginatedAudits = filteredAudits.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleAuditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !verifiedQty) {
      toast({ variant: "destructive", title: "Error", description: "Completa los campos obligatorios." });
      return;
    }

    if (!selectedProduct) return;

    addInventoryAudit({
      productId: selectedProductId,
      productName: selectedProduct.name,
      systemQuantity: selectedProduct.stock || 0,
      verifiedQuantity: parseFloat(verifiedQty),
      difference: difference,
      unit: selectedProduct.mainUnit,
      auditDate: new Date().toISOString(),
      performedBy: user?.uid || '',
      performedByName: profile?.displayName || user?.email || 'Desconocido',
      notes: notes
    });

    toast({ 
      title: "Verificación Registrada", 
      description: `Se ha guardado el registro para ${selectedProduct.name} sin afectar el stock actual.` 
    });

    // Reset
    setSelectedProductId('');
    setVerifiedQty('');
    setNotes('');
  };

  const handleApplyAdjustment = (id: string, productName: string, qty: number, unit: string) => {
    if(confirm(`¿Deseas ajustar el inventario de ${productName} a ${qty} ${unit}? Esta acción creará un movimiento de inventario.`)) {
      applyAuditAdjustment(id);
      toast({ title: "Inventario Ajustado", description: "El stock del producto ha sido actualizado exitosamente." });
    }
  };

  if (isUserLoading || isLoading || !mounted) return <LoadingScreen />;
  if (!user) return null;

  return (
    <main className="flex-1 p-8 space-y-8 overflow-auto">
      <header className="flex justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="w-8 h-8 text-primary" />
              Verificación de Inventario
            </h1>
            <p className="text-muted-foreground">Auditoría de existencias físicas (Registro informativo)</p>
          </div>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2 border-primary/20 text-primary hover:bg-primary/5">
              <CircleHelp className="w-4 h-4" />
              <span className="hidden sm:inline">Guía de Auditoría</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-2">
                <Info className="w-6 h-6" />
              </div>
              <DialogTitle className="text-xl font-bold">Guía: Verificación Física</DialogTitle>
              <DialogDescription>
                Aprende a realizar auditorías de stock y corregir descuadres en el inventario.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">1</div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-foreground">Conteo en Bodega</p>
                  <p className="text-xs text-muted-foreground">Realiza el conteo físico de bultos, kilos o unidades de un producto específico en tu almacén.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">2</div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-foreground">Registra el Hallazgo</p>
                  <p className="text-xs text-muted-foreground">Selecciona el producto y escribe la cantidad real encontrada. El sistema calculará automáticamente la diferencia con lo que dice el software.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">3</div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-foreground">Guardar Registro</p>
                  <p className="text-xs text-muted-foreground">Al pulsar "Registrar Verificación", la información se guarda en el historial de forma informativa (no altera el stock aún).</p>
                </div>
              </div>
              <div className="flex gap-3 border-t pt-4">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-accent text-white flex items-center justify-center text-xs font-bold">4</div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-foreground text-accent">Aplicar Ajuste (Admin)</p>
                  <p className="text-xs text-muted-foreground">Si hay un descuadre, el administrador puede pulsar el botón verde de "Check" en el historial para forzar que el inventario coincida con el físico registrado.</p>
                </div>
              </div>
              
              <div className="mt-6 p-3 bg-secondary/20 rounded-lg border border-border">
                <p className="text-[10px] uppercase font-black text-primary mb-1 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Control de Calidad
                </p>
                <p className="text-[11px] text-muted-foreground leading-relaxed italic">
                  Las auditorías permiten detectar mermas, robos o errores de pesaje, manteniendo la confiabilidad total de tu negocio.
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* FORMULARIO DE CONTEO */}
        <Card className="h-fit shadow-md border-primary/10">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              Nuevo Registro de Conteo
            </CardTitle>
            <CardDescription>Documenta la cantidad real encontrada en bodega.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuditSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label>Producto a Verificar *</Label>
                <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                  <SelectTrigger className="bg-muted/5">
                    <SelectValue placeholder="Selecciona un producto" />
                  </SelectTrigger>
                  <SelectContent>
                    {sortedProducts.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedProduct && (
                <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-secondary/20 rounded-lg border border-border">
                      <p className="text-[10px] font-black uppercase text-muted-foreground mb-1">En Sistema</p>
                      <p className="text-lg font-bold">
                        {selectedProduct.stock.toFixed(2)} <span className="text-xs uppercase">{selectedProduct.mainUnit}</span>
                      </p>
                    </div>
                    <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
                      <p className="text-[10px] font-black uppercase text-primary mb-1">Unidad</p>
                      <Badge className="bg-primary">{selectedProduct.mainUnit.toUpperCase()}</Badge>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-accent font-bold">Cantidad Física Encontrada *</Label>
                    <Input 
                      type="number" 
                      step="0.01" 
                      value={verifiedQty} 
                      onChange={e => setVerifiedQty(e.target.value)} 
                      placeholder="0.00" 
                      className="h-12 text-lg font-bold border-accent/30 focus-visible:ring-accent"
                      required
                    />
                  </div>

                  {verifiedQty && (
                    <div className={cn(
                      "p-4 rounded-xl border flex items-center justify-between",
                      difference === 0 ? "bg-green-50 border-green-200" : "bg-orange-50 border-orange-200"
                    )}>
                      <div className="flex items-center gap-3">
                        {difference === 0 ? (
                          <CheckCircle2 className="w-6 h-6 text-green-600" />
                        ) : (
                          <AlertTriangle className="w-6 h-6 text-orange-600" />
                        )}
                        <div>
                          <p className="text-[10px] font-black uppercase text-muted-foreground leading-tight">Diferencia Detectada</p>
                          <p className={cn("text-xl font-black leading-tight", difference === 0 ? "text-green-700" : "text-orange-700")}>
                            {difference > 0 ? '+' : ''}{difference.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground italic px-1">
                    * Este registro es solo para auditoría. No afectará el inventario del producto seleccionado.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Observaciones / Notas</Label>
                <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ej: Bolsa rota, error de conteo anterior..." />
              </div>

              <Button type="submit" className="w-full h-12 gap-2 shadow-lg" disabled={!selectedProductId || !verifiedQty}>
                <ShieldCheck className="w-5 h-5" />
                Registrar Verificación
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* HISTORIAL DE AUDITORÍAS */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
              <div className="space-y-1">
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="w-5 h-5 text-primary" />
                  Historial de Verificaciones
                </CardTitle>
                <CardDescription>Registro histórico de conteos físicos.</CardDescription>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar producto u operario..." 
                  className="pl-9 h-10 bg-muted/20 border-none" 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="w-[120px]">Fecha</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-right">Sistema</TableHead>
                    <TableHead className="text-right">Físico</TableHead>
                    <TableHead className="text-center">Dif.</TableHead>
                    <TableHead>Operario</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedAudits.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center text-muted-foreground italic">
                        No hay registros de verificación en el sistema.
                      </TableCell>
                    </TableRow>
                  ) : paginatedAudits.map((audit) => (
                    <TableRow key={audit.id} className="hover:bg-muted/10">
                      <TableCell className="text-[10px] text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <CalendarDays className="w-3 h-3" />
                          {new Date(audit.auditDate).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell className="font-bold text-xs text-primary">
                        {audit.productName}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {audit.systemQuantity.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-xs">
                        {audit.verifiedQuantity.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Badge variant={audit.difference === 0 ? "secondary" : "destructive"} className="text-[10px] px-1.5 h-5">
                            {audit.difference > 0 ? '+' : ''}{audit.difference.toFixed(1)}
                          </Badge>
                          {audit.applied && (
                            <span title="Ajuste Aplicado">
                              <CheckCircle2 className="w-3 h-3 text-green-600" />
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-[10px] font-medium">
                          <UserIcon className="w-2.5 h-2.5" />
                          {audit.performedByName}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {isAdmin && (
                            <>
                              {!audit.applied && (
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-green-600 hover:bg-green-50"
                                  title="Aplicar Ajuste a Inventario"
                                  onClick={() => handleApplyAdjustment(audit.id, audit.productName, audit.verifiedQuantity, audit.unit)}
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </Button>
                              )}
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                title="Eliminar Registro"
                                onClick={() => setAuditToDelete(audit.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t bg-muted/10 gap-4">
                <div className="text-xs text-muted-foreground">
                  Página <span className="font-medium">{currentPage}</span> de <span className="font-medium">{totalPages || 1}</span>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="gap-1"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={!!auditToDelete} onOpenChange={(open) => !open && setAuditToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              ¿Eliminar Registro Histórico?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción borrará el registro de la verificación física del historial. Esta acción no se puede deshacer y no afectará el stock actual de los productos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => { if (auditToDelete) deleteInventoryAudit(auditToDelete); setAuditToDelete(null); }}
              className="bg-destructive hover:bg-destructive/90 text-white"
            >
              Eliminar Definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
