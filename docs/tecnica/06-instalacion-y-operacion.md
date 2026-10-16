# 6. Instalación y operación

## Requisitos

- **Docker** con Compose v2.24 o superior (Docker Desktop en Mac/Windows, Docker Engine en Linux).
- Para desarrollar sin Docker: Node.js 20.9 o superior.
- Opcional: cuenta de Gmail con contraseña de aplicación (correos) y cliente OAuth de Google (inicio de sesión con Google).

## Instalación local (Docker)

```bash
git clone https://github.com/jhonathanmaster/AgriStock-Tracker.git
cd AgriStock-Tracker
cp .env.example .env      # ajusta correos, Google, Gmail
docker compose up --build
```

- App: **http://localhost:3001**
- PostgreSQL: `localhost:5435` (solo accesible desde el mismo equipo)
- Las tablas se crean solas en el primer arranque.

Los puertos se eligieron para convivir con otros proyectos en la misma máquina:

| Proyecto | App | PostgreSQL |
|---|---|---|
| AssetPlus | 3000 | 5432 |
| CuponManía | 3100, 3101 | 5433 |
| JobMatcher | 3200 | 5434 |
| **GeiaTienda / AgriStock** | **3001** | **5435** |

Se cambian con `APP_PORT` y `POSTGRES_PORT` en `.env`.

### Accesos de doble clic (macOS)

| Archivo | Qué hace |
|---|---|
| `Iniciar GeiaTienda.command` | Abre Docker Desktop si hace falta, construye, arranca y abre el navegador |
| `Detener GeiaTienda.command` | Detiene la app sin borrar datos |
| `Desarrollo GeiaTienda.command` | Modo desarrollo con recarga en caliente |
| `Crear contraseña admin.command` | Genera una contraseña para un correo (por defecto el dueño) y la muestra una vez |
| `Exportar Firebase.command` | Lee Firebase y genera `firebase-backup.json` |
| `Importar Firebase.command` | Importa `firebase-backup.json` a PostgreSQL |

### Primer acceso

- Con Google configurado: entra con el correo del dueño (`SUPER_ADMIN_EMAILS`).
- Sin Google: `Crear contraseña admin.command`, o `docker compose exec app node scripts/set-password.mjs correo@dominio.com`.

## Variables de entorno

Todas están en `.env.example`. Docker Compose lee `.env` automáticamente.

| Variable | Obligatoria | Valor por defecto | Para qué |
|---|---|---|---|
| `SUPER_ADMIN_EMAILS` | Sí | `jhonathanmaster@gmail.com` | Dueños (siempre administradores), separados por coma |
| `APP_PORT` | No | `3001` | Puerto de la app en el equipo |
| `POSTGRES_PORT` | No | `5435` | Puerto de Postgres en el equipo (solo `127.0.0.1`) |
| `POSTGRES_PASSWORD` | Producción | `geiatienda` | Contraseña del contenedor de Postgres |
| `DATABASE_URL` | Fuera de Docker | — | Conexión a Postgres para `npm run dev` y los scripts |
| `DATABASE_SSL` | No | `false` | `true` para Postgres administrado con TLS |
| `DATABASE_POOL_MAX` | No | `10` | Conexiones máximas del pool |
| `PUBLIC_URL` | Producción | `http://localhost:3001` | Dirección pública: enlaces de invitación y regreso de Google |
| `COOKIE_SECURE` | Producción | `false` | `true` detrás de HTTPS |
| `TRUST_PROXY` | Detrás de proxy | `false` | `true` para leer la IP real de `X-Forwarded-For` (límites por IP) |
| `ALLOWED_ORIGINS` | No | — | Orígenes extra autorizados a enviar cambios |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | No | — | Activan "Entrar con Google" |
| `PASSWORD_LOGIN_ENABLED` | No | `true` | `false` para permitir solo Google |
| `GMAIL_USER`, `GMAIL_APP_PASSWORD` | No | — | Envío de correos |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` | No | — | Otro proveedor SMTP (usa `GMAIL_USER`/`GMAIL_APP_PASSWORD` como credenciales) |
| `ADMIN_NOTIFICATION_EMAIL` | No | primer dueño | Copias de órdenes de compra, recepciones y cotizaciones |
| `CONTACT_EMAIL` | No | `grupoempresarialinversonessas@gmail.com` | Buzón del formulario de contacto |

### Configurar Google

1. En Google Cloud Console → Google Auth Platform, configura la pantalla de consentimiento.
2. Crea un cliente *Web application* con la URI de redirección `<PUBLIC_URL>/api/auth/google/callback` (por ejemplo `https://geiatienda.com/api/auth/google/callback`).
3. Copia el Client ID y el Client secret en `.env` y reinicia.

### Configurar Gmail

1. En la cuenta de Google que enviará los correos, activa la verificación en dos pasos.
2. En Seguridad → Contraseñas de aplicación, crea una.
3. Ponla en `GMAIL_APP_PASSWORD` junto con `GMAIL_USER`.

Sin correo configurado el sistema funciona igual: al invitar, el enlace se muestra en pantalla para compartirlo a mano, y los envíos de cotizaciones u órdenes informan que no se pudo enviar.

## Despliegue en producción (geiatienda.com)

Arquitectura recomendada: un servidor Linux (VPS) con Docker, un proxy inverso con HTTPS delante y Postgres en el mismo servidor o administrado.

