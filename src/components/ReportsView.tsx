import React, { useState } from 'react';
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
} from 'lucide-react';
import { CustomerReport, Customer, Personnel, NegotiationStatus } from '../types';
import { formatPersianDate, formatPersianDateTime, getStatusTheme } from '../utils';

interface ReportsViewProps {
  reports: CustomerReport[];
  customers: Customer[];
  personnelList: Personnel[];
  onOpenAddReportModal: () => void;
  onSelectCustomer: (customer: Customer) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  reports,
  customers,
  personnelList,
  onOpenAddReportModal,
  onSelectCustomer,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<string>('همه');
  const [selectedNegotiator, setSelectedNegotiator] = useState<string>('همه');
  const [searchQuery, setSearchQuery] = useState('');

  const statusList: string[] = [
    'همه',
    'تماس برقرار نشده',
    'پاسخ نمیدهد',
    'نمیخواد',
    'پیگیری قبل از انقضا',
    'پیگیری بلند مدت',
    'پیگیری قرارداد',
    'پیش نویس قرارداد',
    'قرارداد',
    'لیست سیاه',
  ];

  const filteredReports = reports.filter((rep) => {
    if (selectedStatus !== 'همه' && rep.negotiation_status !== selectedStatus) return false;
    if (selectedNegotiator !== 'همه' && rep.negotiator_name !== selectedNegotiator) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const customer = customers.find((c) => c.id === rep.customer_id);
      const matchCompany = customer?.company_name.toLowerCase().includes(q);
      const matchReport = rep.report_text.toLowerCase().includes(q);
      const matchPhone = rep.negotiation_phone?.includes(q);
      if (!matchCompany && !matchReport && !matchPhone) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Title & Action */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>گزارش‌های پیگیری و مذاکره با مشتریان</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-[#1DB954]/15 text-[#1DB954] font-bold">
              {filteredReports.length} گزارش
            </span>
          </h2>
          <p className="text-xs text-[#A7A7A7] mt-1">
            ثبت لحظه‌ای مکالمات، توافقات، امتیاز مذاکره، موعد پیگیری و تغییر وضعیت مشتریان
          </p>
        </div>

        <button
          onClick={onOpenAddReportModal}
          className="h-9 px-4 rounded-full bg-[#1DB954] hover:bg-[#1ED760] text-black font-bold text-xs transition-all hover:scale-105 shadow-md shadow-[#1DB954]/20 flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>ثبت گزارش پیگیری جدید</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 bg-[#181818] rounded-2xl border border-[#282828] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex-1 max-w-sm relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو در متن گزارش، نام شرکت، تلفن..."
              className="w-full h-9 bg-[#282828] rounded-full pl-3 pr-9 text-xs text-white placeholder-[#A7A7A7] focus:outline-none focus:ring-1 focus:ring-white"
            />
            <Search className="w-3.5 h-3.5 text-[#A7A7A7] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Negotiator select */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#A7A7A7]">مذاکره‌کننده:</span>
            <select
              value={selectedNegotiator}
              onChange={(e) => setSelectedNegotiator(e.target.value)}
              className="h-8 px-3 rounded-full bg-[#282828] text-xs text-white border-none focus:outline-none cursor-pointer"
            >
              <option value="همه">همه کارشناسان</option>
              {personnelList.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-[#282828] overflow-x-auto pb-1">
          <span className="text-xs font-bold text-[#B3B3B3]">وضعیت:</span>
          {statusList.map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                selectedStatus === st
                  ? 'bg-[#1DB954] text-black font-bold'
                  : 'bg-[#282828] text-[#B3B3B3] hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Reports Feed */}
      {filteredReports.length === 0 ? (
        <div className="p-12 text-center bg-[#181818] rounded-2xl border border-[#282828] space-y-3">
          <MessageSquareText className="w-10 h-10 text-[#535353] mx-auto" />
          <p className="text-xs text-[#A7A7A7]">هیچ گزارشی مطابق با فیلترهای انتخابی یافت نشد.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReports.map((rep) => {
            const customer = customers.find((c) => c.id === rep.customer_id);
            const statusTheme = getStatusTheme(rep.negotiation_status);

            return (
              <div
                key={rep.id}
                className="bg-[#181818] hover:bg-[#1c1c1c] rounded-2xl p-5 border border-[#282828] hover:border-[#3e3e3e] transition-all space-y-3"
              >
                {/* Header row */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {/* Customer Name link */}
                    {customer ? (
                      <button
                        onClick={() => onSelectCustomer(customer)}
                        className="font-bold text-sm text-white hover:text-[#1DB954] transition-colors flex items-center gap-1.5"
                      >
                        <Building className="w-4 h-4 text-[#1DB954]" />
                        <span>{customer.company_name}</span>
                      </button>
                    ) : (
                      <span className="font-bold text-sm text-white">مشتری ناشناس</span>
                    )}

                    {/* Status Pill */}
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full border ${statusTheme.bg} ${statusTheme.color} font-medium`}
                    >
                      {rep.negotiation_status}
                    </span>
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
                      امتیاز: {rep.negotiation_score} / 10
                    </span>
                    <span>{formatPersianDateTime(rep.date_created)}</span>
                  </div>
                </div>

                {/* Report Body */}
                <p className="text-xs text-[#d1d1d1] leading-relaxed whitespace-pre-wrap bg-[#121212] p-3.5 rounded-xl border border-[#222]">
                  {rep.report_text}
                </p>

                {/* Footer / Followup */}
                {rep.next_followup_date && (
                  <div className="text-[11px] text-[#A7A7A7] flex items-center gap-2 pt-1">
                    <Calendar className="w-3.5 h-3.5 text-[#1DB954]" />
                    <span>تاریخ پیگیری بعدی تعیین شده:</span>
                    <span className="text-white font-semibold font-mono">
                      {formatPersianDate(rep.next_followup_date)}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
