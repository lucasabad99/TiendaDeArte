const mongoose = require('mongoose');
const env = require('./env');

async function connectDB() {
  try {
    await mongoose.connect(env.MONGO_URI);
    console.log(`[db] Conectado a MongoDB (${mongoose.connection.name})`);
  } catch (err) {
    console.error('[db] No se pudo conectar a MongoDB:', err.message);
    process.exit(1);
  }
}

module.exports = connectDB;
