/** Avirzo studio constants & heritage templates — v2.2 */

export const styles = ['Cinematic', 'Photorealistic', 'Documentary', 'Fantasy', 'Historical drama'];
export const cameras = ['Slow dolly', 'Wide tracking', 'Handheld', 'Static', 'Crane reveal', 'Orbit'];
export const formats = ['16:9', '9:16'];
export const durations = ['5 sec', '10 sec'];

/** Scene-action budget inside Avirzo's 1000-character video prompt (mirrors server SCENE_PROMPT_LIMITS). */
export const SCENE_PROMPT_LIMITS = { comfortable: 220, max: 370 };

export const heritageEras = [
  { id: 'pre1994', label: 'Heritage · Before 1994', note: 'Default heritage setting; avoid post-1994 references.' },
  { id: 'precolonial', label: 'Pre-colonial', note: 'Ground the story in the specified society and period.' },
  { id: 'colonial', label: 'Colonial era', note: 'Separate local perspectives, oral memory and colonial records.' },
  { id: 'independence', label: 'Independence era', note: 'Use the specified country and decade.' },
  { id: 'ancient', label: 'Ancient / early history', note: 'Specify the community and period in the story.' },
  { id: 'custom', label: 'Custom period', note: 'Enter a year or range in the historical notes.' }
];

export const storyTypes = [
  { id: 'historical', label: 'Documented history' },
  { id: 'oral', label: 'Oral tradition' },
  { id: 'folklore', label: 'Folklore / legend' },
  { id: 'inspired', label: 'Inspired fiction' },
  { id: 'fiction', label: 'Fully fictional' }
];

export const africanProfiles = [
  { id: 'uganda-en', label: 'Uganda · English', market: 'Uganda', language: 'Ugandan English' },
  { id: 'uganda-lg', label: 'Uganda · Luganda', market: 'Uganda', language: 'Luganda' },
  { id: 'kenya-en', label: 'Kenya · English', market: 'Kenya', language: 'Kenyan English' },
  { id: 'kenya-sheng', label: 'Kenya · Sheng', market: 'Kenya', language: 'Sheng' },
  { id: 'kenya-sw', label: 'Kenya · Swahili', market: 'Kenya', language: 'Swahili' },
  { id: 'nigeria-en', label: 'Nigeria · English', market: 'Nigeria', language: 'Nigerian English' },
  { id: 'nigeria-pidgin', label: 'Nigeria · Pidgin', market: 'Nigeria', language: 'Nigerian Pidgin' },
  { id: 'nigeria-yo', label: 'Nigeria · Yoruba', market: 'Nigeria', language: 'Yoruba' },
  { id: 'nigeria-ig', label: 'Nigeria · Igbo', market: 'Nigeria', language: 'Igbo' },
  { id: 'nigeria-ha', label: 'Nigeria · Hausa', market: 'Nigeria', language: 'Hausa' },
  { id: 'sa-en', label: 'South Africa · English', market: 'South Africa', language: 'South African English' },
  { id: 'sa-zu', label: 'South Africa · isiZulu', market: 'South Africa', language: 'isiZulu' },
  { id: 'sa-xh', label: 'South Africa · isiXhosa', market: 'South Africa', language: 'isiXhosa' },
  { id: 'sa-af', label: 'South Africa · Afrikaans', market: 'South Africa', language: 'Afrikaans' },
  { id: 'sa-st', label: 'South Africa · Sesotho', market: 'South Africa', language: 'Sesotho' },
  /* Phase A — expanded coverage (additive only) */
  { id: 'ghana-en', label: 'Ghana · English', market: 'Ghana', language: 'Ghanaian English' },
  { id: 'ghana-tw', label: 'Ghana · Twi', market: 'Ghana', language: 'Twi' },
  { id: 'ethiopia-am', label: 'Ethiopia · Amharic', market: 'Ethiopia', language: 'Amharic' },
  { id: 'ethiopia-en', label: 'Ethiopia · English', market: 'Ethiopia', language: 'Ethiopian English' },
  { id: 'senegal-fr', label: 'Senegal · Français', market: 'Senegal', language: 'French (Sénégal)' },
  { id: 'senegal-wo', label: 'Senegal · Wolof', market: 'Senegal', language: 'Wolof' },
  { id: 'egypt-ar', label: 'Egypt · Arabic', market: 'Egypt', language: 'Egyptian Arabic' },
  { id: 'egypt-en', label: 'Egypt · English', market: 'Egypt', language: 'Egyptian English' },
  { id: 'diaspora-en', label: 'Diaspora · English', market: 'Diaspora', language: 'Diaspora English' }
];

