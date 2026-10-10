import { json, readJson, route } from '@/server/http';
import { createGeneric } from '@/server/generic';

/** Create a document in a simple data set (expenses, orders, suppliers, ...). */
export const POST = route<{ resource: string }>(async (req, { resource }) => {
  const row = await createGeneric(resource, await readJson(req));
  return json(row, 201);
});
