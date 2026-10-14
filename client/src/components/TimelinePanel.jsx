import React from 'react';
import { SceneMusicStudio } from './SceneMusicStudio';

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

const SOCIAL_PRESETS = [
  { id: 'reels', label: 'Reels / TikTok / Shorts', format: '9:16', captionMode: 'burn', quality: 'standard', note: 'Vertical · burned captions · platform-ready' },
  { id: 'youtube', label: 'YouTube / festival', format: '16:9', captionMode: 'soft', quality: 'high', note: 'Landscape · soft captions · higher encode' },
  { id: 'whatsapp', label: 'WhatsApp share', format: '9:16', captionMode: 'burn', quality: 'draft', note: 'Vertical · light file · fast share' }
];

export function TimelinePanel({
  visible,
  timeline,
  audioTracks, captions, duckMusic, setDuckMusic,
  captionMode, setCaptionMode,
  exportQuality, setExportQuality,
  includeSrt, setIncludeSrt, aiEndCard, setAiEndCard, review, setReview,
  addAudioTrack, updateAudio, removeAudio,
  addCaption, updateCaption, removeCaption,
  exporting, exportFilm, exportUrl, exportSrt, projectName,
  format,
  setFormat, apiFetch, projectId, scenes, rootsFoundation, worldBible, africanProfile, story, openAsset, addGeneratedTrack
}) {
  if (!visible) return null;

  function applySocialPreset(preset) {
    if (typeof setFormat === 'function' && preset.format) setFormat(preset.format);
    if (typeof setCaptionMode === 'function') setCaptionMode(preset.captionMode);
    if (typeof setExportQuality === 'function') setExportQuality(preset.quality);
  }

  async function shareFinishedVideo() {
    if (!exportUrl) return;
    const title = projectName || 'Avirzo film';
    try {
      if (navigator.share) {
        let sharedFile = false;
        try {
          const response = await fetch(exportUrl);
          if (response.ok) {
            const blob = await response.blob();
            const file = new File([blob], `${title.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'avirzo-film'}.mp4`, { type: blob.type || 'video/mp4' });
            if (!navigator.canShare || navigator.canShare({ files: [file] })) {
              await navigator.share({ title, text: `Created with Avirzo — ${title}`, files: [file] });
              sharedFile = true;
            }
          }
        } catch {}
        if (!sharedFile) await navigator.share({ title, text: `Created with Avirzo — ${title}`, url: exportUrl });
        return;
      }
      await navigator.clipboard?.writeText(exportUrl);
      window.alert('Video link copied. You can paste it into your social post.');
    } catch (error) {
      if (error?.name !== 'AbortError') window.alert('Sharing is not available here. Download the video and upload it to your social platform.');
    }
  }

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

      {/* Phase A — light sequence helper (reuses existing timeline + export; no new pipeline) */}
      <div className="heritage-callout sequence-helper" role="note">
        <strong>Feature sequence.</strong>{' '}
        {timeline.length >= 2
          ? (() => {
              const lo = Math.round(timeline.length * 5 / 60 * 10) / 10;
              const hi = Math.round(timeline.length * 10 / 60 * 10) / 10;
              return `You have ${timeline.length} scenes. Export stitches them into one film (~${lo}–${hi} min at 5–10s/clip). Studio plans allow up to ~200 scenes / 90 min assembled. Add dialogue or music, then export.`;
            })()
          : timeline.length === 1
            ? 'One scene is ready. Build a longer storyboard (more sentences → more scenes) and generate them to assemble a feature-length sequence.'
            : 'Build a storyboard and generate scenes. Longer stories produce more scenes — that is how feature length is built (many short clips, one export).'}
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

      <SceneMusicStudio apiFetch={apiFetch} projectId={projectId} timeline={timeline} scenes={scenes} rootsFoundation={rootsFoundation} worldBible={worldBible} africanProfile={africanProfile} story={story} openAsset={openAsset} addGeneratedTrack={addGeneratedTrack} />

      <div className="timeline-track">
        <div className="track-label">
          AUDIO
          <button type="button" className="mini-btn" onClick={addAudioTrack}>+ Track</button>
        </div>
        <div className="audio-items">
          {audioTracks.length ? audioTracks.map(t => (
            <div className="audio-row" key={t.id}>
              <input aria-label="Track name" value={t.name} onChange={e => updateAudio(t.id, 'name', e.target.value)} placeholder="Track name" />
              <select aria-label={`Audio track type for ${t.name || 'track'}`} value={t.type} onChange={e => updateAudio(t.id, 'type', e.target.value)}>
                <option>dialogue</option>
                <option>narration</option>
                <option>ambience</option>
                <option>music</option>
                <option>sfx</option>
              </select>
              <input aria-label="Audio URL / generated data URL" value={t.src} onChange={e => updateAudio(t.id, 'src', e.target.value)} placeholder="Audio URL / generated data URL" />
              <input aria-label="Start" type="number" step="0.1" value={t.start} onChange={e => updateAudio(t.id, 'start', Number(e.target.value))} placeholder="Start" />
              <input aria-label="Duration" type="number" step="0.1" value={t.duration} onChange={e => updateAudio(t.id, 'duration', Number(e.target.value))} placeholder="Duration" />
              <input aria-label="Volume" type="number" min="0" max="2" step="0.05" value={t.volume} onChange={e => updateAudio(t.id, 'volume', Number(e.target.value))} placeholder="Volume" />
              <input aria-label="Fade in" type="number" min="0" step="0.1" value={t.fadeIn} onChange={e => updateAudio(t.id, 'fadeIn', Number(e.target.value))} placeholder="Fade in" />
              <input aria-label="Fade out" type="number" min="0" step="0.1" value={t.fadeOut} onChange={e => updateAudio(t.id, 'fadeOut', Number(e.target.value))} placeholder="Fade out" />
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

      <div className="timeline-track premium-export-options">
        <div className="track-label">FINISHING</div>
        <label className="duck-toggle"><input type="checkbox" checked={aiEndCard} onChange={e => setAiEndCard(e.target.checked)} /> Add optional “AI-generated” end card</label>
        <label className="duck-toggle"><input type="checkbox" checked={review?.enabled === true} onChange={e => setReview(r => ({...r, enabled:e.target.checked}))} /> Prepare this film for community review</label>
        {review?.enabled && <div className="card-inset">
          <div className="eyebrow">REVIEW NOTES</div>
          <textarea aria-label="Community review note" placeholder="Ask a community reviewer about history, language, cultural detail or representation…" onChange={e => setReview(r => ({...r, draft:e.target.value}))} value={review?.draft || ''} />
          <button type="button" className="mini-btn" onClick={() => { const note=String(review?.draft||'').trim(); if(!note) return; setReview(r => ({...r, notes:[...(r.notes||[]), {id:`review-${Date.now()}`,text:note,createdAt:new Date().toISOString()}],draft:''})); }}>Add review note</button>
          {!!review?.notes?.length && <div className="member-list">{review.notes.map(n => <div className="member-row" key={n.id}><div><strong>Community review</strong><small>{n.text}</small></div></div>)}</div>}
        </div>}
        <small className="muted">The review stage is optional. It never blocks a solo filmmaker from exporting.</small>
      </div>

      <div className="timeline-track caption-track">
        <div className="track-label">
          CAPTIONS
          <button type="button" className="mini-btn" onClick={addCaption}>+ Cue</button>
        </div>
        <div className="audio-items">
          {captions.length ? captions.map(c => (
            <div className="audio-row" key={c.id}>
              <input aria-label="Start" type="number" step="0.1" value={c.start} onChange={e => updateCaption(c.id, 'start', Number(e.target.value))} placeholder="Start" />
              <input aria-label="End" type="number" step="0.1" value={c.end} onChange={e => updateCaption(c.id, 'end', Number(e.target.value))} placeholder="End" />
              <input aria-label="Caption text" className="caption-text" value={c.text} onChange={e => updateCaption(c.id, 'text', e.target.value)} placeholder="Caption text" />
              <button type="button" onClick={() => removeCaption(c.id)}>Remove</button>
            </div>
          )) : (
            <div className="heritage-callout">No caption cues yet.</div>
          )}
        </div>
      </div>

      {/* Phase B — one-tap social / platform presets (sets existing format/caption/quality only) */}
      <div className="export-package card-inset social-presets">
        <div className="eyebrow">SHARE PRESETS</div>
        <h3>Platform-ready package</h3>
        <p className="export-package-lead">
          One tap sets format, captions and quality for common destinations. Then export as usual.
        </p>
        <div className="export-option-grid">
          {SOCIAL_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className="export-option-card"
              onClick={() => applySocialPreset(p)}
            >
              <strong>{p.label}</strong>
              <small>{p.note}</small>
            </button>
          ))}
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
        <div className="export-result heritage-callout watch-card">
          <div className="export-result-head">
            <div>
              <div className="eyebrow">WATCH · SHARE</div>
              <strong>{projectName || 'Avirzo film'}</strong>
              <p className="muted">
                Created with Avirzo — African Cinema Studio. Heritage-first short ready for platforms.
                On Android and iOS, Share video opens the system sheet when supported.
              </p>
              <p className="muted" style={{ fontSize: 11, marginTop: 4 }}>
                Format {format || '16:9'} · captions {captionMode} · quality {exportQuality}
              </p>
            </div>
            <div className="share-actions">
              <button type="button" className="generate" onClick={shareFinishedVideo}>Share video</button>
              <a className="download" href={exportUrl} target="_blank" rel="noreferrer" download>Download MP4</a>
              <button
                type="button"
                className="ghost-button"
                onClick={async () => {
                  try {
                    await navigator.clipboard?.writeText(exportUrl);
                    window.alert('Video link copied.');
                  } catch {
                    window.alert('Could not copy link. Use Download or Share video.');
                  }
                }}
              >
                Copy link
              </button>
            </div>
          </div>
          {exportSrt && (
            <div style={{ marginTop: 8 }}>
              <button type="button" className="linkish" onClick={downloadSrt}>Download captions.srt</button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
