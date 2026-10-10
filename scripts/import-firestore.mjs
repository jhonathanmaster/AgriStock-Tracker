/**
 * Imports a Firestore backup (from scripts/firestore-export.cjs) into PostgreSQL.
 *
 *   node scripts/import-firestore.mjs [firebase-backup.json] [--dry-run]
 *
 * - Keeps the Firestore ids, so references between documents stay valid.
 * - Validates and fixes each document against the new schema; what can't be fixed is
 *   skipped and listed in the report.
 * - Runs in one transaction: if anything fails, nothing is saved.
 * - Safe to re-run: documents that already exist are left untouched (no duplicates).
 * - Writes reporte-importacion.txt (what was skipped or adjusted) and
 *   reporte-stock.csv (stock in Firebase vs. the movement history, product by product).
 *
 * Needs DATABASE_URL and the tables created (start the app once before importing).
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createRequire } from 'module';

// `pg` comes from the app's node_modules (NODE_PATH inside the Docker image, or the project folder).
const require = createRequire(path.join(process.env.NODE_PATH || process.cwd(), 'noop.js'));
let pg;
try {
  pg = require('pg');
} catch {
  pg = createRequire(import.meta.url)('pg');
}

const args = process.argv.slice(2);
const backupPath = path.resolve(args.find((a) => !a.startsWith('--')) || 'firebase-backup.json');
const dryRun = args.includes('--dry-run');
const outDir = path.dirname(backupPath);

function fail(msg) {
  console.error(`\n[import] ERROR: ${msg}`);
  process.exit(1);
}

// ---- Value helpers -----------------------------------------------------------------------
const UNITS = ['libras', 'kilos', 'bultos', 'unidades'];

/** Restores tagged values from the export: timestamps become ISO strings (as the app stores dates). */
function revive(v) {
  if (v === null || v === undefined) return v;
  if (Array.isArray(v)) return v.map(revive);
  if (typeof v === 'object') {
    if (v.__type === 'timestamp') return v.value;
    if (v.__type === 'reference') return v.path.split('/').pop();
    if (v.__type === 'geopoint' || v.__type === 'bytes') return null;
    const out = {};
    for (const [k, val] of Object.entries(v)) out[k] = revive(val);
    return out;
  }
  return v;
}
const num = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};
const int = (v) => {
  const n = num(v);
  return n === null ? null : Math.round(n);
};
const str = (v, max = 20000) => {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return typeof v === 'string' ? v.slice(0, max) : null;
};
/** Dates are stored as the app wrote them (strings); timestamps already became ISO strings. */
const dateStr = (v) => {
  if (typeof v === 'string' && v.trim()) return v.trim().slice(0, 40);
  if (typeof v === 'number' && Number.isFinite(v)) return new Date(v).toISOString();
  return null;
};
const isoDate = (v) => {
  const s = dateStr(v);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
};
const bool = (v) => v === true || v === 'true';
const bundlesFor = (stock, unit) => (unit === 'bultos' ? stock : unit === 'kilos' ? stock / 40 : 0);
const sha256 = (v) => crypto.createHash('sha256').update(v).digest('hex');

// ---- Load backup -------------------------------------------------------------------------
if (!fs.existsSync(backupPath)) fail(`No encuentro ${path.basename(backupPath)}. Primero ejecuta "Exportar Firebase".`);
let backup;
try {
  backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
} catch {
  fail(`${path.basename(backupPath)} no es un JSON válido.`);
}
if (!String(backup.format || '').endsWith('-firestore-backup/v1') || typeof backup.collections !== 'object') {
  fail('El archivo no tiene el formato esperado de la copia de Firebase.');
}
const exportedAt = backup.exportedAt || new Date().toISOString();

/** Flattened docs of one collection: [{ __id, ...data }] */
const docsOf = (name) => (backup.collections[name] || []).filter((d) => d.exists && d.data).map((d) => ({ __id: d.id, ...revive(d.data) }));

