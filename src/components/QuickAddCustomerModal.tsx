import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  PhoneCall,
  Plus,
  Trash2,
  User,
  Building2,
  AlertTriangle,
  AlertCircle,
  Star,
  Calendar,
  FileText,
  UserCheck,
  CheckCircle2,
  Phone,
} from 'lucide-react';
import {
  Customer,
  CustomerContact,
  CustomerReport,
  Personnel,
  AuthUser,
  ChannelType,
  DuplicateCheckResult,
} from '../types';
import { checkDuplicateContact } from '../api';
import { PersianDatePicker } from './PersianDatePicker';
import { FreePoolDuplicateAlert } from './FreePoolDuplicateAlert';
import { toPersianDigits, isPersonnelActive } from '../utils';

interface QuickPhoneRow {
  channel_type: 'mobile' | 'landline';
  value: string;
  is_primary: boolean;
  duplicateWarning?: DuplicateCheckResult | null;
  isChecking?: boolean;
}

export interface QuickAddCustomerPayload {
  customerPayload: Partial<Customer> & { assignment_duration_days?: number };
  initialReportPayload: Partial<CustomerReport>;
}

interface QuickAddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuickAdd: (payload: QuickAddCustomerPayload) => Promise<void>;
  onClaimFreeCustomer?: (customerId: string, targetMarketerId?: string, targetMarketerName?: string) => Promise<void>;
  personnelList: Personnel[];
  currentPersonnel: Personnel | null;
  currentUser?: AuthUser | null;
  isAdmin?: boolean;
  initialPhone?: string;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const getTomorrowDefaultIso = (): string => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setSeconds(0, 0);
  return d.toISOString();
};

const normalizeInputDigits = (val: string): string => {
  const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
  const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
  return val
    .replace(/[۰-۹]/g, (w) => String(persianDigits.indexOf(w)))
    .replace(/[٠-٩]/g, (w) => String(arabicDigits.indexOf(w)));
};

