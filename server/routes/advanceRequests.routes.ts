import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import {
  directusUrl,
  directusAdminToken,
  advanceRequestsData,
  personnelData,
  projectSettingsData,
} from '../config';
import { directusFetch, directusFetchAllPages } from '../directus/client';
import { getRequestUser, matchesTenant } from '../middlewares/auth.middleware';
import { sendIppanelSmsPattern, sendTenantAdminsSmsPattern } from '../services/sms.service';
import { resolvePersonnelId, getSafeDirectusPersonnelForeignKey, resolveDirectusTenantId } from '../directus/sync';
import { SalaryAdvanceRequest } from '../types';

const router = Router();

// GET /api/advance-requests
router.get('/api/advance-requests', async (req: Request, res: Response) => {
  const { userId, personnelId, isAdmin, userName, tenantId } = getRequestUser(req);
  if (directusUrl && directusAdminToken) {
    try {
      const resp = await directusFetchAllPages('/items/advance_requests?sort=-date_created');
      if (resp && Array.isArray(resp.data)) {
        let list: SalaryAdvanceRequest[] = resp.data.map((r: any) => ({
          ...r,
          personnel_id: typeof r.personnel_id === 'object' && r.personnel_id !== null ? r.personnel_id.id : String(r.personnel_id || ''),
          personnel_name: r.personnel_name || (typeof r.personnel_id === 'object' && r.personnel_id !== null ? (r.personnel_id.name || r.personnel_id.first_name) : 'کارشناس شرکت')
        }));

        if (tenantId && tenantId !== 'all') {
          list = list.filter((r: any) => matchesTenant(r.tenant_id, tenantId));
        }

        if (!isAdmin) {
          list = list.filter(
            (r) =>
              r.personnel_id === personnelId ||
              r.personnel_id === userId ||
              (userName && r.personnel_name === userName)
          );
        }
        return res.json(list);
      }
    } catch (err: any) {}
  }

  let list = [...advanceRequestsData];
  if (tenantId && tenantId !== 'all') {
    list = list.filter((r: any) => matchesTenant(r.tenant_id, tenantId));
  }
  if (!isAdmin) {
    list = list.filter(
      (r) =>
        r.personnel_id === personnelId ||
        r.personnel_id === userId ||
        (userName && r.personnel_name === userName)
    );
  }
  res.json(list);
});

