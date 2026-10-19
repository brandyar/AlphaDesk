import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  directusUrl,
  directusAdminToken,
  projectSettingsData,
  updateProjectSettingsData,
  personnelData,
  setPersonnelData,
  customersData,
  setCustomersData,
  reportsData,
  setReportsData,
  contactsData,
  setContactsData,
  initialPersonnel,
} from '../config';
import { directusFetch, directusSafeBatchInsert, directusSafeBatchPatch } from '../directus/client';
import { getRequestUser, getRequestTenantId } from '../middlewares/auth.middleware';
import { invalidateCustomersCache, invalidateReportsCache } from '../directus/cache';
import { resolveDirectusTenantId } from '../directus/sync';
import { normalizeContactValue } from '../services/phoneNormalizer';
import { Personnel } from '../types';

const router = Router();

// GET /api/project-settings
router.get('/api/project-settings', async (req: Request, res: Response) => {
  if (directusUrl && directusAdminToken) {
    try {
      const resp = await directusFetch('/items/project_settings').catch(() => null);
      if (resp?.data) {
        const item = Array.isArray(resp.data) ? resp.data[0] : resp.data;
        if (item) {
          updateProjectSettingsData(item);
        }
      }
    } catch {}
  }
  res.json(projectSettingsData);
});

// PATCH /api/project-settings
router.patch('/api/project-settings', async (req: Request, res: Response) => {
  const payload = req.body;
  const { isAdmin } = getRequestUser(req);

  if (!isAdmin) {
    return res.status(403).json({ error: 'تنها مدیر کل سیستم دسترسی به ویرایش تنظیمات پروژه‌ها و پترن‌های پیامک را دارد.' });
  }

  updateProjectSettingsData(payload);

  if (directusUrl && directusAdminToken) {
    try {
      const fetchExist = await directusFetch('/items/project_settings').catch(() => null);
      const existingList = fetchExist?.data;
      if (Array.isArray(existingList) && existingList.length > 0) {
        const existingId = existingList[0].id;
        await directusFetch(`/items/project_settings/${existingId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload)
        });
      } else {
        await directusFetch('/items/project_settings', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }
    } catch (err: any) {
      console.warn('Directus project_settings save error:', err.message);
    }
  }

  res.json({ success: true, settings: projectSettingsData });
});

// POST /api/auth/update-profile
router.post('/api/auth/update-profile', async (req: Request, res: Response) => {
  const {
    name,
    username,
    phone,
    avatar,
    bank_card_number,
    iban,
    national_id,
    emergency_contact_name,
    emergency_contact_phone,
    emergency_contact_relation,
    family_contacts,
  } = req.body;
  const { userId, personnelId, userEmail, userName } = getRequestUser(req);

  const personnelPatch: Record<string, any> = {};
  if (name) personnelPatch.name = String(name).trim();
  if (username !== undefined) personnelPatch.username = String(username).trim();
  if (phone !== undefined) personnelPatch.phone = String(phone).trim();
  if (avatar !== undefined) personnelPatch.avatar = avatar;
  if (bank_card_number !== undefined) personnelPatch.bank_card_number = String(bank_card_number).trim();
  if (iban !== undefined) personnelPatch.iban = String(iban).trim();
  if (national_id !== undefined) personnelPatch.national_id = String(national_id).trim();
  if (emergency_contact_name !== undefined) personnelPatch.emergency_contact_name = String(emergency_contact_name).trim();
  if (emergency_contact_phone !== undefined) personnelPatch.emergency_contact_phone = String(emergency_contact_phone).trim();
  if (emergency_contact_relation !== undefined) personnelPatch.emergency_contact_relation = String(emergency_contact_relation).trim();
  if (family_contacts !== undefined) personnelPatch.family_contacts = family_contacts;

  let targetPersonnel: any = null;

  if (directusUrl && directusAdminToken) {
    try {
      let foundPId: string | null = null;
      if (personnelId) {
        const byId = await directusFetch(`/items/personnel/${personnelId}`).catch(() => null);
        if (byId?.data?.id) foundPId = byId.data.id;
      }
      if (!foundPId && userId) {
        const byUser = await directusFetch(`/items/personnel?filter[user_id][_eq]=${userId}`).catch(() => null);
        if (byUser?.data && Array.isArray(byUser.data) && byUser.data.length > 0) {
          foundPId = byUser.data[0].id;
        }
      }
      if (!foundPId && userEmail) {
        const byEmail = await directusFetch(`/items/personnel?filter[email][_eq]=${encodeURIComponent(userEmail)}`).catch(() => null);
        if (byEmail?.data && Array.isArray(byEmail.data) && byEmail.data.length > 0) {
          foundPId = byEmail.data[0].id;
        }
      }

      if (foundPId) {
        const updatedRes = await directusFetch(`/items/personnel/${foundPId}`, {
          method: 'PATCH',
          body: JSON.stringify(personnelPatch)
        });
        targetPersonnel = updatedRes?.data || { id: foundPId, ...personnelPatch };
      } else {
        const newPId = personnelId || crypto.randomUUID();
        const createdRes = await directusFetch('/items/personnel', {
          method: 'POST',
          body: JSON.stringify({
            id: newPId,
            name: name || userName || 'کاربر سیستم',
            email: userEmail || '',
            phone: phone || '',
            role: 'marketer',
            status: 'active',
            user_id: userId || null,
            ...personnelPatch
          })
        });
        targetPersonnel = createdRes?.data || { id: newPId, ...personnelPatch };
      }

      if (userId) {
        await directusFetch(`/users/${userId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            ...(name ? { first_name: name } : {}),
            ...(avatar ? { avatar } : {})
          })
        }).catch(() => {});
      }
    } catch (err: any) {
      console.error('Directus personnel profile update error:', err.message);
    }
  }

  const targetId = personnelId || userId;
  const idx = personnelData.findIndex(
    p =>
      (targetId && p.id === targetId) ||
      (userId && p.user_id === userId) ||
      (userEmail && p.email?.toLowerCase() === userEmail?.toLowerCase())
  );
  if (idx >= 0) {
    personnelData[idx] = { ...personnelData[idx], ...personnelPatch };
    if (!targetPersonnel) targetPersonnel = personnelData[idx];
  } else {
    const newLocal: Personnel = {
      id: targetId || 'p-1',
      name: name || userName || 'کاربر سیستم',
      email: userEmail || '',
      phone: phone || '',
      role: 'marketer',
      status: 'active',
      active: true,
      ...personnelPatch
    };
    personnelData.push(newLocal);
    if (!targetPersonnel) targetPersonnel = newLocal;
  }

  res.json({ success: true, personnel: targetPersonnel, message: 'مشخصات پروفایل با موفقیت در پایگاه داده مرکزی ذخیره شد.' });
});

