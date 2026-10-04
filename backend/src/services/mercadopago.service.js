const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const env = require('../config/env');

const client = env.MP_ACCESS_TOKEN
  ? new MercadoPagoConfig({ accessToken: env.MP_ACCESS_TOKEN, options: { timeout: 10000 } })
  : null;

const habilitado = () => client !== null;

// Link de pago de Checkout Pro para una orden. Los montos salen de la orden (calculados por el
// servidor) y external_reference = id de la orden, así cada pago se puede atar a su orden.
async function crearPreferencia(orden) {
  const vuelta = `${env.FRONT_URL}/pedido/${orden.code}`;
  const body = {
    items: orden.items.map((i) => ({
      id: String(i.product),
      title: i.title,
      quantity: i.cantidad,
      unit_price: i.price,
      currency_id: 'ARS',
    })),
    payer: { name: orden.comprador.nombre, email: orden.comprador.email },
    external_reference: String(orden._id),
    back_urls: { success: vuelta, failure: vuelta, pending: vuelta },
    statement_descriptor: 'TALLER DE ARTE',
    // Mismo vencimiento que la reserva de stock: después de eso MP no acepta el pago
    expires: true,
    expiration_date_to: orden.expiraEn.toISOString(),
    date_of_expiration: orden.expiraEn.toISOString(), // pagos en efectivo (Rapipago, Pago Fácil)
  };
  // MP solo acepta volver solo a la tienda (auto_return) y mandar webhooks a URLs públicas
  if (!/localhost|127\.0\.0\.1/.test(env.FRONT_URL)) body.auto_return = 'approved';
  if (env.API_PUBLIC_URL) body.notification_url = `${env.API_PUBLIC_URL}/api/v1/payments/webhook`;

  const pref = await new Preference(client).create({ body, requestOptions: { idempotencyKey: `pref-${orden._id}` } });
  return { id: pref.id, initPoint: pref.init_point };
}

const obtenerPago = (id) => new Payment(client).get({ id });

// Pagos de una orden (por si el comprador no volvió a la tienda y no hay webhook, ej. en local)
async function pagosDeOrden(ordenId) {
  const r = await new Payment(client).search({ options: { external_reference: String(ordenId), sort: 'date_created', criteria: 'desc' } });
  return r.results || [];
}

module.exports = { habilitado, crearPreferencia, obtenerPago, pagosDeOrden };
