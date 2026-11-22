import { Router, Request, Response } from 'express';
import {
  directusUrl,
  directusAdminToken,
  personnelData,
  payrollAdjustmentsData,
  payrollSlipsData,
} from '../config.ts';
import { directusFetch, directusFetchAllPages } from '../directus/client.ts';
import { getRequestUser, matchesTenant } from '../middlewares/auth.middleware.ts';
import {
  resolvePersonnelId,
  getSafeDirectusPersonnelForeignKey,
  resolveDirectusTenantId,
} from '../directus/sync.ts';
import { normalizePersianString } from '../services/phoneNormalizer.ts';
import { getPersonnelFullName } from '../services/sms.service.ts';
import {
  PayrollAdjustment,
  PayrollAdjustmentCategory,
  PayrollAdjustmentSource,
  PayrollAdjustmentStatus,
  PayrollAdjustmentType,
} from '../types.ts';

const router = Router();

const VALID_TYPES: PayrollAdjustmentType[] = ['bonus', 'deduction'];
const VALID_STATUSES: PayrollAdjustmentStatus[] = ['pending', 'approved', 'rejected'];
const VALID_CATEGORIES: PayrollAdjustmentCategory[] = [
  'sales_bonus',
  'overtime',
  'delay',
  'insurance',
  'penalty',
  'other',
];

function findCallerPersonnel(req: Request) {
  const { personnelId, userId, userEmail, userName } = getRequestUser(req);
  const cleanPId = String(personnelId || '').trim().toLowerCase();
  const cleanUId = String(userId || '').trim().toLowerCase();
  const cleanEmail = String(userEmail || '').trim().toLowerCase();
  const normName = normalizePersianString(userName);

  return (
    personnelData.find((p) => {
      const pId = String(p.id || '').trim().toLowerCase();
      const pUid = String(p.user_id || '').trim().toLowerCase();
      const pEmail = String(p.email || '').trim().toLowerCase();
      const pName = normalizePersianString(p.name);
      return (
        (cleanPId && (pId === cleanPId || pId.replace(/^p-/, '') === cleanPId.replace(/^p-/, ''))) ||
        (cleanUId && (pUid === cleanUId || pId === cleanUId)) ||
        (cleanEmail && pEmail === cleanEmail) ||
        (normName && pName && pName === normName)
      );
    }) || null
  );
}

function canManageAdjustments(req: Request): boolean {
  const { isAdmin, userRole } = getRequestUser(req);
  if (isAdmin || userRole === 'admin' || userRole === 'sales_manager') return true;
  const callerP = findCallerPersonnel(req);
  return Boolean(
    callerP?.permissions?.can_approve_bonuses ||
      callerP?.permissions?.allowed_menus?.includes('payroll')
  );
}

function canSelfRequestBonus(req: Request): boolean {
  if (canManageAdjustments(req)) return true;
  const callerP = findCallerPersonnel(req);
  return Boolean(callerP?.permissions?.can_request_bonus);
}

export function normalizePayrollAdjustment(r: any): PayrollAdjustment {
  const pIdStr =
    typeof r.personnel_id === 'object' && r.personnel_id !== null
      ? String(r.personnel_id.id)
      : String(r.personnel_id || '');
  const pObj = personnelData.find(
    (p) =>
      String(p.id) === pIdStr ||
      String(p.id).replace(/^p-/, '') === pIdStr.replace(/^p-/, '')
  );
  const pName =
    (typeof r.personnel_id === 'object' && r.personnel_id !== null
      ? r.personnel_id.name
      : undefined) ||
    (r.personnel_name && r.personnel_name !== pIdStr ? r.personnel_name : '') ||
    pObj?.name ||
    'همکار شرکت';

  const tenantVal =
    typeof r.tenant_id === 'object' && r.tenant_id !== null
      ? r.tenant_id.id
      : r.tenant_id ?? null;

  const slipVal =
    typeof r.payroll_slip_id === 'object' && r.payroll_slip_id !== null
      ? r.payroll_slip_id.id
      : r.payroll_slip_id ?? null;

  return {
    id: r.id,
    tenant_id: tenantVal !== null && tenantVal !== undefined ? String(tenantVal) : null,
    personnel_id: pIdStr,
    personnel_name: pName,
    type: r.type === 'deduction' ? 'deduction' : 'bonus',
    category: r.category || 'other',
    title: String(r.title || '').trim(),
    amount: Number(r.amount) || 0,
    approved_amount:
      r.approved_amount !== null && r.approved_amount !== undefined && r.approved_amount !== ''
        ? Number(r.approved_amount)
        : null,
    target_year:
      r.target_year !== null && r.target_year !== undefined && r.target_year !== ''
        ? Number(r.target_year)
        : null,
    target_month:
      r.target_month !== null && r.target_month !== undefined && r.target_month !== ''
        ? Number(r.target_month)
        : null,
    effective_date: r.effective_date || null,
    reason: r.reason || '',
    status: VALID_STATUSES.includes(r.status) ? r.status : 'pending',
    source: r.source === 'manager_direct' ? 'manager_direct' : 'self_request',
    created_by: r.created_by || null,
    manager_note: r.manager_note || null,
    reviewed_by: r.reviewed_by || null,
    reviewed_at: r.reviewed_at || null,
    payroll_slip_id: slipVal,
    date_created: r.date_created || new Date().toISOString(),
    date_updated: r.date_updated || undefined,
  };
}

