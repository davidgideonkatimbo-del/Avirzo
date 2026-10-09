const GOOGLE_API = 'https://texttospeech.googleapis.com/v1/text:synthesize';

export const VOICE_PROVIDERS = {
  elevenlabs: { id:'elevenlabs', name:'ElevenLabs', env:'ELEVENLABS_API_KEY', note:'Premium expressive voices and multilingual delivery.' },
  google: { id:'google', name:'Google Cloud TTS', env:'GOOGLE_TTS_API_KEY', note:'Broad language catalogue; configure a Google TTS API key.' },
  azure: { id:'azure', name:'Azure Speech', env:'AZURE_SPEECH_KEY', note:'Neural voices and SSML; configure key + region.' },
  polly: { id:'polly', name:'Amazon Polly', env:'AWS_ACCESS_KEY_ID', note:'AWS-native TTS; configure IAM credentials and region.' }
};

export function providerConfigured(id) {
  if (id === 'elevenlabs') return Boolean(process.env.ELEVENLABS_API_KEY);
  if (id === 'google') return Boolean(process.env.GOOGLE_TTS_API_KEY);
  if (id === 'azure') return Boolean(process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION);
  if (id === 'polly') return Boolean(process.env.AWS_REGION && (process.env.AWS_ACCESS_KEY_ID || process.env.AWS_PROFILE));
  return false;
}

export function voiceProviderOptions() {
  return Object.values(VOICE_PROVIDERS).map(p => ({...p, configured: providerConfigured(p.id)}));
}

export async function synthesizeVoice({ provider='elevenlabs', text, voiceId, languageCode, modelId='eleven_v3' }) {
  if (!VOICE_PROVIDERS[provider]) throw new Error('Unsupported voice provider.');
  if (!providerConfigured(provider)) throw new Error(`${VOICE_PROVIDERS[provider].name} is not configured on the server.`);
  if (provider === 'elevenlabs') {
    const body = { text, model_id:modelId, voice_settings:{stability:0.48, similarity_boost:0.78, style:0.35, use_speaker_boost:true} };
    if (languageCode) body.language_code = languageCode;
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`, {method:'POST',headers:{'xi-api-key':process.env.ELEVENLABS_API_KEY,'Content-Type':'application/json'},body:JSON.stringify(body)});
    const b=Buffer.from(await r.arrayBuffer()); if(!r.ok) throw new Error('ElevenLabs rejected the voice request.'); return {buffer:b,contentType:'audio/mpeg'};
  }
  if (provider === 'google') {
    const r=await fetch(`${GOOGLE_API}?key=${encodeURIComponent(process.env.GOOGLE_TTS_API_KEY)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({input:{text},voice:{languageCode:languageCode||'en-US',name:voiceId||undefined},audioConfig:{audioEncoding:'MP3'}})});
    const d=await r.json(); if(!r.ok) throw new Error(d.error?.message||'Google Cloud TTS rejected the voice request.'); return {buffer:Buffer.from(d.audioContent,'base64'),contentType:'audio/mpeg'};
  }
  if (provider === 'azure') {
    const locale=languageCode||'en-US'; const voice=voiceId||''; const ssml=`<speak version="1.0" xml:lang="${locale}"><voice name="${voice}">${escapeXml(text)}</voice></speak>`;
    const r=await fetch(`https://${process.env.AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`,{method:'POST',headers:{'Ocp-Apim-Subscription-Key':process.env.AZURE_SPEECH_KEY,'Content-Type':'application/ssml+xml','X-Microsoft-OutputFormat':'audio-24khz-48kbitrate-mono-mp3'},body:ssml});
    const b=Buffer.from(await r.arrayBuffer()); if(!r.ok) throw new Error('Azure Speech rejected the voice request.'); return {buffer:b,contentType:'audio/mpeg'};
  }
  const { PollyClient, SynthesizeSpeechCommand } = await import('@aws-sdk/client-polly');
  const client=new PollyClient({region:process.env.AWS_REGION});
  const out=await client.send(new SynthesizeSpeechCommand({Text:text,OutputFormat:'mp3',VoiceId:voiceId||'Ayanda',LanguageCode:languageCode||'en-ZA'}));
  const chunks=[]; for await (const chunk of out.AudioStream) chunks.push(Buffer.from(chunk)); return {buffer:Buffer.concat(chunks),contentType:'audio/mpeg'};
}
function escapeXml(v){return String(v).replace(/[<>&'\"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','\"':'&quot;'}[c]));}
