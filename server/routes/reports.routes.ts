import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import {
  directusUrl,
  directusAdminToken,
  reportsData,
  customersData,
} from '../config';
import { directusFetch, directusFetchAllPages } from '../directus/client';
import {
  ensureCustomersCache,
  ensureReportsCache,
  invalidateCustomersCache,
  invalidateReportsCache,
} from '../directus/cache';
import { getSafeDirectusPersonnelForeignKey } from '../directus/sync';
import { cleanCustomerPayloadForDirectus } from '../services/phoneNormalizer';
import { getRequestUser, matchesTenant } from '../middlewares/auth.middleware';
import { CustomerReport } from '../types';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const { customer_id, page, limit, all, status, negotiator } = req.query;
  const { userId, personnelId, isAdmin, userName, tenantId } = getRequestUser(req);

  const isUnlimited = all === 'true' || limit === 'all' || limit === '50000';
  const reqLimit = isUnlimited
    ? 5000
    : limit
    ? Math.min(Math.max(1, parseInt(String(limit), 10)), 5000)
    : 25;
  const reqPage = page ? Math.max(1, parseInt(String(page), 10)) : 1;

  if (!isAdmin && !userId && !personnelId && !userName && !customer_id) {
    return res.json({
      data: [],
      meta: { filter_count: 0, total_count: 0, page: reqPage, limit: reqLimit, total_pages: 1 },
    });
  }

  const allCustomers = await ensureCustomersCache().catch(() => customersData);
  const allReports = await ensureReportsCache().catch(() => reportsData);

  const applyFilters = (list: any[]) => {
    let result = list;

    if (tenantId && tenantId !== 'all') {
      result = result.filter((r) => matchesTenant(r.tenant_id, tenantId));
    }

    if (customer_id) {
      result = result.filter((r) => r.customer_id === customer_id);
    } else if (!isAdmin) {
      result = result.filter((r) => {
        const matchNegotiator = userName && r.negotiator_name === userName;
        const matchCreatedBy =
          (userId && r.created_by === userId) ||
          (personnelId && r.created_by === personnelId) ||
          (userName && r.created_by === userName);
        const customer = allCustomers.find((c) => c.id === r.customer_id);
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
      const directusReportPayload: Record<string, any> = {
        ...newReport,
        created_by: safeCreatedByFk,
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
  const { isAdmin } = getRequestUser(req);

  if (!isAdmin) {
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
