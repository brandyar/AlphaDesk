import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import {
  directusUrl,
  directusAdminToken,
  coldLeadsData,
  setColdLeadsData,
} from '../config';
import { directusFetch, directusFetchAllPages } from '../directus/client';
import { getRequestUser, matchesTenant } from '../middlewares/auth.middleware';
import { resolvePersonnelId, resolveDirectusTenantId } from '../directus/sync';
import {
  cleanCustomerPayloadForDirectus,
  normalizeContactValue,
} from '../services/phoneNormalizer';
import { CustomerContact } from '../types';

const router = Router();

// GET /api/cold-leads
router.get('/api/cold-leads', async (req: Request, res: Response) => {
  const { userId, personnelId, isAdmin, userName, tenantId } = getRequestUser(req);

  if (directusUrl && directusAdminToken) {
    try {
      const result = await directusFetchAllPages('/items/cold_leads?sort=-date_created');
      if (result && Array.isArray(result.data)) {
        let leads = result.data.map((l: any) => ({
          ...l,
          assigned_to_id: typeof l.assigned_to === 'object' && l.assigned_to !== null ? l.assigned_to.id : String(l.assigned_to || ''),
          assigned_to_name: l.assigned_to_name || (typeof l.assigned_to === 'object' && l.assigned_to !== null ? (l.assigned_to.name || l.assigned_to.first_name) : 'تخصیص نیافته')
        }));

        if (tenantId && tenantId !== 'all') {
          leads = leads.filter((l: any) => matchesTenant(l.tenant_id, tenantId));
        }

        if (!isAdmin && (userName || userId || personnelId)) {
          leads = leads.filter((l: any) =>
            (personnelId && (l.assigned_to_id === personnelId || l.assigned_to === personnelId)) ||
            (userId && (l.assigned_to_id === userId || l.assigned_to === userId)) ||
            (userName && (l.assigned_to_name === userName || l.assigned_to === userName))
          );
        }
        return res.json(leads);
      }
    } catch (e: any) {
      return res.status(502).json({ error: `خطا در دریافت شماره‌های اولیه از پایگاه داده مرکزی: ${e.message}` });
    }
  }

  let leads = coldLeadsData;
  if (tenantId && tenantId !== 'all') {
    leads = leads.filter((l: any) => matchesTenant(l.tenant_id, tenantId));
  }
  if (!isAdmin && (userName || userId || personnelId)) {
    leads = leads.filter((l) =>
      (personnelId && l.assigned_to === personnelId) ||
      (userName && l.assigned_to === userName)
    );
  }
  res.json(leads);
});

// POST /api/cold-leads
router.post('/api/cold-leads', async (req: Request, res: Response) => {
  const payload = req.body;
  const { userId, personnelId, userName, isAdmin, tenantId } = getRequestUser(req);
  const newLeadId = crypto.randomUUID();
  const nowIso = new Date().toISOString();

  let convertedCustId: string | null = payload.converted_customer_id || null;
  if (!convertedCustId || String(convertedCustId).trim() === '') {
    convertedCustId = null;
  }

  const rawAssigned = isAdmin ? (payload.assigned_to || personnelId || userId || userName) : (personnelId || userId || userName);
  const resolved = await resolvePersonnelId(rawAssigned, userName);
  const finalAssignedId = resolved.personnelId || null;
  const finalAssignedName = resolved.personnelName || userName || 'تخصیص نیافته';

  const targetTenantId = payload.tenant_id || tenantId || 'default';

  const newLead: any = {
    id: newLeadId,
    tenant_id: targetTenantId,
    phone_number: (payload.phone_number || '').trim(),
    contact_name: (payload.contact_name || '').trim(),
    source: payload.source || 'ورود دستی',
    status: payload.status || 'تماس نگرفته',
    notes: (payload.notes || '').trim(),
    assigned_to: finalAssignedId,
    converted_customer_id: convertedCustId,
    date_created: nowIso
  };

  if (directusUrl && directusAdminToken) {
    try {
      const directusLeadPayload = {
        ...newLead,
        tenant_id: resolveDirectusTenantId(targetTenantId),
      };
      const created = await directusFetch('/items/cold_leads', {
        method: 'POST',
        body: JSON.stringify(directusLeadPayload)
      });
      const returned = created?.data || newLead;
      return res.status(201).json({
        ...returned,
        assigned_to_id: finalAssignedId,
        assigned_to_name: finalAssignedName
      });
    } catch (err: any) {
      console.error('Cold lead error:', err.message);
      return res.status(500).json({
        error: 'LEAD_SAVE_FAILED',
        message: `خطا در ثبت شماره در پایگاه داده مرکزی: ${err.message}`
      });
    }
  }

  coldLeadsData.unshift({
    ...newLead,
    assigned_to: finalAssignedName,
    assigned_to_id: finalAssignedId,
    assigned_to_name: finalAssignedName
  });
  res.status(201).json(newLead);
});

