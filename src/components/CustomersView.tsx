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
  GitMerge,
} from 'lucide-react';
import { Customer, Personnel, NegotiationStatus, AuthUser } from '../types';
import { formatTimeRemaining, formatPersianDate, getStatusTheme, formatStatusLabel, NEGOTIATION_STATUS_OPTIONS } from '../utils';

interface CustomersViewProps {
  customers: Customer[];
  personnelList: Personnel[];
  currentPersonnel?: Personnel | null;
  currentUser?: AuthUser | null;
  isAdmin?: boolean;
  onSelectCustomer: (customer: Customer) => void;
  onOpenNewCustomerModal: () => void;
  onOpenMergeModal?: () => void;
  selectedMarketerId: string;
  onSelectMarketerId: (id: string) => void;
  statusFilter: string;
  onSelectStatusFilter: (status: string) => void;
  showExpiredOnly: boolean;
  onToggleExpiredOnly: (val: boolean) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers,
  personnelList,
  currentPersonnel,
  currentUser,
  isAdmin,
  onSelectCustomer,
  onOpenNewCustomerModal,
  onOpenMergeModal,
  selectedMarketerId,
  onSelectMarketerId,
  statusFilter,
  onSelectStatusFilter,
  showExpiredOnly,
  onToggleExpiredOnly,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const userIsAdmin = Boolean(
    isAdmin ||
    currentUser?.is_admin ||
    currentUser?.app_role === 'admin' ||
    currentUser?.role_id === '59e261e1-56f4-401e-9889-4971e2c3c4ce' ||
    currentUser?.role_id === 'a45beaec-0272-4c29-89ee-122dce37f565' ||
    currentPersonnel?.role === 'admin'
  );

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

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Expired Filter Toggle */}
          <button
            onClick={() => onToggleExpiredOnly(!showExpiredOnly)}
            className={`h-9 px-3 sm:px-3.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
              showExpiredOnly
                ? 'bg-[#E22134] text-white shadow-lg shadow-[#E22134]/30'
                : 'bg-[#282828] text-[#B3B3B3] hover:text-white border border-[#3e3e3e]'
            }`}
            title="نمایش پرونده‌های با مهلت منقضی شده"
          >
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="hidden sm:inline">منقضی شده‌ها</span>
          </button>

          {/* Merge Customers Button - Admin only */}
          {userIsAdmin && onOpenMergeModal && (
            <button
              onClick={onOpenMergeModal}
              className="h-9 px-3 sm:px-4 rounded-full bg-[#282828] hover:bg-[#1DB954] text-[#B3B3B3] hover:text-black font-bold text-xs transition-all border border-[#3e3e3e] hover:border-[#1DB954] flex items-center gap-1.5 flex-shrink-0"
              title="ادغام پرونده‌های مشتریان تکراری"
            >
              <GitMerge className="w-3.5 h-3.5" />
              <span>ادغام پرونده‌ها</span>
            </button>
          )}

          {/* New Customer Button (Icon only) */}
          <button
            onClick={onOpenNewCustomerModal}
            className="w-9 h-9 rounded-full bg-[#1DB954] hover:bg-[#1ED760] text-black font-bold flex items-center justify-center transition-all hover:scale-105 shadow-md shadow-[#1DB954]/20 flex-shrink-0"
            title="ثبت مشتری جدید"
            aria-label="ثبت مشتری جدید"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
          </button>
        </div>
      </div>

      {/* Clean Single-Row Filter Toolbar: Dropdowns instead of tags */}
      <div className="p-3 sm:p-4 bg-[#181818] rounded-2xl border border-[#282828] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          {/* Marketer Dropdown - ONLY for Admin */}
          {userIsAdmin && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#A7A7A7] flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-[#1DB954]" />
                <span>بازاریاب:</span>
              </span>
              <select
                value={selectedMarketerId}
                onChange={(e) => onSelectMarketerId(e.target.value)}
                className="h-9 px-3 rounded-xl bg-[#282828] text-xs text-white border border-[#3e3e3e] focus:outline-none focus:border-[#1DB954] cursor-pointer"
              >
                <option value="همه">همه بازاریاب‌ها</option>
                {personnelList.map((p) => (
                  <option key={p.id} value={p.id} className="bg-[#181818] text-white">
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Status Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#A7A7A7]">وضعیت پرونده:</span>
            <select
              value={statusFilter}
              onChange={(e) => onSelectStatusFilter(e.target.value)}
              className="h-9 px-3 rounded-xl bg-[#282828] text-xs text-white border border-[#3e3e3e] focus:outline-none focus:border-[#1DB954] cursor-pointer"
            >
              <option value="همه" className="bg-[#181818] text-white">همه وضعیت‌ها</option>
              {NEGOTIATION_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-[#181818] text-white">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Reset / Count preview */}
        <div className="text-xs text-[#888888] font-mono">
          نمایش <span className="text-[#1DB954] font-bold">{customers.length}</span> پرونده
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
                      {formatStatusLabel(c.status)}
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
                      {(() => {
                        const contactsArr = Array.isArray(c.contacts) ? c.contacts : [];
                        const mobilesArr = Array.isArray(c.mobile_numbers) ? c.mobile_numbers : [];
                        const telegramsArr = Array.isArray(c.telegram_ids) ? c.telegram_ids : [];
                        const instasArr = Array.isArray(c.instagram_ids) ? c.instagram_ids : [];

                        const primaryPhone =
                          contactsArr.find((ct) => ct && (ct.channel_type === 'mobile' || ct.channel_type === 'landline'))
                            ?.value || mobilesArr[0] || '';
                        const primaryTelegram =
                          contactsArr.find((ct) => ct && ct.channel_type === 'telegram')?.value ||
                          c.telegram_phone ||
                          telegramsArr[0] || '';
                        const primaryInsta =
                          contactsArr.find((ct) => ct && ct.channel_type === 'instagram')?.value ||
                          instasArr[0] || '';

                        return (
                          <>
                            {primaryPhone && (
                              <a
                                href={`tel:${primaryPhone}`}
                                onClick={(e) => e.stopPropagation()}
                                className="w-7 h-7 rounded-full bg-[#282828] hover:bg-[#1DB954] hover:text-black text-[#B3B3B3] flex items-center justify-center transition-colors"
                                title={`تماس با ${primaryPhone}`}
                              >
                                <Phone className="w-3.5 h-3.5" />
                              </a>
                            )}
                            {primaryTelegram && (
                              <a
                                href={
                                  /^09\d{9}$/.test(primaryTelegram)
                                    ? `https://t.me/+98${primaryTelegram.substring(1)}`
                                    : `https://t.me/${primaryTelegram.replace(/^@/, '')}`
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
                            {primaryInsta && (
                              <a
                                href={`https://instagram.com/${primaryInsta.replace(/^@/, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="w-7 h-7 rounded-full bg-[#282828] hover:bg-[#E1306C] hover:text-white text-[#B3B3B3] flex items-center justify-center transition-colors"
                                title="مشاهده پیج اینستاگرام"
                              >
                                <Instagram className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </>
                        );
                      })()}
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
