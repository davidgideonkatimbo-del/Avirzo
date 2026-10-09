import { app } from './app.js';

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
