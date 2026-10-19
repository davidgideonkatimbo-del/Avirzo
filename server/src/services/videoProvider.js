// Video provider adapter. The routes talk to this interface (submit), not to Runway directly, so a second
// provider or a fallback can be added here without touching the generate route.
// Dependency-free so it can be unit-tested with a fake fetch.

export const SAFETY_REFUSAL_RE = /moderat|policy|safety|violat|not allowed|blocked|public figure/i;

export function providerErrorMessage(data, fallback = 'The video provider rejected the request.') {
  if (!data || typeof data !== 'object') return fallback;
  return (
    data.message ||
    data.error ||
    data.failure ||
    data.detail ||
    (Array.isArray(data.errors) && data.errors[0]?.message) ||
    fallback
  );
}

export function createRunwayProvider({ apiBase, headers, pickModel, fetchImpl = globalThis.fetch, timeoutMs = 45000 }) {
  async function post({ promptText, ratio, seconds, ref, plan }) {
    const body = { model: pickModel(plan, Boolean(ref)), promptText: String(promptText).slice(0, 1000), ratio, duration: seconds };
    if (ref) body.promptImage = ref;
    // A provider that never answers must not leave the shot (and the creator's credits) hanging.
    const response = await fetchImpl(`${apiBase}/image_to_video`, {
      method: 'POST', headers: headers(), body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs)
    });
    return { response, data: await response.json().catch(() => ({})) };
  }

  /** Start a clip. A bad reference image (not a safety refusal) is retried once as text-only. */
  async function submit(input) {
    let { response, data } = await post(input);
    let usedReference = Boolean(input.ref);
    if (!response.ok && input.ref && [400, 422].includes(response.status)
        && !SAFETY_REFUSAL_RE.test(providerErrorMessage(data, ''))) {
      ({ response, data } = await post({ ...input, ref: '' }));
      usedReference = false;
    }
    return { response, data, usedReference };
  }

  return { submit };
}
