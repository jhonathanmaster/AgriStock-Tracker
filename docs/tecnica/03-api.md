# 3. API

Todos los endpoints viven en `src/app/api/` y responden JSON. Cada manejador pasa por `route()` (`src/server/http.ts`), que:

- aplica las migraciones pendientes la primera vez;
- rechaza peticiones que cambian datos (`POST`, `PATCH`, `PUT`, `DELETE`) si el encabezado `Origin` no es el propio sitio, `PUBLIC_URL` o `ALLOWED_ORIGINS` (protección CSRF);
- convierte los errores en respuestas JSON sin exponer detalles internos.

## Autenticación

La sesión viaja en la cookie `geia_session` (HttpOnly, SameSite=Lax, `Secure` con `COOKIE_SECURE=true`). Niveles de acceso usados abajo:

| Nivel | Significa |
|---|---|
| **Público** | Sin sesión |
| **Sesión** | Cualquier persona con sesión, aunque no esté habilitada |
| **Habilitado** | Sesión de una cuenta habilitada por un administrador (los administradores siempre lo están) |
| **Admin** | Rol `admin` o correo en `SUPER_ADMIN_EMAILS` |
| **Dueño** | Correo en `SUPER_ADMIN_EMAILS` |

## Formato de errores

```json
{ "error": "CODIGO", "message": "Texto en español apto para mostrar al usuario" }
```

| HTTP | Código | Cuándo |
|---|---|---|
| 400 | `INVALID_INPUT` | Validación fallida (indica el campo) o regla `CHECK` de la base |
| 400 | `BAD_REFERENCE` | Referencia a un registro que no existe |
| 401 | `AUTH_REQUIRED`, `INVALID_CREDENTIALS`, `USE_GOOGLE` | Sin sesión o credenciales incorrectas |
| 403 | `NOT_ENABLED`, `ADMIN_ONLY`, `SUPER_ADMIN_ONLY`, `BAD_ORIGIN`, `NOT_INVITED` | Sin permiso |
| 404 | `NOT_FOUND` | Registro o recurso inexistente |
| 409 | `DUPLICATE`, `EMAIL_TAKEN` | Registro duplicado |
| 429 | `TOO_MANY_ATTEMPTS`, `RATE_LIMITED` | Demasiados intentos |
| 500 | `INTERNAL` | Error no previsto (el detalle queda en el log del servidor) |

## Salud

| Método y ruta | Acceso | Descripción |
|---|---|---|
| `GET /api/health` | Público | `{"status":"ok","db":"up"}` (200) o 503 si la base no responde o las migraciones fallan. Lo usa el `HEALTHCHECK` de Docker. |

## Sesión y cuentas (`/api/auth`)

| Método y ruta | Acceso | Descripción |
|---|---|---|
| `GET /api/auth/config` | Público | Métodos de acceso activos: `{ google, passwordLogin }` |
| `GET /api/auth/me` | Público | Sesión actual: `user`, `profile`, `isAdmin`, `isSuperAdmin`, `isEnabled`, o `{ user: null }` |
| `POST /api/auth/login` | Público | `{ email, password }`. Crea la sesión. 8 fallos por cuenta o 30 por IP en 15 min bloquean temporalmente (429). |
| `POST /api/auth/register` | Público | `{ email, password (≥8), displayName? }`. Solo para dueños o correos invitados. Máx. 20 por IP y hora. |
| `POST /api/auth/logout` | Público | Cierra la sesión actual |
| `POST /api/auth/password` | Sesión | `{ currentPassword?, newPassword (≥8) }`. Cambia o crea la contraseña y cierra las demás sesiones del usuario. |
| `GET /api/auth/google/start?returnTo=/ruta` | Público | Inicia el acceso con Google (OIDC + PKCE) |
| `GET /api/auth/google/callback` | Público | Regreso de Google. Vincula por `sub` o por correo verificado; si el correo es nuevo crea la cuenta (deshabilitada si no fue invitada). |
| `GET /api/auth/invitation?email=&token=` | Público | Estado de una invitación: `valid`, `expired`, `invalid`, `accepted`. Máx. 60 por IP cada 10 min. |
| `POST /api/auth/invitation` | Sesión | `{ email, token }`. Acepta la invitación si el correo coincide con el de la sesión: habilita la cuenta y le asigna el rol invitado. |

