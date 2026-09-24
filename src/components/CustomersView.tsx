import React, { useState } from 'react';
import {
  Users,
  Search,
  Filter,
  Clock,
  AlertTriangle,
  Phone,
  Send,
  Instagram,
  Plus,
  ArrowUpDown,
  Building,
  CheckCircle2,
  ExternalLink,
  ChevronLeft,
} from 'lucide-react';
import { Customer, Personnel, NegotiationStatus } from '../types';
import { formatTimeRemaining, formatPersianDate, getStatusTheme } from '../utils';

interface CustomersViewProps {
  customers: Customer[];
  personnelList: Personnel[];
  onSelectCustomer: (customer: Customer) => void;
  onOpenNewCustomerModal: () => void;
  selectedMarketerId: string;
  onSelectMarketerId: (id: string) => void;
  statusFilter: string;
  onSelectStatusFilter: (status: string) => void;
  showExpiredOnly: boolean;
  onToggleExpiredOnly: (val: boolean) => void;
}

const statusOptions: string[] = [
  'همه',
  'تماس برقرار نشده',
  'پیگیری قبل از انقضا',
  'پیش نویس قرارداد',
  'پیگیری قرارداد',
  'قرارداد',
  'پاسخ نمیدهد',
  'نمیخواد',
  'پیگیری بلند مدت',
  'لیست سیاه',
];

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers,
  personnelList,
  onSelectCustomer,
  onOpenNewCustomerModal,
  selectedMarketerId,
  onSelectMarketerId,
  statusFilter,
  onSelectStatusFilter,
  showExpiredOnly,
  onToggleExpiredOnly,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  return (
    <div className="space-y-6">
      {/* Top Title & Quick Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>مدیریت مشتریان و پرونده‌ها</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-[#1DB954]/15 text-[#1DB954] font-bold">
              {customers.length} پرونده
            </span>
          </h2>
          <p className="text-xs text-[#A7A7A7] mt-1">
            لیست مشتریان ثبت شده، اختصاص یافته به بازاریاب‌ها همراه با تایمر انقضای مهلت
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Expired Filter Toggle */}
          <button
            onClick={() => onToggleExpiredOnly(!showExpiredOnly)}
            className={`h-9 px-3.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
              showExpiredOnly
                ? 'bg-[#E22134] text-white shadow-lg shadow-[#E22134]/30'
                : 'bg-[#282828] text-[#B3B3B3] hover:text-white border border-[#3e3e3e]'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>فقط منقضی شده‌ها</span>
          </button>

          {/* New Customer Button */}
          <button
            onClick={onOpenNewCustomerModal}
            className="h-9 px-4 rounded-full bg-[#1DB954] hover:bg-[#1ED760] text-black font-bold text-xs transition-all hover:scale-105 shadow-md shadow-[#1DB954]/20 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>ثبت مشتری جدید</span>
          </button>
        </div>
      </div>

      {/* Filter Row: Marketer & Status Chips (Spotify style) */}
      <div className="space-y-3 p-4 bg-[#181818] rounded-2xl border border-[#282828]">
        {/* Marketer Selector */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-bold text-[#B3B3B3] flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-[#1DB954]" />
            <span>فیلتر بازاریاب:</span>
          </span>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => onSelectMarketerId('همه')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                selectedMarketerId === 'همه'
                  ? 'bg-white text-black font-bold'
                  : 'bg-[#282828] text-[#B3B3B3] hover:text-white'
              }`}
            >
              همه بازاریاب‌ها
            </button>
            {personnelList.map((p) => (
              <button
                key={p.id}
                onClick={() => onSelectMarketerId(p.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  selectedMarketerId === p.id
                    ? 'bg-white text-black font-bold'
                    : 'bg-[#282828] text-[#B3B3B3] hover:text-white'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Status Chips */}
        <div className="flex items-center gap-3 flex-wrap pt-2 border-t border-[#282828]">
          <span className="text-xs font-bold text-[#B3B3B3]">وضعیت:</span>
          <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1">
            {statusOptions.map((st) => (
              <button
                key={st}
                onClick={() => onSelectStatusFilter(st)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  statusFilter === st
                    ? 'bg-[#1DB954] text-black font-bold'
                    : 'bg-[#282828] text-[#B3B3B3] hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Customers Content: Grid View */}
      {customers.length === 0 ? (
        <div className="p-12 text-center bg-[#181818] rounded-2xl border border-[#282828] space-y-4">
          <div className="w-14 h-14 rounded-full bg-[#282828] flex items-center justify-center text-[#535353] mx-auto">
            <Users className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">مشتری با مشخصات فیلتر شده یافت نشد</h3>
            <p className="text-xs text-[#A7A7A7] mt-1">
              می‌توانید فیلترها را تغییر داده یا مشتری جدیدی به سامانه اضافه نمایید.
            </p>
          </div>
          <button
            onClick={onOpenNewCustomerModal}
            className="px-5 py-2 rounded-full bg-[#1DB954] text-black font-bold text-xs hover:bg-[#1ED760] transition-transform hover:scale-105"
          >
            ثبت پرونده مشتری جدید
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {customers.map((c) => {
            const timer = formatTimeRemaining(c.assignment_deadline);
            const statusTheme = getStatusTheme(c.status);

            return (
              <div
                key={c.id}
                onClick={() => onSelectCustomer(c)}
                className="bg-[#181818] hover:bg-[#202020] rounded-2xl p-5 border border-[#282828] hover:border-[#3e3e3e] transition-all cursor-pointer group flex flex-col justify-between space-y-4 relative"
              >
                {/* Top: Header & Badges */}
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <h3 className="font-bold text-white text-base group-hover:text-[#1DB954] transition-colors truncate">
                        {c.company_name}
                      </h3>
                      <div className="text-xs text-[#A7A7A7] truncate">
                        {c.business_type || 'صنف نامشخص'} · {c.city}
                      </div>
                    </div>

                    {/* Status badge */}
                    <span
                      className={`text-[11px] px-2.5 py-0.5 rounded-full border ${statusTheme.bg} ${statusTheme.color} font-medium flex-shrink-0`}
                    >
                      {c.status}
                    </span>
                  </div>

                  {/* Interview Snippet */}
                  {c.interview_report && (
                    <p className="text-xs text-[#B3B3B3] line-clamp-2 leading-relaxed bg-[#121212] p-2.5 rounded-lg border border-[#222]">
                      <span className="text-[#1DB954] font-bold">مصاحبه: </span>
                      {c.interview_report}
                    </p>
                  )}
                </div>

                {/* Marketer & Deadline Timer */}
                <div className="pt-3 border-t border-[#282828] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#A7A7A7]">بازاریاب مسئول:</span>
                    <span className="font-semibold text-white">
                      {c.assigned_marketer_name || 'تخصیص نیافته'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#A7A7A7] flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#1DB954]" />
                      <span>مهلت پیگیری:</span>
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono ${timer.badgeClass}`}>
                      {timer.text}
                    </span>
                  </div>

                  {/* Quick Channels Strip */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2">
                      {c.mobile_numbers[0] && (
                        <a
                          href={`tel:${c.mobile_numbers[0]}`}
                          onClick={(e) => e.stopPropagation()}
                          className="w-7 h-7 rounded-full bg-[#282828] hover:bg-[#1DB954] hover:text-black text-[#B3B3B3] flex items-center justify-center transition-colors"
                          title={`تماس با ${c.mobile_numbers[0]}`}
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {(c.telegram_phone || c.telegram_ids[0]) && (
                        <a
                          href={
                            c.telegram_phone
                              ? `https://t.me/+${c.telegram_phone.replace(/^0/, '98')}`
                              : `https://t.me/${c.telegram_ids[0]?.replace(/^@/, '')}`
                          }
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="w-7 h-7 rounded-full bg-[#282828] hover:bg-[#229ED9] hover:text-white text-[#B3B3B3] flex items-center justify-center transition-colors"
                          title="ارسال پیام در تلگرام"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {c.instagram_ids[0] && (
                        <a
                          href={`https://instagram.com/${c.instagram_ids[0].replace(/^@/, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="w-7 h-7 rounded-full bg-[#282828] hover:bg-[#E1306C] hover:text-white text-[#B3B3B3] flex items-center justify-center transition-colors"
                          title="مشاهده پیج اینستاگرام"
                        >
                          <Instagram className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>

                    <div className="text-xs text-[#1DB954] font-semibold group-hover:underline flex items-center gap-1">
                      <span>مشاهده پرونده</span>
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
