import React from 'react';

export function JobCenter({ jobs, recent = [], onCancel, onRetry, busyJobId, retryingJobId }) {
  const visible = jobs.filter(job => ['queued', 'running', 'failed', 'canceled', 'dead_letter'].includes(job.status)).slice(0, 8);
  const visibleIds = new Set(visible.map(job => job.id));
  const completed = recent.filter(job => ['succeeded', 'dead_letter'].includes(job.status) && !visibleIds.has(job.id)).slice(0, 5);
  if (!visible.length && !completed.length) return null;

  return (
    <section className="card job-center">
      <div className="section-head">
        <div>
          <div className="eyebrow">PRODUCTION JOBS</div>
          <h2>Rendering & export</h2>
        </div>
        <span className="status-pill rendering">LIVE</span>
      </div>
      {visible.map(job => (
        <div className="job-row" key={job.id}>
          <div>
            <strong>{String(job.type).replaceAll('_', ' ')}</strong>
            <small>
              {job.provider_task_id
                ? `Provider task ${String(job.provider_task_id).slice(0, 8)}…`
                : 'Avirzo job'}
              {job.error ? ` · ${job.error}` : ''}
            </small>
          </div>
          <div className="job-progress" aria-hidden="true">
            <span style={{ width: `${Math.max(4, Math.min(100, Number(job.progress) || 0))}%` }} />
          </div>
          <strong>{Number(job.progress) || 0}%</strong>
          {['queued', 'running'].includes(job.status) && (
            <button type="button" onClick={() => onCancel(job.id)} disabled={busyJobId === job.id}>
              {busyJobId === job.id ? 'Canceling…' : 'Cancel'}
            </button>
          )}
          {['failed', 'canceled', 'dead_letter'].includes(job.status) && job.type === 'film_export' && (
            <button type="button" onClick={() => onRetry(job.id)} disabled={retryingJobId === job.id}>
              {retryingJobId === job.id ? 'Retrying…' : 'Retry'}
            </button>
          )}
        </div>
      ))}
      {completed.length > 0 && (
        <div className="job-completed">
          <div className="eyebrow">RECENT COMPLETED</div>
          {completed.map(job => (
            <div className="job-row completed" key={`recent-${job.id}`}>
              <div>
                <strong>{String(job.type).replaceAll('_', ' ')}</strong>
                <small>
                  {job.status === 'succeeded'
                    ? 'Completed successfully'
                    : `Dead-lettered after ${job.attempts || 0} attempts`}
                </small>
              </div>
              <span className={`status-pill ${job.status}`}>
                {job.status === 'succeeded' ? 'DONE' : 'DEAD LETTER'}
              </span>
              {job.type === 'film_export' && job.result_asset_id ? <span>Archived</span> : <span>{job.progress || 0}%</span>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
