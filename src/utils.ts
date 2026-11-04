import { NegotiationStatus, LeadStatus } from './types';

export const JALALI_MONTH_NAMES = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

export const JALALI_WEEK_DAYS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];
export const JALALI_WEEK_DAYS_FULL = [
  'شنبه',
  'یک‌شنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنج‌شنبه',
  'جمعه',
];

export function toPersianDigits(n: number | string | undefined | null): string {
  if (n === undefined || n === null) return '';
  const str = String(n);
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return str.replace(/[0-9]/g, (w) => persianDigits[+w]);
}

export function gregorianToJalali(
  gy: number,
  gm: number,
  gd: number
): { jy: number; jm: number; jd: number } {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy: number;
  let gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    355666 +
    365 * gy +
    Math.floor((gy2 + 3) / 4) -
    Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) +
    gd +
    g_d_m[gm - 1];
  jy = -1595 + 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let jm: number;
  let jd: number;
  if (days < 186) {
    jm = 1 + Math.floor(days / 31);
    jd = 1 + (days % 31);
  } else {
    jm = 7 + Math.floor((days - 186) / 30);
    jd = 1 + ((days - 186) % 30);
  }
  return { jy, jm, jd };
}

export function jalaliToGregorian(
  jy: number,
  jm: number,
  jd: number
): { gy: number; gm: number; gd: number } {
  jy = jy - 979;
  jm = jm - 1;
  jd = jd - 1;

  let j_day_no =
    365 * jy + Math.floor(jy / 33) * 8 + Math.floor(((jy % 33) + 3) / 4);
  for (let i = 0; i < jm; ++i) {
    j_day_no += i < 6 ? 31 : 30;
  }
  j_day_no += jd;

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

  const g_days_in_month = [
    31,
    leap ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  let gm = 0;
  while (gm < 12 && g_day_no >= g_days_in_month[gm]) {
    g_day_no -= g_days_in_month[gm];
    gm++;
  }
  return { gy, gm: gm + 1, gd: g_day_no + 1 };
}

export function isJalaliLeapYear(jy: number): boolean {
  const breaks = [
    -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097,
    2192, 2262, 2324, 2394, 2456, 3178,
  ];
  const bl = breaks.length;
  let jp = breaks[0];
  let jm: number;
  let jump: number;
  let leap = -14;

  if (jy < jp || jy >= breaks[bl - 1]) return false;

  for (let i = 1; i < bl; i += 1) {
    jm = breaks[i];
    jump = jm - jp;
    if (jy < jm) {
      let N = jy - jp;
      leap = leap + Math.floor(N / 33) * 8 + Math.floor(((N % 33) + 3) / 4);
      if (jump % 33 === 4 && jump - N === 4) {
        leap += 1;
      }
      const isLeap =
        (((N + 1) % 33) - 1) % 4 === 0 &&
        ((N + 1) % 33 !== 1 || N === 0);
      return isLeap;
    }
    leap = leap + Math.floor(jump / 33) * 8 + Math.floor(((jump % 33) + 3) / 4);
    jp = jm;
  }
  return false;
}

export function getJalaliDaysInMonth(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isJalaliLeapYear(jy) ? 30 : 29;
}

export function getTodayJalali(): { jy: number; jm: number; jd: number; str: string } {
  const now = new Date();
  const j = gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const mm = String(j.jm).padStart(2, '0');
  const dd = String(j.jd).padStart(2, '0');
  return {
    jy: j.jy,
    jm: j.jm,
    jd: j.jd,
    str: `${j.jy}/${mm}/${dd}`,
  };
}

export function gregorianIsoToJalali(isoString?: string | null): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    const j = gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    const mm = String(j.jm).padStart(2, '0');
    const dd = String(j.jd).padStart(2, '0');
    return `${j.jy}/${mm}/${dd}`;
  } catch {
    return '';
  }
}

export function jalaliToGregorianIso(jalaliStr?: string | null): string {
  if (!jalaliStr) return '';
  const parts = jalaliStr.split(/[\/\-]/).map((p) => parseInt(p, 10));
  if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    return '';
  }
  try {
    const g = jalaliToGregorian(parts[0], parts[1], parts[2]);
    const mm = String(g.gm).padStart(2, '0');
    const dd = String(g.gd).padStart(2, '0');
    return `${g.gy}-${mm}-${dd}`;
  } catch {
    return '';
  }
}

