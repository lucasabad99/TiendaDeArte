# Tienda de Arte

Tienda online de arte con carrito: front en React + Vite, API en Node + Express.
Arquitectura, roles y hoja de ruta: [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md).

```
frontend/   React + Vite  → http://localhost:5173
backend/    Express API   → http://localhost:8080/api/v1
docs/       diagramas y plan
```

## Levantar en local (dos terminales)

```powershell
# 1) Backend
cd backend
npm install
copy .env.example .env      # solo la primera vez (completar MONGO_URI, JWT_SECRET, SUPERADMIN_*)
npm run seed                # solo la primera vez: crea el superadmin y obras de ejemplo
npm run dev

# 2) Frontend
cd frontend
npm install
npm run dev
```

Requiere Node 22.15 o superior y MongoDB (local en `mongodb://127.0.0.1:27017` o Atlas).

## Panel admin

Con las dos terminales corriendo: http://localhost:5173/admin (o "Ingresar" en el pie
de la tienda). El superadmin entra con `SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD`
de `backend/.env`. Quien se registra desde ahí entra como cliente; los roles se dan
en la pestaña Usuarios.

## Pruebas automáticas (con el backend corriendo)

```powershell
cd backend
npm run test:roles     # auth, roles y permisos (34 casos)
npm run test:orders    # compra, stock, compras simultáneas, estados (33 casos)
npm run test:pagos     # lógica de Mercado Pago con pagos simulados (15 casos; no necesita el backend)
```

Crean datos de prueba y los borran al final. `test:orders` manda mails de pedido:
si tenés Gmail configurado, levantá el backend con `SMTP_HOST` vacío para usar Ethereal.

## Formulario de contacto en desarrollo

Sin SMTP en `backend/.env`, los mails van a **Ethereal** (SMTP de prueba, no
llegan a nadie). Al enviar el formulario, la consola del backend muestra un link
`[mail] Ver el mail de prueba: https://ethereal.email/message/...` para verlo.

Para mails reales, completar `SMTP_*` y `CONTACT_TO` en `backend/.env`.

## Mercado Pago en desarrollo

Con `MP_ACCESS_TOKEN` de **prueba** en `backend/.env`, "Confirmar pedido" lleva al checkout
de Mercado Pago. Para pagar hace falta una **cuenta compradora de prueba** (panel de MP →
Cuentas de prueba) y una **tarjeta de prueba** (panel de MP → Tarjetas de prueba; titular
`APRO` = aprobado, `OTHE` = rechazado). Abrí el checkout en una ventana de incógnito,
para no estar logueado con tu cuenta real. En local Mercado Pago no vuelve solo a la
tienda: tocá "Volver al sitio" al terminar.
