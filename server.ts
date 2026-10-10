import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '10mb' }));

// Directus configuration
let directusUrl = process.env.DIRECTUS_URL || '';
let directusAdminToken = process.env.DIRECTUS_ADMIN_TOKEN || '';

export interface CustomerContact {
  id: string;
  customer_id: string;
  channel_type: 'mobile' | 'landline' | 'telegram' | 'instagram' | 'email' | 'website' | 'whatsapp' | 'other';
  value: string;
  normalized_value: string;
  contact_name?: string;
  contact_role?: string;
  is_primary: boolean;
  notes?: string;
  date_created: string;
  date_updated: string;
}

export interface Customer {
  id: string;
  tenant_id?: string;
  company_name: string;
  business_type: string;
  province: string;
  city: string;
  manager_name: string;
  manager_phones: string[];
  negotiator_name: string;
  negotiator_phones: string[];
  mobile_numbers: string[];
  landline_numbers: string[];
  telegram_phone: string;
  telegram_ids: string[];
  instagram_ids: string[];
  emails: string[];
  websites: string[];
  contacts?: CustomerContact[];
  is_ecommerce: boolean;
  interview_status: string;
  interview_report: string;
  interview_score: number;
  next_followup_date: string | null;
  assigned_marketer_id: string | null;
  assigned_marketer_name: string;
  assignment_deadline: string | null;
  assignment_duration_days?: number;
  status: string;
  is_expired?: boolean;
  claimed_from_pool?: boolean;
  claimed_from_pool_at?: string;
  date_created: string;
  date_updated: string;
}

export interface CustomerReport {
  id: string;
  customer_id: string;
  negotiator_name: string;
  negotiation_phone: string;
  report_text: string;
  negotiation_score: number;
  next_followup_date: string | null;
  negotiation_status: string;
  created_by?: string;
  date_created: string;
  contract_number?: string | null;
  contract_date?: string | null;
  contract_items?: string | null;
  contract_amount?: number | null;
}

export interface ColdLead {
  id: string;
  phone_number: string;
  contact_name: string;
  source: string;
  status: 'تماس نگرفته' | 'پاسخ نداد' | 'در حال بررسی' | 'تبدیل شده به مشتری' | 'شماره نامعتبر';
  notes: string;
  assigned_to: string;
  converted_customer_id?: string | null;
  date_created: string;
}

export interface AdministrativeReport {
  id: string;
  tenant_id?: string;
  personnel_id: string;
  personnel_name: string;
  report_date: string;
  calls_count: number;
  successful_contacts: number;
  leads_converted: number;
  tasks_summary: string;
  challenges: string;
  tomorrow_plan: string;
  hourly_logs?: any;
  date_created: string;
}

export interface LeaveRequest {
  id: string;
  tenant_id?: string;
  personnel_id: string;
  personnel_name: string;
  leave_type: 'daily' | 'hourly';
  start_date: string;
  end_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  hours_count?: number | null;
  days_count?: number | null;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  manager_note?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  date_created: string;
}

export interface SalaryAdvanceRequest {
  id: string;
  tenant_id?: string;
  personnel_id: string;
  personnel_name: string;
  amount: number;
  target_month?: string;
  needed_date?: string | null;
  reason: string;
  bank_card_number?: string | null;
  iban?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  approved_amount?: number | null;
  manager_note?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  date_created: string;
}

export interface PersonnelContactNumber {
  id?: string;
  label: string;
  number: string;
}

export interface PersonnelPermissions {
  allowed_menus: string[];
  can_view_all_customers?: boolean;
  can_edit_customer?: boolean;
  can_delete_customer?: boolean;
  can_export_data?: boolean;
  can_switch_ownership?: boolean;
  can_extend_ownership?: boolean;
  can_manage_leads?: boolean;
  can_approve_leaves?: boolean;
  can_approve_advances?: boolean;
  can_manage_personnel?: boolean;
  report_view_scope?: 'all' | 'own_only' | 'specific_personnel';
  visible_report_personnel_ids?: string[];
}

export interface Personnel {
  id: string;
  tenant_id?: string;
  tenant_name?: string;
  allowed_tenant_ids?: string[];
  name: string;
  username?: string;
  role: 'admin' | 'sales_manager' | 'marketer' | 'office_staff' | 'remote_task' | 'operator' | 'finance' | 'custom' | string;
  email: string;
  phone: string;
  phones?: Array<string | PersonnelContactNumber>;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relation?: string;
  family_contacts?: any;
  permissions?: PersonnelPermissions;
  avatar?: string;
  status?: string;
  active?: boolean;
  user_id?: string | null;
  bank_card_number?: string;
  iban?: string;
  national_id?: string;
}

const initialPersonnel: Personnel[] = [
  {
    id: 'p-1',
    name: 'محمدرضا کیانی',
    username: 'kiani',
    role: 'admin',
    email: 'kiani@company.ir',
    phone: '09121112233',
    status: 'active',
    active: true
  },
  {
    id: 'p-2',
    name: 'سارا احمدی',
    username: 'sara_ahmadi',
    role: 'marketer',
    email: 'sara.ahmadi@company.ir',
    phone: '09123456789',
    status: 'active',
    active: true
  },
  {
    id: 'p-3',
    name: 'علیرضا حسینی',
    username: 'hosseini',
    role: 'marketer',
    email: 'hosseini@company.ir',
    phone: '09351234567',
    status: 'active',
    active: true
  },
  {
    id: 'p-4',
    name: 'مهدی زمانی',
    username: 'zamani',
    role: 'sales_manager',
    email: 'zamani@company.ir',
    phone: '09197654321',
    status: 'active',
    active: true
  }
];

const now = new Date();
const addDays = (d: Date, days: number) => {
  const result = new Date(d);
  result.setDate(result.getDate() + days);
  return result.toISOString();
};

const initialCustomers: Customer[] = [
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
    interview_report: 'جلسه اول تلفنی بسیار مثبت بود. نیاز مبرم به سیستم فروش یکپارچه دارند و بودجه برای قرارداد سالانه را تأیید کردند.',
    interview_score: 9,
    next_followup_date: addDays(now, 2),
    assigned_marketer_id: 'p-2',
    assigned_marketer_name: 'سارا احمدی',
    assignment_deadline: addDays(now, 4),
    assignment_duration_days: 7,
    status: 'پیش نویس قرارداد',
    date_created: addDays(now, -3),
    date_updated: addDays(now, -1)
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
    interview_report: 'سایت با ترافیک بالا دارند اما در اتصال به انبارداری مشکل دارند. قرار شد پیش‌نویس طرح بازاریابی براشون ارسال بشه.',
    interview_score: 7,
    next_followup_date: addDays(now, 1),
    assigned_marketer_id: 'p-3',
    assigned_marketer_name: 'علیرضا حسینی',
    assignment_deadline: addDays(now, -1),
    assignment_duration_days: 7,
    status: 'پیگیری قبل از انقضا',
    date_created: addDays(now, -8),
    date_updated: addDays(now, -2)
  },
  {
    id: 'c-103',
    company_name: 'صنایع چوب و دکوراسیون پارسیان',
    business_type: 'تولید مبلمان و دکوراسیون لوکس',
    province: 'فارس',
    city: 'شیراز',
    manager_name: 'آقای فرهاد دهقان',
    manager_phones: ['09171118899'],
    negotiator_name: 'سارا احمدی',
    negotiator_phones: ['09123456789'],
    mobile_numbers: ['09171118899'],
    landline_numbers: ['07132244556'],
    telegram_phone: '09171118899',
    telegram_ids: ['parsian_wood'],
    instagram_ids: ['parsian.decor'],
    emails: ['parsianwood@gmail.com'],
    websites: ['https://parsianwood.ir'],
    is_ecommerce: false,
    interview_status: 'مصاحبه اولیه انجام شده',
    interview_report: 'کاتالوگ جدید چاپ کردند، مایل به بازاریابی پیامکی و ارتباط مستقیم با معماران هستند. قرارداد ۲ ماهه مد نظرشونه.',
    interview_score: 8,
    next_followup_date: addDays(now, 5),
    assigned_marketer_id: 'p-2',
    assigned_marketer_name: 'سارا احمدی',
    assignment_deadline: addDays(now, 6),
    assignment_duration_days: 7,
    status: 'پیگیری قرارداد',
    date_created: addDays(now, -1),
    date_updated: addDays(now, -1)
  },
  {
    id: 'c-104',
    company_name: 'هایپرمارکت زنجیره‌ای آریا',
    business_type: 'مواد غذایی و FMCG',
    province: 'خراسان رضوی',
    city: 'مشهد',
    manager_name: 'جناب کاظمی',
    manager_phones: ['09153334455'],
    negotiator_name: 'علیرضا حسینی',
    negotiator_phones: ['09351234567'],
    mobile_numbers: ['09153334455'],
    landline_numbers: ['05138899001'],
    telegram_phone: '09153334455',
    telegram_ids: ['arya_hyper'],
    instagram_ids: ['hyper_arya_mashhad'],
    emails: ['arya.chain@gmail.com'],
    websites: [],
    is_ecommerce: false,
    interview_status: 'عدم تناسب در مصاحبه',
    interview_report: 'تصمیم‌گیرنده اصلی در سفر است و بودجه تبلیغات این ماه تکمیل شده است.',
    interview_score: 3,
    next_followup_date: addDays(now, 20),
    assigned_marketer_id: 'p-3',
    assigned_marketer_name: 'علیرضا حسینی',
    assignment_deadline: addDays(now, -5),
    assignment_duration_days: 7,
    status: 'پیگیری بلند مدت',
    date_created: addDays(now, -12),
    date_updated: addDays(now, -5)
  }
];

const initialReports: CustomerReport[] = [
  {
    id: 'r-1',
    customer_id: 'c-101',
    negotiator_name: 'سارا احمدی',
    negotiation_phone: '09121234567',
    report_text: 'ارسال پروپوزال رسمی و شرح خدمات. مهندس رستمی استقبال کردند و گفتند بندهای حقوقی را بررسی می‌کنند.',
    negotiation_score: 9,
    next_followup_date: addDays(now, 2),
    negotiation_status: 'پیش نویس قرارداد',
    date_created: addDays(now, -1)
  },
  {
    id: 'r-2',
    customer_id: 'c-102',
    negotiator_name: 'علیرضا حسینی',
    negotiation_phone: '09132223344',
    report_text: 'تماس برای تأیید جلسه آنلاین. اظهار داشتند که فعلاً سرشان شلوغ است اما فایل دمو ارسال شد.',
    negotiation_score: 6,
    next_followup_date: addDays(now, 1),
    negotiation_status: 'پیگیری قبل از انقضا',
    date_created: addDays(now, -2)
  },
  {
    id: 'r-3',
    customer_id: 'c-103',
    negotiator_name: 'سارا احمدی',
    negotiation_phone: '09171118899',
    report_text: 'هماهنگی برای استعلام قیمت بسته‌های تبلیغات سالانه. مدیر تمایل به پرداخت چکی با پیش‌پرداخت ۴۰٪ دارد.',
    negotiation_score: 8,
    next_followup_date: addDays(now, 5),
    negotiation_status: 'پیگیری قرارداد',
    date_created: addDays(now, -1)
  }
];

const initialColdLeads: ColdLead[] = [
  {
    id: 'lead-1',
    phone_number: '09129998877',
    contact_name: 'فروشگاه چرم ماهان',
    source: 'دایرکت اینستاگرام',
    status: 'تماس نگرفته',
    notes: 'پیام داده بودند برای تعرفه خدمات بازاریابی دیجیتال. نیاز به تماس اولیه و پرزنت خدمات دارند.',
    assigned_to: 'سارا احمدی',
    date_created: addDays(now, 0)
  },
  {
    id: 'lead-2',
    phone_number: '09361112244',
    contact_name: 'شرکت بازرگانی آفاق',
    source: 'معرفی مشتریان قبلی',
    status: 'در حال بررسی',
    notes: 'آقای صادقی معرفی کردند. گفتند شرکت ثبت شده دارند و دنبال تیم تخصصی جذب مشتری هستند.',
    assigned_to: 'علیرضا حسینی',
    date_created: addDays(now, -1)
  }
];

const initialAdminReports: AdministrativeReport[] = [
  {
    id: 'adm-1',
    personnel_id: 'p-2',
    personnel_name: 'سارا احمدی',
    report_date: new Date().toISOString().split('T')[0],
    calls_count: 18,
    successful_contacts: 12,
    leads_converted: 2,
    tasks_summary: 'پیگیری قرارداد شرکت سپهر و نهایی‌سازی پیش‌نویس، تماس با ۴ لید جدید از دایرکت.',
    challenges: 'سامانه پیامک شرکت در ساعات ظهر کمی کندی داشت که پیگیری شد.',
    tomorrow_plan: 'بستن قرارداد رسمی سپهر، تماس با ۵ لید سرد جدید.',
    date_created: new Date().toISOString()
  }
];

const initialContacts: CustomerContact[] = [
  {
    id: 'cnt-101-1',
    customer_id: 'c-101',
    channel_type: 'mobile',
    value: '09121234567',
    normalized_value: '09121234567',
    contact_name: 'مهندس کامران رستمی',
    contact_role: 'مدیرعامل',
    is_primary: true,
    notes: 'تماس بعد از ظهرها',
    date_created: addDays(now, -3),
    date_updated: addDays(now, -3)
  },
  {
    id: 'cnt-101-2',
    customer_id: 'c-101',
    channel_type: 'landline',
    value: '02188776655',
    normalized_value: '02188776655',
    contact_name: 'دفتر مرکزی تهران',
    contact_role: 'دفتر مرکزی',
    is_primary: false,
    date_created: addDays(now, -3),
    date_updated: addDays(now, -3)
  },
  {
    id: 'cnt-102-1',
    customer_id: 'c-102',
    channel_type: 'mobile',
    value: '09132223344',
    normalized_value: '09132223344',
    contact_name: 'خانم بهاره سهرابی',
    contact_role: 'مدیر فروشگاه',
    is_primary: true,
    date_created: addDays(now, -8),
    date_updated: addDays(now, -8)
  },
  {
    id: 'cnt-103-1',
    customer_id: 'c-103',
    channel_type: 'mobile',
    value: '09171118899',
    normalized_value: '09171118899',
    contact_name: 'آقای فرهاد دهقان',
    contact_role: 'مدیر کارخانه',
    is_primary: true,
    date_created: addDays(now, -1),
    date_updated: addDays(now, -1)
  },
  {
    id: 'cnt-104-1',
    customer_id: 'c-104',
    channel_type: 'mobile',
    value: '09153334455',
    normalized_value: '09153334455',
    contact_name: 'جناب کاظمی',
    contact_role: 'مدیریت شعب',
    is_primary: true,
    date_created: addDays(now, -12),
    date_updated: addDays(now, -12)
  }
];

// No in-memory cache or temporary mock data: all data is strictly online
let personnelData = [...initialPersonnel];
let customersData: Customer[] = [];
let reportsData: CustomerReport[] = [];
let coldLeadsData: ColdLead[] = [];
let adminReportsData: AdministrativeReport[] = [];
let contactsData: CustomerContact[] = [];

const initialLeaveRequests: LeaveRequest[] = [
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
    date_created: new Date().toISOString()
  },
  {
    id: 'lr-2',
    personnel_id: 'p-3',
    personnel_name: 'علیرضا حسینی',
    leave_type: 'daily',
    start_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    start_time: null,
    end_time: null,
    hours_count: null,
    days_count: 2,
    reason: 'امور اداری و ثبت اسناد',
    status: 'approved',
    manager_note: 'با مرخصی شما به مدت ۲ روز موافقت شد.',
    reviewed_by: 'محمدرضا کیانی',
    reviewed_at: new Date().toISOString(),
    date_created: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  }
];

const initialAdvanceRequests: SalaryAdvanceRequest[] = [
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
    date_created: new Date().toISOString()
  }
];

let leaveRequestsData: LeaveRequest[] = [...initialLeaveRequests];
let advanceRequestsData: SalaryAdvanceRequest[] = [...initialAdvanceRequests];

export interface ProjectSettingsState {
  id?: number;
  ippanel_api?: string;
  free_customers_claim_limit?: number;
}

export interface Tenant {
  id: string;
  name: string;
  slug?: string;
  logo?: string;
  phone?: string;
  address?: string;
  description?: string;
  status: 'active' | 'inactive';
  date_created: string;
}

