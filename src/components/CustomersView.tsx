import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  Clock,
  AlertTriangle,
  Phone,
  Send,
  Instagram,
  Plus,
  ArrowUpDown,
  Building,
  CheckCircle2,
  ExternalLink,
  ChevronLeft,
  GitMerge,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  LayoutGrid,
  List,
  Loader2,
  Calendar,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Customer, Personnel, NegotiationStatus, AuthUser } from '../types';
import { formatTimeRemaining, formatPersianDate, formatDisplayDate, formatDisplayDateOnly, formatFollowupRelativeBadge, getStatusTheme, formatStatusLabel, NEGOTIATION_STATUS_OPTIONS, toPersianDigits } from '../utils';
import { fetchCustomersPaginated } from '../api';
import { PaginationControl } from './PaginationControl';

interface CustomersViewProps {
  customers: Customer[];
  personnelList: Personnel[];
  currentPersonnel?: Personnel | null;
  currentUser?: AuthUser | null;
  isAdmin?: boolean;
  onSelectCustomer: (customer: Customer) => void;
  onOpenNewCustomerModal: () => void;
  onOpenMergeModal?: () => void;
  selectedMarketerId: string;
  onSelectMarketerId: (id: string) => void;
  statusFilter: string;
  onSelectStatusFilter: (status: string) => void;
  showExpiredOnly: boolean;
  onToggleExpiredOnly: (val: boolean) => void;
  activeTenantId?: string;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers,
  personnelList,
  currentPersonnel,
  currentUser,
  isAdmin,
  onSelectCustomer,
  onOpenNewCustomerModal,
  onOpenMergeModal,
  selectedMarketerId,
  onSelectMarketerId,
  statusFilter,
  onSelectStatusFilter,
  showExpiredOnly,
  onToggleExpiredOnly,
  activeTenantId,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOption, setSortOption] = useState<string>('next_followup_asc');
  const [followupFilter, setFollowupFilter] = useState<string>('همه');
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState<boolean>(false);

  const [items, setItems] = useState<Customer[]>(customers);
  const [totalCount, setTotalCount] = useState<number>(customers.length);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isLoadingPage, setIsLoadingPage] = useState<boolean>(false);

  // Listen to customer save/update/delete events to immediately refresh server pagination
  useEffect(() => {
    const handleSaved = () => {
      fetchCustomersPaginated({
        page: currentPage,
        limit: pageSize,
        search: searchQuery.trim(),
        status: statusFilter !== 'همه' ? statusFilter : undefined,
        marketer_id: selectedMarketerId !== 'همه' ? selectedMarketerId : undefined,
        expired_only: showExpiredOnly,
        followup_filter: followupFilter !== 'همه' ? followupFilter : undefined,
        sort: sortOption,
      })
        .then((res) => {
          setItems(res.data);
          setTotalCount(res.meta.filter_count);
          setTotalPages(res.meta.total_pages);
        })
        .catch(() => {});
    };

    const handleDeleted = () => {
      fetchCustomersPaginated({
        page: currentPage,
        limit: pageSize,
        search: searchQuery.trim(),
        status: statusFilter !== 'همه' ? statusFilter : undefined,
        marketer_id: selectedMarketerId !== 'همه' ? selectedMarketerId : undefined,
        expired_only: showExpiredOnly,
        followup_filter: followupFilter !== 'همه' ? followupFilter : undefined,
        sort: sortOption,
      })
        .then((res) => {
          setItems(res.data);
          setTotalCount(res.meta.filter_count);
          setTotalPages(res.meta.total_pages);
        })
        .catch(() => {});
    };

    window.addEventListener('crm_customer_saved', handleSaved);
    window.addEventListener('crm_customer_deleted', handleDeleted);
    return () => {
      window.removeEventListener('crm_customer_saved', handleSaved);
      window.removeEventListener('crm_customer_deleted', handleDeleted);
    };
  }, [currentPage, pageSize, statusFilter, selectedMarketerId, showExpiredOnly, followupFilter, searchQuery, activeTenantId, sortOption]);

  // Reset page to 1 when filters, search, sort or tenant change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, selectedMarketerId, showExpiredOnly, followupFilter, searchQuery, activeTenantId, sortOption]);

  // Fetch server-side paginated items on filter, tenant, sort or page change
  useEffect(() => {
    let isMounted = true;
    setIsLoadingPage(true);

    fetchCustomersPaginated({
      page: currentPage,
      limit: pageSize,
      search: searchQuery.trim(),
      status: statusFilter !== 'همه' ? statusFilter : undefined,
      marketer_id: selectedMarketerId !== 'همه' ? selectedMarketerId : undefined,
      expired_only: showExpiredOnly,
      followup_filter: followupFilter !== 'همه' ? followupFilter : undefined,
      sort: sortOption,
    })
      .then((res) => {
        if (isMounted) {
          setItems(res.data);
          setTotalCount(res.meta.filter_count);
          setTotalPages(res.meta.total_pages);
        }
      })
      .catch((err) => console.warn('Failed to load paginated customers:', err))
      .finally(() => {
        if (isMounted) setIsLoadingPage(false);
      });

    return () => {
      isMounted = false;
    };
  }, [currentPage, pageSize, statusFilter, selectedMarketerId, showExpiredOnly, followupFilter, searchQuery, activeTenantId, sortOption]);

  const userIsAdmin = Boolean(
    isAdmin ||
      currentUser?.is_admin ||
      currentUser?.app_role === 'admin' ||
      currentUser?.app_role === 'sales_manager' ||
      currentPersonnel?.role === 'admin' ||
      currentPersonnel?.role === 'sales_manager'
  );

  return (
    <div className="space-y-6">
      {/* Top Title & Quick Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>مدیریت مشتریان و پرونده‌ها</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-[#1DB954]/15 dark:text-[#1DB954] border border-emerald-200 dark:border-transparent font-bold">
              {toPersianDigits(totalCount)} پرونده
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-[#A7A7A7] mt-1">
            لیست مشتریان ثبت شده، اختصاص یافته به بازاریاب‌ها همراه با تایمر انقضای مهلت
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Expired Filter Toggle */}
          <button
            onClick={() => onToggleExpiredOnly(!showExpiredOnly)}
            className={`h-9 px-3 sm:px-3.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              showExpiredOnly
                ? 'bg-[#E22134] text-white shadow-lg shadow-[#E22134]/30'
                : 'bg-white dark:bg-[#282828] text-slate-700 dark:text-[#B3B3B3] hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-[#3e3e3e] shadow-xs'
            }`}
            title="نمایش پرونده‌های با مهلت منقضی شده"
          >
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-amber-500 dark:text-current" />
            <span className="hidden sm:inline">منقضی شده‌ها</span>
          </button>

          {/* Merge Customers Button - Admin only */}
          {userIsAdmin && onOpenMergeModal && (
            <button
              onClick={onOpenMergeModal}
              className="h-9 px-3 sm:px-4 rounded-full bg-white hover:bg-emerald-50 dark:bg-[#282828] dark:hover:bg-[#1DB954] text-slate-700 hover:text-emerald-800 dark:text-[#B3B3B3] dark:hover:text-black font-bold text-xs transition-all border border-slate-200 hover:border-emerald-300 dark:border-[#3e3e3e] dark:hover:border-[#1DB954] flex items-center gap-1.5 flex-shrink-0 cursor-pointer shadow-xs"
              title="ادغام پرونده‌های مشتریان تکراری"
            >
              <GitMerge className="w-3.5 h-3.5" />
              <span>ادغام پرونده‌ها</span>
            </button>
          )}

          {/* New Customer Button (Icon only) */}
          <button
            onClick={onOpenNewCustomerModal}
            className="w-9 h-9 rounded-full bg-[#1DB954] hover:bg-[#1ED760] text-black font-bold flex items-center justify-center transition-all hover:scale-105 shadow-md shadow-[#1DB954]/20 flex-shrink-0 cursor-pointer"
            title="ثبت مشتری جدید"
            aria-label="ثبت مشتری جدید"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
          </button>
        </div>
      </div>

      {/* Clean Responsive Filter Toolbar */}
      <div className="bg-white dark:bg-[#181818] rounded-2xl border border-slate-200 dark:border-[#282828] shadow-xs overflow-hidden">
        {/* Main Bar: Search, Mobile Filter Toggle, View Mode, Count */}
        <div className="p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3">
          {/* Search Input - Full width on small screens, fixed on md+ */}
          <div className="relative flex-1 min-w-[200px] sm:min-w-[260px] max-w-full sm:max-w-md">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو در نام، برند، شماره تلفن، شهر..."
              className="h-10 w-full pl-9 pr-3 rounded-xl bg-slate-50 dark:bg-[#242424] text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#777] border border-slate-200 dark:border-[#383838] focus:outline-none focus:border-emerald-500 dark:focus:border-[#1DB954] transition-colors"
            />
            <Search className="w-4 h-4 text-slate-400 dark:text-[#777] absolute left-3 top-3 pointer-events-none" />
          </div>

          {/* Quick Actions Strip */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* Mobile Filter Toggle Button (Shown on mobile, hidden on lg screens where filters are always visible) */}
            <button
              type="button"
              onClick={() => setIsMobileFiltersOpen(!isMobileFiltersOpen)}
              className={`lg:hidden h-10 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border ${
                isMobileFiltersOpen || statusFilter !== 'همه' || selectedMarketerId !== 'همه' || followupFilter !== 'همه'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-[#1DB954]/15 dark:text-[#1DB954] dark:border-[#1DB954]/40'
                  : 'bg-slate-50 dark:bg-[#242424] text-slate-700 dark:text-[#ccc] border-slate-200 dark:border-[#383838] hover:bg-slate-100'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-600 dark:text-[#1DB954]" />
              <span>فیلترها</span>
              {(statusFilter !== 'همه' || selectedMarketerId !== 'همه' || followupFilter !== 'همه') && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-[#1DB954]" />
              )}
              {isMobileFiltersOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {/* View Mode Toggle: List vs Card Grid */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#121212] p-1 rounded-xl border border-slate-200 dark:border-[#2c2c2c]">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-emerald-500 dark:bg-[#1DB954] text-white dark:text-black font-bold shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:text-[#888] dark:hover:text-white'
                }`}
                title="نمایش لیستی (جدولی - دسکتاپ)"
              >
                <List className="w-3.5 h-3.5 stroke-[2.5]" />
                <span className="hidden sm:inline">لیست</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-emerald-500 dark:bg-[#1DB954] text-white dark:text-black font-bold shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:text-[#888] dark:hover:text-white'
                }`}
                title="نمایش کارتی (موبایل)"
              >
                <LayoutGrid className="w-3.5 h-3.5 stroke-[2.5]" />
                <span className="hidden sm:inline">کارت</span>
              </button>
            </div>

            {/* Page Size Dropdown */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 dark:text-[#888]">
              <span>تعداد:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="h-10 px-2 rounded-xl bg-slate-50 dark:bg-[#242424] text-xs text-slate-900 dark:text-white border border-slate-200 dark:border-[#383838] focus:outline-none focus:border-emerald-500 dark:focus:border-[#1DB954] cursor-pointer"
              >
                <option value="15" className="bg-white dark:bg-[#181818] text-slate-900 dark:text-white">۱۵</option>
                <option value="30" className="bg-white dark:bg-[#181818] text-slate-900 dark:text-white">۳۰</option>
                <option value="60" className="bg-white dark:bg-[#181818] text-slate-900 dark:text-white">۶۰</option>
                <option value="100" className="bg-white dark:bg-[#181818] text-slate-900 dark:text-white">۱۰۰</option>
              </select>
            </div>

            <div className="text-xs text-slate-500 dark:text-[#888888] font-mono whitespace-nowrap">
              کل: <span className="text-emerald-600 dark:text-[#1DB954] font-bold">{toPersianDigits(totalCount)}</span>
            </div>
          </div>
        </div>

        {/* Filter Dropdowns Tray: Always visible on desktop (lg:flex), Collapsible toggle on mobile */}
        <div
          className={`${
            isMobileFiltersOpen ? 'flex' : 'hidden lg:flex'
          } p-3 sm:p-4 bg-slate-50/70 dark:bg-[#151515] border-t border-slate-200 dark:border-[#262626] flex-wrap items-center justify-between gap-3 animate-in fade-in transition-all`}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:items-center gap-2.5 sm:gap-3 w-full lg:w-auto">
            {/* Marketer Dropdown - ONLY for Admin */}
            {userIsAdmin && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5">
                <span className="text-[11px] text-slate-500 dark:text-[#A7A7A7] flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5 text-emerald-600 dark:text-[#1DB954]" />
                  <span>بازاریاب:</span>
                </span>
                <select
                  value={selectedMarketerId}
                  onChange={(e) => onSelectMarketerId(e.target.value)}
                  className="h-9 px-3 rounded-xl bg-white dark:bg-[#242424] text-xs text-slate-900 dark:text-white border border-slate-200 dark:border-[#383838] focus:outline-none focus:border-emerald-500 dark:focus:border-[#1DB954] cursor-pointer w-full sm:w-auto"
                >
                  <option value="همه" className="bg-white dark:bg-[#181818] text-slate-900 dark:text-white">همه بازاریاب‌ها</option>
                  {personnelList.map((p) => (
                    <option key={p.id} value={p.id} className="bg-white dark:bg-[#181818] text-slate-900 dark:text-white">
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Status Dropdown */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5">
              <span className="text-[11px] text-slate-500 dark:text-[#A7A7A7]">وضعیت پرونده:</span>
              <select
                value={statusFilter}
                onChange={(e) => onSelectStatusFilter(e.target.value)}
                className="h-9 px-3 rounded-xl bg-white dark:bg-[#242424] text-xs text-slate-900 dark:text-white border border-slate-200 dark:border-[#383838] focus:outline-none focus:border-emerald-500 dark:focus:border-[#1DB954] cursor-pointer w-full sm:w-auto"
              >
                <option value="همه" className="bg-white dark:bg-[#181818] text-slate-900 dark:text-white">همه وضعیت‌ها</option>
                {NEGOTIATION_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-white dark:bg-[#181818] text-slate-900 dark:text-white">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Follow-up Filter Dropdown */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5">
              <span className="text-[11px] text-slate-500 dark:text-[#A7A7A7] flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-[#1DB954]" />
                <span>موعد پیگیری:</span>
              </span>
              <select
                value={followupFilter}
                onChange={(e) => setFollowupFilter(e.target.value)}
                className="h-9 px-3 rounded-xl bg-white dark:bg-[#242424] text-xs text-slate-900 dark:text-white border border-slate-200 dark:border-[#383838] focus:outline-none focus:border-emerald-500 dark:focus:border-[#1DB954] cursor-pointer w-full sm:w-auto"
              >
                <option value="همه" className="bg-white dark:bg-[#181818] text-slate-900 dark:text-white">همه موعدها</option>
                <option value="active" className="bg-white dark:bg-[#181818] text-slate-900 dark:text-white">دارای پیگیری آینده</option>
                <option value="today" className="bg-white dark:bg-[#181818] text-slate-900 dark:text-white">پیگیری امروز</option>
                <option value="due_3_days" className="bg-white dark:bg-[#181818] text-slate-900 dark:text-white">سررسید ۳ روز آینده</option>
                <option value="due_7_days" className="bg-white dark:bg-[#181818] text-slate-900 dark:text-white">سررسید ۷ روز آینده</option>
                <option value="overdue" className="bg-white dark:bg-[#181818] text-slate-900 dark:text-white">عقب‌افتاده / منقضی</option>
                <option value="no_followup" className="bg-white dark:bg-[#181818] text-slate-900 dark:text-white">بدون موعد پیگیری</option>
              </select>
            </div>

            {/* Sort Dropdown */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5">
              <span className="text-[11px] text-slate-500 dark:text-[#A7A7A7] flex items-center gap-1">
                <ArrowUpDown className="w-3.5 h-3.5 text-emerald-600 dark:text-[#1DB954]" />
                <span>مرتب‌سازی:</span>
              </span>
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="h-9 px-3 rounded-xl bg-white dark:bg-[#242424] text-xs text-slate-900 dark:text-white border border-slate-200 dark:border-[#383838] focus:outline-none focus:border-emerald-500 dark:focus:border-[#1DB954] cursor-pointer font-medium w-full sm:w-auto"
              >
                <option value="next_followup_asc" className="bg-white dark:bg-[#181818] text-slate-900 dark:text-white">نزدیک‌ترین موعد پیگیری</option>
                <option value="next_followup_desc" className="bg-white dark:bg-[#181818] text-slate-900 dark:text-white">دورترین موعد پیگیری</option>
                <option value="date_created_desc" className="bg-white dark:bg-[#181818] text-slate-900 dark:text-white">جدیدترین ثبت</option>
                <option value="company_name_asc" className="bg-white dark:bg-[#181818] text-slate-900 dark:text-white">نام برند (الف - ی)</option>
                <option value="deadline_asc" className="bg-white dark:bg-[#181818] text-slate-900 dark:text-white">مهلت مالکیت</option>
              </select>
            </div>
          </div>

          {/* Reset Filters shortcut if filters are active */}
          {(statusFilter !== 'همه' || selectedMarketerId !== 'همه' || followupFilter !== 'همه') && (
            <button
              type="button"
              onClick={() => {
                onSelectStatusFilter('همه');
                onSelectMarketerId('همه');
                setFollowupFilter('همه');
              }}
              className="text-xs text-rose-600 dark:text-rose-400 hover:underline font-semibold cursor-pointer py-1"
            >
              پاک کردن همه فیلترها
            </button>
          )}
        </div>
      </div>

      {/* Customers Content: Table List or Card Grid */}
      {isLoadingPage && items.length === 0 ? (
        <div className="p-16 text-center bg-white dark:bg-[#181818] rounded-2xl border border-slate-200 dark:border-[#282828] space-y-3 shadow-xs">
          <Loader2 className="w-8 h-8 text-emerald-600 dark:text-[#1DB954] animate-spin mx-auto" />
          <p className="text-xs text-slate-500 dark:text-[#A7A7A7]">در حال بارگذاری پرونده‌های مشتریان...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-[#181818] rounded-2xl border border-slate-200 dark:border-[#282828] space-y-4 shadow-xs">
          <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-[#282828] flex items-center justify-center text-slate-400 dark:text-[#535353] mx-auto">
            <Users className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">مشتری با مشخصات فیلتر شده یافت نشد</h3>
            <p className="text-xs text-slate-500 dark:text-[#A7A7A7] mt-1">
              می‌توانید فیلترها را تغییر داده یا مشتری جدیدی به سامانه اضافه نمایید.
            </p>
          </div>
          <button
            onClick={onOpenNewCustomerModal}
            className="px-5 py-2 rounded-full bg-[#1DB954] text-black font-bold text-xs hover:bg-[#1ED760] transition-transform hover:scale-105 cursor-pointer shadow-md shadow-[#1DB954]/20"
          >
            ثبت پرونده مشتری جدید
          </button>
        </div>
      ) : (
        <div className={isLoadingPage ? 'opacity-50 pointer-events-none transition-opacity' : ''}>
          {/* DESKTOP TABLE LIST VIEW (Visible on md screens and above when viewMode is table) */}
          <div className={`${viewMode === 'table' ? 'hidden md:block' : 'hidden'} bg-white dark:bg-[#181818] border border-slate-200 dark:border-[#282828] rounded-2xl overflow-hidden shadow-xs dark:shadow-xl`}>
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-[#141414] border-b border-slate-200 dark:border-[#282828] text-slate-500 dark:text-[#888888] text-xs font-semibold">
                    <th className="py-3.5 px-4">مدیر کسب‌وکار (عنوان اصلی) و نام برند</th>
                    <th className="py-3.5 px-4">وضعیت پرونده</th>
                    <th className="py-3.5 px-4">بازاریاب مسئول</th>
                    <th className="py-3.5 px-4">موعد پیگیری</th>
                    <th className="py-3.5 px-4">تاریخ انقضا</th>
                    <th className="py-3.5 px-4">ارتباط سریع</th>
                    <th className="py-3.5 px-4 text-left">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#222222] text-xs text-slate-700 dark:text-[#CCCCCC]">
                  {items.map((c) => {
                    const timer = formatTimeRemaining(c.assignment_deadline);
                    const statusTheme = getStatusTheme(c.status);
                    const fBadge = formatFollowupRelativeBadge(c.next_followup_date);

                    const contactsArr = Array.isArray(c.contacts) ? c.contacts : [];
                    const mobilesArr = Array.isArray(c.mobile_numbers) ? c.mobile_numbers : [];
                    const telegramsArr = Array.isArray(c.telegram_ids) ? c.telegram_ids : [];
                    const instasArr = Array.isArray(c.instagram_ids) ? c.instagram_ids : [];

                    const primaryPhone =
                      contactsArr.find((ct) => ct && (ct.channel_type === 'mobile' || ct.channel_type === 'landline'))
                        ?.value || mobilesArr[0] || '';
                    const primaryTelegram =
                      contactsArr.find((ct) => ct && ct.channel_type === 'telegram')?.value ||
                      c.telegram_phone ||
                      telegramsArr[0] || '';
                    const primaryInsta =
                      contactsArr.find((ct) => ct && ct.channel_type === 'instagram')?.value ||
                      instasArr[0] || '';

                    return (
                      <tr
                        key={c.id}
                        onClick={() => onSelectCustomer(c)}
                        className="hover:bg-slate-50/80 dark:hover:bg-[#202020] transition-colors cursor-pointer group"
                      >
                        {/* Primary Title: Manager Name */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-[#1DB954] transition-colors flex items-center gap-1.5">
                            <Building className="w-3.5 h-3.5 text-emerald-600 dark:text-[#1DB954] flex-shrink-0" />
                            <span>{c.manager_name || 'مدیریت نامشخص'}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-[#888888] mt-0.5 flex items-center gap-1 flex-wrap">
                            <span className="text-slate-700 dark:text-[#A7A7A7] font-semibold">برند/کسب‌وکار: {c.company_name}</span>
                            {c.business_type && <span>· {c.business_type}</span>}
                            {c.city && <span>· {c.city}</span>}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex text-[11px] px-2.5 py-0.5 rounded-full border ${statusTheme.bg} ${statusTheme.color} font-medium`}
                          >
                            {formatStatusLabel(c.status)}
                          </span>
                        </td>

                        {/* Marketer */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-900 dark:text-white font-medium">
                          {c.assigned_marketer_name || 'تخصیص نیافته'}
                        </td>

                        {/* Next Follow-up Date (Day, Month, Year only + Relative Badge) */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {c.next_followup_date ? (
                            <div className="flex items-center gap-1.5 text-xs text-slate-800 dark:text-white font-medium">
                              <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-[#1DB954] flex-shrink-0" />
                              <span className="font-mono">{formatDisplayDateOnly(c.next_followup_date)}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-sans font-medium ${fBadge.badgeClass}`}>
                                {fBadge.text}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 dark:text-[#666]">ثبت نشده</span>
                          )}
                        </td>

                        {/* Expiry Timer */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-mono ${timer.badgeClass}`}>
                            {timer.text}
                          </span>
                        </td>

                        {/* Quick Contacts */}
                        <td className="py-3.5 px-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1.5">
                            {primaryPhone && (
                              <a
                                href={`tel:${primaryPhone}`}
                                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-emerald-500 hover:text-white dark:bg-[#242424] dark:hover:bg-[#1DB954] dark:hover:text-black text-slate-600 dark:text-[#A7A7A7] flex items-center justify-center transition-colors border border-slate-200 dark:border-transparent"
                                title={`تماس با ${primaryPhone}`}
                              >
                                <Phone className="w-3.5 h-3.5" />
                              </a>
                            )}
                            {primaryTelegram && (
                              <a
                                href={
                                  /^09\d{9}$/.test(primaryTelegram)
                                    ? `https://t.me/+98${primaryTelegram.substring(1)}`
                                    : `https://t.me/${primaryTelegram.replace(/^@/, '')}`
                                }
                                target="_blank"
                                rel="noreferrer"
                                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-[#229ED9] hover:text-white dark:bg-[#242424] dark:hover:bg-[#229ED9] text-slate-600 dark:text-[#A7A7A7] flex items-center justify-center transition-colors border border-slate-200 dark:border-transparent"
                                title="پیام در تلگرام"
                              >
                                <Send className="w-3.5 h-3.5" />
                              </a>
                            )}
                            {primaryInsta && (
                              <a
                                href={`https://instagram.com/${primaryInsta.replace(/^@/, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-[#E1306C] hover:text-white dark:bg-[#242424] dark:hover:bg-[#E1306C] text-slate-600 dark:text-[#A7A7A7] flex items-center justify-center transition-colors border border-slate-200 dark:border-transparent"
                                title="پیج اینستاگرام"
                              >
                                <Instagram className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </td>

                        {/* Action */}
                        <td className="py-3.5 px-4 text-left whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onSelectCustomer(c);
                            }}
                            className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-emerald-500 hover:text-white dark:bg-[#242424] dark:hover:bg-[#1DB954] text-slate-700 dark:text-[#A7A7A7] dark:hover:text-black font-bold text-xs transition-colors flex items-center gap-1 ml-auto border border-slate-200 dark:border-transparent cursor-pointer shadow-xs"
                          >
                            <span>مشاهده</span>
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* CARD GRID VIEW (Visible on mobile, or when viewMode === 'grid' on desktop) */}
          <div className={`${viewMode === 'table' ? 'block md:hidden' : 'block'} grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5`}>
          {items.map((c) => {
            const timer = formatTimeRemaining(c.assignment_deadline);
            const statusTheme = getStatusTheme(c.status);

            return (
              <div
                key={c.id}
                onClick={() => onSelectCustomer(c)}
                className="bg-white hover:bg-slate-50/80 dark:bg-[#181818] dark:hover:bg-[#202020] rounded-2xl p-5 border border-slate-200 hover:border-slate-300 dark:border-[#282828] dark:hover:border-[#3e3e3e] shadow-xs transition-all cursor-pointer group flex flex-col justify-between space-y-4 relative"
              >
                {/* Top: Header & Badges */}
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      {/* Primary Title: Manager Name */}
                      <h3 className="font-bold text-slate-900 dark:text-white text-base group-hover:text-emerald-600 dark:group-hover:text-[#1DB954] transition-colors truncate">
                        {c.manager_name || 'مدیریت نامشخص'}
                      </h3>
                      {/* Subtitle: Business / Company Name */}
                      <div className="text-xs text-slate-500 dark:text-[#A7A7A7] truncate mt-0.5">
                        کسب‌وکار: <span className="text-slate-900 dark:text-white font-semibold">{c.company_name}</span> · {c.business_type || 'صنف نامشخص'} · {c.city}
                      </div>
                    </div>

                    {/* Status badge */}
                    <span
                      className={`text-[11px] px-2.5 py-0.5 rounded-full border ${statusTheme.bg} ${statusTheme.color} font-medium flex-shrink-0`}
                    >
                      {formatStatusLabel(c.status)}
                    </span>
                  </div>

                  {/* Interview Snippet */}
                  {c.interview_report && (
                    <p className="text-xs text-slate-600 dark:text-[#B3B3B3] line-clamp-2 leading-relaxed bg-slate-50 dark:bg-[#121212] p-2.5 rounded-lg border border-slate-200 dark:border-[#222]">
                      <span className="text-emerald-600 dark:text-[#1DB954] font-bold">مصاحبه: </span>
                      {c.interview_report}
                    </p>
                  )}
                </div>

                {/* Marketer & Deadline Timer */}
                <div className="pt-3 border-t border-slate-100 dark:border-[#282828] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-[#A7A7A7]">بازاریاب مسئول:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {c.assigned_marketer_name || 'تخصیص نیافته'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-[#A7A7A7] flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-[#1DB954]" />
                      <span>موعد پیگیری:</span>
                    </span>
                    <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white font-mono">
                      <span>{c.next_followup_date ? formatDisplayDateOnly(c.next_followup_date) : 'ثبت نشده'}</span>
                      {c.next_followup_date && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-sans font-medium ${formatFollowupRelativeBadge(c.next_followup_date).badgeClass}`}>
                          {formatFollowupRelativeBadge(c.next_followup_date).text}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-[#A7A7A7] flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-[#1DB954]" />
                      <span>تاریخ انقضا:</span>
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono ${timer.badgeClass}`}>
                      {timer.text}
                    </span>
                  </div>

                  {/* Quick Channels Strip */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2">
                      {(() => {
                        const contactsArr = Array.isArray(c.contacts) ? c.contacts : [];
                        const mobilesArr = Array.isArray(c.mobile_numbers) ? c.mobile_numbers : [];
                        const telegramsArr = Array.isArray(c.telegram_ids) ? c.telegram_ids : [];
                        const instasArr = Array.isArray(c.instagram_ids) ? c.instagram_ids : [];

                        const primaryPhone =
                          contactsArr.find((ct) => ct && (ct.channel_type === 'mobile' || ct.channel_type === 'landline'))
                            ?.value || mobilesArr[0] || '';
                        const primaryTelegram =
                          contactsArr.find((ct) => ct && ct.channel_type === 'telegram')?.value ||
                          c.telegram_phone ||
                          telegramsArr[0] || '';
                        const primaryInsta =
                          contactsArr.find((ct) => ct && ct.channel_type === 'instagram')?.value ||
                          instasArr[0] || '';

                        return (
                          <>
                            {primaryPhone && (
                              <a
                                href={`tel:${primaryPhone}`}
                                onClick={(e) => e.stopPropagation()}
                                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-emerald-500 hover:text-white dark:bg-[#282828] dark:hover:bg-[#1DB954] dark:hover:text-black text-slate-600 dark:text-[#B3B3B3] flex items-center justify-center transition-colors border border-slate-200 dark:border-transparent"
                                title={`تماس با ${primaryPhone}`}
                              >
                                <Phone className="w-3.5 h-3.5" />
                              </a>
                            )}
                            {primaryTelegram && (
                              <a
                                href={
                                  /^09\d{9}$/.test(primaryTelegram)
                                    ? `https://t.me/+98${primaryTelegram.substring(1)}`
                                    : `https://t.me/${primaryTelegram.replace(/^@/, '')}`
                                }
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-[#229ED9] hover:text-white dark:bg-[#282828] dark:hover:bg-[#229ED9] text-slate-600 dark:text-[#B3B3B3] flex items-center justify-center transition-colors border border-slate-200 dark:border-transparent"
                                title="ارسال پیام در تلگرام"
                              >
                                <Send className="w-3.5 h-3.5" />
                              </a>
                            )}
                            {primaryInsta && (
                              <a
                                href={`https://instagram.com/${primaryInsta.replace(/^@/, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-[#E1306C] hover:text-white dark:bg-[#282828] dark:hover:bg-[#E1306C] text-slate-600 dark:text-[#B3B3B3] flex items-center justify-center transition-colors border border-slate-200 dark:border-transparent"
                                title="مشاهده پیج اینستاگرام"
                              >
                                <Instagram className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </>
                        );
                      })()}
                    </div>

                    <div className="text-xs text-emerald-600 dark:text-[#1DB954] font-semibold group-hover:underline flex items-center gap-1">
                      <span>مشاهده پرونده</span>
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        </div>
      )}

      {/* Pagination Controls */}
      <PaginationControl
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={pageSize}
        displayedCount={items.length}
        isLoading={isLoadingPage}
        onPageChange={(p) => setCurrentPage(p)}
        label="پرونده مشتری"
      />
    </div>
  );
};
