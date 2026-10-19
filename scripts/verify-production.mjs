const base = String(process.env.AVIRZO_BASE_URL || '').replace(/\/$/, '');
const token = String(process.env.AVIRZO_ACCESS_TOKEN || '');
const sceneUrl = String(process.env.AVIRZO_TEST_SCENE_URL || '');
const assetId = String(process.env.AVIRZO_TEST_ASSET_ID || '');
const projectId = String(process.env.AVIRZO_PROJECT_ID || '') || null;
const timeoutMs = Number(process.env.AVIRZO_TEST_TIMEOUT_MS || 8 * 60 * 1000);

if (!base || !token || (!assetId && !sceneUrl)) {
  console.error('Set AVIRZO_BASE_URL, AVIRZO_ACCESS_TOKEN, and AVIRZO_TEST_ASSET_ID (preferred) or AVIRZO_TEST_SCENE_URL. AVIRZO_PROJECT_ID is optional.');
  process.exit(2);
}

const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
async function get(path, options = {}) {
  const response = await fetch(`${base}${path}`, { ...options, headers: { ...headers, ...(options.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${response.status} ${path}: ${data.message || JSON.stringify(data)}`);
  return data;
}

const health = await get('/api/health', { headers: { 'Content-Type': 'application/json' } });
console.log('health:', JSON.stringify({ version: health.version, ffmpeg: health.ffmpeg, workerConfigured: health.workerConfigured, workerOnline: health.workerOnline, queueDepth: health.queueDepth }));
if (!health.ffmpeg) throw new Error('FFmpeg is not available on the web service.');
if (!health.workerConfigured) throw new Error('Worker is not configured.');

const body = {
  title: 'Avirzo production smoke test',
  projectId,
  format: '16:9',
  scenes: [{ id: 'smoke-test', number: 1, title: 'Smoke test', ...(assetId ? { assetId } : { videoUrl: sceneUrl }) }],
  audioTracks: [],
  captions: [],
  duckMusic: false
};
const queued = await get('/api/export/film', { method: 'POST', body: JSON.stringify(body) });
console.log('export queued:', queued.jobId);

const started = Date.now();
while (Date.now() - started < timeoutMs) {
  const result = await get(`/api/jobs/${encodeURIComponent(queued.jobId)}`);
  const job = result.job;
  console.log(`job ${job.id}: ${job.status} ${job.progress}% attempts=${job.attempts || 0}`);
  if (job.status === 'succeeded') {
    if (!job.result_asset_id) throw new Error('Export succeeded but result_asset_id is missing.');
    const assetUrl = await get(`/api/assets/${encodeURIComponent(job.result_asset_id)}/url`);
    if (!assetUrl?.url) throw new Error('Export job has an asset ID, but Storage did not return a signed URL.');
    console.log(`PASS: export job ${job.id} succeeded, references asset ${job.result_asset_id}, and private Storage returned a signed URL.`);
    process.exit(0);
  }
  if (['failed', 'canceled', 'dead_letter'].includes(job.status)) throw new Error(`Export ended in ${job.status}: ${job.error || 'no error message'}`);
  await new Promise(resolve => setTimeout(resolve, 5000));
}
throw new Error(`Timed out after ${Math.round(timeoutMs / 1000)} seconds.`);
