import 'server-only';
import { asc, desc, sql, type SQL } from 'drizzle-orm';
import type { PgTable, PgColumn } from 'drizzle-orm/pg-core';
import * as t from './db/schema';
import {
  z,
  text,
  textReq,
  name,
  image,
  ref,
  num,
  numDefault,
  numReq,
  int,
  bool,
  dateText,
  dateTextReq,
  unit,
  orderStatus,
  creditStatus,
  truckStatus,
  transportStatus,
  items,
  payments,
  tripExpenses,
} from './validation';
import type { Resource } from './versions';

const nowIso = () => new Date().toISOString();
/** Byte order, like Firestore's orderBy on strings. */
const byName = (c: PgColumn) => sql`${c} collate "C" asc`;
const nullsFirstAsc = (c: PgColumn) => sql`${c} asc nulls first`;

export type Access = 'enabled' | 'admin';

export interface ResourceDef {
  table: PgTable & { id: PgColumn };
  /** Who can read the data set (via /api/data). */
  read: Access;
  /** Who can create/update/delete through the generic endpoints; null = only special endpoints. */
  write: Access | null;
  /** Generic delete allowed even when writes go through special endpoints. */
  deletable?: Access;
  create?: z.ZodObject<z.ZodRawShape>;
  orderBy: (SQL | PgColumn)[];
}

const productFields = {
  referenceCode: textReq(200).default(''),
  name: name(),
  description: textReq().default(''),
  animalType: textReq(200).default('No Aplica'),
  category: textReq(200).default(''),
  supplierId: ref(),
  imageUrl: image(),
  mainUnit: unit().default('kilos'),
  costPrice: numDefault(0).pipe(z.number().min(0, 'El costo no puede ser negativo')),
  profitPercentage: numDefault(0),
  salePrice: numDefault(0).pipe(z.number().min(0, 'El precio no puede ser negativo')),
  transportPricePerBundle: numDefault(0).pipe(z.number().min(0)),
  isImported: z.boolean().optional().default(false),
  origin: text(500),
  importCost: num(),
  createdAt: dateText(),
};
export const productCreate = z.object({ ...productFields, stock: numDefault(0) });
export const productUpdate = z.object(productFields).partial().extend({
  /** Stock edits from the product form: applied as a delta, recorded as a movement. */
  stockAdjustment: z.object({ from: numReq(), to: numReq() }).optional(),
});

export const purchaseOrderFields = z.object({
  productId: z.string().min(1, 'Selecciona un producto').max(200),
  supplierId: z.string().min(1, 'Selecciona un proveedor').max(200),
  quantity: numReq(),
  unit: unit(),
  status: z.string().min(1).max(200),
  requestDate: dateTextReq().default(nowIso),
  deliveryDate: dateText(),
  informedDate: dateText(),
  receivedDate: dateText(),
  expirationDays: int(),
  notes: text(),
  unitPrice: num(),
  transportPrice: num(),
  totalCost: num(),
});

const customerSnapshot = {
  customerId: ref(),
  customerName: textReq(500),
  customerPhone: textReq(100).default(''),
  customerAddress: text(1000),
  customerIdentification: text(100),
};

