import React, { useState } from 'react';
import {
  PhoneCall,
  Plus,
  Search,
  Phone,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Copy,
  Clock,
  User,
  Tag,
  Filter,
} from 'lucide-react';
import { ColdLead, Personnel, LeadStatus } from '../types';
import { formatPersianDateTime, getLeadStatusTheme } from '../utils';

interface ColdLeadsViewProps {
  coldLeads: ColdLead[];
  personnelList: Personnel[];
  onAddLead: (lead: Partial<ColdLead>) => Promise<void>;
  onUpdateLeadStatus: (leadId: string, status: LeadStatus) => Promise<void>;
  onConvertToCustomer: (lead: ColdLead) => void;
}

export const ColdLeadsView: React.FC<ColdLeadsViewProps> = ({
  coldLeads,
  personnelList,
  onAddLead,
  onUpdateLeadStatus,
  onConvertToCustomer,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [contactName, setContactName] = useState('');
  const [source, setSource] = useState('دایرکت اینستاگرام');
  const [notes, setNotes] = useState('');
  const [assignedTo, setAssignedTo] = useState(personnelList[0]?.name || '');
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('همه');

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
      alert('لطفاً شماره تماس را وارد کنید.');
      return;
    }

    setSubmitting(true);
    try {
      await onAddLead({
        phone_number: phoneNumber.trim(),
        contact_name: contactName.trim(),
        source: source.trim(),
        notes: notes.trim(),
        assigned_to: assignedTo,
        status: 'تماس نگرفته',
      });
      setPhoneNumber('');
      setContactName('');
      setNotes('');
      setShowAddForm(false);
    } catch (err: any) {
      alert('خطا در افزودن شماره: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert(`شماره ${text} در کلیپ‌بورد کپی شد.`);
  };

  const filteredLeads = coldLeads.filter((lead) => {
    if (statusFilter !== 'همه' && lead.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchPhone = lead.phone_number.includes(q);
      const matchName = lead.contact_name?.toLowerCase().includes(q);
      const matchSource = lead.source?.toLowerCase().includes(q);
      const matchNotes = lead.notes?.toLowerCase().includes(q);
      if (!matchPhone && !matchName && !matchSource && !matchNotes) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Title & Action */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>بانک شماره‌های اولیه (Cold Leads)</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-[#1DB954]/15 text-[#1DB954] font-bold">
              {filteredLeads.length} شماره
            </span>
          </h2>
          <p className="text-xs text-[#A7A7A7] mt-1">
            مخزن ذخیره شماره‌های ورودی از اینستاگرام، معرف‌ها و فرم‌ها جهت تماس اولیه و تکمیل مشخصات
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="h-9 px-4 rounded-full bg-[#1DB954] hover:bg-[#1ED760] text-black font-bold text-xs transition-all hover:scale-105 shadow-md shadow-[#1DB954]/20 flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>افزودن شماره جدید</span>
        </button>
      </div>

      {/* Add Lead Inline Drawer */}
      {showAddForm && (
        <form
          onSubmit={handleCreateLead}
          className="p-5 rounded-2xl bg-[#181818] border border-[#1DB954]/40 shadow-xl space-y-4 animate-in fade-in"
        >
          <div className="flex items-center justify-between border-b border-[#282828] pb-3">
            <div className="text-xs font-bold text-white flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-[#1DB954]" />
              <span>ثبت سریع شماره جدید برای پیگیری اولیه</span>
            </div>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-xs text-[#A7A7A7] hover:text-white"
            >
              بستن فرم
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Phone */}
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
                className="w-full h-9 px-3 bg-[#282828] rounded-md text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#1DB954]"
              />
            </div>

            {/* Contact Name */}
            <div>
              <label className="block text-[11px] font-semibold text-[#B3B3B3] mb-1">
                نام اولیه یا نام فروشگاه (اختیاری)
              </label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="مثال: آقای کریمی (تولیدی کیف)"
                className="w-full h-9 px-3 bg-[#282828] rounded-md text-xs text-white focus:outline-none"
              />
            </div>

            {/* Source */}
            <div>
              <label className="block text-[11px] font-semibold text-[#B3B3B3] mb-1">
                منبع شماره
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full h-9 px-2.5 bg-[#282828] rounded-md text-xs text-white focus:outline-none"
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

            {/* Assigned to */}
            <div>
              <label className="block text-[11px] font-semibold text-[#B3B3B3] mb-1">
                بازاریاب جهت تماس
              </label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full h-9 px-2.5 bg-[#282828] rounded-md text-xs text-white focus:outline-none"
              >
                {personnelList.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-semibold text-[#B3B3B3] mb-1">
              یادداشت یا زمینه تقاضا
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: سوال در مورد تعرفه همکاری داشتند، قبل از ظهر تماس گرفته شود..."
              className="w-full h-9 px-3 bg-[#282828] rounded-md text-xs text-white focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="h-8 px-4 rounded-full border border-[#535353] text-xs text-[#B3B3B3] hover:text-white"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="h-8 px-6 rounded-full bg-[#1DB954] hover:bg-[#1ED760] text-black font-bold text-xs"
            >
              {submitting ? 'در حال ثبت...' : 'ذخیره در بانک شماره‌ها'}
            </button>
          </div>
        </form>
      )}

      {/* Filter Row */}
      <div className="p-4 bg-[#181818] rounded-2xl border border-[#282828] flex flex-wrap items-center justify-between gap-3">
        <div className="flex-1 max-w-sm relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو در شماره، نام، منبع یا یادداشت..."
            className="w-full h-9 bg-[#282828] rounded-full pl-3 pr-9 text-xs text-white placeholder-[#A7A7A7] focus:outline-none focus:ring-1 focus:ring-white"
          />
          <Search className="w-3.5 h-3.5 text-[#A7A7A7] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {leadStatuses.map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                statusFilter === st
                  ? 'bg-[#1DB954] text-black font-bold'
                  : 'bg-[#282828] text-[#B3B3B3] hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Leads Grid */}
      {filteredLeads.length === 0 ? (
        <div className="p-12 text-center bg-[#181818] rounded-2xl border border-[#282828] space-y-3">
          <PhoneCall className="w-10 h-10 text-[#535353] mx-auto" />
          <p className="text-xs text-[#A7A7A7]">هیچ شماره‌ای مطابق جستجو یافت نشد.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLeads.map((lead) => {
            const statusTheme = getLeadStatusTheme(lead.status);

            return (
              <div
                key={lead.id}
                className="bg-[#181818] hover:bg-[#1f1f1f] rounded-2xl p-4 border border-[#282828] hover:border-[#3e3e3e] transition-all space-y-3 flex flex-col justify-between"
              >
                <div>
                  {/* Top: Phone & Status */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-base font-bold text-white tracking-wide" dir="ltr">
                        {lead.phone_number}
                      </span>
                      <button
                        onClick={() => copyToClipboard(lead.phone_number)}
                        className="p-1 text-[#A7A7A7] hover:text-white transition-colors"
                        title="کپی شماره"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>

                    <span className={`text-[11px] px-2.5 py-0.5 rounded-full ${statusTheme.bg} ${statusTheme.color} font-medium`}>
                      {lead.status}
                    </span>
                  </div>

                  {/* Contact Name & Source */}
                  <div className="flex items-center gap-2 text-xs text-[#B3B3B3] mb-1">
                    {lead.contact_name ? (
                      <span className="font-semibold text-white">{lead.contact_name}</span>
                    ) : (
                      <span className="text-[#666]">نام اولیه نامشخص</span>
                    )}
                    <span>·</span>
                    <span className="text-[#A7A7A7]">{lead.source}</span>
                  </div>

                  {/* Notes */}
                  {lead.notes && (
                    <p className="text-xs text-[#A7A7A7] bg-[#121212] p-2 rounded-lg border border-[#222] mt-2 line-clamp-2">
                      {lead.notes}
                    </p>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="pt-3 border-t border-[#282828] space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-[#A7A7A7]">
                    <span>بازاریاب: {lead.assigned_to || 'عمومی'}</span>
                    <span>{formatPersianDateTime(lead.date_created)}</span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    {/* Direct Call */}
                    <a
                      href={`tel:${lead.phone_number}`}
                      className="inline-flex items-center gap-1 h-8 px-3 rounded-full bg-[#282828] hover:bg-[#333333] text-white text-xs font-semibold transition-colors"
                    >
                      <Phone className="w-3 h-3 text-[#1DB954]" />
                      <span>تماس</span>
                    </a>

                    {/* Status dropdown quick update */}
                    <select
                      value={lead.status}
                      onChange={(e) => onUpdateLeadStatus(lead.id, e.target.value as LeadStatus)}
                      className="h-8 px-2 rounded-full bg-[#282828] text-xs text-[#B3B3B3] border-none focus:outline-none"
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
                        className="inline-flex items-center gap-1 h-8 px-3 rounded-full bg-[#1DB954] hover:bg-[#1ED760] text-black text-xs font-bold transition-transform hover:scale-105 shadow-sm"
                        title="ایجاد پرونده کامل مشتری با این اطلاعات"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>ثبت پرونده</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