// POST /api/advance-requests
router.post('/api/advance-requests', async (req: Request, res: Response) => {
  const payload = req.body;
  const { userId, personnelId, userName, tenantId } = getRequestUser(req);
  const newId = crypto.randomUUID();
  const nowIso = new Date().toISOString();

  const rawPId = payload.personnel_id || personnelId || userId;
  const resolved = await resolvePersonnelId(rawPId, payload.personnel_name || userName);
  let targetPersonnelId = resolved.personnelId;
  let targetPersonnelName = resolved.personnelName || payload.personnel_name || userName || 'کارشناس شرکت';

  if (!targetPersonnelId) {
    const pMatch = personnelData.find(p => p.name === targetPersonnelName || p.id === rawPId) || personnelData[0];
    if (pMatch?.id) targetPersonnelId = pMatch.id;
  }

  const targetTenantId = payload.tenant_id || tenantId || 'default';
  const resolvedTenantNum = resolveDirectusTenantId(targetTenantId);

  let isoNeededDate: string | null = null;
  if (payload.needed_date) {
    isoNeededDate = payload.needed_date.includes('T') ? payload.needed_date : `${payload.needed_date}T00:00:00.000Z`;
  }

  const newRequest: SalaryAdvanceRequest = {
    id: newId,
    tenant_id: targetTenantId,
    personnel_id: targetPersonnelId || 'p-1',
    personnel_name: targetPersonnelName,
    amount: Number(payload.amount) || 0,
    target_month: payload.target_month || '',
    needed_date: isoNeededDate,
    reason: payload.reason || '',
    bank_card_number: payload.bank_card_number || null,
    iban: payload.iban || null,
    status: 'pending',
    approved_amount: null,
    manager_note: null,
    reviewed_by: null,
    reviewed_at: null,
    date_created: nowIso
  };

  let applicantPhone = '';
  const applicantP = personnelData.find(p => p.id === targetPersonnelId || p.user_id === targetPersonnelId || p.name === targetPersonnelName);
  if (applicantP?.phone) {
    applicantPhone = applicantP.phone;
  }

  if (projectSettingsData.addvance_request_pattern) {
    const nameParts = (targetPersonnelName || '').trim().split(' ');
    const fName = nameParts[0] || 'همکار';
    const lName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'گرامی';
    const now = new Date();
    const jalaliDate = now.toLocaleDateString('fa-IR');
    const amountStr = String(newRequest.amount || 0);

    const advVars = {
      name: fName,
      family: lName,
      fullName: targetPersonnelName,
      mobile: applicantPhone || 'نامشخص',
      phone: applicantPhone || 'نامشخص',
      amount: amountStr,
      requested_amount: amountStr,
      target_month: newRequest.target_month || '-',
      needed_date: payload.needed_date || jalaliDate,
      reason: newRequest.reason || '-'
    };

    if (applicantPhone) {
      sendIppanelSmsPattern(applicantPhone, projectSettingsData.addvance_request_pattern, advVars)
        .catch(e => console.warn('Advance request SMS to applicant error:', e.message));
    }
    sendTenantAdminsSmsPattern(targetTenantId, projectSettingsData.addvance_request_pattern, advVars)
      .catch(e => console.warn('Advance request SMS to admin error:', e.message));
  }

  if (directusUrl && directusAdminToken) {
    try {
      const safeDirectusPersonnelId = await getSafeDirectusPersonnelForeignKey(targetPersonnelId, targetPersonnelName);

      const directusAdvancePayload: any = {
        personnel_id: safeDirectusPersonnelId,
        personnel_name: targetPersonnelName,
        amount: Number(payload.amount) || 0,
        target_month: payload.target_month || '',
        needed_date: isoNeededDate,
        reason: payload.reason || '',
        bank_card_number: payload.bank_card_number || null,
        iban: payload.iban || null,
        status: 'pending',
        approved_amount: null,
        manager_note: null,
        reviewed_by: null,
        reviewed_at: null,
        date_created: nowIso,
        tenant_id: resolvedTenantNum
      };

      let created = await directusFetch('/items/advance_requests', {
        method: 'POST',
        body: JSON.stringify(directusAdvancePayload)
      }).catch(async (primaryErr: any) => {
        if (primaryErr.message && (primaryErr.message.includes('foreign key') || primaryErr.message.includes('FOREIGN_KEY') || primaryErr.message.includes('personnel_id') || primaryErr.message.includes('tenant_id'))) {
          return await directusFetch('/items/advance_requests', {
            method: 'POST',
            body: JSON.stringify({
              ...directusAdvancePayload,
              personnel_id: null,
              tenant_id: 1
            })
          });
        }
        throw primaryErr;
      });

      if (created?.data) {
        const savedItem: SalaryAdvanceRequest = {
          ...created.data,
          id: String(created.data.id),
          personnel_id: targetPersonnelId || (created.data.personnel_id ? String(created.data.personnel_id) : 'p-1'),
          personnel_name: created.data.personnel_name || targetPersonnelName,
          tenant_id: targetTenantId
        };
        advanceRequestsData.unshift(savedItem);
        return res.status(201).json(savedItem);
      }
    } catch (err: any) {
      console.error('[Directus advance_requests POST ERROR]:', err.message);
      return res.status(500).json({
        error: 'ADVANCE_REQUEST_SAVE_FAILED',
        message: `خطا در ذخیره درخواست مساعده در پایگاه داده: ${err.message}`
      });
    }
  }

  advanceRequestsData.unshift(newRequest);
  res.status(201).json(newRequest);
});