function matchesAdjustmentOwner(
  adj: PayrollAdjustment,
  personnelId: string,
  userId: string,
  userName: string
): boolean {
  const adjPId = String(adj.personnel_id || '').trim().toLowerCase();
  const cleanAdjPId = adjPId.replace(/^p-/, '');
  const cleanPId = String(personnelId || '').trim().toLowerCase();
  const rawPId = cleanPId.replace(/^p-/, '');
  const cleanUId = String(userId || '').trim().toLowerCase();
  const normUser = normalizePersianString(userName);
  const normAdjName = normalizePersianString(adj.personnel_name);

  if (cleanPId && (adjPId === cleanPId || (rawPId && cleanAdjPId === rawPId))) return true;
  if (cleanUId && (adjPId === cleanUId || cleanAdjPId === cleanUId)) return true;
  if (normUser && normAdjName && normUser === normAdjName) return true;
  return false;
}

async function isSlipPaid(slipId: number | string | null | undefined): Promise<boolean> {
  if (!slipId) return false;
  const localSlip = payrollSlipsData.find((s) => String(s.id) === String(slipId));
  if (localSlip) return localSlip.status === 'paid';
  if (directusUrl && directusAdminToken) {
    try {
      const resp = await directusFetch(
        `/items/payroll_slips/${encodeURIComponent(String(slipId))}?fields=id,status`
      );
      if (resp?.data) {
        return resp.data.status === 'paid';
      }
    } catch {}
  }
  return false;
}

// --------------------------------------------------------------------------
// 1. GET /api/payroll-adjustments - List adjustments
//    - Managers see all in tenant (with optional query filters)
//    - Employees see ONLY their own (both self_request and manager_direct, bonus & deduction)
// --------------------------------------------------------------------------
const getAdjustmentsHandler = async (req: Request, res: Response) => {
  const { isAuthenticated, userId, personnelId, userName, tenantId } = getRequestUser(req);
  if (!isAuthenticated) {
    return res.status(401).json({ error: 'لطفاً ابتدا وارد سامانه شوید.' });
  }

  const isManager = canManageAdjustments(req);
  const {
    personnel_id,
    type,
    status,
    source,
    target_year,
    target_month,
    unlinked_only,
    scope,
  } = req.query;

  let list: PayrollAdjustment[] = [];

  if (directusUrl && directusAdminToken) {
    try {
      const resp = await directusFetchAllPages(
        '/items/payroll_adjustments?fields=*,personnel_id.*&sort=-date_created,-id'
      );
      if (resp && Array.isArray(resp.data)) {
        list = resp.data.map(normalizePayrollAdjustment);
      }
    } catch (err: any) {
      console.warn('Directus payroll_adjustments fetch notice:', err.message);
      list = payrollAdjustmentsData.map(normalizePayrollAdjustment);
    }
  } else {
    list = payrollAdjustmentsData.map(normalizePayrollAdjustment);
  }

  // Tenant isolation
  if (tenantId && tenantId !== 'all') {
    list = list.filter((r) => {
      if (!r.tenant_id) return true;
      return (
        matchesTenant(String(r.tenant_id), tenantId) ||
        matchesTenant(String(r.tenant_id), '1') ||
        matchesTenant(String(r.tenant_id), 'default')
      );
    });
  }

  // Scope restriction: non-managers OR explicit personal portal 'mine' scope only see own rows
  if (!isManager || scope === 'mine') {
    const callerP = findCallerPersonnel(req);
    const effectivePId = callerP?.id || personnelId;
    const effectiveName = callerP?.name || userName;
    list = list.filter((r) => matchesAdjustmentOwner(r, effectivePId, userId, effectiveName));
  } else if (personnel_id && personnel_id !== 'all') {
    const targetClean = String(personnel_id).trim().toLowerCase().replace(/^p-/, '');
    list = list.filter((r) => {
      const rClean = String(r.personnel_id || '').trim().toLowerCase().replace(/^p-/, '');
      return String(r.personnel_id) === String(personnel_id) || (targetClean && rClean === targetClean);
    });
  }

  if (type && type !== 'all') {
    list = list.filter((r) => r.type === type);
  }
  if (status && status !== 'all') {
    list = list.filter((r) => r.status === status);
  }
  if (source && source !== 'all') {
    list = list.filter((r) => r.source === source);
  }
  if (target_year && target_year !== 'all') {
    const y = Number(target_year);
    if (!isNaN(y)) list = list.filter((r) => Number(r.target_year) === y);
  }
  if (target_month && target_month !== 'all') {
    const m = Number(target_month);
    if (!isNaN(m)) list = list.filter((r) => Number(r.target_month) === m);
  }
  if (unlinked_only === 'true') {
    list = list.filter((r) => !r.payroll_slip_id);
  }

  res.json(list);
};

