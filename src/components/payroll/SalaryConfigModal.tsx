import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Plus,
  Trash2,
  DollarSign,
  TrendingUp,
  Percent,
  Check,
  AlertCircle,
  Calculator,
  HelpCircle,
  Layers,
  ArrowRight,
  ShieldCheck,
  Package,
} from 'lucide-react';
import {
  Personnel,
  PersonnelSalaryConfig,
  SalaryType,
  CommissionModel,
  TieredCalculationMode,
  CommissionTier,
  BaseSalaryMinSalesBasis,
  BaseSalaryBelowTargetMode,
} from '../../types';
import { toPersianDigits } from '../../utils';

interface SalaryConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  personnel: Personnel | null;
  currentConfig?: PersonnelSalaryConfig | null;
  onSave: (config: PersonnelSalaryConfig) => Promise<void>;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const SalaryConfigModal: React.FC<SalaryConfigModalProps> = ({
  isOpen,
  onClose,
  personnel,
  currentConfig,
  onSave,
  showToast,
}) => {
  const [salaryType, setSalaryType] = useState<SalaryType>('fixed_plus_commission');
  const [baseSalary, setBaseSalary] = useState<string>('12000000');
  const [commissionModel, setCommissionModel] = useState<CommissionModel>('tiered');
  const [flatRatePercent, setFlatRatePercent] = useState<string>('5');
  const [tieredMode, setTieredMode] = useState<TieredCalculationMode>('marginal');
  const [tiers, setTiers] = useState<CommissionTier[]>([
    { from_amount: 0, to_amount: 50000000, rate_percent: 3 },
    { from_amount: 50000001, to_amount: 150000000, rate_percent: 5 },
    { from_amount: 150000001, to_amount: null, rate_percent: 8 },
  ]);
  const [minSalesTarget, setMinSalesTarget] = useState<string>('0');
  const [requireMinSalesForBaseSalary, setRequireMinSalesForBaseSalary] = useState<boolean>(false);
  const [baseSalaryMinSalesBasis, setBaseSalaryMinSalesBasis] = useState<BaseSalaryMinSalesBasis>('percentage_sales_amount');
  const [baseSalaryMinSalesAmount, setBaseSalaryMinSalesAmount] = useState<string>('0');
  const [baseSalaryMinUnitsCount, setBaseSalaryMinUnitsCount] = useState<string>('0');
  const [baseSalaryBelowTargetMode, setBaseSalaryBelowTargetMode] = useState<BaseSalaryBelowTargetMode>('zero');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState(false);

  // Live test simulation calculator state
  const [testSalesAmount, setTestSalesAmount] = useState<string>('120000000');
  const [testUnitItemsCount, setTestUnitItemsCount] = useState<string>('0');
  const [testUnitCommissionAmount, setTestUnitCommissionAmount] = useState<string>('0');

  useEffect(() => {
    if (currentConfig) {
      setSalaryType(currentConfig.salary_type || 'fixed_plus_commission');
      setBaseSalary(String(currentConfig.base_salary || 0));
      setCommissionModel(currentConfig.commission_model || 'tiered');
      setFlatRatePercent(String(currentConfig.flat_rate_percent || 5));
      setTieredMode(currentConfig.tiered_calculation_mode || 'marginal');
      if (Array.isArray(currentConfig.commission_tiers) && currentConfig.commission_tiers.length > 0) {
        setTiers(currentConfig.commission_tiers);
      }
      setMinSalesTarget(String(currentConfig.min_sales_target || 0));
      setRequireMinSalesForBaseSalary(Boolean(currentConfig.require_min_sales_for_base_salary));
      setBaseSalaryMinSalesBasis(currentConfig.base_salary_min_sales_basis || 'percentage_sales_amount');
      setBaseSalaryMinSalesAmount(String(currentConfig.base_salary_min_sales_amount || 0));
      setBaseSalaryMinUnitsCount(String(currentConfig.base_salary_min_units_count || 0));
      setBaseSalaryBelowTargetMode(currentConfig.base_salary_below_target_mode || 'zero');
      setIsActive(currentConfig.is_active !== false);
    } else if (personnel) {
      // New blank config - do not fabricate preset salary numbers
      setSalaryType('fixed_plus_commission');
      setBaseSalary('');
      setCommissionModel('tiered');
      setFlatRatePercent('5');
      setTieredMode('marginal');
      setTiers([
        { from_amount: 0, to_amount: 50000000, rate_percent: 3 },
        { from_amount: 50000001, to_amount: 150000000, rate_percent: 5 },
        { from_amount: 150000001, to_amount: null, rate_percent: 8 },
      ]);
      setMinSalesTarget('0');
      setRequireMinSalesForBaseSalary(false);
      setBaseSalaryMinSalesBasis('percentage_sales_amount');
      setBaseSalaryMinSalesAmount('0');
      setBaseSalaryMinUnitsCount('0');
      setBaseSalaryBelowTargetMode('zero');
      setIsActive(true);
    }
  }, [currentConfig, personnel]);


  if (!isOpen || !personnel) return null;

  // Formatting helpers
  const formatToman = (val: string | number) => {
    const num = Number(String(val).replace(/,/g, '')) || 0;
    return toPersianDigits(num.toLocaleString('en-US'));
  };

  const handleBaseSalaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    setBaseSalary(raw);
  };

  const handleMinTargetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    setMinSalesTarget(raw);
  };

  // Tiers manipulations
  const handleAddTier = () => {
    const lastTier = tiers[tiers.length - 1];
    const newFrom = lastTier && lastTier.to_amount ? lastTier.to_amount + 1 : (lastTier ? lastTier.from_amount + 50000000 : 0);
    setTiers([
      ...tiers,
      {
        from_amount: newFrom,
        to_amount: null,
        rate_percent: 10,
      },
    ]);
  };

  const handleUpdateTier = (index: number, field: keyof CommissionTier, value: any) => {
    const next = [...tiers];
    next[index] = { ...next[index], [field]: value };
    setTiers(next);
  };

  const handleRemoveTier = (index: number) => {
    if (tiers.length <= 1) {
      showToast('حداقل یک پله باید وجود داشته باشد', 'error');
      return;
    }
    setTiers(tiers.filter((_, i) => i !== index));
  };

  // Test simulation calculation (mirrors backend calculateBaseSalaryWithThreshold)
  const testSalesNum = Number(testSalesAmount.replace(/[^0-9]/g, '')) || 0;
  const testUnitsNum = Number(testUnitItemsCount.replace(/[^0-9]/g, '')) || 0;
  const testUnitCommNum = salaryType === 'fixed' ? 0 : Number(testUnitCommissionAmount.replace(/[^0-9]/g, '')) || 0;
  const configuredBaseNum = salaryType === 'commission' ? 0 : Number(baseSalary) || 0;

  // Base salary threshold simulation
  let testBaseNum = configuredBaseNum;
  let testBaseNote = '';
  let testBaseTargetMet = true;
  if (salaryType !== 'commission' && requireMinSalesForBaseSalary && configuredBaseNum > 0) {
    const minAmt = Number(baseSalaryMinSalesAmount.replace(/[^0-9]/g, '')) || 0;
    const minUnits = Number(baseSalaryMinUnitsCount.replace(/[^0-9]/g, '')) || 0;
    let ratio = 1;
    let met = true;

    if (baseSalaryMinSalesBasis === 'percentage_sales_amount' || baseSalaryMinSalesBasis === 'total_sales_amount') {
      met = minAmt <= 0 || testSalesNum >= minAmt;
      ratio = minAmt > 0 ? Math.min(1, Math.max(0, testSalesNum / minAmt)) : 1;
    } else if (baseSalaryMinSalesBasis === 'unit_sales_count' || baseSalaryMinSalesBasis === 'contracts_count') {
      met = minUnits <= 0 || testUnitsNum >= minUnits;
      ratio = minUnits > 0 ? Math.min(1, Math.max(0, testUnitsNum / minUnits)) : 1;
    } else if (baseSalaryMinSalesBasis === 'either_amount_or_units') {
      if (minAmt <= 0 && minUnits <= 0) {
        met = true;
        ratio = 1;
      } else {
        const amtMet = minAmt > 0 && testSalesNum >= minAmt;
        const unitMet = minUnits > 0 && testUnitsNum >= minUnits;
        met = amtMet || unitMet;
        const amtR = minAmt > 0 ? Math.min(1, Math.max(0, testSalesNum / minAmt)) : 0;
        const unitR = minUnits > 0 ? Math.min(1, Math.max(0, testUnitsNum / minUnits)) : 0;
        ratio = met ? 1 : Math.max(amtR, unitR);
      }
    } else if (baseSalaryMinSalesBasis === 'both_amount_and_units') {
      const amtMet = minAmt <= 0 || testSalesNum >= minAmt;
      const unitMet = minUnits <= 0 || testUnitsNum >= minUnits;
      met = amtMet && unitMet;
      const amtR = minAmt > 0 ? Math.min(1, Math.max(0, testSalesNum / minAmt)) : 1;
      const unitR = minUnits > 0 ? Math.min(1, Math.max(0, testUnitsNum / minUnits)) : 1;
      ratio = met ? 1 : minAmt > 0 && minUnits > 0 ? (amtR + unitR) / 2 : Math.min(amtR, unitR);
    }

    testBaseTargetMet = met;
    if (!met) {
      if (baseSalaryBelowTargetMode === 'prorata') {
        testBaseNum = Math.round(configuredBaseNum * ratio);
        testBaseNote = `کف حقوق ثابت محقق نشد (${toPersianDigits(Math.round(ratio * 100))}٪ پرداخت نسبی)`;
      } else {
        testBaseNum = 0;
        testBaseNote = 'کف حقوق ثابت محقق نشد (حقوق ثابت صفر شد)';
      }
    } else {
      testBaseNote = 'کف فروش جهت دریافت کامل حقوق ثابت محقق شد';
    }
  }

  let testPercentageCommissionNum = 0;
  let testExplanation = '';

  if (salaryType === 'fixed') {
    testPercentageCommissionNum = 0;
    testExplanation = 'حقوق ثابت (فاقد پورسانت فروش)';
  } else if (Number(minSalesTarget) > 0 && testSalesNum < Number(minSalesTarget)) {
    testPercentageCommissionNum = 0;
    testExplanation = `فروش درصدی به کف تعیین‌شده (${formatToman(minSalesTarget)} تومان) نرسیده است؛ پورسانت درصدی صفر می‌باشد.`;
  } else if (commissionModel === 'flat') {
    const r = Number(flatRatePercent) || 0;
    testPercentageCommissionNum = Math.round(testSalesNum * (r / 100));
    testExplanation = `${toPersianDigits(r)}٪ از حجم فروش درصدی (${formatToman(testSalesNum)} تومان) = ${formatToman(testPercentageCommissionNum)} تومان`;
  } else {
    // Tiered
    const sortedTiers = [...tiers].sort((a, b) => a.from_amount - b.from_amount);
    if (tieredMode === 'retroactive') {
      let matchedTier: CommissionTier | null = null;
      for (const t of sortedTiers) {
        if (testSalesNum >= t.from_amount) matchedTier = t;
      }
      if (matchedTier) {
        const r = Number(matchedTier.rate_percent) || 0;
        testPercentageCommissionNum = Math.round(testSalesNum * (r / 100));
        testExplanation = `عطف‌به‌ماسبق: فروش درصدی در پله (${toPersianDigits(matchedTier.rate_percent)}٪) قرار گرفته و کل فروش درصدی با این درصد محاسبه شد.`;
      } else {
        testPercentageCommissionNum = 0;
        testExplanation = 'فروش درصدی کمتر از پله اول است.';
      }
    } else {
      // Marginal
      let total = 0;
      const parts: string[] = [];
      for (const t of sortedTiers) {
        const bStart = t.from_amount;
        const bEnd = t.to_amount !== null && t.to_amount !== undefined ? Math.min(testSalesNum, t.to_amount) : testSalesNum;
        if (testSalesNum > bStart && bEnd > bStart) {
          const slice = bEnd - bStart;
          const earned = Math.round(slice * (t.rate_percent / 100));
          total += earned;
          parts.push(`${formatToman(slice)} ت × ${toPersianDigits(t.rate_percent)}٪ = ${formatToman(earned)} ت`);
        }
      }
      testPercentageCommissionNum = total;
      testExplanation = parts.length > 0 ? parts.join(' + ') : 'بدون پورسانت درصدی';
    }
  }

  const testTotalCommissionNum = testPercentageCommissionNum + testUnitCommNum;
  const testTotalPayable = testBaseNum + testTotalCommissionNum;

  const basisUsesAmount =
    baseSalaryMinSalesBasis === 'percentage_sales_amount' ||
    baseSalaryMinSalesBasis === 'total_sales_amount' ||
    baseSalaryMinSalesBasis === 'either_amount_or_units' ||
    baseSalaryMinSalesBasis === 'both_amount_and_units';

  const basisUsesCount =
    baseSalaryMinSalesBasis === 'unit_sales_count' ||
    baseSalaryMinSalesBasis === 'contracts_count' ||
    baseSalaryMinSalesBasis === 'either_amount_or_units' ||
    baseSalaryMinSalesBasis === 'both_amount_and_units';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload: PersonnelSalaryConfig = {
        id: currentConfig?.id,
        personnel_id: personnel.id,
        salary_type: salaryType,
        base_salary: salaryType === 'commission' ? 0 : Number(baseSalary) || 0,
        commission_model: commissionModel,
        flat_rate_percent: Number(flatRatePercent) || 0,
        tiered_calculation_mode: tieredMode,
        commission_tiers: tiers,
        min_sales_target: Number(minSalesTarget) || 0,
        require_min_sales_for_base_salary: salaryType === 'commission' ? false : requireMinSalesForBaseSalary,
        base_salary_min_sales_basis: baseSalaryMinSalesBasis,
        base_salary_min_sales_amount: Number(baseSalaryMinSalesAmount.replace(/[^0-9]/g, '')) || 0,
        base_salary_min_units_count: Number(baseSalaryMinUnitsCount.replace(/[^0-9]/g, '')) || 0,
        base_salary_below_target_mode: baseSalaryBelowTargetMode,
        is_active: isActive,
      };

      await onSave(payload);
      showToast(`حکم حقوق و پورسانت ${personnel.name} با موفقیت ذخیره شد`, 'success');
      onClose();
    } catch (err: any) {
      showToast(err.message || 'خطا در ذخیره حکم حقوقی', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#282828] rounded-2xl shadow-2xl overflow-hidden my-6 text-right">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-[#202020] bg-slate-50 dark:bg-[#181818]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-[#1DB954]/15 border border-emerald-500/20 dark:border-[#1DB954]/30 flex items-center justify-center text-emerald-600 dark:text-[#1DB954] flex-shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>تنظیم حکم حقوق و پورسانت</span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-[#1DB954]/20 dark:text-[#1DB954] font-normal">
                  {personnel.name}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-[#888]">
                تعیین حقوق ثابت، پورسانت پله‌ای یا درصدی بر مبنای قراردادهای ثبت‌شده
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              form="salary-config-form"
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-[#1DB954] dark:hover:bg-[#1ed760] text-white dark:text-black font-bold text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'در حال ذخیره‌سازی...' : 'ذخیره و فعال‌سازی حکم'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-[#252525] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form id="salary-config-form" onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* 1. Salary Type Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-[#CCCCCC] block">
              نوع ساختار حقوقی همکار:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {[
                {
                  id: 'fixed',
                  label: 'فقط حقوق ثابت',
                  desc: 'مبلغ مشخص ماهانه بدون پورسانت فروش',
                  icon: DollarSign,
                },
                {
                  id: 'commission',
                  label: 'فقط پورسانت',
                  desc: 'درصد از قراردادها بدون پایه ثابت',
                  icon: Percent,
                },
                {
                  id: 'fixed_plus_commission',
                  label: 'حقوق ثابت + پورسانت',
                  desc: 'پایه ثابت ماهانه به علاوه درصد قراردادها',
                  icon: TrendingUp,
                },
              ].map((opt) => {
                const isSelected = salaryType === opt.id;
                const OptIcon = opt.icon;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSalaryType(opt.id as SalaryType)}
                    className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50 text-emerald-950 border-emerald-500 dark:bg-[#1a2f20] dark:text-white dark:border-[#1DB954] shadow-sm'
                        : 'bg-slate-50 dark:bg-[#181818] border-slate-200 dark:border-[#282828] text-slate-600 dark:text-[#A7A7A7] hover:border-slate-300 dark:hover:border-[#383838]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-xs flex items-center gap-1.5">
                        <OptIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-[#1DB954]" />
                        <span>{opt.label}</span>
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-[#1DB954]" />}
                    </div>
                    <span className="text-[11px] opacity-80 leading-relaxed">{opt.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Base Salary (if not commission-only) */}
          {salaryType !== 'commission' && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#161616] border border-slate-200 dark:border-[#262626] space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-emerald-600 dark:text-[#1DB954]" />
                    <span>مبلغ حقوق ثابت ماهانه (پایه):</span>
                  </label>
                  <span className="text-xs font-mono font-bold text-emerald-600 dark:text-[#1DB954]">
                    {formatToman(baseSalary)} تومان
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={baseSalary ? Number(baseSalary).toLocaleString('en-US') : ''}
                    onChange={handleBaseSalaryChange}
                    placeholder="مثلاً: 15,000,000"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#1c1c1c] border border-slate-300 dark:border-[#333] text-slate-900 dark:text-white font-mono text-sm focus:outline-hidden focus:border-emerald-500 dark:focus:border-[#1DB954] text-left ltr"
                  />
                </div>
              </div>

              {/* Base Salary Minimum Sales Threshold */}
              <div className="pt-3 border-t border-slate-200 dark:border-[#262626] space-y-3">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={requireMinSalesForBaseSalary}
                    onChange={(e) => setRequireMinSalesForBaseSalary(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded accent-emerald-600 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-[#1DB954]" />
                      <span>شرط کف فروش برای دریافت حقوق ثابت</span>
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-[#888] block mt-0.5">
                      در صورت فعال بودن، پرداخت حقوق پایه مشروط به رسیدن به حداقل فروش درصدی، تعدادی یا ترکیبی در همان ماه خواهد بود.
                    </span>
                  </div>
                </label>

                {requireMinSalesForBaseSalary && (
                  <div className="p-3.5 rounded-xl bg-white dark:bg-[#1c1c1c] border border-emerald-500/25 dark:border-[#1DB954]/25 space-y-3.5 animate-in fade-in duration-150">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 dark:text-[#CCC] block">
                        مبنای سنجش کف فروش حقوق ثابت:
                      </label>
                      <select
                        value={baseSalaryMinSalesBasis}
                        onChange={(e) => setBaseSalaryMinSalesBasis(e.target.value as BaseSalaryMinSalesBasis)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#141414] border border-slate-300 dark:border-[#333] text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500 cursor-pointer"
                      >
                        <option value="percentage_sales_amount">بر اساس مبلغ فروش‌های درصدی</option>
                        <option value="total_sales_amount">بر اساس مبلغ کل فروش‌ها (درصدی + تعدادی)</option>
                        <option value="unit_sales_count">بر اساس تعداد کل اقلام فروش تعدادی (تاییدشده)</option>
                        <option value="contracts_count">بر اساس تعداد کل قراردادهای موفق</option>
                        <option value="either_amount_or_units">ترکیبی «یا» (تحقق کف مبلغ درصدی یا کف تعداد تعدادی)</option>
                        <option value="both_amount_and_units">ترکیبی «و» (تحقق هم‌زمان کف مبلغ درصدی و تعداد تعدادی)</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {basisUsesAmount && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-semibold text-slate-700 dark:text-[#CCC]">
                              {baseSalaryMinSalesBasis === 'total_sales_amount'
                                ? 'حداقل مبلغ کل فروش (تومان):'
                                : 'حداقل مبلغ فروش درصدی (تومان):'}
                            </label>
                            <span className="text-[10px] font-mono text-emerald-600 dark:text-[#1DB954] font-bold">
                              {formatToman(baseSalaryMinSalesAmount)} ت
                            </span>
                          </div>
                          <input
                            type="text"
                            value={baseSalaryMinSalesAmount ? Number(baseSalaryMinSalesAmount).toLocaleString('en-US') : ''}
                            onChange={(e) => setBaseSalaryMinSalesAmount(e.target.value.replace(/[^0-9]/g, ''))}
                            placeholder="مثلاً: 50,000,000"
                            className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#141414] border border-slate-300 dark:border-[#333] text-xs font-mono text-left ltr text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
                          />
                        </div>
                      )}

                      {basisUsesCount && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-semibold text-slate-700 dark:text-[#CCC]">
                              {baseSalaryMinSalesBasis === 'contracts_count'
                                ? 'حداقل تعداد قرارداد موفق:'
                                : 'حداقل تعداد اقلام تعدادی (تاییدشده):'}
                            </label>
                            <span className="text-[10px] font-mono text-emerald-600 dark:text-[#1DB954] font-bold">
                              {toPersianDigits(Number(baseSalaryMinUnitsCount) || 0)} عدد
                            </span>
                          </div>
                          <input
                            type="text"
                            value={baseSalaryMinUnitsCount}
                            onChange={(e) => setBaseSalaryMinUnitsCount(e.target.value.replace(/[^0-9]/g, ''))}
                            placeholder="مثلاً: 10"
                            className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#141414] border border-slate-300 dark:border-[#333] text-xs font-mono text-left ltr text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
                          />
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-[#CCC] block">
                        رفتار سیستم در صورت عدم تحقق کف فروش:
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <label
                          className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                            baseSalaryBelowTargetMode === 'zero'
                              ? 'bg-amber-50 border-amber-500 dark:bg-amber-500/10 dark:border-amber-400 text-slate-900 dark:text-white'
                              : 'bg-slate-50 dark:bg-[#141414] border-slate-200 dark:border-[#2a2a2a] text-slate-600 dark:text-[#999]'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 text-xs font-bold mb-0.5">
                            <input
                              type="radio"
                              name="base_below_mode"
                              checked={baseSalaryBelowTargetMode === 'zero'}
                              onChange={() => setBaseSalaryBelowTargetMode('zero')}
                              className="accent-emerald-600"
                            />
                            <span>صفر شدن حقوق ثابت</span>
                          </div>
                          <p className="text-[10px] opacity-80 leading-relaxed">
                            اگر کف فروش محقق نشود، حقوق ثابت در فیش صفر لحاظ می‌شود.
                          </p>
                        </label>

                        <label
                          className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                            baseSalaryBelowTargetMode === 'prorata'
                              ? 'bg-emerald-50 border-emerald-500 dark:bg-[#1a2e20] dark:border-[#1DB954] text-slate-900 dark:text-white'
                              : 'bg-slate-50 dark:bg-[#141414] border-slate-200 dark:border-[#2a2a2a] text-slate-600 dark:text-[#999]'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 text-xs font-bold mb-0.5">
                            <input
                              type="radio"
                              name="base_below_mode"
                              checked={baseSalaryBelowTargetMode === 'prorata'}
                              onChange={() => setBaseSalaryBelowTargetMode('prorata')}
                              className="accent-emerald-600"
                            />
                            <span>پرداخت نسبی (متناسب با درصد تحقق)</span>
                          </div>
                          <p className="text-[10px] opacity-80 leading-relaxed">
                            حقوق ثابت به نسبت درصد تحقق کف فروش محاسبه و پرداخت می‌شود.
                          </p>
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3. Commission Configuration (if salaryType has commission) */}
          {salaryType !== 'fixed' && (
            <div className="space-y-4 p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-[#161616] border border-slate-200 dark:border-[#282828]">
              <div className="border-b border-slate-200 dark:border-[#262626] pb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-[#1DB954]" />
                  <span>تنظیمات نحوه محاسبه پورسانت فروش</span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-[#888] mt-0.5">
                  پورسانت منحصراً بر اساس فاکتورها و قراردادهای موفق ثبت‌شده کارشناس در «گزارش‌های مذاکره» محاسبه می‌شود.
                </p>
              </div>

              {/* Commission Model Selector */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-[#CCC]">مدل درصددهی:</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCommissionModel('flat')}
                    className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
                      commissionModel === 'flat'
                        ? 'bg-emerald-50 text-emerald-950 border-emerald-500 dark:bg-[#1a2f20] dark:text-white dark:border-[#1DB954]'
                        : 'bg-white dark:bg-[#1c1c1c] border-slate-200 dark:border-[#2a2a2a] text-slate-600 dark:text-[#A7A7A7]'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-xs mb-1">
                      <span>درصد ثابت از کل فروش (Flat)</span>
                      {commissionModel === 'flat' && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-[#1DB954]" />}
                    </div>
                    <p className="text-[11px] opacity-75">یک درصد معین از کل مجموع قراردادهای ثبت‌شده</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCommissionModel('tiered')}
                    className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
                      commissionModel === 'tiered'
                        ? 'bg-emerald-50 text-emerald-950 border-emerald-500 dark:bg-[#1a2f20] dark:text-white dark:border-[#1DB954]'
                        : 'bg-white dark:bg-[#1c1c1c] border-slate-200 dark:border-[#2a2a2a] text-slate-600 dark:text-[#A7A7A7]'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-xs mb-1">
                      <span>محاسبه پله‌ای و تارگت‌محور (Tiered)</span>
                      {commissionModel === 'tiered' && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-[#1DB954]" />}
                    </div>
                    <p className="text-[11px] opacity-75">درصدهای متفاوت با افزایش حجم فروش در طول ماه</p>
                  </button>
                </div>
              </div>

              {/* A. If Flat Rate */}
              {commissionModel === 'flat' && (
                <div className="p-3.5 rounded-xl bg-white dark:bg-[#1c1c1c] border border-slate-200 dark:border-[#303030] space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-800 dark:text-white">درصد پورسانت ثابت:</label>
                    <span className="text-xs font-mono font-bold text-emerald-600 dark:text-[#1DB954]">
                      {toPersianDigits(flatRatePercent)} ٪
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={flatRatePercent}
                      onChange={(e) => setFlatRatePercent(e.target.value)}
                      placeholder="مثلاً: 5"
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#141414] border border-slate-300 dark:border-[#333] text-slate-900 dark:text-white font-mono text-sm focus:outline-hidden focus:border-emerald-500 dark:focus:border-[#1DB954] text-left ltr"
                    />
                    <span className="text-xs font-bold text-slate-500">درصد</span>
                  </div>
                </div>
              )}

              {/* B. If Tiered Rate */}
              {commissionModel === 'tiered' && (
                <div className="space-y-4">
                  {/* Tiered Calculation Mode Switcher */}
                  <div className="p-3.5 rounded-xl bg-white dark:bg-[#1c1c1c] border border-slate-200 dark:border-[#303030] space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-[#1DB954]" />
                        <span>نحوه رفتار سیستم هنگام صعود به پله بالاتر:</span>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <label
                        className={`p-3 rounded-lg border text-right cursor-pointer transition-all flex flex-col justify-between ${
                          tieredMode === 'retroactive'
                            ? 'bg-emerald-50 border-emerald-500 dark:bg-[#1a2e20] dark:border-[#1DB954] text-slate-900 dark:text-white font-bold'
                            : 'bg-slate-50 dark:bg-[#141414] border-slate-200 dark:border-[#282828] text-slate-600 dark:text-[#A7A7A7]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs flex items-center gap-1.5">
                            <input
                              type="radio"
                              name="tiered_mode"
                              checked={tieredMode === 'retroactive'}
                              onChange={() => setTieredMode('retroactive')}
                              className="accent-emerald-600"
                            />
                            <span>عطف‌به‌ماسبق (کل فروش)</span>
                          </span>
                        </div>
                        <p className="text-[11px] font-normal opacity-80 leading-relaxed">
                          با عبور از هر پله، درصد جدید بر روی <strong>کل حجم فروش ماه</strong> اعمال می‌شود (مشوق فروش‌های بزرگ).
                        </p>
                      </label>

                      <label
                        className={`p-3 rounded-lg border text-right cursor-pointer transition-all flex flex-col justify-between ${
                          tieredMode === 'marginal'
                            ? 'bg-emerald-50 border-emerald-500 dark:bg-[#1a2e20] dark:border-[#1DB954] text-slate-900 dark:text-white font-bold'
                            : 'bg-slate-50 dark:bg-[#141414] border-slate-200 dark:border-[#282828] text-slate-600 dark:text-[#A7A7A7]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs flex items-center gap-1.5">
                            <input
                              type="radio"
                              name="tiered_mode"
                              checked={tieredMode === 'marginal'}
                              onChange={() => setTieredMode('marginal')}
                              className="accent-emerald-600"
                            />
                            <span>پله‌ای مازاد (براکت)</span>
                          </span>
                        </div>
                        <p className="text-[11px] font-normal opacity-80 leading-relaxed">
                          درصد هر پله فقط بر روی <strong>مبلغ مازاد واقع در همان بازه</strong> اعمال می‌شود (روش استاندارد تصاعدی).
                        </p>
                      </label>
                    </div>
                  </div>

                  {/* Tiers List Editor */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 dark:text-white">جدول پله‌های فروش:</span>
                      <button
                        type="button"
                        onClick={handleAddTier}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>افزودن پله</span>
                      </button>
                    </div>

                    <div className="space-y-2">
                      {tiers.map((tier, idx) => (
                        <div
                          key={idx}
                          className="flex flex-wrap sm:flex-nowrap items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-[#1c1c1c] border border-slate-200 dark:border-[#2c2c2c]"
                        >
                          <div className="flex items-center gap-1 text-xs font-bold text-slate-400 w-12 shrink-0">
                            <span>پله {toPersianDigits(idx + 1)}:</span>
                          </div>

                          <div className="flex-1 min-w-[130px]">
                            <span className="text-[10px] text-slate-400 block mb-0.5">از مبلغ (تومان):</span>
                            <input
                              type="text"
                              value={tier.from_amount ? Number(tier.from_amount).toLocaleString('en-US') : '0'}
                              onChange={(e) => {
                                const val = Number(e.target.value.replace(/[^0-9]/g, '')) || 0;
                                handleUpdateTier(idx, 'from_amount', val);
                              }}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-[#141414] border border-slate-300 dark:border-[#333] text-xs font-mono text-left ltr text-slate-900 dark:text-white"
                            />
                          </div>

                          <div className="flex-1 min-w-[130px]">
                            <span className="text-[10px] text-slate-400 block mb-0.5">تا مبلغ (تومان):</span>
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                disabled={tier.to_amount === null}
                                value={tier.to_amount !== null ? Number(tier.to_amount).toLocaleString('en-US') : ''}
                                placeholder="بدون سقف (نامحدود)"
                                onChange={(e) => {
                                  const val = e.target.value ? Number(e.target.value.replace(/[^0-9]/g, '')) : null;
                                  handleUpdateTier(idx, 'to_amount', val);
                                }}
                                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-[#141414] border border-slate-300 dark:border-[#333] text-xs font-mono text-left ltr text-slate-900 dark:text-white disabled:opacity-50"
                              />
                              <button
                                type="button"
                                title={tier.to_amount === null ? 'تعیین سقف' : 'بدون سقف'}
                                onClick={() => handleUpdateTier(idx, 'to_amount', tier.to_amount === null ? 100000000 : null)}
                                className={`text-[10px] px-1.5 py-1 rounded shrink-0 font-bold border cursor-pointer ${
                                  tier.to_amount === null
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-[#1DB954]/20 dark:text-[#1DB954] border-emerald-300 dark:border-[#1DB954]/40'
                                    : 'bg-slate-100 dark:bg-[#252525] text-slate-600 dark:text-[#888] border-slate-200 dark:border-[#333]'
                                }`}
                              >
                                {tier.to_amount === null ? '∞ نامحدود' : 'سقف‌دار'}
                              </button>
                            </div>
                          </div>

                          <div className="w-24 shrink-0">
                            <span className="text-[10px] text-slate-400 block mb-0.5">درصد پورسانت:</span>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="100"
                                value={tier.rate_percent}
                                onChange={(e) => handleUpdateTier(idx, 'rate_percent', Number(e.target.value) || 0)}
                                className="w-full px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-[#141414] border border-slate-300 dark:border-[#333] text-xs font-mono text-left ltr text-slate-900 dark:text-white font-bold"
                              />
                              <span className="text-xs font-bold text-slate-400">٪</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveTier(idx)}
                            className="p-1.5 mt-4 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="حذف این پله"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Minimum Sales Target for Percentage Commission */}
              <div className="p-3.5 rounded-xl bg-white dark:bg-[#1c1c1c] border border-slate-200 dark:border-[#303030] space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-slate-800 dark:text-white flex items-center gap-1.5">
                    <span>کف فروش درصدی (حداقل فروش درصدی برای فعال شدن پورسانت درصدی):</span>
                  </label>
                  <span className="text-xs font-mono font-bold text-slate-500 dark:text-[#888] shrink-0">
                    {Number(minSalesTarget) > 0 ? `${formatToman(minSalesTarget)} تومان` : 'بدون کف (از ریال اول)'}
                  </span>
                </div>
                <input
                  type="text"
                  value={minSalesTarget ? Number(minSalesTarget).toLocaleString('en-US') : ''}
                  onChange={handleMinTargetChange}
                  placeholder="صفر به معنی فعال بودن پورسانت درصدی از ریال اول است"
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#141414] border border-slate-300 dark:border-[#333] text-slate-900 dark:text-white font-mono text-xs text-left ltr"
                />
                <p className="text-[10px] text-slate-500 dark:text-[#888]">
                  فروش‌های تعدادی در حجم فروش درصدی محاسبه نمی‌شوند و پورسانت تاییدشده آن‌ها جداگانه به فیش اضافه می‌شود.
                </p>
              </div>
            </div>
          )}

          {/* 4. Live Test Sandbox Simulator */}
          <div className="p-4 rounded-2xl bg-emerald-500/5 dark:bg-[#122416] border border-emerald-500/20 dark:border-[#1DB954]/25 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-1">
              <span className="text-xs font-bold text-emerald-800 dark:text-[#1DB954] flex items-center gap-1.5">
                <Calculator className="w-4 h-4" />
                <span>شبیه‌ساز و تست زنده فرمول حقوق و پورسانت:</span>
              </span>
              <span className="text-[11px] text-slate-500 dark:text-[#888]">مقادیر فرضی ماه را وارد و خروجی را مشاهده کنید</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <span className="text-[11px] text-slate-600 dark:text-[#aaa] block mb-1">فروش درصدی آزمایشی (تومان):</span>
                <input
                  type="text"
                  value={testSalesAmount ? Number(testSalesAmount).toLocaleString('en-US') : ''}
                  onChange={(e) => setTestSalesAmount(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#181818] border border-emerald-500/40 text-slate-900 dark:text-white font-mono text-xs text-left ltr"
                />
              </div>

              <div>
                <span className="text-[11px] text-slate-600 dark:text-[#aaa] block mb-1">
                  {baseSalaryMinSalesBasis === 'contracts_count' && requireMinSalesForBaseSalary
                    ? 'تعداد قرارداد موفق آزمایشی:'
                    : 'تعداد اقلام تعدادی تاییدشده:'}
                </span>
                <input
                  type="text"
                  value={testUnitItemsCount}
                  onChange={(e) => setTestUnitItemsCount(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#181818] border border-slate-300 dark:border-[#333] text-slate-900 dark:text-white font-mono text-xs text-left ltr"
                />
              </div>

              <div>
                <span className="text-[11px] text-slate-600 dark:text-[#aaa] block mb-1">پورسانت تعدادی تاییدشده (تومان):</span>
                <input
                  type="text"
                  disabled={salaryType === 'fixed'}
                  value={testUnitCommissionAmount ? Number(testUnitCommissionAmount).toLocaleString('en-US') : '0'}
                  onChange={(e) => setTestUnitCommissionAmount(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#181818] border border-slate-300 dark:border-[#333] text-slate-900 dark:text-white font-mono text-xs text-left ltr disabled:opacity-50"
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/75 dark:bg-[#181818]/80 border border-emerald-500/20 space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 dark:text-[#888]">حقوق ثابت اعمالی:</span>
                <div className="flex items-center gap-2 font-mono">
                  {!testBaseTargetMet && configuredBaseNum > 0 && (
                    <span className="line-through text-[11px] text-slate-400">{formatToman(configuredBaseNum)}</span>
                  )}
                  <span className={`font-bold ${!testBaseTargetMet ? 'text-amber-600 dark:text-amber-400' : 'text-slate-800 dark:text-white'}`}>
                    {formatToman(testBaseNum)} ت
                  </span>
                </div>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 dark:text-[#888]">پورسانت فروش درصدی:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-[#1DB954]">{formatToman(testPercentageCommissionNum)} ت</span>
              </div>
              {testUnitCommNum > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 dark:text-[#888] flex items-center gap-1">
                    <Package className="w-3 h-3 text-blue-500" />
                    <span>پورسانت فروش تعدادی:</span>
                  </span>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{formatToman(testUnitCommNum)} ت</span>
                </div>
              )}
              <div className="border-t border-slate-200 dark:border-[#282828] pt-1.5 flex justify-between text-xs font-bold">
                <span className="text-slate-900 dark:text-white">جمع کل پرداختی:</span>
                <span className="font-mono text-emerald-700 dark:text-[#1DB954]">{formatToman(testTotalPayable)} تومان</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-600 dark:text-[#999] bg-white/50 dark:bg-black/20 p-2.5 rounded-lg border border-slate-200/50 dark:border-white/5 leading-relaxed space-y-1">
              {testBaseNote && (
                <div className={!testBaseTargetMet ? 'text-amber-700 dark:text-amber-400 font-semibold' : 'text-emerald-700 dark:text-[#1DB954]'}>
                  <strong>وضعیت کف حقوق ثابت:</strong> {testBaseNote}
                </div>
              )}
              <div>
                <strong>فرمول پورسانت درصدی:</strong> {testExplanation}
              </div>
            </div>
          </div>

          {/* Active status checkbox */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="is_active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-600 accent-emerald-600"
            />
            <label htmlFor="is_active" className="text-xs font-semibold text-slate-700 dark:text-[#CCC] cursor-pointer">
              این حکم حقوقی فعال است و در محاسبات ماهانه اعمال شود.
            </label>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-200 dark:border-[#202020] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-[#333] text-slate-700 dark:text-[#BBB] hover:bg-slate-100 dark:hover:bg-[#202020] text-xs font-bold transition-colors cursor-pointer"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-[#1DB954] dark:hover:bg-[#1ed760] text-white dark:text-black font-bold text-xs shadow-lg shadow-emerald-600/20 dark:shadow-[#1DB954]/25 transition-all cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'در حال ذخیره‌سازی...' : 'ذخیره و فعال‌سازی حکم'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
