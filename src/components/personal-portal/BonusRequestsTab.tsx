import React, { useState, useMemo } from 'react';
import {
  Award,
  Plus,
  Send,
  Trash2,
  Clock,
  CheckCircle2,
  XCircle,
  Lock,
  Info,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  FileCheck2,
} from 'lucide-react';
import {
  PayrollAdjustment,
  PayrollAdjustmentCategory,
  Personnel,
} from '../../types';
import {
  createPayrollAdjustment,
  deletePayrollAdjustment,
} from '../../api';
import {
  toPersianDigits,
  formatPersianDate,
  getTodayJalali,
  JALALI_MONTH_NAMES,
} from '../../utils';
import { ADJUSTMENT_CATEGORY_LABELS } from '../payroll/PayrollAdjustmentsModal';

interface BonusRequestsTabProps {
  currentPersonnel: Personnel | null;
  isAdmin: boolean;
  adjustments: PayrollAdjustment[];
  isLoading: boolean;
  onRefresh: () => Promise<void>;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const SELF_BONUS_CATEGORIES: Array<{ value: PayrollAdjustmentCategory; label: string }> = [
  { value: 'sales_bonus', label: 'پاداش فروش' },
  { value: 'overtime', label: 'اضافه‌کاری' },
  { value: 'other', label: 'سایر پاداش‌ها' },
];

export const BonusRequestsTab: React.FC<BonusRequestsTabProps> = ({
  currentPersonnel,
  isAdmin,
  adjustments,
  isLoading,
  onRefresh,
  showToast,
}) => {
  const todayJalali = getTodayJalali();

  // Permission check: can employee submit bonus self-requests?
  const canRequestBonus = Boolean(
    isAdmin ||
      currentPersonnel?.role === 'admin' ||
      currentPersonnel?.permissions?.can_request_bonus === true
  );

  // Form state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<PayrollAdjustmentCategory>('sales_bonus');
  const [amountInput, setAmountInput] = useState('');
  const [targetYear, setTargetYear] = useState<number>(todayJalali.jy);
  const [targetMonth, setTargetMonth] = useState<number>(todayJalali.jm);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filters
  const [typeFilter, setTypeFilter] = useState<'all' | 'bonus' | 'deduction'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [deletingId, setDeletingId] = useState<number | string | null>(null);

  const formatToman = (val: number | null | undefined) =>
    toPersianDigits((Number(val) || 0).toLocaleString('en-US'));

  const parsedAmount = Number(amountInput.replace(/[^0-9]/g, '')) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canRequestBonus) {
      showToast('دسترسی ثبت درخواست پاداش برای حساب شما فعال نیست.', 'error');
      return;
    }
    if (!title.trim()) {
      showToast('لطفاً عنوان پاداش را وارد نمایید.', 'error');
      return;
    }
    if (parsedAmount <= 0) {
      showToast('لطفاً مبلغ معتبری به تومان وارد کنید.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await createPayrollAdjustment({
        personnel_id: currentPersonnel?.id,
        personnel_name: currentPersonnel?.name,
        type: 'bonus',
        category,
        title: title.trim(),
        amount: parsedAmount,
        target_year: targetYear,
        target_month: targetMonth,
        reason: reason.trim() || undefined,
        source: 'self_request',
      });
      showToast('درخواست پاداش شما ثبت شد و در صف تایید مدیریت قرار گرفت.', 'success');
      setTitle('');
      setAmountInput('');
      setReason('');
      await onRefresh();
    } catch (err: any) {
      showToast(err.message || 'خطا در ثبت درخواست پاداش', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (adj: PayrollAdjustment) => {
    if (adj.source !== 'self_request' || adj.status !== 'pending' || adj.payroll_slip_id) {
      return;
    }
    setDeletingId(adj.id);
    try {
      await deletePayrollAdjustment(adj.id);
      showToast('درخواست پاداش حذف شد.', 'info');
      await onRefresh();
    } catch (err: any) {
      showToast(err.message || 'خطا در حذف درخواست پاداش', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  // Summary metrics
  const stats = useMemo(() => {
    let approvedBonuses = 0;
    let pendingBonuses = 0;
    let pendingCount = 0;
    let totalDeductions = 0;

    adjustments.forEach((adj) => {
      const eff = Number(adj.approved_amount ?? adj.amount) || 0;
      if (adj.type === 'bonus') {
        if (adj.status === 'approved') approvedBonuses += eff;
        if (adj.status === 'pending') {
          pendingBonuses += Number(adj.amount) || 0;
          pendingCount += 1;
        }
      } else if (adj.type === 'deduction' && adj.status === 'approved') {
        totalDeductions += eff;
      }
    });

    return { approvedBonuses, pendingBonuses, pendingCount, totalDeductions };
  }, [adjustments]);

  const filteredAdjustments = useMemo(() => {
    return adjustments.filter((adj) => {
      if (typeFilter !== 'all' && adj.type !== typeFilter) return false;
      if (statusFilter !== 'all' && adj.status !== statusFilter) return false;
      return true;
    });
  }, [adjustments, typeFilter, statusFilter]);

  return (
    <div className="space-y-6 text-right">
      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#161616] border border-slate-200 dark:border-[#262626] flex items-center justify-between shadow-xs">
          <div>
            <span className="text-xs text-slate-500 dark:text-[#888] block mb-1">جمع پاداش‌های تاییدشده:</span>
            <span className="text-lg font-black font-mono text-emerald-600 dark:text-[#1DB954]">
              + {formatToman(stats.approvedBonuses)} <span className="text-xs font-normal">تومان</span>
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-[#1DB954]/15 border border-emerald-500/20 text-emerald-600 dark:text-[#1DB954] flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#161616] border border-slate-200 dark:border-[#262626] flex items-center justify-between shadow-xs">
          <div>
            <span className="text-xs text-slate-500 dark:text-[#888] block mb-1">
              درخواست‌های در انتظار تایید ({toPersianDigits(stats.pendingCount)}):
            </span>
            <span className="text-lg font-black font-mono text-amber-600 dark:text-amber-400">
              {formatToman(stats.pendingBonuses)} <span className="text-xs font-normal">تومان</span>
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#161616] border border-slate-200 dark:border-[#262626] flex items-center justify-between shadow-xs">
          <div>
            <span className="text-xs text-slate-500 dark:text-[#888] block mb-1">جمع کسورات ثبت‌شده:</span>
            <span className="text-lg font-black font-mono text-rose-600 dark:text-rose-400">
              - {formatToman(stats.totalDeductions)} <span className="text-xs font-normal">تومان</span>
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center shrink-0">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Content Grid: Form (or Info Banner) + Records List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left / Top Column: Request Form or Read-Only Notice */}
        <div className="lg:col-span-1">
          {canRequestBonus ? (
            <form
              onSubmit={handleSubmit}
              className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#282828] rounded-2xl p-5 space-y-4 shadow-sm"
            >
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200 dark:border-[#222]">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 dark:bg-[#1DB954]/15 border border-emerald-500/25 text-emerald-600 dark:text-[#1DB954] flex items-center justify-center shrink-0">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900 dark:text-white">ثبت درخواست پاداش</h2>
                  <p className="text-[11px] text-slate-500 dark:text-[#888]">
                    پس از تایید مدیریت، در حقوق همان ماه محاسبه می‌شود
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-[#CCC] mb-1">
                    عنوان پاداش <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="مثلاً: پاداش توافق‌شده فروش ویژه"
                    maxLength={120}
                    required
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#181818] border border-slate-200 dark:border-[#2e2e2e] text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500 dark:focus:border-[#1DB954]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-[#CCC] mb-1">
                      دسته‌بندی
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as PayrollAdjustmentCategory)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#181818] border border-slate-200 dark:border-[#2e2e2e] text-xs font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500 cursor-pointer"
                    >
                      {SELF_BONUS_CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-[#CCC] mb-1">
                      مبلغ (تومان) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={amountInput}
                      onChange={(e) => setAmountInput(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="1000000"
                      required
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#181818] border border-slate-200 dark:border-[#2e2e2e] text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>
                </div>

                {parsedAmount > 0 && (
                  <div className="px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-[#1DB954]/10 border border-emerald-200 dark:border-[#1DB954]/25 text-[11px] font-mono font-bold text-emerald-700 dark:text-[#1DB954] flex items-center justify-between">
                    <span>مبلغ درخواستی:</span>
                    <span>{formatToman(parsedAmount)} تومان</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-[#CCC] mb-1">
                      مربوط به ماه
                    </label>
                    <select
                      value={targetMonth}
                      onChange={(e) => setTargetMonth(Number(e.target.value))}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#181818] border border-slate-200 dark:border-[#2e2e2e] text-xs font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500 cursor-pointer"
                    >
                      {JALALI_MONTH_NAMES.map((mName, idx) => (
                        <option key={idx + 1} value={idx + 1}>
                          {mName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-[#CCC] mb-1">
                      سال شمسی
                    </label>
                    <select
                      value={targetYear}
                      onChange={(e) => setTargetYear(Number(e.target.value))}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#181818] border border-slate-200 dark:border-[#2e2e2e] text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500 cursor-pointer"
                    >
                      {[todayJalali.jy - 1, todayJalali.jy, todayJalali.jy + 1].map((yr) => (
                        <option key={yr} value={yr}>
                          {toPersianDigits(yr)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-[#CCC] mb-1">
                    شرح و توضیحات (اختیاری)
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="جزئیات یا علت پاداش (حداکثر ۲۴۰ کاراکتر)..."
                    rows={3}
                    maxLength={240}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-[#181818] border border-slate-200 dark:border-[#2e2e2e] text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500 resize-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-[#1DB954] dark:hover:bg-[#1ed760] text-white dark:text-black text-xs font-black shadow-md shadow-emerald-600/20 dark:shadow-[#1DB954]/20 transition-all cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{isSubmitting ? 'در حال ارسال...' : 'ارسال درخواست پاداش به مدیریت'}</span>
              </button>
            </form>
          ) : (
            <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#282828] rounded-2xl p-5 space-y-3 shadow-sm">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-[#1f1f1f] border border-slate-200 dark:border-[#333] text-slate-500 dark:text-[#999] flex items-center justify-center shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900 dark:text-white">
                    امکان ثبت درخواست پاداش غیرفعال است
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-[#888]">
                    تنظیم‌شده توسط مدیریت سیستم
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-600 dark:text-[#A7A7A7] leading-relaxed bg-slate-50 dark:bg-[#181818] p-3 rounded-xl border border-slate-200 dark:border-[#262626]">
                ثبت مستقیم درخواست پاداش برای حساب کاربری شما فعال نشده است. با این حال، تمامی پاداش‌ها و کسوراتی که مدیریت برای شما ثبت می‌کند به صورت شفاف در جدول روبه‌رو قابل مشاهده است.
              </p>
            </div>
          )}
        </div>

        {/* Right / Main Column: Unified List of Self-Requests + Manager-Recorded Bonuses & Deductions */}
        <div className="lg:col-span-2 bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#282828] rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-[#222]">
            <div className="flex items-center gap-2.5">
              <Award className="w-5 h-5 text-emerald-600 dark:text-[#1DB954]" />
              <div>
                <h2 className="text-sm font-black text-slate-900 dark:text-white">
                  سوابق پاداش‌ها و کسورات شما
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-[#888]">
                  شامل درخواست‌های شما و موارد ثبت‌شده توسط مدیریت (فقط نمایشی)
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1e1e1e] dark:hover:bg-[#282828] text-xs font-bold text-slate-700 dark:text-[#CCC] transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>بروزرسانی</span>
            </button>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              {(['all', 'bonus', 'deduction'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTypeFilter(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    typeFilter === t
                      ? 'bg-emerald-600 text-white dark:bg-[#1DB954] dark:text-black'
                      : 'bg-slate-100 dark:bg-[#1c1c1c] text-slate-600 dark:text-[#999] hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {t === 'all' ? 'همه موارد' : t === 'bonus' ? 'پاداش‌ها' : 'کسورات'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {(['all', 'pending', 'approved', 'rejected'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer border ${
                    statusFilter === st
                      ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-black dark:border-white'
                      : 'bg-transparent text-slate-500 dark:text-[#888] border-slate-200 dark:border-[#2c2c2c] hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {st === 'all'
                    ? 'همه وضعیت‌ها'
                    : st === 'pending'
                    ? 'در انتظار تایید'
                    : st === 'approved'
                    ? 'تایید شده'
                    : 'رد شده'}
                </button>
              ))}
            </div>
          </div>

          {/* Records List */}
          {isLoading && adjustments.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">در حال دریافت اطلاعات...</div>
          ) : filteredAdjustments.length === 0 ? (
            <div className="py-12 text-center space-y-2 rounded-xl bg-slate-50 dark:bg-[#181818] border border-dashed border-slate-200 dark:border-[#2a2a2a]">
              <Info className="w-7 h-7 text-slate-400 mx-auto" />
              <p className="text-xs font-bold text-slate-600 dark:text-[#AAA]">
                هیچ پاداش یا کسری با این فیلتر یافت نشد.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAdjustments.map((adj) => {
                const isBonus = adj.type === 'bonus';
                const isManagerDirect = adj.source === 'manager_direct';
                const canDeleteThis =
                  adj.source === 'self_request' &&
                  adj.status === 'pending' &&
                  !adj.payroll_slip_id;
                const targetMonthNum = Number(adj.target_month);
                const monthName =
                  targetMonthNum >= 1 && targetMonthNum <= 12
                    ? JALALI_MONTH_NAMES[targetMonthNum - 1]
                    : toPersianDigits(adj.target_month ?? '-');
                const effAmount = adj.approved_amount ?? adj.amount;
                const amountChanged =
                  adj.status === 'approved' &&
                  adj.approved_amount !== null &&
                  adj.approved_amount !== undefined &&
                  Number(adj.approved_amount) !== Number(adj.amount);

                return (
                  <div
                    key={adj.id}
                    className={`p-4 rounded-xl border transition-colors ${
                      isBonus
                        ? 'bg-emerald-50/30 dark:bg-[#151d18] border-emerald-200/70 dark:border-[#1DB954]/20'
                        : 'bg-rose-50/30 dark:bg-[#1f1517] border-rose-200/70 dark:border-rose-500/20'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              isBonus
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-[#1DB954]/20 dark:text-[#1DB954]'
                                : 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'
                            }`}
                          >
                            {isBonus ? 'پاداش' : 'کسری'}
                          </span>

                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                              isManagerDirect
                                ? 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-[#252525] dark:text-[#CCC] dark:border-[#383838]'
                                : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/30'
                            }`}
                          >
                            {isManagerDirect ? 'ثبت مدیریت (فقط نمایشی)' : 'درخواست شما'}
                          </span>

                          {adj.category && ADJUSTMENT_CATEGORY_LABELS[adj.category] && (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/80 dark:bg-black/30 text-slate-600 dark:text-[#AAA] border border-slate-200 dark:border-[#333]">
                              {ADJUSTMENT_CATEGORY_LABELS[adj.category]}
                            </span>
                          )}

                          <span className="text-[11px] font-mono text-slate-500 dark:text-[#888]">
                            دوره: {monthName} {toPersianDigits(adj.target_year)}
                          </span>
                        </div>

                        <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                          {adj.title}
                        </h3>

                        {adj.reason && (
                          <p className="text-xs text-slate-600 dark:text-[#AAA] leading-relaxed">
                            {adj.reason}
                          </p>
                        )}

                        {adj.manager_note && (
                          <div className="mt-1.5 p-2 rounded-lg bg-white/80 dark:bg-black/30 border border-slate-200 dark:border-[#2c2c2c] text-[11px] text-slate-700 dark:text-[#CCC]">
                            <span className="font-bold text-emerald-700 dark:text-[#1DB954]">
                              یادداشت مدیریت{adj.reviewed_by ? ` (${adj.reviewed_by})` : ''}:{' '}
                            </span>
                            <span>{adj.manager_note}</span>
                          </div>
                        )}
                      </div>

                      {/* Right Side: Amount + Status + Action */}
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <div className="text-left">
                          <div
                            className={`text-sm sm:text-base font-black font-mono ${
                              isBonus
                                ? 'text-emerald-600 dark:text-[#1DB954]'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {isBonus ? '+' : '-'} {formatToman(effAmount)}{' '}
                            <span className="text-[10px] font-normal">تومان</span>
                          </div>
                          {amountChanged && (
                            <div className="text-[10px] text-slate-400 line-through font-mono">
                              درخواستی: {formatToman(adj.amount)} ت
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          {adj.status === 'approved' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>تایید شده</span>
                            </span>
                          ) : adj.status === 'rejected' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30">
                              <XCircle className="w-3 h-3" />
                              <span>رد شده</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                              <Clock className="w-3 h-3" />
                              <span>در انتظار تایید</span>
                            </span>
                          )}

                          {adj.payroll_slip_id ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30">
                              <FileCheck2 className="w-3 h-3" />
                              <span>لحاظ در فیش #{toPersianDigits(adj.payroll_slip_id)}</span>
                            </span>
                          ) : canDeleteThis ? (
                            <button
                              type="button"
                              onClick={() => handleDelete(adj)}
                              disabled={deletingId === adj.id}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-[10px] font-bold transition-colors cursor-pointer disabled:opacity-50"
                              title="لغو و حذف درخواست در انتظار بررسی"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>حذف</span>
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
                              <ShieldCheck className="w-3 h-3" />
                              <span>{isManagerDirect ? 'ثبت مدیریت' : 'ثبت نهایی'}</span>
                            </span>
                          )}
                        </div>

                        {adj.date_created && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            ثبت: {formatPersianDate(adj.date_created)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
