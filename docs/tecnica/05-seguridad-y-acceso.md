# 5. Seguridad y acceso

## Roles

| Rol | Cómo se obtiene | Qué puede hacer |
|---|---|---|
| **Dueño** (administrador principal) | Su correo está en la variable `SUPER_ADMIN_EMAILS` | Todo lo del administrador, más cambiar roles y eliminar a otros administradores. Siempre es admin y está habilitado; no se puede deshabilitar ni eliminar desde la aplicación. |
| **Administrador** | Rol `admin` asignado por un dueño | Todo el sistema: usuarios, inventario, catálogos, flota, configuración y reportes |
| **Operario** | Rol por defecto | Operación diaria: ventas, encargos, cotizaciones, créditos, logística, gastos, órdenes de compra, verificación de inventario, movimientos |
| **Cuenta sin habilitar** | Inició sesión sin invitación | Ve el aviso "Acceso Restringido" hasta que un administrador la habilite |
| **Visitante** | Sin sesión | Solo el portal público |

Los permisos se comprueban **en el servidor** (`requireEnabled`, `requireAdmin` en `src/server/auth.ts` y la tabla de permisos de `src/server/resources.ts`). El menú lateral oculta la sección *Administración* a los operarios, pero ocultar un enlace no es la protección: la API rechaza lo que el rol no permite.

> Nota: algunas pantallas de la sección *Administración* (Inventario, Clientes, Proveedores, Reportes) usan datos que la API permite leer y editar a cualquier cuenta habilitada, porque los operarios los necesitan en ventas y compras. Si se quiere restringirlos, hay que cambiar `RESOURCE_DEFS` en `src/server/resources.ts`, no solo el menú.

## Alta de usuarios: invitaciones

1. Un administrador invita un correo con un rol (Usuarios → Invitar Operario). Se guarda solo el hash SHA‑256 del token; el token viaja únicamente en el enlace del correo.
2. La invitación vence a las **24 horas**. Reenviarla genera un token nuevo.
3. La persona abre el enlace (`/accept-invitation`) y entra con Google o crea una contraseña con ese mismo correo. La cuenta queda habilitada con el rol de la invitación.
4. Si el correo no está configurado, el administrador recibe el enlace en pantalla para compartirlo a mano.
5. Un administrador también puede **aprobar manualmente** una invitación o habilitar una cuenta que entró con Google sin invitación.

Sin invitación no se puede crear cuenta con contraseña. Con Google sí se puede entrar, pero la cuenta queda deshabilitada hasta que un administrador la apruebe.

## Inicio de sesión

- **Correo y contraseña** (si `PASSWORD_LOGIN_ENABLED` no es `false`): contraseñas con bcrypt (costo 12), mínimo 8 caracteres. Un correo inexistente tarda lo mismo que uno real para no revelar qué cuentas existen.
- **Google** (si `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` están configurados): OpenID Connect con PKCE, `state` de un solo uso y `nonce`. Solo se aceptan correos verificados por Google. Una cuenta importada de Firebase se vincula sola al entrar con Google con el mismo correo.
- **Bloqueo por intentos:** 8 fallos para la misma cuenta o 30 desde la misma IP en 15 minutos bloquean el acceso 15 minutos. El contador vive en memoria: se reinicia al reiniciar la app.
- **Cambiar contraseña** (menú del usuario → Mi cuenta) cierra las sesiones en los demás dispositivos.
- **Recuperar acceso:** no hay "olvidé mi contraseña" por correo. Un administrador con acceso al servidor ejecuta `node scripts/set-password.mjs <correo>` (o `Crear contraseña admin.command` en Mac), que genera una contraseña nueva y la muestra una vez.

## Sesiones

- Token aleatorio de 32 bytes en la cookie `geia_session` (HttpOnly, SameSite=Lax; `Secure` con `COOKIE_SECURE=true`). En la base solo se guarda su hash.
- Duración: 30 días que se renuevan con el uso, con un máximo absoluto de 90 días.
- Se registra el navegador (`user_agent`) y la IP de cada sesión, y los últimos 10 accesos del usuario.

## Protecciones de la API

| Riesgo | Protección |
|---|---|
| CSRF (otro sitio enviando peticiones con la cookie) | Las peticiones que cambian datos deben venir del propio origen (`Origin`), de `PUBLIC_URL` o de `ALLOWED_ORIGINS` |
| Datos inválidos o excesivos | Validación con zod de cada campo y largo máximo de textos; restricciones `CHECK` y llaves foráneas en la base |
| Escalada de permisos | Permisos por recurso en el servidor; los campos del servidor (operario, estado aplicado, totales de pagos) no se aceptan del navegador |
| Abuso de formularios públicos | Límites por IP: pedidos web y solicitudes de flete 10 cada 10 min; registro 20 por hora; contacto 5 por hora (con `TRUST_PROXY=true`) |
| Exposición de costos | El catálogo público solo devuelve campos públicos: sin costo, margen ni proveedor |
| Errores que filtran información | Las respuestas 500 dicen "Error interno del servidor"; el detalle va al log |
| Correos a destinatarios manipulados | La copia de administración siempre va a la dirección configurada en el servidor |
| Bots que buscan vulnerabilidades | `src/middleware.ts` responde 404 a rutas como `/wp-admin`, `/.env`, `/.git`, `*.php` |

## Secretos

Nunca deben ir al repositorio (están en `.gitignore` y `.dockerignore`):

- `.env` (contraseñas de Gmail, Google, base de datos)
- `firebase-key.json` (clave de la cuenta de servicio de Firebase)
- `firebase-backup.json`, `reporte-*.{txt,csv}` (datos de clientes)

Si un token o clave se publica por error (en un chat, un commit o un mensaje), revócalo de inmediato en el servicio correspondiente y genera uno nuevo.

## Recomendaciones para producción

- Servir solo por HTTPS y definir `PUBLIC_URL=https://geiatienda.com`, `COOKIE_SECURE=true` y, detrás de un proxy, `TRUST_PROXY=true`.
- Cambiar `POSTGRES_PASSWORD` antes de cargar datos reales y no publicar el puerto de Postgres fuera del servidor (por defecto solo escucha en `127.0.0.1`).
- Respaldos diarios de la base (ver [6. Instalación y operación](06-instalacion-y-operacion.md)).
- Revisar periódicamente la lista de usuarios y deshabilitar a quien ya no trabaje en la empresa.

---
Desarrollado por Coldesoft · [coldesoft.com](https://coldesoft.com)
