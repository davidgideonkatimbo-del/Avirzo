// Pesapal API 3.0 client (cards + mobile money). Sandbox is the default so a missing setting can never take live payments.
export function createPesapal({ env = process.env, fetchImpl = globalThis.fetch } = {}) {
  const live = () => String(env.PESAPAL_ENV || 'sandbox').toLowerCase() === 'live';
  const base = () => (live() ? 'https://pay.pesapal.com/v3/api' : 'https://cybqa.pesapal.com/pesapalv3/api');
  const configured = () => Boolean(env.PESAPAL_CONSUMER_KEY && env.PESAPAL_CONSUMER_SECRET);
  let tokenCache = { token: null, exp: 0, base: '' };
  let ipnCache = { key: '', id: '' };

  async function call(path, init = {}) {
    const r = await fetchImpl(`${base()}${path}`, { ...init, signal: AbortSignal.timeout(20000) });
    const data = await r.json().catch(() => null);
    return { ok: r.ok, status: r.status, data };
  }

  async function getToken() {
    if (tokenCache.token && tokenCache.base === base() && Date.now() < tokenCache.exp - 30000) return tokenCache.token;
    if (!configured()) throw new Error('Pesapal credentials are not configured');
    const res = await call('/Auth/RequestToken', {
      method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ consumer_key: env.PESAPAL_CONSUMER_KEY, consumer_secret: env.PESAPAL_CONSUMER_SECRET })
    });
    if (!res.ok || !res.data?.token) throw new Error(`Pesapal auth failed: ${res.data?.error?.message || res.data?.message || res.status}`);
    let exp = res.data.expiryDate ? new Date(res.data.expiryDate).getTime() : NaN;
    if (!Number.isFinite(exp)) exp = Date.now() + 4 * 60000;
    tokenCache = { token: res.data.token, exp: Math.min(exp, Date.now() + 4.5 * 60000), base: base() };
    return tokenCache.token;
  }

  async function authed(path, init = {}) {
    const token = await getToken();
    return call(path, { ...init, headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init.headers || {}) } });
  }

  // Pesapal needs a registered IPN id (notification_id) for every order: use PESAPAL_IPN_ID, or find/register one.
  async function getIpnId(appUrl) {
    if (env.PESAPAL_IPN_ID) return env.PESAPAL_IPN_ID;
    const url = `${String(appUrl).replace(/\/+$/, '')}/api/billing/pesapal/ipn`;
    const key = `${base()}|${url}`;
    if (ipnCache.key === key && ipnCache.id) return ipnCache.id;
    const norm = s => String(s || '').trim().replace(/\/$/, '').toLowerCase();
    let id = null;
    const list = await authed('/URLSetup/GetIpnList');
    if (list.ok && Array.isArray(list.data)) id = list.data.find(x => norm(x.url) === norm(url) && x.ipn_id)?.ipn_id || null;
    if (!id) {
      const reg = await authed('/URLSetup/RegisterIPN', { method: 'POST', body: JSON.stringify({ url, ipn_notification_type: 'GET' }) });
      if (!reg.ok || !reg.data?.ipn_id) throw new Error(`Pesapal IPN registration failed: ${reg.data?.error?.message || reg.status}`);
      id = reg.data.ipn_id;
    }
    ipnCache = { key, id };
    return id;
  }

  async function submitOrder({ ref, amount, currency, description, callbackUrl, cancelUrl, ipnId, email, name }) {
    const first = String(name || '').replace(/[^\p{L}\p{N} .'-]/gu, '').trim().slice(0, 40);
    const res = await authed('/Transactions/SubmitOrderRequest', {
      method: 'POST',
      body: JSON.stringify({
        id: ref, currency, amount: Number(Number(amount).toFixed(2)), description: String(description).slice(0, 100),
        callback_url: callbackUrl, cancellation_url: cancelUrl, notification_id: ipnId,
        billing_address: { email_address: email, first_name: first || undefined }
      })
    });
    const d = res.data || {};
    if (!res.ok || !d.order_tracking_id || !d.redirect_url) throw new Error(`Pesapal order failed: ${d?.error?.message || d?.message || res.status}`);
    return { orderTrackingId: d.order_tracking_id, redirectUrl: d.redirect_url, raw: d };
  }

  async function getTransactionStatus(orderTrackingId) {
    const res = await authed(`/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(orderTrackingId)}`);
    if (!res.ok || !res.data) throw new Error(`Pesapal status lookup failed: ${res.status}`);
    return res.data;
  }

  return { configured, base, live, getToken, getIpnId, submitOrder, getTransactionStatus };
}
