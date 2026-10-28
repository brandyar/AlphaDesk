import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import {
  directusUrl,
  directusAdminToken,
  personnelData,
  setPersonnelData,
  DIRECTUS_STAFF_ROLE_ID,
} from '../config.ts';
import { directusFetch } from '../directus/client.ts';
import { resolveDirectusTenantId } from '../directus/sync.ts';
import {
  getRequestTenantId,
  getRequestUser,
  formatAvatarUrl,
} from '../middlewares/auth.middleware.ts';
import { Personnel } from '../types.ts';

const router = Router();

export function enrichPersonnel(p: any): any {
  if (!p) return p;
  const tid =
    p.tenant_id && typeof p.tenant_id === 'object'
      ? String(p.tenant_id.id || p.tenant_id.name || 'default')
      : String(p.tenant_id || 'default');
  const allowed = Array.isArray(p.allowed_tenant_ids)
    ? p.allowed_tenant_ids.map(String)
    : p.permissions?.allowed_tenant_ids && Array.isArray(p.permissions.allowed_tenant_ids)
    ? p.permissions.allowed_tenant_ids.map(String)
    : [tid];

  return {
    ...p,
    id: String(p.id),
    tenant_id: tid,
    allowed_tenant_ids: allowed,
    permissions: {
      ...(p.permissions || {}),
      allowed_tenant_ids: allowed,
    },
    active: p.active !== false && p.status !== 'inactive',
  };
}

router.get('/', async (req: Request, res: Response) => {
  const tenantId = getRequestTenantId(req);

  let userAvatarMap: Record<string, string> = {};
  if (directusUrl && directusAdminToken) {
    try {
      const usersRes = await directusFetch('/users?fields=id,email,avatar&limit=500').catch(
        () => null
      );
      if (usersRes && Array.isArray(usersRes.data)) {
        for (const u of usersRes.data) {
          if (u.id && u.avatar) {
            const formatted = formatAvatarUrl(u.avatar);
            if (formatted) {
              userAvatarMap[String(u.id)] = formatted;
              if (u.email) userAvatarMap[u.email.toLowerCase().trim()] = formatted;
            }
          }
        }
      }

      const resp = await directusFetch('/items/personnel?sort=id&limit=500');
      if (resp?.data && Array.isArray(resp.data)) {
        setPersonnelData(resp.data);
        const mapped = resp.data.map((p: any) => {
          const enriched = enrichPersonnel(p);
          let avatar = enriched.avatar;
          if (!avatar) {
            if (enriched.user_id && userAvatarMap[enriched.user_id]) {
              avatar = userAvatarMap[enriched.user_id];
            } else if (enriched.email && userAvatarMap[enriched.email.toLowerCase().trim()]) {
              avatar = userAvatarMap[enriched.email.toLowerCase().trim()];
            }
          }
          return { ...enriched, avatar };
        });

        if (tenantId && tenantId !== 'all') {
          const filtered = mapped.filter(
            (p: any) => p.tenant_id === tenantId || p.allowed_tenant_ids?.includes(tenantId)
          );
          return res.json(filtered);
        }
        return res.json(mapped);
      }
    } catch (e: any) {
      console.warn('Personnel query fallback:', e.message);
    }
  }

  let list = personnelData.map((p) => {
    const enriched = enrichPersonnel(p);
    let avatar = enriched.avatar;
    if (!avatar) {
      if (enriched.user_id && userAvatarMap[enriched.user_id]) {
        avatar = userAvatarMap[enriched.user_id];
      } else if (enriched.email && userAvatarMap[enriched.email.toLowerCase().trim()]) {
        avatar = userAvatarMap[enriched.email.toLowerCase().trim()];
      }
    }
    return { ...enriched, avatar };
  });

  if (tenantId && tenantId !== 'all') {
    list = list.filter(
      (p: any) => p.tenant_id === tenantId || p.allowed_tenant_ids?.includes(tenantId)
    );
  }

  res.json(list);
});

