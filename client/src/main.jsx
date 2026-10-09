import React, { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => console.warn('Avirzo offline shell registration failed', error));
  });
}
import { supabase, supabaseEnabled } from './supabase';
import { useJobs } from './hooks/useJobs';
import { useProjectRoom } from './hooks/useProjectRoom';
import { JobCenter } from './components/JobCenter';
import { TemplatePicker } from './components/TemplatePicker';
import { AppShell } from './components/AppShell';
import { StoryComposer } from './components/StoryComposer';
import { FilmLookControls } from './components/FilmLookControls';
import { AIFilmmakingPanel } from './components/AIFilmmakingPanel';
import { StoryIntelligencePanel } from './components/StoryIntelligencePanel';
import { CharacterContinuity } from './components/CharacterContinuity';
import {
  africanProfiles,
  emptyCharacter, emptyResearch, heritageTemplates, styles, cameras, formats, durations
} from './constants';

// Route-level panels load on demand so the first screen downloads far less JavaScript.
const lazyPanel = (loader, name) => lazy(() => loader().then(mod => ({ default: mod[name] })));
const ProfilePanel = lazyPanel(() => import('./components/ProfilePanel'), 'ProfilePanel');
const SettingsPanel = lazyPanel(() => import('./components/SettingsPanel'), 'SettingsPanel');
const VoicesPanel = lazyPanel(() => import('./components/VoicesPanel'), 'VoicesPanel');
const ProjectsPanel = lazyPanel(() => import('./components/ProjectsPanel'), 'ProjectsPanel');
const ResearchPanel = lazyPanel(() => import('./components/ResearchPanel'), 'ResearchPanel');
const TimelinePanel = lazyPanel(() => import('./components/TimelinePanel'), 'TimelinePanel');
const CharacterBible = lazyPanel(() => import('./components/CharacterBible'), 'CharacterBible');
const Storyboard = lazyPanel(() => import('./components/Storyboard'), 'Storyboard');
const ProductionPanel = lazyPanel(() => import('./components/ProductionPanel'), 'ProductionPanel');
const RootsFoundation = lazyPanel(() => import('./components/RootsFoundation'), 'RootsFoundation');
const WorldBible = lazyPanel(() => import('./components/WorldBible'), 'WorldBible');
const AssetsPanel = lazyPanel(() => import('./components/AssetsPanel'), 'AssetsPanel');
const ProjectWorkspace = lazyPanel(() => import('./components/ProjectWorkspace'), 'ProjectWorkspace');

class AppErrorBoundary extends React.Component {
  constructor(props){ super(props); this.state={hasError:false,error:null}; }
  static getDerivedStateFromError(error){ return {hasError:true,error}; }
  componentDidCatch(error,info){ console.error('Avirzo UI error',error,info); }
  render(){
    if(!this.state.hasError) return this.props.children;
    return <main className="error-screen"><div className="error-card"><div className="brand"><span className="brand-mark">A</span><span>AVIRZO</span></div><div className="eyebrow">STUDIO RECOVERY</div><h1>Something interrupted the studio.</h1><p>The project has not been deleted. Reload the studio and try the last action again.</p><button className="generate" type="button" onClick={()=>window.location.reload()}>Reload Avirzo</button>{this.state.error?.message&&<small>{this.state.error.message}</small>}</div></main>;
  }
}

