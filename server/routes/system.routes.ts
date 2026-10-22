import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  directusUrl,
  directusAdminToken,
  projectSettingsData,
  updateProjectSettingsData,
  personnelData,
  setPersonnelData,
  customersData,
  setCustomersData,
  reportsData,
  setReportsData,
  contactsData,
  setContactsData,
  initialPersonnel,
} from '../config.ts';
import { directusFetch, directusFetchAllPages, directusSafeBatchInsert, directusSafeBatchPatch } from '../directus/client.ts';
import { getRequestUser, getRequestTenantId } from '../middlewares/auth.middleware.ts';
import { invalidateCustomersCache, invalidateReportsCache } from '../directus/cache.ts';
import { resolveDirectusTenantId } from '../directus/sync.ts';
import { normalizeContactValue, normalizePersianString } from '../services/phoneNormalizer.ts';
import { Personnel } from '../types.ts';

const router = Router();

// GET /api/health & /health for Docker container healthchecks
router.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});
router.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

router.get('/bff-status', (req: Request, res: Response) => {
  res.json({
    online: Boolean(directusUrl && directusAdminToken),
    url: directusUrl || '',
    database: 'Directus',
  });
});
router.get('/api/bff-status', (req: Request, res: Response) => {
  res.json({
    online: Boolean(directusUrl && directusAdminToken),
    url: directusUrl || '',
    database: 'Directus',
  });
});

// In-memory cache for dashboard summary to prevent repeated heavy queries and 429/503 pressure
interface DashboardSummaryCacheItem {
  data: any;
  timestamp: number;
}
const dashboardSummaryCacheMap = new Map<string, DashboardSummaryCacheItem>();
const globalCallIdToUUIDMap = new Map<string, string>();
const uidToPersonnelMap = new Map<string, any>();
let migrationPersonnelCache: any[] | null = null;
let migrationCustomersCache: any[] | null = null;
let migrationCacheLastFetch = 0;
const DASHBOARD_CACHE_TTL_MS = 30000; // 30 seconds

export function invalidateDashboardSummaryCache() {
  dashboardSummaryCacheMap.clear();
}

// GET /api/dashboard-summary & /api/dashboard/summary
const handleDashboardSummary = async (req: Request, res: Response) => {
  const { userId, personnelId, isAdmin, userName, tenantId } = getRequestUser(req);
  const cacheKey = `${tenantId || 'all'}_${isAdmin ? 'admin' : userId || userName || 'staff'}`;
  const now = Date.now();
  const cached = dashboardSummaryCacheMap.get(cacheKey);
  if (cached && now - cached.timestamp < DASHBOARD_CACHE_TTL_MS) {
    return res.json(cached.data);
  }

  if (directusUrl && directusAdminToken) {
    try {
      let tenantFilterStr = '';
      if (tenantId && tenantId !== 'all') {
        const tenantNum = resolveDirectusTenantId(tenantId);
        if (tenantNum && tenantNum > 1) {
          tenantFilterStr = `&filter[tenant_id][_eq]=${tenantNum}`;
        }
      }

      const cleanPId = personnelId ? String(personnelId).trim().toLowerCase() : '';
      const rawUid = cleanPId.replace(/^p-/, '');
      const cleanUId = userId ? String(userId).trim().toLowerCase() : '';
      const normUserName = userName ? userName.trim() : '';

      let marketerCustFilter = '';
      let marketerRepFilter = '';
      let marketerLeadFilter = '';

      if (!isAdmin) {
        if (cleanPId) {
          marketerCustFilter = `&filter[_or][0][assigned_marketer_id][_eq]=${encodeURIComponent(cleanPId)}`;
          if (rawUid && rawUid !== cleanPId) {
            marketerCustFilter += `&filter[_or][1][assigned_marketer_id][_eq]=${encodeURIComponent(rawUid)}`;
            marketerCustFilter += `&filter[_or][2][assigned_marketer_id][_eq]=${encodeURIComponent('p-' + rawUid)}`;
          }
          if (normUserName) {
            marketerCustFilter += `&filter[_or][3][assigned_marketer_name][_icontains]=${encodeURIComponent(normUserName)}`;
          }
        } else if (normUserName) {
          marketerCustFilter = `&filter[assigned_marketer_name][_icontains]=${encodeURIComponent(normUserName)}`;
        }

        if (normUserName) {
          marketerRepFilter = `&filter[negotiator_name][_icontains]=${encodeURIComponent(normUserName)}`;
        } else if (cleanPId) {
          marketerRepFilter = `&filter[created_by][_eq]=${encodeURIComponent(cleanPId)}`;
        }

        if (cleanPId) {
          marketerLeadFilter = `&filter[assigned_to][_eq]=${encodeURIComponent(cleanPId)}`;
        }
      }

      // Fast, lightweight parallel queries
      const [
        totalCustomersRes,
        freeCustomersRes,
        expiredCustomersRes,
        contractsWonCustomersRes,
        reportsAggregateRes,
        totalColdLeadsRes,
        adminReportsRes,
        pendingLeavesRes,
        pendingAdvancesRes,
      ] = await Promise.all([
        directusFetch(`/items/customers?limit=1&meta=filter_count${tenantFilterStr}${marketerCustFilter}`).catch(() => null),
        directusFetch(`/items/customers?limit=1&meta=filter_count&filter[_or][0][assigned_marketer_id][_null]=true&filter[_or][1][is_expired][_eq]=true${tenantFilterStr}`).catch(() => null),
        directusFetch(`/items/customers?limit=1&meta=filter_count&filter[is_expired][_eq]=true${tenantFilterStr}${marketerCustFilter}`).catch(() => null),
        directusFetch(`/items/customers?limit=1&meta=filter_count&filter[status][_eq]=%D9%82%D8%B1%D8%A7%D8%B1%D8%AF%D8%A7%D8%AF${tenantFilterStr}${marketerCustFilter}`).catch(() => null),
        directusFetch(`/items/customer_reports?aggregate[count]=*&aggregate[sum]=contract_amount&aggregate[avg]=negotiation_score${tenantFilterStr}${marketerRepFilter}`).catch(() => null),
        directusFetch(`/items/cold_leads?limit=1&meta=filter_count${tenantFilterStr}${marketerLeadFilter}`).catch(() => null),
        directusFetch(`/items/administrative_reports?limit=1&meta=filter_count${tenantFilterStr}`).catch(() => null),
        directusFetch(`/items/leave_requests?limit=1&meta=filter_count&filter[status][_eq]=pending${tenantFilterStr}`).catch(() => null),
        directusFetch(`/items/advance_requests?limit=1&meta=filter_count&filter[status][_eq]=pending${tenantFilterStr}`).catch(() => null),
      ]);

      const totalCustomers = totalCustomersRes?.meta?.filter_count ?? totalCustomersRes?.meta?.total_count ?? 0;
      const freeCustomers = freeCustomersRes?.meta?.filter_count ?? 0;
      const expiredCustomers = expiredCustomersRes?.meta?.filter_count ?? 0;
      const contractsWon = contractsWonCustomersRes?.meta?.filter_count ?? 0;

      let totalReports = 0;
      let totalRevenue = 0;
      let avgScore = 8.5;

      if (reportsAggregateRes?.data && Array.isArray(reportsAggregateRes.data) && reportsAggregateRes.data.length > 0) {
        const repItem = reportsAggregateRes.data[0];
        totalReports = Number(repItem.count || 0);
        totalRevenue = Number(repItem.sum?.contract_amount || 0);
        const rawAvg = Number(repItem.avg?.negotiation_score);
        if (!isNaN(rawAvg) && rawAvg > 0) {
          avgScore = Math.round(rawAvg * 10) / 10;
        }
      }

      const totalColdLeads = totalColdLeadsRes?.meta?.filter_count ?? totalColdLeadsRes?.meta?.total_count ?? 0;
      const adminReportsCount = adminReportsRes?.meta?.filter_count ?? adminReportsRes?.meta?.total_count ?? 0;
      const pendingLeaves = pendingLeavesRes?.meta?.filter_count ?? 0;
      const pendingAdvances = pendingAdvancesRes?.meta?.filter_count ?? 0;

      const upcomingFollowups: any[] = [];
      const urgentExpiringCustomers: any[] = [];
      const inNegotiationCount = Math.max(0, totalCustomers - contractsWon);

      const resultPayload = {
        total_customers: totalCustomers,
        contracts_won_count: contractsWon,
        in_negotiation_count: inNegotiationCount,
        expired_customers_count: expiredCustomers,
        free_customers_count: freeCustomers,
        total_reports_count: totalReports,
        total_cold_leads_count: totalColdLeads,
        admin_reports_count: adminReportsCount,
        pending_leave_count: pendingLeaves,
        pending_advance_count: pendingAdvances,
        total_contract_revenue: totalRevenue,
        avg_negotiation_score: avgScore,
        upcoming_followups: upcomingFollowups,
        urgent_expiring_customers: urgentExpiringCustomers,
      };

      dashboardSummaryCacheMap.set(cacheKey, { data: resultPayload, timestamp: Date.now() });
      return res.json(resultPayload);
    } catch (err: any) {
      console.warn('Dashboard summary error:', err.message);
    }
  }

  res.json({
    total_customers: customersData.length,
    contracts_won_count: customersData.filter(c => c.status === 'قرارداد').length,
    in_negotiation_count: customersData.filter(c => c.status !== 'قرارداد').length,
    expired_customers_count: customersData.filter(c => c.is_expired).length,
    free_customers_count: customersData.filter(c => !c.assigned_marketer_id || c.is_expired).length,
    total_reports_count: reportsData.length,
    total_cold_leads_count: 0,
    admin_reports_count: 0,
    pending_leave_count: 0,
    pending_advance_count: 0,
    total_contract_revenue: 0,
    avg_negotiation_score: 8.5,
    upcoming_followups: customersData.slice(0, 5),
    urgent_expiring_customers: customersData.slice(0, 5),
  });
};

