const mongoose = require('mongoose');
const Product = require('../models/Product.model');
const { tienePermiso } = require('../config/permisos');

// Campos de contenido (products:write) y comerciales (products:price).
// Un editor carga y corrige obras, pero el precio, el stock y publicarlas los decide owner/manager.
const CAMPOS_CONTENIDO = ['title', 'description', 'category', 'tipo', 'thumbnails'];
const CAMPOS_COMERCIALES = ['price', 'stock', 'status'];

const elegir = (obj, campos) =>
  Object.fromEntries(campos.filter((c) => obj[c] !== undefined).map((c) => [c, obj[c]]));

const noEncontrada = (res) =>
  res.status(404).json({ status: 'error', code: 404, message: 'Obra no encontrada' });

// Público: solo obras publicadas. Filtro opcional ?category=Pintura
async function listar(req, res, next) {
  try {
    const filtro = { status: true };
    if (typeof req.query.category === 'string') filtro.category = req.query.category;
    const products = await Product.find(filtro).sort({ createdAt: -1 });
    return res.status(200).json({ status: 'success', code: 200, data: products });
  } catch (err) {
    next(err);
  }
}

async function obtener(req, res, next) {
  try {
    const { pid } = req.params;
    if (!mongoose.isValidObjectId(pid)) return noEncontrada(res);
    const product = await Product.findOne({ _id: pid, status: true });
    if (!product) return noEncontrada(res);
    return res.status(200).json({ status: 'success', code: 200, data: product });
  } catch (err) {
    next(err);
  }
}

async function crear(req, res, next) {
  try {
    const datos = elegir(req.body, CAMPOS_CONTENIDO);
    if (tienePermiso(req.user.role, 'products:price')) {
      Object.assign(datos, elegir(req.body, CAMPOS_COMERCIALES));
    } else {
      // Sin permiso comercial la obra nace como borrador oculto, sin precio ni stock
      Object.assign(datos, { price: 0, stock: 0, status: false });
    }
    const product = await Product.create(datos);
    return res.status(201).json({ status: 'success', code: 201, message: 'Obra creada', data: product });
  } catch (err) {
    next(err);
  }
}

async function actualizar(req, res, next) {
  try {
    const { pid } = req.params;
    if (!mongoose.isValidObjectId(pid)) return noEncontrada(res);

    const comerciales = elegir(req.body, CAMPOS_COMERCIALES);
    if (Object.keys(comerciales).length > 0 && !tienePermiso(req.user.role, 'products:price')) {
      return res.status(403).json({
        status: 'error',
        code: 403,
        message: "Acceso denegado. Para cambiar precio, stock o publicación falta el permiso 'products:price'.",
      });
    }

    const cambios = { ...elegir(req.body, CAMPOS_CONTENIDO), ...comerciales };
    const product = await Product.findByIdAndUpdate(pid, cambios, { returnDocument: 'after', runValidators: true });
    if (!product) return noEncontrada(res);
    return res.status(200).json({ status: 'success', code: 200, message: 'Obra actualizada', data: product });
  } catch (err) {
    next(err);
  }
}

async function eliminar(req, res, next) {
  try {
    const { pid } = req.params;
    if (!mongoose.isValidObjectId(pid)) return noEncontrada(res);
    const product = await Product.findByIdAndDelete(pid);
    if (!product) return noEncontrada(res);
    return res.status(200).json({ status: 'success', code: 200, message: 'Obra eliminada' });
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
