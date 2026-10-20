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
import { directusFetch, directusSafeBatchInsert, directusSafeBatchPatch } from '../directus/client.ts';
import { getRequestUser, getRequestTenantId } from '../middlewares/auth.middleware.ts';
import { invalidateCustomersCache, invalidateReportsCache } from '../directus/cache.ts';
import { resolveDirectusTenantId } from '../directus/sync.ts';
import { normalizeContactValue } from '../services/phoneNormalizer.ts';
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

// GET /api/dashboard-summary & /api/dashboard/summary
const handleDashboardSummary = async (req: Request, res: Response) => {
  const { userId, personnelId, isAdmin, userName, tenantId } = getRequestUser(req);

  if (directusUrl && directusAdminToken) {
    try {
      let tenantFilterStr = '';
      if (tenantId && tenantId !== 'all') {
        const tenantNum = resolveDirectusTenantId(tenantId);
        if (tenantNum) {
          tenantFilterStr = `&filter[tenant_id][_eq]=${tenantNum}`;
        }
      }

      const [
        totalCustomersRes,
        freeCustomersRes,
        expiredCustomersRes,
        contractsWonCustomersRes,
        totalReportsRes,
        contractsWonReportsRes,
        totalColdLeadsRes,
        adminReportsRes,
        pendingLeavesRes,
        pendingAdvancesRes,
        contractRevenueRes,
        avgScoreRes,
        upcomingFollowupsRes,
        urgentExpiringRes,
      ] = await Promise.all([
        directusFetch(`/items/customers?limit=1&meta=filter_count${tenantFilterStr}`).catch(() => null),
        directusFetch(`/items/customers?limit=1&meta=filter_count&filter[_or][0][assigned_marketer_id][_null]=true&filter[_or][1][is_expired][_eq]=true${tenantFilterStr}`).catch(() => null),
        directusFetch(`/items/customers?limit=1&meta=filter_count&filter[is_expired][_eq]=true${tenantFilterStr}`).catch(() => null),
        directusFetch(`/items/customers?limit=1&meta=filter_count&filter[status][_eq]=%D9%82%D8%B1%D8%A7%D8%B1%D8%AF%D8%A7%D8%AF${tenantFilterStr}`).catch(() => null),
        directusFetch(`/items/customer_reports?limit=1&meta=filter_count${tenantFilterStr}`).catch(() => null),
        directusFetch(`/items/customer_reports?limit=1&meta=filter_count&filter[negotiation_status][_eq]=%D9%82%D8%B1%D8%A7%D8%B1%D8%AF%D8%A7%D8%AF${tenantFilterStr}`).catch(() => null),
        directusFetch(`/items/cold_leads?limit=1&meta=filter_count${tenantFilterStr}`).catch(() => null),
        directusFetch(`/items/administrative_reports?limit=1&meta=filter_count${tenantFilterStr}`).catch(() => null),
        directusFetch(`/items/leave_requests?limit=1&meta=filter_count&filter[status][_eq]=pending${tenantFilterStr}`).catch(() => null),
        directusFetch(`/items/advance_requests?limit=1&meta=filter_count&filter[status][_eq]=pending${tenantFilterStr}`).catch(() => null),
        directusFetch(`/items/customer_reports?aggregate[sum]=contract_amount&filter[negotiation_status][_eq]=%D9%82%D8%B1%D8%A7%D8%B1%D8%AF%D8%A7%D8%AF${tenantFilterStr}`).catch(() => null),
        directusFetch(`/items/customer_reports?aggregate[avg]=negotiation_score${tenantFilterStr}`).catch(() => null),
        directusFetch(`/items/customers?limit=5&sort=next_followup_date&fields=id,company_name,manager_name,phone,next_followup_date,status,assigned_marketer_name&filter[next_followup_date][_nnull]=true${tenantFilterStr}`).catch(() => null),
        directusFetch(`/items/customers?limit=5&sort=assignment_deadline&fields=id,company_name,manager_name,phone,assignment_deadline,status,assigned_marketer_name&filter[is_expired][_eq]=false&filter[assignment_deadline][_nnull]=true${tenantFilterStr}`).catch(() => null),
      ]);

      const totalCustomers = totalCustomersRes?.meta?.filter_count ?? totalCustomersRes?.meta?.total_count ?? 0;
      const freeCustomers = freeCustomersRes?.meta?.filter_count ?? 0;
      const expiredCustomers = expiredCustomersRes?.meta?.filter_count ?? 0;
      const contractsWon = contractsWonCustomersRes?.meta?.filter_count ?? contractsWonReportsRes?.meta?.filter_count ?? 0;
      const totalReports = totalReportsRes?.meta?.filter_count ?? totalReportsRes?.meta?.total_count ?? 0;
      const totalColdLeads = totalColdLeadsRes?.meta?.filter_count ?? totalColdLeadsRes?.meta?.total_count ?? 0;
      const adminReportsCount = adminReportsRes?.meta?.filter_count ?? adminReportsRes?.meta?.total_count ?? 0;
      const pendingLeaves = pendingLeavesRes?.meta?.filter_count ?? 0;
      const pendingAdvances = pendingAdvancesRes?.meta?.filter_count ?? 0;

      let totalRevenue = 0;
      try {
        if (contractRevenueRes?.data && Array.isArray(contractRevenueRes.data) && contractRevenueRes.data.length > 0) {
          totalRevenue = Number(contractRevenueRes.data[0]?.sum?.contract_amount || 0);
        }
      } catch {}

      let avgScore = 8.5;
      try {
        if (avgScoreRes?.data && Array.isArray(avgScoreRes.data) && avgScoreRes.data.length > 0) {
          const rawAvg = Number(avgScoreRes.data[0]?.avg?.negotiation_score);
          if (!isNaN(rawAvg) && rawAvg > 0) {
            avgScore = Math.round(rawAvg * 10) / 10;
          }
        }
      } catch {}

      const upcomingFollowups = Array.isArray(upcomingFollowupsRes?.data) ? upcomingFollowupsRes.data : [];
      const urgentExpiringCustomers = Array.isArray(urgentExpiringRes?.data) ? urgentExpiringRes.data : [];

      const inNegotiationCount = Math.max(0, totalCustomers - contractsWon);

      return res.json({
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
      });
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
router.post('/api/migration/reset-cache', (req: Request, res: Response) => {
  setCustomersData([]);
  setReportsData([]);
  setContactsData([]);
  setPersonnelData([...initialPersonnel]);
  invalidateCustomersCache();
  invalidateReportsCache();
  return res.json({ success: true, message: 'حافظه موقت کش درون‌ریزی با موفقیت پاکسازی شد.' });
});

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

// POST /api/migration/import
router.post('/api/migration/import', async (req: Request, res: Response) => {
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

  // 1. Process personnelRows
  if (Array.isArray(personnelRows) && personnelRows.length > 0) {
    const personnelToInsert: any[] = [];
    for (const r of personnelRows) {
      const rawUid = String(r.uid || r.id || '').trim();
      if (!rawUid) continue;
      const pId = rawUid.startsWith('p-') ? rawUid : `p-${rawUid}`;
      const cleanUsername = String(r.username || `user_${rawUid}`).trim();
      const fullName = String(
        r.fname ? `${r.fname} ${r.lname || ''}` : r.name || cleanUsername || `کارشناس ${rawUid}`
      ).trim();
      const cleanEmail = String(r.email || `${cleanUsername}@alphadesk.ir`).trim().toLowerCase();
      const rawPhones = String(r.contacts || r.phone || '').split(/[,\s]+/);
      const normPhone = normalizeContactValue(rawPhones[0] || '');

      const pObj: any = {
        id: pId,
        name: fullName,
        username: cleanUsername,
        email: cleanEmail,
        phone: normPhone,
        role: r.userlevel === '0' || r.userlevel === 0 || r.role === 'admin' ? 'admin' : 'marketer',
        status: r.active === '0' || r.active === 0 || r.status === 'inactive' ? 'inactive' : 'active',
        active: !(r.active === '0' || r.active === 0),
        tenant_id: targetTenantNum || 1,
        national_id: String(r.code || r.shenasname || '').trim() || null,
      };

      const existIdx = personnelData.findIndex(
        (p) => p.id === pId || p.username === cleanUsername || p.email === cleanEmail
      );
      if (existIdx >= 0) {
        personnelData[existIdx] = { ...personnelData[existIdx], ...pObj };
      } else {
        personnelData.push(pObj);
        personnelToInsert.push(pObj);
        importedPersonnelCount++;
      }
    }

    if (directusUrl && directusAdminToken && personnelToInsert.length > 0) {
      await directusSafeBatchInsert('personnel', personnelToInsert, 25).catch((err) => {
        errors.push(`خطا در ثبت پرسنل در دایرکتوس: ${err.message}`);
      });
    }
  }

  // 2. Process customerRows
  if (Array.isArray(customerRows) && customerRows.length > 0) {
    const customersToInsert: any[] = [];
    const contactsToInsert: any[] = [];

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

      // Status: mapped and normalized!
      const rawStatus = r.lastStat || r.status || r.ClosedContact || '';
      const status = normalizeLegacyStatus(rawStatus);

      // Marketer:
      const marketerRef = String(r.Referrals || r.lockOwner || r.uid || r.assigned_marketer_id || '').trim();
      let assignedMarketerId: string | null = null;
      let assignedMarketerName: string | null = null;

      if (marketerRef) {
        const matchedP = personnelData.find(
          (p) =>
            p.id === marketerRef ||
            p.id === `p-${marketerRef}` ||
            p.username === marketerRef ||
            p.name === marketerRef
        );
        if (matchedP) {
          assignedMarketerId = matchedP.id;
          assignedMarketerName = matchedP.name;
        } else {
          assignedMarketerId = marketerRef.startsWith('p-') ? marketerRef : `p-${marketerRef}`;
          assignedMarketerName = `کارشناس ${marketerRef}`;
        }
      }

      const deadlineIso = parseLegacyDate(r.expire || r.assignment_deadline);
      const isExpired = Boolean(
        status !== 'قرارداد' &&
          status !== 'لیست سیاه' &&
          deadlineIso &&
          new Date().getTime() > new Date(deadlineIso).getTime()
      );

      const custId = callId ? `c-${callId}` : crypto.randomUUID();

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
        date_created: parseLegacyDate(r.created || r.InsertRecDate) || new Date().toISOString(),
      };

      const existIdx = customersData.findIndex(
        (c) =>
          (callId && c.id === custId) ||
          (mobileNumbers.length > 0 && mobileNumbers.some((m) => c.mobile_numbers?.includes(m)))
      );
      if (existIdx >= 0) {
        customersData[existIdx] = {
          ...customersData[existIdx],
          assigned_marketer_id: assignedMarketerId || customersData[existIdx].assigned_marketer_id,
          assigned_marketer_name: assignedMarketerName || customersData[existIdx].assigned_marketer_name,
          status: status || customersData[existIdx].status,
        };
        skippedCount++;
      } else {
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

    if (directusUrl && directusAdminToken) {
      if (customersToInsert.length > 0) {
        await directusSafeBatchInsert('customers', customersToInsert, 50).catch((err) => {
          errors.push(`خطا در ثبت مشتریان در دایرکتوس: ${err.message}`);
        });
      }
      if (contactsToInsert.length > 0) {
        await directusSafeBatchInsert('customer_contacts', contactsToInsert, 50).catch(() => {});
      }
    }
  }

  // 3. Process reportRows
  if (Array.isArray(reportRows) && reportRows.length > 0) {
    const reportsToInsert: any[] = [];

    for (const r of reportRows) {
      const callId = String(r.CallID || r.callid || '').trim();
      const repText = String(r.report || r.report_text || 'ثبت پیگیری').trim();
      const negotiator = String(r.negotiator || r.negotiator_name || 'کارشناس').trim();
      const callNum = normalizeContactValue(r.callNum || r.negotiation_phone || '');
      const status = normalizeLegacyStatus(r.status || r.negotiation_status);
      const rawRating = parseFloat(r.rating || '8');
      const score = isNaN(rawRating)
        ? 8
        : rawRating > 10
        ? Math.round(rawRating / 2)
        : Math.round(rawRating);
      const nextFollow = parseLegacyDate(r.nextFollow || r.next_followup_date);
      const dateCreated =
        parseLegacyDate(r.insertDate || r.dateTime || r.date_created) || new Date().toISOString();

      let matchedCustomerId: string | null = null;
      if (callId) {
        const byCallId = customersData.find((c) => c.id === `c-${callId}` || c.id === callId);
        if (byCallId) matchedCustomerId = byCallId.id;
      }
      if (!matchedCustomerId && callNum) {
        const byPhone = customersData.find(
          (c) => c.mobile_numbers?.includes(callNum) || c.landline_numbers?.includes(callNum)
        );
        if (byPhone) matchedCustomerId = byPhone.id;
      }

      if (!matchedCustomerId) {
        matchedCustomerId = callId ? `c-${callId}` : crypto.randomUUID();
      }

      const repObj: any = {
        id: r.ID ? `rep-${r.ID}` : crypto.randomUUID(),
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

    if (directusUrl && directusAdminToken && reportsToInsert.length > 0) {
      await directusSafeBatchInsert('customer_reports', reportsToInsert, 50).catch((err) => {
        errors.push(`خطا در ثبت گزارش‌ها در دایرکتوس: ${err.message}`);
      });
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
    skippedCount,
    skippedDetails,
    errors,
    message: `درون‌ریزی با موفقیت انجام شد: ${importedPersonnelCount} کارشناس، ${importedCustomersCount} مشتری، و ${importedReportsCount} گزارش ثبت شدند.`,
  });
});

export default router;
