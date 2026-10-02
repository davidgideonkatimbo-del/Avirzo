import React from 'react';
import { heritageTemplates } from '../constants';

/**
 * Guided heritage film templates — premium onboarding entry point.
 * Applying a template seeds story, culture, era, research, and characters.
 */
export function TemplatePicker({ onSelect, onDismiss, visible }) {
  if (!visible) return null;

  return (
    <section className="card template-picker">
      <div className="section-head">
        <div>
          <div className="eyebrow">START WITH INTENT</div>
          <h2>Choose a heritage workflow</h2>
          <p className="template-lead">
            Templates seed language, era, story type, research notes, and character continuity—
            so your film begins culturally grounded instead of blank.
          </p>
        </div>
        {onDismiss && (
          <button className="ghost-btn" onClick={onDismiss} type="button">
            Continue without template
          </button>
        )}
      </div>
      <div className="template-grid">
        {heritageTemplates.map((tpl) => (
          <button
            key={tpl.id}
            type="button"
            className="template-card"
            onClick={() => onSelect(tpl)}
          >
            <span className="template-icon" aria-hidden="true">{tpl.icon}</span>
            <span className="template-eyebrow">{tpl.eyebrow}</span>
            <strong>{tpl.title}</strong>
            <p>{tpl.description}</p>
            <span className="template-meta">
              {tpl.format} · {tpl.style} · {tpl.storyType}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
