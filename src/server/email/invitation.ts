import 'server-only';
/**
 * Correo de invitación para un operario (lo envía el servidor al crear la invitación).
 */
import { getTransporter } from './transport';

export async function sendInvitationEmail(input: { email: string; acceptLink: string }): Promise<{ success: boolean; body: string; error?: string }> {
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
        error: error?.message || 'Error desconocido'
      };
    }
}
