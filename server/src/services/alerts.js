// Best-effort operator alerts (errors, content reports). Never throws and never delays a response.
const sent = new Map();

export function opsWebhookUrl(env = process.env) {
  return String(env.AVIRZO_OPS_ALERT_WEBHOOK_URL || env.AVIRZO_FINANCE_ALERT_WEBHOOK_URL || '').trim();
}

export async function notifyOps(kind, message, { env = process.env, fetchImpl = globalThis.fetch, now = Date.now() } = {}) {
  try {
    const url = opsWebhookUrl(env);
    if (!url || !/^https:\/\//i.test(url) || typeof fetchImpl !== 'function') return false;
    const key = `${kind}:${String(message).slice(0, 80)}`;
    if (now - (sent.get(key) || 0) < 5 * 60_000) return false;   // at most one identical alert per 5 minutes
    sent.set(key, now);
    if (sent.size > 500) sent.delete(sent.keys().next().value);
    const text = `[Avirzo ${env.NODE_ENV || 'dev'}] ${kind}: ${String(message).slice(0, 500)}`;
    await fetchImpl(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, content: text }), signal: AbortSignal.timeout(5000) });
    return true;
  } catch { return false; }
}

export function _resetAlertsForTest() { sent.clear(); }
