import React from 'react';
import { Wallet, Send, Coins, Trash2 } from 'lucide-react';
import { LeaveRequest, RequestStatus, SalaryAdvanceRequest } from '../../types';
import { formatToman, toPersianDigits } from '../../utils';
import { PersianDatePicker } from '../PersianDatePicker';

export interface AdvanceRequestsTabProps {
  advanceAmount: string;
  setAdvanceAmount: (val: string) => void;
  advanceMonth: string;
  setAdvanceMonth: (val: string) => void;
  advanceNeededDate: string;
  setAdvanceNeededDate: (val: string) => void;
  advanceCard: string;
  setAdvanceCard: (val: string) => void;
  advanceIban: string;
  setAdvanceIban: (val: string) => void;
  advanceReason: string;
  setAdvanceReason: (val: string) => void;
  isSubmittingAdvance: boolean;
  handleSubmitAdvance: (e: React.FormEvent) => Promise<void>;
  isAdmin: boolean;
  filteredAdvanceRequests: SalaryAdvanceRequest[];
  advanceStatusFilter: string;
  setAdvanceStatusFilter: (status: string) => void;
  advanceSearch: string;
  setAdvanceSearch: (search: string) => void;
  getRequestStatusBadge: (status: RequestStatus) => {
    label: string;
    bg: string;
    icon: React.ComponentType<{ className?: string }>;
  };
  setReviewModalItem: (
    item: { type: 'leave' | 'advance'; item: LeaveRequest | SalaryAdvanceRequest } | null
  ) => void;
  setReviewAction: (action: 'approved' | 'rejected') => void;
  setReviewApprovedAmount: (amount: string) => void;
  setReviewManagerNote: (note: string) => void;
  onDeleteAdvanceRequest: (id: string) => Promise<void>;
}

