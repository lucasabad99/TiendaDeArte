require('dotenv').config();

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProd = NODE_ENV === 'production';

function requerida(nombre) {
  const valor = process.env[nombre];
  if (!valor) {
    console.error(`[env] Falta la variable de entorno obligatoria: ${nombre}`);
    process.exit(1);
  }
  return valor;
}

// En desarrollo el SMTP es opcional: si falta, se usa una cuenta de prueba de Ethereal.
// En producción es obligatorio (si no, los mails no llegarían a nadie).
const smtpOpcional = (nombre) => (isProd ? requerida(nombre) : process.env[nombre]);

const env = {
  NODE_ENV,
  isProd,
  PORT: parseInt(process.env.PORT || '8080', 10),

  MONGO_URI: requerida('MONGO_URI'),

  JWT_SECRET: requerida('JWT_SECRET'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1d',

  // Orígenes permitidos por CORS, separados por coma
  CLIENT_URLS: (process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((u) => u.trim()),

  SMTP_HOST: smtpOpcional('SMTP_HOST'),
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_USER: smtpOpcional('SMTP_USER'),
  SMTP_PASS: smtpOpcional('SMTP_PASS'),

  // A quién le llegan las consultas (la artista) y desde qué dirección salen
  CONTACT_TO: smtpOpcional('CONTACT_TO'),
  MAIL_FROM: process.env.MAIL_FROM || 'Taller de Arte <no-reply@tallerdearte.local>',

  // Mercado Pago (opcional): sin token, los pedidos quedan "pendiente" y el pago se coordina a mano
  MP_ACCESS_TOKEN: process.env.MP_ACCESS_TOKEN || '',
  // Clave secreta de webhooks (panel de MP → Webhooks). Si está, se verifica la firma de cada aviso.
  MP_WEBHOOK_SECRET: process.env.MP_WEBHOOK_SECRET || '',
  // URL pública del backend (ej. https://api.tutienda.com). Sin ella, MP no puede mandar webhooks
  // (en local no hace falta: el pago se confirma cuando el comprador vuelve a la tienda).
  API_PUBLIC_URL: (process.env.API_PUBLIC_URL || '').replace(/\/$/, ''),
  // Cuánto tiempo queda reservado el stock de un pedido sin pagar
  RESERVA_MINUTOS: parseInt(process.env.RESERVA_MINUTOS || '30', 10),
};

// A dónde vuelve el comprador después de pagar: el primer origen de CLIENT_URL
env.FRONT_URL = env.CLIENT_URLS[0].replace(/\/$/, '');

if (env.isProd && env.MP_ACCESS_TOKEN && !env.API_PUBLIC_URL) {
  console.warn('[env] MP_ACCESS_TOKEN sin API_PUBLIC_URL: Mercado Pago no podrá mandar webhooks.');
}

module.exports = env;
