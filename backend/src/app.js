const express = require('express');
const cors = require('cors');

const env = require('./config/env');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler.middleware');

const app = express();

// Detrás de Render/Railway la IP real viene en X-Forwarded-For (la usa el rate limit)
if (env.isProd) app.set('trust proxy', 1);

app.use(express.json({ limit: '20kb' }));

app.use(
  cors({
    origin: env.CLIENT_URLS,
    credentials: true,
  })
);

app.use('/api/v1', routes);

app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    code: 404,
    message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
  });
});

app.use(errorHandler);

module.exports = app;
