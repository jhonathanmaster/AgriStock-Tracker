import { and, eq } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { invitations, users } from '@/server/db/schema';
import { ApiError, badRequest, json, notFound, readJson, route } from '@/server/http';
import { isSuperAdminEmail, randomToken, requireAdmin, sha256 } from '@/server/auth';
import { bumpVersions } from '@/server/versions';
import { publicBaseUrl } from '@/server/google';
import { sendInvitationEmail } from '@/server/email/invitation';
import { z, text, image } from '@/server/validation';

const INVITATION_TTL_MS = 24 * 60 * 60 * 1000;
const emailField = z.string().trim().toLowerCase().email('Correo inválido').max(254);
/** Users listed in the admin page: real accounts, or "inv-<email>" for invitations without an account yet. */
const target = z.object({ uid: z.string().min(1).max(300), email: emailField });
const isInvitationOnly = (uid: string) => uid.startsWith('inv-');

const detailsSchema = target.extend({
  details: z.object({
    identificationNumber: text(100),
    phone: text(100),
    address: text(1000),
    photoURL: image(),
    displayName: text(200),
    enabled: z.boolean().optional(),
  }),
});
const roleSchema = target.extend({ role: z.enum(['admin', 'operario']) });

export const POST = route<{ action: string }>(async (req, { action }) => {
  const me = await requireAdmin();
  const body = await readJson(req);

  switch (action) {
    case 'invite': {
      const { email, role } = z.object({ email: emailField, role: z.enum(['admin', 'operario']).optional() }).parse(body);
      const token = randomToken();
      const now = Date.now();
      const acceptLink = `${publicBaseUrl(req)}/accept-invitation?email=${encodeURIComponent(email)}&token=${token}`;
      await db.transaction(async (tx) => {
        await tx
          .insert(invitations)
          .values({
            email,
            role: role || 'operario',
            status: 'pending',
            enabled: true,
            tokenHash: sha256(token),
            expiresAt: new Date(now + INVITATION_TTL_MS).toISOString(),
            invitedAt: new Date(now).toISOString(),
          })
          .onConflictDoUpdate({
            target: invitations.email,
            set: {
              status: 'pending',
              enabled: true,
              tokenHash: sha256(token),
              expiresAt: new Date(now + INVITATION_TTL_MS).toISOString(),
              invitedAt: new Date(now).toISOString(),
            },
          });
        await bumpVersions(tx, ['invitations']);
      });
      const mail = await sendInvitationEmail({ email, acceptLink });
      await db.update(invitations).set({ lastEmailBody: mail.body }).where(eq(invitations.email, email));
      console.log(`[admin] invitación ${email} por user=${me.id} correo=${mail.success ? 'enviado' : 'no enviado'}`);
      // When email isn't configured the admin can still share the link by hand.
      return json({ ok: true, emailSent: mail.success, error: mail.error, acceptLink: mail.success ? undefined : acceptLink });
    }

    case 'approve-invitation': {
      const { email } = z.object({ email: emailField }).parse(body);
      await db.transaction(async (tx) => {
        await tx
          .update(invitations)
          .set({ status: 'accepted', enabled: true, acceptedAt: new Date().toISOString() })
          .where(eq(invitations.email, email));
        // If the person already signed in (account waiting for approval), enable it too.
        await tx.update(users).set({ enabled: true, updatedAt: new Date() }).where(eq(users.email, email));
        await bumpVersions(tx, ['invitations', 'users']);
      });
      return json({ ok: true });
    }

    case 'delete-user': {
      const { uid, email } = target.parse(body);
      if (isSuperAdminEmail(email)) throw new ApiError(400, 'PROTECTED', 'No se puede eliminar al administrador principal');
      if (uid === me.id) throw badRequest('No puedes eliminar tu propia cuenta');
      if (!me.isSuperAdmin) {
        const [u] = await db.select({ role: users.role }).from(users).where(eq(users.email, email)).limit(1);
        if (u?.role === 'admin') throw new ApiError(403, 'ADMIN_ONLY', 'Solo el administrador principal puede eliminar a otro administrador');
      }
      await db.transaction(async (tx) => {
        if (!isInvitationOnly(uid)) await tx.delete(users).where(and(eq(users.id, uid), eq(users.email, email)));
        // Also remove the invitation: otherwise signing in again would re-enable the account.
        await tx.delete(invitations).where(eq(invitations.email, email));
        await bumpVersions(tx, ['users', 'invitations']);
      });
      console.log(`[admin] acceso eliminado ${email} por user=${me.id}`);
      return json({ ok: true });
    }

    case 'update-details': {
      const { uid, email, details } = detailsSchema.parse(body);
      const common = {
        ...(details.identificationNumber !== undefined && { identificationNumber: details.identificationNumber }),
        ...(details.phone !== undefined && { phone: details.phone }),
        ...(details.address !== undefined && { address: details.address }),
        ...(details.photoURL !== undefined && { photoUrl: details.photoURL }),
      };
      await db.transaction(async (tx) => {
        if (isInvitationOnly(uid)) {
          const r = await tx
            .update(invitations)
            .set({ ...common, ...(details.enabled !== undefined && { enabled: details.enabled }) })
            .where(eq(invitations.email, email))
            .returning();
          if (!r.length) throw notFound('La invitación no existe');
        } else {
          if (details.enabled === false && isSuperAdminEmail(email)) throw badRequest('No se puede deshabilitar al administrador principal');
          const r = await tx
            .update(users)
            .set({
              ...common,
              ...(details.displayName !== undefined && { displayName: details.displayName }),
              ...(details.enabled !== undefined && { enabled: details.enabled }),
              updatedAt: new Date(),
            })
            .where(eq(users.id, uid))
            .returning();
          if (!r.length) throw notFound('El usuario no existe');
        }
        await bumpVersions(tx, ['users', 'invitations']);
      });
      return json({ ok: true });
    }

    case 'update-role': {
      const { uid, email, role } = roleSchema.parse(body);
      if (!me.isSuperAdmin) throw new ApiError(403, 'SUPER_ADMIN_ONLY', 'Solo el administrador principal puede cambiar roles');
      if (isSuperAdminEmail(email) && role !== 'admin') throw badRequest('El administrador principal siempre es administrador');
      await db.transaction(async (tx) => {
        if (isInvitationOnly(uid)) await tx.update(invitations).set({ role }).where(eq(invitations.email, email));
        else await tx.update(users).set({ role, updatedAt: new Date() }).where(eq(users.id, uid));
        await bumpVersions(tx, ['users', 'invitations']);
      });
      return json({ ok: true });
    }

    default:
      throw notFound('Acción desconocida');
  }
});
