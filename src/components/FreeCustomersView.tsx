import React, { useState, useMemo, useEffect } from 'react';
import {
  Unlock,
  Search,
  Filter,
  Building,
  Phone,
  User,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  MessageSquareText,
  Star,
  Sparkles,
  Layers,
  LayoutGrid,
  Table as TableIcon,
  Copy,
  ExternalLink,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Settings,
  HelpCircle,
  FileCheck,
  Send,
  X,
} from 'lucide-react';
import { Customer, CustomerReport, Personnel, AuthUser } from '../types';
import { fetchProjectSettings, updateProjectSettings } from '../api';
import { toPersianDigits, formatPersianDate, formatPersianDateTime, formatStatusLabel, getStatusBadgeClass } from '../utils';
import { IRAN_PROVINCES } from '../data/iranProvincesCities';

interface FreeCustomersViewProps {
  customers: Customer[];
  reports: CustomerReport[];
  personnelList: Personnel[];
  currentPersonnel: Personnel | null;
  currentUser: AuthUser | null;
  isAdmin: boolean;
  onClaimCustomer: (customerId: string, durationDays: number) => Promise<boolean>;
  onSelectCustomer: (customer: Customer) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const FreeCustomersView: React.FC<FreeCustomersViewProps> = ({
  customers,
  reports,
  personnelList,
  currentPersonnel,
  currentUser,
  isAdmin,
  onClaimCustomer,
  onSelectCustomer,
  showToast,
}) => {
  // Configurable claim limit (default 20, synced with Directus project_settings)
  const [claimLimit, setClaimLimit] = useState<number>(() => {
    const saved = localStorage.getItem('alphadesk_free_pool_limit');
    return saved ? parseInt(saved, 10) : 20;
  });
  const [isEditingLimit, setIsEditingLimit] = useState(false);
  const [tempLimit, setTempLimit] = useState(claimLimit);

  useEffect(() => {
    fetchProjectSettings()
      .then((settings) => {
        if (settings && settings.free_customers_claim_limit) {
          setClaimLimit(settings.free_customers_claim_limit);
        }
      })
      .catch(() => {});
  }, []);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedPrevMarketer, setSelectedPrevMarketer] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [sortBy, setSortBy] = useState<'recent_expired' | 'score' | 'reports_count'>('recent_expired');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Accordion for viewing previous reports
  const [expandedReportCustId, setExpandedReportCustId] = useState<string | null>(null);

  // Claim Modal State
  const [claimingCustomer, setClaimingCustomer] = useState<Customer | null>(null);
  const [claimDurationDays, setClaimDurationDays] = useState<number>(10);
  const [isProcessingClaim, setIsProcessingClaim] = useState(false);

  // -------------------------------------------------------------
  // 1. Compute Free Customers
  // -------------------------------------------------------------
  const now = new Date().getTime();

  const freeCustomers = useMemo(() => {
    return customers.filter((c) => {
      // Must not be already closed (Contract) or Blacklisted
      if (c.status === 'قرارداد' || c.status === 'لیست سیاه') {
        return false;
      }

      // Check if unassigned
      const isUnassigned = !c.assigned_marketer_id || c.assigned_marketer_name === 'تخصیص نیافته';

      // Check if deadline is passed
      const isDeadlinePassed = Boolean(
        c.assignment_deadline && now > new Date(c.assignment_deadline).getTime()
      );

      // Check is_expired flag
      const isExpired = Boolean(c.is_expired || isDeadlinePassed || isUnassigned);

      return isExpired;
    });
  }, [customers, now]);

  // Map of reports grouped by customer_id
  const customerReportsMap = useMemo(() => {
    const map = new Map<string, CustomerReport[]>();
    for (const r of reports) {
      const list = map.get(r.customer_id) || [];
      list.push(r);
      map.set(r.customer_id, list);
    }
    // Sort reports in descending order (newest first)
    for (const [id, list] of map.entries()) {
      list.sort((a, b) => new Date(b.date_created).getTime() - new Date(a.date_created).getTime());
    }
    return map;
  }, [reports]);

