import React from 'react';
import { supabaseEnabled } from '../supabase';

export function ProjectsPanel({
  visible,
  authUser,
  authEmail, setAuthEmail,
  authPassword, setAuthPassword,
  authMode, setAuthMode,
  authStatus, authLoading,
  handleAuth, handleSignOut,
  projectId, projectName, setProjectName, projectFolder, setProjectFolder, projectFolderFilter, setProjectFolderFilter, projectFolders, visibleProjects,
  projects, projectStatus, projectLoading,
  newProject, saveProject, loadProject, deleteProject,
  assets, assetStatus, refreshAssets, openAsset, deleteAsset
}) {
  if (!visible) return null;

  return (
    <>
      <section className="bible-panel auth-panel">
        <div className="section-head">
          <div>
            <div className="eyebrow">ACCOUNT & CLOUD STORAGE · v2.2</div>
            <h2>{supabaseEnabled ? 'Your Avirzo workspace' : 'Cloud layer ready to configure.'}</h2>
            <p>
              {supabaseEnabled
                ? 'Projects and uploaded media can be tied to your account. Your provider keys remain server-side.'
                : 'Add Supabase credentials to enable account-based projects and private media storage; local server storage remains available without it.'}
            </p>
          </div>
        </div>
        {!supabaseEnabled ? (
          <div className="heritage-callout">
            ☁️ Set <code>VITE_SUPABASE_URL</code>, <code>VITE_SUPABASE_PUBLISHABLE_KEY</code>, <code>SUPABASE_URL</code> and <code>SUPABASE_PUBLISHABLE_KEY</code> in your deployment environment, then run the included <code>supabase.sql</code>.
          </div>
        ) : !authUser ? (
          <div className="auth-form">
            <input aria-label="Email" type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="Email" />
            <input aria-label="Password" type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} placeholder="Password" />
            <button className="generate" onClick={handleAuth} disabled={authLoading}>
              {authLoading ? 'Please wait…' : authMode === 'signup' ? 'Create account' : 'Sign in'}
            </button>
            <button type="button" onClick={() => setAuthMode(authMode === 'signup' ? 'signin' : 'signup')}>
              {authMode === 'signup' ? 'Already have an account? Sign in' : 'Create a new account'}
            </button>
          </div>
        ) : (
          <div className="heritage-callout">
            ☁️ Signed in as <strong>{authUser.email}</strong>. Media uploads can now go to your private Avirzo Storage bucket.{' '}
            <button type="button" onClick={handleSignOut}>Sign out</button>
          </div>
        )}
        {authStatus && <div className="heritage-callout">{authStatus}</div>}
      </section>

      <section className="bible-panel project-panel">
        <div className="section-head">
          <div>
            <div className="eyebrow">PROJECT LIBRARY · v2.2</div>
            <h2>Keep your film projects safe.</h2>
            <p>
              Save the story, Heritage Bible, research, storyboard, timeline and export metadata.
              With Supabase enabled, projects are isolated by account and uploaded reference media can live in private object storage.
            </p>
          </div>
          <div className="project-actions">
            <button type="button" onClick={newProject}>+ New project</button>
            <button className="generate" type="button" onClick={saveProject} disabled={projectLoading}>
              {projectLoading ? 'Saving…' : projectId ? 'Save changes' : 'Save project'}
            </button>
          </div>
        </div>
        <div className="project-save-row">
          <input aria-label="Project name" value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="Project name" />
          <span>{projectId ? `Project ID: ${projectId}` : 'Not saved yet'}</span>
        </div>
        <div className="project-folder-row">
          <label>Folder <input value={projectFolder} onChange={e => setProjectFolder(e.target.value)} placeholder="My Films" /></label>
          <label>Show <select value={projectFolderFilter} onChange={e => setProjectFolderFilter(e.target.value)}>{projectFolders.map(folder => <option key={folder} value={folder}>{folder}</option>)}</select></label>
        </div>
        {projectStatus && <div className="heritage-callout">🗂 {projectStatus}</div>}

        {supabaseEnabled && authUser && projectId && (
          <div className="asset-panel">
            <div className="section-head">
              <div>
                <div className="eyebrow">DURABLE MEDIA ASSETS</div>
                <h3>Your private generated media</h3>
                <p>Runway result URLs expire; Avirzo copies completed renders and final exports into your private Storage bucket.</p>
              </div>
              <button type="button" onClick={refreshAssets}>Refresh</button>
            </div>
            {assetStatus && <div className="heritage-callout">☁️ {assetStatus}</div>}
            {assets.length ? (
              <div className="asset-list">
                {assets.map(a => (
                  <article className="asset-card" key={a.id}>
                    <div>
                      <strong>{a.name}</strong>
                      <span>
                        {a.kind} · {a.mime_type || 'media'} · {a.size_bytes ? `${Math.round(a.size_bytes / 1024 / 1024 * 10) / 10} MB` : ''}
                      </span>
                    </div>
                    <div>
                      <button type="button" onClick={async () => { const u = await openAsset(a.id); if (u) window.open(u, '_blank', 'noopener,noreferrer'); }}>Open</button>
                      <button type="button" onClick={() => deleteAsset(a.id)}>Delete</button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="heritage-callout">No durable generated assets yet. Generate a scene or export a film after saving this project.</div>
            )}
          </div>
        )}

        <div className="project-list">
          {visibleProjects.length ? visibleProjects.map(p => (
            <article className="project-card" key={p.id}>
              <div>
                <strong>{p.name}</strong>
                <span>{p.folder || 'My Films'} · {new Date(p.updatedAt).toLocaleString()} · {p.sceneCount || 0} scenes · {p.characterCount || 0} characters</span>
              </div>
              <div>
                <button type="button" onClick={() => loadProject(p.id)}>Open</button>
                <button type="button" onClick={() => deleteProject(p.id)}>Delete</button>
              </div>
            </article>
          )) : (
            <div className="heritage-callout">No saved projects yet. Name this film and choose Save project.</div>
          )}
        </div>
      </section>
    </>
  );
}
