import crypto from 'node:crypto';
import express from 'express';
function expressRaw(){ return express.raw({type:'application/json'}); }

export function registerRoutes(app, ctx) {
  const { supabaseAdmin, requireCloudUser, RATE_LIMITS, getUserPlan, scaledLimit, freeTrialStatus, usageWindowStart } = ctx;
  const plans = { free:{id:'free',name:'Free'}, creator:{id:'creator',name:'Creator'}, studio:{id:'studio',name:'Studio'} };


  // ----- Stripe webhook -----
  const PLAN_FOR_PRICE = () => ({ [process.env.STRIPE_STUDIO_PRICE_ID || '__none_studio']: 'studio', [process.env.STRIPE_CREATOR_PRICE_ID || '__none_creator']: 'creator' });
  const ACTIVE_STATUSES = new Set(['active', 'trialing', 'past_due']);

  function verifyStripeSignature(raw, header, secret) {
    const parts = String(header || '').split(',').map(x => x.trim().split('='));
    const timestamp = Number((parts.find(x => x[0] === 't') || [])[1]);
    const candidates = parts.filter(x => x[0] === 'v1').map(x => x[1]).filter(Boolean); // Stripe sends several during secret rotation
    if (!timestamp || Math.abs(Date.now() / 1000 - timestamp) > 300) return 'expired';
    const expected = crypto.createHmac('sha256', secret).update(`${timestamp}.${raw.toString('utf8')}`).digest();
    const ok = candidates.some(sig => { try { const buf = Buffer.from(sig, 'hex'); return buf.length === expected.length && crypto.timingSafeEqual(buf, expected); } catch { return false; } });
    return ok ? 'ok' : 'invalid';
  }

  async function resolveUserId(obj) {
    const direct = obj.metadata?.user_id || obj.client_reference_id || null;
    if (direct) return direct;
    const customerId = typeof obj.customer === 'string' ? obj.customer : obj.customer?.id;
    if (!customerId) return null;
    const { data, error } = await supabaseAdmin.from('avirzo_billing_accounts').select('user_id').eq('provider_customer_id', customerId).maybeSingle();
    if (error) throw error;
    return data?.user_id || null;
  }

  // Apply a change only if this event is newer than the last one applied (Stripe does not guarantee ordering).
  async function applyAccount(userId, fields, eventCreated) {
    const { data: current, error: readError } = await supabaseAdmin.from('avirzo_billing_accounts').select('last_event_created').eq('user_id', userId).maybeSingle();
    if (readError) throw readError;
    if (current && Number(current.last_event_created || 0) > eventCreated) return false;
    const { error } = await supabaseAdmin.from('avirzo_billing_accounts').upsert({ user_id: userId, provider: 'stripe', ...fields, last_event_created: eventCreated, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    if (error) throw error;
    return true;
  }

  app.post('/api/billing/webhook', expressRaw(), async (req, res) => {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret || !req.headers['stripe-signature'] || !Buffer.isBuffer(req.body)) return res.status(400).json({ message: 'Stripe webhook is not configured.' });
    const check = verifyStripeSignature(req.body, req.headers['stripe-signature'], secret);
    if (check !== 'ok') return res.status(400).json({ message: check === 'expired' ? 'Expired Stripe webhook.' : 'Invalid Stripe signature.' });
    if (!supabaseAdmin) return res.status(503).json({ message: 'Billing storage is not configured.' });
    let event;
    try { event = JSON.parse(req.body.toString('utf8')); } catch { return res.status(400).json({ message: 'Malformed webhook body.' }); }
    try {
      const { data: seen, error: seenError } = await supabaseAdmin.from('avirzo_billing_events').select('event_id').eq('event_id', event.id).maybeSingle();
      if (seenError) throw seenError;
      if (seen) return res.json({ received: true, duplicate: true });
      const obj = event.data?.object || {};
      const created = Number(event.created || 0);
      const customerId = typeof obj.customer === 'string' ? obj.customer : obj.customer?.id || null;

      if (event.type === 'checkout.session.completed' && obj.mode === 'subscription') {
        // A checkout session carries no price/plan: only link the Stripe customer and subscription to the user.
        // The plan itself is set by the customer.subscription.* events (which include the price).
        const userId = await resolveUserId(obj);
        if (userId) {
          const { data: existing } = await supabaseAdmin.from('avirzo_billing_accounts').select('plan,status').eq('user_id', userId).maybeSingle();
          await applyAccount(userId, { plan: existing?.plan || 'free', status: existing?.status || 'active', provider_customer_id: customerId, provider_subscription_id: typeof obj.subscription === 'string' ? obj.subscription : null }, created);
        }
      } else if (['customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted'].includes(event.type)) {
        const userId = await resolveUserId(obj);
        if (!userId) throw new Error('Subscription event could not be matched to an Avirzo user yet; Stripe will retry.');
        const priceId = obj.items?.data?.[0]?.price?.id || '';
        const planFromPrice = PLAN_FOR_PRICE()[priceId];
        const deleted = event.type === 'customer.subscription.deleted';
        if (!planFromPrice && !deleted) {
          console.error(`Billing: unrecognized Stripe price "${priceId}" on ${event.id}; plan left unchanged.`);
        } else {
          const status = deleted ? 'canceled' : String(obj.status || 'active');
          const periodEnd = obj.current_period_end ?? obj.items?.data?.[0]?.current_period_end ?? null;
          await applyAccount(userId, {
            plan: !deleted && ACTIVE_STATUSES.has(status) ? planFromPrice : 'free',
            status,
            provider_customer_id: customerId,
            provider_subscription_id: obj.id || null,
            current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null
          }, created);
        }
      }
      const { error: recordError } = await supabaseAdmin.from('avirzo_billing_events').insert({ event_id: event.id, event_type: String(event.type || '').slice(0, 80) });
      if (recordError && recordError.code !== '23505') console.error('Could not record billing event:', recordError);
      res.json({ received: true });
    } catch (e) {
      console.error('Stripe webhook processing failed:', e);
      res.status(500).json({ message: 'Webhook processing failed.' }); // non-2xx makes Stripe retry
    }
  });

  app.get('/api/billing/summary', async (req,res) => {
    const user = await requireCloudUser(req,res); if (!user) return;
    try {
      if (!supabaseAdmin) return res.json({plan:plans.free,billing:{status:'local'},usage:{}});
      const {data:account} = await supabaseAdmin.from('avirzo_billing_accounts').select('plan,status,current_period_end,provider_customer_id').eq('user_id',user.id).maybeSingle();
      const plan = plans[await getUserPlan(user.id)] || plans.free;
      const effectivePlan = await getUserPlan(user.id);
      // Each kind has its own window (hourly, or yearly/free-month for generation), so look each one up with its own start.
      const starts = {}; for (const kind of Object.keys(RATE_LIMITS)) starts[kind] = usageWindowStart(kind, new Date(), { plan: effectivePlan, createdAt: user.created_at }).toISOString();
      const {data:counters,error} = await supabaseAdmin.from('avirzo_usage_counters').select('kind,count,window_start').eq('user_id',user.id).in('window_start',[...new Set(Object.values(starts))]);
      if(error) throw error;
      const usage = {}; for(const [kind,base] of Object.entries(RATE_LIMITS)) usage[kind] = {used:(counters||[]).find(x=>x.kind===kind && new Date(x.window_start).toISOString()===starts[kind])?.count||0,limit:scaledLimit(base,effectivePlan).max};
      const trial = freeTrialStatus({ createdAt: user.created_at, plan: effectivePlan });
      return res.json({plan,trial,billing:{status:account?.status||'active',current_period_end:account?.current_period_end||null,can_manage:Boolean(account?.provider_customer_id && process.env.STRIPE_SECRET_KEY)},usage});
    } catch(e) { res.status(500).json({message:e.message || 'Could not load billing summary.'}); }
  });

  // ----- Checkout & customer portal -----
  const publicBase = () => String(process.env.AVIRZO_PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || '').replace(/\/+$/, '');
  const stripeHeaders = () => ({ Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' });

  async function billingRateOk(user, res) {
    // Creating Stripe sessions is cheap but abusable: cap per user per hour (durable in production).
    const usage = await ctx.durableUsageLimit(user.id, 'billing', { windowMs: 60 * 60 * 1000, max: 20 });
    if (usage.infrastructureError) { res.status(503).json({ message: 'Billing is temporarily unavailable. Please try again shortly.' }); return false; }
    if (!usage.allowed) { res.set('Retry-After', String(usage.retryAfter)); res.status(429).json({ message: 'Too many billing requests. Please try again later.' }); return false; }
    return true;
  }

  app.post('/api/billing/checkout', async (req,res) => {
    const user = await requireCloudUser(req,res); if (!user) return;
    const plan = String(req.body?.plan || '');
    const priceId = plan === 'creator' ? process.env.STRIPE_CREATOR_PRICE_ID : plan === 'studio' ? process.env.STRIPE_STUDIO_PRICE_ID : null;
    const base = publicBase();
    if (!process.env.STRIPE_SECRET_KEY || !priceId || !base) return res.status(503).json({message:'Secure checkout is not configured yet. Add STRIPE_SECRET_KEY, the plan price IDs and AVIRZO_PUBLIC_URL to enable billing.'});
    if (!supabaseAdmin) return res.status(503).json({message:'Billing storage is not configured.'});
    if (!(await billingRateOk(user, res))) return;
    try {
      const { data: account, error: accountError } = await supabaseAdmin.from('avirzo_billing_accounts').select('status,provider_customer_id,provider_subscription_id').eq('user_id', user.id).maybeSingle();
      if (accountError) throw accountError;
      // Never start a second subscription for someone who already has one: plan changes go through the portal.
      if (account?.provider_subscription_id && ACTIVE_STATUSES.has(account.status)) {
        return res.status(409).json({ message: 'You already have an active subscription. Use "Manage subscription" to change or cancel it.' });
      }
      const params = new URLSearchParams(); params.set('mode','subscription'); params.set('line_items[0][price]',priceId); params.set('line_items[0][quantity]','1');
      params.set('success_url',`${base}/?billing=success`); params.set('cancel_url',`${base}/?billing=cancelled`);
      params.set('client_reference_id',user.id); params.set('metadata[user_id]',user.id); params.set('subscription_data[metadata][user_id]',user.id);
      if (account?.provider_customer_id) params.set('customer', account.provider_customer_id); else params.set('customer_email', user.email || '');
      const r = await fetch('https://api.stripe.com/v1/checkout/sessions',{method:'POST',headers:stripeHeaders(),body:params});
      const d=await r.json(); if(!r.ok || !d.url) return res.status(502).json({message:d.error?.message||'Stripe checkout could not be created.'});
      res.json({url:d.url});
    } catch(e) { console.error('Checkout failed:', e); res.status(502).json({message:'We could not start checkout right now. You have not been charged. Please try again.'}); }
  });

  // Stripe-hosted portal: update card, switch plan, view invoices, cancel. Requires the portal to be enabled in the Stripe dashboard.
  app.post('/api/billing/portal', async (req,res) => {
    const user = await requireCloudUser(req,res); if (!user) return;
    const base = publicBase();
    if (!process.env.STRIPE_SECRET_KEY || !base) return res.status(503).json({message:'The billing portal is not configured yet.'});
    if (!supabaseAdmin) return res.status(503).json({message:'Billing storage is not configured.'});
    if (!(await billingRateOk(user, res))) return;
    try {
      const { data: account, error } = await supabaseAdmin.from('avirzo_billing_accounts').select('provider_customer_id').eq('user_id', user.id).maybeSingle();
      if (error) throw error;
      if (!account?.provider_customer_id) return res.status(404).json({ message: 'No subscription was found on this account yet.' });
      const params = new URLSearchParams(); params.set('customer', account.provider_customer_id); params.set('return_url', `${base}/?billing=return`);
      const r = await fetch('https://api.stripe.com/v1/billing_portal/sessions',{method:'POST',headers:stripeHeaders(),body:params});
      const d = await r.json();
      if (!r.ok || !d.url) {
        console.error('Stripe portal error:', d.error?.message);
        const notConfigured = /configuration/i.test(d.error?.message || '');
        return res.status(502).json({ message: notConfigured ? 'The billing portal has not been enabled in Stripe yet. Turn it on under Stripe Settings > Billing > Customer portal.' : 'We could not open the billing portal right now. Please try again.' });
      }
      res.json({ url: d.url });
    } catch(e) { console.error('Portal failed:', e); res.status(502).json({ message: 'We could not open the billing portal right now. Please try again.' }); }
  });
}
