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
};

module.exports = env;
