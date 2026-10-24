import { envInt, scaledLimit, pickGenerationModel, freeAccessBlock, PLAN_LIMIT_MULTIPLIER, freeTrialStatus, freeTrialStart, TRIAL_GATED_KINDS, maxStoryboardScenes, maxExportScenes, maxExportDurationSeconds } from './plans.js';
import { composeCinematicPrompt } from './videoPrompt.js';
export { scaledLimit, pickGenerationModel, PLAN_LIMIT_MULTIPLIER, freeTrialStatus, TRIAL_GATED_KINDS, maxStoryboardScenes, maxExportScenes, maxExportDurationSeconds };
import { safeFetchBuffer, detectMediaType } from './safeFetch.js';
import { defaultCreditCost, generationCreditCost, voiceCreditCost, musicCreditCost, keyframeCreditCost, performanceCreditCost, creditsToProviderUsd, creditsEnabled, creditPackCatalog, offeredCreditPacks, creditPackWarnings, packCreditsForPriceId, planMonthlyCredits, currentCreditMonthKey } from './credits.js';
export { defaultCreditCost, generationCreditCost, voiceCreditCost, musicCreditCost, keyframeCreditCost, performanceCreditCost, creditsToProviderUsd, creditsEnabled, creditPackCatalog, offeredCreditPacks, creditPackWarnings, packCreditsForPriceId, planMonthlyCredits, currentCreditMonthKey };
import path from 'node:path';
import { createHmac } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

export const IS_PRODUCTION = process.env.NODE_ENV === 'production';

