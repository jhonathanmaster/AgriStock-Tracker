import 'server-only';
import { eq, sql } from 'drizzle-orm';
import { db, type Tx } from './db/client';
import * as t from './db/schema';
import { ALSO_TOUCHES, RESOURCE_DEFS, type Access, type ResourceDef } from './resources';
import { RESOURCES, bumpVersions, type Resource } from './versions';
import { requireAdmin, requireEnabled, type SessionUser } from './auth';
import { badRequest, notFound } from './http';
import { newId } from './ids';
import { syncPurchaseOrderStock } from './purchase-orders';

function resolve(name: string): { resource: Resource; def: ResourceDef } {
  if (!(RESOURCES as readonly string[]).includes(name)) throw notFound('Recurso desconocido');
  const resource = name as Resource;
  const def = RESOURCE_DEFS[resource];
  if (!def) throw notFound('Recurso desconocido');
  return { resource, def };
}

const authorize = (access: Access): Promise<SessionUser> => (access === 'admin' ? requireAdmin() : requireEnabled());

/** Fields the server sets itself for some data sets. */
function serverFields(resource: Resource, me: SessionUser, isCreate: boolean): Record<string, unknown> {
  if (resource === 'audits' && isCreate) return { performedBy: me.id, performedByName: me.displayName || me.email, applied: false };
  return {};
}

/**
 * A transport service's totalPaid and paymentStatus always follow its collections, so two
 * people registering payments at the same time can't overwrite each other.
 */
async function syncTransportPayment(tx: Tx, serviceId: string | null | undefined) {
  if (!serviceId) return;
  await tx.execute(sql`
    update ${t.transportServices} s
       set total_paid = p.paid,
           payment_status = case when p.paid <= 0 then 'pending'
                                 when p.paid >= s.total_freight_price then 'paid'
                                 else 'partial' end,
           updated_at = now()
      from (select coalesce(sum(amount), 0) as paid from ${t.transportCollections} where service_id = ${serviceId}) p
     where s.id = ${serviceId}`);
}

/** Data sets whose derived fields change when this one is created or edited. */
const DERIVED: Partial<Record<Resource, Resource[]>> = {
  transportCollections: ['transportServices'],
  purchaseOrders: ['products', 'movements'],
};

/** Keeps derived data consistent after a generic write, inside the same transaction. */
async function afterWrite(tx: Tx, resource: Resource, row: Record<string, any> | undefined, me: SessionUser, before?: Record<string, any> | null) {
  if (!row) return;
  // Creating or editing an order straight into "Recibido" from the form must add it to stock too.
  if (resource === 'purchaseOrders') await syncPurchaseOrderStock(tx, (before as any) ?? null, row as any, me);
  if (resource === 'transportCollections') await syncTransportPayment(tx, row.serviceId);
  if (resource === 'transportServices') await syncTransportPayment(tx, row.id);
}

const hasUpdatedAt = (def: ResourceDef) => 'updatedAt' in (def.table as unknown as Record<string, unknown>);

export async function createGeneric(name: string, body: unknown) {
  const { resource, def } = resolve(name);
  if (!def.write || !def.create) throw badRequest('Este recurso no se puede crear así');
  const me = await authorize(def.write);
  const values = { ...def.create.parse(body), ...serverFields(resource, me, true), id: newId() };
  return db.transaction(async (tx) => {
    if (resource === 'transportCollections') {
      const [service] = await tx.select({ id: t.transportServices.id }).from(t.transportServices).where(eq(t.transportServices.id, (values as any).serviceId)).for('update');
      if (!service) throw notFound('El servicio de transporte no existe');
    }
    const [row] = await tx.insert(def.table).values(values as any).returning();
    await afterWrite(tx, resource, row as any, me);
    await bumpVersions(tx, [resource, ...(DERIVED[resource] || [])]);
    return row;
  });
}

export async function updateGeneric(name: string, id: string, body: unknown) {
  const { resource, def } = resolve(name);
  if (!def.write || !def.create) throw badRequest('Este recurso no se puede modificar así');
  const me = await authorize(def.write);
  const patch: Record<string, unknown> = def.create.partial().parse(body);
  for (const k of Object.keys(patch)) if (patch[k] === undefined) delete patch[k];
  if (hasUpdatedAt(def)) patch.updatedAt = new Date();
  if (Object.keys(patch).length === 0) return { id };
  return db.transaction(async (tx) => {
    const before =
      resource === 'purchaseOrders'
        ? ((await tx.select().from(t.purchaseOrders).where(eq(t.purchaseOrders.id, id)).for('update').limit(1))[0] ?? null)
        : null;
    const [row] = await tx.update(def.table).set(patch as any).where(eq(def.table.id, id)).returning();
    if (!row) throw notFound();
    await afterWrite(tx, resource, row as any, me, before);
    await bumpVersions(tx, [resource, ...(DERIVED[resource] || [])]);
    return row;
  });
}

export async function deleteGeneric(name: string, id: string) {
  const { resource, def } = resolve(name);
  const access = def.write || def.deletable;
  if (!access) throw badRequest('Este recurso no se puede eliminar así');
  const me = await authorize(access);
  await db.transaction(async (tx) => {
    const [row] = await tx.delete(def.table).where(eq(def.table.id, id)).returning();
    if (resource === 'transportCollections') await afterWrite(tx, resource, row as any, me);
    await bumpVersions(tx, [resource, ...(ALSO_TOUCHES[resource] || [])]);
  });
}
