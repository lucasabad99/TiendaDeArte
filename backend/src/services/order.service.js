const crypto = require('crypto');
const mongoose = require('mongoose');
const Product = require('../models/Product.model');
const { Order, TRANSICIONES } = require('../models/Order.model');
const mailService = require('./mail.service');

class SinStockError extends Error {
  constructor(sinStock) {
    super('Sin stock suficiente');
    this.status = 409;
    this.sinStock = sinStock; // títulos de las obras que no alcanzan
  }
}

const generarCodigo = () => `ORD-${crypto.randomInt(36 ** 6).toString(36).toUpperCase().padStart(6, '0')}`;

async function devolverStock(items) {
  await Promise.all(
    items.map((it) => Product.updateOne({ _id: it.product }, { $inc: { stock: it.cantidad } }))
  );
}

// items: [{ productId, cantidad }] ya validados y sin repetidos.
async function crearOrden({ items, comprador, userId, expiraEn = null }) {
  // 1) Leemos las obras de la base: precio y título salen de acá, NUNCA del front.
  const productos = await Product.find({ _id: { $in: items.map((i) => i.productId) }, status: true });
  const porId = new Map(productos.map((p) => [p._id.toString(), p]));

  const sinStock = items
    .filter((i) => !porId.has(i.productId) || porId.get(i.productId).stock < i.cantidad)
    .map((i) => porId.get(i.productId)?.title || 'Obra no disponible');
  if (sinStock.length > 0) throw new SinStockError(sinStock);

  // 2) Reservamos stock de forma atómica: el filtro stock >= cantidad y el descuento van en
  //    la misma operación, así dos compras simultáneas de la última pieza no pueden ganar las dos.
  //    Si una falla, devolvemos lo ya reservado (Mongo local sin réplica no tiene transacciones).
  const reservados = [];
  for (const i of items) {
    const { modifiedCount } = await Product.updateOne(
      { _id: i.productId, status: true, stock: { $gte: i.cantidad } },
      { $inc: { stock: -i.cantidad } }
    );
    if (modifiedCount === 0) {
      await devolverStock(reservados);
      throw new SinStockError([porId.get(i.productId).title]);
    }
    reservados.push({ product: i.productId, cantidad: i.cantidad });
  }

  // 3) Creamos la orden. Si falla, liberamos el stock reservado.
  const lineas = items.map((i) => {
    const p = porId.get(i.productId);
    return { product: p._id, title: p.title, price: p.price, cantidad: i.cantidad };
  });
  const total = lineas.reduce((acc, l) => acc + l.price * l.cantidad, 0);

  try {
    return await Order.create({ code: generarCodigo(), items: lineas, total, comprador, user: userId || null, expiraEn });
  } catch (err) {
    await devolverStock(reservados);
    throw err;
  }
}

const errorConStatus = (status, message) => Object.assign(new Error(message), { status });

// El filtro por el estado actual hace el cambio atómico: si dos personas cancelan la misma
// orden a la vez, solo una gana y el stock se devuelve una sola vez.
async function cambiarEstado(id, nuevo) {
  const actual = await Order.findById(id);
  if (!actual) return null;
  if (!TRANSICIONES[actual.status].includes(nuevo)) {
    throw errorConStatus(400, `No se puede pasar de '${actual.status}' a '${nuevo}'`);
  }

  const actualizada = await Order.findOneAndUpdate(
    { _id: id, status: actual.status },
    { status: nuevo },
    { returnDocument: 'after' }
  );
  if (!actualizada) throw errorConStatus(409, 'La orden cambió mientras tanto. Recargá e intentá de nuevo.');

  if (nuevo === 'cancelada') await devolverStock(actualizada.items);
  return actualizada;
}

// ---------- Pagos (Mercado Pago) ----------

