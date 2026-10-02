import React from 'react';

const CAPTION_MODES = [
  { id: 'burn', label: 'Burned-in', note: 'Visible on every platform; hard-coded into the picture.' },
  { id: 'soft', label: 'Soft track', note: 'Selectable subtitle track (mov_text) inside the MP4.' },
  { id: 'none', label: 'No captions', note: 'Export video/audio only; SRT can still be downloaded separately.' }
];

const QUALITY_PRESETS = [
  { id: 'draft', label: 'Draft', note: 'Fast encode · CRF 28 — previews & reviews' },
  { id: 'standard', label: 'Standard', note: 'Balanced · CRF 21 — default delivery' },
  { id: 'high', label: 'High', note: 'Slower encode · CRF 18 — masters & festivals' }
];

export function TimelinePanel({
  visible,
  timeline,
  audioTracks, captions, duckMusic, setDuckMusic,
  captionMode, setCaptionMode,
  exportQuality, setExportQuality,
  includeSrt, setIncludeSrt,
  addAudioTrack, updateAudio, removeAudio,
  addCaption, updateCaption, removeCaption,
  exporting, exportFilm, exportUrl, exportSrt,
  format
}) {
  if (!visible) return null;

  function downloadSrt() {
    if (!exportSrt) return;
    const blob = new Blob([exportSrt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'avirzo-captions.srt';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="bible-panel timeline-panel">
      <div className="section-head">
        <div>
          <div className="eyebrow">TIMELINE · AUDIO · CAPTIONS · EXPORT</div>
          <h2>Assemble the film.</h2>
          <p>
            Sync scene order, layer dialogue and music, choose caption packaging, then export through the production worker.
          </p>
        </div>
        <button className="generate" type="button" onClick={exportFilm} disabled={exporting || !timeline.length}>
          {exporting ? 'Exporting film…' : 'Export assembled film →'}
        </button>
      </div>

      <div className="timeline-track">
        <div className="track-label">SCENES</div>
        <div className="timeline-items">
          {timeline.length ? timeline.map(item => (
            <div className="timeline-chip" key={item.id}>
              <strong>{String(item.number).padStart(2, '0')}</strong>
              <span>{item.title}</span>
              <small>{item.duration || '5s'}</small>
            </div>
          )) : (
            <div className="heritage-callout">Build a storyboard first. Scenes appear here for export order.</div>
          )}
        </div>
      </div>

      <div className="timeline-track">
        <div className="track-label">
          AUDIO
          <button type="button" className="mini-btn" onClick={addAudioTrack}>+ Track</button>
        </div>
        <div className="audio-items">
          {audioTracks.length ? audioTracks.map(t => (
            <div className="audio-row" key={t.id}>
              <input value={t.name} onChange={e => updateAudio(t.id, 'name', e.target.value)} placeholder="Track name" />
              <select value={t.type} onChange={e => updateAudio(t.id, 'type', e.target.value)}>
                <option>dialogue</option>
                <option>narration</option>
                <option>ambience</option>
                <option>music</option>
                <option>sfx</option>
              </select>
              <input value={t.src} onChange={e => updateAudio(t.id, 'src', e.target.value)} placeholder="Audio URL / generated data URL" />
              <input type="number" step="0.1" value={t.start} onChange={e => updateAudio(t.id, 'start', Number(e.target.value))} placeholder="Start" />
              <input type="number" step="0.1" value={t.duration} onChange={e => updateAudio(t.id, 'duration', Number(e.target.value))} placeholder="Duration" />
              <input type="number" min="0" max="2" step="0.05" value={t.volume} onChange={e => updateAudio(t.id, 'volume', Number(e.target.value))} placeholder="Volume" />
              <input type="number" min="0" step="0.1" value={t.fadeIn} onChange={e => updateAudio(t.id, 'fadeIn', Number(e.target.value))} placeholder="Fade in" />
              <input type="number" min="0" step="0.1" value={t.fadeOut} onChange={e => updateAudio(t.id, 'fadeOut', Number(e.target.value))} placeholder="Fade out" />
              <button type="button" onClick={() => removeAudio(t.id)}>Remove</button>
            </div>
          )) : (
            <div className="heritage-callout">No audio tracks yet. Add dialogue, narration, ambience, music or SFX.</div>
          )}
        </div>
        <label className="duck-toggle">
          <input type="checkbox" checked={duckMusic} onChange={e => setDuckMusic(e.target.checked)} />
          Duck music/ambience while dialogue plays
        </label>
      </div>

      <div className="timeline-track caption-track">
        <div className="track-label">
          CAPTIONS
          <button type="button" className="mini-btn" onClick={addCaption}>+ Cue</button>
        </div>
        <div className="audio-items">
          {captions.length ? captions.map(c => (
            <div className="audio-row" key={c.id}>
              <input type="number" step="0.1" value={c.start} onChange={e => updateCaption(c.id, 'start', Number(e.target.value))} placeholder="Start" />
              <input type="number" step="0.1" value={c.end} onChange={e => updateCaption(c.id, 'end', Number(e.target.value))} placeholder="End" />
              <input className="caption-text" value={c.text} onChange={e => updateCaption(c.id, 'text', e.target.value)} placeholder="Caption text" />
              <button type="button" onClick={() => removeCaption(c.id)}>Remove</button>
            </div>
          )) : (
            <div className="heritage-callout">No caption cues yet.</div>
          )}
        </div>
      </div>

      <div className="export-package card-inset">
        <div className="eyebrow">EXPORT PACKAGE</div>
        <h3>Delivery options</h3>
        <p className="export-package-lead">
          Choose how captions are packaged and how hard the encoder works. Format follows Film Look ({format || '16:9'}).
        </p>

        <div className="export-option-block">
          <span className="export-option-label">Caption mode</span>
          <div className="export-option-grid">
            {CAPTION_MODES.map(opt => (
              <button
                key={opt.id}
                type="button"
                className={`export-option-card ${captionMode === opt.id ? 'active' : ''}`}
                onClick={() => setCaptionMode(opt.id)}
              >
                <strong>{opt.label}</strong>
                <small>{opt.note}</small>
              </button>
            ))}
          </div>
        </div>

        <div className="export-option-block">
          <span className="export-option-label">Encode quality</span>
          <div className="export-option-grid">
            {QUALITY_PRESETS.map(opt => (
              <button
                key={opt.id}
                type="button"
                className={`export-option-card ${exportQuality === opt.id ? 'active' : ''}`}
                onClick={() => setExportQuality(opt.id)}
              >
                <strong>{opt.label}</strong>
                <small>{opt.note}</small>
              </button>
            ))}
          </div>
        </div>

        <label className="duck-toggle">
          <input type="checkbox" checked={includeSrt} onChange={e => setIncludeSrt(e.target.checked)} />
          Include SRT caption file in the export response (downloadable after render)
        </label>

        <div className="export-summary">
          Package: <b>{format || '16:9'}</b> · captions <b>{captionMode}</b> · quality <b>{exportQuality}</b>
          {includeSrt ? ' · SRT included' : ''}
          {duckMusic ? ' · music ducking on' : ''}
        </div>
      </div>

      {exportUrl && (
        <div className="export-result heritage-callout">
          <strong>🎬 Film export ready.</strong>{' '}
          <a href={exportUrl} target="_blank" rel="noreferrer">Open / download assembled film</a>
          {exportSrt && (
            <>
              {' · '}
              <button type="button" className="linkish" onClick={downloadSrt}>Download captions.srt</button>
            </>
          )}
        </div>
      )}
    </section>
  );
}
