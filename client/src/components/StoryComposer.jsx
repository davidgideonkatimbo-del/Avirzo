import React from 'react';
import { africanProfiles, heritageEras, storyTypes } from '../constants';

export function StoryComposer({
  mode, setMode,
  story, setStory,
  africanProfile, setAfricanProfile,
  era, setEra,
  storyType, setStoryType,
  historicalNotes, setHistoricalNotes,
  profile,
  loadingPlan, makeStoryboard,
  camera, characters, setScenes, setMessage
}) {
  if (mode === 'story') {
    return (
      <>
        <label className="label">Tell Avirzo your story</label>
        <textarea
          value={story}
          onChange={e => setStory(e.target.value)}
          rows="6"
          placeholder="Describe the story from beginning to end…"
        />
        <div className="africa-panel">
          <div>
            <div className="eyebrow">AFRICAN CINEMA MODE</div>
            <strong>{profile?.market} · {profile?.language}</strong>
            <p>Language and cultural context stay attached to the project.</p>
          </div>
          <select value={africanProfile} onChange={e => setAfricanProfile(e.target.value)}>
            {africanProfiles.map(x => <option key={x.id} value={x.id}>{x.label}</option>)}
          </select>
        </div>
        <div className="heritage-grid">
          <label className="heritage-field">
            <span>HERITAGE ERA</span>
            <select value={era} onChange={e => setEra(e.target.value)}>
              {heritageEras.map(x => <option key={x.id} value={x.id}>{x.label}</option>)}
            </select>
            <small>{heritageEras.find(x => x.id === era)?.note}</small>
          </label>
          <label className="heritage-field">
            <span>STORY TYPE</span>
            <select value={storyType} onChange={e => setStoryType(e.target.value)}>
              {storyTypes.map(x => <option key={x.id} value={x.id}>{x.label}</option>)}
            </select>
            <small>Clearly separates history, oral memory, legend and creative reconstruction.</small>
          </label>
        </div>
        <label className="label compact">
          Historical / cultural notes <span className="optional">optional</span>
        </label>
        <input
          className="text-input"
          value={historicalNotes}
          onChange={e => setHistoricalNotes(e.target.value)}
          placeholder="e.g. Buganda, late 1800s; specify clothing, architecture, tools, social setting…"
        />
        <div className="heritage-callout">
          <strong>🌍 Heritage first.</strong> Avirzo will carry the selected era, story classification and character bible into the screenplay and shot prompts.
        </div>
        <button className="generate" type="button" onClick={makeStoryboard} disabled={loadingPlan}>
          {loadingPlan ? 'Building storyboard…' : 'Build my heritage storyboard →'}
        </button>
      </>
    );
  }

  // Single shot mode
  return (
    <>
      <label className="label">Describe one cinematic shot</label>
      <textarea
        value={story}
        onChange={e => setStory(e.target.value)}
        rows="5"
        placeholder="Describe the scene…"
      />
      <button
        className="generate"
        type="button"
        onClick={() => {
          setScenes([{
            id: `scene-${Date.now()}`,
            number: 1,
            title: 'Single shot',
            prompt: story,
            camera,
            status: 'draft',
            primaryCharacterId: characters[0]?.id || ''
          }]);
          setMode('story');
          setMessage('Single shot added. Generate it below.');
        }}
      >
        Add shot to project →
      </button>
    </>
  );
}
