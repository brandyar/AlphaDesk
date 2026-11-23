import { Router, Request, Response } from 'express';
import {
  directusUrl,
  directusAdminToken,
  reportsData,
  customersData,
  personnelData,
} from '../config.ts';
import { directusFetch } from '../directus/client.ts';
import { ensureReportsCache, ensureCustomersCache } from '../directus/cache.ts';
import { resolveDirectusTenantId } from '../directus/sync.ts';
import { getRequestUser } from '../middlewares/auth.middleware.ts';
import { normalizePersianString } from '../services/phoneNormalizer.ts';

const router = Router();

// In-memory response cache to prevent database load spikes and deliver <5ms instant analytics responses
interface AnalyticsCacheEntry {
  timestamp: number;
  data: any;
}
const analyticsCache = new Map<string, AnalyticsCacheEntry>();
const ANALYTICS_CACHE_TTL = 30000; // 30 seconds

export function invalidateAnalyticsCache() {
  analyticsCache.clear();
}

const CONTRACT_STATUS_IN =
  '%D9%82%D8%B1%D8%A7%D8%B1%D8%AF%D8%A7%D8%AF,%D9%82%D8%B1%D8%A7%D8%B1%D8%AF%D8%A7%D8%AF%20%2F%20%D9%81%D8%A7%DA%A9%D8%AA%D9%88%D8%B1,%D9%82%D8%B1%D8%A7%D8%B1%D8%AF%D8%A7%D8%AF%2F%D9%81%D8%A7%DA%A9%D8%AA%D9%88%D8%B1';

function isContractReportRecord(r: any): boolean {
  if (!r) return false;
  const st = String(r.negotiation_status || '').trim();
  if (st === 'قرارداد' || st === 'قرارداد / فاکتور' || st === 'قرارداد/فاکتور') return true;
  if (r.contract_number && String(r.contract_number).trim() !== '') return true;
  if (r.contract_amount && Number(r.contract_amount) > 0) return true;
  return false;
}

function extractAggregateCount(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'object') {
    const first = val['*'] ?? Object.values(val)[0];
    return Number(first || 0) || 0;
  }
  return Number(val || 0) || 0;
}

function buildContractAndClause(idx: number): string {
  return (
    `&filter[_and][${idx}][_or][0][negotiation_status][_in]=${CONTRACT_STATUS_IN}` +
    `&filter[_and][${idx}][_or][1][contract_amount][_gt]=0` +
    `&filter[_and][${idx}][_or][2][contract_number][_nempty]=true`
  );
}

function buildAnalyticsReportFilter(params: {
  tenantId?: string;
  startDate?: string;
  endDate?: string;
  canViewAllAnalytics: boolean;
  targetNegotiator: string;
  userName?: string;
  personnelId?: string;
  userId?: string;
}): { filterParams: string; nextAndIdx: number } {
  let filterParams = '';
  let andIdx = 0;

  // Tenant filter: only apply for secondary branches (tenantNum > 1), matching reports.routes.ts & system.routes.ts
  if (params.tenantId && params.tenantId !== 'all') {
    const tenantNum = resolveDirectusTenantId(params.tenantId);
    if (tenantNum && tenantNum > 1) {
      filterParams += `&filter[_and][${andIdx++}][tenant_id][_eq]=${tenantNum}`;
    }
  }

  if (params.startDate) {
    filterParams += `&filter[_and][${andIdx++}][date_created][_gte]=${encodeURIComponent(params.startDate)}`;
  }
  if (params.endDate) {
    filterParams += `&filter[_and][${andIdx++}][date_created][_lte]=${encodeURIComponent(params.endDate)}`;
  }

  if (!params.canViewAllAnalytics) {
    let resolvedName = (params.userName || '').trim();
    if (!resolvedName && params.personnelId) {
      const found = personnelData.find(
        (p) => String(p.id) === String(params.personnelId) || String(p.user_id) === String(params.personnelId)
      );
      if (found?.name) resolvedName = found.name.trim();
    }
    const normName = resolvedName ? normalizePersianString(resolvedName) : '';

    let repOr = 0;
    if (resolvedName) {
      filterParams += `&filter[_and][${andIdx}][_or][${repOr++}][negotiator_name][_icontains]=${encodeURIComponent(resolvedName)}`;
      if (normName && normName !== resolvedName) {
        filterParams += `&filter[_and][${andIdx}][_or][${repOr++}][negotiator_name][_icontains]=${encodeURIComponent(normName)}`;
      }
    } else if (params.personnelId) {
      // Fallback if name could not be resolved
      const pIdStr = String(params.personnelId).trim();
      filterParams += `&filter[_and][${andIdx}][_or][${repOr++}][customer_id][assigned_marketer_id][_eq]=${encodeURIComponent(pIdStr)}`;
    }
    if (repOr > 0) {
      andIdx++;
    }
  } else if (params.targetNegotiator) {
    const cleanTarget = params.targetNegotiator.trim();
    const normTarget = normalizePersianString(cleanTarget);
    let repOr = 0;
    filterParams += `&filter[_and][${andIdx}][_or][${repOr++}][negotiator_name][_icontains]=${encodeURIComponent(cleanTarget)}`;
    if (normTarget && normTarget !== cleanTarget) {
      filterParams += `&filter[_and][${andIdx}][_or][${repOr++}][negotiator_name][_icontains]=${encodeURIComponent(normTarget)}`;
    }
    andIdx++;
  }

  return { filterParams, nextAndIdx: andIdx };
}

