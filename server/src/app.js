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
  const configuredOrigins = String(process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim().replace(/\/$/, '')).filter(Boolean);
  const publicUrl = String(process.env.AVIRZO_PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || '').trim().replace(/\/$/, '');
  const allowedOrigins = [...new Set([...configuredOrigins, ...(publicUrl ? [publicUrl] : [])])];
  if (core.IS_PRODUCTION && !allowedOrigins.length) throw new Error('Production CORS is not configured. Set ALLOWED_ORIGINS or AVIRZO_PUBLIC_URL.');
  app.use(cors({ origin(origin, callback) { const normalized = String(origin || '').replace(/\/$/, ''); if (!origin || allowedOrigins.includes(normalized) || (!core.IS_PRODUCTION && !allowedOrigins.length)) return callback(null, true); return callback(null, false); } }));
  if (!core.IS_PRODUCTION) app.use('/exports', express.static('exports'));
  app.use('/api/billing/webhook', express.raw({ type: 'application/json' }));
  app.use(express.json({ limit: '60mb' }));
  const clientDist = path.resolve(process.cwd(), 'client/dist');
  app.use(express.static(clientDist));
  const ctx = { ...core, app };
  registerJobRoutes(app, ctx); registerCollaboration(app, ctx); registerBilling(app, ctx); registerPremium(app, ctx); registerSystem(app, ctx); registerAI(app, ctx); registerHeritage(app, ctx); registerVoice(app, ctx); registerGeneration(app, ctx); registerExport(app, ctx); registerPerformance(app, ctx); registerProjects(app, ctx); registerAssets(app, ctx);
  app.use((req, res, next) => { if (req.method === 'GET' && !req.path.startsWith('/api/') && !req.path.startsWith('/exports/')) return res.sendFile(path.join(clientDist, 'index.html')); next(); });
  app.use((req, res) => res.status(404).json({ message: 'Not found.' }));
  return app;
}

export const app = createApp();
