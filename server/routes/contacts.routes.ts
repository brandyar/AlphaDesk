import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import {
  directusUrl,
  directusAdminToken,
  contactsData,
  customersData,
} from '../config.ts';
import { directusFetch } from '../directus/client.ts';
import { invalidateCustomersCache } from '../directus/cache.ts';
import {
  normalizeContactValue,
  asyncCheckContactDuplicate,
} from '../services/phoneNormalizer.ts';
import { CustomerContact } from '../types.ts';

const router = Router();

// GET /api/contacts/check-duplicate - Check if phone/contact already exists in CRM
router.get('/check-duplicate', async (req: Request, res: Response) => {
  try {
    const value = String(req.query.value || '').trim();
    const channelType = String(req.query.channel_type || 'mobile').trim();
    const excludeCustomerId = req.query.exclude_customer_id
      ? String(req.query.exclude_customer_id).trim()
      : undefined;

    if (!value || value.length < 3) {
      return res.json({ isDuplicate: false });
    }

    const dup = await asyncCheckContactDuplicate(value, channelType, excludeCustomerId);
    if (dup && dup.isDuplicate) {
      return res.json(dup);
    }

    return res.json({ isDuplicate: false });
  } catch (err: any) {
    console.warn('Check duplicate contact error:', err.message);
    return res.json({ isDuplicate: false });
  }
});

// GET /api/contacts - List contacts (optionally filtered by customer_id)
router.get('/', async (req: Request, res: Response) => {
  const { customer_id } = req.query;

  if (directusUrl && directusAdminToken) {
    try {
      let q = '/items/customer_contacts?sort=-date_created';
      if (customer_id) {
        q += `&filter[customer_id][_eq]=${encodeURIComponent(String(customer_id))}`;
      } else {
        q += '&limit=100';
      }

      const directusRes = await directusFetch(q);
      if (directusRes?.data && Array.isArray(directusRes.data)) {
        return res.json(directusRes.data);
      }
    } catch (err: any) {
      console.warn('Error fetching contacts from Directus:', err.message);
    }
  }

  // Fallback to in-memory store
  let filtered = [...contactsData];
  if (customer_id) {
    filtered = filtered.filter((c) => String(c.customer_id) === String(customer_id));
  }
  return res.json(filtered);
});

// GET /api/contacts/:id - Get a single contact
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  if (directusUrl && directusAdminToken) {
    try {
      const directusRes = await directusFetch(`/items/customer_contacts/${encodeURIComponent(id)}`);
      if (directusRes?.data) {
        return res.json(directusRes.data);
      }
    } catch (err: any) {
      console.warn(`Error fetching contact ${id} from Directus:`, err.message);
    }
  }

  const found = contactsData.find((c) => c.id === id);
  if (found) {
    return res.json(found);
  }
  return res.status(404).json({ error: 'CONTACT_NOT_FOUND', message: 'شماره تماس یافت نشد.' });
});

