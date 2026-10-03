const crypto = require('crypto');
const Product = require('../models/Product.model');
const { Order, TRANSICIONES } = require('../models/Order.model');

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
async function crearOrden({ items, comprador, userId }) {
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
    return await Order.create({ code: generarCodigo(), items: lineas, total, comprador, user: userId || null });
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

module.exports = { crearOrden, cambiarEstado, SinStockError };
