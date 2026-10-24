import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import {
  directusUrl,
  directusAdminToken,
} from '../config.ts';
import { directusFetch, directusFetchAllPages } from '../directus/client.ts';
import { getRequestUser, matchesTenant } from '../middlewares/auth.middleware.ts';
import { resolvePersonnelId, resolveDirectusTenantId } from '../directus/sync.ts';
import { AdministrativeReport } from '../types.ts';

const router = Router();

function formatHourlyLogsForDb(hourlyLogs: any): any {
  if (!hourlyLogs) return null;
  if (Array.isArray(hourlyLogs)) {
    return hourlyLogs.length > 0 ? hourlyLogs : null;
  }
  if (typeof hourlyLogs === 'object' && hourlyLogs !== null) {
    return hourlyLogs;
  }
  if (typeof hourlyLogs === 'string') {
    const trimmed = hourlyLogs.trim();
    if (!trimmed) return null;
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.length > 0 ? parsed : null;
      if (typeof parsed === 'object' && parsed !== null) return parsed;
      return null;
    } catch {
      return null;
    }
  }
  return null;
}

function normalizeReport(r: any) {
  let hourly = r.hourly_logs;
  if (typeof hourly === 'string' && (hourly.startsWith('[') || hourly.startsWith('{'))) {
    try {
      hourly = JSON.parse(hourly);
    } catch {}
  }
  if (!hourly && r.tasks_summary && r.tasks_summary.includes('ساعت')) {
    const lines = r.tasks_summary.split('\n');
    const parsed: any[] = [];
    lines.forEach((line: string) => {
      const match = line.match(/(?:•\s*)?(ساعت\s*[\d\u06F0-\u06F9]+\s*(?:الی|تا)\s*[\d\u06F0-\u06F9]+)\s*[:：]\s*(.*)/i);
      if (match) {
        parsed.push({ slot: match[1].trim(), activity: match[2].trim() });
      }
    });
    if (parsed.length > 0) {
      hourly = parsed;
    }
  }
  return {
    ...r,
    hourly_logs: Array.isArray(hourly) ? hourly : null
  };
}

// GET /api/administrative-reports and alias /api/admin-reports
const getHandler = async (req: Request, res: Response) => {
  const reqUser = getRequestUser(req);
  const { userId, personnelId, isAdmin, userName, tenantId, reportViewScope, visibleReportPersonnelIds } = reqUser;

  if (directusUrl && directusAdminToken) {
    try {
      const result = await directusFetchAllPages('/items/administrative_reports?sort=-report_date');
      if (result && Array.isArray(result.data)) {
        let reports = result.data.map(normalizeReport);

        if (tenantId && tenantId !== 'all') {
          reports = reports.filter((r: any) => matchesTenant(r.tenant_id, tenantId));
        }

        if (!isAdmin) {
          const scope = reportViewScope || 'own_only';
          if (scope === 'own_only') {
            reports = reports.filter((r: any) =>
              r.personnel_id === personnelId ||
              r.personnel_id === userId ||
              (userName && r.personnel_name === userName)
            );
          } else if (scope === 'specific_personnel') {
            const allowedIds = new Set([
              personnelId,
              userId,
              ...(visibleReportPersonnelIds || []),
            ].map(String));
            reports = reports.filter((r: any) =>
              allowedIds.has(String(r.personnel_id)) || (userName && r.personnel_name === userName)
            );
          }
          // if scope === 'all', keep all tenant reports
        }
        return res.json(reports);
      }
    } catch (e: any) {
      return res.status(502).json({ error: `خطا در دریافت گزارش‌های اداری از پایگاه داده مرکزی: ${e.message}` });
    }
  }
  res.json([]);
};

router.get('/api/administrative-reports', getHandler);
router.get('/api/admin-reports', getHandler);

