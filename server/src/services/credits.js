/**
 * Subscription-included production credits (monthly caps).
 * Protects Avirzo: max provider exposure ≈ sum of plan monthly allowances.
 * Optional top-up packs remain available for overage only.
 */
import { envInt } from './plans.js';

/**
 * Avirzo credits mirror the provider's Runway credit schedule for video.
 * Defaults: Gen-4.5 = 12 credits/second; Gen-4 Turbo = 5 credits/second.
 * Override rates only after checking the active provider contract/pricing.
 */
export function generationCreditCost(model, durationSeconds, env = process.env) {
  const seconds = Number(durationSeconds);
  if (!Number.isFinite(seconds) || seconds <= 0) return 0;
  const isTurbo = String(model || '').toLowerCase() === 'gen4_turbo';
  const rate = isTurbo
    ? envInt('RUNWAY_GEN4_TURBO_CREDITS_PER_SECOND', 5, env)
    : envInt('RUNWAY_GEN45_CREDITS_PER_SECOND', 12, env);
  return Math.ceil(seconds * rate);
}

/** One Avirzo credit is priced at roughly one US cent of provider cost (Runway's own credit value). */
export const PROVIDER_USD_PER_CREDIT = 0.01;
export function creditsToProviderUsd(credits) { return Math.round((Number(credits) || 0) * PROVIDER_USD_PER_CREDIT * 10000) / 10000; }

/**
 * Voice is billed by script length. Default 20 credits per 1,000 characters (about $0.20 per 1,000 characters).
 * Set CREDITS_PER_1K_VOICE_CHARS to match your real voice-provider plan cost per 1,000 characters.
 */
export function voiceCreditCost(characters, env = process.env) {
  const n = Number(characters);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.max(1, Math.ceil((n / 1000) * envInt('CREDITS_PER_1K_VOICE_CHARS', 20, env)));
}

/** Music is billed by requested length. Default 1 credit per second (about $0.60 per minute). Check against your music provider. */
export function musicCreditCost(durationSeconds, env = process.env) {
  const s = Number(durationSeconds);
  if (!Number.isFinite(s) || s <= 0) return 0;
  return Math.max(1, Math.ceil(s * envInt('CREDITS_PER_MUSIC_SECOND', 1, env)));
}

/** Keyframe image (the scene's first frame). gen4_image = 5 credits at 720p, gen4_image_turbo = 2 credits. */
export function keyframeCreditCost(imageModel, env = process.env) {
  return imageModel === 'gen4_image_turbo' ? envInt('RUNWAY_GEN4_IMAGE_TURBO_CREDITS', 2, env) : envInt('RUNWAY_GEN4_IMAGE_CREDITS', 5, env);
}

/** Runway Act-Two is billed by the length of the reference performance video (3–30 s). Default 5 credits per second. */
export const PERFORMANCE_MIN_SECONDS = 3;
export const PERFORMANCE_MAX_SECONDS = 30;
export function performanceCreditCost(durationSeconds, env = process.env) {
  const s = Number(durationSeconds);
  const clamped = Number.isFinite(s) && s > 0 ? Math.min(PERFORMANCE_MAX_SECONDS, Math.max(PERFORMANCE_MIN_SECONDS, s)) : PERFORMANCE_MAX_SECONDS;
  return Math.ceil(clamped * envInt('RUNWAY_ACT_TWO_CREDITS_PER_SECOND', 5, env));
}

/**
 * Fallback costs, used only when a route does not pass its own quote. They are deliberately worst-case so a missed
 * quote can never undercharge: generation at the Gen-4.5 rate, voice for a full 12,000-character script, performance for 30 s.
 */
export function defaultCreditCost(kind, extra = {}) {
  if (kind === 'generation') {
    const sec = Number(extra.durationSeconds);
    if (Number.isFinite(sec) && sec > 0) return generationCreditCost('gen4.5', sec);
    return envInt('CREDITS_PER_GENERATION', 60);
  }
  if (kind === 'voice') return envInt('CREDITS_PER_VOICE', 240);
  if (kind === 'performance') return envInt('CREDITS_PER_PERFORMANCE', performanceCreditCost(PERFORMANCE_MAX_SECONDS));
  if (kind === 'export') {
    const min = Number(extra.exportMinutes);
    if (Number.isFinite(min) && min > 0) return Math.max(0, Math.ceil(min * envInt('CREDITS_PER_EXPORT_MINUTE', 0)));
    return envInt('CREDITS_PER_EXPORT', 0);
  }
  return 0;
}

export function creditsEnabled(env = process.env) {
  if (String(env.CREDITS_ENABLED || '').toLowerCase() === 'false') return false;
  if (String(env.CREDITS_ENABLED || '').toLowerCase() === 'true') return true;
  return env.NODE_ENV === 'production';
}