export const emptyCharacter = {
  name: '', role: '', age: '', community: '', clan: '', language: '',
  appearance: '', clothing: '', occupation: '', relationships: '',
  visualIdentity: '', continuityNotes: '', referenceImageUrl: '', referenceImageData: '',
  performanceVideoUrl: '', performanceVideoData: '', performanceStatus: '',
  notes: '', voiceId: '', voiceNotes: '', dialogue: '', continuityProfile: '', possessions: '', emotionalBaseline: '', ageProgression: '', deliberateChanges: ''
};

export const emptyResearch = {
  location: '', period: '', focus: '', verifiedFacts: '',
  materialCulture: '', oralTraditions: '', uncertainties: '', sources: []
};

export const bugandaResearch = {
  location: 'Buganda, Uganda',
  period: '19th century / late 1800s',
  focus: 'Royal and village life, architecture, clothing, social organization and material culture',
  verifiedFacts: 'UNESCO records the Kasubi palace as built in 1882 and converted into a royal burial ground in 1884. The UNESCO nomination describes Kabaka Muteesa I, his palace, foreign visitors and the political and religious context of late 19th-century Buganda.',
  materialCulture: 'Traditional Ganda architecture, thatching, agricultural landscape, locally grounded clothing and tools. Avoid modern roads, plastics, electric lighting, vehicles and post-1994 references unless the story explicitly changes period.',
  oralTraditions: 'Treat ancestral stories and remembered traditions as oral tradition unless a source establishes them as documented history.',
  uncertainties: 'Do not invent exact dates, quotations, clan customs or dialogue. Mark details needing specialist or community verification.',
  sources: [
    { title: 'UNESCO — Tombs of Buganda Kings at Kasubi', url: 'https://whc.unesco.org/en/list/1022' },
    { title: 'UNESCO nomination dossier — Tombs of Buganda Kings at Kasubi', url: 'https://whc.unesco.org/uploads/nominations/1022.pdf' },
    { title: 'UNESCO — Traditional thatching and Kasubi conservation', url: 'https://www.unesco.org/en/articles/unesco-commits-completing-rehabilitation-works-kasubi-tombs-2022' }
  ]
};

