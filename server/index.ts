import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  PORT,
  directusUrl,
  directusAdminToken,
  updateProjectSettingsData,
} from './config';
import { directusFetch } from './directus/client';
import { ensureDirectusTenants, ensureDirectusPersonnel } from './directus/sync';
import { rateLimiter } from './middlewares/rateLimit.middleware';

import authRoutes from './routes/auth.routes';
import personnelRoutes from './routes/personnel.routes';
import customerRoutes from './routes/customers.routes';
import reportRoutes from './routes/reports.routes';
import coldLeadRoutes from './routes/coldLeads.routes';
import leaveRequestRoutes from './routes/leaveRequests.routes';
import advanceRequestRoutes from './routes/advanceRequests.routes';
import tenantRoutes from './routes/tenants.routes';
import adminReportRoutes from './routes/adminReports.routes';
import systemRoutes from './routes/system.routes';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use(rateLimiter);

// Mount all modular API routers
app.use(authRoutes);
app.use('/api/personnel', personnelRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/customer-reports', reportRoutes);
app.use('/api/tenants', tenantRoutes);
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
      .catch((err) => console.warn('Database initialization warning:', err.message));
  }

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, '../dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        if (req.path.startsWith('/api')) {
          return res.status(404).json({ error: 'API endpoint not found' });
        }
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    } else {
      console.warn('Production build dist folder not found! Run npm run build first.');
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
    console.log(`BFF Mode: ${directusUrl ? 'Online Database Connected' : 'Offline Mode'}`);
  });
}
