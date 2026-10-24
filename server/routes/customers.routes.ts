import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import {
  directusUrl,
  directusAdminToken,
  customersData,
  setCustomersData,
  contactsData,
  reportsData,
  personnelData,
  addDays,
} from '../config.ts';
import { directusFetch, directusFetchAllPages, directusSafeBatchPatch } from '../directus/client.ts';
import {
  ensureCustomersCache,
  invalidateCustomersCache,
  invalidateReportsCache,
  computeCustomerExpiration,
  updateExpirationFlags,
  activeCustomerCreationLocks,
  recentCustomerCreations,
} from '../directus/cache.ts';
import {
  resolvePersonnelId,
  getSafeDirectusPersonnelForeignKey,
  resolveDirectusTenantId,
} from '../directus/sync.ts';
import {
  cleanCustomerPayloadForDirectus,
  extractCustomerContacts,
  asyncCheckContactDuplicate,
  normalizeContactValue,
  normalizePersianString,
} from '../services/phoneNormalizer.ts';
import {
  getRequestTenantId,
  getRequestUser,
  matchesTenant,
} from '../middlewares/auth.middleware.ts';
import { CustomerContact, Customer } from '../types.ts';

const router = Router();

export async function computePersonnelFreeQuota(
  targetPersonnelId: string,
  claimLimit = 20,
  targetPersonnelName?: string
) {
  const normTargetName = normalizePersianString(targetPersonnelName);

  if (directusUrl && directusAdminToken) {
    try {
      let activeUnclosedCount = 0;
      let successfulCount = 0;

      const contractStatusIn = `%D9%82%D8%B1%D8%A7%D8%B1%D8%AF%D8%A7%D8%AF,%D9%82%D8%B1%D8%A7%D8%B1%D8%AF%D8%A7%D8%AF%20%2F%20%D9%81%D8%A7%DA%A9%D8%AA%D9%88%D8%B1,%D9%82%D8%B1%D8%A7%D8%B1%D8%AF%D8%A7%D8%AF%2F%D9%81%D8%A7%DA%A9%D8%AA%D9%88%D8%B1`;
      const pFilter = `&filter[assigned_marketer_id][_eq]=${encodeURIComponent(targetPersonnelId)}`;

      const [contractsRes, activeRes] = await Promise.all([
        directusFetch(
          `/items/customers?aggregate[count]=*&filter[status][_in]=${contractStatusIn}${pFilter}`
        ).catch(() => null),
        directusFetch(
          `/items/customers?aggregate[count]=*&filter[is_expired][_eq]=false&filter[status][_nin]=${contractStatusIn},%D9%84%DB%8C%D8%B3%D8%AA%20%D8%B3%DB%8C%D8%A7%D9%87${pFilter}`
        ).catch(() => null),
      ]);

      if (contractsRes?.data?.[0]?.count !== undefined) {
        successfulCount = Number(contractsRes.data[0].count || 0);
      }
      if (activeRes?.data?.[0]?.count !== undefined) {
        activeUnclosedCount = Number(activeRes.data[0].count || 0);
      }

      const remainingQuota = Math.max(0, claimLimit - activeUnclosedCount);
      const canClaim = activeUnclosedCount < claimLimit || successfulCount > 0;

      return {
        claimLimit,
        activeUnclosedCount,
        successfulCount,
        canClaim,
        remainingQuota,
        requiresSuccessToUnlock: activeUnclosedCount >= claimLimit && successfulCount === 0,
      };
    } catch (e: any) {
      console.warn('Quota check error in Directus:', e.message);
    }
  }

  updateExpirationFlags();
  const userCustomers = customersData.filter(
    (c) =>
      c.assigned_marketer_id === targetPersonnelId ||
      (targetPersonnelName && c.assigned_marketer_name === targetPersonnelName)
  );

  const successfulCount = userCustomers.filter((c) => c.status === 'قرارداد').length;
  const activeUnclosedCount = userCustomers.filter(
    (c) => !c.is_expired && c.status !== 'قرارداد' && c.status !== 'لیست سیاه'
  ).length;

  const remainingQuota = Math.max(0, claimLimit - activeUnclosedCount);
  const canClaim = activeUnclosedCount < claimLimit || successfulCount > 0;

  return {
    claimLimit,
    activeUnclosedCount,
    successfulCount,
    canClaim,
    remainingQuota,
    requiresSuccessToUnlock: activeUnclosedCount >= claimLimit && successfulCount === 0,
  };
}

router.get('/free-quota', async (req: Request, res: Response) => {
  const { personnelId, userId, userName } = getRequestUser(req);
  const targetId = (req.query.personnel_id as string) || personnelId || userId;
  const targetName = (req.query.personnel_name as string) || userName;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

  if (!targetId) {
    return res.json({
      claimLimit: limit,
      activeUnclosedCount: 0,
      successfulCount: 0,
      canClaim: true,
      remainingQuota: limit,
      requiresSuccessToUnlock: false,
    });
  }

  const quota = await computePersonnelFreeQuota(targetId, limit, targetName);
  res.json(quota);
});

router.post('/check-duplicate', async (req: Request, res: Response) => {
  const { value, channel_type, customer_id } = req.body;
  if (!value || typeof value !== 'string') {
    return res.json({ isDuplicate: false });
  }
  const dup = await asyncCheckContactDuplicate(
    value,
    typeof channel_type === 'string' ? channel_type : undefined,
    typeof customer_id === 'string' ? customer_id : undefined
  );
  res.json(dup || { isDuplicate: false });
});

