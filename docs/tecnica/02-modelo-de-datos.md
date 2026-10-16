# 2. Modelo de datos

La fuente de verdad es `src/server/db/schema.ts` (Drizzle ORM). Las migraciones SQL generadas están en `drizzle/` y se aplican solas al arrancar la aplicación.

## Convenciones

- **Claves primarias de texto** (`gen_random_uuid()::text` por defecto). Así los documentos importados de Firestore conservan su id.
- **Columnas en `snake_case`**, propiedades en `camelCase` (las mismas que usa la interfaz).
- **Dinero y cantidades en `numeric`** (exacto), expuestos a JavaScript como números. El stock se redondea a 6 decimales.
- **Fechas que escribe la gente** (entrega, acuerdo, servicio…) se guardan como texto, tal como las envía la interfaz (`YYYY-MM-DD` o ISO completo). Las columnas de auditoría del servidor (`created_at`, `updated_at`) son `timestamptz`.
- **Datos del cliente copiados** en ventas, encargos, cotizaciones, créditos y fletes (nombre, teléfono, etc.), además del `customer_id`. El documento conserva los datos aunque el cliente se edite o se borre.
- **Listas de valores** validadas con restricciones `CHECK`.

## Diagrama de relaciones

```
suppliers ─┬─< products ─┬─< inventory_movements
           │             ├─< inventory_audits
           │             └─< purchase_orders >─ suppliers
           └─< expenses

quotations ─┬─< quotation_collections
            └─< quotation_import_trackings
credits ────< credit_collections
transport_services ─< transport_collections      (truck_id → trucks, sin FK)
orders, quotations, credits, transport_services → customer_id (sin FK)

users ─< sessions        invitations (por correo)
```

`─<` es una relación uno a muchos con llave foránea. Al borrar un producto o proveedor, las referencias quedan en `NULL` (no se pierde el historial). Al borrar una cotización, crédito o flete se borran sus abonos.

## Tablas

### Cuentas y acceso

| Tabla | Propósito | Columnas clave |
|---|---|---|
| `users` | Personas con acceso | `email` (único, minúsculas), `display_name`, `password_hash` (bcrypt), `google_sub` (único), `enabled`, `role` (`admin`/`operario`), `last_login`, `access_history` (últimos 10 accesos), identificación, teléfono, dirección |
| `sessions` | Sesiones activas | `token_hash` (SHA‑256 del token de la cookie), `user_id`, `expires_at` (30 días deslizantes), `absolute_expires_at` (90 días), `user_agent`, `ip` |
| `oauth_states` | Estado temporal del inicio con Google (un solo uso) | `state`, `code_verifier`, `nonce`, `return_to` |
| `invitations` | Invitaciones por correo | `email` (PK), `role`, `status` (`pending`/`accepted`), `enabled`, `token_hash`, `expires_at` (24 h), fechas de invitación/aceptación, último cuerpo del correo |

### Catálogos y configuración

| Tabla | Propósito |
|---|---|
| `categories` | Categorías de producto |
| `animal_types` | Tipos de animal relacionados con un producto |
| `expense_categories` | Categorías de gasto (Nómina, Servicios, …) |
| `purchase_order_statuses` | Estados configurables de las órdenes de compra: `name`, `description`, `color`, `sort_order` |
| `unit_conversions` | Factores de conversión entre unidades (`from_unit`, `to_unit`, `factor > 0`), par único |
| `app_config` | Una sola fila (`id = 'inventory'`): umbral de stock crítico, capital inicial, datos de la empresa, representante legal, logo, ícono, firma y plantilla de contrato |

### Directorio

| Tabla | Propósito |
|---|---|
| `suppliers` | Proveedores: nombre, identificación, contacto, teléfono, correo, dirección |
| `customers` | Clientes. Índices por dígitos del teléfono y por correo en minúsculas, para no duplicar clientes al registrar ventas |

### Inventario

