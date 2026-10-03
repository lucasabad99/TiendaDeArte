const app = require('./src/app');
const connectDB = require('./src/config/db');
const env = require('./src/config/env');

(async () => {
  await connectDB();
  app.listen(env.PORT, () => {
    console.log(`\n🚀  Server escuchando en http://localhost:${env.PORT}`);
    console.log(`    Entorno: ${env.NODE_ENV}`);
    console.log(`    API base: http://localhost:${env.PORT}/api/v1\n`);
  });
})();
