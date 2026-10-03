import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Plus,
  Trash2,
  Building,
  Phone,
  Send,
  Instagram,
  Mail,
  Globe,
  User,
  Calendar,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Star,
  MessageSquare,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import { Customer, CustomerContact, Personnel, NegotiationStatus, ChannelType, DuplicateCheckResult, AuthUser } from '../types';
import { checkDuplicateContact } from '../api';
import { PersianDatePicker } from './PersianDatePicker';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (customerData: Partial<Customer> & { assignment_duration_days?: number }) => Promise<void>;
  editingCustomer?: Customer | null;
  personnelList: Personnel[];
  currentPersonnel?: Personnel | null;
  currentUser?: AuthUser | null;
  isAdmin?: boolean;
  prefilledPhone?: string;
  prefilledName?: string;
  prefilledNotes?: string;
}

interface ContactRow {
  id?: string;
  channel_type: ChannelType;
  value: string;
  contact_name: string;
  contact_role: string;
  is_primary: boolean;
  notes: string;
  duplicateWarning?: DuplicateCheckResult | null;
  isChecking?: boolean;
}

const channelOptions: { type: ChannelType; label: string; icon: React.ReactNode; placeholder: string }[] = [
  { type: 'mobile', label: 'تلفن همراه (موبایل)', icon: <Phone className="w-3.5 h-3.5 text-[#1DB954]" />, placeholder: '09121234567' },
  { type: 'landline', label: 'تلفن ثابت (دفتر/شرکت)', icon: <Phone className="w-3.5 h-3.5 text-blue-400" />, placeholder: '02188776655' },
  { type: 'telegram', label: 'اکانت / کانال تلگرام', icon: <Send className="w-3.5 h-3.5 text-[#229ED9]" />, placeholder: 'username یا شماره' },
  { type: 'instagram', label: 'پیج اینستاگرام', icon: <Instagram className="w-3.5 h-3.5 text-pink-500" />, placeholder: 'brand_account' },
  { type: 'whatsapp', label: 'واتساپ تجاری', icon: <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />, placeholder: '09121234567' },
  { type: 'email', label: 'پست الکترونیک (ایمیل)', icon: <Mail className="w-3.5 h-3.5 text-amber-400" />, placeholder: 'info@company.ir' },
  { type: 'website', label: 'آدرس وب‌سایت', icon: <Globe className="w-3.5 h-3.5 text-purple-400" />, placeholder: 'https://company.ir' },
  { type: 'other', label: 'سایر راه‌های ارتباطی', icon: <Globe className="w-3.5 h-3.5 text-gray-400" />, placeholder: 'لینک یا شماره' },
];

