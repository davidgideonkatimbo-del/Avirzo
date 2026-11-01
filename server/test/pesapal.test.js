import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createPesapal } from '../src/services/pesapal.js';
import { billingProvider, offeredPesapalPlans, offeredPesapalPacks, pesapalWarnings, unitsPerUsd } from '../src/services/pesapalCatalog.js';
import { effectivePlanFromAccount } from '../src/services/plans.js';
import { createSettlement, registerRoutes } from '../src/routes/pesapal.js';

const read = p => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const DAY = 86_400_000;

// ---- tiny in-memory stand-in for the Supabase query builder (only the shapes the settlement uses) ----
function fakeDb(seed = {}) {
  const tables = { avirzo_pesapal_orders: [], avirzo_billing_accounts: [], ...seed };
  function from(name) {
    const st = { op: 'select', filters: [], patch: null, rows: null, ret: false };
    const run = () => {
      const t = tables[name] || (tables[name] = []);
      if (st.op === 'insert') { t.push({ ...st.rows }); return { data: st.ret ? [st.rows] : null, error: null }; }
      if (st.op === 'upsert') {
        const key = name === 'avirzo_billing_accounts' ? 'user_id' : 'merchant_reference';
        const i = t.findIndex(r => r[key] === st.rows[key]);
        if (i >= 0) t[i] = { ...t[i], ...st.rows }; else t.push({ ...st.rows });
        return { data: null, error: null };
      }
      const hit = t.filter(r => st.filters.every(f => f(r)));
      if (st.op === 'update') { hit.forEach(r => Object.assign(r, st.patch)); return { data: st.ret ? hit.map(r => ({ ...r })) : null, error: null }; }
      return { data: hit.map(r => ({ ...r })), error: null };
    };
    const api = {
      select() { if (st.op !== 'select') st.ret = true; return api; },
      update(p) { st.op = 'update'; st.patch = p; return api; },
      insert(r) { st.op = 'insert'; st.rows = r; return api; },
      upsert(r) { st.op = 'upsert'; st.rows = r; return api; },
      eq(k, v) { st.filters.push(r => r[k] === v); return api; },
      in(k, a) { st.filters.push(r => a.includes(r[k])); return api; },
      lt(k, v) { st.filters.push(r => String(r[k]) < String(v)); return api; },
      maybeSingle() { const r = run(); return Promise.resolve({ data: r.data?.[0] || null, error: null }); },
      then(res, rej) { return Promise.resolve(run()).then(res, rej); }
    };
    return api;
  }
  return { from, tables };
}
const order = (o = {}) => ({ merchant_reference: 'AV-1', user_id: 'u1', kind: 'pack', item_id: 'starter', amount: 20000, currency: 'UGX', credits: 300, plan_days: null, status: 'pending', order_tracking_id: 'trk-1', ...o });
function setup({ orders = [order()], accounts = [], status = { status_code: 1, merchant_reference: 'AV-1', amount: 20000, currency: 'UGX' }, now = Date.UTC(2026, 9, 29) } = {}) {
  const db = fakeDb({ avirzo_pesapal_orders: orders, avirzo_billing_accounts: accounts });
  const calls = { credits: [], notes: [], invalidated: [], status: 0 };
  let clock = now;
  const s = createSettlement({
    supabaseAdmin: db,
    pesapal: { getTransactionStatus: async () => { calls.status++; return typeof status === 'function' ? status() : status; } },
    addCredits: async (...a) => { calls.credits.push(a); return { ok: true }; },
    invalidatePlanCache: id => calls.invalidated.push(id),
    now: () => clock, notify: (...a) => calls.notes.push(a)
  });
  return { ...s, db, calls, tick: ms => { clock += ms; }, nowMs: () => clock };
}

