import React, { useRef, useState } from 'react';
import { heritageTemplates, communityPacks, dedupeTemplates } from '../constants';

/**
 * Guided heritage film templates — premium onboarding entry point.
 * Phase B: community packs + classroom pack + optional JSON import (existing template-pack API).
 */
export function TemplatePicker({ onSelect, onDismiss, visible, apiFetch, onImportMessage }) {
  const fileRef = useRef(null);
  const [importBusy, setImportBusy] = useState(false);
  const [packFocus, setPackFocus] = useState(null);

  if (!visible) return null;

  const templatesToShow = dedupeTemplates(packFocus
    ? heritageTemplates.filter((t) => packFocus.templateIds.includes(t.id))
    : heritageTemplates);

  async function handleImportFile(e) {
    const file = e.target.files?.[0];
    if (!file || !apiFetch) return;
    setImportBusy(true);
    try {
      const text = await file.text();
      let body;
      try {
        body = JSON.parse(text);
      } catch {
        throw new Error('File is not valid JSON.');
      }
      const pack = body.pack || body;
      const r = await apiFetch('/api/heritage/template-pack/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pack })
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || 'Import failed.');
      const tpl = d.template || d;
      if (tpl && (tpl.story !== undefined || tpl.africanProfile)) {
        onSelect({
          id: tpl.id || `imported-${Date.now()}`,
          title: tpl.title || 'Imported framework',
          eyebrow: tpl.eyebrow || 'IMPORTED',
          description: tpl.description || '',
          icon: '📦',
          africanProfile: tpl.africanProfile || 'uganda-en',
          era: tpl.era || 'pre1994',
          storyType: tpl.storyType || 'inspired',
          style: tpl.style || 'Cinematic',
          camera: tpl.camera || 'Slow dolly',
          format: tpl.format || '16:9',
          duration: tpl.duration || '5 sec',
          historicalNotes: tpl.historicalNotes || '',
          story: tpl.story || '',
          research: tpl.research || {},
          worldBible: tpl.worldBible,
          rootsFoundation: tpl.rootsFoundation,
          characters: Array.isArray(tpl.characters) ? tpl.characters : []
        });
        onImportMessage?.('Community pack imported. Studio is seeded from the shared framework.');
      } else {
        throw new Error('Import response did not include a usable template.');
      }
    } catch (err) {
      onImportMessage?.(err.message || 'Could not import pack.');
    } finally {
      setImportBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

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

      {/* Phase B — community / education packs */}
      <div className="community-packs-block">
        <div className="eyebrow">COMMUNITY &amp; CLASSROOM PACKS</div>
        <div className="community-pack-grid">
          {communityPacks.map((pack) => (
            <button
              key={pack.id}
              type="button"
              className={`community-pack-card ${packFocus?.id === pack.id ? 'active' : ''}`}
              onClick={() => setPackFocus(packFocus?.id === pack.id ? null : pack)}
            >
              <span className="example-tag">{pack.tag}</span>
              <strong>{pack.title}</strong>
              <p>{pack.description}</p>
            </button>
          ))}
        </div>
        {packFocus && (
          <p className="pack-focus-hint">
            Showing <strong>{packFocus.title}</strong> templates.{' '}
            <button type="button" className="linkish" onClick={() => setPackFocus(null)}>
              Show all
            </button>
          </p>
        )}
        {apiFetch && (
          <div className="pack-import-row">
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={handleImportFile}
            />
            <button
              type="button"
              className="ghost-button"
              disabled={importBusy}
              onClick={() => fileRef.current?.click()}
            >
              {importBusy ? 'Importing…' : 'Import shared pack JSON'}
            </button>
            <span className="muted small">Uses the existing template-pack import API.</span>
          </div>
        )}
      </div>

      <div className="template-grid">
        {templatesToShow.map((tpl) => (
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