router.get(['/api/payroll-adjustments', '/payroll-adjustments'], getAdjustmentsHandler);

// --------------------------------------------------------------------------
// 2. POST /api/payroll-adjustments - Create bonus request or direct bonus/deduction
// --------------------------------------------------------------------------
router.post(['/api/payroll-adjustments', '/payroll-adjustments'], async (req: Request, res: Response) => {
  const { isAuthenticated, userId, personnelId, userName, tenantId } = getRequestUser(req);
  if (!isAuthenticated) {
    return res.status(401).json({ error: 'لطفاً ابتدا وارد سامانه شوید.' });
  }

  const isManager = canManageAdjustments(req);
  const callerP = findCallerPersonnel(req);
  const payload = req.body || {};

  // Determine whether this is a self-request or manager direct action
  const requestedSelfMode = payload.source === 'self_request' || !isManager;

  if (!isManager) {
    if (!canSelfRequestBonus(req)) {
      return res.status(403).json({
        error: 'شما مجوز ثبت درخواست پاداش را ندارید. لطفاً با مدیریت هماهنگ کنید.',
      });
    }
    if (payload.type === 'deduction') {
      return res.status(403).json({
        error: 'تنها مدیریت مجاز به ثبت کسری حقوق است.',
      });
    }
  }

  // Input validation
  const title = String(payload.title || '').trim();
  if (!title || title.length > 200) {
    return res.status(400).json({ error: 'عنوان پاداش یا کسری الزامی است (حداکثر ۲۰۰ کاراکتر).' });
  }

  const amount = Math.round(Number(payload.amount));
  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ error: 'مبلغ باید عددی مثبت و معتبر (به تومان) باشد.' });
  }

  const adjType: PayrollAdjustmentType =
    !isManager || requestedSelfMode
      ? 'bonus'
      : VALID_TYPES.includes(payload.type)
      ? payload.type
      : 'bonus';

  const category: PayrollAdjustmentCategory = VALID_CATEGORIES.includes(payload.category)
    ? payload.category
    : 'other';

  const targetYear =
    payload.target_year !== undefined && payload.target_year !== null && payload.target_year !== ''
      ? Number(payload.target_year)
      : null;
  if (targetYear !== null && (!Number.isInteger(targetYear) || targetYear < 1390 || targetYear > 1450)) {
    return res.status(400).json({ error: 'سال شمسی نامعتبر است.' });
  }

  const targetMonth =
    payload.target_month !== undefined && payload.target_month !== null && payload.target_month !== ''
      ? Number(payload.target_month)
      : null;
  if (targetMonth !== null && (!Number.isInteger(targetMonth) || targetMonth < 1 || targetMonth > 12)) {
    return res.status(400).json({ error: 'ماه شمسی باید بین ۱ تا ۱۲ باشد.' });
  }

  const reason = String(payload.reason || '').trim().slice(0, 250);
  const nowIso = new Date().toISOString();

  // Resolve target personnel (non-managers are strictly locked to themselves)
  const rawTargetPId =
    !isManager || requestedSelfMode
      ? callerP?.id || personnelId || userId
      : String(payload.personnel_id || '').trim();

  if (!rawTargetPId) {
    return res.status(400).json({ error: 'انتخاب همکار الزامی است.' });
  }

  const resolved = await resolvePersonnelId(
    rawTargetPId,
    !isManager || requestedSelfMode ? callerP?.name || userName : payload.personnel_name
  );
  let targetPersonnelId = resolved.personnelId || rawTargetPId;
  let targetPersonnelName =
    resolved.personnelName ||
    (!isManager || requestedSelfMode ? callerP?.name || userName : payload.personnel_name) ||
    'همکار شرکت';

  const matchedTargetP = personnelData.find(
    (p) =>
      String(p.id) === String(targetPersonnelId) ||
      String(p.id).replace(/^p-/, '') === String(targetPersonnelId).replace(/^p-/, '')
  );
  if (matchedTargetP) {
    targetPersonnelId = matchedTargetP.id;
    targetPersonnelName = matchedTargetP.name;
  }

  const creatorInfo = await getPersonnelFullName(callerP?.id || personnelId || userId, userName);
  const creatorFullName = creatorInfo.fullName || callerP?.name || userName || 'کاربر سیستم';

  const isDirectManagerEntry = isManager && !requestedSelfMode;
  const source: PayrollAdjustmentSource = isDirectManagerEntry ? 'manager_direct' : 'self_request';
  const status: PayrollAdjustmentStatus = isDirectManagerEntry ? 'approved' : 'pending';

  const effectiveDate = payload.effective_date
    ? String(payload.effective_date).includes('T')
      ? String(payload.effective_date)
      : `${payload.effective_date}T00:00:00.000Z`
    : nowIso;

  const targetTenantId = matchedTargetP?.tenant_id || payload.tenant_id || tenantId || 'default';
  const resolvedTenantNum = resolveDirectusTenantId(targetTenantId);

  const newRecord: PayrollAdjustment = {
    id: Date.now() + Math.floor(Math.random() * 1000),
    tenant_id: targetTenantId,
    personnel_id: targetPersonnelId,
    personnel_name: targetPersonnelName,
    type: adjType,
    category,
    title,
    amount,
    approved_amount: isDirectManagerEntry ? amount : null,
    target_year: targetYear,
    target_month: targetMonth,
    effective_date: effectiveDate,
    reason,
    status,
    source,
    created_by: creatorFullName,
    manager_note: isDirectManagerEntry && payload.manager_note ? String(payload.manager_note).trim().slice(0, 250) : null,
    reviewed_by: isDirectManagerEntry ? creatorFullName : null,
    reviewed_at: isDirectManagerEntry ? nowIso : null,
    payroll_slip_id: null,
    date_created: nowIso,
    date_updated: nowIso,
  };

  if (directusUrl && directusAdminToken) {
    try {
      const safePId = await getSafeDirectusPersonnelForeignKey(targetPersonnelId, targetPersonnelName);
      const directusPayload: Record<string, any> = {
        tenant_id: resolvedTenantNum,
        personnel_id: safePId,
        personnel_name: targetPersonnelName,
        type: adjType,
        category,
        title,
        amount,
        approved_amount: newRecord.approved_amount,
        target_year: targetYear,
        target_month: targetMonth,
        effective_date: effectiveDate,
        reason,
        status,
        source,
        created_by: creatorFullName,
        manager_note: newRecord.manager_note,
        reviewed_by: newRecord.reviewed_by,
        reviewed_at: newRecord.reviewed_at,
        payroll_slip_id: null,
      };

      const created = await directusFetch('/items/payroll_adjustments', {
        method: 'POST',
        body: JSON.stringify(directusPayload),
      }).catch(async (primaryErr: any) => {
        if (
          primaryErr.message &&
          (primaryErr.message.includes('foreign key') ||
            primaryErr.message.includes('FOREIGN_KEY') ||
            primaryErr.message.includes('tenant_id'))
        ) {
          return await directusFetch('/items/payroll_adjustments', {
            method: 'POST',
            body: JSON.stringify({
              ...directusPayload,
              tenant_id: null,
            }),
          });
        }
        throw primaryErr;
      });

      if (created?.data) {
        const saved = normalizePayrollAdjustment({
          ...newRecord,
          ...created.data,
          personnel_id: targetPersonnelId,
          personnel_name: targetPersonnelName,
        });
        payrollAdjustmentsData.unshift(saved);
        return res.status(201).json(saved);
      }
    } catch (err: any) {
      console.warn('Directus payroll_adjustments POST notice (fallback to memory):', err.message);
    }
  }

  payrollAdjustmentsData.unshift(newRecord);
  return res.status(201).json(newRecord);
});

