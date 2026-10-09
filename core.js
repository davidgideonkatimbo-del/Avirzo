import { envInt, scaledLimit, pickGenerationModel, PLAN_LIMIT_MULTIPLIER, freeTrialStatus, freeTrialStart, TRIAL_GATED_KINDS } from './plans.js';
export { scaledLimit, pickGenerationModel, PLAN_LIMIT_MULTIPLIER, freeTrialStatus, TRIAL_GATED_KINDS };
import { safeFetchBuffer } from './safeFetch.js';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

export const IS_PRODUCTION = process.env.NODE_ENV === 'production';

export const HOST = process.env.HOST || '0.0.0.0';
export const RUNWAY_API = 'https://api.dev.runwayml.com/v1';
export const RUNWAY_VERSION = '2024-11-06';
export const APP_VERSION = '2.11.0';
export const SUPABASE_URL = process.env.SUPABASE_URL || '';
export const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || '';
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
export const supabase = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
export const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
export const ELEVENLABS_API = 'https://api.elevenlabs.io/v1';
export const ELEVEN_MODEL = 'eleven_v3';

export const styles = new Set(['Cinematic', 'Photorealistic', 'Documentary', 'Fantasy', 'Historical drama']);
export const cameras = new Set(['Slow dolly', 'Wide tracking', 'Handheld', 'Static', 'Crane reveal', 'Orbit']);
export const formats = new Set(['16:9', '9:16']);
export const durations = new Set(['5 sec', '10 sec']);

export const storyTypes = {
  historical: 'Documented history: prioritize verifiable historical context and label uncertain reconstruction.',
  oral: 'Oral tradition: preserve the tradition while clearly distinguishing remembered/handed-down elements from verified history.',
  folklore: 'Folklore or legend: present as cultural tradition/legend, not as a verified historical record.',
  inspired: 'Inspired fiction: fictional story rooted in a real cultural or historical setting.',
  fiction: 'Fully fictional: use the selected cultural setting without presenting invented events as historical fact.'
};

export const eras = {
  ancient: 'Ancient / early history: use the filmmaker’s specified period; do not invent exact dates unless supplied or researched.',
  precolonial: 'Pre-colonial Africa: emphasize locally grounded societies, institutions, architecture, clothing, tools, foodways and landscapes appropriate to the specified community and period.',
  colonial: 'Colonial-era Africa: reflect the selected territory and period accurately; distinguish colonial records from local perspectives and oral histories.',
  independence: 'Independence era / early post-independence: historically grounded details for the specified country and decade.',
  pre1994: 'Pre-1994 Africa: default heritage setting. Avoid post-1994 technology, brands, slang, vehicles, architecture or cultural references unless explicitly requested.',
  custom: 'Custom historical period: follow the filmmaker’s stated year/range and flag details that require research.'
};


export const voiceLanguageSupport = {
  'uganda-en': { code: 'eng', supported: true, note: 'English voice; use a voice with an appropriate Ugandan delivery.' },
  'uganda-lg': { code: null, supported: false, note: 'Luganda is not marked as supported by the configured ElevenLabs v3 language list; use a verified voice/provider before production.' },
  'kenya-en': { code: 'eng', supported: true, note: 'English voice; choose a Kenyan-appropriate voice.' },
  'kenya-sheng': { code: null, supported: false, note: 'Sheng needs a verified voice/provider rather than fabricated slang or pronunciation.' },
  'kenya-sw': { code: 'swa', supported: true, note: 'Swahili is supported.' },
  'nigeria-en': { code: 'eng', supported: true, note: 'English voice; choose a Nigerian-appropriate voice.' },
  'nigeria-pidgin': { code: null, supported: false, note: 'Nigerian Pidgin needs a verified voice/provider.' },
  'nigeria-yo': { code: null, supported: false, note: 'Yoruba requires a verified voice/provider for production.' },
  'nigeria-ig': { code: null, supported: false, note: 'Igbo requires a verified voice/provider for production.' },
  'nigeria-ha': { code: 'hau', supported: true, note: 'Hausa is supported.' },
  'sa-en': { code: 'eng', supported: true, note: 'English voice; choose a South African-appropriate voice.' },
  'sa-zu': { code: null, supported: false, note: 'isiZulu requires a verified voice/provider for production.' },
  'sa-xh': { code: null, supported: false, note: 'isiXhosa requires a verified voice/provider for production.' },
  'sa-af': { code: 'afr', supported: true, note: 'Afrikaans is supported.' },
  'sa-st': { code: null, supported: false, note: 'Sesotho requires a verified voice/provider for production.' }
};

