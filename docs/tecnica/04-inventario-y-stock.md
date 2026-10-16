# 4. Inventario y stock

Este es el punto más delicado del sistema: la versión anterior, sobre Firebase, perdía cantidades cuando dos personas vendían al mismo tiempo. Este documento explica cómo funciona ahora y qué operaciones mueven el stock.

## Principios

1. **Solo el servidor cambia el stock.** El navegador nunca envía "el nuevo stock es X". Envía un movimiento (venta, entrada, salida) y el servidor calcula el resultado.
2. **Todo cambio de stock es un movimiento.** Cada unidad que entra o sale queda en `inventory_movements`, con quién la registró y cuándo. El stock de un producto siempre se puede explicar con su historial.
3. **Un cambio, una transacción.** El movimiento y la actualización del stock se guardan juntos dentro de una transacción de PostgreSQL. Si algo falla, no se guarda nada.
4. **Bloqueo por producto.** Antes de tocar el stock, el servidor bloquea la fila del producto (`SELECT … FOR UPDATE`). Dos ventas simultáneas del mismo producto se aplican una después de la otra, nunca una encima de la otra.
5. **Operaciones automáticas idempotentes.** Recibir una orden de compra o aplicar una auditoría lleva una referencia única (`source_ref`). Repetir la operación no suma el stock dos veces.

El código está en `src/server/inventory.ts` (`recordMovement`, `lockProduct`, `addToStock`, `stockEffect`, `convertQuantity`).

## Qué mueve el stock

| Operación | Pantalla | Endpoint | Efecto |
|---|---|---|---|
| Venta rápida | Ventas Rápidas | `POST /api/movements` (`type: venta`) | Resta la cantidad vendida |
| Editar una venta | Ventas Rápidas → Editar | `PATCH /api/movements/:id` | Revierte la cantidad anterior y aplica la nueva |
| Eliminar una venta | Ventas Rápidas → Eliminar | `DELETE /api/movements/:id` | Devuelve la cantidad al stock |
| Crear producto con stock inicial | Inventario → Nuevo Producto | `POST /api/products` | Movimiento de entrada "Inventario inicial" |
| Cambiar el stock en el formulario de producto | Inventario → Editar | `PATCH /api/products/:id` con `stockAdjustment` | Aplica solo la diferencia (nuevo − mostrado) sobre el stock real del momento, como "Ajuste manual" |
| Recibir orden de compra | Seguimiento O.C. → Recibir / cambiar estado a "Recibido" | `POST /api/purchase-orders/:id/status` | Entrada "Recepción O.C. #id", una sola vez por orden |
| Aplicar auditoría | Verificación Inv. → Aplicar ajuste | `POST /api/audits/:id/apply` | Deja el stock igual a lo contado; registra la diferencia como entrada o salida "Ajuste auditoría", una sola vez |

## Qué NO mueve el stock

- **Encargos** (incluidos los pedidos del portal web), **cotizaciones** y **créditos**: registran lo acordado con el cliente y sus abonos, pero no descuentan inventario. Cuando la mercancía sale físicamente, se registra la venta en *Ventas Rápidas*.
- **Registrar una verificación de inventario** (conteo físico): es informativa hasta que alguien pulsa *Aplicar ajuste*.
- **Crear o editar una orden de compra**: solo al recibirla.
- **Gastos**: no tocan inventario.

## Límites conocidos

- **Se permite vender más de lo que hay.** El servidor no rechaza una venta por falta de stock; el stock puede quedar negativo. Un stock negativo indica que falta registrar una entrada (por ejemplo, una orden de compra no recibida) o que hay que hacer un conteo.
- **Órdenes de compra creadas o editadas directamente como "Recibido"** desde el formulario no suman stock en esta versión; solo lo hace el cambio de estado (`POST /api/purchase-orders/:id/status`). El PR #3 corrige esto y además ajusta el stock si se edita la cantidad de una orden ya recibida. Mientras no se fusione, recibe la mercancía desde *Seguimiento O.C.*
- **Encargos entregados** (incluidos los pedidos web) no descuentan stock; hay que registrar la venta en *Ventas Rápidas*.

## Unidades y conversiones

Cada producto tiene una **unidad principal** (`kilos`, `libras`, `bultos` o `unidades`) y su stock se guarda en esa unidad. Un movimiento puede venir en otra unidad; el servidor lo convierte:

1. Primero busca un factor configurado en `unit_conversions` (Configuración → Factores de conversión).
2. Si no hay, usa las equivalencias base: **1 bulto = 40 kg**, **1 libra = 0,453592 kg**, **1 kg = 2,20462 lb**.
3. `unidades` no se convierte a peso: si la unidad no tiene factor, se toma la cantidad tal cual.

`stock_in_bundles` se recalcula siempre: igual al stock si la unidad es bultos, stock ÷ 40 si es kilos, 0 en otro caso.

El stock se redondea a 6 decimales para evitar ruido de punto flotante (0,1 + 0,2).

## Sincronización entre usuarios

Cada escritura incrementa el contador del conjunto afectado en `data_versions`, en la misma transacción. Los navegadores consultan los contadores cada 10 segundos y recargan solo lo que cambió. Una venta registrada en un computador aparece en los demás en unos 10 segundos, sin recargar la página.

## Verificación automática

`npm run test:smoke` (`scripts/smoke-test.mjs`) recorre la API de punta a punta contra una base de prueba y comprueba, entre otras cosas:

- 20 ventas simultáneas del mismo producto dejan el stock exacto;
- editar y borrar ventas revierte su efecto;
- recibir una orden dos veces suma una sola vez;
- aplicar una auditoría dos veces ajusta una sola vez;
- editar un producto no pisa ventas hechas mientras tanto;
- logística: abonos, saldo y estado de pago de los fletes.

## Conciliación tras la migración

El importador de Firebase genera `reporte-stock.csv`: compara, producto por producto, el stock que tenía Firebase con el que explica el historial de movimientos. En la importación de octubre de 2026, 54 de 61 productos no cuadraban, en su mayoría porque el stock inicial se cargó sin movimiento. Se recomienda un conteo físico y aplicar auditorías para dejar el sistema y la bodega iguales.

---
Desarrollado por Coldesoft · [coldesoft.com](https://coldesoft.com)
