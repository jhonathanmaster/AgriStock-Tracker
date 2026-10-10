# GeiaTienda Tracker - Gestión de Inventario Agrícola

Sistema profesional para el seguimiento de productos, insumos y animales en granjas.

## Configuración de Correos (IMPORTANTE)
Para que el envío de correos funcione (Invitaciones y Órdenes de Compra), debes configurar las siguientes Variables de Entorno en el servidor:

1.  **GMAIL_USER**: Tu dirección de correo de Gmail.
2.  **GMAIL_APP_PASSWORD**: Contraseña de aplicación de 16 caracteres generada en tu cuenta de Google (Seguridad -> Contraseñas de aplicaciones).

## Repositorio Oficial
[https://github.com/jhonathanmaster/AgriStock-Tracker.git](https://github.com/jhonathanmaster/AgriStock-Tracker.git)

## Características Principales
- **Gestión de Stock**: Control de existencias por kilos, bultos y unidades.
- **Ventas Rápidas**: Registro ágil de transacciones con asociación opcional de clientes.
- **Órdenes de Compra**: Seguimiento de pedidos a proveedores con flujo de estados.
- **Administración**: Panel para gestionar usuarios (operarios), animales y categorías.
- **Seguridad**: Autenticación protegida con Google Firebase.

## Instalación
```bash
npm install
```

## Desarrollo
```bash
npm run dev
```

Desarrollado para GeiaTienda.
