import bcrypt from 'bcryptjs';
import { and, eq, ne } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { sessions, users } from '@/server/db/schema';
import { ApiError, json, readJson, route } from '@/server/http';
import { requireUser } from '@/server/auth';
import { z } from '@/server/validation';

const schema = z.object({
  currentPassword: z.string().max(200).optional(),
  newPassword: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(200),
});

/** Change (or create, for Google/imported accounts) the password. Signs out other devices. */
export const POST = route(async (req) => {
  const me = await requireUser();
  const { currentPassword, newPassword } = schema.parse(await readJson(req));
  if (me.row.passwordHash) {
    const ok = await bcrypt.compare(currentPassword || '', me.row.passwordHash);
    if (!ok) throw new ApiError(400, 'WRONG_PASSWORD', 'La contraseña actual no es correcta');
  }
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, me.id));
  await db.delete(sessions).where(and(eq(sessions.userId, me.id), ne(sessions.tokenHash, me.sessionTokenHash)));
  console.log(`[auth] contraseña ${me.row.passwordHash ? 'cambiada' : 'creada'} user=${me.id}`);
  return json({ ok: true });
});
