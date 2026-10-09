// Small, dependency-free security helpers: a fixed-window rate limiter and the Content-Security-Policy builder.

export function createRateLimiter({ windowMs = 60_000, max = 300, message = 'Too many requests. Please slow down and try again shortly.', keyFn = req => req.ip || 'unknown' } = {}) {
  const hits = new Map(); // key -> { count, resetAt }
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) if (entry.resetAt <= now) hits.delete(key);
  }, Math.max(windowMs, 10_000));
  sweep.unref?.();
  function limiter(req, res, next) {
    const now = Date.now();
    const key = keyFn(req);
    let entry = hits.get(key);
    if (!entry || entry.resetAt <= now) { entry = { count: 0, resetAt: now + windowMs }; hits.set(key, entry); }
    entry.count += 1;
    res.set('RateLimit-Limit', String(max));
    res.set('RateLimit-Remaining', String(Math.max(0, max - entry.count)));
    if (entry.count > max) {
      res.set('Retry-After', String(Math.max(1, Math.ceil((entry.resetAt - now) / 1000))));
      return res.status(429).json({ message });
    }
    next();
  }
  limiter.size = () => hits.size;
  return limiter;
}

// CSP for the single-page app. React uses inline style attributes, so style-src allows 'unsafe-inline';
// scripts stay locked to our own origin. Media may come from Supabase signed URLs or provider CDNs, hence https: for img/media.
export function buildCsp({ supabaseUrl = '' } = {}) {
  let supabaseOrigin = '', supabaseWs = '';
  try { const u = new URL(supabaseUrl); supabaseOrigin = u.origin; supabaseWs = `wss://${u.host}`; } catch { /* not configured */ }
  const connect = ["'self'", 'data:', 'blob:', supabaseOrigin, supabaseWs, 'https://*.supabase.co', 'wss://*.supabase.co'].filter(Boolean);
  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "media-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src ${connect.join(' ')}`,
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'"
  ].join('; ');
}
