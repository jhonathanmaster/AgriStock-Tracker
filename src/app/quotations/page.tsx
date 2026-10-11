
"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import Image from 'next/image';
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
  FileText,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  User,
  Phone,
  Mail,
  MapPin,
  Fingerprint,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Printer,
  ListPlus,
  Truck,
  Coins,
  History as HistoryIcon,
  Globe,
  Calculator,
  DollarSign,
  Send,
  Loader2,
  TrendingUp,
  ClipboardList,
  MessageSquare,
  Keyboard,
  FileCheck,
  Image as LucideImage,
  Upload,
  ZoomIn,
  CheckCircle2,
  XCircle
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
import { Quotation, UnitType, Customer, QuotationItem, QuotationCollection, QuotationImportTracking } from '@/lib/types';
import { LoadingScreen } from '@/components/LoadingScreen';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { sendSimulationEmail } from '@/server/email/send-simulation-email';
import { sendQuotationEmail } from '@/server/email/send-quotation-email';
import { sendCollectionReceiptEmail } from '@/server/email/send-collection-receipt-email';
import { cn } from '@/lib/utils';

type SortConfig = {
  key: keyof Quotation | 'customerName';
  direction: 'asc' | 'desc' | null;
};

interface CalcItem {
  productName: string;
  specifications: string;
  imageUrl?: string;
  quantity: number;
  usdPrice: number;
  trm: number;
  legalPerc: number;
  nationalPerc: number;
  transportPerc: number;
  profitPerc: number;
  unitCostCop: number;
  total: number;
}

