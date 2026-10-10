// End-to-end API test against a running server with an EMPTY or disposable database.
//   BASE_URL=http://localhost:3001 ADMIN_EMAIL=<an email listed in SUPER_ADMIN_EMAILS> node scripts/smoke-test.mjs
// It creates test data (products named "SMOKE ..."). Don't run it against production.
const BASE = process.env.BASE_URL || 'http://localhost:3001';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@smoke.test';
const PASSWORD = 'smoke-password-123';
let failures = 0;

function check(label, cond, extra = '') {
  if (cond) console.log(`  ok   ${label}`);
  else {
    failures++;
    console.log(`  FAIL ${label} ${extra}`);
  }
}
const near = (a, b) => Math.abs(Number(a) - Number(b)) < 1e-6;

function client() {
  let cookie = '';
  const call = async (method, path, body, headers = {}) => {
    const res = await fetch(BASE + path, {
      method,
      redirect: 'manual',
      headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const setCookie = res.headers.get('set-cookie');
    if (setCookie && setCookie.startsWith('geia_session=')) cookie = setCookie.split(';')[0];
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      /* not json */
    }
    return { status: res.status, json };
  };
  return call;
}

const stamp = Date.now();
const admin = client();
const op = client();
const anon = client();
const stranger = client();
const OP_EMAIL = `operario${stamp}@smoke.test`;

const data = async (c, only) => (await c('GET', `/api/data?only=${only}`)).json.data;
const product = async (c, id) => (await data(c, 'products')).products.find((p) => p.id === id);

console.log('salud y sesión');
check('GET /api/health 200', (await anon('GET', '/api/health')).status === 200);
check('anónimo: /api/auth/me devuelve user null', (await anon('GET', '/api/auth/me')).json?.user === null);
check('anónimo: /api/data 401', (await anon('GET', '/api/data')).status === 401);

console.log('registro');
let r = await stranger('POST', '/api/auth/register', { email: `nadie${stamp}@smoke.test`, password: PASSWORD });
check('sin invitación no se puede registrar (403)', r.status === 403, JSON.stringify(r.json));
r = await admin('POST', '/api/auth/register', { email: ADMIN_EMAIL, password: PASSWORD, displayName: 'Admin Smoke' });
if (r.status === 409) r = await admin('POST', '/api/auth/login', { email: ADMIN_EMAIL, password: PASSWORD });
check('el dueño entra con contraseña', r.status === 201 || r.status === 200, JSON.stringify(r.json));
let me = (await admin('GET', '/api/auth/me')).json;
check('el dueño es admin y está habilitado', me?.isAdmin === true && me?.isEnabled === true, JSON.stringify(me));
check('login con contraseña incorrecta 401', (await anon('POST', '/api/auth/login', { email: ADMIN_EMAIL, password: 'mala-clave-1' })).status === 401);

console.log('CSRF');
r = await admin('POST', '/api/data/categories', { name: 'x' }, { Origin: 'https://evil.example' });
check('escritura desde otro origen rechazada (403)', r.status === 403);

console.log('catálogos y producto');
r = await admin('POST', '/api/data/categories', { name: `Concentrados ${stamp}` });
check('admin crea categoría', r.status === 201, JSON.stringify(r.json));
r = await admin('POST', '/api/data/suppliers', { name: `Proveedor ${stamp}`, email: 'prov@smoke.test' });
const supplierId = r.json?.id;
check('crea proveedor', r.status === 201 && supplierId);
r = await admin('POST', '/api/products', {
  id: 'ignored',
  referenceCode: `SMK-${stamp}`,
  name: `SMOKE Maíz ${stamp}`,
  description: 'prueba',
  category: `Concentrados ${stamp}`,
  supplierId: '',
  mainUnit: 'kilos',
  costPrice: 1000,
  profitPercentage: 20,
  salePrice: 1200,
  transportPricePerBundle: 0,
  stock: 100,
});
const productId = r.json?.id;
check('crea producto con stock inicial', r.status === 201 && productId, JSON.stringify(r.json));
let p = await product(admin, productId);
check('stock inicial = 100 y bultos = 2.5', near(p?.stock, 100) && near(p?.stockInBundles, 2.5), JSON.stringify(p));
let movs = (await data(admin, 'movements')).movements.filter((m) => m.productId === productId);
check('el stock inicial quedó como movimiento de entrada', movs.length === 1 && movs[0].type === 'entrada' && near(movs[0].quantity, 100));

console.log('invitación de operario');
r = await admin('POST', '/api/admin/invite', { email: OP_EMAIL });
check('admin invita (sin correo configurado devuelve el enlace)', r.status === 200 && (r.json.emailSent || r.json.acceptLink), JSON.stringify(r.json));
const link = r.json?.acceptLink ? new URL(r.json.acceptLink) : null;
if (link) {
  const token = link.searchParams.get('token');
  check('enlace válido antes de entrar', (await anon('GET', `/api/auth/invitation?email=${encodeURIComponent(OP_EMAIL)}&token=${token}`)).json?.status === 'valid');
  check('token falso es inválido', (await anon('GET', `/api/auth/invitation?email=${encodeURIComponent(OP_EMAIL)}&token=xyz`)).json?.status === 'invalid');
  r = await op('POST', '/api/auth/register', { email: OP_EMAIL, password: PASSWORD, displayName: 'Operario' });
  check('el invitado crea su cuenta', r.status === 201, JSON.stringify(r.json));
  r = await op('POST', '/api/auth/invitation', { email: OP_EMAIL, token });
  check('acepta la invitación', r.json?.status === 'success', JSON.stringify(r.json));
}
me = (await op('GET', '/api/auth/me')).json;
check('operario habilitado y no admin', me?.isEnabled === true && me?.isAdmin === false, JSON.stringify(me));
check('operario no puede crear categorías (403)', (await op('POST', '/api/data/categories', { name: 'nope' })).status === 403);
check('operario no recibe la lista de usuarios', !('users' in ((await op('GET', '/api/data')).json?.data || {})));
check('operario no puede invitar (403)', (await op('POST', '/api/admin/invite', { email: 'x@smoke.test' })).status === 403);

console.log('ventas concurrentes (el problema de Firebase)');
const sales = [];
for (let i = 0; i < 20; i++) {
  const who = i % 2 ? admin : op;
  sales.push(who('POST', '/api/movements', { productId, type: 'venta', quantity: 1, unit: 'kilos', totalValue: 1200, performedBy: 'hacker' }));
}
const results = await Promise.all(sales);
check('20 ventas simultáneas aceptadas', results.every((x) => x.status === 201), results.map((x) => x.status).join(','));
p = await product(admin, productId);
check('stock exacto tras ventas simultáneas: 100 - 20 = 80', near(p.stock, 80), `stock=${p.stock}`);
movs = (await data(admin, 'movements')).movements.filter((m) => m.productId === productId && m.type === 'venta');
check('performedBy lo pone el servidor', movs.every((m) => m.performedBy !== 'hacker'));

r = await op('POST', '/api/movements', { productId, type: 'venta', quantity: 1, unit: 'bultos', totalValue: 48000 });
const bultoSale = r.json?.id;
p = await product(admin, productId);
check('venta de 1 bulto descuenta 40 kg', near(p.stock, 40), `stock=${p.stock}`);
r = await op('PATCH', `/api/movements/${bultoSale}`, { quantity: 0.5 });
p = await product(admin, productId);
check('editar la venta a 0.5 bultos devuelve 20 kg', r.status === 200 && near(p.stock, 60), `stock=${p.stock}`);
r = await op('DELETE', `/api/movements/${bultoSale}`);
p = await product(admin, productId);
check('borrar la venta reintegra el stock', r.status === 200 && near(p.stock, 80), `stock=${p.stock}`);
check('cantidad negativa rechazada', (await op('POST', '/api/movements', { productId, type: 'venta', quantity: -5, unit: 'kilos' })).status === 400);

console.log('orden de compra recibida dos veces');
r = await op('POST', '/api/data/purchaseOrders', { productId, supplierId, quantity: 10, unit: 'kilos', status: 'Solicitado', deliveryDate: '2026-12-01' });
const poId = r.json?.id;
check('crea O.C.', r.status === 201 && poId, JSON.stringify(r.json));
const both = await Promise.all([
  op('POST', `/api/purchase-orders/${poId}/status`, { status: 'Recibido' }),
  admin('POST', `/api/purchase-orders/${poId}/status`, { status: 'Recibido' }),
]);
check('las dos peticiones responden OK', both.every((x) => x.status === 200));
check('solo una sumó stock', both.filter((x) => x.json?.stockAdded).length === 1);
await op('POST', `/api/purchase-orders/${poId}/status`, { status: 'Finalizado' });
await op('POST', `/api/purchase-orders/${poId}/status`, { status: 'recibido' });
p = await product(admin, productId);
check('stock = 80 + 10 (una sola vez)', near(p.stock, 90), `stock=${p.stock}`);
const po = (await data(op, 'purchaseOrders')).purchaseOrders.find((o) => o.id === poId);
check('O.C. conserva deliveryDate tal cual', po?.deliveryDate === '2026-12-01');

console.log('edición de producto sin pisar ventas');
// The form was opened when stock was 90; meanwhile someone sells 5.
await op('POST', '/api/movements', { productId, type: 'venta', quantity: 5, unit: 'kilos', totalValue: 6000 });
r = await admin('PATCH', `/api/products/${productId}`, { name: `SMOKE Maíz editado ${stamp}`, stock: 999, stockAdjustment: { from: 90, to: 100 } });
p = await product(admin, productId);
check('se aplica solo la diferencia (+10) sobre el stock real: 85 + 10 = 95', r.status === 200 && near(p.stock, 95), `stock=${p.stock}`);
check('el nombre se actualizó', p.name === `SMOKE Maíz editado ${stamp}`);

console.log('auditoría física');
r = await op('POST', '/api/data/audits', { productId, productName: p.name, systemQuantity: 95, verifiedQuantity: 93, difference: -2, unit: 'kilos', performedBy: 'x' });
const auditId = r.json?.id;
check('crea auditoría', r.status === 201 && auditId);
await Promise.all([op('POST', `/api/audits/${auditId}/apply`), admin('POST', `/api/audits/${auditId}/apply`)]);
p = await product(admin, productId);
check('aplicar dos veces deja el stock en lo contado (93)', near(p.stock, 93), `stock=${p.stock}`);

console.log('clientes');
r = await op('POST', '/api/customers/save', { name: 'Cliente Smoke', phone: '300 111 2233', email: 'c@smoke.test' });
const c1 = r.json?.id;
r = await op('POST', '/api/customers/save', { name: 'Cliente Smoke 2', phone: '(300) 111-2233' });
check('mismo teléfono = mismo cliente', r.json?.id === c1, `${c1} vs ${r.json?.id}`);

console.log('portal público');
const cat = (await anon('GET', '/api/public/catalog')).json;
const pubP = cat.products.find((x) => x.id === productId);
check('catálogo público sin costos', pubP && pubP.costPrice === 0 && !('supplierId' in pubP));
r = await anon('POST', '/api/public/orders', { productId, quantity: 2, customerName: 'Visitante', customerPhone: '300 111 2233', totalValue: 1 });
check('pedido público aceptado', r.status === 201, JSON.stringify(r.json));
const order = (await data(admin, 'orders')).orders.find((o) => o.items?.[0]?.productId === productId);
check('precio del pedido tomado del servidor', order && near(order.totalValue, 2400), JSON.stringify(order?.totalValue));
const cust = (await data(admin, 'customers')).customers.find((x) => x.id === c1);
check('el portal no sobrescribe datos de un cliente existente', cust?.name === 'Cliente Smoke 2');

console.log('versiones (sincronización)');
const v1 = (await op('GET', '/api/data/versions')).json.versions;
await op('POST', '/api/movements', { productId, type: 'entrada', quantity: 1, unit: 'kilos' });
const v2 = (await op('GET', '/api/data/versions')).json.versions;
check('una venta sube la versión de products y movements', v2.products > v1.products && v2.movements > v1.movements);

console.log('salida');
await op('POST', '/api/auth/logout');
check('después de salir, sin sesión', (await op('GET', '/api/auth/me')).json?.user === null);
check('después de salir, sin datos', (await op('GET', '/api/data')).status === 401);

console.log(failures ? `\n${failures} prueba(s) fallaron` : '\nTodo OK');
process.exit(failures ? 1 : 0);
