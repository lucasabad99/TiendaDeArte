const mongoose = require('mongoose');

// Misma forma que el Product de Backend I, más "tipo" para distinguir originales de ediciones.
const productSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, default: '', trim: true, maxlength: 2000 },
    price: { type: Number, default: 0, min: 0 },
    category: { type: String, required: true, trim: true, maxlength: 50 },
    // original = pieza única; edicion = láminas / copias numeradas
    tipo: { type: String, enum: ['original', 'edicion'], default: 'original' },
    status: { type: Boolean, default: true }, // false = borrador / oculta en la tienda
    stock: { type: Number, default: 1, min: 0 },
    thumbnails: { type: [String], default: [], validate: [(v) => v.length <= 12, 'Máximo 12 fotos por obra'] }, // la primera es la principal
  },
  { timestamps: true }
);

productSchema.index({ status: 1, category: 1 });

productSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('Product', productSchema);
