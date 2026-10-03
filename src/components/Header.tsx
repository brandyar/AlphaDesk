import React, { useState } from 'react';
import { Search, AlertTriangle, Plus, PhoneCall, Menu, X, LogIn, LogOut, ShieldCheck, UserCheck, ChevronDown, Sparkles, CalendarDays } from 'lucide-react';
import { Personnel, AuthUser } from '../types';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  personnelList: Personnel[];
  currentPersonnel: Personnel | null;
  currentUser: AuthUser | null;
  onSelectPersonnel: (p: Personnel) => void;
  onOpenAuthModal: () => void;
  onLogout: () => void;
  expiredCount: number;
  onViewExpired: () => void;
  onOpenNewCustomer: () => void;
  onOpenNewLead: () => void;
  onToggleMobileMenu?: () => void;
  isMobileMenuOpen?: boolean;
  onNavigateToPortal?: (subTab: 'profile' | 'leave' | 'advance') => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  personnelList,
  currentPersonnel,
  currentUser,
  onSelectPersonnel,
  onOpenAuthModal,
  onLogout,
  expiredCount,
  onViewExpired,
  onOpenNewCustomer,
  onOpenNewLead,
  onToggleMobileMenu,
  isMobileMenuOpen,
  onNavigateToPortal,
}) => {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const isAdmin = currentUser?.is_admin || currentPersonnel?.role === 'admin' || currentPersonnel?.role === 'sales_manager';
  const displayName = currentUser?.name || currentPersonnel?.name || 'کاربر مهمان';
  const initial = displayName.charAt(0) || 'U';

  return (
    <header className="h-16 sm:h-18 bg-[#121212] border-b border-[#282828] sticky top-0 z-30 px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4 select-none">
      {/* Mobile Hamburger */}
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

      {/* Search Input */}
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
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        {/* Quick Action: New Lead (Icon only) */}
        <button
          onClick={onOpenNewLead}
          className="w-8 sm:w-9 h-8 sm:h-9 rounded-full bg-[#282828] hover:bg-[#333333] text-white border border-[#3e3e3e] flex items-center justify-center transition-all hover:scale-105"
          title="افزودن شماره"
          aria-label="افزودن شماره"
        >
          <PhoneCall className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-[#1DB954]" />
        </button>

        {/* Quick Action: New Customer (Icon only) */}
        <button
          onClick={onOpenNewCustomer}
          className="w-8 sm:w-9 h-8 sm:h-9 rounded-full bg-[#1DB954] hover:bg-[#1ED760] text-black font-bold flex items-center justify-center transition-all hover:scale-105 shadow-md shadow-[#1DB954]/20 flex-shrink-0"
          title="ثبت مشتری جدید"
          aria-label="ثبت مشتری جدید"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
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

        {/* User Account / Profile Dropdown */}
        {currentUser ? (
          <div className="relative">
            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="flex items-center gap-1.5 sm:gap-2 pl-2 pr-1.5 py-1 bg-[#181818] hover:bg-[#222222] border border-[#282828] rounded-full transition-colors cursor-pointer group"
              title="حساب کاربری"
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-sm ${
                  isAdmin
                    ? 'bg-[#1DB954] text-black'
                    : 'bg-[#282828] text-[#1DB954] border border-[#3e3e3e]'
                }`}
              >
                {initial}
              </div>

              <div className="hidden md:flex flex-col text-right leading-tight pr-0.5">
                <span className="text-xs font-bold text-white max-w-[110px] truncate">
                  {displayName}
                </span>
                <span className={`text-[10px] ${isAdmin ? 'text-[#1DB954]' : 'text-[#888888]'}`}>
                  {isAdmin ? 'مدیر سیستم' : 'کارشناس فروش'}
                </span>
              </div>

              <ChevronDown className="w-3 h-3 text-[#777777] group-hover:text-white transition-colors" />
            </button>

            {/* Dropdown Menu */}
            {isProfileMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsProfileMenuOpen(false)}
                />
                <div className="absolute left-0 mt-2 w-56 bg-[#181818] border border-[#2e2e2e] rounded-2xl shadow-2xl shadow-black/80 py-2 z-50 animate-fade-in text-right">
                  <div className="px-3.5 py-2 border-b border-[#282828]">
                    <div className="text-xs font-bold text-white truncate">{displayName}</div>
                    <div className="text-[11px] text-[#777777] truncate font-mono" dir="ltr">
                      {currentUser.email}
                    </div>
                    <div className="mt-1.5 flex items-center gap-1">
                      {isAdmin ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#1DB954]/15 border border-[#1DB954]/30 text-[#1DB954] text-[10px] font-bold">
                          <ShieldCheck className="w-3 h-3" />
                          <span>مدیر سیستم (دسترسی کامل)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#333333] border border-[#444444] text-white text-[10px]">
                          <UserCheck className="w-3 h-3 text-[#1DB954]" />
                          <span>کارشناس فروش (اطلاعات خود)</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Switch Active User / Switch personnel (if Admin) */}
                  {isAdmin && personnelList.length > 0 && (
                    <div className="px-3.5 py-2 border-b border-[#282828]">
                      <label className="block text-[10px] text-[#777777] mb-1 font-medium">
                        مشاهده به عنوان کارشناس:
                      </label>
                      <select
                        aria-label="سوئیچ سریع به عنوان کارشناس"
                        value={currentPersonnel?.id || ''}
                        onChange={(e) => {
                          const selected = personnelList.find((p) => p.id === e.target.value);
                          if (selected) {
                            onSelectPersonnel(selected);
                            setIsProfileMenuOpen(false);
                          }
                        }}
                        className="w-full bg-[#121212] border border-[#282828] rounded-lg px-2 py-1 text-xs text-white focus:outline-none cursor-pointer"
                      >
                        {personnelList.map((p) => (
                          <option key={p.id} value={p.id} className="bg-[#181818] text-white">
                            {p.name} ({p.role === 'admin' ? 'مدیر' : 'کارشناس'})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="px-1 pt-1 space-y-0.5">
                    {onNavigateToPortal && (
                      <>
                        <button
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            onNavigateToPortal('profile');
                          }}
                          className="w-full px-3 py-2 text-xs text-[#ccc] hover:text-white hover:bg-[#282828] rounded-xl flex items-center gap-2 transition-colors"
                        >
                          <UserCheck className="w-3.5 h-3.5 text-[#1DB954]" />
                          <span>پروفایل و تغییر رمز</span>
                        </button>

                        <button
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            onNavigateToPortal('leave');
                          }}
                          className="w-full px-3 py-2 text-xs text-[#ccc] hover:text-white hover:bg-[#282828] rounded-xl flex items-center gap-2 transition-colors"
                        >
                          <CalendarDays className="w-3.5 h-3.5 text-blue-400" />
                          <span>درخواست‌های مرخصی</span>
                        </button>

                        <button
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            onNavigateToPortal('advance');
                          }}
                          className="w-full px-3 py-2 text-xs text-[#ccc] hover:text-white hover:bg-[#282828] rounded-xl flex items-center gap-2 transition-colors"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                          <span>درخواست‌های مساعده</span>
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        onOpenAuthModal();
                      }}
                      className="w-full px-3 py-2 text-xs text-[#A7A7A7] hover:text-white hover:bg-[#282828] rounded-xl flex items-center gap-2 transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#1DB954]" />
                      <span>تغییر حساب / ورود دیگر</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full px-3 py-2 text-xs text-[#E22134] hover:bg-[#E22134]/15 rounded-xl flex items-center gap-2 transition-colors font-medium mt-0.5"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>خروج از حساب</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <button
            onClick={onOpenAuthModal}
            className="flex items-center gap-1.5 h-8 sm:h-9 px-3 rounded-full bg-[#1DB954] hover:bg-[#1ED760] text-black font-bold text-xs transition-all hover:scale-105 shadow-md shadow-[#1DB954]/20"
          >
            <LogIn className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>ورود / عضویت</span>
          </button>
        )}
      </div>
    </header>
  );
};
