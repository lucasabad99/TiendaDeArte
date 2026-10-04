const { WebhookSignatureValidator } = require('mercadopago');
const { Order } = require('../models/Order.model');
const orderService = require('../services/order.service');
const mp = require('../services/mercadopago.service');
const env = require('../config/env');

// Lo que puede ver cualquiera que tenga el código del pedido: sin datos personales del comprador.
function resumenPublico(orden) {
  const vigente = orden.status === 'pendiente' && orden.mpInitPoint && orden.expiraEn > new Date();
  return {
    code: orden.code,
    status: orden.status,
    mpStatus: orden.mpStatus,
    total: orden.total,
    items: orden.items.map((i) => ({ title: i.title, cantidad: i.cantidad, price: i.price })),
    expiraEn: orden.expiraEn,
    pagoUrl: vigente ? orden.mpInitPoint : null, // para reintentar si el pago falló
  };
}

// POST /payments/confirmar  { code, paymentId? }
// Lo llama la página /pedido/:code cuando el comprador vuelve de Mercado Pago. El paymentId de la
// URL es solo una pista: el pago se consulta a MP y se aplica solo si es de esta orden.
async function confirmar(req, res, next) {
  try {
    const code = typeof req.body.code === 'string' ? req.body.code.trim().toUpperCase() : '';
    let orden = await Order.findOne({ code });
    if (!orden) return res.status(404).json({ status: 'error', code: 404, message: 'Pedido no encontrado' });

    if (mp.habilitado() && orden.status === 'pendiente') {
      const paymentId = String(req.body.paymentId || '').replace(/\D/g, '');
      let pago = null;
      if (paymentId) pago = await mp.obtenerPago(paymentId).catch(() => null);

      if (pago && String(pago.external_reference) === String(orden._id)) {
        orden = (await orderService.aplicarPago(pago)) || orden;
      } else {
        // Sin pista válida (ej. cerró la ventana y volvió después): buscamos los pagos de la orden
        orden = await orderService.sincronizarConMP(orden, mp);
      }
    }

    return res.status(200).json({ status: 'success', code: 200, data: resumenPublico(orden) });
  } catch (err) {
    next(err);
  }
}

// POST /payments/webhook  — Mercado Pago avisa que cambió un pago. Solo en producción
// (necesita API_PUBLIC_URL). Nunca usamos los datos del aviso: consultamos el pago a MP.
async function webhook(req, res) {
  const tipo = req.body?.type || req.query.type || req.query.topic;
  const dataId = req.query['data.id'] || req.body?.data?.id || req.query.id;
  if (tipo !== 'payment' || !dataId) return res.sendStatus(200); // otros avisos: los ignoramos

  if (env.MP_WEBHOOK_SECRET) {
    try {
      WebhookSignatureValidator.validate({
        xSignature: req.headers['x-signature'],
        xRequestId: req.headers['x-request-id'],
        dataId: String(dataId),
        secret: env.MP_WEBHOOK_SECRET,
      });
    } catch (err) {
      console.warn(`[mp] Webhook con firma inválida (${err.reason || err.message})`);
      return res.sendStatus(401);
    }
  }

  try {
    const pago = await mp.obtenerPago(String(dataId));
    const orden = await orderService.aplicarPago(pago);
    if (orden) console.log(`[mp] Webhook: pago ${pago.id} (${pago.status}) → ${orden.code} ${orden.status}`);
    return res.sendStatus(200);
  } catch (err) {
    if (err?.status === 404) return res.sendStatus(200); // pago inexistente: reintentar no sirve
    // 500 hace que MP reintente más tarde
    console.error('[mp] Webhook:', err?.message || JSON.stringify(err));
    return res.sendStatus(500);
  }
}

module.exports = { confirmar, webhook };
