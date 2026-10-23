// Process crash protection for Docker / Coolify containers
process.on('uncaughtException', (err: any) => {
  console.error('[AlphaDesk] Uncaught Exception caught by container guard:', err?.message || err);
});

process.on('unhandledRejection', (reason: any) => {
  console.error('[AlphaDesk] Unhandled Rejection caught by container guard:', reason?.message || reason);
});

import { app, startServer } from './server/index.ts';

startServer().catch((err) => {
  console.error('[AlphaDesk] Failed to start server:', err);
});

export { app };
