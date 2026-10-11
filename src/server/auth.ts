import 'server-only';
import crypto from 'crypto';
import { cookies, headers } from 'next/headers';
import { and, eq, gt, lt } from 'drizzle-orm';
import { db } from './db/client';
import { users, sessions, invitations } from './db/schema';
import { ApiError, forbidden, unauthorized } from './http';
import { bumpVersions } from './versions';
import { newId } from './ids';

// ---- Policy --------------------------------------------------------------------------
export const COOKIE_NAME = 'geia_session';
const SLIDING_TTL_MS = 30 * 24 * 60 * 60 * 1000; // extends with activity
const ABSOLUTE_TTL_MS = 90 * 24 * 60 * 60 * 1000; // hard cap
const TOUCH_INTERVAL_MS = 60 * 60 * 1000; // write last_seen at most hourly
const COOKIE_SECURE = process.env.COOKIE_SECURE === 'true';

/** Owners of the system: always admin and enabled. */
export const SUPER_ADMIN_EMAILS = new Set(
  (process.env.SUPER_ADMIN_EMAILS || 'jhonathanmaster@gmail.com')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
);
export const PASSWORD_LOGIN_ENABLED = process.env.PASSWORD_LOGIN_ENABLED !== 'false';

export const isSuperAdminEmail = (email: string) => SUPER_ADMIN_EMAILS.has(email.toLowerCase());
export const sha256 = (v: string) => crypto.createHash('sha256').update(v).digest('hex');
export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('base64url');

export type UserRow = typeof users.$inferSelect;

export interface SessionUser {
  id: string;
  email: string;
  displayName: string | null;
  photoUrl: string | null;
  role: string;
  enabled: boolean;
  hasPassword: boolean;
  googleLinked: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isEnabled: boolean;
  row: UserRow;
  sessionTokenHash: string;
}

function withFlags(row: UserRow, sessionTokenHash: string): SessionUser {
  const isSuperAdmin = isSuperAdminEmail(row.email);
  const isAdmin = isSuperAdmin || row.role === 'admin';
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    photoUrl: row.photoUrl,
    role: row.role,
    enabled: row.enabled,
    hasPassword: !!row.passwordHash,
    googleLinked: !!row.googleSub,
    isSuperAdmin,
    isAdmin,
    isEnabled: isAdmin || row.enabled,
    row,
    sessionTokenHash,
  };
}

/** Shape the UI expects for `user` (it used to be a Firebase User). */
export function toPublicUser(u: SessionUser) {
  return {
    uid: u.id,
    email: u.email,
    displayName: u.displayName || u.email.split('@')[0],
    photoURL: u.photoUrl,
    hasPassword: u.hasPassword,
    googleLinked: u.googleLinked,
  };
}

/** UserProfile as stored in the old `users` collection. */
export function toProfile(row: UserRow) {
  return {
    uid: row.id,
    email: row.email,
    displayName: row.displayName,
    photoURL: row.photoUrl,
    enabled: isSuperAdminEmail(row.email) ? true : row.enabled,
    role: isSuperAdminEmail(row.email) ? 'admin' : row.role,
    lastLogin: row.lastLogin ? row.lastLogin.toISOString() : '',
    accessHistory: (row.accessHistory || []).map((d) => new Date(d).toISOString()),
    identificationNumber: row.identificationNumber || '',
    phone: row.phone || '',
    address: row.address || '',
    hasPassword: !!row.passwordHash,
    googleLinked: !!row.googleSub,
  };
}

// ---- Sessions ----------------------------------------------------------------------------

async function setCookie(token: string, expiresAt: Date) {
  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
}

export async function clearSessionCookie() {
  (await cookies()).set(COOKIE_NAME, '', { httpOnly: true, secure: COOKIE_SECURE, sameSite: 'lax', path: '/', maxAge: 0 });
}

export async function createSession(userId: string, ip: string | null) {
  const token = randomToken();
  const now = Date.now();
  const expiresAt = new Date(now + SLIDING_TTL_MS);
  const ua = ((await headers()).get('user-agent') || '').slice(0, 300) || null;
  await db.insert(sessions).values({
    tokenHash: sha256(token),
    userId,
    expiresAt,
    absoluteExpiresAt: new Date(now + ABSOLUTE_TTL_MS),
    userAgent: ua,
    ip,
  });
  // Opportunistic cleanup of this user's expired sessions.
  await db.delete(sessions).where(and(eq(sessions.userId, userId), lt(sessions.expiresAt, new Date())));
  await setCookie(token, expiresAt);
}

export async function destroyCurrentSession() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.tokenHash, sha256(token)));
  await clearSessionCookie();
}

/** Resolves the session cookie into a user, or null. Extends the session on use. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  const now = new Date();
  const rows = await db
    .select({ s: sessions, u: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, sha256(token)), gt(sessions.expiresAt, now), gt(sessions.absoluteExpiresAt, now)))
    .limit(1);
  const row = rows[0];
  if (!row) return null;

  if (now.getTime() - row.s.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
    const newExpiry = new Date(Math.min(now.getTime() + SLIDING_TTL_MS, row.s.absoluteExpiresAt.getTime()));
    await db.update(sessions).set({ lastSeenAt: now, expiresAt: newExpiry }).where(eq(sessions.tokenHash, row.s.tokenHash));
    try {
      await setCookie(token, newExpiry);
    } catch {
      /* cookies are read-only while rendering; the next API call refreshes it */
    }
  }
  return withFlags(row.u, row.s.tokenHash);
}

