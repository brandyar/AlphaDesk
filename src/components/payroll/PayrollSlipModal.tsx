import React, { useRef } from 'react';
import {
  X,
  Printer,
  Building2,
  Calendar,
  User,
  CreditCard,
  DollarSign,
  TrendingUp,
  Wallet,
  CheckCircle2,
  Share2,
} from 'lucide-react';
import { PayrollSlip, Personnel } from '../../types';
import { toPersianDigits, formatPersianDate } from '../../utils';

interface PayrollSlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  slip: PayrollSlip | null;
  personnel?: Personnel | null;
}

export const PayrollSlipModal: React.FC<PayrollSlipModalProps> = ({
  isOpen,
  onClose,
  slip,
  personnel,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !slip) return null;

  const formatToman = (val: number | null | undefined) => {
    return toPersianDigits((val || 0).toLocaleString('en-US'));
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#282828] rounded-2xl shadow-2xl overflow-hidden my-6 text-right">
        {/* Modal Controls Toolbar (Hidden in print) */}
        <div className="print:hidden flex items-center justify-between p-4 border-b border-slate-200 dark:border-[#202020] bg-slate-50 dark:bg-[#181818]">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-800 dark:text-white">پیش‌نمایش فیش حقوقی</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                slip.status === 'paid'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-[#1DB954]/20 dark:text-[#1DB954]'
                  : slip.status === 'approved'
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-400'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400'
              }`}
            >
              {slip.status === 'paid' ? 'پرداخت شده' : slip.status === 'approved' ? 'تایید نهایی' : 'پیش‌نویس'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-[#1DB954] dark:hover:bg-[#1ed760] text-white dark:text-black text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>چاپ فیش</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-[#252525] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Official Slip Document */}
        <div ref={printRef} className="p-6 sm:p-8 space-y-6 text-slate-900 dark:text-white bg-white dark:bg-[#141414] print:p-0">
          {/* Header */}
          <div className="border-b-2 border-slate-900 dark:border-white/20 pb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#1DB954] flex items-center justify-center text-black font-black text-xl shadow-md">
                <Building2 className="w-6 h-6 text-black" />
              </div>
              <div>
                <h1 className="text-lg font-black tracking-tight">سامانه مدیریت و فروش آلفادسک</h1>
                <p className="text-xs text-slate-500 dark:text-[#888]">برگ تسویه حساب و فیش حقوق و دستمزد پرسنل</p>
              </div>
            </div>

            <div className="text-left text-xs font-mono space-y-1">
              <div>
                <span className="text-slate-500 dark:text-[#888]">شماره فیش: </span>
                <span className="font-bold">SLIP-{toPersianDigits(slip.id)}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-[#888]">تاریخ صدور: </span>
                <span>{formatPersianDate(slip.date_created || new Date().toISOString())}</span>
              </div>
            </div>
          </div>

          {/* Personnel & Period Info Box */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-[#1c1c1c] border border-slate-200 dark:border-[#282828] text-xs">
            <div>
              <span className="text-slate-500 dark:text-[#888] block mb-0.5">نام کارشناس:</span>
              <span className="font-bold text-sm">
                {personnel?.name ||
                  (slip.personnel_name && slip.personnel_name !== String(slip.personnel_id)
                    ? slip.personnel_name
                    : '') ||
                  personnel?.username ||
                  'همکار گرامی'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-[#888] block mb-0.5">سمت کاری:</span>
              <span className="font-bold">
                {personnel?.role === 'admin'
                  ? 'مدیر سیستم'
                  : personnel?.role === 'sales_manager'
                  ? 'مدیر فروش'
                  : 'کارشناس فروش'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-[#888] block mb-0.5">کد پرسنلی / کاربری:</span>
              <span className="font-mono font-bold">{toPersianDigits(slip.personnel_id)}</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-[#888] block mb-0.5">بازه تسویه:</span>
              <span className="font-mono">
                {slip.from_date ? formatPersianDate(slip.from_date) : '-'} تا {slip.to_date ? formatPersianDate(slip.to_date) : '-'}
              </span>
            </div>
          </div>

          {/* Bank Account info if available */}
          {(personnel?.bank_card_number || personnel?.iban) && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#181818] border border-slate-200 dark:border-[#282828] flex flex-wrap items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600 dark:text-[#1DB954]" />
                <span className="text-slate-500 dark:text-[#888]">شماره کارت واریز:</span>
                <span className="font-bold ltr">{personnel.bank_card_number || '-'}</span>
              </div>
              {personnel.iban && (
                <div className="text-slate-500 dark:text-[#888]">
                  <span>شبا: </span>
                  <span className="font-bold text-slate-800 dark:text-white ltr">IR{personnel.iban}</span>
                </div>
              )}
            </div>
          )}

          {/* Earnings & Deductions Tables */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 1. Earnings */}
            <div className="rounded-xl border border-slate-200 dark:border-[#282828] overflow-hidden">
              <div className="bg-slate-100 dark:bg-[#1f1f1f] p-2.5 font-bold text-xs flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-emerald-700 dark:text-[#1DB954]">
                  <TrendingUp className="w-4 h-4" />
                  <span>حقوق و دریافتی‌ها</span>
                </span>
                <span className="text-[10px] text-slate-500 dark:text-[#888]">(تومان)</span>
              </div>
              <div className="p-3 space-y-2 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-[#222]">
                  <span className="text-slate-600 dark:text-[#A7A7A7]">حقوق پایه ثابت ماه:</span>
                  <span className="font-mono font-bold">{formatToman(slip.base_salary_amount)}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-[#222]">
                  <div>
                    <span className="text-slate-600 dark:text-[#A7A7A7]">پورسانت حاصل از قراردادها:</span>
                    <span className="text-[10px] text-slate-400 block">
                      ({toPersianDigits(slip.contracts_count)} قرارداد به ارزش {formatToman(slip.total_contracts_amount)} ت)
                    </span>
                  </div>
                  <span className="font-mono font-bold text-emerald-600 dark:text-[#1DB954]">
                    {formatToman(slip.commission_amount)}
                  </span>
                </div>
                {Number(slip.bonuses_amount) > 0 && (
                  <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-[#222]">
                    <span className="text-slate-600 dark:text-[#A7A7A7]">پاداش‌های متفرقه:</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-[#1DB954]">
                      {formatToman(slip.bonuses_amount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-1 font-bold text-slate-900 dark:text-white">
                  <span>جمع ناخالص درآمد:</span>
                  <span className="font-mono">
                    {formatToman(Number(slip.base_salary_amount || 0) + Number(slip.commission_amount || 0) + Number(slip.bonuses_amount || 0))}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Deductions */}
            <div className="rounded-xl border border-slate-200 dark:border-[#282828] overflow-hidden">
              <div className="bg-slate-100 dark:bg-[#1f1f1f] p-2.5 font-bold text-xs flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                  <Wallet className="w-4 h-4" />
                  <span>کسورات و مساعده‌ها</span>
                </span>
                <span className="text-[10px] text-slate-500 dark:text-[#888]">(تومان)</span>
              </div>
              <div className="p-3 space-y-2 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-[#222]">
                  <span className="text-slate-600 dark:text-[#A7A7A7]">مساعده‌های کسر شده:</span>
                  <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                    - {formatToman(slip.advances_deducted)}
                  </span>
                </div>
                {Number(slip.deductions_amount) > 0 && (
                  <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-[#222]">
                    <span className="text-slate-600 dark:text-[#A7A7A7]">سایر کسورات و جرایم:</span>
                    <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                      - {formatToman(slip.deductions_amount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-1 font-bold text-slate-900 dark:text-white">
                  <span>جمع کل کسورات:</span>
                  <span className="font-mono text-rose-600 dark:text-rose-400">
                    - {formatToman(Number(slip.advances_deducted || 0) + Number(slip.deductions_amount || 0))}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Net Payable Highlight Banner */}
          <div className="p-5 rounded-2xl bg-emerald-500/10 dark:bg-[#152e1c] border-2 border-emerald-500/40 dark:border-[#1DB954]/50 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs text-slate-600 dark:text-[#A7A7A7] block mb-1">مبلغ خالص قابل پرداخت نهایی:</span>
              <div className="text-2xl sm:text-3xl font-black text-emerald-700 dark:text-[#1DB954] font-mono">
                {formatToman(slip.net_payable)} <span className="text-sm font-normal">تومان</span>
              </div>
            </div>

            {slip.status === 'paid' && (
              <div className="p-2.5 rounded-xl bg-white/80 dark:bg-black/30 border border-emerald-500/30 text-xs text-right font-mono">
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-[#1DB954] font-bold mb-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>واریز شده به حساب</span>
                </div>
                {slip.payment_date && <div>تاریخ: {formatPersianDate(slip.payment_date)}</div>}
                {slip.payment_ref && <div>کد پیگیری: {toPersianDigits(slip.payment_ref)}</div>}
              </div>
            )}
          </div>

          {/* Signatures */}
          <div className="pt-6 border-t border-slate-200 dark:border-[#282828] grid grid-cols-2 text-center text-xs text-slate-500 dark:text-[#888]">
            <div className="space-y-8">
              <span>امضای کارشناس دریافت‌کننده</span>
              <div className="text-[11px]">...................................................</div>
            </div>
            <div className="space-y-8">
              <span>امضا و مهر مدیر امور مالی و سیستم</span>
              <div className="text-[11px] font-bold text-slate-700 dark:text-[#CCC]">
                {slip.created_by || 'مدیریت آلفادسک'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
