import { db } from '@/server/db/client';
import { products } from '@/server/db/schema';
import { json, readJson, route } from '@/server/http';
import { requireEnabled } from '@/server/auth';
import { productCreate } from '@/server/resources';
import { bundlesFor, recordMovement } from '@/server/inventory';
import { bumpVersions } from '@/server/versions';
import { newId } from '@/server/ids';

/** New product. Initial stock is recorded as an "entrada" so the history explains it. */
export const POST = route(async (req) => {
  const me = await requireEnabled();
  const { stock, ...fields } = productCreate.parse(await readJson(req));
  const product = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(products)
      .values({
        ...fields,
        id: newId(),
        createdAt: fields.createdAt || new Date().toISOString(),
        stock: 0,
        stockInBundles: bundlesFor(0, fields.mainUnit),
      })
      .returning();
    if (stock) {
      await recordMovement(
        tx,
        {
          productId: row.id,
          type: stock > 0 ? 'entrada' : 'salida',
          quantity: Math.abs(stock),
          unit: row.mainUnit as 'kilos',
          notes: 'Inventario inicial (creación del producto)',
        },
        me,
      );
    }
    await bumpVersions(tx, ['products', 'movements']);
    return row;
  });
  return json({ id: product.id }, 201);
});
