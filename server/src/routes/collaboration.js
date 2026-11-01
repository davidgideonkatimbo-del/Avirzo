import crypto from 'node:crypto';

export function registerRoutes(app, ctx) {
  const { supabaseAdmin, requireCloudUser } = ctx;
  const roles = new Set(['owner','editor','commenter','viewer']);
  const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
  const isConfirmed = u => Boolean(u?.email_confirmed_at || u?.confirmed_at);

  async function ensureMember(user, projectId) {
    if (!supabaseAdmin || !user) return null;
    const email = String(user.email || '').toLowerCase();
    // An invite is only honored for an address the user has actually confirmed, so nobody can claim it by signing up with someone else's email.
    if (email && (user.email_confirmed_at || user.confirmed_at)) {
      const { data: invites } = await supabaseAdmin.from('avirzo_project_invites').select('id,role').eq('project_id', projectId).eq('email', email).eq('status','pending').or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());
      for (const invite of invites || []) {
        await supabaseAdmin.from('avirzo_project_members').upsert({ project_id: projectId, user_id: user.id, role: invite.role }, { onConflict: 'project_id,user_id' });
        await supabaseAdmin.from('avirzo_project_invites').update({ status: 'accepted', accepted_at: new Date().toISOString() }).eq('id', invite.id);
      }
    }
    const { data } = await supabaseAdmin.from('avirzo_project_members').select('project_id,user_id,role').eq('project_id', projectId).eq('user_id', user.id).maybeSingle();
    return data || null;
  }

  async function roleFor(user, projectId) {
    if (!supabaseAdmin || !user) return null;
    const project = await supabaseAdmin.from('avirzo_projects').select('id,user_id').eq('id', projectId).maybeSingle();
    if (project.data?.user_id === user.id) return 'owner';
    const member = await ensureMember(user, projectId);
    return member?.role || null;
  }

  app.get('/api/collaboration/projects/:id', async (req,res) => {
    const user = await requireCloudUser(req,res); if (!user) return;
    try {
      const role = await roleFor(user, req.params.id);
      if (!role) return res.status(403).json({message:'You do not have access to this project.'});
      const {data,error} = await supabaseAdmin.from('avirzo_project_members').select('user_id,role,created_at').eq('project_id',req.params.id).order('created_at');
      if (error) throw error;
      const owner = await supabaseAdmin.from('avirzo_projects').select('user_id').eq('id',req.params.id).single();
      const ids = [...new Set([owner.data?.user_id, ...(data||[]).map(x=>x.user_id)].filter(Boolean))];
      const profiles = {};
      await Promise.all(ids.map(async id => { const {data:profile} = await supabaseAdmin.auth.admin.getUserById(id); profiles[id] = profile?.user || {}; }));
      const members = [{ user_id: owner.data?.user_id, role:'owner', email: profiles[owner.data?.user_id]?.email || '' }, ...(data||[]).map(x=>({ ...x, email: profiles[x.user_id]?.email || '' }))];
      return res.json({role,members});
    } catch(e) { console.error('collaboration error:', e); return res.status(500).json({message:'Could not load collaboration settings.'}); }
  });

  app.post('/api/collaboration/projects/:id/members', async (req,res) => {
    const user = await requireCloudUser(req,res); if (!user) return;
    try {
      if (await roleFor(user, req.params.id) !== 'owner') return res.status(403).json({message:'Only the project owner can invite collaborators.'});
      const email = String(req.body?.email || '').trim().toLowerCase();
      const role = String(req.body?.role || 'editor');
      if (!email || !email.includes('@')) return res.status(400).json({message:'A valid collaborator email is required.'});
      if (!roles.has(role) || role === 'owner') return res.status(400).json({message:'Choose editor, commenter or viewer.'});
      const token = crypto.randomBytes(18).toString('hex');
      const {data,error} = await supabaseAdmin.from('avirzo_project_invites').upsert({ project_id:req.params.id, email, role, status:'pending', token, expires_at: new Date(Date.now() + INVITE_TTL_MS).toISOString() }, {onConflict:'project_id,email'}).select('id,role,email,token,status').single();
      if(error) throw error;
      const base = String(process.env.AVIRZO_PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || '').replace(/\/$/,'');
      const shareLink = base
        ? (base + '/#/projects?invite=' + encodeURIComponent(data.token || token) + '&email=' + encodeURIComponent(email))
        : '';
      return res.status(201).json({
        invite: data,
        shareLink,
        message: shareLink
          ? 'Invitation saved. Share the link — they get access when they sign in with this email.'
          : 'Invitation saved. The person gets access when they sign in with this email address.'
      });
    } catch(e) { console.error('collaboration error:', e); return res.status(500).json({message:'Could not create invitation.'}); }
  });

  app.patch('/api/collaboration/projects/:id/members/:userId', async (req,res) => {
    const user = await requireCloudUser(req,res); if (!user) return;
    try {
      if (await roleFor(user, req.params.id) !== 'owner') return res.status(403).json({message:'Only the project owner can change roles.'});
      const role = String(req.body?.role || 'viewer'); if (!['editor','commenter','viewer'].includes(role)) return res.status(400).json({message:'Invalid role.'});
      const {error} = await supabaseAdmin.from('avirzo_project_members').update({role}).eq('project_id',req.params.id).eq('user_id',req.params.userId); if(error) throw error;
      res.json({ok:true,role});
    } catch(e) { console.error('collaboration error:', e); res.status(500).json({message:'Could not change role.'}); }
  });

  app.delete('/api/collaboration/projects/:id/members/:userId', async (req,res) => {
    const user = await requireCloudUser(req,res); if (!user) return;
    try {
      if (await roleFor(user, req.params.id) !== 'owner') return res.status(403).json({message:'Only the project owner can remove collaborators.'});
      const {error} = await supabaseAdmin.from('avirzo_project_members').delete().eq('project_id',req.params.id).eq('user_id',req.params.userId); if(error) throw error;
      res.json({ok:true});
    } catch(e) { console.error('collaboration error:', e); res.status(500).json({message:'Could not remove collaborator.'}); }
  });

  app.post('/api/collaboration/accept-invite', async (req, res) => {
    const user = await requireCloudUser(req, res); if (!user) return;
    try {
      const token = String(req.body?.token || '').trim();
      if (!token) return res.status(400).json({ message: 'Invite token is required.' });
      const email = String(user.email || '').trim().toLowerCase();
      if (!email || !isConfirmed(user)) return res.status(403).json({ message: 'Confirm your email address, then open the invite link again.' });
      const { data: invite, error } = await supabaseAdmin
        .from('avirzo_project_invites')
        .select('id,project_id,email,role,status,token,expires_at')
        .eq('token', token)
        .eq('status', 'pending')
        .maybeSingle();
      if (error) throw error;
      if (!invite) return res.status(404).json({ message: 'Invite not found or already used.' });
      if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
        return res.status(410).json({ message: 'This invitation has expired. Ask the project owner to send a new one.' });
      }
      if (String(invite.email || '').toLowerCase() !== email) {
        return res.status(403).json({ message: 'Sign in with the invited email address to join this project.' });
      }
      const { error: memberError } = await supabaseAdmin
        .from('avirzo_project_members')
        .upsert({ project_id: invite.project_id, user_id: user.id, role: invite.role || 'viewer' }, { onConflict: 'project_id,user_id' });
      if (memberError) throw memberError;
      await supabaseAdmin.from('avirzo_project_invites').update({ status: 'accepted', accepted_at: new Date().toISOString() }).eq('id', invite.id);
      return res.json({ ok: true, projectId: invite.project_id, role: invite.role || 'viewer', message: 'You joined the collaboration room.' });
    } catch (e) { console.error('collaboration error:', e);
      return res.status(500).json({ message: 'Could not accept invite.' });
    }
  });

}
