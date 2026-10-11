'use server';
/**
 * @fileOverview Flujo para el envío de cotizaciones formales por correo electrónico con identidad corporativa.
 * Se optimizó el manejo de imágenes (Logo, Firma y Productos) mediante adjuntos CID para asegurar su visualización.
 */

import { z } from 'zod';
import { defineEmailAction, getTransporter } from './transport';

const QuotationItemSchema = z.object({
  productName: z.string(),
  specifications: z.string().optional(),
  imageUrl: z.string().optional(),
  quantity: z.number(),
  unit: z.string(),
  price: z.number(),
  total: z.number(),
});

const SendQuotationInputSchema = z.object({
  recipientEmail: z.string().email().describe('Correo del cliente'),
  adminEmail: z.string().email().describe('Correo del administrador para copia (CC)'),
  customerName: z.string().describe('Nombre del cliente'),
  quotationId: z.string().describe('ID de la cotización'),
  items: z.array(QuotationItemSchema).describe('Lista de productos cotizados'),
  totalValue: z.number().describe('Total de la cotización'),
  notes: z.string().optional().describe('Notas adicionales'),
  companyName: z.string().optional().describe('Nombre de la empresa'),
  logoUrl: z.string().optional().describe('URL o Base64 del logo de la empresa'),
  signatureUrl: z.string().optional().describe('URL o Base64 de la firma del representante'),
  representativeName: z.string().optional().describe('Nombre del representante legal'),
  representativePosition: z.string().optional().describe('Cargo del representante legal'),
});

export type SendQuotationInput = z.infer<typeof SendQuotationInputSchema>;


export async function sendQuotationEmail(input: SendQuotationInput) {
  return sendQuotationFlow(input);
}

