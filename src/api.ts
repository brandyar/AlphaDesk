import {
  Customer,
  CustomerContact,
  DuplicateCheckResult,
  ChannelType,
  CustomerReport,
  ColdLead,
  AdministrativeReport,
  Personnel,
  BffStatus,
  LeadStatus,
  AuthUser,
  AuthResponse,
  RegisterPayload,
  LeaveRequest,
  SalaryAdvanceRequest,
  UserProfileUpdatePayload,
  PasswordChangePayload,
  CreateColleaguePayload,
  ProjectSettings,
  Tenant,
} from './types';

const BASE_URL = '/api';

const AUTH_STORAGE_KEY = 'crm_auth_session';
const TENANT_STORAGE_KEY = 'crm_active_tenant_id';

let currentPersonnelContext: Personnel | null = null;
let currentAuthUser: AuthUser | null = null;
let currentAuthToken: string = '';
let currentTenantId: string = 'all';

// Load initial stored auth session & tenant if available
try {
  const savedTenant = localStorage.getItem(TENANT_STORAGE_KEY);
  if (savedTenant) {
    currentTenantId = savedTenant;
  }
} catch {}

let currentSessionIat: number = Date.now();

try {
  const saved = localStorage.getItem(AUTH_STORAGE_KEY);
  if (saved) {
    const parsed = JSON.parse(saved);
    currentAuthToken = parsed.access_token || '';
    currentAuthUser = parsed.user || null;
    currentPersonnelContext = parsed.personnel || null;
    currentSessionIat = parsed.session_iat || Date.now();
    if (parsed.user?.tenant_id && !localStorage.getItem(TENANT_STORAGE_KEY)) {
      currentTenantId = parsed.user.tenant_id;
    }
  }
} catch {}

export function getActiveTenantId(): string {
  return currentTenantId || 'all';
}

export function setActiveTenantId(id: string) {
  currentTenantId = id || 'all';
  try {
    localStorage.setItem(TENANT_STORAGE_KEY, currentTenantId);
  } catch {}
}

export function setApiPersonnelContext(p: Personnel | null) {
  currentPersonnelContext = p;
}

export function getApiPersonnelContext(): Personnel | null {
  return currentPersonnelContext;
}

export function getStoredAuthSession(): { user: AuthUser | null; personnel: Personnel | null; token: string; sessionIat: number } {
  return {
    user: currentAuthUser,
    personnel: currentPersonnelContext,
    token: currentAuthToken,
    sessionIat: currentSessionIat,
  };
}

export function saveAuthSession(data: AuthResponse) {
  currentAuthToken = data.access_token || '';
  currentAuthUser = data.user || null;
  currentPersonnelContext = data.personnel || null;
  currentSessionIat = Date.now();
  const sessionToSave = { ...data, session_iat: currentSessionIat };
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sessionToSave));
  } catch {}
}

export function clearAuthSession() {
  currentAuthToken = '';
  currentAuthUser = null;
  currentPersonnelContext = null;
  currentSessionIat = 0;
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {}
}

function getBffHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = {
    ...customHeaders,
  };

  if (currentAuthToken) {
    headers['Authorization'] = `Bearer ${currentAuthToken}`;
  }

  if (currentSessionIat > 0) {
    headers['x-session-iat'] = String(currentSessionIat);
  }

  if (currentAuthUser) {
    headers['x-user-id'] = currentAuthUser.id;
    headers['x-user-role'] = currentAuthUser.app_role || (currentAuthUser.is_admin ? 'admin' : 'marketer');
    if (currentAuthUser.role_id) headers['x-role-id'] = currentAuthUser.role_id;
    headers['x-user-email'] = currentAuthUser.email;
    headers['x-user-name'] = encodeURIComponent(currentAuthUser.name);
  }

  if (currentPersonnelContext) {
    headers['x-personnel-id'] = currentPersonnelContext.id;
    if (!headers['x-user-role']) headers['x-user-role'] = currentPersonnelContext.role;
    if (!headers['x-user-name']) headers['x-user-name'] = encodeURIComponent(currentPersonnelContext.name);
  }

  const activeTenant = getActiveTenantId();
  if (activeTenant) {
    headers['x-tenant-id'] = activeTenant;
  }

  return headers;
}

async function handleResponse<T>(res: globalThis.Response, defaultErrorMsg: string): Promise<T> {
  if (!res.ok) {
    let errorMsg = defaultErrorMsg;
    let errCode = '';
    try {
      const data = await res.json();
      errorMsg = data.message || data.error || defaultErrorMsg;
      errCode = data.error || '';
    } catch {
      // ignore
    }

    if (
      res.status === 401 ||
      errCode === 'ALL_SESSIONS_REVOKED' ||
      errCode === 'ACCOUNT_INACTIVE' ||
      (res.status === 403 && (errorMsg.includes('غیرفعال') || errCode === 'ACCOUNT_INACTIVE'))
    ) {
      clearAuthSession();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('crm_force_logout', { detail: { message: errorMsg } }));
      }
    }

    throw new Error(errorMsg);
  }
  return res.json();
}

