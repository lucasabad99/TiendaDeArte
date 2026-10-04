const express = require('express');
const rateLimit = require('express-rate-limit');
const env = require('../config/env');
const orderController = require('../controllers/order.controller');
const { authJwt, authOpcional, can } = require('../middlewares/auth.middleware');

const router = express.Router();

// Evita que un bot reserve todo el stock con pedidos falsos: 10 pedidos cada 15 minutos por IP
// (en desarrollo 200, para las pruebas)
const limitePedidos = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.isProd ? 10 : 200,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { status: 'error', code: 429, message: 'Demasiados pedidos. Probá de nuevo en unos minutos.' },
});

router.post('/', limitePedidos, authOpcional, orderController.crear);
router.get('/mine', authJwt, orderController.mias);
router.get('/', authJwt, can('orders:read'), orderController.listar);
router.patch('/:id/status', authJwt, can('orders:update'), orderController.cambiarEstado);
router.post('/:id/sincronizar', authJwt, can('orders:read'), orderController.sincronizar);

module.exports = router;
