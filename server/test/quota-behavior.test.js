import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { rateLimit, scaledLimit, PLAN_LIMIT_MULTIPLIER } from '../src/services/quota.js';

const RATE_LIMITS = {
  generation: { windowMs: 60 * 60 * 1000, max: 20 },
  export: { windowMs: 60 * 60 * 1000, max: 5 }
};

const freshKey = label => `test:${label}:${Date.now()}:${Math.random()}`;

test('plan quota scaling stays bounded and predictable', () => {
  assert.deepEqual(PLAN_LIMIT_MULTIPLIER, { free: 1, creator: 3, studio: 10 });
  assert.equal(scaledLimit(RATE_LIMITS.generation, 'free').max, 20);
  assert.equal(scaledLimit(RATE_LIMITS.generation, 'creator').max, 60);
  assert.equal(scaledLimit(RATE_LIMITS.generation, 'studio').max, 200);
  assert.equal(scaledLimit(RATE_LIMITS.export, 'free').max, 5);
  assert.equal(scaledLimit(RATE_LIMITS.export, 'creator').max, 15);
  assert.equal(scaledLimit(RATE_LIMITS.export, 'studio').max, 50);
});

test('unknown plans fail safely to the free quota', () => {
  assert.equal(scaledLimit(RATE_LIMITS.generation, 'unknown').max, RATE_LIMITS.generation.max);
  assert.equal(scaledLimit(RATE_LIMITS.export, '').max, RATE_LIMITS.export.max);
});

test('rate limiter allows exactly the configured number of requests', () => {
  const key = freshKey('exact-limit');
  const limit = { windowMs: 60 * 60 * 1000, max: 3 };
  assert.equal(rateLimit(key, limit).allowed, true);
  assert.equal(rateLimit(key, limit).allowed, true);
  assert.equal(rateLimit(key, limit).allowed, true);
  const blocked = rateLimit(key, limit);
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfter > 0);
});

test('rate limiter resets after the quota window', () => {
  const key = freshKey('window-reset');
  const limit = { windowMs: 1000, max: 1 };
  let now = 1_000_000;
  assert.equal(rateLimit(key, limit, now).allowed, true);
  assert.equal(rateLimit(key, limit, now).allowed, false);
  now += 1001;
  assert.equal(rateLimit(key, limit, now).allowed, true);
});

test('provider generation checks continuity before consuming quota', () => {
  const route = fs.readFileSync(new URL('../src/routes/generation.js', import.meta.url), 'utf8');
  const guardAt = route.indexOf('const guard = sceneContinuityGuard');
  const quotaAt = route.indexOf("requireProviderUser(req, res, 'generation')");
  assert.ok(guardAt >= 0);
  assert.ok(quotaAt > guardAt);
});

test('production usage protection fails closed when the durable counter is unavailable', () => {
  const core = fs.readFileSync(new URL('../src/services/core.js', import.meta.url), 'utf8');
  assert.match(core, /if \(IS_PRODUCTION\) return \{ allowed: false, retryAfter: 60, infrastructureError: true \}/);
  assert.match(core, /USAGE_LIMIT_UNAVAILABLE/);
});
