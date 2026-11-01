// What can be sold through Pesapal, built from environment settings, with the same cost-safety rules the Stripe packs use.
import { envInt } from './plans.js';
import { planMonthlyCredits, creditsToProviderUsd, creditPackProblem } from './credits.js';

export function billingProvider(env = process.env) {
  const v = String(env.BILLING_PROVIDER || '').toLowerCase();
  if (v === 'stripe' || v === 'pesapal') return v;
  return env.PESAPAL_CONSUMER_KEY && env.PESAPAL_CONSUMER_SECRET ? 'pesapal' : 'stripe';
}
export const pesapalCurrency = (env = process.env) => String(env.PESAPAL_CURRENCY || 'USD').toUpperCase();
export function unitsPerUsd(env = process.env) {
  if (pesapalCurrency(env) === 'USD') return 1;
  const n = Number(env.PESAPAL_UNITS_PER_USD);
  return Number.isFinite(n) && n > 0 ? n : null;
}
export const formatMoney = (amount, currency) => (currency === 'USD' ? `$${Number(amount).toLocaleString('en-US', { maximumFractionDigits: 2 })}` : `${currency} ${Number(amount).toLocaleString('en-US', { maximumFractionDigits: 2 })}`);
// Avirzo's standard dollar prices; used when the currency is USD and no explicit price is set.
const USD_PLAN_DEFAULTS = { creator: 19, studio: 59 };
const USD_PACK_DEFAULTS = { starter: 6, pro: 20, studio: 55 };
const priceOf = (env, name, usdDefault) => { const n = Number(env[name]); if (n > 0) return n; return pesapalCurrency(env) === 'USD' ? usdDefault : NaN; };

const PLAN_NAMES = { creator: 'Creator', studio: 'Studio' };
export function pesapalPlanCatalog(env = process.env) {
  const currency = pesapalCurrency(env);
  const days = Math.max(1, envInt('PESAPAL_PLAN_DAYS', 30, env));
  return ['creator', 'studio'].map(id => {
    const amount = priceOf(env, `PESAPAL_${id.toUpperCase()}_PRICE`, USD_PLAN_DEFAULTS[id]);
    if (!(amount > 0)) return null;
    return { id, name: PLAN_NAMES[id], amount, currency, days, credits: planMonthlyCredits(id, env), label: formatMoney(amount, currency), priceHint: `${formatMoney(amount, currency)} for ${days} days` };
  }).filter(Boolean);
}

export const MIN_PLAN_MARGIN_DEFAULT = 1.5;
/** Why a plan is not safe to sell (null when it is): its monthly credits must not be able to cost more than the price allows. */
export function planProblem(plan, env = process.env) {
  const rate = unitsPerUsd(env);
  if (!rate) return `PESAPAL_UNITS_PER_USD is not set, so the ${plan.id} price cannot be checked`;
  const margin = Number(env.MIN_PLAN_MARGIN) > 0 ? Number(env.MIN_PLAN_MARGIN) : MIN_PLAN_MARGIN_DEFAULT;
  const priceUsd = plan.amount / rate;
  const costUsd = creditsToProviderUsd(plan.credits);
  if (priceUsd < costUsd * margin) return `${plan.id} plan sells at about $${priceUsd.toFixed(2)} but its ${plan.credits} monthly credits can cost up to $${costUsd.toFixed(2)} (needs ${margin}x cover)`;
  return null;
}
export const offeredPesapalPlans = (env = process.env) => pesapalPlanCatalog(env).filter(p => !planProblem(p, env));

const PACKS = [['starter', 300, 'Top-up · Starter'], ['pro', 1000, 'Top-up · Pro'], ['studio', 3000, 'Top-up · Studio']];
export function pesapalPackCatalog(env = process.env) {
  const currency = pesapalCurrency(env); const rate = unitsPerUsd(env);
  return PACKS.map(([id, def, label]) => {
    const amount = priceOf(env, `PESAPAL_PACK_${id.toUpperCase()}_PRICE`, Number(env[`CREDIT_PACK_${id.toUpperCase()}_PRICE_USD`]) > 0 ? Number(env[`CREDIT_PACK_${id.toUpperCase()}_PRICE_USD`]) : USD_PACK_DEFAULTS[id]);
    if (!(amount > 0)) return null;
    const credits = envInt(`CREDIT_PACK_${id.toUpperCase()}_CREDITS`, def, env);
    return { id, label, credits, amount, currency, priceUsd: rate ? amount / rate : null, priceHint: formatMoney(amount, currency) };
  }).filter(Boolean);
}
export const offeredPesapalPacks = (env = process.env) => pesapalPackCatalog(env).filter(p => !creditPackProblem(p, env));

export function pesapalWarnings(env = process.env) {
  return [...pesapalPlanCatalog(env).map(p => planProblem(p, env)), ...pesapalPackCatalog(env).map(p => creditPackProblem(p, env))].filter(Boolean);
}
