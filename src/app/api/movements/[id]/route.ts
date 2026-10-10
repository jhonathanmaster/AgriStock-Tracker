import { eq } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { inventoryMovements } from '@/server/db/schema';
import { json, notFound, readJson, route } from '@/server/http';
import { requireEnabled } from '@/server/auth';
import { addToStock, loadConversions, lockProduct, stockEffect } from '@/server/inventory';
import { bumpVersions } from '@/server/versions';
import { movementUpdate } from '@/server/movement-schema';

async function lockMovement(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], id: string) {
  const [m] = await tx.select().from(inventoryMovements).where(eq(inventoryMovements.id, id)).for('update').limit(1);
  return m || null;
}

/** Edit a movement: reverts its old effect on stock and applies the new one, atomically. */
export const PATCH = route<{ id: string }>(async (req, { id }) => {
  await requireEnabled();
  const patch = movementUpdate.parse(await readJson(req));
  for (const k of Object.keys(patch) as (keyof typeof patch)[]) if (patch[k] === undefined) delete patch[k];
  const { movementDateTime, ...rest } = patch;
  const values = movementDateTime ? { ...rest, movementDateTime } : rest;

  await db.transaction(async (tx) => {
    const old = await lockMovement(tx, id);
    if (!old) throw notFound('El movimiento no existe');
    const product = old.productId ? await lockProduct(tx, old.productId) : null;
    const [updated] = await tx.update(inventoryMovements).set(values).where(eq(inventoryMovements.id, id)).returning();
    if (product) {
      const conversions = await loadConversions(tx);
      const delta = stockEffect(updated, product.mainUnit, conversions) - stockEffect(old, product.mainUnit, conversions);
      await addToStock(tx, product, delta);
    }
    await bumpVersions(tx, ['products', 'movements']);
  });
  return json({ ok: true });
});

/** Delete a movement and give back (or take away) its stock. */
export const DELETE = route<{ id: string }>(async (_req, { id }) => {
  await requireEnabled();
  await db.transaction(async (tx) => {
    const old = await lockMovement(tx, id);
    if (!old) return;
    const product = old.productId ? await lockProduct(tx, old.productId) : null;
    if (product) {
      const conversions = await loadConversions(tx);
      await addToStock(tx, product, -stockEffect(old, product.mainUnit, conversions));
    }
    await tx.delete(inventoryMovements).where(eq(inventoryMovements.id, id));
    await bumpVersions(tx, ['products', 'movements']);
  });
  return json({ ok: true });
});