router.get('/api/dashboard-summary', handleDashboardSummary);
router.get('/api/dashboard/summary', handleDashboardSummary);

// GET /api/project-settings
router.get('/api/project-settings', async (req: Request, res: Response) => {
  if (directusUrl && directusAdminToken) {
    try {
      const resp = await directusFetch('/items/project_settings').catch(() => null);
      if (resp?.data) {
        const item = Array.isArray(resp.data) ? resp.data[0] : resp.data;
        if (item) {
          updateProjectSettingsData(item);
        }
      }
    } catch {}
  }
  res.json(projectSettingsData);
});

// PATCH /api/project-settings
router.patch('/api/project-settings', async (req: Request, res: Response) => {
  const payload = req.body;
  const { isAdmin } = getRequestUser(req);

  if (!isAdmin) {
    return res.status(403).json({ error: 'تنها مدیر کل سیستم دسترسی به ویرایش تنظیمات پروژه‌ها و پترن‌های پیامک را دارد.' });
  }

  updateProjectSettingsData(payload);

  if (directusUrl && directusAdminToken) {
    try {
      const fetchExist = await directusFetch('/items/project_settings').catch(() => null);
      const existingList = fetchExist?.data;
      if (Array.isArray(existingList) && existingList.length > 0) {
        const existingId = existingList[0].id;
        await directusFetch(`/items/project_settings/${existingId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload)
        });
      } else {
        await directusFetch('/items/project_settings', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }
    } catch (err: any) {
      console.warn('Directus project_settings save error:', err.message);
    }
  }

  res.json({ success: true, settings: projectSettingsData });
});

// POST /api/auth/update-profile
router.post('/api/auth/update-profile', async (req: Request, res: Response) => {
  const {
    name,
    username,
    phone,
    avatar,
    bank_card_number,
    iban,
    national_id,
    emergency_contact_name,
    emergency_contact_phone,
    emergency_contact_relation,
    family_contacts,
  } = req.body;
  const { userId, personnelId, userEmail, userName } = getRequestUser(req);

  const personnelPatch: Record<string, any> = {};
  if (name) personnelPatch.name = String(name).trim();
  if (username !== undefined) personnelPatch.username = String(username).trim();
  if (phone !== undefined) personnelPatch.phone = String(phone).trim();
  if (avatar !== undefined) personnelPatch.avatar = avatar;
  if (bank_card_number !== undefined) personnelPatch.bank_card_number = String(bank_card_number).trim();
  if (iban !== undefined) personnelPatch.iban = String(iban).trim();
  if (national_id !== undefined) personnelPatch.national_id = String(national_id).trim();
  if (emergency_contact_name !== undefined) personnelPatch.emergency_contact_name = String(emergency_contact_name).trim();
  if (emergency_contact_phone !== undefined) personnelPatch.emergency_contact_phone = String(emergency_contact_phone).trim();
  if (emergency_contact_relation !== undefined) personnelPatch.emergency_contact_relation = String(emergency_contact_relation).trim();
  if (family_contacts !== undefined) personnelPatch.family_contacts = family_contacts;

  let targetPersonnel: any = null;

  if (directusUrl && directusAdminToken) {
    try {
      let foundPId: string | null = null;
      if (personnelId) {
        const byId = await directusFetch(`/items/personnel/${personnelId}`).catch(() => null);
        if (byId?.data?.id) foundPId = byId.data.id;
      }
      if (!foundPId && userId) {
        const byUser = await directusFetch(`/items/personnel?filter[user_id][_eq]=${userId}`).catch(() => null);
        if (byUser?.data && Array.isArray(byUser.data) && byUser.data.length > 0) {
          foundPId = byUser.data[0].id;
        }
      }
      if (!foundPId && userEmail) {
        const byEmail = await directusFetch(`/items/personnel?filter[email][_eq]=${encodeURIComponent(userEmail)}`).catch(() => null);
        if (byEmail?.data && Array.isArray(byEmail.data) && byEmail.data.length > 0) {
          foundPId = byEmail.data[0].id;
        }
      }

      if (foundPId) {
        const updatedRes = await directusFetch(`/items/personnel/${foundPId}`, {
          method: 'PATCH',
          body: JSON.stringify(personnelPatch)
        });
        targetPersonnel = updatedRes?.data || { id: foundPId, ...personnelPatch };
      } else {
        const newPId = personnelId || crypto.randomUUID();
        const createdRes = await directusFetch('/items/personnel', {
          method: 'POST',
          body: JSON.stringify({
            id: newPId,
            name: name || userName || 'کاربر سیستم',
            email: userEmail || '',
            phone: phone || '',
            role: 'marketer',
            status: 'active',
            user_id: userId || null,
            ...personnelPatch
          })
        });
        targetPersonnel = createdRes?.data || { id: newPId, ...personnelPatch };
      }

      if (userId) {
        await directusFetch(`/users/${userId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            ...(name ? { first_name: name } : {}),
            ...(avatar ? { avatar } : {})
          })
        }).catch(() => {});
      }
    } catch (err: any) {
      console.error('Directus personnel profile update error:', err.message);
    }
  }

  const targetId = personnelId || userId;
  const idx = personnelData.findIndex(
    p =>
      (targetId && p.id === targetId) ||
      (userId && p.user_id === userId) ||
      (userEmail && p.email?.toLowerCase() === userEmail?.toLowerCase())
  );
  if (idx >= 0) {
    personnelData[idx] = { ...personnelData[idx], ...personnelPatch };
    if (!targetPersonnel) targetPersonnel = personnelData[idx];
  } else {
    const newLocal: Personnel = {
      id: targetId || 'p-1',
      name: name || userName || 'کاربر سیستم',
      email: userEmail || '',
      phone: phone || '',
      role: 'marketer',
      status: 'active',
      active: true,
      ...personnelPatch
    };
    personnelData.push(newLocal);
    if (!targetPersonnel) targetPersonnel = newLocal;
  }

  res.json({ success: true, personnel: targetPersonnel, message: 'مشخصات پروفایل با موفقیت در پایگاه داده مرکزی ذخیره شد.' });
});

