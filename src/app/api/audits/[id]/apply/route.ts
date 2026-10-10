import { eq } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { inventoryAudits } from '@/server/db/schema';
import { json, notFound, route } from '@/server/http';
import { requireEnabled } from '@/server/auth';
import { lockProduct, recordMovement, round6 } from '@/server/inventory';
import { bumpVersions } from '@/server/versions';

/** Sets the product stock to the physically counted quantity (once), recording the difference. */
export const POST = route<{ id: string }>(async (_req, { id }) => {
  const me = await requireEnabled();
  await db.transaction(async (tx) => {
    const [audit] = await tx.select().from(inventoryAudits).where(eq(inventoryAudits.id, id)).for('update').limit(1);
    if (!audit) throw notFound('La auditoría no existe');
    if (audit.applied) return;
    const product = audit.productId ? await lockProduct(tx, audit.productId) : null;
    if (!product) throw notFound('El producto de esta auditoría ya no existe');
    const diff = round6(audit.verifiedQuantity - (product.stock || 0));
    if (diff !== 0) {
      await recordMovement(
        tx,
        {
          productId: product.id,
          type: diff > 0 ? 'entrada' : 'salida',
          quantity: Math.abs(diff),
          unit: product.mainUnit as 'kilos',
          notes: `Ajuste auditoría #${id.substring(0, 6)}`,
          sourceRef: `audit:${id}`,
        },
        me,
      );
    }
    await tx.update(inventoryAudits).set({ applied: true }).where(eq(inventoryAudits.id, id));
    await bumpVersions(tx, ['audits', 'products', 'movements']);
  });
  return json({ ok: true });
});
