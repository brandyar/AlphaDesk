import { Router, Request, Response } from 'express';
import {
  directusUrl,
  directusAdminToken,
  reportsData,
  customersData,
  personnelData,
} from '../config.ts';
import { directusFetch, directusFetchAllPages } from '../directus/client.ts';
import { ensureReportsCache, ensureCustomersCache } from '../directus/cache.ts';
import { resolveDirectusTenantId, buildDirectusTenantFilter } from '../directus/sync.ts';
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

  // Tenant filter: apply cleanly for all specific tenants including primary org
  const tFilter = buildDirectusTenantFilter(params.tenantId, andIdx);
  if (tFilter.consumed) {
    filterParams += tFilter.clause;
    andIdx++;
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

const TEHRAN_TIMEZONE = 'Asia/Tehran';
const NAIVE_ISO_DATETIME_RE = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,6})?)?$/;
const DATE_ONLY_ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

const tehranIsoDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TEHRAN_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const tehranWeekdayFormatter = new Intl.DateTimeFormat('fa-IR', {
  timeZone: TEHRAN_TIMEZONE,
  weekday: 'short',
});

function parseReportTimestamp(input?: string | Date | number | null): Date | null {
  if (input === undefined || input === null || input === '') return null;
  if (input instanceof Date) return isNaN(input.getTime()) ? null : input;
  if (typeof input === 'number') {
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d;
  }
  const raw = String(input).trim();
  if (!raw) return null;
  if (DATE_ONLY_ISO_RE.test(raw)) {
    const d = new Date(`${raw}T12:00:00+03:30`);
    return isNaN(d.getTime()) ? null : d;
  }
  if (NAIVE_ISO_DATETIME_RE.test(raw)) {
    const normalized = raw.replace(' ', 'T');
    const withSeconds = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(normalized)
      ? `${normalized}:00`
      : normalized;
    const d = new Date(`${withSeconds}Z`);
    return isNaN(d.getTime()) ? null : d;
  }
  let d = new Date(raw);
  if (isNaN(d.getTime()) && raw.includes(' ')) {
    d = new Date(raw.replace(' ', 'T'));
  }
  return isNaN(d.getTime()) ? null : d;
}

function getTehranIsoDateKey(input?: string | Date | number | null): string {
  const d = parseReportTimestamp(input);
  if (!d) return '';
  try {
    return tehranIsoDateFormatter.format(d);
  } catch {
    const shifted = new Date(d.getTime() + 3.5 * 60 * 60 * 1000);
    return shifted.toISOString().split('T')[0];
  }
}

