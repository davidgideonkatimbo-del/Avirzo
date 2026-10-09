// Shared scene-continuity preflight. Used by /api/ai/scene-continuity (UI feedback) and enforced again
// inside /api/generate so the guard cannot be skipped by calling the provider route directly.

const MODERN_TERMS = [
  'smartphone', 'iphone', 'android phone', 'wi-?fi', 'tiktok', 'instagram', 'whatsapp', 'facebook', 'youtube',
  'twitter', 'uber', 'tesla (?:car|model|motors)', 'social media', 'selfie', 'hashtag', 'bitcoin', 'covid(?:-19)?'
];
const MODERN_RE = new RegExp(`\\b(?:${MODERN_TERMS.join('|')})\\b`, 'gi');
// Any explicit year from 1994 onward is out of place in a pre-1994 setting.
const LATE_YEAR_RE = /\b(?:199[4-9]|20[0-2]\d)\b/g;

export function findAnachronisms(text) {
  const t = String(text || '');
  return [...new Set([...(t.match(MODERN_RE) || []), ...(t.match(LATE_YEAR_RE) || [])].map(x => x.toLowerCase()))];
}

export function isPre1994Setting(era, period) {
  return era === 'pre1994' || /pre[- ]?1994|19th|18th|17th|16th|15th/.test(String(period || '').toLowerCase());
}

function compactCharacterLine(c){return `${c.name||'Unnamed'} — community ${c.community||'unspecified'}; language ${c.language||'unspecified'}; appearance ${c.appearance||'unspecified'}; clothing ${c.clothing||'unspecified'}; visual identity ${c.visualIdentity||'not defined'}; continuity ${c.continuityNotes||'maintain established identity across scenes'}`;}