export const HOST = process.env.HOST || '0.0.0.0';
export const RUNWAY_API = 'https://api.dev.runwayml.com/v1';
export const RUNWAY_VERSION = '2024-11-06';
export const APP_VERSION = '2.17.13';
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
  'sa-st': { code: null, supported: false, note: 'Sesotho requires a verified voice/provider for production.' },
  /* Phase A — expanded coverage */
  'ghana-en': { code: 'eng', supported: true, note: 'English voice; choose a Ghanaian-appropriate voice.' },
  'ghana-tw': { code: null, supported: false, note: 'Twi requires a verified voice/provider for production.' },
  'ethiopia-am': { code: null, supported: false, note: 'Amharic requires a verified voice/provider for production.' },
  'ethiopia-en': { code: 'eng', supported: true, note: 'English voice; choose an Ethiopian-appropriate voice.' },
  'senegal-fr': { code: 'fra', supported: true, note: 'French voice; prefer a West African / Senegalese delivery when available.' },
  'senegal-wo': { code: null, supported: false, note: 'Wolof requires a verified voice/provider for production.' },
  'egypt-ar': { code: 'ara', supported: true, note: 'Arabic is supported; prefer Egyptian Arabic delivery when available.' },
  'egypt-en': { code: 'eng', supported: true, note: 'English voice; choose an Egyptian-appropriate voice.' },
  'diaspora-en': { code: 'eng', supported: true, note: 'English voice; match the diaspora community the filmmaker specifies.' }
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
  'sa-st': { market: 'South Africa', language: 'Sesotho', guidance: 'Use Sesotho dialogue and South African cultural context. Preserve user-provided Sesotho and avoid fabricated translations.' },
  /* Phase A — expanded coverage */
  'ghana-en': { market: 'Ghana', language: 'Ghanaian English', guidance: 'Use contemporary Ghanaian English and authentic Ghanaian settings, social details and behavior. Avoid generic pan-African stereotypes.' },
  'ghana-tw': { market: 'Ghana', language: 'Twi', guidance: 'Use natural Twi dialogue and Akan cultural context. Preserve user-provided Twi and avoid fabricated translations.' },
  'ethiopia-am': { market: 'Ethiopia', language: 'Amharic', guidance: 'Use Amharic dialogue and Ethiopian cultural context. Preserve user-provided Amharic and avoid fabricated translations.' },
  'ethiopia-en': { market: 'Ethiopia', language: 'Ethiopian English', guidance: 'Use contemporary Ethiopian English and authentic Ethiopian settings and social details. Avoid generic pan-African stereotypes.' },
  'senegal-fr': { market: 'Senegal', language: 'French (Sénégal)', guidance: 'Use natural Senegalese French and local cultural context. Preserve user-provided wording; avoid inventing Wolof calques unless supplied.' },
  'senegal-wo': { market: 'Senegal', language: 'Wolof', guidance: 'Use natural Wolof dialogue and Senegambian cultural context. Preserve user-provided Wolof and avoid fabricated translations.' },
  'egypt-ar': { market: 'Egypt', language: 'Egyptian Arabic', guidance: 'Use Egyptian Arabic dialogue and Egyptian cultural context. Preserve user-provided wording; avoid inventing classical forms unless requested.' },
  'egypt-en': { market: 'Egypt', language: 'Egyptian English', guidance: 'Use contemporary Egyptian English and authentic Egyptian settings and social details. Avoid generic pan-African stereotypes.' },
  'diaspora-en': { market: 'Diaspora', language: 'Diaspora English', guidance: 'Use the English variety and cultural markers the filmmaker specifies for the diaspora community. Avoid generic “African abroad” stereotypes; stay specific to the named community and place.' }
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
  // Free accounts get exactly two successful scene-generation attempts per account lifetime.
  // Free-generation requests do not consume wallet credits; this account-level counter is the cost cap.
  // Set FREE_GENERATIONS_PER_YEAR only for an intentional policy change.
  generation: { windowMs: 365 * 24 * 60 * 60 * 1000, max: envInt('FREE_GENERATIONS_PER_YEAR', 2), window: 'year', perPlan: { free: envInt('FREE_GENERATIONS_PER_YEAR', 2), creator: envInt('CREATOR_GENERATIONS_PER_YEAR', 1500), studio: envInt('STUDIO_GENERATIONS_PER_YEAR', 5000) } },
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
// Free accounts' annual clip budget is counted from the start of their free access year,
// so the allowance cannot reset on 1 January mid-period (and usage display uses the same window).
export function usageWindowStart(kind, date = new Date(), { plan, createdAt } = {}) {
  // Free scene allowance is lifetime-scoped: a stable bucket prevents annual/monthly resets.
  if (kind === 'generation' && plan === 'free') return new Date('2000-01-01T00:00:00.000Z');
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
  if (rateBuckets.size > 5000) for (const [k, b] of rateBuckets) if (now - b.startedAt >= (limit.windowMs || 3600000)) rateBuckets.delete(k);
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
/**
 * Reserve a conservative estimate against Avirzo's global daily provider budget.
 * Production fails closed if the budget RPC/table is unavailable. The reservation is keyed
 * by job ID so retries cannot reserve the same job twice.
 */
export async function reserveProviderBudget({ jobId, userId, estimatedUsd }) {
  const amount = Number(estimatedUsd);
  if (!Number.isFinite(amount) || amount <= 0) return { allowed: false, infrastructureError: false, message: 'Could not calculate a safe provider-cost estimate.' };
  const budget = Number(process.env.PROVIDER_DAILY_BUDGET_USD ?? 25);
  if (!Number.isFinite(budget) || budget <= 0) return { allowed: false, infrastructureError: false, message: 'Provider generation is paused because the daily spending limit is not configured.' };
  if (!supabaseAdmin || !IS_PRODUCTION) return { allowed: true, local: true };
  const { data, error } = await supabaseAdmin.rpc('reserve_avirzo_provider_budget', {
    p_job_id: jobId, p_user_id: userId, p_amount_usd: Math.ceil(amount * 10000) / 10000,
    p_budget_usd: budget, p_budget_date: new Date().toISOString().slice(0, 10)
  });
  if (error) { console.error('provider budget reservation failed:', error); return { allowed: false, infrastructureError: true }; }
  const row = Array.isArray(data) ? data[0] : data;
  const usedUsd = Number(row?.used_usd) || 0;
  if (row?.allowed && usedUsd > 0) void notifyProviderBudgetThresholds({ usedUsd, budgetUsd: budget });
  else if (!row?.allowed && !row?.infrastructure_error) void notifyProviderBudgetThresholds({ usedUsd, budgetUsd: budget, blocked: true });
  return { allowed: Boolean(row?.allowed), usedUsd, budgetUsd: budget };
}

async function notifyProviderBudgetThresholds({ usedUsd, budgetUsd, blocked = false }) {
  const webhook = String(process.env.AVIRZO_FINANCE_ALERT_WEBHOOK_URL || '').trim();
  if (!supabaseAdmin || !IS_PRODUCTION) return;
  const thresholds = blocked ? [100] : [70, 85, 95];
  const percent = blocked ? 100 : (budgetUsd > 0 ? (usedUsd / budgetUsd) * 100 : 0);
  for (const threshold of thresholds) {
    if (percent < threshold) continue;
    const { data, error } = await supabaseAdmin.rpc('claim_avirzo_budget_alert', {
      p_budget_date: new Date().toISOString().slice(0, 10), p_threshold: threshold,
      p_used_usd: Number(usedUsd.toFixed(4)), p_budget_usd: Number(budgetUsd.toFixed(4))
    });
    if (error) { console.error('budget alert claim failed:', error.message); continue; }
    const row = Array.isArray(data) ? data[0] : data;
    if (row?.claimed) await deliverProviderBudgetAlert(row.alert_id || `${new Date().toISOString().slice(0,10)}:${threshold}`);
  }
}

/** Durable outbox delivery. A database RPC atomically claims each attempt so web and worker instances cannot send the same alert concurrently. */
export async function deliverProviderBudgetAlert(alertIdOrKey) {
  if (!supabaseAdmin || !IS_PRODUCTION) return { ok: false, skipped: true };
  const webhook = String(process.env.AVIRZO_FINANCE_ALERT_WEBHOOK_URL || '').trim();
  if (!webhook) return { ok: false, missingWebhook: true };
  let budgetDate, threshold;
  if (String(alertIdOrKey).includes(':')) {
    [budgetDate, threshold] = String(alertIdOrKey).split(':'); threshold = Number(threshold);
  } else {
    const { data: lookup, error: lookupError } = await supabaseAdmin.from('avirzo_provider_budget_alerts').select('budget_date,threshold_percent').eq('id', alertIdOrKey).maybeSingle();
    if (lookupError || !lookup) return { ok: false, unavailable: true };
    budgetDate = lookup.budget_date; threshold = Number(lookup.threshold_percent);
  }
  const { data: claimData, error: claimError } = await supabaseAdmin.rpc('claim_avirzo_budget_alert_delivery', { p_budget_date: budgetDate, p_threshold: threshold });
  if (claimError) { console.error('finance alert delivery claim failed:', claimError.message); return { ok: false, error: claimError.message }; }
  const alert = Array.isArray(claimData) ? claimData[0] : claimData;
  if (!alert?.claimed) return { ok: false, unavailable: true };
  const attempt = Number(alert.attempt_count || 1);
  const percent = Number(alert.threshold_percent) === 100 ? 100 : Number(alert.budget_usd) > 0 ? Number(alert.used_usd) / Number(alert.budget_usd) * 100 : 0;
  const blocked = Number(alert.threshold_percent) === 100;
  const message = `Avirzo provider spend ${blocked ? 'limit reached' : 'warning'}: ${percent.toFixed(1)}% of daily budget used ($${Number(alert.used_usd).toFixed(2)} of $${Number(alert.budget_usd).toFixed(2)} UTC). ${blocked ? 'New video generations should be blocked until the next UTC day.' : `Alert threshold: ${alert.threshold_percent}%.`}`;
  try {
    const response = await fetch(webhook, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: message, content: message, event: 'avirzo_provider_budget', threshold: alert.threshold_percent, usedUsd: Number(alert.used_usd), budgetUsd: Number(alert.budget_usd), blocked, alertDate: alert.budget_date, attempt }), signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(`webhook rejected with HTTP ${response.status}`);
    const { error: updateError } = await supabaseAdmin.from('avirzo_provider_budget_alerts').update({ delivery_status: 'delivered', delivered_at: new Date().toISOString(), last_error: null, next_attempt_at: null }).eq('budget_date', alert.budget_date).eq('threshold_percent', alert.threshold_percent).is('delivered_at', null);
    if (updateError) throw updateError;
    return { ok: true };
  } catch (error) {
    const delayMinutes = Math.min(360, 2 ** Math.min(attempt, 8));
    const errorMessage = String(error?.message || error).slice(0, 500);
    const { error: updateError } = await supabaseAdmin.from('avirzo_provider_budget_alerts').update({ delivery_status: attempt >= 8 ? 'dead_letter' : 'failed', last_error: errorMessage, next_attempt_at: attempt >= 8 ? null : new Date(Date.now() + delayMinutes * 60000).toISOString() }).eq('budget_date', alert.budget_date).eq('threshold_percent', alert.threshold_percent).is('delivered_at', null);
    if (updateError) console.error('failed to persist budget alert failure:', updateError.message);
    console.error('provider budget alert delivery failed:', errorMessage);
    return { ok: false, error: errorMessage };
  }
}

