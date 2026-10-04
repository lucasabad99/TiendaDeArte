const express = require('express');
const rateLimit = require('express-rate-limit');
const env = require('../config/env');
const paymentController = require('../controllers/payment.controller');

const router = express.Router();

// Cada confirmación consulta a Mercado Pago: limitamos para que no se pueda abusar
const limiteConfirmar = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.isProd ? 60 : 500,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { status: 'error', code: 429, message: 'Demasiados intentos. Probá de nuevo en unos minutos.' },
});

router.post('/confirmar', limiteConfirmar, paymentController.confirmar);
router.post('/webhook', paymentController.webhook);

module.exports = router;
