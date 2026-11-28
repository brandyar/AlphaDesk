import { Router, Request, Response } from 'express';
import {
  directusUrl,
  directusAdminToken,
  tenantsData,
  setTenantsData,
  customersData,
  personnelData,
} from '../config.ts';
import { directusFetch } from '../directus/client.ts';
import {
  ensureDirectusTenants,
  ensureDirectusTenantContactFields,
  resolveDirectusTenantId,
  sanitizeTenantSlug,
  encodeTenantMeta,
  mapDirectusTenant,
  extractDirectusTenantIdString,
} from '../directus/sync.ts';
import { getRequestUser, matchesTenant } from '../middlewares/auth.middleware.ts';
import { Tenant } from '../types.ts';

const router = Router();

function isUniqueConstraintError(message: string): boolean {
  const lower = String(message || '').toLowerCase();
  return (
    lower.includes('unique') ||
    lower.includes('record_not_unique') ||
    lower.includes('duplicate') ||
    lower.includes('already exists')
  );
}

function isUnknownFieldError(message: string): boolean {
  const lower = String(message || '').toLowerCase();
  return (
    lower.includes('forbidden') ||
    lower.includes('invalid') ||
    lower.includes('does not exist') ||
    lower.includes('unknown') ||
    lower.includes('column') ||
    lower.includes('field')
  );
}

router.get('/', async (req: Request, res: Response) => {
  if (directusUrl && directusAdminToken) {
    try {
      const resp = await directusFetch('/items/tenants?sort=id&limit=200');
      if (resp?.data && Array.isArray(resp.data)) {
        if (resp.data.length === 0) {
          await ensureDirectusTenants();
        } else {
          const mappedTenants: Tenant[] = resp.data.map((t: any) => mapDirectusTenant(t));
          setTenantsData(mappedTenants);
        }
      }
    } catch {}
  }

  const reqUser = getRequestUser(req);
  if (!reqUser.isAuthenticated) {
    return res.json([]);
  }
  if (reqUser.isAdmin) {
    return res.json(tenantsData);
  }

  // Non-admin users can ONLY see the single organization they belong to
  const ownTenant = tenantsData.find(
    (t) =>
      matchesTenant(t.id, reqUser.tenantId) ||
      (t.slug && matchesTenant(t.slug, reqUser.tenantId))
  );
  if (ownTenant) {
    return res.json([ownTenant]);
  }
  return res.json(tenantsData.length > 0 ? [tenantsData[0]] : []);
});

