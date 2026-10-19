import crypto from 'crypto';
import {
  directusUrl,
  directusAdminToken,
  tenantsData,
  setTenantsData,
  initialPersonnel,
  personnelData,
  setPersonnelData,
} from '../config';
import { directusFetch } from './client';
import { Tenant } from '../types';

export function resolveDirectusTenantId(rawTenant: any): number | null {
  const validIds = tenantsData
    .map((t) => Number(t.id))
    .filter((n) => !isNaN(n) && isFinite(n) && n > 0);

  if (
    rawTenant === null ||
    rawTenant === undefined ||
    rawTenant === '' ||
    rawTenant === 'all' ||
    rawTenant === 'default'
  ) {
    if (validIds.length > 0) return validIds[0];
    return 1;
  }
  const directNum = Number(rawTenant);
  if (!isNaN(directNum) && isFinite(directNum) && directNum > 0) {
    if (validIds.length === 0 || validIds.includes(directNum)) return directNum;
  }
  const str = String(rawTenant).trim().toLowerCase();
  const match = tenantsData.find(
    (t) =>
      String(t.id).toLowerCase() === str ||
      (t.slug && t.slug.toLowerCase() === str) ||
      t.name.toLowerCase() === str
  );
  if (match) {
    const matchNum = Number(match.id);
    if (!isNaN(matchNum) && isFinite(matchNum)) {
      if (validIds.length === 0 || validIds.includes(matchNum)) return matchNum;
    }
  }
  return validIds[0] || 1;
}

