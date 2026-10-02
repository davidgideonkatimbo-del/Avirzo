import crypto from 'node:crypto';
import express from 'express';
function expressRaw(){ return express.raw({type:'application/json'}); }

export function registerRoutes(app, ctx) {
  const { supabaseAdmin, requireCloudUser } = ctx;
  const limits = { video_generation: 20, character_performance: 10, voice: 20, film_export: 5 };
  const plans = { free:{id:'free',name:'Free'}, creator:{id:'creator',name:'Creator'}, studio:{id:'studio',name:'Studio'} };


  app.post('/api/billing/webhook', expressRaw(), async (req,res) => {
    try {
      const signature = req.headers['stripe-signature'];
      const secret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!secret || !signature) return res.status(400).json({message:'Stripe webhook is not configured.'});
      const raw = req.body;
      const match = String(signature).split(',').reduce((a,x)=>{const [k,v]=x.split('=');a[k]=v;return a;},{});
      const timestamp = Number(match.t);
      if (!timestamp || Math.abs(Date.now()/1000-timestamp)>300) return res.status(400).json({message:'Expired Stripe webhook.'});
      const signed = `${timestamp}.${raw.toString('utf8')}`;
      const expected = crypto.createHmac('sha256',secret).update(signed).digest('hex');
      if (!crypto.timingSafeEqual(Buffer.from(expected),Buffer.from(match.v1||''))) return res.status(400).json({message:'Invalid Stripe signature.'});
      const event=JSON.parse(raw.toString('utf8')); const obj=event.data?.object||{};
      const customerId=obj.customer||obj.customer_id||null; const subscriptionId=obj.id||null;
      if (['checkout.session.completed','customer.subscription.created','customer.subscription.updated','customer.subscription.deleted'].includes(event.type) && supabaseAdmin) {
        let userId=obj.client_reference_id||null;
        if(!userId && customerId){ const {data:a}=await supabaseAdmin.from('avirzo_billing_accounts').select('user_id').eq('provider_customer_id',customerId).maybeSingle(); userId=a?.user_id||null; }
        if(userId){ const priceId=obj.items?.data?.[0]?.price?.id||obj.line_items?.data?.[0]?.price?.id||''; const plan=priceId===process.env.STRIPE_STUDIO_PRICE_ID?'studio':priceId===process.env.STRIPE_CREATOR_PRICE_ID?'creator':'free'; const status=event.type==='customer.subscription.deleted'?'canceled':(obj.status||'active'); const period=obj.current_period_end?new Date(obj.current_period_end*1000).toISOString():null; await supabaseAdmin.from('avirzo_billing_accounts').upsert({user_id:userId,plan,status,provider:'stripe',provider_customer_id:customerId,provider_subscription_id:subscriptionId,current_period_end:period,updated_at:new Date().toISOString()},{onConflict:'user_id'}); }
      }
      res.json({received:true});
    } catch(e){res.status(400).json({message:e.message||'Webhook processing failed.'});}
  });

  app.get('/api/billing/summary', async (req,res) => {
    const user = await requireCloudUser(req,res); if (!user) return;
    try {
      if (!supabaseAdmin) return res.json({plan:plans.free,billing:{status:'local'},usage:{}});
      const {data:account} = await supabaseAdmin.from('avirzo_billing_accounts').select('plan,status,current_period_end').eq('user_id',user.id).maybeSingle();
      const plan = plans[account?.plan] || plans.free;
      const now = new Date(); now.setUTCMinutes(0,0,0); const start = now.toISOString();
      const {data:counters,error} = await supabaseAdmin.from('avirzo_usage_counters').select('kind,count').eq('user_id',user.id).eq('window_start',start);
      if(error) throw error;
      const usage = {}; for(const [kind,limit] of Object.entries(limits)) usage[kind] = {used:(counters||[]).find(x=>x.kind===kind)?.count||0,limit};
      return res.json({plan,billing:{status:account?.status||'active',current_period_end:account?.current_period_end||null},usage});
    } catch(e) { res.status(500).json({message:e.message || 'Could not load billing summary.'}); }
  });

  app.post('/api/billing/checkout', async (req,res) => {
    const user = await requireCloudUser(req,res); if (!user) return;
    const plan = String(req.body?.plan || '');
    const priceId = plan === 'creator' ? process.env.STRIPE_CREATOR_PRICE_ID : plan === 'studio' ? process.env.STRIPE_STUDIO_PRICE_ID : null;
    if (!process.env.STRIPE_SECRET_KEY || !priceId) return res.status(503).json({message:'Secure checkout is not configured yet. Add STRIPE_SECRET_KEY and the plan price IDs to enable billing.'});
    try {
      const params = new URLSearchParams(); params.set('mode','subscription'); params.set('line_items[0][price]',priceId); params.set('line_items[0][quantity]','1');
      params.set('success_url',`${process.env.AVIRZO_PUBLIC_URL || process.env.RENDER_EXTERNAL_URL}/?billing=success`); params.set('cancel_url',`${process.env.AVIRZO_PUBLIC_URL || process.env.RENDER_EXTERNAL_URL}/?billing=cancelled`); params.set('client_reference_id',user.id); params.set('customer_email',user.email || '');
      const r = await fetch('https://api.stripe.com/v1/checkout/sessions',{method:'POST',headers:{Authorization:`Bearer ${process.env.STRIPE_SECRET_KEY}`,'Content-Type':'application/x-www-form-urlencoded'},body:params});
      const d=await r.json(); if(!r.ok) return res.status(502).json({message:d.error?.message||'Stripe checkout could not be created.'});
      res.json({url:d.url});
    } catch(e) { res.status(502).json({message:e.message || 'Could not create checkout.'}); }
  });
}
