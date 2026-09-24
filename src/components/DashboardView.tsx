import React from 'react';
import {
  Users,
  AlertTriangle,
  Award,
  PhoneCall,
  Clock,
  TrendingUp,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  RefreshCw,
  Plus,
  Database,
  Building,
} from 'lucide-react';
import { Customer, CustomerReport, ColdLead, AdministrativeReport, Personnel, BffStatus } from '../types';
import { formatTimeRemaining, formatPersianDate, getStatusTheme } from '../utils';

interface DashboardViewProps {
  customers: Customer[];
  reports: CustomerReport[];
  coldLeads: ColdLead[];
  adminReports: AdministrativeReport[];
  personnelList: Personnel[];
  bffStatus: BffStatus | null;
  onSelectCustomer: (customer: Customer) => void;
  onOpenNewCustomer: () => void;
  onOpenNewLead: () => void;
  onNavigateToTab: (tab: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  customers,
  reports,
  coldLeads,
  adminReports,
  personnelList,
  bffStatus,
  onSelectCustomer,
  onOpenNewCustomer,
  onOpenNewLead,
  onNavigateToTab,
}) => {
  const expiredCustomers = customers.filter((c) => c.is_expired);
  const contractsWon = customers.filter((c) => c.status === 'قرارداد');
  const inNegotiation = customers.filter(
    (c) => c.status === 'پیش نویس قرارداد' || c.status === 'پیگیری قرارداد'
  );
  const upcomingFollowups = customers
    .filter((c) => c.next_followup_date)
    .sort(
      (a, b) =>
        new Date(a.next_followup_date).getTime() - new Date(b.next_followup_date).getTime()
    )
    .slice(0, 5);

  const totalCallsToday = adminReports.reduce((acc, r) => acc + (r.calls_count || 0), 0);

  return (
    <div className="space-y-6">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden p-6 rounded-2xl bg-gradient-to-l from-[#181818] via-[#161616] to-[#121212] border border-[#282828]">
        <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
          <div>
            <span className="text-xs font-bold text-[#1DB954] uppercase tracking-wider">
              مرکز عملیات بازاریابی و فروش
            </span>
            <h2 className="text-2xl font-black text-white mt-1">
              پیشخوان مدیریت یکپارچه مشتریان و پرسنل
            </h2>
            <p className="text-xs text-[#A7A7A7] mt-1 max-w-2xl leading-relaxed">
              کنترل مهلت بازاریابان، ثبت و پایش مصاحبه‌های اولیه، گزارش‌های اداری روزانه و مدیریت هوشمند فرصت‌های فروش
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onOpenNewLead}
              className="h-10 px-4 rounded-full bg-[#282828] hover:bg-[#333333] text-xs font-semibold text-white border border-[#3e3e3e] transition-colors"
            >
              + ثبت شماره لید
            </button>
            <button
              onClick={onOpenNewCustomer}
              className="h-10 px-5 rounded-full bg-[#1DB954] hover:bg-[#1ED760] text-black font-bold text-xs transition-transform hover:scale-105 shadow-lg shadow-[#1DB954]/20"
            >
              + ثبت مشتری جدید
            </button>
          </div>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Customers */}
        <div
          onClick={() => onNavigateToTab('customers')}
          className="p-5 rounded-2xl bg-[#181818] hover:bg-[#202020] border border-[#282828] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#A7A7A7] font-semibold">کل پرونده‌های مشتریان</span>
            <div className="w-8 h-8 rounded-lg bg-[#282828] flex items-center justify-center text-[#1DB954]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-white font-mono mt-3">{customers.length}</div>
          <div className="text-[11px] text-[#A7A7A7] mt-2 flex items-center gap-1">
            <span className="text-[#1DB954] font-bold">{inNegotiation.length}</span>
            <span>مشتری در مرحله پیش‌نویس/قرارداد</span>
          </div>
        </div>

        {/* Expired Marketer Allocations */}
        <div
          onClick={() => onNavigateToTab('customers')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer group ${
            expiredCustomers.length > 0
              ? 'bg-[#E22134]/10 border-[#E22134]/40 hover:bg-[#E22134]/15'
              : 'bg-[#181818] border-[#282828]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#A7A7A7] font-semibold">مهلت‌های منقضی شده</span>
            <div className="w-8 h-8 rounded-lg bg-[#E22134]/20 flex items-center justify-center text-[#E22134]">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-[#E22134] font-mono mt-3">
            {expiredCustomers.length}
          </div>
          <div className="text-[11px] text-[#A7A7A7] mt-2">
            {expiredCustomers.length > 0
              ? 'نیاز به سلب امتیاز و تخصیص به بازاریاب دیگر'
              : 'همه پرونده‌ها در مهلت قانونی هستند'}
          </div>
        </div>

        {/* Won Contracts */}
        <div
          onClick={() => onNavigateToTab('customers')}
          className="p-5 rounded-2xl bg-[#181818] hover:bg-[#202020] border border-[#282828] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#A7A7A7] font-semibold">قراردادهای نهایی شده</span>
            <div className="w-8 h-8 rounded-lg bg-[#1DB954]/15 border border-[#1DB954]/30 flex items-center justify-center text-[#1DB954]">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-[#1DB954] font-mono mt-3">
            {contractsWon.length}
          </div>
          <div className="text-[11px] text-[#A7A7A7] mt-2">
            مشتریان تبدیل شده به قرارداد قطعی
          </div>
        </div>

        {/* Cold Leads Queue */}
        <div
          onClick={() => onNavigateToTab('cold_leads')}
          className="p-5 rounded-2xl bg-[#181818] hover:bg-[#202020] border border-[#282828] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#A7A7A7] font-semibold">بانک شماره‌های اولیه</span>
            <div className="w-8 h-8 rounded-lg bg-[#282828] flex items-center justify-center text-[#1ED760]">
              <PhoneCall className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-white font-mono mt-3">{coldLeads.length}</div>
          <div className="text-[11px] text-[#A7A7A7] mt-2 flex items-center gap-1">
            <span className="text-[#1DB954] font-bold">
              {coldLeads.filter((l) => l.status === 'تماس نگرفته').length}
            </span>
            <span>شماره در انتظار تماس اولیه</span>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3 width): Urgent Expired & Follow-ups */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Urgent Expired Marketer Customers */}
          {expiredCustomers.length > 0 && (
            <div className="p-5 rounded-2xl bg-[#181818] border border-[#E22134]/30 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#E22134]" />
                  <h3 className="text-sm font-bold text-white">
                    هشدار: مهلت بازاریابی این مشتریان به پایان رسیده است
                  </h3>
                </div>
                <span className="text-xs text-[#E22134] font-mono font-bold">
                  {expiredCustomers.length} پرونده
                </span>
              </div>

              <div className="space-y-2">
                {expiredCustomers.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => onSelectCustomer(c)}
                    className="p-3 bg-[#121212] hover:bg-[#1a1a1a] rounded-xl border border-[#282828] hover:border-[#3e3e3e] flex items-center justify-between gap-3 cursor-pointer transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-white truncate">{c.company_name}</div>
                      <div className="text-[11px] text-[#A7A7A7]">
                        بازاریاب قبلی: {c.assigned_marketer_name} · صنف: {c.business_type}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-[11px] text-[#E22134] px-2 py-0.5 rounded bg-[#E22134]/15 border border-[#E22134]/30 font-medium">
                        مهلت سپری شده
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectCustomer(c);
                        }}
                        className="text-xs px-3 py-1 rounded-full bg-[#282828] hover:bg-[#333333] text-white flex items-center gap-1 font-semibold"
                      >
                        <RefreshCw className="w-3 h-3 text-[#1DB954]" />
                        <span>تخصیص مجدد</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 2: Upcoming Follow-up Schedule */}
          <div className="p-5 rounded-2xl bg-[#181818] border border-[#282828] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm text-white">
                <Calendar className="w-4 h-4 text-[#1DB954]" />
                <span>موعد پیگیری‌های برنامه‌ریزی شده</span>
              </div>
              <button
                onClick={() => onNavigateToTab('customers')}
                className="text-xs text-[#1DB954] hover:underline"
              >
                مشاهده همه
              </button>
            </div>

            {upcomingFollowups.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#A7A7A7]">
                هیچ موعد پیگیری برنامه‌ریزی شده‌ای وجود ندارد.
              </div>
            ) : (
              <div className="space-y-2.5">
                {upcomingFollowups.map((c) => {
                  const statusTheme = getStatusTheme(c.status);
                  return (
                    <div
                      key={c.id}
                      onClick={() => onSelectCustomer(c)}
                      className="p-3 bg-[#121212] hover:bg-[#1a1a1a] rounded-xl border border-[#282828] flex items-center justify-between gap-3 cursor-pointer transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-white truncate">{c.company_name}</div>
                        <div className="text-[11px] text-[#A7A7A7]">
                          مذاکره‌کننده: {c.assigned_marketer_name} · {c.city}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full border ${statusTheme.bg} ${statusTheme.color}`}
                        >
                          {c.status}
                        </span>
                        <span className="text-xs text-white font-mono bg-[#282828] px-2.5 py-1 rounded-md">
                          {formatPersianDate(c.next_followup_date)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 3: Recent Activity Reports Feed Snippet */}
          <div className="p-5 rounded-2xl bg-[#181818] border border-[#282828] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm text-white">
                <Clock className="w-4 h-4 text-[#1DB954]" />
                <span>آخرین گزارش‌های پیگیری و مذاکره ثبت شده</span>
              </div>
              <button
                onClick={() => onNavigateToTab('reports')}
                className="text-xs text-[#1DB954] hover:underline"
              >
                مشاهده همه گزارش‌ها
              </button>
            </div>

            <div className="space-y-2">
              {reports.slice(0, 4).map((r) => {
                const customer = customers.find((c) => c.id === r.customer_id);
                return (
                  <div
                    key={r.id}
                    className="p-3 bg-[#121212] rounded-xl border border-[#222] text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-[#A7A7A7]">
                      <span className="font-bold text-white">
                        {customer?.company_name || 'مشتری'} (توسط {r.negotiator_name})
                      </span>
                      <span className="font-mono text-[11px]">امتیاز: {r.negotiation_score}/10</span>
                    </div>
                    <p className="text-[#B3B3B3] line-clamp-1">{r.report_text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column (1/3 width): Personnel Performance & System Status */}
        <div className="space-y-6">
          {/* Cloud Database & Pipeline Summary Card */}
          <div className="p-5 rounded-2xl bg-[#181818] border border-[#282828] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-xs text-white">
                <Database className="w-4 h-4 text-[#1DB954]" />
                <span>پایگاه داده سازمانی</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-[#1DB954] font-medium">
                <span className="w-2 h-2 rounded-full bg-[#1DB954] animate-pulse" />
                <span>متصل و فعال</span>
              </div>
            </div>

            <p className="text-[11px] text-[#A7A7A7] leading-relaxed">
              ارتباط بلادرنگ با سرور مرکزی برقرار است. تمامی تراکنش‌ها، گزارش‌های مذاکره و سوابق مشتریان بلافاصله ذخیره و همگام می‌شوند.
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2.5 bg-[#121212] rounded-xl border border-[#282828]">
                <div className="text-[10px] text-[#A7A7A7] font-sans">مکالمات ثبت‌شده</div>
                <div className="text-white font-bold mt-1">{totalCallsToday} تماس</div>
              </div>
              <div className="p-2.5 bg-[#121212] rounded-xl border border-[#282828]">
                <div className="text-[10px] text-[#A7A7A7] font-sans">نرخ موفقیت</div>
                <div className="text-[#1DB954] font-bold mt-1">
                  {customers.length > 0
                    ? Math.round((contractsWon.length / customers.length) * 100)
                    : 0}٪
                </div>
              </div>
            </div>
          </div>

          {/* Personnel Marketers Performance */}
          <div className="p-5 rounded-2xl bg-[#181818] border border-[#282828] space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-white">تیم بازاریابی و فروش</span>
              <span className="text-[11px] text-[#A7A7A7]">{personnelList.length} نفر</span>
            </div>

            <div className="space-y-3">
              {personnelList.map((p) => {
                const assignedCount = customers.filter((c) => c.assigned_marketer_id === p.id).length;
                const wonCount = customers.filter(
                  (c) => c.assigned_marketer_id === p.id && c.status === 'قرارداد'
                ).length;

                return (
                  <div
                    key={p.id}
                    className="p-3 bg-[#121212] rounded-xl border border-[#282828] flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#282828] flex items-center justify-center text-[#1DB954] font-bold text-xs">
                        {p.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">{p.name}</div>
                        <div className="text-[10px] text-[#A7A7A7]">
                          {p.role === 'admin' ? 'مدیر ارشد' : 'بازاریاب'}
                        </div>
                      </div>
                    </div>

                    <div className="text-left text-xs font-mono">
                      <div className="text-white font-bold">{assignedCount} مشتری</div>
                      <div className="text-[10px] text-[#1DB954]">{wonCount} قرارداد</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