## Administración de usuarios

`POST /api/admin/:accion` — acceso **Admin**.

| Acción | Cuerpo | Efecto |
|---|---|---|
| `invite` | `{ email, role? }` | Crea o renueva la invitación (24 h) y envía el correo. Si el correo no está configurado, devuelve `acceptLink` para compartirlo a mano. |
| `approve-invitation` | `{ email }` | Aprueba manualmente: marca la invitación aceptada y habilita la cuenta si ya existe |
| `update-details` | `{ uid, email, details: { identificationNumber, phone, address, photoURL, displayName, enabled } }` | Edita datos del perfil o de la invitación; habilita/deshabilita |
| `update-role` | `{ uid, email, role }` | **Solo Dueño.** Cambia el rol. Un dueño siempre es `admin`. |
| `delete-user` | `{ uid, email }` | Elimina la cuenta y su invitación. No se puede borrar a un dueño ni a uno mismo; solo un dueño puede borrar a otro administrador. |

`uid` que empieza por `inv-` se refiere a una invitación sin cuenta todavía.

## Datos (lectura)

| Método y ruta | Acceso | Descripción |
|---|---|---|
| `GET /api/data` | Habilitado | Todos los conjuntos que el usuario puede leer: `{ versions, data }`. `?only=products,movements` limita la respuesta. `users` e `invitations` solo para Admin. |
| `GET /api/data/versions` | Habilitado | `{ versions: { products: 12, movements: 40, … } }` para el sondeo cada 10 s |

Conjuntos (`recurso`): `products`, `movements`, `purchaseOrders`, `expenses`, `orders`, `quotations`, `quotationCollections`, `quotationImportTrackings`, `credits`, `creditCollections`, `audits`, `expenseCategories`, `purchaseOrderStatusDefinitions`, `conversions`, `users`, `invitations`, `customers`, `animalTypes`, `categories`, `suppliers`, `trucks`, `transportServices`, `transportCollections`, `config`.

## Datos (escritura genérica)

| Método y ruta | Descripción |
|---|---|
| `POST /api/data/:recurso` | Crea un registro. Devuelve la fila creada (201). |
| `PATCH /api/data/:recurso/:id` | Modifica campos (actualización parcial) |
| `DELETE /api/data/:recurso/:id` | Elimina |

Permisos por recurso (definidos en `src/server/resources.ts`):

| Recurso | Crear / editar | Eliminar |
|---|---|---|
| `purchaseOrders`, `expenses`, `orders`, `quotations`, `quotationCollections`, `quotationImportTrackings`, `credits`, `creditCollections`, `audits`, `suppliers`, `transportServices`, `transportCollections` | Habilitado | Habilitado |
| `expenseCategories`, `purchaseOrderStatusDefinitions`, `conversions`, `animalTypes`, `categories`, `trucks` | Admin | Admin |
| `products`, `customers` | Solo endpoints especiales | Habilitado |
| `movements` | Solo endpoints especiales | Solo endpoint especial |

Reglas que aplica el servidor en la escritura genérica:

- Las auditorías nuevas se guardan con el operario de la sesión y `applied = false`.
- Al crear, editar o borrar un abono de flete (`transportCollections`), o al editar el flete, se recalculan `totalPaid` y `paymentStatus` del servicio en la misma transacción.
- La placa de un camión se guarda en mayúsculas.

## Inventario (endpoints especiales)

