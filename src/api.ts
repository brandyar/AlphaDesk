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
let currentTenantId: string = 'default';

// Load initial stored auth session & tenant if available
try {
  const savedTenant = localStorage.getItem(TENANT_STORAGE_KEY);
  if (savedTenant) {
    currentTenantId = savedTenant;
  }
} catch {}

try {
  const saved = localStorage.getItem(AUTH_STORAGE_KEY);
  if (saved) {
    const parsed = JSON.parse(saved);
    currentAuthToken = parsed.access_token || '';
    currentAuthUser = parsed.user || null;
    currentPersonnelContext = parsed.personnel || null;
    if (parsed.user?.tenant_id && !localStorage.getItem(TENANT_STORAGE_KEY)) {
      currentTenantId = parsed.user.tenant_id;
    }
  }
} catch {}

export function getActiveTenantId(): string {
  return currentTenantId || 'default';
}

export function setActiveTenantId(id: string) {
  currentTenantId = id || 'default';
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

export function getStoredAuthSession(): { user: AuthUser | null; personnel: Personnel | null; token: string } {
  return {
    user: currentAuthUser,
    personnel: currentPersonnelContext,
    token: currentAuthToken,
  };
}

export function saveAuthSession(data: AuthResponse) {
  currentAuthToken = data.access_token || '';
  currentAuthUser = data.user || null;
  currentPersonnelContext = data.personnel || null;
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

export function clearAuthSession() {
  currentAuthToken = '';
  currentAuthUser = null;
  currentPersonnelContext = null;
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
    try {
      const data = await res.json();
      errorMsg = data.message || data.error || defaultErrorMsg;
    } catch {
      // ignore
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

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  filteredTotal: number;
  page: number;
  limit: number;
}

export async function fetchCustomers(filters?: {
  search?: string;
  status?: string;
  marketer_id?: string;
  expired_only?: boolean;
  page?: number;
  limit?: number;
}): Promise<Customer[]> {
  const params = new URLSearchParams();
  if (filters?.search) params.append('search', filters.search);
  if (filters?.status) params.append('status', filters.status);
  if (filters?.marketer_id) params.append('marketer_id', filters.marketer_id);
  if (filters?.expired_only) params.append('expired_only', 'true');
  if (filters?.page) params.append('page', String(filters.page));
  if (filters?.limit !== undefined) params.append('limit', String(filters.limit));

  const res = await fetch(`${BASE_URL}/customers?${params.toString()}`, {
    headers: getBffHeaders(),
  });
  return handleResponse<Customer[]>(res, 'خطا در دریافت لیست مشتریان');
}

export async function fetchCustomersPaginated(filters?: {
  search?: string;
  status?: string;
  marketer_id?: string;
  expired_only?: boolean;
  page?: number;
  limit?: number;
}): Promise<PaginatedResult<Customer>> {
  const params = new URLSearchParams();
  if (filters?.search) params.append('search', filters.search);
  if (filters?.status) params.append('status', filters.status);
  if (filters?.marketer_id) params.append('marketer_id', filters.marketer_id);
  if (filters?.expired_only) params.append('expired_only', 'true');
  if (filters?.page) params.append('page', String(filters.page));
  if (filters?.limit) params.append('limit', String(filters.limit));

  const res = await fetch(`${BASE_URL}/customers?${params.toString()}`, {
    headers: getBffHeaders(),
  });
  const data = await handleResponse<Customer[]>(res, 'خطا در دریافت لیست مشتریان');
  const total = parseInt(res.headers.get('X-Total-Count') || String(data.length), 10);
  const filteredTotal = parseInt(res.headers.get('X-Filter-Count') || String(data.length), 10);
  const page = parseInt(res.headers.get('X-Page') || String(filters?.page || 1), 10);
  const limit = parseInt(res.headers.get('X-Limit') || String(filters?.limit || 50), 10);

  return {
    data,
    total,
    filteredTotal,
    page,
    limit,
  };
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

export async function fetchCustomerReports(
  customerId?: string,
  options?: { page?: number; limit?: number }
): Promise<CustomerReport[]> {
  const params = new URLSearchParams();
  if (customerId) params.append('customer_id', customerId);
  if (options?.page) params.append('page', String(options.page));
  if (options?.limit !== undefined) params.append('limit', String(options.limit));

  const q = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${BASE_URL}/customer-reports${q}`, {
    headers: getBffHeaders(),
  });
  return handleResponse<CustomerReport[]>(res, 'خطا در دریافت گزارش‌های مذاکره');
}

export async function fetchCustomerReportsPaginated(
  customerId?: string,
  options?: { page?: number; limit?: number }
): Promise<PaginatedResult<CustomerReport>> {
  const params = new URLSearchParams();
  if (customerId) params.append('customer_id', customerId);
  if (options?.page) params.append('page', String(options.page));
  if (options?.limit) params.append('limit', String(options.limit));

  const q = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${BASE_URL}/customer-reports${q}`, {
    headers: getBffHeaders(),
  });
  const data = await handleResponse<CustomerReport[]>(res, 'خطا در دریافت گزارش‌های مذاکره');
  const total = parseInt(res.headers.get('X-Total-Count') || String(data.length), 10);
  const filteredTotal = parseInt(res.headers.get('X-Filter-Count') || String(data.length), 10);
  const page = parseInt(res.headers.get('X-Page') || String(options?.page || 1), 10);
  const limit = parseInt(res.headers.get('X-Limit') || String(options?.limit || 50), 10);

  return {
    data,
    total,
    filteredTotal,
    page,
    limit,
  };
}

export async function createCustomerReport(payload: Partial<CustomerReport>): Promise<CustomerReport> {
  const res = await fetch(`${BASE_URL}/customer-reports`, {
    method: 'POST',
    headers: getBffHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  return handleResponse<CustomerReport>(res, 'خطا در ثبت گزارش مذاکره در پایگاه داده');
}

export async function fetchColdLeads(): Promise<ColdLead[]> {
  const res = await fetch(`${BASE_URL}/cold-leads`, {
    headers: getBffHeaders(),
  });
  return handleResponse<ColdLead[]>(res, 'خطا در دریافت شماره‌های اولیه');
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

export async function fetchAdminReports(): Promise<AdministrativeReport[]> {
  const res = await fetch(`${BASE_URL}/administrative-reports`, {
    headers: getBffHeaders(),
  });
  return handleResponse<AdministrativeReport[]>(res, 'خطا در دریافت گزارش‌های اداری');
}

export async function createAdminReport(payload: Partial<AdministrativeReport>): Promise<AdministrativeReport> {
  const res = await fetch(`${BASE_URL}/administrative-reports`, {
    method: 'POST',
    headers: getBffHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  return handleResponse<AdministrativeReport>(res, 'خطا در ثبت گزارش عملکرد اداری در پایگاه داده');
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



