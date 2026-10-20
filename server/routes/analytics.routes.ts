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

// GET /api/analytics/stats
router.get(['/stats', '/api/analytics/stats'], async (req: Request, res: Response) => {
  const { start_date, end_date, negotiator } = req.query;
  const { userId, personnelId, isAdmin, userName, tenantId } = getRequestUser(req);

  const targetNegotiator = !isAdmin
    ? userName || ''
    : negotiator && negotiator !== 'all' && negotiator !== 'همه'
    ? String(negotiator)
    : '';

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
      ] = await Promise.all([
        directusFetch(`/items/customer_reports?limit=1&meta=filter_count${filterParams}`).catch(() => null),
        directusFetch(`/items/customer_reports?aggregate[count]=*&aggregate[sum]=contract_amount&filter[negotiation_status][_in]=${contractStatusIn}${filterParams}`).catch(() => null),
        directusFetch(`/items/customer_reports?aggregate[avg]=negotiation_score${filterParams}`).catch(() => null),
        directusFetch(`/items/customer_reports?groupBy[]=negotiation_status&aggregate[count]=*${filterParams}`).catch(() => null),
        directusFetch(`/items/customer_reports?groupBy[]=negotiator_name&aggregate[count]=*&aggregate[sum]=contract_amount&aggregate[avg]=negotiation_score${filterParams}`).catch(() => null),
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

      const personnelRanking: any[] = [];
      if (negotiatorGroupRes?.data && Array.isArray(negotiatorGroupRes.data)) {
        for (const row of negotiatorGroupRes.data) {
          const pName = row.negotiator_name || 'نامشخص';
          const repCount = Number(row.count || 0);
          const cAmount = Number(row.sum?.contract_amount || 0);
          const rawAvg = Number(row.avg?.negotiation_score || 0);
          personnelRanking.push({
            personnelName: pName,
            reportsCount: repCount,
            contractsCount: 0, // Computed from ranking
            totalAmount: cAmount,
            avgScore: rawAvg > 0 ? (Math.round(rawAvg * 10) / 10).toFixed(1) : '0',
          });
        }
      }

      return res.json({
        totalReports,
        totalContracts,
        totalContractAmount,
        avgScore,
        statusBreakdown,
        personnelRanking: personnelRanking.sort((a, b) => b.totalAmount - a.totalAmount || b.reportsCount - a.reportsCount),
      });
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

export default router;