export const CustomerModal: React.FC<CustomerModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingCustomer,
  personnelList,
  currentPersonnel,
  currentUser,
  isAdmin,
  prefilledPhone,
  prefilledName,
  prefilledNotes,
}) => {
  if (!isOpen) return null;

  // Determine if the current user has Administrator privileges
  const userIsAdmin = Boolean(
    isAdmin ||
    currentUser?.is_admin ||
    currentUser?.app_role === 'admin' ||
    currentUser?.role_id === '59e261e1-56f4-401e-9889-4971e2c3c4ce' ||
    currentUser?.role_id === 'a45beaec-0272-4c29-89ee-122dce37f565' ||
    currentPersonnel?.role === 'admin'
  );

  // Form State
  const [companyName, setCompanyName] = useState(editingCustomer?.company_name || prefilledName || '');
  const [businessType, setBusinessType] = useState(editingCustomer?.business_type || '');
  const [province, setProvince] = useState(editingCustomer?.province || 'تهران');
  const [city, setCity] = useState(editingCustomer?.city || 'تهران');
  const [isEcommerce, setIsEcommerce] = useState(editingCustomer?.is_ecommerce || false);

  // Structured Contacts List
  const [contacts, setContacts] = useState<ContactRow[]>(() => {
    if (editingCustomer?.contacts && editingCustomer.contacts.length > 0) {
      return editingCustomer.contacts.map((c) => ({
        id: c.id,
        channel_type: c.channel_type,
        value: c.value,
        contact_name: c.contact_name || '',
        contact_role: c.contact_role || '',
        is_primary: !!c.is_primary,
        notes: c.notes || '',
      }));
    }

    const initialRows: ContactRow[] = [];

    // Synthesize from existing flat arrays if editing customer without explicit contacts
    if (editingCustomer) {
      editingCustomer.mobile_numbers?.forEach((num, idx) => {
        if (num) {
          initialRows.push({
            channel_type: 'mobile',
            value: num,
            contact_name: editingCustomer.manager_name || '',
            contact_role: 'موبایل اصلی',
            is_primary: idx === 0,
            notes: '',
          });
        }
      });
      editingCustomer.landline_numbers?.forEach((num) => {
        if (num) {
          initialRows.push({
            channel_type: 'landline',
            value: num,
            contact_name: 'دفتر',
            contact_role: 'تلفن ثابت',
            is_primary: false,
            notes: '',
          });
        }
      });
      editingCustomer.telegram_ids?.forEach((tid) => {
        if (tid) {
          initialRows.push({
            channel_type: 'telegram',
            value: tid,
            contact_name: 'تلگرام',
            contact_role: 'سوشال',
            is_primary: false,
            notes: '',
          });
        }
      });
      editingCustomer.instagram_ids?.forEach((iid) => {
        if (iid) {
          initialRows.push({
            channel_type: 'instagram',
            value: iid,
            contact_name: 'اینستاگرام',
            contact_role: 'مارکتینگ',
            is_primary: false,
            notes: '',
          });
        }
      });
      editingCustomer.emails?.forEach((em) => {
        if (em) {
          initialRows.push({
            channel_type: 'email',
            value: em,
            contact_name: 'ایمیل رسمی',
            contact_role: 'اداری',
            is_primary: false,
            notes: '',
          });
        }
      });
      editingCustomer.websites?.forEach((web) => {
        if (web) {
          initialRows.push({
            channel_type: 'website',
            value: web,
            contact_name: 'وب‌سایت',
            contact_role: 'سایت',
            is_primary: false,
            notes: '',
          });
        }
      });
    }

    if (initialRows.length > 0) return initialRows;

    if (prefilledPhone) {
      return [
        {
          channel_type: 'mobile',
          value: prefilledPhone,
          contact_name: prefilledName || '',
          contact_role: 'شماره اولیه',
          is_primary: true,
          notes: 'ثبت شده از بانک لید اولیه',
        },
      ];
    }

    return [
      {
        channel_type: 'mobile',
        value: '',
        contact_name: '',
        contact_role: 'مدیرعامل / مسئول',
        is_primary: true,
        notes: '',
      },
    ];
  });

  // Manager details
  const [managerName, setManagerName] = useState(editingCustomer?.manager_name || '');

  // Negotiator details
  const [negotiatorName, setNegotiatorName] = useState(editingCustomer?.negotiator_name || '');

  // Interview details
  const [interviewStatus, setInterviewStatus] = useState(
    editingCustomer?.interview_status || 'مصاحبه اولیه انجام شده'
  );
  const [interviewReport, setInterviewReport] = useState(
    editingCustomer?.interview_report || prefilledNotes || ''
  );
  const [interviewScore, setInterviewScore] = useState<number>(
    editingCustomer?.interview_score || 7
  );
  const [nextFollowupDate, setNextFollowupDate] = useState(
    editingCustomer?.next_followup_date?.split('T')[0] ||
      new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );

  // Marketer Assignment & Duration
  const [assignedMarketerId, setAssignedMarketerId] = useState(() => {
    if (editingCustomer?.assigned_marketer_id) return editingCustomer.assigned_marketer_id;
    if (currentPersonnel?.id) return currentPersonnel.id;
    if (currentUser?.id) return currentUser.id;
    return personnelList[0]?.id || '';
  });
  const [assignmentDurationDays, setAssignmentDurationDays] = useState<number>(
    editingCustomer?.assignment_duration_days || 7
  );

  // Overall status
  const [status, setStatus] = useState<NegotiationStatus>(
    editingCustomer?.status || 'تماس برقرار نشده'
  );

  const [saving, setSaving] = useState(false);
  const isSubmittingRef = useRef(false);
  const [activeTab, setActiveTab] = useState<'info' | 'contacts' | 'interview'>('info');
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Debounced duplicate checker per row
  const debounceTimers = useRef<{ [key: number]: NodeJS.Timeout }>({});

  const handleContactChange = (index: number, field: keyof ContactRow, val: any) => {
    setSubmitError(null);
    setContacts((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });

    if (field === 'value' || field === 'channel_type') {
      if (debounceTimers.current[index]) {
        clearTimeout(debounceTimers.current[index]);
      }

      setContacts((prev) => {
        const copy = [...prev];
        if (copy[index]) {
          copy[index].isChecking = true;
        }
        return copy;
      });

      debounceTimers.current[index] = setTimeout(async () => {
        const targetVal = field === 'value' ? val : contacts[index]?.value;
        const targetType = field === 'channel_type' ? val : contacts[index]?.channel_type;

        if (!targetVal || targetVal.trim().length < 4) {
          setContacts((prev) => {
            const copy = [...prev];
            if (copy[index]) {
              copy[index].duplicateWarning = null;
              copy[index].isChecking = false;
            }
            return copy;
          });
          return;
        }

        try {
          const res = await checkDuplicateContact(targetVal, targetType, editingCustomer?.id);
          setContacts((prev) => {
            const copy = [...prev];
            if (copy[index]) {
              copy[index].duplicateWarning = res.isDuplicate ? res : null;
              copy[index].isChecking = false;
            }
            return copy;
          });
        } catch {
          setContacts((prev) => {
            const copy = [...prev];
            if (copy[index]) copy[index].isChecking = false;
            return copy;
          });
        }
      }, 400);
    }
  };

  const addContactRow = (type: ChannelType = 'mobile') => {
    setSubmitError(null);
    setContacts((prev) => [
      ...prev,
      {
        channel_type: type,
        value: '',
        contact_name: '',
        contact_role: '',
        is_primary: prev.length === 0,
        notes: '',
      },
    ]);
  };

  const removeContactRow = (index: number) => {
    setContacts((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  };

  const setPrimaryContact = (index: number) => {
    setContacts((prev) =>
      prev.map((c, i) => ({
        ...c,
        is_primary: i === index,
      }))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setSaving(true);

    setSubmitError(null);

    if (!companyName.trim()) {
      setSubmitError('لطفاً نام شرکت یا فروشگاه را وارد کنید.');
      setActiveTab('info');
      isSubmittingRef.current = false;
      setSaving(false);
      return;
    }

    // Clean contacts
    const cleanContacts: CustomerContact[] = contacts
      .filter((c) => c.value && c.value.trim().length > 0)
      .map((c) => {
        const isUuid = c.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(c.id);
        return {
          id: isUuid ? c.id : undefined as any,
          customer_id: editingCustomer?.id || '',
          channel_type: c.channel_type,
          value: c.value.trim(),
          normalized_value: c.value.trim(),
          contact_name: c.contact_name?.trim() || '',
          contact_role: c.contact_role?.trim() || '',
          is_primary: !!c.is_primary,
          notes: c.notes?.trim() || '',
        };
      });

    if (cleanContacts.length === 0) {
      setSubmitError('حداقل یک شماره تماس معتبر برای این مشتری وارد کنید.');
      setActiveTab('contacts');
      isSubmittingRef.current = false;
      setSaving(false);
      return;
    }

    // Check for internal duplicates within this form's own contact rows
    const seenFormContacts = new Set<string>();
    for (const c of cleanContacts) {
      const cleanVal = (c.normalized_value || c.value || '').trim();
      const key = `${c.channel_type}:${cleanVal}`;
      if (seenFormContacts.has(key)) {
        setSubmitError(`شماره یا نشانی ارتباطی «${c.value}» بیش از یک بار در فرم ثبت شده است.`);
        setActiveTab('contacts');
        isSubmittingRef.current = false;
        setSaving(false);
        return;
      }
      seenFormContacts.add(key);
    }

    // Check if any contact has a blocker duplicate conflict with another active marketer
    const activeConflicts = contacts.filter(
      (c) => c.duplicateWarning && c.duplicateWarning.conflictType === 'active_marketer'
    );

    if (activeConflicts.length > 0) {
      const conflictMsg = activeConflicts
        .map(
          (c) =>
            `شماره «${c.value}» در اختیار بازاریاب «${c.duplicateWarning?.matchedCustomer?.assigned_marketer_name}» برای شرکت «${c.duplicateWarning?.matchedCustomer?.company_name}» است.`
        )
        .join(' | ');
      setSubmitError(`خطای ثبت شماره تکراری: ${conflictMsg} (امکان تخصیص شماره مشتری به دو بازاریاب فعال وجود ندارد)`);
      setActiveTab('contacts');
      isSubmittingRef.current = false;
      setSaving(false);
      return;
    }

    try {
      let finalMarketerId = assignedMarketerId && assignedMarketerId !== 'none' ? assignedMarketerId : null;
      const selectedMarketer = personnelList.find((p) => p.id === assignedMarketerId);
      let finalMarketerName = selectedMarketer?.name || 'تخصیص نیافته';
      let finalDurationDays = assignmentDurationDays;

      // If user is not admin, they cannot set assignee or custom duration
      if (!userIsAdmin) {
        if (editingCustomer) {
          finalMarketerId = editingCustomer.assigned_marketer_id || null;
          finalMarketerName = editingCustomer.assigned_marketer_name || 'تخصیص نیافته';
          finalDurationDays = editingCustomer.assignment_duration_days || 7;
        } else {
          finalMarketerId = currentPersonnel?.id || currentUser?.id || null;
          finalMarketerName = currentPersonnel?.name || currentUser?.name || 'کارشناس فروش';
          finalDurationDays = 7;
        }
      }

      // Separate arrays for backward-compatible views
      const mobiles = cleanContacts.filter((c) => c.channel_type === 'mobile').map((c) => c.value);
      const landlines = cleanContacts.filter((c) => c.channel_type === 'landline').map((c) => c.value);
      const telegrams = cleanContacts.filter((c) => c.channel_type === 'telegram').map((c) => c.value);
      const instagrams = cleanContacts.filter((c) => c.channel_type === 'instagram').map((c) => c.value);
      const emails = cleanContacts.filter((c) => c.channel_type === 'email').map((c) => c.value);
      const websites = cleanContacts.filter((c) => c.channel_type === 'website').map((c) => c.value);

      await onSave({
        company_name: companyName.trim(),
        business_type: businessType.trim(),
        province: province.trim(),
        city: city.trim(),
        manager_name: managerName.trim(),
        manager_phones: mobiles.slice(0, 2),
        negotiator_name: negotiatorName.trim(),
        negotiator_phones: mobiles.slice(1, 3),
        mobile_numbers: mobiles,
        landline_numbers: landlines,
        telegram_phone: mobiles[0] || '',
        telegram_ids: telegrams,
        instagram_ids: instagrams,
        emails: emails,
        websites: websites,
        contacts: cleanContacts,
        is_ecommerce: isEcommerce,
        interview_status: interviewStatus,
        interview_report: interviewReport.trim(),
        interview_score: Number(interviewScore),
        next_followup_date: nextFollowupDate ? new Date(nextFollowupDate).toISOString() : null,
        assigned_marketer_id: finalMarketerId,
        assigned_marketer_name: finalMarketerName,
        assignment_duration_days: finalDurationDays,
        status,
      });
      onClose();
    } catch (err: any) {
      const msg = err.message || 'خطای نامشخص در ثبت اطلاعات مشتری';
      setSubmitError(msg);
      if (msg.includes('شماره') || msg.includes('تکراری') || msg.includes('DUPLICATE')) {
        setActiveTab('contacts');
      }
    } finally {
      setSaving(false);
      isSubmittingRef.current = false;
    }
  };

  const hasAnyDuplicateWarning = contacts.some(
    (c) => c.duplicateWarning && c.duplicateWarning.conflictType === 'active_marketer'
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#181818] border border-[#282828] w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden my-2 sm:my-8 max-h-[95vh] sm:max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-6 bg-[#121212] border-b border-[#282828] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 sm:w-10 h-9 sm:h-10 rounded-full bg-[#1DB954]/15 border border-[#1DB954]/30 flex items-center justify-center text-[#1DB954] flex-shrink-0">
              <Building className="w-4 sm:w-5 h-4 sm:h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                {editingCustomer ? 'ویرایش پرونده مشتری' : 'ثبت پرونده مشتری جدید'}
              </h2>
              <p className="text-[11px] sm:text-xs text-[#A7A7A7]">
                ثبت اطلاعات کامل شرکت، کانال‌های ارتباطی تفکیک‌شده و بررسی یکتایی شماره‌ها
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#282828] hover:bg-[#333333] flex items-center justify-center text-[#B3B3B3] hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher inside modal */}
        <div className="flex border-b border-[#282828] bg-[#141414] px-3 sm:px-6 pt-2 overflow-x-auto whitespace-nowrap scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`pb-3 px-3 sm:px-4 text-xs font-bold transition-colors relative flex-shrink-0 ${
              activeTab === 'info' ? 'text-[#1DB954]' : 'text-[#A7A7A7] hover:text-white'
            }`}
          >
            اطلاعات پایه و انتساب
            {activeTab === 'info' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1DB954]" />}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('contacts')}
            className={`pb-3 px-3 sm:px-4 text-xs font-bold transition-colors relative flex-shrink-0 flex items-center gap-1.5 ${
              activeTab === 'contacts' ? 'text-[#1DB954]' : 'text-[#A7A7A7] hover:text-white'
            }`}
          >
            <span>کانال‌های ارتباطی و شماره‌ها</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#282828] text-white">
              {contacts.length}
            </span>
            {hasAnyDuplicateWarning && (
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            )}
            {activeTab === 'contacts' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1DB954]" />}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('interview')}
            className={`pb-3 px-3 sm:px-4 text-xs font-bold transition-colors relative flex-shrink-0 ${
              activeTab === 'interview' ? 'text-[#1DB954]' : 'text-[#A7A7A7] hover:text-white'
            }`}
          >
            مصاحبه اولیه و وضعیت
            {activeTab === 'interview' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1DB954]" />}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1">
          {/* Prominent Error Banner */}
          {submitError && (
            <div className="p-3.5 rounded-xl bg-red-950/70 border border-red-500/80 text-red-200 text-xs flex items-start gap-2.5 shadow-lg animate-in fade-in">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-bold text-red-100 mb-0.5">پیام سیستم / خطا:</div>
                <div className="leading-relaxed">{submitError}</div>
              </div>
              <button
                type="button"
                onClick={() => setSubmitError(null)}
                className="text-red-400 hover:text-white p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* TAB 1: General Info & Business */}
          {activeTab === 'info' && (
            <div className="space-y-5">
              {/* Row 1: Company & Job */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
                    نام شرکت / فروشگاه <span className="text-[#E22134]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="مثال: تجارت الکترونیک سپهر، بازرگانی پارس..."
                    className="w-full h-10 px-3 bg-[#282828] rounded-md text-xs text-white border border-transparent focus:border-[#1DB954] focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
                    شغل / زمینه فعالیت
                  </label>
                  <input
                    type="text"
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value)}
                    placeholder="مثال: تجهیزات صنعتی، پوشاک و اکسسوری..."
                    className="w-full h-10 px-3 bg-[#282828] rounded-md text-xs text-white border border-transparent focus:border-[#1DB954] focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Row 2: Location & Ecommerce Toggle */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">استان</label>
                  <input
                    type="text"
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    placeholder="تهران"
                    className="w-full h-10 px-3 bg-[#282828] rounded-md text-xs text-white border border-transparent focus:border-[#1DB954] focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">شهر</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="تهران"
                    className="w-full h-10 px-3 bg-[#282828] rounded-md text-xs text-white border border-transparent focus:border-[#1DB954] focus:outline-none transition-colors"
                  />
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-white">
                    <input
                      type="checkbox"
                      checked={isEcommerce}
                      onChange={(e) => setIsEcommerce(e.target.checked)}
                      className="w-4 h-4 rounded accent-[#1DB954]"
                    />
                    <span>دارای فروشگاه اینترنتی فعال</span>
                  </label>
                </div>
              </div>

              {/* Quick Contacts Summary in Info Tab */}
              <div className="p-4 rounded-xl bg-[#121212] border border-[#282828] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <Phone className="w-4 h-4 text-[#1DB954]" />
                    <span>شماره‌های تماس و کانال‌های ارتباطی مشتری ({contacts.length} شماره)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      addContactRow('mobile');
                      setActiveTab('contacts');
                    }}
                    className="px-3 py-1.5 rounded-full bg-[#1DB954] hover:bg-[#1ED760] text-black text-xs font-bold flex items-center gap-1 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    <span>+ افزودن شماره جدید</span>
                  </button>
                </div>
                {contacts.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {contacts.map((c, idx) => (
                      <div
                        key={idx}
                        onClick={() => setActiveTab('contacts')}
                        className="px-2.5 py-1.5 rounded-lg bg-[#222222] border border-[#333333] hover:border-[#1DB954] cursor-pointer text-xs text-white font-mono flex items-center gap-2 transition-colors"
                        title="برای ویرایش این شماره کلیک کنید"
                      >
                        <span className="text-[10px] text-[#A7A7A7] font-sans">
                          {c.channel_type === 'mobile' ? 'موبایل' : c.channel_type === 'landline' ? 'ثابت' : c.channel_type}:
                        </span>
                        <span>{c.value || '(هنوز وارد نشده)'}</span>
                        {c.contact_name && (
                          <span className="text-[10px] text-[#1DB954] font-sans">({c.contact_name})</span>
                        )}
                        {c.is_primary && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-[#1DB954]/20 text-[#1DB954]">اصلی</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#888]">هیچ شماره‌ای ثبت نشده است. روی دکمه افزودن شماره جدید کلیک کنید.</p>
                )}
              </div>

              {/* Row 3: Manager & Negotiator Names */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-[#282828]">
                <div>
                  <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
                    نام مدیر مجموعه / تصمیم‌گیرنده اصلی
                  </label>
                  <input
                    type="text"
                    value={managerName}
                    onChange={(e) => setManagerName(e.target.value)}
                    placeholder="مهندس رستمی"
                    className="w-full h-10 px-3 bg-[#282828] rounded-md text-xs text-white border border-transparent focus:border-[#1DB954] focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
                    نام کارشناس پیگیری / مذاکره‌کننده رابط
                  </label>
                  <input
                    type="text"
                    value={negotiatorName}
                    onChange={(e) => setNegotiatorName(e.target.value)}
                    placeholder="خانم سهرابی"
                    className="w-full h-10 px-3 bg-[#282828] rounded-md text-xs text-white border border-transparent focus:border-[#1DB954] focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Row 4: Marketer Assignment & Duration */}
              <div className="p-4 rounded-xl bg-[#121212] border border-[#282828] space-y-4">
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#1DB954]" />
                  <span>تخصیص مشتری به بازاریاب و تعیین مهلت</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Marketer Field */}
                  <div>
                    <label className="block text-[11px] text-[#A7A7A7] mb-1">
                      بازاریاب مسئول این پرونده
                    </label>
                    <select
                      value={assignedMarketerId}
                      onChange={(e) => setAssignedMarketerId(e.target.value)}
                      disabled={!userIsAdmin}
                      className="w-full h-10 px-3 bg-[#282828] disabled:bg-[#202020] disabled:text-[#777] disabled:border-[#333] disabled:cursor-not-allowed rounded-md text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#1DB954] border border-transparent transition-colors"
                    >
                      <option value="none">تخصیص نیافته (عمومی)</option>
                      {personnelList.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.role === 'marketer' ? 'بازاریاب' : p.role === 'admin' ? 'مدیر سیستم' : 'پرسنل'})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Deadline Duration Field */}
                  <div>
                    <label className="block text-[11px] text-[#A7A7A7] mb-1">
                      مهلت واگذاری به بازاریاب
                    </label>
                    <select
                      value={assignmentDurationDays}
                      onChange={(e) => setAssignmentDurationDays(Number(e.target.value))}
                      disabled={!userIsAdmin}
                      className="w-full h-10 px-3 bg-[#282828] disabled:bg-[#202020] disabled:text-[#777] disabled:border-[#333] disabled:cursor-not-allowed rounded-md text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#1DB954] border border-transparent transition-colors"
                    >
                      <option value={3}>۳ روز (پیگیری فوری)</option>
                      <option value={7}>۷ روز (استاندارد)</option>
                      <option value={14}>۱۴ روز (مذاکره بلندمدت)</option>
                      <option value={30}>۳۰ روز (قراردادهای بزرگ)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Prompt to go to Contacts Tab */}
              <div className="flex justify-between items-center p-3 rounded-lg bg-[#282828]/50 border border-[#333]">
                <span className="text-xs text-[#A7A7A7]">
                  شماره‌های تماس و اکانت‌های شبکه‌های اجتماعی در برگه مجزا با قابلیت بررسی تکراری قرار دارند:
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('contacts')}
                  className="px-3 py-1.5 rounded-full bg-[#1DB954] text-black text-xs font-bold hover:bg-[#1ED760] transition-colors"
                >
                  رفتن به ثبت شماره‌ها ({contacts.length})
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Modular Contacts Management & Duplicate Prevention */}
          {activeTab === 'contacts' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-[#121212] rounded-xl border border-[#282828]">
                <div>
                  <h3 className="text-xs font-bold text-white flex items-center gap-2">
                    <Phone className="w-4 h-4 text-[#1DB954]" />
                    <span>کانال‌های ارتباطی تفکیک‌شده و بررسی آنی عدم تکرار</span>
                  </h3>
                  <p className="text-[11px] text-[#A7A7A7] mt-0.5">
                    هر شماره یا اکانت جداگانه ذخیره می‌شود؛ در صورت تعلق به بازاریاب دیگر اخطار داده خواهد شد.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => addContactRow('mobile')}
                    className="px-2.5 py-1 rounded-full bg-[#282828] hover:bg-[#333] text-[11px] text-white flex items-center gap-1 border border-[#3e3e3e]"
                  >
                    <Plus className="w-3 h-3 text-[#1DB954]" />
                    <span>+ موبایل</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => addContactRow('landline')}
                    className="px-2.5 py-1 rounded-full bg-[#282828] hover:bg-[#333] text-[11px] text-white flex items-center gap-1 border border-[#3e3e3e]"
                  >
                    <Plus className="w-3 h-3 text-blue-400" />
                    <span>+ تلفن ثابت</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => addContactRow('telegram')}
                    className="px-2.5 py-1 rounded-full bg-[#282828] hover:bg-[#333] text-[11px] text-white flex items-center gap-1 border border-[#3e3e3e]"
                  >
                    <Plus className="w-3 h-3 text-[#229ED9]" />
                    <span>+ تلگرام</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => addContactRow('instagram')}
                    className="px-2.5 py-1 rounded-full bg-[#282828] hover:bg-[#333] text-[11px] text-white flex items-center gap-1 border border-[#3e3e3e]"
                  >
                    <Plus className="w-3 h-3 text-pink-500" />
                    <span>+ اینستاگرام</span>
                  </button>
                </div>
              </div>

              {/* Contacts Rows */}
              <div className="space-y-3">
                {contacts.map((contact, idx) => {
                  const chMeta = channelOptions.find((c) => c.type === contact.channel_type) || channelOptions[0];
                  const hasConflict = !!contact.duplicateWarning;
                  const isBlocker = contact.duplicateWarning?.conflictType === 'active_marketer';

                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border transition-all ${
                        isBlocker
                          ? 'bg-red-950/20 border-red-500/50'
                          : hasConflict
                          ? 'bg-amber-950/20 border-amber-500/40'
                          : 'bg-[#141414] border-[#282828] hover:border-[#383838]'
                      }`}
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                        {/* Type Selector */}
                        <div className="sm:col-span-3">
                          <label className="block text-[10px] text-[#A7A7A7] mb-1">نوع کانال</label>
                          <select
                            value={contact.channel_type}
                            onChange={(e) => handleContactChange(idx, 'channel_type', e.target.value as ChannelType)}
                            className="w-full h-8 px-2 bg-[#282828] rounded text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#1DB954]"
                          >
                            {channelOptions.map((opt) => (
                              <option key={opt.type} value={opt.type}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Value Input */}
                        <div className="sm:col-span-4">
                          <label className="block text-[10px] text-[#A7A7A7] mb-1 flex items-center justify-between">
                            <span>مقدار / شماره تماس / آیدی</span>
                            {contact.isChecking && <span className="text-[#1DB954] text-[10px]">در حال بررسی...</span>}
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              dir="ltr"
                              value={contact.value}
                              onChange={(e) => handleContactChange(idx, 'value', e.target.value)}
                              placeholder={chMeta.placeholder}
                              className={`w-full h-8 px-2.5 bg-[#282828] rounded text-xs text-white focus:outline-none font-mono ${
                                isBlocker
                                  ? 'border border-red-500 ring-1 ring-red-500'
                                  : 'focus:ring-1 focus:ring-[#1DB954]'
                              }`}
                            />
                          </div>
                        </div>

                        {/* Contact Name & Role */}
                        <div className="sm:col-span-3">
                          <label className="block text-[10px] text-[#A7A7A7] mb-1">دارنده شماره / نقش</label>
                          <div className="grid grid-cols-2 gap-1">
                            <input
                              type="text"
                              value={contact.contact_name}
                              onChange={(e) => handleContactChange(idx, 'contact_name', e.target.value)}
                              placeholder="نام شخص"
                              className="w-full h-8 px-2 bg-[#282828] rounded text-xs text-white focus:outline-none"
                            />
                            <input
                              type="text"
                              value={contact.contact_role}
                              onChange={(e) => handleContactChange(idx, 'contact_role', e.target.value)}
                              placeholder="مدیر، خرید..."
                              className="w-full h-8 px-2 bg-[#282828] rounded text-xs text-white focus:outline-none"
                            />
                          </div>
                        </div>

                        {/* Actions: Primary & Delete */}
                        <div className="sm:col-span-2 flex items-center justify-end gap-1.5 pt-4 sm:pt-0">
                          <button
                            type="button"
                            onClick={() => setPrimaryContact(idx)}
                            className={`h-8 px-2 rounded flex items-center gap-1 text-[11px] transition-colors ${
                              contact.is_primary
                                ? 'bg-[#1DB954]/20 text-[#1DB954] border border-[#1DB954]/40 font-bold'
                                : 'bg-[#282828] text-[#A7A7A7] hover:text-white'
                            }`}
                            title={contact.is_primary ? 'شماره اصلی' : 'تنظیم به عنوان شماره اصلی'}
                          >
                            <Star className={`w-3 h-3 ${contact.is_primary ? 'fill-current' : ''}`} />
                            <span className="hidden sm:inline">اصلی</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => removeContactRow(idx)}
                            disabled={contacts.length <= 1}
                            className="w-8 h-8 rounded bg-[#282828] hover:bg-red-950/60 text-[#A7A7A7] hover:text-red-400 flex items-center justify-center transition-colors disabled:opacity-30"
                            title="حذف این سطر"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Duplicate Warning Banner */}
                      {contact.duplicateWarning && (
                        <div
                          className={`mt-2.5 p-2 rounded-lg text-xs flex items-start gap-2 ${
                            contact.duplicateWarning.conflictType === 'active_marketer'
                              ? 'bg-red-500/15 border border-red-500/30 text-red-300'
                              : contact.duplicateWarning.conflictType === 'contract'
                              ? 'bg-purple-500/15 border border-purple-500/30 text-purple-300'
                              : 'bg-amber-500/15 border border-amber-500/30 text-amber-300'
                          }`}
                        >
                          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-current" />
                          <div>
                            <span className="font-bold">
                              {contact.duplicateWarning.conflictType === 'active_marketer'
                                ? 'هشدار تداخل و انحصار بازاریاب:'
                                : 'اطلاعیه شماره پیشین:'}
                            </span>{' '}
                            <span>{contact.duplicateWarning.message}</span>
                            {contact.duplicateWarning.matchedCustomer && (
                              <div className="mt-1 text-[11px] opacity-90">
                                پرونده: «{contact.duplicateWarning.matchedCustomer.company_name}» | بازاریاب متصل:{' '}
                                {contact.duplicateWarning.matchedCustomer.assigned_marketer_name}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add more button */}
              <button
                type="button"
                onClick={() => addContactRow('mobile')}
                className="w-full py-2.5 rounded-xl border border-dashed border-[#3e3e3e] hover:border-[#1DB954] text-xs text-[#A7A7A7] hover:text-[#1DB954] flex items-center justify-center gap-1.5 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>افزودن راه ارتباطی جدید (موبایل، خط، سوشال)</span>
              </button>
            </div>
          )}

          {/* TAB 3: Interview and Status */}
          {activeTab === 'interview' && (
            <div className="space-y-4">
              {/* Overall Status */}
              <div>
                <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
                  وضعیت فعلی پرونده مذاکره
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as NegotiationStatus)}
                  className="w-full h-10 px-3 bg-[#282828] rounded-md text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#1DB954]"
                >
                  <option value="تماس برقرار نشده">تماس برقرار نشده</option>
                  <option value="پیگیری قبل از انقضا">پیگیری قبل از انقضا</option>
                  <option value="پیش نویس قرارداد">پیش نویس قرارداد</option>
                  <option value="پیگیری قرارداد">پیگیری قرارداد</option>
                  <option value="قرارداد">قرارداد / فاکتور</option>
                  <option value="پاسخ نمیدهد">پاسخ نمیدهد</option>
                  <option value="نمیخواد">عدم تمایل (نمیخواد)</option>
                  <option value="پیگیری بلند مدت">پیگیری بلند مدت</option>
                  <option value="لیست سیاه">لیست سیاه</option>
                </select>
              </div>

              {/* Interview Score */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold text-[#B3B3B3]">
                    امتیاز تمایل و پتانسیل مشتری در مصاحبه اول:
                  </label>
                  <span className="text-xs font-bold text-[#1DB954] px-2 py-0.5 rounded bg-[#1DB954]/15">
                    {interviewScore} از ۱۰
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={interviewScore}
                  onChange={(e) => setInterviewScore(Number(e.target.value))}
                  className="w-full accent-[#1DB954]"
                />
              </div>

              {/* Next follow up date */}
              <div>
                <PersianDatePicker
                  label="تاریخ پیگیری بعدی (شمسی)"
                  value={nextFollowupDate}
                  onChange={(iso) => setNextFollowupDate(iso)}
                />
              </div>

              {/* Interview Report Text */}
              <div>
                <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
                  شرح مذاکرات مصاحبه اولیه و نیازهای اصلی مشتری
                </label>
                <textarea
                  rows={4}
                  value={interviewReport}
                  onChange={(e) => setInterviewReport(e.target.value)}
                  placeholder="شرح کامل صحبت‌ها، محصولات مدنظر، بودجه، دغدغه‌ها و هماهنگی جلسه بعدی..."
                  className="w-full p-3 bg-[#282828] rounded-md text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#1DB954] resize-none"
                />
              </div>
            </div>
          )}

          {/* Footer Save & Cancel Buttons */}
          <div className="pt-4 border-t border-[#282828] flex items-center justify-between">
            <div className="text-xs text-[#A7A7A7]">
              {hasAnyDuplicateWarning && (
                <span className="text-red-400 font-bold flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  <span>یک یا چند شماره دارای تداخل بازاریاب دیگر هستند!</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={saving || isSubmittingRef.current}
                className="px-4 py-2 rounded-full bg-[#282828] hover:bg-[#333] text-xs font-semibold text-[#B3B3B3] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                انصراف
              </button>
              <button
                type="submit"
                disabled={saving || isSubmittingRef.current}
                className="px-6 py-2 rounded-full bg-[#1DB954] hover:bg-[#1ED760] disabled:bg-[#333] disabled:text-[#666] disabled:cursor-not-allowed text-black text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
              >
                {saving || isSubmittingRef.current ? 'در حال ثبت اطلاعات پرونده...' : editingCustomer ? 'ذخیره تغییرات و شماره‌ها' : 'ثبت قطعی پرونده'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
