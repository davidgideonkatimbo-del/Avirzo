/**
 * Wait for a video task to finish. Pure of React: everything it touches is passed in, so it can be unit-tested.
 * Resolves with the finished task data; throws an Error (with `retryable` set when a provider-side retry is worthwhile).
 */
export const TRANSIENT_STATUSES = [408, 425, 429, 502, 503, 504];

export async function pollTask({
  taskId, jobId = '', apiFetch, readApiJson,
  setMessage = () => {}, setActiveJobId = () => {}, refreshJobs = async () => {},
  sleep = ms => new Promise(r => setTimeout(r, ms)), maxAttempts = 150 // ~12 minutes
}) {
  let transientFailures = 0;
  for (let i = 0; i < maxAttempts; i++) {
    await sleep(i < 6 ? 3000 : 5000);
    let r, d;
    try {
      r = await apiFetch(`/api/generate/${encodeURIComponent(taskId)}`);
      d = await readApiJson(r);
    } catch (netErr) {
      transientFailures += 1;
      if (transientFailures > 8) throw new Error(netErr.message || 'Could not reach the studio while checking generation status.');
      if (i % 3 === 0) setMessage('Still waiting on the video provider… (connection blip, retrying)');
      continue;
    }
    if (!r.ok) {
      // Transient provider/gateway errors: keep polling instead of failing the shot.
      if (TRANSIENT_STATUSES.includes(r.status)) {
        transientFailures += 1;
        if (transientFailures > 12) throw new Error(d.message || 'The video provider stayed unavailable. Try Generate again in a moment.');
        if (i % 3 === 0) setMessage(d.message || 'Provider is busy — still waiting for your shot…');
        continue;
      }
      throw new Error(d.message || 'Could not retrieve generation status.');
    }
    transientFailures = 0;
    if (jobId) await refreshJobs();
    const st = String(d.status || '').toLowerCase();
    if (st === 'succeeded') {
      if (d.videoUrl || d.archivedAsset?.id) { setActiveJobId(''); return d; }
      // Succeeded without a URL yet — rare race; wait a few rounds, then fail (retryable).
      if (i >= 5) { setActiveJobId(''); const noUrl = new Error(d.message || 'Generation succeeded but no video URL was returned.'); noUrl.retryable = true; throw noUrl; }
      if (i % 2 === 0) setMessage('Shot finished — waiting for the video URL…');
      continue;
    }
    if (st === 'failed' || st === 'canceled' || st === 'cancelled') {
      setActiveJobId('');
      const failure = new Error(d.message || d.failureCode || 'Video generation failed.');
      // A provider-side failure is worth one automatic retry; a cancel by the creator is not.
      failure.retryable = (st === 'failed');
      throw failure;
    }
    if (d.message && i % 4 === 0) setMessage(d.message);
  }
  throw new Error('Generation is taking longer than expected. Open Exports & Jobs — the task may still finish.');
}
