import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { users } from '@/server/db/schema';
import { ApiError, clientIp, json, readJson, route } from '@/server/http';
import { PASSWORD_LOGIN_ENABLED, canCreateAccount, createSession, provisionUser, rateLimit, recordLogin } from '@/server/auth';
import { z } from '@/server/validation';

const schema = z.object({
  email: z.string().trim().toLowerCase().email('Correo inválido').max(254),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(200),
  displayName: z.string().trim().max(100).optional(),
});

/**
 * Creates an account with email + password. Only for the owners and for emails an
 * administrator invited (same rule as before: being invited is what grants access).
 */
export const POST = route(async (req) => {
  if (!PASSWORD_LOGIN_ENABLED) throw new ApiError(403, 'PASSWORD_LOGIN_DISABLED', 'Usa Google para entrar');
  const ip = clientIp(req);
  rateLimit(`register:${ip}`, 20, 60 * 60 * 1000);
  const { email, password, displayName } = schema.parse(await readJson(req));

  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing) {
    if (existing.passwordHash) throw new ApiError(409, 'EMAIL_TAKEN', 'Ya existe una cuenta con este correo. Inicia sesión.');
    // Accounts that came from Firebase or Google: only Google can prove the email is theirs.
    throw new ApiError(409, 'USE_GOOGLE', 'Esta cuenta ya existe. Entra con Google, o pide al administrador que te asigne una contraseña.');
  }
  if (!(await canCreateAccount(email))) {
    throw new ApiError(403, 'NOT_INVITED', 'Este correo no tiene una invitación. Pide acceso al administrador.');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await provisionUser({ email, displayName: displayName || null, photoUrl: null, passwordHash });
  if (!user) throw new ApiError(409, 'EMAIL_TAKEN', 'Ya existe una cuenta con este correo. Inicia sesión.');
  await createSession(user.id, ip);
  await recordLogin(user.id);
  console.log(`[auth] registro ok user=${user.id}`);
  return json({ ok: true }, 201);
});
