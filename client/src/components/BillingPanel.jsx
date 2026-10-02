import React, { useEffect, useState } from 'react';

const PLANS = [
  { id: 'free', name: 'Free', price: '$0', features: 'Starter projects · limited generation · community workflow' },
  { id: 'creator', name: 'Creator', price: '$19/mo', features: 'Higher generation limits · private cloud archive · premium voices' },
  { id: 'studio', name: 'Studio', price: '$59/mo', features: 'Team seats · collaboration · higher export limits · priority queue' }
];

export function BillingPanel({ visible, apiFetch, authUser }) {
  const [data, setData] = useState(null); const [status, setStatus] = useState(''); const [loading, setLoading] = useState(false);
  async function refresh() { if (!authUser) return; try { const r = await apiFetch('/api/billing/summary'); const d = await r.json(); if (!r.ok) throw new Error(d.message || 'Could not load billing.'); setData(d); } catch (e) { setStatus(e.message); } }
  useEffect(() => { if (visible) refresh(); }, [visible, authUser]);
  async function choose(plan) {
    if (plan === 'free') return;
    setLoading(true); setStatus('Preparing secure checkout…');
    try { const r = await apiFetch('/api/billing/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan }) }); const d = await r.json(); if (!r.ok) throw new Error(d.message || 'Checkout is not configured yet.'); if (d.url) window.location.href = d.url; else setStatus(d.message || 'Checkout ready.'); } catch (e) { setStatus(e.message); } finally { setLoading(false); }
  }
  if (!visible) return null;
  if (!authUser) return <section className="bible-panel"><div className="heritage-callout">Sign in to view billing and usage.</div></section>;
  const usage = data?.usage || {};
  return <section className="bible-panel billing-panel">
    <div className="section-head"><div><div className="eyebrow">ACCOUNT · BILLING & USAGE</div><h2>Know what your production costs.</h2><p>Track generation, voice, performance and export usage before provider costs become surprises.</p></div></div>
    <div className="usage-grid">{Object.entries(usage).map(([kind, x]) => <div className="card-inset" key={kind}><span className="export-option-label">{kind.replaceAll('_',' ')}</span><strong>{x.used ?? 0}</strong><small>{x.limit == null ? 'Unlimited / provider-limited' : `${x.limit} included · ${Math.max(0, x.limit-(x.used||0))} remaining`}</small><div className="usage-bar"><span style={{ width: `${x.limit ? Math.min(100, ((x.used||0)/x.limit)*100) : 0}%` }} /></div></div>)}</div>
    <div className="plan-grid">{PLANS.map(p => <article className={`plan-card ${data?.plan?.id === p.id ? 'active' : ''}`} key={p.id}><div className="eyebrow">{p.id === 'studio' ? 'TEAM' : 'PLAN'}</div><h3>{p.name}</h3><strong>{p.price}</strong><p>{p.features}</p><button type="button" className={data?.plan?.id === p.id ? '' : 'generate'} onClick={() => choose(p.id)} disabled={loading || data?.plan?.id === p.id}>{data?.plan?.id === p.id ? 'Current plan' : `Choose ${p.name}`}</button></article>)}</div>
    {data?.billing?.status && <div className="heritage-callout">Billing status: <strong>{data.billing.status}</strong>{data.billing.current_period_end ? ` · period ends ${new Date(data.billing.current_period_end).toLocaleDateString()}` : ''}</div>}
    {status && <div className="heritage-callout">💳 {status}</div>}
  </section>;
}