export const QuickAddCustomerModal: React.FC<QuickAddCustomerModalProps> = ({
  isOpen,
  onClose,
  onQuickAdd,
  onClaimFreeCustomer,
  personnelList,
  currentPersonnel,
  currentUser,
  isAdmin,
  initialPhone,
  showToast,
}) => {
  const userIsAdmin = Boolean(
    isAdmin ||
      currentUser?.is_admin ||
      currentUser?.app_role === 'admin' ||
      currentUser?.app_role === 'sales_manager' ||
      currentPersonnel?.role === 'admin' ||
      currentPersonnel?.role === 'sales_manager'
  );

  const [personName, setPersonName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phones, setPhones] = useState<QuickPhoneRow[]>([
    { channel_type: 'mobile', value: '', is_primary: true },
  ]);
  const [nextFollowupDate, setNextFollowupDate] = useState<string>(getTomorrowDefaultIso);
  const [notes, setNotes] = useState('');
  const [assignedMarketerId, setAssignedMarketerId] = useState<string>('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [transferringCustomerId, setTransferringCustomerId] = useState<string | null>(null);

  const isSubmittingRef = useRef(false);
  const debounceTimers = useRef<{ [key: number]: ReturnType<typeof setTimeout> }>({});

  useEffect(() => {
    if (isOpen) {
      const normalizedInitPhone = initialPhone ? normalizeInputDigits(initialPhone).trim() : '';
      setPersonName('');
      setBusinessName('');
      setPhones([{ channel_type: 'mobile', value: normalizedInitPhone, is_primary: true }]);
      setNextFollowupDate(getTomorrowDefaultIso());
      setNotes('');
      setSubmitError(null);
      const firstActive = personnelList.find((p) => isPersonnelActive(p));
      setAssignedMarketerId(
        currentPersonnel?.id || currentUser?.id || firstActive?.id || ''
      );

      if (normalizedInitPhone.length >= 4) {
        setPhones([{ channel_type: 'mobile', value: normalizedInitPhone, is_primary: true, isChecking: true }]);
        checkDuplicateContact(normalizedInitPhone, 'mobile')
          .then((res) => {
            setPhones((prev) => {
              const copy = [...prev];
              if (copy[0]) {
                copy[0] = {
                  ...copy[0],
                  duplicateWarning: res.isDuplicate ? res : null,
                  isChecking: false,
                };
              }
              return copy;
            });
          })
          .catch(() => {
            setPhones((prev) => {
              const copy = [...prev];
              if (copy[0]) {
                copy[0] = { ...copy[0], isChecking: false };
              }
              return copy;
            });
          });
      }
    }
    return () => {
      Object.values(debounceTimers.current).forEach((t) => clearTimeout(t));
      debounceTimers.current = {};
    };
  }, [isOpen, initialPhone, currentPersonnel?.id, currentUser?.id, personnelList]);

  if (!isOpen) return null;

  const handlePhoneChange = (
    index: number,
    field: 'value' | 'channel_type',
    val: string
  ) => {
    setSubmitError(null);
    setPhones((prev) => {
      const copy = [...prev];
      if (!copy[index]) return prev;
      copy[index] = {
        ...copy[index],
        [field]: field === 'value' ? normalizeInputDigits(val) : (val as 'mobile' | 'landline'),
      };
      return copy;
    });

    if (debounceTimers.current[index]) {
      clearTimeout(debounceTimers.current[index]);
    }

    const currentRow = phones[index];
    const targetVal = field === 'value' ? normalizeInputDigits(val) : currentRow?.value || '';
    const targetType: ChannelType =
      field === 'channel_type'
        ? (val as 'mobile' | 'landline')
        : currentRow?.channel_type || 'mobile';

    if (!targetVal || targetVal.trim().length < 4) {
      setPhones((prev) => {
        const copy = [...prev];
        if (copy[index]) {
          copy[index] = { ...copy[index], duplicateWarning: null, isChecking: false };
        }
        return copy;
      });
      return;
    }

    setPhones((prev) => {
      const copy = [...prev];
      if (copy[index]) {
        copy[index] = { ...copy[index], isChecking: true };
      }
      return copy;
    });

    debounceTimers.current[index] = setTimeout(async () => {
      try {
        const res = await checkDuplicateContact(targetVal.trim(), targetType);
        setPhones((prev) => {
          const copy = [...prev];
          if (copy[index]) {
            copy[index] = {
              ...copy[index],
              duplicateWarning: res.isDuplicate ? res : null,
              isChecking: false,
            };
          }
          return copy;
        });
      } catch {
        setPhones((prev) => {
          const copy = [...prev];
          if (copy[index]) {
            copy[index] = { ...copy[index], isChecking: false };
          }
          return copy;
        });
      }
    }, 400);
  };

  const addPhoneRow = () => {
    setSubmitError(null);
    setPhones((prev) => [
      ...prev,
      { channel_type: 'mobile', value: '', is_primary: prev.length === 0 },
    ]);
  };

  const removePhoneRow = (index: number) => {
    if (phones.length <= 1) return;
    setSubmitError(null);
    setPhones((prev) => {
      const filtered = prev.filter((_, i) => i !== index);
      if (filtered.length > 0 && !filtered.some((p) => p.is_primary)) {
        filtered[0] = { ...filtered[0], is_primary: true };
      }
      return filtered;
    });
  };

  const setPrimaryPhone = (index: number) => {
    setPhones((prev) =>
      prev.map((p, i) => ({
        ...p,
        is_primary: i === index,
      }))
    );
  };

  const isFreePoolDup = (dup?: DuplicateCheckResult | null) =>
    Boolean(dup && (dup.isFreePool || dup.conflictType === 'expired'));

  const hasBlockerConflict = phones.some(
    (p) =>
      p.duplicateWarning &&
      (p.duplicateWarning.conflictType === 'active_marketer' || isFreePoolDup(p.duplicateWarning))
  );

  const handleConfirmOwnershipTransfer = async (customerId: string) => {
    if (!onClaimFreeCustomer || transferringCustomerId) return;
    setSubmitError(null);
    setTransferringCustomerId(customerId);
    try {
      let targetId = currentPersonnel?.id || currentUser?.id;
      let targetName = currentPersonnel?.name || currentUser?.name;
      if (userIsAdmin && assignedMarketerId) {
        const selected = personnelList.find((p) => p.id === assignedMarketerId);
        if (selected) {
          targetId = selected.id;
          targetName = selected.name;
        }
      }
      await onClaimFreeCustomer(customerId, targetId, targetName);
    } catch (err: any) {
      const msg = err?.message || 'خطا در انتقال مالکیت پرونده';
      setSubmitError(msg);
      showToast(msg, 'error');
    } finally {
      setTransferringCustomerId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || isSubmittingRef.current) return;

    setSubmitError(null);
    const cleanPerson = personName.trim();
    const cleanBusiness = businessName.trim();

    if (!cleanPerson && !cleanBusiness) {
      setSubmitError('لطفاً حداقل یکی از فیلدهای «نام شخص» یا «نام کسب‌وکار» را وارد کنید.');
      return;
    }

    const filledPhones = phones
      .map((p) => ({
        ...p,
        value: normalizeInputDigits(p.value).trim(),
      }))
      .filter((p) => p.value.length > 0);

    if (filledPhones.length === 0) {
      setSubmitError('حداقل یک شماره تماس معتبر وارد کنید.');
      return;
    }

    const seenPhones = new Set<string>();
    for (const p of filledPhones) {
      const cleanDigits = p.value.replace(/[\s\-()]/g, '');
      if (cleanDigits.length < 5) {
        setSubmitError(`شماره تماس «${p.value}» کوتاه و نامعتبر است.`);
        return;
      }
      const key = `${p.channel_type}:${cleanDigits}`;
      if (seenPhones.has(key)) {
        setSubmitError(`شماره تماس «${p.value}» بیش از یک بار وارد شده است.`);
        return;
      }
      seenPhones.add(key);
    }

    const activeConflicts = phones.filter(
      (p) => p.duplicateWarning && p.duplicateWarning.conflictType === 'active_marketer'
    );
    if (activeConflicts.length > 0) {
      const conflictMsg = activeConflicts
        .map(
          (c) =>
            `شماره «${c.value}» در اختیار بازاریاب «${c.duplicateWarning?.matchedCustomer?.assigned_marketer_name}» است.`
        )
        .join(' | ');
      setSubmitError(`خطای تداخل شماره: ${conflictMsg}`);
      return;
    }

    const freePoolConflicts = phones.filter((p) => isFreePoolDup(p.duplicateWarning));
    if (freePoolConflicts.length > 0) {
      setSubmitError(
        'این شماره از قبل در بخش مشتریان آزاد وجود دارد. لطفاً از دکمه «تأیید انتقال مالکیت و مشاهده گزارش‌های قبلی» در کادر زیر شماره استفاده کنید.'
      );
      return;
    }

    if (!nextFollowupDate) {
      setSubmitError('لطفاً تاریخ و ساعت پیگیری بعدی را انتخاب کنید.');
      return;
    }

    const followupTime = new Date(nextFollowupDate).getTime();
    if (isNaN(followupTime)) {
      setSubmitError('فرمت تاریخ و ساعت پیگیری بعدی نامعتبر است.');
      return;
    }
    if (followupTime <= Date.now() - 60000) {
      setSubmitError('تاریخ و ساعت پیگیری بعدی نمی‌تواند در گذشته باشد.');
      return;
    }

    isSubmittingRef.current = true;
    setSubmitting(true);

    try {
      let finalMarketerId: string | null =
        currentPersonnel?.id || currentUser?.id || null;
      let finalMarketerName: string =
        currentPersonnel?.name || currentUser?.name || 'کارشناس فروش';

      if (userIsAdmin && assignedMarketerId) {
        const selected = personnelList.find((p) => p.id === assignedMarketerId);
        if (selected) {
          finalMarketerId = selected.id;
          finalMarketerName = selected.name;
        }
      }

      const displayLabel = cleanPerson || cleanBusiness;
      const companyTitle = cleanBusiness || cleanPerson;

      const cleanContacts: CustomerContact[] = filledPhones.map((p, idx) => ({
        id: undefined as any,
        customer_id: '',
        channel_type: p.channel_type,
        value: p.value,
        normalized_value: p.value,
        contact_name: displayLabel,
        contact_role: p.is_primary ? 'شماره اصلی' : `شماره تماس ${toPersianDigits(idx + 1)}`,
        is_primary: p.is_primary,
        notes: 'ثبت شده از طریق افزودن سریع',
      }));

      const mobiles = cleanContacts
        .filter((c) => c.channel_type === 'mobile')
        .map((c) => c.value);
      const landlines = cleanContacts
        .filter((c) => c.channel_type === 'landline')
        .map((c) => c.value);

      const primaryContact =
        cleanContacts.find((c) => c.is_primary) || cleanContacts[0];

      const cleanNotes = notes.trim();
      const baseQuickNote = 'این مشتری به صورت افزودن سریع اضافه شده است.';
      const fullReportText = cleanNotes
        ? `${baseQuickNote}\nتوضیحات: ${cleanNotes}`
        : baseQuickNote;

      const nextFollowupIso = new Date(nextFollowupDate).toISOString();

      await onQuickAdd({
        customerPayload: {
          company_name: companyTitle,
          manager_name: cleanPerson,
          negotiator_name: cleanPerson,
          manager_phones: mobiles.slice(0, 2),
          negotiator_phones: mobiles.slice(1, 3),
          mobile_numbers: mobiles,
          landline_numbers: landlines,
          telegram_phone: mobiles[0] || '',
          contacts: cleanContacts,
          interview_status: 'افزودن سریع',
          interview_report: fullReportText,
          interview_score: 7,
          next_followup_date: nextFollowupIso,
          assigned_marketer_id: finalMarketerId,
          assigned_marketer_name: finalMarketerName,
          assignment_duration_days: 7,
          status: 'تماس برقرار نشده',
        },
        initialReportPayload: {
          negotiator_name:
            currentPersonnel?.name || currentUser?.name || finalMarketerName,
          customer_negotiator_name: displayLabel,
          negotiation_phone: primaryContact.value,
          report_text: fullReportText,
          negotiation_score: 7,
          next_followup_date: nextFollowupIso,
          negotiation_status: 'تماس برقرار نشده',
          created_by: currentPersonnel?.id || currentUser?.id,
        },
      });

      onClose();
    } catch (err: any) {
      const msg = err?.message || 'خطا در ثبت سریع مشتری';
      setSubmitError(msg);
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center px-2.5 sm:px-4 pt-[calc(var(--safe-area-top)+0.5rem)] pb-[calc(var(--safe-area-bottom)+0.5rem)] bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-[#181818] border border-slate-200 dark:border-[#282828] w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[calc(100dvh-var(--safe-area-top)-var(--safe-area-bottom)-1.5rem)] flex flex-col text-slate-900 dark:text-white animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-[#121212] border-b border-slate-200 dark:border-[#282828] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-[#1DB954]/15 border border-emerald-300 dark:border-[#1DB954]/30 flex items-center justify-center text-emerald-700 dark:text-[#1DB954] shrink-0">
              <PhoneCall className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                افزودن سریع شماره (ثبت مستقیم مشتری)
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-[#A7A7A7] truncate">
                ثبت فوری پرونده در لیست مشتریان همراه با گزارش اولیه و موعد پیگیری
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="submit"
              form="quick-add-customer-form"
              disabled={submitting || hasBlockerConflict}
              className="px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-full bg-[#1DB954] hover:bg-[#1ED760] disabled:bg-slate-300 dark:disabled:bg-[#333] disabled:text-slate-500 dark:disabled:text-[#666] text-black text-xs font-bold transition-all shadow-md shadow-[#1DB954]/20 flex items-center gap-1.5 cursor-pointer"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>{submitting ? 'در حال ثبت...' : 'ثبت سریع مشتری'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 dark:bg-[#282828] dark:hover:bg-[#333] flex items-center justify-center dark:text-[#B3B3B3] dark:hover:text-white transition-colors shrink-0 cursor-pointer"
              aria-label="بستن"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form id="quick-add-customer-form" onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {submitError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 dark:bg-rose-950/40 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 font-bold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-[#E22134]" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Person Name & Business Name */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#141414] border border-slate-200 dark:border-[#282828] space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-800 dark:text-white">
                مشخصات مشتری
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-[#1DB954]/15 dark:text-[#1DB954] border border-emerald-200 dark:border-[#1DB954]/30 font-semibold">
                وارد کردن حداقل یکی الزامی است
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-[#B3B3B3] mb-1 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-emerald-600 dark:text-[#1DB954]" />
                  <span>نام شخص</span>
                </label>
                <input
                  type="text"
                  autoFocus
                  value={personName}
                  onChange={(e) => {
                    setPersonName(e.target.value);
                    setSubmitError(null);
                  }}
                  placeholder="مثلاً: علی کریمی"
                  className="w-full h-10 px-3 bg-white dark:bg-[#242424] border border-slate-300 dark:border-[#333] rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#777] focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:focus:ring-[#1DB954]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-[#B3B3B3] mb-1 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-emerald-600 dark:text-[#1DB954]" />
                  <span>نام کسب‌وکار / فروشگاه</span>
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => {
                    setBusinessName(e.target.value);
                    setSubmitError(null);
                  }}
                  placeholder="مثلاً: فروشگاه آفتاب"
                  className="w-full h-10 px-3 bg-white dark:bg-[#242424] border border-slate-300 dark:border-[#333] rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#777] focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:focus:ring-[#1DB954]"
                />
              </div>
            </div>
          </div>

          {/* Dynamic Phone Numbers List */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-[#1DB954]" />
                <span>شماره‌های تماس</span>
                <span className="text-red-500 dark:text-[#E22134]">*</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-[#282828] text-slate-600 dark:text-[#A7A7A7]">
                  {toPersianDigits(phones.length)}
                </span>
              </label>

              <button
                type="button"
                onClick={addPhoneRow}
                className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-[#1DB954]/15 dark:hover:bg-[#1DB954]/25 dark:text-[#1DB954] border border-emerald-200 dark:border-[#1DB954]/30 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>افزودن شماره دیگر</span>
              </button>
            </div>

            <div className="space-y-2">
              {phones.map((row, idx) => {
                const isBlocker =
                  row.duplicateWarning &&
                  row.duplicateWarning.conflictType === 'active_marketer';

                return (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-xl border transition-colors ${
                      isBlocker
                        ? 'bg-red-50 dark:bg-red-950/30 border-red-400 dark:border-red-500/60'
                        : row.duplicateWarning
                        ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-400 dark:border-amber-500/50'
                        : 'bg-slate-50 dark:bg-[#141414] border-slate-200 dark:border-[#282828]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <select
                        value={row.channel_type}
                        onChange={(e) =>
                          handlePhoneChange(idx, 'channel_type', e.target.value)
                        }
                        aria-label="نوع شماره"
                        className="h-9 px-2 bg-white dark:bg-[#242424] border border-slate-300 dark:border-[#333] rounded-lg text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 shrink-0"
                      >
                        <option value="mobile">موبایل</option>
                        <option value="landline">ثابت</option>
                      </select>

                      <div className="relative flex-1 min-w-0">
                        <input
                          type="tel"
                          dir="ltr"
                          value={row.value}
                          onChange={(e) =>
                            handlePhoneChange(idx, 'value', e.target.value)
                          }
                          placeholder={
                            row.channel_type === 'mobile'
                              ? '09123456789'
                              : '02188776655'
                          }
                          className={`w-full h-9 px-3 bg-white dark:bg-[#242424] border rounded-lg text-xs text-slate-900 dark:text-white font-mono focus:outline-none ${
                            isBlocker
                              ? 'border-red-500 ring-1 ring-red-500'
                              : 'border-slate-300 dark:border-[#333] focus:ring-1 focus:ring-emerald-500 dark:focus:ring-[#1DB954]'
                          }`}
                        />
                        {row.isChecking && (
                          <span className="absolute right-2.5 top-2.5 text-[10px] text-emerald-600 dark:text-[#1DB954]">
                            بررسی...
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setPrimaryPhone(idx)}
                        className={`h-9 px-2 rounded-lg flex items-center gap-1 text-[11px] transition-colors shrink-0 cursor-pointer ${
                          row.is_primary
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-[#1DB954]/20 dark:text-[#1DB954] border border-emerald-300 dark:border-[#1DB954]/40 font-bold'
                            : 'bg-white hover:bg-slate-100 text-slate-500 dark:bg-[#242424] dark:text-[#A7A7A7] dark:hover:text-white border border-slate-200 dark:border-[#333]'
                        }`}
                        title={
                          row.is_primary
                            ? 'شماره اصلی'
                            : 'تنظیم به عنوان شماره اصلی'
                        }
                      >
                        <Star
                          className={`w-3.5 h-3.5 ${
                            row.is_primary ? 'fill-current' : ''
                          }`}
                        />
                        <span className="hidden sm:inline">اصلی</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => removePhoneRow(idx)}
                        disabled={phones.length <= 1}
                        className="w-9 h-9 rounded-lg bg-white hover:bg-red-50 text-slate-400 hover:text-red-600 dark:bg-[#242424] dark:hover:bg-red-950/50 dark:text-[#A7A7A7] dark:hover:text-red-400 border border-slate-200 dark:border-[#333] flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0 cursor-pointer"
                        title="حذف شماره"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {row.duplicateWarning &&
                      (isFreePoolDup(row.duplicateWarning) && onClaimFreeCustomer ? (
                        <FreePoolDuplicateAlert
                          duplicate={row.duplicateWarning}
                          onConfirmTransfer={handleConfirmOwnershipTransfer}
                          isTransferring={
                            transferringCustomerId === row.duplicateWarning.matchedCustomer?.id
                          }
                          targetMarketerName={
                            userIsAdmin && assignedMarketerId
                              ? personnelList.find((p) => p.id === assignedMarketerId)?.name
                              : currentPersonnel?.name || currentUser?.name
                          }
                        />
                      ) : (
                        <div
                          className={`mt-2 p-2 rounded-lg text-[11px] flex items-start gap-2 ${
                            isBlocker
                              ? 'bg-red-100 dark:bg-red-500/15 text-red-800 dark:text-red-300'
                              : 'bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300'
                          }`}
                        >
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold">
                              {isBlocker ? 'تداخل با بازاریاب فعال: ' : 'شماره موجود: '}
                            </span>
                            <span>{row.duplicateWarning.message}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Next Follow-up Date & Time (Default: Tomorrow, Editable) */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#141414] border border-slate-200 dark:border-[#282828] space-y-2">
            <PersianDatePicker
              label="تاریخ و ساعت پیگیری بعدی (پیش‌فرض: فردا - قابل ویرایش)"
              value={nextFollowupDate}
              onChange={(iso) => {
                setNextFollowupDate(iso);
                setSubmitError(null);
              }}
              showTime={true}
              disablePast={true}
              showQuickPresets={true}
              required={true}
            />
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-[#888]">
              <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-[#1DB954] shrink-0" />
              <span>
                روی کادر بالا کلیک کنید تا تاریخ و ساعت پیگیری را به دلخواه تغییر دهید.
              </span>
            </div>
          </div>

          {/* Marketer Assignment (Admins can pick; staff assigned to themselves) */}
          {userIsAdmin ? (
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-[#B3B3B3] mb-1.5 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-[#1DB954]" />
                <span>بازاریاب مسئول پرونده</span>
              </label>
              <select
                value={assignedMarketerId}
                onChange={(e) => setAssignedMarketerId(e.target.value)}
                className="w-full h-10 px-3 bg-white dark:bg-[#242424] border border-slate-300 dark:border-[#333] rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:focus:ring-[#1DB954]"
              >
                {personnelList.filter((p) => isPersonnelActive(p)).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-[#1DB954]/10 border border-emerald-200 dark:border-[#1DB954]/25 flex items-center justify-between text-xs">
              <span className="text-slate-600 dark:text-[#B3B3B3] flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-[#1DB954]" />
                <span>بازاریاب مسئول پرونده:</span>
              </span>
              <span className="font-bold text-emerald-700 dark:text-[#1DB954]">
                {currentPersonnel?.name || currentUser?.name || 'کاربر جاری'}
              </span>
            </div>
          )}

          {/* Optional Initial Notes */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-[#B3B3B3] mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-[#1DB954]" />
              <span>یادداشت تکمیلی (اختیاری - در گزارش اولیه ثبت می‌شود)</span>
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="در صورت نیاز توضیحات اولیه تماس را اینجا بنویسید..."
              className="w-full p-2.5 bg-white dark:bg-[#242424] border border-slate-300 dark:border-[#333] rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#777] focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:focus:ring-[#1DB954] resize-none"
            />
          </div>

          {/* Info Note about Automatic Initial Report */}
          <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/25 text-[11px] text-blue-700 dark:text-blue-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>
              با ثبت، پرونده مستقیم در لیست مشتریان ایجاد شده و گزارش اولیه «افزودن سریع» برای آن ثبت می‌شود.
            </span>
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-slate-200 dark:border-[#282828] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-[#282828] dark:hover:bg-[#333] dark:text-[#B3B3B3] dark:hover:text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={submitting || hasBlockerConflict}
              className="px-6 py-2 rounded-full bg-[#1DB954] hover:bg-[#1ED760] disabled:bg-slate-300 dark:disabled:bg-[#333] disabled:text-slate-500 dark:disabled:text-[#666] text-black text-xs font-bold transition-all shadow-md shadow-[#1DB954]/20 flex items-center gap-1.5 cursor-pointer"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>{submitting ? 'در حال ثبت مشتری...' : 'ثبت سریع مشتری'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