router.get('/', async (req: Request, res: Response) => {
  const { search, status, marketer_id, expired_only, page, limit, free_only, all } = req.query;
  const { userId, personnelId, isAdmin, userName, tenantId, canViewAllCustomers } = getRequestUser(req);

  const isUnlimited = all === 'true' || limit === 'all' || limit === '20000';
  const reqLimit = isUnlimited ? 500 : limit ? Math.min(Math.max(1, parseInt(String(limit), 10)), 500) : 25;
  const reqPage = page ? Math.max(1, parseInt(String(page), 10)) : 1;
  const isFreeOnly = free_only === 'true';

  if (!isAdmin && !canViewAllCustomers && !userId && !personnelId && !isFreeOnly) {
    return res.json({
      data: [],
      meta: { filter_count: 0, total_count: 0, page: reqPage, limit: reqLimit, total_pages: 1 },
    });
  }

  if (isUnlimited) {
    const cachedList = await ensureCustomersCache().catch(() => customersData);
    updateExpirationFlags();
    let list = cachedList.map((c) => computeCustomerExpiration(c));
    if (tenantId && tenantId !== 'all' && (isAdmin || isFreeOnly)) {
      list = list.filter((c) => matchesTenant(c.tenant_id, tenantId));
    }
    if (!isAdmin && !canViewAllCustomers && (userId || personnelId) && !isFreeOnly) {
      list = list.filter(
        (c) =>
          c.assigned_marketer_id === personnelId ||
          c.assigned_marketer_id === userId ||
          (userName && c.assigned_marketer_name === userName)
      );
    }
    if (search && typeof search === 'string') {
      const s = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.company_name?.toLowerCase().includes(s) ||
          c.manager_name?.toLowerCase().includes(s) ||
          c.city?.toLowerCase().includes(s) ||
          c.business_type?.toLowerCase().includes(s)
      );
    }
    if (status && status !== 'همه') {
      list = list.filter((c) => c.status === status);
    }
    if (marketer_id && marketer_id !== 'همه') {
      list = list.filter((c) => c.assigned_marketer_id === marketer_id);
    }
    if (expired_only === 'true') {
      list = list.filter((c) => c.is_expired);
    }
    if (isFreeOnly) {
      list = list.filter((c) => !c.assigned_marketer_id || c.is_expired);
    }
    return res.json(list);
  }

  if (directusUrl && directusAdminToken) {
    try {
      let directusPath = `/items/customers?page=${reqPage}&limit=${reqLimit}&meta=*&sort=-date_created`;
      directusPath += `&fields=id,company_name,business_type,province,city,manager_name,negotiator_name,mobile_numbers,landline_numbers,next_followup_date,assigned_marketer_id,assigned_marketer_name,assignment_deadline,status,is_expired,claimed_from_pool,date_created,date_updated,tenant_id`;

      let andIdx = 0;

      // Tenant filter: Only filter by tenant if tenantNum > 1 (a specific secondary organization)
      if (tenantId && tenantId !== 'all') {
        const tenantNum = resolveDirectusTenantId(tenantId);
        if (tenantNum && tenantNum > 1) {
          directusPath += `&filter[_and][${andIdx++}][tenant_id][_eq]=${tenantNum}`;
        }
      }

      // Marketer scoping for non-admins (marketers must only see their own assigned customers)
      if (!isAdmin && !canViewAllCustomers && !isFreeOnly) {
        const cleanPId = personnelId ? String(personnelId).trim().toLowerCase() : '';
        const rawUid = cleanPId.replace(/^p-/, '');
        const cleanUId = userId ? String(userId).trim().toLowerCase() : '';
        const normUserName = userName ? userName.trim() : '';

        let mOrIdx = 0;
        if (cleanPId) {
          directusPath += `&filter[_and][${andIdx}][_or][${mOrIdx++}][assigned_marketer_id][_eq]=${encodeURIComponent(cleanPId)}`;
          if (rawUid && rawUid !== cleanPId) {
            directusPath += `&filter[_and][${andIdx}][_or][${mOrIdx++}][assigned_marketer_id][_eq]=${encodeURIComponent(rawUid)}`;
            directusPath += `&filter[_and][${andIdx}][_or][${mOrIdx++}][assigned_marketer_id][_eq]=${encodeURIComponent('p-' + rawUid)}`;
          }
        }
        if (cleanUId && cleanUId !== cleanPId && cleanUId !== rawUid) {
          directusPath += `&filter[_and][${andIdx}][_or][${mOrIdx++}][assigned_marketer_id][_eq]=${encodeURIComponent(cleanUId)}`;
        }
        if (normUserName) {
          directusPath += `&filter[_and][${andIdx}][_or][${mOrIdx++}][assigned_marketer_name][_icontains]=${encodeURIComponent(normUserName)}`;
        }
        andIdx++;
      }

      if (status && status !== 'همه') {
        directusPath += `&filter[_and][${andIdx++}][status][_eq]=${encodeURIComponent(String(status))}`;
      }
      if (marketer_id && marketer_id !== 'همه') {
        directusPath += `&filter[_and][${andIdx++}][assigned_marketer_id][_eq]=${encodeURIComponent(String(marketer_id))}`;
      }
      if (expired_only === 'true') {
        directusPath += `&filter[_and][${andIdx++}][is_expired][_eq]=true`;
      }
      if (isFreeOnly) {
        directusPath += `&filter[_and][${andIdx}][_or][0][assigned_marketer_id][_null]=true&filter[_and][${andIdx}][_or][1][is_expired][_eq]=true`;
        andIdx++;
      }
      if (search && typeof search === 'string' && search.trim()) {
        const s = search.trim();
        directusPath += `&filter[_and][${andIdx}][_or][0][company_name][_icontains]=${encodeURIComponent(
          s
        )}&filter[_and][${andIdx}][_or][1][manager_name][_icontains]=${encodeURIComponent(
          s
        )}&filter[_and][${andIdx}][_or][2][city][_icontains]=${encodeURIComponent(
          s
        )}&filter[_and][${andIdx}][_or][3][business_type][_icontains]=${encodeURIComponent(s)}`;
        andIdx++;
      }

      const resData = await directusFetch(directusPath, {}, 1).catch(() => null);
      if (resData && Array.isArray(resData.data)) {
        let items = resData.data.map((c: any) => computeCustomerExpiration(c));

        if (tenantId && tenantId !== 'all') {
          items = items.filter((c: any) => matchesTenant(c.tenant_id, tenantId));
        }

        if (!isAdmin && !canViewAllCustomers && (userId || personnelId || userName) && !isFreeOnly) {
          const cleanPId = personnelId ? String(personnelId).trim().toLowerCase() : '';
          const rawUid = cleanPId.replace(/^p-/, '');
          const cleanUId = userId ? String(userId).trim().toLowerCase() : '';
          const normUserName = normalizePersianString(userName);

          items = items.filter((c: any) => {
            const cId = c.assigned_marketer_id ? String(c.assigned_marketer_id).trim().toLowerCase() : '';
            if (cleanPId && (cId === cleanPId || cId === rawUid || cId === `p-${rawUid}`)) return true;
            if (cleanUId && (cId === cleanUId || cId === rawUid || cId === `p-${rawUid}`)) return true;
            const cNameNorm = normalizePersianString(c.assigned_marketer_name);
            if (normUserName && cNameNorm && (cNameNorm === normUserName || cNameNorm.includes(normUserName)))
              return true;
            return false;
          });
        }

        if (search && typeof search === 'string' && search.trim()) {
          const s = search.trim().toLowerCase();
          items = items.filter(
            (c: any) =>
              c.company_name?.toLowerCase().includes(s) ||
              c.manager_name?.toLowerCase().includes(s) ||
              c.city?.toLowerCase().includes(s) ||
              c.business_type?.toLowerCase().includes(s) ||
              (Array.isArray(c.mobile_numbers) && c.mobile_numbers.some((m: string) => m.includes(s))) ||
              (Array.isArray(c.landline_numbers) && c.landline_numbers.some((l: string) => l.includes(s)))
          );
        }

        const filterCount = resData.meta?.filter_count ?? items.length;
        const totalCount = resData.meta?.total_count ?? filterCount;
        const totalPages = Math.max(1, Math.ceil(filterCount / reqLimit));

        res.setHeader('X-Total-Count', String(totalCount));
        res.setHeader('X-Filter-Count', String(filterCount));
        res.setHeader('X-Page', String(reqPage));
        res.setHeader('X-Limit', String(reqLimit));

        if (isUnlimited) {
          return res.json(items);
        }

        return res.json({
          data: items,
          meta: {
            filter_count: filterCount,
            total_count: totalCount,
            page: reqPage,
            limit: reqLimit,
            total_pages: totalPages,
          },
        });
      }
    } catch (e: any) {
      console.warn('Directus customer query fallback to in-memory store:', e.message);
    }
  }

  updateExpirationFlags();
  let list = customersData.map((c) => computeCustomerExpiration(c));
  if (tenantId && tenantId !== 'all' && (isAdmin || isFreeOnly)) {
    list = list.filter((c) => matchesTenant(c.tenant_id, tenantId));
  }
  if (!isAdmin && !canViewAllCustomers && (userId || personnelId) && !isFreeOnly) {
    list = list.filter(
      (c) =>
        c.assigned_marketer_id === personnelId ||
        c.assigned_marketer_id === userId ||
        (userName && c.assigned_marketer_name === userName)
    );
  }

  if (search && typeof search === 'string') {
    const s = search.toLowerCase();
    list = list.filter(
      (c) =>
        c.company_name?.toLowerCase().includes(s) ||
        c.manager_name?.toLowerCase().includes(s) ||
        c.city?.toLowerCase().includes(s) ||
        c.business_type?.toLowerCase().includes(s)
    );
  }
  if (status && status !== 'همه') {
    list = list.filter((c) => c.status === status);
  }
  if (marketer_id && marketer_id !== 'همه') {
    list = list.filter((c) => c.assigned_marketer_id === marketer_id);
  }
  if (expired_only === 'true') {
    list = list.filter((c) => c.is_expired);
  }
  if (isFreeOnly) {
    list = list.filter((c) => !c.assigned_marketer_id || c.is_expired);
  }

  const totalCount = list.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / reqLimit));
  const startIndex = (reqPage - 1) * reqLimit;
  const paginatedList = list.slice(startIndex, startIndex + reqLimit);

  res.json({
    data: paginatedList,
    meta: {
      filter_count: totalCount,
      total_count: totalCount,
      page: reqPage,
      limit: reqLimit,
      total_pages: totalPages,
    },
  });
});

