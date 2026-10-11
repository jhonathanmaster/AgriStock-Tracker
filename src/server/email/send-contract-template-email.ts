'use server';
/**
 * @fileOverview Envío de la preforma de contrato (PDF) por correo con identidad corporativa.
 * El PDF, el logo y la firma se leen de la configuración guardada en el servidor: el navegador
 * solo indica el destinatario, así nadie puede adjuntar archivos arbitrarios.
 */

import { z } from 'zod';
import { loadConfig } from '../data';
import { defineEmailAction, escapeHtml, getTransporter } from './transport';

const SendContractTemplateInputSchema = z.object({
  recipientEmail: z.string().email().describe('Correo del destinatario'),
});

export type SendContractTemplateInput = z.infer<typeof SendContractTemplateInputSchema>;

const isPdfDataUri = (v: unknown): v is string => typeof v === 'string' && /^data:application\/pdf;base64,/.test(v);
const isImageDataUri = (v: unknown): v is string => typeof v === 'string' && /^data:image\/[a-z0-9.+-]+;base64,/i.test(v);

export async function sendContractTemplateEmail(input: SendContractTemplateInput) {
  return sendContractTemplateFlow(input);
}

const sendContractTemplateFlow = defineEmailAction(
  {
    name: 'sendContractTemplateFlow',
    inputSchema: SendContractTemplateInputSchema,
  },
  async (input) => {
    const config = (await loadConfig()) as Record<string, string | undefined> | null;
    if (!isPdfDataUri(config?.contractTemplateUrl)) {
      return { success: false, error: 'No hay una preforma de contrato en PDF guardada. Súbela y guarda la configuración primero.' };
    }

    const transporter = getTransporter();
    if (!transporter) {
      return { success: false, error: 'Configuración de correo no disponible en el servidor.' };
    }

    const companyName = escapeHtml(config?.companyName || 'GeiaTienda');
    const companyEmail = escapeHtml(config?.companyEmail || process.env.GMAIL_USER || '');
    const representativeName = escapeHtml(config?.representativeName || 'Administración GeiaTienda');
    const representativePosition = escapeHtml(config?.representativePosition || 'Representante Legal');

    const attachments: { filename: string; path: string; cid?: string }[] = [
      { filename: 'Preforma_Contrato_GeiaTienda.pdf', path: config!.contractTemplateUrl! },
    ];
    let logoHtmlSrc = '';
    let signatureHtmlSrc = '';
    if (isImageDataUri(config?.logoUrl)) {
      attachments.push({ filename: 'logo.png', path: config!.logoUrl!, cid: 'company-logo' });
      logoHtmlSrc = 'cid:company-logo';
    }
    if (isImageDataUri(config?.signatureUrl)) {
      attachments.push({ filename: 'signature.png', path: config!.signatureUrl!, cid: 'rep-signature' });
      signatureHtmlSrc = 'cid:rep-signature';
    }

    const htmlBody = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 25px; border-bottom: 2px solid #4D7C0F; padding-bottom: 15px;">
          ${logoHtmlSrc ? `<img src="${logoHtmlSrc}" alt="Logo" style="max-height: 60px; margin-bottom: 10px;" />` : ''}
          <h2 style="color: #4D7C0F; margin: 0; font-size: 24px;">Envío de Documentación Oficial</h2>
          <p style="color: #6b7280; font-size: 12px; margin-top: 5px; text-transform: uppercase; font-weight: bold;">${companyName}</p>
        </div>

        <p style="color: #374151; line-height: 1.6; margin-top: 20px;">
          Hola, adjunto a este mensaje encontrará la <strong>Preforma de Contrato</strong> solicitada para los procesos comerciales con <strong>${companyName}</strong>.
        </p>
        <p style="color: #374151; line-height: 1.6;">Este documento se envía para fines informativos, revisión legal y debida diligencia.</p>

        <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; border-left: 4px solid #4D7C0F; margin: 25px 0;">
          <p style="margin: 0; font-size: 13px; color: #4b5563;">
            <strong>Nota:</strong> El archivo adjunto está en formato PDF. Si tiene dificultades para visualizarlo, por favor responda a este correo o escriba directamente a <strong>${companyEmail}</strong>.
          </p>
        </div>

        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #f3f4f6;">
          <p style="margin: 0 0 10px 0; font-size: 12px; color: #6b7280;">Cordialmente,</p>
          ${signatureHtmlSrc ? `<div style="margin-bottom: 10px;"><img src="${signatureHtmlSrc}" alt="Firma Representante" style="max-height: 60px; max-width: 200px;" /></div>` : ''}
          <div style="font-size: 14px; font-weight: bold; color: #111;">${representativeName}</div>
          <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: bold;">${representativePosition}</div>
        </div>

        <div style="margin-top: 40px; text-align: center; color: #9ca3af; font-size: 11px; border-top: 1px solid #f3f4f6; padding-top: 20px;">
          <p style="margin: 0;">Gracias por su interés en nuestros servicios.</p>
          <p style="margin: 5px 0 0; font-weight: bold;">© ${new Date().getFullYear()} ${companyName} - Gestión Agrícola Profesional</p>
        </div>
      </div>
    `;

    try {
      await transporter.sendMail({
        from: `"${(config?.companyName || 'GeiaTienda').replace(/["\r\n]/g, '')} - Documentación" <${process.env.GMAIL_USER || process.env.SMTP_USER}>`,
        to: input.recipientEmail,
        subject: `Preforma de Contrato - ${(config?.companyName || 'GeiaTienda').replace(/[\r\n]/g, ' ')}`,
        html: htmlBody,
        attachments,
      });
      return { success: true };
    } catch (error) {
      console.error('[contrato] Error enviando correo:', error);
      return { success: false, error: 'No se pudo enviar el contrato por correo. Intente nuevamente.' };
    }
  },
);
