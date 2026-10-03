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
  UserPlus,
  MessageSquarePlus,
  FolderOpen,
  DollarSign,
  Star,
  Activity,
  ArrowUpRight,
  ShieldAlert,
  CalendarDays,
  Wallet,
  Sparkles,
} from 'lucide-react';
import { Customer, CustomerReport, ColdLead, AdministrativeReport, Personnel, BffStatus } from '../types';
import { formatTimeRemaining, formatPersianDate, formatToman, getStatusTheme, toPersianDigits } from '../utils';

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
  onOpenAddReport?: () => void;
  onNavigateToTab: (tab: any, subTab?: any) => void;
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
  onOpenAddReport,
  onNavigateToTab,
}) => {
  const expiredCustomers = customers.filter((c) => c.is_expired);
  const contractsWon = customers.filter((c) => c.status === 'قرارداد');
  const inNegotiation = customers.filter(
    (c) => c.status === 'پیش نویس قرارداد' || c.status === 'پیگیری قرارداد'
  );

  // Financial contract totals
  const totalContractRevenue = reports.reduce(
    (acc, r) => acc + (Number(r.contract_amount) || 0),
    0
  );

  // Average negotiation score
  const scoredReports = reports.filter((r) => r.negotiation_score && r.negotiation_score > 0);
  const avgScore =
    scoredReports.length > 0
      ? (scoredReports.reduce((acc, r) => acc + (r.negotiation_score || 0), 0) / scoredReports.length).toFixed(1)
      : '۰';

  // Urgent upcoming followups (< 3 days or scheduled)
  const upcomingFollowups = customers
    .filter((c): c is Customer & { next_followup_date: string } => Boolean(c.next_followup_date))
    .sort(
      (a, b) =>
        new Date(a.next_followup_date).getTime() - new Date(b.next_followup_date).getTime()
    )
    .slice(0, 5);

  // Customers in danger of expiring (< 3 days deadline)
  const urgentExpiringCustomers = customers
    .filter((c) => {
      if (!c.assignment_deadline || c.is_expired || c.status === 'قرارداد') return false;
      const days = Math.ceil(
        (new Date(c.assignment_deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      return days >= 0 && days <= 3;
    })
    .slice(0, 5);

  // Status breakdown for progress bars
  const totalCustomersCount = customers.length || 1;
  const statusStats = [
    { label: 'قرارداد / فاکتور', count: contractsWon.length, color: 'bg-[#1DB954]', text: 'text-[#1DB954]' },
    { label: 'در حال پیگیری و مذاکره', count: inNegotiation.length, color: 'bg-blue-500', text: 'text-blue-400' },
    { label: 'مهلت‌های منقضی‌شده', count: expiredCustomers.length, color: 'bg-rose-500', text: 'text-rose-400' },
    {
      label: 'سایر وضعیت‌ها',
      count: Math.max(0, customers.length - contractsWon.length - inNegotiation.length - expiredCustomers.length),
      color: 'bg-amber-500',
      text: 'text-amber-400',
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ------------------------------------------------------------- */}
      {/* 1. TOP 4 QUICK ACCESS ACTION BLOCKS                           */}
      {/* ------------------------------------------------------------- */}
      <div>
        <div className="text-xs font-bold text-[#A7A7A7] mb-3 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#1DB954]" />
          <span>دسترسی سریع و اقدامات فوری</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Action 1: Add New Customer */}
          <button
            onClick={onOpenNewCustomer}
            className="group text-right p-4.5 rounded-2xl bg-gradient-to-br from-[#181818] to-[#141414] hover:from-[#222222] hover:to-[#1a1a1a] border border-[#282828] hover:border-[#1DB954]/50 shadow-lg hover:shadow-[#1DB954]/10 transition-all hover:scale-[1.02] flex items-center justify-between"
          >
            <div className="space-y-1">
              <div className="font-extrabold text-sm text-white group-hover:text-[#1DB954] transition-colors flex items-center gap-1.5">
                <span>افزودن مشتری جدید</span>
                <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-[#1DB954]" />
              </div>
              <p className="text-[11px] text-[#888] group-hover:text-[#B3B3B3] transition-colors">
                ثبت پرونده و شماره‌های مدیریت
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-[#1DB954]/15 border border-[#1DB954]/30 flex items-center justify-center text-[#1DB954] group-hover:bg-[#1DB954] group-hover:text-black transition-all flex-shrink-0">
              <UserPlus className="w-5 h-5 stroke-[2.5]" />
            </div>
          </button>

          {/* Action 2: Quick Add Lead */}
          <button
            onClick={onOpenNewLead}
            className="group text-right p-4.5 rounded-2xl bg-gradient-to-br from-[#181818] to-[#141414] hover:from-[#222222] hover:to-[#1a1a1a] border border-[#282828] hover:border-blue-500/50 shadow-lg hover:shadow-blue-500/10 transition-all hover:scale-[1.02] flex items-center justify-between"
          >
            <div className="space-y-1">
              <div className="font-extrabold text-sm text-white group-hover:text-blue-400 transition-colors flex items-center gap-1.5">
                <span>افزودن سریع شماره</span>
                <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-blue-400" />
              </div>
              <p className="text-[11px] text-[#888] group-hover:text-[#B3B3B3] transition-colors">
                ثبت در بانک شماره‌های اولیه
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:bg-blue-500 group-hover:text-black transition-all flex-shrink-0">
              <PhoneCall className="w-5 h-5 stroke-[2.5]" />
            </div>
          </button>

          {/* Action 3: Add Report */}
          <button
            onClick={() => {
              if (onOpenAddReport) onOpenAddReport();
              else onNavigateToTab('reports');
            }}
            className="group text-right p-4.5 rounded-2xl bg-gradient-to-br from-[#181818] to-[#141414] hover:from-[#222222] hover:to-[#1a1a1a] border border-[#282828] hover:border-amber-500/50 shadow-lg hover:shadow-amber-500/10 transition-all hover:scale-[1.02] flex items-center justify-between"
          >
            <div className="space-y-1">
              <div className="font-extrabold text-sm text-white group-hover:text-amber-400 transition-colors flex items-center gap-1.5">
                <span>ثبت گزارش مذاکره</span>
                <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-amber-400" />
              </div>
              <p className="text-[11px] text-[#888] group-hover:text-[#B3B3B3] transition-colors">
                ثبت مکالمه، قرارداد یا فاکتور
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:bg-amber-500 group-hover:text-black transition-all flex-shrink-0">
              <MessageSquarePlus className="w-5 h-5 stroke-[2.5]" />
            </div>
          </button>

          {/* Action 4: Customers Directory */}
          <button
            onClick={() => onNavigateToTab('customers')}
            className="group text-right p-4.5 rounded-2xl bg-gradient-to-br from-[#181818] to-[#141414] hover:from-[#222222] hover:to-[#1a1a1a] border border-[#282828] hover:border-purple-500/50 shadow-lg hover:shadow-purple-500/10 transition-all hover:scale-[1.02] flex items-center justify-between"
          >
            <div className="space-y-1">
              <div className="font-extrabold text-sm text-white group-hover:text-purple-400 transition-colors flex items-center gap-1.5">
                <span>لیست مشتریان</span>
                <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-purple-400" />
              </div>
              <p className="text-[11px] text-[#888] group-hover:text-[#B3B3B3] transition-colors">
                مدیریت پرونده‌ها و مهلت‌ها
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:bg-purple-500 group-hover:text-black transition-all flex-shrink-0">
              <FolderOpen className="w-5 h-5 stroke-[2.5]" />
            </div>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. PRIMARY ANALYTICAL KPI CARDS                              */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Contract Volume */}
        <div
          onClick={() => onNavigateToTab('analytics')}
          className="p-5 rounded-2xl bg-[#181818] hover:bg-[#202020] border border-[#282828] transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#A7A7A7] font-semibold">ارزش کل قراردادها</span>
            <div className="w-8 h-8 rounded-lg bg-[#1DB954]/15 border border-[#1DB954]/30 flex items-center justify-center text-[#1DB954]">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#1DB954] font-mono mt-3">
            {formatToman(totalContractRevenue)}
          </div>
          <div className="text-[11px] text-[#A7A7A7] mt-2 flex items-center justify-between">
            <span>مجموع فاکتورهای موفق</span>
            <span className="text-white font-bold">{toPersianDigits(contractsWon.length)} فقره</span>
          </div>
        </div>

        {/* Card 2: Total Customers & Pipeline */}
        <div
          onClick={() => onNavigateToTab('customers')}
          className="p-5 rounded-2xl bg-[#181818] hover:bg-[#202020] border border-[#282828] transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#A7A7A7] font-semibold">کل پرونده‌های مشتریان</span>
            <div className="w-8 h-8 rounded-lg bg-[#282828] flex items-center justify-center text-white">
              <Users className="w-4 h-4 text-[#1DB954]" />
            </div>
          </div>
          <div className="text-3xl font-black text-white font-mono mt-3">
            {toPersianDigits(customers.length)}
          </div>
          <div className="text-[11px] text-[#A7A7A7] mt-2 flex items-center gap-1">
            <span className="text-[#1DB954] font-bold">{toPersianDigits(inNegotiation.length)}</span>
            <span>مشتری در مرحله پیش‌نویس/پیگیری</span>
          </div>
        </div>

        {/* Card 3: Expired Marketer Allocations */}
        <div
          onClick={() => onNavigateToTab('customers')}
          className={`p-5 rounded-2xl border transition-all group ${
            expiredCustomers.length > 0
              ? 'bg-[#E22134]/10 border-[#E22134]/40 hover:bg-[#E22134]/15'
              : 'bg-[#181818] border-[#282828] hover:bg-[#202020]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#A7A7A7] font-semibold">مهلت‌های منقضی شده</span>
            <div className="w-8 h-8 rounded-lg bg-[#E22134]/20 flex items-center justify-center text-[#E22134]">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-[#E22134] font-mono mt-3">
            {toPersianDigits(expiredCustomers.length)}
          </div>
          <div className="text-[11px] text-[#A7A7A7] mt-2">
            {expiredCustomers.length > 0
              ? 'نیازمند تخصیص مجدد به بازاریاب دیگر'
              : 'همه پرونده‌ها در مهلت قانونی هستند'}
          </div>
        </div>

        {/* Card 4: Average Score & Negotiation Quality */}
        <div
          onClick={() => onNavigateToTab('reports')}
          className="p-5 rounded-2xl bg-[#181818] hover:bg-[#202020] border border-[#282828] transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#A7A7A7] font-semibold">کیفیت مذاکرات ثبت‌شده</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Star className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-amber-400 font-mono mt-3 flex items-baseline gap-1">
            <span>{toPersianDigits(avgScore)}</span>
            <span className="text-xs text-[#888] font-normal">از ۱۰</span>
          </div>
          <div className="text-[11px] text-[#A7A7A7] mt-2">
            بر اساس {toPersianDigits(reports.length)} گزارش مذاکره و تماس
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. MAIN DASHBOARD CONTENT GRID (2 COLUMNS)                    */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3 width): Pipeline Breakdown & Urgent Followups */}
        <div className="lg:col-span-2 space-y-6">
          {/* Sales Pipeline & Conversion Progress Card */}
          <div className="p-5 sm:p-6 rounded-2xl bg-[#181818] border border-[#282828] space-y-4">
            <div className="flex items-center justify-between border-b border-[#282828] pb-3">
              <div className="flex items-center gap-2 font-bold text-sm text-white">
                <Activity className="w-4 h-4 text-[#1DB954]" />
                <span>وضعیت توزیع فرآیند فروش و پایپ‌لاین مشتریان</span>
              </div>
              <button
                onClick={() => onNavigateToTab('analytics')}
                className="text-xs text-[#1DB954] hover:underline flex items-center gap-1 font-semibold"
              >
                <span>مشاهده تحلیل‌ها</span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Combined Segment Bar */}
            <div className="space-y-2">
              <div className="h-3.5 rounded-full bg-[#121212] overflow-hidden flex border border-[#2c2c2c] p-0.5 gap-0.5">
                {statusStats.map((st, i) => {
                  const pct = Math.round((st.count / totalCustomersCount) * 100);
                  if (pct === 0) return null;
                  return (
                    <div
                      key={i}
                      style={{ width: `${pct}%` }}
                      className={`${st.color} h-full rounded-sm transition-all`}
                      title={`${st.label}: ${st.count} (${pct}%)`}
                    />
                  );
                })}
              </div>

              {/* Legend & Breakdown Items */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                {statusStats.map((st, i) => {
                  const pct = Math.round((st.count / totalCustomersCount) * 100);
                  return (
                    <div key={i} className="p-2.5 rounded-xl bg-[#121212] border border-[#222]">
                      <div className="flex items-center gap-1.5 text-[11px] text-[#A7A7A7]">
                        <span className={`w-2 h-2 rounded-full ${st.color}`} />
                        <span className="truncate">{st.label}</span>
                      </div>
                      <div className="mt-1 flex items-baseline justify-between font-mono">
                        <span className={`text-sm font-bold ${st.text}`}>{toPersianDigits(st.count)}</span>
                        <span className="text-[10px] text-[#777]">({toPersianDigits(pct)}٪)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Urgent Scheduled Followups Section */}
          <div className="p-5 sm:p-6 rounded-2xl bg-[#181818] border border-[#282828] space-y-4">
            <div className="flex items-center justify-between border-b border-[#282828] pb-3">
              <div className="flex items-center gap-2 font-bold text-sm text-white">
                <Calendar className="w-4 h-4 text-[#1DB954]" />
                <span>موعدهای پیگیری نزدیک و برنامه‌ریزی شده</span>
              </div>
              <button
                onClick={() => onNavigateToTab('reports')}
                className="text-xs text-[#1DB954] hover:underline"
              >
                مشاهده همه
              </button>
            </div>

            {upcomingFollowups.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#A7A7A7]">
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
                      className="p-3 bg-[#121212] hover:bg-[#1a1a1a] rounded-xl border border-[#282828] hover:border-[#383838] flex items-center justify-between gap-3 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-white truncate">{c.company_name}</div>
                        <div className="text-[11px] text-[#A7A7A7] mt-0.5">
                          مذاکره‌کننده: {c.assigned_marketer_name} · {c.city || c.province || 'تهران'}
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 flex-shrink-0">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full border ${statusTheme.bg} ${statusTheme.color}`}
                        >
                          {c.status}
                        </span>
                        <span className="text-xs text-white font-mono bg-[#222] px-2.5 py-1 rounded-lg border border-[#333]">
                          {formatPersianDate(c.next_followup_date)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Activity Feed */}
          <div className="p-5 sm:p-6 rounded-2xl bg-[#181818] border border-[#282828] space-y-4">
            <div className="flex items-center justify-between border-b border-[#282828] pb-3">
              <div className="flex items-center gap-2 font-bold text-sm text-white">
                <Clock className="w-4 h-4 text-[#1DB954]" />
                <span>آخرین گزارش‌های مذاکره ثبت شده</span>
              </div>
              <button
                onClick={() => onNavigateToTab('reports')}
                className="text-xs text-[#1DB954] hover:underline"
              >
                مشاهده همه ({toPersianDigits(reports.length)})
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
                      <span className="font-mono text-[11px] text-[#1DB954]">
                        امتیاز: {toPersianDigits(r.negotiation_score || 0)}/۱۰
                      </span>
                    </div>
                    <p className="text-[#B3B3B3] line-clamp-1">{r.report_text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column (1/3 width): Urgent Alerts & Personnel Actions */}
        <div className="space-y-6">
          {/* Urgent Expiring Warning Block */}
          {urgentExpiringCustomers.length > 0 && (
            <div className="p-5 rounded-2xl bg-gradient-to-br from-[#E22134]/15 to-[#181818] border border-[#E22134]/40 space-y-3">
              <div className="flex items-center gap-2 font-bold text-xs text-[#E22134]">
                <ShieldAlert className="w-4 h-4" />
                <span>هشدار انقضای مهلت پیگیری (&lt; ۳ روز)</span>
              </div>

              <div className="space-y-2">
                {urgentExpiringCustomers.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => onSelectCustomer(c)}
                    className="p-2.5 bg-[#121212]/90 hover:bg-[#181818] rounded-xl border border-[#E22134]/30 flex items-center justify-between text-xs transition-colors"
                  >
                    <div className="truncate">
                      <div className="font-bold text-white truncate">{c.company_name}</div>
                      <div className="text-[10px] text-[#A7A7A7]">{c.assigned_marketer_name}</div>
                    </div>
                    <span className="text-[10px] text-rose-400 font-mono font-bold whitespace-nowrap mr-2">
                      {formatTimeRemaining(c.assignment_deadline).text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Personnel Services Card */}
          <div className="p-5 rounded-2xl bg-[#181818] border border-[#282828] space-y-4">
            <div className="flex items-center justify-between border-b border-[#282828] pb-3">
              <div className="flex items-center gap-2 font-bold text-xs text-white">
                <CalendarDays className="w-4 h-4 text-[#1DB954]" />
                <span>امور پرسنلی و درخواست‌ها</span>
              </div>
              <button
                onClick={() => onNavigateToTab('personal_portal', 'leave')}
                className="text-[11px] text-[#1DB954] hover:underline"
              >
                پنل پرسنلی
              </button>
            </div>

            <p className="text-[11px] text-[#A7A7A7] leading-relaxed">
              ثبت مستقیم مرخصی ساعتی و روزانه یا درخواست مساعده مالی با محاسبه خودکار و تاییدیه سریع مدیریت.
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => onNavigateToTab('personal_portal', 'leave')}
                className="p-3 bg-[#121212] hover:bg-[#1c1c1c] rounded-xl border border-[#282828] text-right space-y-1 transition-colors"
              >
                <div className="flex items-center gap-1.5 text-blue-400 font-bold">
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span>ثبت مرخصی</span>
                </div>
                <div className="text-[10px] text-[#777]">روزانه و ساعتی</div>
              </button>

              <button
                onClick={() => onNavigateToTab('personal_portal', 'advance')}
                className="p-3 bg-[#121212] hover:bg-[#1c1c1c] rounded-xl border border-[#282828] text-right space-y-1 transition-colors"
              >
                <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                  <Wallet className="w-3.5 h-3.5" />
                  <span>ثبت مساعده</span>
                </div>
                <div className="text-[10px] text-[#777]">حقوق و واریزی</div>
              </button>
            </div>
          </div>

          {/* System & Cloud Status */}
          <div className="p-5 rounded-2xl bg-[#181818] border border-[#282828] space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white">وضعیت ارتباط و همگام‌سازی</span>
              <span className="inline-flex items-center gap-1 text-[11px] text-[#1DB954] font-bold">
                <span className="w-2 h-2 rounded-full bg-[#1DB954] animate-pulse" />
                <span>برخط و پایدار</span>
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#121212] border border-[#222] text-[11px] text-[#888] space-y-1">
              <div className="flex justify-between">
                <span>تعداد کارشناسان فعال:</span>
                <span className="text-white font-bold">{toPersianDigits(personnelList.length)} نفر</span>
              </div>
              <div className="flex justify-between">
                <span>بانک لیدهای سرد:</span>
                <span className="text-white font-bold">{toPersianDigits(coldLeads.length)} شماره</span>
              </div>
              <div className="flex justify-between">
                <span>کل گزارشات ثبت‌شده:</span>
                <span className="text-[#1DB954] font-bold">{toPersianDigits(reports.length)} گزارش</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