let tenantsData: Tenant[] = [
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

function resolveDirectusTenantId(rawTenant: any): number | null {
  if (rawTenant === null || rawTenant === undefined || rawTenant === '' || rawTenant === 'all') {
    if (tenantsData.length > 0) {
      const num = Number(tenantsData[0].id);
      if (!isNaN(num) && isFinite(num) && num > 0) return num;
    }
    return null;
  }
  const directNum = Number(rawTenant);
  if (!isNaN(directNum) && isFinite(directNum) && directNum > 0) {
    return directNum;
  }
  const str = String(rawTenant).trim().toLowerCase();
  const match = tenantsData.find(
    (t) =>
      String(t.id).toLowerCase() === str ||
      (t.slug && t.slug.toLowerCase() === str) ||
      t.name.toLowerCase() === str
  );
  if (match) {
    const matchNum = Number(match.id);
    if (!isNaN(matchNum) && isFinite(matchNum) && matchNum > 0) return matchNum;
  }
  if (tenantsData.length > 0) {
    const fallbackNum = Number(tenantsData[0].id);
    if (!isNaN(fallbackNum) && isFinite(fallbackNum) && fallbackNum > 0) return fallbackNum;
  }
  return null;
}

function matchesTenant(itemTenantId: any, activeTenantId: string): boolean {
  if (!activeTenantId || activeTenantId === 'all') return true;
  const itemStr =
    typeof itemTenantId === 'object' && itemTenantId !== null
      ? String(itemTenantId.id)
      : itemTenantId !== null && itemTenantId !== undefined
      ? String(itemTenantId)
      : 'default';

  if (itemStr === activeTenantId) return true;
  if (activeTenantId === 'default') {
    if (itemStr === 'default') return true;
    if (tenantsData.length > 0) {
      if (itemStr === String(tenantsData[0].id) || (tenantsData[0].slug && itemStr === tenantsData[0].slug)) {
        return true;
      }
    }
  }
  const activeTenant = tenantsData.find((t) => String(t.id) === activeTenantId || t.slug === activeTenantId);
  if (activeTenant) {
    if (itemStr === String(activeTenant.id) || (activeTenant.slug && itemStr === activeTenant.slug)) {
      return true;
    }
  }
  return false;
}

function getRequestTenantId(req: Request): string {
  const headerTenant = req.headers['x-tenant-id'];
  if (headerTenant && typeof headerTenant === 'string' && headerTenant.trim()) {
    return headerTenant.trim();
  }
  const queryTenant = req.query.tenant_id;
  if (queryTenant && typeof queryTenant === 'string' && queryTenant.trim()) {
    return queryTenant.trim();
  }
  return 'default';
}

let projectSettingsData: ProjectSettingsState = {
  id: 1,
  ippanel_api: '',
  free_customers_claim_limit: 20,
};

// Concurrency mutex and recent creation cache to prevent double-registration
const activeCustomerCreationLocks = new Set<string>();
interface RecentCustomerCache {
  id: string;
  company_name: string;
  phones: string[];
  customer: any;
  timestamp: number;
}
const recentCustomerCreations: RecentCustomerCache[] = [];

function normalizeContactValue(value: string, type?: string): string {
  if (!value) return '';
  let clean = value.trim();
  const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
  const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
  clean = clean.replace(/[۰-۹]/g, w => persianDigits.indexOf(w).toString());
  clean = clean.replace(/[٠-٩]/g, w => arabicDigits.indexOf(w).toString());
  clean = clean.replace(/[\s\-_()]/g, '');

  if (type === 'mobile' || type === 'landline' || (!type && /^[+0-9]/.test(clean))) {
    clean = clean.replace(/^(\+98|0098)/, '0');
    if (/^9\d{9}$/.test(clean)) {
      clean = '0' + clean;
    }
  } else if (type === 'telegram' || type === 'instagram') {
    clean = clean.replace(/^@+/, '').toLowerCase();
    clean = clean.replace(/^https?:\/\/(www\.)?(t\.me|telegram\.me|instagram\.com)\//i, '');
    clean = clean.replace(/\/$/, '');
  } else if (type === 'email' || type === 'website') {
    clean = clean.toLowerCase();
  }

  return clean;
}

function computeCustomerExpiration(c: any): any {
  if (!c) return c;
  const isExpired = Boolean(
    c.assignment_deadline &&
    c.status !== 'قرارداد' &&
    c.status !== 'لیست سیاه' &&
    new Date().getTime() > new Date(c.assignment_deadline).getTime()
  );

  const rawTenant = c.tenant_id;
  const tId = typeof rawTenant === 'object' && rawTenant !== null
    ? String(rawTenant.id)
    : rawTenant !== null && rawTenant !== undefined
    ? String(rawTenant)
    : 'default';
  const tObj = tenantsData.find(t => String(t.id) === tId || t.slug === tId);

  return {
    ...c,
    company_name: c.company_name || 'بدون نام',
    business_type: c.business_type || '',
    city: c.city || 'نامشخص',
    province: c.province || '',
    status: c.status || 'تماس برقرار نشده',
    assigned_marketer_name: c.assigned_marketer_name || 'تخصیص نیافته',
    mobile_numbers: Array.isArray(c.mobile_numbers) ? c.mobile_numbers : (typeof c.mobile_numbers === 'string' ? [c.mobile_numbers] : []),
    landline_numbers: Array.isArray(c.landline_numbers) ? c.landline_numbers : (typeof c.landline_numbers === 'string' ? [c.landline_numbers] : []),
    telegram_ids: Array.isArray(c.telegram_ids) ? c.telegram_ids : (typeof c.telegram_ids === 'string' ? [c.telegram_ids] : []),
    instagram_ids: Array.isArray(c.instagram_ids) ? c.instagram_ids : (typeof c.instagram_ids === 'string' ? [c.instagram_ids] : []),
    emails: Array.isArray(c.emails) ? c.emails : (typeof c.emails === 'string' ? [c.emails] : []),
    websites: Array.isArray(c.websites) ? c.websites : (typeof c.websites === 'string' ? [c.websites] : []),
    manager_phones: Array.isArray(c.manager_phones) ? c.manager_phones : (typeof c.manager_phones === 'string' ? [c.manager_phones] : []),
    negotiator_phones: Array.isArray(c.negotiator_phones) ? c.negotiator_phones : (typeof c.negotiator_phones === 'string' ? [c.negotiator_phones] : []),
    contacts: Array.isArray(c.contacts) ? c.contacts : [],
    is_expired: isExpired,
    claimed_from_pool: Boolean(c.claimed_from_pool),
    claimed_from_pool_at: c.claimed_from_pool_at || null,
    tenant_id: tId,
    tenant_name: (typeof rawTenant === 'object' && rawTenant?.name) || (tObj ? tObj.name : 'سازمان مرکزی'),
  };
}

function updateExpirationFlags() {
  customersData = customersData.map(c => computeCustomerExpiration(c));
}

// Directus API Request Forwarder with retry and timeout resilience
async function directusFetch(path: string, options: RequestInit = {}, retries = 2): Promise<any> {
  if (!directusUrl) {
    throw new Error('DIRECTUS_URL_NOT_CONFIGURED');
  }

  const cleanUrl = directusUrl.replace(/\/$/, '');
  const url = `${cleanUrl}${path.startsWith('/') ? path : '/' + path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (directusAdminToken) {
    headers['Authorization'] = `Bearer ${directusAdminToken}`;
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const res = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorText = await res.text();
        let parsedMessage = errorText;
        try {
          const errJson = JSON.parse(errorText);
          if (errJson.errors && Array.isArray(errJson.errors) && errJson.errors[0]?.message) {
            parsedMessage = errJson.errors[0].message;
          }
        } catch {}
        throw new Error(parsedMessage);
      }

      if (res.status === 204) {
        return { success: true };
      }

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        return await res.json();
      }

      const text = await res.text();
      return { data: text, text };
    } catch (err: any) {
      if (attempt < retries && (err.name === 'AbortError' || err.message?.includes('fetch failed') || err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT')) {
        await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
}

// Ensure at least one default tenant exists in Directus so foreign keys are valid
async function ensureDirectusTenants() {
  if (!directusUrl || !directusAdminToken) return;
  try {
    const res = await directusFetch('/items/tenants?limit=100&sort=id');
    if (res && Array.isArray(res.data) && res.data.length > 0) {
      tenantsData = res.data.map((t: any) => ({
        id: String(t.id),
        name: t.name || 'سازمان ' + t.id,
        slug: t.slug || 'org-' + t.id,
        logo: t.logo || '',
        description: t.description || '',
        phone: t.phone || '',
        address: t.address || '',
        status: t.status === 'inactive' ? 'inactive' : 'active',
        date_created: t.date_created || new Date().toISOString(),
      }));
      console.log(`Directus tenants synchronized (${tenantsData.length} tenants).`);
    } else {
      console.log('No tenants found in Directus, creating default tenant...');
      const created = await directusFetch('/items/tenants', {
        method: 'POST',
        body: JSON.stringify({
          name: 'سازمان مرکزی آلفادسک',
          slug: 'alphadesk-hq',
          status: 'active',
          description: 'سازمان اصلی و پیش‌فرض سامانه'
        })
      });
      if (created?.data) {
        tenantsData = [{
          id: String(created.data.id),
          name: created.data.name,
          slug: created.data.slug,
          logo: created.data.logo || '',
          description: created.data.description || '',
          status: 'active',
          date_created: created.data.date_created || new Date().toISOString(),
        }];
        console.log('Directus default tenant created with ID:', created.data.id);
      }
    }
  } catch (err: any) {
    console.warn('Could not sync/seed tenants in Directus:', err.message);
  }
}

// Auto-seed personnel into Directus so foreign key assigned_marketer_id is always satisfied
async function ensureDirectusPersonnel() {
  if (!directusUrl || !directusAdminToken) return;
  try {
    const res = await directusFetch('/items/personnel?limit=100');
    if (res && Array.isArray(res.data) && res.data.length === 0) {
      console.log('Seeding initial personnel into Directus...');
      const defaultTenantId = resolveDirectusTenantId('default');
      await directusFetch('/items/personnel', {
        method: 'POST',
        body: JSON.stringify(initialPersonnel.map(p => ({
          id: p.id,
          name: p.name,
          role: p.role,
          phone: p.phone,
          email: p.email,
          status: 'active',
          ...(defaultTenantId ? { tenant_id: defaultTenantId } : {})
        })))
      });
      console.log('Directus personnel auto-seeded successfully.');
    }
  } catch (err: any) {
    console.warn('Could not auto-seed personnel into Directus:', err.message);
  }
}

// Resolve any raw ID / user_id / email / name to a valid personnel.id in Directus
async function resolvePersonnelId(rawIdentifier: string | null | undefined, fallbackName?: string): Promise<{ personnelId: string | null; personnelName?: string }> {
  if (!rawIdentifier || rawIdentifier === 'none' || rawIdentifier === 'همه' || String(rawIdentifier).trim() === '') {
    return { personnelId: null };
  }
  const clean = String(rawIdentifier).trim();

  if (directusUrl && directusAdminToken) {
    try {
      // 1. Direct match on personnel ID
      const byId = await directusFetch(`/items/personnel/${encodeURIComponent(clean)}`).catch(() => null);
      if (byId?.data?.id) {
        return { personnelId: byId.data.id, personnelName: byId.data.name };
      }

      // 2. Check if clean matches user_id in personnel
      const byUserId = await directusFetch(`/items/personnel?filter[user_id][_eq]=${encodeURIComponent(clean)}`).catch(() => null);
      if (byUserId?.data && Array.isArray(byUserId.data) && byUserId.data.length > 0) {
        return { personnelId: byUserId.data[0].id, personnelName: byUserId.data[0].name };
      }

      // 3. Check if clean matches email
      const byEmail = await directusFetch(`/items/personnel?filter[email][_eq]=${encodeURIComponent(clean)}`).catch(() => null);
      if (byEmail?.data && Array.isArray(byEmail.data) && byEmail.data.length > 0) {
        return { personnelId: byEmail.data[0].id, personnelName: byEmail.data[0].name };
      }

      // 4. Check if clean matches name
      if (fallbackName || clean.length > 2) {
        const searchName = fallbackName || clean;
        const byName = await directusFetch(`/items/personnel?filter[name][_eq]=${encodeURIComponent(searchName)}`).catch(() => null);
        if (byName?.data && Array.isArray(byName.data) && byName.data.length > 0) {
          return { personnelId: byName.data[0].id, personnelName: byName.data[0].name };
        }
      }

      // 5. If it is a UUID but not found in personnel, check if it is a directus_users id
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean)) {
        const userRes = await directusFetch(`/users/${clean}`).catch(() => null);
        if (userRes?.data?.id) {
          const u = userRes.data;
          const uName = (`${u.first_name || ''} ${u.last_name || ''}`).trim() || u.email;
          const newPId = crypto.randomUUID();
          await directusFetch('/items/personnel', {
            method: 'POST',
            body: JSON.stringify({
              id: newPId,
              name: uName,
              email: u.email,
              phone: '',
              role: 'marketer',
              status: 'active',
              user_id: u.id
            })
          }).catch(() => {});
          return { personnelId: newPId, personnelName: uName };
        }
      }
    } catch {
      // ignore
    }
  }

  // Fallback in local data
  const local = personnelData.find(p => p.id === clean || (p as any).user_id === clean || p.email === clean || p.name === clean);
  if (local) {
    return { personnelId: local.id, personnelName: local.name };
  }

  return { personnelId: null };
}

function enrichPersonnel(p: any): any {
  if (!p) return p;
  const tid = p.tenant_id && typeof p.tenant_id === 'object' ? String(p.tenant_id.id || p.tenant_id.name || 'default') : String(p.tenant_id || 'default');
  const allowed = Array.isArray(p.allowed_tenant_ids)
    ? p.allowed_tenant_ids.map(String)
    : (p.permissions?.allowed_tenant_ids && Array.isArray(p.permissions.allowed_tenant_ids))
    ? p.permissions.allowed_tenant_ids.map(String)
    : [tid];

  return {
    ...p,
    id: String(p.id),
    tenant_id: tid,
    allowed_tenant_ids: allowed,
    permissions: {
      ...(p.permissions || {}),
      allowed_tenant_ids: allowed,
    },
    active: p.active !== false && p.status !== 'inactive',
  };
}

// Clean Customer Payload for Directus schema fields
function cleanCustomerPayloadForDirectus(payload: any, id: string, resolvedMarketerId?: string | null, resolvedMarketerName?: string) {
  const nowIso = new Date().toISOString();

  let marketerId: string | null = resolvedMarketerId !== undefined ? resolvedMarketerId : (payload.assigned_marketer_id || null);
  if (!marketerId || marketerId === 'همه' || String(marketerId).trim() === '' || marketerId === 'none') {
    marketerId = null;
  }

  let nextFollowup: string | null = payload.next_followup_date || null;
  if (!nextFollowup || String(nextFollowup).trim() === '') {
    nextFollowup = null;
  } else {
    try {
      nextFollowup = new Date(nextFollowup).toISOString();
    } catch {
      nextFollowup = null;
    }
  }

  let deadline: string | null = payload.assignment_deadline || null;
  if (!deadline && payload.assignment_duration_days) {
    deadline = addDays(new Date(), parseInt(payload.assignment_duration_days, 10));
  } else if (!deadline) {
    deadline = addDays(new Date(), 7);
  } else {
    try {
      deadline = new Date(deadline).toISOString();
    } catch {
      deadline = addDays(new Date(), 7);
    }
  }

  const clean: Record<string, any> = {
    id,
    company_name: (payload.company_name || 'بدون نام').trim(),
    business_type: (payload.business_type || '').trim(),
    province: (payload.province || '').trim(),
    city: (payload.city || '').trim(),
    mobile_numbers: Array.isArray(payload.mobile_numbers) ? payload.mobile_numbers.filter(Boolean) : (payload.mobile_numbers ? [payload.mobile_numbers] : []),
    landline_numbers: Array.isArray(payload.landline_numbers) ? payload.landline_numbers.filter(Boolean) : (payload.landline_numbers ? [payload.landline_numbers] : []),
    telegram_phone: (payload.telegram_phone || '').trim(),
    telegram_ids: Array.isArray(payload.telegram_ids) ? payload.telegram_ids.filter(Boolean) : (payload.telegram_ids ? [payload.telegram_ids] : []),
    instagram_ids: Array.isArray(payload.instagram_ids) ? payload.instagram_ids.filter(Boolean) : (payload.instagram_ids ? [payload.instagram_ids] : []),
    emails: Array.isArray(payload.emails) ? payload.emails.filter(Boolean) : (payload.emails ? [payload.emails] : []),
    websites: Array.isArray(payload.websites) ? payload.websites.filter(Boolean) : (payload.websites ? [payload.websites] : []),
    is_ecommerce: Boolean(payload.is_ecommerce),
    manager_name: (payload.manager_name || '').trim(),
    manager_phones: Array.isArray(payload.manager_phones) ? payload.manager_phones.filter(Boolean) : (payload.manager_phones ? [payload.manager_phones] : []),
    negotiator_name: (payload.negotiator_name || '').trim(),
    negotiator_phones: Array.isArray(payload.negotiator_phones) ? payload.negotiator_phones.filter(Boolean) : (payload.negotiator_phones ? [payload.negotiator_phones] : []),
    interview_status: payload.interview_status || 'مصاحبه اولیه انجام شده',
    interview_report: (payload.interview_report || '').trim(),
    interview_score: Number(payload.interview_score) || 5,
    next_followup_date: nextFollowup,
    assigned_marketer_id: marketerId,
    assigned_marketer_name: (resolvedMarketerName || payload.assigned_marketer_name || 'تخصیص نیافته').trim(),
    assignment_deadline: deadline,
    assignment_duration_days: payload.assignment_duration_days ? parseInt(payload.assignment_duration_days, 10) : 7,
    status: payload.status || 'تماس برقرار نشده',
    is_expired: Boolean(payload.is_expired),
    claimed_from_pool: payload.claimed_from_pool !== undefined ? Boolean(payload.claimed_from_pool) : false,
    claimed_from_pool_at: payload.claimed_from_pool_at || null,
    tenant_id: resolveDirectusTenantId(payload.tenant_id),
    date_created: payload.date_created || nowIso,
    date_updated: nowIso
  };

  return clean;
}

function extractCustomerContacts(payload: any, customerId: string): CustomerContact[] {
  const nowIso = new Date().toISOString();
  const list: CustomerContact[] = [];
  const seenContacts = new Set<string>();

  const appendContactSafe = (c: any, defaultType: string = 'mobile') => {
    if (!c || !c.value || !String(c.value).trim()) return;
    const val = String(c.value).trim();
    const chType = c.channel_type || defaultType;
    const norm = normalizeContactValue(val, chType);
    const key = `${chType}:${norm || val.toLowerCase()}`;
    if (seenContacts.has(key)) return;
    seenContacts.add(key);

    const isUuid = c.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(c.id);
    list.push({
      id: isUuid ? c.id : crypto.randomUUID(),
      customer_id: customerId,
      channel_type: chType,
      value: val,
      normalized_value: norm,
      contact_name: (c.contact_name || '').trim(),
      contact_role: (c.contact_role || '').trim(),
      is_primary: Boolean(c.is_primary),
      notes: (c.notes || '').trim(),
      date_created: c.date_created || nowIso,
      date_updated: nowIso
    });
  };

  if (Array.isArray(payload.contacts) && payload.contacts.length > 0) {
    for (const c of payload.contacts) {
      appendContactSafe(c, c.channel_type || 'mobile');
    }
  } else {
    // Synthesize from flat lists if contacts array is absent
    const mobiles = Array.isArray(payload.mobile_numbers) ? payload.mobile_numbers : [];
    mobiles.forEach((m: string, idx: number) => {
      appendContactSafe({
        value: String(m).trim(),
        channel_type: 'mobile',
        contact_name: payload.manager_name || 'مدیر',
        contact_role: idx === 0 ? 'موبایل اصلی' : 'موبایل دوم',
        is_primary: idx === 0,
      }, 'mobile');
    });

    const landlines = Array.isArray(payload.landline_numbers) ? payload.landline_numbers : [];
    landlines.forEach((l: string) => {
      appendContactSafe({
        value: String(l).trim(),
        channel_type: 'landline',
        contact_name: 'دفتر مرکزی',
        contact_role: 'تلفن ثابت',
        is_primary: false,
      }, 'landline');
    });

    const telegrams = Array.isArray(payload.telegram_ids) ? payload.telegram_ids : [];
    telegrams.forEach((t: string) => {
      appendContactSafe({
        value: String(t).trim(),
        channel_type: 'telegram',
        contact_name: 'اکانت تلگرام',
        contact_role: 'سوشال',
        is_primary: false,
      }, 'telegram');
    });

    const instagrams = Array.isArray(payload.instagram_ids) ? payload.instagram_ids : [];
    instagrams.forEach((i: string) => {
      appendContactSafe({
        value: String(i).trim(),
        channel_type: 'instagram',
        contact_name: 'پیج اینستاگرام',
        contact_role: 'سوشال',
        is_primary: false,
      }, 'instagram');
    });

    const emails = Array.isArray(payload.emails) ? payload.emails : [];
    emails.forEach((em: string) => {
      appendContactSafe({
        value: String(em).trim(),
        channel_type: 'email',
        contact_name: 'پست الکترونیک',
        contact_role: 'ایمیل',
        is_primary: false,
      }, 'email');
    });
  }

  // Ensure at least one contact is marked as primary if any exist
  if (list.length > 0 && !list.some((c) => c.is_primary)) {
    list[0].is_primary = true;
  }

  return list;
}

async function asyncCheckContactDuplicate(value: string, channelType?: string, currentCustomerId?: string) {
  if (!value || value.trim().length < 3) return null;
  const normalized = normalizeContactValue(value, channelType);
  if (!normalized) return null;

  if (directusUrl && directusAdminToken) {
    try {
      const q = `/items/customer_contacts?filter[_or][0][normalized_value][_eq]=${encodeURIComponent(normalized)}&filter[_or][1][value][_eq]=${encodeURIComponent(value.trim())}&fields=*,customer_id.*`;
      const result = await directusFetch(q);
      if (result && Array.isArray(result.data) && result.data.length > 0) {
        for (const item of result.data) {
          let cust = item.customer_id;
          const custId = (cust && typeof cust === 'object') ? cust.id : (typeof cust === 'string' ? cust : null);
          
          // If this contact belongs to the customer currently being edited, ignore it!
          if (currentCustomerId && custId && String(custId).toLowerCase() === String(currentCustomerId).toLowerCase()) {
            continue;
          }

          if (custId) {
            if (typeof cust !== 'object' || !cust.company_name) {
              const fetched = await directusFetch(`/items/customers/${custId}`).catch(() => null);
              if (fetched && fetched.data) cust = fetched.data;
            }
            if (cust) {
              const expCust = computeCustomerExpiration(cust);
              const isContract = expCust.status === 'قرارداد';
              const isExpired = !!expCust.is_expired;
              const conflictType: 'active_marketer' | 'expired' | 'contract' = isContract
                ? 'contract'
                : isExpired
                ? 'expired'
                : 'active_marketer';

              let msg = '';
              if (conflictType === 'active_marketer') {
                msg = `این شماره/اکانت قبلاً برای مشتری «${expCust.company_name}» در اختیار بازاریاب «${expCust.assigned_marketer_name}» ثبت شده و مهلت واگذاری آن هنوز معتبر است.`;
              } else if (conflictType === 'contract') {
                msg = `این شماره متعلق به مشتری قطعی «${expCust.company_name}» با قرارداد رسمی است (بازاریاب: ${expCust.assigned_marketer_name}).`;
              } else {
                msg = `این شماره قبلاً برای مشتری «${expCust.company_name}» ثبت شده بود، اما مهلت بازاریاب (${expCust.assigned_marketer_name}) منقضی شده است و امکان واگذاری مجدد دارد.`;
              }

              return {
                isDuplicate: true,
                conflictType,
                matchedContact: item,
                matchedCustomer: {
                  id: expCust.id,
                  company_name: expCust.company_name,
                  assigned_marketer_name: expCust.assigned_marketer_name,
                  assigned_marketer_id: expCust.assigned_marketer_id,
                  assignment_deadline: expCust.assignment_deadline,
                  is_expired: isExpired,
                  status: expCust.status
                },
                message: msg
              };
            }
          }
        }
      }
      // If database is active, it is the sole and authoritative source of truth!
      return null;
    } catch (e: any) {
      console.warn('Database duplicate check error:', e.message);
      return null;
    }
  }

  // Fallback to local memory store ONLY when Directus is disabled or offline
  updateExpirationFlags();
  const matchedContact = contactsData.find(c => {
    if (currentCustomerId && c.customer_id === currentCustomerId) return false;
    const cNorm = c.normalized_value || normalizeContactValue(c.value, c.channel_type);
    return cNorm === normalized;
  });

  if (!matchedContact) return null;
  const matchedCustomer = customersData.find(cust => cust.id === matchedContact.customer_id);
  if (!matchedCustomer) return null;

  const isExpired = !!matchedCustomer.is_expired;
  const isContract = matchedCustomer.status === 'قرارداد';
  const conflictType: 'active_marketer' | 'expired' | 'contract' = isContract
    ? 'contract'
    : isExpired
    ? 'expired'
    : 'active_marketer';

  let message = '';
  if (conflictType === 'active_marketer') {
    message = `این شماره/اکانت قبلاً برای مشتری «${matchedCustomer.company_name}» در اختیار بازاریاب «${matchedCustomer.assigned_marketer_name}» ثبت شده است و مهلت واگذاری آن هنوز معتبر است.`;
  } else if (conflictType === 'contract') {
    message = `این شماره متعلق به مشتری قطعی «${matchedCustomer.company_name}» با قرارداد رسمی است (بازاریاب: ${matchedCustomer.assigned_marketer_name}).`;
  } else {
    message = `این شماره قبلاً برای مشتری «${matchedCustomer.company_name}» ثبت شده بود، اما مهلت بازاریاب (${matchedCustomer.assigned_marketer_name}) منقضی شده است و امکان واگذاری مجدد دارد.`;
  }

  return {
    isDuplicate: true,
    conflictType,
    matchedContact,
    matchedCustomer: {
      id: matchedCustomer.id,
      company_name: matchedCustomer.company_name,
      assigned_marketer_name: matchedCustomer.assigned_marketer_name,
      assigned_marketer_id: matchedCustomer.assigned_marketer_id,
      assignment_deadline: matchedCustomer.assignment_deadline,
      is_expired: isExpired,
      status: matchedCustomer.status
    },
    message
  };
}

const DIRECTUS_ADMIN_ROLE_IDS = [
  '59e261e1-56f4-401e-9889-4971e2c3c4ce',
  'a45beaec-0272-4c29-89ee-122dce37f565'
];
const DIRECTUS_ADMIN_ROLE_ID = '59e261e1-56f4-401e-9889-4971e2c3c4ce';
const DIRECTUS_STAFF_ROLE_ID = 'b9c11357-4926-47ad-b020-6080cb2a62df';

// ----------------- BFF API & RBAC LAYER ----------------- //

function getRequestUser(req: Request) {
  const userId = (req.headers['x-user-id'] as string) || (req.query.user_id as string) || '';
  const personnelId = (req.headers['x-personnel-id'] as string) || (req.query.personnel_id as string) || userId;
  const userRole = (req.headers['x-user-role'] as string) || (req.query.user_role as string) || 'admin';
  const roleId = (req.headers['x-role-id'] as string) || (req.query.role_id as string) || '';
  const userName = req.headers['x-user-name'] ? decodeURIComponent(req.headers['x-user-name'] as string) : '';
  const userEmail = (req.headers['x-user-email'] as string) || '';
  const tenantId = getRequestTenantId(req);

  const isAdmin =
    userRole === 'admin' ||
    userRole === 'sales_manager' ||
    DIRECTUS_ADMIN_ROLE_IDS.includes(roleId);

  return {
    userId,
    personnelId,
    userRole: isAdmin ? 'admin' : 'marketer',
    roleId,
    isAdmin,
    userName,
    userEmail,
    tenantId,
  };
}

// Authentication Endpoints
app.post('/api/auth/register', async (req: Request, res: Response) => {
  const { email, password, name, phone, first_name, last_name } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'ایمیل و کلمه عبور الزامی هستند.' });
  }

  if (String(password).length < 6) {
    return res.status(400).json({ error: 'کلمه عبور باید حداقل ۶ کاراکتر باشد.' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const fullName = (name || `${first_name || ''} ${last_name || ''}`).trim() || cleanEmail.split('@')[0];
  const fName = (first_name || fullName.split(' ')[0] || 'کاربر').trim();
  const lName = (last_name || fullName.split(' ').slice(1).join(' ') || 'جدید').trim();
  const cleanPhone = (phone || '').trim();

  if (directusUrl && directusAdminToken) {
    try {
      // 1. Check if user already exists
      const existingRes = await directusFetch(`/users?filter[email][_eq]=${encodeURIComponent(cleanEmail)}`);
      if (existingRes && Array.isArray(existingRes.data) && existingRes.data.length > 0) {
        return res.status(400).json({ error: 'این ایمیل قبلاً در سامانه ثبت شده است. لطفاً وارد شوید.' });
      }

      // 2. Create user with staff role in Directus
      const newUserPayload = {
        email: cleanEmail,
        password: String(password),
        first_name: fName,
        last_name: lName,
        role: DIRECTUS_STAFF_ROLE_ID,
        status: 'active'
      };

      const createdUserRes = await directusFetch('/users', {
        method: 'POST',
        body: JSON.stringify(newUserPayload)
      });
      const createdUser = createdUserRes.data;

      // 3. Create or link Personnel entry with user_id & username
      const cleanUsername = String(req.body.username || '').trim() || cleanEmail.split('@')[0];
      const personnelId = crypto.randomUUID();
      const personnelPayload = {
        id: personnelId,
        name: fullName,
        username: cleanUsername,
        email: cleanEmail,
        phone: cleanPhone,
        role: 'marketer',
        status: 'active',
        user_id: createdUser.id
      };

      await directusFetch('/items/personnel', {
        method: 'POST',
        body: JSON.stringify(personnelPayload)
      }).catch(async () => {
        // If id conflict or already exists by email, update it
        const existP = await directusFetch(`/items/personnel?filter[email][_eq]=${encodeURIComponent(cleanEmail)}`).catch(() => null);
        if (existP && existP.data && existP.data.length > 0) {
          await directusFetch(`/items/personnel/${existP.data[0].id}`, {
            method: 'PATCH',
            body: JSON.stringify({ user_id: createdUser.id, name: fullName, username: cleanUsername, phone: cleanPhone })
          }).catch(() => {});
        }
      });

      // 4. Perform login to get token
      let loginToken = '';
      try {
        const loginRes = await directusFetch('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email: cleanEmail, password: String(password) })
        });
        loginToken = loginRes.data?.access_token || '';
      } catch {}

      return res.status(201).json({
        success: true,
        message: 'ثبت نام با موفقیت انجام شد.',
        access_token: loginToken,
        user: {
          id: createdUser.id,
          email: createdUser.email,
          username: cleanUsername,
          first_name: createdUser.first_name,
          last_name: createdUser.last_name,
          name: fullName,
          role_id: DIRECTUS_STAFF_ROLE_ID,
          is_admin: false,
          app_role: 'marketer'
        },
        personnel: {
          id: personnelId,
          name: fullName,
          username: cleanUsername,
          email: cleanEmail,
          phone: cleanPhone,
          role: 'marketer',
          status: 'active',
          user_id: createdUser.id
        }
      });
    } catch (err: any) {
      console.error('Registration error:', err.message);
      return res.status(500).json({ error: `خطا در ثبت نام کاربر: ${err.message}` });
    }
  }

  // Local fallback
  const cleanUsername = String(req.body.username || '').trim() || cleanEmail.split('@')[0];
  const mockUserId = crypto.randomUUID();
  const mockPersonnel: Personnel = {
    id: 'p-' + Date.now(),
    name: fullName,
    username: cleanUsername,
    email: cleanEmail,
    phone: cleanPhone,
    role: 'marketer',
    status: 'active',
    active: true
  };
  personnelData.push(mockPersonnel);

  res.status(201).json({
    success: true,
    user: {
      id: mockUserId,
      email: cleanEmail,
      username: cleanUsername,
      name: fullName,
      role_id: DIRECTUS_STAFF_ROLE_ID,
      is_admin: false,
      app_role: 'marketer'
    },
    personnel: mockPersonnel,
    access_token: 'local-token-' + mockUserId
  });
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { username, email, phone, identifier: rawId, password } = req.body;
  const inputIdentifier = String(username || email || phone || rawId || '').trim();

  if (!inputIdentifier || !password) {
    return res.status(400).json({ error: 'نام کاربری، شماره موبایل یا ایمیل و کلمه عبور را وارد کنید.' });
  }

  const cleanIdent = inputIdentifier;
  const cleanIdentLower = cleanIdent.toLowerCase();
  const normalizedPhone = normalizeContactValue(cleanIdent, 'mobile');

  if (directusUrl && directusAdminToken) {
    try {
      // 1. Resolve target email by checking personnel username/email/phone
      let targetEmail = cleanIdentLower;
      let targetPersonnelFromIdent: any = null;

      try {
        let orFilters = `filter[_or][0][username][_eq]=${encodeURIComponent(cleanIdent)}&filter[_or][1][email][_eq]=${encodeURIComponent(cleanIdentLower)}&filter[_or][2][phone][_eq]=${encodeURIComponent(cleanIdent)}`;
        if (normalizedPhone) {
          orFilters += `&filter[_or][3][phone][_eq]=${encodeURIComponent(normalizedPhone)}`;
          if (normalizedPhone.startsWith('0')) {
            orFilters += `&filter[_or][4][phone][_eq]=${encodeURIComponent(normalizedPhone.substring(1))}`;
          }
        }

        const lookupRes = await directusFetch(`/items/personnel?${orFilters}&limit=1`);
        if (lookupRes && Array.isArray(lookupRes.data) && lookupRes.data.length > 0) {
          targetPersonnelFromIdent = lookupRes.data[0];
          if (targetPersonnelFromIdent.email) {
            targetEmail = targetPersonnelFromIdent.email.toLowerCase().trim();
          }
        }
      } catch (lookupErr) {
        console.warn('Personnel identifier lookup warning:', lookupErr);
      }

      // 2. Authenticate with Directus
      let loginToken = '';
      try {
        const loginRes = await directusFetch('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email: targetEmail, password: String(password) })
        });
        loginToken = loginRes.data?.access_token || '';
      } catch (authErr: any) {
        // If failed and targetEmail was modified, retry with raw input if contains @
        if (targetEmail !== cleanIdentLower && cleanIdentLower.includes('@')) {
          try {
            const retryRes = await directusFetch('/auth/login', {
              method: 'POST',
              body: JSON.stringify({ email: cleanIdentLower, password: String(password) })
            });
            loginToken = retryRes.data?.access_token || '';
            targetEmail = cleanIdentLower;
          } catch {
            return res.status(401).json({ error: 'اطلاعات کاربری یا کلمه عبور اشتباه است.' });
          }
        } else {
          return res.status(401).json({ error: 'اطلاعات کاربری یا کلمه عبور اشتباه است.' });
        }
      }

      // 3. Fetch full user info including role
      const userRes = await directusFetch(`/users?filter[email][_eq]=${encodeURIComponent(targetEmail)}&fields=*,role.*`);
      if (!userRes || !Array.isArray(userRes.data) || userRes.data.length === 0) {
        return res.status(404).json({ error: 'اطلاعات کاربری یافت نشد.' });
      }

      const user = userRes.data[0];
      const roleId = typeof user.role === 'object' ? user.role?.id : user.role;
      const isAdmin = roleId === DIRECTUS_ADMIN_ROLE_ID || user.role?.name?.toLowerCase() === 'administrator';
      const fullName = (`${user.first_name || ''} ${user.last_name || ''}`).trim() || user.email;

      // 4. Find or link personnel record
      let personnelItem: any = targetPersonnelFromIdent;
      if (!personnelItem) {
        const pRes = await directusFetch(`/items/personnel?filter[_or][0][user_id][_eq]=${user.id}&filter[_or][1][email][_eq]=${encodeURIComponent(targetEmail)}`).catch(() => null);
        if (pRes && Array.isArray(pRes.data) && pRes.data.length > 0) {
          personnelItem = pRes.data[0];
          if (!personnelItem.user_id) {
            await directusFetch(`/items/personnel/${personnelItem.id}`, {
              method: 'PATCH',
              body: JSON.stringify({ user_id: user.id })
            }).catch(() => {});
          }
        } else {
          const newPId = crypto.randomUUID();
          const createdP = await directusFetch('/items/personnel', {
            method: 'POST',
            body: JSON.stringify({
              id: newPId,
              name: fullName,
              username: cleanIdent.includes('@') ? cleanIdent.split('@')[0] : (normalizedPhone ? `user_${normalizedPhone.slice(-4)}` : cleanIdent),
              email: targetEmail,
              phone: normalizedPhone || '',
              role: isAdmin ? 'admin' : 'marketer',
              status: 'active',
              user_id: user.id
            })
          }).catch(() => null);
          personnelItem = createdP?.data || {
            id: newPId,
            name: fullName,
            username: cleanIdent.includes('@') ? cleanIdent.split('@')[0] : (normalizedPhone ? `user_${normalizedPhone.slice(-4)}` : cleanIdent),
            email: targetEmail,
            phone: normalizedPhone || '',
            role: isAdmin ? 'admin' : 'marketer',
            status: 'active',
            user_id: user.id
          };
        }
      }

      return res.json({
        success: true,
        access_token: loginToken,
        user: {
          id: user.id,
          email: user.email,
          username: personnelItem?.username,
          first_name: user.first_name,
          last_name: user.last_name,
          name: fullName,
          role_id: roleId,
          is_admin: isAdmin,
          app_role: isAdmin ? 'admin' : 'marketer'
        },
        personnel: personnelItem
      });
    } catch (err: any) {
      console.error('Login error:', err.message);
      return res.status(500).json({ error: `خطا در ورود به سامانه: ${err.message}` });
    }
  }

  // Fallback if Directus is offline
  const checkMatches = (p: Personnel) => {
    if (p.username && p.username.toLowerCase() === cleanIdentLower) return true;
    if (p.email && p.email.toLowerCase() === cleanIdentLower) return true;
    if (p.phone) {
      if (p.phone === cleanIdent) return true;
      if (normalizedPhone && normalizeContactValue(p.phone, 'mobile') === normalizedPhone) return true;
      if (cleanIdent.replace(/\D/g, '') && p.phone.replace(/\D/g, '') === cleanIdent.replace(/\D/g, '')) return true;
    }
    return false;
  };

  const found = personnelData.find(checkMatches) || initialPersonnel.find(checkMatches);

  if (found) {
    return res.json({
      success: true,
      access_token: 'local-token-' + found.id,
      user: {
        id: found.id,
        email: found.email,
        username: found.username,
        name: found.name,
        role_id: found.role === 'admin' ? DIRECTUS_ADMIN_ROLE_ID : DIRECTUS_STAFF_ROLE_ID,
        is_admin: found.role === 'admin',
        app_role: found.role
      },
      personnel: found
    });
  }

  res.status(401).json({ error: 'کاربری با این مشخصات یافت نشد.' });
});

app.get('/api/auth/me', async (req: Request, res: Response) => {
  const { userId, personnelId, userRole, isAdmin, userName, userEmail } = getRequestUser(req);
  if (!userId && !personnelId) {
    return res.status(401).json({ error: 'کاربر وارد نشده است.' });
  }

  res.json({
    user: {
      id: userId || personnelId,
      name: userName || 'کاربر سامانه',
      email: userEmail,
      is_admin: isAdmin,
      app_role: userRole
    },
    personnel_id: personnelId
  });
});

app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    port: PORT,
    database_connected: Boolean(directusUrl && directusAdminToken)
  });
});

let lastBffStatusCache: { timestamp: number; data: any } | null = null;
let personnelSeeded = false;

app.get('/api/bff-status', async (req: Request, res: Response) => {
  const nowMs = Date.now();
  if (lastBffStatusCache && nowMs - lastBffStatusCache.timestamp < 5000) {
    return res.json(lastBffStatusCache.data);
  }

  let isDbReachable = false;
  let dbError: string | null = null;
  let dbCounts = {
    customers: 0,
    customer_contacts: 0,
    customer_reports: 0,
    cold_leads: 0,
    administrative_reports: 0,
    personnel: 0
  };

  if (directusUrl && directusAdminToken) {
    try {
      await directusFetch('/server/ping', { method: 'GET' });
      isDbReachable = true;

      try {
        const [cRes, contRes, repRes, lRes, admRes, pRes] = await Promise.all([
          directusFetch('/items/customers?limit=0&meta=total_count').catch(() => null),
          directusFetch('/items/customer_contacts?limit=0&meta=total_count').catch(() => null),
          directusFetch('/items/customer_reports?limit=0&meta=total_count').catch(() => null),
          directusFetch('/items/cold_leads?limit=0&meta=total_count').catch(() => null),
          directusFetch('/items/administrative_reports?limit=0&meta=total_count').catch(() => null),
          directusFetch('/items/personnel?limit=0&meta=total_count').catch(() => null),
        ]);

        dbCounts = {
          customers: cRes?.meta?.total_count ?? 0,
          customer_contacts: contRes?.meta?.total_count ?? 0,
          customer_reports: repRes?.meta?.total_count ?? 0,
          cold_leads: lRes?.meta?.total_count ?? 0,
          administrative_reports: admRes?.meta?.total_count ?? 0,
          personnel: pRes?.meta?.total_count ?? 0,
        };
      } catch {}

      if (!personnelSeeded) {
        personnelSeeded = true;
        ensureDirectusPersonnel().catch(() => {});
      }
    } catch (err: any) {
      isDbReachable = false;
      dbError = err.message || 'عدم امکان اتصال به پایگاه داده مرکزی';
    }
  }

  const responseData = {
    mode: isDbReachable ? 'DATABASE_CONNECTED' : 'LOCAL_BFF_FALLBACK',
    has_token: !!directusAdminToken,
    database_reachable: isDbReachable,
    error: dbError,
    counts: dbCounts
  };

  lastBffStatusCache = { timestamp: nowMs, data: responseData };
  res.json(responseData);
});

app.post('/api/bff-config', async (req: Request, res: Response) => {
  const { url, token } = req.body;
  if (typeof url === 'string') directusUrl = url.trim();
  if (typeof token === 'string') directusAdminToken = token.trim();

  if (directusUrl && directusAdminToken) {
    await ensureDirectusPersonnel().catch(() => {});
  }

  res.json({ success: true, has_token: !!directusAdminToken });
});

const handleSystemSchema = (req: Request, res: Response) => {
  try {
    const schemaPath = path.resolve(__dirname, 'directus-schema.json');
    if (fs.existsSync(schemaPath)) {
      const content = fs.readFileSync(schemaPath, 'utf8');
      return res.setHeader('Content-Type', 'application/json').send(content);
    }
    return res.status(404).json({ error: 'فایل ساختار پایگاه داده یافت نشد.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};
app.get('/api/system-schema', handleSystemSchema);
app.get('/api/directus-schema', handleSystemSchema);

// Seed demo data into Database
const handleSeedInitialData = async (req: Request, res: Response) => {
  if (!directusUrl || !directusAdminToken) {
    return res.status(400).json({ error: 'پایگاه داده متصل نیست.' });
  }

  try {
    await ensureDirectusPersonnel();

    const existing = await directusFetch('/items/customers?limit=1');
    if (existing && Array.isArray(existing.data) && existing.data.length > 0) {
      return res.json({ success: true, message: 'پایگاه داده دارای پرونده مشتری است.' });
    }

    for (const sample of initialCustomers) {
      const custId = crypto.randomUUID();
      const payload = cleanCustomerPayloadForDirectus({ ...sample, id: custId }, custId);
      await directusFetch('/items/customers', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      const sampleContacts = initialContacts.filter(c => c.customer_id === sample.id);
      for (const ct of sampleContacts) {
        await directusFetch('/items/customer_contacts', {
          method: 'POST',
          body: JSON.stringify({
            ...ct,
            id: crypto.randomUUID(),
            customer_id: custId
          })
        });
      }

      const sampleReports = initialReports.filter(r => r.customer_id === sample.id);
      for (const rp of sampleReports) {
        await directusFetch('/items/customer_reports', {
          method: 'POST',
          body: JSON.stringify({
            ...rp,
            id: crypto.randomUUID(),
            customer_id: custId
          })
        });
      }
    }

    return res.json({ success: true, message: 'داده‌های اولیه نمونه با موفقیت در پایگاه داده درج شدند.' });
  } catch (err: any) {
    return res.status(500).json({ error: `خطا در درج داده‌های نمونه در پایگاه داده: ${err.message}` });
  }
};
app.post('/api/seed-initial-data', handleSeedInitialData);
app.post('/api/seed-directus', handleSeedInitialData);

// ----------------- TENANT MANAGEMENT APIS (مدیریت سازمان‌ها / شرکت‌ها) ----------------- //

app.get('/api/tenants', async (req: Request, res: Response) => {
  if (directusUrl && directusAdminToken) {
    try {
      const resp = await directusFetch('/items/tenants?sort=id');
      if (resp?.data && Array.isArray(resp.data)) {
        if (resp.data.length === 0) {
          await ensureDirectusTenants();
        } else {
          tenantsData = resp.data.map((t: any) => ({
            id: String(t.id),
            name: t.name || 'سازمان ' + t.id,
            slug: t.slug || 'org-' + t.id,
            logo: t.logo || '',
            description: t.description || '',
            phone: t.phone || '',
            address: t.address || '',
            status: t.status === 'inactive' ? 'inactive' : 'active',
            date_created: t.date_created || new Date().toISOString(),
          }));
        }
      }
    } catch {
      // fallback
    }
  }
  res.json(tenantsData);
});

app.post('/api/tenants', async (req: Request, res: Response) => {
  const { isAdmin } = getRequestUser(req);
  if (!isAdmin) {
    return res.status(403).json({ error: 'FORBIDDEN', message: 'فقط مدیر سیستم مجاز به ایجاد سازمان جدید است.' });
  }

  const { name, slug, phone, address, logo, description, status } = req.body;
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'نام سازمان الزامی است.' });
  }

  const cleanName = String(name).trim();
  const cleanSlug = slug ? String(slug).trim() : 'org-' + Date.now();
  const directusBody: Record<string, any> = {
    name: cleanName,
    slug: cleanSlug,
    description: (description || address || '').trim(),
    status: status || 'active',
  };
  if (logo && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(logo)) {
    directusBody.logo = logo;
  }

  if (directusUrl && directusAdminToken) {
    try {
      const created = await directusFetch('/items/tenants', {
        method: 'POST',
        body: JSON.stringify(directusBody),
      });
      if (created?.data) {
        const item: Tenant = {
          id: String(created.data.id),
          name: created.data.name,
          slug: created.data.slug,
          phone: phone ? String(phone).trim() : '',
          address: address ? String(address).trim() : '',
          description: created.data.description || '',
          logo: created.data.logo || '',
          status: created.data.status || 'active',
          date_created: created.data.date_created || new Date().toISOString(),
        };
        tenantsData.push(item);
        return res.status(201).json(item);
      }
    } catch (e: any) {
      console.warn('Directus tenants save error:', e.message);
    }
  }

  const newTenant: Tenant = {
    id: String(Date.now()),
    name: cleanName,
    slug: cleanSlug,
    phone: phone ? String(phone).trim() : '',
    address: address ? String(address).trim() : '',
    description: (description || '').trim(),
    logo: logo || '',
    status: status || 'active',
    date_created: new Date().toISOString(),
  };

  tenantsData.push(newTenant);
  res.status(201).json(newTenant);
});

app.patch('/api/tenants/:id', async (req: Request, res: Response) => {
  const { isAdmin } = getRequestUser(req);
  if (!isAdmin) {
    return res.status(403).json({ error: 'FORBIDDEN', message: 'فقط مدیر سیستم مجاز به ویرایش سازمان است.' });
  }

  const { id } = req.params;
  const patch = req.body;

  const idx = tenantsData.findIndex((t) => String(t.id) === String(id));
  if (idx !== -1) {
    tenantsData[idx] = { ...tenantsData[idx], ...patch };
  }

  if (directusUrl && directusAdminToken) {
    try {
      const directusPatch: Record<string, any> = {};
      if (patch.name !== undefined) directusPatch.name = String(patch.name).trim();
      if (patch.slug !== undefined) directusPatch.slug = String(patch.slug).trim();
      if (patch.description !== undefined) directusPatch.description = String(patch.description).trim();
      if (patch.status !== undefined) directusPatch.status = patch.status;
      if (patch.logo && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(patch.logo)) {
        directusPatch.logo = patch.logo;
      }

      const patched = await directusFetch(`/items/tenants/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(directusPatch),
      });
      if (patched?.data) {
        const item: Tenant = {
          ...tenantsData[idx],
          ...patched.data,
          id: String(patched.data.id)
        };
        if (idx !== -1) tenantsData[idx] = item;
        return res.json(item);
      }
    } catch (e: any) {
      console.warn('Directus tenant patch error:', e.message);
    }
  }

  if (idx === -1) return res.status(404).json({ error: 'سازمان مورد نظر یافت نشد.' });
  res.json(tenantsData[idx]);
});