export function formatTimeRemaining(deadlineIso?: string | null): {
  text: string;
  isExpired: boolean;
  hoursLeft: number;
  badgeClass: string;
} {
  if (!deadlineIso) {
    return { text: 'بدون مهلت', isExpired: false, hoursLeft: 9999, badgeClass: 'text-slate-500 bg-slate-100 border border-slate-200 dark:text-[#A7A7A7] dark:bg-[#282828] dark:border-transparent' };
  }

  const now = new Date().getTime();
  const deadline = new Date(deadlineIso).getTime();
  const diff = deadline - now;

  if (diff <= 0) {
    return {
      text: 'مهلت منقضی شده!',
      isExpired: true,
      hoursLeft: 0,
      badgeClass: 'text-rose-700 bg-rose-50 border border-rose-200 dark:text-[#E22134] dark:bg-[#E22134]/15 dark:border-[#E22134]/30 animate-pulse font-bold',
    };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 2) {
    return {
      text: `${toPersianDigits(days)} روز باقی‌مانده`,
      isExpired: false,
      hoursLeft: days * 24 + hours,
      badgeClass: 'text-emerald-700 bg-emerald-50 border border-emerald-200 dark:text-[#1DB954] dark:bg-[#1DB954]/10 dark:border-[#1DB954]/20',
    };
  } else if (days >= 1) {
    return {
      text: `${toPersianDigits(days)} روز و ${toPersianDigits(hours)} ساعت`,
      isExpired: false,
      hoursLeft: days * 24 + hours,
      badgeClass: 'text-amber-700 bg-amber-50 border border-amber-200 dark:text-[#F59B23] dark:bg-[#F59B23]/10 dark:border-[#F59B23]/20',
    };
  } else {
    return {
      text: `${toPersianDigits(hours)} ساعت باقی‌مانده`,
      isExpired: false,
      hoursLeft: hours,
      badgeClass: 'text-amber-800 bg-amber-100 border border-amber-300 dark:text-[#F59B23] dark:bg-[#F59B23]/20 dark:border-[#F59B23]/40 font-bold',
    };
  }
}

export function formatFollowupRelativeBadge(followupIso?: string | null): {
  text: string;
  badgeClass: string;
  isToday: boolean;
  isOverdue: boolean;
  isTomorrow: boolean;
  daysDiff: number | null;
} {
  if (!followupIso) {
    return {
      text: 'بدون موعد پیگیری',
      badgeClass: 'text-slate-500 bg-slate-100 border border-slate-200 dark:text-[#A7A7A7] dark:bg-[#282828] dark:border-[#383838]',
      isToday: false,
      isOverdue: false,
      isTomorrow: false,
      daysDiff: null,
    };
  }

  const d = new Date(followupIso);
  if (isNaN(d.getTime())) {
    return {
      text: 'نامعتبر',
      badgeClass: 'text-slate-500 bg-slate-100 border border-slate-200 dark:text-[#A7A7A7] dark:bg-[#282828] dark:border-[#383838]',
      isToday: false,
      isOverdue: false,
      isTomorrow: false,
      daysDiff: null,
    };
  }

  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const endToday = startToday + 86400000 - 1;
  const targetTime = d.getTime();

  if (targetTime >= startToday && targetTime <= endToday) {
    return {
      text: 'امروز',
      badgeClass: 'text-emerald-700 bg-emerald-50 border border-emerald-300 dark:text-[#1DB954] dark:bg-[#1DB954]/20 dark:border-[#1DB954]/50 font-bold animate-pulse',
      isToday: true,
      isOverdue: false,
      isTomorrow: false,
      daysDiff: 0,
    };
  }

  const startTomorrow = startToday + 86400000;
  const endTomorrow = startTomorrow + 86400000 - 1;
  if (targetTime >= startTomorrow && targetTime <= endTomorrow) {
    return {
      text: 'فردا',
      badgeClass: 'text-amber-700 bg-amber-50 border border-amber-300 dark:text-[#F59B23] dark:bg-[#F59B23]/20 dark:border-[#F59B23]/50 font-bold',
      isToday: false,
      isOverdue: false,
      isTomorrow: true,
      daysDiff: 1,
    };
  }

  if (targetTime < startToday) {
    const daysPast = Math.max(1, Math.floor((startToday - targetTime) / 86400000));
    return {
      text: daysPast === 1 ? 'دیروز (گذشته)' : `${toPersianDigits(daysPast)} روز گذشته`,
      badgeClass: 'text-rose-700 bg-rose-50 border border-rose-200 dark:text-[#E22134] dark:bg-[#E22134]/15 dark:border-[#E22134]/30 font-semibold',
      isToday: false,
      isOverdue: true,
      isTomorrow: false,
      daysDiff: -daysPast,
    };
  }

  const daysAhead = Math.floor((targetTime - startToday) / 86400000);
  return {
    text: `${toPersianDigits(daysAhead)} روز دیگر`,
    badgeClass: 'text-blue-700 bg-blue-50 border border-blue-200 dark:text-sky-400 dark:bg-sky-950/40 dark:border-sky-800/60 font-medium',
    isToday: false,
    isOverdue: false,
    isTomorrow: false,
    daysDiff: daysAhead,
  };
}

