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
      <div className="research-grid">
        {[['location', 'Location / community'], ['period', 'Date / historical period'], ['focus', 'Research focus']].map(([key, label]) => (
          <input
            key={key}
            value={research[key]}
            onChange={e => setResearch({ ...research, [key]: e.target.value })}
            placeholder={label}
          />
        ))}
      </div>
      <label className="label compact">Documented / verified facts</label>
      <textarea
        value={research.verifiedFacts}
        onChange={e => setResearch({ ...research, verifiedFacts: e.target.value })}
        rows="4"
        placeholder="Facts supported by credible sources…"
      />
      <label className="label compact">Material culture & visual evidence</label>
      <textarea
        value={research.materialCulture}
        onChange={e => setResearch({ ...research, materialCulture: e.target.value })}
        rows="3"
        placeholder="Architecture, clothing, tools, foodways, transport, landscape…"
      />
      <label className="label compact">Oral traditions / community memory</label>
      <textarea
        value={research.oralTraditions}
        onChange={e => setResearch({ ...research, oralTraditions: e.target.value })}
        rows="3"
        placeholder="Traditions, legends or memories — clearly labelled as such…"
      />
      <label className="label compact">Uncertainties / needs verification</label>
      <textarea
        value={research.uncertainties}
        onChange={e => setResearch({ ...research, uncertainties: e.target.value })}
        rows="3"
        placeholder="Details Avirzo must not present as established fact…"
      />
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