router.post('/', async (req: Request, res: Response) => {
  const { isAdmin } = getRequestUser(req);
  if (!isAdmin) {
    return res
      .status(403)
      .json({ error: 'FORBIDDEN', message: 'فقط مدیر سیستم مجاز به ایجاد همکار جدید است.' });
  }

  const payload = req.body;
  if (!payload.name) {
    return res.status(400).json({ error: 'نام و نام خانوادگی الزامی است.' });
  }

  const newPId = payload.id || crypto.randomUUID();
  const cleanEmail = payload.email ? String(payload.email).trim().toLowerCase() : '';
  const targetTenantId = payload.tenant_id || getRequestTenantId(req) || 'default';
  const resolvedTenantNum = resolveDirectusTenantId(targetTenantId);

  let createdUserId: string | null = null;
  if (directusUrl && directusAdminToken && cleanEmail && payload.password) {
    try {
      const nameParts = String(payload.name).trim().split(' ');
      const fname = nameParts[0] || 'همکار';
      const lname = nameParts.slice(1).join(' ') || 'جدید';

      const createdU = await directusFetch('/users', {
        method: 'POST',
        body: JSON.stringify({
          email: cleanEmail,
          password: payload.password,
          first_name: fname,
          last_name: lname,
          role: DIRECTUS_STAFF_ROLE_ID,
          status: 'active',
        }),
      }).catch(() => null);

      if (createdU?.data?.id) {
        createdUserId = createdU.data.id;
      }
    } catch {}
  }

  const allowedTenants = Array.isArray(payload.allowed_tenant_ids)
    ? payload.allowed_tenant_ids
    : [targetTenantId];

  const newPersonnel: Personnel = {
    id: newPId,
    tenant_id: targetTenantId,
    allowed_tenant_ids: allowedTenants,
    name: String(payload.name).trim(),
    username: payload.username ? String(payload.username).trim() : cleanEmail.split('@')[0],
    role: payload.role || 'marketer',
    email: cleanEmail,
    phone: (payload.phone || '').trim(),
    phones: Array.isArray(payload.phones) ? payload.phones : [],
    emergency_contact_name: (payload.emergency_contact_name || '').trim(),
    emergency_contact_phone: (payload.emergency_contact_phone || '').trim(),
    emergency_contact_relation: (payload.emergency_contact_relation || '').trim(),
    family_contacts: payload.family_contacts || null,
    permissions: {
      allowed_menus: payload.permissions?.allowed_menus || [
        'dashboard',
        'customers',
        'reports',
        'analytics',
      ],
      allowed_tenant_ids: allowedTenants,
      can_view_all_customers: Boolean(payload.permissions?.can_view_all_customers),
      can_edit_customer: Boolean(payload.permissions?.can_edit_customer),
      can_delete_customer: Boolean(payload.permissions?.can_delete_customer),
      can_export_data: Boolean(payload.permissions?.can_export_data),
      can_switch_ownership: Boolean(payload.permissions?.can_switch_ownership),
      can_extend_ownership: Boolean(payload.permissions?.can_extend_ownership),
      can_manage_leads: Boolean(payload.permissions?.can_manage_leads),
      can_approve_leaves: Boolean(payload.permissions?.can_approve_leaves),
      can_approve_advances: Boolean(payload.permissions?.can_approve_advances),
      can_manage_personnel: Boolean(payload.permissions?.can_manage_personnel),
      report_view_scope: payload.permissions?.report_view_scope || 'own_only',
      visible_report_personnel_ids: payload.permissions?.visible_report_personnel_ids || [],
    },
    avatar: payload.avatar || '',
    status: payload.status || 'active',
    active: payload.status !== 'inactive',
    user_id: createdUserId || payload.user_id || null,
    bank_card_number: (payload.bank_card_number || '').trim(),
    iban: (payload.iban || '').trim(),
    national_id: (payload.national_id || '').trim(),
  };

  if (directusUrl && directusAdminToken) {
    try {
      const directusPayload = {
        ...newPersonnel,
        tenant_id: resolvedTenantNum,
      };
      const createdP = await directusFetch('/items/personnel', {
        method: 'POST',
        body: JSON.stringify(directusPayload),
      });
      if (createdP?.data) {
        const item = enrichPersonnel({
          ...newPersonnel,
          ...createdP.data,
          id: String(createdP.data.id),
        });
        personnelData.push(item);
        return res.status(201).json(item);
      }
    } catch (e: any) {
      console.warn('Personnel create error in Directus:', e.message);
    }
  }

  personnelData.push(newPersonnel);
  res.status(201).json(newPersonnel);
});

