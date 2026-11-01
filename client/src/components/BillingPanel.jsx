import React, { useEffect, useState } from 'react';

const PLANS = [
  { id: 'free', name: 'Free', price: '$0', features: '12-month free access · 2 scene generations · projects & templates stay after the free period' },
  { id: 'creator', name: 'Creator', price: '$19/mo', features: '600 credits every month · private cloud archive · platform tools' },
  { id: 'studio', name: 'Studio', price: '$59/mo', features: '1,800 credits every month · collaboration · long-form tools' }
];

export function BillingPanel({ visible, apiFetch, authUser }) {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  async function refresh() {
    if (!authUser) return;
    try {
      const r = await apiFetch('/api/billing/summary');
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || 'Could not load billing.');
      setData(d);
    } catch (e) {
      setStatus(e.message);
    }
  }
  useEffect(() => { if (visible) refresh(); }, [visible, authUser]);

  // Coming back from Pesapal: show the result, and keep checking while a mobile-money payment is still being approved.
  useEffect(() => {
    if (!visible || !authUser) return undefined;
    const params = new URLSearchParams(window.location.search);
    const result = params.get('billing');
    if (!result) return undefined;
    const ref = params.get('ref');
    const clean = () => { const u = new URL(window.location.href); u.searchParams.delete('billing'); u.searchParams.delete('ref'); window.history.replaceState({}, '', u.toString()); };
    if (result === 'pesapal_success' || result === 'pesapal_credits') { setStatus(result === 'pesapal_success' ? 'Payment received. Your plan is active.' : 'Payment received. Your credits have been added.'); refresh(); clean(); return undefined; }
    if (result === 'pesapal_failed') { setStatus('The payment did not go through. You have not been charged.'); clean(); return undefined; }
    if (result === 'cancelled') { setStatus('Checkout cancelled. You have not been charged.'); clean(); return undefined; }
    if (result !== 'pesapal_pending' || !ref) { clean(); return undefined; }
    let stopped = false; let tries = 0;
    setStatus('Waiting for your payment to be confirmed… approve the prompt on your phone if you have not yet.');
    const tick = async () => {
      if (stopped) return;
      tries += 1;
      try {
        const r = await apiFetch('/api/billing/pesapal/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ref }) });
        const d = await r.json();
        if (d.state === 'completed') { setStatus(d.kind === 'pack' ? 'Payment received. Your credits have been added.' : 'Payment received. Your plan is active.'); refresh(); clean(); return; }
        if (d.state === 'failed' || d.state === 'reversed') { setStatus('The payment did not go through. You have not been charged.'); clean(); return; }
      } catch { /* keep trying */ }
      if (tries >= 12) { setStatus('We have not received confirmation yet. If money left your account, it will be applied automatically once Pesapal confirms it.'); clean(); return; }
      setTimeout(tick, 5000);
    };
    tick();
    return () => { stopped = true; };
  }, [visible, authUser]);

  async function choose(plan) {
    if (plan === 'free') return;
    setLoading(true);
    setStatus('Preparing secure checkout…');
    try {
      const r = await apiFetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan })
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || 'Checkout is not configured yet.');
      if (d.url) window.location.href = d.url;
      else setStatus(d.message || 'Checkout ready.');
    } catch (e) {
      setStatus(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function buyCredits(packId) {
    setLoading(true);
    setStatus('Opening optional top-up checkout…');
    try {
      const r = await apiFetch('/api/billing/credits/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packId })
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || 'Top-up packs are not configured.');
      if (d.url) window.location.href = d.url;
      else setStatus(d.message || 'Checkout ready.');
    } catch (e) {
      setStatus(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function manage() {
    setLoading(true);
    setStatus('Opening the secure billing portal…');
    try {
      const r = await apiFetch('/api/billing/portal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || 'The billing portal is not available right now.');
      window.location.href = d.url;
    } catch (e) {
      setStatus(e.message || 'The billing portal is not available right now.');
      setLoading(false);
    }
  }

  if (!visible) return null;
  if (!authUser) {
    return (
      <section className="bible-panel">
        <div className="heritage-callout">Sign in to view billing, usage and monthly production credits.</div>
      </section>
    );
  }

  const usage = data?.usage || {};
  const planId = data?.plan?.id || 'free';
  const credits = data?.credits || { balance: 0, enabled: false, packs: [], monthlyIncluded: 0 };
  const prepaid = Boolean(data?.billing?.prepaid);
  const pricing = data?.billing?.pricing || {};
  const priceLabel = p => (prepaid && pricing[p.id] ? `${pricing[p.id].label} / ${pricing[p.id].days} days` : p.price);
  const planOnPaid = prepaid && data?.billing?.status === 'active' && planId !== 'free';

  return (
    <section className="bible-panel billing-panel">
      <div className="section-head">
        <div>
          <div className="eyebrow">ACCOUNT · BILLING & USAGE</div>
          <h2>{prepaid ? 'Pay once. Create for 30 days.' : 'Subscription includes your production budget.'}</h2>
          <p>
            {prepaid && <>Pay with <strong>mobile money or card</strong> through Pesapal. Plans are prepaid and never renew by themselves.{' '}</>}
            Each plan comes with a <strong>monthly credit allowance</strong> for video, voice and performance.
            Video credit costs vary by the model and clip length; voice and performance share the same monthly budget. Upgrade for a larger allowance.
          </p>
        </div>
      </div>

      <div className="heritage-callout free-tier-value" role="note">
        <strong>What free always keeps.</strong> After free generation access ends, you can still open projects, edit story and research,
        use templates, and export finished work. After the 2 free scenes are used, new generation requires a paid plan or purchased credits.
      </div>

      <div className="card-inset credit-wallet">
        <div className="eyebrow">MONTHLY PRODUCTION CREDITS</div>
        <h3>Included in your plan</h3>
        <p className="muted" style={{ margin: '6px 0 12px', fontSize: 13 }}>
          {credits.note || 'Paid-plan credits refresh each calendar month. Free accounts get 2 scene generations total and no recurring monthly credits.'}
        </p>
        <div className="passport-grid" style={{ marginBottom: 12 }}>
          <div>
            <small>BALANCE</small>
            <strong>{Number(credits.balance) || 0}</strong>
          </div>
          <div>
            <small>PLAN / MONTH</small>
            <strong>{Number(credits.monthlyIncluded) || 0}{credits.month ? ` · ${credits.month}` : ''}</strong>
          </div>
          <div>
            <small>MODEL</small>
            <strong>{credits.enabled ? 'Capped monthly' : 'Quotas only'}</strong>
          </div>
        </div>
        {Array.isArray(credits.packs) && credits.packs.length > 0 && (
          <div>
            <p className="muted" style={{ fontSize: 12, marginBottom: 8 }}>Optional top-up if you need more before next month:</p>
            <div className="plan-grid">
              {credits.packs.map((p) => (
                <article className="plan-card" key={p.id}>
                  <div className="eyebrow">TOP-UP</div>
                  <h3>{p.label}</h3>
                  <strong>{p.credits} credits</strong>
                  <p>{p.priceHint || 'One-time'}</p>
                  <button type="button" className="generate" onClick={() => buyCredits(p.id)} disabled={loading}>
                    Buy top-up
                  </button>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="usage-grid">
        {Object.entries(usage).map(([kind, x]) => (
          <div className="card-inset" key={kind}>
            <span className="export-option-label">{kind.replaceAll('_', ' ')}</span>
            <strong>{x.used ?? 0}</strong>
            <small>
              {x.limit == null
                ? 'Unlimited / provider-limited'
                : `${x.limit} included · ${Math.max(0, x.limit - (x.used || 0))} remaining`}
            </small>
            <div className="usage-bar">
              <span style={{ width: `${x.limit ? Math.min(100, ((x.used || 0) / x.limit) * 100) : 0}%` }} />
            </div>
          </div>
        ))}
      </div>

      <div className="plan-grid">
        {PLANS.map((p) => (
          <article className={`plan-card ${planId === p.id ? 'active' : ''}`} key={p.id}>
            <div className="eyebrow">{p.id === 'studio' ? 'TEAM' : 'PLAN'}</div>
            <h3>{p.name}</h3>
            <strong>{priceLabel(p)}</strong>
            <p>{p.features}</p>
            <button
              type="button"
              className={planId === p.id && !prepaid ? '' : 'generate'}
              onClick={() => choose(p.id)}
              disabled={loading || (planId === p.id && !prepaid)}
            >
              {prepaid ? (planId === p.id ? `Renew ${p.name} (+30 days)` : `Pay for ${p.name}`) : planId === p.id ? 'Current plan' : `Choose ${p.name}`}
            </button>
          </article>
        ))}
      </div>

      {data?.trial?.applies && (
        <div className="heritage-callout" role="status">
          {data.trial.expired
            ? `Your free access period ended on ${new Date(data.trial.endsAt).toLocaleDateString()}. Choose Creator or Studio for a monthly production credit allowance.`
            : `Your free access period: ${data.trial.daysLeft} day${data.trial.daysLeft === 1 ? '' : 's'} left. Free includes 2 scene generations total. After those scenes, a paid plan or purchased credits are required.`}
        </div>
      )}
      {data?.billing?.status && (
        <div className="heritage-callout">
          Billing status: <strong>{data.billing.status}</strong>
          {data.billing.current_period_end ? ` · ${prepaid ? (data.billing.status === 'expired' ? 'ended' : 'paid until') : 'period ends'} ${new Date(data.billing.current_period_end).toLocaleDateString()}` : ''}
          {planOnPaid ? ' · Paying for the same plan again adds 30 days. Switching plans starts a new 30-day period.' : ''}
        </div>
      )}
      {data?.billing?.can_manage && (
        <div className="heritage-callout">
          Change plan, update your card, download invoices or cancel anytime.{' '}
          <button type="button" className="generate" onClick={manage} disabled={loading}>
            {loading ? 'Opening…' : 'Manage subscription'}
          </button>
        </div>
      )}
      {status && (
        <div className="heritage-callout" role="status" aria-live="polite">
          💳 {status}
        </div>
      )}
    </section>
  );
}
