import React, { useState, useEffect } from 'react';
import {
  WalletCards,
  Calendar,
  Calculator,
  RefreshCw,
  Plus,
  Edit2,
  FileText,
  DollarSign,
  TrendingUp,
  Percent,
  Wallet,
  CheckCircle2,
  Clock,
  Printer,
  ChevronDown,
  Search,
  Filter,
  Check,
  Building2,
  ShieldAlert,
  ArrowRight,
  Layers,
  Sparkles,
  AlertCircle,
  Eye,
  Trash2,
  Play,
  HelpCircle,
  AlertTriangle,
} from 'lucide-react';
import {
  Personnel,
  PersonnelSalaryConfig,
  PayrollSlip,
  PayrollCalculateItem,
  PayrollCalculateResponse,
} from '../types';
import {
  fetchSalaryConfigs,
  fetchSalaryConfig,
  saveSalaryConfig,
  calculatePayrollSimulation,
  fetchPayrollSlips,
  createPayrollSlip,
  updatePayrollSlip,
  deletePayrollSlip,
} from '../api';
import { SalaryConfigModal } from './payroll/SalaryConfigModal';
import { ContractsBreakdownModal } from './payroll/ContractsBreakdownModal';
import { PayrollSlipModal } from './payroll/PayrollSlipModal';
import {
  toPersianDigits,
  formatPersianDate,
  getTodayJalali,
  jalaliToGregorian,
  gregorianToJalali,
} from '../utils';

interface PayrollViewProps {
  personnelList: Personnel[];
  currentPersonnel: Personnel | null;
  isAdmin: boolean;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const JALALI_MONTH_NAMES = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

export const PayrollView: React.FC<PayrollViewProps> = ({
  personnelList,
  currentPersonnel,
  isAdmin,
  showToast,
}) => {
  // Shortened SubTabs: 'calculations' (محاسبه ماهانه), 'configs' (قرارداد پرسنل), 'slips' (آرشیو فیش‌ها)
  const [activeSubTab, setActiveSubTab] = useState<'calculations' | 'configs' | 'slips'>('calculations');

  // Month & Year Filter
  const todayJalali = getTodayJalali();
  const [selectedYear, setSelectedYear] = useState<number>(todayJalali.jy);
  const [selectedMonth, setSelectedMonth] = useState<number>(todayJalali.jm);

  // Data states
  const [isBulkCalculating, setIsBulkCalculating] = useState(false);
  const [calculatingPersonnelIds, setCalculatingPersonnelIds] = useState<Set<string>>(new Set());
  const [calculatedMap, setCalculatedMap] = useState<Record<string, PayrollCalculateItem>>({});
  const [salaryConfigs, setSalaryConfigs] = useState<PersonnelSalaryConfig[]>([]);
  const [payrollSlips, setPayrollSlips] = useState<PayrollSlip[]>([]);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'approved' | 'paid'>('all');

  // Modals state
  const [editingPersonnel, setEditingPersonnel] = useState<Personnel | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [selectedBreakdownItem, setSelectedBreakdownItem] = useState<PayrollCalculateItem | null>(null);
  const [isBreakdownModalOpen, setIsBreakdownModalOpen] = useState(false);
  const [viewingSlip, setViewingSlip] = useState<PayrollSlip | null>(null);
  const [isSlipModalOpen, setIsSlipModalOpen] = useState(false);

  // Mark Paid Dialog State
  const [payingSlip, setPayingSlip] = useState<PayrollSlip | null>(null);
  const [paymentRefInput, setPaymentRefInput] = useState('');
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);

  // Compute Gregorian Date Range from Jalali Month
  const getMonthDateRange = (jy: number, jm: number) => {
    const daysInMonth = jm <= 6 ? 31 : jm <= 11 ? 30 : 29;
    const gStart = jalaliToGregorian(jy, jm, 1);
    const gEnd = jalaliToGregorian(jy, jm, daysInMonth);

    const fromDate = `${gStart.gy}-${String(gStart.gm).padStart(2, '0')}-${String(gStart.gd).padStart(2, '0')}T00:00:00.000Z`;
    const toDate = `${gEnd.gy}-${String(gEnd.gm).padStart(2, '0')}-${String(gEnd.gd).padStart(2, '0')}T23:59:59.999Z`;

    return { fromDate, toDate };
  };

  // Load salary configs
  const loadConfigs = async () => {
    try {
      const configs = await fetchSalaryConfigs();
      setSalaryConfigs(configs);
    } catch (err: any) {
      console.warn('Configs load error:', err.message);
    }
  };

  // Load issued slips
  const loadSlips = async () => {
    try {
      const slips = await fetchPayrollSlips();
      setPayrollSlips(slips);
    } catch (err: any) {
      console.warn('Slips load error:', err.message);
    }
  };

