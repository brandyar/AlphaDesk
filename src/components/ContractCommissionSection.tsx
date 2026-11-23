import React from 'react';
import { Percent, PackagePlus, Plus, Trash2, Info, Calculator } from 'lucide-react';
import { ReportCommissionType } from '../types';
import { formatToman, toPersianDigits } from '../utils';

export interface UnitItemDraft {
  id: string;
  product_name: string;
  quantity: string;
  unit_commission: string;
}

export function createEmptyUnitItemDraft(): UnitItemDraft {
  return {
    id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    product_name: '',
    quantity: '1',
    unit_commission: '',
  };
}

export function parseUnitDraftsToPayload(drafts: UnitItemDraft[]) {
  const validItems: Array<{
    id: string;
    product_name: string;
    quantity: number;
    unit_commission: number;
    total_commission: number;
    status: 'pending';
  }> = [];

  for (const row of drafts) {
    const name = row.product_name.trim();
    const qty = parseInt(String(row.quantity || '').replace(/[^\d]/g, ''), 10);
    const unitComm = parseInt(String(row.unit_commission || '').replace(/[^\d]/g, ''), 10);
    if (!name || isNaN(qty) || qty <= 0 || isNaN(unitComm) || unitComm < 0) {
      continue;
    }
    validItems.push({
      id: row.id,
      product_name: name,
      quantity: qty,
      unit_commission: unitComm,
      total_commission: qty * unitComm,
      status: 'pending',
    });
  }
  return validItems;
}

interface ContractCommissionSectionProps {
  commissionType: ReportCommissionType;
  onCommissionTypeChange: (type: ReportCommissionType) => void;
  unitItems: UnitItemDraft[];
  onUnitItemsChange: (items: UnitItemDraft[]) => void;
  compact?: boolean;
}

