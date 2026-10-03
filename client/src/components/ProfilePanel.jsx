import React from 'react';
import { supabaseEnabled } from '../supabase';

export function ProfilePanel({ authUser, authEmail, setAuthEmail, authPassword, setAuthPassword, authMode, setAuthMode, authStatus, authLoading, handleAuth, handleSignOut }) {
  return (
    <div className="page-stack">
      <section className="page-heading">
        <div className="eyebrow">CREATOR PROFILE</div>
        <h1>Your Avirzo profile</h1>
        <p>Manage your creator account and the identity used across your filmmaking workspace.</p>
      </section>
      <section className="profile-grid">
        <div className="bible-panel profile-card">
          <div className="profile-avatar-large">{authUser?.email?.slice(0, 1)?.toUpperCase() || 'A'}</div>
          <div className="eyebrow">ACCOUNT</div>
          <h2>{authUser?.email || 'Guest creator'}</h2>
          <p>{authUser ? 'Your private projects and media can be connected to this account.' : 'Sign in to save projects and generated media to your private workspace.'}</p>
          {authUser ? (
            <button type="button" className="generate" onClick={handleSignOut}>Sign out</button>
          ) : supabaseEnabled ? (
            <div className="auth-form">
              <input aria-label="Email" type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="Email" />
              <input aria-label="Password" type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} placeholder="Password" />
              <button className="generate" onClick={handleAuth} disabled={authLoading}>{authLoading ? 'Please wait…' : authMode === 'signup' ? 'Create account' : 'Sign in'}</button>
              <button type="button" onClick={() => setAuthMode(authMode === 'signup' ? 'signin' : 'signup')}>{authMode === 'signup' ? 'Already have an account? Sign in' : 'Create a new account'}</button>
            </div>
          ) : (
            <div className="heritage-callout">Cloud account sign-in is not configured in this deployment yet.</div>
          )}
          {authStatus && <div className="heritage-callout">{authStatus}</div>}
        </div>
        <div className="bible-panel profile-card">
          <div className="eyebrow">CREATOR IDENTITY</div>
          <h2>About your workspace</h2>
          <p>Avirzo is built around African heritage filmmaking. Your workspace keeps story development, cultural research, characters, scenes, voices and production together.</p>
          <div className="profile-facts">
            <div><span>Focus</span><strong>African roots & cinema</strong></div>
            <div><span>Studio</span><strong>Heritage Studio</strong></div>
            <div><span>Version</span><strong>2.8.5</strong></div>
          </div>
        </div>
      </section>
    </div>
  );
}
