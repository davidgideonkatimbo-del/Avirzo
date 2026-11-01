// End-to-end check of the two things a filmmaker must always be able to do: save a project and generate a shot.
// It runs the real route handlers (local-storage mode, Runway mocked), so it needs the server dependencies
// installed (`npm ci`). Without them it skips instead of failing.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'avirzo-workflow-'));
const srcRoot = path.resolve(process.cwd(), 'server/src');
process.chdir(tmp); // PROJECT_DIR resolves from the working directory; never write into the real project
for (const k of ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SERVICE_ROLE_KEY']) delete process.env[k];
process.env.NODE_ENV = 'development';
process.env.RUNWAYML_API_SECRET = 'test-secret';

let mods = null;
try {
  const core = await import(pathToFileURL(path.join(srcRoot, 'services/core.js')).href);
  const projects = (await import(pathToFileURL(path.join(srcRoot, 'routes/projects.js')).href)).registerRoutes;
  const generation = (await import(pathToFileURL(path.join(srcRoot, 'routes/generation.js')).href)).registerRoutes;
  const registerJobRoutes = (await import(pathToFileURL(path.join(srcRoot, 'routes/jobs.js')).href)).registerJobRoutes;
  mods = { core, projects, generation, registerJobRoutes };
} catch (error) {
  if (!/Cannot find (package|module)/.test(String(error?.message))) throw error;
}

function harness() {
  const routes = {};
  const app = Object.fromEntries(['get', 'post', 'put', 'patch', 'delete'].map(m => [m, (p, ...h) => { routes[`${m.toUpperCase()} ${p}`] = h.at(-1); }]));
  const ctx = { ...mods.core, app };
  mods.registerJobRoutes(app, ctx); mods.projects(app, ctx); mods.generation(app, ctx);
  const call = (key, { body = {}, params = {}, query = {} } = {}) => new Promise((resolve, reject) => {
    const res = { code: 200, headers: {}, set(k, v) { this.headers[k] = v; return this; }, status(c) { this.code = c; return this; }, json(b) { resolve({ status: this.code, body: b }); return this; } };
    Promise.resolve(routes[key]({ body, params, query, headers: {}, ip: '127.0.0.1' }, res)).catch(reject);
  });
  return call;
}

const savedProject = {
  name: 'Workflow Film', folder: 'My Films', rootsFoundation: { community: 'Baganda', country: 'Uganda' }, mode: 'story', story: 'A village at dawn.',
  style: 'Cinematic', camera: 'Slow dolly', duration: '5 sec', format: '16:9', africanProfile: 'uganda-lg', era: 'pre1994', storyType: 'oral', historicalNotes: '',
  scenes: [{ id: 's1', number: 1, prompt: 'Dawn over the village' }], characters: [], research: {}, worldBible: {}, timeline: [], audioTracks: [], captions: [],
  duckMusic: true, captionMode: 'soft', exportQuality: 'high', includeSrt: false, review: { enabled: false, notes: [] }, aiEndCard: false, exportUrl: ''
};

test('a project can be saved, edited, reopened and listed, keeping every export setting', { skip: !mods && 'server dependencies are not installed' }, async () => {
  const call = harness();
  const created = await call('POST /api/projects', { body: savedProject });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  assert.equal(created.body.verified, true);
  const id = created.body.project.id;
  const updated = await call('PUT /api/projects/:id', { params: { id }, body: { ...savedProject, story: 'Edited story', scenes: [...savedProject.scenes, { id: 's2', number: 2, prompt: 'Market day' }] } });
  assert.equal(updated.status, 200);
  const loaded = await call('GET /api/projects/:id', { params: { id } });
  const p = loaded.body.project || loaded.body;
  assert.equal(p.story, 'Edited story');
  assert.equal(p.scenes.length, 2);
  assert.equal(p.captionMode, 'soft');
  assert.equal(p.exportQuality, 'high');
  assert.equal(p.includeSrt, false);
  const list = await call('GET /api/projects');
  assert.ok((list.body.projects || []).some(x => x.id === id));
});

test('a shot can be generated and polled to a finished video', { skip: !mods && 'server dependencies are not installed' }, async () => {
  const call = harness();
  let polls = 0; const sent = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts = {}) => {
    const json = (status, b) => ({ ok: status < 300, status, json: async () => b });
    if (String(url).endsWith('/image_to_video')) { sent.push(JSON.parse(opts.body)); return json(200, { id: 'task-123' }); }
    if (String(url).includes('/tasks/task-123')) { polls += 1; return polls < 2 ? json(200, { id: 'task-123', status: 'RUNNING' }) : json(200, { id: 'task-123', status: 'SUCCEEDED', output: ['https://cdn.example.com/out.mp4'] }); }
    throw new Error(`unexpected fetch ${url}`);
  };
  try {
    const body = { prompt: 'Dawn over a Ugandan village, women carrying water', style: 'Cinematic', camera: 'Slow dolly', duration: '5 sec', format: '16:9', sceneNumber: 1, africanProfile: 'uganda-lg', era: 'pre1994', storyType: 'oral', characters: [], researchBrief: {}, referenceImage: '', worldBible: {}, rootsFoundation: { community: 'Baganda', country: 'Uganda', period: '1960s' } };
    const started = await call('POST /api/generate', { body });
    assert.equal(started.status, 202, JSON.stringify(started.body));
    assert.equal(started.body.taskId, 'task-123');
    assert.equal(sent[0].model, 'gen4.5');
    assert.equal(sent[0].ratio, '1280:720');
    assert.equal(sent[0].duration, 5);
    assert.ok(sent[0].promptText.length > 20 && sent[0].promptText.length <= 1000);
    assert.equal((await call('GET /api/generate/:taskId', { params: { taskId: 'task-123' } })).body.status, 'running');
    const done = await call('GET /api/generate/:taskId', { params: { taskId: 'task-123' } });
    assert.equal(done.body.status, 'succeeded');
    assert.equal(done.body.videoUrl, 'https://cdn.example.com/out.mp4');
    assert.equal((await call('POST /api/generate', { body: { ...body, prompt: '  ' } })).status, 400);
  } finally { globalThis.fetch = realFetch; }
});
