import React from 'react';
import { supabaseEnabled } from '../supabase';

export function ProfilePanel({
  authUser, authEmail, setAuthEmail, authPassword, setAuthPassword,
  authMode, setAuthMode, authStatus, authLoading, handleAuth, handleSignOut,
  authDisplayName, setAuthDisplayName, profileEmail, setProfileEmail,
  profilePassword, setProfilePassword, profileSaving, handleProfileSave,
  handlePasswordReset, handlePasswordChange
}) {
  const displayName = authUser?.user_metadata?.full_name || authUser?.user_metadata?.display_name || authDisplayName || '';
  const identity = displayName || authUser?.email || 'Guest creator';
  const initial = String(identity).trim().slice(0, 1).toUpperCase() || 'A';

  return (
    <div className="profile-page-premium">
      <section className="profile-hero-premium">
        <div>
          <div className="eyebrow">CREATOR · AVIRZO</div>
          <h1>Your creative identity.</h1>
          <p>Manage your Avirzo account, sign-in security and filmmaker profile.</p>
        </div>
        <div className="profile-hero-mark" aria-hidden="true">{initial}</div>
      </section>

      <section className="profile-identity-band">
        <div className="profile-identity-main">
          <div className="profile-avatar-large">{initial}</div>
          <div className="profile-identity-copy">
            <div className="eyebrow">FILMMAKER ACCOUNT</div>
            <h2>{identity}</h2>
            <p>{authUser ? `Private projects and production media are connected to ${authUser.email || 'this account'}.` : 'Sign in to save projects and generated media to your private workspace.'}</p>
          </div>
        </div>
        {authUser && <button type="button" className="profile-secondary-action" onClick={handleSignOut} disabled={authLoading}>Sign out</button>}
      </section>

      {!authUser ? (
        <section className="profile-account-card">
          <div className="eyebrow">{authMode === 'signup' ? 'JOIN AVIRZO' : 'WELCOME BACK'}</div>
          <h2>{authMode === 'signup' ? 'Create your filmmaker account' : 'Sign in to your workspace'}</h2>
          <p>{authMode === 'signup' ? 'Your account keeps projects and private media associated with you.' : 'Use the email address associated with your Avirzo account.'}</p>
          {supabaseEnabled ? (
            <form className="auth-form profile-auth-form" onSubmit={e => { e.preventDefault(); handleAuth(); }}>
              {authMode === 'signup' && <input aria-label="Display name" autoComplete="name" value={authDisplayName} onChange={e => setAuthDisplayName(e.target.value)} placeholder="Your name" maxLength={80} />}
              <input aria-label="Email" autoComplete="email" type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="Email address" required />
              <input aria-label="Password" autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'} type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} placeholder={authMode === 'signup' ? 'Password (at least 8 characters)' : 'Password'} minLength={authMode === 'signup' ? 8 : undefined} required />
              <button className="generate" type="submit" disabled={authLoading}>{authLoading ? 'Please wait…' : authMode === 'signup' ? 'Create account' : 'Sign in'}</button>
              {authMode === 'signin' && <button className="plain-action" type="button" onClick={handlePasswordReset} disabled={authLoading}>Forgot password?</button>}
              <button className="plain-action profile-auth-switch" type="button" onClick={() => setAuthMode(authMode === 'signup' ? 'signin' : 'signup')} disabled={authLoading}>{authMode === 'signup' ? 'Already have an account? Sign in' : 'New to Avirzo? Create an account'}</button>
            </form>
          ) : <div className="heritage-callout">Cloud account sign-in is not configured in this deployment yet.</div>}
        </section>
      ) : (
        <>
          <section className="profile-account-card">
            <div className="eyebrow">ACCOUNT DETAILS</div>
            <h2>Your profile</h2>
            <p>Update your display name or email address. Email changes may require confirmation from your new inbox.</p>
            <form className="profile-details-form" onSubmit={e => { e.preventDefault(); handleProfileSave(); }}>
              <label>Display name
                <input autoComplete="name" value={authDisplayName} onChange={e => setAuthDisplayName(e.target.value)} placeholder="Your name" maxLength={80} required />
              </label>
              <label>Email address
                <input autoComplete="email" type="email" value={profileEmail} onChange={e => setProfileEmail(e.target.value)} placeholder="you@example.com" required />
              </label>
              <button className="generate" type="submit" disabled={profileSaving}>{profileSaving ? 'Saving…' : 'Save profile'}</button>
            </form>
          </section>

          <section className="profile-account-card">
            <div className="eyebrow">ACCOUNT SECURITY</div>
            <h2>Change password</h2>
            <p>Choose a new password with at least eight characters.</p>
            <form className="profile-details-form" onSubmit={e => { e.preventDefault(); handlePasswordChange(); }}>
              <label>New password
                <input autoComplete="new-password" type="password" value={profilePassword} onChange={e => setProfilePassword(e.target.value)} placeholder="Enter a new password" minLength={8} required />
              </label>
              <button className="generate" type="submit" disabled={profileSaving}>{profileSaving ? 'Updating…' : 'Update password'}</button>
            </form>
            <button className="plain-action profile-reset-action" type="button" onClick={handlePasswordReset} disabled={authLoading}>Send password-reset email instead</button>
          </section>
        </>
      )}

      {authStatus && <div className="heritage-callout profile-status-message" role="status" aria-live="polite">{authStatus}</div>}

      <section className="profile-editorial-grid">
        <article className="profile-editorial-card profile-focus-card">
          <div className="eyebrow">CREATIVE FOCUS</div>
          <h2>African roots &amp; cinema</h2>
          <p>Avirzo is designed for filmmakers who want culture, history, language and heritage to remain part of the filmmaking process — from the first idea to the final shot.</p>
          <div className="profile-tag-row"><span>Heritage-first</span><span>Story-led</span><span>Cinematic</span></div>
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