export function formatPersianDate(isoString?: string | null): string {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(d);
  } catch (e) {
    return isoString;
  }
}

export function formatPersianDateTime(isoString: string): string {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch (e) {
    return isoString;
  }
}

export function getStatusTheme(status: NegotiationStatus | string): {
  color: string;
  bg: string;
  dot: string;
} {
  switch (status) {
    case 'قرارداد / فاکتور':
    case 'قرارداد':
      return { color: 'text-emerald-700 dark:text-[#1DB954]', bg: 'bg-emerald-50 border-emerald-200 dark:bg-[#1DB954]/10 dark:border-[#1DB954]/30', dot: 'bg-emerald-500 dark:bg-[#1DB954]' };
    case 'پیش نویس قرارداد':
    case 'پیگیری قرارداد':
      return { color: 'text-emerald-700 dark:text-[#1ED760]', bg: 'bg-emerald-50 border-emerald-200 dark:bg-[#1ED760]/10 dark:border-[#1ED760]/30', dot: 'bg-emerald-500 dark:bg-[#1ED760]' };
    case 'پیگیری قبل از انقضا':
      return { color: 'text-amber-700 dark:text-[#F59B23]', bg: 'bg-amber-50 border-amber-200 dark:bg-[#F59B23]/10 dark:border-[#F59B23]/30', dot: 'bg-amber-500 dark:bg-[#F59B23]' };
    case 'پیگیری بلند مدت':
      return { color: 'text-slate-600 dark:text-[#B3B3B3]', bg: 'bg-slate-100 border-slate-200 dark:bg-[#282828] dark:border-[#333333]', dot: 'bg-slate-400 dark:bg-[#B3B3B3]' };
    case 'نمیخواد':
    case 'پاسخ نمیدهد':
      return { color: 'text-rose-700 dark:text-[#E22134]', bg: 'bg-rose-50 border-rose-200 dark:bg-[#E22134]/10 dark:border-[#E22134]/30', dot: 'bg-rose-500 dark:bg-[#E22134]' };
    case 'لیست سیاه':
      return { color: 'text-rose-800 dark:text-red-400', bg: 'bg-rose-100 border-rose-300 dark:bg-red-950/40 dark:border-red-800', dot: 'bg-rose-600 dark:bg-red-500' };
    case 'تماس برقرار نشده':
    default:
      return { color: 'text-slate-600 dark:text-[#A7A7A7]', bg: 'bg-slate-100 border-slate-200 dark:bg-[#282828] dark:border-[#333333]', dot: 'bg-slate-400 dark:bg-[#535353]' };
  }
}

export function getStatusBadgeClass(status?: string | null): string {
  const theme = getStatusTheme(status || '');
  return `${theme.color} ${theme.bg} border`;
}

export function formatToman(amount?: number | string | null): string {
  if (amount === undefined || amount === null || amount === '') return '';
  const num = typeof amount === 'string' ? parseFloat(amount.replace(/,/g, '')) : amount;
  if (isNaN(num)) return '';
  const formatted = num.toLocaleString('fa-IR');
  return `${formatted} تومان`;
}

export function formatStatusLabel(status?: string | null): string {
  if (!status) return '';
  if (status === 'قرارداد' || status === 'قرارداد / فاکتور' || status === 'قرارداد/فاکتور') {
    return 'قرارداد / فاکتور';
  }
  return status;
}

