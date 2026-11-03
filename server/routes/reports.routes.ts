import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import {
  directusUrl,
  directusAdminToken,
  reportsData,
  customersData,
} from '../config.ts';
import { directusFetch, directusFetchAllPages, directusSafeBatchPatch } from '../directus/client.ts';
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

export function normalizeToIsoDateTime(dateVal?: any): string | null {
  if (dateVal === undefined || dateVal === null || dateVal === '') return null;

  const num = typeof dateVal === 'number' ? dateVal : Number(String(dateVal).trim());
  if (!isNaN(num) && num > 20000 && num < 60000) {
    try {
      const ms = Math.round((num - 25569) * 86400 * 1000);
      const d = new Date(ms);
      if (!isNaN(d.getTime())) return d.toISOString();
    } catch {}
  }

  const str = String(dateVal).trim();

  if (/^1[34]\d\d[\/\-]/.test(str)) {
    try {
      const parts = str.split(/\s+/);
      const datePart = parts[0];
      const timePart = parts[1] || '00:00:00';
      const [jy, jm, jd] = datePart.split(/[\/\-]/).map((p) => parseInt(p, 10));
      if (!isNaN(jy) && !isNaN(jm) && !isNaN(jd)) {
        let y = jy - 979, m = jm - 1, d = jd - 1;
        let j_day_no = 365 * y + Math.floor(y / 33) * 8 + Math.floor(((y % 33) + 3) / 4);
        for (let i = 0; i < m; ++i) j_day_no += i < 6 ? 31 : 30;
        j_day_no += d;
        let g_day_no = j_day_no + 79;
        let gy = 1600 + 400 * Math.floor(g_day_no / 146097);
        g_day_no = g_day_no % 146097;
        let leap = true;
        if (g_day_no >= 36525) {
          g_day_no--; gy += 100 * Math.floor(g_day_no / 36524); g_day_no = g_day_no % 36524;
          if (g_day_no >= 365) gy++; else leap = false;
        }
        gy += 4 * Math.floor(g_day_no / 1461); g_day_no %= 1461;
        if (g_day_no >= 366) { leap = false; g_day_no--; gy += Math.floor(g_day_no / 365); g_day_no = g_day_no % 365; }
        const g_days_in_month = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        let gm = 0;
        while (gm < 12 && g_day_no >= g_days_in_month[gm]) { g_day_no -= g_days_in_month[gm]; gm++; }
        const isoStr = `${gy}-${String(gm + 1).padStart(2, '0')}-${String(g_day_no + 1).padStart(2, '0')}T${timePart}`;
        const dt = new Date(isoStr);
        if (!isNaN(dt.getTime())) return dt.toISOString();
      }
    } catch {}
  }

  let d = new Date(str);
  if (isNaN(d.getTime())) d = new Date(str.replace(' ', 'T'));
  if (!isNaN(d.getTime())) return d.toISOString();

  return null;
}

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

  const activeFilter = String(admin_filter || staff_filter || '');

  // Determine sort parameter (default: -date_created -> newest first, or next_followup_date for active_followups)
  let sortParam = '-date_created';
  if (sort === 'oldest') {
    sortParam = 'date_created';
  } else if (sort === 'highest_score') {
    sortParam = '-negotiation_score,-date_created';
  } else if (sort === 'followup_soonest' || (activeFilter === 'active_followups' && sort !== 'oldest' && sort !== 'highest_score' && sort !== 'newest_explicit')) {
    sortParam = 'next_followup_date,-date_created';
  } else if (activeFilter === 'overdue_followups' && sort !== 'oldest' && sort !== 'highest_score' && sort !== 'newest_explicit') {
    sortParam = '-next_followup_date,-date_created';
  }

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

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const startOfTodayIso = startOfToday.toISOString();

      // Handle category tab filters directly in Directus
      if (activeFilter === 'active_followups') {
        // Active follow-ups MUST only include dates that have not passed yet (>= start of today)
        directusPath += `&filter[_and][${andIdx++}][next_followup_date][_gte]=${encodeURIComponent(startOfTodayIso)}`;
      } else if (activeFilter === 'overdue_followups') {
        // Overdue follow-ups: follow-up date is in the past (< start of today)
        directusPath += `&filter[_and][${andIdx++}][next_followup_date][_nnull]=true`;
        directusPath += `&filter[_and][${andIdx++}][next_followup_date][_lt]=${encodeURIComponent(startOfTodayIso)}`;
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
        case 'overdue_followups':
          result = result.filter((r) => {
            const customer = allCustomers.find((c) => c.id === r.customer_id);
            const followupDate = r.next_followup_date || customer?.next_followup_date;
            if (!followupDate) return false;
            const days = getDaysUntil(followupDate);
            return days !== null && days < 0;
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
        case 'overdue_followups':
          result = result.filter((r) => {
            const customer = allCustomers.find((c) => c.id === r.customer_id);
            const followupDate = r.next_followup_date || customer?.next_followup_date;
            if (!followupDate) return false;
            const days = getDaysUntil(followupDate);
            return days !== null && days < 0;
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

  // Apply in-memory sort before slicing for pagination
  const effectiveSort = (sort === 'followup_soonest' || (activeFilter === 'active_followups' && sort !== 'oldest' && sort !== 'highest_score' && sort !== 'newest_explicit'))
    ? 'followup_soonest'
    : (activeFilter === 'overdue_followups' && sort !== 'oldest' && sort !== 'highest_score' && sort !== 'newest_explicit')
    ? 'followup_overdue'
    : (sort || 'newest');

  filtered.sort((a: any, b: any) => {
    if (effectiveSort === 'followup_soonest') {
      const customerA = allCustomers.find((c) => c.id === a.customer_id);
      const customerB = allCustomers.find((c) => c.id === b.customer_id);
      const dateAStr = a.next_followup_date || customerA?.next_followup_date;
      const dateBStr = b.next_followup_date || customerB?.next_followup_date;
      const tA = dateAStr ? new Date(dateAStr).getTime() : Infinity;
      const tB = dateBStr ? new Date(dateBStr).getTime() : Infinity;
      if (tA !== tB) return tA - tB;
      const cA = a.date_created ? new Date(a.date_created).getTime() : 0;
      const cB = b.date_created ? new Date(b.date_created).getTime() : 0;
      return cB - cA;
    } else if (effectiveSort === 'followup_overdue') {
      const customerA = allCustomers.find((c) => c.id === a.customer_id);
      const customerB = allCustomers.find((c) => c.id === b.customer_id);
      const dateAStr = a.next_followup_date || customerA?.next_followup_date;
      const dateBStr = b.next_followup_date || customerB?.next_followup_date;
      const tA = dateAStr ? new Date(dateAStr).getTime() : -Infinity;
      const tB = dateBStr ? new Date(dateBStr).getTime() : -Infinity;
      if (tA !== tB) return tB - tA;
      const cA = a.date_created ? new Date(a.date_created).getTime() : 0;
      const cB = b.date_created ? new Date(b.date_created).getTime() : 0;
      return cB - cA;
    } else if (effectiveSort === 'oldest') {
      const cA = a.date_created ? new Date(a.date_created).getTime() : 0;
      const cB = b.date_created ? new Date(b.date_created).getTime() : 0;
      return cA - cB;
    } else if (effectiveSort === 'highest_score') {
      const sA = Number(a.negotiation_score) || 0;
      const sB = Number(b.negotiation_score) || 0;
      if (sB !== sA) return sB - sA;
      const cA = a.date_created ? new Date(a.date_created).getTime() : 0;
      const cB = b.date_created ? new Date(b.date_created).getTime() : 0;
      return cB - cA;
    } else {
      const cA = a.date_created ? new Date(a.date_created).getTime() : 0;
      const cB = b.date_created ? new Date(b.date_created).getTime() : 0;
      return cB - cA;
    }
  });

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
    customer_negotiator_name: payload.customer_negotiator_name ? String(payload.customer_negotiator_name).trim() : null,
    negotiation_phone: (payload.negotiation_phone || '').trim(),
    report_text: (payload.report_text || '').trim(),
    negotiation_score: Number(payload.negotiation_score) || 5,
    next_followup_date: nextFollowupIso,
    negotiation_status: payload.negotiation_status || 'تماس برقرار نشده',
    created_by: safeCreatedByFk || undefined,
    date_created: (payload.date_created ? normalizeToIsoDateTime(payload.date_created) : null) || nowIso,
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

let repairReportsCache: any[] | null = null;
let repairReportsCacheTime = 0;

// POST /api/reports/repair-negotiators - Fast & Safe Repair of negotiator_name & next_followup_date for legacy imported reports
router.post('/repair-negotiators', async (req: Request, res: Response) => {
  const { items, dry_run, repair_negotiators, repair_followups, repair_type } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'آرایه رکوردهای فایل ارسال نشده است.' });
  }

  const repairNegotiatorsOpt = repair_negotiators !== false && repair_type !== 'followup_date';
  const repairFollowupsOpt = repair_followups !== false && repair_type !== 'negotiator';

  const isDryRun = dry_run !== false;

  // 1. Fetch all existing customer reports with in-memory caching
  let existingReports: any[] = [];
  if (repairReportsCache && Date.now() - repairReportsCacheTime < 5 * 60 * 1000) {
    existingReports = repairReportsCache;
  } else if (directusUrl && directusAdminToken) {
    try {
      const directusRes = await directusFetchAllPages(
        '/items/customer_reports?fields=id,negotiation_phone,date_created,negotiator_name,customer_negotiator_name,next_followup_date,report_text',
        {},
        100000
      );
      existingReports = directusRes.data || [];
      repairReportsCache = existingReports;
      repairReportsCacheTime = Date.now();
    } catch (e: any) {
      console.warn('Failed to fetch Directus reports for repair, fallback to cache:', e.message);
      existingReports = await ensureReportsCache().catch(() => reportsData);
    }
  } else {
    existingReports = await ensureReportsCache().catch(() => reportsData);
  }

  const getPhoneDigits = (str?: string | null): string => {
    if (!str) return '';
    let clean = String(str).replace(/[^\d]/g, '');
    if (clean.startsWith('0098') && clean.length > 12) {
      clean = clean.slice(4);
    } else if (clean.startsWith('98') && clean.length === 12) {
      clean = clean.slice(2);
    }
    return clean.replace(/^0+/, '');
  };

  const CP1252_REVERSE_MAP: Record<number, number> = {
    0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84, 0x2026: 0x85, 0x2020: 0x86,
    0x2021: 0x87, 0x02C6: 0x88, 0x2030: 0x89, 0x0160: 0x8A, 0x2039: 0x8B, 0x0152: 0x8C,
    0x017D: 0x8E, 0x2018: 0x91, 0x2019: 0x92, 0x201C: 0x93, 0x201D: 0x94, 0x2022: 0x95,
    0x2013: 0x96, 0x2014: 0x97, 0x02DC: 0x98, 0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B,
    0x0153: 0x9C, 0x017E: 0x9E, 0x0178: 0x9F,
  };

  const fixMojibake = (str?: string | null): string => {
    if (!str || typeof str !== 'string') return '';
    if (/[ØÙÛÚ]/.test(str)) {
      try {
        const bytes = new Uint8Array(
          [...str].map((ch) => {
            const code = ch.charCodeAt(0);
            return CP1252_REVERSE_MAP[code] || (code <= 0xFF ? code : 0x3F);
          })
        );
        const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
        if (decoded && !/[\uFFFD]/.test(decoded)) {
          return decoded;
        }
      } catch {}
    }
    return str;
  };

  const jalaliToGregorian = (jy: number, jm: number, jd: number) => {
    jy = jy - 979;
    jm = jm - 1;
    jd = jd - 1;
    let j_day_no = 365 * jy + Math.floor(jy / 33) * 8 + Math.floor(((jy % 33) + 3) / 4);
    for (let i = 0; i < jm; ++i) j_day_no += i < 6 ? 31 : 30;
    j_day_no += jd;
    let g_day_no = j_day_no + 79;
    let gy = 1600 + 400 * Math.floor(g_day_no / 146097);
    g_day_no = g_day_no % 146097;
    let leap = true;
    if (g_day_no >= 36525) {
      g_day_no--;
      gy += 100 * Math.floor(g_day_no / 36524);
      g_day_no = g_day_no % 36524;
      if (g_day_no >= 365) g_day_no++;
      else leap = false;
    }
    gy += 4 * Math.floor(g_day_no / 1461);
    g_day_no %= 1461;
    if (g_day_no >= 366) {
      leap = false;
      g_day_no--;
      gy += Math.floor(g_day_no / 365);
      g_day_no = g_day_no % 365;
    }
    const g_days_in_month = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let gm = 0;
    while (gm < 12 && g_day_no >= g_days_in_month[gm]) {
      g_day_no -= g_days_in_month[gm];
      gm++;
    }
    return { gy, gm: gm + 1, gd: g_day_no + 1 };
  };

  const parseTimeMs = (dateVal?: any): number => {
    if (!dateVal) return NaN;
    if (typeof dateVal === 'number' && dateVal > 20000 && dateVal < 60000) {
      return Math.round((dateVal - 25569) * 86400 * 1000);
    }
    const str = String(dateVal).trim();
    const num = Number(str);
    if (!isNaN(num) && num > 20000 && num < 60000) {
      return Math.round((num - 25569) * 86400 * 1000);
    }
    if (/^1[34]\d\d[\/\-]/.test(str)) {
      try {
        const parts = str.split(/\s+/);
        const datePart = parts[0];
        const timePart = parts[1] || '00:00:00';
        const [jy, jm, jd] = datePart.split(/[\/\-]/).map((p) => parseInt(p, 10));
        if (!isNaN(jy) && !isNaN(jm) && !isNaN(jd)) {
          const g = jalaliToGregorian(jy, jm, jd);
          const iso = `${g.gy}-${String(g.gm).padStart(2, '0')}-${String(g.gd).padStart(2, '0')}T${timePart}`;
          const t = new Date(iso).getTime();
          if (!isNaN(t)) return t;
        }
      } catch {}
    }
    let ms = new Date(str).getTime();
    if (isNaN(ms)) {
      ms = new Date(str.replace(' ', 'T')).getTime();
    }
    return ms;
  };

  // Build O(1) phone and minute time indexes
  const phoneMap = new Map<string, any[]>();
  const minuteMap = new Map<number, any[]>();

  for (const rep of existingReports) {
    const pDigits = getPhoneDigits(rep.negotiation_phone);
    if (pDigits) {
      if (!phoneMap.has(pDigits)) phoneMap.set(pDigits, []);
      phoneMap.get(pDigits)!.push(rep);

      if (pDigits.length > 10) {
        const last10 = pDigits.slice(-10);
        if (!phoneMap.has(last10)) phoneMap.set(last10, []);
        phoneMap.get(last10)!.push(rep);
      }
    }

    if (rep.date_created) {
      const ms = parseTimeMs(rep.date_created);
      if (!isNaN(ms)) {
        const minKey = Math.floor(ms / 60000);
        if (!minuteMap.has(minKey)) minuteMap.set(minKey, []);
        minuteMap.get(minKey)!.push(rep);
      }
    }
  }

  const totalInputRows = items.length;
  let matchedCount = 0;
  let needsUpdateCount = 0;
  let alreadyMatchingCount = 0;
  let unmatchedCount = 0;

  const patchItemsMap = new Map<string, any>();
  const previewUpdates: any[] = [];
  const unmatchedSamples: any[] = [];

  for (const r of items) {
    const getVal = (aliases: string[]): string => {
      for (const a of aliases) {
        if (r[a] !== undefined && r[a] !== null && String(r[a]).trim() !== '') {
          return String(r[a]).trim();
        }
        const found = Object.keys(r).find((k) => k.trim().toLowerCase() === a.toLowerCase());
        if (found && r[found] !== undefined && r[found] !== null && String(r[found]).trim() !== '') {
          return String(r[found]).trim();
        }
      }
      return '';
    };

    const rawPhone = getVal(['callNum', 'call_num', 'negotiation_phone', 'phone', 'mobile', 'شماره تماس', 'تلفن', 'موبایل', 'شماره']);
    const rawDate = getVal(['insertDate', 'insert_date', 'date_created', 'dateTime', 'datetime', 'updateDate', 'تاریخ ثبت', 'تاریخ']);
    const rawNegotiator = getVal(['negotiator', 'negotiator_name', 'user', 'personnel_name', 'مذاکره‌کننده', 'مذاکره کننده', 'نام مذاکره کننده', 'طرف مذاکره']);
    const rawReportSnippet = getVal(['report', 'report_text', 'گزارش', 'متن گزارش', 'شرح مذاکره']);

    let rawNextDate = getVal([
      'nextFollow',
      'next_followup_date',
      'next_followup',
      'next_date',
      'nextDate',
      'next_follow',
      'تاریخ پیگیری بعدی',
      'تاریخ پیگیری',
      'موعد پیگیری',
    ]);

    if (!rawNextDate) {
      const nextP = getVal(['next', 'تاریخ پیگیری']);
      const followP = getVal(['follow', 'زمان پیگیری', 'ساعت پیگیری']);
      if (nextP) {
        rawNextDate = followP ? `${nextP} ${followP}` : nextP;
      }
    }

    if (!rawNegotiator && !rawNextDate) {
      unmatchedCount++;
      if (unmatchedSamples.length < 20) unmatchedSamples.push({ ...r, reason: 'اطلاعات نام یا تاریخ پیگیری در فایل موجود نیست' });
      continue;
    }

    const cleanTargetNegotiator = fixMojibake(rawNegotiator.trim());
    const normNextDate = normalizeToIsoDateTime(rawNextDate);
    const pDigits = getPhoneDigits(rawPhone);

    let candidates: any[] = [];
    if (pDigits) {
      candidates = phoneMap.get(pDigits) || (pDigits.length > 10 ? phoneMap.get(pDigits.slice(-10)) : undefined) || [];
    }

    // Fallback search by time window +/- 15 minutes if no phone match
    if (candidates.length === 0) {
      const incomingTime = parseTimeMs(rawDate);
      if (!isNaN(incomingTime)) {
        const incMin = Math.floor(incomingTime / 60000);
        for (let m = incMin - 15; m <= incMin + 15; m++) {
          const list = minuteMap.get(m);
          if (list) {
            candidates.push(...list);
          }
        }
      }
    }

    if (candidates.length === 0) {
      unmatchedCount++;
      if (unmatchedSamples.length < 20) unmatchedSamples.push({ ...r, reason: 'گزارشی با این شماره یا تاریخ در سیستم پیدا نشد' });
      continue;
    }

    let bestMatch: any = null;
    let bestScore = -1;
    const incomingTime = parseTimeMs(rawDate);

    for (const c of candidates) {
      let score = 0;

      // 1. Phone match score
      if (pDigits && c.negotiation_phone) {
        const cPhoneDigits = getPhoneDigits(c.negotiation_phone);
        if (cPhoneDigits && (cPhoneDigits === pDigits || cPhoneDigits.endsWith(pDigits) || pDigits.endsWith(cPhoneDigits))) {
          score += 100;
        }
      }

      // 2. Time proximity score (minute window tolerance)
      if (!isNaN(incomingTime) && c.date_created) {
        const cTime = parseTimeMs(c.date_created);
        if (!isNaN(cTime)) {
          const diffMinutes = Math.abs(Math.round((cTime - incomingTime) / 60000));
          if (diffMinutes === 0) {
            score += 120; // Exact minute match!
          } else if (diffMinutes <= 2) {
            score += 90;  // Within 2 minutes
          } else if (diffMinutes <= 10) {
            score += 50;  // Within 10 minutes
          } else if (diffMinutes <= 60) {
            score += 20;  // Within 1 hour
          }
        }
      }

      // 3. Report snippet text match
      if (rawReportSnippet && c.report_text) {
        const cleanSnippet = rawReportSnippet.slice(0, 15).replace(/[^\w\u0600-\u06FF]/g, '').trim();
        const cleanCReport = c.report_text.slice(0, 30).replace(/[^\w\u0600-\u06FF]/g, '').trim();
        if (cleanSnippet && cleanCReport && (cleanCReport.includes(cleanSnippet) || cleanSnippet.includes(cleanCReport))) {
          score += 150; // High confidence on report text match
        }
      }

      // 4. Negotiator / Staff name match
      if (rawNegotiator && c.negotiator_name) {
        const normN1 = fixMojibake(rawNegotiator).trim();
        const normN2 = fixMojibake(c.negotiator_name).trim();
        if (normN1 && normN2 && (normN1 === normN2 || normN1.includes(normN2) || normN2.includes(normN1))) {
          score += 30;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = c;
      }
    }

    // Threshold check for non-phone matching: require score >= 80 to avoid false positives
    if (!pDigits && bestScore < 80) {
      unmatchedCount++;
      if (unmatchedSamples.length < 20) unmatchedSamples.push({ ...r, reason: 'گزارش بدون شماره تلفن، تطبیق زمان یا متن کافی در سیستم نداشت' });
      continue;
    }

    if (!bestMatch) {
      unmatchedCount++;
      if (unmatchedSamples.length < 20) unmatchedSamples.push({ ...r, reason: 'هیچ رکوردی برای تطبیق یافت نشد' });
      continue;
    }

    matchedCount++;
    const currentCustomerNegotiator = (bestMatch.customer_negotiator_name || '').trim();
    const currentFollowupDate = bestMatch.next_followup_date || null;

    const negotiatorNeedsUpdate = repairNegotiatorsOpt && Boolean(cleanTargetNegotiator) && (currentCustomerNegotiator !== cleanTargetNegotiator);
    const followupNeedsUpdate = repairFollowupsOpt && Boolean(normNextDate) && (currentFollowupDate !== normNextDate);

    if (negotiatorNeedsUpdate || followupNeedsUpdate) {
      needsUpdateCount++;
      const patchObj: Record<string, any> = { id: bestMatch.id };
      if (negotiatorNeedsUpdate) {
        patchObj.customer_negotiator_name = cleanTargetNegotiator;
      }
      if (followupNeedsUpdate) {
        patchObj.next_followup_date = normNextDate;
      }
      patchItemsMap.set(bestMatch.id, patchObj);

      if (previewUpdates.length < 100) {
        previewUpdates.push({
          id: bestMatch.id,
          phone: bestMatch.negotiation_phone || rawPhone,
          insertDate: bestMatch.date_created || rawDate,
          current_negotiator: fixMojibake(currentCustomerNegotiator) || '(خالی)',
          new_negotiator: fixMojibake(cleanTargetNegotiator),
          current_followup_date: currentFollowupDate,
          new_followup_date: normNextDate,
          negotiator_changed: negotiatorNeedsUpdate,
          followup_changed: followupNeedsUpdate,
        });
      }
    } else {
      alreadyMatchingCount++;
    }
  }

  if (isDryRun) {
    return res.json({
      dry_run: true,
      total_input_rows: totalInputRows,
      matched_count: matchedCount,
      needs_update_count: needsUpdateCount,
      already_matching_count: alreadyMatchingCount,
      unmatched_count: unmatchedCount,
      preview_updates: previewUpdates,
      unmatched_samples: unmatchedSamples,
    });
  }

  // Execute Batch Patching
  if (directusUrl && directusAdminToken && patchItemsMap.size > 0) {
    await directusSafeBatchPatch('customer_reports', patchItemsMap, 50);
  }

  // Update in-memory fallback
  for (const [id, patch] of patchItemsMap.entries()) {
    const idx = reportsData.findIndex((r) => r.id === id);
    if (idx >= 0) {
      if (patch.customer_negotiator_name !== undefined) {
        reportsData[idx].customer_negotiator_name = patch.customer_negotiator_name;
      }
      if (patch.next_followup_date !== undefined) {
        reportsData[idx].next_followup_date = patch.next_followup_date;
      }
    }
  }

  repairReportsCache = null;
  invalidateReportsCache();

  return res.json({
    dry_run: false,
    success: true,
    total_updated: patchItemsMap.size,
    message: `اطلاعات (طرف مذاکره و تاریخ پیگیری بعدی) برای ${patchItemsMap.size} گزارش با موفقیت در پایگاه داده ترمیم و ذخیره شد.`,
  });
});

export default router;
