const app = require('./src/app');
const env = require('./src/config/env');

app.listen(env.PORT, () => {
  console.log(`\n🚀  Server escuchando en http://localhost:${env.PORT}`);
  console.log(`    Entorno: ${env.NODE_ENV}`);
  console.log(`    API base: http://localhost:${env.PORT}/api/v1\n`);
});
