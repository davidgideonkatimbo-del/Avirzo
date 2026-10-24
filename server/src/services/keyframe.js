// Keyframe-first generation: Runway text_to_image (with the character reference) makes the scene's first frame,
// then image_to_video animates that frame. The job keeps ONE stable provider_task_id (the keyframe task) so the
// client keeps polling the same id; the video task id is stored in payload.videoTaskId.

export const KEYFRAME_TAG = 'character';

export function normalizeTaskStatus(raw) {
  const s = String(raw || '').toLowerCase();
  if (s === 'cancelled') return 'canceled';
  if (s === 'success' || s === 'completed') return 'succeeded';
  return s;
}

/** The Runway task that is currently doing the work for a job (video task once it has started). */
export function providerTaskIdFor(job) {
  return job?.payload?.videoTaskId || job?.provider_task_id || null;
}

/** Image prompt for the first frame. Runway needs the @tag in the text for each reference image. Max 1000 characters. */
export function buildKeyframePrompt(promptText, hasCharacterRef) {
  const lead = hasCharacterRef
    ? `Cinematic film still, one frame from the opening of the shot. @${KEYFRAME_TAG} keeps the same face, hair, skin tone and costume as the reference. `
    : 'Cinematic film still, one frame from the opening of the shot. ';
  return (lead + String(promptText || '')).slice(0, 1000);
}

export async function startKeyframeTask({ runwayApi, runwayHeaders, model, promptText, ratio, referenceImage, fetchImpl = fetch }) {
  const body = { model, promptText: buildKeyframePrompt(promptText, Boolean(referenceImage)), ratio };
  if (referenceImage) body.referenceImages = [{ uri: referenceImage, tag: KEYFRAME_TAG }];
  const response = await fetchImpl(`${runwayApi}/text_to_image`, { method: 'POST', headers: runwayHeaders(), body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}

/**
 * Move a keyframe-stage job forward. Safe to call from both the poll route and the background worker.
 * Returns { state, progress, message, keyframeUrl? } where state is 'pending' | 'video_started' | 'failed' | 'busy' | 'moved_on'.
 */
export async function advanceKeyframeJob(job, { jobs, runwayApi, runwayHeaders, refundJobCredits, refundJobUsageQuota, fetchImpl = fetch }) {
  const fail = async (error, why) => {
    await jobs.update(job.id, { status: 'failed', progress: 0, error });
    await refundJobCredits(job, why);
    if (typeof refundJobUsageQuota === 'function') await refundJobUsageQuota(job);
    return { state: 'failed', progress: 0, message: error };
  };
  const response = await fetchImpl(`${runwayApi}/tasks/${encodeURIComponent(job.provider_task_id)}`, { headers: runwayHeaders() });
  const data = await response.json().catch(() => ({}));
  if (response.status === 404) return fail('The provider no longer has this task. Please regenerate.', 'provider_task_missing');
  if (!response.ok) return { state: 'pending', progress: 10, message: 'Creating the first frame…' };

  const status = normalizeTaskStatus(data.status);
  if (status === 'failed' || status === 'canceled') {
    return fail(data.failure || data.failureCode || 'The first frame could not be created.', `keyframe_${status}`);
  }
  if (status !== 'succeeded') {
    const progress = status === 'running' ? 25 : 10;
    await jobs.update(job.id, { status: 'running', progress });
    return { state: 'pending', progress, message: 'Creating the first frame…' };
  }
  const keyframeUrl = Array.isArray(data.output) ? data.output[0] : data.output;
  if (!keyframeUrl) return fail('The first frame finished without an image.', 'keyframe_no_output');

  // Claim the transition so the route and the worker do not both start a video.
  const fresh = await jobs.get(job.id, job.user_id);
  if (!fresh || fresh.payload?.stage !== 'keyframe') return { state: 'moved_on', progress: 50, message: 'Animating the scene…' };
  if (['succeeded', 'failed', 'canceled'].includes(fresh.status)) return { state: 'moved_on', progress: 50, message: '' };
  await jobs.update(job.id, { payload: { ...fresh.payload, stage: 'starting_video', keyframeUrl } });

  const vr = fresh.payload.videoRequest || {};
  const videoResponse = await fetchImpl(`${runwayApi}/image_to_video`, {
    method: 'POST',
    headers: runwayHeaders(),
    body: JSON.stringify({ model: vr.model, promptText: String(vr.promptText || '').slice(0, 1000), ratio: vr.ratio, duration: vr.duration, promptImage: keyframeUrl })
  });
  const videoData = await videoResponse.json().catch(() => ({}));
  if (!videoResponse.ok || !videoData?.id) {
    const msg = videoData?.error || videoData?.message || 'The video provider rejected the animation step.';
    return fail(msg, 'video_start_rejected');
  }
  await jobs.update(job.id, { status: 'running', progress: 50, payload: { ...fresh.payload, stage: 'video', keyframeUrl, videoTaskId: videoData.id } });
  return { state: 'video_started', progress: 50, message: 'Animating the scene…', keyframeUrl };
}
