import 'server-only';
import { eq, sql } from 'drizzle-orm';
import { db } from './db/client';
import * as t from './db/schema';
import { RESOURCE_DEFS } from './resources';
import { RESOURCES, type Resource } from './versions';
import { toProfile, type SessionUser } from './auth';

export const CONFIG_ID = 'inventory';

function serializeInvitation(i: typeof t.invitations.$inferSelect) {
  return {
    id: i.email,
    email: i.email,
    role: i.role,
    status: i.status,
    enabled: i.enabled,
    token: '', // never sent to the browser
    expiresAt: i.expiresAt || '',
    invitedAt: i.invitedAt || '',
    acceptedAt: i.acceptedAt || undefined,
    openedAt: i.openedAt || undefined,
    lastEmailBody: i.lastEmailBody || undefined,
    identificationNumber: i.identificationNumber || undefined,
    phone: i.phone || undefined,
    address: i.address || undefined,
    photoURL: i.photoUrl || undefined,
  };
}

/** Drops nulls so documents look like they did in Firestore (missing field = undefined). */
function compact<T extends Record<string, unknown>>(row: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) if (v !== null) out[k] = v;
  return out as T;
}

/** Fields that the UI types declare as `T | null`: keep the null. */
const KEEP_NULL: Partial<Record<Resource, string[]>> = {
  purchaseOrders: ['deliveryDate', 'informedDate', 'receivedDate', 'expirationDays', 'notes'],
  orders: ['deliveryDate'],
  quotations: ['estimatedDeliveryDate'],
  credits: ['expectedEndDate'],
};

function present(resource: Resource, row: Record<string, unknown>) {
  const out = compact(row) as Record<string, unknown>;
  for (const k of KEEP_NULL[resource] || []) if (row[k] === null) out[k] = null;
  delete out.updatedAt;
  delete out.sourceRef;
  if (resource !== 'products' && resource !== 'credits' && out.createdAt instanceof Date) delete out.createdAt;
  return out;
}

export async function loadConfig() {
  const [row] = await db.select().from(t.appConfig).where(eq(t.appConfig.id, CONFIG_ID)).limit(1);
  if (!row) return null;
  const { updatedAt: _u, ...rest } = row;
  return compact(rest);
}

/** Can this user read this data set? */
export function canRead(resource: Resource, user: SessionUser) {
  if (!user.isEnabled) return false;
  if (resource === 'users' || resource === 'invitations') return user.isAdmin;
  const def = RESOURCE_DEFS[resource];
  if (def?.read === 'admin') return user.isAdmin;
  return true;
}

export async function loadResource(resource: Resource): Promise<unknown> {
  if (resource === 'users') {
    const rows = await db.select().from(t.users).orderBy(t.users.email);
    return rows.map(toProfile);
  }
  if (resource === 'invitations') {
    const rows = await db.select().from(t.invitations).orderBy(t.invitations.email);
    return rows.map(serializeInvitation);
  }
  if (resource === 'config') return loadConfig();
  const def = RESOURCE_DEFS[resource];
  if (!def) throw new Error(`recurso desconocido: ${resource}`);
  const rows = await db
    .select()
    .from(def.table)
    .orderBy(...(def.orderBy as any[]));
  return (rows as Record<string, unknown>[]).map((r) => present(resource, r));
}

export function parseResourceList(param: string | null): Resource[] {
  if (!param) return [...RESOURCES];
  const wanted = new Set(param.split(',').map((s) => s.trim()));
  return RESOURCES.filter((r) => wanted.has(r));
}

/** Public catalog: what the web portal shows to visitors (no costs, margins or suppliers). */
export async function loadPublicCatalog() {
  const rows = await db
    .select({
      id: t.products.id,
      referenceCode: t.products.referenceCode,
      name: t.products.name,
      description: t.products.description,
      animalType: t.products.animalType,
      category: t.products.category,
      imageUrl: t.products.imageUrl,
      mainUnit: t.products.mainUnit,
      salePrice: t.products.salePrice,
      stock: t.products.stock,
      createdAt: t.products.createdAt,
    })
    .from(t.products)
    .orderBy(t.products.id);
  const [animalTypes, categories, config] = await Promise.all([
    db.select({ id: t.animalTypes.id, name: t.animalTypes.name }).from(t.animalTypes).orderBy(sql`${t.animalTypes.name} collate "C"`),
    db.select({ id: t.categories.id, name: t.categories.name }).from(t.categories).orderBy(sql`${t.categories.name} collate "C"`),
    loadConfig(),
  ]);
  const publicConfig = config
    ? {
        id: CONFIG_ID,
        companyName: config.companyName,
        companyPhone: config.companyPhone,
        companyEmail: config.companyEmail,
        companyAddress: config.companyAddress,
        logoUrl: config.logoUrl,
        iconUrl: config.iconUrl,
      }
    : null;
  return {
    products: rows.map((r) => ({
      ...compact(r),
      // Fields the UI type requires; visitors never see real costs.
      stockInBundles: 0,
      costPrice: 0,
      profitPercentage: 0,
      transportPricePerBundle: 0,
    })),
    animalTypes,
    categories,
    config: publicConfig ? compact(publicConfig) : null,
  };
}
