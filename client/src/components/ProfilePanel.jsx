import React from 'react';
import { supabaseEnabled } from '../supabase';

export function ProfilePanel({ authUser, authEmail, setAuthEmail, authPassword, setAuthPassword, authMode, setAuthMode, authStatus, authLoading, handleAuth, handleSignOut }) {
  const initial = authUser?.email?.slice(0, 1)?.toUpperCase() || 'A';
  return (
    <div className="profile-page-premium">
      <section className="profile-hero-premium">
        <div>
          <div className="eyebrow">CREATOR · AVIRZO</div>
          <h1>Your creative identity.</h1>
          <p>A quiet home for the filmmaker behind the work — your account, identity and African cinema workspace.</p>
        </div>
        <div className="profile-hero-mark" aria-hidden="true">{initial}</div>
      </section>

      <section className="profile-identity-band">
        <div className="profile-identity-main">
          <div className="profile-avatar-large">{initial}</div>
          <div className="profile-identity-copy">
            <div className="eyebrow">FILMMAKER</div>
            <h2>{authUser?.email || 'Guest creator'}</h2>
            <p>{authUser ? 'Private projects and production media are connected to this account.' : 'Sign in to save projects and generated media to your private workspace.'}</p>
          </div>
        </div>
        {authUser ? (
          <button type="button" className="profile-secondary-action" onClick={handleSignOut}>Sign out</button>
        ) : supabaseEnabled ? (
          <div className="auth-form profile-auth-form">
            <input aria-label="Email" type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="Email" />
            <input aria-label="Password" type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} placeholder="Password" />
            <button className="generate" onClick={handleAuth} disabled={authLoading}>{authLoading ? 'Please wait…' : authMode === 'signup' ? 'Create account' : 'Sign in'}</button>
            <button className="plain-action" type="button" onClick={() => setAuthMode(authMode === 'signup' ? 'signin' : 'signup')}>{authMode === 'signup' ? 'Already have an account? Sign in' : 'Create a new account'}</button>
          </div>
        ) : (
          <div className="heritage-callout">Cloud account sign-in is not configured in this deployment yet.</div>
        )}
        {authStatus && <div className="heritage-callout profile-status">{authStatus}</div>}
      </section>

      <section className="profile-editorial-grid">
        <article className="profile-editorial-card profile-focus-card">
          <div className="eyebrow">CREATIVE FOCUS</div>
          <h2>African roots &amp; cinema</h2>
          <p>Avirzo is designed for filmmakers who want culture, history, language and heritage to remain part of the filmmaking process — from the first idea to the final shot.</p>
          <div className="profile-tag-row">
            <span>Heritage-first</span><span>Story-led</span><span>Cinematic</span>
          </div>
        </article>

        <article className="profile-editorial-card">
          <div className="eyebrow">WORKSPACE</div>
          <div className="profile-detail-list">
            <div><span>Studio</span><strong>Heritage Studio</strong></div>
            <div><span>Region</span><strong>Uganda · East Africa</strong></div>
            <div><span>Platform</span><strong>Web · Android · iOS</strong></div>
          </div>
        </article>
      </section>

      <section className="profile-manifesto">
        <div className="eyebrow">THE AVIRZO APPROACH</div>
        <p>Tell stories from the roots outward — with cultural memory, place, language and people treated as part of the craft.</p>
      </section>
    </div>
  );
}