router.patch('/:id', async (req: Request, res: Response) => {
  const { isAdmin } = getRequestUser(req);
  if (!isAdmin) {
    return res
      .status(403)
      .json({ error: 'FORBIDDEN', message: 'فقط مدیر سیستم مجاز به ویرایش همکار است.' });
  }

  const { id } = req.params;
  const patch = req.body;

  if (patch.status) {
    patch.active = patch.status !== 'inactive';
  } else if (patch.active !== undefined) {
    patch.status = patch.active ? 'active' : 'inactive';
  }

  const idx = personnelData.findIndex((p) => String(p.id) === String(id));
  if (idx !== -1) {
    personnelData[idx] = enrichPersonnel({ ...personnelData[idx], ...patch });
  }

  if (directusUrl && directusAdminToken) {
    try {
      const directusPatch: Record<string, any> = { ...patch };
      if (patch.tenant_id) {
        directusPatch.tenant_id = resolveDirectusTenantId(patch.tenant_id);
      }

      // If avatar is /api/assets/<fileId>, extract raw UUID for Directus file relation
      if (typeof patch.avatar === 'string') {
        const fileMatch = patch.avatar.match(/\/api\/assets\/([a-zA-Z0-9\-_]+)/);
        if (fileMatch && fileMatch[1]) {
          directusPatch.avatar = fileMatch[1];
        }
      }

      const patched = await directusFetch(`/items/personnel/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(directusPatch),
      });

      // Synchronize Directus user account status (active / suspended)
      const targetUserId = patch.user_id || (idx !== -1 ? personnelData[idx]?.user_id : null);
      if (patch.status && targetUserId) {
        await directusFetch(`/users/${targetUserId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            status: patch.status === 'inactive' ? 'suspended' : 'active',
          }),
        }).catch((e) => console.warn('Could not update directus_users status:', e.message));
      }

      if (patched?.data) {
        const item = enrichPersonnel({
          ...(idx !== -1 ? personnelData[idx] : {}),
          ...patched.data,
          id: String(patched.data.id),
        });
        if (idx !== -1) personnelData[idx] = item;
        return res.json(item);
      }
    } catch (e: any) {
      console.warn('Directus personnel patch error:', e.message);
    }
  }

  if (idx === -1) return res.status(404).json({ error: 'همکار مورد نظر یافت نشد.' });
  res.json(personnelData[idx]);
});

