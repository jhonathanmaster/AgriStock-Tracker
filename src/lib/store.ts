"use client";

/**
 * useAgriStock(): same data and functions the pages used with Firestore, now backed by the
 * app's own API and PostgreSQL. Stock changes are calculated on the server inside a
 * transaction (sales, receptions, audits, edits), so two people working at the same time
 * can no longer overwrite each other's stock.
 */
import { useMemo, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import { api, refresh, useDataState, RequestError, type Resource } from './data-store';
import type {
  Product,
  StockMovement,
  UnitType,
  UserProfile,
  AnimalType,
  Category,
  Supplier,
  Invitation,
  Customer,
  PurchaseOrder,
  PurchaseOrderStatusDefinition,
  UnitConversion,
  Expense,
  ExpenseCategory,
  UserRole,
  GlobalConfig,
  Order,
  Credit,
  CreditCollection,
  InventoryAudit,
  Quotation,
  QuotationCollection,
  QuotationImportTracking,
} from './types';

const EMPTY: never[] = [];

function reportError(err: unknown) {
  const message = err instanceof RequestError ? err.message : 'No se pudo guardar el cambio. Revisa tu conexión.';
  console.error('[datos]', err);
  toast({ variant: 'destructive', title: 'No se guardó', description: message });
}

/**
 * Sends a change and reloads the affected data. Errors are shown as a toast (the pages call
 * these functions without awaiting, like the old non-blocking Firestore writes).
 */
async function mutate<T = any>(method: string, url: string, body: unknown, touched: Resource[]): Promise<T | undefined> {
  try {
    const result = await api<T>(method, url, body);
    await refresh(touched);
    return result;
  } catch (err) {
    reportError(err);
    void refresh(touched);
    return undefined;
  }
}

const enc = encodeURIComponent;
const create = (r: Resource, body: unknown, also: Resource[] = []) => mutate('POST', `/api/data/${r}`, body, [r, ...also]);
const update = (r: Resource, id: string, body: unknown, also: Resource[] = []) => mutate('PATCH', `/api/data/${r}/${enc(id)}`, body, [r, ...also]);
const remove = (r: Resource, id: string, also: Resource[] = []) => mutate('DELETE', `/api/data/${r}/${enc(id)}`, undefined, [r, ...also]);
const admin = (action: string, body: unknown) => mutate('POST', `/api/admin/${action}`, body, ['users', 'invitations']);
const setConfig = (patch: Partial<GlobalConfig>) => mutate('PATCH', '/api/config', patch, ['config']);

/** Fields the server computes; never sent from forms. */
function productBody(p: Partial<Product>) {
  const { id: _id, stock: _s, stockInBundles: _b, ...rest } = p as Partial<Product> & Record<string, unknown>;
  return rest;
}

export function useAgriStock() {
  const s = useDataState();
  const session = s.session;
  const d = s.data;

  const profile = (session?.profile ?? null) as UserProfile | null;
  const isSuperAdmin = !!session?.isSuperAdmin;
  const isAdmin = !!session?.isAdmin;
  const isEnabled = !!session?.isEnabled;

  const productsData = (d.products ?? EMPTY) as Product[];
  const movementsData = (d.movements ?? EMPTY) as StockMovement[];
  const unitConversions = (d.conversions ?? EMPTY) as UnitConversion[];
  const expenses = (d.expenses ?? EMPTY) as Expense[];
  const configData = (d.config ?? null) as GlobalConfig | null;

  const criticalThreshold = configData?.criticalStockThreshold ?? 50;
  const initialCapital = configData?.initialCapital ?? 0;

  const companyInfo = useMemo(
    () => ({
      name: configData?.companyName || '',
      nit: configData?.companyNit || '',
      address: configData?.companyAddress || '',
      phone: configData?.companyPhone || '',
      email: configData?.companyEmail || '',
      representativeName: configData?.representativeName || '',
      representativePosition: configData?.representativePosition || '',
      logoUrl: configData?.logoUrl || '',
      iconUrl: configData?.iconUrl || '',
      signatureUrl: configData?.signatureUrl || '',
    }),
    [configData],
  );

  const convertQuantity = useCallback(
    (quantity: number, from: UnitType, to: UnitType): number => {
      if (!quantity || from === to) return quantity || 0;
      const conversion = unitConversions.find((c) => c.from === from && c.to === to);
      if (conversion) return quantity * conversion.factor;
      let inKilos = quantity;
      if (from === 'bultos') inKilos = quantity * 40;
      else if (from === 'libras') inKilos = quantity * 0.453592;
      if (to === 'kilos') return inKilos;
      if (to === 'bultos') return inKilos / 40;
      if (to === 'libras') return inKilos * 2.20462;
      return inKilos;
    },
    [unitConversions],
  );

  const totalHistoricalIncome = useMemo(
    () => movementsData.filter((m) => m.type === 'venta').reduce((sum, sale) => sum + (sale.totalValue || 0), 0),
    [movementsData],
  );

  const totalHistoricalCostOfGoodsSold = useMemo(() => {
    const byId = new Map(productsData.map((p) => [p.id, p]));
    return movementsData
      .filter((m) => m.type === 'venta')
      .reduce((sum, m) => {
        const product = byId.get(m.productId);
        if (!product) return sum;
        const qtyInBase = convertQuantity(m.quantity || 0, m.unit, product.mainUnit);
        const unitCost = (product.costPrice || 0) + (product.transportPricePerBundle || 0);
        return sum + qtyInBase * unitCost;
      }, 0);
  }, [movementsData, productsData, convertQuantity]);

  const totalHistoricalExpenses = useMemo(() => expenses.reduce((sum, e) => sum + (e.total || 0), 0), [expenses]);

  const dailyIncome = useMemo(() => {
    const todayStr = new Date().toLocaleDateString('en-CA');
    return movementsData
      .filter((m) => m.type === 'venta' && m.movementDateTime && new Date(m.movementDateTime).toLocaleDateString('en-CA') === todayStr)
      .reduce((sum, sale) => sum + (sale.totalValue || 0), 0);
  }, [movementsData]);

  const isLoading = !s.sessionLoaded || (isEnabled ? !s.dataLoaded : !s.publicLoaded);

  // ---- Inventory (stock is calculated by the server) ------------------------------------

  const recordMovement = useCallback(
    (movement: Omit<StockMovement, 'id' | 'movementDateTime'> & { movementDateTime?: string }) => {
      const { performedBy: _p, performedByName: _n, ...body } = movement as typeof movement & Record<string, unknown>;
      return mutate('POST', '/api/movements', body, ['movements', 'products']);
    },
    [],
  );

  const deleteMovement = useCallback((id: string) => mutate('DELETE', `/api/movements/${enc(id)}`, undefined, ['movements', 'products']), []);

  const updateMovement = useCallback((id: string, updates: Partial<StockMovement>) => {
    const { id: _id, productId: _pid, performedBy: _p, performedByName: _n, ...body } = updates as Partial<StockMovement> & Record<string, unknown>;
    return mutate('PATCH', `/api/movements/${enc(id)}`, body, ['movements', 'products']);
  }, []);

  /** Creates or updates a customer (matched by phone digits or email). Resolves to its id. */
  const saveCustomer = useCallback(async (customerData: any): Promise<string | undefined> => {
    const r = await mutate<{ id: string }>('POST', '/api/customers/save', customerData, ['customers']);
    return r?.id;
  }, []);

  return {
    products: productsData,
    movements: movementsData,
    purchaseOrders: (d.purchaseOrders ?? EMPTY) as PurchaseOrder[],
    expenses,
    orders: (d.orders ?? EMPTY) as Order[],
    quotations: (d.quotations ?? EMPTY) as Quotation[],
    quotationCollections: (d.quotationCollections ?? EMPTY) as QuotationCollection[],
    quotationImportTrackings: (d.quotationImportTrackings ?? EMPTY) as QuotationImportTracking[],
    credits: (d.credits ?? EMPTY) as Credit[],
    creditCollections: (d.creditCollections ?? EMPTY) as CreditCollection[],
    audits: (d.audits ?? EMPTY) as InventoryAudit[],
    expenseCategories: (d.expenseCategories ?? EMPTY) as ExpenseCategory[],
    purchaseOrderStatusDefinitions: (d.purchaseOrderStatusDefinitions ?? EMPTY) as PurchaseOrderStatusDefinition[],
    conversions: unitConversions,
    users: (d.users ?? EMPTY) as UserProfile[],
    invitations: (d.invitations ?? EMPTY) as Invitation[],
    customers: (d.customers ?? EMPTY) as Customer[],
    animalTypes: (d.animalTypes ?? EMPTY) as AnimalType[],
    categories: (d.categories ?? EMPTY) as Category[],
    suppliers: (d.suppliers ?? EMPTY) as Supplier[],
    profile,
    dailyIncome,
    totalHistoricalIncome,
    totalHistoricalCostOfGoodsSold,
    totalHistoricalExpenses,
    criticalThreshold,
    initialCapital,
    companyInfo,
    convertQuantity,
    isLoading,
    isSuperAdmin,
    isAdmin,
    isEnabled,

    updateCriticalThreshold: (value: number) => setConfig({ criticalStockThreshold: value }),
    updateInitialCapital: (value: number) => setConfig({ initialCapital: value }),
    updateCompanyInfo: (info: Partial<GlobalConfig>) => setConfig(info),

    addProduct: (product: Omit<Product, 'id'>) =>
      mutate<{ id: string }>('POST', '/api/products', { ...productBody(product), stock: product.stock ?? 0 }, ['products', 'movements']),
    /**
     * `baseStock` is the stock shown when the edit form was opened. If the form changed the
     * stock, only the difference is applied (and recorded as an adjustment movement).
     */
    updateProduct: (id: string, product: Partial<Product>, baseStock?: number) => {
      const body: Record<string, unknown> = productBody(product);
      if (product.stock !== undefined && baseStock !== undefined && Number(product.stock) !== Number(baseStock)) {
        body.stockAdjustment = { from: Number(baseStock), to: Number(product.stock) };
      }
      return mutate('PATCH', `/api/products/${enc(id)}`, body, ['products', 'movements']);
    },
    deleteProduct: (id: string) => remove('products', id, ['movements', 'purchaseOrders', 'audits']),

    recordMovement,
    deleteMovement,
    updateMovement,

    addPurchaseOrder: (order: Omit<PurchaseOrder, 'id'>) => create('purchaseOrders', order),
    updatePurchaseOrder: (id: string, order: Partial<PurchaseOrder>) => update('purchaseOrders', id, order),
    deletePurchaseOrder: (id: string) => remove('purchaseOrders', id),
    /** "Recibido" adds the ordered quantity to stock (only once per order). */
    updatePurchaseOrderStatus: (id: string, status: string) =>
      mutate('POST', `/api/purchase-orders/${enc(id)}/status`, { status }, ['purchaseOrders', 'products', 'movements']),

    addOrder: (order: Omit<Order, 'id'>) => create('orders', order),
    updateOrder: (id: string, order: Partial<Order>) => update('orders', id, order),
    deleteOrder: (id: string) => remove('orders', id),

    addQuotation: (quotation: Omit<Quotation, 'id'>) => create('quotations', { ...quotation, date: quotation.date || new Date().toISOString() }),
    updateQuotation: (id: string, quotation: Partial<Quotation>) => update('quotations', id, quotation),
    deleteQuotation: (id: string) => remove('quotations', id, ['quotationCollections', 'quotationImportTrackings']),
    addQuotationCollection: (data: Omit<QuotationCollection, 'id'>) => create('quotationCollections', data),
    updateQuotationCollection: (id: string, data: Partial<QuotationCollection>) => update('quotationCollections', id, data),
    deleteQuotationCollection: (id: string) => remove('quotationCollections', id),
    addQuotationImportTracking: (data: Omit<QuotationImportTracking, 'id'>) => create('quotationImportTrackings', data),
    deleteQuotationImportTracking: (id: string) => remove('quotationImportTrackings', id),

    addCredit: (credit: Omit<Credit, 'id'>) => create('credits', { ...credit, createdAt: new Date().toISOString() }),
    updateCredit: (id: string, credit: Partial<Credit>) => update('credits', id, credit),
    deleteCredit: (id: string) => remove('credits', id, ['creditCollections']),
    addCreditCollection: (data: Omit<CreditCollection, 'id'>) => create('creditCollections', data),
    deleteCreditCollection: (id: string) => remove('creditCollections', id),

    addInventoryAudit: (audit: Omit<InventoryAudit, 'id'>) => create('audits', audit),
    /** Sets the product stock to the counted quantity (once) and records the difference. */
    applyAuditAdjustment: (id: string) => mutate('POST', `/api/audits/${enc(id)}/apply`, {}, ['audits', 'products', 'movements']),
    deleteInventoryAudit: (id: string) => remove('audits', id),

    addExpense: (expense: Omit<Expense, 'id'>) => create('expenses', expense),
    updateExpense: (id: string, expense: Partial<Expense>) => update('expenses', id, expense),
    deleteExpense: (id: string) => remove('expenses', id),
    addExpenseCategory: (name: string) => create('expenseCategories', { name }),
    updateExpenseCategory: (id: string, name: string) => update('expenseCategories', id, { name }),
    deleteExpenseCategory: (id: string) => remove('expenseCategories', id),
    seedCommonExpenseCategories: () => {
      const existing = (d.expenseCategories ?? EMPTY) as ExpenseCategory[];
      ['Nómina', 'Servicios', 'Transporte', 'Impuestos', 'Mantenimiento', 'Insumos'].forEach((name) => {
        if (!existing.some((c) => c.name === name)) void create('expenseCategories', { name });
      });
    },

    updateUnitConversion: (id: string, factor: number) => update('conversions', id, { factor }, ['products']),
    seedDefaultConversions: () => {
      const defaults = [
        { from: 'bultos', to: 'kilos', factor: 40 },
        { from: 'libras', to: 'kilos', factor: 0.453592 },
        { from: 'kilos', to: 'libras', factor: 2.20462 },
        { from: 'kilos', to: 'bultos', factor: 0.025 },
      ];
      defaults.forEach((conv) => {
        if (!unitConversions.some((c) => c.from === conv.from && c.to === conv.to)) void create('conversions', conv);
      });
    },

    addSupplier: (supplier: Omit<Supplier, 'id'>) => create('suppliers', supplier),
    updateSupplier: (id: string, supplier: Partial<Supplier>) => update('suppliers', id, supplier),
    deleteSupplier: (id: string) => remove('suppliers', id, ['products', 'purchaseOrders', 'expenses']),

    saveCustomer,
    deleteCustomer: (id: string) => remove('customers', id),

    /** Creates the invitation and emails the link. Throws if it could not be created. */
    inviteUser: async (email: string) => {
      const r = await api<{ emailSent: boolean; error?: string; acceptLink?: string }>('POST', '/api/admin/invite', { email });
      await refresh(['invitations']);
      if (!r.emailSent && r.acceptLink) {
        try {
          await navigator.clipboard.writeText(r.acceptLink);
        } catch {
          /* clipboard not available */
        }
        toast({
          title: 'Invitación creada, pero el correo no se envió',
          description: `${r.error || 'El correo no está configurado.'} El enlace de invitación se copió al portapapeles: compártelo tú mismo.`,
        });
      }
    },
    deleteUser: (uid: string, email?: string) => admin('delete-user', { uid, email }),
    updateUserDetails: (uid: string, email: string, details: any) => admin('update-details', { uid, email, details }),
    updateUserRole: (uid: string, email: string, role: UserRole) => admin('update-role', { uid, email, role }),
    approveInvitation: (email: string) => admin('approve-invitation', { email }),

    addAnimalType: (name: string) => create('animalTypes', { name }),
    updateAnimalType: (id: string, name: string) => update('animalTypes', id, { name }),
    deleteAnimalType: (id: string) => remove('animalTypes', id),
    addCategory: (name: string) => create('categories', { name }),
    updateCategory: (id: string, name: string) => update('categories', id, { name }),
    deleteCategory: (id: string) => remove('categories', id),

    addPurchaseOrderStatusDefinition: (data: any) => create('purchaseOrderStatusDefinitions', { ...data, order: Number(data.order) }),
    updatePurchaseOrderStatusDefinition: (id: string, data: any) =>
      update('purchaseOrderStatusDefinitions', id, { ...data, order: data.order ? Number(data.order) : undefined }),
    deletePurchaseOrderStatusDefinition: (id: string) => remove('purchaseOrderStatusDefinitions', id),

    seedCommonAnimals: () => {
      const existing = (d.animalTypes ?? EMPTY) as AnimalType[];
      ['Pollos', 'Gallinas', 'Cerdos', 'Vacas', 'Caballos', 'Ovejas', 'Cabras'].forEach((name) => {
        if (!existing.some((a) => a.name === name)) void create('animalTypes', { name });
      });
    },
    seedCommonCategories: () => {
      const existing = (d.categories ?? EMPTY) as Category[];
      ['Concentrados', 'Forrajes', 'Sales Minerales', 'Medicamentos', 'Insumos Varios', 'Herramientas'].forEach((name) => {
        if (!existing.some((c) => c.name === name)) void create('categories', { name });
      });
    },
    seedDefaultProducts: () => {
      const catalog = [
        { name: 'Maíz Porva', category: 'Concentrados', unit: 'bultos', cost: 85000, profit: 15 },
        { name: 'Concentrado Gallina Ponedora', category: 'Concentrados', unit: 'bultos', cost: 110000, profit: 12 },
        { name: 'Sal Mineralizada 8%', category: 'Sales Minerales', unit: 'bultos', cost: 95000, profit: 20 },
        { name: 'Pala Carbonera No. 4', category: 'Herramientas', unit: 'unidades', cost: 45000, profit: 30 },
        { name: 'Ivermectina 1%', category: 'Medicamentos', unit: 'unidades', cost: 25000, profit: 40 },
      ];
      catalog.forEach((item) => {
        if (productsData.some((p) => p.name === item.name)) return;
        void mutate(
          'POST',
          '/api/products',
          {
            referenceCode: 'AUTO-' + Math.random().toString(36).substring(7).toUpperCase(),
            name: item.name,
            description: 'Producto base.',
            animalType: 'No Aplica',
            category: item.category,
            imageUrl: '',
            stock: 0,
            mainUnit: item.unit as UnitType,
            costPrice: item.cost,
            profitPercentage: item.profit,
            salePrice: item.cost * (1 + item.profit / 100),
            transportPricePerBundle: 0,
            createdAt: new Date().toISOString(),
          },
          ['products'],
        );
      });
    },
  };
}
