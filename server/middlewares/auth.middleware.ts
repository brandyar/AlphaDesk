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

export function formatAvatarUrl(avatar: any): string | undefined {
  if (!avatar) return undefined;
  let raw = '';
  if (typeof avatar === 'object' && avatar !== null) {
    raw = avatar.id || avatar.url || avatar.filename_disk || '';
  } else if (typeof avatar === 'string') {
    raw = avatar.trim();
  }
  if (!raw) return undefined;

  // Base64 data URLs
  if (raw.startsWith('data:')) return raw;

  // Already our authenticated API proxy
  if (raw.startsWith('/api/assets/')) return raw;

  // Relative /assets/ path -> route to /api/assets/
  if (raw.startsWith('/assets/')) return `/api${raw}`;

  // If a full URL contains /assets/<uuid> (e.g. from internal directusUrl or direct link)
  // route through our authenticated proxy so client browsers don't get 403 or network errors
  const directusAssetsMatch = raw.match(/\/assets\/([a-zA-Z0-9\-_]+)/);
  if (directusAssetsMatch && directusAssetsMatch[1]) {
    return `/api/assets/${directusAssetsMatch[1]}`;
  }

  // External URLs (e.g. external CDN, gravatar, ui-avatars)
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    return raw;
  }

  // Other relative paths
  if (raw.startsWith('/')) return raw;

  // Raw Directus file UUID string (e.g. 68f9b7c8-4720-4c57-...)
  return `/api/assets/${raw}`;
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
  const rawUid = cleanPId ? cleanPId.replace(/^p-/, '') : '';
  const cleanUId = userId ? String(userId).trim().toLowerCase() : '';
  const cleanEmail = userEmail ? String(userEmail).trim().toLowerCase() : '';

  const pMatch = personnelData.find((p) => {
    if (!p) return false;
    const pId = p.id ? String(p.id).trim().toLowerCase() : '';
    const pUserId = p.user_id ? String(p.user_id).trim().toLowerCase() : '';
    const pEmail = p.email ? String(p.email).trim().toLowerCase() : '';

    if (cleanPId && pId && pId === cleanPId) return true;
    if (cleanPId && rawUid && pId && (pId === `p-${rawUid}` || pId === rawUid)) return true;
    if (cleanUId && pUserId && pUserId === cleanUId) return true;
    if (cleanUId && pId && pId === cleanUId) return true;
    if (cleanEmail && pEmail && pEmail === cleanEmail) return true;

    return false;
  });

  if (!userName && pMatch?.name) {
    userName = pMatch.name;
  }

  // Check if personnel account is inactive/suspended
  const isInactive = Boolean(
    pMatch && (pMatch.status === 'inactive' || pMatch.active === false)
  );

  const hasUserContext = Boolean(
    (userId || personnelId || userEmail || req.headers['authorization']) &&
      !isSessionRevoked &&
      !isInactive
  );

  const resolvedRole = pMatch?.role || userRole || '';
  const isDirectusSystemAdmin = Boolean(
    DIRECTUS_ADMIN_ROLE_IDS.includes(roleId) || userRole === 'admin'
  );

  // System admin (global admin or personnel with admin role)
  const isSystemAdmin = Boolean(
    hasUserContext &&
      (isDirectusSystemAdmin || userRole === 'admin' || pMatch?.role === 'admin')
  );

  // Personnel-level admin/manager (admin or sales_manager)
  const isPersonnelAdmin = Boolean(
    hasUserContext &&
      (isSystemAdmin || pMatch?.role === 'sales_manager')
  );

  // Customer visibility rule: Admin OR explicitly enabled in permissions OR sales manager (unless explicitly disabled)
  const canViewAllCustomers = Boolean(
    isSystemAdmin ||
      pMatch?.permissions?.can_view_all_customers === true ||
      (pMatch?.role === 'sales_manager' && pMatch?.permissions?.can_view_all_customers !== false)
  );

  // Administrative report view scope
  const reportViewScope: 'all' | 'own_only' | 'specific_personnel' =
    isSystemAdmin
      ? 'all'
      : (pMatch?.permissions?.report_view_scope as any) ||
        (pMatch?.role === 'sales_manager' && pMatch?.permissions?.report_view_scope !== 'own_only' ? 'all' : 'own_only');

  const visibleReportPersonnelIds: string[] =
    pMatch?.permissions?.visible_report_personnel_ids || [];

  return {
    userId: isSessionRevoked || isInactive ? '' : userId,
    personnelId: isSessionRevoked || isInactive ? '' : personnelId,
    userRole: isPersonnelAdmin ? (pMatch?.role === 'sales_manager' ? 'sales_manager' : 'admin') : resolvedRole || 'marketer',
    roleId,
    isAdmin: isSystemAdmin,
    isPersonnelAdmin,
    canViewAllCustomers,
    reportViewScope,
    visibleReportPersonnelIds,
    userName: isSessionRevoked || isInactive ? '' : userName,
    userEmail: isSessionRevoked || isInactive ? '' : userEmail,
    tenantId,
    isAuthenticated: hasUserContext,
    isSessionRevoked,
    isInactive,
  };
}

export function isCentralAdmin(req: Request): boolean {
  const user = getRequestUser(req);
  if (!user.isAdmin) return false;
  return user.tenantId === 'all' || user.tenantId === 'default' || user.tenantId === '1';
}

export function checkInactivePersonnel(req: Request, res: any, next: any) {
  // Allow health checks, login, and static assets
  const path = req.path || '';
  if (
    path.startsWith('/health') ||
    path.startsWith('/api/health') ||
    path.startsWith('/api/auth/login') ||
    path.startsWith('/auth/login') ||
    path.startsWith('/api/assets') ||
    path.startsWith('/assets')
  ) {
    return next();
  }

  const user = getRequestUser(req);
  if (user.isInactive) {
    return res.status(403).json({
      error: 'ACCOUNT_INACTIVE',
      message: 'حساب کاربری شما توسط مدیریت غیرفعال شده است و امکان استفاده از سامانه را ندارید. لطفاً با مدیر سیستم تماس بگیرید.',
    });
  }

  next();
}
