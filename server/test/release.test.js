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
