import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Minus,
  Award,
  AlertCircle,
  Check,
  Trash2,
  Clock,
  CheckCircle2,
  XCircle,
  Sparkles,
} from 'lucide-react';
import {
  PayrollAdjustment,
  PayrollAdjustmentCategory,
  PayrollAdjustmentType,
  Personnel,
} from '../../types';
import {
  fetchPayrollAdjustments,
  createPayrollAdjustment,
  updatePayrollAdjustment,
  deletePayrollAdjustment,
} from '../../api';
import { toPersianDigits, JALALI_MONTH_NAMES } from '../../utils';

export const ADJUSTMENT_CATEGORY_LABELS: Record<string, string> = {
  sales_bonus: 'پاداش فروش',
  overtime: 'اضافه‌کاری',
  delay: 'کسر تاخیر',
  insurance: 'بیمه سهم کارمند',
  penalty: 'جریمه انضباطی',
  other: 'سایر موارد',
};

const QUICK_BONUS_PRESETS: Array<{ title: string; category: PayrollAdjustmentCategory }> = [
  { title: 'پاداش عملکرد فروش', category: 'sales_bonus' },
  { title: 'اضافه‌کاری ماهانه', category: 'overtime' },
  { title: 'پاداش تشویقی مدیریت', category: 'other' },
];

const QUICK_DEDUCTION_PRESETS: Array<{ title: string; category: PayrollAdjustmentCategory }> = [
  { title: 'کسر تاخیر و غیبت', category: 'delay' },
  { title: 'بیمه سهم کارمند', category: 'insurance' },
  { title: 'جریمه انضباطی', category: 'penalty' },
];

