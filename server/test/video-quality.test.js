import test from 'node:test';
import assert from 'node:assert/strict';
import { composeCinematicPrompt, RUNWAY_PROMPT_MAX } from '../src/services/videoPrompt.js';

const quality = 'Cinematic composition, motivated film lighting, natural human movement and believable physics; stable faces and anatomy, consistent wardrobe and props, clean temporal motion, coherent exposure and colour. One continuous, readable shot; no abrupt morphing, flicker, duplicated limbs, warped objects, text, subtitles, logos or watermarks.';

test('cinematic prompt includes practical motion and visual consistency safeguards', () => {
  const prompt = composeCinematicPrompt({
    fixed: `Shot 3. Historical drama; slow dolly. Setting: Buganda, Uganda; language Luganda. ${quality}`,
    scene: 'A village elder walks into the courtyard and greets her granddaughter.',
    extras: ['Cultural grounding: Respect locally researched dress, architecture and etiquette; do not invent sacred customs.', 'World Bible: period-appropriate barkcloth and woven fabrics.']
  });
  assert.ok(prompt.length <= RUNWAY_PROMPT_MAX);
  assert.match(prompt, /natural human movement and believable physics/i);
  assert.match(prompt, /stable faces and anatomy/i);
  assert.match(prompt, /clean temporal motion/i);
  assert.match(prompt, /village elder walks into the courtyard/i);
  assert.match(prompt, /Buganda, Uganda/);
  assert.match(prompt, /do not invent sacred customs/i);
});

test('long scene prompts are capped without dropping scene action or quality direction', () => {
  const scene = 'A character crosses the courtyard. '.repeat(100);
  const prompt = composeCinematicPrompt({ fixed: quality, scene, extras: ['Cultural grounding: Respect locally researched heritage and do not invent sacred customs.'] });
  assert.ok(prompt.length <= RUNWAY_PROMPT_MAX);
  assert.match(prompt, /natural human movement and believable physics/i);
  assert.match(prompt, /Scene action:/);
  assert.match(prompt, /A character crosses the courtyard/);
  assert.match(prompt, /Cultural grounding: Respect locally researched heritage/);
});

test('optional context cannot crowd out the scene action', () => {
  const prompt = composeCinematicPrompt({ fixed: quality, scene: 'The lead character turns toward the doorway.', extras: ['x'.repeat(900)] });
  assert.ok(prompt.length <= RUNWAY_PROMPT_MAX);
  assert.match(prompt, /The lead character turns toward the doorway/);
});
