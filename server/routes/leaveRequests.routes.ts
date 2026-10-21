import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import {
  directusUrl,
  directusAdminToken,
  leaveRequestsData,
  personnelData,
  projectSettingsData,
} from '../config.ts';
import { directusFetch, directusFetchAllPages } from '../directus/client.ts';
import { getRequestUser, matchesTenant } from '../middlewares/auth.middleware.ts';
import { sendIppanelSmsPattern, sendTenantAdminsSmsPattern } from '../services/sms.service.ts';
import { resolvePersonnelId, getSafeDirectusPersonnelForeignKey, resolveDirectusTenantId } from '../directus/sync.ts';
import { cleanCustomerPayloadForDirectus, normalizePersianString } from '../services/phoneNormalizer.ts';
import { LeaveRequest } from '../types.ts';

const router = Router();

// GET /api/leave-requests & /leave-requests
const getLeaveRequestsHandler = async (req: Request, res: Response) => {
  const { userId, personnelId, isAdmin, userRole, userName, tenantId } = getRequestUser(req);
  let list: LeaveRequest[] = [];

  if (directusUrl && directusAdminToken) {
    try {
      const resp = await directusFetchAllPages('/items/leave_requests?sort=-date_created');
      if (resp && Array.isArray(resp.data)) {
        list = resp.data.map((r: any) => ({
          ...r,
          id: String(r.id),
          personnel_id: typeof r.personnel_id === 'object' && r.personnel_id !== null ? String(r.personnel_id.id) : String(r.personnel_id || ''),
          personnel_name: r.personnel_name || (typeof r.personnel_id === 'object' && r.personnel_id !== null ? (r.personnel_id.name || r.personnel_id.first_name) : 'کارشناس شرکت')
        }));
      }
    } catch (err: any) {
      console.warn('Directus leave_requests fetch warning:', err.message);
    }
  } else {
    // In offline mode without Directus connection, use in-memory store
    list = [...leaveRequestsData];
  }

  // Check if current user has permission to view/approve all leaves
  const pMatch = personnelData.find(
    (p) =>
      (personnelId && (p.id?.toLowerCase() === String(personnelId).toLowerCase() || p.id?.toLowerCase() === `p-${String(personnelId).replace(/^p-/, '').toLowerCase()}`)) ||
      (userId && (p.user_id?.toLowerCase() === String(userId).toLowerCase() || p.id?.toLowerCase() === String(userId).toLowerCase()))
  );

  const canViewAllLeaves =
    isAdmin ||
    userRole === 'admin' ||
    userRole === 'sales_manager' ||
    pMatch?.role === 'admin' ||
    pMatch?.role === 'sales_manager' ||
    Boolean(pMatch?.permissions?.can_approve_leaves);

  if (tenantId && tenantId !== 'all') {
    list = list.filter((r: any) => {
      if (!r.tenant_id) return true;
      return matchesTenant(r.tenant_id, tenantId) || matchesTenant(r.tenant_id, '1') || matchesTenant(r.tenant_id, 'default');
    });
  }

  if (!canViewAllLeaves) {
    const normUser = normalizePersianString(userName);
    const cleanPId = personnelId ? String(personnelId).trim().toLowerCase() : '';
    const rawUid = cleanPId.replace(/^p-/, '');
    const cleanUId = userId ? String(userId).trim().toLowerCase() : '';

    list = list.filter((r) => {
      const rPId = String(r.personnel_id || '').trim().toLowerCase();
      const rawRPId = rPId.replace(/^p-/, '');
      const normPName = normalizePersianString(r.personnel_name);
      const matchName = normUser && normPName && (normPName === normUser || normPName.includes(normUser) || normUser.includes(normPName));

      return (
        (cleanPId && (rPId === cleanPId || rawRPId === rawUid)) ||
        (cleanUId && (rPId === cleanUId || rawRPId === rawUid)) ||
        (pMatch?.id && String(pMatch.id).toLowerCase() === rPId) ||
        Boolean(matchName)
      );
    });
  }

  res.json(list);
};

router.get('/api/leave-requests', getLeaveRequestsHandler);
router.get('/leave-requests', getLeaveRequestsHandler);

