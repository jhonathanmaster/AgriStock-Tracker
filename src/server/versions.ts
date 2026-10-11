import 'server-only';
import { sql } from 'drizzle-orm';
import { db, type Tx } from './db/client';
import { dataVersions } from './db/schema';

/** Data sets the browser keeps in memory. Names match the fields returned by useAgriStock(). */
export const RESOURCES = [
  'products',
  'movements',
  'purchaseOrders',
  'expenses',
  'orders',
  'quotations',
  'quotationCollections',
  'quotationImportTrackings',
  'credits',
  'creditCollections',
  'audits',
  'expenseCategories',
  'purchaseOrderStatusDefinitions',
  'conversions',
  'users',
  'invitations',
  'customers',
  'animalTypes',
  'categories',
  'suppliers',
  'trucks',
  'transportServices',
  'transportCollections',
  'config',
] as const;
export type Resource = (typeof RESOURCES)[number];

type Executor = typeof db | Tx;

/** Bumps the change counters. Call inside the same transaction as the write. */
export async function bumpVersions(exec: Executor, resources: Resource[]) {
  const unique = [...new Set(resources)];
  if (unique.length === 0) return;
  await exec
    .insert(dataVersions)
    .values(unique.map((resource) => ({ resource, version: 1 })))
    .onConflictDoUpdate({
      target: dataVersions.resource,
      set: { version: sql`${dataVersions.version} + 1`, updatedAt: sql`now()` },
    });
}

export async function readVersions(): Promise<Record<string, number>> {
  const rows = await db.select({ resource: dataVersions.resource, version: dataVersions.version }).from(dataVersions);
  return Object.fromEntries(rows.map((r) => [r.resource, r.version]));
}