function matchesStaffReportLocal(
  r: any,
  customerMap: Map<string, any>,
  opts: {
    canViewAllAnalytics: boolean;
    targetNegotiator: string;
    userName?: string;
    personnelId?: string;
    userId?: string;
  }
): boolean {
  const normNeg = normalizePersianString(r.negotiator_name);
  const cust = customerMap.get(String(r.customer_id));

  if (!opts.canViewAllAnalytics) {
    const normMe = normalizePersianString(opts.userName);
    if (normMe && normNeg && (normNeg === normMe || normNeg.includes(normMe) || normMe.includes(normNeg))) {
      return true;
    }
    if (opts.personnelId && String(r.created_by || '') === String(opts.personnelId)) return true;
    if (opts.userId && String(r.created_by || '') === String(opts.userId)) return true;
    if (!normMe && cust) {
      const custMarketerId = String(cust.assigned_marketer_id || '').trim().toLowerCase();
      const rawCustId = custMarketerId.replace(/^p-/, '');
      const cleanPId = String(opts.personnelId || '').trim().toLowerCase();
      const rawPId = cleanPId.replace(/^p-/, '');
      if (cleanPId && (custMarketerId === cleanPId || (rawPId && rawCustId === rawPId))) return true;
    }
    return false;
  }

  if (opts.targetNegotiator) {
    const normTarget = normalizePersianString(opts.targetNegotiator);
    return Boolean(normTarget && normNeg && (normNeg === normTarget || normNeg.includes(normTarget) || normTarget.includes(normNeg)));
  }

  return true;
}

