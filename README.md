# GeiaTienda Tracker (AgriStock)

Inventario agrícola de GEIA: productos e insumos por kilos, bultos y unidades, ventas rápidas, encargos, cotizaciones, créditos, gastos, órdenes de compra con seguimiento, auditoría física de inventario, reportes y el portal web público con catálogo y pedidos.

**Stack:** Next.js 15 (React 19, Tailwind, shadcn/ui) con su propia API, PostgreSQL con Drizzle ORM y Docker. Sin Firebase.

---

## Inicio rápido con Docker (recomendado)

Requisitos: [Docker Desktop](https://www.docker.com/products/docker-desktop/) (o Docker Engine con Compose v2.24 o superior).

```bash
git clone https://github.com/jhonathanmaster/AgriStock-Tracker.git
cd AgriStock-Tracker
cp .env.example .env        # opcional: Google, Gmail, correo del dueño
docker compose up --build
```

En Mac también puedes hacer doble clic en **`Iniciar GeiaTienda.command`**: abre Docker Desktop si hace falta, arranca todo y abre el navegador. **`Detener GeiaTienda.command`** la apaga sin borrar los datos.

La app queda en **http://localhost:3001** y Postgres en `localhost:5433`, así puede correr al mismo tiempo que AssetPlus (3000/5432). Cambia `APP_PORT` y `POSTGRES_PORT` en `.env` si quieres otros puertos. Las tablas se crean solas al arrancar.

**Primer acceso:** si `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` están en `.env`, entra con Google con el correo del dueño (`SUPER_ADMIN_EMAILS`). Si no, haz doble clic en **`Crear contraseña admin.command`**: genera una contraseña para el dueño y la muestra una vez.

Comandos útiles:

```bash
docker compose up -d          # en segundo plano
docker compose logs -f app    # ver logs
docker compose down           # detener (los datos se conservan)
docker compose down -v        # detener y BORRAR la base de datos
```

---

## Migrar los datos desde Firebase

Firebase solo se lee; no se modifica nada allá.

1. **Clave de Firebase.** En la [consola de Firebase](https://console.firebase.google.com/) abre el proyecto `studio-7807631118-f734e` → ⚙️ **Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada**. Guarda el archivo como `firebase-key.json` en la carpeta del proyecto. Está excluido de git y de Docker.
2. Doble clic en **`Exportar Firebase.command`**. Genera `firebase-backup.json` con todas las colecciones.
3. Doble clic en **`Importar Firebase.command`**. Arranca la app si hace falta e importa todo.

El importador:

- conserva los ids de Firestore, así las referencias entre documentos siguen funcionando;
- valida y corrige cada documento según el nuevo esquema. Lo que no puede corregir lo omite y lo explica en **`reporte-importacion.txt`**;
- trabaja en una sola transacción: si algo falla, no guarda nada;
- se puede repetir sin duplicar datos. Acepta `--dry-run` para probar sin guardar;
- genera **`reporte-stock.csv`**: compara, producto por producto, el stock que tenía Firebase con lo que explica el historial de movimientos. Sirve para encontrar los descuadres que causaba la versión anterior;
- marca cada orden de compra ya recibida, para que volver a ponerla en "Recibido" no sume el stock otra vez.

Los usuarios importados conservan su rol y su estado. Entran con Google con el mismo correo, y la cuenta se vincula sola. Para entrar con contraseña, usa `Crear contraseña admin.command` con su correo.

---

## Por qué el inventario ahora es confiable

En la versión de Firebase, cada navegador leía el stock, le sumaba o restaba y escribía el resultado. Con dos ventas al mismo tiempo, una pisaba a la otra. Además, las escrituras se lanzaban sin esperar respuesta, así que un error se perdía en silencio.

Ahora el servidor calcula el stock dentro de una transacción de Postgres que bloquea el producto:

- **Ventas, entradas y salidas** actualizan el stock en el mismo paso en que se guarda el movimiento. Editar o borrar un movimiento revierte su efecto exacto.
- **Recibir una orden de compra** suma la cantidad una sola vez, aunque se marque "Recibido" dos veces o lo hagan dos personas al mismo tiempo.
- **Aplicar una auditoría** deja el stock en lo contado, una sola vez, y registra la diferencia como movimiento.
- **Editar un producto** ya no sobrescribe el stock. Si cambias el número en el formulario, se aplica solo la diferencia, sobre el stock real del momento, y queda un movimiento "Ajuste manual". El stock inicial de un producto nuevo también queda como movimiento.
- Si algo falla, el cambio no se guarda a medias y aparece un aviso en pantalla.
- Lo que hacen otras personas aparece solo, en unos 10 segundos, sin recargar la página.

`npm run test:smoke` comprueba todo esto. Por ejemplo, registra 20 ventas simultáneas y verifica que el stock quede exacto.

---

## Desarrollo (con recarga en caliente)

**Solo con Docker:** doble clic en **`Desarrollo GeiaTienda.command`**, o:

```bash
docker compose -f docker-compose.dev.yml up
```

Los cambios en `src/` aparecen al instante. Usa la misma base de datos que el modo normal.

**Sin Docker para la app** (requiere Node.js 20.9 o superior):

```bash
npm install
cp .env.example .env
docker compose up -d db       # solo la base de datos, en localhost:5433
npm run dev                   # http://localhost:3000
```

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compila la app (salida `standalone` para Docker) |
| `npm run typecheck` | Chequeo de tipos |
| `npm run db:generate` | Genera una migración después de cambiar `src/server/db/schema.ts` |
| `npm run db:studio` | Explorador visual de la base de datos |
| `npm run test:smoke` | Prueba de punta a punta contra un servidor con una base de datos **de prueba** (`BASE_URL=... ADMIN_EMAIL=...`) |

---

## Variables de entorno

Todas están documentadas en [`.env.example`](.env.example). Las principales:

| Variable | Para qué |
|---|---|
| `SUPER_ADMIN_EMAILS` | Dueños del sistema: siempre administradores. |
| `APP_PORT` / `POSTGRES_PORT` | Puertos locales (3001 y 5433 por defecto). |
| `PUBLIC_URL` | Dirección pública, para los enlaces de invitación y el regreso de Google. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Activan "Entrar con Google". Ver abajo. |
| `PASSWORD_LOGIN_ENABLED` | `false` para permitir solo Google. |
| `GMAIL_USER` / `GMAIL_APP_PASSWORD` | Correos: invitaciones, órdenes de compra, cotizaciones, contacto. |
| `ADMIN_NOTIFICATION_EMAIL` / `CONTACT_EMAIL` | A quién llegan las copias internas y los mensajes del formulario de contacto. |
| `COOKIE_SECURE` / `TRUST_PROXY` | `true` en producción detrás de HTTPS o un proxy. |
| `DATABASE_SSL` | `true` para Postgres administrado (por ejemplo, DigitalOcean). |

Sin Gmail configurado, la app funciona igual: al invitar a alguien, el enlace se copia al portapapeles para que lo compartas tú.

### Login con Google

1. En Google Cloud Console → **Google Auth Platform**, configura la pantalla de consentimiento (tipo *External*) y agrégate como *test user*. Puedes reutilizar el cliente de AssetPlus agregando la URI de abajo.
2. En **Clients**, crea (o edita) un cliente *Web application* con esta *Authorized redirect URI*: `http://localhost:3001/api/auth/google/callback`. En producción, usa tu dominio, por ejemplo `https://geiatienda.com/api/auth/google/callback`.
3. Copia el *Client ID* y el *Client secret* en `.env` y reinicia la app.

---

## Usuarios y permisos

Funcionan como antes, pero ahora los controla el servidor:

- **Dueños** (`SUPER_ADMIN_EMAILS`): administradores siempre. Son los únicos que pueden cambiar roles.
- **Administradores** (rol `admin`): configuración, catálogos, estados de O.C., usuarios e invitaciones.
- **Operarios habilitados**: inventario, ventas, encargos, cotizaciones, créditos, gastos, órdenes de compra, auditorías.
- **Invitaciones:** el administrador invita un correo desde *Usuarios*. La persona abre el enlace y entra con Google o crea una contraseña. Solo los correos invitados (y los dueños) pueden crear cuenta con contraseña. Quien entra con Google sin invitación queda en espera hasta que un administrador la apruebe.
- Eliminar a un usuario también borra su invitación, así que no puede volver a entrar solo.

### Seguridad

- Sesiones en el servidor con cookie `HttpOnly` y `SameSite=Lax`, renovadas con el uso hasta 90 días. Cerrar sesión las revoca.
- Contraseñas con bcrypt y límite de intentos fallidos. Desde el menú de tu usuario puedes crear o cambiar la contraseña, y eso cierra la sesión en los demás dispositivos.
- Login con Google por OpenID Connect con PKCE, `state` de un solo uso y `nonce`. Se exige un correo verificado.
- Protección CSRF: se rechazan los cambios que vienen de otro origen.
- El portal público solo ve nombre, precio de venta e imagen de los productos, nunca costos ni proveedores. Los pedidos web toman el precio del servidor y no pueden modificar los datos de un cliente existente.
- Las acciones de correo exigen sesión, salvo el formulario de contacto, que tiene límite de envíos.

En la versión de Firebase, cualquier usuario con sesión podía cambiar su propio rol a `admin` y el catálogo público exponía los costos. Los dos problemas quedaron cerrados.

---

## Arquitectura

```
src/app/              Páginas (las mismas de antes) y la API en src/app/api/
src/lib/store.ts      useAgriStock(): mismos datos y funciones que antes, ahora contra la API
src/lib/data-store.ts Copia en memoria de los datos, sincronizada con el servidor
src/lib/session.tsx   useUser() y cerrar sesión
src/server/
  db/schema.ts        Esquema de Postgres (fuente de verdad)
  inventory.ts        Movimientos y stock dentro de transacciones
  auth.ts, google.ts  Sesiones, contraseñas, Google
  email/              Correos (antes "flujos" de Genkit; nunca usaron IA)
drizzle/              Migraciones SQL (se aplican al arrancar)
scripts/              Exportar/importar Firebase, contraseña, prueba de punta a punta
```

## Despliegue en un servidor

La misma imagen sirve para un Droplet con Docker Compose, o para App Platform con Postgres administrado. En producción define `PUBLIC_URL`, `COOKIE_SECURE=true`, `TRUST_PROXY=true` y una `POSTGRES_PASSWORD` fuerte, y pon delante un proxy con HTTPS (Caddy o nginx).

## Pendientes conocidos

- **Imágenes:** siguen guardadas dentro de la base de datos como texto (igual que en Firestore). Si el catálogo crece mucho, conviene moverlas a almacenamiento de archivos.
- **Límite de intentos de login:** vive en memoria. Si algún día corres varias instancias, conviene moverlo a Postgres.
