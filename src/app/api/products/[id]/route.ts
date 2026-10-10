import { eq, sql } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { products } from '@/server/db/schema';
import { json, notFound, readJson, route } from '@/server/http';
import { requireEnabled } from '@/server/auth';
import { productUpdate } from '@/server/resources';
import { lockProduct, recordMovement, round6 } from '@/server/inventory';
import { bumpVersions } from '@/server/versions';

/**
 * Edit a product. Stock is never overwritten: if the form changed it, the difference
 * (new - value shown in the form) is applied as an adjustment movement on top of the
 * current stock, so sales made meanwhile are not lost.
 */
export const PATCH = route<{ id: string }>(async (req, { id }) => {
  const me = await requireEnabled();
  const { stockAdjustment, ...fields } = productUpdate.parse(await readJson(req));
  for (const k of Object.keys(fields) as (keyof typeof fields)[]) if (fields[k] === undefined) delete fields[k];

  await db.transaction(async (tx) => {
    const current = await lockProduct(tx, id);
    if (!current) throw notFound('El producto no existe');
    await tx
      .update(products)
      .set({
        ...fields,
        // Recompute bundles in case the main unit changed.
        stockInBundles: sql`round((case ${fields.mainUnit ?? current.mainUnit} when 'bultos' then ${products.stock} when 'kilos' then ${products.stock} / 40 else 0 end)::numeric, 6)`,
        updatedAt: new Date(),
      })
      .where(eq(products.id, id));

    const delta = stockAdjustment ? round6(stockAdjustment.to - stockAdjustment.from) : 0;
    if (delta) {
      const mainUnit = (fields.mainUnit ?? current.mainUnit) as 'kilos';
      await recordMovement(
        tx,
        {
          productId: id,
          type: delta > 0 ? 'entrada' : 'salida',
          quantity: Math.abs(delta),
          unit: mainUnit,
          notes: `Ajuste manual desde inventario (${stockAdjustment!.from} → ${stockAdjustment!.to})`,
        },
        me,
      );
    }
    await bumpVersions(tx, delta ? ['products', 'movements'] : ['products']);
  });
  return json({ ok: true });
});
