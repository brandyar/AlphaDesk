import React, { useState } from 'react';
import {
  ClipboardCheck,
  Plus,
  Calendar,
  PhoneCall,
  CheckCircle,
  TrendingUp,
  AlertCircle,
  Clock,
  User,
  Send,
  Award,
  ChevronDown,
  ChevronUp,
  ListTodo,
  Layers,
} from 'lucide-react';
import { AdministrativeReport, Personnel, AuthUser, HourlyWorkLog } from '../types';
import { formatPersianDate, formatPersianDateTime, toPersianDigits } from '../utils';
import { PersianDatePicker } from './PersianDatePicker';

interface AdminReportsViewProps {
  adminReports: AdministrativeReport[];
  personnelList: Personnel[];
  currentPersonnel: Personnel | null;
  currentUser?: AuthUser | null;
  isAdmin?: boolean;
  onSubmitReport: (report: Partial<AdministrativeReport>) => Promise<void>;
}

const DEFAULT_HOURLY_SLOTS = [
  'ساعت ۹ الی ۱۰',
  'ساعت ۱۰ الی ۱۱',
  'ساعت ۱۱ الی ۱۲',
  'ساعت ۱۲ الی ۱۳',
  'ساعت ۱۳ الی ۱۴',
  'ساعت ۱۴ الی ۱۵',
  'ساعت ۱۵ الی ۱۶',
  'ساعت ۱۶ الی ۱۷',
  'ساعت ۱۷ الی ۱۸',
  'ساعت ۱۸ الی ۱۹',
  'ساعت ۱۹ الی ۲۰',
];

