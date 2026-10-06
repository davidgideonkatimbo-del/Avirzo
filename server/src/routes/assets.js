import { assertSafeUrl } from '../services/safeFetch.js';

export function registerRoutes(app, ctx) {
  const { IS_PRODUCTION, APP_VERSION, supabase, supabaseAdmin, africanProfiles, voiceLanguageSupport, ELEVEN_MODEL, RUNWAY_API, eras, storyTypes, styles, cameras, formats, durations, requireProviderUser, requireProviderAuth, requireRunwayKey, requireVoiceKey, runwayHeaders, normalizeCharacter, characterContinuityLine, buildCinematicPrompt, persistRemoteAsset, requireAssetCloud, requireOwnedProject, projectStore, safeProjectId, normalizeProject, requireCloudUser, userDb, PROJECT_DIR, toSrtTime, acquireExportSlot, ELEVENLABS_API, generationJobs, rateBuckets } = ctx;

  app.get('/api/assets', async (req,res)=>{
  try{ const user=await requireAssetCloud(req,res); if(!user)return; let q=userDb(req).from('avirzo_assets').select('id,project_id,kind,name,storage_path,mime_type,size_bytes,created_at,source_provider').order('created_at',{ascending:false}); if(req.query.projectId) q=q.eq('project_id',String(req.query.projectId)); const {data,error}=await q; if(error)throw error; res.json({assets:data||[]}); }catch(e){res.status(500).json({message:'Could not load media assets.'});}
});

app.get('/api/assets/:id/url', async (req,res)=>{
  try{ const user=await requireAssetCloud(req,res); if(!user)return; const {data,error}=await userDb(req).from('avirzo_assets').select('storage_path,mime_type,name').eq('id',req.params.id).maybeSingle(); if(error)throw error; if(!data)return res.status(404).json({message:'Asset not found.'}); const {data:signed,error:signedError}=await supabaseAdmin.storage.from('avirzo-media').createSignedUrl(data.storage_path,3600); if(signedError)throw signedError; res.json({url:signed.signedUrl,mimeType:data.mime_type,name:data.name,expiresIn:3600}); }catch(e){res.status(500).json({message:'Could not create asset URL.'});}
});

app.post('/api/assets/signed-url', async (req,res)=>{
  try {
    const user = await requireAssetCloud(req,res); if (!user) return;
    const storagePath = String(req.body?.storagePath || '').trim();
    if (!storagePath || !storagePath.startsWith(`${user.id}/`)) return res.status(403).json({message:'You can only open media belonging to your account.'});
    const { data, error } = await supabaseAdmin.storage.from('avirzo-media').createSignedUrl(storagePath, 3600);
    if (error) throw error;
    res.json({ url: data.signedUrl, expiresIn: 3600 });
  } catch (e) {
    res.status(500).json({message:'Could not create media URL.'});
  }
});

app.post('/api/assets/import', async (req,res)=>{
  try{ const user=await requireAssetCloud(req,res); if(!user)return; const sourceUrl=String(req.body?.sourceUrl||'').trim(); const projectId=String(req.body?.projectId||'').trim(); const kind=String(req.body?.kind||'video'); if(projectId && !(await requireOwnedProject(user.id, projectId))) return res.status(404).json({message:'Project not found.'}); const name=String(req.body?.name||'generated-media'); try{assertSafeUrl(sourceUrl);}catch(e){return res.status(400).json({message:e.message||'Only HTTPS provider asset URLs can be imported.'});} if(!['video','audio','image','export'].includes(kind))return res.status(400).json({message:'Unsupported asset type.'}); const asset=await persistRemoteAsset({user,projectId,sourceUrl,kind,name}); const {data:signed}=await supabaseAdmin.storage.from('avirzo-media').createSignedUrl(asset.storage_path,3600); res.status(201).json({asset,url:signed?.signedUrl||null}); }catch(e){console.error(e);res.status(502).json({message:e.message||'Could not persist media asset.'});}
});

app.delete('/api/assets/:id', async (req,res)=>{
  try{ const user=await requireAssetCloud(req,res); if(!user)return; const {data,error}=await userDb(req).from('avirzo_assets').select('storage_path,project_id,user_id').eq('id',req.params.id).maybeSingle(); if(error)throw error; if(!data)return res.status(404).json({message:'Asset not found.'}); if(data.project_id && !(await requireOwnedProject(user.id,data.project_id))) return res.status(403).json({message:'Editor access is required to delete project media.'}); if(!data.project_id && data.user_id!==user.id) return res.status(403).json({message:'You do not own this asset.'}); await supabaseAdmin.storage.from('avirzo-media').remove([data.storage_path]); const {error:delError}=await supabaseAdmin.from('avirzo_assets').delete().eq('id',req.params.id); if(delError)throw delError; res.json({ok:true}); }catch(e){res.status(500).json({message:'Could not delete asset.'});}
});
}