export default function QuotationsPage() {
  const { 
    quotations, 
    quotationCollections,
    quotationImportTrackings,
    products, 
    customers,
    addQuotation, 
    updateQuotation,
    deleteQuotation, 
    addQuotationCollection,
    updateQuotationCollection,
    deleteQuotationCollection,
    addQuotationImportTracking,
    deleteQuotationImportTracking,
    saveCustomer,
    convertQuantity,
    companyInfo,
    isLoading,
    isAdmin
  } = useAgriStock();
  
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isSendingSim, setIsSendingSim] = useState(false);
  const [isSendingQuotation, setIsSendingQuotation] = useState<string | null>(null);
  const [isSendingReceipt, setIsSendingReceipt] = useState<string | null>(null);
  const [simRecipientEmail, setSimRecipientEmail] = useState('');
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);
  const [viewingQuotation, setViewingQuotation] = useState<Quotation | null>(null);
  const [managingCollectionsFor, setManagingCollectionsFor] = useState<Quotation | null>(null);
  const [managingImportFor, setManagingImportFor] = useState<Quotation | null>(null);
  const [quotationToDelete, setQuotationToDelete] = useState<Quotation | null>(null);
  const [imageToPreview, setImageToPreview] = useState<string | null>(null);

  const [newCollectionAmount, setNewCollectionAmount] = useState('');
  const [newCollectionDate, setNewCollectionDate] = useState('');
  const [newCollectionNotes, setNewCollectionNotes] = useState('');
  const [editingCollectionId, setEditingCollectionId] = useState<string | null>(null);

  const [newImportStatus, setNewImportStatus] = useState('');
  const [newImportDate, setNewImportDate] = useState('');
  const [newImportNotes, setNewImportNotes] = useState('');

  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [formItems, setFormItems] = useState<QuotationItem[]>([]);
  
  const [newItemProductId, setNewItemProductId] = useState('');
  const [newItemCustomName, setNewItemCustomName] = useState('');
  const [newItemQty, setNewItemQty] = useState('1');
  const [newItemUnit, setNewItemUnit] = useState<UnitType>('kilos');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemSpecs, setNewItemSpecs] = useState('');
  const [newItemImageUrl, setNewItemImageUrl] = useState('');
  
  const itemImageInputRef = useRef<HTMLInputElement>(null);
  const calcImageInputRef = useRef<HTMLInputElement>(null);

  const [calcItems, setCalcItems] = useState<CalcItem[]>([]);
  const [calcProductName, setCalcProductName] = useState('');
  const [calcSpecifications, setCalcSpecifications] = useState('');
  const [calcImageUrl, setCalcImageUrl] = useState('');
  const [calcQty, setCalcQty] = useState('1');
  const [calcUsdPrice, setCalcUsdPrice] = useState('');
  const [calcTrm, setCalcTrm] = useState('4000'); 
  const [calcLegalPerc, setCalcLegalPerc] = useState('10');
  const [calcNationalPerc, setCalcNationalPerc] = useState('7');
  const [calcTransportPerc, setCalcTransportPerc] = useState('13');
  const [calcProfitPerc, setCalcProfitPerc] = useState('20');

  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'date', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  const [formData, setFormData] = useState({
    date: '',
    estimatedDeliveryDate: '',
    customerId: '', 
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    customerAddress: '',
    identificationNumber: '',
    notes: '',
    approved: 'no' as 'si' | 'no'
  });

  useEffect(() => {
    setMounted(true);
    if (!isUserLoading && !user) {
      router.push('/login');
    }
    const today = new Date().toISOString().split('T')[0];
    setFormData(prev => ({ ...prev, date: prev.date || today }));
    setNewCollectionDate(today);
    setNewImportDate(today);
  }, [user, isUserLoading, router]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, itemsPerPage, sortConfig]);

  const handleSort = (key: SortConfig['key']) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        if (prev.direction === 'asc') return { key, direction: 'desc' };
        if (prev.direction === 'desc') return { key: 'date', direction: 'desc' };
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
      customerPhone: c.phone,
      customerEmail: c.email || prev.customerEmail,
      customerAddress: c.address || prev.customerAddress,
      identificationNumber: c.identificationNumber || prev.identificationNumber
    }));
    setCustomerSearchQuery('');
    toast({ title: "Cliente Seleccionado" });
  };

  const handleItemImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 800 * 1024) {
        toast({ variant: "destructive", title: "Imagen pesada", description: "Elige una imagen menor a 800KB." });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewItemImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCalcImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 800 * 1024) {
        toast({ variant: "destructive", title: "Imagen pesada", description: "Elige una imagen menor a 800KB." });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setCalcImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddItem = () => {
    const product = products.find(p => p.id === newItemProductId);
    const name = product ? product.name : newItemCustomName.trim();
    
    if (!name || !newItemQty || parseFloat(newItemQty) <= 0) {
      toast({ variant: "destructive", title: "Error", description: "Debe indicar un producto y una cantidad válida." });
      return;
    }

    const qty = parseFloat(newItemQty);
    const price = parseFloat(newItemPrice) || (product ? product.salePrice : 0);
    
    const total = product 
      ? convertQuantity(qty, newItemUnit, product.mainUnit) * price 
      : qty * price;

    const newItem: QuotationItem = {
      productId: product ? product.id : `manual-${Math.random().toString(36).substring(7)}`,
      productName: name,
      specifications: newItemSpecs.trim(),
      imageUrl: newItemImageUrl || (product?.imageUrl || ''),
      quantity: qty,
      unit: newItemUnit,
      price: price,
      total: total
    };

    setFormItems(prev => [...prev, newItem]);
    
    setNewItemProductId('');
    setNewItemCustomName('');
    setNewItemQty('1');
    setNewItemPrice('');
    setNewItemSpecs('');
    setNewItemImageUrl('');
  };

  const handleAddCalcItem = () => {
    if (!calcProductName || !calcQty || !calcUsdPrice || !calcTrm) {
      toast({ variant: "destructive", title: "Error", description: "Complete los campos básicos del producto." });
      return;
    }

    const qty = parseFloat(calcQty);
    const usdPrice = parseFloat(calcUsdPrice);
    const trm = parseFloat(calcTrm);
    const legal = parseFloat(calcLegalPerc) || 0;
    const national = parseFloat(calcNationalPerc) || 0;
    const transport = parseFloat(calcTransportPerc) || 0;
    const profit = parseFloat(calcProfitPerc) || 0;

    const baseCop = usdPrice * trm;
    const landedCostCop = baseCop * (1 + (legal + national + transport) / 100);
    const unitPriceWithProfit = landedCostCop * (1 + profit / 100);
    const total = unitPriceWithProfit * qty;

    const newItem: CalcItem = {
      productName: calcProductName,
      specifications: calcSpecifications,
      imageUrl: calcImageUrl,
      quantity: qty,
      usdPrice,
      trm,
      legalPerc: legal,
      nationalPerc: national,
      transportPerc: transport,
      profitPerc: profit,
      unitCostCop: unitPriceWithProfit,
      total
    };

    setCalcItems(prev => [...prev, newItem]);
    setCalcProductName('');
    setCalcSpecifications('');
    setCalcImageUrl('');
    setCalcQty('1');
    setCalcUsdPrice('');
  };

  const handleRemoveItem = (index: number) => {
    setFormItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveCalcItem = (index: number) => {
    setCalcItems(prev => prev.filter((_, i) => i !== index));
  };

  const currentTotalValue = useMemo(() => formItems.reduce((sum, item) => sum + item.total, 0), [formItems]);
  const currentCalcTotal = useMemo(() => calcItems.reduce((sum, item) => sum + item.total, 0), [calcItems]);

  const filteredQuotations = useMemo(() => {
    let list = quotations.filter(q => {
      const searchString = `${q.customerName || ''} ${q.notes || ''}`.toLowerCase();
      const matchesSearch = searchString.includes(searchTerm.toLowerCase());
      return matchesSearch;
    });

    if (sortConfig.direction) {
      list = [...list].sort((a, b) => {
        let valA = a[sortConfig.key as keyof Quotation] ?? '';
        let valB = b[sortConfig.key as keyof Quotation] ?? '';
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return list;
  }, [quotations, searchTerm, sortConfig]);

  const quotationTotalsSummary = useMemo(() => {
    return filteredQuotations.reduce((acc, q) => {
      const collected = (quotationCollections || []).filter(coll => coll.quotationId === q.id).reduce((s, c) => s + (c.amount || 0), 0);
      acc.totalValue += q.totalValue;
      acc.totalCollected += collected;
      acc.totalPending += (q.totalValue - collected);
      if (q.approved === 'si') {
        acc.totalApprovedValue += q.totalValue;
      }
      return acc;
    }, { totalValue: 0, totalCollected: 0, totalPending: 0, totalApprovedValue: 0 });
  }, [filteredQuotations, quotationCollections]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (formItems.length === 0 || !formData.customerName || !formData.customerPhone) {
      toast({ variant: "destructive", title: "Error", description: "Completa los datos del cliente y agrega al menos un producto." });
      return;
    }

    saveCustomer({
      id: formData.customerId || undefined,
      name: formData.customerName,
      phone: formData.customerPhone,
      email: formData.customerEmail || '',
      address: formData.customerAddress || '',
      identificationNumber: formData.identificationNumber || ''
    });

    const quotationData: Omit<Quotation, 'id'> = {
      customerId: formData.customerId || '',
      customerName: formData.customerName,
      customerPhone: formData.customerPhone,
      customerEmail: formData.customerEmail || '',
      customerAddress: formData.customerAddress || '',
      customerIdentification: formData.identificationNumber || '',
      items: formItems,
      totalValue: currentTotalValue,
      date: formData.date ? new Date(formData.date).toISOString() : new Date().toISOString(),
      estimatedDeliveryDate: formData.estimatedDeliveryDate || null,
      notes: formData.notes || '',
      approved: formData.approved
    };

    if (editingQuotation) {
      updateQuotation(editingQuotation.id, quotationData);
      toast({ title: "Cotización Actualizada" });
    } else {
      addQuotation(quotationData);
      toast({ title: "Cotización Registrada" });
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

    if (editingCollectionId) {
      updateQuotationCollection(editingCollectionId, {
        amount: amount,
        date: new Date(newCollectionDate).toISOString(),
        notes: newCollectionNotes || ''
      });
      setEditingCollectionId(null);
      toast({ title: "Abono Actualizado" });
    } else {
      addQuotationCollection({
        quotationId: managingCollectionsFor.id,
        amount: amount,
        date: new Date(newCollectionDate).toISOString(),
        notes: newCollectionNotes || ''
      });
      toast({ title: "Abono Registrado" });
    }

    setNewCollectionAmount('');
    setNewCollectionNotes('');
    setNewCollectionDate(new Date().toISOString().split('T')[0]);
  };

  const handleEditCollection = (coll: QuotationCollection) => {
    setEditingCollectionId(coll.id);
    setNewCollectionAmount(coll.amount.toString());
    setNewCollectionDate(coll.date.split('T')[0]);
    setNewCollectionNotes(coll.notes || '');
  };

  const cancelEditCollection = () => {
    setEditingCollectionId(null);
    setNewCollectionAmount('');
    setNewCollectionNotes('');
    setNewCollectionDate(new Date().toISOString().split('T')[0]);
  };

  const handleAddImportTracking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!managingImportFor || !newImportStatus || !newImportDate) return;

    addQuotationImportTracking({
      quotationId: managingImportFor.id,
      status: newImportStatus,
      date: new Date(newImportDate).toISOString(),
      notes: newImportNotes || ''
    });

    setNewImportStatus('');
    setNewImportNotes('');
    toast({ title: "Seguimiento Registrado" });
  };

  const getCollectionsForQuotation = (quotationId: string) => {
    return (quotationCollections || []).filter(c => c.quotationId === quotationId);
  };

  const getImportTrackingsForQuotation = (quotationId: string) => {
    return (quotationImportTrackings || []).filter(t => t.quotationId === quotationId).sort((a,b) => b.date.localeCompare(a.date));
  };

  const getTotalCollected = (quotationId: string) => {
    return getCollectionsForQuotation(quotationId).reduce((sum, c) => sum + (c.amount || 0), 0);
  };

  const resetForm = () => {
    setFormData({ 
      date: new Date().toISOString().split('T')[0],
      estimatedDeliveryDate: '',
      customerId: '',
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      customerAddress: '',
      identificationNumber: '',
      notes: '',
      approved: 'no'
    });
    setFormItems([]);
    setEditingQuotation(null);
    setCustomerSearchQuery('');
    setNewItemImageUrl('');
  };

  const handleEdit = (quotation: Quotation) => {
    setEditingQuotation(quotation);
    setFormItems(quotation.items || []);
    setFormData({
      date: quotation.date ? quotation.date.split('T')[0] : new Date().toISOString().split('T')[0],
      estimatedDeliveryDate: quotation.estimatedDeliveryDate || '',
      customerId: quotation.customerId || '',
      customerName: quotation.customerName,
      customerPhone: quotation.customerPhone,
      customerEmail: quotation.customerEmail || '',
      customerAddress: quotation.customerAddress || '',
      identificationNumber: quotation.customerIdentification || '',
      notes: quotation.notes || '',
      approved: quotation.approved || 'no'
    });
    setIsCreateOpen(true);
  };

  const confirmDelete = () => {
    if (quotationToDelete) {
      deleteQuotation(quotationToDelete.id);
      const collections = getCollectionsForQuotation(quotationToDelete.id);
      collections.forEach(c => deleteQuotationCollection(c.id));
      const trackings = getImportTrackingsForQuotation(quotationToDelete.id);
      trackings.forEach(t => deleteQuotationImportTracking(t.id));
      toast({ title: "Cotización Eliminada" });
      setQuotationToDelete(null);
    }
  };

  const handlePrintQuotation = (q: Quotation) => {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      toast({
        variant: "destructive",
        title: "Navegador bloqueado",
        description: "Por favor permite las ventanas emergentes para poder imprimir la cotización."
      });
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cotización - ${q.customerName}</title>
          <style>
            @page { size: auto; margin: 15mm; }
            body { font-family: sans-serif; padding: 20px; color: #333; line-height: 1.5; margin: 0; }
            header { display: flex; justify-content: space-between; border-bottom: 3px solid #4D7C0F; padding-bottom: 20px; margin-bottom: 30px; align-items: flex-start; }
            .company-info { flex: 1; }
            .logo { font-size: 24px; font-weight: 900; color: #4D7C0F; text-transform: uppercase; line-height: 1.1; }
            .logo-img { max-height: 60px; margin-bottom: 10px; display: block; }
            .company-details { font-size: 10px; color: #666; text-transform: none; font-weight: normal; margin-top: 5px; }
            .quotation-info { text-align: right; }
            .quotation-info h1 { margin: 0; color: #4D7C0F; font-size: 22px; }
            .client-info { margin-bottom: 30px; background: #F6F8ED; padding: 25px; border-radius: 12px; border: 1px solid #E5E7EB; }
            .client-info h3 { margin: 0 0 10px 0; color: #4D7C0F; font-size: 14px; text-transform: uppercase; border-bottom: 1px solid #D1D5DB; padding-bottom: 5px; }
            .client-grid { display: grid; grid-template-cols: 1fr 1fr; gap: 10px; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { text-align: left; padding: 12px; border-bottom: 2px solid #E5E7EB; background: #F9FAFB; text-transform: uppercase; font-size: 12px; color: #4D7C0F; }
            td { padding: 12px; border-bottom: 1px solid #F3F4F6; font-size: 14px; vertical-align: top; }
            .item-image { width: 50px; height: 50px; object-fit: cover; border-radius: 4px; border: 1px solid #eee; margin-right: 10px; float: left; }
            .text-right { text-align: right; }
            .totals { margin-top: 20px; text-align: right; }
            .total-box { display: inline-block; padding: 15px 30px; background: #4D7C0F; color: white; border-radius: 8px; font-size: 20px; font-weight: 900; }
            .notes { margin-top: 40px; font-size: 12px; color: #666; border-top: 1px dashed #ccc; padding-top: 20px; }
            .specs { font-size: 10px; color: #666; font-style: italic; margin-top: 4px; display: block; clear: both; }
            .signature-block { margin-top: 50px; }
            .signature-img { max-height: 60px; max-width: 200px; display: block; margin-bottom: 5px; }
            .rep-name { font-weight: bold; font-size: 14px; }
            .rep-pos { font-size: 12px; color: #666; text-transform: uppercase; }
            footer { margin-top: 60px; text-align: center; font-size: 10px; color: #999; border-top: 1px solid #eee; padding-top: 20px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <header>
            <div class="company-info">
              ${companyInfo.logoUrl ? `<img src="${companyInfo.logoUrl}" alt="Logo" class="logo-img" />` : ''}
              <div class="logo">${companyInfo.name || 'GeiaTienda Tracker'}</div>
              <div class="company-details">
                ${companyInfo.nit ? `NIT: ${companyInfo.nit}<br/>` : ''}
                ${companyInfo.address ? `${companyInfo.address}<br/>` : ''}
                ${companyInfo.phone ? `Tel: ${companyInfo.phone}<br/>` : ''}
                ${companyInfo.email ? `Email: ${companyInfo.email}` : ''}
              </div>
            </div>
            <div class="quotation-info">
              <h1>Propuesta Comercial</h1>
              <p><strong>Fecha:</strong> ${new Date(q.date).toLocaleDateString()}</p>
              ${q.estimatedDeliveryDate ? `<p><strong>Entrega Est.:</strong> ${new Date(q.estimatedDeliveryDate + 'T00:00:00').toLocaleDateString()}</p>` : ''}
              <p><strong>Ref:</strong> #${q.id.substring(0,8).toUpperCase()}</p>
            </div>
          </header>
          
          <div class="client-info">
            <h3>Datos del Cliente</h3>
            <div class="client-grid">
              <div><strong>Nombre:</strong> ${q.customerName}</div>
              <div><strong>Teléfono:</strong> ${q.customerPhone}</div>
              <div><strong>Email:</strong> ${q.customerEmail || 'N/A'}</div>
              ${q.customerIdentification ? `<div><strong>ID Fiscal:</strong> ${q.customerIdentification}</div>` : ''}
            </div>
            ${q.customerAddress ? `<div style="margin-top:10px"><strong>Dirección:</strong> ${q.customerAddress}</div>` : ''}
          </div>

          <table>
            <thead>
              <tr>
                <th>Descripción del Producto / Especificaciones</th>
                <th class="text-right">Cant.</th>
                <th>Unidad</th>
                <th class="text-right">Precio Unit.</th>
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${q.items.map(item => `
                <tr>
                  <td>
                    ${item.imageUrl ? `<img src="${item.imageUrl}" class="item-image" />` : ''}
                    <div style="font-weight: bold">${item.productName}</div>
                    ${item.specifications ? `<span class="specs">${item.specifications}</span>` : ''}
                  </td>
                  <td class="text-right">${item.quantity}</td>
                  <td>${item.unit}</td>
                  <td class="text-right">$${item.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td class="text-right" style="font-weight: bold">$${item.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals">
            <div class="total-box">
              TOTAL PROPUESTA: $${q.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>

          ${q.notes ? `<div class="notes"><strong>Notas Adicionales:</strong><br/><p style="white-space: pre-wrap;">${q.notes}</p></div>` : ''}
          
          <div class="signature-block">
            <p style="font-size: 12px; margin-bottom: 10px;">Cordialmente,</p>
            ${companyInfo.signatureUrl ? `<img src="${companyInfo.signatureUrl}" alt="Firma" class="signature-img" />` : ''}
            <div class="rep-name">${companyInfo.representativeName || 'Gerencia Comercial'}</div>
            <div class="rep-pos">${companyInfo.representativePosition || 'Representante Legal'}</div>
          </div>

          <footer>
            <p>Esta cotización tiene una validez de 8 días calendario a partir de la fecha de emisión.</p>
            <p>${companyInfo.name || 'GeiaTienda'} - ${companyInfo.address || 'Borrero Ayerbe, Dagua - Valle del Cauca'}. Tel: ${companyInfo.phone || '321 913 0614'}</p>
          </footer>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 500);
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleSendSimulationEmail = async () => {
    if (!simRecipientEmail || calcItems.length === 0) {
      toast({ variant: "destructive", title: "Error", description: "Define un correo y agrega ítems a la simulación." });
      return;
    }

    setIsSendingSim(true);
    try {
      const result = await sendSimulationEmail({
        recipientEmail: simRecipientEmail,
        companyName: companyInfo.name || 'GeiaTienda',
        logoUrl: companyInfo.logoUrl,
        signatureUrl: companyInfo.signatureUrl,
        representativeName: companyInfo.representativeName,
        representativePosition: companyInfo.representativePosition,
        items: calcItems,
        totalValue: currentCalcTotal
      });

      if (result.success) {
        toast({ title: "Simulación Enviada", description: `El desglose ha sido enviado a ${simRecipientEmail}.` });
        setSimRecipientEmail('');
      } else {
        toast({ variant: "destructive", title: "Error de envío", description: result.error });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Fallo crítico", description: "Ocurrió un error al intentar enviar el correo." });
    } finally {
      setIsSendingSim(false);
    }
  };

  const handleSendQuotationEmail = async (q: Quotation) => {
    if (!q.customerEmail) {
      toast({ 
        variant: "destructive", 
        title: "Correo Faltante", 
        description: "Esta cotización no tiene un correo de cliente asociado." 
      });
      return;
    }

    setIsSendingQuotation(q.id);
    try {
      const result = await sendQuotationEmail({
        recipientEmail: q.customerEmail,
        adminEmail: 'jhonathanmaster@gmail.com',
        customerName: q.customerName,
        quotationId: q.id,
        items: q.items,
        totalValue: q.totalValue,
        notes: q.notes,
        companyName: companyInfo.name || 'GeiaTienda',
        logoUrl: companyInfo.logoUrl,
        signatureUrl: companyInfo.signatureUrl,
        representativeName: companyInfo.representativeName,
        representativePosition: companyInfo.representativePosition
      });

      if (result.success) {
        toast({ 
          title: "Cotización Enviada", 
          description: `La propuesta comercial ha sido enviada a ${q.customerEmail} con copia a administración.` 
        });
      } else {
        toast({ 
          variant: "destructive", 
          title: "Error de envío", 
          description: result.error 
        });
      }
    } catch (error) {
      console.error("Error al enviar cotización:", error);
      toast({ 
        variant: "destructive", 
        title: "Error Crítico", 
        description: "No se pudo procesar el envío del correo en este momento." 
      });
    } finally {
      setIsSendingQuotation(null);
    }
  };

  const handleSendReceiptEmail = async (q: Quotation, coll: QuotationCollection) => {
    if (!q.customerEmail) {
      toast({ 
        variant: "destructive", 
        title: "Correo Faltante", 
        description: "El cliente no tiene un correo registrado para recibir el recibo." 
      });
      return;
    }

    const totalPaid = getTotalCollected(q.id);
    const balance = q.totalValue - totalPaid;

    setIsSendingReceipt(coll.id);
    try {
      const result = await sendCollectionReceiptEmail({
        recipientEmail: q.customerEmail,
        customerName: q.customerName,
        amount: coll.amount,
        pendingBalance: balance,
        date: coll.date,
        quotationId: q.id,
        notes: coll.notes,
        companyName: companyInfo.name || 'GeiaTienda',
        logoUrl: companyInfo.logoUrl,
        signatureUrl: companyInfo.signatureUrl,
        representativeName: companyInfo.representativeName,
        representativePosition: companyInfo.representativePosition
      });

      if (result.success) {
        toast({ 
          title: "Recibo Enviado", 
          description: `El comprobante ha sido enviado a ${q.customerEmail}.` 
        });
      } else {
        toast({ 
          variant: "destructive", 
          title: "Error de envío", 
          description: result.error 
        });
      }
    } catch (error) {
      console.error("Error al enviar recibo:", error);
      toast({ 
        variant: "destructive", 
        title: "Error Crítico", 
        description: "No se pudo procesar el envío del recibo." 
      });
    } finally {
      setIsSendingReceipt(null);
    }
  };

  const paginatedQuotations = filteredQuotations.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredQuotations.length / itemsPerPage);

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
              <FileText className="w-8 h-8 text-primary" />
              Generador de Cotizaciones
            </h1>
            <p className="text-muted-foreground">Crea presupuestos detallados para tus clientes</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsCalculatorOpen(true)} className="gap-2 border-primary/20 text-primary">
            <Calculator className="w-4 h-4" />
            Calculadora
          </Button>
          <Button onClick={() => { resetForm(); setIsCreateOpen(true); }} className="gap-2 shadow-sm">
            <Plus className="w-4 h-4" />
            Nueva Cotización
          </Button>
        </div>
      </header>

      <div className="flex flex-col space-y-4 bg-white p-6 rounded-xl border border-border shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-end">
          <div className="relative lg:col-span-2">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Buscar Cotización</Label>
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

          <Button variant="outline" className="h-11 gap-2 border-primary/20" onClick={() => { setSearchTerm(''); }}>
            <X className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-bold uppercase tracking-tight">Limpiar Filtros</span>
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-secondary/20">
            <TableRow>
              <TableHead className="cursor-pointer hover:bg-secondary/30 transition-colors" onClick={() => handleSort('date')}>
                <div className="flex items-center">Fecha <SortIcon column="date" /></div>
              </TableHead>
              <TableHead>Aprobado</TableHead>
              <TableHead className="cursor-pointer hover:bg-secondary/30 transition-colors" onClick={() => handleSort('customerName')}>
                <div className="flex items-center">Cliente <SortIcon column="customerName" /></div>
              </TableHead>
              <TableHead>Productos</TableHead>
              <TableHead className="text-right">Saldo Pend.</TableHead>
              <TableHead className="text-right cursor-pointer hover:bg-secondary/30 transition-colors" onClick={() => handleSort('totalValue')}>
                <div className="flex items-center justify-end">Valor Propuesta <SortIcon column="totalValue" /></div>
              </TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedQuotations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  No hay cotizaciones registradas.
                </TableCell>
              </TableRow>
            ) : paginatedQuotations.map(q => {
              const totalCollected = getTotalCollected(q.id);
              const balance = q.totalValue - totalCollected;
              const isSending = isSendingQuotation === q.id;

              return (
                <TableRow key={q.id}>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(q.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {q.approved === 'si' ? (
                      <Badge variant="outline" className="gap-1 text-green-600 border-green-600 bg-green-50"><CheckCircle2 className="w-3 h-3" /> Sí</Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 text-muted-foreground border-muted-foreground/30 bg-muted/5"><XCircle className="w-3 h-3" /> No</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-xs font-bold text-primary">{q.customerName}</div>
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Phone className="w-2.5 h-2.5" /> {q.customerPhone}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[10px]">{q.items?.length || 0} ítems</Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs font-bold text-destructive">
                    ${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right font-black text-accent">
                    ${q.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className={cn("h-8 w-8 text-primary hover:bg-primary/5", isSending && "animate-pulse")}
                        title="Enviar por Correo" 
                        onClick={() => handleSendQuotationEmail(q)}
                        disabled={isSending}
                      >
                        {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-orange-600 hover:bg-orange-50" title="Seguimiento de Importación" onClick={() => setManagingImportFor(q)}>
                        <Truck className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:bg-green-50" title="Abonos / Recaudos" onClick={() => {
                        setEditingCollectionId(null);
                        setManagingCollectionsFor(q);
                      }}>
                        <Coins className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-500 hover:bg-blue-50" title="Imprimir" onClick={() => handlePrintQuotation(q)}>
                        <Printer className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-500 hover:bg-blue-50" title="Detalles" onClick={() => setViewingQuotation(q)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-primary hover:bg-primary/5" title="Editar" onClick={() => handleEdit(q)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" title="Eliminar" onClick={() => setQuotationToDelete(q)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
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
                  {[5, 10, 20, 50].map(n => (
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

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-[10px] uppercase font-black text-primary">Valor Total Propuestas (Filtrado)</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-black text-primary">
              ${quotationTotalsSummary.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-accent/5 border-accent/20">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-[10px] uppercase font-black text-accent">Total Propuestas Aprobadas</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-black text-accent">
              ${quotationTotalsSummary.totalApprovedValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-[10px] uppercase font-black text-green-600">Total Abonos Recibidos</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-black text-green-700">
              ${quotationTotalsSummary.totalCollected.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-destructive/5 border-destructive/20">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-[10px] uppercase font-black text-destructive">Saldo Total Pendiente</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-black text-destructive">
              ${quotationTotalsSummary.totalPending.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
      </section>

      <Dialog open={isCalculatorOpen} onOpenChange={setIsCalculatorOpen}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-primary" />
              Simulador de Costos de Importación
            </DialogTitle>
            <DialogDescription>Realiza simulaciones detalladas convirtiendo precios USD a COP incluyendo gastos logísticos y utilidad.</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-muted/30 p-6 rounded-2xl border border-border">
              <div className="md:col-span-2 space-y-4">
                <h4 className="text-[10px] uppercase font-black text-primary tracking-widest px-1">1. Producto y Base Monetaria</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nombre del Producto</Label>
                    <Input 
                      placeholder="Escriba el nombre..." 
                      value={calcProductName} 
                      onChange={e => setCalcProductName(e.target.value)} 
                      className="bg-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label>Cantidad</Label>
                      <Input type="number" step="0.01" value={calcQty} onChange={e => setCalcQty(e.target.value)} className="bg-white font-bold" />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5"><DollarSign className="w-3 h-3" /> TRM Actual</Label>
                      <Input type="number" step="0.01" value={calcTrm} onChange={e => setCalcTrm(e.target.value)} className="bg-white font-black text-accent" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground font-bold flex items-center gap-2 uppercase text-[10px] tracking-widest">
                      <ClipboardList className="w-3.5 h-3.5" />
                      Especificaciones Técnicas
                    </Label>
                    <Textarea 
                      placeholder="Detalles técnicos, materiales, dimensiones..."
                      value={calcSpecifications}
                      onChange={e => setCalcSpecifications(e.target.value)}
                      className="bg-white min-h-[100px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                      <LucideImage className="w-3 h-3 text-primary" />
                      Imagen del Ítem
                    </Label>
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm" 
                          className="h-9 flex-1 border-dashed bg-white text-[10px]"
                          onClick={() => calcImageInputRef.current?.click()}
                        >
                          <Upload className="w-3 h-3 mr-1" /> {calcImageUrl ? 'CAMBIAR' : 'CARGAR FOTO'}
                        </Button>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          ref={calcImageInputRef} 
                          onChange={handleCalcImageChange} 
                        />
                        {calcImageUrl && (
                          <div className="relative h-9 w-9 rounded border overflow-hidden shrink-0 bg-white">
                            <Image src={calcImageUrl} alt="Preview" fill className="object-cover cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setImageToPreview(calcImageUrl)} unoptimized />
                            <button type="button" className="absolute top-0 right-0 bg-destructive text-white p-0.5" onClick={() => setCalcImageUrl('')}><X className="w-2 h-2" /></button>
                          </div>
                        )}
                      </div>
                      {!calcImageUrl && (
                        <div className="h-[60px] bg-white border rounded-lg border-dashed flex flex-col items-center justify-center opacity-40">
                          <LucideImage className="w-5 h-5 mb-1" />
                          <span className="text-[8px] font-bold">SIN IMAGEN</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-primary font-bold">Valor Unitario en Dólares (USD)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      type="number" 
                      step="0.01" 
                      value={calcUsdPrice} 
                      onChange={e => setCalcUsdPrice(e.target.value)} 
                      placeholder="0.00" 
                      className="pl-9 h-12 text-lg font-black bg-white"
                    />
                  </div>
                  {calcUsdPrice && calcTrm && (
                    <div className="text-[10px] text-muted-foreground mt-1 px-1 space-y-0.5 grid grid-cols-2 gap-x-4">
                      <p>Equivale a: <span className="font-bold text-accent">${(parseFloat(calcUsdPrice) * parseFloat(calcTrm)).toLocaleString('en-US', { minimumFractionDigits: 2 })} COP</span> (Base)</p>
                      <p>+ Legalización: <span className="font-bold text-foreground">${(parseFloat(calcUsdPrice) * parseFloat(calcTrm) * (parseFloat(calcLegalPerc) || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })} COP</span></p>
                      <p>+ Nacionalización: <span className="font-bold text-foreground">${(parseFloat(calcUsdPrice) * parseFloat(calcTrm) * (parseFloat(calcNationalPerc) || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })} COP</span></p>
                      <p>+ Transporte: <span className="font-bold text-foreground">${(parseFloat(calcUsdPrice) * parseFloat(calcTrm) * (parseFloat(calcNationalPerc) || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })} COP</span></p>
                      <p className="col-span-2 mt-1 border-t pt-1">
                        + Ganancia Proyectada: <span className="font-bold text-green-600">${(
                          (parseFloat(calcUsdPrice) * parseFloat(calcTrm) * (1 + (parseFloat(calcLegalPerc) + parseFloat(calcNationalPerc) + parseFloat(calcTransportPerc)) / 100)) * (parseFloat(calcProfitPerc) / 100)
                        ).toLocaleString('en-US', { minimumFractionDigits: 2 })} COP</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] uppercase font-black text-primary tracking-widest px-1">2. Gastos y Utilidad (%)</h4>
                <div className="space-y-3 bg-white p-4 rounded-xl border border-border shadow-sm">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold">Costo Legalización % (min 10%)</Label>
                    <Input type="number" step="0.1" value={calcLegalPerc} onChange={e => setCalcLegalPerc(e.target.value)} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold">Gasto Nacionalización % (min 7%)</Label>
                    <Input type="number" step="0.1" value={calcNationalPerc} onChange={e => setCalcNationalPerc(e.target.value)} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold">Costo Transporte % (min 13%)</Label>
                    <Input type="number" step="0.1" value={calcTransportPerc} onChange={e => setCalcTransportPerc(e.target.value)} className="h-8 text-xs" />
                  </div>
                  <Separator className="my-2" />
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black text-green-700 uppercase flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> % Ganancia Aplicada
                    </Label>
                    <Input type="number" step="0.1" value={calcProfitPerc} onChange={e => setCalcProfitPerc(e.target.value)} className="h-8 text-xs border-green-200 bg-green-50/50" />
                  </div>
                </div>
              </div>
            </div>
            
            <button type="button" onClick={handleAddCalcItem} className="w-full h-12 bg-secondary text-secondary-foreground rounded-md font-bold shadow-md flex items-center justify-center gap-2 hover:bg-secondary/90"><ListPlus className="w-5 h-5" /> Agregar a la simulación</button>

            <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-16">Imagen</TableHead>
                    <TableHead>Producto / Specs</TableHead>
                    <TableHead className="text-right">USD</TableHead>
                    <TableHead className="text-right">Cant.</TableHead>
                    <TableHead className="text-right">Gastos %</TableHead>
                    <TableHead className="text-right">Utilidad %</TableHead>
                    <TableHead className="text-right">Precio Venta (COP)</TableHead>
                    <TableHead className="text-right">Total Simulado</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calcItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12 text-muted-foreground italic">
                        No hay ítems en la simulación. Defina costos y agregue productos arriba.
                      </TableCell>
                    </TableRow>
                  ) : calcItems.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="py-2">
                        {item.imageUrl ? (
                          <div className="relative h-10 w-10 rounded border overflow-hidden bg-white shadow-sm group cursor-pointer" onClick={() => setImageToPreview(item.imageUrl!)}>
                            <Image src={item.imageUrl} alt={item.productName} fill className="object-cover group-hover:opacity-80 transition-opacity" unoptimized />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                              <ZoomIn className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        ) : (
                          <div className="h-10 w-10 rounded border bg-muted/20 flex items-center justify-center text-muted-foreground/30"><LucideImage className="w-4 h-4" /></div>
                        )}
                      </TableCell>
                      <TableCell>
                        <p className="font-bold text-xs">{item.productName}</p>
                        {item.specifications && <p className="text-[9px] text-muted-foreground italic line-clamp-1">{item.specifications}</p>}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground font-mono">
                        ${item.usdPrice.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-xs font-bold">{item.quantity}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className="text-[9px] h-4">
                          {(item.legalPerc + item.nationalPerc + item.transportPerc).toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary" className="text-[9px] h-4 bg-green-100 text-green-700">
                          {item.profitPerc}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary text-xs">
                        ${item.unitCostCop.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-black text-primary text-xs">
                        ${item.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <button type="button" className="h-6 w-6 text-destructive flex items-center justify-center hover:bg-destructive/10 rounded-full" onClick={() => handleRemoveCalcItem(idx)}>
                          <X className="w-3 h-3" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-end gap-4 pt-4 border-t">
              <div className="space-y-4 flex-1">
                <h4 className="text-[10px] uppercase font-black text-muted-foreground tracking-widest px-1 flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5" /> Enviar Resultados por Correo
                </h4>
                <div className="flex gap-2 w-full max-w-md">
                  <div className="flex-1">
                    <Input 
                      type="email" 
                      placeholder="Correo del destinatario..." 
                      value={simRecipientEmail}
                      onChange={e => setSimRecipientEmail(e.target.value)}
                      className="bg-muted/30 border-primary/20 h-11"
                    />
                  </div>
                  <Button 
                    onClick={handleSendSimulationEmail} 
                    disabled={isSendingSim || calcItems.length === 0 || !simRecipientEmail}
                    className="h-11 gap-2 shadow-lg"
                  >
                    {isSendingSim ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Enviar
                  </Button>
                </div>
              </div>
              
              <div className="text-right bg-primary/5 p-6 rounded-2xl border border-primary/20 min-w-[300px]">
                <p className="text-[10px] uppercase font-black text-muted-foreground tracking-[0.2em] mb-1">Total General Proyectado (COP)</p>
                <p className="text-5xl font-black text-primary tracking-tighter">${currentCalcTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>
          
          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setIsCalculatorOpen(false)} className="w-full h-12">Cerrar Simulador</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateOpen} onOpenChange={(o) => { setIsCreateOpen(o); if(!o) resetForm(); }}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingQuotation ? 'Editar Cotización' : 'Nueva Cotización Formal'}</DialogTitle>
            <DialogDescription>Define los productos y precios especiales para la propuesta del cliente.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-8 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase text-muted-foreground flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" /> Datos del Cliente
                </h3>
                <div className="relative">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Buscar Cliente Registrado</Label>
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
                        <button key={c.id} type="button" className="w-full text-left px-4 py-2 transition-colors border-b last:border-0 hover:bg-primary/5" onClick={() => handleSelectCustomer(c)}>
                          <span className="font-bold text-sm text-primary">{c.name}</span>
                          <div className="text-[10px] text-muted-foreground">{c.phone}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nombre Completo *</Label>
                    <Input value={formData.customerName} onChange={e => setFormData({...formData, customerName: e.target.value})} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Teléfono *</Label>
                    <Input value={formData.customerPhone} onChange={e => setFormData({...formData, customerPhone: e.target.value})} required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Correo Electrónico</Label>
                    <Input type="email" value={formData.customerEmail} onChange={e => setFormData({...formData, customerEmail: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>ID Fiscal (CC/NIT)</Label>
                    <Input value={formData.identificationNumber} onChange={e => setFormData({...formData, identificationNumber: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Dirección</Label>
                  <Input value={formData.customerAddress} onChange={e => setFormData({...formData, customerAddress: e.target.value})} />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase text-muted-foreground flex items-center gap-2"><Package className="w-4 h-4" /> Ítems de la Propuesta</h3>
                <div className="grid grid-cols-1 gap-3 bg-muted/30 p-4 rounded-xl border border-border">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[9px] uppercase font-bold flex items-center gap-1">
                        <Package className="w-3 h-3 text-primary" />
                        Producto de Inventario
                      </Label>
                      <Select value={newItemProductId} onValueChange={(val) => {
                        setNewItemProductId(val);
                        setNewItemCustomName(''); 
                        const p = products.find(prod => prod.id === val);
                        if (p) {
                          setNewItemUnit(p.mainUnit as UnitType);
                          setNewItemPrice(p.salePrice.toString());
                          setNewItemImageUrl(p.imageUrl || '');
                        }
                      }}>
                        <SelectTrigger className="bg-white"><SelectValue placeholder="Seleccionar ítem..." /></SelectTrigger>
                        <SelectContent>
                          {sortedProductsForSelect.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[9px] uppercase font-bold flex items-center gap-1">
                        <Keyboard className="w-3 h-3 text-accent" />
                        O Nombre Manual (Nuevo)
                      </Label>
                      <Input 
                        placeholder="Escriba el nombre..." 
                        value={newItemCustomName} 
                        onChange={e => {
                          setNewItemCustomName(e.target.value);
                          if (e.target.value) {
                            setNewItemProductId('');
                            setNewItemImageUrl('');
                          }
                        }}
                        className="bg-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[9px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                      <ClipboardList className="w-3 h-3" />
                      Especificaciones por Producto
                    </Label>
                    <Textarea 
                      placeholder="Detalles técnicos para este ítem específico..."
                      value={newItemSpecs}
                      onChange={e => setNewItemSpecs(e.target.value)}
                      className="min-h-[60px] text-xs bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
                    <div className="space-y-1.5">
                      <Label className="text-[9px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                        <LucideImage className="w-3 h-3 text-primary" />
                        Imagen del Ítem
                      </Label>
                      <div className="flex gap-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm" 
                          className="h-9 w-full border-dashed bg-white text-[10px]"
                          onClick={() => itemImageInputRef.current?.click()}
                        >
                          <Upload className="w-3 h-3 mr-1" /> {newItemImageUrl ? 'CAMBIAR FOTO' : 'CARGAR FOTO'}
                        </Button>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          ref={itemImageInputRef} 
                          onChange={handleItemImageChange} 
                        />
                        {newItemImageUrl && (
                          <div className="relative h-9 w-9 rounded border overflow-hidden shrink-0 group cursor-pointer" onClick={() => setImageToPreview(newItemImageUrl)}>
                            <Image src={newItemImageUrl} alt="Preview" fill className="object-cover group-hover:opacity-80 transition-opacity" unoptimized />
                            <button type="button" className="absolute top-0 right-0 bg-destructive text-white p-0.5 z-10" onClick={(e) => { e.stopPropagation(); setNewItemImageUrl(''); }}><X className="w-2 h-2" /></button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 items-end">
                      <div className="flex-1 space-y-1">
                        <Label className="text-[9px] uppercase font-bold text-muted-foreground">Cant.</Label>
                        <Input type="number" step="0.01" value={newItemQty} onChange={e => setNewItemQty(e.target.value)} className="bg-white h-9" />
                      </div>
                      <div className="w-20 space-y-1">
                        <Label className="text-[9px] uppercase font-bold text-muted-foreground">Unidad</Label>
                        <Select value={newItemUnit} onValueChange={(v: UnitType) => setNewItemUnit(v)}>
                          <SelectTrigger className="bg-white h-9"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="kilos">Kg</SelectItem><SelectItem value="libras">Lb</SelectItem><SelectItem value="bultos">Bl</SelectItem><SelectItem value="unidades">Un</SelectItem></SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 items-end">
                    <div className="flex-1 space-y-1">
                      <Label className="text-[9px] uppercase font-bold text-primary">Precio Cotizado ($)</Label>
                      <Input type="number" step="0.01" value={newItemPrice} onChange={e => setNewItemPrice(e.target.value)} placeholder="0.00" className="bg-white font-bold h-10" />
                    </div>
                    <button type="button" onClick={handleAddItem} className="shrink-0 h-10 w-10 flex items-center justify-center bg-primary text-white rounded-md hover:bg-primary/90 transition-transform active:scale-95"><ListPlus className="w-4 h-4" /></button>
                  </div>
                </div>
                
                <div className="border rounded-lg overflow-hidden max-h-40 overflow-y-auto bg-muted/5">
                  <Table>
                    <TableBody>
                      {formItems.map((item, idx) => (
                        <TableRow key={idx} className="h-auto">
                          <TableCell className="py-2 w-12">
                            {item.imageUrl && (
                              <div className="relative h-10 w-10 rounded border overflow-hidden bg-white cursor-pointer group" onClick={() => setImageToPreview(item.imageUrl!)}>
                                <Image src={item.imageUrl} alt={item.productName} fill className="object-cover group-hover:opacity-80 transition-opacity" unoptimized />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 group-hover:opacity-100">
                                  <ZoomIn className="w-3 h-3 text-white" />
                                </div>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="py-2 text-xs">
                            <div className="font-bold flex items-center gap-1.5">
                              {item.productName}
                              {item.productId.startsWith('manual-') && <Badge variant="outline" className="text-[8px] h-3.5 px-1 bg-accent/5 text-accent border-accent/20">Manual</Badge>}
                            </div>
                            {item.specifications && <div className="text-[10px] text-muted-foreground italic mt-0.5 line-clamp-1">{item.specifications}</div>}
                          </TableCell>
                          <TableCell className="py-2 text-xs text-muted-foreground">
                            {item.quantity}{item.unit} x ${item.price.toLocaleString()}
                          </TableCell>
                          <TableCell className="py-2 text-xs text-right font-bold text-primary">${item.total.toLocaleString()}</TableCell>
                          <TableCell className="py-2 text-right">
                            <button 
                              type="button" 
                              onClick={(e) => { e.stopPropagation(); handleRemoveItem(idx); }} 
                              className="h-6 w-6 text-destructive hover:text-destructive/80 transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {formItems.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-4 text-[10px] text-muted-foreground italic">Agregue productos a la cotización.</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase text-muted-foreground flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-primary" /> Fecha y Estado
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fecha Emisión *</Label>
                    <Input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5"><Truck className="w-3 h-3 text-accent" /> Entrega Est.</Label>
                    <Input type="date" value={formData.estimatedDeliveryDate} onChange={e => setFormData({...formData, estimatedDeliveryDate: e.target.value})} />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>¿Propuesta Aprobada?</Label>
                    <Select value={formData.approved} onValueChange={(v: 'si' | 'no') => setFormData({...formData, approved: v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="si">Sí, Aprobada</SelectItem>
                        <SelectItem value="no">No, Pendiente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Observaciones / Validez</Label>
                  <textarea 
                    className="w-full min-h-[80px] p-3 rounded-md border border-input bg-background text-sm"
                    placeholder="Ej: Precios válidos por 8 días. Incluye transporte."
                    value={formData.notes}
                    onChange={e => setFormData({...formData, notes: e.target.value})}
                  />
                </div>
              </div>

              <div className="bg-primary/5 p-6 rounded-2xl flex flex-col justify-center border border-primary/10">
                <p className="text-sm font-black uppercase text-muted-foreground mb-2">VALOR TOTAL DE LA PROPUESTA:</p>
                <p className="text-5xl font-black text-primary">${currentTotalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
              <Button type="submit" size="lg" className="px-12 font-bold shadow-lg">{editingQuotation ? 'Guardar Cambios' : 'Generar Cotización'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
