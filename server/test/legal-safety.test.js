import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { screenText, screenBody, collectStrings } from '../src/services/moderation.js';
import { notifyOps, _resetAlertsForTest } from '../src/services/alerts.js';
import { registerRoutes, LEGAL_VERSION } from '../src/routes/account.js';

const read = p => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

test('moderation blocks never-acceptable categories and allows ordinary film prompts', () => {
  assert.equal(screenText('A nude woman dancing').category, 'explicit_sexual_content');
  assert.equal(screenText('a 15 year old girl in a sexual scene').category, 'sexual_content_minors');
  assert.equal(screenText('deepfake of the president announcing war').category, 'deepfake_impersonation');
  assert.equal(screenText('how to build a bomb').category, 'weapons_instructions');
  for (const ok of ['A Buganda drummer at sunrise, wide shot', 'Children playing near the lake at dawn', 'The king speaks to the elders about the harvest', 'a naked eye view of the Rwenzori mountains']) {
    assert.equal(screenText(ok).blocked, false, ok);
  }
});

test('moderation scans nested bodies but skips data URLs and image fields', () => {
  assert.equal(screenBody({ scenes: [{ prompt: 'nsfw scene' }] }).blocked, true);
  assert.equal(screenBody({ referenceImage: 'nsfw', prompt: 'a calm river' }).blocked, false);
  assert.deepEqual(collectStrings({ a: 'data:image/png;base64,AAAA', b: 'hello' }), ['hello']);
  assert.equal(collectStrings({ big: 'x'.repeat(30000) }).length, 0);
});

test('operator alerts need an https webhook and are rate limited', async () => {
  _resetAlertsForTest();
  const calls = [];
  const fetchImpl = async (url, init) => { calls.push([url, JSON.parse(init.body).text]); return { ok: true }; };
  assert.equal(await notifyOps('x', 'boom', { env: {}, fetchImpl }), false);
  assert.equal(await notifyOps('x', 'boom', { env: { AVIRZO_OPS_ALERT_WEBHOOK_URL: 'http://insecure' }, fetchImpl }), false);
  const env = { AVIRZO_FINANCE_ALERT_WEBHOOK_URL: 'https://hooks.example/abc', NODE_ENV: 'production' };
  assert.equal(await notifyOps('server_error', 'boom', { env, fetchImpl, now: 1_000_000 }), true);
  assert.equal(await notifyOps('server_error', 'boom', { env, fetchImpl, now: 1_000_500 }), false);
  assert.equal(calls.length, 1);
  assert.match(calls[0][1], /server_error: boom/);
});

function fakeApp() {
  const routes = {};
  const reg = method => (path, fn) => { routes[`${method} ${path}`] = fn; };
  return { routes, get: reg('GET'), post: reg('POST'), delete: reg('DELETE') };
}
function fakeRes() {
  return { code: 200, body: null, headers: {}, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; }, send(b) { this.body = b; return this; }, set(h) { Object.assign(this.headers, h); return this; } };
}
function fakeAdmin(log, { stripeSub = null } = {}) {
  const table = name => ({
    select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: name === 'avirzo_billing_accounts' ? stripeSub : null }), limit: async () => ({ data: [{ id: 'row' }] }) }) }),
    upsert: async row => { log.push(['upsert', name, row]); return { error: null }; },
    insert: async row => { log.push(['insert', name, row]); return { error: null }; }
  });
  return {
    from: table,
    storage: { from: () => ({
      list: async (dir) => ({ data: dir === 'u1' ? [{ id: 'f1', name: 'a.mp3' }] : [], error: null }),
      remove: async paths => { log.push(['remove', paths]); return { error: null }; }
    }) },
    auth: { admin: { deleteUser: async id => { log.push(['deleteUser', id]); return { error: null }; } } }
  };
}
const user = { id: 'u1', email: 'a@b.co', created_at: 'now', user_metadata: {} };

test('consent requires both boxes and records the current legal version', async () => {
  const log = []; const app = fakeApp();
  registerRoutes(app, { supabaseAdmin: fakeAdmin(log), authUser: async () => user });
  let res = fakeRes();
  await app.routes['POST /api/account/consent']({ body: { terms: true } }, res);
  assert.equal(res.code, 400);
  res = fakeRes();
  await app.routes['POST /api/account/consent']({ body: { terms: true, likeness: true } }, res);
  assert.equal(res.code, 200);
  assert.equal(log[0][2].legal_version, LEGAL_VERSION);
});

