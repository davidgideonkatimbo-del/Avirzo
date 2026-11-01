import crypto from 'node:crypto';
import { createPesapal } from '../services/pesapal.js';
import { billingProvider, pesapalCurrency, offeredPesapalPlans, offeredPesapalPacks } from '../services/pesapalCatalog.js';
import { createRateLimiter } from '../services/security.js';
import { notifyOps } from '../services/alerts.js';

const TABLE = 'avirzo_pesapal_orders';
const STALE_MS = 120_000;
const ACTIVE = new Set(['active', 'trialing', 'past_due']);

/**
 * Verify a Pesapal payment server-side and grant it exactly once.
 * Never trusts the browser or the IPN body: the status always comes from GetTransactionStatus.
 * Returns { state: 'completed'|'pending'|'failed'|'reversed'|'mismatch'|'unknown', kind? }
 */
export function createSettlement({ supabaseAdmin, pesapal, addCredits, invalidatePlanCache, now = () => Date.now(), notify = notifyOps }) {
  const db = () => supabaseAdmin.from(TABLE);
  const iso = () => new Date(now()).toISOString();
  const patch = (ref, fields) => db().update({ ...fields, updated_at: iso() }).eq('merchant_reference', ref);

  async function grantPlan(order) {
    const ref = order.merchant_reference;
    const { data: acct, error } = await supabaseAdmin.from('avirzo_billing_accounts').select('plan,status,provider,provider_subscription_id,current_period_end').eq('user_id', order.user_id).maybeSingle();
    if (error) throw error;
    if (acct?.provider_subscription_id === ref) return;               // an earlier attempt already applied this payment
    const end = Date.parse(acct?.current_period_end || '');
    const renewing = acct && acct.plan === order.item_id && ACTIVE.has(acct.status) && Number.isFinite(end) && end > now();
    const start = renewing ? end : now();                              // renewing the same plan extends it; switching starts a fresh period
    const periodEnd = new Date(start + (Number(order.plan_days) || 30) * 86_400_000).toISOString();
    const { error: upErr } = await supabaseAdmin.from('avirzo_billing_accounts').upsert({
      user_id: order.user_id, plan: order.item_id, status: 'active', provider: 'pesapal', provider_subscription_id: ref, current_period_end: periodEnd, updated_at: iso()
    }, { onConflict: 'user_id' });
    if (upErr) throw upErr;
    invalidatePlanCache?.(order.user_id);
  }

  async function grant(order, trackingId) {
    if (order.kind === 'pack') {
      const r = await addCredits(order.user_id, Number(order.credits), `pesapal_pack:${order.merchant_reference}`, { order_tracking_id: trackingId, ref: order.merchant_reference });
      if (!r?.ok) throw new Error('Could not credit the wallet after payment.');
    } else await grantPlan(order);
  }

  async function reverse(order, st) {
    if (order.status === 'reversed') return { state: 'reversed', kind: order.kind };
    const { error } = await patch(order.merchant_reference, { status: 'reversed', provider_response: st });
    if (error) throw error;
    if (order.kind === 'plan') {
      const { data: acct } = await supabaseAdmin.from('avirzo_billing_accounts').select('provider_subscription_id').eq('user_id', order.user_id).maybeSingle();
      if (acct?.provider_subscription_id === order.merchant_reference) {
        await supabaseAdmin.from('avirzo_billing_accounts').upsert({ user_id: order.user_id, plan: 'free', status: 'canceled', provider: 'pesapal', current_period_end: iso(), updated_at: iso() }, { onConflict: 'user_id' });
        invalidatePlanCache?.(order.user_id);
      }
    }
    notify('pesapal_reversal', `${order.kind} ${order.item_id} ${order.merchant_reference}: review ${order.kind === 'pack' ? 'credits already spent' : 'access removed'}`);
    return { state: 'reversed', kind: order.kind };
  }

  async function settle({ ref, orderTrackingId, recheck = false }) {
    const { data: order, error } = await db().select('*').eq('merchant_reference', ref).maybeSingle();
    if (error) throw error;
    if (!order) return { state: 'unknown' };
    const kind = order.kind;
    if (order.order_tracking_id && orderTrackingId && order.order_tracking_id !== orderTrackingId) return { state: 'mismatch', kind };
    const trackingId = orderTrackingId || order.order_tracking_id;
    if (!trackingId) return { state: 'pending', kind };
    if (order.status === 'completed' && !recheck) return { state: 'completed', kind };
    if (order.status === 'reversed') return { state: 'reversed', kind };

    const st = await pesapal.getTransactionStatus(trackingId);
    if (String(st.merchant_reference || '') !== ref) return { state: 'mismatch', kind };
    const code = Number(st.status_code);
    if (code === 3) return reverse(order, st);
    if (order.status === 'completed') return { state: 'completed', kind };
    if (code === 2) {
      if (order.status !== 'processing') { const { error: e } = await patch(ref, { status: 'failed', provider_response: st }); if (e) throw e; }
      return { state: 'failed', kind };
    }
    if (code !== 1) return { state: 'pending', kind };

    const paid = Number(st.amount), expected = Number(order.amount);
    const currencyOk = String(st.currency || '').toUpperCase() === String(order.currency || '').toUpperCase();
    if (!Number.isFinite(paid) || !Number.isFinite(expected) || Math.abs(paid - expected) >= 0.005 || !currencyOk) {
      console.error('pesapal mismatch', { ref, paid: st.amount, currency: st.currency, expected: order.amount, expectedCurrency: order.currency });
      await patch(ref, { status: 'mismatch', provider_response: st });
      notify('pesapal_mismatch', `${ref}: paid ${st.amount} ${st.currency}, expected ${order.amount} ${order.currency}`);
      return { state: 'mismatch', kind };
    }

    // Claim before granting so a concurrent callback cannot grant twice. Reclaim a stale claim only after the earlier attempt had time to finish.
    let q = patch(ref, { status: 'processing', order_tracking_id: String(trackingId), provider_response: st });
    q = order.status === 'processing' ? q.eq('status', 'processing').lt('updated_at', new Date(now() - STALE_MS).toISOString()) : q.in('status', ['pending', 'failed']);
    const { data: claimed, error: claimErr } = await q.select();
    if (claimErr) throw claimErr;
    if (!claimed?.length) {
      const { data: latest } = await db().select('status').eq('merchant_reference', ref).maybeSingle();
      return { state: latest?.status === 'completed' ? 'completed' : 'pending', kind };
    }
    try {
      await grant(order, trackingId);
      const { error: finErr } = await patch(ref, { status: 'completed', completed_at: iso() }).eq('status', 'processing').select();
      if (finErr) throw finErr;
      return { state: 'completed', kind };
    } catch (e) {
      console.error('pesapal settlement failed', { ref, message: String(e?.message || e) });
      throw e;                                  // stays "processing": Pesapal retries the IPN and the claim is reclaimed after STALE_MS
    }
  }
  return { settle };
}

