import React, { useEffect, useState } from 'react';

export function HealthPanel({ apiFetch }) {
  const [health, setHealth] = useState(null);
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const r = await apiFetch('/api/health');
        const data = await r.json();
        if (active && r.ok) setHealth(data);
      } catch {}
    }
    load();
    const timer = setInterval(load, 15000);
    return () => { active = false; clearInterval(timer); };
  }, [apiFetch]);
  if (!health) return null;
  return <section className="health-strip">
    <span className={health.ffmpeg ? 'ok' : 'bad'}>FFmpeg {health.ffmpeg ? 'ready' : 'missing'}</span>
    <span className={health.cloud ? 'ok' : 'bad'}>Cloud {health.cloud ? 'connected' : 'local only'}</span>
    <span className={health.workerOnline ? 'ok' : health.workerConfigured ? 'warn' : 'bad'}>Worker {health.workerOnline ? 'online' : health.workerConfigured ? 'configured / waiting' : 'not configured'}</span>
    {Number.isInteger(health.queueDepth) && <span>Queue {health.queueDepth}</span>}
  </section>;
}