test('catalog: provider choice, price floors and the exchange-rate requirement', () => {
  assert.equal(billingProvider({}), 'stripe');
  assert.equal(billingProvider({ PESAPAL_CONSUMER_KEY: 'k', PESAPAL_CONSUMER_SECRET: 's' }), 'pesapal');
  assert.equal(billingProvider({ PESAPAL_CONSUMER_KEY: 'k', PESAPAL_CONSUMER_SECRET: 's', BILLING_PROVIDER: 'stripe' }), 'stripe');
  const env = { PESAPAL_CURRENCY: 'UGX', PESAPAL_CREATOR_PRICE: '70000', PESAPAL_STUDIO_PRICE: '20000', PESAPAL_PACK_STARTER_PRICE: '25000', PESAPAL_PACK_PRO_PRICE: '1000' };
  assert.deepEqual(offeredPesapalPlans(env), [], 'no UGX rate set: nothing is offered');
  assert.equal(unitsPerUsd({ PESAPAL_CURRENCY: 'USD' }), 1);
  assert.equal(unitsPerUsd({}), 1, 'USD is the default currency');
  const ok = { ...env, PESAPAL_UNITS_PER_USD: '3700' };
  assert.deepEqual(offeredPesapalPlans(ok).map(p => p.id), ['creator'], 'Studio at UGX 20,000 cannot cover 1,800 credits of provider cost');
  assert.deepEqual(offeredPesapalPacks(ok).map(p => p.id), ['starter'], 'Pro pack at UGX 1,000 is below the per-credit floor');
  assert.ok(pesapalWarnings(ok).length >= 2);
  assert.equal(offeredPesapalPlans(ok)[0].days, 30);
});

test('prepaid Pesapal plans stop at the end of the paid period', () => {
  const now = Date.UTC(2026, 9, 29);
  const row = (o) => ({ plan: 'creator', status: 'active', provider: 'pesapal', current_period_end: new Date(now + DAY).toISOString(), ...o });
  assert.equal(effectivePlanFromAccount(row(), now), 'creator');
  assert.equal(effectivePlanFromAccount(row({ current_period_end: new Date(now - 1).toISOString() }), now), 'free');
  assert.equal(effectivePlanFromAccount(row({ current_period_end: null }), now), 'free');
  assert.equal(effectivePlanFromAccount(row({ status: 'canceled' }), now), 'free');
  assert.equal(effectivePlanFromAccount({ plan: 'studio', status: 'active', provider: 'stripe', current_period_end: null }, now), 'studio', 'Stripe rows keep working as before');
  assert.equal(effectivePlanFromAccount(null, now), 'free');
});

test('a paid credit pack is granted exactly once, even with concurrent callbacks', async () => {
  const t = setup();
  const [a, b] = await Promise.all([t.settle({ ref: 'AV-1', orderTrackingId: 'trk-1' }), t.settle({ ref: 'AV-1', orderTrackingId: 'trk-1' })]);
  assert.ok([a.state, b.state].includes('completed'));
  const again = await t.settle({ ref: 'AV-1', orderTrackingId: 'trk-1' });
  assert.equal(again.state, 'completed');
  assert.equal(t.calls.credits.length, 1);
  assert.deepEqual(t.calls.credits[0].slice(0, 3), ['u1', 300, 'pesapal_pack:AV-1']);
  assert.equal(t.db.tables.avirzo_pesapal_orders[0].status, 'completed');
});

