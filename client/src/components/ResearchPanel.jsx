import React from 'react';
import { bugandaResearch } from '../constants';

export function ResearchPanel({
  visible,
  research, setResearch,
  researchStatus, setResearchStatus,
  setEra, setAfricanProfile, setStoryType
}) {
  if (!visible) return null;

  return (
    <section className="bible-panel research-panel">
      <div className="section-head">
        <div>
          <div className="eyebrow">HERITAGE RESEARCH & SOURCES</div>
          <h2>Ground the film before you generate it.</h2>
          <p>
            Keep documented evidence, oral tradition and creative reconstruction visibly separate.
            Avirzo sends this brief into every storyboard and video prompt.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setResearch(bugandaResearch);
            setEra('pre1994');
            setAfricanProfile('uganda-lg');
            setStoryType('oral');
            setResearchStatus('Curated example loaded from UNESCO sources. Verify community-specific details before treating them as historical fact.');
          }}
        >
          Load Buganda example
        </button>
      </div>
      <div className="card-inset heritage-passport">
        <div className="eyebrow">HERITAGE PASSPORT</div>
        <h3>Tell Avirzo what is known, remembered, and still needs a voice.</h3>
        <p className="muted">This layer travels with the project so story development and generation can respect the difference between documented history, oral memory and creative reconstruction.</p>
        <div className="research-grid">
          <label className="label compact">Evidence level
            <select aria-label="Evidence level" value={research.evidenceLevel || 'mixed'} onChange={e => setResearch({ ...research, evidenceLevel: e.target.value })}>
              <option value="documented">Documented</option>
              <option value="oral">Oral / community memory</option>
              <option value="mixed">Mixed</option>
              <option value="creative">Creative reconstruction</option>
            </select>
          </label>
          <label className="label compact">Verification status
            <select aria-label="Verification status" value={research.verificationStatus || 'needs-review'} onChange={e => setResearch({ ...research, verificationStatus: e.target.value })}>
              <option value="verified">Reviewed / verified</option>
              <option value="community-review">Community review recommended</option>
              <option value="needs-review">Needs verification</option>
            </select>
          </label>
          <input aria-label="Community voice or source steward" value={research.communityVoice || ''} onChange={e => setResearch({ ...research, communityVoice: e.target.value })} placeholder="Community voice / source steward" />
          <input aria-label="Provenance note" value={research.provenanceNote || ''} onChange={e => setResearch({ ...research, provenanceNote: e.target.value })} placeholder="Where this knowledge came from" />
        </div>
        <label className="label compact">Creative liberties</label>
        <textarea aria-label="Creative liberties" value={research.creativeLiberties || ''} onChange={e => setResearch({ ...research, creativeLiberties: e.target.value })} rows="2" placeholder="What Avirzo may dramatize or reconstruct — and what it must not invent…" />
      </div>

      <div className="research-grid">
        {[['location', 'Location / community'], ['period', 'Date / historical period'], ['focus', 'Research focus']].map(([key, label]) => (
          <input aria-label={label}
            key={key}
            value={research[key]}
            onChange={e => setResearch({ ...research, [key]: e.target.value })}
            placeholder={label}
          />
        ))}
      </div>
      <label className="label compact">Documented / verified facts</label>
      <textarea aria-label="Facts supported by credible sources…"
        value={research.verifiedFacts}
        onChange={e => setResearch({ ...research, verifiedFacts: e.target.value })}
        rows="4"
        placeholder="Facts supported by credible sources…"
      />
      <label className="label compact">Material culture & visual evidence</label>
      <textarea aria-label="Architecture, clothing, tools, foodways, transport, landscape…"
        value={research.materialCulture}
        onChange={e => setResearch({ ...research, materialCulture: e.target.value })}
        rows="3"
        placeholder="Architecture, clothing, tools, foodways, transport, landscape…"
      />
      <label className="label compact">Oral traditions / community memory</label>
      <textarea aria-label="Traditions, legends or memories — clearly labelled as such…"
        value={research.oralTraditions}
        onChange={e => setResearch({ ...research, oralTraditions: e.target.value })}
        rows="3"
        placeholder="Traditions, legends or memories — clearly labelled as such…"
      />
      <label className="label compact">Uncertainties / needs verification</label>
      <textarea aria-label="Details Avirzo must not present as established fact…"
        value={research.uncertainties}
        onChange={e => setResearch({ ...research, uncertainties: e.target.value })}
        rows="3"
        placeholder="Details Avirzo must not present as established fact…"
      />
      {(research.verificationStatus === 'community-review' || research.verificationStatus === 'needs-review') && <div className="ai-warning"><b>Heritage review:</b> Avirzo will keep this material visibly marked for verification rather than presenting uncertain details as established fact.</div>}
      <div className="source-box">
        <strong>Sources</strong>
        {research.sources?.length ? (
          <ul>
            {research.sources.map((x, i) => (
              <li key={i}><a href={x.url} target="_blank" rel="noreferrer">{x.title}</a></li>
            ))}
          </ul>
        ) : (
          <p>No sources added yet. Add URLs to the research brief before production.</p>
        )}
      </div>
      {researchStatus && <div className="heritage-callout">🔎 {researchStatus}</div>}
    </section>
  );
}