// GET /api/customers/:id - Fetch single customer with full details, reports and contacts
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  if (directusUrl && directusAdminToken) {
    try {
      const [custRes, reportsRes, contactsRes] = await Promise.all([
        directusFetch(`/items/customers/${encodeURIComponent(id)}`).catch(() => null),
        directusFetch(`/items/customer_reports?filter[customer_id][_eq]=${encodeURIComponent(id)}&sort=-date_created`).catch(() => null),
        directusFetch(`/items/customer_contacts?filter[customer_id][_eq]=${encodeURIComponent(id)}`).catch(() => null),
      ]);

      if (custRes?.data) {
        let cust = computeCustomerExpiration(custRes.data);
        let customerReports = reportsRes?.data && Array.isArray(reportsRes.data) ? reportsRes.data : [];
        const customerContacts = contactsRes?.data && Array.isArray(contactsRes.data) ? contactsRes.data : [];

        if (customerReports.length === 0) {
          const cachedReports = reportsData.filter(
            (r) =>
              String(r.customer_id) === String(id) ||
              (typeof r.customer_id === 'object' && r.customer_id !== null && String((r.customer_id as any).id) === String(id))
          );
          if (cachedReports.length > 0) {
            customerReports = cachedReports;
          }
        }

        cust.reports = customerReports;
        cust.contacts = customerContacts;

        return res.json(cust);
      }
    } catch (e: any) {
      console.warn(`Error fetching customer ${id} from Directus:`, e.message);
    }
  }

  updateExpirationFlags();
  const found = customersData.find((c) => c.id === id);
  if (!found) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  const cust = computeCustomerExpiration(found);
  cust.reports = reportsData.filter((r) => String(r.customer_id) === String(id));
  cust.contacts = contactsData.filter((ct) => String(ct.customer_id) === String(id));

  res.json(cust);
});

