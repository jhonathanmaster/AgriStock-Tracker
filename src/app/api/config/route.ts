import { db } from '@/server/db/client';
import { appConfig } from '@/server/db/schema';
import { json, readJson, route } from '@/server/http';
import { requireAdmin } from '@/server/auth';
import { CONFIG_ID } from '@/server/data';
import { bumpVersions } from '@/server/versions';
import { z, text, num, image } from '@/server/validation';

const schema = z.object({
  criticalStockThreshold: num(),
  initialCapital: num(),
  companyName: text(500),
  companyNit: text(100),
  companyAddress: text(1000),
  companyPhone: text(100),
  companyEmail: text(500),
  representativeName: text(500),
  representativePosition: text(500),
  logoUrl: image(),
  iconUrl: image(),
  signatureUrl: image(),
});

/** Merge settings into the single config row (like setDoc(..., { merge: true })). */
export const PATCH = route(async (req) => {
  await requireAdmin();
  const patch = schema.parse(await readJson(req));
  for (const k of Object.keys(patch) as (keyof typeof patch)[]) if (patch[k] === undefined) delete patch[k];
  await db.transaction(async (tx) => {
    await tx
      .insert(appConfig)
      .values({ id: CONFIG_ID, ...patch })
      .onConflictDoUpdate({ target: appConfig.id, set: { ...patch, updatedAt: new Date() } });
    await bumpVersions(tx, ['config']);
  });
  return json({ ok: true });
});
