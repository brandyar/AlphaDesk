import { Request } from 'express';
import {
  directusUrl,
  tenantsData,
  personnelData,
  globalSessionRevocationTimestamp,
  DIRECTUS_ADMIN_ROLE_IDS,
  latestAccessToken,
  setLatestAccessToken,
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

export function formatAvatarUrl(avatar: any, reqToken?: string): string | undefined {
  if (!avatar) return undefined;
  let raw = '';
  if (typeof avatar === 'object' && avatar !== null) {
    raw = avatar.id || avatar.filename_disk || avatar.filename_download || avatar.profile_image || avatar.avatar || avatar.url || '';
  } else if (typeof avatar === 'string') {
    raw = avatar.trim();
  }
  if (!raw) return undefined;

  // Strip wrapping quotes
  raw = raw.replace(/^["']+|["']+$/g, '').trim();
  if (!raw) return undefined;

  // Base64 data URLs
  if (raw.startsWith('data:')) return raw;

  // Strip access_token query param
  raw = raw.replace(/([?&])access_token=[^&]+(&|$)/, '$1').replace(/[?&]$/, '');

  let cleanId = raw;
  const directusAssetsMatch = cleanId.match(/\/assets\/([a-zA-Z0-9\-_.]+)/);
  if (directusAssetsMatch && directusAssetsMatch[1]) {
    cleanId = directusAssetsMatch[1];
  } else if (cleanId.startsWith('https://api.alphadesk.ir/assets/')) {
    cleanId = cleanId.replace('https://api.alphadesk.ir/assets/', '');
  } else if (cleanId.startsWith('http://api.alphadesk.ir/assets/')) {
    cleanId = cleanId.replace('http://api.alphadesk.ir/assets/', '');
  } else if (cleanId.startsWith('/assets/')) {
    cleanId = cleanId.replace('/assets/', '');
  } else if (cleanId.startsWith('/api/assets/')) {
    cleanId = cleanId.replace('/api/assets/', '');
  }

  cleanId = cleanId.split('?')[0].split('#')[0];

  // External non-Directus URLs
  if ((cleanId.startsWith('http://') || cleanId.startsWith('https://')) && !cleanId.includes('alphadesk.ir')) {
    return cleanId;
  }

  // Other relative paths
  if (cleanId.startsWith('/') && !cleanId.startsWith('/api/assets/')) {
    return cleanId;
  }

  // Route through BFF proxy /api/assets/:id
  if (cleanId) {
    return `/api/assets/${cleanId}`;
  }

  return undefined;
}

export function extractFileId(avatar: any): string | null {
  if (!avatar) return null;
  if (typeof avatar === 'object' && avatar !== null) {
    return avatar.id || avatar.filename_disk || avatar.filename_download || avatar.fileId || avatar.profile_image || avatar.avatar || null;
  }
  if (typeof avatar !== 'string') return null;
  let str = avatar.trim().replace(/^["']+|["']+$/g, '').trim();
  if (!str) return null;
  if (str.startsWith('data:')) return null;
  const match = str.match(/\/api\/assets\/([a-zA-Z0-9\-_.]+)/) || str.match(/\/assets\/([a-zA-Z0-9\-_.]+)/);
  if (match && match[1]) return match[1];
  if (!str.startsWith('http://') && !str.startsWith('https://') && !str.startsWith('/')) {
    return str;
  }
  return null;
}

export function resolveUserAvatar(user?: any, personnel?: any): string {
  if (!user && !personnel) return '';
  const candidate =
    personnel?.profile_image ||
    user?.profile_image ||
    personnel?.avatar ||
    user?.avatar ||
    (typeof user === 'string' ? user : '') ||
    '';
  return formatAvatarUrl(candidate) || '';
}


export function isSessionFromPreviousDay(sessionIat: number, timeZone = 'Asia/Tehran'): boolean {
  if (!sessionIat || sessionIat <= 0 || isNaN(sessionIat)) return false;
  const now = new Date();
  const sessionDate = new Date(sessionIat);
  if (isNaN(sessionDate.getTime())) return false;

  try {
    const dtf = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const todayStr = dtf.format(now);
    const sessionDayStr = dtf.format(sessionDate);
    return sessionDayStr !== todayStr;
  } catch {
    const todayLocal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const sessionLocal = `${sessionDate.getFullYear()}-${String(sessionDate.getMonth() + 1).padStart(2, '0')}-${String(sessionDate.getDate()).padStart(2, '0')}`;
    return sessionLocal !== todayLocal;
  }
}

export function getRequestUser(req: Request): RequestUserContext {
  const reqAuth = (req.headers['authorization'] as string) || '';
  if (reqAuth) {
    const token = reqAuth.replace(/^Bearer\s+/i, '').trim();
    if (token) setLatestAccessToken(token);
  }

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
  const isDayExpired = Boolean(sessionIat > 0 && isSessionFromPreviousDay(sessionIat));
  const isSessionRevoked = Boolean(
    isDayExpired ||
    (globalSessionRevocationTimestamp > 0 &&
      (!sessionIat || sessionIat < globalSessionRevocationTimestamp))
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

  const isDirectusSystemAdmin = Boolean(
    DIRECTUS_ADMIN_ROLE_IDS.includes(roleId)
  );

  const emailMw = (pMatch?.email || userEmail || '').toLowerCase().trim();
  const usernameMw = (pMatch?.username || '').toLowerCase().trim();
  const isMwMasterAdmin = emailMw.includes('kiani') || emailMw === 'kiani@company.ir' || usernameMw === 'kiani' || String(pMatch?.id) === 'p-1';

  // System admin or personnel with admin role
  const isSystemAdmin = Boolean(
    hasUserContext && (isMwMasterAdmin || pMatch?.role === 'admin')
  );

  // Personnel-level admin/manager (admin or sales_manager)
  const isPersonnelAdmin = Boolean(
    hasUserContext &&
      (isSystemAdmin || pMatch?.role === 'admin' || pMatch?.role === 'sales_manager')
  );

  // Customer visibility rule: Admin OR sales manager OR explicitly enabled in permissions
  const canViewAllCustomers = Boolean(
    isSystemAdmin ||
      pMatch?.role === 'admin' ||
      pMatch?.role === 'sales_manager' ||
      pMatch?.permissions?.can_view_all_customers === true
  );

  // Administrative report view scope
  const reportViewScope: 'all' | 'own_only' | 'specific_personnel' =
    isSystemAdmin || pMatch?.role === 'admin' || pMatch?.role === 'sales_manager'
      ? (pMatch?.permissions?.report_view_scope as any) || 'all'
      : (pMatch?.permissions?.report_view_scope as any) || 'own_only';

  const visibleReportPersonnelIds: string[] =
    pMatch?.permissions?.visible_report_personnel_ids || [];

  return {
    userId: isSessionRevoked || isInactive ? '' : userId,
    personnelId: isSessionRevoked || isInactive ? '' : personnelId,
    userRole: pMatch ? pMatch.role : (userRole || 'marketer'),
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
    isDayExpired,
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
  if (user.isDayExpired) {
    return res.status(401).json({
      error: 'SESSION_EXPIRED',
      message: 'نشست کاری شما با پایان روز کاری منقضی شده است. لطفاً مجدداً وارد شوید.',
    });
  }

  if (user.isInactive) {
    return res.status(403).json({
      error: 'ACCOUNT_INACTIVE',
      message: 'حساب کاربری شما توسط مدیریت غیرفعال شده است و امکان استفاده از سامانه را ندارید. لطفاً با مدیر سیستم تماس بگیرید.',
    });
  }

  next();
}
