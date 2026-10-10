# CLAUDE.md — AgriStock Tracker (GeiaTienda Tracker)

Sistema de inventario y ventas para tiendas agrícolas: productos, insumos y animales,
ventas rápidas, órdenes de compra, cotizaciones, gastos, créditos y auditorías de inventario.
La interfaz y los textos están en **español**; mantén ese idioma en UI, mensajes y comentarios.

> Nota: el `package.json` se llama `geiatienda-tracker`. El repo `studio` es una versión
> anterior de este mismo proyecto; **este repositorio es el vigente**.

## Stack
- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind CSS 3 + componentes shadcn/ui (`src/components/ui/`, config en `components.json`)
- Firebase: Auth (Google) y Firestore, todo desde el cliente
- Correos con `nodemailer` vía Gmail (flujos en `src/ai/flows/send-*.ts`)
- Genkit está instalado pero **la IA generativa no se usa** (`src/ai/dev.ts` está deshabilitado)
- Despliegue: Firebase App Hosting (`apphosting.yaml`)

## Comandos
```bash
npm install
npm run dev        # servidor de desarrollo
npm run build      # build de producción
npm run lint
npm run typecheck  # tsc --noEmit
```
No hay suite de pruebas. Antes de dar un cambio por terminado, ejecuta `npm run typecheck` y `npm run build`.

## Estructura
- `src/app/` — una carpeta por pantalla (inventory, sales, movements, purchase-orders,
  purchase-tracking, quotations, orders, expenses, credits, reports, inventory-audit, settings…)
  y `src/app/admin/` para catálogos (animales, categorías, clientes, proveedores, estados de OC, categorías de gasto).
- `src/lib/store.ts` — hook central `useAgriStock()`: lecturas/escrituras de Firestore y cálculo de roles.
  Casi toda la lógica de datos pasa por aquí.
- `src/lib/types.ts` — tipos del dominio. `docs/backend.json` documenta las entidades de Firestore.
- `src/firebase/` — inicialización, hooks `useCollection`/`useDoc` y escrituras "non-blocking".
- `src/ai/flows/` — envío de correos (invitaciones, OC, cotizaciones, recibos, contacto).
- `src/middleware.ts` — devuelve 404 a rutas típicas de escaneo de bots (wp-, .php, .env…).
- `docs/blueprint.md` — visión original y guía de estilo (verde #8BA34C, fondo #F6F8ED, acento #D0AC55, fuente PT Sans).

## Roles y seguridad
- Roles: super admin (UID/correo fijos), `admin` y `operario`; los usuarios necesitan `enabled: true`.
- El super admin está definido **en dos sitios** que deben coincidir: `src/lib/store.ts` y `firestore.rules`.
- Si cambias la forma de los datos o agregas una colección, actualiza también `firestore.rules`
  y `docs/backend.json`.
- `products`, `categories` y `animalTypes` tienen lectura pública (catálogo).

## Variables de entorno
- `GMAIL_USER`, `GMAIL_APP_PASSWORD` — necesarias para los correos.
- La contraseña de aplicación **nunca** va en `apphosting.yaml` ni en el código: se quitó de ahí
  por estar en texto plano. Usa `.env` local o los secretos de App Hosting.
- La configuración web de Firebase en `src/firebase/config.ts` es pública por diseño.

## Convenciones
- Componentes de UI: reutiliza los de `src/components/ui/` antes de crear nuevos.
- Formularios con `react-hook-form` + `zod`.
- Unidades de inventario: libras, kilos, bultos, unidades (con conversiones en `unitConversions`).
- `tailwing.config.ts` es un archivo muerto (nombre con error); la config real es `tailwind.config.ts`.
