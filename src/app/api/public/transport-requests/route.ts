import { asc } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { transportServices, trucks } from '@/server/db/schema';
import { clientIp, json, readJson, route } from '@/server/http';
import { rateLimit } from '@/server/auth';
import { upsertCustomer } from '@/server/customers';
import { bumpVersions } from '@/server/versions';
import { newId } from '@/server/ids';
import { z } from '@/server/validation';

const schema = z.object({
  customerName: z.string().trim().min(1, 'Escribe tu nombre').max(200),
  customerPhone: z.string().trim().min(5, 'Escribe tu teléfono').max(50),
  customerEmail: z.string().trim().max(254).optional().default(''),
  origin: z.string().trim().min(1, 'Escribe el origen').max(500),
  destination: z.string().trim().min(1, 'Escribe el destino').max(500),
  cargoDescription: z.string().trim().max(2000).optional().default(''),
  preferredDate: z.string().trim().max(40).optional().default(''),
});

/**
 * Transport request sent by a visitor from /transporte. It is saved as a pending service
 * with no price; the team assigns truck, driver and freight afterwards.
 * An existing customer's data is never overwritten from here.
 */
export const POST = route(async (req) => {
  rateLimit(`public-transport:${clientIp(req)}`, 10, 10 * 60 * 1000);
  const input = schema.parse(await readJson(req));
  const preferred = input.preferredDate ? new Date(input.preferredDate) : null;
  const serviceDate = preferred && !Number.isNaN(preferred.getTime()) ? preferred.toISOString() : new Date().toISOString();
  await db.transaction(async (tx) => {
    const customerId = await upsertCustomer(
      tx,
      { name: input.customerName, phone: input.customerPhone, email: input.customerEmail },
      { onlyFillBlanks: true },
    );
    const [firstTruck] = await tx.select({ id: trucks.id }).from(trucks).orderBy(asc(trucks.plate)).limit(1);
    await tx.insert(transportServices).values({
      id: newId(),
      truckId: firstTruck?.id || 'pendiente',
      customerId,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      customerEmail: input.customerEmail || null,
      origin: input.origin,
      destination: input.destination,
      serviceDate,
      status: 'pending',
      paymentStatus: 'pending',
      totalFreightPrice: 0,
      totalPaid: 0,
      driverName: 'Por asignar',
      expenses: [],
      notes: `SOLICITUD WEB: ${input.cargoDescription}`,
      createdAt: new Date().toISOString(),
    });
    await bumpVersions(tx, ['transportServices', 'customers']);
  });
  return json({ ok: true }, 201);
});
