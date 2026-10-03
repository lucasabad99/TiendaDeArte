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
copy .env.example .env      # solo la primera vez
npm run dev

# 2) Frontend
cd frontend
npm install
npm run dev
```

Requiere Node 22.15 o superior.

## Formulario de contacto en desarrollo

Sin SMTP en `backend/.env`, los mails van a **Ethereal** (SMTP de prueba, no
llegan a nadie). Al enviar el formulario, la consola del backend muestra un link
`[mail] Ver el mail de prueba: https://ethereal.email/message/...` para verlo.

Para mails reales, completar `SMTP_*` y `CONTACT_TO` en `backend/.env`.