| Tabla | Propósito | Notas |
|---|---|---|
| `products` | Productos e insumos | `reference_code`, `name`, `category`, `animal_type`, `supplier_id`, `image_url`, **`stock`**, `stock_in_bundles`, `main_unit` (`libras`/`kilos`/`bultos`/`unidades`), `cost_price`, `profit_percentage`, `sale_price`, `transport_price_per_bundle`, datos de importación. Precios ≥ 0. |
| `inventory_movements` | Historial de entradas, salidas y ventas | `type` (`entrada`/`salida`/`venta`), `quantity`, `unit`, `movement_date_time`, valores (`sub_total`, `iva_*`, `total_value`), datos del cliente, quién lo hizo, **`source_ref` único** (p. ej. `purchase-order:<id>`, `audit:<id>`) |
| `inventory_audits` | Conteos físicos | cantidad en sistema, cantidad verificada, diferencia, unidad, fecha, operario, **`applied`** |
| `purchase_orders` | Órdenes de compra | producto, proveedor, cantidad, unidad, `status` (nombre de un estado configurable), fechas de solicitud/entrega/aviso/recepción, precio unitario, transporte, costo total |

### Ventas y cobros

| Tabla | Propósito | Notas |
|---|---|---|
| `orders` | Encargos (pedidos anticipados), incluidos los pedidos web | `items` y `payments` en JSONB; `status` (`pending`/`delivered`/`cancelled`/`paid`) |
| `quotations` | Cotizaciones | `items` JSONB, `approved` (`si`/`no`/null), fecha estimada de entrega |
| `quotation_collections` | Abonos a cotizaciones aprobadas | monto, fecha, notas |
| `quotation_import_trackings` | Seguimiento de importación de una cotización | estado libre, fecha, notas |
| `credits` | Ventas a crédito | `items` JSONB, `installments`, `status` (`active`/`paid`/`cancelled`), fechas de acuerdo y fin esperado |
| `credit_collections` | Abonos a créditos | monto, fecha, notas |
| `expenses` | Gastos | categoría, cantidad, valor unitario, IVA, subtotal, total, proveedor |

### Logística

| Tabla | Propósito | Notas |
|---|---|---|
| `trucks` | Flota | placa (se guarda en mayúsculas), marca, modelo, capacidad (t), combustible, km por galón, `status` (`available`/`in_service`/`maintenance`) |
| `transport_services` | Fletes | camión, cliente, origen, destino, distancia, tiempo estimado, fecha, `status` (`pending`/`in_progress`/`finished`/`cancelled`), conductor, `expenses` (gastos del viaje en JSONB), `total_freight_price`. **`total_paid` y `payment_status` los calcula el servidor** a partir de los abonos |
| `transport_collections` | Abonos a un flete | monto (> 0), fecha, medio de pago, notas |

### Control interno

| Tabla | Propósito |
|---|---|
| `data_versions` | Un contador por conjunto de datos. Se incrementa en la misma transacción que cada escritura; los navegadores lo consultan para saber qué recargar |
| `legacy_import_map` | Qué documentos de Firestore ya se importaron, para poder repetir la importación sin duplicar |

## Formatos JSONB

```jsonc
// orders.items, quotations.items, credits.items
[{ "productId": "abc", "productName": "Maíz", "specifications": "", "quantity": 2, "unit": "bultos", "price": 95000, "total": 190000 }]
// orders.payments
[{ "id": "p1", "date": "2026-10-01", "amount": 50000, "method": "Efectivo", "notes": "Abono inicial" }]
// transport_services.expenses
[{ "id": "g1", "type": "Gasolina", "amount": 120000, "date": "2026-10-01", "notes": "Tanqueo" }]
```

La validación de estos JSON es flexible a propósito (los documentos importados de Firestore pueden traer campos raros). La validación exacta de cada campo está en `src/server/validation.ts` y `src/server/resources.ts`.

## Migraciones

| Archivo | Contenido |
|---|---|
| `drizzle/0000_init.sql` | Esquema inicial (todo salvo logística) |
| `drizzle/0001_logistica.sql` | Camiones, servicios de transporte y abonos; plantilla de contrato en la configuración |

Para cambiar el modelo:

1. Edita `src/server/db/schema.ts`.
2. Ejecuta `npm run db:generate`. Crea un nuevo archivo en `drizzle/`. No edites migraciones ya aplicadas.
3. Revisa el SQL generado: evita operaciones que bloqueen tablas grandes o pierdan datos.
4. Al arrancar, la aplicación aplica la migración (`runMigrations()` en `src/server/db/client.ts`).

---
Desarrollado por Coldesoft · [coldesoft.com](https://coldesoft.com)