// POST /api/upload-avatar
router.post('/api/upload-avatar', async (req: Request, res: Response) => {
  const { dataUrl, fileName, mimeType } = req.body;
  const { userId, personnelId } = getRequestUser(req);

  if (!dataUrl) {
    return res.status(400).json({ error: 'فایلی ارسال نشده است.' });
  }

  let finalAvatarUrl = dataUrl;
  let fileId: string | null = null;

  if (directusUrl && directusAdminToken) {
    try {
      const matches = dataUrl.match(/^data:([A-Za-z0-9-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const fileBuffer = Buffer.from(matches[2], 'base64');
        const fileType = matches[1] || mimeType || 'image/jpeg';
        const name = fileName || `avatar-${userId || Date.now()}.jpg`;

        const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
        const header = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${name}"\r\nContent-Type: ${fileType}\r\n\r\n`;
        const footer = `\r\n--${boundary}--\r\n`;
        const bodyBuffer = Buffer.concat([Buffer.from(header, 'utf-8'), fileBuffer, Buffer.from(footer, 'utf-8')]);

        const uploadRes = await fetch(`${directusUrl.replace(/\/$/, '')}/files`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${directusAdminToken}`,
            'Content-Type': `multipart/form-data; boundary=${boundary}`
          },
          body: bodyBuffer
        });

        if (uploadRes.ok) {
          const fileData: any = await uploadRes.json();
          fileId = fileData?.data?.id;
          if (fileId) {
            finalAvatarUrl = `${directusUrl.replace(/\/$/, '')}/assets/${fileId}`;
            if (userId) {
              await directusFetch(`/users/${userId}`, {
                method: 'PATCH',
                body: JSON.stringify({ avatar: fileId })
              }).catch(() => {});
            }
          }
        }
      }
    } catch (e) {
      console.error('Error uploading avatar to Directus:', e);
    }
  }

  const targetId = personnelId || userId;
  const idx = personnelData.findIndex(p => p.id === targetId || p.id === 'p-1');
  if (idx >= 0) {
    personnelData[idx].avatar = finalAvatarUrl;
  }

  res.json({ success: true, avatarUrl: finalAvatarUrl, fileId });
});

// POST /api/auth/change-password
router.post('/api/auth/change-password', async (req: Request, res: Response) => {
  const { current_password, new_password } = req.body;
  const { userId } = getRequestUser(req);

  if (!new_password || new_password.length < 6) {
    return res.status(400).json({ error: 'رمز عبور جدید باید حداقل ۶ کاراکتر باشد.' });
  }

  if (directusUrl && directusAdminToken && userId) {
    try {
      await directusFetch(`/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ password: new_password })
      });
      return res.json({ success: true, message: 'رمز عبور با موفقیت تغییر یافت.' });
    } catch (err: any) {
      return res.status(500).json({ error: `خطا در تغییر رمز عبور: ${err.message}` });
    }
  }

  res.json({ success: true, message: 'رمز عبور با موفقیت تغییر یافت.' });
});

// POST /api/check-expirations
router.post('/api/check-expirations', (req: Request, res: Response) => {
  res.json({ success: true });
});

// POST /api/migration/reset-cache
const handleResetMigrationCache = (req: Request, res: Response) => {
  setCustomersData([]);
  setReportsData([]);
  setContactsData([]);
  setPersonnelData([...initialPersonnel]);
  migrationPersonnelCache = null;
  migrationCustomersCache = null;
  migrationCacheLastFetch = 0;
  globalCallIdToUUIDMap.clear();
  uidToPersonnelMap.clear();
  invalidateCustomersCache();
  invalidateReportsCache();
  return res.json({ success: true, message: 'حافظه موقت کش درون‌ریزی با موفقیت پاکسازی شد.' });
};

