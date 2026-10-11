import { eq } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { invitations, users } from '@/server/db/schema';
import { clientIp, json, readJson, route } from '@/server/http';
import { rateLimit, requireUser, sha256 } from '@/server/auth';
import { bumpVersions } from '@/server/versions';
import { z } from '@/server/validation';

export const dynamic = 'force-dynamic';

type Status = 'valid' | 'accepted' | 'expired' | 'invalid';

async function check(email: string, token: string): Promise<{ status: Status; inv?: typeof invitations.$inferSelect }> {
  const [inv] = await db.select().from(invitations).where(eq(invitations.email, email.toLowerCase())).limit(1);
  if (!inv || !inv.tokenHash || inv.tokenHash !== sha256(token) || inv.enabled === false) return { status: 'invalid' };
  if (inv.status === 'accepted') return { status: 'accepted', inv };
  const expires = inv.expiresAt ? new Date(inv.expiresAt).getTime() : 0;
  if (!expires || Date.now() > expires) return { status: 'expired', inv };
  return { status: 'valid', inv };
}

/** Lets the invitation page tell the visitor what to do before signing in. */
export const GET = route(async (req) => {
  rateLimit(`inv-check:${clientIp(req)}`, 60, 10 * 60 * 1000);
  const email = (req.nextUrl.searchParams.get('email') || '').toLowerCase();
  const token = req.nextUrl.searchParams.get('token') || '';
  if (!email || !token) return json({ status: 'invalid' });
  const { status, inv } = await check(email, token);
  if (inv && status === 'valid' && !inv.openedAt) {
    await db.update(invitations).set({ openedAt: new Date().toISOString() }).where(eq(invitations.email, inv.email));
  }
  return json({ status, email });
});

const acceptSchema = z.object({ email: z.string().email().max(254), token: z.string().min(1).max(200) });

/** Accepts the invitation for the signed-in user (whose email must match). */
export const POST = route(async (req) => {
  const me = await requireUser();
  const { email, token } = acceptSchema.parse(await readJson(req));
  const { status, inv } = await check(email, token);
  if (status === 'invalid' || status === 'expired') return json({ status });
  if (me.email !== email.toLowerCase()) return json({ status: 'wrong-account' });
  const now = new Date().toISOString();
  await db.transaction(async (tx) => {
    await tx.update(invitations).set({ status: 'accepted', acceptedAt: inv!.acceptedAt || now, enabled: true }).where(eq(invitations.email, inv!.email));
    await tx
      .update(users)
      .set({ enabled: true, role: me.isSuperAdmin ? 'admin' : inv!.role, updatedAt: new Date() })
      .where(eq(users.id, me.id));
    await bumpVersions(tx, ['users', 'invitations']);
  });
  return json({ status: 'success' });
});
