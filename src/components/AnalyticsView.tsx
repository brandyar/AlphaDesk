import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Users,
  MessageSquareText,
  FileCheck2,
  DollarSign,
  Calendar,
  Filter,
  Search,
  CheckCircle,
  Clock,
  Sparkles,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  ChevronLeft,
  ChevronRight,
  Building,
  Star,
  Award,
  Target,
  Layers,
  Activity,
  UserCheck,
  User,
  ShieldCheck,
  Zap,
  Info,
  SlidersHorizontal,
} from 'lucide-react';
import { Customer, CustomerReport, Personnel, AuthUser } from '../types';
import {
  formatPersianDate,
  formatPersianDateTime,
  formatToman,
  formatStatusLabel,
  getStatusTheme,
  toPersianDigits,
  gregorianIsoToJalali,
  jalaliToGregorianIso,
  getTodayJalali,
  JALALI_MONTH_NAMES,
} from '../utils';
import { PersianDatePicker } from './PersianDatePicker';

interface AnalyticsViewProps {
  reports: CustomerReport[];
  customers: Customer[];
  personnelList: Personnel[];
  currentPersonnel?: Personnel | null;
  currentUser?: AuthUser | null;
  isAdmin?: boolean;
  onSelectCustomer?: (customer: Customer) => void;
}