export function normalizeLegacyStatus(rawStatus?: string | null): string {
  if (!rawStatus) return 'تماس برقرار نشده';
  const s = String(rawStatus).trim();
  if (
    s === 'اصلا تماس برقرار نشده' ||
    s === 'تماس نگرفته' ||
    s === 'تماس برقرار نشده' ||
    s === 'بدون تماس' ||
    s === 'اصلاً تماس برقرار نشده'
  ) {
    return 'تماس برقرار نشده';
  }
  if (s === 'پاسخ نمیدهد' || s === 'پاسخ نمی‌دهد' || s === 'پاسخ نداد' || s === 'جواب نمیدهد') {
    return 'پاسخ نمیدهد';
  }
  if (s === 'نمیخواد' || s === 'نمی‌خواهد' || s === 'عدم تمایل' || s === 'نمی خواهد') {
    return 'نمیخواد';
  }
  if (s === 'پیگیری قبل از انقضا' || s === 'پیگیری قبل از انقضاء') {
    return 'پیگیری قبل از انقضا';
  }
  if (s === 'پیگیری بلند مدت' || s === 'پیگیری بلندمدت') {
    return 'پیگیری بلند مدت';
  }
  if (s === 'پیگیری قرارداد') {
    return 'پیگیری قرارداد';
  }
  if (s === 'پیش نویس قرارداد' || s === 'پیش‌نویس قرارداد') {
    return 'پیش نویس قرارداد';
  }
  if (s === 'قرارداد' || s === 'قرارداد / فاکتور' || s === 'قرارداد/فاکتور' || s === 'فاکتور') {
    return 'قرارداد';
  }
  if (s === 'لیست سیاه') {
    return 'لیست سیاه';
  }
  if (s === 'ثبت شماره') {
    return 'ثبت شماره';
  }
  return s;
}

export const NEGOTIATION_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'تماس برقرار نشده', label: 'تماس برقرار نشده' },
  { value: 'پیگیری قبل از انقضا', label: 'پیگیری قبل از انقضا' },
  { value: 'پیش نویس قرارداد', label: 'پیش نویس قرارداد' },
  { value: 'پیگیری قرارداد', label: 'پیگیری قرارداد' },
  { value: 'قرارداد', label: 'قرارداد / فاکتور' },
  { value: 'پاسخ نمیدهد', label: 'پاسخ نمیدهد' },
  { value: 'نمیخواد', label: 'نمیخواد' },
  { value: 'پیگیری بلند مدت', label: 'پیگیری بلند مدت' },
  { value: 'لیست سیاه', label: 'لیست سیاه' },
];

export function getLeadStatusTheme(status: LeadStatus): { color: string; bg: string } {
  switch (status) {
    case 'تبدیل شده به مشتری':
      return { color: 'text-emerald-700 dark:text-[#1DB954]', bg: 'bg-emerald-50 border border-emerald-200 dark:bg-[#1DB954]/10 dark:border-[#1DB954]/30' };
    case 'در حال بررسی':
      return { color: 'text-amber-700 dark:text-[#F59B23]', bg: 'bg-amber-50 border border-amber-200 dark:bg-[#F59B23]/10 dark:border-[#F59B23]/30' };
    case 'تماس نگرفته':
      return { color: 'text-slate-600 dark:text-[#B3B3B3]', bg: 'bg-slate-100 border border-slate-200 dark:bg-[#282828] dark:border-[#333333]' };
    case 'پاسخ نداد':
    case 'شماره نامعتبر':
    default:
      return { color: 'text-rose-700 dark:text-[#E22134]', bg: 'bg-rose-50 border border-rose-200 dark:bg-[#E22134]/10 dark:border-[#E22134]/30' };
  }
}

