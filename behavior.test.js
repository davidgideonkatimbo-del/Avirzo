import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { isPrivateIp, isRetryable, assertSafeUrl } from '../src/services/safeFetch.js';
import { createJobService } from '../src/services/jobs.js';

test('isPrivateIp blocks private, loopback, link-local and mapped IPv6 addresses', () => {
  for (const ip of ['127.0.0.1', '10.1.2.3', '192.168.0.5', '172.16.0.1', '169.254.169.254', '::1', '::ffff:127.0.0.1', 'fd00::1'])
    assert.equal(isPrivateIp(ip), true, ip);
  for (const ip of ['8.8.8.8', '1.1.1.1', '2606:4700:4700::1111']) assert.equal(isPrivateIp(ip), false, ip);
});

test('assertSafeUrl rejects http, credentials, odd ports and local hosts', () => {
  for (const u of ['http://example.com/a', 'https://user:pw@example.com/', 'https://example.com:8443/', 'https://localhost/', 'https://10.0.0.1/', 'not a url'])
    assert.throws(() => assertSafeUrl(u), u);
  assert.doesNotThrow(() => assertSafeUrl('https://example.com/video.mp4'));
});

test('isRetryable retries only transient failures', () => {
  const http = status => Object.assign(new Error(`Remote server returned ${status}.`), { status });
  for (const s of [408, 429, 500, 502, 503]) assert.equal(isRetryable(http(s)), true, String(s));
  for (const s of [400, 401, 403, 404, 410]) assert.equal(isRetryable(http(s)), false, String(s));
  assert.equal(isRetryable(new Error('socket hang up')), true);
  assert.equal(isRetryable(new Error('Remote server timed out.')), true);
  assert.equal(isRetryable(new Error('Media URL points to a disallowed address.')), false);
  assert.equal(isRetryable(new Error('Remote file is too large.')), false);
});

test('jobs get priority by type: analysis 1, generation 5, export 10', async () => {
  const jobs = createJobService({ supabaseAdmin: null });
  const make = type => jobs.create({ userId: 'u1', type });
  assert.equal((await make('story_analysis')).priority, 1);
  assert.equal((await make('video_generation')).priority, 5);
  assert.equal((await make('film_export')).priority, 10);
  assert.equal((await jobs.create({ userId: 'u1', type: 'film_export', priority: 2 })).priority, 2);
});

test('invites expire, need a confirmed matching email, and never leak raw errors', () => {
  const collab = fs.readFileSync(new URL('../src/routes/collaboration.js', import.meta.url), 'utf8');
  assert.match(collab, /expires_at/);
  assert.match(collab, /status\(410\)/);
  assert.match(collab, /isConfirmed\(user\)/);
  assert.doesNotMatch(collab, /message:\s*e\.message/);
  const sql = fs.readFileSync(new URL('../../supabase.sql', import.meta.url), 'utf8');
  assert.match(sql, /add column if not exists expires_at/);
});

import { createRateLimiter, buildCsp } from '../src/services/security.js';

function fakeRes() {
  return { headers: {}, statusCode: 200, body: null, set(k, v) { this.headers[k] = v; return this; }, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; } };
}

test('rate limiter allows up to max, then answers 429 with Retry-After, per client', () => {
  const limit = createRateLimiter({ windowMs: 60_000, max: 3 });
  const run = ip => { const res = fakeRes(); let passed = false; limit({ ip }, res, () => { passed = true; }); return { res, passed }; };
  for (let i = 0; i < 3; i++) assert.equal(run('1.1.1.1').passed, true);
  const blocked = run('1.1.1.1');
  assert.equal(blocked.passed, false);
  assert.equal(blocked.res.statusCode, 429);
  assert.ok(Number(blocked.res.headers['Retry-After']) >= 1);
  assert.equal(run('2.2.2.2').passed, true);
});

test('CSP locks scripts to self, blocks framing and plugins, and allows the configured Supabase origin', () => {
  const csp = buildCsp({ supabaseUrl: 'https://abc123.supabase.co' });
  assert.match(csp, /script-src 'self'(;|$)/);
  assert.doesNotMatch(csp, /script-src[^;]*unsafe/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /object-src 'none'/);
  assert.match(csp, /connect-src[^;]*https:\/\/abc123\.supabase\.co/);
  assert.doesNotThrow(() => buildCsp({}));
});

test('claim_avirzo_job keeps stale recovery and is re-locked to service_role after the final definition', () => {
  const sql = fs.readFileSync(new URL('../../supabase.sql', import.meta.url), 'utf8');
  const lastCreate = sql.lastIndexOf('create function public.claim_avirzo_job');
  const tail = sql.slice(lastCreate);
  assert.match(tail, /interval '30 minutes'/);
  assert.match(tail, /floor\(extract\(epoch from \(now\(\) - j\.created_at\)\) \/ 300\)/);
  assert.match(tail, /revoke execute on function public\.claim_avirzo_job\(text\[\]\) from public, anon, authenticated/);
  assert.match(tail, /grant execute on function public\.claim_avirzo_job\(text\[\]\) to service_role/);
});

test('app wires rate limits before body parsing and ships CSP in report-only mode by default', () => {
  const app = fs.readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.ok(app.indexOf('apiLimiter') < app.indexOf('const bigJson'));
  assert.match(app, /Content-Security-Policy-Report-Only/);
  assert.match(app, /CSP_ENFORCE/);
});

