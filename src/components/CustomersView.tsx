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
} from 'lucide-react';
import { Customer, Personnel, NegotiationStatus, AuthUser } from '../types';
import { formatTimeRemaining, formatPersianDate, getStatusTheme, formatStatusLabel, NEGOTIATION_STATUS_OPTIONS, toPersianDigits } from '../utils';
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

  const [items, setItems] = useState<Customer[]>(customers);
  const [totalCount, setTotalCount] = useState<number>(customers.length);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isLoadingPage, setIsLoadingPage] = useState<boolean>(false);

  // Listen to customer save/update events to immediately show changes without page reload
  useEffect(() => {
    const handleSaved = (e: any) => {
      const saved: Customer = e.detail;
      if (!saved || !saved.id) return;
      setItems((prev) => {
        const exists = prev.some((c) => c.id === saved.id);
        if (exists) {
          return prev.map((c) => (c.id === saved.id ? saved : c));
        }
        return [saved, ...prev];
      });
      setTotalCount((prev) => prev + 1);
    };
    window.addEventListener('crm_customer_saved', handleSaved);
    return () => window.removeEventListener('crm_customer_saved', handleSaved);
  }, []);

  // Sync initial items when customers prop updates
  useEffect(() => {
    if (customers && customers.length > 0 && items.length === 0) {
      setItems(customers);
      setTotalCount(customers.length);
    }
  }, [customers]);

  // Reset page to 1 when filters, search or tenant change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, selectedMarketerId, showExpiredOnly, searchQuery, activeTenantId]);

  // Fetch server-side paginated items on filter, tenant or page change
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
  }, [currentPage, pageSize, statusFilter, selectedMarketerId, showExpiredOnly, searchQuery, activeTenantId]);

  const userIsAdmin = Boolean(
    currentPersonnel
      ? currentPersonnel.role === 'admin' || currentPersonnel.role === 'sales_manager'
      : isAdmin ||
        currentUser?.is_admin ||
        currentUser?.app_role === 'admin' ||
        currentUser?.app_role === 'sales_manager'
  );

  return (
    <div className="space-y-6">
      {/* Top Title & Quick Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>مدیریت مشتریان و پرونده‌ها</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-[#1DB954]/15 text-[#1DB954] font-bold">
              {toPersianDigits(totalCount)} پرونده
            </span>
          </h2>
          <p className="text-xs text-[#A7A7A7] mt-1">
            لیست مشتریان ثبت شده، اختصاص یافته به بازاریاب‌ها همراه با تایمر انقضای مهلت
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Expired Filter Toggle */}
          <button
            onClick={() => onToggleExpiredOnly(!showExpiredOnly)}
            className={`h-9 px-3 sm:px-3.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
              showExpiredOnly
                ? 'bg-[#E22134] text-white shadow-lg shadow-[#E22134]/30'
                : 'bg-[#282828] text-[#B3B3B3] hover:text-white border border-[#3e3e3e]'
            }`}
            title="نمایش پرونده‌های با مهلت منقضی شده"
          >
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="hidden sm:inline">منقضی شده‌ها</span>
          </button>

          {/* Merge Customers Button - Admin only */}
          {userIsAdmin && onOpenMergeModal && (
            <button
              onClick={onOpenMergeModal}
              className="h-9 px-3 sm:px-4 rounded-full bg-[#282828] hover:bg-[#1DB954] text-[#B3B3B3] hover:text-black font-bold text-xs transition-all border border-[#3e3e3e] hover:border-[#1DB954] flex items-center gap-1.5 flex-shrink-0"
              title="ادغام پرونده‌های مشتریان تکراری"
            >
              <GitMerge className="w-3.5 h-3.5" />
              <span>ادغام پرونده‌ها</span>
            </button>
          )}

          {/* New Customer Button (Icon only) */}
          <button
            onClick={onOpenNewCustomerModal}
            className="w-9 h-9 rounded-full bg-[#1DB954] hover:bg-[#1ED760] text-black font-bold flex items-center justify-center transition-all hover:scale-105 shadow-md shadow-[#1DB954]/20 flex-shrink-0"
            title="ثبت مشتری جدید"
            aria-label="ثبت مشتری جدید"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
          </button>
        </div>
      </div>

      {/* Clean Single-Row Filter Toolbar: Dropdowns instead of tags */}
      <div className="p-3 sm:p-4 bg-[#181818] rounded-2xl border border-[#282828] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          {/* Marketer Dropdown - ONLY for Admin */}
          {userIsAdmin && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#A7A7A7] flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-[#1DB954]" />
                <span>بازاریاب:</span>
              </span>
              <select
                value={selectedMarketerId}
                onChange={(e) => onSelectMarketerId(e.target.value)}
                className="h-9 px-3 rounded-xl bg-[#282828] text-xs text-white border border-[#3e3e3e] focus:outline-none focus:border-[#1DB954] cursor-pointer"
              >
                <option value="همه">همه بازاریاب‌ها</option>
                {personnelList.map((p) => (
                  <option key={p.id} value={p.id} className="bg-[#181818] text-white">
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Status Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#A7A7A7]">وضعیت پرونده:</span>
            <select
              value={statusFilter}
              onChange={(e) => onSelectStatusFilter(e.target.value)}
              className="h-9 px-3 rounded-xl bg-[#282828] text-xs text-white border border-[#3e3e3e] focus:outline-none focus:border-[#1DB954] cursor-pointer"
            >
              <option value="همه" className="bg-[#181818] text-white">همه وضعیت‌ها</option>
              {NEGOTIATION_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-[#181818] text-white">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search input, View Mode & Pagination Size */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو در مدیر، برند، شماره یا شهر..."
              className="h-9 w-52 sm:w-64 pl-8 pr-3 rounded-xl bg-[#282828] text-xs text-white placeholder-[#777] border border-[#3e3e3e] focus:outline-none focus:border-[#1DB954]"
            />
            <Search className="w-3.5 h-3.5 text-[#777] absolute left-2.5 top-3 pointer-events-none" />
          </div>

          {/* View Mode Toggle: List vs Card Grid */}
          <div className="flex items-center gap-1 bg-[#121212] p-1 rounded-xl border border-[#2c2c2c]">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === 'table'
                  ? 'bg-[#1DB954] text-black font-bold shadow-md'
                  : 'text-[#888] hover:text-white'
              }`}
              title="نمایش لیستی (جدولی - دسکتاپ)"
            >
              <List className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">لیست</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === 'grid'
                  ? 'bg-[#1DB954] text-black font-bold shadow-md'
                  : 'text-[#888] hover:text-white'
              }`}
              title="نمایش کارتی (موبایل)"
            >
              <LayoutGrid className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">کارت</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-[#888]">
            <span>تعداد:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="h-9 px-2 rounded-xl bg-[#282828] text-xs text-white border border-[#3e3e3e] focus:outline-none focus:border-[#1DB954] cursor-pointer"
            >
              <option value="15">۱۵</option>
              <option value="30">۳۰</option>
              <option value="60">۶۰</option>
              <option value="100">۱۰۰</option>
            </select>
          </div>

          <div className="text-xs text-[#888888] font-mono">
            کل: <span className="text-[#1DB954] font-bold">{totalCount}</span> پرونده
          </div>
        </div>
      </div>

      {/* Customers Content: Table List or Card Grid */}
      {isLoadingPage && items.length === 0 ? (
        <div className="p-16 text-center bg-[#181818] rounded-2xl border border-[#282828] space-y-3">
          <Loader2 className="w-8 h-8 text-[#1DB954] animate-spin mx-auto" />
          <p className="text-xs text-[#A7A7A7]">در حال بارگذاری پرونده‌های مشتریان...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="p-12 text-center bg-[#181818] rounded-2xl border border-[#282828] space-y-4">
          <div className="w-14 h-14 rounded-full bg-[#282828] flex items-center justify-center text-[#535353] mx-auto">
            <Users className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">مشتری با مشخصات فیلتر شده یافت نشد</h3>
            <p className="text-xs text-[#A7A7A7] mt-1">
              می‌توانید فیلترها را تغییر داده یا مشتری جدیدی به سامانه اضافه نمایید.
            </p>
          </div>
          <button
            onClick={onOpenNewCustomerModal}
            className="px-5 py-2 rounded-full bg-[#1DB954] text-black font-bold text-xs hover:bg-[#1ED760] transition-transform hover:scale-105"
          >
            ثبت پرونده مشتری جدید
          </button>
        </div>
      ) : (
        <div className={isLoadingPage ? 'opacity-50 pointer-events-none transition-opacity' : ''}>
          {/* DESKTOP TABLE LIST VIEW (Visible on md screens and above when viewMode is table) */}
          <div className={`${viewMode === 'table' ? 'hidden md:block' : 'hidden'} bg-[#181818] border border-[#282828] rounded-2xl overflow-hidden shadow-xl`}>
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-[#141414] border-b border-[#282828] text-[#888888] text-xs font-semibold">
                    <th className="py-3.5 px-4">مدیر کسب‌وکار (عنوان اصلی) و نام برند</th>
                    <th className="py-3.5 px-4">وضعیت پرونده</th>
                    <th className="py-3.5 px-4">بازاریاب مسئول</th>
                    <th className="py-3.5 px-4">مهلت پیگیری</th>
                    <th className="py-3.5 px-4">ارتباط سریع</th>
                    <th className="py-3.5 px-4 text-left">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222222] text-xs text-[#CCCCCC]">
                  {items.map((c) => {
                    const timer = formatTimeRemaining(c.assignment_deadline);
                    const statusTheme = getStatusTheme(c.status);

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
                        className="hover:bg-[#202020] transition-colors cursor-pointer group"
                      >
                        {/* Primary Title: Manager Name */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-sm text-white group-hover:text-[#1DB954] transition-colors flex items-center gap-1.5">
                            <Building className="w-3.5 h-3.5 text-[#1DB954] flex-shrink-0" />
                            <span>{c.manager_name || 'مدیریت نامشخص'}</span>
                          </div>
                          <div className="text-[11px] text-[#888888] mt-0.5 flex items-center gap-1 flex-wrap">
                            <span className="text-[#A7A7A7] font-semibold">برند/کسب‌وکار: {c.company_name}</span>
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
                        <td className="py-3.5 px-4 whitespace-nowrap text-white font-medium">
                          {c.assigned_marketer_name || 'تخصیص نیافته'}
                        </td>

                        {/* Timer */}
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
                                className="w-7 h-7 rounded-full bg-[#242424] hover:bg-[#1DB954] hover:text-black text-[#A7A7A7] flex items-center justify-center transition-colors"
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
                                className="w-7 h-7 rounded-full bg-[#242424] hover:bg-[#229ED9] hover:text-white text-[#A7A7A7] flex items-center justify-center transition-colors"
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
                                className="w-7 h-7 rounded-full bg-[#242424] hover:bg-[#E1306C] hover:text-white text-[#A7A7A7] flex items-center justify-center transition-colors"
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
                            onClick={() => onSelectCustomer(c)}
                            className="px-3 py-1 rounded-lg bg-[#242424] hover:bg-[#1DB954] text-[#A7A7A7] hover:text-black font-bold text-xs transition-colors flex items-center gap-1 ml-auto"
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
                className="bg-[#181818] hover:bg-[#202020] rounded-2xl p-5 border border-[#282828] hover:border-[#3e3e3e] transition-all cursor-pointer group flex flex-col justify-between space-y-4 relative"
              >
                {/* Top: Header & Badges */}
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      {/* Primary Title: Manager Name */}
                      <h3 className="font-bold text-white text-base group-hover:text-[#1DB954] transition-colors truncate">
                        {c.manager_name || 'مدیریت نامشخص'}
                      </h3>
                      {/* Subtitle: Business / Company Name */}
                      <div className="text-xs text-[#A7A7A7] truncate mt-0.5">
                        کسب‌وکار: <span className="text-white font-semibold">{c.company_name}</span> · {c.business_type || 'صنف نامشخص'} · {c.city}
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
                    <p className="text-xs text-[#B3B3B3] line-clamp-2 leading-relaxed bg-[#121212] p-2.5 rounded-lg border border-[#222]">
                      <span className="text-[#1DB954] font-bold">مصاحبه: </span>
                      {c.interview_report}
                    </p>
                  )}
                </div>

                {/* Marketer & Deadline Timer */}
                <div className="pt-3 border-t border-[#282828] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#A7A7A7]">بازاریاب مسئول:</span>
                    <span className="font-semibold text-white">
                      {c.assigned_marketer_name || 'تخصیص نیافته'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#A7A7A7] flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#1DB954]" />
                      <span>مهلت پیگیری:</span>
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
                                className="w-7 h-7 rounded-full bg-[#282828] hover:bg-[#1DB954] hover:text-black text-[#B3B3B3] flex items-center justify-center transition-colors"
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
                                className="w-7 h-7 rounded-full bg-[#282828] hover:bg-[#229ED9] hover:text-white text-[#B3B3B3] flex items-center justify-center transition-colors"
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
                                className="w-7 h-7 rounded-full bg-[#282828] hover:bg-[#E1306C] hover:text-white text-[#B3B3B3] flex items-center justify-center transition-colors"
                                title="مشاهده پیج اینستاگرام"
                              >
                                <Instagram className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </>
                        );
                      })()}
                    </div>

                    <div className="text-xs text-[#1DB954] font-semibold group-hover:underline flex items-center gap-1">
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