// ----------------- Auth API ----------------- //

export async function loginUser(identifier: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, email: identifier, username: identifier, phone: identifier, password }),
  });
  const data = await handleResponse<AuthResponse>(res, 'خطا در ورود به سامانه');
  if (data && data.success) {
    saveAuthSession(data);
  }
  return data;
}

export async function registerUser(payload: RegisterPayload): Promise<AuthResponse> {
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await handleResponse<AuthResponse>(res, 'خطا در ثبت نام کاربر');
  if (data && data.success) {
    saveAuthSession(data);
  }
  return data;
}

export async function getMe(): Promise<any> {
  const res = await fetch(`${BASE_URL}/auth/me`, {
    headers: getBffHeaders(),
  });
  return handleResponse(res, 'خطا در احراز هویت');
}

export async function logoutUser(): Promise<void> {
  clearAuthSession();
}

export async function logoutAllUsers(): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${BASE_URL}/auth/logout-all`, {
    method: 'POST',
    headers: getBffHeaders({ 'Content-Type': 'application/json' }),
  });
  const data = await handleResponse<{ success: boolean; message: string }>(res, 'خطا در خروج همگانی کاربران');
  clearAuthSession();
  return data;
}

// ----------------- Core BFF Data APIs ----------------- //

export async function fetchBffStatus(): Promise<BffStatus> {
  const res = await fetch(`${BASE_URL}/bff-status`, {
    headers: getBffHeaders(),
  });
  return handleResponse<BffStatus>(res, 'خطا در دریافت وضعیت سامانه');
}

export async function updateBffConfig(url: string, token: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/bff-config`, {
    method: 'POST',
    headers: getBffHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ url, token }),
  });
  return handleResponse(res, 'خطا در ذخیره تنظیمات سامانه');
}

export async function seedInitialData(): Promise<any> {
  const res = await fetch(`${BASE_URL}/seed-initial-data`, {
    method: 'POST',
    headers: getBffHeaders({ 'Content-Type': 'application/json' }),
  });
  return handleResponse(res, 'خطا در درج داده‌های اولیه در پایگاه داده');
}

export const seedDirectus = seedInitialData;

export async function fetchSystemSchema(): Promise<any> {
  const res = await fetch(`${BASE_URL}/system-schema`, {
    headers: getBffHeaders(),
  });
  return handleResponse(res, 'خطا در دریافت ساختار پایگاه داده');
}

export const fetchDirectusSchema = fetchSystemSchema;

export async function fetchPersonnel(): Promise<Personnel[]> {
  const res = await fetch(`${BASE_URL}/personnel`, {
    headers: getBffHeaders(),
  });
  return handleResponse<Personnel[]>(res, 'خطا در دریافت لیست پرسنل');
}

export interface PaginatedMeta {
  filter_count: number;
  total_count: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginatedMeta;
  total: number;
  filteredTotal: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function normalizePaginatedResponse<T>(resData: any, reqPage = 1, reqLimit = 25): PaginatedResult<T> {
  if (resData && Array.isArray(resData.data) && resData.meta) {
    const rawFC = resData.meta.filter_count ?? resData.meta.total_count;
    const filterCount =
      typeof rawFC === 'number' && !isNaN(rawFC)
        ? rawFC
        : !isNaN(Number(rawFC)) && rawFC !== null && rawFC !== undefined
        ? Number(rawFC)
        : resData.data.length;

    const rawTC = resData.meta.total_count ?? filterCount;
    const totalCount =
      typeof rawTC === 'number' && !isNaN(rawTC)
        ? rawTC
        : !isNaN(Number(rawTC)) && rawTC !== null && rawTC !== undefined
        ? Number(rawTC)
        : filterCount;

    const page = Number(resData.meta.page) || reqPage;
    const limit = Number(resData.meta.limit) || reqLimit;
    const totalPages =
      Number(resData.meta.total_pages) || Math.max(1, Math.ceil(filterCount / (limit || 25)));

    return {
      data: resData.data,
      meta: {
        filter_count: filterCount,
        total_count: totalCount,
        page,
        limit,
        total_pages: totalPages,
      },
      total: totalCount,
      filteredTotal: filterCount,
      page,
      limit,
      totalPages,
    };
  }

  const list = Array.isArray(resData) ? resData : (resData?.data && Array.isArray(resData.data)) ? resData.data : [];
  const filterCount = list.length;
  const totalPages = Math.max(1, Math.ceil(filterCount / (reqLimit || 25)));
  return {
    data: list,
    meta: {
      filter_count: filterCount,
      total_count: filterCount,
      page: reqPage,
      limit: reqLimit,
      total_pages: totalPages,
    },
    total: filterCount,
    filteredTotal: filterCount,
    page: reqPage,
    limit: reqLimit,
    totalPages,
  };
}

export interface DashboardSummary {
  total_customers: number;
  contracts_won_count: number;
  in_negotiation_count: number;
  expired_customers_count: number;
  total_reports_count: number;
  total_cold_leads_count: number;
  free_customers_count?: number;
  admin_reports_count?: number;
  total_contract_revenue: number;
  avg_negotiation_score: string | number;
  upcoming_followups: Customer[];
  urgent_expiring_customers: Customer[];
}

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const res = await fetch(`${BASE_URL}/dashboard-summary`, {
    headers: getBffHeaders(),
  });
  return handleResponse<DashboardSummary>(res, 'خطا در دریافت آمار خلاصه داشبورد');
}

