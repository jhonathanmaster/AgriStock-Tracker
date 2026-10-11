/**
 * PostgreSQL schema (source of truth). Generate a migration after editing:
 *   npm run db:generate
 *
 * Conventions
 * - Primary keys are text so documents imported from Firestore keep their ids
 *   (references like productId and notes such as "Recepción O.C. #<id>" stay valid).
 * - Property names match the JSON the UI already uses (camelCase), columns are snake_case.
 * - Money and quantities are `numeric` (exact), exposed to JS as numbers.
 * - Dates entered by people (delivery dates, agreement dates, ...) are stored as the
 *   exact text the app sends: some are "YYYY-MM-DD", others full ISO timestamps, and the
 *   UI relies on that format. Server-managed audit columns use timestamptz.
 */
import { sql } from 'drizzle-orm';
import {
  pgTable,
  text,
  boolean,
  integer,
  numeric,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
  check,
  primaryKey,
} from 'drizzle-orm/pg-core';

const id = () => text('id').primaryKey().default(sql`gen_random_uuid()::text`);
const money = (name: string) => numeric(name, { mode: 'number' });
const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp('updated_at', { withTimezone: true }).notNull().defaultNow();

export const UNITS = ['libras', 'kilos', 'bultos', 'unidades'] as const;
export const ROLES = ['admin', 'operario'] as const;
export const MOVEMENT_TYPES = ['entrada', 'salida', 'venta'] as const;
export const ORDER_STATUSES = ['pending', 'delivered', 'cancelled', 'paid'] as const;
export const CREDIT_STATUSES = ['active', 'paid', 'cancelled'] as const;
export const TRUCK_STATUSES = ['available', 'in_service', 'maintenance'] as const;
export const TRANSPORT_STATUSES = ['pending', 'in_progress', 'finished', 'cancelled'] as const;
export const TRANSPORT_PAYMENT_STATUSES = ['pending', 'partial', 'paid'] as const;

const inList = (column: string, values: readonly string[]) =>
  sql.raw(`${column} in (${values.map((v) => `'${v}'`).join(', ')})`);

// ---- Accounts ------------------------------------------------------------------------

