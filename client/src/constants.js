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
  { id: 'sa-st', label: 'South Africa · Sesotho', market: 'South Africa', language: 'Sesotho' }
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
