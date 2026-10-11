
'use server';
/**
 * @fileOverview Flujo para el envío de notificaciones de recepción de mercancía a la administración.
 */

import { z } from 'zod';
import { defineEmailAction, getTransporter } from './transport';

const ReceivedItemSchema = z.object({
  productName: z.string(),
  quantity: z.number(),
  unit: z.string(),
  orderId: z.string(),
  unitPrice: z.number().optional(),
  totalCost: z.number().describe('El costo total de la orden de compra.'),
});

const SendReceiveConfirmationInputSchema = z.object({
  adminEmail: z.string().email().describe('El correo del administrador principal.'),
  items: z.array(ReceivedItemSchema).describe('Lista de productos recibidos.'),
});

export type SendReceiveConfirmationInput = z.infer<typeof SendReceiveConfirmationInputSchema>;


export async function sendReceiveConfirmationAdminEmail(input: SendReceiveConfirmationInput) {
  return sendReceiveConfirmationFlow(input);
}

const sendReceiveConfirmationFlow = defineEmailAction(
  {
    name: 'sendReceiveConfirmationFlow',
    inputSchema: SendReceiveConfirmationInputSchema,
    outputSchema: z.object({ success: z.boolean(), error: z.string().optional() }),
  },
  async (input) => {
    const transporter = getTransporter();

    if (!transporter) {
      return { success: false, error: "Credenciales de Gmail no configuradas." };
    }

    const itemsHtml = input.items.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${item.productName}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">${item.quantity} ${item.unit}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${(item.unitPrice || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold; color: #4D7C0F;">$${item.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #6b7280; font-size: 11px;">#${item.orderId}</td>
      </tr>
    `).join('');

    const grandTotal = input.items.reduce((sum, item) => sum + item.totalCost, 0);

    const htmlBody = `
      <div style="font-family: sans-serif; max-width: 700px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #4D7C0F;">Reporte de Recepción de Mercancía</h2>
        <p>Hola Administrador,</p>
        <p>Se ha confirmado la recepción de los siguientes ítems y se han cargado automáticamente al inventario:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px;">
          <thead>
            <tr style="background-color: #f9fafb;">
              <th style="padding: 10px; text-align: left; border-bottom: 2px solid #4D7C0F;">Producto</th>
              <th style="padding: 10px; text-align: right; border-bottom: 2px solid #4D7C0F;">Cantidad</th>
              <th style="padding: 10px; text-align: right; border-bottom: 2px solid #4D7C0F;">Costo Unit.</th>
              <th style="padding: 10px; text-align: right; border-bottom: 2px solid #4D7C0F;">Costo Total</th>
              <th style="padding: 10px; text-align: right; border-bottom: 2px solid #4D7C0F;">Orden Ref.</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
          <tfoot>
            <tr style="font-weight: bold; background-color: #f9fafb;">
              <td colspan="3" style="padding: 10px; text-align: right;">VALOR TOTAL RECIBIDO:</td>
              <td style="padding: 10px; text-align: right; color: #4D7C0F; font-size: 15px;">$${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>

        <p style="font-size: 14px; font-weight: bold; color: #4D7C0F;">Total de órdenes procesadas: ${input.items.length}</p>
        
        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 25px 0;" />
        <p style="font-size: 12px; color: #6b7280; text-align: center;">
          Este es un informe automático de GeiaTienda Tracker - ${new Date().toLocaleString()}
        </p>
      </div>
    `;

    try {
      await transporter.sendMail({
        from: `"GeiaTienda System" <${process.env.GMAIL_USER}>`,
        to: input.adminEmail,
        subject: `Notificación: Mercancía Recibida e Ingresada al Inventario`,
        html: htmlBody
      });
      return { success: true };
    } catch (error: any) {
      console.error(`[SISTEMA] Error al enviar reporte de recepción:`, error);
      return { success: false, error: error.message };
    }
  }
);