test('a paid plan activates for 30 days; paying again extends it, switching restarts it', async () => {
  const now = Date.UTC(2026, 9, 29);
  const plan = { kind: 'plan', item_id: 'creator', credits: 600, plan_days: 30, amount: 70000 };
  const t = setup({ orders: [order(plan)], status: { status_code: 1, merchant_reference: 'AV-1', amount: 70000, currency: 'UGX' }, now });
  assert.equal((await t.settle({ ref: 'AV-1', orderTrackingId: 'trk-1' })).state, 'completed');
  const acct = t.db.tables.avirzo_billing_accounts[0];
  assert.equal(acct.plan, 'creator'); assert.equal(acct.provider, 'pesapal'); assert.equal(acct.provider_subscription_id, 'AV-1');
  assert.equal(Date.parse(acct.current_period_end), now + 30 * DAY);
  assert.deepEqual(t.calls.invalidated, ['u1']);
  // renew the same plan 10 days later: extends from the existing end
  t.db.tables.avirzo_pesapal_orders.push(order({ ...plan, merchant_reference: 'AV-2', order_tracking_id: 'trk-2' }));
  t.tick(10 * DAY);
  const t2 = createSettlement({ supabaseAdmin: t.db, pesapal: { getTransactionStatus: async () => ({ status_code: 1, merchant_reference: 'AV-2', amount: 70000, currency: 'UGX' }) }, addCredits: async () => ({ ok: true }), now: () => t.nowMs(), notify() {} });
  await t2.settle({ ref: 'AV-2', orderTrackingId: 'trk-2' });
  assert.equal(Date.parse(t.db.tables.avirzo_billing_accounts[0].current_period_end), now + 60 * DAY);
  // switch to studio: a fresh 30-day period from now
  t.db.tables.avirzo_pesapal_orders.push(order({ ...plan, item_id: 'studio', merchant_reference: 'AV-3', order_tracking_id: 'trk-3' }));
  const t3 = createSettlement({ supabaseAdmin: t.db, pesapal: { getTransactionStatus: async () => ({ status_code: 1, merchant_reference: 'AV-3', amount: 70000, currency: 'UGX' }) }, addCredits: async () => ({ ok: true }), now: () => t.nowMs(), notify() {} });
  await t3.settle({ ref: 'AV-3', orderTrackingId: 'trk-3' });
  const a3 = t.db.tables.avirzo_billing_accounts[0];
  assert.equal(a3.plan, 'studio'); assert.equal(Date.parse(a3.current_period_end), t.nowMs() + 30 * DAY);
});

test('wrong amount, wrong currency, wrong reference or wrong tracking id never grant anything', async () => {
  for (const [name, status, tracking] of [
    ['amount', { status_code: 1, merchant_reference: 'AV-1', amount: 100, currency: 'UGX' }, 'trk-1'],
    ['currency', { status_code: 1, merchant_reference: 'AV-1', amount: 20000, currency: 'KES' }, 'trk-1'],
    ['reference', { status_code: 1, merchant_reference: 'AV-OTHER', amount: 20000, currency: 'UGX' }, 'trk-1'],
    ['tracking', { status_code: 1, merchant_reference: 'AV-1', amount: 20000, currency: 'UGX' }, 'trk-evil']
  ]) {
    const t = setup({ status });
    const r = await t.settle({ ref: 'AV-1', orderTrackingId: tracking });
    assert.equal(r.state, 'mismatch', name);
    assert.equal(t.calls.credits.length, 0, name);
  }
  const t = setup({ status: { status_code: 1, merchant_reference: 'AV-1', amount: 100, currency: 'UGX' } });
  await t.settle({ ref: 'AV-1', orderTrackingId: 'trk-1' });
  assert.equal(t.db.tables.avirzo_pesapal_orders[0].status, 'mismatch');
  assert.equal(t.calls.notes[0][0], 'pesapal_mismatch');
});

test('pending, failed and unknown payments grant nothing', async () => {
  let t = setup({ status: { status_code: 0, merchant_reference: 'AV-1' } });
  assert.equal((await t.settle({ ref: 'AV-1', orderTrackingId: 'trk-1' })).state, 'pending');
  t = setup({ status: { status_code: 2, merchant_reference: 'AV-1' } });
  assert.equal((await t.settle({ ref: 'AV-1', orderTrackingId: 'trk-1' })).state, 'failed');
  assert.equal(t.db.tables.avirzo_pesapal_orders[0].status, 'failed');
  assert.equal(t.calls.credits.length, 0);
  assert.equal((await setup().settle({ ref: 'AV-nope', orderTrackingId: 'x' })).state, 'unknown');
  assert.equal((await setup({ orders: [order({ order_tracking_id: null })] }).settle({ ref: 'AV-1' })).state, 'pending');
});

