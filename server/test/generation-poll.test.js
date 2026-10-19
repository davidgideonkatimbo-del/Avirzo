import test from 'node:test';
import assert from 'node:assert/strict';
import { pollTask } from '../../client/src/generationPoll.js';

const resp = (status, body) => ({ r: { ok: status < 400, status }, body });
function harness(script) {
  let i = 0; const messages = [];
  return {
    messages,
    opts: {
      taskId: 't', sleep: async () => {}, setMessage: m => messages.push(m),
      apiFetch: async () => { const step = script[Math.min(i++, script.length - 1)]; if (step instanceof Error) throw step; return step.r; },
      readApiJson: async r => script.find(s => s.r === r).body
    }
  };
}

test('poll resolves when the task succeeds with a url', async () => {
  const h = harness([resp(200, { status: 'running' }), resp(200, { status: 'succeeded', videoUrl: 'https://v' })]);
  assert.equal((await pollTask(h.opts)).videoUrl, 'https://v');
});

test('poll accepts a finished clip that only has an archived asset', async () => {
  const h = harness([resp(200, { status: 'succeeded', archivedAsset: { id: 'a1' } })]);
  assert.equal((await pollTask(h.opts)).archivedAsset.id, 'a1');
});

test('poll keeps going through busy-provider answers', async () => {
  const h = harness([resp(503, { message: 'busy' }), resp(429, {}), resp(200, { status: 'succeeded', videoUrl: 'u' })]);
  assert.equal((await pollTask(h.opts)).videoUrl, 'u');
});

test('a failed task is retryable, a canceled one is not', async () => {
  await assert.rejects(pollTask(harness([resp(200, { status: 'failed', message: 'x' })]).opts), e => e.retryable === true);
  await assert.rejects(pollTask(harness([resp(200, { status: 'canceled' })]).opts), e => e.retryable === false);
});

test('a missing task (404) fails at once instead of spinning', async () => {
  await assert.rejects(pollTask(harness([resp(404, { message: 'Generation task not found.' })]).opts), /not found/);
});

test('poll gives up with a clear message after maxAttempts', async () => {
  const h = harness([resp(200, { status: 'running' })]);
  await assert.rejects(pollTask({ ...h.opts, maxAttempts: 3 }), /taking longer than expected/);
});
