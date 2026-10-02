import React from 'react';
import { studioModes } from '../constants';

/**
 * Primary studio navigation with progressive panel toggles.
 * mode drives story/shot; panel flags drive overlays.
 */
export function StudioNav({
  mode,
  setMode,
  showBible,
  setShowBible,
  showResearch,
  setShowResearch,
  showVoices,
  setShowVoices,
  timelineOpen,
  setTimelineOpen,
  syncTimeline,
  showProjects,
  setShowProjects,
  showCollaboration,
  setShowCollaboration,
  showBilling,
  setShowBilling,
  showProduction,
  setShowProduction,
  onOpenTemplates
}) {
  function activate(id) {
    if (id === 'story' || id === 'shot') {
      setMode(id);
      return;
    }
    if (id === 'bible') setShowBible(!showBible);
    if (id === 'research') setShowResearch(!showResearch);
    if (id === 'voices') setShowVoices(!showVoices);
    if (id === 'timeline') {
      setTimelineOpen(!timelineOpen);
      if (!timelineOpen && typeof syncTimeline === 'function') syncTimeline();
    }
    if (id === 'projects') setShowProjects(!showProjects);
    if (id === 'collaboration') setShowCollaboration(!showCollaboration);
    if (id === 'billing') setShowBilling(!showBilling);
    if (id === 'production') setShowProduction(!showProduction);
  }

  function isActive(id) {
    if (id === 'story' || id === 'shot') return mode === id;
    if (id === 'bible') return showBible;
    if (id === 'research') return showResearch;
    if (id === 'voices') return showVoices;
    if (id === 'timeline') return timelineOpen;
    if (id === 'projects') return showProjects;
    if (id === 'collaboration') return showCollaboration;
    if (id === 'billing') return showBilling;
    if (id === 'production') return showProduction;
    return false;
  }

  return (
    <div className="studio-nav-wrap">
      <div className="tabs studio-nav" role="tablist" aria-label="Studio sections">
        {studioModes.map((m) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={isActive(m.id)}
            className={isActive(m.id) ? 'active' : ''}
            onClick={() => activate(m.id)}
          >
            <span className="tab-icon" aria-hidden="true">{m.icon}</span>
            {m.label}
          </button>
        ))}
        <button type="button" role="tab" aria-selected={showProduction} className={showProduction ? 'active' : ''} onClick={() => activate('production')}><span className="tab-icon" aria-hidden="true">◆</span>Production</button>
      </div>
      {onOpenTemplates && (
        <button type="button" className="templates-trigger" onClick={onOpenTemplates}>
          ✦ Heritage templates
        </button>
      )}
    </div>
  );
}
