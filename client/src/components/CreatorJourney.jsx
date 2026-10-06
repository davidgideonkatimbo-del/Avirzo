import React from 'react';

const STEPS = [
  ['01', 'Story', 'Start with the idea, memory or history you want to preserve.'],
  ['02', 'Roots', 'Ground the film in place, language, period and cultural context.'],
  ['03', 'Scenes', 'Turn the story into characters, shots and cinematic continuity.'],
  ['04', 'Film', 'Generate, review, edit and export when the story is ready.'],
];

export function CreatorJourney({ onStart, onOpenTemplates }) {
  return (
    <section className="creator-journey" aria-labelledby="creator-journey-title">
      <div className="creator-journey-head">
        <div>
          <div className="eyebrow">THE AVIRZO METHOD</div>
          <h2 id="creator-journey-title">From memory to cinema.</h2>
          <p>A simple path for turning an African story into a film without losing the roots behind it.</p>
        </div>
        <div className="creator-journey-actions">
          <button type="button" className="hero-cta compact" onClick={onStart}>Start a film <span>→</span></button>
          {onOpenTemplates && <button type="button" className="ghost-button" onClick={onOpenTemplates}>Browse heritage paths</button>}
        </div>
      </div>
      <div className="creator-journey-steps">
        {STEPS.map(([number, title, description]) => (
          <div className="creator-step" key={number}>
            <span className="creator-step-number">{number}</span>
            <div><strong>{title}</strong><p>{description}</p></div>
          </div>
        ))}
      </div>
    </section>
  );
}
