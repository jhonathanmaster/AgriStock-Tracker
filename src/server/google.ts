import 'server-only';
import crypto from 'crypto';
import type { NextRequest } from 'next/server';

// Google sign-in (OpenID Connect, authorization code + PKCE).
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
export const GOOGLE_ENABLED = !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);
// Overridable only so the flow can be tested against a local fake provider.
export const GOOGLE_AUTH_URL = process.env.GOOGLE_AUTH_URL || 'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_TOKEN_URL = process.env.GOOGLE_TOKEN_URL || 'https://oauth2.googleapis.com/token';
const GOOGLE_JWKS_URL = process.env.GOOGLE_JWKS_URL || 'https://www.googleapis.com/oauth2/v3/certs';
const GOOGLE_ISSUERS = (process.env.GOOGLE_ISSUER || 'https://accounts.google.com,accounts.google.com').split(',');
export const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

export const b64url = (buf: Buffer) => buf.toString('base64url');
export const pkceChallenge = (verifier: string) => b64url(crypto.createHash('sha256').update(verifier).digest());

export function publicBaseUrl(req: NextRequest) {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/$/, '');
  const proto = req.headers.get('x-forwarded-proto') || req.nextUrl.protocol.replace(':', '');
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || req.nextUrl.host;
  return `${proto}://${host}`;
}
export const googleRedirectUri = (req: NextRequest) => `${publicBaseUrl(req)}/api/auth/google/callback`;

/** Only same-site relative paths, to avoid open redirects. */
export function safeReturnTo(v: string | null | undefined) {
  if (!v || !v.startsWith('/') || v.startsWith('//') || v.startsWith('/\\')) return '/';
  return v.slice(0, 1000);
}

let jwks: ReturnType<typeof import('jose').createRemoteJWKSet> | null = null;
export async function verifyGoogleIdToken(idToken: string, nonce: string) {
  const { createRemoteJWKSet, jwtVerify } = await import('jose');
  if (!jwks) jwks = createRemoteJWKSet(new URL(GOOGLE_JWKS_URL));
  const { payload } = await jwtVerify(idToken, jwks, { issuer: GOOGLE_ISSUERS, audience: GOOGLE_CLIENT_ID });
  if (payload.nonce !== nonce) throw new Error('nonce mismatch');
  return payload as { sub: string; email?: string; email_verified?: boolean; name?: string; picture?: string };
}
