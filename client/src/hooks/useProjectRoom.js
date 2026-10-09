import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase, supabaseEnabled } from '../supabase';

// Live project room: Supabase *private* Broadcast (field patches) + Presence (who is here / who is editing what).
// Access is enforced in Postgres (realtime.messages policies in supabase.sql): any project member can listen,
// only owner/editor can send patches. Broadcast is transient; saving to the cloud library is still what persists work.
//
// Conflict policy (deliberately simple): last writer wins per field, except that a remote patch is held back while
// the local user typed in that same field in the last IDLE_MS, so nobody's cursor jumps or text vanishes mid-sentence.
const IDLE_MS = 1500;
const SEND_DEBOUNCE_MS = 250;

export function useProjectRoom({ projectId, authUser, apiFetch, onPatch }) {
  const [peers, setPeers] = useState([]);
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('offline');
  const [held, setHeld] = useState({}); // field -> { from } remote change held back because you are typing there
  const channelRef = useRef(null);
  const clientId = useRef(`${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);
  const lastRemote = useRef({});   // field -> JSON of the last value we applied from a peer (prevents echo loops)
  const lastLocalEdit = useRef({}); // field -> timestamp of the last local change
  const timers = useRef({});
  const pending = useRef({});
  const onPatchRef = useRef(onPatch);
  onPatchRef.current = onPatch;
  const quietUntil = useRef(0);
  const canSend = role === 'owner' || role === 'editor';

  useEffect(() => {
    if (!supabaseEnabled || !projectId || !authUser?.id) { setPeers([]); setStatus('offline'); setRole(''); return undefined; }
    let cancelled = false; let channel = null;
    (async () => {
      try {
        const r = await apiFetch(`/api/collaboration/projects/${projectId}`);
        const d = await r.json().catch(() => ({}));
        if (!r.ok || cancelled) return;
        setRole(d.role || '');
        // Solo projects need no room: skip the connection until someone else is a member.
        if ((d.members || []).length < 2) { setStatus('solo'); return; }
        await supabase.realtime.setAuth();
        channel = supabase.channel(`avirzo:project:${projectId}`, { config: { private: true, broadcast: { self: false }, presence: { key: authUser.id } } });
        channelRef.current = channel;
        channel.on('broadcast', { event: 'patch' }, ({ payload }) => {
          if (!payload || payload.from === clientId.current || typeof payload.field !== 'string') return;
          if (Date.now() - (lastLocalEdit.current[payload.field] || 0) < IDLE_MS) { setHeld(h => ({ ...h, [payload.field]: { from: payload.email || 'a collaborator' } })); return; }
          lastRemote.current[payload.field] = JSON.stringify(payload.value);
          setHeld(h => { if (!h[payload.field]) return h; const n = { ...h }; delete n[payload.field]; return n; });
          onPatchRef.current?.(payload.field, payload.value, payload);
        });
        channel.on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          setPeers(Object.entries(state).map(([id, metas]) => ({ id, ...(metas[0] || {}) })).filter(p => p.id !== authUser.id));
        });
        channel.subscribe(async s => {
          if (cancelled) return;
          if (s === 'SUBSCRIBED') { setStatus('live'); await channel.track({ email: authUser.email || '', editing: '', at: Date.now() }); }
          else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') setStatus('error');
          else if (s === 'CLOSED') setStatus('offline');
        });
      } catch { if (!cancelled) setStatus('error'); }
    })();
    return () => {
      cancelled = true;
      Object.values(timers.current).forEach(clearTimeout); timers.current = {}; pending.current = {};
      if (channel) supabase.removeChannel(channel);
      channelRef.current = null; setPeers([]); setStatus('offline'); setHeld({});
    };
  }, [projectId, authUser?.id]);

  // Call whenever a synced field changes locally. Echoes of remote values are ignored; viewers/commenters never send.
  const sendPatch = useCallback((field, value) => {
    const json = JSON.stringify(value);
    if (lastRemote.current[field] === json) return;
    if (Date.now() < quietUntil.current) return; // state was just loaded from the cloud, not typed: never broadcast it
    lastLocalEdit.current[field] = Date.now();
    if (!canSend || !channelRef.current || status !== 'live') return;
    pending.current[field] = value;
    clearTimeout(timers.current[field]);
    timers.current[field] = setTimeout(() => {
      const v = pending.current[field]; delete pending.current[field];
      channelRef.current?.send({ type: 'broadcast', event: 'patch', payload: { field, value: v, from: clientId.current, email: authUser?.email || '', at: Date.now() } });
      channelRef.current?.track({ email: authUser?.email || '', editing: field, at: Date.now() });
    }, SEND_DEBOUNCE_MS);
  }, [canSend, status, authUser?.email]);

  const quiet = useCallback((ms = 2000) => { quietUntil.current = Date.now() + ms; }, []);

  return { peers, role, status, held, canSend, sendPatch, quiet };
}
