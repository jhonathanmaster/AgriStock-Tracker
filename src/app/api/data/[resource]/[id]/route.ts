import { json, readJson, route } from '@/server/http';
import { deleteGeneric, updateGeneric } from '@/server/generic';

export const PATCH = route<{ resource: string; id: string }>(async (req, { resource, id }) => {
  return json(await updateGeneric(resource, id, await readJson(req)));
});

export const DELETE = route<{ resource: string; id: string }>(async (_req, { resource, id }) => {
  await deleteGeneric(resource, id);
  return json({ ok: true });
});
