# CLAUDE.md — AgriStock Tracker (GeiaTienda Tracker)

Sistema de inventario y ventas para tiendas agrícolas: productos, insumos y animales,
ventas rápidas, órdenes de compra, cotizaciones, gastos, créditos y auditorías de inventario.
La interfaz y los textos están en **español**; mantén ese idioma en UI, mensajes y comentarios.

> Nota: el `package.json` se llama `geiatienda-tracker`. El repo `studio` es una versión
> anterior de este mismo proyecto; **este repositorio es el vigente**.

## Stack
- Next.js 15 (App Router) + React 19 + TypeScript, con su propia API en `src/app/api/`
- PostgreSQL con Drizzle ORM (`src/server/db/schema.ts`, migraciones en `drizzle/`, se aplican al arrancar)
- Tailwind CSS 3 + componentes shadcn/ui (`src/components/ui/`, config en `components.json`)
- Sesiones propias: Google (OIDC + PKCE) y correo/contraseña (`src/server/auth.ts`, `src/server/google.ts`)
- Correos con `nodemailer` vía Gmail (`src/server/email/`)
- Docker: `Dockerfile` (salida standalone), `docker-compose.yml` (app 3001, Postgres 5433) y `docker-compose.dev.yml`
- Sin Firebase ni Genkit.

## Comandos
```bash
docker compose up --build   # app + Postgres
npm install
npm run dev                 # requiere DATABASE_URL (docker compose up -d db)
npm run build
npm run typecheck
npm run db:generate         # nueva migración tras cambiar schema.ts
npm run test:smoke          # prueba de punta a punta; solo contra una base de datos de prueba
```
Antes de dar un cambio por terminado, ejecuta `npm run typecheck`, `npm run build` y, si tocas datos o stock, `npm run test:smoke`.

## Estructura
- `src/app/` — una carpeta por pantalla y `src/app/api/` para la API.
- `src/lib/store.ts` — hook `useAgriStock()`, misma interfaz que antes, ahora contra la API.
  `src/lib/data-store.ts` mantiene la copia en memoria y sincroniza con contadores de versión.
- `src/server/inventory.ts` — todo cambio de stock pasa por aquí, dentro de transacciones con bloqueo de fila.
  Nunca escribas el stock directamente desde el cliente.
- `src/lib/types.ts` — tipos del dominio. `src/server/db/schema.ts` es la fuente de verdad del modelo.
- `scripts/` — exportar/importar Firestore, asignar contraseña, prueba de punta a punta.
- `src/middleware.ts` — devuelve 404 a rutas típicas de escaneo de bots (wp-, .php, .env…).
- `docs/blueprint.md` — visión original y guía de estilo (verde #8BA34C, fondo #F6F8ED, acento #D0AC55, fuente PT Sans).

## Roles y seguridad
- Dueños: `SUPER_ADMIN_EMAILS`. Roles `admin` y operario; los usuarios necesitan estar habilitados.
- Los permisos se comprueban en el servidor; no confíes en el cliente.
- El catálogo público nunca expone costos ni proveedores.

## Variables de entorno
- Todas documentadas en `.env.example` (`DATABASE_URL`, `SUPER_ADMIN_EMAILS`, Google, Gmail, puertos).
- `GMAIL_APP_PASSWORD`, `firebase-key.json` y `.env` nunca van al repositorio.

## Convenciones
- Componentes de UI: reutiliza los de `src/components/ui/` antes de crear nuevos.
- Formularios con `react-hook-form` + `zod`.
- Unidades de inventario: libras, kilos, bultos, unidades (con conversiones en `unitConversions`).
- `tailwing.config.ts` es un archivo muerto (nombre con error); la config real es `tailwind.config.ts`.
