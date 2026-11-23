import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  TrendingUp,
  Wallet,
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  AlertTriangle,
  Package,
  Percent,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  ArrowLeftRight,
  Save,
  Plus,
  Trash2,
  Loader2,
} from 'lucide-react';
import {
  PayrollCalculateItem,
  PayrollContractItem,
  UnitCommissionItem,
  UnitItemReviewStatus,
} from '../../types';
import { reviewReportCommission } from '../../api';
import { toPersianDigits, formatPersianDate } from '../../utils';
import { ADJUSTMENT_CATEGORY_LABELS } from './PayrollAdjustmentsModal';

interface ContractsBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: PayrollCalculateItem | null;
  onReviewed?: () => Promise<void>;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

interface EditableUnitItemDraft {
  id: string;
  product_name: string;
  quantity: number;
  unit_commission: number;
  total_commission: number;
  status: UnitItemReviewStatus;
  approved_quantity: string;
  approved_unit_commission: string;
  manager_note: string;
}

interface ConvertRowDraft {
  product_name: string;
  quantity: string;
  unit_commission: string;
}

const getUnitStatusBadge = (status?: string | null) => {
  switch (status) {
    case 'approved':
      return {
        label: 'تایید شده',
        cls: 'bg-emerald-100 text-emerald-800 dark:bg-[#1DB954]/20 dark:text-[#1DB954] border-emerald-200 dark:border-[#1DB954]/30',
      };
    case 'partially_approved':
      return {
        label: 'تایید جزئی',
        cls: 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-400 border-blue-200 dark:border-blue-500/30',
      };
    case 'rejected':
      return {
        label: 'رد شده',
        cls: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400 border-rose-200 dark:border-rose-500/30',
      };
    default:
      return {
        label: 'در انتظار تایید',
        cls: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border-amber-300 dark:border-amber-500/30',
      };
  }
};