export async function fetchCustomers(filters?: {
  search?: string;
  status?: string;
  marketer_id?: string;
  expired_only?: boolean;
  free_only?: boolean;
  page?: number;
  limit?: number;
  all?: boolean;
}): Promise<Customer[]> {
  const params = new URLSearchParams();
  if (filters?.search) params.append('search', filters.search);
  if (filters?.status) params.append('status', filters.status);
  if (filters?.marketer_id) params.append('marketer_id', filters.marketer_id);
  if (filters?.expired_only) params.append('expired_only', 'true');
  if (filters?.free_only) params.append('free_only', 'true');
  if (filters?.page) params.append('page', String(filters.page));
  if (filters?.limit !== undefined) params.append('limit', String(filters.limit));
  else params.append('limit', '25');
  if (filters?.all) params.append('all', 'true');

  const res = await fetch(`${BASE_URL}/customers?${params.toString()}`, {
    headers: getBffHeaders(),
  });
  const resData: any = await handleResponse(res, 'خطا در دریافت لیست مشتریان');
  if (Array.isArray(resData)) return resData;
  if (resData && Array.isArray(resData.data)) return resData.data;
  return [];
}

export async function fetchFreeCustomers(limit: number = 1000): Promise<Customer[]> {
  return fetchCustomers({ free_only: true, limit });
}

export async function fetchCustomersPaginated(filters?: {
  search?: string;
  status?: string;
  marketer_id?: string;
  expired_only?: boolean;
  free_only?: boolean;
  page?: number;
  limit?: number;
}): Promise<PaginatedResult<Customer>> {
  const params = new URLSearchParams();
  if (filters?.search) params.append('search', filters.search);
  if (filters?.status) params.append('status', filters.status);
  if (filters?.marketer_id) params.append('marketer_id', filters.marketer_id);
  if (filters?.expired_only) params.append('expired_only', 'true');
  if (filters?.free_only) params.append('free_only', 'true');
  params.append('page', String(filters?.page || 1));
  params.append('limit', String(filters?.limit || 25));

  const res = await fetch(`${BASE_URL}/customers?${params.toString()}`, {
    headers: getBffHeaders(),
  });
  const resData = await handleResponse<any>(res, 'خطا در دریافت لیست مشتریان');
  return normalizePaginatedResponse<Customer>(resData, filters?.page || 1, filters?.limit || 25);
}

export async function fetchCustomerById(id: string): Promise<Customer> {
  const res = await fetch(`${BASE_URL}/customers/${id}`, {
    headers: getBffHeaders(),
  });
  return handleResponse<Customer>(res, 'خطا در دریافت جزئیات پرونده مشتری');
}

