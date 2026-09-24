import React from 'react';
import { Search, AlertTriangle, Plus, PhoneCall, Menu, X } from 'lucide-react';
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
  onToggleMobileMenu?: () => void;
  isMobileMenuOpen?: boolean;
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
  onToggleMobileMenu,
  isMobileMenuOpen,
}) => {
  return (
    <header className="h-16 sm:h-18 bg-[#121212] border-b border-[#282828] sticky top-0 z-30 px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4 select-none">
      {/* Mobile Hamburger & Brand Mini Toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 rounded-xl bg-[#1e1e1e] hover:bg-[#282828] text-white hover:text-[#1DB954] focus:outline-none transition-colors border border-[#2e2e2e]"
          aria-label={isMobileMenuOpen ? 'بستن منو' : 'باز کردن منو'}
          title="منوی اصلی"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Search Input - responsive */}
      <div className="flex-1 max-w-xs sm:max-w-sm md:max-w-md relative min-w-0">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="جستجو در نام، مدیر، شهر..."
          className="w-full h-10 sm:h-11 bg-[#282828] rounded-full pl-3 sm:pl-4 pr-9 sm:pr-11 text-xs sm:text-sm text-white placeholder-[#888888] focus:outline-none focus:ring-1 focus:ring-white transition-all truncate"
        />
        <Search className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-[#A7A7A7] absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 text-[10px] sm:text-xs text-[#A7A7A7] hover:text-white"
          >
            پاک کردن
          </button>
        )}
      </div>

      {/* Action Controls & User Profile */}
      <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
        {/* Quick Action: New Lead */}
        <button
          onClick={onOpenNewLead}
          className="hidden md:inline-flex items-center gap-2 h-9 px-3.5 rounded-full bg-[#282828] hover:bg-[#333333] text-xs font-semibold text-white border border-[#3e3e3e] transition-all hover:scale-[1.02]"
          title="افزودن شماره جدید جهت پیگیری اولیه"
        >
          <PhoneCall className="w-3.5 h-3.5 text-[#1DB954]" />
          <span>افزودن شماره</span>
        </button>

        {/* Quick Action: New Customer */}
        <button
          onClick={onOpenNewCustomer}
          className="inline-flex items-center gap-1.5 sm:gap-2 h-8 sm:h-9 px-2.5 sm:px-4 rounded-full bg-[#1DB954] hover:bg-[#1ED760] text-xs font-bold text-black transition-all hover:scale-[1.03] shadow-md shadow-[#1DB954]/20 flex-shrink-0"
          title="ثبت مشتری جدید"
        >
          <Plus className="w-3.5 sm:w-4 h-3.5 sm:h-4 stroke-[3]" />
          <span className="hidden sm:inline">ثبت مشتری جدید</span>
          <span className="sm:hidden text-[11px]">مشتری</span>
        </button>

        {/* Expiration Alert Trigger */}
        {expiredCount > 0 && (
          <button
            onClick={onViewExpired}
            className="flex items-center gap-1 sm:gap-1.5 h-8 sm:h-9 px-2 sm:px-3 rounded-full bg-[#E22134]/15 border border-[#E22134]/40 text-[#E22134] text-xs font-medium hover:bg-[#E22134]/25 transition-all animate-pulse"
            title="مشتریانی که مهلت بازاریاب آن‌ها منقضی شده"
          >
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="font-mono font-bold">{expiredCount}</span>
            <span className="hidden sm:inline">منقضی</span>
          </button>
        )}

        {/* System Online Status Indicator */}
        <div
          className="hidden xl:flex items-center gap-2 h-9 px-3.5 rounded-full bg-[#181818] border border-[#282828] text-xs text-[#B3B3B3]"
          title="سامانه آنلاین و متصل است"
        >
          <div className="w-2 h-2 rounded-full bg-[#1DB954] animate-pulse" />
          <span>پایگاه داده متصل</span>
        </div>

        {/* Personnel User Switcher */}
        <div className="flex items-center gap-1 sm:gap-2 pl-1 pr-1.5 sm:pr-2 py-0.5 sm:py-1 bg-[#181818] border border-[#282828] rounded-full max-w-[130px] sm:max-w-none">
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#282828] flex items-center justify-center text-[#1DB954] font-bold text-[11px] sm:text-xs flex-shrink-0">
            {currentPersonnel ? currentPersonnel.name.charAt(0) : 'U'}
          </div>
          <select
            aria-label="انتخاب پرسنل فعال"
            value={currentPersonnel?.id || ''}
            onChange={(e) => {
              const selected = personnelList.find((p) => p.id === e.target.value);
              if (selected) onSelectPersonnel(selected);
            }}
            className="bg-transparent text-[11px] sm:text-xs text-white focus:outline-none cursor-pointer pr-0.5 max-w-[85px] sm:max-w-[140px] truncate"
          >
            {personnelList.map((p) => (
              <option key={p.id} value={p.id} className="bg-[#181818] text-white">
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </header>
  );
};
