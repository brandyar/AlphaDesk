import { Request } from 'express';
import {
  directusUrl,
  tenantsData,
  personnelData,
  globalSessionRevocationTimestamp,
  DIRECTUS_ADMIN_ROLE_IDS,
} from '../config.ts';
import { RequestUserContext } from '../types.ts';

export function matchesTenant(itemTenantId: any, activeTenantId: string): boolean {
  if (!activeTenantId || activeTenantId === 'all') return true;
  const itemStr =
    typeof itemTenantId === 'object' && itemTenantId !== null
      ? String(itemTenantId.id)
      : itemTenantId !== null && itemTenantId !== undefined
      ? String(itemTenantId)
      : 'all';

  if (itemStr === 'all' || itemStr === 'null' || itemStr === 'undefined' || itemStr === '') return true;
  if (itemStr === activeTenantId) return true;
  if (activeTenantId === 'default' || activeTenantId === '1') {
    if (itemStr === 'default' || itemStr === '1') return true;
    if (tenantsData.length > 0) {
      if (
        itemStr === String(tenantsData[0].id) ||
        (tenantsData[0].slug && itemStr === tenantsData[0].slug)
      ) {
        return true;
      }
    }
  }
  const activeTenant = tenantsData.find(
    (t) => String(t.id) === activeTenantId || t.slug === activeTenantId
  );
  if (activeTenant) {
    if (itemStr === String(activeTenant.id) || (activeTenant.slug && itemStr === activeTenant.slug)) {
      return true;
    }
  }
  return false;
}

export function getRequestTenantId(req: Request): string {
  const headerTenant = req.headers['x-tenant-id'];
  if (headerTenant && typeof headerTenant === 'string' && headerTenant.trim()) {
    return headerTenant.trim();
  }
  const queryTenant = req.query.tenant_id;
  if (queryTenant && typeof queryTenant === 'string' && queryTenant.trim()) {
    return queryTenant.trim();
  }
  return 'all';
}

export function safeDecodeURIComponent(str?: string | null): string {
  if (!str) return '';
  try {
    return decodeURIComponent(str);
  } catch {
    return String(str);
  }
}

export function formatAvatarUrl(avatar: string | null | undefined): string | undefined {
  if (!avatar || typeof avatar !== 'string') return undefined;
  const trimmed = avatar.trim();
  if (!trimmed) return undefined;
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:')
  ) {
    return trimmed;
  }
  if (directusUrl) {
    const cleanBase = directusUrl.replace(/\/$/, '');
    if (trimmed.startsWith('/assets/')) return `${cleanBase}${trimmed}`;
    if (trimmed.startsWith('/')) return `${cleanBase}${trimmed}`;
    return `${cleanBase}/assets/${trimmed}`;
  }
  if (trimmed.startsWith('/')) return trimmed;
  return `/api/assets/${trimmed}`;
}

export function getRequestUser(req: Request): RequestUserContext {
  const userId =
    (req.headers['x-user-id'] as string) || (req.query.user_id as string) || '';
  const personnelId =
    (req.headers['x-personnel-id'] as string) ||
    (req.query.personnel_id as string) ||
    userId;
  const userRole =
    (req.headers['x-user-role'] as string) || (req.query.user_role as string) || '';
  const roleId =
    (req.headers['x-role-id'] as string) || (req.query.role_id as string) || '';
  const rawUserName = req.headers['x-user-name'] as string;
  let userName = safeDecodeURIComponent(rawUserName);
  const userEmail = (req.headers['x-user-email'] as string) || '';
  const tenantId = getRequestTenantId(req);

  const rawSessionIat = req.headers['x-session-iat'] as string;
  const sessionIat = rawSessionIat ? parseInt(rawSessionIat, 10) : 0;
  const isSessionRevoked = Boolean(
    globalSessionRevocationTimestamp > 0 &&
      (!sessionIat || sessionIat < globalSessionRevocationTimestamp)
  );

  const cleanPId = personnelId ? String(personnelId).trim().toLowerCase() : '';
  const rawUid = cleanPId.replace(/^p-/, '');
  const cleanUId = userId ? String(userId).trim().toLowerCase() : '';
  const cleanEmail = userEmail ? userEmail.trim().toLowerCase() : '';

  const pMatch = personnelData.find(
    (p) =>
      (cleanPId &&
        (p.id?.toLowerCase() === cleanPId || p.id?.toLowerCase() === `p-${rawUid}`)) ||
      (cleanUId &&
        (p.user_id?.toLowerCase() === cleanUId || p.id?.toLowerCase() === cleanUId)) ||
      (cleanEmail && p.email?.toLowerCase() === cleanEmail)
  );

  if (!userName && pMatch?.name) {
    userName = pMatch.name;
  }

  const hasUserContext = Boolean(
    (userId || personnelId || userEmail || req.headers['authorization']) &&
      !isSessionRevoked
  );

  const resolvedRole = userRole || pMatch?.role || '';
  const isAdmin = Boolean(
    hasUserContext &&
      (resolvedRole === 'admin' ||
       resolvedRole === 'sales_manager' ||
       userRole === 'admin' ||
       userRole === 'sales_manager' ||
       pMatch?.role === 'admin' ||
       pMatch?.role === 'sales_manager' ||
       DIRECTUS_ADMIN_ROLE_IDS.includes(roleId))
  );

  return {
    userId: isSessionRevoked ? '' : userId,
    personnelId: isSessionRevoked ? '' : personnelId,
    userRole: isAdmin ? (pMatch?.role === 'sales_manager' ? 'sales_manager' : 'admin') : resolvedRole || 'marketer',
    roleId,
    isAdmin,
    userName: isSessionRevoked ? '' : userName,
    userEmail: isSessionRevoked ? '' : userEmail,
    tenantId,
    isAuthenticated: hasUserContext,
    isSessionRevoked,
  };
}

export function isCentralAdmin(req: Request): boolean {
  const user = getRequestUser(req);
  if (!user.isAdmin) return false;
  return user.tenantId === 'all' || user.tenantId === 'default' || user.tenantId === '1';
}
