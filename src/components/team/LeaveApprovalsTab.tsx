import React from 'react';
import { CalendarCheck, Search, Check, X } from 'lucide-react';
import { LeaveRequest, RequestStatus } from '../../types';
import {
  formatPersianDate,
  formatPersianDateTime,
  toPersianDigits,
} from '../../utils';

export interface LeaveApprovalsTabProps {
  leaveRequests: LeaveRequest[];
  pendingLeavesCount: number;
  leaveStatusFilter: 'all' | 'pending' | 'approved' | 'rejected';
  setLeaveStatusFilter: (status: 'all' | 'pending' | 'approved' | 'rejected') => void;
  leaveSearch: string;
  setLeaveSearch: (search: string) => void;
  filteredLeaves: LeaveRequest[];
  setReviewingLeave: (leave: LeaveRequest | null) => void;
  setReviewAction: (action: RequestStatus) => void;
  setReviewManagerNote: (note: string) => void;
}

export const LeaveApprovalsTab: React.FC<LeaveApprovalsTabProps> = ({
  leaveRequests,
  pendingLeavesCount,
  leaveStatusFilter,
  setLeaveStatusFilter,
  leaveSearch,
  setLeaveSearch,
  filteredLeaves,
  setReviewingLeave,
  setReviewAction,
  setReviewManagerNote,
}) => {
  return (
    <div className="bg-[#181818] border border-[#282828] rounded-2xl p-5 sm:p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#282828] pb-4">
        <div className="flex items-center gap-2">
          <CalendarCheck className="w-5 h-5 text-[#1DB954]" />
          <div>
            <h3 className="text-base font-bold text-white">کارتابل تایید و بررسی مرخصی‌های پرسنل</h3>
            <p className="text-xs text-[#888]">
              مشاهده، تایید یا رد درخواست‌های مرخصی ساعتی و روزانه به همراه ثبت توضیحات مدیریت
            </p>
          </div>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5 bg-[#121212] p-1 rounded-xl border border-[#282828]">
          <button
            onClick={() => setLeaveStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              leaveStatusFilter === 'all'
                ? 'bg-[#282828] text-white'
                : 'text-[#888] hover:text-white'
            }`}
          >
            همه ({toPersianDigits(leaveRequests.length)})
          </button>
          <button
            onClick={() => setLeaveStatusFilter('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              leaveStatusFilter === 'pending'
                ? 'bg-amber-500 text-black'
                : 'text-[#888] hover:text-white'
            }`}
          >
            در انتظار ({toPersianDigits(pendingLeavesCount)})
          </button>
          <button
            onClick={() => setLeaveStatusFilter('approved')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              leaveStatusFilter === 'approved'
                ? 'bg-emerald-500 text-black'
                : 'text-[#888] hover:text-white'
            }`}
          >
            تایید شده
          </button>
          <button
            onClick={() => setLeaveStatusFilter('rejected')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              leaveStatusFilter === 'rejected'
                ? 'bg-rose-500 text-white'
                : 'text-[#888] hover:text-white'
            }`}
          >
            رد شده
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-[#888] absolute right-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={leaveSearch}
          onChange={(e) => setLeaveSearch(e.target.value)}
          placeholder="جستجو در نام پرسنل یا علت مرخصی..."
          className="w-full h-9 pr-9 pl-3 bg-[#121212] rounded-xl text-xs text-white border border-[#2c2c2c] focus:outline-none"
        />
      </div>

      {/* Leave Requests Table */}
      <div className="space-y-3">
        {filteredLeaves.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#888]">
            هیچ درخواست مرخصی در این وضعیت ثبت نشده است.
          </div>
        ) : (
          filteredLeaves.map((l) => (
            <div
              key={l.id}
              className="p-4 rounded-xl bg-[#121212] border border-[#242424] space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#282828] text-[#1DB954] flex items-center justify-center font-bold text-xs">
                    {l.personnel_name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold text-xs text-white">{l.personnel_name}</div>
                    <div className="text-[10px] text-[#777]">
                      ثبت‌شده در {formatPersianDateTime(l.date_created)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] px-2.5 py-1 rounded-full font-bold border ${
                      l.status === 'approved'
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : l.status === 'rejected'
                        ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                        : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                    }`}
                  >
                    {l.status === 'approved'
                      ? 'تایید شده'
                      : l.status === 'rejected'
                      ? 'رد شده'
                      : 'در انتظار بررسی مدیریت'}
                  </span>

                  {l.status === 'pending' && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setReviewingLeave(l);
                          setReviewAction('approved');
                          setReviewManagerNote('');
                        }}
                        className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-lg transition-colors flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>تایید</span>
                      </button>
                      <button
                        onClick={() => {
                          setReviewingLeave(l);
                          setReviewAction('rejected');
                          setReviewManagerNote('');
                        }}
                        className="px-3 py-1 bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5 stroke-[3]" />
                        <span>رد</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Leave Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-[#181818] p-3 rounded-lg text-xs">
                <div>
                  <span className="text-[#777] block text-[10px]">نوع مرخصی:</span>
                  <span className="text-white font-bold">
                    {l.leave_type === 'daily'
                      ? `روزانه (${toPersianDigits(l.days_count || 1)} روز)`
                      : `ساعتی (${toPersianDigits(l.hours_count || 0)} ساعت)`}
                  </span>
                </div>

                <div>
                  <span className="text-[#777] block text-[10px]">بازه مرخصی:</span>
                  <span className="text-white font-mono">
                    {l.leave_type === 'daily'
                      ? `${formatPersianDate(l.start_date)} الی ${formatPersianDate(l.end_date || l.start_date)}`
                      : `${formatPersianDate(l.start_date)} (از ${toPersianDigits(l.start_time || '')} تا ${toPersianDigits(l.end_time || '')})`}
                  </span>
                </div>

                <div>
                  <span className="text-[#777] block text-[10px]">علت و شرح مرخصی:</span>
                  <span className="text-[#B3B3B3] line-clamp-1">{l.reason || 'بدون توضیح'}</span>
                </div>
              </div>

              {l.manager_note && (
                <div className="text-xs bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg text-amber-300">
                  <span className="font-bold">یادداشت مدیریت: </span>
                  <span>{l.manager_note}</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
