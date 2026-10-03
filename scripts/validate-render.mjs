import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const render = fs.readFileSync(path.join(root, 'render.yaml'), 'utf8');
const docker = fs.readFileSync(path.join(root, 'Dockerfile'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const clientPkg = JSON.parse(fs.readFileSync(path.join(root, 'client/package.json'), 'utf8'));
const serverPkg = JSON.parse(fs.readFileSync(path.join(root, 'server/package.json'), 'utf8'));
const core = fs.readFileSync(path.join(root, 'server/src/services/core.js'), 'utf8');
const system = fs.readFileSync(path.join(root, 'server/src/routes/system.js'), 'utf8');

const requiredFiles = [
  'Dockerfile', 'render.yaml', 'package.json', 'client/package.json', 'server/package.json',
  'client/vite.config.js', 'server/src/index.js', 'server/src/app.js', 'server/src/worker.js',
  'server/src/services/core.js', 'server/src/services/jobs.js', 'server/src/services/exporter.js',
  'supabase.sql'
];
let failed = false;
for (const rel of requiredFiles) {
  if (!fs.existsSync(path.join(root, rel))) { console.error(`FAIL: missing ${rel}`); failed = true; }
  else console.log(`PASS: ${rel}`);
}

const required = [
  ['web service', /type:\s+web/],
  ['web health check', /healthCheckPath:\s*\/api\/health/],
  ['worker service', /type:\s+worker/],
  ['worker command', /dockerCommand:\s*node server\/src\/worker\.js/],
  ['Vite URL build ARG', /ARG VITE_SUPABASE_URL/],
  ['Vite key build ARG', /ARG VITE_SUPABASE_PUBLISHABLE_KEY/],
  ['FFmpeg install', /apt-get install[^\n]*ffmpeg/],
  ['Stripe webhook secret', /key:\s+STRIPE_WEBHOOK_SECRET/],
  ['Supabase worker secret', /key:\s+SUPABASE_SERVICE_ROLE_KEY/],
  ['public URL', /key:\s+AVIRZO_PUBLIC_URL/],
  ['worker Vite URL', /name:\s+avirzo-worker[\s\S]*?key:\s+VITE_SUPABASE_URL/],
  ['worker Vite key', /name:\s+avirzo-worker[\s\S]*?key:\s+VITE_SUPABASE_PUBLISHABLE_KEY/],
];
for (const [name, re] of required) {
  if (!re.test(render + '\n' + docker)) { console.error(`FAIL: ${name}`); failed = true; }
  else console.log(`PASS: ${name}`);
}

for (const [name, version] of [['root', pkg.version], ['client', clientPkg.version], ['server', serverPkg.version]]) {
  if (version !== '2.8.5') { console.error(`FAIL: ${name} package version is ${version}, expected 2.8.5`); failed = true; }
  else console.log(`PASS: ${name} package version 2.8.5`);
}
if (!core.includes("APP_VERSION = '2.8.5'")) { console.error('FAIL: server APP_VERSION'); failed = true; }
else console.log('PASS: server APP_VERSION 2.8.5');
if (!system.includes('res.json({')) { console.error('FAIL: health endpoint'); failed = true; }
else console.log('PASS: health endpoint present');
if (fs.existsSync(path.join(root, 'package-lock.json'))) console.log('PASS: package-lock.json present');
else console.warn('WARN: package-lock.json missing; generate it on a networked machine and switch Docker/CI to strict npm ci.');

if (failed) process.exit(1);
console.log('Render static certification checks passed for Avirzo v2.8.5.');