router.get('/stats', async (req: Request, res: Response) => {
  const { isAuthenticated, isAdmin } = getRequestUser(req);
  if (!isAuthenticated) {
    return res
      .status(401)
      .json({ error: 'UNAUTHORIZED', message: 'احراز هویت جهت دریافت آمار سازمان‌ها الزامی است.' });
  }
  if (!isAdmin) {
    return res
      .status(403)
      .json({ error: 'FORBIDDEN', message: 'فقط مدیر سیستم مجاز به مشاهده آمار سازمان‌ها است.' });
  }

  // Ensure tenants list is hydrated
  if (directusUrl && directusAdminToken && tenantsData.length === 0) {
    await ensureDirectusTenants().catch(() => {});
  }

  const defaultTenantNum = resolveDirectusTenantId('default') || Number(tenantsData[0]?.id) || 1;
  const defaultTenantKey = String(defaultTenantNum);

  const perTenant: Record<string, { customers_count: number; personnel_count: number }> = {};
  for (const t of tenantsData) {
    perTenant[String(t.id)] = { customers_count: 0, personnel_count: 0 };
  }
  if (!perTenant[defaultTenantKey]) {
    perTenant[defaultTenantKey] = { customers_count: 0, personnel_count: 0 };
  }

  const normalizeTenantBucket = (rawTenantId: any): string => {
    const str = extractDirectusTenantIdString(rawTenantId);
    if (!str || str === 'default') return defaultTenantKey;
    return str;
  };

  if (directusUrl && directusAdminToken) {
    const fetchCollectionCounts = async (
      collection: 'customers' | 'personnel'
    ): Promise<{ total: number; byTenant: Record<string, number> }> => {
      const byTenant: Record<string, number> = {};
      let total = 0;

      // 1. Fetch exact total count across all tenants
      const totalRes = await directusFetch(`/items/${collection}?limit=1&meta=total_count`, {}, 1, 5000).catch(
        () => null
      );
      if (typeof totalRes?.meta?.total_count === 'number') {
        total = totalRes.meta.total_count;
      }

      // 2. Try fast Directus groupBy aggregation
      const groupedRes = await directusFetch(
        `/items/${collection}?groupBy[]=tenant_id&aggregate[count]=id`,
        {},
        1,
        5000
      ).catch(() => null);

      if (groupedRes?.data && Array.isArray(groupedRes.data) && groupedRes.data.length > 0) {
        let groupedSum = 0;
        for (const row of groupedRes.data) {
          const rawCount =
            typeof row?.count === 'object' && row?.count !== null
              ? row.count.id ?? row.count['*'] ?? Object.values(row.count)[0]
              : row?.count;
          const cnt = Number(rawCount) || 0;
          const bucket = normalizeTenantBucket(row?.tenant_id);
          byTenant[bucket] = (byTenant[bucket] || 0) + cnt;
          groupedSum += cnt;
        }
        if (total === 0 && groupedSum > 0) {
          total = groupedSum;
        }
        return { total, byTenant };
      }

      // 3. Fallback: per-tenant filter_count queries
      const tenantIds = Array.from(new Set(tenantsData.map((t) => String(t.id))));
      const perQueries = await Promise.all(
        tenantIds.map(async (tid) => {
          const numericId = resolveDirectusTenantId(tid);
          if (!numericId) return { tid, count: 0 };
          const filterQuery =
            String(numericId) === defaultTenantKey
              ? `filter[_or][0][tenant_id][_eq]=${numericId}&filter[_or][1][tenant_id][_null]=true`
              : `filter[tenant_id][_eq]=${numericId}`;
          const r = await directusFetch(
            `/items/${collection}?${filterQuery}&limit=1&meta=filter_count`,
            {},
            1,
            4000
          ).catch(() => null);
          const count = Number(r?.meta?.filter_count ?? 0) || 0;
          return { tid: String(numericId), count };
        })
      );
      let fallbackSum = 0;
      for (const q of perQueries) {
        byTenant[q.tid] = q.count;
        fallbackSum += q.count;
      }
      if (total === 0 && fallbackSum > 0) {
        total = fallbackSum;
      }
      return { total, byTenant };
    };

    try {
      const [custCounts, persCounts] = await Promise.all([
        fetchCollectionCounts('customers'),
        fetchCollectionCounts('personnel'),
      ]);

      for (const [tid, count] of Object.entries(custCounts.byTenant)) {
        if (!perTenant[tid]) perTenant[tid] = { customers_count: 0, personnel_count: 0 };
        perTenant[tid].customers_count = count;
      }
      for (const [tid, count] of Object.entries(persCounts.byTenant)) {
        if (!perTenant[tid]) perTenant[tid] = { customers_count: 0, personnel_count: 0 };
        perTenant[tid].personnel_count = count;
      }

      // Alias 'default' to defaultTenantKey for convenience
      if (perTenant[defaultTenantKey] && !perTenant['default']) {
        perTenant['default'] = { ...perTenant[defaultTenantKey] };
      }

      const activeTenantsCount = tenantsData.filter((t) => t.status !== 'inactive').length;

      return res.json({
        total_tenants: tenantsData.length,
        active_tenants: activeTenantsCount,
        total_customers: custCounts.total,
        total_personnel: persCounts.total,
        per_tenant: perTenant,
      });
    } catch (err: any) {
      console.warn('Directus tenants stats error:', err?.message || err);
    }
  }

  // In-memory fallback calculation
  for (const c of customersData) {
    const bucket = normalizeTenantBucket((c as any).tenant_id);
    if (!perTenant[bucket]) perTenant[bucket] = { customers_count: 0, personnel_count: 0 };
    perTenant[bucket].customers_count += 1;
  }
  for (const p of personnelData) {
    const bucket = normalizeTenantBucket((p as any).tenant_id);
    if (!perTenant[bucket]) perTenant[bucket] = { customers_count: 0, personnel_count: 0 };
    perTenant[bucket].personnel_count += 1;
  }
  if (perTenant[defaultTenantKey] && !perTenant['default']) {
    perTenant['default'] = { ...perTenant[defaultTenantKey] };
  }

  return res.json({
    total_tenants: tenantsData.length,
    active_tenants: tenantsData.filter((t) => t.status !== 'inactive').length,
    total_customers: customersData.length,
    total_personnel: personnelData.length,
    per_tenant: perTenant,
  });
});