// Helper: sync phone/contact into parent customer arrays
async function syncContactToParentCustomer(
  customerId: string,
  channelType: string,
  value: string,
  contactRole?: string
) {
  try {
    let existingCust: any = null;

    if (directusUrl && directusAdminToken) {
      const custRes = await directusFetch(`/items/customers/${encodeURIComponent(customerId)}`).catch(() => null);
      if (custRes?.data) {
        existingCust = custRes.data;
      }
    }

    if (!existingCust) {
      existingCust = customersData.find((c) => c.id === customerId);
    }

    if (!existingCust) return;

    const patchPayload: Record<string, any> = {};
    const cleanVal = String(value).trim();

    // 1. Mobile numbers
    if (channelType === 'mobile') {
      const mobiles = Array.isArray(existingCust.mobile_numbers)
        ? [...existingCust.mobile_numbers]
        : [];
      if (!mobiles.includes(cleanVal)) {
        mobiles.push(cleanVal);
        patchPayload.mobile_numbers = mobiles;
      }
    }

    // 2. Landline numbers
    if (channelType === 'landline') {
      const landlines = Array.isArray(existingCust.landline_numbers)
        ? [...existingCust.landline_numbers]
        : [];
      if (!landlines.includes(cleanVal)) {
        landlines.push(cleanVal);
        patchPayload.landline_numbers = landlines;
      }
    }

    // 3. Telegram
    if (channelType === 'telegram') {
      const tIds = Array.isArray(existingCust.telegram_ids)
        ? [...existingCust.telegram_ids]
        : [];
      if (!tIds.includes(cleanVal)) {
        tIds.push(cleanVal);
        patchPayload.telegram_ids = tIds;
      }
      if (!existingCust.telegram_phone && /^09\d{9}$/.test(cleanVal)) {
        patchPayload.telegram_phone = cleanVal;
      }
    }

    // 4. Instagram
    if (channelType === 'instagram') {
      const iIds = Array.isArray(existingCust.instagram_ids)
        ? [...existingCust.instagram_ids]
        : [];
      if (!iIds.includes(cleanVal)) {
        iIds.push(cleanVal);
        patchPayload.instagram_ids = iIds;
      }
    }

    // 5. Emails
    if (channelType === 'email') {
      const emails = Array.isArray(existingCust.emails)
        ? [...existingCust.emails]
        : [];
      if (!emails.includes(cleanVal)) {
        emails.push(cleanVal);
        patchPayload.emails = emails;
      }
    }

    // 6. Websites
    if (channelType === 'website') {
      const websites = Array.isArray(existingCust.websites)
        ? [...existingCust.websites]
        : [];
      if (!websites.includes(cleanVal)) {
        websites.push(cleanVal);
        patchPayload.websites = websites;
      }
    }

    // 7. Role-based phone assignment
    const roleLower = (contactRole || '').toLowerCase();
    if (roleLower.includes('مدیر') || roleLower.includes('manager')) {
      const managerPhones = Array.isArray(existingCust.manager_phones)
        ? [...existingCust.manager_phones]
        : [];
      if (!managerPhones.includes(cleanVal)) {
        managerPhones.push(cleanVal);
        patchPayload.manager_phones = managerPhones;
      }
    }

    if (roleLower.includes('مذاکره') || roleLower.includes('negotiator')) {
      const negotiatorPhones = Array.isArray(existingCust.negotiator_phones)
        ? [...existingCust.negotiator_phones]
        : [];
      if (!negotiatorPhones.includes(cleanVal)) {
        negotiatorPhones.push(cleanVal);
        patchPayload.negotiator_phones = negotiatorPhones;
      }
    }

    // Apply patch if any field changed
    if (Object.keys(patchPayload).length > 0) {
      if (directusUrl && directusAdminToken) {
        await directusFetch(`/items/customers/${encodeURIComponent(customerId)}`, {
          method: 'PATCH',
          body: JSON.stringify(patchPayload),
        }).catch((err) => console.warn('Sync customer contacts patch warning:', err.message));
      }

      // Sync memory store
      const memCust = customersData.find((c) => c.id === customerId);
      if (memCust) {
        Object.assign(memCust, patchPayload);
      }

      invalidateCustomersCache();
    }
  } catch (err: any) {
    console.warn('Error in syncContactToParentCustomer:', err.message);
  }
}

// POST /api/contacts - Create a new customer contact
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      customer_id,
      channel_type = 'mobile',
      value,
      contact_name = '',
      contact_role = '',
      is_primary = false,
      notes = '',
    } = req.body;

    if (!customer_id || !String(customer_id).trim()) {
      return res.status(400).json({
        error: 'MISSING_CUSTOMER_ID',
        message: 'شناسه مشتری (customer_id) الزامی است.',
      });
    }

    const rawValue = String(value || '').trim();
    if (!rawValue) {
      return res.status(400).json({
        error: 'MISSING_VALUE',
        message: 'مقدار شماره تماس یا اکانت الزامی است.',
      });
    }

    const normVal = normalizeContactValue(rawValue, channel_type);

    // Duplicate check: prevent collision with active marketer of another customer
    if (normVal && normVal.length >= 3) {
      const dup = await asyncCheckContactDuplicate(rawValue, channel_type, customer_id);
      if (dup && dup.isDuplicate && dup.conflictType === 'active_marketer') {
        return res.status(409).json({
          error: 'DUPLICATE_CONTACT',
          message: dup.message || 'این شماره تماس در حال حاضر برای مشتری فعال دیگری ثبت شده است.',
          duplicate: dup,
        });
      }
    }

    const nowIso = new Date().toISOString();
    const newId = crypto.randomUUID();

    const contactRecord: CustomerContact = {
      id: newId,
      customer_id: String(customer_id).trim(),
      channel_type: (channel_type as any) || 'mobile',
      value: rawValue,
      normalized_value: normVal || rawValue,
      contact_name: contact_name ? String(contact_name).trim() : '',
      contact_role: contact_role ? String(contact_role).trim() : '',
      is_primary: Boolean(is_primary),
      notes: notes ? String(notes).trim() : '',
      date_created: nowIso,
      date_updated: nowIso,
    };

    let directusCreated: any = null;

    if (directusUrl && directusAdminToken) {
      try {
        const directusPayload = {
          id: contactRecord.id,
          customer_id: contactRecord.customer_id,
          channel_type: contactRecord.channel_type,
          value: contactRecord.value,
          normalized_value: contactRecord.normalized_value,
          contact_name: contactRecord.contact_name || null,
          contact_role: contactRecord.contact_role || null,
          is_primary: contactRecord.is_primary,
          notes: contactRecord.notes || null,
          date_created: contactRecord.date_created,
          date_updated: contactRecord.date_updated,
        };

        const createRes = await directusFetch('/items/customer_contacts', {
          method: 'POST',
          body: JSON.stringify(directusPayload),
        });

        if (createRes?.data) {
          directusCreated = createRes.data;
        }
      } catch (err: any) {
        console.warn('Directus create customer_contacts error:', err.message);
        // We will continue to memory store and parent customer sync so the user operation succeeds
      }
    }

    // Always update in-memory cache
    contactsData.unshift(contactRecord);

    // Sync to parent customer record's phone/contact arrays
    await syncContactToParentCustomer(
      contactRecord.customer_id,
      contactRecord.channel_type,
      contactRecord.value,
      contactRecord.contact_role
    );

    invalidateCustomersCache();

    const finalResult = directusCreated || contactRecord;
    return res.status(201).json(finalResult);
  } catch (err: any) {
    console.error('Fatal error in POST /api/contacts:', err.message);
    return res.status(500).json({
      error: 'CONTACT_CREATION_FAILED',
      message: `خطا در ثبت شماره تماس: ${err.message}`,
    });
  }
});

