import { NegotiationStatus, LeadStatus } from './types';

export function formatTimeRemaining(deadlineIso: string): {
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
      text: `${days} روز باقی‌مانده`,
      isExpired: false,
      hoursLeft: days * 24 + hours,
      badgeClass: 'text-[#1DB954] bg-[#1DB954]/10 border border-[#1DB954]/20',
    };
  } else if (days >= 1) {
    return {
      text: `${days} روز و ${hours} ساعت`,
      isExpired: false,
      hoursLeft: days * 24 + hours,
      badgeClass: 'text-[#F59B23] bg-[#F59B23]/10 border border-[#F59B23]/20',
    };
  } else {
    return {
      text: `${hours} ساعت باقی‌مانده`,
      isExpired: false,
      hoursLeft: hours,
      badgeClass: 'text-[#F59B23] bg-[#F59B23]/20 border border-[#F59B23]/40 font-bold',
    };
  }
}

export function formatPersianDate(isoString: string): string {
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

export function getStatusTheme(status: NegotiationStatus): {
  color: string;
  bg: string;
  dot: string;
} {
  switch (status) {
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
