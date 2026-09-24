import React from 'react';
import { Search, UserCheck, AlertTriangle, Plus, PhoneCall } from 'lucide-react';
import { Personnel } from '../types';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  personnelList: Personnel[];
  currentPersonnel: Personnel | null;
  onSelectPersonnel: (p: Personnel) => void;
  expiredCount: number;
  onViewExpired: () => void;
  onOpenNewCustomer: () => void;
  onOpenNewLead: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  personnelList,
  currentPersonnel,
  onSelectPersonnel,
  expiredCount,
  onViewExpired,
  onOpenNewCustomer,
  onOpenNewLead,
}) => {
  return (
    <header className="h-18 bg-[#121212] border-b border-[#282828] sticky top-0 z-30 px-6 flex items-center justify-between gap-4">
      {/* Search Input - 48px height Green Deck standard */}
      <div className="flex-1 max-w-md relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="جستجو در نام شرکت، مدیر، شهر، موبایل..."
          className="w-full h-11 bg-[#282828] rounded-full pl-4 pr-11 text-sm text-white placeholder-[#A7A7A7] focus:outline-none focus:ring-1 focus:ring-white transition-all"
        />
        <Search className="w-4 h-4 text-[#A7A7A7] absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#A7A7A7] hover:text-white"
          >
            پاک کردن
          </button>
        )}
      </div>

      {/* Action Controls & User Profile */}
      <div className="flex items-center gap-3">
        {/* Quick Action: New Lead */}
        <button
          onClick={onOpenNewLead}
          className="hidden sm:inline-flex items-center gap-2 h-9 px-3.5 rounded-full bg-[#282828] hover:bg-[#333333] text-xs font-semibold text-white border border-[#3e3e3e] transition-all hover:scale-[1.02]"
          title="افزودن شماره جدید جهت پیگیری اولیه"
        >
          <PhoneCall className="w-3.5 h-3.5 text-[#1DB954]" />
          <span>افزودن شماره</span>
        </button>

        {/* Quick Action: New Customer */}
        <button
          onClick={onOpenNewCustomer}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-full bg-[#1DB954] hover:bg-[#1ED760] text-xs font-bold text-black transition-all hover:scale-[1.03] shadow-md shadow-[#1DB954]/20"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>ثبت مشتری جدید</span>
        </button>

        {/* Expiration Alert Trigger */}
        {expiredCount > 0 && (
          <button
            onClick={onViewExpired}
            className="flex items-center gap-1.5 h-9 px-3 rounded-full bg-[#E22134]/15 border border-[#E22134]/40 text-[#E22134] text-xs font-medium hover:bg-[#E22134]/25 transition-all animate-pulse"
            title="مشتریانی که مهلت بازاریاب آن‌ها منقضی شده"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{expiredCount} مهلت منقضی</span>
          </button>
        )}

        {/* System Online Status Indicator */}
        <div
          className="hidden md:flex items-center gap-2 h-9 px-3.5 rounded-full bg-[#181818] border border-[#282828] text-xs text-[#B3B3B3]"
          title="سامانه آنلاین و متصل است"
        >
          <div className="w-2 h-2 rounded-full bg-[#1DB954] animate-pulse" />
          <span>پایگاه داده متصل</span>
        </div>

        {/* Personnel User Switcher */}
        <div className="flex items-center gap-2 pl-1 pr-2 py-1 bg-[#181818] border border-[#282828] rounded-full">
          <div className="w-7 h-7 rounded-full bg-[#282828] flex items-center justify-center text-[#1DB954] font-bold text-xs">
            {currentPersonnel ? currentPersonnel.name.charAt(0) : 'U'}
          </div>
          <select
            aria-label="انتخاب پرسنل فعال"
            value={currentPersonnel?.id || ''}
            onChange={(e) => {
              const selected = personnelList.find((p) => p.id === e.target.value);
              if (selected) onSelectPersonnel(selected);
            }}
            className="bg-transparent text-xs text-white focus:outline-none cursor-pointer pr-1"
          >
            {personnelList.map((p) => (
              <option key={p.id} value={p.id} className="bg-[#181818] text-white">
                {p.name} ({p.role === 'admin' ? 'مدیر ارشد' : p.role === 'sales_manager' ? 'مدیر فروش' : 'بازاریاب'})
              </option>
            ))}
          </select>
        </div>
      </div>
    </header>
  );
};
