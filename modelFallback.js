// Model fallback for video generation submissions. Dependency-free so it can be unit-tested without the server deps.
//
// A fallback is only attempted when the *provider* looks unhealthy (network failure, timeout, 408/429/5xx). Validation,
// auth, content-policy and credit errors (400/401/402/403/404/422) would fail on any model, so they are returned as-is
// instead of silently burning a second request on a cheaper tier.

const TRANSIENT_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);
// Models that cannot run text-only requests.
const NEEDS_REFERENCE_IMAGE = new Set(['gen4_turbo']);

export function shouldFallback({ status, error } = {}) {
  if (error) return true; // fetch threw: DNS failure, reset, abort/timeout
  return TRANSIENT_STATUS.has(Number(status));
}

// GENERATION_FALLBACK_MODELS=gen4_turbo (comma separated, in order). "none" disables fallback. Max two fallbacks.
export function buildModelChain(primary, hasReferenceImage, env = process.env) {
  const raw = String(env.GENERATION_FALLBACK_MODELS ?? 'gen4_turbo').trim();
  const fallbacks = /^(none|off|false|0)$/i.test(raw) ? [] : raw.split(',').map(s => s.trim()).filter(Boolean);
  const chain = [primary];
  for (const m of fallbacks) {
    if (chain.includes(m)) continue;
    if (NEEDS_REFERENCE_IMAGE.has(m) && !hasReferenceImage) continue;
    chain.push(m);
    if (chain.length >= 3) break;
  }
  return chain;
}

// submit(model) must return { response, data } (response.ok / response.status) and may throw on network failure.
export async function submitWithFallback(chain, submit) {
  const attempts = [];
  let last = null;
  for (const model of chain) {
    let out;
    try {
      out = await submit(model);
    } catch (error) {
      attempts.push({ model, outcome: 'error', detail: String(error?.message || error).slice(0, 160) });
      last = { model, error };
      continue;
    }
    if (out?.response?.ok) { attempts.push({ model, outcome: 'ok' }); return { ...out, model, attempts }; }
    attempts.push({ model, outcome: `http_${out?.response?.status}` });
    last = { model, ...out };
    if (!shouldFallback({ status: out?.response?.status })) return { ...out, model, attempts };
  }
  if (last?.error && !last.response) { const err = last.error; err.attempts = attempts; throw err; }
  return { ...last, attempts };
}
