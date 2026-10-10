
'use server';
/**
 * @fileOverview Flujo para el envío de correos electrónicos de invitación usando Gmail (Nodemailer).
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import nodemailer from 'nodemailer';

const SendInvitationInputSchema = z.object({
  email: z.string().email().describe('El correo electrónico del operario a invitar.'),
  acceptLink: z.string().url().describe('El link único para aceptar la invitación.'),
});

export type SendInvitationInput = z.infer<typeof SendInvitationInputSchema>;

const getTransporter = () => {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    console.error("[SISTEMA CORREO] GMAIL_USER o GMAIL_APP_PASSWORD no están definidos.");
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });
};

export async function sendInvitationEmail(input: SendInvitationInput) {
  return sendInvitationFlow(input);
}

const sendInvitationFlow = ai.defineFlow(
  {
    name: 'sendInvitationFlow',
    inputSchema: SendInvitationInputSchema,
    outputSchema: z.object({ 
      success: z.boolean(), 
      body: z.string(),
      error: z.string().optional()
    }),
  },
  async (input) => {
    const standardBody = `Hola,\n\nHas sido invitado a la plataforma GeiaTienda como Operario. Para activar tu cuenta, haz clic en el siguiente enlace:\n\n${input.acceptLink}\n\nBienvenido al equipo!`;

    const transporter = getTransporter();

    if (!transporter) {
      return { 
        success: false, 
        body: standardBody, 
        error: "Credenciales de Gmail no configuradas." 
      };
    }

    try {
      await transporter.sendMail({
        from: `"GeiaTienda Admin" <${process.env.GMAIL_USER}>`,
        to: input.email,
        subject: 'Invitación de Acceso - GeiaTienda Tracker',
        text: standardBody,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
            <h2 style="color: #4D7C0F;">Bienvenido a GeiaTienda</h2>
            <p>Hola,</p>
            <p>Has sido invitado a la plataforma <strong>GeiaTienda</strong> como Operario.</p>
            <p>Para activar tu cuenta, haz clic en el siguiente botón:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${input.acceptLink}" style="background-color: #4D7C0F; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                Aceptar Invitación
              </a>
            </div>
            <p style="font-size: 12px; color: #6b7280;">Si el botón no funciona, copia y pega este enlace:</p>
            <p style="font-size: 12px; color: #6b7280;">${input.acceptLink}</p>
          </div>
        `
      });

      return { success: true, body: standardBody };
      
    } catch (error: any) {
      console.error(`[INVITACIÓN] Error enviando correo:`, error);
      return {
        success: false,
        body: standardBody,
        error: error.message
      };
    }
  }
);
