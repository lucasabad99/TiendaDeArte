// npm run test:orders  (con el backend corriendo: npm run dev)
// Prueba la compra de punta a punta: stock, precios del servidor, compras simultáneas,
// estados y cancelación. Crea obras y usuarios de prueba y al final los borra.
// Ojo: manda los mails de pedido de verdad si el backend tiene SMTP configurado; para
// no hacerlo, levantá el backend de prueba con SMTP_HOST vacío (usa Ethereal).
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
const TAG = `[test-${sufijo}]`;
const comprador = { nombre: 'Compradora Test', email: `compra-${sufijo}@test.local`, telefono: '+54 11 5555-5555' };
const stockDe = async (pid, SA) => (await req('GET', `/products/${pid}`, { token: SA })).body.data?.stock;

(async () => {
  const sa = await req('POST', '/auth/login', { body: { email: process.env.SUPERADMIN_EMAIL, password: process.env.SUPERADMIN_PASSWORD } });
  const SA = sa.body.data?.token;
  if (!SA) throw new Error('No se pudo loguear el superadmin (¿corriste npm run seed?)');

  const nueva = async (stock, price = 1000) =>
    (await req('POST', '/products', { token: SA, body: { title: `${TAG} obra`, category: 'Test', price, stock } })).body.data._id;

  console.log('Compra básica');
  const p1 = await nueva(2, 1000);
  const o1 = await req('POST', '/orders', { body: { items: [{ productId: p1, cantidad: 1, price: 1 }], comprador } });
  check('pedido válido → 201 con código ORD-', o1.status === 201 && /^ORD-[0-9A-Z]{6}$/.test(o1.body.data?.code), JSON.stringify(o1.body).slice(0, 200));
  check('el precio lo pone el servidor (ignora el del front)', o1.body.data?.total === 1000 && o1.body.data?.items[0].price === 1000);
  check('queda en estado pendiente y sin usuario (invitado)', o1.body.data?.status === 'pendiente' && o1.body.data?.user === null);
  check('descuenta el stock (2 → 1)', (await stockDe(p1, SA)) === 1);

  console.log('Sin stock');
  const o2 = await req('POST', '/orders', { body: { items: [{ productId: p1, cantidad: 2 }], comprador } });
  check('pedir más de lo que hay → 409 con la obra en sinStock', o2.status === 409 && o2.body.sinStock?.includes(`${TAG} obra`), JSON.stringify(o2.body));
  check('un pedido rechazado no toca el stock (sigue 1)', (await stockDe(p1, SA)) === 1);

  console.log('Compras simultáneas de la última pieza');
  const carrera = await Promise.all(
    Array.from({ length: 5 }, () => req('POST', '/orders', { body: { items: [{ productId: p1, cantidad: 1 }], comprador } }))
  );
  check('5 compras a la vez de 1 pieza → gana exactamente 1', carrera.filter((r) => r.status === 201).length === 1, carrera.map((r) => r.status).join(','));
  check('el resto recibe 409', carrera.filter((r) => r.status === 409).length === 4);
  check('stock final 0, nunca negativo', (await stockDe(p1, SA)) === 0);

  console.log('Varias obras y repetidos');
  const p2 = await nueva(3, 500);
  const p3 = await nueva(1, 2000);
  const o3 = await req('POST', '/orders', { body: { items: [{ productId: p2, cantidad: 1 }, { productId: p2, cantidad: 1 }, { productId: p3, cantidad: 1 }], comprador } });
  check('repetidos se unifican en una línea (2 × p2)', o3.status === 201 && o3.body.data.items.length === 2 && o3.body.data.items.find((i) => i.product === p2)?.cantidad === 2);
  check('total = 2×500 + 2000 = 3000', o3.body.data?.total === 3000);
  const p4 = await nueva(1, 100);
  const o4 = await req('POST', '/orders', { body: { items: [{ productId: p2, cantidad: 1 }, { productId: p4, cantidad: 5 }], comprador } });
  check('si una obra no alcanza, falla TODO el pedido (409)', o4.status === 409);
  check('…y la otra obra no pierde stock (p2 sigue en 1)', (await stockDe(p2, SA)) === 1);

  console.log('Validaciones');
  const mal = async (body) => (await req('POST', '/orders', { body })).status;
  check('carrito vacío → 400', (await mal({ items: [], comprador })) === 400);
  check('id inválido → 400', (await mal({ items: [{ productId: 'xyz', cantidad: 1 }], comprador })) === 400);
  check('cantidad 0 → 400', (await mal({ items: [{ productId: p2, cantidad: 0 }], comprador })) === 400);
  check('cantidad decimal → 400', (await mal({ items: [{ productId: p2, cantidad: 1.5 }], comprador })) === 400);
  check('email inválido → 400', (await mal({ items: [{ productId: p2, cantidad: 1 }], comprador: { ...comprador, email: 'x' } })) === 400);
  check('sin comprador → 400', (await mal({ items: [{ productId: p2, cantidad: 1 }] })) === 400);
  await req('PATCH', `/products/${p4}`, { token: SA, body: { status: false } });
  check('obra oculta (borrador) no se puede comprar → 409', (await mal({ items: [{ productId: p4, cantidad: 1 }], comprador })) === 409);

  console.log('Permisos y "mis pedidos"');
  check('GET /orders sin token → 401', (await req('GET', '/orders')).status === 401);
  const emailCli = `cliente-${sufijo}@test.local`;
  await req('POST', '/auth/register', { body: { name: 'Cliente', email: emailCli, password: 'clave-de-prueba-123' } });
  const CLI = (await req('POST', '/auth/login', { body: { email: emailCli, password: 'clave-de-prueba-123' } })).body.data.token;
  check('customer GET /orders (todas) → 403', (await req('GET', '/orders', { token: CLI })).status === 403);
  const o5 = await req('POST', '/orders', { token: CLI, body: { items: [{ productId: p2, cantidad: 1 }], comprador } });
  check('pedido con sesión queda asociado al usuario', o5.status === 201 && o5.body.data.user !== null);
  const mine = await req('GET', '/orders/mine', { token: CLI });
  check('GET /orders/mine devuelve solo sus pedidos', mine.status === 200 && mine.body.data.length === 1 && mine.body.data[0].code === o5.body.data.code);
  const todas = await req('GET', '/orders?status=pendiente', { token: SA });
  check('superadmin GET /orders ve los pedidos', todas.status === 200 && todas.body.data.some((o) => o.code === o1.body.data.code));
  check('customer no puede cambiar estados → 403', (await req('PATCH', `/orders/${o5.body.data._id}/status`, { token: CLI, body: { status: 'cancelada' } })).status === 403);

  console.log('Estados y cancelación');
  const id3 = o3.body.data._id;
  check('pendiente → entregada no se permite → 400', (await req('PATCH', `/orders/${id3}/status`, { token: SA, body: { status: 'entregada' } })).status === 400);
  check('estado inexistente → 400', (await req('PATCH', `/orders/${id3}/status`, { token: SA, body: { status: 'perdida' } })).status === 400);
  const stockP3Antes = await stockDe(p3, SA);
  const cancelaciones = await Promise.all([1, 2].map(() => req('PATCH', `/orders/${id3}/status`, { token: SA, body: { status: 'cancelada' } })));
  check('cancelar 2 veces a la vez → solo una gana', cancelaciones.filter((r) => r.status === 200).length === 1, cancelaciones.map((r) => r.status).join(','));
  check('el stock se devuelve UNA sola vez (p3: 0 → 1)', stockP3Antes === 0 && (await stockDe(p3, SA)) === 1);
  const id1 = o1.body.data._id;
  check('pendiente → pagada', (await req('PATCH', `/orders/${id1}/status`, { token: SA, body: { status: 'pagada' } })).body.data?.status === 'pagada');
  check('pagada → enviada', (await req('PATCH', `/orders/${id1}/status`, { token: SA, body: { status: 'enviada' } })).body.data?.status === 'enviada');
  check('enviada → cancelada no se permite → 400', (await req('PATCH', `/orders/${id1}/status`, { token: SA, body: { status: 'cancelada' } })).status === 400);

  // Limpieza
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  const ids = [p1, p2, p3, p4].map((id) => new mongoose.Types.ObjectId(id));
  const ord = await db.collection('orders').deleteMany({ 'items.product': { $in: ids } });
  const prod = await db.collection('products').deleteMany({ _id: { $in: ids } });
  const usr = await db.collection('users').deleteMany({ email: emailCli });
  await mongoose.disconnect();
  console.log(`\n(limpieza: ${ord.deletedCount} pedidos, ${prod.deletedCount} obras y ${usr.deletedCount} usuario de prueba borrados)`);

  console.log(`\nResultado: ${ok} OK, ${fallos} fallos`);
  process.exit(fallos ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
