import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

test('release stays on the protected Avirzo workflow', () => {
  const guardrails = read('PROCEDURE_GUARDRAILS_v2.9.3.md');
  assert.match(guardrails, /Web service first/i);
  assert.match(guardrails, /Worker remains optional/i);
  assert.match(guardrails, /Test the updated build on Android/i);
});


test('free generation quota is account-based and yearly', () => {
  const core = read('server/src/services/core.js');
  assert.match(core, /generation:\s*\{[^\n]*envInt\('FREE_GENERATIONS_PER_YEAR', 5\)[^\n]*window:\s*'year'/);
  assert.match(core, /p_user_id:\s*userId/);
  assert.match(core, /setUTCMonth\(0, 1\)/);
  assert.match(core, /Date\.UTC\(now\.getUTCFullYear\(\) \+ 1, 0, 1\)/);
  const sql = read('supabase.sql');
  assert.match(sql, /p_kind = 'generation' then interval '1 year'/);
});
test('export route exposes optional AI end card without making it mandatory', () => {
  const route = read('server/src/routes/export.js');
  assert.match(route, /aiEndCard: req\.body\?\.aiEndCard === true/);
  const exporter = read('server/src/services/exporter.js');
  assert.match(exporter, /payload\.aiEndCard === true/);
  assert.match(exporter, /Created with Avirzo/);
});

test('project schema carries community review state without changing the core workflow', () => {
  const core = read('server/src/services/core.js');
  assert.match(core, /review:body\.review/);
  const main = read('client/src/main.jsx');
  assert.match(main, /setReview\(p\.review/);
});

test('voice catalogue explicitly distinguishes verified and unverified African language support', () => {
  const core = read('server/src/services/core.js');
  assert.match(core, /uganda-lg.*supported: false/s);
  assert.match(core, /kenya-sw.*supported: true/s);
});

test('automated test command is part of the release package', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.scripts.test, 'node --test server/test/*.test.js');
});
test('mobile layout removes the hidden desktop sidebar offset', () => {
  const css = read('client/src/styles.css');
  assert.match(css, /\.app-sidebar\{display:none!important\}/);
  assert.match(css, /\.app-main-shell\{[^}]*margin-left:0!important/);
  assert.match(css, /\.app-main-shell\{[^}]*width:100%/);
  assert.match(css, /\.page-content\{[^}]*width:100%/);
});


test('mobile form fields prevent iOS zoom and keyboard navigation hides the bottom bar', () => {
  const css = read('client/src/styles.css');
  const appShell = read('client/src/components/AppShell.jsx');
  assert.match(css, /input:not\(\[type=checkbox\]\):not\(\[type=radio\]\),select,textarea\{font-size:16px!important\}/);
  assert.match(css, /\.app-shell\.keyboard-open \.mobile-bottom-nav\{display:none!important\}/);
  assert.match(appShell, /keyboardOpen/);
  assert.match(appShell, /focusin/);
  assert.match(appShell, /focusout/);
});

