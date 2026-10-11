import { NextResponse, type NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { oauthStates, users } from '@/server/db/schema';
import { clientIp, route } from '@/server/http';
import { createSession, provisionUser, recordLogin } from '@/server/auth';
import {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_ENABLED,
  GOOGLE_TOKEN_URL,
  OAUTH_STATE_TTL_MS,
  googleRedirectUri,
  publicBaseUrl,
  verifyGoogleIdToken,
} from '@/server/google';

export const dynamic = 'force-dynamic';

const fail = (req: NextRequest, code: string) =>
  NextResponse.redirect(`${publicBaseUrl(req)}/login?auth_error=${encodeURIComponent(code)}`, 302);

export const GET = route(async (req) => {
  const q = req.nextUrl.searchParams;
  const code = q.get('code');
  const state = q.get('state');
  if (q.get('error')) return fail(req, 'google_denied');
  if (!GOOGLE_ENABLED) return fail(req, 'google_not_configured');
  if (!code || !state) return fail(req, 'google_state');

  try {
    // Single use: delete the state as we read it.
    const [saved] = await db.delete(oauthStates).where(eq(oauthStates.state, state)).returning();
    if (!saved || Date.now() - saved.createdAt.getTime() > OAUTH_STATE_TTL_MS) return fail(req, 'google_state');

    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: googleRedirectUri(req),
        grant_type: 'authorization_code',
        code_verifier: saved.codeVerifier,
      }),
    });
    const tokens = (await tokenRes.json().catch(() => ({}))) as { id_token?: string; error?: string };
    if (!tokenRes.ok || !tokens.id_token) {
      console.warn(`[auth] google: intercambio de código falló status=${tokenRes.status} error=${tokens.error || 'desconocido'}`);
      return fail(req, 'google_failed');
    }

    const claims = await verifyGoogleIdToken(tokens.id_token, saved.nonce);
    const email = (claims.email || '').toLowerCase();
    if (!email || claims.email_verified !== true) return fail(req, 'google_unverified');

    // 1) Account already linked to this Google user  2) same verified email (e.g. imported from Firebase)  3) new
    let [user] = await db.select().from(users).where(eq(users.googleSub, claims.sub)).limit(1);
    if (!user) {
      const [byEmail] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (byEmail) {
        if (byEmail.googleSub && byEmail.googleSub !== claims.sub) return fail(req, 'google_conflict');
        [user] = await db
          .update(users)
          .set({ googleSub: claims.sub, photoUrl: byEmail.photoUrl || claims.picture || null, updatedAt: new Date() })
          .where(eq(users.id, byEmail.id))
          .returning();
        console.log(`[auth] google vinculado a cuenta existente user=${user.id}`);
      } else {
        // Anyone can sign in; without an invitation the account stays disabled (as before).
        const created = await provisionUser({
          email,
          displayName: (claims.name || '').slice(0, 100) || null,
          photoUrl: claims.picture || null,
          googleSub: claims.sub,
        });
        if (!created) return fail(req, 'google_failed');
        user = created;
        console.log(`[auth] alta con google user=${user.id} habilitado=${user.enabled}`);
      }
    } else if (claims.picture && !user.photoUrl) {
      await db.update(users).set({ photoUrl: claims.picture }).where(eq(users.id, user.id));
    }

    await createSession(user.id, clientIp(req));
    await recordLogin(user.id);
    return NextResponse.redirect(`${publicBaseUrl(req)}${saved.returnTo || '/'}`, 302);
  } catch (err) {
    console.warn('[auth] google sign-in falló:', (err as Error)?.message || err);
    return fail(req, 'google_failed');
  }
});
