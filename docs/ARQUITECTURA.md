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
                 se suma al carrito (localStorage del navegador)
                         │
 [Finalizar compra] ──► formulario: nombre, email, teléfono, nota
                         │
 [Confirmar pedido] ──► POST /orders { items: [{productId, cantidad}], comprador }
                         │  servidor: precios y títulos desde la BASE (no del front)
                         │  descuento atómico: stock >= cantidad  y  stock -= cantidad
                         │  en una sola operación (dos compras de la última pieza:
                         │  gana una sola). Si una obra falla, se devuelve todo.
                 ┌───────┴────────┐
              409 sin stock     201 creada (status: pendiente = stock reservado)
                 │                 │
       recarga obras y          vacía carrito, recarga obras,
       recorta el carrito       muestra Nº de pedido, mail a tienda y comprador
                                   │
                         (después) ─► Mercado Pago ─► webhook ─► status: pagada
```

Cancelar una orden (panel) devuelve el stock, una sola vez aunque se cancele
dos veces a la vez.

## 4. Backend (/backend — unifica Backend I y II)

```
 HECHO (base: /api/v1)
  POST   /contacto                 envía mail (nodemailer)            público
  POST   /auth/register            crea SIEMPRE customer              público
  POST   /auth/login               JWT en cookie httpOnly + en body   público
  POST   /auth/logout
  GET    /auth/me                                                    JWT
  GET    /products                 solo publicadas (status: true)     público
  GET    /products/:pid                                              público
  POST   /products                                                   products:write
  PATCH  /products/:pid            precio/stock/status: products:price products:write
  DELETE /products/:pid                                              products:delete
  GET    /users                                                      users:read
  PATCH  /users/:id/role                                             users:assignRole
  POST   /orders                   valida y descuenta stock, crea      público (con sesión
                                   la orden y manda 2 mails            queda asociada)
  GET    /orders/mine              mis pedidos                         JWT
  GET    /orders?status=…                                            orders:read
  PATCH  /orders/:id/status        cancelar devuelve el stock          orders:update

 A CREAR
  POST   /payments/preference      Mercado Pago
  POST   /payments/webhook         MP avisa el pago aprobado
  GET    /products?todas=1         listado con borradores para el panel
  /platform/*                      panel del superadmin
```

## 5. Base de datos (MongoDB: local en desarrollo, Atlas en producción)

```
products  ✓              users  ✓                   orders  ✓
─────────                ─────                      ──────
_id                      name, email                code: ORD-XXXXXX
title                    password (bcrypt)          items: [{product, title, price, cantidad}]
description              role: superadmin|owner|    total   (precios del servidor)
price                      manager|editor|customer  comprador: {nombre, email, telefono, nota}
category                                            user (si compró logueado)
tipo: original|edicion                              status: pendiente|pagada|enviada|
stock                                                       entregada|cancelada
thumbnails[]                                        mpPaymentId
status (false=borrador)                             createdAt
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

Permisos por acción (el back chequea el **permiso**, no el nombre del rol).
Fuente de verdad en código: `backend/src/config/permisos.js`.

```
 permiso             superadmin  owner  manager  editor  customer
 ─────────────────── ─────────── ────── ──────── ─────── ────────
 products:write          ✓         ✓       ✓        ✓²
 products:price          ✓         ✓       ✓
 products:delete         ✓         ✓       ✓
 orders:read/update      ✓         ✓       ✓
 users:read              ✓         ✓
 users:assignRole        ✓¹        ✓¹
 settings:store          ✓         ✓
 platform:*              ✓
 orders:own                                                 ✓
 ¹ superadmin asigna owner/manager/editor/customer; owner solo manager/editor/customer
   y solo a usuarios que tengan uno de esos roles. Nadie otorga superadmin por la API
   ni cambia su propio rol.
 ² el editor crea obras como borrador oculto (sin precio ni stock) y edita textos;
   precio, stock y publicar requieren products:price.
```

```
 request ─► authJwt ─► can('products:write') ─► controller
              │ lee el rol de la BASE (no del token): un cambio de rol
              │ o una baja tienen efecto inmediato
              └─ sin permiso ─► 403
```

Superadmin: `npm run seed` lo crea con `SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD`
del `.env` (y carga obras de ejemplo si la base está vacía).

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
3. [x] Backend unificado: contacto, productos, auth y roles, pedidos con stock real
4. [x] Conectar front ↔ back: contacto, galería, checkout
5. [~] Roles ✓ (API) · falta login en el front y panel admin
6. [ ] Mercado Pago (Checkout Pro) + webhook
7. [ ] Deploy + dominio + HTTPS

## 8. Info real a pedir (al final)

Contenido:
- [ ] Obras: fotos, título, técnica, medidas, año, precio, stock (original o edición)
- [ ] Bio y foto de la artista, textos de portada
- [ ] Marca: nombre, logo, colores
- [ ] Redes (Instagram, etc.) y datos de contacto

Mail de la tienda (formulario de contacto):
```
 La tienda ENVÍA y RECIBE desde su propia cuenta
   SMTP_USER  = mail de la tienda          ┐ login para enviar
   SMTP_PASS  = contraseña de ESA cuenta   ┘ (Gmail: contraseña de aplicación,
                                              Hostinger: la de la casilla)
   MAIL_FROM  = Taller de Arte <mail de la tienda>
   CONTACT_TO = mail de la tienda (o el personal de la artista)
```
- [ ] ¿Gmail propio de la tienda o mail con dominio (Hostinger)?
- [ ] Antes de publicar: borrar la contraseña de aplicación de prueba (cuenta de Lucas)

Pagos y legales:
- [ ] Cuenta de Mercado Pago de la artista
- [ ] Política de envíos y costos, devoluciones, términos