export const africanProfiles = {
  'uganda-en': { market: 'Uganda', language: 'Ugandan English', guidance: 'Use contemporary Ugandan English, authentic Ugandan social details, locations, clothing, transport and everyday behavior. Avoid generic pan-African stereotypes.' },
  'uganda-lg': { market: 'Uganda', language: 'Luganda', guidance: 'Use natural Luganda dialogue where dialogue is requested, with Ugandan cultural context and Kampala/Ugandan social details. Avoid invented Luganda phrases; preserve user-provided wording.' },
  'kenya-en': { market: 'Kenya', language: 'Kenyan English', guidance: 'Use contemporary Kenyan English and authentic Kenyan settings, social details and behavior. Avoid generic pan-African stereotypes.' },
  'kenya-sheng': { market: 'Kenya', language: 'Sheng', guidance: 'Use contemporary Nairobi/urban Kenyan Sheng only where appropriate. Preserve natural code-switching and avoid fabricating slang when uncertain.' },
  'kenya-sw': { market: 'Kenya', language: 'Swahili', guidance: 'Use natural East African Swahili dialogue and Kenyan cultural context. Preserve user-provided phrases rather than inventing uncertain idioms.' },
  'nigeria-en': { market: 'Nigeria', language: 'Nigerian English', guidance: 'Use contemporary Nigerian English and authentic Nigerian settings, social details and behavior. Avoid generic pan-African stereotypes.' },
  'nigeria-pidgin': { market: 'Nigeria', language: 'Nigerian Pidgin', guidance: 'Use natural Nigerian Pidgin dialogue and rhythm. Do not invent uncertain expressions; preserve user-provided dialogue.' },
  'nigeria-yo': { market: 'Nigeria', language: 'Yoruba', guidance: 'Use Yoruba dialogue and Nigerian cultural context. Preserve user-provided Yoruba and avoid fabricated translations.' },
  'nigeria-ig': { market: 'Nigeria', language: 'Igbo', guidance: 'Use Igbo dialogue and Nigerian cultural context. Preserve user-provided Igbo and avoid fabricated translations.' },
  'nigeria-ha': { market: 'Nigeria', language: 'Hausa', guidance: 'Use Hausa dialogue and northern Nigerian cultural context. Preserve user-provided Hausa and avoid fabricated translations.' },
  'sa-en': { market: 'South Africa', language: 'South African English', guidance: 'Use contemporary South African English and authentic South African settings and social details. Avoid generic pan-African stereotypes.' },
  'sa-zu': { market: 'South Africa', language: 'isiZulu', guidance: 'Use isiZulu dialogue and South African cultural context. Preserve user-provided isiZulu and avoid fabricated translations.' },
  'sa-xh': { market: 'South Africa', language: 'isiXhosa', guidance: 'Use isiXhosa dialogue and South African cultural context. Preserve user-provided isiXhosa and avoid fabricated translations.' },
  'sa-af': { market: 'South Africa', language: 'Afrikaans', guidance: 'Use natural South African Afrikaans dialogue and local cultural context. Preserve user-provided wording.' },
  'sa-st': { market: 'South Africa', language: 'Sesotho', guidance: 'Use Sesotho dialogue and South African cultural context. Preserve user-provided Sesotho and avoid fabricated translations.' }
};

export function requireRunwayKey(res) {
  if (!process.env.RUNWAYML_API_SECRET) {
    res.status(503).json({ error: 'VIDEO_PROVIDER_NOT_CONFIGURED', message: 'Add RUNWAYML_API_SECRET to the server environment.' });
    return false;
  }
  return true;
}

export function requireVoiceKey(res) {
  if (!process.env.ELEVENLABS_API_KEY) {
    res.status(503).json({ error: 'VOICE_PROVIDER_NOT_CONFIGURED', message: 'Add ELEVENLABS_API_KEY to the server environment.' });
    return false;
  }
  return true;
}