// --------------------------------------------------------------------------
// 3. PATCH /api/payroll-adjustments/:id - Manager approve/reject or edit
// --------------------------------------------------------------------------
router.patch(['/api/payroll-adjustments/:id', '/payroll-adjustments/:id'], async (req: Request, res: Response) => {
  const { isAuthenticated, userId, personnelId, userName } = getRequestUser(req);
  if (!isAuthenticated) {
    return res.status(401).json({ error: 'لطفاً ابتدا وارد سامانه شوید.' });
  }

  if (!canManageAdjustments(req)) {
    return res.status(403).json({
      error: 'شما دسترسی لازم برای بررسی یا ویرایش پاداش و کسری را ندارید.',
    });
  }

  const { id } = req.params;
  const body = req.body || {};

  // Locate existing record
  let existing = payrollAdjustmentsData.find((r) => String(r.id) === String(id)) || null;
  if (!existing && directusUrl && directusAdminToken) {
    try {
      const resp = await directusFetch(`/items/payroll_adjustments/${encodeURIComponent(id)}`);
      if (resp?.data) existing = normalizePayrollAdjustment(resp.data);
    } catch {}
  }

  if (!existing) {
    return res.status(404).json({ error: 'رکورد پاداش یا کسری یافت نشد.' });
  }

  if (await isSlipPaid(existing.payroll_slip_id)) {
    return res.status(400).json({
      error: 'این مورد در یک فیش حقوقی «پرداخت شده» لحاظ شده و دیگر قابل تغییر نیست.',
    });
  }

  const reviewerInfo = await getPersonnelFullName(personnelId || userId, userName);
  const reviewerFullName = reviewerInfo.fullName || userName || 'مدیر سیستم';
  const nowIso = new Date().toISOString();

  const patchPayload: Record<string, any> = {};

  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status)) {
      return res.status(400).json({ error: 'وضعیت نامعتبر است.' });
    }
    patchPayload.status = body.status;
    patchPayload.reviewed_by = reviewerFullName;
    patchPayload.reviewed_at = nowIso;

    if (body.status === 'approved') {
      const rawApproved =
        body.approved_amount !== undefined && body.approved_amount !== null && body.approved_amount !== ''
          ? Math.round(Number(body.approved_amount))
          : existing.amount;
      if (!Number.isFinite(rawApproved) || rawApproved <= 0) {
        return res.status(400).json({ error: 'مبلغ تاییدشده باید عددی مثبت باشد.' });
      }
      patchPayload.approved_amount = rawApproved;
    } else if (body.status === 'rejected') {
      patchPayload.approved_amount = null;
    }
  } else if (body.approved_amount !== undefined) {
    const rawApproved =
      body.approved_amount === null || body.approved_amount === ''
        ? null
        : Math.round(Number(body.approved_amount));
    if (rawApproved !== null && (!Number.isFinite(rawApproved) || rawApproved <= 0)) {
      return res.status(400).json({ error: 'مبلغ تاییدشده نامعتبر است.' });
    }
    patchPayload.approved_amount = rawApproved;
  }

  if (body.manager_note !== undefined) {
    patchPayload.manager_note = body.manager_note ? String(body.manager_note).trim().slice(0, 250) : null;
  }
  if (body.title !== undefined) {
    const cleanTitle = String(body.title).trim();
    if (!cleanTitle || cleanTitle.length > 200) {
      return res.status(400).json({ error: 'عنوان نامعتبر است.' });
    }
    patchPayload.title = cleanTitle;
  }
  if (body.amount !== undefined) {
    const numAmt = Math.round(Number(body.amount));
    if (!Number.isFinite(numAmt) || numAmt <= 0) {
      return res.status(400).json({ error: 'مبلغ باید عددی مثبت باشد.' });
    }
    patchPayload.amount = numAmt;
    if (existing.source === 'manager_direct' && body.approved_amount === undefined) {
      patchPayload.approved_amount = numAmt;
    }
  }
  if (body.category !== undefined && VALID_CATEGORIES.includes(body.category)) {
    patchPayload.category = body.category;
  }
  if (body.reason !== undefined) {
    patchPayload.reason = String(body.reason || '').trim().slice(0, 250);
  }
  if (body.target_year !== undefined) {
    const y = body.target_year === null || body.target_year === '' ? null : Number(body.target_year);
    if (y !== null && (!Number.isInteger(y) || y < 1390 || y > 1450)) {
      return res.status(400).json({ error: 'سال شمسی نامعتبر است.' });
    }
    patchPayload.target_year = y;
  }
  if (body.target_month !== undefined) {
    const m = body.target_month === null || body.target_month === '' ? null : Number(body.target_month);
    if (m !== null && (!Number.isInteger(m) || m < 1 || m > 12)) {
      return res.status(400).json({ error: 'ماه شمسی نامعتبر است.' });
    }
    patchPayload.target_month = m;
  }

  if (directusUrl && directusAdminToken) {
    try {
      const updated = await directusFetch(`/items/payroll_adjustments/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(patchPayload),
      });
      if (updated?.data) {
        const saved = normalizePayrollAdjustment({
          ...existing,
          ...updated.data,
          personnel_id: existing.personnel_id,
          personnel_name: existing.personnel_name,
        });
        const idx = payrollAdjustmentsData.findIndex((r) => String(r.id) === String(id));
        if (idx >= 0) payrollAdjustmentsData[idx] = saved;
        else payrollAdjustmentsData.unshift(saved);
        return res.json(saved);
      }
    } catch (err: any) {
      console.warn('Directus payroll_adjustments PATCH notice:', err.message);
    }
  }

  const updatedLocal: PayrollAdjustment = {
    ...existing,
    ...patchPayload,
    date_updated: nowIso,
  };
  const idx = payrollAdjustmentsData.findIndex((r) => String(r.id) === String(id));
  if (idx >= 0) payrollAdjustmentsData[idx] = updatedLocal;
  else payrollAdjustmentsData.unshift(updatedLocal);

  return res.json(updatedLocal);
});

// --------------------------------------------------------------------------
// 4. DELETE /api/payroll-adjustments/:id
//    - Employees can ONLY delete their own pending self_request items
//    - Managers can delete any item not locked to a paid slip
// --------------------------------------------------------------------------
router.delete(['/api/payroll-adjustments/:id', '/payroll-adjustments/:id'], async (req: Request, res: Response) => {
  const { isAuthenticated, userId, personnelId, userName } = getRequestUser(req);
  if (!isAuthenticated) {
    return res.status(401).json({ error: 'لطفاً ابتدا وارد سامانه شوید.' });
  }

  const { id } = req.params;
  const isManager = canManageAdjustments(req);

  let existing = payrollAdjustmentsData.find((r) => String(r.id) === String(id)) || null;
  if (!existing && directusUrl && directusAdminToken) {
    try {
      const resp = await directusFetch(`/items/payroll_adjustments/${encodeURIComponent(id)}`);
      if (resp?.data) existing = normalizePayrollAdjustment(resp.data);
    } catch {}
  }

  if (!existing) {
    return res.status(404).json({ error: 'رکورد مورد نظر یافت نشد.' });
  }

  if (!isManager) {
    const callerP = findCallerPersonnel(req);
    const isOwner = matchesAdjustmentOwner(
      existing,
      callerP?.id || personnelId,
      userId,
      callerP?.name || userName
    );
    if (!isOwner || existing.source !== 'self_request' || existing.status !== 'pending' || existing.payroll_slip_id) {
      return res.status(403).json({
        error: 'شما فقط مجاز به حذف درخواست‌های پاداش در انتظار بررسی خود هستید.',
      });
    }
  } else if (await isSlipPaid(existing.payroll_slip_id)) {
    return res.status(400).json({
      error: 'این مورد در یک فیش پرداخت‌شده لحاظ شده و قابل حذف نیست.',
    });
  }

  if (directusUrl && directusAdminToken) {
    try {
      await directusFetch(`/items/payroll_adjustments/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
    } catch (err: any) {
      console.warn('Directus payroll_adjustments DELETE notice:', err.message);
    }
  }

  const idx = payrollAdjustmentsData.findIndex((r) => String(r.id) === String(id));
  if (idx >= 0) {
    payrollAdjustmentsData.splice(idx, 1);
  }

  return res.json({ success: true });
});

export default router;