export function normalizePersianText(str?: string | null): string {
  if (!str) return '';
  return String(str)
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/إ|أ|آ/g, 'ا')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function matchesCustomerSearch(c: any, searchStr?: string | null): boolean {
  if (!c) return false;
  if (!searchStr || !searchStr.trim()) return true;
  const raw = searchStr.trim().toLowerCase();
  const normRaw = normalizePersianText(raw);

  const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
  const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
  const digitsOnly = raw
    .replace(/[۰-۹]/g, (w) => persianDigits.indexOf(w).toString())
    .replace(/[٠-٩]/g, (w) => arabicDigits.indexOf(w).toString())
    .replace(/[^\d]/g, '');

  // 1. Text match in primary fields
  if (
    c.company_name?.toLowerCase().includes(raw) ||
    normalizePersianText(c.company_name).includes(normRaw) ||
    c.manager_name?.toLowerCase().includes(raw) ||
    normalizePersianText(c.manager_name).includes(normRaw) ||
    c.negotiator_name?.toLowerCase().includes(raw) ||
    normalizePersianText(c.negotiator_name).includes(normRaw) ||
    c.city?.toLowerCase().includes(raw) ||
    normalizePersianText(c.city).includes(normRaw) ||
    c.province?.toLowerCase().includes(raw) ||
    normalizePersianText(c.province).includes(normRaw) ||
    c.business_type?.toLowerCase().includes(raw) ||
    normalizePersianText(c.business_type).includes(normRaw) ||
    c.assigned_marketer_name?.toLowerCase().includes(raw) ||
    normalizePersianText(c.assigned_marketer_name).includes(normRaw)
  ) {
    return true;
  }

  // 2. Phone / Contact number helper
  const isMatchVal = (val: any): boolean => {
    if (!val) return false;
    const sVal = String(val).trim().toLowerCase();
    if (!sVal) return false;

    if (sVal.includes(raw)) return true;

    if (digitsOnly.length >= 3) {
      const cleanPhoneDigits = sVal.replace(/[^\d]/g, '');
      if (cleanPhoneDigits.includes(digitsOnly)) return true;

      const pNoZero = cleanPhoneDigits.replace(/^(0|98|\+98)/, '');
      const sNoZero = digitsOnly.replace(/^(0|98|\+98)/, '');
      if (pNoZero && sNoZero && pNoZero.includes(sNoZero)) return true;
    }

    return false;
  };

  const phoneLists = [
    ...(Array.isArray(c.mobile_numbers) ? c.mobile_numbers : [c.mobile_numbers]),
    ...(Array.isArray(c.landline_numbers) ? c.landline_numbers : [c.landline_numbers]),
    ...(Array.isArray(c.manager_phones) ? c.manager_phones : [c.manager_phones]),
    ...(Array.isArray(c.negotiator_phones) ? c.negotiator_phones : [c.negotiator_phones]),
    c.telegram_phone,
    ...(Array.isArray(c.telegram_ids) ? c.telegram_ids : [c.telegram_ids]),
    ...(Array.isArray(c.instagram_ids) ? c.instagram_ids : [c.instagram_ids]),
    ...(Array.isArray(c.emails) ? c.emails : [c.emails]),
  ];

  if (phoneLists.some(isMatchVal)) return true;

  if (Array.isArray(c.contacts)) {
    for (const ct of c.contacts) {
      if (ct && (isMatchVal(ct.value) || isMatchVal(ct.normalized_value) || isMatchVal(ct.contact_name))) {
        return true;
      }
    }
  }

  return false;
}

export function matchPersonnelToCustomer(
  customer: { assigned_marketer_id?: string | null; assigned_marketer_name?: string | null },
  personnel?: { id?: string | null; user_id?: string | null; username?: string | null; name?: string | null } | null,
  user?: { id?: string | null; username?: string | null; name?: string | null } | null
): boolean {
  if (!customer) return false;
  const custId = String(customer.assigned_marketer_id || '').trim().toLowerCase();
  const custNameNorm = normalizePersianText(customer.assigned_marketer_name);

  // Candidate IDs for this marketer
  const candidateIds = new Set<string>();
  if (personnel?.id) {
    const pId = String(personnel.id).trim().toLowerCase();
    candidateIds.add(pId);
    candidateIds.add(pId.replace(/^p-/, ''));
    if (!pId.startsWith('p-')) candidateIds.add(`p-${pId}`);
  }
  if (personnel?.user_id) candidateIds.add(String(personnel.user_id).trim().toLowerCase());
  if (personnel?.username) candidateIds.add(String(personnel.username).trim().toLowerCase());
  if (user?.id) candidateIds.add(String(user.id).trim().toLowerCase());
  if (user?.username) candidateIds.add(String(user.username).trim().toLowerCase());

  if (custId && candidateIds.has(custId)) return true;
  if (custId && candidateIds.has(custId.replace(/^p-/, ''))) return true;

  // Candidate Names
  const pNameNorm = normalizePersianText(personnel?.name);
  const uNameNorm = normalizePersianText(user?.name);

  if (custNameNorm && pNameNorm && (custNameNorm === pNameNorm || custNameNorm.includes(pNameNorm) || pNameNorm.includes(custNameNorm))) {
    return true;
  }
  if (custNameNorm && uNameNorm && (custNameNorm === uNameNorm || custNameNorm.includes(uNameNorm) || uNameNorm.includes(custNameNorm))) {
    return true;
  }

  return false;
}

