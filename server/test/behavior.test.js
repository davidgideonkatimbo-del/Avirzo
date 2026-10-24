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
  assert.match(tail, /revoke execute on function public\.claim_avirzo_job\(text\[\], integer\) from public, anon, authenticated/);
  assert.match(tail, /grant execute on function public\.claim_avirzo_job\(text\[\], integer\) to service_role/);
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

import { envInt, scaledLimit, pickGenerationModel, freeAccessBlock } from '../src/services/plans.js';

test('generation limits default to 20/60/200 and can be changed per plan from env', () => {
  const base = envEnv => ({ max: envInt('FREE_GENERATIONS_PER_YEAR', 20, envEnv), perPlan: { free: envInt('FREE_GENERATIONS_PER_YEAR', 20, envEnv), creator: envInt('CREATOR_GENERATIONS_PER_YEAR', 60, envEnv), studio: envInt('STUDIO_GENERATIONS_PER_YEAR', 200, envEnv) } });
  const d = base({});
  assert.deepEqual(['free', 'creator', 'studio'].map(p => scaledLimit(d, p).max), [20, 60, 200]);
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
  assert.equal(pickGenerationModel('free', true, {}), 'gen4_turbo'); // free defaults to Turbo when a reference image exists
  assert.equal(pickGenerationModel('free', true, { FREE_GENERATION_MODEL: 'gen4.5' }), 'gen4.5');
  assert.equal(pickGenerationModel('creator', true, {}, 'draft'), 'gen4_turbo');
  assert.equal(pickGenerationModel('creator', false, {}, 'draft'), 'gen4.5'); // Turbo needs a reference image
  assert.equal(pickGenerationModel('free', true, { FREE_GENERATION_MODEL: 'something-else' }), 'gen4.5');
});

import { freeTrialStatus, TRIAL_GATED_KINDS } from '../src/services/plans.js';