// POST /api/customers/bulk-set-deadline
router.post('/bulk-set-deadline', async (req: Request, res: Response) => {
  const { target = 'all', marketer_id, customer_ids, days = 30 } = req.body;
  const daysCount = parseInt(String(days), 10) || 30;
  const nowMs = Date.now();
  const deadlineIso = new Date(nowMs + daysCount * 86400 * 1000).toISOString();

  let targetCustomerIds: string[] = [];

  if (target === 'selected' && Array.isArray(customer_ids) && customer_ids.length > 0) {
    targetCustomerIds = customer_ids.map(String);
  } else if (target === 'marketer' && marketer_id) {
    targetCustomerIds = customersData
      .filter((c) => String(c.assigned_marketer_id) === String(marketer_id))
      .map((c) => c.id);
  } else {
    // 'all'
    targetCustomerIds = customersData.map((c) => c.id);
  }

  if (directusUrl && directusAdminToken) {
    try {
      if (target === 'all' || target === 'marketer') {
        const queryFilter = target === 'marketer' && marketer_id
          ? `?filter[assigned_marketer_id][_eq]=${encodeURIComponent(marketer_id)}&limit=50000&fields=id`
          : '?limit=50000&fields=id';
        const dRes = await directusFetchAllPages(`/items/customers${queryFilter}`).catch(() => null);
        const dItems = Array.isArray(dRes) ? dRes : (dRes?.data || []);
        if (dItems.length > 0) {
          targetCustomerIds = Array.from(new Set([...targetCustomerIds, ...dItems.map((item: any) => String(item.id))]));
        }
      }

      const patchMap = new Map<string, any>();
      for (const cid of targetCustomerIds) {
        patchMap.set(cid, {
          id: cid,
          assignment_deadline: deadlineIso,
          is_expired: false,
        });
      }

      await directusSafeBatchPatch('customers', patchMap, 50);
    } catch (e: any) {
      console.warn('Error patching customers deadline in Directus:', e.message);
    }
  }

  // Update in-memory customersData
  let updatedCount = 0;
  for (const c of customersData) {
    if (targetCustomerIds.length === 0 || targetCustomerIds.includes(c.id)) {
      c.assignment_deadline = deadlineIso;
      c.is_expired = false;
      updatedCount++;
    }
  }

  invalidateCustomersCache();

  return res.json({
    success: true,
    updatedCount: targetCustomerIds.length || updatedCount,
    deadline: deadlineIso,
    message: `مهلت مالکیت ${targetCustomerIds.length || updatedCount} پرونده با موفقیت به ${daysCount} روز (تا تاریخ سررسید جدید) تنظیم گردید.`,
  });
});

// POST /api/customers/bulk-extend
router.post('/bulk-extend', async (req: Request, res: Response) => {
  const { customer_ids, extend_days = 7 } = req.body;
  const daysCount = parseInt(String(extend_days), 10) || 7;
  const nowMs = Date.now();
  const deadlineIso = new Date(nowMs + daysCount * 86400 * 1000).toISOString();

  const targetIds: string[] = Array.isArray(customer_ids) ? customer_ids.map(String) : [];
  if (targetIds.length === 0) {
    return res.status(400).json({ error: 'NO_CUSTOMERS', message: 'هیچ پرونده‌ای انتخاب نشده است.' });
  }

  if (directusUrl && directusAdminToken) {
    try {
      const patchMap = new Map<string, any>();
      for (const cid of targetIds) {
        patchMap.set(cid, {
          id: cid,
          assignment_deadline: deadlineIso,
          is_expired: false,
        });
      }
      await directusSafeBatchPatch('customers', patchMap, 50);
    } catch (e: any) {
      console.warn('Directus bulk-extend error:', e.message);
    }
  }

  for (const c of customersData) {
    if (targetIds.includes(c.id)) {
      c.assignment_deadline = deadlineIso;
      c.is_expired = false;
    }
  }

  invalidateCustomersCache();

  return res.json({
    success: true,
    updatedCount: targetIds.length,
    message: `مهلت مالکیت ${targetIds.length} پرونده با موفقیت به مدت ${daysCount} روز تمدید گردید.`,
  });
});