export function matchPersonnelToReport(
  report: { negotiator_name?: string | null; created_by?: string | null },
  personnel?: { id?: string | null; user_id?: string | null; username?: string | null; name?: string | null } | null,
  user?: { id?: string | null; username?: string | null; name?: string | null } | null
): boolean {
  if (!report) return false;
  const createdBy = String(report.created_by || '').trim().toLowerCase();
  const negNameNorm = normalizePersianText(report.negotiator_name);
  const createdByNorm = normalizePersianText(report.created_by);

  const candidateIds = new Set<string>();
  if (personnel?.id) {
    const pId = String(personnel.id).trim().toLowerCase();
    candidateIds.add(pId);
    candidateIds.add(pId.replace(/^p-/, ''));
    if (!pId.startsWith('p-')) candidateIds.add(`p-${pId}`);
  }
  if (personnel?.user_id) candidateIds.add(String(personnel.user_id).trim().toLowerCase());
  if (personnel?.username) candidateIds.add(String(personnel.username).trim().toLowerCase());
  if (user?.id) candidateIds.add(String(user.id).trim().toLowerCase());
  if (user?.username) candidateIds.add(String(user.username).trim().toLowerCase());

  if (createdBy && candidateIds.has(createdBy)) return true;
  if (createdBy && candidateIds.has(createdBy.replace(/^p-/, ''))) return true;

  const pNameNorm = normalizePersianText(personnel?.name);
  const uNameNorm = normalizePersianText(user?.name);

  if (pNameNorm && (negNameNorm === pNameNorm || negNameNorm.includes(pNameNorm) || pNameNorm.includes(negNameNorm))) {
    return true;
  }
  if (uNameNorm && (negNameNorm === uNameNorm || negNameNorm.includes(uNameNorm) || uNameNorm.includes(negNameNorm))) {
    return true;
  }
  if (pNameNorm && (createdByNorm === pNameNorm || createdByNorm.includes(pNameNorm) || pNameNorm.includes(createdByNorm))) {
    return true;
  }
  if (uNameNorm && (createdByNorm === uNameNorm || createdByNorm.includes(uNameNorm) || uNameNorm.includes(createdByNorm))) {
    return true;
  }

  return false;
}

export function getAvatarUrl(avatar?: any): string | undefined {
  if (!avatar) return undefined;

  let raw: string = '';
  if (typeof avatar === 'object' && avatar !== null) {
    raw = avatar.id || avatar.url || avatar.filename_disk || '';
  } else if (typeof avatar === 'string') {
    raw = avatar.trim();
  }

  if (!raw) return undefined;

  // Base64 data URLs
  if (raw.startsWith('data:')) return raw;

  // Already our authenticated API proxy
  if (raw.startsWith('/api/assets/')) return raw;

  // Relative /assets/ path -> route to /api/assets/
  if (raw.startsWith('/assets/')) return `/api${raw}`;

  // If a full URL contains /assets/<uuid> (e.g. from internal directusUrl or direct link)
  // route through our authenticated proxy so client browsers don't get 403 or network errors
  const directusAssetsMatch = raw.match(/\/assets\/([a-zA-Z0-9\-_]+)/);
  if (directusAssetsMatch && directusAssetsMatch[1]) {
    return `/api/assets/${directusAssetsMatch[1]}`;
  }

  // External URLs (e.g. external CDN, gravatar, ui-avatars)
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    return raw;
  }

  // Other relative paths
  if (raw.startsWith('/')) return raw;

  // Raw Directus file UUID string (e.g. 68f9b7c8-4720-4c57-...)
  return `/api/assets/${raw}`;
}

/**
 * Compresses an image File using HTML Canvas and returns a lightweight Base64 Data URL.
 * Automatically resizes image to maximum dimension (default 600px) and compresses to WebP/JPEG.
 */
