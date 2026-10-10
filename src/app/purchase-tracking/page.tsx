
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAgriStock } from '@/lib/store';
import { useUser } from '@/lib/session';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ClipboardCheck, 
  Timer, 
  CheckCircle2,
  SquareCheck,
  Send,
  Loader2,
  PackageCheck,
  CalendarCheck,
  XCircle,
  ChevronLeft,
  ChevronRight,
  AlertTriangle
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { LoadingScreen } from '@/components/LoadingScreen';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { sendPurchaseOrderEmail } from '@/server/email/send-purchase-order-email';
import { sendReceiveConfirmationAdminEmail } from '@/server/email/send-receive-confirmation-admin-email';
import { PurchaseOrder } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function PurchaseTrackingPage() {
  const { 
    products, 
    purchaseOrders, 
    suppliers,
    purchaseOrderStatusDefinitions, 
    updatePurchaseOrderStatus,
    isLoading, 
    isAdmin
  } = useAgriStock();
  
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (purchaseOrderStatusDefinitions.length > 0 && !activeTab) {
      setActiveTab(purchaseOrderStatusDefinitions[0].name);
    }
  }, [purchaseOrderStatusDefinitions, activeTab]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, itemsPerPage]);

  if (isUserLoading || isLoading) {
    return <LoadingScreen />;
  }

  if (!user) return null;

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrderIds(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId) 
        : [...prev, orderId]
    );
  };

  const clearSelection = () => setSelectedOrderIds([]);

  const handleBulkApprove = () => {
    if (selectedOrderIds.length === 0) return;
    
    const currentStatus = purchaseOrderStatusDefinitions.find(s => s.name === activeTab);
    const nextStatus = purchaseOrderStatusDefinitions
      .filter(s => s.order > (currentStatus?.order || 0))
      .sort((a, b) => a.order - b.order)[0];

    if (nextStatus) {
      selectedOrderIds.forEach(id => {
        updatePurchaseOrderStatus(id, nextStatus.name);
      });
      toast({ 
        title: "Órdenes Aprobadas", 
        description: `${selectedOrderIds.length} órdenes movidas a "${nextStatus.name}".` 
      });
      clearSelection();
    } else {
      toast({ 
        variant: "destructive", 
        title: "Acción no posible", 
        description: "No hay un estado posterior definido para aprobar estas órdenes." 
      });
    }
  };

  const handleBulkCancel = () => {
    if (selectedOrderIds.length === 0) return;
    
    setIsProcessing(true);
    try {
      selectedOrderIds.forEach(id => {
        updatePurchaseOrderStatus(id, 'Cancelado');
      });
      
      toast({ 
        title: "Órdenes Canceladas", 
        description: `${selectedOrderIds.length} órdenes marcadas como "Cancelado" con éxito.` 
      });
      clearSelection();
    } catch (error: any) {
      console.error("Error al cancelar órdenes:", error);
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: "No se pudieron cancelar algunas órdenes." 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSolicitarSeleccionadas = async () => {
    if (selectedOrderIds.length === 0) return;
    setIsProcessing(true);

    const ordersToProcess = purchaseOrders.filter(o => selectedOrderIds.includes(o.id));
    
    const solicitadoStatus = purchaseOrderStatusDefinitions.find(s => 
      s.name.toLowerCase().trim().startsWith('solicitad')
    )?.name || 'Solicitado';

    const groupedBySupplier: Record<string, PurchaseOrder[]> = {};
    ordersToProcess.forEach(order => {
      if (!groupedBySupplier[order.supplierId]) {
        groupedBySupplier[order.supplierId] = [];
      }
      groupedBySupplier[order.supplierId].push(order);
    });

    let processedCount = 0;
    let emailFailures = 0;
    const adminEmail = 'jhonathanmaster@gmail.com';

    try {
      for (const supplierId in groupedBySupplier) {
        const supplier = suppliers.find(s => s.id === supplierId);
        const supplierOrders = groupedBySupplier[supplierId];
        
        const itemsForEmail = supplierOrders.map(order => {
          const product = products.find(p => p.id === order.productId);
          return {
            productName: product?.name || 'Producto Desconocido',
            quantity: order.quantity,
            unit: order.unit,
            totalCost: order.totalCost || 0
          };
        });

        if (supplier && supplier.email) {
          try {
            const emailResult = await sendPurchaseOrderEmail({
              supplierEmail: supplier.email,
              adminEmail: adminEmail,
              supplierName: supplier.name,
              items: itemsForEmail
            });

            if (!emailResult.success) {
              emailFailures++;
              console.warn(`[CORREO] Error al enviar a ${supplier.name}: ${emailResult.error}`);
            }
          } catch (emailError) {
            emailFailures++;
            console.error(`[CORREO] Fallo crítico de comunicación con el flujo de correo:`, emailError);
          }
        } else {
          console.warn(`[CORREO] El proveedor ${supplier?.name} no tiene correo electrónico registrado.`);
        }

        supplierOrders.forEach(order => {
          updatePurchaseOrderStatus(order.id, solicitadoStatus);
          processedCount++;
        });
      }

      if (emailFailures > 0) {
        toast({
          variant: "destructive",
          title: "Aviso de Notificación",
          description: `Se actualizaron ${processedCount} órdenes, pero ${emailFailures} proveedores no pudieron ser notificados por correo.`,
        });
      } else {
        toast({
          title: "Proceso Exitoso",
          description: `${processedCount} órdenes solicitadas y notificadas correctamente.`,
        });
      }
      
      clearSelection();
    } catch (error: any) {
      console.error("Error al procesar solicitudes masivas:", error);
      toast({ 
        variant: "destructive", 
        title: "Error de Proceso", 
        description: "Ocurrió un fallo al intentar actualizar las órdenes." 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkReceive = async () => {
    if (selectedOrderIds.length === 0) return;
    
    setIsProcessing(true);
    const adminEmail = 'jhonathanmaster@gmail.com';
    const receivedItemsForEmail: any[] = [];

    const recibidoStatus = purchaseOrderStatusDefinitions.find(s => 
      s.name.toLowerCase().trim().startsWith('recibid')
    )?.name || 'Recibido';

    try {
      const ordersToProcess = purchaseOrders.filter(o => selectedOrderIds.includes(o.id));

      for (const order of ordersToProcess) {
        const product = products.find(p => p.id === order.productId);
        if (product) {
          updatePurchaseOrderStatus(order.id, recibidoStatus);
          
          receivedItemsForEmail.push({
            productName: product.name,
            quantity: order.quantity,
            unit: order.unit,
            orderId: order.id,
            unitPrice: order.unitPrice || product.costPrice || 0,
            totalCost: order.totalCost || 0
          });
        }
      }

      if (receivedItemsForEmail.length > 0) {
        await sendReceiveConfirmationAdminEmail({
          adminEmail,
          items: receivedItemsForEmail
        }).catch(e => console.warn("Fallo al enviar reporte de recepción:", e));
      }

      toast({
        title: "Recepción Procesada",
        description: `Se han ingresado ${selectedOrderIds.length} órdenes al inventario correctamente.`
      });
      clearSelection();
    } catch (error: any) {
      console.error("Error al procesar recepción masiva:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Ocurrió un error al procesar el ingreso de mercancía."
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkClose = () => {
    if (selectedOrderIds.length === 0) return;
    
    const finalizadoStatus = purchaseOrderStatusDefinitions.find(s => 
      s.name.toLowerCase().trim().startsWith('finalizad') || s.name.toLowerCase().trim().startsWith('cerrad')
    )?.name || 'Finalizado';

    setIsProcessing(true);
    try {
      selectedOrderIds.forEach(id => {
        updatePurchaseOrderStatus(id, finalizadoStatus);
      });
      
      toast({ 
        title: "Órdenes Cerradas", 
        description: `${selectedOrderIds.length} órdenes finalizadas con éxito.` 
      });
      clearSelection();
    } catch (error: any) {
      console.error("Error al cerrar órdenes:", error);
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: "No se pudieron finalizar algunas órdenes." 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main className="flex-1 p-8 space-y-8 overflow-auto">
      <header className="flex justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Seguimiento de Órdenes</h1>
            <p className="text-muted-foreground">Gestión y control de flujo de órdenes de compra</p>
          </div>
        </div>
      </header>

      <section>
        <Card className="w-full">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ClipboardCheck className="w-5 h-5 text-blue-500" />
              Flujo de Órdenes por Estado
            </CardTitle>
            {selectedOrderIds.length > 0 && (
              <div className="flex items-center gap-2 animate-in fade-in zoom-in duration-300">
                <Badge variant="secondary" className="px-3 py-1 bg-primary/10 text-primary border-primary/20">
                  {selectedOrderIds.length} seleccionadas
                </Badge>
                <Button variant="ghost" size="sm" onClick={clearSelection} className="h-7 text-[10px] uppercase font-bold text-muted-foreground hover:text-foreground">
                  Limpiar
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {purchaseOrderStatusDefinitions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Define estados en el panel administrativo para visualizar las órdenes aquí.
              </div>
            ) : (
              <Tabs 
                value={activeTab || (purchaseOrderStatusDefinitions.length > 0 ? purchaseOrderStatusDefinitions[0].name : "")} 
                className="w-full" 
                onValueChange={(val) => {
                  setActiveTab(val);
                  clearSelection();
                }}
              >
                <TabsList className="w-full justify-start overflow-x-auto bg-transparent border-b rounded-none h-auto p-0 mb-4 flex-nowrap">
                  {purchaseOrderStatusDefinitions.map(status => (
                    <TabsTrigger 
                      key={status.id} 
                      value={status.name}
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                    >
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: status.color }} />
                        <span className="font-bold">{status.name}</span>
                        <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">
                          {purchaseOrders.filter(o => o.status === status.name).length}
                        </Badge>
                      </div>
                    </TabsTrigger>
                  ))}
                </TabsList>
                
                {purchaseOrderStatusDefinitions.map(statusDef => {
                  const filteredOrdersInTab = purchaseOrders.filter(o => o.status === statusDef.name);
                  const totalPages = Math.ceil(filteredOrdersInTab.length / itemsPerPage);
                  const paginatedOrders = filteredOrdersInTab.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

                  const statusNameLower = statusDef.name.toLowerCase().trim();
                  const isTabPendiente = statusNameLower === 'pendiente';
                  const isTabAprobada = statusNameLower === 'aprobada' || statusNameLower === 'aprobado';
                  const isTabSolicitado = statusNameLower === 'solicitado' || statusNameLower === 'solicitada';
                  const isTabRecibido = statusNameLower === 'recibido' || statusNameLower === 'recibida';
                  const hasActions = isTabPendiente || isTabAprobada || isTabSolicitado || isTabRecibido;
                  
                  const totalCostForStatus = filteredOrdersInTab.reduce((sum, order) => sum + (order.totalCost || 0), 0);
                  const totalCostForSelected = filteredOrdersInTab
                    .filter(o => selectedOrderIds.includes(o.id))
                    .reduce((sum, order) => sum + (order.totalCost || 0), 0);

                  const allSelectedInTab = filteredOrdersInTab.length > 0 && filteredOrdersInTab.every(o => selectedOrderIds.includes(o.id));
                  
                  const toggleSelectAllInTab = () => {
                    if (allSelectedInTab) {
                      const tabIds = filteredOrdersInTab.map(o => o.id);
                      setSelectedOrderIds(prev => prev.filter(id => !tabIds.includes(id)));
                    } else {
                      const tabIds = filteredOrdersInTab.map(o => o.id);
                      setSelectedOrderIds(prev => Array.from(new Set([...prev, ...tabIds])));
                    }
                  };
                  
                  return (
                    <TabsContent key={statusDef.id} value={statusDef.name} className="mt-0 space-y-4">
                      {hasActions && (
                        <div className="flex flex-wrap gap-2 p-3 bg-secondary/30 rounded-lg border border-border min-h-[52px] items-center">
                          {isTabPendiente && selectedOrderIds.length > 0 && isAdmin && (
                            <Button size="sm" className="gap-2 animate-in slide-in-from-top-2" onClick={handleBulkApprove} disabled={isProcessing}>
                              <CheckCircle2 className="w-4 h-4" />
                              Aprobar Seleccionadas
                            </Button>
                          )}
                          {isTabAprobada && selectedOrderIds.length > 0 && (
                            <Button size="sm" className="gap-2 bg-accent hover:bg-accent/90 animate-in slide-in-from-top-2" onClick={handleSolicitarSeleccionadas} disabled={isProcessing}>
                              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                              Solicitar Seleccionadas
                            </Button>
                          )}
                          {isTabSolicitado && selectedOrderIds.length > 0 && (
                            <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90 animate-in slide-in-from-top-2" onClick={handleBulkReceive} disabled={isProcessing}>
                              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackageCheck className="w-4 h-4" />}
                              Recibir Seleccionadas
                            </Button>
                          )}
                          {isTabRecibido && selectedOrderIds.length > 0 && (
                            <Button size="sm" variant="outline" className="gap-2 border-primary text-primary hover:bg-primary/10 animate-in slide-in-from-top-2" onClick={handleBulkClose} disabled={isProcessing}>
                              <SquareCheck className="w-4 h-4" />
                              Finalizar Seleccionadas
                            </Button>
                          )}
                          {(isTabPendiente || isTabAprobada || isTabSolicitado) && selectedOrderIds.length > 0 && (
                            <Button size="sm" variant="destructive" className="gap-2 animate-in slide-in-from-top-2" onClick={handleBulkCancel} disabled={isProcessing}>
                              <XCircle className="w-4 h-4" />
                              Cancelar Seleccionados
                            </Button>
                          )}
                          {selectedOrderIds.length === 0 && (
                            <p className="text-xs text-muted-foreground italic px-2 flex items-center gap-2">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Selecciona registros de la tabla para habilitar acciones masivas.
                            </p>
                          )}
                        </div>
                      )}

                      <div className="overflow-hidden rounded-xl border border-border shadow-sm">
                        <Table>
                          <TableHeader className="bg-muted/50">
                            <TableRow>
                              <TableHead className="w-12">
                                <div className="flex items-center justify-center">
                                  <Checkbox 
                                    checked={allSelectedInTab} 
                                    onCheckedChange={toggleSelectAllInTab}
                                    aria-label="Seleccionar todos en esta pestaña"
                                  />
                                </div>
                              </TableHead>
                              <TableHead>Producto</TableHead>
                              <TableHead>Proveedor</TableHead>
                              <TableHead className="text-right">Cant.</TableHead>
                              <TableHead className="text-right">Total</TableHead>
                              {isTabRecibido && <TableHead className="text-right">Fecha Recibido</TableHead>}
                              <TableHead className="text-right">Entrega Est.</TableHead>
                              <TableHead className="text-right">Solicitud</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paginatedOrders.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={isTabRecibido ? 8 : 7} className="text-center py-12 text-muted-foreground italic">
                                  No hay órdenes registradas en este estado.
                                </TableCell>
                              </TableRow>
                            ) : (
                              paginatedOrders.map(order => {
                                const product = products.find(p => p.id === order.productId);
                                const supplier = suppliers.find(s => s.id === order.supplierId);
                                const isSelected = selectedOrderIds.includes(order.id);
                                return (
                                  <TableRow key={order.id} className={isSelected ? "bg-primary/5" : "hover:bg-muted/30"}>
                                    <TableCell className="text-center">
                                      <Checkbox checked={isSelected} onCheckedChange={() => toggleOrderSelection(order.id)} />
                                    </TableCell>
                                    <TableCell className="font-bold text-sm text-primary">{product?.name || 'Producto Desconocido'}</TableCell>
                                    <TableCell className="text-xs font-medium">{supplier?.name || 'Proveedor Desconocido'}</TableCell>
                                    <TableCell className="text-right text-sm">{order.quantity} <span className="text-[10px] text-muted-foreground">{order.unit}</span></TableCell>
                                    <TableCell className="text-right text-sm font-bold text-accent">${(order.totalCost || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                                    {isTabRecibido && (
                                      <TableCell className="text-right text-xs">
                                        {order.receivedDate ? (
                                          <span className="flex items-center justify-end gap-1 text-green-600 font-bold">
                                            <CalendarCheck className="w-3 h-3" />
                                            {new Date(order.receivedDate).toLocaleDateString('es-ES', { timeZone: 'UTC' })}
                                          </span>
                                        ) : '-'}
                                      </TableCell>
                                    )}
                                    <TableCell className="text-right text-sm">
                                      {order.deliveryDate ? (
                                        <span className="flex items-center justify-end gap-1 text-blue-600 font-medium">
                                          <Timer className="w-3 h-3" />
                                          {new Date(order.deliveryDate).toLocaleDateString('es-ES', { timeZone: 'UTC' })}
                                        </span>
                                      ) : '-'}
                                    </TableCell>
                                    <TableCell className="text-right text-[10px] text-muted-foreground">{order.requestDate ? new Date(order.requestDate).toLocaleDateString('es-ES', { timeZone: 'UTC' }) : '-'}</TableCell>
                                  </TableRow>
                                );
                              })
                            )}
                          </TableBody>
                          {filteredOrdersInTab.length > 0 && (
                            <TableFooter className="bg-secondary/20">
                              <TableRow>
                                <TableCell colSpan={4} className="text-right font-bold text-foreground">
                                  <div className="flex flex-col gap-1 items-end">
                                    {selectedOrderIds.length > 0 && <span className="text-primary text-xs uppercase tracking-wider">Total Seleccionado ({selectedOrderIds.length}):</span>}
                                    <span>TOTAL ACUMULADO DEL ESTADO:</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right font-bold text-base">
                                  <div className="flex flex-col gap-1">
                                    {selectedOrderIds.length > 0 && <span className="text-primary">${totalCostForSelected.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>}
                                    <span className="text-accent">${totalCostForStatus.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                  </div>
                                </TableCell>
                                <TableCell colSpan={isTabRecibido ? 3 : 2}></TableCell>
                              </TableRow>
                            </TableFooter>
                          )}
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
                              <span className="font-medium">{filteredOrdersInTab.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span>-
                              <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredOrdersInTab.length)}</span> de 
                              <span className="font-medium"> {filteredOrdersInTab.length}</span>
                            </div>
                          </div>
                          <div className="flex gap-2 order-1 sm:order-2">
                            <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="gap-1">
                              <ChevronLeft className="w-4 h-4" /> Anterior
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages || totalPages === 0} className="gap-1">
                              Siguiente <ChevronRight className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  );
                })}
              </Tabs>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
