import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '10mb' }));

// Directus configuration (can be configured via ENV or runtime settings)
let directusUrl = process.env.DIRECTUS_URL || '';
let directusAdminToken = process.env.DIRECTUS_ADMIN_TOKEN || '';

// Mock/Local persistent in-memory fallback store
interface Customer {
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
  is_ecommerce: boolean;
  interview_status: string;
  interview_report: string;
  interview_score: number;
  next_followup_date: string;
  assigned_marketer_id: string;
  assigned_marketer_name: string;
  assignment_date: string;
  assignment_deadline: string;
  status: string;
  is_expired?: boolean;
  date_created: string;
  date_updated: string;
}

interface CustomerReport {
  id: string;
  customer_id: string;
  negotiator_name: string;
  negotiation_phone: string;
  report_text: string;
  negotiation_score: number;
  next_followup_date: string;
  negotiation_status: string;
  created_by?: string;
  date_created: string;
}

interface ColdLead {
  id: string;
  phone_number: string;
  contact_name: string;
  source: string;
  status: 'تماس نگرفته' | 'پاسخ نداد' | 'در حال بررسی' | 'تبدیل شده به مشتری' | 'شماره نامعتبر';
  notes: string;
  assigned_to: string;
  converted_customer_id?: string;
  date_created: string;
}