export async function createCustomer(payload: Partial<Customer> & { assignment_duration_days?: number }): Promise<Customer> {
  const res = await fetch(`${BASE_URL}/customers`, {
    method: 'POST',
    headers: getBffHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  return handleResponse<Customer>(res, 'خطا در ایجاد پرونده مشتری در پایگاه داده');
}

export async function updateCustomer(id: string, payload: Partial<Customer>): Promise<Customer> {
  const res = await fetch(`${BASE_URL}/customers/${id}`, {
    method: 'PATCH',
    headers: getBffHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  return handleResponse<Customer>(res, 'خطا در بروزرسانی پرونده مشتری در پایگاه داده');
}

export async function deleteCustomer(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/customers/${id}`, {
    method: 'DELETE',
    headers: getBffHeaders(),
  });
  if (!res.ok) {
    let errorMsg = 'خطا در حذف پرونده مشتری از سیستم';
    try {
      const data = await res.json();
      errorMsg = data.message || data.error || errorMsg;
    } catch {}
    throw new Error(errorMsg);
  }
}

export async function reassignCustomer(
  id: string,
  newMarketerId: string,
  newMarketerName: string,
  durationDays: number
): Promise<Customer> {
  const res = await fetch(`${BASE_URL}/customers/${id}/reassign`, {
    method: 'POST',
    headers: getBffHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      new_marketer_id: newMarketerId,
      new_marketer_name: newMarketerName,
      duration_days: durationDays,
    }),
  });
  return handleResponse<Customer>(res, 'خطا در واگذاری مجدد مشتری در سیستم');
}

export async function claimFreeCustomer(
  id: string,
  options?: {
    personnel_id?: string;
    personnel_name?: string;
    duration_days?: number;
    claim_limit?: number;
  }
): Promise<{ success: boolean; message: string; customer: Customer }> {
  const res = await fetch(`${BASE_URL}/customers/${id}/claim-free`, {
    method: 'POST',
    headers: getBffHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(options || {}),
  });
  return handleResponse<{ success: boolean; message: string; customer: Customer }>(
    res,
    'خطا در اختصاص پرونده آزاد'
  );
}

export async function fetchFreeCustomersQuota(personnelId?: string, limit = 20): Promise<{
  claimLimit: number;
  activeUnclosedCount: number;
  successfulCount: number;
  canClaim: boolean;
  remainingQuota: number;
  requiresSuccessToUnlock: boolean;
}> {
  const params = new URLSearchParams();
  if (personnelId) params.append('personnel_id', personnelId);
  if (limit) params.append('limit', String(limit));

  const res = await fetch(`${BASE_URL}/customers/free-quota?${params.toString()}`, {
    headers: getBffHeaders(),
  });
  return handleResponse(res, 'خطا در دریافت وضعیت سهمیه برداشت مشتریان آزاد');
}

export async function mergeCustomers(
  primaryCustomerId: string,
  mergedCustomerIds: string[],
  assignedMarketerId?: string,
  assignedMarketerName?: string,
  notes?: string
): Promise<{ success: boolean; message: string; customer: Customer }> {
  const res = await fetch(`${BASE_URL}/customers/merge`, {
    method: 'POST',
    headers: getBffHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      primary_customer_id: primaryCustomerId,
      merged_customer_ids: mergedCustomerIds,
      assigned_marketer_id: assignedMarketerId,
      assigned_marketer_name: assignedMarketerName,
      notes,
    }),
  });
  return handleResponse<{ success: boolean; message: string; customer: Customer }>(res, 'خطا در ادغام پرونده‌های مشتریان');
}

export async function checkDuplicateContact(
  value: string,
  channelType?: ChannelType,
  customerId?: string
): Promise<DuplicateCheckResult> {
  if (!value || value.trim().length < 3) return { isDuplicate: false };
  const params = new URLSearchParams({ value: value.trim() });
  if (channelType) params.append('channel_type', channelType);
  if (customerId) params.append('customer_id', customerId);

  const res = await fetch(`${BASE_URL}/contacts/check-duplicate?${params.toString()}`, {
    headers: getBffHeaders(),
  });
  return handleResponse<DuplicateCheckResult>(res, 'خطا در بررسی یکتایی شماره تماس');
}

export async function fetchCustomerContacts(customerId?: string): Promise<CustomerContact[]> {
  const q = customerId ? `?customer_id=${encodeURIComponent(customerId)}` : '';
  const res = await fetch(`${BASE_URL}/contacts${q}`, {
    headers: getBffHeaders(),
  });
  return handleResponse<CustomerContact[]>(res, 'خطا در دریافت لیست اطلاعات تماس');
}

export async function createCustomerContact(payload: Partial<CustomerContact>): Promise<CustomerContact> {
  const res = await fetch(`${BASE_URL}/contacts`, {
    method: 'POST',
    headers: getBffHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  return handleResponse<CustomerContact>(res, 'خطا در ثبت شماره تماس در پایگاه داده');
}

export async function updateCustomerContact(id: string, payload: Partial<CustomerContact>): Promise<CustomerContact> {
  const res = await fetch(`${BASE_URL}/contacts/${id}`, {
    method: 'PATCH',
    headers: getBffHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  return handleResponse<CustomerContact>(res, 'خطا در بروزرسانی شماره تماس در پایگاه داده');
}

export async function deleteCustomerContact(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/contacts/${id}`, {
    method: 'DELETE',
    headers: getBffHeaders(),
  });
  if (!res.ok) {
    let errorMsg = 'خطا در حذف شماره تماس از پایگاه داده';
    try {
      const data = await res.json();
      errorMsg = data.message || data.error || errorMsg;
    } catch {}
    throw new Error(errorMsg);
  }
}

export interface AnalyticsStatsResponse {
  totalReports: number;
  totalUniqueCustomers?: number;
  totalContracts: number;
  totalContractAmount: number;
  avgScore: string;
  statusBreakdown: Record<string, number>;
  personnelRanking: {
    personnelName: string;
    reportsCount: number;
    uniqueCustomersCount?: number;
    contractsCount: number;
    totalAmount: number;
    avgScore: string;
  }[];
}

export async function fetchAnalyticsStats(params: {
  startDate?: string;
  endDate?: string;
  negotiator?: string;
}): Promise<AnalyticsStatsResponse> {
  const qParams = new URLSearchParams();
  if (params.startDate) qParams.append('start_date', params.startDate);
  if (params.endDate) qParams.append('end_date', params.endDate);
  if (params.negotiator && params.negotiator !== 'all' && params.negotiator !== 'همه') {
    qParams.append('negotiator', params.negotiator);
  }

  const res = await fetch(`${BASE_URL}/analytics/stats?${qParams.toString()}`, {
    headers: getBffHeaders(),
  });
  return handleResponse<AnalyticsStatsResponse>(res, 'خطا در دریافت آمار تحلیلی');
}

export interface DailyReportStatItem {
  dateIso: string;
  dateJalali: string;
  dayName: string;
  reportsCount: number;
  scoresSum: number;
  scoresCount: number;
  contractsCount: number;
  contractsAmount: number;
  avgScore: string;
  statusCounts: Record<string, number>;
  uniqueCount?: number;
}

export interface DailyAnalyticsResponse {
  daysList: DailyReportStatItem[];
  totalReports: number;
  totalContracts: number;
  totalAmount: number;
  avgScore: string;
  activeDaysCount: number;
  avgPerActiveDay: string;
  peakDay?: DailyReportStatItem;
  totalAssignedCustomers?: number;
  totalUniqueCustomersTouched?: number;
}

export async function fetchAnalyticsDaily(params: {
  days?: number;
  startDate?: string;
  endDate?: string;
  negotiator?: string;
}): Promise<DailyAnalyticsResponse> {
  const qParams = new URLSearchParams();
  if (params.days) qParams.append('days', String(params.days));
  if (params.startDate) qParams.append('start_date', params.startDate);
  if (params.endDate) qParams.append('end_date', params.endDate);
  if (params.negotiator && params.negotiator !== 'all' && params.negotiator !== 'همه') {
    qParams.append('negotiator', params.negotiator);
  }

  const res = await fetch(`${BASE_URL}/analytics/daily?${qParams.toString()}`, {
    headers: getBffHeaders(),
  });
  return handleResponse<DailyAnalyticsResponse>(res, 'خطا در دریافت آمار روزانه تحلیلی');
}

export async function fetchCustomerReports(
  customerIdOrOptions?:
    | string
    | {
        page?: number;
        limit?: number;
        all?: boolean;
        startDate?: string;
        endDate?: string;
        negotiator?: string;
        fields?: string;
      },
  options?: {
    page?: number;
    limit?: number;
    all?: boolean;
    startDate?: string;
    endDate?: string;
    negotiator?: string;
    fields?: string;
  }
): Promise<CustomerReport[]> {
  const customerId = typeof customerIdOrOptions === 'string' ? customerIdOrOptions : undefined;
  const opts =
    typeof customerIdOrOptions === 'object' && customerIdOrOptions !== null
      ? customerIdOrOptions
      : options;

  const params = new URLSearchParams();
  if (customerId) params.append('customer_id', customerId);
  if (opts?.page) params.append('page', String(opts.page));
  if (opts?.limit !== undefined) params.append('limit', String(opts.limit));
  if (opts?.all || opts?.limit === undefined) params.append('all', 'true');
  if (opts?.startDate) params.append('start_date', opts.startDate);
  if (opts?.endDate) params.append('end_date', opts.endDate);
  if (opts?.negotiator) params.append('negotiator', opts.negotiator);
  if (opts?.fields) params.append('fields', opts.fields);

  const q = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${BASE_URL}/customer-reports${q}`, {
    headers: getBffHeaders(),
  });
  const resData: any = await handleResponse(res, 'خطا در دریافت گزارش‌های مذاکره');
  if (Array.isArray(resData)) return resData;
  if (resData && Array.isArray(resData.data)) return resData.data;
  return [];
}

export async function fetchCustomerReportsPaginated(
  customerId?: string,
  options?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    negotiator?: string;
    adminFilter?: string;
    staffFilter?: string;
    sortBy?: string;
  }
): Promise<PaginatedResult<CustomerReport>> {
  const params = new URLSearchParams();
  if (customerId) params.append('customer_id', customerId);
  if (options?.search) params.append('search', options.search);
  if (options?.status) params.append('status', options.status);
  if (options?.negotiator) params.append('negotiator', options.negotiator);
  if (options?.adminFilter) params.append('admin_filter', options.adminFilter);
  if (options?.staffFilter) params.append('staff_filter', options.staffFilter);
  if (options?.sortBy) params.append('sort', options.sortBy);
  params.append('page', String(options?.page || 1));
  params.append('limit', String(options?.limit || 25));

  const q = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${BASE_URL}/customer-reports${q}`, {
    headers: getBffHeaders(),
  });
  const resData = await handleResponse<any>(res, 'خطا در دریافت گزارش‌های مذاکره');
  return normalizePaginatedResponse<CustomerReport>(resData, options?.page || 1, options?.limit || 25);
}

export async function fetchColdLeadsPaginated(options?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  marketer_id?: string;
}): Promise<PaginatedResult<ColdLead>> {
  const params = new URLSearchParams();
  if (options?.search) params.append('search', options.search);
  if (options?.status) params.append('status', options.status);
  if (options?.marketer_id) params.append('marketer_id', options.marketer_id);
  params.append('page', String(options?.page || 1));
  params.append('limit', String(options?.limit || 25));

  const res = await fetch(`${BASE_URL}/cold-leads?${params.toString()}`, {
    headers: getBffHeaders(),
  });
  const resData = await handleResponse<any>(res, 'خطا در دریافت شماره‌های اولیه');
  return normalizePaginatedResponse<ColdLead>(resData, options?.page || 1, options?.limit || 25);
}

export async function fetchAdminReportsPaginated(options?: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<PaginatedResult<AdministrativeReport>> {
  const params = new URLSearchParams();
  if (options?.search) params.append('search', options.search);
  params.append('page', String(options?.page || 1));
  params.append('limit', String(options?.limit || 25));

  const res = await fetch(`${BASE_URL}/admin-reports?${params.toString()}`, {
    headers: getBffHeaders(),
  });
  const resData = await handleResponse<any>(res, 'خطا در دریافت گزارش‌های اداری');
  return normalizePaginatedResponse<AdministrativeReport>(resData, options?.page || 1, options?.limit || 25);
}

export async function createCustomerReport(payload: Partial<CustomerReport>): Promise<CustomerReport> {
  const res = await fetch(`${BASE_URL}/customer-reports`, {
    method: 'POST',
    headers: getBffHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  return handleResponse<CustomerReport>(res, 'خطا در ثبت گزارش مذاکره در پایگاه داده');
}

export async function fetchColdLeads(options?: { page?: number; limit?: number }): Promise<ColdLead[]> {
  const params = new URLSearchParams();
  if (options?.page) params.append('page', String(options.page));
  if (options?.limit) params.append('limit', String(options.limit));
  else params.append('limit', '100');

  const res = await fetch(`${BASE_URL}/cold-leads?${params.toString()}`, {
    headers: getBffHeaders(),
  });
  const resData: any = await handleResponse(res, 'خطا در دریافت شماره‌های اولیه');
  if (Array.isArray(resData)) return resData;
  if (resData && Array.isArray(resData.data)) return resData.data;
  return [];
}

export async function createColdLead(payload: Partial<ColdLead>): Promise<ColdLead> {
  const res = await fetch(`${BASE_URL}/cold-leads`, {
    method: 'POST',
    headers: getBffHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  return handleResponse<ColdLead>(res, 'خطا در ثبت شماره در پایگاه داده');
}

export async function updateColdLead(id: string, payload: Partial<ColdLead>): Promise<ColdLead> {
  const res = await fetch(`${BASE_URL}/cold-leads/${id}`, {
    method: 'PATCH',
    headers: getBffHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  return handleResponse<ColdLead>(res, 'خطا در بروزرسانی وضعیت شماره در پایگاه داده');
}

export async function bulkAssignColdLeads(
  lead_ids: string[],
  target_marketer_id: string
): Promise<{ success: boolean; updatedCount: number; message: string }> {
  const res = await fetch(`${BASE_URL}/cold-leads/bulk-assign`, {
    method: 'POST',
    headers: getBffHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ lead_ids, target_marketer_id }),
  });
  return handleResponse(res, 'خطا در تخصیص شماره‌ها به بازاریاب');
}

export async function deleteColdLead(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/cold-leads/${id}`, {
    method: 'DELETE',
    headers: getBffHeaders(),
  });
  if (!res.ok) {
    throw new Error('خطا در حذف شماره');
  }
}

export async function convertColdLead(id: string, customerData?: Partial<Customer>): Promise<{ customer: Customer; lead?: ColdLead }> {
  const res = await fetch(`${BASE_URL}/cold-leads/${id}/convert`, {
    method: 'POST',
    headers: getBffHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(customerData || {}),
  });
  return handleResponse<{ customer: Customer; lead?: ColdLead }>(res, 'خطا در تبدیل لید به مشتری در پایگاه داده');
}

export async function fetchAdminReports(options?: { page?: number; limit?: number }): Promise<AdministrativeReport[]> {
  const params = new URLSearchParams();
  if (options?.page) params.append('page', String(options.page));
  if (options?.limit) params.append('limit', String(options.limit));
  else params.append('limit', '100');

  const res = await fetch(`${BASE_URL}/admin-reports?${params.toString()}`, {
    headers: getBffHeaders(),
  });
  const resData: any = await handleResponse(res, 'خطا در دریافت گزارش کار پرسنل');
  if (Array.isArray(resData)) return resData;
  if (resData && Array.isArray(resData.data)) return resData.data;
  return [];
}

export async function createAdminReport(payload: Partial<AdministrativeReport>): Promise<AdministrativeReport> {
  const res = await fetch(`${BASE_URL}/administrative-reports`, {
    method: 'POST',
    headers: getBffHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  return handleResponse<AdministrativeReport>(res, 'خطا در ثبت گزارش عملکرد اداری در پایگاه داده');
}

export async function updateAdminReport(id: string, payload: Partial<AdministrativeReport>): Promise<AdministrativeReport> {
  const res = await fetch(`${BASE_URL}/administrative-reports/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: getBffHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  return handleResponse<AdministrativeReport>(res, 'خطا در ویرایش گزارش عملکرد اداری');
}

// -------------------------------------------------------------
// LEAVE REQUESTS API (درخواست‌های مرخصی)
// -------------------------------------------------------------
export async function fetchLeaveRequests(): Promise<LeaveRequest[]> {
  const res = await fetch(`${BASE_URL}/leave-requests`, {
    headers: getBffHeaders(),
  });
  return handleResponse<LeaveRequest[]>(res, 'خطا در دریافت لیست درخواست‌های مرخصی');
}

export async function createLeaveRequest(payload: Partial<LeaveRequest>): Promise<LeaveRequest> {
  const res = await fetch(`${BASE_URL}/leave-requests`, {
    method: 'POST',
    headers: getBffHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  return handleResponse<LeaveRequest>(res, 'خطا در ثبت درخواست مرخصی');
}

export async function updateLeaveRequestStatus(
  id: string,
  status: 'approved' | 'rejected' | 'pending',
  manager_note?: string
): Promise<LeaveRequest> {
  const res = await fetch(`${BASE_URL}/leave-requests/${id}`, {
    method: 'PATCH',
    headers: getBffHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ status, manager_note }),
  });
  return handleResponse<LeaveRequest>(res, 'خطا در تغییر وضعیت درخواست مرخصی');
}

export async function deleteLeaveRequest(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/leave-requests/${id}`, {
    method: 'DELETE',
    headers: getBffHeaders(),
  });
  if (!res.ok) {
    throw new Error('خطا در حذف درخواست مرخصی');
  }
}

// -------------------------------------------------------------
// SALARY ADVANCE REQUESTS API (درخواست‌های مساعده)
// -------------------------------------------------------------
export async function fetchAdvanceRequests(): Promise<SalaryAdvanceRequest[]> {
  const res = await fetch(`${BASE_URL}/advance-requests`, {
    headers: getBffHeaders(),
  });
  return handleResponse<SalaryAdvanceRequest[]>(res, 'خطا در دریافت لیست درخواست‌های مساعده');
}

export async function createAdvanceRequest(payload: Partial<SalaryAdvanceRequest>): Promise<SalaryAdvanceRequest> {
  const res = await fetch(`${BASE_URL}/advance-requests`, {
    method: 'POST',
    headers: getBffHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  return handleResponse<SalaryAdvanceRequest>(res, 'خطا در ثبت درخواست مساعده');
}

export async function updateAdvanceRequestStatus(
  id: string,
  status: 'approved' | 'rejected' | 'pending',
  approved_amount?: number,
  manager_note?: string
): Promise<SalaryAdvanceRequest> {
  const res = await fetch(`${BASE_URL}/advance-requests/${id}`, {
    method: 'PATCH',
    headers: getBffHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ status, approved_amount, manager_note }),
  });
  return handleResponse<SalaryAdvanceRequest>(res, 'خطا در تغییر وضعیت درخواست مساعده');
}

export async function deleteAdvanceRequest(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/advance-requests/${id}`, {
    method: 'DELETE',
    headers: getBffHeaders(),
  });
  if (!res.ok) {
    throw new Error('خطا در حذف درخواست مساعده');
  }
}

// -------------------------------------------------------------
// USER PROFILE & PASSWORD API (پروفایل و تغییر رمز)
// -------------------------------------------------------------
export async function updateUserProfile(payload: UserProfileUpdatePayload): Promise<{ success: boolean; personnel: Personnel; message: string }> {
  const res = await fetch(`${BASE_URL}/auth/update-profile`, {
    method: 'POST',
    headers: getBffHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  return handleResponse(res, 'خطا در بروزرسانی پروفایل کاربری');
}

export async function uploadAvatar(dataUrl: string, fileName?: string): Promise<{ success: boolean; avatarUrl: string; fileId?: string }> {
  const res = await fetch(`${BASE_URL}/upload-avatar`, {
    method: 'POST',
    headers: getBffHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ dataUrl, fileName }),
  });
  return handleResponse(res, 'خطا در بارگذاری تصویر پروفایل');
}

export async function changeUserPassword(payload: PasswordChangePayload): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${BASE_URL}/auth/change-password`, {
    method: 'POST',
    headers: getBffHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  return handleResponse(res, 'خطا در تغییر رمز عبور');
}

// -------------------------------------------------------------
// COLLEAGUES & OWNERSHIP MANAGEMENT (مدیریت همکاران و مالکیت)
// -------------------------------------------------------------
export async function createPersonnel(payload: CreateColleaguePayload): Promise<Personnel> {
  const res = await fetch(`${BASE_URL}/personnel`, {
    method: 'POST',
    headers: getBffHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  return handleResponse<Personnel>(res, 'خطا در ثبت همکار جدید');
}

export async function updatePersonnel(id: string, payload: Partial<Personnel>): Promise<Personnel> {
  const res = await fetch(`${BASE_URL}/personnel/${id}`, {
    method: 'PATCH',
    headers: getBffHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  return handleResponse<Personnel>(res, 'خطا در بروزرسانی اطلاعات همکار');
}

export async function deletePersonnel(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/personnel/${id}`, {
    method: 'DELETE',
    headers: getBffHeaders(),
  });
  if (!res.ok) {
    throw new Error('خطا در حذف همکار');
  }
}

export async function bulkExtendOwnership(
  customer_ids: string[],
  extend_days: number
): Promise<{ success: boolean; updatedCount: number; message: string }> {
  const res = await fetch(`${BASE_URL}/customers/bulk-extend`, {
    method: 'POST',
    headers: getBffHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ customer_ids, extend_days }),
  });
  return handleResponse(res, 'خطا در تمدید مالکیت مشتریان');
}

export async function bulkSetOwnershipDeadline(params: {
  target: 'all' | 'marketer' | 'selected';
  marketer_id?: string;
  customer_ids?: string[];
  days: number;
}): Promise<{ success: boolean; updatedCount: number; message: string }> {
  const res = await fetch(`${BASE_URL}/customers/bulk-set-deadline`, {
    method: 'POST',
    headers: getBffHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(params),
  });
  return handleResponse(res, 'خطا در تنظیم سراسری مهلت مالکیت پرونده‌ها');
}

export async function bulkSwitchOwnership(
  customer_ids: string[],
  new_marketer_id: string,
  new_marketer_name: string,
  duration_days: number = 7
): Promise<{ success: boolean; updatedCount: number; message: string }> {
  const res = await fetch(`${BASE_URL}/customers/bulk-switch`, {
    method: 'POST',
    headers: getBffHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ customer_ids, new_marketer_id, new_marketer_name, duration_days }),
  });
  return handleResponse(res, 'خطا در انتقال و سوئیچ مالکیت مشتریان');
}

