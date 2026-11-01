// Takes: every render of a scene is kept so the creator can compare versions and switch back. The newest MAX_TAKES are kept.
export const MAX_TAKES = 6;

/** Existing takes (or the scene's current video, if it has no takes yet) plus the new ones, newest last. */
export function mergeTakes(scene, newTakes, now = Date.now()) {
  const existing = Array.isArray(scene?.takes) && scene.takes.length
    ? scene.takes
    : (scene?.videoUrl
      ? [{ id: `take-prev-${now}`, videoUrl: scene.videoUrl, ...(scene.assetId ? { assetId: scene.assetId, assetStoragePath: scene.assetStoragePath } : {}) }]
      : []);
  const merged = [...existing, ...(Array.isArray(newTakes) ? newTakes : [])];
  // Never drop the take that is in use, even if it is old.
  const keep = merged.slice(-MAX_TAKES);
  const activeId = scene?.activeTakeId;
  const active = activeId ? merged.find(t => t.id === activeId) : null;
  return active && !keep.includes(active) ? [active, ...keep.slice(1)] : keep;
}

/** Which take is in the film: the chosen one, or the newest if none was chosen yet. */
export function activeTakeOf(scene) {
  const takes = Array.isArray(scene?.takes) ? scene.takes : [];
  if (!takes.length) return null;
  return takes.find(t => t.id === scene.activeTakeId) || takes[takes.length - 1];
}

/** Scene fields to set when a take is chosen. `url` is a fresh link for the take. */
export function sceneWithTake(scene, take, url) {
  return {
    ...scene,
    videoUrl: url,
    activeTakeId: take.id,
    assetId: take.assetId,
    assetStoragePath: take.assetStoragePath,
    takes: (scene.takes || []).map(t => (t.id === take.id ? { ...t, videoUrl: url } : t))
  };
}
