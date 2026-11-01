import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { advanceKeyframeJob, providerTaskIdFor, buildKeyframePrompt, startKeyframeTask, normalizeTaskStatus } from '../src/services/keyframe.js';
import { keyframeCreditCost, generationCreditCost } from '../src/services/credits.js';

function fakeJobs(initial) {
  const state = { ...initial };
  return {
    state,
    get: async () => ({ ...state }),
    update: async (_id, patch) => { Object.assign(state, patch); return { ...state }; }
  };
}
const respond = (body, ok = true, status = 200) => ({ ok, status, json: async () => body });
const headers = () => ({ Authorization: 'Bearer x' });
const baseJob = () => ({ id: 'job1', user_id: 'u1', status: 'running', provider_task_id: 'img1', payload: { stage: 'keyframe', creditsCharged: 65, videoRequest: { model: 'gen4.5', promptText: 'A griot tells a tale', ratio: '1280:720', duration: 5 } } });

test('keyframe credit prices and total scene cost', () => {
  assert.equal(keyframeCreditCost('gen4_image'), 5);
  assert.equal(keyframeCreditCost('gen4_image_turbo'), 2);
  assert.equal(keyframeCreditCost('gen4_image', { RUNWAY_GEN4_IMAGE_CREDITS: '8' }), 8);
  assert.equal(generationCreditCost('gen4.5', 5) + keyframeCreditCost('gen4_image'), 65);
  assert.equal(generationCreditCost('gen4_turbo', 5) + keyframeCreditCost('gen4_image_turbo'), 27);
});

test('keyframe prompt tags the character reference and stays within 1000 characters', () => {
  const withRef = buildKeyframePrompt('x'.repeat(2000), true);
  assert.equal(withRef.length, 1000);
  assert.match(withRef, /@character/);
  assert.doesNotMatch(buildKeyframePrompt('A market at dawn', false), /@character/);
});

test('the video task id is used once the video stage has started', () => {
  assert.equal(providerTaskIdFor({ provider_task_id: 'img1', payload: { stage: 'keyframe' } }), 'img1');
  assert.equal(providerTaskIdFor({ provider_task_id: 'img1', payload: { videoTaskId: 'vid1' } }), 'vid1');
  assert.equal(normalizeTaskStatus('SUCCEEDED'), 'succeeded');
  assert.equal(normalizeTaskStatus('CANCELLED'), 'canceled');
});

test('startKeyframeTask posts to text_to_image with the tagged reference', async () => {
  let call;
  const fetchImpl = async (url, init) => { call = { url, body: JSON.parse(init.body) }; return respond({ id: 'img1' }); };
  const r = await startKeyframeTask({ runwayApi: 'https://api.test/v1', runwayHeaders: headers, model: 'gen4_image', promptText: 'A griot', ratio: '1280:720', referenceImage: 'https://x/c.png', fetchImpl });
  assert.equal(r.ok, true);
  assert.equal(call.url, 'https://api.test/v1/text_to_image');
  assert.equal(call.body.model, 'gen4_image');
  assert.deepEqual(call.body.referenceImages, [{ uri: 'https://x/c.png', tag: 'character' }]);
  const none = await startKeyframeTask({ runwayApi: 'https://api.test/v1', runwayHeaders: headers, model: 'gen4_image', promptText: 'A market', ratio: '720:1280', referenceImage: null, fetchImpl });
  assert.equal(none.ok, true);
  assert.equal(call.body.referenceImages, undefined);
});