export const users = pgTable(
  'users',
  {
    id: id(),
    email: text('email').notNull(),
    displayName: text('display_name'),
    photoUrl: text('photo_url'),
    passwordHash: text('password_hash'),
    googleSub: text('google_sub'),
    enabled: boolean('enabled').notNull().default(false),
    role: text('role').notNull().default('operario'),
    lastLogin: timestamp('last_login', { withTimezone: true }),
    accessHistory: timestamp('access_history', { withTimezone: true }).array().notNull().default(sql`'{}'`),
    identificationNumber: text('identification_number'),
    phone: text('phone'),
    address: text('address'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('users_email_key').on(t.email),
    uniqueIndex('users_google_sub_key').on(t.googleSub),
    check('users_email_lowercase', sql`${t.email} = lower(${t.email})`),
    check('users_role_check', inList('role', ROLES)),
  ],
);

export const sessions = pgTable(
  'sessions',
  {
    tokenHash: text('token_hash').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: createdAt(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    absoluteExpiresAt: timestamp('absolute_expires_at', { withTimezone: true }).notNull(),
    userAgent: text('user_agent'),
    ip: text('ip'),
  },
  (t) => [index('sessions_user_id_idx').on(t.userId), index('sessions_expires_at_idx').on(t.expiresAt)],
);

/** Short-lived state for the Google sign-in round trip (single use). */
export const oauthStates = pgTable('oauth_states', {
  state: text('state').primaryKey(),
  codeVerifier: text('code_verifier').notNull(),
  nonce: text('nonce').notNull(),
  returnTo: text('return_to'),
  createdAt: createdAt(),
});

export const invitations = pgTable(
  'invitations',
  {
    email: text('email').primaryKey(),
    role: text('role').notNull().default('operario'),
    status: text('status').notNull().default('pending'),
    enabled: boolean('enabled').notNull().default(true),
    /** sha256 of the token sent by email; the token itself is never stored. */
    tokenHash: text('token_hash'),
    expiresAt: text('expires_at'),
    invitedAt: text('invited_at'),
    acceptedAt: text('accepted_at'),
    openedAt: text('opened_at'),
    lastEmailBody: text('last_email_body'),
    identificationNumber: text('identification_number'),
    phone: text('phone'),
    address: text('address'),
    photoUrl: text('photo_url'),
    createdAt: createdAt(),
  },
  (t) => [
    check('invitations_email_lowercase', sql`${t.email} = lower(${t.email})`),
    check('invitations_role_check', inList('role', ROLES)),
    check('invitations_status_check', inList('status', ['pending', 'accepted'])),
  ],
);

// ---- Catalogs -------------------------------------------------------------------------

export const animalTypes = pgTable('animal_types', { id: id(), name: text('name').notNull(), createdAt: createdAt() }, (t) => [
  index('animal_types_name_idx').on(t.name),
]);

export const categories = pgTable('categories', { id: id(), name: text('name').notNull(), createdAt: createdAt() }, (t) => [
  index('categories_name_idx').on(t.name),
]);

export const expenseCategories = pgTable(
  'expense_categories',
  { id: id(), name: text('name').notNull(), createdAt: createdAt() },
  (t) => [index('expense_categories_name_idx').on(t.name)],
);

export const unitConversions = pgTable(
  'unit_conversions',
  {
    id: id(),
    from: text('from_unit').notNull(),
    to: text('to_unit').notNull(),
    factor: numeric('factor', { mode: 'number' }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('unit_conversions_pair_key').on(t.from, t.to),
    check('unit_conversions_from_check', inList('from_unit', UNITS)),
    check('unit_conversions_to_check', inList('to_unit', UNITS)),
    check('unit_conversions_factor_positive', sql`${t.factor} > 0`),
  ],
);

export const purchaseOrderStatuses = pgTable(
  'purchase_order_statuses',
  {
    id: id(),
    name: text('name').notNull(),
    description: text('description'),
    color: text('color'),
    order: integer('sort_order').notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index('purchase_order_statuses_order_idx').on(t.order)],
);

/** Global settings. The app uses a single row with id = 'inventory'. */
export const appConfig = pgTable('app_config', {
  id: text('id').primaryKey(),
  criticalStockThreshold: money('critical_stock_threshold'),
  initialCapital: money('initial_capital'),
  companyName: text('company_name'),
  companyNit: text('company_nit'),
  companyAddress: text('company_address'),
  companyPhone: text('company_phone'),
  companyEmail: text('company_email'),
  representativeName: text('representative_name'),
  representativePosition: text('representative_position'),
  logoUrl: text('logo_url'),
  iconUrl: text('icon_url'),
  signatureUrl: text('signature_url'),
  /** Contract template (data URL or link) attached to contract emails. */
  contractTemplateUrl: text('contract_template_url'),
  updatedAt: updatedAt(),
});

// ---- Directory ------------------------------------------------------------------------

export const suppliers = pgTable(
  'suppliers',
  {
    id: id(),
    name: text('name').notNull(),
    identificationNumber: text('identification_number'),
    contactName: text('contact_name'),
    phone: text('phone'),
    email: text('email'),
    address: text('address'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('suppliers_name_idx').on(t.name)],
);

export const customers = pgTable(
  'customers',
  {
    id: id(),
    name: text('name').notNull(),
    identificationNumber: text('identification_number'),
    phone: text('phone'),
    email: text('email'),
    address: text('address'),
    lastPurchaseDate: text('last_purchase_date'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('customers_name_idx').on(t.name),
    // Used to find an existing customer by phone digits or email when saving a sale.
    index('customers_phone_digits_idx').on(sql`regexp_replace(coalesce(${t.phone}, ''), '\\D', '', 'g')`),
    index('customers_email_lower_idx').on(sql`lower(${t.email})`),
  ],
);

// ---- Inventory ------------------------------------------------------------------------

export const products = pgTable(
  'products',
  {
    id: id(),
    referenceCode: text('reference_code').notNull().default(''),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    animalType: text('animal_type').notNull().default('No Aplica'),
    category: text('category').notNull().default(''),
    supplierId: text('supplier_id').references(() => suppliers.id, { onDelete: 'set null' }),
    imageUrl: text('image_url'),
    /** Only changed together with an inventory movement, inside one transaction. */
    stock: numeric('stock', { mode: 'number' }).notNull().default(0),
    stockInBundles: numeric('stock_in_bundles', { mode: 'number' }).notNull().default(0),
    mainUnit: text('main_unit').notNull().default('kilos'),
    costPrice: money('cost_price').notNull().default(0),
    profitPercentage: money('profit_percentage').notNull().default(0),
    salePrice: money('sale_price').notNull().default(0),
    transportPricePerBundle: money('transport_price_per_bundle').notNull().default(0),
    isImported: boolean('is_imported').notNull().default(false),
    origin: text('origin'),
    importCost: money('import_cost'),
    createdAt: text('created_at'),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('products_name_idx').on(t.name),
    index('products_supplier_id_idx').on(t.supplierId),
    check('products_main_unit_check', inList('main_unit', UNITS)),
    check('products_prices_non_negative', sql`${t.costPrice} >= 0 and ${t.salePrice} >= 0 and ${t.transportPricePerBundle} >= 0`),
  ],
);

export const inventoryMovements = pgTable(
  'inventory_movements',
  {
    id: id(),
    productId: text('product_id').references(() => products.id, { onDelete: 'set null' }),
    type: text('type').notNull(),
    quantity: numeric('quantity', { mode: 'number' }).notNull(),
    unit: text('unit').notNull(),
    movementDateTime: text('movement_date_time').notNull(),
    notes: text('notes'),
    totalValue: money('total_value'),
    subTotal: money('sub_total'),
    ivaPercentage: money('iva_percentage'),
    ivaValue: money('iva_value'),
    customerName: text('customer_name'),
    customerPhone: text('customer_phone'),
    customerEmail: text('customer_email'),
    customerAddress: text('customer_address'),
    customerIdentification: text('customer_identification'),
    performedBy: text('performed_by'),
    performedByName: text('performed_by_name'),
    /**
     * What generated this movement automatically, e.g. "purchase-order:<id>" or "audit:<id>".
     * Unique, so receiving an order or applying an audit twice cannot add stock twice.
     */
    sourceRef: text('source_ref'),
    createdAt: createdAt(),
  },
  (t) => [
    index('inventory_movements_product_id_idx').on(t.productId),
    index('inventory_movements_date_idx').on(t.movementDateTime),
    uniqueIndex('inventory_movements_source_ref_key').on(t.sourceRef),
    check('inventory_movements_type_check', inList('type', MOVEMENT_TYPES)),
    check('inventory_movements_unit_check', inList('unit', UNITS)),
  ],
);

export const inventoryAudits = pgTable(
  'inventory_audits',
  {
    id: id(),
    productId: text('product_id').references(() => products.id, { onDelete: 'set null' }),
    productName: text('product_name'),
    systemQuantity: numeric('system_quantity', { mode: 'number' }),
    verifiedQuantity: numeric('verified_quantity', { mode: 'number' }).notNull(),
    difference: numeric('difference', { mode: 'number' }),
    unit: text('unit'),
    auditDate: text('audit_date').notNull(),
    performedBy: text('performed_by'),
    performedByName: text('performed_by_name'),
    notes: text('notes'),
    applied: boolean('applied').notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index('inventory_audits_date_idx').on(t.auditDate), index('inventory_audits_product_id_idx').on(t.productId)],
);

export const purchaseOrders = pgTable(
  'purchase_orders',
  {
    id: id(),
    productId: text('product_id').references(() => products.id, { onDelete: 'set null' }),
    supplierId: text('supplier_id').references(() => suppliers.id, { onDelete: 'set null' }),
    quantity: numeric('quantity', { mode: 'number' }).notNull(),
    unit: text('unit').notNull(),
    status: text('status').notNull(),
    requestDate: text('request_date').notNull(),
    deliveryDate: text('delivery_date'),
    informedDate: text('informed_date'),
    receivedDate: text('received_date'),
    expirationDays: integer('expiration_days'),
    notes: text('notes'),
    unitPrice: money('unit_price'),
    transportPrice: money('transport_price'),
    totalCost: money('total_cost'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('purchase_orders_request_date_idx').on(t.requestDate),
    index('purchase_orders_product_id_idx').on(t.productId),
    index('purchase_orders_supplier_id_idx').on(t.supplierId),
    check('purchase_orders_unit_check', inList('unit', UNITS)),
  ],
);

// ---- Sales side -----------------------------------------------------------------------

export const orders = pgTable(
  'orders',
  {
    id: id(),
    requestDate: text('request_date').notNull(),
    deliveryDate: text('delivery_date'),
    /** Not a foreign key: the UI may reference a customer saved in the same moment, or one deleted later. */
    customerId: text('customer_id'),
    customerName: text('customer_name').notNull(),
    customerPhone: text('customer_phone').notNull().default(''),
    customerEmail: text('customer_email'),
    customerAddress: text('customer_address'),
    customerIdentification: text('customer_identification'),
    items: jsonb('items').notNull().default(sql`'[]'::jsonb`),
    payments: jsonb('payments').notNull().default(sql`'[]'::jsonb`),
    totalValue: money('total_value').notNull().default(0),
    status: text('status').notNull().default('pending'),
    notes: text('notes'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('orders_delivery_date_idx').on(t.deliveryDate),
    index('orders_customer_id_idx').on(t.customerId),
    check('orders_status_check', inList('status', ORDER_STATUSES)),
  ],
);

export const quotations = pgTable(
  'quotations',
  {
    id: id(),
    date: text('date').notNull(),
    estimatedDeliveryDate: text('estimated_delivery_date'),
    /** Not a foreign key: the UI may reference a customer saved in the same moment, or one deleted later. */
    customerId: text('customer_id'),
    customerName: text('customer_name').notNull(),
    customerPhone: text('customer_phone').notNull().default(''),
    customerEmail: text('customer_email').notNull().default(''),
    customerAddress: text('customer_address'),
    customerIdentification: text('customer_identification'),
    items: jsonb('items').notNull().default(sql`'[]'::jsonb`),
    totalValue: money('total_value').notNull().default(0),
    notes: text('notes'),
    /** Customer's answer: 'si' | 'no'; null while undecided. */
    approved: text('approved'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('quotations_date_idx').on(t.date), index('quotations_customer_id_idx').on(t.customerId)],
);

export const quotationCollections = pgTable(
  'quotation_collections',
  {
    id: id(),
    quotationId: text('quotation_id')
      .notNull()
      .references(() => quotations.id, { onDelete: 'cascade' }),
    date: text('date').notNull(),
    amount: money('amount').notNull(),
    notes: text('notes'),
    createdAt: createdAt(),
  },
  (t) => [index('quotation_collections_quotation_id_idx').on(t.quotationId), index('quotation_collections_date_idx').on(t.date)],
);

export const quotationImportTrackings = pgTable(
  'quotation_import_trackings',
  {
    id: id(),
    quotationId: text('quotation_id')
      .notNull()
      .references(() => quotations.id, { onDelete: 'cascade' }),
    date: text('date').notNull(),
    status: text('status').notNull(),
    notes: text('notes'),
    createdAt: createdAt(),
  },
  (t) => [index('quotation_import_trackings_quotation_id_idx').on(t.quotationId), index('quotation_import_trackings_date_idx').on(t.date)],
);

export const credits = pgTable(
  'credits',
  {
    id: id(),
    /** Not a foreign key: the UI may reference a customer saved in the same moment, or one deleted later. */
    customerId: text('customer_id'),
    customerName: text('customer_name').notNull(),
    customerPhone: text('customer_phone').notNull().default(''),
    items: jsonb('items').notNull().default(sql`'[]'::jsonb`),
    totalValue: money('total_value').notNull().default(0),
    installments: integer('installments').notNull().default(1),
    status: text('status').notNull().default('active'),
    description: text('description').notNull().default(''),
    createdAt: text('created_at').notNull(),
    agreementDate: text('agreement_date'),
    expectedEndDate: text('expected_end_date'),
    notes: text('notes'),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('credits_created_at_idx').on(t.createdAt),
    index('credits_customer_id_idx').on(t.customerId),
    check('credits_status_check', inList('status', CREDIT_STATUSES)),
  ],
);

export const creditCollections = pgTable(
  'credit_collections',
  {
    id: id(),
    creditId: text('credit_id')
      .notNull()
      .references(() => credits.id, { onDelete: 'cascade' }),
    date: text('date').notNull(),
    amount: money('amount').notNull(),
    notes: text('notes'),
    createdAt: createdAt(),
  },
  (t) => [index('credit_collections_credit_id_idx').on(t.creditId), index('credit_collections_date_idx').on(t.date)],
);

export const expenses = pgTable(
  'expenses',
  {
    id: id(),
    date: text('date').notNull(),
    description: text('description').notNull(),
    category: text('category').notNull(),
    quantity: numeric('quantity', { mode: 'number' }).notNull().default(1),
    unitValue: money('unit_value').notNull().default(0),
    ivaPercentage: money('iva_percentage').notNull().default(0),
    ivaValue: money('iva_value').notNull().default(0),
    subTotal: money('sub_total').notNull().default(0),
    total: money('total').notNull(),
    supplierId: text('supplier_id').references(() => suppliers.id, { onDelete: 'set null' }),
    notes: text('notes'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('expenses_date_idx').on(t.date)],
);

// ---- Logistics --------------------------------------------------------------------------

export const trucks = pgTable(
  'trucks',
  {
    id: id(),
    plate: text('plate').notNull(),
    model: text('model').notNull().default(''),
    brand: text('brand').notNull().default(''),
    capacityTons: numeric('capacity_tons', { mode: 'number' }).notNull().default(0),
    fuelType: text('fuel_type').notNull().default(''),
    averageKmPerGallon: numeric('average_km_per_gallon', { mode: 'number' }).notNull().default(0),
    status: text('status').notNull().default('available'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('trucks_plate_idx').on(t.plate), check('trucks_status_check', inList('status', TRUCK_STATUSES))],
);

export const transportServices = pgTable(
  'transport_services',
  {
    id: id(),
    /** Not a foreign key: a service keeps its history if the truck is deleted. */
    truckId: text('truck_id').notNull(),
    /** Not a foreign key: the UI may reference a customer saved in the same moment, or one deleted later. */
    customerId: text('customer_id'),
    customerName: text('customer_name').notNull(),
    customerPhone: text('customer_phone').notNull().default(''),
    customerEmail: text('customer_email'),
    customerAddress: text('customer_address'),
    customerIdentification: text('customer_identification'),
    origin: text('origin').notNull(),
    destination: text('destination').notNull(),
    distanceKm: numeric('distance_km', { mode: 'number' }).notNull().default(0),
    estimatedTime: text('estimated_time').notNull().default(''),
    serviceDate: text('service_date').notNull(),
    status: text('status').notNull().default('pending'),
    /** Derived from transport_collections by the server. */
    paymentStatus: text('payment_status').notNull().default('pending'),
    totalFreightPrice: money('total_freight_price').notNull().default(0),
    /** Derived from transport_collections by the server. */
    totalPaid: money('total_paid').notNull().default(0),
    driverName: text('driver_name').notNull().default(''),
    driverId: text('driver_id').notNull().default(''),
    driverPhone: text('driver_phone').notNull().default(''),
    expenses: jsonb('expenses').notNull().default(sql`'[]'::jsonb`),
    notes: text('notes'),
    createdAt: text('created_at').notNull(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('transport_services_service_date_idx').on(t.serviceDate),
    index('transport_services_truck_id_idx').on(t.truckId),
    check('transport_services_status_check', inList('status', TRANSPORT_STATUSES)),
    check('transport_services_payment_status_check', inList('payment_status', TRANSPORT_PAYMENT_STATUSES)),
    check('transport_services_freight_non_negative', sql`${t.totalFreightPrice} >= 0`),
  ],
);

export const transportCollections = pgTable(
  'transport_collections',
  {
    id: id(),
    serviceId: text('service_id')
      .notNull()
      .references(() => transportServices.id, { onDelete: 'cascade' }),
    date: text('date').notNull(),
    amount: money('amount').notNull(),
    method: text('method').notNull().default(''),
    notes: text('notes'),
    createdAt: createdAt(),
  },
  (t) => [index('transport_collections_service_id_idx').on(t.serviceId), index('transport_collections_date_idx').on(t.date)],
);

// ---- Sync and migration bookkeeping ------------------------------------------------------

/**
 * One counter per data set, bumped in the same transaction as every write.
 * Browsers poll these counters and only reload the data sets that changed.
 */
export const dataVersions = pgTable('data_versions', {
  resource: text('resource').primaryKey(),
  version: integer('version').notNull().default(0),
  updatedAt: updatedAt(),
});

/** Remembers which Firestore documents were imported, so the importer can be re-run safely. */
export const legacyImportMap = pgTable(
  'legacy_import_map',
  {
    collection: text('collection').notNull(),
    sourceId: text('source_id').notNull(),
    targetId: text('target_id').notNull(),
    importedAt: timestamp('imported_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.collection, t.sourceId] })],
);
