
'use server';
/**
 * @fileOverview Flujo para el envío de correos electrónicos desde el formulario de contacto público.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import nodemailer from 'nodemailer';

const SendContactInputSchema = z.object({
  name: z.string().min(2).describe('Nombre del remitente'),
  email: z.string().email().describe('Correo del remitente'),
  subject: z.string().min(5).describe('Asunto del mensaje'),
  message: z.string().min(10).describe('Contenido del mensaje'),
});

export type SendContactInput = z.infer<typeof SendContactInputSchema>;

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

export async function sendContactEmail(input: SendContactInput) {
  return sendContactFlow(input);
}

const sendContactFlow = ai.defineFlow(
  {
    name: 'sendContactFlow',
    inputSchema: SendContactInputSchema,
    outputSchema: z.object({ 
      success: z.boolean(), 
      error: z.string().optional()
    }),
  },
  async (input) => {
    const transporter = getTransporter();
    const recipient = 'grupoempresarialinversonessas@gmail.com';

    if (!transporter) {
      return { 
        success: false, 
        error: "Configuración de correo no disponible en el servidor." 
      };
    }

    try {
      await transporter.sendMail({
        from: `"GeiaTienda Contacto" <${process.env.GMAIL_USER}>`,
        to: recipient,
        replyTo: input.email,
        subject: `[CONTACTO WEB] ${input.subject}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
            <h2 style="color: #4D7C0F; border-bottom: 2px solid #4D7C0F; padding-bottom: 10px;">Nuevo Mensaje de Contacto</h2>
            <div style="margin-top: 20px; color: #374151;">
              <p><strong>Remitente:</strong> ${input.name}</p>
              <p><strong>Correo:</strong> <a href="mailto:${input.email}">${input.email}</a></p>
              <p><strong>Asunto:</strong> ${input.subject}</p>
              <hr style="border: 0; border-top: 1px solid #f3f4f6; margin: 20px 0;" />
              <p style="white-space: pre-wrap; line-height: 1.6;">${input.message}</p>
            </div>
            <div style="margin-top: 30px; text-align: center; color: #9ca3af; font-size: 11px;">
              <p>Este mensaje fue enviado desde el formulario de contacto de GeiaTienda Tracker.</p>
            </div>
          </div>
        `
      });

      return { success: true };
      
    } catch (error: any) {
      console.error(`[CONTACTO] Error enviando correo:`, error);
      return {
        success: false,
        error: "No se pudo enviar el mensaje en este momento. Intente más tarde."
      };
    }
  }
);
