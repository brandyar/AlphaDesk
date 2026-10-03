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
    return { text: 'بدون مهلت', isExpired: false, hoursLeft: 9999, badgeClass: 'text-[#A7A7A7] bg-[#282828]' };
  }

  const now = new Date().getTime();
  const deadline = new Date(deadlineIso).getTime();
  const diff = deadline - now;

  if (diff <= 0) {
    return {
      text: 'مهلت منقضی شده!',
      isExpired: true,
      hoursLeft: 0,
      badgeClass: 'text-[#E22134] bg-[#E22134]/15 border border-[#E22134]/30 animate-pulse',
    };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 2) {
    return {
      text: `${toPersianDigits(days)} روز باقی‌مانده`,
      isExpired: false,
      hoursLeft: days * 24 + hours,
      badgeClass: 'text-[#1DB954] bg-[#1DB954]/10 border border-[#1DB954]/20',
    };
  } else if (days >= 1) {
    return {
      text: `${toPersianDigits(days)} روز و ${toPersianDigits(hours)} ساعت`,
      isExpired: false,
      hoursLeft: days * 24 + hours,
      badgeClass: 'text-[#F59B23] bg-[#F59B23]/10 border border-[#F59B23]/20',
    };
  } else {
    return {
      text: `${toPersianDigits(hours)} ساعت باقی‌مانده`,
      isExpired: false,
      hoursLeft: hours,
      badgeClass: 'text-[#F59B23] bg-[#F59B23]/20 border border-[#F59B23]/40 font-bold',
    };
  }
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
      return { color: 'text-[#1DB954]', bg: 'bg-[#1DB954]/10 border-[#1DB954]/30', dot: 'bg-[#1DB954]' };
    case 'پیش نویس قرارداد':
    case 'پیگیری قرارداد':
      return { color: 'text-[#1ED760]', bg: 'bg-[#1ED760]/10 border-[#1ED760]/30', dot: 'bg-[#1ED760]' };
    case 'پیگیری قبل از انقضا':
      return { color: 'text-[#F59B23]', bg: 'bg-[#F59B23]/10 border-[#F59B23]/30', dot: 'bg-[#F59B23]' };
    case 'پیگیری بلند مدت':
      return { color: 'text-[#B3B3B3]', bg: 'bg-[#282828] border-[#333333]', dot: 'bg-[#B3B3B3]' };
    case 'نمیخواد':
    case 'پاسخ نمیدهد':
      return { color: 'text-[#E22134]', bg: 'bg-[#E22134]/10 border-[#E22134]/30', dot: 'bg-[#E22134]' };
    case 'لیست سیاه':
      return { color: 'text-red-400', bg: 'bg-red-950/40 border-red-800', dot: 'bg-red-500' };
    case 'تماس برقرار نشده':
    default:
      return { color: 'text-[#A7A7A7]', bg: 'bg-[#282828] border-[#333333]', dot: 'bg-[#535353]' };
  }
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
      return { color: 'text-[#1DB954]', bg: 'bg-[#1DB954]/10 border border-[#1DB954]/30' };
    case 'در حال بررسی':
      return { color: 'text-[#F59B23]', bg: 'bg-[#F59B23]/10 border border-[#F59B23]/30' };
    case 'تماس نگرفته':
      return { color: 'text-[#B3B3B3]', bg: 'bg-[#282828] border border-[#333333]' };
    case 'پاسخ نداد':
    case 'شماره نامعتبر':
    default:
      return { color: 'text-[#E22134]', bg: 'bg-[#E22134]/10 border border-[#E22134]/30' };
  }
}
