import React, { useState } from 'react';
import {
  PhoneCall,
  X,
  User,
  Tag,
  FileText,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { ColdLead, Personnel, AuthUser } from '../types';

interface AddColdLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddLead: (lead: Partial<ColdLead>) => Promise<void>;
  personnelList: Personnel[];
  currentPersonnel?: Personnel | null;
  currentUser?: AuthUser | null;
  isAdmin?: boolean;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const COMMON_SOURCES = [
  'دایرکت اینستاگرام',
  'پیام تلگرام',
  'وب‌سایت / فرم تماس',
  'تماس تلفنی ورودی',
  'معرفی مشتریان یا همکاران',
  'تبلیغات پیامکی و بنری',
  'نمایشگاه و همایش',
  'بانک شماره سرد',
  'سایر کانال‌ها',
];

export const AddColdLeadModal: React.FC<AddColdLeadModalProps> = ({
  isOpen,
  onClose,
  onAddLead,
  personnelList,
  currentPersonnel,
  currentUser,
  isAdmin = false,
  showToast,
}) => {
  const userIsAdmin = Boolean(
    isAdmin ||
    currentUser?.is_admin ||
    currentUser?.app_role === 'admin' ||
    currentPersonnel?.role === 'admin'
  );

  const [phoneNumber, setPhoneNumber] = useState('');
  const [contactName, setContactName] = useState('');
  const [source, setSource] = useState('دایرکت اینستاگرام');
  const [notes, setNotes] = useState('');
  const [assignedTo, setAssignedTo] = useState<string>(
    currentPersonnel?.id || currentUser?.id || personnelList[0]?.id || ''
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phoneNumber.trim();
    if (!cleanPhone) {
      setError('لطفاً شماره تماس را وارد نمایید.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onAddLead({
        phone_number: cleanPhone,
        contact_name: contactName.trim() || undefined,
        source: source.trim() || 'دایرکت اینستاگرام',
        notes: notes.trim() || undefined,
        assigned_to: assignedTo || currentPersonnel?.id || currentUser?.id || '',
        status: 'تماس نگرفته',
      });

      showToast?.(`شماره «${cleanPhone}» با موفقیت در بانک لیدها ثبت شد.`, 'success');
      // Reset form
      setPhoneNumber('');
      setContactName('');
      setNotes('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'خطا در ثبت شماره');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-[#181818] border border-[#2e2e2e] rounded-2xl shadow-2xl shadow-black/90 overflow-hidden text-right">
        {/* Header decoration bar */}
        <div className="h-1 bg-gradient-to-r from-blue-500 via-[#1DB954] to-emerald-400" />

        {/* Top Header */}
        <div className="p-4 sm:p-5 flex items-center justify-between border-b border-[#282828] bg-[#141414]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 flex-shrink-0 shadow-md">
              <PhoneCall className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white">افزودن سریع شماره</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-semibold border border-blue-500/30">
                  بانک لید سرد
                </span>
              </div>
              <p className="text-xs text-[#888] mt-0.5">
                ثبت آنی شماره تماس جهت پیگیری و شروع مذاکره کارشناسان
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[#888] hover:text-white hover:bg-[#282828] transition-colors"
            title="بستن"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/50 text-red-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Phone Number Field */}
          <div>
            <label className="block text-xs font-bold text-[#CCCCCC] mb-1.5">
              شماره تماس مستقیم *
            </label>
            <div className="relative">
              <input
                type="tel"
                dir="ltr"
                autoFocus
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="مثال: 09123456789 یا 02188990011"
                className="w-full h-11 px-3.5 pr-10 bg-[#121212] border border-[#333] focus:border-[#1DB954] focus:ring-1 focus:ring-[#1DB954] rounded-xl text-sm text-white placeholder-[#555] font-mono transition-all text-left"
              />
              <PhoneCall className="w-4 h-4 text-[#777] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <p className="text-[11px] text-[#777] mt-1">
              پشتیبانی از موبایل و تلفن ثابت به همراه پیش‌شماره
            </p>
          </div>

          {/* Contact / Company Name */}
          <div>
            <label className="block text-xs font-bold text-[#CCCCCC] mb-1.5">
              نام مخاطب / عنوان شرکت (اختیاری)
            </label>
            <div className="relative">
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="مثال: آقای محمدی - فروشگاه نوین"
                className="w-full h-10 px-3.5 pr-10 bg-[#121212] border border-[#333] focus:border-[#1DB954] rounded-xl text-xs sm:text-sm text-white placeholder-[#555] transition-all"
              />
              <User className="w-4 h-4 text-[#777] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Source & Assigned To Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-[#CCCCCC] mb-1.5">
                کانال و منبع دریافت
              </label>
              <div className="relative">
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full h-10 px-3 bg-[#121212] border border-[#333] focus:border-[#1DB954] rounded-xl text-xs text-white transition-all appearance-none cursor-pointer"
                >
                  {COMMON_SOURCES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <Tag className="w-3.5 h-3.5 text-[#777] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {userIsAdmin ? (
              <div>
                <label className="block text-xs font-bold text-[#CCCCCC] mb-1.5">
                  تخصیص به بازاریاب مسئول
                </label>
                <div className="relative">
                  <select
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="w-full h-10 px-3 bg-[#121212] border border-[#333] focus:border-[#1DB954] rounded-xl text-xs text-white transition-all appearance-none cursor-pointer"
                  >
                    {personnelList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.role === 'admin' ? 'مدیر' : 'کارشناس'})
                      </option>
                    ))}
                  </select>
                  <UserCheck className="w-3.5 h-3.5 text-[#777] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-[#CCCCCC] mb-1.5">
                  کارشناس ثبت‌کننده
                </label>
                <div className="h-10 px-3 bg-[#161616] border border-[#2a2a2a] rounded-xl text-xs text-[#999] flex items-center justify-between">
                  <span>{currentPersonnel?.name || currentUser?.name || 'کارشناس'}</span>
                  <span className="text-[10px] text-[#1DB954] bg-[#1DB954]/10 px-1.5 py-0.5 rounded">
                    شخصی
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Notes Field */}
          <div>
            <label className="block text-xs font-bold text-[#CCCCCC] mb-1.5">
              یادداشت و توضیحات اولیه (اختیاری)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثلاً: در دایرکت درخواست قیمت داد، گفتند فردا ساعت ۱۰ تماس بگیرید..."
              className="w-full p-3 bg-[#121212] border border-[#333] focus:border-[#1DB954] rounded-xl text-xs text-white placeholder-[#555] transition-all resize-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-[#282828]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl bg-[#242424] hover:bg-[#2c2c2c] text-[#BBB] hover:text-white text-xs font-bold transition-all"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-[#1DB954] hover:bg-[#1ed760] disabled:bg-[#1DB954]/50 text-black font-extrabold text-xs shadow-lg shadow-[#1DB954]/25 flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
              )}
              <span>ثبت شماره در بانک لیدها</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
