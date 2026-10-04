// npm run test:pagos  (no necesita el backend corriendo ni internet)
// Prueba la lógica de pagos con pagos de Mercado Pago simulados: aprobado, rechazado, monto menor,
// pago duplicado, pago tardío y vencimiento de reservas. Usa la base del .env y borra lo que crea.
require('dotenv').config();
process.env.SMTP_HOST = ''; // mails a Ethereal, nunca al Gmail real
const mongoose = require('mongoose');
const Product = require('../src/models/Product.model');
const { Order } = require('../src/models/Order.model');
const svc = require('../src/services/order.service');

let ok = 0, fallos = 0;
const check = (n, c, extra = '') => { if (c) { ok++; console.log(`  ✓ ${n}`); } else { fallos++; console.log(`  ✗ ${n} ${extra}`); } };

const TAG = `[test-pagos-${Date.now()}]`;
const comprador = { nombre: 'Test', email: 'test@test.local' };
let nPago = 1000;
const pago = (orden, extra = {}) => ({ id: ++nPago, status: 'approved', currency_id: 'ARS', transaction_amount: orden.total, external_reference: String(orden._id), ...extra });
const mpFalso = (pagos = []) => ({ habilitado: () => true, pagosDeOrden: async () => pagos });

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const prod = await Product.create({ title: `${TAG} obra`, category: 'Test', price: 1000, stock: 10 });
  const nueva = (expiraEn = new Date(Date.now() + 30 * 60000)) =>
    svc.crearOrden({ items: [{ productId: String(prod._id), cantidad: 1 }], comprador, expiraEn });
  const stock = async () => (await Product.findById(prod._id)).stock;

  console.log('Pago aprobado');
  const o1 = await nueva();
  const p1 = pago(o1);
  const r1 = await svc.aplicarPago(p1);
  check('pago aprobado por el total → pagada', r1.status === 'pagada' && r1.mpPaymentId === String(p1.id) && r1.expiraEn === null);
  const r1b = await svc.aplicarPago(p1);
  check('el mismo pago dos veces (vuelta + webhook) no rompe nada', r1b.status === 'pagada' && !r1b.alerta);
  const r1c = await svc.aplicarPago(pago(o1));
  check('un SEGUNDO pago aprobado → alerta de pago duplicado', r1c.status === 'pagada' && /duplicado/.test(r1c.alerta || ''), r1c.alerta);

  console.log('Confirmaciones simultáneas');
  const o2 = await nueva();
  const p2 = pago(o2);
  const res = await Promise.all([svc.aplicarPago(p2), svc.aplicarPago(p2), svc.aplicarPago(p2)]);
  const final2 = await Order.findById(o2._id);
  check('3 confirmaciones a la vez del mismo pago → pagada una sola vez, sin alertas', res.every((r) => r.status === 'pagada') && final2.mpPaymentId === String(p2.id) && !final2.alerta);

  console.log('Pagos que NO pagan la orden');
  const o3 = await nueva();
  const r3 = await svc.aplicarPago(pago(o3, { status: 'rejected' }));
  check('rechazado → sigue pendiente (puede reintentar), registra mpStatus', r3.status === 'pendiente' && r3.mpStatus === 'rejected' && !r3.mpPaymentId);
  const r3b = await svc.aplicarPago(pago(o3, { status: 'in_process' }));
  check('en proceso → sigue pendiente', r3b.status === 'pendiente' && r3b.mpStatus === 'in_process');
  const r3c = await svc.aplicarPago(pago(o3, { transaction_amount: o3.total - 100 }));
  check('aprobado por MENOS del total → no la paga y deja alerta', r3c.status === 'pendiente' && /menos que el total/.test(r3c.alerta || ''));
  const o4 = await nueva();
  const r4 = await svc.aplicarPago(pago(o4, { currency_id: 'USD' }));
  check('aprobado en otra moneda → no la paga', r4.status === 'pendiente' && r4.alerta);
  check('pago de una orden inexistente → se ignora', (await svc.aplicarPago(pago(o4, { external_reference: String(new mongoose.Types.ObjectId()) }))) === null);
  check('external_reference inválido → se ignora', (await svc.aplicarPago(pago(o4, { external_reference: 'cualquier-cosa' }))) === null);

  console.log('Vencimiento de reservas');
  const antes = await stock();
  const vencida = await nueva(new Date(Date.now() - 1000));
  const vigente = await nueva();
  await svc.revisarPendientes(mpFalso([]), { 'items.product': prod._id });
  check('reserva vencida sin pago → cancelada', (await Order.findById(vencida._id)).status === 'cancelada');
  check('…y el stock vuelve', (await stock()) === antes - 1, `antes=${antes} ahora=${await stock()}`); // -1 por "vigente"
  check('reserva vigente → no se toca', (await Order.findById(vigente._id)).status === 'pendiente');
  const vencidaPagada = await nueva(new Date(Date.now() - 1000));
  await svc.revisarPendientes(mpFalso([pago(vencidaPagada)]), { 'items.product': prod._id });
  check('vencida pero con pago aprobado en MP → se marca pagada, NO se cancela', (await Order.findById(vencidaPagada._id)).status === 'pagada');

  console.log('Pago tardío');
  const tarde = await nueva(new Date(Date.now() - 1000));
  await svc.revisarPendientes(mpFalso([]), { 'items.product': prod._id });
  const rt = await svc.aplicarPago(pago(tarde));
  check('pago aprobado después de cancelada → queda cancelada con alerta para devolver', rt.status === 'cancelada' && /Devolver/.test(rt.alerta || ''));

  // Limpieza
  const ids = (await Order.find({ 'items.product': prod._id })).map((o) => o._id);
  await Order.deleteMany({ _id: { $in: ids } });
  await Product.deleteOne({ _id: prod._id });
  console.log(`\n(limpieza: ${ids.length} pedidos y 1 obra de prueba borrados)`);
  console.log(`Resultado: ${ok} OK, ${fallos} fallos`);
  await mongoose.disconnect();
  setTimeout(() => process.exit(fallos ? 1 : 0), 500); // deja terminar los mails de Ethereal en curso
})().catch((e) => { console.error(e); process.exit(1); });