interface PayrollAdjustmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  personnel: Personnel | null;
  targetYear: number;
  targetMonth: number;
  baseSalary?: number;
  commissionAmount?: number;
  advancesDeducted?: number;
  onChanged: () => Promise<void> | void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const PayrollAdjustmentsModal: React.FC<PayrollAdjustmentsModalProps> = ({
  isOpen,
  onClose,
  personnel,
  targetYear,
  targetMonth,
  baseSalary = 0,
  commissionAmount = 0,
  advancesDeducted = 0,
  onChanged,
  showToast,
}) => {
  const [items, setItems] = useState<PayrollAdjustment[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // New adjustment form
  const [adjType, setAdjType] = useState<PayrollAdjustmentType>('bonus');
  const [category, setCategory] = useState<PayrollAdjustmentCategory>('sales_bonus');
  const [title, setTitle] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inline approval editing for pending items
  const [reviewingId, setReviewingId] = useState<number | string | null>(null);
  const [reviewAmount, setReviewAmount] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [isProcessingReview, setIsProcessingReview] = useState(false);

  const loadItems = async () => {
    if (!personnel) return;
    setIsLoading(true);
    try {
      const list = await fetchPayrollAdjustments({
        personnel_id: personnel.id,
        target_year: targetYear,
        target_month: targetMonth,
      });
      setItems(list);
    } catch (err: any) {
      showToast(err.message || 'خطا در دریافت پاداش‌ها و کسورات', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && personnel) {
      loadItems();
      setTitle('');
      setAmountInput('');
      setReason('');
      setReviewingId(null);
    }
  }, [isOpen, personnel?.id, targetYear, targetMonth]);

  if (!isOpen || !personnel) return null;

  const formatNum = (val: number | null | undefined) =>
    toPersianDigits((val || 0).toLocaleString('en-US'));

  const handleTypeSwitch = (nextType: PayrollAdjustmentType) => {
    setAdjType(nextType);
    setCategory(nextType === 'bonus' ? 'sales_bonus' : 'delay');
  };

  const handleAddDirect = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = Number(amountInput.replace(/[^0-9]/g, ''));
    if (!title.trim()) {
      showToast('لطفاً عنوان پاداش یا کسری را وارد کنید.', 'error');
      return;
    }
    if (!numericAmount || numericAmount <= 0) {
      showToast('لطفاً مبلغ معتبر (بزرگ‌تر از صفر) وارد کنید.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await createPayrollAdjustment({
        personnel_id: personnel.id,
        personnel_name: personnel.name,
        type: adjType,
        category,
        title: title.trim(),
        amount: numericAmount,
        target_year: targetYear,
        target_month: targetMonth,
        reason: reason.trim(),
        source: 'manager_direct',
      });
      showToast(
        `${adjType === 'bonus' ? 'پاداش' : 'کسری'} برای ${personnel.name} با موفقیت ثبت و تایید شد.`,
        'success'
      );
      setTitle('');
      setAmountInput('');
      setReason('');
      await loadItems();
      await onChanged();
    } catch (err: any) {
      showToast(err.message || 'خطا در ثبت مورد جدید', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveOrReject = async (
    item: PayrollAdjustment,
    nextStatus: 'approved' | 'rejected'
  ) => {
    setIsProcessingReview(true);
    try {
      const approvedNum =
        nextStatus === 'approved'
          ? Number((reviewAmount || String(item.amount)).replace(/[^0-9]/g, '')) || item.amount
          : null;

      await updatePayrollAdjustment(item.id, {
        status: nextStatus,
        approved_amount: approvedNum,
        manager_note: reviewNote.trim() || undefined,
      });
      showToast(
        nextStatus === 'approved'
          ? 'درخواست پاداش تایید و در حقوق این ماه لحاظ شد.'
          : 'درخواست پاداش رد شد.',
        'success'
      );
      setReviewingId(null);
      setReviewAmount('');
      setReviewNote('');
      await loadItems();
      await onChanged();
    } catch (err: any) {
      showToast(err.message || 'خطا در تعیین وضعیت درخواست', 'error');
    } finally {
      setIsProcessingReview(false);
    }
  };

  const handleDelete = async (id: number | string) => {
    if (!window.confirm('آیا از حذف این ردیف اطمینان دارید؟')) return;
    try {
      await deletePayrollAdjustment(id);
      showToast('ردیف با موفقیت حذف شد.', 'success');
      await loadItems();
      await onChanged();
    } catch (err: any) {
      showToast(err.message || 'خطا در حذف ردیف', 'error');
    }
  };

  const unlinkedApproved = items.filter((i) => i.status === 'approved' && !i.payroll_slip_id);
  const pendingItems = items.filter((i) => i.status === 'pending' && !i.payroll_slip_id);
  const otherItems = items.filter((i) => i.status === 'rejected' || Boolean(i.payroll_slip_id));

  const totalBonuses = unlinkedApproved
    .filter((i) => i.type === 'bonus')
    .reduce((sum, i) => sum + (Number(i.approved_amount ?? i.amount) || 0), 0);

  const totalDeductions = unlinkedApproved
    .filter((i) => i.type === 'deduction')
    .reduce((sum, i) => sum + (Number(i.approved_amount ?? i.amount) || 0), 0);

  const rawProjectedNet =
    baseSalary + commissionAmount + totalBonuses - advancesDeducted - totalDeductions;
  const projectedNet = Math.max(0, rawProjectedNet);
  const monthLabel = `${JALALI_MONTH_NAMES[targetMonth - 1] || ''} ${toPersianDigits(targetYear)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#282828] rounded-2xl shadow-2xl overflow-hidden my-6 text-right">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-[#202020] bg-slate-50 dark:bg-[#181818]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-[#1DB954]/15 border border-emerald-500/25 flex items-center justify-center text-emerald-600 dark:text-[#1DB954] shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white flex flex-wrap items-center gap-2">
                <span>پاداش و کسورات:</span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-[#1DB954]/20 dark:text-[#1DB954] font-bold">
                  {personnel.name}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-200 dark:bg-[#252525] text-slate-700 dark:text-[#CCC] font-mono">
                  {monthLabel}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-[#888] mt-0.5">
                ثبت مستقیم پاداش یا کسری و بررسی درخواست‌های پاداش این همکار
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

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* 1. Direct Manager Entry Form */}
          <form
            onSubmit={handleAddDirect}
            className="p-4 rounded-xl bg-slate-50 dark:bg-[#181818] border border-slate-200 dark:border-[#282828] space-y-3.5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-[#1DB954]" />
                <span>ثبت مستقیم پاداش یا کسری (تایید خودکار):</span>
              </span>

              <div className="flex items-center gap-1.5 bg-white dark:bg-[#121212] p-1 rounded-xl border border-slate-200 dark:border-[#2a2a2a]">
                <button
                  type="button"
                  onClick={() => handleTypeSwitch('bonus')}
                  className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    adjType === 'bonus'
                      ? 'bg-emerald-600 dark:bg-[#1DB954] text-white dark:text-black'
                      : 'text-slate-500 dark:text-[#888] hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>پاداش (+)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTypeSwitch('deduction')}
                  className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    adjType === 'deduction'
                      ? 'bg-rose-600 text-white'
                      : 'text-slate-500 dark:text-[#888] hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Minus className="w-3.5 h-3.5" />
                  <span>کسری (-)</span>
                </button>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] text-slate-400">گزینه‌های سریع:</span>
              {(adjType === 'bonus' ? QUICK_BONUS_PRESETS : QUICK_DEDUCTION_PRESETS).map((preset) => (
                <button
                  key={preset.title}
                  type="button"
                  onClick={() => {
                    setTitle(preset.title);
                    setCategory(preset.category);
                  }}
                  className="text-[11px] px-2 py-0.5 rounded-lg bg-white dark:bg-[#202020] hover:bg-slate-200 dark:hover:bg-[#2a2a2a] text-slate-600 dark:text-[#BBB] border border-slate-200 dark:border-[#303030] transition-colors cursor-pointer"
                >
                  {preset.title}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-[#AAA] mb-1">
                  عنوان (جهت چاپ در فیش) *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={adjType === 'bonus' ? 'مثلاً: پاداش ثبت قرارداد برتر' : 'مثلاً: کسر تاخیر هفته دوم'}
                  required
                  className="w-full h-9 px-3 rounded-xl bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#303030] text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-[#AAA] mb-1">
                  مبلغ (تومان) *
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  placeholder="1000000"
                  required
                  className="w-full h-9 px-3 rounded-xl bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#303030] text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
                {Number(amountInput.replace(/[^0-9]/g, '')) > 0 && (
                  <span
                    className={`text-[10px] font-mono block mt-0.5 ${
                      adjType === 'bonus' ? 'text-emerald-600 dark:text-[#1DB954]' : 'text-rose-500'
                    }`}
                  >
                    {formatNum(Number(amountInput.replace(/[^0-9]/g, '')))} تومان
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-[#AAA] mb-1">
                  دسته‌بندی
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as PayrollAdjustmentCategory)}
                  className="w-full h-9 px-2.5 rounded-xl bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#303030] text-xs text-slate-900 dark:text-white focus:outline-none"
                >
                  {Object.entries(ADJUSTMENT_CATEGORY_LABELS).map(([k, lbl]) => (
                    <option key={k} value={k}>
                      {lbl}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-[#AAA] mb-1">
                  توضیحات (اختیاری)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="توضیح تکمیلی برای همکار و بایگانی..."
                    className="flex-1 h-9 px-3 rounded-xl bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#303030] text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`px-4 h-9 rounded-xl font-bold text-xs transition-all cursor-pointer disabled:opacity-50 shrink-0 ${
                      adjType === 'bonus'
                        ? 'bg-emerald-600 hover:bg-emerald-700 dark:bg-[#1DB954] dark:hover:bg-[#1ed760] text-white dark:text-black'
                        : 'bg-rose-600 hover:bg-rose-700 text-white'
                    }`}
                  >
                    {isSubmitting ? 'در حال ثبت...' : adjType === 'bonus' ? 'ثبت پاداش' : 'ثبت کسری'}
                  </button>
                </div>
              </div>
            </div>
          </form>

          {/* 2. Pending Employee Bonus Requests for this Month */}
          {pendingItems.length > 0 && (
            <div className="space-y-2.5">
              <div className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                <span>
                  درخواست‌های پاداش در انتظار تایید ({toPersianDigits(pendingItems.length)} مورد):
                </span>
              </div>

              <div className="space-y-2">
                {pendingItems.map((item) => {
                  const isReviewing = reviewingId === item.id;
                  return (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-500/10 border border-amber-300/60 dark:border-amber-500/30 space-y-2.5 text-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{item.title}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300">
                              درخواست همکار
                            </span>
                          </div>
                          {item.reason && (
                            <p className="text-[11px] text-slate-600 dark:text-[#AAA] mt-0.5">
                              {item.reason}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-emerald-700 dark:text-[#1DB954]">
                            + {formatNum(item.amount)} ت
                          </span>
                          {!isReviewing && (
                            <button
                              type="button"
                              onClick={() => {
                                setReviewingId(item.id);
                                setReviewAmount(String(item.amount));
                                setReviewNote('');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-black font-bold text-[11px] cursor-pointer"
                            >
                              بررسی
                            </button>
                          )}
                        </div>
                      </div>

                      {isReviewing && (
                        <div className="pt-2 border-t border-amber-300/40 dark:border-amber-500/20 grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div>
                            <label className="block text-[10px] text-slate-600 dark:text-[#AAA] mb-0.5">
                              مبلغ تایید نهایی (تومان):
                            </label>
                            <input
                              type="text"
                              dir="ltr"
                              value={reviewAmount}
                              onChange={(e) => setReviewAmount(e.target.value)}
                              className="w-full h-8 px-2.5 rounded-lg bg-white dark:bg-[#121212] border border-slate-300 dark:border-[#333] text-xs font-mono font-bold text-slate-900 dark:text-white"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-[10px] text-slate-600 dark:text-[#AAA] mb-0.5">
                              یادداشت مدیر (اختیاری):
                            </label>
                            <div className="flex gap-1.5">
                              <input
                                type="text"
                                value={reviewNote}
                                onChange={(e) => setReviewNote(e.target.value)}
                                placeholder="توضیحات..."
                                className="flex-1 h-8 px-2.5 rounded-lg bg-white dark:bg-[#121212] border border-slate-300 dark:border-[#333] text-xs text-slate-900 dark:text-white"
                              />
                              <button
                                type="button"
                                disabled={isProcessingReview}
                                onClick={() => handleApproveOrReject(item, 'approved')}
                                className="px-2.5 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>تایید</span>
                              </button>
                              <button
                                type="button"
                                disabled={isProcessingReview}
                                onClick={() => handleApproveOrReject(item, 'rejected')}
                                className="px-2.5 h-8 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>رد</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. Approved Active Adjustments Included in This Month */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-white">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-[#1DB954]" />
                <span>موارد تاییدشده قابل اعمال در حقوق {monthLabel}:</span>
              </span>
              <span className="text-[11px] font-mono text-slate-500 dark:text-[#888]">
                {toPersianDigits(unlinkedApproved.length)} مورد
              </span>
            </div>

            {isLoading ? (
              <div className="p-6 text-center text-xs text-slate-400">در حال بارگذاری...</div>
            ) : unlinkedApproved.length === 0 ? (
              <div className="p-5 text-center rounded-xl bg-slate-50 dark:bg-[#181818] border border-dashed border-slate-200 dark:border-[#2a2a2a] text-xs text-slate-400">
                هنوز پاداش یا کسری تاییدشده‌ای برای این ماه ثبت نشده است.
              </div>
            ) : (
              <div className="space-y-2">
                {unlinkedApproved.map((item) => {
                  const effAmount = Number(item.approved_amount ?? item.amount) || 0;
                  const isBonus = item.type === 'bonus';
                  return (
                    <div
                      key={item.id}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                        isBonus
                          ? 'bg-emerald-500/5 border-emerald-500/20'
                          : 'bg-rose-500/5 border-rose-500/20'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                              isBonus
                                ? 'bg-emerald-500/20 text-emerald-700 dark:text-[#1DB954]'
                                : 'bg-rose-500/20 text-rose-700 dark:text-rose-400'
                            }`}
                          >
                            {isBonus ? 'پاداش' : 'کسری'}
                          </span>
                          <span className="font-bold text-slate-900 dark:text-white">{item.title}</span>
                          <span className="text-[10px] text-slate-400">
                            ({item.source === 'self_request' ? 'درخواست همکار' : 'ثبت مدیریت'})
                          </span>
                        </div>
                        {(item.reason || item.manager_note) && (
                          <div className="text-[11px] text-slate-500 dark:text-[#888] mt-0.5 truncate">
                            {item.reason}
                            {item.manager_note ? ` • یادداشت مدیر: ${item.manager_note}` : ''}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`font-mono font-black ${
                            isBonus
                              ? 'text-emerald-600 dark:text-[#1DB954]'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {isBonus ? '+' : '-'} {formatNum(effAmount)} ت
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="حذف این مورد"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 4. Settled / Rejected History for this Month */}
          {otherItems.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-[#242424]">
              <span className="text-[11px] font-bold text-slate-500 dark:text-[#777]">
                موارد تسویه‌شده در فیش یا ردشده ({toPersianDigits(otherItems.length)}):
              </span>
              <div className="space-y-1">
                {otherItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#161616] border border-slate-200/70 dark:border-[#222] flex items-center justify-between text-[11px] text-slate-500"
                  >
                    <div className="flex items-center gap-2">
                      <span>{item.title}</span>
                      {item.payroll_slip_id ? (
                        <span className="px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-600 dark:text-blue-400 text-[10px] font-mono">
                          فیش SLIP-{toPersianDigits(item.payroll_slip_id)}
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-500 text-[10px]">
                          رد شده
                        </span>
                      )}
                    </div>
                    <span className="font-mono">
                      {formatNum(item.approved_amount ?? item.amount)} ت
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Negative Net Warning */}
          {rawProjectedNet < 0 && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                جمع مساعده و کسورات بیشتر از حقوق و پاداش است (تراز منفی:{' '}
                <strong className="font-mono">{formatNum(Math.abs(rawProjectedNet))} تومان</strong>).
              </span>
            </div>
          )}
        </div>

        {/* Footer Live Math Summary */}
        <div className="p-4 border-t border-slate-200 dark:border-[#202020] bg-slate-50 dark:bg-[#181818] flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div>
              <span className="text-slate-500 dark:text-[#888]">پاداش: </span>
              <span className="font-mono font-bold text-emerald-600 dark:text-[#1DB954]">
                +{formatNum(totalBonuses)} ت
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-[#888]">کسری: </span>
              <span className="font-mono font-bold text-rose-500">
                -{formatNum(totalDeductions)} ت
              </span>
            </div>
            {(baseSalary > 0 || commissionAmount > 0) && (
              <div className="border-r border-slate-300 dark:border-[#333] pr-3">
                <span className="text-slate-500 dark:text-[#888]">خالص تخمینی: </span>
                <span className="font-mono font-black text-slate-900 dark:text-white">
                  {formatNum(projectedNet)} تومان
                </span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-[#1DB954] dark:hover:bg-[#1ed760] text-white dark:text-black text-xs font-bold transition-colors cursor-pointer"
          >
            بستن و اعمال
          </button>
        </div>
      </div>
    </div>
  );
};
