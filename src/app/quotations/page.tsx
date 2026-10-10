
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
  History,
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
  Share2
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
import { sendSimulationEmail } from '@/ai/flows/send-simulation-email';
import { sendQuotationEmail } from '@/ai/flows/send-quotation-email';
import { sendCollectionReceiptEmail } from '@/ai/flows/send-collection-receipt-email';
import { cn } from '@/lib/utils';

type SortConfig = {
  key: keyof Quotation | 'customerName';
  direction: 'asc' | 'desc' | null;
};

interface CalcItem {
  productName: string;
  specifications: string;
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

  const [calcItems, setCalcItems] = useState<CalcItem[]>([]);
  const [calcProductName, setCalcProductName] = useState('');
  const [calcSpecifications, setCalcSpecifications] = useState('');
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
    notes: ''
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
      notes: formData.notes || ''
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
      notes: '' 
    });
    setFormItems([]);
    setEditingQuotation(null);
    setCustomerSearchQuery('');
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
      notes: quotation.notes || ''
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
            .text-right { text-align: right; }
            .totals { margin-top: 20px; text-align: right; }
            .total-box { display: inline-block; padding: 15px 30px; background: #4D7C0F; color: white; border-radius: 8px; font-size: 20px; font-weight: 900; }
            .notes { margin-top: 40px; font-size: 12px; color: #666; border-top: 1px dashed #ccc; padding-top: 20px; }
            .specs { font-size: 10px; color: #666; font-style: italic; margin-top: 4px; display: block; }
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
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
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

                <div className="space-y-2">
                  <Label className="text-muted-foreground font-bold flex items-center gap-2 uppercase text-[10px] tracking-widest">
                    <ClipboardList className="w-3.5 h-3.5" />
                    Especificaciones Técnicas
                  </Label>
                  <Textarea 
                    placeholder="Detalles técnicos, materiales, dimensiones..."
                    value={calcSpecifications}
                    onChange={e => setCalcSpecifications(e.target.value)}
                    className="bg-white min-h-[80px]"
                  />
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
                      <p>+ Transporte: <span className="font-bold text-foreground">${(parseFloat(calcUsdPrice) * parseFloat(calcTrm) * (parseFloat(calcTransportPerc) || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })} COP</span></p>
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
            
            <Button onClick={handleAddCalcItem} className="w-full gap-2 h-12 text-base font-bold shadow-md" variant="secondary">
              <ListPlus className="w-5 h-5" />
              Agregar a la simulación
            </Button>

            <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
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
                      <TableCell colSpan={8} className="text-center py-12 text-muted-foreground italic">
                        No hay ítems en la simulación. Defina costos y agregue productos arriba.
                      </TableCell>
                    </TableRow>
                  ) : calcItems.map((item, idx) => (
                    <TableRow key={idx}>
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
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
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
                          if (e.target.value) setNewItemProductId(''); 
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

                  <div className="flex gap-2 items-end">
                    <div className="flex-1 space-y-1">
                      <Label className="text-[9px] uppercase font-bold text-muted-foreground">Cant.</Label>
                      <Input type="number" step="0.01" value={newItemQty} onChange={e => setNewItemQty(e.target.value)} className="bg-white" />
                    </div>
                    <div className="w-24 space-y-1">
                      <Label className="text-[9px] uppercase font-bold text-muted-foreground">Unidad</Label>
                      <Select value={newItemUnit} onValueChange={(v: UnitType) => setNewItemUnit(v)}>
                        <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="kilos">Kg</SelectItem><SelectItem value="libras">Lb</SelectItem><SelectItem value="bultos">Bl</SelectItem><SelectItem value="unidades">Un</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1 space-y-1">
                      <Label className="text-[9px] uppercase font-bold text-primary">Precio Cotizado ($)</Label>
                      <Input type="number" step="0.01" value={newItemPrice} onChange={e => setNewItemPrice(e.target.value)} placeholder="0.00" className="bg-white font-bold" />
                    </div>
                    <button type="button" onClick={handleAddItem} className="shrink-0 h-10 w-10 flex items-center justify-center bg-primary text-white rounded-md hover:bg-primary/90 transition-transform active:scale-95"><ListPlus className="w-4 h-4" /></button>
                  </div>
                </div>
                
                <div className="border rounded-lg overflow-hidden max-h-40 overflow-y-auto bg-muted/5">
                  <Table>
                    <TableBody>
                      {formItems.map((item, idx) => (
                        <TableRow key={idx} className="h-auto">
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
                      {formItems.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-4 text-[10px] text-muted-foreground italic">Agregue productos a la cotización.</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase text-muted-foreground flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-primary" /> Fecha y Notas
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
                <div className="mt-6 p-3 bg-white/50 rounded-lg border border-dashed border-primary/20">
                  <p className="text-[10px] text-primary font-bold italic leading-tight">
                    * El valor total es informativo y no afecta el inventario hasta que se procese como una venta real.
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
              <Button type="submit" size="lg" className="px-12 font-bold shadow-lg">{editingQuotation ? 'Guardar Cambios' : 'Generar Cotización'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!managingCollectionsFor} onOpenChange={(o) => !o && setManagingCollectionsFor(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-green-600" />
              Gestión de Abonos: {managingCollectionsFor?.customerName}
            </DialogTitle>
            <DialogDescription>Registra pagos parciales sobre el presupuesto cotizado.</DialogDescription>
          </DialogHeader>
          
          {managingCollectionsFor && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4 bg-muted/20 border-none shadow-none">
                  <p className="text-[10px] uppercase font-black text-muted-foreground mb-1">Valor Cotizado</p>
                  <p className="text-lg font-bold">${managingCollectionsFor.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                </Card>
                <Card className="p-4 bg-green-50 border-none shadow-none">
                  <p className="text-[10px] uppercase font-black text-green-600 mb-1">Abonado</p>
                  <p className="text-lg font-bold text-green-700">${getTotalCollected(managingCollectionsFor.id).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                </Card>
                <Card className="p-4 bg-destructive/5 border-none shadow-none">
                  <p className="text-[10px] uppercase font-black text-destructive mb-1">Saldo Restante</p>
                  <p className="text-lg font-bold text-destructive">${(managingCollectionsFor.totalValue - getTotalCollected(managingCollectionsFor.id)).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                </Card>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold uppercase text-muted-foreground px-1">
                  <span>Progreso de Recaudo</span>
                  <span>{((getTotalCollected(managingCollectionsFor.id) / managingCollectionsFor.totalValue) * 100).toFixed(1)}%</span>
                </div>
                <Progress value={(getTotalCollected(managingCollectionsFor.id) / managingCollectionsFor.totalValue) * 100} className="h-2" />
              </div>

              <Separator />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="text-sm font-bold flex items-center gap-2">
                    {editingCollectionId ? <Pencil className="w-4 h-4 text-primary" /> : <Plus className="w-4 h-4 text-primary" />}
                    {editingCollectionId ? 'Editar Abono' : 'Nuevo Abono'}
                  </h4>
                  <form onSubmit={handleAddCollection} className="space-y-4 bg-muted/10 p-4 rounded-xl border border-border">
                    <div className="space-y-2">
                      <Label>Fecha</Label>
                      <Input type="date" value={newCollectionDate} onChange={e => setNewCollectionDate(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Monto ($) *</Label>
                      <Input type="number" step="0.01" value={newCollectionAmount} onChange={e => setNewCollectionAmount(e.target.value)} placeholder="0.00" required className="font-bold text-green-700" />
                    </div>
                    <div className="space-y-2">
                      <Label>Notas</Label>
                      <Input value={newCollectionNotes} onChange={e => setNewCollectionNotes(e.target.value)} placeholder="Ej: Reserva de productos" />
                    </div>
                    <div className="flex gap-2">
                      {editingCollectionId && (
                        <Button type="button" variant="outline" className="flex-1" onClick={cancelEditCollection}>Cancelar</Button>
                      )}
                      <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700">
                        {editingCollectionId ? 'Actualizar' : 'Guardar Abono'}
                      </Button>
                    </div>
                  </form>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-bold flex items-center gap-2">
                    <History className="w-4 h-4 text-blue-500" /> Historial
                  </h4>
                  <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2">
                    {getCollectionsForQuotation(managingCollectionsFor.id).length === 0 ? (
                      <p className="text-xs text-center py-10 text-muted-foreground italic">No hay abonos registrados.</p>
                    ) : getCollectionsForQuotation(managingCollectionsFor.id).map(coll => {
                      const isSending = isSendingReceipt === coll.id;
                      return (
                        <div key={coll.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-border group hover:border-primary/30 transition-colors">
                          <div>
                            <p className="text-[10px] font-bold text-muted-foreground">{new Date(coll.date).toLocaleDateString()}</p>
                            <p className="text-sm font-bold text-primary">${coll.amount.toLocaleString()}</p>
                            {coll.notes && <p className="text-[9px] text-muted-foreground italic">{coll.notes}</p>}
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              type="button"
                              className={cn("h-7 w-7 flex items-center justify-center text-blue-600 hover:bg-blue-50 rounded-full transition-colors", isSending && "animate-pulse")}
                              onClick={() => handleSendReceiptEmail(managingCollectionsFor, coll)}
                              disabled={isSending}
                              title="Enviar recibo por correo"
                            >
                              {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileCheck className="w-3.5 h-3.5" />}
                            </button>
                            {isAdmin && (
                              <>
                                <button 
                                  type="button"
                                  className="h-7 w-7 flex items-center justify-center text-primary hover:bg-primary/10 rounded-full transition-colors"
                                  onClick={() => handleEditCollection(coll)}
                                  title="Editar abono"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  type="button"
                                  className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-destructive rounded-full transition-colors"
                                  onClick={() => deleteQuotationCollection(coll.id)}
                                  title="Eliminar abono"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setManagingCollectionsFor(null)} className="w-full">Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!managingImportFor} onOpenChange={(o) => !o && setManagingImportFor(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-orange-600" />
              Logística de Importación: {managingImportFor?.customerName}
            </DialogTitle>
            <DialogDescription>Registra el avance y novedades del proceso de importación de la mercancía.</DialogDescription>
          </DialogHeader>
          
          {managingImportFor && (
            <div className="space-y-6 py-4">
              <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-orange-100 p-2.5 rounded-lg text-orange-600">
                    <Package className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-orange-700 uppercase leading-none">Pedido de Importación</p>
                    <p className="text-lg font-bold text-orange-900 mt-1">Cotización #{managingImportFor.id.substring(0,8).toUpperCase()}</p>
                  </div>
                </div>
                <Badge variant="outline" className="border-orange-200 text-orange-700 bg-white">En Proceso</Badge>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="text-sm font-bold flex items-center gap-2">
                    <Plus className="w-4 h-4 text-primary" /> Registrar Nuevo Evento
                  </h4>
                  <form onSubmit={handleAddImportTracking} className="space-y-4 bg-muted/10 p-4 rounded-xl border border-border">
                    <div className="space-y-2">
                      <Label>Fecha del Seguimiento</Label>
                      <Input type="date" value={newImportDate} onChange={e => setNewImportDate(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Estado / Hito Logístico *</Label>
                      <Input value={newImportStatus} onChange={e => setNewImportStatus(e.target.value)} placeholder="Ej: Mercancía en Puerto, Aduana..." required />
                    </div>
                    <div className="space-y-2">
                      <Label>Detalles Adicionales</Label>
                      <textarea 
                        className="w-full min-h-[80px] p-3 rounded-md border border-input bg-background text-sm"
                        placeholder="Novedades, retrasos o confirmaciones..."
                        value={newImportNotes}
                        onChange={e => setNewImportNotes(e.target.value)}
                      />
                    </div>
                    <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700">Guardar Seguimiento</Button>
                  </form>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-bold flex items-center gap-2">
                    <History className="w-4 h-4 text-blue-500" /> Historial Logístico
                  </h4>
                  <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 relative">
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-muted-foreground/20 z-0" />
                    {getImportTrackingsForQuotation(managingImportFor.id).length === 0 ? (
                      <p className="text-xs text-center py-10 text-muted-foreground italic">No hay registros de seguimiento.</p>
                    ) : getImportTrackingsForQuotation(managingImportFor.id).map((track, idx) => (
                      <div key={track.id} className="relative z-10 pl-8 pb-2">
                        <div className="absolute left-2.5 top-1.5 w-3.5 h-3.5 rounded-full bg-orange-500 border-2 border-white shadow-sm" />
                        <div className="bg-white p-3 rounded-lg border border-border shadow-sm group hover:border-orange-200 transition-colors">
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-[10px] font-black text-muted-foreground uppercase">{new Date(track.date).toLocaleDateString()}</span>
                            {isAdmin && (
                              <button 
                                className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity" 
                                onClick={() => deleteQuotationImportTracking(track.id)}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          <p className="text-xs font-bold text-primary">{track.status}</p>
                          {track.notes && <p className="text-[11px] text-muted-foreground mt-1 italic leading-relaxed">{track.notes}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setManagingImportFor(null)} className="w-full">Cerrar Bitácora</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingQuotation} onOpenChange={(o) => !o && setViewingQuotation(null)}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileText className="w-5 h-5 text-primary" /> Detalle Completo de Cotización</DialogTitle>
          </DialogHeader>
          {viewingQuotation && (
            <div className="space-y-8 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-muted/20 p-6 rounded-2xl border border-border">
                <div className="space-y-3">
                  <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Información del Cliente</p>
                  <div>
                    <h3 className="text-xl font-black text-primary">{viewingQuotation.customerName}</h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm">
                      <p className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-muted-foreground" /> {viewingQuotation.customerPhone}</p>
                      <p className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-muted-foreground" /> {viewingQuotation.customerEmail || 'N/A'}</p>
                      <p className="flex items-center gap-1.5"><Fingerprint className="w-3.5 h-3.5 text-muted-foreground" /> {viewingQuotation.customerIdentification || 'Sin ID'}</p>
                    </div>
                    {viewingQuotation.customerAddress && (
                      <p className="flex items-center gap-1.5 text-sm mt-2"><MapPin className="w-3.5 h-3.5 text-muted-foreground" /> {viewingQuotation.customerAddress}</p>
                    )}
                  </div>
                </div>
                <div className="text-right space-y-2">
                  <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Estado Documento</p>
                  <p className="text-sm font-bold">Fecha Emisión: {new Date(viewingQuotation.date).toLocaleDateString()}</p>
                  {viewingQuotation.estimatedDeliveryDate && (
                    <p className="text-sm font-black text-accent">Entrega Est.: {new Date(viewingQuotation.estimatedDeliveryDate + 'T00:00:00').toLocaleDateString()}</p>
                  )}
                  <p className="text-[10px] font-mono text-muted-foreground mt-2">COT-#{viewingQuotation.id.substring(0,8).toUpperCase()}</p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-[10px] uppercase font-black text-muted-foreground tracking-widest px-1">Productos y Precios Cotizados</h4>
                <div className="border rounded-xl overflow-hidden shadow-sm">
                  <Table>
                    <TableHeader className="bg-muted/50"><TableRow><TableHead>Descripción del Producto / Especificaciones</TableHead><TableHead className="text-right">Cant.</TableHead><TableHead className="text-right">Precio Pactado</TableHead><TableHead className="text-right">Sub-Total</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {viewingQuotation.items?.map((item, i) => (
                        <TableRow key={i}>
                          <TableCell className="py-2 text-xs">
                            <div className="font-bold flex items-center gap-1.5">
                              {item.productName}
                              {item.productId.startsWith('manual-') && <Badge variant="outline" className="text-[8px] h-3.5 px-1 bg-accent/5 text-accent border-accent/20">Manual</Badge>}
                            </div>
                            {item.specifications && <div className="text-[10px] text-muted-foreground italic mt-0.5 whitespace-pre-wrap">{item.specifications}</div>}
                          </TableCell>
                          <TableCell className="py-2 text-right text-xs">{item.quantity} {item.unit}</TableCell>
                          <TableCell className="py-2 text-right text-xs font-medium">${item.price.toLocaleString()}</TableCell>
                          <TableCell className="py-2 text-right font-black text-xs text-primary">${item.total.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4 bg-primary/5 border-primary/10 flex flex-col justify-center">
                  <p className="text-[9px] uppercase font-black text-muted-foreground mb-1">Valor Total Propuesta</p>
                  <p className="text-2xl font-black text-primary">${viewingQuotation.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                </Card>
                <Card className="p-4 bg-green-50 border-green-100 flex flex-col justify-center">
                  <p className="text-[9px] uppercase font-black text-green-600 mb-1">Abonos Realizados</p>
                  <p className="text-2xl font-black text-green-700">${getTotalCollected(viewingQuotation.id).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                </Card>
                <Card className="p-4 bg-destructive/5 border-destructive/10 flex flex-col justify-center">
                  <p className="text-[9px] uppercase font-black text-destructive mb-1">Saldo Pendiente</p>
                  <p className="text-2xl font-black text-destructive">${(viewingQuotation.totalValue - getTotalCollected(viewingQuotation.id)).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                    <History className="w-4 h-4 text-green-600" /> Historial de Abonos
                  </h4>
                  <div className="border rounded-2xl p-4 bg-white shadow-sm space-y-3 min-h-[150px] max-h-[300px] overflow-y-auto">
                    {getCollectionsForQuotation(viewingQuotation.id).length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-50 py-8">
                        <Coins className="w-8 h-8 mb-2" />
                        <p className="text-xs italic">No hay abonos registrados.</p>
                      </div>
                    ) : getCollectionsForQuotation(viewingQuotation.id).map((coll, i) => (
                      <div key={i} className="flex justify-between items-center text-xs border-b border-muted pb-2 last:border-0 last:pb-0">
                        <div className="space-y-0.5">
                          <p className="font-bold text-primary">{new Date(coll.date).toLocaleDateString()}</p>
                          {coll.notes && <p className="text-[10px] text-muted-foreground italic line-clamp-1">{coll.notes}</p>}
                        </div>
                        <p className="font-black text-green-700 text-sm">${coll.amount.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                    <Globe className="w-4 h-4 text-orange-600" /> Bitácora de Importación
                  </h4>
                  <div className="border rounded-2xl p-4 bg-white shadow-sm space-y-4 min-h-[150px] max-h-[300px] overflow-y-auto relative">
                    {getImportTrackingsForQuotation(viewingQuotation.id).length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-50 py-8">
                        <Truck className="w-8 h-8 mb-2" />
                        <p className="text-xs italic">No hay seguimientos registrados.</p>
                      </div>
                    ) : (
                      <div className="space-y-4 relative">
                        <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-orange-100" />
                        {getImportTrackingsForQuotation(viewingQuotation.id).map((track, i) => (
                          <div key={i} className="relative pl-8">
                            <div className="absolute left-1 top-1 w-3.5 h-3.5 rounded-full bg-orange-500 border-2 border-white shadow-sm" />
                            <div className="space-y-0.5">
                              <div className="flex items-center justify-between">
                                <p className="text-[10px] font-black text-orange-600 uppercase">{new Date(track.date).toLocaleDateString()}</p>
                                <Badge variant="outline" className="text-[8px] h-4 py-0 border-orange-200 text-orange-700">Actualización</Badge>
                              </div>
                              <p className="text-xs font-bold text-foreground leading-tight">{track.status}</p>
                              {track.notes && <p className="text-[10px] text-muted-foreground italic leading-relaxed">{track.notes}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {viewingQuotation.notes && (
                <div className="space-y-2 border-t pt-6">
                  <p className="text-[10px] uppercase text-muted-foreground font-black flex items-center gap-1.5">
                    <FileText className="w-3 h-3" /> Observaciones y Validez
                  </p>
                  <div className="text-xs text-muted-foreground bg-muted/20 p-4 rounded-xl border border-dashed border-border italic whitespace-pre-wrap leading-relaxed">
                    {viewingQuotation.notes}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-3 border-t pt-6">
            <Button variant="outline" onClick={() => setViewingQuotation(null)} className="flex-1 h-12 rounded-xl">Cerrar Detalle</Button>
            {viewingQuotation && (
              <Button onClick={() => handlePrintQuotation(viewingQuotation)} className="flex-1 h-12 rounded-xl gap-2 shadow-md">
                <Printer className="w-4 h-4" /> Imprimir Cotización
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!quotationToDelete} onOpenChange={(open) => !open && setQuotationToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              ¿Confirmar Eliminación?
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar la cotización de <strong>{quotationToDelete?.customerName}</strong>? 
              Esta acción borrará también todos los abonos y seguimientos logísticos asociados y no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
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
