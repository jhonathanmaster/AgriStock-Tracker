
"use client";

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAgriStock } from '@/lib/store';
import { useUser } from '@/lib/session';
import { ProductForm } from '@/components/ProductForm';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { 
  Plus, 
  Search, 
  Filter, 
  ShieldAlert, 
  Package, 
  Globe, 
  MapPin, 
  Eye, 
  Pencil, 
  Trash2, 
  ImageIcon, 
  TrendingUp, 
  Wallet, 
  Coins, 
  ChevronLeft, 
  ChevronRight, 
  Truck,
  Layers,
  FileText,
  BadgeDollarSign,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  BarChart3,
  Printer
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Product } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { LoadingScreen } from '@/components/LoadingScreen';
import { Separator } from '@/components/ui/separator';

type SortConfig = {
  key: keyof Product | 'investment';
  direction: 'asc' | 'desc' | null;
};

export default function InventoryPage() {
  const { products, suppliers, addProduct, updateProduct, deleteProduct, criticalThreshold, isLoading, isAdmin, isSuperAdmin } = useAgriStock();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);

  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'name', direction: null });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isUserLoading && !isLoading && mounted) {
      if (!user) {
        router.push('/login');
      } else if (!isAdmin) {
        router.push('/');
      }
    }
  }, [user, isUserLoading, isLoading, router, isAdmin, mounted]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, itemsPerPage, sortConfig]);

  const globalFinancials = useMemo(() => {
    return products.reduce((acc, p) => {
      const cost = (p.costPrice || 0) + (p.transportPricePerBundle || 0);
      acc.totalInvestment += (p.stock || 0) * cost;
      acc.totalProjected += (p.stock || 0) * (p.salePrice || 0);
      return acc;
    }, { totalInvestment: 0, totalProjected: 0 });
  }, [products]);

  const handleSort = (key: SortConfig['key']) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        if (prev.direction === 'asc') return { key, direction: 'desc' };
        if (prev.direction === 'desc') return { key: 'name', direction: null };
      }
      return { key, direction: 'asc' };
    });
  };

  const filteredProducts = useMemo(() => {
    let list = products.filter(p => 
      (p.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (p.referenceCode?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (p.animalType?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (p.category?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    if (sortConfig.direction) {
      list = [...list].sort((a, b) => {
        let valA: any;
        let valB: any;

        if (sortConfig.key === 'investment') {
          valA = (a.stock || 0) * ((a.costPrice || 0) + (a.transportPricePerBundle || 0));
          valB = (b.stock || 0) * ((b.costPrice || 0) + (b.transportPricePerBundle || 0));
        } else {
          valA = a[sortConfig.key as keyof Product] ?? '';
          valB = b[sortConfig.key as keyof Product] ?? '';
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return list;
  }, [products, searchTerm, sortConfig]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleDelete = () => {
    if (deletingProductId) {
      deleteProduct(deletingProductId);
      setDeletingProductId(null);
      toast({
        title: "Producto Eliminado",
        description: "El registro ha sido removido del sistema."
      });
    }
  };

  const handleUpdate = (updatedProduct: Product) => {
    // Pass the stock shown when the form opened: only the difference is applied.
    updateProduct(updatedProduct.id, updatedProduct, editingProduct?.stock);
    setEditingProduct(null);
    toast({
      title: "Producto Actualizado",
      description: "Los cambios han sido guardados exitosamente."
    });
  };

  const handlePrintList = () => {
    // Agrupar por Animal Relacionado
    const groups: Record<string, Product[]> = {};
    
    products.forEach(p => {
      const animal = p.animalType || 'Sin Clasificar';
      if (!groups[animal]) groups[animal] = [];
      groups[animal].push(p);
    });

    const sortedAnimals = Object.keys(groups).sort();

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        variant: "destructive",
        title: "Navegador bloqueado",
        description: "Permite las ventanas emergentes para imprimir la lista de precios."
      });
      return;
    }

    const html = `
      <html>
        <head>
          <title>Lista de Precios por Animal - GeiaTienda</title>
          <style>
            body { font-family: sans-serif; padding: 30px; color: #333; line-height: 1.3; }
            header { display: flex; align-items: center; gap: 15px; border-bottom: 3px solid #4D7C0F; padding-bottom: 12px; margin-bottom: 20px; }
            .logo { width: 35px; height: 35px; background: #4D7C0F; color: white; display: flex; align-items: center; justify-content: center; font-size: 20px; border-radius: 6px; }
            h1 { color: #4D7C0F; margin: 0; font-size: 22px; font-weight: 900; }
            p.subtitle { color: #666; font-size: 11px; margin: 3px 0 0; }
            
            .animal-section { margin-bottom: 10px; }
            .animal-header { 
              background-color: #4D7C0F; 
              color: white; 
              padding: 6px 12px; 
              font-size: 13px; 
              font-weight: 900; 
              text-transform: uppercase;
              border-radius: 6px;
              margin-bottom: 4px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .animal-count { font-size: 9px; opacity: 0.9; font-weight: normal; background: rgba(255,255,255,0.2); padding: 1px 6px; border-radius: 10px; }

            table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
            th { background-color: #F6F8ED; color: #4D7C0F; text-align: left; padding: 8px; border-bottom: 2px solid #4D7C0F; font-size: 10px; text-transform: uppercase; }
            td { padding: 6px 8px; border-bottom: 1px solid #eee; font-size: 11px; vertical-align: top; }
            
            .product-info { display: flex; flex-direction: column; gap: 1px; }
            .product-name { font-weight: 800; color: #111; }
            .category-tag { font-size: 8px; color: #4D7C0F; text-transform: uppercase; font-weight: bold; background: #F6F8ED; padding: 1px 5px; border-radius: 3px; display: inline-block; }
            .ref { color: #999; font-size: 8px; font-family: monospace; text-transform: uppercase; }
            
            .price { text-align: right; font-weight: 900; color: #4D7C0F; font-size: 13px; width: 130px; white-space: nowrap; }
            
            @media print {
              @page { margin: 1cm; }
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <header>
            <div class="logo">🌾</div>
            <div>
              <h1>GeiaTienda Tracker</h1>
              <p class="subtitle">Catálogo de Precios por Especie - ${new Date().toLocaleDateString('es-ES', { dateStyle: 'full' })}</p>
            </div>
          </header>

          ${sortedAnimals.map(animal => {
            const animalProducts = groups[animal].sort((a, b) => a.name.localeCompare(b.name));
            return `
              <div class="animal-section">
                <div class="animal-header">
                  <span>${animal}</span>
                  <span class="animal-count">${animalProducts.length} productos</span>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>Producto / Referencia</th>
                      <th style="width: 110px;">Categoría</th>
                      <th style="text-align: right">P.V.P</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${animalProducts.map(p => `
                      <tr>
                        <td>
                          <div class="product-info">
                            <span class="product-name">${p.name}</span>
                            <span class="ref">REF: ${p.referenceCode}</span>
                          </div>
                        </td>
                        <td><span class="category-tag">${p.category}</span></td>
                        <td class="price">$${p.salePrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            `;
          }).join('')}

          <script>
            window.onload = function() { 
              setTimeout(() => {
                window.print(); 
                window.close(); 
              }, 500);
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const SortIcon = ({ column }: { column: SortConfig['key'] }) => {
    if (sortConfig.key !== column) return <ArrowUpDown className="ml-2 h-3 w-3 opacity-30" />;
    if (sortConfig.direction === 'asc') return <ArrowUp className="ml-2 h-3 w-3 text-primary" />;
    if (sortConfig.direction === 'desc') return <ArrowDown className="ml-2 h-3 w-3 text-primary" />;
    return <ArrowUpDown className="ml-2 h-3 w-3 opacity-30" />;
  };

  if (isUserLoading || isLoading || !mounted || (user && !isAdmin)) {
    return <LoadingScreen />;
  }

  if (!user || !isAdmin) return null;

  return (
    <main className="flex-1 p-8 space-y-6 overflow-auto">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-3xl font-bold text-foreground tracking-tight">Gestión de Inventario</h1>
              <Badge variant="outline" className="text-accent border-accent gap-1 px-2">
                <ShieldAlert className="w-3 h-3" />
                Administrador
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm">Control total de existencias, bultos y costos operativos</p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2 shadow-sm border-primary/20 text-primary" onClick={handlePrintList} size="sm">
            <Printer className="w-4 h-4" />
            Imprimir Listado
          </Button>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-sm" size="sm">
                <Plus className="w-4 h-4" />
                Nuevo Producto
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Registrar Nuevo Producto</DialogTitle>
                <DialogDescription>Completa los datos técnicos y financieros del nuevo ítem.</DialogDescription>
              </DialogHeader>
              <ProductForm onSave={(p) => {
                addProduct(p);
                toast({ title: "Producto Creado", description: "El producto se ha añadido correctamente." });
              }} />
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-4 items-stretch">
        <div className="grid grid-cols-2 gap-3 lg:w-1/3">
          <div className="bg-white p-4 rounded-xl border border-border shadow-sm flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="w-3 h-3 text-primary" />
              <span className="text-[10px] uppercase font-black text-muted-foreground tracking-wider leading-none">Inversión Total</span>
            </div>
            <span className="text-lg font-black text-primary leading-none">
              ${globalFinancials.totalInvestment.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-accent/20 shadow-sm flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-3 h-3 text-accent" />
              <span className="text-[10px] uppercase font-black text-muted-foreground tracking-wider leading-none">Venta Proyectada</span>
            </div>
            <span className="text-lg font-black text-accent leading-none">
              ${globalFinancials.totalProjected.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className="flex-1 flex gap-4 items-center bg-white p-4 rounded-xl border border-border shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por nombre, código, animal o categoría..." 
              className="pl-10 h-11 bg-muted/10 border-none focus-visible:ring-primary" 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" className="gap-2 h-11 px-6">
            <Filter className="w-4 h-4" />
            Filtros
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <TooltipProvider delayDuration={300}>
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="w-[80px]">Imagen</TableHead>
                <TableHead className="w-[120px] cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('referenceCode')}>
                  <div className="flex items-center">Referencia <SortIcon column="referenceCode" /></div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('name')}>
                  <div className="flex items-center">Producto <SortIcon column="name" /></div>
                </TableHead>
                <TableHead className="text-right cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('stock')}>
                  <div className="flex items-center justify-end">Stock <SortIcon column="stock" /></div>
                </TableHead>
                <TableHead className="text-right bg-primary/5 font-bold cursor-pointer hover:bg-primary/10 transition-colors" onClick={() => handleSort('investment')}>
                  <div className="flex items-center justify-end">Inversión <SortIcon column="investment" /></div>
                </TableHead>
                <TableHead className="text-right cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('salePrice')}>
                  <div className="flex items-center justify-end">P. Venta <SortIcon column="salePrice" /></div>
                </TableHead>
                <TableHead className="text-center">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedProducts.map(p => {
                const totalInvestment = (p.stock || 0) * ((p.costPrice || 0) + (p.transportPricePerBundle || 0));
                const isStockCritical = (p.stock || 0) <= criticalThreshold;
                
                return (
                  <TableRow key={p.id} className="hover:bg-secondary/5 group transition-colors">
                    <TableCell>
                      <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-muted border border-border shadow-sm">
                        {p.imageUrl ? (
                          <Image 
                            src={p.imageUrl} 
                            alt={p.name} 
                            fill 
                            className="object-cover"
                            sizes="40px"
                            unoptimized
                          />
                        ) : (
                          <div className="flex items-center justify-center w-full h-full text-muted-foreground/20">
                            <ImageIcon className="w-5 h-5" />
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-[10px] font-bold text-muted-foreground bg-muted/5">
                      {p.referenceCode}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="font-bold text-primary group-hover:underline cursor-pointer" onClick={() => setViewingProduct(p)}>
                          {p.name}
                        </div>
                        {p.isImported && (
                          <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/20 px-1.5 h-4 gap-0.5 text-[9px]">
                            <Globe className="w-2.5 h-2.5" />
                            IMP
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-1 mt-1">
                        <Badge variant="outline" className="text-[9px] h-3.5 px-1 bg-white">{p.category}</Badge>
                        <span className="text-[9px] text-muted-foreground italic">para {p.animalType}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      <div className="flex flex-col items-end">
                        <span className={isStockCritical ? "text-destructive" : "text-foreground"}>
                          {(p.stock || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })}
                        </span>
                        <span className="text-[9px] font-normal text-muted-foreground uppercase">{p.mainUnit}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-bold text-primary bg-primary/5">
                      ${totalInvestment.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right font-bold text-accent">
                      ${(p.salePrice || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-500 hover:bg-blue-50" onClick={() => setViewingProduct(p)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Ver detalles</TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-primary hover:bg-primary/5" onClick={() => setEditingProduct(p)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Editar</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/5" onClick={() => setDeletingProductId(p.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Eliminar</TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredProducts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground italic">
                    No se encontraron productos que coincidan con la búsqueda.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TooltipProvider>

        <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t bg-muted/10 gap-4">
          <div className="flex items-center gap-4 order-2 sm:order-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Ver:</span>
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
            <div className="text-xs text-muted-foreground">
              Mostrando <span className="font-medium">{filteredProducts.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span>-
              <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredProducts.length)}</span> de 
              <span className="font-medium"> {filteredProducts.length}</span>
            </div>
          </div>
          
          <div className="flex gap-2 order-1 sm:order-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="h-8 px-3"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Anterior
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="h-8 px-3"
            >
              Siguiente
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={!!editingProduct} onOpenChange={(open) => !open && setEditingProduct(null)}>
        <DialogContent className="max-w-2xl overflow-y-auto max-h-[95vh]">
          <DialogHeader>
            <DialogTitle className="text-xl">Editar Producto: {editingProduct?.name}</DialogTitle>
            <DialogDescription>Ajusta los parámetros técnicos o financieros del registro.</DialogDescription>
          </DialogHeader>
          {editingProduct && (
            <ProductForm 
              initialData={editingProduct} 
              onSave={handleUpdate} 
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingProduct} onOpenChange={(open) => !open && setViewingProduct(null)}>
        <DialogContent className="max-w-xl overflow-hidden p-0 border-none shadow-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Detalles del Producto: {viewingProduct?.name}</DialogTitle>
          </DialogHeader>
          {viewingProduct && (
            <div className="flex flex-col bg-white">
              <div className="relative h-56 w-full bg-muted">
                {viewingProduct.imageUrl ? (
                  <Image 
                    src={viewingProduct.imageUrl} 
                    alt={viewingProduct.name} 
                    fill 
                    className="object-cover"
                    sizes="600px"
                    unoptimized
                  />
                ) : (
                  <div className="flex items-center justify-center w-full h-full text-muted-foreground/20">
                    <ImageIcon className="w-16 h-16" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-4 left-6 right-6">
                  <Badge className="bg-white/20 backdrop-blur-md text-white border-white/30 hover:bg-white/30 mb-2">
                    {viewingProduct.category}
                  </Badge>
                  <h3 className="text-2xl font-extrabold text-white leading-tight">{viewingProduct.name}</h3>
                  <p className="text-white/80 font-mono text-xs mt-1 uppercase tracking-widest">{viewingProduct.referenceCode}</p>
                </div>
              </div>

              <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1.5">
                      <Layers className="w-3 h-3" /> Relacionado con
                    </p>
                    <p className="font-semibold text-sm">{viewingProduct.animalType}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1.5">
                      <Truck className="w-3 h-3" /> Proveedor
                    </p>
                    <p className="font-semibold text-sm">
                      {suppliers.find(s => s.id === viewingProduct.supplierId)?.name || 'Sin asignar'}
                    </p>
                  </div>
                </div>

                <Separator className="opacity-50" />

                <div className="bg-primary/5 rounded-xl p-4 flex justify-between items-center border border-primary/10">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2.5 rounded-lg text-primary">
                      <Package className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs text-primary font-bold uppercase">Stock Disponible</p>
                      <p className="text-2xl font-black text-primary leading-none mt-1">
                        {viewingProduct.stock.toFixed(2)}
                        <span className="text-sm font-bold ml-1 uppercase">{viewingProduct.mainUnit}</span>
                      </p>
                    </div>
                  </div>
                  {viewingProduct.stock <= criticalThreshold && (
                    <Badge variant="destructive" className="animate-pulse">Crítico</Badge>
                  )}
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase text-muted-foreground flex items-center gap-2">
                    <BadgeDollarSign className="w-4 h-4 text-accent" />
                    Análisis Financiero Proyectado
                  </h4>
                  
                  <div className="grid grid-cols-1 gap-2">
                    <div className="flex justify-between items-center p-3 bg-secondary/20 rounded-lg border border-border/50">
                      <span className="text-sm font-medium flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-muted-foreground" /> 
                        Inversión en Bodega:
                      </span>
                      <span className="font-bold text-sm">
                        ${((viewingProduct.costPrice + viewingProduct.transportPricePerBundle) * viewingProduct.stock).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-accent/5 rounded-lg border border-accent/20">
                      <span className="text-sm font-bold text-accent flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" /> 
                        Venta Estimada (P.V.P):
                      </span>
                      <span className="font-black text-accent text-lg">
                        ${(viewingProduct.salePrice * viewingProduct.stock).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200">
                      <span className="text-sm font-bold text-green-700 flex items-center gap-2">
                        <Coins className="w-4 h-4" /> 
                        Utilidad Neta (Total):
                      </span>
                      <span className="font-black text-green-700 text-lg">
                        ${((viewingProduct.salePrice - (viewingProduct.costPrice + viewingProduct.transportPricePerBundle)) * viewingProduct.stock).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                {viewingProduct.isImported && (
                  <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl space-y-2">
                    <h4 className="font-bold text-[10px] uppercase flex items-center gap-2 text-blue-700">
                      <Globe className="w-3 h-3" /> Origen e Importación
                    </h4>
                    <div className="flex justify-between text-xs">
                      <span className="text-blue-600/70">País de Procedencia:</span>
                      <span className="font-bold text-blue-800">{viewingProduct.origin || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between text-xs border-t border-blue-100 pt-2">
                      <span className="text-blue-600/70">Costo Aduanero/Imp:</span>
                      <span className="font-bold text-blue-800">${viewingProduct.importCost?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                )}

                <div className="space-y-2 pb-2">
                  <p className="text-[10px] uppercase text-muted-foreground font-black flex items-center gap-2">
                    <FileText className="w-3 h-3" /> Ficha Técnica / Notas
                  </p>
                  <p className="text-xs leading-relaxed text-muted-foreground bg-muted/30 p-3 rounded-lg border border-dashed border-border italic">
                    {viewingProduct.description || "Este producto no cuenta con especificaciones técnicas adicionales registradas."}
                  </p>
                </div>
              </div>
              
              <div className="p-4 border-t bg-muted/10 flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setViewingProduct(null)}>
                  Cerrar Vista
                </Button>
                <Button size="sm" onClick={() => { setEditingProduct(viewingProduct); setViewingProduct(null); }}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Editar Registro
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingProductId} onOpenChange={(open) => !open && setDeletingProductId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este producto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se borrará permanentemente del inventario, incluyendo su historial técnico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleDelete}>
              Eliminar Definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
