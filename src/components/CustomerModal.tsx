import React, { useState, useEffect } from 'react';
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
  HelpCircle,
} from 'lucide-react';
import { Customer, Personnel, NegotiationStatus } from '../types';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (customerData: Partial<Customer> & { assignment_duration_days?: number }) => Promise<void>;
  editingCustomer?: Customer | null;
  personnelList: Personnel[];
  prefilledPhone?: string;
  prefilledName?: string;
  prefilledNotes?: string;
}

export const CustomerModal: React.FC<CustomerModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingCustomer,
  personnelList,
  prefilledPhone,
  prefilledName,
  prefilledNotes,
}) => {
  if (!isOpen) return null;

  // Form State
  const [companyName, setCompanyName] = useState(editingCustomer?.company_name || prefilledName || '');
  const [businessType, setBusinessType] = useState(editingCustomer?.business_type || '');
  const [province, setProvince] = useState(editingCustomer?.province || 'تهران');
  const [city, setCity] = useState(editingCustomer?.city || 'تهران');

  // Contacts: Mobiles & Landlines
  const [mobiles, setMobiles] = useState<string[]>(
    editingCustomer?.mobile_numbers?.length ? editingCustomer.mobile_numbers : prefilledPhone ? [prefilledPhone] : ['']
  );
  const [landlines, setLandlines] = useState<string[]>(
    editingCustomer?.landline_numbers?.length ? editingCustomer.landline_numbers : ['']
  );

  // Telegram & Socials
  const [telegramPhone, setTelegramPhone] = useState(editingCustomer?.telegram_phone || prefilledPhone || '');
  const [telegramIds, setTelegramIds] = useState<string[]>(
    editingCustomer?.telegram_ids?.length ? editingCustomer.telegram_ids : ['']
  );
  const [instagramIds, setInstagramIds] = useState<string[]>(
    editingCustomer?.instagram_ids?.length ? editingCustomer.instagram_ids : ['']
  );
  const [emails, setEmails] = useState<string[]>(
    editingCustomer?.emails?.length ? editingCustomer.emails : ['']
  );
  const [websites, setWebsites] = useState<string[]>(
    editingCustomer?.websites?.length ? editingCustomer.websites : ['']
  );
  const [isEcommerce, setIsEcommerce] = useState(editingCustomer?.is_ecommerce || false);

  // Manager details
  const [managerName, setManagerName] = useState(editingCustomer?.manager_name || '');
  const [managerPhones, setManagerPhones] = useState<string[]>(
    editingCustomer?.manager_phones?.length ? editingCustomer.manager_phones : ['']
  );

  // Negotiator details
  const [negotiatorName, setNegotiatorName] = useState(editingCustomer?.negotiator_name || '');
  const [negotiatorPhones, setNegotiatorPhones] = useState<string[]>(
    editingCustomer?.negotiator_phones?.length ? editingCustomer.negotiator_phones : ['']
  );

  // Interview details (گزارش اولین مصاحبه با مشتری)
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
  const [assignedMarketerId, setAssignedMarketerId] = useState(
    editingCustomer?.assigned_marketer_id || personnelList[0]?.id || ''
  );
  const [assignmentDurationDays, setAssignmentDurationDays] = useState<number>(7);

  // Overall status
  const [status, setStatus] = useState<NegotiationStatus>(
    editingCustomer?.status || 'تماس برقرار نشده'
  );

  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'interview' | 'socials'>('info');

  // Combine all available phone numbers for Telegram selector
  const allAvailablePhones = Array.from(
    new Set([...mobiles, ...landlines, ...managerPhones, ...negotiatorPhones].filter((p) => p && p.trim().length > 3))
  );

  const handleArrayChange = (setter: React.Dispatch<React.SetStateAction<string[]>>, idx: number, val: string) => {
    setter((prev) => {
      const copy = [...prev];
      copy[idx] = val;
      return copy;
    });
  };

  const addArrayItem = (setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter((prev) => [...prev, '']);
  };

  const removeArrayItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, idx: number) => {
    setter((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : ['']));
  };

  const cleanArray = (arr: string[]) => arr.map((s) => s.trim()).filter(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      alert('لطفاً نام شرکت یا فروشگاه را وارد کنید.');
      return;
    }

    setSaving(true);
    try {
      const selectedMarketer = personnelList.find((p) => p.id === assignedMarketerId);

      await onSave({
        company_name: companyName.trim(),
        business_type: businessType.trim(),
        province: province.trim(),
        city: city.trim(),
        manager_name: managerName.trim(),
        manager_phones: cleanArray(managerPhones),
        negotiator_name: negotiatorName.trim(),
        negotiator_phones: cleanArray(negotiatorPhones),
        mobile_numbers: cleanArray(mobiles),
        landline_numbers: cleanArray(landlines),
        telegram_phone: telegramPhone.trim(),
        telegram_ids: cleanArray(telegramIds),
        instagram_ids: cleanArray(instagramIds),
        emails: cleanArray(emails),
        websites: cleanArray(websites),
        is_ecommerce: isEcommerce,
        interview_status: interviewStatus,
        interview_report: interviewReport.trim(),
        interview_score: Number(interviewScore),
        next_followup_date: nextFollowupDate ? new Date(nextFollowupDate).toISOString() : '',
        assigned_marketer_id: assignedMarketerId,
        assigned_marketer_name: selectedMarketer?.name || 'تخصیص نیافته',
        assignment_duration_days: assignmentDurationDays,
        status,
      });
      onClose();
    } catch (err: any) {
      alert('خطا در ذخیره‌سازی: ' + (err.message || 'نامشخص'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#181818] border border-[#282828] w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="p-6 bg-[#121212] border-b border-[#282828] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#1DB954]/15 border border-[#1DB954]/30 flex items-center justify-center text-[#1DB954]">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {editingCustomer ? 'ویرایش پرونده مشتری' : 'ثبت پرونده مشتری جدید'}
              </h2>
              <p className="text-xs text-[#A7A7A7]">
                ثبت اطلاعات کامل شرکت، راه‌های ارتباطی، مصاحبه اولیه و مهلت بازاریاب
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
        <div className="flex border-b border-[#282828] bg-[#141414] px-6 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`pb-3 px-4 text-xs font-bold transition-colors relative ${
              activeTab === 'info'
                ? 'text-[#1DB954]'
                : 'text-[#A7A7A7] hover:text-white'
            }`}
          >
            اطلاعات پایه و تماس
            {activeTab === 'info' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1DB954]" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('socials')}
            className={`pb-3 px-4 text-xs font-bold transition-colors relative ${
              activeTab === 'socials'
                ? 'text-[#1DB954]'
                : 'text-[#A7A7A7] hover:text-white'
            }`}
          >
            شبکه‌های اجتماعی و وب‌سایت
            {activeTab === 'socials' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1DB954]" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('interview')}
            className={`pb-3 px-4 text-xs font-bold transition-colors relative ${
              activeTab === 'interview'
                ? 'text-[#1DB954]'
                : 'text-[#A7A7A7] hover:text-white'
            }`}
          >
            گزارش مصاحبه و تخصیص بازاریاب
            {activeTab === 'interview' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1DB954]" />
            )}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[72vh] overflow-y-auto">
          {/* TAB 1: General Info & Direct Phones */}
          {activeTab === 'info' && (
            <div className="space-y-6">
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
                    placeholder="مثال: بازرگانی سپهر، آتلیه نور..."
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
                    placeholder="مثال: پخش لوازم خانگی، پوشاک، صنعتی..."
                    className="w-full h-10 px-3 bg-[#282828] rounded-md text-xs text-white border border-transparent focus:border-[#1DB954] focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Row 2: Location */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
                    استان
                  </label>
                  <input
                    type="text"
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    placeholder="مثال: تهران، اصفهان، خراسان..."
                    className="w-full h-10 px-3 bg-[#282828] rounded-md text-xs text-white border border-transparent focus:border-[#1DB954] focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
                    شهر
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="مثال: تهران، مشهد، تبریز..."
                    className="w-full h-10 px-3 bg-[#282828] rounded-md text-xs text-white border border-transparent focus:border-[#1DB954] focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Phones Section: Mobiles & Landlines */}
              <div className="p-4 rounded-xl bg-[#121212] border border-[#282828] space-y-4">
                <div className="font-bold text-xs text-white flex items-center gap-2">
                  <Phone className="w-4 h-4 text-[#1DB954]" />
                  <span>شماره‌های تماس اصلی شرکت</span>
                </div>

                {/* Mobiles */}
                <div>
                  <label className="block text-xs font-medium text-[#B3B3B3] mb-2">
                    شماره موبایل‌ها
                  </label>
                  <div className="space-y-2">
                    {mobiles.map((mob, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          type="text"
                          dir="ltr"
                          value={mob}
                          onChange={(e) => handleArrayChange(setMobiles, i, e.target.value)}
                          placeholder="0912..."
                          className="flex-1 h-9 px-3 bg-[#282828] rounded-md text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#1DB954]"
                        />
                        <button
                          type="button"
                          onClick={() => removeArrayItem(setMobiles, i)}
                          className="w-8 h-8 rounded bg-[#282828] hover:bg-red-900/40 text-[#A7A7A7] hover:text-red-400 flex items-center justify-center transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addArrayItem(setMobiles)}
                      className="inline-flex items-center gap-1.5 text-xs text-[#1DB954] hover:underline pt-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>افزودن شماره موبایل دیگر</span>
                    </button>
                  </div>
                </div>

                {/* Landlines */}
                <div className="pt-2 border-t border-[#282828]">
                  <label className="block text-xs font-medium text-[#B3B3B3] mb-2">
                    تلفن‌های ثابت (با پیش‌شماره)
                  </label>
                  <div className="space-y-2">
                    {landlines.map((land, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          type="text"
                          dir="ltr"
                          value={land}
                          onChange={(e) => handleArrayChange(setLandlines, i, e.target.value)}
                          placeholder="021..."
                          className="flex-1 h-9 px-3 bg-[#282828] rounded-md text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#1DB954]"
                        />
                        <button
                          type="button"
                          onClick={() => removeArrayItem(setLandlines, i)}
                          className="w-8 h-8 rounded bg-[#282828] hover:bg-red-900/40 text-[#A7A7A7] hover:text-red-400 flex items-center justify-center transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addArrayItem(setLandlines)}
                      className="inline-flex items-center gap-1.5 text-xs text-[#1DB954] hover:underline pt-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>افزودن تلفن ثابت دیگر</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Manager & Negotiator Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Manager */}
                <div className="p-4 rounded-xl bg-[#121212] border border-[#282828] space-y-3">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#1DB954]" />
                    <span>مشخصات مدیر مجموعه</span>
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#A7A7A7] mb-1">نام مدیر</label>
                    <input
                      type="text"
                      value={managerName}
                      onChange={(e) => setManagerName(e.target.value)}
                      placeholder="نام و نام خانوادگی مدیر"
                      className="w-full h-9 px-3 bg-[#282828] rounded text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#1DB954]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#A7A7A7] mb-1">شماره تماس‌های مدیر</label>
                    {managerPhones.map((ph, i) => (
                      <div key={i} className="flex items-center gap-1.5 mb-1.5">
                        <input
                          type="text"
                          dir="ltr"
                          value={ph}
                          onChange={(e) => handleArrayChange(setManagerPhones, i, e.target.value)}
                          placeholder="موبایل شخصی مدیر"
                          className="flex-1 h-8 px-2.5 bg-[#282828] rounded text-xs text-white"
                        />
                        <button
                          type="button"
                          onClick={() => removeArrayItem(setManagerPhones, i)}
                          className="p-1.5 text-[#A7A7A7] hover:text-red-400"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addArrayItem(setManagerPhones)}
                      className="text-[11px] text-[#1DB954] hover:underline"
                    >
                      + افزودن شماره مدیر
                    </button>
                  </div>
                </div>

                {/* Negotiator */}
                <div className="p-4 rounded-xl bg-[#121212] border border-[#282828] space-y-3">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#1DB954]" />
                    <span>مشخصات مذاکره کننده سمت مشتری</span>
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#A7A7A7] mb-1">نام مذاکره کننده</label>
                    <input
                      type="text"
                      value={negotiatorName}
                      onChange={(e) => setNegotiatorName(e.target.value)}
                      placeholder="مثال: خانم احمدی (مدیر داخلی)"
                      className="w-full h-9 px-3 bg-[#282828] rounded text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#1DB954]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#A7A7A7] mb-1">شماره تماس مذاکره کننده</label>
                    {negotiatorPhones.map((ph, i) => (
                      <div key={i} className="flex items-center gap-1.5 mb-1.5">
                        <input
                          type="text"
                          dir="ltr"
                          value={ph}
                          onChange={(e) => handleArrayChange(setNegotiatorPhones, i, e.target.value)}
                          placeholder="شماره مستقیم مذاکره‌کننده"
                          className="flex-1 h-8 px-2.5 bg-[#282828] rounded text-xs text-white"
                        />
                        <button
                          type="button"
                          onClick={() => removeArrayItem(setNegotiatorPhones, i)}
                          className="p-1.5 text-[#A7A7A7] hover:text-red-400"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addArrayItem(setNegotiatorPhones)}
                      className="text-[11px] text-[#1DB954] hover:underline"
                    >
                      + افزودن شماره مذاکره کننده
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Socials, Telegram, Websites */}
          {activeTab === 'socials' && (
            <div className="space-y-6">
              {/* Telegram Special Section */}
              <div className="p-4 rounded-xl bg-[#121212] border border-[#282828] space-y-4">
                <div className="font-bold text-xs text-white flex items-center gap-2">
                  <Send className="w-4 h-4 text-[#229ED9]" />
                  <span>تنظیمات تلگرام</span>
                </div>

                {/* انتخاب شماره تلگرام از شماره‌ها */}
                <div>
                  <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
                    انتخاب شماره تلگرام از شماره‌های ثبت شده
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      value={telegramPhone}
                      onChange={(e) => setTelegramPhone(e.target.value)}
                      className="flex-1 h-10 px-3 bg-[#282828] rounded-md text-xs text-white border border-transparent focus:border-[#1DB954] focus:outline-none"
                    >
                      <option value="">-- شماره تلگرام مشخص نشده --</option>
                      {allAvailablePhones.map((ph, i) => (
                        <option key={i} value={ph}>
                          {ph}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      dir="ltr"
                      value={telegramPhone}
                      onChange={(e) => setTelegramPhone(e.target.value)}
                      placeholder="یا شماره سفارشی دیگر"
                      className="w-48 h-10 px-3 bg-[#282828] rounded-md text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#1DB954]"
                    />
                  </div>
                  <p className="text-[11px] text-[#A7A7A7] mt-1">
                    شماره‌ای که اکانت فعال تلگرام دارد تا لینک مستقیم ارسال پیام برای بازاریاب ایجاد شود.
                  </p>
                </div>

                {/* آیدی های تلگرام */}
                <div>
                  <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
                    آیدی‌های تلگرام (Telegram IDs)
                  </label>
                  <div className="space-y-2">
                    {telegramIds.map((tid, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#A7A7A7]">@</span>
                          <input
                            type="text"
                            dir="ltr"
                            value={tid.replace(/^@/, '')}
                            onChange={(e) => handleArrayChange(setTelegramIds, i, e.target.value)}
                            placeholder="username"
                            className="w-full h-9 pl-7 pr-3 bg-[#282828] rounded-md text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#1DB954]"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeArrayItem(setTelegramIds, i)}
                          className="w-8 h-8 rounded bg-[#282828] hover:bg-red-900/40 text-[#A7A7A7] hover:text-red-400 flex items-center justify-center"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addArrayItem(setTelegramIds)}
                      className="text-xs text-[#1DB954] hover:underline inline-flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>افزودن آیدی تلگرام دیگر</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Instagram IDs */}
              <div className="p-4 rounded-xl bg-[#121212] border border-[#282828] space-y-3">
                <div className="font-bold text-xs text-white flex items-center gap-2">
                  <Instagram className="w-4 h-4 text-[#E1306C]" />
                  <span>آیدی‌های اینستاگرام</span>
                </div>
                <div className="space-y-2">
                  {instagramIds.map((insta, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#A7A7A7]">@</span>
                        <input
                          type="text"
                          dir="ltr"
                          value={insta.replace(/^@/, '')}
                          onChange={(e) => handleArrayChange(setInstagramIds, i, e.target.value)}
                          placeholder="instagram_page"
                          className="w-full h-9 pl-7 pr-3 bg-[#282828] rounded-md text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#1DB954]"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeArrayItem(setInstagramIds, i)}
                        className="w-8 h-8 rounded bg-[#282828] hover:bg-red-900/40 text-[#A7A7A7] hover:text-red-400 flex items-center justify-center"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addArrayItem(setInstagramIds)}
                    className="text-xs text-[#1DB954] hover:underline inline-flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>افزودن پیج اینستاگرام دیگر</span>
                  </button>
                </div>
              </div>

              {/* Websites & Emails */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Websites */}
                <div className="p-4 rounded-xl bg-[#121212] border border-[#282828] space-y-3">
                  <div className="font-bold text-xs text-white flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Globe className="w-4 h-4 text-[#1DB954]" />
                      <span>وب‌سایت‌ها</span>
                    </div>

                    {/* وبسایت فروشگاهی است؟ */}
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isEcommerce}
                        onChange={(e) => setIsEcommerce(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-600 accent-[#1DB954] text-[#1DB954]"
                      />
                      <span className="text-xs font-semibold text-white">فروشگاه اینترنتی دارد؟</span>
                    </label>
                  </div>

                  <div className="space-y-2">
                    {websites.map((web, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          type="url"
                          dir="ltr"
                          value={web}
                          onChange={(e) => handleArrayChange(setWebsites, i, e.target.value)}
                          placeholder="https://example.com"
                          className="flex-1 h-8 px-2.5 bg-[#282828] rounded text-xs text-white"
                        />
                        <button
                          type="button"
                          onClick={() => removeArrayItem(setWebsites, i)}
                          className="p-1.5 text-[#A7A7A7] hover:text-red-400"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addArrayItem(setWebsites)}
                      className="text-xs text-[#1DB954] hover:underline"
                    >
                      + افزودن وب‌سایت
                    </button>
                  </div>
                </div>

                {/* Emails */}
                <div className="p-4 rounded-xl bg-[#121212] border border-[#282828] space-y-3">
                  <div className="font-bold text-xs text-white flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-[#1DB954]" />
                    <span>ایمیل‌ها</span>
                  </div>
                  <div className="space-y-2">
                    {emails.map((em, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          type="email"
                          dir="ltr"
                          value={em}
                          onChange={(e) => handleArrayChange(setEmails, i, e.target.value)}
                          placeholder="info@company.com"
                          className="flex-1 h-8 px-2.5 bg-[#282828] rounded text-xs text-white"
                        />
                        <button
                          type="button"
                          onClick={() => removeArrayItem(setEmails, i)}
                          className="p-1.5 text-[#A7A7A7] hover:text-red-400"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addArrayItem(setEmails)}
                      className="text-xs text-[#1DB954] hover:underline"
                    >
                      + افزودن ایمیل دیگر
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Interview Report & Marketer Assignment with Deadline */}
          {activeTab === 'interview' && (
            <div className="space-y-6">
              {/* Interview Box (گزارش اولین مصاحبه با مشتری) */}
              <div className="p-5 rounded-xl bg-[#121212] border border-[#282828] space-y-4">
                <div className="flex items-center justify-between border-b border-[#282828] pb-3">
                  <div className="font-bold text-sm text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#1DB954]" />
                    <span>گزارش مصاحبه (اولین صحبت با مشتری)</span>
                  </div>
                  <span className="text-[11px] text-[#A7A7A7]">ارزیابی اولیه و پتانسیل مشتری</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* وضعیت مصاحبه */}
                  <div>
                    <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
                      وضعیت مصاحبه
                    </label>
                    <select
                      value={interviewStatus}
                      onChange={(e) => setInterviewStatus(e.target.value)}
                      className="w-full h-10 px-3 bg-[#282828] rounded-md text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#1DB954]"
                    >
                      <option value="مصاحبه اولیه انجام شده">مصاحبه اولیه انجام شده</option>
                      <option value="مشتاق و مستعد">مشتاق و مستعد (High Priority)</option>
                      <option value="نیاز به مشاوره تکمیلی">نیاز به مشاوره تکمیلی</option>
                      <option value="عدم تناسب در مصاحبه">عدم تناسب در مصاحبه</option>
                    </select>
                  </div>

                  {/* امتیاز مصاحبه */}
                  <div>
                    <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
                      امتیاز مصاحبه (از ۱ تا ۱۰): <span className="text-[#1DB954] font-bold font-mono">{interviewScore}</span>
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={interviewScore}
                      onChange={(e) => setInterviewScore(Number(e.target.value))}
                      className="w-full accent-[#1DB954] cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-[#A7A7A7] mt-1 font-mono">
                      <span>۱ (ضعیف)</span>
                      <span>۵ (متوسط)</span>
                      <span>۱۰ (عالی)</span>
                    </div>
                  </div>

                  {/* تاریخ پیگیری بعدی */}
                  <div>
                    <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
                      تاریخ پیگیری بعدی
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        value={nextFollowupDate}
                        onChange={(e) => setNextFollowupDate(e.target.value)}
                        className="w-full h-10 px-3 bg-[#282828] rounded-md text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#1DB954]"
                      />
                    </div>
                  </div>
                </div>

                {/* متن گزارش مصاحبه */}
                <div>
                  <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
                    متن گزارش مصاحبه
                  </label>
                  <textarea
                    rows={4}
                    value={interviewReport}
                    onChange={(e) => setInterviewReport(e.target.value)}
                    placeholder="شرح کامل صحبت‌های انجام شده با مشتری، نیازها، نوع پیشنهاد ارائه شده، لحن برخورد و نکات کلیدی برای پیگیری بعدی..."
                    className="w-full p-3 bg-[#282828] rounded-md text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#1DB954] resize-none leading-relaxed"
                  />
                </div>
              </div>

              {/* Assignment to Marketer with Expiration Countdown */}
              <div className="p-5 rounded-xl bg-[#121212] border border-[#282828] space-y-4">
                <div className="flex items-center gap-2 font-bold text-sm text-white">
                  <Clock className="w-4 h-4 text-[#F59B23]" />
                  <span>تخصیص به بازاریاب و مهلت زمانی پیگیری</span>
                </div>
                <div className="p-3 bg-[#282828]/50 rounded-lg text-xs text-[#A7A7A7] leading-relaxed">
                  <strong className="text-white">توجه: </strong>
                  طبق قوانین داخلی، هر مشتری برای مدت مشخص به بازاریاب متصل است تا در آن بازه قرارداد را منعقد نماید. با پایان مهلت، دسترسی بازاریاب منقضی شده و مشتری به صندوق اشتراکی بازمی‌گردد.
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Marketer Selector */}
                  <div>
                    <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
                      بازاریاب متصل شده
                    </label>
                    <select
                      value={assignedMarketerId}
                      onChange={(e) => setAssignedMarketerId(e.target.value)}
                      className="w-full h-10 px-3 bg-[#282828] rounded-md text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#1DB954]"
                    >
                      {personnelList.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.role === 'marketer' ? 'بازاریاب' : 'پرسنل'})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Duration days */}
                  <div>
                    <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
                      مهلت بازاریاب برای تبدیل مشتری
                    </label>
                    <select
                      value={assignmentDurationDays}
                      onChange={(e) => setAssignmentDurationDays(Number(e.target.value))}
                      className="w-full h-10 px-3 bg-[#282828] rounded-md text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#1DB954]"
                    >
                      <option value={3}>۳ روز (پیگیری فوری)</option>
                      <option value={7}>۷ روز (استاندارد)</option>
                      <option value={14}>۱۴ روز (پروژه‌های متوسط)</option>
                      <option value={30}>۳۰ روز (شرکت‌های بزرگ)</option>
                    </select>
                  </div>

                  {/* Initial Negotiation Status */}
                  <div>
                    <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
                      وضعیت مذاکره اولیه
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as NegotiationStatus)}
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
                </div>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-[#282828] flex items-center justify-between">
            <div className="text-xs text-[#A7A7A7]">
              {activeTab === 'info' && 'مرحله ۱ از ۳: اطلاعات عمومی'}
              {activeTab === 'socials' && 'مرحله ۲ از ۳: راه‌های ارتباط مجازی'}
              {activeTab === 'interview' && 'مرحله ۳ از ۳: مصاحبه و تخصیص'}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="h-10 px-5 rounded-full border border-[#535353] hover:border-white text-xs font-semibold text-[#B3B3B3] hover:text-white transition-colors"
              >
                انصراف
              </button>

              {activeTab !== 'interview' ? (
                <button
                  type="button"
                  onClick={() => setActiveTab(activeTab === 'info' ? 'socials' : 'interview')}
                  className="h-10 px-6 rounded-full bg-[#282828] hover:bg-[#333333] text-xs font-bold text-white transition-colors"
                >
                  مرحله بعدی
                </button>
              ) : null}

              <button
                type="submit"
                disabled={saving}
                className="h-10 px-7 rounded-full bg-[#1DB954] hover:bg-[#1ED760] disabled:opacity-50 text-xs font-bold text-black transition-all hover:scale-[1.02] shadow-lg shadow-[#1DB954]/20"
              >
                {saving ? 'در حال ذخیره‌سازی...' : editingCustomer ? 'به‌روزرسانی پرونده' : 'تأیید و ثبت پرونده مشتری'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
