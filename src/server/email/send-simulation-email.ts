'use server';
/**
 * @fileOverview Flujo para el envío de simulaciones de costos de importación por correo electrónico.
 * Se incluyó soporte para imágenes CID (Logo, Firma y Productos) para garantizar la visualización.
 */

import { z } from 'zod';
import { defineEmailAction, getTransporter } from './transport';

const SimulationItemSchema = z.object({
  productName: z.string(),
  specifications: z.string().optional(),
  imageUrl: z.string().optional(),
  quantity: z.number(),
  usdPrice: z.number(),
  trm: z.number(),
  legalPerc: z.number(),
  nationalPerc: z.number(),
  transportPerc: z.number(),
  profitPerc: z.number(),
  unitCostCop: z.number(),
  total: z.number(),
});

const SendSimulationInputSchema = z.object({
  recipientEmail: z.string().email().describe('Correo del destinatario'),
  companyName: z.string().describe('Nombre de la empresa que envía'),
  logoUrl: z.string().optional().describe('URL o Base64 del logo'),
  signatureUrl: z.string().optional().describe('URL o Base64 de la firma'),
  representativeName: z.string().optional().describe('Nombre del representante'),
  representativePosition: z.string().optional().describe('Cargo del representante'),
  items: z.array(SimulationItemSchema).describe('Lista de productos simulados'),
  totalValue: z.number().describe('Total general de la simulación'),
});

export type SendSimulationInput = z.infer<typeof SendSimulationInputSchema>;


export async function sendSimulationEmail(input: SendSimulationInput) {
  return sendSimulationFlow(input);
}

const sendSimulationFlow = defineEmailAction(
  {
    name: 'sendSimulationFlow',
    inputSchema: SendSimulationInputSchema,
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

    const attachments: any[] = [];
    let logoHtmlSrc = input.logoUrl;
    let signatureHtmlSrc = input.signatureUrl;

    // Procesar Logo CID
    if (input.logoUrl && input.logoUrl.startsWith('data:')) {
      attachments.push({
        filename: 'logo.png',
        path: input.logoUrl,
        cid: 'company-logo'
      });
      logoHtmlSrc = 'cid:company-logo';
    }

    // Procesar Firma CID
    if (input.signatureUrl && input.signatureUrl.startsWith('data:')) {
      attachments.push({
        filename: 'signature.png',
        path: input.signatureUrl,
        cid: 'rep-signature'
      });
      signatureHtmlSrc = 'cid:rep-signature';
    }

    // Procesar Imágenes de Productos CID
    const itemsWithCid = input.items.map((item, idx) => {
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

    const itemsHtml = itemsWithCid.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">
          <div style="display: flex; align-items: center; gap: 10px;">
            ${item.htmlSrc ? `<img src="${item.htmlSrc}" alt="${item.productName}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px; border: 1px solid #eee;" />` : ''}
            <div>
              <div style="font-weight: bold; color: #111;">${item.productName}</div>
              ${item.specifications ? `<div style="font-size: 11px; color: #6b7280; font-style: italic; margin-top: 4px;">Specs: ${item.specifications}</div>` : ''}
            </div>
          </div>
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #6b7280; font-size: 11px;">$${item.usdPrice.toFixed(2)} USD</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${item.unitCostCop.toLocaleString('en-US', { minimumFractionDigits: 2 })} COP</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold; color: #4D7C0F;">$${item.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
      </tr>
    `).join('');

    const htmlBody = `
      <div style="font-family: sans-serif; max-width: 700px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 30px; border-bottom: 3px solid #4D7C0F; padding-bottom: 20px;">
          ${logoHtmlSrc ? `<img src="${logoHtmlSrc}" alt="Logo" style="max-height: 70px; margin-bottom: 10px;" />` : ''}
          <h2 style="color: #4D7C0F; margin: 0; font-size: 24px;">Proyección de Costos de Importación</h2>
          <p style="color: #6b7280; font-size: 12px; margin-top: 5px; text-transform: uppercase; font-weight: bold;">Simulación Comercial - ${input.companyName}</p>
        </div>

        <p style="color: #374151;">Hola,</p>
        <p style="color: #374151;">Adjuntamos el desglose de la simulación de costos realizada según los parámetros de importación actuales (TRM, Aranceles y Logística):</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 25px 0; font-size: 13px;">
          <thead>
            <tr style="background-color: #F6F8ED;">
              <th style="padding: 12px 10px; text-align: left; border-bottom: 2px solid #4D7C0F; color: #4D7C0F;">Producto / Referencia</th>
              <th style="padding: 12px 10px; text-align: center; border-bottom: 2px solid #4D7C0F; color: #4D7C0F;">Cant.</th>
              <th style="padding: 12px 10px; text-align: right; border-bottom: 2px solid #4D7C0F; color: #4D7C0F;">Precio USD</th>
              <th style="padding: 12px 10px; text-align: right; border-bottom: 2px solid #4D7C0F; color: #4D7C0F;">Unitario COP</th>
              <th style="padding: 12px 10px; text-align: right; border-bottom: 2px solid #4D7C0F; color: #4D7C0F;">Total COP</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
          <tfoot>
            <tr style="background-color: #F9FAFB; font-weight: bold;">
              <td colspan="4" style="padding: 20px 10px; text-align: right; font-size: 14px; color: #374151;">TOTAL GENERAL PROYECTADO (COP):</td>
              <td style="padding: 20px 10px; text-align: right; font-size: 20px; color: #4D7C0F; font-weight: 900;">$${input.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            </tr>
          </tfoot>
        </table>

        <div style="background-color: #fefce8; padding: 15px; border-radius: 8px; border: 1px solid #fef08a; margin-top: 20px;">
          <p style="margin: 0; font-size: 12px; color: #854d0e; line-height: 1.5;">
            <strong>Aviso Legal:</strong> Esta simulación es informativa y está basada en proyecciones de TRM y gastos aduaneros variables. Los valores finales pueden cambiar al momento de la nacionalización real de la mercancía.
          </p>
        </div>
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #f3f4f6;">
          <p style="margin: 0 0 10px 0; font-size: 12px; color: #6b7280;">Cordialmente,</p>
          ${signatureHtmlSrc ? `
            <div style="margin-bottom: 10px;">
              <img src="${signatureHtmlSrc}" alt="Firma Autorizada" style="max-height: 60px; max-width: 200px;" />
            </div>
          ` : ''}
          <div style="font-size: 14px; font-weight: bold; color: #111;">${input.representativeName || 'Gerencia Comercial'}</div>
          <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: bold;">${input.representativePosition || 'Representante Legal'}</div>
        </div>

        <div style="margin-top: 40px; text-align: center; color: #9ca3af; font-size: 11px; border-top: 1px solid #f3f4f6; padding-top: 20px;">
          <p>Este es un documento automático generado por el sistema de gestión de <strong>${input.companyName}</strong>.</p>
          <p style="margin-top: 5px;">© ${new Date().getFullYear()} Gestión Agrícola Profesional</p>
        </div>
      </div>
    `;

    try {
      await transporter.sendMail({
        from: `"${input.companyName} - Simulador" <${process.env.GMAIL_USER}>`,
        to: input.recipientEmail,
        subject: `Simulación de Costos Proyectada - ${input.companyName}`,
        html: htmlBody,
        attachments: attachments
      });

      return { success: true };
      
    } catch (error: any) {
      console.error(`[SIMULACIÓN] Error enviando correo:`, error);
      return {
        success: false,
        error: "No se pudo enviar el correo en este momento. Verifique la configuración del servidor."
      };
    }
  }
);
