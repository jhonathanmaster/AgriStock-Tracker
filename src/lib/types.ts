
export type UnitType = 'libras' | 'kilos' | 'bultos' | 'unidades';
export type UserRole = 'admin' | 'operario';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  enabled: boolean;
  role: UserRole;
  lastLogin: string;
  accessHistory?: string[];
  identificationNumber?: string;
  phone?: string;
  address?: string;
}

export interface Invitation {
  id: string;
  email: string;
  role: UserRole;
  status: 'pending' | 'accepted';
  enabled?: boolean;
  token: string;
  expiresAt: string;
  invitedAt: string;
  acceptedAt?: string;
  openedAt?: string;
  lastEmailBody?: string;
  identificationNumber?: string;
  phone?: string;
  address?: string;
  photoURL?: string;
}

export interface Supplier {
  id: string;
  name: string;
  identificationNumber?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface Customer {
  id: string;
  name: string;
  identificationNumber?: string;
  phone: string;
  email?: string;
  address?: string;
  lastPurchaseDate?: string;
}

export interface AnimalType {
  id: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  referenceCode: string;
  name: string;
  description: string;
  animalType: string;
  category: string;
  supplierId?: string;
  imageUrl?: string;
  stock: number;
  stockInBundles: number;
  mainUnit: UnitType;
  costPrice: number;
  profitPercentage: number;
  salePrice: number;
  transportPricePerBundle: number;
  isImported?: boolean;
  origin?: string;
  importCost?: number;
  createdAt?: string;
}

export type PurchaseOrderStatus = string;

export interface PurchaseOrderStatusDefinition {
  id: string;
  name: string;
  description?: string;
  color?: string;
  order: number;
}

export interface PurchaseOrder {
  id: string;
  productId: string;
  supplierId: string;
  quantity: number;
  unit: UnitType;
  status: PurchaseOrderStatus;
  requestDate: string;
  deliveryDate: string | null;
  informedDate: string | null;
  receivedDate: string | null;
  expirationDays: number | null;
  notes: string | null;
  unitPrice?: number;
  transportPrice?: number;
  totalCost?: number;
}

export type OrderStatus = 'pending' | 'delivered' | 'cancelled' | 'paid';
export type PaymentMethod = 'efectivo' | 'transferencia';

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unit: UnitType;
  price: number;
  total: number;
}

export interface OrderPayment {
  id: string;
  date: string;
  amount: number;
  method: PaymentMethod;
  notes?: string;
}

export interface Order {
  id: string;
  requestDate: string;
  deliveryDate: string | null;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerAddress?: string;
  customerIdentification?: string;
  items: OrderItem[];
  payments: OrderPayment[];
  totalValue: number;
  status: OrderStatus;
  notes?: string;
}

export interface QuotationItem {
  productId: string;
  productName: string;
  specifications?: string;
  quantity: number;
  unit: UnitType;
  price: number;
  total: number;
}

export interface Quotation {
  id: string;
  date: string;
  estimatedDeliveryDate?: string | null;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress?: string;
  customerIdentification?: string;
  items: QuotationItem[];
  totalValue: number;
  notes?: string;
}

export interface QuotationCollection {
  id: string;
  quotationId: string;
  date: string;
  amount: number;
  notes?: string;
}

export interface QuotationImportTracking {
  id: string;
  quotationId: string;
  date: string;
  status: string;
  notes?: string;
}

export type CreditStatus = 'active' | 'paid' | 'cancelled';

export interface CreditItem {
  productId: string;
  productName: string;
  quantity: number;
  unit: UnitType;
  price: number;
  total: number;
}

export interface Credit {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  items: CreditItem[];
  totalValue: number;
  installments: number;
  status: CreditStatus;
  description: string;
  createdAt: string;
  agreementDate: string;
  expectedEndDate: string | null;
  notes?: string;
}

export interface CreditCollection {
  id: string;
  creditId: string;
  date: string;
  amount: number;
  notes?: string;
}

export interface InventoryAudit {
  id: string;
  productId: string;
  productName: string;
  systemQuantity: number;
  verifiedQuantity: number;
  difference: number;
  unit: string;
  auditDate: string;
  performedBy: string;
  performedByName: string;
  notes?: string;
  applied?: boolean;
}

export interface Expense {
  id: string;
  date: string;
  description: string;
  category: string;
  quantity: number;
  unitValue: number;
  ivaPercentage: number;
  ivaValue: number;
  subTotal: number;
  total: number;
  supplierId?: string;
  notes?: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  type: 'entrada' | 'salida' | 'venta';
  quantity: number;
  unit: UnitType;
  movementDateTime: string;
  notes?: string;
  totalValue?: number;
  subTotal?: number;
  ivaPercentage?: number;
  ivaValue?: number;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  customerIdentification?: string;
  performedBy?: string;
  performedByName?: string;
}

export interface UnitConversion {
  id: string;
  from: UnitType;
  to: UnitType;
  factor: number;
}

export interface GlobalConfig {
  id: string;
  criticalStockThreshold: number;
  initialCapital?: number;
  companyName?: string;
  companyNit?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  representativeName?: string;
  representativePosition?: string;
  logoUrl?: string;
  iconUrl?: string;
  signatureUrl?: string;
}
