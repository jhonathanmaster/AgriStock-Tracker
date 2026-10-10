import { json, route } from '@/server/http';
import { PASSWORD_LOGIN_ENABLED } from '@/server/auth';
import { GOOGLE_ENABLED } from '@/server/google';

export const dynamic = 'force-dynamic';

export const GET = route(async () => json({ google: GOOGLE_ENABLED, passwordLogin: PASSWORD_LOGIN_ENABLED }));
