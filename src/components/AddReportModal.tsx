import React, { useState } from 'react';
import { X, MessageSquareText, Building, User, Calendar, Phone } from 'lucide-react';
import { Customer, CustomerReport, Personnel, NegotiationStatus } from '../types';

interface AddReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  personnelList: Personnel[];
  currentPersonnel: Personnel | null;
  onSaveReport: (report: Partial<CustomerReport>) => Promise<void>;
  preselectedCustomerId?: string;
}

export const AddReportModal: React.FC<AddReportModalProps> = ({
  isOpen,
  onClose,
  customers,
  personnelList,
  currentPersonnel,
  onSaveReport,
  preselectedCustomerId,
}) => {
  if (!isOpen) return null;

  const [customerId, setCustomerId] = useState(preselectedCustomerId || customers[0]?.id || '');
  const [negotiatorName, setNegotiatorName] = useState(currentPersonnel?.name || 'کارشناس پیگیری');
  const [negotiationPhone, setNegotiationPhone] = useState('');
  const [reportText, setReportText] = useState('');
  const [negotiationScore, setNegotiationScore] = useState<number>(7);
  const [negotiationStatus, setNegotiationStatus] = useState<NegotiationStatus>('پیگیری قبل از انقضا');
  const [nextFollowupDate, setNextFollowupDate] = useState(
    new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [saving, setSaving] = useState(false);

  const selectedCustomer = customers.find((c) => c.id === customerId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      alert('لطفاً مشتری را انتخاب کنید.');
      return;
    }
    if (!reportText.trim()) {
      alert('لطفاً متن گزارش مذاکره را وارد کنید.');
      return;
    }

    setSaving(true);
    try {
      await onSaveReport({
        customer_id: customerId,
        negotiator_name: negotiatorName,
        negotiation_phone: negotiationPhone || selectedCustomer?.mobile_numbers[0] || '',
        report_text: reportText.trim(),
        negotiation_score: Number(negotiationScore),
        next_followup_date: nextFollowupDate ? new Date(nextFollowupDate).toISOString() : '',
        negotiation_status: negotiationStatus,
      });
      onClose();
    } catch (err: any) {
      alert('خطا در ثبت گزارش: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#181818] border border-[#282828] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden my-2 sm:my-8 max-h-[95vh] flex flex-col">
        <div className="p-4 sm:p-5 bg-[#121212] border-b border-[#282828] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#1DB954]/15 text-[#1DB954] flex items-center justify-center border border-[#1DB954]/30 flex-shrink-0">
              <MessageSquareText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">ثبت گزارش مذاکره و پیگیری مشتری</h3>
              <p className="text-[11px] text-[#A7A7A7]">گزارش پیگیری‌ها و تغییر وضعیت مرحله مشتری</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#282828] hover:bg-[#333333] flex items-center justify-center text-[#B3B3B3] hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Customer Selection */}
          <div>
            <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
              انتخاب مشتری <span className="text-[#E22134]">*</span>
            </label>
            <select
              value={customerId}
              onChange={(e) => {
                setCustomerId(e.target.value);
                const c = customers.find((cust) => cust.id === e.target.value);
                if (c && c.mobile_numbers[0]) {
                  setNegotiationPhone(c.mobile_numbers[0]);
                }
              }}
              className="w-full h-10 px-3 bg-[#282828] rounded-md text-xs text-white border border-transparent focus:border-[#1DB954] focus:outline-none"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company_name} ({c.city}) - بازاریاب: {c.assigned_marketer_name || 'بدون بازاریاب'}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Negotiator Name */}
            <div>
              <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
                مذاکره‌کننده
              </label>
              <input
                type="text"
                required
                value={negotiatorName}
                onChange={(e) => setNegotiatorName(e.target.value)}
                className="w-full h-10 px-3 bg-[#282828] rounded-md text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#1DB954]"
              />
            </div>

            {/* Negotiation Phone */}
            <div>
              <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
                شماره تماس مذاکره
              </label>
              <input
                type="text"
                dir="ltr"
                value={negotiationPhone}
                onChange={(e) => setNegotiationPhone(e.target.value)}
                placeholder="0912..."
                className="w-full h-10 px-3 bg-[#282828] rounded-md text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#1DB954]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Negotiation Status */}
            <div>
              <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
                وضعیت مذاکره
              </label>
              <select
                value={negotiationStatus}
                onChange={(e) => setNegotiationStatus(e.target.value as NegotiationStatus)}
                className="w-full h-10 px-3 bg-[#282828] rounded-md text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#1DB954]"
              >
                <option value="تماس برقرار نشده">تماس برقرار نشده</option>
                <option value="پاسخ نمیدهد">پاسخ نمیدهد</option>
                <option value="نمیخواد">نمیخواد</option>
                <option value="پیگیری قبل از انقضا">پیگیری قبل از انقضا</option>
                <option value="پیگیری بلند مدت">پیگیری بلند مدت</option>
                <option value="پیگیری قرارداد">پیگیری قرارداد</option>
                <option value="پیش نویس قرارداد">پیش نویس قرارداد</option>
                <option value="قرارداد">قرارداد (موفق)</option>
                <option value="لیست سیاه">لیست سیاه</option>
              </select>
            </div>

            {/* Negotiation Score */}
            <div>
              <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
                امتیاز مذاکره: <span className="text-[#1DB954] font-bold font-mono">{negotiationScore}</span>/10
              </label>
              <input
                type="range"
                min={1}
                max={10}
                value={negotiationScore}
                onChange={(e) => setNegotiationScore(Number(e.target.value))}
                className="w-full accent-[#1DB954] mt-2"
              />
            </div>

            {/* Next Follow-up Date */}
            <div>
              <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
                تاریخ پیگیری بعدی
              </label>
              <input
                type="date"
                value={nextFollowupDate}
                onChange={(e) => setNextFollowupDate(e.target.value)}
                className="w-full h-10 px-3 bg-[#282828] rounded-md text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#1DB954]"
              />
            </div>
          </div>

          {/* Report Text */}
          <div>
            <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
              متن گزارش مذاکره <span className="text-[#E22134]">*</span>
            </label>
            <textarea
              rows={4}
              required
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              placeholder="شرح دقیق مکالمه، پاسخ مشتری، نیازها و بندهای مورد مذاکره..."
              className="w-full p-3 bg-[#282828] rounded-md text-xs text-white resize-none focus:outline-none focus:ring-1 focus:ring-[#1DB954] leading-relaxed"
            />
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-[#282828] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-5 rounded-full border border-[#535353] hover:border-white text-xs font-semibold text-[#B3B3B3] hover:text-white transition-colors"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={saving}
              className="h-10 px-6 rounded-full bg-[#1DB954] hover:bg-[#1ED760] text-black font-bold text-xs transition-all hover:scale-105 shadow-md shadow-[#1DB954]/20"
            >
              {saving ? 'در حال ثبت...' : 'ثبت و اعمال گزارش'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
