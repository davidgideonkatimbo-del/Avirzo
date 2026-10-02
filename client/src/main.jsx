import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { supabase, supabaseEnabled } from './supabase';
import { useJobs } from './hooks/useJobs';
import { JobCenter } from './components/JobCenter';
import { HealthPanel } from './components/HealthPanel';
import { TemplatePicker } from './components/TemplatePicker';
import { StudioNav } from './components/StudioNav';
import { VoicesPanel } from './components/VoicesPanel';
import { StudioPanels } from './components/StudioPanels';
import { StoryComposer } from './components/StoryComposer';
import { Storyboard } from './components/Storyboard';
import { FilmLookControls } from './components/FilmLookControls';
import { ProductionPanel } from './components/ProductionPanel';
import { AIFilmmakingPanel } from './components/AIFilmmakingPanel';
import { RootsFoundation } from './components/RootsFoundation';
import { StoryIntelligencePanel } from './components/StoryIntelligencePanel';
import { WorldBible } from './components/WorldBible';
import { CharacterContinuity } from './components/CharacterContinuity';
import {
  africanProfiles,
  emptyCharacter, emptyResearch, heritageTemplates
} from './constants';

function App(){
  const [mode,setMode]=useState('story');
  const [story,setStory]=useState('A young boy walks with his grandfather through a Buganda village before sunrise. The grandfather tells him an old story about their ancestors and the responsibility of protecting the family land.');
  const [style,setStyle]=useState('Historical drama'); const [camera,setCamera]=useState('Slow dolly'); const [duration,setDuration]=useState('5 sec'); const [format,setFormat]=useState('16:9');
  const [africanProfile,setAfricanProfile]=useState('uganda-lg'); const [era,setEra]=useState('pre1994'); const [rootsFoundation,setRootsFoundation]=useState({community:'Baganda',country:'Uganda',place:'Buganda',language:'Luganda',period:'19th century / late 1800s',culturalAnchors:'Traditional Ganda architecture, bark-cloth, agricultural landscape, oral storytelling, locally grounded tools and clothing.',evidenceLevel:'Oral tradition',creativeLiberties:'',sensitivityNotes:''}); const [storyType,setStoryType]=useState('oral'); const [historicalNotes,setHistoricalNotes]=useState('Buganda, late 1800s; use locally grounded architecture, bark-cloth clothing and pre-modern tools.');
  const [scenes,setScenes]=useState([]); const [characters,setCharacters]=useState([]); const [showBible,setShowBible]=useState(false); const [showResearch,setShowResearch]=useState(false); const [draft,setDraft]=useState(emptyCharacter);
  const [research,setResearch]=useState(emptyResearch); const [showContinuity,setShowContinuity]=useState(true); const [worldBible,setWorldBible]=useState({locations:'',objects:'',costumes:'',architecture:'',culturalPractices:'',musicSoundscape:'',languageRules:'',visualRules:'',familyStructure:'',taboosAndSensitivities:'',continuityLocks:'',relationships:''}); const [researchStatus,setResearchStatus]=useState('');
  const [showVoices,setShowVoices]=useState(false); const [voiceStatus,setVoiceStatus]=useState(''); const [voiceGenerating,setVoiceGenerating]=useState(false); const [voiceAudio,setVoiceAudio]=useState('');
  const [loadingPlan,setLoadingPlan]=useState(false); const [timelineOpen,setTimelineOpen]=useState(false); const [timeline,setTimeline]=useState([]); const [audioTracks,setAudioTracks]=useState([]); const [captions,setCaptions]=useState([]); const [duckMusic,setDuckMusic]=useState(true); const [captionMode,setCaptionMode]=useState('burn'); const [exportQuality,setExportQuality]=useState('standard'); const [includeSrt,setIncludeSrt]=useState(true); const [exportSrt,setExportSrt]=useState(''); const [exporting,setExporting]=useState(false); const [exportUrl,setExportUrl]=useState(''); const [characterStatus,setCharacterStatus]=useState(''); const [generating,setGenerating]=useState(false); const [message,setMessage]=useState(''); const [videoUrl,setVideoUrl]=useState('');
  const [authUser,setAuthUser]=useState(null); const [authEmail,setAuthEmail]=useState(''); const [authPassword,setAuthPassword]=useState(''); const [authMode,setAuthMode]=useState('signin'); const [authStatus,setAuthStatus]=useState(''); const [authLoading,setAuthLoading]=useState(false);
  const [showAICopilot,setShowAICopilot]=useState(true); const [showProjects,setShowProjects]=useState(false); const [showProduction,setShowProduction]=useState(false); const [showCollaboration,setShowCollaboration]=useState(false); const [showBilling,setShowBilling]=useState(false); const [projectId,setProjectId]=useState(''); const [projectName,setProjectName]=useState('My Avirzo Film'); const [projects,setProjects]=useState([]); const [projectStatus,setProjectStatus]=useState(''); const [projectLoading,setProjectLoading]=useState(false); const [assets,setAssets]=useState([]); const [showTemplates,setShowTemplates]=useState(true); const [activeTemplateId,setActiveTemplateId]=useState(''); const [assetStatus,setAssetStatus]=useState('');
  const profile=useMemo(()=>africanProfiles.find(x=>x.id===africanProfile),[africanProfile]);

  async function authHeaders(){ if(!supabase) return {}; const {data}=await supabase.auth.getSession(); return data.session?.access_token?{Authorization:`Bearer ${data.session.access_token}`}:{ }; }
  async function apiFetch(url, options={}){ const headers={...(options.headers||{}),...(await authHeaders())}; return fetch(url,{...options,headers}); }
  const [activeJobId,setActiveJobId]=useState(''); const [cancelingJobId,setCancelingJobId]=useState(''); const [retryingJobId,setRetryingJobId]=useState(''); const [exportJobId,setExportJobId]=useState('');
  const { jobs, recentJobs, refreshJobs, cancelJob, retryJob } = useJobs(apiFetch, Boolean(authUser), projectId);
  async function cancelActiveJob(id){ setCancelingJobId(id); try{ await cancelJob(id); setActiveJobId(''); setGenerating(false); setExporting(false); setMessage('Job canceled.'); }catch(e){setMessage(e.message||'Could not cancel job.')}finally{setCancelingJobId('');} }
  async function retryActiveJob(id){ setRetryingJobId(id); try{ await retryJob(id); setMessage('Job queued for retry.'); }catch(e){setMessage(e.message||'Could not retry job.')}finally{setRetryingJobId('');} }
  useEffect(()=>{ const job=jobs.find(x=>x.id===exportJobId); if(!job)return; if(job.status==='succeeded'&&job.result_asset_id&&!exportUrl){ openAsset(job.result_asset_id).then(url=>{if(url){setExportUrl(url);setMessage('Film export is ready and archived in your private media library.');setExporting(false);}}); } else if(job.status==='failed'){setExporting(false);setMessage(job.error||'Film export failed.');} else if(job.status==='canceled'){setExporting(false);setMessage('Film export canceled.');} },[jobs,exportJobId,exportUrl]);
  async function handleAuth(){ if(!supabaseEnabled)return; setAuthLoading(true);setAuthStatus(''); try{ let result; if(authMode==='signup') result=await supabase.auth.signUp({email:authEmail.trim(),password:authPassword}); else result=await supabase.auth.signInWithPassword({email:authEmail.trim(),password:authPassword}); if(result.error)throw result.error; if(authMode==='signup'&&!result.data.session)setAuthStatus('Check your email to confirm your Avirzo account.'); else setAuthStatus('Signed in.'); }catch(e){setAuthStatus(e.message||'Authentication failed.')}finally{setAuthLoading(false)} }
  async function handleSignOut(){ if(supabase) await supabase.auth.signOut(); setAuthUser(null); setProjects([]); setProjectId(''); setAuthStatus('Signed out.'); }
  useEffect(()=>{ if(!supabase)return; supabase.auth.getSession().then(({data})=>setAuthUser(data.session?.user||null)); const {data:listener}=supabase.auth.onAuthStateChange((_event,session)=>setAuthUser(session?.user||null)); return ()=>listener.subscription.unsubscribe(); },[]);
  async function uploadMediaToCloud(file,folder){ if(!supabase||!authUser)return null; const ext=(file.name.split('.').pop()||'bin').toLowerCase(); const path=`${authUser.id}/${folder}/${Date.now()}-${crypto.randomUUID()}.${ext}`; const {error}=await supabase.storage.from('avirzo-media').upload(path,file,{upsert:false,contentType:file.type||undefined}); if(error)throw error; const {data,error:signedError}=await supabase.storage.from('avirzo-media').createSignedUrl(path,3600); if(signedError)throw signedError; return {storagePath:path,url:data.signedUrl}; }

  function characterForScene(scene){ return characters.find(c=>c.id===scene?.primaryCharacterId) || null; }
  function characterPayload(c){ if(!c) return null; const {referenceImageData,performanceVideoData,...meta}=c; return meta; }
  function fileToDataUrl(file){ return new Promise((resolve,reject)=>{ const r=new FileReader(); r.onload=()=>resolve(r.result); r.onerror=reject; r.readAsDataURL(file); }); }

  
  function applyTemplate(tpl){
    if(!tpl) return;
    setActiveTemplateId(tpl.id);
    setShowTemplates(false);
    setMode('story');
    setAfricanProfile(tpl.africanProfile || 'uganda-en');
    setEra(tpl.era || 'pre1994');
    setStoryType(tpl.storyType || 'inspired');
    setStyle(tpl.style || 'Cinematic');
    setCamera(tpl.camera || 'Slow dolly');
    setFormat(tpl.format || '16:9');
    setDuration(tpl.duration || '5 sec');
    setHistoricalNotes(tpl.historicalNotes || '');
    setStory(tpl.story || '');
    setResearch(tpl.research ? {...tpl.research} : {...emptyResearch}); setWorldBible(tpl.worldBible ? {...tpl.worldBible} : {locations:'',objects:'',costumes:'',architecture:'',culturalPractices:'',musicSoundscape:'',languageRules:'',visualRules:'',familyStructure:'',taboosAndSensitivities:'',continuityLocks:'',relationships:''});
    setCharacters((tpl.characters||[]).map(c=>({...emptyCharacter,...c,id:crypto.randomUUID()})));
    setScenes([]); setTimeline([]); setAudioTracks([]); setCaptions([]);
    setVideoUrl(''); setExportUrl(''); setMessage(tpl.id==='blank-studio'?'Blank studio ready.':'Heritage template applied — review story, research and characters before generating.');
    setShowBible(Boolean(tpl.characters?.length));
    setShowResearch(Boolean(tpl.research?.location || tpl.research?.verifiedFacts));
  }

  function projectPayload(){ return { name:projectName.trim()||'Untitled Avirzo Film', rootsFoundation, mode, story, style, camera, duration, format, africanProfile, era, storyType, historicalNotes, scenes, characters, research, worldBible, timeline, audioTracks, captions, duckMusic, captionMode, exportQuality, includeSrt, exportUrl }; }
  async function refreshProjects(){ try{const r=await apiFetch('/api/projects'); const d=await r.json(); if(r.ok)setProjects(d.projects||[]);}catch(e){setProjectStatus('Project library is unavailable.');} }
  async function refreshAssets(){ if(!supabaseEnabled||!authUser||!projectId)return; try{const r=await apiFetch(`/api/assets?projectId=${encodeURIComponent(projectId)}`); const d=await r.json(); if(r.ok)setAssets(d.assets||[]);}catch(e){setAssetStatus('Media library is unavailable.');} }
  async function persistAsset(sourceUrl,kind,name){ if(!projectId||!supabaseEnabled||!authUser||!/^https:\/\//i.test(String(sourceUrl||''))) return null; try{const r=await apiFetch('/api/assets/import',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({projectId,sourceUrl,kind,name})}); const d=await r.json(); if(!r.ok)throw new Error(d.message||'Could not archive media.'); setAssets(p=>[d.asset,...p.filter(x=>x.id!==d.asset.id)]); return d; }catch(e){setAssetStatus(e.message||'Could not archive media.'); return null;} }
  async function openAsset(assetId){ try{const r=await apiFetch(`/api/assets/${assetId}/url`); const d=await r.json(); if(!r.ok)throw new Error(d.message||'Could not open asset.'); return d.url;}catch(e){setAssetStatus(e.message||'Could not open asset.'); return ''; } }
  async function openStoragePath(storagePath){ if(!storagePath)return ''; try{const r=await apiFetch('/api/assets/signed-url',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({storagePath})}); const d=await r.json(); if(!r.ok)throw new Error(d.message||'Could not open stored media.'); return d.url||'';}catch(e){setAssetStatus(e.message||'Could not open stored media.'); return ''; } }
  async function resolveCharacterMedia(character, kind='image'){ if(!character)return ''; const dataKey=kind==='image'?'referenceImageData':'performanceVideoData'; const assetKey=kind==='image'?'referenceAssetId':'performanceAssetId'; const pathKey=kind==='image'?'mediaStoragePath':'performanceStoragePath'; const urlKey=kind==='image'?'referenceImageUrl':'performanceVideoUrl'; if(character[dataKey])return character[dataKey]; if(character[assetKey]){const u=await openAsset(character[assetKey]); if(u)return u;} if(character[pathKey]){const u=await openStoragePath(character[pathKey]); if(u)return u;} return character[urlKey]||''; }
  async function deleteAsset(assetId){ if(!confirm('Delete this stored media asset?'))return; try{const r=await apiFetch(`/api/assets/${assetId}`,{method:'DELETE'}); if(!r.ok)throw new Error('Could not delete asset.'); setAssets(p=>p.filter(x=>x.id!==assetId)); setAssetStatus('Asset deleted from private storage.');}catch(e){setAssetStatus(e.message||'Could not delete asset.');} }
  async function saveProject(){ setProjectLoading(true); setProjectStatus('Saving project…'); try{const payload=projectPayload(); const r=await apiFetch(projectId?`/api/projects/${projectId}`:'/api/projects',{method:projectId?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}); const d=await r.json(); if(!r.ok)throw new Error(d.message||'Could not save project.'); setProjectId(d.project.id); setProjectName(d.project.name); await refreshProjects(); setProjectStatus('Project saved to the server library.');}catch(e){setProjectStatus(e.message||'Could not save project.')}finally{setProjectLoading(false)} }
  async function loadProject(id){ setProjectLoading(true); setProjectStatus('Loading project…'); try{const r=await apiFetch(`/api/projects/${id}`); const d=await r.json(); if(!r.ok)throw new Error(d.message||'Could not load project.'); const p=d.project; setProjectId(p.id); setProjectName(p.name||'Avirzo Film'); setMode(p.mode||'story'); setStory(p.story||''); setStyle(p.style||'Historical drama'); setCamera(p.camera||'Slow dolly'); setDuration(p.duration||'5 sec'); setFormat(p.format||'16:9'); setAfricanProfile(p.africanProfile||'uganda-lg'); setEra(p.era||'pre1994'); setStoryType(p.storyType||'oral'); setRootsFoundation(p.rootsFoundation||{community:'',country:'',place:'',language:'',period:'',culturalAnchors:'',evidenceLevel:'',creativeLiberties:'',sensitivityNotes:''}); setHistoricalNotes(p.historicalNotes||''); setScenes(p.scenes||[]); setCharacters(p.characters||[]); setResearch(p.research||emptyResearch); setWorldBible(p.worldBible||{locations:'',objects:'',costumes:'',architecture:'',culturalPractices:'',musicSoundscape:'',languageRules:'',visualRules:'',familyStructure:'',taboosAndSensitivities:'',continuityLocks:'',relationships:''}); setTimeline(p.timeline||[]); setAudioTracks(p.audioTracks||[]); setCaptions(p.captions||[]); setDuckMusic(p.duckMusic!==false); setCaptionMode(['burn','soft','none'].includes(p.captionMode)?p.captionMode:'burn'); setExportQuality(['draft','standard','high'].includes(p.exportQuality)?p.exportQuality:(['draft','standard','high'].includes(p.quality)?p.quality:'standard')); setIncludeSrt(p.includeSrt!==false); setExportUrl(p.exportUrl||''); setShowProjects(false); setProjectStatus(`Loaded “${p.name}”.`); if(Array.isArray(p.scenes)&&p.scenes.some(x=>x.assetId)){ const hydrated=await Promise.all(p.scenes.map(async x=>x.assetId?{...x,videoUrl:await openAsset(x.assetId)}:x)); setScenes(hydrated); }}catch(e){setProjectStatus(e.message||'Could not load project.')}finally{setProjectLoading(false)} }
  async function deleteProject(id){ if(!confirm('Delete this saved Avirzo project?')) return; try{const r=await apiFetch(`/api/projects/${id}`,{method:'DELETE'}); if(!r.ok)throw new Error('Could not delete project.'); if(projectId===id){setProjectId('');setProjectName('My Avirzo Film');} await refreshProjects(); setProjectStatus('Project deleted.');}catch(e){setProjectStatus(e.message)} }
  function newProject(){ setProjectId('');setProjectName('My Avirzo Film');setStory('');setScenes([]);setCharacters([]);setResearch(emptyResearch);setWorldBible({locations:'',objects:'',costumes:'',architecture:'',culturalPractices:'',musicSoundscape:'',languageRules:'',visualRules:'',familyStructure:'',taboosAndSensitivities:'',continuityLocks:'',relationships:''});setRootsFoundation({community:'',country:'',place:'',language:'',period:'',culturalAnchors:'',evidenceLevel:'',creativeLiberties:'',sensitivityNotes:''});setTimeline([]);setAudioTracks([]);setCaptions([]);setExportUrl('');setVideoUrl('');setMessage('New project started.');setShowProjects(false); }
  useEffect(()=>{ if(showProjects){ refreshProjects(); refreshAssets(); } },[showProjects,projectId,authUser]);

  async function makeStoryboard(){
    if(!story.trim()) return setMessage('Write a story first.'); setLoadingPlan(true); setMessage('Building your heritage shot list…');
    try{const r=await apiFetch('/api/storyboard',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({story,africanProfile,era,storyType,historicalNotes,characters:characters.map(characterPayload),researchBrief:research})}); const data=await r.json(); if(!r.ok) throw new Error(data.message||'Could not build storyboard.'); setScenes(data.scenes.map((s,i)=>({...s,primaryCharacterId:characters[0]?.id||''}))); setTimeline([]); setExportUrl(''); setMessage(`${data.scenes.length} scenes ready. Character continuity is attached.`);}catch(e){setMessage(e.message)}finally{setLoadingPlan(false)}
  }
  function updateScene(id,key,value){setScenes(p=>p.map(s=>s.id===id?{...s,[key]:value}:s));}
  function syncTimeline(nextScenes=scenes){ const ready=nextScenes.filter(s=>s.videoUrl).map((s,i)=>({id:s.id,type:'video',sceneNumber:s.number,title:s.title,src:s.videoUrl,start:i*5,duration:5})); setTimeline(ready); }
  function moveScene(id,dir){setScenes(prev=>{const a=[...prev],i=a.findIndex(x=>x.id===id),j=i+dir;if(i<0||j<0||j>=a.length)return a;[a[i],a[j]]=[a[j],a[i]];return a.map((x,k)=>({...x,number:k+1}));});}
  function addAudioTrack(){setAudioTracks(p=>[...p,{id:`audio-${Date.now()}`,name:'New audio track',type:'dialogue',src:'',start:0,duration:5,volume:1,fadeIn:0,fadeOut:0,notes:''}]);}
  function addCaption(){setCaptions(p=>[...p,{id:`caption-${Date.now()}`,start:0,end:3,text:''}]);}
  function updateCaption(id,key,value){setCaptions(p=>p.map(x=>x.id===id?{...x,[key]:value}:x));}
  function removeCaption(id){setCaptions(p=>p.filter(x=>x.id!==id));}
  function updateAudio(id,key,value){setAudioTracks(p=>p.map(x=>x.id===id?{...x,[key]:value}:x));}
  function removeAudio(id){setAudioTracks(p=>p.filter(x=>x.id!==id));}
  async function exportFilm(){const ordered=scenes.filter(s=>s.videoUrl);if(!ordered.length)return setMessage('Generate at least one scene before exporting.');setExporting(true);setExportUrl('');setExportSrt('');setMessage('Submitting film export to the production worker…');try{const payload={title:'Avirzo film',projectId,format,scenes:ordered.map(s=>({id:s.id,number:s.number,title:s.title,videoUrl:s.videoUrl,assetId:s.assetId||null})),audioTracks,captions,duckMusic,captionMode,quality:exportQuality,includeSrt};const r=await apiFetch('/api/export/film',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const d=await r.json();if(!r.ok)throw new Error(d.message||'Film export failed.');setExportJobId(d.jobId||'');if(d.downloadUrl){setExportUrl(d.downloadUrl);if(d.srt)setExportSrt(d.srt);setExporting(false);const archived=d.assetId ? {asset:{id:d.assetId},url:d.downloadUrl} : await persistAsset(d.downloadUrl,'export',projectName||'avirzo-film');if(archived?.url)setExportUrl(archived.url);setMessage(`Film assembled${d.captionMode?` · captions ${d.captionMode}`:''}${d.quality?` · ${d.quality} quality`:''}.`);}else{setMessage('Film export queued. You can keep working while the worker renders it.');}}catch(e){setMessage(e.message||'Film export failed.');setExporting(false)}}

  async function addCharacter(){ if(!draft.name.trim()) return setMessage('Give the character a name first.'); const candidate={...draft,id:`char-${Date.now()}`}; const r=await apiFetch('/api/characters/validate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({characters:[candidate]})}); const data=await r.json().catch(()=>({})); if(!data.ok){setCharacterStatus(data.warnings?.join(' '));} else {setCharacterStatus('Visual identity is complete enough for continuity prompts.');} setCharacters(p=>[...p,candidate]); setDraft(emptyCharacter); setMessage(`${draft.name} added to the Heritage Bible.`); }
  function removeCharacter(id){setCharacters(p=>p.filter(c=>c.id!==id));}
  async function checkSceneContinuity(scene){
    const r=await apiFetch('/api/ai/scene-continuity',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({scene,characters:characters.map(characterPayload),worldBible,rootsFoundation,era})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(d.message||'Scene continuity check failed.');
    updateScene(scene.id,'continuityAudit',d);
    return d;
  }
  async function generateScene(scene){
    setGenerating(true); setVideoUrl(''); updateScene(scene.id,'status','rendering'); setMessage(`Rendering scene ${scene.number}…`);
    const refChar=characterForScene(scene); const refImage=await resolveCharacterMedia(refChar,'image');
    try{const guard=await checkSceneContinuity(scene); if(!guard.ready){updateScene(scene.id,'status','blocked');setMessage(`Scene ${scene.number} blocked by continuity: ${guard.blockers.join(' ')}`);return;} const r=await apiFetch('/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:scene.prompt,style,camera:scene.camera,duration,format,sceneNumber:scene.number,africanProfile,era,storyType,historicalNotes,characters:characters.map(characterPayload),researchBrief:research,referenceImage:refImage,referenceCharacter:characterPayload(refChar),projectId,worldBible,continuityContext:guard.continuityContext,primaryCharacterId:scene.primaryCharacterId})}); const data=await r.json(); if(!r.ok) throw new Error(data.message||'Generation request failed.'); setActiveJobId(data.jobId||''); const result=await pollTask(data.taskId,data.jobId); const url=result.videoUrl||''; const archived=result.archivedAsset ? {asset:result.archivedAsset,url:await openAsset(result.archivedAsset.id)} : await persistAsset(url,'video',`scene-${scene.number}`); updateScene(scene.id,'status','ready'); updateScene(scene.id,'videoUrl',archived?.url||url); if(archived) { updateScene(scene.id,'assetId',archived.asset.id); updateScene(scene.id,'assetStoragePath',archived.asset.storage_path); } setVideoUrl(archived?.url||url); setTimeline(prev=>[...prev.filter(x=>x.id!==scene.id),{id:scene.id,type:'video',sceneNumber:scene.number,title:scene.title,src:url,start:prev.length*5,duration:5}]); setMessage(`Scene ${scene.number} is ready.`);}catch(e){updateScene(scene.id,'status','failed');setMessage(e.message||'Generation failed.')}finally{setGenerating(false)}
  }
  async function generateAll(){
    if(!scenes.length)return setMessage('Build the storyboard first.');
    setGenerating(true);
    const generated=[];
    try{
      for(const scene of scenes){
        setMessage(`Rendering scene ${scene.number} of ${scenes.length}…`);
        updateScene(scene.id,'status','rendering');
        const refChar=characterForScene(scene);
        const refImage=await resolveCharacterMedia(refChar,'image');
        const guard=await checkSceneContinuity(scene); if(!guard.ready){updateScene(scene.id,'status','blocked');throw new Error(`Scene ${scene.number} blocked by continuity: ${guard.blockers.join(' ')}`);}
        const r=await apiFetch('/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:scene.prompt,style,camera,duration,format,sceneNumber:scene.number,africanProfile,era,storyType,historicalNotes,characters:characters.map(characterPayload),researchBrief:research,referenceImage:refImage,referenceCharacter:characterPayload(refChar),projectId,worldBible,continuityContext:guard.continuityContext,primaryCharacterId:scene.primaryCharacterId})});
        const data=await r.json();
        if(!r.ok) throw new Error(data.message||`Scene ${scene.number} failed.`);
        setActiveJobId(data.jobId||'');
        const result=await pollTask(data.taskId,data.jobId);
        const url=result.videoUrl||'';
        const archived=result.archivedAsset ? {asset:result.archivedAsset,url:await openAsset(result.archivedAsset.id)} : await persistAsset(url,'video',`scene-${scene.number}`);
        const finalUrl=archived?.url||url;
        updateScene(scene.id,'status','ready');
        updateScene(scene.id,'videoUrl',finalUrl);
        if(archived){ updateScene(scene.id,'assetId',archived.asset.id); updateScene(scene.id,'assetStoragePath',archived.asset.storage_path); }
        generated.push({...scene,videoUrl:finalUrl,status:'ready',assetId:archived?.asset?.id||scene.assetId||'',assetStoragePath:archived?.asset?.storage_path||scene.assetStoragePath||''});
      }
      setTimeline(generated.map((s,i)=>({...s,type:'video',sceneNumber:s.number,title:s.title,src:s.videoUrl,start:i*5,duration:5})).filter(x=>x.src));
      setMessage('All scenes are ready.');
    }catch(e){setMessage(e.message||'The film generation stopped.')}finally{setGenerating(false)}
  }

  async function pollTask(taskId,jobId=''){for(let i=0;i<72;i++){await new Promise(r=>setTimeout(r,5000));const r=await apiFetch(`/api/generate/${encodeURIComponent(taskId)}`);const d=await r.json();if(!r.ok)throw new Error(d.message||'Could not retrieve generation status.');if(jobId) await refreshJobs(); if(d.status==='succeeded'){setActiveJobId('');return d;}if(d.status==='failed'||d.status==='canceled'){setActiveJobId('');throw new Error(d.message||'Video generation failed.');}}throw new Error('Generation is taking longer than expected.');}
  async function generateCharacterPerformance(character){
    const characterImage=await resolveCharacterMedia(character,'image');
    const performanceVideo=await resolveCharacterMedia(character,'performance');
    if(!characterImage) return setCharacterStatus(`Add a reference image for ${character.name} first.`);
    if(!performanceVideo) return setCharacterStatus(`Add a 3–30 second performance video for ${character.name} first.`);
    setCharacterStatus(`Sending ${character.name}'s performance to Runway…`);
    try{
      const r=await apiFetch('/api/character-performance',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({characterImage,performanceVideo,bodyControl:true,expressionIntensity:3,ratio:format==='9:16'?'720:1280':'1280:720',projectId})});
      const d=await r.json(); if(!r.ok) throw new Error(d.message||'Character performance request failed.');
      setCharacters(p=>p.map(c=>c.id===character.id?{...c,performanceStatus:'rendering',performanceTaskId:d.taskId}:c));
      setCharacterStatus(`${character.name}'s character performance is rendering…`);
      const result=await pollTask(d.taskId); const url=result.videoUrl||'';
      setCharacters(p=>p.map(c=>c.id===character.id?{...c,performanceStatus:'ready',performanceVideoUrl:url,performanceAssetId:result.archivedAsset?.id||c.performanceAssetId||''}:c));
      setCharacterStatus(`${character.name}'s performance render is ready. Add its audio/dialogue as a timeline track when assembling the film.`);
    }catch(e){setCharacters(p=>p.map(c=>c.id===character.id?{...c,performanceStatus:'failed'}:c));setCharacterStatus(e.message||'Character performance failed.');}
  }

  async function generateCharacterVoice(character){
    if(!character.voiceId?.trim()) return setVoiceStatus(`Add a voice ID for ${character.name}.`);
    if(!character.dialogue?.trim()) return setVoiceStatus(`Add dialogue for ${character.name} first.`);
    setVoiceGenerating(true); setVoiceAudio(''); setVoiceStatus(`Generating ${character.name}'s dialogue…`);
    try{const r=await apiFetch('/api/voice/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:character.dialogue,voiceId:character.voiceId,voiceLanguageCode:character.voiceLanguageCode,provider:character.voiceProvider||'elevenlabs',africanProfile,modelId:'eleven_v3',projectId})}); const d=await r.json(); if(!r.ok) throw new Error(d.message||'Voice generation failed.'); setVoiceAudio(d.audioUrl || ''); setVoiceStatus(`${character.name}'s voice is ready. Language profile: ${d.language}${d.archivedAsset ? ' · archived in private cloud storage.' : ''}`);}catch(e){setVoiceStatus(e.message||'Voice generation failed.')}finally{setVoiceGenerating(false)}
  }

  return <div className="app">
    <header className="topbar"><div className="brand"><span className="brand-mark">A</span><span>AVIRZO</span></div><div className="studio-badge">AFRICAN AI CINEMA</div></header>
    <main><HealthPanel apiFetch={apiFetch}/><JobCenter jobs={jobs} recent={recentJobs} busyJobId={cancelingJobId} retryingJobId={retryingJobId} onCancel={cancelActiveJob} onRetry={retryActiveJob}/>
      <section className="hero"><div className="eyebrow">HERITAGE AI FILMMAKER · v2.8.2</div><h1>Let the world<br/><em>see where we come from.</em></h1><p>Build films rooted in African history, oral tradition, language and lived cultural detail — with guided workflows, character continuity and production-grade export.</p>{activeTemplateId&&activeTemplateId!=='blank-studio'&&<div className="active-template-chip">Template · {heritageTemplates.find(t=>t.id===activeTemplateId)?.title||activeTemplateId}</div>}</section>
      <section className="card">
        <StudioNav mode={mode} setMode={setMode} showBible={showBible} setShowBible={setShowBible} showResearch={showResearch} setShowResearch={setShowResearch} showVoices={showVoices} setShowVoices={setShowVoices} timelineOpen={timelineOpen} setTimelineOpen={setTimelineOpen} syncTimeline={syncTimeline} showProjects={showProjects} setShowProjects={setShowProjects} showCollaboration={showCollaboration} setShowCollaboration={setShowCollaboration} showBilling={showBilling} setShowBilling={setShowBilling} showProduction={showProduction} setShowProduction={setShowProduction} onOpenTemplates={()=>setShowTemplates(true)} />
        <TemplatePicker visible={showTemplates} onSelect={applyTemplate} onDismiss={()=>setShowTemplates(false)} />
        <ProductionPanel visible={showProduction} apiFetch={apiFetch} projectId={projectId} scenes={scenes}/>
        <RootsFoundation value={rootsFoundation} onChange={setRootsFoundation} profile={africanProfile} era={era} storyType={storyType}/><WorldBible value={worldBible} onChange={setWorldBible} characters={characters}/><StoryIntelligencePanel apiFetch={apiFetch} story={story} rootsFoundation={rootsFoundation} characters={characters.map(characterPayload)} research={research} worldBible={worldBible} scenes={scenes} era={era} storyType={storyType} setMessage={setMessage}/><CharacterContinuity apiFetch={apiFetch} characters={characters} scenes={scenes} worldBible={worldBible} rootsFoundation={rootsFoundation} setMessage={setMessage}/><AIFilmmakingPanel visible={showAICopilot} apiFetch={apiFetch} story={story} characters={characters.map(characterPayload)} scenes={scenes} research={research} rootsFoundation={rootsFoundation} era={era} storyType={storyType} profile={profile} setScenes={setScenes} setMessage={setMessage}/>
        <StudioPanels
          showProjects={showProjects} showResearch={showResearch} timelineOpen={timelineOpen} showBible={showBible}
          showCollaboration={showCollaboration} showBilling={showBilling}
          projectProps={{authUser,authEmail,setAuthEmail,authPassword,setAuthPassword,authMode,setAuthMode,authStatus,authLoading,handleAuth,handleSignOut,projectId,projectName,setProjectName,projects,projectStatus,projectLoading,newProject,saveProject,loadProject,deleteProject,assets,assetStatus,refreshAssets,openAsset,deleteAsset}}
          researchProps={{research,setResearch,researchStatus,setResearchStatus,setEra,setAfricanProfile,setStoryType}}
          timelineProps={{timeline,audioTracks,captions,duckMusic,setDuckMusic,captionMode,setCaptionMode,exportQuality,setExportQuality,includeSrt,setIncludeSrt,addAudioTrack,updateAudio,removeAudio,addCaption,updateCaption,removeCaption,exporting,exportFilm,exportUrl,exportSrt,format}}
          bibleProps={{characters,draft,setDraft,characterStatus,setCharacterStatus,addCharacter,removeCharacter,generateCharacterPerformance,uploadMediaToCloud,fileToDataUrl}}
          collaborationProps={{apiFetch,projectId,authUser,projectName}}
          billingProps={{apiFetch,authUser}}
        />
        <VoicesPanel
          visible={showVoices}
          characters={characters} setCharacters={setCharacters}
          profile={profile}
          voiceGenerating={voiceGenerating} voiceAudio={voiceAudio} voiceStatus={voiceStatus}
          generateCharacterVoice={generateCharacterVoice}
        />
        <StoryComposer
          mode={mode} setMode={setMode}
          story={story} setStory={setStory}
          africanProfile={africanProfile} setAfricanProfile={setAfricanProfile}
          era={era} setEra={setEra}
          storyType={storyType} setStoryType={setStoryType}
          historicalNotes={historicalNotes} setHistoricalNotes={setHistoricalNotes}
          profile={profile}
          loadingPlan={loadingPlan} makeStoryboard={makeStoryboard}
          camera={camera} characters={characters} setScenes={setScenes} setMessage={setMessage}
        />
      </section>
      <Storyboard
        scenes={scenes}
        characters={characters}
        profile={profile}
        era={era}
        generating={generating}
        generateAll={generateAll}
        generateScene={generateScene}
        updateScene={updateScene}
        moveScene={moveScene}
        characterForScene={characterForScene}
      />
      <FilmLookControls
        style={style} setStyle={setStyle}
        camera={camera} setCamera={setCamera}
        duration={duration} setDuration={setDuration}
        format={format} setFormat={setFormat}
        profile={profile}
        era={era}
        storyType={storyType}
        characters={characters}
      />
      {message&&<div className="status global-status">{message}</div>}{videoUrl&&<section className="card result"><div className="eyebrow">LATEST RENDER</div><video controls playsInline src={videoUrl}/><a className="download" href={videoUrl} target="_blank" rel="noreferrer">Open generated video</a><small>Provider video URLs are temporary; completed project media is archived in your private Storage library when cloud storage is enabled.</small></section>}
    </main><footer>AVIRZO · AFRICAN ROOTS AI CINEMA · v2.7 · HERITAGE STUDIO</footer>
  </div>
}
createRoot(document.getElementById('root')).render(<App/>);