interface AdministrativeReport {
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

interface Personnel {
  id: string;
  name: string;
  role: 'admin' | 'sales_manager' | 'marketer' | 'operator';
  email: string;
  phone: string;
  avatar?: string;
  active: boolean;
}

// Initial seed data
const initialPersonnel: Personnel[] = [
  {
    id: 'p-1',
    name: 'محمدرضا کیانی',
    role: 'admin',
    email: 'kiani@company.ir',
    phone: '09121112233',
    active: true
  },
  {
    id: 'p-2',
    name: 'سارا احمدی',
    role: 'marketer',
    email: 'sara.ahmadi@company.ir',
    phone: '09123456789',
    active: true
  },
  {
    id: 'p-3',
    name: 'علیرضا حسینی',
    role: 'marketer',
    email: 'hosseini@company.ir',
    phone: '09351234567',
    active: true
  },
  {
    id: 'p-4',
    name: 'مهدی زمانی',
    role: 'sales_manager',
    email: 'zamani@company.ir',
    phone: '09197654321',
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
    assignment_date: addDays(now, -3),
    assignment_deadline: addDays(now, 4), // Active (expires in 4 days)
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
    assignment_date: addDays(now, -8),
    assignment_deadline: addDays(now, -1), // Expired!
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
    assignment_date: addDays(now, -1),
    assignment_deadline: addDays(now, 6),
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
    assignment_date: addDays(now, -12),
    assignment_deadline: addDays(now, -5), // Expired
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
  },
  {
    id: 'lead-3',
    phone_number: '09195556677',
    contact_name: 'تولیدی کفش البرز',
    source: 'تبلیغات پیامکی',
    status: 'پاسخ نداد',
    notes: 'دو بار تماس گرفته شد، بوق اشغال یا بی‌پاسخ. فردا مجدداً قبل از ظهر تماس گرفته شود.',
    assigned_to: 'سارا احمدی',
    date_created: addDays(now, -2)
  },
  {
    id: 'lead-4',
    phone_number: '09148887766',
    contact_name: 'آتلیه معماری نور',
    source: 'فرم لندینگ پیج سایت',
    status: 'تماس نگرفته',
    notes: 'علاقه‌مند به خدمات برندینگ و سئو برای جذب پروژه‌های ویلاسازی شمال.',
    assigned_to: 'علیرضا حسینی',
    date_created: addDays(now, 0)
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
    tasks_summary: 'پیگیری قرارداد شرکت سپهر و نهایی‌سازی پیش‌نویس، تماس با ۴ لید جدید از دایرکت، هماهنگی ارسال نمونه قرارداد برای دکوراسیون پارسیان.',
    challenges: 'سامانه پیامک شرکت در ساعات ظهر کمی کندی داشت که پیگیری شد.',
    tomorrow_plan: 'بستن قرارداد رسمی سپهر، تماس با ۵ لید سرد جدید، برگزاری جلسه با مدیر فروش.',
    date_created: new Date().toISOString()
  },
  {
    id: 'adm-2',
    personnel_id: 'p-3',
    personnel_name: 'علیرضا حسینی',
    report_date: new Date().toISOString().split('T')[0],
    calls_count: 22,
    successful_contacts: 14,
    leads_converted: 1,
    tasks_summary: 'بررسی وضعیت فروشگاه آوینامد و ارسال پیشنهاد تمدید مهلت، تماس با بانک شماره‌های اولیه، مشاوره تلفنی با مشتریان صنف پوشاک.',
    challenges: 'برخی مشتریان به دلیل نوسان قیمت مواد اولیه، انعقاد قرارداد را به تعویق می‌اندازند.',
    tomorrow_plan: 'پیگیری مشتریان در وضعیت قبل از انقضا و بستن حداقل یک قرارداد جدید.',
    date_created: new Date().toISOString()
  }
];

// In-memory collections state
let personnelData = [...initialPersonnel];
let customersData = [...initialCustomers];
let reportsData = [...initialReports];
let coldLeadsData = [...initialColdLeads];
let adminReportsData = [...initialAdminReports];

// Helper: check and update expired marketers
function updateExpirationFlags() {
  const currentTime = new Date().getTime();
  customersData = customersData.map(c => {
    if (c.assignment_deadline && c.status !== 'قرارداد' && c.status !== 'لیست سیاه') {
      const deadline = new Date(c.assignment_deadline).getTime();
      const isExpired = currentTime > deadline;
      return {
        ...c,
        is_expired: isExpired
      };
    }
    return {
      ...c,
      is_expired: false
    };
  });
}

// Directus API Forwarder (BFF with Admin Token)
async function directusFetch(path: string, options: RequestInit = {}) {
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

  const res = await fetch(url, {
    ...options,
    headers
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Directus responded with ${res.status}: ${errorText}`);
  }

  return res.json();
}

// ----------------- BFF API ROUTES ----------------- //

// Health check endpoint for Coolify / Docker container monitoring
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    port: PORT
  });
});

// Directus / BFF Status & Settings
app.get('/api/bff-status', async (req: Request, res: Response) => {
  let isDirectusReachable = false;
  let directusError: string | null = null;
  let directusCollections: string[] = [];

  if (directusUrl) {
    try {
      const ping = await directusFetch('/server/ping', { method: 'GET' });
      isDirectusReachable = true;

      // Check collections
      try {
        const collectionsRes = await directusFetch('/collections', { method: 'GET' });
        if (collectionsRes && Array.isArray(collectionsRes.data)) {
          directusCollections = collectionsRes.data.map((col: any) => col.collection);
        }
      } catch (err: any) {
        // collections read failed or auth needed
      }
    } catch (err: any) {
      isDirectusReachable = false;
      directusError = err.message || 'Cannot reach Directus instance';
    }
  }

  res.json({
    mode: isDirectusReachable ? 'DIRECTUS_CONNECTED' : 'LOCAL_BFF_FALLBACK',
    directus_url: directusUrl || 'NOT_CONFIGURED',
    has_token: !!directusAdminToken,
    directus_reachable: isDirectusReachable,
    directus_collections: directusCollections,
    error: directusError,
    counts: {
      customers: customersData.length,
      reports: reportsData.length,
      cold_leads: coldLeadsData.length,
      admin_reports: adminReportsData.length,
      personnel: personnelData.length
    }
  });
});

// Update Directus runtime settings from UI
app.post('/api/bff-config', (req: Request, res: Response) => {
  const { url, token } = req.body;
  if (typeof url === 'string') directusUrl = url.trim();
  if (typeof token === 'string') directusAdminToken = token.trim();
  res.json({ success: true, directus_url: directusUrl, has_token: !!directusAdminToken });
});

// Directus Schema endpoint (reads directus-schema.json)
app.get('/api/directus-schema', (req: Request, res: Response) => {
  try {
    const schemaPath = path.resolve(__dirname, 'directus-schema.json');
    if (fs.existsSync(schemaPath)) {
      const content = fs.readFileSync(schemaPath, 'utf8');
      return res.setHeader('Content-Type', 'application/json').send(content);
    }
    return res.status(404).json({ error: 'Schema file not found' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Personnel API
app.get('/api/personnel', async (req: Request, res: Response) => {
  if (directusUrl && directusAdminToken) {
    try {
      const result = await directusFetch('/items/personnel');
      if (result && Array.isArray(result.data)) {
        return res.json(result.data);
      }
    } catch (e) {
      // fallback
    }
  }
  res.json(personnelData);
});

// Customers API
app.get('/api/customers', async (req: Request, res: Response) => {
  updateExpirationFlags();

  const { search, status, marketer_id, expired_only } = req.query;

  // Try directus first if active
  if (directusUrl && directusAdminToken) {
    try {
      const result = await directusFetch('/items/customers?sort=-date_created&limit=100');
      if (result && Array.isArray(result.data)) {
        return res.json(result.data);
      }
    } catch (e) {
      // Directus unreachable, fall back to local store
    }
  }

  let filtered = [...customersData];

  if (search && typeof search === 'string') {
    const s = search.toLowerCase();
    filtered = filtered.filter(c =>
      c.company_name.toLowerCase().includes(s) ||
      c.manager_name.toLowerCase().includes(s) ||
      c.city.toLowerCase().includes(s) ||
      c.business_type.toLowerCase().includes(s) ||
      c.mobile_numbers.some(m => m.includes(s))
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

app.get('/api/customers/:id', (req: Request, res: Response) => {
  updateExpirationFlags();
  const customer = customersData.find(c => c.id === req.params.id);
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found' });
  }
  const reports = reportsData.filter(r => r.customer_id === req.params.id);
  res.json({ ...customer, reports });
});

app.post('/api/customers', async (req: Request, res: Response) => {
  const payload = req.body;
  const newId = `c-${Date.now()}`;
  const nowIso = new Date().toISOString();

  // Assignment duration defaults to 7 days if not provided
  let deadline = payload.assignment_deadline;
  if (!deadline && payload.assignment_duration_days) {
    deadline = addDays(new Date(), parseInt(payload.assignment_duration_days, 10));
  } else if (!deadline) {
    deadline = addDays(new Date(), 7); // 7 days standard marketing assignment
  }

  const newCustomer: Customer = {
    id: newId,
    company_name: payload.company_name || 'بدون نام',
    business_type: payload.business_type || '',
    province: payload.province || '',
    city: payload.city || '',
    manager_name: payload.manager_name || '',
    manager_phones: Array.isArray(payload.manager_phones) ? payload.manager_phones : (payload.manager_phones ? [payload.manager_phones] : []),
    negotiator_name: payload.negotiator_name || '',
    negotiator_phones: Array.isArray(payload.negotiator_phones) ? payload.negotiator_phones : (payload.negotiator_phones ? [payload.negotiator_phones] : []),
    mobile_numbers: Array.isArray(payload.mobile_numbers) ? payload.mobile_numbers : (payload.mobile_numbers ? [payload.mobile_numbers] : []),
    landline_numbers: Array.isArray(payload.landline_numbers) ? payload.landline_numbers : (payload.landline_numbers ? [payload.landline_numbers] : []),
    telegram_phone: payload.telegram_phone || '',
    telegram_ids: Array.isArray(payload.telegram_ids) ? payload.telegram_ids : (payload.telegram_ids ? [payload.telegram_ids] : []),
    instagram_ids: Array.isArray(payload.instagram_ids) ? payload.instagram_ids : (payload.instagram_ids ? [payload.instagram_ids] : []),
    emails: Array.isArray(payload.emails) ? payload.emails : (payload.emails ? [payload.emails] : []),
    websites: Array.isArray(payload.websites) ? payload.websites : (payload.websites ? [payload.websites] : []),
    is_ecommerce: Boolean(payload.is_ecommerce),
    interview_status: payload.interview_status || 'مصاحبه اولیه انجام شده',
    interview_report: payload.interview_report || '',
    interview_score: Number(payload.interview_score) || 5,
    next_followup_date: payload.next_followup_date || addDays(new Date(), 3),
    assigned_marketer_id: payload.assigned_marketer_id || '',
    assigned_marketer_name: payload.assigned_marketer_name || '',
    assignment_date: nowIso,
    assignment_deadline: deadline,
    status: payload.status || 'تماس برقرار نشده',
    date_created: nowIso,
    date_updated: nowIso
  };

  // If connected to Directus, create in Directus via BFF
  if (directusUrl && directusAdminToken) {
    try {
      const created = await directusFetch('/items/customers', {
        method: 'POST',
        body: JSON.stringify(newCustomer)
      });
      if (created && created.data) {
        customersData.unshift(created.data);
        return res.status(201).json(created.data);
      }
    } catch (err: any) {
      console.warn('Directus insert error, storing locally:', err.message);
    }
  }

  // Fallback to in-memory store
  customersData.unshift(newCustomer);

  // If initial interview report was given, also log it as first report!
  if (newCustomer.interview_report) {
    const initialReport: CustomerReport = {
      id: `r-${Date.now()}`,
      customer_id: newCustomer.id,
      negotiator_name: newCustomer.negotiator_name || newCustomer.assigned_marketer_name || 'کارشناس پذیرش',
      negotiation_phone: newCustomer.negotiator_phones[0] || newCustomer.mobile_numbers[0] || '',
      report_text: `[گزارش مصاحبه اولیه]: ${newCustomer.interview_report}`,
      negotiation_score: newCustomer.interview_score,
      next_followup_date: newCustomer.next_followup_date,
      negotiation_status: newCustomer.status,
      date_created: nowIso
    };
    reportsData.unshift(initialReport);
  }

  res.status(201).json(newCustomer);
});

app.patch('/api/customers/:id', async (req: Request, res: Response) => {
  const index = customersData.findIndex(c => c.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  const updatedCustomer = {
    ...customersData[index],
    ...req.body,
    date_updated: new Date().toISOString()
  };

  customersData[index] = updatedCustomer;

  if (directusUrl && directusAdminToken) {
    try {
      await directusFetch(`/items/customers/${req.params.id}`, {
        method: 'PATCH',
        body: JSON.stringify(req.body)
      });
    } catch (e) {
      // ignore
    }
  }

  res.json(updatedCustomer);
});

app.delete('/api/customers/:id', async (req: Request, res: Response) => {
  customersData = customersData.filter(c => c.id !== req.params.id);
  reportsData = reportsData.filter(r => r.customer_id !== req.params.id);

  if (directusUrl && directusAdminToken) {
    try {
      await directusFetch(`/items/customers/${req.params.id}`, { method: 'DELETE' });
    } catch (e) {
      // ignore
    }
  }

  res.json({ success: true });
});

// Re-assign or Revoke Expired Customer Assignment
app.post('/api/customers/:id/reassign', (req: Request, res: Response) => {
  const { new_marketer_id, new_marketer_name, duration_days } = req.body;
  const index = customersData.findIndex(c => c.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  const days = duration_days ? parseInt(duration_days, 10) : 7;
  const nowTime = new Date();

  customersData[index] = {
    ...customersData[index],
    assigned_marketer_id: new_marketer_id || '',
    assigned_marketer_name: new_marketer_name || 'تخصیص نیافته',
    assignment_date: nowTime.toISOString(),
    assignment_deadline: addDays(nowTime, days),
    is_expired: false,
    date_updated: nowTime.toISOString()
  };

  // Add a history entry in reports
  reportsData.unshift({
    id: `r-${Date.now()}`,
    customer_id: req.params.id,
    negotiator_name: 'مدیریت بازاریابی',
    negotiation_phone: '-',
    report_text: `تغییر بازاریاب مسئول به «${new_marketer_name || 'عمومی'}» با مهلت جدید ${days} روزه برای پیگیری و انعقاد قرارداد.`,
    negotiation_score: 5,
    next_followup_date: addDays(nowTime, 2),
    negotiation_status: customersData[index].status,
    date_created: nowTime.toISOString()
  });

  res.json(customersData[index]);
});

// Customer Follow-up Reports API
app.get('/api/customer-reports', async (req: Request, res: Response) => {
  const { customer_id } = req.query;

  if (directusUrl && directusAdminToken) {
    try {
      const q = customer_id ? `?filter[customer_id][_eq]=${customer_id}&sort=-date_created` : '?sort=-date_created';
      const result = await directusFetch(`/items/customer_reports${q}`);
      if (result && Array.isArray(result.data)) {
        return res.json(result.data);
      }
    } catch (e) {
      // fallback
    }
  }

  let filtered = [...reportsData];
  if (customer_id) {
    filtered = filtered.filter(r => r.customer_id === customer_id);
  }
  res.json(filtered);
});

app.post('/api/customer-reports', async (req: Request, res: Response) => {
  const payload = req.body;
  const newReport: CustomerReport = {
    id: `r-${Date.now()}`,
    customer_id: payload.customer_id,
    negotiator_name: payload.negotiator_name || 'کارشناس پیگیری',
    negotiation_phone: payload.negotiation_phone || '',
    report_text: payload.report_text || '',
    negotiation_score: Number(payload.negotiation_score) || 5,
    next_followup_date: payload.next_followup_date || '',
    negotiation_status: payload.negotiation_status || 'پیگیری قبل از انقضا',
    date_created: new Date().toISOString()
  };

  if (directusUrl && directusAdminToken) {
    try {
      const created = await directusFetch('/items/customer_reports', {
        method: 'POST',
        body: JSON.stringify(newReport)
      });
      if (created && created.data) {
        reportsData.unshift(created.data);
      }
    } catch (e) {
      console.warn('Directus report create error:', e);
    }
  }

  reportsData.unshift(newReport);

  // Synchronize latest status & follow-up date on customer document
  const cIndex = customersData.findIndex(c => c.id === payload.customer_id);
  if (cIndex !== -1) {
    customersData[cIndex].status = newReport.negotiation_status;
    if (newReport.next_followup_date) {
      customersData[cIndex].next_followup_date = newReport.next_followup_date;
    }
    customersData[cIndex].date_updated = new Date().toISOString();

    // If status reached 'قرارداد' (Won), it is successfully converted!
    if (newReport.negotiation_status === 'قرارداد') {
      customersData[cIndex].is_expired = false;
    }
  }

  res.status(201).json(newReport);
});

// Cold Leads API (بانک شماره‌های اولیه برای تماس بعدی)
app.get('/api/cold-leads', async (req: Request, res: Response) => {
  if (directusUrl && directusAdminToken) {
    try {
      const result = await directusFetch('/items/cold_leads?sort=-date_created');
      if (result && Array.isArray(result.data)) {
        return res.json(result.data);
      }
    } catch (e) {
      // fallback
    }
  }
  res.json(coldLeadsData);
});

app.post('/api/cold-leads', async (req: Request, res: Response) => {
  const payload = req.body;
  const newLead: ColdLead = {
    id: `lead-${Date.now()}`,
    phone_number: payload.phone_number,
    contact_name: payload.contact_name || '',
    source: payload.source || 'ورود دستی',
    status: payload.status || 'تماس نگرفته',
    notes: payload.notes || '',
    assigned_to: payload.assigned_to || '',
    date_created: new Date().toISOString()
  };

  if (directusUrl && directusAdminToken) {
    try {
      await directusFetch('/items/cold_leads', {
        method: 'POST',
        body: JSON.stringify(newLead)
      });
    } catch (e) {
      // fallback
    }
  }

  coldLeadsData.unshift(newLead);
  res.status(201).json(newLead);
});

app.patch('/api/cold-leads/:id', async (req: Request, res: Response) => {
  const index = coldLeadsData.findIndex(l => l.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Lead not found' });
  }

  coldLeadsData[index] = {
    ...coldLeadsData[index],
    ...req.body
  };

  if (directusUrl && directusAdminToken) {
    try {
      await directusFetch(`/items/cold_leads/${req.params.id}`, {
        method: 'PATCH',
        body: JSON.stringify(req.body)
      });
    } catch (e) {
      // ignore
    }
  }

  res.json(coldLeadsData[index]);
});

// Convert Cold Lead into a full Customer
app.post('/api/cold-leads/:id/convert', (req: Request, res: Response) => {
  const leadIndex = coldLeadsData.findIndex(l => l.id === req.params.id);
  if (leadIndex === -1) {
    return res.status(404).json({ error: 'Lead not found' });
  }

  const lead = coldLeadsData[leadIndex];
  const newCustId = `c-${Date.now()}`;
  const nowIso = new Date().toISOString();

  const newCustomer: Customer = {
    id: newCustId,
    company_name: req.body.company_name || lead.contact_name || `مشتری با شماره ${lead.phone_number}`,
    business_type: req.body.business_type || '',
    province: req.body.province || 'تهران',
    city: req.body.city || 'تهران',
    manager_name: req.body.manager_name || lead.contact_name || '',
    manager_phones: [lead.phone_number],
    negotiator_name: lead.assigned_to || '',
    negotiator_phones: [],
    mobile_numbers: [lead.phone_number],
    landline_numbers: [],
    telegram_phone: lead.phone_number,
    telegram_ids: [],
    instagram_ids: [],
    emails: [],
    websites: [],
    is_ecommerce: false,
    interview_status: 'مصاحبه اولیه انجام شده',
    interview_report: `تبدیل شده از لید سرد (${lead.source}). یادداشت اولیه: ${lead.notes || 'ندارد'}`,
    interview_score: 6,
    next_followup_date: addDays(new Date(), 2),
    assigned_marketer_id: 'p-2',
    assigned_marketer_name: lead.assigned_to || 'سارا احمدی',
    assignment_date: nowIso,
    assignment_deadline: addDays(new Date(), 7),
    status: 'تماس برقرار نشده',
    date_created: nowIso,
    date_updated: nowIso
  };

  customersData.unshift(newCustomer);

  coldLeadsData[leadIndex].status = 'تبدیل شده به مشتری';
  coldLeadsData[leadIndex].converted_customer_id = newCustId;

  res.json({ success: true, customer: newCustomer, lead: coldLeadsData[leadIndex] });
});

// Daily Administrative Reports API (گزارش روزانه اداری پرسنل)
app.get('/api/administrative-reports', async (req: Request, res: Response) => {
  if (directusUrl && directusAdminToken) {
    try {
      const result = await directusFetch('/items/administrative_reports?sort=-report_date');
      if (result && Array.isArray(result.data)) {
        return res.json(result.data);
      }
    } catch (e) {
      // fallback
    }
  }
  res.json(adminReportsData);
});

app.post('/api/administrative-reports', async (req: Request, res: Response) => {
  const payload = req.body;
  const newReport: AdministrativeReport = {
    id: `adm-${Date.now()}`,
    personnel_id: payload.personnel_id,
    personnel_name: payload.personnel_name || 'پرسنل شرکت',
    report_date: payload.report_date || new Date().toISOString().split('T')[0],
    calls_count: Number(payload.calls_count) || 0,
    successful_contacts: Number(payload.successful_contacts) || 0,
    leads_converted: Number(payload.leads_converted) || 0,
    tasks_summary: payload.tasks_summary || '',
    challenges: payload.challenges || '',
    tomorrow_plan: payload.tomorrow_plan || '',
    date_created: new Date().toISOString()
  };

  if (directusUrl && directusAdminToken) {
    try {
      await directusFetch('/items/administrative_reports', {
        method: 'POST',
        body: JSON.stringify(newReport)
      });
    } catch (e) {
      // ignore
    }
  }

  adminReportsData.unshift(newReport);
  res.status(201).json(newReport);
});

// Periodic Expiration Check Trigger
app.post('/api/check-expirations', (req: Request, res: Response) => {
  updateExpirationFlags();
  const expiredCount = customersData.filter(c => c.is_expired).length;
  res.json({ success: true, expired_count: expiredCount });
});

// Setup Vite middleware in dev or static serving in production
async function setupViteOrStatic() {
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
    console.log(`BFF Mode: ${directusUrl ? 'Directus configured' : 'Local Mock & Persist Mode'}`);
  });
}

setupViteOrStatic().catch(err => {
  console.error('Failed to start server:', err);
});
