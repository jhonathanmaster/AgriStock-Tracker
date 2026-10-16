# Manual del operario

Guía para el personal de GeiaTienda que usa el sistema todos los días: ventas, encargos, cotizaciones, créditos, logística, gastos, compras y verificación de inventario.

> Desarrollado por Coldesoft · [coldesoft.com](https://coldesoft.com)

## Contenido

1. [Entrar al sistema](#1-entrar-al-sistema)
2. [La pantalla principal](#2-la-pantalla-principal)
3. [Ventas Rápidas](#3-ventas-rápidas)
4. [Encargos](#4-encargos)
5. [Cotizaciones](#5-cotizaciones)
6. [Créditos](#6-créditos)
7. [Logística: servicios de transporte](#7-logística-servicios-de-transporte)
8. [Verificación de inventario](#8-verificación-de-inventario)
9. [Gastos](#9-gastos)
10. [Órdenes de compra y seguimiento](#10-órdenes-de-compra-y-seguimiento)
11. [Movimientos](#11-movimientos)
12. [Mi cuenta](#12-mi-cuenta)
13. [Preguntas frecuentes](#13-preguntas-frecuentes)

---

## 1. Entrar al sistema

### La primera vez (invitación)

1. Un administrador te envía una invitación a tu correo. **El enlace vence en 24 horas.**
2. Abre el enlace. Verás la pantalla *Activación de Cuenta* con tu correo.
3. Elige una opción:
   - **Entrar con Google**, si tu correo es de Gmail o Google Workspace.
   - **Crear una contraseña** de al menos 8 caracteres, con el mismo correo de la invitación.
4. Verás *¡Bienvenido al equipo!* y el sistema te llevará al Tablero.

Si el enlace dice *Enlace Inválido o Expirado*, pide al administrador que te reenvíe la invitación.

### Las siguientes veces

1. Abre la página de acceso (`/login`), o en el portal pulsa **Acceder**.
2. Entra con Google o con tu correo y contraseña.

Si escribes mal la contraseña 8 veces seguidas, el acceso se bloquea 15 minutos. Si la olvidaste, pide al administrador que te asigne una nueva.

### "Acceso Restringido"

Si ves *Tu cuenta aún no ha sido habilitada*, entraste sin invitación. Pide al administrador que apruebe tu cuenta y vuelve a entrar.

---

## 2. La pantalla principal

A la izquierda está el **menú**. En el celular se abre con el botón redondo verde de la esquina inferior derecha.

| Menú | Para qué |
|---|---|
| Portal Web | Ver la tienda pública tal como la ven los clientes |
| Tablero | Resumen del negocio |
| Ventas Rápidas | Registrar ventas de mostrador |
| Cotizaciones | Propuestas comerciales y simulador de importación |
| Créditos | Ventas a plazos y sus abonos |
| Encargos | Pedidos para entregar después, incluidos los que llegan por la web |
| Logística | Fletes y servicios de transporte |
| Verificación Inv. | Conteos físicos de bodega |
| Gastos | Egresos de la empresa |
| Órdenes Compra | Pedidos a proveedores |
| Seguimiento O.C. | Avanzar las órdenes por estado y recibir mercancía |
| Movimientos | Historial de entradas, salidas y ventas |

Los administradores ven además la sección **Administración** (ver el [Manual del administrador](manual-administrador.md)).

### Tablero

Muestra el estado del negocio en tarjetas:

- **Productos Activos**, **Stock Total**, **Alerta Stock** (productos en nivel crítico) y **Ventas Hoy**.
- **Costo Mercancía**, **Capital Inicial**, **Ingresos Globales** (todas las ventas), **Egresos Totales** (gastos) y **Utilidad Neta** = capital inicial + ventas − costo de lo vendido − gastos.
- **Inventario Crítico**: productos con stock igual o menor al umbral que definió el administrador.

> Los datos se actualizan solos. Lo que registran tus compañeros aparece en tu pantalla en unos 10 segundos, sin recargar.

---

## 3. Ventas Rápidas

Para registrar una venta de mostrador. **Es la única pantalla que descuenta la venta del inventario.**

### Registrar una venta

1. En el formulario **Venta Rápida**, revisa la **Fecha de Transacción** (por defecto, ahora).
2. En **Producto/Ítem**, elige el producto. Verás el **Stock disponible**.
3. Escribe la **Cantidad** y elige la **Unidad de Venta** (unidades, libras, kilos o bultos). El sistema convierte a la unidad del producto (1 bulto = 40 kg).
4. Revisa el **Total Venta**. Se calcula con el precio de venta; puedes cambiarlo si diste un descuento o precio especial.
5. Opcional: en **Asociar Cliente a la Venta**, busca un cliente por nombre o identificación, o escribe los datos de uno nuevo. Si el teléfono o el correo ya existen, se usa ese mismo cliente.
6. Pulsa **Registrar Venta**. Verás *Venta Registrada*.

El stock baja en ese momento y la venta queda en *Movimientos*.

### Historial de ventas

Debajo está el **Historial de Ventas** con filtros por producto y fechas (**Desde** / **Hasta**). Arriba ves el total de **Ventas de Hoy**.

En cada venta:

- 👁 **Ver**: detalle con datos del cliente.
- ✏️ **Editar**: corrige fecha, cantidad, unidad, valores o cliente. El stock se recalcula solo: si bajas la cantidad, la diferencia vuelve al inventario.
- 🗑 **Eliminar** (solo administradores): borra la venta y **devuelve** la cantidad al stock.

---

## 4. Encargos

Pedidos que el cliente hace para recoger o recibir después. También llegan aquí los **pedidos hechos desde la página web**, con la nota *"Pedido realizado desde el portal web público"*.

### Crear un encargo

1. Pulsa **Nuevo Encargo**.
2. **Datos del Cliente**: búscalo por nombre o teléfono, o escribe nombre y teléfono (obligatorios), correo, identificación y dirección o finca.
3. **Fecha Pedido** y **Fecha Entrega** (obligatoria).
4. **Agregar Productos**: elige producto, cantidad, unidad y precio, y agrega tantos como necesites.
5. **Gestión de Abonos**: registra los pagos que deja el cliente (monto, efectivo o transferencia, nota). Verás el subtotal, lo abonado y el saldo pendiente.
6. **Estado del Encargo**: Pendiente, Pagado, Entregado o Cancelado.
7. Pulsa **Guardar Encargo**.

### Seguimiento

La lista muestra fecha de entrega, cliente, productos, valor total y **saldo pendiente**, con filtros por estado. Abajo verás **Venta Total Encargos**, **Total Abonado** y **Por Recaudar**.

Abre el detalle para ver el **Recibo de Encargo** con productos e historial de abonos.

> **Importante:** un encargo **no** descuenta inventario. Cuando entregues la mercancía, registra la venta en *Ventas Rápidas* y marca el encargo como **Entregado**.

---

## 5. Cotizaciones

Propuestas comerciales con precios para un cliente, que se pueden imprimir o enviar por correo.

### Crear una cotización

1. Pulsa **Nueva Cotización**.
2. Busca un cliente registrado o escribe **Nombre Completo** y **Teléfono** (obligatorios), correo y dirección. El correo es necesario para enviarla.
3. En **Ítems de la Propuesta** agrega productos:
   - **Producto de Inventario**: elige uno existente; se carga su precio.
   - **Manual**: escribe un producto que no está en inventario, con sus especificaciones e imagen (máx. 800 KB).
   - Agrega especificaciones técnicas a cada ítem si hace falta.
4. **Fecha Emisión** (obligatoria) y **Entrega Est.**
5. **¿Propuesta Aprobada?**: déjala en *No, Pendiente* hasta que el cliente acepte.
6. **Observaciones / Validez** (por ejemplo, "Precios válidos por 8 días. Incluye transporte").
7. Guarda.

La cotización impresa dice que tiene **validez de 8 días calendario** e incluye los datos, logo y firma de la empresa que configuró el administrador.

### Acciones de cada cotización

| Botón | Qué hace |
|---|---|
| ✉️ Enviar por Correo | Envía la propuesta al correo del cliente, con copia a administración |
| 🖨 Imprimir | Abre la versión para imprimir o guardar como PDF (permite ventanas emergentes en el navegador) |
| 🚚 Seguimiento de Importación | Registra el avance de un producto importado (estado, fecha, notas) |
| 💲 Abonos / Recaudos | Registra pagos del cliente y envía el recibo por correo |
| 👁 Detalles / ✏️ Editar | Ver o modificar |

Abajo verás **Total Propuestas Aprobadas**, **Total Abonos Recibidos** y **Saldo Total Pendiente**.

### Calculadora (simulador de importación)

El botón **Calculadora** abre el *Simulador de Costos de Importación*, para cotizar productos comprados en dólares:

1. Escribe el producto, cantidad, precio en USD y la **TRM** del día.
2. Ajusta los porcentajes de **Legalización** (mínimo 10 %), **Nacionalización** (mínimo 7 %), transporte y **% de ganancia**.
3. Pulsa **Agregar a la simulación**. Puedes agregar varios ítems.
4. Opcional: **Enviar Resultados por Correo** a un destinatario.

> Las cotizaciones no descuentan inventario.

---

## 6. Créditos

Ventas a plazos con su plan de pagos.

### Crear un crédito

1. Pulsa **Nuevo Crédito**.
2. Busca o escribe el cliente (nombre y teléfono obligatorios).
3. **Agregar Productos** con cantidad, unidad y precio.
4. **Plazos y Estado**: **Fecha Acuerdo**, **Fin Esperado**, **Número de Cuotas** y estado (Activo, Pagado, Cancelado).
5. **Condiciones Especiales**: fechas de pago y compromisos.
6. Guarda. Verás el **VALOR TOTAL ACUERDO**.

### Registrar abonos

1. En el crédito, pulsa **Abonos / Recaudos**.
2. Verás **Valor Total**, **Abonado a la Fecha**, **Saldo Restante** y la barra de **Progreso de Pago**.
3. En **Registrar Nuevo Abono** escribe fecha, valor y una nota (por ejemplo, "Pago cuota 1"). Pulsa **Guardar Abono**.
4. Cuando el saldo llegue a cero, edita el crédito y márcalo como **Pagado**.

El **Historial de Pagos** muestra todos los abonos. Solo un administrador puede borrar un abono o un crédito (al borrar un crédito se borran sus abonos).

> Los créditos no descuentan inventario. Si la mercancía sale ese día, regístrala también en *Ventas Rápidas*.

---

## 7. Logística: servicios de transporte

Fletes con los camiones de la empresa. También llegan aquí las **solicitudes de transporte de la página web**, como servicios *Pendiente* con conductor "Por asignar", valor 0 y la nota *"SOLICITUD WEB: …"*. Complétalas con el precio, camión y conductor.

### Servicio rápido

Para anotar un flete al momento: **Servicio Rápido** → cliente, teléfono, origen, destino, camión y **valor total del flete** → **Guardar Rápido**. Completa los detalles después con **Editar**.

### Servicio completo

**Nuevo Servicio** abre el formulario completo:

1. **Datos del Cliente** (buscador o datos nuevos).
2. **Ruta del Servicio**: origen, destino, distancia y **tiempo estimado**. Verás una **proyección de combustible** según el rendimiento del camión.
3. **Asignación de Camión** y **Datos del Conductor** (nombre, cédula, teléfono).
4. **Gastos de Viaje**: gasolina, peajes, pago al conductor, mantenimiento, otros. Verás el **TOTAL GASTOS**.
5. **Precio de Venta**: valor total del flete, **Fecha Viaje** y **Estado Viaje** (Pendiente, En Ruta, Finalizado, Cancelado). El formulario muestra la **Utilidad Estimada** (flete − gastos).
6. Notas de la carga y guarda.

### Abonos del flete

1. Pulsa **Asociar Pagos / Abonos** en el servicio.
2. Verás **Flete Acordado** y **Saldo por Cobrar**.
3. En **Registrar Nuevo Avance**: fecha, monto y **medio** (Transferencia bancaria, Bancolombia, Nequi, Cheque…). Pulsa **Vincular Pago al Servicio**.

El estado de pago se actualiza solo: **Sin Pago**, **Abono Parcial** o **Pagado Total**.

En **Ver Detalles** encuentras el análisis de la ruta, el enlace **Ver Ruta en Google Maps**, el balance financiero y los gastos del viaje.

---

## 8. Verificación de inventario

Para comparar lo que hay físicamente en bodega con lo que dice el sistema.

### Registrar un conteo

1. Cuenta físicamente el producto (bultos, kilos o unidades).
2. En **Nuevo Registro de Conteo**, elige el **Producto a Verificar**. Verás la cantidad **En Sistema** y su unidad.
3. Escribe la **Cantidad Física Encontrada**. El sistema muestra la **Diferencia Detectada**.
4. Agrega observaciones (por ejemplo, "Bolsa rota, error de conteo anterior").
5. Pulsa **Registrar Verificación**.

**Registrar un conteo no cambia el stock.** Queda en el **Historial de Verificaciones** para que un administrador lo revise.

### Aplicar el ajuste (administradores)

En el historial, el botón verde **Aplicar Ajuste a Inventario** deja el stock igual a lo contado y registra la diferencia como movimiento. Solo se puede aplicar una vez por conteo; después muestra *Ajuste Aplicado*.

> Haz conteos periódicos de los productos que más se venden. Así detectas mermas, robos o errores de pesaje a tiempo.

---

## 9. Gastos

Egresos de la empresa: nómina, servicios, arriendo, combustible, etc. Cada gasto resta de la *Utilidad Neta* del Tablero.

### Registrar un gasto

1. Pulsa **Nuevo Gasto**.
2. Completa:
   - **Fecha del Gasto**.
   - **Clasificación / Categoría** (las crea el administrador).
   - **Descripción** (por ejemplo, "Pago de energía mes de octubre").
   - **Proveedor** (obligatorio).
   - **Cantidad**, **Valor Unitario** e **IVA (%)**.
3. El sistema calcula **Sub-Total**, **Valor IVA** y **TOTAL NETO**.
4. Agrega notas (número de factura, etc.) y guarda.

Usa el buscador para encontrar gastos por descripción o categoría. Puedes editarlos o eliminarlos desde la tabla.

---

## 10. Órdenes de compra y seguimiento

### Crear una orden de compra

1. En **Órdenes Compra**, pulsa **Nueva Orden**.
2. Elige **Producto**, **Proveedor**, **Cantidad** y **Unidad**.
3. Indica precio unitario, transporte y costo total, y la **Fecha Entrega Est.**
4. El **Estado de la Orden** inicial es el primero de la lista de estados (por ejemplo, *Pendiente*). Solo un administrador puede cambiarlo en este formulario.
5. Guarda.

La lista tiene filtros por texto y fechas y muestra el **Valor Total Ordenado**.

### Seguimiento O.C.

Muestra una pestaña por cada estado que definió el administrador (por ejemplo Pendiente → Aprobada → Solicitado → Recibido → Finalizado). Selecciona órdenes con las casillas y usa los botones:

| Pestaña | Botón | Qué pasa |
|---|---|---|
| Pendiente | **Aprobar Seleccionadas** (administradores) | Pasan al siguiente estado |
| Aprobada | **Solicitar Seleccionadas** | Pasan a "Solicitado" y se envía un correo a cada proveedor con sus productos |
| Solicitado | **Recibir Seleccionadas** | Pasan a "Recibido": **la cantidad entra al inventario** y llega un resumen a administración |
| Recibido | **Finalizar Seleccionadas** | Se cierran |
| Pendiente, Aprobada, Solicitado | **Cancelar Seleccionados** | Pasan a "Cancelado" |

Cada pestaña muestra el **TOTAL ACUMULADO DEL ESTADO**.

> Recibir una orden suma su cantidad al stock **una sola vez**, aunque se marque como recibida de nuevo o dos personas lo hagan a la vez. Recibe la mercancía en el sistema el mismo día que llega a bodega.

---

## 11. Movimientos

El **Historial de Movimientos** muestra cada entrada, salida y venta: fecha, producto, tipo, cantidad, unidad original, operario y notas. Es de consulta.

Notas que verás:

| Nota | Origen |
|---|---|
| *Inventario inicial (creación del producto)* | Stock con el que se creó un producto |
| *Ajuste manual desde inventario (X → Y)* | Un administrador cambió el stock en el formulario del producto |
| *Recepción O.C. #…* | Se recibió una orden de compra |
| *Ajuste auditoría #…* | Se aplicó una verificación de inventario |

Si el stock de un producto no te cuadra, revisa aquí sus movimientos.

---

## 12. Mi cuenta

En la parte inferior del menú aparecen tu nombre y tu correo:

- Pulsa tu nombre para abrir **Mi cuenta**, donde creas o cambias tu contraseña (contraseña actual, nueva y repetirla). Al cambiarla se cierra tu sesión en los demás dispositivos.
- Pulsa **Cerrar Sesión** para salir. Volverás al portal web.

---

## 13. Preguntas frecuentes

**Vendí algo por error, ¿cómo lo corrijo?**
En *Ventas Rápidas*, edita la venta y corrige la cantidad. Si hay que anularla completa, pide a un administrador que la elimine; el stock se devuelve solo.

**Registré un encargo, ¿por qué no bajó el inventario?**
Los encargos, cotizaciones y créditos no mueven inventario. Al entregar, registra la venta en *Ventas Rápidas*.

**El stock no coincide con lo que hay en bodega.**
Haz un conteo en *Verificación Inv.* y pide al administrador que aplique el ajuste.

**No veo un cambio que hizo un compañero.**
Espera unos 10 segundos o cambia de pestaña y vuelve. Si sigue sin aparecer, recarga la página.

**Aparece "Demasiados intentos fallidos".**
Espera 15 minutos. Si no recuerdas la contraseña, pide una nueva al administrador.

**No se pudo enviar un correo (cotización, recibo).**
Revisa que el cliente tenga correo registrado. Si el problema sigue, avisa al administrador: puede faltar la configuración de correo del servidor.

---
Desarrollado por Coldesoft · [coldesoft.com](https://coldesoft.com)