  // -------------------------------------------------------------
  // 2. Compute Current Marketer's Quota
  // -------------------------------------------------------------
  const myId = currentPersonnel?.id || currentUser?.id || '';
  const myName = currentPersonnel?.name || currentUser?.name || '';

  const myCustomers = useMemo(() => {
    return customers.filter(
      (c) => c.assigned_marketer_id === myId || (myId && c.assigned_marketer_name === myName)
    );
  }, [customers, myId, myName]);

  const mySuccessfulContractsCount = useMemo(() => {
    return myCustomers.filter((c) => c.status === 'قرارداد').length;
  }, [myCustomers]);

  const myActiveUnclosedCount = useMemo(() => {
    return myCustomers.filter((c) => c.status !== 'قرارداد' && c.status !== 'لیست سیاه').length;
  }, [myCustomers]);

  // Quota rule: Can claim if active unclosed < claimLimit OR has >= 1 successful contract
  const canClaim = mySuccessfulContractsCount > 0 || myActiveUnclosedCount < claimLimit;
  const quotaPercentage = Math.min(100, Math.round((myActiveUnclosedCount / claimLimit) * 100));

  // -------------------------------------------------------------
  // 3. Filtered & Sorted Free Customers
  // -------------------------------------------------------------
  const filteredFreeCustomers = useMemo(() => {
    return freeCustomers
      .filter((c) => {
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.trim().toLowerCase();
          const matchCompany = c.company_name?.toLowerCase().includes(q);
          const matchManager = c.manager_name?.toLowerCase().includes(q);
          const matchBusiness = c.business_type?.toLowerCase().includes(q);
          const matchCity = c.city?.toLowerCase().includes(q);
          const matchProvince = c.province?.toLowerCase().includes(q);
          const matchPhones = [
            ...(c.mobile_numbers || []),
            ...(c.manager_phones || []),
            ...(c.landline_numbers || []),
          ].some((ph) => ph.includes(q));

          if (!matchCompany && !matchManager && !matchBusiness && !matchCity && !matchProvince && !matchPhones) {
            return false;
          }
        }

        // Province
        if (selectedProvince && c.province !== selectedProvince) {
          return false;
        }

        // Previous Marketer
        if (selectedPrevMarketer) {
          if (c.assigned_marketer_name !== selectedPrevMarketer && c.assigned_marketer_id !== selectedPrevMarketer) {
            return false;
          }
        }

        // Status
        if (selectedStatus && c.status !== selectedStatus) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'score') {
          return (b.interview_score || 0) - (a.interview_score || 0);
        }
        if (sortBy === 'reports_count') {
          const countA = customerReportsMap.get(a.id)?.length || 0;
          const countB = customerReportsMap.get(b.id)?.length || 0;
          return countB - countA;
        }
        // recent_expired: order by deadline desc or date_updated desc
        const dateA = a.assignment_deadline ? new Date(a.assignment_deadline).getTime() : 0;
        const dateB = b.assignment_deadline ? new Date(b.assignment_deadline).getTime() : 0;
        return dateB - dateA;
      });
  }, [freeCustomers, searchQuery, selectedProvince, selectedPrevMarketer, selectedStatus, sortBy, customerReportsMap]);

  // Distinct previous marketers among free customers
  const prevMarketersList = useMemo(() => {
    const set = new Set<string>();
    freeCustomers.forEach((c) => {
      if (c.assigned_marketer_name && c.assigned_marketer_name !== 'تخصیص نیافته') {
        set.add(c.assigned_marketer_name);
      }
    });
    return Array.from(set);
  }, [freeCustomers]);

  // -------------------------------------------------------------
  // 4. Handlers
  // -------------------------------------------------------------
  const handleSaveClaimLimit = async () => {
    if (tempLimit >= 1 && tempLimit <= 500) {
      setClaimLimit(tempLimit);
      localStorage.setItem('alphadesk_free_pool_limit', String(tempLimit));
      await updateProjectSettings({ free_customers_claim_limit: tempLimit }).catch(() => {});
      setIsEditingLimit(false);
      showToast(`سقف برداشت آزاد با موفقیت به ${toPersianDigits(tempLimit)} پرونده تغییر یافت و در سامانه ذخیره شد.`, 'success');
    }
  };

  const handleConfirmClaim = async () => {
    if (!claimingCustomer) return;
    if (!canClaim) {
      showToast(
        `سقف مجاز (${toPersianDigits(claimLimit)} پرونده) شما تکمیل است. برای برداشت پرونده جدید باید حداقل یک قرارداد موفق داشته باشید.`,
        'error'
      );
      return;
    }

    try {
      setIsProcessingClaim(true);
      const success = await onClaimCustomer(claimingCustomer.id, claimDurationDays);
      if (success) {
        setClaimingCustomer(null);
      }
    } finally {
      setIsProcessingClaim(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard?.writeText(text);
    showToast(`${label} کپی شد: ${toPersianDigits(text)}`, 'info');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ------------------------------------------------------------- */}
      {/* 1. Header Banner & Quota Metric Card                           */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Banner Title Box */}
        <div className="lg:col-span-2 bg-[#181818] border border-[#282828] rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#1DB954]/5 rounded-full blur-3xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#1DB954]/15 border border-[#1DB954]/30 flex items-center justify-center text-[#1DB954] shadow-lg shadow-[#1DB954]/10">
                  <Unlock className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-white tracking-tight">حوضچه مشتریان آزاد</h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#1DB954]/20 border border-[#1DB954]/40 text-[#1DB954] text-xs font-mono font-bold">
                      {toPersianDigits(freeCustomers.length)} پرونده آزاد
                    </span>
                  </div>
                  <p className="text-xs text-[#888] mt-0.5">
                    پرونده‌هایی که مهلت بازاریاب قبلی آن‌ها منقضی شده یا از ابتدا بدون بازاریاب مانده‌اند
                  </p>
                </div>
              </div>

              {isAdmin && (
                <button
                  onClick={() => {
                    setTempLimit(claimLimit);
                    setIsEditingLimit(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#222] hover:bg-[#282828] border border-[#333] text-xs text-[#B3B3B3] hover:text-white transition-colors"
                  title="تنظیم سقف سهمیه برداشت"
                >
                  <Settings className="w-3.5 h-3.5 text-[#1DB954]" />
                  <span className="hidden sm:inline">تنظیم سقف (مدیر)</span>
                </button>
              )}
            </div>

            <div className="bg-[#141414] border border-[#262626] rounded-xl p-3 sm:p-4 text-xs text-[#A7A7A7] leading-relaxed flex items-start gap-2.5 mt-3">
              <HelpCircle className="w-4 h-4 text-[#1DB954] flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white ml-1">قانون طلایی حوضچه آزاد:</span>
                شما می‌توانید پرونده‌های آزاد را به همراه تمامی تاریخچه تماس‌ها و یادداشت‌های مذاکره‌کنندگان قبلی مشاهده کرده و به خود اختصاص دهید.
                هر کارشناس تا سقف <strong className="text-[#1DB954] font-mono">{toPersianDigits(claimLimit)}</strong> پرونده فعال می‌تواند بردارد؛
                برای ادامه برداشت پس از سقف، باید حداقل <strong className="text-white">۱ قرارداد موفق</strong> به ثبت رسانده باشد.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-[#777] mt-4 pt-3 border-t border-[#252525]">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#1DB954]" />
              <span>مهلت پیگیری جدید: ۱۰ روز از لحظه برداشت</span>
            </div>
            <div className="flex items-center gap-1.5">
              <FileCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>ثبت لاگ اتوماتیک در تاریخچه مذاکرات</span>
            </div>
          </div>
        </div>

        {/* Quota & Access Status Card */}
        <div className="bg-[#181818] border border-[#282828] rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#282828]">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-[#1DB954]" />
                <span>وضعیت سهمیه برداشت شما</span>
              </span>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                  canClaim
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                }`}
              >
                {canClaim ? (
                  <>
                    <CheckCircle2 className="w-3 h-3" />
                    <span>مجاز به برداشت</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3 h-3" />
                    <span>سقف تکمیل</span>
                  </>
                )}
              </span>
            </div>

            <div className="mt-4 space-y-3.5">
              {/* Active Unclosed Count */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-[#888]">پرونده‌های فعال تحت پیگیری شما:</span>
                  <span className="font-mono font-bold text-white">
                    {toPersianDigits(myActiveUnclosedCount)} از {toPersianDigits(claimLimit)} پرونده
                  </span>
                </div>
                {/* Progress bar */}
                <div className="w-full h-2 rounded-full bg-[#121212] overflow-hidden border border-[#282828]">
                  <div
                    className={`h-full transition-all duration-300 rounded-full ${
                      quotaPercentage >= 100
                        ? mySuccessfulContractsCount > 0
                          ? 'bg-blue-500'
                          : 'bg-rose-500'
                        : quotaPercentage >= 80
                        ? 'bg-amber-500'
                        : 'bg-[#1DB954]'
                    }`}
                    style={{ width: `${Math.min(100, quotaPercentage)}%` }}
                  />
                </div>
              </div>

              {/* Successful Contracts Count */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#141414] border border-[#242424]">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#1DB954]/15 text-[#1DB954] flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">قراردادهای موفق ثبت‌شده شما</div>
                    <div className="text-[10px] text-[#888]">شرط باز ماندن نامحدود سهمیه</div>
                  </div>
                </div>
                <span className="text-base font-black text-[#1DB954] font-mono">
                  {toPersianDigits(mySuccessfulContractsCount)}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#252525] text-[11px]">
            {canClaim ? (
              <p className="text-emerald-400/90 leading-tight">
                {mySuccessfulContractsCount > 0
                  ? 'شما دارای قرارداد موفق هستید و سهمیه برداشت شما فعال و باز است.'
                  : `شما می‌توانید ${toPersianDigits(Math.max(0, claimLimit - myActiveUnclosedCount))} پرونده دیگر از حوضچه آزاد بردارید.`}
              </p>
            ) : (
              <p className="text-amber-400/90 leading-tight">
                شما به سقف {toPersianDigits(claimLimit)} پرونده رسیده‌اید. برای برداشت مجدد، یکی از پرونده‌های فعلی را به قرارداد موفق تبدیل نمایید.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. Search & Filters Bar                                       */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-[#181818] border border-[#282828] rounded-2xl p-4 space-y-3 shadow-lg">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-[#888] absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو در نام شرکت، نام مدیر، شماره تماس، صنف، شهر..."
              className="w-full h-10 pr-10 pl-4 bg-[#141414] border border-[#282828] rounded-xl text-xs text-white placeholder-[#666] focus:border-[#1DB954] focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-[#141414] border border-[#282828] p-1 rounded-xl self-end sm:self-auto">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-[#282828] text-[#1DB954]' : 'text-[#888] hover:text-white'
              }`}
              title="نمایش کارتی"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'table' ? 'bg-[#282828] text-[#1DB954]' : 'text-[#888] hover:text-white'
              }`}
              title="نمایش جدولی"
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Dropdowns Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-[#242424]">
          {/* Province Filter */}
          <div>
            <select
              value={selectedProvince}
              onChange={(e) => setSelectedProvince(e.target.value)}
              className="w-full h-9 px-3 bg-[#141414] border border-[#282828] rounded-xl text-xs text-[#B3B3B3] focus:border-[#1DB954] focus:outline-none cursor-pointer"
            >
              <option value="">همه استان‌ها ({toPersianDigits(IRAN_PROVINCES.length)})</option>
              {IRAN_PROVINCES.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Previous Marketer Filter */}
          <div>
            <select
              value={selectedPrevMarketer}
              onChange={(e) => setSelectedPrevMarketer(e.target.value)}
              className="w-full h-9 px-3 bg-[#141414] border border-[#282828] rounded-xl text-xs text-[#B3B3B3] focus:border-[#1DB954] focus:outline-none cursor-pointer"
            >
              <option value="">همه بازاریاب‌های قبلی</option>
              {prevMarketersList.map((m) => (
                <option key={m} value={m}>
                  بازاریاب: {m}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full h-9 px-3 bg-[#141414] border border-[#282828] rounded-xl text-xs text-[#B3B3B3] focus:border-[#1DB954] focus:outline-none cursor-pointer"
            >
              <option value="recent_expired">جدیدترین منقضی‌شده</option>
              <option value="score">بالاترین امتیاز مصاحبه</option>
              <option value="reports_count">بیشترین تاریخچه مذاکره</option>
            </select>
          </div>

          {/* Reset Filters Button */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedProvince('');
                setSelectedPrevMarketer('');
                setSelectedStatus('');
                setSortBy('recent_expired');
              }}
              className="w-full h-9 px-3 rounded-xl bg-[#222] hover:bg-[#282828] text-xs font-semibold text-[#888] hover:text-white transition-colors flex items-center justify-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>پاکسازی فیلترها</span>
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. Customers Listing                                          */}
      {/* ------------------------------------------------------------- */}
      {filteredFreeCustomers.length === 0 ? (
        <div className="bg-[#181818] border border-[#282828] rounded-2xl p-12 text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-[#222] flex items-center justify-center text-[#888] mx-auto border border-[#333]">
            <Unlock className="w-8 h-8 text-[#1DB954]/50" />
          </div>
          <h3 className="text-base font-bold text-white">پرونده‌ای در حوضچه مشتریان آزاد یافت نشد</h3>
          <p className="text-xs text-[#888] max-w-md mx-auto">
            {freeCustomers.length === 0
              ? 'تمامی پرونده‌ها در حال حاضر دارای بازاریاب فعال و تحت مهلت پیگیری هستند. به محض پایان مهلت هر بازاریاب، پرونده در این بخش نمایش داده خواهد شد.'
              : 'با فیلترهای انتخابی شما مشتری آزادی پیدا نشد. فیلترها را تغییر دهید.'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredFreeCustomers.map((cust) => {
            const custReports = customerReportsMap.get(cust.id) || [];
            const isReportsExpanded = expandedReportCustId === cust.id;
            const primaryPhone = cust.manager_phones?.[0] || cust.mobile_numbers?.[0] || '';

            return (
              <div
                key={cust.id}
                className="bg-[#181818] border border-[#282828] hover:border-[#383838] rounded-2xl p-5 shadow-lg transition-all flex flex-col justify-between group hover:shadow-2xl hover:shadow-black/50"
              >
                <div>
                  {/* Card Top: Badges & Company */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>مهلت منقضی / آزاد</span>
                        </span>
                        {cust.province && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#242424] text-[#A7A7A7] border border-[#333]">
                            {cust.province} {cust.city ? `• ${cust.city}` : ''}
                          </span>
                        )}
                      </div>
                      <h4
                        onClick={() => onSelectCustomer(cust)}
                        className="text-base font-black text-white hover:text-[#1DB954] cursor-pointer truncate transition-colors"
                        title={cust.company_name}
                      >
                        {cust.company_name}
                      </h4>
                      <p className="text-xs text-[#888] truncate mt-0.5">
                        {cust.business_type || 'صنف نامشخص'}
                      </p>
                    </div>

                    {/* Interview Score badge */}
                    {cust.interview_score ? (
                      <div className="flex items-center gap-1 px-2 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono font-bold flex-shrink-0">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>{toPersianDigits(cust.interview_score)}</span>
                      </div>
                    ) : null}
                  </div>

                  {/* Manager and Direct Contacts */}
                  <div className="bg-[#141414] border border-[#262626] rounded-xl p-3 space-y-2 mb-3 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[#B3B3B3]">
                        <User className="w-3.5 h-3.5 text-[#888]" />
                        <span className="truncate">{cust.manager_name || 'مدیریت ثبت نشده'}</span>
                      </div>
                      {cust.status && (
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${getStatusBadgeClass(cust.status)}`}>
                          {formatStatusLabel(cust.status)}
                        </span>
                      )}
                    </div>

                    {primaryPhone && (
                      <div className="flex items-center justify-between pt-1.5 border-t border-[#222]">
                        <div className="flex items-center gap-1.5 font-mono text-white text-xs">
                          <Phone className="w-3.5 h-3.5 text-[#1DB954]" />
                          <span>{toPersianDigits(primaryPhone)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => copyToClipboard(primaryPhone, 'شماره تماس')}
                            className="p-1 text-[#888] hover:text-white hover:bg-[#222] rounded transition-colors"
                            title="کپی شماره"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <a
                            href={`tel:${primaryPhone}`}
                            className="p-1 text-[#1DB954] hover:bg-[#1DB954]/15 rounded transition-colors"
                            title="تماس مستقیم"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Previous Marketer & Expiration Info */}
                  <div className="text-[11px] text-[#888] space-y-1 mb-3 bg-[#161616] p-2.5 rounded-lg border border-[#222]">
                    <div className="flex items-center justify-between">
                      <span>بازاریاب قبلی:</span>
                      <span className="font-semibold text-white">
                        {cust.assigned_marketer_name || 'تخصیص نیافته'}
                      </span>
                    </div>
                    {cust.assignment_deadline && (
                      <div className="flex items-center justify-between">
                        <span>تاریخ پایان مهلت:</span>
                        <span className="font-mono text-amber-400">
                          {formatPersianDate(cust.assignment_deadline)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Expandable Previous Reports Preview */}
                  <div className="border-t border-[#262626] pt-2 mb-3">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedReportCustId((prev) => (prev === cust.id ? null : cust.id))
                      }
                      className="w-full flex items-center justify-between text-xs font-semibold text-[#B3B3B3] hover:text-white py-1 group-hover:text-white transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        <MessageSquareText className="w-3.5 h-3.5 text-[#1DB954]" />
                        <span>تاریخچه مذاکرات قبلی ({toPersianDigits(custReports.length)} گزارش)</span>
                      </div>
                      {isReportsExpanded ? (
                        <ChevronUp className="w-4 h-4 text-[#888]" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-[#888]" />
                      )}
                    </button>

                    {isReportsExpanded && (
                      <div className="mt-2 space-y-2 max-h-56 overflow-y-auto pr-1">
                        {custReports.length === 0 ? (
                          <p className="text-[11px] text-[#666] py-2 text-center">
                            هیچ گزارش مذاکره‌ای برای این مشتری ثبت نشده است.
                          </p>
                        ) : (
                          custReports.map((r) => (
                            <div
                              key={r.id}
                              className="bg-[#121212] border border-[#252525] rounded-xl p-2.5 text-[11px] space-y-1.5"
                            >
                              <div className="flex items-center justify-between text-[10px] text-[#888]">
                                <span className="text-[#1DB954] font-bold">{r.negotiator_name}</span>
                                <span className="font-mono">{formatPersianDateTime(r.date_created)}</span>
                              </div>
                              <p className="text-white line-clamp-3 leading-relaxed">
                                {r.report_text}
                              </p>
                              <div className="flex items-center justify-between text-[10px] pt-1 border-t border-[#1e1e1e]">
                                <span className="text-[#888]">
                                  وضعیت: {formatStatusLabel(r.negotiation_status)}
                                </span>
                                {r.negotiation_score && (
                                  <span className="font-mono text-amber-400">
                                    امتیاز: {toPersianDigits(r.negotiation_score)} از ۱۰
                                  </span>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action: Claim Customer */}
                <div className="pt-2 border-t border-[#262626]">
                  <button
                    onClick={() => setClaimingCustomer(cust)}
                    disabled={!canClaim}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg ${
                      canClaim
                        ? 'bg-[#1DB954] hover:bg-[#1ed760] text-black shadow-[#1DB954]/20 hover:scale-[1.01] active:scale-[0.99]'
                        : 'bg-[#282828] text-[#777] cursor-not-allowed border border-[#333]'
                    }`}
                  >
                    <Unlock className="w-4 h-4" />
                    <span>اختصاص پرونده به من (۱۰ روز مهلت)</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-[#181818] border border-[#282828] rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#141414] text-[#888] border-b border-[#282828]">
                <tr>
                  <th className="py-3 px-4 font-bold">شرکت / صنف</th>
                  <th className="py-3 px-4 font-bold">مدیریت و تماس</th>
                  <th className="py-3 px-4 font-bold">استان / شهر</th>
                  <th className="py-3 px-4 font-bold">بازاریاب قبلی</th>
                  <th className="py-3 px-4 font-bold">وضعیت</th>
                  <th className="py-3 px-4 font-bold">گزارشات قبلی</th>
                  <th className="py-3 px-4 font-bold text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#242424]">
                {filteredFreeCustomers.map((cust) => {
                  const custReports = customerReportsMap.get(cust.id) || [];
                  const primaryPhone = cust.manager_phones?.[0] || cust.mobile_numbers?.[0] || '';

                  return (
                    <tr key={cust.id} className="hover:bg-[#1e1e1e] transition-colors">
                      <td className="py-3.5 px-4">
                        <div
                          onClick={() => onSelectCustomer(cust)}
                          className="font-bold text-white hover:text-[#1DB954] cursor-pointer"
                        >
                          {cust.company_name}
                        </div>
                        <div className="text-[11px] text-[#777] mt-0.5">
                          {cust.business_type || 'صنف نامشخص'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-white">{cust.manager_name || '-'}</div>
                        {primaryPhone && (
                          <div className="text-[11px] font-mono text-[#1DB954] mt-0.5">
                            {toPersianDigits(primaryPhone)}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-[#B3B3B3]">
                        {cust.province || '-'}
                        {cust.city ? ` / ${cust.city}` : ''}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-white font-semibold">
                          {cust.assigned_marketer_name || 'تخصیص نیافته'}
                        </span>
                        {cust.assignment_deadline && (
                          <div className="text-[10px] font-mono text-amber-400/90 mt-0.5">
                            انقضا: {formatPersianDate(cust.assignment_deadline)}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${getStatusBadgeClass(cust.status)}`}>
                          {formatStatusLabel(cust.status)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => {
                            onSelectCustomer(cust);
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#222] hover:bg-[#282828] text-xs text-[#B3B3B3] hover:text-white transition-colors"
                        >
                          <MessageSquareText className="w-3.5 h-3.5 text-[#1DB954]" />
                          <span>{toPersianDigits(custReports.length)} گزارش</span>
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => setClaimingCustomer(cust)}
                          disabled={!canClaim}
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                            canClaim
                              ? 'bg-[#1DB954] hover:bg-[#1ed760] text-black shadow-md shadow-[#1DB954]/20'
                              : 'bg-[#282828] text-[#666] cursor-not-allowed'
                          }`}
                        >
                          اختصاص به من
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. MODAL: Claim Customer Confirmation                          */}
      {/* ------------------------------------------------------------- */}
      {claimingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#181818] border border-[#282828] rounded-2xl max-w-md w-full p-5 sm:p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-[#282828] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#1DB954]/15 border border-[#1DB954]/30 flex items-center justify-center text-[#1DB954]">
                  <Unlock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">اختصاص پرونده از حوضچه آزاد</h3>
                  <p className="text-[11px] text-[#888]">تخصیص مشتری به شما با مهلت پیگیری جدید</p>
                </div>
              </div>
              <button
                onClick={() => setClaimingCustomer(null)}
                className="text-[#888] hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Customer Details Box */}
            <div className="bg-[#141414] border border-[#262626] rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#888]">نام شرکت / کسب‌وکار:</span>
                <span className="font-bold text-white text-sm">{claimingCustomer.company_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#888]">مدیریت:</span>
                <span className="text-white">{claimingCustomer.manager_name || 'نامشخص'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#888]">بازاریاب قبلی:</span>
                <span className="text-amber-400 font-semibold">
                  {claimingCustomer.assigned_marketer_name || 'تخصیص نیافته'}
                </span>
              </div>
            </div>

            {/* Select Deadline Days */}
            <div>
              <label className="block text-xs font-semibold text-[#B3B3B3] mb-2">
                مهلت پیگیری اختصاص‌یافته:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[7, 10, 14].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setClaimDurationDays(d)}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      claimDurationDays === d
                        ? 'bg-[#1DB954] text-black border-[#1DB954] shadow-md shadow-[#1DB954]/20'
                        : 'bg-[#141414] text-[#B3B3B3] border-[#282828] hover:border-[#383838]'
                    }`}
                  >
                    {toPersianDigits(d)} روزه
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-[#777] mt-1.5">
                پس از گذشت این مدت، در صورت عدم ثبت قرارداد مجدداً به حوضچه مشتریان آزاد بازمی‌گردد.
              </p>
            </div>

            {/* Confirm Actions */}
            <div className="flex justify-end gap-2 pt-3 border-t border-[#282828]">
              <button
                type="button"
                onClick={() => setClaimingCustomer(null)}
                disabled={isProcessingClaim}
                className="px-4 py-2 rounded-xl bg-[#242424] hover:bg-[#2c2c2c] text-white text-xs font-bold transition-colors"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleConfirmClaim}
                disabled={isProcessingClaim}
                className="px-5 py-2 rounded-xl bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold text-xs transition-all shadow-lg shadow-[#1DB954]/20 flex items-center gap-1.5"
              >
                {isProcessingClaim ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>در حال اختصاص...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>تایید و برداشت پرونده</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 5. MODAL: Admin Limit Setting                                  */}
      {/* ------------------------------------------------------------- */}
      {isEditingLimit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#181818] border border-[#282828] rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#282828] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Settings className="w-4 h-4 text-[#1DB954]" />
                <span>تنظیم سقف سهمیه برداشت آزاد</span>
              </h3>
              <button onClick={() => setIsEditingLimit(false)} className="text-[#888] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
                حداکثر پرونده فعال بدون موفقیت (سقف سهمیه):
              </label>
              <input
                type="number"
                min="1"
                max="200"
                value={tempLimit}
                onChange={(e) => setTempLimit(parseInt(e.target.value, 10) || 1)}
                className="w-full h-10 px-3 bg-[#141414] border border-[#282828] rounded-xl text-white font-mono text-sm focus:border-[#1DB954] focus:outline-none"
              />
              <p className="text-[11px] text-[#777] mt-1.5">
                تعداد پرونده‌های آزادی که هر بازاریاب قبل از ثبت حداقل ۱ قرارداد موفق می‌تواند همزمان به خود اختصاص دهد (پیش‌فرض: ۲۰).
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#282828]">
              <button
                type="button"
                onClick={() => setIsEditingLimit(false)}
                className="px-4 py-2 rounded-xl bg-[#242424] text-white text-xs font-bold"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleSaveClaimLimit}
                className="px-5 py-2 rounded-xl bg-[#1DB954] text-black text-xs font-bold hover:bg-[#1ed760]"
              >
                ذخیره تغییرات
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