// PATCH /api/cold-leads/:id
router.patch('/api/cold-leads/:id', async (req: Request, res: Response) => {
  const payload = req.body;
  const cleanPatch: Record<string, any> = { ...payload };

  if (cleanPatch.converted_customer_id === '') {
    cleanPatch.converted_customer_id = null;
  }

  if (cleanPatch.assigned_to !== undefined) {
    if (!cleanPatch.assigned_to || cleanPatch.assigned_to === 'none' || cleanPatch.assigned_to === 'تخصیص نیافته') {
      cleanPatch.assigned_to = null;
    } else {
      const resolved = await resolvePersonnelId(cleanPatch.assigned_to);
      cleanPatch.assigned_to = resolved.personnelId || null;
    }
  }

  if (directusUrl && directusAdminToken) {
    try {
      const patched = await directusFetch(`/items/cold_leads/${req.params.id}`, {
        method: 'PATCH',
        body: JSON.stringify(cleanPatch)
      });
      return res.json(patched.data);
    } catch (err: any) {
      return res.status(500).json({
        error: 'LEAD_UPDATE_FAILED',
        message: `خطا در بروزرسانی لید در پایگاه داده مرکزی: ${err.message}`
      });
    }
  }

  const idx = coldLeadsData.findIndex(l => l.id === req.params.id);
  if (idx >= 0) {
    coldLeadsData[idx] = { ...coldLeadsData[idx], ...cleanPatch };
    return res.json(coldLeadsData[idx]);
  }

  res.status(404).json({ error: 'Lead not found' });
});

// POST /api/cold-leads/bulk-assign
router.post('/api/cold-leads/bulk-assign', async (req: Request, res: Response) => {
  const { lead_ids, target_marketer_id } = req.body;
  const { isAdmin } = getRequestUser(req);

  if (!isAdmin) {
    return res.status(403).json({ error: 'فقط مدیر سیستم اجازه انتقال و تخصیص گروهی شماره‌ها را دارد.' });
  }

  if (!Array.isArray(lead_ids) || lead_ids.length === 0) {
    return res.status(400).json({ error: 'حداقل یک شماره را برای تخصیص انتخاب کنید.' });
  }

  const resolved = await resolvePersonnelId(target_marketer_id);
  const finalAssignedId = resolved.personnelId || null;
  const targetMarketerName = resolved.personnelName || 'تخصیص نیافته';

  let updatedCount = 0;

  for (const lId of lead_ids) {
    if (directusUrl && directusAdminToken) {
      try {
        await directusFetch(`/items/cold_leads/${lId}`, {
          method: 'PATCH',
          body: JSON.stringify({ assigned_to: finalAssignedId })
        });
        updatedCount++;
      } catch {}
    } else {
      const idx = coldLeadsData.findIndex(l => l.id === lId);
      if (idx >= 0) {
        coldLeadsData[idx].assigned_to = targetMarketerName;
        updatedCount++;
      }
    }
  }

  res.json({
    success: true,
    updatedCount,
    message: `${updatedCount} شماره با موفقیت به «${targetMarketerName}» تخصیص داده شد.`
  });
});

// DELETE /api/cold-leads/:id
router.delete('/api/cold-leads/:id', async (req: Request, res: Response) => {
  if (directusUrl && directusAdminToken) {
    try {
      await directusFetch(`/items/cold_leads/${req.params.id}`, { method: 'DELETE' });
    } catch {}
  }

  setColdLeadsData(coldLeadsData.filter(l => l.id !== req.params.id));
  res.json({ success: true, message: 'شماره با موفقیت حذف شد.' });
});

// POST /api/cold-leads/:id/convert
router.post('/api/cold-leads/:id/convert', async (req: Request, res: Response) => {
  const newCustId = crypto.randomUUID();
  const nowIso = new Date().toISOString();

  let lead: any = null;
  if (directusUrl && directusAdminToken) {
    try {
      const leadRes = await directusFetch(`/items/cold_leads/${req.params.id}`);
      lead = leadRes.data;
    } catch {}
  }
  if (!lead) {
    return res.status(404).json({ error: 'لید یافت نشد.' });
  }

  const phone = (lead.phone_number || '').trim();
  const contactName = (lead.contact_name || '').trim();

  const customerPayload = cleanCustomerPayloadForDirectus({
    ...req.body,
    company_name: req.body.company_name || contactName || `مشتری با شماره ${phone}`,
    mobile_numbers: phone ? [phone] : [],
    interview_status: 'مصاحبه اولیه انجام شده',
    interview_report: `تبدیل شده از بانک شماره‌های اولیه (${lead.source || 'منبع نامشخص'}). یادداشت: ${lead.notes || 'ندارد'}`,
    interview_score: 6,
    status: 'تماس برقرار نشده'
  }, newCustId);

  const contactItem: CustomerContact = {
    id: crypto.randomUUID(),
    customer_id: newCustId,
    channel_type: 'mobile',
    value: phone,
    normalized_value: normalizeContactValue(phone, 'mobile'),
    contact_name: contactName || customerPayload.company_name,
    contact_role: 'مخاطب لید تبدیل‌شده',
    is_primary: true,
    notes: `تبدیل شده از بانک شماره‌های اولیه (منبع: ${lead.source || 'نامشخص'})`,
    date_created: nowIso,
    date_updated: nowIso
  };

  if (directusUrl && directusAdminToken) {
    try {
      const createdCustRes = await directusFetch('/items/customers', {
        method: 'POST',
        body: JSON.stringify(customerPayload)
      });
      const finalCust = createdCustRes.data;

      await directusFetch('/items/customer_contacts', {
        method: 'POST',
        body: JSON.stringify(contactItem)
      });

      await directusFetch(`/items/cold_leads/${req.params.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'تبدیل شده به مشتری',
          converted_customer_id: newCustId
        })
      });

      const fullCustomer = { ...finalCust, contacts: [contactItem] };
      return res.json({ success: true, customer: fullCustomer });
    } catch (err: any) {
      console.error('Convert lead error:', err.message);
      return res.status(500).json({
        error: 'CONVERT_FAILED',
        message: `خطا در تبدیل لید به مشتری در پایگاه داده مرکزی: ${err.message}`
      });
    }
  }

  res.status(500).json({ error: 'پایگاه داده در دسترس نیست.' });
});

export default router;
