const env = require('../config/env');

function errorHandler(err, req, res, next) {
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