export const rateBuckets = new Map();
export const generationJobs = new Map();
const exportWaiters = [];
let exportBusy = false;
 export async function acquireExportSlot() {
  if (!exportBusy) { exportBusy = true; return () => { exportBusy = false; const next = exportWaiters.shift(); if (next) next(); }; }
  await new Promise(resolve => exportWaiters.push(resolve));
  exportBusy = true;
  return () => { exportBusy = false; const next = exportWaiters.shift(); if (next) next(); };
}
export const RATE_LIMITS = {
  // Video generation is an account-level annual credit budget.
  // Yearly video-generation budget per account. Defaults: 5 free clips for the free month, then 60 (Creator) / 200 (Studio) per year;
  // set FREE_GENERATIONS_PER_YEAR (and optionally CREATOR_/STUDIO_) in Render to change them without a code edit.
  generation: { windowMs: 365 * 24 * 60 * 60 * 1000, max: envInt('FREE_GENERATIONS_PER_YEAR', 5), window: 'year', perPlan: { free: envInt('FREE_GENERATIONS_PER_YEAR', 5), creator: envInt('CREATOR_GENERATIONS_PER_YEAR', 60), studio: envInt('STUDIO_GENERATIONS_PER_YEAR', 200) } },
  voice: { windowMs: 60 * 60 * 1000, max: 20 },
  export: { windowMs: 60 * 60 * 1000, max: 5 },
  performance: { windowMs: 60 * 60 * 1000, max: 10 }
};
// Hourly quota multipliers per plan (product decision: adjust here). Applied to the base RATE_LIMITS.
export const WORKER_ENABLED = String(process.env.AVIRZO_WORKER_ENABLED || '').toLowerCase() === 'true';
const planCache = new Map();
export async function getUserPlan(userId) {
  if (!supabaseAdmin || !userId || userId === 'development-user') return 'free';
  const hit = planCache.get(userId);
  if (hit && Date.now() - hit.at < 60000) return hit.plan;
  try {
    const { data } = await supabaseAdmin.from('avirzo_billing_accounts').select('plan,status').eq('user_id', userId).maybeSingle();
    const plan = data && ['active', 'trialing', 'past_due'].includes(data.status) && PLAN_LIMIT_MULTIPLIER[data.plan] ? data.plan : 'free';
    planCache.set(userId, { plan, at: Date.now() });
    return plan;
  } catch { return 'free'; } // if the plan cannot be read, fall back to the safest (free) limits
}
// Free accounts' clip budget is counted from the start of their free month, so it can never reset on 1 January mid-trial
// (and the same window is used when showing usage). Everyone else keeps the calendar-year window.
export function usageWindowStart(kind, date = new Date(), { plan, createdAt } = {}) {
  if (kind === 'generation' && plan === 'free' && freeTrialStatus({ createdAt, plan }).applies) return new Date(freeTrialStart(createdAt));
  const start = new Date(date);
  if (RATE_LIMITS[kind]?.window === 'year') {
    start.setUTCMonth(0, 1);
    start.setUTCHours(0, 0, 0, 0);
    return new Date(Date.UTC(start.getUTCFullYear(), 0, 1));
  }
  start.setUTCMinutes(0, 0, 0);
  return start;
}
function usageRetryAfter(kind, now = new Date()) {
  if (RATE_LIMITS[kind]?.window === 'year') {
    const next = new Date(Date.UTC(now.getUTCFullYear() + 1, 0, 1));
    return Math.max(1, Math.ceil((next.getTime() - now.getTime()) / 1000));
  }
  const next = new Date(now); next.setUTCMinutes(60, 0, 0);
  return Math.max(1, Math.ceil((next.getTime() - now.getTime()) / 1000));
}
export function rateLimit(key, limit) {
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || now - bucket.startedAt >= limit.windowMs) {
    rateBuckets.set(key, { startedAt: now, count: 1 });
    return { allowed: true };
  }
  if (bucket.count >= limit.max) return { allowed: false, retryAfter: Math.ceil((limit.windowMs - (now - bucket.startedAt)) / 1000) };
  bucket.count += 1;
  return { allowed: true };
}