// POST /api/customers/bulk-switch
router.post('/bulk-switch', async (req: Request, res: Response) => {
  const { customer_ids, new_marketer_id, new_marketer_name, duration_days = 7 } = req.body;
  const daysCount = parseInt(String(duration_days), 10) || 7;
  const nowTime = new Date();
  const deadlineIso = new Date(nowTime.getTime() + daysCount * 86400 * 1000).toISOString();

  const targetIds: string[] = Array.isArray(customer_ids) ? customer_ids.map(String) : [];
  if (targetIds.length === 0) {
    return res.status(400).json({ error: 'NO_CUSTOMERS', message: 'هیچ پرونده‌ای انتخاب نشده است.' });
  }

  const resolved = await resolvePersonnelId(new_marketer_id, new_marketer_name);
  const targetPId = resolved.personnelId;
  const targetPName = resolved.personnelName || new_marketer_name || 'کارشناس فروش';

  if (directusUrl && directusAdminToken) {
    try {
      const patchMap = new Map<string, any>();
      for (const cid of targetIds) {
        patchMap.set(cid, {
          id: cid,
          assigned_marketer_id: targetPId,
          assigned_marketer_name: targetPName,
          assignment_deadline: deadlineIso,
          is_expired: false,
        });
      }
      await directusSafeBatchPatch('customers', patchMap, 50);
    } catch (e: any) {
      console.warn('Directus bulk-switch error:', e.message);
    }
  }

  for (const c of customersData) {
    if (targetIds.includes(c.id)) {
      c.assigned_marketer_id = targetPId;
      c.assigned_marketer_name = targetPName;
      c.assignment_deadline = deadlineIso;
      c.is_expired = false;
    }
  }

  invalidateCustomersCache();

  return res.json({
    success: true,
    updatedCount: targetIds.length,
    message: `تعداد ${targetIds.length} پرونده با موفقیت به «${targetPName}» واگذار شد.`,
  });
});

router.post('/', async (req: Request, res: Response) => {
  const { userId, personnelId, userName, tenantId } = getRequestUser(req);
  const payload = req.body;

  if (!payload.company_name) {
    return res.status(400).json({ error: 'نام شرکت یا برند الزامی است.' });
  }

  const extractedContacts = extractCustomerContacts(payload, 'temp');
  const allPhones: string[] = [];

  extractedContacts.forEach((ct) => {
    if (ct.value) allPhones.push(ct.value);
    if (ct.normalized_value) allPhones.push(ct.normalized_value);
  });

  const nowMs = Date.now();
  const phoneLockKey = allPhones.sort().join('|') || (payload.company_name || '').trim();

  if (activeCustomerCreationLocks.has(phoneLockKey)) {
    return res.status(409).json({
      error: 'CONCURRENT_SAVE_LOCK',
      message: 'یک درخواست ثبت همزمان برای این مشتری در حال پردازش است. لطفاً چند ثانیه شکیبا باشید.',
    });
  }

  activeCustomerCreationLocks.add(phoneLockKey);

  try {
    const recent = recentCustomerCreations.find(
      (rc) =>
        nowMs - rc.timestamp < 10000 &&
        (rc.company_name === (payload.company_name || '').trim() ||
          rc.phones.some((p) => allPhones.includes(p)))
    );

    if (recent) {
      return res.json({
        ...recent.customer,
        isDuplicatePrevented: true,
        message: 'پرونده این مشتری لحظاتی پیش ثبت گردید.',
      });
    }

    for (const ct of extractedContacts) {
      if (ct.value) {
        const dup = await asyncCheckContactDuplicate(ct.value, ct.channel_type);
        if (dup && dup.conflictType === 'active_marketer') {
          return res.status(409).json({
            error: 'DUPLICATE_CONTACT',
            message: dup.message,
            conflict: dup,
          });
        }
      }
    }

    const newId = payload.id || crypto.randomUUID();

    let marketerId = payload.assigned_marketer_id || personnelId || userId || null;
    let marketerName = payload.assigned_marketer_name || userName || 'تخصیص نیافته';

    if (marketerId) {
      const resolved = await resolvePersonnelId(marketerId, marketerName);
      marketerId = resolved.personnelId;
      if (resolved.personnelName) marketerName = resolved.personnelName;
    }

    const targetTenantId = payload.tenant_id || tenantId || 'default';

    const cleanPayload = cleanCustomerPayloadForDirectus(
      {
        ...payload,
        tenant_id: targetTenantId,
      },
      newId,
      marketerId,
      marketerName
    );

    const finalContacts = extractCustomerContacts(payload, newId);

    if (directusUrl && directusAdminToken) {
      try {
        const createdCust = await directusFetch('/items/customers', {
          method: 'POST',
          body: JSON.stringify(cleanPayload),
        });

        const createdContactsData: CustomerContact[] = [];
        for (const ct of finalContacts) {
          try {
            const createdCt = await directusFetch('/items/customer_contacts', {
              method: 'POST',
              body: JSON.stringify(ct),
            });
            if (createdCt?.data) createdContactsData.push(createdCt.data);
            else createdContactsData.push(ct);
          } catch (ctErr: any) {
            console.warn('Contact insert warning:', ctErr.message);
            createdContactsData.push(ct);
          }
        }

        invalidateCustomersCache();

        const fullCustomer = computeCustomerExpiration({
          ...(createdCust.data || cleanPayload),
          contacts: createdContactsData,
        });

        recentCustomerCreations.push({
          id: newId,
          company_name: (payload.company_name || '').trim(),
          phones: allPhones,
          customer: fullCustomer,
          timestamp: Date.now(),
        });

        return res.status(201).json(fullCustomer);
      } catch (err: any) {
        console.error('Customer create Directus error:', err.message);
        return res.status(500).json({
          error: 'CUSTOMER_SAVE_FAILED',
          message: `خطا در ذخیره پرونده مشتری در پایگاه داده مرکزی: ${err.message}`,
        });
      }
    }

    const newCustomer = computeCustomerExpiration({
      ...cleanPayload,
      contacts: finalContacts,
    });

    customersData.unshift(newCustomer);
    finalContacts.forEach((ct) => contactsData.unshift(ct));

    recentCustomerCreations.push({
      id: newId,
      company_name: (payload.company_name || '').trim(),
      phones: allPhones,
      customer: newCustomer,
      timestamp: Date.now(),
    });

    res.status(201).json(newCustomer);
  } finally {
    activeCustomerCreationLocks.delete(phoneLockKey);
  }
});

