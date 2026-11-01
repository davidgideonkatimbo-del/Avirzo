import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { runPool, defaultSceneConcurrency, sceneCacheKey, sceneCacheSettings, pruneSceneCache, processFilmExport } from '../src/services/exporter.js';

const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;

test('runPool keeps order, respects the limit and stops on the first error', async () => {
  let running = 0; let peak = 0;
  const out = await runPool([30, 5, 20, 1, 10], 2, async (ms, i) => {
    running++; peak = Math.max(peak, running);
    await new Promise(r => setTimeout(r, ms));
    running--;
    return `item-${i}`;
  });
  assert.deepEqual(out, ['item-0', 'item-1', 'item-2', 'item-3', 'item-4']);
  assert.equal(peak, 2);
  let started = 0;
  await assert.rejects(runPool([1, 2, 3, 4, 5, 6], 1, async (n) => { started++; if (n === 2) throw new Error('boom'); }), /boom/);
  assert.equal(started, 2);   // nothing new starts after the failure
  assert.deepEqual(await runPool([], 3, async () => 1), []);
});

test('scene concurrency only rises on bigger machines and can be set', () => {
  assert.equal(defaultSceneConcurrency({}, 1), 1);
  assert.equal(defaultSceneConcurrency({}, 2), 1);
  assert.equal(defaultSceneConcurrency({}, 4), 2);
  assert.equal(defaultSceneConcurrency({}, 16), 3);
  assert.equal(defaultSceneConcurrency({ EXPORT_SCENE_CONCURRENCY: '4' }, 1), 4);
  assert.equal(defaultSceneConcurrency({ EXPORT_SCENE_CONCURRENCY: '99' }, 1), 4);
  assert.equal(defaultSceneConcurrency({ EXPORT_SCENE_CONCURRENCY: 'x' }, 8), 3);
});

test('cache key depends on owner, stored file and every encode setting', () => {
  const a = sceneCacheKey('u1', 'u1/a.mp4', 'sigA');
  assert.match(a, /^[0-9a-f]{64}$/);
  assert.equal(a, sceneCacheKey('u1', 'u1/a.mp4', 'sigA'));
  assert.notEqual(a, sceneCacheKey('u2', 'u1/a.mp4', 'sigA'));
  assert.notEqual(a, sceneCacheKey('u1', 'u1/b.mp4', 'sigA'));
  assert.notEqual(a, sceneCacheKey('u1', 'u1/a.mp4', 'sigB'));
  assert.equal(sceneCacheSettings({ EXPORT_CACHE_MAX_MB: '0' }).maxBytes, 0);
  assert.equal(sceneCacheSettings({}).maxBytes, 2048 * 1024 * 1024);
});

test('pruning removes expired entries, then the oldest until the cache fits', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'avirzo-prune-'));
  try {
    const now = Date.now();
    const make = (name, bytes, ageHours) => {
      const f = path.join(dir, name);
      fs.writeFileSync(f, Buffer.alloc(bytes, 1));
      const t = new Date(now - ageHours * 3600 * 1000);
      fs.utimesSync(f, t, t);
    };
    make('old.mp4', 100, 100);     // expired
    make('a.mp4', 1000, 5);        // oldest of the valid ones
    make('b.mp4', 1000, 3);
    make('c.mp4', 1000, 1);
    await pruneSceneCache(dir, { maxBytes: 2100, maxAgeMs: 48 * 3600 * 1000 }, now);
    assert.deepEqual(fs.readdirSync(dir).sort(), ['b.mp4', 'c.mp4']);
    await pruneSceneCache(dir, { maxBytes: 0, maxAgeMs: 48 * 3600 * 1000 }, now);
    assert.deepEqual(fs.readdirSync(dir), []);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

function exportHarness() {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'avirzo-exp-'));
  const cache = path.join(work, 'cache');
  const clip = path.join(work, 'clip.mp4');
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc2=d=1:s=640x360:r=24', '-pix_fmt', 'yuv420p', clip]);
  const buffer = fs.readFileSync(clip);
  const stats = { fetches: 0 };
  const supabaseAdmin = {
    from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { storage_path: 'user-1/scene.mp4' }, error: null }) }) }) }) }),
    storage: { from: () => ({ createSignedUrl: async () => ({ data: { signedUrl: 'https://media.example.test/scene.mp4' }, error: null }) }) }
  };
  const ctx = { IS_PRODUCTION: false, supabaseAdmin, toSrtTime: () => '00:00:00,000' };
  const fetchBuffer = async () => { stats.fetches++; return { buffer }; };
  const run = (extra = {}) => processFilmExport({
    payload: { scenes: [{ assetId: 'a1' }, { assetId: 'a2' }, { assetId: 'a3' }], format: '16:9', quality: 'draft', finish: 'none', captionMode: 'none', plan: 'studio', ...extra },
    user: { id: 'user-1' }, ctx, fetchBuffer
  });
  return { work, cache, stats, run };
}