app.delete('/api/tenants/:id', async (req: Request, res: Response) => {
  const { isAdmin } = getRequestUser(req);
  if (!isAdmin) {
    return res.status(403).json({ error: 'FORBIDDEN', message: 'فقط مدیر سیستم مجاز به حذف سازمان است.' });
  }

  const { id } = req.params;
  if (id === 'default' || id === '1') {
    return res.status(400).json({ error: 'سازمان پیش‌فرض سیستم قابل حذف نیست.' });
  }

  tenantsData = tenantsData.filter((t) => String(t.id) !== String(id));

  if (directusUrl && directusAdminToken) {
    try {
      await directusFetch(`/items/tenants/${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch (e: any) {
      console.warn('Directus tenant delete error:', e.message);
    }
  }

  res.json({ success: true });
});

// Personnel API
app.get('/api/personnel', async (req: Request, res: Response) => {
  const tenantId = getRequestTenantId(req);
  const enrichPersonnel = (p: any) => {
    const rawT = p.tenant_id;
    const tId = typeof rawT === 'object' && rawT !== null
      ? String(rawT.id)
      : rawT !== null && rawT !== undefined
      ? String(rawT)
      : 'default';
    const tObj = tenantsData.find(t => String(t.id) === tId || t.slug === tId);
    let allowedTenantIds: string[] = [];
    if (Array.isArray(p.allowed_tenant_ids) && p.allowed_tenant_ids.length > 0) {
      allowedTenantIds = p.allowed_tenant_ids.map(String);
    } else if (Array.isArray(p.permissions?.allowed_tenant_ids) && p.permissions.allowed_tenant_ids.length > 0) {
      allowedTenantIds = p.permissions.allowed_tenant_ids.map(String);
    } else if (tId) {
      allowedTenantIds = [tId];
    }
    return {
      ...p,
      tenant_id: tId,
      tenant_name: (typeof rawT === 'object' && rawT?.name) || (tObj ? tObj.name : (tId === 'default' ? 'سازمان مرکزی آلفادسک' : tId)),
      allowed_tenant_ids: allowedTenantIds,
    };
  };

  if (directusUrl && directusAdminToken) {
    try {
      const result = await directusFetch('/items/personnel?sort=id');
      if (result && Array.isArray(result.data)) {
        if (result.data.length === 0) {
          await ensureDirectusPersonnel();
          const refreshed = await directusFetch('/items/personnel?sort=id');
          let list = (refreshed.data || initialPersonnel).map(enrichPersonnel);
          if (tenantId && tenantId !== 'all') {
            list = list.filter((p: any) => matchesTenant(p.tenant_id, tenantId));
          }
          return res.json(list);
        }
        let list = result.data.map(enrichPersonnel);
        if (tenantId && tenantId !== 'all') {
          list = list.filter((p: any) => matchesTenant(p.tenant_id, tenantId));
        }
        return res.json(list);
      }
    } catch (e: any) {
      return res.status(502).json({ error: `خطا در فراخوانی پرسنل از پایگاه داده مرکزی: ${e.message}` });
    }
  }
  let list = (personnelData.length > 0 ? personnelData : initialPersonnel).map(enrichPersonnel);
  if (tenantId && tenantId !== 'all') {
    list = list.filter((p: any) => matchesTenant(p.tenant_id, tenantId));
  }
  res.json(list);
});

// Create new Colleague / Personnel
app.post('/api/personnel', async (req: Request, res: Response) => {
  const {
    name,
    username,
    email,
    phone,
    phones,
    role,
    permissions,
    password,
    status,
    tenant_id,
    emergency_contact_name,
    emergency_contact_phone,
    emergency_contact_relation,
    family_contacts,
    allowed_tenant_ids,
  } = req.body;
  const { isAdmin } = getRequestUser(req);
  const targetTenantId = tenant_id || getRequestTenantId(req);

  if (!isAdmin) {
    return res.status(403).json({ error: 'فقط مدیر سیستم اجازه ثبت همکار جدید را دارد.' });
  }

  if (!name || !email) {
    return res.status(400).json({ error: 'نام و ایمیل همکار الزامی است.' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const cleanName = String(name).trim();
  const cleanUsername = String(username || '').trim() || cleanEmail.split('@')[0];
  const cleanPhone = String(phone || '').trim();
  const colleagueRole = role || 'marketer';
  const newPId = crypto.randomUUID();
  const cleanAllowedTenants = Array.isArray(allowed_tenant_ids)
    ? allowed_tenant_ids.map(String)
    : [String(targetTenantId || 'default')];

  let directusUserId: string | null = null;

  if (directusUrl && directusAdminToken) {
    try {
      // Create user account if password given or user doesn't exist
      if (password) {
        const roleId = colleagueRole === 'admin' ? DIRECTUS_ADMIN_ROLE_ID : DIRECTUS_STAFF_ROLE_ID;
        const createdUser = await directusFetch('/users', {
          method: 'POST',
          body: JSON.stringify({
            first_name: cleanName.split(' ')[0] || cleanName,
            last_name: cleanName.split(' ').slice(1).join(' ') || '',
            email: cleanEmail,
            password: String(password),
            role: roleId,
            status: 'active'
          })
        }).catch(() => null);
        if (createdUser?.data?.id) {
          directusUserId = createdUser.data.id;
        }
      }

      const mergedPermissions = {
        ...(permissions || {}),
        allowed_tenant_ids: cleanAllowedTenants,
      };

      const newPersonnelDoc: any = {
        id: newPId,
        tenant_id: resolveDirectusTenantId(targetTenantId),
        name: cleanName,
        username: cleanUsername,
        email: cleanEmail,
        phone: cleanPhone,
        role: colleagueRole,
        status: status || 'active',
        user_id: directusUserId,
        permissions: mergedPermissions,
      };

      if (phones) newPersonnelDoc.phones = phones;
      if (emergency_contact_name !== undefined) newPersonnelDoc.emergency_contact_name = String(emergency_contact_name).trim();
      if (emergency_contact_phone !== undefined) newPersonnelDoc.emergency_contact_phone = String(emergency_contact_phone).trim();
      if (emergency_contact_relation !== undefined) newPersonnelDoc.emergency_contact_relation = String(emergency_contact_relation).trim();
      if (family_contacts !== undefined) newPersonnelDoc.family_contacts = family_contacts;

      const created = await directusFetch('/items/personnel', {
        method: 'POST',
        body: JSON.stringify(newPersonnelDoc)
      });

      const finalItem = enrichPersonnel(created?.data || newPersonnelDoc);
      personnelData.push(finalItem);
      return res.status(201).json(finalItem);
    } catch (err: any) {
      console.error('Create colleague error in Directus:', err.message);
    }
  }

  const localItem: Personnel = {
    id: newPId,
    tenant_id: targetTenantId,
    allowed_tenant_ids: cleanAllowedTenants,
    name: cleanName,
    username: cleanUsername,
    email: cleanEmail,
    phone: cleanPhone,
    phones: phones || undefined,
    permissions: {
      ...(permissions || {}),
      allowed_tenant_ids: cleanAllowedTenants,
    },
    emergency_contact_name: emergency_contact_name ? String(emergency_contact_name).trim() : undefined,
    emergency_contact_phone: emergency_contact_phone ? String(emergency_contact_phone).trim() : undefined,
    emergency_contact_relation: emergency_contact_relation ? String(emergency_contact_relation).trim() : undefined,
    family_contacts: family_contacts || undefined,
    role: colleagueRole,
    status: status || 'active',
    active: true
  };
  personnelData.push(localItem);
  res.status(201).json(localItem);
});

// Update Colleague / Personnel
app.patch('/api/personnel/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    name,
    username,
    email,
    phone,
    phones,
    role,
    permissions,
    status,
    tenant_id,
    emergency_contact_name,
    emergency_contact_phone,
    emergency_contact_relation,
    family_contacts,
    allowed_tenant_ids,
  } = req.body;
  const { isAdmin } = getRequestUser(req);

  if (!isAdmin) {
    return res.status(403).json({ error: 'فقط مدیر سیستم اجازه ویرایش مشخصات همکاران را دارد.' });
  }

  const patchPayload: Record<string, any> = {};
  if (name) patchPayload.name = String(name).trim();
  if (username !== undefined) patchPayload.username = String(username).trim();
  if (email) patchPayload.email = String(email).trim().toLowerCase();
  if (phone !== undefined) patchPayload.phone = String(phone).trim();
  if (phones !== undefined) patchPayload.phones = phones;
  if (role) patchPayload.role = role;
  if (permissions !== undefined) patchPayload.permissions = permissions;
  if (allowed_tenant_ids !== undefined) {
    patchPayload.allowed_tenant_ids = Array.isArray(allowed_tenant_ids) ? allowed_tenant_ids.map(String) : [];
    patchPayload.permissions = {
      ...(patchPayload.permissions || {}),
      allowed_tenant_ids: patchPayload.allowed_tenant_ids,
    };
  }
  if (status) patchPayload.status = status;
  if (tenant_id !== undefined) patchPayload.tenant_id = tenant_id;
  if (emergency_contact_name !== undefined) patchPayload.emergency_contact_name = String(emergency_contact_name).trim();
  if (emergency_contact_phone !== undefined) patchPayload.emergency_contact_phone = String(emergency_contact_phone).trim();
  if (emergency_contact_relation !== undefined) patchPayload.emergency_contact_relation = String(emergency_contact_relation).trim();
  if (family_contacts !== undefined) patchPayload.family_contacts = family_contacts;

  if (directusUrl && directusAdminToken) {
    try {
      const directusPersonnelPatch = { ...patchPayload };
      if (directusPersonnelPatch.tenant_id !== undefined) {
        directusPersonnelPatch.tenant_id = resolveDirectusTenantId(directusPersonnelPatch.tenant_id);
      }
      const updated = await directusFetch(`/items/personnel/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(directusPersonnelPatch)
      });
      if (updated?.data) {
        const enriched = enrichPersonnel(updated.data);
        const idx = personnelData.findIndex(p => p.id === id);
        if (idx >= 0) personnelData[idx] = { ...personnelData[idx], ...enriched };
        return res.json(enriched);
      }
    } catch (err: any) {}
  }

  const idx = personnelData.findIndex(p => p.id === id);
  if (idx >= 0) {
    personnelData[idx] = enrichPersonnel({ ...personnelData[idx], ...patchPayload });
    return res.json(personnelData[idx]);
  }

  res.status(404).json({ error: 'همکار مورد نظر یافت نشد.' });
});