// GET /api/analytics/stats
router.get(['/stats', '/api/analytics/stats'], async (req: Request, res: Response) => {
  const { start_date, end_date, negotiator } = req.query;
  const { userId, personnelId, isAdmin, isPersonnelAdmin, canViewAllCustomers, reportViewScope, userName, tenantId } = getRequestUser(req);
  const canViewAllAnalytics = Boolean(isAdmin || isPersonnelAdmin || canViewAllCustomers || reportViewScope === 'all');

  const targetNegotiator = !canViewAllAnalytics
    ? userName || ''
    : negotiator && negotiator !== 'all' && negotiator !== 'همه'
    ? String(negotiator)
    : '';

  const scopeIdentity = canViewAllAnalytics
    ? `admin_${targetNegotiator || 'all'}`
    : `staff_${personnelId || userId || userName || 'unknown'}`;

  const cacheKey = `stats_${tenantId || 'all'}_${start_date || ''}_${end_date || ''}_${scopeIdentity}`;
  const now = Date.now();
  const cached = analyticsCache.get(cacheKey);
  if (cached && now - cached.timestamp < ANALYTICS_CACHE_TTL) {
    return res.json(cached.data);
  }

  if (directusUrl && directusAdminToken) {
    try {
      const { filterParams, nextAndIdx } = buildAnalyticsReportFilter({
        tenantId,
        startDate: start_date ? String(start_date) : undefined,
        endDate: end_date ? String(end_date) : undefined,
        canViewAllAnalytics,
        targetNegotiator,
        userName,
        personnelId,
        userId,
      });

      const contractClause = buildContractAndClause(nextAndIdx);

      const [
        totalReportsRes,
        contractsRes,
        avgScoreRes,
        statusGroupRes,
        negotiatorGroupRes,
        negotiatorContractsRes,
        uniqueCustRes,
      ] = await Promise.all([
        directusFetch(`/items/customer_reports?limit=1&meta=filter_count${filterParams}`).catch((e) => {
          console.warn('[Analytics /stats] totalReportsRes error:', e?.message);
          return null;
        }),
        directusFetch(`/items/customer_reports?aggregate[count]=*&aggregate[sum]=contract_amount${filterParams}${contractClause}`).catch((e) => {
          console.warn('[Analytics /stats] contractsRes error:', e?.message);
          return null;
        }),
        directusFetch(`/items/customer_reports?aggregate[avg]=negotiation_score${filterParams}`).catch((e) => {
          console.warn('[Analytics /stats] avgScoreRes error:', e?.message);
          return null;
        }),
        directusFetch(`/items/customer_reports?groupBy[]=negotiation_status&aggregate[count]=*&limit=-1${filterParams}`).catch((e) => {
          console.warn('[Analytics /stats] statusGroupRes error:', e?.message);
          return null;
        }),
        directusFetch(`/items/customer_reports?groupBy[]=negotiator_name&aggregate[count]=*&aggregate[sum]=contract_amount&aggregate[avg]=negotiation_score&limit=-1${filterParams}`).catch((e) => {
          console.warn('[Analytics /stats] negotiatorGroupRes error:', e?.message);
          return null;
        }),
        directusFetch(`/items/customer_reports?groupBy[]=negotiator_name&aggregate[count]=*&limit=-1${filterParams}${contractClause}`).catch((e) => {
          console.warn('[Analytics /stats] negotiatorContractsRes error:', e?.message);
          return null;
        }),
        directusFetch(`/items/customer_reports?aggregate[countDistinct]=customer_id${filterParams}`).catch((e) => {
          console.warn('[Analytics /stats] uniqueCustRes error:', e?.message);
          return null;
        }),
      ]);

      const totalReports = totalReportsRes?.meta?.filter_count ?? totalReportsRes?.meta?.total_count ?? 0;

      const statusBreakdown: Record<string, number> = {};
      if (statusGroupRes?.data && Array.isArray(statusGroupRes.data)) {
        for (const row of statusGroupRes.data) {
          const st = row.negotiation_status || 'سایر';
          const cnt = extractAggregateCount(row.count);
          statusBreakdown[st] = (statusBreakdown[st] || 0) + cnt;
        }
      }

      let totalContracts = 0;
      let totalContractAmount = 0;
      if (contractsRes?.data && Array.isArray(contractsRes.data) && contractsRes.data.length > 0) {
        const item = contractsRes.data[0];
        totalContracts = extractAggregateCount(item.count);
        totalContractAmount = Number(item.sum?.contract_amount || 0);
      } else {
        // Fallback from statusBreakdown if contract aggregate failed
        totalContracts =
          (statusBreakdown['قرارداد'] || 0) +
          (statusBreakdown['قرارداد / فاکتور'] || 0) +
          (statusBreakdown['قرارداد/فاکتور'] || 0);
      }

      let avgScore = '0';
      if (avgScoreRes?.data && Array.isArray(avgScoreRes.data) && avgScoreRes.data.length > 0) {
        const rawAvg = Number(avgScoreRes.data[0]?.avg?.negotiation_score);
        if (!isNaN(rawAvg) && rawAvg > 0) {
          avgScore = (Math.round(rawAvg * 10) / 10).toFixed(1);
        }
      }

      const contractsByNegotiator = new Map<string, number>();
      if (negotiatorContractsRes?.data && Array.isArray(negotiatorContractsRes.data)) {
        for (const row of negotiatorContractsRes.data) {
          if (row.negotiator_name) {
            contractsByNegotiator.set(row.negotiator_name, extractAggregateCount(row.count));
          }
        }
      }

      const personnelRanking: any[] = [];
      if (negotiatorGroupRes?.data && Array.isArray(negotiatorGroupRes.data)) {
        for (const row of negotiatorGroupRes.data) {
          const pName = row.negotiator_name || 'نامشخص';
          const repCount = extractAggregateCount(row.count);
          const cAmount = Number(row.sum?.contract_amount || 0);
          const rawAvg = Number(row.avg?.negotiation_score || 0);
          const cCount = contractsByNegotiator.get(pName) || 0;
          personnelRanking.push({
            personnelName: pName,
            reportsCount: repCount,
            contractsCount: cCount,
            totalAmount: cAmount,
            avgScore: rawAvg > 0 ? (Math.round(rawAvg * 10) / 10).toFixed(1) : '0',
          });
        }
      }

      let totalUniqueCustomers = 0;
      if (uniqueCustRes?.data && Array.isArray(uniqueCustRes.data) && uniqueCustRes.data.length > 0) {
        const cDistinct = uniqueCustRes.data[0]?.countDistinct?.customer_id;
        if (cDistinct !== undefined && cDistinct !== null) {
          totalUniqueCustomers = Number(cDistinct);
        }
      }
      if (!totalUniqueCustomers) {
        totalUniqueCustomers = totalReports;
      }

      const payload = {
        totalReports,
        totalUniqueCustomers,
        totalContracts,
        totalContractAmount,
        avgScore,
        statusBreakdown,
        personnelRanking: personnelRanking.sort((a, b) => b.totalAmount - a.totalAmount || b.reportsCount - a.reportsCount),
      };
      analyticsCache.set(cacheKey, { timestamp: now, data: payload });
      return res.json(payload);
    } catch (err: any) {
      console.warn('Directus analytics aggregate error:', err.message);
    }
  }

  // Fallback to in-memory / cache
  const [rawReports, rawCustomers] = await Promise.all([
    ensureReportsCache().catch(() => reportsData),
    ensureCustomersCache().catch(() => customersData),
  ]);
  const customerMap = new Map<string, any>();
  for (const c of rawCustomers) {
    if (c?.id) customerMap.set(String(c.id), c);
  }

  let filtered = rawReports.filter((r) =>
    matchesStaffReportLocal(r, customerMap, {
      canViewAllAnalytics,
      targetNegotiator,
      userName,
      personnelId,
      userId,
    })
  );

  if (start_date) {
    const sMs = new Date(String(start_date)).getTime();
    filtered = filtered.filter((r) => r.date_created && new Date(r.date_created).getTime() >= sMs);
  }
  if (end_date) {
    const eMs = new Date(String(end_date)).getTime();
    filtered = filtered.filter((r) => r.date_created && new Date(r.date_created).getTime() <= eMs);
  }

  const totalReports = filtered.length;
  const uniqueCustomerIds = new Set(filtered.map((r) => String(r.customer_id || '')).filter(Boolean));
  let totalContracts = 0;
  let totalContractAmount = 0;
  let scoresSum = 0;
  let scoresCount = 0;
  const statusBreakdown: Record<string, number> = {};
  const personnelMap = new Map<
    string,
    { count: number; contractsCount: number; amount: number; scoresSum: number; scoresCount: number }
  >();

  filtered.forEach((r) => {
    const st = r.negotiation_status || 'سایر';
    statusBreakdown[st] = (statusBreakdown[st] || 0) + 1;

    if (r.negotiation_score && r.negotiation_score > 0) {
      scoresSum += r.negotiation_score;
      scoresCount += 1;
    }

    const isContract = isContractReportRecord(r);

    if (isContract) {
      totalContracts += 1;
      if (r.contract_amount && !isNaN(Number(r.contract_amount))) {
        totalContractAmount += Number(r.contract_amount);
      }
    }

    const pName = r.negotiator_name || 'نامشخص';
    let pEntry = personnelMap.get(pName);
    if (!pEntry) {
      pEntry = { count: 0, contractsCount: 0, amount: 0, scoresSum: 0, scoresCount: 0 };
      personnelMap.set(pName, pEntry);
    }
    pEntry.count += 1;
    if (isContract) {
      pEntry.contractsCount += 1;
      if (r.contract_amount && !isNaN(Number(r.contract_amount))) {
        pEntry.amount += Number(r.contract_amount);
      }
    }
    if (r.negotiation_score && r.negotiation_score > 0) {
      pEntry.scoresSum += r.negotiation_score;
      pEntry.scoresCount += 1;
    }
  });

  const avgScore = scoresCount > 0 ? (scoresSum / scoresCount).toFixed(1) : '0';

  const personnelRanking = Array.from(personnelMap.entries())
    .map(([pName, val]) => ({
      personnelName: pName,
      reportsCount: val.count,
      contractsCount: val.contractsCount,
      totalAmount: val.amount,
      avgScore: val.scoresCount > 0 ? (val.scoresSum / val.scoresCount).toFixed(1) : '0',
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount || b.reportsCount - a.reportsCount);

  return res.json({
    totalReports,
    totalUniqueCustomers: uniqueCustomerIds.size || totalReports,
    totalContracts,
    totalContractAmount,
    avgScore,
    statusBreakdown,
    personnelRanking,
  });
});

function gregorianToJalali(gy: number, gm: number, gd: number): { jy: number; jm: number; jd: number } {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy: number;
  let gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    355666 +
    365 * gy +
    Math.floor((gy2 + 3) / 4) -
    Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) +
    gd +
    g_d_m[gm - 1];
  jy = -1595 + 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let jm: number;
  let jd: number;
  if (days < 186) {
    jm = 1 + Math.floor(days / 31);
    jd = 1 + (days % 31);
  } else {
    jm = 7 + Math.floor((days - 186) / 30);
    jd = 1 + ((days - 186) % 30);
  }
  return { jy, jm, jd };
}

function gregorianIsoToJalali(isoString?: string | null): string {
  if (!isoString) return '';
  try {
    const parts = isoString.split('T')[0].split('-');
    if (parts.length < 3) return '';
    const gy = parseInt(parts[0], 10);
    const gm = parseInt(parts[1], 10);
    const gd = parseInt(parts[2], 10);
    const { jy, jm, jd } = gregorianToJalali(gy, gm, gd);
    return `${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`;
  } catch {
    return '';
  }
}

// GET /api/analytics/daily
router.get(['/daily', '/api/analytics/daily'], async (req: Request, res: Response) => {
  const { days, start_date, end_date, negotiator } = req.query;
  const { userId, personnelId, isAdmin, isPersonnelAdmin, canViewAllCustomers, reportViewScope, userName, tenantId } = getRequestUser(req);
  const canViewAllAnalytics = Boolean(isAdmin || isPersonnelAdmin || canViewAllCustomers || reportViewScope === 'all');

  const daysCount = days ? Math.max(1, Math.min(parseInt(String(days), 10), 90)) : 14;

  const targetNegotiator = !canViewAllAnalytics
    ? userName || ''
    : negotiator && negotiator !== 'all' && negotiator !== 'همه'
    ? String(negotiator)
    : '';

  const now = new Date();
  let rangeStart = new Date(now.getTime() - (daysCount - 1) * 24 * 60 * 60 * 1000);
  rangeStart.setHours(0, 0, 0, 0);
  let rangeEnd = new Date();
  rangeEnd.setHours(23, 59, 59, 999);

  if (start_date) {
    rangeStart = new Date(String(start_date));
  }
  if (end_date) {
    rangeEnd = new Date(String(end_date));
    rangeEnd.setHours(23, 59, 59, 999);
  }

  const scopeIdentity = canViewAllAnalytics
    ? `admin_${targetNegotiator || 'all'}`
    : `staff_${personnelId || userId || userName || 'unknown'}`;

  const cacheKey = `daily_${tenantId || 'all'}_${daysCount}_${start_date || ''}_${end_date || ''}_${scopeIdentity}`;
  const cacheNow = Date.now();
  const cached = analyticsCache.get(cacheKey);
  if (cached && cacheNow - cached.timestamp < ANALYTICS_CACHE_TTL) {
    return res.json(cached.data);
  }

  if (directusUrl && directusAdminToken) {
    try {
      const { filterParams, nextAndIdx } = buildAnalyticsReportFilter({
        tenantId,
        startDate: rangeStart.toISOString(),
        endDate: rangeEnd.toISOString(),
        canViewAllAnalytics,
        targetNegotiator,
        userName,
        personnelId,
        userId,
      });

      const contractClause = buildContractAndClause(nextAndIdx);

      // Build customer assignment count filter with proper tenantNum > 1 and staff ownership matching
      let custFilterParams = '';
      let custAndIdx = 0;
      if (tenantId && tenantId !== 'all') {
        const tenantNum = resolveDirectusTenantId(tenantId);
        if (tenantNum && tenantNum > 1) {
          custFilterParams += `&filter[_and][${custAndIdx++}][tenant_id][_eq]=${tenantNum}`;
        }
      }
      if (!canViewAllAnalytics) {
        let cOr = 0;
        if (personnelId) {
          const pStr = String(personnelId).trim();
          custFilterParams += `&filter[_and][${custAndIdx}][_or][${cOr++}][assigned_marketer_id][_eq]=${encodeURIComponent(pStr)}`;
          const rawP = pStr.replace(/^p-/i, '');
          if (rawP && rawP !== pStr) {
            custFilterParams += `&filter[_and][${custAndIdx}][_or][${cOr++}][assigned_marketer_id][_eq]=${encodeURIComponent(rawP)}`;
          } else if (rawP) {
            custFilterParams += `&filter[_and][${custAndIdx}][_or][${cOr++}][assigned_marketer_id][_eq]=${encodeURIComponent('p-' + rawP)}`;
          }
        }
        if (userId && String(userId) !== String(personnelId || '')) {
          custFilterParams += `&filter[_and][${custAndIdx}][_or][${cOr++}][assigned_marketer_id][_eq]=${encodeURIComponent(String(userId))}`;
        }
        if (userName) {
          custFilterParams += `&filter[_and][${custAndIdx}][_or][${cOr++}][assigned_marketer_name][_icontains]=${encodeURIComponent(userName.trim())}`;
        }
        if (cOr > 0) custAndIdx++;
      } else if (targetNegotiator) {
        custFilterParams += `&filter[_and][${custAndIdx++}][assigned_marketer_name][_icontains]=${encodeURIComponent(targetNegotiator.trim())}`;
      }

      const [allDaysRes, contractDaysRes, totalAssignedRes, uniqueCustDaysRes, totalUniqueTouchedRes] = await Promise.all([
        directusFetch(
          `/items/customer_reports?groupBy[]=year(date_created)&groupBy[]=month(date_created)&groupBy[]=day(date_created)&aggregate[count]=*&aggregate[avg]=negotiation_score&aggregate[sum]=contract_amount&limit=-1${filterParams}`
        ).catch((e) => {
          console.warn('[Analytics /daily] allDaysRes error:', e?.message);
          return null;
        }),
        directusFetch(
          `/items/customer_reports?groupBy[]=year(date_created)&groupBy[]=month(date_created)&groupBy[]=day(date_created)&aggregate[count]=*&aggregate[sum]=contract_amount&limit=-1${filterParams}${contractClause}`
        ).catch((e) => {
          console.warn('[Analytics /daily] contractDaysRes error:', e?.message);
          return null;
        }),
        directusFetch(
          `/items/customers?limit=1&meta=filter_count${custFilterParams}`
        ).catch((e) => {
          console.warn('[Analytics /daily] totalAssignedRes error:', e?.message);
          return null;
        }),
        directusFetch(
          `/items/customer_reports?groupBy[]=year(date_created)&groupBy[]=month(date_created)&groupBy[]=day(date_created)&aggregate[countDistinct]=customer_id&limit=-1${filterParams}`
        ).catch((e) => {
          console.warn('[Analytics /daily] uniqueCustDaysRes error:', e?.message);
          return null;
        }),
        directusFetch(
          `/items/customer_reports?aggregate[countDistinct]=customer_id${filterParams}`
        ).catch((e) => {
          console.warn('[Analytics /daily] totalUniqueTouchedRes error:', e?.message);
          return null;
        }),
      ]);

      const daysMap = new Map<string, {
        dateIso: string;
        dateJalali: string;
        dayName: string;
        reportsCount: number;
        scoresSum: number;
        scoresCount: number;
        contractsCount: number;
        contractsAmount: number;
        avgScore: string;
        statusCounts: Record<string, number>;
        uniqueCount: number;
      }>();

      const ensureDayEntry = (isoKey: string) => {
        let entry = daysMap.get(isoKey);
        if (!entry) {
          const d = new Date(isoKey);
          entry = {
            dateIso: isoKey,
            dateJalali: gregorianIsoToJalali(isoKey),
            dayName: !isNaN(d.getTime()) ? new Intl.DateTimeFormat('fa-IR', { weekday: 'short' }).format(d) : '-',
            reportsCount: 0,
            scoresSum: 0,
            scoresCount: 0,
            contractsCount: 0,
            contractsAmount: 0,
            avgScore: '0',
            statusCounts: {},
            uniqueCount: 0,
          };
          daysMap.set(isoKey, entry);
        }
        return entry;
      };

      const dayDiff = Math.max(1, Math.min(Math.round((rangeEnd.getTime() - rangeStart.getTime()) / (24 * 60 * 60 * 1000)), 90));
      for (let i = dayDiff - 1; i >= 0; i--) {
        const d = new Date(rangeEnd.getTime() - i * 24 * 60 * 60 * 1000);
        const isoKey = d.toISOString().split('T')[0];
        ensureDayEntry(isoKey);
      }

      if (allDaysRes?.data && Array.isArray(allDaysRes.data)) {
        for (const row of allDaysRes.data) {
          if (!row.date_created_year || !row.date_created_month || !row.date_created_day) continue;
          const isoKey = `${row.date_created_year}-${String(row.date_created_month).padStart(2, '0')}-${String(row.date_created_day).padStart(2, '0')}`;
          const count = extractAggregateCount(row.count);
          const rawAvg = Number(row.avg?.negotiation_score || 0);
          const sumAmt = Number(row.sum?.contract_amount || 0);
          const entry = ensureDayEntry(isoKey);
          entry.reportsCount = count;
          entry.scoresSum = rawAvg * count;
          entry.scoresCount = count;
          entry.contractsAmount = sumAmt;
          entry.avgScore = rawAvg > 0 ? (Math.round(rawAvg * 10) / 10).toFixed(1) : '0';
          entry.uniqueCount = count > 0 ? 1 : 0;
        }
      }

      if (uniqueCustDaysRes?.data && Array.isArray(uniqueCustDaysRes.data)) {
        for (const row of uniqueCustDaysRes.data) {
          if (!row.date_created_year || !row.date_created_month || !row.date_created_day) continue;
          const isoKey = `${row.date_created_year}-${String(row.date_created_month).padStart(2, '0')}-${String(row.date_created_day).padStart(2, '0')}`;
          const uCount = Number(row.countDistinct?.customer_id || 0);
          const entry = ensureDayEntry(isoKey);
          if (uCount > 0) {
            entry.uniqueCount = uCount;
          }
        }
      }

      if (contractDaysRes?.data && Array.isArray(contractDaysRes.data)) {
        for (const row of contractDaysRes.data) {
          if (!row.date_created_year || !row.date_created_month || !row.date_created_day) continue;
          const isoKey = `${row.date_created_year}-${String(row.date_created_month).padStart(2, '0')}-${String(row.date_created_day).padStart(2, '0')}`;
          const cCount = extractAggregateCount(row.count);
          const cSum = Number(row.sum?.contract_amount || 0);
          const entry = ensureDayEntry(isoKey);
          entry.contractsCount = cCount;
          if (cSum > 0) entry.contractsAmount = cSum;
        }
      }

      const daysList = Array.from(daysMap.values()).sort((a, b) => a.dateIso.localeCompare(b.dateIso));
      const totalReports = daysList.reduce((acc, d) => acc + d.reportsCount, 0);
      const totalContracts = daysList.reduce((acc, d) => acc + d.contractsCount, 0);
      const totalAmount = daysList.reduce((acc, d) => acc + d.contractsAmount, 0);
      const totalScoresSum = daysList.reduce((acc, d) => acc + d.scoresSum, 0);
      const totalScoresCount = daysList.reduce((acc, d) => acc + d.scoresCount, 0);
      const avgScore = totalScoresCount > 0 ? (totalScoresSum / totalScoresCount).toFixed(1) : '0';
      const activeDaysCount = daysList.filter((d) => d.reportsCount > 0).length;
      const avgPerActiveDay = activeDaysCount > 0 ? (totalReports / activeDaysCount).toFixed(1) : '0';
      const peakDay = [...daysList].sort((a, b) => b.reportsCount - a.reportsCount)[0];

      const totalAssignedCustomers = totalAssignedRes?.meta?.filter_count ?? totalAssignedRes?.meta?.total_count ?? 0;
      let totalUniqueCustomersTouched = 0;
      if (totalUniqueTouchedRes?.data && Array.isArray(totalUniqueTouchedRes.data) && totalUniqueTouchedRes.data.length > 0) {
        const cDist = totalUniqueTouchedRes.data[0]?.countDistinct?.customer_id;
        if (cDist !== undefined && cDist !== null) {
          totalUniqueCustomersTouched = Number(cDist);
        }
      }
      if (!totalUniqueCustomersTouched) {
        totalUniqueCustomersTouched = totalReports;
      }

      const dailyPayload = {
        daysList,
        totalReports,
        totalContracts,
        totalAmount,
        avgScore,
        activeDaysCount,
        avgPerActiveDay,
        peakDay,
        totalAssignedCustomers,
        totalUniqueCustomersTouched,
      };
      analyticsCache.set(cacheKey, { timestamp: cacheNow, data: dailyPayload });
      return res.json(dailyPayload);
    } catch (err: any) {
      console.warn('Directus daily analytics aggregate error:', err.message);
    }
  }

  // Fallback to in-memory / cache for daily analytics
  const [rawReports, rawCustomers] = await Promise.all([
    ensureReportsCache().catch(() => reportsData),
    ensureCustomersCache().catch(() => customersData),
  ]);
  const customerMap = new Map<string, any>();
  for (const c of rawCustomers) {
    if (c?.id) customerMap.set(String(c.id), c);
  }

  const startMs = rangeStart.getTime();
  const endMs = rangeEnd.getTime();
  const scoped = rawReports.filter((r) => {
    if (!r.date_created) return false;
    const t = new Date(r.date_created).getTime();
    if (isNaN(t) || t < startMs || t > endMs) return false;
    return matchesStaffReportLocal(r, customerMap, {
      canViewAllAnalytics,
      targetNegotiator,
      userName,
      personnelId,
      userId,
    });
  });

  const daysMap = new Map<string, {
    dateIso: string;
    dateJalali: string;
    dayName: string;
    reportsCount: number;
    scoresSum: number;
    scoresCount: number;
    contractsCount: number;
    contractsAmount: number;
    avgScore: string;
    statusCounts: Record<string, number>;
    uniqueCustIds: Set<string>;
  }>();

  const dayDiff = Math.max(1, Math.min(Math.round((endMs - startMs) / 86400000), 90));
  for (let i = dayDiff - 1; i >= 0; i--) {
    const d = new Date(endMs - i * 86400000);
    const isoKey = d.toISOString().split('T')[0];
    daysMap.set(isoKey, {
      dateIso: isoKey,
      dateJalali: gregorianIsoToJalali(isoKey),
      dayName: new Intl.DateTimeFormat('fa-IR', { weekday: 'short' }).format(d),
      reportsCount: 0,
      scoresSum: 0,
      scoresCount: 0,
      contractsCount: 0,
      contractsAmount: 0,
      avgScore: '0',
      statusCounts: {},
      uniqueCustIds: new Set<string>(),
    });
  }

  const allUniqueTouched = new Set<string>();
  scoped.forEach((r) => {
    const isoKey = new Date(r.date_created!).toISOString().split('T')[0];
    let entry = daysMap.get(isoKey);
    if (!entry) {
      const d = new Date(isoKey);
      entry = {
        dateIso: isoKey,
        dateJalali: gregorianIsoToJalali(isoKey),
        dayName: new Intl.DateTimeFormat('fa-IR', { weekday: 'short' }).format(d),
        reportsCount: 0,
        scoresSum: 0,
        scoresCount: 0,
        contractsCount: 0,
        contractsAmount: 0,
        avgScore: '0',
        statusCounts: {},
        uniqueCustIds: new Set<string>(),
      };
      daysMap.set(isoKey, entry);
    }
    entry.reportsCount += 1;
    if (r.customer_id) {
      entry.uniqueCustIds.add(String(r.customer_id));
      allUniqueTouched.add(String(r.customer_id));
    }
    if (r.negotiation_score && r.negotiation_score > 0) {
      entry.scoresSum += Number(r.negotiation_score);
      entry.scoresCount += 1;
    }
    if (isContractReportRecord(r)) {
      entry.contractsCount += 1;
      if (r.contract_amount && !isNaN(Number(r.contract_amount))) {
        entry.contractsAmount += Number(r.contract_amount);
      }
    }
  });

  const daysList = Array.from(daysMap.values())
    .sort((a, b) => a.dateIso.localeCompare(b.dateIso))
    .map(({ uniqueCustIds, ...rest }) => ({
      ...rest,
      avgScore: rest.scoresCount > 0 ? (rest.scoresSum / rest.scoresCount).toFixed(1) : '0',
      uniqueCount: uniqueCustIds.size,
    }));

  const totalReports = daysList.reduce((acc, d) => acc + d.reportsCount, 0);
  const totalContracts = daysList.reduce((acc, d) => acc + d.contractsCount, 0);
  const totalAmount = daysList.reduce((acc, d) => acc + d.contractsAmount, 0);
  const totalScoresSum = daysList.reduce((acc, d) => acc + d.scoresSum, 0);
  const totalScoresCount = daysList.reduce((acc, d) => acc + d.scoresCount, 0);
  const avgScore = totalScoresCount > 0 ? (totalScoresSum / totalScoresCount).toFixed(1) : '0';
  const activeDaysCount = daysList.filter((d) => d.reportsCount > 0).length;
  const avgPerActiveDay = activeDaysCount > 0 ? (totalReports / activeDaysCount).toFixed(1) : '0';
  const peakDay = [...daysList].sort((a, b) => b.reportsCount - a.reportsCount)[0];

  return res.json({
    daysList,
    totalReports,
    totalContracts,
    totalAmount,
    avgScore,
    activeDaysCount,
    avgPerActiveDay,
    peakDay,
    totalAssignedCustomers: rawCustomers.length,
    totalUniqueCustomersTouched: allUniqueTouched.size || totalReports,
  });
});

export default router;
