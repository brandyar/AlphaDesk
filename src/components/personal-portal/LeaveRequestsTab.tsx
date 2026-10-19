import React from 'react';
import {
  CalendarDays,
  Calendar,
  Clock,
  Send,
  FileText,
  Trash2,
} from 'lucide-react';
import { LeaveRequest, LeaveType, RequestStatus, SalaryAdvanceRequest } from '../../types';
import {
  toPersianDigits,
  gregorianIsoToJalali,
} from '../../utils';
import { PersianDatePicker } from '../PersianDatePicker';

export interface LeaveRequestsTabProps {
  leaveType: LeaveType;
  setLeaveType: (type: LeaveType) => void;
  leaveStartDate: string;
  setLeaveStartDate: (date: string) => void;
  leaveEndDate: string;
  setLeaveEndDate: (date: string) => void;
  leaveStartTime: string;
  setLeaveStartTime: (time: string) => void;
  leaveEndTime: string;
  setLeaveEndTime: (time: string) => void;
  calculatedHourlyDuration: number;
  leaveReason: string;
  setLeaveReason: (reason: string) => void;
  isSubmittingLeave: boolean;
  handleSubmitLeave: (e: React.FormEvent) => Promise<void>;
  isAdmin: boolean;
  filteredLeaveRequests: LeaveRequest[];
  leaveStatusFilter: string;
  setLeaveStatusFilter: (status: string) => void;
  leaveSearch: string;
  setLeaveSearch: (search: string) => void;
  getRequestStatusBadge: (status: RequestStatus) => {
    label: string;
    bg: string;
    icon: React.ComponentType<{ className?: string }>;
  };
  setReviewModalItem: (
    item: { type: 'leave' | 'advance'; item: LeaveRequest | SalaryAdvanceRequest } | null
  ) => void;
  setReviewAction: (action: 'approved' | 'rejected') => void;
  setReviewManagerNote: (note: string) => void;
  onDeleteLeaveRequest: (id: string) => Promise<void>;
}

