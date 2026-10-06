// Pure quota primitives. Kept dependency-free so behavioral tests can run without provider packages.
export const PLAN_LIMIT_MULTIPLIER = Object.freeze({ free: 1, creator: 3, studio: 10 });

export function scaledLimit(limit, plan) {
  return { ...limit, max: Math.max(1, Math.round(limit.max * (PLAN_LIMIT_MULTIPLIER[plan] || 1))) };
}

const buckets = new Map();
export function rateLimit(key, limit, now = Date.now()) {
  const bucket = buckets.get(key);
  if (!bucket || now - bucket.startedAt >= limit.windowMs) {
    buckets.set(key, { startedAt: now, count: 1 });
    return { allowed: true };
  }
  if (bucket.count >= limit.max) {
    return { allowed: false, retryAfter: Math.ceil((limit.windowMs - (now - bucket.startedAt)) / 1000) };
  }
  bucket.count += 1;
  return { allowed: true };
}

export function resetQuotaBucketsForTests() { buckets.clear(); }