router.post('/', async (req: Request, res: Response) => {
  const { isAdmin } = getRequestUser(req);
  if (!isAdmin) {
    return res
      .status(403)
      .json({ error: 'FORBIDDEN', message: 'فقط مدیر سیستم مجاز به ایجاد سازمان جدید است.' });
  }

  const { name, slug, phone, address, logo, description, status } = req.body || {};
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'نام سازمان الزامی است.' });
  }

  const cleanName = String(name).trim();
  const cleanSlug = sanitizeTenantSlug(slug, 'org-' + Date.now());
  const cleanPhone = phone !== undefined && phone !== null ? String(phone).trim() : '';
  const cleanAddress = address !== undefined && address !== null ? String(address).trim() : '';
  const cleanDescription = description !== undefined && description !== null ? String(description).trim() : '';
  const cleanStatus: 'active' | 'inactive' = status === 'inactive' ? 'inactive' : 'active';

  const hasNativeCols = await ensureDirectusTenantContactFields().catch(() => false);

  const directusBody: Record<string, any> = {
    name: cleanName,
    slug: cleanSlug,
    description: hasNativeCols
      ? cleanDescription
      : encodeTenantMeta(cleanDescription, cleanPhone, cleanAddress),
    status: cleanStatus,
  };
  if (hasNativeCols) {
    directusBody.phone = cleanPhone;
    directusBody.address = cleanAddress;
  }
  if (logo && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(logo))) {
    directusBody.logo = String(logo);
  }

  if (directusUrl && directusAdminToken) {
    try {
      let created: any;
      try {
        created = await directusFetch('/items/tenants', {
          method: 'POST',
          body: JSON.stringify(directusBody),
        });
      } catch (firstErr: any) {
        if (isUniqueConstraintError(firstErr?.message)) {
          return res.status(400).json({
            error: 'DUPLICATE_SLUG',
            message: 'شناسه (Slug) واردشده تکراری است. لطفاً شناسه یکتای دیگری وارد کنید.',
          });
        }
        if (hasNativeCols && isUnknownFieldError(firstErr?.message)) {
          const fallbackBody = { ...directusBody };
          delete fallbackBody.phone;
          delete fallbackBody.address;
          fallbackBody.description = encodeTenantMeta(cleanDescription, cleanPhone, cleanAddress);
          created = await directusFetch('/items/tenants', {
            method: 'POST',
            body: JSON.stringify(fallbackBody),
          });
        } else {
          throw firstErr;
        }
      }

      if (created?.data) {
        const mapped = mapDirectusTenant(created.data);
        const item: Tenant = {
          ...mapped,
          phone: mapped.phone || cleanPhone,
          address: mapped.address || cleanAddress,
        };
        tenantsData.push(item);
        return res.status(201).json(item);
      }
    } catch (e: any) {
      if (isUniqueConstraintError(e?.message)) {
        return res.status(400).json({
          error: 'DUPLICATE_SLUG',
          message: 'شناسه (Slug) واردشده تکراری است. لطفاً شناسه یکتای دیگری وارد کنید.',
        });
      }
      console.warn('Directus tenants save error:', e?.message || e);
      return res.status(500).json({
        error: 'TENANT_CREATE_FAILED',
        message: 'خطا در ثبت سازمان جدید در پایگاه داده.',
      });
    }
  }

  const newTenant: Tenant = {
    id: String(Date.now()),
    name: cleanName,
    slug: cleanSlug,
    phone: cleanPhone,
    address: cleanAddress,
    description: cleanDescription,
    logo: typeof logo === 'string' ? logo : '',
    status: cleanStatus,
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

  const rawId = String(req.params.id || '').trim();
  const patch = req.body || {};

  const resolvedDirectusId =
    rawId === 'default' ? String(resolveDirectusTenantId('default') || '1') : rawId;

  const idx = tenantsData.findIndex(
    (t) => String(t.id) === rawId || String(t.id) === resolvedDirectusId
  );
  const existingTenant = idx !== -1 ? tenantsData[idx] : null;

  const nextName =
    patch.name !== undefined ? String(patch.name).trim() : existingTenant?.name || '';
  if (!nextName) {
    return res.status(400).json({ error: 'نام سازمان نمی‌تواند خالی باشد.' });
  }

  const nextPhone =
    patch.phone !== undefined
      ? String(patch.phone ?? '').trim()
      : existingTenant?.phone || '';
  const nextAddress =
    patch.address !== undefined
      ? String(patch.address ?? '').trim()
      : existingTenant?.address || '';
  const nextDescription =
    patch.description !== undefined
      ? String(patch.description ?? '').trim()
      : existingTenant?.description || '';
  const nextStatus: 'active' | 'inactive' =
    patch.status !== undefined
      ? patch.status === 'inactive'
        ? 'inactive'
        : 'active'
      : existingTenant?.status || 'active';

  const fallbackSlug = existingTenant?.slug || `org-${resolvedDirectusId}`;
  const nextSlug =
    patch.slug !== undefined
      ? sanitizeTenantSlug(patch.slug, fallbackSlug)
      : fallbackSlug;

  if (directusUrl && directusAdminToken) {
    try {
      const hasNativeCols = await ensureDirectusTenantContactFields().catch(() => false);

      const directusPatch: Record<string, any> = {
        name: nextName,
        slug: nextSlug,
        status: nextStatus,
        description: hasNativeCols
          ? nextDescription
          : encodeTenantMeta(nextDescription, nextPhone, nextAddress),
      };

      if (hasNativeCols) {
        directusPatch.phone = nextPhone;
        directusPatch.address = nextAddress;
      }

      if (
        patch.logo &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(patch.logo))
      ) {
        directusPatch.logo = String(patch.logo);
      }

      let patched: any;
      try {
        patched = await directusFetch(`/items/tenants/${encodeURIComponent(resolvedDirectusId)}`, {
          method: 'PATCH',
          body: JSON.stringify(directusPatch),
        });
      } catch (firstErr: any) {
        if (isUniqueConstraintError(firstErr?.message)) {
          return res.status(400).json({
            error: 'DUPLICATE_SLUG',
            message: 'شناسه (Slug) واردشده تکراری است. لطفاً شناسه یکتای دیگری وارد کنید.',
          });
        }
        if (hasNativeCols && isUnknownFieldError(firstErr?.message)) {
          const fallbackPatch = { ...directusPatch };
          delete fallbackPatch.phone;
          delete fallbackPatch.address;
          fallbackPatch.description = encodeTenantMeta(nextDescription, nextPhone, nextAddress);
          patched = await directusFetch(`/items/tenants/${encodeURIComponent(resolvedDirectusId)}`, {
            method: 'PATCH',
            body: JSON.stringify(fallbackPatch),
          });
        } else {
          throw firstErr;
        }
      }

      if (patched?.data) {
        const mapped = mapDirectusTenant(patched.data);
        const item: Tenant = {
          ...mapped,
          phone: patch.phone !== undefined ? nextPhone : mapped.phone,
          address: patch.address !== undefined ? nextAddress : mapped.address,
        };
        if (idx !== -1) {
          tenantsData[idx] = item;
        } else {
          tenantsData.push(item);
        }
        return res.json(item);
      }
    } catch (e: any) {
      if (isUniqueConstraintError(e?.message)) {
        return res.status(400).json({
          error: 'DUPLICATE_SLUG',
          message: 'شناسه (Slug) واردشده تکراری است. لطفاً شناسه یکتای دیگری وارد کنید.',
        });
      }
      console.warn('Directus tenant patch error:', e?.message || e);
      return res.status(500).json({
        error: 'TENANT_UPDATE_FAILED',
        message: 'خطا در ذخیره تغییرات سازمان در پایگاه داده.',
      });
    }
  }

  if (idx === -1) return res.status(404).json({ error: 'سازمان مورد نظر یافت نشد.' });
  tenantsData[idx] = {
    ...tenantsData[idx],
    name: nextName,
    slug: nextSlug,
    phone: nextPhone,
    address: nextAddress,
    description: nextDescription,
    status: nextStatus,
  };
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
