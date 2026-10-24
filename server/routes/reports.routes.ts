import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import {
  directusUrl,
  directusAdminToken,
  reportsData,
  customersData,
} from '../config.ts';
import { directusFetch, directusFetchAllPages } from '../directus/client.ts';
import {
  ensureCustomersCache,
  ensureReportsCache,
  invalidateCustomersCache,
  invalidateReportsCache,
} from '../directus/cache.ts';
import { getSafeDirectusPersonnelForeignKey, resolveDirectusTenantId } from '../directus/sync.ts';
import { cleanCustomerPayloadForDirectus, normalizePersianString } from '../services/phoneNormalizer.ts';
import { getRequestUser, getRequestTenantId, matchesTenant } from '../middlewares/auth.middleware.ts';
import { CustomerReport } from '../types.ts';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const {
    customer_id,
    page,
    limit,
    all,
    status,
    negotiator,
    search,
    admin_filter,
    staff_filter,
    start_date,
    end_date,
    fields,
    sort,
  } = req.query;
  const {
    userId,
    personnelId,
    isAdmin,
    isPersonnelAdmin,
    canViewAllCustomers,
    reportViewScope,
    userName,
    tenantId,
  } = getRequestUser(req);

  const canViewAllReports = Boolean(
    isAdmin ||
    isPersonnelAdmin ||
    canViewAllCustomers ||
    reportViewScope === 'all'
  );

  const isUnlimited = all === 'true' || limit === 'all' || limit === '50000';
  const reqLimit = isUnlimited
    ? 10000
    : limit
    ? Math.min(Math.max(1, parseInt(String(limit), 10)), 500)
    : 25;
  const reqPage = page ? Math.max(1, parseInt(String(page), 10)) : 1;

  // Determine sort parameter (default: -date_created -> newest first)
  let sortParam = '-date_created';
  if (sort === 'oldest') {
    sortParam = 'date_created';
  } else if (sort === 'highest_score') {
    sortParam = '-negotiation_score,-date_created';
  } else if (sort === 'followup_soonest') {
    sortParam = 'next_followup_date,-date_created';
  }

  const activeFilter = String(admin_filter || staff_filter || '');

  // Query Directus directly with pagination and server-side filters
  if (directusUrl && directusAdminToken && !isUnlimited) {
    try {
      const directusPageLimit = Math.min(reqLimit, 100);
      let directusPath = `/items/customer_reports?page=${reqPage}&limit=${directusPageLimit}&meta=total_count,filter_count&sort=${sortParam}`;

      let andIdx = 0;

      // Tenant filter: Only apply if a specific secondary branch (tenantNum > 1) is active
      if (tenantId && tenantId !== 'all') {
        const tenantNum = resolveDirectusTenantId(tenantId);
        if (tenantNum && tenantNum > 1) {
          directusPath += `&filter[_and][${andIdx++}][tenant_id][_eq]=${tenantNum}`;
        }
      }

      if (customer_id) {
        directusPath += `&filter[_and][${andIdx++}][customer_id][_eq]=${encodeURIComponent(String(customer_id))}`;
      } else if (!canViewAllReports && (userName || personnelId || userId)) {
        let repOr = 0;
        if (userName) {
          directusPath += `&filter[_and][${andIdx}][_or][${repOr++}][negotiator_name][_icontains]=${encodeURIComponent(userName)}`;
          directusPath += `&filter[_and][${andIdx}][_or][${repOr++}][customer_id][assigned_marketer_name][_icontains]=${encodeURIComponent(userName)}`;
        }
        if (personnelId) {
          directusPath += `&filter[_and][${andIdx}][_or][${repOr++}][created_by][_eq]=${encodeURIComponent(String(personnelId))}`;
          const rawP = String(personnelId).replace(/^p-/, '');
          if (rawP !== String(personnelId)) {
            directusPath += `&filter[_and][${andIdx}][_or][${repOr++}][created_by][_eq]=${encodeURIComponent(rawP)}`;
          }
          directusPath += `&filter[_and][${andIdx}][_or][${repOr++}][customer_id][assigned_marketer_id][_eq]=${encodeURIComponent(String(personnelId))}`;
        }
        if (userId) {
          directusPath += `&filter[_and][${andIdx}][_or][${repOr++}][created_by][_eq]=${encodeURIComponent(String(userId))}`;
          directusPath += `&filter[_and][${andIdx}][_or][${repOr++}][customer_id][assigned_marketer_id][_eq]=${encodeURIComponent(String(userId))}`;
        }
        andIdx++;
      }

      // Handle category tab filters directly in Directus
      if (activeFilter === 'active_followups') {
        directusPath += `&filter[_and][${andIdx++}][next_followup_date][_nnull]=true`;
      } else if (activeFilter === 'no_followup') {
        directusPath += `&filter[_and][${andIdx++}][next_followup_date][_null]=true`;
      } else if (activeFilter === 'expired_customers' || activeFilter === 'expired') {
        const nowIso = new Date().toISOString();
        directusPath += `&filter[_and][${andIdx}][_or][0][customer_id][is_expired][_eq]=true` +
          `&filter[_and][${andIdx}][_or][1][customer_id][assignment_deadline][_lt]=${encodeURIComponent(nowIso)}`;
        andIdx++;
      } else if (activeFilter === 'near_expiry_customers') {
        const nowIso = new Date().toISOString();
        const in3DaysIso = new Date(Date.now() + 3 * 86400000).toISOString();
        directusPath += `&filter[_and][${andIdx}][_or][0][customer_id][status][_eq]=%D9%BE%DB%8C%DA%AF%DB%8C%D8%B1%DB%8C%20%D9%82%D8%A8%D9%84%20%D8%A7%D8%B2%20%D8%A7%D9%86%D9%82%D8%B6%D8%A7` +
          `&filter[_and][${andIdx}][_or][1][_and][0][customer_id][assignment_deadline][_gte]=${encodeURIComponent(nowIso)}` +
          `&filter[_and][${andIdx}][_or][1][_and][1][customer_id][assignment_deadline][_lte]=${encodeURIComponent(in3DaysIso)}`;
        andIdx++;
      } else if (activeFilter === 'due_less_3_days' || activeFilter === 'due_less_7_days' || activeFilter === 'due_less_10_days') {
        const daysNum = activeFilter === 'due_less_3_days' ? 3 : activeFilter === 'due_less_7_days' ? 7 : 10;
        const nowIso = new Date().toISOString();
        const maxIso = new Date(Date.now() + daysNum * 86400000).toISOString();
        directusPath += `&filter[_and][${andIdx}][_or][0][_and][0][next_followup_date][_gte]=${encodeURIComponent(nowIso)}` +
          `&filter[_and][${andIdx}][_or][0][_and][1][next_followup_date][_lte]=${encodeURIComponent(maxIso)}` +
          `&filter[_and][${andIdx}][_or][1][_and][0][customer_id][assignment_deadline][_gte]=${encodeURIComponent(nowIso)}` +
          `&filter[_and][${andIdx}][_or][1][_and][1][customer_id][assignment_deadline][_lte]=${encodeURIComponent(maxIso)}`;
        andIdx++;
      }

      if (status && status !== 'همه') {
        if (String(status) === 'قرارداد' || String(status) === 'قرارداد / فاکتور') {
          directusPath += `&filter[_and][${andIdx++}][negotiation_status][_in]=%D9%82%D8%B1%D8%A7%D8%B1%D8%AF%D8%A7%D8%AF,%D9%82%D8%B1%D8%A7%D8%B1%D8%AF%D8%A7%D8%AF%20%2F%20%D9%81%D8%A7%DA%A9%D8%AA%D9%88%D8%B1,%D9%82%D8%B1%D8%A7%D8%B1%D8%AF%D8%A7%D8%AF%2F%D9%81%D8%A7%DA%A9%D8%AA%D9%88%D8%B1`;
        } else {
          directusPath += `&filter[_and][${andIdx++}][negotiation_status][_eq]=${encodeURIComponent(String(status))}`;
        }
      }

      if (negotiator && negotiator !== 'همه') {
        directusPath += `&filter[_and][${andIdx++}][negotiator_name][_eq]=${encodeURIComponent(String(negotiator))}`;
      }

      if (search && typeof search === 'string' && search.trim()) {
        const s = search.trim();
        directusPath += `&filter[_and][${andIdx}][_or][0][report_text][_icontains]=${encodeURIComponent(s)}` +
          `&filter[_and][${andIdx}][_or][1][negotiator_name][_icontains]=${encodeURIComponent(s)}` +
          `&filter[_and][${andIdx}][_or][2][negotiation_phone][_icontains]=${encodeURIComponent(s)}` +
          `&filter[_and][${andIdx}][_or][3][customer_id][company_name][_icontains]=${encodeURIComponent(s)}` +
          `&filter[_and][${andIdx}][_or][4][customer_id][manager_name][_icontains]=${encodeURIComponent(s)}`;
        andIdx++;
      }

      if (start_date) {
        directusPath += `&filter[_and][${andIdx++}][date_created][_gte]=${encodeURIComponent(String(start_date))}`;
      }
      if (end_date) {
        directusPath += `&filter[_and][${andIdx++}][date_created][_lte]=${encodeURIComponent(String(end_date))}`;
      }

      const defaultReportFields =
        '*,customer_id.id,customer_id.company_name,customer_id.manager_name,customer_id.status,customer_id.province,customer_id.city,customer_id.next_followup_date,customer_id.assignment_deadline,customer_id.is_expired,customer_id.assigned_marketer_id,customer_id.assigned_marketer_name';
      directusPath += `&fields=${encodeURIComponent(fields ? String(fields) : defaultReportFields)}`;

      console.log('[Directus Reports Query] Path:', directusPath);
      const resData = await directusFetch(directusPath, {}, 1).catch((err) => {
        console.error('[Directus Reports Query Error]:', err.message);
        return null;
      });
      console.log('[Directus Reports Query] resData meta:', resData?.meta);
      if (resData && Array.isArray(resData.data)) {
        let items = resData.data;
        const totalCount = resData.meta?.filter_count ?? resData.meta?.total_count ?? items.length;

        // If client specifically requested more than 100 items (e.g. export or unlimited)
        if (reqLimit > 100 && totalCount > items.length && items.length >= 100) {
          const allRes = await directusFetchAllPages(directusPath, {}).catch(() => null);
          if (allRes && Array.isArray(allRes.data) && allRes.data.length > 0) {
            items = allRes.data.slice(0, reqLimit);
          }
        }

        const totalPages = Math.max(1, Math.ceil(totalCount / reqLimit));
        res.setHeader('X-Total-Count', String(totalCount));
        res.setHeader('X-Filter-Count', String(totalCount));
        res.setHeader('X-Page', String(reqPage));
        res.setHeader('X-Limit', String(reqLimit));

        return res.json({
          data: items,
          meta: {
            filter_count: totalCount,
            total_count: totalCount,
            page: reqPage,
            limit: reqLimit,
            total_pages: totalPages,
          },
        });
      }
    } catch (err: any) {
      console.warn('Directus paginated reports query error, falling back to local filter:', err.message);
    }
  }

  const allCustomers = await ensureCustomersCache().catch(() => customersData);
  const rawReports = await ensureReportsCache().catch(() => reportsData);

  // Sort according to requested sort option (default: newest first)
  const allReports = [...rawReports].sort((a, b) => {
    const tA = new Date(a.date_created || 0).getTime();
    const tB = new Date(b.date_created || 0).getTime();
    if (sort === 'oldest') {
      return tA - tB;
    } else if (sort === 'highest_score') {
      const sA = Number(a.negotiation_score) || 0;
      const sB = Number(b.negotiation_score) || 0;
      if (sB !== sA) return sB - sA;
      return tB - tA;
    } else if (sort === 'followup_soonest') {
      const fA = a.next_followup_date ? new Date(a.next_followup_date).getTime() : Infinity;
      const fB = b.next_followup_date ? new Date(b.next_followup_date).getTime() : Infinity;
      if (fA !== fB) return fA - fB;
      return tB - tA;
    }
    return tB - tA;
  });

  const getDaysUntil = (dateIso?: string | null): number | null => {
    if (!dateIso) return null;
    try {
      const target = new Date(dateIso).getTime();
      const now = new Date().getTime();
      const diffMs = target - now;
      return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    } catch {
      return null;
    }
  };

  const isActiveDate = (dateIso?: string | null): boolean => {
    if (!dateIso) return false;
    const days = getDaysUntil(dateIso);
    return days !== null && days >= 0;
  };

  const isExpiredCustomer = (c?: any): boolean => {
    if (!c) return false;
    if (c.is_expired) return true;
    if (c.status === 'قرارداد' || c.status === 'لیست سیاه') return false;
    if (c.assignment_deadline) {
      const days = getDaysUntil(c.assignment_deadline);
      if (days !== null && days < 0) return true;
    }
    return false;
  };

  const applyFilters = (list: any[]) => {
    let result = list;

    if (tenantId && tenantId !== 'all') {
      result = result.filter((r) => matchesTenant(r.tenant_id, tenantId));
    }

    if (customer_id) {
      result = result.filter(
        (r) =>
          String(r.customer_id) === String(customer_id) ||
          (typeof r.customer_id === 'object' &&
            r.customer_id !== null &&
            String((r.customer_id as any).id) === String(customer_id))
      );
    } else if (!canViewAllReports) {
      result = result.filter((r) => {
        const normUserName = normalizePersianString(userName);
        const normNeg = normalizePersianString(r.negotiator_name);
        const matchNegotiator = normUserName && normNeg && (normNeg === normUserName || normNeg.includes(normUserName));
        const matchCreatedBy =
          (userId && String(r.created_by) === String(userId)) ||
          (personnelId && String(r.created_by) === String(personnelId)) ||
          (userName && r.created_by === userName);
        const customer = allCustomers.find(
          (c) =>
            c.id === r.customer_id ||
            (typeof r.customer_id === 'object' && r.customer_id !== null && (r.customer_id as any).id === c.id)
        );
        const matchCustomer =
          customer &&
          (customer.assigned_marketer_id === personnelId ||
            customer.assigned_marketer_id === userId ||
            (userName && customer.assigned_marketer_name === userName));
        return matchNegotiator || matchCreatedBy || matchCustomer;
      });
    }

    if (status && status !== 'همه') {
      if (String(status) === 'قرارداد' || String(status) === 'قرارداد / فاکتور') {
        result = result.filter((r) => {
          const stStr = String(r.negotiation_status);
          return (
            stStr === 'قرارداد' ||
            stStr === 'قرارداد / فاکتور' ||
            stStr === 'قرارداد/فاکتور'
          );
        });
      } else {
        result = result.filter((r) => r.negotiation_status === status);
      }
    }

    if (negotiator && negotiator !== 'همه') {
      result = result.filter((r) => r.negotiator_name === negotiator);
    }

    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((rep) => {
        const customer = allCustomers.find((c) => c.id === rep.customer_id);
        const matchCompany = customer?.company_name?.toLowerCase().includes(q);
        const matchReport = rep.report_text?.toLowerCase().includes(q);
        const matchPhone = rep.negotiation_phone?.includes(q);
        const matchNegotiator = rep.negotiator_name?.toLowerCase().includes(q);
        return Boolean(matchCompany || matchReport || matchPhone || matchNegotiator);
      });
    }

    if (start_date) {
      const sMs = new Date(String(start_date)).getTime();
      result = result.filter((r) => r.date_created && new Date(r.date_created).getTime() >= sMs);
    }
    if (end_date) {
      const eMs = new Date(String(end_date)).getTime();
      result = result.filter((r) => r.date_created && new Date(r.date_created).getTime() <= eMs);
    }

    if (canViewAllReports && admin_filter && admin_filter !== 'all') {
      switch (admin_filter) {
        case 'active_followups':
          result = result.filter((r) => {
            const customer = allCustomers.find((c) => c.id === r.customer_id);
            const followupDate = r.next_followup_date || customer?.next_followup_date;
            return isActiveDate(followupDate);
          });
          break;
        case 'no_followup':
          result = result.filter((r) => {
            const customer = allCustomers.find((c) => c.id === r.customer_id);
            const followupDate = r.next_followup_date || customer?.next_followup_date;
            return !followupDate;
          });
          break;
        case 'latest_reports': {
          const latestMap = new Map<string, any>();
          for (const rep of result) {
            if (!latestMap.has(rep.customer_id)) {
              latestMap.set(rep.customer_id, rep);
            }
          }
          result = Array.from(latestMap.values());
          break;
        }
        case 'expired_customers':
          result = result.filter((r) => {
            const customer = allCustomers.find((c) => c.id === r.customer_id);
            return isExpiredCustomer(customer);
          });
          break;
        case 'near_expiry_customers':
          result = result.filter((r) => {
            const customer = allCustomers.find((c) => c.id === r.customer_id);
            if (!customer) return false;
            if (customer.status === 'پیگیری قبل از انقضا') return true;
            if (customer.assignment_deadline) {
              const days = getDaysUntil(customer.assignment_deadline);
              return days !== null && days >= 0 && days <= 3;
            }
            return false;
          });
          break;
      }
    } else if (!canViewAllReports && staff_filter) {
      switch (staff_filter) {
        case 'active_followups':
          result = result.filter((r) => {
            const customer = allCustomers.find((c) => c.id === r.customer_id);
            const followupDate = r.next_followup_date || customer?.next_followup_date;
            return isActiveDate(followupDate);
          });
          break;
        case 'no_followup':
          result = result.filter((r) => {
            const customer = allCustomers.find((c) => c.id === r.customer_id);
            const followupDate = r.next_followup_date || customer?.next_followup_date;
            return !followupDate;
          });
          break;
        case 'due_less_3_days':
        case 'due_less_7_days':
        case 'due_less_10_days': {
          const maxDays = staff_filter === 'due_less_3_days' ? 3 : staff_filter === 'due_less_7_days' ? 7 : 10;
          result = result.filter((r) => {
            const customer = allCustomers.find((c) => c.id === r.customer_id);
            const followupDate = r.next_followup_date || customer?.next_followup_date;
            const deadline = customer?.assignment_deadline;
            const daysF = getDaysUntil(followupDate);
            const daysD = getDaysUntil(deadline);
            return (
              (daysF !== null && daysF >= 0 && daysF <= maxDays) ||
              (daysD !== null && daysD >= 0 && daysD <= maxDays)
            );
          });
          break;
        }
        case 'expired':
          result = result.filter((r) => {
            const customer = allCustomers.find((c) => c.id === r.customer_id);
            return isExpiredCustomer(customer);
          });
          break;
      }
    }

    return result;
  };

  const filtered = applyFilters(allReports);
  const totalCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / reqLimit));
  const startIndex = (reqPage - 1) * reqLimit;
  const paginatedList = isUnlimited
    ? filtered
    : filtered.slice(startIndex, startIndex + reqLimit);

  res.setHeader('X-Total-Count', String(totalCount));
  res.setHeader('X-Filter-Count', String(totalCount));
  res.setHeader('X-Page', String(reqPage));
  res.setHeader('X-Limit', String(reqLimit));

  if (isUnlimited) {
    return res.json(paginatedList);
  }

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