// Ensure at least one default tenant exists in Directus so foreign keys are valid
export async function ensureDirectusTenants() {
  if (!directusUrl || !directusAdminToken) return;
  try {
    const res = await directusFetch('/items/tenants?limit=100&sort=id');
    if (res && Array.isArray(res.data) && res.data.length > 0) {
      const mappedTenants: Tenant[] = res.data.map((t: any) => ({
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
      console.log(`Directus tenants synchronized (${mappedTenants.length} tenants).`);
    } else {
      console.log('No tenants found in Directus, creating default tenant...');
      const created = await directusFetch('/items/tenants', {
        method: 'POST',
        body: JSON.stringify({
          name: 'سازمان مرکزی آلفادسک',
          slug: 'alphadesk-hq',
          status: 'active',
          description: 'سازمان اصلی و پیش‌فرض سامانه',
        }),
      });
      if (created?.data) {
        const defaultTenant: Tenant = {
          id: String(created.data.id),
          name: created.data.name,
          slug: created.data.slug,
          logo: created.data.logo || '',
          description: created.data.description || '',
          status: 'active',
          date_created: created.data.date_created || new Date().toISOString(),
        };
        setTenantsData([defaultTenant]);
        console.log('Directus default tenant created with ID:', created.data.id);
      }
    }
  } catch (err: any) {
    console.warn('Could not sync/seed tenants in Directus:', err.message);
  }
}

// Auto-seed and synchronize personnel with Directus
export async function ensureDirectusPersonnel() {
  if (!directusUrl || !directusAdminToken) return;
  try {
    const res = await directusFetch('/items/personnel?limit=500&sort=id');
    if (res && Array.isArray(res.data)) {
      if (res.data.length > 0) {
        setPersonnelData(res.data);
        console.log(`Directus personnel synchronized (${res.data.length} records).`);
      }
      const existingIds = new Set(res.data.map((p: any) => String(p.id)));
      const missingPersonnel = initialPersonnel.filter((p) => !existingIds.has(String(p.id)));
      if (missingPersonnel.length > 0) {
        console.log(`Seeding ${missingPersonnel.length} missing initial personnel into Directus...`);
        const defaultTenantId = resolveDirectusTenantId('default') || 1;
        for (const p of missingPersonnel) {
          await directusFetch('/items/personnel', {
            method: 'POST',
            body: JSON.stringify({
              id: p.id,
              name: p.name,
              role: p.role,
              phone: p.phone,
              email: p.email,
              status: 'active',
              username: p.username,
              tenant_id: defaultTenantId,
            }),
          }).catch((e: any) => console.warn(`Could not seed personnel ${p.id}:`, e.message));
        }
        const refreshed = await directusFetch('/items/personnel?limit=500&sort=id').catch(() => null);
        if (refreshed?.data && Array.isArray(refreshed.data)) {
          setPersonnelData(refreshed.data);
        }
      }
    }
  } catch (err: any) {
    console.warn('Could not sync personnel with Directus:', err.message);
  }
}

// Safely resolve any identifier to a valid personnel ID in Directus
export async function getSafeDirectusPersonnelForeignKey(
  rawIdentifier: string | null | undefined,
  fallbackName?: string
): Promise<string | null> {
  if (!directusUrl || !directusAdminToken) return rawIdentifier || null;
  if (!rawIdentifier && !fallbackName) return null;

  const clean = rawIdentifier ? String(rawIdentifier).trim() : '';

  try {
    // 1. If clean ID provided and not generic placeholder, check in Directus directly
    if (clean && clean !== 'none' && clean !== 'همه') {
      const byId = await directusFetch(`/items/personnel/${encodeURIComponent(clean)}`).catch(
        () => null
      );
      if (byId?.data?.id) {
        return String(byId.data.id);
      }
    }

    // 2. Check if clean matches user_id or email or username in Directus
    if (clean) {
      const byMatch = await directusFetch(
        `/items/personnel?filter[_or][0][user_id][_eq]=${encodeURIComponent(
          clean
        )}&filter[_or][1][email][_eq]=${encodeURIComponent(
          clean
        )}&filter[_or][2][username][_eq]=${encodeURIComponent(clean)}&limit=1`
      ).catch(() => null);
      if (byMatch?.data && Array.isArray(byMatch.data) && byMatch.data.length > 0) {
        return String(byMatch.data[0].id);
      }
    }

    // 3. Match by name in Directus
    const searchName = fallbackName || clean;
    if (searchName && searchName.length > 2) {
      const byName = await directusFetch(
        `/items/personnel?filter[name][_eq]=${encodeURIComponent(searchName)}&limit=1`
      ).catch(() => null);
      if (byName?.data && Array.isArray(byName.data) && byName.data.length > 0) {
        return String(byName.data[0].id);
      }
    }

    // 4. Check in synchronized local personnelData
    const local = personnelData.find(
      (p) =>
        p.id === clean ||
        (p as any).user_id === clean ||
        p.email === clean ||
        p.name === searchName
    );
    if (local?.id) {
      const checkLocal = await directusFetch(`/items/personnel/${encodeURIComponent(local.id)}`).catch(
        () => null
      );
      if (checkLocal?.data?.id) {
        return String(checkLocal.data.id);
      }
    }

    // 5. Check if it's a UUID of directus user
    if (clean && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean)) {
      const userRes = await directusFetch(`/users/${clean}`).catch(() => null);
      if (userRes?.data?.id) {
        const u = userRes.data;
        const uName = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email;
        const newPId = crypto.randomUUID();
        const createdP = await directusFetch('/items/personnel', {
          method: 'POST',
          body: JSON.stringify({
            id: newPId,
            name: uName,
            email: u.email,
            phone: '',
            role: 'marketer',
            status: 'active',
            user_id: u.id,
            tenant_id: resolveDirectusTenantId('default') || 1,
          }),
        }).catch(() => null);
        if (createdP?.data?.id) {
          return String(createdP.data.id);
        }
      }
    }
  } catch (err: any) {
    console.warn('Error resolving safe Directus personnel foreign key:', err.message);
  }

  return null;
}

// Resolve any raw ID / user_id / email / name to a valid personnel.id in Directus
export async function resolvePersonnelId(
  rawIdentifier: string | null | undefined,
  fallbackName?: string
): Promise<{ personnelId: string | null; personnelName?: string }> {
  if (
    !rawIdentifier ||
    rawIdentifier === 'none' ||
    rawIdentifier === 'همه' ||
    String(rawIdentifier).trim() === ''
  ) {
    if (fallbackName && directusUrl && directusAdminToken) {
      try {
        const byName = await directusFetch(
          `/items/personnel?filter[name][_eq]=${encodeURIComponent(fallbackName)}&limit=1`
        ).catch(() => null);
        if (byName?.data && Array.isArray(byName.data) && byName.data.length > 0) {
          return { personnelId: byName.data[0].id, personnelName: byName.data[0].name };
        }
      } catch {}
    }
    return { personnelId: null, personnelName: fallbackName };
  }
  const clean = String(rawIdentifier).trim();

  if (directusUrl && directusAdminToken) {
    try {
      // 1. Direct match on personnel ID
      const byId = await directusFetch(`/items/personnel/${encodeURIComponent(clean)}`).catch(
        () => null
      );
      if (byId?.data?.id) {
        return { personnelId: byId.data.id, personnelName: byId.data.name };
      }

      // 2. Check if clean matches user_id in personnel
      const byUserId = await directusFetch(
        `/items/personnel?filter[user_id][_eq]=${encodeURIComponent(clean)}`
      ).catch(() => null);
      if (byUserId?.data && Array.isArray(byUserId.data) && byUserId.data.length > 0) {
        return { personnelId: byUserId.data[0].id, personnelName: byUserId.data[0].name };
      }

      // 3. Check if clean matches email
      const byEmail = await directusFetch(
        `/items/personnel?filter[email][_eq]=${encodeURIComponent(clean)}`
      ).catch(() => null);
      if (byEmail?.data && Array.isArray(byEmail.data) && byEmail.data.length > 0) {
        return { personnelId: byEmail.data[0].id, personnelName: byEmail.data[0].name };
      }

      // 3b. Check if clean matches username
      const byUsername = await directusFetch(
        `/items/personnel?filter[username][_eq]=${encodeURIComponent(clean)}`
      ).catch(() => null);
      if (byUsername?.data && Array.isArray(byUsername.data) && byUsername.data.length > 0) {
        return { personnelId: byUsername.data[0].id, personnelName: byUsername.data[0].name };
      }

      // 4. Check if clean matches name
      if (fallbackName || clean.length > 2) {
        const searchName = fallbackName || clean;
        const byName = await directusFetch(
          `/items/personnel?filter[name][_eq]=${encodeURIComponent(searchName)}`
        ).catch(() => null);
        if (byName?.data && Array.isArray(byName.data) && byName.data.length > 0) {
          return { personnelId: byName.data[0].id, personnelName: byName.data[0].name };
        }
      }

      // 5. If it is a UUID but not found in personnel, check if it is a directus_users id
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean)) {
        const userRes = await directusFetch(`/users/${clean}`).catch(() => null);
        if (userRes?.data?.id) {
          const u = userRes.data;
          const uName = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email;
          const newPId = crypto.randomUUID();
          await directusFetch('/items/personnel', {
            method: 'POST',
            body: JSON.stringify({
              id: newPId,
              name: uName,
              email: u.email,
              phone: '',
              role: 'marketer',
              status: 'active',
              user_id: u.id,
              tenant_id: resolveDirectusTenantId('default') || 1,
            }),
          }).catch(() => {});
          return { personnelId: newPId, personnelName: uName };
        }
      }
    } catch {}
  }

  // Fallback in local data
  const local = personnelData.find(
    (p) =>
      p.id === clean ||
      (p as any).user_id === clean ||
      p.email === clean ||
      p.name === clean
  );
  if (local) {
    return { personnelId: local.id, personnelName: local.name };
  }

  return { personnelId: null, personnelName: fallbackName };
}
