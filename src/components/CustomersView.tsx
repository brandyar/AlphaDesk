import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { Customer, Personnel, NegotiationStatus, AuthUser } from '../types';
import { formatTimeRemaining, formatPersianDate, getStatusTheme, formatStatusLabel, NEGOTIATION_STATUS_OPTIONS } from '../utils';

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
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(30);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Reset page to 1 when filters or search change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, selectedMarketerId, showExpiredOnly, searchQuery]);

  // Client-side search within the current dataset
  const searchedCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    const q = searchQuery.trim().toLowerCase();
    return customers.filter(c => {
      const matchCompany = c.company_name?.toLowerCase().includes(q);
      const matchManager = c.manager_name?.toLowerCase().includes(q);
      const matchCity = c.city?.toLowerCase().includes(q);
      const matchJob = c.business_type?.toLowerCase().includes(q);
      const matchPhone = Array.isArray(c.mobile_numbers) && c.mobile_numbers.some(m => m.includes(q));
      return Boolean(matchCompany || matchManager || matchCity || matchJob || matchPhone);
    });
  }, [customers, searchQuery]);

  // Compute pagination slices
  const totalCount = searchedCustomers.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const paginatedCustomers = searchedCustomers.slice(startIndex, startIndex + pageSize);

  const userIsAdmin = Boolean(
    isAdmin ||
    currentUser?.is_admin ||
    currentUser?.app_role === 'admin' ||
    currentUser?.role_id === '59e261e1-56f4-401e-9889-4971e2c3c4ce' ||
    currentUser?.role_id === 'a45beaec-0272-4c29-89ee-122dce37f565' ||
    currentPersonnel?.role === 'admin'
  );

  return (
    <div className="space-y-6">
      {/* Top Title & Quick Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>مدیریت مشتریان و پرونده‌ها</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-[#1DB954]/15 text-[#1DB954] font-bold">
              {customers.length} پرونده
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

        {/* Search input & Pagination Size */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو در نام، مدیر، شماره یا شهر..."
              className="h-9 w-52 sm:w-64 pl-8 pr-3 rounded-xl bg-[#282828] text-xs text-white placeholder-[#777] border border-[#3e3e3e] focus:outline-none focus:border-[#1DB954]"
            />
            <Search className="w-3.5 h-3.5 text-[#777] absolute left-2.5 top-3 pointer-events-none" />
          </div>

          <div className="flex items-center gap-1.5 text-xs text-[#888]">
            <span>تعداد در صفحه:</span>
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

      {/* Customers Content: Grid View */}
      {searchedCustomers.length === 0 ? (
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {paginatedCustomers.map((c) => {
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
                      <h3 className="font-bold text-white text-base group-hover:text-[#1DB954] transition-colors truncate">
                        {c.company_name}
                      </h3>
                      <div className="text-xs text-[#A7A7A7] truncate">
                        {c.business_type || 'صنف نامشخص'} · {c.city}
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
      )}

      {/* Pagination Controls */}
      {totalCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-[#181818] rounded-2xl border border-[#282828] text-xs">
          <div className="text-[#888] font-medium">
            نمایش <span className="text-white font-mono font-bold">{startIndex + 1}</span> تا{' '}
            <span className="text-white font-mono font-bold">
              {Math.min(startIndex + pageSize, totalCount)}
            </span>{' '}
            از کل <span className="text-[#1DB954] font-mono font-bold">{totalCount}</span> پرونده مشتری
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={safePage <= 1}
              className="w-8 h-8 rounded-lg bg-[#242424] hover:bg-[#303030] disabled:opacity-40 disabled:hover:bg-[#242424] text-white flex items-center justify-center transition-all cursor-pointer disabled:cursor-not-allowed"
              title="صفحه اول"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={safePage <= 1}
              className="h-8 px-3 rounded-lg bg-[#242424] hover:bg-[#303030] disabled:opacity-40 disabled:hover:bg-[#242424] text-white flex items-center gap-1 transition-all cursor-pointer disabled:cursor-not-allowed"
              title="صفحه قبلی"
            >
              <ChevronRight className="w-4 h-4" />
              <span>قبلی</span>
            </button>

            <div className="px-3 py-1 bg-[#121212] rounded-lg border border-[#2a2a2a] text-white font-mono font-bold">
              صفحه {safePage} از {totalPages}
            </div>

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={safePage >= totalPages}
              className="h-8 px-3 rounded-lg bg-[#242424] hover:bg-[#303030] disabled:opacity-40 disabled:hover:bg-[#242424] text-white flex items-center gap-1 transition-all cursor-pointer disabled:cursor-not-allowed"
              title="صفحه بعدی"
            >
              <span>بعدی</span>
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={safePage >= totalPages}
              className="w-8 h-8 rounded-lg bg-[#242424] hover:bg-[#303030] disabled:opacity-40 disabled:hover:bg-[#242424] text-white flex items-center justify-center transition-all cursor-pointer disabled:cursor-not-allowed"
              title="صفحه آخر"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
