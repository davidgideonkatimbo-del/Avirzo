import path from 'node:path';

export function registerRoutes(app, ctx) {
  const { supabase, supabaseAdmin, projectStore, safeProjectId, normalizeProject, requireCloudUser, userDb, PROJECT_DIR } = ctx;

  async function projectRole(userId, projectId) {
    if (!supabaseAdmin) return null;
    const { data: owner, error: ownerError } = await supabaseAdmin
      .from('avirzo_projects')
      .select('user_id')
      .eq('id', projectId)
      .maybeSingle();
    if (ownerError) throw ownerError;
    if (owner?.user_id === userId) return 'owner';

    const { data: member, error: memberError } = await supabaseAdmin
      .from('avirzo_project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .maybeSingle();
    if (memberError) throw memberError;
    return member?.role || null;
  }

  async function claimInvites(user) {
    if (!supabaseAdmin || !user?.email || !(user.email_confirmed_at || user.confirmed_at)) return;
    const { data: invites, error } = await supabaseAdmin
      .from('avirzo_project_invites')
      .select('id,project_id,role')
      .eq('email', String(user.email).toLowerCase())
      .eq('status', 'pending');
    if (error) throw error;
    for (const invite of invites || []) {
      const { error: memberError } = await supabaseAdmin
        .from('avirzo_project_members')
        .upsert({ project_id: invite.project_id, user_id: user.id, role: invite.role }, { onConflict: 'project_id,user_id' });
      if (memberError) throw memberError;
      const { error: inviteError } = await supabaseAdmin
        .from('avirzo_project_invites')
        .update({ status: 'accepted', accepted_at: new Date().toISOString() })
        .eq('id', invite.id);
      if (inviteError) throw inviteError;
    }
  }

  function publicProject(row) {
    return {
      ...(row.payload || {}),
      id: row.id,
      name: row.name,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  app.get('/api/projects', async (req, res) => {
    try {
      if (supabase) {
        const user = await requireCloudUser(req, res);
        if (!user) return;
        await claimInvites(user);

        const { data: memberRows, error: memberError } = await supabaseAdmin
          .from('avirzo_project_members')
          .select('project_id')
          .eq('user_id', user.id);
        if (memberError) throw memberError;

        const ids = (memberRows || []).map(x => x.project_id);
        let q = supabaseAdmin
          .from('avirzo_projects')
          .select('id,name,created_at,updated_at,payload')
          .order('updated_at', { ascending: false });
        q = ids.length
          ? q.or(`user_id.eq.${user.id},id.in.(${ids.join(',')})`)
          : q.eq('user_id', user.id);
        const { data, error } = await q;
        if (error) throw error;

        return res.json({
          projects: (data || []).map(p => ({
            id: p.id,
            name: p.name,
            createdAt: p.created_at,
            updatedAt: p.updated_at,
            folder: p.payload?.folder || 'My Films',
            sceneCount: Array.isArray(p.payload?.scenes) ? p.payload.scenes.length : 0,
            characterCount: Array.isArray(p.payload?.characters) ? p.payload.characters.length : 0
          }))
        });
      }

      const fs = await projectStore();
      const names = await fs.readdir(PROJECT_DIR);
      const projects = [];
      for (const n of names.filter(x => x.endsWith('.json'))) {
        try {
          const p = JSON.parse(await fs.readFile(path.join(PROJECT_DIR, n), 'utf8'));
          projects.push({
            id: p.id,
            name: p.name,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
            folder: p.folder || 'My Films',
            sceneCount: Array.isArray(p.scenes) ? p.scenes.length : 0,
            characterCount: Array.isArray(p.characters) ? p.characters.length : 0
          });
        } catch {}
      }
      projects.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
      return res.json({ projects });
    } catch (e) {
      console.error('Project library read failed:', e);
      return res.status(500).json({ message: 'Could not read project library.', code: e?.code || 'PROJECT_LIBRARY_READ_FAILED' });
    }
  });

  app.get('/api/projects/:id', async (req, res) => {
    try {
      if (supabase) {
        const user = await requireCloudUser(req, res);
        if (!user) return;
        const { data, error } = await supabaseAdmin
          .from('avirzo_projects')
          .select('id,name,created_at,updated_at,payload,user_id')
          .eq('id', req.params.id)
          .maybeSingle();
        if (error) throw error;
        if (!data) return res.status(404).json({ message: 'Project not found.' });
        const role = data.user_id === user.id ? 'owner' : await projectRole(user.id, req.params.id);
        if (!role) return res.status(403).json({ message: 'You do not have access to this project.' });
        return res.json({ project: publicProject(data) });
      }

      const fs = await projectStore();
      const p = JSON.parse(await fs.readFile(path.join(PROJECT_DIR, `${safeProjectId(req.params.id)}.json`), 'utf8'));
      return res.json({ project: p });
    } catch (e) {
      console.error(`Project ${req.params.id} read failed:`, e);
      if (e?.code === 'PGRST116' || e?.code === '22P02') return res.status(404).json({ message: 'Project not found.' });
      return res.status(500).json({ message: 'Could not load project.', code: e?.code || 'PROJECT_LOAD_FAILED' });
    }
  });

  app.post('/api/projects', async (req, res) => {
    try {
      if (supabase) {
        const user = await requireCloudUser(req, res);
        if (!user) return;
        const p = normalizeProject(req.body || {});
        const { data, error } = await supabaseAdmin
          .from('avirzo_projects')
          .insert({ user_id: user.id, name: p.name, payload: p })
          .select('id,name,created_at,updated_at,payload,user_id')
          .single();
        if (error) throw error;
        if (!data?.id) throw new Error('Project was not assigned a database id.');

        // The database response is the save confirmation. Never report success before this point.
        const { data: verified, error: verifyError } = await supabaseAdmin
          .from('avirzo_projects')
          .select('id,name,created_at,updated_at,payload,user_id')
          .eq('id', data.id)
          .eq('user_id', user.id)
          .maybeSingle();
        if (verifyError) throw verifyError;
        if (!verified) throw new Error('Project write could not be verified after saving.');
        return res.status(201).json({ project: publicProject(verified), verified: true });
      }

      const fs = await projectStore();
      const p = normalizeProject(req.body || {});
      await fs.writeFile(path.join(PROJECT_DIR, `${p.id}.json`), JSON.stringify(p, null, 2), 'utf8');
      const verify = JSON.parse(await fs.readFile(path.join(PROJECT_DIR, `${p.id}.json`), 'utf8'));
      if (!verify?.id) throw new Error('Project write could not be verified.');
      return res.status(201).json({ project: verify, verified: true });
    } catch (e) {
      console.error('Project create failed:', e);
      return res.status(500).json({ message: 'Could not save project.', code: e?.code || 'PROJECT_CREATE_FAILED' });
    }
  });

  app.put('/api/projects/:id', async (req, res) => {
    try {
      if (supabase) {
        const user = await requireCloudUser(req, res);
        if (!user) return;
        const role = await projectRole(user.id, req.params.id);
        if (!['owner', 'editor'].includes(role)) return res.status(403).json({ message: 'Editor access is required to modify this project.' });

        const { data: old, error: oldError } = await supabaseAdmin
          .from('avirzo_projects')
          .select('payload,name,created_at,user_id')
          .eq('id', req.params.id)
          .maybeSingle();
        if (oldError) throw oldError;
        if (!old) return res.status(404).json({ message: 'Project not found.' });

        const p = normalizeProject(
          { ...old.payload, ...req.body, id: req.params.id },
          { id: req.params.id, name: old.name, createdAt: old.created_at }
        );
        const { data, error } = await supabaseAdmin
          .from('avirzo_projects')
          .update({ name: p.name, payload: p, updated_at: new Date().toISOString() })
          .eq('id', req.params.id)
          .eq('user_id', old.user_id)
          .select('id,name,created_at,updated_at,payload,user_id')
          .single();
        if (error) throw error;

        const { data: verified, error: verifyError } = await supabaseAdmin
          .from('avirzo_projects')
          .select('id,name,created_at,updated_at,payload,user_id')
          .eq('id', req.params.id)
          .eq('user_id', old.user_id)
          .maybeSingle();
        if (verifyError) throw verifyError;
        if (!verified) throw new Error('Project update could not be verified after saving.');
        return res.json({ project: publicProject(verified), verified: true });
      }

      const id = safeProjectId(req.params.id);
      const fs = await projectStore();
      const file = path.join(PROJECT_DIR, `${id}.json`);
      let existing = {};
      try { existing = JSON.parse(await fs.readFile(file, 'utf8')); } catch {}
      const p = normalizeProject({ ...req.body, id }, existing);
      await fs.writeFile(file, JSON.stringify(p, null, 2), 'utf8');
      const verify = JSON.parse(await fs.readFile(file, 'utf8'));
      if (!verify?.id) throw new Error('Project update could not be verified.');
      return res.json({ project: verify, verified: true });
    } catch (e) {
      console.error(`Project ${req.params.id} update failed:`, e);
      return res.status(500).json({ message: 'Could not update project.', code: e?.code || 'PROJECT_UPDATE_FAILED' });
    }
  });

  app.delete('/api/projects/:id', async (req, res) => {
    try {
      if (supabase) {
        const user = await requireCloudUser(req, res);
        if (!user) return;
        if (await projectRole(user.id, req.params.id) !== 'owner') return res.status(403).json({ message: 'Only the project owner can delete a shared project.' });
        const { error } = await supabaseAdmin.from('avirzo_projects').delete().eq('id', req.params.id).eq('user_id', user.id);
        if (error) throw error;
        return res.json({ ok: true });
      }
      const fs = await projectStore();
      await fs.unlink(path.join(PROJECT_DIR, `${safeProjectId(req.params.id)}.json`));
      return res.json({ ok: true });
    } catch (e) {
      console.error(`Project ${req.params.id} delete failed:`, e);
      return res.status(404).json({ message: 'Project not found.' });
    }
  });
}
