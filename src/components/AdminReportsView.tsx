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
} from 'lucide-react';
import { AdministrativeReport, Personnel } from '../types';
import { formatPersianDate, formatPersianDateTime } from '../utils';

interface AdminReportsViewProps {
  adminReports: AdministrativeReport[];
  personnelList: Personnel[];
  currentPersonnel: Personnel | null;
  onSubmitReport: (report: Partial<AdministrativeReport>) => Promise<void>;
}

export const AdminReportsView: React.FC<AdminReportsViewProps> = ({
  adminReports,
  personnelList,
  currentPersonnel,
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

  // Aggregated KPIs
  const totalCalls = adminReports.reduce((acc, r) => acc + (r.calls_count || 0), 0);
  const totalSuccess = adminReports.reduce((acc, r) => acc + (r.successful_contacts || 0), 0);
  const totalConverted = adminReports.reduce((acc, r) => acc + (r.leads_converted || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tasksSummary.trim()) {
      alert('لطفاً شرح اقدامات روزانه را وارد کنید.');
      return;
    }

    setSubmitting(true);
    try {
      const selectedPerson = personnelList.find((p) => p.id === personnelId);
      await onSubmitReport({
        personnel_id: personnelId,
        personnel_name: selectedPerson?.name || 'کارشناس',
        report_date: reportDate,
        calls_count: Number(callsCount),
        successful_contacts: Number(successfulContacts),
        leads_converted: Number(leadsConverted),
        tasks_summary: tasksSummary.trim(),
        challenges: challenges.trim(),
        tomorrow_plan: tomorrowPlan.trim(),
      });
      setTasksSummary('');
      setChallenges('');
      setTomorrowPlan('');
      setShowAddModal(false);
    } catch (err: any) {
      alert('خطا در ثبت گزارش: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>گزارش اداری روزانه پرسنل</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-[#1DB954]/15 text-[#1DB954] font-bold">
              {adminReports.length} گزارش ثبت شده
            </span>
          </h2>
          <p className="text-xs text-[#A7A7A7] mt-1">
            ثبت روزانه کارکرد، تعداد تماس‌ها، مشتریان جذب شده و برنامه‌ریزی روز کاری بعد پرسنل
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="h-9 px-4 rounded-full bg-[#1DB954] hover:bg-[#1ED760] text-black font-bold text-xs transition-all hover:scale-105 shadow-md shadow-[#1DB954]/20 flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>ثبت گزارش اداری امروز</span>
        </button>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-[#181818] border border-[#282828] flex items-center justify-between">
          <div>
            <div className="text-xs text-[#A7A7A7]">مجموع تماس‌های گرفته شده</div>
            <div className="text-2xl font-black text-white font-mono mt-1">{totalCalls}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#282828] flex items-center justify-center text-[#1DB954]">
            <PhoneCall className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#181818] border border-[#282828] flex items-center justify-between">
          <div>
            <div className="text-xs text-[#A7A7A7]">تماس‌های موفق و مذاکره شده</div>
            <div className="text-2xl font-black text-white font-mono mt-1">{totalSuccess}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#282828] flex items-center justify-center text-[#1ED760]">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#181818] border border-[#282828] flex items-center justify-between">
          <div>
            <div className="text-xs text-[#A7A7A7]">مشتریان جذب یا نهایی شده</div>
            <div className="text-2xl font-black text-[#1DB954] font-mono mt-1">{totalConverted}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#1DB954]/15 border border-[#1DB954]/30 flex items-center justify-center text-[#1DB954]">
            <Award className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Reports Feed */}
      <div className="space-y-4">
        {adminReports.length === 0 ? (
          <div className="p-12 text-center bg-[#181818] rounded-2xl border border-[#282828] space-y-3">
            <ClipboardCheck className="w-10 h-10 text-[#535353] mx-auto" />
            <p className="text-xs text-[#A7A7A7]">هنوز هیچ گزارش اداری ثبت نشده است.</p>
          </div>
        ) : (
          adminReports.map((report) => (
            <div
              key={report.id}
              className="bg-[#181818] rounded-2xl p-5 border border-[#282828] space-y-4 hover:border-[#3e3e3e] transition-colors"
            >
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#282828] pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#282828] flex items-center justify-center text-[#1DB954] font-bold text-xs">
                    {report.personnel_name.charAt(0)}
                  </div>
                  <div>
                    <span className="font-bold text-sm text-white">{report.personnel_name}</span>
                    <span className="text-xs text-[#A7A7A7] mr-2">
                      (تاریخ گزارش: {formatPersianDate(report.report_date)})
                    </span>
                  </div>
                </div>

                {/* Metrics Pill island */}
                <div className="flex items-center gap-3 text-xs">
                  <span className="px-2.5 py-1 rounded bg-[#282828] text-white font-mono">
                    تماس‌ها: <strong className="text-[#1DB954]">{report.calls_count}</strong>
                  </span>
                  <span className="px-2.5 py-1 rounded bg-[#282828] text-white font-mono">
                    موفق: <strong className="text-[#1ED760]">{report.successful_contacts}</strong>
                  </span>
                  <span className="px-2.5 py-1 rounded bg-[#1DB954]/15 text-[#1DB954] font-mono font-bold">
                    جذب شده: {report.leads_converted}
                  </span>
                </div>
              </div>

              {/* Tasks Summary */}
              <div>
                <span className="text-xs font-bold text-white block mb-1">
                  شرح اقدامات و کارهای انجام شده:
                </span>
                <p className="text-xs text-[#d1d1d1] leading-relaxed bg-[#121212] p-3 rounded-xl border border-[#222] whitespace-pre-wrap">
                  {report.tasks_summary}
                </p>
              </div>

              {/* Challenges & Tomorrow */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {report.challenges && (
                  <div className="p-3 rounded-xl bg-[#141414] border border-[#282828] space-y-1">
                    <span className="font-bold text-[#F59B23] flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>چالش‌ها و موانع:</span>
                    </span>
                    <p className="text-[#B3B3B3] leading-relaxed">{report.challenges}</p>
                  </div>
                )}

                {report.tomorrow_plan && (
                  <div className="p-3 rounded-xl bg-[#141414] border border-[#282828] space-y-1">
                    <span className="font-bold text-[#1DB954] flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>برنامه کاری فردا:</span>
                    </span>
                    <p className="text-[#B3B3B3] leading-relaxed">{report.tomorrow_plan}</p>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Admin Report Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#181818] border border-[#282828] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden my-8">
            <div className="p-5 bg-[#121212] border-b border-[#282828] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#1DB954]/15 text-[#1DB954] flex items-center justify-center">
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">ثبت گزارش عملکرد روزانه پرسنل</h3>
                  <p className="text-[11px] text-[#A7A7A7]">ثبت آمار تماس‌ها و وظایف اجرا شده در شیفت کاری</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[#A7A7A7] hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
                    نام پرسنل
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
                <div>
                  <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
                    تاریخ روز کاری
                  </label>
                  <input
                    type="date"
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value)}
                    className="w-full h-10 px-3 bg-[#282828] rounded-md text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Counters */}
              <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-[#121212] border border-[#282828]">
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

              {/* Tasks Summary */}
              <div>
                <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
                  شرح وظایف و اقدامات انجام شده <span className="text-[#E22134]">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={tasksSummary}
                  onChange={(e) => setTasksSummary(e.target.value)}
                  placeholder="اقدامات اصلی انجام شده در طول روز، پیگیری قراردادها، جلسات..."
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
                  {submitting ? 'در حال ثبت...' : 'ثبت گزارش اداری'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
