import { app } from './app.js';
import { notifyOps } from './services/alerts.js';
import { creditPackWarnings, creditConfigSummary, creditsEnabled } from './services/credits.js';
import { billingProvider, pesapalWarnings } from './services/pesapalCatalog.js';

if (creditsEnabled()) console.log(`[credits] ${creditConfigSummary().join(' | ')}`);
if (billingProvider() === 'pesapal') { console.log(`[billing] provider: Pesapal (${String(process.env.PESAPAL_ENV || 'sandbox').toLowerCase()})`); for (const w of pesapalWarnings()) console.warn(`[pesapal] NOT offered: ${w}`); }
for (const w of creditPackWarnings()) console.warn(`[credit packs] NOT offered: ${w}`);

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || '0.0.0.0';
const server = app.listen(PORT, HOST, () => console.log(`Avirzo server listening on http://${HOST}:${PORT}`));

// Render sends SIGTERM on every deploy/restart: stop accepting new requests, let in-flight ones finish.
function shutdown(signal) {
  console.log(`${signal} received; shutting down gracefully.`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 20000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', reason => { console.error('Unhandled rejection:', reason); void notifyOps('unhandled_rejection', reason?.message || String(reason)); });
process.on('uncaughtException', error => { console.error('Uncaught exception:', error); void notifyOps('uncaught_exception', error?.message || String(error)).finally(() => process.exit(1)); });
