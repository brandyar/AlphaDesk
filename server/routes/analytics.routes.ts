import { Router, Request, Response } from 'express';
import {
  directusUrl,
  directusAdminToken,
  reportsData,
} from '../config.ts';
import { directusFetch } from '../directus/client.ts';
import { ensureReportsCache } from '../directus/cache.ts';
import { resolveDirectusTenantId } from '../directus/sync.ts';
import { getRequestUser } from '../middlewares/auth.middleware.ts';

const router = Router();

// In-memory response cache to prevent database load spikes and deliver <5ms instant analytics responses
interface AnalyticsCacheEntry {
  timestamp: number;
  data: any;
}
const analyticsCache = new Map<string, AnalyticsCacheEntry>();
const ANALYTICS_CACHE_TTL = 30000; // 30 seconds


// GET /api/analytics/stats
router.get(['/stats', '/api/analytics/stats'], async (req: Request, res: Response) => {
  const { start_date, end_date, negotiator } = req.query;
  const { userId, personnelId, isAdmin, userName, tenantId } = getRequestUser(req);

  const targetNegotiator = !isAdmin
    ? userName || ''
    : negotiator && negotiator !== 'all' && negotiator !== 'همه'
    ? String(negotiator)
    : '';

  const cacheKey = `stats_${tenantId || 'all'}_${start_date || ''}_${end_date || ''}_${targetNegotiator || 'all'}`;
  const now = Date.now();
  const cached = analyticsCache.get(cacheKey);
  if (cached && now - cached.timestamp < ANALYTICS_CACHE_TTL) {
    return res.json(cached.data);
  }

  if (directusUrl && directusAdminToken) {
    try {
      let filterParams = '';

      if (tenantId && tenantId !== 'all') {
        const tenantNum = resolveDirectusTenantId(tenantId);
        if (tenantNum) {
          filterParams += `&filter[tenant_id][_eq]=${tenantNum}`;
        }
      }

      if (start_date) {
        filterParams += `&filter[date_created][_gte]=${encodeURIComponent(String(start_date))}`;
      }
      if (end_date) {
        filterParams += `&filter[date_created][_lte]=${encodeURIComponent(String(end_date))}`;
      }
      if (targetNegotiator) {
        filterParams += `&filter[negotiator_name][_eq]=${encodeURIComponent(targetNegotiator)}`;
      }

      const contractStatusIn = `%D9%82%D8%B1%D8%A7%D8%B1%D8%AF%D8%A7%D8%AF,%D9%82%D8%B1%D8%A7%D8%B1%D8%AF%D8%A7%D8%AF%20%2F%20%D9%81%D8%A7%DA%A9%D8%AA%D9%88%D8%B1,%D9%82%D8%B1%D8%A7%D8%B1%D8%AF%D8%A7%D8%AF%2F%D9%81%D8%A7%DA%A9%D8%AA%D9%88%D8%B1`;

      const [
        totalReportsRes,
        contractsRes,
        avgScoreRes,
        statusGroupRes,
        negotiatorGroupRes,
        negotiatorContractsRes,
        uniqueCustRes,
      ] = await Promise.all([
        directusFetch(`/items/customer_reports?limit=1&meta=filter_count${filterParams}`).catch(() => null),
        directusFetch(`/items/customer_reports?aggregate[count]=*&aggregate[sum]=contract_amount&filter[negotiation_status][_in]=${contractStatusIn}${filterParams}`).catch(() => null),
        directusFetch(`/items/customer_reports?aggregate[avg]=negotiation_score${filterParams}`).catch(() => null),
        directusFetch(`/items/customer_reports?groupBy[]=negotiation_status&aggregate[count]=*&limit=-1${filterParams}`).catch(() => null),
        directusFetch(`/items/customer_reports?groupBy[]=negotiator_name&aggregate[count]=*&aggregate[sum]=contract_amount&aggregate[avg]=negotiation_score&limit=-1${filterParams}`).catch(() => null),
        directusFetch(`/items/customer_reports?groupBy[]=negotiator_name&aggregate[count]=*&limit=-1&filter[negotiation_status][_in]=${contractStatusIn}${filterParams}`).catch(() => null),
        directusFetch(`/items/customer_reports?aggregate[countDistinct]=customer_id${filterParams}`).catch(() => null),
      ]);

      const totalReports = totalReportsRes?.meta?.filter_count ?? totalReportsRes?.meta?.total_count ?? 0;

      let totalContracts = 0;
      let totalContractAmount = 0;
      if (contractsRes?.data && Array.isArray(contractsRes.data) && contractsRes.data.length > 0) {
        const item = contractsRes.data[0];
        totalContracts = Number(item.count || 0);
        totalContractAmount = Number(item.sum?.contract_amount || 0);
      }

      let avgScore = '0';
      if (avgScoreRes?.data && Array.isArray(avgScoreRes.data) && avgScoreRes.data.length > 0) {
        const rawAvg = Number(avgScoreRes.data[0]?.avg?.negotiation_score);
        if (!isNaN(rawAvg) && rawAvg > 0) {
          avgScore = (Math.round(rawAvg * 10) / 10).toFixed(1);
        }
      }

      const statusBreakdown: Record<string, number> = {};
      if (statusGroupRes?.data && Array.isArray(statusGroupRes.data)) {
        for (const row of statusGroupRes.data) {
          const st = row.negotiation_status || 'سایر';
          const cnt = Number(row.count || 0);
          statusBreakdown[st] = (statusBreakdown[st] || 0) + cnt;
        }
      }

      const contractsByNegotiator = new Map<string, number>();
      if (negotiatorContractsRes?.data && Array.isArray(negotiatorContractsRes.data)) {
        for (const row of negotiatorContractsRes.data) {
          if (row.negotiator_name) {
            contractsByNegotiator.set(row.negotiator_name, Number(row.count || 0));
          }
        }
      }

      const personnelRanking: any[] = [];
      if (negotiatorGroupRes?.data && Array.isArray(negotiatorGroupRes.data)) {
        for (const row of negotiatorGroupRes.data) {
          const pName = row.negotiator_name || 'نامشخص';
          const repCount = Number(row.count || 0);
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
  const rawReports = await ensureReportsCache().catch(() => reportsData);
  let filtered = [...rawReports];

  if (targetNegotiator) {
    filtered = filtered.filter(
      (r) => r.negotiator_name === targetNegotiator || r.created_by === targetNegotiator
    );
  }

  if (start_date) {
    const sMs = new Date(String(start_date)).getTime();
    filtered = filtered.filter((r) => r.date_created && new Date(r.date_created).getTime() >= sMs);
  }
  if (end_date) {
    const eMs = new Date(String(end_date)).getTime();
    filtered = filtered.filter((r) => r.date_created && new Date(r.date_created).getTime() <= eMs);
  }

  const totalReports = filtered.length;
  let totalContracts = 0;
  let totalContractAmount = 0;
  let scoresSum = 0;
  let scoresCount = 0;
  const statusBreakdown: Record<string, number> = {};
  const personnelMap = new Map<string, { count: number; amount: number; scoresSum: number; scoresCount: number }>();

  filtered.forEach((r) => {
    const st = r.negotiation_status || 'سایر';
    statusBreakdown[st] = (statusBreakdown[st] || 0) + 1;

    if (r.negotiation_score && r.negotiation_score > 0) {
      scoresSum += r.negotiation_score;
      scoresCount += 1;
    }

    const isContract =
      r.negotiation_status === 'قرارداد' ||
      r.negotiation_status === 'قرارداد / فاکتور' ||
      Boolean(r.contract_number) ||
      Boolean(r.contract_amount);

    if (isContract) {
      totalContracts += 1;
      if (r.contract_amount && !isNaN(Number(r.contract_amount))) {
        totalContractAmount += Number(r.contract_amount);
      }
    }

    const pName = r.negotiator_name || 'نامشخص';
    let pEntry = personnelMap.get(pName);
    if (!pEntry) {
      pEntry = { count: 0, amount: 0, scoresSum: 0, scoresCount: 0 };
      personnelMap.set(pName, pEntry);
    }
    pEntry.count += 1;
    if (isContract && r.contract_amount && !isNaN(Number(r.contract_amount))) {
      pEntry.amount += Number(r.contract_amount);
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
      contractsCount: 0,
      totalAmount: val.amount,
      avgScore: val.scoresCount > 0 ? (val.scoresSum / val.scoresCount).toFixed(1) : '0',
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount || b.reportsCount - a.reportsCount);

  return res.json({
    totalReports,
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
  const { userId, personnelId, isAdmin, userName, tenantId } = getRequestUser(req);

  const daysCount = days ? Math.max(1, Math.min(parseInt(String(days), 10), 90)) : 14;

  const targetNegotiator = !isAdmin
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

  const contractStatusIn = `%D9%82%D8%B1%D8%A7%D8%B1%D8%AF%D8%A7%D8%AF,%D9%82%D8%B1%D8%A7%D8%B1%D8%AF%D8%A7%D8%AF%20%2F%20%D9%81%D8%A7%DA%A9%D8%AA%D9%88%D8%B1,%D9%82%D8%B1%D8%A7%D8%B1%D8%AF%D8%A7%D8%AF%2F%D9%81%D8%A7%DA%A9%D8%AA%D9%88%D8%B1`;

  let filterParams = `&filter[date_created][_gte]=${encodeURIComponent(rangeStart.toISOString())}&filter[date_created][_lte]=${encodeURIComponent(rangeEnd.toISOString())}`;

  if (tenantId && tenantId !== 'all') {
    const tenantNum = resolveDirectusTenantId(tenantId);
    if (tenantNum) {
      filterParams += `&filter[tenant_id][_eq]=${tenantNum}`;
    }
  }

  if (targetNegotiator) {
    filterParams += `&filter[negotiator_name][_eq]=${encodeURIComponent(targetNegotiator)}`;
  }

  const cacheKey = `daily_${tenantId || 'all'}_${daysCount}_${start_date || ''}_${end_date || ''}_${targetNegotiator || 'all'}`;
  const cacheNow = Date.now();
  const cached = analyticsCache.get(cacheKey);
  if (cached && cacheNow - cached.timestamp < ANALYTICS_CACHE_TTL) {
    return res.json(cached.data);
  }

  if (directusUrl && directusAdminToken) {
    try {
      const [allDaysRes, contractDaysRes, totalAssignedRes, uniqueCustDaysRes, totalUniqueTouchedRes] = await Promise.all([
        directusFetch(
          `/items/customer_reports?groupBy[]=year(date_created)&groupBy[]=month(date_created)&groupBy[]=day(date_created)&aggregate[count]=*&aggregate[avg]=negotiation_score&aggregate[sum]=contract_amount&limit=-1${filterParams}`
        ).catch(() => null),
        directusFetch(
          `/items/customer_reports?groupBy[]=year(date_created)&groupBy[]=month(date_created)&groupBy[]=day(date_created)&aggregate[count]=*&aggregate[sum]=contract_amount&limit=-1&filter[negotiation_status][_in]=${contractStatusIn}${filterParams}`
        ).catch(() => null),
        directusFetch(
          `/items/customers?limit=1&meta=filter_count${tenantId && tenantId !== 'all' ? `&filter[tenant_id][_eq]=${resolveDirectusTenantId(tenantId)}` : ''}${targetNegotiator ? `&filter[assigned_marketer_name][_eq]=${encodeURIComponent(targetNegotiator)}` : ''}`
        ).catch(() => null),
        directusFetch(
          `/items/customer_reports?groupBy[]=year(date_created)&groupBy[]=month(date_created)&groupBy[]=day(date_created)&aggregate[countDistinct]=customer_id&limit=-1${filterParams}`
        ).catch(() => null),
        directusFetch(
          `/items/customer_reports?aggregate[countDistinct]=customer_id${filterParams}`
        ).catch(() => null),
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

      const dayDiff = Math.max(1, Math.min(Math.round((rangeEnd.getTime() - rangeStart.getTime()) / (24 * 60 * 60 * 1000)), 90));
      for (let i = dayDiff - 1; i >= 0; i--) {
        const d = new Date(rangeEnd.getTime() - i * 24 * 60 * 60 * 1000);
        const isoKey = d.toISOString().split('T')[0];
        const jStr = gregorianIsoToJalali(isoKey);
        const dayName = new Intl.DateTimeFormat('fa-IR', { weekday: 'short' }).format(d);
        daysMap.set(isoKey, {
          dateIso: isoKey,
          dateJalali: jStr,
          dayName,
          reportsCount: 0,
          scoresSum: 0,
          scoresCount: 0,
          contractsCount: 0,
          contractsAmount: 0,
          avgScore: '0',
          statusCounts: {},
          uniqueCount: 0,
        });
      }

      if (allDaysRes?.data && Array.isArray(allDaysRes.data)) {
        for (const row of allDaysRes.data) {
          const isoKey = `${row.date_created_year}-${String(row.date_created_month).padStart(2, '0')}-${String(row.date_created_day).padStart(2, '0')}`;
          const count = Number(row.count || 0);
          const rawAvg = Number(row.avg?.negotiation_score || 0);
          const sumAmt = Number(row.sum?.contract_amount || 0);
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
              uniqueCount: 0,
            };
            daysMap.set(isoKey, entry);
          }
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
          const isoKey = `${row.date_created_year}-${String(row.date_created_month).padStart(2, '0')}-${String(row.date_created_day).padStart(2, '0')}`;
          const uCount = Number(row.countDistinct?.customer_id || 0);
          const entry = daysMap.get(isoKey);
          if (entry && uCount > 0) {
            entry.uniqueCount = uCount;
          }
        }
      }

      if (contractDaysRes?.data && Array.isArray(contractDaysRes.data)) {
        for (const row of contractDaysRes.data) {
          const isoKey = `${row.date_created_year}-${String(row.date_created_month).padStart(2, '0')}-${String(row.date_created_day).padStart(2, '0')}`;
          const cCount = Number(row.count || 0);
          const cSum = Number(row.sum?.contract_amount || 0);
          const entry = daysMap.get(isoKey);
          if (entry) {
            entry.contractsCount = cCount;
            if (cSum > 0) entry.contractsAmount = cSum;
          }
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

  return res.json({
    daysList: [],
    totalReports: 0,
    totalContracts: 0,
    totalAmount: 0,
    avgScore: '0',
    activeDaysCount: 0,
    avgPerActiveDay: '0',
  });
});

export default router;
