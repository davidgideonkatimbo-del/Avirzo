import React, { useState } from 'react';

const REASONS = [
  ['sexual_content', 'Sexual content'],
  ['minors', 'Involves a child'],
  ['impersonation', 'Impersonates a real person'],
  ['hate_or_violence', 'Hate or violence'],
  ['copyright', 'Copyright'],
  ['other', 'Something else']
];

// Account data tools: download my data, delete my account, report content.
export function DataPrivacyPanel({ apiFetch, onDeleted }) {
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [reason, setReason] = useState('other');
  const [details, setDetails] = useState('');
  const [projectRef, setProjectRef] = useState('');

  async function downloadData() {
    setBusy(true); setStatus('Preparing your data…');
    try {
      const r = await apiFetch('/api/account/export');
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message || 'Could not prepare your data.');
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'avirzo-my-data.json'; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setStatus('Your data file has been downloaded.');
    } catch (e) { setStatus(e.message); } finally { setBusy(false); }
  }

  async function deleteAccount() {
    setBusy(true); setStatus('Deleting your account…');
    try {
      const r = await apiFetch('/api/account', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm: confirmText.trim() }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.message || 'Could not delete your account.');
      setStatus('Your account has been deleted.');
      onDeleted?.();
    } catch (e) { setStatus(e.message); } finally { setBusy(false); }
  }

  async function sendReport(e) {
    e.preventDefault();
    setBusy(true); setStatus('Sending report…');
    try {
      const r = await apiFetch('/api/report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason, details, projectId: projectRef }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.message || 'Could not send your report.');
      setDetails(''); setProjectRef(''); setStatus('Thank you. We will review your report.');
    } catch (err) { setStatus(err.message); } finally { setBusy(false); }
  }

  return (
    <section className="profile-account-card data-privacy-card">
      <div className="eyebrow">DATA &amp; SAFETY</div>
      <h2>Your data</h2>
      <p>Read the <a href="/terms.html" target="_blank" rel="noreferrer">Terms</a> and <a href="/privacy.html" target="_blank" rel="noreferrer">Privacy Policy</a>. You can download everything we hold about you, or delete your account at any time.</p>
      <div className="data-privacy-actions">
        <button type="button" className="profile-secondary-action" onClick={downloadData} disabled={busy}>Download my data</button>
      </div>

      <h3 className="data-privacy-sub">Report content</h3>
      <form className="profile-details-form" onSubmit={sendReport}>
        <label>Reason
          <select value={reason} onChange={e => setReason(e.target.value)}>{REASONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        </label>
        <label>Project ID (optional)
          <input value={projectRef} onChange={e => setProjectRef(e.target.value)} maxLength={120} placeholder="Where did you see it?" />
        </label>
        <label>Details
          <textarea value={details} onChange={e => setDetails(e.target.value)} maxLength={2000} placeholder="Tell us what is wrong." />
        </label>
        <button className="generate" type="submit" disabled={busy}>Send report</button>
      </form>

      <h3 className="data-privacy-sub danger">Delete account</h3>
      <p>This permanently deletes your projects, media and credits. Unused prepaid plan time is not refunded. It cannot be undone. Type <strong>DELETE</strong> to confirm.</p>
      <div className="data-privacy-delete">
        <input aria-label="Type DELETE to confirm" value={confirmText} onChange={e => setConfirmText(e.target.value)} placeholder="DELETE" autoComplete="off" />
        <button type="button" className="danger-action" onClick={deleteAccount} disabled={busy || confirmText.trim() !== 'DELETE'}>Delete my account</button>
      </div>
      {status && <div className="heritage-callout" role="status" aria-live="polite">{status}</div>}
    </section>
  );
}
