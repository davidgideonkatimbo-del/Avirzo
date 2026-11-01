import { notifyOps } from '../services/alerts.js';

// Bump when Terms or Privacy change in a way users must re-accept.
export const LEGAL_VERSION = '2026-10-30';
const MEDIA_BUCKET = 'avirzo-media';
const REPORT_REASONS = ['sexual_content', 'minors', 'impersonation', 'hate_or_violence', 'copyright', 'other'];

export function registerRoutes(app, ctx) {
  const { supabaseAdmin, authUser } = ctx;

  async function requireUser(req, res) {
    const user = await authUser(req);
    if (!user) { res.status(401).json({ message: 'Sign in first.' }); return null; }
    if (!supabaseAdmin) { res.status(503).json({ message: 'Accounts are not configured on this server.' }); return null; }
    return user;
  }

  app.get('/api/account/consent', async (req, res) => {
    try {
      const user = await requireUser(req, res); if (!user) return;
      const { data, error } = await supabaseAdmin.from('avirzo_consents').select('legal_version,likeness_confirmed,accepted_at').eq('user_id', user.id).maybeSingle();
      if (error) throw error;
      res.json({ required: LEGAL_VERSION, accepted: Boolean(data && data.legal_version === LEGAL_VERSION && data.likeness_confirmed), acceptedAt: data?.accepted_at || null });
    } catch (e) { res.status(500).json({ message: 'Could not check your agreement status.' }); }
  });

  app.post('/api/account/consent', async (req, res) => {
    try {
      const user = await requireUser(req, res); if (!user) return;
      if (req.body?.terms !== true || req.body?.likeness !== true) return res.status(400).json({ message: 'You need to accept the Terms and Privacy Policy and confirm the likeness rule to continue.' });
      const { error } = await supabaseAdmin.from('avirzo_consents').upsert({ user_id: user.id, legal_version: LEGAL_VERSION, likeness_confirmed: true, accepted_at: new Date().toISOString() }, { onConflict: 'user_id' });
      if (error) throw error;
      ctx.consentCache?.set(user.id, Date.now());
      res.json({ ok: true, version: LEGAL_VERSION });
    } catch (e) { res.status(500).json({ message: 'Could not save your agreement.' }); }
  });

  // Download everything we hold about the signed-in user (no secrets, no other people's data).
  app.get('/api/account/export', async (req, res) => {
    try {
      const user = await requireUser(req, res); if (!user) return;
      const own = (table, cols) => supabaseAdmin.from(table).select(cols).eq('user_id', user.id).limit(10000);
      const [projects, assets, jobs, billing, credits, ledger, comments, consents, payments] = await Promise.all([
        own('avirzo_projects', '*'),
        own('avirzo_assets', 'id,project_id,kind,name,storage_path,mime_type,size_bytes,created_at'),
        own('avirzo_jobs', 'id,project_id,type,status,created_at,updated_at'),
        own('avirzo_billing_accounts', 'plan,status,provider,current_period_end,updated_at'),
        own('avirzo_credit_balances', '*'),
        own('avirzo_credit_ledger', '*'),
        own('avirzo_project_comments', '*'),
        own('avirzo_consents', '*'),
        own('avirzo_pesapal_orders', 'merchant_reference,kind,item_id,amount,currency,status,created_at,completed_at')
      ]);
      const failed = [['projects', projects], ['assets', assets], ['jobs', jobs], ['billing', billing], ['credits', credits], ['creditLedger', ledger], ['comments', comments], ['consents', consents]].filter(([, r]) => r.error);
      if (failed.length) throw new Error(`export failed for: ${failed.map(([n, r]) => `${n} (${r.error.message})`).join(', ')}`);   // never hand over a silently incomplete export
      const bundle = {
        exportedAt: new Date().toISOString(),
        account: { id: user.id, email: user.email, createdAt: user.created_at, displayName: user.user_metadata?.full_name || user.user_metadata?.display_name || null },
        projects: projects.data || [], assets: assets.data || [], jobs: jobs.data || [], billing: billing.data || [],
        credits: credits.data || [], creditLedger: ledger.data || [], comments: comments.data || [], consents: consents.data || [], payments: payments.data || [],
        note: 'Media files are stored separately; use the signed links in the app to download them.'
      };
      res.set({ 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': 'attachment; filename="avirzo-my-data.json"', 'Cache-Control': 'no-store' });
      res.send(JSON.stringify(bundle, null, 2));
    } catch (e) { console.error('account export failed:', e?.message || e); res.status(500).json({ message: 'Could not prepare your data export.' }); }
  });

  async function removeFolder(prefix) {
    const files = [];
    const walk = async dir => {
      for (let offset = 0; ; offset += 100) {
        const { data, error } = await supabaseAdmin.storage.from(MEDIA_BUCKET).list(dir, { limit: 100, offset });
        if (error) throw error;
        if (!data?.length) break;
        for (const item of data) (item.id ? files.push(`${dir}/${item.name}`) : await walk(`${dir}/${item.name}`));
        if (data.length < 100) break;
      }
    };
    await walk(prefix);
    for (let i = 0; i < files.length; i += 100) {
      const { error } = await supabaseAdmin.storage.from(MEDIA_BUCKET).remove(files.slice(i, i + 100));
      if (error) throw error;
    }
    return files.length;
  }

  async function cancelSubscription(userId) {
    const { data } = await supabaseAdmin.from('avirzo_billing_accounts').select('provider,provider_subscription_id').eq('user_id', userId).maybeSingle();
    const subId = data?.provider_subscription_id;
    const key = process.env.STRIPE_SECRET_KEY;
    if (!subId || !key || (data.provider && data.provider !== 'stripe')) return 'none';
    const r = await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(subId)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(15000) });
    if (!r.ok && r.status !== 404) throw new Error(`Could not cancel the subscription (${r.status}).`);
    return 'cancelled';
  }

  // Permanently delete the account, media and (through foreign-key cascades) every row owned by the user.
  app.delete('/api/account', async (req, res) => {
    try {
      const user = await requireUser(req, res); if (!user) return;
      if (String(req.body?.confirm || '').trim() !== 'DELETE') return res.status(400).json({ message: 'Type DELETE to confirm.' });
      const subscription = await cancelSubscription(user.id);   // stop billing first; abort if that fails
      const files = await removeFolder(user.id);
      const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id);
      if (error) throw error;
      console.log(`[account] deleted user ${String(user.id).slice(0, 8)}… files=${files} subscription=${subscription}`);
      res.json({ ok: true });
    } catch (e) {
      console.error('account deletion failed:', e?.message || e);
      notifyOps('account_delete_failed', e?.message || 'unknown');
      res.status(500).json({ message: 'We could not finish deleting your account. Nothing further was changed; please try again or email support.' });
    }
  });

  // Anyone signed in can report a project, scene or media item.
  app.post('/api/report', async (req, res) => {
    try {
      const user = await requireUser(req, res); if (!user) return;
      const reason = REPORT_REASONS.includes(req.body?.reason) ? req.body.reason : 'other';
      const details = String(req.body?.details || '').slice(0, 2000);
      const projectId = String(req.body?.projectId || '').slice(0, 120) || null;
      const { error } = await supabaseAdmin.from('avirzo_content_reports').insert({ reporter_id: user.id, project_id: projectId, reason, details });
      if (error) throw error;
      notifyOps('content_report', `${reason} (project ${projectId || 'n/a'})`);
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ message: 'Could not send your report. Please email support instead.' }); }
  });

  // Tiny helper exposed for the consent gate in app.js.
  ctx.consentCache = ctx.consentCache || new Map();
  ctx.hasCurrentConsent = async userId => {
    const at = ctx.consentCache.get(userId);
    if (at && Date.now() - at < 10 * 60_000) return true;
    const { data } = await supabaseAdmin.from('avirzo_consents').select('legal_version,likeness_confirmed').eq('user_id', userId).maybeSingle();
    const ok = Boolean(data && data.legal_version === LEGAL_VERSION && data.likeness_confirmed);
    if (ok) ctx.consentCache.set(userId, Date.now());
    return ok;
  };
}
