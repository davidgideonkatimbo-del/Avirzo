import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { mergeTakes, activeTakeOf, sceneWithTake, MAX_TAKES } from '../../client/src/takes.js';

const read = f => fs.readFileSync(new URL(`../../client/src/${f}`, import.meta.url), 'utf8');

test('a scene that already has a video keeps it as a take when new takes arrive', () => {
  const scene = { id: 's1', videoUrl: 'https://v/old.mp4', assetId: 'a-old', assetStoragePath: 'u/old.mp4' };
  const merged = mergeTakes(scene, [{ id: 't1', videoUrl: 'https://v/1.mp4' }, { id: 't2', videoUrl: 'https://v/2.mp4' }], 111);
  assert.equal(merged.length, 3);
  assert.deepEqual(merged[0], { id: 'take-prev-111', videoUrl: 'https://v/old.mp4', assetId: 'a-old', assetStoragePath: 'u/old.mp4' });
  assert.deepEqual(merged.slice(1).map(t => t.id), ['t1', 't2']);
});

test('a first render creates one take; an empty scene has none', () => {
  assert.deepEqual(mergeTakes({ id: 's' }, [{ id: 't1', videoUrl: 'u' }]).map(t => t.id), ['t1']);
  assert.deepEqual(mergeTakes({ id: 's' }, []), []);
  assert.equal(activeTakeOf({ id: 's' }), null);
});

test('only the newest takes are kept, but the one in use is never dropped', () => {
  const many = Array.from({ length: 8 }, (_, i) => ({ id: `t${i}`, videoUrl: `u${i}` }));
  const kept = mergeTakes({ id: 's', takes: many.slice(0, 7), activeTakeId: 't0' }, [many[7]]);
  assert.equal(kept.length, MAX_TAKES);
  assert.ok(kept.some(t => t.id === 't0'), 'the take in use stays');
  assert.ok(kept.some(t => t.id === 't7'), 'the newest take stays');
  const plain = mergeTakes({ id: 's', takes: many.slice(0, 7), activeTakeId: 't6' }, [many[7]]);
  assert.deepEqual(plain.map(t => t.id), ['t2', 't3', 't4', 't5', 't6', 't7']);
});

test('the chosen take is the one in the film; with no choice the newest is', () => {
  const takes = [{ id: 'a', videoUrl: 'u1' }, { id: 'b', videoUrl: 'u2' }];
  assert.equal(activeTakeOf({ takes }).id, 'b');
  assert.equal(activeTakeOf({ takes, activeTakeId: 'a' }).id, 'a');
  assert.equal(activeTakeOf({ takes, activeTakeId: 'gone' }).id, 'b');
});

test('choosing a take switches the video and the asset used by the export', () => {
  const scene = { id: 's', number: 2, videoUrl: 'u2', assetId: 'asset-b', assetStoragePath: 'p/b', activeTakeId: 'b', takes: [{ id: 'a', videoUrl: 'u1', assetId: 'asset-a', assetStoragePath: 'p/a' }, { id: 'b', videoUrl: 'u2', assetId: 'asset-b', assetStoragePath: 'p/b' }] };
  const next = sceneWithTake(scene, scene.takes[0], 'https://fresh/a.mp4');
  assert.equal(next.videoUrl, 'https://fresh/a.mp4');
  assert.equal(next.assetId, 'asset-a');
  assert.equal(next.assetStoragePath, 'p/a');
  assert.equal(next.activeTakeId, 'a');
  assert.equal(next.takes[0].videoUrl, 'https://fresh/a.mp4');
  assert.equal(next.takes[1].videoUrl, 'u2');
  assert.equal(scene.assetId, 'asset-b', 'the original scene object is not changed');
  // A take that was never saved to the library has no asset: the export must not use the old take's asset.
  const unsaved = sceneWithTake(scene, { id: 'c', videoUrl: 'u3' }, 'u3');
  assert.equal(unsaved.assetId, undefined);
});

test('the screen is wired for takes: two-take button, chooser, per-take renders', () => {
  const board = read('components/Storyboard.jsx');
  assert.match(board, /generateScene\(scene, \{ takes: 2 \}\)/);
  assert.match(board, /useTake\(scene, take\)/);
  assert.match(board, /activeTakeOf\(scene\)/);
  const main = read('main.jsx');
  assert.match(main, /useTake=\{useTake\}/);
  assert.match(main, /Promise\.allSettled\(Array\.from\(\{length:takeCount\}/);
  assert.match(main, /takes:mergeTakes\(x,newTakes\)/);
  assert.match(main, /sceneWithTake\(x,take,url\)/);
  assert.match(main, /const takeCount=Math\.max\(1,Math\.min\(2,/);   // never more than two renders per click
});

test('the edited scene functions are valid JavaScript (the client build is not run in these tests)', () => {
  const main = read('main.jsx');
  const grab = (start, end) => { const a = main.indexOf(start); const b = main.indexOf(end, a); assert.ok(a >= 0 && b > a, start); return main.slice(a, b); };
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'avirzo-syntax-'));
  try {
    for (const [name, code] of [['generateScene', grab('async function generateScene(', 'async function useTake(')], ['useTake', grab('async function useTake(', 'async function generateAll(')]]) {
      const file = path.join(dir, `${name}.js`);
      fs.writeFileSync(file, `async function wrapper(){\n${code}\n}\n`);
      const r = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
      assert.equal(r.status, 0, `${name}: ${r.stderr}`);
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
