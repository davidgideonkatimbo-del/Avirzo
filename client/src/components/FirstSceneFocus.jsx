import React, { useMemo } from 'react';

export function FirstSceneFocus({ scene, scenesCount, generating, updateScene, generateScene, openScenes, style, camera, duration, format, profile, era }) {
  if (!scene) return null;

  const ready = scene.status === 'ready';
  const blocked = scene.status === 'blocked';
  const checks = useMemo(() => [
    { label: 'Opening shot', ok: Boolean(String(scene.prompt || '').trim()) },
    { label: 'Scene title', ok: Boolean(String(scene.title || '').trim()) },
    { label: 'Visual direction', ok: Boolean(style && camera && duration && format) },
    { label: 'Cultural profile', ok: Boolean(profile?.name || profile?.label || profile?.id || era) },
  ], [scene.prompt, scene.title, style, camera, duration, format, profile, era]);
  const readyToRender = checks.every(check => check.ok) && !blocked;

  return (
    <section className="first-scene-focus" aria-labelledby="first-scene-title">
      <div className="first-scene-copy">
        <div className="eyebrow">NEXT · FIRST SCENE</div>
        <h2 id="first-scene-title">Make one frame feel real.</h2>
        <p>
          Start with Scene 01 before rendering the whole film. Shape the opening, check the visual direction,
          then carry that language through the rest of the story.
        </p>
        <div className="first-scene-progress" aria-label={`Scene 1 of ${scenesCount}`}>
          <span className="active" />
          <span />
          <span />
          <span />
          <small>Scene 01 · your visual anchor</small>
        </div>
        <div className="scene-readiness" aria-label="Scene readiness checklist">
          <div className="scene-readiness-head">
            <span>RENDER READINESS</span>
            <strong>{checks.filter(check => check.ok).length}/{checks.length}</strong>
          </div>
          <div className="scene-readiness-list">
            {checks.map(check => (
              <div className={check.ok ? 'scene-check ready' : 'scene-check'} key={check.label}>
                <span aria-hidden="true">{check.ok ? '✓' : '○'}</span>
                {check.label}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="first-scene-editor">
        <div className="scene-brief-strip" aria-label="Current cinematic settings">
          <span>{format || '16:9'}</span><span>{duration || '5 sec'}</span><span>{camera || 'Camera'}</span><span>{style || 'Visual style'}</span>
        </div>
        <label>
          <span>SCENE TITLE</span>
          <input value={scene.title || ''} onChange={e => updateScene(scene.id, 'title', e.target.value)} placeholder="Opening scene" />
        </label>
        <label>
          <span>OPENING SHOT</span>
          <textarea
            rows="4"
            value={scene.prompt || ''}
            onChange={e => updateScene(scene.id, 'prompt', e.target.value)}
            placeholder="Describe what the camera sees, where it begins, and the feeling of the opening."
          />
        </label>
        <div className="first-scene-actions">
          <button className="generate" type="button" disabled={generating || !readyToRender} onClick={() => generateScene(scene)}>
            {generating ? 'Rendering Scene 01…' : ready ? 'Regenerate Scene 01 →' : 'Generate Scene 01 →'}
          </button>
          <button className="ghost-button" type="button" onClick={openScenes}>Open scene board</button>
        </div>
        <div className="first-scene-status" role="status" aria-live="polite">
          <span className={`status-dot ${scene.status || 'draft'}`} />
          {blocked
            ? 'Continuity review required before this scene can render.'
            : !readyToRender
              ? 'Complete the highlighted scene details before spending generation usage.'
              : ready
                ? 'Opening scene ready. Use it as the visual reference for the film.'
                : 'Draft ready. Review the opening before you spend generation usage.'}
        </div>
      </div>
    </section>
  );
}