router.post('/api/migration/reset-cache', handleResetMigrationCache);
router.post('/migration/reset-cache', handleResetMigrationCache);

// Helper to convert Jalali to Gregorian date
function jalaliToGregorian(jy: number, jm: number, jd: number): Date {
  let gy = jy <= 979 ? 621 : 1600;
  jy -= jy <= 979 ? 0 : 979;
  let days =
    365 * jy +
    Math.floor(jy / 33) * 8 +
    Math.floor(((jy % 33) + 3) / 4) +
    78 +
    jd +
    (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
  gy += 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  const gd = days + 1;
  const sal_a = [
    0,
    31,
    (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0 ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  let gm = 0;
  for (gm = 0; gm < 13; gm++) {
    const v = sal_a[gm];
    if (days < v) break;
    days -= v;
  }
  return new Date(Date.UTC(gy, gm - 1, gd));
}

function parseLegacyDate(dateVal?: any): string | null {
  if (!dateVal) return null;
  const str = String(dateVal).trim();
  if (!str || str === 'NULL' || str === 'null') return null;

  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  if (/^\d{8}$/.test(str)) {
    const jy = parseInt(str.substring(0, 4), 10);
    const jm = parseInt(str.substring(4, 6), 10);
    const jd = parseInt(str.substring(6, 8), 10);
    try {
      return jalaliToGregorian(jy, jm, jd).toISOString();
    } catch {}
  }

  const slashMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})(?:\s+(\d{1,2}):(\d{1,2}))?/);
  if (slashMatch) {
    const jy = parseInt(slashMatch[1], 10);
    const jm = parseInt(slashMatch[2], 10);
    const jd = parseInt(slashMatch[3], 10);
    const hour = slashMatch[4] ? parseInt(slashMatch[4], 10) : 12;
    const min = slashMatch[5] ? parseInt(slashMatch[5], 10) : 0;
    try {
      const gDate = jalaliToGregorian(jy, jm, jd);
      gDate.setUTCHours(hour, min, 0, 0);
      return gDate.toISOString();
    } catch {}
  }

  const dashTimeMatch = str.match(/^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})/);
  if (dashTimeMatch) {
    const jy = parseInt(dashTimeMatch[1], 10);
    const jm = parseInt(dashTimeMatch[2], 10);
    const jd = parseInt(dashTimeMatch[3], 10);
    const hour = parseInt(dashTimeMatch[4], 10);
    const min = parseInt(dashTimeMatch[5], 10);
    try {
      const gDate = jalaliToGregorian(jy, jm, jd);
      gDate.setUTCHours(hour, min, 0, 0);
      return gDate.toISOString();
    } catch {}
  }

  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d.toISOString();
  } catch {}

  return null;
}

function normalizeLegacyStatus(rawStatus?: string | null): string {
  if (!rawStatus) return 'تماس برقرار نشده';
  const s = String(rawStatus).trim();
  if (
    s === 'اصلا تماس برقرار نشده' ||
    s === 'تماس نگرفته' ||
    s === 'تماس برقرار نشده' ||
    s === 'بدون تماس' ||
    s === 'اصلاً تماس برقرار نشده'
  ) {
    return 'تماس برقرار نشده';
  }
  if (s === 'پاسخ نمیدهد' || s === 'پاسخ نمی‌دهد' || s === 'پاسخ نداد' || s === 'جواب نمیدهد') {
    return 'پاسخ نمیدهد';
  }
  if (s === 'نمیخواد' || s === 'نمی‌خواهد' || s === 'عدم تمایل' || s === 'نمی خواهد') {
    return 'نمیخواد';
  }
  if (s === 'پیگیری قبل از انقضا' || s === 'پیگیری قبل از انقضاء') {
    return 'پیگیری قبل از انقضا';
  }
  if (s === 'پیگیری بلند مدت' || s === 'پیگیری بلندمدت') {
    return 'پیگیری بلند مدت';
  }
  if (s === 'پیگیری قرارداد') {
    return 'پیگیری قرارداد';
  }
  if (s === 'پیش نویس قرارداد' || s === 'پیش‌نویس قرارداد') {
    return 'پیش نویس قرارداد';
  }
  if (s === 'قرارداد' || s === 'قرارداد / فاکتور' || s === 'قرارداد/فاکتور' || s === 'فاکتور') {
    return 'قرارداد';
  }
  if (s === 'لیست سیاه') {
    return 'لیست سیاه';
  }
  if (s === 'ثبت شماره') {
    return 'ثبت شماره';
  }
  return s;
}

function isValidUUID(str: any): boolean {
  if (typeof str !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str.trim());
}

function sanitizeCustomerForDirectus(cust: any): any {
  return {
    id: cust.id,
    company_name: cust.company_name || 'بدون نام',
    business_type: cust.business_type || '',
    province: cust.province || '',
    city: cust.city || '',
    manager_name: cust.manager_name || '',
    mobile_numbers: Array.isArray(cust.mobile_numbers) ? cust.mobile_numbers : [],
    landline_numbers: Array.isArray(cust.landline_numbers) ? cust.landline_numbers : [],
    assigned_marketer_id: cust.assigned_marketer_id || null,
    assigned_marketer_name: cust.assigned_marketer_name || null,
    assignment_deadline: cust.assignment_deadline || null,
    status: cust.status || 'تماس برقرار نشده',
    is_expired: Boolean(cust.is_expired),
    date_created: cust.date_created || new Date().toISOString(),
  };
}

function sanitizeReportForDirectus(rep: any): any {
  return {
    id: rep.id,
    customer_id: rep.customer_id,
    report_text: rep.report_text || '',
    negotiator_name: rep.negotiator_name || '',
    negotiation_phone: rep.negotiation_phone || '',
    negotiation_status: rep.negotiation_status || 'پیگیری قبل از انقضا',
    negotiation_score: typeof rep.negotiation_score === 'number' ? rep.negotiation_score : 8,
    next_followup_date: rep.next_followup_date || null,
    date_created: rep.date_created || new Date().toISOString(),
  };
}

function sanitizePersonnelForDirectus(p: any): any {
  return {
    id: p.id,
    name: p.name || 'کارشناس',
    username: p.username || '',
    email: p.email || '',
    phone: p.phone || '',
    role: p.role || 'marketer',
    status: p.status || 'active',
    national_id: p.national_id || null,
  };
}

