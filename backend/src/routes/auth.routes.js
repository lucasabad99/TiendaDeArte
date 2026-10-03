const express = require('express');
const rateLimit = require('express-rate-limit');
const env = require('../config/env');
const authController = require('../controllers/auth.controller');
const { authJwt } = require('../middlewares/auth.middleware');

const router = express.Router();

// Frena ataques de fuerza bruta a contraseñas: 10 intentos cada 15 minutos por IP
// (en desarrollo 200, para poder correr "npm run test:roles" varias veces)
const limiteAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.isProd ? 10 : 200,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { status: 'error', code: 429, message: 'Demasiados intentos. Probá de nuevo en unos minutos.' },
});

router.post('/register', limiteAuth, authController.register);
router.post('/login', limiteAuth, authController.login);
router.post('/logout', authController.logout);
router.get('/me', authJwt, authController.me);

module.exports = router;
