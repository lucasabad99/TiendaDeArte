# Tienda de Arte — Arquitectura y plan

## 1. Vista general

```
  CLIENTE (navegador)
        │
        ▼
 ┌─────────────────────┐      HTTPS / JSON      ┌──────────────────────────┐
 │  FRONTEND (React)   │ ─────────────────────► │  BACKEND (Node+Express)  │
 │  Hostinger / Vercel │ ◄───────────────────── │  Render / Railway / VPS  │
 └─────────────────────┘                        └─────────┬────────────────┘
                                                          │ mongoose
                                     ┌────────────────────┼─────────────────┐
                                     ▼                    ▼                 ▼
                              ┌─────────────┐     ┌──────────────┐   ┌─────────────┐
                              │ MongoDB     │     │ Mercado Pago │   │ Email       │
                              │ Atlas       │     │ (pagos)      │   │ (contacto)  │
                              └─────────────┘     └──────────────┘   └─────────────┘
```

## 2. Frontend (lo que ya está hecho)

```
App
 └─ CartProvider  (estado global: obras + carrito + stock)
     ├─ Navbar ............ logo, links, botón carrito con contador
     ├─ Hero .............. portada
     ├─ Galeria ........... filtros por técnica
     │    └─ ObraCard × N . imagen, precio, etiqueta de stock, "Agregar"
     ├─ SobreMi ........... bio de la artista
     ├─ Contacto .......... formulario con validación
     ├─ Footer
     └─ CarritoDrawer ..... panel lateral: + / − / quitar / total / comprar

services/  ← ÚNICO lugar que cambia al conectar el back (en frontend/src/)
   obrasService.js     getObras(), confirmarCompra()
   contactoService.js  enviarConsulta()  → POST /api/v1/contacto ✓
```

## 3. Flujo del carrito y stock

```
 [Agregar] ──► ¿cantidad en carrito + 1 <= stock? ──NO──► botón "Ver en el carrito"
                         │ SÍ
                         ▼
                 se suma al carrito (se guarda en localStorage)
                         │
 [Finalizar compra] ──► servicio revalida stock ──NO──► "Sin stock suficiente"
                         │ SÍ
                         ▼
                 descuenta stock ─► vacía carrito ─► muestra Nº de orden
                         │
                 (después) ─► redirige a Mercado Pago
```

Regla: disponible = stock − cantidad en el carrito.
Hoy el stock vive en el front (simulado). En producción **el servidor es la
fuente de verdad**: el front solo muestra y el back valida al comprar.

## 4. Backend (reutilizando lo que ya existe)

```
Backend I  (backend-lubad/proyecto-final)      Backend II (Backend-II/auth-hibrido)
  GET    /products  ← catálogo (pasar a /api)    POST /api/v1/auth/register
  GET    /products/:pid                          POST /api/v1/auth/login
  POST   /api/carts                              POST /api/v1/auth/logout
  PUT    /api/carts/:cid/products/:pid           GET  /api/v1/auth/github
  DELETE /api/carts/:cid/products/:pid           GET  /api/v1/admin  (JWT + admin)
                                                 → para el panel admin de ella
  A CREAR:
  POST   /api/carts/:cid/purchase  (valida y descuenta stock, crea orden)
  POST   /api/payments/preference  (Mercado Pago)
  POST   /api/payments/webhook     (MP avisa el pago aprobado)
  POST   /api/v1/contacto          (envía mail) ✓ HECHO en /backend
```

Plan: unir ambos en UN solo backend (productos + carritos + auth admin).

## 5. Base de datos (MongoDB Atlas)

```
products                 carts                      orders (nueva)
─────────                ─────                      ──────
_id                      _id                        _id, code
title                    products: [                items: [{product, qty, price}]
description                { product → products,    total
price                        quantity }             buyer: {nombre, email, tel}
category                 ]                          status: pendiente|pagada|enviada
stock                                               mpPaymentId
thumbnails[]                                        createdAt
status                   users (Backend II)
                         email, password, role: admin|user
```

## 5b. Roles y permisos

Separación clave: **la plataforma** (vos, que la vendés) y **la tienda** (quien
la compra). El superadmin nunca se crea ni se asigna desde la página.

```
 PLATAFORMA (fuera de la UI pública)
 ┌──────────────────────────────────────────────────────────────┐
 │ superadmin  (vos)                                            │
 │  · se crea SOLO por script/seed o variable de entorno        │
 │  · ruta aparte: /api/v1/platform/*  (+ panel /platform)      │
 │  · alta/baja de dueños, soporte, config técnica, logs        │
 │  · ningún rol de la tienda puede otorgar ni quitar este rol  │
 └───────────────────────────┬──────────────────────────────────┘
                             │ crea la cuenta del dueño
                             ▼
 TIENDA (panel /admin)
 ┌──────────────────────────────────────────────────────────────┐
 │ owner  (la artista / quien compra la página)                 │
 │  · todo lo de la tienda + invitar y asignar roles de abajo   │
 │      │ asigna                                                │
 │      ├──► manager   obras, stock, precios, pedidos, envíos   │
 │      └──► editor    cargar/editar obras y textos (sin $)     │
 └──────────────────────────────────────────────────────────────┘
 PÚBLICO
   customer  → comprar, ver "mis pedidos"     (registro abierto)
   invitado  → mirar y comprar sin cuenta
```

Permisos por acción (el back chequea el **permiso**, no el nombre del rol):

```
 permiso             superadmin  owner  manager  editor  customer
 ─────────────────── ─────────── ────── ──────── ─────── ────────
 products:write          ✓         ✓       ✓        ✓
 products:price          ✓         ✓       ✓
 orders:read/update      ✓         ✓       ✓
 users:assignRole        ✓         ✓¹
 settings:store          ✓         ✓
 platform:*              ✓
 orders:own                                                 ✓
 ¹ solo puede asignar manager/editor, nunca owner ni superadmin
```

```
 request ─► authJwt ─► can('products:write') ─► controller
                         │ busca el rol del token en la tabla de permisos
                         └─ NO ─► 403
```

Cambios sobre Backend II:
- `role` pasa a `enum: ['superadmin','owner','manager','editor','customer']`.
- **Quitar** `role` del body en `POST /auth/register` (hoy cualquiera se
  registra como admin mandando `"role":"admin"`).
- `authRole('admin')` → `can('permiso')` con un mapa `permisos.js`.
- `PATCH /api/v1/users/:id/role` (owner/superadmin) con la regla ¹.
- Seed `npm run seed:superadmin` que lee `SUPERADMIN_EMAIL` del `.env`.

## 6. Despliegue

```
Hostinger (plan web) ──► sirve /dist del front (archivos estáticos)
Render/Railway ───────► corre el backend Node (Hostinger compartido no corre Node;
                         sí un VPS de Hostinger)
MongoDB Atlas ────────► base de datos (plan gratis M0 alcanza para arrancar)
Dominio ──────────────► Hostinger, apuntando front y api.dominio.com
```

## 7. Hoja de ruta

1. [x] Front: landing, cards ficticias, formulario, carrito con stock
2. [ ] Recibir info real (obras, fotos, textos, marca)
3. [~] Backend unificado (base + contacto listos en /backend) + MongoDB Atlas + endpoint de compra
4. [ ] Conectar front ↔ back (solo `services/`)
5. [ ] Roles (superadmin aparte + owner/manager/editor/customer) y panel admin
6. [ ] Mercado Pago (Checkout Pro) + webhook
7. [ ] Deploy + dominio + HTTPS
