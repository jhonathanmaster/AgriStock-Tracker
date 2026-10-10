import { eq } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { orders, products } from '@/server/db/schema';
import { clientIp, json, notFound, readJson, route } from '@/server/http';
import { rateLimit } from '@/server/auth';
import { upsertCustomer } from '@/server/customers';
import { bumpVersions } from '@/server/versions';
import { newId } from '@/server/ids';
import { z } from '@/server/validation';

const schema = z.object({
  productId: z.string().min(1).max(200),
  quantity: z.preprocess((v) => Number(v), z.number().positive('La cantidad debe ser mayor que cero').max(1_000_000)),
  customerName: z.string().trim().min(1, 'Escribe tu nombre').max(200),
  customerPhone: z.string().trim().min(5, 'Escribe tu teléfono').max(50),
  customerEmail: z.string().trim().max(254).optional().default(''),
  customerIdentification: z.string().trim().max(50).optional().default(''),
  customerAddress: z.string().trim().max(500).optional().default(''),
});

function addBusinessDays(date: Date, days: number) {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return result;
}

/**
 * Order placed by a visitor from the product page. The price comes from the database,
 * not from the browser. An existing customer's data is never overwritten from here.
 */
export const POST = route(async (req) => {
  rateLimit(`public-order:${clientIp(req)}`, 10, 10 * 60 * 1000);
  const input = schema.parse(await readJson(req));
  const now = new Date();
  await db.transaction(async (tx) => {
    const [product] = await tx.select().from(products).where(eq(products.id, input.productId)).limit(1);
    if (!product) throw notFound('El producto no existe');
    const customerId = await upsertCustomer(
      tx,
      {
        name: input.customerName,
        phone: input.customerPhone,
        email: input.customerEmail,
        address: input.customerAddress,
        identificationNumber: input.customerIdentification,
      },
      { onlyFillBlanks: true },
    );
    const total = (product.salePrice || 0) * input.quantity;
    await tx.insert(orders).values({
      id: newId(),
      customerId,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      customerAddress: input.customerAddress,
      customerIdentification: input.customerIdentification,
      customerEmail: input.customerEmail,
      items: [
        { productId: product.id, productName: product.name, quantity: input.quantity, unit: product.mainUnit, price: product.salePrice, total },
      ],
      payments: [],
      totalValue: total,
      status: 'pending',
      requestDate: now.toISOString(),
      deliveryDate: addBusinessDays(now, 3).toISOString(),
      notes: 'Pedido realizado desde el portal web público.',
    });
    await bumpVersions(tx, ['orders', 'customers']);
  });
  return json({ ok: true }, 201);
});
