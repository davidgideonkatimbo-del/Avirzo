import { providerConfigured, resolveProviderLanguage, voiceProviderOptions, synthesizeVoice } from '../services/voiceProviders.js';

export function registerRoutes(app, ctx) {
  const { IS_PRODUCTION, APP_VERSION, supabase, supabaseAdmin, africanProfiles, voiceLanguageSupport, ELEVEN_MODEL, RUNWAY_API, eras, storyTypes, styles, cameras, formats, durations, requireProviderUser, voiceCreditCost, requireProviderAuth, requireRunwayKey, requireVoiceKey, refundProviderCharge, runwayHeaders, normalizeCharacter, characterContinuityLine, buildCinematicPrompt, persistRemoteAsset, persistBufferAsset, requireAssetCloud, requireOwnedProject, projectStore, safeProjectId, normalizeProject, requireCloudUser, PROJECT_DIR, toSrtTime, acquireExportSlot, ELEVENLABS_API, generationJobs, rateBuckets } = ctx;

  app.get('/api/voice/options', (req, res) => res.json({ model: ELEVEN_MODEL, providers: voiceProviderOptions(), profiles: Object.entries(africanProfiles).map(([id, profile]) => ({ id, market: profile.market, language: profile.language, ...(voiceLanguageSupport[id] || { code: null, supported: false, note: 'Language coverage must be verified.' }), providerLanguages: Object.fromEntries(['elevenlabs','google','azure','polly'].map(provider => [provider, resolveProviderLanguage(provider, id)])) })) }));

app.post('/api/voice/generate', async (req, res) => {
  const text = String(req.body?.text || '').trim();
  const projectId = req.body?.projectId ? String(req.body.projectId).trim() : null;
  const africanProfile = String(req.body?.africanProfile || 'uganda-en');
  const voiceId = String(req.body?.voiceId || '').trim();
  const provider = String(req.body?.provider || 'elevenlabs').trim().toLowerCase();
  const modelId = String(req.body?.modelId || ELEVEN_MODEL).trim();
  if (!text) return res.status(400).json({ message: 'Dialogue text is required.' });
  if (text.length > 12000) return res.status(413).json({ message: 'Dialogue is too long. Keep each voice generation under 12,000 characters.' });
  if (!voiceId) return res.status(400).json({ message: 'Add the selected provider voice ID for this character.' });
  if (!africanProfiles[africanProfile]) return res.status(400).json({ message: 'Unsupported African cinema profile.' });
  if (!['elevenlabs','google','azure','polly'].includes(provider)) return res.status(400).json({ message: 'Choose a supported voice provider.' });
  if (!providerConfigured(provider)) return res.status(503).json({ message: `The selected voice provider (${provider}) is not configured on the server.` });
  const providerLanguageCode = resolveProviderLanguage(provider, africanProfile);
  if (!providerLanguageCode) return res.status(422).json({ code: 'VOICE_LANGUAGE_UNSUPPORTED', message: `A verified ${africanProfiles[africanProfile].language} voice is not configured for ${provider}. Choose a verified language/provider combination; Avirzo will not silently substitute another language.` });
  // Ignore client-supplied locale codes: derive the locale from the selected profile
  // and provider so a client cannot bypass the support catalogue.
  // Everything that can be checked for free is checked above; credits and quota are only charged from here on.
  const providerUser = await requireProviderUser(req, res, 'voice', () => ({ units: voiceCreditCost(text.length), meta: { characters: text.length, provider } }));
  if (!providerUser) return;
  try {
    if (projectId && !(await requireOwnedProject(providerUser.id, projectId))) {
      await refundProviderCharge(providerUser, 'project_not_found');
      return res.status(404).json({ message: 'Project not found.' });
    }
    const result = await synthesizeVoice({ provider, text, voiceId, languageCode: providerLanguageCode, modelId });
    let archivedAsset = null; let audioUrl = null;
    if (projectId && supabaseAdmin) {
      archivedAsset = await persistBufferAsset({ user: providerUser, projectId, buffer: result.buffer, kind:'audio', name:`dialogue-${providerUser.id.slice(0,8)}`, sourceProvider:provider, contentType:result.contentType });
      const signed = await supabaseAdmin.storage.from('avirzo-media').createSignedUrl(archivedAsset.storage_path, 3600); if(signed.error) throw signed.error; audioUrl=signed.data?.signedUrl||null;
    } else if (result.buffer.length <= 12*1024*1024) audioUrl=`data:${result.contentType};base64,${result.buffer.toString('base64')}`;
    else { await refundProviderCharge(providerUser, 'voice_too_large'); return res.status(413).json({message:'Generated voice is too large for a temporary preview. Sign in and select a project to archive it.'}); }
    res.json({status:'ready',provider,audioUrl,archivedAsset:archivedAsset?{id:archivedAsset.id,storage_path:archivedAsset.storage_path,mime_type:archivedAsset.mime_type}:null,language:africanProfiles[africanProfile].language,languageCode:providerLanguageCode,modelId});
  } catch(error) { console.error(error); await refundProviderCharge(providerUser, 'voice_failed'); res.status(502).json({message:error.message||'Could not reach the selected voice generation service.'}); }
});
}