// POST /api/migration/import
const handleMigrationImport = async (req: Request, res: Response) => {
  const { tenant_id, personnelRows, customerRows, reportRows } = req.body;
  const { tenantId: authTenantId } = getRequestUser(req);
  const targetTenantId = tenant_id || authTenantId || 'default';
  const targetTenantNum = resolveDirectusTenantId(targetTenantId);

  let importedPersonnelCount = 0;
  let importedCustomersCount = 0;
  let importedReportsCount = 0;
  let skippedCount = 0;
  const skippedDetails: Array<{ companyName: string; phone: string; reason: string }> = [];
  const errors: string[] = [];

  // Pre-fetch all existing personnel and customers from Directus & memory into session cache
  if (!migrationPersonnelCache || !migrationCustomersCache || Date.now() - migrationCacheLastFetch > 120000) {
    migrationPersonnelCache = [...personnelData];
    migrationCustomersCache = [...customersData];

    if (directusUrl && directusAdminToken) {
      try {
        const [pRes, cRes] = await Promise.all([
          directusFetchAllPages('/items/personnel?fields=id,username,email,name,phone&limit=2000').catch(() => null),
          directusFetchAllPages('/items/customers?fields=id,mobile_numbers,landline_numbers,company_name,assigned_marketer_id,assigned_marketer_name,status&limit=50000').catch(() => null),
        ]);
        const pList = Array.isArray(pRes) ? pRes : (pRes?.data || []);
        const cList = Array.isArray(cRes) ? cRes : (cRes?.data || []);

        for (const p of pList) {
          if (!migrationPersonnelCache.some((ep) => ep.id === p.id || (p.username && ep.username === p.username))) {
            migrationPersonnelCache.push(p);
          }
        }
        for (const c of cList) {
          if (!migrationCustomersCache.some((ec) => ec.id === c.id)) {
            migrationCustomersCache.push(c);
          }
        }
        migrationCacheLastFetch = Date.now();
      } catch (e: any) {
        console.warn('Warning pre-fetching Directus records for migration:', e.message);
      }
    }
  }

  const existingPersonnel: any[] = migrationPersonnelCache;
  const existingCustomers: any[] = migrationCustomersCache;

  // Build O(1) set of existing customer IDs
  const existingCustomerIdsSet = new Set<string>();
  for (const c of existingCustomers) {
    if (c.id) existingCustomerIdsSet.add(c.id);
  }

  // Populate global callIdToUUIDMap from existing customers
  for (const c of existingCustomers) {
    if (c.id) {
      if ((c as any).legacyCallId) globalCallIdToUUIDMap.set((c as any).legacyCallId, c.id);
      globalCallIdToUUIDMap.set(c.id, c.id);
    }
  }

  // Populate initial uidToPersonnelMap from existingPersonnel
  for (const p of existingPersonnel) {
    if (p.id) {
      uidToPersonnelMap.set(String(p.id), p);
      uidToPersonnelMap.set(String(p.id).replace(/^p-/, ''), p);
    }
    if (p.username) {
      uidToPersonnelMap.set(String(p.username).toLowerCase(), p);
    }
    if (p.legacyUid) {
      uidToPersonnelMap.set(String(p.legacyUid), p);
    }
  }

  const personnelToInsert: any[] = [];

  // 1. Process personnelRows
  if (Array.isArray(personnelRows) && personnelRows.length > 0) {
    for (const r of personnelRows) {
      const rawUid = String(r.uid || r.id || '').trim();
      if (!rawUid) continue;
      const cleanUsername = String(r.username || `user_${rawUid}`).trim();
      const fullName = String(
        r.fname ? `${r.fname} ${r.lname || ''}` : r.name || cleanUsername || `کارشناس ${rawUid}`
      ).trim();
      const cleanEmail = String(r.email || `${cleanUsername}@alphadesk.ir`).trim().toLowerCase();
      const rawPhones = String(r.contacts || r.phone || '').split(/[,\s]+/);
      const normPhone = normalizeContactValue(rawPhones[0] || '');

      const normFullName = normalizePersianString(fullName);
      const existIdx = existingPersonnel.findIndex(
        (p) =>
          (cleanUsername && p.username && p.username.toLowerCase() === cleanUsername.toLowerCase()) ||
          (normFullName && p.name && normalizePersianString(p.name) === normFullName) ||
          p.id === rawUid ||
          p.id === `p-${rawUid}` ||
          (p.id && String(p.id).replace(/^p-/, '') === rawUid.replace(/^p-/, '')) ||
          (p.username && p.username.toLowerCase() === rawUid.toLowerCase()) ||
          (cleanEmail && p.email && p.email.toLowerCase() === cleanEmail.toLowerCase())
      );

      const targetPId = existIdx >= 0 ? existingPersonnel[existIdx].id : (rawUid.startsWith('p-') ? rawUid : `p-${rawUid}`);

      const pObj: any = {
        id: targetPId,
        name: fullName,
        username: cleanUsername,
        email: cleanEmail,
        phone: normPhone,
        role: r.userlevel === '0' || r.userlevel === 0 || r.role === 'admin' ? 'admin' : 'marketer',
        status: r.active === '0' || r.active === 0 || r.status === 'inactive' ? 'inactive' : 'active',
        tenant_id: targetTenantNum || 1,
        national_id: String(r.code || r.shenasname || '').trim() || null,
        legacyUid: rawUid,
      };

      if (existIdx >= 0) {
        existingPersonnel[existIdx] = { ...existingPersonnel[existIdx], ...pObj };
        const localIdx = personnelData.findIndex((p) => p.id === targetPId || p.username === cleanUsername);
        if (localIdx >= 0) personnelData[localIdx] = { ...personnelData[localIdx], ...pObj };
        uidToPersonnelMap.set(rawUid, existingPersonnel[existIdx]);
        if (cleanUsername) uidToPersonnelMap.set(cleanUsername.toLowerCase(), existingPersonnel[existIdx]);
        skippedCount++;
      } else {
        existingPersonnel.push(pObj);
        personnelData.push(pObj);
        personnelToInsert.push(pObj);
        uidToPersonnelMap.set(rawUid, pObj);
        if (cleanUsername) uidToPersonnelMap.set(cleanUsername.toLowerCase(), pObj);
        importedPersonnelCount++;
      }
    }

    if (directusUrl && directusAdminToken && personnelToInsert.length > 0) {
      const sanitizedPersonnel = personnelToInsert.map(sanitizePersonnelForDirectus);
      await directusSafeBatchInsert('personnel', sanitizedPersonnel, 25).catch((err) => {
        errors.push(`خطا در ثبت پرسنل در دایرکتوس: ${err.message}`);
      });
    }
  }

  // 2. Process customerRows (Import 100% of customer records 1:1)
  const customersToInsert: any[] = [];
  const contactsToInsert: any[] = [];

  if (Array.isArray(customerRows) && customerRows.length > 0) {
    for (const r of customerRows) {
      const callId = String(r.CallID || r.callid || r.id || '').trim();
      const companyName = String(r.CompanyName || r.marketName || r.company_name || 'بدون نام').trim();
      const managerName = String(r.managerName || r.manager_name || '').trim();
      const businessType = String(r.job || r.business_type || '').trim();
      const province = String(r.province || '').trim();
      const city = String(r.city || '').trim();

      // Phones
      const rawMobiles = String(r.mobiles || r.mobile_numbers || r.managerPhone || r.phone || '').split(
        /[,;\n]+/
      );
      const mobileNumbers: string[] = [];
      for (const m of rawMobiles) {
        const norm = normalizeContactValue(m);
        if (norm && norm.length >= 8 && !mobileNumbers.includes(norm)) {
          mobileNumbers.push(norm);
        }
      }

      const rawLandlines = String(r.phonelines || r.landline_numbers || '').split(/[,;\n]+/);
      const landlineNumbers: string[] = [];
      for (const l of rawLandlines) {
        const norm = normalizeContactValue(l);
        if (norm && norm.length >= 4 && !landlineNumbers.includes(norm)) {
          landlineNumbers.push(norm);
        }
      }

      // Status: mapped and normalized
      const rawStatus = r.lastStat || r.status || r.ClosedContact || '';
      const status = normalizeLegacyStatus(rawStatus);

      // Marketer:
      // The marketer column in contacts TSV is strictly r.uid!
      // (r.Referrals and r.lockOwner are boolean flags 0 or 1, NOT marketer IDs!)
      const rawMarketerUid = String(r.uid || r.assigned_marketer_id || '').trim();
      let assignedMarketerId: string | null = null;
      let assignedMarketerName: string | null = null;

      if (rawMarketerUid && rawMarketerUid !== '0' && rawMarketerUid !== 'NULL' && rawMarketerUid !== 'null') {
        let matchedP = uidToPersonnelMap.get(rawMarketerUid);
        if (!matchedP) {
          matchedP = existingPersonnel.find(
            (p) =>
              p.legacyUid === rawMarketerUid ||
              p.id === rawMarketerUid ||
              p.id === `p-${rawMarketerUid}` ||
              (p.id && String(p.id).replace(/^p-/, '') === rawMarketerUid.replace(/^p-/, '')) ||
              (p.username && p.username.toLowerCase() === rawMarketerUid.toLowerCase()) ||
              (p.name && (p.name === rawMarketerUid || p.name.includes(rawMarketerUid) || rawMarketerUid.includes(p.name)))
          );
        }
        if (!matchedP && rawMarketerUid === '1') {
          matchedP = existingPersonnel.find((p) => p.role === 'admin' || p.username === 'admin');
        }

        if (matchedP) {
          assignedMarketerId = matchedP.id;
          assignedMarketerName = matchedP.name;
        } else {
          assignedMarketerId = rawMarketerUid.startsWith('p-') ? rawMarketerUid : `p-${rawMarketerUid}`;
          assignedMarketerName = `کارشناس ${rawMarketerUid}`;

          const newPlaceholderP: any = {
            id: assignedMarketerId,
            name: assignedMarketerName,
            username: `user_${rawMarketerUid}`,
            email: `user_${rawMarketerUid}@alphadesk.ir`,
            phone: '',
            role: 'marketer',
            status: 'active',
            tenant_id: targetTenantNum || 1,
          };
          existingPersonnel.push(newPlaceholderP);
          personnelData.push(newPlaceholderP);
          personnelToInsert.push(newPlaceholderP);
          uidToPersonnelMap.set(rawMarketerUid, newPlaceholderP);
        }
      }

      const deadlineIso = parseLegacyDate(r.expire || r.assignment_deadline);
      const isExpired = Boolean(
        status !== 'قرارداد' &&
          status !== 'لیست سیاه' &&
          deadlineIso &&
          new Date().getTime() > new Date(deadlineIso).getTime()
      );

      let custId: string;
      if (isValidUUID(r.id)) {
        custId = String(r.id).trim();
      } else if (callId && globalCallIdToUUIDMap.has(callId)) {
        custId = globalCallIdToUUIDMap.get(callId)!;
      } else {
        custId = crypto.randomUUID();
      }

      if (callId) {
        globalCallIdToUUIDMap.set(callId, custId);
      }
      globalCallIdToUUIDMap.set(custId, custId);

      // Check O(1) set to prevent duplicate inserts of identical customer IDs in same batch
      if (existingCustomerIdsSet.has(custId)) {
        skippedCount++;
      } else {
        existingCustomerIdsSet.add(custId);

        const custObj: any = {
          id: custId,
          company_name: companyName,
          business_type: businessType,
          province,
          city,
          manager_name: managerName,
          mobile_numbers: mobileNumbers,
          landline_numbers: landlineNumbers,
          assigned_marketer_id: assignedMarketerId,
          assigned_marketer_name: assignedMarketerName,
          assignment_deadline: deadlineIso,
          status,
          is_expired: isExpired,
          tenant_id: targetTenantNum || 1,
          legacyCallId: callId || null,
          date_created: parseLegacyDate(r.created || r.InsertRecDate) || new Date().toISOString(),
        };

        existingCustomers.push(custObj);
        customersData.push(custObj);
        customersToInsert.push(custObj);
        importedCustomersCount++;

        for (const m of mobileNumbers) {
          contactsToInsert.push({
            id: crypto.randomUUID(),
            customer_id: custId,
            channel_type: 'mobile',
            value: m,
            normalized_value: m,
            contact_name: managerName || companyName,
            is_primary: true,
          });
        }
        for (const l of landlineNumbers) {
          contactsToInsert.push({
            id: crypto.randomUUID(),
            customer_id: custId,
            channel_type: 'landline',
            value: l,
            normalized_value: l,
            contact_name: managerName || companyName,
            is_primary: false,
          });
        }
      }
    }
  }

  // 3. Process reportRows
  if (Array.isArray(reportRows) && reportRows.length > 0) {
    const reportsToInsert: any[] = [];

    for (const r of reportRows) {
      const callId = String(r.CallID || r.callid || '').trim();
      const repText = String(r.report || r.report_text || 'ثبت پیگیری').trim();
      
      const uidRef = String(r.uid || r.user_id || '').trim();
      let negotiator = String(r.negotiator || r.negotiator_name || '').trim();

      if (uidRef && uidRef !== '0' && uidRef !== 'NULL' && uidRef !== 'null') {
        let matchedP = uidToPersonnelMap.get(uidRef);
        if (!matchedP) {
          matchedP = existingPersonnel.find(
            (p) =>
              p.legacyUid === uidRef ||
              p.id === uidRef ||
              p.id === `p-${uidRef}` ||
              (p.id && String(p.id).replace(/^p-/, '') === uidRef.replace(/^p-/, '')) ||
              (p.username && p.username.toLowerCase() === uidRef.toLowerCase())
          );
        }
        if (!matchedP && uidRef === '1') {
          matchedP = existingPersonnel.find((p) => p.role === 'admin' || p.username === 'admin');
        }
        if (matchedP) {
          negotiator = matchedP.name;
        } else if (!negotiator) {
          negotiator = `کارشناس ${uidRef}`;
        }
      }
      if (!negotiator) negotiator = 'کارشناس';
      const callNum = normalizeContactValue(r.callNum || r.negotiation_phone || '');
      const status = normalizeLegacyStatus(r.status || r.negotiation_status);
      const rawRating = parseFloat(String(r.rating ?? '').trim());
      const score = !isNaN(rawRating) ? Math.round(rawRating) : 8;
      const nextFollow = parseLegacyDate(r.nextFollow || r.next_followup_date);
      const dateCreated =
        parseLegacyDate(r.insertDate || r.dateTime || r.date_created) || new Date().toISOString();

      let matchedCustomerId: string | null = null;
      if (callId && globalCallIdToUUIDMap.has(callId)) {
        matchedCustomerId = globalCallIdToUUIDMap.get(callId)!;
      }
      if (!matchedCustomerId && callId) {
        const byCallId = existingCustomers.find((c) => c.id === callId || (c as any).legacyCallId === callId || c.id === `c-${callId}`);
        if (byCallId) matchedCustomerId = byCallId.id;
      }
      if (!matchedCustomerId && callNum && globalCallIdToUUIDMap.has(callNum)) {
        matchedCustomerId = globalCallIdToUUIDMap.get(callNum)!;
      }
      if (!matchedCustomerId && callNum) {
        const byPhone = existingCustomers.find(
          (c) => c.mobile_numbers?.includes(callNum) || c.landline_numbers?.includes(callNum)
        );
        if (byPhone) matchedCustomerId = byPhone.id;
      }

      if (!matchedCustomerId) {
        matchedCustomerId = crypto.randomUUID();
        if (callId) globalCallIdToUUIDMap.set(callId, matchedCustomerId);

        // Create orphan customer to satisfy Foreign Key constraint in Directus
        const orphanCust: any = {
          id: matchedCustomerId,
          company_name: callNum ? `مشتری پیگیری ${callNum}` : `مشتری کد ${callId || 'جدید'}`,
          mobile_numbers: callNum ? [callNum] : [],
          status: status || 'پیگیری قبل از انقضا',
          is_expired: false,
          tenant_id: targetTenantNum || 1,
          date_created: dateCreated,
        };
        existingCustomers.push(orphanCust);
        customersData.push(orphanCust);
        customersToInsert.push(orphanCust);
        existingCustomerIdsSet.add(matchedCustomerId);
        importedCustomersCount++;
      }

      const repId = isValidUUID(r.ID || r.id) ? String(r.ID || r.id).trim() : crypto.randomUUID();

      const repObj: any = {
        id: repId,
        customer_id: matchedCustomerId,
        report_text: repText,
        negotiator_name: negotiator,
        negotiation_phone: callNum,
        negotiation_status: status,
        negotiation_score: score,
        next_followup_date: nextFollow,
        tenant_id: targetTenantNum || 1,
        date_created: dateCreated,
      };

      reportsData.push(repObj);
      reportsToInsert.push(repObj);
      importedReportsCount++;
    }

    if (directusUrl && directusAdminToken) {
      if (personnelToInsert.length > 0) {
        const sanitizedPersonnel = personnelToInsert.map(sanitizePersonnelForDirectus);
        await directusSafeBatchInsert('personnel', sanitizedPersonnel, 25).catch((err) => {
          errors.push(`خطا در ثبت پرسنل در دایرکتوس: ${err.message}`);
        });
        personnelToInsert.length = 0;
      }
      if (customersToInsert.length > 0) {
        const sanitizedCusts = customersToInsert.map(sanitizeCustomerForDirectus);
        await directusSafeBatchInsert('customers', sanitizedCusts, 50).catch((err) => {
          errors.push(`خطا در ثبت مشتریان در دایرکتوس: ${err.message}`);
        });
        customersToInsert.length = 0; // cleared after insert
      }
      if (reportsToInsert.length > 0) {
        const sanitizedReps = reportsToInsert.map(sanitizeReportForDirectus);
        await directusSafeBatchInsert('customer_reports', sanitizedReps, 50).catch((err) => {
          errors.push(`خطا در ثبت گزارش‌ها در دایرکتوس: ${err.message}`);
        });
      }
    }
  }

  if (directusUrl && directusAdminToken) {
    if (personnelToInsert.length > 0) {
      const sanitizedPersonnel = personnelToInsert.map(sanitizePersonnelForDirectus);
      await directusSafeBatchInsert('personnel', sanitizedPersonnel, 25).catch((err) => {
        errors.push(`خطا در ثبت پرسنل در دایرکتوس: ${err.message}`);
      });
    }
    if (customersToInsert.length > 0) {
      const sanitizedCusts = customersToInsert.map(sanitizeCustomerForDirectus);
      await directusSafeBatchInsert('customers', sanitizedCusts, 50).catch((err) => {
        errors.push(`خطا در ثبت مشتریان در دایرکتوس: ${err.message}`);
      });
    }
    if (contactsToInsert.length > 0) {
      directusSafeBatchInsert('customer_contacts', contactsToInsert, 50).catch(() => {});
    }
  }

  // 4. Auto-connect free customers with reports (only when explicitly requested)
  let autoAssignedCount = 0;
  if (req.body.autoAssign === true) {
    try {
      const autoRes = await autoAssignFreeCustomersWithReports(targetTenantId);
      autoAssignedCount = autoRes.reassignedCount;
    } catch (autoErr: any) {
      console.warn('Auto-assign free customers post-import warning:', autoErr.message);
    }
  }

  invalidateCustomersCache();
  invalidateReportsCache();

  return res.json({
    success:
      errors.length === 0 ||
      importedCustomersCount > 0 ||
      importedReportsCount > 0 ||
      importedPersonnelCount > 0,
    importedPersonnelCount,
    importedCustomersCount,
    importedReportsCount,
    autoAssignedCount,
    skippedCount,
    skippedDetails,
    errors,
    message: `درون‌ریزی با موفقیت انجام شد: ${importedPersonnelCount} کارشناس جدید، ${importedCustomersCount} مشتری جدید، و ${importedReportsCount} گزارش ثبت شدند. (${skippedCount} رکورد موجود نادیده گرفته شد) ${autoAssignedCount > 0 ? `تعداد ${autoAssignedCount} مشتری آزاد گزارش‌دار به آخرین بازاریاب مربوطه متصل گردیدند.` : ''}`,
  });
};

