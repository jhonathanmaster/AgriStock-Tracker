# 7. Desarrollo y pruebas

## Entorno de desarrollo

**Todo en Docker, con recarga en caliente:**

```bash
docker compose -f docker-compose.dev.yml up
```

Los cambios en `src/` aparecen al instante en http://localhost:3001. Usa la misma base de datos que el modo normal.

**App fuera de Docker** (Node.js ≥ 20.9):

```bash
npm install
cp .env.example .env
docker compose up -d db     # solo Postgres en localhost:5435
npm run dev                 # http://localhost:3000
```

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compilación de producción (salida `standalone`) |
| `npm run start` | Ejecuta la compilación |
| `npm run typecheck` | Chequeo de tipos de TypeScript |
| `npm run lint` | Linter de Next.js |
| `npm run db:generate` | Genera una migración tras cambiar `schema.ts` |
| `npm run db:studio` | Explorador visual de la base (Drizzle Studio) |
| `npm run test:smoke` | Prueba de punta a punta de la API |

Antes de dar un cambio por terminado: `npm run typecheck`, `npm run build` y, si toca datos o stock, `npm run test:smoke`.

## Convenciones

- **Idioma:** interfaz, mensajes de error y comentarios en español.
- **UI:** reutiliza los componentes de `src/components/ui/` (shadcn/ui). Colores de marca: verde `#8BA34C`, fondo `#F6F8ED`, acento `#D0AC55`; fuente PT Sans (ver `docs/blueprint.md`).
- **Formularios:** `react-hook-form` + `zod`.
- **Datos en la interfaz:** usa `useAgriStock()` (`src/lib/store.ts`). No llames a `fetch` directamente desde las pantallas; agrega la operación al store.
- **Stock:** nunca lo escribas directamente. Todo cambio pasa por `recordMovement()` u otra función de `src/server/inventory.ts`, dentro de una transacción.
- **Permisos:** siempre en el servidor (`requireEnabled`, `requireAdmin`, `RESOURCE_DEFS`).
- **Versiones:** toda escritura llama a `bumpVersions()` en la misma transacción con los conjuntos que afecta, o los demás navegadores no se enteran.
- **Catálogo público:** nunca expongas costos, márgenes ni proveedores.
- **Secretos:** nunca en el código ni en git.
- `tailwing.config.ts` es un archivo muerto (nombre con error); la configuración real es `tailwind.config.ts`.

## Cómo agregar un módulo nuevo

Ejemplo: un registro simple como "Mantenimientos de camión".

1. **Modelo:** agrega la tabla en `src/server/db/schema.ts` y ejecuta `npm run db:generate`.
2. **Conjunto de datos:** agrega el nombre a `RESOURCES` en `src/server/versions.ts`.
3. **Permisos y validación:** agrega su entrada en `RESOURCE_DEFS` (`src/server/resources.ts`) con `table`, `read`, `write`, el esquema zod `create` y `orderBy`. Con esto ya funcionan `GET /api/data`, `POST/PATCH/DELETE /api/data/:recurso`.
4. **Tipos:** agrega el tipo en `src/lib/types.ts`.
5. **Store:** expón la lista y las operaciones en `useAgriStock()`.
6. **Pantalla:** crea `src/app/<ruta>/page.tsx` y agrégala al menú en `src/components/Navigation.tsx` (`navItems` o `adminItems`).
7. **Importador** (si hay datos en Firebase): extiende `scripts/import-firestore.mjs`.
8. **Prueba:** agrega casos a `scripts/smoke-test.mjs` si el módulo tiene reglas de negocio.

Si la operación toca stock, pagos derivados o permisos especiales, crea un endpoint propio en `src/app/api/` en lugar de usar la escritura genérica.

## Pruebas

### Prueba de punta a punta (`scripts/smoke-test.mjs`)

Recorre la API real contra un servidor en marcha. Crea datos de prueba (productos llamados "SMOKE …"), así que **solo debe correr contra una base vacía o desechable**, nunca contra producción.

```bash
# Base de prueba aparte
docker run -d --name geia-test-db -e POSTGRES_USER=geiatienda -e POSTGRES_PASSWORD=geiatienda \
  -e POSTGRES_DB=geiatienda -p 5499:5432 postgres:16-alpine
DATABASE_URL=postgres://geiatienda:geiatienda@localhost:5499/geiatienda \
  SUPER_ADMIN_EMAILS=admin@smoke.test npm run build && \
  DATABASE_URL=postgres://geiatienda:geiatienda@localhost:5499/geiatienda \
  SUPER_ADMIN_EMAILS=admin@smoke.test PORT=3999 npm run start &
BASE_URL=http://localhost:3999 ADMIN_EMAIL=admin@smoke.test npm run test:smoke
```

Comprueba, entre otros: sesiones y permisos, CSRF, ventas concurrentes, edición y borrado de movimientos, recepción idempotente de órdenes de compra, auditorías, ajuste de stock desde el formulario de producto, catálogo público sin costos, pedidos y solicitudes públicas, y logística (abonos y estado de pago).

### Lista de verificación manual antes de publicar

1. Entrar como dueño y como operario; el operario no ve *Administración*.
2. Registrar una venta y ver que el stock baja y aparece en *Movimientos*.
3. Editar y eliminar esa venta; el stock vuelve.
4. Crear una orden de compra, llevarla a "Recibido" dos veces; el stock sube una sola vez.
5. Registrar un conteo y aplicar el ajuste.
6. Abrir el portal sin sesión: catálogo sin costos, pedido desde una ficha, solicitud de transporte.
7. Abrir la app en dos navegadores y comprobar que los cambios de uno aparecen en el otro en unos 10 segundos.

## Repositorio

- Repositorio vigente: `jhonathanmaster/AgriStock-Tracker`. El repo `studio` es una versión anterior (Firebase Studio).
- Rama de la versión con PostgreSQL: `feat/postgres-local` (PR #1).

---
Desarrollado por Coldesoft · [coldesoft.com](https://coldesoft.com)
