import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

test('provider-backed routes validate for free before charging credits and quota', () => {
  const voice = read('server/src/routes/voice.js');
  assert.ok(voice.indexOf("if (!text) return res.status(400)") < voice.indexOf("requireProviderUser(req, res, 'voice')"), 'voice must validate text before charging');
  assert.ok(voice.indexOf('requireVoiceKey(res)') < voice.indexOf("requireProviderUser(req, res, 'voice')"), 'voice must check the provider key before charging');
  const music = read('server/src/routes/music.js');
  assert.ok(music.indexOf('requireVoiceKey(res)') < music.indexOf("requireProviderUser(req, res, 'voice')"), 'music must check the provider key before charging');
  const perf = read('server/src/routes/performance.js');
  assert.ok(perf.indexOf("Add a performance reference video") < perf.indexOf("requireProviderUser(req, res, 'performance')"), 'performance must validate input before charging');
  assert.ok(perf.indexOf('requireRunwayKey(res)') < perf.indexOf("requireProviderUser(req, res, 'performance')"), 'performance must check the provider key before charging');
});

test('every failure path after a charge returns the credits and quota', () => {
  for (const [file, minimum] of [['voice.js', 3], ['music.js', 5], ['performance.js', 3], ['generation.js', 4]]) {
    const src = read(`server/src/routes/${file}`);
    const count = (src.match(/refundProviderCharge\(|refundCredits\(/g) || []).length;
    assert.ok(count >= minimum, `${file} should refund on each failure path (found ${count}, expected at least ${minimum})`);
  }
});

test('requireProviderUser remembers the quota window and refunds it when credits are refused', () => {
  const core = read('server/src/services/core.js');
  assert.match(core, /user\._usage = \{ kind, windowStart:/);
  assert.match(core, /export async function refundProviderCharge/);
  assert.match(core, /export async function refundJobCredits/);
  assert.match(core, /if \(!debit\.ok\) \{\s*await refundUsage\(user\);/);
  assert.match(core, /refund:job:\$\{job\.id\}/);
});

test('jobs that fail after the provider accepted them are refunded once, in the web service and the worker', () => {
  const gen = read('server/src/routes/generation.js');
  assert.match(gen, /refundJobCredits\(durableJob, `provider_\$\{status\}`\)/);
  const worker = read('server/src/worker.js');
  for (const why of ['provider_timeout', 'provider_task_missing', 'no_output', 'provider_failed', 'provider_canceled']) {
    assert.ok(worker.includes(`refundJobCredits(job, '${why}')`), `worker should refund on ${why}`);
  }
  const perf = read('server/src/routes/performance.js');
  assert.match(perf, /payload: \{ creditsCharged:/, 'performance jobs must record what was charged so a later failure can be refunded');
});

test('database makes per-job refunds idempotent and can return a quota unit', () => {
  const sql = read('supabase.sql');
  assert.match(sql, /reason_text like 'refund:job:%'/);
  assert.match(sql, /avirzo_credit_ledger_unique_job_refund/);
  assert.match(sql, /create function public\.refund_avirzo_usage\(p_user_id uuid, p_kind text, p_window_start timestamptz\)/);
  assert.match(sql, /grant execute on function public\.refund_avirzo_usage\(uuid, text, timestamptz\) to service_role/);
});

test('safeFetch clears its download timer when a response is aborted', () => {
  assert.match(read('server/src/services/safeFetch.js'), /res\.on\('close', \(\) => clearTimeout\(deadline\)\)/);
});