const KNOWN = [
  'users', 'invitations', 'suppliers', 'customers', 'products', 'inventoryMovements', 'inventoryAudits', 'purchaseOrders',
  'purchaseOrderStatuses', 'animalTypes', 'categories', 'expenseCategories', 'unitConversions', 'expenses', 'orders',
  'quotations', 'quotationCollections', 'quotationImportTrackings', 'credits', 'creditCollections', 'config',
];
const unknown = Object.keys(backup.collections).filter((c) => !KNOWN.includes(c));

console.log(`[import] copia del ${exportedAt} (proyecto ${backup.projectId})`);
console.log(`[import] documentos en la copia: ${Object.entries(backup.counts || {}).map(([k, v]) => `${k}=${v}`).join(', ')}`);
if (unknown.length) console.log(`[import] Aviso: colecciones que la app no usa y no se importan: ${unknown.join(', ')}`);

// ---- Report ------------------------------------------------------------------------------
const report = {};
const details = [];
const note = (col, key, why) => {
  report[col] = report[col] || { importados: 0, ya_existian: 0, ajustados: 0, omitidos: 0 };
  report[col][key]++;
  if (why) details.push(`[${col}] ${key === 'omitidos' ? 'OMITIDO' : 'AJUSTADO'}: ${why}`);
};

// ---- Import ------------------------------------------------------------------------------
if (!process.env.DATABASE_URL) fail('DATABASE_URL no está definido.');
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});
let client;
try {
  client = await pool.connect();
  const { rows } = await client.query(`select to_regclass('public.products') as t, to_regclass('public.data_versions') as v`);
  if (!rows[0].t || !rows[0].v) fail('Las tablas no existen todavía. Arranca la app una vez (Iniciar GeiaTienda) y vuelve a intentarlo.');
} catch (err) {
  if (!client) fail(`No pude conectarme a la base de datos (${err.code || err.message}). ¿Está corriendo la app?`);
  throw err;
}

/** insert ... on conflict do nothing; tracks the result in legacy_import_map and the report. */
async function insertRow(col, table, sourceId, values, adjustedWhy) {
  const cols = Object.keys(values);
  const params = cols.map((_, i) => `$${i + 1}`);
  const sql = `insert into ${table} (${cols.map((c) => `"${c}"`).join(', ')}) values (${params.join(', ')}) on conflict do nothing returning 1`;
  const { rowCount } = await client.query(sql, cols.map((c) => values[c]));
  if (!rowCount) {
    note(col, 'ya_existian');
    return false;
  }
  await client.query(
    'insert into legacy_import_map (collection, source_id, target_id) values ($1, $2, $3) on conflict do nothing',
    [col, sourceId, String(values.id ?? values.email ?? sourceId)],
  );
  note(col, 'importados');
  if (adjustedWhy && adjustedWhy.length) note(col, 'ajustados', `${sourceId}: ${adjustedWhy.join('; ')}`);
  return true;
}

const existingIds = async (table) => new Set((await client.query(`select id from ${table}`)).rows.map((r) => r.id));

