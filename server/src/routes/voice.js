import { voiceProviderOptions, synthesizeVoice } from '../services/voiceProviders.js';

export function registerRoutes(app, ctx) {
  const { IS_PRODUCTION, APP_VERSION, supabase, supabaseAdmin, africanProfiles, voiceLanguageSupport, ELEVEN_MODEL, RUNWAY_API, eras, storyTypes, styles, cameras, formats, durations, requireProviderUser, requireProviderAuth, requireRunwayKey, requireVoiceKey, runwayHeaders, normalizeCharacter, characterContinuityLine, buildCinematicPrompt, persistRemoteAsset, persistBufferAsset, requireAssetCloud, requireOwnedProject, projectStore, safeProjectId, normalizeProject, requireCloudUser, PROJECT_DIR, toSrtTime, acquireExportSlot, ELEVENLABS_API, generationJobs, rateBuckets } = ctx;

  app.get('/api/voice/options', (req, res) => res.json({ model: ELEVEN_MODEL, providers: voiceProviderOptions(), profiles: Object.entries(africanProfiles).map(([id, profile]) => ({ id, market: profile.market, language: profile.language, ...(voiceLanguageSupport[id] || { code: null, supported: false, note: 'Language coverage must be verified.' }) })) }));

app.post('/api/voice/generate', async (req, res) => {
  const providerUser = await requireProviderUser(req, res, 'voice');
  if (!providerUser) return;
  const text = String(req.body?.text || '').trim();
  const projectId = req.body?.projectId ? String(req.body.projectId).trim() : null;
  const africanProfile = String(req.body?.africanProfile || 'uganda-en');
  const voiceId = String(req.body?.voiceId || '').trim();
  const provider = String(req.body?.provider || 'elevenlabs').trim().toLowerCase();
  const modelId = String(req.body?.modelId || ELEVEN_MODEL).trim();
  const requestedLanguageCode = String(req.body?.voiceLanguageCode || '').trim();
  const voiceProfile = voiceLanguageSupport[africanProfile];
  if (!text) return res.status(400).json({ message: 'Dialogue text is required.' });
  if (text.length > 12000) return res.status(413).json({ message: 'Dialogue is too long. Keep each voice generation under 12,000 characters.' });
  if (!voiceId) return res.status(400).json({ message: 'Add the selected provider voice ID for this character.' });
  if (!africanProfiles[africanProfile]) return res.status(400).json({ message: 'Unsupported African cinema profile.' });
  if (projectId && !(await requireOwnedProject(providerUser.id, projectId))) return res.status(404).json({ message: 'Project not found.' });
  if (provider === 'elevenlabs' && !requireVoiceKey(res)) return;
  try {
    const result = await synthesizeVoice({ provider, text, voiceId, languageCode: requestedLanguageCode || voiceProfile?.code || undefined, modelId });
    let archivedAsset = null; let audioUrl = null;
    if (projectId && supabaseAdmin) {
      archivedAsset = await persistBufferAsset({ user: providerUser, projectId, buffer: result.buffer, kind:'audio', name:`dialogue-${providerUser.id.slice(0,8)}`, sourceProvider:provider, contentType:result.contentType });
      const signed = await supabaseAdmin.storage.from('avirzo-media').createSignedUrl(archivedAsset.storage_path, 3600); if(signed.error) throw signed.error; audioUrl=signed.data?.signedUrl||null;
    } else if (result.buffer.length <= 12*1024*1024) audioUrl=`data:${result.contentType};base64,${result.buffer.toString('base64')}`;
    else return res.status(413).json({message:'Generated voice is too large for a temporary preview. Sign in and select a project to archive it.'});
    res.json({status:'ready',provider,audioUrl,archivedAsset:archivedAsset?{id:archivedAsset.id,storage_path:archivedAsset.storage_path,mime_type:archivedAsset.mime_type}:null,language:africanProfiles[africanProfile].language,languageCode:voiceProfile?.code||null,modelId});
  } catch(error) { console.error(error); res.status(502).json({message:error.message||'Could not reach the selected voice generation service.'}); }
});
}