import { Router, Request, Response } from 'express';
import {
  directusUrl,
  directusAdminToken,
  tenantsData,
  setTenantsData,
} from '../config.ts';
import { directusFetch } from '../directus/client.ts';
import { ensureDirectusTenants } from '../directus/sync.ts';
import { getRequestUser } from '../middlewares/auth.middleware.ts';
import { Tenant } from '../types.ts';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  if (directusUrl && directusAdminToken) {
    try {
      const resp = await directusFetch('/items/tenants?sort=id');
      if (resp?.data && Array.isArray(resp.data)) {
        if (resp.data.length === 0) {
          await ensureDirectusTenants();
        } else {
          const mappedTenants: Tenant[] = resp.data.map((t: any) => ({
            id: String(t.id),
            name: t.name || 'سازمان ' + t.id,
            slug: t.slug || 'org-' + t.id,
            logo: t.logo || '',
            description: t.description || '',
            phone: t.phone || '',
            address: t.address || '',
            status: t.status === 'inactive' ? 'inactive' : 'active',
            date_created: t.date_created || new Date().toISOString(),
          }));
          setTenantsData(mappedTenants);
        }
      }
    } catch {}
  }
  res.json(tenantsData);
});

router.post('/', async (req: Request, res: Response) => {
  const { isAdmin } = getRequestUser(req);
  if (!isAdmin) {
    return res
      .status(403)
      .json({ error: 'FORBIDDEN', message: 'فقط مدیر سیستم مجاز به ایجاد سازمان جدید است.' });
  }

  const { name, slug, phone, address, logo, description, status } = req.body;
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'نام سازمان الزامی است.' });
  }

  const cleanName = String(name).trim();
  const cleanSlug = slug ? String(slug).trim() : 'org-' + Date.now();
  const directusBody: Record<string, any> = {
    name: cleanName,
    slug: cleanSlug,
    description: (description || address || '').trim(),
    status: status || 'active',
  };
  if (logo && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(logo)) {
    directusBody.logo = logo;
  }

  if (directusUrl && directusAdminToken) {
    try {
      const created = await directusFetch('/items/tenants', {
        method: 'POST',
        body: JSON.stringify(directusBody),
      });
      if (created?.data) {
        const item: Tenant = {
          id: String(created.data.id),
          name: created.data.name,
          slug: created.data.slug,
          phone: phone ? String(phone).trim() : '',
          address: address ? String(address).trim() : '',
          description: created.data.description || '',
          logo: created.data.logo || '',
          status: created.data.status || 'active',
          date_created: created.data.date_created || new Date().toISOString(),
        };
        tenantsData.push(item);
        return res.status(201).json(item);
      }
    } catch (e: any) {
      console.warn('Directus tenants save error:', e.message);
    }
  }

  const newTenant: Tenant = {
    id: String(Date.now()),
    name: cleanName,
    slug: cleanSlug,
    phone: phone ? String(phone).trim() : '',
    address: address ? String(address).trim() : '',
    description: (description || '').trim(),
    logo: logo || '',
    status: status || 'active',
    date_created: new Date().toISOString(),
  };

  tenantsData.push(newTenant);
  res.status(201).json(newTenant);
});

router.patch('/:id', async (req: Request, res: Response) => {
  const { isAdmin } = getRequestUser(req);
  if (!isAdmin) {
    return res
      .status(403)
      .json({ error: 'FORBIDDEN', message: 'فقط مدیر سیستم مجاز به ویرایش سازمان است.' });
  }

  const { id } = req.params;
  const patch = req.body;

  const idx = tenantsData.findIndex((t) => String(t.id) === String(id));
  if (idx !== -1) {
    tenantsData[idx] = { ...tenantsData[idx], ...patch };
  }

  if (directusUrl && directusAdminToken) {
    try {
      const directusPatch: Record<string, any> = {};
      if (patch.name !== undefined) directusPatch.name = String(patch.name).trim();
      if (patch.slug !== undefined) directusPatch.slug = String(patch.slug).trim();
      if (patch.description !== undefined) directusPatch.description = String(patch.description).trim();
      if (patch.status !== undefined) directusPatch.status = patch.status;
      if (
        patch.logo &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(patch.logo)
      ) {
        directusPatch.logo = patch.logo;
      }

      const patched = await directusFetch(`/items/tenants/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(directusPatch),
      });
      if (patched?.data) {
        const item: Tenant = {
          ...tenantsData[idx],
          ...patched.data,
          id: String(patched.data.id),
        };
        if (idx !== -1) tenantsData[idx] = item;
        return res.json(item);
      }
    } catch (e: any) {
      console.warn('Directus tenant patch error:', e.message);
    }
  }

  if (idx === -1) return res.status(404).json({ error: 'سازمان مورد نظر یافت نشد.' });
  res.json(tenantsData[idx]);
});

router.delete('/:id', async (req: Request, res: Response) => {
  const { isAdmin } = getRequestUser(req);
  if (!isAdmin) {
    return res
      .status(403)
      .json({ error: 'FORBIDDEN', message: 'فقط مدیر سیستم مجاز به حذف سازمان است.' });
  }

  const { id } = req.params;
  if (id === 'default' || id === '1') {
    return res.status(400).json({ error: 'سازمان پیش‌فرض سیستم قابل حذف نیست.' });
  }

  setTenantsData(tenantsData.filter((t) => String(t.id) !== String(id)));

  if (directusUrl && directusAdminToken) {
    try {
      await directusFetch(`/items/tenants/${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch (e: any) {
      console.warn('Directus tenant delete error:', e.message);
    }
  }

  res.json({ success: true });
});

export default router;
