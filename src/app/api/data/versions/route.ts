import { json, route } from '@/server/http';
import { requireEnabled } from '@/server/auth';
import { readVersions } from '@/server/versions';

export const dynamic = 'force-dynamic';

/** Tiny endpoint the browser polls to know which data sets changed. */
export const GET = route(async () => {
  await requireEnabled();
  return json({ versions: await readVersions() });
});
