export const RUNWAY_PROMPT_MAX = 1000;

/** Keep shot action and visual-quality requirements ahead of optional production notes. */
export function composeCinematicPrompt({ fixed, scene, extras = [], maxLength = RUNWAY_PROMPT_MAX }) {
  const core = [String(fixed || '').trim(), `Scene action: ${String(scene || '').trim()}`].filter(Boolean).join(' ');
  if (core.length <= maxLength) {
    let out = core;
    for (const extra of extras.filter(Boolean)) {
      const candidate = `${out} ${String(extra).trim()}`;
      if (candidate.length <= maxLength) out = candidate;
    }
    const suffix = ' No text overlays, subtitles, logos or watermarks.';
    if (!/no text overlays/i.test(out) && out.length + suffix.length <= maxLength) out += suffix;
    return out.slice(0, maxLength);
  }
  // Bound metadata so a long scene still gets meaningful room in the provider's prompt limit.
  const fixedLimit = Math.min(String(fixed || '').length, Math.floor(maxLength * 0.40));
  const fixedCompact = String(fixed || '').trim().slice(0, fixedLimit);
  const prefix = 'Scene action: ';
  const room = Math.max(0, maxLength - fixedCompact.length - prefix.length - 2);
  const sceneText = String(scene || '').trim();
  const sceneBudget = Math.min(sceneText.length, Math.floor(room * 0.76));
  let out = `${fixedCompact} ${prefix}${sceneText.slice(0, sceneBudget)}`;
  let remaining = maxLength - out.length - 1;
  // Preserve the most important optional note (cultural grounding) even for long prompts.
  for (const extra of extras.filter(Boolean)) {
    if (remaining < 35) break;
    const text = ` ${String(extra).trim()}`;
    const addition = text.slice(0, remaining);
    out += addition;
    remaining -= addition.length;
    if (addition.length < text.length) break;
  }
  return out.slice(0, maxLength);
}

/**
 * Scene-action budget inside the 1000-character provider prompt.
 * Avirzo's fixed block (shot identity, setting/era, quality rules) is about 600-615 characters,
 * which leaves roughly 370-388 characters for the scene action itself.
 * - up to `comfortable`: the action fits and there is usually still room for cultural/character context.
 * - up to `max`: the action fits whole, but optional context (cultural grounding, characters, World Bible) is dropped.
 * - above `max`: the end of the scene action is cut off.
 */
export const SCENE_PROMPT_LIMITS = Object.freeze({ comfortable: 220, max: 370 });
