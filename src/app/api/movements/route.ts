import { db } from '@/server/db/client';
import { json, readJson, route } from '@/server/http';
import { requireEnabled } from '@/server/auth';
import { recordMovement } from '@/server/inventory';
import { bumpVersions } from '@/server/versions';
import { movementInput } from '@/server/movement-schema';

/** Sale / entry / exit: inserts the movement and updates stock in one transaction. */
export const POST = route(async (req) => {
  const me = await requireEnabled();
  const input = movementInput.parse(await readJson(req));
  const movement = await db.transaction(async (tx) => {
    const m = await recordMovement(tx, { ...input, sourceRef: null }, me);
    await bumpVersions(tx, ['products', 'movements']);
    return m;
  });
  return json({ id: movement!.id }, 201);
});