test('a customer can retry after a failed attempt on the same order', async () => {
  let code = 2;
  const t = setup({ status: () => ({ status_code: code, merchant_reference: 'AV-1', amount: 20000, currency: 'UGX' }) });
  assert.equal((await t.settle({ ref: 'AV-1', orderTrackingId: 'trk-1' })).state, 'failed');
  code = 1;
  assert.equal((await t.settle({ ref: 'AV-1', orderTrackingId: 'trk-1' })).state, 'completed');
  assert.equal(t.calls.credits.length, 1);
});

test('a reversed plan payment removes access; a reversed pack alerts the operator', async () => {
  const now = Date.UTC(2026, 9, 29);
  const plan = { kind: 'plan', item_id: 'creator', credits: 600, plan_days: 30, amount: 70000 };
  const t = setup({ orders: [order(plan)], status: { status_code: 1, merchant_reference: 'AV-1', amount: 70000, currency: 'UGX' }, now });
  await t.settle({ ref: 'AV-1', orderTrackingId: 'trk-1' });
  assert.equal(effectivePlanFromAccount(t.db.tables.avirzo_billing_accounts[0], now + DAY), 'creator');
  const rev = createSettlement({ supabaseAdmin: t.db, pesapal: { getTransactionStatus: async () => ({ status_code: 3, merchant_reference: 'AV-1' }) }, addCredits: async () => ({ ok: true }), now: () => now + DAY, notify: (...a) => t.calls.notes.push(a) });
  assert.equal((await rev.settle({ ref: 'AV-1', orderTrackingId: 'trk-1', recheck: true })).state, 'reversed');
  assert.equal(effectivePlanFromAccount(t.db.tables.avirzo_billing_accounts[0], now + DAY), 'free');
  assert.equal(t.calls.notes.at(-1)[0], 'pesapal_reversal');
  const p = setup({ status: { status_code: 3, merchant_reference: 'AV-1' } });
  assert.equal((await p.settle({ ref: 'AV-1', orderTrackingId: 'trk-1', recheck: true })).state, 'reversed');
  assert.equal(p.calls.notes[0][0], 'pesapal_reversal');
});

test('a crashed grant is retried after the claim goes stale, without double-extending a plan', async () => {
  const now = Date.UTC(2026, 9, 29);
  const plan = { kind: 'plan', item_id: 'creator', credits: 600, plan_days: 30, amount: 70000 };
  const t = setup({ orders: [order(plan)], status: { status_code: 1, merchant_reference: 'AV-1', amount: 70000, currency: 'UGX' }, now });
  const real = t.db.from; let fail = true;
  t.db.from = name => { const b = real(name); if (name === 'avirzo_pesapal_orders' && fail) { const upd = b.update; b.update = p => { if (p.status === 'completed') throw new Error('db down'); return upd(p); }; } return b; };
  await assert.rejects(t.settle({ ref: 'AV-1', orderTrackingId: 'trk-1' }), /db down/);
  assert.equal(t.db.tables.avirzo_pesapal_orders[0].status, 'processing');
  fail = false;
  assert.equal((await t.settle({ ref: 'AV-1', orderTrackingId: 'trk-1' })).state, 'pending', 'too soon to reclaim');
  t.tick(3 * 60_000); t.db.tables.avirzo_pesapal_orders[0].updated_at = new Date(now).toISOString();
  assert.equal((await t.settle({ ref: 'AV-1', orderTrackingId: 'trk-1' })).state, 'completed');
  assert.equal(Date.parse(t.db.tables.avirzo_billing_accounts[0].current_period_end), now + 30 * DAY, 'granted once');
});

