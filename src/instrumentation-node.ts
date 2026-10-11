import { runMigrations } from './server/db/client';

for (let attempt = 1; attempt <= 10; attempt++) {
  try {
    await runMigrations();
    break;
  } catch (err) {
    console.error(`[db] no se pudieron aplicar las migraciones (intento ${attempt}/10):`, (err as Error).message);
    await new Promise((r) => setTimeout(r, 3000));
  }
}