// PATCH /api/contacts/:id - Update an existing contact
router.patch('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const payload = req.body;

  try {
    const patchPayload: Record<string, any> = {
      date_updated: new Date().toISOString(),
    };

    if (payload.channel_type !== undefined) patchPayload.channel_type = payload.channel_type;
    if (payload.value !== undefined) {
      patchPayload.value = String(payload.value).trim();
      patchPayload.normalized_value = normalizeContactValue(
        patchPayload.value,
        payload.channel_type || 'mobile'
      );
    }
    if (payload.contact_name !== undefined) patchPayload.contact_name = payload.contact_name;
    if (payload.contact_role !== undefined) patchPayload.contact_role = payload.contact_role;
    if (payload.is_primary !== undefined) patchPayload.is_primary = Boolean(payload.is_primary);
    if (payload.notes !== undefined) patchPayload.notes = payload.notes;

    let updatedContact: any = null;

    if (directusUrl && directusAdminToken) {
      try {
        const directusRes = await directusFetch(`/items/customer_contacts/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          body: JSON.stringify(patchPayload),
        });
        if (directusRes?.data) {
          updatedContact = directusRes.data;
        }
      } catch (err: any) {
        console.warn('Directus patch contact error:', err.message);
      }
    }

    // In-memory update
    const memIndex = contactsData.findIndex((c) => c.id === id);
    if (memIndex !== -1) {
      contactsData[memIndex] = { ...contactsData[memIndex], ...patchPayload };
      if (!updatedContact) updatedContact = contactsData[memIndex];
    }

    if (!updatedContact) {
      return res.status(404).json({ error: 'CONTACT_NOT_FOUND', message: 'شماره تماس یافت نشد.' });
    }

    // Sync to parent if value changed
    if (patchPayload.value && updatedContact.customer_id) {
      await syncContactToParentCustomer(
        updatedContact.customer_id,
        updatedContact.channel_type,
        patchPayload.value,
        updatedContact.contact_role
      );
    }

    invalidateCustomersCache();

    return res.json(updatedContact);
  } catch (err: any) {
    console.error('Error updating contact:', err.message);
    return res.status(500).json({
      error: 'UPDATE_FAILED',
      message: `خطا در بروزرسانی شماره تماس: ${err.message}`,
    });
  }
});

// DELETE /api/contacts/:id - Delete a contact
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    if (directusUrl && directusAdminToken) {
      try {
        await directusFetch(`/items/customer_contacts/${encodeURIComponent(id)}`, {
          method: 'DELETE',
        });
      } catch (err: any) {
        console.warn('Directus delete contact warning:', err.message);
      }
    }

    const memIndex = contactsData.findIndex((c) => c.id === id);
    if (memIndex !== -1) {
      contactsData.splice(memIndex, 1);
    }

    invalidateCustomersCache();

    return res.json({ success: true, id });
  } catch (err: any) {
    console.error('Error deleting contact:', err.message);
    return res.status(500).json({
      error: 'DELETE_FAILED',
      message: `خطا در حذف شماره تماس: ${err.message}`,
    });
  }
});

export default router;
