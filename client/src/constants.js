/** Avirzo studio constants & heritage templates — v2.2 */

export const styles = ['Cinematic', 'Photorealistic', 'Documentary', 'Fantasy', 'Historical drama'];
export const cameras = ['Slow dolly', 'Wide tracking', 'Handheld', 'Static', 'Crane reveal', 'Orbit'];
export const formats = ['16:9', '9:16'];
export const durations = ['5 sec', '10 sec'];

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
export const heritageTemplates = [
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
    id: 'independence-portrait',
    title: 'Independence Era Portrait',
    eyebrow: 'NATIONHOOD',
    description: 'A character-driven portrait set in a specified country and decade of independence or early post-independence.',
    icon: '🌅',
    africanProfile: 'kenya-en',
    era: 'independence',
    storyType: 'inspired',
    style: 'Cinematic',
    camera: 'Handheld',
    format: '16:9',
    duration: '5 sec',
    historicalNotes: 'Kenya, early independence decade. Ground architecture, clothing, and public space in the period; avoid anachronistic technology.',
    story: 'A young teacher walks through a Nairobi neighbourhood at the start of a school day in the early years of independence. She carries books, greets neighbours, and pauses at a notice board where the new nation’s hopes are still being written into daily life.',
    research: {
      ...emptyResearch,
      location: 'Nairobi, Kenya',
      period: 'Early independence era (specify decade in notes)',
      focus: 'Urban neighbourhood life, education, period clothing and transport',
      uncertainties: 'Confirm decade-specific details before treating them as documentary fact.',
      sources: []
    },
    characters: [
      {
        ...emptyCharacter,
        name: 'Wanjiku',
        role: 'Teacher',
        age: '28',
        community: 'Kenyan',
        language: 'Kenyan English / Kiswahili',
        appearance: 'Composed, purposeful',
        clothing: 'Modest early-independence professional dress',
        occupation: 'Primary school teacher',
        visualIdentity: 'Neat hair, books under arm, steady gaze'
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
  /* Phase A — new regional heritage templates (additive) */
  {
    id: 'ghana-kente-memory',
    title: 'Ghana · Cloth & Memory',
    eyebrow: 'ORAL MEMORY',
    description: 'A weaver or elder explains a kente pattern’s meaning to a younger relative. Oral tradition, not invented history.',
    icon: '🧵',
    africanProfile: 'ghana-tw',
    era: 'precolonial',
    storyType: 'oral',
    style: 'Historical drama',
    camera: 'Slow dolly',
    format: '16:9',
    duration: '5 sec',
    historicalNotes: 'Akan cultural setting. Treat pattern meanings as living oral tradition; do not invent royal genealogies or exact historical dates.',
    story: 'In a courtyard workshop, an elder weaver shows a younger relative a strip of kente. Fingers trace the pattern while the elder speaks of the meaning handed down in the family — a story of patience, status, and memory woven into cloth.',
    research: {
      ...emptyResearch,
      location: 'Akan region / specified Ghanaian community',
      period: 'Pre-colonial / living tradition',
      focus: 'Weaving tools, courtyard architecture, cloth patterns, intergenerational teaching',
      oralTraditions: 'Pattern meanings and family stories are oral tradition unless a published source establishes them as documented history.',
      uncertainties: 'Do not invent specific royal lineages or dated events without sources.',
      sources: []
    },
    characters: [
      {
        ...emptyCharacter,
        name: 'Nana Adwoa',
        role: 'Elder weaver / storyteller',
        age: '60s–70s',
        community: 'Akan',
        language: 'Twi',
        appearance: 'Calm, practised hands, measured presence',
        clothing: 'Cloth appropriate to the community and period',
        visualIdentity: 'Strong hands on the loom or cloth, quiet authority',
        continuityNotes: 'Keep pre-modern tools and courtyard setting unless the story moves period.'
      },
      {
        ...emptyCharacter,
        name: 'Kwame',
        role: 'Young relative / listener',
        age: '12–16',
        community: 'Akan',
        language: 'Twi',
        appearance: 'Attentive, learning posture',
        clothing: 'Simple period-appropriate attire',
        visualIdentity: 'Youthful face turned toward the elder and the cloth'
      }
    ]
  },
  {
    id: 'ethiopia-highland-path',
    title: 'Ethiopia · Highland Path',
    eyebrow: 'LANDSCAPE & MEMORY',
    description: 'A quiet journey on a highland path. Landscape, clothing and movement grounded in Ethiopian highland context.',
    icon: '⛰',
    africanProfile: 'ethiopia-am',
    era: 'pre1994',
    storyType: 'inspired',
    style: 'Cinematic',
    camera: 'Wide tracking',
    format: '16:9',
    duration: '5 sec',
    historicalNotes: 'Ethiopian highland setting. Specify community and decade. Avoid inventing political events as backdrop without sources.',
    story: 'A solitary figure walks a stone path above terraced fields. Clouds move across the highland sky as the path turns toward a distant church or settlement — a moment of journey and belonging rather than a dated historical claim.',
    research: {
      ...emptyResearch,
      location: 'Ethiopian highlands / specified community',
      period: 'Pre-1994 or custom',
      focus: 'Highland landscape, terracing, traditional architecture, clothing appropriate to community and era',
      uncertainties: 'Specify region and period; do not invent religious or political events without sources.',
      sources: []
    },
    characters: [
      {
        ...emptyCharacter,
        name: 'Abebe',
        role: 'Traveller / witness',
        age: '30s–40s',
        community: 'Highland Ethiopian',
        language: 'Amharic',
        appearance: 'Steady gait, weathered by the path',
        clothing: 'Period- and community-appropriate highland attire',
        visualIdentity: 'Silhouette against highland sky and terraces'
      }
    ]
  },
  {
    id: 'senegal-griots-dusk',
    title: 'Senegal · Griot at Dusk',
    eyebrow: 'ORAL MEMORY',
    description: 'A griot begins a story as evening gathers. Oral tradition framed as living performance, not verified chronology.',
    icon: '🥁',
    africanProfile: 'senegal-wo',
    era: 'precolonial',
    storyType: 'oral',
    style: 'Historical drama',
    camera: 'Handheld',
    format: '16:9',
    duration: '5 sec',
    historicalNotes: 'Wolof / Senegambian cultural setting. Present the performance as oral tradition. Do not invent specific historical battles or genealogies as fact.',
    story: 'At the edge of a compound as the light softens, a griot settles with an instrument. Listeners draw near. The first lines of a remembered story rise — tradition performed in the present, not a dated chronicle.',
    research: {
      ...emptyResearch,
      location: 'Senegambia / specified Wolof or related community',
      period: 'Living oral tradition / pre-colonial framing',
      focus: 'Compound architecture, evening light, instruments, audience posture, clothing',
      oralTraditions: 'Griot performance and remembered lineages are oral tradition; label them clearly.',
      uncertainties: 'Do not invent exact genealogies or battle accounts without published sources.',
      sources: []
    },
    characters: [
      {
        ...emptyCharacter,
        name: 'Bamba',
        role: 'Griot / storyteller',
        age: '50s–60s',
        community: 'Wolof',
        language: 'Wolof',
        appearance: 'Focused, performance-ready presence',
        clothing: 'Period-appropriate attire for a public storyteller',
        visualIdentity: 'Instrument and posture at the centre of the circle',
        continuityNotes: 'Keep the compound and evening setting consistent across shots.'
      }
    ]
  },
  {
    id: 'egypt-nile-memory',
    title: 'Egypt · Nile Memory',
    eyebrow: 'DOCUMENTED / INSPIRED',
    description: 'A contemplative moment by the Nile. Ground architecture and landscape in named places; keep creative reconstruction labeled.',
    icon: '🌊',
    africanProfile: 'egypt-ar',
    era: 'ancient',
    storyType: 'inspired',
    style: 'Documentary',
    camera: 'Crane reveal',
    format: '16:9',
    duration: '5 sec',
    historicalNotes: 'Egyptian setting. Prefer named places and published descriptions for architecture and landscape. Label any reconstructed daily life as inspired, not verified detail.',
    story: 'Along a stretch of the Nile, light moves across water and bank. A figure pauses at the edge — a quiet witness to the river’s continuity. Architecture and landscape stay within documented forms; personal emotion remains interpretive.',
    research: {
      ...emptyResearch,
      location: 'Nile valley / specified Egyptian site',
      period: 'Ancient or specified era',
      focus: 'River landscape, bank vegetation, architecture consistent with documented forms for the chosen period',
      verifiedFacts: 'Prefer published archaeological and heritage descriptions for places and structures.',
      uncertainties: 'Do not invent dialogue, exact daily routines, or unrecorded events as fact.',
      sources: []
    },
    characters: [
      {
        ...emptyCharacter,
        name: 'Layla',
        role: 'Witness / traveller',
        age: '20s–30s',
        community: 'Egyptian',
        language: 'Egyptian Arabic',
        appearance: 'Quiet, observant presence',
        clothing: 'Attire appropriate to the chosen period and community',
        visualIdentity: 'Figure held against river light and bank'
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

/** Phase B — curated community / education packs (ids map to heritageTemplates) */
export const communityPacks = [
  { id: 'pack-oral', title: 'Oral memory starter', description: 'Elder + listener shorts across regions.', templateIds: ['oral-elder', 'ghana-kente-memory', 'senegal-griots-dusk'], tag: 'ORAL' },
  { id: 'pack-documented', title: 'Documented places', description: 'History-led paths with research fields ready.', templateIds: ['documented-history', 'egypt-nile-memory'], tag: 'DOCUMENTED' },
  { id: 'pack-social', title: 'Vertical social', description: '9:16 heritage reels for platforms.', templateIds: ['vertical-heritage'], tag: '9:16' },
  { id: 'pack-classroom', title: 'Classroom lesson', description: 'Education-ready film with discussion framing.', templateIds: ['classroom-heritage'], tag: 'EDUCATION' },
  { id: 'pack-east-west', title: 'East & West Africa', description: 'Uganda, Kenya, Ghana, Nigeria paths.', templateIds: ['oral-elder', 'ghana-kente-memory', 'folklore-legend'], tag: 'REGIONAL' },
  { id: 'pack-horn-nile', title: 'Horn & Nile', description: 'Ethiopia and Egypt landscape / memory paths.', templateIds: ['ethiopia-highland-path', 'egypt-nile-memory'], tag: 'REGIONAL' }
];

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
