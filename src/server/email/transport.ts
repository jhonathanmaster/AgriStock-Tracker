import 'server-only';
import nodemailer from 'nodemailer';
import { headers } from 'next/headers';
import type { ZodType, ZodTypeDef } from 'zod';
import { SUPER_ADMIN_EMAILS, getSessionUser, rateLimit } from '../auth';
import { ApiError } from '../http';

/**
 * Gmail (or any SMTP server) for outgoing mail.
 * GMAIL_USER + GMAIL_APP_PASSWORD keep working as before; SMTP_HOST/SMTP_PORT/SMTP_SECURE
 * switch to another provider. Without credentials, emails are not sent (the action reports it).
 */
export function getTransporter() {
  const user = process.env.GMAIL_USER || process.env.SMTP_USER;
  const pass = process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS;
  if (!user || !pass) {
    console.warn('[correo] GMAIL_USER / GMAIL_APP_PASSWORD no configurados: el correo no se envía.');
    return null;
  }
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user, pass },
    });
  }
  return nodemailer.createTransport({ service: 'gmail', auth: { user, pass } });
}

/** Where internal notifications go (copy of purchase orders, receptions, quotations). */
export const adminNotificationEmail = () =>
  process.env.ADMIN_NOTIFICATION_EMAIL || [...SUPER_ADMIN_EMAILS][0] || process.env.GMAIL_USER || '';

/** Public actions (no sign-in): the contact form. Everything else requires an enabled user. */
const PUBLIC_ACTIONS = new Set(['sendContactFlow']);

export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/**
 * Replaces Genkit's defineFlow (the flows never used AI): validates the input and checks who
 * is calling, because server actions can be invoked by anyone who knows their id.
 */
export function defineEmailAction<I, O extends { success: boolean; error?: string }>(
  config: { name: string; inputSchema: ZodType<I, ZodTypeDef, unknown>; outputSchema?: unknown },
  handler: (input: I) => Promise<O>,
) {
  return async (raw: unknown): Promise<O> => {
    try {
      if (PUBLIC_ACTIONS.has(config.name)) {
        const fwd = process.env.TRUST_PROXY === 'true' ? (await headers()).get('x-forwarded-for') : null;
        rateLimit(`${config.name}:${fwd?.split(',')[0].trim() || 'all'}`, fwd ? 5 : 30, 60 * 60 * 1000);
      } else {
        const me = await getSessionUser();
        if (!me || !me.isEnabled) return { success: false, error: 'Debes iniciar sesión con una cuenta habilitada.' } as O;
      }
      const parsed = config.inputSchema.safeParse(raw);
      if (!parsed.success) return { success: false, error: 'Datos del correo inválidos.' } as O;
      const input = parsed.data as I & { adminEmail?: string };
      // The copy for the administrator always goes to the configured address, not one sent by the browser.
      if (input && typeof input === 'object' && 'adminEmail' in input) input.adminEmail = adminNotificationEmail();
      return await handler(input);
    } catch (err) {
      if (err instanceof ApiError) return { success: false, error: err.message } as O;
      console.error(`[correo] ${config.name} falló:`, err);
      return { success: false, error: 'No se pudo enviar el correo.' } as O;
    }
  };
}
