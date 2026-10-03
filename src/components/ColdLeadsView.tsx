import React, { useState, useMemo } from 'react';
import {
  PhoneCall,
  Plus,
  Search,
  Phone,
  Sparkles,
  Copy,
  Clock,
  User,
  Filter,
  Users,
  ArrowLeftRight,
  Check,
  CheckCircle2,
  Trash2,
  Shield,
  UserCheck,
  Building2,
  ChevronDown,
  X,
  Send,
  LayoutGrid,
  List,
} from 'lucide-react';
import { ColdLead, Personnel, LeadStatus, AuthUser } from '../types';
import { formatPersianDateTime, getLeadStatusTheme, toPersianDigits } from '../utils';

interface ColdLeadsViewProps {
  coldLeads: ColdLead[];
  personnelList: Personnel[];
  currentPersonnel?: Personnel | null;
  currentUser?: AuthUser | null;
  isAdmin?: boolean;
  onAddLead: (lead: Partial<ColdLead>) => Promise<void>;
  onUpdateLeadStatus: (leadId: string, status: LeadStatus) => Promise<void>;
  onUpdateLeadAssignedTo?: (leadId: string, assignedToId: string) => Promise<void>;
  onBulkAssignLeads?: (leadIds: string[], targetMarketerId: string) => Promise<void>;
  onDeleteLead?: (leadId: string) => Promise<void>;
  onConvertToCustomer: (lead: ColdLead) => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const ColdLeadsView: React.FC<ColdLeadsViewProps> = ({
  coldLeads,
  personnelList,
  currentPersonnel,
  currentUser,
  isAdmin = false,
  onAddLead,
  onUpdateLeadStatus,
  onUpdateLeadAssignedTo,
  onBulkAssignLeads,
  onDeleteLead,
  onConvertToCustomer,
  showToast,
}) => {
  const userIsAdmin = Boolean(
    isAdmin ||
    currentUser?.is_admin ||
    currentUser?.app_role === 'admin' ||
    currentUser?.role_id === '59e261e1-56f4-401e-9889-4971e2c3c4ce' ||
    currentUser?.role_id === 'a45beaec-0272-4c29-89ee-122dce37f565' ||
    currentPersonnel?.role === 'admin'
  );

  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [showAddForm, setShowAddForm] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [contactName, setContactName] = useState('');
  const [source, setSource] = useState('دایرکت اینستاگرام');
  const [notes, setNotes] = useState('');
  const [assignedTo, setAssignedTo] = useState<string>(
    userIsAdmin ? (personnelList[0]?.id || '') : (currentPersonnel?.id || currentUser?.id || '')
  );
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('همه');
  const [marketerFilter, setMarketerFilter] = useState<string>('همه');

  // Multi-selection state for Bulk Assignment
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [bulkTargetMarketerId, setBulkTargetMarketerId] = useState<string>('');
  const [isBulkAssigning, setIsBulkAssigning] = useState(false);

  const leadStatuses: string[] = [
    'همه',
    'تماس نگرفته',
    'در حال بررسی',
    'پاسخ نداد',
    'تبدیل شده به مشتری',
    'شماره نامعتبر',
  ];

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) {
      showToast?.('لطفاً شماره تماس را وارد کنید.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const finalAssigned = userIsAdmin
        ? assignedTo || currentPersonnel?.id || null
        : currentPersonnel?.id || currentUser?.id || null;

      await onAddLead({
        phone_number: phoneNumber.trim(),
        contact_name: contactName.trim(),
        source: source.trim(),
        notes: notes.trim(),
        assigned_to: finalAssigned as any,
        status: 'تماس نگرفته',
      });

      showToast?.('شماره جدید با موفقیت در بانک شماره‌های اولیه ثبت شد.', 'success');
      setPhoneNumber('');
      setContactName('');
      setNotes('');
      setShowAddForm(false);
    } catch (err: any) {
      showToast?.('خطا در افزودن شماره: ' + (err.message || ''), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast?.(`شماره ${text} در حافظه کپی شد.`, 'info');
  };

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return coldLeads.filter((lead) => {
      // Status filter
      if (statusFilter !== 'همه' && lead.status !== statusFilter) return false;

      // Marketer filter (Admin feature)
      if (userIsAdmin && marketerFilter !== 'همه') {
        if (marketerFilter === 'unassigned') {
          if (lead.assigned_to_id || (lead.assigned_to && lead.assigned_to !== 'تخصیص نیافته')) {
            return false;
          }
        } else {
          const matchesId = lead.assigned_to_id === marketerFilter || lead.assigned_to === marketerFilter;
          const targetObj = personnelList.find((p) => p.id === marketerFilter);
          const matchesName = targetObj && (lead.assigned_to_name === targetObj.name || lead.assigned_to === targetObj.name);
          if (!matchesId && !matchesName) return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchPhone = lead.phone_number?.includes(q);
        const matchName = lead.contact_name?.toLowerCase().includes(q);
        const matchSource = lead.source?.toLowerCase().includes(q);
        const matchNotes = lead.notes?.toLowerCase().includes(q);
        const matchMarketer = (lead.assigned_to_name || lead.assigned_to || '')?.toLowerCase().includes(q);
        if (!matchPhone && !matchName && !matchSource && !matchNotes && !matchMarketer) return false;
      }

      return true;
    });
  }, [coldLeads, statusFilter, marketerFilter, userIsAdmin, searchQuery, personnelList]);

  // Bulk Selection Handlers
  const handleToggleSelectLead = (id: string) => {
    setSelectedLeadIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllLeads = () => {
    if (selectedLeadIds.length === filteredLeads.length) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(filteredLeads.map((l) => l.id));
    }
  };

  const handleExecuteBulkAssign = async () => {
    if (selectedLeadIds.length === 0) {
      showToast?.('لطفاً حداقل یک شماره را انتخاب کنید.', 'error');
      return;
    }
    if (!bulkTargetMarketerId) {
      showToast?.('لطفاً بازاریاب مقصد را انتخاب کنید.', 'error');
      return;
    }
    if (!onBulkAssignLeads) {
      showToast?.('قابلیت تخصیص گروهی در دسترس نیست.', 'error');
      return;
    }

    setIsBulkAssigning(true);
    try {
      await onBulkAssignLeads(selectedLeadIds, bulkTargetMarketerId);
      const targetObj = personnelList.find((p) => p.id === bulkTargetMarketerId);
      showToast?.(
        `${toPersianDigits(selectedLeadIds.length)} شماره با موفقیت به «${targetObj?.name || 'بازاریاب'}» واگذار شد.`,
        'success'
      );
      setSelectedLeadIds([]);
      setBulkTargetMarketerId('');
    } catch (err: any) {
      showToast?.(err.message || 'خطا در واگذاری شماره‌ها', 'error');
    } finally {
      setIsBulkAssigning(false);
    }
  };

  // Helper to get marketer display name for a lead
  const getLeadMarketerName = (lead: ColdLead): string => {
    if (lead.assigned_to_name && lead.assigned_to_name !== 'تخصیص نیافته') {
      return lead.assigned_to_name;
    }
    if (lead.assigned_to_id) {
      const p = personnelList.find((item) => item.id === lead.assigned_to_id);
      if (p) return p.name;
    }
    if (typeof lead.assigned_to === 'string' && lead.assigned_to) {
      const p = personnelList.find((item) => item.id === lead.assigned_to || item.name === lead.assigned_to);
      if (p) return p.name;
      return lead.assigned_to;
    }
    return 'تخصیص نیافته';
  };

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200">
      {/* Title & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#1DB954]/15 border border-[#1DB954]/30 flex items-center justify-center text-[#1DB954]">
              <PhoneCall className="w-5 h-5 stroke-[2.5]" />
            </div>
            <span>بانک شماره‌های اولیه</span>
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-[#1DB954]/15 text-[#1DB954] font-bold border border-[#1DB954]/30">
              {toPersianDigits(filteredLeads.length)} شماره
            </span>
          </h2>
          <p className="text-xs text-[#A7A7A7] mt-1">
            {userIsAdmin
              ? 'مخزن جامع شماره‌های خام ورودی سیستم، با قابلیت تخصیص تکی و گروهی به کارشناسان فروش'
              : 'شماره‌های ثبت‌شده و اختصاص‌یافته به شما جهت تماس اولیه و تبدیل به پرونده مشتری'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle (Grid / Table) */}
          <div className="flex items-center bg-[#181818] p-1 rounded-xl border border-[#282828]">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-[#1DB954] text-black shadow-sm'
                  : 'text-[#888] hover:text-white'
              }`}
              title="نمای کارتی"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'table'
                  ? 'bg-[#1DB954] text-black shadow-sm'
                  : 'text-[#888] hover:text-white'
              }`}
              title="نمای لیستی / جدولی"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="h-10 px-4 rounded-xl bg-[#1DB954] hover:bg-[#1ED760] text-black font-extrabold text-xs flex items-center gap-2 transition-all hover:scale-[1.02] shadow-lg shadow-[#1DB954]/20 flex-shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>افزودن شماره جدید</span>
          </button>
        </div>
      </div>