// Delete Colleague / Personnel
app.delete('/api/personnel/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { isAdmin } = getRequestUser(req);

  if (!isAdmin) {
    return res.status(403).json({ error: 'فقط مدیر سیستم اجازه حذف همکاران را دارد.' });
  }

  if (directusUrl && directusAdminToken) {
    try {
      await directusFetch(`/items/personnel/${id}`, { method: 'DELETE' });
    } catch {}
  }

  personnelData = personnelData.filter(p => p.id !== id);
  res.json({ success: true, message: 'همکار با موفقیت حذف شد.' });
});

// Bulk Extend Ownership (تمدید مالکیت گروهی مشتریان)
app.post('/api/customers/bulk-extend', async (req: Request, res: Response) => {
  const { customer_ids, extend_days } = req.body;
  const { isAdmin } = getRequestUser(req);

  if (!isAdmin) {
    return res.status(403).json({ error: 'فقط مدیر سیستم اجازه تمدید مالکیت پرونده‌ها را دارد.' });
  }

  if (!Array.isArray(customer_ids) || customer_ids.length === 0) {
    return res.status(400).json({ error: 'حداقل یک مشتری را برای تمدید مهلت انتخاب کنید.' });
  }

  const days = parseInt(extend_days, 10) || 7;
  const nowTime = new Date();
  const newDeadline = addDays(nowTime, days);

  let updatedCount = 0;

  for (const cId of customer_ids) {
    const patchData = {
      assignment_deadline: newDeadline,
      assignment_duration_days: days,
      is_expired: false,
      date_updated: nowTime.toISOString()
    };

    if (directusUrl && directusAdminToken) {
      try {
        await directusFetch(`/items/customers/${cId}`, {
          method: 'PATCH',
          body: JSON.stringify(patchData)
        });

        // Add note to report history
        const reportHistory: CustomerReport = {
          id: crypto.randomUUID(),
          customer_id: cId,
          negotiator_name: 'مدیریت سامانه',
          negotiation_phone: '-',
          report_text: `مهلت مالکیت پرونده توسط مدیریت به مدت ${days} روز دیگر تمدید شد. (سررسید جدید: ${newDeadline.split('T')[0]})`,
          negotiation_score: 5,
          next_followup_date: addDays(nowTime, 2),
          negotiation_status: 'پیگیری قبل از انقضا',
          date_created: nowTime.toISOString()
        };
        await directusFetch('/items/customer_reports', {
          method: 'POST',
          body: JSON.stringify(reportHistory)
        }).catch(() => {});

        updatedCount++;
      } catch {}
    } else {
      const idx = customersData.findIndex(c => c.id === cId);
      if (idx >= 0) {
        customersData[idx] = {
          ...customersData[idx],
          ...patchData
        };
        updatedCount++;
      }
    }
  }

  res.json({
    success: true,
    updatedCount,
    message: `مهلت مالکیت ${updatedCount} پرونده با موفقیت به مدت ${days} روز تمدید شد.`
  });
});

// Bulk Switch Ownership (سوئیچ و واگذاری مالکیت گروهی مشتریان)
app.post('/api/customers/bulk-switch', async (req: Request, res: Response) => {
  const { customer_ids, new_marketer_id, new_marketer_name, duration_days } = req.body;
  const { isAdmin } = getRequestUser(req);

  if (!isAdmin) {
    return res.status(403).json({ error: 'فقط مدیر سیستم اجازه انتقال مالکیت پرونده‌ها را دارد.' });
  }

  if (!Array.isArray(customer_ids) || customer_ids.length === 0) {
    return res.status(400).json({ error: 'حداقل یک پرونده مشتری را انتخاب کنید.' });
  }

  if (!new_marketer_id) {
    return res.status(400).json({ error: 'همکار مقصد برای انتقال پرونده‌ها مشخص نشده است.' });
  }

  const days = parseInt(duration_days, 10) || 7;
  const nowTime = new Date();
  const newDeadline = addDays(nowTime, days);

  const resolved = await resolvePersonnelId(new_marketer_id, new_marketer_name);
  const targetMarketerName = (resolved.personnelName || new_marketer_name || 'تخصیص نیافته').trim();

  let updatedCount = 0;

  for (const cId of customer_ids) {
    const patchData = {
      assigned_marketer_id: resolved.personnelId,
      assigned_marketer_name: targetMarketerName,
      assignment_deadline: newDeadline,
      assignment_duration_days: days,
      is_expired: false,
      date_updated: nowTime.toISOString()
    };

    if (directusUrl && directusAdminToken) {
      try {
        await directusFetch(`/items/customers/${cId}`, {
          method: 'PATCH',
          body: JSON.stringify(patchData)
        });

        const reportHistory: CustomerReport = {
          id: crypto.randomUUID(),
          customer_id: cId,
          negotiator_name: 'مدیریت سامانه',
          negotiation_phone: '-',
          report_text: `مالکیت پرونده توسط مدیریت به همکار «${targetMarketerName}» انتقال یافت با مهلت جدید ${days} روزه.`,
          negotiation_score: 5,
          next_followup_date: addDays(nowTime, 2),
          negotiation_status: 'پیگیری قبل از انقضا',
          date_created: nowTime.toISOString()
        };
        await directusFetch('/items/customer_reports', {
          method: 'POST',
          body: JSON.stringify(reportHistory)
        }).catch(() => {});

        updatedCount++;
      } catch {}
    } else {
      const idx = customersData.findIndex(c => c.id === cId);
      if (idx >= 0) {
        customersData[idx] = {
          ...customersData[idx],
          ...patchData
        };
        updatedCount++;
      }
    }
  }

  res.json({
    success: true,
    updatedCount,
    message: `مالکیت ${updatedCount} پرونده مشتری با موفقیت به «${targetMarketerName}» واگذار شد.`
  });
});

// Contacts API
app.get('/api/contacts/check-duplicate', async (req: Request, res: Response) => {
  const { value, channel_type, customer_id } = req.query;
  if (!value || typeof value !== 'string') {
    return res.json({ isDuplicate: false });
  }
  const dup = await asyncCheckContactDuplicate(
    value,
    typeof channel_type === 'string' ? channel_type : undefined,
    typeof customer_id === 'string' ? customer_id : undefined
  );
  res.json(dup || { isDuplicate: false });
});

app.get('/api/contacts', async (req: Request, res: Response) => {
  const { customer_id, search, type } = req.query;
  if (directusUrl && directusAdminToken) {
    try {
      let q = '/items/customer_contacts?sort=-date_created&limit=500';
      if (customer_id) q += `&filter[customer_id][_eq]=${encodeURIComponent(customer_id as string)}`;
      const result = await directusFetch(q);
      if (result && Array.isArray(result.data)) {
        return res.json(result.data);
      }
    } catch (e: any) {
      return res.status(502).json({ error: `خطا در دریافت لیست مخاطبین از پایگاه داده مرکزی: ${e.message}` });
    }
  }

  let list = [...contactsData];
  if (customer_id && typeof customer_id === 'string') {
    list = list.filter(ct => ct.customer_id === customer_id);
  }
  if (type && typeof type === 'string') {
    list = list.filter(ct => ct.channel_type === type);
  }
  if (search && typeof search === 'string') {
    const s = search.toLowerCase();
    list = list.filter(ct =>
      ct.value.toLowerCase().includes(s) ||
      (ct.contact_name && ct.contact_name.toLowerCase().includes(s)) ||
      (ct.contact_role && ct.contact_role.toLowerCase().includes(s))
    );
  }
  res.json(list);
});

app.post('/api/contacts', async (req: Request, res: Response) => {
  const payload = req.body;
  if (!payload.value || !payload.customer_id) {
    return res.status(400).json({ error: 'شماره و شناسه مشتری الزامی است.' });
  }

  const dup = await asyncCheckContactDuplicate(payload.value, payload.channel_type, payload.customer_id);
  if (dup && dup.conflictType === 'active_marketer') {
    return res.status(409).json({
      error: 'DUPLICATE_CONTACT',
      message: dup.message,
      conflict: dup
    });
  }

  const nowIso = new Date().toISOString();
  const newContact: CustomerContact = {
    id: crypto.randomUUID(),
    customer_id: payload.customer_id,
    channel_type: payload.channel_type || 'mobile',
    value: payload.value.trim(),
    normalized_value: normalizeContactValue(payload.value, payload.channel_type),
    contact_name: payload.contact_name || '',
    contact_role: payload.contact_role || '',
    is_primary: Boolean(payload.is_primary),
    notes: payload.notes || '',
    date_created: nowIso,
    date_updated: nowIso
  };

  if (directusUrl && directusAdminToken) {
    try {
      const created = await directusFetch('/items/customer_contacts', {
        method: 'POST',
        body: JSON.stringify(newContact)
      });
      return res.status(201).json(created.data || newContact);
    } catch (err: any) {
      console.error('Contact create error:', err.message);
      return res.status(500).json({
        error: 'CONTACT_SAVE_FAILED',
        message: `خطا در ذخیره شماره تماس در پایگاه داده مرکزی: ${err.message}`
      });
    }
  }

  contactsData.unshift(newContact);
  res.status(201).json(newContact);
});

app.patch('/api/contacts/:id', async (req: Request, res: Response) => {
  const payload = req.body;
  const nowIso = new Date().toISOString();

  if (payload.value) {
    const dup = await asyncCheckContactDuplicate(
      payload.value,
      payload.channel_type,
      payload.customer_id
    );
    if (dup && dup.conflictType === 'active_marketer') {
      return res.status(409).json({
        error: 'DUPLICATE_CONTACT',
        message: dup.message,
        conflict: dup
      });
    }
  }

  const cleanPatch: Record<string, any> = { ...payload, date_updated: nowIso };
  if (payload.value) {
    cleanPatch.normalized_value = normalizeContactValue(payload.value, payload.channel_type);
  }

  if (directusUrl && directusAdminToken) {
    try {
      const patched = await directusFetch(`/items/customer_contacts/${req.params.id}`, {
        method: 'PATCH',
        body: JSON.stringify(cleanPatch)
      });
      return res.json(patched.data);
    } catch (err: any) {
      return res.status(500).json({
        error: 'CONTACT_UPDATE_FAILED',
        message: `خطا در ویرایش شماره تماس در پایگاه داده مرکزی: ${err.message}`
      });
    }
  }

  const index = contactsData.findIndex(c => c.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Contact not found' });
  }

  contactsData[index] = { ...contactsData[index], ...cleanPatch };
  res.json(contactsData[index]);
});

app.delete('/api/contacts/:id', async (req: Request, res: Response) => {
  if (directusUrl && directusAdminToken) {
    try {
      await directusFetch(`/items/customer_contacts/${req.params.id}`, {
        method: 'DELETE'
      });
      return res.status(204).send();
    } catch (err: any) {
      return res.status(500).json({
        error: 'CONTACT_DELETE_FAILED',
        message: `خطا در حذف شماره از پایگاه داده مرکزی: ${err.message}`
      });
    }
  }

  contactsData = contactsData.filter(c => c.id !== req.params.id);
  res.status(204).send();
});

// Customers API with BFF Role-Based Access Control
app.get('/api/customers', async (req: Request, res: Response) => {
  const { search, status, marketer_id, expired_only, page, limit } = req.query;
  const { userId, personnelId, userRole, isAdmin, userName, tenantId } = getRequestUser(req);

  const reqLimit = limit ? parseInt(String(limit), 10) : 500;
  const reqPage = page ? parseInt(String(page), 10) : 1;

  if (directusUrl && directusAdminToken) {
    try {
      let directusQuery = `/items/customers?sort=-date_created&meta=*&fields=*,contacts.*`;
      if (reqLimit > 0) {
        directusQuery += `&limit=${reqLimit}&page=${reqPage}`;
      } else {
        directusQuery += `&limit=-1`;
      }

      const result = await directusFetch(directusQuery);
      if (result && Array.isArray(result.data)) {
        let list = result.data.map((c: any) => computeCustomerExpiration(c));

        // Tenant-based filtering
        if (tenantId && tenantId !== 'all') {
          list = list.filter((c: any) => matchesTenant(c.tenant_id, tenantId));
        }

        // Role-Based Filtering:
        // Admin sees ALL customers
        // Staff/Marketer sees ONLY their own assigned customers
        if (!isAdmin && (userId || personnelId)) {
          list = list.filter((c: any) =>
            c.assigned_marketer_id === personnelId ||
            c.assigned_marketer_id === userId ||
            (userName && c.assigned_marketer_name === userName)
          );
        }

        if (search && typeof search === 'string') {
          const s = search.toLowerCase();
          list = list.filter((c: any) =>
            c.company_name?.toLowerCase().includes(s) ||
            c.manager_name?.toLowerCase().includes(s) ||
            c.city?.toLowerCase().includes(s) ||
            c.business_type?.toLowerCase().includes(s) ||
            (Array.isArray(c.mobile_numbers) && c.mobile_numbers.some((m: string) => m.includes(s))) ||
            (Array.isArray(c.contacts) && c.contacts.some((ct: any) =>
              ct.value?.toLowerCase().includes(s) ||
              ct.contact_name?.toLowerCase().includes(s) ||
              ct.contact_role?.toLowerCase().includes(s)
            ))
          );
        }

        if (status && typeof status === 'string' && status !== 'همه') {
          list = list.filter((c: any) => c.status === status);
        }

        if (marketer_id && typeof marketer_id === 'string' && marketer_id !== 'همه') {
          list = list.filter((c: any) => c.assigned_marketer_id === marketer_id);
        }

        if (expired_only === 'true') {
          list = list.filter((c: any) => c.is_expired);
        }

        const totalMetaCount = result.meta?.total_count ? parseInt(String(result.meta.total_count), 10) : list.length;
        const filterMetaCount = result.meta?.filter_count ? parseInt(String(result.meta.filter_count), 10) : list.length;

        // Add pagination response headers
        res.setHeader('X-Total-Count', String(totalMetaCount));
        res.setHeader('X-Filter-Count', String(filterMetaCount));
        res.setHeader('X-Page', String(reqPage));
        res.setHeader('X-Limit', String(reqLimit));

        return res.json(list);
      }
    } catch (e: any) {
      console.error('Fetch customers error:', e.message);
      return res.status(502).json({
        error: 'DB_UNREACHABLE',
        message: `عدم دسترسی به پایگاه داده مرکزی: ${e.message}`
      });
    }
  }

  // Fallback to local memory ONLY if database is NOT configured
  updateExpirationFlags();
  let filtered = customersData.map(c => ({
    ...c,
    contacts: contactsData.filter(ct => ct.customer_id === c.id)
  }));

  if (tenantId && tenantId !== 'all') {
    filtered = filtered.filter(c => matchesTenant(c.tenant_id, tenantId));
  }

  if (!isAdmin && (userId || personnelId)) {
    filtered = filtered.filter(c =>
      c.assigned_marketer_id === personnelId ||
      c.assigned_marketer_id === userId ||
      (userName && c.assigned_marketer_name === userName)
    );
  }

  if (search && typeof search === 'string') {
    const s = search.toLowerCase();
    filtered = filtered.filter(c =>
      c.company_name.toLowerCase().includes(s) ||
      c.manager_name.toLowerCase().includes(s) ||
      c.city.toLowerCase().includes(s) ||
      c.business_type.toLowerCase().includes(s) ||
      c.mobile_numbers.some(m => m.includes(s)) ||
      c.contacts?.some(ct =>
        ct.value.toLowerCase().includes(s) ||
        (ct.contact_name && ct.contact_name.toLowerCase().includes(s)) ||
        (ct.contact_role && ct.contact_role.toLowerCase().includes(s))
      )
    );
  }

  if (status && typeof status === 'string' && status !== 'همه') {
    filtered = filtered.filter(c => c.status === status);
  }

  if (marketer_id && typeof marketer_id === 'string' && marketer_id !== 'همه') {
    filtered = filtered.filter(c => c.assigned_marketer_id === marketer_id);
  }

  if (expired_only === 'true') {
    filtered = filtered.filter(c => c.is_expired);
  }

  res.json(filtered);
});

app.get('/api/customers/:id', async (req: Request, res: Response) => {
  const { userId, userRole, userName } = getRequestUser(req);

  if (directusUrl && directusAdminToken) {
    try {
      const [custRes, repRes, contRes] = await Promise.all([
        directusFetch(`/items/customers/${req.params.id}?fields=*,contacts.*`).catch(() => null),
        directusFetch(`/items/customer_reports?filter[customer_id][_eq]=${req.params.id}&sort=-date_created`).catch(() => null),
        directusFetch(`/items/customer_contacts?filter[customer_id][_eq]=${req.params.id}&sort=-date_created`).catch(() => null),
      ]);

      if (custRes && custRes.data) {
        const customer = computeCustomerExpiration(custRes.data);
        const reports = repRes?.data || [];
        const contacts = (Array.isArray(customer.contacts) && customer.contacts.length > 0)
          ? customer.contacts
          : (contRes?.data || []);

        const isOwner = !customer.assigned_marketer_id || customer.assigned_marketer_id === 'none' || customer.assigned_marketer_id === userId || (userName && customer.assigned_marketer_name === userName) || customer.is_expired;
        if (userRole === 'marketer' && userId && !isOwner) {
          return res.status(403).json({
            error: 'FORBIDDEN',
            message: 'دسترسی به این پرونده برای شما مجاز نیست (در اختیار بازاریاب دیگری است).'
          });
        }
        const canEdit = userRole === 'admin' || userRole === 'sales_manager' || isOwner;

        return res.json({ ...customer, reports, contacts, can_edit: canEdit });
      } else {
        return res.status(404).json({ error: 'پرونده مشتری در سامانه یافت نشد.' });
      }
    } catch (e: any) {
      return res.status(502).json({ error: `خطا در دریافت پرونده مشتری از پایگاه داده مرکزی: ${e.message}` });
    }
  }

  updateExpirationFlags();
  const customer = customersData.find(c => c.id === req.params.id);
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found' });
  }
  const reports = reportsData.filter(r => r.customer_id === req.params.id);
  const contacts = contactsData.filter(ct => ct.customer_id === req.params.id);
  res.json({ ...customer, reports, contacts });
});

// Create Customer
app.post('/api/customers', async (req: Request, res: Response) => {
  const payload = req.body;
  const { userId, personnelId, userRole, userName, isAdmin } = getRequestUser(req);
  const newId = crypto.randomUUID();
  const nowIso = new Date().toISOString();

  // ONLY Admin can assign the customer to arbitrary marketers or customize assignment duration.
  // Non-admin marketers always auto-assign newly registered customers to themselves with standard duration.
  let rawMarketerId = payload.assigned_marketer_id;
  let rawMarketerName = payload.assigned_marketer_name;
  let rawDurationDays = payload.assignment_duration_days ? parseInt(payload.assignment_duration_days, 10) : 7;

  if (!isAdmin) {
    rawMarketerId = personnelId || userId;
    rawMarketerName = userName || rawMarketerName || 'بازاریاب';
    rawDurationDays = 7;
    payload.assignment_duration_days = 7;
  } else if (!rawMarketerId || rawMarketerId === 'none' || rawMarketerId === 'همه') {
    rawMarketerId = null;
    rawMarketerName = 'تخصیص نیافته';
  }

  // Pre-validate incoming contacts for duplicates against database
  const incomingContactsList: Array<{ value: string; channel_type?: string }> = [];
  if (Array.isArray(payload.contacts)) {
    payload.contacts.forEach((c: any) => {
      if (c && c.value) incomingContactsList.push({ value: c.value, channel_type: c.channel_type });
    });
  }
  if (Array.isArray(payload.mobile_numbers)) {
    payload.mobile_numbers.forEach((m: string) => {
      if (m) incomingContactsList.push({ value: m, channel_type: 'mobile' });
    });
  }

  const normalizedPhones = Array.from(
    new Set(
      incomingContactsList
        .map((item) => normalizeContactValue(item.value, item.channel_type))
        .filter(Boolean)
    )
  );
  const normalizedCompanyName = (payload.company_name || '').trim().toLowerCase();

  // 1. Idempotency Check: if exact same company or phones were created within the last 15 seconds, return the already created customer
  const existingRecent = recentCustomerCreations.find((rc) => {
    if (Date.now() - rc.timestamp > 15000) return false;
    if (normalizedCompanyName && rc.company_name === normalizedCompanyName) return true;
    if (normalizedPhones.length > 0 && rc.phones.some((p) => normalizedPhones.includes(p))) return true;
    return false;
  });

  if (existingRecent) {
    return res.status(200).json(existingRecent.customer);
  }

  // 2. Concurrency Lock: prevent parallel double-submissions from duplicate clicks
  const lockKey = `${normalizedCompanyName}::${normalizedPhones.slice().sort().join(',')}`;
  if (activeCustomerCreationLocks.has(lockKey)) {
    return res.status(409).json({
      error: 'CREATION_IN_PROGRESS',
      message: 'فرآیند ثبت این پرونده مشتری هم‌اکنون در دست اقدام است. لطفاً چند لحظه شکیبا باشید.'
    });
  }
  activeCustomerCreationLocks.add(lockKey);

  try {
    const dupResults = await Promise.all(
      incomingContactsList.map((item) => asyncCheckContactDuplicate(item.value, item.channel_type))
    );
    const blocker = dupResults.find((dup) => dup && dup.conflictType === 'active_marketer');
    if (blocker) {
      return res.status(409).json({
        error: 'DUPLICATE_CONTACT',
        message: blocker.message,
        conflict: blocker
      });
    }

    // Resolve assigned marketer to a verified personnel.id
    const resolvedMarketer = await resolvePersonnelId(rawMarketerId, rawMarketerName);
    const directusCustPayload = cleanCustomerPayloadForDirectus(
      payload,
      newId,
      resolvedMarketer.personnelId,
      resolvedMarketer.personnelName || rawMarketerName
    );
    const contactsList = extractCustomerContacts(payload, newId);

    if (directusUrl && directusAdminToken) {
      try {
        // 1. Insert customer into Database
        const createdRes = await directusFetch('/items/customers', {
          method: 'POST',
          body: JSON.stringify(directusCustPayload)
        });
        const finalCust = createdRes.data;
        const finalId = finalCust.id;

        // 2. Batch insert contacts into customer_contacts table
        let insertedContacts: CustomerContact[] = [];
        if (contactsList.length > 0) {
          try {
            const batchRes = await directusFetch('/items/customer_contacts', {
              method: 'POST',
              body: JSON.stringify(contactsList.map(c => ({ ...c, customer_id: finalId })))
            });
            insertedContacts = Array.isArray(batchRes?.data) ? batchRes.data : contactsList;
          } catch (bErr: any) {
            console.error('Batch contact insert warning, trying individually:', bErr.message);
            for (const ct of contactsList) {
              try {
                const ctRes = await directusFetch('/items/customer_contacts', {
                  method: 'POST',
                  body: JSON.stringify({ ...ct, customer_id: finalId })
                });
                insertedContacts.push(ctRes.data || { ...ct, customer_id: finalId });
              } catch (singleErr: any) {
                console.error('Contact insert error:', singleErr.message);
                insertedContacts.push({ ...ct, customer_id: finalId });
              }
            }
          }
        }

        // 3. Insert initial report if given
        if (directusCustPayload.interview_report) {
          const initialReport: CustomerReport = {
            id: crypto.randomUUID(),
            customer_id: finalId,
            negotiator_name: directusCustPayload.negotiator_name || directusCustPayload.assigned_marketer_name || 'کارشناس پذیرش',
            negotiation_phone: directusCustPayload.negotiator_phones[0] || directusCustPayload.mobile_numbers[0] || '',
            report_text: `[گزارش مصاحبه اولیه]: ${directusCustPayload.interview_report}`,
            negotiation_score: directusCustPayload.interview_score,
            next_followup_date: directusCustPayload.next_followup_date,
            negotiation_status: directusCustPayload.status,
            date_created: nowIso
          };
          await directusFetch('/items/customer_reports', {
            method: 'POST',
            body: JSON.stringify(initialReport)
          }).catch((rErr: any) => console.error('Initial report insert error:', rErr.message));
        }

        const fullCustomer = {
          ...finalCust,
          contacts: insertedContacts
        };

        // Cache recently created customer for idempotency
        recentCustomerCreations.push({
          id: finalId,
          company_name: normalizedCompanyName,
          phones: normalizedPhones,
          customer: fullCustomer,
          timestamp: Date.now()
        });
        if (recentCustomerCreations.length > 50) {
          recentCustomerCreations.splice(0, recentCustomerCreations.length - 50);
        }

        return res.status(201).json(fullCustomer);
      } catch (err: any) {
        console.error('Customer creation failed:', err.message);
        return res.status(500).json({
          error: 'CUSTOMER_SAVE_FAILED',
          message: `خطا در ذخیره‌سازی پرونده مشتری در پایگاه داده مرکزی: ${err.message}`
        });
      }
    }

    // Fallback ONLY when database is not configured
    const fullCreated: Customer = { ...(directusCustPayload as any), contacts: contactsList };
    customersData.unshift(fullCreated);
    contactsData.push(...contactsList);

    recentCustomerCreations.push({
      id: newId,
      company_name: normalizedCompanyName,
      phones: normalizedPhones,
      customer: fullCreated,
      timestamp: Date.now()
    });
    if (recentCustomerCreations.length > 50) {
      recentCustomerCreations.splice(0, recentCustomerCreations.length - 50);
    }

    return res.status(201).json(fullCreated);
  } finally {
    activeCustomerCreationLocks.delete(lockKey);
  }
});