  // Calculate for a single personnel (lightweight, on-demand)
  const handleCalculateSingle = async (personnelId: string) => {
    const cfg = salaryConfigs.find((c) => String(c.personnel_id) === String(personnelId) && c.is_active !== false);
    if (!cfg) {
      showToast('برای این همکار هنوز قرارداد حقوقی تعریف نشده است. ابتدا قرارداد را تعریف کنید.', 'info');
      const p = personnelList.find((x) => x.id === personnelId);
      if (p) {
        setEditingPersonnel(p);
        setIsConfigModalOpen(true);
      }
      return;
    }

    setCalculatingPersonnelIds((prev) => new Set(prev).add(personnelId));
    try {
      const { fromDate, toDate } = getMonthDateRange(selectedYear, selectedMonth);
      const res = await calculatePayrollSimulation({
        from_date: fromDate,
        to_date: toDate,
        personnel_id: personnelId,
      });

      if (res.items && res.items.length > 0) {
        const item = res.items[0];
        setCalculatedMap((prev) => ({
          ...prev,
          [personnelId]: item,
        }));
        showToast(`محاسبه حقوق ${item.personnel_name} با موفقیت انجام شد`, 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'خطا در محاسبه حقوق همکار', 'error');
    } finally {
      setCalculatingPersonnelIds((prev) => {
        const next = new Set(prev);
        next.delete(personnelId);
        return next;
      });
    }
  };

  // Bulk calculate for all personnel who have an active config
  const handleCalculateAll = async () => {
    setIsBulkCalculating(true);
    try {
      const { fromDate, toDate } = getMonthDateRange(selectedYear, selectedMonth);
      const res = await calculatePayrollSimulation({
        from_date: fromDate,
        to_date: toDate,
      });

      const nextMap: Record<string, PayrollCalculateItem> = {};
      res.items.forEach((item) => {
        nextMap[item.personnel_id] = item;
      });
      setCalculatedMap(nextMap);
      showToast(`محاسبه حقوق تمام پرسنل انجام شد (${toPersianDigits(res.items.length)} نفر)`, 'success');
    } catch (err: any) {
      showToast(err.message || 'خطا در محاسبه گروهی حقوق', 'error');
    } finally {
      setIsBulkCalculating(false);
    }
  };

  // Reload data when month changes
  useEffect(() => {
    setCalculatedMap({});
    loadConfigs();
    loadSlips();
  }, [selectedYear, selectedMonth]);

  // Helpers
  const formatToman = (val: number | null | undefined) => {
    return toPersianDigits((val || 0).toLocaleString('en-US'));
  };

  // Save Config handler
  const handleSaveConfig = async (config: PersonnelSalaryConfig) => {
    await saveSalaryConfig(config);
    await loadConfigs();
    // Auto recalculate that personnel if already in current view
    if (config.personnel_id) {
      handleCalculateSingle(config.personnel_id);
    }
  };

  // Finalize / Issue single slip
  const handleIssueSlip = async (item: PayrollCalculateItem) => {
    if (!item.has_config) {
      showToast('حکم حقوقی این همکار تعریف نشده است و امکان صدور فیش وجود ندارد.', 'error');
      return;
    }

    try {
      const { fromDate, toDate } = getMonthDateRange(selectedYear, selectedMonth);
      const payload: Partial<PayrollSlip> = {
        personnel_id: item.personnel_id,
        personnel_name: item.personnel_name,
        from_date: fromDate,
        to_date: toDate,
        base_salary_amount: item.base_salary_amount,
        total_contracts_amount: item.total_contracts_amount,
        contracts_count: item.contracts_count,
        commission_amount: item.commission_amount,
        advances_deducted: item.advances_deducted,
        bonuses_amount: item.bonuses_amount,
        deductions_amount: item.deductions_amount,
        net_payable: item.net_payable,
        calculation_breakdown: {
          salary_config: item.salary_config,
          commission_breakdown: item.commission_breakdown,
          contracts: item.contracts_list,
          advances: item.advances_list,
        },
        status: 'approved',
      };

      const created = await createPayrollSlip(payload);
      showToast(`فیش حقوقی برای ${item.personnel_name} با موفقیت صادر شد`, 'success');
      await loadSlips();
      setViewingSlip(Array.isArray(created) ? created[0] : (created as PayrollSlip));
      setIsSlipModalOpen(true);
    } catch (err: any) {
      showToast(err.message || 'خطا در صدور فیش حقوقی', 'error');
    }
  };

  // Issue all calculated slips
  const handleIssueCalculatedSlips = async () => {
    const calculatedItems = Object.values(calculatedMap).filter((item) => item.has_config);
    if (calculatedItems.length === 0) {
      showToast('هنوز هیچ همکاری محاسبه نشده است. ابتدا روی دکمه محاسبه کلیک کنید.', 'info');
      return;
    }

    const confirmMsg = `آیا از صدور قطعی فیش حقوقی برای ${toPersianDigits(calculatedItems.length)} نفر از پرسنل محاسبه‌شده در ماه ${JALALI_MONTH_NAMES[selectedMonth - 1]} اطمینان دارید؟`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const { fromDate, toDate } = getMonthDateRange(selectedYear, selectedMonth);
      const batchPayload: Partial<PayrollSlip>[] = calculatedItems.map((item) => ({
        personnel_id: item.personnel_id,
        personnel_name: item.personnel_name,
        from_date: fromDate,
        to_date: toDate,
        base_salary_amount: item.base_salary_amount,
        total_contracts_amount: item.total_contracts_amount,
        contracts_count: item.contracts_count,
        commission_amount: item.commission_amount,
        advances_deducted: item.advances_deducted,
        bonuses_amount: item.bonuses_amount,
        deductions_amount: item.deductions_amount,
        net_payable: item.net_payable,
        calculation_breakdown: {
          salary_config: item.salary_config,
          commission_breakdown: item.commission_breakdown,
          contracts: item.contracts_list,
          advances: item.advances_list,
        },
        status: 'approved',
      }));

      await createPayrollSlip(batchPayload);
      showToast(`فیش‌های حقوقی برای ${toPersianDigits(calculatedItems.length)} نفر صادر گردید`, 'success');
      await loadSlips();
      setActiveSubTab('slips');
    } catch (err: any) {
      showToast(err.message || 'خطا در صدور فیش‌ها', 'error');
    }
  };

