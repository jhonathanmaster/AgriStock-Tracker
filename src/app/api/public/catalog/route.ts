import { json, route } from '@/server/http';
import { loadPublicCatalog } from '@/server/data';

export const dynamic = 'force-dynamic';

/** What visitors of the web portal can see (no costs, margins or suppliers). */
export const GET = route(async () => json(await loadPublicCatalog()));
