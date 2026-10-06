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


const FIELD_LABELS = {
  clothing: 'clothing/adornment',
  language: 'language/dialect',
  visualIdentity: 'visual identity',
  possessions: 'possessions',
  relationships: 'relationships',
  community: 'community/people',
  occupation: 'occupation'
};
const OVERRIDE_RE = /\b(?:now|suddenly|later|afterward|instead|different|changed|changes|switches?|switched|removes?|removed|replaces?|replaced|no longer|without|wears?|wearing|speaks?|speaking|moves?|moved)\b[^.!?]{0,100}/gi;
function normalizeLines(value){ return String(value||'').split(/\n+/).map(x=>x.trim()).filter(Boolean); }
function sceneText(scene){ return String([scene.title,scene.prompt,scene.description,scene.storyBeat,scene.aiBeat].filter(Boolean).join(' ')).trim(); }
function fieldMentions(sceneTextValue, fieldValue){
  const terms=String(fieldValue||'').split(/[,;|\n]+/).map(x=>x.trim()).filter(x=>x.length>=4).slice(0,12);
  const lower=sceneTextValue.toLowerCase();
  return terms.filter(t=>lower.includes(t.toLowerCase()));
}
export function characterWorldContinuityAudit({characters=[],scenes=[],worldBible={},rootsFoundation={},era='pre1994'}){
  const sceneList=Array.isArray(scenes)?scenes:[];
  const warnings=[]; const blockers=[]; const characterResults=[]; const sceneResults=[];
  const worldFields=['locations','objects','costumes','architecture','culturalPractices','musicSoundscape','languageRules','visualRules','familyStructure'];
  const worldLocks=normalizeLines(worldBible.continuityLocks).slice(0,20);
  const rootAnchors=[rootsFoundation.community,rootsFoundation.country,rootsFoundation.place,rootsFoundation.language,rootsFoundation.period].filter(Boolean).map(String);

  characters.forEach(c=>{
    const assigned=sceneList.filter(s=>s.primaryCharacterId===c.id);
    const flags=[]; const deliberate=[];
    assigned.forEach((scene,index)=>{
      const text=sceneText(scene);
      const overrides=(text.match(OVERRIDE_RE)||[]).slice(0,3);
      if(overrides.length) deliberate.push({scene:scene.number||index+1,notes:overrides});
      for(const key of Object.keys(FIELD_LABELS)){
        const value=String(c[key]||'').trim();
        if(!value) continue;
        const mentions=fieldMentions(text,value);
        if(mentions.length) continue;
        if(key==='visualIdentity' && index>0 && !String(scene.primaryCharacterId||'').trim()) flags.push(`Scene ${scene.number||index+1} does not explicitly carry the visual identity lock.`);
      }
    });
    if(assigned.length>1 && !String(c.continuityNotes||'').trim()) flags.push('Multiple scenes use this character but no explicit continuity rules are recorded.');
    if(assigned.length>1 && !String(c.relationships||'').trim()) flags.push('Relationship continuity is not defined for a recurring character.');
    characterResults.push({id:c.id,name:c.name||'Unnamed',sceneCount:assigned.length,scenes:assigned.map(s=>s.number),flags,deliberateChanges:deliberate,status:flags.length?'Review':'Stable'});
    flags.forEach(f=>warnings.push(`${c.name||'Unnamed character'}: ${f}`));
  });

  sceneList.forEach((scene,index)=>{
    const text=sceneText(scene); const flags=[]; const mentions={};
    for(const key of worldFields){ const hits=fieldMentions(text,worldBible[key]); if(hits.length) mentions[key]=hits; }
    const explicitOverrides=(text.match(OVERRIDE_RE)||[]).slice(0,4);
    if(explicitOverrides.length) flags.push('Possible deliberate change detected — record it in the character/world continuity notes if it is intentional.');
    if(index>0){
      const prev=sceneList[index-1];
      if(prev?.primaryCharacterId && scene.primaryCharacterId && prev.primaryCharacterId!==scene.primaryCharacterId) flags.push(`Primary character changes from Scene ${prev.number||index} to Scene ${scene.number||index+1}; verify this is an intentional story transition.`);
      if(prev?.camera && scene.camera && prev.camera!==scene.camera) flags.push(`Camera language changes from “${prev.camera}” to “${scene.camera}”; review whether the change is motivated.`);
    }
    if(isPre1994Setting(era,rootsFoundation.period) && findAnachronisms(text).length) flags.push(`Possible period drift: ${findAnachronisms(text).slice(0,4).join(', ')}.`);
    sceneResults.push({number:scene.number||index+1,flags,worldMentions:mentions,explicitOverrides});
    flags.forEach(f=>warnings.push(`Scene ${scene.number||index+1}: ${f}`));
  });

  const missingWorld=worldFields.filter(k=>!String(worldBible[k]||'').trim());
  if(missingWorld.length) warnings.push(`World Bible has no defined ${missingWorld.slice(0,4).map(k=>FIELD_LABELS[k]||k).join(', ')}${missingWorld.length>4?' and other fields':''}.`);
  if(worldLocks.length===0) warnings.push('No World Bible continuity locks are recorded.');
  if(rootAnchors.length<3) warnings.push('The roots foundation has fewer than three defined anchors; cultural drift is harder to detect without a specific community, place and period.');

  const totalChecks=Math.max(1,characters.length*2+sceneList.length+worldFields.length+2);
  const deductions=Math.min(totalChecks, blockers.length*2+warnings.length);
  const score=Math.max(0,Math.round(100-(deductions/totalChecks)*100));
  return {score,ready:blockers.length===0 && score>=75,blockers,warnings,characters:characterResults,scenes:sceneResults,world:{missing:missingWorld,locks:worldLocks,anchors:rootAnchors},principle:'This audit detects production continuity risks and explicit changes. It does not establish cultural or historical truth; research and community review remain authoritative.'};
}