function shiftCalendarIsoDate(dateIso: string, deltaDays: number): string {
  const [y, m, d] = dateIso.split('-').map((n) => parseInt(n, 10));
  const utc = new Date(Date.UTC(y, m - 1, d + deltaDays));
  const yy = utc.getUTCFullYear();
  const mm = String(utc.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(utc.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function getTehranWeekdayName(dateIso: string): string {
  const d = new Date(`${dateIso}T12:00:00+03:30`);
  if (isNaN(d.getTime())) return '-';
  try {
    return tehranWeekdayFormatter.format(d);
  } catch {
    return '-';
  }
}

function getTehranQueryWindowUtc(startDateIso: string, endDateIso: string): {
  queryStartIso: string;
  queryEndIso: string;
} {
  return {
    queryStartIso: `${shiftCalendarIsoDate(startDateIso, -1)}T00:00:00.000Z`,
    queryEndIso: `${shiftCalendarIsoDate(endDateIso, 1)}T23:59:59.999Z`,
  };
}

function buildCalendarDateRange(startDateIso: string, endDateIso: string, maxDays = 90): string[] {
  const result: string[] = [];
  if (!DATE_ONLY_ISO_RE.test(startDateIso) || !DATE_ONLY_ISO_RE.test(endDateIso)) {
    return result;
  }
  let curr = startDateIso;
  let guard = 0;
  while (curr <= endDateIso && guard < maxDays) {
    result.push(curr);
    curr = shiftCalendarIsoDate(curr, 1);
    guard++;
  }
  return result;
}

function extractPhoneFromField(val: any): string {
  if (!val) return '';
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed.startsWith('[')) {
      try {
        return extractPhoneFromField(JSON.parse(trimmed));
      } catch {}
    }
    return trimmed;
  }
  if (Array.isArray(val)) {
    for (const item of val) {
      if (typeof item === 'string' && item.trim()) return item.trim();
      if (item && typeof item === 'object' && typeof item.value === 'string' && item.value.trim()) {
        return item.value.trim();
      }
    }
  }
  return '';
}

function resolveCustomerPrimaryPhone(
  cust: any,
  negotiationPhone?: string | null,
  fallbackContactPhone?: string
): string {
  if (negotiationPhone && String(negotiationPhone).trim()) {
    return String(negotiationPhone).trim();
  }
  if (cust && typeof cust === 'object') {
    const candidate =
      extractPhoneFromField(cust.mobile_numbers) ||
      extractPhoneFromField(cust.manager_phones) ||
      extractPhoneFromField(cust.negotiator_phones) ||
      extractPhoneFromField(cust.landline_numbers) ||
      (typeof cust.telegram_phone === 'string' ? cust.telegram_phone.trim() : '');
    if (candidate) return candidate;
    if (Array.isArray(cust.contacts)) {
      const phoneContact = cust.contacts.find(
        (ct: any) =>
          ct?.value &&
          ['mobile', 'landline', 'whatsapp', 'telegram'].includes(String(ct.channel_type || ''))
      );
      if (phoneContact?.value) return String(phoneContact.value).trim();
    }
  }
  return fallbackContactPhone || '';
}

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

function aggregateDailyReportsPayload(
  reportsList: any[],
  dateKeys: string[],
  totalAssignedCustomers: number
) {
  const daysMap = new Map<
    string,
    {
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
    }
  >();

  for (const isoKey of dateKeys) {
    daysMap.set(isoKey, {
      dateIso: isoKey,
      dateJalali: gregorianIsoToJalali(isoKey),
      dayName: getTehranWeekdayName(isoKey),
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
  for (const r of reportsList) {
    if (!r?.date_created) continue;
    const isoKey = getTehranIsoDateKey(r.date_created);
    if (!isoKey) continue;
    const entry = daysMap.get(isoKey);
    if (!entry) continue;

    entry.reportsCount += 1;
    const rawCustId =
      typeof r.customer_id === 'object' && r.customer_id !== null
        ? String(r.customer_id.id || '')
        : String(r.customer_id || '');
    if (rawCustId) {
      entry.uniqueCustIds.add(rawCustId);
      allUniqueTouched.add(rawCustId);
    }

    const scoreNum = Number(r.negotiation_score);
    if (!isNaN(scoreNum) && scoreNum > 0) {
      entry.scoresSum += scoreNum;
      entry.scoresCount += 1;
    }

    if (isContractReportRecord(r)) {
      entry.contractsCount += 1;
      const amt = Number(r.contract_amount);
      if (!isNaN(amt) && amt > 0) {
        entry.contractsAmount += amt;
      }
    }

    const st = String(r.negotiation_status || 'سایر');
    entry.statusCounts[st] = (entry.statusCounts[st] || 0) + 1;
  }

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

  return {
    daysList,
    totalReports,
    totalContracts,
    totalAmount,
    avgScore,
    activeDaysCount,
    avgPerActiveDay,
    peakDay,
    totalAssignedCustomers,
    totalUniqueCustomersTouched: allUniqueTouched.size || totalReports,
  };
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

  const todayTehranIso = getTehranIsoDateKey(new Date());
  let endDateIso = end_date ? getTehranIsoDateKey(String(end_date)) || todayTehranIso : todayTehranIso;
  let startDateIso = start_date
    ? getTehranIsoDateKey(String(start_date)) || shiftCalendarIsoDate(endDateIso, -(daysCount - 1))
    : shiftCalendarIsoDate(endDateIso, -(daysCount - 1));
  if (startDateIso > endDateIso) {
    startDateIso = shiftCalendarIsoDate(endDateIso, -(daysCount - 1));
  }

  const dateKeys = buildCalendarDateRange(startDateIso, endDateIso, 90);
  const { queryStartIso, queryEndIso } = getTehranQueryWindowUtc(startDateIso, endDateIso);

  const scopeIdentity = canViewAllAnalytics
    ? `admin_${targetNegotiator || 'all'}`
    : `staff_${personnelId || userId || userName || 'unknown'}`;

  const cacheKey = `daily_${tenantId || 'all'}_${startDateIso}_${endDateIso}_${scopeIdentity}`;
  const cacheNow = Date.now();
  const cached = analyticsCache.get(cacheKey);
  if (cached && cacheNow - cached.timestamp < ANALYTICS_CACHE_TTL) {
    return res.json(cached.data);
  }

  if (directusUrl && directusAdminToken) {
    try {
      const { filterParams } = buildAnalyticsReportFilter({
        tenantId,
        startDate: queryStartIso,
        endDate: queryEndIso,
        canViewAllAnalytics,
        targetNegotiator,
        userName,
        personnelId,
        userId,
      });

      // Build customer assignment count filter with proper tenant isolation and staff ownership matching
      let custFilterParams = '';
      let custAndIdx = 0;
      const custTFilter = buildDirectusTenantFilter(tenantId, custAndIdx);
      if (custTFilter.consumed) {
        custFilterParams += custTFilter.clause;
        custAndIdx++;
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

      const minimalFields =
        'id,customer_id,negotiation_score,negotiation_status,contract_amount,contract_number,date_created';

      const [reportsRes, totalAssignedRes] = await Promise.all([
        directusFetchAllPages(
          `/items/customer_reports?fields=${minimalFields}&sort=-date_created${filterParams}`,
          {},
          50000
        ).catch((e) => {
          console.warn('[Analytics /daily] reportsRes error:', e?.message);
          return null;
        }),
        directusFetch(
          `/items/customers?limit=1&meta=filter_count${custFilterParams}`
        ).catch((e) => {
          console.warn('[Analytics /daily] totalAssignedRes error:', e?.message);
          return null;
        }),
      ]);

      if (reportsRes && reportsRes.meta !== undefined && Array.isArray(reportsRes.data)) {
        const totalAssignedCustomers =
          totalAssignedRes?.meta?.filter_count ?? totalAssignedRes?.meta?.total_count ?? 0;
        const dailyPayload = aggregateDailyReportsPayload(
          reportsRes.data,
          dateKeys,
          totalAssignedCustomers
        );
        analyticsCache.set(cacheKey, { timestamp: cacheNow, data: dailyPayload });
        return res.json(dailyPayload);
      }
    } catch (err: any) {
      console.warn('Directus daily analytics error:', err.message);
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

  const dateKeySet = new Set(dateKeys);
  const scoped = rawReports.filter((r) => {
    if (!r.date_created) return false;
    const key = getTehranIsoDateKey(r.date_created);
    if (!key || !dateKeySet.has(key)) return false;
    return matchesStaffReportLocal(r, customerMap, {
      canViewAllAnalytics,
      targetNegotiator,
      userName,
      personnelId,
      userId,
    });
  });

  return res.json(aggregateDailyReportsPayload(scoped, dateKeys, rawCustomers.length));
});

// GET /api/analytics/day-reports
// Returns the exact full list of reports for a given Tehran dateIso matching /api/analytics/daily 1-to-1
router.get(['/day-reports', '/api/analytics/day-reports'], async (req: Request, res: Response) => {
  const { date, negotiator } = req.query;
  const dateIso = date ? String(date).trim() : '';

  if (!DATE_ONLY_ISO_RE.test(dateIso)) {
    return res.status(400).json({ error: 'فرمت تاریخ نامعتبر است (YYYY-MM-DD).' });
  }

  const { userId, personnelId, isAdmin, isPersonnelAdmin, canViewAllCustomers, reportViewScope, userName, tenantId } = getRequestUser(req);
  const canViewAllAnalytics = Boolean(isAdmin || isPersonnelAdmin || canViewAllCustomers || reportViewScope === 'all');

  const targetNegotiator = !canViewAllAnalytics
    ? userName || ''
    : negotiator && negotiator !== 'all' && negotiator !== 'همه'
    ? String(negotiator)
    : '';

  const { queryStartIso, queryEndIso } = getTehranQueryWindowUtc(dateIso, dateIso);

  if (directusUrl && directusAdminToken) {
    try {
      const { filterParams } = buildAnalyticsReportFilter({
        tenantId,
        startDate: queryStartIso,
        endDate: queryEndIso,
        canViewAllAnalytics,
        targetNegotiator,
        userName,
        personnelId,
        userId,
      });

      const dayReportFields = [
        '*',
        'customer_id.id',
        'customer_id.company_name',
        'customer_id.manager_name',
        'customer_id.negotiator_name',
        'customer_id.status',
        'customer_id.province',
        'customer_id.city',
        'customer_id.business_type',
        'customer_id.mobile_numbers',
        'customer_id.manager_phones',
        'customer_id.negotiator_phones',
        'customer_id.landline_numbers',
        'customer_id.telegram_phone',
        'customer_id.next_followup_date',
        'customer_id.assignment_deadline',
        'customer_id.is_expired',
        'customer_id.assigned_marketer_id',
        'customer_id.assigned_marketer_name',
      ].join(',');

      const reportsRes = await directusFetchAllPages(
        `/items/customer_reports?fields=${encodeURIComponent(dayReportFields)}&sort=-date_created${filterParams}`,
        {},
        50000
      ).catch((e) => {
        console.warn('[Analytics /day-reports] Directus fetch error:', e?.message);
        return null;
      });

      if (reportsRes && reportsRes.meta !== undefined && Array.isArray(reportsRes.data)) {
        const dayItems = reportsRes.data.filter(
          (r: any) => r?.date_created && getTehranIsoDateKey(r.date_created) === dateIso
        );

        // Identify any customers that still need a phone number lookup from customer_contacts
        const custIdsMissingPhone = new Set<string>();
        for (const r of dayItems) {
          const custObj = typeof r.customer_id === 'object' && r.customer_id !== null ? r.customer_id : null;
          const custIdStr = custObj ? String(custObj.id || '') : String(r.customer_id || '');
          const immediatePhone = resolveCustomerPrimaryPhone(custObj, r.negotiation_phone);
          if (!immediatePhone && custIdStr) {
            custIdsMissingPhone.add(custIdStr);
          }
        }

        const fallbackPhoneByCustId = new Map<string, string>();
        if (custIdsMissingPhone.size > 0) {
          const idsArr = Array.from(custIdsMissingPhone).slice(0, 200);
          const contactsRes = await directusFetch(
            `/items/customer_contacts?filter[customer_id][_in]=${encodeURIComponent(idsArr.join(','))}` +
              `&filter[channel_type][_in]=mobile,landline,whatsapp,telegram` +
              `&fields=customer_id,value,is_primary&limit=500`,
            {},
            1
          ).catch(() => null);

          if (contactsRes?.data && Array.isArray(contactsRes.data)) {
            for (const ct of contactsRes.data) {
              const cid = typeof ct.customer_id === 'object' && ct.customer_id !== null
                ? String(ct.customer_id.id || '')
                : String(ct.customer_id || '');
              const val = typeof ct.value === 'string' ? ct.value.trim() : '';
              if (!cid || !val) continue;
              if (!fallbackPhoneByCustId.has(cid) || ct.is_primary) {
                fallbackPhoneByCustId.set(cid, val);
              }
            }
          }
        }

        const enriched = dayItems
          .map((r: any) => {
            const custObj = typeof r.customer_id === 'object' && r.customer_id !== null ? r.customer_id : null;
            const custIdStr = custObj ? String(custObj.id || '') : String(r.customer_id || '');
            const resolvedPhone = resolveCustomerPrimaryPhone(
              custObj,
              r.negotiation_phone,
              fallbackPhoneByCustId.get(custIdStr)
            );
            return {
              ...r,
              customer_id: custIdStr,
              customer: custObj || null,
              customer_phone: resolvedPhone || null,
            };
          })
          .sort(
            (a: any, b: any) =>
              (parseReportTimestamp(b.date_created)?.getTime() || 0) -
              (parseReportTimestamp(a.date_created)?.getTime() || 0)
          );

        return res.json({
          data: enriched,
          total: enriched.length,
          date: dateIso,
        });
      }
    } catch (err: any) {
      console.warn('Directus day-reports error:', err.message);
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

  const matched = rawReports
    .filter((r) => {
      if (!r?.date_created) return false;
      if (getTehranIsoDateKey(r.date_created) !== dateIso) return false;
      return matchesStaffReportLocal(r, customerMap, {
        canViewAllAnalytics,
        targetNegotiator,
        userName,
        personnelId,
        userId,
      });
    })
    .map((r) => {
      const rawCustId =
        typeof r.customer_id === 'object' && r.customer_id !== null
          ? String((r.customer_id as any).id || '')
          : String(r.customer_id || '');
      const custObj = customerMap.get(rawCustId) || (typeof r.customer_id === 'object' ? r.customer_id : null);
      const resolvedPhone = resolveCustomerPrimaryPhone(custObj, r.negotiation_phone);
      return {
        ...r,
        customer_id: rawCustId,
        customer: custObj || null,
        customer_phone: resolvedPhone || null,
      };
    })
    .sort(
      (a, b) =>
        (parseReportTimestamp(b.date_created)?.getTime() || 0) -
        (parseReportTimestamp(a.date_created)?.getTime() || 0)
    );

  return res.json({
    data: matched,
    total: matched.length,
    date: dateIso,
  });
});

export default router;
