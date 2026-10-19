import { SCENE_PROMPT_LIMITS } from './videoPrompt.js';

/**
 * Deterministic shot planner (no external AI provider, no extra cost).
 * Turns story text into shot-sized scenes: one visual beat each, short enough for the
 * video prompt budget, with a title, a camera movement, a suggested clip length and a
 * primary character matched by name. Used by POST /api/storyboard.
 */

const CAMERA_RULES = [
  ['Handheld', /\b(run|runs|ran|running|chase|chased|flee|flees|fled|escape|escapes|escaped|slip|slips|slipped|creep|creeps|crept|search|searches|searched|scout|scouts|hunt|hunts|hunted|panic|hide|hides|hiding|sneak|sneaks)\b/i],
  ['Crane reveal', /\b(reveal|reveals|rise|rises|rising|above|sky|cloud|clouds|mist|hilltop|hill|mountain|valley|horizon|dawn over|overlook|towering)\b/i],
  ['Orbit', /\b(shrine|monument|ritual|ceremony|dance|dances|circle|circles|encircle|altar|sacred)\b/i],
  ['Wide tracking', /\b(army|armies|warriors|battle|archers|bows|line of|crowd|charge|charges|march|marches|procession|river|journey|travel|travels|caravan|migrat\w*)\b/i],
  ['Static', /\b(sits|sat|watches|watched|stares|stared|eyes|face|listens|listened|waits|waited|silent|silence|quiet|alone|realiz\w*|understands|understood|remembers|portrait)\b/i],
  ['Slow dolly', /\b(approach|approaches|enter|enters|walks|walked|whispers|reaches|points|pointed|speaks|says)\b/i]
];

const LONG_CLIP = /\b(battle|army|armies|charge|archers|bows|strike|strikes|storm|fire|burn|burning|flood|procession|journey|march)\b/i;
const NARRATOR_LEAD = /^(?:legend|tradition|oral tradition|the legend|the story)\s+(?:tells|says|holds|goes)(?:\s+(?:of|that))?\s*/i;
const TITLE_SKIP = new Set(['the', 'a', 'an', 'in', 'on', 'at', 'of', 'and', 'to', 'as', 'with', 'by', 'for', 'from', 'some', 'then', 'before', 'after', 'while', 'when']);

function clean(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function splitSentences(story) {
  return clean(story).split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
}

/** Cut at a clause or word boundary so a shot never ends mid-word. */
function fitToLimit(text, limit) {
  const t = clean(text);
  if (t.length <= limit) return t;
  const head = t.slice(0, limit);
  const clause = Math.max(head.lastIndexOf('; '), head.lastIndexOf(', '), head.lastIndexOf(' — '));
  const cut = clause > limit * 0.55 ? clause : head.lastIndexOf(' ');
  const out = (cut > 0 ? head.slice(0, cut) : head).replace(/[,;:—\s]+$/, '');
  return /[.!?]$/.test(out) ? out : `${out}.`;
}

/** One beat per sentence; merge very short ones forward; split over-long ones at clause breaks. */
function toBeats(story, max) {
  const out = [];
  let carry = '';
  for (const raw of splitSentences(story)) {
    const sentence = clean(`${carry} ${raw}`);
    carry = '';
    if (sentence.length < 45) { carry = sentence; continue; }
    if (sentence.length <= max) { out.push(sentence); continue; }
    const parts = sentence.split(/(?<=[,;])\s+/);
    let cur = '';
    for (const part of parts) {
      if (cur && (cur.length + part.length + 1) > max) { out.push(cur); cur = part; } else { cur = cur ? `${cur} ${part}` : part; }
    }
    if (cur) out.push(cur);
  }
  if (carry) {
    if (out.length && out[out.length - 1].length + carry.length < max) out[out.length - 1] += ` ${carry}`;
    else out.push(carry);
  }
  return out;
}

/** Pack neighbouring beats into one shot while the result stays within the comfortable budget. */
function packBeats(beats, comfortable) {
  const out = [];
  for (const beat of beats) {
    const last = out[out.length - 1];
    if (last && (last.length + beat.length + 1) <= comfortable) out[out.length - 1] = `${last} ${beat}`;
    else out.push(beat);
  }
  return out;
}

function pickCamera(text, previous) {
  let best = 'Slow dolly';
  let bestScore = 0;
  for (const [camera, rx] of CAMERA_RULES) {
    const hits = (text.match(new RegExp(rx.source, 'gi')) || []).length;
    if (hits > bestScore) { best = camera; bestScore = hits; }
  }
  // Avoid the same move three times in a row; it reads as monotone.
  if (previous.length >= 2 && previous[previous.length - 1] === best && previous[previous.length - 2] === best) {
    return best === 'Slow dolly' ? 'Static' : 'Slow dolly';
  }
  return best;
}

const PRONOUNS = new Set(['he', 'she', 'they', 'it', 'his', 'her', 'their', 'we', 'i', 'you']);

function titleFor(text, number) {
  const words = clean(text).replace(NARRATOR_LEAD, '').split(' ').map(w => w.replace(/[^\p{L}\p{N}'’-]/gu, '')).filter(Boolean);
  const isSkippable = w => TITLE_SKIP.has(w.toLowerCase()) || PRONOUNS.has(w.toLowerCase());
  // Prefer a proper noun that is not just the capitalised first word of the sentence.
  let from = words.findIndex((w, i) => i > 0 && /^\p{Lu}/u.test(w) && !isSkippable(w));
  if (from < 0) from = words.findIndex(w => !isSkippable(w));
  if (from < 0) return `Scene ${number}`;
  const picked = [];
  for (let i = from; i < words.length && picked.length < 3; i++) {
    if (picked.length && TITLE_SKIP.has(words[i].toLowerCase())) break;
    picked.push(words[i]);
  }
  const title = picked.join(' ');
  return title.charAt(0).toUpperCase() + title.slice(1);
}

function matchCharacter(text, characters, fallback) {
  const lower = text.toLowerCase();
  for (const c of characters) {
    const name = clean(c?.name).toLowerCase();
    if (!name) continue;
    const first = name.split(' ')[0];
    if (lower.includes(name) || (first.length > 2 && lower.includes(first))) return c.name;
  }
  return fallback;
}

export function planShots({ story, characters = [], maxScenes = 24, limits = SCENE_PROMPT_LIMITS } = {}) {
  const chars = Array.isArray(characters) ? characters.filter(c => c && c.name) : [];
  // A blank line in the story marks a new beat: shots are only packed together inside one paragraph.
  const paragraphs = String(story || '').split(/\n\s*\n/).map(par => clean(par).replace(NARRATOR_LEAD, '')).filter(Boolean);
  const beats = paragraphs
    .flatMap(par => packBeats(toBeats(par, limits.max), limits.comfortable))
    .slice(0, Math.max(1, maxScenes));
  const cameras = [];
  let lastCharacter = chars[0]?.name || '';
  return beats.map((beat, i) => {
    const prompt = fitToLimit(beat.replace(NARRATOR_LEAD, ''), limits.max);
    const camera = pickCamera(prompt, cameras);
    cameras.push(camera);
    lastCharacter = matchCharacter(prompt, chars, lastCharacter);
    return {
      number: i + 1,
      title: titleFor(prompt, i + 1),
      prompt: prompt.charAt(0).toUpperCase() + prompt.slice(1),
      camera,
      duration: LONG_CLIP.test(prompt) ? '10 sec' : '5 sec',
      primaryCharacterName: lastCharacter,
      promptLength: prompt.length
    };
  });
}