test('Pesapal client caches the token, reuses a registered IPN and reports API errors', async () => {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    calls.push([url, init.method || 'GET']);
    const json = d => ({ ok: true, status: 200, json: async () => d });
    if (url.endsWith('/Auth/RequestToken')) return json({ token: 'T', expiryDate: new Date(Date.now() + 300000).toISOString() });
    if (url.endsWith('/URLSetup/GetIpnList')) return json([{ url: 'https://app.test/api/billing/pesapal/ipn', ipn_id: 'IPN1' }]);
    if (url.includes('SubmitOrderRequest')) { const b = JSON.parse(init.body); return b.amount > 0 ? json({ order_tracking_id: 'O1', redirect_url: 'https://pay.test/x' }) : { ok: false, status: 400, json: async () => ({ error: { message: 'bad' } }) }; }
    return { ok: false, status: 404, json: async () => ({}) };
  };
  const p = createPesapal({ env: { PESAPAL_CONSUMER_KEY: 'k', PESAPAL_CONSUMER_SECRET: 's' }, fetchImpl });
  assert.match(p.base(), /cybqa\.pesapal\.com/, 'sandbox unless PESAPAL_ENV=live');
  assert.equal(await p.getIpnId('https://app.test/'), 'IPN1');
  const o = await p.submitOrder({ ref: 'AV-1', amount: 100, currency: 'UGX', description: 'x', callbackUrl: 'c', cancelUrl: 'n', ipnId: 'IPN1', email: 'a@b.co', name: 'Ann' });
  assert.equal(o.redirectUrl, 'https://pay.test/x');
  await assert.rejects(p.submitOrder({ ref: 'AV-2', amount: 0, currency: 'UGX', description: 'x', callbackUrl: 'c', cancelUrl: 'n', ipnId: 'I', email: 'a@b.co' }), /Pesapal order failed: bad/);
  assert.equal(calls.filter(c => c[0].endsWith('/Auth/RequestToken')).length, 1, 'token fetched once');
  assert.equal(createPesapal({ env: { PESAPAL_ENV: 'live' } }).base(), 'https://pay.pesapal.com/v3/api');
  await assert.rejects(createPesapal({ env: {}, fetchImpl }).getToken(), /not configured/);
});

function fakeApp() {
  const routes = {};
  const reg = m => (path, ...fns) => { routes[`${m} ${path}`] = fns.at(-1); };
  return { routes, get: reg('GET'), post: reg('POST') };
}
const fakeRes = () => ({ code: 200, body: null, redirected: null, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; }, redirect(c, u) { this.redirected = [c, u]; return this; } });

