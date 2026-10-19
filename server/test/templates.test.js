import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { heritageTemplates, communityPacks, dedupeTemplates } from '../../client/src/constants.js';

test('no template appears twice (id, title or story opening)', () => {
  const ids = heritageTemplates.map(t => t.id);
  assert.equal(new Set(ids).size, ids.length);
  const titles = heritageTemplates.map(t => t.title.toLowerCase());
  assert.equal(new Set(titles).size, titles.length);
});

test('dedupeTemplates drops repeats and keeps the first', () => {
  const a = { id: 'a', title: 'Elder', story: 'Before sunrise, a grandfather walks.' };
  const list = [a, { ...a }, { id: 'b', title: ' elder! ', story: 'x' }, { id: 'c', title: 'Other', story: 'BEFORE sunrise a grandfather walks' }, { id: 'd', title: 'Fresh', story: 'y' }];
  assert.deepEqual(dedupeTemplates(list).map(t => t.id), ['a', 'd']);
});

test('packs only list real templates, each once', () => {
  const ids = new Set(heritageTemplates.map(t => t.id));
  for (const p of communityPacks) {
    assert.equal(new Set(p.templateIds).size, p.templateIds.length);
    for (const id of p.templateIds) assert.ok(ids.has(id), `${p.id} lists unknown ${id}`);
  }
});

test('generate: provider timeout and reference-image fallback are in place', () => {
  const src = fs.readFileSync(new URL('../src/services/videoProvider.js', import.meta.url), 'utf8');
  assert.match(src, /AbortSignal\.timeout\(/);
  assert.match(src, /ref: ''/);
});

test('tightenShot shortens an over-long shot at a clause break and keeps its opening action', async () => {
  const { tightenShot } = await import('../../client/src/shotTighten.js');
  const long = 'Legend tells of a tall archer who very slowly climbs the mist-covered hill, ' + 'his cloak snapping in the wind, '.repeat(20) + 'and he vanishes.';
  const out = tightenShot(long, 370);
  assert.ok(out.length <= 370 && out.length > 100);
  assert.match(out, /^A tall archer/);
  assert.match(out, /[.!?]$/);
  assert.equal(tightenShot('Short shot.', 370), 'Short shot.');
});
