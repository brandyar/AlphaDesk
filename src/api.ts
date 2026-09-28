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
} from './types';

const BASE_URL = '/api';

let currentPersonnelContext: Personnel | null = null;

export function setApiPersonnelContext(p: Personnel | null) {
  currentPersonnelContext = p;
}

export function getApiPersonnelContext(): Personnel | null {
  return currentPersonnelContext;
}

function getBffHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = {
    ...customHeaders,
  };
  if (currentPersonnelContext) {
    headers['x-user-id'] = currentPersonnelContext.id;
    headers['x-user-role'] = currentPersonnelContext.role;
    headers['x-user-name'] = encodeURIComponent(currentPersonnelContext.name);
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

export async function fetchCustomers(filters?: {
  search?: string;
  status?: string;
  marketer_id?: string;
  expired_only?: boolean;
}): Promise<Customer[]> {
  const params = new URLSearchParams();
  if (filters?.search) params.append('search', filters.search);
  if (filters?.status) params.append('status', filters.status);
  if (filters?.marketer_id) params.append('marketer_id', filters.marketer_id);
  if (filters?.expired_only) params.append('expired_only', 'true');

  const res = await fetch(`${BASE_URL}/customers?${params.toString()}`, {
    headers: getBffHeaders(),
  });
  return handleResponse<Customer[]>(res, 'خطا در دریافت لیست مشتریان');
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

export async function fetchCustomerReports(customerId?: string): Promise<CustomerReport[]> {
  const q = customerId ? `?customer_id=${encodeURIComponent(customerId)}` : '';
  const res = await fetch(`${BASE_URL}/customer-reports${q}`, {
    headers: getBffHeaders(),
  });
  return handleResponse<CustomerReport[]>(res, 'خطا در دریافت گزارش‌های مذاکره');
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
