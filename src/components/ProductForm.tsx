"use client";

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Save, Package, Globe, MapPin, DollarSign, Image as ImageIcon, Upload, X } from 'lucide-react';
import { Product, UnitType } from '@/lib/types';
import { useAgriStock } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';

export function ProductForm({ onSave, initialData }: { onSave: (p: Product) => void, initialData?: Product }) {
  const { animalTypes, categories, suppliers } = useAgriStock();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    referenceCode: initialData?.referenceCode || '',
    name: initialData?.name || '',
    description: initialData?.description || '',
    animalType: initialData?.animalType || '',
    category: initialData?.category || '',
    supplierId: initialData?.supplierId || '',
    imageUrl: initialData?.imageUrl || '',
    mainUnit: (initialData?.mainUnit as UnitType) || 'kilos',
    costPrice: initialData?.costPrice?.toString() || '',
    profitPercentage: initialData?.profitPercentage?.toString() || '20',
    salePrice: initialData?.salePrice?.toString() || '0',
    transportPricePerBundle: initialData?.transportPricePerBundle?.toString() || '',
    initialStock: initialData?.stock?.toString() || '0',
    isImported: initialData?.isImported || false,
    origin: initialData?.origin || '',
    importCost: initialData?.importCost?.toString() || '',
  });

  useEffect(() => {
    const cost = parseFloat(formData.costPrice) || 0;
    const transport = parseFloat(formData.transportPricePerBundle) || 0;
    const profit = parseFloat(formData.profitPercentage) || 0;
    
    const baseAmount = cost + transport;
    const calculatedSale = baseAmount * (1 + profit / 100);
    
    setFormData(prev => ({ 
      ...prev, 
      salePrice: calculatedSale.toFixed(2) 
    }));
  }, [formData.costPrice, formData.transportPricePerBundle, formData.profitPercentage]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) { // 1MB limit for Base64 strings in Firestore docs
        toast({
          variant: "destructive",
          title: "Archivo muy grande",
          description: "Por favor selecciona una imagen menor a 1MB."
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const stock = parseFloat(formData.initialStock) || 0;
    
    let stockInBundles = 0;
    if (formData.mainUnit === 'bultos') {
      stockInBundles = stock;
    } else if (formData.mainUnit === 'kilos') {
      stockInBundles = stock / 40;
    }

    onSave({
      id: initialData?.id || Math.random().toString(36).substring(7),
      referenceCode: formData.referenceCode,
      name: formData.name,
      description: formData.description,
      animalType: formData.animalType || 'No Aplica',
      category: formData.category,
      supplierId: formData.supplierId,
      imageUrl: formData.imageUrl,
      stock: stock,
      stockInBundles: stockInBundles,
      mainUnit: formData.mainUnit,
      costPrice: parseFloat(formData.costPrice) || 0,
      profitPercentage: parseFloat(formData.profitPercentage) || 0,
      salePrice: parseFloat(formData.salePrice) || 0,
      transportPricePerBundle: parseFloat(formData.transportPricePerBundle) || 0,
      isImported: formData.category === 'Insumos Varios' ? formData.isImported : false,
      origin: formData.isImported ? formData.origin : '',
      importCost: formData.isImported ? (parseFloat(formData.importCost) || 0) : 0,
    });

    if (!initialData) {
      setFormData({ 
        referenceCode: '', 
        name: '', 
        description: '', 
        animalType: '', 
        category: '', 
        supplierId: '',
        imageUrl: '',
        mainUnit: 'kilos',
        costPrice: '', 
        profitPercentage: '20',
        salePrice: '0', 
        transportPricePerBundle: '',
        initialStock: '0',
        isImported: false,
        origin: '',
        importCost: '',
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pt-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="referenceCode">Código de Referencia</Label>
          <Input 
            id="referenceCode" 
            value={formData.referenceCode} 
            onChange={e => setFormData({...formData, referenceCode: e.target.value})} 
            placeholder="Ej: MA-001"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">Nombre del Producto/Ítem</Label>
          <Input 
            id="name" 
            value={formData.name} 
            onChange={e => setFormData({...formData, name: e.target.value})} 
            placeholder="Ej: Maíz o Gallina Ponedora"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="category">Categoría</Label>
          <Select 
            value={formData.category} 
            onValueChange={(v) => setFormData({...formData, category: v})}
          >
            <SelectTrigger id="category">
              <SelectValue placeholder="Seleccione categoría" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.name}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="animalType">Animal Relacionado</Label>
          <Select 
            value={formData.animalType} 
            onValueChange={(v) => setFormData({...formData, animalType: v})}
          >
            <SelectTrigger id="animalType">
              <SelectValue placeholder="Animal (Opcional)" />
            </SelectTrigger>
            <SelectContent>
              {animalTypes.map((animal) => (
                <SelectItem key={animal.id} value={animal.name}>
                  {animal.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="supplierId">Proveedor</Label>
          <Select 
            value={formData.supplierId} 
            onValueChange={(v) => setFormData({...formData, supplierId: v})}
          >
            <SelectTrigger id="supplierId">
              <SelectValue placeholder="Proveedor" />
            </SelectTrigger>
            <SelectContent>
              {suppliers.map((sup) => (
                <SelectItem key={sup.id} value={sup.id}>
                  {sup.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4 border-t pt-4 border-border/50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-primary" />
            <Label className="font-bold">Imagen del Producto</Label>
          </div>
          {formData.imageUrl && (
            <Button 
              type="button" 
              variant="ghost" 
              size="sm" 
              className="h-7 text-destructive hover:bg-destructive/10"
              onClick={() => setFormData({...formData, imageUrl: ''})}
            >
              <X className="w-3 h-3 mr-1" /> Quitar imagen
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Cargar archivo local</Label>
              <div className="flex gap-2">
                <Input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full gap-2 border-dashed border-2 h-10"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4" />
                  Seleccionar foto
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="imageUrl" className="text-xs text-muted-foreground">O pegar URL de la imagen</Label>
              <Input 
                id="imageUrl"
                value={formData.imageUrl.startsWith('data:') ? '' : formData.imageUrl}
                onChange={e => setFormData({...formData, imageUrl: e.target.value})}
                placeholder="https://ejemplo.com/imagen.jpg"
              />
            </div>
          </div>
          
          <div className="flex justify-center bg-muted/30 rounded-lg p-2 h-32 relative overflow-hidden border border-dashed border-border group">
            {formData.imageUrl ? (
              <div className="relative w-full h-full">
                <Image 
                  src={formData.imageUrl} 
                  alt="Vista previa" 
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-muted-foreground gap-1">
                <ImageIcon className="w-8 h-8 opacity-20" />
                <span className="text-[10px]">Vista previa</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {formData.category === 'Insumos Varios' && (
        <div className="space-y-4 bg-secondary/10 p-4 rounded-lg border border-primary/20">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="isImported" 
              checked={formData.isImported} 
              onCheckedChange={(checked) => setFormData({...formData, isImported: !!checked})}
            />
            <Label htmlFor="isImported" className="flex items-center gap-2 cursor-pointer font-bold text-primary">
              <Globe className="w-4 h-4 text-accent" />
              ¿Es un producto importado?
            </Label>
          </div>

          {formData.isImported && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="origin" className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-accent" />
                  Origen del Producto
                </Label>
                <Input 
                  id="origin"
                  value={formData.origin}
                  onChange={e => setFormData({...formData, origin: e.target.value})}
                  placeholder="Ej: Estados Unidos, Brasil..."
                  required={formData.isImported}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="importCost" className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-accent" />
                  Costo de Importación ($)
                </Label>
                <Input 
                  id="importCost"
                  type="number"
                  step="0.01"
                  value={formData.importCost}
                  onChange={e => setFormData({...formData, importCost: e.target.value})}
                  placeholder="0.00"
                  required={formData.isImported}
                />
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4 border-border/50">
        <div className="space-y-2">
          <Label htmlFor="mainUnit">Unidad de Gestión</Label>
          <Select 
            value={formData.mainUnit} 
            onValueChange={(v) => setFormData({...formData, mainUnit: v as UnitType})}
          >
            <SelectTrigger id="mainUnit">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="kilos">Kilos</SelectItem>
              <SelectItem value="libras">Libras</SelectItem>
              <SelectItem value="bultos">Bultos</SelectItem>
              <SelectItem value="unidades">Unidades</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="initialStock" className="flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            Stock Actual ({formData.mainUnit})
          </Label>
          <Input 
            id="initialStock" 
            type="number"
            step="0.01"
            value={formData.initialStock} 
            onChange={e => setFormData({...formData, initialStock: e.target.value})}
            placeholder="0.00"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descripción / Notas</Label>
        <Textarea 
          id="description" 
          value={formData.description} 
          onChange={e => setFormData({...formData, description: e.target.value})}
          placeholder="Detalles adicionales..."
          className="h-20"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 border-t pt-4 border-border/50">
        <div className="space-y-2">
          <Label htmlFor="costPrice">Costo Unit. ($)</Label>
          <Input 
            id="costPrice" 
            type="number"
            step="0.01"
            value={formData.costPrice} 
            onChange={e => setFormData({...formData, costPrice: e.target.value})}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="transportPricePerBundle">Flete Unit. ($)</Label>
          <Input 
            id="transportPricePerBundle" 
            type="number"
            step="0.01"
            value={formData.transportPricePerBundle} 
            onChange={e => setFormData({...formData, transportPricePerBundle: e.target.value})}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="profitPercentage">% Ganancia</Label>
          <div className="relative">
            <Input 
              id="profitPercentage" 
              type="number"
              value={formData.profitPercentage} 
              onChange={e => setFormData({...formData, profitPercentage: e.target.value})}
              required
              className="pr-8"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="salePrice" className="text-primary font-bold">Venta (Calculado)</Label>
          <Input 
            id="salePrice" 
            type="number"
            value={formData.salePrice} 
            readOnly
            className="bg-secondary/20 font-bold text-primary border-primary/50"
          />
        </div>
      </div>

      <div className="flex gap-3 pb-4">
        <Button type="submit" className="flex-1 gap-2 h-12 text-base shadow-lg">
          <Save className="w-5 h-5" />
          {initialData ? 'Actualizar Producto' : 'Registrar Ítem'}
        </Button>
      </div>
    </form>
  );
}
