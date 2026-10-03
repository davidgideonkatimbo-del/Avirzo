import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

test('release stays on the protected Avirzo workflow', () => {
  const guardrails = read('PROCEDURE_GUARDRAILS_v2.8.5.md');
  assert.match(guardrails, /Web service first/i);
  assert.match(guardrails, /Worker remains optional/i);
  assert.match(guardrails, /Test the updated build on Android/i);
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

test('mobile long text and plain action buttons have explicit protection', () => {
  const css = read('client/src/styles.css');
  const projects = read('client/src/components/ProjectsPanel.jsx');
  const profile = read('client/src/components/ProfilePanel.jsx');
  assert.match(css, /overflow-wrap:anywhere/);
  assert.match(css, /\.plain-action\{/);
  assert.match(projects, /className="plain-action"[^>]*>\+ New project/);
  assert.match(profile, /className="plain-action"[^>]*>Sign out/);
});
