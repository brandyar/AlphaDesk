import { app, startServer } from './server/index.ts';

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});

export { app };