| Método y ruta | Acceso | Descripción |
|---|---|---|
| `POST /api/products` | Habilitado | Crea un producto. Si trae `stock` inicial, se registra como movimiento de entrada. |
| `PATCH /api/products/:id` | Habilitado | Edita un producto. El stock **no** se sobrescribe: `stockAdjustment: { from, to }` aplica la diferencia como movimiento "Ajuste manual". |
| `POST /api/movements` | Habilitado | Registra venta, entrada o salida y ajusta el stock en la misma transacción |
| `PATCH /api/movements/:id` | Habilitado | Edita un movimiento (no se puede cambiar el producto). Revierte el efecto anterior y aplica el nuevo. |
| `DELETE /api/movements/:id` | Habilitado | Borra el movimiento y devuelve (o retira) su cantidad del stock |
| `POST /api/purchase-orders/:id/status` | Habilitado | `{ status }`. Al pasar a "Recibido" suma la cantidad al stock una sola vez por orden. Responde `{ ok, stockAdded }`. |
| `POST /api/audits/:id/apply` | Habilitado | Deja el stock igual a lo contado, una sola vez, registrando la diferencia como movimiento |

Cuerpo de un movimiento:

```json
{
  "productId": "abc123",
  "type": "venta",
  "quantity": 2,
  "unit": "bultos",
  "movementDateTime": "2026-10-15T14:30:00.000Z",
  "subTotal": 190000, "ivaPercentage": 0, "ivaValue": 0, "totalValue": 190000,
  "customerName": "Juan Pérez", "customerPhone": "3001234567",
  "notes": "Venta de mostrador"
}
```

## Clientes y configuración

| Método y ruta | Acceso | Descripción |
|---|---|---|
| `POST /api/customers/save` | Habilitado | Crea o actualiza un cliente. Evita duplicados buscando por dígitos del teléfono o por correo. Devuelve `{ id }`. |
| `PATCH /api/config` | Admin | Actualiza la configuración (empresa, umbral crítico, capital inicial, logo, ícono, firma, plantilla de contrato) |

## Portal público

| Método y ruta | Acceso | Descripción |
|---|---|---|
| `GET /api/public/catalog` | Público | Productos (sin costos, márgenes ni proveedores), categorías, tipos de animal y datos públicos de la empresa |
| `POST /api/public/orders` | Público | Pedido desde la ficha de producto: `{ productId, quantity, customerName, customerPhone, customerEmail?, customerIdentification?, customerAddress? }`. El precio sale de la base de datos. Crea un **encargo** pendiente con entrega a 3 días hábiles. Máx. 10 por IP cada 10 min. |
| `POST /api/public/transport-requests` | Público | Solicitud de flete: `{ customerName, customerPhone, customerEmail?, origin, destination, cargoDescription?, preferredDate? }`. Crea un servicio de transporte pendiente, sin precio, con conductor "Por asignar". Máx. 10 por IP cada 10 min. |

Los datos de un cliente existente nunca se sobrescriben desde el portal público; solo se completan campos vacíos.

## Correos (acciones de servidor)

Los correos se envían con acciones de servidor (`src/server/email/*`), no con rutas REST. Todas exigen una cuenta habilitada, salvo el formulario de contacto (público, con límite por IP). La copia interna siempre va a `ADMIN_NOTIFICATION_EMAIL` (o al primer dueño), nunca a una dirección enviada por el navegador.

| Acción | Uso |
|---|---|
| `invitation` | Invitación a un usuario nuevo |
| `send-purchase-order-email` | Pedido al proveedor al marcar órdenes como "Solicitado" |
| `send-receive-confirmation-admin-email` | Resumen de mercancía recibida para administración |
| `send-quotation-email` | Cotización al cliente, con copia a administración |
| `send-collection-receipt-email` | Recibo de abono de una cotización |
| `send-simulation-email` | Resultado del simulador de importación |
| `send-contract-template-email` | Envío de la preforma de contrato (PDF de Configuración) |
| `send-contact-email` | Formulario de contacto del portal |

---
Desarrollado por Coldesoft · [coldesoft.com](https://coldesoft.com)