const sendQuotationFlow = defineEmailAction(
  {
    name: 'sendQuotationFlow',
    inputSchema: SendQuotationInputSchema,
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

    // Preparar adjuntos para imágenes CID (evita bloqueo de Base64 en correos)
    const attachments: any[] = [];
    let logoHtmlSrc = input.logoUrl;
    let signatureHtmlSrc = input.signatureUrl;

    // 1. Procesar Logo CID
    if (input.logoUrl && input.logoUrl.startsWith('data:')) {
      attachments.push({
        filename: 'logo.png',
        path: input.logoUrl,
        cid: 'company-logo'
      });
      logoHtmlSrc = 'cid:company-logo';
    }

    // 2. Procesar Firma CID
    if (input.signatureUrl && input.signatureUrl.startsWith('data:')) {
      attachments.push({
        filename: 'signature.png',
        path: input.signatureUrl,
        cid: 'rep-signature'
      });
      signatureHtmlSrc = 'cid:rep-signature';
    }

    // 3. Procesar Imágenes de Productos CID
    const itemsWithHtmlSrc = input.items.map((item, idx) => {
      let itemHtmlSrc = item.imageUrl;
      if (item.imageUrl && item.imageUrl.startsWith('data:')) {
        const cid = `item-img-${idx}`;
        attachments.push({
          filename: `product-${idx}.png`,
          path: item.imageUrl,
          cid: cid
        });
        itemHtmlSrc = `cid:${cid}`;
      }
      return { ...item, htmlSrc: itemHtmlSrc };
    });

    const itemsHtml = itemsWithHtmlSrc.map(item => `
      <tr>
        <td style="padding: 12px 10px; border-bottom: 1px solid #e5e7eb;">
          <div style="display: flex; align-items: center; gap: 10px;">
            ${item.htmlSrc ? `
              <div style="width: 45px; height: 45px; border-radius: 6px; overflow: hidden; border: 1px solid #eee; background-color: #f9fafb; flex-shrink: 0;">
                <img src="${item.htmlSrc}" alt="${item.productName}" style="width: 100%; height: 100%; object-fit: cover;" />
              </div>
            ` : ''}
            <div>
              <div style="font-weight: bold; color: #111; font-size: 14px;">${item.productName}</div>
              ${item.specifications ? `<div style="font-size: 11px; color: #6b7280; font-style: italic; margin-top: 4px;">${item.specifications}</div>` : ''}
            </div>
          </div>
        </td>
        <td style="padding: 12px 10px; border-bottom: 1px solid #e5e7eb; text-align: center; color: #374151;">${item.quantity} ${item.unit}</td>
        <td style="padding: 12px 10px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #374151;">$${item.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
        <td style="padding: 12px 10px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold; color: #4D7C0F;">$${item.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
      </tr>
    `).join('');

    const htmlBody = `
      <div style="font-family: sans-serif; max-width: 700px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 30px; border-bottom: 3px solid #4D7C0F; padding-bottom: 20px;">
          ${logoHtmlSrc ? `
            <img src="${logoHtmlSrc}" alt="Logo ${input.companyName}" style="max-height: 80px; margin-bottom: 15px;" />
          ` : ''}
          <h1 style="color: #4D7C0F; margin: 0; font-size: 28px;">${input.companyName || 'GeiaTienda'}</h1>
          <p style="color: #6b7280; font-size: 14px; margin-top: 5px; text-transform: uppercase; font-weight: bold; letter-spacing: 1px;">Propuesta Comercial Formal</p>
        </div>
        
        <div style="margin-bottom: 25px;">
          <p style="color: #374151; font-size: 16px;">Estimado/a <strong>${input.customerName}</strong>,</p>
          <p style="color: #374151; line-height: 1.6;">Es un gusto para nosotros presentarle la siguiente oferta comercial detallada según su solicitud. En <strong>${input.companyName || 'GeiaTienda'}</strong> estamos comprometidos con brindarle los mejores insumos para su producción.</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin: 25px 0; font-size: 14px; border: 1px solid #f3f4f6;">
          <thead>
            <tr style="background-color: #F6F8ED;">
              <th style="padding: 12px 10px; text-align: left; border-bottom: 2px solid #4D7C0F; color: #4D7C0F;">Descripción / Especificaciones</th>
              <th style="padding: 12px 10px; text-align: center; border-bottom: 2px solid #4D7C0F; color: #4D7C0F;">Cant.</th>
              <th style="padding: 12px 10px; text-align: right; border-bottom: 2px solid #4D7C0F; color: #4D7C0F;">P. Unitario</th>
              <th style="padding: 12px 10px; text-align: right; border-bottom: 2px solid #4D7C0F; color: #4D7C0F;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
          <tfoot>
            <tr style="background-color: #F9FAFB;">
              <td colspan="3" style="padding: 20px 10px; text-align: right; font-weight: bold; color: #374151; font-size: 16px;">VALOR TOTAL PROPUESTA:</td>
              <td style="padding: 20px 10px; text-align: right; font-weight: bold; color: #4D7C0F; font-size: 22px;">
                $${input.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tfoot>
        </table>

        ${input.notes ? `
          <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; border-left: 4px solid #4D7C0F; margin-bottom: 25px;">
            <p style="margin: 0 0 5px 0; font-size: 12px; font-weight: bold; color: #4D7C0F; text-transform: uppercase;">Notas y Validez:</p>
            <p style="margin: 0; font-size: 13px; color: #4b5563; white-space: pre-wrap;">${input.notes}</p>
          </div>
        ` : ''}

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

        <div style="text-align: center; color: #9ca3af; font-size: 11px; margin-top: 40px; border-top: 1px solid #f3f4f6; padding-top: 20px;">
          <p style="margin: 10px 0 0;">Este documento es una cotización formal emitida por el sistema GeiaTienda Tracker.</p>
          <p style="margin: 5px 0;">Referencia: <strong>#${input.quotationId.substring(0, 8).toUpperCase()}</strong></p>
          <p style="margin: 15px 0 0; font-weight: bold;">© ${new Date().getFullYear()} Gestión Agrícola Profesional</p>
        </div>
      </div>
    `;

    try {
      await transporter.sendMail({
        from: `"${input.companyName || 'GeiaTienda'} - Cotizaciones" <${process.env.GMAIL_USER}>`,
        to: input.recipientEmail,
        cc: input.adminEmail,
        subject: `PROPUESTA COMERCIAL - ${input.companyName || 'GeiaTienda'} - REF #${input.quotationId.substring(0, 8).toUpperCase()}`,
        html: htmlBody,
        attachments: attachments
      });

      return { success: true };
      
    } catch (error: any) {
      console.error(`[COTIZACIÓN] Error enviando correo:`, error);
      return {
        success: false,
        error: "No se pudo enviar la cotización por correo. Verifique la configuración del servidor."
      };
    }
  }
);
