// Dependency-free plan/limit helpers (kept separate so they can be unit-tested without installing the server dependencies).
export function envInt(name, fallback, env = process.env) { const raw = env[name]; const n = Number(raw); return raw !== undefined && raw !== '' && Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback; }
// Hourly quota multipliers per plan (product decision: adjust here). Applied to the base RATE_LIMITS.
export const PLAN_LIMIT_MULTIPLIER = { free: 1, creator: 3, studio: 10 };
export function scaledLimit(limit, plan) { if (limit.perPlan && Number.isFinite(limit.perPlan[plan])) return { ...limit, max: Math.max(0, limit.perPlan[plan]) }; return { ...limit, max: Math.max(1, Math.round(limit.max * (PLAN_LIMIT_MULTIPLIER[plan] || 1))) }; }

// Model used for a generation. Turbo is about 40% of Gen-4.5's per-second cost but needs a reference image,
// so text-only requests stay on Gen-4.5.
// - Free accounts use Turbo by default (set FREE_GENERATION_MODEL=gen4.5 to turn that off).
// - Any plan can ask for a cheaper draft (quality: 'draft' or model: 'gen4_turbo') when a reference image is attached.
export function pickGenerationModel(plan, hasReferenceImage, env = process.env, requested = '') {
  if (!hasReferenceImage) return 'gen4.5';
  const want = String(requested || '').trim().toLowerCase();
  if (want === 'draft' || want === 'gen4_turbo') return 'gen4_turbo';
  const freeModel = String(env.FREE_GENERATION_MODEL ?? 'gen4_turbo').trim();
  if (plan === 'free' && freeModel === 'gen4_turbo') return 'gen4_turbo';
  return 'gen4.5';
}

// Free-plan abuse guard. Free accounts cost real provider money, so in production they must have a confirmed email,
// and FREE_GENERATION_ENABLED=false is a kill switch if free usage ever gets out of hand.
export function freeAccessBlock({ plan, user, production = false, env = process.env } = {}) {
  if (plan !== 'free' || !user || user.id === 'development-user') return null;
  if (String(env.FREE_GENERATION_ENABLED ?? 'true').trim().toLowerCase() === 'false') {
    return { status: 402, error: 'FREE_PAUSED', message: 'Free generation is paused right now. Choose Creator or Studio in Billing to keep generating.' };
  }
  const needVerified = String(env.FREE_REQUIRE_VERIFIED_EMAIL ?? 'true').trim().toLowerCase() !== 'false';
  if (production && needVerified && !(user.email_confirmed_at || user.confirmed_at)) {
    return { status: 403, error: 'EMAIL_NOT_CONFIRMED', message: 'Confirm your email address to use your free credits. Check your inbox for the confirmation link.' };
  }
  return null;
}

// ---- Free access period. Free accounts get FREE_TRIAL_DAYS (default 365) from the later of sign-up and the policy start date,
// so accounts created before this rule existed also get a full access year from the policy start. FREE_TRIAL_DAYS=0 turns the time limit off.
export const DEFAULT_TRIAL_POLICY_START = '2026-10-09';
// Only features that cost real provider money are blocked after the free access period. Exports and project access stay open
// so people can always open, save and download their own work.
export const TRIAL_GATED_KINDS = ['generation', 'voice', 'performance'];
export function freeTrialStart(createdAt, env = process.env) {
  const policyStart = Date.parse(env.FREE_TRIAL_POLICY_START || DEFAULT_TRIAL_POLICY_START) || Date.parse(DEFAULT_TRIAL_POLICY_START);
  const created = Date.parse(createdAt || '');
  return Number.isFinite(created) ? Math.max(created, policyStart) : policyStart;
}
export function freeTrialStatus({ createdAt, plan, now = Date.now(), env = process.env } = {}) {
  const days = envInt('FREE_TRIAL_DAYS', 365, env);
  if (plan !== 'free' || days === 0) return { applies: false, expired: false };
  const start = freeTrialStart(createdAt, env);
  const end = start + days * 86400000;
  return { applies: true, expired: now >= end, endsAt: new Date(end).toISOString(), daysLeft: Math.max(0, Math.ceil((end - now) / 86400000)) };
}

// ---- Feature / long-form limits (scene count & assembled duration). Per-clip stays 5–10s (provider).
// Sequence length = scenes × clip duration. Monthly credits still bound generation cost.
export function maxStoryboardScenes(plan, env = process.env) {
  const p = String(plan || 'free');
  if (p === 'studio') return envInt('STUDIO_MAX_STORYBOARD_SCENES', 200, env);
  if (p === 'creator') return envInt('CREATOR_MAX_STORYBOARD_SCENES', 80, env);
  return envInt('FREE_MAX_STORYBOARD_SCENES', 24, env);
}

export function maxExportScenes(plan, env = process.env) {
  const p = String(plan || 'free');
  if (p === 'studio') return envInt('STUDIO_MAX_EXPORT_SCENES', 200, env);
  if (p === 'creator') return envInt('CREATOR_MAX_EXPORT_SCENES', 80, env);
  return envInt('FREE_MAX_EXPORT_SCENES', 24, env);
}

/** Max assembled film length in seconds by plan (feature path for Studio). */
export function maxExportDurationSeconds(plan, env = process.env) {
  const p = String(plan || 'free');
  if (p === 'studio') return envInt('STUDIO_MAX_EXPORT_SECONDS', 90 * 60, env); // 90 min
  if (p === 'creator') return envInt('CREATOR_MAX_EXPORT_SECONDS', 45 * 60, env); // 45 min
  return envInt('FREE_MAX_EXPORT_SECONDS', 15 * 60, env); // 15 min
}
