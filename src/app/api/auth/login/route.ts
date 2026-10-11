import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { users } from '@/server/db/schema';
import { ApiError, clientIp, json, readJson, route } from '@/server/http';
import {
  PASSWORD_LOGIN_ENABLED,
  assertNotThrottled,
  clearLoginFailures,
  createSession,
  recordLogin,
  recordLoginFailure,
} from '@/server/auth';
import { z } from '@/server/validation';

// Failed lookups take as long as real password checks.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

const schema = z.object({
  email: z.string().trim().toLowerCase().email('Correo inválido').max(254),
  password: z.string().min(1, 'Escribe tu contraseña').max(200),
});

export const POST = route(async (req) => {
  if (!PASSWORD_LOGIN_ENABLED) throw new ApiError(403, 'PASSWORD_LOGIN_DISABLED', 'Usa Google para entrar');
  const { email, password } = schema.parse(await readJson(req));
  const ip = clientIp(req);
  assertNotThrottled(email, ip);

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const ok = await bcrypt.compare(password, user?.passwordHash || DUMMY_HASH);
  if (!user || !user.passwordHash || !ok) {
    recordLoginFailure(email, ip);
    console.warn(`[auth] login fallido ip=${ip}`);
    if (user && !user.passwordHash && user.googleSub) {
      throw new ApiError(401, 'USE_GOOGLE', 'Esta cuenta entra con Google');
    }
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Correo o contraseña incorrectos');
  }
  clearLoginFailures(email);
  await createSession(user.id, ip);
  await recordLogin(user.id);
  console.log(`[auth] login ok user=${user.id}`);
  return json({ ok: true });
});
