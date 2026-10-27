import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  PORT,
  directusUrl,
  directusAdminToken,
  updateProjectSettingsData,
} from './config.ts';
import { directusFetch } from './directus/client.ts';
import { ensureDirectusTenants, ensureDirectusPersonnel } from './directus/sync.ts';
import { rateLimiter } from './middlewares/rateLimit.middleware.ts';

import authRoutes from './routes/auth.routes.ts';
import personnelRoutes from './routes/personnel.routes.ts';
import customerRoutes from './routes/customers.routes.ts';
import reportRoutes from './routes/reports.routes.ts';
import coldLeadRoutes from './routes/coldLeads.routes.ts';
import leaveRequestRoutes from './routes/leaveRequests.routes.ts';
import advanceRequestRoutes from './routes/advanceRequests.routes.ts';
import tenantRoutes from './routes/tenants.routes.ts';
import adminReportRoutes from './routes/adminReports.routes.ts';
import analyticsRoutes from './routes/analytics.routes.ts';
import systemRoutes from './routes/system.routes.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();

// 1. Direct unmetered healthcheck endpoints for Coolify / Docker container probes
app.get(['/health', '/api/health'], (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    directusConnected: Boolean(directusUrl && directusAdminToken),
  });
});

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use(rateLimiter);

// Mount all modular API routers
app.use('/api/auth', authRoutes);
app.use('/api', authRoutes);
app.use(authRoutes);
app.use('/api/personnel', personnelRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/customer-reports', reportRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use(analyticsRoutes);
app.use(coldLeadRoutes);
app.use(leaveRequestRoutes);
app.use(advanceRequestRoutes);
app.use(adminReportRoutes);
app.use(systemRoutes);

export async function startServer() {
  if (directusUrl && directusAdminToken) {
    ensureDirectusTenants()
      .then(() => ensureDirectusPersonnel())
      .then(async () => {
        try {
          const resp = await directusFetch('/items/project_settings').catch(() => null);
          if (resp?.data) {
            const item = Array.isArray(resp.data) ? resp.data[0] : resp.data;
            if (item) {
              updateProjectSettingsData(item);
            }
          }
        } catch {}
      })
      .catch((err) => console.warn('Database initialization warning:', err?.message || err));
  }

  // Robust dist folder discovery across root server.js, tsx, or custom working directories
  const candidateDistDirs = [
    path.resolve(process.cwd(), 'dist'),
    path.resolve(__dirname, 'dist'),
    path.resolve(__dirname, '../dist'),
    path.resolve(__dirname, '../../dist'),
  ];
  const distPath = candidateDistDirs.find(
    (p) => fs.existsSync(p) && fs.existsSync(path.resolve(p, 'index.html'))
  );
  const hasDist = Boolean(distPath);

  if (process.env.NODE_ENV === 'production') {
    if (hasDist && distPath) {
      console.log(`[Production] Serving pre-compiled frontend assets from ${distPath}`);
      const assetsPath = path.resolve(distPath, 'assets');
      if (fs.existsSync(assetsPath)) {
        app.use('/assets', express.static(assetsPath, {
          maxAge: '1y',
          immutable: true,
        }));
      }
      app.use(express.static(distPath));
      app.get('*', (req, res, next) => {
        if (
          req.path.startsWith('/api') ||
          req.path.startsWith('/assets') ||
          req.path === '/health' ||
          req.path === '/bff-status'
        ) {
          return next();
        }
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    } else {
      console.warn('Production build dist folder not found! Providing graceful fallback response.');
      app.get('/', (req, res) => {
        res.status(200).send('AlphaDesk CRM Server is operational. Building client bundle...');
      });
    }
  } else {
    // In development (AI Studio), mount Vite middleware for live development
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
      console.log('Vite development middleware mounted successfully.');
    } catch (viteErr: any) {
      console.warn('Vite development middleware could not be loaded:', viteErr?.message || viteErr);
    }
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT} (0.0.0.0)`);
    console.log(`BFF Mode: ${directusUrl ? 'Online Database Connected' : 'Offline In-Memory Mode'}`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use by another process.`);
    } else {
      console.error('Server socket error encountered:', err);
    }
  });

  // Graceful termination for Docker / Coolify stop signals
  const handleShutdown = (signal: string) => {
    console.log(`${signal} received. Closing HTTP server gracefully...`);
    server.close(() => {
      console.log('HTTP server closed successfully.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));

  return server;
}