/** Poll durable alert outbox rows due for retry; delivery RPC owns the atomic claim. */
export async function retryPendingProviderBudgetAlerts() {
  if (!supabaseAdmin || !IS_PRODUCTION || !process.env.AVIRZO_FINANCE_ALERT_WEBHOOK_URL) return { processed: 0 };
  const { data, error } = await supabaseAdmin.rpc('claim_avirzo_budget_alert_retries', { p_limit: 10 });
  if (error) { console.error('could not find finance alert retries:', error.message); return { processed: 0, error: error.message }; }
  let processed = 0;
  for (const alert of data || []) {
    const key = `${alert.budget_date}:${alert.threshold_percent}`;
    await deliverProviderBudgetAlert(key); processed++;
  }
  return { processed };
}

/** Cross-instance fixed-window limiter backed by an atomic Supabase RPC. */
export async function distributedRateLimit({ key, windowMs, max }) {
  if (!supabaseAdmin || !IS_PRODUCTION) return { allowed: true, localFallback: true };
  const secret = process.env.ABUSE_HASH_SECRET || SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) return { allowed: false, infrastructureError: true, retryAfter: 60 };
  const keyHash = createHmac('sha256', secret).update(String(key || 'unknown')).digest('hex');
  const now = Date.now();
  const windowStartMs = Math.floor(now / windowMs) * windowMs;
  const windowStart = new Date(windowStartMs).toISOString();
  const { data, error } = await supabaseAdmin.rpc('consume_avirzo_distributed_rate_limit', {
    p_key_hash: keyHash, p_window_start: windowStart, p_window_seconds: Math.ceil(windowMs / 1000), p_limit: max
  });
  if (error) {
    console.error('distributed rate limit unavailable:', error.message);
    return { allowed: false, infrastructureError: true, retryAfter: Math.max(1, Math.ceil((windowStartMs + windowMs - now) / 1000)) };
  }
  const row = Array.isArray(data) ? data[0] : data;
  return { allowed: Boolean(row?.allowed), retryAfter: Number(row?.retry_after) || 1, remaining: Number(row?.remaining) || 0 };
}