export const LeaveRequestsTab: React.FC<LeaveRequestsTabProps> = ({
  leaveType,
  setLeaveType,
  leaveStartDate,
  setLeaveStartDate,
  leaveEndDate,
  setLeaveEndDate,
  leaveStartTime,
  setLeaveStartTime,
  leaveEndTime,
  setLeaveEndTime,
  calculatedHourlyDuration,
  leaveReason,
  setLeaveReason,
  isSubmittingLeave,
  handleSubmitLeave,
  isAdmin,
  filteredLeaveRequests,
  leaveStatusFilter,
  setLeaveStatusFilter,
  leaveSearch,
  setLeaveSearch,
  getRequestStatusBadge,
  setReviewModalItem,
  setReviewAction,
  setReviewManagerNote,
  onDeleteLeaveRequest,
}) => {
  return (
    <div className="space-y-6">
      {/* New Leave Request Form */}
      <div className="bg-[#181818] border border-[#282828] rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="flex items-center gap-2 border-b border-[#282828] pb-3">
          <CalendarDays className="w-5 h-5 text-[#1DB954]" />
          <div>
            <h3 className="text-base font-bold text-white">ثبت درخواست مرخصی جدید</h3>
            <p className="text-xs text-[#888]">
              مرخصی‌های روزانه و ساعتی خود را ثبت کنید تا به اطلاع مدیریت برسد.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmitLeave} className="space-y-4">
          {/* Type Switcher: Daily vs Hourly */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-[#B3B3B3]">نوع مرخصی:</span>
            <div className="flex items-center gap-2 bg-[#121212] p-1 rounded-xl border border-[#282828]">
              <button
                type="button"
                onClick={() => setLeaveType('daily')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  leaveType === 'daily'
                    ? 'bg-[#1DB954] text-black shadow-sm'
                    : 'text-[#888] hover:text-white'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>مرخصی روزانه</span>
              </button>

              <button
                type="button"
                onClick={() => setLeaveType('hourly')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  leaveType === 'hourly'
                    ? 'bg-[#1DB954] text-black shadow-sm'
                    : 'text-[#888] hover:text-white'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>مرخصی ساعتی</span>
              </button>
            </div>
          </div>

          {/* Conditional Date / Time Fields */}
          {leaveType === 'daily' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <PersianDatePicker
                  label="از تاریخ (شروع مرخصی)"
                  value={leaveStartDate}
                  onChange={(iso) => setLeaveStartDate(iso)}
                />
              </div>
              <div>
                <PersianDatePicker
                  label="تا تاریخ (پایان مرخصی)"
                  value={leaveEndDate}
                  onChange={(iso) => setLeaveEndDate(iso)}
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <PersianDatePicker
                  label="تاریخ مرخصی ساعتی"
                  value={leaveStartDate}
                  onChange={(iso) => setLeaveStartDate(iso)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
                  از ساعت
                </label>
                <input
                  type="time"
                  value={leaveStartTime}
                  onChange={(e) => setLeaveStartTime(e.target.value)}
                  className="w-full h-10 px-3 bg-[#121212] rounded-xl text-xs text-white border border-[#2c2c2c] focus:border-[#1DB954] focus:outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
                  تا ساعت
                </label>
                <input
                  type="time"
                  value={leaveEndTime}
                  onChange={(e) => setLeaveEndTime(e.target.value)}
                  className="w-full h-10 px-3 bg-[#121212] rounded-xl text-xs text-white border border-[#2c2c2c] focus:border-[#1DB954] focus:outline-none font-mono"
                />
              </div>
            </div>
          )}

          {/* Duration Preview for Hourly */}
          {leaveType === 'hourly' && (
            <div className="text-xs text-[#A7A7A7] bg-[#121212] p-2.5 rounded-xl border border-[#282828] flex items-center justify-between">
              <span>مدت زمان مرخصی محاسبه شده:</span>
              <span className="text-[#1DB954] font-bold font-mono text-sm">
                {toPersianDigits(calculatedHourlyDuration)} ساعت
              </span>
            </div>
          )}

          {/* Reason Field */}
          <div>
            <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
              علت و شرح مرخصی *
            </label>
            <textarea
              value={leaveReason}
              onChange={(e) => setLeaveReason(e.target.value)}
              placeholder="شرح کامل دلیل درخواست مرخصی..."
              rows={3}
              required
              className="w-full p-3 bg-[#121212] rounded-xl text-xs text-white border border-[#2c2c2c] focus:border-[#1DB954] focus:outline-none leading-relaxed"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSubmittingLeave}
              className="px-6 py-2.5 rounded-xl bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold text-xs shadow-lg shadow-[#1DB954]/25 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmittingLeave ? 'در حال ثبت...' : 'ارسال درخواست مرخصی'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* List of Leave Requests */}
      <div className="bg-[#181818] border border-[#282828] rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#282828] pb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#1DB954]" />
            <h3 className="text-sm font-bold text-white">
              {isAdmin ? 'همه درخواست‌های مرخصی پرسنل' : 'درخواست‌های مرخصی من'}
            </h3>
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-[#242424] text-[#A7A7A7]">
              {toPersianDigits(filteredLeaveRequests.length)} مورد
            </span>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <select
              value={leaveStatusFilter}
              onChange={(e) => setLeaveStatusFilter(e.target.value)}
              className="h-8 px-3 rounded-xl bg-[#121212] text-xs text-white border border-[#2c2c2c] focus:outline-none"
            >
              <option value="all">همه وضعیت‌ها</option>
              <option value="pending">در انتظار بررسی</option>
              <option value="approved">تایید شده</option>
              <option value="rejected">رد شده</option>
            </select>

            {isAdmin && (
              <input
                type="text"
                value={leaveSearch}
                onChange={(e) => setLeaveSearch(e.target.value)}
                placeholder="جستجو در علت یا نام..."
                className="h-8 px-3 rounded-xl bg-[#121212] text-xs text-white border border-[#2c2c2c] focus:outline-none w-36 sm:w-44"
              />
            )}
          </div>
        </div>

        {/* Requests Table / Cards */}
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-[#282828] text-[#888]">
                <th className="py-2.5 px-3 font-semibold">متقاضی</th>
                <th className="py-2.5 px-3 font-semibold">نوع مرخصی</th>
                <th className="py-2.5 px-3 font-semibold">بازه زمانی / ساعت</th>
                <th className="py-2.5 px-3 font-semibold">علت</th>
                <th className="py-2.5 px-3 font-semibold">وضعیت</th>
                <th className="py-2.5 px-3 font-semibold">نظر مدیر</th>
                <th className="py-2.5 px-3 font-semibold">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222]">
              {filteredLeaveRequests.map((req) => {
                const badge = getRequestStatusBadge(req.status);
                const isHourly = req.leave_type === 'hourly';

                return (
                  <tr key={req.id} className="hover:bg-[#202020] transition-colors">
                    <td className="py-3 px-3 font-bold text-white">
                      {req.personnel_name}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          isHourly
                            ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                            : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                        }`}
                      >
                        {isHourly ? 'ساعتی' : 'روزانه'}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-white">
                      {isHourly ? (
                        <div>
                          <div>{toPersianDigits(gregorianIsoToJalali(req.start_date))}</div>
                          <div className="text-[11px] text-[#888]">
                            از {toPersianDigits(req.start_time || '')} تا {toPersianDigits(req.end_time || '')} ({toPersianDigits(req.hours_count || '')} ساعت)
                          </div>
                        </div>
                      ) : (
                        <div>
                          <span>{toPersianDigits(gregorianIsoToJalali(req.start_date))}</span>
                          {req.end_date && req.end_date !== req.start_date && (
                            <span className="text-[#888]"> الی {toPersianDigits(gregorianIsoToJalali(req.end_date))}</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-[#bbb] max-w-xs truncate">
                      {req.reason}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`text-[10px] px-2.5 py-0.5 rounded-full border font-bold flex items-center gap-1 w-fit ${badge.bg}`}
                      >
                        <badge.icon className="w-3 h-3" />
                        <span>{badge.label}</span>
                      </span>
                    </td>
                    <td className="py-3 px-3 text-[#888] max-w-xs truncate">
                      {req.manager_note || '-'}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        {isAdmin && req.status === 'pending' ? (
                          <button
                            onClick={() => {
                              setReviewModalItem({ type: 'leave', item: req });
                              setReviewAction('approved');
                              setReviewManagerNote('');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold text-[11px] transition-all"
                          >
                            بررسی و تعیین
                          </button>
                        ) : req.status === 'pending' ? (
                          <button
                            onClick={() => onDeleteLeaveRequest(req.id)}
                            className="p-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                            title="حذف درخواست"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="text-[11px] text-[#555]">ثبت نهایی</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredLeaveRequests.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-[#777]">
                    هیچ درخواست مرخصی یافت نشد.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
