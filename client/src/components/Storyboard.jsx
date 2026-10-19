import React from 'react';
import { cameras, heritageEras } from '../constants';

export function Storyboard({
  scenes,
  characters,
  profile,
  era,
  generating,
  generateAll,
  generateScene,
  updateScene,
  moveScene,
  characterForScene
}) {
  if (!scenes.length) return null;

  return (
    <section className="card storyboard">
      <div className="section-head">
        <div>
          <div className="eyebrow">YOUR STORYBOARD</div>
          <h2>{scenes.length} cinematic scene{scenes.length === 1 ? '' : 's'}</h2>
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