// POST /api/leave-requests
router.post('/api/leave-requests', async (req: Request, res: Response) => {
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

  let isoStartDate = nowIso;
  if (payload.start_date) {
    isoStartDate = payload.start_date.includes('T') ? payload.start_date : `${payload.start_date}T00:00:00.000Z`;
  }
  let isoEndDate: string | null = null;
  if (payload.leave_type === 'daily' && payload.end_date) {
    isoEndDate = payload.end_date.includes('T') ? payload.end_date : `${payload.end_date}T00:00:00.000Z`;
  }

  let calculatedDays = payload.leave_type === 'daily' ? Number(payload.days_count) : null;
  if (payload.leave_type === 'daily' && (!calculatedDays || calculatedDays <= 0)) {
    if (payload.start_date && payload.end_date) {
      try {
        const s = new Date(payload.start_date.split('T')[0]).getTime();
        const e = new Date(payload.end_date.split('T')[0]).getTime();
        const diffDays = Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
        calculatedDays = Math.max(1, diffDays);
      } catch {
        calculatedDays = 1;
      }
    } else {
      calculatedDays = 1;
    }
  }

  const newRequest: LeaveRequest = {
    id: newId,
    tenant_id: targetTenantId,
    personnel_id: targetPersonnelId || 'p-1',
    personnel_name: targetPersonnelName,
    leave_type: payload.leave_type === 'hourly' ? 'hourly' : 'daily',
    start_date: isoStartDate,
    end_date: isoEndDate,
    start_time: payload.leave_type === 'hourly' ? payload.start_time || null : null,
    end_time: payload.leave_type === 'hourly' ? payload.end_time || null : null,
    hours_count: payload.leave_type === 'hourly' ? Number(payload.hours_count) || null : null,
    days_count: calculatedDays,
    reason: payload.reason || '',
    status: 'pending',
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

  const nameParts = (targetPersonnelName || '').trim().split(' ');
  const fName = nameParts[0] || 'همکار';
  const lName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'گرامی';
  const now = new Date();
  const jalaliDate = now.toLocaleDateString('fa-IR');

  const leaveVars: Record<string, string> = {
    name: fName,
    family: lName,
    fullName: targetPersonnelName,
    mobile: applicantPhone || 'نامشخص',
    phone: applicantPhone || 'نامشخص',
    request_date: jalaliDate,
    leave_type: newRequest.leave_type === 'daily' ? 'مرخصی روزانه' : 'مرخصی ساعتی',
    days: String(newRequest.days_count || 1),
    hours: String(newRequest.hours_count || 1),
    start_date: payload.start_date || jalaliDate,
    end_date: payload.end_date || payload.start_date || jalaliDate,
    leave_date: payload.start_date || jalaliDate,
    start_time: newRequest.start_time || '',
    end_time: newRequest.end_time || '',
    from_time: newRequest.start_time || '',
    to_time: newRequest.end_time || '',
    reason: newRequest.reason || '-'
  };

  const patternToUse = newRequest.leave_type === 'daily'
    ? projectSettingsData.dayli_leave_request_pattern
    : projectSettingsData.hourly_leave_request_pattern;

  if (patternToUse) {
    if (applicantPhone) {
      sendIppanelSmsPattern(applicantPhone, patternToUse, leaveVars)
        .catch(e => console.warn('Leave request SMS to applicant error:', e.message));
    }
    sendTenantAdminsSmsPattern(targetTenantId, patternToUse, leaveVars)
      .catch(e => console.warn('Leave request SMS to admin error:', e.message));
  }

  if (directusUrl && directusAdminToken) {
    try {
      const safeDirectusPersonnelId = await getSafeDirectusPersonnelForeignKey(targetPersonnelId, targetPersonnelName);

      const directusLeavePayload: any = {
        personnel_id: safeDirectusPersonnelId,
        personnel_name: targetPersonnelName,
        leave_type: payload.leave_type === 'hourly' ? 'hourly' : 'daily',
        start_date: isoStartDate,
        end_date: isoEndDate,
        start_time: payload.leave_type === 'hourly' ? payload.start_time || null : null,
        end_time: payload.leave_type === 'hourly' ? payload.end_time || null : null,
        hours_count: payload.leave_type === 'hourly' ? Number(payload.hours_count) || null : null,
        days_count: calculatedDays,
        reason: payload.reason || '',
        status: 'pending',
        manager_note: null,
        reviewed_by: null,
        reviewed_at: null,
        date_created: nowIso,
        tenant_id: resolvedTenantNum
      };

      let created = await directusFetch('/items/leave_requests', {
        method: 'POST',
        body: JSON.stringify(directusLeavePayload)
      }).catch(async (primaryErr: any) => {
        if (primaryErr.message && (primaryErr.message.includes('foreign key') || primaryErr.message.includes('FOREIGN_KEY') || primaryErr.message.includes('personnel_id') || primaryErr.message.includes('tenant_id'))) {
          return await directusFetch('/items/leave_requests', {
            method: 'POST',
            body: JSON.stringify({
              ...directusLeavePayload,
              personnel_id: null,
              tenant_id: 1
            })
          });
        }
        throw primaryErr;
      });

      if (created?.data) {
        const savedItem: LeaveRequest = {
          ...created.data,
          id: String(created.data.id),
          personnel_id: targetPersonnelId || (created.data.personnel_id ? String(created.data.personnel_id) : 'p-1'),
          personnel_name: created.data.personnel_name || targetPersonnelName,
          tenant_id: targetTenantId
        };
        leaveRequestsData.unshift(savedItem);
        return res.status(201).json(savedItem);
      }
    } catch (err: any) {
      console.error('[Directus leave_requests POST ERROR]:', err.message);
      return res.status(500).json({
        error: 'LEAVE_REQUEST_SAVE_FAILED',
        message: `خطا در ذخیره درخواست مرخصی در پایگاه داده: ${err.message}`
      });
    }
  }

  leaveRequestsData.unshift(newRequest);
  res.status(201).json(newRequest);
});

// PATCH /api/leave-requests/:id
router.patch('/api/leave-requests/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, manager_note } = req.body;
  const { userName, isAdmin, userRole, personnelId } = getRequestUser(req);

  const currentP = personnelData.find(p => p.id === personnelId);
  const canApprove = isAdmin || userRole === 'admin' || userRole === 'sales_manager' || currentP?.permissions?.can_approve_leaves;
  if (!canApprove) {
    return res.status(403).json({ error: 'شما دسترسی لازم برای تایید یا رد درخواست‌های مرخصی را ندارید.' });
  }

  const nowIso = new Date().toISOString();
  const updatePayload = {
    status: status || 'pending',
    manager_note: manager_note || null,
    reviewed_by: userName || 'مدیر سیستم',
    reviewed_at: nowIso
  };

  let targetReq = leaveRequestsData.find(r => String(r.id) === String(id));
  if (!targetReq && directusUrl && directusAdminToken) {
    try {
      const dReq = await directusFetch(`/items/leave_requests/${id}`).catch(() => null);
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
      patternToUse = targetReq.leave_type === 'daily'
        ? (projectSettingsData.dayli_leave_accept_pattern || '')
        : (projectSettingsData.hourly_leave_accept_pattern || '');
    } else if (status === 'rejected') {
      patternToUse = targetReq.leave_type === 'daily'
        ? (projectSettingsData.dayli_leave_reject_pattern || '')
        : (projectSettingsData.hourly_leave_reject_pattern || '');
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
        request_date: targetReq.date_created ? new Date(targetReq.date_created).toLocaleDateString('fa-IR') : jalaliDate,
        leave_type: targetReq.leave_type === 'daily' ? 'مرخصی روزانه' : 'مرخصی ساعتی',
        leave_date: targetReq.start_date || jalaliDate,
        start_date: targetReq.start_date || jalaliDate,
        end_date: targetReq.end_date || targetReq.start_date || jalaliDate,
        start_time: targetReq.start_time || '',
        end_time: targetReq.end_time || '',
        from_time: targetReq.start_time || '',
        to_time: targetReq.end_time || '',
        days: String(targetReq.days_count || 1),
        hours: String(targetReq.hours_count || 1),
        manager_note: manager_note || (status === 'approved' ? 'تایید شد' : 'رد شد'),
        reviewed_by: userName || 'مدیریت'
      };

      if (applicantPhone) {
        sendIppanelSmsPattern(applicantPhone, patternToUse, statusVars)
          .catch(e => console.warn('Leave request status SMS error:', e.message));
      }
      sendTenantAdminsSmsPattern(targetReq.tenant_id || 'default', patternToUse, statusVars)
        .catch(e => console.warn('Leave status SMS to admin warning:', e.message));
    }
  }

  if (directusUrl && directusAdminToken) {
    try {
      const updated = await directusFetch(`/items/leave_requests/${id}`, {
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
        const idx = leaveRequestsData.findIndex(r => String(r.id) === String(id));
        if (idx >= 0) leaveRequestsData[idx] = { ...leaveRequestsData[idx], ...itemWithStrId };
        else leaveRequestsData.unshift(itemWithStrId);
        return res.json(itemWithStrId);
      }
    } catch (err: any) {
      console.warn('Directus leave_requests PATCH error:', err.message);
    }
  }

  const idx = leaveRequestsData.findIndex(r => String(r.id) === String(id));
  if (idx >= 0) {
    leaveRequestsData[idx] = { ...leaveRequestsData[idx], ...updatePayload };
    return res.json(leaveRequestsData[idx]);
  }

  res.status(404).json({ error: 'درخواست مرخصی یافت نشد' });
});

// DELETE /api/leave-requests/:id
router.delete('/api/leave-requests/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { userId, personnelId, isAdmin } = getRequestUser(req);

  if (directusUrl && directusAdminToken) {
    try {
      await directusFetch(`/items/leave_requests/${id}`, { method: 'DELETE' });
    } catch {}
  }

  const idx = leaveRequestsData.findIndex(r => r.id === id);
  if (idx >= 0) {
    const item = leaveRequestsData[idx];
    if (!isAdmin && item.personnel_id !== personnelId && item.personnel_id !== userId) {
      return res.status(403).json({ error: 'شما اجازه حذف این درخواست را ندارید.' });
    }
    leaveRequestsData.splice(idx, 1);
    return res.json({ success: true });
  }

  res.json({ success: true });
});

export default router;
