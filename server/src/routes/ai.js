import { sceneContinuityGuard, characterWorldContinuityAudit } from '../services/continuity.js';
const STOP = new Set(['the','and','that','with','from','this','into','your','have','will','they','their','about','there','were','been','then','when','where','which','while','story','scene']);
const splitSentences = text => String(text || '').replace(/\s+/g,' ').split(/(?<=[.!?])\s+/).map(x=>x.trim()).filter(Boolean);
const words = text => String(text || '').toLowerCase().match(/[a-zA-ZÀ-ÿ']{3,}/g) || [];
function keywords(text, limit=12){const counts={};for(const w of words(text)){if(STOP.has(w))continue;counts[w]=(counts[w]||0)+1;}return Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,limit).map(([word])=>word);}
function beatType(i,total){if(i===0)return 'establishing';if(i===total-1)return 'resolution';if(i<Math.ceil(total*.3))return 'setup';if(i<Math.ceil(total*.6))return 'rising-action';if(i<Math.ceil(total*.82))return 'turning-point';return 'climax';}
function suggestCamera(beat,i){return beat==='establishing'?'Wide tracking':beat==='turning-point'?'Handheld':beat==='climax'?'Crane reveal':i%2?'Slow dolly':'Static';}
function visualGrammar(beat,i){const lighting=beat==='establishing'?'Natural dawn / environmental light':beat==='climax'?'High-contrast motivated light':'Soft motivated light';const sound=beat==='establishing'?'Environment first, dialogue secondary':beat==='climax'?'Layered ambience, impact and restrained score':'Natural ambience with selective score';const transition=beat==='resolution'?'Hold longer on the emotional aftermath':'Cut on action or visual change';return {lighting,sound,transition,shotSize:i===0?'wide':'medium-to-wide'};}
function analyze({story,characters=[],research={},rootsFoundation={},era='pre1994',storyType='inspired',profile={}}){
  const sentences=splitSentences(story); const total=Math.max(1,Math.min(12,Math.ceil(sentences.length/2)));
  const beats=[]; for(let i=0;i<total;i++){const text=sentences.slice(i*2,i*2+2).join(' ')||story;const beat=beatType(i,total);beats.push({number:i+1,beat,title:`${beat.replace(/-/g,' ')}`,logline:text,camera:suggestCamera(beat,i),...visualGrammar(beat,i),visualGoal: i===0?'Establish place, time and cultural identity':beat==='turning-point'?'Make the change in stakes visually unmistakable':beat==='climax'?'Prioritize emotion, action and readable silhouettes':'Advance the story while preserving continuity'});}
  const missing=[]; if(!characters.length)missing.push('Create at least one character with a visual identity before rendering.'); if(!research?.location)missing.push('Research location and environment before treating setting details as historical fact.'); if(!research?.verifiedFacts && ['historical','oral'].includes(storyType))missing.push('Separate verified facts from oral memory or creative reconstruction.'); if(!rootsFoundation?.community)missing.push('Define the specific African community or cultural group.'); if(!rootsFoundation?.place)missing.push('Define the specific place or landscape.'); if(!rootsFoundation?.culturalAnchors)missing.push('Add cultural anchors before rendering: architecture, clothing, food, tools, music, landscape or social practice.'); if(era==='pre1994' && /smartphone|social media|modern suv|drone|2020|2021|2022|2023|2024|2025|2026/i.test(story))missing.push('Potential post-1994 technology/reference detected in a pre-1994 setting.');
  return {summary:`${profile.market||'African'} ${profile.language||'language'} production · ${storyType} · ${era}`,storyKeywords:keywords(story),beats,readiness:{score:Math.max(0,100-missing.length*18),missing},creative:{recommendedArc:total>=5?'five-beat cinematic arc':'compact narrative arc',pacing:total<=3?'compressed':'measured',coverage:['establishing geography','character motivation','visual transition','turning point','resolution'],rootsFoundation:{community:rootsFoundation.community||'',country:rootsFoundation.country||'',place:rootsFoundation.place||'',language:rootsFoundation.language||profile.language||'',period:rootsFoundation.period||'',evidenceLevel:rootsFoundation.evidenceLevel||'',culturalAnchors:rootsFoundation.culturalAnchors||''}}};
}
function continuity({characters=[],scenes=[]}){const warnings=[];const ids=new Set();characters.forEach(c=>{if(ids.has(c.id))warnings.push(`Duplicate character id: ${c.name||c.id}`);ids.add(c.id);if(!c.visualIdentity)warnings.push(`${c.name||'Unnamed character'} lacks visual identity.`);});scenes.forEach((s,i)=>{if(!s.primaryCharacterId&&characters.length)warnings.push(`Scene ${s.number||i+1} has no primary character assignment.`);if(s.status==='ready'&&!s.assetId)warnings.push(`Scene ${s.number||i+1} is marked ready without an archived asset.`);});return {ok:!warnings.length,warnings,checks:{characters:characters.length,scenes:scenes.length,assignedScenes:scenes.filter(s=>s.primaryCharacterId).length,readyScenes:scenes.filter(s=>s.status==='ready').length}};}

function storyIntelligence({story='', rootsFoundation={}, characters=[], research={}, scenes=[], era='pre1994', storyType='inspired'}) {
  const text=String(story||'').trim();
  const lower=text.toLowerCase();
  const anchors=String(rootsFoundation.culturalAnchors||'').split(/[,;|\n]+/).map(x=>x.trim()).filter(Boolean).slice(0,12);
  const characterNames=characters.map(c=>String(c.name||'').trim()).filter(Boolean);
  const warnings=[];
  const strengths=[];
  const missing=[];
  if(rootsFoundation.community) strengths.push(`Specific community identified: ${rootsFoundation.community}.`); else missing.push('community');
  if(rootsFoundation.place) strengths.push(`Specific place identified: ${rootsFoundation.place}.`); else missing.push('place');
  if(rootsFoundation.period) strengths.push(`Specific period identified: ${rootsFoundation.period}.`); else missing.push('period');
  if(rootsFoundation.language) strengths.push(`Story language identified: ${rootsFoundation.language}.`); else missing.push('language');
  if(anchors.length) strengths.push(`${anchors.length} cultural anchors are available to carry into visual prompts.`); else missing.push('cultural anchors');
  if(research.sources) strengths.push('Research sources are attached.'); else if(['historical','oral','folklore'].includes(storyType)) missing.push('research sources');
  if(characterNames.length) strengths.push(`${characterNames.length} named character${characterNames.length===1?'':'s'} available for continuity.`); else missing.push('characters');
  if(era==='pre1994' && /smartphone|iphone|android|social media|wifi|tesla|uber|tiktok|instagram|drone|2020|2021|2022|2023|2024|2025|2026/i.test(lower)) warnings.push('Possible post-1994 technology, brand or reference detected in a pre-1994 setting.');
  if(!rootsFoundation.evidenceLevel && ['historical','oral','folklore'].includes(storyType)) warnings.push('Evidence level is not defined; distinguish documented history from oral tradition or creative reconstruction.');
  const beats = text ? splitSentences(text).slice(0,12).map((line,i)=>({number:i+1,sceneGoal:i===0?'Establish people, place and time':i===splitSentences(text).length-1?'Land the emotional consequence':'Advance conflict or character choice',storyBeat:line,visualAnchor:anchors[i%Math.max(1,anchors.length)]||'Place and cultural environment',continuityFocus:characterNames[i%Math.max(1,characterNames.length)]||'Primary character',researchFlag:['historical','oral','folklore'].includes(storyType) && !research.verifiedFacts?'verify historical/cultural claim':'ready'})) : [];
  const score=Math.max(0,Math.min(100,100-missing.length*9-warnings.length*7));
  return {score,classification:score>=85?'production-ready foundation':score>=65?'strong foundation':'needs development',strengths,missing,warnings,beats,characterArcPrompts:characterNames.map((name,i)=>({character:name,arc:i===0?'Define desire, fear and transformation.':'Define relationship, pressure and change.'})),culturalAnchors:anchors,sourceDiscipline:{evidenceLevel:rootsFoundation.evidenceLevel||'not specified',sources:research.sources||'',verifiedFacts:research.verifiedFacts||'',uncertainties:research.uncertainties||''},shotLanguage:{establishing:'wide environmental composition with culturally specific details',character:'medium/close framing that preserves identity continuity',transition:'use motivated movement, sound and geography rather than generic spectacle',climax:'prioritize performance, readable action and culturally grounded environment'}};
}

function researchAudit({research={},storyType='inspired',era='pre1994'}){const checks=[['Location',research.location],['Period',research.period],['Verified facts',research.verifiedFacts],['Material culture',research.materialCulture],['Sources',research.sources]];const missing=checks.filter(([,v])=>!String(v||'').trim()).map(([k])=>k);const cautions=[];if(['historical','oral','folklore'].includes(storyType)&&!research.uncertainties)cautions.push('Record uncertainties or disputed details explicitly.');if(era!=='custom'&&!research.period)cautions.push('Confirm the chosen era against the research period.');return {ready:missing.length===0,missing,cautions,principle:'Research guidance is a filmmaking aid, not a substitute for source verification.'};}

function characterContinuity({characters=[],scenes=[],worldBible={},rootsFoundation={}}){
 const warnings=[]; const normalized=Array.isArray(characters)?characters:[]; const sceneList=Array.isArray(scenes)?scenes:[];
 const result=normalized.map(c=>{ const assigned=sceneList.filter(s=>s.primaryCharacterId===c.id); const flags=[];
  if(!String(c.visualIdentity||'').trim()) flags.push('Visual identity is not locked.');
  if(!String(c.clothing||'').trim()) flags.push('Clothing/adornment is not locked.');
  if(!String(c.language||'').trim()) flags.push('Language/dialect is not locked.');
  if(!String(c.continuityNotes||'').trim()) flags.push('Character continuity rules are not defined.');
  if(assigned.length>1&&!String(c.relationships||'').trim()) flags.push('Relationships are missing despite repeated scene appearances.');
  if(assigned.length>1&&!String(c.possessions||'').trim()) flags.push('Important possessions are not defined for a recurring character.');
  assigned.forEach(sc=>{const text=String(sc.prompt||sc.description||sc.storyBeat||'');if(/modern|smartphone|iphone|android|wifi|tiktok|instagram|uber|tesla/i.test(text)&&/pre[- ]?1994|19th|18th|17th|16th|15th/i.test(String(rootsFoundation.period||'')))flags.push(`Scene ${sc.number||'?'} may introduce an anachronistic reference.`);});
  const locked=[c.visualIdentity&&'visual identity',c.clothing&&'clothing',c.language&&'language',c.continuityNotes&&'continuity rules',c.relationships&&'relationships',c.possessions&&'possessions'].filter(Boolean);
  return {id:c.id,name:c.name||'Unnamed',sceneCount:assigned.length,status:flags.length?'needs review':'consistent',flags,locked};
 });
 result.forEach(c=>c.flags.forEach(f=>warnings.push(`${c.name}: ${f}`)));
 const totalLocks=result.reduce((n,c)=>n+c.locked.length,0); const possible=Math.max(1,normalized.length*6);
 const score=Math.max(0,Math.min(100,Math.round(100-(warnings.length*7)+(totalLocks/possible)*10)));
 return {score,characters:result,sceneCount:sceneList.length,warnings,rootsContext:{community:rootsFoundation.community||'',language:rootsFoundation.language||'',period:rootsFoundation.period||''},worldLocks:String(worldBible.continuityLocks||'').split(/\n+/).map(x=>x.trim()).filter(Boolean).slice(0,20),principle:'Continuity checks protect established creative choices. They do not establish cultural or historical truth; research and community review remain authoritative.'};
}


function worldBibleAudit({worldBible={},characters=[],rootsFoundation={}}){
 const required=['locations','objects','costumes','architecture','culturalPractices','languageRules','visualRules','continuityLocks'];
 const missing=required.filter(k=>!String(worldBible[k]||'').trim());
 const warnings=[];
 if(!String(worldBible.taboosAndSensitivities||'').trim()) warnings.push('Record cultural sensitivities or explicitly state that none have been identified yet.');
 if(!String(worldBible.musicSoundscape||'').trim()) warnings.push('Define the sound world so music and ambience do not default to generic cinematic cues.');
 if(characters.length && !String(worldBible.relationships||'').trim()) warnings.push('Character relationships are not defined in the World Bible.');
 if(rootsFoundation.community && !String(worldBible.culturalPractices||'').trim()) warnings.push(`Add practices to review for the selected community: ${rootsFoundation.community}.`);
 const characterChecks=characters.map(c=>({name:c.name||'Unnamed',community:!!c.community,language:!!c.language,clothing:!!c.clothing,visualIdentity:!!c.visualIdentity,continuity:!!c.continuityNotes}));
 const score=Math.max(0,Math.min(100,100-missing.length*8-warnings.length*5));
 return {score,classification:score>=85?'production-ready world':score>=65?'developing world':'needs world development',missing,warnings,characterChecks,locks:String(worldBible.continuityLocks||'').split(/\n+/).map(x=>x.trim()).filter(Boolean).slice(0,20),principle:'World Bible entries guide continuity and prompting. They are not independent proof of cultural or historical accuracy.'};
}

export function registerRoutes(app,ctx){
  // Pure-compute analysis routes: sign-in required in production so they cannot be used anonymously.
  app.use('/api/ai', async (req,res,next)=>{ try{ const user=await ctx.requireProviderAuth(req,res); if(!user) return; next(); }catch(e){ res.status(500).json({message:'Could not verify your session.'}); } });
  app.post('/api/ai/story-intelligence',(req,res)=>{try{res.json(storyIntelligence(req.body||{}));}catch(e){res.status(500).json({message:e.message||'Story intelligence analysis failed.'});}});
  app.post('/api/ai/film-plan',(req,res)=>{try{const body=req.body||{};if(!String(body.story||'').trim())return res.status(400).json({message:'A story is required.'});res.json(analyze(body));}catch(e){res.status(500).json({message:e.message||'AI film planning failed.'});}});
  app.post('/api/ai/continuity',(req,res)=>{try{res.json(continuity(req.body||{}));}catch(e){res.status(500).json({message:e.message||'Continuity analysis failed.'});}});
  app.post('/api/ai/research-audit',(req,res)=>{try{res.json(researchAudit(req.body||{}));}catch(e){res.status(500).json({message:e.message||'Research audit failed.'});}});
  app.post('/api/ai/character-continuity',(req,res)=>{try{res.json(characterContinuity(req.body||{}));}catch(e){res.status(500).json({message:e.message||'Character continuity analysis failed.'});}});
  app.post('/api/ai/scene-continuity',(req,res)=>{try{res.json(sceneContinuityGuard(req.body||{}));}catch(e){res.status(500).json({message:e.message||'Scene continuity check failed.'});}});
  app.post('/api/ai/world-bible',(req,res)=>{try{res.json(worldBibleAudit(req.body||{}));}catch(e){res.status(500).json({message:e.message||'World Bible audit failed.'});}});
  app.post('/api/ai/character-world-continuity',(req,res)=>{try{res.json(characterWorldContinuityAudit(req.body||{}));}catch(e){res.status(500).json({message:e.message||'Character and world continuity audit failed.'});}});
}
