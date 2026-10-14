import React from 'react';

export function SettingsPanel({ format, setFormat, style, setStyle, camera, setCamera, duration, setDuration, styles, cameras, formats, durations }) {
  return (
    <div className="page-stack">
      <section className="page-heading">
        <div className="eyebrow">WORKSPACE SETTINGS</div>
        <h1>Studio preferences</h1>
        <p>Set your default filmmaking choices. These preferences are used when you build new scenes.</p>
      </section>
      <section className="bible-panel settings-panel">
        <div className="settings-grid">
          <label className="control"><span>Default visual style</span><select value={style} onChange={e => setStyle(e.target.value)}>{styles.map(x => <option key={x}>{x}</option>)}</select></label>
          <label className="control"><span>Default camera</span><select value={camera} onChange={e => setCamera(e.target.value)}>{cameras.map(x => <option key={x}>{x}</option>)}</select></label>
          <label className="control"><span>Default duration</span><select value={duration} onChange={e => setDuration(e.target.value)}>{durations.map(x => <option key={x}>{x}</option>)}</select></label>
          <label className="control"><span>Default aspect ratio</span><select value={format} onChange={e => setFormat(e.target.value)}>{formats.map(x => <option key={x}>{x}</option>)}</select></label>
        </div>
        <div className="heritage-callout">These are workspace preferences only. Provider secrets and production credentials remain server-side.</div>
      </section>
    </div>
  );
}
