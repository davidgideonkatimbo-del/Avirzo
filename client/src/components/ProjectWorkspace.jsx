import React from 'react';

const SECTIONS = [
  ['overview','Overview',''],
  ['story','Story',''],
  ['heritage','Heritage',''],
  ['scenes','Scenes',''],
  ['voices','Voices',''],
  ['assets','Assets',''],
  ['timeline','Timeline',''],
  ['exports','Exports',''],
];

export function ProjectWorkspace({ projectId, projectName, projectFolder, authUser, projectStatus, navigate, routeSection = 'overview', showOverview = true }) {
  const [section, setSection] = React.useState(routeSection);
  React.useEffect(() => setSection(routeSection), [routeSection]);
  const current = SECTIONS.find(x => x[0] === section) || SECTIONS[0];

  const openSection = (id) => {
    setSection(id);
    navigate(`project/${projectId}/${id}`);
  };

  return (
    <div className="project-workspace">
      <div className="project-workspace-head">
        <div>
          <button className="workspace-back" type="button" onClick={() => navigate('projects')}>← Projects</button>
          <div className="eyebrow">PROJECT</div>
          <h1>{projectName || 'Untitled film'}</h1>
          <p>{projectFolder || 'My Films'}</p>
        </div>
        <div className="workspace-status">
          <span className="workspace-dot" /> Active project
        </div>
      </div>

      <div className="workspace-layout">
        <aside className="workspace-nav" aria-label="Project sections">
          <div className="workspace-nav-label">FILM</div>
          {SECTIONS.map(([id,label,desc]) => (
            <button key={id} type="button" className={section === id ? 'active' : ''} onClick={() => openSection(id)}>
              <strong>{label}</strong>
            </button>
          ))}
        </aside>

        <section className="workspace-main">
          {showOverview && <div className="workspace-card workspace-overview">
            <div className="eyebrow">{current[1].toUpperCase()}</div>
            <h2>{current[0] === 'overview' ? 'Your film, in one place.' : current[1]}</h2>
            <p>
              {current[0] === 'overview'
                ? 'Story, heritage, scenes, voices, media and edit — together.'
                : `${current[1]} for this film.`}
            </p>
          </div>}

          {showOverview && section === 'overview' && (
            <div className="workspace-grid">
              {SECTIONS.slice(1).map(([id,label,desc]) => (
                <button key={id} className="workspace-module" type="button" onClick={() => openSection(id)}>
                  <span className="workspace-module-icon">✦</span>
                  <strong>{label}</strong>
                  
                  <span className="workspace-open">Open →</span>
                </button>
              ))}
            </div>
          )}


        </section>
      </div>
    </div>
  );
}