export async function settleProviderBudget(jobId, state = 'charged') {
  if (!jobId || !supabaseAdmin || !IS_PRODUCTION) return { ok: true, local: true };
  const allowedState = state === 'released' ? 'released' : 'charged';
  const { error } = await supabaseAdmin.rpc('settle_avirzo_provider_budget', { p_job_id: jobId, p_state: allowedState });
  if (error) { console.error('provider budget settlement failed:', error); return { ok: false, error }; }
  return { ok: true };
}

/** Restore a free scene allowance after an asynchronous provider failure. The job marker makes this idempotent. */
export async function refundJobUsageQuota(job) {
  const start = job?.payload?.quotaWindowStart;
  const userId = job?.user_id;
  if (!start || !userId || !supabaseAdmin || !IS_PRODUCTION) return { ok: true, skipped: true };
  const { error } = await supabaseAdmin.rpc('refund_avirzo_job_usage', {
    p_job_id: job.id, p_user_id: userId, p_kind: 'generation', p_window_start: start
  });
  if (error) { console.error('job usage quota refund failed:', error); return { ok: false, error }; }
  return { ok: true };
}

/** Read credit balance (0 if none). Service role. */
export async function getCreditBalance(userId) {
  if (!supabaseAdmin || !userId || userId === 'development-user') return 0;
  const { data, error } = await supabaseAdmin.from('avirzo_credit_balances').select('balance').eq('user_id', userId).maybeSingle();
  if (error) { console.error('credit balance read failed:', error); return 0; }
  return Number(data?.balance) || 0;
}

/** Grant credits once per unique reason (e.g. included_grant). */
export async function addCredits(userId, amount, reason, meta = {}) {
  if (!supabaseAdmin || !userId || userId === 'development-user') return { ok: true, balance: 0, local: true };
  const { data, error } = await supabaseAdmin.rpc('add_avirzo_credits', {
    p_user_id: userId, p_amount: Math.floor(amount), p_reason: String(reason || 'credit').slice(0, 80), p_meta: meta
  });
  if (error) {
    // Unique grant index conflict → already granted
    if (String(error.message || '').includes('avirzo_credit_ledger_unique_grant') || error.code === '23505') {
      return { ok: true, balance: await getCreditBalance(userId), already: true };
    }
    console.error('add_avirzo_credits failed:', error);
    return { ok: false, balance: 0, error };
  }
  const row = Array.isArray(data) ? data[0] : data;
  return { ok: Boolean(row?.ok), balance: Number(row?.balance) || 0, message: row?.message };
}

export async function consumeCredits(userId, amount, reason, meta = {}) {
  if (!supabaseAdmin || !userId || userId === 'development-user') return { ok: true, balance: 0, local: true };
  const units = Math.floor(Number(amount) || 0);
  if (units <= 0) return { ok: true, balance: await getCreditBalance(userId), noCharge: true };
  const { data, error } = await supabaseAdmin.rpc('consume_avirzo_credits', {
    p_user_id: userId, p_amount: units, p_reason: String(reason || 'debit').slice(0, 80), p_meta: meta
  });
  if (error) {
    console.error('consume_avirzo_credits failed:', error);
    if (IS_PRODUCTION) return { ok: false, balance: 0, infrastructureError: true };
    return { ok: true, balance: 0, local: true };
  }
  const row = Array.isArray(data) ? data[0] : data;
  return { ok: Boolean(row?.ok), balance: Number(row?.balance) || 0, message: row?.message };
}

/**
 * Grant this month's subscription-included production credits once (idempotent).
 * Caps Avirzo provider exposure to planMonthlyCredits(plan) per user per calendar month.
 */