// ----------------- Project Settings APIs ----------------- //

export async function fetchProjectSettings(): Promise<ProjectSettings> {
  const res = await fetch(`${BASE_URL}/project-settings`, {
    headers: getBffHeaders(),
  });
  return handleResponse(res, 'خطا در دریافت تنظیمات سامانه');
}

export async function updateProjectSettings(payload: Partial<ProjectSettings>): Promise<ProjectSettings> {
  const res = await fetch(`${BASE_URL}/project-settings`, {
    method: 'PATCH',
    headers: getBffHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  return handleResponse(res, 'خطا در بروزرسانی تنظیمات سامانه');
}

// ----------------- Tenants / Multi-Tenancy APIs ----------------- //

export async function fetchTenants(): Promise<Tenant[]> {
  const res = await fetch(`${BASE_URL}/tenants`, {
    headers: getBffHeaders(),
  });
  return handleResponse(res, 'خطا در دریافت لیست سازمان‌ها و شعب');
}

export async function createTenant(payload: Partial<Tenant>): Promise<Tenant> {
  const res = await fetch(`${BASE_URL}/tenants`, {
    method: 'POST',
    headers: getBffHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  return handleResponse(res, 'خطا در ایجاد سازمان / شعبه جدید');
}

export async function updateTenant(id: string, payload: Partial<Tenant>): Promise<Tenant> {
  const res = await fetch(`${BASE_URL}/tenants/${id}`, {
    method: 'PATCH',
    headers: getBffHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  return handleResponse(res, 'خطا در ویرایش اطلاعات سازمان');
}

export async function deleteTenant(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/tenants/${id}`, {
    method: 'DELETE',
    headers: getBffHeaders(),
  });
  if (!res.ok) {
    throw new Error('خطا در حذف سازمان');
  }
}

export async function importLegacyMigrationData(payload: {
  tenant_id?: string;
  personnelRows: any[];
  customerRows: any[];
  reportRows: any[];
}): Promise<{
  success: boolean;
  importedPersonnelCount: number;
  importedCustomersCount: number;
  importedReportsCount: number;
  skippedCount: number;
  skippedDetails?: Array<{ companyName: string; phone: string; reason: string }>;
  errors: string[];
  message: string;
}> {
  const res = await fetch(`${BASE_URL}/migration/import`, {
    method: 'POST',
    headers: getBffHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  return handleResponse(res, 'خطا در درون‌ریزی داده‌های سامانه قبلی');
}

export async function resetMigrationCache(): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${BASE_URL}/migration/reset-cache`, {
    method: 'POST',
    headers: getBffHeaders({ 'Content-Type': 'application/json' }),
  });
  return handleResponse(res, 'خطا در پاکسازی حافظه کش درون‌ریزی');
}

export async function autoAssignFreeCustomersWithReports(tenant_id?: string): Promise<{
  success: boolean;
  reassignedCount: number;
  details?: Array<{ customerId: string; companyName: string; marketerName: string }>;
  message: string;
}> {
  const res = await fetch(`${BASE_URL}/migration/auto-assign-free-with-reports`, {
    method: 'POST',
    headers: getBffHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ tenant_id }),
  });
  return handleResponse(res, 'خطا در اتصال خودکار مشتریان آزاد به بازاریابان');
}

export async function backfillTenantsData(): Promise<{
  success: boolean;
  updatedCustomers: number;
  updatedReports: number;
  updatedPersonnel: number;
  message: string;
}> {
  const res = await fetch(`${BASE_URL}/migration/backfill-tenants`, {
    method: 'POST',
    headers: getBffHeaders({ 'Content-Type': 'application/json' }),
  });
  return handleResponse(res, 'خطا در اصلاح خودکار شناسه‌های سازمان');
}