router.delete('/:id', async (req: Request, res: Response) => {
  const { isAdmin } = getRequestUser(req);
  if (!isAdmin) {
    return res
      .status(403)
      .json({ error: 'FORBIDDEN', message: 'فقط مدیر سیستم مجاز به حذف همکار است.' });
  }

  const { id } = req.params;
  setPersonnelData(personnelData.filter((p) => String(p.id) !== String(id)));

  if (directusUrl && directusAdminToken) {
    try {
      await directusFetch(`/items/personnel/${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch (e: any) {
      console.warn('Directus personnel delete error:', e.message);
    }
  }

  res.json({ success: true });
});

router.post('/batch-permissions', async (req: Request, res: Response) => {
  const { isAdmin } = getRequestUser(req);
  if (!isAdmin) {
    return res
      .status(403)
      .json({ error: 'FORBIDDEN', message: 'فقط مدیر سیستم مجاز به بروزرسانی دسترسی‌ها است.' });
  }

  const { personnel_ids, permissions } = req.body;
  if (!Array.isArray(personnel_ids) || personnel_ids.length === 0 || !permissions) {
    return res.status(400).json({ error: 'شناسه‌های همکاران و ماتریس دسترسی الزامی است.' });
  }

  for (const pid of personnel_ids) {
    const idx = personnelData.findIndex((p) => String(p.id) === String(pid));
    if (idx !== -1) {
      personnelData[idx].permissions = {
        ...(personnelData[idx].permissions || { allowed_menus: [] }),
        ...permissions,
      };
    }

    if (directusUrl && directusAdminToken) {
      try {
        await directusFetch(`/items/personnel/${encodeURIComponent(pid)}`, {
          method: 'PATCH',
          body: JSON.stringify({ permissions }),
        });
      } catch {}
    }
  }

  res.json({ success: true, updatedCount: personnel_ids.length });
});

router.post('/batch-delete', async (req: Request, res: Response) => {
  const { isAdmin } = getRequestUser(req);
  if (!isAdmin) {
    return res
      .status(403)
      .json({ error: 'FORBIDDEN', message: 'فقط مدیر سیستم مجاز به حذف گروهی همکاران است.' });
  }

  const { personnel_ids } = req.body;
  if (!Array.isArray(personnel_ids) || personnel_ids.length === 0) {
    return res.status(400).json({ error: 'شناسه‌های همکاران الزامی است.' });
  }

  const idSet = new Set(personnel_ids.map(String));
  setPersonnelData(personnelData.filter((p) => !idSet.has(String(p.id))));

  if (directusUrl && directusAdminToken) {
    for (const pid of personnel_ids) {
      try {
        await directusFetch(`/items/personnel/${encodeURIComponent(pid)}`, { method: 'DELETE' });
      } catch {}
    }
  }

  res.json({ success: true, deletedCount: personnel_ids.length });
});

router.post('/me/profile', async (req: Request, res: Response) => {
  const { userId, personnelId, userEmail, userName } = getRequestUser(req);
  const {
    name,
    phone,
    username,
    bank_card_number,
    iban,
    national_id,
    avatar,
    emergency_contact_name,
    emergency_contact_phone,
    emergency_contact_relation,
    family_contacts,
    phones,
  } = req.body;

  const targetId = personnelId || userId;
  const personnelPatch: Record<string, any> = {};

  if (name !== undefined) personnelPatch.name = String(name).trim();
  if (phone !== undefined) personnelPatch.phone = String(phone).trim();
  if (username !== undefined) personnelPatch.username = String(username).trim();
  if (bank_card_number !== undefined) personnelPatch.bank_card_number = String(bank_card_number).trim();
  if (iban !== undefined) personnelPatch.iban = String(iban).trim();
  if (national_id !== undefined) personnelPatch.national_id = String(national_id).trim();
  if (avatar !== undefined) personnelPatch.avatar = avatar;
  if (emergency_contact_name !== undefined) personnelPatch.emergency_contact_name = String(emergency_contact_name).trim();
  if (emergency_contact_phone !== undefined) personnelPatch.emergency_contact_phone = String(emergency_contact_phone).trim();
  if (emergency_contact_relation !== undefined) personnelPatch.emergency_contact_relation = String(emergency_contact_relation).trim();
  if (family_contacts !== undefined) personnelPatch.family_contacts = family_contacts;
  if (phones !== undefined) personnelPatch.phones = phones;

  let targetPersonnel: any = null;

  if (directusUrl && directusAdminToken && targetId) {
    try {
      const patched = await directusFetch(`/items/personnel/${encodeURIComponent(targetId)}`, {
        method: 'PATCH',
        body: JSON.stringify(personnelPatch),
      });
      if (patched?.data) {
        targetPersonnel = enrichPersonnel(patched.data);
      }
    } catch (err: any) {
      console.warn('Directus personnel profile PATCH warning:', err.message);
    }
  }

  const idx = personnelData.findIndex(
    (p) =>
      p.id === targetId ||
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
      ...personnelPatch,
    };
    personnelData.push(newLocal);
    if (!targetPersonnel) targetPersonnel = newLocal;
  }

  res.json({
    success: true,
    personnel: targetPersonnel,
    message: 'مشخصات پروفایل با موفقیت در پایگاه داده مرکزی ذخیره شد.',
  });
});

export default router;
