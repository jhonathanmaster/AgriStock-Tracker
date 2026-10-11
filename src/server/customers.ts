import 'server-only';
import { eq, or, sql } from 'drizzle-orm';
import type { Tx } from './db/client';
import { customers } from './db/schema';
import { z, text } from './validation';
import { newId } from './ids';

export const customerInput = z.object({
  id: z.preprocess((v) => (v === '' ? undefined : v), z.string().max(200).optional()),
  name: z.string().max(500).optional(),
  phone: text(100),
  email: text(500),
  address: text(1000),
  identificationNumber: text(100),
});
export type CustomerInput = z.infer<typeof customerInput>;

const digits = (s: string | null | undefined) => (s || '').replace(/\D/g, '');

/**
 * Same rules as the old saveCustomer(): reuse the customer with the same phone digits or
 * email, otherwise create one (id "phone-<digits>" when there is a phone). Only the fields
 * sent are overwritten. With `onlyFillBlanks`, an existing customer keeps its data
 * (used by the public web form so visitors can't change someone else's record).
 */
export async function upsertCustomer(tx: Tx, input: CustomerInput, opts: { onlyFillBlanks?: boolean } = {}) {
  const phone = digits(input.phone);
  const email = (input.email || '').toLowerCase().trim();
  let id = input.id;
  let existing: typeof customers.$inferSelect | undefined;

  if (id) {
    [existing] = await tx.select().from(customers).where(eq(customers.id, id)).for('update').limit(1);
  } else if (phone || email) {
    const conds = [];
    if (phone) conds.push(sql`regexp_replace(coalesce(${customers.phone}, ''), '\\D', '', 'g') = ${phone}`);
    if (email) conds.push(sql`lower(trim(${customers.email})) = ${email}`);
    [existing] = await tx.select().from(customers).where(or(...conds)).orderBy(customers.createdAt).for('update').limit(1);
    id = existing?.id || (phone ? `phone-${phone}` : undefined);
    if (!existing && id) [existing] = await tx.select().from(customers).where(eq(customers.id, id)).for('update').limit(1);
  }

  const now = new Date().toISOString();
  const sent: Record<string, string | null> = {};
  for (const k of ['name', 'phone', 'email', 'address', 'identificationNumber'] as const) {
    if (input[k] !== undefined) sent[k] = input[k] ?? null;
  }

  if (existing) {
    const patch: Record<string, unknown> = { lastPurchaseDate: now, updatedAt: new Date() };
    for (const [k, v] of Object.entries(sent)) {
      const cur = (existing as Record<string, unknown>)[k];
      if (opts.onlyFillBlanks && cur) continue;
      if (k === 'name' && !v) continue; // name is required
      patch[k] = v;
    }
    await tx.update(customers).set(patch).where(eq(customers.id, existing.id));
    return existing.id;
  }

  const finalId = id || newId();
  await tx.insert(customers).values({
    id: finalId,
    name: (sent.name || '').trim() || 'Cliente',
    phone: sent.phone ?? null,
    email: sent.email ?? null,
    address: sent.address ?? null,
    identificationNumber: sent.identificationNumber ?? null,
    lastPurchaseDate: now,
  }).onConflictDoUpdate({ target: customers.id, set: { lastPurchaseDate: now, updatedAt: new Date() } });
  return finalId;
}
