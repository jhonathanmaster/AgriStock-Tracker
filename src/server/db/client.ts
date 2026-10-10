import 'server-only';
import path from 'path';
import pg from 'pg';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import * as schema from './schema';

type DB = NodePgDatabase<typeof schema>;

// Reuse one pool across hot reloads in development.
const globalForDb = globalThis as unknown as { __geiaPool?: pg.Pool; __geiaDb?: DB; __geiaMigrated?: Promise<void> };

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL no está definida. Ejemplo: postgres://geiatienda:geiatienda@localhost:5435/geiatienda');
  }
  const pool = new pg.Pool({
    connectionString,
    max: Number(process.env.DATABASE_POOL_MAX || 10),
    // Managed Postgres (e.g. DigitalOcean) requires TLS; enable with DATABASE_SSL=true.
    ssl:
      process.env.DATABASE_SSL === 'true'
        ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false' }
        : undefined,
  });
  pool.on('error', (err) => console.error('[db] idle client error:', err.message));
  return pool;
}

export function getPool(): pg.Pool {
  if (!globalForDb.__geiaPool) globalForDb.__geiaPool = createPool();
  return globalForDb.__geiaPool;
}

export function getDb(): DB {
  if (!globalForDb.__geiaDb) globalForDb.__geiaDb = drizzle(getPool(), { schema });
  return globalForDb.__geiaDb;
}

/** Proxy so modules can `import { db }` without opening a connection at import time (e.g. during `next build`). */
export const db = new Proxy({} as DB, {
  get(_t, prop) {
    const real = getDb() as any;
    const value = real[prop];
    return typeof value === 'function' ? value.bind(real) : value;
  },
});

export type Tx = Parameters<Parameters<DB['transaction']>[0]>[0];

/** Applies pending SQL migrations from ./drizzle. Safe to run on every boot. */
export function runMigrations(): Promise<void> {
  if (!globalForDb.__geiaMigrated) {
    const migrationsFolder = path.join(process.cwd(), 'drizzle');
    globalForDb.__geiaMigrated = migrate(getDb(), { migrationsFolder }).then(() => {
      console.log('[db] migraciones al día');
    });
    globalForDb.__geiaMigrated.catch(() => {
      globalForDb.__geiaMigrated = undefined;
    });
  }
  return globalForDb.__geiaMigrated;
}

export async function pingDb(): Promise<boolean> {
  try {
    await getPool().query('select 1');
    return true;
  } catch {
    return false;
  }
}
