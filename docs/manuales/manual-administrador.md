# Manual del administrador

Guía para administradores y dueños de GeiaTienda: usuarios, inventario, catálogos, flota, configuración y reportes. Las tareas del día a día (ventas, encargos, cotizaciones, etc.) están en el [Manual del operario](manual-operario.md).

> Desarrollado por Coldesoft · [coldesoft.com](https://coldesoft.com)

## Contenido

1. [Roles y permisos](#1-roles-y-permisos)
2. [Puesta en marcha](#2-puesta-en-marcha)
3. [Usuarios](#3-usuarios)
4. [Inventario de productos](#4-inventario-de-productos)
5. [Catálogos](#5-catálogos)
6. [Proveedores y clientes](#6-proveedores-y-clientes)
7. [Flota de camiones](#7-flota-de-camiones)
8. [Configuración](#8-configuración)
9. [Reportes](#9-reportes)
10. [Tareas que solo puede hacer un administrador](#10-tareas-que-solo-puede-hacer-un-administrador)
11. [Rutinas recomendadas](#11-rutinas-recomendadas)
12. [Problemas comunes](#12-problemas-comunes)

---

## 1. Roles y permisos

| Rol | Quién | Puede |
|---|---|---|
| **Dueño** | Correos configurados en el servidor (`SUPER_ADMIN_EMAILS`) | Todo. Además es el único que **cambia roles** y **elimina a otros administradores**. No se puede deshabilitar ni eliminar desde la aplicación. |
| **Administrador** | Rol asignado por un dueño | Todo el sistema y la sección *Administración* del menú |
| **Operario** | Rol por defecto de los invitados | Operación diaria; no ve la sección *Administración* |

Los permisos se validan en el servidor: aunque alguien conozca la dirección de una pantalla de administración, no puede guardar cambios sin el rol.

---

## 2. Puesta en marcha

Orden recomendado la primera vez (o tras migrar datos):

1. **Configuración** → datos de la empresa, logo, firma, umbral de stock crítico y capital inicial.
2. **Configuración** → *Factores de Conversión* → **Cargar iniciales** (o **Restaurar Estándares**).
3. **Categorías**, **Animales**, **Categorías Gastos** y **Estados O.C.**
4. **Proveedores**.
5. **Inventario** → productos con su stock actual.
6. **Flota Camiones**, si se usa logística.
7. **Usuarios** → invita al equipo.

---

## 3. Usuarios

Menú **Administración → Usuarios** (*Gestión de Acceso*).

### Invitar a una persona

1. Pulsa **Invitar Operario**.
2. Escribe su correo (de preferencia Gmail, para que pueda entrar con Google) y envía.
3. Le llega un correo con el enlace de activación, **válido por 24 horas**.
4. Si el servidor no tiene correo configurado, el sistema te muestra el enlace: cópialo y envíaselo por WhatsApp u otro medio.

La persona aparece en la lista como invitación pendiente hasta que la acepta.

### Acciones por usuario

| Acción | Para qué |
|---|---|
| **Aprobar Manual** | Habilitar a alguien sin que use el enlace, o aprobar a quien entró con Google sin invitación |
| **Ver Detalles** | Identificación, teléfono, dirección y **último acceso** |
| **Editar Perfil** | Datos personales, foto, habilitar o deshabilitar, y **Asignar Rol Administrativo** (solo dueños) |
| **Eliminar Acceso** | Borra la cuenta y su invitación. La persona ya no puede entrar, ni volviendo a usar el enlace. |

Para quitar el acceso temporalmente, **deshabilita** la cuenta en *Editar Perfil* en lugar de eliminarla.

### Cuando alguien olvida su contraseña

No hay recuperación por correo. Opciones:

- Que entre con **Google** usando el mismo correo (la cuenta se vincula sola).
- Asignarle una contraseña nueva desde el servidor: `Crear contraseña admin.command` en el Mac donde corre el sistema, escribiendo su correo, o `docker compose exec app node scripts/set-password.mjs correo@dominio.com`. La contraseña generada se muestra una sola vez; compártela de forma privada y pide que la cambie en *Mi cuenta*.

---

## 4. Inventario de productos

Menú **Administración → Inventario** (*Gestión de Inventario*).

Arriba verás la **Inversión Total** (stock × costo) y la **Venta Proyectada** (stock × precio de venta). La tabla tiene buscador por nombre, código, animal o categoría. Los productos con stock igual o menor al umbral se marcan como **Crítico**.

### Crear un producto

1. Pulsa **Nuevo Producto**.
2. Completa:
   - **Código de Referencia** (ej. MA‑001) y **Nombre**.
   - **Categoría**, **Animal Relacionado** y **Proveedor**.
   - **Imagen**: sube un archivo (máx. 1 MB) o pega una URL. Es la que ven los clientes en el portal.
   - **¿Es un producto importado?**: origen y costo aduanero.
   - **Unidad de Gestión**: kilos, libras, bultos o unidades. El stock se lleva en esta unidad.
   - **Stock Actual**: lo que hay hoy en bodega. Queda registrado como movimiento *Inventario inicial*.
   - **Costo Unit.**, **Flete Unit.** y **% Ganancia**: el **precio de venta se calcula solo** = (costo + flete) × (1 + % ganancia). Por defecto la ganancia es 20 %.
   - **Descripción / Notas**: aparece en la ficha pública.
3. Guarda.

### Editar un producto y su stock

Pulsa ✏️ **Editar**. Si cambias el **Stock Actual**, el sistema no reemplaza el número: aplica **solo la diferencia** sobre el stock real de ese momento y la registra como *Ajuste manual*. Así no se pierden ventas hechas mientras tenías el formulario abierto.

> Para corregir el stock después de un conteo, es mejor usar **Verificación Inv.** y aplicar el ajuste: queda el registro del conteo, quién lo hizo y la diferencia.

### Otras acciones

- 👁 **Ver detalles**: análisis financiero (inversión en bodega, venta estimada, utilidad), origen e importación, ficha técnica.
- **Imprimir Listado**: lista de precios agrupada por animal, lista para imprimir o guardar como PDF (permite ventanas emergentes).
- 🗑 **Eliminar**: borra el producto. Su historial de movimientos se conserva sin el vínculo al producto. Úsalo solo para productos creados por error.

---

## 5. Catálogos

| Menú | Qué define | Dónde se usa |
|---|---|---|
| **Categorías** | Familias de producto (Concentrados, Herramientas…) | Productos, filtros del portal, reportes |
| **Animales** | Tipos de animal (Gallinas, Cerdos, Ganado…) | Productos, filtros del portal, lista de precios impresa |
| **Categorías Gastos** | Nómina, Servicios, Arriendo… | Gastos |
| **Estados O.C.** | Etapas de las órdenes de compra, con nombre, color, orden y descripción | Órdenes de compra y Seguimiento O.C. |

### Estados de órdenes de compra

El *Seguimiento O.C.* reconoce estos nombres para mostrar sus botones de acción: **Pendiente**, **Aprobada/Aprobado**, **Solicitado/Solicitada**, **Recibido/Recibida**. Además usa **Finalizado** y **Cancelado**. Configuración recomendada:

| Orden | Estado | Significado |
|---|---|---|
| 1 | Pendiente | Creada, falta aprobación |
| 2 | Aprobada | Aprobada por administración |
| 3 | Solicitado | Pedida al proveedor (se le envía correo) |
| 4 | Recibido | Mercancía en bodega (**suma al stock**) |
| 5 | Finalizado | Cerrada |
| 6 | Cancelado | Anulada |

El primer estado de la lista es el que reciben las órdenes nuevas. "Aprobar Seleccionadas" mueve las órdenes al estado siguiente en el orden configurado.

---

## 6. Proveedores y clientes

### Proveedores

**Administración → Proveedores**: nombre de la empresa (obligatorio), NIT o documento, contacto, teléfono, **correo** y dirección. El correo es necesario para que el proveedor reciba las órdenes al marcarlas como *Solicitado*.

### Clientes

**Administración → Clientes** (*Directorio de Clientes*): nombre y teléfono obligatorios, identificación, correo y dirección o finca.

Los clientes también se crean solos al registrar ventas, encargos, cotizaciones, créditos, fletes y pedidos web. El sistema evita duplicados: si el teléfono (solo dígitos) o el correo ya existen, usa el mismo cliente. Los pedidos del portal web nunca sobrescriben los datos de un cliente existente; solo completan lo que falte.

Borrar un cliente no borra sus ventas ni encargos: cada documento guarda una copia de los datos del cliente.

---

## 7. Flota de camiones

**Administración → Flota Camiones** (*Gestión de Flota*):

1. **Placa** (se guarda en mayúsculas), marca, modelo, **capacidad en toneladas**, tipo de combustible y rendimiento (km por galón, que se usa para proyectar el combustible de cada viaje).
2. **Estado**: Disponible, En Servicio o En Mantenimiento.

Solo los administradores crean o editan camiones. Los operarios los asignan a los servicios en *Logística*.

> Las solicitudes de transporte de la web se asignan provisionalmente al primer camión (por placa). Revísalas en *Logística* y asigna el camión real.

---

## 8. Configuración

**Administración → Configuración** (*Configuración del Sistema*).

| Sección | Qué contiene |
|---|---|
| **Información de la Empresa** | Nombre comercial, NIT, dirección, teléfono, correo, representante legal y cargo. Salen en cotizaciones y en el portal. Guarda con **Actualizar Datos de Empresa**. |
| **Identidad Visual y Firmas** | Logo, ícono principal y **firma digital del representante** (mejor con fondo transparente). Se usan en cotizaciones y documentos. Guarda con **Guardar Cambios Visuales**. |
| **Documentos y Plantillas** | Sube la **preforma de contrato en PDF** (máx. 2 MB). Desde aquí puedes descargarla, reemplazarla, eliminarla o **enviarla por correo** a un cliente. |
| **Parámetros de Alerta** | **Umbral de Stock Mínimo**: los productos con stock igual o menor se marcan en rojo en Inventario y Tablero. |
| **Parámetros Financieros** | **Capital Inicial** aportado para operar. Se usa en la *Utilidad Neta* del Tablero. |
| **Unidades de Medida y Factores de Conversión** | Equivalencias entre unidades. **Cargar iniciales** o **Restaurar Estándares** cargan los factores base; puedes editarlos. Si un producto se vende en una unidad distinta a la suya, se usa el factor configurado (si no hay, 1 bulto = 40 kg y 1 lb = 0,4536 kg). |

> Cambiar un factor de conversión afecta las ventas futuras, no las ya registradas. Verifica el factor antes de cambiarlo.

---

## 9. Reportes

**Administración → Reportes** (*Reportes Ejecutivos*). Elige el periodo: **Histórico Completo**, **Últimos 30 días** o **Últimos 7 días**.

| Indicador o gráfica | Qué muestra |
|---|---|
| Utilidad Neta del periodo | Capital inicial + ventas del periodo − costo de lo vendido − gastos del periodo (incluye el capital inicial, igual que el Tablero) |
| Bultos Comprados / Bultos Vendidos | Volumen convertido a bultos |
| Inversión en Bodega por Categoría | Dónde está el capital del inventario |
| Ingresos vs Utilidades por Categoría | Margen real por línea de producto |
| Ventas y beneficios históricos | Evolución de ingresos y ganancia |
| Abastecimiento diario | Compras convertidas a bultos |
| Compras vs Ventas mensuales | Comparativo mes a mes |
| Ingresos y rentabilidad por ítem | Productos que más venden y más ganan |
| Top Clientes por Volumen | Mejores clientes |
| Flujo de Caja Consolidado | Ingresos frente a gastos operativos, por día |

Los reportes se calculan con las ventas registradas en *Ventas Rápidas* y los gastos. Los encargos, créditos y cotizaciones no entran como venta hasta que se registra la venta.

---

## 10. Tareas que solo puede hacer un administrador

En la interfaz, estos botones solo aparecen a administradores:

- Eliminar ventas, encargos, créditos, abonos de crédito y órdenes de compra.
- **Aprobar** órdenes de compra y cambiar su estado desde el formulario.
- **Aplicar ajuste** de una verificación de inventario y borrar verificaciones.
- Toda la sección *Administración*: usuarios, inventario, clientes, proveedores, catálogos, flota, configuración y reportes.

Solo los **dueños** pueden cambiar roles y eliminar a otros administradores.

---

## 11. Rutinas recomendadas

| Cuándo | Qué hacer |
|---|---|
| **Diario** | Revisar *Inventario Crítico* en el Tablero; revisar encargos y solicitudes de transporte nuevos de la web; recibir en *Seguimiento O.C.* la mercancía que llegó |
| **Semanal** | Conteo físico de los productos de mayor rotación y aplicar los ajustes; revisar saldos pendientes de encargos, créditos y fletes |
| **Mensual** | Revisar *Reportes* del mes; revisar la lista de usuarios y deshabilitar a quien ya no trabaje; confirmar que los respaldos de la base de datos se están haciendo |
| **Tras la migración** | Contar físicamente el inventario y aplicar ajustes. En la importación de octubre de 2026, 54 de 61 productos no cuadraban con su historial. Revisar en especial Mogolla (en −1), Quidacat 600 g, Maíz Importado y Ringo. |

---

## 12. Problemas comunes

| Situación | Qué hacer |
|---|---|
| Alguien no recibe la invitación | Revisa spam. Si no llega, reenvía la invitación o copia el enlace que muestra el sistema cuando el correo no está configurado. |
| "Enlace Inválido o Expirado" | Pasaron más de 24 horas. Reenvía la invitación. |
| Alguien entró con Google y ve "Acceso Restringido" | No tenía invitación. Usa **Aprobar Manual**. |
| Un proveedor no recibió la orden | Revisa que tenga correo en *Proveedores*. El sistema avisa cuántos proveedores no pudieron ser notificados. |
| Un producto tiene stock negativo | Se vendió más de lo registrado. Haz un conteo y aplica el ajuste; revisa si faltó recibir una orden de compra. |
| La cotización sale sin logo o firma | Súbelos en *Configuración → Identidad Visual y Firmas*. |
| No llegan correos en general | La configuración de Gmail del servidor falta o cambió. Ver la [guía técnica de instalación](../tecnica/06-instalacion-y-operacion.md#configurar-gmail). |

---
Desarrollado por Coldesoft · [coldesoft.com](https://coldesoft.com)
