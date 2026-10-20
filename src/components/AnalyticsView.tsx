import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Users,
  Search,
  PieChart,
  Activity,
  User,
  ShieldCheck,
} from 'lucide-react';
import { Customer, CustomerReport, Personnel, AuthUser } from '../types';
import {
  formatStatusLabel,
  gregorianIsoToJalali,
} from '../utils';
import { fetchCustomerReports, fetchCustomers } from '../api';
import { DailyReportsTab } from './analytics/DailyReportsTab';
import { CustomerCoverageTab } from './analytics/CustomerCoverageTab';
import { TrendsLeaderboardTab } from './analytics/TrendsLeaderboardTab';
import {
  AnalyticsTab,
  PeriodPreset,
  DailyReportStats,
  DailyCustomerStats,
  PeriodicStats,
} from './analytics/types';

interface AnalyticsViewProps {
  reports: CustomerReport[];
  customers: Customer[];
  personnelList: Personnel[];
  currentPersonnel?: Personnel | null;
  currentUser?: AuthUser | null;
  isAdmin?: boolean;
  onSelectCustomer?: (customer: Customer) => void;
}

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

  // Selected single day filter in daily views
  const [selectedDayDetail, setSelectedDayDetail] = useState<string | null>(null);

  // Full analytics datasets
  const [allReportsData, setAllReportsData] = useState<CustomerReport[]>(reports);
  const [allCustomersData] = useState<Customer[]>(customers);
  const [, setIsLoadingAnalytics] = useState<boolean>(false);

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

  // Reactive, lightweight, date-scoped query bounds
  const queryStartDate = useMemo(() => {
    if (activeTab === 'periodic') {
      return periodDateRange.start.toISOString();
    }
    // Daily views: bounded to requested days window (7, 14, 30 days)
    return new Date(Date.now() - (dailyDaysCount + 1) * 24 * 60 * 60 * 1000).toISOString();
  }, [activeTab, periodDateRange, dailyDaysCount]);

  const queryEndDate = useMemo(() => {
    if (activeTab === 'periodic') {
      return periodDateRange.end.toISOString();
    }
    return undefined;
  }, [activeTab, periodDateRange]);

  React.useEffect(() => {
    let isMounted = true;
    setIsLoadingAnalytics(true);

    const targetPersonnel = selectedPersonnelId !== 'all'
      ? personnelList.find((p) => p.id === selectedPersonnelId)?.name
      : undefined;

    fetchCustomerReports(undefined, {
      startDate: queryStartDate,
      endDate: queryEndDate,
      negotiator: targetPersonnel,
      limit: 5000,
      fields: 'id,customer_id,negotiator_name,created_by,negotiation_status,negotiation_score,contract_amount,contract_number,date_created,negotiation_phone,report_text',
    })
      .then((reps) => {
        if (isMounted && Array.isArray(reps)) {
          setAllReportsData(reps);
        }
      })
      .catch((err) => console.warn('Failed to load scoped reports for analytics:', err))
      .finally(() => {
        if (isMounted) setIsLoadingAnalytics(false);
      });

    return () => {
      isMounted = false;
    };
  }, [queryStartDate, queryEndDate, selectedPersonnelId, personnelList]);

  // Filtered personnel list for search
  const filteredPersonnelOptions = useMemo(() => {
    if (!personnelSearch.trim()) return personnelList;
    const q = personnelSearch.toLowerCase();
    return personnelList.filter((p) => p.name.toLowerCase().includes(q) || (p.email && p.email.toLowerCase().includes(q)));
  }, [personnelList, personnelSearch]);

  // Base filtered dataset matching user role and personnel selection
  const scopedReports = useMemo(() => {
    const sourceReports = allReportsData.length > 0 ? allReportsData : reports;
    if (!userIsAdmin) {
      const myName = currentPersonnel?.name || currentUser?.name || '';
      const myId = currentPersonnel?.id || currentUser?.id || '';
      return sourceReports.filter(
        (r) =>
          r.negotiator_name === myName ||
          r.created_by === myName ||
          (myId && r.created_by === myId)
      );
    }

    if (selectedPersonnelId === 'all') {
      return sourceReports;
    }

    const p = personnelList.find((item) => item.id === selectedPersonnelId);
    if (!p) return sourceReports;

    return sourceReports.filter(
      (r) =>
        r.negotiator_name === p.name ||
        r.created_by === p.name ||
        r.created_by === p.id
    );
  }, [allReportsData, reports, userIsAdmin, currentPersonnel, currentUser, selectedPersonnelId, personnelList]);

  const scopedCustomers = useMemo(() => {
    const sourceCustomers = allCustomersData.length > 0 ? allCustomersData : customers;
    if (!userIsAdmin) {
      const myName = currentPersonnel?.name || currentUser?.name || '';
      const myId = currentPersonnel?.id || currentUser?.id || '';
      return sourceCustomers.filter(
        (c) =>
          c.assigned_marketer_name === myName ||
          (myId && c.assigned_marketer_id === myId)
      );
    }

    if (selectedPersonnelId === 'all') {
      return sourceCustomers;
    }

    const p = personnelList.find((item) => item.id === selectedPersonnelId);
    if (!p) return sourceCustomers;

    return sourceCustomers.filter(
      (c) =>
        c.assigned_marketer_name === p.name ||
        c.assigned_marketer_id === p.id
    );
  }, [allCustomersData, customers, userIsAdmin, currentPersonnel, currentUser, selectedPersonnelId, personnelList]);

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

  // 1. DATA COMPUTATION FOR DAILY REPORT-CENTRIC PERFORMANCE
  const dailyReportStats = useMemo<DailyReportStats>(() => {
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

  // 2. DATA COMPUTATION FOR DAILY CUSTOMER-CENTRIC PERFORMANCE
  const dailyCustomerStats = useMemo<DailyCustomerStats>(() => {
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

  // 3. DATA COMPUTATION FOR PERIODIC REPORTS & TRENDS
  const periodicStats = useMemo<PeriodicStats>(() => {
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

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* 1. TOP HEADER & TITLE & PERSONNEL SEARCH FILTER */}
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

      {/* 2. TAB 1: DAILY REPORT-CENTRIC PERFORMANCE */}
      {activeTab === 'daily_reports' && (
        <DailyReportsTab
          dailyDaysCount={dailyDaysCount}
          setDailyDaysCount={setDailyDaysCount}
          selectedDayDetail={selectedDayDetail}
          setSelectedDayDetail={setSelectedDayDetail}
          dailyReportStats={dailyReportStats}
          customers={customers}
        />
      )}

      {/* 3. TAB 2: DAILY CUSTOMER-CENTRIC PERFORMANCE */}
      {activeTab === 'daily_customers' && (
        <CustomerCoverageTab
          dailyDaysCount={dailyDaysCount}
          setDailyDaysCount={setDailyDaysCount}
          selectedDayDetail={selectedDayDetail}
          setSelectedDayDetail={setSelectedDayDetail}
          dailyCustomerStats={dailyCustomerStats}
          onSelectCustomer={onSelectCustomer}
        />
      )}

      {/* 4. TAB 3: PERIODIC REPORTS & OVERALL TRENDS */}
      {activeTab === 'periodic' && (
        <TrendsLeaderboardTab
          periodPreset={periodPreset}
          setPeriodPreset={setPeriodPreset}
          customStartDate={customStartDate}
          setCustomStartDate={setCustomStartDate}
          customEndDate={customEndDate}
          setCustomEndDate={setCustomEndDate}
          periodicStats={periodicStats}
          userIsAdmin={userIsAdmin}
        />
      )}
    </div>
  );
};