test('checkout creates an order, binds the tracking id and returns the Pesapal link', async () => {
  const saved = { ...process.env }; const realFetch = globalThis.fetch;
  Object.assign(process.env, { PESAPAL_CONSUMER_KEY: 'k', PESAPAL_CONSUMER_SECRET: 's', PESAPAL_IPN_ID: 'IPN1', PESAPAL_CREATOR_PRICE: '70000', PESAPAL_UNITS_PER_USD: '3700', AVIRZO_PUBLIC_URL: 'https://app.test', PESAPAL_CURRENCY: 'UGX' });
  let submitted = null;
  globalThis.fetch = async (url, init = {}) => {
    const json = d => ({ ok: true, status: 200, json: async () => d });
    if (url.endsWith('/Auth/RequestToken')) return json({ token: 'T' });
    if (url.includes('SubmitOrderRequest')) { submitted = JSON.parse(init.body); return json({ order_tracking_id: 'O1', redirect_url: 'https://pay.test/x' }); }
    return { ok: false, status: 404, json: async () => ({}) };
  };
  try {
    const db = fakeDb(); const app = fakeApp(); const ctx = { supabaseAdmin: db, requireCloudUser: async () => ({ id: 'u1', email: 'a@b.co', user_metadata: {} }), addCredits: async () => ({ ok: true }) };
    registerRoutes(app, ctx);
    assert.equal(ctx.pesapal.active(), true);
    const res = fakeRes();
    await ctx.pesapal.checkout({}, res, { id: 'u1', email: 'a@b.co', user_metadata: {} }, { kind: 'plan', id: 'creator' });
    assert.equal(res.code, 200); assert.equal(res.body.url, 'https://pay.test/x');
    const row = db.tables.avirzo_pesapal_orders[0];
    assert.equal(row.amount, 70000); assert.equal(row.order_tracking_id, 'O1'); assert.equal(row.status, 'pending');
    assert.match(row.merchant_reference, /^AV-[a-z0-9]+-[a-f0-9]{10}$/); assert.ok(row.merchant_reference.length <= 50);
    assert.equal(submitted.callback_url, 'https://app.test/api/billing/pesapal/return');
    assert.equal(submitted.amount, 70000);
    // unknown plan / unconfigured price is refused, nothing created
    const bad = fakeRes();
    await ctx.pesapal.checkout({}, bad, { id: 'u1' }, { kind: 'plan', id: 'studio' });
    assert.equal(bad.code, 503); assert.equal(db.tables.avirzo_pesapal_orders.length, 1);
    // the client can never choose the price: amount comes from the catalog only
    assert.equal(ctx.pesapal.checkout.length, 4);
  } finally { globalThis.fetch = realFetch; for (const k of Object.keys(process.env)) if (!(k in saved)) delete process.env[k]; Object.assign(process.env, saved); }
});

test('IPN acknowledges unknown references, rejects missing ids, and the return route redirects safely', async () => {
  const saved = { ...process.env };
  Object.assign(process.env, { AVIRZO_PUBLIC_URL: 'https://app.test' });
  try {
    const db = fakeDb({ avirzo_pesapal_orders: [order()] }); const app = fakeApp();
    registerRoutes(app, { supabaseAdmin: db, requireCloudUser: async () => null, addCredits: async () => ({ ok: true }) });
    let res = fakeRes();
    await app.routes['GET /api/billing/pesapal/ipn']({ query: {}, body: {} }, res);
    assert.equal(res.body.status, 500);
    res = fakeRes();
    await app.routes['GET /api/billing/pesapal/ipn']({ query: { OrderTrackingId: 't', OrderMerchantReference: 'AV-unknown' }, body: {} }, res);
    assert.equal(res.code, 200); assert.equal(res.body.status, 200);
    res = fakeRes();
    await app.routes['GET /api/billing/pesapal/return']({ query: { OrderTrackingId: 't', OrderMerchantReference: 'AV-unknown' } }, res);
    assert.deepEqual(res.redirected, [302, 'https://app.test/?billing=pesapal_pending&ref=AV-unknown']);
  } finally { for (const k of Object.keys(process.env)) if (!(k in saved)) delete process.env[k]; Object.assign(process.env, saved); }
});

