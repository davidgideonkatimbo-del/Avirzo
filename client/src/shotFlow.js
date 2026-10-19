/**
 * Pure rules for rendering shots, kept out of the React component so they can be tested.
 *
 * - An error is `fatal` when every later shot would fail too (out of credits, free month over, signed out):
 *   the batch stops and the creator is told why.
 * - An error is `retryable` when the provider simply could not finish (a failed task, a 5xx, a busy provider):
 *   the shot is retried once automatically. Credits for the failed try are refunded by the server.
 * - Everything else (for example a prompt the provider's safety filter refused) is a normal failure for that
 *   one shot: the batch moves on to the next shot and the creator can reword and retry.
 */

export const MODERATION_HINT = /moderat|policy|safety|violat|not allowed|blocked|public figure|content/i;

export function shotError(message, { retryable = false, fatal = false } = {}) {
  const e = new Error(message);
  e.retryable = retryable;
  e.fatal = fatal;
  return e;
}

/** Turn a failed POST /api/generate answer into an error with the right flags. */
export function classifyGenerateFailure(status, data = {}) {
  const message = String(data?.message || '');
  if (data?.error === 'INSUFFICIENT_CREDITS' || (status === 402 && data?.error !== 'TRIAL_ENDED')) {
    return shotError(message || 'Not enough production credits this month. Upgrade your plan in Billing for a higher monthly allowance.', { fatal: true });
  }
  if (data?.error === 'TRIAL_ENDED') {
    return shotError(message || 'Your free month has ended. Choose Creator or Studio in Billing.', { fatal: true });
  }
  if (status === 401 || status === 403) {
    return shotError(message || 'Please sign in again to generate.', { fatal: true });
  }
  const transient = [408, 409, 425, 429, 500, 502, 503, 504].includes(status);
  return shotError(message || 'Generation request failed.', { retryable: transient && !MODERATION_HINT.test(message) });
}

/** Run `attempt` up to `attempts` times, retrying only errors flagged `retryable`. */
export async function runWithRetry(attempt, { attempts = 2, onRetry = () => {}, wait = ms => new Promise(r => setTimeout(r, ms)), delayMs = 4000 } = {}) {
  let lastError = null;
  for (let n = 1; n <= attempts; n++) {
    try {
      return await attempt(n);
    } catch (e) {
      lastError = e;
      if (!e?.retryable || e?.fatal || n === attempts) throw e;
      onRetry(e, n);
      await wait(delayMs);
    }
  }
  throw lastError;
}

/** Message shown to the creator after a shot fails. */
export function friendlyFailure(e) {
  const msg = String(e?.message || 'Generation failed.');
  if (e?.fatal) return msg;
  if (MODERATION_HINT.test(msg)) {
    return `${msg} The video provider may have blocked this shot's text. Reword it to be less violent or graphic, then press Generate again. Credits for a failed clip are returned automatically.`;
  }
  return `${msg} Credits for a failed clip are returned automatically; press Generate again to retry.`;
}

/** A new key per shot attempt. The server uses it so a repeated request never starts (or charges) a second clip. */
export function newIdempotencyKey(sceneNumber = 0) {
  const rand = (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
  return `shot-${sceneNumber}-${rand}`;
}

/** True for a dropped connection (fetch rejected before any answer): safe to resend with the same key. */
export function isNetworkError(e) {
  return e instanceof TypeError || /failed to fetch|network|load failed/i.test(String(e?.message || ''));
}
