import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from './db/client';
import { ALSO_TOUCHES, RESOURCE_DEFS, type Access, type ResourceDef } from './resources';
import { RESOURCES, bumpVersions, type Resource } from './versions';
import { requireAdmin, requireEnabled, type SessionUser } from './auth';
import { badRequest, notFound } from './http';
import { newId } from './ids';

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

const hasUpdatedAt = (def: ResourceDef) => 'updatedAt' in (def.table as unknown as Record<string, unknown>);

export async function createGeneric(name: string, body: unknown) {
  const { resource, def } = resolve(name);
  if (!def.write || !def.create) throw badRequest('Este recurso no se puede crear así');
  const me = await authorize(def.write);
  const values = { ...def.create.parse(body), ...serverFields(resource, me, true), id: newId() };
  return db.transaction(async (tx) => {
    const [row] = await tx.insert(def.table).values(values as any).returning();
    await bumpVersions(tx, [resource]);
    return row;
  });
}

export async function updateGeneric(name: string, id: string, body: unknown) {
  const { resource, def } = resolve(name);
  if (!def.write || !def.create) throw badRequest('Este recurso no se puede modificar así');
  await authorize(def.write);
  const patch: Record<string, unknown> = def.create.partial().parse(body);
  for (const k of Object.keys(patch)) if (patch[k] === undefined) delete patch[k];
  if (hasUpdatedAt(def)) patch.updatedAt = new Date();
  if (Object.keys(patch).length === 0) return { id };
  return db.transaction(async (tx) => {
    const [row] = await tx.update(def.table).set(patch as any).where(eq(def.table.id, id)).returning();
    if (!row) throw notFound();
    await bumpVersions(tx, [resource]);
    return row;
  });
}

export async function deleteGeneric(name: string, id: string) {
  const { resource, def } = resolve(name);
  const access = def.write || def.deletable;
  if (!access) throw badRequest('Este recurso no se puede eliminar así');
  await authorize(access);
  await db.transaction(async (tx) => {
    await tx.delete(def.table).where(eq(def.table.id, id));
    await bumpVersions(tx, [resource, ...(ALSO_TOUCHES[resource] || [])]);
  });
}
