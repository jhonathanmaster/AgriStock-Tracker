
'use server';
/**
 * @fileOverview Flujo para el envío de simulaciones de costos de importación por correo electrónico.
 */

import { z } from 'zod';
import { defineEmailAction, getTransporter } from './transport';

const SimulationItemSchema = z.object({
  productName: z.string(),
  specifications: z.string().optional(),
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

    const itemsHtml = input.items.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">
          <div style="font-weight: bold; color: #111;">${item.productName}</div>
          ${item.specifications ? `<div style="font-size: 11px; color: #6b7280; font-style: italic; margin-top: 4px;">Specs: ${item.specifications}</div>` : ''}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${item.usdPrice.toFixed(2)} USD</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${item.unitCostCop.toLocaleString('en-US', { minimumFractionDigits: 2 })} COP</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold; color: #4D7C0F;">$${item.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
      </tr>
    `).join('');

    try {
      await transporter.sendMail({
        from: `"${input.companyName} - Simulador" <${process.env.GMAIL_USER}>`,
        to: input.recipientEmail,
        subject: `Simulación de Costos Proyectada - ${input.companyName}`,
        html: `
          <div style="font-family: sans-serif; max-width: 700px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
            <h2 style="color: #4D7C0F; border-bottom: 2px solid #4D7C0F; padding-bottom: 10px;">Proyección de Costos de Importación</h2>
            <p style="color: #374151;">Hola,</p>
            <p style="color: #374151;">Adjuntamos el desglose de la simulación de costos realizada para los siguientes productos:</p>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px;">
              <thead>
                <tr style="background-color: #F6F8ED;">
                  <th style="padding: 10px; text-align: left; border-bottom: 2px solid #4D7C0F;">Producto / Especificaciones</th>
                  <th style="padding: 10px; text-align: center; border-bottom: 2px solid #4D7C0F;">Cant.</th>
                  <th style="padding: 10px; text-align: right; border-bottom: 2px solid #4D7C0F;">Precio USD</th>
                  <th style="padding: 10px; text-align: right; border-bottom: 2px solid #4D7C0F;">Costo Unit. COP</th>
                  <th style="padding: 10px; text-align: right; border-bottom: 2px solid #4D7C0F;">Total COP</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
              <tfoot>
                <tr style="background-color: #F9FAFB; font-weight: bold;">
                  <td colspan="4" style="padding: 15px 10px; text-align: right; font-size: 14px;">TOTAL GENERAL PROYECTADO (COP):</td>
                  <td style="padding: 15px 10px; text-align: right; font-size: 18px; color: #4D7C0F;">$${input.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                </tr>
              </tfoot>
            </table>

            <div style="background-color: #fefce8; padding: 15px; border-radius: 8px; border: 1px solid #fef08a; margin-top: 20px;">
              <p style="margin: 0; font-size: 12px; color: #854d0e;">
                <strong>Nota:</strong> Esta simulación incluye los porcentajes proyectados de legalización, nacionalización, transporte y utilidad comercial. Los valores son informativos y no constituyen un contrato de compraventa.
              </p>
            </div>
            
            <hr style="border: 0; border-top: 1px solid #f3f4f6; margin: 30px 0;" />
            <div style="text-align: center; color: #9ca3af; font-size: 11px;">
              <p>Este documento fue generado automáticamente por el sistema de gestión de ${input.companyName}.</p>
            </div>
          </div>
        `
      });

      return { success: true };
      
    } catch (error: any) {
      console.error(`[SIMULACIÓN] Error enviando correo:`, error);
      return {
        success: false,
        error: "No se pudo enviar el correo en este momento."
      };
    }
  }
);