      {/* Add Lead Drawer */}
      {showAddForm && (
        <form
          onSubmit={handleCreateLead}
          className="p-5 sm:p-6 rounded-2xl bg-[#181818] border border-[#1DB954]/40 shadow-2xl space-y-4 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="flex items-center justify-between border-b border-[#282828] pb-3">
            <div className="text-xs font-bold text-white flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-[#1DB954]" />
              <span>ثبت سریع شماره جدید در مخزن شماره‌های اولیه</span>
            </div>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-xs text-[#A7A7A7] hover:text-white flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              <span>بستن</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
            {/* Phone Number */}
            <div>
              <label className="block text-[11px] font-semibold text-[#B3B3B3] mb-1">
                شماره موبایل / ثابت <span className="text-[#E22134]">*</span>
              </label>
              <input
                type="text"
                required
                dir="ltr"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="09121234567"
                className="w-full h-9 px-3 bg-[#121212] rounded-xl text-xs text-white focus:outline-none focus:border-[#1DB954] border border-[#2c2c2c] font-mono"
              />
            </div>

            {/* Contact Name */}
            <div>
              <label className="block text-[11px] font-semibold text-[#B3B3B3] mb-1">
                نام مخاطب یا فروشگاه (اختیاری)
              </label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="مثال: آقای کریمی (تولیدی کیف)"
                className="w-full h-9 px-3 bg-[#121212] rounded-xl text-xs text-white focus:outline-none focus:border-[#1DB954] border border-[#2c2c2c]"
              />
            </div>

            {/* Source */}
            <div>
              <label className="block text-[11px] font-semibold text-[#B3B3B3] mb-1">
                منبع دریافت شماره
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full h-9 px-2.5 bg-[#121212] rounded-xl text-xs text-white focus:outline-none focus:border-[#1DB954] border border-[#2c2c2c]"
              >
                <option value="دایرکت اینستاگرام">دایرکت اینستاگرام</option>
                <option value="فرم سایت / لندینگ">فرم سایت / لندینگ</option>
                <option value="معرفی مشتریان">معرفی مشتریان قبلی</option>
                <option value="تبلیغات پیامکی">تبلیغات پیامکی</option>
                <option value="نمایشگاه و رویداد">نمایشگاه و رویداد</option>
                <option value="جستجوی مارکت / وب">جستجوی وب / دیوار / شیپور</option>
                <option value="ورود دستی">ورود دستی</option>
              </select>
            </div>

            {/* Assigned Marketer */}
            <div>
              <label className="block text-[11px] font-semibold text-[#B3B3B3] mb-1">
                بازاریاب مسئول
              </label>
              {userIsAdmin ? (
                <select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="w-full h-9 px-2.5 bg-[#121212] rounded-xl text-xs text-white focus:outline-none focus:border-[#1DB954] border border-[#2c2c2c]"
                >
                  <option value="">-- بدون تخصیص (عمومی) --</option>
                  {personnelList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.role === 'admin' ? 'مدیر' : 'کارشناس'})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="w-full h-9 px-3 bg-[#121212] rounded-xl text-xs text-[#1DB954] border border-[#2c2c2c] flex items-center font-bold">
                  {currentPersonnel?.name || currentUser?.name || 'شما'}
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-semibold text-[#B3B3B3] mb-1">
              یادداشت یا توضیحات اولیه
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: سوال در مورد تعرفه همکاری داشتند، قبل از ظهر تماس گرفته شود..."
              className="w-full h-9 px-3 bg-[#121212] rounded-xl text-xs text-white focus:outline-none focus:border-[#1DB954] border border-[#2c2c2c]"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="h-8 px-4 rounded-xl border border-[#333] text-xs text-[#B3B3B3] hover:text-white"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="h-8 px-6 rounded-xl bg-[#1DB954] hover:bg-[#1ED760] text-black font-extrabold text-xs shadow-md"
            >
              {submitting ? 'در حال ثبت...' : 'ذخیره در بانک شماره‌ها'}
            </button>
          </div>
        </form>
      )}

      {/* Filter & Toolbar Row */}
      <div className="p-3.5 sm:p-4 bg-[#181818] rounded-2xl border border-[#282828] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-[240px]">
          <div className="relative flex-1 max-w-sm">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو در شماره، نام، منبع، بازاریاب..."
              className="w-full h-9 bg-[#121212] rounded-xl pl-3 pr-9 text-xs text-white placeholder-[#777] focus:outline-none focus:border-[#1DB954] border border-[#2c2c2c]"
            />
            <Search className="w-3.5 h-3.5 text-[#777] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Admin Marketer Filter */}
          {userIsAdmin && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[#888] hidden sm:inline">بازاریاب:</span>
              <select
                value={marketerFilter}
                onChange={(e) => setMarketerFilter(e.target.value)}
                className="h-9 px-3 rounded-xl bg-[#121212] text-xs text-white border border-[#2c2c2c] focus:outline-none focus:border-[#1DB954] cursor-pointer"
              >
                <option value="همه">همه بازاریابان</option>
                <option value="unassigned">تخصیص نیافته</option>
                {personnelList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-[#888] hidden sm:inline">وضعیت:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 px-3 rounded-xl bg-[#121212] text-xs text-white border border-[#2c2c2c] focus:outline-none focus:border-[#1DB954] cursor-pointer"
            >
              <option value="همه">همه وضعیت‌ها</option>
              {leadStatuses
                .filter((st) => st !== 'همه')
                .map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
            </select>
          </div>

          {/* Select All Checkbox Button for Admin */}
          {userIsAdmin && filteredLeads.length > 0 && (
            <button
              onClick={handleSelectAllLeads}
              className="text-xs text-[#1DB954] hover:underline font-bold px-2 py-1"
            >
              {selectedLeadIds.length === filteredLeads.length
                ? 'لغو انتخاب همه'
                : `انتخاب همه (${toPersianDigits(filteredLeads.length)})`}
            </button>
          )}
        </div>
      </div>

      {/* Floating Sticky Bulk Assignment Bar for Admin */}
      {userIsAdmin && selectedLeadIds.length > 0 && (
        <div className="sticky top-20 z-30 p-3.5 bg-gradient-to-r from-[#181818] to-[#202020] border-2 border-[#1DB954] rounded-2xl shadow-2xl flex flex-wrap items-center justify-between gap-3 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-full bg-[#1DB954] text-black font-extrabold text-xs flex items-center justify-center font-mono">
              {toPersianDigits(selectedLeadIds.length)}
            </span>
            <span className="text-xs font-bold text-white">شماره انتخاب شده جهت واگذاری</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={bulkTargetMarketerId}
              onChange={(e) => setBulkTargetMarketerId(e.target.value)}
              className="h-9 px-3 bg-[#121212] rounded-xl text-xs text-white border border-[#444] focus:border-[#1DB954] focus:outline-none"
            >
              <option value="">-- انتخاب بازاریاب مقصد --</option>
              {personnelList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.role === 'admin' ? 'مدیر' : 'کارشناس'})
                </option>
              ))}
            </select>

            <button
              onClick={handleExecuteBulkAssign}
              disabled={isBulkAssigning || !bulkTargetMarketerId}
              className="h-9 px-4 rounded-xl bg-[#1DB954] hover:bg-[#1ED760] disabled:opacity-40 text-black font-extrabold text-xs shadow-md transition-all flex items-center gap-1.5"
            >
              {isBulkAssigning ? (
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <ArrowLeftRight className="w-4 h-4 stroke-[2.5]" />
              )}
              <span>واگذاری گروهی</span>
            </button>

            <button
              onClick={() => setSelectedLeadIds([])}
              className="h-9 px-3 rounded-xl bg-[#282828] text-xs text-[#B3B3B3] hover:text-white"
            >
              لغو
            </button>
          </div>
        </div>
      )}

      {/* Main Content: Grid View or Table/List View */}
      {filteredLeads.length === 0 ? (
        <div className="p-12 text-center bg-[#181818] rounded-2xl border border-[#282828] space-y-3">
          <PhoneCall className="w-10 h-10 text-[#535353] mx-auto" />
          <p className="text-xs text-[#A7A7A7]">هیچ شماره‌ای مطابق جستجو و فیلتر یافت نشد.</p>
        </div>
      ) : viewMode === 'grid' ? (
        /* ------------------------------------------------------------- */
        /* 1. GRID / CARDS VIEW                                          */
        /* ------------------------------------------------------------- */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLeads.map((lead) => {
            const statusTheme = getLeadStatusTheme(lead.status);
            const isSelected = selectedLeadIds.includes(lead.id);
            const marketerName = getLeadMarketerName(lead);

            return (
              <div
                key={lead.id}
                className={`bg-[#181818] hover:bg-[#1d1d1d] rounded-2xl p-4 sm:p-5 border transition-all space-y-3.5 flex flex-col justify-between ${
                  isSelected ? 'border-[#1DB954] bg-[#1DB954]/5 shadow-lg shadow-[#1DB954]/10' : 'border-[#282828] hover:border-[#383838]'
                }`}
              >
                <div>
                  {/* Top: Checkbox, Phone & Status */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {userIsAdmin && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectLead(lead.id)}
                          className="w-4 h-4 rounded text-[#1DB954] accent-[#1DB954] cursor-pointer flex-shrink-0"
                        />
                      )}
                      <span className="font-mono text-base font-black text-white tracking-wide truncate" dir="ltr">
                        {lead.phone_number}
                      </span>
                      <button
                        onClick={() => copyToClipboard(lead.phone_number)}
                        className="p-1 text-[#888] hover:text-white transition-colors flex-shrink-0"
                        title="کپی شماره"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full ${statusTheme.bg} ${statusTheme.color} font-bold border whitespace-nowrap flex-shrink-0`}>
                      {lead.status}
                    </span>
                  </div>

                  {/* Contact Name & Source */}
                  <div className="flex items-center gap-2 text-xs text-[#B3B3B3] mb-1.5">
                    {lead.contact_name ? (
                      <span className="font-bold text-white truncate">{lead.contact_name}</span>
                    ) : (
                      <span className="text-[#666]">نام اولیه نامشخص</span>
                    )}
                    <span>·</span>
                    <span className="text-[#888] bg-[#121212] px-2 py-0.5 rounded-md border border-[#242424] text-[11px] whitespace-nowrap">
                      {lead.source}
                    </span>
                  </div>

                  {/* Notes */}
                  {lead.notes && (
                    <p className="text-xs text-[#B3B3B3] bg-[#121212] p-2.5 rounded-xl border border-[#242424] mt-2 line-clamp-2 leading-relaxed">
                      {lead.notes}
                    </p>
                  )}
                </div>

                {/* Footer Section */}
                <div className="pt-3 border-t border-[#242424] space-y-2.5">
                  {/* Marketer Assignment Badge & Quick Switch */}
                  <div className="flex items-center justify-between text-xs text-[#888]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <User className="w-3.5 h-3.5 text-[#1DB954] flex-shrink-0" />
                      <span className="text-[11px] whitespace-nowrap">بازاریاب:</span>
                      {userIsAdmin && onUpdateLeadAssignedTo ? (
                        <select
                          value={lead.assigned_to_id || lead.assigned_to || ''}
                          onChange={async (e) => {
                            const newId = e.target.value;
                            await onUpdateLeadAssignedTo(lead.id, newId);
                            showToast?.('بازاریاب مسئول این شماره تغییر یافت.', 'success');
                          }}
                          className="bg-[#121212] border border-[#333] hover:border-[#1DB954] text-white font-bold text-[11px] rounded-lg px-2 py-0.5 cursor-pointer focus:outline-none truncate max-w-[140px]"
                        >
                          <option value="">تخصیص نیافته</option>
                          {personnelList.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="font-bold text-white text-[11px] truncate">{marketerName}</span>
                      )}
                    </div>

                    <span className="text-[10px] text-[#777] font-mono whitespace-nowrap flex-shrink-0">
                      {formatPersianDateTime(lead.date_created)}
                    </span>
                  </div>

                  {/* Action Buttons: Clean 1-Line Layout */}
                  <div className="flex items-center justify-between gap-1.5 pt-1 overflow-x-auto no-scrollbar">
                    {/* Direct Call Button */}
                    <a
                      href={`tel:${lead.phone_number}`}
                      className="inline-flex items-center gap-1 h-8 px-2.5 rounded-xl bg-[#242424] hover:bg-[#303030] text-white text-xs font-bold transition-colors whitespace-nowrap flex-shrink-0"
                    >
                      <Phone className="w-3.5 h-3.5 text-[#1DB954] flex-shrink-0" />
                      <span>تماس</span>
                    </a>

                    {/* Status dropdown quick update */}
                    <select
                      value={lead.status}
                      onChange={(e) => onUpdateLeadStatus(lead.id, e.target.value as LeadStatus)}
                      className="h-8 px-2 rounded-xl bg-[#121212] text-[11px] text-white border border-[#2c2c2c] focus:outline-none cursor-pointer flex-1 min-w-[105px] max-w-[130px] truncate"
                    >
                      <option value="تماس نگرفته">تماس نگرفته</option>
                      <option value="در حال بررسی">در حال بررسی</option>
                      <option value="پاسخ نداد">پاسخ نداد</option>
                      <option value="شماره نامعتبر">شماره نامعتبر</option>
                      <option value="تبدیل شده به مشتری">تبدیل شده به مشتری</option>
                    </select>

                    {/* Convert to full customer button */}
                    {lead.status !== 'تبدیل شده به مشتری' && (
                      <button
                        onClick={() => onConvertToCustomer(lead)}
                        className="inline-flex items-center gap-1 h-8 px-3 rounded-xl bg-[#1DB954] hover:bg-[#1ED760] text-black text-xs font-black transition-transform hover:scale-105 shadow-sm whitespace-nowrap flex-shrink-0"
                        title="ایجاد پرونده کامل مشتری با این شماره"
                      >
                        <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="whitespace-nowrap">ثبت پرونده</span>
                      </button>
                    )}

                    {/* Delete Lead Button for Admin */}
                    {userIsAdmin && onDeleteLead && (
                      <button
                        onClick={async () => {
                          if (confirm(`آیا از حذف شماره «${lead.phone_number}» اطمینان دارید؟`)) {
                            await onDeleteLead(lead.id);
                            showToast?.('شماره با موفقیت حذف شد.', 'info');
                          }
                        }}
                        className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/15 transition-colors flex-shrink-0"
                        title="حذف شماره"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ------------------------------------------------------------- */
        /* 2. TABLE / LIST VIEW (نمای لیستی / جدولی)                     */
        /* ------------------------------------------------------------- */
        <div className="bg-[#181818] border border-[#282828] rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#121212] text-[#888] font-bold border-b border-[#282828]">
                <tr>
                  {userIsAdmin && (
                    <th className="p-3.5 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={selectedLeadIds.length === filteredLeads.length && filteredLeads.length > 0}
                        onChange={handleSelectAllLeads}
                        className="w-4 h-4 rounded text-[#1DB954] accent-[#1DB954] cursor-pointer"
                      />
                    </th>
                  )}
                  <th className="p-3.5">شماره تماس</th>
                  <th className="p-3.5">نام مخاطب / فروشگاه</th>
                  <th className="p-3.5">منبع</th>
                  <th className="p-3.5">وضعیت پیگیری</th>
                  <th className="p-3.5">بازاریاب مسئول</th>
                  <th className="p-3.5">تاریخ ثبت</th>
                  <th className="p-3.5 text-center">اقدامات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222]">
                {filteredLeads.map((lead) => {
                  const statusTheme = getLeadStatusTheme(lead.status);
                  const isSelected = selectedLeadIds.includes(lead.id);
                  const marketerName = getLeadMarketerName(lead);

                  return (
                    <tr
                      key={lead.id}
                      className={`hover:bg-[#202020] transition-colors ${
                        isSelected ? 'bg-[#1DB954]/5' : ''
                      }`}
                    >
                      {userIsAdmin && (
                        <td className="p-3.5 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectLead(lead.id)}
                            className="w-4 h-4 rounded text-[#1DB954] accent-[#1DB954] cursor-pointer"
                          />
                        </td>
                      )}
                      <td className="p-3.5 font-mono font-bold text-white whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span dir="ltr">{lead.phone_number}</span>
                          <button
                            onClick={() => copyToClipboard(lead.phone_number)}
                            className="p-1 text-[#777] hover:text-white"
                            title="کپی شماره"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="p-3.5 text-white font-semibold whitespace-nowrap">
                        {lead.contact_name || <span className="text-[#666]">نامشخص</span>}
                        {lead.notes && (
                          <div className="text-[11px] text-[#777] font-normal truncate max-w-xs mt-0.5">
                            {lead.notes}
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <span className="bg-[#121212] px-2 py-0.5 rounded text-[11px] text-[#888] border border-[#282828]">
                          {lead.source}
                        </span>
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <select
                          value={lead.status}
                          onChange={(e) => onUpdateLeadStatus(lead.id, e.target.value as LeadStatus)}
                          className={`h-7 px-2 rounded-lg text-[11px] font-bold border ${statusTheme.bg} ${statusTheme.color} focus:outline-none cursor-pointer`}
                        >
                          <option value="تماس نگرفته">تماس نگرفته</option>
                          <option value="در حال بررسی">در حال بررسی</option>
                          <option value="پاسخ نداد">پاسخ نداد</option>
                          <option value="شماره نامعتبر">شماره نامعتبر</option>
                          <option value="تبدیل شده به مشتری">تبدیل شده به مشتری</option>
                        </select>
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        {userIsAdmin && onUpdateLeadAssignedTo ? (
                          <select
                            value={lead.assigned_to_id || lead.assigned_to || ''}
                            onChange={async (e) => {
                              const newId = e.target.value;
                              await onUpdateLeadAssignedTo(lead.id, newId);
                              showToast?.('بازاریاب تغییر یافت.', 'success');
                            }}
                            className="bg-[#121212] border border-[#333] hover:border-[#1DB954] text-white font-bold text-[11px] rounded-lg px-2 py-1 cursor-pointer focus:outline-none"
                          >
                            <option value="">تخصیص نیافته</option>
                            {personnelList.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="font-bold text-white text-xs">{marketerName}</span>
                        )}
                      </td>
                      <td className="p-3.5 text-[#777] font-mono text-[11px] whitespace-nowrap">
                        {formatPersianDateTime(lead.date_created)}
                      </td>
                      <td className="p-3.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <a
                            href={`tel:${lead.phone_number}`}
                            className="p-1.5 rounded-lg bg-[#242424] hover:bg-[#303030] text-white transition-colors"
                            title="تماس مستقیم"
                          >
                            <Phone className="w-3.5 h-3.5 text-[#1DB954]" />
                          </a>

                          {lead.status !== 'تبدیل شده به مشتری' && (
                            <button
                              onClick={() => onConvertToCustomer(lead)}
                              className="px-2.5 py-1 rounded-lg bg-[#1DB954] hover:bg-[#1ED760] text-black font-extrabold text-[11px] flex items-center gap-1 transition-transform hover:scale-105"
                              title="ثبت پرونده مشتری"
                            >
                              <Sparkles className="w-3 h-3" />
                              <span className="whitespace-nowrap">ثبت پرونده</span>
                            </button>
                          )}

                          {userIsAdmin && onDeleteLead && (
                            <button
                              onClick={async () => {
                                if (confirm(`آیا از حذف شماره «${lead.phone_number}» اطمینان دارید؟`)) {
                                  await onDeleteLead(lead.id);
                                  showToast?.('شماره حذف شد.', 'info');
                                }
                              }}
                              className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/15 transition-colors"
                              title="حذف شماره"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
