import { eq } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { purchaseOrders } from '@/server/db/schema';
import { json, notFound, readJson, route } from '@/server/http';
import { requireEnabled } from '@/server/auth';
import { isReceivedStatus, syncPurchaseOrderStock } from '@/server/purchase-orders';
import { bumpVersions } from '@/server/versions';
import { z } from '@/server/validation';

const schema = z.object({ status: z.string().trim().min(1).max(200) });

/**
 * Changes the status of a purchase order. Moving it to "Recibido" (or "Recibida") adds the
 * quantity to stock exactly once per order, even if it is marked received again or by two people.
 */
export const POST = route<{ id: string }>(async (req, { id }) => {
  const me = await requireEnabled();
  const { status } = schema.parse(await readJson(req));
  const receiving = isReceivedStatus(status);

  const result = await db.transaction(async (tx) => {
    const [order] = await tx.select().from(purchaseOrders).where(eq(purchaseOrders.id, id)).for('update').limit(1);
    if (!order) throw notFound('La orden de compra no existe');
    const patch: Partial<typeof purchaseOrders.$inferInsert> = { status, updatedAt: new Date() };
    if (receiving) patch.receivedDate = new Date().toISOString();
    await tx.update(purchaseOrders).set(patch).where(eq(purchaseOrders.id, id));
    // An explicit "receive" always makes sure the entry exists (no-op if it already does).
    const stockAdded = receiving ? await syncPurchaseOrderStock(tx, null, { ...order, status }, me) : false;
    await bumpVersions(tx, receiving ? ['purchaseOrders', 'products', 'movements'] : ['purchaseOrders']);
    return { stockAdded };
  });
  return json({ ok: true, ...result });
});
