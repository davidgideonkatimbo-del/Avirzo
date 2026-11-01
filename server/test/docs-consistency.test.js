// Keeps the documentation, UI text, legal pages and configuration telling the same story as the code.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { LEGAL_VERSION } from '../src/routes/account.js';

const root = new URL('../../', import.meta.url).pathname;
const read = p => readFileSync(`${root}${p}`, 'utf8');
const VERSION = JSON.parse(read('package.json')).version;
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

test('the current version is stated consistently across the docs', () => {
  assert.ok(existsSync(`${root}RELEASE_NOTES_v${VERSION}.md`), 'release notes for the current version exist at the root');
  assert.match(read(`RELEASE_NOTES_v${VERSION}.md`), new RegExp(`^# Avirzo v${esc(VERSION)}\\b`));
  assert.match(read('CHANGELOG.md'), new RegExp(`^## v${esc(VERSION)}\\b`));
  assert.match(read('README.md'), new RegExp(`\\*\\*Current release: v${esc(VERSION)}\\*\\*`));
  for (const f of ['LAUNCH.md', 'RELEASE_PACKAGE_CHECKLIST.md', 'GITHUB_UPLOAD_INSTRUCTIONS.txt', 'PROCEDURE_GUARDRAILS.md']) assert.match(read(f).split('\n')[0], new RegExp(`Current release: v${esc(VERSION)}`), f);
  assert.match(read('LAUNCH.md'), new RegExp(`Launch checklist \\(v${esc(VERSION)}\\)`));
  assert.match(read('RELEASE_PACKAGE_CHECKLIST.md'), new RegExp(`Avirzo v${esc(VERSION)} Release Package Checklist`));
  assert.match(read('GITHUB_UPLOAD_INSTRUCTIONS.txt'), new RegExp(`AVIRZO v${esc(VERSION)} `));
  const roots = readdirSync(root).filter(f => /^RELEASE_NOTES_v[\d.]+\.md$/.test(f)).map(f => f.match(/v([\d.]+)\.md/)[1]);
  const cmp = (a, b) => a.split('.').map(Number).reduce((d, n, i) => d || n - Number(b.split('.')[i]), 0);
  assert.ok(roots.every(v => cmp(v, VERSION) <= 0), 'no release notes newer than the package version');
});

test('every SQL migration is documented, in order, in DEPLOYMENT.md', () => {
  const doc = read('DEPLOYMENT.md');
  const files = readdirSync(root).filter(f => /^supabase.*\.sql$/.test(f));
  for (const f of files) assert.ok(doc.includes(f), `${f} is not mentioned in DEPLOYMENT.md`);
  assert.ok(doc.indexOf('supabase-legal-safety.sql') < doc.indexOf('supabase-pesapal.sql'), 'legal-safety is listed before pesapal');
  assert.ok(doc.indexOf('supabase-provider-budget.sql') < doc.indexOf('supabase-finance-reconciliation.sql'), 'finance reconciliation follows the provider budget');
  assert.match(doc, /^# Avirzo Production Deployment$/m, 'the title carries no stale version number');
  assert.match(doc, /## Payments with Pesapal/);
});

test('no document contains leftover AI citation markers', () => {
  const docs = readdirSync(root).filter(f => /\.(md|txt)$/.test(f)).concat(readdirSync(`${root}docs`).filter(f => f.endsWith('.md')).map(f => `docs/${f}`));
  for (const f of docs) assert.doesNotMatch(read(f), /cite(?:\W*turn\d+[a-z]+\d*)|turn\d+(?:search|view|news)\d+|[\ue000-\uf8ff]/, f);
});

test('legal pages carry the same effective date as the version users accept', () => {
  const [y, m, d] = LEGAL_VERSION.split('-').map(Number);
  const pretty = `${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][m - 1]} ${d}, ${y}`;
  for (const f of ['client/public/terms.html', 'client/public/privacy.html']) assert.match(read(f), new RegExp(`Effective ${pretty}`), f);
});

test('plan cards, prices and credit allowances agree across UI, config and code', () => {
  const ui = read('client/src/components/BillingPanel.jsx'), env = read('.env.example');
  const num = k => Number(env.match(new RegExp(`^${k}=(\\d+)`, 'm'))?.[1]);
  assert.match(ui, /id: 'creator'[^}]*price: '\$19\/mo'/); assert.match(ui, /id: 'studio'[^}]*price: '\$59\/mo'/);
  assert.match(ui, new RegExp(`id: 'creator'[^}]*${num('CREATOR_CREDITS_PER_MONTH')} credits every month`));
  assert.match(ui, new RegExp(`id: 'studio'[^}]*${num('STUDIO_CREDITS_PER_MONTH').toLocaleString('en-US')} credits every month`));
  const cat = read('server/src/services/pesapalCatalog.js');
  assert.match(cat, /USD_PLAN_DEFAULTS = \{ creator: 19, studio: 59 \}/);
  assert.match(cat, new RegExp(`USD_PACK_DEFAULTS = \\{ starter: ${num('CREDIT_PACK_STARTER_PRICE_USD')}, pro: ${num('CREDIT_PACK_PRO_PRICE_USD')}, studio: ${num('CREDIT_PACK_STUDIO_PRICE_USD')} \\}`));
  assert.equal(num('FREE_CREDITS_PER_MONTH'), 0);
});

test('the free-tier rules read the same in the UI, README, config and checklist', () => {
  const ui = read('client/src/components/BillingPanel.jsx'), render = read('render.yaml');
  assert.doesNotMatch(ui, /30-day trial/, 'the free period is 12 months, not 30 days');
  assert.match(ui, /id: 'free'[^}]*12-month free access · 2 scene generations/);
  assert.match(render, /FREE_TRIAL_DAYS\n\s+value: "365"/);
  assert.match(render, /FREE_GENERATIONS_PER_YEAR\n\s+value: "2"/);
  assert.match(render, /FREE_CREDITS_PER_MONTH\n\s+value: "0"/);
  assert.match(read('README.md'), /12-month free access period with two scene generations/);
  assert.doesNotMatch(ui, /team seats/, 'there is no team-seat feature');
});

test('payment wording does not still tell people Stripe is the only option', () => {
  const launch = read('LAUNCH.md');
  assert.doesNotMatch(launch, /Set env: Supabase, Runway, ElevenLabs, Stripe plan prices/);
  assert.match(launch, /re-run `supabase-finance-reconciliation\.sql`/);
  assert.match(read('client/public/terms.html'), /prepaid for 30 days/);
  assert.match(read('client/public/privacy.html'), /Pesapal/);
});

test('every environment variable in render.yaml is documented in .env.example', () => {
  const env = new Set([...read('.env.example').matchAll(/^#?\s*([A-Z][A-Z0-9_]+)=/gm)].map(m => m[1]));
  const missing = [...read('render.yaml').matchAll(/key: ([A-Z][A-Z0-9_]+)/g)].map(m => m[1]).filter(k => !env.has(k));
  assert.deepEqual(missing, []);
});
