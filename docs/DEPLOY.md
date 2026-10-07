# Publicar la tienda — Staging (demo)

Front en **Netlify**, backend en **Render**, base en **MongoDB Atlas**. Todo en planes gratis.
Los secretos se cargan **en cada servicio**, nunca en el repo ni en el chat.

```
 clienta ─► Netlify (front) ─► Render (API) ─► Atlas · Mercado Pago (prueba) · Cloudinary (carpeta staging) · Gmail
                ▲                   ▲
                └── git push a main ┘   (se actualizan solos)
```

## 0. Elegir los nombres (antes de empezar)

Las direcciones salen del nombre de cada servicio, y cada uno necesita la del otro:

| Servicio | Nombre sugerido | Dirección que va a tener |
|---|---|---|
| Render | `tiendadearte-api-staging` | `https://tiendadearte-api-staging.onrender.com` |
| Netlify | `tallerdearte-staging` | `https://tallerdearte-staging.netlify.app` |

Si algún nombre está ocupado, usá otro y ajustá las variables de abajo con la dirección real.

## 1. MongoDB Atlas (la base)

1. https://www.mongodb.com/atlas → cuenta gratis (se puede con Google).
2. **Create cluster → M0 (Free)**. Proveedor AWS, región **São Paulo (sa-east-1)**, la más cercana.
3. **Database Access → Add user**: usuario `tienda`, contraseña autogenerada (copiala a un lugar seguro). Rol *Read and write to any database*.
4. **Network Access → Add IP → Allow access from anywhere** (`0.0.0.0/0`). Render gratis no tiene IP fija; la protección es el usuario y la contraseña.
5. **Connect → Drivers** → copiar el *connection string* y agregarle el nombre de la base antes del `?`:
   ```
   mongodb+srv://tienda:CONTRASEÑA@cluster0.xxxxx.mongodb.net/tienda_staging?retryWrites=true&w=majority
   ```
   Ese es el `MONGO_URI` del paso 2.

## 2. Render (el backend)

1. https://render.com → cuenta **con GitHub** → autorizar el repo `TiendaDeArte`.
2. **New → Blueprint** → elegir el repo. Render lee [`render.yaml`](../render.yaml) y arma el servicio solo.
3. Completar las variables que pide:

| Variable | Valor en staging |
|---|---|
| `MONGO_URI` | el del paso 1 |
| `CLIENT_URL` | `https://tallerdearte-staging.netlify.app` |
| `API_PUBLIC_URL` | `https://tiendadearte-api-staging.onrender.com` |
| `SMTP_USER` / `CONTACT_TO` | tu Gmail |
| `SMTP_PASS` | contraseña de aplicación de Gmail |
| `MAIL_FROM` | `Taller de Arte <tu-gmail>` |
| `MP_ACCESS_TOKEN` | el de **prueba** (el mismo de tu `.env`) |
| `CLOUDINARY_URL` | el mismo de tu `.env` |
| `SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD` | tu usuario para el panel de staging |

Las demás (`NODE_ENV`, `JWT_SECRET`, `SEED_OBRAS`, `CLOUDINARY_CARPETA`…) ya vienen en `render.yaml`.

4. **Apply**. El primer deploy tarda unos minutos. En *Logs* tiene que aparecer:
   ```
   [seed] Superadmin creado: …
   [seed] 8 obras de ejemplo cargadas.
   🚀  Server escuchando …
   ```
5. Probar: abrir `https://tiendadearte-api-staging.onrender.com/api/v1` → tiene que responder con la lista de endpoints.

## 3. Netlify (el front)

1. https://www.netlify.com → cuenta **con GitHub**.
2. **Add new site → Import an existing project → GitHub → TiendaDeArte**. Netlify lee [`netlify.toml`](../netlify.toml) (carpeta `frontend`, build y rutas): no cambiar nada.
3. Antes de publicar, **Environment variables**:

| Variable | Valor |
|---|---|
| `VITE_API_URL` | `https://tiendadearte-api-staging.onrender.com/api/v1` |
| `VITE_AUTH_TOKEN` | `true` (front y API en dominios distintos: ver `frontend/src/services/api.js`) |

4. **Deploy**. Después, **Site configuration → Change site name** → `tallerdearte-staging`.
5. Si cambiaste un nombre: actualizar `CLIENT_URL` en Render (o `VITE_API_URL` en Netlify y *Trigger deploy*).

## 4. Prueba final (desde el celular)

- [ ] La tienda carga y muestra las 8 obras de muestra.
- [ ] Compra con tarjeta de prueba de Mercado Pago → vuelve sola a "¡Pago aprobado!" (en staging sí hay vuelta automática y webhook).
- [ ] El pedido aparece como **Pagada** en `/admin`.
- [ ] Llegan los mails.
- [ ] Panel: crear una obra con fotos → aparece en la tienda.
- [ ] Recargar estando en `/admin/obras` no da error.

## A tener en cuenta

- **Render gratis se duerme** a los 15 minutos sin visitas: la primera visita tarda 30–60 s. Abrir la tienda un minuto antes de mostrarla.
  Mientras duerme no corre la revisión de pagos de cada minuto: en staging no importa (el webhook lo despierta); en producción, plan pago.
- **Mails desde Render gratis**: Render puede bloquear el envío por SMTP en el plan gratis. Si no llegan, la compra y el pago igual
  funcionan (los mails no frenan nada); se resuelve con un servicio de mails por API o con el plan pago.
- **Actualizar**: cada `git push` a `main` vuelve a publicar los dos. Para ver si salió bien: *Deploys* en Netlify y *Events* en Render.
- **Datos de staging ≠ tus datos locales**: es otra base. Lo que se cargue en staging queda solo ahí.

## Producción (más adelante)

Mismo procedimiento con otros nombres y estas diferencias:
dominio propio (`tutienda.com` en Netlify y `api.tutienda.com` en Render) con `VITE_AUTH_TOKEN=false`;
base `tienda` (no `tienda_staging`) y **sin** `SEED_OBRAS`; credenciales **productivas** de Mercado Pago de la artista y
`MP_WEBHOOK_SECRET`; mail de la tienda; `CLOUDINARY_CARPETA=tienda-arte/obras`; Render en plan pago.
