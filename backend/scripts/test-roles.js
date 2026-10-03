// npm run test:roles  (con el backend corriendo: npm run dev)
// Prueba de punta a punta de auth + roles + productos. Crea usuarios de prueba
// (test-*@test.local) y al final los borra. No toca tus obras ni tu superadmin.
require('dotenv').config();
const mongoose = require('mongoose');

const API = process.env.API_TEST_URL || `http://localhost:${process.env.PORT || 8080}/api/v1`;
let ok = 0, fallos = 0;

async function req(method, url, { token, body } = {}) {
  const r = await fetch(API + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

function check(nombre, cond, extra = '') {
  if (cond) { ok++; console.log(`  ✓ ${nombre}`); }
  else { fallos++; console.log(`  ✗ ${nombre} ${extra}`); }
}

const sufijo = Date.now();
const mail = (n) => `test-${n}-${sufijo}@test.local`;
const PASS = 'clave-de-prueba-123';

async function registrarYLogin(n, extra = {}) {
  const reg = await req('POST', '/auth/register', { body: { name: n, email: mail(n), password: PASS, ...extra } });
  const log = await req('POST', '/auth/login', { body: { email: mail(n), password: PASS } });
  return { reg, token: log.body.data?.token, id: log.body.data?.user?._id };
}

(async () => {
  console.log('Público');
  const lista = await req('GET', '/products');
  check('GET /products devuelve las obras publicadas', lista.status === 200 && lista.body.data.length >= 8, JSON.stringify(lista.body).slice(0, 100));
  const una = await req('GET', `/products/${lista.body.data[0]._id}`);
  check('GET /products/:pid devuelve una obra', una.status === 200 && una.body.data.title);
  check('GET /products/id-invalido → 404', (await req('GET', '/products/xyz')).status === 404);
  check('POST /products sin token → 401', (await req('POST', '/products', { body: { title: 'x', category: 'y' } })).status === 401);

  console.log('Registro');
  const A = await registrarYLogin('ana', { role: 'superadmin' });
  check('register ignora "role" del body → customer', A.reg.status === 201 && A.reg.body.data.user.role === 'customer', JSON.stringify(A.reg.body));
  check('la respuesta no expone el password', A.reg.body.data.user.password === undefined);
  check('register con email repetido → 409', (await req('POST', '/auth/register', { body: { name: 'x', email: mail('ana'), password: PASS } })).status === 409);
  check('register con password corta → 400', (await req('POST', '/auth/register', { body: { name: 'x', email: mail('corta'), password: '123' } })).status === 400);
  check('login con password mal → 401', (await req('POST', '/auth/login', { body: { email: mail('ana'), password: 'mal-mal-mal' } })).status === 401);
  check('customer POST /products → 403', (await req('POST', '/products', { token: A.token, body: { title: 'x', category: 'y' } })).status === 403);
  const me = await req('GET', '/auth/me', { token: A.token });
  check('GET /auth/me con token → datos del usuario', me.status === 200 && me.body.data.user.email === mail('ana'));

  console.log('Superadmin');
  const sa = await req('POST', '/auth/login', { body: { email: process.env.SUPERADMIN_EMAIL, password: process.env.SUPERADMIN_PASSWORD } });
  const SA = sa.body.data?.token;
  check('login superadmin', sa.status === 200 && sa.body.data.user.role === 'superadmin');
  check('superadmin NO puede otorgar superadmin → 403', (await req('PATCH', `/users/${A.id}/role`, { token: SA, body: { role: 'superadmin' } })).status === 403);
  check('rol inexistente → 400', (await req('PATCH', `/users/${A.id}/role`, { token: SA, body: { role: 'admin' } })).status === 400);
  check('superadmin hace owner a Ana', (await req('PATCH', `/users/${A.id}/role`, { token: SA, body: { role: 'owner' } })).body.data?.role === 'owner');

  console.log('Owner asigna roles');
  const B = await registrarYLogin('beto');
  const C = await registrarYLogin('caro');
  check('owner hace editor a Beto', (await req('PATCH', `/users/${B.id}/role`, { token: A.token, body: { role: 'editor' } })).status === 200);
  check('owner hace manager a Caro', (await req('PATCH', `/users/${C.id}/role`, { token: A.token, body: { role: 'manager' } })).status === 200);
  check('owner NO puede hacer owner a otro → 403', (await req('PATCH', `/users/${B.id}/role`, { token: A.token, body: { role: 'owner' } })).status === 403);
  check('owner NO puede tocar al superadmin → 403', (await req('PATCH', `/users/${sa.body.data.user._id}/role`, { token: A.token, body: { role: 'customer' } })).status === 403);
  check('nadie cambia su propio rol → 403', (await req('PATCH', `/users/${A.id}/role`, { token: A.token, body: { role: 'manager' } })).status === 403);
  check('owner GET /users → 200', (await req('GET', '/users', { token: A.token })).status === 200);
  check('manager GET /users → 403', (await req('GET', '/users', { token: C.token })).status === 403);

  console.log('Editor (sin $)');
  const borrador = await req('POST', '/products', { token: B.token, body: { title: 'Obra de prueba', category: 'Pintura', price: 999999, status: true } });
  const pid = borrador.body.data?._id;
  check('editor crea obra → queda borrador oculto, sin precio', borrador.status === 201 && borrador.body.data.status === false && borrador.body.data.price === 0, JSON.stringify(borrador.body));
  check('el borrador NO aparece en el listado público', !(await req('GET', '/products')).body.data.some((p) => p._id === pid));
  check('editor cambia el título → 200', (await req('PATCH', `/products/${pid}`, { token: B.token, body: { title: 'Obra de prueba (editada)' } })).status === 200);
  check('editor intenta cambiar precio → 403', (await req('PATCH', `/products/${pid}`, { token: B.token, body: { price: 1 } })).status === 403);
  check('editor intenta borrar → 403', (await req('DELETE', `/products/${pid}`, { token: B.token })).status === 403);

  console.log('Manager');
  const pub = await req('PATCH', `/products/${pid}`, { token: C.token, body: { price: 150000, stock: 1, status: true } });
  check('manager pone precio y publica', pub.status === 200 && pub.body.data.price === 150000 && pub.body.data.status === true);
  check('ahora aparece en el listado público', (await req('GET', '/products')).body.data.some((p) => p._id === pid));
  check('precio negativo → 400', (await req('PATCH', `/products/${pid}`, { token: C.token, body: { price: -5 } })).status === 400);
  check('crear sin título → 400', (await req('POST', '/products', { token: C.token, body: { category: 'x' } })).status === 400);
  check('manager borra la obra → 200', (await req('DELETE', `/products/${pid}`, { token: C.token })).status === 200);
  check('ya no existe → 404', (await req('GET', `/products/${pid}`)).status === 404);

  console.log('Cambio de rol con efecto inmediato');
  await req('PATCH', `/users/${B.id}/role`, { token: A.token, body: { role: 'customer' } });
  check('Beto pasa a customer y su token viejo ya no puede crear → 403', (await req('POST', '/products', { token: B.token, body: { title: 'x', category: 'y' } })).status === 403);

  // Limpieza: borramos los usuarios de prueba
  await mongoose.connect(process.env.MONGO_URI);
  const { deletedCount } = await mongoose.connection.collection('users').deleteMany({ email: { $regex: `-${sufijo}@test\\.local$` } });
  await mongoose.disconnect();
  console.log(`\n(limpieza: ${deletedCount} usuarios de prueba borrados)`);

  console.log(`\nResultado: ${ok} OK, ${fallos} fallos`);
  process.exit(fallos ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