test('finished keyframe starts the video with the image, and keeps the stable task id', async () => {
  const jobs = fakeJobs(baseJob());
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    if (url.endsWith('/tasks/img1')) return respond({ status: 'SUCCEEDED', output: ['https://cdn/keyframe.png'] });
    if (url.endsWith('/image_to_video')) return respond({ id: 'vid1' });
    throw new Error('unexpected ' + url);
  };
  const refunds = [];
  const step = await advanceKeyframeJob(await jobs.get(), { jobs, runwayApi: 'https://api.test/v1', runwayHeaders: headers, refundJobCredits: async (j, why) => refunds.push(why), fetchImpl });
  assert.equal(step.state, 'video_started');
  const videoCall = JSON.parse(calls.find(c => c.url.endsWith('/image_to_video')).init.body);
  assert.equal(videoCall.promptImage, 'https://cdn/keyframe.png');
  assert.equal(videoCall.model, 'gen4.5');
  assert.equal(videoCall.duration, 5);
  assert.equal(jobs.state.provider_task_id, 'img1');          // client keeps polling the same id
  assert.equal(jobs.state.payload.videoTaskId, 'vid1');
  assert.equal(jobs.state.payload.stage, 'video');
  assert.deepEqual(refunds, []);
});

test('a running keyframe waits; a failed one refunds the whole scene', async () => {
  const jobs = fakeJobs(baseJob());
  const refunds = [];
  const deps = fetchImpl => ({ jobs, runwayApi: 'https://api.test/v1', runwayHeaders: headers, refundJobCredits: async (j, why) => refunds.push(why), fetchImpl });
  const pending = await advanceKeyframeJob(await jobs.get(), deps(async () => respond({ status: 'RUNNING' })));
  assert.equal(pending.state, 'pending');
  assert.equal(jobs.state.payload.stage, 'keyframe');
  const failed = await advanceKeyframeJob(await jobs.get(), deps(async () => respond({ status: 'FAILED', failure: 'Content moderation' })));
  assert.equal(failed.state, 'failed');
  assert.equal(jobs.state.status, 'failed');
  assert.deepEqual(refunds, ['keyframe_failed']);
});

test('if the video step is rejected the job fails and credits are refunded', async () => {
  const jobs = fakeJobs(baseJob());
  const refunds = [];
  const fetchImpl = async url => url.endsWith('/image_to_video') ? respond({ error: 'bad request' }, false, 400) : respond({ status: 'SUCCEEDED', output: ['https://cdn/k.png'] });
  const step = await advanceKeyframeJob(await jobs.get(), { jobs, runwayApi: 'https://api.test/v1', runwayHeaders: headers, refundJobCredits: async (j, why) => refunds.push(why), fetchImpl });
  assert.equal(step.state, 'failed');
  assert.deepEqual(refunds, ['video_start_rejected']);
});

test('a second caller does not start a second video', async () => {
  const jobs = fakeJobs({ ...baseJob(), payload: { ...baseJob().payload, stage: 'video', videoTaskId: 'vid1' } });
  let videoStarts = 0;
  const fetchImpl = async url => { if (url.endsWith('/image_to_video')) videoStarts++; return respond({ status: 'SUCCEEDED', output: ['https://cdn/k.png'] }); };
  const stale = { ...baseJob() }; // caller still holds the old keyframe-stage copy
  const step = await advanceKeyframeJob(stale, { jobs, runwayApi: 'https://api.test/v1', runwayHeaders: headers, refundJobCredits: async () => {}, fetchImpl });
  assert.equal(step.state, 'moved_on');
  assert.equal(videoStarts, 0);
});

test('worker, cancel and poll routes understand keyframe jobs', () => {
  const read = f => fs.readFileSync(new URL(f, import.meta.url), 'utf8');
  assert.match(read('../src/worker.js'), /stage === 'keyframe'/);
  assert.match(read('../src/worker.js'), /providerTaskIdFor\(job\)/);
  assert.match(read('../src/routes/jobs.js'), /job\.payload\?\.videoTaskId \|\| job\.provider_task_id/);
  const gen = read('../src/routes/generation.js');
  assert.match(gen, /advanceKeyframeJob/);
  assert.match(gen, /providerTaskIdFor\(knownJob\)/);
  assert.match(gen, /keyframeCreditCost\(keyframeModel\)/);
});
