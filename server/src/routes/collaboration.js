import crypto from 'node:crypto';

export function registerRoutes(app, ctx) {
  const { supabaseAdmin, requireCloudUser } = ctx;
  const roles = new Set(['owner','editor','commenter','viewer']);

  async function ensureMember(user, projectId) {
    if (!supabaseAdmin || !user) return null;
    const email = String(user.email || '').toLowerCase();
    if (email) {
      const { data: invites } = await supabaseAdmin.from('avirzo_project_invites').select('id,role').eq('project_id', projectId).eq('email', email).eq('status','pending');
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
      for (const id of ids) { const {data:profile} = await supabaseAdmin.auth.admin.getUserById(id); profiles[id] = profile?.user || {}; }
      const members = [{ user_id: owner.data?.user_id, role:'owner', email: profiles[owner.data?.user_id]?.email || '' }, ...(data||[]).map(x=>({ ...x, email: profiles[x.user_id]?.email || '' }))];
      return res.json({role,members});
    } catch(e) { return res.status(500).json({message:e.message || 'Could not load collaboration settings.'}); }
  });

  app.post('/api/collaboration/projects/:id/members', async (req,res) => {
    const user = await requireCloudUser(req,res); if (!user) return;
    try {
      if (await roleFor(user, req.params.id) !== 'owner') return res.status(403).json({message:'Only the project owner can invite collaborators.'});
      const email = String(req.body?.email || '').trim().toLowerCase();
      const role = String(req.body?.role || 'editor');
      if (!email || !email.includes('@')) return res.status(400).json({message:'A valid collaborator email is required.'});
      if (!roles.has(role) || role === 'owner') return res.status(400).json({message:'Choose editor, commenter or viewer.'});
      const {data,error} = await supabaseAdmin.from('avirzo_project_invites').upsert({ project_id:req.params.id, email, role, status:'pending', token:crypto.randomBytes(18).toString('hex') }, {onConflict:'project_id,email'}).select('token,role,email').single();
      if(error) throw error;
      const base = String(process.env.AVIRZO_PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || '').replace(/\/$/,'');
      return res.status(201).json({invite:data,shareLink:base ? `${base}/?invite=${data.token}` : `Invite token: ${data.token}`});
    } catch(e) { return res.status(500).json({message:e.message || 'Could not create invitation.'}); }
  });

  app.patch('/api/collaboration/projects/:id/members/:userId', async (req,res) => {
    const user = await requireCloudUser(req,res); if (!user) return;
    try {
      if (await roleFor(user, req.params.id) !== 'owner') return res.status(403).json({message:'Only the project owner can change roles.'});
      const role = String(req.body?.role || 'viewer'); if (!['editor','commenter','viewer'].includes(role)) return res.status(400).json({message:'Invalid role.'});
      const {error} = await supabaseAdmin.from('avirzo_project_members').update({role}).eq('project_id',req.params.id).eq('user_id',req.params.userId); if(error) throw error;
      res.json({ok:true,role});
    } catch(e) { res.status(500).json({message:e.message || 'Could not change role.'}); }
  });

  app.delete('/api/collaboration/projects/:id/members/:userId', async (req,res) => {
    const user = await requireCloudUser(req,res); if (!user) return;
    try {
      if (await roleFor(user, req.params.id) !== 'owner') return res.status(403).json({message:'Only the project owner can remove collaborators.'});
      const {error} = await supabaseAdmin.from('avirzo_project_members').delete().eq('project_id',req.params.id).eq('user_id',req.params.userId); if(error) throw error;
      res.json({ok:true});
    } catch(e) { res.status(500).json({message:e.message || 'Could not remove collaborator.'}); }
  });
}
