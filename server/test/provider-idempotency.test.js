import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRunwayProvider } from '../src/services/videoProvider.js';
import { createJobService } from '../src/services/jobs.js';

const mkResp = (status, body) => ({ ok: status < 400, status, json: async () => body });
const mk = fetchImpl => createRunwayProvider({ apiBase: 'https://x', headers: () => ({}), pickModel: () => 'gen4.5', fetchImpl });

test('provider retries once without the reference image when it is rejected', async () => {
  const bodies = [];
  const p = mk(async (_u, o) => { const b = JSON.parse(o.body); bodies.push(b); return b.promptImage ? mkResp(400, { error: 'Invalid image' }) : mkResp(200, { id: 't1' }); });
  const r = await p.submit({ promptText: 'a', ratio: '1280:720', seconds: 5, ref: 'https://img', plan: 'free' });
  assert.equal(r.response.ok, true);
  assert.equal(r.usedReference, false);
  assert.equal(bodies.length, 2);
  assert.ok(!('promptImage' in bodies[1]));
});

test('provider does not retry a safety refusal', async () => {
  let n = 0;
  const p = mk(async () => { n++; return mkResp(400, { error: 'Blocked by content moderation policy' }); });
  const r = await p.submit({ promptText: 'a', ratio: 'r', seconds: 5, ref: 'https://img', plan: 'free' });
  assert.equal(r.response.ok, false);
  assert.equal(n, 1);
});

test('provider truncates the prompt to 1000 characters', async () => {
  let sent;
  const p = mk(async (_u, o) => { sent = JSON.parse(o.body); return mkResp(200, { id: 't' }); });
  await p.submit({ promptText: 'x'.repeat(2000), ratio: 'r', seconds: 5, ref: '', plan: 'free' });
  assert.equal(sent.promptText.length, 1000);
});

test('jobs can be found again by idempotency key, per user', async () => {
  const jobs = createJobService({ supabaseAdmin: null });
  const j = await jobs.create({ userId: 'u1', type: 'video_generation', payload: { idempotencyKey: 'k1' } });
  assert.equal((await jobs.findByIdempotencyKey('u1', 'k1')).id, j.id);
  assert.equal(await jobs.findByIdempotencyKey('u2', 'k1'), null);
  assert.equal(await jobs.findByIdempotencyKey('u1', 'nope'), null);
});

test('generate route checks the idempotency key before charging, and client sends one', () => {
  const route = fs.readFileSync(new URL('../src/routes/generation.js', import.meta.url), 'utf8');
  assert.ok(route.indexOf('findByIdempotencyKey') < route.indexOf("requireProviderUser(req, res, 'generation'"));
  const client = fs.readFileSync(new URL('../../client/src/main.jsx', import.meta.url), 'utf8');
  assert.match(client, /idempotencyKey:newIdempotencyKey/);
  assert.match(client, /if\(projectId\)\{ setProjectId\(''\)/);
});
