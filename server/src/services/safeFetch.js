import https from 'node:https';
import dns from 'node:dns';
import net from 'node:net';

// SSRF protection: HTTPS only, public IPs only (checked at connect time, so DNS
// rebinding cannot swap in a private address), bounded redirects, size and time.

export function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19)) || a >= 224;
  }
  if (net.isIPv6(ip)) {
    const v = ip.toLowerCase();
    if (v === '::' || v === '::1') return true;
    const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateIp(mapped[1]);
    const hexMapped = v.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
    if (hexMapped) { const hi = parseInt(hexMapped[1], 16), lo = parseInt(hexMapped[2], 16); return isPrivateIp(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`); }
    return /^f[cd]/.test(v) || /^fe[89ab]/.test(v) || v.startsWith('ff') || v.startsWith('64:ff9b') || v.startsWith('2001:db8');
  }
  return true;
}

function allowedHosts() {
  return String(process.env.ALLOWED_MEDIA_HOSTS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
}

export function assertSafeUrl(input) {
  let u;
  try { u = new URL(String(input)); } catch { throw new Error('Invalid media URL.'); }
  if (u.protocol !== 'https:') throw new Error('Only HTTPS media URLs are allowed.');
  if (u.username || u.password) throw new Error('Media URLs must not contain credentials.');
  if (u.port && u.port !== '443') throw new Error('Media URLs must use the default HTTPS port.');
  const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (net.isIP(host) && isPrivateIp(host)) throw new Error('Media URL points to a disallowed address.');
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal') || host.endsWith('.local')) throw new Error('Media URL points to a disallowed host.');
  const list = allowedHosts();
  if (list.length && !list.some(h => host === h || host.endsWith(`.${h}`))) throw new Error('Media host is not on the allowlist.');
  return u;
}

function guardedLookup(hostname, options, callback) {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err);
    const list = Array.isArray(addresses) ? addresses : [{ address: addresses, family: 4 }];
    if (!list.length || list.some(a => isPrivateIp(a.address))) return callback(new Error('Media host resolves to a disallowed address.'));
    if (options?.all) return callback(null, list);
    callback(null, list[0].address, list[0].family);
  });
}

function getOnce(url, { timeoutMs, maxBytes }) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { lookup: guardedLookup, headers: { 'User-Agent': 'avirzo/2.1', Accept: '*/*' }, timeout: timeoutMs }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) { res.resume(); return resolve({ redirect: new URL(res.headers.location, url).toString() }); }
      if (res.statusCode < 200 || res.statusCode >= 300) { res.resume(); return reject(new Error(`Remote server returned ${res.statusCode}.`)); }
      const declared = Number(res.headers['content-length'] || 0);
      if (declared && declared > maxBytes) { res.destroy(); return reject(new Error('Remote file is too large.')); }
      const chunks = []; let total = 0;
      const deadline = setTimeout(() => req.destroy(new Error('Download timed out.')), timeoutMs * 4);
      res.on('data', c => { total += c.length; if (total > maxBytes) { req.destroy(new Error('Remote file is too large.')); return; } chunks.push(c); });
      res.on('end', () => { clearTimeout(deadline); resolve({ buffer: Buffer.concat(chunks), contentType: String(res.headers['content-type'] || '') }); });
      res.on('error', e => { clearTimeout(deadline); reject(e); });
    });
    req.on('timeout', () => req.destroy(new Error('Remote server timed out.')));
    req.on('error', reject);
  });
}

export async function safeFetchBuffer(input, { maxBytes = 300 * 1024 * 1024, timeoutMs = 30000, maxRedirects = 3 } = {}) {
  let url = assertSafeUrl(input).toString();
  for (let i = 0; i <= maxRedirects; i++) {
    const out = await getOnce(url, { timeoutMs, maxBytes });
    if (out.redirect) { url = assertSafeUrl(out.redirect).toString(); continue; }
    return out;
  }
  throw new Error('Too many redirects.');
}
