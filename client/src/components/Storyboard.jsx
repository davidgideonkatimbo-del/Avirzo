import React from 'react';
import { tightenShot } from '../shotTighten';
import { cameras, durations, heritageEras, SCENE_PROMPT_LIMITS } from '../constants';

const secondsOf = d => Number.parseInt(String(d || '5'), 10) || 5;

function promptBudget(length) {
  const { comfortable, max } = SCENE_PROMPT_LIMITS;
  if (length > max) return { level: 'over', color: '#e5737a', text: `${length} characters · the end of this shot will be cut off. Shorten it to ${max} or less.` };
  if (length > comfortable) return { level: 'warn', color: '#e0b04a', text: `${length} characters · fits, but Avirzo may drop cultural and character notes to make room.` };
  return { level: 'ok', color: '#6cc08b', text: `${length} characters · fits, with room for cultural and character notes.` };
}

export function Storyboard({
  scenes,
  characters,
  profile,
  era,
  defaultDuration,
  generating,
  generateAll,
  generateScene,
  updateScene,
  moveScene,
  characterForScene
}) {
  if (!scenes.length) return null;
  const totalSeconds = scenes.reduce((sum, sc) => sum + secondsOf(sc.duration || defaultDuration), 0);

  return (
    <section className="card storyboard">
      <div className="section-head">
        <div>
          <div className="eyebrow">YOUR STORYBOARD</div>
          <h2>{scenes.length} cinematic scene{scenes.length === 1 ? '' : 's'}</h2>
          <small>About {totalSeconds} seconds of video · about {totalSeconds} production credits (1 per second) before any retries. Tip: generate shot 1 first to check the look.</small>
        </div>
        <button className="generate" type="button" onClick={generateAll} disabled={generating}>
          Generate entire film →
        </button>
      </div>
      {scenes.map(scene => {
        const char = characterForScene(scene);
        const hasImage = char?.referenceImageData || char?.referenceImageUrl;
        return (
          <article className="scene" key={scene.id}>
            <div className="scene-number">{String(scene.number).padStart(2, '0')}</div>
            <div className="scene-body">
              <input aria-label={`Scene ${scene.number} title`}
                value={scene.title}
                onChange={e => updateScene(scene.id, 'title', e.target.value)}
              />
              <textarea aria-label={`Scene ${scene.number} description`}
                value={scene.prompt}
                onChange={e => updateScene(scene.id, 'prompt', e.target.value)}
                rows="3"
              />
              {(() => { const b = promptBudget(String(scene.prompt || '').length); return <div role="status" aria-live="polite" data-budget={b.level} style={{ fontSize: '0.8rem', color: b.color, margin: '2px 0 6px' }}>{b.text}{b.level === 'over' && <button type="button" className="ghost-button" style={{ marginLeft: 8 }} onClick={() => updateScene(scene.id, 'prompt', tightenShot(scene.prompt, SCENE_PROMPT_LIMITS.max))}>Shorten to fit</button>}</div>; })()}
              <div className="scene-meta">
                {profile?.market} · {profile?.language} · {heritageEras.find(x => x.id === era)?.label} ·{' '}
                {characters.length} character profile{characters.length === 1 ? '' : 's'} · visual continuity active ·{' '}
                {hasImage ? 'image lock selected' : 'text continuity only'}
              </div>
              <div className="scene-actions">
                <select aria-label={`Scene ${scene.number} camera movement`}
                  value={scene.camera}
                  onChange={e => updateScene(scene.id, 'camera', e.target.value)}
                >
                  {cameras.map(x => <option key={x}>{x}</option>)}
                </select>
                <select aria-label={`Scene ${scene.number} clip length`}
                  value={scene.duration || defaultDuration || '5 sec'}
                  onChange={e => updateScene(scene.id, 'duration', e.target.value)}
                >
                  {durations.map(x => <option key={x}>{x}</option>)}
                </select>
                {characters.length > 0 && (
                  <select aria-label={`Scene ${scene.number} main character`}
                    value={scene.primaryCharacterId || ''}
                    onChange={e => updateScene(scene.id, 'primaryCharacterId', e.target.value)}
                  >
                    <option value="">No image reference</option>
                    {characters.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}{c.referenceImageData || c.referenceImageUrl ? ' · ref' : ''}
                      </option>
                    ))}
                  </select>
                )}
                <span className={`status-pill ${scene.status}`}>{scene.status}</span>
                <button type="button" onClick={() => generateScene(scene)} disabled={generating}>
                  {scene.status === 'ready' ? 'Regenerate' : 'Generate shot'}
                </button>
                <button type="button" onClick={() => moveScene(scene.id, -1)} disabled={scene.number === 1} aria-label={`Move scene ${scene.number} earlier`}><span aria-hidden="true">↑</span></button>
                <button type="button" onClick={() => moveScene(scene.id, 1)} disabled={scene.number === scenes.length} aria-label={`Move scene ${scene.number} later`}><span aria-hidden="true">↓</span></button>
              </div>
              {scene.videoUrl && <video aria-label={`Scene ${scene.number} video preview`} controls playsInline src={scene.videoUrl} />}
            </div>
          </article>
        );
      })}
    </section>
  );
}
