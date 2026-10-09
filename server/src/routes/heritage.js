export function registerRoutes(app, ctx) {
  const { IS_PRODUCTION, APP_VERSION, supabase, supabaseAdmin, africanProfiles, voiceLanguageSupport, ELEVEN_MODEL, RUNWAY_API, eras, storyTypes, styles, cameras, formats, durations, requireProviderUser, requireProviderAuth, requireRunwayKey, requireVoiceKey, runwayHeaders, normalizeCharacter, characterContinuityLine, buildCinematicPrompt, persistRemoteAsset, requireAssetCloud, projectStore, safeProjectId, normalizeProject, requireCloudUser, PROJECT_DIR, toSrtTime, acquireExportSlot, ELEVENLABS_API, generationJobs, rateBuckets } = ctx;

  app.get('/api/heritage-options', (req, res) => res.json({ eras, storyTypes }));

app.get('/api/research/template', (req, res) => res.json({
  fields: ['location','period','focus','verifiedFacts','materialCulture','oralTraditions','uncertainties','sources'],
  principle: 'Separate documented evidence from oral tradition and creative reconstruction. Sources are context, not proof that every generated detail is historical.'
}));

app.post('/api/characters/validate', (req, res) => {
  const characters = Array.isArray(req.body?.characters) ? req.body.characters.map(normalizeCharacter) : [];
  const warnings = [];
  const names = new Set();
  characters.forEach((c, i) => {
    if (!c.name) warnings.push(`Character ${i + 1} needs a name.`);
    if (c.name && names.has(c.name.toLowerCase())) warnings.push(`Duplicate character name: ${c.name}.`);
    if (c.name) names.add(c.name.toLowerCase());
    if (!c.visualIdentity) warnings.push(`${c.name || `Character ${i + 1}`} has no visual identity description.`);
    if (!c.appearance) warnings.push(`${c.name || `Character ${i + 1}`} has no appearance description.`);
    if (!c.clothing) warnings.push(`${c.name || `Character ${i + 1}`} has no clothing/adornment description.`);
  });
  res.json({ ok: warnings.length === 0, warnings, characters, principle: 'Avirzo uses these fields as continuity constraints. They guide generation; they do not guarantee identical faces from an external video model.' });
});

app.post('/api/storyboard', (req, res) => {
  const story = String(req.body?.story || '').trim();
  const era = String(req.body?.era || 'pre1994');
  const storyType = String(req.body?.storyType || 'inspired');
  const characters = Array.isArray(req.body?.characters) ? req.body.characters : [];
  const historicalNotes = String(req.body?.historicalNotes || '').trim();
  const researchBrief = req.body?.researchBrief && typeof req.body.researchBrief === 'object' ? req.body.researchBrief : null;
  const profile = africanProfiles[String(req.body?.africanProfile || 'uganda-en')];
  if (!profile) return res.status(400).json({ message: 'Unsupported African cinema profile.' });
  if (!eras[era] || !storyTypes[storyType]) return res.status(400).json({ message: 'Unsupported heritage setting.' });
  if (!story) return res.status(400).json({ message: 'A story is required.' });
  const sentences = story.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/).filter(Boolean);
  const chunks = [];
  for (let i = 0; i < sentences.length; i += 2) chunks.push(sentences.slice(i, i + 2).join(' '));
  const scenes = (chunks.length ? chunks : [story]).slice(0, 12).map((text, i) => ({
    id: `scene-${Date.now()}-${i + 1}`,
    number: i + 1,
    title: `Scene ${i + 1}`,
    prompt: text,
    africanLanguage: profile.language,
    market: profile.market,
    era,
    storyType,
    historicalNotes,
    researchBrief,
    camera: i === 0 ? 'Wide tracking' : 'Slow dolly',
    status: 'draft'
  }));
  res.json({ scenes });
});

app.get('/api/heritage-bible/template', (req, res) => res.json({ fields: ['name','role','age','community','clan','language','appearance','clothing','occupation','relationships','notes','voiceId','voiceNotes'], principle: 'Define characters once and carry the profile into every scene.' }));

  // Export a shareable heritage framework pack (organic growth loop).
  app.post('/api/heritage/template-pack', (req, res) => {
    const body = req.body || {};
    const pack = {
      avirzoTemplatePack: 1,
      name: String(body.name || 'Custom Avirzo framework').slice(0, 120),
      description: String(body.description || '').slice(0, 500),
      createdAt: new Date().toISOString(),
      africanProfile: body.africanProfile || 'uganda-en',
      era: body.era || 'pre1994',
      storyType: body.storyType || 'inspired',
      style: body.style || 'Cinematic',
      camera: body.camera || 'Slow dolly',
      format: body.format || '16:9',
      duration: body.duration || '5 sec',
      story: String(body.story || '').slice(0, 8000),
      historicalNotes: String(body.historicalNotes || '').slice(0, 6000),
      research: body.research && typeof body.research === 'object' ? body.research : {},
      worldBible: body.worldBible && typeof body.worldBible === 'object' ? body.worldBible : {},
      rootsFoundation: body.rootsFoundation && typeof body.rootsFoundation === 'object' ? body.rootsFoundation : {},
      characters: Array.isArray(body.characters) ? body.characters.slice(0, 40) : []
    };
    res.json({ pack, message: 'Share this pack JSON. Others can import it in Studio → Templates.' });
  });

  app.post('/api/heritage/template-pack/import', (req, res) => {
    const pack = req.body?.pack || req.body || {};
    if (!pack || (pack.avirzoTemplatePack !== 1 && !pack.story && !pack.africanProfile)) {
      return res.status(400).json({ message: 'Not a valid Avirzo template pack.' });
    }
    const template = {
      id: 'imported-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      title: String(pack.name || 'Imported framework').slice(0, 120),
      eyebrow: 'IMPORTED',
      description: String(pack.description || 'Shared heritage framework').slice(0, 300),
      africanProfile: pack.africanProfile || 'uganda-en',
      era: pack.era || 'pre1994',
      storyType: pack.storyType || 'inspired',
      style: pack.style || 'Cinematic',
      camera: pack.camera || 'Slow dolly',
      format: pack.format || '16:9',
      duration: pack.duration || '5 sec',
      story: String(pack.story || '').slice(0, 8000),
      historicalNotes: String(pack.historicalNotes || '').slice(0, 6000),
      research: pack.research && typeof pack.research === 'object' && !Array.isArray(pack.research) ? pack.research : {},
      worldBible: pack.worldBible && typeof pack.worldBible === 'object' && !Array.isArray(pack.worldBible) ? pack.worldBible : {},
      rootsFoundation: pack.rootsFoundation && typeof pack.rootsFoundation === 'object' && !Array.isArray(pack.rootsFoundation) ? pack.rootsFoundation : {},
      characters: Array.isArray(pack.characters) ? pack.characters.slice(0, 40) : []
    };
    res.json({ template, message: 'Template pack ready to apply in Studio.' });
  });

}
