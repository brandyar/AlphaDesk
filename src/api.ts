import {
  Customer,
  CustomerReport,
  ColdLead,
  AdministrativeReport,
  Personnel,
  BffStatus,
} from './types';

const BASE_URL = '/api';

export async function fetchBffStatus(): Promise<BffStatus> {
  const res = await fetch(`${BASE_URL}/bff-status`);
  if (!res.ok) throw new Error('Failed to load BFF status');
  return res.json();
}

export async function updateBffConfig(url: string, token: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/bff-config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, token }),
  });
  if (!res.ok) throw new Error('Failed to update Directus config');
  return res.json();
}

export async function fetchDirectusSchema(): Promise<any> {
  const res = await fetch(`${BASE_URL}/directus-schema`);
  if (!res.ok) throw new Error('Failed to fetch Directus schema');
  return res.json();
}

export async function fetchPersonnel(): Promise<Personnel[]> {
  const res = await fetch(`${BASE_URL}/personnel`);
  if (!res.ok) throw new Error('Failed to load personnel');
  return res.json();
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

  const res = await fetch(`${BASE_URL}/customers?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to load customers');
  return res.json();
}

export async function fetchCustomerById(id: string): Promise<Customer> {
  const res = await fetch(`${BASE_URL}/customers/${id}`);
  if (!res.ok) throw new Error('Failed to load customer details');
  return res.json();
}

export async function createCustomer(payload: Partial<Customer> & { assignment_duration_days?: number }): Promise<Customer> {
  const res = await fetch(`${BASE_URL}/customers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to create customer');
  return res.json();
}

export async function updateCustomer(id: string, payload: Partial<Customer>): Promise<Customer> {
  const res = await fetch(`${BASE_URL}/customers/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to update customer');
  return res.json();
}

export async function deleteCustomer(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/customers/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete customer');
}

export async function reassignCustomer(
  id: string,
  newMarketerId: string,
  newMarketerName: string,
  durationDays: number
): Promise<Customer> {
  const res = await fetch(`${BASE_URL}/customers/${id}/reassign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      new_marketer_id: newMarketerId,
      new_marketer_name: newMarketerName,
      duration_days: durationDays,
    }),
  });
  if (!res.ok) throw new Error('Failed to reassign customer');
  return res.json();
}

export async function fetchCustomerReports(customerId?: string): Promise<CustomerReport[]> {
  const q = customerId ? `?customer_id=${encodeURIComponent(customerId)}` : '';
  const res = await fetch(`${BASE_URL}/customer-reports${q}`);
  if (!res.ok) throw new Error('Failed to load reports');
  return res.json();
}

export async function createCustomerReport(payload: Partial<CustomerReport>): Promise<CustomerReport> {
  const res = await fetch(`${BASE_URL}/customer-reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to create report');
  return res.json();
}

export async function fetchColdLeads(): Promise<ColdLead[]> {
  const res = await fetch(`${BASE_URL}/cold-leads`);
  if (!res.ok) throw new Error('Failed to load cold leads');
  return res.json();
}

export async function createColdLead(payload: Partial<ColdLead>): Promise<ColdLead> {
  const res = await fetch(`${BASE_URL}/cold-leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to create cold lead');
  return res.json();
}

export async function updateColdLead(id: string, payload: Partial<ColdLead>): Promise<ColdLead> {
  const res = await fetch(`${BASE_URL}/cold-leads/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to update cold lead');
  return res.json();
}

export async function convertColdLead(id: string, customerData?: Partial<Customer>): Promise<{ customer: Customer; lead: ColdLead }> {
  const res = await fetch(`${BASE_URL}/cold-leads/${id}/convert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(customerData || {}),
  });
  if (!res.ok) throw new Error('Failed to convert cold lead');
  return res.json();
}

export async function fetchAdminReports(): Promise<AdministrativeReport[]> {
  const res = await fetch(`${BASE_URL}/administrative-reports`);
  if (!res.ok) throw new Error('Failed to load administrative reports');
  return res.json();
}

export async function createAdminReport(payload: Partial<AdministrativeReport>): Promise<AdministrativeReport> {
  const res = await fetch(`${BASE_URL}/administrative-reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to submit administrative report');
  return res.json();
}
