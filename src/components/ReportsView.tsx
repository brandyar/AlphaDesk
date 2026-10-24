import React, { useState, useMemo, useEffect } from 'react';
import {
  MessageSquareText,
  Search,
  Plus,
  Filter,
  Calendar,
  Phone,
  User,
  Star,
  CheckCircle,
  Building,
  AlertTriangle,
  Clock,
  UserCheck,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  FileCheck2,
  Loader2,
  ArrowUpDown,
  Sparkles,
} from 'lucide-react';
import { CustomerReport, Customer, Personnel, NegotiationStatus, AuthUser } from '../types';
import {
  formatPersianDate,
  formatPersianDateTime,
  getStatusTheme,
  toPersianDigits,
  formatToman,
  formatStatusLabel,
  NEGOTIATION_STATUS_OPTIONS,
} from '../utils';
import { PaginationControl } from './PaginationControl';

interface ReportsViewProps {
  reports: CustomerReport[];
  customers: Customer[];
  personnelList: Personnel[];
  currentPersonnel?: Personnel | null;
  currentUser?: AuthUser | null;
  isAdmin?: boolean;
  onOpenAddReportModal: (preselectedCustomerId?: string) => void;
  onSelectCustomer: (customer: Customer) => void;
  activeTenantId?: string;
}

// Admin filter keys
type AdminFilterType =
  | 'all'
  | 'active_followups'
  | 'no_followup'
  | 'latest_reports'
  | 'near_expiry_customers'
  | 'expired_customers';

// Staff/Employee filter keys
type StaffFilterType =
  | 'active_followups'
  | 'no_followup'
  | 'unfollowed_referrals'
  | 'due_less_3_days'
  | 'due_less_7_days'
  | 'due_less_10_days'
  | 'expired';

type SortOption = 'newest' | 'oldest' | 'followup_soonest' | 'highest_score';