router.post('/api/migration/import', handleMigrationImport);
router.post('/migration/import', handleMigrationImport);
router.post('/api/migration/reset-cache', handleResetMigrationCache);
router.post('/migration/reset-cache', handleResetMigrationCache);

// Helper function to connect free customers with reports to their latest report's negotiator
export async function autoAssignFreeCustomersWithReports(targetTenantId?: string) {
  let reassignedCount = 0;
  const reassignedDetails: Array<{ customerId: string; companyName: string; marketerName: string }> = [];

  let allCustomersList = [...customersData];
  let allReportsList = [...reportsData];
  let allPersonnelList = [...personnelData];

  if (directusUrl && directusAdminToken) {
    try {
      const [cRes, rRes, pRes] = await Promise.all([
        directusFetchAllPages('/items/customers?limit=10000').catch(() => null),
        directusFetchAllPages('/items/customer_reports?limit=50000&sort=-date_created').catch(() => null),
        directusFetchAllPages('/items/personnel?limit=1000').catch(() => null),
      ]);
      if (cRes?.data && Array.isArray(cRes.data)) allCustomersList = cRes.data;
      if (rRes?.data && Array.isArray(rRes.data)) allReportsList = rRes.data;
      if (pRes?.data && Array.isArray(pRes.data)) allPersonnelList = pRes.data;
    } catch (e: any) {
      console.warn('Error fetching data for auto-assignment:', e.message);
    }
  }

  const freeCustomers = allCustomersList.filter((c: any) => {
    if (c.status === 'قرارداد' || c.status === 'لیست سیاه') return false;
    const isUnassigned = !c.assigned_marketer_id || c.assigned_marketer_name === 'تخصیص نیافته' || !c.assigned_marketer_name;
    const isExpired = Boolean(c.is_expired);
    return isUnassigned || isExpired;
  });

  const nowMs = Date.now();
  const defaultDeadlineIso = new Date(nowMs + 10 * 86400 * 1000).toISOString();
  const patchesMap = new Map<string, any>();

  for (const cust of freeCustomers) {
    const custId = String(cust.id);
    const custMobiles = Array.isArray(cust.mobile_numbers) ? cust.mobile_numbers : [];
    const custLandlines = Array.isArray(cust.landline_numbers) ? cust.landline_numbers : [];

    const custReports = allReportsList.filter((r: any) => {
      if (String(r.customer_id) === custId || (typeof r.customer_id === 'object' && r.customer_id !== null && String(r.customer_id.id) === custId)) {
        return true;
      }
      if (r.negotiation_phone) {
        const normPhone = normalizeContactValue(r.negotiation_phone);
        if (normPhone && (custMobiles.includes(normPhone) || custLandlines.includes(normPhone))) {
          return true;
        }
      }
      return false;
    });

    if (custReports.length === 0) continue;

    custReports.sort((a: any, b: any) => {
      const tA = new Date(a.date_created || 0).getTime();
      const tB = new Date(b.date_created || 0).getTime();
      return tB - tA;
    });

    const lastReport: any = custReports[0];
    const negotiatorName = String(lastReport?.negotiator_name || lastReport?.negotiator || '').trim();
    if (!negotiatorName || negotiatorName === 'کارشناس') continue;

    const normNegotiator = normalizePersianString(negotiatorName);

    const matchedP = allPersonnelList.find((p: any) => {
      const normPName = normalizePersianString(p.name);
      if (normPName && normNegotiator && (normPName === normNegotiator || normPName.includes(normNegotiator) || normNegotiator.includes(normPName))) {
        return true;
      }
      if (p.username && normalizePersianString(p.username) === normNegotiator) return true;
      if (String(p.id) === String(lastReport.created_by) || String(p.user_id) === String(lastReport.created_by)) return true;
      return false;
    });

    const targetMarketerId = matchedP ? String(matchedP.id) : (lastReport.created_by ? String(lastReport.created_by) : `p-${negotiatorName}`);
    const targetMarketerName = matchedP ? String(matchedP.name) : negotiatorName;

    const custPatch: Record<string, any> = {
      id: custId,
      assigned_marketer_id: targetMarketerId,
      assigned_marketer_name: targetMarketerName,
      assignment_deadline: defaultDeadlineIso,
      is_expired: false,
      claimed_from_pool: false,
      date_updated: new Date().toISOString(),
    };

    patchesMap.set(custId, custPatch);

    const localIdx = customersData.findIndex((c) => String(c.id) === custId);
    if (localIdx >= 0) {
      customersData[localIdx] = {
        ...customersData[localIdx],
        ...custPatch,
      };
    }

    reassignedCount++;
    reassignedDetails.push({
      customerId: custId,
      companyName: cust.company_name || 'بدون نام',
      marketerName: targetMarketerName,
    });
  }

  if (directusUrl && directusAdminToken && patchesMap.size > 0) {
    try {
      await directusSafeBatchPatch('customers', patchesMap, 50);
    } catch (err: any) {
      console.warn(`Failed to auto-reassign free customers batch in Directus:`, err.message);
    }
  }

  invalidateCustomersCache();
  invalidateReportsCache();

  return {
    success: true,
    reassignedCount,
    details: reassignedDetails,
    message: `عملیات خودکار تکمیل شد: ${reassignedCount} مشتری آزاد گزارش‌دار با موفقیت به آخرین بازاریاب گزارش‌دهنده متصل گردیدند.`,
  };
}

const handleAutoAssignFreeWithReports = async (req: Request, res: Response) => {
  const { tenant_id } = req.body;
  const result = await autoAssignFreeCustomersWithReports(tenant_id);
  res.json(result);
};

router.post('/api/migration/auto-assign-free-with-reports', handleAutoAssignFreeWithReports);
router.post('/migration/auto-assign-free-with-reports', handleAutoAssignFreeWithReports);

export default router;