/** Guided heritage film templates — premium onboarding */
const rawHeritageTemplates = [
  {
    id: 'oral-elder',
    title: 'Oral Tradition Short',
    eyebrow: 'ORAL MEMORY',
    description: 'An elder passes a remembered story to the next generation at dawn or dusk. Clear oral vs documented labeling.',
    icon: '🔥',
    africanProfile: 'uganda-lg',
    era: 'pre1994',
    storyType: 'oral',
    style: 'Historical drama',
    camera: 'Slow dolly',
    format: '16:9',
    duration: '5 sec',
    historicalNotes: 'Ground every visual in the specified community. Mark oral elements as tradition, not verified chronology.',
    story: 'Before sunrise, a grandfather walks with his grandson through the village path. He begins an old family story about the land, the ancestors, and the duty to protect what was inherited. The boy listens as morning birds and distant drums mark the hour.',
    research: bugandaResearch,
    characters: [
      {
        ...emptyCharacter,
        name: 'Jjajja Ssemwanga',
        role: 'Elder / storyteller',
        age: '70s',
        community: 'Baganda',
        language: 'Luganda',
        appearance: 'Weathered face, calm eyes, measured gait',
        clothing: 'Bark-cloth or simple traditional wrap appropriate to late 19th / early 20th-century Ganda village life',
        occupation: 'Elder of the household',
        visualIdentity: 'Silver-grey hair, walking stick, quiet authority',
        continuityNotes: 'Keep pre-modern tools and architecture; no post-1994 references.'
      },
      {
        ...emptyCharacter,
        name: 'Kato',
        role: 'Grandson / listener',
        age: '10–12',
        community: 'Baganda',
        language: 'Luganda',
        appearance: 'Young, attentive, barefoot or simple sandals',
        clothing: 'Simple village cloth appropriate to the period',
        occupation: 'Child of the household',
        visualIdentity: 'Youthful face, open expression, walks slightly behind the elder'
      }
    ]
  },
  {
    id: 'documented-history',
    title: 'Documented History',
    eyebrow: 'VERIFIED CONTEXT',
    description: 'A short film anchored in named places, dates, and published sources. Uncertainty is labeled, not invented.',
    icon: '📜',
    africanProfile: 'uganda-en',
    era: 'colonial',
    storyType: 'historical',
    style: 'Documentary',
    camera: 'Wide tracking',
    format: '16:9',
    duration: '5 sec',
    historicalNotes: 'Buganda, late 1800s. Prefer UNESCO and archival descriptions. Do not invent quotations or exact dialogue.',
    story: 'At the royal enclosure of Kasubi, the palace compounds rise in thatched form against the Ugandan sky. Courtyards, bark-cloth, and the movement of attendants reflect the political and spiritual centre of late 19th-century Buganda as recorded in heritage documentation.',
    research: bugandaResearch,
    characters: []
  },
  {
    id: 'folklore-legend',
    title: 'Folklore / Legend',
    eyebrow: 'CULTURAL LEGEND',
    description: 'Present a legend as cultural tradition. Never frame invented events as verified history.',
    icon: '✨',
    africanProfile: 'nigeria-yo',
    era: 'precolonial',
    storyType: 'folklore',
    style: 'Fantasy',
    camera: 'Crane reveal',
    format: '16:9',
    duration: '5 sec',
    historicalNotes: 'Yoruba cultural setting. Treat the narrative as legend/oral cosmology, not documentary fact.',
    story: 'In a forest clearing at the edge of a Yoruba settlement, a storyteller gathers children as dusk falls. She begins a legend of a spirit that guards the river path—told as tradition handed down, not as a dated historical event.',
    research: {
      ...emptyResearch,
      location: 'Yoruba-speaking region, West Africa',
      period: 'Pre-colonial / timeless legend frame',
      focus: 'Oral storytelling practice, forest edge settlement, material culture without modern intrusion',
      oralTraditions: 'Frame the tale explicitly as legend or handed-down tradition.',
      uncertainties: 'Do not invent named historical kings, exact years, or present the legend as documented fact.',
      sources: []
    },
    characters: [
      {
        ...emptyCharacter,
        name: 'Iya Adunni',
        role: 'Storyteller',
        age: '50s',
        community: 'Yoruba',
        language: 'Yoruba',
        appearance: 'Strong presence, expressive hands',
        clothing: 'Traditional wrapper and head-tie appropriate to a pre-colonial village setting',
        visualIdentity: 'Warm firelight on face, measured storytelling gestures'
      }
    ]
  },
  {
    id: 'vertical-heritage',
    title: 'Vertical Heritage Reel',
    eyebrow: '9:16 SOCIAL',
    description: 'A short vertical film for social platforms—still culturally grounded, still continuity-aware.',
    icon: '📱',
    africanProfile: 'sa-zu',
    era: 'pre1994',
    storyType: 'inspired',
    style: 'Photorealistic',
    camera: 'Orbit',
    format: '9:16',
    duration: '5 sec',
    historicalNotes: 'South African setting before 1994. Avoid modern brands, phones, and post-1994 urban markers unless the story explicitly moves period.',
    story: 'A young woman stands on a hillside path above her community. Wind moves through the grass as she looks toward the valley—holding a quiet moment of belonging and memory before she continues down the path.',
    research: {
      ...emptyResearch,
      location: 'KwaZulu-Natal / specified South African community',
      period: 'Pre-1994',
      focus: 'Landscape, clothing, and settlement patterns appropriate to the community and era',
      uncertainties: 'Specify community and decade; do not invent political events as backdrop without sources.',
      sources: []
    },
    characters: [
      {
        ...emptyCharacter,
        name: 'Thandi',
        role: 'Young woman / witness',
        age: '20s',
        community: 'isiZulu-speaking',
        language: 'isiZulu',
        appearance: 'Natural, grounded presence',
        clothing: 'Period-appropriate attire for the community',
        visualIdentity: 'Strong silhouette against the landscape'
      }
    ]
  },
  {
    id: 'classroom-heritage',
    title: 'Classroom · Heritage lesson',
    eyebrow: 'EDUCATION',
    description: 'Short film for a lesson: clear oral vs documented labels, research notes, and a discussion prompt for students.',
    icon: '📚',
    africanProfile: 'uganda-en',
    era: 'pre1994',
    storyType: 'historical',
    style: 'Documentary',
    camera: 'Wide tracking',
    format: '16:9',
    duration: '5 sec',
    historicalNotes: 'Classroom use. Prefer published sources. Label oral tradition clearly. End with an open discussion question rather than a fixed conclusion.',
    story: 'A teacher and a small group of students stand before a heritage site or community landmark. The teacher points to a detail — a wall, a tree, a path — and invites the students to notice what the place still holds from the past, separating what is documented from what is remembered.',
    research: {
      ...emptyResearch,
      location: 'Named heritage site or community landmark (specify country)',
      period: 'As documented for the site',
      focus: 'Visible material culture, landscape, and safe public spaces suitable for a classroom film',
      verifiedFacts: 'Use only published heritage descriptions for the chosen place.',
      oralTraditions: 'If community memory is included, label it as oral tradition.',
      uncertainties: 'Do not invent dates, quotations, or events. Leave space for classroom discussion.',
      sources: []
    },
    characters: [
      {
        ...emptyCharacter,
        name: 'Teacher',
        role: 'Guide / facilitator',
        age: '30s–50s',
        community: 'Local',
        language: 'English (or local language as specified)',
        appearance: 'Calm, open posture',
        clothing: 'Simple contemporary or period-appropriate attire matching the lesson framing',
        visualIdentity: 'Clear silhouette beside students and the landmark'
      },
      {
        ...emptyCharacter,
        name: 'Student',
        role: 'Learner / observer',
        age: '12–16',
        community: 'Local',
        language: 'English (or local language as specified)',
        appearance: 'Attentive, curious',
        clothing: 'Simple school-appropriate or period-matching attire',
        visualIdentity: 'Looking toward the landmark or the teacher'
      }
    ]
  },
  {
    id: 'kibuuka-legend',
    title: 'Legend Thriller: Kibuuka Omumbale',
    eyebrow: 'LEGEND · OPEN ENDING',
    description: 'A short suspense film from the Ganda legend of the hidden war spirit. Framed as oral tradition, with an open ending.',
    icon: '🌫',
    africanProfile: 'uganda-lg',
    era: 'precolonial',
    storyType: 'folklore',
    style: 'Cinematic',
    camera: 'Crane reveal',
    format: '16:9',
    duration: '5 sec',
    historicalNotes: 'Buganda legend of Kibuuka, war spirit (omubaale), told as oral tradition. Setting: Mbaale, Mawokota, Mpigi, with misty hills and papyrus wetlands. Pre-colonial Ganda world: bark-cloth wraps, reed and thatch huts, spears, shields and bows. No guns, vehicles, plastics or modern objects. Not documented history: do not invent dates or real quotations.',
    story: 'Kibuuka, the war spirit of Buganda, is sent to help the king against Bunyoro. He fights from the mist above Mbaale hill, striking from the clouds, bound by one law: the enemy must never learn where he hides.\n\nAt night, Bunyoro scouts creep through the grass and search the hills. They find nothing. Spears fall from empty cloud, and their warriors scatter.\n\nIn the Baganda camp sits Nyakato, a Bunyoro woman taken captive. She says little and watches everything. As she watches the sky and the lone tree on the hill, she understands what the Baganda are guarding.\n\nBefore dawn she slips away through the papyrus, water at her ankles, and crosses the lines to her own people. She points across the dark valley to one tree in the mist.\n\nAt first light, the Bunyoro archers raise their bows toward it.\n\nAt Mbaale, the rock still holds his shrine.',
    research: {
      ...emptyResearch,
      location: 'Mbaale, Mawokota, Mpigi District, Buganda, Uganda',
      period: 'Pre-colonial; undated legend from Buganda\'s early kingdom',
      focus: 'Oral tradition of Kibuuka, war spirit of the Baganda, and his shrine at Mbaale',
      verifiedFacts: 'The shrine of the war-god Kibuuka at Mbaale ("the Rock") was a major focus of patriotic sentiment in Buganda (C. Wrigley, Kingship and State). Relics attributed to Kibuuka were transferred to the Uganda Museum, Kampala, in 1962 (Cambridge MAA catalogue). The Kibuuka Omumbaale heritage site is associated with the Ndiga clan and is being developed with Buganda Kingdom support.',
      materialCulture: 'Reed-and-thatch huts, woven fences, bark-cloth wraps, wooden spears, hide shields, bent-wood bows, clay pots. No modern objects.',
      oralTraditions: 'Kibuuka is told as a balubaale (younger brother of Mukasa) sent to help King Nakibinge against Bunyoro, fighting from the clouds or a tree. A captive woman reveals his hiding place. Versions differ on the woman, the battle site and his end.',
      uncertainties: 'No documented dates. Accounts differ on the captive (a captive vs. a Munyoro concubine), the battle site (Mbaale hill vs. Bulemezi) and his end (killed by an arrow, or body never found). The captive woman\'s name Nyakato is invented for the film. Verify with the Ndiga clan, Buganda cultural custodians and a Runyoro speaker.',
      sources: [
        { title: 'Wrigley, Kingship and State: The Buganda Dynasty (Cambridge University Press)', url: 'https://www.cambridge.org/core/books/kingship-and-state/genesis/D72605BCF9A6E83704A8EB6E5F9ED9F7' },
        { title: 'Cambridge MAA: Kibuka relics catalogue', url: 'https://collections.maa.cam.ac.uk/photographs/432520' },
        { title: 'allAfrica: Buganda Kingdom applauds Ndiga clan (Kibuuka Omumbaale site)', url: 'https://allafrica.com/stories/202605070598.html' }
      ]
    },
    worldBible: {
      locations: 'Mbaale hill with one large lone tree above drifting mist; papyrus wetlands below; a reed-and-thatch war camp; a rocky hilltop that holds the shrine.',
      objects: 'Kibuuka\'s leopard-pattern shield and spear (same design every shot); Bunyoro bows and quivers; torches; bark-cloth wraps.',
      costumes: 'Bark-cloth wraps in earth tones; leather arm guards on archers; plain wrap for the captive woman. No modern fabric.',
      architecture: 'Round reed-and-thatch huts, woven fences. Everything handmade from natural materials.',
      culturalPractices: 'Told as oral tradition. The central rule is that Kibuuka\'s hiding place must stay secret.',
      musicSoundscape: 'Low drums, a single endongo or ndingidi thread, long silences, night insects, torch crackle, wind, reeds, bowstrings.',
      languageRules: 'Minimal dialogue. Short Luganda narration only, checked by a Luganda speaker.',
      visualRules: 'Blue-grey dawn mist against warm firelight orange. Kibuuka mostly silhouette, face never fully shown. No gore, no visible death. Dignified, grounded realism.',
      familyStructure: 'Baganda defend their kingdom under their king; Bunyoro is the rival kingdom; the captive woman is separated from her own people.',
      taboosAndSensitivities: 'Kibuuka is a revered war spirit: no mockery or horror-monster framing. Mark the story as legend, not documented history. Have a Muganda cultural reader review before publishing.',
      continuityLocks: 'Kibuuka\'s shield design never changes\nKibuuka\'s face is never fully shown\nThe lone tree on the hill looks the same in every shot\nThe captive woman wears the same plain bark-cloth wrap throughout\nNo modern objects anywhere',
      relationships: 'Kibuuka → protector → Buganda\nNyakato → captive of → the Baganda\nNyakato → seeks → her way home to Bunyoro\nBunyoro commander → hunts → Kibuuka'
    },
    characters: [
      {
        ...emptyCharacter,
        name: 'Kibuuka',
        role: 'War spirit / warrior of legend',
        age: 'Ageless, appears a man in his prime',
        community: 'Baganda',
        language: 'Luganda',
        appearance: 'Tall, lean, still. Face never fully lit; often half-hidden by mist.',
        clothing: 'Bark-cloth wrap, leopard-pattern shield, spear. No metal except the spearhead.',
        visualIdentity: 'Silhouette first, face second; always surrounded by low mist or leaves.',
        continuityNotes: 'Same shield design in every shot; no helmet.'
      },
      {
        ...emptyCharacter,
        name: 'Nyakato',
        role: 'Captive woman and observer (name invented for the film)',
        age: 'Late 20s',
        community: 'Banyoro',
        language: 'Runyoro',
        appearance: 'Alert eyes, calm posture, hands that notice things.',
        clothing: 'Plain bark-cloth wrap, bare shoulders, no jewellery.',
        visualIdentity: 'Moves quietly, always watching, never panics.',
        relationships: 'Captive of the Baganda; trying to return to her own people.',
        continuityNotes: 'Same plain wrap throughout. Give her motive and agency, not "betrayer" energy.'
      },
      {
        ...emptyCharacter,
        name: 'Bunyoro archer commander',
        role: 'Hunter',
        age: '40s',
        community: 'Banyoro',
        language: 'Runyoro',
        appearance: 'Lean and patient, bow always strung.',
        clothing: 'Bark-cloth wrap, quiver, leather arm guard.',
        visualIdentity: 'Still, watchful, shot from low angles.'
      }
    ]
  },
  {
    id: 'blank-studio',
    title: 'Blank Studio',
    eyebrow: 'START FRESH',
    description: 'Empty project with African cinema mode ready. Build your own storyboard from scratch.',
    icon: '🎬',
    africanProfile: 'uganda-en',
    era: 'pre1994',
    storyType: 'inspired',
    style: 'Cinematic',
    camera: 'Slow dolly',
    format: '16:9',
    duration: '5 sec',
    historicalNotes: '',
    story: '',
    research: { ...emptyResearch },
    characters: []
  }
];

