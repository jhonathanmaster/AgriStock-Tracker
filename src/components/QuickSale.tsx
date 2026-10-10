
"use client";

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Product, UnitType, Customer } from '@/lib/types';
import { 
  ShoppingCart, 
  DollarSign, 
  Package, 
  BadgeDollarSign, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Fingerprint, 
  Search, 
  X,
  UserPlus,
  Percent,
  CalendarDays,
  CircleHelp,
  Info,
  CheckCircle2,
  ChevronRight,
  UserCheck
} from 'lucide-react';
import { useAgriStock } from '@/lib/store';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function QuickSale({ 
  products, 
  onSale 
}: { 
  products: Product[], 
  onSale: (pId: string, qty: number, unit: UnitType, totalValue: number, ivaPercentage: number, subTotal: number, ivaValue: number, saleDate: string, customerData?: { id?: string, name?: string, phone?: string, email?: string, address?: string, identificationNumber?: string }) => void 
}) {
  const { convertQuantity, customers } = useAgriStock();
  const [saleDate, setSaleDate] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState<UnitType>('kilos');
  const [ivaPercentage, setIvaPercentage] = useState<string>('0');
  const [totalPrice, setTotalPrice] = useState<string>('0');
  
  // Estados para información del cliente
  const [showCustomerInfo, setShowCustomerInfo] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerIdentification, setCustomerIdentification] = useState('');
  const [foundCustomerId, setFoundCustomerId] = useState('');
  const [clientFound, setClientFound] = useState(false);

  // Inicializar fecha después del montaje para evitar errores de hidratación
  useEffect(() => {
    setSaleDate(new Date().toISOString().split('T')[0]);
  }, []);

  // Ordenar productos de forma ascendente por nombre
  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'es', { sensitivity: 'base' }));
  }, [products]);

  const selectedProduct = products.find(p => p.id === selectedId);

  const isFoodProduct = selectedProduct && (
    selectedProduct.category === 'Concentrados' || 
    selectedProduct.category === 'Forrajes' || 
    selectedProduct.category === 'Sales Minerales'
  );

  // Cálculos derivados
  const { calculatedSubTotal, calculatedIvaValue, calculatedTotal } = useMemo(() => {
    if (!selectedProduct || !quantity) return { calculatedSubTotal: 0, calculatedIvaValue: 0, calculatedTotal: 0 };
    
    const qty = parseFloat(quantity) || 0;
    const ivaPerc = parseFloat(ivaPercentage) || 0;
    const equivalentQtyInBaseUnit = convertQuantity(qty, unit, selectedProduct.mainUnit);
    
    const subTotal = equivalentQtyInBaseUnit * (selectedProduct.salePrice || 0);
    const ivaValue = subTotal * (ivaPerc / 100);
    const total = subTotal + ivaValue;

    return { 
      calculatedSubTotal: subTotal, 
      calculatedIvaValue: ivaValue, 
      calculatedTotal: total 
    };
  }, [selectedProduct, quantity, unit, ivaPercentage, convertQuantity]);

  // Actualizar el input de precio total cuando cambian los factores, pero permitir edición manual
  useEffect(() => {
    setTotalPrice(calculatedTotal.toFixed(2));
  }, [calculatedTotal]);

  // Resultados de búsqueda filtrados para clientes
  const searchResults = useMemo(() => {
    if (!customerSearchQuery || customerSearchQuery.length < 2) return [];
    const query = customerSearchQuery.toLowerCase();
    return (customers || []).filter(c => 
      c.name.toLowerCase().includes(query) || 
      c.phone.includes(query) || 
      c.identificationNumber?.includes(query)
    ).slice(0, 5);
  }, [customerSearchQuery, customers]);

  const handleSelectCustomer = (c: Customer) => {
    setClientFound(true);
    setFoundCustomerId(c.id);
    setCustomerName(c.name || '');
    setCustomerPhone(c.phone || '');
    setCustomerEmail(c.email || '');
    setCustomerAddress(c.address || '');
    setCustomerIdentification(c.identificationNumber || '');
    setCustomerSearchQuery('');
  };

  const resetCustomerFields = () => {
    setClientFound(false);
    setFoundCustomerId('');
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');
    setCustomerAddress('');
    setCustomerIdentification('');
    setCustomerSearchQuery('');
  };

  const handleSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || !quantity) return;

    const finalTotal = parseFloat(totalPrice) || 0;
    const finalIvaPerc = parseFloat(ivaPercentage) || 0;
    
    // Si el usuario editó el total manualmente, recalculamos el subtotal basado en el IVA indicado
    const finalSubTotal = finalTotal / (1 + finalIvaPerc / 100);
    const finalIvaValue = finalTotal - finalSubTotal;

    const customerData = showCustomerInfo ? {
      id: foundCustomerId || undefined,
      name: customerName,
      phone: customerPhone,
      email: customerEmail || '',
      address: customerAddress || '',
      identificationNumber: customerIdentification || ''
    } : undefined;

    // Intentar preservar la hora actual al asignar la fecha de venta
    const now = new Date();
    const timeStr = now.toISOString().split('T')[1];
    const finalSaleDateTime = `${saleDate || new Date().toISOString().split('T')[0]}T${timeStr}`;

    onSale(
      selectedId, 
      parseFloat(quantity), 
      unit, 
      finalTotal, 
      finalIvaPerc,
      finalSubTotal,
      finalIvaValue,
      finalSaleDateTime,
      customerData
    );
    
    // Reset form
    setQuantity('');
    setSelectedId('');
    setTotalPrice('0');
    setIvaPercentage('0');
    setShowCustomerInfo(false);
    resetCustomerFields();
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-border shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-accent rounded-lg text-white">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-bold">Venta Rápida</h2>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
              <CircleHelp className="w-5 h-5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-2">
                <Info className="w-6 h-6" />
              </div>
              <DialogTitle className="text-xl font-bold">Guía: Registro de Venta</DialogTitle>
              <DialogDescription>
                Sigue estos pasos para registrar una transacción correctamente en el sistema.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">1</div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-foreground">Selecciona el Producto</p>
                  <p className="text-xs text-muted-foreground">Busca el insumo o animal en la lista desplegable. El sistema cargará su precio y stock actual.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">2</div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-foreground">Cantidad y Unidad</p>
                  <p className="text-xs text-muted-foreground">Indica cuánto vendes y en qué unidad (libras, kilos, bultos). El sistema hará la conversión automática.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">3</div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-foreground">Verifica el Total</p>
                  <p className="text-xs text-muted-foreground">El total se calcula solo, pero puedes editarlo manualmente si aplicaste un descuento o precio especial.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">4</div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-foreground">Asocia al Cliente (Opcional)</p>
                  <p className="text-xs text-muted-foreground">Usa el buscador para vincular la venta a un cliente existente o registrar uno nuevo al instante.</p>
                </div>
              </div>
              
              <div className="mt-6 p-3 bg-secondary/20 rounded-lg border border-border">
                <p className="text-[10px] uppercase font-black text-primary mb-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Tip Pro
                </p>
                <p className="text-[11px] text-muted-foreground leading-relaxed italic">
                  Las ventas registradas descuentan automáticamente el stock del inventario y quedan grabadas en el historial de movimientos.
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <form onSubmit={handleSale} className="space-y-4">
        <div className="space-y-2 bg-muted/20 p-3 rounded-lg border border-dashed border-border mb-4">
          <Label className="flex items-center gap-2 mb-1.5 text-xs font-bold text-muted-foreground uppercase">
            <CalendarDays className="w-3.5 h-3.5 text-primary" />
            Fecha de Transacción
          </Label>
          <Input 
            type="date" 
            value={saleDate} 
            onChange={e => setSaleDate(e.target.value)} 
            className="h-9 text-sm"
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Producto/Ítem</Label>
          <Select onValueChange={(val) => {
            setSelectedId(val);
            const prod = products.find(p => p.id === val);
            if (prod) {
              setUnit(prod.mainUnit);
            }
          }} value={selectedId}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccione un producto" />
            </SelectTrigger>
            <SelectContent>
              {sortedProducts.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name} ({p.category})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Cantidad</Label>
            <Input 
              type="number" 
              step="0.01"
              value={quantity} 
              onChange={e => setQuantity(e.target.value)} 
              placeholder="0.00" 
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Unidad de Venta</Label>
            <Select onValueChange={(v) => setUnit(v as UnitType)} value={unit}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {!isFoodProduct && <SelectItem value="unidades">Unidades</SelectItem>}
                <SelectItem value="libras">Libras</SelectItem>
                <SelectItem value="kilos">Kilos</SelectItem>
                <SelectItem value="bultos">Bultos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedProduct && (
          <div className="space-y-4 mt-2 animate-in fade-in duration-300">
            <div className="bg-secondary/30 p-3 rounded-lg text-sm flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" />
                Stock disponible:
              </span>
              <span className={cn("font-bold", selectedProduct.stock < 10 ? "text-destructive" : "text-foreground")}>
                {selectedProduct.stock.toFixed(2)} {selectedProduct.mainUnit}
              </span>
            </div>
            
            <div className="bg-primary/5 p-3 rounded-lg text-sm flex justify-between items-center border border-primary/10">
              <span className="text-primary font-bold flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5" />
                P. Base ({selectedProduct.mainUnit}):
              </span>
              <span className="font-bold text-primary">
                ${selectedProduct.salePrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-muted-foreground font-bold text-[10px] uppercase">
                  <Percent className="w-3 h-3" />
                  IVA (%)
                </Label>
                <Input 
                  type="number" 
                  step="1"
                  value={ivaPercentage} 
                  onChange={e => setIvaPercentage(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-accent font-bold text-[10px] uppercase">
                  <BadgeDollarSign className="w-3 h-3" />
                  Total Venta
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-xs">$</span>
                  <Input 
                    type="number" 
                    step="0.01"
                    value={totalPrice} 
                    onChange={e => setTotalPrice(e.target.value)}
                    className="pl-6 h-9 font-bold bg-accent/5"
                  />
                </div>
              </div>
            </div>

            <div className="bg-muted/30 p-3 rounded-lg space-y-1.5 text-[11px] border border-border/50">
              <div className="flex justify-between text-muted-foreground">
                <span>Sub-Total:</span>
                <span className="font-mono">${calculatedSubTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Impuesto IVA ({ivaPercentage}%):</span>
                <span className="font-mono text-accent">${calculatedIvaValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between pt-1 border-t font-bold text-foreground">
                <span>Total Facturado:</span>
                <span className="font-mono">${parseFloat(totalPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-4 border-t">
              <Checkbox 
                id="customer-info" 
                checked={showCustomerInfo} 
                onCheckedChange={(checked) => {
                  setShowCustomerInfo(!!checked);
                  if (!checked) resetCustomerFields();
                }}
              />
              <Label htmlFor="customer-info" className="text-sm cursor-pointer font-bold text-muted-foreground">
                Asociar Cliente a la Venta
              </Label>
            </div>

            {showCustomerInfo && (
              <div className="space-y-4 bg-muted/20 p-4 rounded-xl border border-dashed border-border animate-in slide-in-from-top-2 duration-300">
                {!clientFound ? (
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        placeholder="Buscar cliente por nombre o ID..." 
                        value={customerSearchQuery}
                        onChange={e => setCustomerSearchQuery(e.target.value)}
                        className="pl-9 h-9 text-sm"
                      />
                      {searchResults.length > 0 && (
                        <div className="absolute z-20 w-full mt-1 bg-white border border-border rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                          <div className="p-1.5 bg-muted/30 text-[9px] font-bold text-muted-foreground uppercase tracking-widest border-b">Resultados encontrados</div>
                          {searchResults.map(c => (
                            <button
                              key={c.id}
                              type="button"
                              className="w-full text-left px-4 py-2.5 hover:bg-primary/5 transition-colors flex flex-col gap-0.5 border-b last:border-0"
                              onClick={() => handleSelectCustomer(c)}
                            >
                              <span className="font-bold text-sm text-primary">{c.name}</span>
                              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                                <span className="flex items-center gap-1"><Phone className="w-2.5 h-2.5" /> {c.phone}</span>
                                {c.identificationNumber && <span className="flex items-center gap-1"><Fingerprint className="w-2.5 h-2.5" /> {c.identificationNumber}</span>}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <div className="h-px flex-1 bg-border" />
                      <span className="text-[9px] font-bold uppercase tracking-tighter">O registrar nuevo</span>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 p-2.5 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="bg-green-100 p-1.5 rounded-full text-green-600">
                        <UserCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-green-700 uppercase leading-tight tracking-wider">Cliente Seleccionado</p>
                        <p className="text-sm font-bold text-green-900">{customerName}</p>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-green-700 hover:bg-green-100" 
                      onClick={resetCustomerFields}
                      title="Cambiar cliente"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold flex items-center gap-1 text-muted-foreground">
                      <Phone className="w-2.5 h-2.5" /> Teléfono
                    </Label>
                    <Input 
                      placeholder="300..." 
                      value={customerPhone}
                      onChange={e => setCustomerPhone(e.target.value)}
                      required={showCustomerInfo}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold flex items-center gap-1 text-muted-foreground">
                      <Fingerprint className="w-2.5 h-2.5" /> ID Fiscal
                    </Label>
                    <Input 
                      placeholder="CC/NIT" 
                      value={customerIdentification}
                      onChange={e => setCustomerIdentification(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold flex items-center gap-1 text-muted-foreground">
                    <User className="w-2.5 h-2.5" /> Nombre
                  </Label>
                  <Input 
                    placeholder="Nombre completo" 
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    required={showCustomerInfo}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold flex items-center gap-1 text-muted-foreground">
                      <Mail className="w-2.5 h-2.5" /> Correo
                    </Label>
                    <Input 
                      type="email" 
                      placeholder="ejemplo@email.com" 
                      value={customerEmail}
                      onChange={e => setCustomerEmail(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold flex items-center gap-1 text-muted-foreground">
                      <MapPin className="w-2.5 h-2.5" /> Dirección
                    </Label>
                    <Input 
                      placeholder="Ubicación" 
                      value={customerAddress}
                      onChange={e => setCustomerAddress(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <Button 
          type="submit" 
          className="w-full bg-accent hover:bg-accent/90 mt-4 h-12 text-base font-bold shadow-md gap-2" 
          disabled={!selectedId || !quantity || (showCustomerInfo && (!customerName || !customerPhone))}
        >
          <ShoppingCart className="w-5 h-5" />
          Registrar Venta
        </Button>
      </form>
    </div>
  );
}
