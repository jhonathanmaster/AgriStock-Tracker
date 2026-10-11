import 'server-only';
import { z, text, num, numReq, unit, movementType, dateText } from './validation';

const fields = {
  productId: z.string().min(1, 'Selecciona un producto').max(200),
  type: movementType(),
  quantity: numReq().pipe(z.number().positive('La cantidad debe ser mayor que cero')),
  unit: unit(),
  movementDateTime: dateText(),
  notes: text(),
  totalValue: num(),
  subTotal: num(),
  ivaPercentage: num(),
  ivaValue: num(),
  customerName: text(500),
  customerPhone: text(100),
  customerEmail: text(500),
  customerAddress: text(1000),
  customerIdentification: text(100),
};

export const movementInput = z.object(fields);
/** Editing a sale cannot move it to another product. */
export const movementUpdate = z.object(fields).omit({ productId: true }).partial();