/**
 * Monthly credit budgets sized around current Runway provider costs. Free users receive no recurring monthly wallet credits; their two free video scenes are governed by the account-level generation quota.
 * At the default Gen-4.5 rate, a 5-second clip costs 60 credits and a
 * 10-second clip costs 120. These are budgets, not guaranteed clip counts:
 * voice and performance also draw from the same wallet.
 */
export function planMonthlyCredits(plan, env = process.env) {
  const p = String(plan || 'free');
  if (p === 'studio') return envInt('STUDIO_CREDITS_PER_MONTH', 1800, env);
  if (p === 'creator') return envInt('CREATOR_CREDITS_PER_MONTH', 600, env);
  return envInt('FREE_CREDITS_PER_MONTH', 0, env);
}

export function currentCreditMonthKey(date = new Date()) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * Optional overage packs. Credits now track provider cost (~$0.01 each), so a pack must be priced well above that.
 * Set STRIPE_CREDIT_PACK_<X>_PRICE_ID (the Stripe price) AND CREDIT_PACK_<X>_PRICE_USD (what you charge, for the safety check).
 * Suggested: Starter 300 credits = $6, Pro 1000 = $20, Studio 3000 = $55.
 */
export const MIN_PACK_USD_PER_CREDIT_DEFAULT = 0.015;
export function creditPackCatalog(env = process.env) {
  const packs = [];
  const add = (envKey, packId, defCredits, label, priceHint, usdKey) => {
    const priceId = env[envKey];
    if (!priceId) return;
    const credits = envInt(`CREDIT_PACK_${packId.toUpperCase()}_CREDITS`, defCredits, env);
    const usd = Number(env[usdKey]);
    packs.push({ id: packId, priceId, credits, label, priceHint: priceHint || `${credits} credits`, priceUsd: Number.isFinite(usd) && usd > 0 ? usd : null });
  };
  add('STRIPE_CREDIT_PACK_STARTER_PRICE_ID', 'starter', 300, 'Top-up · Starter', env.CREDIT_PACK_STARTER_PRICE_LABEL, 'CREDIT_PACK_STARTER_PRICE_USD');
  add('STRIPE_CREDIT_PACK_PRO_PRICE_ID', 'pro', 1000, 'Top-up · Pro', env.CREDIT_PACK_PRO_PRICE_LABEL, 'CREDIT_PACK_PRO_PRICE_USD');
  add('STRIPE_CREDIT_PACK_STUDIO_PRICE_ID', 'studio', 3000, 'Top-up · Studio', env.CREDIT_PACK_STUDIO_PRICE_LABEL, 'CREDIT_PACK_STUDIO_PRICE_USD');
  return packs;
}

/** Why a pack is not safe to sell (null when it is). A pack with no declared USD price is never offered. */
export function creditPackProblem(pack, env = process.env) {
  const floor = Number(env.MIN_PACK_USD_PER_CREDIT) > 0 ? Number(env.MIN_PACK_USD_PER_CREDIT) : MIN_PACK_USD_PER_CREDIT_DEFAULT;
  if (!pack.priceUsd) return `CREDIT_PACK_${pack.id.toUpperCase()}_PRICE_USD is not set, so the pack price cannot be checked`;
  const perCredit = pack.priceUsd / pack.credits;
  if (perCredit < floor) return `${pack.id} pack sells at $${perCredit.toFixed(4)}/credit, below the $${floor}/credit floor (provider cost is about $${PROVIDER_USD_PER_CREDIT}/credit before fees)`;
  return null;
}

/** Packs customers may buy. Packs that fail the price check are hidden and cannot be checked out. */
export function offeredCreditPacks(env = process.env) {
  return creditPackCatalog(env).filter((p) => !creditPackProblem(p, env));
}

export function creditPackWarnings(env = process.env) {
  return creditPackCatalog(env).map((p) => creditPackProblem(p, env)).filter(Boolean);
}

/** Credits for a Stripe price ID. Uses the FULL catalog on purpose: a customer who already paid must always get their credits. */
export function packCreditsForPriceId(priceId, env = process.env) {
  const pack = creditPackCatalog(env).find((p) => p.priceId === priceId);
  if (pack) return pack.credits;
  return null;
}

/** Plain-language summary of what each plan's wallet could cost in provider fees, for the startup log. */
export function creditConfigSummary(env = process.env) {
  return ['free', 'creator', 'studio'].map((plan) => {
    const credits = planMonthlyCredits(plan, env);
    return `${plan}: ${credits} credits/month = up to $${creditsToProviderUsd(credits).toFixed(2)} provider cost`;
  });
}
