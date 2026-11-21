import crypto from 'crypto';
import {
  directusUrl,
  directusAdminToken,
  tenantsData,
  setTenantsData,
  initialPersonnel,
  personnelData,
  setPersonnelData,
  customersData,
  reportsData,
  tenantSettingsMap,
} from '../config.ts';
import { directusFetch, directusFetchAllPages, fetchAllDirectusItems, directusSafeBatchPatch } from './client.ts';
import { invalidateCustomersCache } from './cache.ts';
import { formatAvatarUrl } from '../middlewares/auth.middleware.ts';
import { Tenant } from '../types.ts';

export function resolveDirectusTenantId(rawTenant: any): number | null {
  const validIds = tenantsData
    .map((t) => Number(t.id))
    .filter((n) => !isNaN(n) && isFinite(n) && n > 0);

  if (
    rawTenant === null ||
    rawTenant === undefined ||
    rawTenant === '' ||
    rawTenant === 'all'
  ) {
    return null;
  }
  if (rawTenant === 'default') {
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

    // Automatically repair any legacy or newly imported records missing tenant_id
    backfillNullTenantsDirectus().catch(() => {});
  } catch (err: any) {
    console.warn('Could not sync/seed tenants in Directus:', err.message);
  }
}

// Automatically repair records where tenant_id is null in Directus
export async function backfillNullTenantsDirectus(): Promise<{ updatedCustomers: number; updatedReports: number; updatedPersonnel: number }> {
  let updatedCustomers = 0;
  let updatedReports = 0;
  let updatedPersonnel = 0;

  if (!directusUrl || !directusAdminToken) return { updatedCustomers, updatedReports, updatedPersonnel };

  try {
    const defaultTenantId = resolveDirectusTenantId('default') || 1;

    // 1. Backfill customers where tenant_id is null
    const custNullRes = await directusFetch('/items/customers?filter[tenant_id][_null]=true&fields=id&limit=5000').catch(() => null);
    if (custNullRes?.data && Array.isArray(custNullRes.data) && custNullRes.data.length > 0) {
      const ids = custNullRes.data.map((c: any) => c.id);
      for (let i = 0; i < ids.length; i += 100) {
        const chunk = ids.slice(i, i + 100);
        await directusFetch('/items/customers', {
          method: 'PATCH',
          body: JSON.stringify({
            keys: chunk,
            data: { tenant_id: defaultTenantId },
          }),
        }).catch((e) => console.warn('Could not backfill customers tenant_id chunk:', e.message));
        updatedCustomers += chunk.length;
      }
      console.log(`Successfully backfilled ${updatedCustomers} customers with tenant_id: ${defaultTenantId}`);
    }

    // 2. Backfill customer_reports where tenant_id is null
    const repNullRes = await directusFetch('/items/customer_reports?filter[tenant_id][_null]=true&fields=id&limit=5000').catch(() => null);
    if (repNullRes?.data && Array.isArray(repNullRes.data) && repNullRes.data.length > 0) {
      const ids = repNullRes.data.map((r: any) => r.id);
      for (let i = 0; i < ids.length; i += 100) {
        const chunk = ids.slice(i, i + 100);
        await directusFetch('/items/customer_reports', {
          method: 'PATCH',
          body: JSON.stringify({
            keys: chunk,
            data: { tenant_id: defaultTenantId },
          }),
        }).catch((e) => console.warn('Could not backfill reports tenant_id chunk:', e.message));
        updatedReports += chunk.length;
      }
      console.log(`Successfully backfilled ${updatedReports} reports with tenant_id: ${defaultTenantId}`);
    }

    // 3. Backfill personnel where tenant_id is null
    const pNullRes = await directusFetch('/items/personnel?filter[tenant_id][_null]=true&fields=id&limit=1000').catch(() => null);
    if (pNullRes?.data && Array.isArray(pNullRes.data) && pNullRes.data.length > 0) {
      const ids = pNullRes.data.map((p: any) => p.id);
      await directusFetch('/items/personnel', {
        method: 'PATCH',
        body: JSON.stringify({
          keys: ids,
          data: { tenant_id: defaultTenantId },
        }),
      }).catch((e) => console.warn('Could not backfill personnel tenant_id:', e.message));
      updatedPersonnel = ids.length;
    }
  } catch (err: any) {
    console.warn('backfillNullTenantsDirectus error:', err.message);
  }

  return { updatedCustomers, updatedReports, updatedPersonnel };
}

