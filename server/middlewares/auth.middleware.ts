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
  const activeStr = String(activeTenantId).trim();
  const primaryId = tenantsData.length > 0 ? String(tenantsData[0].id) : '1';
  const primarySlug = tenantsData.length > 0 && tenantsData[0].slug ? String(tenantsData[0].slug) : '';
  const isActivePrimary =
    activeStr === 'default' ||
    activeStr === '1' ||
    activeStr === primaryId ||
    (Boolean(primarySlug) && activeStr === primarySlug);

  const itemStr =
    typeof itemTenantId === 'object' && itemTenantId !== null
      ? String(itemTenantId.id ?? '')
      : itemTenantId !== null && itemTenantId !== undefined
      ? String(itemTenantId).trim()
      : '';

  if (itemStr === 'all') return true;
  // Legacy records without tenant_id belong to the primary/default organization only
  if (itemStr === '' || itemStr === 'null' || itemStr === 'undefined') {
    return isActivePrimary;
  }
  if (itemStr === activeStr) return true;

  if (isActivePrimary) {
    if (
      itemStr === 'default' ||
      itemStr === '1' ||
      itemStr === primaryId ||
      (Boolean(primarySlug) && itemStr === primarySlug)
    ) {
      return true;
    }
  }

  const activeTenant = tenantsData.find(
    (t) => String(t.id) === activeStr || (t.slug && t.slug === activeStr)
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


export const WORKDAY_CUTOFF_HOUR = 4;

export function getTehranWorkdayKey(
  timestampMs: number = Date.now(),
  timeZone = 'Asia/Tehran',
  cutoffHour: number = WORKDAY_CUTOFF_HOUR
): string {
  const safeTs = !timestampMs || isNaN(timestampMs) ? Date.now() : timestampMs;
  const shiftedDate = new Date(safeTs - cutoffHour * 60 * 60 * 1000);

  try {
    const dtf = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return dtf.format(shiftedDate);
  } catch {
    return `${shiftedDate.getFullYear()}-${String(shiftedDate.getMonth() + 1).padStart(2, '0')}-${String(
      shiftedDate.getDate()
    ).padStart(2, '0')}`;
  }
}

export function isSessionFromPreviousDay(sessionIat: number, timeZone = 'Asia/Tehran'): boolean {
  if (!sessionIat || sessionIat <= 0 || isNaN(sessionIat)) return false;
  const sessionDate = new Date(sessionIat);
  if (isNaN(sessionDate.getTime())) return false;
  return getTehranWorkdayKey(sessionIat, timeZone) !== getTehranWorkdayKey(Date.now(), timeZone);
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
  const isDayExpired = false;
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

  const isDirectusSystemAdmin = Boolean(
    DIRECTUS_ADMIN_ROLE_IDS.includes(roleId)
  );

  const emailMw = (pMatch?.email || userEmail || '').toLowerCase().trim();
  const usernameMw = (pMatch?.username || '').toLowerCase().trim();
  const isMwMasterAdmin = emailMw.includes('kiani') || emailMw === 'kiani@company.ir' || usernameMw === 'kiani' || String(pMatch?.id) === 'p-1';

  // System admin or personnel with admin role
  const isSystemAdmin = Boolean(
    hasUserContext && (isMwMasterAdmin || pMatch?.role === 'admin' || (!pMatch && isDirectusSystemAdmin))
  );

  // Enforce strict tenant isolation server-side: non-admins can ONLY access their own organization
  let effectiveTenantId = tenantId;
  if (hasUserContext && !isSystemAdmin) {
    const assignedTid = pMatch?.tenant_id ? String(pMatch.tenant_id).trim() : '';
    if (assignedTid && assignedTid !== 'all') {
      effectiveTenantId = assignedTid;
    } else {
      effectiveTenantId = tenantsData.length > 0 ? String(tenantsData[0].id) : '1';
    }
  }

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
    tenantId: effectiveTenantId,
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

  if (user.isInactive) {
    return res.status(403).json({
      error: 'ACCOUNT_INACTIVE',
      message: 'حساب کاربری شما توسط مدیریت غیرفعال شده است و امکان استفاده از سامانه را ندارید. لطفاً با مدیر سیستم تماس بگیرید.',
    });
  }

  next();
}
