import crypto from 'node:crypto';

export function registerRoutes(app, ctx) {
  const { supabaseAdmin, requireCloudUser } = ctx;
  async function role(userId, projectId) {
    if (!supabaseAdmin) return null;
    const { data:p } = await supabaseAdmin.from('avirzo_projects').select('user_id').eq('id', projectId).maybeSingle();
    if (p?.user_id === userId) return 'owner';
    const { data:m } = await supabaseAdmin.from('avirzo_project_members').select('role').eq('project_id', projectId).eq('user_id', userId).maybeSingle();
    return m?.role || null;
  }
  function canComment(r){ return ['owner','editor','commenter'].includes(r); }
  function canEdit(r){ return ['owner','editor'].includes(r); }

  app.get('/api/projects/:id/versions', async (req,res)=>{
    const user=await requireCloudUser(req,res); if(!user)return;
    try { const r=await role(user.id,req.params.id); if(!r)return res.status(403).json({message:'No project access.'}); const {data,error}=await supabaseAdmin.from('avirzo_project_versions').select('id,version_number,label,created_by,created_at').eq('project_id',req.params.id).order('version_number',{ascending:false}); if(error)throw error; res.json({versions:data||[]}); }
    catch(e){res.status(500).json({message:e.message||'Could not load versions.'});}
  });
  app.post('/api/projects/:id/versions', async(req,res)=>{
    const user=await requireCloudUser(req,res); if(!user)return;
    try { const r=await role(user.id,req.params.id); if(!canEdit(r))return res.status(403).json({message:'Editor access is required.'}); const {data:p}=await supabaseAdmin.from('avirzo_projects').select('payload,name').eq('id',req.params.id).single(); const {data:last}=await supabaseAdmin.from('avirzo_project_versions').select('version_number').eq('project_id',req.params.id).order('version_number',{ascending:false}).limit(1).maybeSingle(); const next=(last?.version_number||0)+1; const {data,error}=await supabaseAdmin.from('avirzo_project_versions').insert({project_id:req.params.id,version_number:next,label:String(req.body?.label||`Version ${next}`).slice(0,120),payload:p?.payload||{},created_by:user.id}).select('*').single(); if(error)throw error; res.status(201).json({version:data}); }
    catch(e){res.status(500).json({message:e.message||'Could not create version.'});}
  });
  app.post('/api/projects/:id/versions/:versionId/restore', async(req,res)=>{
    const user=await requireCloudUser(req,res); if(!user)return;
    try { const r=await role(user.id,req.params.id); if(!canEdit(r))return res.status(403).json({message:'Editor access is required.'}); const {data:v}=await supabaseAdmin.from('avirzo_project_versions').select('payload').eq('id',req.params.versionId).eq('project_id',req.params.id).single(); if(!v)return res.status(404).json({message:'Version not found.'}); const {data,error}=await supabaseAdmin.from('avirzo_projects').update({payload:v.payload,updated_at:new Date().toISOString()}).eq('id',req.params.id).select('id,name,created_at,updated_at,payload').single(); if(error)throw error; res.json({project:{...data.payload,id:data.id,name:data.name,createdAt:data.created_at,updatedAt:data.updated_at}}); }
    catch(e){res.status(500).json({message:e.message||'Could not restore version.'});}
  });

  app.get('/api/projects/:id/comments', async(req,res)=>{
    const user=await requireCloudUser(req,res); if(!user)return;
    try { const r=await role(user.id,req.params.id); if(!r)return res.status(403).json({message:'No project access.'}); const {data,error}=await supabaseAdmin.from('avirzo_project_comments').select('*').eq('project_id',req.params.id).order('created_at',{ascending:true}); if(error)throw error; res.json({comments:data||[]}); }
    catch(e){res.status(500).json({message:e.message||'Could not load comments.'});}
  });
  app.post('/api/projects/:id/comments', async(req,res)=>{
    const user=await requireCloudUser(req,res); if(!user)return;
    try { const r=await role(user.id,req.params.id); if(!canComment(r))return res.status(403).json({message:'Comment access is required.'}); const body=String(req.body?.body||'').trim(); if(!body)return res.status(400).json({message:'Comment cannot be empty.'}); const {data,error}=await supabaseAdmin.from('avirzo_project_comments').insert({project_id:req.params.id,user_id:user.id,scene_id:req.body?.sceneId||null,body:body.slice(0,4000)}).select('*').single(); if(error)throw error; res.status(201).json({comment:data}); }
    catch(e){res.status(500).json({message:e.message||'Could not add comment.'});}
  });
  app.patch('/api/projects/:id/comments/:commentId', async(req,res)=>{
    const user=await requireCloudUser(req,res); if(!user)return;
    try { const {data:c}=await supabaseAdmin.from('avirzo_project_comments').select('user_id').eq('id',req.params.commentId).eq('project_id',req.params.id).single(); if(c?.user_id!==user.id)return res.status(403).json({message:'Only the author can edit this comment.'}); const {data,error}=await supabaseAdmin.from('avirzo_project_comments').update({body:String(req.body?.body||'').trim(),updated_at:new Date().toISOString()}).eq('id',req.params.commentId).select('*').single(); if(error)throw error; res.json({comment:data}); }
    catch(e){res.status(500).json({message:e.message||'Could not update comment.'});}
  });
  app.delete('/api/projects/:id/comments/:commentId', async(req,res)=>{
    const user=await requireCloudUser(req,res); if(!user)return;
    try { const r=await role(user.id,req.params.id); const {data:c}=await supabaseAdmin.from('avirzo_project_comments').select('user_id').eq('id',req.params.commentId).eq('project_id',req.params.id).single(); if(c?.user_id!==user.id && r!=='owner')return res.status(403).json({message:'Only the author or owner can delete this comment.'}); const {error}=await supabaseAdmin.from('avirzo_project_comments').delete().eq('id',req.params.commentId); if(error)throw error; res.json({ok:true}); }
    catch(e){res.status(500).json({message:e.message||'Could not delete comment.'});}
  });

  app.get('/api/projects/:id/approvals', async(req,res)=>{
    const user=await requireCloudUser(req,res); if(!user)return;
    try { const r=await role(user.id,req.params.id); if(!r)return res.status(403).json({message:'No project access.'}); const {data,error}=await supabaseAdmin.from('avirzo_scene_approvals').select('*').eq('project_id',req.params.id).order('updated_at',{ascending:false}); if(error)throw error; res.json({approvals:data||[]}); }
    catch(e){res.status(500).json({message:e.message||'Could not load approvals.'});}
  });
  app.patch('/api/projects/:id/scenes/:sceneId/approval', async(req,res)=>{
    const user=await requireCloudUser(req,res); if(!user)return;
    try { const r=await role(user.id,req.params.id); if(!canEdit(r))return res.status(403).json({message:'Editor access is required.'}); const status=String(req.body?.status||'draft'); if(!['draft','review','approved','locked'].includes(status))return res.status(400).json({message:'Invalid approval status.'}); const {data,error}=await supabaseAdmin.from('avirzo_scene_approvals').upsert({project_id:req.params.id,scene_id:req.params.sceneId,status,updated_by:user.id,updated_at:new Date().toISOString()},{onConflict:'project_id,scene_id'}).select('*').single(); if(error)throw error; res.json({approval:data}); }
    catch(e){res.status(500).json({message:e.message||'Could not update scene approval.'});}
  });

  app.get('/api/projects/:id/passport', async(req,res)=>{
    const user=await requireCloudUser(req,res); if(!user)return;
    try { const r=await role(user.id,req.params.id); if(!r)return res.status(403).json({message:'No project access.'}); const {data:p}=await supabaseAdmin.from('avirzo_projects').select('name,payload').eq('id',req.params.id).single(); const payload=p?.payload||{}; const passport={projectId:req.params.id,title:p?.name||payload.name||'Untitled',story:payload.story||'',era:payload.era||'',storyType:payload.storyType||'',location:payload.research?.location||'',languages:[payload.research?.language,payload.africanProfile].filter(Boolean),characters:(payload.characters||[]).map(c=>({name:c.name,community:c.community,language:c.language,role:c.role})),sources:payload.research?.sources||[],verifiedFacts:payload.research?.verifiedFacts||'',uncertainties:payload.research?.uncertainties||'',sceneCount:Array.isArray(payload.scenes)?payload.scenes.length:0,generatedAt:new Date().toISOString(),principle:'Document evidence, oral tradition and creative reconstruction separately.'}; res.json({passport}); }
    catch(e){res.status(500).json({message:e.message||'Could not build heritage passport.'});}
  });

  app.get('/api/voice/providers', (req,res)=>res.json({providers:ctx.voiceProviderOptions?.()||[]}));
  app.post('/api/voice/estimate', async(req,res)=>{
    const provider=String(req.body?.provider||'elevenlabs').toLowerCase(); const chars=String(req.body?.text||'').length; const rates={elevenlabs:0.00003,google:0.000016,azure:0.000016,polly:0.000016}; const rate=rates[provider]??0; res.json({provider,characters:chars,estimatedUsd:Number((chars*rate).toFixed(4)),ratePerCharacterUsd:rate,note:'Estimate only; provider billing can vary by model, region and plan.'});
  });
}