export async function ensureMonthlyPlanCredits(userId, plan) {
  if (!userId || userId === 'development-user') return;
  const amount = planMonthlyCredits(plan);
  if (amount <= 0) return;
  const monthKey = currentCreditMonthKey();
  const reason = `monthly_grant:${plan}:${monthKey}`;
  await addCredits(userId, amount, reason, { plan, month: monthKey, source: 'subscription_included' });
}

/** @deprecated use ensureMonthlyPlanCredits */
export async function ensureIncludedCredits(userId, plan) {
  return ensureMonthlyPlanCredits(userId, plan);
}

/**
 * Auth + trial + plan quotas + subscription-included production credits (monthly cap).
 * @param {number} [creditUnits] — override cost (e.g. generation seconds); default from defaultCreditCost(kind).
 */
export async function requireProviderUser(req, res, kind, creditUnits) {
  const user = await authUser(req);
  if (!IS_PRODUCTION && !user) return { id: 'development-user' };

  if (!user) {
    res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Sign in before using this provider-backed feature.' });
    return null;
  }
  req.avirzoUserId = user.id;
  // Verify email before any provider-backed operation. Supabase Auth owns the verification flow;
  // never trust a client-supplied verified flag or metadata field.
  if (process.env.REQUIRE_VERIFIED_EMAIL !== 'false' && !(user.email_confirmed_at || user.confirmed_at)) {
    res.status(403).json({ error: 'EMAIL_VERIFICATION_REQUIRED', message: 'Verify your email address before generating scenes or using paid AI features. Check your inbox for the Supabase verification email, then sign in again.' });
    return null;
  }
  const baseLimit = RATE_LIMITS[kind];
  const plan = await getUserPlan(user.id);
  if (TRIAL_GATED_KINDS.includes(kind)) {
    const trial = freeTrialStatus({ createdAt: user.created_at, plan });
    if (trial.expired && !(kind === 'generation' && plan === 'free')) {
      res.status(402).json({ error: 'TRIAL_ENDED', message: 'Your free access period has ended. Choose Creator or Studio in Billing to keep generating, voicing and animating. Your projects stay safe and you can still open and export them.', trialEndedAt: trial.endsAt });
      return null;
    }
  }
  if (TRIAL_GATED_KINDS.includes(kind)) {
    const blocked = freeAccessBlock({ plan, user, production: IS_PRODUCTION });
    if (blocked) { res.status(blocked.status).json({ error: blocked.error, message: blocked.message }); return null; }
  }
  if (baseLimit) {
    const limit = scaledLimit(baseLimit, plan);
    const result = await durableUsageLimit(user.id, kind, limit, { plan, createdAt: user.created_at });
    if (result.infrastructureError) {
      res.status(503).json({ error: 'USAGE_LIMIT_UNAVAILABLE', message: 'Usage protection is temporarily unavailable. Please try again shortly.' });
      return null;
    }
    if (!result.allowed) {
      if (kind === 'generation' && plan === 'free') {
        res.status(402).json({ error: 'FREE_SCENE_ALLOWANCE_USED', message: 'You have used your two free scene generations. Upgrade to Creator or Studio, or purchase credits, to generate more scenes.' });
        return null;
      }
      res.set('Retry-After', String(result.retryAfter));
      res.status(429).json({ error: 'RATE_LIMITED', message: `Too many ${kind} requests. Try again later.`, retryAfter: result.retryAfter });
      return null;
    }
    // Remember what was consumed so a failed request can give it back (see refundProviderCharge).
    user._usage = { kind, windowStart: usageWindowStart(kind, new Date(), { plan, createdAt: user.created_at }).toISOString() };
  }

  // Resolve model-specific pricing only after authenticating and loading the actual plan.
  // A callback may return { units, model }; callers cannot submit their own trusted price.
  let quote = null;
  if (typeof creditUnits === 'function') {
    try { quote = await creditUnits(user, plan); }
    catch (e) {
      console.error('credit quote failed:', e);
      await refundUsage(user);
      res.status(500).json({ error: 'QUOTE_FAILED', message: 'Could not work out the credit cost for this request. Please try again.' });
      return null;
    }
  }
  if (quote && typeof quote === 'object') { user._generationModel = quote.model || null; user._quotedUnits = Number(quote.units) || 0; }
  const quoteMeta = quote && typeof quote === 'object' && quote.meta && typeof quote.meta === 'object' ? quote.meta : {};

  // Subscription-included monthly credits (hard cap protects Avirzo provider spend). Free video generations are separately capped at two per account lifetime.
  if (creditsEnabled() && TRIAL_GATED_KINDS.includes(kind) && !(kind === 'generation' && plan === 'free')) {
    await ensureMonthlyPlanCredits(user.id, plan);
    const quotedUnits = quote && typeof quote === 'object' ? quote.units : creditUnits;
    // A missing or non-numeric quote must never mean "free": fall back to the worst-case default for this kind.
    const quotedNumber = Math.floor(Number(quotedUnits));
    const units = quotedUnits != null && Number.isFinite(quotedNumber) ? Math.max(0, quotedNumber) : defaultCreditCost(kind);
    if (units > 0) {
      // Usage record: what was asked for, the model, the credits charged and our estimated provider cost (actual cost is on the provider invoice).
      const usageMeta = { kind, units, plan, model: user._generationModel || undefined, estimatedProviderCostUsd: creditsToProviderUsd(units), ...quoteMeta };
      const debit = await consumeCredits(user.id, units, kind, usageMeta);
      if (debit.infrastructureError) {
        await refundUsage(user);
        res.status(503).json({ error: 'CREDITS_UNAVAILABLE', message: 'Credit wallet is temporarily unavailable. Please try again shortly.' });
        return null;
      }
      if (!debit.ok) {
        await refundUsage(user); // the request is refused, so it must not use up the clip/hour quota either
        const monthly = planMonthlyCredits(plan);
        res.status(402).json({
          error: 'INSUFFICIENT_CREDITS',
          message: `This ${kind} needs ${units} credit${units === 1 ? '' : 's'}. Your ${plan} plan includes up to ${monthly} production credits per month. Upgrade your plan for a higher monthly allowance, or wait until next month.`,
          required: units,
          balance: debit.balance || 0,
          planMonthlyCredits: monthly,
          plan
        });
        return null;
      }
      user._creditBalance = debit.balance;
      user._creditsCharged = units;
      user._usageMeta = usageMeta;
    }
  }
  return user;
}
/** Give back the usage-quota unit consumed by requireProviderUser. Safe to call more than once. */
export async function refundUsage(user) {
  const usage = user?._usage;
  if (!usage || user._usageRefunded || user.id === 'development-user') return;
  user._usageRefunded = true;
  try {
    if (IS_PRODUCTION && supabaseAdmin) {
      const { error } = await supabaseAdmin.rpc('refund_avirzo_usage', { p_user_id: user.id, p_kind: usage.kind, p_window_start: usage.windowStart });
      if (error) console.error('usage refund failed:', error);
    } else {
      const bucket = rateBuckets.get(`${usage.kind}:${user.id}`);
      if (bucket && bucket.count > 0) bucket.count -= 1;
    }
  } catch (e) { console.error('usage refund failed:', e); }
}

