import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { classifyGenerateFailure, runWithRetry, friendlyFailure, shotError } from '../../client/src/shotFlow.js';

const read = rel => fs.readFileSync(new URL(rel, import.meta.url), 'utf8');
const noWait = { wait: async () => {}, delayMs: 0 };

test('out of credits, free month over and signed out are fatal: the batch stops with a clear message', () => {
  for (const [status, data] of [[402, { error: 'INSUFFICIENT_CREDITS' }], [402, {}], [402, { error: 'TRIAL_ENDED' }], [401, {}], [403, {}]]) {
    const e = classifyGenerateFailure(status, data);
    assert.equal(e.fatal, true, `${status} ${JSON.stringify(data)}`);
    assert.equal(e.retryable, false);
    assert.ok(e.message.length > 10);
  }
});

test('busy provider and gateway errors are retryable; bad requests and safety refusals are not', () => {
  for (const status of [408, 425, 429, 500, 502, 503, 504]) {
    assert.equal(classifyGenerateFailure(status, { message: 'Provider busy' }).retryable, true, String(status));
  }
  assert.equal(classifyGenerateFailure(400, { message: 'Bad prompt' }).retryable, false);
  assert.equal(classifyGenerateFailure(404, {}).retryable, false);
  assert.equal(classifyGenerateFailure(502, { message: 'Blocked by content moderation policy' }).retryable, false);
});

test('a retryable failure is retried once and the shot then succeeds', async () => {
  let calls = 0; let retried = 0;
  const out = await runWithRetry(async () => {
    calls += 1;
    if (calls === 1) throw shotError('The provider could not finish', { retryable: true });
    return { videoUrl: 'https://example.com/v.mp4' };
  }, { ...noWait, onRetry: () => { retried += 1; } });
  assert.equal(calls, 2);
  assert.equal(retried, 1);
  assert.equal(out.videoUrl, 'https://example.com/v.mp4');
});

test('retrying stops after two tries and never retries fatal or ordinary failures', async () => {
  let calls = 0;
  await assert.rejects(runWithRetry(async () => { calls += 1; throw shotError('still failing', { retryable: true }); }, noWait), /still failing/);
  assert.equal(calls, 2);
  calls = 0;
  await assert.rejects(runWithRetry(async () => { calls += 1; throw shotError('no credits', { fatal: true, retryable: true }); }, noWait), /no credits/);
  assert.equal(calls, 1);
  calls = 0;
  await assert.rejects(runWithRetry(async () => { calls += 1; throw new Error('plain error'); }, noWait), /plain error/);
  assert.equal(calls, 1);
});

test('failure messages tell the creator what to do', () => {
  assert.match(friendlyFailure(new Error('Request blocked by content policy')), /Reword it/);
  assert.match(friendlyFailure(new Error('Video generation failed.')), /press Generate again/i);
  assert.equal(friendlyFailure(shotError('Not enough credits.', { fatal: true })), 'Not enough credits.');
});

test('Generate film keeps finished scenes, carries on past a failed scene and stops only on fatal errors', () => {
  const main = read('../../client/src/main.jsx');
  assert.match(main, /if\(scene\.status==='ready'&&scene\.videoUrl\) continue;/);
  assert.match(main, /const failedScenes=\[\];/);
  assert.match(main, /if\(sceneError\.fatal\|\|blockedByContinuity\) throw sceneError;/);
  assert.match(main, /Press Generate film again/);
  assert.match(main, /submitShot\(shotRequestBody\(/);
  // one shared submit path for Generate shot and Generate film
  assert.equal((main.match(/apiFetch\('\/api\/generate',/g) || []).length, 1);
  // a succeeded clip that only has an archived asset is no longer treated as a failure
  assert.match(main, /archivedAsset\?\.id/);
  assert.match(read('../../client/src/generationPoll.js'), /maxAttempts = 150/);
});

test('removed country templates are gone and every pack and Home card points at a real template', async () => {
  const src = read('../../client/src/constants.js');
  const tmp = path.join(os.tmpdir(), `avirzo-constants-${process.pid}.mjs`);
  fs.writeFileSync(tmp, src);
  const { heritageTemplates, communityPacks } = await import(tmp);
  const ids = new Set(heritageTemplates.map(t => t.id));
  for (const gone of ['independence-portrait', 'ghana-kente-memory', 'ethiopia-highland-path', 'senegal-griots-dusk', 'egypt-nile-memory']) {
    assert.ok(!ids.has(gone), gone);
  }
  for (const keep of ['oral-elder', 'documented-history', 'folklore-legend', 'vertical-heritage', 'classroom-heritage', 'kibuuka-legend', 'blank-studio']) {
    assert.ok(ids.has(keep), keep);
  }
  for (const pack of communityPacks) for (const id of pack.templateIds) assert.ok(ids.has(id), `${pack.id} -> ${id}`);
  const main = read('../../client/src/main.jsx');
  for (const m of main.matchAll(/startFirstFilm\('([^']+)'\)/g)) assert.ok(ids.has(m[1]), `Home card -> ${m[1]}`);
});