test('account export returns a JSON attachment with the user identity', async () => {
  const log = []; const app = fakeApp();
  registerRoutes(app, { supabaseAdmin: fakeAdmin(log), authUser: async () => user });
  const res = fakeRes();
  await app.routes['GET /api/account/export']({}, res);
  const data = JSON.parse(res.body);
  assert.equal(data.account.id, 'u1');
  assert.match(res.headers['Content-Disposition'], /avirzo-my-data\.json/);
});

test('account deletion needs DELETE, removes media, then removes the user', async () => {
  const log = []; const app = fakeApp();
  registerRoutes(app, { supabaseAdmin: fakeAdmin(log), authUser: async () => user });
  let res = fakeRes();
  await app.routes['DELETE /api/account']({ body: { confirm: 'nope' } }, res);
  assert.equal(res.code, 400); assert.equal(log.length, 0);
  res = fakeRes();
  await app.routes['DELETE /api/account']({ body: { confirm: 'DELETE' } }, res);
  assert.equal(res.code, 200);
  assert.deepEqual(log.map(x => x[0]), ['remove', 'deleteUser']);
  assert.deepEqual(log[0][1], ['u1/a.mp3']);
});

test('signed-out users cannot use account routes', async () => {
  const app = fakeApp();
  registerRoutes(app, { supabaseAdmin: fakeAdmin([]), authUser: async () => null });
  const res = fakeRes();
  await app.routes['DELETE /api/account']({ body: { confirm: 'DELETE' } }, res);
  assert.equal(res.code, 401);
});

test('reports are stored with a valid reason', async () => {
  const log = []; const app = fakeApp();
  registerRoutes(app, { supabaseAdmin: fakeAdmin(log), authUser: async () => user });
  const res = fakeRes();
  await app.routes['POST /api/report']({ body: { reason: 'bogus', details: 'bad', projectId: 'p1' } }, res);
  assert.equal(res.code, 200);
  assert.equal(log[0][2].reason, 'other');
});

test('legal pages, migration and wiring ship with the release', () => {
  for (const f of ['client/public/terms.html', 'client/public/privacy.html', 'supabase-legal-safety.sql', 'client/src/components/ConsentGate.jsx', 'client/src/components/DataPrivacyPanel.jsx']) assert.ok(existsSync(new URL(`../../${f}`, import.meta.url)), f);
  const app = read('server/src/app.js');
  assert.match(app, /registerAccount\(app, ctx\)/);
  assert.match(app, /CONSENT_REQUIRED/);
  assert.match(app, /CONTENT_POLICY/);
  assert.match(app, /'\/api\/account', '\/api\/report'/);
  assert.match(read('client/src/main.jsx'), /<ConsentGate/);
  assert.match(read('client/src/components/ProfilePanel.jsx'), /DataPrivacyPanel/);
  assert.match(read('render.yaml'), /AVIRZO_OPS_ALERT_WEBHOOK_URL/);
  assert.match(read('.env.example'), /AVIRZO_OPS_ALERT_WEBHOOK_URL=/);
  assert.match(read('supabase-legal-safety.sql'), /avirzo_content_reports/);
});

test('service worker only refreshes the offline shell from the app root, not legal pages', () => {
  const sw = read('client/public/sw.js');
  assert.match(sw, /url\.pathname === '\/' \|\| url\.pathname === '\/index\.html'/);
});

test('data export uses real column names and refuses to hand over a silently incomplete file', async () => {
  const app = fakeApp(); const asked = [];
  const admin = { from: table => ({ select: cols => { asked.push([table, cols]); return { eq: () => ({ limit: async () => ({ data: [], error: table === 'avirzo_jobs' && asked.broken ? { message: 'column does not exist' } : null }) }) }; } }) };
  registerRoutes(app, { supabaseAdmin: admin, authUser: async () => user });
  let res = fakeRes();
  await app.routes['GET /api/account/export']({}, res);
  assert.equal(res.code, 200);
  assert.ok(asked.find(a => a[0] === 'avirzo_jobs')[1].split(',').includes('type'), 'jobs use the "type" column');
  assert.ok(!asked.find(a => a[0] === 'avirzo_jobs')[1].split(',').includes('kind'));
  asked.broken = true; res = fakeRes();
  await app.routes['GET /api/account/export']({}, res);
  assert.equal(res.code, 500);
});
