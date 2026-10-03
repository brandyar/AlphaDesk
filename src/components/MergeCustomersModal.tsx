import React, { useState, useMemo, useEffect } from 'react';
import {
  GitMerge,
  X,
  Search,
  CheckCircle2,
  Building,
  User,
  Phone,
  Calendar,
  AlertTriangle,
  ArrowLeft,
  Check,
  ShieldAlert,
} from 'lucide-react';
import { Customer, Personnel, CustomerReport } from '../types';
import { toPersianDigits, formatPersianDate } from '../utils';

interface MergeCustomersModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  reports: CustomerReport[];
  personnelList: Personnel[];
  initialSelectedCustomerIds?: string[];
  onMerge: (
    primaryCustomerId: string,
    mergedCustomerIds: string[],
    assignedMarketerId?: string,
    assignedMarketerName?: string,
    notes?: string
  ) => Promise<void>;
}

export const MergeCustomersModal: React.FC<MergeCustomersModalProps> = ({
  isOpen,
  onClose,
  customers,
  reports,
  personnelList,
  initialSelectedCustomerIds = [],
  onMerge,
}) => {
  if (!isOpen) return null;

  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedCustomerIds);
  const [primaryId, setPrimaryId] = useState<string>(initialSelectedCustomerIds[0] || '');
  const [selectedMarketerId, setSelectedMarketerId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [merging, setMerging] = useState<boolean>(false);
  const [step, setStep] = useState<'select' | 'confirm'>('select');

  useEffect(() => {
    if (initialSelectedCustomerIds.length > 0) {
      setSelectedIds(initialSelectedCustomerIds);
      setPrimaryId(initialSelectedCustomerIds[0]);
      const primaryCust = customers.find((c) => c.id === initialSelectedCustomerIds[0]);
      if (primaryCust?.assigned_marketer_id) {
        setSelectedMarketerId(primaryCust.assigned_marketer_id);
      }
    }
  }, [initialSelectedCustomerIds, customers]);

  // Selected customer objects
  const selectedCustomers = useMemo(() => {
    return customers.filter((c) => selectedIds.includes(c.id));
  }, [customers, selectedIds]);

  // Primary customer object
  const primaryCustomer = useMemo(() => {
    return selectedCustomers.find((c) => c.id === primaryId) || selectedCustomers[0];
  }, [selectedCustomers, primaryId]);

  // Ensure marketer defaults to primary customer's marketer
  useEffect(() => {
    if (primaryCustomer && !selectedMarketerId) {
      setSelectedMarketerId(primaryCustomer.assigned_marketer_id || '');
    }
  }, [primaryCustomer]);

  // Available customers filtered for selection
  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers.slice(0, 100);
    const q = searchQuery.toLowerCase();
    return customers.filter((c) => {
      const matchName = c.company_name?.toLowerCase().includes(q);
      const matchManager = c.manager_name?.toLowerCase().includes(q);
      const matchMarketer = c.assigned_marketer_name?.toLowerCase().includes(q);
      const matchPhone =
        c.mobile_numbers?.some((p) => p.includes(q)) ||
        c.landline_numbers?.some((p) => p.includes(q)) ||
        c.manager_phones?.some((p) => p.includes(q));
      return Boolean(matchName || matchManager || matchMarketer || matchPhone);
    });
  }, [customers, searchQuery]);

  const toggleSelectCustomer = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((item) => item !== id);
        if (primaryId === id && next.length > 0) {
          setPrimaryId(next[0]);
        }
        return next;
      } else {
        const next = [...prev, id];
        if (!primaryId) setPrimaryId(id);
        return next;
      }
    });
  };

  // Preview combined metrics
  const combinedStats = useMemo(() => {
    const allMobiles = new Set<string>();
    const allLandlines = new Set<string>();
    const allReports: { report: CustomerReport; customerName: string; marketerName: string }[] = [];

    selectedCustomers.forEach((cust) => {
      (cust.mobile_numbers || []).forEach((m) => m && allMobiles.add(m));
      (cust.manager_phones || []).forEach((m) => m && allMobiles.add(m));
      (cust.negotiator_phones || []).forEach((m) => m && allMobiles.add(m));
      (cust.landline_numbers || []).forEach((l) => l && allLandlines.add(l));

      const custReports = reports.filter((r) => r.customer_id === cust.id);
      custReports.forEach((r) => {
        allReports.push({
          report: r,
          customerName: cust.company_name,
          marketerName: r.negotiator_name,
        });
      });
    });

    return {
      mobileCount: allMobiles.size,
      landlineCount: allLandlines.size,
      reportsCount: allReports.length,
      reportsList: allReports,
    };
  }, [selectedCustomers, reports]);

  const handleExecuteMerge = async () => {
    if (selectedCustomers.length < 2) {
      alert('حداقل ۲ پرونده مشتری باید برای ادغام انتخاب شوند.');
      return;
    }
    if (!primaryCustomer) {
      alert('لطفاً پرونده مشتری اصلی (مقصد) را مشخص کنید.');
      return;
    }

    const mergedIds = selectedCustomers
      .map((c) => c.id)
      .filter((id) => id !== primaryCustomer.id);

    const chosenMarketer = personnelList.find((p) => p.id === selectedMarketerId);

    setMerging(true);
    try {
      await onMerge(
        primaryCustomer.id,
        mergedIds,
        chosenMarketer?.id,
        chosenMarketer?.name,
        notes
      );
      onClose();
    } catch (err: any) {
      alert('خطا در ادغام پرونده‌ها: ' + err.message);
    } finally {
      setMerging(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
      <div
        className="bg-[#181818] border border-[#282828] w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden my-4 flex flex-col max-h-[90vh]"
        dir="rtl"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#121212] border-b border-[#282828] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#1DB954]/15 text-[#1DB954] flex items-center justify-center shrink-0">
              <GitMerge className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <span>ادغام پرونده‌های مشتریان تکراری</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1DB954]/20 text-[#1DB954] font-bold">
                  ویژه مدیر
                </span>
              </h3>
              <p className="text-xs text-[#A7A7A7] mt-0.5">
                تجمیع شماره‌ها، انتقال تاریخچه مذاکرات و تعیین بازاریاب نهایی پرونده
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#242424] hover:bg-[#333] flex items-center justify-center text-[#A7A7A7] hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {step === 'select' ? (
          <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
            {/* Explanatory banner */}
            <div className="p-3 bg-[#1DB954]/10 border border-[#1DB954]/20 rounded-2xl flex items-start gap-2.5 text-xs text-[#d0d0d0] leading-relaxed">
              <CheckCircle2 className="w-4 h-4 text-[#1DB954] shrink-0 mt-0.5" />
              <span>
                مشتریانی که دارای شماره‌های مختلف بوده و توسط بازاریاب‌های جداگانه پیگیری شده‌اند را انتخاب کنید. با ادغام، تمام شماره‌ها و گزارش‌های هر دو بازاریاب در پرونده اصلی تجمیع شده و بازاریاب منتخب به کل سوابق دسترسی خواهد داشت.
              </span>
            </div>

            {/* Selected Customers list */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-white">
                <span>مشتریان انتخاب‌شده جهت ادغام ({toPersianDigits(selectedCustomers.length)} پرونده):</span>
                {selectedCustomers.length > 0 && (
                  <span className="text-[11px] text-[#A7A7A7]">
                    روی دایره کلیک کنید تا به عنوان پرونده اصلی تعیین شود
                  </span>
                )}
              </div>

              {selectedCustomers.length === 0 ? (
                <div className="p-6 text-center rounded-2xl bg-[#121212] border border-dashed border-[#333] text-xs text-[#777]">
                  هنوز مشتری‌ای انتخاب نشده است. از لیست زیر حداقل ۲ مشتری را تیک بزنید.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {selectedCustomers.map((cust) => {
                    const isPrimary = primaryId === cust.id;
                    const custReportsCount = reports.filter((r) => r.customer_id === cust.id).length;

                    return (
                      <div
                        key={cust.id}
                        className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                          isPrimary
                            ? 'bg-[#1DB954]/10 border-[#1DB954] shadow-md shadow-[#1DB954]/10'
                            : 'bg-[#1e1e1e] border-[#333] hover:border-[#444]'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <button
                            type="button"
                            onClick={() => setPrimaryId(cust.id)}
                            className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all shrink-0 ${
                              isPrimary
                                ? 'bg-[#1DB954] border-[#1DB954] text-black'
                                : 'border-[#666] hover:border-white'
                            }`}
                            title="انتخاب به عنوان پرونده اصلی"
                          >
                            {isPrimary && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </button>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-white truncate">
                                {cust.company_name}
                              </span>
                              {isPrimary && (
                                <span className="text-[10px] px-2 py-0.2 rounded-full bg-[#1DB954] text-black font-bold shrink-0">
                                  پرونده اصلی (مقصد)
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-[#A7A7A7] mt-0.5 flex items-center gap-3">
                              <span className="flex items-center gap-1 text-[#1DB954]">
                                <User className="w-3 h-3" />
                                <span>{cust.assigned_marketer_name || 'بدون بازاریاب'}</span>
                              </span>
                              <span>· {toPersianDigits(custReportsCount)} گزارش</span>
                              <span>· {cust.city}</span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleSelectCustomer(cust.id)}
                          className="w-7 h-7 rounded-full bg-[#282828] hover:bg-[#E22134]/20 hover:text-[#E22134] text-[#888] flex items-center justify-center transition-colors shrink-0"
                          title="حذف از لیست ادغام"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Search & Add more customers */}
            <div className="space-y-2 pt-2 border-t border-[#282828]">
              <label className="block text-xs font-semibold text-[#B3B3B3]">
                جستجو و انتخاب پرونده‌های مشتریان دیگر برای ادغام:
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="جستجوی نام شرکت، نام مدیر، نام بازاریاب یا شماره تماس..."
                  className="w-full h-10 bg-[#121212] rounded-xl pl-3 pr-9 text-xs text-white placeholder-[#777] border border-[#2a2a2a] focus:outline-none focus:border-[#1DB954]"
                />
                <Search className="w-4 h-4 text-[#777] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Customer Selector Cards */}
              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                {filteredCustomers.map((c) => {
                  const isChecked = selectedIds.includes(c.id);
                  const phone = c.manager_phones?.[0] || c.mobile_numbers?.[0] || '-';

                  return (
                    <div
                      key={c.id}
                      onClick={() => toggleSelectCustomer(c.id)}
                      className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 cursor-pointer select-none ${
                        isChecked
                          ? 'bg-[#1a2e1e] border-[#1DB954]/50'
                          : 'bg-[#181818] border-[#282828] hover:bg-[#202020]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="w-4 h-4 rounded accent-[#1DB954] cursor-pointer shrink-0"
                        />
                        <div className="min-w-0">
                          <span className="font-bold text-xs text-white truncate block">
                            {c.company_name}
                          </span>
                          <span className="text-[10px] text-[#888]">
                            بازاریاب: {c.assigned_marketer_name || 'نامشخص'} · {phone}
                          </span>
                        </div>
                      </div>

                      <span className="text-[10px] px-2 py-0.5 rounded bg-[#242424] text-[#aaa] shrink-0 font-mono">
                        {c.city}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Target Marketer Assignment */}
            <div className="p-4 rounded-2xl bg-[#121212] border border-[#282828] space-y-3">
              <label className="block text-xs font-bold text-white flex items-center gap-1.5">
                <User className="w-4 h-4 text-[#1DB954]" />
                <span>تعیین بازاریاب مالک پرونده پس از ادغام:</span>
              </label>
              <select
                value={selectedMarketerId}
                onChange={(e) => setSelectedMarketerId(e.target.value)}
                className="w-full h-10 px-3 bg-[#242424] rounded-xl text-xs text-white border border-[#383838] focus:outline-none focus:border-[#1DB954]"
              >
                {personnelList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.role === 'admin' ? 'مدیر' : 'کارشناس بازاریابی'})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-[#888]">
                بازاریاب انتخاب‌شده به عنوان مالک نهایی تعیین شده و تمام سوابق و شماره‌های هر دو پرونده برای وی در دسترس خواهد بود.
              </p>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-[#B3B3B3] mb-1">
                توضیحات و علت ادغام (اختیاری):
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="مثلاً: هر دو شماره متعلق به کارخانه سپهر بوده و ادغام شد..."
                className="w-full h-9 px-3 bg-[#121212] rounded-xl text-xs text-white border border-[#282828] focus:outline-none focus:border-[#1DB954]"
              />
            </div>
          </div>
        ) : (
          /* Confirmation Step */
          <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
            <div className="p-4 rounded-2xl bg-[#F59B23]/10 border border-[#F59B23]/30 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[#F59B23] shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs">
                <h4 className="font-bold text-white">تأیید نهایی ادغام پرونده‌ها</h4>
                <p className="text-[#d0d0d0] leading-relaxed">
                  با تأیید ادغام، پرونده‌های فرعی حذف شده و اطلاعات به صورت یکپارچه در پرونده اصلی تجمیع می‌گردد.
                </p>
              </div>
            </div>

            {/* Summary preview */}
            <div className="p-4 rounded-2xl bg-[#121212] border border-[#282828] space-y-3">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-[#222]">
                <span className="text-[#A7A7A7]">پرونده اصلی نهایی:</span>
                <span className="font-bold text-white text-sm">{primaryCustomer?.company_name}</span>
              </div>
              <div className="flex items-center justify-between text-xs pb-2 border-b border-[#222]">
                <span className="text-[#A7A7A7]">بازاریاب مسئول جدید:</span>
                <span className="font-bold text-[#1DB954]">
                  {personnelList.find((p) => p.id === selectedMarketerId)?.name || primaryCustomer?.assigned_marketer_name}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs pb-2 border-b border-[#222]">
                <span className="text-[#A7A7A7]">تعداد کل شماره‌های تجمیع‌شده:</span>
                <span className="font-bold text-white font-mono">
                  {toPersianDigits(combinedStats.mobileCount)} همراه · {toPersianDigits(combinedStats.landlineCount)} ثابت
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#A7A7A7]">تعداد کل گزارش‌های منتقل‌شده:</span>
                <span className="font-bold text-white font-mono">
                  {toPersianDigits(combinedStats.reportsCount)} گزارش مذاکره
                </span>
              </div>
            </div>

            {/* Transferred reports list preview */}
            {combinedStats.reportsList.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-white">پیش‌نمایش گزارش‌های منتقل‌شده:</span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {combinedStats.reportsList.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-[#1c1c1c] border border-[#2c2c2c] text-xs flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <span className="font-semibold text-white block truncate">
                          {item.report.report_text.slice(0, 70)}...
                        </span>
                        <span className="text-[10px] text-[#888]">
                          ثبت‌شده توسط: <strong className="text-[#1DB954]">{item.marketerName}</strong> ({item.customerName})
                        </span>
                      </div>
                      <span className="text-[10px] text-[#777] font-mono shrink-0">
                        {formatPersianDate(item.report.date_created)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="p-4 bg-[#121212] border-t border-[#282828] flex items-center justify-between gap-3">
          {step === 'select' ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="h-10 px-5 rounded-full border border-[#444] text-xs font-semibold text-[#A7A7A7] hover:text-white"
              >
                انصراف
              </button>
              <button
                type="button"
                disabled={selectedCustomers.length < 2 || !primaryCustomer}
                onClick={() => setStep('confirm')}
                className="h-10 px-6 rounded-full bg-[#1DB954] hover:bg-[#1ED760] disabled:opacity-50 disabled:pointer-events-none text-black font-bold text-xs transition-all flex items-center gap-1.5 shadow-md shadow-[#1DB954]/20"
              >
                <span>مرحله بعد: پیش‌نمایش و تأیید</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep('select')}
                className="h-10 px-5 rounded-full border border-[#444] text-xs font-semibold text-[#A7A7A7] hover:text-white"
              >
                بازگشت به انتخاب
              </button>
              <button
                type="button"
                disabled={merging}
                onClick={handleExecuteMerge}
                className="h-10 px-7 rounded-full bg-[#1DB954] hover:bg-[#1ED760] text-black font-bold text-xs transition-all hover:scale-105 shadow-md shadow-[#1DB954]/20 flex items-center gap-2"
              >
                <GitMerge className="w-4 h-4 stroke-[3]" />
                <span>{merging ? 'در حال ادغام پرونده‌ها...' : 'تأیید و ادغام نهایی'}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