/**
 * A template may appear only once. Entries are treated as duplicates when they share an id, a title,
 * or the same opening of their story (case/spacing/punctuation ignored). The first one wins.
 */
const normKey = v => String(v || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
export function dedupeTemplates(list) {
  const seenId = new Set(), seenTitle = new Set(), seenStory = new Set();
  const out = [];
  for (const t of Array.isArray(list) ? list : []) {
    if (!t || !t.id) continue;
    const title = normKey(t.title), story = normKey(t.story).slice(0, 120);
    if (seenId.has(t.id) || (title && seenTitle.has(title)) || (story && seenStory.has(story))) continue;
    seenId.add(t.id);
    if (title) seenTitle.add(title);
    if (story) seenStory.add(story);
    out.push(t);
  }
  return out;
}
export const heritageTemplates = dedupeTemplates(rawHeritageTemplates);

/** Phase B — curated community / education packs (ids map to heritageTemplates) */
const rawCommunityPacks = [
  { id: 'pack-oral', title: 'Oral memory & legend', description: 'Elder, legend and suspense shorts rooted in oral tradition.', templateIds: ['oral-elder', 'folklore-legend', 'kibuuka-legend'], tag: 'ORAL' },
  { id: 'pack-documented', title: 'Documented places', description: 'History-led path with research fields ready.', templateIds: ['documented-history'], tag: 'DOCUMENTED' },
  { id: 'pack-social', title: 'Vertical social', description: '9:16 heritage reels for platforms.', templateIds: ['vertical-heritage'], tag: '9:16' },
  { id: 'pack-classroom', title: 'Classroom lesson', description: 'Education-ready film with discussion framing.', templateIds: ['classroom-heritage'], tag: 'EDUCATION' }
];
const knownTemplateIds = new Set(heritageTemplates.map(t => t.id));
export const communityPacks = rawCommunityPacks.map(p => ({
  ...p,
  templateIds: [...new Set(p.templateIds)].filter(id => knownTemplateIds.has(id))
}));


export const studioModes = [
  { id: 'story', label: 'Story', icon: '🎞' },
  { id: 'shot', label: 'Single shot', icon: '✦' },
  { id: 'bible', label: 'Heritage Bible', icon: '📖' },
  { id: 'research', label: 'Research', icon: '🔎' },
  { id: 'voices', label: 'Voices', icon: '🎙' },
  { id: 'timeline', label: 'Timeline', icon: '🎬' },
  { id: 'projects', label: 'Projects', icon: '🗂' },
  { id: 'collaboration', label: 'Team', icon: '👥' },
  { id: 'billing', label: 'Billing', icon: '💳' }
];