export const ReportsView: React.FC<ReportsViewProps> = ({
  reports,
  customers,
  personnelList,
  currentPersonnel,
  currentUser,
  isAdmin,
  onOpenAddReportModal,
  onSelectCustomer,
  activeTenantId,
}) => {
  const userIsAdmin = Boolean(
    currentPersonnel
      ? currentPersonnel.role === 'admin' || currentPersonnel.role === 'sales_manager'
      : isAdmin ||
        currentUser?.is_admin ||
        currentUser?.app_role === 'admin' ||
        currentUser?.app_role === 'sales_manager'
  );

  // Active category filter
  const [adminFilter, setAdminFilter] = useState<AdminFilterType>('all');
  const [staffFilter, setStaffFilter] = useState<StaffFilterType>('active_followups');
  const [selectedStatus, setSelectedStatus] = useState<string>('همه');
  const [selectedNegotiator, setSelectedNegotiator] = useState<string>('همه');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Local state for reports list that syncs with props and custom real-time events
  const [reportList, setReportList] = useState<CustomerReport[]>(reports);

  // Keep local report list in sync when parent reports prop updates
  useEffect(() => {
    setReportList(reports);
  }, [reports]);

  // Listen to report save events to immediately show newly added reports at the top
  useEffect(() => {
    const handleSaved = (e: any) => {
      const saved: CustomerReport = e.detail;
      if (!saved || !saved.id) return;
      setReportList((prev) => {
        const exists = prev.some((r) => r.id === saved.id);
        if (exists) {
          return prev.map((r) => (r.id === saved.id ? saved : r));
        }
        return [saved, ...prev];
      });
    };
    window.addEventListener('crm_report_saved', handleSaved);
    return () => window.removeEventListener('crm_report_saved', handleSaved);
  }, []);

  // Reset page to 1 when filters or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [adminFilter, staffFilter, selectedStatus, selectedNegotiator, searchQuery, activeTenantId, sortBy]);

  // High-performance O(1) Customer Lookup Map
  const customersMap = useMemo(() => {
    const map = new Map<string, Customer>();
    for (const c of customers) {
      if (c?.id) {
        map.set(String(c.id), c);
      }
    }
    return map;
  }, [customers]);

  // Helper to check if a customer belongs to current user
  const isMyCustomer = (c: Customer): boolean => {
    if (userIsAdmin) return true;
    return Boolean(
      (currentPersonnel?.id && c.assigned_marketer_id === currentPersonnel.id) ||
      (currentUser?.id && c.assigned_marketer_id === currentUser.id) ||
      (currentPersonnel?.name && c.assigned_marketer_name === currentPersonnel.name) ||
      (currentUser?.name && c.assigned_marketer_name === currentUser.name)
    );
  };

  // Helper to check if a report belongs to current user
  const isMyReport = (rep: CustomerReport): boolean => {
    if (userIsAdmin) return true;
    const customer = customersMap.get(String(rep.customer_id));
    return Boolean(
      (currentPersonnel?.name && rep.negotiator_name === currentPersonnel.name) ||
      (currentUser?.name && rep.negotiator_name === currentUser.name) ||
      (currentPersonnel?.id && rep.created_by === currentPersonnel.id) ||
      (currentUser?.id && rep.created_by === currentUser.id) ||
      (customer && isMyCustomer(customer))
    );
  };

  // Helper to compute remaining days from today
  const getDaysUntil = (dateIso?: string | null): number | null => {
    if (!dateIso) return null;
    try {
      const target = new Date(dateIso).getTime();
      if (isNaN(target)) return null;
      const now = new Date().getTime();
      const diffMs = target - now;
      return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    } catch {
      return null;
    }
  };

  // Helper to check if a date is in future or today
  const isActiveDate = (dateIso?: string | null): boolean => {
    if (!dateIso) return false;
    const days = getDaysUntil(dateIso);
    return days !== null && days >= 0;
  };

  // Helper to check if customer is expired
  const isExpired = (c?: Customer | null): boolean => {
    if (!c) return false;
    if (c.is_expired) return true;
    if (c.status === 'قرارداد' || c.status === 'لیست سیاه') return false;
    if (c.assignment_deadline) {
      const days = getDaysUntil(c.assignment_deadline);
      if (days !== null && days < 0) return true;
    }
    return false;
  };

  // High-performance Unfollowed referrals (customers assigned to user with 0 reports)
  const unfollowedReferralCustomers = useMemo(() => {
    const customersWithReports = new Set<string>();
    for (const r of reportList) {
      if (r?.customer_id) customersWithReports.add(String(r.customer_id));
    }
    const myCustomers = customers.filter(isMyCustomer);
    return myCustomers.filter((c) => !customersWithReports.has(String(c.id)));
  }, [customers, reportList, currentPersonnel, currentUser, userIsAdmin]);

  // Comprehensive client-side Filtering & Sorting
  const filteredAndSortedReports = useMemo(() => {
    let result = reportList.filter(isMyReport);

    // 1. Status Dropdown Filter
    if (selectedStatus !== 'همه') {
      if (selectedStatus === 'قرارداد' || selectedStatus === 'قرارداد / فاکتور') {
        result = result.filter((r) => {
          const stStr = String(r.negotiation_status);
          return stStr === 'قرارداد' || stStr === 'قرارداد / فاکتور' || stStr === 'قرارداد/فاکتور';
        });
      } else {
        result = result.filter((r) => r.negotiation_status === selectedStatus);
      }
    }

    // 2. Negotiator Filter (Admin only)
    if (userIsAdmin && selectedNegotiator !== 'همه') {
      result = result.filter((r) => r.negotiator_name === selectedNegotiator);
    }

    // 3. Search Query (Multi-field instant search)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((rep) => {
        const customer = customersMap.get(String(rep.customer_id));
        const matchCompany = customer?.company_name?.toLowerCase().includes(q);
        const matchManager = customer?.manager_name?.toLowerCase().includes(q);
        const matchReport = rep.report_text?.toLowerCase().includes(q);
        const matchPhone = rep.negotiation_phone?.includes(q);
        const matchNegotiator = rep.negotiator_name?.toLowerCase().includes(q);
        return Boolean(matchCompany || matchManager || matchReport || matchPhone || matchNegotiator);
      });
    }

    // 4. Role-based Category Tab Filters
    if (userIsAdmin) {
      switch (adminFilter) {
        case 'all':
          break;

        case 'active_followups':
          result = result.filter((r) => {
            const customer = customersMap.get(String(r.customer_id));
            const followupDate = r.next_followup_date || customer?.next_followup_date;
            return isActiveDate(followupDate);
          });
          break;

        case 'no_followup':
          result = result.filter((r) => {
            const customer = customersMap.get(String(r.customer_id));
            const followupDate = r.next_followup_date || customer?.next_followup_date;
            return !followupDate;
          });
          break;

        case 'latest_reports': {
          // Exactly one latest report per unique customer
          const latestMap = new Map<string, CustomerReport>();
          // Sort reports descending by creation time first to guarantee picking the newest
          const sortedByDate = [...result].sort((a, b) => {
            const tA = new Date(a.date_created || 0).getTime();
            const tB = new Date(b.date_created || 0).getTime();
            return tB - tA;
          });
          for (const rep of sortedByDate) {
            const cId = String(rep.customer_id);
            if (!latestMap.has(cId)) {
              latestMap.set(cId, rep);
            }
          }
          result = Array.from(latestMap.values());
          break;
        }

        case 'expired_customers':
          result = result.filter((r) => {
            const customer = customersMap.get(String(r.customer_id));
            return isExpired(customer);
          });
          break;

        case 'near_expiry_customers':
          result = result.filter((r) => {
            const customer = customersMap.get(String(r.customer_id));
            if (!customer) return false;
            if (customer.status === 'پیگیری قبل از انقضا') return true;
            if (customer.assignment_deadline) {
              const days = getDaysUntil(customer.assignment_deadline);
              return days !== null && days >= 0 && days <= 3;
            }
            return false;
          });
          break;
      }
    } else {
      // Staff filter rules
      switch (staffFilter) {
        case 'active_followups':
          result = result.filter((r) => {
            const customer = customersMap.get(String(r.customer_id));
            const followupDate = r.next_followup_date || customer?.next_followup_date;
            return isActiveDate(followupDate);
          });
          break;

        case 'no_followup':
          result = result.filter((r) => {
            const customer = customersMap.get(String(r.customer_id));
            const followupDate = r.next_followup_date || customer?.next_followup_date;
            return !followupDate;
          });
          break;

        case 'unfollowed_referrals':
          // Handled via separate UI component
          break;

        case 'due_less_3_days':
        case 'due_less_7_days':
        case 'due_less_10_days': {
          const maxDays = staffFilter === 'due_less_3_days' ? 3 : staffFilter === 'due_less_7_days' ? 7 : 10;
          result = result.filter((r) => {
            const customer = customersMap.get(String(r.customer_id));
            const followupDate = r.next_followup_date || customer?.next_followup_date;
            const deadline = customer?.assignment_deadline;
            const daysFollowup = getDaysUntil(followupDate);
            const daysDeadline = getDaysUntil(deadline);

            const isFollowupNear = daysFollowup !== null && daysFollowup >= 0 && daysFollowup <= maxDays;
            const isDeadlineNear = daysDeadline !== null && daysDeadline >= 0 && daysDeadline <= maxDays;
            return isFollowupNear || isDeadlineNear;
          });
          break;
        }

        case 'expired':
          result = result.filter((r) => {
            const customer = customersMap.get(String(r.customer_id));
            return isExpired(customer);
          });
          break;
      }
    }

    // 5. Explicit Sorting
    return [...result].sort((a, b) => {
      const timeA = new Date(a.date_created || 0).getTime() || 0;
      const timeB = new Date(b.date_created || 0).getTime() || 0;

      switch (sortBy) {
        case 'newest':
          // Newest creation timestamp first
          return timeB - timeA;

        case 'oldest':
          // Oldest creation timestamp first
          return timeA - timeB;

        case 'followup_soonest': {
          // Soonest upcoming follow-up date first
          const customerA = customersMap.get(String(a.customer_id));
          const customerB = customersMap.get(String(b.customer_id));
          const fA = a.next_followup_date || customerA?.next_followup_date;
          const fB = b.next_followup_date || customerB?.next_followup_date;

          const daysA = getDaysUntil(fA);
          const daysB = getDaysUntil(fB);

          // Reports with upcoming followup date take top priority
          if (daysA !== null && daysB !== null) {
            if (daysA >= 0 && daysB < 0) return -1;
            if (daysB >= 0 && daysA < 0) return 1;
            return daysA - daysB;
          }
          if (daysA !== null) return -1;
          if (daysB !== null) return 1;
          return timeB - timeA;
        }

        case 'highest_score': {
          const scoreA = Number(a.negotiation_score) || 0;
          const scoreB = Number(b.negotiation_score) || 0;
          if (scoreB !== scoreA) return scoreB - scoreA;
          return timeB - timeA;
        }

        default:
          return timeB - timeA;
      }
    });
  }, [
    reportList,
    customersMap,
    userIsAdmin,
    adminFilter,
    staffFilter,
    selectedStatus,
    selectedNegotiator,
    searchQuery,
    sortBy,
    currentPersonnel,
    currentUser,
  ]);

  // Pagination calculations
  const totalCount = filteredAndSortedReports.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const displayedReports = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedReports.slice(start, start + pageSize);
  }, [filteredAndSortedReports, currentPage, pageSize]);

  // Admin filter items definition
  const adminFilterOptions = [
    { id: 'all' as AdminFilterType, label: 'همه گزارشات' },
    { id: 'active_followups' as AdminFilterType, label: 'پیگیری‌های فعال' },
    { id: 'no_followup' as AdminFilterType, label: 'گزارشات فاقد پیگیری' },
    { id: 'latest_reports' as AdminFilterType, label: 'آخرین گزارشات ثبت شده' },
    { id: 'near_expiry_customers' as AdminFilterType, label: 'مشتریان نزدیک انقضا' },
    { id: 'expired_customers' as AdminFilterType, label: 'مشتریان منقضی شده' },
  ];

  // Staff filter items definition
  const staffFilterOptions = [
    { id: 'active_followups' as StaffFilterType, label: 'پیگیری‌های فعال' },
    { id: 'no_followup' as StaffFilterType, label: 'مشتریان فاقد پیگیری' },
    {
      id: 'unfollowed_referrals' as StaffFilterType,
      label: 'مشتریان ارجاعی پیگیری نشده',
      badge: unfollowedReferralCustomers.length,
    },
    { id: 'due_less_3_days' as StaffFilterType, label: 'نزدیک سررسید < ۳ روز' },
    { id: 'due_less_7_days' as StaffFilterType, label: 'نزدیک سررسید < ۷ روز' },
    { id: 'due_less_10_days' as StaffFilterType, label: 'نزدیک سررسید < ۱۰ روز' },
    { id: 'expired' as StaffFilterType, label: 'منقضی شده' },
  ];

  return (
    <div className="space-y-6">
      {/* Title & Action */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>گزارش‌های پیگیری و مذاکره با مشتریان</span>
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-[#1DB954]/15 text-[#1DB954] font-bold">
              {!userIsAdmin && staffFilter === 'unfollowed_referrals'
                ? `${toPersianDigits(unfollowedReferralCustomers.length)} مشتری ارجاعی`
                : `${toPersianDigits(totalCount)} گزارش یافت شد`}
            </span>
          </h2>
          <p className="text-xs text-[#A7A7A7] mt-1">
            {userIsAdmin
              ? 'پایش، ثبت و فیلتر دقیق گزارش‌های مذاکره و موعدهای پیگیری تمامی کارشناسان به ترتیب زمانی دقیق'
              : 'پایش موعدهای پیگیری، مشتریان ارجاعی، مهلت‌های سررسید و ثبت مذاکرات روزانه شما'}
          </p>
        </div>

        <button
          onClick={() => onOpenAddReportModal()}
          className="h-10 px-5 rounded-full bg-[#1DB954] hover:bg-[#1ED760] text-black font-bold text-xs transition-all hover:scale-105 shadow-md shadow-[#1DB954]/20 flex items-center gap-2"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>ثبت گزارش پیگیری جدید</span>
        </button>
      </div>

      {/* Primary Role-Based Category Filter Bar (Tabs) */}
      <div className="bg-[#181818] p-2 rounded-2xl border border-[#282828] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {userIsAdmin
          ? adminFilterOptions.map((opt) => {
              const active = adminFilter === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setAdminFilter(opt.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 select-none ${
                    active
                      ? 'bg-[#1DB954] text-black shadow-md shadow-[#1DB954]/20'
                      : 'bg-[#222222] text-[#A7A7A7] hover:text-white hover:bg-[#2c2c2c]'
                  }`}
                >
                  <span>{opt.label}</span>
                </button>
              );
            })
          : staffFilterOptions.map((opt) => {
              const active = staffFilter === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setStaffFilter(opt.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 select-none ${
                    active
                      ? 'bg-[#1DB954] text-black shadow-md shadow-[#1DB954]/20'
                      : 'bg-[#222222] text-[#A7A7A7] hover:text-white hover:bg-[#2c2c2c]'
                  }`}
                >
                  <span>{opt.label}</span>
                  {typeof opt.badge === 'number' && opt.badge > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                        active
                          ? 'bg-black text-[#1DB954]'
                          : 'bg-[#E22134] text-white animate-pulse'
                      }`}
                    >
                      {toPersianDigits(opt.badge)}
                    </span>
                  )}
                </button>
              );
            })}
      </div>

      {/* Secondary Search, Filter & Sort Toolbar */}
      <div className="p-3 sm:p-4 bg-[#181818] rounded-2xl border border-[#282828] flex flex-wrap items-center justify-between gap-3">
        {/* Search Input */}
        <div className="flex-1 max-w-xs sm:max-w-sm relative min-w-[200px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو در متن گزارش، نام شرکت، نام مدیر، تلفن..."
            className="w-full h-9 bg-[#282828] rounded-xl pl-3 pr-9 text-xs text-white placeholder-[#A7A7A7] focus:outline-none focus:border-[#1DB954] border border-[#3e3e3e]"
          />
          <Search className="w-3.5 h-3.5 text-[#A7A7A7] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Sort Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#A7A7A7] flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#1DB954]" />
              <span>مرتب‌سازی:</span>
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="h-9 px-3 rounded-xl bg-[#282828] text-xs text-white border border-[#3e3e3e] focus:outline-none focus:border-[#1DB954] cursor-pointer"
            >
              <option value="newest" className="bg-[#181818] text-white">جدیدترین تاریخ ثبت (پیش‌فرض)</option>
              <option value="oldest" className="bg-[#181818] text-white">قدیمی‌ترین تاریخ ثبت</option>
              <option value="followup_soonest" className="bg-[#181818] text-white">نزدیک‌ترین موعد پیگیری</option>
              <option value="highest_score" className="bg-[#181818] text-white">بیشترین امتیاز مذاکره</option>
            </select>
          </div>

          {/* Status Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#A7A7A7]">وضعیت:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
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

          {/* Page Size Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#A7A7A7]">تعداد در صفحه:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="h-9 px-3 rounded-xl bg-[#282828] text-xs text-white border border-[#3e3e3e] focus:outline-none focus:border-[#1DB954] cursor-pointer"
            >
              <option value={10} className="bg-[#181818] text-white">۱۰ گزارش</option>
              <option value={25} className="bg-[#181818] text-white">۲۵ گزارش</option>
              <option value={50} className="bg-[#181818] text-white">۵۰ گزارش</option>
              <option value={100} className="bg-[#181818] text-white">۱۰۰ گزارش</option>
            </select>
          </div>

          {/* Negotiator Dropdown - ONLY for Admin */}
          {userIsAdmin && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#A7A7A7]">مذاکره‌کننده:</span>
              <select
                value={selectedNegotiator}
                onChange={(e) => setSelectedNegotiator(e.target.value)}
                className="h-9 px-3 rounded-xl bg-[#282828] text-xs text-white border border-[#3e3e3e] focus:outline-none focus:border-[#1DB954] cursor-pointer"
              >
                <option value="همه" className="bg-[#181818] text-white">همه کارشناسان</option>
                {personnelList.map((p) => (
                  <option key={p.id} value={p.name} className="bg-[#181818] text-white">
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Special View: Unfollowed Referrals (مشتریان ارجاعی پیگیری نشده) */}
      {!userIsAdmin && staffFilter === 'unfollowed_referrals' ? (
        unfollowedReferralCustomers.length === 0 ? (
          <div className="p-12 text-center bg-[#181818] rounded-2xl border border-[#282828] space-y-3">
            <CheckCircle className="w-10 h-10 text-[#1DB954] mx-auto" />
            <h3 className="text-sm font-bold text-white">تمام مشتریان ارجاعی پیگیری شده‌اند!</h3>
            <p className="text-xs text-[#A7A7A7]">
              هیچ مشتری بدون گزارش پیگیری در پرونده‌های اختصاص‌یافته به شما وجود ندارد.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-[#F59B23]/10 border border-[#F59B23]/30 rounded-xl flex items-center justify-between text-xs text-[#F59B23]">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                <span>مشتریان زیر به شما ارجاع داده شده‌اند اما هنوز هیچ گزارش مذاکره‌ای برای آنها ثبت نکرده‌اید:</span>
              </div>
              <span className="font-mono font-bold">{toPersianDigits(unfollowedReferralCustomers.length)} مشتری</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {unfollowedReferralCustomers.map((c) => {
                const phone = c.manager_phones?.[0] || c.mobile_numbers?.[0] || c.negotiator_phones?.[0] || '-';
                return (
                  <div
                    key={c.id}
                    className="bg-[#181818] hover:bg-[#202020] rounded-2xl p-4 border border-[#282828] hover:border-[#3e3e3e] transition-all flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <button
                          onClick={() => onSelectCustomer(c)}
                          className="font-bold text-sm text-white hover:text-[#1DB954] text-right truncate flex items-center gap-1.5"
                        >
                          <User className="w-4 h-4 text-[#1DB954] shrink-0" />
                          <span>{c.manager_name || c.negotiator_name || c.company_name}</span>
                        </button>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[#E22134]/15 text-[#E22134] border border-[#E22134]/30 font-bold shrink-0">
                          فاقد گزارش
                        </span>
                      </div>
                      <p className="text-xs text-[#A7A7A7] mt-1 truncate">
                        {c.company_name} {c.business_type ? `• ${c.business_type}` : ''} • {c.city}
                      </p>
                      {phone !== '-' && (
                        <div className="mt-2 text-xs text-white font-mono flex items-center gap-1.5" dir="ltr">
                          <Phone className="w-3.5 h-3.5 text-[#1DB954]" />
                          <span>{phone}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-[#282828] flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => onSelectCustomer(c)}
                        className="text-xs text-[#A7A7A7] hover:text-white flex items-center gap-1"
                      >
                        <span>مشاهده پرونده</span>
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenAddReportModal(c.id)}
                        className="px-3 py-1.5 rounded-full bg-[#1DB954] hover:bg-[#1ED760] text-black font-bold text-xs transition-all flex items-center gap-1 shadow-md shadow-[#1DB954]/20"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>ثبت اولین مذاکره</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )
      ) : displayedReports.length === 0 ? (
        <div className="p-12 text-center bg-[#181818] rounded-2xl border border-[#282828] space-y-3">
          <MessageSquareText className="w-10 h-10 text-[#535353] mx-auto" />
          <p className="text-xs text-[#A7A7A7]">هیچ گزارشی مطابق با فیلترها و مرتب‌سازی انتخابی یافت نشد.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayedReports.map((rep) => {
            const customer = customersMap.get(String(rep.customer_id));
            const statusTheme = getStatusTheme(rep.negotiation_status);
            const daysToFollowup = getDaysUntil(rep.next_followup_date || customer?.next_followup_date);
            const customerIsExpired = isExpired(customer);

            return (
              <div
                key={rep.id}
                className={`bg-[#181818] hover:bg-[#1c1c1c] rounded-2xl p-5 border transition-all space-y-3 ${
                  customerIsExpired
                    ? 'border-[#E22134]/40 bg-[#E22134]/5'
                    : 'border-[#282828] hover:border-[#3e3e3e]'
                }`}
              >
                {/* Header row */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {/* Manager / Negotiator Name link */}
                    {customer ? (
                      <button
                        onClick={() => onSelectCustomer(customer)}
                        className="font-bold text-sm text-white hover:text-[#1DB954] transition-colors flex items-center gap-1.5"
                      >
                        <User className="w-4 h-4 text-[#1DB954]" />
                        <span>{customer.manager_name || customer.negotiator_name || rep.negotiator_name || customer.company_name}</span>
                        {customer.company_name && (
                          <span className="text-xs text-[#888] font-normal">({customer.company_name})</span>
                        )}
                      </button>
                    ) : (
                      <span className="font-bold text-sm text-white flex items-center gap-1.5">
                        <User className="w-4 h-4 text-[#1DB954]" />
                        <span>{rep.negotiator_name || 'مدیر کسب و کار'}</span>
                      </span>
                    )}

                    {/* Status Pill */}
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full border ${statusTheme.bg} ${statusTheme.color} font-medium`}
                    >
                      {formatStatusLabel(rep.negotiation_status)}
                    </span>

                    {/* Expired Warning Badge */}
                    {customerIsExpired && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E22134]/20 text-[#E22134] border border-[#E22134]/30 font-bold">
                        منقضی شده
                      </span>
                    )}
                  </div>

                  {/* Metadata */}
                  <div className="flex items-center gap-4 text-xs text-[#A7A7A7]">
                    <span className="flex items-center gap-1 text-white">
                      <User className="w-3.5 h-3.5 text-[#1DB954]" />
                      <span>{rep.negotiator_name}</span>
                    </span>
                    {rep.negotiation_phone && (
                      <span className="font-mono" dir="ltr">
                        {rep.negotiation_phone}
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded bg-[#282828] text-white font-mono font-bold">
                      امتیاز: {rep.negotiation_score} {Number(rep.negotiation_score) > 10 ? 'از ۲۰' : 'از ۱۰'}
                    </span>
                    <span className="font-mono">{formatPersianDateTime(rep.date_created)}</span>
                  </div>
                </div>

                {/* Report Body */}
                <p className="text-xs text-[#d1d1d1] leading-relaxed whitespace-pre-wrap bg-[#121212] p-3.5 rounded-xl border border-[#222]">
                  {rep.report_text}
                </p>

                {/* Contract / Invoice Details Card */}
                {(rep.contract_number || rep.contract_amount || rep.contract_items || rep.contract_date) && (
                  <div className="p-3.5 rounded-xl bg-[#1DB954]/10 border border-[#1DB954]/25 space-y-2 text-xs">
                    <div className="flex items-center justify-between font-bold text-[#1DB954] border-b border-[#1DB954]/20 pb-1.5">
                      <span className="flex items-center gap-1.5">
                        <FileCheck2 className="w-4 h-4" />
                        <span>اطلاعات سند قرارداد / فاکتور رسمی</span>
                      </span>
                      {rep.contract_number && (
                        <span className="font-mono bg-[#181818] px-2.5 py-0.5 rounded border border-[#1DB954]/30 text-white">
                          شماره: {rep.contract_number}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      {rep.contract_date && (
                        <div>
                          <span className="text-[#888]">تاریخ قرارداد: </span>
                          <span className="font-mono text-white font-semibold">{formatPersianDate(rep.contract_date)}</span>
                        </div>
                      )}
                      {rep.contract_amount && (
                        <div>
                          <span className="text-[#888]">مبلغ نهایی: </span>
                          <span className="font-bold text-[#1DB954] font-mono">{formatToman(rep.contract_amount)}</span>
                        </div>
                      )}
                    </div>
                    {rep.contract_items && (
                      <div className="text-[11px] bg-[#121212] p-2.5 rounded-lg border border-[#222]">
                        <span className="text-[#888]">اقلام و خدمات: </span>
                        <span className="text-white">{rep.contract_items}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Footer / Followup & Deadline Details */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-[#222]">
                  {rep.next_followup_date ? (
                    <div className="text-[11px] text-[#A7A7A7] flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-[#1DB954]" />
                      <span>موعد پیگیری بعدی:</span>
                      <span className="text-white font-semibold font-mono">
                        {formatPersianDate(rep.next_followup_date)}
                      </span>
                      {daysToFollowup !== null && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            daysToFollowup < 0
                              ? 'bg-[#E22134]/15 text-[#E22134]'
                              : daysToFollowup === 0
                              ? 'bg-[#1DB954]/20 text-[#1DB954]'
                              : daysToFollowup <= 3
                              ? 'bg-[#F59B23]/20 text-[#F59B23]'
                              : 'bg-[#282828] text-[#A7A7A7]'
                          }`}
                        >
                          {daysToFollowup < 0
                            ? `${toPersianDigits(Math.abs(daysToFollowup))} روز گذشته`
                            : daysToFollowup === 0
                            ? 'امروز'
                            : `${toPersianDigits(daysToFollowup)} روز باقی‌مانده`}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="text-[11px] text-[#666] flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>بدون موعد پیگیری بعدی</span>
                    </div>
                  )}

                  {customer && (
                    <button
                      type="button"
                      onClick={() => onSelectCustomer(customer)}
                      className="text-xs text-[#1DB954] hover:underline font-bold flex items-center gap-1"
                    >
                      <span>مشاهده پرونده کامل</span>
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      <PaginationControl
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={pageSize}
        displayedCount={displayedReports.length}
        isLoading={false}
        onPageChange={(p) => {
          setCurrentPage(p);
          const el = document.querySelector('main');
          if (el) el.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        label="گزارش مذاکره"
      />
    </div>
  );
};
