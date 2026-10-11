import { pingDb, runMigrations } from '@/server/db/client';
import { json } from '@/server/http';

export const dynamic = 'force-dynamic';

export async function GET() {
  const ok = await pingDb();
  if (ok) {
    try {
      await runMigrations();
    } catch (err) {
      console.error('[health] migraciones fallaron:', err);
      return json({ status: 'error', db: 'migrations_failed' }, 503);
    }
  }
  return json({ status: ok ? 'ok' : 'error', db: ok ? 'up' : 'down' }, ok ? 200 : 503);
}
