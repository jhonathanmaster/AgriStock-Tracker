
'use server';
/**
 * @fileOverview Flujo para el envío de correos electrónicos de órdenes de compra a proveedores con copia a administración.
 */

import { z } from 'zod';
import { defineEmailAction, getTransporter } from './transport';

const PurchaseOrderItemSchema = z.object({
  productName: z.string(),
  quantity: z.number(),
  unit: z.string(),
  totalCost: z.number(),
});

const SendPurchaseOrderInputSchema = z.object({
  supplierEmail: z.string().email().describe('El correo electrónico del proveedor.'),
  adminEmail: z.string().email().describe('El correo del administrador para copia (CC).'),
  supplierName: z.string().describe('Nombre del proveedor.'),
  items: z.array(PurchaseOrderItemSchema).describe('Lista de productos solicitados.'),
});

export type SendPurchaseOrderInput = z.infer<typeof SendPurchaseOrderInputSchema>;


export async function sendPurchaseOrderEmail(input: SendPurchaseOrderInput) {
  return sendPurchaseOrderFlow(input);
}

const sendPurchaseOrderFlow = defineEmailAction(
  {
    name: 'sendPurchaseOrderFlow',
    inputSchema: SendPurchaseOrderInputSchema,
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
        error: "Configuración de correo incompleta en el servidor." 
      };
    }

    const itemsHtml = input.items.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #374151;">${item.productName}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold;">${item.quantity} ${item.unit}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #4D7C0F;">$${item.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
      </tr>
    `).join('');

    const totalOrder = input.items.reduce((sum, item) => sum + item.totalCost, 0);

    const htmlBody = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #4D7C0F; margin: 0; font-size: 24px;">GeiaTienda Tracker</h1>
          <p style="color: #6b7280; font-size: 14px; margin-top: 5px;">Orden de Compra Oficial</p>
        </div>
        
        <p style="color: #374151;">Estimado/a <strong>${input.supplierName}</strong>,</p>
        <p style="color: #374151; line-height: 1.5;">Por medio de la presente, solicitamos formalmente el suministro de los siguientes productos para nuestras operaciones agrícolas:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 25px 0; font-size: 14px; border: 1px solid #f3f4f6;">
          <thead>
            <tr style="background-color: #f9fafb;">
              <th style="padding: 12px 10px; text-align: left; border-bottom: 2px solid #4D7C0F; color: #4D7C0F;">Descripción del Producto</th>
              <th style="padding: 12px 10px; text-align: right; border-bottom: 2px solid #4D7C0F; color: #4D7C0F;">Cantidad</th>
              <th style="padding: 12px 10px; text-align: right; border-bottom: 2px solid #4D7C0F; color: #4D7C0F;">Costo Est.</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
          <tfoot>
            <tr style="background-color: #F6F8ED;">
              <td colspan="2" style="padding: 15px 10px; text-align: right; font-weight: bold; color: #374151;">VALOR TOTAL ESTIMADO:</td>
              <td style="padding: 15px 10px; text-align: right; font-weight: bold; color: #4D7C0F; font-size: 18px;">
                $${totalOrder.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tfoot>
        </table>

        <div style="background-color: #fefce8; padding: 15px; border-radius: 8px; border: 1px solid #fef08a; margin-bottom: 20px;">
          <p style="margin: 0; font-size: 13px; color: #854d0e;">
            <strong>Nota:</strong> Agradecemos confirmar la recepción de este pedido y el tiempo estimado de entrega respondiendo a este correo.
          </p>
        </div>
        
        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 25px 0;" />
        <div style="text-align: center; color: #9ca3af; font-size: 11px;">
          <p style="margin: 0;">Este es un documento generado automáticamente por el sistema GeiaTienda Tracker.</p>
          <p style="margin: 5px 0 0;">© ${new Date().getFullYear()} Gestión Agrícola Profesional</p>
        </div>
      </div>
    `;

    try {
      const info = await transporter.sendMail({
        from: `"GeiaTienda Admin" <${process.env.GMAIL_USER}>`,
        to: input.supplierEmail,
        cc: input.adminEmail,
        subject: `NUEVA SOLICITUD DE PEDIDO - GeiaTienda - ${new Date().toLocaleDateString()}`,
        html: htmlBody
      });

      console.log(`[SISTEMA CORREO] Email enviado con éxito: ${info.messageId}`);
      return { success: true };
      
    } catch (error: any) {
      console.error(`[SISTEMA CORREO] Error al enviar correo de O.C.:`, error);
      return {
        success: false,
        error: error.message || 'Error desconocido al intentar enviar el correo vía Gmail.'
      };
    }
  }
);
