import { json, route } from '@/server/http';
import { getSessionUser, toProfile, toPublicUser } from '@/server/auth';

export const dynamic = 'force-dynamic';

/** Current session. Signed-out visitors get { user: null } (not an error). */
export const GET = route(async () => {
  const u = await getSessionUser();
  if (!u) return json({ user: null });
  return json({
    user: toPublicUser(u),
    profile: toProfile(u.row),
    isSuperAdmin: u.isSuperAdmin,
    isAdmin: u.isAdmin,
    isEnabled: u.isEnabled,
  });
});
