import React, { useEffect, useState } from 'react';

const ROLES = [
  { id: 'editor', label: 'Editor', note: 'Edit story, bible, research, timeline and exports.' },
  { id: 'commenter', label: 'Commenter', note: 'Review and leave notes without changing production data.' },
  { id: 'viewer', label: 'Viewer', note: 'Read-only access to the project.' }
];

export function CollaborationPanel({ visible, apiFetch, projectId, authUser, projectName, room }) {
  const [members, setMembers] = useState([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('editor');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [shareLink, setShareLink] = useState('');

  async function refresh() {
    if (!projectId || !authUser) return;
    try {
      const r = await apiFetch(`/api/collaboration/projects/${projectId}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || 'Could not load collaborators.');
      setMembers(d.members || []);
    } catch (e) { setStatus(e.message); }
  }
  useEffect(() => { if (visible) refresh(); }, [visible, projectId, authUser]);

  async function invite() {
    if (!projectId) return setStatus('Save the project before inviting collaborators.');
    if (!email.trim()) return setStatus('Enter a collaborator email.');
    setLoading(true); setStatus('Creating invitation…');
    try {
      const r = await apiFetch(`/api/collaboration/projects/${projectId}/members`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), role })
      });
      const d = await r.json(); if (!r.ok) throw new Error(d.message || 'Could not add collaborator.');
      setEmail(''); setStatus(`Invitation created for ${email.trim()}.`); setShareLink(d.shareLink || ''); await refresh();
    } catch (e) { setStatus(e.message); } finally { setLoading(false); }
  }
  async function changeRole(userId, nextRole) {
    try {
      const r = await apiFetch(`/api/collaboration/projects/${projectId}/members/${userId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: nextRole }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.message || 'Could not change role.');
      await refresh();
    } catch (e) { setStatus(e.message); }
  }
  async function remove(userId) {
    if (!confirm('Remove this collaborator from the project?')) return;
    try {
      const r = await apiFetch(`/api/collaboration/projects/${projectId}/members/${userId}`, { method: 'DELETE' });
      const d = await r.json(); if (!r.ok) throw new Error(d.message || 'Could not remove collaborator.');
      await refresh();
    } catch (e) { setStatus(e.message); }
  }

  if (!visible) return null;
  return <section className="bible-panel collaboration-panel">
    <div className="section-head"><div><div className="eyebrow">WORKSPACE · COLLABORATION</div><h2>Build together.</h2><p>Invite writers, researchers, editors and producers with role-based project access.</p></div></div>
    {!projectId ? <div className="heritage-callout">Save this project first. Collaboration is attached to a cloud project, not the browser session.</div> : <>
      <div className="card-inset">
        <div className="eyebrow">INVITE</div><h3>{projectName || 'Avirzo project'}</h3>
        <div className="inline-form"><input aria-label="collaborator@email.com" value={email} onChange={e => setEmail(e.target.value)} placeholder="collaborator@email.com" type="email" /><select aria-label="Collaborator role" value={role} onChange={e => setRole(e.target.value)}>{ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}</select><button className="generate" type="button" onClick={invite} disabled={loading}>{loading ? 'Adding…' : 'Invite'}</button></div>
        <small>Invites are safe to resend. The recipient gets access after signing in with the invited email.</small>
        {shareLink && <div className="heritage-callout"><strong>Share link:</strong> {shareLink}</div>}
      </div>
      {room && room.status !== 'solo' && <div className="heritage-callout" aria-live="polite">
        <strong>{room.status === 'live' ? 'Live' : room.status === 'error' ? 'Live sync unavailable' : 'Connecting…'}</strong>
        {room.status === 'live' && <> · {room.peers.length ? room.peers.map(p => p.email || 'Collaborator').join(', ') + (room.peers.length === 1 ? ' is here' : ' are here') : 'only you are here'}{!room.canSend ? ' · you can watch changes but not push edits' : ''}</>}
        {Object.keys(room.held || {}).length > 0 && <div><small>Held back while you type: {Object.entries(room.held).map(([f, h]) => `${f} (${h.from})`).join(', ')}. Pause typing to receive it.</small></div>}
      </div>}
      <div className="member-list">{members.length ? members.map(m => <div className="member-row" key={m.user_id || m.email}>
        <div><strong>{m.email || m.user_id}</strong><small>{m.status || 'active'}{m.user_id === authUser?.id ? ' · you' : ''}</small></div>
        {m.role === 'owner' ? <span className="voice-chip">OWNER</span> : <><select aria-label={`Role for ${m.email || m.user_id}`} value={m.role} onChange={e => changeRole(m.user_id, e.target.value)}>{ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}</select><button type="button" onClick={() => remove(m.user_id)}>Remove</button></>}
      </div>) : <div className="heritage-callout">Only you have access to this project.</div>}</div>
    </>}
    {status && <div className="heritage-callout">🤝 {status}</div>}
  </section>;
}
