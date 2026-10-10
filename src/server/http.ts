import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { runMigrations } from './db/client';

/** An error whose message is safe to show to the user. */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export const badRequest = (message: string, code = 'INVALID_INPUT') => new ApiError(400, code, message);
export const notFound = (message = 'No encontrado') => new ApiError(404, 'NOT_FOUND', message);
export const forbidden = (message = 'No tienes permiso para esta acción', code = 'FORBIDDEN') => new ApiError(403, code, message);
export const unauthorized = () => new ApiError(401, 'AUTH_REQUIRED', 'Debes iniciar sesión');

export function json(data: unknown, init?: number | ResponseInit) {
  return NextResponse.json(data, typeof init === 'number' ? { status: init } : init);
}

function allowedHosts(req: NextRequest) {
  const hosts = new Set<string>();
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  if (host) hosts.add(host);
  for (const o of [process.env.PUBLIC_URL, ...(process.env.ALLOWED_ORIGINS || '').split(',')]) {
    if (!o || !o.trim()) continue;
    try {
      hosts.add(new URL(o.trim()).host);
    } catch {
      /* ignore malformed entries */
    }
  }
  return hosts;
}

/**
 * CSRF guard for cookie auth: state-changing requests must come from our own origin.
 * Browsers always send Origin on cross-site POST/PUT/PATCH/DELETE.
 */
function assertSameOrigin(req: NextRequest) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return;
  const origin = req.headers.get('origin');
  if (!origin) return; // non-browser clients (curl, scripts)
  try {
    if (allowedHosts(req).has(new URL(origin).host)) return;
  } catch {
    /* fall through */
  }
  throw new ApiError(403, 'BAD_ORIGIN', 'Petición rechazada (origen no permitido)');
}

type Ctx<P> = { params: Promise<P> };

/** Wraps a route handler: migrations, CSRF check, JSON errors without leaking internals. */
export function route<P = Record<string, string>>(handler: (req: NextRequest, params: P) => Promise<Response>) {
  return async (req: NextRequest, ctx: Ctx<P>) => {
    const started = Date.now();
    try {
      await runMigrations();
      assertSameOrigin(req);
      const params = (await ctx?.params) as P;
      return await handler(req, params);
    } catch (err) {
      if (err instanceof ApiError) {
        return json({ error: err.code, message: err.message }, err.status);
      }
      if (err instanceof ZodError) {
        const issue = err.issues[0];
        const where = issue?.path?.length ? ` (${issue.path.join('.')})` : '';
        return json({ error: 'INVALID_INPUT', message: `${issue?.message || 'Datos inválidos'}${where}` }, 400);
      }
      const pgCode = (err as { code?: string })?.code;
      if (pgCode === '23503') return json({ error: 'BAD_REFERENCE', message: 'Hace referencia a un registro que no existe' }, 400);
      if (pgCode === '23505') return json({ error: 'DUPLICATE', message: 'Ya existe un registro con esos datos' }, 409);
      if (pgCode === '23514') return json({ error: 'INVALID_INPUT', message: 'Los datos no cumplen las reglas de validación' }, 400);
      console.error(`[api] ${req.method} ${req.nextUrl.pathname} falló tras ${Date.now() - started}ms:`, err);
      return json({ error: 'INTERNAL', message: 'Error interno del servidor' }, 500);
    }
  };
}

export async function readJson(req: NextRequest): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw badRequest('El cuerpo de la petición no es JSON válido');
  }
}

/** Best-effort client IP. Only trusts proxy headers when TRUST_PROXY=true. */
export function clientIp(req: NextRequest): string {
  if (process.env.TRUST_PROXY === 'true') {
    const fwd = req.headers.get('x-forwarded-for');
    if (fwd) return fwd.split(',')[0].trim();
  }
  return 'direct';
}