/**
 * Undo everything requireProviderUser charged (credits and quota) when a request fails before any
 * provider output is delivered. Idempotent per request, so every early-return path can call it.
 */
export async function refundProviderCharge(user, why = 'request_failed') {
  if (!user || user.id === 'development-user') return;
  const credits = Number(user._creditsCharged) || 0;
  if (credits > 0 && !user._creditsRefunded) {
    user._creditsRefunded = true;
    try { await addCredits(user.id, credits, `refund:${why}`.slice(0, 80), { kind: user._usage?.kind || 'provider', why }); }
    catch (e) { console.error('credit refund failed:', e); }
  }
  await refundUsage(user);
}

/**
 * Refund the credits of a provider job that failed after it was accepted (the provider rejected the task later,
 * timed out, or returned no output). The job id makes it idempotent in the database: one refund per job, ever.
 */
export async function refundJobCredits(job, why = 'provider_failed') {
  const credits = Number(job?.payload?.creditsCharged) || 0;
  if (!credits || !job?.id || !job.user_id || job.user_id === 'development-user') return { ok: true, skipped: true };
  return addCredits(job.user_id, credits, `refund:job:${job.id}`, { kind: job.type, why, jobId: job.id });
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

export { RUNWAY_PROMPT_MAX } from './videoPrompt.js';
/** Build a compact, production-minded prompt for one editable shot. */
export function buildCinematicPrompt({ prompt, style, camera, sceneNumber, africanProfile, era = 'pre1994', storyType = 'inspired', historicalNotes = '', characters = [], researchBrief = null, referenceCharacter = null, continuityContext = null, worldBible = null }) {
  const scene = String(prompt || '').trim();
  const shotIdentity = `Shot ${sceneNumber || 1}. ${String(style || 'Cinematic')} film style; ${String(camera || 'Slow dolly')} camera movement.`;
  const setting = `Setting: ${africanProfile?.market || 'Africa'}; language ${africanProfile?.language || 'English'}. Era: ${eras[era] || eras.pre1994}.`;
  const reference = referenceCharacter ? `Reference identity lock for ${referenceCharacter.name || 'the character'}: preserve face, hair, build and clothing.` : '';
  const continuity = continuityContext ? `Continuity lock: ${String(continuityContext).trim()}` : '';
  const quality = 'Cinematic composition, motivated film lighting, natural human movement and believable physics; stable faces and anatomy, consistent wardrobe and props, clean temporal motion, coherent exposure and colour. One continuous, readable shot; no abrupt morphing, flicker, duplicated limbs, warped objects, text, subtitles, logos or watermarks.';
  const cultural = africanProfile?.guidance ? `Cultural grounding: ${africanProfile.guidance}` : '';
  const story = `Story context: ${storyTypes[storyType] || storyTypes.inspired}.`;
  const history = historicalNotes ? `Historical notes: ${historicalNotes}` : '';
  const research = researchBrief ? `Research: verified facts ${researchBrief.verifiedFacts || 'none'}; material culture ${researchBrief.materialCulture || 'n/a'}; uncertainties ${researchBrief.uncertainties || 'none'}; place ${researchBrief.location || 'n/a'}; period ${researchBrief.period || 'n/a'}.` : '';
  const cast = characters.length ? `Character continuity: ${characters.map(c => characterContinuityLine(c, africanProfile?.language)).join(' | ')}` : '';
  const bible = worldBible ? `World Bible: location ${worldBible.locations || 'unspecified'}; objects ${worldBible.objects || 'unspecified'}; costumes ${worldBible.costumes || 'unspecified'}; architecture ${worldBible.architecture || 'unspecified'}; cultural practices ${worldBible.culturalPractices || 'unspecified'}; visual rules ${worldBible.visualRules || 'unspecified'}; language rules ${worldBible.languageRules || 'unspecified'}; continuity locks ${worldBible.continuityLocks || 'unspecified'}.` : '';
  const fixed = [shotIdentity, setting, reference, continuity, quality].filter(Boolean).join(' ');
  // Cultural and World Bible context takes priority over optional general story notes.
  return composeCinematicPrompt({ fixed, scene, extras: [cultural, bible, cast, research, history, story] });
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
  const assetLimits = { video: 300 * 1024 * 1024, export: 300 * 1024 * 1024, audio: 40 * 1024 * 1024, image: 20 * 1024 * 1024 };
  const maxBytes = assetLimits[kind];
  if (!maxBytes) throw new Error('Unsupported media asset type.');
  const fetched=await safeFetchBuffer(sourceUrl,{maxBytes,timeoutMs:120000});
  if(!fetched.buffer?.length) throw new Error('Provider returned an empty media file.');
  const detected = detectMediaType(fetched.buffer);
  const declared=(fetched.contentType||'').split(';')[0].trim().toLowerCase();
  const generic = !declared || declared === 'application/octet-stream' || declared === 'binary/octet-stream';
  if (!detected) throw new Error('Downloaded file is not a recognized media format.');
  const contentType = generic ? detected : declared;
  const allowedByKind = {
    video: new Set(['video/mp4','video/webm','video/quicktime']),
    export: new Set(['video/mp4','video/webm','video/quicktime']),
    audio: new Set(['audio/mpeg','audio/wav','audio/x-wav','audio/ogg','audio/mp4','audio/webm','audio/aac']),
    image: new Set(['image/jpeg','image/png','image/webp','image/gif'])
  };
  if (!contentType || !allowedByKind[kind]?.has(contentType)) throw new Error(`Downloaded content type '${declared || 'unknown'}' is not allowed for ${kind} assets.`);
  if (detected && detected !== contentType && !(detected === 'audio/wav' && contentType === 'audio/x-wav')) throw new Error('Downloaded file signature does not match its declared media type.');
  const ext=contentType.includes('mp4')?'mp4':contentType.includes('mpeg')||contentType.includes('mp3')?'mp3':contentType.includes('webm')?'webm':contentType.includes('png')?'png':contentType.includes('jpeg')?'jpg':contentType.includes('quicktime')?'mov':contentType.includes('wav')?'wav':contentType.includes('ogg')?'ogg':contentType.includes('aac')?'aac':contentType.includes('gif')?'gif':contentType.includes('webp')?'webp':'bin';
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
    const { error: cleanupError } = await supabaseAdmin.storage.from('avirzo-media').remove([storagePath]);
    if (cleanupError) console.error('asset rollback cleanup failed:', cleanupError.message || cleanupError);
    throw error;
  }
  return data;
}