export const ContractCommissionSection: React.FC<ContractCommissionSectionProps> = ({
  commissionType,
  onCommissionTypeChange,
  unitItems,
  onUnitItemsChange,
  compact = false,
}) => {
  const formatDigitsInput = (raw: string) => {
    const digits = raw.replace(/[^\d]/g, '');
    if (!digits) return '';
    return parseInt(digits, 10).toLocaleString('en-US');
  };

  const handleUpdateRow = (id: string, field: keyof UnitItemDraft, value: string) => {
    const next = unitItems.map((row) => {
      if (row.id !== id) return row;
      if (field === 'quantity') {
        const digits = value.replace(/[^\d]/g, '');
        return { ...row, quantity: digits };
      }
      if (field === 'unit_commission') {
        return { ...row, unit_commission: formatDigitsInput(value) };
      }
      return { ...row, [field]: value };
    });
    onUnitItemsChange(next);
  };

  const handleAddRow = () => {
    if (unitItems.length >= 30) return;
    onUnitItemsChange([...unitItems, createEmptyUnitItemDraft()]);
  };

  const handleRemoveRow = (id: string) => {
    if (unitItems.length <= 1) {
      onUnitItemsChange([createEmptyUnitItemDraft()]);
      return;
    }
    onUnitItemsChange(unitItems.filter((r) => r.id !== id));
  };

  const summary = unitItems.reduce(
    (acc, row) => {
      const qty = parseInt(String(row.quantity || '0').replace(/[^\d]/g, ''), 10) || 0;
      const unitComm = parseInt(String(row.unit_commission || '0').replace(/[^\d]/g, ''), 10) || 0;
      if (row.product_name.trim() && qty > 0) {
        acc.totalQty += qty;
        acc.totalComm += qty * unitComm;
      }
      return acc;
    },
    { totalQty: 0, totalComm: 0 }
  );

  return (
    <div className="pt-2.5 border-t border-emerald-200 dark:border-[#1DB954]/20 space-y-3">
      {/* Commission Type Selector */}
      <div>
        <label className="block text-[11px] font-bold text-slate-700 dark:text-[#B3B3B3] mb-1.5">
          نوع محاسبه پورسانت این فروش
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onCommissionTypeChange('percentage')}
            className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
              commissionType === 'percentage'
                ? 'bg-emerald-600/15 dark:bg-[#1DB954]/20 border-emerald-500 dark:border-[#1DB954] text-emerald-900 dark:text-white shadow-xs'
                : 'bg-white dark:bg-[#181818] border-slate-200 dark:border-[#2a2a2a] text-slate-600 dark:text-[#A7A7A7] hover:border-slate-300 dark:hover:border-[#3a3a3a]'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                commissionType === 'percentage'
                  ? 'bg-emerald-600 dark:bg-[#1DB954] text-white dark:text-black'
                  : 'bg-slate-100 dark:bg-[#252525] text-slate-500 dark:text-[#888]'
              }`}
            >
              <Percent className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-extrabold truncate">فروش درصدی</div>
              <div className="text-[10px] text-slate-500 dark:text-[#888] truncate">
                محاسبه در حجم فروش درصدی / پله‌ای
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              onCommissionTypeChange('unit');
              if (unitItems.length === 0) {
                onUnitItemsChange([createEmptyUnitItemDraft()]);
              }
            }}
            className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
              commissionType === 'unit'
                ? 'bg-amber-500/15 dark:bg-amber-500/20 border-amber-500 text-amber-950 dark:text-amber-200 shadow-xs'
                : 'bg-white dark:bg-[#181818] border-slate-200 dark:border-[#2a2a2a] text-slate-600 dark:text-[#A7A7A7] hover:border-slate-300 dark:hover:border-[#3a3a3a]'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                commissionType === 'unit'
                  ? 'bg-amber-500 text-black'
                  : 'bg-slate-100 dark:bg-[#252525] text-slate-500 dark:text-[#888]'
              }`}
            >
              <PackagePlus className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-extrabold truncate">فروش تعدادی / چندآیتمی</div>
              <div className="text-[10px] text-slate-500 dark:text-[#888] truncate">
                جدا از حجم درصدی • ثبت پورسانت هر محصول
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Multi-item unit sales entry */}
      {commissionType === 'unit' && (
        <div className="rounded-xl bg-white dark:bg-[#141414] border border-amber-400/40 dark:border-amber-500/30 p-3 space-y-3 animate-in fade-in duration-150">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-800 dark:text-amber-300">
              <Calculator className="w-3.5 h-3.5" />
              <span>اقلام فروش تعدادی و پورسانت پیشنهادی هر قلم</span>
            </div>
            <button
              type="button"
              onClick={handleAddRow}
              className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>افزودن ردیف محصول</span>
            </button>
          </div>

          <div className="space-y-2">
            {unitItems.map((row, idx) => {
              const qtyNum = parseInt(String(row.quantity || '0').replace(/[^\d]/g, ''), 10) || 0;
              const unitNum = parseInt(String(row.unit_commission || '0').replace(/[^\d]/g, ''), 10) || 0;
              const rowTotal = qtyNum * unitNum;

              return (
                <div
                  key={row.id}
                  className={`grid grid-cols-12 gap-2 items-end p-2.5 rounded-xl bg-slate-50 dark:bg-[#1c1c1c] border border-slate-200 dark:border-[#2a2a2a] ${
                    compact ? 'text-[11px]' : ''
                  }`}
                >
                  {/* Product Name */}
                  <div className="col-span-12 sm:col-span-5">
                    <label className="block text-[10px] font-semibold text-slate-600 dark:text-[#999] mb-1">
                      نام محصول / خدمت {toPersianDigits(idx + 1)} <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={row.product_name}
                      onChange={(e) => handleUpdateRow(row.id, 'product_name', e.target.value)}
                      placeholder="مثلاً: دستگاه کارتخوان مدل X"
                      className="w-full h-8.5 px-2.5 bg-white dark:bg-[#121212] border border-slate-300 dark:border-[#333] rounded-lg text-xs text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  {/* Quantity */}
                  <div className="col-span-4 sm:col-span-2">
                    <label className="block text-[10px] font-semibold text-slate-600 dark:text-[#999] mb-1">
                      تعداد <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      inputMode="numeric"
                      value={row.quantity}
                      onChange={(e) => handleUpdateRow(row.id, 'quantity', e.target.value)}
                      placeholder="1"
                      className="w-full h-8.5 px-2 bg-white dark:bg-[#121212] border border-slate-300 dark:border-[#333] rounded-lg text-xs text-center font-mono font-bold text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  {/* Unit Commission */}
                  <div className="col-span-6 sm:col-span-3">
                    <label className="block text-[10px] font-semibold text-slate-600 dark:text-[#999] mb-1">
                      پورسانت هر عدد (تومان) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      inputMode="numeric"
                      value={row.unit_commission}
                      onChange={(e) => handleUpdateRow(row.id, 'unit_commission', e.target.value)}
                      placeholder="500,000"
                      className="w-full h-8.5 px-2.5 bg-white dark:bg-[#121212] border border-slate-300 dark:border-[#333] rounded-lg text-xs font-mono font-bold text-left text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  {/* Row Total & Remove */}
                  <div className="col-span-2 sm:col-span-2 flex items-center justify-between sm:justify-end gap-1.5 h-8.5">
                    <div className="hidden sm:block text-left min-w-0">
                      <div className="text-[9px] text-slate-400 dark:text-[#777]">جمع ردیف</div>
                      <div className="text-[11px] font-mono font-extrabold text-emerald-700 dark:text-[#1DB954] truncate">
                        {toPersianDigits(rowTotal.toLocaleString('en-US'))}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(row.id)}
                      className="w-8 h-8 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                      title="حذف ردیف"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Mobile Row Total */}
                  <div className="col-span-12 sm:hidden flex items-center justify-between pt-1 border-t border-slate-200 dark:border-[#2a2a2a] text-[10px]">
                    <span className="text-slate-500 dark:text-[#888]">جمع پورسانت این ردیف:</span>
                    <span className="font-mono font-extrabold text-emerald-700 dark:text-[#1DB954]">
                      {formatToman(rowTotal)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Totals & Pending Approval Notice */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-amber-500/20">
            <div className="flex items-center gap-1.5 text-[10px] text-amber-800 dark:text-amber-300/90">
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span>این فروش در حجم فروش درصدی محاسبه نمی‌شود و پس از تایید مدیر در فیش حقوق لحاظ می‌گردد.</span>
            </div>
            <div className="flex items-center gap-3 shrink-0 bg-amber-500/10 dark:bg-amber-500/15 px-3 py-1.5 rounded-lg border border-amber-500/25">
              <div className="text-[10px] text-slate-600 dark:text-[#ccc]">
                جمع تعداد: <strong className="font-mono text-slate-900 dark:text-white">{toPersianDigits(summary.totalQty)}</strong>
              </div>
              <div className="w-px h-3.5 bg-amber-500/30" />
              <div className="text-[11px] font-extrabold text-amber-900 dark:text-amber-300 font-mono">
                جمع پورسانت: {formatToman(summary.totalComm)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
