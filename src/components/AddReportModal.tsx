import React, { useState, useMemo, useEffect } from 'react';
import { X, MessageSquareText, Building, User, Calendar, Phone, FileCheck2, Hash, DollarSign, PackageCheck, AlertCircle } from 'lucide-react';
import { Customer, CustomerReport, Personnel, NegotiationStatus, AuthUser } from '../types';
import { PersianDatePicker } from './PersianDatePicker';
import { formatToman, getCustomerPhoneOptions } from '../utils';

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
    currentUser?.app_role === 'sales_manager' ||
    currentPersonnel?.role === 'admin' ||
    currentPersonnel?.role === 'sales_manager'
  );

  const [customerId, setCustomerId] = useState(preselectedCustomerId || customers[0]?.id || '');
  const selectedCustomer = useMemo(() => customers.find((c) => c.id === customerId), [customers, customerId]);
  const customerPhoneOptions = useMemo(() => getCustomerPhoneOptions(selectedCustomer), [selectedCustomer]);

  // Negotiator name for organization
  const [negotiatorName, setNegotiatorName] = useState(
    currentPersonnel?.name || currentUser?.name || 'کارشناس پیگیری'
  );

  // Negotiator on customer side (must be initially EMPTY as requested)
  const [customerNegotiatorName, setCustomerNegotiatorName] = useState('');

  // Customer phone selection
  const [negotiationPhone, setNegotiationPhone] = useState(customerPhoneOptions[0]?.number || '');
  const [isCustomPhone, setIsCustomPhone] = useState(customerPhoneOptions.length === 0);

  const [reportText, setReportText] = useState('');
  const [negotiationScore, setNegotiationScore] = useState<number>(7);
  const [negotiationStatus, setNegotiationStatus] = useState<NegotiationStatus>('پیگیری قبل از انقضا');

  // Next follow-up datetime (default: 2 hours from now)
  const [nextFollowupDate, setNextFollowupDate] = useState(() => {
    return new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  });

  const [formError, setFormError] = useState<string | null>(null);

  // Contract / Invoice fields
  const [contractNumber, setContractNumber] = useState('');
  const [contractDate, setContractDate] = useState(new Date().toISOString().split('T')[0]);
  const [contractItems, setContractItems] = useState('');
  const [contractAmount, setContractAmount] = useState<string>('');

  const [saving, setSaving] = useState(false);

  // When customer selection changes, update default phone
  useEffect(() => {
    if (customerPhoneOptions.length > 0) {
      setNegotiationPhone(customerPhoneOptions[0].number);
      setIsCustomPhone(false);
    } else {
      setNegotiationPhone('');
      setIsCustomPhone(true);
    }
  }, [customerId, customerPhoneOptions]);

  const isContractStatus = negotiationStatus === 'قرارداد / فاکتور' || negotiationStatus === 'قرارداد';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!customerId) {
      setFormError('لطفاً مشتری را انتخاب کنید.');
      return;
    }
    if (!reportText.trim()) {
      setFormError('لطفاً متن گزارش مذاکره را وارد کنید.');
      return;
    }
    if (!negotiationPhone.trim()) {
      setFormError('لطفاً شماره تماس مذاکره را انتخاب یا وارد کنید.');
      return;
    }

    // Validate next followup date/time cannot be in the past
    if (nextFollowupDate) {
      const followupTime = new Date(nextFollowupDate).getTime();
      if (isNaN(followupTime)) {
        setFormError('فرمت تاریخ و ساعت پیگیری بعدی نامعتبر است.');
        return;
      }
      if (followupTime <= Date.now()) {
        setFormError('تاریخ و ساعت پیگیری بعدی نمی‌تواند در گذشته باشد. لطفاً ساعت و زمان پیگیری را برای ساعتی در آینده تنظیم کنید.');
        return;
      }
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
        customer_negotiator_name: customerNegotiatorName.trim() || undefined,
        negotiation_phone: negotiationPhone.trim(),
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
      setFormError('خطا در ثبت گزارش: ' + err.message);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 md:p-6 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-[#181818] border border-slate-200 dark:border-[#282828] w-full max-w-2xl rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] sm:max-h-[90vh] flex flex-col text-slate-900 dark:text-white transition-all">
        {/* Header */}
        <div className="p-3.5 sm:p-5 bg-slate-50 dark:bg-[#121212] border-b border-slate-200 dark:border-[#282828] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-full bg-emerald-100 dark:bg-[#1DB954]/15 text-emerald-700 dark:text-[#1DB954] flex items-center justify-center border border-emerald-300 dark:border-[#1DB954]/30 shrink-0">
              <MessageSquareText className="w-4 h-4" />
            </div>
            <div className="truncate">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">ثبت گزارش مذاکره و پیگیری مشتری</h3>
              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-[#A7A7A7] truncate">گزارش پیگیری‌ها و تغییر وضعیت مرحله مشتری</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 dark:bg-[#282828] dark:hover:bg-[#333333] flex items-center justify-center dark:text-[#B3B3B3] dark:hover:text-white transition-colors cursor-pointer shrink-0"
            aria-label="بستن"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-3.5 sm:p-5 md:p-6 space-y-3.5 sm:space-y-4 overflow-y-auto flex-1">
          {/* Error Message Banner */}
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 dark:bg-rose-950/40 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-400 font-bold flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-[#E22134]" />
              <span>{formError}</span>
            </div>
          )}

          {/* Customer Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-[#B3B3B3] mb-1.5">
              انتخاب مشتری <span className="text-red-500 dark:text-[#E22134]">*</span>
            </label>
            <select
              value={customerId}
              onChange={(e) => {
                setCustomerId(e.target.value);
                setFormError(null);
              }}
              className="w-full h-10 px-3 bg-white dark:bg-[#282828] border border-slate-300 dark:border-transparent rounded-lg sm:rounded-md text-xs text-slate-900 dark:text-white focus:border-emerald-500 dark:focus:border-[#1DB954] focus:outline-none"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company_name} ({c.city}) - بازاریاب: {c.assigned_marketer_name || 'بدون بازاریاب'}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Customer Negotiator Name (Empty by default) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#B3B3B3] mb-1.5">
                طرف مذاکره سمت مشتری
              </label>
              <input
                type="text"
                value={customerNegotiatorName}
                onChange={(e) => {
                  setCustomerNegotiatorName(e.target.value);
                  setFormError(null);
                }}
                placeholder="نام طرف مذاکره سمت مشتری..."
                className="w-full h-10 px-3 bg-white dark:bg-[#282828] border border-slate-300 dark:border-transparent rounded-lg sm:rounded-md text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:focus:ring-[#1DB954]"
              />
              {selectedCustomer && (selectedCustomer.manager_name || selectedCustomer.negotiator_name) && (
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-[10px]">
                  <span className="text-slate-400 dark:text-[#777]">پیشنهاد:</span>
                  {selectedCustomer.manager_name && (
                    <button
                      type="button"
                      onClick={() => setCustomerNegotiatorName(selectedCustomer.manager_name)}
                      className="px-2 py-0.5 rounded bg-slate-100 hover:bg-emerald-100 dark:bg-[#333] dark:hover:bg-[#1DB954]/20 text-slate-700 hover:text-emerald-700 dark:text-[#ccc] dark:hover:text-[#1DB954] transition-colors cursor-pointer"
                    >
                      {selectedCustomer.manager_name} (مدیر)
                    </button>
                  )}
                  {selectedCustomer.negotiator_name && selectedCustomer.negotiator_name !== selectedCustomer.manager_name && (
                    <button
                      type="button"
                      onClick={() => setCustomerNegotiatorName(selectedCustomer.negotiator_name)}
                      className="px-2 py-0.5 rounded bg-slate-100 hover:bg-emerald-100 dark:bg-[#333] dark:hover:bg-[#1DB954]/20 text-slate-700 hover:text-emerald-700 dark:text-[#ccc] dark:hover:text-[#1DB954] transition-colors cursor-pointer"
                    >
                      {selectedCustomer.negotiator_name}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Negotiation Phone (Selectable from Customer's phones) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#B3B3B3] mb-1.5">
                شماره تماس مذاکره
              </label>
              {customerPhoneOptions.length > 0 ? (
                <div className="space-y-1.5">
                  <select
                    value={isCustomPhone ? '__custom__' : negotiationPhone}
                    onChange={(e) => {
                      setFormError(null);
                      if (e.target.value === '__custom__') {
                        setIsCustomPhone(true);
                        setNegotiationPhone('');
                      } else {
                        setIsCustomPhone(false);
                        setNegotiationPhone(e.target.value);
                      }
                    }}
                    className="w-full h-10 px-3 bg-white dark:bg-[#282828] border border-slate-300 dark:border-transparent rounded-lg sm:rounded-md text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                  >
                    {customerPhoneOptions.map((opt) => (
                      <option key={opt.number} value={opt.number}>
                        {opt.number} ({opt.label})
                      </option>
                    ))}
                    <option value="__custom__">➕ شماره دیگر / ورود دستی...</option>
                  </select>

                  {/* Quick clickable chips */}
                  <div className="flex flex-wrap gap-1">
                    {customerPhoneOptions.map((opt) => (
                      <button
                        key={opt.number}
                        type="button"
                        onClick={() => {
                          setNegotiationPhone(opt.number);
                          setIsCustomPhone(false);
                          setFormError(null);
                        }}
                        className={`text-[10px] px-2 py-0.5 rounded-md border font-mono transition-colors cursor-pointer ${
                          !isCustomPhone && negotiationPhone === opt.number
                            ? 'bg-emerald-500 text-white border-emerald-500 font-bold dark:bg-[#1DB954] dark:text-black'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 dark:bg-[#282828] dark:hover:bg-[#333] dark:text-[#ccc] dark:border-[#383838]'
                        }`}
                        title={opt.label}
                      >
                        {opt.number}
                      </button>
                    ))}
                  </div>

                  {isCustomPhone && (
                    <input
                      type="text"
                      dir="ltr"
                      value={negotiationPhone}
                      onChange={(e) => {
                        setNegotiationPhone(e.target.value);
                        setFormError(null);
                      }}
                      placeholder="0912..."
                      className="w-full h-9 px-3 bg-white dark:bg-[#282828] border border-emerald-500 rounded-md text-xs text-slate-900 dark:text-white font-mono focus:outline-none mt-1 animate-in fade-in"
                    />
                  )}
                </div>
              ) : (
                <input
                  type="text"
                  dir="ltr"
                  value={negotiationPhone}
                  onChange={(e) => {
                    setNegotiationPhone(e.target.value);
                    setFormError(null);
                  }}
                  placeholder="0912..."
                  className="w-full h-10 px-3 bg-white dark:bg-[#282828] border border-slate-300 dark:border-transparent rounded-lg sm:rounded-md text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:focus:ring-[#1DB954] font-mono"
                />
              )}
            </div>
          </div>

          {userIsAdmin && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#222] border border-slate-200 dark:border-[#333]">
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#B3B3B3] mb-1.5">
                کارشناس ثبت‌کننده سازمان (ویژه مدیر)
              </label>
              <select
                value={negotiatorName}
                onChange={(e) => setNegotiatorName(e.target.value)}
                className="w-full h-9 px-3 bg-white dark:bg-[#282828] border border-slate-300 dark:border-[#444] rounded-md text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:focus:ring-[#1DB954]"
              >
                {personnelList.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name} ({p.role === 'admin' ? 'مدیر' : 'کارشناس'})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {/* Negotiation Status */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#B3B3B3] mb-1.5">
                وضعیت مذاکره
              </label>
              <select
                value={negotiationStatus}
                onChange={(e) => setNegotiationStatus(e.target.value as NegotiationStatus)}
                className="w-full h-10 px-3 bg-white dark:bg-[#282828] border border-slate-300 dark:border-transparent rounded-lg sm:rounded-md text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:focus:ring-[#1DB954]"
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
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#B3B3B3] mb-1.5">
                امتیاز مذاکره: <span className="text-emerald-700 dark:text-[#1DB954] font-bold font-mono">{negotiationScore}</span>/10
              </label>
              <div className="flex items-center gap-2 h-10 px-2 bg-slate-50 dark:bg-[#222] rounded-lg border border-slate-200 dark:border-[#2e2e2e]">
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={negotiationScore}
                  onChange={(e) => setNegotiationScore(Number(e.target.value))}
                  className="w-full accent-emerald-600 dark:accent-[#1DB954] cursor-pointer"
                />
              </div>
            </div>

            {/* Next Follow-up Date and Time */}
            <div className="sm:col-span-2 lg:col-span-1">
              <PersianDatePicker
                label="موعد پیگیری بعدی"
                value={nextFollowupDate}
                onChange={(iso) => {
                  setNextFollowupDate(iso);
                  setFormError(null);
                }}
                showTime={true}
                disablePast={true}
                showQuickPresets={false}
              />
            </div>
          </div>

          {/* Dedicated Contract / Invoice Section when status is 'قرارداد / فاکتور' */}
          {isContractStatus && (
            <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-50 dark:bg-[#1DB954]/10 border border-emerald-300 dark:border-[#1DB954]/30 space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-[#1DB954] border-b border-emerald-200 dark:border-[#1DB954]/20 pb-2">
                <FileCheck2 className="w-4 h-4" />
                <span>اطلاعات تکمیلی قرارداد / فاکتور صادر شده</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* Contract / Invoice Number */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-[#B3B3B3] mb-1 flex items-center gap-1">
                    <Hash className="w-3 h-3 text-emerald-600 dark:text-[#1DB954]" />
                    <span>شماره قرارداد / فاکتور</span>
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={contractNumber}
                    onChange={(e) => setContractNumber(e.target.value)}
                    placeholder="مثلاً: CNT-1403/102 یا 89201"
                    className="w-full h-9 px-3 bg-white dark:bg-[#181818] rounded-lg text-xs text-slate-900 dark:text-white border border-slate-300 dark:border-[#2a2a2a] focus:border-emerald-500 dark:focus:border-[#1DB954] focus:outline-none font-mono"
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
                <div className="sm:col-span-2 lg:col-span-1">
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-[#B3B3B3] mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3 text-emerald-600 dark:text-[#1DB954]" />
                      <span>مبلغ نهایی (تومان)</span>
                    </span>
                    {contractAmount && (
                      <span className="text-[10px] text-emerald-700 dark:text-[#1DB954] font-mono font-bold">
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
                    className="w-full h-9 px-3 bg-white dark:bg-[#181818] rounded-lg text-xs text-slate-900 dark:text-white border border-slate-300 dark:border-[#2a2a2a] focus:border-emerald-500 dark:focus:border-[#1DB954] focus:outline-none font-mono font-bold text-left"
                  />
                </div>

                {/* Contract / Invoice Items */}
                <div className="col-span-1 sm:col-span-2 lg:col-span-3">
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-[#B3B3B3] mb-1 flex items-center gap-1">
                    <PackageCheck className="w-3 h-3 text-emerald-600 dark:text-[#1DB954]" />
                    <span>آیتم‌ها و اقلام قرارداد / فاکتور</span>
                  </label>
                  <input
                    type="text"
                    value={contractItems}
                    onChange={(e) => setContractItems(e.target.value)}
                    placeholder="شرح اقلام و خدمات (مثلاً: طراحی سایت فروشگاهی + درگاه پرداخت + هاست و پشتیبانی ۱ ساله)..."
                    className="w-full h-9 px-3 bg-white dark:bg-[#181818] rounded-lg text-xs text-slate-900 dark:text-white border border-slate-300 dark:border-[#2a2a2a] focus:border-emerald-500 dark:focus:border-[#1DB954] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Report Text */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-[#B3B3B3] mb-1.5">
              متن گزارش مذاکره <span className="text-red-500 dark:text-[#E22134]">*</span>
            </label>
            <textarea
              rows={4}
              required
              value={reportText}
              onChange={(e) => {
                setReportText(e.target.value);
                setFormError(null);
              }}
              placeholder="شرح دقیق مکالمه، پاسخ مشتری، نیازها و بندهای مورد مذاکره..."
              className="w-full p-3 bg-white dark:bg-[#282828] border border-slate-300 dark:border-transparent rounded-lg sm:rounded-md text-xs text-slate-900 dark:text-white resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500 leading-relaxed"
            />
          </div>

          {/* Actions - Responsive Full Width on Mobile, End-Aligned on Desktop */}
          <div className="pt-3.5 sm:pt-4 border-t border-slate-200 dark:border-[#282828] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto h-10 px-5 rounded-full border border-slate-300 hover:border-slate-400 dark:border-[#535353] dark:hover:border-white text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-[#B3B3B3] dark:hover:text-white transition-colors cursor-pointer text-center"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto h-10 px-6 rounded-full bg-[#1DB954] hover:bg-[#1ED760] text-black font-bold text-xs transition-all hover:scale-105 shadow-md shadow-[#1DB954]/20 cursor-pointer text-center flex items-center justify-center gap-1.5"
            >
              {saving ? 'در حال ثبت...' : 'ثبت و اعمال گزارش'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
