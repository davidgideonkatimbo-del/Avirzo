import { useCallback, useEffect, useRef, useState } from 'react';

export function useJobs(apiFetch, enabled, projectId = '') {
  const [jobs, setJobs] = useState([]);
  const [recentJobs, setRecentJobs] = useState([]);
  const apiRef = useRef(apiFetch);
  apiRef.current = apiFetch;
  const [jobStatus, setJobStatus] = useState('');

  const refreshJobs = useCallback(async () => {
    if (!enabled) return;
    try {
      const qs = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
      const r = await apiRef.current(`/api/jobs${qs}`);
      const data = await r.json();
      if (r.ok) { setJobs(data.jobs || []); setRecentJobs(data.recent || []); }
    } catch { /* provider/job status is best-effort */ }
  }, [enabled, projectId]);

  useEffect(() => {
    refreshJobs();
    if (!enabled) return undefined;
    const timer = setInterval(refreshJobs, 5000);
    return () => clearInterval(timer);
  }, [refreshJobs, enabled]);

  async function retryJob(id) {
    const r = await apiRef.current(`/api/jobs/${encodeURIComponent(id)}/retry`, { method: 'POST' });
    const data = await r.json();
    if (!r.ok) throw new Error(data.message || 'Could not retry job.');
    setJobStatus('Job queued for retry.');
    await refreshJobs();
    return data.job;
  }

  async function cancelJob(id) {
    const r = await apiRef.current(`/api/jobs/${encodeURIComponent(id)}/cancel`, { method: 'POST' });
    const data = await r.json();
    if (!r.ok) throw new Error(data.message || 'Could not cancel job.');
    setJobStatus('Job canceled.');
    await refreshJobs();
    return data.job;
  }

  return { jobs, recentJobs, refreshJobs, cancelJob, retryJob, jobStatus, setJobStatus };
}
