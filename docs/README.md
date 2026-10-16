# Documentación de GeiaTienda Tracker

Sistema de inventario, ventas y logística de **GEIA**, publicado en **geiatienda.com**. Incluye el sistema interno de gestión y el portal web público con catálogo, pedidos y solicitudes de transporte.

> Desarrollado por **Coldesoft** · [coldesoft.com](https://coldesoft.com)

## Documentación técnica

Para quien instala, mantiene o desarrolla el sistema.

| Documento | Contenido |
|---|---|
| [1. Arquitectura](tecnica/01-arquitectura.md) | Visión general, componentes, flujo de datos y estructura del código |
| [2. Modelo de datos](tecnica/02-modelo-de-datos.md) | Tablas de PostgreSQL, relaciones, reglas y migraciones |
| [3. API](tecnica/03-api.md) | Todos los endpoints, permisos, formatos y errores |
| [4. Inventario y stock](tecnica/04-inventario-y-stock.md) | Cómo se calcula el stock y qué operaciones lo mueven |
| [5. Seguridad y acceso](tecnica/05-seguridad-y-acceso.md) | Sesiones, roles, invitaciones, protecciones |
| [6. Instalación y operación](tecnica/06-instalacion-y-operacion.md) | Docker, variables de entorno, producción, respaldos, migración desde Firebase |
| [7. Desarrollo y pruebas](tecnica/07-desarrollo-y-pruebas.md) | Entorno local, convenciones, cómo agregar módulos, pruebas |

## Manuales

Para quien usa el sistema día a día.

| Manual | Para quién |
|---|---|
| [Manual del operario](manuales/manual-operario.md) | Personal de tienda: ventas, encargos, créditos, cotizaciones, logística, gastos, órdenes de compra y verificación de inventario |
| [Manual del administrador](manuales/manual-administrador.md) | Administradores: usuarios, inventario, catálogos, configuración, reportes |
| [Manual del portal web](manuales/manual-portal-web.md) | Clientes y visitantes de geiatienda.com |

## Otros documentos

- [`blueprint.md`](blueprint.md): visión original del producto y guía de estilo.
- [`../README.md`](../README.md): inicio rápido.
- [`../CLAUDE.md`](../CLAUDE.md): contexto resumido para asistentes de código.

---
Versión del sistema documentada: rama `feat/postgres-local` (Next.js 15 + PostgreSQL 16), octubre de 2026.
