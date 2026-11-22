import React, { useState, useMemo } from 'react';
import {
  Award,
  Plus,
  Minus,
  Check,
  X,
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  Trash2,
  RefreshCw,
  Shield,
  Calendar,
  FileText,
} from 'lucide-react';
import {
  PayrollAdjustment,
  PayrollAdjustmentCategory,
  PayrollAdjustmentType,
  Personnel,
} from '../../types';
import {
  createPayrollAdjustment,
  updatePayrollAdjustment,
  deletePayrollAdjustment,
} from '../../api';
import { toPersianDigits, formatPersianDate, JALALI_MONTH_NAMES, isPersonnelActive } from '../../utils';
import { ADJUSTMENT_CATEGORY_LABELS } from './PayrollAdjustmentsModal';

interface PayrollAdjustmentsTabProps {
  adjustments: PayrollAdjustment[];
  personnelList: Personnel[];
  selectedYear: number;
  selectedMonth: number;
  isLoading: boolean;
  onRefresh: () => Promise<void>;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const PayrollAdjustmentsTab: React.FC<PayrollAdjustmentsTabProps> = ({
  adjustments,
  personnelList,
  selectedYear,
  selectedMonth,
  isLoading,
  onRefresh,
  showToast,
}) => {
  // Filters
  const [typeFilter, setTypeFilter] = useState<'all' | 'bonus' | 'deduction'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [periodFilter, setPeriodFilter] = useState<'selected_month' | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Direct Create Form State
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formPersonnelId, setFormPersonnelId] = useState<string>('');
  const [formType, setFormType] = useState<PayrollAdjustmentType>('bonus');
  const [formCategory, setFormCategory] = useState<PayrollAdjustmentCategory>('sales_bonus');
  const [formTitle, setFormTitle] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formYear, setFormYear] = useState<number>(selectedYear);
  const [formMonth, setFormMonth] = useState<number>(selectedMonth);
  const [formReason, setFormReason] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Review Modal State
  const [reviewingItem, setReviewingItem] = useState<PayrollAdjustment | null>(null);
  const [reviewAction, setReviewAction] = useState<'approved' | 'rejected'>('approved');
  const [reviewApprovedAmount, setReviewApprovedAmount] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const activePersonnel = useMemo(
    () => personnelList.filter((p) => isPersonnelActive(p)),
    [personnelList]
  );

  const formatNum = (val: number | null | undefined) =>
    toPersianDigits((val || 0).toLocaleString('en-US'));

  const pendingCount = useMemo(
    () => adjustments.filter((a) => a.status === 'pending').length,
    [adjustments]
  );

  const filteredList = useMemo(() => {
    return adjustments.filter((item) => {
      if (typeFilter !== 'all' && item.type !== typeFilter) return false;
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (periodFilter === 'selected_month') {
        if (
          Number(item.target_year) !== selectedYear ||
          Number(item.target_month) !== selectedMonth
        ) {
          return false;
        }
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = item.personnel_name?.toLowerCase().includes(q);
        const matchTitle = item.title?.toLowerCase().includes(q);
        const matchReason = item.reason?.toLowerCase().includes(q);
        if (!matchName && !matchTitle && !matchReason) return false;
      }
      return true;
    });
  }, [adjustments, typeFilter, statusFilter, periodFilter, selectedYear, selectedMonth, searchQuery]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPersonnelId) {
      showToast('لطفاً همکار مورد نظر را انتخاب کنید.', 'error');
      return;
    }
    const numAmount = Number(formAmount.replace(/[^0-9]/g, ''));
    if (!formTitle.trim() || !numAmount || numAmount <= 0) {
      showToast('عنوان و مبلغ معتبر الزامی است.', 'error');
      return;
    }

    const targetP = personnelList.find((p) => String(p.id) === String(formPersonnelId));
    setIsCreating(true);
    try {
      await createPayrollAdjustment({
        personnel_id: formPersonnelId,
        personnel_name: targetP?.name,
        type: formType,
        category: formCategory,
        title: formTitle.trim(),
        amount: numAmount,
        target_year: formYear,
        target_month: formMonth,
        reason: formReason.trim(),
        source: 'manager_direct',
      });
      showToast(
        `${formType === 'bonus' ? 'پاداش' : 'کسری'} با موفقیت ثبت و تایید شد.`,
        'success'
      );
      setFormTitle('');
      setFormAmount('');
      setFormReason('');
      setShowCreateForm(false);
      await onRefresh();
    } catch (err: any) {
      showToast(err.message || 'خطا در ثبت رکورد', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleConfirmReview = async () => {
    if (!reviewingItem) return;
    setIsSubmittingReview(true);
    try {
      const approvedNum =
        reviewAction === 'approved'
          ? Number((reviewApprovedAmount || String(reviewingItem.amount)).replace(/[^0-9]/g, '')) ||
            reviewingItem.amount
          : null;

      await updatePayrollAdjustment(reviewingItem.id, {
        status: reviewAction,
        approved_amount: approvedNum,
        manager_note: reviewNote.trim() || undefined,
      });
      showToast(
        reviewAction === 'approved'
          ? `درخواست پاداش ${reviewingItem.personnel_name} تایید شد.`
          : `درخواست پاداش ${reviewingItem.personnel_name} رد شد.`,
        'success'
      );
      setReviewingItem(null);
      setReviewNote('');
      setReviewApprovedAmount('');
      await onRefresh();
    } catch (err: any) {
      showToast(err.message || 'خطا در ثبت تصمیم مدیریت', 'error');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleDelete = async (item: PayrollAdjustment) => {
    if (!window.confirm(`آیا از حذف «${item.title}» اطمینان دارید؟`)) return;
    try {
      await deletePayrollAdjustment(item.id);
      showToast('ردیف با موفقیت حذف شد.', 'success');
      await onRefresh();
    } catch (err: any) {
      showToast(err.message || 'خطا در حذف رکورد', 'error');
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#161616] border border-slate-200 dark:border-[#262626] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-600 dark:text-[#1DB954]" />
              <span>کارتابل تایید پاداش‌ها و ثبت پاداش / کسری</span>
              {pendingCount > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold border border-amber-500/30">
                  {toPersianDigits(pendingCount)} درخواست در انتظار بررسی
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-500 dark:text-[#888] mt-0.5">
              درخواست‌های پاداش پرسنل را تایید یا رد کنید و یا مستقیماً پاداش و کسری جدید ثبت نمایید
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#222] dark:hover:bg-[#2a2a2a] text-xs font-bold text-slate-700 dark:text-[#CCC] cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>بروزرسانی</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setFormYear(selectedYear);
                setFormMonth(selectedMonth);
                if (!formPersonnelId && activePersonnel.length > 0) {
                  setFormPersonnelId(activePersonnel[0].id);
                }
                setShowCreateForm((prev) => !prev);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-[#1DB954] dark:hover:bg-[#1ed760] text-white dark:text-black text-xs font-bold shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>ثبت پاداش / کسری جدید</span>
            </button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-[#242424]">
          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#121212] p-1 rounded-xl border border-slate-200 dark:border-[#282828]">
            {(['all', 'pending', 'approved', 'rejected'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  statusFilter === st
                    ? st === 'pending'
                      ? 'bg-amber-500 text-black'
                      : st === 'approved'
                      ? 'bg-emerald-600 dark:bg-[#1DB954] text-white dark:text-black'
                      : st === 'rejected'
                      ? 'bg-rose-600 text-white'
                      : 'bg-white dark:bg-[#262626] text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-[#888] hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {st === 'all'
                  ? `همه (${toPersianDigits(adjustments.length)})`
                  : st === 'pending'
                  ? `در انتظار (${toPersianDigits(pendingCount)})`
                  : st === 'approved'
                  ? 'تایید شده'
                  : 'رد شده'}
              </button>
            ))}
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#121212] p-1 rounded-xl border border-slate-200 dark:border-[#282828]">
            {(['all', 'bonus', 'deduction'] as const).map((tp) => (
              <button
                key={tp}
                type="button"
                onClick={() => setTypeFilter(tp)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  typeFilter === tp
                    ? 'bg-white dark:bg-[#262626] text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-[#888]'
                }`}
              >
                {tp === 'all' ? 'همه انواع' : tp === 'bonus' ? 'فقط پاداش' : 'فقط کسری'}
              </button>
            ))}
          </div>

          {/* Period Filter */}
          <select
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value as 'all' | 'selected_month')}
            className="h-8 px-3 rounded-xl bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-[#2c2c2c] text-xs text-slate-800 dark:text-white"
          >
            <option value="all">همه ماه‌ها</option>
            <option value="selected_month">
              فقط {JALALI_MONTH_NAMES[selectedMonth - 1]} {toPersianDigits(selectedYear)}
            </option>
          </select>

          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو در نام همکار، عنوان یا توضیحات..."
              className="w-full h-8 pr-8 pl-3 rounded-xl bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-[#2c2c2c] text-xs text-slate-900 dark:text-white focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Collapsible Direct Create Form */}
      {showCreateForm && (
        <form
          onSubmit={handleCreateSubmit}
          className="p-5 rounded-2xl bg-white dark:bg-[#161616] border-2 border-emerald-500/30 dark:border-[#1DB954]/30 space-y-4 animate-in fade-in duration-150"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-[#262626] pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              ثبت مستقیم پاداش یا کسری توسط مدیریت
            </h3>
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-[#121212] p-1 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setFormType('bonus');
                  setFormCategory('sales_bonus');
                }}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                  formType === 'bonus'
                    ? 'bg-emerald-600 dark:bg-[#1DB954] text-white dark:text-black'
                    : 'text-slate-500 dark:text-[#888]'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>پاداش (+)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormType('deduction');
                  setFormCategory('delay');
                }}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                  formType === 'deduction'
                    ? 'bg-rose-600 text-white'
                    : 'text-slate-500 dark:text-[#888]'
                }`}
              >
                <Minus className="w-3.5 h-3.5" />
                <span>کسری (-)</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-[#AAA] mb-1">
                انتخاب همکار *
              </label>
              <select
                value={formPersonnelId}
                onChange={(e) => setFormPersonnelId(e.target.value)}
                required
                className="w-full h-9 px-3 rounded-xl bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-[#303030] text-xs text-slate-900 dark:text-white"
              >
                <option value="">-- انتخاب همکار --</option>
                {activePersonnel.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-[#AAA] mb-1">
                مبلغ (تومان) *
              </label>
              <input
                type="text"
                dir="ltr"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                placeholder="1000000"
                required
                className="w-full h-9 px-3 rounded-xl bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-[#303030] text-xs font-mono font-bold text-slate-900 dark:text-white"
              />
              {Number(formAmount.replace(/[^0-9]/g, '')) > 0 && (
                <span className="text-[10px] font-mono text-emerald-600 dark:text-[#1DB954]">
                  {formatNum(Number(formAmount.replace(/[^0-9]/g, '')))} تومان
                </span>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-[#AAA] mb-1">
                ماه حقوق هدف
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <select
                  value={formMonth}
                  onChange={(e) => setFormMonth(Number(e.target.value))}
                  className="h-9 px-2 rounded-xl bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-[#303030] text-xs text-slate-900 dark:text-white"
                >
                  {JALALI_MONTH_NAMES.map((mName, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      {mName}
                    </option>
                  ))}
                </select>
                <select
                  value={formYear}
                  onChange={(e) => setFormYear(Number(e.target.value))}
                  className="h-9 px-2 rounded-xl bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-[#303030] text-xs font-mono text-slate-900 dark:text-white"
                >
                  {[selectedYear - 1, selectedYear, selectedYear + 1].map((yr) => (
                    <option key={yr} value={yr}>
                      {toPersianDigits(yr)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-[#AAA] mb-1">
                دسته‌بندی
              </label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value as PayrollAdjustmentCategory)}
                className="w-full h-9 px-3 rounded-xl bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-[#303030] text-xs text-slate-900 dark:text-white"
              >
                {Object.entries(ADJUSTMENT_CATEGORY_LABELS).map(([k, lbl]) => (
                  <option key={k} value={k}>
                    {lbl}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-[#AAA] mb-1">
                عنوان (جهت چاپ در فیش حقوقی) *
              </label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder={
                  formType === 'bonus' ? 'مثلاً: پاداش فروش ویژه ماه' : 'مثلاً: کسر تاخیر و غیبت'
                }
                required
                className="w-full h-9 px-3 rounded-xl bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-[#303030] text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-[#AAA] mb-1">
                شرح و دلیل (قابل مشاهده توسط همکار)
              </label>
              <input
                type="text"
                value={formReason}
                onChange={(e) => setFormReason(e.target.value)}
                placeholder="توضیحات تکمیلی..."
                className="w-full h-9 px-3 rounded-xl bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-[#303030] text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#242424] text-xs font-bold text-slate-700 dark:text-white cursor-pointer"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className={`px-5 py-2 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50 ${
                formType === 'bonus'
                  ? 'bg-emerald-600 hover:bg-emerald-700 dark:bg-[#1DB954] dark:hover:bg-[#1ed760] text-white dark:text-black'
                  : 'bg-rose-600 hover:bg-rose-700 text-white'
              }`}
            >
              {isCreating
                ? 'در حال ثبت...'
                : formType === 'bonus'
                ? 'ثبت و تایید پاداش'
                : 'ثبت و اعمال کسری'}
            </button>
          </div>
        </form>
      )}

      {/* Adjustments Table */}
      <div className="bg-white dark:bg-[#161616] rounded-2xl border border-slate-200 dark:border-[#262626] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right">
            <thead className="bg-slate-50 dark:bg-[#1a1a1a] text-slate-500 dark:text-[#888] font-bold border-b border-slate-200 dark:border-[#282828]">
              <tr>
                <th className="p-3.5">همکار</th>
                <th className="p-3.5">نوع و منشأ</th>
                <th className="p-3.5">عنوان و توضیحات</th>
                <th className="p-3.5">ماه هدف</th>
                <th className="p-3.5">مبلغ</th>
                <th className="p-3.5">وضعیت</th>
                <th className="p-3.5 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#222]">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-slate-400">
                    هیچ رکورد پاداش یا کسری مطابق فیلتر انتخابی یافت نشد.
                  </td>
                </tr>
              ) : (
                filteredList.map((item) => {
                  const isBonus = item.type === 'bonus';
                  const effectiveAmt = Number(item.approved_amount ?? item.amount) || 0;
                  const monthStr =
                    item.target_month && item.target_year
                      ? `${JALALI_MONTH_NAMES[item.target_month - 1] || ''} ${toPersianDigits(item.target_year)}`
                      : item.effective_date
                      ? formatPersianDate(item.effective_date)
                      : '-';

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-[#1c1c1c] transition-colors"
                    >
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {item.personnel_name || 'همکار'}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          ثبت: {item.date_created ? formatPersianDate(item.date_created) : '-'}
                        </div>
                      </td>

                      <td className="p-3.5">
                        <div className="flex flex-col gap-1 items-start">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              isBonus
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-[#1DB954]/20 dark:text-[#1DB954]'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-400'
                            }`}
                          >
                            {isBonus ? '+ پاداش' : '- کسری'}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-[#888]">
                            {item.source === 'self_request' ? 'درخواست همکار' : 'ثبت مدیریت'}
                          </span>
                        </div>
                      </td>

                      <td className="p-3.5 max-w-xs">
                        <div className="font-bold text-slate-900 dark:text-white">{item.title}</div>
                        <div className="text-[10px] text-slate-400">
                          {ADJUSTMENT_CATEGORY_LABELS[item.category || 'other'] || 'سایر'}
                          {item.reason ? ` • ${item.reason}` : ''}
                        </div>
                        {item.manager_note && (
                          <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
                            یادداشت مدیر: {item.manager_note}
                          </div>
                        )}
                      </td>

                      <td className="p-3.5 font-mono text-slate-600 dark:text-[#CCC] whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{monthStr}</span>
                        </div>
                      </td>

                      <td className="p-3.5 font-mono whitespace-nowrap">
                        <div
                          className={`font-black ${
                            isBonus
                              ? 'text-emerald-600 dark:text-[#1DB954]'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {isBonus ? '+' : '-'} {formatNum(effectiveAmt)} ت
                        </div>
                        {item.approved_amount !== null &&
                          item.approved_amount !== undefined &&
                          item.approved_amount !== item.amount && (
                            <div className="text-[10px] text-slate-400 line-through">
                              درخواستی: {formatNum(item.amount)} ت
                            </div>
                          )}
                      </td>

                      <td className="p-3.5">
                        <div className="flex flex-col gap-1 items-start">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              item.status === 'approved'
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                                : item.status === 'rejected'
                                ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30'
                                : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30'
                            }`}
                          >
                            {item.status === 'approved' ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : item.status === 'rejected' ? (
                              <XCircle className="w-3 h-3" />
                            ) : (
                              <Clock className="w-3 h-3" />
                            )}
                            <span>
                              {item.status === 'approved'
                                ? 'تایید شده'
                                : item.status === 'rejected'
                                ? 'رد شده'
                                : 'در انتظار بررسی'}
                            </span>
                          </span>

                          {item.payroll_slip_id && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono">
                              <FileText className="w-2.5 h-2.5" />
                              SLIP-{toPersianDigits(item.payroll_slip_id)}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {item.status === 'pending' && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setReviewingItem(item);
                                  setReviewAction('approved');
                                  setReviewApprovedAmount(String(item.amount));
                                  setReviewNote('');
                                }}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 dark:bg-[#1DB954] dark:hover:bg-[#1ed760] text-white dark:text-black font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                              >
                                <Check className="w-3 h-3" />
                                <span>تایید</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setReviewingItem(item);
                                  setReviewAction('rejected');
                                  setReviewApprovedAmount(String(item.amount));
                                  setReviewNote('');
                                }}
                                className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                                <span>رد</span>
                              </button>
                            </>
                          )}

                          {!item.payroll_slip_id && (
                            <button
                              type="button"
                              onClick={() => handleDelete(item)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                              title="حذف"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Decision Modal */}
      {reviewingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#181818] border border-slate-200 dark:border-[#282828] w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4 text-right animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#282828] pb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-600 dark:text-[#1DB954]" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  {reviewAction === 'approved' ? 'تایید درخواست پاداش' : 'رد درخواست پاداش'}
                </h3>
              </div>
              <button
                onClick={() => setReviewingItem(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-[#242424] space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">همکار متقاضی:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {reviewingItem.personnel_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">عنوان:</span>
                <span className="font-bold text-slate-900 dark:text-white">{reviewingItem.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">مبلغ درخواستی:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-[#1DB954]">
                  {formatNum(reviewingItem.amount)} تومان
                </span>
              </div>
              {reviewingItem.reason && (
                <div className="pt-1 border-t border-slate-200 dark:border-[#242424] text-slate-600 dark:text-[#AAA]">
                  {reviewingItem.reason}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setReviewAction('approved')}
                className={`py-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 cursor-pointer ${
                  reviewAction === 'approved'
                    ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500'
                    : 'bg-slate-50 dark:bg-[#121212] text-slate-500 border-slate-200 dark:border-[#2c2c2c]'
                }`}
              >
                <Check className="w-4 h-4" />
                <span>تایید پاداش</span>
              </button>
              <button
                type="button"
                onClick={() => setReviewAction('rejected')}
                className={`py-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 cursor-pointer ${
                  reviewAction === 'rejected'
                    ? 'bg-rose-500/20 text-rose-700 dark:text-rose-400 border-rose-500'
                    : 'bg-slate-50 dark:bg-[#121212] text-slate-500 border-slate-200 dark:border-[#2c2c2c]'
                }`}
              >
                <X className="w-4 h-4" />
                <span>رد درخواست</span>
              </button>
            </div>

            {reviewAction === 'approved' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-[#BBB] mb-1">
                  مبلغ تایید نهایی (تومان):
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={reviewApprovedAmount}
                  onChange={(e) => setReviewApprovedAmount(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-[#303030] text-xs font-mono font-bold text-slate-900 dark:text-white"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#BBB] mb-1">
                یادداشت مدیر (اختیاری):
              </label>
              <textarea
                rows={2}
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="توضیحات جهت مشاهده همکار..."
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-[#303030] text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReviewingItem(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#242424] text-xs font-bold text-slate-700 dark:text-white cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleConfirmReview}
                disabled={isSubmittingReview}
                className={`px-5 py-2 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50 ${
                  reviewAction === 'approved'
                    ? 'bg-emerald-600 hover:bg-emerald-700 dark:bg-[#1DB954] dark:hover:bg-[#1ed760] text-white dark:text-black'
                    : 'bg-rose-600 hover:bg-rose-700 text-white'
                }`}
              >
                {isSubmittingReview ? 'در حال ثبت...' : 'ثبت تصمیم نهایی'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
