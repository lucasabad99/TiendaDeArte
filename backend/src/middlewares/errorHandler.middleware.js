const env = require('../config/env');

function errorHandler(err, req, res, next) {
  // Datos que no cumplen el esquema de Mongoose o JSON mal formado: es culpa del cliente, no del server
  if (err.name === 'ValidationError') {
    const errores = Object.fromEntries(Object.entries(err.errors).map(([campo, e]) => [campo, e.message]));
    return res.status(400).json({ status: 'error', code: 400, message: 'Datos inválidos', errores });
  }
  if (err.name === 'CastError' || err.type === 'entity.parse.failed') {
    return res.status(400).json({ status: 'error', code: 400, message: 'Datos inválidos' });
  }

  console.error('[error]', err);

  const status = err.status || 500;
  const body = {
    status: 'error',
    code: status,
    message: status < 500 || !env.isProd ? err.message : 'Error interno del servidor',
  };

  if (!env.isProd) {
    body.stack = err.stack;
  }

  res.status(status).json(body);
}

module.exports = errorHandler;
