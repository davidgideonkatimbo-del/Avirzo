import { app } from './app.js';

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => console.log(`Avirzo server listening on http://${HOST}:${PORT}`));