export const AdvanceRequestsTab: React.FC<AdvanceRequestsTabProps> = ({
  advanceAmount,
  setAdvanceAmount,
  advanceMonth,
  setAdvanceMonth,
  advanceNeededDate,
  setAdvanceNeededDate,
  advanceCard,
  setAdvanceCard,
  advanceIban,
  setAdvanceIban,
  advanceReason,
  setAdvanceReason,
  isSubmittingAdvance,
  handleSubmitAdvance,
  isAdmin,
  filteredAdvanceRequests,
  advanceStatusFilter,
  setAdvanceStatusFilter,
  advanceSearch,
  setAdvanceSearch,
  getRequestStatusBadge,
  setReviewModalItem,
  setReviewAction,
  setReviewApprovedAmount,
  setReviewManagerNote,
  onDeleteAdvanceRequest,
}) => {
  return (
    <div className="space-y-6">
      {/* New Advance Request Form */}
      <div className="bg-[#181818] border border-[#282828] rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="flex items-center gap-2 border-b border-[#282828] pb-3">
          <Wallet className="w-5 h-5 text-[#1DB954]" />
          <div>
            <h3 className="text-base font-bold text-white">ثبت درخواست مساعده مالی</h3>
            <p className="text-xs text-[#888]">
              درخواست مساعده حقوق خود را ثبت کنید تا پس از بررسی مدیریت واریز گردد.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmitAdvance} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
                مبلغ درخواستی (تومان) *
              </label>
              <input
                type="text"
                dir="ltr"
                value={advanceAmount}
                onChange={(e) => setAdvanceAmount(e.target.value)}
                placeholder="5,000,000"
                required
                className="w-full h-10 px-3 bg-[#121212] rounded-xl text-xs text-white border border-[#2c2c2c] focus:border-[#1DB954] focus:outline-none font-mono font-bold text-sm"
              />
              <div className="text-[11px] text-[#1DB954] mt-1 font-mono">
                معادل: {formatToman(Number(advanceAmount.replace(/[^0-9]/g, '')) || 0)}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
                مربوط به حقوق ماه
              </label>
              <input
                type="text"
                value={advanceMonth}
                onChange={(e) => setAdvanceMonth(e.target.value)}
                placeholder="مهر ۱۴۰۵"
                className="w-full h-10 px-3 bg-[#121212] rounded-xl text-xs text-white border border-[#2c2c2c] focus:border-[#1DB954] focus:outline-none"
              />
            </div>

            <div>
              <PersianDatePicker
                label="تاریخ مورد نیاز دریافت"
                value={advanceNeededDate}
                onChange={(iso) => setAdvanceNeededDate(iso)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
                شماره کارت جهت واریز
              </label>
              <input
                type="text"
                dir="ltr"
                value={advanceCard}
                onChange={(e) => setAdvanceCard(e.target.value)}
                placeholder="6037-9975-..."
                className="w-full h-10 px-3 bg-[#121212] rounded-xl text-xs text-white border border-[#2c2c2c] focus:border-[#1DB954] focus:outline-none font-mono tracking-wider"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
                شماره شبا (IBAN)
              </label>
              <input
                type="text"
                dir="ltr"
                value={advanceIban}
                onChange={(e) => setAdvanceIban(e.target.value)}
                placeholder="IR12017..."
                className="w-full h-10 px-3 bg-[#121212] rounded-xl text-xs text-white border border-[#2c2c2c] focus:border-[#1DB954] focus:outline-none font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
              علت و ضرورت درخواست مساعده *
            </label>
            <textarea
              value={advanceReason}
              onChange={(e) => setAdvanceReason(e.target.value)}
              placeholder="شرح دلیل درخواست مساعده مالی..."
              rows={3}
              required
              className="w-full p-3 bg-[#121212] rounded-xl text-xs text-white border border-[#2c2c2c] focus:border-[#1DB954] focus:outline-none leading-relaxed"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSubmittingAdvance}
              className="px-6 py-2.5 rounded-xl bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold text-xs shadow-lg shadow-[#1DB954]/25 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmittingAdvance ? 'در حال ثبت...' : 'ارسال درخواست مساعده'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* List of Advance Requests */}
      <div className="bg-[#181818] border border-[#282828] rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#282828] pb-3">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-[#1DB954]" />
            <h3 className="text-sm font-bold text-white">
              {isAdmin ? 'همه درخواست‌های مساعده پرسنل' : 'درخواست‌های مساعده من'}
            </h3>
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-[#242424] text-[#A7A7A7]">
              {toPersianDigits(filteredAdvanceRequests.length)} مورد
            </span>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <select
              value={advanceStatusFilter}
              onChange={(e) => setAdvanceStatusFilter(e.target.value)}
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
                value={advanceSearch}
                onChange={(e) => setAdvanceSearch(e.target.value)}
                placeholder="جستجو در نام یا شرح..."
                className="h-8 px-3 rounded-xl bg-[#121212] text-xs text-white border border-[#2c2c2c] focus:outline-none w-36 sm:w-44"
              />
            )}
          </div>
        </div>

        {/* Advance Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-[#282828] text-[#888]">
                <th className="py-2.5 px-3 font-semibold">متقاضی</th>
                <th className="py-2.5 px-3 font-semibold">مبلغ درخواستی</th>
                <th className="py-2.5 px-3 font-semibold">مبلغ تاییدشده</th>
                <th className="py-2.5 px-3 font-semibold">ماه هدف</th>
                <th className="py-2.5 px-3 font-semibold">علت</th>
                <th className="py-2.5 px-3 font-semibold">وضعیت</th>
                <th className="py-2.5 px-3 font-semibold">نظر مدیریت</th>
                <th className="py-2.5 px-3 font-semibold">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222]">
              {filteredAdvanceRequests.map((req) => {
                const badge = getRequestStatusBadge(req.status);

                return (
                  <tr key={req.id} className="hover:bg-[#202020] transition-colors">
                    <td className="py-3 px-3 font-bold text-[#white]">
                      {req.personnel_name}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-white">
                      {formatToman(req.amount)}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-[#1DB954]">
                      {req.approved_amount ? formatToman(req.approved_amount) : '-'}
                    </td>
                    <td className="py-3 px-3 text-[#A7A7A7]">
                      {req.target_month || '-'}
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
                              setReviewModalItem({ type: 'advance', item: req });
                              setReviewAction('approved');
                              setReviewApprovedAmount(String(req.amount));
                              setReviewManagerNote('');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold text-[11px] transition-all"
                          >
                            بررسی و واریز
                          </button>
                        ) : req.status === 'pending' ? (
                          <button
                            onClick={() => onDeleteAdvanceRequest(req.id)}
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
              {filteredAdvanceRequests.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-[#777]">
                    هیچ درخواست مساعده‌ای یافت نشد.
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
