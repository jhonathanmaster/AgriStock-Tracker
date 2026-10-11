import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { lt } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { oauthStates } from '@/server/db/schema';
import { route } from '@/server/http';
import {
  GOOGLE_AUTH_URL,
  GOOGLE_CLIENT_ID,
  GOOGLE_ENABLED,
  OAUTH_STATE_TTL_MS,
  b64url,
  googleRedirectUri,
  pkceChallenge,
  safeReturnTo,
} from '@/server/google';

export const dynamic = 'force-dynamic';

export const GET = route(async (req) => {
  if (!GOOGLE_ENABLED) return NextResponse.redirect(new URL('/login?auth_error=google_not_configured', req.url), 302);
  const state = b64url(crypto.randomBytes(24));
  const codeVerifier = b64url(crypto.randomBytes(48));
  const nonce = b64url(crypto.randomBytes(24));
  await db.delete(oauthStates).where(lt(oauthStates.createdAt, new Date(Date.now() - OAUTH_STATE_TTL_MS)));
  await db.insert(oauthStates).values({ state, codeVerifier, nonce, returnTo: safeReturnTo(req.nextUrl.searchParams.get('returnTo')) });
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: googleRedirectUri(req),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    nonce,
    code_challenge: pkceChallenge(codeVerifier),
    code_challenge_method: 'S256',
    prompt: 'select_account',
  });
  return NextResponse.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`, 302);
});
