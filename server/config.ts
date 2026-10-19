import dotenv from 'dotenv';
import {
  Personnel,
  Customer,
  CustomerReport,
  ColdLead,
  AdministrativeReport,
  LeaveRequest,
  SalaryAdvanceRequest,
  CustomerContact,
  ProjectSettingsState,
  Tenant,
  TenantSettingsState,
} from './types';

dotenv.config();

export let directusUrl = process.env.DIRECTUS_URL || '';
export let directusAdminToken = process.env.DIRECTUS_ADMIN_TOKEN || '';
export const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

export function updateDirectusConfig(url?: string, token?: string) {
  if (typeof url === 'string') directusUrl = url.trim();
  if (typeof token === 'string') directusAdminToken = token.trim();
}

export const DIRECTUS_ADMIN_ROLE_IDS = [
  '59e261e1-56f4-401e-9889-4971e2c3c4ce',
  'a45beaec-0272-4c29-89ee-122dce37f565',
];
export const DIRECTUS_ADMIN_ROLE_ID = '59e261e1-56f4-401e-9889-4971e2c3c4ce';
export const DIRECTUS_STAFF_ROLE_ID = 'b9c11357-4926-47ad-b020-6080cb2a62df';

export const initialPersonnel: Personnel[] = [
  {
    id: 'p-1',
    name: 'محمدرضا کیانی',
    username: 'kiani',
    role: 'admin',
    email: 'kiani@company.ir',
    phone: '09121112233',
    status: 'active',
    active: true,
  },
  {
    id: 'p-2',
    name: 'سارا احمدی',
    username: 'sara_ahmadi',
    role: 'marketer',
    email: 'sara.ahmadi@company.ir',
    phone: '09123456789',
    status: 'active',
    active: true,
  },
  {
    id: 'p-3',
    name: 'علیرضا حسینی',
    username: 'hosseini',
    role: 'marketer',
    email: 'hosseini@company.ir',
    phone: '09351234567',
    status: 'active',
    active: true,
  },
  {
    id: 'p-4',
    name: 'مهدی زمانی',
    username: 'zamani',
    role: 'sales_manager',
    email: 'zamani@company.ir',
    phone: '09197654321',
    status: 'active',
    active: true,
  },
];

const now = new Date();
export const addDays = (d: Date, days: number) => {
  const result = new Date(d);
  result.setDate(result.getDate() + days);
  return result.toISOString();
};

export const initialCustomers: Customer[] = [
  {
    id: 'c-101',
    company_name: 'شرکت تجارت الکترونیک سپهر',
    business_type: 'فروش تجهیزات صنعتی و شبکه',
    province: 'تهران',
    city: 'تهران',
    manager_name: 'مهندس کامران رستمی',
    manager_phones: ['09121234567', '02188776655'],
    negotiator_name: 'سارا احمدی',
    negotiator_phones: ['09123456789'],
    mobile_numbers: ['09121234567', '09359876543'],
    landline_numbers: ['02188776655', '02188776656'],
    telegram_phone: '09121234567',
    telegram_ids: ['sepehr_trade', 'kamran_rostami'],
    instagram_ids: ['sepehr.industrial'],
    emails: ['info@sepehr-trade.ir', 'k.rostami@sepehr-trade.ir'],
    websites: ['https://sepehr-trade.ir', 'https://shop.sepehr-trade.ir'],
    is_ecommerce: true,
    interview_status: 'مشتاق و مستعد',
    interview_report:
      'جلسه اول تلفنی بسیار مثبت بود. نیاز مبرم به سیستم فروش یکپارچه دارند و بودجه برای قرارداد سالانه را تأیید کردند.',
    interview_score: 9,
    next_followup_date: addDays(now, 2),
    assigned_marketer_id: 'p-2',
    assigned_marketer_name: 'سارا احمدی',
    assignment_deadline: addDays(now, 4),
    assignment_duration_days: 7,
    status: 'پیش نویس قرارداد',
    date_created: addDays(now, -3),
    date_updated: addDays(now, -1),
  },
  {
    id: 'c-102',
    company_name: 'فروشگاه آنلاین آوینامد',
    business_type: 'پوشاک و اکسسوری زنانه',
    province: 'اصفهان',
    city: 'اصفهان',
    manager_name: 'خانم بهاره سهرابی',
    manager_phones: ['09132223344'],
    negotiator_name: 'علیرضا حسینی',
    negotiator_phones: ['09351234567'],
    mobile_numbers: ['09132223344'],
    landline_numbers: ['03136654321'],
    telegram_phone: '09132223344',
    telegram_ids: ['avina_mode_admin'],
    instagram_ids: ['avinamode_official'],
    emails: ['support@avinamode.com'],
    websites: ['https://avinamode.com'],
    is_ecommerce: true,
    interview_status: 'نیاز به مشاوره تکمیلی',
    interview_report:
      'سایت با ترافیک بالا دارند اما در اتصال به انبارداری مشکل دارند. قرار شد پیش‌نویس طرح بازاریابی براشون ارسال بشه.',
    interview_score: 7,
    next_followup_date: addDays(now, 1),
    assigned_marketer_id: 'p-3',
    assigned_marketer_name: 'علیرضا حسینی',
    assignment_deadline: addDays(now, -1),
    assignment_duration_days: 7,
    status: 'پیگیری قبل از انقضا',
    date_created: addDays(now, -8),
    date_updated: addDays(now, -2),
  },
];

