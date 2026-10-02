import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { createJobService } from './services/jobs.js';
import { processFilmExport } from './services/exporter.js';
import * as core from './services/core.js';

const INTERVAL_MS = Math.max(2000, Number(process.env.WORKER_POLL_MS || 5000));
const workerId = `avirzo-worker-${process.pid}`;
const MAX_ATTEMPTS = Math.max(1, Number(process.env.WORKER_MAX_ATTEMPTS || 3));
function supabaseProjectRef() { try { return new URL(core.SUPABASE_URL).hostname.split('.')[0] || null; } catch { return null; } }
async function heartbeat() {
  await supabaseAdmin.from('avirzo_worker_heartbeats').upsert({ service_name: 'avirzo-worker', worker_id: workerId, project_ref: supabaseProjectRef(), last_seen_at: new Date().toISOString() }, { onConflict: 'service_name' });
}
const supabaseAdmin = core.SUPABASE_URL && core.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(core.SUPABASE_URL, core.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;
const jobs = createJobService({ supabaseAdmin, requireDurable: true });

if (!supabaseAdmin) {
  console.error('Avirzo worker requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

async function updateProviderJob(job) {
  if (!job.provider_task_id || !core.RUNWAY_API || !process.env.RUNWAYML_API_SECRET) return;
  if (job.created_at && Date.now() - new Date(job.created_at).getTime() > PROVIDER_JOB_MAX_MS) {
    await jobs.update(job.id, { status: 'failed', progress: 0, error: 'Generation timed out waiting for the provider. Please try again.' });
    return;
  }
  try {
    const response = await fetch(`${core.RUNWAY_API}/tasks/${encodeURIComponent(job.provider_task_id)}`, { headers: core.runwayHeaders() });
    const data = await response.json().catch(() => ({}));
    if (response.status === 404) { await jobs.update(job.id, { status: 'failed', progress: 0, error: 'The provider no longer has this task. Please regenerate.' }); return; }
    if (!response.ok) throw new Error(data?.message || 'Provider status request failed.');
    const status = String(data.status || '').toLowerCase();
    const progress = status === 'succeeded' ? 100 : status === 'failed' || status === 'canceled' ? 0 : status === 'running' ? 60 : status === 'throttled' ? 35 : 15;
    if (status === 'succeeded' && !data.output?.[0]) {
      await jobs.update(job.id, { status: 'failed', progress: 0, error: 'Provider reported success without an output media asset.' });
      return;
    }
    if (status === 'succeeded' && data.output?.[0]) {
      const asset = await core.archiveProviderOutput({
        job,
        sourceUrl: data.output[0],
        kind: 'video',
        name: job.type === 'character_performance' ? 'character-performance' : `scene-${job.id}`,
        sourceProvider: 'runway'
      });
      await jobs.update(job.id, { status: 'succeeded', progress: 100, result_asset_id: asset?.id || null, error: null });
      console.log(`[${workerId}] completed provider job ${job.id}`);
      return;
    }
    if (status === 'failed') {
      await jobs.update(job.id, { status: 'failed', progress: 0, error: data.failureCode || data.failureReason || 'Provider task failed.' });
      return;
    }
    if (status === 'canceled') {
      await jobs.update(job.id, { status: 'canceled', progress: 0, error: 'Canceled by provider or user.' });
      return;
    }
    await jobs.update(job.id, { status: 'running', progress, locked_at: new Date().toISOString() });
  } catch (error) {
    console.error(`[${workerId}] provider poll failed for ${job.id}:`, error.message);
  }
}

async function processQueuedJob(job) {
  if (job.type === 'film_export') {
    currentExportJob = job;
    const renew = setInterval(() => { jobs.update(job.id, { locked_at: new Date().toISOString() }).catch(() => {}); }, LOCK_RENEW_MS);
    try {
      const result = await processFilmExport({
        payload: job.payload || {},
        user: { id: job.user_id },
        ctx: core,
        isCanceled: async () => {
          const latest = await jobs.get(job.id, job.user_id);
          return latest?.status === 'canceled';
        },
        onProgress: async progress => {
          const latest = await jobs.get(job.id, job.user_id);
          if (latest?.status === 'canceled') throw new Error('Export canceled by user.');
          await jobs.update(job.id, { status: 'running', progress });
        }
      });
      await jobs.update(job.id, { status: 'succeeded', progress: 100, result_asset_id: result.assetId || null, error: null });
      console.log(`[${workerId}] completed export job ${job.id}`);
    } catch (error) {
      const latest = await jobs.get(job.id, job.user_id);
      if (latest?.status === 'canceled') return;
      const permanent = NON_RETRYABLE.test(error?.message || '');
      const nextStatus = permanent ? 'failed' : Number(job.attempts || 0) >= MAX_ATTEMPTS ? 'dead_letter' : 'queued';
      await jobs.update(job.id, { status: nextStatus, progress: 0, error: error?.message || 'Export failed.', locked_at: null, worker_id: null });
      console.error(`[${workerId}] export job ${job.id} failed (attempt ${job.attempts || 0}/${MAX_ATTEMPTS}):`, error.message);
    } finally {
      clearInterval(renew);
      currentExportJob = null;
    }
    return;
  }
  await jobs.update(job.id, { status: 'failed', progress: 0, error: `Unsupported worker job type: ${job.type}` });
}

const PROVIDER_JOB_MAX_MS = Math.max(5, Number(process.env.PROVIDER_JOB_MAX_MINUTES || 45)) * 60 * 1000;
const LOCK_RENEW_MS = 60 * 1000;
const NON_RETRYABLE = /not allowed|allowlist|Only HTTPS|disallowed|Invalid media URL|too large|Too many|must have|not found|unauthor/i;
let currentExportJob = null;

let stopping = false;
async function exportTick() {
  if (stopping) return;
  const job = await jobs.claimNext(['film_export']);
  if (job) await processQueuedJob(job);
}

async function providerTick() {
  if (stopping) return;
  const providerJobs = await jobs.activeProviderJobs();
  for (const job of providerJobs) await updateProviderJob(job);
}

async function runForever(name, fn, delayMs) {
  while (!stopping) {
    try { await fn(); }
    catch (error) { console.error(`[${workerId}] ${name} failed; will retry:`, error?.message || error); }
    if (!stopping) await new Promise(resolve => setTimeout(resolve, delayMs));
  }
}

// Heartbeat runs on its own timer so a long export never makes the worker look offline.
async function safeHeartbeat() { try { await heartbeat(); } catch (error) { console.error(`[${workerId}] heartbeat failed:`, error?.message || error); } }
const heartbeatTimer = setInterval(safeHeartbeat, 15000);
safeHeartbeat();

async function shutdown() {
  if (stopping) return;
  stopping = true;
  clearInterval(heartbeatTimer);
  // Hand any in-flight export back to the queue so another worker can resume it immediately.
  if (currentExportJob) {
    try { await jobs.update(currentExportJob.id, { status: 'queued', progress: 0, locked_at: null, worker_id: null, error: 'Worker restarted; export re-queued.' }); }
    catch (error) { console.error('Could not re-queue job during shutdown:', error?.message || error); }
  }
  setTimeout(() => process.exit(0), 500);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
console.log(`Avirzo worker ${workerId} started; polling every ${INTERVAL_MS}ms; max attempts ${MAX_ATTEMPTS}.`);
runForever('export loop', exportTick, INTERVAL_MS);
runForever('provider poll loop', providerTick, INTERVAL_MS);
