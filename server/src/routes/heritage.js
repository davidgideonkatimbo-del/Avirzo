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
}