try {
  await client.query('begin');

  // ---- Users (ids = Firebase uid; they sign in with Google, matched by email) ----
  const users = docsOf('users');
  const byEmail = new Map();
  for (const u of users) {
    const email = str(u.email, 254)?.toLowerCase().trim();
    if (!email) {
      note('users', 'omitidos', `${u.__id}: sin email`);
      continue;
    }
    const prev = byEmail.get(email);
    if (!prev || (isoDate(u.lastLogin)?.getTime() || 0) > (isoDate(prev.lastLogin)?.getTime() || 0)) {
      if (prev) note('users', 'omitidos', `${prev.__id}: email repetido ${email} (se conserva el de último acceso más reciente)`);
      byEmail.set(email, u);
    } else note('users', 'omitidos', `${u.__id}: email repetido ${email}`);
  }
  for (const [email, u] of byEmail) {
    const adj = [];
    const role = ['admin', 'operario'].includes(u.role) ? u.role : (adj.push(`rol "${u.role ?? ''}" → operario`), 'operario');
    const history = (Array.isArray(u.accessHistory) ? u.accessHistory : []).map(isoDate).filter(Boolean).slice(0, 10);
    const exists = await client.query('select id from users where email = $1', [email]);
    if (exists.rowCount) {
      note('users', 'ya_existian');
      continue;
    }
    await insertRow('users', 'users', u.__id, {
      id: u.__id,
      email,
      display_name: str(u.displayName, 200),
      photo_url: str(u.photoURL, 8_000_000),
      enabled: bool(u.enabled),
      role,
      last_login: isoDate(u.lastLogin),
      access_history: history,
      identification_number: str(u.identificationNumber, 100),
      phone: str(u.phone, 100),
      address: str(u.address, 1000),
    }, adj);
  }

  // ---- Invitations (doc id = email; only a hash of the token is kept) ----
  for (const inv of docsOf('invitations')) {
    const email = (str(inv.email, 254) || inv.__id).toLowerCase().trim();
    if (!email.includes('@')) {
      note('invitations', 'omitidos', `${inv.__id}: email inválido`);
      continue;
    }
    await insertRow('invitations', 'invitations', inv.__id, {
      email,
      role: ['admin', 'operario'].includes(inv.role) ? inv.role : 'operario',
      status: inv.status === 'accepted' ? 'accepted' : 'pending',
      enabled: inv.enabled !== false,
      token_hash: inv.token ? sha256(String(inv.token)) : null,
      expires_at: dateStr(inv.expiresAt),
      invited_at: dateStr(inv.invitedAt),
      accepted_at: dateStr(inv.acceptedAt),
      opened_at: dateStr(inv.openedAt),
      last_email_body: str(inv.lastEmailBody),
      identification_number: str(inv.identificationNumber, 100),
      phone: str(inv.phone, 100),
      address: str(inv.address, 1000),
      photo_url: str(inv.photoURL, 8_000_000),
    });
  }

  // ---- Simple catalogs ----
  for (const [col, table] of [['animalTypes', 'animal_types'], ['categories', 'categories'], ['expenseCategories', 'expense_categories']]) {
    for (const d of docsOf(col)) {
      const name = str(d.name, 200)?.trim();
      if (!name) {
        note(col, 'omitidos', `${d.__id}: sin nombre`);
        continue;
      }
      await insertRow(col, table, d.__id, { id: d.__id, name });
    }
  }

  const seenPairs = new Set((await client.query('select from_unit, to_unit from unit_conversions')).rows.map((r) => `${r.from_unit}>${r.to_unit}`));
  const conversionIds = await existingIds('unit_conversions');
  for (const d of docsOf('unitConversions')) {
    if (conversionIds.has(d.__id)) {
      note('unitConversions', 'ya_existian');
      continue;
    }
    const factor = num(d.factor);
    if (!UNITS.includes(d.from) || !UNITS.includes(d.to) || !(factor > 0)) {
      note('unitConversions', 'omitidos', `${d.__id}: ${d.from}→${d.to} factor ${d.factor}`);
      continue;
    }
    if (seenPairs.has(`${d.from}>${d.to}`)) {
      note('unitConversions', 'omitidos', `${d.__id}: conversión ${d.from}→${d.to} repetida`);
      continue;
    }
    seenPairs.add(`${d.from}>${d.to}`);
    await insertRow('unitConversions', 'unit_conversions', d.__id, { id: d.__id, from_unit: d.from, to_unit: d.to, factor });
  }

  for (const d of docsOf('purchaseOrderStatuses')) {
    const name = str(d.name, 200)?.trim();
    if (!name) {
      note('purchaseOrderStatuses', 'omitidos', `${d.__id}: sin nombre`);
      continue;
    }
    await insertRow('purchaseOrderStatuses', 'purchase_order_statuses', d.__id, {
      id: d.__id, name, description: str(d.description, 2000), color: str(d.color, 40), sort_order: int(d.order) ?? 0,
    });
  }

  // ---- Config ----
  for (const d of docsOf('config')) {
    if (d.__id !== 'inventory') {
      note('config', 'omitidos', `${d.__id}: documento de configuración desconocido`);
      continue;
    }
    await insertRow('config', 'app_config', d.__id, {
      id: 'inventory',
      critical_stock_threshold: num(d.criticalStockThreshold),
      initial_capital: num(d.initialCapital),
      company_name: str(d.companyName, 500),
      company_nit: str(d.companyNit, 100),
      company_address: str(d.companyAddress, 1000),
      company_phone: str(d.companyPhone, 100),
      company_email: str(d.companyEmail, 500),
      representative_name: str(d.representativeName, 500),
      representative_position: str(d.representativePosition, 500),
      logo_url: str(d.logoUrl, 8_000_000),
      icon_url: str(d.iconUrl, 8_000_000),
      signature_url: str(d.signatureUrl, 8_000_000),
    });
  }

  // ---- Suppliers & customers ----
  for (const d of docsOf('suppliers')) {
    const name = str(d.name, 500)?.trim();
    if (!name) {
      note('suppliers', 'omitidos', `${d.__id}: sin nombre`);
      continue;
    }
    await insertRow('suppliers', 'suppliers', d.__id, {
      id: d.__id, name, identification_number: str(d.identificationNumber, 100), contact_name: str(d.contactName, 500),
      phone: str(d.phone, 100), email: str(d.email, 500), address: str(d.address, 1000),
    });
  }
  for (const d of docsOf('customers')) {
    const adj = [];
    let name = str(d.name, 500)?.trim();
    if (!name) {
      name = 'Cliente';
      adj.push('sin nombre → "Cliente"');
    }
    await insertRow('customers', 'customers', d.__id, {
      id: d.__id, name, identification_number: str(d.identificationNumber, 100), phone: str(d.phone, 100),
      email: str(d.email, 500), address: str(d.address, 1000), last_purchase_date: dateStr(d.lastPurchaseDate),
    }, adj);
  }
  const supplierIds = await existingIds('suppliers');

  // ---- Products (stock as Firebase had it) ----
  for (const d of docsOf('products')) {
    const adj = [];
    const name = str(d.name, 500)?.trim();
    if (!name) {
      note('products', 'omitidos', `${d.__id}: sin nombre`);
      continue;
    }
    let mainUnit = d.mainUnit;
    if (!UNITS.includes(mainUnit)) {
      adj.push(`unidad "${mainUnit ?? ''}" → kilos`);
      mainUnit = 'kilos';
    }
    const money = (field) => {
      const n = num(d[field]);
      if (n === null) return 0;
      if (n < 0) {
        adj.push(`${field} negativo (${n}) → 0`);
        return 0;
      }
      return n;
    };
    let stock = num(d.stock);
    if (stock === null) {
      if (d.stock !== undefined) adj.push(`stock "${d.stock}" no numérico → 0`);
      stock = 0;
    }
    let supplierId = str(d.supplierId, 200) || null;
    if (supplierId && !supplierIds.has(supplierId)) {
      adj.push(`proveedor ${supplierId} no existe → sin proveedor`);
      supplierId = null;
    }
    await insertRow('products', 'products', d.__id, {
      id: d.__id,
      reference_code: str(d.referenceCode, 200) || '',
      name,
      description: str(d.description) || '',
      animal_type: str(d.animalType, 200) || 'No Aplica',
      category: str(d.category, 200) || '',
      supplier_id: supplierId,
      image_url: str(d.imageUrl, 8_000_000),
      stock,
      stock_in_bundles: bundlesFor(stock, mainUnit),
      main_unit: mainUnit,
      cost_price: money('costPrice'),
      profit_percentage: num(d.profitPercentage) ?? 0,
      sale_price: money('salePrice'),
      transport_price_per_bundle: money('transportPricePerBundle'),
      is_imported: bool(d.isImported),
      origin: str(d.origin, 500),
      import_cost: num(d.importCost),
      created_at: dateStr(d.createdAt),
    }, adj);
  }
  const productRows = (await client.query('select id, main_unit, stock from products')).rows;
  const productById = new Map(productRows.map((p) => [p.id, p]));

  // ---- Inventory movements ----
  const movementDocs = docsOf('inventoryMovements');
  const receptionRefs = new Set(
    (await client.query(`select source_ref from inventory_movements where source_ref is not null`)).rows.map((r) => r.source_ref),
  );
  for (const d of movementDocs) {
    const adj = [];
    if (!['entrada', 'salida', 'venta'].includes(d.type)) {
      note('inventoryMovements', 'omitidos', `${d.__id}: tipo "${d.type ?? ''}" desconocido`);
      continue;
    }
    const quantity = num(d.quantity);
    if (quantity === null) {
      note('inventoryMovements', 'omitidos', `${d.__id}: cantidad "${d.quantity ?? ''}" no numérica`);
      continue;
    }
    let productId = str(d.productId, 200) || null;
    const product = productId ? productById.get(productId) : null;
    if (productId && !product) {
      adj.push(`producto ${productId} ya no existe (se conserva el movimiento sin producto)`);
      productId = null;
    }
    let unit = d.unit;
    if (!UNITS.includes(unit)) {
      unit = product?.main_unit || 'kilos';
      adj.push(`unidad "${d.unit ?? ''}" → ${unit}`);
    }
    let when = dateStr(d.movementDateTime);
    if (!when) {
      when = exportedAt;
      adj.push('sin fecha → fecha de la exportación');
    }
    // Receptions of purchase orders: remember them so receiving the same order again won't add stock twice.
    let sourceRef = null;
    const m = /^Recepción O\.C\. #(\S+)$/.exec(str(d.notes, 500) || '');
    if (m && d.type === 'entrada') {
      const ref = `purchase-order:${m[1]}`;
      if (receptionRefs.has(ref)) adj.push(`la O.C. ${m[1]} se recibió más de una vez en Firebase (revisar)`);
      else {
        sourceRef = ref;
        receptionRefs.add(ref);
      }
    }
    await insertRow('inventoryMovements', 'inventory_movements', d.__id, {
      id: d.__id,
      product_id: productId,
      type: d.type,
      quantity,
      unit,
      movement_date_time: when,
      notes: str(d.notes),
      total_value: num(d.totalValue),
      sub_total: num(d.subTotal),
      iva_percentage: num(d.ivaPercentage),
      iva_value: num(d.ivaValue),
      customer_name: str(d.customerName, 500),
      customer_phone: str(d.customerPhone, 100),
      customer_email: str(d.customerEmail, 500),
      customer_address: str(d.customerAddress, 1000),
      customer_identification: str(d.customerIdentification, 100),
      performed_by: str(d.performedBy, 200),
      performed_by_name: str(d.performedByName, 500),
      source_ref: sourceRef,
    }, adj);
  }

  // ---- Inventory audits ----
  for (const d of docsOf('inventoryAudits')) {
    const adj = [];
    const verified = num(d.verifiedQuantity);
    if (verified === null) {
      note('inventoryAudits', 'omitidos', `${d.__id}: cantidad verificada no numérica`);
      continue;
    }
    let productId = str(d.productId, 200) || null;
    if (productId && !productById.has(productId)) {
      adj.push(`producto ${productId} ya no existe`);
      productId = null;
    }
    await insertRow('inventoryAudits', 'inventory_audits', d.__id, {
      id: d.__id, product_id: productId, product_name: str(d.productName, 1000), system_quantity: num(d.systemQuantity),
      verified_quantity: verified, difference: num(d.difference), unit: str(d.unit, 40), audit_date: dateStr(d.auditDate) || exportedAt,
      performed_by: str(d.performedBy, 200), performed_by_name: str(d.performedByName, 500), notes: str(d.notes), applied: bool(d.applied),
    }, adj);
  }

  // ---- Purchase orders ----
  for (const d of docsOf('purchaseOrders')) {
    const adj = [];
    let productId = str(d.productId, 200) || null;
    if (productId && !productById.has(productId)) {
      adj.push(`producto ${productId} ya no existe`);
      productId = null;
    }
    let supplierId = str(d.supplierId, 200) || null;
    if (supplierId && !supplierIds.has(supplierId)) {
      adj.push(`proveedor ${supplierId} ya no existe`);
      supplierId = null;
    }
    let unit = d.unit;
    if (!UNITS.includes(unit)) {
      unit = productById.get(productId)?.main_unit || 'kilos';
      adj.push(`unidad "${d.unit ?? ''}" → ${unit}`);
    }
    let quantity = num(d.quantity);
    if (quantity === null) {
      quantity = 0;
      adj.push('cantidad no numérica → 0');
    }
    await insertRow('purchaseOrders', 'purchase_orders', d.__id, {
      id: d.__id, product_id: productId, supplier_id: supplierId, quantity, unit, status: str(d.status, 200) || 'Solicitado',
      request_date: dateStr(d.requestDate) || exportedAt, delivery_date: dateStr(d.deliveryDate), informed_date: dateStr(d.informedDate),
      received_date: dateStr(d.receivedDate), expiration_days: int(d.expirationDays), notes: str(d.notes), unit_price: num(d.unitPrice),
      transport_price: num(d.transportPrice), total_cost: num(d.totalCost),
    }, adj);
  }

  // ---- Expenses ----
  for (const d of docsOf('expenses')) {
    const adj = [];
    const total = num(d.total);
    if (total === null) {
      note('expenses', 'omitidos', `${d.__id}: total no numérico`);
      continue;
    }
    let supplierId = str(d.supplierId, 200) || null;
    if (supplierId && !supplierIds.has(supplierId)) {
      adj.push(`proveedor ${supplierId} ya no existe`);
      supplierId = null;
    }
    await insertRow('expenses', 'expenses', d.__id, {
      id: d.__id, date: dateStr(d.date) || exportedAt, description: str(d.description, 2000) || '(sin descripción)',
      category: str(d.category, 200) || 'Sin categoría', quantity: num(d.quantity) ?? 1, unit_value: num(d.unitValue) ?? 0,
      iva_percentage: num(d.ivaPercentage) ?? 0, iva_value: num(d.ivaValue) ?? 0, sub_total: num(d.subTotal) ?? 0, total,
      supplier_id: supplierId, notes: str(d.notes),
    }, adj);
  }

  // ---- Orders, quotations, credits (+ their payments) ----
  const jsonArray = (v) => JSON.stringify(Array.isArray(v) ? v : []);
  for (const d of docsOf('orders')) {
    const adj = [];
    let status = d.status;
    if (!['pending', 'delivered', 'cancelled', 'paid'].includes(status)) {
      adj.push(`estado "${status ?? ''}" → pending`);
      status = 'pending';
    }
    await insertRow('orders', 'orders', d.__id, {
      id: d.__id, request_date: dateStr(d.requestDate) || exportedAt, delivery_date: dateStr(d.deliveryDate),
      customer_id: str(d.customerId, 200) || null, customer_name: str(d.customerName, 500) || 'Cliente', customer_phone: str(d.customerPhone, 100) || '',
      customer_email: str(d.customerEmail, 500), customer_address: str(d.customerAddress, 1000), customer_identification: str(d.customerIdentification, 100),
      items: jsonArray(d.items), payments: jsonArray(d.payments), total_value: num(d.totalValue) ?? 0, status, notes: str(d.notes),
    }, adj);
  }
  for (const d of docsOf('quotations')) {
    await insertRow('quotations', 'quotations', d.__id, {
      id: d.__id, date: dateStr(d.date) || exportedAt, estimated_delivery_date: dateStr(d.estimatedDeliveryDate),
      customer_id: str(d.customerId, 200) || null, customer_name: str(d.customerName, 500) || 'Cliente', customer_phone: str(d.customerPhone, 100) || '',
      customer_email: str(d.customerEmail, 500) || '', customer_address: str(d.customerAddress, 1000), customer_identification: str(d.customerIdentification, 100),
      items: jsonArray(d.items), total_value: num(d.totalValue) ?? 0, notes: str(d.notes),
    });
  }
  const quotationIds = await existingIds('quotations');
  for (const [col, table] of [['quotationCollections', 'quotation_collections'], ['quotationImportTrackings', 'quotation_import_trackings']]) {
    for (const d of docsOf(col)) {
      if (!quotationIds.has(d.quotationId)) {
        note(col, 'omitidos', `${d.__id}: la cotización ${d.quotationId} no existe`);
        continue;
      }
      const values = { id: d.__id, quotation_id: d.quotationId, date: dateStr(d.date) || exportedAt, notes: str(d.notes) };
      if (col === 'quotationCollections') {
        const amount = num(d.amount);
        if (amount === null) {
          note(col, 'omitidos', `${d.__id}: monto no numérico`);
          continue;
        }
        values.amount = amount;
      } else values.status = str(d.status, 500) || '(sin estado)';
      await insertRow(col, table, d.__id, values);
    }
  }
  for (const d of docsOf('credits')) {
    const adj = [];
    let status = d.status;
    if (!['active', 'paid', 'cancelled'].includes(status)) {
      adj.push(`estado "${status ?? ''}" → active`);
      status = 'active';
    }
    await insertRow('credits', 'credits', d.__id, {
      id: d.__id, customer_id: str(d.customerId, 200) || null, customer_name: str(d.customerName, 500) || 'Cliente',
      customer_phone: str(d.customerPhone, 100) || '', items: jsonArray(d.items), total_value: num(d.totalValue) ?? 0,
      installments: Math.max(0, int(d.installments) ?? 1), status, description: str(d.description) || '',
      created_at: dateStr(d.createdAt) || exportedAt, agreement_date: dateStr(d.agreementDate), expected_end_date: dateStr(d.expectedEndDate),
      notes: str(d.notes),
    }, adj);
  }
  const creditIds = await existingIds('credits');
  for (const d of docsOf('creditCollections')) {
    const amount = num(d.amount);
    if (!creditIds.has(d.creditId) || amount === null) {
      note('creditCollections', 'omitidos', `${d.__id}: ${amount === null ? 'monto no numérico' : `el crédito ${d.creditId} no existe`}`);
      continue;
    }
    await insertRow('creditCollections', 'credit_collections', d.__id, {
      id: d.__id, credit_id: d.creditId, date: dateStr(d.date) || exportedAt, amount, notes: str(d.notes),
    });
  }

  // Open browsers reload everything on their next check.
  await client.query(
    `insert into data_versions (resource, version) select r, 1 from unnest($1::text[]) as r
     on conflict (resource) do update set version = data_versions.version + 1, updated_at = now()`,
    [[
      'products', 'movements', 'purchaseOrders', 'expenses', 'orders', 'quotations', 'quotationCollections', 'quotationImportTrackings',
      'credits', 'creditCollections', 'audits', 'expenseCategories', 'purchaseOrderStatusDefinitions', 'conversions', 'users',
      'invitations', 'customers', 'animalTypes', 'categories', 'suppliers', 'config',
    ]],
  );

  // ---- Stock check: Firebase stock vs. what the movement history explains ----
  const { rows: conv } = await client.query('select from_unit as "from", to_unit as "to", factor::float8 as factor from unit_conversions');
  const convert = (q, from, to) => {
    if (!q || from === to) return q || 0;
    const c = conv.find((x) => x.from === from && x.to === to);
    if (c) return q * c.factor;
    let kg = q;
    if (from === 'bultos') kg = q * 40;
    else if (from === 'libras') kg = q * 0.453592;
    if (to === 'kilos') return kg;
    if (to === 'bultos') return kg / 40;
    if (to === 'libras') return kg * 2.20462;
    return kg;
  };
  const { rows: prods } = await client.query('select id, reference_code, name, main_unit, stock::float8 as stock from products order by name');
  const { rows: movs } = await client.query('select product_id, type, quantity::float8 as quantity, unit from inventory_movements where product_id is not null');
  const net = new Map();
  const prodById = new Map(prods.map((x) => [x.id, x]));
  for (const m of movs) {
    const p = prodById.get(m.product_id);
    if (!p) continue;
    const q = convert(m.quantity, m.unit, p.main_unit);
    net.set(p.id, (net.get(p.id) || 0) + (m.type === 'entrada' ? q : -q));
  }
  const round = (n) => Math.round(n * 1000) / 1000;
  const csv = ['referencia;producto;unidad;stock_firebase;entradas_menos_salidas;stock_inicial_implicito;observacion'];
  let suspicious = 0;
  for (const p of prods) {
    const n = net.get(p.id) || 0;
    const implied = round(p.stock - n);
    let obs = '';
    if (p.stock < 0) obs = 'stock negativo';
    else if (implied < 0) obs = 'el historial explica más stock del que hay (posibles ventas o recepciones perdidas)';
    if (obs) suspicious++;
    const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    csv.push([cell(p.reference_code), cell(p.name), p.main_unit, round(p.stock), round(n), implied, cell(obs)].join(';'));
  }

  if (dryRun) {
    await client.query('rollback');
    console.log('\n[import] PRUEBA (--dry-run): no se guardó nada.');
  } else {
    await client.query('commit');
  }

  console.log('\n[import] resultado:');
  for (const [col, r] of Object.entries(report)) {
    const parts = Object.entries(r).filter(([, v]) => v > 0).map(([k, v]) => `${k.replace('_', ' ')}: ${v}`);
    console.log(`  ${col.padEnd(26)} ${parts.join(', ')}`);
  }
  const reportFile = path.join(outDir, 'reporte-importacion.txt');
  fs.writeFileSync(
    reportFile,
    [
      `Importación de ${path.basename(backupPath)} (${exportedAt}) ${dryRun ? '[PRUEBA, no se guardó]' : ''}`,
      '',
      ...Object.entries(report).map(([c, r]) => `${c}: ${JSON.stringify(r)}`),
      '',
      details.length ? 'Detalle de documentos omitidos o ajustados:' : 'No hubo documentos omitidos ni ajustados.',
      ...details,
      unknown.length ? `\nColecciones no importadas (la app no las usa): ${unknown.join(', ')}` : '',
    ].join('\n'),
  );
  const stockFile = path.join(outDir, 'reporte-stock.csv');
  fs.writeFileSync(stockFile, csv.join('\n'));
  console.log(`\n[import] detalle en ${path.basename(reportFile)}; revisión de stock en ${path.basename(stockFile)}`);
  if (suspicious) console.log(`[import] ${suspicious} producto(s) con stock sospechoso en Firebase (ver reporte-stock.csv).`);
  if (details.length) console.log(`[import] ${details.length} documento(s) omitidos o ajustados (ver reporte-importacion.txt).`);
  if (!dryRun) console.log('\n[import] listo. Recarga la app para ver los datos.');
} catch (err) {
  await client.query('rollback').catch(() => {});
  fail(`${err.message}. No se guardó ningún cambio.`);
} finally {
  client.release();
  await pool.end();
}
