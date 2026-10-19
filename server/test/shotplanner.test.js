import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { planShots } from '../src/services/shotPlanner.js';
import { SCENE_PROMPT_LIMITS } from '../src/services/videoPrompt.js';

const STORY = [
  'Kibuuka, the war spirit of Buganda, is sent to help the king against Bunyoro. He fights from the mist above the hill, striking from the clouds.',
  'At night, Bunyoro scouts creep through the grass and search the hills. They find nothing. Spears fall from empty cloud, and their warriors scatter.',
  'In the camp sits Nyakato, a captive woman. She says little and watches everything.',
  'Before dawn she slips away through the papyrus, water at her ankles, and crosses the lines to her own people.',
  'At first light, the archers raise their bows toward the tree.'
].join('\n\n');
const CHARS = [{ name: 'Kibuuka' }, { name: 'Nyakato' }];

test('planner makes one shot per paragraph beat and never exceeds the prompt budget', () => {
  const shots = planShots({ story: STORY, characters: CHARS });
  assert.equal(shots.length, 5);
  for (const s of shots) {
    assert.ok(s.prompt.length <= SCENE_PROMPT_LIMITS.max, `shot ${s.number} is ${s.prompt.length} chars`);
    assert.ok(s.title && s.title.length < 40);
    assert.ok(['5 sec', '10 sec'].includes(s.duration));
  }
});

test('planner picks camera moves from the action and matches characters by name', () => {
  const shots = planShots({ story: STORY, characters: CHARS });
  assert.equal(shots[1].camera, 'Handheld');
  assert.equal(shots[3].camera, 'Handheld');
  assert.equal(shots[4].camera, 'Wide tracking');
  assert.equal(shots[4].duration, '10 sec');
  assert.equal(shots[2].primaryCharacterName, 'Nyakato');
  assert.equal(shots[0].primaryCharacterName, 'Kibuuka');
});

test('planner never uses the same camera move three times in a row', () => {
  const story = Array.from({ length: 6 }, () => 'The warriors run through the grass, fleeing across the open plain at speed.').join('\n\n');
  const cams = planShots({ story, characters: [] }).map(s => s.camera);
  for (let i = 2; i < cams.length; i++) assert.ok(!(cams[i] === cams[i - 1] && cams[i] === cams[i - 2]), cams.join(','));
});

test('planner splits one over-long sentence and honours maxScenes', () => {
  const long = Array.from({ length: 40 }, (_, i) => `the traveller crosses ridge number ${i}`).join(', ') + '.';
  const shots = planShots({ story: long, characters: [], maxScenes: 3 });
  assert.equal(shots.length, 3);
  shots.forEach(s => assert.ok(s.prompt.length <= SCENE_PROMPT_LIMITS.max));
});

test('planner handles empty or single-sentence stories', () => {
  assert.equal(planShots({ story: '' }).length, 0);
  const one = planShots({ story: 'A village wakes at dawn beside the river.' });
  assert.equal(one.length, 1);
  assert.equal(one[0].primaryCharacterName, '');
});

test('storyboard route uses the shot planner and the client shows the prompt budget', () => {
  const heritage = fs.readFileSync(new URL('../src/routes/heritage.js', import.meta.url), 'utf8');
  assert.match(heritage, /planShots/);
  assert.match(heritage, /SCENE_PROMPT_LIMITS/);
  const board = fs.readFileSync(new URL('../../client/src/components/Storyboard.jsx', import.meta.url), 'utf8');
  assert.match(board, /promptBudget/);
  const constants = fs.readFileSync(new URL('../../client/src/constants.js', import.meta.url), 'utf8');
  assert.match(constants, /SCENE_PROMPT_LIMITS = \{ comfortable: 220, max: 370 \}/);
  assert.match(constants, /id: 'kibuuka-legend'/);
});
