import path from 'node:path';

export function registerRoutes(app, ctx) {
  const { IS_PRODUCTION, APP_VERSION, supabase, supabaseAdmin, africanProfiles, voiceLanguageSupport, ELEVEN_MODEL, RUNWAY_API, eras, storyTypes, styles, cameras, formats, durations, requireProviderUser, requireProviderAuth, requireRunwayKey, requireVoiceKey, runwayHeaders, normalizeCharacter, characterContinuityLine, buildCinematicPrompt, persistRemoteAsset, requireAssetCloud, projectStore, safeProjectId, normalizeProject, requireCloudUser, userDb, PROJECT_DIR, toSrtTime, acquireExportSlot, ELEVENLABS_API, generationJobs, rateBuckets } = ctx;
  async function projectRole(userId, projectId) {
    if (!supabaseAdmin) return null;
    const {data:owner} = await supabaseAdmin.from('avirzo_projects').select('user_id').eq('id',projectId).maybeSingle();
    if (owner?.user_id === userId) return 'owner';
    const {data:member} = await supabaseAdmin.from('avirzo_project_members').select('role').eq('project_id',projectId).eq('user_id',userId).maybeSingle();
    return member?.role || null;
  }
  async function claimInvites(user) {
    if (!supabaseAdmin || !user?.email) return;
    const {data:invites} = await supabaseAdmin.from('avirzo_project_invites').select('id,project_id,role').eq('email',String(user.email).toLowerCase()).eq('status','pending');
    for (const invite of invites || []) {
      await supabaseAdmin.from('avirzo_project_members').upsert({project_id:invite.project_id,user_id:user.id,role:invite.role},{onConflict:'project_id,user_id'});
      await supabaseAdmin.from('avirzo_project_invites').update({status:'accepted',accepted_at:new Date().toISOString()}).eq('id',invite.id);
    }
  }

  app.get('/api/projects', async (req,res)=>{
  try{
    if(supabase){ const user=await requireCloudUser(req,res); if(!user)return; await claimInvites(user); const {data:memberRows}=await supabaseAdmin.from('avirzo_project_members').select('project_id').eq('user_id',user.id); const ids=(memberRows||[]).map(x=>x.project_id); let q=userDb(req).from('avirzo_projects').select('id,name,created_at,updated_at,payload').order('updated_at',{ascending:false}); q=ids.length?q.or(`user_id.eq.${user.id},id.in.(${ids.join(',')})`):q.eq('user_id',user.id); const {data,error}=await q; if(error)throw error; return res.json({projects:(data||[]).map(p=>({id:p.id,name:p.name,createdAt:p.created_at,updatedAt:p.updated_at,sceneCount:Array.isArray(p.payload?.scenes)?p.payload.scenes.length:0,characterCount:Array.isArray(p.payload?.characters)?p.payload.characters.length:0}))}); }
    const fs=await projectStore(); const names=await fs.readdir(PROJECT_DIR); const projects=[]; for(const n of names.filter(x=>x.endsWith('.json'))){try{const p=JSON.parse(await fs.readFile(path.join(PROJECT_DIR,n),'utf8')); projects.push({id:p.id,name:p.name,createdAt:p.createdAt,updatedAt:p.updatedAt,sceneCount:Array.isArray(p.scenes)?p.scenes.length:0,characterCount:Array.isArray(p.characters)?p.characters.length:0});}catch{}} projects.sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt))); res.json({projects});
  }catch(e){res.status(500).json({message:'Could not read project library.'});}
});

app.get('/api/projects/:id', async (req,res)=>{
  try{
    if(supabase){ const user=await requireCloudUser(req,res); if(!user)return; const {data,error}=await userDb(req).from('avirzo_projects').select('id,name,created_at,updated_at,payload').eq('id',req.params.id).maybeSingle(); if(error)throw error; if(!data)return res.status(404).json({message:'Project not found.'}); const role=await projectRole(user.id,req.params.id); if(!role)return res.status(403).json({message:'You do not have access to this project.'}); return res.json({project:{...data.payload,id:data.id,name:data.name,createdAt:data.created_at,updatedAt:data.updated_at}}); }
    const fs=await projectStore(); const p=JSON.parse(await fs.readFile(path.join(PROJECT_DIR,`${safeProjectId(req.params.id)}.json`),'utf8')); res.json({project:p});
  }catch(e){res.status(404).json({message:'Project not found.'});}
});

app.post('/api/projects', async (req,res)=>{
  try{
    if(supabase){ const user=await requireCloudUser(req,res); if(!user)return; const p=normalizeProject(req.body||{}); const {data,error}=await userDb(req).from('avirzo_projects').insert({user_id:user.id,name:p.name,payload:p}).select('id,name,created_at,updated_at,payload').single(); if(error)throw error; return res.status(201).json({project:{...data.payload,id:data.id,name:data.name,createdAt:data.created_at,updatedAt:data.updated_at}}); }
    const fs=await projectStore(); const p=normalizeProject(req.body||{}); await fs.writeFile(path.join(PROJECT_DIR,`${p.id}.json`),JSON.stringify(p,null,2),'utf8'); res.status(201).json({project:p});
  }catch(e){res.status(500).json({message:'Could not save project.'});}
});

app.put('/api/projects/:id', async (req,res)=>{
  try{
    if(supabase){ const user=await requireCloudUser(req,res); if(!user)return; const role=await projectRole(user.id,req.params.id); if(!['owner','editor'].includes(role)) return res.status(403).json({message:'Editor access is required to modify this project.'}); const {data:old,error:oldError}=await userDb(req).from('avirzo_projects').select('payload,name,created_at').eq('id',req.params.id).maybeSingle(); if(oldError)throw oldError; if(!old)return res.status(404).json({message:'Project not found.'}); const p=normalizeProject({...old.payload,...req.body,id:req.params.id},{id:req.params.id,name:old.name,createdAt:old.created_at}); const {data,error}=await userDb(req).from('avirzo_projects').update({name:p.name,payload:p,updated_at:new Date().toISOString()}).eq('id',req.params.id).select('id,name,created_at,updated_at,payload').single(); if(error)throw error; return res.json({project:{...data.payload,id:data.id,name:data.name,createdAt:data.created_at,updatedAt:data.updated_at}}); }
    const id=safeProjectId(req.params.id); const fs=await projectStore(); const file=path.join(PROJECT_DIR,`${id}.json`); let existing={}; try{existing=JSON.parse(await fs.readFile(file,'utf8'));}catch{} const p=normalizeProject({...req.body,id},existing); await fs.writeFile(file,JSON.stringify(p,null,2),'utf8'); res.json({project:p});
  }catch(e){res.status(500).json({message:'Could not update project.'});}
});

app.delete('/api/projects/:id', async (req,res)=>{
  try{
    if(supabase){ const user=await requireCloudUser(req,res); if(!user)return; if(await projectRole(user.id,req.params.id)!=='owner') return res.status(403).json({message:'Only the project owner can delete a shared project.'}); const {error}=await userDb(req).from('avirzo_projects').delete().eq('id',req.params.id).eq('user_id',user.id); if(error)throw error; return res.json({ok:true}); }
    const fs=await projectStore(); await fs.unlink(path.join(PROJECT_DIR,`${safeProjectId(req.params.id)}.json`)); res.json({ok:true});
  }catch(e){res.status(404).json({message:'Project not found.'});}
});
}
