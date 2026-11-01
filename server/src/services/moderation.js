// First-layer prompt screening. It is deliberately small and conservative: it blocks only the
// categories that are never acceptable on the platform. Runway and ElevenLabs apply their own
// moderation on top, and users can report content through POST /api/report.
const MINOR = /\b(child|children|kid|kids|minor|minors|underage|under-age|toddler|infant|preteen|pre-teen|teen|teens|teenager|teenagers|schoolgirl|schoolboy|(?:[0-9]|1[0-7])[- ]?(?:year|yr)s?[- ]?old)\b/i;
const SEXUAL = /\b(nude|nudity|naked|nsfw|porn|porno|pornographic|sex scene|sexual|sexually|erotic|topless|genitals?|orgy|rape|raped|molest\w*|fetish)\b/i;
const EXPLICIT = /\b(nude|nudity|nsfw|porn|porno|pornographic|sex scene|explicit sex|erotic|topless|genitals?|orgy)\b/i;
const DEEPFAKE = /\b(deep-?fakes?|face-?swap\w*|swap (?:his|her|their|the) face|clone (?:his|her|their) voice|fake (?:video|footage|audio) of (?:the )?(?:president|prime minister|minister|politician))\b/i;
const WEAPONS = /\b(how to (?:make|build|synthesi[sz]e) (?:a |an )?(?:bomb|explosives?|nerve agent|bioweapon)|bioweapon|chemical weapon)\b/i;

export const CONTENT_POLICY_MESSAGE = {
  sexual_content_minors: 'This request was blocked. Content that sexualises children is never allowed.',
  explicit_sexual_content: 'This request was blocked. Explicit sexual content is not allowed on Avirzo.',
  deepfake_impersonation: 'This request was blocked. Avirzo cannot be used to impersonate real people or swap their face or voice.',
  weapons_instructions: 'This request was blocked. Instructions for making weapons are not allowed.'
};

export function screenText(text) {
  const t = String(text || '');
  if (!t.trim()) return { blocked: false };
  if (MINOR.test(t) && SEXUAL.test(t)) return { blocked: true, category: 'sexual_content_minors', message: CONTENT_POLICY_MESSAGE.sexual_content_minors };
  if (EXPLICIT.test(t)) return { blocked: true, category: 'explicit_sexual_content', message: CONTENT_POLICY_MESSAGE.explicit_sexual_content };
  if (DEEPFAKE.test(t)) return { blocked: true, category: 'deepfake_impersonation', message: CONTENT_POLICY_MESSAGE.deepfake_impersonation };
  if (WEAPONS.test(t)) return { blocked: true, category: 'weapons_instructions', message: CONTENT_POLICY_MESSAGE.weapons_instructions };
  return { blocked: false };
}

/** Collect user-written strings from a request body (skips base64/data URLs and huge blobs). */
export function collectStrings(value, out = [], depth = 0) {
  if (out.length >= 200 || depth > 6) return out;
  if (typeof value === 'string') {
    if (value.length > 20000 || value.startsWith('data:') || (value.length > 300 && !/\s/.test(value))) return out;
    if (value.trim()) out.push(value);
  } else if (Array.isArray(value)) {
    for (const item of value.slice(0, 200)) collectStrings(item, out, depth + 1);
  } else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value).slice(0, 200)) {
      if (/^(image|images|referenceImage|referenceImages|audio|video|file|data|base64)$/i.test(key)) continue;
      collectStrings(item, out, depth + 1);
    }
  }
  return out;
}

export function screenBody(body) {
  for (const text of collectStrings(body)) {
    const result = screenText(text);
    if (result.blocked) return result;
  }
  return { blocked: false };
}

export const SCREENED_PATHS = /^\/api\/(generate|voice|music|performance|ai)(\/|$)/;
