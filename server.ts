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
  personnel_id: string;
  personnel_name: string;
  report_date: string;
  calls_count: number;
  successful_contacts: number;
  leads_converted: number;
  tasks_summary: string;
  challenges: string;
  tomorrow_plan: string;
  date_created: string;
}

export interface Personnel {
  id: string;
  name: string;
  role: 'admin' | 'sales_manager' | 'marketer' | 'operator';
  email: string;
  phone: string;
  avatar?: string;
  status?: string;
  active?: boolean;
}

const initialPersonnel: Personnel[] = [
  {
    id: 'p-1',
    name: 'محمدرضا کیانی',
    role: 'admin',
    email: 'kiani@company.ir',
    phone: '09121112233',
    status: 'active',
    active: true
  },
  {
    id: 'p-2',
    name: 'سارا احمدی',
    role: 'marketer',
    email: 'sara.ahmadi@company.ir',
    phone: '09123456789',
    status: 'active',
    active: true
  },
  {
    id: 'p-3',
    name: 'علیرضا حسینی',
    role: 'marketer',
    email: 'hosseini@company.ir',
    phone: '09351234567',
    status: 'active',
    active: true
  },
  {
    id: 'p-4',
    name: 'مهدی زمانی',
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

// Auto-seed personnel into Directus so foreign key assigned_marketer_id is always satisfied
async function ensureDirectusPersonnel() {
  if (!directusUrl || !directusAdminToken) return;
  try {
    const res = await directusFetch('/items/personnel?limit=100');
    if (res && Array.isArray(res.data) && res.data.length === 0) {
      console.log('Seeding initial personnel into Directus...');
      await directusFetch('/items/personnel', {
        method: 'POST',
        body: JSON.stringify(initialPersonnel.map(p => ({
          id: p.id,
          name: p.name,
          role: p.role,
          phone: p.phone,
          email: p.email,
          status: 'active'
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
    userEmail
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

      // 3. Create or link Personnel entry with user_id
      const personnelId = crypto.randomUUID();
      const personnelPayload = {
        id: personnelId,
        name: fullName,
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
            body: JSON.stringify({ user_id: createdUser.id, name: fullName, phone: cleanPhone })
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
  const mockUserId = crypto.randomUUID();
  const mockPersonnel: Personnel = {
    id: 'p-' + Date.now(),
    name: fullName,
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
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'ایمیل و کلمه عبور را وارد کنید.' });
  }

  const cleanEmail = String(email).trim().toLowerCase();

  if (directusUrl && directusAdminToken) {
    try {
      // 1. Authenticate with Directus
      let loginToken = '';
      try {
        const loginRes = await directusFetch('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email: cleanEmail, password: String(password) })
        });
        loginToken = loginRes.data?.access_token || '';
      } catch (authErr: any) {
        return res.status(401).json({ error: 'ایمیل یا کلمه عبور اشتباه است.' });
      }

      // 2. Fetch full user info including role
      const userRes = await directusFetch(`/users?filter[email][_eq]=${encodeURIComponent(cleanEmail)}&fields=*,role.*`);
      if (!userRes || !Array.isArray(userRes.data) || userRes.data.length === 0) {
        return res.status(404).json({ error: 'اطلاعات کاربری یافت نشد.' });
      }

      const user = userRes.data[0];
      const roleId = typeof user.role === 'object' ? user.role?.id : user.role;
      const isAdmin = roleId === DIRECTUS_ADMIN_ROLE_ID || user.role?.name?.toLowerCase() === 'administrator';

      const fullName = (`${user.first_name || ''} ${user.last_name || ''}`).trim() || user.email;

      // 3. Find or link personnel record
      let personnelItem: any = null;
      const pRes = await directusFetch(`/items/personnel?filter[_or][0][user_id][_eq]=${user.id}&filter[_or][1][email][_eq]=${encodeURIComponent(cleanEmail)}`).catch(() => null);
      if (pRes && Array.isArray(pRes.data) && pRes.data.length > 0) {
        personnelItem = pRes.data[0];
        // Ensure user_id is saved
        if (!personnelItem.user_id) {
          await directusFetch(`/items/personnel/${personnelItem.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ user_id: user.id })
          }).catch(() => {});
        }
      } else {
        // Create personnel record if missing
        const newPId = crypto.randomUUID();
        const createdP = await directusFetch('/items/personnel', {
          method: 'POST',
          body: JSON.stringify({
            id: newPId,
            name: fullName,
            email: cleanEmail,
            phone: '',
            role: isAdmin ? 'admin' : 'marketer',
            status: 'active',
            user_id: user.id
          })
        }).catch(() => null);
        personnelItem = createdP?.data || {
          id: newPId,
          name: fullName,
          email: cleanEmail,
          phone: '',
          role: isAdmin ? 'admin' : 'marketer',
          status: 'active',
          user_id: user.id
        };
      }

      return res.json({
        success: true,
        access_token: loginToken,
        user: {
          id: user.id,
          email: user.email,
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
  const found = initialPersonnel.find(p => p.email.toLowerCase() === cleanEmail);
  if (found) {
    return res.json({
      success: true,
      access_token: 'local-token-' + found.id,
      user: {
        id: found.id,
        email: found.email,
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

// Personnel API
app.get('/api/personnel', async (req: Request, res: Response) => {
  if (directusUrl && directusAdminToken) {
    try {
      const result = await directusFetch('/items/personnel?sort=id');
      if (result && Array.isArray(result.data)) {
        if (result.data.length === 0) {
          await ensureDirectusPersonnel();
          const refreshed = await directusFetch('/items/personnel?sort=id');
          return res.json(refreshed.data || initialPersonnel);
        }
        return res.json(result.data);
      }
    } catch (e: any) {
      return res.status(502).json({ error: `خطا در فراخوانی پرسنل از پایگاه داده مرکزی: ${e.message}` });
    }
  }
  res.json(initialPersonnel);
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
  const { search, status, marketer_id, expired_only } = req.query;
  const { userId, personnelId, userRole, isAdmin, userName } = getRequestUser(req);

  if (directusUrl && directusAdminToken) {
    try {
      const result = await directusFetch('/items/customers?sort=-date_created&limit=500&fields=*,contacts.*');
      if (result && Array.isArray(result.data)) {
        let list = result.data.map((c: any) => computeCustomerExpiration(c));

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

// Customer Reports API
app.get('/api/customer-reports', async (req: Request, res: Response) => {
  const { customer_id } = req.query;
  const { userId, personnelId, userRole, isAdmin, userName } = getRequestUser(req);

  if (directusUrl && directusAdminToken) {
    try {
      const q = customer_id ? `?filter[customer_id][_eq]=${customer_id}&sort=-date_created&limit=500` : '?sort=-date_created&limit=500';
      const result = await directusFetch(`/items/customer_reports${q}`);
      if (result && Array.isArray(result.data)) {
        let reportsList = result.data;
        // Non-admin Marketer/Staff only sees their own reports when browsing general reports list
        if (!isAdmin && (userId || personnelId || userName) && !customer_id) {
          reportsList = reportsList.filter((r: any) =>
            (userName && r.negotiator_name === userName) ||
            r.created_by === userName ||
            (userId && r.created_by === userId) ||
            (personnelId && r.created_by === personnelId)
          );
        }
        return res.json(reportsList);
      }
    } catch (e: any) {
      return res.status(502).json({ error: `خطا در دریافت گزارش‌ها از پایگاه داده مرکزی: ${e.message}` });
    }
  }

  let repList = reportsData;
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
  const { userId, personnelId, userName, isAdmin } = getRequestUser(req);
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

  const newReport: CustomerReport = {
    id: newReportId,
    customer_id: payload.customer_id,
    negotiator_name: finalNegotiatorName,
    negotiation_phone: (payload.negotiation_phone || '').trim(),
    report_text: (payload.report_text || '').trim(),
    negotiation_score: Number(payload.negotiation_score) || 5,
    next_followup_date: nextFollowup,
    negotiation_status: payload.negotiation_status || 'پیگیری قبل از انقضا',
    created_by: userName || personnelId || userId,
    date_created: nowIso
  };

  if (directusUrl && directusAdminToken) {
    try {
      const created = await directusFetch('/items/customer_reports', {
        method: 'POST',
        body: JSON.stringify(newReport)
      });

      // Synchronize latest status & follow-up date on customer document
      const customerUpdatePayload: Record<string, any> = {
        status: newReport.negotiation_status,
        date_updated: nowIso
      };
      if (nextFollowup) {
        customerUpdatePayload.next_followup_date = nextFollowup;
      }
      if (newReport.negotiation_status === 'قرارداد') {
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
  const { userId, personnelId, userRole, isAdmin, userName } = getRequestUser(req);

  if (directusUrl && directusAdminToken) {
    try {
      const result = await directusFetch('/items/cold_leads?sort=-date_created&limit=500');
      if (result && Array.isArray(result.data)) {
        let leads = result.data;
        if (!isAdmin && (userName || userId || personnelId)) {
          leads = leads.filter((l: any) =>
            l.assigned_to === userName ||
            l.assigned_to === personnelId ||
            l.assigned_to === userId ||
            !l.assigned_to ||
            l.assigned_to === 'تخصیص نیافته' ||
            l.assigned_to === 'همه'
          );
        }
        return res.json(leads);
      }
    } catch (e: any) {
      return res.status(502).json({ error: `خطا در دریافت شماره‌های اولیه از پایگاه داده مرکزی: ${e.message}` });
    }
  }
  res.json([]);
});

app.post('/api/cold-leads', async (req: Request, res: Response) => {
  const payload = req.body;
  const { userName } = getRequestUser(req);
  const newLeadId = crypto.randomUUID();
  const nowIso = new Date().toISOString();

  let convertedCustId: string | null = payload.converted_customer_id || null;
  if (!convertedCustId || String(convertedCustId).trim() === '') {
    convertedCustId = null;
  }

  const newLead: ColdLead = {
    id: newLeadId,
    phone_number: (payload.phone_number || '').trim(),
    contact_name: (payload.contact_name || '').trim(),
    source: payload.source || 'ورود دستی',
    status: payload.status || 'تماس نگرفته',
    notes: (payload.notes || '').trim(),
    assigned_to: (payload.assigned_to || userName || '').trim(),
    converted_customer_id: convertedCustId,
    date_created: nowIso
  };

  if (directusUrl && directusAdminToken) {
    try {
      const created = await directusFetch('/items/cold_leads', {
        method: 'POST',
        body: JSON.stringify(newLead)
      });
      return res.status(201).json(created.data || newLead);
    } catch (err: any) {
      console.error('Cold lead error:', err.message);
      return res.status(500).json({
        error: 'LEAD_SAVE_FAILED',
        message: `خطا در ثبت شماره در پایگاه داده مرکزی: ${err.message}`
      });
    }
  }

  res.status(201).json(newLead);
});

app.patch('/api/cold-leads/:id', async (req: Request, res: Response) => {
  const payload = req.body;
  const cleanPatch = { ...payload };
  if (cleanPatch.converted_customer_id === '') {
    cleanPatch.converted_customer_id = null;
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

  res.status(404).json({ error: 'Lead not found' });
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
  const { userId, personnelId, userRole, isAdmin, userName } = getRequestUser(req);

  if (directusUrl && directusAdminToken) {
    try {
      const result = await directusFetch('/items/administrative_reports?sort=-report_date&limit=500');
      if (result && Array.isArray(result.data)) {
        let reports = result.data;
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
  const { userId, personnelId, userName } = getRequestUser(req);
  const newAdmId = crypto.randomUUID();
  const nowIso = new Date().toISOString();

  const rawPId = payload.personnel_id || personnelId || userId;
  const resolved = await resolvePersonnelId(rawPId, payload.personnel_name || userName);

  const newReport: AdministrativeReport = {
    id: newAdmId,
    personnel_id: resolved.personnelId || 'p-1',
    personnel_name: resolved.personnelName || payload.personnel_name || userName || 'پرسنل شرکت',
    report_date: payload.report_date || nowIso.split('T')[0],
    calls_count: Number(payload.calls_count) || 0,
    successful_contacts: Number(payload.successful_contacts) || 0,
    leads_converted: Number(payload.leads_converted) || 0,
    tasks_summary: payload.tasks_summary || '',
    challenges: payload.challenges || '',
    tomorrow_plan: payload.tomorrow_plan || '',
    date_created: nowIso
  };

  if (directusUrl && directusAdminToken) {
    try {
      const created = await directusFetch('/items/administrative_reports', {
        method: 'POST',
        body: JSON.stringify(newReport)
      });
      return res.status(201).json(created.data || newReport);
    } catch (err: any) {
      console.error('Admin report create error:', err.message);
      return res.status(500).json({
        error: 'ADMIN_REPORT_FAILED',
        message: `خطا در ثبت گزارش اداری در پایگاه داده مرکزی: ${err.message}`
      });
    }
  }

  res.status(201).json(newReport);
});

// Periodic Expiration Check Trigger
app.post('/api/check-expirations', (req: Request, res: Response) => {
  res.json({ success: true });
});

// Setup Vite middleware in dev or static serving in production
async function setupViteOrStatic() {
  if (directusUrl && directusAdminToken) {
    ensureDirectusPersonnel().catch(() => {});
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
