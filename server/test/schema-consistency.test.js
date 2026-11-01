// Guards against the code and the database schema drifting apart (missing tables/columns, NOT NULL writes,
// values outside CHECK lists) and against imports that would crash the server at startup.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';

const root = new URL('../../', import.meta.url).pathname;
const read = p => readFileSync(path.join(root, p), 'utf8');
const walk = (dir, exts) => readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(e => {
  const rel = `${dir}/${e.name}`;
  return e.isDirectory() ? (e.name === 'node_modules' ? [] : walk(rel, exts)) : exts.some(x => e.name.endsWith(x)) ? [rel] : [];
});

function parseSchema() {
  const sql = readdirSync(root).filter(f => /^supabase.*\.sql$/.test(f)).sort().map(f => read(f)).join('\n');
  const tables = {};
  for (const m of sql.matchAll(/create table if not exists (?:public\.)?(\w+)\s*\(([\s\S]*?)\n\);/gi)) {
    const cols = {};
    for (let line of m[2].split('\n')) {
      line = line.trim().replace(/,$/, '');
      if (!line || /^(--|primary|unique|constraint|check|foreign)/i.test(line)) continue;
      const name = line.split(/\s+/)[0].replace(/"/g, '');
      const checkIn = line.match(new RegExp(`check\\s*\\(\\s*${name}\\s+in\\s*\\(([^)]*)\\)`, 'i'));
      cols[name] = { notNull: /\bnot null\b/i.test(line) || /primary key/i.test(line), allowed: checkIn ? checkIn[1].split(',').map(v => v.trim().replace(/'/g, '')) : null };
    }
    tables[m[1]] = cols;
  }
  for (const m of sql.matchAll(/alter table (?:if exists )?(?:public\.)?(\w+)([^;]*);/gi)) {
    if (!tables[m[1]]) continue;
    for (const c of m[2].matchAll(/add column if not exists (\w+)([^,;]*)/gi)) tables[m[1]][c[1]] = { notNull: /\bnot null\b/i.test(c[2]), allowed: null };
    for (const c of m[2].matchAll(/alter column (\w+) drop not null/gi)) if (tables[m[1]][c[1]]) tables[m[1]][c[1]].notNull = false;
  }
  return tables;
}

// Each table access in server code: { file, table, chain } where chain is the query text that follows .from('table').
function tableAccesses() {
  const out = [];
  for (const f of [...walk('server/src', ['.js']), ...walk('scripts', ['.mjs'])]) {
    const s = read(f);
    for (const m of s.matchAll(/\.from\('(avirzo_\w+)'\)/g)) {
      let chain = s.slice(m.index + m[0].length, m.index + m[0].length + 900);
      const stop = chain.slice(1).search(/\n\s*\n|;\s*\n\s*(?:const|let|if|return|await|try|\}|throw)\b/);
      if (stop > 0) chain = chain.slice(0, stop + 1);
      const next = chain.indexOf('.from(', 1);          // dense one-line code can hold several queries
      if (next > 0) chain = chain.slice(0, next);
      out.push({ file: f, table: m[1], chain });
    }
  }
  return out;
}

test('every table and column the server queries exists in the SQL files', () => {
  const tables = parseSchema(); const problems = new Set();
  for (const { file, table, chain } of tableAccesses()) {
    if (!tables[table]) { problems.add(`${file}: table ${table} is not created by any supabase*.sql`); continue; }
    const cols = tables[table];
    for (const s of chain.matchAll(/\.select\('([^']*)'/g)) for (const c of s[1].split(',').map(x => x.trim())) {
      if (!c || c === '*' || /[(:!]/.test(c)) continue;
      if (!cols[c]) problems.add(`${file}: ${table}.select("${c}") is not a column`);
    }
    for (const s of chain.matchAll(/\.(eq|neq|in|lt|lte|gt|gte|is|order|not)\('(\w+)'/g)) if (!cols[s[2]]) problems.add(`${file}: ${table}.${s[1]}("${s[2]}") is not a column`);
  }
  assert.deepEqual([...problems], []);
});

test('the code never writes null into a NOT NULL column or a value outside a CHECK list', () => {
  const tables = parseSchema(); const problems = new Set();
  for (const { file, table, chain } of tableAccesses()) {
    const cols = tables[table]; if (!cols) continue;
    for (const w of chain.matchAll(/\.(update|insert|upsert)\(\s*\{([^}]*)\}/g)) {
      for (const pair of w[2].matchAll(/(?:^|,)\s*(\w+)\s*:\s*(null\b|'(\w+)')/g)) {
        const col = cols[pair[1]]; if (!col) continue;
        if (pair[2] === 'null' && col.notNull) problems.add(`${file}: ${table}.${pair[1]} is NOT NULL but the code sets it to null`);
        if (pair[3] && col.allowed && !col.allowed.includes(pair[3])) problems.add(`${file}: ${table}.${pair[1]}="${pair[3]}" is not in its CHECK list (${col.allowed.join(', ')})`);
      }
    }
  }
  assert.deepEqual([...problems], []);
});

test('every relative import resolves to a file that exports the imported names', () => {
  const exportsOf = (file, seen = new Set()) => {
    if (seen.has(file)) return new Set(); seen.add(file);
    const s = readFileSync(file, 'utf8'); const names = new Set();
    for (const m of s.matchAll(/export\s+(?:async\s+)?(?:function\*?|const|let|var|class)\s+(\w+)/g)) names.add(m[1]);
    for (const m of s.matchAll(/export\s*\{([^}]*)\}/g)) for (const p of m[1].split(',')) if (p.trim()) names.add(p.trim().split(/\s+as\s+/).pop());
    if (/export\s+default/.test(s)) names.add('default');
    for (const m of s.matchAll(/export\s*\*\s*from\s*['"]([^'"]+)['"]/g)) { const t = path.resolve(path.dirname(file), m[1]); if (existsSync(t)) exportsOf(t, seen).forEach(n => names.add(n)); }
    return names;
  };
  const problems = [];
  for (const f of [...walk('server/src', ['.js']), ...walk('client/src', ['.js', '.jsx'])]) {
    const s = read(f);
    for (const m of s.matchAll(/import\s+(?:(\w+)\s*,?\s*)?(?:\{([^}]*)\}\s*)?(?:\*\s+as\s+\w+\s*)?from\s*['"](\.[^'"]+)['"]/g)) {
      const base = path.resolve(path.dirname(path.join(root, f)), m[3]);
      const target = [base, ...['.js', '.jsx', '.mjs', '.json', '.css'].map(e => base + e), path.join(base, 'index.js')].find(c => existsSync(c) && statSync(c).isFile());
      if (!target) { problems.push(`${f}: cannot resolve ${m[3]}`); continue; }
      if (!/\.(m?js|jsx)$/.test(target)) continue;
      const ex = exportsOf(target);
      for (const n of (m[2] || '').split(',').map(x => x.trim().split(/\s+as\s+/)[0]).filter(Boolean)) if (!ex.has(n)) problems.push(`${f}: "${n}" is not exported by ${path.relative(root, target)}`);
      if (m[1] && !ex.has('default')) problems.push(`${f}: no default export in ${m[3]}`);
    }
  }
  assert.deepEqual(problems, []);
});

test('every API call the client makes is served by a server route', () => {
  const routes = [];
  for (const f of walk('server/src', ['.js'])) {
    const s = read(f);
    for (const m of s.matchAll(/\bapp\.(get|post|put|patch|delete)\(\s*['"`]([^'"`]+)['"`]/g)) routes.push({ method: m[1].toUpperCase(), re: new RegExp(`^${m[2].replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/:\w+/g, '[^/]+')}$`) });
    for (const m of s.matchAll(/\bapp\.use\(\s*\[?['"`](\/api[^'"`]*)['"`]/g)) routes.push({ method: '*', prefix: m[1] });
  }
  const problems = [];
  for (const f of walk('client/src', ['.js', '.jsx'])) {
    const s = read(f);
    for (const m of s.matchAll(/(?:apiFetch|fetch|authedFetch)\(\s*([`'"])(\/api\/[^`'"]*)\1([\s\S]{0,200})/g)) {
      const url = m[2].replace(/\$\{[^}]*\}/g, 'x').split('?')[0];
      const method = (m[3].match(/method:\s*['"](\w+)['"]/)?.[1] || 'GET').toUpperCase();
      if (!routes.some(r => (r.method === method || r.method === '*') && (r.prefix ? url.startsWith(r.prefix) : r.re.test(url)))) problems.push(`${f}: ${method} ${url} has no server route`);
    }
  }
  assert.deepEqual(problems, []);
});

test('finance alert retries: delivered alerts may have a NULL next_attempt_at (otherwise delivery re-sends)', () => {
  assert.match(read('supabase-finance-reconciliation.sql'), /alter column next_attempt_at drop not null/i);
});