// Archive a finished provider job's output. Safe to call from any process, any number of times.
export async function archiveProviderOutput({job, sourceUrl, kind='video', name, sourceProvider='runway'}){
  if(job?.result_asset_id) return { id: job.result_asset_id };
  return persistRemoteAsset({ user:{id:job.user_id}, projectId:job.project_id, sourceUrl, kind, name: name || `scene-${job.id}`, sourceProvider, providerTaskId: job.provider_task_id });
}

// Best-effort security telemetry. Never store raw IP addresses or credentials.
const recentAbuseEvents = new Map();
export async function recordAbuseEvent({ req, status, eventType, details = {} }) {
  if (!supabaseAdmin || !IS_PRODUCTION) return;
  try {
    const ip = String(req.ip || '').trim();
    const secret = process.env.ABUSE_HASH_SECRET || SUPABASE_SERVICE_ROLE_KEY;
    const ipHash = ip && secret ? createHmac('sha256', secret).update(ip).digest('hex') : null;
    const route = String(req.path || '/').slice(0, 180);
    // Coalesce repeated identical events for 60 seconds per instance to limit telemetry-write abuse.
    const dedupeKey = `${eventType}:${status}:${ipHash || 'unknown'}:${req.avirzoUserId || 'anonymous'}:${route}`;
    const now = Date.now();
    const previous = recentAbuseEvents.get(dedupeKey) || 0;
    if (now - previous < 60_000) return;
    recentAbuseEvents.set(dedupeKey, now);
    if (recentAbuseEvents.size > 5000) {
      for (const [key, at] of recentAbuseEvents) if (now - at >= 60_000) recentAbuseEvents.delete(key);
      while (recentAbuseEvents.size > 5000) recentAbuseEvents.delete(recentAbuseEvents.keys().next().value);
    }
    const agent = String(req.headers['user-agent'] || '').slice(0, 240);
    const safeDetails = Object.fromEntries(Object.entries(details || {}).filter(([k,v]) => /^(method|error|retryAfter|limitType)$/.test(k) && ['string','number','boolean'].includes(typeof v)).map(([k,v]) => [k, String(v).slice(0, 120)]));
    const { error } = await supabaseAdmin.from('avirzo_security_events').insert({
      user_id: req.avirzoUserId || null, event_type: String(eventType || 'http_rejected').slice(0, 80),
      status_code: Number(status) || null, route, ip_hash: ipHash, user_agent: agent || null, details: safeDetails
    });
    if (error) console.warn('security event logging unavailable:', error.message);
  } catch (error) { console.warn('security event logging failed:', error?.message || error); }
}

