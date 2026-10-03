import React, { useEffect, useState } from 'react';

const PROVIDERS = [
  { id:'elevenlabs', label:'ElevenLabs', hint:'Expressive / premium' },
  { id:'google', label:'Google Cloud TTS', hint:'Broad catalogue' },
  { id:'azure', label:'Azure Speech', hint:'Neural + SSML' },
  { id:'polly', label:'Amazon Polly', hint:'AWS voice stack' }
];

export function VoicesPanel({ visible, characters, setCharacters, profile, voiceGenerating, voiceAudio, voiceStatus, generateCharacterVoice }) {
  const [providerState, setProviderState] = useState({});
  useEffect(() => { if (!visible) return; fetch('/api/voice/options').then(r=>r.json()).then(d=>setProviderState(Object.fromEntries((d.providers||[]).map(p=>[p.id,p.configured])))).catch(()=>{}); }, [visible]);
  if (!visible) return null;
  return <section className="bible-panel voice-panel">
    <div className="section-head"><div><div className="eyebrow">AFRICAN VOICES & DIALOGUE · MULTI-PROVIDER</div><h2>Give the characters a voice.</h2><p>Choose a provider per character. Avirzo keeps the provider, voice ID and language profile attached to the project so a production can be reproduced later.</p></div></div>
    {!characters.length ? <div className="heritage-callout">🎙 Add characters in the Heritage Bible first, then assign a provider voice and dialogue here.</div> : characters.map(c => {
      const provider=c.voiceProvider||'elevenlabs';
      return <article className="voice-card" key={c.id}>
        <div className="voice-card-head"><div><strong>{c.name}</strong><span>{c.language || profile?.language || 'Language not specified'} · {c.community || profile?.market}</span></div><span className="voice-chip">{c.voiceId ? 'VOICE READY' : 'VOICE ID NEEDED'}</span></div>
        <div className="inline-form">
          <select aria-label={`Voice provider for ${c.name || 'character'}`} value={provider} onChange={e=>setCharacters(p=>p.map(x=>x.id===c.id?{...x,voiceProvider:e.target.value}:x))}>{PROVIDERS.map(p=><option key={p.id} value={p.id}>{p.label}{providerState[p.id]===false?' · not configured':''}</option>)}</select>
          <input aria-label={provider==='elevenlabs'?'ElevenLabs voice ID':'Provider voice name / ID'} value={c.voiceId||''} onChange={e=>setCharacters(p=>p.map(x=>x.id===c.id?{...x,voiceId:e.target.value}:x))} placeholder={provider==='elevenlabs'?'ElevenLabs voice ID':'Provider voice name / ID'} />
          <input aria-label="Language code (optional, e.g. en-ZA)" value={c.voiceLanguageCode||''} onChange={e=>setCharacters(p=>p.map(x=>x.id===c.id?{...x,voiceLanguageCode:e.target.value}:x))} placeholder="Language code (optional, e.g. en-ZA)" />
        </div>
        <textarea aria-label="Dialogue for this character…" value={c.dialogue||''} onChange={e=>setCharacters(p=>p.map(x=>x.id===c.id?{...x,dialogue:e.target.value}:x))} rows="3" placeholder="Dialogue for this character…" />
        <input aria-label="Voice notes — age, pace, warmth, authority, emotion…" value={c.voiceNotes||''} onChange={e=>setCharacters(p=>p.map(x=>x.id===c.id?{...x,voiceNotes:e.target.value}:x))} placeholder="Voice notes — age, pace, warmth, authority, emotion…" />
        <button className="generate" type="button" onClick={()=>generateCharacterVoice(c)} disabled={voiceGenerating}>{voiceGenerating?'Generating voice…':`Generate ${c.name}'s dialogue`}</button>
      </article>;
    })}
    {voiceAudio && <div className="audio-result"><div className="eyebrow">LATEST VOICE</div><audio aria-label="Audio preview" controls src={voiceAudio}/></div>}
    {voiceStatus && <div className="heritage-callout">🎙 {voiceStatus}</div>}
    <div className="heritage-callout"><strong>Provider strategy:</strong> ElevenLabs remains the default. Google Cloud TTS, Azure Speech and Amazon Polly are now first-class adapters; each must be configured with its own credentials before it can generate. Language availability is provider-specific and should be verified for the exact voice before release.</div>
  </section>;
}
