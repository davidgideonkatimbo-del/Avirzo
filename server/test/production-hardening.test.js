import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root = new URL('..', import.meta.url);
const read = (p) => fs.readFileSync(new URL(p, root), 'utf8');

test('asset delete selects ownership fields used by the authorization guard', () => {
  const route = read('src/routes/assets.js');
  assert.match(route, /select\('storage_path,project_id,user_id'\)/);
  assert.match(route, /data\.project_id/);
  assert.match(route, /data\.user_id/);
});

test('production app refuses to boot without Supabase', () => {
  const app = read('src/app.js');
  assert.match(app, /core\.IS_PRODUCTION/);
  assert.match(app, /SUPABASE_URL/);
  assert.match(app, /SUPABASE_PUBLISHABLE_KEY/);
  assert.match(app, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(app, /Local JSON project storage is disabled in production/);
});

test('production exports run inline when the worker is intentionally disabled', () => {
  const route = read('src/routes/export.js');
  assert.match(route, /WORKER_ENABLED/);
  assert.match(route, /if \(IS_PRODUCTION && WORKER_ENABLED\)/);
  assert.match(route, /processFilmExport\(/);
});

test('free generation uses a yearly credit window', () => {
  const core = read('src/services/core.js');
  assert.match(core, /generation:\s*\{\s*windowMs:\s*365 \* 24 \* 60 \* 60 \* 1000,\s*max:\s*20,\s*window:\s*'year'/);
  assert.match(core, /window === 'year'/);
  assert.match(core, /Date\.UTC\(start\.getUTCFullYear\(\), 0, 1\)/);
  assert.match(core, /usageRetryAfter/);
});

test('worker opt-in is explicit so a disabled worker cannot strand production exports', () => {
  const render = read('../render.yaml');
  assert.match(render, /AVIRZO_WORKER_ENABLED/);
  assert.match(render, /value: 'false'/);
});