type AnalyticsTab = 'daily_reports' | 'daily_customers' | 'periodic';
type PeriodPreset = 'today' | 'last_7_days' | 'last_30_days' | 'last_90_days' | 'this_year' | 'custom';

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  reports,
  customers,
  personnelList,
  currentPersonnel,
  currentUser,
  isAdmin,
  onSelectCustomer,
}) => {
  const userIsAdmin = Boolean(
    isAdmin ||
    currentUser?.is_admin ||
    currentUser?.app_role === 'admin' ||
    currentUser?.role_id === '59e261e1-56f4-401e-9889-4971e2c3c4ce' ||
    currentUser?.role_id === 'a45beaec-0272-4c29-89ee-122dce37f565' ||
    currentPersonnel?.role === 'admin'
  );

  // Main Sub-Tab
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('daily_reports');

  // Personnel filter state (Admin can filter, staff is locked to self)
  const [selectedPersonnelId, setSelectedPersonnelId] = useState<string>('all');
  const [personnelSearch, setPersonnelSearch] = useState('');
  const [showPersonnelDropdown, setShowPersonnelDropdown] = useState(false);

  // Daily views range (e.g. last 7, 14, 30 days)
  const [dailyDaysCount, setDailyDaysCount] = useState<number>(14);

  // Periodic preset state
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('last_30_days');
  const [customStartDate, setCustomStartDate] = useState<string>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [customEndDate, setCustomEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Active hover tooltip for charts
  const [hoveredPoint, setHoveredPoint] = useState<any | null>(null);

  // Selected single day filter in daily views
  const [selectedDayDetail, setSelectedDayDetail] = useState<string | null>(null);

  // Determine current active personnel scope
  const targetPersonnel = useMemo(() => {
    if (!userIsAdmin) {
      return currentPersonnel || (currentUser ? { id: currentUser.id, name: currentUser.name } : null);
    }
    if (selectedPersonnelId === 'all') return null;
    return personnelList.find((p) => p.id === selectedPersonnelId) || null;
  }, [userIsAdmin, currentPersonnel, currentUser, selectedPersonnelId, personnelList]);

  // Filtered personnel list for search
  const filteredPersonnelOptions = useMemo(() => {
    if (!personnelSearch.trim()) return personnelList;
    const q = personnelSearch.toLowerCase();
    return personnelList.filter((p) => p.name.toLowerCase().includes(q) || (p.email && p.email.toLowerCase().includes(q)));
  }, [personnelList, personnelSearch]);

  // Base filtered dataset matching user role and personnel selection
  const scopedReports = useMemo(() => {
    if (!userIsAdmin) {
      const myName = currentPersonnel?.name || currentUser?.name || '';
      const myId = currentPersonnel?.id || currentUser?.id || '';
      return reports.filter(
        (r) =>
          r.negotiator_name === myName ||
          r.created_by === myName ||
          (myId && r.created_by === myId)
      );
    }

    if (selectedPersonnelId === 'all') {
      return reports;
    }

    const p = personnelList.find((item) => item.id === selectedPersonnelId);
    if (!p) return reports;

    return reports.filter(
      (r) =>
        r.negotiator_name === p.name ||
        r.created_by === p.name ||
        r.created_by === p.id
    );
  }, [reports, userIsAdmin, selectedPersonnelId, personnelList, currentPersonnel, currentUser]);

  const scopedCustomers = useMemo(() => {
    if (!userIsAdmin) {
      const myId = currentPersonnel?.id || currentUser?.id || '';
      const myName = currentPersonnel?.name || currentUser?.name || '';
      return customers.filter(
        (c) =>
          (myId && c.assigned_marketer_id === myId) ||
          (myName && c.assigned_marketer_name === myName)
      );
    }

    if (selectedPersonnelId === 'all') {
      return customers;
    }

    const p = personnelList.find((item) => item.id === selectedPersonnelId);
    if (!p) return customers;

    return customers.filter(
      (c) => c.assigned_marketer_id === p.id || c.assigned_marketer_name === p.name
    );
  }, [customers, userIsAdmin, selectedPersonnelId, personnelList, currentPersonnel, currentUser]);

  // Calculate Date Boundaries for Periodic View
  const periodDateRange = useMemo(() => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    switch (periodPreset) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'last_7_days':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'last_30_days':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'last_90_days':
        start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'this_year':
        start = new Date(now.getFullYear(), 0, 1);
        break;
      case 'custom':
        if (customStartDate) start = new Date(customStartDate);
        if (customEndDate) {
          end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999);
        }
        break;
    }

    return { start, end };
  }, [periodPreset, customStartDate, customEndDate]);

  // Periodic reports slice
  const periodicReports = useMemo(() => {
    const { start, end } = periodDateRange;
    const startMs = start.getTime();
    const endMs = end.getTime();

    return scopedReports.filter((r) => {
      if (!r.date_created) return false;
      const t = new Date(r.date_created).getTime();
      return t >= startMs && t <= endMs;
    });
  }, [scopedReports, periodDateRange]);

  // -------------------------------------------------------------
  // 1. DATA COMPUTATION FOR DAILY REPORT-CENTRIC PERFORMANCE
  // -------------------------------------------------------------
  const dailyReportStats = useMemo(() => {
    const daysMap = new Map<
      string,
      {
        dateIso: string;
        dateJalali: string;
        dayName: string;
        reportsCount: number;
        scoresSum: number;
        scoresCount: number;
        contractsCount: number;
        contractsAmount: number;
        statusCounts: Record<string, number>;
        reports: CustomerReport[];
      }
    >();

    // Generate date keys for the last N days
    const now = new Date();
    for (let i = dailyDaysCount - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const isoKey = d.toISOString().split('T')[0];
      const jStr = gregorianIsoToJalali(isoKey);
      const dayName = new Intl.DateTimeFormat('fa-IR', { weekday: 'short' }).format(d);

      daysMap.set(isoKey, {
        dateIso: isoKey,
        dateJalali: jStr,
        dayName,
        reportsCount: 0,
        scoresSum: 0,
        scoresCount: 0,
        contractsCount: 0,
        contractsAmount: 0,
        statusCounts: {},
        reports: [],
      });
    }

    // Populate with scoped reports
    scopedReports.forEach((rep) => {
      if (!rep.date_created) return;
      const repIso = new Date(rep.date_created).toISOString().split('T')[0];
      const entry = daysMap.get(repIso);
      if (entry) {
        entry.reportsCount += 1;
        entry.reports.push(rep);
        if (typeof rep.negotiation_score === 'number' && rep.negotiation_score > 0) {
          entry.scoresSum += rep.negotiation_score;
          entry.scoresCount += 1;
        }

        const isContract =
          rep.negotiation_status === 'قرارداد' ||
          rep.negotiation_status === 'قرارداد / فاکتور' ||
          Boolean(rep.contract_number) ||
          Boolean(rep.contract_amount);

        if (isContract) {
          entry.contractsCount += 1;
          if (rep.contract_amount && !isNaN(Number(rep.contract_amount))) {
            entry.contractsAmount += Number(rep.contract_amount);
          }
        }

        const st = formatStatusLabel(rep.negotiation_status);
        entry.statusCounts[st] = (entry.statusCounts[st] || 0) + 1;
      }
    });

    const daysList = Array.from(daysMap.values());
    const totalReports = daysList.reduce((acc, d) => acc + d.reportsCount, 0);
    const totalContracts = daysList.reduce((acc, d) => acc + d.contractsCount, 0);
    const totalAmount = daysList.reduce((acc, d) => acc + d.contractsAmount, 0);
    const totalScoresSum = daysList.reduce((acc, d) => acc + d.scoresSum, 0);
    const totalScoresCount = daysList.reduce((acc, d) => acc + d.scoresCount, 0);
    const avgScore = totalScoresCount > 0 ? (totalScoresSum / totalScoresCount).toFixed(1) : '0';
    const activeDaysCount = daysList.filter((d) => d.reportsCount > 0).length;
    const avgPerActiveDay = activeDaysCount > 0 ? (totalReports / activeDaysCount).toFixed(1) : '0';
    const peakDay = [...daysList].sort((a, b) => b.reportsCount - a.reportsCount)[0];

    return {
      daysList,
      totalReports,
      totalContracts,
      totalAmount,
      avgScore,
      activeDaysCount,
      avgPerActiveDay,
      peakDay,
    };
  }, [scopedReports, dailyDaysCount]);

  // -------------------------------------------------------------
  // 2. DATA COMPUTATION FOR DAILY CUSTOMER-CENTRIC PERFORMANCE
  // -------------------------------------------------------------
  const dailyCustomerStats = useMemo(() => {
    const daysMap = new Map<
      string,
      {
        dateIso: string;
        dateJalali: string;
        dayName: string;
        uniqueCustomerIds: Set<string>;
        customersList: { customer: Customer | null; latestReport: CustomerReport }[];
        contractCustomerIds: Set<string>;
        newContactCount: number;
        followupCount: number;
      }
    >();

    const now = new Date();
    for (let i = dailyDaysCount - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const isoKey = d.toISOString().split('T')[0];
      const jStr = gregorianIsoToJalali(isoKey);
      const dayName = new Intl.DateTimeFormat('fa-IR', { weekday: 'short' }).format(d);

      daysMap.set(isoKey, {
        dateIso: isoKey,
        dateJalali: jStr,
        dayName,
        uniqueCustomerIds: new Set(),
        customersList: [],
        contractCustomerIds: new Set(),
        newContactCount: 0,
        followupCount: 0,
      });
    }

    // Process reports to gather customer coverage per day
    scopedReports.forEach((rep) => {
      if (!rep.date_created || !rep.customer_id) return;
      const repIso = new Date(rep.date_created).toISOString().split('T')[0];
      const entry = daysMap.get(repIso);
      if (entry) {
        const custObj = customers.find((c) => c.id === rep.customer_id) || null;
        if (!entry.uniqueCustomerIds.has(rep.customer_id)) {
          entry.uniqueCustomerIds.add(rep.customer_id);
          entry.customersList.push({ customer: custObj, latestReport: rep });
        }

        const isContract =
          rep.negotiation_status === 'قرارداد' ||
          rep.negotiation_status === 'قرارداد / فاکتور' ||
          Boolean(rep.contract_number) ||
          Boolean(rep.contract_amount);

        if (isContract) {
          entry.contractCustomerIds.add(rep.customer_id);
        }

        if (rep.negotiation_status === 'تماس برقرار نشده' || rep.negotiation_status === 'پیگیری قبل از انقضا') {
          entry.newContactCount += 1;
        } else {
          entry.followupCount += 1;
        }
      }
    });

    const daysList = Array.from(daysMap.values()).map((d) => ({
      ...d,
      uniqueCount: d.uniqueCustomerIds.size,
      contractCount: d.contractCustomerIds.size,
    }));

    const totalUniqueCustomersTouched = new Set(
      scopedReports
        .filter((r) => {
          if (!r.date_created) return false;
          const rDate = new Date(r.date_created);
          const minDate = new Date(now.getTime() - dailyDaysCount * 24 * 60 * 60 * 1000);
          return rDate >= minDate;
        })
        .map((r) => r.customer_id)
    ).size;

    const avgCustomersPerDay =
      daysList.length > 0
        ? (daysList.reduce((acc, d) => acc + d.uniqueCount, 0) / daysList.length).toFixed(1)
        : '0';

    return {
      daysList,
      totalUniqueCustomersTouched,
      avgCustomersPerDay,
      totalAssignedCustomers: scopedCustomers.length,
    };
  }, [scopedReports, customers, scopedCustomers, dailyDaysCount]);

  // -------------------------------------------------------------
  // 3. DATA COMPUTATION FOR PERIODIC REPORTS & TRENDS
  // -------------------------------------------------------------
  const periodicStats = useMemo(() => {
    const totalReports = periodicReports.length;
    const uniqueCustomerIds = new Set(periodicReports.map((r) => r.customer_id));
    const totalUniqueCustomers = uniqueCustomerIds.size;

    let totalContracts = 0;
    let totalContractAmount = 0;
    let scoresSum = 0;
    let scoresCount = 0;

    const statusBreakdown: Record<string, number> = {};

    periodicReports.forEach((rep) => {
      const st = formatStatusLabel(rep.negotiation_status) || 'سایر';
      statusBreakdown[st] = (statusBreakdown[st] || 0) + 1;

      if (typeof rep.negotiation_score === 'number' && rep.negotiation_score > 0) {
        scoresSum += rep.negotiation_score;
        scoresCount += 1;
      }

      const isContract =
        rep.negotiation_status === 'قرارداد' ||
        rep.negotiation_status === 'قرارداد / فاکتور' ||
        Boolean(rep.contract_number) ||
        Boolean(rep.contract_amount);

      if (isContract) {
        totalContracts += 1;
        if (rep.contract_amount && !isNaN(Number(rep.contract_amount))) {
          totalContractAmount += Number(rep.contract_amount);
        }
      }
    });

    const avgScore = scoresCount > 0 ? (scoresSum / scoresCount).toFixed(1) : '0';
    const conversionRate =
      totalUniqueCustomers > 0 ? ((totalContracts / totalUniqueCustomers) * 100).toFixed(1) : '0';

    // Personnel Performance Breakdown (for Admin)
    const personnelBreakdownMap = new Map<
      string,
      {
        personnelName: string;
        reportsCount: number;
        uniqueCustomers: Set<string>;
        contractsCount: number;
        totalAmount: number;
        scoresSum: number;
        scoresCount: number;
      }
    >();

    periodicReports.forEach((rep) => {
      const pName = rep.negotiator_name || 'نامشخص';
      let entry = personnelBreakdownMap.get(pName);
      if (!entry) {
        entry = {
          personnelName: pName,
          reportsCount: 0,
          uniqueCustomers: new Set(),
          contractsCount: 0,
          totalAmount: 0,
          scoresSum: 0,
          scoresCount: 0,
        };
        personnelBreakdownMap.set(pName, entry);
      }

      entry.reportsCount += 1;
      if (rep.customer_id) entry.uniqueCustomers.add(rep.customer_id);

      if (typeof rep.negotiation_score === 'number' && rep.negotiation_score > 0) {
        entry.scoresSum += rep.negotiation_score;
        entry.scoresCount += 1;
      }

      const isContract =
        rep.negotiation_status === 'قرارداد' ||
        rep.negotiation_status === 'قرارداد / فاکتور' ||
        Boolean(rep.contract_number) ||
        Boolean(rep.contract_amount);

      if (isContract) {
        entry.contractsCount += 1;
        if (rep.contract_amount && !isNaN(Number(rep.contract_amount))) {
          entry.totalAmount += Number(rep.contract_amount);
        }
      }
    });

    const personnelRanking = Array.from(personnelBreakdownMap.values())
      .map((item) => ({
        ...item,
        uniqueCustomersCount: item.uniqueCustomers.size,
        avgScore: item.scoresCount > 0 ? (item.scoresSum / item.scoresCount).toFixed(1) : '0',
      }))
      .sort((a, b) => b.contractsCount - a.contractsCount || b.reportsCount - a.reportsCount);

    return {
      totalReports,
      totalUniqueCustomers,
      totalContracts,
      totalContractAmount,
      avgScore,
      conversionRate,
      statusBreakdown,
      personnelRanking,
    };
  }, [periodicReports]);

  // Max value calculation for bar chart scalers
  const maxDailyReports = Math.max(...dailyReportStats.daysList.map((d) => d.reportsCount), 5);
  const maxDailyCustomers = Math.max(...dailyCustomerStats.daysList.map((d) => d.uniqueCount), 5);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* ------------------------------------------------------------- */}
      {/* 1. TOP HEADER & TITLE & PERSONNEL SEARCH FILTER */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-[#121212] border border-[#282828] rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1DB954] to-[#14833b] text-black flex items-center justify-center shadow-lg shadow-[#1DB954]/20 flex-shrink-0">
              <BarChart3 className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  گزارشات نموداری
                </h1>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#1DB954]/15 text-[#1DB954] font-bold border border-[#1DB954]/30 font-mono">
                  LIVE ANALYTICS
                </span>
              </div>
              <p className="text-xs text-[#A7A7A7] mt-0.5">
                {userIsAdmin
                  ? 'پایش هوشمند عملکرد روزانه، بررسی تعاملات با مشتریان و تحلیل جامع دوره‌ای تیم فروش'
                  : 'پایش و آنالیز نموداری عملکرد اختصاصی و پرونده‌های تحت پیگیری شما'}
              </p>
            </div>
          </div>

          {/* Personnel Filter Badge / Search for Admin */}
          {userIsAdmin ? (
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="flex items-center gap-2 bg-[#181818] border border-[#333] hover:border-[#1DB954] rounded-xl px-3 py-1.5 transition-all shadow-inner">
                  <User className="w-4 h-4 text-[#1DB954]" />
                  <span className="text-xs text-[#888]">کارشناس:</span>
                  <select
                    value={selectedPersonnelId}
                    onChange={(e) => setSelectedPersonnelId(e.target.value)}
                    className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer pr-1"
                  >
                    <option value="all" className="bg-[#181818] text-white">
                      📊 همه پرسنل (کل تیم)
                    </option>
                    {filteredPersonnelOptions.map((p) => (
                      <option key={p.id} value={p.id} className="bg-[#181818] text-white">
                        {p.name} ({p.role === 'admin' ? 'مدیر' : 'کارشناس'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Instant Search input for long personnel lists */}
              <div className="relative hidden sm:block">
                <input
                  type="text"
                  value={personnelSearch}
                  onChange={(e) => setPersonnelSearch(e.target.value)}
                  placeholder="جستجوی کارشناس..."
                  className="w-36 lg:w-44 h-9 px-3 pr-8 rounded-xl bg-[#181818] text-xs text-white border border-[#333] focus:border-[#1DB954] focus:outline-none"
                />
                <Search className="w-3.5 h-3.5 text-[#777] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#1DB954]/10 border border-[#1DB954]/30 text-xs text-white">
              <ShieldCheck className="w-4 h-4 text-[#1DB954]" />
              <span className="text-[#A7A7A7]">کارشناس:</span>
              <span className="font-bold text-[#1DB954]">
                {currentPersonnel?.name || currentUser?.name || 'کارشناس پیگیری'}
              </span>
              <span className="text-[10px] text-[#777] font-mono mr-1">(دسترسی اختصاصی)</span>
            </div>
          )}
        </div>

        {/* Navigation Tabs (3 Main Sections) */}
        <div className="flex items-center gap-2 border-t border-[#222] pt-4 overflow-x-auto no-scrollbar">
          <button
            onClick={() => {
              setActiveTab('daily_reports');
              setSelectedDayDetail(null);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'daily_reports'
                ? 'bg-[#1DB954] text-black shadow-lg shadow-[#1DB954]/25 scale-[1.02]'
                : 'bg-[#181818] hover:bg-[#222] text-[#B3B3B3] hover:text-white border border-[#282828]'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>عملکرد روزانه گزارش‌محور</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('daily_customers');
              setSelectedDayDetail(null);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'daily_customers'
                ? 'bg-[#1DB954] text-black shadow-lg shadow-[#1DB954]/25 scale-[1.02]'
                : 'bg-[#181818] hover:bg-[#222] text-[#B3B3B3] hover:text-white border border-[#282828]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>عملکرد روزانه مشتری‌محور</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('periodic');
              setSelectedDayDetail(null);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'periodic'
                ? 'bg-[#1DB954] text-black shadow-lg shadow-[#1DB954]/25 scale-[1.02]'
                : 'bg-[#181818] hover:bg-[#222] text-[#B3B3B3] hover:text-white border border-[#282828]'
            }`}
          >
            <PieChart className="w-4 h-4" />
            <span>گزارشات و روندهای دوره‌ای</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. TAB 1: DAILY REPORT-CENTRIC PERFORMANCE */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'daily_reports' && (
        <div className="space-y-6">
          {/* Controls & Range Selector */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#181818] border border-[#282828] p-3.5 rounded-2xl">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#1DB954]" />
              <span className="text-xs font-bold text-white">بازه تحلیل روزانه:</span>
              <div className="flex items-center gap-1.5 bg-[#121212] p-1 rounded-xl border border-[#282828]">
                {[7, 14, 30].map((days) => (
                  <button
                    key={days}
                    onClick={() => {
                      setDailyDaysCount(days);
                      setSelectedDayDetail(null);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      dailyDaysCount === days
                        ? 'bg-[#1DB954] text-black font-mono shadow-sm'
                        : 'text-[#888] hover:text-white font-mono'
                    }`}
                  >
                    {days} روز گذشته
                  </button>
                ))}
              </div>
            </div>

            <div className="text-xs text-[#888] flex items-center gap-2">
              <span>روزهای با فعالیت ثبت شده:</span>
              <span className="font-mono font-bold text-[#1DB954] bg-[#121212] px-2 py-0.5 rounded border border-[#282828]">
                {toPersianDigits(dailyReportStats.activeDaysCount)} از {toPersianDigits(dailyDaysCount)} روز
              </span>
            </div>
          </div>

          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-[#181818] border border-[#282828] space-y-2 hover:border-[#383838] transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#A7A7A7]">کل گزارش‌های بازه</span>
                <div className="w-8 h-8 rounded-xl bg-[#1DB954]/15 text-[#1DB954] flex items-center justify-center">
                  <MessageSquareText className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-white font-mono">
                  {toPersianDigits(dailyReportStats.totalReports)}
                </span>
                <span className="text-[11px] text-[#888]">گزارش ثبت شده</span>
              </div>
              <div className="text-[11px] text-[#A7A7A7] flex items-center gap-1 pt-1 border-t border-[#242424]">
                <span>میانگین روزانه:</span>
                <span className="text-white font-bold font-mono">{toPersianDigits(dailyReportStats.avgPerActiveDay)}</span>
                <span>در روزهای فعال</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#181818] border border-[#282828] space-y-2 hover:border-[#383838] transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#A7A7A7]">قراردادها و فاکتورها</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                  <FileCheck2 className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-emerald-400 font-mono">
                  {toPersianDigits(dailyReportStats.totalContracts)}
                </span>
                <span className="text-[11px] text-[#888]">قرارداد موفق</span>
              </div>
              <div className="text-[11px] text-[#A7A7A7] flex items-center gap-1 pt-1 border-t border-[#242424]">
                <span>مجموع مبالغ:</span>
                <span className="text-[#1DB954] font-bold font-mono">
                  {dailyReportStats.totalAmount > 0 ? formatToman(dailyReportStats.totalAmount) : '۰ تومان'}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#181818] border border-[#282828] space-y-2 hover:border-[#383838] transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#A7A7A7]">میانگین کیفیت مکالمات</span>
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
                  <Star className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-amber-400 font-mono">
                  {toPersianDigits(dailyReportStats.avgScore)}
                </span>
                <span className="text-xs text-[#888]">از ۱۰</span>
              </div>
              <div className="text-[11px] text-[#A7A7A7] flex items-center gap-1 pt-1 border-t border-[#242424]">
                <span>امتیاز ثبت‌شده توسط کارشناسان</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#181818] border border-[#282828] space-y-2 hover:border-[#383838] transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#A7A7A7]">روز اوج ثبت گزارش</span>
                <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center">
                  <Zap className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-white font-mono">
                  {dailyReportStats.peakDay?.reportsCount > 0
                    ? `${toPersianDigits(dailyReportStats.peakDay.reportsCount)} گزارش`
                    : 'بدون ثبت'}
                </span>
              </div>
              <div className="text-[11px] text-[#A7A7A7] flex items-center gap-1 pt-1 border-t border-[#242424]">
                <span>تاریخ:</span>
                <span className="text-white font-mono font-bold">
                  {dailyReportStats.peakDay?.reportsCount > 0
                    ? `${dailyReportStats.peakDay.dayName} ${toPersianDigits(dailyReportStats.peakDay.dateJalali)}`
                    : '-'}
                </span>
              </div>
            </div>
          </div>

          {/* Daily Interactive Bar & Area Chart */}
          <div className="p-5 rounded-2xl bg-[#181818] border border-[#282828] space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#282828] pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#1DB954]" />
                <h3 className="text-sm font-bold text-white">
                  نمودار ستونی و روند ثبت گزارش‌ها در {toPersianDigits(dailyDaysCount)} روز گذشته
                </h3>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-[#1DB954]" />
                  <span className="text-[#A7A7A7]">تعداد گزارش روزانه</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-amber-400" />
                  <span className="text-[#A7A7A7]">قرارداد / فاکتور</span>
                </div>
              </div>
            </div>

            {/* Custom Interactive SVG / HTML Bar Chart */}
            <div className="pt-4 pb-2">
              <div className="grid grid-cols-7 sm:grid-cols-14 gap-2 items-end h-56 px-2">
                {dailyReportStats.daysList.map((day, idx) => {
                  const heightPercent = maxDailyReports > 0 ? (day.reportsCount / maxDailyReports) * 100 : 0;
                  const isSelected = selectedDayDetail === day.dateIso;
                  const hasContract = day.contractsCount > 0;

                  return (
                    <div
                      key={day.dateIso}
                      onClick={() => setSelectedDayDetail(isSelected ? null : day.dateIso)}
                      className="group flex flex-col items-center justify-end h-full cursor-pointer relative"
                    >
                      {/* Tooltip on Hover */}
                      <div className="opacity-0 group-hover:opacity-100 pointer-events-none absolute -top-14 z-30 transition-all bg-[#0d0d0d] border border-[#333] px-2.5 py-1.5 rounded-xl shadow-2xl text-[11px] text-white whitespace-nowrap">
                        <div className="font-bold text-[#1DB954]">{day.dayName} {toPersianDigits(day.dateJalali)}</div>
                        <div>{toPersianDigits(day.reportsCount)} گزارش ثبت شده</div>
                        {day.contractsCount > 0 && (
                          <div className="text-amber-400 font-bold font-mono">
                            {toPersianDigits(day.contractsCount)} قرارداد ({formatToman(day.contractsAmount)})
                          </div>
                        )}
                      </div>

                      {/* Number on top of bar */}
                      <div
                        className={`text-[10px] font-mono font-bold mb-1 transition-colors ${
                          day.reportsCount > 0 ? (isSelected ? 'text-[#1DB954]' : 'text-white') : 'text-[#444]'
                        }`}
                      >
                        {day.reportsCount > 0 ? toPersianDigits(day.reportsCount) : '۰'}
                      </div>

                      {/* Bar Pillar */}
                      <div className="w-full max-w-[28px] bg-[#242424] rounded-t-lg h-full flex flex-col justify-end p-0.5 overflow-hidden">
                        <div
                          style={{ height: `${Math.max(heightPercent, day.reportsCount > 0 ? 8 : 0)}%` }}
                          className={`w-full rounded-t-md transition-all duration-300 ${
                            isSelected
                              ? 'bg-gradient-to-t from-[#14833b] to-[#1ED760] shadow-lg shadow-[#1DB954]/50'
                              : hasContract
                              ? 'bg-gradient-to-t from-[#1DB954] to-amber-400 group-hover:brightness-125'
                              : day.reportsCount > 0
                              ? 'bg-gradient-to-t from-[#14833b] to-[#1DB954] group-hover:brightness-125'
                              : 'bg-transparent'
                          }`}
                        />
                      </div>

                      {/* X-axis date label */}
                      <div className="mt-2 text-center">
                        <div className="text-[10px] text-[#777] font-mono group-hover:text-white transition-colors truncate">
                          {toPersianDigits(day.dateJalali.split('/').slice(1).join('/'))}
                        </div>
                        <div className="text-[9px] text-[#555]">{day.dayName}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="text-center text-[11px] text-[#777] pt-2 border-t border-[#222]">
              برای مشاهده گزارش‌های ثبت‌شده هر روز، روی ستون مربوط به آن روز کلیک کنید.
            </div>
          </div>

          {/* Details of Selected Day or Full Day Breakdown Table */}
          <div className="p-5 rounded-2xl bg-[#181818] border border-[#282828] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#1DB954]" />
                <h3 className="text-sm font-bold text-white">
                  {selectedDayDetail
                    ? `جزئیات گزارش‌های روز ${toPersianDigits(gregorianIsoToJalali(selectedDayDetail))}`
                    : 'جدول تفکیکی گزارش‌های روزانه'}
                </h3>
              </div>

              {selectedDayDetail && (
                <button
                  onClick={() => setSelectedDayDetail(null)}
                  className="text-xs text-[#1DB954] hover:underline"
                >
                  نمایش همه روزها
                </button>
              )}
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-[#282828] text-[#888]">
                    <th className="py-2.5 px-3 font-semibold">تاریخ (شمسی)</th>
                    <th className="py-2.5 px-3 font-semibold">روز هفته</th>
                    <th className="py-2.5 px-3 font-semibold">تعداد گزارش</th>
                    <th className="py-2.5 px-3 font-semibold">قرارداد / فاکتور</th>
                    <th className="py-2.5 px-3 font-semibold">مبلغ قراردادها</th>
                    <th className="py-2.5 px-3 font-semibold">میانگین امتیاز</th>
                    <th className="py-2.5 px-3 font-semibold">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222]">
                  {dailyReportStats.daysList
                    .filter((d) => (selectedDayDetail ? d.dateIso === selectedDayDetail : true))
                    .map((day) => (
                      <tr
                        key={day.dateIso}
                        className={`hover:bg-[#202020] transition-colors ${
                          day.reportsCount > 0 ? 'text-white' : 'text-[#666]'
                        }`}
                      >
                        <td className="py-3 px-3 font-mono font-bold text-white">
                          {toPersianDigits(day.dateJalali)}
                        </td>
                        <td className="py-3 px-3 text-[#A7A7A7]">{day.dayName}</td>
                        <td className="py-3 px-3 font-mono font-bold">
                          {day.reportsCount > 0 ? (
                            <span className="px-2 py-0.5 rounded bg-[#1DB954]/15 text-[#1DB954] border border-[#1DB954]/30">
                              {toPersianDigits(day.reportsCount)} گزارش
                            </span>
                          ) : (
                            <span className="text-[#555]">۰</span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono">
                          {day.contractsCount > 0 ? (
                            <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 font-bold border border-amber-500/30">
                              {toPersianDigits(day.contractsCount)} قرارداد
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-[#1DB954]">
                          {day.contractsAmount > 0 ? formatToman(day.contractsAmount) : '-'}
                        </td>
                        <td className="py-3 px-3 font-mono">
                          {day.scoresCount > 0
                            ? `${toPersianDigits((day.scoresSum / day.scoresCount).toFixed(1))} / ۱۰`
                            : '-'}
                        </td>
                        <td className="py-3 px-3">
                          {day.reportsCount > 0 ? (
                            <button
                              onClick={() => setSelectedDayDetail(day.dateIso)}
                              className="px-2.5 py-1 rounded-lg bg-[#282828] hover:bg-[#333] text-white text-[11px] transition-colors"
                            >
                              مشاهده ریز گزارش‌ها
                            </button>
                          ) : (
                            <span className="text-[#555]">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* List of reports for selected single day */}
            {selectedDayDetail && (
              <div className="pt-4 border-t border-[#282828] space-y-3">
                <div className="font-bold text-xs text-white">
                  فهرست گزارش‌های ثبت شده در تاریخ {toPersianDigits(gregorianIsoToJalali(selectedDayDetail))}:
                </div>
                {dailyReportStats.daysList
                  .find((d) => d.dateIso === selectedDayDetail)
                  ?.reports.map((rep) => {
                    const cust = customers.find((c) => c.id === rep.customer_id);
                    const stTheme = getStatusTheme(rep.negotiation_status);

                    return (
                      <div
                        key={rep.id}
                        className="p-3.5 rounded-xl bg-[#121212] border border-[#262626] space-y-2 hover:border-[#3a3a3a] transition-all"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <span className="font-bold text-xs text-white">
                              {cust ? cust.company_name : 'مشتری نامشخص'}
                            </span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full border ${stTheme.bg} ${stTheme.color} font-medium`}
                            >
                              {formatStatusLabel(rep.negotiation_status)}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-[#888]">
                            <span>کارشناس: {rep.negotiator_name}</span>
                            <span>امتیاز: {toPersianDigits(rep.negotiation_score)}/10</span>
                            <span className="font-mono">{formatPersianDateTime(rep.date_created)}</span>
                          </div>
                        </div>

                        <p className="text-xs text-[#bbb] leading-relaxed whitespace-pre-wrap">
                          {rep.report_text}
                        </p>

                        {(rep.contract_number || rep.contract_amount) && (
                          <div className="p-2.5 rounded-lg bg-[#1DB954]/10 border border-[#1DB954]/25 text-xs flex items-center justify-between text-[#1DB954]">
                            <span className="font-bold">سند قرارداد / فاکتور: {rep.contract_number || 'ثبت شده'}</span>
                            <span className="font-mono font-bold">{formatToman(rep.contract_amount)}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. TAB 2: DAILY CUSTOMER-CENTRIC PERFORMANCE */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'daily_customers' && (
        <div className="space-y-6">
          {/* Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#181818] border border-[#282828] p-3.5 rounded-2xl">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#1DB954]" />
              <span className="text-xs font-bold text-white">بازه پایش تعامل با مشتریان:</span>
              <div className="flex items-center gap-1.5 bg-[#121212] p-1 rounded-xl border border-[#282828]">
                {[7, 14, 30].map((days) => (
                  <button
                    key={days}
                    onClick={() => {
                      setDailyDaysCount(days);
                      setSelectedDayDetail(null);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      dailyDaysCount === days
                        ? 'bg-[#1DB954] text-black font-mono shadow-sm'
                        : 'text-[#888] hover:text-white font-mono'
                    }`}
                  >
                    {days} روز گذشته
                  </button>
                ))}
              </div>
            </div>

            <div className="text-xs text-[#888] flex items-center gap-2">
              <span>کل مشتریان تحت پوشش:</span>
              <span className="font-mono font-bold text-[#1DB954] bg-[#121212] px-2.5 py-0.5 rounded border border-[#282828]">
                {toPersianDigits(dailyCustomerStats.totalAssignedCustomers)} مشتری
              </span>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-[#181818] border border-[#282828] space-y-2 hover:border-[#383838] transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#A7A7A7]">مشتریان منحصر‌به‌فرد پیگیری‌شده</span>
                <div className="w-8 h-8 rounded-xl bg-[#1DB954]/15 text-[#1DB954] flex items-center justify-center">
                  <UserCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-white font-mono">
                  {toPersianDigits(dailyCustomerStats.totalUniqueCustomersTouched)}
                </span>
                <span className="text-xs text-[#888]">مشتری یکتا</span>
              </div>
              <div className="text-[11px] text-[#A7A7A7] pt-1 border-t border-[#242424]">
                در بازه {toPersianDigits(dailyDaysCount)} روز اخیر حداقل یک‌بار مذاکره شده‌اند
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#181818] border border-[#282828] space-y-2 hover:border-[#383838] transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#A7A7A7]">میانگین پوشش مشتری در روز</span>
                <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center">
                  <Target className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-blue-400 font-mono">
                  {toPersianDigits(dailyCustomerStats.avgCustomersPerDay)}
                </span>
                <span className="text-xs text-[#888]">مشتری در روز</span>
              </div>
              <div className="text-[11px] text-[#A7A7A7] pt-1 border-t border-[#242424]">
                میانگین تعداد پرونده‌های مشتریان بررسی‌شده در هر روز تقویمی
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#181818] border border-[#282828] space-y-2 hover:border-[#383838] transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#A7A7A7]">نرخ پوشش کل پرونده‌ها</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-emerald-400 font-mono">
                  {dailyCustomerStats.totalAssignedCustomers > 0
                    ? toPersianDigits(
                        (
                          (dailyCustomerStats.totalUniqueCustomersTouched /
                            dailyCustomerStats.totalAssignedCustomers) *
                          100
                        ).toFixed(1)
                      )
                    : '۰'}
                  %
                </span>
                <span className="text-xs text-[#888]">پوشش پرونده‌ها</span>
              </div>
              <div className="text-[11px] text-[#A7A7A7] pt-1 border-t border-[#242424]">
                درصد مشتریان تخصیص‌یافته که پیگیری روی آن‌ها انجام شده است
              </div>
            </div>
          </div>

          {/* Daily Customer Interaction Chart */}
          <div className="p-5 rounded-2xl bg-[#181818] border border-[#282828] space-y-4">
            <div className="flex items-center justify-between border-b border-[#282828] pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#1DB954]" />
                <h3 className="text-sm font-bold text-white">
                  نمودار تعامل روزانه با مشتریان منحصر‌به‌فرد
                </h3>
              </div>
            </div>

            <div className="pt-4 pb-2">
              <div className="grid grid-cols-7 sm:grid-cols-14 gap-2 items-end h-52 px-2">
                {dailyCustomerStats.daysList.map((day) => {
                  const heightPercent = maxDailyCustomers > 0 ? (day.uniqueCount / maxDailyCustomers) * 100 : 0;
                  const isSelected = selectedDayDetail === day.dateIso;

                  return (
                    <div
                      key={day.dateIso}
                      onClick={() => setSelectedDayDetail(isSelected ? null : day.dateIso)}
                      className="group flex flex-col items-center justify-end h-full cursor-pointer relative"
                    >
                      {/* Tooltip */}
                      <div className="opacity-0 group-hover:opacity-100 pointer-events-none absolute -top-12 z-30 transition-all bg-[#0d0d0d] border border-[#333] px-2.5 py-1 rounded-xl shadow-2xl text-[11px] text-white whitespace-nowrap">
                        <div className="font-bold text-[#1DB954]">{day.dayName} {toPersianDigits(day.dateJalali)}</div>
                        <div>{toPersianDigits(day.uniqueCount)} مشتری منحصر‌به‌فرد</div>
                      </div>

                      {/* Top Count */}
                      <div
                        className={`text-[10px] font-mono font-bold mb-1 ${
                          day.uniqueCount > 0 ? 'text-white' : 'text-[#444]'
                        }`}
                      >
                        {day.uniqueCount > 0 ? toPersianDigits(day.uniqueCount) : '۰'}
                      </div>

                      {/* Bar */}
                      <div className="w-full max-w-[28px] bg-[#242424] rounded-t-lg h-full flex flex-col justify-end p-0.5 overflow-hidden">
                        <div
                          style={{ height: `${Math.max(heightPercent, day.uniqueCount > 0 ? 8 : 0)}%` }}
                          className={`w-full rounded-t-md transition-all duration-300 ${
                            isSelected
                              ? 'bg-gradient-to-t from-blue-600 to-blue-400 shadow-lg shadow-blue-500/50'
                              : day.uniqueCount > 0
                              ? 'bg-gradient-to-t from-blue-700 to-blue-400 group-hover:brightness-125'
                              : 'bg-transparent'
                          }`}
                        />
                      </div>

                      {/* Date */}
                      <div className="mt-2 text-center">
                        <div className="text-[10px] text-[#777] font-mono truncate">
                          {toPersianDigits(day.dateJalali.split('/').slice(1).join('/'))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Customers Engaged Table */}
          <div className="p-5 rounded-2xl bg-[#181818] border border-[#282828] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-[#1DB954]" />
                <h3 className="text-sm font-bold text-white">
                  {selectedDayDetail
                    ? `مشتریان پیگیری‌شده در تاریخ ${toPersianDigits(gregorianIsoToJalali(selectedDayDetail))}`
                    : 'فهرست تعاملات مشتریان در بازه جاری'}
                </h3>
              </div>
              {selectedDayDetail && (
                <button
                  onClick={() => setSelectedDayDetail(null)}
                  className="text-xs text-[#1DB954] hover:underline"
                >
                  نمایش همه روزها
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-[#282828] text-[#888]">
                    <th className="py-2.5 px-3 font-semibold">تاریخ</th>
                    <th className="py-2.5 px-3 font-semibold">نام مشتری / فروشگاه</th>
                    <th className="py-2.5 px-3 font-semibold">حوزه فعالیت / شهر</th>
                    <th className="py-2.5 px-3 font-semibold">آخرین وضعیت ثبت‌شده</th>
                    <th className="py-2.5 px-3 font-semibold">امتیاز مذاکره</th>
                    <th className="py-2.5 px-3 font-semibold">کارشناس پیگیری</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222]">
                  {dailyCustomerStats.daysList
                    .filter((d) => (selectedDayDetail ? d.dateIso === selectedDayDetail : true))
                    .flatMap((day) =>
                      day.customersList.map((item, idx) => {
                        const stTheme = getStatusTheme(item.latestReport.negotiation_status);
                        return (
                          <tr
                            key={`${day.dateIso}-${item.latestReport.id}-${idx}`}
                            className="hover:bg-[#202020] transition-colors"
                          >
                            <td className="py-3 px-3 font-mono text-[#888]">
                              {toPersianDigits(day.dateJalali)} ({day.dayName})
                            </td>
                            <td className="py-3 px-3 font-bold text-white">
                              {item.customer ? (
                                <button
                                  onClick={() => onSelectCustomer && onSelectCustomer(item.customer!)}
                                  className="hover:text-[#1DB954] transition-colors"
                                >
                                  {item.customer.company_name}
                                </button>
                              ) : (
                                'مشتری بدون پرونده'
                              )}
                            </td>
                            <td className="py-3 px-3 text-[#A7A7A7]">
                              {item.customer?.business_type || '-'} ({item.customer?.city || '-'})
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={`text-[10px] px-2.5 py-0.5 rounded-full border ${stTheme.bg} ${stTheme.color} font-medium`}
                              >
                                {formatStatusLabel(item.latestReport.negotiation_status)}
                              </span>
                            </td>
                            <td className="py-3 px-3 font-mono font-bold text-amber-400">
                              {toPersianDigits(item.latestReport.negotiation_score)}/10
                            </td>
                            <td className="py-3 px-3 text-white">
                              {item.latestReport.negotiator_name}
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
      {/* 4. TAB 3: PERIODIC REPORTS & OVERALL TRENDS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'periodic' && (
        <div className="space-y-6">
          {/* Period Preset & Custom Date Selector */}
          <div className="bg-[#181818] border border-[#282828] p-4 rounded-2xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#1DB954]" />
                <span className="text-xs font-bold text-white">انتخاب بازه زمانی دوره:</span>
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap items-center gap-1.5 bg-[#121212] p-1 rounded-xl border border-[#282828]">
                {[
                  { id: 'today' as PeriodPreset, label: 'امروز' },
                  { id: 'last_7_days' as PeriodPreset, label: '۷ روز گذشته' },
                  { id: 'last_30_days' as PeriodPreset, label: '۳۰ روز گذشته' },
                  { id: 'last_90_days' as PeriodPreset, label: '۳ ماه گذشته' },
                  { id: 'this_year' as PeriodPreset, label: 'امسال' },
                  { id: 'custom' as PeriodPreset, label: 'بازه دلخواه' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setPeriodPreset(item.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      periodPreset === item.id
                        ? 'bg-[#1DB954] text-black shadow-md'
                        : 'text-[#888] hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Date Range Pickers if 'custom' is active */}
            {periodPreset === 'custom' && (
              <div className="pt-3 border-t border-[#262626] grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in">
                <div>
                  <PersianDatePicker
                    label="از تاریخ (شروع دوره)"
                    value={customStartDate}
                    onChange={(iso) => setCustomStartDate(iso)}
                  />
                </div>
                <div>
                  <PersianDatePicker
                    label="تا تاریخ (پایان دوره)"
                    value={customEndDate}
                    onChange={(iso) => setCustomEndDate(iso)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Period Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
            <div className="p-4 rounded-2xl bg-[#181818] border border-[#282828] space-y-1">
              <span className="text-[11px] text-[#A7A7A7]">کل گزارش‌های دوره</span>
              <div className="text-2xl font-black text-white font-mono">
                {toPersianDigits(periodicStats.totalReports)}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#181818] border border-[#282828] space-y-1">
              <span className="text-[11px] text-[#A7A7A7]">مشتریان پیگیری‌شده</span>
              <div className="text-2xl font-black text-blue-400 font-mono">
                {toPersianDigits(periodicStats.totalUniqueCustomers)}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#181818] border border-[#282828] space-y-1">
              <span className="text-[11px] text-[#A7A7A7]">قراردادهای نهایی</span>
              <div className="text-2xl font-black text-emerald-400 font-mono">
                {toPersianDigits(periodicStats.totalContracts)}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#181818] border border-[#282828] space-y-1 sm:col-span-2 lg:col-span-1 xl:col-span-2">
              <span className="text-[11px] text-[#A7A7A7]">مجموع ارزش قراردادها</span>
              <div className="text-lg font-black text-[#1DB954] font-mono truncate">
                {periodicStats.totalContractAmount > 0
                  ? formatToman(periodicStats.totalContractAmount)
                  : '۰ تومان'}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#181818] border border-[#282828] space-y-1">
              <span className="text-[11px] text-[#A7A7A7]">نرخ تبدیل موفق</span>
              <div className="text-2xl font-black text-amber-400 font-mono">
                {toPersianDigits(periodicStats.conversionRate)}%
              </div>
            </div>
          </div>

          {/* Status Breakdown & Funnel */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Status Distribution Donut-style List */}
            <div className="p-5 rounded-2xl bg-[#181818] border border-[#282828] space-y-4">
              <div className="flex items-center gap-2 border-b border-[#282828] pb-3">
                <PieChart className="w-4 h-4 text-[#1DB954]" />
                <h3 className="text-sm font-bold text-white">توزیع وضعیت‌های مذاکره در این دوره</h3>
              </div>

              <div className="space-y-2.5">
                {Object.entries(periodicStats.statusBreakdown).length > 0 ? (
                  Object.entries(periodicStats.statusBreakdown)
                    .sort((a, b) => b[1] - a[1])
                    .map(([statusName, count]) => {
                      const percent =
                        periodicStats.totalReports > 0
                          ? ((count / periodicStats.totalReports) * 100).toFixed(1)
                          : '0';
                      const theme = getStatusTheme(statusName);

                      return (
                        <div key={statusName} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-2 font-medium text-white">
                              <span className={`w-2.5 h-2.5 rounded-full ${theme.dot}`} />
                              <span>{statusName}</span>
                            </span>
                            <span className="font-mono text-[#A7A7A7]">
                              {toPersianDigits(count)} ({toPersianDigits(percent)}%)
                            </span>
                          </div>
                          <div className="w-full bg-[#242424] h-2 rounded-full overflow-hidden">
                            <div
                              style={{ width: `${percent}%` }}
                              className="h-full rounded-full bg-[#1DB954] transition-all duration-500"
                            />
                          </div>
                        </div>
                      );
                    })
                ) : (
                  <div className="p-8 text-center text-xs text-[#888]">
                    هیچ گزارشی در بازه انتخابی ثبت نشده است.
                  </div>
                )}
              </div>
            </div>

            {/* Sales Conversion Funnel */}
            <div className="p-5 rounded-2xl bg-[#181818] border border-[#282828] space-y-4">
              <div className="flex items-center gap-2 border-b border-[#282828] pb-3">
                <Target className="w-4 h-4 text-[#1DB954]" />
                <h3 className="text-sm font-bold text-white">قیف تبدیل عملکرد دوره (Conversion Funnel)</h3>
              </div>

              <div className="space-y-3 pt-2">
                {/* Step 1 */}
                <div className="p-3 rounded-xl bg-[#121212] border border-[#282828] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 font-bold text-xs flex items-center justify-center font-mono">
                      ۱
                    </span>
                    <div>
                      <div className="text-xs font-bold text-white">مشتریان در مرحله تماس اولیه</div>
                      <div className="text-[10px] text-[#888]">شروع ارتباط و اعلام نیاز</div>
                    </div>
                  </div>
                  <div className="text-sm font-black font-mono text-white">
                    {toPersianDigits(periodicStats.totalUniqueCustomers)}
                  </div>
                </div>

                {/* Step 2 */}
                <div className="p-3 rounded-xl bg-[#121212] border border-[#282828] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-bold text-xs flex items-center justify-center font-mono">
                      ۲
                    </span>
                    <div>
                      <div className="text-xs font-bold text-white">پیگیری‌های فعال و مذاکره</div>
                      <div className="text-[10px] text-[#888]">ارسال پروپوزال و مذاکره مالی</div>
                    </div>
                  </div>
                  <div className="text-sm font-black font-mono text-amber-400">
                    {toPersianDigits(
                      (periodicStats.statusBreakdown['پیگیری قرارداد'] || 0) +
                        (periodicStats.statusBreakdown['پیش نویس قرارداد'] || 0) +
                        (periodicStats.statusBreakdown['پیگیری قبل از انقضا'] || 0)
                    )}
                  </div>
                </div>

                {/* Step 3 */}
                <div className="p-3 rounded-xl bg-[#1DB954]/10 border border-[#1DB954]/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#1DB954] text-black font-bold text-xs flex items-center justify-center font-mono">
                      ۳
                    </span>
                    <div>
                      <div className="text-xs font-bold text-[#1DB954]">قرارداد نهایی و صدور فاکتور</div>
                      <div className="text-[10px] text-[#A7A7A7]">فروش قطعی و درآمدزایی</div>
                    </div>
                  </div>
                  <div className="text-sm font-black font-mono text-[#1DB954]">
                    {toPersianDigits(periodicStats.totalContracts)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Personnel Leaderboard / Performance Matrix (Admin Only) */}
          {userIsAdmin && (
            <div className="p-5 rounded-2xl bg-[#181818] border border-[#282828] space-y-4">
              <div className="flex items-center justify-between border-b border-[#282828] pb-3">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-white">
                    جدول مقایسه عملکرد و رتبه‌بندی پرسنل در این دوره
                  </h3>
                </div>
                <span className="text-xs text-[#888]">بر اساس تعداد قراردادها و حجم فعالیت</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-[#282828] text-[#888]">
                      <th className="py-2.5 px-3 font-semibold">رتبه</th>
                      <th className="py-2.5 px-3 font-semibold">نام کارشناس</th>
                      <th className="py-2.5 px-3 font-semibold">تعداد گزارش‌ها</th>
                      <th className="py-2.5 px-3 font-semibold">مشتریان یکتا</th>
                      <th className="py-2.5 px-3 font-semibold">قراردادهای نهایی</th>
                      <th className="py-2.5 px-3 font-semibold">مجموع مبالغ (تومان)</th>
                      <th className="py-2.5 px-3 font-semibold">میانگین امتیاز</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#222]">
                    {periodicStats.personnelRanking.map((p, idx) => (
                      <tr key={p.personnelName} className="hover:bg-[#202020] transition-colors">
                        <td className="py-3 px-3 font-mono font-bold">
                          {idx === 0 ? (
                            <span className="w-6 h-6 rounded-full bg-amber-400 text-black flex items-center justify-center text-xs">
                              ۱
                            </span>
                          ) : idx === 1 ? (
                            <span className="w-6 h-6 rounded-full bg-gray-300 text-black flex items-center justify-center text-xs">
                              ۲
                            </span>
                          ) : idx === 2 ? (
                            <span className="w-6 h-6 rounded-full bg-amber-700 text-white flex items-center justify-center text-xs">
                              ۳
                            </span>
                          ) : (
                            <span className="text-[#888] pr-2">{idx + 1}</span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-bold text-white flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-[#1DB954]" />
                          <span>{p.personnelName}</span>
                        </td>
                        <td className="py-3 px-3 font-mono text-[#ddd]">
                          {toPersianDigits(p.reportsCount)}
                        </td>
                        <td className="py-3 px-3 font-mono text-blue-400 font-bold">
                          {toPersianDigits(p.uniqueCustomersCount)}
                        </td>
                        <td className="py-3 px-3 font-mono text-emerald-400 font-black">
                          {toPersianDigits(p.contractsCount)}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-[#1DB954]">
                          {p.totalAmount > 0 ? formatToman(p.totalAmount) : '-'}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-amber-400">
                          {toPersianDigits(p.avgScore)}/10
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