// Update Customer
app.patch('/api/customers/:id', async (req: Request, res: Response) => {
  const payload = req.body;
  const { userId, personnelId, userRole, isAdmin } = getRequestUser(req);
  const nowIso = new Date().toISOString();

  if (directusUrl && directusAdminToken) {
    try {
      // Role check: Marketer cannot edit an active customer belonging to another marketer
      if (!isAdmin && (userId || personnelId)) {
        const currentCustRes = await directusFetch(`/items/customers/${req.params.id}?fields=assigned_marketer_id,assignment_deadline,status`).catch(() => null);
        if (currentCustRes?.data) {
          const expCust = computeCustomerExpiration(currentCustRes.data);
          const isAssignedToMe = expCust.assigned_marketer_id === personnelId || expCust.assigned_marketer_id === userId || !expCust.assigned_marketer_id;
          if (!isAssignedToMe && !expCust.is_expired && expCust.status !== 'تماس نگرفته') {
            return res.status(403).json({
              error: 'FORBIDDEN',
              message: 'این پرونده در اختیار بازاریاب دیگری است و امکان تغییر آن را ندارید.'
            });
          }
        }
      }

      // Check duplicates only for newly added numbers not already in database for this customer
      if (Array.isArray(payload.contacts)) {
        const existingContRes = await directusFetch(`/items/customer_contacts?filter[customer_id][_eq]=${req.params.id}&fields=value,channel_type,normalized_value`).catch(() => null);
        const existingValues = new Set(
          (existingContRes?.data || []).map((c: any) => c.normalized_value || normalizeContactValue(c.value, c.channel_type))
        );

        const newContactsToCheck = payload.contacts.filter(
          (c: any) =>
            c &&
            c.value &&
            String(c.value).trim().length >= 3 &&
            !existingValues.has(normalizeContactValue(c.value, c.channel_type))
        );

        if (newContactsToCheck.length > 0) {
          const dupResults = await Promise.all(
            newContactsToCheck.map((c: any) => asyncCheckContactDuplicate(c.value, c.channel_type, req.params.id))
          );
          const conflict = dupResults.find((dup) => dup && dup.conflictType === 'active_marketer');
          if (conflict) {
            return res.status(409).json({
              error: 'DUPLICATE_CONTACT',
              message: conflict.message,
              conflict: conflict
            });
          }
        }
      }

      const cleanPatch: Record<string, any> = {};
      if (payload.company_name !== undefined) cleanPatch.company_name = String(payload.company_name).trim();
      if (payload.business_type !== undefined) cleanPatch.business_type = String(payload.business_type).trim();
      if (payload.province !== undefined) cleanPatch.province = String(payload.province).trim();
      if (payload.city !== undefined) cleanPatch.city = String(payload.city).trim();
      if (payload.mobile_numbers !== undefined) cleanPatch.mobile_numbers = payload.mobile_numbers;
      if (payload.landline_numbers !== undefined) cleanPatch.landline_numbers = payload.landline_numbers;
      if (payload.telegram_phone !== undefined) cleanPatch.telegram_phone = payload.telegram_phone;
      if (payload.telegram_ids !== undefined) cleanPatch.telegram_ids = payload.telegram_ids;
      if (payload.instagram_ids !== undefined) cleanPatch.instagram_ids = payload.instagram_ids;
      if (payload.emails !== undefined) cleanPatch.emails = payload.emails;
      if (payload.websites !== undefined) cleanPatch.websites = payload.websites;
      if (payload.is_ecommerce !== undefined) cleanPatch.is_ecommerce = Boolean(payload.is_ecommerce);
      if (payload.manager_name !== undefined) cleanPatch.manager_name = payload.manager_name;
      if (payload.manager_phones !== undefined) cleanPatch.manager_phones = payload.manager_phones;
      if (payload.negotiator_name !== undefined) cleanPatch.negotiator_name = payload.negotiator_name;
      if (payload.negotiator_phones !== undefined) cleanPatch.negotiator_phones = payload.negotiator_phones;
      if (payload.interview_status !== undefined) cleanPatch.interview_status = payload.interview_status;
      if (payload.interview_report !== undefined) cleanPatch.interview_report = payload.interview_report;
      if (payload.interview_score !== undefined) cleanPatch.interview_score = Number(payload.interview_score);
      if (payload.status !== undefined) cleanPatch.status = payload.status;
      if (payload.is_expired !== undefined) cleanPatch.is_expired = Boolean(payload.is_expired);

      // ONLY Admin can change assigned marketer and assignment deadline/duration
      if (isAdmin) {
        if (payload.assignment_duration_days !== undefined) cleanPatch.assignment_duration_days = Number(payload.assignment_duration_days);

        if (payload.assigned_marketer_id !== undefined) {
          const resolved = await resolvePersonnelId(payload.assigned_marketer_id, payload.assigned_marketer_name);
          cleanPatch.assigned_marketer_id = resolved.personnelId;
          if (resolved.personnelName) {
            cleanPatch.assigned_marketer_name = resolved.personnelName;
          } else if (payload.assigned_marketer_name !== undefined) {
            cleanPatch.assigned_marketer_name = String(payload.assigned_marketer_name).trim();
          }
        } else if (payload.assigned_marketer_name !== undefined) {
          cleanPatch.assigned_marketer_name = String(payload.assigned_marketer_name).trim();
        }

        if (payload.assignment_deadline !== undefined) {
          cleanPatch.assignment_deadline = (!payload.assignment_deadline || String(payload.assignment_deadline).trim() === '') ? null : new Date(payload.assignment_deadline).toISOString();
        }
      }

      if (payload.next_followup_date !== undefined) {
        cleanPatch.next_followup_date = (!payload.next_followup_date || String(payload.next_followup_date).trim() === '') ? null : new Date(payload.next_followup_date).toISOString();
      }
      cleanPatch.date_updated = nowIso;

      const patched = await directusFetch(`/items/customers/${req.params.id}`, {
        method: 'PATCH',
        body: JSON.stringify(cleanPatch)
      });

      let updatedContacts: CustomerContact[] = [];
      if (Array.isArray(payload.contacts)) {
        // Delete old contacts from database
        const oldCont = await directusFetch(`/items/customer_contacts?filter[customer_id][_eq]=${req.params.id}&fields=id`).catch(() => null);
        if (oldCont && Array.isArray(oldCont.data) && oldCont.data.length > 0) {
          const oldIds = oldCont.data.map((c: any) => c.id).filter(Boolean);
          if (oldIds.length > 0) {
            await directusFetch('/items/customer_contacts', {
              method: 'DELETE',
              body: JSON.stringify(oldIds)
            }).catch((delErr) => console.error('Error batch deleting old contacts:', delErr.message));
          }
        }

        const newContactsList = extractCustomerContacts(payload, req.params.id);
        if (newContactsList.length > 0) {
          try {
            const batchRes = await directusFetch('/items/customer_contacts', {
              method: 'POST',
              body: JSON.stringify(newContactsList)
            });
            updatedContacts = Array.isArray(batchRes?.data) ? batchRes.data : newContactsList;
          } catch (postErr: any) {
            console.error('Batch contact insert warning, trying individually:', postErr.message);
            for (const ct of newContactsList) {
              try {
                const ctRes = await directusFetch('/items/customer_contacts', {
                  method: 'POST',
                  body: JSON.stringify(ct)
                });
                updatedContacts.push(ctRes.data || ct);
              } catch (singleErr: any) {
                console.error('Single contact insert error:', singleErr.message);
                updatedContacts.push(ct);
              }
            }
          }
        }
      } else {
        const contRes = await directusFetch(`/items/customer_contacts?filter[customer_id][_eq]=${req.params.id}`).catch(() => null);
        updatedContacts = contRes?.data || [];
      }

      const fullCustomer = {
        ...(patched.data || cleanPatch),
        id: req.params.id,
        contacts: updatedContacts
      };

      return res.json(fullCustomer);
    } catch (err: any) {
      console.error('Customer update error:', err.message);
      return res.status(500).json({
        error: 'CUSTOMER_UPDATE_FAILED',
        message: `خطا در بروزرسانی پرونده مشتری در پایگاه داده: ${err.message}`
      });
    }
  }

  // Fallback for offline mode
  const index = customersData.findIndex(c => c.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  const offlinePatch = { ...payload };
  if (!isAdmin) {
    delete offlinePatch.assigned_marketer_id;
    delete offlinePatch.assigned_marketer_name;
    delete offlinePatch.assignment_duration_days;
    delete offlinePatch.assignment_deadline;
  }

  customersData[index] = {
    ...customersData[index],
    ...offlinePatch,
    date_updated: nowIso
  };

  res.json(customersData[index]);
});

// Delete Customer
app.delete('/api/customers/:id', async (req: Request, res: Response) => {
  const { userRole } = getRequestUser(req);
  if (userRole === 'marketer' || userRole === 'operator') {
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'حذف پرونده مشتری فقط توسط مدیر فروش یا مدیر سیستم امکان‌پذیر است.'
    });
  }

  if (directusUrl && directusAdminToken) {
    try {
      const [contactsRes, repRes] = await Promise.all([
        directusFetch(`/items/customer_contacts?filter[customer_id][_eq]=${req.params.id}&fields=id`).catch(() => null),
        directusFetch(`/items/customer_reports?filter[customer_id][_eq]=${req.params.id}&fields=id`).catch(() => null),
      ]);

      if (contactsRes && Array.isArray(contactsRes.data) && contactsRes.data.length > 0) {
        const cIds = contactsRes.data.map((c: any) => c.id).filter(Boolean);
        if (cIds.length > 0) {
          await directusFetch('/items/customer_contacts', {
            method: 'DELETE',
            body: JSON.stringify(cIds)
          }).catch(() => {});
        }
      }
      if (repRes && Array.isArray(repRes.data) && repRes.data.length > 0) {
        const rIds = repRes.data.map((r: any) => r.id).filter(Boolean);
        if (rIds.length > 0) {
          await directusFetch('/items/customer_reports', {
            method: 'DELETE',
            body: JSON.stringify(rIds)
          }).catch(() => {});
        }
      }

      await directusFetch(`/items/customers/${req.params.id}`, { method: 'DELETE' });

      return res.json({ success: true });
    } catch (err: any) {
      console.error('Customer delete error:', err.message);
      return res.status(500).json({
        error: 'CUSTOMER_DELETE_FAILED',
        message: `خطا در حذف پرونده مشتری از پایگاه داده: ${err.message}`
      });
    }
  }

  customersData = customersData.filter(c => c.id !== req.params.id);
  reportsData = reportsData.filter(r => r.customer_id !== req.params.id);
  contactsData = contactsData.filter(ct => ct.customer_id !== req.params.id);
  res.json({ success: true });
});

// Re-assign Marketer
app.post('/api/customers/:id/reassign', async (req: Request, res: Response) => {
  const { new_marketer_id, new_marketer_name, duration_days } = req.body;
  const { userId, personnelId, userRole } = getRequestUser(req);
  const days = duration_days ? parseInt(duration_days, 10) : 7;
  const nowTime = new Date();
  const deadline = addDays(nowTime, days);

  if (userRole === 'marketer' && (userId || personnelId)) {
    if (directusUrl && directusAdminToken) {
      const currentCustRes = await directusFetch(`/items/customers/${req.params.id}?fields=assigned_marketer_id,assignment_deadline,status`).catch(() => null);
      if (currentCustRes?.data) {
        const expCust = computeCustomerExpiration(currentCustRes.data);
        const isMine = expCust.assigned_marketer_id === personnelId || expCust.assigned_marketer_id === userId;
        if (!isMine && !expCust.is_expired) {
          return res.status(403).json({
            error: 'FORBIDDEN',
            message: 'این مشتری دارای بازاریاب فعال است و فقط مدیر فروش می‌تواند آن را واگذار کند.'
          });
        }
      }
    }
  }

  const resolved = await resolvePersonnelId(new_marketer_id, new_marketer_name);

  const patchData = {
    assigned_marketer_id: resolved.personnelId,
    assigned_marketer_name: (resolved.personnelName || new_marketer_name || 'تخصیص نیافته').trim(),
    assignment_deadline: deadline,
    assignment_duration_days: days,
    is_expired: false,
    date_updated: nowTime.toISOString()
  };

  if (directusUrl && directusAdminToken) {
    try {
      const patchedCust = await directusFetch(`/items/customers/${req.params.id}`, {
        method: 'PATCH',
        body: JSON.stringify(patchData)
      });

      const reportHistory: CustomerReport = {
        id: crypto.randomUUID(),
        customer_id: req.params.id,
        negotiator_name: 'مدیریت بازاریابی',
        negotiation_phone: '-',
        report_text: `تغییر بازاریاب مسئول به «${patchData.assigned_marketer_name}» با مهلت جدید ${days} روزه برای پیگیری و انعقاد قرارداد.`,
        negotiation_score: 5,
        next_followup_date: addDays(nowTime, 2),
        negotiation_status: patchedCust.data?.status || 'پیگیری قرارداد',
        date_created: nowTime.toISOString()
      };

      await directusFetch('/items/customer_reports', {
        method: 'POST',
        body: JSON.stringify(reportHistory)
      }).catch(() => {});

      return res.json(patchedCust.data);
    } catch (err: any) {
      console.error('Customer reassign error:', err.message);
      return res.status(500).json({
        error: 'CUSTOMER_REASSIGN_FAILED',
        message: `خطا در واگذاری مجدد مشتری در پایگاه داده: ${err.message}`
      });
    }
  }

  const index = customersData.findIndex(c => c.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  customersData[index] = {
    ...customersData[index],
    ...patchData
  };

  res.json(customersData[index]);
});

// -------------------------------------------------------------
// PROJECT SETTINGS & FREE POOL QUOTA (تنظیمات سامانه و حوضچه آزاد)
// -------------------------------------------------------------

// Helper to compute a marketer's active quota stats
function computePersonnelFreeQuota(targetPersonnelId: string, customLimit?: number) {
  const effectiveLimit = customLimit || projectSettingsData.free_customers_claim_limit || 20;

  const userCustomers = customersData.filter((c) => {
    return (
      c.assigned_marketer_id === targetPersonnelId ||
      (c.assigned_marketer_name && targetPersonnelId && c.assigned_marketer_name === targetPersonnelId)
    );
  });

  const activeUnclosed = userCustomers.filter(
    (c) => c.status !== 'قرارداد' && c.status !== 'لیست سیاه'
  );

  const successfulContracts = userCustomers.filter(
    (c) => c.status === 'قرارداد'
  );

  const activeUnclosedCount = activeUnclosed.length;
  const successfulCount = successfulContracts.length;
  // If marketer has at least 1 successful contract, they unlock continued claiming!
  // If they have 0 successful contracts, they can claim up to effectiveLimit (default 20).
  const canClaim = successfulCount > 0 || activeUnclosedCount < effectiveLimit;
  const remainingQuota = successfulCount > 0 ? 999 : Math.max(0, effectiveLimit - activeUnclosedCount);

  return {
    claimLimit: effectiveLimit,
    activeUnclosedCount,
    successfulCount,
    canClaim,
    remainingQuota,
    requiresSuccessToUnlock: activeUnclosedCount >= effectiveLimit && successfulCount === 0,
  };
}

// Get Project Settings (Directus singleton with fallback)
app.get('/api/project-settings', async (req: Request, res: Response) => {
  if (directusUrl && directusAdminToken) {
    try {
      const resp = await directusFetch('/items/project_settings').catch(() => null);
      if (resp?.data) {
        const item = Array.isArray(resp.data) ? resp.data[0] : resp.data;
        if (item) {
          projectSettingsData = { ...projectSettingsData, ...item };
        }
      }
    } catch {
      // ignore
    }
  }
  res.json(projectSettingsData);
});

// Update Project Settings (Admin only)
app.patch('/api/project-settings', async (req: Request, res: Response) => {
  const { isAdmin, userRole } = getRequestUser(req);
  if (!isAdmin && userRole !== 'admin') {
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'فقط مدیر سیستم مجاز به تغییر تنظیمات سامانه است.',
    });
  }

  const patch = req.body;
  projectSettingsData = { ...projectSettingsData, ...patch };

  if (directusUrl && directusAdminToken) {
    try {
      // First try standard singleton patch
      const patched = await directusFetch('/items/project_settings', {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }).catch(async () => {
        return await directusFetch(`/items/project_settings/${projectSettingsData.id || 1}`, {
          method: 'PATCH',
          body: JSON.stringify(patch),
        });
      });
      if (patched?.data) {
        projectSettingsData = { ...projectSettingsData, ...patched.data };
      }
    } catch (err: any) {
      console.warn('Directus project_settings sync warning:', err.message);
    }
  }

  res.json(projectSettingsData);
});

// Get Quota Status for Free Customers Pool
app.get('/api/customers/free-quota', async (req: Request, res: Response) => {
  const { personnelId, userId } = getRequestUser(req);
  const targetId = (req.query.personnel_id as string) || personnelId || userId;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

  if (!targetId) {
    return res.json({
      claimLimit: limit,
      activeUnclosedCount: 0,
      successfulCount: 0,
      canClaim: true,
      remainingQuota: limit,
      requiresSuccessToUnlock: false,
    });
  }

  const quota = computePersonnelFreeQuota(targetId, limit);
  res.json(quota);
});

// Claim Customer from Free Customers Pool
app.post('/api/customers/:id/claim-free', async (req: Request, res: Response) => {
  const { userId, personnelId, userName, userRole } = getRequestUser(req);
  const targetPersonnelId = req.body.personnel_id || personnelId || userId;
  const targetPersonnelName = req.body.personnel_name || userName;
  const days = req.body.duration_days ? parseInt(req.body.duration_days, 10) : 10;
  const limit = req.body.claim_limit ? parseInt(req.body.claim_limit, 10) : 20;

  if (!targetPersonnelId) {
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'شناسه کارشناس متقاضی یافت نشد. لطفاً مجدداً وارد سامانه شوید.',
    });
  }

  // 1. Quota check
  const quota = computePersonnelFreeQuota(targetPersonnelId, limit);
  if (!quota.canClaim) {
    return res.status(403).json({
      error: 'QUOTA_LIMIT_REACHED',
      message: `شما به سقف مجاز (${limit} پرونده فعال) رسیده‌اید. برای اختصاص پرونده جدید از بخش مشتریان آزاد، باید حداقل یک قرارداد موفق به ثبت برسانید.`,
      quota,
    });
  }

  // 2. Fetch customer and verify it is indeed free
  let targetCustomer: any = null;

  if (directusUrl && directusAdminToken) {
    try {
      const custRes = await directusFetch(`/items/customers/${req.params.id}`);
      if (custRes?.data) {
        targetCustomer = computeCustomerExpiration(custRes.data);
      }
    } catch {
      // fallback
    }
  }

  if (!targetCustomer) {
    const local = customersData.find((c) => c.id === req.params.id);
    if (local) {
      targetCustomer = computeCustomerExpiration(local);
    }
  }

  if (!targetCustomer) {
    return res.status(404).json({
      error: 'NOT_FOUND',
      message: 'پرونده مشتری مورد نظر در سامانه یافت نشد.',
    });
  }

  if (targetCustomer.status === 'قرارداد') {
    return res.status(400).json({
      error: 'ALREADY_CLOSED',
      message: 'این پرونده قبلاً به قرارداد موفق منتهی شده و امکان برداشت مجدد ندارد.',
    });
  }

  if (targetCustomer.status === 'لیست سیاه') {
    return res.status(400).json({
      error: 'BLACKLISTED',
      message: 'این پرونده در لیست سیاه قرار دارد و قابل واگذاری نیست.',
    });
  }

  const isFree =
    targetCustomer.is_expired ||
    !targetCustomer.assigned_marketer_id ||
    targetCustomer.assigned_marketer_name === 'تخصیص نیافته' ||
    (targetCustomer.assignment_deadline && new Date().getTime() > new Date(targetCustomer.assignment_deadline).getTime());

  if (!isFree) {
    return res.status(400).json({
      error: 'NOT_FREE',
      message: `این پرونده در حال حاضر تحت مهلت فعال پیگیری توسط «${targetCustomer.assigned_marketer_name}» قرار دارد و آزاد نیست.`,
    });
  }

  // 3. Resolve target personnel name
  const resolved = await resolvePersonnelId(targetPersonnelId, targetPersonnelName);
  const nowTime = new Date();
  const deadline = addDays(nowTime, days);

  const patchData = {
    assigned_marketer_id: resolved.personnelId,
    assigned_marketer_name: (resolved.personnelName || targetPersonnelName || 'کارشناس فروش').trim(),
    assignment_date: nowTime.toISOString(),
    assignment_deadline: deadline,
    assignment_duration_days: days,
    is_expired: false,
    claimed_from_pool: true,
    claimed_from_pool_at: nowTime.toISOString(),
    status: 'تماس برقرار نشده',
    date_updated: nowTime.toISOString(),
  };

  // 4. Update in Directus or Local store
  if (directusUrl && directusAdminToken) {
    try {
      const patched = await directusFetch(`/items/customers/${req.params.id}`, {
        method: 'PATCH',
        body: JSON.stringify(patchData),
      });

      const reportHistory: CustomerReport = {
        id: crypto.randomUUID(),
        customer_id: req.params.id,
        negotiator_name: patchData.assigned_marketer_name,
        negotiation_phone: targetCustomer.manager_phones?.[0] || targetCustomer.mobile_numbers?.[0] || '-',
        report_text: `پرونده توسط «${patchData.assigned_marketer_name}» از حوضچه مشتریان آزاد انتخاب و با مهلت پیگیری ${days} روزه به ایشان اختصاص یافت.`,
        negotiation_score: 5,
        next_followup_date: addDays(nowTime, 2),
        negotiation_status: 'تماس برقرار نشده',
        date_created: nowTime.toISOString(),
      };

      await directusFetch('/items/customer_reports', {
        method: 'POST',
        body: JSON.stringify(reportHistory),
      }).catch(() => {});

      // Sync local in-memory
      const idx = customersData.findIndex((c) => c.id === req.params.id);
      if (idx !== -1) {
        customersData[idx] = { ...customersData[idx], ...patchData };
      }
      reportsData.unshift(reportHistory);

      return res.json({
        success: true,
        message: `پرونده با موفقیت به شما اختصاص یافت و مهلت ${days} روزه برای شما ثبت شد.`,
        customer: patched.data,
      });
    } catch (err: any) {
      console.error('Directus claim error:', err.message);
    }
  }

  // Local fallback
  const idx = customersData.findIndex((c) => c.id === req.params.id);
  if (idx !== -1) {
    customersData[idx] = {
      ...customersData[idx],
      ...patchData,
    };
  }

  const localReport: CustomerReport = {
    id: crypto.randomUUID(),
    customer_id: req.params.id,
    negotiator_name: patchData.assigned_marketer_name,
    negotiation_phone: targetCustomer.manager_phones?.[0] || targetCustomer.mobile_numbers?.[0] || '-',
    report_text: `پرونده توسط «${patchData.assigned_marketer_name}» از حوضچه مشتریان آزاد انتخاب و با مهلت پیگیری ${days} روزه به ایشان اختصاص یافت.`,
    negotiation_score: 5,
    next_followup_date: addDays(nowTime, 2),
    negotiation_status: 'تماس برقرار نشده',
    date_created: nowTime.toISOString(),
  };
  reportsData.unshift(localReport);

  const updatedCust = customersData[idx] || { ...targetCustomer, ...patchData };

  res.json({
    success: true,
    message: `پرونده با موفقیت به شما اختصاص یافت و مهلت ${days} روزه برای شما ثبت شد.`,
    customer: updatedCust,
  });
});