export async function durableUsageLimit(userId, kind, limit, who = {}) {
  if (!IS_PRODUCTION || !supabaseAdmin) return rateLimit(`${kind}:${userId}`, limit);
  const now = new Date();
  const windowStart = usageWindowStart(kind, now, who);
  const { data, error } = await supabaseAdmin.rpc('consume_avirzo_usage', {
    p_user_id: userId, p_kind: kind, p_window_start: windowStart.toISOString(), p_limit: limit.max
  });
  if (error) {
    console.error('durable usage check failed:', error);
    if (IS_PRODUCTION) return { allowed: false, retryAfter: 60, infrastructureError: true };
    return rateLimit(`${kind}:${userId}`, limit);
  }
  const row = Array.isArray(data) ? data[0] : data;
  return { allowed: Boolean(row?.allowed), retryAfter: row?.retry_after || usageRetryAfter(kind, now) };
}
 export async function requireProviderUser(req, res, kind) {
  const user = await authUser(req);
  if (!IS_PRODUCTION && !user) return { id: 'development-user' };

  if (!user) {
    res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Sign in before using this provider-backed feature.' });
    return null;
  }
  const baseLimit = RATE_LIMITS[kind];
  const plan = await getUserPlan(user.id);
  if (TRIAL_GATED_KINDS.includes(kind)) {
    const trial = freeTrialStatus({ createdAt: user.created_at, plan });
    if (trial.expired) {
      res.status(402).json({ error: 'TRIAL_ENDED', message: 'Your free month has ended. Choose Creator or Studio in Billing to keep generating, voicing and animating. Your projects stay safe and you can still open and export them.', trialEndedAt: trial.endsAt });
      return null;
    }
  }
  if (baseLimit) {
    const limit = scaledLimit(baseLimit, plan);
    const result = await durableUsageLimit(user.id, kind, limit, { plan, createdAt: user.created_at });
    if (result.infrastructureError) {
      res.status(503).json({ error: 'USAGE_LIMIT_UNAVAILABLE', message: 'Usage protection is temporarily unavailable. Please try again shortly.' });
      return null;
    }
    if (!result.allowed) {
      res.set('Retry-After', String(result.retryAfter));
      res.status(429).json({ error: 'RATE_LIMITED', message: `Too many ${kind} requests. Try again later.`, retryAfter: result.retryAfter });
      return null;
    }
  }
  return user;
}
 export async function requireProviderAuth(req, res) {
  const user = await authUser(req);
  if (IS_PRODUCTION && !user) { res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Sign in before using this provider-backed feature.' }); return null; }
  return user || { id: 'development-user' };
}
export const FFMPEG_AVAILABLE = (() => { try { return spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0; } catch { return false; } })();

export function runwayHeaders() {
  return { Authorization: `Bearer ${process.env.RUNWAYML_API_SECRET}`, 'Content-Type': 'application/json', 'X-Runway-Version': RUNWAY_VERSION };
}
export function normalizeCharacter(c = {}) {
  return {
    name: String(c.name || '').trim(), role: String(c.role || '').trim(), age: String(c.age || '').trim(),
    community: String(c.community || '').trim(), clan: String(c.clan || '').trim(), language: String(c.language || '').trim(),
    appearance: String(c.appearance || '').trim(), clothing: String(c.clothing || '').trim(), occupation: String(c.occupation || '').trim(),
    relationships: String(c.relationships || '').trim(), notes: String(c.notes || '').trim(),
    visualIdentity: String(c.visualIdentity || '').trim(), continuityNotes: String(c.continuityNotes || '').trim(),
    referenceImageUrl: String(c.referenceImageUrl || '').trim()
  };
}
export function characterContinuityLine(c, fallbackLanguage) {
  const x = normalizeCharacter(c);
  return `${x.name || 'Unnamed'} — role ${x.role || 'character'}; age ${x.age || 'unspecified'}; community ${x.community || 'unspecified'}; clan/family ${x.clan || 'unspecified'}; language ${x.language || fallbackLanguage || 'unspecified'}; appearance ${x.appearance || 'unspecified'}; clothing ${x.clothing || 'unspecified'}; occupation ${x.occupation || 'unspecified'}; relationships ${x.relationships || 'unspecified'}; VISUAL IDENTITY ${x.visualIdentity || 'not defined'}; CONTINUITY ${x.continuityNotes || 'maintain established identity across scenes'}; notes ${x.notes || 'none'}`;
}

export const RUNWAY_PROMPT_MAX = 1000;
export function buildCinematicPrompt({ prompt, style, camera, sceneNumber, africanProfile, era = 'pre1994', storyType = 'inspired', historicalNotes = '', characters = [], researchBrief = null, referenceCharacter = null, continuityContext = null, worldBible = null }) {
  const scene = String(prompt || '').trim();
  const core = [
    `Shot ${sceneNumber || 1}. Style: ${style}.`,
    `${camera} camera movement, cinematic composition, natural motion, filmic lighting.`,
    `Setting: ${africanProfile?.market || 'Africa'}; language ${africanProfile?.language || 'English'}.`,
    `Era: ${eras[era] || eras.pre1994}`,
    referenceCharacter ? `Keep the reference image's identity for ${referenceCharacter.name || 'the character'}: face, hair, build, clothing.` : '',
    continuityContext ? `CONTINUITY LOCK: ${continuityContext}` : ''
  ];
  const tail = 'One coherent shot. No text overlays, subtitles, logos or watermarks.';
  const optional = [
    africanProfile?.guidance || '',
    `Story: ${storyTypes[storyType] || storyTypes.inspired}`,
    historicalNotes ? `Historical notes: ${historicalNotes}` : '',
    researchBrief ? `Research: facts ${researchBrief.verifiedFacts || 'none'}; material culture ${researchBrief.materialCulture || 'n/a'}; uncertainties ${researchBrief.uncertainties || 'none'}; place ${researchBrief.location || 'n/a'}; period ${researchBrief.period || 'n/a'}.` : '',
    characters.length ? `Characters: ${characters.map(c => characterContinuityLine(c, africanProfile?.language)).join(' | ')}` : '',
    worldBible ? `World constraints: location ${worldBible.locations || 'unspecified'}; objects ${worldBible.objects || 'unspecified'}; costumes ${worldBible.costumes || 'unspecified'}; architecture ${worldBible.architecture || 'unspecified'}; practices ${worldBible.culturalPractices || 'unspecified'}; language rules ${worldBible.languageRules || 'unspecified'}; visual rules ${worldBible.visualRules || 'unspecified'}; continuity locks ${worldBible.continuityLocks || 'unspecified'}.` : ''
  ].filter(Boolean);
  const build = (extras) => [...core, ...extras, `Scene: ${scene}`, tail].filter(Boolean).join(' ');
  // Runway caps promptText at 1000 chars: keep the scene, add optional context in priority order while it fits.
  let out = build([]);
  if (out.length > RUNWAY_PROMPT_MAX) return out.slice(0, RUNWAY_PROMPT_MAX);
  const kept = [];
  for (const extra of [optional[4], optional[0], optional[1], optional[2], optional[3]].filter(Boolean)) {
    const tryOut = build([...kept, extra]);
    if (tryOut.length <= RUNWAY_PROMPT_MAX) kept.push(extra);
    else {
      const room = RUNWAY_PROMPT_MAX - build(kept).length - 1;
      if (room > 80) kept.push(extra.slice(0, room));
      break;
    }
  }
  return build(kept).slice(0, RUNWAY_PROMPT_MAX);
}



 export async function requireAssetCloud(req,res){
  if(!supabase || !supabaseAdmin){res.status(503).json({error:'CLOUD_ASSET_STORAGE_NOT_CONFIGURED',message:'Configure Supabase and SUPABASE_SERVICE_ROLE_KEY to persist generated media.'});return null;}
  const user=await requireCloudUser(req,res); if(!user)return null; return user;
}
 export async function persistBufferAsset({user, projectId, buffer, kind='audio', name='generated-media', sourceProvider='elevenlabs', contentType='audio/mpeg'}){
  if(!supabaseAdmin) throw new Error('Cloud asset storage is not configured.');
  if(!Buffer.isBuffer(buffer) || !buffer.length) throw new Error('Generated media is empty.');
  if(buffer.length > 25 * 1024 * 1024) throw new Error('Generated media exceeds the 25 MB archive limit.');
  const clean=String(name||'generated-media').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,70)||'generated-media';
  const normalizedType=String(contentType||'application/octet-stream').split(';')[0].trim() || 'application/octet-stream';
  const ext=normalizedType.includes('mpeg')||normalizedType.includes('mp3')?'mp3':normalizedType.includes('wav')?'wav':normalizedType.includes('webm')?'webm':'bin';
  const storagePath=`${user.id}/${projectId||'unassigned'}/${kind}/${Date.now()}-${clean}.${ext}`;
  const {error:uploadError}=await supabaseAdmin.storage.from('avirzo-media').upload(storagePath,buffer,{contentType:normalizedType,upsert:false});
  if(uploadError) throw uploadError;
  const {data,error}=await supabaseAdmin.from('avirzo_assets').insert({user_id:user.id,project_id:projectId||null,kind,name:clean,storage_path:storagePath,mime_type:normalizedType,size_bytes:buffer.length,source_provider:sourceProvider}).select().single();
  if(error){ await supabaseAdmin.storage.from('avirzo-media').remove([storagePath]).catch(()=>{}); throw error; }
  return data;
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function findAssetByTask(userId, providerTaskId) {
  const { data, error } = await supabaseAdmin.from('avirzo_assets').select('*').eq('user_id', userId).eq('provider_task_id', providerTaskId).maybeSingle();
  if (error) throw error;
  return data || null;
}

// When providerTaskId is given, archiving is idempotent: the storage path is deterministic and a unique index
// guarantees one asset per (user, provider task), so web polling, the worker and retries cannot create duplicates.
export async function persistRemoteAsset({user, projectId, sourceUrl, kind='video', name='generated-media', sourceProvider='runway', providerTaskId=null}){
  if(!supabaseAdmin) throw new Error('Cloud asset storage is not configured.');
  const taskKey = providerTaskId ? String(providerTaskId).replace(/[^a-zA-Z0-9_-]/g,'').slice(0,80) : '';
  if(taskKey){ const existing=await findAssetByTask(user.id, taskKey); if(existing) return existing; }
  const fetched=await safeFetchBuffer(sourceUrl,{maxBytes:300*1024*1024,timeoutMs:120000});
  if(!fetched.buffer?.length) throw new Error('Provider returned an empty media file.');
  const contentType=(fetched.contentType||'').split(';')[0].trim() || (kind==='video'?'video/mp4':kind==='audio'?'audio/mpeg':'application/octet-stream');
  const ext=contentType.includes('mp4')?'mp4':contentType.includes('mpeg')||contentType.includes('mp3')?'mp3':contentType.includes('webm')?'webm':contentType.includes('png')?'png':contentType.includes('jpeg')?'jpg':'bin';
  const clean=String(name||'generated-media').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,70)||'generated-media';
  const storagePath=taskKey ? `${user.id}/${projectId||'unassigned'}/${kind}/task-${taskKey}.${ext}` : `${user.id}/${projectId||'unassigned'}/${kind}/${Date.now()}-${clean}.${ext}`;
  const bytes=fetched.buffer;
  const {error:uploadError}=await supabaseAdmin.storage.from('avirzo-media').upload(storagePath,bytes,{contentType,upsert:false});
  if(uploadError){
    const duplicate = taskKey && (String(uploadError.statusCode)==='409' || /already exists|duplicate/i.test(uploadError.message||''));
    if(!duplicate) throw uploadError;
    // Another process is (or was) archiving this task. Give it a moment to finish and reuse its asset.
    for(let i=0;i<8;i++){ const winner=await findAssetByTask(user.id, taskKey); if(winner) return winner; await sleep(2000); }
    // The earlier upload finished but never produced a row (it crashed): adopt the stored object.
  }
  const {data,error}=await supabaseAdmin.from('avirzo_assets').insert({user_id:user.id,project_id:projectId||null,kind,name:clean,storage_path:storagePath,mime_type:contentType,size_bytes:bytes.length,source_provider:sourceProvider,provider_task_id:taskKey||null}).select().single();
  if(error){
    if(taskKey && error.code==='23505'){ const winner=await findAssetByTask(user.id, taskKey); if(winner) return winner; }
    throw error;
  }
  return data;
}

