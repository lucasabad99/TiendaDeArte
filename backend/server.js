const app = require('./src/app');
const connectDB = require('./src/config/db');
const env = require('./src/config/env');
const mp = require('./src/services/mercadopago.service');
const imagenes = require('./src/services/imagenes.service');
const { revisarPendientes } = require('./src/services/order.service');

(async () => {
  await connectDB();
  app.listen(env.PORT, () => {
    console.log(`\n🚀  Server escuchando en http://localhost:${env.PORT}`);
    console.log(`    Entorno: ${env.NODE_ENV}`);
    console.log(`    API base: http://localhost:${env.PORT}/api/v1`);
    console.log(`    Mercado Pago: ${mp.habilitado() ? `activo (reserva de ${env.RESERVA_MINUTOS} min)` : 'desactivado (pagos a mano)'}`);
    console.log(`    Fotos: ${imagenes.habilitado() ? 'Cloudinary activo' : 'sin Cloudinary (solo por link)'}\n`);
  });

  // Cada minuto: pedidos pendientes → ¿ya se pagaron en MP? ¿venció la reserva? (cancela y devuelve stock)
  setInterval(() => revisarPendientes(mp).catch((err) => console.error('[reservas]', err.message)), 60 * 1000);
})();
