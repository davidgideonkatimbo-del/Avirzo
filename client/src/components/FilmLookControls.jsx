import React from 'react';
import { Control } from './Control';
import { styles, cameras, formats, durations, heritageEras, storyTypes } from '../constants';

export function FilmLookControls({
  style, setStyle,
  camera, setCamera,
  duration, setDuration,
  format, setFormat,
  profile,
  era,
  storyType,
  characters,
  draftQuality = false, setDraftQuality,
  keyframeFirst = true, setKeyframeFirst
}) {
  return (
    <section className="card controls-card">
      <div className="eyebrow">FILM LOOK</div>
      <div className="controls">
        {[
          ['Style', style, setStyle, styles],
          ['Camera', camera, setCamera, cameras],
          ['Duration', duration, setDuration, durations],
          ['Format', format, setFormat, formats]
        ].map(([label, val, set, opts]) => (
          <Control key={label} label={label}>
            <select value={val} onChange={e => set(e.target.value)}>
              {opts.map(x => <option key={x}>{x}</option>)}
            </select>
          </Control>
        ))}
      </div>
      {setKeyframeFirst && (
        <label className="draft-toggle">
          <input type="checkbox" checked={Boolean(keyframeFirst)} onChange={e => setKeyframeFirst(e.target.checked)} />
          {' '}Keyframe first (recommended): creates the scene's first frame from your character, then animates it, for steadier faces and costumes. Adds about 5 credits per scene (2 on Draft).
        </label>
      )}
      {setDraftQuality && (
        <label className="draft-toggle">
          <input type="checkbox" checked={Boolean(draftQuality)} onChange={e => setDraftQuality(e.target.checked)} />
          {' '}Draft quality (Gen-4 Turbo): about 60% fewer credits per clip. Needs a character reference image; text-only scenes always use full quality.
        </label>
      )}
      <div className="language-note">
        <b>{profile?.language}</b> · {profile?.market} · {heritageEras.find(x => x.id === era)?.label} ·{' '}
        {storyTypes.find(x => x.id === storyType)?.label}. {characters.length} Heritage Bible character
        {characters.length === 1 ? '' : 's'} attached.
      </div>
    </section>
  );
}
