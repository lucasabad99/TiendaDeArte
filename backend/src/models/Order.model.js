const mongoose = require('mongoose');

const ESTADOS = ['pendiente', 'pagada', 'enviada', 'entregada', 'cancelada'];

// A qué estados se puede pasar desde cada uno. Cancelar devuelve el stock.
const TRANSICIONES = {
  pendiente: ['pagada', 'cancelada'],
  pagada: ['enviada', 'cancelada'],
  enviada: ['entregada'],
  entregada: [],
  cancelada: [],
};

// Copiamos título y precio al momento de la compra: si después la obra cambia de precio
// o se borra, la orden sigue mostrando lo que realmente se compró.
const itemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    title: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    cantidad: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    items: { type: [itemSchema], validate: [(v) => v.length > 0, 'La orden no tiene items'] },
    total: { type: Number, required: true, min: 0 },
    comprador: {
      nombre: { type: String, required: true, trim: true },
      email: { type: String, required: true, trim: true, lowercase: true },
      telefono: { type: String, default: '', trim: true },
      nota: { type: String, default: '', trim: true },
    },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // si compró logueado
    status: { type: String, enum: ESTADOS, default: 'pendiente' },
    mpPaymentId: { type: String, default: null }, // lo completa el webhook de Mercado Pago
  },
  { timestamps: true }
);

orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ user: 1, createdAt: -1 });

orderSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

const Order = mongoose.model('Order', orderSchema);

module.exports = { Order, ESTADOS, TRANSICIONES };