test('New project keeps the Projects panel visible so the blank project can be named and saved', () => {
  const main = read('client/src/main.jsx');
  assert.match(main, /function newProject\(\)[\s\S]*?setMessage\('New project started[\s\S]*?setShowProjects\(true\)/);
});

test('mobile long text and plain action buttons have explicit protection', () => {
  const css = read('client/src/styles.css');
  const projects = read('client/src/components/ProjectsPanel.jsx');
  const profile = read('client/src/components/ProfilePanel.jsx');
  assert.match(css, /overflow-wrap:anywhere/);
  assert.match(css, /\.plain-action\{/);
  assert.match(projects, /className="plain-action"[^>]*>\s*\+ New project/);
  // Profile uses a dedicated premium button class; accept it while preserving the
  // generic plain-action class check for the project creation action.
  assert.match(profile, /className="(?:plain-action|profile-secondary-action)"[^>]*>\s*Sign out/);
  assert.match(css, /\.profile-secondary-action\{/);
});

test('phone Home keeps the existing primary action visually dominant', () => {
  const css = read('client/src/styles.css');
  const main = read('client/src/main.jsx');
  assert.match(main, /Stories with<br\/>/);
  assert.match(main, /Enter the Studio/);
  assert.match(main, /View films/);
  assert.match(css, /\.home-hero\.premium-hero\{\s*min-height:0;/);
  assert.match(css, /\.hero-cta\{width:100%;min-height:48px/);
  assert.match(css, /\.premium-dashboard\{gap:9px/);
});

test('phone Studio keeps the existing workflow touch-friendly and visually focused', () => {
  const css = read('client/src/styles.css');
  const main = read('client/src/main.jsx');
  assert.match(main, /Make your film\./);
  assert.match(main, /Start making →/);
  assert.match(main, /Story/);
  assert.match(main, /Shot/);
  assert.match(css, /\.studio-shell-card\{padding:8px!important/);
  assert.match(css, /\.studio-shell-card textarea\{min-height:148px/);
  assert.match(css, /\.studio-heading \.templates-trigger\{width:100%/);
  assert.match(css, /\.studio-shell-card \.control select\{min-height:44px/);
});

test('navigation organizes existing features without adding new routes', () => {
  const shell = read('client/src/components/AppShell.jsx');
  assert.match(shell, /label: 'CREATE'/);
  assert.match(shell, /label: 'LIBRARY'/);
  assert.match(shell, /label: 'AVIRZO'/);
  for (const id of ['studio','story','scenes','timeline','projects','assets','exports','heritage','voices','profile','settings']) {
    assert.match(shell, new RegExp(`id: '${id}'`));
  }
  assert.match(shell, /const NAV = NAV_GROUPS\.flatMap/);
  assert.match(shell, /const MORE = MORE_GROUPS\.flatMap/);
  assert.match(shell, /const NAV_LOOKUP = \[{ id: 'home', label: 'Home'/);
  assert.match(shell, /NAV_LOOKUP\.find\(x => x\.id === id\)/);
});

test('inline exports are never left queued for a deployed worker to claim', () => {
  const route = read('server/src/routes/export.js');
  assert.match(route, /status: queueForWorker \? 'queued' : 'running'/);
});

test('render.yaml env values are quoted strings and the worker flag is explicit', () => {
  const yaml = read('render.yaml');
  assert.doesNotMatch(yaml, /value:\s+\d+\s*$/m);
  assert.match(yaml, /key: AVIRZO_WORKER_ENABLED\s+value: "false"/);
});

test('project cloud saves are verified against the database before success is returned', () => {
  const route = read('server/src/routes/projects.js');
  assert.match(route, /supabaseAdmin\.from\('avirzo_projects'\)/);
  assert.match(route, /Project write could not be verified after saving/);
  assert.match(route, /Project update could not be verified after saving/);
  assert.match(route, /verified: true/);
});

test('Runway Gen-4.5 uses image_to_video for both text and image generation', () => {
  const route = read('server/src/routes/generation.js');
  assert.match(route, /image_to_video/);
  assert.match(route, /pickGenerationModel/);
  assert.match(read('server/src/services/plans.js'), /return 'gen4\.5'/);
  assert.match(route, /promptImage/);
});

test('client save flow requires server verification and generation persists the completed scene', () => {
  const main = read('client/src/main.jsx');
  assert.match(main, /d\.verified!==true/);
  assert.match(main, /saveProjectSnapshot\(\{scenes:nextScenes,timeline:nextTimeline\}\)/);
});

test('large JSON bodies require a bearer token in production', () => {
  const app = read('server/src/app.js');
  assert.match(app, /hasBearer/);
  assert.match(app, /BIG_BODY_PATHS\.test\(req\.path\) && \(hasBearer\(req\) \|\| !core\.IS_PRODUCTION\) \? bigJson : smallJson/);
});

test('route panels are lazy-loaded behind Suspense', () => {
  const main = read('client/src/main.jsx');
  assert.match(main, /import React, \{ Suspense, lazy,/);
  for (const name of ['TimelinePanel', 'ProjectsPanel', 'ProjectWorkspace', 'SettingsPanel']) {
    assert.match(main, new RegExp(`const ${name} = lazyPanel\\(\\(\\) => import\\('./components/${name}'\\), '${name}'\\)`));
    assert.doesNotMatch(main, new RegExp(`import \\{ ${name} \\} from`));
  }
  assert.match(main, /<Suspense fallback=/);
});

test('link previews and offline shell are configured', () => {
  const html = read('client/index.html');
  for (const tag of ['og:title', 'og:description', 'og:image', 'twitter:card']) assert.ok(html.includes(tag), `${tag} missing`);
  const sw = read('client/public/sw.js');
  assert.match(sw, /const SHELL = \['\/'/);
  const pkg = JSON.parse(read('package.json'));
  assert.ok(sw.includes(`avirzo-static-v${pkg.version}`), 'service worker cache name must match the release version');
});

test('all version strings agree', () => {
  const v = JSON.parse(read('package.json')).version;
  assert.equal(JSON.parse(read('client/package.json')).version, v);
  assert.equal(JSON.parse(read('server/package.json')).version, v);
  assert.ok(read('server/src/services/core.js').includes(`APP_VERSION = '${v}'`));
  assert.ok(read('client/src/main.jsx').includes(`v${v}`));
});

test('projects load on sign-in and survive sign-out/sign-in', () => {
  const main = read('client/src/main.jsx');
  assert.match(main, /if\(authUser\?\.id\) refreshProjects\(\); else setProjects\(\[\]\)/);
  assert.match(main, /async function handleSignOut\(\)\{[\s\S]*?await saveCurrentToCloud\(\)[\s\S]*?resetWorkspace\(\)/);
  assert.match(main, /Autosaved to your cloud library/);
  assert.match(main, /function resetWorkspace\(\)/);
  assert.match(main, /function newProject\(\)\{ resetWorkspace\(\);/);
});


test('v2.10.0 first-film path and last-saved are present', () => {
  const main = read('client/src/main.jsx');
  assert.match(main, /function firstFilmStep\(\)/);
  assert.match(main, /function renderFirstFilmStrip\(\)/);
  assert.match(main, /Last saved/);
  assert.match(main, /example-films/);
  assert.match(main, /STUDIO · v2\.11\.0/);
  assert.match(main, /setLastSavedAt/);
  const core = read('server/src/services/core.js');
  assert.match(core, /APP_VERSION = '2\.11\.0'/);
  const html = read('client/index.html');
  assert.match(html, /Opening Avirzo/);
  const sw = read('client/public/sw.js');
  assert.match(sw, /avirzo-static-v2\.11\.0/);
});


test('bugfixes: safer API JSON, load clears media, continuity soft primary', () => {
  const main = read('client/src/main.jsx');
  assert.match(main, /async function readApiJson\(/);
  assert.match(main, /setVideoUrl\(''\); setExportUrl\(''\); setExportSrt\(''\)/);
  assert.match(main, /Studio service is waking up/);
  assert.match(main, /if\(generating\) return setMessage/);
  const continuity = read('server/src/services/continuity.js');
  assert.match(continuity, /characters\.find\(c=>c\.id===scene\.primaryCharacterId\) \|\| characters\[0\]/);
  const projects = read('server/src/routes/projects.js');
  assert.match(projects, /avirzo_project_members/);
  assert.match(projects, /role: 'owner'/);
});


test('generation normalizes Runway status and maps ratio/duration', () => {
  const route = read('server/src/routes/generation.js');
  assert.match(route, /normalizeRunwayStatus/);
  assert.match(route, /cancelled/);
  assert.match(route, /1280:720/);
  assert.match(route, /720:1280/);
  assert.match(route, /mapDurationSeconds/);
  assert.match(route, /pickGenerationModel/);
  assert.match(route, /image_to_video/);
  // Provider success still returns a usable video URL even if archive fails
  assert.match(route, /providerVideoUrl/);
});

test('client poll accepts succeeded with videoUrl and longer timeout', () => {
  const main = read('client/src/main.jsx');
  assert.match(main, /maxAttempts\s*=\s*90/);
  assert.match(main, /cancelled/);
  assert.match(main, /scenePrompt/);
});


test('jobs findByProviderTask keeps payload for video URL recovery', () => {
  const jobs = read('server/src/services/jobs.js');
  assert.match(jobs, /findByProviderTask/);
  assert.match(jobs, /select\('\*'\)/);
  const gen = read('server/src/routes/generation.js');
  assert.match(gen, /providerVideoUrl/);
  assert.match(gen, /payload\?\.providerVideoUrl/);
  const exp = read('server/src/services/exporter.js');
  assert.match(exp, /Every export scene needs an archived asset or a video URL/);
  assert.doesNotMatch(exp, /Production export scenes must reference archived assets/);
});


test('phase plan: indexes, job priority, safeFetch retries, collab invite, template pack', () => {
  const sql = read('supabase.sql');
  assert.match(sql, /avirzo_projects_user_updated_idx/);
  assert.match(sql, /avirzo_jobs_priority_queue_idx/);
  assert.match(sql, /priority integer/);
  assert.match(sql, /order by \(j\.priority/);
  const jobs = read('server/src/services/jobs.js');
  assert.match(jobs, /defaultPriority/);
  assert.match(jobs, /film_export.*10|priority.*10/s);
  const sf = read('server/src/services/safeFetch.js');
  assert.match(sf, /retries/);
  assert.match(sf, /2 \*\* \(attempt/);
  const collab = read('server/src/routes/collaboration.js');
  assert.match(collab, /accept-invite/);
  assert.match(collab, /shareLink/);
  const heritage = read('server/src/routes/heritage.js');
  assert.match(heritage, /template-pack/);
  const main = read('client/src/main.jsx');
  assert.match(main, /exportFrameworkPack/);
  assert.match(main, /acceptInviteToken/);
});