// Archive a finished provider job's output. Safe to call from any process, any number of times.
export async function archiveProviderOutput({job, sourceUrl, kind='video', name, sourceProvider='runway'}){
  if(job?.result_asset_id) return { id: job.result_asset_id };
  return persistRemoteAsset({ user:{id:job.user_id}, projectId:job.project_id, sourceUrl, kind, name: name || `scene-${job.id}`, sourceProvider, providerTaskId: job.provider_task_id });
}

export const PROJECT_DIR = path.resolve('projects');
 export async function projectStore(){ const fs = await import('node:fs/promises'); await fs.mkdir(PROJECT_DIR,{recursive:true}); return fs; }
export function safeProjectId(id){ return String(id||'').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,120); }
export function normalizeProject(body={}, existing={}){ const now=new Date().toISOString(); return { id: existing.id || `project-${Date.now()}-${Math.random().toString(36).slice(2,8)}`, name:String(body.name||existing.name||'Untitled Avirzo Film').trim().slice(0,120)||'Untitled Avirzo Film', folder:String(body.folder||existing.folder||'My Films').trim().slice(0,80)||'My Films', mode:body.mode||'story', story:String(body.story||''), style:String(body.style||'Historical drama'), camera:String(body.camera||'Slow dolly'), duration:String(body.duration||'5 sec'), format:String(body.format||'16:9'), africanProfile:String(body.africanProfile||'uganda-lg'), era:String(body.era||'pre1994'), storyType:String(body.storyType||'oral'), historicalNotes:String(body.historicalNotes||''), rootsFoundation:body.rootsFoundation&&typeof body.rootsFoundation==='object'?body.rootsFoundation:{community:'',country:'',place:'',language:'',period:'',culturalAnchors:'',evidenceLevel:'',creativeLiberties:'',sensitivityNotes:''}, scenes:Array.isArray(body.scenes)?body.scenes:[], characters:Array.isArray(body.characters)?body.characters:[], research:body.research&&typeof body.research==='object'?body.research:{}, worldBible:body.worldBible&&typeof body.worldBible==='object'?body.worldBible:{locations:'',objects:'',costumes:'',architecture:'',culturalPractices:'',musicSoundscape:'',languageRules:'',visualRules:'',familyStructure:'',taboosAndSensitivities:'',continuityLocks:'',relationships:''}, timeline:Array.isArray(body.timeline)?body.timeline:[], audioTracks:Array.isArray(body.audioTracks)?body.audioTracks:[], captions:Array.isArray(body.captions)?body.captions:[], review:body.review&&typeof body.review==='object'?body.review:{enabled:false,notes:[]}, aiEndCard:body.aiEndCard===true, duckMusic:body.duckMusic!==false, exportUrl:String(body.exportUrl||''), createdAt:existing.createdAt||now, updatedAt:now }; }
 export function userDb(req){
  const header=String(req.headers.authorization||''); const token=header.startsWith('Bearer ')?header.slice(7):'';
  if(!SUPABASE_URL||!SUPABASE_KEY||!token) return null;
  return createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:`Bearer ${token}`}}});
}
export async function authUser(req){
  if(!supabase) return null;
  const header=String(req.headers.authorization||''); const token=header.startsWith('Bearer ')?header.slice(7):'';
  if(!token) return null;
  const {data,error}=await supabase.auth.getUser(token);
  return error ? null : data.user;
}
 export async function requireCloudUser(req,res){ const user=await authUser(req); if(!user){res.status(401).json({message:'Sign in to use cloud projects and private media. Configure Supabase or continue with local server storage.'});return null;} return user; }
export async function requireOwnedProject(userId, projectId){
  if(!projectId) return true;
  if(!supabaseAdmin) throw new Error('Cloud project storage is not configured.');
  const { data:owner, error:ownerError } = await supabaseAdmin.from('avirzo_projects').select('id,user_id').eq('id', projectId).maybeSingle();
  if(ownerError) throw ownerError;
  if(!owner) return false;
  if(owner.user_id === userId) return true;
  const {data:member,error:memberError}=await supabaseAdmin.from('avirzo_project_members').select('role').eq('project_id',projectId).eq('user_id',userId).maybeSingle();
  if(memberError) throw memberError;
  return ['editor'].includes(member?.role);
}
export function toSrtTime(seconds) {
  const ms = Math.max(0, Math.round(seconds * 1000));
  const h = Math.floor(ms / 3600000); const m = Math.floor((ms % 3600000) / 60000); const s = Math.floor((ms % 60000) / 1000); const milli = ms % 1000;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')},${String(milli).padStart(3,'0')}`;
}