// Merge Customers API (Admin only)
app.post('/api/customers/merge', async (req: Request, res: Response) => {
  const { primary_customer_id, merged_customer_ids, assigned_marketer_id, assigned_marketer_name, notes } = req.body;
  const { userRole, isAdmin, userName } = getRequestUser(req);

  if (!isAdmin && userRole !== 'admin' && userRole !== 'sales_manager') {
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'فقط مدیر سیستم یا مدیر فروش مجاز به ادغام پرونده‌های مشتریان هستند.'
    });
  }

  if (!primary_customer_id) {
    return res.status(400).json({ error: 'INVALID_REQUEST', message: 'شناسه مشتری اصلی مشخص نشده است.' });
  }

  if (!Array.isArray(merged_customer_ids) || merged_customer_ids.length === 0) {
    return res.status(400).json({ error: 'INVALID_REQUEST', message: 'حداقل یک مشتری برای ادغام باید انتخاب شود.' });
  }

  const nowTime = new Date();
  const nowIso = nowTime.toISOString();

  // Deduplicate array helper
  const mergeUnique = (base: any[], ...others: any[][]) => {
    const set = new Set<string>();
    const result: string[] = [];
    const addVal = (v: any) => {
      if (v === null || v === undefined) return;
      const str = String(v).trim();
      if (!str) return;
      if (!set.has(str)) {
        set.add(str);
        result.push(str);
      }
    };
    (base || []).forEach(addVal);
    others.forEach(list => (list || []).forEach(addVal));
    return result;
  };

  if (directusUrl && directusAdminToken) {
    try {
      // 1. Fetch primary customer
      const primaryRes = await directusFetch(`/items/customers/${primary_customer_id}`);
      if (!primaryRes?.data) {
        return res.status(404).json({ error: 'PRIMARY_NOT_FOUND', message: 'مشتری اصلی یافت نشد.' });
      }
      const primaryCust: Customer = primaryRes.data;

      // 2. Fetch all merged customers
      const mergedQuery = merged_customer_ids.map(id => `filter[id][_in]=${id}`).join('&');
      const mergedRes = await directusFetch(`/items/customers?filter[id][_in]=${merged_customer_ids.join(',')}`);
      const sourceCustomers: Customer[] = Array.isArray(mergedRes?.data) ? mergedRes.data : [];

      if (sourceCustomers.length === 0) {
        return res.status(404).json({ error: 'SOURCE_CUSTOMERS_NOT_FOUND', message: 'هیچ‌یک از مشتریان فرعی جهت ادغام یافت نشدند.' });
      }

      // 3. Resolve assigned marketer
      let targetMarketerId = primaryCust.assigned_marketer_id;
      let targetMarketerName = primaryCust.assigned_marketer_name;
      if (assigned_marketer_id || assigned_marketer_name) {
        const resolved = await resolvePersonnelId(assigned_marketer_id, assigned_marketer_name);
        targetMarketerId = resolved.personnelId;
        targetMarketerName = resolved.personnelName || assigned_marketer_name || targetMarketerName;
      }

      // 4. Combine all contacts & phones
      const combinedMobiles = mergeUnique(primaryCust.mobile_numbers, ...sourceCustomers.map(c => c.mobile_numbers));
      const combinedLandlines = mergeUnique(primaryCust.landline_numbers, ...sourceCustomers.map(c => c.landline_numbers));
      const combinedManagerPhones = mergeUnique(primaryCust.manager_phones, ...sourceCustomers.map(c => c.manager_phones));
      const combinedNegotiatorPhones = mergeUnique(primaryCust.negotiator_phones, ...sourceCustomers.map(c => c.negotiator_phones));
      const combinedTelegramIds = mergeUnique(primaryCust.telegram_ids, ...sourceCustomers.map(c => c.telegram_ids));
      const combinedInstagramIds = mergeUnique(primaryCust.instagram_ids, ...sourceCustomers.map(c => c.instagram_ids));
      const combinedEmails = mergeUnique(primaryCust.emails, ...sourceCustomers.map(c => c.emails));
      const combinedWebsites = mergeUnique(primaryCust.websites, ...sourceCustomers.map(c => c.websites));

      // 5. Update all reports of source customers to point to primary_customer_id
      const sourceReportsRes = await directusFetch(`/items/customer_reports?filter[customer_id][_in]=${merged_customer_ids.join(',')}`).catch(() => null);
      const sourceReports: CustomerReport[] = Array.isArray(sourceReportsRes?.data) ? sourceReportsRes.data : [];

      for (const rep of sourceReports) {
        await directusFetch(`/items/customer_reports/${rep.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            customer_id: primary_customer_id
          })
        }).catch(err => console.error('Error transferring report to merged customer:', err.message));
      }

      // 6. Update all contacts of source customers to point to primary_customer_id
      const sourceContactsRes = await directusFetch(`/items/customer_contacts?filter[customer_id][_in]=${merged_customer_ids.join(',')}`).catch(() => null);
      const sourceContacts: CustomerContact[] = Array.isArray(sourceContactsRes?.data) ? sourceContactsRes.data : [];

      for (const ct of sourceContacts) {
        await directusFetch(`/items/customer_contacts/${ct.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            customer_id: primary_customer_id
          })
        }).catch(err => console.error('Error transferring contact to merged customer:', err.message));
      }

      // 7. Add Merge Audit Report
      const mergedNamesList = sourceCustomers.map(c => `«${c.company_name}» (${c.assigned_marketer_name || 'بدون بازاریاب'})`).join('، ');
      const mergeAuditReport: CustomerReport = {
        id: crypto.randomUUID(),
        customer_id: primary_customer_id,
        negotiator_name: userName || 'مدیریت سیستم',
        negotiation_phone: primaryCust.manager_phones?.[0] || primaryCust.mobile_numbers?.[0] || '-',
        report_text: `[ادغام سیستمی پرونده‌ها]: پرونده مشتریان ${mergedNamesList} با این پرونده ادغام شد.\nکلیه شماره‌ها (${combinedMobiles.length} همراه، ${combinedLandlines.length} ثابت) و سوابق پیگیری منتقل گردید و پرونده با مالکیت «${targetMarketerName}» تجمیع شد.${notes ? `\nتوضیحات مدیر: ${notes}` : ''}`,
        negotiation_score: 8,
        next_followup_date: primaryCust.next_followup_date || addDays(nowTime, 2),
        negotiation_status: primaryCust.status || 'پیگیری قبل از انقضا',
        date_created: nowIso
      };

      await directusFetch('/items/customer_reports', {
        method: 'POST',
        body: JSON.stringify(mergeAuditReport)
      }).catch(() => {});

      // 8. Update Primary Customer in Directus
      const primaryPatchPayload = {
        assigned_marketer_id: targetMarketerId,
        assigned_marketer_name: targetMarketerName,
        mobile_numbers: combinedMobiles,
        landline_numbers: combinedLandlines,
        manager_phones: combinedManagerPhones,
        negotiator_phones: combinedNegotiatorPhones,
        telegram_ids: combinedTelegramIds,
        instagram_ids: combinedInstagramIds,
        emails: combinedEmails,
        websites: combinedWebsites,
        manager_name: primaryCust.manager_name || sourceCustomers.find(c => c.manager_name)?.manager_name || '',
        business_type: primaryCust.business_type || sourceCustomers.find(c => c.business_type)?.business_type || '',
        province: primaryCust.province || sourceCustomers.find(c => c.province)?.province || '',
        city: primaryCust.city || sourceCustomers.find(c => c.city)?.city || '',
        date_updated: nowIso
      };

      const updatedPrimaryRes = await directusFetch(`/items/customers/${primary_customer_id}`, {
        method: 'PATCH',
        body: JSON.stringify(primaryPatchPayload)
      });

      // 9. Delete Source Customers from Directus
      for (const sourceId of merged_customer_ids) {
        await directusFetch(`/items/customers/${sourceId}`, {
          method: 'DELETE'
        }).catch(err => console.error('Error deleting merged source customer:', err.message));
      }

      // 10. Fetch updated contacts
      const updatedContactsRes = await directusFetch(`/items/customer_contacts?filter[customer_id][_eq]=${primary_customer_id}`).catch(() => null);
      const finalCustomer = {
        ...(updatedPrimaryRes.data || primaryPatchPayload),
        id: primary_customer_id,
        contacts: updatedContactsRes?.data || []
      };

      return res.json({
        success: true,
        message: `تعداد ${sourceCustomers.length} پرونده با موفقیت در پرونده «${primaryCust.company_name}» ادغام گردیدند.`,
        customer: finalCustomer
      });
    } catch (err: any) {
      console.error('Merge customers error:', err.message);
      return res.status(500).json({
        error: 'MERGE_FAILED',
        message: `خطا در ادغام پرونده‌های مشتریان: ${err.message}`
      });
    }
  }

  // Offline Fallback
  const primaryIndex = customersData.findIndex(c => c.id === primary_customer_id);
  if (primaryIndex === -1) {
    return res.status(404).json({ error: 'PRIMARY_NOT_FOUND', message: 'مشتری اصلی یافت نشد.' });
  }

  const primaryCust = customersData[primaryIndex];
  const sourceCustomers = customersData.filter(c => merged_customer_ids.includes(c.id));

  let targetMarketerId = primaryCust.assigned_marketer_id;
  let targetMarketerName = primaryCust.assigned_marketer_name;
  if (assigned_marketer_id || assigned_marketer_name) {
    targetMarketerId = assigned_marketer_id || targetMarketerId;
    targetMarketerName = assigned_marketer_name || targetMarketerName;
  }

  const combinedMobiles = mergeUnique(primaryCust.mobile_numbers, ...sourceCustomers.map(c => c.mobile_numbers));
  const combinedLandlines = mergeUnique(primaryCust.landline_numbers, ...sourceCustomers.map(c => c.landline_numbers));
  const combinedManagerPhones = mergeUnique(primaryCust.manager_phones, ...sourceCustomers.map(c => c.manager_phones));
  const combinedNegotiatorPhones = mergeUnique(primaryCust.negotiator_phones, ...sourceCustomers.map(c => c.negotiator_phones));

  // Transfer reports
  reportsData = reportsData.map(rep => {
    if (merged_customer_ids.includes(rep.customer_id)) {
      return { ...rep, customer_id: primary_customer_id };
    }
    return rep;
  });

  // Transfer contacts
  contactsData = contactsData.map(ct => {
    if (merged_customer_ids.includes(ct.customer_id)) {
      return { ...ct, customer_id: primary_customer_id };
    }
    return ct;
  });

  // Add merge audit report
  reportsData.unshift({
    id: 'rep-' + Date.now(),
    customer_id: primary_customer_id,
    negotiator_name: userName || 'مدیریت سیستم',
    negotiation_phone: primaryCust.manager_phones?.[0] || primaryCust.mobile_numbers?.[0] || '-',
    report_text: `[ادغام سیستمی پرونده‌ها]: سوابق و شماره‌های تماس ${sourceCustomers.length} پرونده مشتری با این پرونده ادغام شد.`,
    negotiation_score: 8,
    next_followup_date: primaryCust.next_followup_date || addDays(nowTime, 2),
    negotiation_status: primaryCust.status as any,
    date_created: nowIso
  });

  // Update primary
  customersData[primaryIndex] = {
    ...primaryCust,
    assigned_marketer_id: targetMarketerId,
    assigned_marketer_name: targetMarketerName,
    mobile_numbers: combinedMobiles,
    landline_numbers: combinedLandlines,
    manager_phones: combinedManagerPhones,
    negotiator_phones: combinedNegotiatorPhones,
    date_updated: nowIso
  };

  // Remove source customers
  customersData = customersData.filter(c => !merged_customer_ids.includes(c.id));

  return res.json({
    success: true,
    message: 'ادغام مشتریان با موفقیت انجام شد.',
    customer: customersData[primaryIndex]
  });
});
app.get('/api/customer-reports', async (req: Request, res: Response) => {
  const { customer_id, page, limit } = req.query;
  const { userId, personnelId, userRole, isAdmin, userName, tenantId } = getRequestUser(req);

  const reqLimit = limit ? parseInt(String(limit), 10) : (customer_id ? 200 : 500);
  const reqPage = page ? parseInt(String(page), 10) : 1;

  if (directusUrl && directusAdminToken) {
    try {
      let q = `?sort=-date_created&meta=*`;
      if (customer_id) {
        q += `&filter[customer_id][_eq]=${encodeURIComponent(String(customer_id))}`;
      }
      if (reqLimit > 0) {
        q += `&limit=${reqLimit}&page=${reqPage}`;
      } else {
        q += `&limit=-1`;
      }
      const result = await directusFetch(`/items/customer_reports${q}`);
      if (result && Array.isArray(result.data)) {
        let reportsList = result.data;

        // Tenant-based filtering
        if (tenantId && tenantId !== 'all') {
          reportsList = reportsList.filter((r: any) => matchesTenant(r.tenant_id, tenantId));
        }

        // Non-admin Marketer/Staff only sees their own reports when browsing general reports list
        if (!isAdmin && (userId || personnelId || userName) && !customer_id) {
          reportsList = reportsList.filter((r: any) =>
            (userName && r.negotiator_name === userName) ||
            r.created_by === userName ||
            (userId && r.created_by === userId) ||
            (personnelId && r.created_by === personnelId)
          );
        }

        const totalMetaCount = result.meta?.total_count ? parseInt(String(result.meta.total_count), 10) : reportsList.length;
        const filterMetaCount = result.meta?.filter_count ? parseInt(String(result.meta.filter_count), 10) : reportsList.length;

        res.setHeader('X-Total-Count', String(totalMetaCount));
        res.setHeader('X-Filter-Count', String(filterMetaCount));
        res.setHeader('X-Page', String(reqPage));
        res.setHeader('X-Limit', String(reqLimit));

        return res.json(reportsList);
      }
    } catch (e: any) {
      return res.status(502).json({ error: `خطا در دریافت گزارش‌ها از پایگاه داده مرکزی: ${e.message}` });
    }
  }

  let repList = reportsData;
  if (tenantId && tenantId !== 'all') {
    repList = repList.filter(r => matchesTenant((r as any).tenant_id, tenantId));
  }
  if (customer_id) {
    repList = repList.filter(r => r.customer_id === customer_id);
  } else if (!isAdmin && (userId || personnelId || userName)) {
    repList = repList.filter(r =>
      (userName && r.negotiator_name === userName) ||
      r.created_by === userName ||
      (userId && r.created_by === userId) ||
      (personnelId && r.created_by === personnelId)
    );
  }
  res.json(repList);
});

app.post('/api/customer-reports', async (req: Request, res: Response) => {
  const payload = req.body;
  const { userId, personnelId, userName, isAdmin, tenantId } = getRequestUser(req);
  const newReportId = crypto.randomUUID();
  const nowIso = new Date().toISOString();

  let nextFollowup: string | null = payload.next_followup_date || null;
  if (!nextFollowup || String(nextFollowup).trim() === '') {
    nextFollowup = null;
  } else {
    try {
      nextFollowup = new Date(nextFollowup).toISOString();
    } catch {
      nextFollowup = null;
    }
  }

  const finalNegotiatorName = isAdmin
    ? (payload.negotiator_name || userName || 'کارشناس پیگیری').trim()
    : (userName || 'کارشناس پیگیری').trim();

  const targetTenantId = payload.tenant_id || tenantId || 'default';

  const newReport: CustomerReport & { tenant_id?: string } = {
    id: newReportId,
    customer_id: payload.customer_id,
    tenant_id: targetTenantId,
    negotiator_name: finalNegotiatorName,
    negotiation_phone: (payload.negotiation_phone || '').trim(),
    report_text: (payload.report_text || '').trim(),
    negotiation_score: Number(payload.negotiation_score) || 5,
    next_followup_date: nextFollowup,
    negotiation_status: payload.negotiation_status || 'پیگیری قبل از انقضا',
    created_by: userName || personnelId || userId,
    date_created: nowIso,
    contract_number: payload.contract_number ? String(payload.contract_number).trim() : null,
    contract_date: payload.contract_date ? String(payload.contract_date).trim() : null,
    contract_items: payload.contract_items ? String(payload.contract_items).trim() : null,
    contract_amount: payload.contract_amount !== undefined && payload.contract_amount !== null && payload.contract_amount !== ''
      ? Number(payload.contract_amount)
      : null,
  };

  if (directusUrl && directusAdminToken) {
    try {
      const directusReportPayload = {
        ...newReport,
        tenant_id: resolveDirectusTenantId(targetTenantId),
      };
      const created = await directusFetch('/items/customer_reports', {
        method: 'POST',
        body: JSON.stringify(directusReportPayload)
      });

      // Synchronize latest status & follow-up date on customer document
      const customerUpdatePayload: Record<string, any> = {
        status: newReport.negotiation_status,
        date_updated: nowIso
      };
      if (nextFollowup) {
        customerUpdatePayload.next_followup_date = nextFollowup;
      }
      if (newReport.negotiation_status === 'قرارداد' || newReport.negotiation_status === 'قرارداد / فاکتور') {
        customerUpdatePayload.is_expired = false;
      }

      await directusFetch(`/items/customers/${payload.customer_id}`, {
        method: 'PATCH',
        body: JSON.stringify(customerUpdatePayload)
      }).catch((e) => console.warn('Customer status sync warning:', e.message));

      return res.status(201).json(created.data || newReport);
    } catch (err: any) {
      console.error('Report create error:', err.message);
      return res.status(500).json({
        error: 'REPORT_SAVE_FAILED',
        message: `خطا در ثبت گزارش مذاکره در پایگاه داده مرکزی: ${err.message}`
      });
    }
  }

  res.status(201).json(newReport);
});

// Cold Leads API
app.get('/api/cold-leads', async (req: Request, res: Response) => {
  const { userId, personnelId, userRole, isAdmin, userName, tenantId } = getRequestUser(req);

  if (directusUrl && directusAdminToken) {
    try {
      const result = await directusFetch('/items/cold_leads?fields=*,assigned_to.*&sort=-date_created&limit=1000');
      if (result && Array.isArray(result.data)) {
        let leads = result.data.map((l: any) => {
          let aId: string | null = null;
          let aName = 'تخصیص نیافته';
          let aDetail: any = null;

          if (l.assigned_to && typeof l.assigned_to === 'object') {
            aId = l.assigned_to.id;
            aName = l.assigned_to.name || l.assigned_to.first_name || 'کارشناس';
            aDetail = l.assigned_to;
          } else if (l.assigned_to && typeof l.assigned_to === 'string') {
            aId = l.assigned_to;
            const pMatch = personnelData.find(p => p.id === l.assigned_to || p.name === l.assigned_to || p.user_id === l.assigned_to);
            if (pMatch) {
              aName = pMatch.name;
              aDetail = pMatch;
            } else {
              aName = l.assigned_to;
            }
          }

          return {
            ...l,
            assigned_to_id: aId,
            assigned_to_name: aName,
            assigned_to_detail: aDetail
          };
        });

        // Tenant-based filtering
        if (tenantId && tenantId !== 'all') {
          leads = leads.filter((l: any) => matchesTenant(l.tenant_id, tenantId));
        }

        // Non-admin Marketer only sees their own assigned leads
        if (!isAdmin && (userName || userId || personnelId)) {
          leads = leads.filter((l: any) =>
            (personnelId && (l.assigned_to_id === personnelId || l.assigned_to === personnelId)) ||
            (userId && (l.assigned_to_id === userId || l.assigned_to === userId)) ||
            (userName && (l.assigned_to_name === userName || l.assigned_to === userName))
          );
        }
        return res.json(leads);
      }
    } catch (e: any) {
      return res.status(502).json({ error: `خطا در دریافت شماره‌های اولیه از پایگاه داده مرکزی: ${e.message}` });
    }
  }

  // Fallback in-memory
  let leads = coldLeadsData;
  if (tenantId && tenantId !== 'all') {
    leads = leads.filter((l: any) => matchesTenant(l.tenant_id, tenantId));
  }
  if (!isAdmin && (userName || userId || personnelId)) {
    leads = leads.filter((l) =>
      (personnelId && l.assigned_to === personnelId) ||
      (userName && l.assigned_to === userName)
    );
  }
  res.json(leads);
});

app.post('/api/cold-leads', async (req: Request, res: Response) => {
  const payload = req.body;
  const { userId, personnelId, userName, isAdmin, tenantId } = getRequestUser(req);
  const newLeadId = crypto.randomUUID();
  const nowIso = new Date().toISOString();

  let convertedCustId: string | null = payload.converted_customer_id || null;
  if (!convertedCustId || String(convertedCustId).trim() === '') {
    convertedCustId = null;
  }

  // If regular marketer adds lead, it is automatically assigned to them
  const rawAssigned = isAdmin ? (payload.assigned_to || personnelId || userId || userName) : (personnelId || userId || userName);
  const resolved = await resolvePersonnelId(rawAssigned, userName);
  const finalAssignedId = resolved.personnelId || null;
  const finalAssignedName = resolved.personnelName || userName || 'تخصیص نیافته';

  const targetTenantId = payload.tenant_id || tenantId || 'default';

  const newLead: any = {
    id: newLeadId,
    tenant_id: targetTenantId,
    phone_number: (payload.phone_number || '').trim(),
    contact_name: (payload.contact_name || '').trim(),
    source: payload.source || 'ورود دستی',
    status: payload.status || 'تماس نگرفته',
    notes: (payload.notes || '').trim(),
    assigned_to: finalAssignedId,
    converted_customer_id: convertedCustId,
    date_created: nowIso
  };

  if (directusUrl && directusAdminToken) {
    try {
      const directusLeadPayload = {
        ...newLead,
        tenant_id: resolveDirectusTenantId(targetTenantId),
      };
      const created = await directusFetch('/items/cold_leads', {
        method: 'POST',
        body: JSON.stringify(directusLeadPayload)
      });
      const returned = created?.data || newLead;
      return res.status(201).json({
        ...returned,
        assigned_to_id: finalAssignedId,
        assigned_to_name: finalAssignedName
      });
    } catch (err: any) {
      console.error('Cold lead error:', err.message);
      return res.status(500).json({
        error: 'LEAD_SAVE_FAILED',
        message: `خطا در ثبت شماره در پایگاه داده مرکزی: ${err.message}`
      });
    }
  }

  coldLeadsData.unshift({
    ...newLead,
    assigned_to: finalAssignedName,
    assigned_to_id: finalAssignedId,
    assigned_to_name: finalAssignedName
  });
  res.status(201).json(newLead);
});

app.patch('/api/cold-leads/:id', async (req: Request, res: Response) => {
  const payload = req.body;
  const cleanPatch: Record<string, any> = { ...payload };

  if (cleanPatch.converted_customer_id === '') {
    cleanPatch.converted_customer_id = null;
  }

  if (cleanPatch.assigned_to !== undefined) {
    if (!cleanPatch.assigned_to || cleanPatch.assigned_to === 'none' || cleanPatch.assigned_to === 'تخصیص نیافته') {
      cleanPatch.assigned_to = null;
    } else {
      const resolved = await resolvePersonnelId(cleanPatch.assigned_to);
      cleanPatch.assigned_to = resolved.personnelId || null;
    }
  }

  if (directusUrl && directusAdminToken) {
    try {
      const patched = await directusFetch(`/items/cold_leads/${req.params.id}`, {
        method: 'PATCH',
        body: JSON.stringify(cleanPatch)
      });
      return res.json(patched.data);
    } catch (err: any) {
      return res.status(500).json({
        error: 'LEAD_UPDATE_FAILED',
        message: `خطا در بروزرسانی لید در پایگاه داده مرکزی: ${err.message}`
      });
    }
  }

  const idx = coldLeadsData.findIndex(l => l.id === req.params.id);
  if (idx >= 0) {
    coldLeadsData[idx] = { ...coldLeadsData[idx], ...cleanPatch };
    return res.json(coldLeadsData[idx]);
  }

  res.status(404).json({ error: 'Lead not found' });
});

// Bulk Assign Cold Leads to Marketer (تخصیص گروهی شماره‌ها به بازاریاب)
app.post('/api/cold-leads/bulk-assign', async (req: Request, res: Response) => {
  const { lead_ids, target_marketer_id } = req.body;
  const { isAdmin } = getRequestUser(req);

  if (!isAdmin) {
    return res.status(403).json({ error: 'فقط مدیر سیستم اجازه انتقال و تخصیص گروهی شماره‌ها را دارد.' });
  }

  if (!Array.isArray(lead_ids) || lead_ids.length === 0) {
    return res.status(400).json({ error: 'حداقل یک شماره را برای تخصیص انتخاب کنید.' });
  }

  const resolved = await resolvePersonnelId(target_marketer_id);
  const finalAssignedId = resolved.personnelId || null;
  const targetMarketerName = resolved.personnelName || 'تخصیص نیافته';

  let updatedCount = 0;

  for (const lId of lead_ids) {
    if (directusUrl && directusAdminToken) {
      try {
        await directusFetch(`/items/cold_leads/${lId}`, {
          method: 'PATCH',
          body: JSON.stringify({ assigned_to: finalAssignedId })
        });
        updatedCount++;
      } catch {}
    } else {
      const idx = coldLeadsData.findIndex(l => l.id === lId);
      if (idx >= 0) {
        coldLeadsData[idx].assigned_to = targetMarketerName;
        updatedCount++;
      }
    }
  }

  res.json({
    success: true,
    updatedCount,
    message: `${updatedCount} شماره با موفقیت به «${targetMarketerName}» تخصیص داده شد.`
  });
});

app.delete('/api/cold-leads/:id', async (req: Request, res: Response) => {
  const { isAdmin } = getRequestUser(req);

  if (directusUrl && directusAdminToken) {
    try {
      await directusFetch(`/items/cold_leads/${req.params.id}`, { method: 'DELETE' });
    } catch {}
  }

  coldLeadsData = coldLeadsData.filter(l => l.id !== req.params.id);
  res.json({ success: true, message: 'شماره با موفقیت حذف شد.' });
});

