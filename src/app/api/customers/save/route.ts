import { db } from '@/server/db/client';
import { json, readJson, route } from '@/server/http';
import { requireEnabled } from '@/server/auth';
import { customerInput, upsertCustomer } from '@/server/customers';
import { bumpVersions } from '@/server/versions';

/** Create or update a customer (deduplicated by phone digits or email). Returns its id. */
export const POST = route(async (req) => {
  await requireEnabled();
  const input = customerInput.parse(await readJson(req));
  const id = await db.transaction(async (tx) => {
    const customerId = await upsertCustomer(tx, input);
    await bumpVersions(tx, ['customers']);
    return customerId;
  });
  return json({ id });
});
