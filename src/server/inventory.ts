import 'server-only';
import { eq, sql } from 'drizzle-orm';
import type { Tx } from './db/client';
import { products, inventoryMovements, unitConversions } from './db/schema';
import { notFound } from './http';
import type { SessionUser } from './auth';

export type Unit = 'libras' | 'kilos' | 'bultos' | 'unidades';
export type MovementType = 'entrada' | 'salida' | 'venta';
type Conversion = { from: string; to: string; factor: number };

/** Same rules as the UI (store.convertQuantity): configured conversions first, then the built-in ones. */
export function convertQuantity(quantity: number, from: string, to: string, conversions: Conversion[]): number {
  if (!quantity || from === to) return quantity || 0;
  const conversion = conversions.find((c) => c.from === from && c.to === to);
  if (conversion) return quantity * conversion.factor;
  let inKilos = quantity;
  if (from === 'bultos') inKilos = quantity * 40;
  else if (from === 'libras') inKilos = quantity * 0.453592;
  if (to === 'kilos') return inKilos;
  if (to === 'bultos') return inKilos / 40;
  if (to === 'libras') return inKilos * 2.20462;
  return inKilos;
}

/** Same rule as the product form. */
export function bundlesFor(stock: number, mainUnit: string) {
  if (mainUnit === 'bultos') return stock;
  if (mainUnit === 'kilos') return stock / 40;
  return 0;
}

/** Avoids 0.1 + 0.2 style noise accumulating in stock. */
export const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

export async function loadConversions(tx: Tx): Promise<Conversion[]> {
  return tx.select({ from: unitConversions.from, to: unitConversions.to, factor: unitConversions.factor }).from(unitConversions);
}

/** Locks the product row until the transaction ends, so concurrent sales can't overwrite each other. */
export async function lockProduct(tx: Tx, productId: string) {
  const [p] = await tx.select().from(products).where(eq(products.id, productId)).for('update').limit(1);
  return p || null;
}

/** Stock change of one movement, in the product's main unit (positive adds stock). */
export function stockEffect(m: { type: string; quantity: number; unit: string }, mainUnit: string, conversions: Conversion[]) {
  const qty = convertQuantity(Number(m.quantity) || 0, m.unit, mainUnit, conversions);
  return m.type === 'entrada' ? qty : -qty;
}

export async function addToStock(tx: Tx, product: { id: string; mainUnit: string }, delta: number) {
  if (!delta) return;
  await tx
    .update(products)
    .set({
      stock: sql`round((${products.stock} + ${delta})::numeric, 6)`,
      stockInBundles: sql`round((case ${products.mainUnit} when 'bultos' then ${products.stock} + ${delta} when 'kilos' then (${products.stock} + ${delta}) / 40 else 0 end)::numeric, 6)`,
      updatedAt: new Date(),
    })
    .where(eq(products.id, product.id));
}

export interface NewMovement {
  productId: string;
  type: MovementType;
  quantity: number;
  unit: Unit;
  movementDateTime?: string | null;
  notes?: string | null;
  totalValue?: number | null;
  subTotal?: number | null;
  ivaPercentage?: number | null;
  ivaValue?: number | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  customerAddress?: string | null;
  customerIdentification?: string | null;
  sourceRef?: string | null;
}

export const actorName = (u: SessionUser) => u.displayName || u.email || 'Sistema';

/**
 * Records a movement and updates the product stock atomically.
 * With a sourceRef, a second call for the same source is a no-op (returns null).
 */
export async function recordMovement(tx: Tx, input: NewMovement, actor: SessionUser) {
  const product = await lockProduct(tx, input.productId);
  if (!product) throw notFound('El producto no existe');
  const conversions = await loadConversions(tx);
  const inserted = await tx
    .insert(inventoryMovements)
    .values({
      ...input,
      movementDateTime: input.movementDateTime || new Date().toISOString(),
      performedBy: actor.id,
      performedByName: actorName(actor),
    })
    .onConflictDoNothing({ target: inventoryMovements.sourceRef })
    .returning();
  const movement = inserted[0];
  if (!movement) return null; // already recorded for this source
  await addToStock(tx, product, stockEffect(movement, product.mainUnit, conversions));
  return movement;
}
