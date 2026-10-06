import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import * as core from './services/core.js';
import { registerRoutes as registerSystem } from './routes/system.js';
import { registerRoutes as registerHeritage } from './routes/heritage.js';
import { registerRoutes as registerVoice } from './routes/voice.js';
import { registerRoutes as registerGeneration } from './routes/generation.js';
import { registerRoutes as registerExport } from './routes/export.js';
import { registerRoutes as registerPerformance } from './routes/performance.js';
import { registerRoutes as registerProjects } from './routes/projects.js';
import { registerRoutes as registerAssets } from './routes/assets.js';
import { registerJobRoutes } from './routes/jobs.js';
import { registerRoutes as registerCollaboration } from './routes/collaboration.js';
import { registerRoutes as registerBilling } from './routes/billing.js';
import { registerRoutes as registerPremium } from './routes/premium.js';
import { registerRoutes as registerAI } from './routes/ai.js';

export function createApp() {
  const app = express();
  if (core.IS_PRODUCTION && (!core.SUPABASE_URL || !core.SUPABASE_KEY || !core.SUPABASE_SERVICE_ROLE_KEY)) {
    throw new Error('Production requires SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, and SUPABASE_SERVICE_ROLE_KEY. Local JSON project storage is disabled in production.');
  }
  const configuredOrigins = String(process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim().replace(/\/$/, '')).filter(Boolean);
  const publicUrl = String(process.env.AVIRZO_PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || '').trim().replace(/\/$/, '');
  const allowedOrigins = [...new Set([...configuredOrigins, ...(publicUrl ? [publicUrl] : [])])];
  if (core.IS_PRODUCTION && !allowedOrigins.length) throw new Error('Production CORS is not configured. Set ALLOWED_ORIGINS or AVIRZO_PUBLIC_URL.');
  app.use(cors({ origin(origin, callback) { const normalized = String(origin || '').replace(/\/$/, ''); if (!origin || allowedOrigins.includes(normalized) || (!core.IS_PRODUCTION && !allowedOrigins.length)) return callback(null, true); return callback(null, false); } }));
  if (!core.IS_PRODUCTION) app.use('/exports', express.static('exports'));
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use((req, res, next) => {
    res.set({ 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'X-Frame-Options': 'DENY', 'Permissions-Policy': 'camera=(), microphone=(), geolocation=()' });
    if (core.IS_PRODUCTION) res.set('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
    next();
  });
  app.use('/api/billing/webhook', express.raw({ type: 'application/json', limit: '1mb' }));
  // Large bodies (base64 images/audio, saved projects, export payloads) only where the feature needs them.
  const bigJson = express.json({ limit: '60mb' });
  const smallJson = express.json({ limit: '1mb' });
  const BIG_BODY_PATHS = /^\/api\/(projects|export|assets|generate|performance|voice)(\/|$)/;
  app.use((req, res, next) => (BIG_BODY_PATHS.test(req.path) ? bigJson : smallJson)(req, res, next));
  const clientDist = path.resolve(process.cwd(), 'client/dist');
  app.use(express.static(clientDist));
  const ctx = { ...core, app };
  registerJobRoutes(app, ctx); registerCollaboration(app, ctx); registerBilling(app, ctx); registerPremium(app, ctx); registerSystem(app, ctx); registerAI(app, ctx); registerHeritage(app, ctx); registerVoice(app, ctx); registerGeneration(app, ctx); registerExport(app, ctx); registerPerformance(app, ctx); registerProjects(app, ctx); registerAssets(app, ctx);
  app.use((req, res, next) => { if (req.method === 'GET' && !req.path.startsWith('/api/') && !req.path.startsWith('/exports/')) return res.sendFile(path.join(clientDist, 'index.html')); next(); });
  app.use((req, res) => res.status(404).json({ message: 'Not found.' }));
  // Always answer with JSON, never a stack trace or HTML error page.
  app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);
    const status = err?.type === 'entity.too.large' ? 413 : err?.type === 'entity.parse.failed' ? 400 : Number(err?.status) >= 400 && Number(err?.status) < 500 ? Number(err.status) : 500;
    if (status >= 500) console.error('Unhandled request error:', err);
    const message = status === 413 ? 'That request is too large.' : status === 400 ? 'The request could not be read.' : status < 500 ? 'The request was rejected.' : 'Something went wrong on our side. Your work is safe; please try again.';
    res.status(status).json({ message });
  });
  return app;
}

export const app = createApp();
