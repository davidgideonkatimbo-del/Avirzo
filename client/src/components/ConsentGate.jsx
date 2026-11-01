import React, { useCallback, useEffect, useState } from 'react';

// Asks signed-in users to accept the Terms/Privacy Policy and the likeness rule before AI generation.
// The server enforces the same rule (CONSENT_REQUIRED), so this modal is the friendly side of that gate.
export function ConsentGate({ authUser, apiFetch }) {
  const [open, setOpen] = useState(false);
  const [terms, setTerms] = useState(false);
  const [likeness, setLikeness] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const check = useCallback(async () => {
    if (!authUser) { setOpen(false); return; }
    try {
      const r = await apiFetch('/api/account/consent');
      if (!r.ok) return;                       // not configured (local mode) or not signed in: nothing to ask
      const d = await r.json();
      setOpen(!d.accepted);
    } catch { /* offline: ask again next time */ }
  }, [authUser, apiFetch]);

  useEffect(() => { check(); }, [check]);
  useEffect(() => {
    const onNeeded = () => setOpen(true);
    window.addEventListener('avirzo:consent-required', onNeeded);
    return () => window.removeEventListener('avirzo:consent-required', onNeeded);
  }, []);

  if (!open || !authUser) return null;

  async function accept() {
    setBusy(true); setError('');
    try {
      const r = await apiFetch('/api/account/consent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ terms, likeness }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.message || 'Could not save your agreement.');
      setOpen(false);
    } catch (e) { setError(e.message || 'Could not save your agreement.'); }
    finally { setBusy(false); }
  }

  return (
    <div className="consent-backdrop" role="dialog" aria-modal="true" aria-labelledby="consent-title">
      <div className="consent-card">
        <div className="eyebrow">BEFORE YOU CREATE</div>
        <h2 id="consent-title">Two quick agreements</h2>
        <p>Avirzo makes films with AI. To keep it safe for everyone, please confirm the following.</p>
        <label className="consent-row">
          <input type="checkbox" checked={terms} onChange={e => setTerms(e.target.checked)} />
          <span>I agree to the <a href="/terms.html" target="_blank" rel="noreferrer">Terms</a> and <a href="/privacy.html" target="_blank" rel="noreferrer">Privacy Policy</a>.</span>
        </label>
        <label className="consent-row">
          <input type="checkbox" checked={likeness} onChange={e => setLikeness(e.target.checked)} />
          <span>I will only upload images, voices or footage of people when I have their permission, and I will not use Avirzo to impersonate real people or make sexual content.</span>
        </label>
        {error && <div className="heritage-callout" role="alert">{error}</div>}
        <div className="consent-actions">
          <button type="button" className="generate" disabled={!terms || !likeness || busy} onClick={accept}>{busy ? 'Saving…' : 'Agree and continue'}</button>
          <button type="button" className="plain-action" onClick={() => setOpen(false)} disabled={busy}>Not now</button>
        </div>
        <small className="consent-note">You can browse without agreeing, but AI generation stays locked until you do.</small>
      </div>
    </div>
  );
}
