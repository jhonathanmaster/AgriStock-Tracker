
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Expense } from '@/lib/types';
import { useAgriStock } from '@/lib/store';
import { Save, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ExpenseFormProps {
  onSave: (expense: Omit<Expense, 'id'>) => void;
  initialData?: Expense | null;
}

export function ExpenseForm({ onSave, initialData }: ExpenseFormProps) {
  const { suppliers, expenseCategories } = useAgriStock();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    date: initialData?.date || '',
    description: initialData?.description || '',
    category: initialData?.category || '',
    quantity: initialData?.quantity?.toString() || '1',
    unitValue: initialData?.unitValue?.toString() || '0',
    ivaPercentage: initialData?.ivaPercentage?.toString() || '19',
    supplierId: initialData?.supplierId || '',
    notes: initialData?.notes || ''
  });

  const [calculations, setCalculations] = useState({
    subTotal: 0,
    ivaValue: 0,
    total: 0
  });

  useEffect(() => {
    if (!initialData?.date && !formData.date) {
      setFormData(prev => ({ ...prev, date: new Date().toISOString().split('T')[0] }));
    }
  }, [initialData]);

  useEffect(() => {
    const qty = parseFloat(formData.quantity) || 0;
    const val = parseFloat(formData.unitValue) || 0;
    const ivaPerc = parseFloat(formData.ivaPercentage) || 0;

    const subTotal = qty * val;
    const ivaValue = subTotal * (ivaPerc / 100);
    const total = subTotal + ivaValue;

    setCalculations({ subTotal, ivaValue, total });
  }, [formData.quantity, formData.unitValue, formData.ivaPercentage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.description.trim()) {
      toast({ variant: "destructive", title: "Campo requerido", description: "Debes ingresar una descripción." });
      return;
    }
    if (!formData.category) {
      toast({ variant: "destructive", title: "Campo requerido", description: "Debes seleccionar una categoría." });
      return;
    }
    if (!formData.supplierId) {
      toast({ 
        variant: "destructive", 
        title: "Proveedor requerido", 
        description: "Para registrar un gasto es obligatorio asociar un proveedor." 
      });
      return;
    }

    onSave({
      date: formData.date,
      description: formData.description,
      category: formData.category,
      quantity: parseFloat(formData.quantity),
      unitValue: parseFloat(formData.unitValue),
      ivaPercentage: parseFloat(formData.ivaPercentage),
      ivaValue: calculations.ivaValue,
      subTotal: calculations.subTotal,
      total: calculations.total,
      supplierId: formData.supplierId, 
      notes: formData.notes
    });

    if (!initialData) {
      setFormData({
        date: new Date().toISOString().split('T')[0],
        description: '',
        category: '',
        quantity: '1',
        unitValue: '0',
        ivaPercentage: '19',
        supplierId: '',
        notes: ''
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="date">Fecha del Gasto *</Label>
          <Input 
            id="date" 
            type="date" 
            value={formData.date} 
            onChange={e => setFormData({...formData, date: e.target.value})} 
            required 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Clasificación / Categoría *</Label>
          <Select 
            value={formData.category} 
            onValueChange={(v) => setFormData({...formData, category: v})}
          >
            <SelectTrigger id="category">
              <SelectValue placeholder="Seleccione categoría" />
            </SelectTrigger>
            <SelectContent>
              {expenseCategories.map(cat => (
                <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descripción del Gasto *</Label>
        <Input 
          id="description" 
          placeholder="Ej: Pago de energía mes de Octubre" 
          value={formData.description} 
          onChange={e => setFormData({...formData, description: e.target.value})} 
          required 
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="quantity">Cantidad *</Label>
          <Input 
            id="quantity" 
            type="number" 
            step="0.01" 
            value={formData.quantity} 
            onChange={e => setFormData({...formData, quantity: e.target.value})} 
            required 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="unitValue">Valor Unitario ($) *</Label>
          <Input 
            id="unitValue" 
            type="number" 
            step="0.01" 
            value={formData.unitValue} 
            onChange={e => setFormData({...formData, unitValue: e.target.value})} 
            required 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ivaPercentage">IVA (%) *</Label>
          <Input 
            id="ivaPercentage" 
            type="number" 
            value={formData.ivaPercentage} 
            onChange={e => setFormData({...formData, ivaPercentage: e.target.value})} 
            required 
          />
        </div>
      </div>

      <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-bold text-muted-foreground">Sub-Total</span>
          <span className="text-lg font-bold">${calculations.subTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-bold text-muted-foreground">Valor IVA</span>
          <span className="text-lg font-bold text-accent">${calculations.ivaValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="flex flex-col bg-primary/10 p-2 rounded-lg items-center justify-center">
          <span className="text-[10px] uppercase font-bold text-primary">TOTAL NETO</span>
          <span className="text-xl font-black text-primary">${calculations.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="supplierId" className="flex items-center gap-2">
          Proveedor Relacionado * 
          {!formData.supplierId && <span className="text-[10px] text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Campo Obligatorio</span>}
        </Label>
        <Select 
          value={formData.supplierId} 
          onValueChange={(v) => setFormData({...formData, supplierId: v})}
        >
          <SelectTrigger id="supplierId" className={!formData.supplierId ? "border-destructive/50" : ""}>
            <SelectValue placeholder="Seleccione proveedor" />
          </SelectTrigger>
          <SelectContent>
            {suppliers.map(sup => (
              <SelectItem key={sup.id} value={sup.id}>{sup.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notas Adicionales</Label>
        <Textarea 
          id="notes" 
          placeholder="Detalles del pago, número de factura, etc..." 
          value={formData.notes} 
          onChange={e => setFormData({...formData, notes: e.target.value})} 
        />
      </div>

      <Button type="submit" className="w-full gap-2">
        <Save className="w-4 h-4" />
        {initialData ? 'Actualizar Gasto' : 'Registrar Gasto'}
      </Button>
    </form>
  );
}
