import {
  directusUrl,
  directusAdminToken,
  customersData,
  setCustomersData,
  reportsData,
  tenantsData,
} from '../config';
import { fetchAllDirectusItems } from './client';

interface DataCache<T> {
  timestamp: number;
  data: T;
  meta?: any;
}

let customersCache: DataCache<any[]> | null = null;
let reportsCache: DataCache<any[]> | null = null;
const CACHE_TTL_MS = 300000; // 5 minutes cache

export function invalidateCustomersCache() {
  customersCache = null;
}

export function invalidateReportsCache() {
  reportsCache = null;
}

export async function ensureCustomersCache(forceRefresh = false): Promise<any[]> {
  const now = Date.now();
  if (!forceRefresh && customersCache && now - customersCache.timestamp < CACHE_TTL_MS) {
    return customersCache.data;
  }

  const items = await fetchAllDirectusItems(
    '/items/customers?sort=-date_created&fields=*',
    500,
    100000,
    3
  );
  if (items && items.length > 0) {
    customersCache = {
      timestamp: Date.now(),
      data: items,
      meta: { total_count: items.length },
    };
    return items;
  }
  return customersCache?.data || customersData;
}

export async function ensureReportsCache(forceRefresh = false): Promise<any[]> {
  const now = Date.now();
  if (!forceRefresh && reportsCache && now - reportsCache.timestamp < CACHE_TTL_MS) {
    return reportsCache.data;
  }

  const items = await fetchAllDirectusItems('/items/customer_reports?sort=-id', 500, 100000, 3);
  if (items && items.length > 0) {
    reportsCache = {
      timestamp: Date.now(),
      data: items,
      meta: { total_count: items.length },
    };
    return items;
  }
  return reportsCache?.data || reportsData;
}

export function computeCustomerExpiration(c: any): any {
  if (!c) return c;
  const isExpired = Boolean(
    c.assignment_deadline &&
      c.status !== 'قرارداد' &&
      c.status !== 'لیست سیاه' &&
      new Date().getTime() > new Date(c.assignment_deadline).getTime()
  );

  const rawTenant = c.tenant_id;
  const tId =
    typeof rawTenant === 'object' && rawTenant !== null
      ? String(rawTenant.id)
      : rawTenant !== null && rawTenant !== undefined
      ? String(rawTenant)
      : 'default';
  const tObj = tenantsData.find((t) => String(t.id) === tId || t.slug === tId);

  const contacts = Array.isArray(c.contacts) ? c.contacts : [];

  const rawMobiles = Array.isArray(c.mobile_numbers)
    ? c.mobile_numbers
    : typeof c.mobile_numbers === 'string'
    ? [c.mobile_numbers]
    : [];
  const mobileNumbers =
    rawMobiles.length > 0
      ? rawMobiles
      : contacts
          .filter((ct: any) => ct.channel_type === 'mobile')
          .map((ct: any) => ct.normalized_value || ct.value);

  const rawLandlines = Array.isArray(c.landline_numbers)
    ? c.landline_numbers
    : typeof c.landline_numbers === 'string'
    ? [c.landline_numbers]
    : [];
  const landlineNumbers =
    rawLandlines.length > 0
      ? rawLandlines
      : contacts
          .filter((ct: any) => ct.channel_type === 'landline')
          .map((ct: any) => ct.normalized_value || ct.value);

  const rawTelegram = Array.isArray(c.telegram_ids)
    ? c.telegram_ids
    : typeof c.telegram_ids === 'string'
    ? [c.telegram_ids]
    : [];
  const telegramIds =
    rawTelegram.length > 0
      ? rawTelegram
      : contacts
          .filter((ct: any) => ct.channel_type === 'telegram')
          .map((ct: any) => ct.value);

  const rawInstagram = Array.isArray(c.instagram_ids)
    ? c.instagram_ids
    : typeof c.instagram_ids === 'string'
    ? [c.instagram_ids]
    : [];
  const instagramIds =
    rawInstagram.length > 0
      ? rawInstagram
      : contacts
          .filter((ct: any) => ct.channel_type === 'instagram')
          .map((ct: any) => ct.value);

  const rawEmails = Array.isArray(c.emails)
    ? c.emails
    : typeof c.emails === 'string'
    ? [c.emails]
    : [];
  const emails =
    rawEmails.length > 0
      ? rawEmails
      : contacts
          .filter((ct: any) => ct.channel_type === 'email')
          .map((ct: any) => ct.value);

  const rawWebsites = Array.isArray(c.websites)
    ? c.websites
    : typeof c.websites === 'string'
    ? [c.websites]
    : [];
  const websites =
    rawWebsites.length > 0
      ? rawWebsites
      : contacts
          .filter((ct: any) => ct.channel_type === 'website')
          .map((ct: any) => ct.value);

  return {
    ...c,
    company_name: c.company_name || 'بدون نام',
    business_type: c.business_type || '',
    city: c.city || 'نامشخص',
    province: c.province || '',
    status: c.status || 'تماس برقرار نشده',
    assigned_marketer_name: c.assigned_marketer_name || 'تخصیص نیافته',
    mobile_numbers: mobileNumbers,
    landline_numbers: landlineNumbers,
    telegram_ids: telegramIds,
    instagram_ids: instagramIds,
    emails: emails,
    websites: websites,
    manager_phones: Array.isArray(c.manager_phones)
      ? c.manager_phones
      : typeof c.manager_phones === 'string'
      ? [c.manager_phones]
      : [],
    negotiator_phones: Array.isArray(c.negotiator_phones)
      ? c.negotiator_phones
      : typeof c.negotiator_phones === 'string'
      ? [c.negotiator_phones]
      : [],
    contacts: contacts,
    is_expired: isExpired,
    claimed_from_pool: Boolean(c.claimed_from_pool),
    claimed_from_pool_at: c.claimed_from_pool_at || null,
    tenant_id: tId,
    tenant_name:
      (typeof rawTenant === 'object' && rawTenant?.name) || (tObj ? tObj.name : 'سازمان مرکزی'),
  };
}

export function updateExpirationFlags() {
  setCustomersData(customersData.map((c) => computeCustomerExpiration(c)));
}

export const activeCustomerCreationLocks = new Set<string>();

export interface RecentCustomerCache {
  id: string;
  company_name: string;
  phones: string[];
  customer: any;
  timestamp: number;
}

export const recentCustomerCreations: RecentCustomerCache[] = [];
