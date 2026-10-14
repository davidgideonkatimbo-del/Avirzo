import React,{useMemo,useState} from 'react';

const EMPTY={locations:'',objects:'',costumes:'',architecture:'',culturalPractices:'',musicSoundscape:'',languageRules:'',visualRules:'',familyStructure:'',taboosAndSensitivities:'',continuityLocks:'',relationships:''};
export function WorldBible({value,onChange,characters=[]}){
 const [open,setOpen]=useState(false); const data={...EMPTY,...(value||{})};
 const ruleKeys=['locations','objects','costumes','architecture','culturalPractices','musicSoundscape','languageRules','visualRules','familyStructure','taboosAndSensitivities','continuityLocks'];
 const completeness=useMemo(()=>ruleKeys.filter(k=>String(data[k]||'').trim()).length, [data]);
 function set(k,v){onChange({...data,[k]:v});}
 return <section className="card-inset world-bible">
  <div className="roots-head"><div><div className="eyebrow">WORLD BIBLE 2.0</div><h3>Build the world behind the film</h3><p className="muted">Persistent places, objects, clothing, customs, language rules and continuity locks travel with the story.</p></div><button type="button" onClick={()=>setOpen(!open)}>{open?'Hide world bible':'Open world bible'}</button></div>
  <div className="passport-grid"><div><small>WORLD RULES</small><strong>{completeness}/{ruleKeys.length}</strong></div><div><small>CHARACTERS</small><strong>{characters.length}</strong></div><div><small>RELATIONSHIPS</small><strong>{String(data.relationships||'').split(/\n+/).filter(Boolean).length}</strong></div><div><small>STATUS</small><strong>{completeness>=9?'Strong':completeness>=6?'Developing':'Needs detail'}</strong></div></div>
  {open&&<>
   <div className="world-grid">
    <textarea aria-label="Locations — villages, compounds, roads, rivers, sacred places, landscapes…" value={data.locations} onChange={e=>set('locations',e.target.value)} placeholder="Locations — villages, compounds, roads, rivers, sacred places, landscapes…" />
    <textarea aria-label="Important objects — tools, vessels, weapons, instruments, heirlooms, farming implements…" value={data.objects} onChange={e=>set('objects',e.target.value)} placeholder="Important objects — tools, vessels, weapons, instruments, heirlooms, farming implements…" />
    <textarea aria-label="Costume & adornment — fabrics, colours, jewellery, hairstyles, status markers…" value={data.costumes} onChange={e=>set('costumes',e.target.value)} placeholder="Costume & adornment — fabrics, colours, jewellery, hairstyles, status markers…" />
    <textarea aria-label="Architecture & material culture — homes, compounds, furniture, building materials…" value={data.architecture} onChange={e=>set('architecture',e.target.value)} placeholder="Architecture & material culture — homes, compounds, furniture, building materials…" />
    <textarea aria-label="Cultural practices — greetings, ceremonies, food, work, family customs, storytelling…" value={data.culturalPractices} onChange={e=>set('culturalPractices',e.target.value)} placeholder="Cultural practices — greetings, ceremonies, food, work, family customs, storytelling…" />
    <textarea aria-label="Music & soundscape — instruments, rhythms, ambience, silence, performance traditions…" value={data.musicSoundscape} onChange={e=>set('musicSoundscape',e.target.value)} placeholder="Music & soundscape — instruments, rhythms, ambience, silence, performance traditions…" />
    <textarea aria-label="Language rules — dialect, honorifics, proverbs, code-switching, forbidden modern phrases…" value={data.languageRules} onChange={e=>set('languageRules',e.target.value)} placeholder="Language rules — dialect, honorifics, proverbs, code-switching, forbidden modern phrases…" />
    <textarea aria-label="Visual rules — palette, camera distance, sacred spaces, recurring motifs, realism level…" value={data.visualRules} onChange={e=>set('visualRules',e.target.value)} placeholder="Visual rules — palette, camera distance, sacred spaces, recurring motifs, realism level…" />
    <textarea aria-label="Family / community structure — kinship, elders, authority, inheritance, social roles…" value={data.familyStructure} onChange={e=>set('familyStructure',e.target.value)} placeholder="Family / community structure — kinship, elders, authority, inheritance, social roles…" />
    <textarea aria-label="Taboos & sensitivities — practices requiring research or community review…" value={data.taboosAndSensitivities} onChange={e=>set('taboosAndSensitivities',e.target.value)} placeholder="Taboos & sensitivities — practices requiring research or community review…" />
    <textarea aria-label="Continuity locks — details that must never change between scenes…" value={data.continuityLocks} onChange={e=>set('continuityLocks',e.target.value)} placeholder="Continuity locks — details that must never change between scenes…" />
    <textarea aria-label="Relationships — one per line, e.g. Kato -> grandfather -> mentor; Amina -> sister -> protector" value={data.relationships} onChange={e=>set('relationships',e.target.value)} placeholder="Relationships — one per line, e.g. Kato -> grandfather -> mentor; Amina -> sister -> protector" />
   </div>
   <div className="heritage-callout"><b>Continuity principle:</b> Avirzo treats this as a production constraint, not a claim of historical truth. Research and community review remain the authority for culturally sensitive details.</div>
  </>}
 </section>;
}
