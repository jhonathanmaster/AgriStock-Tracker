# 1. Arquitectura

## Visión general

GeiaTienda Tracker es una aplicación web única (Next.js) que sirve dos cosas:

1. **Portal web público** (`geiatienda.com`): catálogo de productos con precios de venta, ficha de cada producto con pedido en línea, solicitud de cotización de transporte, página de contacto y "Quiénes somos". No requiere iniciar sesión.
2. **Sistema de gestión interno**: inventario, ventas rápidas, encargos, cotizaciones, créditos, gastos, órdenes de compra, verificación de inventario, logística (camiones y fletes), reportes y administración. Requiere una cuenta habilitada.

```
 Navegador (portal público / sistema interno)
        │  HTTPS, cookie de sesión "geia_session"
        ▼
 ┌──────────────────────────────────────────────┐
 │ Next.js 15 (App Router, salida standalone)   │
 │  • Páginas React 19 (src/app/*)              │
 │  • API propia (src/app/api/*)                │
 │  • Acciones de servidor para correos         │
 │  • Lógica de negocio (src/server/*)          │
 └──────────────┬───────────────────┬───────────┘
                │ pg (pool)         │ SMTP (nodemailer)
                ▼                   ▼
       PostgreSQL 16          Gmail / SMTP
   (Drizzle ORM, migraciones)   (invitaciones, OC,
                                cotizaciones, contacto)
                │
     Google OAuth (opcional, inicio de sesión)
```

## Stack

| Capa | Tecnología |
|---|---|
| Interfaz | React 19, Next.js 15 (App Router), Tailwind CSS 3, componentes shadcn/ui (Radix), lucide-react, Recharts (gráficas) |
| Formularios | react-hook-form + zod |
| Servidor | Rutas API de Next.js (`src/app/api`), acciones de servidor (`'use server'`) para correos |
| Base de datos | PostgreSQL 16 con Drizzle ORM; migraciones SQL en `drizzle/` aplicadas al arrancar |
| Autenticación | Sesiones propias en base de datos; Google (OIDC + PKCE con `jose`) y correo/contraseña (`bcryptjs`) |
| Correo | `nodemailer` con Gmail (contraseña de aplicación) u otro SMTP |
| Empaquetado | Docker multi‑etapa (`node:22-alpine`), Docker Compose con Postgres |

Antes la aplicación usaba Firebase (Firestore, Auth y Genkit). Se migró a PostgreSQL porque el inventario se descuadraba: cada navegador calculaba y escribía el stock por su cuenta. Ver [4. Inventario y stock](04-inventario-y-stock.md).

## Flujo de datos en el navegador

El sistema interno conserva la interfaz de la versión anterior mediante el hook `useAgriStock()` (`src/lib/store.ts`), que ahora habla con la API:

1. Al entrar, `src/lib/data-store.ts` pide la sesión (`GET /api/auth/me`).
2. Si la cuenta está habilitada, descarga todos los conjuntos de datos que el usuario puede leer (`GET /api/data`) y los guarda en memoria.
3. Cada **10 segundos** (y al volver a la pestaña) consulta `GET /api/data/versions`. Cada conjunto tiene un contador de versión que el servidor incrementa en la misma transacción que cada escritura. Solo se recargan los conjuntos cuyo contador cambió. Así los cambios de otras personas aparecen sin recargar la página.
4. Las escrituras van a la API. Al terminar, el cliente recarga de inmediato los conjuntos afectados.
5. Si la API devuelve error, se muestra un aviso y no se aplica nada a medias.

Para visitantes sin sesión solo se carga el catálogo público (`GET /api/public/catalog`), que nunca incluye costos, márgenes ni proveedores.

## Estructura del código

```
src/
  app/                    Pantallas (una carpeta por ruta) y API
    page.tsx              Portal público (?view=site) o Tablero si hay sesión
    producto/[id]/        Ficha pública de producto con pedido
    transporte/           Solicitud pública de flete
    contact/, about/      Contacto y Quiénes somos
    login/, accept-invitation/
    sales/ orders/ quotations/ credits/ expenses/
    purchase-orders/ purchase-tracking/ inventory-audit/ movements/
    logistics/services/ logistics/trucks/
    inventory/ reports/ settings/ admin/(customers|suppliers|categories|animals|expense-categories|purchase-order-statuses)
    api/                  Endpoints (ver 03-api.md)
  components/             Navegación, formularios (producto, venta, gasto, flete) y ui/ (shadcn)
  lib/
    store.ts              useAgriStock(): datos, totales y operaciones
    data-store.ts         Copia en memoria, sincronización por versiones, cliente HTTP
    session.tsx           useUser(), signOut()
    types.ts              Tipos del dominio
  server/                 Solo servidor
    db/schema.ts          Modelo de datos (fuente de verdad)
    db/client.ts          Pool de conexiones y migraciones
    auth.ts google.ts     Sesiones, roles, Google
    inventory.ts          Cambios de stock (transacciones con bloqueo)
    resources.ts generic.ts data.ts versions.ts   API genérica de datos
    customers.ts          Alta/actualización de clientes sin duplicados
    email/                Plantillas y envío de correos
    http.ts validation.ts Errores, CSRF, validación
  middleware.ts           404 para rutas de escaneo de bots
drizzle/                  Migraciones SQL (0000_init, 0001_logistica)
scripts/                  Exportar/importar Firebase, contraseña, prueba de punta a punta
*.command                 Accesos de doble clic para macOS
```

## Decisiones de diseño

- **Una sola aplicación** para portal y sistema interno, con la misma base de datos. Más simple de desplegar y mantener.
- **El servidor es la única fuente de verdad del stock.** El cliente nunca escribe el stock; solo registra movimientos, y el servidor ajusta el stock en la misma transacción.
- **API genérica + endpoints especiales.** Los catálogos y registros simples pasan por `/api/data/:recurso`. Todo lo que afecta el stock, los permisos o los pagos tiene su propio endpoint con reglas explícitas.
- **Identificadores de texto** para conservar los ids de Firestore tras la migración.
- **Copia en memoria con sondeo de versiones** en lugar de WebSockets: suficiente para el volumen de una tienda y sin infraestructura adicional.

---
Desarrollado por Coldesoft · [coldesoft.com](https://coldesoft.com)