test('a repeat export re-uses processed scenes; changed settings do not; the film is still valid', { skip: !hasFfmpeg && 'ffmpeg not installed' }, async () => {
  const h = exportHarness();
  const cwd = process.cwd();
  const saved = { dir: process.env.EXPORT_CACHE_DIR, conc: process.env.EXPORT_SCENE_CONCURRENCY };
  process.env.EXPORT_CACHE_DIR = h.cache;
  process.env.EXPORT_SCENE_CONCURRENCY = '3';
  process.chdir(h.work);
  try {
    const first = await h.run();
    assert.equal(first.status, 'ready');
    assert.equal(first.sceneCacheHits, 0);
    // The three scenes share one stored file and settings, so only the first is a miss when run in order; with 3 in parallel, up to 3 download.
    const afterFirst = h.stats.fetches;
    assert.ok(afterFirst >= 1 && afterFirst <= 3);

    const second = await h.run();
    assert.equal(second.sceneCacheHits, 3);
    assert.equal(h.stats.fetches, afterFirst, 'no downloads on the repeat export');

    const third = await h.run({ finish: 'warm' });      // a different look must not re-use the old pictures
    assert.equal(third.sceneCacheHits, 0);

    const file = path.join(h.work, 'exports', fs.readdirSync(path.join(h.work, 'exports')).find(n => n.endsWith('.mp4')));
    const dur = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file], { encoding: 'utf8' }));
    assert.ok(dur > 2.5 && dur < 3.5, `three one-second scenes, got ${dur}s`);
  } finally {
    process.chdir(cwd);
    for (const [k, v] of [['EXPORT_CACHE_DIR', saved.dir], ['EXPORT_SCENE_CONCURRENCY', saved.conc]]) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
    fs.rmSync(h.work, { recursive: true, force: true });
  }
});

test('a failed scene download stops the export and stores nothing in the cache', { skip: !hasFfmpeg && 'ffmpeg not installed' }, async () => {
  const h = exportHarness();
  const cwd = process.cwd();
  const saved = process.env.EXPORT_CACHE_DIR;
  process.env.EXPORT_CACHE_DIR = h.cache;
  process.chdir(h.work);
  try {
    const failing = () => processFilmExport({
      payload: { scenes: [{ assetId: 'a1' }, { assetId: 'a2' }], format: '16:9', quality: 'draft', finish: 'none', captionMode: 'none', plan: 'studio' },
      user: { id: 'user-1' },
      ctx: { IS_PRODUCTION: false, supabaseAdmin: { from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { storage_path: 'user-1/x.mp4' }, error: null }) }) }) }) }), storage: { from: () => ({ createSignedUrl: async () => ({ data: { signedUrl: 'https://media.example.test/x.mp4' }, error: null }) }) } }, toSrtTime: () => '' },
      fetchBuffer: async () => { throw new Error('network down'); }
    });
    await assert.rejects(failing(), /Could not download scene/);
    const left = fs.existsSync(h.cache) ? fs.readdirSync(h.cache).filter(n => n.endsWith('.mp4')) : [];
    assert.deepEqual(left, []);
  } finally {
    process.chdir(cwd);
    if (saved === undefined) delete process.env.EXPORT_CACHE_DIR; else process.env.EXPORT_CACHE_DIR = saved;
    fs.rmSync(h.work, { recursive: true, force: true });
  }
});

import { sceneEncodeArgs, ENCODE_PRESETS } from '../src/services/exporter.js';

test('scenes are saved near-lossless only when a caption burn (a second encode) follows', () => {
  assert.deepEqual(sceneEncodeArgs('standard', false), ENCODE_PRESETS.standard);
  assert.deepEqual(sceneEncodeArgs('high', false), ENCODE_PRESETS.high);
  assert.ok(sceneEncodeArgs('standard', true).includes('14'), 'crf 14 before a burn');
  assert.ok(sceneEncodeArgs('high', true).includes('14'));
  assert.deepEqual(sceneEncodeArgs('draft', true), ENCODE_PRESETS.draft);   // drafts stay fast
  assert.deepEqual(sceneEncodeArgs('unknown', false), ENCODE_PRESETS.standard);
});

test('an export with burned-in captions works end to end and saves higher-quality scenes than one without', { skip: !hasFfmpeg && 'ffmpeg not installed' }, async () => {
  const hasLibass = /\bsubtitles\b/.test(spawnSync('ffmpeg', ['-hide_banner', '-filters'], { encoding: 'utf8' }).stdout || '');
  if (!hasLibass) return;
  const h = exportHarness();
  const cwd = process.cwd();
  const saved = { dir: process.env.EXPORT_CACHE_DIR, conc: process.env.EXPORT_SCENE_CONCURRENCY };
  process.env.EXPORT_SCENE_CONCURRENCY = '1';
  process.chdir(h.work);
  try {
    const sizeOfCache = dir => fs.readdirSync(dir).filter(n => n.endsWith('.mp4')).reduce((n, f) => n + fs.statSync(path.join(dir, f)).size, 0);
    process.env.EXPORT_CACHE_DIR = path.join(h.work, 'cache-plain');
    const plain = await h.run({ quality: 'standard', captionMode: 'burn', captions: [] });
    assert.equal(plain.captionMode, 'none');
    process.env.EXPORT_CACHE_DIR = path.join(h.work, 'cache-burn');
    const burned = await h.run({ quality: 'standard', captionMode: 'burn', captions: [{ start: 0, end: 2, text: 'A griot begins the tale' }] });
    assert.equal(burned.captionMode, 'burned-in');
    assert.equal(burned.status, 'ready');
    assert.ok(sizeOfCache(path.join(h.work, 'cache-burn')) > sizeOfCache(path.join(h.work, 'cache-plain')), 'scenes before a burn are saved at higher quality');
  } finally {
    process.chdir(cwd);
    for (const [k, v] of [['EXPORT_CACHE_DIR', saved.dir], ['EXPORT_SCENE_CONCURRENCY', saved.conc]]) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
    fs.rmSync(h.work, { recursive: true, force: true });
  }
});