// Auto-seed and synchronize personnel with Directus
export async function ensureDirectusPersonnel() {
  if (!directusUrl || !directusAdminToken) return;
  try {
    // 1. Fetch user avatars first
    const userAvatarMap: Record<string, string> = {};
    const usersRes = await directusFetch('/users?fields=id,email,avatar.*&limit=500').catch(() => null);
    if (usersRes?.data && Array.isArray(usersRes.data)) {
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

    const res = await directusFetch('/items/personnel?limit=500&sort=id');
    if (res && Array.isArray(res.data)) {
      const attachAvatars = (list: any[]) =>
        list.map((p: any) => {
          let profileImg = formatAvatarUrl(p.profile_image);
          let av =
            profileImg ||
            (p.user_id && userAvatarMap[p.user_id]) ||
            (p.email && userAvatarMap[p.email.toLowerCase().trim()]) ||
            formatAvatarUrl(p.avatar);
          return {
            ...p,
            profile_image: profileImg || av || '',
            avatar: av || '',
          };
        });

      if (res.data.length > 0) {
        setPersonnelData(attachAvatars(res.data));
        console.log(`Directus personnel synchronized (${res.data.length} records, ${Object.keys(userAvatarMap).length} user avatars linked).`);
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
          setPersonnelData(attachAvatars(refreshed.data));
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

let isSyncingFollowups = false;

/**
 * Synchronizes next_followup_date for all customers to match the follow-up date
 * of their latest registered report (customer_reports sorted by -date_created).
 * If a customer has reports, their next_followup_date is unconditionally updated to
 * that latest report's next_followup_date (or null if the latest report left it blank).
 * If a customer has no reports yet, their existing initial next_followup_date is preserved.
 */
export async function syncAllCustomersFollowupFromReports(): Promise<{
  totalCustomers: number;
  updatedCount: number;
  error?: string;
}> {
  if (isSyncingFollowups) {
    console.log('[AlphaDesk] syncAllCustomersFollowupFromReports is already running, skipping overlapping invocation.');
    return { totalCustomers: 0, updatedCount: 0 };
  }
  isSyncingFollowups = true;
  console.log('[AlphaDesk] Starting synchronization of customer next_followup_date from latest reports...');
  const nowIso = new Date().toISOString();
  let updatedCount = 0;
  let totalCustomers = 0;

  try {
    if (directusUrl && directusAdminToken) {
      // 1. Fetch all reports sorted by newest first
      const reportsRes = await directusFetchAllPages(
        '/items/customer_reports?fields=id,customer_id,next_followup_date,date_created&sort=-date_created',
        {},
        100000
      );
      const allReports = reportsRes.data || [];

      // 2. Map latest report per customer
      const latestReportByCustId = new Map<string, any>();
      for (const rep of allReports) {
        if (!rep) continue;
        const rawCId = rep.customer_id;
        const cId =
          typeof rawCId === 'object' && rawCId !== null
            ? String(rawCId.id)
            : rawCId !== null && rawCId !== undefined
            ? String(rawCId)
            : '';
        if (cId && !latestReportByCustId.has(cId)) {
          latestReportByCustId.set(cId, rep);
        }
      }

      // 3. Fetch all customers
      const custsRes = await directusFetchAllPages(
        '/items/customers?fields=id,company_name,next_followup_date',
        {},
        100000
      );
      const allCustomers = custsRes.data || [];
      totalCustomers = allCustomers.length;

      // 4. Identify mismatches
      const patchMap = new Map<string, any>();
      for (const cust of allCustomers) {
        if (!cust || !cust.id) continue;
        const strId = String(cust.id);
        const latestRep = latestReportByCustId.get(strId);

        if (latestRep) {
          const repFollowup = latestRep.next_followup_date
            ? new Date(latestRep.next_followup_date).toISOString()
            : null;
          const custFollowup = cust.next_followup_date
            ? new Date(cust.next_followup_date).toISOString()
            : null;

          if (repFollowup !== custFollowup) {
            patchMap.set(strId, {
              id: cust.id,
              next_followup_date: repFollowup,
              date_updated: nowIso,
            });
          }
        }
      }

      // 5. Batch patch mismatched customers in Directus
      if (patchMap.size > 0) {
        console.log(`[AlphaDesk] Found ${patchMap.size} customer followup date mismatches in Directus. Patching...`);
        await directusSafeBatchPatch('customers', patchMap, 50);
        updatedCount = patchMap.size;
        console.log(`[AlphaDesk] Successfully patched ${updatedCount} customers with their latest report followup date.`);
        invalidateCustomersCache();
      } else {
        console.log('[AlphaDesk] All customers in Directus are already in sync with their latest reports.');
      }
    }

    // Also synchronize in-memory fallback store
    const localReportsSorted = [...reportsData].sort(
      (a, b) => new Date(b.date_created || 0).getTime() - new Date(a.date_created || 0).getTime()
    );
    const localLatestByCust = new Map<string, any>();
    for (const r of localReportsSorted) {
      const cId = String(r.customer_id || '');
      if (cId && !localLatestByCust.has(cId)) {
        localLatestByCust.set(cId, r);
      }
    }

    for (const c of customersData) {
      const lr = localLatestByCust.get(String(c.id));
      if (lr) {
        const repDate = lr.next_followup_date ? new Date(lr.next_followup_date).toISOString() : null;
        c.next_followup_date = repDate;
      }
    }

    return { totalCustomers, updatedCount };
  } catch (err: any) {
    console.error('[AlphaDesk] Error syncing customer followups from latest reports:', err.message);
    return { totalCustomers, updatedCount, error: err.message };
  } finally {
    isSyncingFollowups = false;
  }
}

export async function repairMismatchedCustomerTenants(): Promise<{ repairedCount: number }> {
  if (!directusUrl || !directusAdminToken || personnelData.length === 0) {
    return { repairedCount: 0 };
  }

  try {
    // Build fast lookup of personnel -> numeric tenant_id (only non-default specific tenants > 1)
    const personnelTenantMap = new Map<string, number>();
    for (const p of personnelData) {
      if (!p) continue;
      const tNum = resolveDirectusTenantId(p.tenant_id);
      if (tNum && tNum > 1) {
        if (p.id) {
          const cleanId = String(p.id).trim().toLowerCase();
          personnelTenantMap.set(cleanId, tNum);
          const rawId = cleanId.replace(/^p-/, '');
          if (rawId) {
            personnelTenantMap.set(rawId, tNum);
            personnelTenantMap.set(`p-${rawId}`, tNum);
          }
        }
        if (p.user_id) {
          personnelTenantMap.set(String(p.user_id).trim().toLowerCase(), tNum);
        }
      }
    }

    if (personnelTenantMap.size === 0) {
      return { repairedCount: 0 };
    }

    const candidatesRes = await directusFetchAllPages(
      '/items/customers?filter[_or][0][tenant_id][_eq]=1&filter[_or][1][tenant_id][_null]=true&fields=id,tenant_id,assigned_marketer_id',
      {},
      5000
    ).catch(() => null);

    const candidates = candidatesRes?.data || [];
    if (candidates.length === 0) {
      return { repairedCount: 0 };
    }

    const patchMap = new Map<string, any>();
    for (const cust of candidates) {
      if (!cust || !cust.id || !cust.assigned_marketer_id) continue;
      const mKey = String(cust.assigned_marketer_id).trim().toLowerCase();
      const targetTenant = personnelTenantMap.get(mKey);
      if (targetTenant && targetTenant > 1) {
        patchMap.set(String(cust.id), {
          id: cust.id,
          tenant_id: targetTenant,
        });
      }
    }

    if (patchMap.size > 0) {
      console.log(`[AlphaDesk] Repairing ${patchMap.size} customer(s) with mismatched default tenant_id...`);
      await directusSafeBatchPatch('customers', patchMap, 50);
      invalidateCustomersCache();
      console.log(`[AlphaDesk] Successfully repaired tenant_id on ${patchMap.size} customer(s).`);
    }

    return { repairedCount: patchMap.size };
  } catch (err: any) {
    console.warn('[AlphaDesk] Tenant repair warning:', err?.message || err);
    return { repairedCount: 0 };
  }
}

export function normalizeSmsPhoneDigits(input: string): string {
  const ascii = String(input || '')
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632))
    .replace(/[\s\-_()]/g, '')
    .trim();

  if (!ascii) return '';

  let normalized = ascii.replace(/^(\+98|0098)/, '0');
  if (/^98(9\d{9})$/.test(normalized)) {
    normalized = '0' + normalized.slice(2);
  } else if (/^9\d{9}$/.test(normalized)) {
    normalized = '0' + normalized;
  }

  return normalized;
}

export function parseSmsPhones(raw: any): string[] {
  if (!raw) return [];
  let items: string[] = [];
  if (Array.isArray(raw)) {
    items = raw.map((item) => String(item ?? '').trim());
  } else if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          items = parsed.map((item) => String(item ?? '').trim());
        } else {
          items = trimmed.split(/[,،\n;]+/);
        }
      } catch {
        items = trimmed.split(/[,،\n;]+/);
      }
    } else {
      items = trimmed.split(/[,،\n;]+/);
    }
  } else {
    items = [String(raw).trim()];
  }

  return Array.from(
    new Set(
      items
        .map((s) => normalizeSmsPhoneDigits(s))
        .filter((s) => s.length > 0)
    )
  );
}

export function extractDirectusTenantIdString(rawTenantId: any): string {
  if (typeof rawTenantId === 'object' && rawTenantId !== null) {
    return rawTenantId.id !== undefined && rawTenantId.id !== null ? String(rawTenantId.id).trim() : '';
  }
  if (rawTenantId !== undefined && rawTenantId !== null) {
    return String(rawTenantId).trim();
  }
  return '';
}

export async function syncDirectusTenantSettings(): Promise<void> {
  if (!directusUrl || !directusAdminToken) return;
  try {
    const res = await directusFetch('/items/tenant_settings?limit=200&sort=id');
    if (res && Array.isArray(res.data)) {
      tenantSettingsMap.clear();
      for (const item of res.data) {
        const tId = extractDirectusTenantIdString(item?.tenant_id);
        if (!tId) continue;
        const phones = parseSmsPhones(item.sms_phones);
        tenantSettingsMap.set(tId, {
          id: item.id !== undefined ? String(item.id) : `ts-${tId}`,
          tenant_id: tId,
          sms_phones: phones,
        });
      }
      console.log(`Directus tenant_settings synchronized (${res.data.length} records).`);
    }
  } catch (err: any) {
    console.warn('Could not sync tenant_settings from Directus:', err.message);
  }
}


