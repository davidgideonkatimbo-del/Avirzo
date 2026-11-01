import React from 'react';

const MOODS = [
  ['reflective', 'Reflective / ancestral memory'], ['joyful', 'Joyful / communal celebration'],
  ['tense', 'Tension / uncertainty'], ['grief', 'Grief / remembrance'], ['hopeful', 'Hope / renewal'],
  ['majestic', 'Majestic / historical scale'], ['tender', 'Tender / family connection'],
  ['urgent', 'Urgent / action'], ['mysterious', 'Mystery / discovery'], ['peaceful', 'Peaceful / landscape']
];

export function SceneMusicStudio({ apiFetch, projectId, timeline = [], scenes = [], rootsFoundation = {}, worldBible = {}, africanProfile, story = '', addGeneratedTrack, openAsset }) {
  const [sceneId, setSceneId] = React.useState('');
  const [mood, setMood] = React.useState('reflective');
  const [style, setStyle] = React.useState('cinematic underscore with culturally grounded acoustic textures');
  const [instruments, setInstruments] = React.useState('');
  const [direction, setDirection] = React.useState('Instrumental only; leave space for dialogue; make the ending easy to edit.');
  const [duration, setDuration] = React.useState(10);
  const [busy, setBusy] = React.useState(false);
  const [batchBusy, setBatchBusy] = React.useState(false);
  const [status, setStatus] = React.useState('');
  const [preview, setPreview] = React.useState('');

  React.useEffect(() => {
    if (!sceneId && timeline.length) setSceneId(String(timeline[0].id));
    if (sceneId && timeline.length && !timeline.some(s => String(s.id) === sceneId)) setSceneId(String(timeline[0].id));
  }, [timeline, sceneId]);

  const selected = timeline.find(s => String(s.id) === sceneId) || timeline[0] || null;
  function inferSceneMood(scene) {
    const source = scenes.find(s => String(s.id) === String(scene?.id) || Number(s.number) === Number(scene?.sceneNumber));
    const words = `${scene?.title || ''} ${source?.title || ''} ${source?.description || ''} ${source?.prompt || ''} ${source?.action || ''}`.toLowerCase();
    if (/battle|chase|attack|escape|fight|pursu|urgent/.test(words)) return 'urgent / action';
    if (/death|funeral|loss|mourning|farewell|grief/.test(words)) return 'grief / remembrance';
    if (/celebrat|dance|festival|wedding|harvest|reunion/.test(words)) return 'joyful / communal celebration';
    if (/ancestor|memory|elder|story|tradition|history/.test(words)) return 'reflective / ancestral memory';
    if (/danger|secret|threat|mystery|discover|unknown/.test(words)) return 'mystery / discovery';
    if (/family|child|mother|father|grandfather|grandmother|embrace/.test(words)) return 'tender / family connection';
    if (/hope|return|rebuild|future|freedom|renew/.test(words)) return 'hope / renewal';
    if (/king|kingdom|royal|throne|leader/.test(words)) return 'majestic / historical scale';
    if (/forest|lake|river|mountain|landscape|sunrise|sunset|field/.test(words)) return 'peaceful / landscape';
    return mood;
  }

  function scenePayload(scene, inferMood = false) {
    const source = scenes.find(s => String(s.id) === String(scene?.id) || Number(s.number) === Number(scene?.sceneNumber));
    return {
      sceneTitle: scene?.title || source?.title || `Scene ${scene?.number || scene?.sceneNumber || ''}`,
      sceneDescription: [source?.description, source?.prompt, source?.action, source?.setting, source?.dialogue].filter(Boolean).join(' '),
      mood: inferMood ? inferSceneMood(scene) : mood, style, instruments, direction, durationSeconds: Math.max(3, Math.min(600, Number(duration) || 10)),
      projectId, community: rootsFoundation.community, country: rootsFoundation.country,
      language: rootsFoundation.language, period: rootsFoundation.period,
      culturalAnchors: rootsFoundation.culturalAnchors, musicSoundscape: worldBible.musicSoundscape,
      africanProfile, story
    };
  }

  async function generate(scene, silent = false) {
    const r = await apiFetch('/api/music/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(scenePayload(scene, silent)) });
    const d = await r.json();
    if (!r.ok) throw new Error(d.message || 'Scene music generation failed.');
    const src = d.archivedAsset?.id && openAsset ? (await openAsset(d.archivedAsset.id)) || d.audioUrl : d.audioUrl;
    const track = {
      id: `music-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: `Music · ${scene?.title || `Scene ${scene?.sceneNumber || scene?.number || ''}`}`.slice(0, 120),
      type: 'music', src, assetId: d.archivedAsset?.id || '', start: Number(scene?.start || 0),
      duration: Number(d.durationSeconds || duration), volume: 0.7, fadeIn: 0.5, fadeOut: 1,
      sceneId: scene?.id || '', sceneNumber: scene?.sceneNumber || scene?.number || null,
      provider: d.provider, modelId: d.modelId, heritagePrompt: d.prompt
    };
    addGeneratedTrack(track);
    if (!silent) { setPreview(src); setStatus(`Music created for “${scene?.title || 'scene'}”${d.archivedAsset ? ' and archived to this project.' : '.'}`); }
    return track;
  }

  async function generateSelected() {
    if (!selected) { setStatus('Build a storyboard and add scenes to the timeline first.'); return; }
    setBusy(true); setStatus('Composing original, heritage-aware scene music…'); setPreview('');
    try { await generate(selected); } catch (e) { setStatus(e.message || 'Music generation failed.'); }
    finally { setBusy(false); }
  }

  async function generateBatch() {
    if (!timeline.length) { setStatus('Build a storyboard and add scenes to the timeline first.'); return; }
    setBatchBusy(true); setStatus(`Generating a scene-specific score for each of ${timeline.length} scenes. Moods are inferred from scene content; each track can be edited separately.`);
    let done = 0;
    try {
      for (const scene of timeline) {
        await generate(scene, true);
        done += 1;
        setStatus(`Scene music generated: ${done}/${timeline.length}. Each track remains separate and editable.`);
      }
      setStatus(`Finished generating music for ${done} scenes. Review each track in the audio timeline.`);
    } catch (e) { setStatus(`Stopped after ${done} scenes: ${e.message || 'music generation failed'}. Tracks already created are preserved; you can retry the remaining scenes individually.`); }
    finally { setBatchBusy(false); }
  }

  return <section className="card-inset scene-music-studio" aria-labelledby="scene-music-heading">
    <div className="eyebrow">AVIRZO · HERITAGE SOUND</div>
    <h3 id="scene-music-heading">Compose music for each scene</h3>
    <p className="export-package-lead">Create a distinct instrumental score for each shot or scene. Avirzo carries your cultural foundation and World Bible soundscape into the prompt, while leaving every track separate for editing.</p>
    <div className="heritage-callout"><strong>Cultural grounding stays in control.</strong> Specify the community, place, language, period, instruments and traditions. When evidence is uncertain, Avirzo asks for restraint instead of inventing sacred or ceremonial practices.</div>
    <div className="music-form-grid">
      <label><span>SCENE</span><select value={selected ? String(selected.id) : ''} onChange={e => setSceneId(e.target.value)} disabled={!timeline.length}>{timeline.map((s, i) => <option key={s.id || i} value={String(s.id)}>{String(s.number || s.sceneNumber || i + 1).padStart(2, '0')} · {s.title || `Scene ${i + 1}`}</option>)}</select></label>
      <label><span>EMOTIONAL MOOD</span><select value={mood} onChange={e => setMood(e.target.value)}>{MOODS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
      <label><span>MUSIC DIRECTION</span><input value={style} onChange={e => setStyle(e.target.value)} maxLength={120} placeholder="Cinematic underscore, traditional acoustic textures" /></label>
      <label><span>INSTRUMENTS / RHYTHMS</span><input value={instruments} onChange={e => setInstruments(e.target.value)} maxLength={500} placeholder="Only contextually appropriate instruments; or leave open" /></label>
      <label><span>DURATION (SECONDS)</span><input type="number" min="3" max="600" value={duration} onChange={e => setDuration(Math.max(3, Math.min(600, Number(e.target.value) || 3)))} /></label>
      <label className="music-wide"><span>DIRECTOR'S NOTES</span><textarea value={direction} onChange={e => setDirection(e.target.value)} rows="2" maxLength={700} placeholder="Dynamics, ending, dialogue space, instruments to avoid…" /></label>
    </div>
    {!projectId && <p className="muted">Save this film to archive generated music to its private media library. Without a saved project, the preview is temporary.</p>}
    <div className="music-actions">
      <button className="generate" type="button" onClick={generateSelected} disabled={busy || batchBusy || !selected}>{busy ? 'Composing scene music…' : 'Generate music for this scene'}</button>
      <button className="mini-btn" type="button" onClick={generateBatch} disabled={busy || batchBusy || !timeline.length}>{batchBusy ? 'Generating scene by scene…' : `Generate for all ${timeline.length} scenes`}</button>
    </div>
    {status && <p className="music-status" role="status">{status}</p>}
    {preview && <div className="audio-result"><div className="eyebrow">LATEST SCENE SCORE · PREVIEW</div><audio controls preload="metadata" src={preview} /></div>}
  </section>;
}