// Convert Cold Lead into a Customer
app.post('/api/cold-leads/:id/convert', async (req: Request, res: Response) => {
  const newCustId = crypto.randomUUID();
  const nowIso = new Date().toISOString();

  let lead: any = null;
  if (directusUrl && directusAdminToken) {
    try {
      const leadRes = await directusFetch(`/items/cold_leads/${req.params.id}`);
      lead = leadRes.data;
    } catch {}
  }
  if (!lead) {
    return res.status(404).json({ error: 'لید یافت نشد.' });
  }

  const phone = (lead.phone_number || '').trim();
  const contactName = (lead.contact_name || '').trim();

  const customerPayload = cleanCustomerPayloadForDirectus({
    ...req.body,
    company_name: req.body.company_name || contactName || `مشتری با شماره ${phone}`,
    mobile_numbers: phone ? [phone] : [],
    interview_status: 'مصاحبه اولیه انجام شده',
    interview_report: `تبدیل شده از بانک شماره‌های اولیه (${lead.source || 'منبع نامشخص'}). یادداشت: ${lead.notes || 'ندارد'}`,
    interview_score: 6,
    status: 'تماس برقرار نشده'
  }, newCustId);

  const contactItem: CustomerContact = {
    id: crypto.randomUUID(),
    customer_id: newCustId,
    channel_type: 'mobile',
    value: phone,
    normalized_value: normalizeContactValue(phone, 'mobile'),
    contact_name: contactName || customerPayload.company_name,
    contact_role: 'مخاطب لید تبدیل‌شده',
    is_primary: true,
    notes: `تبدیل شده از بانک شماره‌های اولیه (منبع: ${lead.source || 'نامشخص'})`,
    date_created: nowIso,
    date_updated: nowIso
  };

  if (directusUrl && directusAdminToken) {
    try {
      // 1. Create customer in database
      const createdCustRes = await directusFetch('/items/customers', {
        method: 'POST',
        body: JSON.stringify(customerPayload)
      });
      const finalCust = createdCustRes.data;

      // 2. Create contact in database
      await directusFetch('/items/customer_contacts', {
        method: 'POST',
        body: JSON.stringify(contactItem)
      });

      // 3. Update lead in database
      await directusFetch(`/items/cold_leads/${req.params.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'تبدیل شده به مشتری',
          converted_customer_id: newCustId
        })
      });

      const fullCustomer = { ...finalCust, contacts: [contactItem] };
      return res.json({ success: true, customer: fullCustomer });
    } catch (err: any) {
      console.error('Convert lead error:', err.message);
      return res.status(500).json({
        error: 'CONVERT_FAILED',
        message: `خطا در تبدیل لید به مشتری در پایگاه داده مرکزی: ${err.message}`
      });
    }
  }

  res.status(500).json({ error: 'پایگاه داده در دسترس نیست.' });
});

// Administrative Reports API
app.get('/api/administrative-reports', async (req: Request, res: Response) => {
  const { userId, personnelId, userRole, isAdmin, userName, tenantId } = getRequestUser(req);

  const normalizeReport = (r: any) => {
    let hourly = r.hourly_logs;
    if (typeof hourly === 'string' && hourly.startsWith('[')) {
      try {
        hourly = JSON.parse(hourly);
      } catch {}
    }
    if (!hourly && r.tasks_summary && r.tasks_summary.includes('ساعت')) {
      const lines = r.tasks_summary.split('\n');
      const parsed: any[] = [];
      lines.forEach((line: string) => {
        const match = line.match(/(?:•\s*)?(ساعت\s*[\d\u06F0-\u06F9]+\s*(?:الی|تا)\s*[\d\u06F0-\u06F9]+)\s*[:：]\s*(.*)/i);
        if (match) {
          parsed.push({ slot: match[1].trim(), activity: match[2].trim() });
        }
      });
      if (parsed.length > 0) {
        hourly = parsed;
      }
    }
    return {
      ...r,
      hourly_logs: Array.isArray(hourly) ? hourly : null
    };
  };

  if (directusUrl && directusAdminToken) {
    try {
      const result = await directusFetch('/items/administrative_reports?sort=-report_date&limit=500');
      if (result && Array.isArray(result.data)) {
        let reports = result.data.map(normalizeReport);

        // Tenant-based filtering
        if (tenantId && tenantId !== 'all') {
          reports = reports.filter((r: any) => matchesTenant(r.tenant_id, tenantId));
        }

        // Marketer only sees their own administrative reports
        if (!isAdmin && (userId || personnelId)) {
          reports = reports.filter((r: any) =>
            r.personnel_id === personnelId ||
            r.personnel_id === userId ||
            (userName && r.personnel_name === userName)
          );
        }
        return res.json(reports);
      }
    } catch (e: any) {
      return res.status(502).json({ error: `خطا در دریافت گزارش‌های اداری از پایگاه داده مرکزی: ${e.message}` });
    }
  }
  res.json([]);
});

app.post('/api/administrative-reports', async (req: Request, res: Response) => {
  const payload = req.body;
  const { userId, personnelId, userName, tenantId } = getRequestUser(req);
  const newAdmId = crypto.randomUUID();
  const nowIso = new Date().toISOString();

  const rawPId = payload.personnel_id || personnelId || userId;
  const resolved = await resolvePersonnelId(rawPId, payload.personnel_name || userName);

  const targetTenantId = payload.tenant_id || tenantId || 'default';

  const newReport: AdministrativeReport = {
    id: newAdmId,
    tenant_id: targetTenantId,
    personnel_id: resolved.personnelId || 'p-1',
    personnel_name: resolved.personnelName || payload.personnel_name || userName || 'پرسنل شرکت',
    report_date: payload.report_date || nowIso.split('T')[0],
    calls_count: Number(payload.calls_count) || 0,
    successful_contacts: Number(payload.successful_contacts) || 0,
    leads_converted: Number(payload.leads_converted) || 0,
    tasks_summary: payload.tasks_summary || '',
    challenges: payload.challenges || '',
    tomorrow_plan: payload.tomorrow_plan || '',
    hourly_logs: payload.hourly_logs || null,
    date_created: nowIso
  };

  if (directusUrl && directusAdminToken) {
    try {
      const directusReportPayload = {
        ...newReport,
        tenant_id: resolveDirectusTenantId(targetTenantId)
      };
      // If hourly_logs is an object/array, Directus JSON field or stringified JSON
      const created = await directusFetch('/items/administrative_reports', {
        method: 'POST',
        body: JSON.stringify(directusReportPayload)
      });
      return res.status(201).json(created.data || newReport);
    } catch (err: any) {
      // If Directus rejected due to unknown hourly_logs field, retry without hourly_logs but keep in tasks_summary
      if (err.message && err.message.toLowerCase().includes('hourly_logs')) {
        try {
          const { hourly_logs, ...fallbackReport } = newReport;
          const created = await directusFetch('/items/administrative_reports', {
            method: 'POST',
            body: JSON.stringify({
              ...fallbackReport,
              tenant_id: resolveDirectusTenantId(targetTenantId)
            })
          });
          return res.status(201).json({ ...(created.data || fallbackReport), hourly_logs: newReport.hourly_logs });
        } catch {}
      }
      console.error('Admin report create error:', err.message);
      return res.status(500).json({
        error: 'ADMIN_REPORT_FAILED',
        message: `خطا در ثبت گزارش اداری در پایگاه داده مرکزی: ${err.message}`
      });
    }
  }

  res.status(201).json(newReport);
});

// -------------------------------------------------------------
// LEAVE REQUESTS API (درخواست‌های مرخصی)
// -------------------------------------------------------------
app.get('/api/leave-requests', async (req: Request, res: Response) => {
  const { userId, personnelId, isAdmin, userName, tenantId } = getRequestUser(req);
  if (directusUrl && directusAdminToken) {
    try {
      const resp = await directusFetch('/items/leave_requests?sort=-date_created&limit=200');
      if (resp && Array.isArray(resp.data)) {
        let list: LeaveRequest[] = resp.data.map((r: any) => ({
          ...r,
          personnel_id: typeof r.personnel_id === 'object' && r.personnel_id !== null ? r.personnel_id.id : String(r.personnel_id || ''),
          personnel_name: r.personnel_name || (typeof r.personnel_id === 'object' && r.personnel_id !== null ? (r.personnel_id.name || r.personnel_id.first_name) : 'کارشناس شرکت')
        }));

        // Tenant-based filtering
        if (tenantId && tenantId !== 'all') {
          list = list.filter((r: any) => matchesTenant(r.tenant_id, tenantId));
        }

        if (!isAdmin) {
          list = list.filter(
            (r) =>
              r.personnel_id === personnelId ||
              r.personnel_id === userId ||
              (userName && r.personnel_name === userName)
          );
        }
        return res.json(list);
      }
    } catch (err: any) {
      // Directus collection might not exist yet, fallback to in-memory
    }
  }

  // In-memory fallback
  let list = [...leaveRequestsData];
  if (tenantId && tenantId !== 'all') {
    list = list.filter((r: any) => matchesTenant(r.tenant_id, tenantId));
  }
  if (!isAdmin) {
    list = list.filter(
      (r) =>
        r.personnel_id === personnelId ||
        r.personnel_id === userId ||
        (userName && r.personnel_name === userName)
    );
  }
  res.json(list);
});

app.post('/api/leave-requests', async (req: Request, res: Response) => {
  const payload = req.body;
  const { userId, personnelId, userName, tenantId } = getRequestUser(req);
  const newId = crypto.randomUUID();
  const nowIso = new Date().toISOString();

  const rawPId = payload.personnel_id || personnelId || userId;
  const resolved = await resolvePersonnelId(rawPId, payload.personnel_name || userName);

  const targetTenantId = payload.tenant_id || tenantId || 'default';

  const newRequest: LeaveRequest = {
    id: newId,
    tenant_id: targetTenantId,
    personnel_id: resolved.personnelId || personnelId || userId || 'p-1',
    personnel_name: resolved.personnelName || payload.personnel_name || userName || 'کارشناس شرکت',
    leave_type: payload.leave_type === 'hourly' ? 'hourly' : 'daily',
    start_date: payload.start_date || nowIso.split('T')[0],
    end_date: payload.leave_type === 'daily' ? payload.end_date || null : null,
    start_time: payload.leave_type === 'hourly' ? payload.start_time || null : null,
    end_time: payload.leave_type === 'hourly' ? payload.end_time || null : null,
    hours_count: payload.leave_type === 'hourly' ? Number(payload.hours_count) || null : null,
    days_count: payload.leave_type === 'daily' ? Number(payload.days_count) || 1 : null,
    reason: payload.reason || '',
    status: 'pending',
    manager_note: null,
    reviewed_by: null,
    reviewed_at: null,
    date_created: nowIso
  };

  if (directusUrl && directusAdminToken) {
    try {
      const directusLeavePayload = {
        ...newRequest,
        tenant_id: resolveDirectusTenantId(targetTenantId)
      };
      const created = await directusFetch('/items/leave_requests', {
        method: 'POST',
        body: JSON.stringify(directusLeavePayload)
      });
      if (created?.data) {
        leaveRequestsData.unshift(created.data);
        return res.status(201).json(created.data);
      }
    } catch (err: any) {
      // Fallback
    }
  }

  leaveRequestsData.unshift(newRequest);
  res.status(201).json(newRequest);
});

app.patch('/api/leave-requests/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, manager_note } = req.body;
  const { userName, isAdmin } = getRequestUser(req);

  if (!isAdmin) {
    return res.status(403).json({ error: 'فقط مدیر سیستم اجازه تغییر وضعیت درخواست را دارد.' });
  }

  const nowIso = new Date().toISOString();
  const updatePayload = {
    status: status || 'pending',
    manager_note: manager_note || null,
    reviewed_by: userName || 'مدیر سیستم',
    reviewed_at: nowIso
  };

  if (directusUrl && directusAdminToken) {
    try {
      const updated = await directusFetch(`/items/leave_requests/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updatePayload)
      });
      if (updated?.data) {
        const idx = leaveRequestsData.findIndex(r => r.id === id);
        if (idx >= 0) leaveRequestsData[idx] = { ...leaveRequestsData[idx], ...updated.data };
        return res.json(updated.data);
      }
    } catch (err: any) {}
  }

  const idx = leaveRequestsData.findIndex(r => r.id === id);
  if (idx >= 0) {
    leaveRequestsData[idx] = { ...leaveRequestsData[idx], ...updatePayload };
    return res.json(leaveRequestsData[idx]);
  }

  res.status(404).json({ error: 'درخواست مرخصی یافت نشد' });
});

app.delete('/api/leave-requests/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { userId, personnelId, isAdmin } = getRequestUser(req);

  if (directusUrl && directusAdminToken) {
    try {
      await directusFetch(`/items/leave_requests/${id}`, { method: 'DELETE' });
    } catch {}
  }

  const idx = leaveRequestsData.findIndex(r => r.id === id);
  if (idx >= 0) {
    const item = leaveRequestsData[idx];
    if (!isAdmin && item.personnel_id !== personnelId && item.personnel_id !== userId) {
      return res.status(403).json({ error: 'شما اجازه حذف این درخواست را ندارید.' });
    }
    leaveRequestsData.splice(idx, 1);
    return res.json({ success: true });
  }

  res.json({ success: true });
});

// -------------------------------------------------------------
// SALARY ADVANCE REQUESTS API (درخواست‌های مساعده)
// -------------------------------------------------------------
app.get('/api/advance-requests', async (req: Request, res: Response) => {
  const { userId, personnelId, isAdmin, userName, tenantId } = getRequestUser(req);
  if (directusUrl && directusAdminToken) {
    try {
      const resp = await directusFetch('/items/advance_requests?sort=-date_created&limit=200');
      if (resp && Array.isArray(resp.data)) {
        let list: SalaryAdvanceRequest[] = resp.data.map((r: any) => ({
          ...r,
          personnel_id: typeof r.personnel_id === 'object' && r.personnel_id !== null ? r.personnel_id.id : String(r.personnel_id || ''),
          personnel_name: r.personnel_name || (typeof r.personnel_id === 'object' && r.personnel_id !== null ? (r.personnel_id.name || r.personnel_id.first_name) : 'کارشناس شرکت')
        }));

        // Tenant-based filtering
        if (tenantId && tenantId !== 'all') {
          list = list.filter((r: any) => matchesTenant(r.tenant_id, tenantId));
        }

        if (!isAdmin) {
          list = list.filter(
            (r) =>
              r.personnel_id === personnelId ||
              r.personnel_id === userId ||
              (userName && r.personnel_name === userName)
          );
        }
        return res.json(list);
      }
    } catch (err: any) {}
  }

  let list = [...advanceRequestsData];
  if (tenantId && tenantId !== 'all') {
    list = list.filter((r: any) => matchesTenant(r.tenant_id, tenantId));
  }
  if (!isAdmin) {
    list = list.filter(
      (r) =>
        r.personnel_id === personnelId ||
        r.personnel_id === userId ||
        (userName && r.personnel_name === userName)
    );
  }
  res.json(list);
});

app.post('/api/advance-requests', async (req: Request, res: Response) => {
  const payload = req.body;
  const { userId, personnelId, userName, tenantId } = getRequestUser(req);
  const newId = crypto.randomUUID();
  const nowIso = new Date().toISOString();

  const rawPId = payload.personnel_id || personnelId || userId;
  const resolved = await resolvePersonnelId(rawPId, payload.personnel_name || userName);

  const targetTenantId = payload.tenant_id || tenantId || 'default';

  const newRequest: SalaryAdvanceRequest = {
    id: newId,
    tenant_id: targetTenantId,
    personnel_id: resolved.personnelId || personnelId || userId || 'p-1',
    personnel_name: resolved.personnelName || payload.personnel_name || userName || 'کارشناس شرکت',
    amount: Number(payload.amount) || 0,
    target_month: payload.target_month || '',
    needed_date: payload.needed_date || null,
    reason: payload.reason || '',
    bank_card_number: payload.bank_card_number || null,
    iban: payload.iban || null,
    status: 'pending',
    approved_amount: null,
    manager_note: null,
    reviewed_by: null,
    reviewed_at: null,
    date_created: nowIso
  };

  if (directusUrl && directusAdminToken) {
    try {
      const directusAdvancePayload = {
        ...newRequest,
        tenant_id: resolveDirectusTenantId(targetTenantId)
      };
      const created = await directusFetch('/items/advance_requests', {
        method: 'POST',
        body: JSON.stringify(directusAdvancePayload)
      });
      if (created?.data) {
        advanceRequestsData.unshift(created.data);
        return res.status(201).json(created.data);
      }
    } catch (err: any) {}
  }

  advanceRequestsData.unshift(newRequest);
  res.status(201).json(newRequest);
});

app.patch('/api/advance-requests/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, approved_amount, manager_note } = req.body;
  const { userName, isAdmin } = getRequestUser(req);

  if (!isAdmin) {
    return res.status(403).json({ error: 'فقط مدیر سیستم اجازه تغییر وضعیت درخواست را دارد.' });
  }

  const nowIso = new Date().toISOString();
  const updatePayload = {
    status: status || 'pending',
    approved_amount: approved_amount !== undefined ? Number(approved_amount) : null,
    manager_note: manager_note || null,
    reviewed_by: userName || 'مدیر سیستم',
    reviewed_at: nowIso
  };

  if (directusUrl && directusAdminToken) {
    try {
      const updated = await directusFetch(`/items/advance_requests/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updatePayload)
      });
      if (updated?.data) {
        const idx = advanceRequestsData.findIndex(r => r.id === id);
        if (idx >= 0) advanceRequestsData[idx] = { ...advanceRequestsData[idx], ...updated.data };
        return res.json(updated.data);
      }
    } catch (err: any) {}
  }

  const idx = advanceRequestsData.findIndex(r => r.id === id);
  if (idx >= 0) {
    advanceRequestsData[idx] = { ...advanceRequestsData[idx], ...updatePayload };
    return res.json(advanceRequestsData[idx]);
  }

  res.status(404).json({ error: 'درخواست مساعده یافت نشد' });
});

app.delete('/api/advance-requests/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { userId, personnelId, isAdmin } = getRequestUser(req);

  if (directusUrl && directusAdminToken) {
    try {
      await directusFetch(`/items/advance_requests/${id}`, { method: 'DELETE' });
    } catch {}
  }

  const idx = advanceRequestsData.findIndex(r => r.id === id);
  if (idx >= 0) {
    const item = advanceRequestsData[idx];
    if (!isAdmin && item.personnel_id !== personnelId && item.personnel_id !== userId) {
      return res.status(403).json({ error: 'شما اجازه حذف این درخواست را ندارید.' });
    }
    advanceRequestsData.splice(idx, 1);
    return res.json({ success: true });
  }

  res.json({ success: true });
});

// -------------------------------------------------------------
// PROFILE & PASSWORD UPDATE API (پروفایل و تغییر رمز)
// -------------------------------------------------------------
app.post('/api/auth/update-profile', async (req: Request, res: Response) => {
  const {
    name,
    username,
    phone,
    avatar,
    bank_card_number,
    iban,
    national_id,
    emergency_contact_name,
    emergency_contact_phone,
    emergency_contact_relation,
    family_contacts,
  } = req.body;
  const { userId, personnelId, userEmail, userName } = getRequestUser(req);

  const personnelPatch: Record<string, any> = {};
  if (name) personnelPatch.name = String(name).trim();
  if (username !== undefined) personnelPatch.username = String(username).trim();
  if (phone !== undefined) personnelPatch.phone = String(phone).trim();
  if (avatar !== undefined) personnelPatch.avatar = avatar;
  if (bank_card_number !== undefined) personnelPatch.bank_card_number = String(bank_card_number).trim();
  if (iban !== undefined) personnelPatch.iban = String(iban).trim();
  if (national_id !== undefined) personnelPatch.national_id = String(national_id).trim();
  if (emergency_contact_name !== undefined) personnelPatch.emergency_contact_name = String(emergency_contact_name).trim();
  if (emergency_contact_phone !== undefined) personnelPatch.emergency_contact_phone = String(emergency_contact_phone).trim();
  if (emergency_contact_relation !== undefined) personnelPatch.emergency_contact_relation = String(emergency_contact_relation).trim();
  if (family_contacts !== undefined) personnelPatch.family_contacts = family_contacts;

  let targetPersonnel: any = null;

  if (directusUrl && directusAdminToken) {
    try {
      // 1. Locate existing personnel document in Directus
      let foundPId: string | null = null;
      if (personnelId) {
        const byId = await directusFetch(`/items/personnel/${personnelId}`).catch(() => null);
        if (byId?.data?.id) foundPId = byId.data.id;
      }
      if (!foundPId && userId) {
        const byUser = await directusFetch(`/items/personnel?filter[user_id][_eq]=${userId}`).catch(() => null);
        if (byUser?.data && Array.isArray(byUser.data) && byUser.data.length > 0) {
          foundPId = byUser.data[0].id;
        }
      }
      if (!foundPId && userEmail) {
        const byEmail = await directusFetch(`/items/personnel?filter[email][_eq]=${encodeURIComponent(userEmail)}`).catch(() => null);
        if (byEmail?.data && Array.isArray(byEmail.data) && byEmail.data.length > 0) {
          foundPId = byEmail.data[0].id;
        }
      }

      // 2. Patch or Create in Directus personnel collection
      if (foundPId) {
        const updatedRes = await directusFetch(`/items/personnel/${foundPId}`, {
          method: 'PATCH',
          body: JSON.stringify(personnelPatch)
        });
        targetPersonnel = updatedRes?.data || { id: foundPId, ...personnelPatch };
      } else {
        const newPId = personnelId || crypto.randomUUID();
        const createdRes = await directusFetch('/items/personnel', {
          method: 'POST',
          body: JSON.stringify({
            id: newPId,
            name: name || userName || 'کاربر سیستم',
            email: userEmail || '',
            phone: phone || '',
            role: 'marketer',
            status: 'active',
            user_id: userId || null,
            ...personnelPatch
          })
        });
        targetPersonnel = createdRes?.data || { id: newPId, ...personnelPatch };
      }

      // 3. Also patch directus_users if userId exists
      if (userId) {
        await directusFetch(`/users/${userId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            ...(name ? { first_name: name } : {}),
            ...(avatar ? { avatar } : {})
          })
        }).catch(() => {});
      }
    } catch (err: any) {
      console.error('Directus personnel profile update error:', err.message);
    }
  }

  // Update in-memory fallback
  const targetId = personnelId || userId;
  const idx = personnelData.findIndex(
    p =>
      (targetId && p.id === targetId) ||
      (userId && p.user_id === userId) ||
      (userEmail && p.email?.toLowerCase() === userEmail?.toLowerCase())
  );
  if (idx >= 0) {
    personnelData[idx] = { ...personnelData[idx], ...personnelPatch };
    if (!targetPersonnel) targetPersonnel = personnelData[idx];
  } else {
    const newLocal: Personnel = {
      id: targetId || 'p-1',
      name: name || userName || 'کاربر سیستم',
      email: userEmail || '',
      phone: phone || '',
      role: 'marketer',
      status: 'active',
      active: true,
      ...personnelPatch
    };
    personnelData.push(newLocal);
    if (!targetPersonnel) targetPersonnel = newLocal;
  }

  res.json({ success: true, personnel: targetPersonnel, message: 'مشخصات پروفایل با موفقیت در پایگاه داده مرکزی ذخیره شد.' });
});

app.post('/api/upload-avatar', async (req: Request, res: Response) => {
  const { dataUrl, fileName, mimeType } = req.body;
  const { userId, personnelId } = getRequestUser(req);

  if (!dataUrl) {
    return res.status(400).json({ error: 'فایلی ارسال نشده است.' });
  }

  let finalAvatarUrl = dataUrl;
  let fileId: string | null = null;

  if (directusUrl && directusAdminToken) {
    try {
      const matches = dataUrl.match(/^data:([A-Za-z0-9-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const fileBuffer = Buffer.from(matches[2], 'base64');
        const fileType = matches[1] || mimeType || 'image/jpeg';
        const name = fileName || `avatar-${userId || Date.now()}.jpg`;

        const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
        const header = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${name}"\r\nContent-Type: ${fileType}\r\n\r\n`;
        const footer = `\r\n--${boundary}--\r\n`;
        const bodyBuffer = Buffer.concat([Buffer.from(header, 'utf-8'), fileBuffer, Buffer.from(footer, 'utf-8')]);

        const uploadRes = await fetch(`${directusUrl.replace(/\/$/, '')}/files`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${directusAdminToken}`,
            'Content-Type': `multipart/form-data; boundary=${boundary}`
          },
          body: bodyBuffer
        });

        if (uploadRes.ok) {
          const fileData: any = await uploadRes.json();
          fileId = fileData?.data?.id;
          if (fileId) {
            finalAvatarUrl = `${directusUrl.replace(/\/$/, '')}/assets/${fileId}`;
            if (userId) {
              await directusFetch(`/users/${userId}`, {
                method: 'PATCH',
                body: JSON.stringify({ avatar: fileId })
              }).catch(() => {});
            }
          }
        }
      }
    } catch (e) {
      console.error('Error uploading avatar to Directus:', e);
    }
  }

  const targetId = personnelId || userId;
  const idx = personnelData.findIndex(p => p.id === targetId || p.id === 'p-1');
  if (idx >= 0) {
    personnelData[idx].avatar = finalAvatarUrl;
  }

  res.json({ success: true, avatarUrl: finalAvatarUrl, fileId });
});

app.post('/api/auth/change-password', async (req: Request, res: Response) => {
  const { current_password, new_password } = req.body;
  const { userId } = getRequestUser(req);

  if (!new_password || new_password.length < 6) {
    return res.status(400).json({ error: 'رمز عبور جدید باید حداقل ۶ کاراکتر باشد.' });
  }

  if (directusUrl && directusAdminToken && userId) {
    try {
      await directusFetch(`/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ password: new_password })
      });
      return res.json({ success: true, message: 'رمز عبور با موفقیت تغییر یافت.' });
    } catch (err: any) {
      return res.status(500).json({ error: `خطا در تغییر رمز عبور: ${err.message}` });
    }
  }

  res.json({ success: true, message: 'رمز عبور با موفقیت تغییر یافت.' });
});

// Periodic Expiration Check Trigger
app.post('/api/check-expirations', (req: Request, res: Response) => {
  res.json({ success: true });
});

