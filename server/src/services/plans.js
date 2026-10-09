// Dependency-free plan/limit helpers (kept separate so they can be unit-tested without installing the server dependencies).
export function envInt(name, fallback, env = process.env) { const raw = env[name]; const n = Number(raw); return raw !== undefined && raw !== '' && Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback; }
// Hourly quota multipliers per plan (product decision: adjust here). Applied to the base RATE_LIMITS.
export const PLAN_LIMIT_MULTIPLIER = { free: 1, creator: 3, studio: 10 };
export function scaledLimit(limit, plan) { if (limit.perPlan && Number.isFinite(limit.perPlan[plan])) return { ...limit, max: Math.max(0, limit.perPlan[plan]) }; return { ...limit, max: Math.max(1, Math.round(limit.max * (PLAN_LIMIT_MULTIPLIER[plan] || 1))) }; }

// Model used for a generation. Free accounts can be moved to the cheaper Gen-4 Turbo (about 40% of Gen-4.5's per-second cost)
// by setting FREE_GENERATION_MODEL=gen4_turbo. Turbo needs a reference image, so text-only requests stay on Gen-4.5.
export function pickGenerationModel(plan, hasReferenceImage, env = process.env) {
  if (plan === 'free' && String(env.FREE_GENERATION_MODEL || '').trim() === 'gen4_turbo' && hasReferenceImage) return 'gen4_turbo';
  return 'gen4.5';
}

// ---- Free month. Free accounts get FREE_TRIAL_DAYS (default 30) from the later of sign-up and the policy start date,
// so accounts created before this rule existed also get a full month from the policy start. FREE_TRIAL_DAYS=0 turns the limit off.
export const DEFAULT_TRIAL_POLICY_START = '2026-10-09';
// Only features that cost real provider money are blocked after the free month. Exports and project access stay open
// so people can always open, save and download their own work.
export const TRIAL_GATED_KINDS = ['generation', 'voice', 'performance'];
export function freeTrialStart(createdAt, env = process.env) {
  const policyStart = Date.parse(env.FREE_TRIAL_POLICY_START || DEFAULT_TRIAL_POLICY_START) || Date.parse(DEFAULT_TRIAL_POLICY_START);
  const created = Date.parse(createdAt || '');
  return Number.isFinite(created) ? Math.max(created, policyStart) : policyStart;
}
export function freeTrialStatus({ createdAt, plan, now = Date.now(), env = process.env } = {}) {
  const days = envInt('FREE_TRIAL_DAYS', 30, env);
  if (plan !== 'free' || days === 0) return { applies: false, expired: false };
  const start = freeTrialStart(createdAt, env);
  const end = start + days * 86400000;
  return { applies: true, expired: now >= end, endsAt: new Date(end).toISOString(), daysLeft: Math.max(0, Math.ceil((end - now) / 86400000)) };
}
