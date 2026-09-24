import React, { useState } from 'react';
import {
  X,
  Phone,
  Send,
  Instagram,
  Globe,
  Mail,
  User,
  Clock,
  AlertTriangle,
  Sparkles,
  MessageSquare,
  Plus,
  Star,
  CheckCircle,
  ExternalLink,
  Edit2,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { Customer, CustomerReport, Personnel, NegotiationStatus } from '../types';
import {
  formatTimeRemaining,
  formatPersianDate,
  formatPersianDateTime,
  getStatusTheme,
} from '../utils';

interface CustomerDetailModalProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
  onAddReport: (report: Partial<CustomerReport>) => Promise<void>;
  onReassign: (customerId: string, marketerId: string, marketerName: string, days: number) => Promise<void>;
  onEdit: (customer: Customer) => void;
  onDelete: (customerId: string) => void;
  personnelList: Personnel[];
  currentPersonnel: Personnel | null;
}

export const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({
  customer,
  isOpen,
  onClose,
  onAddReport,
  onReassign,
  onEdit,
  onDelete,
  personnelList,
  currentPersonnel,
}) => {
  if (!isOpen || !customer) return null;

  // New report form state
  const [showAddReport, setShowAddReport] = useState(false);
  const [negotiatorName, setNegotiatorName] = useState(currentPersonnel?.name || customer.negotiator_name || '');
  const [negotiationPhone, setNegotiationPhone] = useState(
    customer.mobile_numbers[0] || customer.manager_phones[0] || ''
  );
  const [reportText, setReportText] = useState('');
  const [negotiationScore, setNegotiationScore] = useState<number>(7);
  const [negotiationStatus, setNegotiationStatus] = useState<NegotiationStatus>(customer.status);
  const [nextFollowupDate, setNextFollowupDate] = useState(
    new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [submittingReport, setSubmittingReport] = useState(false);

  // Reassignment state
  const [showReassignBox, setShowReassignBox] = useState(false);
  const [selectedMarketerId, setSelectedMarketerId] = useState(personnelList[0]?.id || '');
  const [reassignDays, setReassignDays] = useState(7);
  const [reassigning, setReassigning] = useState(false);

  const timer = formatTimeRemaining(customer.assignment_deadline);
  const statusTheme = getStatusTheme(customer.status);

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportText.trim()) {
      alert('لطفاً شرح گزارش مذاکره را وارد کنید.');
      return;
    }

    setSubmittingReport(true);
    try {
      await onAddReport({
        customer_id: customer.id,
        negotiator_name: negotiatorName,
        negotiation_phone: negotiationPhone,
        report_text: reportText.trim(),
        negotiation_score: negotiationScore,
        next_followup_date: nextFollowupDate ? new Date(nextFollowupDate).toISOString() : '',
        negotiation_status: negotiationStatus,
      });
      setReportText('');
      setShowAddReport(false);
    } catch (err: any) {
      alert('خطا در ثبت گزارش: ' + err.message);
    } finally {
      setSubmittingReport(false);
    }
  };

  const handleReassignSubmit = async () => {
    const marketer = personnelList.find((p) => p.id === selectedMarketerId);
    if (!marketer) return;

    setReassigning(true);
    try {
      await onReassign(customer.id, marketer.id, marketer.name, reassignDays);
      setShowReassignBox(false);
    } catch (err: any) {
      alert('خطا در تخصیص مجدد: ' + err.message);
    } finally {
      setReassigning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#181818] border border-[#282828] w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden my-6 max-h-[90vh] flex flex-col">
        {/* Top Header */}
        <div className="p-6 bg-[#121212] border-b border-[#282828] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-[#282828] border border-[#3e3e3e] flex items-center justify-center text-[#1DB954] font-black text-xl flex-shrink-0">
              {customer.company_name.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl font-extrabold text-white truncate">
                  {customer.company_name}
                </h2>
                {/* Status indicator */}
                <div
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${statusTheme.bg} ${statusTheme.color}`}
                >
                  <span className={`w-2 h-2 rounded-full ${statusTheme.dot}`} />
                  <span>{customer.status}</span>
                </div>
                {customer.is_ecommerce && (
                  <span className="text-[11px] px-2 py-0.5 rounded bg-[#1DB954]/15 text-[#1DB954] font-medium border border-[#1DB954]/30">
                    فروشگاه آنلاین
                  </span>
                )}
              </div>
              <p className="text-xs text-[#A7A7A7] mt-1">
                {customer.business_type || 'حوزه فعالیت نامشخص'} · {customer.province}، {customer.city}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(customer)}
              className="p-2 rounded-full bg-[#282828] hover:bg-[#333333] text-[#B3B3B3] hover:text-white transition-colors"
              title="ویرایش پرونده"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                if (confirm('آیا از حذف پرونده این مشتری اطمینان دارید؟ تمامی گزارش‌های پیگیری نیز حذف خواهند شد.')) {
                  onDelete(customer.id);
                  onClose();
                }
              }}
              className="p-2 rounded-full bg-[#282828] hover:bg-red-950/60 text-[#A7A7A7] hover:text-red-400 transition-colors"
              title="حذف مشتری"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#282828] hover:bg-[#333333] flex items-center justify-center text-[#B3B3B3] hover:text-white transition-colors mr-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Marketer Assignment Bar & Expiration Timer */}
          <div
            className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-4 ${
              timer.isExpired
                ? 'bg-[#E22134]/10 border-[#E22134]/30'
                : 'bg-[#141414] border-[#282828]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center ${
                  timer.isExpired ? 'bg-[#E22134]/20 text-[#E22134]' : 'bg-[#282828] text-[#1DB954]'
                }`}
              >
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-[#A7A7A7]">بازاریاب متصل به مشتری</div>
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <span>{customer.assigned_marketer_name || 'تخصیص نیافته'}</span>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-mono ${timer.badgeClass}`}>
                    {timer.text}
                  </span>
                </div>
              </div>
            </div>

            {/* Reassign action */}
            <button
              onClick={() => setShowReassignBox(!showReassignBox)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#282828] hover:bg-[#333333] text-xs font-semibold text-white transition-all hover:scale-105 border border-[#3e3e3e]"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#1DB954]" />
              <span>تغییر بازاریاب یا تمدید مهلت</span>
            </button>
          </div>

          {/* Reassign Box Drawer */}
          {showReassignBox && (
            <div className="p-4 rounded-xl bg-[#202020] border border-[#333333] space-y-3">
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-[#1DB954]" />
                <span>تخصیص مشتری به بازاریاب دیگر با مهلت زمانی جدید</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] text-[#A7A7A7] mb-1">انتخاب بازاریاب جدید</label>
                  <select
                    value={selectedMarketerId}
                    onChange={(e) => setSelectedMarketerId(e.target.value)}
                    className="w-full h-9 px-2.5 bg-[#282828] rounded text-xs text-white focus:outline-none"
                  >
                    {personnelList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.role === 'marketer' ? 'بازاریاب' : 'پرسنل'})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-[#A7A7A7] mb-1">مدت مهلت زمانی جدید</label>
                  <select
                    value={reassignDays}
                    onChange={(e) => setReassignDays(Number(e.target.value))}
                    className="w-full h-9 px-2.5 bg-[#282828] rounded text-xs text-white focus:outline-none"
                  >
                    <option value={3}>۳ روز</option>
                    <option value={7}>۷ روز (استاندارد)</option>
                    <option value={14}>۱۴ روز</option>
                    <option value={30}>۳۰ روز</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    disabled={reassigning}
                    onClick={handleReassignSubmit}
                    className="w-full h-9 rounded bg-[#1DB954] hover:bg-[#1ED760] text-black font-bold text-xs transition-colors"
                  >
                    {reassigning ? 'در حال ثبت...' : 'تأیید تخصیص و ریست مهلت'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Quick Contact & Social Bars */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Direct Numbers */}
            <div className="p-4 rounded-xl bg-[#121212] border border-[#282828] space-y-3">
              <div className="text-xs font-bold text-[#B3B3B3] flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#1DB954]" />
                <span>شماره‌های تماس</span>
              </div>

              {/* Mobiles */}
              <div>
                <span className="text-[11px] text-[#A7A7A7]">موبایل‌ها:</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {customer.mobile_numbers.length > 0 ? (
                    customer.mobile_numbers.map((num, i) => (
                      <a
                        key={i}
                        href={`tel:${num}`}
                        dir="ltr"
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#282828] hover:bg-[#333333] text-xs font-mono text-white transition-colors"
                      >
                        <Phone className="w-3 h-3 text-[#1DB954]" />
                        <span>{num}</span>
                      </a>
                    ))
                  ) : (
                    <span className="text-xs text-[#535353]">-</span>
                  )}
                </div>
              </div>

              {/* Landlines */}
              {customer.landline_numbers.length > 0 && (
                <div>
                  <span className="text-[11px] text-[#A7A7A7]">تلفن‌های ثابت:</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {customer.landline_numbers.map((num, i) => (
                      <a
                        key={i}
                        href={`tel:${num}`}
                        dir="ltr"
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#282828] hover:bg-[#333333] text-xs font-mono text-white transition-colors"
                      >
                        <span>{num}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Manager & Negotiator Contacts */}
              <div className="pt-2 border-t border-[#282828] grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[#A7A7A7] block text-[11px]">مدیر:</span>
                  <span className="font-semibold text-white">{customer.manager_name || 'ثبت نشده'}</span>
                  {customer.manager_phones.length > 0 && (
                    <div className="text-[11px] font-mono text-[#1DB954] mt-0.5" dir="ltr">
                      {customer.manager_phones.join(' , ')}
                    </div>
                  )}
                </div>
                <div>
                  <span className="text-[#A7A7A7] block text-[11px]">مذاکره‌کننده سمت مشتری:</span>
                  <span className="font-semibold text-white">{customer.negotiator_name || 'ثبت نشده'}</span>
                  {customer.negotiator_phones.length > 0 && (
                    <div className="text-[11px] font-mono text-[#1DB954] mt-0.5" dir="ltr">
                      {customer.negotiator_phones.join(' , ')}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Socials & Web */}
            <div className="p-4 rounded-xl bg-[#121212] border border-[#282828] space-y-3">
              <div className="text-xs font-bold text-[#B3B3B3] flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#1DB954]" />
                <span>شبکه‌های اجتماعی و وب‌سایت</span>
              </div>

              {/* Telegram */}
              <div>
                <span className="text-[11px] text-[#A7A7A7]">تلگرام:</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {customer.telegram_phone && (
                    <a
                      href={`https://t.me/+${customer.telegram_phone.replace(/^0/, '98')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#229ED9]/15 border border-[#229ED9]/30 text-[#229ED9] text-xs font-mono hover:bg-[#229ED9]/25 transition-colors"
                    >
                      <Send className="w-3 h-3" />
                      <span>شماره تلگرام: {customer.telegram_phone}</span>
                    </a>
                  )}

                  {customer.telegram_ids.map((tid, i) => (
                    <a
                      key={i}
                      href={`https://t.me/${tid.replace(/^@/, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#282828] hover:bg-[#333333] text-xs font-mono text-white transition-colors"
                    >
                      <Send className="w-3 h-3 text-[#229ED9]" />
                      <span>@{tid.replace(/^@/, '')}</span>
                    </a>
                  ))}
                  {!customer.telegram_phone && customer.telegram_ids.length === 0 && (
                    <span className="text-xs text-[#535353]">-</span>
                  )}
                </div>
              </div>

              {/* Instagram */}
              <div>
                <span className="text-[11px] text-[#A7A7A7]">اینستاگرام:</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {customer.instagram_ids.length > 0 ? (
                    customer.instagram_ids.map((insta, i) => (
                      <a
                        key={i}
                        href={`https://instagram.com/${insta.replace(/^@/, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E1306C]/15 border border-[#E1306C]/30 text-[#E1306C] text-xs font-mono hover:bg-[#E1306C]/25 transition-colors"
                      >
                        <Instagram className="w-3 h-3" />
                        <span>@{insta.replace(/^@/, '')}</span>
                      </a>
                    ))
                  ) : (
                    <span className="text-xs text-[#535353]">-</span>
                  )}
                </div>
              </div>

              {/* Websites */}
              {customer.websites.length > 0 && (
                <div>
                  <span className="text-[11px] text-[#A7A7A7]">وب‌سایت‌ها:</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {customer.websites.map((web, i) => (
                      <a
                        key={i}
                        href={web.startsWith('http') ? web : `https://${web}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#282828] hover:bg-[#333333] text-xs text-[#1DB954] hover:underline"
                        dir="ltr"
                      >
                        <Globe className="w-3 h-3" />
                        <span>{web.replace(/^https?:\/\//, '')}</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* First Interview Report Box */}
          <div className="p-5 rounded-xl bg-[#121212] border border-[#282828] space-y-3">
            <div className="flex items-center justify-between border-b border-[#282828] pb-3">
              <div className="flex items-center gap-2 font-bold text-sm text-white">
                <Sparkles className="w-4 h-4 text-[#1DB954]" />
                <span>گزارش مصاحبه اولیه (اولین مکالمه با مشتری)</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-[#A7A7A7]">وضعیت مصاحبه:</span>
                <span className="font-semibold text-white px-2.5 py-0.5 rounded bg-[#282828]">
                  {customer.interview_status || 'ثبت نشده'}
                </span>
                <span className="text-[#A7A7A7] mr-2">امتیاز:</span>
                <span className="font-mono font-bold text-[#1DB954] px-2 py-0.5 rounded bg-[#1DB954]/15">
                  {customer.interview_score} / 10
                </span>
              </div>
            </div>

            <p className="text-xs text-[#B3B3B3] leading-relaxed whitespace-pre-wrap">
              {customer.interview_report || 'هیچ یادداشتی برای مصاحبه اولیه ثبت نشده است.'}
            </p>

            {customer.next_followup_date && (
              <div className="pt-2 text-xs text-[#A7A7A7] flex items-center gap-2">
                <span>موعد پیگیری بعدی تعیین شده:</span>
                <span className="text-white font-semibold font-mono">
                  {formatPersianDate(customer.next_followup_date)}
                </span>
              </div>
            )}
          </div>

          {/* Follow-up Reports History Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm text-white">
                <MessageSquare className="w-4 h-4 text-[#1DB954]" />
                <span>تاریخچه گزارش‌های پیگیری و مذاکره ({customer.reports?.length || 0})</span>
              </div>

              <button
                onClick={() => setShowAddReport(!showAddReport)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#1DB954] hover:bg-[#1ED760] text-xs font-bold text-black transition-all hover:scale-105 shadow-md shadow-[#1DB954]/20"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>ثبت گزارش پیگیری جدید</span>
              </button>
            </div>

            {/* Inline Add Report Form */}
            {showAddReport && (
              <form
                onSubmit={handleReportSubmit}
                className="p-4 rounded-xl bg-[#202020] border border-[#333333] space-y-4 animate-in fade-in"
              >
                <div className="font-bold text-xs text-white border-b border-[#282828] pb-2">
                  ثبت گزارش مذاکره جدید برای این پرونده
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] text-[#A7A7A7] mb-1">مذاکره‌کننده</label>
                    <input
                      type="text"
                      value={negotiatorName}
                      onChange={(e) => setNegotiatorName(e.target.value)}
                      className="w-full h-9 px-2.5 bg-[#282828] rounded text-xs text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-[#A7A7A7] mb-1">شماره تماس مذاکره</label>
                    <input
                      type="text"
                      dir="ltr"
                      value={negotiationPhone}
                      onChange={(e) => setNegotiationPhone(e.target.value)}
                      className="w-full h-9 px-2.5 bg-[#282828] rounded text-xs text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-[#A7A7A7] mb-1">وضعیت مذاکره</label>
                    <select
                      value={negotiationStatus}
                      onChange={(e) => setNegotiationStatus(e.target.value as NegotiationStatus)}
                      className="w-full h-9 px-2.5 bg-[#282828] rounded text-xs text-white focus:outline-none"
                    >
                      <option value="تماس برقرار نشده">تماس برقرار نشده</option>
                      <option value="پاسخ نمیدهد">پاسخ نمیدهد</option>
                      <option value="نمیخواد">نمیخواد</option>
                      <option value="پیگیری قبل از انقضا">پیگیری قبل از انقضا</option>
                      <option value="پیگیری بلند مدت">پیگیری بلند مدت</option>
                      <option value="پیگیری قرارداد">پیگیری قرارداد</option>
                      <option value="پیش نویس قرارداد">پیش نویس قرارداد</option>
                      <option value="قرارداد">قرارداد (موفقیت‌آمیز)</option>
                      <option value="لیست سیاه">لیست سیاه</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-[#A7A7A7] mb-1">
                      امتیاز مذاکره: <span className="text-[#1DB954] font-bold font-mono">{negotiationScore}</span>/10
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={negotiationScore}
                      onChange={(e) => setNegotiationScore(Number(e.target.value))}
                      className="w-full accent-[#1DB954]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="md:col-span-3">
                    <label className="block text-[11px] text-[#A7A7A7] mb-1">متن گزارش مذاکره</label>
                    <textarea
                      rows={3}
                      required
                      value={reportText}
                      onChange={(e) => setReportText(e.target.value)}
                      placeholder="شرح جزئیات صحبت، نیاز مشتری، توافقات مالی، ابهامات یا موانع مطرح شده..."
                      className="w-full p-2.5 bg-[#282828] rounded text-xs text-white resize-none focus:outline-none focus:ring-1 focus:ring-[#1DB954]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#A7A7A7] mb-1">تاریخ پیگیری بعدی</label>
                    <input
                      type="date"
                      value={nextFollowupDate}
                      onChange={(e) => setNextFollowupDate(e.target.value)}
                      className="w-full h-9 px-2 bg-[#282828] rounded text-xs text-white focus:outline-none"
                    />
                    <div className="mt-4 flex gap-2">
                      <button
                        type="submit"
                        disabled={submittingReport}
                        className="flex-1 h-9 rounded-full bg-[#1DB954] hover:bg-[#1ED760] text-black font-bold text-xs transition-colors"
                      >
                        {submittingReport ? 'ثبت...' : 'ذخیره گزارش'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddReport(false)}
                        className="px-3 h-9 rounded-full border border-[#535353] text-[#B3B3B3] hover:text-white text-xs"
                      >
                        انصراف
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            )}

            {/* Reports List */}
            <div className="space-y-3">
              {customer.reports && customer.reports.length > 0 ? (
                customer.reports.map((rep) => {
                  const repTheme = getStatusTheme(rep.negotiation_status);
                  return (
                    <div
                      key={rep.id}
                      className="p-4 rounded-xl bg-[#121212] border border-[#282828] space-y-2 hover:border-[#3e3e3e] transition-colors"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-white">{rep.negotiator_name}</span>
                          {rep.negotiation_phone && (
                            <span className="text-[11px] font-mono text-[#A7A7A7]" dir="ltr">
                              ({rep.negotiation_phone})
                            </span>
                          )}
                          <span
                            className={`text-[11px] px-2.5 py-0.5 rounded-full border ${repTheme.bg} ${repTheme.color} font-medium`}
                          >
                            {rep.negotiation_status}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-[#A7A7A7]">
                          <span className="font-mono">امتیاز: {rep.negotiation_score}/10</span>
                          <span>·</span>
                          <span>{formatPersianDateTime(rep.date_created)}</span>
                        </div>
                      </div>

                      <p className="text-xs text-[#B3B3B3] leading-relaxed whitespace-pre-wrap">
                        {rep.report_text}
                      </p>

                      {rep.next_followup_date && (
                        <div className="text-[11px] text-[#A7A7A7] pt-1">
                          پیگیری بعدی: <span className="text-white font-mono">{formatPersianDate(rep.next_followup_date)}</span>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center bg-[#121212] rounded-xl border border-[#282828] text-xs text-[#A7A7A7]">
                  هنوز هیچ گزارش پیگیری برای این مشتری ثبت نشده است. با کلیک بر روی دکمه بالا اولین گزارش را ثبت کنید.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
