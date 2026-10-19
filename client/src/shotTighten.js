/**
 * Rule-based "shorten to fit" for one shot. No AI call, no cost.
 * Drops narrator lead-ins and filler words first, then cuts at a clause or word boundary,
 * so the shot keeps its opening action and never ends mid-word.
 */
const LEAD = /^(?:legend|tradition|oral tradition|the legend|the story)\s+(?:tells|says|holds|goes)(?:\s+(?:of|that))?\s*/i;
const FILLER = /\b(?:very|really|quite|suddenly|slowly and carefully|just|simply|somehow|almost|seemingly)\s+/gi;

export function tightenShot(text, limit) {
  let t = String(text || '').replace(/\s+/g, ' ').trim();
  if (t.length <= limit) return t;
  t = t.replace(LEAD, '').replace(FILLER, '').replace(/\s+/g, ' ').trim();
  t = t.charAt(0).toUpperCase() + t.slice(1);
  if (t.length <= limit) return t;
  const head = t.slice(0, limit);
  const clause = Math.max(head.lastIndexOf('; '), head.lastIndexOf(', '), head.lastIndexOf(' — '));
  const cut = clause > limit * 0.55 ? clause : head.lastIndexOf(' ');
  const out = (cut > 0 ? head.slice(0, cut) : head).replace(/[,;:—\s]+$/, '');
  return /[.!?]$/.test(out) ? out : `${out}.`;
}