```
Internet ──HTTPS──> Proxy (Caddy / Nginx, certificado Let's Encrypt)
                        │ http://127.0.0.1:3001
                        ▼
                  contenedor app ──> contenedor db (o Postgres administrado)
```

Pasos:

1. Instala Docker en el servidor y clona el repositorio.
2. Crea `.env` con al menos:
   ```
   SUPER_ADMIN_EMAILS=correo-del-dueño@dominio.com
   POSTGRES_PASSWORD=<contraseña larga y aleatoria>
   PUBLIC_URL=https://geiatienda.com
   COOKIE_SECURE=true
   TRUST_PROXY=true
   GMAIL_USER=...
   GMAIL_APP_PASSWORD=...
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   ```
3. `docker compose up -d --build`
4. Configura el proxy para que `geiatienda.com` apunte a `127.0.0.1:3001`. Ejemplo con Caddy:
   ```
   geiatienda.com {
     reverse_proxy 127.0.0.1:3001
   }
   ```
5. Apunta el DNS del dominio (registro A) a la IP del servidor.
6. Verifica `https://geiatienda.com/api/health`.

Para usar Postgres administrado, quita el servicio `db` de `docker-compose.yml` (o no lo levantes), define `DATABASE_URL` hacia ese servidor y `DATABASE_SSL=true`.

## Operación diaria

```bash
docker compose ps                 # estado de los contenedores
docker compose logs -f app        # registros de la app
docker compose restart app        # reiniciar la app
docker compose down               # detener (los datos se conservan)
docker compose down -v            # detener y BORRAR la base de datos
```

### Actualizar a una nueva versión

```bash
git pull
docker compose up -d --build
```

Las migraciones nuevas se aplican solas al arrancar. Haz un respaldo antes de actualizar.

### Monitoreo

- `GET /api/health` responde 200 si la app y la base están bien. El contenedor tiene `HEALTHCHECK` cada 30 s.
- Los errores de la API quedan en `docker compose logs app` con el prefijo `[api]`; los de correo con `[correo]`; los de acceso con `[auth]`.

## Respaldos

La base de datos vive en el volumen Docker `geiatienda_pgdata`.

**Respaldo:**

```bash
docker compose exec -T db pg_dump -U geiatienda -d geiatienda -Fc > respaldo-$(date +%F).dump
```

**Restauración** (reemplaza los datos actuales):

```bash
docker compose exec -T db pg_restore -U geiatienda -d geiatienda --clean --if-exists < respaldo-AAAA-MM-DD.dump
```

Recomendación: respaldo diario automático (cron) y copia fuera del servidor. Ejemplo de cron a las 2:00 a. m.:

```
0 2 * * * cd /ruta/AgriStock-Tracker && docker compose exec -T db pg_dump -U geiatienda -d geiatienda -Fc > /respaldos/geia-$(date +\%F).dump
```

Prueba restaurar un respaldo en otra máquina al menos una vez: un respaldo que no se ha probado no es un respaldo.

## Migración de datos desde Firebase

La versión anterior guardaba los datos en Firestore (proyecto `studio-7807631118-f734e`). Firebase solo se lee; no se modifica nada allá.

1. **Clave:** consola de Firebase → Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada. Guárdala como `firebase-key.json` en la carpeta del proyecto (está excluida de git y Docker).
2. **Exportar:** `Exportar Firebase.command`, o `node scripts/firestore-export.cjs firebase-key.json firebase-backup.json`.
3. **Importar:** `Importar Firebase.command`, o con la app arriba:
   ```bash
   docker compose exec app node scripts/import-firestore.mjs firebase-backup.json --dry-run
   docker compose exec app node scripts/import-firestore.mjs firebase-backup.json
   ```

El importador conserva los ids, valida y corrige cada documento, trabaja en una sola transacción, se puede repetir sin duplicar y genera dos reportes:

- `reporte-importacion.txt`: documentos omitidos o corregidos y por qué.
- `reporte-stock.csv`: stock de Firebase frente al que explica el historial, por producto.

Los usuarios importados conservan rol y estado; entran con Google con el mismo correo, o se les asigna contraseña con `set-password.mjs`.

## Solución de problemas

| Síntoma | Causa probable | Solución |
|---|---|---|
| `port is already allocated` al arrancar | Otro proyecto usa el puerto | Cambia `APP_PORT` o `POSTGRES_PORT` en `.env` |
| `/api/health` responde `db: down` | Postgres no arrancó o `DATABASE_URL` es incorrecta | `docker compose logs db` |
| "Petición rechazada (origen no permitido)" | Se accede por un dominio distinto de `PUBLIC_URL` | Ajusta `PUBLIC_URL` o agrega el dominio a `ALLOWED_ORIGINS` |
| No llegan los correos | Falta `GMAIL_APP_PASSWORD` o es incorrecta | Revisa `.env` y los registros `[correo]` |
| "Esta cuenta entra con Google" | La cuenta no tiene contraseña | Entra con Google o asigna una con `set-password.mjs` |
| "Demasiados intentos fallidos" | 8 intentos fallidos en 15 min | Espera 15 minutos o reinicia la app |
| Google devuelve `redirect_uri_mismatch` | La URI registrada no coincide con `PUBLIC_URL` | Registra `<PUBLIC_URL>/api/auth/google/callback` exactamente |

---
Desarrollado por Coldesoft · [coldesoft.com](https://coldesoft.com)
