import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  User,
  Shield,
  KeyRound,
  CreditCard,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  DollarSign,
  Plus,
  Trash2,
  Check,
  X,
  LogOut,
  Sparkles,
  Phone,
  Mail,
  Building,
  UserCheck,
  Send,
  Eye,
  EyeOff,
  Filter,
  Search,
  ChevronDown,
  Info,
  CalendarDays,
  Timer,
  Wallet,
  Coins,
  Upload,
  Camera,
  ImageIcon,
} from 'lucide-react';
import {
  LeaveRequest,
  SalaryAdvanceRequest,
  Personnel,
  AuthUser,
  LeaveType,
  RequestStatus,
  UserProfileUpdatePayload,
  PasswordChangePayload,
} from '../types';
import {
  formatPersianDate,
  formatPersianDateTime,
  formatToman,
  toPersianDigits,
  gregorianIsoToJalali,
  getTodayJalali,
  JALALI_MONTH_NAMES,
} from '../utils';
import { PersianDatePicker } from './PersianDatePicker';
import { uploadAvatar } from '../api';

export type PortalTab = 'profile' | 'advance' | 'leave' | 'logout';

interface PersonalPortalViewProps {
  currentPersonnel: Personnel | null;
  currentUser: AuthUser | null;
  isAdmin: boolean;
  leaveRequests: LeaveRequest[];
  advanceRequests: SalaryAdvanceRequest[];
  personnelList: Personnel[];
  initialTab?: PortalTab;
  onUpdateProfile: (payload: UserProfileUpdatePayload) => Promise<void>;
  onChangePassword: (payload: PasswordChangePayload) => Promise<void>;
  onCreateLeaveRequest: (payload: Partial<LeaveRequest>) => Promise<void>;
  onUpdateLeaveStatus: (id: string, status: RequestStatus, managerNote?: string) => Promise<void>;
  onDeleteLeaveRequest: (id: string) => Promise<void>;
  onCreateAdvanceRequest: (payload: Partial<SalaryAdvanceRequest>) => Promise<void>;
  onUpdateAdvanceStatus: (id: string, status: RequestStatus, approvedAmount?: number, managerNote?: string) => Promise<void>;
  onDeleteAdvanceRequest: (id: string) => Promise<void>;
  onLogout: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const PersonalPortalView: React.FC<PersonalPortalViewProps> = ({
  currentPersonnel,
  currentUser,
  isAdmin,
  leaveRequests,
  advanceRequests,
  personnelList,
  initialTab = 'profile',
  onUpdateProfile,
  onChangePassword,
  onCreateLeaveRequest,
  onUpdateLeaveStatus,
  onDeleteLeaveRequest,
  onCreateAdvanceRequest,
  onUpdateAdvanceStatus,
  onDeleteAdvanceRequest,
  onLogout,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<PortalTab>(initialTab);

  useEffect(() => {
    if (initialTab === 'logout') {
      setShowLogoutConfirm(true);
    } else if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Profile Form State
  const [profileName, setProfileName] = useState(currentPersonnel?.name || currentUser?.name || '');
  const [profilePhone, setProfilePhone] = useState(currentPersonnel?.phone || '');
  const [profileAvatar, setProfileAvatar] = useState(currentPersonnel?.avatar || '');
  const [profileBankCard, setProfileBankCard] = useState(currentPersonnel?.bank_card_number || '');
  const [profileIban, setProfileIban] = useState(currentPersonnel?.iban || '');
  const [profileNationalId, setProfileNationalId] = useState(currentPersonnel?.national_id || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('لطفاً یک فایل تصویری معتبر (JPG, PNG, WEBP) انتخاب نمایید.', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('حجم فایل تصویر نباید بیشتر از ۵ مگابایت باشد.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      setProfileAvatar(dataUrl);
      setIsUploadingAvatar(true);
      try {
        const res = await uploadAvatar(dataUrl, file.name);
        if (res.avatarUrl) {
          setProfileAvatar(res.avatarUrl);
          showToast('تصویر پروفایل شما با موفقیت بارگذاری شد.', 'success');
        }
      } catch (err: any) {
        showToast('خطا در بارگذاری تصویر: ' + (err.message || 'خطای نامشخص'), 'error');
      } finally {
        setIsUploadingAvatar(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Leave Request Form State
  const [leaveType, setLeaveType] = useState<LeaveType>('daily');
  const [leaveStartDate, setLeaveStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [leaveEndDate, setLeaveEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [leaveStartTime, setLeaveStartTime] = useState('09:00');
  const [leaveEndTime, setLeaveEndTime] = useState('13:00');
  const [leaveReason, setLeaveReason] = useState('');
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);

  // Salary Advance Form State
  const [advanceAmount, setAdvanceAmount] = useState<string>('5000000');
  const [advanceMonth, setAdvanceMonth] = useState('مهر ۱۴۰۵');
  const [advanceNeededDate, setAdvanceNeededDate] = useState(
    new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [advanceReason, setAdvanceReason] = useState('');
  const [advanceCard, setAdvanceCard] = useState(profileBankCard || '');
  const [advanceIban, setAdvanceIban] = useState(profileIban || '');
  const [isSubmittingAdvance, setIsSubmittingAdvance] = useState(false);

  // Admin Review State
  const [reviewModalItem, setReviewModalItem] = useState<{
    type: 'leave' | 'advance';
    item: LeaveRequest | SalaryAdvanceRequest;
  } | null>(null);
  const [reviewAction, setReviewAction] = useState<'approved' | 'rejected'>('approved');
  const [reviewApprovedAmount, setReviewApprovedAmount] = useState<string>('');
  const [reviewManagerNote, setReviewManagerNote] = useState('');
  const [isProcessingReview, setIsProcessingReview] = useState(false);

  // Filters for lists
  const [leaveStatusFilter, setLeaveStatusFilter] = useState<string>('all');
  const [advanceStatusFilter, setAdvanceStatusFilter] = useState<string>('all');
  const [leaveSearch, setLeaveSearch] = useState('');
  const [advanceSearch, setAdvanceSearch] = useState('');

  // Logout confirmation modal
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Auto calculate hourly duration
  const calculatedHourlyDuration = useMemo(() => {
    if (leaveType !== 'hourly' || !leaveStartTime || !leaveEndTime) return 0;
    try {
      const [sh, sm] = leaveStartTime.split(':').map(Number);
      const [eh, em] = leaveEndTime.split(':').map(Number);
      const startMin = sh * 60 + sm;
      const endMin = eh * 60 + em;
      const diffMin = Math.max(0, endMin - startMin);
      return Number((diffMin / 60).toFixed(1));
    } catch {
      return 0;
    }
  }, [leaveType, leaveStartTime, leaveEndTime]);

  // Handle Profile Update
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) {
      showToast('لطفاً نام و نام خانوادگی را وارد کنید.', 'error');
      return;
    }
    setIsSavingProfile(true);
    try {
      await onUpdateProfile({
        name: profileName,
        phone: profilePhone,
        avatar: profileAvatar,
        bank_card_number: profileBankCard,
        iban: profileIban,
        national_id: profileNationalId,
      });
      showToast('مشخصات پروفایل با موفقیت ذخیره شد.', 'success');
    } catch (err: any) {
      showToast(err.message || 'خطا در ذخیره پروفایل', 'error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Handle Password Change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      showToast('رمز عبور جدید باید حداقل ۶ کاراکتر باشد.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('تکرار رمز عبور با رمز جدید همخوانی ندارد.', 'error');
      return;
    }
    setIsChangingPassword(true);
    try {
      await onChangePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      showToast('رمز عبور شما با موفقیت تغییر کرد.', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      showToast(err.message || 'خطا در تغییر رمز عبور', 'error');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Handle Submit Leave Request
  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveReason.trim()) {
      showToast('لطفاً علت مرخصی را شرح دهید.', 'error');
      return;
    }
    setIsSubmittingLeave(true);
    try {
      await onCreateLeaveRequest({
        leave_type: leaveType,
        start_date: leaveStartDate,
        end_date: leaveType === 'daily' ? leaveEndDate : null,
        start_time: leaveType === 'hourly' ? leaveStartTime : null,
        end_time: leaveType === 'hourly' ? leaveEndTime : null,
        hours_count: leaveType === 'hourly' ? calculatedHourlyDuration : null,
        reason: leaveReason,
        personnel_id: currentPersonnel?.id || currentUser?.id || 'p-1',
        personnel_name: currentPersonnel?.name || currentUser?.name || 'کارشناس شرکت',
      });
      showToast('درخواست مرخصی شما با موفقیت ثبت شد و برای مدیریت ارسال گردید.', 'success');
      setLeaveReason('');
    } catch (err: any) {
      showToast(err.message || 'خطا در ثبت درخواست مرخصی', 'error');
    } finally {
      setIsSubmittingLeave(false);
    }
  };

  // Handle Submit Advance Request
  const handleSubmitAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(advanceAmount.replace(/[^0-9]/g, ''));
    if (!numAmount || numAmount <= 0) {
      showToast('لطفاً مبلغ معتبری برای مساعده وارد کنید.', 'error');
      return;
    }
    if (!advanceReason.trim()) {
      showToast('لطفاً علت درخواست مساعده را ذکر کنید.', 'error');
      return;
    }
    setIsSubmittingAdvance(true);
    try {
      await onCreateAdvanceRequest({
        amount: numAmount,
        target_month: advanceMonth,
        needed_date: advanceNeededDate,
        reason: advanceReason,
        bank_card_number: advanceCard || profileBankCard,
        iban: advanceIban || profileIban,
        personnel_id: currentPersonnel?.id || currentUser?.id || 'p-1',
        personnel_name: currentPersonnel?.name || currentUser?.name || 'کارشناس شرکت',
      });
      showToast('درخواست مساعده با موفقیت ثبت شد و در صف بررسی مدیریت قرار گرفت.', 'success');
      setAdvanceReason('');
    } catch (err: any) {
      showToast(err.message || 'خطا در ثبت درخواست مساعده', 'error');
    } finally {
      setIsSubmittingAdvance(false);
    }
  };

  // Handle Admin Review Modal Submit
  const handleConfirmReview = async () => {
    if (!reviewModalItem) return;
    setIsProcessingReview(true);
    try {
      if (reviewModalItem.type === 'leave') {
        await onUpdateLeaveStatus(
          reviewModalItem.item.id,
          reviewAction,
          reviewManagerNote
        );
        showToast(
          `درخواست مرخصی با موفقیت ${reviewAction === 'approved' ? 'تایید' : 'رد'} شد.`,
          'success'
        );
      } else {
        const approvedNum =
          reviewAction === 'approved' && reviewApprovedAmount
            ? Number(reviewApprovedAmount.replace(/[^0-9]/g, ''))
            : (reviewModalItem.item as SalaryAdvanceRequest).amount;

        await onUpdateAdvanceStatus(
          reviewModalItem.item.id,
          reviewAction,
          approvedNum,
          reviewManagerNote
        );
        showToast(
          `درخواست مساعده با موفقیت ${reviewAction === 'approved' ? 'تایید' : 'رد'} شد.`,
          'success'
        );
      }
      setReviewModalItem(null);
      setReviewManagerNote('');
      setReviewApprovedAmount('');
    } catch (err: any) {
      showToast(err.message || 'خطا در اعمال وضعیت درخواست', 'error');
    } finally {
      setIsProcessingReview(false);
    }
  };

  // Filtered Leave Requests
  const filteredLeaveRequests = useMemo(() => {
    return leaveRequests.filter((r) => {
      if (leaveStatusFilter !== 'all' && r.status !== leaveStatusFilter) return false;
      if (leaveSearch.trim()) {
        const q = leaveSearch.toLowerCase();
        const matchName = r.personnel_name?.toLowerCase().includes(q);
        const matchReason = r.reason?.toLowerCase().includes(q);
        if (!matchName && !matchReason) return false;
      }
      return true;
    });
  }, [leaveRequests, leaveStatusFilter, leaveSearch]);

  // Filtered Advance Requests
  const filteredAdvanceRequests = useMemo(() => {
    return advanceRequests.filter((r) => {
      if (advanceStatusFilter !== 'all' && r.status !== advanceStatusFilter) return false;
      if (advanceSearch.trim()) {
        const q = advanceSearch.toLowerCase();
        const matchName = r.personnel_name?.toLowerCase().includes(q);
        const matchReason = r.reason?.toLowerCase().includes(q);
        if (!matchName && !matchReason) return false;
      }
      return true;
    });
  }, [advanceRequests, advanceStatusFilter, advanceSearch]);

  // Status Theme Helper
  const getRequestStatusBadge = (status: RequestStatus) => {
    switch (status) {
      case 'approved':
        return {
          label: 'تایید شده',
          bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
          icon: CheckCircle2,
        };
      case 'rejected':
        return {
          label: 'رد شده',
          bg: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
          icon: XCircle,
        };
      default:
        return {
          label: 'در انتظار بررسی',
          bg: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
          icon: Clock,
        };
    }
  };

  const pendingLeavesCount = leaveRequests.filter((r) => r.status === 'pending').length;
  const pendingAdvancesCount = advanceRequests.filter((r) => r.status === 'pending').length;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* ------------------------------------------------------------- */}
      {/* 1. TOP HEADER & SUB-MENUS */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-[#121212] border border-[#282828] rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1DB954] to-[#14833b] text-black font-black text-xl flex items-center justify-center shadow-lg shadow-[#1DB954]/20 overflow-hidden border-2 border-[#1DB954]">
                {profileAvatar ? (
                  <img src={profileAvatar} alt={profileName} className="w-full h-full object-cover" />
                ) : (
                  <span>{profileName.charAt(0) || 'ک'}</span>
                )}
              </div>
              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#1DB954] rounded-full border-2 border-[#121212]" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  پنل شخصی و امور پرسنلی
                </h1>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#1DB954]/15 text-[#1DB954] font-bold border border-[#1DB954]/30">
                  {isAdmin ? 'مدیر سیستم' : 'کارشناس فروش و مذاکره'}
                </span>
              </div>
              <p className="text-xs text-[#A7A7A7] mt-0.5">
                {profileName} ({currentPersonnel?.email || currentUser?.email || 'کاربر سیستم'})
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>خروج از حساب</span>
          </button>
        </div>

        {/* Navigation Tabs (Sub-menus) */}
        <div className="flex items-center gap-2 border-t border-[#222] pt-4 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'profile'
                ? 'bg-[#1DB954] text-black shadow-lg shadow-[#1DB954]/25 scale-[1.02]'
                : 'bg-[#181818] hover:bg-[#222] text-[#B3B3B3] hover:text-white border border-[#282828]'
            }`}
          >
            <User className="w-4 h-4" />
            <span>پروفایل و امنیت</span>
          </button>

          <button
            onClick={() => setActiveTab('leave')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap relative ${
              activeTab === 'leave'
                ? 'bg-[#1DB954] text-black shadow-lg shadow-[#1DB954]/25 scale-[1.02]'
                : 'bg-[#181818] hover:bg-[#222] text-[#B3B3B3] hover:text-white border border-[#282828]'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>درخواست مرخصی</span>
            {pendingLeavesCount > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  activeTab === 'leave'
                    ? 'bg-black text-[#1DB954]'
                    : 'bg-amber-500 text-black'
                }`}
              >
                {toPersianDigits(pendingLeavesCount)}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('advance')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap relative ${
              activeTab === 'advance'
                ? 'bg-[#1DB954] text-black shadow-lg shadow-[#1DB954]/25 scale-[1.02]'
                : 'bg-[#181818] hover:bg-[#222] text-[#B3B3B3] hover:text-white border border-[#282828]'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>درخواست مساعده</span>
            {pendingAdvancesCount > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  activeTab === 'advance'
                    ? 'bg-black text-[#1DB954]'
                    : 'bg-amber-500 text-black'
                }`}
              >
                {toPersianDigits(pendingAdvancesCount)}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. TAB 1: PROFILE & SECURITY */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Details Form */}
          <div className="lg:col-span-2 bg-[#181818] border border-[#282828] rounded-2xl p-5 sm:p-6 space-y-6">
            <div className="flex items-center gap-2 border-b border-[#282828] pb-4">
              <User className="w-5 h-5 text-[#1DB954]" />
              <div>
                <h3 className="text-base font-bold text-white">اطلاعات هویتی و پرسنلی</h3>
                <p className="text-xs text-[#888]">
                  مشخصات خود را تکمیل کنید تا در احکام و واریزی‌های مساعده استفاده شود.
                </p>
              </div>
            </div>

            {/* Avatar File Upload */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#B3B3B3] flex items-center justify-between">
                <span>تصویر پروفایل (آواتار پرسنلی):</span>
                {profileAvatar && (
                  <button
                    type="button"
                    onClick={() => setProfileAvatar('')}
                    className="text-[11px] text-rose-400 hover:underline"
                  >
                    حذف تصویر
                  </button>
                )}
              </label>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/webp, image/gif"
                onChange={handleAvatarFileChange}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className={`p-4 sm:p-5 rounded-2xl border-2 border-dashed transition-all flex flex-col sm:flex-row items-center gap-4 cursor-pointer group ${
                  profileAvatar
                    ? 'bg-[#121212] border-[#1DB954]/50 hover:border-[#1DB954]'
                    : 'bg-[#121212] border-[#333] hover:border-[#1DB954] hover:bg-[#161616]'
                }`}
              >
                {/* Avatar Preview */}
                <div className="relative flex-shrink-0">
                  <div className="w-16 h-16 rounded-2xl bg-[#222] border-2 border-[#1DB954] overflow-hidden flex items-center justify-center text-white font-black text-xl shadow-lg shadow-black/40">
                    {profileAvatar ? (
                      <img
                        src={profileAvatar}
                        alt="avatar preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-[#1DB954] text-lg font-bold">
                        {profileName.charAt(0) || 'ک'}
                      </span>
                    )}
                  </div>
                  {isUploadingAvatar && (
                    <div className="absolute inset-0 bg-black/70 rounded-2xl flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-[#1DB954] border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>

                {/* Upload Action Description */}
                <div className="flex-1 text-center sm:text-right space-y-1">
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <Upload className="w-4 h-4 text-[#1DB954]" />
                    <span className="text-xs font-bold text-white group-hover:text-[#1DB954] transition-colors">
                      {profileAvatar ? 'کلیک کنید برای تغییر تصویر' : 'انتخاب یا بارگذاری تصویر جدید'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#777]">
                    فرمت‌های مجاز: JPG, PNG, WEBP (حداکثر ۵ مگابایت) • ذخیره مستقیم در پایگاه داده
                  </p>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-[#222] group-hover:bg-[#1DB954] text-white group-hover:text-black font-bold text-xs border border-[#333] transition-all flex items-center gap-1.5 flex-shrink-0"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>انتخاب فایل</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
                    نام و نام خانوادگی
                  </label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    required
                    className="w-full h-10 px-3 bg-[#121212] rounded-xl text-xs text-white border border-[#2c2c2c] focus:border-[#1DB954] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
                    شماره موبایل
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    placeholder="0912..."
                    className="w-full h-10 px-3 bg-[#121212] rounded-xl text-xs text-white border border-[#2c2c2c] focus:border-[#1DB954] focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
                    کد ملی
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={profileNationalId}
                    onChange={(e) => setProfileNationalId(e.target.value)}
                    placeholder="۰۰۱۲۳۴۵۶۷۸"
                    className="w-full h-10 px-3 bg-[#121212] rounded-xl text-xs text-white border border-[#2c2c2c] focus:border-[#1DB954] focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
                    ایمیل کاربری (غیرقابل ویرایش)
                  </label>
                  <input
                    type="email"
                    dir="ltr"
                    disabled
                    value={currentPersonnel?.email || currentUser?.email || ''}
                    className="w-full h-10 px-3 bg-[#1e1e1e] rounded-xl text-xs text-[#777] border border-[#2c2c2c] cursor-not-allowed font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
                    شماره کارت بانکی (جهت واریز مساعده و حقوق)
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={profileBankCard}
                    onChange={(e) => setProfileBankCard(e.target.value)}
                    placeholder="6037-9975-..."
                    className="w-full h-10 px-3 bg-[#121212] rounded-xl text-xs text-white border border-[#2c2c2c] focus:border-[#1DB954] focus:outline-none font-mono tracking-wider"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
                    شماره شبا (IBAN)
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={profileIban}
                    onChange={(e) => setProfileIban(e.target.value)}
                    placeholder="IR12017..."
                    className="w-full h-10 px-3 bg-[#121212] rounded-xl text-xs text-white border border-[#2c2c2c] focus:border-[#1DB954] focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-6 py-2.5 rounded-xl bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold text-xs shadow-lg shadow-[#1DB954]/25 transition-all disabled:opacity-50"
                >
                  {isSavingProfile ? 'در حال ذخیره...' : 'ذخیره مشخصات پروفایل'}
                </button>
              </div>
            </form>
          </div>

          {/* Change Password Card */}
          <div className="bg-[#181818] border border-[#282828] rounded-2xl p-5 sm:p-6 space-y-6">
            <div className="flex items-center gap-2 border-b border-[#282828] pb-4">
              <KeyRound className="w-5 h-5 text-[#1DB954]" />
              <div>
                <h3 className="text-base font-bold text-white">تغییر رمز عبور</h3>
                <p className="text-xs text-[#888]">رمز عبور ورود به سامانه را تغییر دهید.</p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
                  رمز عبور فعلی (اختیاری)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    dir="ltr"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-10 px-3 bg-[#121212] rounded-xl text-xs text-white border border-[#2c2c2c] focus:border-[#1DB954] focus:outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#777] hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
                  رمز عبور جدید (حداقل ۶ کاراکتر)
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  dir="ltr"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full h-10 px-3 bg-[#121212] rounded-xl text-xs text-white border border-[#2c2c2c] focus:border-[#1DB954] focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
                  تکرار رمز عبور جدید
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  dir="ltr"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full h-10 px-3 bg-[#121212] rounded-xl text-xs text-white border border-[#2c2c2c] focus:border-[#1DB954] focus:outline-none font-mono"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="w-full py-2.5 rounded-xl bg-[#282828] hover:bg-[#333] text-white border border-[#3e3e3e] font-bold text-xs transition-all disabled:opacity-50"
                >
                  {isChangingPassword ? 'در حال ثبت...' : 'بروزرسانی رمز عبور'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. TAB 2: LEAVE REQUESTS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'leave' && (
        <div className="space-y-6">
          {/* New Leave Request Form */}
          <div className="bg-[#181818] border border-[#282828] rounded-2xl p-5 sm:p-6 space-y-5">
            <div className="flex items-center gap-2 border-b border-[#282828] pb-3">
              <CalendarDays className="w-5 h-5 text-[#1DB954]" />
              <div>
                <h3 className="text-base font-bold text-white">ثبت درخواست مرخصی جدید</h3>
                <p className="text-xs text-[#888]">
                  مرخصی‌های روزانه و ساعتی خود را ثبت کنید تا به اطلاع مدیریت برسد.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmitLeave} className="space-y-4">
              {/* Type Switcher: Daily vs Hourly */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-[#B3B3B3]">نوع مرخصی:</span>
                <div className="flex items-center gap-2 bg-[#121212] p-1 rounded-xl border border-[#282828]">
                  <button
                    type="button"
                    onClick={() => setLeaveType('daily')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      leaveType === 'daily'
                        ? 'bg-[#1DB954] text-black shadow-sm'
                        : 'text-[#888] hover:text-white'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>مرخصی روزانه</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLeaveType('hourly')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      leaveType === 'hourly'
                        ? 'bg-[#1DB954] text-black shadow-sm'
                        : 'text-[#888] hover:text-white'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>مرخصی ساعتی</span>
                  </button>
                </div>
              </div>

              {/* Conditional Date / Time Fields */}
              {leaveType === 'daily' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <PersianDatePicker
                      label="از تاریخ (شروع مرخصی)"
                      value={leaveStartDate}
                      onChange={(iso) => setLeaveStartDate(iso)}
                    />
                  </div>
                  <div>
                    <PersianDatePicker
                      label="تا تاریخ (پایان مرخصی)"
                      value={leaveEndDate}
                      onChange={(iso) => setLeaveEndDate(iso)}
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <PersianDatePicker
                      label="تاریخ مرخصی ساعتی"
                      value={leaveStartDate}
                      onChange={(iso) => setLeaveStartDate(iso)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
                      از ساعت
                    </label>
                    <input
                      type="time"
                      value={leaveStartTime}
                      onChange={(e) => setLeaveStartTime(e.target.value)}
                      className="w-full h-10 px-3 bg-[#121212] rounded-xl text-xs text-white border border-[#2c2c2c] focus:border-[#1DB954] focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
                      تا ساعت
                    </label>
                    <input
                      type="time"
                      value={leaveEndTime}
                      onChange={(e) => setLeaveEndTime(e.target.value)}
                      className="w-full h-10 px-3 bg-[#121212] rounded-xl text-xs text-white border border-[#2c2c2c] focus:border-[#1DB954] focus:outline-none font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Duration Preview for Hourly */}
              {leaveType === 'hourly' && (
                <div className="text-xs text-[#A7A7A7] bg-[#121212] p-2.5 rounded-xl border border-[#282828] flex items-center justify-between">
                  <span>مدت زمان مرخصی محاسبه شده:</span>
                  <span className="text-[#1DB954] font-bold font-mono text-sm">
                    {toPersianDigits(calculatedHourlyDuration)} ساعت
                  </span>
                </div>
              )}

              {/* Reason Field */}
              <div>
                <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
                  علت و شرح مرخصی *
                </label>
                <textarea
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  placeholder="شرح کامل دلیل درخواست مرخصی..."
                  rows={3}
                  required
                  className="w-full p-3 bg-[#121212] rounded-xl text-xs text-white border border-[#2c2c2c] focus:border-[#1DB954] focus:outline-none leading-relaxed"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSubmittingLeave}
                  className="px-6 py-2.5 rounded-xl bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold text-xs shadow-lg shadow-[#1DB954]/25 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmittingLeave ? 'در حال ثبت...' : 'ارسال درخواست مرخصی'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* List of Leave Requests */}
          <div className="bg-[#181818] border border-[#282828] rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#282828] pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#1DB954]" />
                <h3 className="text-sm font-bold text-white">
                  {isAdmin ? 'همه درخواست‌های مرخصی پرسنل' : 'درخواست‌های مرخصی من'}
                </h3>
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-[#242424] text-[#A7A7A7]">
                  {toPersianDigits(filteredLeaveRequests.length)} مورد
                </span>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <select
                  value={leaveStatusFilter}
                  onChange={(e) => setLeaveStatusFilter(e.target.value)}
                  className="h-8 px-3 rounded-xl bg-[#121212] text-xs text-white border border-[#2c2c2c] focus:outline-none"
                >
                  <option value="all">همه وضعیت‌ها</option>
                  <option value="pending">در انتظار بررسی</option>
                  <option value="approved">تایید شده</option>
                  <option value="rejected">رد شده</option>
                </select>

                {isAdmin && (
                  <input
                    type="text"
                    value={leaveSearch}
                    onChange={(e) => setLeaveSearch(e.target.value)}
                    placeholder="جستجو در علت یا نام..."
                    className="h-8 px-3 rounded-xl bg-[#121212] text-xs text-white border border-[#2c2c2c] focus:outline-none w-36 sm:w-44"
                  />
                )}
              </div>
            </div>

            {/* Requests Table / Cards */}
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-[#282828] text-[#888]">
                    <th className="py-2.5 px-3 font-semibold">متقاضی</th>
                    <th className="py-2.5 px-3 font-semibold">نوع مرخصی</th>
                    <th className="py-2.5 px-3 font-semibold">بازه زمانی / ساعت</th>
                    <th className="py-2.5 px-3 font-semibold">علت</th>
                    <th className="py-2.5 px-3 font-semibold">وضعیت</th>
                    <th className="py-2.5 px-3 font-semibold">نظر مدیر</th>
                    <th className="py-2.5 px-3 font-semibold">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222]">
                  {filteredLeaveRequests.map((req) => {
                    const badge = getRequestStatusBadge(req.status);
                    const isHourly = req.leave_type === 'hourly';

                    return (
                      <tr key={req.id} className="hover:bg-[#202020] transition-colors">
                        <td className="py-3 px-3 font-bold text-white">
                          {req.personnel_name}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                              isHourly
                                ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                                : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                            }`}
                          >
                            {isHourly ? 'ساعتی' : 'روزانه'}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-white">
                          {isHourly ? (
                            <div>
                              <div>{toPersianDigits(gregorianIsoToJalali(req.start_date))}</div>
                              <div className="text-[11px] text-[#888]">
                                از {toPersianDigits(req.start_time || '')} تا {toPersianDigits(req.end_time || '')} ({toPersianDigits(req.hours_count || '')} ساعت)
                              </div>
                            </div>
                          ) : (
                            <div>
                              <span>{toPersianDigits(gregorianIsoToJalali(req.start_date))}</span>
                              {req.end_date && req.end_date !== req.start_date && (
                                <span className="text-[#888]"> الی {toPersianDigits(gregorianIsoToJalali(req.end_date))}</span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-[#bbb] max-w-xs truncate">
                          {req.reason}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`text-[10px] px-2.5 py-0.5 rounded-full border font-bold flex items-center gap-1 w-fit ${badge.bg}`}
                          >
                            <badge.icon className="w-3 h-3" />
                            <span>{badge.label}</span>
                          </span>
                        </td>
                        <td className="py-3 px-3 text-[#888] max-w-xs truncate">
                          {req.manager_note || '-'}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            {isAdmin && req.status === 'pending' ? (
                              <button
                                onClick={() => {
                                  setReviewModalItem({ type: 'leave', item: req });
                                  setReviewAction('approved');
                                  setReviewManagerNote('');
                                }}
                                className="px-2.5 py-1 rounded-lg bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold text-[11px] transition-all"
                              >
                                بررسی و تعیین
                              </button>
                            ) : req.status === 'pending' ? (
                              <button
                                onClick={() => onDeleteLeaveRequest(req.id)}
                                className="p-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                                title="حذف درخواست"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <span className="text-[11px] text-[#555]">ثبت نهایی</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredLeaveRequests.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-xs text-[#777]">
                        هیچ درخواست مرخصی یافت نشد.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. TAB 3: SALARY ADVANCE REQUESTS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'advance' && (
        <div className="space-y-6">
          {/* New Advance Request Form */}
          <div className="bg-[#181818] border border-[#282828] rounded-2xl p-5 sm:p-6 space-y-5">
            <div className="flex items-center gap-2 border-b border-[#282828] pb-3">
              <Wallet className="w-5 h-5 text-[#1DB954]" />
              <div>
                <h3 className="text-base font-bold text-white">ثبت درخواست مساعده مالی</h3>
                <p className="text-xs text-[#888]">
                  درخواست مساعده حقوق خود را ثبت کنید تا پس از بررسی مدیریت واریز گردد.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmitAdvance} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
                    مبلغ درخواستی (تومان) *
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={advanceAmount}
                    onChange={(e) => setAdvanceAmount(e.target.value)}
                    placeholder="5,000,000"
                    required
                    className="w-full h-10 px-3 bg-[#121212] rounded-xl text-xs text-white border border-[#2c2c2c] focus:border-[#1DB954] focus:outline-none font-mono font-bold text-sm"
                  />
                  <div className="text-[11px] text-[#1DB954] mt-1 font-mono">
                    معادل: {formatToman(Number(advanceAmount.replace(/[^0-9]/g, '')) || 0)}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
                    مربوط به حقوق ماه
                  </label>
                  <input
                    type="text"
                    value={advanceMonth}
                    onChange={(e) => setAdvanceMonth(e.target.value)}
                    placeholder="مهر ۱۴۰۵"
                    className="w-full h-10 px-3 bg-[#121212] rounded-xl text-xs text-white border border-[#2c2c2c] focus:border-[#1DB954] focus:outline-none"
                  />
                </div>

                <div>
                  <PersianDatePicker
                    label="تاریخ مورد نیاز دریافت"
                    value={advanceNeededDate}
                    onChange={(iso) => setAdvanceNeededDate(iso)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
                    شماره کارت جهت واریز
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={advanceCard}
                    onChange={(e) => setAdvanceCard(e.target.value)}
                    placeholder="6037-9975-..."
                    className="w-full h-10 px-3 bg-[#121212] rounded-xl text-xs text-white border border-[#2c2c2c] focus:border-[#1DB954] focus:outline-none font-mono tracking-wider"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
                    شماره شبا (IBAN)
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={advanceIban}
                    onChange={(e) => setAdvanceIban(e.target.value)}
                    placeholder="IR12017..."
                    className="w-full h-10 px-3 bg-[#121212] rounded-xl text-xs text-white border border-[#2c2c2c] focus:border-[#1DB954] focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
                  علت و ضرورت درخواست مساعده *
                </label>
                <textarea
                  value={advanceReason}
                  onChange={(e) => setAdvanceReason(e.target.value)}
                  placeholder="شرح دلیل درخواست مساعده مالی..."
                  rows={3}
                  required
                  className="w-full p-3 bg-[#121212] rounded-xl text-xs text-white border border-[#2c2c2c] focus:border-[#1DB954] focus:outline-none leading-relaxed"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSubmittingAdvance}
                  className="px-6 py-2.5 rounded-xl bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold text-xs shadow-lg shadow-[#1DB954]/25 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmittingAdvance ? 'در حال ثبت...' : 'ارسال درخواست مساعده'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* List of Advance Requests */}
          <div className="bg-[#181818] border border-[#282828] rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#282828] pb-3">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-[#1DB954]" />
                <h3 className="text-sm font-bold text-white">
                  {isAdmin ? 'همه درخواست‌های مساعده پرسنل' : 'درخواست‌های مساعده من'}
                </h3>
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-[#242424] text-[#A7A7A7]">
                  {toPersianDigits(filteredAdvanceRequests.length)} مورد
                </span>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <select
                  value={advanceStatusFilter}
                  onChange={(e) => setAdvanceStatusFilter(e.target.value)}
                  className="h-8 px-3 rounded-xl bg-[#121212] text-xs text-white border border-[#2c2c2c] focus:outline-none"
                >
                  <option value="all">همه وضعیت‌ها</option>
                  <option value="pending">در انتظار بررسی</option>
                  <option value="approved">تایید شده</option>
                  <option value="rejected">رد شده</option>
                </select>

                {isAdmin && (
                  <input
                    type="text"
                    value={advanceSearch}
                    onChange={(e) => setAdvanceSearch(e.target.value)}
                    placeholder="جستجو در نام یا شرح..."
                    className="h-8 px-3 rounded-xl bg-[#121212] text-xs text-white border border-[#2c2c2c] focus:outline-none w-36 sm:w-44"
                  />
                )}
              </div>
            </div>

            {/* Advance Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-[#282828] text-[#888]">
                    <th className="py-2.5 px-3 font-semibold">متقاضی</th>
                    <th className="py-2.5 px-3 font-semibold">مبلغ درخواستی</th>
                    <th className="py-2.5 px-3 font-semibold">مبلغ تاییدشده</th>
                    <th className="py-2.5 px-3 font-semibold">ماه هدف</th>
                    <th className="py-2.5 px-3 font-semibold">علت</th>
                    <th className="py-2.5 px-3 font-semibold">وضعیت</th>
                    <th className="py-2.5 px-3 font-semibold">نظر مدیریت</th>
                    <th className="py-2.5 px-3 font-semibold">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222]">
                  {filteredAdvanceRequests.map((req) => {
                    const badge = getRequestStatusBadge(req.status);

                    return (
                      <tr key={req.id} className="hover:bg-[#202020] transition-colors">
                        <td className="py-3 px-3 font-bold text-white">
                          {req.personnel_name}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-white">
                          {formatToman(req.amount)}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-[#1DB954]">
                          {req.approved_amount ? formatToman(req.approved_amount) : '-'}
                        </td>
                        <td className="py-3 px-3 text-[#A7A7A7]">
                          {req.target_month || '-'}
                        </td>
                        <td className="py-3 px-3 text-[#bbb] max-w-xs truncate">
                          {req.reason}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`text-[10px] px-2.5 py-0.5 rounded-full border font-bold flex items-center gap-1 w-fit ${badge.bg}`}
                          >
                            <badge.icon className="w-3 h-3" />
                            <span>{badge.label}</span>
                          </span>
                        </td>
                        <td className="py-3 px-3 text-[#888] max-w-xs truncate">
                          {req.manager_note || '-'}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            {isAdmin && req.status === 'pending' ? (
                              <button
                                onClick={() => {
                                  setReviewModalItem({ type: 'advance', item: req });
                                  setReviewAction('approved');
                                  setReviewApprovedAmount(String(req.amount));
                                  setReviewManagerNote('');
                                }}
                                className="px-2.5 py-1 rounded-lg bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold text-[11px] transition-all"
                              >
                                بررسی و واریز
                              </button>
                            ) : req.status === 'pending' ? (
                              <button
                                onClick={() => onDeleteAdvanceRequest(req.id)}
                                className="p-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                                title="حذف درخواست"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <span className="text-[11px] text-[#555]">ثبت نهایی</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredAdvanceRequests.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-xs text-[#777]">
                        هیچ درخواست مساعده‌ای یافت نشد.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 5. ADMIN REVIEW MODAL */}
      {/* ------------------------------------------------------------- */}
      {reviewModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#181818] border border-[#282828] w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#282828] pb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#1DB954]" />
                <h3 className="font-bold text-sm text-white">
                  تعیین وضعیت درخواست {reviewModalItem.type === 'leave' ? 'مرخصی' : 'مساعده'}
                </h3>
              </div>
              <button
                onClick={() => setReviewModalItem(null)}
                className="text-[#888] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 bg-[#121212] p-3.5 rounded-xl border border-[#222] text-xs">
              <div className="flex justify-between">
                <span className="text-[#888]">کارشناس متقاضی:</span>
                <span className="font-bold text-white">{reviewModalItem.item.personnel_name}</span>
              </div>
              {reviewModalItem.type === 'advance' && (
                <div className="flex justify-between">
                  <span className="text-[#888]">مبلغ درخواستی:</span>
                  <span className="font-mono font-bold text-[#1DB954]">
                    {formatToman((reviewModalItem.item as SalaryAdvanceRequest).amount)}
                  </span>
                </div>
              )}
              <div>
                <span className="text-[#888] block mb-1">شرح علت:</span>
                <p className="text-white leading-relaxed bg-[#181818] p-2 rounded-lg border border-[#282828]">
                  {reviewModalItem.item.reason}
                </p>
              </div>
            </div>

            {/* Decision Action Buttons */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-[#B3B3B3]">
                تصمیم مدیریت:
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setReviewAction('approved')}
                  className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border ${
                    reviewAction === 'approved'
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500 shadow-md'
                      : 'bg-[#121212] text-[#888] border-[#2c2c2c] hover:text-white'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>تایید درخواست</span>
                </button>

                <button
                  type="button"
                  onClick={() => setReviewAction('rejected')}
                  className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border ${
                    reviewAction === 'rejected'
                      ? 'bg-rose-500/20 text-rose-400 border-rose-500 shadow-md'
                      : 'bg-[#121212] text-[#888] border-[#2c2c2c] hover:text-white'
                  }`}
                >
                  <X className="w-4 h-4" />
                  <span>رد درخواست</span>
                </button>
              </div>

              {/* If Advance is approved, allow modifying the approved amount */}
              {reviewModalItem.type === 'advance' && reviewAction === 'approved' && (
                <div>
                  <label className="block text-xs font-semibold text-[#B3B3B3] mb-1">
                    مبلغ تایید شده (تومان)
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={reviewApprovedAmount}
                    onChange={(e) => setReviewApprovedAmount(e.target.value)}
                    className="w-full h-10 px-3 bg-[#121212] rounded-xl text-xs text-white border border-[#2c2c2c] focus:border-[#1DB954] focus:outline-none font-mono font-bold"
                  />
                </div>
              )}

              {/* Manager Note */}
              <div>
                <label className="block text-xs font-semibold text-[#B3B3B3] mb-1">
                  توضیحات و پیام به پرسنل (اختیاری)
                </label>
                <textarea
                  value={reviewManagerNote}
                  onChange={(e) => setReviewManagerNote(e.target.value)}
                  placeholder="پیام یا توضیحات مرتبط با تایید یا رد درخواست..."
                  rows={2}
                  className="w-full p-2.5 bg-[#121212] rounded-xl text-xs text-white border border-[#2c2c2c] focus:border-[#1DB954] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setReviewModalItem(null)}
                className="px-4 py-2 rounded-xl bg-[#242424] text-white text-xs font-bold hover:bg-[#333]"
              >
                انصراف
              </button>
              <button
                onClick={handleConfirmReview}
                disabled={isProcessingReview}
                className="px-6 py-2 rounded-xl bg-[#1DB954] hover:bg-[#1ed760] text-black text-xs font-bold shadow-lg shadow-[#1DB954]/25 disabled:opacity-50"
              >
                {isProcessingReview ? 'در حال ثبت...' : 'ثبت تصمیم نهایی'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 6. LOGOUT CONFIRMATION MODAL */}
      {/* ------------------------------------------------------------- */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#181818] border border-[#282828] w-full max-w-sm rounded-2xl p-6 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-rose-500/15 text-rose-400 flex items-center justify-center mx-auto">
              <LogOut className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">خروج از حساب کاربری</h3>
              <p className="text-xs text-[#888] mt-1">
                آیا از خروج از نشست کاربری فعلی خود در سامانه اطمینان دارید؟
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 rounded-xl bg-[#282828] hover:bg-[#333] text-white text-xs font-bold"
              >
                انصراف
              </button>
              <button
                onClick={() => {
                  setShowLogoutConfirm(false);
                  onLogout();
                }}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30"
              >
                بله، خروج
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
