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
  getAvatarUrl,
  compressImage,
} from '../utils';
import { PersianDatePicker } from './PersianDatePicker';
import { uploadAvatar, fetchLeaveRequests, fetchAdvanceRequests } from '../api';
import { ProfileTab } from './personal-portal/ProfileTab';
import { PasswordTab } from './personal-portal/PasswordTab';
import { LeaveRequestsTab } from './personal-portal/LeaveRequestsTab';
import { AdvanceRequestsTab } from './personal-portal/AdvanceRequestsTab';

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

  // Dedicated on-demand state for leave & advance requests
  const [localLeaveRequests, setLocalLeaveRequests] = useState<LeaveRequest[]>(leaveRequests);
  const [localAdvanceRequests, setLocalAdvanceRequests] = useState<SalaryAdvanceRequest[]>(advanceRequests);
  const [isLoadingRequests, setIsLoadingRequests] = useState<boolean>(false);

  const reloadRequests = async () => {
    setIsLoadingRequests(true);
    try {
      const [lData, aData] = await Promise.all([
        fetchLeaveRequests().catch(() => []),
        fetchAdvanceRequests().catch(() => []),
      ]);
      setLocalLeaveRequests(lData);
      setLocalAdvanceRequests(aData);
    } catch (err) {
      console.warn('Failed to load portal requests:', err);
    } finally {
      setIsLoadingRequests(false);
    }
  };

  useEffect(() => {
    reloadRequests();
  }, []);

  useEffect(() => {
    if (leaveRequests && leaveRequests.length > 0 && localLeaveRequests.length === 0) {
      setLocalLeaveRequests(leaveRequests);
    }
  }, [leaveRequests]);

  useEffect(() => {
    if (advanceRequests && advanceRequests.length > 0 && localAdvanceRequests.length === 0) {
      setLocalAdvanceRequests(advanceRequests);
    }
  }, [advanceRequests]);

  useEffect(() => {
    if (initialTab === 'logout') {
      setShowLogoutConfirm(true);
    } else if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Profile Form State
  const [profileName, setProfileName] = useState(currentPersonnel?.name || currentUser?.name || '');
  const [profileUsername, setProfileUsername] = useState(currentPersonnel?.username || currentUser?.username || '');
  const [profilePhone, setProfilePhone] = useState(currentPersonnel?.phone || '');
  const [profileAvatar, setProfileAvatar] = useState(currentPersonnel?.avatar || '');
  const [profileBankCard, setProfileBankCard] = useState(currentPersonnel?.bank_card_number || '');
  const [profileIban, setProfileIban] = useState(currentPersonnel?.iban || '');
  const [profileNationalId, setProfileNationalId] = useState(currentPersonnel?.national_id || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('لطفاً یک فایل تصویری معتبر (JPG, PNG, WEBP) انتخاب نمایید.', 'error');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      // Client-side automatic compression (resizes large camera/phone photos to max 600px, < 80KB)
      showToast('در حال فشرده‌سازی و پردازش تصویر...', 'info');
      const compressedDataUrl = await compressImage(file, 600, 0.82);
      setProfileAvatar(compressedDataUrl);
      const fileName = file.name.replace(/\.[^/.]+$/, '') + '.webp';
      const res = await uploadAvatar(compressedDataUrl, fileName);
      if (res.avatarUrl) {
        setProfileAvatar(res.avatarUrl);
        // Immediately persist to profile so header, sidebar, and colleague list update instantly
        try {
          await onUpdateProfile({
            name: profileName,
            username: profileUsername.trim() || undefined,
            phone: profilePhone,
            avatar: res.avatarUrl,
            bank_card_number: profileBankCard,
            iban: profileIban,
            national_id: profileNationalId,
          });
        } catch {}
        showToast('تصویر پروفایل شما با موفقیت فشرده‌سازی و بارگذاری شد.', 'success');
      }
    } catch (err: any) {
      console.error('Avatar upload/compression error:', err);
      showToast('خطا در بارگذاری تصویر: ' + (err.message || 'خطای نامشخص'), 'error');
    } finally {
      setIsUploadingAvatar(false);
      // Reset input value so same file can be selected again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
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
        username: profileUsername.trim() || undefined,
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
      reloadRequests();
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
      reloadRequests();
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
      reloadRequests();
    } catch (err: any) {
      showToast(err.message || 'خطا در اعمال وضعیت درخواست', 'error');
    } finally {
      setIsProcessingReview(false);
    }
  };

  // Filtered Leave Requests
  const filteredLeaveRequests = useMemo(() => {
    return localLeaveRequests.filter((r) => {
      if (leaveStatusFilter !== 'all' && r.status !== leaveStatusFilter) return false;
      if (leaveSearch.trim()) {
        const q = leaveSearch.toLowerCase();
        const matchName = r.personnel_name?.toLowerCase().includes(q);
        const matchReason = r.reason?.toLowerCase().includes(q);
        if (!matchName && !matchReason) return false;
      }
      return true;
    });
  }, [localLeaveRequests, leaveStatusFilter, leaveSearch]);

  // Filtered Advance Requests
  const filteredAdvanceRequests = useMemo(() => {
    return localAdvanceRequests.filter((r) => {
      if (advanceStatusFilter !== 'all' && r.status !== advanceStatusFilter) return false;
      if (advanceSearch.trim()) {
        const q = advanceSearch.toLowerCase();
        const matchName = r.personnel_name?.toLowerCase().includes(q);
        const matchReason = r.reason?.toLowerCase().includes(q);
        if (!matchName && !matchReason) return false;
      }
      return true;
    });
  }, [localAdvanceRequests, advanceStatusFilter, advanceSearch]);

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

  const pendingLeavesCount = localLeaveRequests.filter((r) => r.status === 'pending').length;
  const pendingAdvancesCount = localAdvanceRequests.filter((r) => r.status === 'pending').length;

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
                  <img
                    src={getAvatarUrl(profileAvatar)}
                    alt={profileName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                      const parent = (e.currentTarget as HTMLElement).parentElement;
                      if (parent && !parent.querySelector('.portal-avatar-fallback')) {
                        const span = document.createElement('span');
                        span.className = 'portal-avatar-fallback text-black font-black text-xl';
                        span.textContent = profileName.charAt(0) || 'ک';
                        parent.appendChild(span);
                      }
                    }}
                  />
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
          <div className="lg:col-span-2">
            <ProfileTab
              profileName={profileName}
              setProfileName={setProfileName}
              profileUsername={profileUsername}
              setProfileUsername={setProfileUsername}
              profilePhone={profilePhone}
              setProfilePhone={setProfilePhone}
              profileNationalId={profileNationalId}
              setProfileNationalId={setProfileNationalId}
              currentPersonnel={currentPersonnel}
              currentUser={currentUser}
              profileBankCard={profileBankCard}
              setProfileBankCard={setProfileBankCard}
              profileIban={profileIban}
              setProfileIban={setProfileIban}
              profileAvatar={profileAvatar}
              setProfileAvatar={setProfileAvatar}
              isSavingProfile={isSavingProfile}
              isUploadingAvatar={isUploadingAvatar}
              fileInputRef={fileInputRef}
              handleAvatarFileChange={handleAvatarFileChange}
              handleSaveProfile={handleSaveProfile}
            />
          </div>

          <div>
            <PasswordTab
              currentPassword={currentPassword}
              setCurrentPassword={setCurrentPassword}
              newPassword={newPassword}
              setNewPassword={setNewPassword}
              confirmPassword={confirmPassword}
              setConfirmPassword={setConfirmPassword}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              isChangingPassword={isChangingPassword}
              handleChangePassword={handleChangePassword}
            />
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. TAB 2: LEAVE REQUESTS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'leave' && (
        <LeaveRequestsTab
          leaveType={leaveType}
          setLeaveType={setLeaveType}
          leaveStartDate={leaveStartDate}
          setLeaveStartDate={setLeaveStartDate}
          leaveEndDate={leaveEndDate}
          setLeaveEndDate={setLeaveEndDate}
          leaveStartTime={leaveStartTime}
          setLeaveStartTime={setLeaveStartTime}
          leaveEndTime={leaveEndTime}
          setLeaveEndTime={setLeaveEndTime}
          calculatedHourlyDuration={calculatedHourlyDuration}
          leaveReason={leaveReason}
          setLeaveReason={setLeaveReason}
          isSubmittingLeave={isSubmittingLeave}
          handleSubmitLeave={handleSubmitLeave}
          isAdmin={isAdmin}
          filteredLeaveRequests={filteredLeaveRequests}
          leaveStatusFilter={leaveStatusFilter}
          setLeaveStatusFilter={setLeaveStatusFilter}
          leaveSearch={leaveSearch}
          setLeaveSearch={setLeaveSearch}
          getRequestStatusBadge={getRequestStatusBadge}
          setReviewModalItem={setReviewModalItem}
          setReviewAction={setReviewAction}
          setReviewManagerNote={setReviewManagerNote}
          onDeleteLeaveRequest={onDeleteLeaveRequest}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. TAB 3: SALARY ADVANCE REQUESTS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'advance' && (
        <AdvanceRequestsTab
          advanceAmount={advanceAmount}
          setAdvanceAmount={setAdvanceAmount}
          advanceMonth={advanceMonth}
          setAdvanceMonth={setAdvanceMonth}
          advanceNeededDate={advanceNeededDate}
          setAdvanceNeededDate={setAdvanceNeededDate}
          advanceCard={advanceCard}
          setAdvanceCard={setAdvanceCard}
          advanceIban={advanceIban}
          setAdvanceIban={setAdvanceIban}
          advanceReason={advanceReason}
          setAdvanceReason={setAdvanceReason}
          isSubmittingAdvance={isSubmittingAdvance}
          handleSubmitAdvance={handleSubmitAdvance}
          isAdmin={isAdmin}
          filteredAdvanceRequests={filteredAdvanceRequests}
          advanceStatusFilter={advanceStatusFilter}
          setAdvanceStatusFilter={setAdvanceStatusFilter}
          advanceSearch={advanceSearch}
          setAdvanceSearch={setAdvanceSearch}
          getRequestStatusBadge={getRequestStatusBadge}
          setReviewModalItem={setReviewModalItem}
          setReviewAction={setReviewAction}
          setReviewApprovedAmount={setReviewApprovedAmount}
          setReviewManagerNote={setReviewManagerNote}
          onDeleteAdvanceRequest={onDeleteAdvanceRequest}
        />
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
