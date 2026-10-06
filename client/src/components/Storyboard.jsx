import React from 'react';
import { cameras, heritageEras } from '../constants';

function ContinuityStrip({ scene, index, scenes, characters, profile, era }) {
  const previous = scenes[index - 1];
  const previousCharacter = previous?.primaryCharacterId ? characters.find(c => c.id === previous.primaryCharacterId) : null;
  const currentCharacter = scene.primaryCharacterId ? characters.find(c => c.id === scene.primaryCharacterId) : null;
  const checks = [];
  if (index === 0) {
    checks.push({ ok: true, text: 'Anchor scene · establishes the visual language' });
  } else {
    checks.push({ ok: Boolean(previous?.camera && scene.camera), text: previous?.camera && scene.camera ? `Camera language: ${previous.camera} → ${scene.camera}` : 'Camera language needs review' });
    checks.push({ ok: Boolean(previousCharacter && currentCharacter && previousCharacter.id === currentCharacter.id), text: previousCharacter && currentCharacter && previousCharacter.id === currentCharacter.id ? `${currentCharacter.name} reference carried forward` : previousCharacter ? `${previousCharacter.name} reference changes here` : 'No character reference carried from the previous scene' });
    checks.push({ ok: Boolean(String(scene.prompt || '').trim()), text: 'Visual action is defined for this scene' });
  }
  return (
    <div className="continuity-strip" aria-label={`Continuity anchors for scene ${scene.number}`}>
      <div className="continuity-strip-head"><span>CONTINUITY ANCHORS</span><small>{index === 0 ? 'Foundation' : `Inherited from Scene ${String(scenes[index - 1]?.number || index).padStart(2, '0')}`}</small></div>
      <div className="continuity-strip-items">
        <span>📍 {profile?.name || profile?.label || 'African profile'}</span>
        <span>◈ {heritageEras.find(x => x.id === era)?.label || 'Era'}</span>
        {checks.map((check, i) => <span key={i} className={check.ok ? 'continuity-ok' : 'continuity-review'}>{check.ok ? '✓' : '△'} {check.text}</span>)}
      </div>
    </div>
  );
}

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
  characterForScene,
  apiFetch,
  authUser
}) {
  const [usage, setUsage] = React.useState(null);
  const [usageStatus, setUsageStatus] = React.useState('');

  React.useEffect(() => {
    let cancelled = false;
    if (!authUser || !apiFetch) { setUsage(null); return undefined; }
    apiFetch('/api/billing/summary')
      .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.message || 'Usage unavailable.'); return d; })
      .then(d => { if (!cancelled) { setUsage(d); setUsageStatus(''); } })
      .catch(e => { if (!cancelled) setUsageStatus(e.message || 'Usage unavailable.'); });
    return () => { cancelled = true; };
  }, [apiFetch, authUser]);

  if (!scenes.length) return null;

  const generationUsage = usage?.usage?.generation;
  const remaining = generationUsage?.limit == null ? null : Math.max(0, generationUsage.limit - (generationUsage.used || 0));

  return (
    <section className="card storyboard">
      <div className="section-head">
        <div>
          <div className="eyebrow">YOUR STORYBOARD</div>
          <h2>{scenes.length} cinematic scene{scenes.length === 1 ? '' : 's'}</h2>
        </div>
        <button className="generate" type="button" onClick={generateAll} disabled={generating || (remaining !== null && remaining < scenes.length)}>
          Generate entire film →
        </button>
      </div>
      <div className="generation-budget" role="status" aria-live="polite">
        <div><strong>Production usage</strong><span>{scenes.length} scene{scenes.length === 1 ? '' : 's'} · 1 usage unit per generated scene</span></div>
        {remaining !== null ? <div><strong>{remaining} left</strong><span>{usage?.plan?.name || 'Free'} allowance this hour</span></div> : <div><strong>Provider-limited</strong><span>Usage protection is active on generation</span></div>}
        {usageStatus && <div className="generation-budget-warning">{usageStatus}</div>}
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
              <ContinuityStrip scene={scene} index={scenes.findIndex(x => x.id === scene.id)} scenes={scenes} characters={characters} profile={profile} era={era} />
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
                <button type="button" onClick={() => generateScene(scene)} disabled={generating || (remaining !== null && remaining < 1)} aria-label={`${scene.status === 'ready' ? 'Regenerate' : 'Generate'} scene ${scene.number} · 1 usage unit`}>
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