// PATCH /api/advance-requests/:id
router.patch('/api/advance-requests/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, approved_amount, manager_note } = req.body;
  const { userName, isAdmin, userRole, personnelId } = getRequestUser(req);

  const currentP = personnelData.find(p => p.id === personnelId);
  const canApprove = isAdmin || userRole === 'admin' || userRole === 'sales_manager' || currentP?.permissions?.can_approve_advances;
  if (!canApprove) {
    return res.status(403).json({ error: 'شما دسترسی لازم برای تایید یا رد درخواست‌های مساعده را ندارید.' });
  }

  const nowIso = new Date().toISOString();
  const updatePayload = {
    status: status || 'pending',
    approved_amount: approved_amount !== undefined ? Number(approved_amount) : null,
    manager_note: manager_note || null,
    reviewed_by: userName || 'مدیر سیستم',
    reviewed_at: nowIso
  };

  let targetReq = advanceRequestsData.find(r => String(r.id) === String(id));
  if (!targetReq && directusUrl && directusAdminToken) {
    try {
      const dReq = await directusFetch(`/items/advance_requests/${id}`).catch(() => null);
      if (dReq?.data) {
        targetReq = {
          ...dReq.data,
          id: String(dReq.data.id),
          personnel_id: typeof dReq.data.personnel_id === 'object' && dReq.data.personnel_id !== null ? dReq.data.personnel_id.id : String(dReq.data.personnel_id || ''),
          personnel_name: dReq.data.personnel_name || 'کارشناس شرکت'
        };
      }
    } catch {}
  }

  if (targetReq) {
    const applicantP = personnelData.find(p => p.id === targetReq!.personnel_id || p.user_id === targetReq!.personnel_id || p.name === targetReq!.personnel_name);
    const applicantPhone = applicantP?.phone;

    let patternToUse = '';
    if (status === 'approved') {
      patternToUse = projectSettingsData.addvance_accept_pattern || '';
    } else if (status === 'rejected') {
      patternToUse = projectSettingsData.addvance_reject_pattern || '';
    }

    if (patternToUse) {
      const nameParts = (targetReq.personnel_name || '').trim().split(' ');
      const fName = nameParts[0] || 'همکار';
      const lName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'گرامی';
      const now = new Date();
      const jalaliDate = now.toLocaleDateString('fa-IR');

      const statusVars = {
        name: fName,
        family: lName,
        fullName: targetReq.personnel_name,
        mobile: applicantPhone || 'نامشخص',
        phone: applicantPhone || 'نامشخص',
        requested_amount: String(targetReq.amount || 0),
        approved_amount: String(approved_amount ?? targetReq.amount ?? 0),
        amount: String(approved_amount ?? targetReq.amount ?? 0),
        target_month: targetReq.target_month || '-',
        needed_date: targetReq.needed_date || jalaliDate,
        manager_note: manager_note || (status === 'approved' ? 'تایید شد' : 'رد شد'),
        reviewed_by: userName || 'مدیریت'
      };

      if (applicantPhone) {
        sendIppanelSmsPattern(applicantPhone, patternToUse, statusVars)
          .catch(e => console.warn('Advance request status SMS error:', e.message));
      }
      sendTenantAdminsSmsPattern(targetReq.tenant_id || 'default', patternToUse, statusVars)
        .catch(e => console.warn('Advance status SMS to admin warning:', e.message));
    }
  }

  if (directusUrl && directusAdminToken) {
    try {
      const updated = await directusFetch(`/items/advance_requests/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updatePayload)
      });
      if (updated?.data) {
        const itemWithStrId = {
          ...updated.data,
          id: String(updated.data.id),
          personnel_name: updated.data.personnel_name || targetReq?.personnel_name,
          personnel_id: targetReq?.personnel_id || (updated.data.personnel_id ? String(updated.data.personnel_id) : 'p-1'),
          tenant_id: targetReq?.tenant_id || 'default'
        };
        const idx = advanceRequestsData.findIndex(r => String(r.id) === String(id));
        if (idx >= 0) advanceRequestsData[idx] = { ...advanceRequestsData[idx], ...itemWithStrId };
        else advanceRequestsData.unshift(itemWithStrId);
        return res.json(itemWithStrId);
      }
    } catch (err: any) {
      console.warn('Directus advance_requests PATCH error:', err.message);
    }
  }

  const idx = advanceRequestsData.findIndex(r => String(r.id) === String(id));
  if (idx >= 0) {
    advanceRequestsData[idx] = { ...advanceRequestsData[idx], ...updatePayload };
    return res.json(advanceRequestsData[idx]);
  }

  res.status(404).json({ error: 'درخواست مساعده یافت نشد' });
});

// DELETE /api/advance-requests/:id
router.delete('/api/advance-requests/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { userId, personnelId, isAdmin } = getRequestUser(req);

  if (directusUrl && directusAdminToken) {
    try {
      await directusFetch(`/items/advance_requests/${id}`, { method: 'DELETE' });
    } catch {}
  }

  const idx = advanceRequestsData.findIndex(r => r.id === id);
  if (idx >= 0) {
    const item = advanceRequestsData[idx];
    if (!isAdmin && item.personnel_id !== personnelId && item.personnel_id !== userId) {
      return res.status(403).json({ error: 'شما اجازه حذف این درخواست را ندارید.' });
    }
    advanceRequestsData.splice(idx, 1);
    return res.json({ success: true });
  }

  res.json({ success: true });
});

export default router;
