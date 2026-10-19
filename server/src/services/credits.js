/**
 * Subscription-included production credits (monthly caps).
 * Protects Avirzo: max provider exposure ≈ sum of plan monthly allowances.
 * Optional top-up packs remain available for overage only.
 */
import { envInt } from './plans.js';

/** 1 credit ≈ 1 second of video generation by default. */
export function defaultCreditCost(kind, extra = {}) {
  if (kind === 'generation') {
    const sec = Number(extra.durationSeconds);
    if (Number.isFinite(sec) && sec > 0) return Math.max(1, Math.ceil(sec));
    return envInt('CREDITS_PER_GENERATION', 5);
  }
  if (kind === 'voice') return envInt('CREDITS_PER_VOICE', 2);
  if (kind === 'performance') return envInt('CREDITS_PER_PERFORMANCE', 5);
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
 * Monthly production credits included in each subscription plan.
 * Defaults aligned with generation budgets (≈5 credits per 5s clip):
 * free 25 (~5 clips), creator 300 (~60 clips), studio 1000 (~200 clips).
 */
export function planMonthlyCredits(plan, env = process.env) {
  const p = String(plan || 'free');
  if (p === 'studio') return envInt('STUDIO_CREDITS_PER_MONTH', 1000, env);
  if (p === 'creator') return envInt('CREATOR_CREDITS_PER_MONTH', 300, env);
  return envInt('FREE_CREDITS_PER_MONTH', 25, env);
}

export function currentCreditMonthKey(date = new Date()) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/** Optional overage packs (not required — subscription is the main path). */
export function creditPackCatalog(env = process.env) {
  const packs = [];
  const add = (envKey, packId, credits, label, priceHint) => {
    const priceId = env[envKey];
    if (priceId) packs.push({ id: packId, priceId, credits, label, priceHint });
  };
  add('STRIPE_CREDIT_PACK_STARTER_PRICE_ID', 'starter', envInt('CREDIT_PACK_STARTER_CREDITS', 50, env), 'Top-up · Starter', env.CREDIT_PACK_STARTER_PRICE_LABEL || '50 credits');
  add('STRIPE_CREDIT_PACK_PRO_PRICE_ID', 'pro', envInt('CREDIT_PACK_PRO_CREDITS', 200, env), 'Top-up · Pro', env.CREDIT_PACK_PRO_PRICE_LABEL || '200 credits');
  add('STRIPE_CREDIT_PACK_STUDIO_PRICE_ID', 'studio', envInt('CREDIT_PACK_STUDIO_CREDITS', 1000, env), 'Top-up · Studio', env.CREDIT_PACK_STUDIO_PRICE_LABEL || '1000 credits');
  return packs;
}

export function packCreditsForPriceId(priceId, env = process.env) {
  const pack = creditPackCatalog(env).find((p) => p.priceId === priceId);
  if (pack) return pack.credits;
  return null;
}
