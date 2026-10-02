import React, { useState } from 'react';

const DEFAULTS = {
  characterId: '',
  emotionalState: '',
  possessions: '',
  ageProgression: '',
  appearanceChanges: '',
  sceneNotes: '',
};

export function CharacterContinuity({
  apiFetch,
  characters,
  scenes,
  worldBible,
  rootsFoundation,
  setMessage,
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  async function audit() {
    setBusy(true);
    setError('');

    try {
      const response = await apiFetch('/api/ai/character-continuity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characters,
          scenes,
          worldBible,
          rootsFoundation,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(
          result.message || 'Character continuity audit failed.'
        );
      }

      setData(result);
      setOpen(true);
      if (setMessage) {
        setMessage('Character continuity audit updated.');
      }
    } catch (err) {
      setError(err?.message || 'Character continuity audit failed.');
    } finally {
      setBusy(false);
    }
  }

  const warnings = Array.isArray(data?.warnings) ? data.warnings : [];
  const characterResults = Array.isArray(data?.characters)
    ? data.characters
    : [];

  return (
    <section className="card-inset story-intelligence">
      <div className="roots-head">
        <div>
          <div className="eyebrow">CHARACTER CONTINUITY ENGINE</div>
          <h3>Keep every person recognizable from scene to scene</h3>
          <p className="muted">
            Avirzo checks identity, clothing, language, relationships,
            possessions, emotional state and scene assignments against each
            character&apos;s established world.
          </p>
        </div>

        <button className="generate" onClick={audit} disabled={busy}>
          {busy ? 'Auditing…' : 'Audit continuity'}
        </button>
      </div>

      {error ? <div className="ai-warning">{error}</div> : null}

      {data ? (
        <div className="story-intel-results">
          <div className="passport-grid">
            <div>
              <small>CONTINUITY</small>
              <strong>{data.score}%</strong>
            </div>
            <div>
              <small>CHARACTERS</small>
              <strong>{characterResults.length}</strong>
            </div>
            <div>
              <small>SCENES</small>
              <strong>{data.sceneCount || 0}</strong>
            </div>
            <div>
              <small>FLAGS</small>
              <strong>{warnings.length}</strong>
            </div>
          </div>

          <div className="panel-tabs">
            <button
              className={open ? 'active' : ''}
              onClick={() => setOpen((value) => !value)}
            >
              {open ? 'Hide audit' : 'Show audit'}
            </button>
          </div>

          {open ? (
            <>
              <div className={warnings.length ? 'ai-warning' : 'ai-success'}>
                {warnings.length ? (
                  warnings.map((warning, index) => (
                    <div key={index}>⚠ {warning}</div>
                  ))
                ) : (
                  <div>
                    ✓ No continuity conflicts were detected in the current
                    project data.
                  </div>
                )}
              </div>

              {characterResults.map((character) => (
                <div className="ai-beat" key={character.id}>
                  <b>{character.name}</b>
                  <small>
                    {character.sceneCount} scene
                    {character.sceneCount === 1 ? '' : 's'} · {character.status}
                  </small>

                  {character.primaryCharacter ? (
                    <small> · Primary in scene assignments</small>
                  ) : null}

                  {Array.isArray(character.flags)
                    ? character.flags.map((flag, index) => (
                        <div key={index}>• {flag}</div>
                      ))
                    : null}

                  {Array.isArray(character.locked) && character.locked.length > 0 ? (
                    <small>Locks: {character.locked.join(' · ')}</small>
                  ) : null}
                </div>
              ))}

              <div className="heritage-callout">
                <b>Continuity principle:</b> established character details
                should remain stable unless a deliberate story change is
                recorded. World Bible and community/research review remain the
                authority for cultural and historical accuracy.
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export const emptyContinuity = DEFAULTS;
