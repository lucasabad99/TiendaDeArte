// npm run seed
// 1) Crea el superadmin con SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD del .env (si no existe).
//    Es la ÚNICA forma de crear un superadmin: la API nunca otorga ese rol.
// 2) Si no hay obras cargadas, carga las de ejemplo (las mismas que tenía el front).

const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const User = require('../src/models/User.model');
const Product = require('../src/models/Product.model');

const OBRAS_EJEMPLO = [
  { title: 'Marea de otoño', description: 'Óleo sobre tela · 80 × 100 cm · 2025', price: 450000, category: 'Pintura', tipo: 'original', stock: 1, thumbnails: ['https://picsum.photos/seed/marea/600/750'] },
  { title: 'Silencio azul', description: 'Acrílico sobre tela · 60 × 60 cm · 2024', price: 280000, category: 'Pintura', tipo: 'original', stock: 1, thumbnails: ['https://picsum.photos/seed/silencio/600/750'] },
  { title: 'Jardín interior', description: 'Acuarela sobre papel · 30 × 40 cm · 2025', price: 120000, category: 'Acuarela', tipo: 'original', stock: 1, thumbnails: ['https://picsum.photos/seed/jardin/600/750'] },
  { title: 'Ciudad dormida', description: 'Lámina giclée edición limitada · 40 × 50 cm', price: 45000, category: 'Láminas', tipo: 'edicion', stock: 8, thumbnails: ['https://picsum.photos/seed/ciudad/600/750'] },
  { title: 'Raíces', description: 'Técnica mixta sobre madera · 50 × 70 cm · 2023', price: 320000, category: 'Técnica mixta', tipo: 'original', stock: 0, thumbnails: ['https://picsum.photos/seed/raices/600/750'] },
  { title: 'Luz de tarde', description: 'Lámina giclée edición limitada · 30 × 40 cm', price: 35000, category: 'Láminas', tipo: 'edicion', stock: 3, thumbnails: ['https://picsum.photos/seed/tarde/600/750'] },
  { title: 'Brumas', description: 'Acuarela sobre papel · 25 × 35 cm · 2025', price: 95000, category: 'Acuarela', tipo: 'original', stock: 1, thumbnails: ['https://picsum.photos/seed/brumas/600/750'] },
  { title: 'Horizonte rojo', description: 'Óleo sobre tela · 100 × 120 cm · 2024', price: 620000, category: 'Pintura', tipo: 'original', stock: 1, thumbnails: ['https://picsum.photos/seed/horizonte/600/750'] },
];

async function seedSuperadmin() {
  const email = process.env.SUPERADMIN_EMAIL;
  const password = process.env.SUPERADMIN_PASSWORD;
  if (!email || !password) {
    console.log('[seed] Sin SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD en el .env: no se crea superadmin.');
    return;
  }

  const existente = await User.findOne({ email: email.toLowerCase() });
  if (existente) {
    if (existente.role !== 'superadmin') {
      existente.role = 'superadmin';
      await existente.save();
      console.log(`[seed] ${email} ya existía: ahora es superadmin.`);
    } else {
      console.log(`[seed] El superadmin ${email} ya existe.`);
    }
    return;
  }

  await User.create({ name: 'Superadmin', email, password, role: 'superadmin' });
  console.log(`[seed] Superadmin creado: ${email}`);
}

async function seedObras() {
  const cantidad = await Product.countDocuments();
  if (cantidad > 0) {
    console.log(`[seed] Ya hay ${cantidad} obras: no se cargan las de ejemplo.`);
    return;
  }
  await Product.insertMany(OBRAS_EJEMPLO);
  console.log(`[seed] ${OBRAS_EJEMPLO.length} obras de ejemplo cargadas.`);
}

(async () => {
  await connectDB();
  try {
    await seedSuperadmin();
    await seedObras();
  } catch (err) {
    console.error('[seed] Error:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
