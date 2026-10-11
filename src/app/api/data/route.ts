import { json, route } from '@/server/http';
import { requireEnabled } from '@/server/auth';
import { canRead, loadResource, parseResourceList } from '@/server/data';
import { readVersions } from '@/server/versions';

export const dynamic = 'force-dynamic';

/** Everything the signed-in user can see, or only ?only=products,movements. */
export const GET = route(async (req) => {
  const me = await requireEnabled();
  const wanted = parseResourceList(req.nextUrl.searchParams.get('only')).filter((r) => canRead(r, me));
  // Read versions first: if something changes while loading, the next poll fetches it again.
  const versions = await readVersions();
  const entries = await Promise.all(wanted.map(async (r) => [r, await loadResource(r)] as const));
  return json({ versions, data: Object.fromEntries(entries) });
});