export async function compressImage(
  file: File,
  maxDimension: number = 600,
  quality: number = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('خطا در خواندن فایل تصویر'));
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onerror = () => reject(new Error('فایل انتخاب‌شده یک تصویر معتبر نمی‌باشد.'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(readerEvent.target?.result as string);
          return;
        }

        // Draw image with smooth bicubic scaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Try webp first, fall back to jpeg
        let mimeType = 'image/webp';
        if (file.type === 'image/png' || file.type === 'image/jpeg') {
          mimeType = 'image/jpeg';
        }

        try {
          const dataUrl = canvas.toDataURL(mimeType, quality);
          resolve(dataUrl);
        } catch {
          const fallbackDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(fallbackDataUrl);
        }
      };
      img.src = readerEvent.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function getUserAllowedTenants(
  currentPersonnel: any | null,
  currentUser: any | null,
  tenants: any[] = []
): any[] {
  const effectiveTenants =
    tenants && tenants.length > 0
      ? tenants
      : [
          {
            id: 'default',
            name: 'سازمان مرکزی آلفادسک',
            slug: 'alphadesk-hq',
            status: 'active',
            date_created: '',
          },
        ];

  const rawAllowed =
    currentPersonnel?.allowed_tenant_ids ||
    currentPersonnel?.permissions?.allowed_tenant_ids;

  // If explicit allowed_tenant_ids array is provided and not containing 'all'
  if (Array.isArray(rawAllowed) && rawAllowed.length > 0 && !rawAllowed.includes('all')) {
    const allowedSet = new Set(rawAllowed.map(String));
    const matched = effectiveTenants.filter((t) => {
      const tid = String(t.id);
      const tslug = t.slug ? String(t.slug) : '';
      if (allowedSet.has(tid) || (tslug && allowedSet.has(tslug))) return true;
      if ((tid === '1' || tid === 'default') && (allowedSet.has('1') || allowedSet.has('default'))) {
        return true;
      }
      return false;
    });
    if (matched.length > 0) return matched;
  }

  // Admin users (system admin or personnel admin) can access all tenants unless explicitly restricted above
  const isAdminUser = Boolean(
    currentUser?.is_admin ||
    currentUser?.app_role === 'admin' ||
    currentUser?.role_id === '59e261e1-56f4-401e-9889-4971e2c3c4ce' ||
    currentPersonnel?.role === 'admin' ||
    (rawAllowed && Array.isArray(rawAllowed) && rawAllowed.includes('all'))
  );

  if (isAdminUser) {
    return effectiveTenants;
  }

  // Regular personnel restricted to their assigned tenant
  let allowedIds: string[] = [];
  if (currentPersonnel?.tenant_id) {
    allowedIds = [String(currentPersonnel.tenant_id)];
  } else {
    allowedIds = ['default', '1'];
  }

  const allowedSet = new Set(allowedIds);
  const matched = effectiveTenants.filter((t) => {
    const tid = String(t.id);
    const tslug = t.slug ? String(t.slug) : '';
    return allowedSet.has(tid) || (tslug && allowedSet.has(tslug)) || ((tid === '1' || tid === 'default') && (allowedSet.has('1') || allowedSet.has('default')));
  });

  return matched.length > 0 ? matched : effectiveTenants;
}

const CP1252_REVERSE_MAP: Record<number, number> = {
  0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84, 0x2026: 0x85, 0x2020: 0x86,
  0x2021: 0x87, 0x02C6: 0x88, 0x2030: 0x89, 0x0160: 0x8A, 0x2039: 0x8B, 0x0152: 0x8C,
  0x017D: 0x8E, 0x2018: 0x91, 0x2019: 0x92, 0x201C: 0x93, 0x201D: 0x94, 0x2022: 0x95,
  0x2013: 0x96, 0x2014: 0x97, 0x02DC: 0x98, 0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B,
  0x0153: 0x9C, 0x017E: 0x9E, 0x0178: 0x9F,
};

/**
 * Automatically detects and repairs UTF-8 text mistakenly decoded as Windows-1252/ISO-8859-1 (Mojibake)
 * e.g., "Ù¾ÙˆØ± Ø§Ø³Ù…Ø§Ø¹ÛŒÙ„" -> "پور اسماعیل"
 */
export function fixMojibake(str?: string | null): string {
  if (!str || typeof str !== 'string') return '';
  // Check if string contains byte artifacts from UTF-8 Persian/Arabic characters (0xD8..0xDF -> Ø, Ù, Û, Ú, etc.)
  if (/[ØÙÛÚ]/.test(str)) {
    try {
      const bytes = new Uint8Array(
        [...str].map((ch) => {
          const code = ch.charCodeAt(0);
          return CP1252_REVERSE_MAP[code] || (code <= 0xFF ? code : 0x3F);
        })
      );
      const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      if (decoded && !/[\uFFFD]/.test(decoded)) {
        return decoded;
      }
    } catch {
      // Return original if decoding fails
    }
  }
  return str;
}

/**
 * Formats any date value (Excel serial number like 45882.719, ISO date string, Jalali date string)
 * into a clean Persian date-time string (e.g. "۲۲ مرداد ۱۴۰۴، ۱۷:۱۶").
 */