router.post('/', async (req: Request, res: Response) => {
  const { userId, personnelId, userName } = getRequestUser(req);
  const payload = req.body;

  if (!payload.customer_id || !payload.report_text) {
    return res.status(400).json({ error: 'شناسه مشتری و متن گزارش الزامی است.' });
  }

  const nowIso = new Date().toISOString();
  const newReportId = payload.id || crypto.randomUUID();

  let rawCreatorId = payload.created_by || personnelId || userId || null;
  const safeCreatedByFk = await getSafeDirectusPersonnelForeignKey(
    rawCreatorId,
    payload.negotiator_name || userName
  );

  let nextFollowupIso: string | null = payload.next_followup_date || null;
  if (!nextFollowupIso || String(nextFollowupIso).trim() === '') {
    nextFollowupIso = null;
  } else {
    try {
      nextFollowupIso = new Date(nextFollowupIso).toISOString();
    } catch {
      nextFollowupIso = null;
    }
  }

  let contractDateIso: string | null = payload.contract_date || null;
  if (contractDateIso) {
    try {
      contractDateIso = new Date(contractDateIso).toISOString();
    } catch {
      contractDateIso = null;
    }
  }

  const newReport: CustomerReport = {
    id: newReportId,
    customer_id: payload.customer_id,
    negotiator_name: (payload.negotiator_name || userName || 'کارشناس').trim(),
    negotiation_phone: (payload.negotiation_phone || '').trim(),
    report_text: (payload.report_text || '').trim(),
    negotiation_score: Number(payload.negotiation_score) || 5,
    next_followup_date: nextFollowupIso,
    negotiation_status: payload.negotiation_status || 'تماس برقرار نشده',
    created_by: safeCreatedByFk || undefined,
    date_created: payload.date_created || nowIso,
    contract_number: payload.contract_number ? String(payload.contract_number).trim() : null,
    contract_date: contractDateIso,
    contract_items: payload.contract_items ? String(payload.contract_items).trim() : null,
    contract_amount: payload.contract_amount ? Number(payload.contract_amount) : null,
  };

  if (directusUrl && directusAdminToken) {
    try {
      const targetTenantId = payload.tenant_id || getRequestTenantId(req) || 'default';
      const tenantNum = resolveDirectusTenantId(targetTenantId) || 1;
      const directusReportPayload: Record<string, any> = {
        ...newReport,
        created_by: safeCreatedByFk,
        tenant_id: tenantNum,
      };

      const created = await directusFetch('/items/customer_reports', {
        method: 'POST',
        body: JSON.stringify(directusReportPayload),
      });

      const custRes = await directusFetch(`/items/customers/${payload.customer_id}`).catch(
        () => null
      );
      if (custRes?.data) {
        const custPatch: Record<string, any> = {
          status: payload.negotiation_status || custRes.data.status,
          date_updated: nowIso,
        };
        if (nextFollowupIso) {
          custPatch.next_followup_date = nextFollowupIso;
        }

        const cleanCustPatch = cleanCustomerPayloadForDirectus(
          { ...custRes.data, ...custPatch },
          payload.customer_id
        );
        delete cleanCustPatch.date_created;

        await directusFetch(`/items/customers/${payload.customer_id}`, {
          method: 'PATCH',
          body: JSON.stringify(cleanCustPatch),
        }).catch(() => {});
      }

      invalidateCustomersCache();
      invalidateReportsCache();

      return res.status(201).json(created.data || newReport);
    } catch (err: any) {
      console.error('Customer report create Directus error:', err.message);
      return res.status(500).json({
        error: 'REPORT_SAVE_FAILED',
        message: `خطا در ثبت گزارش در پایگاه داده مرکزی: ${err.message}`,
      });
    }
  }

  reportsData.unshift(newReport);

  const custIdx = customersData.findIndex((c) => c.id === payload.customer_id);
  if (custIdx >= 0) {
    customersData[custIdx].status =
      payload.negotiation_status || customersData[custIdx].status;
    if (nextFollowupIso) {
      customersData[custIdx].next_followup_date = nextFollowupIso;
    }
    customersData[custIdx].date_updated = nowIso;
  }

  invalidateCustomersCache();
  invalidateReportsCache();

  res.status(201).json(newReport);
});

router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { isAdmin, isPersonnelAdmin } = getRequestUser(req);

  if (!isAdmin && !isPersonnelAdmin) {
    return res.status(403).json({ error: 'فقط مدیر سیستم اجازه حذف گزارش مذاکره را دارد.' });
  }

  if (directusUrl && directusAdminToken) {
    try {
      await directusFetch(`/items/customer_reports/${id}`, { method: 'DELETE' });
      invalidateReportsCache();
      return res.status(204).send();
    } catch (err: any) {
      return res.status(500).json({
        error: 'REPORT_DELETE_FAILED',
        message: `خطا در حذف گزارش: ${err.message}`,
      });
    }
  }

  const idx = reportsData.findIndex((r) => r.id === id);
  if (idx >= 0) {
    reportsData.splice(idx, 1);
  }
  invalidateReportsCache();
  res.status(204).send();
});

export default router;
