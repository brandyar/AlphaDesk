import React, { useState } from 'react';
import {
  CalendarDays,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  UserCheck,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { Personnel } from '../types';

interface ShiftsViewProps {
  personnelList: Personnel[];
  currentPersonnel: Personnel | null;
}

export const ShiftsView: React.FC<ShiftsViewProps> = ({
  personnelList,
  currentPersonnel,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'shifts' | 'leaves'>('shifts');
  const [showNewLeaveModal, setShowNewLeaveModal] = useState(false);
  const [leaveType, setLeaveType] = useState('مرخصی روزانه استحقاقی');
  const [leaveDays, setLeaveDays] = useState(1);
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveList, setLeaveList] = useState([
    {
      id: 'l-1',
      personnel_name: 'سارا احمدی',
      type: 'مرخصی استحقاقی',
      date: '۱۴۰۳/۰۷/۱۰',
      status: 'تأیید شده',
      reason: 'امور اداری و بانکی شخصی',
    },
    {
      id: 'l-2',
      personnel_name: 'علیرضا حسینی',
      type: 'مرخصی ساعتی (۳ ساعت)',
      date: '۱۴۰۳/۰۷/۱۵',
      status: 'در انتظار بررسی',
      reason: 'مراجعه به پزشک',
    },
  ]);

  const handleAddLeave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveReason.trim()) {
      alert('لطفاً علت مرخصی را بنویسید.');
      return;
    }
    setLeaveList([
      {
        id: `l-${Date.now()}`,
        personnel_name: currentPersonnel?.name || 'پرسنل',
        type: `${leaveType} (${leaveDays} روز)`,
        date: new Date().toLocaleDateString('fa-IR'),
        status: 'در انتظار بررسی',
        reason: leaveReason,
      },
      ...leaveList,
    ]);
    setLeaveReason('');
    setShowNewLeaveModal(false);
  };

  const daysOfWeek = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه'];

  return (
    <div className="space-y-6">
      {/* Title & Phase 2 Notice */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-white tracking-tight">
              مدیریت شیفت‌ها و مرخصی‌های پرسنل
            </h2>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#282828] text-[#1DB954] font-bold border border-[#1DB954]/30">
              فاز بعدی (پیش‌نمایش)
            </span>
          </div>
          <p className="text-xs text-[#A7A7A7] mt-1">
            برنامه‌ریزی تقویم کاری، زمان‌بندی شیفت‌های پاسخگویی، درخواست‌های مرخصی و کارتابل تأیید مدیران
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNewLeaveModal(true)}
            className="h-9 px-4 rounded-full bg-[#1DB954] hover:bg-[#1ED760] text-black font-bold text-xs transition-all hover:scale-105 shadow-md shadow-[#1DB954]/20 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>ثبت درخواست مرخصی</span>
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="p-4 rounded-2xl bg-[#181818] border border-[#282828] flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#1DB954]/15 text-[#1DB954] flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="text-xs text-[#A7A7A7] leading-relaxed">
          این ماژول طبق برنامه‌ریزی، در فاز بعدی طراحی شده است و ساختار جدول‌های پایگاه داده آن متصل خواهد شد. هم‌اکنون می‌توانید تقویم آزمایشی شیفت‌ها و درخواست‌های مرخصی را مشاهده نمایید.
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveSubTab('shifts')}
          className={`h-9 px-5 rounded-full text-xs font-bold transition-all ${
            activeSubTab === 'shifts'
              ? 'bg-white text-black'
              : 'bg-[#181818] text-[#B3B3B3] hover:text-white border border-[#282828]'
          }`}
        >
          تقویم شیفت‌های هفتگی
        </button>
        <button
          onClick={() => setActiveSubTab('leaves')}
          className={`h-9 px-5 rounded-full text-xs font-bold transition-all ${
            activeSubTab === 'leaves'
              ? 'bg-white text-black'
              : 'bg-[#181818] text-[#B3B3B3] hover:text-white border border-[#282828]'
          }`}
        >
          درخواست‌های مرخصی ({leaveList.length})
        </button>
      </div>

      {/* SubTab 1: Shift Calendar */}
      {activeSubTab === 'shifts' && (
        <div className="bg-[#181818] rounded-2xl border border-[#282828] overflow-hidden">
          <div className="p-4 bg-[#121212] border-b border-[#282828] flex items-center justify-between">
            <span className="text-xs font-bold text-white">برنامه شیفت‌های هفته جاری</span>
            <span className="text-[11px] text-[#A7A7A7]">شیفت صبح (۸:۳۰ تا ۱۶:۳۰) · شیفت عصر (۱۴:۳۰ تا ۲۱:۰۰)</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-6 divide-y md:divide-y-0 md:divide-x md:divide-x-reverse divide-[#282828]">
            {daysOfWeek.map((day, idx) => (
              <div key={day} className="p-4 space-y-3">
                <div className="text-xs font-bold text-white border-b border-[#282828] pb-2 text-center">
                  {day}
                </div>

                {/* Shift items */}
                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-[#121212] border border-[#222] space-y-1">
                    <span className="text-[10px] text-[#1DB954] font-bold block">شیفت صبح</span>
                    <span className="text-white font-medium block">
                      {personnelList[idx % personnelList.length]?.name}
                    </span>
                    <span className="text-[10px] text-[#A7A7A7] block">پاسخگویی و پیگیری</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#121212] border border-[#222] space-y-1">
                    <span className="text-[10px] text-[#229ED9] font-bold block">شیفت عصر</span>
                    <span className="text-white font-medium block">
                      {personnelList[(idx + 1) % personnelList.length]?.name}
                    </span>
                    <span className="text-[10px] text-[#A7A7A7] block">مذاکره قراردادها</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SubTab 2: Leave Requests */}
      {activeSubTab === 'leaves' && (
        <div className="space-y-3">
          {leaveList.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-2xl bg-[#181818] border border-[#282828] flex flex-wrap items-center justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-xs text-white">{item.personnel_name}</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#282828] text-white">
                    {item.type}
                  </span>
                  <span
                    className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium ${
                      item.status === 'تأیید شده'
                        ? 'bg-[#1DB954]/15 text-[#1DB954] border border-[#1DB954]/30'
                        : 'bg-[#F59B23]/15 text-[#F59B23] border border-[#F59B23]/30'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
                <p className="text-xs text-[#A7A7A7]">علت: {item.reason}</p>
              </div>

              <div className="text-xs text-[#A7A7A7] font-mono">
                {item.date}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Leave Modal */}
      {showNewLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#181818] border border-[#282828] w-full max-w-md rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#282828] pb-3">
              <h3 className="text-sm font-bold text-white">ثبت درخواست مرخصی</h3>
              <button
                onClick={() => setShowNewLeaveModal(false)}
                className="text-[#A7A7A7] hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddLeave} className="space-y-3">
              <div>
                <label className="block text-xs text-[#B3B3B3] mb-1">نوع مرخصی</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                  className="w-full h-9 px-3 bg-[#282828] rounded text-xs text-white focus:outline-none"
                >
                  <option value="مرخصی روزانه استحقاقی">مرخصی روزانه استحقاقی</option>
                  <option value="مرخصی استعلاجی">مرخصی استعلاجی</option>
                  <option value="مرخصی ساعتی">مرخصی ساعتی</option>
                  <option value="مرخصی بدون حقوق">مرخصی بدون حقوق</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-[#B3B3B3] mb-1">مدت زمان (روز یا ساعت)</label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={leaveDays}
                  onChange={(e) => setLeaveDays(Number(e.target.value))}
                  className="w-full h-9 px-3 bg-[#282828] rounded text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-[#B3B3B3] mb-1">علت و توضیحات</label>
                <textarea
                  rows={3}
                  required
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  placeholder="علت درخواست مرخصی..."
                  className="w-full p-2.5 bg-[#282828] rounded text-xs text-white resize-none focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewLeaveModal(false)}
                  className="h-8 px-4 rounded-full border border-[#535353] text-xs text-[#B3B3B3]"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="h-8 px-5 rounded-full bg-[#1DB954] hover:bg-[#1ED760] text-black font-bold text-xs"
                >
                  ارسال به مدیریت
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