export function registerRoutes(app, ctx) {
  const { supabaseAdmin, requireCloudUser, addCredits } = ctx;
  const pesapal = createPesapal();
  const settlement = supabaseAdmin ? createSettlement({ supabaseAdmin, pesapal, addCredits, invalidatePlanCache: ctx.invalidatePlanCache }) : null;
  const publicBase = () => String(process.env.AVIRZO_PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || '').replace(/\/+$/, '');
  const ipLimiter = createRateLimiter({ windowMs: 60_000, max: 300 });

  ctx.pesapal = {
    active: () => billingProvider() === 'pesapal',
    configured: () => pesapal.configured(),
    plans: () => offeredPesapalPlans(),
    packs: () => offeredPesapalPacks(),
    async checkout(req, res, user, { kind, id }) {
      const item = kind === 'plan' ? offeredPesapalPlans().find(p => p.id === id) : offeredPesapalPacks().find(p => p.id === id);
      const base = publicBase();
      if (!pesapal.configured() || !base) return res.status(503).json({ message: 'Secure checkout is not configured yet. Add the Pesapal keys and AVIRZO_PUBLIC_URL to enable payments.' });
      if (!item) return res.status(503).json({ message: kind === 'plan' ? 'That plan is not available for purchase yet.' : 'That credit pack is not available for purchase yet.' });
      if (!supabaseAdmin) return res.status(503).json({ message: 'Billing storage is not configured.' });
      try {
        const { data: acct } = await supabaseAdmin.from('avirzo_billing_accounts').select('provider,status,provider_subscription_id').eq('user_id', user.id).maybeSingle();
        if (kind === 'plan' && acct?.provider === 'stripe' && acct.provider_subscription_id && ACTIVE.has(acct.status)) {
          return res.status(409).json({ message: 'You have an active card subscription. Cancel it first (Manage subscription) before paying with Pesapal.' });
        }
        const ref = `AV-${Date.now().toString(36)}-${crypto.randomBytes(5).toString('hex')}`;   // Pesapal: max 50 chars
        const currency = pesapalCurrency();
        const { error: insErr } = await supabaseAdmin.from(TABLE).insert({
          merchant_reference: ref, user_id: user.id, kind, item_id: item.id, amount: item.amount, currency,
          credits: item.credits, plan_days: kind === 'plan' ? item.days : null, status: 'pending'
        });
        if (insErr) throw insErr;
        let order;
        try {
          const ipnId = await pesapal.getIpnId(base);
          order = await pesapal.submitOrder({
            ref, amount: item.amount, currency, description: `Avirzo ${kind === 'plan' ? `${item.name} plan (${item.days} days)` : item.label}`,
            callbackUrl: `${base}/api/billing/pesapal/return`, cancelUrl: `${base}/?billing=cancelled`, ipnId,
            email: user.email, name: user.user_metadata?.full_name || user.user_metadata?.display_name || String(user.email || '').split('@')[0]
          });
        } catch (e) {
          console.error('pesapal checkout', e);
          await supabaseAdmin.from(TABLE).update({ status: 'failed', provider_response: { error: String(e.message || e) }, updated_at: new Date().toISOString() }).eq('merchant_reference', ref);
          return res.status(502).json({ message: 'We could not start checkout right now. You have not been charged. Please try again.' });
        }
        // Bind the provider tracking id before handing out the link, so verification can always match it to this order.
        const { data: bound, error: bindErr } = await supabaseAdmin.from(TABLE).update({ order_tracking_id: order.orderTrackingId, provider_response: order.raw, updated_at: new Date().toISOString() }).eq('merchant_reference', ref).eq('status', 'pending').select();
        if (bindErr || bound?.length !== 1) { console.error('pesapal bind failed', { ref, bindErr }); return res.status(502).json({ message: 'Checkout could not be safely linked. Please contact support before retrying.' }); }
        res.json({ url: order.redirectUrl, ref, provider: 'pesapal', ...(kind === 'plan' ? { days: item.days } : { credits: item.credits }) });
      } catch (e) {
        console.error('Pesapal checkout failed:', e);
        res.status(502).json({ message: 'We could not start checkout right now. You have not been charged. Please try again.' });
      }
    }
  };

  // Pesapal calls this when a payment changes status. The call has no signature, so only identifiers are used and the real status is always re-checked.
  async function ipn(req, res) {
    const src = { ...(req.body && typeof req.body === 'object' ? req.body : {}), ...(req.query || {}) };
    const orderTrackingId = String(src.OrderTrackingId || '').trim().slice(0, 80);
    const ref = String(src.OrderMerchantReference || '').trim().slice(0, 60);
    const type = String(src.OrderNotificationType || 'IPNCHANGE').slice(0, 30);
    const reply = status => res.status(200).json({ orderNotificationType: type, orderTrackingId, orderMerchantReference: ref, status });
    if (!orderTrackingId || !ref || !settlement) return reply(500);
    try {
      const r = await settlement.settle({ ref, orderTrackingId, recheck: true });
      void r; return reply(200);   // also for unknown refs: acknowledge so Pesapal stops retrying
    } catch (e) { console.error('pesapal ipn', e); return reply(500); }
  }
  app.get('/api/billing/pesapal/ipn', ipLimiter, ipn);
  app.post('/api/billing/pesapal/ipn', ipLimiter, ipn);

  // The customer's browser returns here after paying. We verify with Pesapal, then send them back to the app.
  app.get('/api/billing/pesapal/return', ipLimiter, async (req, res) => {
    const ref = String(req.query.OrderMerchantReference || '').trim().slice(0, 60);
    const trackingId = String(req.query.OrderTrackingId || '').trim().slice(0, 80);
    let result = { state: 'pending' };
    try { if (ref && trackingId && settlement) result = await settlement.settle({ ref, orderTrackingId: trackingId }); } catch (e) { console.error('pesapal return', e); }
    const q = result.state === 'completed' ? (result.kind === 'pack' ? 'pesapal_credits' : 'pesapal_success') : result.state === 'failed' || result.state === 'reversed' ? 'pesapal_failed' : 'pesapal_pending';
    res.redirect(302, `${publicBase()}/?billing=${q}${q === 'pesapal_pending' && ref ? `&ref=${encodeURIComponent(ref)}` : ''}`);
  });

  // The app polls this after a "pending" return (mobile-money approvals can take a minute).
  app.post('/api/billing/pesapal/verify', ipLimiter, async (req, res) => {
    const user = await requireCloudUser(req, res); if (!user) return;
    try {
      const ref = String(req.body?.ref || '').trim().slice(0, 60);
      const { data: order } = await supabaseAdmin.from(TABLE).select('merchant_reference,order_tracking_id').eq('merchant_reference', ref).eq('user_id', user.id).maybeSingle();
      if (!order) return res.status(404).json({ message: 'Payment not found.' });
      const r = await settlement.settle({ ref, orderTrackingId: order.order_tracking_id });
      res.json({ state: r.state, kind: r.kind || null });
    } catch (e) { console.error('pesapal verify', e); res.status(502).json({ message: 'Could not check the payment yet. Please try again shortly.' }); }
  });
}