export async function requireUser(): Promise<SessionUser> {
  const u = await getSessionUser();
  if (!u) throw unauthorized();
  return u;
}

/** Signed in and enabled by an administrator (or an admin). */
export async function requireEnabled(): Promise<SessionUser> {
  const u = await requireUser();
  if (!u.isEnabled) throw forbidden('Tu cuenta aún no ha sido habilitada por el administrador', 'NOT_ENABLED');
  return u;
}

export async function requireAdmin(): Promise<SessionUser> {
  const u = await requireUser();
  if (!u.isAdmin) throw forbidden('Solo un administrador puede hacer esto', 'ADMIN_ONLY');
  return u;
}

// ---- Login bookkeeping -------------------------------------------------------------------

/** Updates last login / access history and keeps owners as enabled admins. */
export async function recordLogin(userId: string) {
  const [row] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!row) return;
  const now = new Date();
  const history = [now, ...(row.accessHistory || [])].slice(0, 10);
  const owner = isSuperAdminEmail(row.email);
  await db
    .update(users)
    .set({
      lastLogin: now,
      accessHistory: history,
      ...(owner ? { role: 'admin', enabled: true } : {}),
      updatedAt: now,
    })
    .where(eq(users.id, userId));
  await bumpVersions(db, ['users']);
}

/** The invitation that lets this email in, if any (and not disabled by an admin). */
export async function findUsableInvitation(email: string) {
  const [inv] = await db.select().from(invitations).where(eq(invitations.email, email.toLowerCase())).limit(1);
  if (!inv || inv.enabled === false) return null;
  return inv;
}

/** Who may get a new account: owners, and anyone an admin invited. */
export async function canCreateAccount(email: string) {
  return isSuperAdminEmail(email) || !!(await findUsableInvitation(email));
}

/**
 * Creates the profile for a first sign-in, mirroring the old login page:
 * enabled if owner or invited, role from the invitation, contact data copied from it.
 */
export async function provisionUser(input: {
  email: string;
  displayName: string | null;
  photoUrl: string | null;
  passwordHash?: string | null;
  googleSub?: string | null;
}): Promise<UserRow | null> {
  const email = input.email.toLowerCase();
  const owner = isSuperAdminEmail(email);
  const inv = await findUsableInvitation(email);
  const nowIso = new Date().toISOString();
  return db.transaction(async (tx) => {
    const inserted = await tx
      .insert(users)
      .values({
        id: newId(),
        email,
        displayName: input.displayName || email.split('@')[0],
        photoUrl: inv?.photoUrl || input.photoUrl,
        passwordHash: input.passwordHash ?? null,
        googleSub: input.googleSub ?? null,
        enabled: owner || !!inv,
        role: owner ? 'admin' : inv?.role || 'operario',
        identificationNumber: inv?.identificationNumber || '',
        phone: inv?.phone || '',
        address: inv?.address || '',
      })
      .onConflictDoNothing({ target: users.email })
      .returning();
    const user = inserted[0] || null;
    if (user && inv && inv.status === 'pending') {
      await tx
        .update(invitations)
        .set({ status: 'accepted', acceptedAt: nowIso, enabled: true })
        .where(eq(invitations.email, email));
    }
    await bumpVersions(tx, ['users', 'invitations']);
    return user;
  });
}

// ---- Login throttling (per account and per IP, in memory) ---------------------------------
const FAIL_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS_PER_ACCOUNT = 8;
const MAX_FAILS_PER_IP = 30;
const failures = new Map<string, number[]>();

function recent(key: string) {
  const cutoff = Date.now() - FAIL_WINDOW_MS;
  const list = (failures.get(key) || []).filter((t) => t > cutoff);
  if (list.length) failures.set(key, list);
  else failures.delete(key);
  return list.length;
}
export function recordLoginFailure(email: string, ip: string) {
  for (const key of [`acct:${email}`, `ip:${ip}`]) failures.set(key, [...(failures.get(key) || []), Date.now()]);
}
export function clearLoginFailures(email: string) {
  failures.delete(`acct:${email}`);
}
export function assertNotThrottled(email: string, ip: string) {
  if (recent(`acct:${email}`) >= MAX_FAILS_PER_ACCOUNT || recent(`ip:${ip}`) >= MAX_FAILS_PER_IP) {
    throw new ApiError(429, 'TOO_MANY_ATTEMPTS', 'Demasiados intentos fallidos. Intenta de nuevo en 15 minutos.');
  }
}

/** Small fixed-window limiter for public endpoints (contact form, web orders). */
const buckets = new Map<string, { count: number; resetAt: number }>();
export function rateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  b.count++;
  if (b.count > max) throw new ApiError(429, 'RATE_LIMITED', 'Demasiadas solicitudes. Intenta más tarde.');
}

export const normalizeEmail = (e: string) => e.trim().toLowerCase();
