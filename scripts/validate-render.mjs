import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const requiredFiles = [
  'Dockerfile',
  'render.yaml',
  'package.json',
  'client/package.json',
  'client/vite.config.js',
  'server/package.json',
  'server/src/index.js',
  'server/src/worker.js',
  'server/src/app.js',
  'server/src/services/core.js',
  'supabase.sql',
];

let failed = false;
const ok = (m) => console.log(`OK: ${m}`);
const warn = (m) => console.warn(`WARN: ${m}`);
const fail = (m) => { failed = true; console.error(`FAIL: ${m}`); };

for (const file of requiredFiles) {
  if (fs.existsSync(path.join(root, file))) ok(`required file ${file}`);
  else fail(`missing required file ${file}`);
}

for (const file of ['package.json', 'client/package.json', 'server/package.json']) {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
    if (pkg.version === '2.8.2') ok(`${file} version 2.8.2`);
    else fail(`${file} version is ${pkg.version}, expected 2.8.2`);
  } catch (e) { fail(`${file} is not valid JSON`); }
}

const docker = fs.readFileSync(path.join(root, 'Dockerfile'), 'utf8');
for (const needle of [
  'ARG VITE_SUPABASE_URL',
  'ARG VITE_SUPABASE_PUBLISHABLE_KEY',
  'COPY . .',
  'COPY --from=build /app/server/src ./server/src',
  'ffmpeg',
  'CMD ["node", "server/src/index.js"]',
]) {
  if (docker.includes(needle)) ok(`Dockerfile contains ${needle}`);
  else fail(`Dockerfile missing ${needle}`);
}

const render = fs.readFileSync(path.join(root, 'render.yaml'), 'utf8');
for (const needle of [
  'name: avirzo',
  'healthCheckPath: /api/health',
  'name: avirzo-worker',
  'dockerCommand: node server/src/worker.js',
  'key: VITE_SUPABASE_URL',
  'key: VITE_SUPABASE_PUBLISHABLE_KEY',
  'key: STRIPE_WEBHOOK_SECRET',
  'key: SUPABASE_SERVICE_ROLE_KEY',
  'key: AVIRZO_PUBLIC_URL',
]) {
  if (render.includes(needle)) ok(`render.yaml contains ${needle}`);
  else fail(`render.yaml missing ${needle}`);
}

const core = fs.readFileSync(path.join(root, 'server/src/services/core.js'), 'utf8');
if (/APP_VERSION\s*=\s*['"]2\.8\.2['"]/.test(core)) ok('APP_VERSION is 2.8.2');
else fail('APP_VERSION is not 2.8.2');

const app = fs.readFileSync(path.join(root, 'server/src/app.js'), 'utf8');
if (app.includes('/api/health') || app.includes('health')) ok('server health endpoint is present');
else warn('Could not verify health endpoint textually; inspect server/src/app.js');

if (fs.existsSync(path.join(root, 'package-lock.json'))) ok('package-lock.json present');
else warn('package-lock.json missing; generate it on a networked machine and switch Docker/CI to strict npm ci.');

if (failed) process.exit(1);
console.log('Render configuration validation passed.');