test('free access period uses configured days from sign-up or policy start for older accounts', () => {
  const env = { FREE_TRIAL_POLICY_START: '2026-10-09', FREE_TRIAL_DAYS: '30' };
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

test('commercial free-access defaults provide a year and a two-scene lifetime cap', () => {
  assert.equal(freeTrialStatus({ createdAt: '2026-10-20T00:00:00Z', plan: 'free', now: Date.parse('2027-10-19T00:00:00Z'), env: {} }).expired, false);
  assert.equal(freeTrialStatus({ createdAt: '2026-10-20T00:00:00Z', plan: 'free', now: Date.parse('2027-10-21T00:00:00Z'), env: {} }).expired, true);
  const core = fs.readFileSync(new URL('../src/services/core.js', import.meta.url), 'utf8');
  assert.match(core, /FREE_GENERATIONS_PER_YEAR', 2/);
  assert.match(core, /trial\.expired && !\(kind === 'generation' && plan === 'free'\)/);
  const credits = fs.readFileSync(new URL('../src/services/credits.js', import.meta.url), 'utf8');
  assert.match(credits, /FREE_CREDITS_PER_MONTH', 0/);
});

test('after the free access period only provider-cost features are blocked; exports and project access stay open', () => {
  assert.deepEqual([...TRIAL_GATED_KINDS].sort(), ['generation', 'performance', 'voice']);
  const core = fs.readFileSync(new URL('../src/services/core.js', import.meta.url), 'utf8');
  assert.match(core, /TRIAL_ENDED/);
  assert.match(core, /status\(402\)/);
  const panel = fs.readFileSync(new URL('../../client/src/components/BillingPanel.jsx', import.meta.url), 'utf8');
  assert.match(panel, /free access year|free access period/i);
});

test('free clips are counted from the start of the free access period and usage is read with each kind\'s own window', () => {
  const core = fs.readFileSync(new URL('../src/services/core.js', import.meta.url), 'utf8');
  assert.match(core, /export function usageWindowStart\(kind, date = new Date\(\), \{ plan, createdAt \} = \{\}\)/);
  assert.match(core, /new Date\('2000-01-01T00:00:00\.000Z'\)/);
  assert.match(core, /durableUsageLimit\(user\.id, kind, limit, \{ plan, createdAt: user\.created_at \}\)/);
  const billing = fs.readFileSync(new URL('../src/routes/billing.js', import.meta.url), 'utf8');
  assert.match(billing, /usageWindowStart\(kind/);
  assert.doesNotMatch(billing, /now\.setUTCMinutes\(0,0,0\); const start/);
});

import { defaultCreditCost, generationCreditCost, voiceCreditCost, musicCreditCost, performanceCreditCost, creditsToProviderUsd, creditsEnabled, creditPackCatalog, offeredCreditPacks, creditPackWarnings, creditConfigSummary, packCreditsForPriceId } from '../src/services/credits.js';

test('credit costs use provider model rates and duration, with fixed voice/performance fallbacks', () => {
  assert.equal(generationCreditCost('gen4.5', 5), 60);
  assert.equal(generationCreditCost('gen4.5', 10), 120);
  assert.equal(generationCreditCost('gen4_turbo', 5), 25);
  assert.equal(generationCreditCost('gen4_turbo', 10), 50);
  assert.equal(generationCreditCost('gen4.5', 5, { RUNWAY_GEN45_CREDITS_PER_SECOND: '10' }), 50);
  assert.equal(generationCreditCost('gen4.5', 0), 0);
  assert.equal(defaultCreditCost('generation', { durationSeconds: 5 }), 60); // worst-case Gen-4.5 rate, never 1 credit/sec
  assert.equal(defaultCreditCost('generation', { durationSeconds: 10 }), 120);
  assert.equal(defaultCreditCost('generation', {}), 60);
  assert.equal(defaultCreditCost('voice'), 240);
  assert.equal(defaultCreditCost('performance'), 150);
  assert.equal(defaultCreditCost('export'), 0);
  assert.equal(defaultCreditCost('unknown'), 0);
});

test('creditsEnabled is off outside production unless forced', () => {
  assert.equal(creditsEnabled({ NODE_ENV: 'development' }), false);
  assert.equal(creditsEnabled({ NODE_ENV: 'production' }), true);
  assert.equal(creditsEnabled({ NODE_ENV: 'production', CREDITS_ENABLED: 'false' }), false);
  assert.equal(creditsEnabled({ NODE_ENV: 'development', CREDITS_ENABLED: 'true' }), true);
});

test('credit pack catalog lists configured packs; only fairly priced packs are offered', () => {
  assert.deepEqual(creditPackCatalog({}), []);
  const env = {
    STRIPE_CREDIT_PACK_STARTER_PRICE_ID: 'price_starter', CREDIT_PACK_STARTER_CREDITS: '300', CREDIT_PACK_STARTER_PRICE_USD: '6',
    STRIPE_CREDIT_PACK_PRO_PRICE_ID: 'price_pro', CREDIT_PACK_PRO_CREDITS: '1000', CREDIT_PACK_PRO_PRICE_USD: '5',   // $0.005/credit: below cost
    STRIPE_CREDIT_PACK_STUDIO_PRICE_ID: 'price_studio'                                                                // no USD price declared
  };
  const all = creditPackCatalog(env);
  assert.equal(all.length, 3);
  assert.equal(all[0].credits, 300);
  assert.equal(all[2].credits, 3000);
  const offered = offeredCreditPacks(env);
  assert.deepEqual(offered.map(p => p.id), ['starter']);
  assert.equal(creditPackWarnings(env).length, 2);
  // A customer who already paid for a hidden pack must still receive credits.
  assert.equal(packCreditsForPriceId('price_pro', env), 1000);
  assert.equal(packCreditsForPriceId('price_studio', env), 3000);
  assert.equal(packCreditsForPriceId('missing', {}), null);
});

test('voice, music and performance are priced by usage, not flat', () => {
  assert.equal(voiceCreditCost(0), 0);
  assert.equal(voiceCreditCost(100), 2);        // minimum rounds up
  assert.equal(voiceCreditCost(1000), 20);
  assert.equal(voiceCreditCost(12000), 240);
  assert.equal(voiceCreditCost(1000, { CREDITS_PER_1K_VOICE_CHARS: '10' }), 10);
  assert.equal(musicCreditCost(10), 10);
  assert.equal(musicCreditCost(600), 600);
  assert.equal(performanceCreditCost(6), 30);
  assert.equal(performanceCreditCost(30), 150);
  assert.equal(performanceCreditCost(1), 15);   // 3 s minimum
  assert.equal(performanceCreditCost(120), 150); // 30 s maximum
  assert.equal(performanceCreditCost(undefined), 150); // unknown length is billed at the maximum
  assert.equal(creditsToProviderUsd(120), 1.2);
});

test('free plan needs a confirmed email in production and can be paused', () => {
  const unconfirmed = { id: 'u1' }; const confirmed = { id: 'u2', email_confirmed_at: '2026-10-01T00:00:00Z' };
  assert.equal(freeAccessBlock({ plan: 'free', user: unconfirmed, production: true }).error, 'EMAIL_NOT_CONFIRMED');
  assert.equal(freeAccessBlock({ plan: 'free', user: confirmed, production: true }), null);
  assert.equal(freeAccessBlock({ plan: 'free', user: unconfirmed, production: false }), null);
  assert.equal(freeAccessBlock({ plan: 'creator', user: unconfirmed, production: true }), null);
  assert.equal(freeAccessBlock({ plan: 'free', user: confirmed, production: true, env: { FREE_GENERATION_ENABLED: 'false' } }).error, 'FREE_PAUSED');
  assert.equal(freeAccessBlock({ plan: 'free', user: unconfirmed, production: true, env: { FREE_REQUIRE_VERIFIED_EMAIL: 'false' } }), null);
});

test('voice, music and performance routes quote their own credit cost', () => {
  const read = f => fs.readFileSync(new URL(`../src/routes/${f}`, import.meta.url), 'utf8');
  assert.match(read('voice.js'), /requireProviderUser\(req, res, 'voice', \(\) => \(\{ units: voiceCreditCost\(text\.length\)/);
  assert.match(read('music.js'), /units: musicCreditCost\(requestedSeconds\)/);
  assert.match(read('performance.js'), /units: performanceCreditCost\(billedSeconds\)/);
  assert.match(read('performance.js'), /probeDataUriVideoSeconds/);
});

test('yearly clip caps are backstops above what the credits allow', () => {
  const core = fs.readFileSync(new URL('../src/services/core.js', import.meta.url), 'utf8');
  assert.match(core, /CREATOR_GENERATIONS_PER_YEAR', 1500/);
  assert.match(core, /STUDIO_GENERATIONS_PER_YEAR', 5000/);
  assert.match(core, /estimatedProviderCostUsd: creditsToProviderUsd\(units\)/);
});

test('credit wallet SQL is present and RPCs are service_role only', () => {
  const sql = fs.readFileSync(new URL('../../supabase.sql', import.meta.url), 'utf8');
  assert.match(sql, /create table if not exists public\.avirzo_credit_balances/);
  assert.match(sql, /create table if not exists public\.avirzo_credit_ledger/);
  assert.match(sql, /create function public\.add_avirzo_credits/);
  assert.match(sql, /create function public\.consume_avirzo_credits/);
  assert.match(sql, /already_granted/);
  assert.match(sql, /stripe_pack:%/);
  assert.match(sql, /grant execute on function public\.add_avirzo_credits/);
  assert.match(sql, /to service_role/);
  assert.match(sql, /revoke execute on function public\.consume_avirzo_credits/);
});

test('generation route refunds credits when provider start fails', () => {
  const gen = fs.readFileSync(new URL('../src/routes/generation.js', import.meta.url), 'utf8');
  assert.match(gen, /refundCredits/);
  assert.match(gen, /provider_rejected/);
  assert.match(gen, /creditsCharged/);
  assert.match(gen, /requireProviderUser\(req, res, 'generation', \(_user, plan\) =>/);
  assert.match(gen, /generationCreditCost\(model, seconds\)/);
});

test('billing exposes credit checkout and payment webhook path', () => {
  const billing = fs.readFileSync(new URL('../src/routes/billing.js', import.meta.url), 'utf8');
  assert.match(billing, /\/api\/billing\/credits\/checkout/);
  assert.match(billing, /mode === 'payment'/);
  assert.match(billing, /addCredits/);
  assert.match(billing, /credits:\s*\{/);
});

test('plan monthly credits default free/creator/studio allowances', async () => {
  const { planMonthlyCredits, currentCreditMonthKey } = await import('../src/services/credits.js');
  assert.equal(planMonthlyCredits('free'), 0);
  assert.equal(planMonthlyCredits('creator'), 600);
  assert.equal(planMonthlyCredits('studio'), 1800);
  assert.match(currentCreditMonthKey(new Date('2026-10-13T00:00:00Z')), /^2026-10$/);
});

test('feature limits: storyboard and export scene caps scale by plan', async () => {
  const { maxStoryboardScenes, maxExportScenes, maxExportDurationSeconds } = await import('../src/services/plans.js');
  assert.equal(maxStoryboardScenes('free'), 24);
  assert.equal(maxStoryboardScenes('creator'), 80);
  assert.equal(maxStoryboardScenes('studio'), 200);
  assert.equal(maxExportScenes('studio'), 200);
  assert.equal(maxExportDurationSeconds('free'), 900);
  assert.equal(maxExportDurationSeconds('creator'), 2700);
  assert.equal(maxExportDurationSeconds('studio'), 5400);
});

test('storyboard and export routes use raised feature caps not hard-coded 12/30', () => {
  const heritage = fs.readFileSync(new URL('../src/routes/heritage.js', import.meta.url), 'utf8');
  const exportRoute = fs.readFileSync(new URL('../src/routes/export.js', import.meta.url), 'utf8');
  const exporter = fs.readFileSync(new URL('../src/services/exporter.js', import.meta.url), 'utf8');
  assert.match(heritage, /maxStoryboardScenes/);
  assert.doesNotMatch(heritage, /slice\(0,\s*12\)/);
  assert.match(exportRoute, /maxExportScenes/);
  assert.doesNotMatch(exportRoute, /limited to 30 scenes/);
  assert.match(exporter, /maxExportDurationSeconds|maxDurationSeconds/);
});

test('scenes without a reference image use Runway text_to_video with Gen-4.5; with an image they use image_to_video', () => {
  const gen = fs.readFileSync(new URL('../src/routes/generation.js', import.meta.url), 'utf8');
  assert.match(gen, /const endpoint = ref \? 'image_to_video' : 'text_to_video'/);
  assert.match(gen, /\$\{RUNWAY_API\}\/\$\{endpoint\}/);
  assert.match(gen, /if \(ref\) body\.promptImage = ref/);
  // Gen-4 Turbo cannot do text-only video, so a text-only request must never be sent to it.
  assert.equal(pickGenerationModel('free', false, {}), 'gen4.5');
  assert.equal(pickGenerationModel('creator', false, {}, 'draft'), 'gen4.5');
});

test('hardening: bad quotes never mean free, probing is async and only after sign-in', () => {
  const core = fs.readFileSync(new URL('../src/services/core.js', import.meta.url), 'utf8');
  assert.match(core, /quote = await creditUnits\(user, plan\)/);
  assert.match(core, /Number\.isFinite\(quotedNumber\)/);
  assert.match(core, /QUOTE_FAILED/);
  const perf = fs.readFileSync(new URL('../src/routes/performance.js', import.meta.url), 'utf8');
  assert.ok(perf.indexOf('probeDataUriVideoSeconds(performanceVideo)') > perf.indexOf("requireProviderUser(req, res, 'performance'"), 'probe must run inside the quote, after sign-in');
  assert.doesNotMatch(perf, /spawnSync/);
  assert.match(perf, /video_too_long/);
});

test('credit config summary states worst-case provider cost per plan', () => {
  const lines = creditConfigSummary({});
  assert.equal(lines.length, 3);
  assert.match(lines[1], /creator: 600 credits\/month = up to \$6\.00/);
  assert.match(lines[2], /studio: 1800 credits\/month = up to \$18\.00/);
});
