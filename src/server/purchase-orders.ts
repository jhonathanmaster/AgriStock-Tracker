import 'server-only';
import { eq } from 'drizzle-orm';
import type { Tx } from './db/client';
import { inventoryMovements } from './db/schema';
import { addToStock, loadConversions, lockProduct, recordMovement, stockEffect } from './inventory';
import type { SessionUser } from './auth';

/** "Recibido", "Recibida", "recibido " ... (same rule the purchase tracking screen uses). */
export const isReceivedStatus = (status: string | null | undefined) => (status || '').toLowerCase().trim().startsWith('recibid');

const sourceRefFor = (orderId: string) => `purchase-order:${orderId}`;

type Order = { id: string; productId: string | null; quantity: number; unit: string; status: string };

/**
 * Keeps the stock entry of a purchase order in line with the order, inside the caller's transaction:
 * - When the order moves into a "recibido" status, adds its quantity to stock (once per order).
 * - When an order that already has its entry changes product, quantity or unit, moves the
 *   difference so the stock matches what was actually received.
 * Returns true when this call added the order to stock for the first time.
 */
export async function syncPurchaseOrderStock(tx: Tx, before: Order | null, after: Order, actor: SessionUser) {
  const ref = sourceRefFor(after.id);
  const [entry] = await tx.select().from(inventoryMovements).where(eq(inventoryMovements.sourceRef, ref)).for('update').limit(1);

  if (entry) {
    const changed = entry.productId !== after.productId || Number(entry.quantity) !== Number(after.quantity) || entry.unit !== after.unit;
    if (!changed || !after.productId) return false;
    const conversions = await loadConversions(tx);
    const oldProduct = entry.productId ? await lockProduct(tx, entry.productId) : null;
    if (oldProduct) await addToStock(tx, oldProduct, -stockEffect(entry, oldProduct.mainUnit, conversions));
    const [updated] = await tx
      .update(inventoryMovements)
      .set({ productId: after.productId, quantity: after.quantity, unit: after.unit as 'kilos' })
      .where(eq(inventoryMovements.id, entry.id))
      .returning();
    const newProduct = await lockProduct(tx, after.productId);
    if (newProduct) await addToStock(tx, newProduct, stockEffect(updated, newProduct.mainUnit, conversions));
    return false;
  }

  const entering = isReceivedStatus(after.status) && !isReceivedStatus(before?.status);
  if (!entering || !after.productId) return false;
  const m = await recordMovement(
    tx,
    {
      productId: after.productId,
      type: 'entrada',
      quantity: after.quantity,
      unit: after.unit as 'kilos',
      notes: `Recepción O.C. #${after.id}`,
      sourceRef: ref,
    },
    actor,
  );
  return !!m;
}