export const AdminReportsView: React.FC<AdminReportsViewProps> = ({
  adminReports,
  personnelList,
  currentPersonnel,
  currentUser,
  isAdmin,
  onSubmitReport,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [personnelId, setPersonnelId] = useState(currentPersonnel?.id || personnelList[0]?.id || '');
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [callsCount, setCallsCount] = useState<number>(15);
  const [successfulContacts, setSuccessfulContacts] = useState<number>(8);
  const [leadsConverted, setLeadsConverted] = useState<number>(1);
  const [tasksSummary, setTasksSummary] = useState('');
  const [challenges, setChallenges] = useState('');
  const [tomorrowPlan, setTomorrowPlan] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Hourly logs state: keyed by slot
  const [hourlyLogs, setHourlyLogs] = useState<{ [slot: string]: string }>(() => {
    const initial: { [slot: string]: string } = {};
    DEFAULT_HOURLY_SLOTS.forEach((slot) => {
      initial[slot] = '';
    });
    return initial;
  });

  // Keep track of expanded card IDs
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const userIsAdmin = Boolean(
    isAdmin ||
    currentUser?.is_admin ||
    currentUser?.app_role === 'admin' ||
    currentUser?.role_id === '59e261e1-56f4-401e-9889-4971e2c3c4ce' ||
    currentUser?.role_id === 'a45beaec-0272-4c29-89ee-122dce37f565' ||
    currentPersonnel?.role === 'admin'
  );

  const visibleReports = adminReports.filter((r) => {
    if (userIsAdmin) return true;
    const isSelf =
      r.personnel_id === currentPersonnel?.id ||
      r.personnel_id === currentUser?.id ||
      r.personnel_name === currentPersonnel?.name ||
      r.personnel_name === currentUser?.name;
    if (isSelf) return true;

    const scope = currentPersonnel?.permissions?.report_view_scope;
    if (scope === 'all') return true;
    if (scope === 'specific_personnel') {
      const allowedIds = currentPersonnel?.permissions?.visible_report_personnel_ids || [];
      return allowedIds.includes(r.personnel_id);
    }
    return false;
  });

  // Aggregated KPIs
  const totalCalls = visibleReports.reduce((acc, r) => acc + (r.calls_count || 0), 0);
  const totalSuccess = visibleReports.reduce((acc, r) => acc + (r.successful_contacts || 0), 0);
  const totalConverted = visibleReports.reduce((acc, r) => acc + (r.leads_converted || 0), 0);

  const handleHourlyChange = (slot: string, text: string) => {
    setHourlyLogs((prev) => ({
      ...prev,
      [slot]: text,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Compile hourly logs into list
    const activeHourlyList: HourlyWorkLog[] = Object.entries(hourlyLogs)
      .filter(([_, act]) => act.trim().length > 0)
      .map(([slot, activity]) => ({
        slot,
        activity: activity.trim(),
      }));

    // Auto generate summary if empty but hourly logs exist
    let finalSummary = tasksSummary.trim();
    if (!finalSummary && activeHourlyList.length > 0) {
      finalSummary = activeHourlyList.map((h) => `• ${h.slot}: ${h.activity}`).join('\n');
    }

    if (!finalSummary && activeHourlyList.length === 0) {
      alert('لطفاً شرح اقدامات روزانه یا حداقل یک گزارش ساعتی وارد کنید.');
      return;
    }

    setSubmitting(true);
    try {
      const targetPId = userIsAdmin ? personnelId : (currentPersonnel?.id || currentUser?.id || personnelId);
      const selectedPerson = personnelList.find((p) => p.id === targetPId);
      const targetPName = userIsAdmin
        ? (selectedPerson?.name || 'کارشناس')
        : (currentPersonnel?.name || currentUser?.name || selectedPerson?.name || 'کارشناس');

      await onSubmitReport({
        personnel_id: targetPId,
        personnel_name: targetPName,
        report_date: reportDate,
        calls_count: Number(callsCount),
        successful_contacts: Number(successfulContacts),
        leads_converted: Number(leadsConverted),
        tasks_summary: finalSummary,
        challenges: challenges.trim(),
        tomorrow_plan: tomorrowPlan.trim(),
        hourly_logs: activeHourlyList.length > 0 ? activeHourlyList : undefined,
      });

      // Reset
      setTasksSummary('');
      setChallenges('');
      setTomorrowPlan('');
      const resetLogs: { [slot: string]: string } = {};
      DEFAULT_HOURLY_SLOTS.forEach((slot) => {
        resetLogs[slot] = '';
      });
      setHourlyLogs(resetLogs);
      setShowAddModal(false);
    } catch (err: any) {
      alert('خطا در ثبت گزارش: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Helper to parse hourly logs from report if available
  const parseReportHourlyLogs = (report: AdministrativeReport): HourlyWorkLog[] => {
    if (report.hourly_logs && Array.isArray(report.hourly_logs)) {
      return report.hourly_logs;
    }
    if (typeof report.hourly_logs === 'string' && report.hourly_logs.startsWith('[')) {
      try {
        return JSON.parse(report.hourly_logs);
      } catch {}
    }
    // Check if tasks_summary has hourly bullet format
    if (report.tasks_summary && report.tasks_summary.includes('ساعت')) {
      const lines = report.tasks_summary.split('\n');
      const parsed: HourlyWorkLog[] = [];
      lines.forEach((line) => {
        const match = line.match(/(?:•\s*)?(ساعت\s*[\d\u06F0-\u06F9]+\s*(?:الی|تا)\s*[\d\u06F0-\u06F9]+)\s*[:：]\s*(.*)/i);
        if (match) {
          parsed.push({ slot: match[1].trim(), activity: match[2].trim() });
        }
      });
      if (parsed.length > 0) return parsed;
    }
    return [];
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>گزارش عملکرد روزانه پرسنل</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-[#1DB954]/15 text-[#1DB954] font-bold">
              {toPersianDigits(adminReports.length)} گزارش ثبت شده
            </span>
          </h2>
          <p className="text-xs text-[#A7A7A7] mt-1">
            ثبت و رصد ساعت‌به‌ساعت (ساعت ۹ الی ۲۰)، آمار تماس‌ها، جذب مشتریان و اهداف روز کاری بعد
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="h-10 px-5 rounded-full bg-[#1DB954] hover:bg-[#1ED760] text-black font-bold text-xs transition-all hover:scale-105 shadow-md shadow-[#1DB954]/20 flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>ثبت گزارش عملکرد امروز</span>
        </button>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-[#181818] border border-[#282828] flex items-center justify-between">
          <div>
            <div className="text-xs text-[#A7A7A7]">مجموع تماس‌های گرفته شده</div>
            <div className="text-2xl font-black text-white font-mono mt-1">
              {toPersianDigits(totalCalls)}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#282828] flex items-center justify-center text-[#1DB954]">
            <PhoneCall className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#181818] border border-[#282828] flex items-center justify-between">
          <div>
            <div className="text-xs text-[#A7A7A7]">تماس‌های موفق و مذاکره شده</div>
            <div className="text-2xl font-black text-white font-mono mt-1">
              {toPersianDigits(totalSuccess)}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#282828] flex items-center justify-center text-[#1ED760]">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#181818] border border-[#282828] flex items-center justify-between">
          <div>
            <div className="text-xs text-[#A7A7A7]">مشتریان جذب یا نهایی شده</div>
            <div className="text-2xl font-black text-[#1DB954] font-mono mt-1">
              {toPersianDigits(totalConverted)}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#1DB954]/15 border border-[#1DB954]/30 flex items-center justify-center text-[#1DB954]">
            <Award className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Reports Feed */}
      <div className="space-y-3">
        {visibleReports.length === 0 ? (
          <div className="p-12 text-center bg-[#181818] rounded-2xl border border-[#282828] space-y-3">
            <ClipboardCheck className="w-10 h-10 text-[#535353] mx-auto" />
            <p className="text-xs text-[#A7A7A7]">هنوز هیچ گزارش اداری ثبت نشده است.</p>
          </div>
        ) : (
          visibleReports.map((report) => {
            const hourlyItems = parseReportHourlyLogs(report);
            const isExpanded = expandedIds.has(report.id);

            return (
              <div
                key={report.id}
                className="bg-[#181818] hover:bg-[#1a1a1a] rounded-2xl border border-[#282828] hover:border-[#383838] transition-all overflow-hidden"
              >
                {/* Collapsed Main Bar (Always Visible) */}
                <div
                  onClick={() => toggleExpand(report.id)}
                  className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none"
                >
                  {/* Right side: Personnel avatar + Name + Date */}
                  <div className="flex items-center gap-3 min-w-[200px]">
                    <div className="w-9 h-9 rounded-full bg-[#242424] border border-[#333] flex items-center justify-center text-[#1DB954] font-bold text-xs shrink-0">
                      {report.personnel_name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">{report.personnel_name}</span>
                        <span className="text-[11px] font-mono text-[#1DB954] bg-[#1DB954]/10 px-2 py-0.5 rounded-full">
                          {formatPersianDate(report.report_date)}
                        </span>
                      </div>
                      <div className="text-xs text-[#888] mt-0.5 flex items-center gap-2">
                        <span>ثبت: {formatPersianDateTime(report.date_created)}</span>
                        {hourlyItems.length > 0 && (
                          <span>· {toPersianDigits(hourlyItems.length)} بازه ساعتی</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Center/Left: Key Metrics & Accordion Toggle Button */}
                  <div className="flex items-center gap-2 sm:gap-3">
                    {/* KPI Badges */}
                    <div className="hidden sm:flex items-center gap-2 text-xs">
                      <span className="px-2.5 py-1 rounded-lg bg-[#222222] text-white font-mono">
                        تماس‌ها: <strong className="text-[#1DB954]">{toPersianDigits(report.calls_count)}</strong>
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-[#222222] text-white font-mono">
                        موفق: <strong className="text-[#1ED760]">{toPersianDigits(report.successful_contacts)}</strong>
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-[#1DB954]/15 text-[#1DB954] font-mono font-bold">
                        جذب: {toPersianDigits(report.leads_converted)}
                      </span>
                    </div>

                    {/* Expand/Collapse Trigger */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(report.id);
                      }}
                      className={`h-8 px-3 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 border ${
                        isExpanded
                          ? 'bg-[#1DB954] text-black border-[#1DB954]'
                          : 'bg-[#242424] text-[#d0d0d0] hover:text-white hover:bg-[#303030] border-[#383838]'
                      }`}
                    >
                      <span>{isExpanded ? 'بستن جزئیات' : 'مشاهده جزئیات'}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5 stroke-[2.5]" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Mobile Metrics Bar (if screen is small and not expanded) */}
                <div className="sm:hidden px-4 pb-3 flex items-center gap-2 text-[11px] border-t border-[#222] pt-2">
                  <span className="px-2 py-0.5 rounded bg-[#222] text-white font-mono">
                    تماس: <strong className="text-[#1DB954]">{toPersianDigits(report.calls_count)}</strong>
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#222] text-white font-mono">
                    موفق: <strong className="text-[#1ED760]">{toPersianDigits(report.successful_contacts)}</strong>
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#1DB954]/15 text-[#1DB954] font-mono font-bold">
                    جذب: {toPersianDigits(report.leads_converted)}
                  </span>
                </div>

                {/* Expandable Sliding Details Section */}
                {isExpanded && (
                  <div className="p-4 sm:p-5 pt-0 border-t border-[#242424] space-y-4 animate-in fade-in duration-200 bg-[#141414]">
                    {/* Hourly Logs Breakdown */}
                    {hourlyItems.length > 0 && (
                      <div className="p-4 rounded-xl bg-[#181818] border border-[#2a2a2a] space-y-3 mt-4">
                        <div className="text-xs font-bold text-[#1DB954] flex items-center gap-1.5">
                          <Clock className="w-4 h-4" />
                          <span>گزارش عملکرد ساعت‌به‌ساعت ({toPersianDigits(hourlyItems.length)} بازه کاری ثبت شده):</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          {hourlyItems.map((h, idx) => (
                            <div
                              key={idx}
                              className="p-2.5 rounded-xl bg-[#121212] border border-[#282828] flex flex-col gap-1"
                            >
                              <span className="text-[11px] font-bold text-[#1ED760] font-mono bg-[#1ED760]/10 px-2 py-0.5 rounded w-fit">
                                {h.slot}
                              </span>
                              <p className="text-xs text-[#ddd] leading-relaxed pr-1 whitespace-pre-wrap">
                                {h.activity}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tasks Summary */}
                    {report.tasks_summary && (
                      <div className="space-y-1.5">
                        <span className="text-xs font-bold text-white block">
                          خلاصه و یادداشت تکمیلی عملکرد:
                        </span>
                        <p className="text-xs text-[#d1d1d1] leading-relaxed bg-[#181818] p-3.5 rounded-xl border border-[#282828] whitespace-pre-wrap">
                          {report.tasks_summary}
                        </p>
                      </div>
                    )}

                    {/* Challenges & Tomorrow */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {report.challenges ? (
                        <div className="p-3.5 rounded-xl bg-[#181818] border border-[#282828] space-y-1">
                          <span className="font-bold text-[#F59B23] flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>چالش‌ها و موانع:</span>
                          </span>
                          <p className="text-[#B3B3B3] leading-relaxed">{report.challenges}</p>
                        </div>
                      ) : null}

                      {report.tomorrow_plan ? (
                        <div className="p-3.5 rounded-xl bg-[#181818] border border-[#282828] space-y-1">
                          <span className="font-bold text-[#1DB954] flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span>برنامه کاری فردا:</span>
                          </span>
                          <p className="text-[#B3B3B3] leading-relaxed">{report.tomorrow_plan}</p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add Admin Report Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#181818] border border-[#282828] w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden my-2 sm:my-6 max-h-[95vh] flex flex-col">
            <div className="p-4 sm:p-5 bg-[#121212] border-b border-[#282828] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#1DB954]/15 text-[#1DB954] flex items-center justify-center flex-shrink-0">
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">ثبت گزارش عملکرد روزانه پرسنل</h3>
                  <p className="text-[11px] text-[#A7A7A7]">
                    ثبت کارکرد ساعت به ساعت (۹ الی ۲۰)، آمار تماس‌ها و وظایف روزانه
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full bg-[#282828] hover:bg-[#333333] flex items-center justify-center text-[#A7A7A7] hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
              <div className={`grid gap-4 ${userIsAdmin ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
                {userIsAdmin && (
                  <div>
                    <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
                      نام پرسنل (ویژه مدیر)
                    </label>
                    <select
                      value={personnelId}
                      onChange={(e) => setPersonnelId(e.target.value)}
                      className="w-full h-10 px-3 bg-[#282828] rounded-md text-xs text-white focus:outline-none"
                    >
                      {personnelList.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.role === 'admin' ? 'مدیر' : 'کارشناس'})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <PersianDatePicker
                    label="تاریخ روز کاری (شمسی)"
                    value={reportDate}
                    onChange={(iso) => setReportDate(iso || new Date().toISOString().split('T')[0])}
                  />
                </div>
              </div>

              {/* Counters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-[#121212] border border-[#282828]">
                <div>
                  <label className="block text-[11px] font-semibold text-[#B3B3B3] mb-1">
                    تعداد کل تماس‌ها
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={callsCount}
                    onChange={(e) => setCallsCount(Number(e.target.value))}
                    className="w-full h-9 px-3 bg-[#282828] rounded font-mono text-center text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#B3B3B3] mb-1">
                    تماس‌های موفق
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={successfulContacts}
                    onChange={(e) => setSuccessfulContacts(Number(e.target.value))}
                    className="w-full h-9 px-3 bg-[#282828] rounded font-mono text-center text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#B3B3B3] mb-1">
                    مشتریان جذب شده
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={leadsConverted}
                    onChange={(e) => setLeadsConverted(Number(e.target.value))}
                    className="w-full h-9 px-3 bg-[#282828] rounded font-mono text-center text-xs text-[#1DB954]"
                  />
                </div>
              </div>

              {/* Hourly Work Logs Section (ساعت ۹ الی ۲۰) */}
              <div className="p-4 rounded-2xl bg-[#121212] border border-[#282828] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#1DB954]" />
                    <span>ثبت گزارش ساعت به ساعت (ساعت ۹ الی ۲۰)</span>
                  </div>
                  <span className="text-[11px] text-[#A7A7A7]">
                    بازه کاری مورد نظر خود را تکمیل کنید
                  </span>
                </div>

                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {DEFAULT_HOURLY_SLOTS.map((slot) => (
                    <div
                      key={slot}
                      className="p-2.5 rounded-xl bg-[#1a1a1a] border border-[#2c2c2c] hover:border-[#3a3a3a] transition-colors flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3"
                    >
                      <div className="sm:w-36 shrink-0">
                        <span className="text-xs font-bold text-[#1DB954] font-mono flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#1DB954]" />
                          <span>{slot} :</span>
                        </span>
                      </div>
                      <input
                        type="text"
                        value={hourlyLogs[slot] || ''}
                        onChange={(e) => handleHourlyChange(slot, e.target.value)}
                        placeholder={`شرح فعالیت ${slot} (تماس‌ها، جلسات، پیگیری...)...`}
                        className="w-full h-8 px-3 bg-[#282828] rounded text-xs text-white placeholder:text-[#666] focus:outline-none focus:ring-1 focus:ring-[#1DB954]"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Tasks Summary */}
              <div>
                <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5 flex items-center justify-between">
                  <span>خلاصه و یادداشت تکمیلی اقدامات روزانه</span>
                  <span className="text-[10px] text-[#777]">
                    (اختیاری - در صورت عدم ورود، از لاگ‌های ساعتی تولید می‌شود)
                  </span>
                </label>
                <textarea
                  rows={2}
                  value={tasksSummary}
                  onChange={(e) => setTasksSummary(e.target.value)}
                  placeholder="یادداشت کلی عملکرد، هماهنگی‌های کلیدی، دستاوردها..."
                  className="w-full p-3 bg-[#282828] rounded-md text-xs text-white resize-none focus:outline-none focus:ring-1 focus:ring-[#1DB954]"
                />
              </div>

              {/* Challenges */}
              <div>
                <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
                  چالش‌ها، موانع یا نیازمندی‌ها
                </label>
                <input
                  type="text"
                  value={challenges}
                  onChange={(e) => setChallenges(e.target.value)}
                  placeholder="موانع سیستمی، نیاز به مجوز مدیریت، مشکلات با مشتریان..."
                  className="w-full h-9 px-3 bg-[#282828] rounded-md text-xs text-white focus:outline-none"
                />
              </div>

              {/* Tomorrow Plan */}
              <div>
                <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
                  برنامه کاری فردا
                </label>
                <input
                  type="text"
                  value={tomorrowPlan}
                  onChange={(e) => setTomorrowPlan(e.target.value)}
                  placeholder="مشتریانی که باید تماس گرفته شوند، قراردادهایی که باید بسته شوند..."
                  className="w-full h-9 px-3 bg-[#282828] rounded-md text-xs text-white focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-[#282828] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="h-9 px-4 rounded-full border border-[#535353] text-xs text-[#B3B3B3] hover:text-white"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-9 px-6 rounded-full bg-[#1DB954] hover:bg-[#1ED760] text-black font-bold text-xs"
                >
                  {submitting ? 'در حال ثبت...' : 'ثبت گزارش عملکرد'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
