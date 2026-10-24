import React from 'react';

export function AssetsPanel({ authUser, projectId, projectName, assets = [], assetStatus, refreshAssets, openAsset, deleteAsset }) {
  return (
    <section className="bible-panel asset-library-panel">
      <div className="section-head">
        <div><div className="eyebrow">PROJECT MEDIA LIBRARY</div><h2>{projectName || 'Current project'}</h2><p>Reference images, generated clips and archived media stay grouped with the project that created them.</p></div>
        <button type="button" onClick={refreshAssets} disabled={!authUser || !projectId}>Refresh</button>
      </div>
      {!authUser ? <div className="heritage-callout">Sign in from Profile to access private cloud assets.</div> : !projectId ? <div className="heritage-callout">Open or save a project first. Assets are organized inside projects.</div> : assetStatus ? <div className="heritage-callout">☁️ {assetStatus}</div> : null}
      {assets.length ? <div className="asset-library-grid">{assets.map(a => (
        <article className="asset-tile" key={a.id}>
          <div className="asset-tile-preview">{String(a.mime_type || '').startsWith('image/') ? <img src={a.preview_url || ''} alt={a.name ? `Preview of ${a.name}` : "Asset preview"} onError={e => {e.currentTarget.style.display='none';}} /> : <span>{String(a.kind || 'MEDIA').toUpperCase()}</span>}</div>
          <strong title={a.name}>{a.name}</strong><small>{a.kind || 'media'} · {a.mime_type || 'file'}</small>
          <div className="asset-tile-actions"><button type="button" onClick={async()=>{const u=await openAsset(a.id);if(u)window.open(u,'_blank','noopener,noreferrer')}}>Open</button><button type="button" onClick={()=>deleteAsset(a.id)}>Delete</button></div>
        </article>
      ))}</div> : authUser && projectId && <div className="heritage-callout">No durable assets yet. Generate a scene or export a film and Avirzo will archive eligible media here.</div>}
    </section>
  );
}