// ============================================================================
// Data Migration Hub: Import Legacy System Tables (account, contact, history)
// ============================================================================
app.post('/api/migration/import', async (req: Request, res: Response) => {
  const { tenant_id, personnelRows = [], customerRows = [], reportRows = [] } = req.body;
  const targetTenantId = tenant_id || getRequestTenantId(req) || 'default';
  const targetTenantNum = resolveDirectusTenantId(targetTenantId);

  let importedPersonnelCount = 0;
  let importedCustomersCount = 0;
  let importedReportsCount = 0;
  let skippedCount = 0;
  const errors: string[] = [];

  // Helper chunker for Directus bulk requests
  function chunkArray<T>(items: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
      chunks.push(items.slice(i, i + size));
    }
    return chunks;
  }

  // Map to index personnel by ID, username, phone, name
  const legacyUidToPersonnelMap = new Map<string, any>();

  // 1. Fetch current personnel from Directus to ensure real DB IDs are used
  let directusPersonnelList: any[] = [];
  if (directusUrl && directusAdminToken) {
    try {
      const pRes = await directusFetch('/items/personnel?limit=-1');
      if (pRes && Array.isArray(pRes.data)) {
        directusPersonnelList = pRes.data;
      }
    } catch (err: any) {
      console.warn('Could not pre-fetch personnel from Directus:', err.message);
    }
  }

  // Combine with local personnel
  const combinedPersonnel = [...directusPersonnelList];
  for (const p of personnelData) {
    if (!combinedPersonnel.some(cp => cp.id === p.id)) {
      combinedPersonnel.push(p);
    }
  }

  // Index existing personnel
  for (const p of combinedPersonnel) {
    if (p.id) legacyUidToPersonnelMap.set(String(p.id).toLowerCase(), p);
    if (p.username) legacyUidToPersonnelMap.set(String(p.username).toLowerCase(), p);
    if (p.phone) {
      const norm = normalizeContactValue(p.phone, 'mobile');
      if (norm) legacyUidToPersonnelMap.set(norm, p);
    }
    if (p.name) legacyUidToPersonnelMap.set(String(p.name).trim().toLowerCase(), p);
  }

  // Helper to parse Jalali or Gregorian date to ISO
  function jalaliToGregorianCalc(jy: number, jm: number, jd: number): { gy: number; gm: number; gd: number } {
    let j_y = jy - 979;
    let j_m = jm - 1;
    let j_d = jd - 1;
    let j_day_no = 365 * j_y + Math.floor(j_y / 33) * 8 + Math.floor(((j_y % 33) + 3) / 4);
    for (let i = 0; i < j_m; ++i) j_day_no += i < 6 ? 31 : 30;
    j_day_no += j_d;
    let g_day_no = j_day_no + 79;
    let gy = 1600 + 400 * Math.floor(g_day_no / 146097);
    g_day_no = g_day_no % 146097;
    let leap = true;
    if (g_day_no >= 36525) {
      g_day_no--;
      gy += 100 * Math.floor(g_day_no / 36524);
      g_day_no = g_day_no % 36524;
      if (g_day_no >= 365) {
        g_day_no++;
      } else {
        leap = false;
      }
    }
    gy += 4 * Math.floor(g_day_no / 1461);
    g_day_no %= 1461;
    if (g_day_no >= 366) {
      leap = false;
      g_day_no--;
      gy += Math.floor(g_day_no / 365);
      g_day_no = g_day_no % 365;
    }
    const g_days_in_month = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let gm = 0;
    for (let i = 0; i < 12; i++) {
      if (g_day_no < g_days_in_month[i]) {
        gm = i + 1;
        break;
      }
      g_day_no -= g_days_in_month[i];
    }
    const gd = g_day_no + 1;
    return { gy, gm, gd };
  }

  function parseToGregorianIso(val: any): string | null {
    if (!val) return null;
    const str = String(val).trim();
    if (!str || str.toLowerCase() === 'null') return null;

    // 1. Gregorian standard check (e.g. "2025-08-13 17:16:00", "2025-08-13T17:16:00Z", "2018-10-31")
    const gregMatch = str.match(/^(20\d\d|19\d\d)[\/\-](\d{1,2})[\/\-](\d{1,2})(?:[\sT]+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
    if (gregMatch) {
      const gy = parseInt(gregMatch[1], 10);
      const gm = parseInt(gregMatch[2], 10) - 1;
      const gd = parseInt(gregMatch[3], 10);
      const hh = gregMatch[4] ? parseInt(gregMatch[4], 10) : 12;
      const mm = gregMatch[5] ? parseInt(gregMatch[5], 10) : 0;
      const ss = gregMatch[6] ? parseInt(gregMatch[6], 10) : 0;
      const d = new Date(Date.UTC(gy, gm, gd, hh, mm, ss));
      if (!isNaN(d.getTime())) return d.toISOString();
    }

    // 2. Jalali compact or separated with optional time (e.g. "14040522-1816", "1404/05/25 13:45", "14040522")
    const cleanCompact = str.replace(/[^0-9]/g, '');
    if (cleanCompact.startsWith('13') || cleanCompact.startsWith('14')) {
      if (cleanCompact.length >= 8) {
        const jy = parseInt(cleanCompact.substring(0, 4), 10);
        const jm = parseInt(cleanCompact.substring(4, 6), 10);
        const jd = parseInt(cleanCompact.substring(6, 8), 10);
        let hh = 12, mm = 0, ss = 0;
        if (cleanCompact.length >= 12) {
          hh = parseInt(cleanCompact.substring(8, 10), 10);
          mm = parseInt(cleanCompact.substring(10, 12), 10);
        }
        try {
          const g = jalaliToGregorianCalc(jy, jm, jd);
          return new Date(Date.UTC(g.gy, g.gm - 1, g.gd, hh, mm, ss)).toISOString();
        } catch {}
      }
    }

    // 3. Jalali with slashes/dashes
    if (str.includes('/') || str.includes('-')) {
      const parts = str.split(/[\s\/\-]/).filter(Boolean);
      if (parts.length >= 3) {
        const p1 = parseInt(parts[0], 10);
        if (p1 > 1300 && p1 < 1500) {
          const jy = p1;
          const jm = parseInt(parts[1], 10);
          const jd = parseInt(parts[2], 10);
          try {
            const g = jalaliToGregorianCalc(jy, jm, jd);
            return new Date(Date.UTC(g.gy, g.gm - 1, g.gd, 12, 0, 0)).toISOString();
          } catch {}
        }
      }
    }

    const standardDate = new Date(str);
    if (!isNaN(standardDate.getTime())) {
      return standardDate.toISOString();
    }
    return new Date().toISOString();
  }

  // --------------------------------------------------------------------------
  // STEP 1: IMPORT PERSONNEL (account)
  // --------------------------------------------------------------------------
  const personnelToInsertBatch: any[] = [];
  for (const row of personnelRows) {
    try {
      const uid = String(row.uid || row.ID || row.id || '').trim();
      const fname = String(row.fname || '').trim();
      const lname = String(row.lname || '').trim();
      const fullName = (fname + ' ' + lname).trim() || String(row.name || row.username || `کارشناس ${uid}`);
      const username = String(row.username || uid || `user_${uid}`).trim().toLowerCase();
      const rawPhone = String(row.contacts || row.phone || row.mobile || '').trim();
      const firstPhone = rawPhone.split(/[,;\n]/)[0]?.trim() || '';
      const normalizedPhone = normalizeContactValue(firstPhone, 'mobile');
      const email = String(row.email || (username ? `${username}@company.ir` : `user_${uid}@company.ir`)).trim();
      const roleStr = String(row.userlevel || row.acctype || row.role || '').toLowerCase();
      let assignedRole: any = 'marketer';
      if (roleStr === '0' || roleStr.includes('admin') || username === 'admin') {
        assignedRole = 'admin';
      } else if (roleStr.includes('manager') || roleStr === '1') {
        assignedRole = 'sales_manager';
      }

      // Check if personnel already exists in indexed map
      let existing = legacyUidToPersonnelMap.get(username) ||
                     (uid ? legacyUidToPersonnelMap.get(uid.toLowerCase()) : null) ||
                     (normalizedPhone ? legacyUidToPersonnelMap.get(normalizedPhone) : null);

      if (!existing) {
        const personnelId = uid ? `p-${uid}` : crypto.randomUUID();
        const newPersonnel: any = {
          id: personnelId,
          name: fullName,
          username: username,
          role: assignedRole,
          email: email,
          phone: normalizedPhone || '09000000000',
          national_id: String(row.code || row.shenasname || '').trim() || null,
          status: 'active',
          active: true,
        };
        if (targetTenantNum) {
          newPersonnel.tenant_id = targetTenantNum;
        }

        personnelToInsertBatch.push(newPersonnel);
        legacyUidToPersonnelMap.set(personnelId.toLowerCase(), newPersonnel);
        if (uid) legacyUidToPersonnelMap.set(uid.toLowerCase(), newPersonnel);
        if (username) legacyUidToPersonnelMap.set(username, newPersonnel);
        if (normalizedPhone) legacyUidToPersonnelMap.set(normalizedPhone, newPersonnel);
      } else {
        if (uid) legacyUidToPersonnelMap.set(uid.toLowerCase(), existing);
        if (username) legacyUidToPersonnelMap.set(username, existing);
      }
    } catch (err: any) {
      errors.push(`خطا در پردازش اطلاعات کاربر ${row.fname || row.username}: ${err.message}`);
    }
  }

  // Insert personnel in batch into Directus
  if (personnelToInsertBatch.length > 0 && directusUrl && directusAdminToken) {
    try {
      const pChunks = chunkArray(personnelToInsertBatch, 100);
      for (const pChunk of pChunks) {
        const insRes = await directusFetch('/items/personnel', {
          method: 'POST',
          body: JSON.stringify(pChunk),
        });
        if (insRes && Array.isArray(insRes.data)) {
          importedPersonnelCount += insRes.data.length;
          for (const p of insRes.data) {
            personnelData.push(p);
            legacyUidToPersonnelMap.set(String(p.id).toLowerCase(), p);
            if (p.username) legacyUidToPersonnelMap.set(String(p.username).toLowerCase(), p);
          }
        }
      }
    } catch (pErr: any) {
      console.error('Directus bulk insert personnel error:', pErr.message);
      errors.push(`خطا در ثبت گروهی کارشناسان در دایرکتوس: ${pErr.message}`);
      for (const p of personnelToInsertBatch) {
        personnelData.push(p);
        importedPersonnelCount++;
      }
    }
  } else {
    for (const p of personnelToInsertBatch) {
      personnelData.push(p);
      importedPersonnelCount++;
    }
  }

  // --------------------------------------------------------------------------
  // STEP 2: IMPORT CUSTOMERS (contact)
  // --------------------------------------------------------------------------
  const legacyCustomerRefMap = new Map<string, any>();
  const customersToInsertBatch: any[] = [];
  const contactsToInsertBatch: any[] = [];

  for (const row of customerRows) {
    try {
      const callId = String(row.CallID || row.callid || row.id || '').trim();
      const customerIdLegacy = String(row.CustomerID || row.customerid || '').trim();
      const companyName = String(row.CompanyName || row.companyName || row.marketName || 'بدون نام').trim();
      const businessType = String(row.job || row.business_type || '').trim();
      const province = String(row.province || '').trim();
      const city = String(row.city || '').trim();
      const managerName = String(row.managerName || row.manager_name || '').trim();
      const managerPhone = String(row.managerPhone || '').trim();
      const rawMobiles = String(row.mobiles || '').trim();
      const rawLandlines = String(row.phonelines || '').trim();
      const instaId = String(row.instaID || '').trim();
      const telegId = String(row.telegID || '').trim();
      const tlgMobile = String(row.tlgMobile || '').trim();
      const email = String(row.emails || '').trim();
      const website = String(row.website || row.marketingWebsite || '').trim();

      const mobileList: string[] = [];
      if (rawMobiles) {
        rawMobiles.split(/[,;\n]/).forEach(m => {
          const norm = normalizeContactValue(m, 'mobile');
          if (norm && !mobileList.includes(norm)) mobileList.push(norm);
        });
      }
      if (managerPhone) {
        const norm = normalizeContactValue(managerPhone, 'mobile');
        if (norm && !mobileList.includes(norm)) mobileList.push(norm);
      }

      const landlineList: string[] = [];
      if (rawLandlines) {
        rawLandlines.split(/[,;\n]/).forEach(l => {
          const norm = normalizeContactValue(l, 'landline');
          if (norm && !landlineList.includes(norm)) landlineList.push(norm);
        });
      }

      // Match marketer
      const legacyMarketerUid = String(row.Referrals || row.lockOwner || row.uid || '').trim().toLowerCase();
      const assignedPersonnel = legacyUidToPersonnelMap.get(legacyMarketerUid) ||
                              legacyUidToPersonnelMap.get(String(row.uid || '').trim().toLowerCase()) ||
                              combinedPersonnel[0];

      // Negotiation status mapping
      const rawStat = String(row.lastStat || row.status || '').trim();
      let mappedStatus: any = 'تماس برقرار نشده';
      if (rawStat.includes('قرارداد') || rawStat.includes('فاکتور')) {
        mappedStatus = 'قرارداد';
      } else if (rawStat.includes('نمیخواد')) {
        mappedStatus = 'نمیخواد';
      } else if (rawStat.includes('پاسخ نمیدهد') || rawStat.includes('پاسخ نداد')) {
        mappedStatus = 'پاسخ نمیدهد';
      } else if (rawStat.includes('قبل از انقضا')) {
        mappedStatus = 'پیگیری قبل از انقضا';
      } else if (rawStat.includes('بلند مدت')) {
        mappedStatus = 'پیگیری بلند مدت';
      } else if (rawStat.includes('لیست سیاه') || String(row.blackList || '').toLowerCase() === 'yes') {
        mappedStatus = 'لیست سیاه';
      } else if (rawStat) {
        mappedStatus = 'پیگیری قبل از انقضا';
      }

      const isExpiredLegacy = String(row.expire || '') === '1' || String(row.is_expired || '') === 'true';
      const createdIso = parseToGregorianIso(row.InsertRecDate || row.created) || new Date().toISOString();

      // Pre-generate guaranteed UUID for Directus
      const newCustId = crypto.randomUUID();

      const newCustObj: any = {
        id: newCustId,
        company_name: companyName,
        business_type: businessType || 'سایر اصناف',
        province: province || 'نامشخص',
        city: city || 'نامشخص',
        manager_name: managerName || 'مدیریت',
        manager_phones: managerPhone ? [normalizeContactValue(managerPhone, 'mobile')] : [],
        negotiator_name: managerName || 'مدیریت',
        negotiator_phones: [],
        mobile_numbers: mobileList.length > 0 ? mobileList : ['09000000000'],
        landline_numbers: landlineList,
        telegram_phone: tlgMobile || null,
        telegram_ids: telegId ? [telegId.replace('@', '')] : null,
        instagram_ids: instaId ? [instaId.replace('@', '')] : null,
        emails: email ? [email] : null,
        websites: website ? [website] : null,
        is_ecommerce: Boolean(website || row.system),
        interview_status: 'انتقال از سامانه قدیم',
        interview_report: `پرونده انتقال‌یافته از پایگاه داده قدیم - کد تماس ${callId}`,
        interview_score: 5,
        next_followup_date: null,
        assigned_marketer_id: assignedPersonnel?.id || null,
        assigned_marketer_name: assignedPersonnel?.name || 'بدون مسئول',
        assignment_deadline: isExpiredLegacy ? null : new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        assignment_duration_days: 10,
        status: mappedStatus,
        is_expired: isExpiredLegacy,
        date_created: createdIso,
      };
      if (targetTenantNum) {
        newCustObj.tenant_id = targetTenantNum;
      }

      customersToInsertBatch.push(newCustObj);

      // Cache reference for reports linking
      if (callId) legacyCustomerRefMap.set(callId, newCustObj);
      if (customerIdLegacy) legacyCustomerRefMap.set(customerIdLegacy, newCustObj);
      if (mobileList[0]) legacyCustomerRefMap.set(mobileList[0], newCustObj);

      // Prepare contacts
      for (const m of mobileList) {
        contactsToInsertBatch.push({
          id: crypto.randomUUID(),
          customer_id: newCustId,
          channel_type: 'mobile',
          value: m,
          normalized_value: m,
          contact_name: newCustObj.manager_name,
          contact_role: 'موبایل انتقال‌یافته',
          is_primary: true,
          date_created: newCustObj.date_created,
        });
      }
    } catch (err: any) {
      errors.push(`خطا در پردازش پرونده مشتری ${row.CompanyName || 'نامشخص'}: ${err.message}`);
    }
  }

  // Insert customers & contacts in batch into Directus
  if (customersToInsertBatch.length > 0 && directusUrl && directusAdminToken) {
    try {
      const cChunks = chunkArray(customersToInsertBatch, 100);
      for (const cChunk of cChunks) {
        const insRes = await directusFetch('/items/customers', {
          method: 'POST',
          body: JSON.stringify(cChunk),
        });
        if (insRes && Array.isArray(insRes.data)) {
          importedCustomersCount += insRes.data.length;
          for (const c of insRes.data) {
            customersData.unshift(c);
          }
        }
      }

      // Batch insert contacts
      if (contactsToInsertBatch.length > 0) {
        const ctChunks = chunkArray(contactsToInsertBatch, 100);
        for (const ctChunk of ctChunks) {
          try {
            const insCtRes = await directusFetch('/items/customer_contacts', {
              method: 'POST',
              body: JSON.stringify(ctChunk),
            });
            if (insCtRes && Array.isArray(insCtRes.data)) {
              for (const ct of insCtRes.data) {
                contactsData.push(ct);
              }
            }
          } catch (ctErr: any) {
            console.warn('Customer contacts bulk insert warning:', ctErr.message);
          }
        }
      }
    } catch (cErr: any) {
      console.error('Directus bulk insert customers error:', cErr.message);
      errors.push(`خطا در ثبت گروهی مشتریان در دایرکتوس: ${cErr.message}`);
      for (const c of customersToInsertBatch) {
        customersData.unshift(c);
        importedCustomersCount++;
      }
    }
  } else {
    for (const c of customersToInsertBatch) {
      customersData.unshift(c);
      importedCustomersCount++;
    }
  }

  // --------------------------------------------------------------------------
  // STEP 3: IMPORT ALL REPORTS (history) WITH ACCURATE CREATION DATES
  // --------------------------------------------------------------------------
  // If reportRows are provided independently (or along with customers), index existing customers from Directus
  if (reportRows.length > 0 && directusUrl && directusAdminToken) {
    try {
      const pList = [];
      for (let page = 1; page <= 6; page++) {
        pList.push(
          directusFetch(`/items/customers?filter[interview_report][_starts_with]=${encodeURIComponent('پرونده انتقال‌یافته از پایگاه داده قدیم - کد تماس')}&limit=1000&page=${page}&fields=id,interview_report,assigned_marketer_name,mobile_numbers,status,next_followup_date`)
            .catch(() => null)
        );
      }
      const pageResults = await Promise.all(pList);
      for (const res of pageResults) {
        if (res && Array.isArray(res.data)) {
          for (const c of res.data) {
            const m = (c.interview_report || '').match(/کد تماس\s+(\d+)/);
            if (m && m[1]) {
              if (!legacyCustomerRefMap.has(m[1])) {
                legacyCustomerRefMap.set(m[1], c);
              }
            }
          }
        }
      }
    } catch (idxErr: any) {
      console.warn('Could not pre-index existing customers by CallID:', idxErr.message);
    }
  }

  const reportsToInsertBatch: any[] = [];
  const latestReportPerCustomer = new Map<string, { report: any; parsedDate: number }>();

  for (const rep of reportRows) {
    try {
      const callId = String(rep.CallID || rep.callid || '').trim();
      const customerIdLegacy = String(rep.customerID || rep.customerid || '').trim();
      const callNum = String(rep.callNum || rep.callnum || rep.phone || '').trim();
      const normCallNum = normalizeContactValue(callNum, 'mobile');

      const targetCustomer = (callId && legacyCustomerRefMap.get(callId)) ||
                             (customerIdLegacy && legacyCustomerRefMap.get(customerIdLegacy)) ||
                             (normCallNum && legacyCustomerRefMap.get(normCallNum)) ||
                             customersData.find(c => (normCallNum && c.mobile_numbers && c.mobile_numbers.includes(normCallNum)) || (callId && c.interview_report && c.interview_report.includes(callId)));

      if (!targetCustomer) {
        skippedCount++;
        continue;
      }

      const negotiatorName = String(rep.negotiator || targetCustomer.assigned_marketer_name || 'کارشناس مذاکره').trim();
      const reportText = String(rep.report || rep.text || 'مذاکره انجام شد.').trim();
      const phoneForReport = normCallNum || callNum || (targetCustomer.mobile_numbers && targetCustomer.mobile_numbers[0]) || '';
      const rawRating = parseInt(String(rep.rating || 5), 10);
      const rating = isNaN(rawRating) ? 5 : Math.min(Math.max(rawRating > 10 ? Math.round(rawRating / 2) : rawRating, 1), 10);
      const nextFollowIso = parseToGregorianIso(rep.nextFollow);
      const repStat = String(rep.status || '').trim();

      let repStatusMapped: any = targetCustomer.status || 'تماس برقرار نشده';
      if (repStat.includes('قرارداد') || repStat.includes('فاکتور')) {
        repStatusMapped = 'قرارداد';
      } else if (repStat.includes('نمیخواد')) {
        repStatusMapped = 'نمیخواد';
      } else if (repStat.includes('پاسخ نمیدهد')) {
        repStatusMapped = 'پاسخ نمیدهد';
      } else if (repStat.includes('قبل از انقضا')) {
        repStatusMapped = 'پیگیری قبل از انقضا';
      } else if (repStat.includes('بلند مدت')) {
        repStatusMapped = 'پیگیری بلند مدت';
      }

      // Priority: insertDate > dateTime > varcharDate > updateDate
      const rawDateCreated = rep.insertDate || rep.dateTime || rep.varcharDate || rep.updateDate;
      const repDateCreated = parseToGregorianIso(rawDateCreated) || new Date().toISOString();
      const repTimestamp = new Date(repDateCreated).getTime();

      const newRepObj: any = { 
        id: crypto.randomUUID(),
        customer_id: targetCustomer.id,
        negotiator_name: negotiatorName,
        negotiation_phone: phoneForReport,
        report_text: reportText,
        negotiation_score: rating,
        next_followup_date: nextFollowIso,
        negotiation_status: repStatusMapped,
        date_created: repDateCreated,
      };

      if (targetTenantNum) {
        newRepObj.tenant_id = targetTenantNum;
      }

      reportsToInsertBatch.push(newRepObj);

      // Track latest report per customer to sync latest status and next_followup_date
      const currentLatest = latestReportPerCustomer.get(targetCustomer.id);
      if (!currentLatest || repTimestamp >= currentLatest.parsedDate) {
        latestReportPerCustomer.set(targetCustomer.id, {
          report: newRepObj,
          parsedDate: repTimestamp,
        });
        targetCustomer.status = repStatusMapped;
        if (nextFollowIso) {
          targetCustomer.next_followup_date = nextFollowIso;
        }
      }
    } catch (err: any) {
      errors.push(`خطا در پردازش گزارش با شناسه ${rep.ID || rep.CallID || 'نامشخص'}: ${err.message}`);
    }
  }

  // Insert reports in batch into Directus
  if (reportsToInsertBatch.length > 0 && directusUrl && directusAdminToken) {
    try {
      const rChunks = chunkArray(reportsToInsertBatch, 100);
      for (const rChunk of rChunks) {
        const insRes = await directusFetch('/items/customer_reports', {
          method: 'POST',
          body: JSON.stringify(rChunk),
        });
        if (insRes && Array.isArray(insRes.data)) {
          importedReportsCount += insRes.data.length;
          for (const r of insRes.data) {
            reportsData.unshift(r);
          }
        }
      }
    } catch (rErr: any) {
      console.error('Directus bulk insert reports error:', rErr.message);
      errors.push(`خطا در ثبت گروهی گزارش‌ها در دایرکتوس: ${rErr.message}`);
      for (const r of reportsToInsertBatch) {
        reportsData.unshift(r);
        importedReportsCount++;
      }
    }
  } else {
    for (const r of reportsToInsertBatch) {
      reportsData.unshift(r);
      importedReportsCount++;
    }
  }

  return res.json({
    success: errors.length === 0 || importedCustomersCount > 0 || importedReportsCount > 0,
    importedPersonnelCount,
    importedCustomersCount,
    importedReportsCount,
    skippedCount,
    errors,
    message: `درون‌ریزی با موفقیت به پایان رسید: ${importedPersonnelCount} کارشناس، ${importedCustomersCount} پرونده مشتری، و ${importedReportsCount} گزارش مذاکره با تاریخ دقیق ثبت مستقیماً در پایگاه داده ثبت و پیوند داده شدند.`
  });
});

// Setup Vite middleware in dev or static serving in production
async function setupViteOrStatic() {
  if (directusUrl && directusAdminToken) {
    ensureDirectusTenants()
      .then(() => ensureDirectusPersonnel())
      .catch((err) => console.warn('Database initialization warning:', err.message));
  }

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        if (req.path.startsWith('/api')) {
          return res.status(404).json({ error: 'API endpoint not found' });
        }
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    } else {
      console.warn('Production build dist folder not found! Run npm run build first.');
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
    console.log(`BFF Mode: ${directusUrl ? 'Online Database Connected' : 'Offline Mode'}`);
  });
}

setupViteOrStatic().catch(err => {
  console.error('Failed to start server:', err);
});
