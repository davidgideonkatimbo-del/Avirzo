import React from 'react';

const NAV_GROUPS = [
  {
    label: 'CREATE',
    items: [
      { id: 'studio', label: 'Studio', icon: '✦' },
      { id: 'story', label: 'Story', icon: '✎' },
      { id: 'scenes', label: 'Scenes', icon: '▤' },
      { id: 'timeline', label: 'Timeline', icon: '▥' },
    ],
  },
  {
    label: 'LIBRARY',
    items: [
      { id: 'projects', label: 'Projects', icon: '▣' },
      { id: 'assets', label: 'Assets', icon: '▧' },
      { id: 'exports', label: 'Exports & Jobs', icon: '⇩' },
    ],
  },
  {
    label: 'AVIRZO',
    items: [
      { id: 'heritage', label: 'Heritage', icon: '◈' },
      { id: 'voices', label: 'Voices', icon: '◉' },
    ],
  },
];

const NAV = NAV_GROUPS.flatMap(group => group.items);
const NAV_LOOKUP = [{ id: 'home', label: 'Home', icon: '⌂' }, ...NAV];

const BOTTOM = ['home', 'studio', 'projects', 'heritage', 'more'];
const MORE_GROUPS = [
  { label: 'CREATE', items: [
    { id: 'story', label: 'Story', icon: '✎' },
    { id: 'scenes', label: 'Scenes', icon: '▤' },
    { id: 'timeline', label: 'Timeline', icon: '▥' },
  ]},
  { label: 'LIBRARY', items: [
    { id: 'assets', label: 'Assets', icon: '▧' },
    { id: 'exports', label: 'Exports & Jobs', icon: '⇩' },
  ]},
  { label: 'AVIRZO', items: [
    { id: 'voices', label: 'Voices', icon: '◉' },
    { id: 'heritage', label: 'Heritage', icon: '◈' },
  ]},
  { label: 'ACCOUNT', items: [
    { id: 'profile', label: 'Profile', icon: '●' },
    { id: 'settings', label: 'Settings', icon: '⚙' },
  ]},
];
const MORE = MORE_GROUPS.flatMap(group => group.items);

