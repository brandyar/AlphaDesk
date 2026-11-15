import React from 'react';
import { Unlock, Building2, User, FileText, ArrowLeft, Loader2 } from 'lucide-react';
import { DuplicateCheckResult } from '../types';
import { formatStatusLabel, toPersianDigits } from '../utils';

interface FreePoolDuplicateAlertProps {
  duplicate: DuplicateCheckResult;
  onConfirmTransfer: (customerId: string) => Promise<void>;
  isTransferring?: boolean;
  targetMarketerName?: string;
}

export const FreePoolDuplicateAlert: React.FC<FreePoolDuplicateAlertProps> = ({
  duplicate,
  onConfirmTransfer,
  isTransferring = false,
  targetMarketerName,
}) => {
  const mc = duplicate.matchedCustomer;
  if (!mc) return null;

  return (
    <div className="mt-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-500/50 text-amber-950 dark:text-amber-100 space-y-2.5 shadow-sm">
      <div className="flex items-start gap-2">
        <div className="w-7 h-7 rounded-lg bg-amber-200/70 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
          <Unlock className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="text-xs font-extrabold text-amber-900 dark:text-amber-200">
            این شماره از قبل در مشتریان آزاد وجود دارد
          </div>
          <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300/90">
            برای جلوگیری از ثبت پرونده تکراری، با تأیید انتقال مالکیت، این پرونده به نام{' '}
            <strong className="text-amber-950 dark:text-white">
              {targetMarketerName || 'شما'}
            </strong>{' '}
            منتقل شده و گزارش‌های قبلی پرونده نمایش داده می‌شود.
          </p>
        </div>
      </div>

      <div className="p-2.5 rounded-lg bg-white/80 dark:bg-[#141414]/80 border border-amber-200/80 dark:border-amber-500/25 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
        <div className="flex items-center gap-1.5 truncate">
          <Building2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="text-slate-500 dark:text-[#888]">پرونده:</span>
          <span className="font-bold text-slate-900 dark:text-white truncate">{mc.company_name}</span>
        </div>

        {mc.manager_name && (
          <div className="flex items-center gap-1.5 truncate">
            <User className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="text-slate-500 dark:text-[#888]">مدیر:</span>
            <span className="font-semibold text-slate-800 dark:text-white truncate">{mc.manager_name}</span>
          </div>
        )}

        <div className="flex items-center gap-1.5 truncate">
          <span className="text-slate-500 dark:text-[#888]">بازاریاب قبلی:</span>
          <span className="font-semibold text-slate-800 dark:text-white truncate">
            {mc.assigned_marketer_name || 'تخصیص نیافته'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 truncate">
          <FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-[#1DB954] shrink-0" />
          <span className="text-slate-500 dark:text-[#888]">وضعیت / گزارش‌ها:</span>
          <span className="font-semibold text-slate-800 dark:text-white truncate">
            {formatStatusLabel(mc.status)}
            {typeof mc.reports_count === 'number' && (
              <span className="mr-1 text-emerald-700 dark:text-[#1DB954] font-mono">
                ({toPersianDigits(mc.reports_count)} گزارش قبلی)
              </span>
            )}
          </span>
        </div>
      </div>

      <button
        type="button"
        disabled={isTransferring}
        onClick={() => onConfirmTransfer(mc.id)}
        className="w-full py-2 px-3 rounded-lg bg-[#1DB954] hover:bg-[#1ED760] disabled:opacity-60 text-black font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
      >
        {isTransferring ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>در حال انتقال مالکیت و بارگذاری گزارش‌ها...</span>
          </>
        ) : (
          <>
            <Unlock className="w-3.5 h-3.5" />
            <span>تأیید انتقال مالکیت و مشاهده گزارش‌های قبلی</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </>
        )}
      </button>
    </div>
  );
};