export const PROJECT_DIR = path.resolve('projects');
 export async function projectStore(){ const fs = await import('node:fs/promises'); await fs.mkdir(PROJECT_DIR,{recursive:true}); return fs; }
export function safeProjectId(id){ return String(id||'').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,120); }
export function normalizeProject(body={}, existing={}){ const now=new Date().toISOString(); return { id: existing.id || `project-${Date.now()}-${Math.random().toString(36).slice(2,8)}`, name:String(body.name||existing.name||'Untitled Avirzo Film').trim().slice(0,120)||'Untitled Avirzo Film', folder:String(body.folder||existing.folder||'My Films').trim().slice(0,80)||'My Films', mode:body.mode||'story', story:String(body.story||''), style:String(body.style||'Historical drama'), camera:String(body.camera||'Slow dolly'), duration:String(body.duration||'5 sec'), format:String(body.format||'16:9'), africanProfile:String(body.africanProfile||'uganda-lg'), era:String(body.era||'pre1994'), storyType:String(body.storyType||'oral'), historicalNotes:String(body.historicalNotes||''), rootsFoundation:body.rootsFoundation&&typeof body.rootsFoundation==='object'?body.rootsFoundation:{community:'',country:'',place:'',language:'',period:'',culturalAnchors:'',evidenceLevel:'',creativeLiberties:'',sensitivityNotes:''}, scenes:Array.isArray(body.scenes)?body.scenes:[], characters:Array.isArray(body.characters)?body.characters:[], research:body.research&&typeof body.research==='object'?body.research:{}, worldBible:body.worldBible&&typeof body.worldBible==='object'?body.worldBible:{locations:'',objects:'',costumes:'',architecture:'',culturalPractices:'',musicSoundscape:'',languageRules:'',visualRules:'',familyStructure:'',taboosAndSensitivities:'',continuityLocks:'',relationships:''}, timeline:Array.isArray(body.timeline)?body.timeline:[], audioTracks:Array.isArray(body.audioTracks)?body.audioTracks:[], captions:Array.isArray(body.captions)?body.captions:[], review:body.review&&typeof body.review==='object'?body.review:{enabled:false,notes:[]}, aiEndCard:body.aiEndCard===true, duckMusic:body.duckMusic!==false, captionMode:['burn','soft','none'].includes(body.captionMode)?body.captionMode:'burn', exportQuality:['draft','standard','high'].includes(body.exportQuality)?body.exportQuality:'standard', includeSrt:body.includeSrt!==false, exportUrl:String(body.exportUrl||''), createdAt:existing.createdAt||now, updatedAt:now }; }
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
  return ['owner', 'editor'].includes(member?.role);
}
export function toSrtTime(seconds) {
  const ms = Math.max(0, Math.round(seconds * 1000));
  const h = Math.floor(ms / 3600000); const m = Math.floor((ms % 3600000) / 60000); const s = Math.floor((ms % 60000) / 1000); const milli = ms % 1000;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')},${String(milli).padStart(3,'0')}`;
}