test('Pesapal wiring, migration, docs and config ship with the release', () => {
  const app = read('server/src/app.js'), billing = read('server/src/routes/billing.js'), core = read('server/src/services/core.js');
  assert.match(app, /registerPesapal\(app, ctx\)/);
  assert.match(app, /\/api\/billing\/pesapal\//);
  assert.match(billing, /ctx\.pesapal\?\.active\(\)/);
  assert.match(core, /effectivePlanFromAccount/);
  assert.match(read('supabase-pesapal.sql'), /avirzo_pesapal_orders/);
  for (const k of ['PESAPAL_CONSUMER_KEY', 'PESAPAL_CONSUMER_SECRET', 'PESAPAL_ENV', 'PESAPAL_CREATOR_PRICE', 'PESAPAL_STUDIO_PRICE', 'PESAPAL_UNITS_PER_USD']) {
    assert.match(read('.env.example'), new RegExp(`${k}=`), k);
    assert.match(read('render.yaml'), new RegExp(`key: ${k}`), k);
  }
  assert.match(read('client/src/components/BillingPanel.jsx'), /\/api\/billing\/pesapal\/verify/);
});

test('the database itself blocks a second grant for the same pack payment', () => {
  assert.match(read('supabase-pesapal.sql'), /unique index if not exists avirzo_credit_ledger_unique_pesapal_pack[\s\S]*reason like 'pesapal_pack:%'/);
});

test('a pack is credited once even if the first attempt crashed after adding credits', async () => {
  const granted = new Set(); let balance = 0;
  const addCredits = async (user, n, reason) => { if (granted.has(`${user}|${reason}`)) return { ok: true, already: true }; granted.add(`${user}|${reason}`); balance += n; return { ok: true }; };
  const db = fakeDb({ avirzo_pesapal_orders: [order()] });
  let crash = true; const real = db.from;
  db.from = name => { const b = real(name); if (name === 'avirzo_pesapal_orders') { const upd = b.update; b.update = p => { if (p.status === 'completed' && crash) throw new Error('crash before finalize'); return upd(p); }; } return b; };
  let clock = Date.UTC(2026, 9, 29);
  const s = createSettlement({ supabaseAdmin: db, pesapal: { getTransactionStatus: async () => ({ status_code: 1, merchant_reference: 'AV-1', amount: 20000, currency: 'UGX' }) }, addCredits, now: () => clock, notify() {} });
  await assert.rejects(s.settle({ ref: 'AV-1', orderTrackingId: 'trk-1' }), /crash/);
  crash = false; clock += 3 * 60_000; db.tables.avirzo_pesapal_orders[0].updated_at = new Date(clock - 3 * 60_000).toISOString();
  assert.equal((await s.settle({ ref: 'AV-1', orderTrackingId: 'trk-1' })).state, 'completed');
  assert.equal(balance, 300, 'credited exactly once');
});

test('each Pesapal return state maps to a distinct billing value that main.jsx routes to the billing panel', () => {
  const route = read('server/src/routes/pesapal.js'), main = read('client/src/main.jsx'), panel = read('client/src/components/BillingPanel.jsx');
  for (const v of ['pesapal_success', 'pesapal_credits', 'pesapal_failed', 'pesapal_pending']) { assert.ok(route.includes(v), v); assert.ok(panel.includes(v), `panel ${v}`); }
  assert.match(main, /b\.startsWith\('pesapal_'\)\)\{ setShowBilling\(true\)/);
});


test('USD is the default: standard dollar prices are offered with no rate or price settings', () => {
  const plans = offeredPesapalPlans({});
  assert.deepEqual(plans.map(p => [p.id, p.amount, p.currency, p.label]), [['creator', 19, 'USD', '$19'], ['studio', 59, 'USD', '$59']]);
  assert.deepEqual(offeredPesapalPacks({}).map(p => [p.id, p.amount, p.credits]), [['starter', 6, 300], ['pro', 20, 1000], ['studio', 55, 3000]]);
  assert.deepEqual(pesapalWarnings({}), []);
  assert.equal(offeredPesapalPlans({ PESAPAL_CREATOR_PRICE: '25' })[0].amount, 25);
  assert.deepEqual(offeredPesapalPlans({ PESAPAL_CREATOR_PRICE: '2', PESAPAL_STUDIO_PRICE: '59' }).map(p => p.id), ['studio'], 'a $2 Creator plan cannot cover its credits');
  assert.equal(offeredPesapalPacks({ CREDIT_PACK_STARTER_PRICE_USD: '8' })[0].amount, 8);
  assert.deepEqual(offeredPesapalPlans({ PESAPAL_CURRENCY: 'KES' }), [], 'other currencies still need explicit prices and a rate');
});