// POST /api/upload-avatar
router.post('/api/upload-avatar', async (req: Request, res: Response) => {
  const { dataUrl, fileName, mimeType } = req.body;
  const { userId, personnelId } = getRequestUser(req);

  if (!dataUrl) {
    return res.status(400).json({ error: 'فایلی ارسال نشده است.' });
  }

  let finalAvatarUrl = dataUrl;
  let fileId: string | null = null;

  if (directusUrl && directusAdminToken) {
    try {
      const matches = dataUrl.match(/^data:([A-Za-z0-9-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const fileBuffer = Buffer.from(matches[2], 'base64');
        const fileType = matches[1] || mimeType || 'image/jpeg';
        const name = fileName || `avatar-${userId || Date.now()}.jpg`;

        const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
        const header = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${name}"\r\nContent-Type: ${fileType}\r\n\r\n`;
        const footer = `\r\n--${boundary}--\r\n`;
        const bodyBuffer = Buffer.concat([Buffer.from(header, 'utf-8'), fileBuffer, Buffer.from(footer, 'utf-8')]);

        const uploadRes = await fetch(`${directusUrl.replace(/\/$/, '')}/files`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${directusAdminToken}`,
            'Content-Type': `multipart/form-data; boundary=${boundary}`
          },
          body: bodyBuffer
        });

        if (uploadRes.ok) {
          const fileData: any = await uploadRes.json();
          fileId = fileData?.data?.id;
          if (fileId) {
            finalAvatarUrl = `${directusUrl.replace(/\/$/, '')}/assets/${fileId}`;
            if (userId) {
              await directusFetch(`/users/${userId}`, {
                method: 'PATCH',
                body: JSON.stringify({ avatar: fileId })
              }).catch(() => {});
            }
          }
        }
      }
    } catch (e) {
      console.error('Error uploading avatar to Directus:', e);
    }
  }

  const targetId = personnelId || userId;
  const idx = personnelData.findIndex(p => p.id === targetId || p.id === 'p-1');
  if (idx >= 0) {
    personnelData[idx].avatar = finalAvatarUrl;
  }

  res.json({ success: true, avatarUrl: finalAvatarUrl, fileId });
});

// POST /api/auth/change-password
router.post('/api/auth/change-password', async (req: Request, res: Response) => {
  const { current_password, new_password } = req.body;
  const { userId } = getRequestUser(req);

  if (!new_password || new_password.length < 6) {
    return res.status(400).json({ error: 'رمز عبور جدید باید حداقل ۶ کاراکتر باشد.' });
  }

  if (directusUrl && directusAdminToken && userId) {
    try {
      await directusFetch(`/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ password: new_password })
      });
      return res.json({ success: true, message: 'رمز عبور با موفقیت تغییر یافت.' });
    } catch (err: any) {
      return res.status(500).json({ error: `خطا در تغییر رمز عبور: ${err.message}` });
    }
  }

  res.json({ success: true, message: 'رمز عبور با موفقیت تغییر یافت.' });
});

// POST /api/check-expirations
router.post('/api/check-expirations', (req: Request, res: Response) => {
  res.json({ success: true });
});

// POST /api/migration/reset-cache
router.post('/api/migration/reset-cache', (req: Request, res: Response) => {
  setCustomersData([]);
  setReportsData([]);
  setContactsData([]);
  setPersonnelData([...initialPersonnel]);
  invalidateCustomersCache();
  invalidateReportsCache();
  return res.json({ success: true, message: 'حافظه موقت کش درون‌ریزی با موفقیت پاکسازی شد.' });
});

export default router;
