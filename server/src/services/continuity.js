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
export function sceneContinuityGuard({scene={}, characters=[], worldBible={}, rootsFoundation={}, era='pre1994'}){
 const text=String(scene.prompt||scene.description||scene.storyBeat||'').trim();
 const warnings=[]; const blockers=[];
 const primary=characters.find(c=>c.id===scene.primaryCharacterId) || null;
 if(characters.length && !primary) blockers.push(`Scene ${scene.number||'?'} has no primary character assigned.`);
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
 const characterLine=primary ? compactCharacterLine(primary) : '';
 const context=[characterLine, String(worldBible.visualRules||''), String(worldBible.costumes||''), String(worldBible.languageRules||''), locks.join('; ')].filter(Boolean).join(' | ');
 return {ready:blockers.length===0,blockers,warnings,primaryCharacter:primary?.name||null,continuityContext:context.slice(0,900),principle:'Continuity locks preserve established creative choices; research and community review remain authoritative for cultural and historical accuracy.'};
}