export const RESOURCE_DEFS: Partial<Record<Resource, ResourceDef>> = {
  products: { table: t.products, read: 'enabled', write: null, deletable: 'enabled', orderBy: [t.products.id] },
  movements: {
    table: t.inventoryMovements,
    read: 'enabled',
    write: null,
    orderBy: [desc(t.inventoryMovements.movementDateTime), desc(t.inventoryMovements.createdAt)],
  },
  purchaseOrders: {
    table: t.purchaseOrders,
    read: 'enabled',
    write: 'enabled',
    create: purchaseOrderFields,
    orderBy: [desc(t.purchaseOrders.requestDate)],
  },
  expenses: {
    table: t.expenses,
    read: 'enabled',
    write: 'enabled',
    create: z.object({
      date: dateTextReq().default(nowIso),
      description: name(2000),
      category: name(200),
      quantity: numDefault(1),
      unitValue: numDefault(0),
      ivaPercentage: numDefault(0),
      ivaValue: numDefault(0),
      subTotal: numDefault(0),
      total: numReq(),
      supplierId: ref(),
      notes: text(),
    }),
    orderBy: [desc(t.expenses.date)],
  },
  orders: {
    table: t.orders,
    read: 'enabled',
    write: 'enabled',
    create: z.object({
      requestDate: dateTextReq().default(nowIso),
      deliveryDate: dateText(),
      ...customerSnapshot,
      customerEmail: text(500),
      items: items().default([]),
      payments: payments().default([]),
      totalValue: numDefault(0),
      status: orderStatus().default('pending'),
      notes: text(),
    }),
    orderBy: [nullsFirstAsc(t.orders.deliveryDate)],
  },
  quotations: {
    table: t.quotations,
    read: 'enabled',
    write: 'enabled',
    create: z.object({
      date: dateTextReq().default(nowIso),
      estimatedDeliveryDate: dateText(),
      ...customerSnapshot,
      customerEmail: textReq(500).default(''),
      items: items().default([]),
      totalValue: numDefault(0),
      notes: text(),
      approved: z.enum(['si', 'no']).nullable().optional(),
    }),
    orderBy: [desc(t.quotations.date)],
  },
  quotationCollections: {
    table: t.quotationCollections,
    read: 'enabled',
    write: 'enabled',
    create: z.object({ quotationId: z.string().min(1).max(200), date: dateTextReq().default(nowIso), amount: numReq(), notes: text() }),
    orderBy: [desc(t.quotationCollections.date)],
  },
  quotationImportTrackings: {
    table: t.quotationImportTrackings,
    read: 'enabled',
    write: 'enabled',
    create: z.object({
      quotationId: z.string().min(1).max(200),
      date: dateTextReq().default(nowIso),
      status: z.string().min(1).max(500),
      notes: text(),
    }),
    orderBy: [desc(t.quotationImportTrackings.date)],
  },
  credits: {
    table: t.credits,
    read: 'enabled',
    write: 'enabled',
    create: z.object({
      customerId: ref(),
      customerName: textReq(500),
      customerPhone: textReq(100).default(''),
      items: items().default([]),
      totalValue: numDefault(0),
      installments: z.preprocess((v) => (v === '' || v == null ? 1 : Number(v)), z.number().int().min(0)),
      status: creditStatus().default('active'),
      description: textReq().default(''),
      createdAt: dateTextReq().default(nowIso),
      agreementDate: dateText(),
      expectedEndDate: dateText(),
      notes: text(),
    }),
    orderBy: [desc(t.credits.createdAt)],
  },
  creditCollections: {
    table: t.creditCollections,
    read: 'enabled',
    write: 'enabled',
    create: z.object({ creditId: z.string().min(1).max(200), date: dateTextReq().default(nowIso), amount: numReq(), notes: text() }),
    orderBy: [desc(t.creditCollections.date)],
  },
  audits: {
    table: t.inventoryAudits,
    read: 'enabled',
    write: 'enabled',
    create: z.object({
      productId: ref(),
      productName: text(1000),
      systemQuantity: num(),
      verifiedQuantity: numReq(),
      difference: num(),
      unit: text(40),
      auditDate: dateTextReq().default(nowIso),
      notes: text(),
    }),
    orderBy: [desc(t.inventoryAudits.auditDate)],
  },
  expenseCategories: {
    table: t.expenseCategories,
    read: 'enabled',
    write: 'admin',
    create: z.object({ name: name(200) }),
    orderBy: [byName(t.expenseCategories.name)],
  },
  purchaseOrderStatusDefinitions: {
    table: t.purchaseOrderStatuses,
    read: 'enabled',
    write: 'admin',
    create: z.object({
      name: name(200),
      description: text(2000),
      color: text(40),
      order: z.preprocess((v) => (v === '' || v == null ? 0 : Number(v)), z.number().int()),
    }),
    orderBy: [asc(t.purchaseOrderStatuses.order)],
  },
  conversions: {
    table: t.unitConversions,
    read: 'enabled',
    write: 'admin',
    create: z.object({ from: unit(), to: unit(), factor: numReq().pipe(z.number().positive('El factor debe ser mayor que cero')) }),
    orderBy: [t.unitConversions.id],
  },
  customers: { table: t.customers, read: 'enabled', write: null, deletable: 'enabled', orderBy: [byName(t.customers.name)] },
  animalTypes: {
    table: t.animalTypes,
    read: 'enabled',
    write: 'admin',
    create: z.object({ name: name(200) }),
    orderBy: [byName(t.animalTypes.name)],
  },
  categories: {
    table: t.categories,
    read: 'enabled',
    write: 'admin',
    create: z.object({ name: name(200) }),
    orderBy: [byName(t.categories.name)],
  },
  suppliers: {
    table: t.suppliers,
    read: 'enabled',
    write: 'enabled',
    create: z.object({
      name: name(500),
      identificationNumber: text(100),
      contactName: text(500),
      phone: text(100),
      email: text(500),
      address: text(1000),
    }),
    orderBy: [byName(t.suppliers.name)],
  },
  trucks: {
    table: t.trucks,
    read: 'enabled',
    write: 'admin',
    create: z.object({
      plate: name(40).transform((v) => v.toUpperCase()),
      model: textReq(200).default(''),
      brand: textReq(200).default(''),
      capacityTons: numDefault(0).pipe(z.number().min(0)),
      fuelType: textReq(100).default(''),
      averageKmPerGallon: numDefault(0).pipe(z.number().min(0)),
      status: truckStatus().default('available'),
    }),
    orderBy: [byName(t.trucks.plate)],
  },
  transportServices: {
    table: t.transportServices,
    read: 'enabled',
    write: 'enabled',
    create: z.object({
      truckId: z.string().min(1, 'Selecciona un camión').max(200),
      ...customerSnapshot,
      customerEmail: text(500),
      origin: name(1000),
      destination: name(1000),
      distanceKm: numDefault(0).pipe(z.number().min(0)),
      estimatedTime: textReq(200).default(''),
      serviceDate: dateTextReq().default(nowIso),
      status: transportStatus().default('pending'),
      totalFreightPrice: numDefault(0).pipe(z.number().min(0, 'El flete no puede ser negativo')),
      driverName: textReq(500).default(''),
      driverId: textReq(100).default(''),
      driverPhone: textReq(100).default(''),
      expenses: tripExpenses().default([]),
      notes: text(),
      createdAt: dateTextReq().default(nowIso),
    }),
    orderBy: [desc(t.transportServices.serviceDate)],
  },
  transportCollections: {
    table: t.transportCollections,
    read: 'enabled',
    write: 'enabled',
    create: z.object({
      serviceId: z.string().min(1).max(200),
      date: dateTextReq().default(nowIso),
      amount: numReq().pipe(z.number().positive('El abono debe ser mayor que cero')),
      method: textReq(100).default(''),
      notes: text(),
    }),
    orderBy: [desc(t.transportCollections.date)],
  },
};

/** Which data sets a generic write touches (besides itself). */
export const ALSO_TOUCHES: Partial<Record<Resource, Resource[]>> = {
  products: ['movements', 'purchaseOrders', 'audits'], // FKs set to null on delete
  suppliers: ['products', 'purchaseOrders', 'expenses'],
  quotations: ['quotationCollections', 'quotationImportTrackings'],
  credits: ['creditCollections'],
  transportServices: ['transportCollections'],
  transportCollections: ['transportServices'],
};
