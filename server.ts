import { app, startServer } from './server/index';

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});

export { app };
