/** Scene-by-scene music generation, grounded in each film's heritage notes. */
export function registerRoutes(app, ctx) {
  const { requireProviderUser, musicCreditCost, requireVoiceKey, requireOwnedProject, supabaseAdmin, persistBufferAsset, refundProviderCharge } = ctx;

  app.post('/api/music/generate', async (req, res) => {
    if (!requireVoiceKey(res)) return;
    const requestedSeconds = Math.max(3, Math.min(600, Math.round(Number(req.body?.durationSeconds) || 10)));
    const user = await requireProviderUser(req, res, 'voice', () => ({ units: musicCreditCost(requestedSeconds), meta: { durationSeconds: requestedSeconds, feature: 'music' } }));
    if (!user) return;

    const body = req.body || {};
    const projectId = body.projectId ? String(body.projectId).trim() : '';
    try {
      if (projectId && !(await requireOwnedProject(user.id, projectId))) {
        await refundProviderCharge(user, 'project_not_found');
        return res.status(404).json({ message: 'Project not found.' });
      }
    } catch (error) {
      await refundProviderCharge(user, 'project_check_failed');
      return res.status(502).json({ message: error?.message || 'Could not verify the project.' });
    }

    const sceneTitle = String(body.sceneTitle || 'Untitled scene').trim().slice(0, 180);
    const sceneDescription = String(body.sceneDescription || '').trim().slice(0, 1200);
    const mood = String(body.mood || 'reflective').trim().slice(0, 100);
    const style = String(body.style || 'cinematic underscore').trim().slice(0, 120);
    const instruments = String(body.instruments || '').trim().slice(0, 500);
    const community = String(body.community || '').trim().slice(0, 120);
    const country = String(body.country || '').trim().slice(0, 120);
    const language = String(body.language || '').trim().slice(0, 120);
    const period = String(body.period || '').trim().slice(0, 160);
    const culturalAnchors = String(body.culturalAnchors || '').trim().slice(0, 700);
    const musicSoundscape = String(body.musicSoundscape || '').trim().slice(0, 700);
    const durationSeconds = Math.max(3, Math.min(600, Math.round(Number(body.durationSeconds) || 10)));
    const extraDirection = String(body.direction || '').trim().slice(0, 700);

    const heritage = [community && `Community: ${community}`, country && `Place: ${country}`, language && `Language context: ${language}`, period && `Historical period: ${period}`, culturalAnchors && `Verified cultural anchors: ${culturalAnchors}`, musicSoundscape && `World Bible music and soundscape notes: ${musicSoundscape}`].filter(Boolean).join('\n');
    const prompt = [
      `Create original ${style} for one editable film scene titled "${sceneTitle}".`,
      sceneDescription && `Scene action and atmosphere: ${sceneDescription}`,
      `Emotional direction: ${mood}. Duration target: about ${durationSeconds} seconds.`,
      heritage && `CULTURAL AND HISTORICAL GROUNDING:\n${heritage}`,
      instruments && `Preferred instruments and textures: ${instruments}.`,
      extraDirection && `Filmmaker direction: ${extraDirection}.`,
      'Respect the specific community, period, and notes supplied. Do not treat African cultures as interchangeable; avoid generic pan-African clichés. Use only instruments, rhythms, and performance traditions appropriate to the stated context, or keep the score restrained and cinematic when evidence is uncertain. Do not invent sacred, ceremonial, or restricted practices. Original composition only; no imitation of named artists or existing songs.',
      'Make a film underscore with a clear emotional arc, an edit-friendly beginning and ending, and space for dialogue. No lyrics or vocals; instrumental only.'
    ].filter(Boolean).join('\n\n').slice(0, 4000);

    try {
      const response = await fetch('https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128', {
        method: 'POST',
        headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, music_length_ms: durationSeconds * 1000, model_id: 'music_v2_5', force_instrumental: true })
      });
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        const message = response.status === 401 ? 'The music provider rejected the API key. Check ELEVENLABS_API_KEY.' : response.status === 429 ? 'The music provider rate limit was reached. Wait a moment and try again.' : `Music generation failed at the provider (HTTP ${response.status}). ${text.slice(0, 240)}`;
        await refundProviderCharge(user, 'music_provider_rejected');
        return res.status(response.status === 429 ? 429 : 502).json({ message });
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      if (!buffer.length) { await refundProviderCharge(user, 'music_empty'); return res.status(502).json({ message: 'The music provider returned an empty audio file.' }); }
      let archivedAsset = null;
      let audioUrl = null;
      if (projectId && supabaseAdmin) {
        archivedAsset = await persistBufferAsset({ user, projectId, buffer, kind: 'audio', name: `scene-music-${sceneTitle}`, sourceProvider: 'elevenlabs-music', contentType: 'audio/mpeg' });
        const signed = await supabaseAdmin.storage.from('avirzo-media').createSignedUrl(archivedAsset.storage_path, 3600);
        if (signed.error) throw signed.error;
        audioUrl = signed.data?.signedUrl || null;
      } else if (buffer.length <= 12 * 1024 * 1024) {
        audioUrl = `data:audio/mpeg;base64,${buffer.toString('base64')}`;
      } else {
        await refundProviderCharge(user, 'music_too_large');
        return res.status(413).json({ message: 'Generated music is too large for a temporary preview. Sign in, save the project, and try again to archive it.' });
      }
      return res.json({ status: 'ready', audioUrl, archivedAsset: archivedAsset ? { id: archivedAsset.id, storage_path: archivedAsset.storage_path, mime_type: archivedAsset.mime_type } : null, provider: 'elevenlabs-music', modelId: 'music_v2_5', durationSeconds, prompt });
    } catch (error) {
      console.error('Scene music generation failed:', error);
      await refundProviderCharge(user, 'music_failed');
      return res.status(502).json({ message: error?.message || 'Could not generate scene music. Check provider configuration and try again.' });
    }
  });
}
