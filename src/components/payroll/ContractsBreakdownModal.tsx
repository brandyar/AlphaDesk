import React from 'react';
import {
  X,
  FileText,
  DollarSign,
  TrendingUp,
  Percent,
  Calendar,
  Layers,
  Wallet,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { PayrollCalculateItem } from '../../types';
import { toPersianDigits, formatPersianDate } from '../../utils';

interface ContractsBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: PayrollCalculateItem | null;
}

export const ContractsBreakdownModal: React.FC<ContractsBreakdownModalProps> = ({
  isOpen,
  onClose,
  item,
}) => {
  if (!isOpen || !item) return null;

  const formatToman = (val: number | null | undefined) => {
    return toPersianDigits((val || 0).toLocaleString('en-US'));
  };

  const config = item.salary_config;
  const breakdown = item.commission_breakdown;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#282828] rounded-2xl shadow-2xl overflow-hidden my-6 text-right">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-[#202020] bg-slate-50 dark:bg-[#181818]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-[#1DB954]/15 border border-emerald-500/20 dark:border-[#1DB954]/30 flex items-center justify-center text-emerald-600 dark:text-[#1DB954] flex-shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>ریز قراردادها و فرمول محاسبه:</span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-[#1DB954]/20 dark:text-[#1DB954] font-bold">
                  {item.personnel_name}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-[#888]">
                مبنای محاسبه پورسانت قراردادهای ثبت‌شده در این بازه زمانی
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-[#252525] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Quick Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#181818] border border-slate-200 dark:border-[#262626]">
              <span className="text-[10px] text-slate-400 block mb-1">تعداد قراردادها:</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {toPersianDigits(item.contracts_count)} قرارداد
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#181818] border border-slate-200 dark:border-[#262626]">
              <span className="text-[10px] text-slate-400 block mb-1">ارزش کل قراردادها:</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">
                {formatToman(item.total_contracts_amount)} ت
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#181818] border border-slate-200 dark:border-[#262626]">
              <span className="text-[10px] text-slate-400 block mb-1">پورسانت حاصله:</span>
              <span className="text-sm font-bold text-emerald-600 dark:text-[#1DB954] font-mono">
                {formatToman(item.commission_amount)} ت
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#181818] border border-slate-200 dark:border-[#262626]">
              <span className="text-[10px] text-slate-400 block mb-1">مساعده کسرشده:</span>
              <span className="text-sm font-bold text-rose-500 font-mono">
                {formatToman(item.advances_deducted)} ت
              </span>
            </div>
          </div>

          {/* Detailed Math Breakdown */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#161616] border border-slate-200 dark:border-[#282828] space-y-3">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-[#1DB954]" />
              <span>نحوه محاسبه ریاضی پورسانت:</span>
            </h3>

            {!config ? (
              <div className="text-xs text-amber-600 dark:text-amber-400">
                حکم حقوقی برای این همکار هنوز تعریف نشده است.
              </div>
            ) : config.salary_type === 'fixed' ? (
              <div className="text-xs text-slate-600 dark:text-[#A7A7A7] leading-relaxed">
                نوع قرارداد این همکار <strong>«فقط حقوق ثابت»</strong> است؛ لذا پورسانتی از قراردادها برای ایشان لحاظ نمی‌شود.
              </div>
            ) : item.total_contracts_amount === 0 ? (

              <div className="text-xs text-amber-600 dark:text-amber-400">
                در این بازه زمانی هیچ قراردادی به نام این همکار ثبت نشده است.
              </div>
            ) : breakdown?.model === 'flat' ? (
              <div className="text-xs space-y-1.5 text-slate-700 dark:text-[#CCC]">
                <div>
                  <strong>مدل:</strong> درصد ثابت از کل فروش ({toPersianDigits(breakdown.rate_percent)}٪)
                </div>
                <div className="font-mono bg-white dark:bg-[#1f1f1f] p-2.5 rounded-lg border border-slate-200 dark:border-[#333]">
                  {formatToman(item.total_contracts_amount)} تومان × {toPersianDigits(breakdown.rate_percent)}٪ ={' '}
                  <span className="text-emerald-600 dark:text-[#1DB954] font-bold">
                    {formatToman(item.commission_amount)} تومان
                  </span>
                </div>
              </div>
            ) : breakdown?.mode === 'retroactive' ? (
              <div className="text-xs space-y-2 text-slate-700 dark:text-[#CCC]">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold">مدل:</span>
                  <span>پله‌ای عطف‌به‌ماسبق (اعمال درصد بالاترین پله به کل فروش)</span>
                </div>
                <div className="font-mono bg-white dark:bg-[#1f1f1f] p-2.5 rounded-lg border border-slate-200 dark:border-[#333] space-y-1">
                  <div>
                    پله احراز شده: فروش از مرز {formatToman(breakdown.applied_tier?.from_amount)} تومان عبور کرده و مشمول درصد{' '}
                    <strong className="text-emerald-600 dark:text-[#1DB954]">{toPersianDigits(breakdown.rate_percent)}٪</strong> گردید.
                  </div>
                  <div className="border-t border-slate-200 dark:border-[#333] pt-1">
                    {formatToman(item.total_contracts_amount)} تومان × {toPersianDigits(breakdown.rate_percent)}٪ ={' '}
                    <span className="text-emerald-600 dark:text-[#1DB954] font-bold">
                      {formatToman(item.commission_amount)} تومان
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs space-y-2 text-slate-700 dark:text-[#CCC]">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold">مدل:</span>
                  <span>پله‌ای مازاد (محاسبه تصاعدی براکت‌ها)</span>
                </div>
                <div className="space-y-1.5">
                  {breakdown?.applied_brackets?.map((b: any, bIdx: number) => (
                    <div
                      key={bIdx}
                      className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-[#1f1f1f] border border-slate-200 dark:border-[#333] font-mono text-xs"
                    >
                      <span>
                        پله {toPersianDigits(bIdx + 1)} (از {formatToman(b.from_amount)} تا{' '}
                        {b.to_amount ? formatToman(b.to_amount) : 'بی‌نهایت'}):
                      </span>
                      <span className="text-emerald-600 dark:text-[#1DB954] font-bold">
                        {formatToman(b.slice_amount)} ت × {toPersianDigits(b.rate_percent)}٪ = {formatToman(b.earned)} تومان
                      </span>
                    </div>
                  ))}
                  <div className="text-left font-mono font-bold text-slate-900 dark:text-white pt-1">
                    جمع کل پورسانت پله‌ها: {formatToman(item.commission_amount)} تومان
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Contracts Table */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-emerald-600 dark:text-[#1DB954]" />
              <span>فهرست قراردادهای بسته شده در این بازه ({toPersianDigits(item.contracts_count)} فقره):</span>
            </h3>

            {item.contracts_list.length === 0 ? (
              <div className="text-center p-4 rounded-xl bg-slate-50 dark:bg-[#181818] text-slate-500 text-xs">
                قراردادی در این بازه یافت نشد.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-[#282828]">
                <table className="w-full text-xs text-right">
                  <thead className="bg-slate-100 dark:bg-[#181818] text-slate-600 dark:text-[#888] font-semibold border-b border-slate-200 dark:border-[#282828]">
                    <tr>
                      <th className="p-2.5">شماره قرارداد / فاکتور</th>
                      <th className="p-2.5">تاریخ ثبت</th>
                      <th className="p-2.5">موضوع / اقلام</th>
                      <th className="p-2.5 text-left">مبلغ (تومان)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#202020]">
                    {item.contracts_list.map((c, cIdx) => (
                      <tr key={c.id || cIdx} className="hover:bg-slate-50 dark:hover:bg-[#181818] transition-colors">
                        <td className="p-2.5 font-mono font-bold text-slate-900 dark:text-white">
                          {c.contract_number ? toPersianDigits(c.contract_number) : `قرارداد #${toPersianDigits(cIdx + 1)}`}
                        </td>
                        <td className="p-2.5 text-slate-600 dark:text-[#AAA]">
                          {formatPersianDate(c.contract_date)}
                        </td>
                        <td className="p-2.5 text-slate-600 dark:text-[#AAA] max-w-[200px] truncate">
                          {c.contract_items || 'خدمات و اقلام قرارداد'}
                        </td>
                        <td className="p-2.5 font-mono font-bold text-emerald-600 dark:text-[#1DB954] text-left">
                          {formatToman(c.contract_amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Advances Deducted Section */}
          {item.advances_list.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                <Wallet className="w-4 h-4" />
                <span>مساعده‌های تاییدشده کسر شده در این ماه ({toPersianDigits(item.advances_list.length)} مورد):</span>
              </h3>
              <div className="space-y-1.5">
                {item.advances_list.map((adv: any, aIdx: number) => (
                  <div
                    key={adv.id || aIdx}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-rose-500/5 border border-rose-500/20 text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-800 dark:text-white">
                        مساعده ماه {toPersianDigits(adv.target_month || '-')}
                      </span>
                      {adv.reason && <span className="text-[11px] text-slate-500 mr-2">({adv.reason})</span>}
                    </div>
                    <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                      - {formatToman(adv.approved_amount ?? adv.amount)} تومان
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-[#202020] bg-slate-50 dark:bg-[#181818] flex items-center justify-between">
          <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>خالص قابل پرداخت این ماه:</span>
            <span className="text-emerald-600 dark:text-[#1DB954] font-mono text-sm">
              {formatToman(item.net_payable)} تومان
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-[#252525] hover:bg-slate-300 dark:hover:bg-[#303030] text-slate-800 dark:text-white text-xs font-bold transition-colors cursor-pointer"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
};