// POST /api/administrative-reports and alias /api/admin-reports
const postHandler = async (req: Request, res: Response) => {
  const payload = req.body;
  const { userId, personnelId, userName, tenantId } = getRequestUser(req);
  const newAdmId = crypto.randomUUID();
  const nowIso = new Date().toISOString();

  const rawPId = payload.personnel_id || personnelId || userId;
  const resolved = await resolvePersonnelId(rawPId, payload.personnel_name || userName);

  const targetTenantId = payload.tenant_id || tenantId || 'default';
  const dbHourlyLogs = formatHourlyLogsForDb(payload.hourly_logs);

  const newReport: AdministrativeReport = {
    id: newAdmId,
    tenant_id: targetTenantId,
    personnel_id: resolved.personnelId || 'p-1',
    personnel_name: resolved.personnelName || payload.personnel_name || userName || 'پرسنل شرکت',
    report_date: payload.report_date || nowIso.split('T')[0],
    calls_count: Number(payload.calls_count) || 0,
    successful_contacts: Number(payload.successful_contacts) || 0,
    leads_converted: Number(payload.leads_converted) || 0,
    tasks_summary: payload.tasks_summary || '',
    challenges: payload.challenges || '',
    tomorrow_plan: payload.tomorrow_plan || '',
    hourly_logs: dbHourlyLogs as any,
    status: payload.status === 'submitted' ? 'submitted' : 'draft',
    date_created: nowIso
  };

  if (directusUrl && directusAdminToken) {
    const directusReportPayload = {
      ...newReport,
      tenant_id: resolveDirectusTenantId(targetTenantId)
    };
    try {
      const created = await directusFetch('/items/administrative_reports', {
        method: 'POST',
        body: JSON.stringify(directusReportPayload)
      });
      return res.status(201).json(normalizeReport(created.data || newReport));
    } catch (err: any) {
      const errStr = (err.message || '').toLowerCase();
      if (errStr.includes('hourly_logs') || errStr.includes('type json') || errStr.includes('syntax for type json')) {
        try {
          const { hourly_logs, ...fallbackReport } = directusReportPayload;
          const created = await directusFetch('/items/administrative_reports', {
            method: 'POST',
            body: JSON.stringify(fallbackReport)
          });
          return res.status(201).json(normalizeReport({ ...(created.data || fallbackReport), hourly_logs: newReport.hourly_logs }));
        } catch (fbErr: any) {
          console.error('Fallback admin report create error:', fbErr.message);
        }
      }
      console.error('Admin report create error:', err.message);
      return res.status(500).json({
        error: 'ADMIN_REPORT_FAILED',
        message: `خطا در ثبت گزارش اداری در پایگاه داده مرکزی: ${err.message}`
      });
    }
  }

  res.status(201).json(newReport);
};

router.post('/api/administrative-reports', postHandler);
router.post('/api/admin-reports', postHandler);

// PATCH /api/administrative-reports/:id and alias /api/admin-reports/:id
const patchHandler = async (req: Request, res: Response) => {
  const { id } = req.params;
  const payload = req.body;
  const { isAdmin } = getRequestUser(req);

  if (directusUrl && directusAdminToken) {
    try {
      const existingRes = await directusFetch(`/items/administrative_reports/${encodeURIComponent(id)}`).catch(() => null);
      if (existingRes?.data) {
        if (existingRes.data.status === 'submitted' && !isAdmin) {
          return res.status(403).json({ error: 'این گزارش ثبت نهایی شده است و امکان ویرایش آن وجود ندارد.' });
        }
      }

      const updateData: any = {
        report_date: payload.report_date || undefined,
        calls_count: payload.calls_count !== undefined ? Number(payload.calls_count) : undefined,
        successful_contacts: payload.successful_contacts !== undefined ? Number(payload.successful_contacts) : undefined,
        leads_converted: payload.leads_converted !== undefined ? Number(payload.leads_converted) : undefined,
        tasks_summary: payload.tasks_summary !== undefined ? payload.tasks_summary : undefined,
        challenges: payload.challenges !== undefined ? payload.challenges : undefined,
        tomorrow_plan: payload.tomorrow_plan !== undefined ? payload.tomorrow_plan : undefined,
        hourly_logs: payload.hourly_logs !== undefined ? formatHourlyLogsForDb(payload.hourly_logs) : undefined,
        status: payload.status || undefined,
        date_updated: new Date().toISOString()
      };

      Object.keys(updateData).forEach(k => updateData[k] === undefined && delete updateData[k]);

      let updatedData: any;
      try {
        const updated = await directusFetch(`/items/administrative_reports/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          body: JSON.stringify(updateData)
        });
        updatedData = updated.data || { id, ...updateData };
      } catch (patchErr: any) {
        const patchErrStr = (patchErr.message || '').toLowerCase();
        if (patchErrStr.includes('hourly_logs') || patchErrStr.includes('type json') || patchErrStr.includes('syntax for type json')) {
          delete updateData.hourly_logs;
          const updatedFallback = await directusFetch(`/items/administrative_reports/${encodeURIComponent(id)}`, {
            method: 'PATCH',
            body: JSON.stringify(updateData)
          });
          updatedData = { ...(updatedFallback.data || { id, ...updateData }), hourly_logs: payload.hourly_logs };
        } else {
          throw patchErr;
        }
      }

      return res.json(normalizeReport(updatedData));
    } catch (err: any) {
      return res.status(500).json({ error: `خطا در ویرایش گزارش اداری: ${err.message}` });
    }
  }

  res.json(normalizeReport({ id, ...payload }));
};

router.patch('/api/administrative-reports/:id', patchHandler);
router.patch('/api/admin-reports/:id', patchHandler);

export default router;