export function AppShell({ page, navigate, authUser, projectId, projectName, inProjectRoute, children }) {
  const [moreOpen, setMoreOpen] = React.useState(false);
  const [keyboardOpen, setKeyboardOpen] = React.useState(false);
  React.useEffect(() => {
    if (!moreOpen) return undefined;
    const onKey = e => { if (e.key === 'Escape') setMoreOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [moreOpen]);
  React.useEffect(() => {
    const isField = el => el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);
    let blurTimer;
    const onFocusIn = e => {
      if (isField(e.target)) {
        window.clearTimeout(blurTimer);
        setKeyboardOpen(true);
      }
    };
    const onFocusOut = () => {
      window.clearTimeout(blurTimer);
      blurTimer = window.setTimeout(() => {
        const active = document.activeElement;
        setKeyboardOpen(isField(active));
      }, 120);
    };
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    return () => {
      window.clearTimeout(blurTimer);
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
    };
  }, []);
  const active = inProjectRoute ? 'projects' : (NAV_LOOKUP.some(x => x.id === page) || page === 'profile' || page === 'settings' ? page : 'home');

  return (
    <div className={`app-shell${keyboardOpen ? ' keyboard-open' : ''}`}>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <aside className="app-sidebar">
        <button className="sidebar-brand" type="button" onClick={() => navigate('home')} aria-label="Avirzo home">
          <span className="brand-mark">A</span>
          <span>AVIRZO</span>
        </button>
        <div className="sidebar-caption">AFRICAN CINEMA</div>
        {NAV_GROUPS.map(group => (
          <div className="sidebar-nav-group" key={group.label}>
            <div className="sidebar-group-label">{group.label}</div>
            <nav className="sidebar-nav" aria-label={`${group.label} navigation`}>
              {group.items.map(item => (
                <button key={item.id} type="button" className={active === item.id ? 'active' : ''} aria-current={active === item.id ? 'page' : undefined} onClick={() => navigate(item.id)}>
                  <span className="nav-icon" aria-hidden="true">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          </div>
        ))}
        <div className="sidebar-divider" />
        <nav className="sidebar-secondary" aria-label="Account navigation">
          <button type="button" className={page === 'profile' ? 'active' : ''} aria-current={page === 'profile' ? 'page' : undefined} onClick={() => navigate('profile')}>
            <span className="nav-icon" aria-hidden="true">●</span><span>Profile</span>
          </button>
          <button type="button" className={page === 'settings' ? 'active' : ''} aria-current={page === 'settings' ? 'page' : undefined} onClick={() => navigate('settings')}>
            <span className="nav-icon" aria-hidden="true">⚙</span><span>Settings</span>
          </button>
        </nav>
        <div className="sidebar-footer">
          <div className="account-mini">
            <span className="account-avatar">{authUser?.email?.slice(0, 1)?.toUpperCase() || 'A'}</span>
            <span>{authUser?.email || 'Creator workspace'}</span>
          </div>
          <small>v2.9.5</small>
        </div>
      </aside>

      <div className="app-main-shell">
        <header className="app-topbar">
          <div className="mobile-brand">
            <span className="brand-mark">A</span><span>AVIRZO</span>
          </div>
          <div className="topbar-page-title">{NAV_LOOKUP.find(x => x.id === active)?.label || (page === 'profile' ? 'Profile' : 'Settings')} {inProjectRoute && projectName ? <span className="topbar-project-context">· {projectName}</span> : null}</div>
          <button className="topbar-profile" type="button" onClick={() => navigate('profile')} aria-label="Open profile">
            {authUser?.email?.slice(0, 1)?.toUpperCase() || 'A'}
          </button>
        </header>
        <main id="main-content" tabIndex={-1} className="page-content">{inProjectRoute && projectId ? <div className="project-context-bar"><button type="button" onClick={() => navigate(`project/${projectId}/overview`)}>← {projectName || 'Current project'}</button><span>Project workspace</span></div> : null}{children}</main>
      </div>

      {moreOpen && (
        <div className="mobile-more-sheet" role="dialog" aria-modal="true" aria-label="More Avirzo pages">
          <button className="mobile-more-backdrop" type="button" aria-label="Close menu" onClick={() => setMoreOpen(false)} />
          <div className="mobile-more-panel">
            <div className="mobile-more-head"><strong>AVIRZO</strong><button type="button" onClick={() => setMoreOpen(false)}>Close</button></div>
            <div className="mobile-more-groups">
              {MORE_GROUPS.map(group => (
                <section className="mobile-more-group" key={group.label}>
                  <div className="mobile-more-label">{group.label}</div>
                  <div className="mobile-more-grid">
                    {group.items.map(item => (
                      <button key={item.id} type="button" className={page === item.id ? 'active' : ''} aria-current={page === item.id ? 'page' : undefined} onClick={() => { setMoreOpen(false); navigate(item.id); }}>
                        <span aria-hidden="true">{item.icon}</span><strong>{item.label}</strong>
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      )}
      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        {BOTTOM.map(id => {
          if (id === 'more') return <button key="more" type="button" className={moreOpen ? 'active' : ''} aria-haspopup="dialog" aria-expanded={moreOpen} onClick={() => setMoreOpen(v => !v)}><span aria-hidden="true">☰</span><small>More</small></button>;
          const item = NAV_LOOKUP.find(x => x.id === id);
          return <button key={id} type="button" className={(inProjectRoute ? id === 'projects' : page === id) ? 'active' : ''} aria-current={(inProjectRoute ? id === 'projects' : page === id) ? 'page' : undefined} onClick={() => navigate(id)}><span aria-hidden="true">{item.icon}</span><small>{item.label}</small></button>;
        })}
      </nav>
    </div>
  );
}
