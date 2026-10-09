import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { sceneContinuityGuard, selectContinuityContext, relevanceScore } from '../src/services/continuity.js';
import { buildModelChain, submitWithFallback, shouldFallback } from '../src/services/modelFallback.js';

const chars = [
  { id: 'a', name: 'Kato', appearance: 'tall boy', clothing: 'bark cloth', visualIdentity: 'scar on chin', language: 'Luganda' },
  { id: 'b', name: 'Ssalongo', appearance: 'elderly man with walking stick', clothing: 'kanzu', visualIdentity: 'white beard', language: 'Luganda' },
  { id: 'c', name: 'Nabbi', appearance: 'market woman', clothing: 'gomesi', visualIdentity: 'gold earrings', language: 'Luganda' }
];
const world = { visualRules: 'Warm dawn light', continuityLocks: 'Ssalongo always carries his walking stick\nThe royal drum is never shown cracked\nNabbi sells matooke at the market' };

test('continuity context: primary always, only mentioned characters join, stays within budget', () => {
  const g = sceneContinuityGuard({ scene: { number: 1, prompt: 'Kato walks with Ssalongo past the royal drum', primaryCharacterId: 'a' }, characters: chars, worldBible: world, rootsFoundation: { period: '1890' }, era: 'pre1994' });
  assert.deepEqual(g.includedCharacters, ['Kato', 'Ssalongo']);
  assert.ok(g.continuityContext.length <= 900);
  assert.match(g.continuityContext, /royal drum/);
});

test('continuity context: relevant lock outranks an irrelevant one when the budget is tight', () => {
  const out = selectContinuityContext({ sceneText: 'the royal drum is carried to the palace', primary: chars[0], characters: chars, worldBible: world, budget: 240 });
  assert.match(out.context, /royal drum/);
  assert.doesNotMatch(out.context, /matooke/);
  assert.ok(out.context.length <= 240);
});

test('relevanceScore counts shared meaningful words only', () => {
  assert.equal(relevanceScore(new Set(['drum', 'palace']), 'The drum stands in the palace'), 2);
  assert.equal(relevanceScore(new Set(), 'anything'), 0);
});

test('model chain: primary first, turbo fallback only with a reference image, env can disable', () => {
  assert.deepEqual(buildModelChain('gen4.5', true, {}), ['gen4.5', 'gen4_turbo']);
  assert.deepEqual(buildModelChain('gen4.5', false, {}), ['gen4.5']);
  assert.deepEqual(buildModelChain('gen4.5', true, { GENERATION_FALLBACK_MODELS: 'none' }), ['gen4.5']);
  assert.deepEqual(buildModelChain('gen4_turbo', true, {}), ['gen4_turbo']);
});

test('fallback triggers on provider trouble only, never on validation or credit errors', () => {
  for (const status of [408, 429, 500, 502, 503, 504]) assert.equal(shouldFallback({ status }), true, String(status));
  for (const status of [400, 401, 402, 403, 404, 422]) assert.equal(shouldFallback({ status }), false, String(status));
  assert.equal(shouldFallback({ error: new Error('socket hang up') }), true);
});

test('submitWithFallback moves to the next model on 503 or a network error, and stops on 400', async () => {
  const res = (status, data = {}) => ({ response: { ok: status < 300, status }, data });
  let calls = [];
  let out = await submitWithFallback(['a', 'b'], async m => { calls.push(m); return m === 'a' ? res(503) : res(200, { id: 't1' }); });
  assert.equal(out.model, 'b'); assert.deepEqual(calls, ['a', 'b']); assert.equal(out.data.id, 't1');
  calls = [];
  out = await submitWithFallback(['a', 'b'], async m => { calls.push(m); if (m === 'a') throw new Error('timeout'); return res(200, { id: 't2' }); });
  assert.equal(out.model, 'b'); assert.equal(out.attempts[0].outcome, 'error');
  calls = [];
  out = await submitWithFallback(['a', 'b'], async m => { calls.push(m); return res(400); });
  assert.deepEqual(calls, ['a']); assert.equal(out.response.status, 400);
  await assert.rejects(submitWithFallback(['a', 'b'], async () => { throw new Error('down'); }), /down/);
  out = await submitWithFallback(['a', 'b'], async () => res(503));
  assert.equal(out.response.status, 503); assert.equal(out.attempts.length, 2);
});

test('generation route uses the fallback chain; realtime is private and role-gated in SQL', () => {
  const gen = fs.readFileSync(new URL('../src/routes/generation.js', import.meta.url), 'utf8');
  assert.match(gen, /submitWithFallback\(chain/);
  const sql = fs.readFileSync(new URL('../../supabase.sql', import.meta.url), 'utf8');
  assert.match(sql, /on realtime\.messages for select/);
  const rt = sql.slice(sql.indexOf('v2.12 live collaboration'));
  assert.match(rt, /extension = 'broadcast'/);
  assert.match(rt, /in \('owner','editor'\)/);
  assert.match(rt, /on realtime\.messages for insert/);
  const hook = fs.readFileSync(new URL('../../client/src/hooks/useProjectRoom.js', import.meta.url), 'utf8');
  assert.match(hook, /private: true/);
});