export const ContractsBreakdownModal: React.FC<ContractsBreakdownModalProps> = ({
  isOpen,
  onClose,
  item,
  onReviewed,
  showToast,
}) => {
  const [expandedContracts, setExpandedContracts] = useState<Record<string, boolean>>({});
  const [draftItemsByContract, setDraftItemsByContract] = useState<Record<string, EditableUnitItemDraft[]>>({});
  const [reviewNoteByContract, setReviewNoteByContract] = useState<Record<string, string>>({});
  const [savingContractId, setSavingContractId] = useState<string | null>(null);

  // Inline conversion state for percentage -> unit
  const [convertingContractId, setConvertingContractId] = useState<string | null>(null);
  const [convertRows, setConvertRows] = useState<ConvertRowDraft[]>([]);

  // Initialize/sync editable drafts whenever item changes
  useEffect(() => {
    if (!item || !Array.isArray(item.contracts_list)) return;

    const nextDrafts: Record<string, EditableUnitItemDraft[]> = {};
    const nextNotes: Record<string, string> = {};
    const nextExpanded: Record<string, boolean> = {};

    item.contracts_list.forEach((c) => {
      if (!c.id) return;
      if (c.commission_type === 'unit') {
        const rows = Array.isArray(c.unit_commission_items) ? c.unit_commission_items : [];
        nextDrafts[c.id] = rows.map((row: UnitCommissionItem, idx: number) => ({
          id: row.id || `item-${idx}`,
          product_name: row.product_name || '',
          quantity: Number(row.quantity) || 0,
          unit_commission: Number(row.unit_commission) || 0,
          total_commission: Number(row.total_commission) || 0,
          status: (row.status as UnitItemReviewStatus) || 'pending',
          approved_quantity: String(
            row.approved_quantity !== undefined && row.approved_quantity !== null
              ? row.approved_quantity
              : row.quantity || 0
          ),
          approved_unit_commission: String(
            row.approved_unit_commission !== undefined && row.approved_unit_commission !== null
              ? row.approved_unit_commission
              : row.unit_commission || 0
          ),
          manager_note: row.manager_note || '',
        }));
        nextNotes[c.id] = c.commission_review_note || '';
        // Auto-expand pending unit contracts so admin sees them immediately
        if (!c.manual_commission_status || c.manual_commission_status === 'pending') {
          nextExpanded[c.id] = true;
        }
      }
    });

    setDraftItemsByContract(nextDrafts);
    setReviewNoteByContract(nextNotes);
    setExpandedContracts((prev) => ({ ...nextExpanded, ...prev }));
  }, [item]);

  if (!isOpen || !item) return null;

  const formatToman = (val: number | null | undefined) => {
    return toPersianDigits((val || 0).toLocaleString('en-US'));
  };

  const config = item.salary_config;
  const breakdown = item.commission_breakdown;
  const thresholdBreakdown = item.base_salary_threshold_breakdown;
  const percentageSalesAmount =
    item.percentage_sales_amount !== undefined ? item.percentage_sales_amount : item.total_contracts_amount;
  const unitSalesAmount = Number(item.unit_sales_amount || 0);
  const percentageCommissionAmount =
    item.percentage_commission_amount !== undefined
      ? item.percentage_commission_amount
      : Math.max(0, Number(item.commission_amount || 0) - Number(item.unit_commission_amount || 0));
  const unitCommissionAmount = Number(item.unit_commission_amount || 0);
  const pendingUnitCount = Number(item.pending_unit_commissions_count || 0);
  const unitContractsCount = Number(item.unit_contracts_count || 0);
  const percentageContractsCount =
    item.percentage_contracts_count !== undefined
      ? item.percentage_contracts_count
      : Math.max(0, item.contracts_count - unitContractsCount);

  const toggleExpand = (contractId: string) => {
    setExpandedContracts((prev) => ({ ...prev, [contractId]: !prev[contractId] }));
  };

  const updateDraftRow = (
    contractId: string,
    rowIdx: number,
    patch: Partial<EditableUnitItemDraft>
  ) => {
    setDraftItemsByContract((prev) => {
      const list = [...(prev[contractId] || [])];
      if (!list[rowIdx]) return prev;
      list[rowIdx] = { ...list[rowIdx], ...patch };
      return { ...prev, [contractId]: list };
    });
  };

  const handleQuickUnitAction = async (
    contractId: string,
    action: 'approve_all' | 'reject_all'
  ) => {
    setSavingContractId(contractId);
    try {
      await reviewReportCommission(contractId, {
        commission_type: 'unit',
        action,
        commission_review_note: reviewNoteByContract[contractId] || undefined,
      });
      showToast?.(
        action === 'approve_all'
          ? 'تمامی ردیف‌های فروش تعدادی تایید شد'
          : 'تمامی ردیف‌های فروش تعدادی رد شد',
        'success'
      );
      await onReviewed?.();
    } catch (err: any) {
      showToast?.(err.message || 'خطا در ثبت وضعیت پورسانت تعدادی', 'error');
    } finally {
      setSavingContractId(null);
    }
  };

  const handleSaveGranularReview = async (contractId: string) => {
    const rows = draftItemsByContract[contractId] || [];
    if (rows.length === 0) {
      showToast?.('هیچ ردیف محصولی برای این قرارداد ثبت نشده است', 'error');
      return;
    }

    setSavingContractId(contractId);
    try {
      await reviewReportCommission(contractId, {
        commission_type: 'unit',
        items: rows.map((r) => ({
          id: r.id,
          product_name: r.product_name,
          quantity: r.quantity,
          unit_commission: r.unit_commission,
          status: r.status,
          approved_quantity: Math.max(0, Math.round(Number(r.approved_quantity.replace(/[^0-9]/g, '')) || 0)),
          approved_unit_commission: Math.max(
            0,
            Math.round(Number(r.approved_unit_commission.replace(/[^0-9]/g, '')) || 0)
          ),
          manager_note: r.manager_note.trim() || null,
        })),
        commission_review_note: (reviewNoteByContract[contractId] || '').trim() || null,
      });
      showToast?.('بررسی و مبالغ تاییدشده با موفقیت ذخیره شد', 'success');
      await onReviewed?.();
    } catch (err: any) {
      showToast?.(err.message || 'خطا در ذخیره بررسی قرارداد', 'error');
    } finally {
      setSavingContractId(null);
    }
  };

  const handleSwitchToPercentage = async (contractId: string) => {
    setSavingContractId(contractId);
    try {
      await reviewReportCommission(contractId, {
        commission_type: 'percentage',
      });
      showToast?.('نوع فروش این قرارداد به «فروش درصدی» تغییر یافت', 'success');
      await onReviewed?.();
    } catch (err: any) {
      showToast?.(err.message || 'خطا در تغییر نوع فروش', 'error');
    } finally {
      setSavingContractId(null);
    }
  };

  const openConvertToUnitForm = (contract: PayrollContractItem) => {
    setConvertingContractId(contract.id);
    setConvertRows([
      {
        product_name: (contract.contract_items || '').trim() || 'محصول / خدمت',
        quantity: '1',
        unit_commission: '',
      },
    ]);
  };

  const handleConfirmConvertToUnit = async (contractId: string) => {
    const validItems = convertRows
      .map((r) => ({
        product_name: r.product_name.trim(),
        quantity: Math.max(0, Math.round(Number(r.quantity.replace(/[^0-9]/g, '')) || 0)),
        unit_commission: Math.max(0, Math.round(Number(r.unit_commission.replace(/[^0-9]/g, '')) || 0)),
      }))
      .filter((r) => r.product_name && r.quantity > 0);

    if (validItems.length === 0) {
      showToast?.('لطفاً حداقل یک ردیف با نام محصول و تعداد معتبر وارد کنید', 'error');
      return;
    }

    setSavingContractId(contractId);
    try {
      await reviewReportCommission(contractId, {
        commission_type: 'unit',
        items: validItems.map((it) => ({
          product_name: it.product_name,
          quantity: it.quantity,
          unit_commission: it.unit_commission,
          status: 'approved',
          approved_quantity: it.quantity,
          approved_unit_commission: it.unit_commission,
        })),
      });
      setConvertingContractId(null);
      setConvertRows([]);
      showToast?.('قرارداد به «فروش تعدادی» تبدیل و تایید شد', 'success');
      await onReviewed?.();
    } catch (err: any) {
      showToast?.(err.message || 'خطا در تبدیل به فروش تعدادی', 'error');
    } finally {
      setSavingContractId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#282828] rounded-2xl shadow-2xl overflow-hidden my-6 text-right">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-[#202020] bg-slate-50 dark:bg-[#181818]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-[#1DB954]/15 border border-emerald-500/20 dark:border-[#1DB954]/30 flex items-center justify-center text-emerald-600 dark:text-[#1DB954] flex-shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                <span>ریز قراردادها، بررسی فروش تعدادی و فرمول محاسبه:</span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-[#1DB954]/20 dark:text-[#1DB954] font-bold">
                  {item.personnel_name}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-[#888]">
                بررسی قراردادهای درصدی و تایید یا اصلاح پورسانت اقلام تعدادی پیش از صدور فیش حقوقی
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
        <div className="p-4 sm:p-6 space-y-5 max-h-[78vh] overflow-y-auto">
          {/* Quick Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#181818] border border-slate-200 dark:border-[#262626]">
              <span className="text-[10px] text-slate-400 block mb-1">قراردادها:</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white block">
                {toPersianDigits(item.contracts_count)} قرارداد
              </span>
              {unitContractsCount > 0 && (
                <span className="text-[10px] text-slate-500 dark:text-[#888] block mt-0.5">
                  {toPersianDigits(percentageContractsCount)} درصدی | {toPersianDigits(unitContractsCount)} تعدادی
                </span>
              )}
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#181818] border border-slate-200 dark:border-[#262626]">
              <span className="text-[10px] text-slate-400 block mb-1">ارزش کل فروش:</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white font-mono block">
                {formatToman(item.total_contracts_amount)} ت
              </span>
              {unitSalesAmount > 0 && (
                <span className="text-[10px] text-slate-500 dark:text-[#888] font-mono block mt-0.5">
                  درصدی: {formatToman(percentageSalesAmount)}
                </span>
              )}
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#181818] border border-slate-200 dark:border-[#262626]">
              <span className="text-[10px] text-slate-400 block mb-1">حقوق پایه اعمالی:</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white font-mono block">
                {formatToman(item.base_salary_amount)} ت
              </span>
              {thresholdBreakdown?.threshold_active && !thresholdBreakdown.target_met && (
                <span className="text-[10px] text-amber-600 dark:text-amber-400 block mt-0.5">
                  از {formatToman(thresholdBreakdown.configured_base_salary)} ت
                </span>
              )}
            </div>

            <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-[#1DB954]/10 border border-emerald-200 dark:border-[#1DB954]/25">
              <span className="text-[10px] text-emerald-700 dark:text-[#1DB954] block mb-1">کل پورسانت:</span>
              <span className="text-sm font-bold text-emerald-600 dark:text-[#1DB954] font-mono block">
                {formatToman(item.commission_amount)} ت
              </span>
              {(unitCommissionAmount > 0 || unitContractsCount > 0) && (
                <span className="text-[10px] text-slate-500 dark:text-[#AAA] font-mono block mt-0.5">
                  درصدی {formatToman(percentageCommissionAmount)} + تعدادی {formatToman(unitCommissionAmount)}
                </span>
              )}
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#181818] border border-slate-200 dark:border-[#262626]">
              <span className="text-[10px] text-slate-400 block mb-1">پاداش / کسورات:</span>
              <div className="text-xs font-mono font-bold space-y-0.5">
                <span className="text-emerald-600 dark:text-[#1DB954] block">+ {formatToman(item.bonuses_amount)}</span>
                <span className="text-rose-500 block">- {formatToman(item.deductions_amount)}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#181818] border border-slate-200 dark:border-[#262626]">
              <span className="text-[10px] text-slate-400 block mb-1">مساعده کسرشده:</span>
              <span className="text-sm font-bold text-rose-500 font-mono block">
                - {formatToman(item.advances_deducted)} ت
              </span>
            </div>
          </div>

          {/* Base Salary Threshold Status Banner */}
          {thresholdBreakdown?.threshold_active && (
            <div
              className={`p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-2 text-xs ${
                thresholdBreakdown.target_met
                  ? 'bg-emerald-50 dark:bg-[#1DB954]/10 border-emerald-300 dark:border-[#1DB954]/30 text-emerald-900 dark:text-emerald-200'
                  : 'bg-amber-50 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/30 text-amber-900 dark:text-amber-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <ShieldCheck
                  className={`w-4 h-4 shrink-0 ${
                    thresholdBreakdown.target_met
                      ? 'text-emerald-600 dark:text-[#1DB954]'
                      : 'text-amber-600 dark:text-amber-400'
                  }`}
                />
                <div>
                  <span className="font-bold">وضعیت شرط کف فروش حقوق ثابت: </span>
                  <span>{thresholdBreakdown.note}</span>
                </div>
              </div>
              <div className="font-mono text-[11px] font-bold">
                پایه مصوب: {formatToman(thresholdBreakdown.configured_base_salary)} ت ⬅ اعمالی:{' '}
                {formatToman(thresholdBreakdown.applied_base_salary)} ت
              </div>
            </div>
          )}

          {/* Pending Unit Commissions Alert */}
          {pendingUnitCount > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/35 flex items-center gap-2.5 text-xs text-amber-900 dark:text-amber-200">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>
                تعداد <strong>{toPersianDigits(pendingUnitCount)}</strong> قرارداد فروش تعدادی در انتظار بررسی و تایید شماست.
                تا زمانی که ردیف‌های تعدادی تایید نشوند، پورسانت و تعداد اقلام آن‌ها در حقوق محاسبه نمی‌شود.
              </span>
            </div>
          )}

          {Number(item.pending_adjustments_count || 0) > 0 && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30 flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-300">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>
                <strong>{toPersianDigits(item.pending_adjustments_count || 0)}</strong> درخواست پاداش در انتظار بررسی برای این دوره وجود دارد که هنوز در خالص پرداختی لحاظ نشده است.
              </span>
            </div>
          )}

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
            ) : (
              <div className="space-y-3">
                {/* Percentage Commission Part */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 dark:text-[#DDD] flex items-center gap-1.5">
                      <Percent className="w-3.5 h-3.5 text-emerald-600 dark:text-[#1DB954]" />
                      <span>پورسانت فروش‌های درصدی (مبنا: {formatToman(percentageSalesAmount)} تومان):</span>
                    </span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-[#1DB954]">
                      {formatToman(percentageCommissionAmount)} تومان
                    </span>
                  </div>

                  {percentageSalesAmount === 0 ? (
                    <div className="text-[11px] text-slate-500 dark:text-[#888] bg-white dark:bg-[#1f1f1f] p-2.5 rounded-lg border border-slate-200 dark:border-[#303030]">
                      در این دوره فروش درصدی ثبت نشده است.
                    </div>
                  ) : breakdown?.reason === 'below_min_target' ? (
                    <div className="text-[11px] text-amber-600 dark:text-amber-400 bg-white dark:bg-[#1f1f1f] p-2.5 rounded-lg border border-amber-300/40">
                      حجم فروش درصدی ({formatToman(percentageSalesAmount)} ت) به کف فروش درصدی ({formatToman(breakdown.min_sales_target)} ت) نرسیده است.
                    </div>
                  ) : breakdown?.model === 'flat' ? (
                    <div className="text-xs font-mono bg-white dark:bg-[#1f1f1f] p-2.5 rounded-lg border border-slate-200 dark:border-[#333] text-slate-700 dark:text-[#CCC]">
                      درصد ثابت ({toPersianDigits(breakdown.rate_percent)}٪): {formatToman(percentageSalesAmount)} ت ×{' '}
                      {toPersianDigits(breakdown.rate_percent)}٪ ={' '}
                      <strong className="text-emerald-600 dark:text-[#1DB954]">
                        {formatToman(percentageCommissionAmount)} تومان
                      </strong>
                    </div>
                  ) : breakdown?.mode === 'retroactive' ? (
                    <div className="text-xs font-mono bg-white dark:bg-[#1f1f1f] p-2.5 rounded-lg border border-slate-200 dark:border-[#333] space-y-1 text-slate-700 dark:text-[#CCC]">
                      <div>
                        پله‌ای عطف‌به‌ماسبق — عبور از {formatToman(breakdown.applied_tier?.from_amount)} ت (نرخ{' '}
                        <strong className="text-emerald-600 dark:text-[#1DB954]">{toPersianDigits(breakdown.rate_percent)}٪</strong>)
                      </div>
                      <div className="border-t border-slate-200 dark:border-[#333] pt-1">
                        {formatToman(percentageSalesAmount)} ت × {toPersianDigits(breakdown.rate_percent)}٪ ={' '}
                        <strong className="text-emerald-600 dark:text-[#1DB954]">
                          {formatToman(percentageCommissionAmount)} تومان
                        </strong>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {breakdown?.applied_brackets?.map((b: any, bIdx: number) => (
                        <div
                          key={bIdx}
                          className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-lg bg-white dark:bg-[#1f1f1f] border border-slate-200 dark:border-[#333] font-mono text-xs"
                        >
                          <span className="text-slate-600 dark:text-[#BBB]">
                            پله {toPersianDigits(bIdx + 1)} (از {formatToman(b.from_amount)} تا{' '}
                            {b.to_amount ? formatToman(b.to_amount) : 'بی‌نهایت'}):
                          </span>
                          <span className="text-emerald-600 dark:text-[#1DB954] font-bold">
                            {formatToman(b.slice_amount)} ت × {toPersianDigits(b.rate_percent)}٪ = {formatToman(b.earned)} ت
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Unit Commission Part */}
                {(unitContractsCount > 0 || unitCommissionAmount > 0) && (
                  <div className="pt-2.5 border-t border-slate-200 dark:border-[#262626] flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-slate-700 dark:text-[#DDD] flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span>
                        پورسانت فروش‌های تعدادی تاییدشده ({toPersianDigits(item.approved_unit_items_count || 0)} قلم تاییدشده):
                      </span>
                    </span>
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                      {formatToman(unitCommissionAmount)} تومان
                    </span>
                  </div>
                )}

                {(unitContractsCount > 0 || unitCommissionAmount > 0) && (
                  <div className="pt-2 border-t border-slate-200 dark:border-[#262626] flex items-center justify-between text-xs font-black text-slate-900 dark:text-white">
                    <span>مجموع کل پورسانت (درصدی + تعدادی):</span>
                    <span className="font-mono text-emerald-600 dark:text-[#1DB954]">
                      {formatToman(item.commission_amount)} تومان
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Interactive Contracts List with Unit Commission Review */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-emerald-600 dark:text-[#1DB954]" />
              <span>فهرست قراردادهای بسته شده در این بازه ({toPersianDigits(item.contracts_count)} فقره):</span>
            </h3>

            {item.contracts_list.length === 0 ? (
              <div className="text-center p-4 rounded-xl bg-slate-50 dark:bg-[#181818] text-slate-500 text-xs">
                قراردادی در این بازه یافت نشد.
              </div>
            ) : (
              <div className="space-y-2.5">
                {item.contracts_list.map((c, cIdx) => {
                  const isUnit = c.commission_type === 'unit';
                  const isExpanded = Boolean(expandedContracts[c.id]);
                  const isSavingThis = savingContractId === c.id;
                  const statusBadge = isUnit ? getUnitStatusBadge(c.manual_commission_status) : null;
                  const draftRows = draftItemsByContract[c.id] || [];
                  const liveDraftApprovedSum = draftRows.reduce((sum, r) => {
                    if (r.status !== 'approved') return sum;
                    const q = Math.max(0, Math.round(Number(r.approved_quantity.replace(/[^0-9]/g, '')) || 0));
                    const u = Math.max(0, Math.round(Number(r.approved_unit_commission.replace(/[^0-9]/g, '')) || 0));
                    return sum + q * u;
                  }, 0);

                  return (
                    <div
                      key={c.id || cIdx}
                      className={`rounded-xl border overflow-hidden transition-colors ${
                        isUnit && (!c.manual_commission_status || c.manual_commission_status === 'pending')
                          ? 'border-amber-300 dark:border-amber-500/40 bg-amber-50/20 dark:bg-amber-500/5'
                          : 'border-slate-200 dark:border-[#282828] bg-white dark:bg-[#161616]'
                      }`}
                    >
                      {/* Contract Summary Row */}
                      <div className="p-3 sm:p-3.5 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                          <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                            {c.contract_number ? toPersianDigits(c.contract_number) : `قرارداد #${toPersianDigits(cIdx + 1)}`}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {formatPersianDate(c.contract_date)}
                          </span>

                          {/* Commission Type Badge */}
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                              isUnit
                                ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/30'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-[#1DB954]/15 dark:text-[#1DB954] dark:border-[#1DB954]/30'
                            }`}
                          >
                            {isUnit ? <Package className="w-3 h-3" /> : <Percent className="w-3 h-3" />}
                            <span>{isUnit ? 'فروش تعدادی' : 'فروش درصدی'}</span>
                          </span>

                          {statusBadge && (
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${statusBadge.cls}`}>
                              {statusBadge.label}
                            </span>
                          )}

                          {c.contract_items && (
                            <span className="text-[11px] text-slate-500 dark:text-[#999] truncate max-w-[220px]">
                              — {c.contract_items}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                          <div className="text-left">
                            <span className="font-mono font-bold text-xs text-slate-900 dark:text-white block">
                              {formatToman(c.contract_amount)} ت
                            </span>
                            {isUnit && (
                              <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 block">
                                پورسانت تاییدشده: {formatToman(c.effective_unit_commission ?? c.approved_commission_amount ?? 0)} ت
                              </span>
                            )}
                          </div>

                          {isUnit ? (
                            <button
                              type="button"
                              onClick={() => toggleExpand(c.id)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#222] dark:hover:bg-[#2a2a2a] text-slate-700 dark:text-white text-[11px] font-bold cursor-pointer transition-colors"
                            >
                              <span>{isExpanded ? 'بستن بررسی' : 'بررسی و تایید'}</span>
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={isSavingThis}
                              onClick={() =>
                                convertingContractId === c.id
                                  ? setConvertingContractId(null)
                                  : openConvertToUnitForm(c)
                              }
                              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 dark:bg-[#202020] dark:hover:bg-blue-500/15 text-slate-500 hover:text-blue-700 dark:text-[#999] dark:hover:text-blue-400 text-[10px] font-bold cursor-pointer transition-colors"
                              title="تغییر نوع این قرارداد از درصدی به تعدادی"
                            >
                              <ArrowLeftRight className="w-3 h-3" />
                              <span>تبدیل به تعدادی</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Inline Convert Percentage -> Unit Panel */}
                      {!isUnit && convertingContractId === c.id && (
                        <div className="p-3.5 border-t border-slate-200 dark:border-[#262626] bg-blue-50/40 dark:bg-blue-500/5 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-blue-800 dark:text-blue-300">
                              تبدیل قرارداد به فروش تعدادی (اقلام و پورسانت تاییدشده را وارد کنید):
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setConvertRows((prev) => [...prev, { product_name: '', quantity: '1', unit_commission: '' }])
                              }
                              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-600 text-white text-[10px] font-bold cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                              <span>افزودن ردیف</span>
                            </button>
                          </div>

                          <div className="space-y-2">
                            {convertRows.map((row, rIdx) => (
                              <div key={rIdx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                                <input
                                  type="text"
                                  value={row.product_name}
                                  onChange={(e) =>
                                    setConvertRows((prev) =>
                                      prev.map((x, i) => (i === rIdx ? { ...x, product_name: e.target.value } : x))
                                    )
                                  }
                                  placeholder="نام محصول / خدمت"
                                  className="sm:col-span-5 px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#141414] border border-slate-300 dark:border-[#333] text-xs text-slate-900 dark:text-white"
                                />
                                <input
                                  type="text"
                                  value={row.quantity}
                                  onChange={(e) =>
                                    setConvertRows((prev) =>
                                      prev.map((x, i) =>
                                        i === rIdx ? { ...x, quantity: e.target.value.replace(/[^0-9]/g, '') } : x
                                      )
                                    )
                                  }
                                  placeholder="تعداد"
                                  className="sm:col-span-2 px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#141414] border border-slate-300 dark:border-[#333] text-xs font-mono text-left ltr text-slate-900 dark:text-white"
                                />
                                <input
                                  type="text"
                                  value={row.unit_commission ? Number(row.unit_commission).toLocaleString('en-US') : ''}
                                  onChange={(e) =>
                                    setConvertRows((prev) =>
                                      prev.map((x, i) =>
                                        i === rIdx ? { ...x, unit_commission: e.target.value.replace(/[^0-9]/g, '') } : x
                                      )
                                    )
                                  }
                                  placeholder="پورسانت واحد (تومان)"
                                  className="sm:col-span-4 px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#141414] border border-slate-300 dark:border-[#333] text-xs font-mono text-left ltr text-slate-900 dark:text-white"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    convertRows.length > 1 && setConvertRows((prev) => prev.filter((_, i) => i !== rIdx))
                                  }
                                  disabled={convertRows.length <= 1}
                                  className="sm:col-span-1 p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 disabled:opacity-30 cursor-pointer flex justify-center"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>

                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setConvertingContractId(null)}
                              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-[#333] text-xs font-bold text-slate-600 dark:text-[#AAA] cursor-pointer"
                            >
                              انصراف
                            </button>
                            <button
                              type="button"
                              disabled={isSavingThis}
                              onClick={() => handleConfirmConvertToUnit(c.id)}
                              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                            >
                              {isSavingThis ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                              <span>ذخیره و تبدیل به تعدادی</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Expanded Admin Unit Commission Review Panel */}
                      {isUnit && isExpanded && (
                        <div className="p-3.5 border-t border-slate-200 dark:border-[#262626] bg-slate-50/70 dark:bg-[#131313] space-y-3">
                          {/* Quick Bulk Actions */}
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="text-[11px] text-slate-600 dark:text-[#AAA]">
                              پورسانت پیشنهادی کارشناس:{' '}
                              <strong className="font-mono text-slate-900 dark:text-white">
                                {formatToman(c.manual_commission_amount)} تومان
                              </strong>
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <button
                                type="button"
                                disabled={isSavingThis}
                                onClick={() => handleQuickUnitAction(c.id, 'approve_all')}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 dark:bg-[#1DB954] dark:hover:bg-[#1ed760] text-white dark:text-black text-[11px] font-bold cursor-pointer disabled:opacity-50"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>تایید همه ردیف‌ها</span>
                              </button>
                              <button
                                type="button"
                                disabled={isSavingThis}
                                onClick={() => handleQuickUnitAction(c.id, 'reject_all')}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-700 dark:text-rose-400 border border-rose-500/30 text-[11px] font-bold cursor-pointer disabled:opacity-50"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>رد همه</span>
                              </button>
                              <button
                                type="button"
                                disabled={isSavingThis}
                                onClick={() => handleSwitchToPercentage(c.id)}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-200/80 hover:bg-slate-300/80 dark:bg-[#222] dark:hover:bg-[#2c2c2c] text-slate-700 dark:text-[#CCC] text-[11px] font-bold cursor-pointer disabled:opacity-50"
                              >
                                <ArrowLeftRight className="w-3 h-3" />
                                <span>تبدیل به درصدی</span>
                              </button>
                            </div>
                          </div>

                          {/* Per-Item Editable Review Rows */}
                          <div className="space-y-2">
                            {draftRows.map((row, rIdx) => {
                              const appQty = Math.max(0, Math.round(Number(row.approved_quantity.replace(/[^0-9]/g, '')) || 0));
                              const appUnit = Math.max(0, Math.round(Number(row.approved_unit_commission.replace(/[^0-9]/g, '')) || 0));
                              const rowEffectiveTotal = row.status === 'approved' ? appQty * appUnit : 0;

                              return (
                                <div
                                  key={row.id || rIdx}
                                  className="p-2.5 rounded-xl bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2c2c2c] space-y-2"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                      <span className="font-bold text-xs text-slate-900 dark:text-white">
                                        {toPersianDigits(rIdx + 1)}. {row.product_name}
                                      </span>
                                      <span className="text-[10px] text-slate-500 dark:text-[#888] mr-2 font-mono">
                                        (پیشنهاد: {toPersianDigits(row.quantity)} × {formatToman(row.unit_commission)} ={' '}
                                        {formatToman(row.total_commission)} ت)
                                      </span>
                                    </div>

                                    {/* Status Toggle Buttons */}
                                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#121212] p-0.5 rounded-lg border border-slate-200 dark:border-[#2a2a2a]">
                                      {[
                                        { id: 'approved' as const, label: 'تایید', activeCls: 'bg-emerald-600 text-white dark:bg-[#1DB954] dark:text-black' },
                                        { id: 'rejected' as const, label: 'رد', activeCls: 'bg-rose-600 text-white' },
                                        { id: 'pending' as const, label: 'انتظار', activeCls: 'bg-amber-500 text-black' },
                                      ].map((st) => (
                                        <button
                                          key={st.id}
                                          type="button"
                                          onClick={() => updateDraftRow(c.id, rIdx, { status: st.id })}
                                          className={`px-2 py-1 rounded-md text-[10px] font-bold transition-colors cursor-pointer ${
                                            row.status === st.id
                                              ? st.activeCls
                                              : 'text-slate-500 dark:text-[#888] hover:text-slate-800 dark:hover:text-white'
                                          }`}
                                        >
                                          {st.label}
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                                    <div className="sm:col-span-2">
                                      <span className="text-[10px] text-slate-400 block mb-0.5">تعداد تاییدی:</span>
                                      <input
                                        type="text"
                                        disabled={row.status === 'rejected'}
                                        value={row.approved_quantity}
                                        onChange={(e) =>
                                          updateDraftRow(c.id, rIdx, {
                                            approved_quantity: e.target.value.replace(/[^0-9]/g, ''),
                                          })
                                        }
                                        className="w-full px-2 py-1 rounded-lg bg-slate-50 dark:bg-[#121212] border border-slate-300 dark:border-[#333] text-xs font-mono text-left ltr text-slate-900 dark:text-white disabled:opacity-40"
                                      />
                                    </div>

                                    <div className="sm:col-span-4">
                                      <span className="text-[10px] text-slate-400 block mb-0.5">پورسانت تاییدی هر واحد (تومان):</span>
                                      <input
                                        type="text"
                                        disabled={row.status === 'rejected'}
                                        value={
                                          row.approved_unit_commission
                                            ? Number(row.approved_unit_commission).toLocaleString('en-US')
                                            : ''
                                        }
                                        onChange={(e) =>
                                          updateDraftRow(c.id, rIdx, {
                                            approved_unit_commission: e.target.value.replace(/[^0-9]/g, ''),
                                          })
                                        }
                                        className="w-full px-2 py-1 rounded-lg bg-slate-50 dark:bg-[#121212] border border-slate-300 dark:border-[#333] text-xs font-mono text-left ltr text-slate-900 dark:text-white disabled:opacity-40"
                                      />
                                    </div>

                                    <div className="sm:col-span-4">
                                      <span className="text-[10px] text-slate-400 block mb-0.5">یادداشت مدیر برای ردیف (اختیاری):</span>
                                      <input
                                        type="text"
                                        value={row.manager_note}
                                        onChange={(e) => updateDraftRow(c.id, rIdx, { manager_note: e.target.value })}
                                        placeholder="علت اصلاح یا رد..."
                                        className="w-full px-2 py-1 rounded-lg bg-slate-50 dark:bg-[#121212] border border-slate-300 dark:border-[#333] text-xs text-slate-900 dark:text-white"
                                      />
                                    </div>

                                    <div className="sm:col-span-2 text-left pt-3 sm:pt-0">
                                      <span className="text-[10px] text-slate-400 block">جمع تاییدی:</span>
                                      <span
                                        className={`font-mono font-bold text-xs ${
                                          row.status === 'approved'
                                            ? 'text-emerald-600 dark:text-[#1DB954]'
                                            : 'text-slate-400'
                                        }`}
                                      >
                                        {formatToman(rowEffectiveTotal)} ت
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Contract-Level Note & Save Button */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                            <input
                              type="text"
                              value={reviewNoteByContract[c.id] || ''}
                              onChange={(e) =>
                                setReviewNoteByContract((prev) => ({ ...prev, [c.id]: e.target.value }))
                              }
                              placeholder="یادداشت کلی مدیریت برای این قرارداد (اختیاری)..."
                              className="flex-1 min-w-[200px] px-3 py-1.5 rounded-lg bg-white dark:bg-[#1a1a1a] border border-slate-300 dark:border-[#333] text-xs text-slate-900 dark:text-white"
                            />
                            <div className="flex items-center gap-2.5">
                              <span className="text-[11px] font-mono text-slate-600 dark:text-[#BBB]">
                                جمع تاییدی پیش‌نویس:{' '}
                                <strong className="text-emerald-600 dark:text-[#1DB954]">
                                  {formatToman(liveDraftApprovedSum)} ت
                                </strong>
                              </span>
                              <button
                                type="button"
                                disabled={isSavingThis}
                                onClick={() => handleSaveGranularReview(c.id)}
                                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 dark:bg-[#1DB954] dark:hover:bg-[#1ed760] text-white dark:text-black text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                              >
                                {isSavingThis ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Save className="w-3.5 h-3.5" />
                                )}
                                <span>ذخیره بررسی این قرارداد</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
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

          {/* Approved Bonuses & Deductions Section */}
          {Array.isArray(item.adjustments_list) && item.adjustments_list.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Award className="w-4 h-4 text-emerald-600 dark:text-[#1DB954]" />
                <span>پاداش‌ها و کسورات تاییدشده این ماه ({toPersianDigits(item.adjustments_list.length)} مورد):</span>
              </h3>
              <div className="space-y-1.5">
                {item.adjustments_list.map((adj, idx) => {
                  const isBonus = adj.type === 'bonus';
                  const effAmount = adj.approved_amount ?? adj.amount;
                  return (
                    <div
                      key={adj.id || idx}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-xs ${
                        isBonus
                          ? 'bg-emerald-500/5 border-emerald-500/20'
                          : 'bg-rose-500/5 border-rose-500/20'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                              isBonus
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-[#1DB954]/20 dark:text-[#1DB954]'
                                : 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'
                            }`}
                          >
                            {isBonus ? 'پاداش' : 'کسری'}
                          </span>
                          <span className="font-bold text-slate-800 dark:text-white">{adj.title}</span>
                          {adj.category && ADJUSTMENT_CATEGORY_LABELS[adj.category] && (
                            <span className="text-[10px] text-slate-400">
                              ({ADJUSTMENT_CATEGORY_LABELS[adj.category]})
                            </span>
                          )}
                        </div>
                        {adj.reason && (
                          <p className="text-[11px] text-slate-500 dark:text-[#888] mt-0.5 truncate">
                            {adj.reason}
                          </p>
                        )}
                      </div>
                      <span
                        className={`font-mono font-bold shrink-0 mr-2 ${
                          isBonus
                            ? 'text-emerald-600 dark:text-[#1DB954]'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {isBonus ? '+' : '-'} {formatToman(effAmount)} تومان
                      </span>
                    </div>
                  );
                })}
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
