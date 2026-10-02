import React, {useMemo, useState} from 'react';
import { africanProfiles, heritageEras, storyTypes } from '../constants';

const defaults={community:'',country:'',place:'',language:'',period:'',culturalAnchors:'',evidenceLevel:'',creativeLiberties:'',sensitivityNotes:''};

export function RootsFoundation({value,onChange,profile,era,storyType}){
  const [open,setOpen]=useState(true);
  const v={...defaults,...(value||{})};
  const selected=useMemo(()=>africanProfiles.find(x=>x.id===profile),[profile]);
  const issues=[];
  if(!v.community.trim()) issues.push('Name the community or cultural group.');
  if(!v.place.trim()) issues.push('Name the specific place or landscape.');
  if(!v.period.trim() && era!=='custom') issues.push('Add a more specific period or decade.');
  if(['historical','oral','folklore'].includes(storyType) && !v.evidenceLevel.trim()) issues.push('State whether the foundation is documented, oral, mixed, or fictionalized.');
  if(!v.culturalAnchors.trim()) issues.push('Add 2–3 cultural anchors: architecture, clothing, food, tools, music, social practice, landscape, etc.');
  const update=(key,val)=>onChange({...v,[key]:val});
  return <section className="roots-foundation card-inset">
    <div className="roots-head"><div><div className="eyebrow">AVIRZO ROOTS FOUNDATION</div><h3>Protect the identity of the story</h3><p className="muted">Define what makes this story belong to its people, place, language and time before generation begins.</p></div><button className="linkish" onClick={()=>setOpen(!open)}>{open?'Collapse':'Open'}</button></div>
    {open&&<>
      <div className="roots-context"><span>{selected?.market||'Africa'}</span><span>{selected?.language||'Language not selected'}</span><span>{heritageEras.find(x=>x.id===era)?.label||era}</span><span>{storyTypes.find(x=>x.id===storyType)?.label||storyType}</span></div>
      <div className="roots-grid">
        <label><span>COMMUNITY / CULTURAL GROUP</span><input value={v.community} onChange={e=>update('community',e.target.value)} placeholder="e.g. Baganda" /></label>
        <label><span>COUNTRY / REGION</span><input value={v.country} onChange={e=>update('country',e.target.value)} placeholder="e.g. Uganda · Central Region" /></label>
        <label><span>PLACE / LANDSCAPE</span><input value={v.place} onChange={e=>update('place',e.target.value)} placeholder="e.g. Buganda lakeshore village" /></label>
        <label><span>STORY LANGUAGE</span><input value={v.language} onChange={e=>update('language',e.target.value)} placeholder={selected?.language||'Language / dialect'} /></label>
        <label><span>SPECIFIC PERIOD</span><input value={v.period} onChange={e=>update('period',e.target.value)} placeholder="e.g. c. 1880–1900" /></label>
        <label><span>EVIDENCE LEVEL</span><select value={v.evidenceLevel} onChange={e=>update('evidenceLevel',e.target.value)}><option value="">Choose…</option><option>Documented history</option><option>Oral tradition</option><option>Mixed: documented + oral</option><option>Creative reconstruction</option></select></label>
      </div>
      <label className="roots-wide"><span>CULTURAL ANCHORS</span><textarea value={v.culturalAnchors} onChange={e=>update('culturalAnchors',e.target.value)} placeholder="What should the audience feel and see? Architecture, clothing, food, tools, music, landscape, social customs, storytelling practices…" rows="3" /></label>
      <label className="roots-wide"><span>CREATIVE LIBERTIES</span><textarea value={v.creativeLiberties} onChange={e=>update('creativeLiberties',e.target.value)} placeholder="What may Avirzo invent or dramatize? Keep this separate from historical claims." rows="2" /></label>
      <label className="roots-wide"><span>SENSITIVITY / COMMUNITY NOTES</span><textarea value={v.sensitivityNotes} onChange={e=>update('sensitivityNotes',e.target.value)} placeholder="Sacred places, restricted practices, pronunciation preferences, community review requirements…" rows="2" /></label>
      {issues.length?<div className="roots-warning"><b>Roots check before rendering</b>{issues.map((x,i)=><div key={i}>• {x}</div>)}</div>:<div className="roots-success">✓ Roots foundation is defined. Avirzo can carry these anchors into research, characters, scenes and prompts.</div>}
    </>}
  </section>;
}