export function formatDisplayDate(dateVal?: any): string {
  if (dateVal === undefined || dateVal === null || dateVal === '') return '-';

  // 1. If numeric or string Excel serial date number (e.g. 45882.71944444445)
  const num = typeof dateVal === 'number' ? dateVal : Number(String(dateVal).trim());
  if (!isNaN(num) && num > 20000 && num < 60000) {
    try {
      const ms = Math.round((num - 25569) * 86400 * 1000);
      const d = new Date(ms);
      if (!isNaN(d.getTime())) {
        return formatPersianDateTime(d.toISOString());
      }
    } catch {}
  }

  const str = String(dateVal).trim();

  // 2. Already Jalali date string like 1403/05/22 17:16 or 1404-05-22
  if (/^1[34]\d\d[\/\-]\d{1,2}[\/\-]\d{1,2}/.test(str)) {
    return toPersianDigits(str);
  }

  // 3. ISO or standard JS Date string
  let d = new Date(str);
  if (isNaN(d.getTime())) {
    d = new Date(str.replace(' ', 'T'));
  }

  if (!isNaN(d.getTime())) {
    return formatPersianDateTime(d.toISOString());
  }

  return toPersianDigits(str);
}

/**
 * Formats any date value into a clean Persian date string without time (e.g. "۱۴۰۴/۰۵/۲۲").
 */
export function formatDisplayDateOnly(dateVal?: any): string {
  if (dateVal === undefined || dateVal === null || dateVal === '') return 'ثبت نشده';

  const str = String(dateVal).trim();
  if (!str) return 'ثبت نشده';

  const num = typeof dateVal === 'number' ? dateVal : Number(str);
  if (!isNaN(num) && num > 20000 && num < 60000) {
    try {
      const ms = Math.round((num - 25569) * 86400 * 1000);
      const d = new Date(ms);
      if (!isNaN(d.getTime())) {
        const j = gregorianIsoToJalali(d.toISOString());
        return j ? toPersianDigits(j) : '-';
      }
    } catch {}
  }

  if (/^1[34]\d\d[\/\-]\d{1,2}[\/\-]\d{1,2}/.test(str)) {
    const dateOnlyPart = str.split(/\s+/)[0];
    return toPersianDigits(dateOnlyPart);
  }

  let d = new Date(str);
  if (isNaN(d.getTime())) {
    d = new Date(str.replace(' ', 'T'));
  }

  if (!isNaN(d.getTime())) {
    const j = gregorianIsoToJalali(d.toISOString());
    return j ? toPersianDigits(j) : formatPersianDate(d.toISOString());
  }

  return toPersianDigits(str.split(/\s+/)[0]);
}

/**
 * Normalizes any date value (Excel serial date number e.g. 45882.719, Jalali date, or date string)
 * into a standard ISO 8601 UTC dateTime string (e.g. "2025-08-13T17:16:00.000Z") for Directus.
 */
export function normalizeToIsoDateTime(dateVal?: any): string | null {
  if (dateVal === undefined || dateVal === null || dateVal === '') return null;

  const num = typeof dateVal === 'number' ? dateVal : Number(String(dateVal).trim());
  if (!isNaN(num) && num > 20000 && num < 60000) {
    try {
      const ms = Math.round((num - 25569) * 86400 * 1000);
      const d = new Date(ms);
      if (!isNaN(d.getTime())) {
        return d.toISOString();
      }
    } catch {}
  }

  const str = String(dateVal).trim();

  if (/^1[34]\d\d[\/\-]/.test(str)) {
    try {
      const parts = str.split(/\s+/);
      const datePart = parts[0];
      const timePart = parts[1] || '00:00:00';
      const [jy, jm, jd] = datePart.split(/[\/\-]/).map((p) => parseInt(p, 10));
      if (!isNaN(jy) && !isNaN(jm) && !isNaN(jd)) {
        const g = jalaliToGregorian(jy, jm, jd);
        const isoStr = `${g.gy}-${String(g.gm).padStart(2, '0')}-${String(g.gd).padStart(2, '0')}T${timePart}`;
        const d = new Date(isoStr);
        if (!isNaN(d.getTime())) return d.toISOString();
      }
    } catch {}
  }

  let d = new Date(str);
  if (isNaN(d.getTime())) {
    d = new Date(str.replace(' ', 'T'));
  }

  if (!isNaN(d.getTime())) {
    return d.toISOString();
  }

  return null;
}


