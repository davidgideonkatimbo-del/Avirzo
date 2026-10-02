import { randomUUID } from 'node:crypto';

const memoryJobs = new Map();

const HIDDEN_JOB_FIELDS = ['payload', 'locked_at', 'worker_id'];
export function publicJob(job) {
  if (!job) return job;
  const out = { ...job };
  for (const k of HIDDEN_JOB_FIELDS) delete out[k];
  return out;
}
const PUBLIC_JOB_COLUMNS = 'id,user_id,project_id,type,status,provider_task_id,progress,result_asset_id,error,attempts,created_at,updated_at';

function now() { return new Date().toISOString(); }

export function createJobService({ supabaseAdmin, requireDurable = false }) {
  const durable = Boolean(supabaseAdmin);
  if (requireDurable && !durable) throw new Error('Durable job storage is required but Supabase service credentials are missing.');

  async function create(input) {
    const row = {
      user_id: input.userId, project_id: input.projectId || null,
      type: input.type, status: input.status || 'queued', provider_task_id: input.providerTaskId || null,
      progress: input.progress || 0, result_asset_id: null, error: null, payload: input.payload || null
    };
    if (durable) {
      const { data, error } = await supabaseAdmin.from('avirzo_jobs').insert(row).select().single();
      if (!error) return data;
      console.error('job create failed:', error);
      if (requireDurable) throw error;
    }
    const local = { ...row, id: randomUUID(), created_at: now(), updated_at: now() };
    memoryJobs.set(local.id, local);
    return local;
  }

  // A finished-by-user job must never be revived by a late worker/provider result.
  // Only an explicit retry may move a canceled job (pass { allowOverCanceled: true }).
  async function update(jobId, patch, { allowOverCanceled = false } = {}) {
    const guard = !allowOverCanceled && patch.status && patch.status !== 'canceled';
    if (durable) {
      let q = supabaseAdmin.from('avirzo_jobs').update(patch).eq('id', jobId);
      if (guard) q = q.neq('status', 'canceled');
      const { data, error } = await q.select().maybeSingle();
      if (!error && data) return data;
      if (error) {
        console.error('job update failed:', error);
        if (requireDurable) throw error;
      } else if (guard) {
        const { data: cur, error: curError } = await supabaseAdmin.from('avirzo_jobs').select('status').eq('id', jobId).maybeSingle();
        if (!curError && cur?.status === 'canceled') return null;
      }
      if (requireDurable) throw new Error(`Durable job ${jobId} could not be updated.`);
    }
    const current = memoryJobs.get(jobId);
    if (!current) return null;
    if (guard && current.status === 'canceled') return null;
    const next = { ...current, ...patch, updated_at: now() };
    memoryJobs.set(jobId, next);
    return next;
  }

  async function get(jobId, userId) {
    if (durable) {
      const { data, error } = await supabaseAdmin.from('avirzo_jobs').select(PUBLIC_JOB_COLUMNS).eq('id', jobId).eq('user_id', userId).maybeSingle();
      if (!error) return data || null;
      if (requireDurable) throw error;
    }
    const job = memoryJobs.get(jobId);
    return job && job.user_id === userId ? publicJob(job) : null;
  }

  async function list(userId, projectId) {
    if (durable) {
      let q = supabaseAdmin.from('avirzo_jobs').select(PUBLIC_JOB_COLUMNS).eq('user_id', userId).order('created_at', { ascending: false }).limit(50);
      if (projectId) q = q.eq('project_id', projectId);
      const { data, error } = await q;
      if (!error) return data || [];
      if (requireDurable) throw error;
    }
    return [...memoryJobs.values()].filter(x => x.user_id === userId && (!projectId || x.project_id === projectId)).sort((a,b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0,50).map(publicJob);
  }

  async function claimNext(types = ['film_export']) {
    if (!durable) return null;
    const { data, error } = await supabaseAdmin.rpc('claim_avirzo_job', { requested_types: types });
    if (error) { console.error('job claim failed:', error); if (requireDurable) throw error; return null; }
    return Array.isArray(data) ? data[0] || null : data || null;
  }

  async function activeProviderJobs() {
    if (!durable) return [];
    const { data, error } = await supabaseAdmin.from('avirzo_jobs').select('*').in('type', ['video_generation','character_performance']).eq('status','running').limit(50);
    if (error) { console.error('active job lookup failed:', error); if (requireDurable) throw error; return []; }
    return data || [];
  }

  async function resultUrl(job) {
    if (!durable || !job?.result_asset_id) return null;
    const { data: asset, error } = await supabaseAdmin.from('avirzo_assets').select('storage_path').eq('id', job.result_asset_id).eq('user_id', job.user_id).maybeSingle();
    if (error || !asset?.storage_path) return null;
    const { data, error: signedError } = await supabaseAdmin.storage.from('avirzo-media').createSignedUrl(asset.storage_path, 3600);
    return signedError ? null : data?.signedUrl || null;
  }

  async function recentCompleted(userId, projectId) {
    if (durable) {
      let q = supabaseAdmin.from('avirzo_jobs').select(PUBLIC_JOB_COLUMNS).eq('user_id', userId).in('status', ['succeeded','dead_letter']).order('updated_at', { ascending: false }).limit(12);
      if (projectId) q = q.eq('project_id', projectId);
      const { data, error } = await q;
      if (!error) return data || [];
      if (requireDurable) throw error;
    }
    return [...memoryJobs.values()].filter(x => x.user_id === userId && ['succeeded','dead_letter'].includes(x.status) && (!projectId || x.project_id === projectId)).sort((a,b)=>String(b.updated_at).localeCompare(String(a.updated_at))).slice(0,12).map(publicJob);
  }

  async function findByProviderTask(userId, taskId) {
    if (durable) {
      const { data, error } = await supabaseAdmin.from('avirzo_jobs').select(PUBLIC_JOB_COLUMNS).eq('user_id', userId).eq('provider_task_id', String(taskId)).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (!error) return data || null;
      if (requireDurable) throw error;
    }
    const local = [...memoryJobs.values()].find(x => x.user_id === userId && String(x.provider_task_id) === String(taskId));
    return local ? publicJob(local) : null;
  }

  async function queueDepth() {
    if (!durable) return 0;
    const { count, error } = await supabaseAdmin.from('avirzo_jobs').select('id', { count: 'exact', head: true }).eq('status', 'queued').eq('type', 'film_export');
    if (error) { if (requireDurable) throw error; return null; } return count || 0;
  }

  return { create, update, get, list, findByProviderTask, publicJob, claimNext, activeProviderJobs, resultUrl, recentCompleted, queueDepth, durable };
}
