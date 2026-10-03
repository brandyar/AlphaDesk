import React, { useState } from 'react';
import { X, MessageSquareText, Building, User, Calendar, Phone, FileCheck2, Hash, DollarSign, PackageCheck } from 'lucide-react';
import { Customer, CustomerReport, Personnel, NegotiationStatus, AuthUser } from '../types';
import { PersianDatePicker } from './PersianDatePicker';
import { formatToman } from '../utils';

interface AddReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  personnelList: Personnel[];
  currentPersonnel: Personnel | null;
  currentUser?: AuthUser | null;
  isAdmin?: boolean;
  onSaveReport: (report: Partial<CustomerReport>) => Promise<void>;
  preselectedCustomerId?: string;
}

export const AddReportModal: React.FC<AddReportModalProps> = ({
  isOpen,
  onClose,
  customers,
  personnelList,
  currentPersonnel,
  currentUser,
  isAdmin,
  onSaveReport,
  preselectedCustomerId,
}) => {
  if (!isOpen) return null;

  const userIsAdmin = Boolean(
    isAdmin ||
    currentUser?.is_admin ||
    currentUser?.app_role === 'admin' ||
    currentUser?.role_id === '59e261e1-56f4-401e-9889-4971e2c3c4ce' ||
    currentUser?.role_id === 'a45beaec-0272-4c29-89ee-122dce37f565' ||
    currentPersonnel?.role === 'admin'
  );

  const [customerId, setCustomerId] = useState(preselectedCustomerId || customers[0]?.id || '');
  const [negotiatorName, setNegotiatorName] = useState(
    currentPersonnel?.name || currentUser?.name || 'کارشناس پیگیری'
  );
  const [negotiationPhone, setNegotiationPhone] = useState('');
  const [reportText, setReportText] = useState('');
  const [negotiationScore, setNegotiationScore] = useState<number>(7);
  const [negotiationStatus, setNegotiationStatus] = useState<NegotiationStatus>('پیگیری قبل از انقضا');
  const [nextFollowupDate, setNextFollowupDate] = useState(
    new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );

  // Contract / Invoice fields
  const [contractNumber, setContractNumber] = useState('');
  const [contractDate, setContractDate] = useState(new Date().toISOString().split('T')[0]);
  const [contractItems, setContractItems] = useState('');
  const [contractAmount, setContractAmount] = useState<string>('');

  const [saving, setSaving] = useState(false);

  const selectedCustomer = customers.find((c) => c.id === customerId);

  const isContractStatus = negotiationStatus === 'قرارداد / فاکتور' || negotiationStatus === 'قرارداد';

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
      const finalNegotiator = userIsAdmin
        ? (negotiatorName || currentPersonnel?.name || currentUser?.name || 'مدیر سیستم')
        : (currentPersonnel?.name || currentUser?.name || 'کارشناس پیگیری');

      const numericAmount = contractAmount ? parseFloat(contractAmount.replace(/,/g, '')) : undefined;

      await onSaveReport({
        customer_id: customerId,
        negotiator_name: finalNegotiator,
        negotiation_phone: negotiationPhone || (Array.isArray(selectedCustomer?.mobile_numbers) ? selectedCustomer.mobile_numbers[0] : '') || '',
        report_text: reportText.trim(),
        negotiation_score: Number(negotiationScore),
        next_followup_date: nextFollowupDate ? new Date(nextFollowupDate).toISOString() : '',
        negotiation_status: negotiationStatus,
        contract_number: isContractStatus && contractNumber ? contractNumber.trim() : undefined,
        contract_date: isContractStatus && contractDate ? contractDate : undefined,
        contract_items: isContractStatus && contractItems ? contractItems.trim() : undefined,
        contract_amount: isContractStatus && !isNaN(numericAmount as number) ? numericAmount : undefined,
      });
      onClose();
    } catch (err: any) {
      alert('خطا در ثبت گزارش: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAmountChange = (val: string) => {
    const rawDigits = val.replace(/[^\d]/g, '');
    if (!rawDigits) {
      setContractAmount('');
      return;
    }
    const num = parseInt(rawDigits, 10);
    setContractAmount(num.toLocaleString('en-US'));
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
                if (c && Array.isArray(c.mobile_numbers) && c.mobile_numbers[0]) {
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

          <div className={`grid gap-4 ${userIsAdmin ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
            {/* Negotiator Name - ONLY for Admin */}
            {userIsAdmin && (
              <div>
                <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
                  مذاکره‌کننده (ویژه مدیر)
                </label>
                <select
                  value={negotiatorName}
                  onChange={(e) => setNegotiatorName(e.target.value)}
                  className="w-full h-10 px-3 bg-[#282828] rounded-md text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#1DB954]"
                >
                  {personnelList.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name} ({p.role === 'admin' ? 'مدیر' : 'کارشناس'})
                    </option>
                  ))}
                </select>
              </div>
            )}

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
                <option value="قرارداد">قرارداد / فاکتور (موفق)</option>
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
              <PersianDatePicker
                label="تاریخ پیگیری بعدی (شمسی)"
                value={nextFollowupDate}
                onChange={(iso) => setNextFollowupDate(iso)}
              />
            </div>
          </div>

          {/* Dedicated Contract / Invoice Section when status is 'قرارداد / فاکتور' */}
          {isContractStatus && (
            <div className="p-4 rounded-2xl bg-[#1DB954]/10 border border-[#1DB954]/30 space-y-3.5 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-xs font-bold text-[#1DB954] border-b border-[#1DB954]/20 pb-2">
                <FileCheck2 className="w-4 h-4" />
                <span>اطلاعات تکمیلی قرارداد / فاکتور صادر شده</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {/* Contract / Invoice Number */}
                <div>
                  <label className="block text-[11px] font-semibold text-[#B3B3B3] mb-1 flex items-center gap-1">
                    <Hash className="w-3 h-3 text-[#1DB954]" />
                    <span>شماره قرارداد / فاکتور</span>
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={contractNumber}
                    onChange={(e) => setContractNumber(e.target.value)}
                    placeholder="مثلاً: CNT-1403/102 یا 89201"
                    className="w-full h-9 px-3 bg-[#181818] rounded-lg text-xs text-white border border-[#2a2a2a] focus:border-[#1DB954] focus:outline-none font-mono"
                  />
                </div>

                {/* Contract / Invoice Date */}
                <div>
                  <PersianDatePicker
                    label="تاریخ قرارداد / فاکتور"
                    value={contractDate}
                    onChange={(iso) => setContractDate(iso || new Date().toISOString().split('T')[0])}
                  />
                </div>

                {/* Final Amount (Toman) */}
                <div>
                  <label className="block text-[11px] font-semibold text-[#B3B3B3] mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3 text-[#1DB954]" />
                      <span>مبلغ نهایی (تومان)</span>
                    </span>
                    {contractAmount && (
                      <span className="text-[10px] text-[#1DB954] font-mono font-bold">
                        {formatToman(contractAmount)}
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={contractAmount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    placeholder="مثلاً: 25,000,000"
                    className="w-full h-9 px-3 bg-[#181818] rounded-lg text-xs text-white border border-[#2a2a2a] focus:border-[#1DB954] focus:outline-none font-mono font-bold text-left"
                  />
                </div>
              </div>

              {/* Contract / Invoice Items */}
              <div>
                <label className="block text-[11px] font-semibold text-[#B3B3B3] mb-1 flex items-center gap-1">
                  <PackageCheck className="w-3 h-3 text-[#1DB954]" />
                  <span>آیتم‌ها و اقلام قرارداد / فاکتور</span>
                </label>
                <input
                  type="text"
                  value={contractItems}
                  onChange={(e) => setContractItems(e.target.value)}
                  placeholder="شرح اقلام و خدمات (مثلاً: طراحی سایت فروشگاهی + درگاه پرداخت + هاست و پشتیبانی ۱ ساله)..."
                  className="w-full h-9 px-3 bg-[#181818] rounded-lg text-xs text-white border border-[#2a2a2a] focus:border-[#1DB954] focus:outline-none"
                />
              </div>
            </div>
          )}

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