router.patch('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const payload = req.body;

  if (payload.contacts && Array.isArray(payload.contacts)) {
    for (const ct of payload.contacts) {
      if (ct.value) {
        const dup = await asyncCheckContactDuplicate(ct.value, ct.channel_type, id);
        if (dup && dup.conflictType === 'active_marketer') {
          return res.status(409).json({
            error: 'DUPLICATE_CONTACT',
            message: dup.message,
            conflict: dup,
          });
        }
      }
    }
  }

  let marketerId = payload.assigned_marketer_id;
  let marketerName = payload.assigned_marketer_name;

  if (marketerId !== undefined) {
    if (!marketerId || marketerId === 'همه' || String(marketerId).trim() === '' || marketerId === 'none') {
      marketerId = null;
      marketerName = 'تخصیص نیافته';
    } else {
      const resolved = await resolvePersonnelId(marketerId, marketerName);
      marketerId = resolved.personnelId;
      if (resolved.personnelName) marketerName = resolved.personnelName;
    }
  }

  const patchPayload = cleanCustomerPayloadForDirectus(
    payload,
    id,
    marketerId,
    marketerName
  );

  delete patchPayload.date_created;

  if (directusUrl && directusAdminToken) {
    try {
      const patchedCust = await directusFetch(`/items/customers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patchPayload),
      });

      if (payload.contacts && Array.isArray(payload.contacts)) {
        try {
          const oldContacts = await directusFetch(
            `/items/customer_contacts?filter[customer_id][_eq]=${encodeURIComponent(id)}`
          );
          if (oldContacts?.data && Array.isArray(oldContacts.data)) {
            for (const oldCt of oldContacts.data) {
              await directusFetch(`/items/customer_contacts/${oldCt.id}`, {
                method: 'DELETE',
              }).catch(() => {});
            }
          }
        } catch {}

        const newContacts = extractCustomerContacts(payload, id);
        for (const ct of newContacts) {
          await directusFetch('/items/customer_contacts', {
            method: 'POST',
            body: JSON.stringify(ct),
          }).catch(() => {});
        }
      }

      invalidateCustomersCache();

      const updatedCust = computeCustomerExpiration(patchedCust.data || patchPayload);
      return res.json(updatedCust);
    } catch (err: any) {
      console.error('Customer patch Directus error:', err.message);
      return res.status(500).json({
        error: 'CUSTOMER_UPDATE_FAILED',
        message: `خطا در بروزرسانی پرونده مشتری در پایگاه داده مرکزی: ${err.message}`,
      });
    }
  }

  const index = customersData.findIndex((c) => c.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  const updatedCustomer = computeCustomerExpiration({
    ...customersData[index],
    ...patchPayload,
  });

  customersData[index] = updatedCustomer;
  invalidateCustomersCache();

  res.json(updatedCustomer);
});

router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { isAdmin, isPersonnelAdmin } = getRequestUser(req);

  if (!isAdmin && !isPersonnelAdmin) {
    return res.status(403).json({ error: 'فقط مدیر سیستم اجازه حذف پرونده مشتری را دارد.' });
  }

  if (directusUrl && directusAdminToken) {
    try {
      await directusFetch(`/items/customers/${id}`, { method: 'DELETE' });
      const contactsRes = await directusFetch(
        `/items/customer_contacts?filter[customer_id][_eq]=${encodeURIComponent(id)}`
      ).catch(() => null);
      if (contactsRes?.data && Array.isArray(contactsRes.data)) {
        for (const ct of contactsRes.data) {
          await directusFetch(`/items/customer_contacts/${ct.id}`, { method: 'DELETE' }).catch(
            () => {}
          );
        }
      }
      invalidateCustomersCache();
      return res.status(204).send();
    } catch (err: any) {
      return res.status(500).json({
        error: 'CUSTOMER_DELETE_FAILED',
        message: `خطا در حذف پرونده مشتری: ${err.message}`,
      });
    }
  }

  setCustomersData(customersData.filter((c) => c.id !== id));
  invalidateCustomersCache();
  res.status(204).send();
});

router.post('/:id/claim-free', async (req: Request, res: Response) => {
  const { userId, personnelId, userName } = getRequestUser(req);
  const targetPersonnelId = req.body.personnel_id || personnelId || userId;
  const targetPersonnelName = req.body.personnel_name || userName;
  const days = req.body.duration_days ? parseInt(req.body.duration_days, 10) : 10;
  const limit = req.body.claim_limit ? parseInt(req.body.claim_limit, 10) : 20;

  if (!targetPersonnelId) {
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'شناسه کارشناس متقاضی یافت نشد. لطفاً مجدداً وارد سامانه شوید.',
    });
  }

  const quota = await computePersonnelFreeQuota(targetPersonnelId, limit, targetPersonnelName);
  if (!quota.canClaim) {
    return res.status(403).json({
      error: 'QUOTA_LIMIT_REACHED',
      message: `شما به سقف مجاز (${limit} پرونده برداشته‌شده از حوضچه آزاد) رسیده‌اید. برای اختصاص پرونده جدید از بخش مشتریان آزاد، باید حداقل یک قرارداد موفق به ثبت برسانید.`,
      quota,
    });
  }

  let targetCustomer: any = null;

  if (directusUrl && directusAdminToken) {
    try {
      const custRes = await directusFetch(`/items/customers/${req.params.id}`);
      if (custRes?.data) {
        targetCustomer = computeCustomerExpiration(custRes.data);
      }
    } catch {}
  }

  if (!targetCustomer) {
    const local = customersData.find((c) => c.id === req.params.id);
    if (local) {
      targetCustomer = computeCustomerExpiration(local);
    }
  }

  if (!targetCustomer) {
    return res.status(404).json({
      error: 'NOT_FOUND',
      message: 'پرونده مشتری مورد نظر در سامانه یافت نشد.',
    });
  }

  if (targetCustomer.status === 'قرارداد') {
    return res.status(400).json({
      error: 'ALREADY_CLOSED',
      message: 'این پرونده قبلاً به قرارداد موفق منتهی شده و امکان برداشت مجدد ندارد.',
    });
  }

  if (targetCustomer.status === 'لیست سیاه') {
    return res.status(400).json({
      error: 'BLACKLISTED',
      message: 'این پرونده در لیست سیاه قرار دارد و قابل واگذاری نیست.',
    });
  }

  const isFree =
    targetCustomer.is_expired ||
    !targetCustomer.assigned_marketer_id ||
    targetCustomer.assigned_marketer_name === 'تخصیص نیافته' ||
    (targetCustomer.assignment_deadline &&
      new Date().getTime() > new Date(targetCustomer.assignment_deadline).getTime());

  if (!isFree) {
    return res.status(400).json({
      error: 'NOT_FREE',
      message: `این پرونده در حال حاضر تحت مهلت فعال پیگیری توسط «${targetCustomer.assigned_marketer_name}» قرار دارد و آزاد نیست.`,
    });
  }

  const resolved = await resolvePersonnelId(targetPersonnelId, targetPersonnelName);
  const nowTime = new Date();
  const deadline = addDays(nowTime, days);

  const patchData = {
    assigned_marketer_id: resolved.personnelId,
    assigned_marketer_name: (resolved.personnelName || targetPersonnelName || 'کارشناس فروش').trim(),
    assignment_date: nowTime.toISOString(),
    assignment_deadline: deadline,
    assignment_duration_days: days,
    is_expired: false,
    claimed_from_pool: true,
    claimed_from_pool_at: nowTime.toISOString(),
  };

  if (directusUrl && directusAdminToken) {
    try {
      const patchedRes = await directusFetch(`/items/customers/${req.params.id}`, {
        method: 'PATCH',
        body: JSON.stringify(patchData),
      });

      const auditReport = {
        id: crypto.randomUUID(),
        customer_id: req.params.id,
        negotiator_name: patchData.assigned_marketer_name,
        negotiation_phone: targetCustomer.manager_phones?.[0] || targetCustomer.mobile_numbers?.[0] || '-',
        report_text: `[انتقال سیستمی]: پرونده از حوضچه مشتریان آزاد توسط «${patchData.assigned_marketer_name}» با مهلت پیگیری ${days} روزه اختصاص داده شد.`,
        negotiation_score: 8,
        next_followup_date: addDays(nowTime, 2),
        negotiation_status: targetCustomer.status || 'پیگیری قبل از انقضا',
        created_by: patchData.assigned_marketer_id,
        date_created: nowTime.toISOString(),
      };

      await directusFetch('/items/customer_reports', {
        method: 'POST',
        body: JSON.stringify(auditReport),
      }).catch(() => {});

      invalidateCustomersCache();
      invalidateReportsCache();

      const finalCust = computeCustomerExpiration(patchedRes.data || { ...targetCustomer, ...patchData });
      return res.json({
        success: true,
        message: `پرونده «${finalCust.company_name}» با مهلت ${days} روز به شما اختصاص داده شد.`,
        customer: finalCust,
      });
    } catch (e: any) {
      console.error('Claim customer Directus error:', e.message);
      return res.status(500).json({
        error: 'CLAIM_FAILED',
        message: `خطا در اختصاص پرونده: ${e.message}`,
      });
    }
  }

  const idx = customersData.findIndex((c) => c.id === req.params.id);
  if (idx !== -1) {
    customersData[idx] = computeCustomerExpiration({
      ...customersData[idx],
      ...patchData,
    });
  }

  invalidateCustomersCache();
  res.json({
    success: true,
    message: 'پرونده با موفقیت به شما اختصاص داده شد.',
    customer: customersData[idx],
  });
});

router.post('/merge', async (req: Request, res: Response) => {
  const { primary_customer_id, merged_customer_ids, assigned_marketer_id, assigned_marketer_name } = req.body;
  const { isAdmin, userName } = getRequestUser(req);

  if (!isAdmin) {
    return res.status(403).json({ error: 'FORBIDDEN', message: 'فقط مدیر سیستم اجازه ادغام پرونده‌های تکراری را دارد.' });
  }

  if (!primary_customer_id || !Array.isArray(merged_customer_ids) || merged_customer_ids.length === 0) {
    return res.status(400).json({ error: 'INVALID_PARAMS', message: 'شناسه مشتری اصلی و پرونده‌های تکراری الزامی است.' });
  }

  const nowTime = new Date();
  const nowIso = nowTime.toISOString();

  function mergeUnique<T>(primaryArr: T[] = [], ...sourceArrs: T[][]): T[] {
    const set = new Set<string>();
    const result: T[] = [];
    const add = (val: any) => {
      if (!val) return;
      const str = String(val).trim();
      if (!str) return;
      const key = str.toLowerCase();
      if (!set.has(key)) {
        set.add(key);
        result.push(val);
      }
    };
    (primaryArr || []).forEach(add);
    sourceArrs.forEach((arr) => (arr || []).forEach(add));
    return result;
  }

  if (directusUrl && directusAdminToken) {
    try {
      const primaryRes = await directusFetch(`/items/customers/${primary_customer_id}`);
      if (!primaryRes?.data) {
        return res.status(404).json({ error: 'PRIMARY_NOT_FOUND', message: 'مشتری اصلی یافت نشد.' });
      }
      const primaryCust = primaryRes.data;

      const sourceCustomers: any[] = [];
      for (const mId of merged_customer_ids) {
        const sRes = await directusFetch(`/items/customers/${mId}`).catch(() => null);
        if (sRes?.data) sourceCustomers.push(sRes.data);
      }

      let targetMarketerId = primaryCust.assigned_marketer_id;
      let targetMarketerName = primaryCust.assigned_marketer_name;
      if (assigned_marketer_id || assigned_marketer_name) {
        const resolved = await resolvePersonnelId(assigned_marketer_id, assigned_marketer_name);
        targetMarketerId = resolved.personnelId || targetMarketerId;
        targetMarketerName = resolved.personnelName || assigned_marketer_name || targetMarketerName;
      }

      const combinedMobiles = mergeUnique(
        primaryCust.mobile_numbers,
        ...sourceCustomers.map((c) => c.mobile_numbers)
      );
      const combinedLandlines = mergeUnique(
        primaryCust.landline_numbers,
        ...sourceCustomers.map((c) => c.landline_numbers)
      );
      const combinedManagerPhones = mergeUnique(
        primaryCust.manager_phones,
        ...sourceCustomers.map((c) => c.manager_phones)
      );
      const combinedNegotiatorPhones = mergeUnique(
        primaryCust.negotiator_phones,
        ...sourceCustomers.map((c) => c.negotiator_phones)
      );

      for (const mId of merged_customer_ids) {
        const reportsRes = await directusFetch(
          `/items/customer_reports?filter[customer_id][_eq]=${encodeURIComponent(mId)}`
        ).catch(() => null);

        if (reportsRes?.data && Array.isArray(reportsRes.data)) {
          for (const rep of reportsRes.data) {
            await directusFetch(`/items/customer_reports/${rep.id}`, {
              method: 'PATCH',
              body: JSON.stringify({ customer_id: primary_customer_id }),
            }).catch(() => {});
          }
        }

        const contactsRes = await directusFetch(
          `/items/customer_contacts?filter[customer_id][_eq]=${encodeURIComponent(mId)}`
        ).catch(() => null);

        if (contactsRes?.data && Array.isArray(contactsRes.data)) {
          for (const ct of contactsRes.data) {
            await directusFetch(`/items/customer_contacts/${ct.id}`, {
              method: 'PATCH',
              body: JSON.stringify({ customer_id: primary_customer_id }),
            }).catch(() => {});
          }
        }
      }

      await directusFetch('/items/customer_reports', {
        method: 'POST',
        body: JSON.stringify({
          id: crypto.randomUUID(),
          customer_id: primary_customer_id,
          negotiator_name: userName || 'مدیریت سیستم',
          negotiation_phone:
            primaryCust.manager_phones?.[0] || primaryCust.mobile_numbers?.[0] || '-',
          report_text: `[ادغام سیستمی پرونده‌ها]: سوابق و شماره‌های تماس ${sourceCustomers.length} پرونده مشتری با این پرونده ادغام شد.`,
          negotiation_score: 8,
          next_followup_date: primaryCust.next_followup_date || addDays(nowTime, 2),
          negotiation_status: primaryCust.status || 'پیگیری قبل از انقضا',
          date_created: nowIso,
        }),
      }).catch(() => {});

      const primaryPatch = {
        assigned_marketer_id: targetMarketerId,
        assigned_marketer_name: targetMarketerName,
        mobile_numbers: combinedMobiles,
        landline_numbers: combinedLandlines,
        manager_phones: combinedManagerPhones,
        negotiator_phones: combinedNegotiatorPhones,
        date_updated: nowIso,
      };

      const updatedPrimaryRes = await directusFetch(`/items/customers/${primary_customer_id}`, {
        method: 'PATCH',
        body: JSON.stringify(primaryPatch),
      });

      for (const mId of merged_customer_ids) {
        await directusFetch(`/items/customers/${mId}`, { method: 'DELETE' }).catch(() => {});
      }

      invalidateCustomersCache();
      invalidateReportsCache();

      const finalCustomer = computeCustomerExpiration(updatedPrimaryRes.data || primaryCust);
      return res.json({
        success: true,
        message: `تعداد ${sourceCustomers.length} پرونده با موفقیت در پرونده «${primaryCust.company_name}» ادغام گردیدند.`,
        customer: finalCustomer,
      });
    } catch (err: any) {
      console.error('Merge customers error:', err.message);
      return res.status(500).json({
        error: 'MERGE_FAILED',
        message: `خطا در ادغام پرونده‌های مشتریان: ${err.message}`,
      });
    }
  }

  const primaryIndex = customersData.findIndex((c) => c.id === primary_customer_id);
  if (primaryIndex === -1) {
    return res.status(404).json({ error: 'PRIMARY_NOT_FOUND', message: 'مشتری اصلی یافت نشد.' });
  }

  const primaryCust = customersData[primaryIndex];
  const sourceCustomers = customersData.filter((c) => merged_customer_ids.includes(c.id));

  let targetMarketerId = primaryCust.assigned_marketer_id;
  let targetMarketerName = primaryCust.assigned_marketer_name;
  if (assigned_marketer_id || assigned_marketer_name) {
    targetMarketerId = assigned_marketer_id || targetMarketerId;
    targetMarketerName = assigned_marketer_name || targetMarketerName;
  }

  const combinedMobiles = mergeUnique(
    primaryCust.mobile_numbers,
    ...sourceCustomers.map((c) => c.mobile_numbers)
  );
  const combinedLandlines = mergeUnique(
    primaryCust.landline_numbers,
    ...sourceCustomers.map((c) => c.landline_numbers)
  );
  const combinedManagerPhones = mergeUnique(
    primaryCust.manager_phones,
    ...sourceCustomers.map((c) => c.manager_phones)
  );
  const combinedNegotiatorPhones = mergeUnique(
    primaryCust.negotiator_phones,
    ...sourceCustomers.map((c) => c.negotiator_phones)
  );

  setCustomersData(customersData.filter((c) => !merged_customer_ids.includes(c.id)));

  invalidateCustomersCache();
  invalidateReportsCache();
  return res.json({
    success: true,
    message: 'ادغام مشتریان با موفقیت انجام شد.',
    customer: customersData[primaryIndex],
  });
});

export default router;