// Aplica a su orden un pago consultado A Mercado Pago (nunca uno que venga de la URL o del body).
// Es idempotente: el mismo pago aplicado dos veces (vuelta del comprador + webhook) no duplica nada.
// Devuelve la orden actualizada, o null si el pago no corresponde a ninguna orden.
async function aplicarPago(pago) {
  const ordenId = pago.external_reference;
  if (!mongoose.isValidObjectId(ordenId)) return null;
  const orden = await Order.findById(ordenId);
  if (!orden) return null;

  if (pago.status !== 'approved') {
    // Rechazado, en proceso, pendiente de pago en efectivo...: lo registramos y la orden sigue pendiente
    if (orden.status === 'pendiente' && !orden.mpPaymentId) {
      orden.mpStatus = pago.status;
      await orden.save();
    }
    return orden;
  }

  if (orden.mpPaymentId === String(pago.id)) return orden; // ya aplicado

  // El monto lo verificamos nosotros: un pago aprobado por menos del total no paga la orden
  const montoOk = pago.currency_id === 'ARS' && Number(pago.transaction_amount) + 0.01 >= orden.total;
  if (!montoOk) {
    orden.alerta = `Pago ${pago.id} aprobado por ${pago.transaction_amount} ${pago.currency_id}, menos que el total. Revisar en Mercado Pago.`;
    orden.mpStatus = pago.status;
    await orden.save();
    return orden;
  }

  // Atómico: solo una de las confirmaciones simultáneas pasa la orden a "pagada" (y manda los mails)
  const pagada = await Order.findOneAndUpdate(
    { _id: orden._id, status: 'pendiente', mpPaymentId: null },
    { status: 'pagada', mpPaymentId: String(pago.id), mpStatus: 'approved', expiraEn: null },
    { returnDocument: 'after' }
  );
  if (pagada) {
    // Los mails no frenan nada: si fallan, el pago ya quedó registrado
    mailService.enviarAvisosPedido(pagada, { pagado: true }).catch((err) => console.error(`[mail] Pago ${pagada.code}:`, err.message));
    return pagada;
  }

  // Llegó un pago aprobado para una orden que ya no estaba pendiente (ej. venció la reserva).
  const actual = await Order.findById(orden._id);
  if (!actual.mpPaymentId) {
    actual.mpPaymentId = String(pago.id);
    actual.mpStatus = 'approved';
    actual.alerta = `Pago ${pago.id} aprobado con la orden en estado "${actual.status}". Devolver el dinero desde Mercado Pago o coordinar con el comprador.`;
    await actual.save();
  } else if (actual.mpPaymentId !== String(pago.id) && !actual.alerta?.includes(String(pago.id))) {
    // Pagó dos veces (ej. dos pestañas): el primero cubrió la orden, el segundo hay que devolverlo
    actual.alerta = `Pago duplicado: ${pago.id} se aprobó además de ${actual.mpPaymentId}. Devolver ${pago.id} desde Mercado Pago.`;
    await actual.save();
  }
  return actual;
}

// Le pregunta a MP por los pagos de una orden pendiente y aplica el mejor (aprobado > último).
async function sincronizarConMP(orden, mp) {
  const pagos = await mp.pagosDeOrden(orden._id);
  const pago = pagos.find((p) => p.status === 'approved') || pagos[0];
  return pago ? aplicarPago(pago) : orden;
}

// Corre cada minuto. Para cada pedido pendiente con reserva:
//  1) le pregunta a MP si ya se pagó (sin webhook, ej. en local, es como nos enteramos)
//  2) si la reserva venció y sigue sin pago, lo cancela y devuelve el stock.
// filtro: para acotar a ciertos pedidos (lo usan las pruebas).
async function revisarPendientes(mp, filtro = {}) {
  const pendientes = await Order.find({ ...filtro, status: 'pendiente', expiraEn: { $ne: null } });
  for (const orden of pendientes) {
    try {
      if (mp.habilitado()) {
        const actual = await sincronizarConMP(orden, mp);
        if (actual.status !== 'pendiente') continue;
      }
      if (orden.expiraEn > new Date()) continue;
      // Solo si SIGUE pendiente y sin pago: si justo se pagó entre medio, no la tocamos
      const cancelada = await Order.findOneAndUpdate(
        { _id: orden._id, status: 'pendiente', mpPaymentId: null },
        { status: 'cancelada', expiraEn: null },
        { returnDocument: 'after' }
      );
      if (cancelada) {
        await devolverStock(cancelada.items);
        console.log(`[reservas] ${orden.code} venció sin pago: cancelada y stock devuelto.`);
      }
    } catch (err) {
      console.error(`[reservas] ${orden.code}:`, err.message);
    }
  }
}

module.exports = { crearOrden, cambiarEstado, SinStockError, aplicarPago, sincronizarConMP, revisarPendientes };
