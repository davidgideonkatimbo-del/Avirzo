import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

test('release stays on the protected Avirzo workflow', () => {
  const guardrails = read('PROCEDURE_GUARDRAILS.md');
  assert.match(guardrails, /Web service first/i);
  assert.match(guardrails, /Worker remains optional/i);
  assert.match(guardrails, /Test the updated build on Android/i);
});


test('free generation quota is account-based and limited to two scenes', () => {
  const core = read('server/src/services/core.js');
  assert.match(core, /generation:\s*\{[^\n]*envInt\('FREE_GENERATIONS_PER_YEAR', 2\)[^\n]*window:\s*'year'/);
  assert.match(core, /p_user_id:\s*userId/);
  assert.match(core, /new Date\('2000-01-01T00:00:00\.000Z'\)/);
  assert.match(core, /FREE_SCENE_ALLOWANCE_USED/);
  const sql = read('supabase.sql');
  assert.match(sql, /reserve_avirzo_provider_budget/);
  assert.match(sql, /avirzo_provider_budget_ledger/);
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
  // First-time single-scene generation creates a durable cloud project before rendering.
  const single = main.slice(main.indexOf('async function generateScene('), main.indexOf('async function generateAll()'));
  assert.match(single, /Creating a cloud project before rendering/);
  assert.match(single, /saveCurrentToCloud\(\)/);
  assert.match(single, /projectId:activeProjectId\|\|projectId\|\|null/);
  assert.match(single, /Scene \$\{working\.number\} rendered and saved to your cloud project/);
  // Manual Save project confirms the library entry by name.
  assert.match(main, /Saved “\$\{label\}” to your cloud library/);
  assert.match(main, /It appears under Projects and will reload after sign-in/);
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


test('current release cinematic quality safeguards and first-film path are present', () => {
  const main = read('client/src/main.jsx');
  assert.match(main, /function firstFilmStep\(\)/);
  assert.match(main, /function renderFirstFilmStrip\(\)/);
  assert.match(main, /Last saved/);
  assert.match(main, /example-films/);
  assert.match(main, /STUDIO · v2\.17\.13/);
  assert.match(main, /setLastSavedAt/);
  const core = read('server/src/services/core.js');
  assert.match(core, /APP_VERSION = '2\.17\.13'/);
  const html = read('client/index.html');
  assert.match(html, /Opening Avirzo/);
  const sw = read('client/public/sw.js');
  assert.match(sw, /avirzo-static-v2\.17\.13/);
});


test('bugfixes: safer API JSON, load clears media, continuity soft primary', () => {
  const main = read('client/src/main.jsx');
  assert.match(main, /async function readApiJson\(/);
  assert.match(main, /setVideoUrl\(''\); setExportUrl\(''\); setExportSrt\(''\)/);
  assert.match(main, /Studio service is waking up/);
  assert.match(main, /if\(generating\) return setMessage/);
  const continuity = read('server/src/services/continuity.js');
  assert.match(continuity, /characters\.find\(c=>c\.id===scene\.primaryCharacterId\) \|\| characters\[0\]/);
  // Anachronisms warn; they must not hard-block shot generation.
  assert.match(continuity, /may include a modern\/anachronistic reference/);
  assert.doesNotMatch(continuity, /blockers\.push\(`Scene \$\{scene\.number/);
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
  assert.match(main, /transientFailures/);
  assert.match(main, /r\.status===502/);
  assert.match(main, /Still waiting on the video provider/);
});

test('generation coerces unsupported style/camera/duration instead of failing the shot', () => {
  const route = read('server/src/routes/generation.js');
  assert.match(route, /normalizedStyle/);
  assert.match(route, /normalizedCamera/);
  assert.match(route, /normalizedDuration/);
  assert.match(route, /generation settings coerced/);
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


test('scene heritage music is registered, instrumental, and preserves per-scene editing', () => {
  const app = read('server/src/app.js');
  assert.match(app, /registerMusic\(app, ctx\)/);
  const route = read('server/src/routes/music.js');
  assert.match(route, /\/api\/music\/generate/);
  assert.match(route, /force_instrumental: true/);
  assert.match(route, /music_v2_5/);
  assert.match(route, /Do not treat African cultures as interchangeable/);
  assert.match(route, /Do not invent sacred, ceremonial, or restricted practices/);
  const studio = read('client/src/components/SceneMusicStudio.jsx');
  assert.match(studio, /Generate music for this scene/);
  assert.match(studio, /Generate for all/);
  assert.match(studio, /addGeneratedTrack/);
  const timeline = read('client/src/components/TimelinePanel.jsx');
  assert.match(timeline, /SceneMusicStudio/);
});

test('cinematic quality safeguards to each generated shot', () => {
  const core = read('server/src/services/core.js');
  assert.match(core, /natural human movement and believable physics/);
  assert.match(core, /stable faces and anatomy/);
  assert.match(core, /clean temporal motion/);
  const qualityTest = read('server/test/video-quality.test.js');
  assert.match(qualityTest, /long scene prompts are capped/);
});


test('batch shot generation commits completed clips incrementally for recovery', () => {
  const main = read('client/src/main.jsx');
  const batch = main.slice(main.indexOf('async function generateAll()'), main.indexOf('async function pollTask('));
  assert.match(batch, /completedById=new Map\(generated\.map/);
  assert.match(batch, /const snapshotScenes=workingScenes\.map/);
  assert.match(batch, /setTimeline\(nextTimeline\)/);
  assert.match(batch, /const payload=\{\.\.\.projectPayload\(\),scenes:snapshotScenes,timeline:nextTimeline\}/);
  assert.match(batch, /Creating a cloud project before batch generation/);
  assert.match(batch, /blockedByContinuity/);
  assert.ok(batch.indexOf('setTimeline(nextTimeline)') < batch.indexOf("setMessage('All scenes are ready.')"), 'timeline updates before batch completion');
});


test('batch generation uses the newly created cloud project ID for generation and media archive', () => {
  const main = read('client/src/main.jsx');
  const batch = main.slice(main.indexOf('async function generateAll()'), main.indexOf('async function pollTask('));
  assert.match(batch, /projectId:batchProjectId\|\|projectId\|\|null/);
  assert.match(batch, /persistAsset\(url,'video',`scene-\$\{scene.number\}`,batchProjectId\|\|projectId\)/);
});

test('every version marker and living doc agree on the current release', () => {
  const version = JSON.parse(read('package.json')).version;
  assert.match(version, /^\d+\.\d+\.\d+$/);
  assert.equal(JSON.parse(read('client/package.json')).version, version);
  assert.equal(JSON.parse(read('server/package.json')).version, version);
  assert.equal(JSON.parse(read('package-lock.json')).version, version);
  assert.match(read('server/src/services/core.js'), new RegExp(`APP_VERSION = '${version.replace(/\./g, '\\.')}'`));
  assert.match(read('client/public/sw.js'), new RegExp(`avirzo-static-v${version.replace(/\./g, '\\.')}`));
  const v = `v${version}`;
  for (const file of ['README.md', 'LAUNCH.md', 'CHANGELOG.md', 'GITHUB_UPLOAD_INSTRUCTIONS.txt', 'RELEASE_PACKAGE_CHECKLIST.md', 'PROCEDURE_GUARDRAILS.md', 'RELEASE_NOTES_' + v + '.md']) {
    assert.ok(read(file).includes(v), `${file} must mention ${v}`);
  }
  assert.match(read('supabase.sql'), new RegExp(`current as of ${v.replace(/\./g, '\\.')}`));
});


test('v2.17.6 shares rate limits across instances and supports once-per-day spend alerts', () => {
  const core = read('server/src/services/core.js');
  const app = read('server/src/app.js');
  const sql = read('supabase-cross-instance-guardrails.sql');
  const env = read('.env.example');
  assert.match(core, /distributedRateLimit/);
  assert.match(core, /consume_avirzo_distributed_rate_limit/);
  assert.match(core, /AVIRZO_FINANCE_ALERT_WEBHOOK_URL/);
  assert.match(core, /claim_avirzo_budget_alert/);
  assert.match(app, /core\.distributedRateLimit/);
  assert.match(sql, /primary key \(key_hash, window_start\)/);
  assert.match(sql, /pg_advisory_xact_lock/);
  assert.match(sql, /primary key \(budget_date, threshold_percent\)/);
  assert.match(env, /AVIRZO_FINANCE_ALERT_WEBHOOK_URL=/);
});

test('v2.17.5 requires verified email and records privacy-preserving abuse events', () => {
  const core = read('server/src/services/core.js');
  assert.match(core, /REQUIRE_VERIFIED_EMAIL !== 'false'/);
  assert.match(core, /user\.email_confirmed_at \|\| user\.confirmed_at/);
  assert.match(core, /EMAIL_VERIFICATION_REQUIRED/);
  assert.match(core, /createHmac\('sha256'/);
  assert.match(core, /Coalesce repeated identical events for 60 seconds/);
  assert.match(core, /avirzo_security_events/);
  assert.doesNotMatch(core, /headers\[['"]authorization['"]\].*insert/);
  const app = read('server/src/app.js');
  assert.match(app, /\[401, 403, 429\]\.includes\(res\.statusCode\)/);
  assert.ok(app.indexOf('Log only security-relevant responses') < app.indexOf('app.use(\'/api\', (req, res, next) => (exempt(req.path) ? next() : apiLimiter(req, res, next)))'), 'abuse telemetry must observe rate-limit rejections too');
  const sql = read('supabase-abuse-monitoring.sql');
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /revoke all on public\.avirzo_security_events from anon, authenticated/i);
});

test('loss-prevention release reserves provider spend before Runway and caps free scene duration', () => {
  const route = read('server/src/routes/generation.js');
  assert.match(route, /reserveProviderBudget\(\{ jobId: job\.id, userId: providerUser\.id, estimatedUsd \}\)/);
  assert.ok(route.indexOf('reserveProviderBudget({ jobId: job.id') < route.indexOf('fetch(`${RUNWAY_API}/${endpoint}`'), 'budget reservation must precede Runway video submission');
  assert.match(route, /FREE_DURATION_LIMIT/);
  assert.match(route, /settleProviderBudget\(job\.id, 'charged'\)/);
  assert.match(read('render.yaml'), /key: PROVIDER_DAILY_BUDGET_USD\s+value: "25"/);
  assert.match(read('supabase-provider-budget.sql'), /pg_advisory_xact_lock/);
  assert.match(read('supabase-provider-budget.sql'), /refund_avirzo_job_usage/);
});


test('finance alert delivery state persists and failures retry from the worker', () => {
  const core = read('server/src/services/core.js');
  const worker = read('server/src/worker.js');
  const sql = read('supabase-finance-reconciliation.sql');
  assert.match(core, /export async function deliverProviderBudgetAlert/);
  assert.match(core, /export async function retryPendingProviderBudgetAlerts/);
  assert.match(core, /delivery_status: attempt >= 8 \? 'dead_letter' : 'failed'/);
  assert.match(worker, /finance alert retry loop/);
  assert.match(sql, /next_attempt_at/);
  assert.match(sql, /attempt_count integer not null default 0/);
  assert.match(sql, /create table if not exists public\.avirzo_runway_invoice_lines/);
});

test('Runway invoice importer requires task-level USD costs and generates variance reports', () => {
  const importer = read('scripts/reconcile-runway-invoice.mjs');
  assert.match(importer, /provider_task_id/);
  assert.match(importer, /actual_cost_usd/);
  assert.match(importer, /variance_usd/);
  assert.match(importer, /No implicit FX conversion/);
  assert.match(importer, /onConflict: 'invoice_id,source_hash'/);
});

test('v2.17.9 provides account profile editing, password recovery, password change and safe sign-out', () => {
  const main = read('client/src/main.jsx');
  const profile = read('client/src/components/ProfilePanel.jsx');
  assert.match(main, /supabase\.auth\.signInWithPassword/);
  assert.match(main, /supabase\.auth\.signUp\([\s\S]*?full_name/);
  assert.match(main, /async function handleProfileSave\([\s\S]*?supabase\.auth\.updateUser/);
  assert.match(main, /async function handlePasswordReset\([\s\S]*?resetPasswordForEmail/);
  assert.match(main, /async function handlePasswordChange\([\s\S]*?updateUser\(\{password:profilePassword\}\)/);
  assert.match(main, /async function handleSignOut\([\s\S]*?await supabase\.auth\.signOut\(\{scope:'local'\}\)/);
  assert.match(main, /resetPasswordForEmail\(email,\{redirectTo:`\$\{window\.location\.origin\}\$\{window\.location\.pathname\}`\}\)/);
  assert.match(main, /event==='PASSWORD_RECOVERY'[\s\S]*?navigate\('profile'\)/);
  assert.match(main, /onAuthStateChange\(\(event,session\)=>\{[\s\S]*?event==='SIGNED_OUT'[\s\S]*?setProjects\(\[\]\)[\s\S]*?resetWorkspace\(\)/);
  assert.match(profile, /Save profile/);
  assert.match(profile, /Forgot password\?/);
  assert.match(profile, /Update password/);
  assert.match(profile, /aria-live="polite"/);
});

test('v2.17.8 atomically claims each finance alert delivery attempt and pages reconciliation reads', () => {
  const core = read('server/src/services/core.js');
  const sql = read('supabase-finance-reconciliation.sql');
  const importer = read('scripts/reconcile-runway-invoice.mjs');
  assert.match(core, /claim_avirzo_budget_alert_delivery/);
  assert.match(sql, /create or replace function public\.claim_avirzo_budget_alert_delivery/);
  assert.match(sql, /attempt_count = a\.attempt_count \+ 1/);
  assert.match(importer, /async function fetchAll\(query\)/);
  assert.match(importer, /occurrence:\$\{occurrence\}/);
  assert.match(importer, /estimateByJob\.set\(id, \(estimateByJob\.get\(id\) \|\| 0\) \+ Number\(item\.amount_usd \|\| 0\)\)/);
});

test('v2.17.11 persists queued-export subtitles and rolls back partial archive failures', () => {
  const worker = read('server/src/worker.js');
  const route = read('server/src/routes/export.js');
  const exporter = read('server/src/services/exporter.js');
  const jobs = read('server/src/services/jobs.js');
  const main = read('client/src/main.jsx');
  const sql = read('supabase-export-job-reliability.sql');
  assert.match(worker, /result_metadata: result\.srt \? \{ srt: result\.srt/);
  assert.match(route, /result_metadata: result\.srt \? \{ srt: result\.srt/);
  assert.match(main, /job\.result_metadata\?\.srt/);
  assert.match(exporter, /Roll back partial archival/);
  assert.match(exporter, /storage\.from\('avirzo-media'\)\.remove\(\[archivedStoragePath\]\)/);
  assert.match(sql, /add column if not exists result_metadata jsonb/);
  assert.match(jobs, /\.in\('status', \['queued', 'running'\]\)/);
});

test('v2.17.11 uses configured retry limits and paginates provider polling', () => {
  const worker = read('server/src/worker.js');
  const jobs = read('server/src/services/jobs.js');
  const sql = read('supabase-export-job-reliability.sql');
  const route = read('server/src/routes/export.js');
  assert.match(worker, /claimNext\(\['film_export'\], MAX_ATTEMPTS\)/);
  assert.match(jobs, /\.range\(from, from \+ pageSize - 1\)/);
  assert.match(sql, /attempts >= greatest\(1, least\(coalesce\(max_attempts, 3\), 20\)\)/);
  assert.match(route, /EXPORT_WORKER_REQUIRED/);
  assert.match(route, /AVIRZO_ALLOW_INLINE_EXPORTS_IN_PRODUCTION/);
});


test('v2.17.13 release version is aligned across runtime and package files', () => {
  const root = JSON.parse(read('package.json'));
  const client = JSON.parse(read('client/package.json'));
  const server = JSON.parse(read('server/package.json'));
  const lock = JSON.parse(read('package-lock.json'));
  assert.equal(root.version, '2.17.13');
  assert.equal(client.version, root.version);
  assert.equal(server.version, root.version);
  assert.equal(lock.version, root.version);
  assert.equal(lock.packages[''].version, root.version);
  assert.equal(lock.packages.client.version, root.version);
  assert.equal(lock.packages.server.version, root.version);
  assert.match(read('server/src/services/core.js'), /APP_VERSION = '2.17.13'/);
  assert.match(read('client/src/main.jsx'), /STUDIO · v2.17.13/);
  assert.match(read('client/public/sw.js'), /avirzo-static-v2\.17\.13/);
});


test('v2.17.12 keeps web and worker production policies aligned and fails closed for exports', () => {
  const web = read('render.yaml');
  const worker = read('render.worker.yaml');
  const env = read('.env.example');
  for (const key of ['FREE_GENERATIONS_PER_YEAR', 'FREE_CREDITS_PER_MONTH', 'FREE_GENERATION_MODEL', 'FREE_GENERATION_ENABLED', 'FREE_REQUIRE_VERIFIED_EMAIL', 'REQUIRE_VERIFIED_EMAIL', 'FREE_TRIAL_DAYS', 'FREE_TRIAL_POLICY_START', 'PROVIDER_DAILY_BUDGET_USD']) {
    assert.match(web, new RegExp(`key: ${key}[\\s\\S]{0,45}`));
    assert.match(worker, new RegExp(`key: ${key}[\\s\\S]{0,45}`));
  }
  assert.match(web, /key: FREE_GENERATIONS_PER_YEAR\s+value: "2"/);
  assert.match(worker, /key: FREE_GENERATIONS_PER_YEAR\s+value: "2"/);
  assert.match(web, /key: FREE_CREDITS_PER_MONTH\s+value: "0"/);
  assert.match(worker, /key: FREE_CREDITS_PER_MONTH\s+value: "0"/);
  assert.match(web, /key: PROVIDER_DAILY_BUDGET_USD\s+value: "25"/);
  assert.match(worker, /key: PROVIDER_DAILY_BUDGET_USD\s+value: "25"/);
  assert.match(web, /key: AVIRZO_ALLOW_INLINE_EXPORTS_IN_PRODUCTION\s+value: "false"/);
  assert.equal((env.match(/^FREE_GENERATION_MODEL=/gm) || []).length, 1);
  assert.equal((env.match(/^ABUSE_HASH_SECRET=/gm) || []).length, 1);
  assert.equal((env.match(/^RATE_LIMIT_PER_MINUTE=/gm) || []).length, 1);
  assert.equal((env.match(/^RATE_LIMIT_SENSITIVE_PER_10MIN=/gm) || []).length, 1);
});
