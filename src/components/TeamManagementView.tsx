import React, { useState, useMemo } from 'react';
import {
  Users2,
  UserPlus,
  ArrowLeftRight,
  Clock,
  CalendarCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  Shield,
  Phone,
  Mail,
  UserCheck,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  CalendarDays,
  Send,
  Sparkles,
  Check,
  X,
  RefreshCw,
  FolderOpen,
  Award,
} from 'lucide-react';
import {
  Personnel,
  Customer,
  LeaveRequest,
  TeamSubTab,
  CreateColleaguePayload,
  RequestStatus,
} from '../types';
import {
  formatPersianDate,
  formatPersianDateTime,
  formatTimeRemaining,
  getStatusTheme,
  toPersianDigits,
} from '../utils';

interface TeamManagementViewProps {
  initialSubTab?: TeamSubTab;
  personnelList: Personnel[];
  customers: Customer[];
  leaveRequests: LeaveRequest[];
  currentPersonnel: Personnel | null;
  isAdmin: boolean;
  onCreatePersonnel: (payload: CreateColleaguePayload) => Promise<void>;
  onUpdatePersonnel: (id: string, payload: Partial<Personnel>) => Promise<void>;
  onDeletePersonnel: (id: string) => Promise<void>;
  onBulkExtendOwnership: (customerIds: string[], days: number) => Promise<void>;
  onBulkSwitchOwnership: (customerIds: string[], targetPersonnelId: string, targetPersonnelName: string, days: number) => Promise<void>;
  onUpdateLeaveStatus: (id: string, status: RequestStatus, managerNote?: string) => Promise<void>;
  onSelectCustomer: (customer: Customer) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const TeamManagementView: React.FC<TeamManagementViewProps> = ({
  initialSubTab = 'colleagues_list',
  personnelList,
  customers,
  leaveRequests,
  currentPersonnel,
  isAdmin,
  onCreatePersonnel,
  onUpdatePersonnel,
  onDeletePersonnel,
  onBulkExtendOwnership,
  onBulkSwitchOwnership,
  onUpdateLeaveStatus,
  onSelectCustomer,
  showToast,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<TeamSubTab>(initialSubTab);

  // Sync with prop when sidebar changes
  React.useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  // -------------------------------------------------------------
  // TAB 1: New Colleague Form State
  // -------------------------------------------------------------
  const [colleagueName, setColleagueName] = useState('');
  const [colleagueEmail, setColleagueEmail] = useState('');
  const [colleaguePhone, setColleaguePhone] = useState('');
  const [colleagueRole, setColleagueRole] = useState<'marketer' | 'sales_manager' | 'admin'>('marketer');
  const [colleaguePassword, setColleaguePassword] = useState('');
  const [isSubmittingPersonnel, setIsSubmittingPersonnel] = useState(false);

  const handleRegisterColleague = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!colleagueName.trim() || !colleagueEmail.trim()) {
      showToast('نام و ایمیل همکار الزامی است.', 'error');
      return;
    }
    setIsSubmittingPersonnel(true);
    try {
      await onCreatePersonnel({
        name: colleagueName.trim(),
        email: colleagueEmail.trim(),
        phone: colleaguePhone.trim(),
        role: colleagueRole,
        password: colleaguePassword.trim() || undefined,
        status: 'active',
      });
      showToast(`همکار جدید «${colleagueName}» با موفقیت افزوده شد.`, 'success');
      setColleagueName('');
      setColleagueEmail('');
      setColleaguePhone('');
      setColleaguePassword('');
      setActiveSubTab('colleagues_list');
    } catch (err: any) {
      showToast(err.message || 'خطا در ثبت همکار جدید', 'error');
    } finally {
      setIsSubmittingPersonnel(false);
    }
  };

  // -------------------------------------------------------------
  // TAB 2: Colleagues List Search & Edit Modal State
  // -------------------------------------------------------------
  const [personnelSearch, setPersonnelSearch] = useState('');
  const [editingColleague, setEditingColleague] = useState<Personnel | null>(null);
  const [isUpdatingColleague, setIsUpdatingColleague] = useState(false);