test('client reads the invite from the share link without breaking the route, and auto-accepts after sign-in', () => {
  const main = fs.readFileSync(new URL('../../client/src/main.jsx', import.meta.url), 'utf8');
  assert.match(main, /split\('\?'\)\[0\]/);                       // page name never includes ?invite=...
  assert.doesNotMatch(main, /window\.location\.hash\.replace\(\/\^#\\\/\?\/, ''\) \|\| 'home'/); // old unsafe parsing is gone
  assert.match(main, /readInviteFromUrl/);
  assert.match(main, /acceptInviteToken\(pendingInvite\)/);
});

import { envInt, scaledLimit, pickGenerationModel } from '../src/services/plans.js';

test('generation limits default to 5/60/200 and can be changed per plan from env', () => {
  const base = envEnv => ({ max: envInt('FREE_GENERATIONS_PER_YEAR', 5, envEnv), perPlan: { free: envInt('FREE_GENERATIONS_PER_YEAR', 5, envEnv), creator: envInt('CREATOR_GENERATIONS_PER_YEAR', 60, envEnv), studio: envInt('STUDIO_GENERATIONS_PER_YEAR', 200, envEnv) } });
  const d = base({});
  assert.deepEqual(['free', 'creator', 'studio'].map(p => scaledLimit(d, p).max), [5, 60, 200]);
  const more = base({ FREE_GENERATIONS_PER_YEAR: '10' });
  assert.deepEqual(['free', 'creator', 'studio'].map(p => scaledLimit(more, p).max), [10, 60, 200]); // paid plans are not shrunk by a smaller free tier
  assert.equal(envInt('X', 7, { X: 'abc' }), 7);
  assert.equal(envInt('X', 7, { X: '-3' }), 7);
});

test('hourly limits still scale by plan multiplier (export 5 -> 5/15/50)', () => {
  const exp = { windowMs: 3600000, max: 5 };
  assert.deepEqual(['free', 'creator', 'studio'].map(p => scaledLimit(exp, p).max), [5, 15, 50]);
});

test('free accounts use the cheaper model only when enabled and a reference image exists', () => {
  const on = { FREE_GENERATION_MODEL: 'gen4_turbo' };
  assert.equal(pickGenerationModel('free', true, on), 'gen4_turbo');
  assert.equal(pickGenerationModel('free', false, on), 'gen4.5');
  assert.equal(pickGenerationModel('creator', true, on), 'gen4.5');
  assert.equal(pickGenerationModel('free', true, {}), 'gen4.5');
  assert.equal(pickGenerationModel('free', true, { FREE_GENERATION_MODEL: 'something-else' }), 'gen4.5');
});

import { freeTrialStatus, TRIAL_GATED_KINDS } from '../src/services/plans.js';

test('free month: 30 days from sign-up, or from the policy start for older accounts', () => {
  const env = { FREE_TRIAL_POLICY_START: '2026-10-09' };
  const day = 86400000, t0 = Date.parse('2026-10-09T00:00:00Z');
  const fresh = freeTrialStatus({ createdAt: '2026-10-20T00:00:00Z', plan: 'free', now: t0 + 25 * day, env });
  assert.equal(fresh.expired, false);
  assert.equal(fresh.endsAt, '2026-11-19T00:00:00.000Z');
  assert.equal(freeTrialStatus({ createdAt: '2026-10-20T00:00:00Z', plan: 'free', now: t0 + 42 * day, env }).expired, true);
  const old = { createdAt: '2025-01-01T00:00:00Z', plan: 'free', env };
  assert.equal(freeTrialStatus({ ...old, now: t0 + 29 * day }).expired, false); // existing accounts still get a full month
  assert.equal(freeTrialStatus({ ...old, now: t0 + 31 * day }).expired, true);
  assert.equal(freeTrialStatus({ createdAt: '2025-01-01T00:00:00Z', plan: 'creator', now: t0 + 400 * day, env }).applies, false);
  assert.equal(freeTrialStatus({ ...old, now: t0 + 400 * day, env: { ...env, FREE_TRIAL_DAYS: '0' } }).expired, false); // 0 = no limit
  assert.equal(freeTrialStatus({ createdAt: '2026-10-20T00:00:00Z', plan: 'free', now: t0 + 40 * day, env: { ...env, FREE_TRIAL_DAYS: '60' } }).expired, false);
});

test('after the free month only provider-cost features are blocked; exports and project access stay open', () => {
  assert.deepEqual([...TRIAL_GATED_KINDS].sort(), ['generation', 'performance', 'voice']);
  const core = fs.readFileSync(new URL('../src/services/core.js', import.meta.url), 'utf8');
  assert.match(core, /TRIAL_ENDED/);
  assert.match(core, /status\(402\)/);
  const panel = fs.readFileSync(new URL('../../client/src/components/BillingPanel.jsx', import.meta.url), 'utf8');
  assert.match(panel, /Your free month/);
});

test('free clips are counted from the start of the free month and usage is read with each kind\'s own window', () => {
  const core = fs.readFileSync(new URL('../src/services/core.js', import.meta.url), 'utf8');
  assert.match(core, /export function usageWindowStart\(kind, date = new Date\(\), \{ plan, createdAt \} = \{\}\)/);
  assert.match(core, /freeTrialStart\(createdAt\)/);
  assert.match(core, /durableUsageLimit\(user\.id, kind, limit, \{ plan, createdAt: user\.created_at \}\)/);
  const billing = fs.readFileSync(new URL('../src/routes/billing.js', import.meta.url), 'utf8');
  assert.match(billing, /usageWindowStart\(kind/);
  assert.doesNotMatch(billing, /now\.setUTCMinutes\(0,0,0\); const start/);
});