// ---- Relevance-ranked continuity context -------------------------------------------------------------
// The generation prompt has a hard ~1000 character window, so the continuity lock must be *selected*, not dumped.
// Instead of "primary character + whatever world fields come first, cut at 900 chars", rank every candidate
// (other characters, world-bible fields, individual continuity locks) by how much it overlaps the scene text,
// then fill the budget best-first. Pure lexical scoring: no embedding API, no network, no extra token cost.
const CTX_STOP = new Set(['the','and','that','with','from','this','into','your','have','will','they','their','about','there','were','been','then','when','where','which','while','story','scene','for','are','was','his','her','she','him','its','not','but','all','can','has','had']);
function ctxTokens(text) {
  return new Set((String(text || '').toLowerCase().match(/[a-zà-ÿ']{3,}/g) || []).filter(w => !CTX_STOP.has(w)));
}
export function relevanceScore(queryTokens, text) {
  if (!queryTokens.size) return 0;
  let hits = 0;
  for (const t of ctxTokens(text)) if (queryTokens.has(t)) hits++;
  return hits;
}
const WORLD_FIELDS = [
  // [key, label, baseline] — baseline keeps the core style rules in even when the scene text shares no words with them.
  ['visualRules', 'Visual rules', 2], ['continuityLocks', 'Locks', 3], ['costumes', 'Costumes', 0],
  ['languageRules', 'Language', 0], ['locations', 'Locations', 0], ['objects', 'Objects', 0],
  ['architecture', 'Architecture', 0], ['culturalPractices', 'Practices', 0]
];
export function selectContinuityContext({ sceneText = '', primary = null, characters = [], worldBible = {}, budget = 900 } = {}) {
  const query = ctxTokens(sceneText);
  const lowerScene = String(sceneText).toLowerCase();
  const parts = [];
  const includedCharacters = [];
  let used = 0;
  const push = (text, name) => {
    const t = String(text || '').trim(); if (!t) return false;
    const cost = t.length + (parts.length ? 3 : 0); // " | " separator
    if (used + cost > budget) {
      const room = budget - used - (parts.length ? 3 : 0);
      if (room < 60) return false;
      const cut = t.slice(0, room); const at = Math.max(cut.lastIndexOf('; '), cut.lastIndexOf('. '), cut.lastIndexOf(', '));
      parts.push((at > 40 ? cut.slice(0, at) : cut).trim()); used = budget; if (name) includedCharacters.push(name); return true;
    }
    parts.push(t); used += cost; if (name) includedCharacters.push(name); return true;
  };
  // 1. The primary character is always locked in full.
  if (primary) push(compactCharacterLine(primary), primary.name || 'Unnamed');
  // 2. Other characters only when the scene mentions them (by name) or overlaps their identity text. Max 3.
  const others = characters.filter(c => c && c !== primary && c.id !== primary?.id).map(c => {
    const name = String(c.name || '').trim().toLowerCase();
    const mentioned = name.length >= 2 && new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(lowerScene);
    return { c, score: (mentioned ? 10 : 0) + relevanceScore(query, [c.appearance, c.clothing, c.visualIdentity, c.continuityNotes, c.relationships].join(' ')) };
  }).filter(x => x.score >= 3).sort((a, b) => b.score - a.score).slice(0, 3);
  for (const { c } of others) push(compactCharacterLine(c), c.name || 'Unnamed');
  // 3. World rules, best-first. Locks are split into single lines so one relevant lock can win without dragging in all of them.
  const candidates = [];
  for (const [key, label, baseline] of WORLD_FIELDS) {
    const value = String(worldBible?.[key] || '').trim(); if (!value) continue;
    if (key === 'continuityLocks') {
      value.split(/\n+/).map(x => x.trim()).filter(Boolean).slice(0, 20).forEach((line, i) => candidates.push({ text: `Lock: ${line}`, score: baseline + relevanceScore(query, line) * 2 - i * 0.01 }));
    } else candidates.push({ text: `${label}: ${value.slice(0, 220)}`, score: baseline + relevanceScore(query, value) * 2 });
  }
  candidates.sort((a, b) => b.score - a.score);
  for (const cand of candidates) { if (cand.score <= 0 && parts.length) continue; if (!push(cand.text)) { if (used >= budget) break; } }
  return { context: parts.join(' | ').slice(0, budget), includedCharacters };
}

export function sceneContinuityGuard({scene={}, characters=[], worldBible={}, rootsFoundation={}, era='pre1994'}){
 const text=String(scene.prompt||scene.description||scene.storyBeat||'').trim();
 const warnings=[]; const blockers=[];
 const primary=characters.find(c=>c.id===scene.primaryCharacterId) || characters[0] || null;
 if(characters.length && !characters.find(c=>c.id===scene.primaryCharacterId) && primary){
  warnings.push(`Scene ${scene.number||'?'} had no primary character assigned — using ${primary.name||'the first character'} for continuity.`);
 }
 const period=String(rootsFoundation.period||'').toLowerCase();
 if(isPre1994Setting(era,period) && findAnachronisms(text).length) blockers.push(`Scene ${scene.number||'?'} contains a possible modern/anachronistic reference for the selected period: ${findAnachronisms(text).slice(0,4).join(', ')}. Edit the scene text or change the period if this is intentional.`);
 if(primary){
  if(!String(primary.visualIdentity||'').trim()) warnings.push(`${primary.name||'Primary character'} has no locked visual identity.`);
  if(!String(primary.clothing||'').trim()) warnings.push(`${primary.name||'Primary character'} has no locked clothing/adornment.`);
  if(!String(primary.language||'').trim()) warnings.push(`${primary.name||'Primary character'} has no locked language/dialect.`);
  if(primary.continuityNotes) warnings.push(`Preserve ${primary.name||'the primary character'} continuity: ${String(primary.continuityNotes).slice(0,220)}.`);
 }
 const locks=String(worldBible.continuityLocks||'').split(/\n+/).map(x=>x.trim()).filter(Boolean).slice(0,8);
 if(locks.length) warnings.push(`World locks: ${locks.join(' | ')}`);
 const selected=selectContinuityContext({sceneText:text, primary, characters, worldBible, budget:900});
 return {ready:blockers.length===0,blockers,warnings,primaryCharacter:primary?.name||null,continuityContext:selected.context,includedCharacters:selected.includedCharacters,principle:'Continuity locks preserve established creative choices; research and community review remain authoritative for cultural and historical accuracy.'};
}