  const filteredPersonnel = useMemo(() => {
    return personnelList.filter((p) => {
      if (!personnelSearch.trim()) return true;
      const q = personnelSearch.toLowerCase();
      return (
        p.name?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q) ||
        p.phone?.includes(q)
      );
    });
  }, [personnelList, personnelSearch]);

  const handleSaveColleagueEdit = async () => {
    if (!editingColleague) return;
    setIsUpdatingColleague(true);
    try {
      await onUpdatePersonnel(editingColleague.id, {
        name: editingColleague.name,
        email: editingColleague.email,
        phone: editingColleague.phone,
        role: editingColleague.role,
        status: editingColleague.status,
      });
      showToast('مشخصات همکار با موفقیت به‌روزرسانی شد.', 'success');
      setEditingColleague(null);
    } catch (err: any) {
      showToast(err.message || 'خطا در ویرایش همکار', 'error');
    } finally {
      setIsUpdatingColleague(false);
    }
  };

  // -------------------------------------------------------------
  // TAB 3: Extend Ownership State (تمدید مالکیت)
  // -------------------------------------------------------------
  const [extendMarketerFilter, setExtendMarketerFilter] = useState<string>('all');
  const [extendSearch, setExtendSearch] = useState('');
  const [selectedExtendCustomerIds, setSelectedExtendCustomerIds] = useState<string[]>([]);
  const [extendDaysCount, setExtendDaysCount] = useState<number>(7);
  const [isSubmittingExtend, setIsSubmittingExtend] = useState(false);

  const extendEligibleCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (extendMarketerFilter !== 'all' && c.assigned_marketer_id !== extendMarketerFilter) {
        return false;
      }
      if (extendSearch.trim()) {
        const q = extendSearch.toLowerCase();
        const matchName = c.company_name?.toLowerCase().includes(q);
        const matchManager = c.manager_name?.toLowerCase().includes(q);
        if (!matchName && !matchManager) return false;
      }
      return true;
    });
  }, [customers, extendMarketerFilter, extendSearch]);

  const handleToggleSelectExtend = (id: string) => {
    setSelectedExtendCustomerIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllExtend = () => {
    if (selectedExtendCustomerIds.length === extendEligibleCustomers.length) {
      setSelectedExtendCustomerIds([]);
    } else {
      setSelectedExtendCustomerIds(extendEligibleCustomers.map((c) => c.id));
    }
  };

  const handleConfirmExtendOwnership = async () => {
    if (selectedExtendCustomerIds.length === 0) {
      showToast('لطفاً حداقل یک مشتری را انتخاب کنید.', 'error');
      return;
    }
    setIsSubmittingExtend(true);
    try {
      await onBulkExtendOwnership(selectedExtendCustomerIds, extendDaysCount);
      showToast(
        `مهلت مالکیت ${toPersianDigits(selectedExtendCustomerIds.length)} پرونده با موفقیت ${toPersianDigits(extendDaysCount)} روز تمدید شد.`,
        'success'
      );
      setSelectedExtendCustomerIds([]);
    } catch (err: any) {
      showToast(err.message || 'خطا در تمدید مهلت پرونده‌ها', 'error');
    } finally {
      setIsSubmittingExtend(false);
    }
  };

  // -------------------------------------------------------------
  // TAB 4: Switch Ownership State (سوئیچ مالکیت)
  // -------------------------------------------------------------
  const [sourceMarketerId, setSourceMarketerId] = useState<string>('all');
  const [targetMarketerId, setTargetMarketerId] = useState<string>('');
  const [switchSearch, setSwitchSearch] = useState('');
  const [selectedSwitchCustomerIds, setSelectedSwitchCustomerIds] = useState<string[]>([]);
  const [switchDurationDays, setSwitchDurationDays] = useState<number>(7);
  const [isSubmittingSwitch, setIsSubmittingSwitch] = useState(false);

  const switchEligibleCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (sourceMarketerId !== 'all' && c.assigned_marketer_id !== sourceMarketerId) {
        return false;
      }
      if (switchSearch.trim()) {
        const q = switchSearch.toLowerCase();
        const matchName = c.company_name?.toLowerCase().includes(q);
        const matchManager = c.manager_name?.toLowerCase().includes(q);
        if (!matchName && !matchManager) return false;
      }
      return true;
    });
  }, [customers, sourceMarketerId, switchSearch]);

  const handleToggleSelectSwitch = (id: string) => {
    setSelectedSwitchCustomerIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllSwitch = () => {
    if (selectedSwitchCustomerIds.length === switchEligibleCustomers.length) {
      setSelectedSwitchCustomerIds([]);
    } else {
      setSelectedSwitchCustomerIds(switchEligibleCustomers.map((c) => c.id));
    }
  };

  const handleConfirmSwitchOwnership = async () => {
    if (selectedSwitchCustomerIds.length === 0) {
      showToast('لطفاً حداقل یک پرونده را برای انتقال انتخاب کنید.', 'error');
      return;
    }
    if (!targetMarketerId) {
      showToast('لطفاً همکار مقصد را برای تحویل پرونده‌ها مشخص کنید.', 'error');
      return;
    }
    const targetObj = personnelList.find((p) => p.id === targetMarketerId);
    const targetName = targetObj?.name || 'همکار منتخب';

    setIsSubmittingSwitch(true);
    try {
      await onBulkSwitchOwnership(
        selectedSwitchCustomerIds,
        targetMarketerId,
        targetName,
        switchDurationDays
      );
      showToast(
        `مالکیت ${toPersianDigits(selectedSwitchCustomerIds.length)} پرونده با موفقیت به «${targetName}» واگذار شد.`,
        'success'
      );
      setSelectedSwitchCustomerIds([]);
    } catch (err: any) {
      showToast(err.message || 'خطا در واگذاری پرونده‌ها', 'error');
    } finally {
      setIsSubmittingSwitch(false);
    }
  };

  // -------------------------------------------------------------
  // TAB 5: Leave Approvals State (تایید مرخصی‌ها)
  // -------------------------------------------------------------
  const [leaveStatusFilter, setLeaveStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [leaveSearch, setLeaveSearch] = useState('');
  const [reviewingLeave, setReviewingLeave] = useState<LeaveRequest | null>(null);
  const [reviewAction, setReviewAction] = useState<RequestStatus>('approved');
  const [reviewManagerNote, setReviewManagerNote] = useState('');
  const [isProcessingLeaveReview, setIsProcessingLeaveReview] = useState(false);

  const filteredLeaves = useMemo(() => {
    return leaveRequests.filter((l) => {
      if (leaveStatusFilter !== 'all' && l.status !== leaveStatusFilter) return false;
      if (leaveSearch.trim()) {
        const q = leaveSearch.toLowerCase();
        const matchName = l.personnel_name?.toLowerCase().includes(q);
        const matchReason = l.reason?.toLowerCase().includes(q);
        if (!matchName && !matchReason) return false;
      }
      return true;
    });
  }, [leaveRequests, leaveStatusFilter, leaveSearch]);

  const handleConfirmLeaveReview = async () => {
    if (!reviewingLeave) return;
    setIsProcessingLeaveReview(true);
    try {
      await onUpdateLeaveStatus(reviewingLeave.id, reviewAction, reviewManagerNote);
      showToast(
        `درخواست مرخصی با موفقیت ${reviewAction === 'approved' ? 'تایید' : 'رد'} شد.`,
        'success'
      );
      setReviewingLeave(null);
      setReviewManagerNote('');
    } catch (err: any) {
      showToast(err.message || 'خطا در ثبت وضعیت مرخصی', 'error');
    } finally {
      setIsProcessingLeaveReview(false);
    }
  };

  const pendingLeavesCount = leaveRequests.filter((r) => r.status === 'pending').length;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* ------------------------------------------------------------- */}
      {/* 1. TOP HEADER & SUB-MENUS                                     */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-[#121212] border border-[#282828] rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1DB954] to-[#14833b] text-black font-black text-xl flex items-center justify-center shadow-lg shadow-[#1DB954]/20 overflow-hidden border-2 border-[#1DB954]">
              <Users2 className="w-6 h-6 text-black stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  مدیریت همکاران و مالکیت پرونده‌ها
                </h1>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#1DB954]/15 text-[#1DB954] font-bold border border-[#1DB954]/30">
                  پنل مدیریت
                </span>
              </div>
              <p className="text-xs text-[#A7A7A7] mt-0.5">
                تعریف پرسنل، کنترل مالکیت‌ها، تمدید مهلت و کارتابل تایید مرخصی‌ها
              </p>
            </div>
          </div>
        </div>

        {/* Sub-menu Tabs */}
        <div className="flex items-center gap-2 border-t border-[#222] pt-4 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveSubTab('new_colleague')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeSubTab === 'new_colleague'
                ? 'bg-[#1DB954] text-black shadow-lg shadow-[#1DB954]/25 scale-[1.02]'
                : 'bg-[#181818] hover:bg-[#222] text-[#B3B3B3] hover:text-white border border-[#282828]'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>ثبت همکار جدید</span>
          </button>

          <button
            onClick={() => setActiveSubTab('colleagues_list')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeSubTab === 'colleagues_list'
                ? 'bg-[#1DB954] text-black shadow-lg shadow-[#1DB954]/25 scale-[1.02]'
                : 'bg-[#181818] hover:bg-[#222] text-[#B3B3B3] hover:text-white border border-[#282828]'
            }`}
          >
            <Users2 className="w-4 h-4" />
            <span>لیست همکاران ({toPersianDigits(personnelList.length)})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('extend_ownership')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeSubTab === 'extend_ownership'
                ? 'bg-[#1DB954] text-black shadow-lg shadow-[#1DB954]/25 scale-[1.02]'
                : 'bg-[#181818] hover:bg-[#222] text-[#B3B3B3] hover:text-white border border-[#282828]'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>تمدید مالکیت مشتری‌ها</span>
          </button>

          <button
            onClick={() => setActiveSubTab('switch_ownership')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeSubTab === 'switch_ownership'
                ? 'bg-[#1DB954] text-black shadow-lg shadow-[#1DB954]/25 scale-[1.02]'
                : 'bg-[#181818] hover:bg-[#222] text-[#B3B3B3] hover:text-white border border-[#282828]'
            }`}
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>سوئیچ و انتقال مالکیت</span>
          </button>

          <button
            onClick={() => setActiveSubTab('leave_approvals')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap relative ${
              activeSubTab === 'leave_approvals'
                ? 'bg-[#1DB954] text-black shadow-lg shadow-[#1DB954]/25 scale-[1.02]'
                : 'bg-[#181818] hover:bg-[#222] text-[#B3B3B3] hover:text-white border border-[#282828]'
            }`}
          >
            <CalendarCheck className="w-4 h-4" />
            <span>درخواست‌های مرخصی</span>
            {pendingLeavesCount > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  activeSubTab === 'leave_approvals'
                    ? 'bg-black text-[#1DB954]'
                    : 'bg-amber-500 text-black'
                }`}
              >
                {toPersianDigits(pendingLeavesCount)}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. TAB CONTENT 1: Register New Colleague                      */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === 'new_colleague' && (
        <div className="max-w-2xl bg-[#181818] border border-[#282828] rounded-2xl p-5 sm:p-6 space-y-6">
          <div className="flex items-center gap-2 border-b border-[#282828] pb-4">
            <UserPlus className="w-5 h-5 text-[#1DB954]" />
            <div>
              <h3 className="text-base font-bold text-white">ثبت و ایجاد همکار جدید</h3>
              <p className="text-xs text-[#888]">
                تعریف عضو جدید در تیم فروش و ایجاد حساب کاربری برای دسترسی به سامانه.
              </p>
            </div>
          </div>

          <form onSubmit={handleRegisterColleague} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
                  نام و نام خانوادگی *
                </label>
                <input
                  type="text"
                  value={colleagueName}
                  onChange={(e) => setColleagueName(e.target.value)}
                  placeholder="مثلاً: سارا احمدی"
                  required
                  className="w-full h-10 px-3 bg-[#121212] rounded-xl text-xs text-white border border-[#2c2c2c] focus:border-[#1DB954] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
                  ایمیل سازمانی (نام کاربری ورود) *
                </label>
                <input
                  type="email"
                  dir="ltr"
                  value={colleagueEmail}
                  onChange={(e) => setColleagueEmail(e.target.value)}
                  placeholder="sara.ahmadi@company.ir"
                  required
                  className="w-full h-10 px-3 bg-[#121212] rounded-xl text-xs text-white border border-[#2c2c2c] focus:border-[#1DB954] focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
                  شماره موبایل مستقیم
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={colleaguePhone}
                  onChange={(e) => setColleaguePhone(e.target.value)}
                  placeholder="0912..."
                  className="w-full h-10 px-3 bg-[#121212] rounded-xl text-xs text-white border border-[#2c2c2c] focus:border-[#1DB954] focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
                  نقش و سطح دسترسی سازمانی *
                </label>
                <select
                  value={colleagueRole}
                  onChange={(e) => setColleagueRole(e.target.value as any)}
                  className="w-full h-10 px-3 bg-[#121212] rounded-xl text-xs text-white border border-[#2c2c2c] focus:border-[#1DB954] focus:outline-none"
                >
                  <option value="marketer">کارشناس فروش و مذاکره</option>
                  <option value="sales_manager">مدیر فروش</option>
                  <option value="admin">مدیر سیستم (دسترسی کامل)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
                  کلمه عبور ورود به سیستم (اختیاری)
                </label>
                <input
                  type="password"
                  dir="ltr"
                  value={colleaguePassword}
                  onChange={(e) => setColleaguePassword(e.target.value)}
                  placeholder="حداقل ۶ کاراکتر (در صورت خالی بودن، کاربر بعداً تنظیم می‌کند)"
                  className="w-full h-10 px-3 bg-[#121212] rounded-xl text-xs text-white border border-[#2c2c2c] focus:border-[#1DB954] focus:outline-none font-mono"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSubmittingPersonnel}
                className="px-6 py-2.5 rounded-xl bg-[#1DB954] hover:bg-[#1ed760] text-black font-extrabold text-xs shadow-lg shadow-[#1DB954]/20 transition-all flex items-center gap-2"
              >
                {isSubmittingPersonnel ? (
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Check className="w-4 h-4 stroke-[3]" />
                )}
                <span>ثبت و ذخیره همکار</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. TAB CONTENT 2: Colleagues List                             */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === 'colleagues_list' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#181818] p-3 sm:p-4 rounded-2xl border border-[#282828]">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-[#888] absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={personnelSearch}
                onChange={(e) => setPersonnelSearch(e.target.value)}
                placeholder="جستجو بر اساس نام، ایمیل، شماره تماس..."
                className="w-full h-9 pr-9 pl-3 bg-[#121212] rounded-xl text-xs text-white border border-[#2c2c2c] focus:border-[#1DB954] focus:outline-none"
              />
            </div>

            <button
              onClick={() => setActiveSubTab('new_colleague')}
              className="px-4 py-2 rounded-xl bg-[#1DB954] text-black font-bold text-xs flex items-center gap-1.5 shadow-md hover:bg-[#1ed760] transition-colors"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>افزودن همکار</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPersonnel.map((p) => {
              const assignedCusts = customers.filter((c) => c.assigned_marketer_id === p.id);
              const wonCusts = assignedCusts.filter((c) => c.status === 'قرارداد');

              return (
                <div
                  key={p.id}
                  className="bg-[#181818] border border-[#282828] hover:border-[#383838] rounded-2xl p-4 sm:p-5 space-y-4 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-2xl bg-[#222] border-2 border-[#1DB954] overflow-hidden flex items-center justify-center text-[#1DB954] font-bold text-sm flex-shrink-0">
                        {p.avatar ? (
                          <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <span>{p.name.charAt(0)}</span>
                        )}
                      </div>
                      <div className="truncate">
                        <div className="font-bold text-sm text-white truncate flex items-center gap-1.5">
                          <span>{p.name}</span>
                          {p.role === 'admin' && (
                            <Shield className="w-3.5 h-3.5 text-amber-400" />
                          )}
                        </div>
                        <div className="text-[11px] text-[#888] truncate mt-0.5">
                          {p.role === 'admin'
                            ? 'مدیر سیستم'
                            : p.role === 'sales_manager'
                            ? 'مدیر فروش'
                            : 'کارشناس فروش'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingColleague(p)}
                        className="p-1.5 rounded-lg bg-[#222] text-[#A7A7A7] hover:text-white transition-colors"
                        title="ویرایش مشخصات"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm(`آیا از حذف همکار «${p.name}» اطمینان دارید؟`)) {
                            await onDeletePersonnel(p.id);
                            showToast(`همکار «${p.name}» با موفقیت حذف شد.`);
                          }
                        }}
                        className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors"
                        title="حذف همکار"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Contact info */}
                  <div className="space-y-1.5 text-xs text-[#999] border-t border-[#242424] pt-3">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-[#666]" />
                      <span className="font-mono text-[11px] truncate" dir="ltr">
                        {p.email}
                      </span>
                    </div>
                    {p.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-[#666]" />
                        <span className="font-mono text-[11px]" dir="ltr">
                          {p.phone}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Stats snippet */}
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-[#121212] p-2.5 rounded-xl border border-[#222]">
                    <div>
                      <div className="text-[10px] text-[#777] font-sans">پرونده‌های فعال</div>
                      <div className="text-white font-bold mt-0.5">
                        {toPersianDigits(assignedCusts.length)} مشتری
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#777] font-sans">قرارداد نهایی</div>
                      <div className="text-[#1DB954] font-bold mt-0.5">
                        {toPersianDigits(wonCusts.length)} فقره
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. TAB CONTENT 3: Extend Ownership (تمدید مالکیت مشتریان)     */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === 'extend_ownership' && (
        <div className="bg-[#181818] border border-[#282828] rounded-2xl p-5 sm:p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#282828] pb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#1DB954]" />
              <div>
                <h3 className="text-base font-bold text-white">تمدید مهلت مالکیت پرونده‌های مشتریان</h3>
                <p className="text-xs text-[#888]">
                  انتخاب پرونده‌های در آستانه انقضا و تمدید مهلت پیگیری بازاریاب مسئول
                </p>
              </div>
            </div>

            {/* Bulk Action Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-[#A7A7A7]">مدت تمدید:</span>
              <select
                value={extendDaysCount}
                onChange={(e) => setExtendDaysCount(Number(e.target.value))}
                className="h-9 px-3 bg-[#121212] rounded-xl text-xs text-white border border-[#333] focus:border-[#1DB954]"
              >
                <option value={3}>۳ روز</option>
                <option value={7}>۷ روز (یک هفته)</option>
                <option value={14}>۱۴ روز (دو هفته)</option>
                <option value={30}>۳۰ روز (یک ماه)</option>
              </select>

              <button
                onClick={handleConfirmExtendOwnership}
                disabled={isSubmittingExtend || selectedExtendCustomerIds.length === 0}
                className="px-4 py-2 rounded-xl bg-[#1DB954] hover:bg-[#1ed760] disabled:opacity-40 disabled:hover:bg-[#1DB954] text-black font-extrabold text-xs shadow-md transition-all flex items-center gap-1.5"
              >
                {isSubmittingExtend ? (
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Clock className="w-4 h-4 stroke-[2.5]" />
                )}
                <span>تمدید {toPersianDigits(selectedExtendCustomerIds.length)} پرونده</span>
              </button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#121212] p-3 rounded-xl border border-[#242424]">
            <div className="flex items-center gap-3 flex-1 min-w-[200px]">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#888] absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={extendSearch}
                  onChange={(e) => setExtendSearch(e.target.value)}
                  placeholder="جستجو در نام شرکت یا مدیریت..."
                  className="w-full h-8 pr-9 pl-3 bg-[#181818] rounded-lg text-xs text-white border border-[#2c2c2c] focus:outline-none"
                />
              </div>

              <select
                value={extendMarketerFilter}
                onChange={(e) => setExtendMarketerFilter(e.target.value)}
                className="h-8 px-2.5 bg-[#181818] rounded-lg text-xs text-white border border-[#2c2c2c]"
              >
                <option value="all">همه بازاریابان</option>
                {personnelList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleSelectAllExtend}
              className="text-xs text-[#1DB954] hover:underline font-semibold"
            >
              {selectedExtendCustomerIds.length === extendEligibleCustomers.length
                ? 'لغو انتخاب همه'
                : 'انتخاب همه پرونده‌ها'}
            </button>
          </div>

          {/* Customers Table */}
          <div className="space-y-2">
            {extendEligibleCustomers.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#888]">
                هیچ پرونده‌ای منطبق با فیلتر یافت نشد.
              </div>
            ) : (
              extendEligibleCustomers.map((c) => {
                const isSelected = selectedExtendCustomerIds.includes(c.id);
                const statusTheme = getStatusTheme(c.status);
                const timeRem = formatTimeRemaining(c.assignment_deadline);

                return (
                  <div
                    key={c.id}
                    onClick={() => handleToggleSelectExtend(c.id)}
                    className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#1DB954]/10 border-[#1DB954]/60'
                        : 'bg-[#121212] border-[#242424] hover:border-[#383838]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="w-4 h-4 rounded text-[#1DB954] accent-[#1DB954] cursor-pointer"
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-white truncate flex items-center gap-2">
                          <span>{c.company_name}</span>
                          <span
                            className={`text-[10px] px-2 py-0.2 rounded-full border ${statusTheme.bg} ${statusTheme.color}`}
                          >
                            {c.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#888] truncate mt-0.5">
                          مدیریت: {c.manager_name || 'نامشخص'} • بازاریاب مسئول: {c.assigned_marketer_name}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0 font-mono text-xs">
                      <span className={`text-[11px] px-2 py-0.5 rounded-md ${timeRem.badgeClass}`}>
                        {timeRem.text}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 5. TAB CONTENT 4: Switch Ownership (سوئیچ و واگذاری پرونده‌ها) */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === 'switch_ownership' && (
        <div className="bg-[#181818] border border-[#282828] rounded-2xl p-5 sm:p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#282828] pb-4">
            <div className="flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-blue-400" />
              <div>
                <h3 className="text-base font-bold text-white">سوئیچ و واگذاری مالکیت پرونده‌ها</h3>
                <p className="text-xs text-[#888]">
                  انتقال تکی یا گروهی پرونده‌ها از یک همکار به همکار دیگر همراه با تعیین مهلت جدید
                </p>
              </div>
            </div>

            {/* Target Colleague Selector & Submit Button */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-[#A7A7A7]">انتقال به همکار:</span>
              <select
                value={targetMarketerId}
                onChange={(e) => setTargetMarketerId(e.target.value)}
                className="h-9 px-3 bg-[#121212] rounded-xl text-xs text-white border border-[#333] focus:border-blue-500"
              >
                <option value="">-- انتخاب همکار مقصد --</option>
                {personnelList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.role === 'admin' ? 'مدیر' : 'بازاریاب'})
                  </option>
                ))}
              </select>

              <select
                value={switchDurationDays}
                onChange={(e) => setSwitchDurationDays(Number(e.target.value))}
                className="h-9 px-3 bg-[#121212] rounded-xl text-xs text-white border border-[#333] focus:border-blue-500"
              >
                <option value={3}>مهلت ۳ روز</option>
                <option value={7}>مهلت ۷ روز</option>
                <option value={14}>مهلت ۱۴ روز</option>
                <option value={30}>مهلت ۳۰ روز</option>
              </select>

              <button
                onClick={handleConfirmSwitchOwnership}
                disabled={isSubmittingSwitch || selectedSwitchCustomerIds.length === 0 || !targetMarketerId}
                className="px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-400 disabled:opacity-40 disabled:hover:bg-blue-500 text-black font-extrabold text-xs shadow-md transition-all flex items-center gap-1.5"
              >
                {isSubmittingSwitch ? (
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ArrowLeftRight className="w-4 h-4 stroke-[2.5]" />
                )}
                <span>واگذاری {toPersianDigits(selectedSwitchCustomerIds.length)} پرونده</span>
              </button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#121212] p-3 rounded-xl border border-[#242424]">
            <div className="flex items-center gap-3 flex-1 min-w-[200px]">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#888] absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={switchSearch}
                  onChange={(e) => setSwitchSearch(e.target.value)}
                  placeholder="جستجو در نام شرکت یا مدیریت..."
                  className="w-full h-8 pr-9 pl-3 bg-[#181818] rounded-lg text-xs text-white border border-[#2c2c2c] focus:outline-none"
                />
              </div>

              <select
                value={sourceMarketerId}
                onChange={(e) => setSourceMarketerId(e.target.value)}
                className="h-8 px-2.5 bg-[#181818] rounded-lg text-xs text-white border border-[#2c2c2c]"
              >
                <option value="all">همه بازاریابان مبدا</option>
                {personnelList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleSelectAllSwitch}
              className="text-xs text-blue-400 hover:underline font-semibold"
            >
              {selectedSwitchCustomerIds.length === switchEligibleCustomers.length
                ? 'لغو انتخاب همه'
                : 'انتخاب همه پرونده‌ها'}
            </button>
          </div>

          {/* Customers List */}
          <div className="space-y-2">
            {switchEligibleCustomers.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#888]">
                هیچ پرونده‌ای برای واگذاری یافت نشد.
              </div>
            ) : (
              switchEligibleCustomers.map((c) => {
                const isSelected = selectedSwitchCustomerIds.includes(c.id);
                const statusTheme = getStatusTheme(c.status);
                const timeRem = formatTimeRemaining(c.assignment_deadline);

                return (
                  <div
                    key={c.id}
                    onClick={() => handleToggleSelectSwitch(c.id)}
                    className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-500/10 border-blue-500/60'
                        : 'bg-[#121212] border-[#242424] hover:border-[#383838]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="w-4 h-4 rounded text-blue-500 accent-blue-500 cursor-pointer"
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-white truncate flex items-center gap-2">
                          <span>{c.company_name}</span>
                          <span
                            className={`text-[10px] px-2 py-0.2 rounded-full border ${statusTheme.bg} ${statusTheme.color}`}
                          >
                            {c.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#888] truncate mt-0.5">
                          بازاریاب فعلی: <span className="text-white font-semibold">{c.assigned_marketer_name}</span> • شهر: {c.city || 'نامشخص'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 flex-shrink-0 font-mono text-xs">
                      <span className={`text-[11px] px-2 py-0.5 rounded-md ${timeRem.badgeClass}`}>
                        {timeRem.text}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 6. TAB CONTENT 5: Leave Approvals (کارتابل تایید مرخصی‌ها)   */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === 'leave_approvals' && (
        <div className="bg-[#181818] border border-[#282828] rounded-2xl p-5 sm:p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#282828] pb-4">
            <div className="flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-[#1DB954]" />
              <div>
                <h3 className="text-base font-bold text-white">کارتابل تایید و بررسی مرخصی‌های پرسنل</h3>
                <p className="text-xs text-[#888]">
                  مشاهده، تایید یا رد درخواست‌های مرخصی ساعتی و روزانه به همراه ثبت توضیحات مدیریت
                </p>
              </div>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5 bg-[#121212] p-1 rounded-xl border border-[#282828]">
              <button
                onClick={() => setLeaveStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  leaveStatusFilter === 'all'
                    ? 'bg-[#282828] text-white'
                    : 'text-[#888] hover:text-white'
                }`}
              >
                همه ({toPersianDigits(leaveRequests.length)})
              </button>
              <button
                onClick={() => setLeaveStatusFilter('pending')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  leaveStatusFilter === 'pending'
                    ? 'bg-amber-500 text-black'
                    : 'text-[#888] hover:text-white'
                }`}
              >
                در انتظار ({toPersianDigits(pendingLeavesCount)})
              </button>
              <button
                onClick={() => setLeaveStatusFilter('approved')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  leaveStatusFilter === 'approved'
                    ? 'bg-emerald-500 text-black'
                    : 'text-[#888] hover:text-white'
                }`}
              >
                تایید شده
              </button>
              <button
                onClick={() => setLeaveStatusFilter('rejected')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  leaveStatusFilter === 'rejected'
                    ? 'bg-rose-500 text-white'
                    : 'text-[#888] hover:text-white'
                }`}
              >
                رد شده
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#888] absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={leaveSearch}
              onChange={(e) => setLeaveSearch(e.target.value)}
              placeholder="جستجو در نام پرسنل یا علت مرخصی..."
              className="w-full h-9 pr-9 pl-3 bg-[#121212] rounded-xl text-xs text-white border border-[#2c2c2c] focus:outline-none"
            />
          </div>

          {/* Leave Requests Table */}
          <div className="space-y-3">
            {filteredLeaves.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#888]">
                هیچ درخواست مرخصی در این وضعیت ثبت نشده است.
              </div>
            ) : (
              filteredLeaves.map((l) => (
                <div
                  key={l.id}
                  className="p-4 rounded-xl bg-[#121212] border border-[#242424] space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#282828] text-[#1DB954] flex items-center justify-center font-bold text-xs">
                        {l.personnel_name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-xs text-white">{l.personnel_name}</div>
                        <div className="text-[10px] text-[#777]">
                          ثبت‌شده در {formatPersianDateTime(l.date_created)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] px-2.5 py-1 rounded-full font-bold border ${
                          l.status === 'approved'
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : l.status === 'rejected'
                            ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                            : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                        }`}
                      >
                        {l.status === 'approved'
                          ? 'تایید شده'
                          : l.status === 'rejected'
                          ? 'رد شده'
                          : 'در انتظار بررسی مدیریت'}
                      </span>

                      {l.status === 'pending' && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setReviewingLeave(l);
                              setReviewAction('approved');
                              setReviewManagerNote('');
                            }}
                            className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-lg transition-colors flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                            <span>تایید</span>
                          </button>
                          <button
                            onClick={() => {
                              setReviewingLeave(l);
                              setReviewAction('rejected');
                              setReviewManagerNote('');
                            }}
                            className="px-3 py-1 bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1"
                          >
                            <X className="w-3.5 h-3.5 stroke-[3]" />
                            <span>رد</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Leave Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-[#181818] p-3 rounded-lg text-xs">
                    <div>
                      <span className="text-[#777] block text-[10px]">نوع مرخصی:</span>
                      <span className="text-white font-bold">
                        {l.leave_type === 'daily'
                          ? `روزانه (${toPersianDigits(l.days_count || 1)} روز)`
                          : `ساعتی (${toPersianDigits(l.hours_count || 0)} ساعت)`}
                      </span>
                    </div>

                    <div>
                      <span className="text-[#777] block text-[10px]">بازه مرخصی:</span>
                      <span className="text-white font-mono">
                        {l.leave_type === 'daily'
                          ? `${formatPersianDate(l.start_date)} الی ${formatPersianDate(l.end_date || l.start_date)}`
                          : `${formatPersianDate(l.start_date)} (از ${toPersianDigits(l.start_time || '')} تا ${toPersianDigits(l.end_time || '')})`}
                      </span>
                    </div>

                    <div>
                      <span className="text-[#777] block text-[10px]">علت و شرح مرخصی:</span>
                      <span className="text-[#B3B3B3] line-clamp-1">{l.reason || 'بدون توضیح'}</span>
                    </div>
                  </div>

                  {l.manager_note && (
                    <div className="text-xs bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg text-amber-300">
                      <span className="font-bold">یادداشت مدیریت: </span>
                      <span>{l.manager_note}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 7. MODALS: Edit Colleague Modal                               */}
      {/* ------------------------------------------------------------- */}
      {editingColleague && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#181818] border border-[#282828] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#282828] pb-3">
              <h3 className="font-bold text-sm text-white">ویرایش مشخصات همکار</h3>
              <button
                onClick={() => setEditingColleague(null)}
                className="text-[#888] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[#B3B3B3] mb-1">نام و نام خانوادگی</label>
                <input
                  type="text"
                  value={editingColleague.name}
                  onChange={(e) =>
                    setEditingColleague({ ...editingColleague, name: e.target.value })
                  }
                  className="w-full h-9 px-3 bg-[#121212] rounded-xl text-white border border-[#333] focus:border-[#1DB954]"
                />
              </div>

              <div>
                <label className="block text-[#B3B3B3] mb-1">ایمیل سازمانی</label>
                <input
                  type="email"
                  dir="ltr"
                  value={editingColleague.email}
                  onChange={(e) =>
                    setEditingColleague({ ...editingColleague, email: e.target.value })
                  }
                  className="w-full h-9 px-3 bg-[#121212] rounded-xl text-white border border-[#333] focus:border-[#1DB954] font-mono"
                />
              </div>

              <div>
                <label className="block text-[#B3B3B3] mb-1">شماره تماس</label>
                <input
                  type="text"
                  dir="ltr"
                  value={editingColleague.phone || ''}
                  onChange={(e) =>
                    setEditingColleague({ ...editingColleague, phone: e.target.value })
                  }
                  className="w-full h-9 px-3 bg-[#121212] rounded-xl text-white border border-[#333] focus:border-[#1DB954] font-mono"
                />
              </div>

              <div>
                <label className="block text-[#B3B3B3] mb-1">نقش سازمانی</label>
                <select
                  value={editingColleague.role}
                  onChange={(e) =>
                    setEditingColleague({
                      ...editingColleague,
                      role: e.target.value as any,
                    })
                  }
                  className="w-full h-9 px-3 bg-[#121212] rounded-xl text-white border border-[#333] focus:border-[#1DB954]"
                >
                  <option value="marketer">کارشناس فروش</option>
                  <option value="sales_manager">مدیر فروش</option>
                  <option value="admin">مدیر سیستم</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#282828]">
              <button
                onClick={() => setEditingColleague(null)}
                className="px-4 py-2 rounded-xl bg-[#282828] text-white text-xs font-bold"
              >
                انصراف
              </button>
              <button
                onClick={handleSaveColleagueEdit}
                disabled={isUpdatingColleague}
                className="px-4 py-2 rounded-xl bg-[#1DB954] text-black text-xs font-bold hover:bg-[#1ed760]"
              >
                {isUpdatingColleague ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 8. MODALS: Leave Review Dialog                                */}
      {/* ------------------------------------------------------------- */}
      {reviewingLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#181818] border border-[#282828] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#282828] pb-3">
              <h3 className="font-bold text-sm text-white">
                {reviewAction === 'approved' ? 'تایید مرخصی' : 'رد درخواست مرخصی'}
              </h3>
              <button
                onClick={() => setReviewingLeave(null)}
                className="text-[#888] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-[#121212] rounded-xl text-[#B3B3B3] space-y-1">
                <div>
                  <span className="text-[#777]">متقاضی: </span>
                  <span className="text-white font-bold">{reviewingLeave.personnel_name}</span>
                </div>
                <div>
                  <span className="text-[#777]">نوع و تاریخ: </span>
                  <span className="text-white">
                    {reviewingLeave.leave_type === 'daily'
                      ? `روزانه (${formatPersianDate(reviewingLeave.start_date)})`
                      : `ساعتی (${reviewingLeave.hours_count} ساعت)`}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[#B3B3B3] mb-1">
                  یادداشت و پیام مدیریت (اختیاری):
                </label>
                <textarea
                  rows={3}
                  value={reviewManagerNote}
                  onChange={(e) => setReviewManagerNote(e.target.value)}
                  placeholder="علت رد یا توضیحات تایید جهت مشاهده کارشناس..."
                  className="w-full p-3 bg-[#121212] rounded-xl text-white border border-[#333] focus:border-[#1DB954] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#282828]">
              <button
                onClick={() => setReviewingLeave(null)}
                className="px-4 py-2 rounded-xl bg-[#282828] text-white text-xs font-bold"
              >
                انصراف
              </button>
              <button
                onClick={handleConfirmLeaveReview}
                disabled={isProcessingLeaveReview}
                className={`px-4 py-2 rounded-xl font-bold text-xs text-black ${
                  reviewAction === 'approved'
                    ? 'bg-emerald-500 hover:bg-emerald-400'
                    : 'bg-rose-500 hover:bg-rose-400 text-white'
                }`}
              >
                {isProcessingLeaveReview ? 'در حال ثبت...' : reviewAction === 'approved' ? 'تایید نهایی' : 'ثبت رد درخواست'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
