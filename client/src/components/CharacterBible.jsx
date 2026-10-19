import React from 'react';

const FIELD_ROWS = [
  ['name', 'Name'],
  ['role', 'Role'],
  ['age', 'Age'],
  ['community', 'Community / people'],
  ['clan', 'Clan / family'],
  ['language', 'Language / dialect'],
  ['appearance', 'Appearance'],
  ['clothing', 'Clothing / adornment'],
  ['occupation', 'Occupation'],
  ['relationships', 'Relationships'],
  ['visualIdentity', 'Visual identity — face, hair, build, distinctive features'],
  ['continuityNotes', 'Continuity rules — what must never change']
];

export function CharacterBible({
  visible,
  characters,
  draft, setDraft,
  characterStatus, setCharacterStatus,
  addCharacter, removeCharacter,
  generateCharacterPerformance,
  uploadMediaToCloud, fileToDataUrl
}) {
  if (!visible) return null;

  async function onReferenceImage(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 6 * 1024 * 1024) {
      setCharacterStatus('Reference image is too large. Use an image under 6 MB.');
      return;
    }
    try {
      const cloud = await uploadMediaToCloud(f, 'references');
      const data = cloud?.url || await fileToDataUrl(f);
      setDraft({
        ...draft,
        referenceImageData: cloud ? '' : data,
        referenceImageUrl: cloud?.url || draft.referenceImageUrl,
        mediaStoragePath: cloud?.storagePath || draft.mediaStoragePath
      });
      setCharacterStatus(cloud
        ? 'Reference image uploaded to your private cloud library.'
        : 'Reference image attached locally. Sign in to persist media in cloud storage.');
    } catch {
      setCharacterStatus('Could not read the reference image.');
    }
  }

  async function onPerformanceVideo(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 16 * 1024 * 1024) {
      setCharacterStatus('Performance video is too large for a data-URI request. Use a video under 16 MB.');
      return;
    }
    try {
      const cloud = await uploadMediaToCloud(f, 'performance');
      const data = cloud?.url || await fileToDataUrl(f);
      setDraft({
        ...draft,
        performanceVideoData: cloud ? '' : data,
        performanceVideoUrl: cloud?.url || draft.performanceVideoUrl,
        performanceStoragePath: cloud?.storagePath || draft.performanceStoragePath
      });
      setCharacterStatus(cloud
        ? 'Performance video uploaded to your private cloud library.'
        : 'Performance reference attached locally. Sign in to persist media in cloud storage.');
    } catch {
      setCharacterStatus('Could not read the performance video.');
    }
  }

  return (
    <section className="bible-panel">
      <div className="section-head">
        <div>
          <div className="eyebrow">CHARACTER & HERITAGE BIBLE · v2.2</div>
          <h2>Give every character a visual identity.</h2>
          <p>
            Define face, hair, build, clothing, language, possessions and continuity rules once.
            Avirzo carries those constraints into every shot. Reference images can be attached
            and used as Runway Gen-4.5 prompt images for scenes assigned to that character.
          </p>
        </div>
      </div>

      {characters.map(c => {
        const meta = [
          c.age && `${c.age} years`,
          c.language,
          c.occupation,
          c.visualIdentity && 'visual identity set',
          (c.referenceImageData || c.referenceImageUrl || c.mediaStoragePath) && 'image reference attached',
          c.performanceStatus === 'ready' && 'performance ready',
          c.performanceStatus === 'rendering' && 'performance rendering'
        ].filter(Boolean).join(' · ');
        const canAnimate =
          (c.referenceImageData || c.referenceImageUrl || c.mediaStoragePath) &&
          (c.performanceVideoData || c.performanceVideoUrl || c.performanceStoragePath);
        return (
          <article className="character" key={c.id}>
            <div>
              <strong>{c.name}</strong>
              <span>{c.role || 'Character'} · {c.community || 'Community not specified'}</span>
              <small>{meta}</small>
            </div>
            <div className="character-buttons">
              {canAnimate && (
                <button
                  type="button"
                  onClick={() => generateCharacterPerformance(c)}
                  disabled={c.performanceStatus === 'rendering'}
                >
                  {c.performanceStatus === 'rendering' ? 'Rendering…' : 'Animate performance'}
                </button>
              )}
              <button type="button" onClick={() => removeCharacter(c.id)}>Remove</button>
            </div>
          </article>
        );
      })}

      <div className="character-form">
        {FIELD_ROWS.map(([key, label]) => (
          <input aria-label={label}
            key={key}
            value={draft[key]}
            onChange={e => setDraft({ ...draft, [key]: e.target.value })}
            placeholder={label}
          />
        ))}
        <input aria-label="Voice ID (optional)" value={draft.voiceId} onChange={e => setDraft({ ...draft, voiceId: e.target.value })} placeholder="Voice ID (optional)" />
        <input aria-label="Continuity possessions — tools, jewelry, heirlooms, weapons, bags…" value={draft.possessions} onChange={e => setDraft({ ...draft, possessions: e.target.value })} placeholder="Continuity possessions — tools, jewelry, heirlooms, weapons, bags…" />
        <input aria-label="Emotional baseline — temperament, restraint, energy…" value={draft.emotionalBaseline} onChange={e => setDraft({ ...draft, emotionalBaseline: e.target.value })} placeholder="Emotional baseline — temperament, restraint, energy…" />
        <input aria-label="Age / appearance progression — deliberate changes only" value={draft.ageProgression} onChange={e => setDraft({ ...draft, ageProgression: e.target.value })} placeholder="Age / appearance progression — deliberate changes only" />
        <textarea aria-label="Deliberate continuity changes — record when clothing, hair, possessions, injury or appearance intentionally changes." value={draft.deliberateChanges} onChange={e => setDraft({ ...draft, deliberateChanges: e.target.value })} placeholder="Deliberate continuity changes — record when clothing, hair, possessions, injury or appearance intentionally changes." />
        <input aria-label="Voice notes — age, pace, warmth, authority, emotion…" value={draft.voiceNotes} onChange={e => setDraft({ ...draft, voiceNotes: e.target.value })} placeholder="Voice notes — age, pace, warmth, authority, emotion…" />
        <input aria-label="Reference image URL (optional; saved as project metadata)" value={draft.referenceImageUrl} onChange={e => setDraft({ ...draft, referenceImageUrl: e.target.value })} placeholder="Reference image URL (optional; saved as project metadata)" />
        <label className="reference-upload">
          Upload reference image
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={onReferenceImage} />
        </label>
        <label className="reference-upload">
          Upload performance reference video
          <input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={onPerformanceVideo} />
        </label>
        <input aria-label="Performance video URL (optional HTTPS)"
          value={draft.performanceVideoUrl}
          onChange={e => setDraft({ ...draft, performanceVideoUrl: e.target.value })}
          placeholder="Performance video URL (optional HTTPS)"
        />
        <div className="heritage-callout">
          <strong>🎭 Character Performance.</strong> Upload a 3–30 second performance reference.
          Avirzo uses Runway Act-Two to transfer facial expression and, when enabled, body movement to the selected character image.
          Generated dialogue audio remains a separate timeline track.
        </div>
        <textarea aria-label="Heritage notes: mannerisms, possessions, beliefs, important visual details…"
          value={draft.notes}
          onChange={e => setDraft({ ...draft, notes: e.target.value })}
          placeholder="Heritage notes: mannerisms, possessions, beliefs, important visual details…"
        />
        <button className="generate" type="button" onClick={addCharacter}>+ Add to Heritage Bible</button>
        {characterStatus && <div className="heritage-callout">🎭 {characterStatus}</div>}
      </div>
    </section>
  );
}
