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
  characters
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
      <div className="language-note">
        <b>{profile?.language}</b> · {profile?.market} · {heritageEras.find(x => x.id === era)?.label} ·{' '}
        {storyTypes.find(x => x.id === storyType)?.label}. {characters.length} Heritage Bible character
        {characters.length === 1 ? '' : 's'} attached.
      </div>
    </section>
  );
}