// Route helpers. Share links look like /#/projects?invite=TOKEN&email=..., so the query part must never become part of the page name.
const PENDING_INVITE_KEY = 'avirzo-pending-invite';
function routeFromHash(hash = window.location.hash) { return String(hash || '').replace(/^#\/?/, '').split('?')[0] || 'home'; }
function readInviteFromUrl() {
  try {
    const hashQuery = String(window.location.hash || '').split('?')[1] || '';
    const token = new URLSearchParams(hashQuery).get('invite') || new URLSearchParams(window.location.search).get('invite') || '';
    if (token) { try { window.localStorage.setItem(PENDING_INVITE_KEY, token); } catch { /* storage unavailable */ } }
    return token || (() => { try { return window.localStorage.getItem(PENDING_INVITE_KEY) || ''; } catch { return ''; } })();
  } catch { return ''; }
}
function clearPendingInvite() { try { window.localStorage.removeItem(PENDING_INVITE_KEY); } catch { /* ignore */ } }

function App(){
  const [page,setPage]=useState(()=>routeFromHash());
  const [pendingInvite,setPendingInvite]=useState(()=>readInviteFromUrl());
  const navigate=(next)=>{ const target=next||'home'; window.location.hash=`/${target}`; setPage(target); window.scrollTo({top:0,behavior:'auto'}); };
  const viewPage = page.startsWith('project/') ? (page.split('/')[2] || 'overview') : page;
  const routeProjectId = page.startsWith('project/') ? (page.split('/')[1] || '') : '';
  const inProjectRoute = page.startsWith('project/');
  useEffect(()=>{ const params=new URLSearchParams(window.location.search); const b=params.get('billing'); if(!b) return; const text={success:'Payment received. Your plan updates in a moment — open Billing to check it.',cancelled:'Checkout was canceled. You have not been charged.',return:'Welcome back. Your billing changes will appear shortly.'}[b]; if(text) setMessage(text); params.delete('billing'); const qs=params.toString(); window.history.replaceState(null,'',window.location.pathname+(qs?`?${qs}`:'')+window.location.hash); },[]);
  useEffect(()=>{ const onHash=()=>{ const next=routeFromHash(); setPage(next); window.scrollTo(0,0); }; window.addEventListener('hashchange',onHash); return ()=>window.removeEventListener('hashchange',onHash); },[]);
  const [mode,setMode]=useState('story');
  const [story,setStory]=useState('A young boy walks with his grandfather through a Buganda village before sunrise. The grandfather tells him an old story about their ancestors and the responsibility of protecting the family land.');
  const [style,setStyle]=useState('Historical drama'); const [camera,setCamera]=useState('Slow dolly'); const [duration,setDuration]=useState('5 sec'); const [format,setFormat]=useState('16:9');
  const [africanProfile,setAfricanProfile]=useState('uganda-lg'); const [era,setEra]=useState('pre1994'); const [rootsFoundation,setRootsFoundation]=useState({community:'Baganda',country:'Uganda',place:'Buganda',language:'Luganda',period:'19th century / late 1800s',culturalAnchors:'Traditional Ganda architecture, bark-cloth, agricultural landscape, oral storytelling, locally grounded tools and clothing.',evidenceLevel:'Oral tradition',creativeLiberties:'',sensitivityNotes:''}); const [storyType,setStoryType]=useState('oral'); const [historicalNotes,setHistoricalNotes]=useState('Buganda, late 1800s; use locally grounded architecture, bark-cloth clothing and pre-modern tools.');
  const [scenes,setScenes]=useState([]); const [characters,setCharacters]=useState([]); const [showBible,setShowBible]=useState(false); const [showResearch,setShowResearch]=useState(false); const [draft,setDraft]=useState(emptyCharacter);
  const [research,setResearch]=useState(emptyResearch); const [showContinuity,setShowContinuity]=useState(true); const [worldBible,setWorldBible]=useState({locations:'',objects:'',costumes:'',architecture:'',culturalPractices:'',musicSoundscape:'',languageRules:'',visualRules:'',familyStructure:'',taboosAndSensitivities:'',continuityLocks:'',relationships:''}); const [researchStatus,setResearchStatus]=useState('');
  const [showVoices,setShowVoices]=useState(false); const [voiceStatus,setVoiceStatus]=useState(''); const [voiceGenerating,setVoiceGenerating]=useState(false); const [voiceAudio,setVoiceAudio]=useState('');
  const [loadingPlan,setLoadingPlan]=useState(false); const [review,setReview]=useState({enabled:false,notes:[]}); const [aiEndCard,setAiEndCard]=useState(false); const [timelineOpen,setTimelineOpen]=useState(false); const [timeline,setTimeline]=useState([]); const [audioTracks,setAudioTracks]=useState([]); const [captions,setCaptions]=useState([]); const [duckMusic,setDuckMusic]=useState(true); const [captionMode,setCaptionMode]=useState('burn'); const [exportQuality,setExportQuality]=useState('standard'); const [includeSrt,setIncludeSrt]=useState(true); const [exportSrt,setExportSrt]=useState(''); const [exporting,setExporting]=useState(false); const [exportUrl,setExportUrl]=useState(''); const [characterStatus,setCharacterStatus]=useState(''); const [generating,setGenerating]=useState(false); const [message,setMessage]=useState(''); const [videoUrl,setVideoUrl]=useState('');
  const [authUser,setAuthUser]=useState(null); const [authEmail,setAuthEmail]=useState(''); const [authPassword,setAuthPassword]=useState(''); const [authMode,setAuthMode]=useState('signin'); const [authStatus,setAuthStatus]=useState(''); const [authLoading,setAuthLoading]=useState(false);
  const [projectFolder,setProjectFolder]=useState('My Films'); const [projectFolderFilter,setProjectFolderFilter]=useState('All folders');
  const [showAICopilot,setShowAICopilot]=useState(true); const [showProjects,setShowProjects]=useState(false); const [showProduction,setShowProduction]=useState(false); const [showCollaboration,setShowCollaboration]=useState(false); const [showBilling,setShowBilling]=useState(false); const [projectId,setProjectId]=useState(''); const [projectName,setProjectName]=useState('My Avirzo Film'); const [projects,setProjects]=useState([]); const [projectStatus,setProjectStatus]=useState(''); const [projectLoading,setProjectLoading]=useState(false); const [lastSavedAt,setLastSavedAt]=useState(null); const [assets,setAssets]=useState([]); const [showTemplates,setShowTemplates]=useState(true); const [activeTemplateId,setActiveTemplateId]=useState(''); const [assetStatus,setAssetStatus]=useState('');
  const profile=useMemo(()=>africanProfiles.find(x=>x.id===africanProfile),[africanProfile]);

  const authHeaders=useCallback(async()=>{ if(!supabase) return {}; const {data}=await supabase.auth.getSession(); return data.session?.access_token?{Authorization:`Bearer ${data.session.access_token}`}:{ }; },[]);
  const apiFetch=useCallback(async(url, options={})=>{ const headers={...(options.headers||{}),...(await authHeaders())}; return fetch(url,{...options,headers}); },[authHeaders]);
  async function readApiJson(res){
    const text=await res.text();
    if(!text) return {};
    try{ return JSON.parse(text); }
    catch{
      if(res.status>=500) throw new Error('Studio service is waking up or temporarily unavailable. Wait a few seconds and try again.');
      throw new Error(res.ok ? 'Unexpected response from the studio.' : `Request failed (${res.status}).`);
    }
  }
  const [activeJobId,setActiveJobId]=useState(''); const [cancelingJobId,setCancelingJobId]=useState(''); const [retryingJobId,setRetryingJobId]=useState(''); const [exportJobId,setExportJobId]=useState('');
  const { jobs, recentJobs, refreshJobs, cancelJob, retryJob } = useJobs(apiFetch, Boolean(authUser), projectId);
  // Live collaboration: remote patches land in the same state setters the local editors use.
  const roomSetters={story:setStory,historicalNotes:setHistoricalNotes,worldBible:setWorldBible,characters:setCharacters,rootsFoundation:setRootsFoundation};
  const room=useProjectRoom({projectId,authUser,apiFetch,onPatch:(field,value)=>{ roomSetters[field]?.(value); }});
  useEffect(()=>{ room.sendPatch('story',story); },[story]);
  useEffect(()=>{ room.sendPatch('historicalNotes',historicalNotes); },[historicalNotes]);
  useEffect(()=>{ room.sendPatch('worldBible',worldBible); },[worldBible]);
  useEffect(()=>{ room.sendPatch('characters',characters); },[characters]);
  useEffect(()=>{ room.sendPatch('rootsFoundation',rootsFoundation); },[rootsFoundation]);
  async function cancelActiveJob(id){ setCancelingJobId(id); try{ await cancelJob(id); setActiveJobId(''); setGenerating(false); setExporting(false); setMessage('Job canceled.'); }catch(e){setMessage(e.message||'Could not cancel job.')}finally{setCancelingJobId('');} }
  async function retryActiveJob(id){ setRetryingJobId(id); try{ await retryJob(id); setMessage('Job queued for retry.'); }catch(e){setMessage(e.message||'Could not retry job.')}finally{setRetryingJobId('');} }
  useEffect(()=>{ const job=jobs.find(x=>x.id===exportJobId); if(!job)return; if(job.status==='succeeded'&&job.result_asset_id&&!exportUrl){ openAsset(job.result_asset_id).then(url=>{if(url){setExportUrl(url);setMessage('Film export is ready and archived in your private media library.');setExporting(false);}}); } else if(job.status==='failed'){setExporting(false);setMessage(job.error||'Film export failed.');} else if(job.status==='canceled'){setExporting(false);setMessage('Film export canceled.');} },[jobs,exportJobId,exportUrl]);
  async function handleAuth(){ if(!supabaseEnabled)return; setAuthLoading(true);setAuthStatus(''); try{ let result; if(authMode==='signup') result=await supabase.auth.signUp({email:authEmail.trim(),password:authPassword}); else result=await supabase.auth.signInWithPassword({email:authEmail.trim(),password:authPassword}); if(result.error)throw result.error; if(authMode==='signup'&&!result.data.session)setAuthStatus('Check your email to confirm your Avirzo account.'); else setAuthStatus('Signed in.'); }catch(e){setAuthStatus(e.message||'Authentication failed.')}finally{setAuthLoading(false)} }
  async function handleSignOut(){
    let note='Signed out.';
    // Save the open film to the cloud library first, so signing back in finds it.
    if(authUser && (projectId || story.trim() || scenes.length || characters.length)){
      try{
        const hadId=Boolean(projectId);
        const saved=await saveCurrentToCloud();
        if(hadId) note='Saved your film, then signed out.';
        else note='Saved as a new cloud project'+(saved?.name?` (“${saved.name}”)`:'')+', then signed out. Sign in to open it from Projects.';
        if(saved?.id) setLastSavedAt(new Date().toISOString());
      }catch(e){ note='Signed out. Your latest changes could not be saved: '+(e.message||'unknown error'); }
    }
    if(supabase) await supabase.auth.signOut();
    setAuthUser(null); setProjects([]); resetWorkspace(); setProjectStatus(''); setLastSavedAt(null); setAuthStatus(note);
    if(inProjectRoute) navigate('projects');
  }
  useEffect(()=>{ if(!supabase)return; supabase.auth.getSession().then(({data})=>setAuthUser(data.session?.user||null)); const {data:listener}=supabase.auth.onAuthStateChange((_event,session)=>setAuthUser(session?.user||null)); return ()=>listener.subscription.unsubscribe(); },[]);
  async function uploadMediaToCloud(file,folder){ if(!supabase||!authUser)return null; const ext=(file.name.split('.').pop()||'bin').toLowerCase(); const path=`${authUser.id}/${folder}/${Date.now()}-${crypto.randomUUID()}.${ext}`; const {error}=await supabase.storage.from('avirzo-media').upload(path,file,{upsert:false,contentType:file.type||undefined}); if(error)throw error; const {data,error:signedError}=await supabase.storage.from('avirzo-media').createSignedUrl(path,3600); if(signedError)throw signedError; return {storagePath:path,url:data.signedUrl}; }

  function characterForScene(scene){ if(!scene) return null; const byId=characters.find(c=>c.id===scene.primaryCharacterId); if(byId) return byId; return characters[0] || null; }
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
    setVideoUrl(''); setExportUrl(''); setExportSrt(''); setGenerating(false); setExporting(false); setActiveJobId(''); setExportJobId(''); setMessage(tpl.id==='blank-studio'?'Blank studio ready.':'Heritage template applied — review story, research and characters before generating.');
    setShowBible(Boolean(tpl.characters?.length));
    setShowResearch(Boolean(tpl.research?.location || tpl.research?.verifiedFacts));
  }

  function projectPayload(){ return { name:projectName.trim()||'Untitled Avirzo Film', folder:projectFolder.trim()||'My Films', rootsFoundation, mode, story, style, camera, duration, format, africanProfile, era, storyType, historicalNotes, scenes, characters, research, worldBible, timeline, audioTracks, captions, duckMusic, captionMode, exportQuality, includeSrt, review, aiEndCard, exportUrl }; }
  async function refreshProjects(){ try{const r=await apiFetch('/api/projects'); const d=await readApiJson(r); if(r.ok)setProjects(d.projects||[]); else setProjectStatus(d.message||'Project library is unavailable.');}catch(e){setProjectStatus(e.message||'Project library is unavailable.');} }
  async function refreshAssets(){ if(!supabaseEnabled||!authUser||!projectId)return; try{const r=await apiFetch(`/api/assets?projectId=${encodeURIComponent(projectId)}`); const d=await r.json(); if(r.ok)setAssets(d.assets||[]);}catch(e){setAssetStatus('Media library is unavailable.');} }
  async function persistAsset(sourceUrl,kind,name){ if(!projectId||!supabaseEnabled||!authUser||!/^https:\/\//i.test(String(sourceUrl||''))) return null; try{const r=await apiFetch('/api/assets/import',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({projectId,sourceUrl,kind,name})}); const d=await r.json(); if(!r.ok)throw new Error(d.message||'Could not archive media.'); setAssets(p=>[d.asset,...p.filter(x=>x.id!==d.asset.id)]); return d; }catch(e){setAssetStatus(e.message||'Could not archive media.'); return null;} }
  async function openAsset(assetId){ try{const r=await apiFetch(`/api/assets/${assetId}/url`); const d=await r.json(); if(!r.ok)throw new Error(d.message||'Could not open asset.'); return d.url;}catch(e){setAssetStatus(e.message||'Could not open asset.'); return ''; } }
  async function openStoragePath(storagePath){ if(!storagePath)return ''; try{const r=await apiFetch('/api/assets/signed-url',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({storagePath})}); const d=await r.json(); if(!r.ok)throw new Error(d.message||'Could not open stored media.'); return d.url||'';}catch(e){setAssetStatus(e.message||'Could not open stored media.'); return ''; } }
  async function resolveCharacterMedia(character, kind='image'){ if(!character)return ''; const dataKey=kind==='image'?'referenceImageData':'performanceVideoData'; const assetKey=kind==='image'?'referenceAssetId':'performanceAssetId'; const pathKey=kind==='image'?'mediaStoragePath':'performanceStoragePath'; const urlKey=kind==='image'?'referenceImageUrl':'performanceVideoUrl'; if(character[dataKey])return character[dataKey]; if(character[assetKey]){const u=await openAsset(character[assetKey]); if(u)return u;} if(character[pathKey]){const u=await openStoragePath(character[pathKey]); if(u)return u;} return character[urlKey]||''; }
  async function deleteAsset(assetId){ if(!confirm('Delete this stored media asset?'))return; try{const r=await apiFetch(`/api/assets/${assetId}`,{method:'DELETE'}); if(!r.ok)throw new Error('Could not delete asset.'); setAssets(p=>p.filter(x=>x.id!==assetId)); setAssetStatus('Asset deleted from private storage.');}catch(e){setAssetStatus(e.message||'Could not delete asset.');} }
  async function saveProjectSnapshot(overrides={}){
    if(!authUser) throw new Error('Sign in first to save projects to the cloud library.');
    if(!projectId) throw new Error('Save the project once before saving changes to it.');
    const payload={...projectPayload(),...overrides};
    const r=await apiFetch(`/api/projects/${projectId}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const d=await r.json().catch(()=>({}));
    if(!r.ok || d.verified!==true) throw new Error(d.message||'Project save could not be verified.');
    setProjectName(d.project.name);
    setLastSavedAt(new Date().toISOString());
    return d.project;
  }
  async function saveCurrentToCloud(){
    if(!authUser) throw new Error('Sign in first to save projects to the cloud library.');
    if(projectId) return await saveProjectSnapshot();
    const r=await apiFetch('/api/projects',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(projectPayload())});
    const d=await r.json().catch(()=>({}));
    if(!r.ok||d.verified!==true) throw new Error(d.message||'Project save could not be verified.');
    setProjectId(d.project.id);
    setProjectName(d.project.name);
    setLastSavedAt(new Date().toISOString());
    return d.project;
  }
  async function saveProject(){ if(!authUser){setProjectStatus('Sign in first to save projects to the cloud library.');setShowProjects(true);return;} setProjectLoading(true); setProjectStatus('Saving project…'); try{let d;if(projectId){d={project:await saveProjectSnapshot()};}else{const payload=projectPayload();const r=await apiFetch('/api/projects',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});d=await r.json().catch(()=>({}));if(!r.ok||d.verified!==true)throw new Error(d.message||'Project save could not be verified.');}setProjectId(d.project.id);setProjectName(d.project.name);await refreshProjects();setLastSavedAt(new Date().toISOString()); setProjectStatus('Project saved and verified in the cloud library.');}catch(e){setProjectStatus(e.message||'Could not save project.')}finally{setProjectLoading(false)} }
  async function loadProject(id){ setProjectLoading(true); setProjectStatus('Loading project…'); setVideoUrl(''); setExportUrl(''); setExportSrt(''); setGenerating(false); setExporting(false); setActiveJobId(''); setExportJobId(''); setMessage(''); try{const r=await apiFetch(`/api/projects/${id}`); const d=await r.json(); if(!r.ok)throw new Error(d.message||'Could not load project.'); const p=d.project; room.quiet(); setProjectId(p.id); setProjectName(p.name||'Avirzo Film'); setProjectFolder(p.folder||'My Films'); setMode(p.mode||'story'); setStory(p.story||''); setStyle(p.style||'Historical drama'); setCamera(p.camera||'Slow dolly'); setDuration(p.duration||'5 sec'); setFormat(p.format||'16:9'); setAfricanProfile(p.africanProfile||'uganda-lg'); setEra(p.era||'pre1994'); setStoryType(p.storyType||'oral'); setRootsFoundation(p.rootsFoundation||{community:'',country:'',place:'',language:'',period:'',culturalAnchors:'',evidenceLevel:'',creativeLiberties:'',sensitivityNotes:''}); setHistoricalNotes(p.historicalNotes||''); setScenes(p.scenes||[]); setCharacters(p.characters||[]); setResearch(p.research||emptyResearch); setWorldBible(p.worldBible||{locations:'',objects:'',costumes:'',architecture:'',culturalPractices:'',musicSoundscape:'',languageRules:'',visualRules:'',familyStructure:'',taboosAndSensitivities:'',continuityLocks:'',relationships:''}); setTimeline(p.timeline||[]); setAudioTracks(p.audioTracks||[]); setCaptions(p.captions||[]); setDuckMusic(p.duckMusic!==false); setCaptionMode(['burn','soft','none'].includes(p.captionMode)?p.captionMode:'burn'); setExportQuality(['draft','standard','high'].includes(p.exportQuality)?p.exportQuality:(['draft','standard','high'].includes(p.quality)?p.quality:'standard')); setIncludeSrt(p.includeSrt!==false); setReview(p.review||{enabled:false,notes:[]}); setAiEndCard(p.aiEndCard===true); setExportUrl(p.exportUrl||''); setShowProjects(false); setLastSavedAt(p.updated_at||p.updatedAt||new Date().toISOString()); setProjectStatus(`Loaded “${p.name}”.`); navigate(`project/${p.id}/overview`); if(Array.isArray(p.scenes)&&p.scenes.some(x=>x.assetId)){ const hydrated=await Promise.all(p.scenes.map(async x=>x.assetId?{...x,videoUrl:await openAsset(x.assetId)}:x)); setScenes(hydrated); }}catch(e){setProjectStatus(e.message||'Could not load project.')}finally{setProjectLoading(false)} }
  async function deleteProject(id){ if(!confirm('Delete this saved Avirzo project?')) return; try{const r=await apiFetch(`/api/projects/${id}`,{method:'DELETE'}); if(!r.ok)throw new Error('Could not delete project.'); if(projectId===id){ resetWorkspace(); setMessage(''); } await refreshProjects(); setProjectStatus('Project deleted.');}catch(e){setProjectStatus(e.message)} }
  function resetWorkspace(){ setProjectId('');setLastSavedAt(null);setProjectName('My Avirzo Film');setProjectFolder('My Films');setMode('story');setAfricanProfile('uganda-lg');setEra('pre1994');setStoryType('oral');setStyle('Historical drama');setCamera('Slow dolly');setDuration('5 sec');setFormat('16:9');setStory('');setHistoricalNotes('');setScenes([]);setCharacters([]);setResearch({...emptyResearch});setWorldBible({locations:'',objects:'',costumes:'',architecture:'',culturalPractices:'',musicSoundscape:'',languageRules:'',visualRules:'',familyStructure:'',taboosAndSensitivities:'',continuityLocks:'',relationships:''});setRootsFoundation({community:'',country:'',place:'',language:'',period:'',culturalAnchors:'',evidenceLevel:'',creativeLiberties:'',sensitivityNotes:''});setTimeline([]);setAudioTracks([]);setCaptions([]);setExportUrl('');setExportSrt('');setVideoUrl('');setActiveTemplateId(''); }
  function newProject(){ resetWorkspace(); setMessage('New project started. Enter a project name, then select Save project.');setShowProjects(true); }
  async function exportFrameworkPack(){
    try{
      const r=await apiFetch('/api/heritage/template-pack',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:projectName||'My Avirzo framework',description:'Shared from Avirzo Studio',africanProfile,era,storyType,style,camera,format,duration,story,historicalNotes,research,worldBible,rootsFoundation,characters:characters.map(characterPayload)})});
      const d=await readApiJson(r);
      if(!r.ok) throw new Error(d.message||'Could not export framework.');
      const blob=new Blob([JSON.stringify(d.pack,null,2)],{type:'application/json'});
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a'); a.href=url; a.download=`avirzo-framework-${Date.now()}.json`; a.click();
      URL.revokeObjectURL(url);
      setMessage('Framework pack downloaded. Share the JSON so others can import it in Studio.');
    }catch(e){ setMessage(e.message||'Could not export framework.'); }
  }
  async function acceptInviteToken(token){
    if(!token||!authUser) return;
    try{
      const r=await apiFetch('/api/collaboration/accept-invite',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token})});
      const d=await readApiJson(r);
      if(!r.ok) throw new Error(d.message||'Could not join project.');
      setMessage(d.message||'Joined collaboration room.');
      await refreshProjects();
      if(d.projectId) loadProject(d.projectId);
    }catch(e){ setMessage(e.message||'Could not accept invite.'); }
    finally{ clearPendingInvite(); setPendingInvite(''); }
  }
  // A share link carries the invite in the URL. Remove it from the address bar and open the Projects page.
  useEffect(()=>{
    if(!pendingInvite) return;
    if(window.location.hash.includes('invite=')||window.location.search.includes('invite=')){ window.history.replaceState(null,'',window.location.pathname+'#/projects'); setPage('projects'); }
    if(!authUser) setMessage('You have been invited to a project. Sign in or create an account with the invited email address to join.');
  },[pendingInvite]);
  // Once signed in, join the project automatically.
  useEffect(()=>{ if(pendingInvite&&authUser?.id) acceptInviteToken(pendingInvite); },[pendingInvite,authUser?.id]);

  useEffect(()=>{ if(showProjects){ refreshProjects(); refreshAssets(); } },[showProjects,projectId,authUser]);
  // The Projects page is always visible when opened, so the list must load on sign-in and whenever that page opens.
  useEffect(()=>{ if(authUser?.id) refreshProjects(); else setProjects([]); },[authUser?.id,viewPage==='projects']);
  // Autosave: 4 seconds after the last edit to a saved project (skipped while loading and when nothing changed).
  const lastSavedRef=React.useRef('');
  useEffect(()=>{ lastSavedRef.current=''; },[projectId,authUser?.id]);
  useEffect(()=>{
    if(!authUser||!projectId) return;
    if(projectLoading){ lastSavedRef.current=''; return; }
    const snap=JSON.stringify(projectPayload());
    if(!lastSavedRef.current){ lastSavedRef.current=snap; return; }
    if(snap===lastSavedRef.current) return;
    const t=setTimeout(async()=>{ try{ await saveProjectSnapshot(); lastSavedRef.current=snap; setLastSavedAt(new Date().toISOString()); setProjectStatus('Autosaved to your cloud library.'); }catch(e){ setProjectStatus('Autosave failed: '+(e.message||'could not save')+' Use Save project to retry.'); } },4000);
    return ()=>clearTimeout(t);
  },[authUser,projectId,projectLoading,projectName,projectFolder,rootsFoundation,mode,story,style,camera,duration,format,africanProfile,era,storyType,historicalNotes,scenes,characters,research,worldBible,timeline,audioTracks,captions,duckMusic,captionMode,exportQuality,includeSrt,review,aiEndCard,exportUrl]);
  useEffect(()=>{ if(routeProjectId && authUser && routeProjectId!==projectId && !projectLoading) loadProject(routeProjectId); },[routeProjectId,authUser,projectId,projectLoading]);

  async function makeStoryboard(){
    if(!story.trim()) return setMessage('Write a story first.'); setLoadingPlan(true); setMessage('Building your heritage shot list…');
    try{const r=await apiFetch('/api/storyboard',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({story,africanProfile,era,storyType,historicalNotes,characters:characters.map(characterPayload),researchBrief:research})}); const data=await readApiJson(r); if(!r.ok) throw new Error(data.message||'Could not build storyboard.'); setScenes(data.scenes.map((s,i)=>({...s,primaryCharacterId:characters[0]?.id||''}))); setTimeline([]); setExportUrl(''); setMessage(`${data.scenes.length} scenes ready. Open Scenes and generate your first shot.`); setMode('shot');}catch(e){setMessage(e.message)}finally{setLoadingPlan(false)}
  }
  function updateScene(id,key,value){setScenes(p=>p.map(s=>s.id===id?{...s,[key]:value}:s));}
  function sceneDurationSeconds(value=duration){ const match=String(value).match(/(\d+(?:\.\d+)?)/); return match ? Number(match[1]) : 5; }
  function syncTimeline(nextScenes=scenes){ let cursor=0; const ready=nextScenes.filter(s=>s.videoUrl).map(s=>{ const seconds=sceneDurationSeconds(s.duration||duration); const item={id:s.id,type:'video',sceneNumber:s.number,title:s.title,src:s.videoUrl,start:cursor,duration:seconds}; cursor+=seconds; return item; }); setTimeline(ready); }
  function moveScene(id,dir){setScenes(prev=>{const a=[...prev],i=a.findIndex(x=>x.id===id),j=i+dir;if(i<0||j<0||j>=a.length)return a;[a[i],a[j]]=[a[j],a[i]];return a.map((x,k)=>({...x,number:k+1}));});}
  function addAudioTrack(){setAudioTracks(p=>[...p,{id:`audio-${Date.now()}`,name:'New audio track',type:'dialogue',src:'',start:0,duration:5,volume:1,fadeIn:0,fadeOut:0,notes:''}]);}
  function addCaption(){setCaptions(p=>[...p,{id:`caption-${Date.now()}`,start:0,end:3,text:''}]);}
  function updateCaption(id,key,value){setCaptions(p=>p.map(x=>x.id===id?{...x,[key]:value}:x));}
  function removeCaption(id){setCaptions(p=>p.filter(x=>x.id!==id));}
  function updateAudio(id,key,value){setAudioTracks(p=>p.map(x=>x.id===id?{...x,[key]:value}:x));}
  function removeAudio(id){setAudioTracks(p=>p.filter(x=>x.id!==id));}
  async function exportFilm(){const ordered=scenes.filter(s=>s.videoUrl);if(!ordered.length)return setMessage('Generate at least one scene before exporting.');setExporting(true);setExportUrl('');setExportSrt('');setMessage('Submitting film export to the production worker…');try{const payload={title:'Avirzo film',projectId,format,scenes:ordered.map(s=>({id:s.id,number:s.number,title:s.title,videoUrl:s.videoUrl,assetId:s.assetId||null})),audioTracks,captions,duckMusic,captionMode,quality:exportQuality,includeSrt,aiEndCard};const r=await apiFetch('/api/export/film',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const d=await readApiJson(r);if(!r.ok)throw new Error(d.message||'Film export failed.');setExportJobId(d.jobId||'');if(d.downloadUrl){setExportUrl(d.downloadUrl);if(d.srt)setExportSrt(d.srt);const archived=d.assetId ? {asset:{id:d.assetId},url:d.downloadUrl} : await persistAsset(d.downloadUrl,'export',projectName||'avirzo-film');if(archived?.url)setExportUrl(archived.url);setMessage(`Film assembled${d.captionMode?` · captions ${d.captionMode}`:''}${d.quality?` · ${d.quality} quality`:''}.`);setExporting(false);}else{setMessage('Film export queued. You can keep working while the worker renders it.');}}catch(e){setMessage(e.message||'Film export failed.');setExporting(false);}}

  async function addCharacter(){ if(!draft.name.trim()) return setMessage('Give the character a name first.'); const candidate={...draft,id:`char-${Date.now()}-${Math.random().toString(36).slice(2,7)}`}; try{ const r=await apiFetch('/api/characters/validate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({characters:[candidate]})}); const data=await r.json().catch(()=>({})); if(!r.ok) throw new Error(data.message||'Character validation failed.'); if(!data.ok){setCharacterStatus(data.warnings?.join(' '));} else {setCharacterStatus('Visual identity is complete enough for continuity prompts.');} setCharacters(p=>[...p,candidate]); setDraft({...emptyCharacter}); setMessage(`${draft.name} added to the Heritage Bible.`); }catch(e){setCharacterStatus(e.message||'Could not validate the character.');setMessage('Character was not added because validation could not be completed.');} }
  function removeCharacter(id){setCharacters(p=>p.filter(c=>c.id!==id));}
  async function checkSceneContinuity(scene){
    try{
      const r=await apiFetch('/api/ai/scene-continuity',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({scene,characters:characters.map(characterPayload),worldBible,rootsFoundation,era})});
      const d=await readApiJson(r);
      if(!r.ok){
        // Soft-fail: do not block generation when the continuity service is unavailable.
        return {ready:true,blockers:[],warnings:[d.message||'Continuity service unavailable — generate carefully.'],continuityContext:''};
      }
      updateScene(scene.id,'continuityAudit',d);
      return d;
    }catch(e){
      return {ready:true,blockers:[],warnings:[e.message||'Continuity check skipped.'],continuityContext:''};
    }
  }
  async function generateScene(scene){
    if(generating) return setMessage('A scene is already rendering. Wait for it to finish or cancel the job.');
    setGenerating(true); setVideoUrl(''); updateScene(scene.id,'status','rendering'); setMessage(`Rendering scene ${scene.number}…`);
    try{
      let working={...scene};
      if(characters.length && !working.primaryCharacterId){
        working={...working, primaryCharacterId:characters[0].id};
        updateScene(scene.id,'primaryCharacterId',characters[0].id);
      }
      const refChar=characterForScene(working);
      const refImage=await resolveCharacterMedia(refChar,'image');
      const guard=await checkSceneContinuity(working);
      if(!guard.ready){
        updateScene(scene.id,'status','blocked');
        setMessage(`Scene ${scene.number} blocked by continuity: ${guard.blockers.join(' ')}`);
        return;
      }
      const scenePrompt=String(working.prompt||working.title||story||'').trim(); if(!scenePrompt) throw new Error('This scene has no prompt text. Add a description or rebuild the storyboard.'); const r=await apiFetch('/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:scenePrompt,style,camera:working.camera||camera||'Slow dolly',duration:working.duration||duration,format,sceneNumber:working.number,africanProfile,era,storyType,historicalNotes,characters:characters.map(characterPayload),researchBrief:research,referenceImage:refImage||'',referenceCharacter:characterPayload(refChar),projectId:projectId||null,worldBible,rootsFoundation,continuityContext:guard.continuityContext,primaryCharacterId:working.primaryCharacterId||''})});
      const data=await readApiJson(r);
      if(!r.ok) throw new Error(data.message||'Generation request failed.');
      if(!data.taskId) throw new Error(data.message||'Generation started but no task id was returned. Check that RUNWAYML_API_SECRET is set.');
      setActiveJobId(data.jobId||'');
      const result=await pollTask(data.taskId,data.jobId);
      const url=result.videoUrl||'';
      if(!url) throw new Error(result.message||'Generation finished without a video URL.');
      let archived=null;
      if(result.archivedAsset?.id){ try{ archived={asset:result.archivedAsset,url:await openAsset(result.archivedAsset.id)}; }catch(_){ archived=null; } }
      if(!archived && url){ try{ archived=await persistAsset(url,'video',`scene-${working.number}`); }catch(_){ archived=null; } }
      const finalUrl=archived?.url||url;
      let nextScenes=[];
      setScenes(prev=>{
        nextScenes=prev.map(x=>x.id===scene.id?{
          ...x,
          status:'ready',
          videoUrl:finalUrl,
          primaryCharacterId:working.primaryCharacterId||x.primaryCharacterId,
          ...(archived?{assetId:archived.asset.id,assetStoragePath:archived.asset.storage_path}:{})
        }:x);
        return nextScenes;
      });
      setVideoUrl(finalUrl);
      let nextTimeline=[];
      setTimeline(prev=>{
        const next=prev.filter(x=>x.id!==scene.id);
        const seconds=sceneDurationSeconds(working.duration||duration);
        const start=next.reduce((sum,x)=>sum+Number(x.duration||5),0);
        nextTimeline=[...next,{id:scene.id,type:'video',sceneNumber:working.number,title:working.title,src:finalUrl,start,duration:seconds}];
        return nextTimeline;
      });
      if(projectId&&authUser){
        try{ await saveProjectSnapshot({scenes:nextScenes,timeline:nextTimeline}); }
        catch(saveError){ setProjectStatus(`Scene ${working.number} rendered, but project save needs attention: ${saveError.message}`); }
      }
      setMessage(`Scene ${working.number} is ready.`);
    }catch(e){
      updateScene(scene.id,'status','failed');
      setMessage(e.message||'Generation failed.');
    }finally{ setGenerating(false); }
  }

  async function generateAll(){
    if(!scenes.length)return setMessage('Build the storyboard first.');
    if(generating) return setMessage('Generation is already running.');
    setGenerating(true);
    const generated=[];
    let currentScene=null;
    let workingScenes=[...scenes];
    try{
      for(const scene of workingScenes){ currentScene=scene;
        setMessage(`Rendering scene ${scene.number} of ${workingScenes.length}…`);
        updateScene(scene.id,'status','rendering');
        let working={...scene};
        if(characters.length && !working.primaryCharacterId){
          working={...working, primaryCharacterId:characters[0].id};
          updateScene(scene.id,'primaryCharacterId',characters[0].id);
        }
        const refChar=characterForScene(working);
        const refImage=await resolveCharacterMedia(refChar,'image');
        const guard=await checkSceneContinuity(working);
        if(!guard.ready){updateScene(scene.id,'status','blocked');throw new Error(`Scene ${scene.number} blocked by continuity: ${guard.blockers.join(' ')}`);}
        const scenePrompt=String(working.prompt||working.title||story||'').trim(); if(!scenePrompt) throw new Error('This scene has no prompt text. Add a description or rebuild the storyboard.'); const r=await apiFetch('/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:scenePrompt,style,camera:working.camera||camera||'Slow dolly',duration:working.duration||duration,format,sceneNumber:working.number,africanProfile,era,storyType,historicalNotes,characters:characters.map(characterPayload),researchBrief:research,referenceImage:refImage||'',referenceCharacter:characterPayload(refChar),projectId:projectId||null,worldBible,rootsFoundation,continuityContext:guard.continuityContext,primaryCharacterId:working.primaryCharacterId||''})});
        const data=await readApiJson(r);
        if(!r.ok) throw new Error(data.message||`Scene ${scene.number} failed.`);
        if(!data.taskId) throw new Error(data.message||`Scene ${scene.number}: no task id returned. Check RUNWAYML_API_SECRET.`);
        setActiveJobId(data.jobId||'');
        const result=await pollTask(data.taskId,data.jobId);
        const url=result.videoUrl||'';
        if(!url) throw new Error(result.message||`Scene ${scene.number} finished without a video URL.`);
        let archived=null;
        if(result.archivedAsset?.id){ try{ archived={asset:result.archivedAsset,url:await openAsset(result.archivedAsset.id)}; }catch(_){ archived=null; } }
        if(!archived && url){ try{ archived=await persistAsset(url,'video',`scene-${scene.number}`); }catch(_){ archived=null; } }
        const finalUrl=archived?.url||url;
        updateScene(scene.id,'status','ready');
        updateScene(scene.id,'videoUrl',finalUrl);
        if(archived){ updateScene(scene.id,'assetId',archived.asset.id); updateScene(scene.id,'assetStoragePath',archived.asset.storage_path); }
        generated.push({...working,videoUrl:finalUrl,status:'ready',assetId:archived?.asset?.id||scene.assetId||'',assetStoragePath:archived?.asset?.storage_path||scene.assetStoragePath||''});
      }
      let cursor=0;
      const nextTimeline=generated.filter(x=>x.videoUrl).map(s=>{const seconds=sceneDurationSeconds(s.duration||duration);const item={id:s.id,type:'video',sceneNumber:s.number,title:s.title,src:s.videoUrl,start:cursor,duration:seconds};cursor+=seconds;return item;});
      setTimeline(nextTimeline);
      if(projectId&&authUser){
        try{ await saveProjectSnapshot({scenes:generated,timeline:nextTimeline}); }
        catch(saveError){ setProjectStatus(`All scenes rendered, but project save needs attention: ${saveError.message}`); }
      }
      setMessage('All scenes are ready.');
    }catch(e){ if(currentScene?.id) updateScene(currentScene.id,'status','failed'); setMessage(e.message||'The film generation stopped.');}
    finally{setGenerating(false)}
  }

  async function pollTask(taskId,jobId=''){
    const maxAttempts=90; // ~7.5 minutes
    for(let i=0;i<maxAttempts;i++){
      await new Promise(r=>setTimeout(r, i<6 ? 3000 : 5000));
      const r=await apiFetch(`/api/generate/${encodeURIComponent(taskId)}`);
      const d=await readApiJson(r);
      if(!r.ok) throw new Error(d.message||'Could not retrieve generation status.');
      if(jobId) await refreshJobs();
      const st=String(d.status||'').toLowerCase();
      if(st==='succeeded'){
        if(d.videoUrl || d.archivedAsset?.id){ setActiveJobId(''); return d; }
        // Succeeded without URL yet — rare race; retry a few times then fail.
        if(i>=3){ setActiveJobId(''); throw new Error(d.message||'Generation succeeded but no video URL was returned.'); }
      }
      if(st==='failed'||st==='canceled'||st==='cancelled'){
        setActiveJobId('');
        throw new Error(d.message||d.failureCode||'Video generation failed.');
      }
      if(d.message && i%4===0) setMessage(d.message);
    }
    throw new Error('Generation is taking longer than expected. Open Exports & Jobs — the task may still finish.');
  }
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
      const result=await pollTask(d.taskId); const url=result.videoUrl||''; const archivedUrl=result.archivedAsset?.id ? await openAsset(result.archivedAsset.id) : '';
      setCharacters(p=>p.map(c=>c.id===character.id?{...c,performanceStatus:'ready',performanceVideoUrl:archivedUrl||url,performanceAssetId:result.archivedAsset?.id||c.performanceAssetId||'',performanceStoragePath:result.archivedAsset?.storage_path||c.performanceStoragePath||''}:c));
      setCharacterStatus(`${character.name}'s performance render is ready. Add its audio/dialogue as a timeline track when assembling the film.`);
    }catch(e){setCharacters(p=>p.map(c=>c.id===character.id?{...c,performanceStatus:'failed'}:c));setCharacterStatus(e.message||'Character performance failed.');}
  }

  async function generateCharacterVoice(character){
    if(!character.voiceId?.trim()) return setVoiceStatus(`Add a voice ID for ${character.name}.`);
    if(!character.dialogue?.trim()) return setVoiceStatus(`Add dialogue for ${character.name} first.`);
    setVoiceGenerating(true); setVoiceAudio(''); setVoiceStatus(`Generating ${character.name}'s dialogue…`);
    try{const r=await apiFetch('/api/voice/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:character.dialogue,voiceId:character.voiceId,voiceLanguageCode:character.voiceLanguageCode,provider:character.voiceProvider||'elevenlabs',africanProfile,modelId:'eleven_v3',projectId})}); const d=await r.json(); if(!r.ok) throw new Error(d.message||'Voice generation failed.'); setVoiceAudio(d.audioUrl || ''); setVoiceStatus(`${character.name}'s voice is ready. Language profile: ${d.language}${d.archivedAsset ? ' · archived in private cloud storage.' : ''}`);}catch(e){setVoiceStatus(e.message||'Voice generation failed.')}finally{setVoiceGenerating(false)}
  }

  const visibleProjects=projectFolderFilter==='All folders'?projects:projects.filter(p=>(p.folder||'My Films')===projectFolderFilter);
  const projectFolders=['All folders',...Array.from(new Set(projects.map(p=>p.folder||'My Films'))).sort()];
  const projectProps={projectFolder, setProjectFolder, projectFolderFilter, setProjectFolderFilter, projectFolders, visibleProjects, authUser,authEmail,setAuthEmail,authPassword,setAuthPassword,authMode,setAuthMode,authStatus,authLoading,handleAuth,handleSignOut,projectId,projectName,setProjectName,projects,projectStatus,projectLoading,lastSavedAt,newProject,saveProject,loadProject,deleteProject,exportFrameworkPack,assets,assetStatus,refreshAssets,openAsset,deleteAsset};
  const researchProps={research,setResearch,researchStatus,setResearchStatus,setEra,setAfricanProfile,setStoryType};
  const timelineProps={timeline,audioTracks,captions,duckMusic,setDuckMusic,captionMode,setCaptionMode,exportQuality,setExportQuality,includeSrt,setIncludeSrt,aiEndCard,setAiEndCard,review,setReview,addAudioTrack,updateAudio,removeAudio,addCaption,updateCaption,removeCaption,exporting,exportFilm,exportUrl,exportSrt,projectName,format};
  const bibleProps={characters,draft,setDraft,characterStatus,setCharacterStatus,addCharacter,removeCharacter,generateCharacterPerformance,uploadMediaToCloud,fileToDataUrl};
  const collaborationProps={apiFetch,projectId,authUser,projectName,room};

  function renderQuickStart(){
    return <section className="quick-start cinematic-panel">
      <div className="quick-start-copy">
        <div className="eyebrow">START A FILM</div>
        <h2>From idea to first scene.</h2>
        <p>Give your film a name and one simple story idea. Avirzo will carry it into the studio.</p>
      </div>
      <div className="quick-start-form">
        <label><span>Film name</span><input className="text-input" value={projectName === 'My Avirzo Film' ? '' : projectName} onChange={e=>setProjectName(e.target.value)} placeholder="e.g. The Last Drum" /></label>
        <label><span>Story idea</span><textarea value={story} onChange={e=>setStory(e.target.value)} rows="4" placeholder="A young boy follows his grandfather into the forest before sunrise…" /></label>
        <div className="quick-start-actions">
          <button className="generate" type="button" onClick={()=>{ if(!story.trim()) { setMessage('Add a short story idea first.'); return; } if(!projectName.trim()) setProjectName('Untitled Avirzo Film'); setMessage('Film started. Build your first scenes in Studio.'); navigate('studio'); }}>Start making →</button>
          <button className="ghost-button" type="button" onClick={()=>navigate('projects')}>Open a project</button>
        </div>
      </div>
    </section>;
  }

  function firstFilmStep(){
    if(!story.trim()) return 1;
    if(!scenes.length) return 2;
    if(!scenes.some(s=>s.status==='ready'||s.videoUrl)) return 3;
    return 4;
  }
  function renderFirstFilmStrip(){
    const step=firstFilmStep();
    const steps=[
      {n:1,label:'Story',done:step>1},
      {n:2,label:'Storyboard',done:step>2},
      {n:3,label:'First scene',done:step>3},
      {n:4,label:'Preview',done:step>=4},
    ];
    return (
      <section className="first-film-strip" aria-label="First film progress">
        <div className="first-film-label">First film path</div>
        <ol className="first-film-steps">
          {steps.map(s=>(
            <li key={s.n} className={s.done?'done':(s.n===step?'current':'')}>
              <span className="step-num">{s.done?'✓':s.n}</span>
              <span className="step-label">{s.label}</span>
            </li>
          ))}
        </ol>
        <p className="first-film-hint">
          {step===1 && 'Pick a heritage template or write a short story, then build the storyboard.'}
          {step===2 && 'Tap “Build storyboard” in Story mode to create your first shots.'}
          {step===3 && 'Open Scenes and generate your first shot to see it on screen.'}
          {step===4 && 'Your first scene is ready. Open Timeline or Exports when you want to assemble the film.'}
        </p>
        {lastSavedAt && authUser && (
          <p className="last-saved-note" role="status">Last saved {new Date(lastSavedAt).toLocaleString()}</p>
        )}
      </section>
    );
  }
  function renderStudio(){
    return <>
      <section className="page-heading studio-heading">
        <div className="eyebrow">STUDIO · v2.11.0</div>
        <div className="studio-title-row">
          <div>
            <h1>Make your film.</h1>
            <p>One workspace. One step at a time.</p>
          </div>
          <button type="button" className="templates-trigger" onClick={()=>setShowTemplates(true)}>✦ Templates</button>
        </div>
      </section>
      {renderFirstFilmStrip()}
      {!projectId && !story.trim() && renderQuickStart()}
      <section className="studio-shell-card">
        <div className="tabs studio-nav compact-tabs" role="tablist" aria-label="Studio modes">
          <button type="button" className={mode==='story'?'active':''} onClick={()=>setMode('story')}>Story</button>
          <button type="button" className={mode==='shot'?'active':''} onClick={()=>setMode('shot')}>Shot</button>
          <button type="button" onClick={()=>navigate('heritage')}>Heritage</button>
          <button type="button" onClick={()=>navigate('voices')}>Voices</button>
          <button type="button" onClick={()=>navigate('timeline')}>Timeline</button>
        </div>
        <TemplatePicker visible={showTemplates} onSelect={applyTemplate} onDismiss={()=>setShowTemplates(false)} />
        {mode==='story' ? <>
          <StoryComposer mode="story" setMode={setMode} story={story} setStory={setStory} africanProfile={africanProfile} setAfricanProfile={setAfricanProfile} era={era} setEra={setEra} storyType={storyType} setStoryType={setStoryType} historicalNotes={historicalNotes} setHistoricalNotes={setHistoricalNotes} profile={profile} loadingPlan={loadingPlan} makeStoryboard={makeStoryboard} camera={camera} characters={characters} setScenes={setScenes} setMessage={setMessage}/>
          <StoryIntelligencePanel apiFetch={apiFetch} story={story} rootsFoundation={rootsFoundation} characters={characters.map(characterPayload)} research={research} worldBible={worldBible} scenes={scenes} era={era} storyType={storyType} setMessage={setMessage}/>
        </> : <>
          <AIFilmmakingPanel visible={showAICopilot} apiFetch={apiFetch} story={story} characters={characters.map(characterPayload)} scenes={scenes} research={research} rootsFoundation={rootsFoundation} era={era} storyType={storyType} profile={profile} setScenes={setScenes} setMessage={setMessage}/>
          <FilmLookControls style={style} setStyle={setStyle} camera={camera} setCamera={setCamera} duration={duration} setDuration={setDuration} format={format} setFormat={setFormat} profile={profile} era={era} storyType={storyType} characters={characters}/>
        </>}
      </section>
      {message&&<div className="status global-status" role="status" aria-live="polite">{message}</div>}
    </>;
  }

  function renderHome(){
    return <>
      <section className="home-hero page-heading premium-hero">
        <div className="hero-orbit" aria-hidden="true"><span></span><span></span><span></span></div>
        <div className="eyebrow">AVIRZO · AFRICAN CINEMA STUDIO</div>
        <h1>Stories with<br/><em>a soul.</em></h1>
        <p>Turn African stories, memory and imagination into cinematic films — with the roots kept at the heart of every frame.</p>
        <div className="hero-actions">
          <button className="hero-cta" type="button" onClick={()=>navigate('studio')}>Enter the Studio <span>→</span></button>
          <button className="hero-link" type="button" onClick={()=>navigate('projects')}>View films</button>
        </div>
        <div className="hero-signature"><span>HERITAGE-FIRST</span><i></i><span>CREATOR-LED</span><i></i><span>CINEMATIC</span></div>
      </section>
      <section className="dashboard-grid dashboard-grid-home premium-dashboard">
        <button className="dashboard-card dashboard-primary premium-card" onClick={()=>navigate('studio')}><span className="dashboard-icon">✦</span><span className="card-kicker">01 · CREATE</span><strong>Studio</strong><small>Shape the story, then make the scene.</small><span className="card-arrow">↗</span></button>
        <button className="dashboard-card premium-card" onClick={()=>navigate('projects')}><span className="dashboard-icon">▣</span><span className="card-kicker">02 · BUILD</span><strong>Projects</strong><small>Keep every film, scene and asset together.</small><span className="card-arrow">↗</span></button>
        <button className="dashboard-card premium-card" onClick={()=>navigate('heritage')}><span className="dashboard-icon">◈</span><span className="card-kicker">03 · ROOT</span><strong>Heritage</strong><small>Protect the culture behind the story.</small><span className="card-arrow">↗</span></button>
      </section>
      <section className="dashboard-status-grid compact-status-grid">
        <div className="card-inset"><span>NOW</span><strong>{projectName || 'No film selected'}</strong><small>{scenes.length} scenes · {characters.length} characters</small></div>
        <div className="card-inset"><span>STATUS</span><strong>{authUser ? 'Cloud' : 'Local'} · FFmpeg ready</strong><small>{recentJobs.length} recent jobs{lastSavedAt ? ` · saved ${new Date(lastSavedAt).toLocaleTimeString()}` : ''}</small></div>
      </section>
      <section className="example-films" aria-label="Example film paths">
        <div className="section-head">
          <div>
            <div className="eyebrow">SEE THE PATH</div>
            <h2>Example first films</h2>
            <p>Three short paths from heritage template to first scene. Open Studio and follow the same steps.</p>
          </div>
        </div>
        <div className="example-film-grid">
          <article className="example-film-card">
            <span className="example-tag">ORAL MEMORY</span>
            <strong>Elder at dawn</strong>
            <p>Luganda · oral tradition · 1–2 scenes. Template seeds language, era and character continuity.</p>
            <button type="button" className="ghost-button" onClick={()=>{ const t=heritageTemplates.find(x=>x.id==='oral-elder'); if(t){ applyTemplate(t); navigate('studio'); } }}>Start this path →</button>
          </article>
          <article className="example-film-card">
            <span className="example-tag">DOCUMENTED</span>
            <strong>Named place, dated past</strong>
            <p>History-led short with research notes and clear oral vs documented labeling.</p>
            <button type="button" className="ghost-button" onClick={()=>{ const t=heritageTemplates.find(x=>x.id==='documented-history'||x.storyType==='historical'); if(t){ applyTemplate(t); navigate('studio'); } else { setShowTemplates(true); navigate('studio'); } }}>Start this path →</button>
          </article>
          <article className="example-film-card">
            <span className="example-tag">9:16 SOCIAL</span>
            <strong>Vertical heritage reel</strong>
            <p>Short vertical film for social platforms — still culturally grounded.</p>
            <button type="button" className="ghost-button" onClick={()=>{ const t=heritageTemplates.find(x=>x.id==='vertical-heritage'||x.format==='9:16'); if(t){ applyTemplate(t); navigate('studio'); } else { setShowTemplates(true); navigate('studio'); } }}>Start this path →</button>
          </article>
        </div>
      </section>
    </>;
  }

  function renderPage(){
    if(inProjectRoute){
      if(viewPage==='overview') return <ProjectWorkspace projectId={projectId} projectName={projectName} projectFolder={projectFolder} authUser={authUser} projectStatus={projectStatus} navigate={navigate} routeSection="overview" showOverview />;
      return <div className="project-section-page">
        <ProjectWorkspace projectId={projectId} projectName={projectName} projectFolder={projectFolder} authUser={authUser} projectStatus={projectStatus} navigate={navigate} routeSection={viewPage} showOverview={false} />
        <div className="project-section-content">{renderGlobalPage(viewPage)}</div>
      </div>;
    }
    return renderGlobalPage(viewPage);
  }

  function renderGlobalPage(pageName){
    if(pageName==='home') return renderHome();
    if(pageName==='studio') return renderStudio();
    if(pageName==='projects') return <div className="page-stack"><section className="page-heading"><div className="eyebrow">PROJECT LIBRARY</div><h1>Your films</h1><p>Your films, folders and workspaces.</p></section><ProjectsPanel {...projectProps} visible />{showProduction && <ProductionPanel visible apiFetch={apiFetch} projectId={projectId} scenes={scenes}/>}</div>;
    if(pageName==='heritage') return <div className="page-stack"><section className="page-heading"><div className="eyebrow">HERITAGE BIBLE</div><h1>Heritage Bible</h1><p>Keep the world, research and characters together.</p></section><RootsFoundation value={rootsFoundation} onChange={setRootsFoundation} profile={africanProfile} era={era} storyType={storyType}/><WorldBible value={worldBible} onChange={setWorldBible} characters={characters}/><ResearchPanel {...researchProps} visible /><CharacterBible {...bibleProps} visible /><StoryIntelligencePanel apiFetch={apiFetch} story={story} rootsFoundation={rootsFoundation} characters={characters.map(characterPayload)} research={research} worldBible={worldBible} scenes={scenes} era={era} storyType={storyType} setMessage={setMessage}/></div>;
    if(pageName==='story') return <div className="page-stack"><section className="page-heading"><div className="eyebrow">STORY DEVELOPMENT</div><h1>Story</h1><p>Build the story, then send it to Scenes.</p></section><StoryComposer mode="story" setMode={setMode} story={story} setStory={setStory} africanProfile={africanProfile} setAfricanProfile={setAfricanProfile} era={era} setEra={setEra} storyType={storyType} setStoryType={setStoryType} historicalNotes={historicalNotes} setHistoricalNotes={setHistoricalNotes} profile={profile} loadingPlan={loadingPlan} makeStoryboard={makeStoryboard} camera={camera} characters={characters} setScenes={setScenes} setMessage={setMessage}/><StoryIntelligencePanel apiFetch={apiFetch} story={story} rootsFoundation={rootsFoundation} characters={characters.map(characterPayload)} research={research} worldBible={worldBible} scenes={scenes} era={era} storyType={storyType} setMessage={setMessage}/></div>;
    if(pageName==='scenes') return <div className="page-stack"><section className="page-heading"><div className="eyebrow">SCENE BOARD</div><h1>Scenes</h1><p>Plan shots and track continuity.</p></section><Storyboard scenes={scenes} characters={characters} profile={profile} era={era} generating={generating} generateAll={generateAll} generateScene={generateScene} updateScene={updateScene} moveScene={moveScene} characterForScene={characterForScene}/></div>;
    if(pageName==='voices') return <div className="page-stack"><section className="page-heading"><div className="eyebrow">CHARACTER VOICES</div><h1>Voices</h1><p>Create dialogue and character voices.</p></section><VoicesPanel visible characters={characters} setCharacters={setCharacters} profile={profile} voiceGenerating={voiceGenerating} voiceAudio={voiceAudio} voiceStatus={voiceStatus} generateCharacterVoice={generateCharacterVoice}/></div>;
    if(pageName==='timeline') return <div className="page-stack"><section className="page-heading"><div className="eyebrow">EDITING TIMELINE</div><h1>Timeline</h1><p>Assemble scenes, sound and captions.</p></section><TimelinePanel {...timelineProps} visible /></div>;
    if(pageName==='assets') return <div className="page-stack"><section className="page-heading"><div className="eyebrow">MEDIA LIBRARY</div><h1>Assets</h1><p>Images, clips and audio for this film.</p></section><AssetsPanel authUser={authUser} projectId={projectId} projectName={projectName} assets={assets} assetStatus={assetStatus} refreshAssets={refreshAssets} openAsset={openAsset} deleteAsset={deleteAsset}/></div>;
    if(pageName==='exports') return <div className="page-stack"><section className="page-heading"><div className="eyebrow">EXPORTS & JOBS</div><h1>Exports</h1><p>Exports and background jobs.</p></section><JobCenter jobs={jobs} recent={recentJobs} busyJobId={cancelingJobId} retryingJobId={retryingJobId} onCancel={cancelActiveJob} onRetry={retryActiveJob}/><TimelinePanel {...timelineProps} visible /></div>;
    if(pageName==='profile') return <ProfilePanel {...{authUser,authEmail,setAuthEmail,authPassword,setAuthPassword,authMode,setAuthMode,authStatus,authLoading,handleAuth,handleSignOut}} />;
    if(pageName==='settings') return <SettingsPanel format={format} setFormat={setFormat} style={style} setStyle={setStyle} camera={camera} setCamera={setCamera} duration={duration} setDuration={setDuration} styles={styles} cameras={cameras} formats={formats} durations={durations}/>;
    return renderHome();
  }

  return <AppShell page={viewPage} navigate={navigate} authUser={authUser} projectId={projectId} projectName={projectName} inProjectRoute={inProjectRoute} routeProjectId={routeProjectId}>
    <Suspense fallback={<div className="page-stack" role="status" aria-live="polite"><section className="page-heading"><div className="eyebrow">LOADING</div><h1>One moment…</h1></section></div>}>{renderPage()}</Suspense>
    {videoUrl&&page!=='scenes'&&<section className="bible-panel result"><div className="eyebrow">LATEST RENDER</div><video aria-label="Video preview" controls playsInline src={videoUrl}/><a className="download" href={videoUrl} target="_blank" rel="noreferrer">Open generated video</a><small>Provider video URLs are temporary; completed project media is archived in your private Storage library when cloud storage is enabled.</small></section>}
  </AppShell>;
}
createRoot(document.getElementById('root')).render(<AppErrorBoundary><App/></AppErrorBoundary>);
