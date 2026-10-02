import React,{useMemo,useState} from 'react';

const EMPTY={locations:'',objects:'',costumes:'',architecture:'',culturalPractices:'',musicSoundscape:'',languageRules:'',visualRules:'',familyStructure:'',taboosAndSensitivities:'',continuityLocks:'',relationships:''};
export function WorldBible({value,onChange,characters=[]}){
 const [open,setOpen]=useState(false); const data={...EMPTY,...(value||{})};
 const completeness=useMemo(()=>Object.entries(data).filter(([k])=>k!=='relationships'&&String(k==='relationships'?data[k]:data[k]||'').trim()).length, [data]);
 function set(k,v){onChange({...data,[k]:v});}
 return <section className="card-inset world-bible">
  <div className="roots-head"><div><div className="eyebrow">WORLD BIBLE 2.0</div><h3>Build the world behind the film</h3><p className="muted">Persistent places, objects, clothing, customs, language rules and continuity locks travel with the story.</p></div><button type="button" onClick={()=>setOpen(!open)}>{open?'Hide world bible':'Open world bible'}</button></div>
  <div className="passport-grid"><div><small>WORLD RULES</small><strong>{completeness}/10</strong></div><div><small>CHARACTERS</small><strong>{characters.length}</strong></div><div><small>RELATIONSHIPS</small><strong>{String(data.relationships||'').split(/\n+/).filter(Boolean).length}</strong></div><div><small>STATUS</small><strong>{completeness>=8?'Strong':'Developing'}</strong></div></div>
  {open&&<>
   <div className="world-grid">
    <textarea value={data.locations} onChange={e=>set('locations',e.target.value)} placeholder="Locations — villages, compounds, roads, rivers, sacred places, landscapes…" />
    <textarea value={data.objects} onChange={e=>set('objects',e.target.value)} placeholder="Important objects — tools, vessels, weapons, instruments, heirlooms, farming implements…" />
    <textarea value={data.costumes} onChange={e=>set('costumes',e.target.value)} placeholder="Costume & adornment — fabrics, colours, jewellery, hairstyles, status markers…" />
    <textarea value={data.architecture} onChange={e=>set('architecture',e.target.value)} placeholder="Architecture & material culture — homes, compounds, furniture, building materials…" />
    <textarea value={data.culturalPractices} onChange={e=>set('culturalPractices',e.target.value)} placeholder="Cultural practices — greetings, ceremonies, food, work, family customs, storytelling…" />
    <textarea value={data.musicSoundscape} onChange={e=>set('musicSoundscape',e.target.value)} placeholder="Music & soundscape — instruments, rhythms, ambience, silence, performance traditions…" />
    <textarea value={data.languageRules} onChange={e=>set('languageRules',e.target.value)} placeholder="Language rules — dialect, honorifics, proverbs, code-switching, forbidden modern phrases…" />
    <textarea value={data.visualRules} onChange={e=>set('visualRules',e.target.value)} placeholder="Visual rules — palette, camera distance, sacred spaces, recurring motifs, realism level…" />
    <textarea value={data.familyStructure} onChange={e=>set('familyStructure',e.target.value)} placeholder="Family / community structure — kinship, elders, authority, inheritance, social roles…" />
    <textarea value={data.taboosAndSensitivities} onChange={e=>set('taboosAndSensitivities',e.target.value)} placeholder="Taboos & sensitivities — practices requiring research or community review…" />
    <textarea value={data.continuityLocks} onChange={e=>set('continuityLocks',e.target.value)} placeholder="Continuity locks — details that must never change between scenes…" />
    <textarea value={data.relationships} onChange={e=>set('relationships',e.target.value)} placeholder="Relationships — one per line, e.g. Kato -> grandfather -> mentor; Amina -> sister -> protector" />
   </div>
   <div className="heritage-callout"><b>Continuity principle:</b> Avirzo treats this as a production constraint, not a claim of historical truth. Research and community review remain the authority for culturally sensitive details.</div>
  </>}
 </section>;
}