  // Submit Mark Paid
  const handleConfirmPaid = async () => {
    if (!payingSlip) return;
    setIsMarkingPaid(true);
    try {
      await updatePayrollSlip(payingSlip.id, {
        status: 'paid',
        payment_date: new Date().toISOString(),
        payment_ref: paymentRefInput.trim() || undefined,
      });
      showToast('وضعیت فیش به «پرداخت شده» تغییر یافت', 'success');
      setPayingSlip(null);
      setPaymentRefInput('');
      await loadSlips();
    } catch (err: any) {
      showToast(err.message || 'خطا در ثبت واریز', 'error');
    } finally {
      setIsMarkingPaid(false);
    }
  };

  // Delete draft slip
  const handleDeleteSlip = async (id: number | string) => {
    if (!window.confirm('آیا از حذف این فیش حقوقی اطمینان دارید؟')) return;
    try {
      await deletePayrollSlip(id);
      showToast('فیش با موفقیت حذف گردید', 'success');
      await loadSlips();
    } catch (err: any) {
      showToast(err.message || 'خطا در حذف فیش', 'error');
    }
  };

  // Filtered personnel list for calculations
  const activePersonnelList = personnelList.filter((p) => p.status !== 'inactive' && p.active !== false);
  const filteredPersonnel = activePersonnelList.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return p.name.toLowerCase().includes(q) || (p.role && p.role.toLowerCase().includes(q));
  });

  // Dynamic KPI sums from calculated items
  const calculatedItemsList = Object.values(calculatedMap).filter((item) => item.has_config);
  const totalCalculatedPayable = calculatedItemsList.reduce((sum, item) => sum + item.net_payable, 0);
  const totalCalculatedSales = calculatedItemsList.reduce((sum, item) => sum + item.total_contracts_amount, 0);
  const totalCalculatedContracts = calculatedItemsList.reduce((sum, item) => sum + item.contracts_count, 0);
  const totalCalculatedAdvances = calculatedItemsList.reduce((sum, item) => sum + item.advances_deducted, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-200 text-right">
      {/* 1. Header Banner - Fixed Light & Dark Contrast */}
      <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#282828] p-5 sm:p-6 shadow-sm dark:shadow-xl transition-colors">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-[#1DB954]/20 dark:border-[#1DB954]/40 dark:text-[#1DB954] flex items-center justify-center shadow-xs shrink-0">
              <WalletCards className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  مدیریت حقوق و دستمزد
                </h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-[#1DB954]/20 dark:text-[#1DB954] font-bold">
                  ویژه مدیریت
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-[#888] mt-1">
                محاسبه پورسانت قراردادها، کسر مساعده‌ها و صدور فیش‌های مالی
              </p>
            </div>
          </div>

          {/* SubTab Navigation Buttons - Shortened Labels */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2a2a2a] self-stretch md:self-auto overflow-x-auto">
            <button
              onClick={() => setActiveSubTab('calculations')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeSubTab === 'calculations'
                  ? 'bg-emerald-600 text-white dark:bg-[#1DB954] dark:text-black shadow-md'
                  : 'text-slate-600 dark:text-[#A7A7A7] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>محاسبه ماهانه</span>
            </button>

            <button
              onClick={() => setActiveSubTab('configs')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeSubTab === 'configs'
                  ? 'bg-emerald-600 text-white dark:bg-[#1DB954] dark:text-black shadow-md'
                  : 'text-slate-600 dark:text-[#A7A7A7] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>قرارداد پرسنل</span>
            </button>

            <button
              onClick={() => setActiveSubTab('slips')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeSubTab === 'slips'
                  ? 'bg-emerald-600 text-white dark:bg-[#1DB954] dark:text-black shadow-md'
                  : 'text-slate-600 dark:text-[#A7A7A7] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>آرشیو فیش‌ها</span>
              {payrollSlips.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-white/20 text-slate-800 dark:text-white font-mono font-bold">
                  {toPersianDigits(payrollSlips.length)}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: Calculations (محاسبه ماهانه)                           */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === 'calculations' && (
        <div className="space-y-5">
          {/* Month Selector Bar & Action Controls */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-[#161616] border border-slate-200 dark:border-[#262626] shadow-xs">
            {/* Jalali Month Selector */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-[#CCC]">
                <Calendar className="w-4 h-4 text-emerald-600 dark:text-[#1DB954]" />
                <span>دوره محاسباتی:</span>
              </div>

              {/* Month Dropdown */}
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#202020] border border-slate-300 dark:border-[#333] text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500 cursor-pointer"
              >
                {JALALI_MONTH_NAMES.map((name, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {name}
                  </option>
                ))}
              </select>

              {/* Year Dropdown */}
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#202020] border border-slate-300 dark:border-[#333] text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500 cursor-pointer"
              >
                {[todayJalali.jy - 1, todayJalali.jy, todayJalali.jy + 1].map((yr) => (
                  <option key={yr} value={yr}>
                    {toPersianDigits(yr)}
                  </option>
                ))}
              </select>

              {/* Quick Today Pill */}
              <button
                onClick={() => {
                  setSelectedYear(todayJalali.jy);
                  setSelectedMonth(todayJalali.jm);
                }}
                className="text-[11px] px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-[#1DB954]/10 dark:text-[#1DB954] dark:hover:bg-[#1DB954]/20 font-bold border border-emerald-500/30 transition-colors cursor-pointer"
              >
                ماه جاری
              </button>
            </div>

            {/* Actions: On-demand Bulk or Partial */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleCalculateAll}
                disabled={isBulkCalculating}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#222] dark:hover:bg-[#2a2a2a] text-slate-700 dark:text-[#CCC] text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                title="محاسبه تمام پرسنلی که دارای حکم تعریف‌شده هستند"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isBulkCalculating ? 'animate-spin text-emerald-600' : ''}`} />
                <span>محاسبه همه پرسنل</span>
              </button>

              <button
                onClick={handleIssueCalculatedSlips}
                disabled={calculatedItemsList.length === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-[#1DB954] dark:hover:bg-[#1ed760] text-white dark:text-black text-xs font-bold shadow-md shadow-emerald-600/20 dark:shadow-[#1DB954]/25 transition-all cursor-pointer disabled:opacity-40"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>صدور فیش‌های محاسبه‌شده ({toPersianDigits(calculatedItemsList.length)} نفر)</span>
              </button>
            </div>
          </div>

          {/* KPI Dashboard Cards (Only reflecting computed data) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-2xl bg-white dark:bg-[#161616] border border-slate-200 dark:border-[#262626] shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 dark:text-[#888] block mb-1">خالص پرداختی افراد محاسبه‌شده:</span>
                <span className="text-xl font-black text-emerald-600 dark:text-[#1DB954] font-mono">
                  {formatToman(totalCalculatedPayable)} <span className="text-xs font-normal">تومان</span>
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  ({toPersianDigits(calculatedItemsList.length)} از {toPersianDigits(activePersonnelList.length)} همکار)
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-[#1DB954]/15 border border-emerald-500/20 text-emerald-600 dark:text-[#1DB954] flex items-center justify-center shrink-0">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#161616] border border-slate-200 dark:border-[#262626] shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 dark:text-[#888] block mb-1">ارزش قراردادهای محاسبه‌شده:</span>
                <span className="text-xl font-black text-slate-900 dark:text-white font-mono">
                  {formatToman(totalCalculatedSales)} <span className="text-xs font-normal">تومان</span>
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#161616] border border-slate-200 dark:border-[#262626] shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 dark:text-[#888] block mb-1">تعداد قراردادهای موفق:</span>
                <span className="text-xl font-black text-slate-900 dark:text-white font-mono">
                  {toPersianDigits(totalCalculatedContracts)} <span className="text-xs font-normal">قرارداد</span>
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#161616] border border-slate-200 dark:border-[#262626] shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 dark:text-[#888] block mb-1">مساعده‌های کسر شده:</span>
                <span className="text-xl font-black text-rose-500 font-mono">
                  {formatToman(totalCalculatedAdvances)} <span className="text-xs font-normal">تومان</span>
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center shrink-0">
                <Wallet className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو بر اساس نام همکار یا سمت..."
              className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-white dark:bg-[#161616] border border-slate-200 dark:border-[#282828] text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          {/* Personnel Calculations Table - Supports Individual Processing */}
          <div className="bg-white dark:bg-[#161616] rounded-2xl border border-slate-200 dark:border-[#262626] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead className="bg-slate-50 dark:bg-[#1a1a1a] text-slate-500 dark:text-[#888] font-bold border-b border-slate-200 dark:border-[#282828]">
                  <tr>
                    <th className="p-3.5">همکار</th>
                    <th className="p-3.5">ساختار حکم حقوقی</th>
                    <th className="p-3.5">قراردادهای ماه</th>
                    <th className="p-3.5">پورسانت</th>
                    <th className="p-3.5">حقوق پایه</th>
                    <th className="p-3.5">مساعده</th>
                    <th className="p-3.5">خالص پرداختی</th>
                    <th className="p-3.5 text-center">پردازش و صدور</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#222]">
                  {filteredPersonnel.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500">
                        همکاری یافت نشد.
                      </td>
                    </tr>
                  ) : (
                    filteredPersonnel.map((p) => {
                      const cfg = salaryConfigs.find((c) => String(c.personnel_id) === String(p.id) && c.is_active !== false);
                      const hasConfig = Boolean(cfg);
                      const calculatedItem = calculatedMap[p.id];
                      const isCalculatingThis = calculatingPersonnelIds.has(p.id);

                      return (
                        <tr
                          key={p.id}
                          className="hover:bg-slate-50/70 dark:hover:bg-[#1c1c1c] transition-colors"
                        >
                          {/* Personnel Info */}
                          <td className="p-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-[#282828] flex items-center justify-center font-bold text-xs text-slate-700 dark:text-[#1DB954] shrink-0 overflow-hidden">
                                {p.profile_image || p.avatar ? (
                                  <img src={p.profile_image || p.avatar} alt={p.name} className="w-full h-full object-cover" />
                                ) : (
                                  p.name.charAt(0)
                                )}
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 dark:text-white block">{p.name}</span>
                                <span className="text-[10px] text-slate-400">
                                  {p.role === 'admin'
                                    ? 'مدیر سیستم'
                                    : p.role === 'sales_manager'
                                    ? 'مدیر فروش'
                                    : 'کارشناس فروش'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Salary Model Badge - If undefined, explicit "تعریف نشده" */}
                          <td className="p-3.5">
                            {!cfg ? (
                              <button
                                onClick={() => {
                                  setEditingPersonnel(p);
                                  setIsConfigModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-100 transition-colors cursor-pointer"
                                title="کلیک برای تعریف حکم حقوقی"
                              >
                                <AlertTriangle className="w-3 h-3" />
                                <span>تعریف نشده</span>
                              </button>
                            ) : (
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold ${
                                  cfg.salary_type === 'fixed'
                                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400'
                                    : cfg.salary_type === 'commission'
                                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400'
                                    : 'bg-emerald-50 text-emerald-700 dark:bg-[#1DB954]/15 dark:text-[#1DB954]'
                                }`}
                              >
                                {cfg.salary_type === 'fixed'
                                  ? 'حقوق ثابت'
                                  : cfg.salary_type === 'commission'
                                  ? `پورسانت (${cfg.commission_model === 'flat' ? 'ثابت' : 'پله‌ای'})`
                                  : `ثابت + پورسانت (${cfg.commission_model === 'flat' ? 'ثابت' : 'پله‌ای'})`}
                              </span>
                            )}
                          </td>


                          {/* Contract Volume & Count */}
                          <td className="p-3.5">
                            {!hasConfig ? (
                              <span className="text-slate-400 text-xs">-</span>
                            ) : !calculatedItem ? (
                              <span className="text-slate-400 text-xs italic">هنوز پردازش نشده</span>
                            ) : (
                              <button
                                onClick={() => {
                                  setSelectedBreakdownItem(calculatedItem);
                                  setIsBreakdownModalOpen(true);
                                }}
                                className="inline-flex flex-col text-right group cursor-pointer transition-transform hover:scale-105"
                                title="مشاهده ریز قراردادها"
                              >
                                <span className="font-mono font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-[#1DB954] flex items-center gap-1">
                                  <span>{formatToman(calculatedItem.total_contracts_amount)} ت</span>
                                  <Eye className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {toPersianDigits(calculatedItem.contracts_count)} قرارداد
                                </span>
                              </button>
                            )}
                          </td>

                          {/* Commission */}
                          <td className="p-3.5">
                            {!hasConfig || !calculatedItem ? (
                              <span className="text-slate-400 text-xs">-</span>
                            ) : (
                              <span className="font-mono font-bold text-emerald-600 dark:text-[#1DB954]">
                                {formatToman(calculatedItem.commission_amount)} ت
                              </span>
                            )}
                          </td>

                          {/* Base Salary */}
                          <td className="p-3.5">
                            {!hasConfig || !calculatedItem ? (
                              <span className="text-slate-400 text-xs">-</span>
                            ) : (
                              <span className="font-mono text-slate-700 dark:text-[#CCC]">
                                {formatToman(calculatedItem.base_salary_amount)} ت
                              </span>
                            )}
                          </td>

                          {/* Advances */}
                          <td className="p-3.5">
                            {!hasConfig || !calculatedItem ? (
                              <span className="text-slate-400 text-xs">-</span>
                            ) : calculatedItem.advances_deducted > 0 ? (
                              <span className="font-mono text-rose-500 font-bold">
                                - {formatToman(calculatedItem.advances_deducted)} ت
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>

                          {/* Net Payable */}
                          <td className="p-3.5">
                            {!hasConfig ? (
                              <span className="text-amber-600 dark:text-amber-400 text-xs font-semibold">حکم تعریف نشده</span>
                            ) : !calculatedItem ? (
                              <span className="text-slate-400 text-xs italic">نیازمند پردازش</span>
                            ) : (
                              <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                                {formatToman(calculatedItem.net_payable)} تومان
                              </span>
                            )}
                          </td>

                          {/* Actions - Individual Calculation & Issuing */}
                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {!hasConfig ? (
                                <button
                                  onClick={() => {
                                    setEditingPersonnel(p);
                                    setIsConfigModalOpen(true);
                                  }}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-xs font-bold transition-colors cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>تعریف حکم</span>
                                </button>
                              ) : (
                                <>
                                  {/* Individual Calculate Button */}
                                  <button
                                    onClick={() => handleCalculateSingle(p.id)}
                                    disabled={isCalculatingThis}
                                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                      calculatedItem
                                        ? 'bg-slate-100 hover:bg-slate-200 dark:bg-[#202020] dark:hover:bg-[#282828] text-slate-700 dark:text-[#CCC]'
                                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-[#1DB954]/15 dark:text-[#1DB954] border border-emerald-500/30'
                                    }`}
                                    title="محاسبه انفرادی حقوق این همکار"
                                  >
                                    <Play className={`w-3 h-3 ${isCalculatingThis ? 'animate-spin' : ''}`} />
                                    <span>{isCalculatingThis ? 'در حال محاسبه...' : calculatedItem ? 'محاسبه مجدد' : 'محاسبه حقوق'}</span>
                                  </button>

                                  {/* View Breakdown & Issue Slip if calculated */}
                                  {calculatedItem && (
                                    <>
                                      <button
                                        onClick={() => {
                                          setSelectedBreakdownItem(calculatedItem);
                                          setIsBreakdownModalOpen(true);
                                        }}
                                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#252525] transition-colors cursor-pointer"
                                        title="ریز محاسبات و قراردادها"
                                      >
                                        <Eye className="w-4 h-4" />
                                      </button>

                                      <button
                                        onClick={() => handleIssueSlip(calculatedItem)}
                                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 dark:bg-[#1DB954] dark:hover:bg-[#1ed760] text-white dark:text-black font-bold text-xs shadow-xs transition-colors cursor-pointer"
                                        title="صدور فیش رسمی برای این همکار"
                                      >
                                        صدور فیش
                                      </button>
                                    </>
                                  )}
                                </>
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
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: Personnel Salary Configurations (قرارداد پرسنل)           */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === 'configs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-[#161616] border border-slate-200 dark:border-[#262626]">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                قراردادها و فرمول‌های مالی پرسنل
              </h2>
              <p className="text-xs text-slate-500 dark:text-[#888] mt-0.5">
                تعیین فرمول پورسانت (ثابت یا پله‌ای)، عطف‌به‌ماسبق یا مازاد، و حقوق ثابت برای هر فرد
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-[#161616] rounded-2xl border border-slate-200 dark:border-[#262626] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead className="bg-slate-50 dark:bg-[#1a1a1a] text-slate-500 dark:text-[#888] font-bold border-b border-slate-200 dark:border-[#282828]">
                  <tr>
                    <th className="p-3.5">همکار</th>
                    <th className="p-3.5">نوع حقوق</th>
                    <th className="p-3.5">حقوق پایه ثابت</th>
                    <th className="p-3.5">مدل پورسانت</th>
                    <th className="p-3.5">رفتار پله‌ای</th>
                    <th className="p-3.5">کف فروش</th>
                    <th className="p-3.5">وضعیت</th>
                    <th className="p-3.5 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#222]">
                  {personnelList.map((p) => {
                    const cfg = salaryConfigs.find((c) => String(c.personnel_id) === String(p.id));
                    const hasConfig = Boolean(cfg);

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/70 dark:hover:bg-[#1c1c1c] transition-colors">
                        <td className="p-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-[#282828] flex items-center justify-center font-bold text-xs text-slate-700 dark:text-[#1DB954] shrink-0">
                              {p.name.charAt(0)}
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 dark:text-white block">{p.name}</span>
                              <span className="text-[10px] text-slate-400">{p.email}</span>
                            </div>
                          </div>
                        </td>

                        <td className="p-3.5">
                          {!cfg ? (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400 border border-amber-500/30">
                              تعریف نشده
                            </span>
                          ) : (
                            <span className="font-bold text-slate-700 dark:text-[#CCC]">
                              {cfg.salary_type === 'fixed'
                                ? 'فقط حقوق ثابت'
                                : cfg.salary_type === 'commission'
                                ? 'فقط پورسانت'
                                : 'ثابت + پورسانت'}
                            </span>
                          )}
                        </td>

                        <td className="p-3.5 font-mono font-bold text-slate-900 dark:text-white">
                          {!cfg || cfg.salary_type === 'commission' ? '-' : `${formatToman(cfg.base_salary)} تومان`}
                        </td>

                        <td className="p-3.5">
                          {!cfg ? (
                            <span className="text-slate-400">-</span>
                          ) : cfg.salary_type === 'fixed' ? (
                            <span className="text-slate-400">فاقد پورسانت</span>
                          ) : cfg.commission_model === 'flat' ? (
                            <span className="font-mono text-emerald-600 dark:text-[#1DB954] font-bold">
                              درصد ثابت ({toPersianDigits(cfg.flat_rate_percent)}٪)
                            </span>
                          ) : (
                            <span className="font-mono text-emerald-600 dark:text-[#1DB954] font-bold">
                              پله‌ای ({toPersianDigits(cfg.commission_tiers?.length || 0)} پله)
                            </span>
                          )}
                        </td>

                        <td className="p-3.5">
                          {!cfg || cfg.salary_type === 'fixed' || cfg.commission_model === 'flat' ? (
                            <span className="text-slate-400">-</span>
                          ) : cfg.tiered_calculation_mode === 'retroactive' ? (
                            <span className="text-blue-600 dark:text-blue-400 font-bold">عطف‌به‌ماسبق (کل فروش)</span>
                          ) : (
                            <span className="text-emerald-600 dark:text-[#1DB954] font-bold">پله‌ای مازاد (براکت)</span>
                          )}
                        </td>

                        <td className="p-3.5 font-mono text-slate-600 dark:text-[#AAA]">
                          {!cfg ? (
                            <span className="text-slate-400">-</span>
                          ) : cfg.min_sales_target && cfg.min_sales_target > 0 ? (
                            `${formatToman(cfg.min_sales_target)} ت`
                          ) : (
                            'از ریال اول'
                          )}
                        </td>

                        <td className="p-3.5">
                          {!cfg ? (
                            <span className="text-slate-400 text-xs">فاقد قرارداد</span>
                          ) : (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                cfg.is_active !== false
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-[#1DB954]/20 dark:text-[#1DB954]'
                                  : 'bg-slate-100 text-slate-600 dark:bg-[#282828] dark:text-[#888]'
                              }`}
                            >
                              {cfg.is_active !== false ? 'فعال' : 'غیرفعال'}
                            </span>
                          )}
                        </td>

                        <td className="p-3.5 text-center">
                          <button
                            onClick={() => {
                              setEditingPersonnel(p);
                              setIsConfigModalOpen(true);
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors mx-auto cursor-pointer ${
                              !hasConfig
                                ? 'bg-emerald-600 hover:bg-emerald-700 dark:bg-[#1DB954] dark:hover:bg-[#1ed760] text-white dark:text-black shadow-xs'
                                : 'bg-slate-100 hover:bg-slate-200 dark:bg-[#202020] dark:hover:bg-[#282828] text-slate-700 dark:text-white'
                            }`}
                          >
                            {!hasConfig ? <Plus className="w-3.5 h-3.5" /> : <Edit2 className="w-3.5 h-3.5 text-emerald-600 dark:text-[#1DB954]" />}
                            <span>{!hasConfig ? 'تعریف قرارداد حقوقی' : 'ویرایش قرارداد'}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: Issued Slips Archive (آرشیو فیش‌ها)                     */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === 'slips' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-[#161616] border border-slate-200 dark:border-[#262626]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600 dark:text-[#AAA]">فیلتر وضعیت:</span>
              {(['all', 'draft', 'approved', 'paid'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === st
                      ? 'bg-emerald-600 text-white dark:bg-[#1DB954] dark:text-black'
                      : 'bg-slate-100 dark:bg-[#202020] text-slate-600 dark:text-[#888] hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {st === 'all'
                    ? 'همه'
                    : st === 'draft'
                    ? 'پیش‌نویس'
                    : st === 'approved'
                    ? 'تایید شده'
                    : 'واریز شده'}
                </button>
              ))}
            </div>

            <button
              onClick={loadSlips}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#222] text-xs font-bold text-slate-700 dark:text-[#CCC] cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>بروزرسانی آرشیو</span>
            </button>
          </div>

          {/* Slips Table */}
          <div className="bg-white dark:bg-[#161616] rounded-2xl border border-slate-200 dark:border-[#262626] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead className="bg-slate-50 dark:bg-[#1a1a1a] text-slate-500 dark:text-[#888] font-bold border-b border-slate-200 dark:border-[#282828]">
                  <tr>
                    <th className="p-3.5">شماره فیش</th>
                    <th className="p-3.5">همکار</th>
                    <th className="p-3.5">بازه تسویه</th>
                    <th className="p-3.5">ارزش قراردادها</th>
                    <th className="p-3.5">حقوق پایه</th>
                    <th className="p-3.5">پورسانت</th>
                    <th className="p-3.5">مساعده</th>
                    <th className="p-3.5">خالص پرداختی</th>
                    <th className="p-3.5">وضعیت</th>
                    <th className="p-3.5 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#222]">
                  {payrollSlips
                    .filter((s) => (statusFilter === 'all' ? true : s.status === statusFilter))
                    .map((slip) => {
                      const person = personnelList.find(
                        (p) => String(p.id) === String(slip.personnel_id)
                      );
                      const displayName =
                        person?.name ||
                        (slip.personnel_name && slip.personnel_name !== String(slip.personnel_id)
                          ? slip.personnel_name
                          : '') ||
                        person?.username ||
                        'همکار گرامی';

                      return (
                        <tr key={slip.id} className="hover:bg-slate-50/70 dark:hover:bg-[#1c1c1c] transition-colors">
                          <td className="p-3.5 font-mono font-bold text-slate-900 dark:text-white">
                            SLIP-{toPersianDigits(slip.id)}
                          </td>

                          <td className="p-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 dark:bg-[#1DB954]/20 dark:text-[#1DB954] flex items-center justify-center font-bold text-xs shrink-0">
                                {displayName.charAt(0)}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-800 dark:text-white">{displayName}</span>
                                {person?.role && (
                                  <span className="text-[10px] text-slate-500 dark:text-[#888] font-normal">
                                    {person.role === 'admin'
                                      ? 'مدیر سیستم'
                                      : person.role === 'sales_manager'
                                      ? 'مدیر فروش'
                                      : person.role === 'marketer'
                                      ? 'کارشناس فروش'
                                      : person.role}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="p-3.5 text-slate-500 font-mono">
                            {slip.from_date ? formatPersianDate(slip.from_date) : '-'} تا{' '}
                            {slip.to_date ? formatPersianDate(slip.to_date) : '-'}
                          </td>

                          <td className="p-3.5 font-mono text-slate-700 dark:text-[#CCC]">
                            {formatToman(slip.total_contracts_amount)} ت
                          </td>

                          <td className="p-3.5 font-mono text-slate-700 dark:text-[#CCC]">
                            {formatToman(slip.base_salary_amount)} ت
                          </td>

                          <td className="p-3.5 font-mono text-emerald-600 dark:text-[#1DB954] font-bold">
                            {formatToman(slip.commission_amount)} ت
                          </td>

                          <td className="p-3.5 font-mono text-rose-500">
                            {Number(slip.advances_deducted) > 0 ? `- ${formatToman(slip.advances_deducted)} ت` : '-'}
                          </td>

                          <td className="p-3.5 font-mono font-black text-sm text-slate-900 dark:text-white">
                            {formatToman(slip.net_payable)} تومان
                          </td>

                          <td className="p-3.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                slip.status === 'paid'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-[#1DB954]/20 dark:text-[#1DB954]'
                                  : slip.status === 'approved'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-400'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400'
                              }`}
                            >
                              {slip.status === 'paid' ? 'پرداخت شده' : slip.status === 'approved' ? 'تایید شده' : 'پیش‌نویس'}
                            </span>
                          </td>

                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => {
                                  setViewingSlip(slip);
                                  setIsSlipModalOpen(true);
                                }}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#202020] dark:hover:bg-[#2a2a2a] text-xs font-bold text-slate-800 dark:text-white transition-colors cursor-pointer"
                                title="مشاهده و چاپ فیش"
                              >
                                <Printer className="w-3.5 h-3.5 text-emerald-600 dark:text-[#1DB954]" />
                                <span>چاپ</span>
                              </button>

                              {slip.status !== 'paid' && (
                                <button
                                  onClick={() => {
                                    setPayingSlip(slip);
                                    setPaymentRefInput('');
                                  }}
                                  className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-[#1DB954]/15 dark:text-[#1DB954] text-xs font-bold cursor-pointer"
                                  title="ثبت واریز به حساب"
                                >
                                  ثبت واریز
                                </button>
                              )}

                              {slip.status === 'draft' && (
                                <button
                                  onClick={() => handleDeleteSlip(slip.id)}
                                  className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer"
                                  title="حذف پیش‌نویس"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODALS                                                        */}
      {/* ------------------------------------------------------------- */}

      {/* Salary Config Modal */}
      {isConfigModalOpen && (
        <SalaryConfigModal
          isOpen={isConfigModalOpen}
          onClose={() => {
            setIsConfigModalOpen(false);
            setEditingPersonnel(null);
          }}
          personnel={editingPersonnel}
          currentConfig={
            editingPersonnel ? salaryConfigs.find((c) => String(c.personnel_id) === String(editingPersonnel.id)) : null
          }
          onSave={handleSaveConfig}
          showToast={showToast}
        />
      )}

      {/* Contracts & Math Breakdown Modal */}
      {isBreakdownModalOpen && selectedBreakdownItem && (
        <ContractsBreakdownModal
          isOpen={isBreakdownModalOpen}
          onClose={() => {
            setIsBreakdownModalOpen(false);
            setSelectedBreakdownItem(null);
          }}
          item={selectedBreakdownItem}
        />
      )}

      {/* Official Printable Payroll Slip Modal */}
      {isSlipModalOpen && viewingSlip && (
        <PayrollSlipModal
          isOpen={isSlipModalOpen}
          onClose={() => {
            setIsSlipModalOpen(false);
            setViewingSlip(null);
          }}
          slip={viewingSlip}
          personnel={personnelList.find((p) => String(p.id) === String(viewingSlip.personnel_id))}
        />
      )}

      {/* Mark Paid Prompt Dialog */}
      {payingSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-[#181818] border border-slate-200 dark:border-[#303030] rounded-2xl p-6 space-y-4 text-right shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-[#1DB954]" />
              <span>ثبت پرداخت و تسویه حساب</span>
            </h3>

            <p className="text-xs text-slate-600 dark:text-[#A7A7A7] leading-relaxed">
              مبلغ <strong className="font-mono text-emerald-600 dark:text-[#1DB954]">{formatToman(payingSlip.net_payable)} تومان</strong> برای{' '}
              <strong>{payingSlip.personnel_name}</strong> واریز گردید. شماره پیگیری واریز را وارد نمایید:
            </p>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-[#CCC] block mb-1">
                شماره پیگیری یا مرجع بانکی (اختیاری):
              </label>
              <input
                type="text"
                value={paymentRefInput}
                onChange={(e) => setPaymentRefInput(e.target.value)}
                placeholder="مثلاً: 9876543210"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#121212] border border-slate-300 dark:border-[#333] text-xs font-mono text-left ltr text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setPayingSlip(null)}
                disabled={isMarkingPaid}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-[#333] text-xs font-bold text-slate-600 dark:text-[#AAA] cursor-pointer"
              >
                انصراف
              </button>
              <button
                onClick={handleConfirmPaid}
                disabled={isMarkingPaid}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-[#1DB954] dark:hover:bg-[#1ed760] text-white dark:text-black font-bold text-xs cursor-pointer"
              >
                {isMarkingPaid ? 'در حال ثبت...' : 'تایید پرداخت فیش'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
