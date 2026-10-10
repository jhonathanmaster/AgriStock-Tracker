
"use client";

import { useMemo, useCallback } from 'react';
import { collection, doc, query, orderBy, CollectionReference, Query } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { Product, StockMovement, UnitType, UserProfile, AnimalType, Category, Supplier, Invitation, Customer, PurchaseOrder, PurchaseOrderStatusDefinition, UnitConversion, Expense, ExpenseCategory, UserRole, GlobalConfig, Order, Credit, CreditCollection, InventoryAudit, Quotation, QuotationCollection, QuotationImportTracking } from './types';
import { addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { sendInvitationEmail } from '@/ai/flows/send-invitation-email';

export function useAgriStock() {
  const db = useFirestore();
  const { user } = useUser();

  const isSuperAdmin = useMemo(() => {
    if (!user) return false;
    const adminEmail = 'jhonathanmaster@gmail.com';
    const adminUid = 'SvWvlCyfZugtPerM2IUhbxNsUVz2';
    const userEmail = (user.email || '').toLowerCase().trim();
    return userEmail === adminEmail || user.uid === adminUid;
  }, [user]);

  const userProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(db, 'users', user.uid);
  }, [db, user]);
  
  const { data: profile, isLoading: profileLoading } = useDoc<UserProfile>(userProfileRef);

  const isAdmin = useMemo(() => {
    if (isSuperAdmin) return true;
    if (profileLoading) return false;
    return profile?.role === 'admin';
  }, [profile, isSuperAdmin, profileLoading]);

  const isEnabled = useMemo(() => {
    if (isAdmin) return true;
    if (profileLoading) return false;
    return profile?.enabled === true;
  }, [profile, isAdmin, profileLoading]);

  const configRef = useMemoFirebase(() => {
    if (!user || !isEnabled) return null;
    return doc(db, 'config', 'inventory');
  }, [db, user, isEnabled]);
  const { data: configData, isLoading: configLoading } = useDoc<GlobalConfig>(configRef);

  const criticalThreshold = configData?.criticalStockThreshold ?? 50;
  const initialCapital = configData?.initialCapital ?? 0;

  const companyInfo = useMemo(() => ({
    name: configData?.companyName || '',
    nit: configData?.companyNit || '',
    address: configData?.companyAddress || '',
    phone: configData?.companyPhone || '',
    email: configData?.companyEmail || '',
    representativeName: configData?.representativeName || '',
    representativePosition: configData?.representativePosition || '',
    logoUrl: configData?.logoUrl || '',
    iconUrl: configData?.iconUrl || '',
    signatureUrl: configData?.signatureUrl || ''
  }), [configData]);

  const conversionsRef = useMemoFirebase(() => {
    if (!user || !isEnabled) return null;
    return collection(db, 'unitConversions') as CollectionReference<UnitConversion>;
  }, [db, user, isEnabled]);
  const { data: unitConversions, isLoading: unitConversionsLoading } = useCollection<UnitConversion>(conversionsRef);

  const convertQuantity = useCallback((quantity: number, from: UnitType, to: UnitType): number => {
    if (!quantity || from === to) return quantity || 0;
    
    const conversion = unitConversions?.find(c => c.from === from && c.to === to);
    if (conversion) return quantity * conversion.factor;

    let inKilos = quantity;
    if (from === 'bultos') inKilos = quantity * 40;
    else if (from === 'libras') inKilos = quantity * 0.453592;
    
    if (to === 'kilos') return inKilos;
    if (to === 'bultos') return inKilos / 40;
    if (to === 'libras') return inKilos * 2.20462;
    return inKilos;
  }, [unitConversions]);

  const allUsersRef = useMemoFirebase(() => {
    if (!user || !isAdmin) return null;
    return collection(db, 'users') as CollectionReference<UserProfile>;
  }, [db, user, isAdmin]);
  const { data: users, isLoading: usersLoading } = useCollection<UserProfile>(allUsersRef);

  const invitationsRef = useMemoFirebase(() => {
    if (!user || !isAdmin) return null;
    return collection(db, 'invitations') as CollectionReference<Invitation>;
  }, [db, user, isAdmin]);
  const { data: invitations, isLoading: invitationsLoading } = useCollection<Invitation>(invitationsRef);

  const expenseCategoriesRef = useMemoFirebase(() => {
    if (!user || !isEnabled) return null;
    return query(collection(db, 'expenseCategories'), orderBy('name', 'asc')) as Query<ExpenseCategory>;
  }, [db, user, isEnabled]);
  const { data: expenseCategoriesData, isLoading: expenseCategoriesLoading } = useCollection<ExpenseCategory>(expenseCategoriesRef);

  const expensesRef = useMemoFirebase(() => {
    if (!user || !isEnabled) return null;
    return query(collection(db, 'expenses'), orderBy('date', 'desc')) as Query<Expense>;
  }, [db, user, isEnabled]);
  const { data: expenses, isLoading: expensesLoading } = useCollection<Expense>(expensesRef);

  const ordersRef = useMemoFirebase(() => {
    if (!user || !isEnabled) return null;
    return query(collection(db, 'orders'), orderBy('deliveryDate', 'asc')) as Query<Order>;
  }, [db, user, isEnabled]);
  const { data: orders, isLoading: ordersLoading } = useCollection<Order>(ordersRef);

  const quotationsRef = useMemoFirebase(() => {
    if (!user || !isEnabled) return null;
    return query(collection(db, 'quotations'), orderBy('date', 'desc')) as Query<Quotation>;
  }, [db, user, isEnabled]);
  const { data: quotations, isLoading: quotationsLoading } = useCollection<Quotation>(quotationsRef);

  const quotationCollectionsRef = useMemoFirebase(() => {
    if (!user || !isEnabled) return null;
    return query(collection(db, 'quotationCollections'), orderBy('date', 'desc')) as Query<QuotationCollection>;
  }, [db, user, isEnabled]);
  const { data: quotationCollections, isLoading: quotationCollectionsLoading } = useCollection<QuotationCollection>(quotationCollectionsRef);

  const quotationImportTrackingsRef = useMemoFirebase(() => {
    if (!user || !isEnabled) return null;
    return query(collection(db, 'quotationImportTrackings'), orderBy('date', 'desc')) as Query<QuotationImportTracking>;
  }, [db, user, isEnabled]);
  const { data: quotationImportTrackings, isLoading: quotationImportTrackingsLoading } = useCollection<QuotationImportTracking>(quotationImportTrackingsRef);

  const creditsRef = useMemoFirebase(() => {
    if (!user || !isEnabled) return null;
    return query(collection(db, 'credits'), orderBy('createdAt', 'desc')) as Query<Credit>;
  }, [db, user, isEnabled]);
  const { data: credits, isLoading: creditsLoading } = useCollection<Credit>(creditsRef);

  const creditCollectionsRef = useMemoFirebase(() => {
    if (!user || !isEnabled) return null;
    return query(collection(db, 'creditCollections'), orderBy('date', 'desc')) as Query<CreditCollection>;
  }, [db, user, isEnabled]);
  const { data: creditCollections, isLoading: creditCollectionsLoading } = useCollection<CreditCollection>(creditCollectionsRef);

  const inventoryAuditsRef = useMemoFirebase(() => {
    if (!user || !isEnabled) return null;
    return query(collection(db, 'inventoryAudits'), orderBy('auditDate', 'desc')) as Query<InventoryAudit>;
  }, [db, user, isEnabled]);
  const { data: audits, isLoading: auditsLoading } = useCollection<InventoryAudit>(inventoryAuditsRef);

  const productsRef = useMemoFirebase(() => {
    return collection(db, 'products') as CollectionReference<Product>;
  }, [db]);
  const { data: productsData, isLoading: productsLoading } = useCollection<Product>(productsRef);

  const animalTypesRef = useMemoFirebase(() => {
    return query(collection(db, 'animalTypes'), orderBy('name', 'asc')) as Query<AnimalType>;
  }, [db]);
  const { data: animalTypes, isLoading: animalTypesLoading } = useCollection<AnimalType>(animalTypesRef);

  const categoriesRef = useMemoFirebase(() => {
    return query(collection(db, 'categories'), orderBy('name', 'asc')) as Query<Category>;
  }, [db]);
  const { data: categories, isLoading: categoriesLoading } = useCollection<Category>(categoriesRef);

  const suppliersRef = useMemoFirebase(() => {
    if (!user || !isEnabled) return null;
    return query(collection(db, 'suppliers'), orderBy('name', 'asc')) as Query<Supplier>;
  }, [db, user, isEnabled]);
  const { data: suppliers, isLoading: suppliersLoading } = useCollection<Supplier>(suppliersRef);

  const customersRef = useMemoFirebase(() => {
    if (!user || !isEnabled) return null;
    return query(collection(db, 'customers'), orderBy('name', 'asc')) as Query<Customer>;
  }, [db, user, isEnabled]);
  const { data: customersData, isLoading: customersLoading } = useCollection<Customer>(customersRef);

  const purchaseOrdersRef = useMemoFirebase(() => {
    if (!user || !isEnabled) return null;
    return query(collection(db, 'purchaseOrders'), orderBy('requestDate', 'desc')) as Query<PurchaseOrder>;
  }, [db, user, isEnabled]);
  const { data: purchaseOrders, isLoading: purchaseOrdersLoading } = useCollection<PurchaseOrder>(purchaseOrdersRef);

  const purchaseOrderStatusDefinitionsRef = useMemoFirebase(() => {
    if (!user || !isEnabled) return null;
    return query(collection(db, 'purchaseOrderStatuses'), orderBy('order', 'asc')) as Query<PurchaseOrderStatusDefinition>;
  }, [db, user, isEnabled]);
  const { data: purchaseOrderStatusDefinitions, isLoading: purchaseOrderStatusDefinitionsLoading } = useCollection<PurchaseOrderStatusDefinition>(purchaseOrderStatusDefinitionsRef);

  const movementsRef = useMemoFirebase(() => {
    if (!user || !isEnabled) return null;
    return query(collection(db, 'inventoryMovements'), orderBy('movementDateTime', 'desc')) as Query<StockMovement>;
  }, [db, user, isEnabled]);
  const { data: movementsData, isLoading: movementsLoading } = useCollection<StockMovement>(movementsRef);

  const totalHistoricalIncome = useMemo(() => {
    if (!movementsData) return 0;
    return movementsData.filter(m => m.type === 'venta').reduce((sum, sale) => sum + (sale.totalValue || 0), 0);
  }, [movementsData]);

  const totalHistoricalCostOfGoodsSold = useMemo(() => {
    if (!movementsData || !productsData) return 0;
    return movementsData
      .filter(m => m.type === 'venta')
      .reduce((sum, m) => {
        const product = productsData.find(p => p.id === m.productId);
        if (!product) return sum;
        const qtyInBase = convertQuantity(m.quantity || 0, m.unit, product.mainUnit);
        const unitCost = (product.costPrice || 0) + (product.transportPricePerBundle || 0);
        return sum + (qtyInBase * unitCost);
      }, 0);
  }, [movementsData, productsData, convertQuantity]);

  const totalHistoricalExpenses = useMemo(() => {
    if (!expenses) return 0;
    return expenses.reduce((sum, e) => sum + (e.total || 0), 0);
  }, [expenses]);

  const dailyIncome = useMemo(() => {
    if (!movementsData) return 0;
    const todayStr = new Date().toLocaleDateString('en-CA');
    return movementsData
      .filter(m => m.type === 'venta' && m.movementDateTime && new Date(m.movementDateTime).toLocaleDateString('en-CA') === todayStr)
      .reduce((sum, sale) => sum + (sale.totalValue || 0), 0);
  }, [movementsData]);

  const recordMovement = useCallback((movement: Omit<StockMovement, 'id' | 'movementDateTime'> & { movementDateTime?: string }) => {
    if (!user) return;
    const product = (productsData || []).find(p => p.id === movement.productId);
    if (product) {
      const qtyInBase = convertQuantity(movement.quantity || 0, movement.unit, product.mainUnit);
      const change = (movement.type === 'entrada' ? qtyInBase : -qtyInBase);
      const newStock = (product.stock || 0) + change;
      updateDocumentNonBlocking(doc(db, 'products', product.id), { stock: newStock });
      
      const finalDateTime = movement.movementDateTime || new Date().toISOString();
      addDocumentNonBlocking(collection(db, 'inventoryMovements'), { 
        ...movement, 
        movementDateTime: finalDateTime,
        performedBy: user.uid,
        performedByName: profile?.displayName || user.email || 'Sistema'
      });
    }
  }, [db, user, productsData, convertQuantity, profile]);

  const deleteMovement = useCallback((id: string) => {
    const movement = (movementsData || []).find(m => m.id === id);
    if (movement) {
      const product = (productsData || []).find(p => p.id === movement.productId);
      if (product) {
        const qtyInBase = convertQuantity(movement.quantity, movement.unit, product.mainUnit);
        const revertAmount = (movement.type === 'entrada' ? -qtyInBase : qtyInBase);
        const newStock = (product.stock || 0) + revertAmount;
        updateDocumentNonBlocking(doc(db, 'products', product.id), { stock: newStock });
      }
      deleteDocumentNonBlocking(doc(db, 'inventoryMovements', id));
    }
  }, [db, movementsData, productsData, convertQuantity]);

  const updateMovement = useCallback((id: string, updates: Partial<StockMovement>) => {
    const oldMovement = (movementsData || []).find(m => m.id === id);
    if (oldMovement) {
      const product = (productsData || []).find(p => p.id === oldMovement.productId);
      if (product) {
        const oldValue = convertQuantity(oldMovement.quantity, oldMovement.unit, product.mainUnit);
        const revertChange = (oldMovement.type === 'entrada' ? -oldValue : oldValue);
        const newQty = updates.quantity !== undefined ? updates.quantity : oldMovement.quantity;
        const newUnit = updates.unit !== undefined ? updates.unit : oldMovement.unit;
        const newType = updates.type !== undefined ? updates.type : oldMovement.type;
        const newValue = convertQuantity(newQty, newUnit, product.mainUnit);
        const applyChange = (newType === 'entrada' ? newValue : -newValue);
        const newStock = (product.stock || 0) + revertChange + applyChange;
        updateDocumentNonBlocking(doc(db, 'products', product.id), { stock: newStock });
      }
      updateDocumentNonBlocking(doc(db, 'inventoryMovements', id), updates);
    }
  }, [db, movementsData, productsData, convertQuantity]);

  const saveCustomer = useCallback((customerData: any) => {
    let id = customerData.id;
    const cleanPhone = (customerData.phone || '').replace(/\D/g, '');
    const cleanEmail = (customerData.email || '').toLowerCase().trim();
    
    if (!id) {
      const existing = (customersData || []).find(c => {
        const cPhone = (c.phone || '').replace(/\D/g, '');
        const cEmail = (c.email || '').toLowerCase().trim();
        return (cleanPhone && cPhone === cleanPhone) || (cleanEmail && cEmail === cleanEmail);
      });
      if (existing) {
        id = existing.id;
      } else if (cleanPhone) {
        id = `phone-${cleanPhone}`;
      }
    }
    const customerRef = id ? doc(db, 'customers', id) : doc(collection(db, 'customers'));
    setDocumentNonBlocking(customerRef, { ...customerData, id: customerRef.id, lastPurchaseDate: new Date().toISOString() }, { merge: true });
    return customerRef.id;
  }, [db, customersData]);

  return {
    products: productsData || [],
    movements: movementsData || [],
    purchaseOrders: purchaseOrders || [],
    expenses: expenses || [],
    orders: orders || [],
    quotations: quotations || [],
    quotationCollections: quotationCollections || [],
    quotationImportTrackings: quotationImportTrackings || [],
    credits: credits || [],
    creditCollections: creditCollections || [],
    audits: audits || [],
    expenseCategories: expenseCategoriesData || [],
    purchaseOrderStatusDefinitions: purchaseOrderStatusDefinitions || [],
    conversions: unitConversions || [],
    users: users || [],
    invitations: invitations || [],
    customers: customersData || [],
    animalTypes: animalTypes || [],
    categories: categories || [],
    suppliers: suppliers || [],
    profile,
    dailyIncome,
    totalHistoricalIncome,
    totalHistoricalCostOfGoodsSold,
    totalHistoricalExpenses,
    criticalThreshold,
    initialCapital,
    companyInfo,
    convertQuantity,
    isLoading: profileLoading || productsLoading || movementsLoading || usersLoading || invitationsLoading || animalTypesLoading || categoriesLoading || suppliersLoading || customersLoading || purchaseOrdersLoading || purchaseOrderStatusDefinitionsLoading || expensesLoading || expenseCategoriesLoading || unitConversionsLoading || configLoading || ordersLoading || quotationsLoading || quotationCollectionsLoading || creditsLoading || creditCollectionsLoading || auditsLoading || quotationImportTrackingsLoading,
    isSuperAdmin,
    isAdmin,
    isEnabled,
    updateCriticalThreshold: (value: number) => setDocumentNonBlocking(doc(db, 'config', 'inventory'), { criticalStockThreshold: value }, { merge: true }),
    updateInitialCapital: (value: number) => setDocumentNonBlocking(doc(db, 'config', 'inventory'), { initialCapital: value }, { merge: true }),
    updateCompanyInfo: (info: Partial<GlobalConfig>) => setDocumentNonBlocking(doc(db, 'config', 'inventory'), info, { merge: true }),
    addProduct: (product: Omit<Product, 'id'>) => addDocumentNonBlocking(collection(db, 'products'), { ...product, createdAt: new Date().toISOString() }),
    updateProduct: (id: string, product: Partial<Product>) => updateDocumentNonBlocking(doc(db, 'products', id), product),
    deleteProduct: (id: string) => deleteDocumentNonBlocking(doc(db, 'products', id)),
    recordMovement,
    deleteMovement,
    updateMovement,
    addPurchaseOrder: (order: Omit<PurchaseOrder, 'id'>) => addDocumentNonBlocking(collection(db, 'purchaseOrders'), { ...order, requestDate: order.requestDate || new Date().toISOString() }),
    updatePurchaseOrder: (id: string, order: Partial<PurchaseOrder>) => updateDocumentNonBlocking(doc(db, 'purchaseOrders', id), order),
    deletePurchaseOrder: (id: string) => deleteDocumentNonBlocking(doc(db, 'purchaseOrders', id)),
    updatePurchaseOrderStatus: (id: string, status: string) => {
      const updateData: any = { status };
      if (status.toLowerCase() === 'recibido') {
        updateData.receivedDate = new Date().toISOString();
        const order = (purchaseOrders || []).find(o => o.id === id);
        if (order) recordMovement({ productId: order.productId, type: 'entrada', quantity: order.quantity, unit: order.unit, notes: `Recepción O.C. #${id}` });
      }
      updateDocumentNonBlocking(doc(db, 'purchaseOrders', id), updateData);
    },
    addOrder: (order: Omit<Order, 'id'>) => addDocumentNonBlocking(collection(db, 'orders'), { ...order }),
    updateOrder: (id: string, order: Partial<Order>) => updateDocumentNonBlocking(doc(db, 'orders', id), order),
    deleteOrder: (id: string) => deleteDocumentNonBlocking(doc(db, 'orders', id)),
    addQuotation: (quotation: Omit<Quotation, 'id'>) => addDocumentNonBlocking(collection(db, 'quotations'), { ...quotation, date: quotation.date || new Date().toISOString() }),
    updateQuotation: (id: string, quotation: Partial<Quotation>) => updateDocumentNonBlocking(doc(db, 'quotations', id), quotation),
    deleteQuotation: (id: string) => deleteDocumentNonBlocking(doc(db, 'quotations', id)),
    addQuotationCollection: (collectionData: Omit<QuotationCollection, 'id'>) => addDocumentNonBlocking(collection(db, 'quotationCollections'), collectionData),
    updateQuotationCollection: (id: string, data: Partial<QuotationCollection>) => updateDocumentNonBlocking(doc(db, 'quotationCollections', id), data),
    deleteQuotationCollection: (id: string) => deleteDocumentNonBlocking(doc(db, 'quotationCollections', id)),
    addQuotationImportTracking: (trackingData: Omit<QuotationImportTracking, 'id'>) => addDocumentNonBlocking(collection(db, 'quotationImportTrackings'), trackingData),
    deleteQuotationImportTracking: (id: string) => deleteDocumentNonBlocking(doc(db, 'quotationImportTrackings', id)),
    addCredit: (credit: Omit<Credit, 'id'>) => addDocumentNonBlocking(collection(db, 'credits'), { ...credit, createdAt: new Date().toISOString() }),
    updateCredit: (id: string, credit: Partial<Credit>) => updateDocumentNonBlocking(doc(db, 'credits', id), credit),
    deleteCredit: (id: string) => deleteDocumentNonBlocking(doc(db, 'credits', id)),
    addCreditCollection: (collectionData: Omit<CreditCollection, 'id'>) => addDocumentNonBlocking(collection(db, 'creditCollections'), collectionData),
    deleteCreditCollection: (id: string) => deleteDocumentNonBlocking(doc(db, 'creditCollections', id)),
    addInventoryAudit: (audit: Omit<InventoryAudit, 'id'>) => {
      const auditRef = doc(collection(db, 'inventoryAudits'));
      setDocumentNonBlocking(auditRef, { ...audit, id: auditRef.id, applied: false }, { merge: true });
    },
    applyAuditAdjustment: (id: string) => {
      const audit = (audits || []).find(a => a.id === id);
      if (!audit || audit.applied) return;
      const product = (productsData || []).find(p => p.id === audit.productId);
      if (product) {
        const diff = audit.verifiedQuantity - (product.stock || 0);
        if (diff !== 0) recordMovement({ productId: product.id, type: diff > 0 ? 'entrada' : 'salida', quantity: Math.abs(diff), unit: product.mainUnit as UnitType, notes: `Ajuste auditoría #${id.substring(0, 6)}` });
        updateDocumentNonBlocking(doc(db, 'inventoryAudits', id), { applied: true });
      }
    },
    deleteInventoryAudit: (id: string) => deleteDocumentNonBlocking(doc(db, 'inventoryAudits', id)),
    addExpense: (expense: Omit<Expense, 'id'>) => addDocumentNonBlocking(collection(db, 'expenses'), expense),
    updateExpense: (id: string, expense: Partial<Expense>) => updateDocumentNonBlocking(doc(db, 'expenses', id), expense),
    deleteExpense: (id: string) => deleteDocumentNonBlocking(doc(db, 'expenses', id)),
    addExpenseCategory: (name: string) => addDocumentNonBlocking(collection(db, 'expenseCategories'), { name }),
    updateExpenseCategory: (id: string, name: string) => updateDocumentNonBlocking(doc(db, 'expenseCategories', id), { name }),
    deleteExpenseCategory: (id: string) => deleteDocumentNonBlocking(doc(db, 'expenseCategories', id)),
    seedCommonExpenseCategories: () => {
      const defaults = ['Nómina', 'Servicios', 'Transporte', 'Impuestos', 'Mantenimiento', 'Insumos'];
      defaults.forEach(name => { if (!expenseCategoriesData?.some(c => c.name === name)) addDocumentNonBlocking(collection(db, 'expenseCategories'), { name }); });
    },
    updateUnitConversion: (id: string, factor: number) => updateDocumentNonBlocking(doc(db, 'unitConversions', id), { factor }),
    seedDefaultConversions: () => {
      const defaults = [
        { from: 'bultos', to: 'kilos', factor: 40 },
        { from: 'libras', to: 'kilos', factor: 0.453592 },
        { from: 'kilos', to: 'libras', factor: 2.20462 },
        { from: 'kilos', to: 'bultos', factor: 0.025 }
      ];
      defaults.forEach(conv => { if (!unitConversions?.some(c => c.from === conv.from && c.to === conv.to)) addDocumentNonBlocking(collection(db, 'unitConversions'), conv); });
    },
    addSupplier: (supplier: Omit<Supplier, 'id'>) => addDocumentNonBlocking(collection(db, 'suppliers'), supplier),
    updateSupplier: (id: string, supplier: Partial<Supplier>) => updateDocumentNonBlocking(doc(db, 'suppliers', id), supplier),
    deleteSupplier: (id: string) => deleteDocumentNonBlocking(doc(db, 'suppliers', id)),
    saveCustomer,
    deleteCustomer: (id: string) => deleteDocumentNonBlocking(doc(db, 'customers', id)),
    inviteUser: async (email: string) => {
      const cleanEmail = email.toLowerCase().trim();
      const token = Math.random().toString(36).substring(7);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      setDocumentNonBlocking(doc(db, 'invitations', cleanEmail), { email: cleanEmail, role: 'operario', status: 'pending', enabled: true, token, expiresAt, invitedAt: new Date().toISOString() }, { merge: true });
      await sendInvitationEmail({ email: cleanEmail, acceptLink: `${window.location.origin}/accept-invitation?email=${encodeURIComponent(cleanEmail)}&token=${token}` });
    },
    deleteUser: (uid: string, email?: string) => uid.startsWith('inv-') && email ? deleteDocumentNonBlocking(doc(db, 'invitations', email.toLowerCase())) : deleteDocumentNonBlocking(doc(db, 'users', uid)),
    updateUserDetails: (uid: string, email: string, details: any) => updateDocumentNonBlocking(uid.startsWith('inv-') ? doc(db, 'invitations', email.toLowerCase()) : doc(db, 'users', uid), details),
    updateUserRole: (uid: string, email: string, role: UserRole) => updateDocumentNonBlocking(uid.startsWith('inv-') ? doc(db, 'invitations', email.toLowerCase()) : doc(db, 'users', uid), { role }),
    addAnimalType: (name: string) => addDocumentNonBlocking(collection(db, 'animalTypes'), { name }),
    updateAnimalType: (id: string, name: string) => updateDocumentNonBlocking(doc(db, 'animalTypes', id), { name }),
    deleteAnimalType: (id: string) => deleteDocumentNonBlocking(doc(db, 'animalTypes', id)),
    addCategory: (name: string) => addDocumentNonBlocking(collection(db, 'categories'), { name }),
    updateCategory: (id: string, name: string) => updateDocumentNonBlocking(doc(db, 'categories', id), { name }),
    deleteCategory: (id: string) => deleteDocumentNonBlocking(doc(db, 'categories', id)),
    addPurchaseOrderStatusDefinition: (data: any) => addDocumentNonBlocking(collection(db, 'purchaseOrderStatuses'), { ...data, order: Number(data.order) }),
    updatePurchaseOrderStatusDefinition: (id: string, data: any) => updateDocumentNonBlocking(doc(db, 'purchaseOrderStatuses', id), { ...data, order: data.order ? Number(data.order) : undefined }),
    deletePurchaseOrderStatusDefinition: (id: string) => deleteDocumentNonBlocking(doc(db, 'purchaseOrderStatuses', id)),
    approveInvitation: (email: string) => updateDocumentNonBlocking(doc(db, 'invitations', email.toLowerCase()), { status: 'accepted', enabled: true, acceptedAt: new Date().toISOString() }),
    seedCommonAnimals: () => {
      const defaults = ['Pollos', 'Gallinas', 'Cerdos', 'Vacas', 'Caballos', 'Ovejas', 'Cabras'];
      defaults.forEach(name => { if (!animalTypes?.some(a => a.name === name)) addDocumentNonBlocking(collection(db, 'animalTypes'), { name }); });
    },
    seedCommonCategories: () => {
      const defaults = ['Concentrados', 'Forrajes', 'Sales Minerales', 'Medicamentos', 'Insumos Varios', 'Herramientas'];
      defaults.forEach(name => { if (!categories?.some(c => c.name === name)) addDocumentNonBlocking(collection(db, 'categories'), { name }); });
    },
    seedDefaultProducts: () => {
      const catalog = [{ name: 'Maíz Porva', category: 'Concentrados', unit: 'bultos', cost: 85000, profit: 15 }, { name: 'Concentrado Gallina Ponedora', category: 'Concentrados', unit: 'bultos', cost: 110000, profit: 12 }, { name: 'Sal Mineralizada 8%', category: 'Sales Minerales', unit: 'bultos', cost: 95000, profit: 20 }, { name: 'Pala Carbonera No. 4', category: 'Herramientas', unit: 'unidades', cost: 45000, profit: 30 }, { name: 'Ivermectina 1%', category: 'Medicamentos', unit: 'unidades', cost: 25000, profit: 40 }];
      catalog.forEach(item => { if (!productsData?.some(p => p.name === item.name)) addDocumentNonBlocking(collection(db, 'products'), { referenceCode: 'AUTO-' + Math.random().toString(36).substring(7).toUpperCase(), name: item.name, description: 'Producto base.', animalType: 'No Aplica', category: item.category, imageUrl: '', stock: 0, stockInBundles: 0, mainUnit: item.unit as UnitType, costPrice: item.cost, profitPercentage: item.profit, salePrice: item.cost * (1 + item.profit / 100), transportPricePerBundle: 0, createdAt: new Date().toISOString() }); });
    }
  };
}
