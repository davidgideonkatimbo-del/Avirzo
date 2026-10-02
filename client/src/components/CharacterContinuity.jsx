import React,{useState} from 'react';

const DEFAULTS={characterId:'',emotionalState:'',possessions:'',ageProgression:'',appearanceChanges:'',sceneNotes:''};

export function CharacterContinuity({apiFetch,characters,scenes,worldBible,rootsFoundation,setMessage}){
  const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[data,setData]=useState(null),[error,setError]=useState('');
  async function audit(){
    setBusy(true);setError('');
    try{
      const r=await apiFetch('/api/ai/character-continuity',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({characters,scenes,worldBible,rootsFoundation})});
      const d=await r.json(); if(!r.ok)throw new Error(d.message||'Character continuity audit failed.');
      setData(d);setOpen(true);setMessage?.('Character continuity audit updated.');
    }catch(e){setError(e.message||'Character continuity audit failed.');}finally{setBusy(false);}
  }
  return <section className="card-inset story-intelligence">
    <div className="roots-head"><div><div className="eyebrow">CHARACTER CONTINUITY ENGINE</div><h3>Keep every person recognizable from scene to scene</h3><p className="muted">Avirzo checks identity, clothing, language, relationships, possessions, emotional state and scene assignments against each character’s established world.</p></div><button className="generate" onClick={audit} disabled={busy}>{busy?'Auditing…':'Audit continuity'}</button></div>
    {error&&<div className="ai-warning">{error}</div>}
    {data&&<div className="story-intel-results"><div className="passport-grid"><div><small>CONTINUITY</small><strong>{data.score}%</strong></div><div><small>CHARACTERS</small><strong>{data.characters?.length||0}</strong></div><div><small>SCENES</small><strong>{data.sceneCount||0}</strong></div><div><small>FLAGS</small><strong>{data.warnings?.length||0}</strong></div></div><div className="panel-tabs"><button className={open?'active':''} onClick={()=>setOpen(!open)}>{open?'Hide audit':'Show audit'}</button></div>{open&&<><div className={data.warnings?.length?'ai-warning':'ai-success'}>{data.warnings?.length?data.warnings.map((x,i)=><div key={i}>⚠ {x}</div>):<div>✓ No continuity conflicts were detected in the current project data.</div>}</div>{data.characters?.map(c=><div className="ai-beat" key={c.id}><b>{c.name}</b><small>{c.sceneCount} scene{c.sceneCount===1?'':'s'} · {c.status}</small>{c.primaryCharacter&&<small> · Primary in scene assignments</small>}{c.flags?.map((x,i)=><div key={i}>• {x}</div>)}{c.locked?.length>0&&<small>Locks: {c.locked.join(' · ')}</small>}</div>)}<div className="heritage-callout"><b>Continuity principle:</b> established character details should remain stable unless a deliberate story change is recorded. World Bible and community/research review remain the authority for cultural and historical accuracy.</div></>}</div></div>}
  </section>;
}

export const emptyContinuity=DEFAULTS;
