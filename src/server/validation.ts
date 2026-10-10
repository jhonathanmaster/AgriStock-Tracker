import 'server-only';
import { z } from 'zod';
import { UNITS, MOVEMENT_TYPES, ORDER_STATUSES, CREDIT_STATUSES } from './db/schema';

/**
 * Field helpers. The UI sends values from forms: empty strings, numbers parsed with
 * parseFloat (NaN becomes null in JSON), and fields that may be missing.
 */
const MAX_TEXT = 20_000;
const MAX_IMAGE = 8 * 1024 * 1024; // images are stored inline as data URLs

const blankToNull = (v: unknown) => (v === '' || v === undefined ? null : v);

/** Optional text; '' is kept as ''. */
export const text = (max = MAX_TEXT) => z.string().max(max).nullable().optional();
/** Required text that may be empty. */
export const textReq = (max = MAX_TEXT) => z.string().max(max);
/** Required, non-empty text. */
export const name = (max = 500) => z.string().trim().min(1, 'Campo obligatorio').max(max);
export const image = () => z.string().max(MAX_IMAGE).nullable().optional();
/** Reference to another row; '' means none. */
export const ref = () => z.preprocess(blankToNull, z.string().max(200).nullable()).optional();

const toNumber = (v: unknown) => {
  if (v === '' || v === null || v === undefined) return null;
  if (typeof v === 'string') return Number(v);
  return v;
};
export const num = () => z.preprocess(toNumber, z.number().finite().nullable()).optional();
/** Number with a default when missing or empty. */
export const numDefault = (d = 0) => z.preprocess((v) => toNumber(v) ?? d, z.number().finite());
export const numReq = () => z.preprocess(toNumber, z.number({ invalid_type_error: 'Debe ser un número' }).finite());
export const int = () => z.preprocess(toNumber, z.number().int().nullable()).optional();
export const bool = () => z.boolean().nullable().optional();
/** A date or timestamp as the UI sends it (kept verbatim). */
export const dateText = () => z.preprocess(blankToNull, z.string().max(40).nullable()).optional();
export const dateTextReq = () => z.string().min(1).max(40);

export const unit = () => z.enum(UNITS);
export const movementType = () => z.enum(MOVEMENT_TYPES);
export const orderStatus = () => z.enum(ORDER_STATUSES);
export const creditStatus = () => z.enum(CREDIT_STATUSES);

// Line items and payments are stored as JSON. Validation is lenient on purpose: documents
// imported from Firestore may have missing or odd fields, and editing them must still work.
const looseText = (max: number) => z.preprocess((v) => (v === null || v === undefined ? undefined : String(v)), z.string().max(max).optional());

const lineItem = z
  .object({
    productId: looseText(200),
    productName: looseText(1000),
    specifications: looseText(MAX_TEXT),
    quantity: numDefault(0),
    unit: looseText(40),
    price: numDefault(0),
    total: numDefault(0),
  })
  .passthrough();
export const items = () => z.array(lineItem).max(1000);

const payment = z
  .object({
    id: looseText(200),
    date: looseText(40),
    amount: numDefault(0),
    method: looseText(40),
    notes: looseText(MAX_TEXT),
  })
  .passthrough();
export const payments = () => z.array(payment).max(1000);

export { z };
