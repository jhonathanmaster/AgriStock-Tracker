'use server';
/**
 * @fileOverview Flujo para el envío de recibos de abono por correo electrónico.
 * Se incluyó soporte para imágenes CID para garantizar la visualización del logo y la firma.
 */

import { z } from 'zod';
import { defineEmailAction, getTransporter } from './transport';

const SendCollectionReceiptInputSchema = z.object({
  recipientEmail: z.string().email().describe('Correo del cliente'),
  customerName: z.string().describe('Nombre del cliente'),
  amount: z.number().describe('Monto del abono'),
  pendingBalance: z.number().describe('Saldo pendiente de la cotización'),
  date: z.string().describe('Fecha del abono'),
  quotationId: z.string().describe('ID de la cotización relacionada'),
  notes: z.string().optional().describe('Notas adicionales'),
  companyName: z.string().optional().describe('Nombre de la empresa'),
  logoUrl: z.string().optional().describe('URL o Base64 del logo de la empresa'),
  signatureUrl: z.string().optional().describe('URL o Base64 de la firma del representante'),
  representativeName: z.string().optional().describe('Nombre del representante legal'),
  representativePosition: z.string().optional().describe('Cargo del representante legal'),
});

export type SendCollectionReceiptInput = z.infer<typeof SendCollectionReceiptInputSchema>;


export async function sendCollectionReceiptEmail(input: SendCollectionReceiptInput) {
  return sendCollectionReceiptFlow(input);
}

const sendCollectionReceiptFlow = defineEmailAction(
  {
    name: 'sendCollectionReceiptFlow',
    inputSchema: SendCollectionReceiptInputSchema,
    outputSchema: z.object({ 
      success: z.boolean(), 
      error: z.string().optional()
    }),
  },
  async (input) => {
    const transporter = getTransporter();

    if (!transporter) {
      return { 
        success: false, 
        error: "Configuración de correo no disponible en el servidor." 
      };
    }

    // Preparar adjuntos para imágenes CID
    const attachments: any[] = [];
    let logoHtmlSrc = input.logoUrl;
    let signatureHtmlSrc = input.signatureUrl;

    if (input.logoUrl && input.logoUrl.startsWith('data:')) {
      attachments.push({
        filename: 'logo.png',
        path: input.logoUrl,
        cid: 'company-logo'
      });
      logoHtmlSrc = 'cid:company-logo';
    }

    if (input.signatureUrl && input.signatureUrl.startsWith('data:')) {
      attachments.push({
        filename: 'signature.png',
        path: input.signatureUrl,
        cid: 'rep-signature'
      });
      signatureHtmlSrc = 'cid:rep-signature';
    }

    const htmlBody = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 25px; border-bottom: 2px solid #4D7C0F; padding-bottom: 15px;">
          ${logoHtmlSrc ? `<img src="${logoHtmlSrc}" alt="Logo" style="max-height: 60px; margin-bottom: 10px;" />` : ''}
          <h1 style="color: #4D7C0F; margin: 0; font-size: 24px;">Confirmación de Recibo de Abono</h1>
          <p style="color: #6b7280; font-size: 12px; margin-top: 5px; text-transform: uppercase; font-weight: bold;">Comprobante de Pago Parcial</p>
        </div>
        
        <div style="margin-bottom: 20px;">
          <p style="color: #374151;">Estimado/a <strong>${input.customerName}</strong>,</p>
          <p style="color: #374151; line-height: 1.6;">Confirmamos que hemos recibido satisfactoriamente su abono relacionado con la propuesta comercial <strong>#${input.quotationId.substring(0, 8).toUpperCase()}</strong>.</p>
        </div>

        <div style="background-color: #F6F8ED; padding: 20px; border-radius: 12px; border: 1px solid #d1d5db; margin-bottom: 25px; text-align: center;">
          <p style="margin: 0; font-size: 12px; text-transform: uppercase; color: #4D7C0F; font-weight: bold;">VALOR RECIBIDO:</p>
          <p style="margin: 10px 0; font-size: 32px; font-weight: 900; color: #111;">$${input.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          <p style="margin: 0; font-size: 12px; color: #6b7280;">Fecha de Aplicación: ${new Date(input.date).toLocaleDateString('es-ES', { dateStyle: 'long' })}</p>
        </div>

        <div style="background-color: #f9fafb; padding: 15px; border-radius: 12px; border: 1px solid #e5e7eb; margin-bottom: 25px; text-align: center;">
          <p style="margin: 0; font-size: 11px; text-transform: uppercase; color: #6b7280; font-weight: bold;">ESTADO DE CUENTA ACTUAL:</p>
          <p style="margin: 5px 0; font-size: 20px; font-weight: 800; color: ${input.pendingBalance > 0 ? '#ef4444' : '#15803d'};">
            SALDO PENDIENTE: $${input.pendingBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p style="margin: 0; font-size: 10px; color: #9ca3af;">Propuesta comercial: #${input.quotationId.substring(0, 8).toUpperCase()}</p>
        </div>

        ${input.notes ? `
          <div style="margin-bottom: 25px;">
            <p style="margin: 0 0 5px 0; font-size: 12px; font-weight: bold; color: #4D7C0F;">NOTAS DEL ABONO:</p>
            <p style="margin: 0; font-size: 13px; color: #4b5563; border-left: 3px solid #e5e7eb; padding-left: 10px;">${input.notes}</p>
          </div>
        ` : ''}

        <p style="color: #374151; font-size: 13px; line-height: 1.5;">Este abono ha sido acreditado a su saldo pendiente. Puede consultar su estado de cuenta actualizado contactando a nuestro equipo comercial.</p>

        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #f3f4f6;">
          <p style="margin: 0 0 10px 0; font-size: 12px; color: #6b7280;">Cordialmente,</p>
          ${signatureHtmlSrc ? `
            <div style="margin-bottom: 10px;">
              <img src="${signatureHtmlSrc}" alt="Firma Representante" style="max-height: 60px; max-width: 200px;" />
            </div>
          ` : ''}
          <div style="font-size: 14px; font-weight: bold; color: #111;">${input.representativeName || 'Administración GeiaTienda'}</div>
          <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: bold;">${input.representativePosition || 'Representante Legal'}</div>
        </div>

        <div style="margin-top: 40px; text-align: center; color: #9ca3af; font-size: 11px; border-top: 1px solid #f3f4f6; padding-top: 20px;">
          <p style="margin: 0;">Gracias por confiar en <strong>${input.companyName || 'GeiaTienda'}</strong>.</p>
          <p style="margin: 5px 0 0; font-weight: bold;">© ${new Date().getFullYear()} Gestión Agrícola Profesional</p>
        </div>
      </div>
    `;

    try {
      await transporter.sendMail({
        from: `"${input.companyName || 'GeiaTienda'} - Recaudos" <${process.env.GMAIL_USER}>`,
        to: input.recipientEmail,
        subject: `RECIBO DE ABONO - ${input.companyName || 'GeiaTienda'} - REF #${input.quotationId.substring(0, 8).toUpperCase()}`,
        html: htmlBody,
        attachments: attachments
      });

      return { success: true };
      
    } catch (error: any) {
      console.error(`[RECIBO] Error enviando correo:`, error);
      return {
        success: false,
        error: "No se pudo enviar el recibo por correo. Intente nuevamente."
      };
    }
  }
);
