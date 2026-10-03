const mongoose = require('mongoose');
const { Order, ESTADOS } = require('../models/Order.model');
const orderService = require('../services/order.service');
const mailService = require('../services/mail.service');
const { EMAIL_RE, TELEFONO_RE, texto } = require('../utils/validacion');

const MAX_ITEMS = 50;
const MAX_CANTIDAD = 100;

// body: { items: [{ productId, cantidad }], comprador: { nombre, email, telefono?, nota? } }
// Del front solo aceptamos QUÉ obras y CUÁNTAS: precios y títulos los pone el servidor.
function validar(body) {
  const errores = {};

  const crudos = Array.isArray(body.items) ? body.items : [];
  if (crudos.length === 0 || crudos.length > MAX_ITEMS) errores.items = 'El carrito está vacío o es demasiado grande.';

  // Unificamos repetidos (misma obra dos veces → se suman las cantidades)
  const cantidades = new Map();
  for (const it of crudos) {
    const id = typeof it?.productId === 'string' ? it.productId : '';
    const cantidad = Number(it?.cantidad);
    if (!mongoose.isValidObjectId(id) || !Number.isInteger(cantidad) || cantidad < 1 || cantidad > MAX_CANTIDAD) {
      errores.items = 'Hay obras inválidas en el carrito.';
      break;
    }
    cantidades.set(id, (cantidades.get(id) || 0) + cantidad);
  }
  const items = [...cantidades].map(([productId, cantidad]) => ({ productId, cantidad }));

  const c = body.comprador || {};
  const comprador = {
    nombre: texto(c.nombre),
    email: texto(c.email),
    telefono: texto(c.telefono),
    nota: texto(c.nota),
  };
  if (comprador.nombre.length < 2 || comprador.nombre.length > 100) errores.nombre = 'Ingresá tu nombre.';
  if (!EMAIL_RE.test(comprador.email) || comprador.email.length > 200) errores.email = 'Ingresá un email válido.';
  if (comprador.telefono && !TELEFONO_RE.test(comprador.telefono)) errores.telefono = 'Teléfono inválido.';
  if (comprador.nota.length > 1000) errores.nota = 'La nota es demasiado larga (máximo 1000 caracteres).';

  return { items, comprador, errores };
}

// Público (con o sin cuenta). Si viene logueado, la orden queda asociada a su usuario.
async function crear(req, res, next) {
  try {
    const { items, comprador, errores } = validar(req.body);
    if (Object.keys(errores).length > 0) {
      return res.status(400).json({ status: 'error', code: 400, message: 'Datos inválidos', errores });
    }

    const orden = await orderService.crearOrden({ items, comprador, userId: req.user?._id });

    // Los mails no frenan la compra: si fallan, la orden ya está creada y queda en el log
    mailService.enviarAvisosPedido(orden).catch((err) => console.error(`[mail] Pedido ${orden.code}:`, err.message));

    return res.status(201).json({ status: 'success', code: 201, message: 'Pedido creado', data: orden });
  } catch (err) {
    if (err instanceof orderService.SinStockError) {
      return res.status(409).json({ status: 'error', code: 409, message: err.message, sinStock: err.sinStock });
    }
    next(err);
  }
}

// Panel: todas las órdenes, filtro opcional ?status=pendiente
async function listar(req, res, next) {
  try {
    const filtro = ESTADOS.includes(req.query.status) ? { status: req.query.status } : {};
    const orders = await Order.find(filtro).sort({ createdAt: -1 }).limit(200);
    return res.status(200).json({ status: 'success', code: 200, data: orders });
  } catch (err) {
    next(err);
  }
}

// "Mis pedidos" del usuario logueado
async function mias(req, res, next) {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    return res.status(200).json({ status: 'success', code: 200, data: orders });
  } catch (err) {
    next(err);
  }
}

// PATCH /orders/:id/status  { "status": "pagada" }
async function cambiarEstado(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!ESTADOS.includes(status)) {
      return res.status(400).json({ status: 'error', code: 400, message: `Estado inválido. Opciones: ${ESTADOS.join(', ')}` });
    }
    const orden = mongoose.isValidObjectId(id) ? await orderService.cambiarEstado(id, status) : null;
    if (!orden) return res.status(404).json({ status: 'error', code: 404, message: 'Orden no encontrada' });
    return res.status(200).json({ status: 'success', code: 200, message: 'Estado actualizado', data: orden });
  } catch (err) {
    next(err);
  }
}

module.exports = { crear, listar, mias, cambiarEstado };