export const initialReports: CustomerReport[] = [
  {
    id: 'rep-1',
    customer_id: 'c-101',
    negotiator_name: 'سارا احمدی',
    negotiation_phone: '09121234567',
    report_text:
      'با آقای رستمی صحبت شد. پیش‌فاکتور ارسال شده بررسی شد و موافقت اولیه صورت گرفت. جلسه حضوری برای نهایی کردن قرارداد تنظیم شد.',
    negotiation_score: 9,
    next_followup_date: addDays(now, 2),
    negotiation_status: 'پیش نویس قرارداد',
    created_by: 'p-2',
    date_created: addDays(now, -1),
    contract_amount: 45000000,
  },
];

export const initialColdLeads: ColdLead[] = [
  {
    id: 'lead-1',
    phone_number: '09129998877',
    contact_name: 'آقای شریفی (تولیدی پوشاک)',
    source: 'نمایشگاه بین‌المللی',
    status: 'در حال بررسی',
    notes: 'مایل به دریافت پروپوزال دیجیتال مارکتینگ هستند.',
    assigned_to: 'سارا احمدی',
    assigned_to_id: 'p-2',
    assigned_to_name: 'سارا احمدی',
    date_created: addDays(now, -2),
  },
];

export const initialContacts: CustomerContact[] = [
  {
    id: 'cnt-101-1',
    customer_id: 'c-101',
    channel_type: 'mobile',
    value: '09121234567',
    normalized_value: '09121234567',
    contact_name: 'کامران رستمی',
    contact_role: 'مدیرعامل',
    is_primary: true,
    date_created: addDays(now, -3),
    date_updated: addDays(now, -3),
  },
];

export const initialLeaveRequests: LeaveRequest[] = [
  {
    id: 'lr-1',
    personnel_id: 'p-2',
    personnel_name: 'سارا احمدی',
    leave_type: 'hourly',
    start_date: new Date().toISOString().split('T')[0],
    end_date: null,
    start_time: '10:00',
    end_time: '12:30',
    hours_count: 2.5,
    days_count: null,
    reason: 'مراجعه به پزشک و درمانگاه',
    status: 'pending',
    manager_note: null,
    reviewed_by: null,
    reviewed_at: null,
    date_created: new Date().toISOString(),
  },
];

export const initialAdvanceRequests: SalaryAdvanceRequest[] = [
  {
    id: 'ar-1',
    personnel_id: 'p-2',
    personnel_name: 'سارا احمدی',
    amount: 5000000,
    target_month: 'مهر ۱۴۰۵',
    needed_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    reason: 'پرداخت قسط شهریه دانشگاه',
    bank_card_number: '6037-9975-1234-5678',
    iban: 'IR120170000000123456789012',
    status: 'pending',
    approved_amount: null,
    manager_note: null,
    reviewed_by: null,
    reviewed_at: null,
    date_created: new Date().toISOString(),
  },
];

// Mutable state arrays
export let personnelData = [...initialPersonnel];
export let customersData: Customer[] = [];
export let reportsData: CustomerReport[] = [];
export let coldLeadsData: ColdLead[] = [...initialColdLeads];
export let adminReportsData: AdministrativeReport[] = [];
export let contactsData: CustomerContact[] = [...initialContacts];
export let leaveRequestsData: LeaveRequest[] = [...initialLeaveRequests];
export let advanceRequestsData: SalaryAdvanceRequest[] = [...initialAdvanceRequests];

export function setPersonnelData(data: Personnel[]) {
  personnelData = data;
}

export function setCustomersData(data: Customer[]) {
  customersData = data;
}

export function setReportsData(data: CustomerReport[]) {
  reportsData = data;
}

export function setColdLeadsData(data: ColdLead[]) {
  coldLeadsData = data;
}

export function setAdminReportsData(data: AdministrativeReport[]) {
  adminReportsData = data;
}

export function setContactsData(data: CustomerContact[]) {
  contactsData = data;
}

export function setLeaveRequestsData(data: LeaveRequest[]) {
  leaveRequestsData = data;
}

export function setAdvanceRequestsData(data: SalaryAdvanceRequest[]) {
  advanceRequestsData = data;
}

export let tenantsData: Tenant[] = [
  {
    id: 'default',
    name: 'سازمان مرکزی آلفادسک',
    slug: 'alphadesk-hq',
    phone: '021-88888888',
    address: 'تهران، میدان ونک، برج نگار، طبقه ۱۰',
    description: 'سازمان مرکزی و پیش‌فرض سامانه',
    status: 'active',
    date_created: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'tenant-2',
    name: 'شعبه بازرگانی و فروش آریا',
    slug: 'arya-trading',
    phone: '021-77777777',
    address: 'اصفهان، خیابان چهارباغ بالا',
    description: 'شعبه بازرگانی و فروش',
    status: 'active',
    date_created: '2026-02-01T00:00:00.000Z',
  },
];

export function setTenantsData(data: Tenant[]) {
  tenantsData = data;
}

export let projectSettingsData: ProjectSettingsState = {
  id: 1,
  ippanel_api: '',
  ippanel_sender: '+983000505',
  ippanel_line_number: '+983000505',
  free_customers_claim_limit: 20,
};

export function updateProjectSettingsData(patch: Partial<ProjectSettingsState>) {
  projectSettingsData = { ...projectSettingsData, ...patch };
}

export let tenantSettingsMap: Map<string, TenantSettingsState> = new Map([
  ['default', { id: 'ts-default', tenant_id: 'default', sms_phones: ['09121112233'] }],
]);

export let globalSessionRevocationTimestamp = 0;

export function setGlobalSessionRevocationTimestamp(ts: number) {
  globalSessionRevocationTimestamp = ts;
}
