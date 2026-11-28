import React, { useState } from 'react';
import {
  AlertTriangle,
  Plus,
  PhoneCall,
  Menu,
  X,
  LogIn,
  LogOut,
  ShieldCheck,
  UserCheck,
  ChevronDown,
  Sparkles,
  CalendarDays,
  Building2,
  Layers,
  Sun,
  Moon,
  Laptop,
  Check,
  Search,
} from 'lucide-react';
import { Personnel, AuthUser, Tenant, Customer, CustomerReport } from '../types';
import { getAvatarUrl, getUserAllowedTenants, isTenantIdMatch, isSystemAdminUser } from '../utils';
import { ThemeToggle } from './ThemeToggle';
import { useTheme } from '../context/ThemeContext';
import { GlobalSearch } from './GlobalSearch';
import { NavTab } from './Sidebar';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  personnelList: Personnel[];
  currentPersonnel: Personnel | null;
  currentUser: AuthUser | null;
  onSelectPersonnel?: (p: Personnel) => void;
  onOpenAuthModal: () => void;
  onLogout: () => void;
  expiredCount: number;
  onViewExpired: () => void;
  onOpenNewCustomer: () => void;
  onOpenQuickAddCustomer: () => void;
  onToggleMobileMenu?: () => void;
  isMobileMenuOpen?: boolean;
  onNavigateToPortal?: (subTab: 'profile' | 'leave' | 'advance') => void;
  tenants?: Tenant[];
  activeTenantId?: string;
  onSelectTenant?: (tenantId: string) => void;
  onOpenTenantsManagement?: () => void;
  customers?: Customer[];
  allCustomers?: Customer[];
  reports?: CustomerReport[];
  canViewAllCustomers?: boolean;
  onSelectCustomer?: (customer: Customer) => void;
  onOpenAddReport?: (
    customerId?: string,
    options?: { customer?: Customer; lockCustomer?: boolean; initialPhone?: string }
  ) => void;
  onOpenQuickAddWithPhone?: (initialPhone?: string) => void;
  onNavigateToTab?: (tab: NavTab, subTab?: string) => void;
  onApplyToCustomersList?: (query: string, status?: string) => void;
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
  onOpenQuickAddCustomer,
  onToggleMobileMenu,
  isMobileMenuOpen,
  onNavigateToPortal,
  tenants = [],
  activeTenantId = 'all',
  onSelectTenant,
  onOpenTenantsManagement,
  customers = [],
  allCustomers = [],
  reports = [],
  canViewAllCustomers = false,
  onSelectCustomer,
  onOpenAddReport,
  onOpenQuickAddWithPhone,
  onNavigateToTab,
  onApplyToCustomersList,
}) => {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isOrgMenuOpen, setIsOrgMenuOpen] = useState(false);
  const [isProfileOrgDropdownOpen, setIsProfileOrgDropdownOpen] = useState(false);
  const [orgSearchQuery, setOrgSearchQuery] = useState('');
  const { theme, setTheme } = useTheme();

  // Only system admins can view or switch between organizations
  const isStrictAdmin = isSystemAdminUser(currentPersonnel, currentUser);
  const isAdmin = isStrictAdmin;
  const canAccessTenants = isStrictAdmin;

  const getCleanString = (val?: any): string => {
    if (!val) return '';
    const str = String(val).trim();
    if (str === 'undefined' || str === 'null') return '';
    return str;
  };

  const displayName =
    getCleanString(currentUser?.name) ||
    getCleanString(currentUser?.first_name ? `${currentUser.first_name} ${currentUser.last_name || ''}` : null) ||
    getCleanString(currentPersonnel?.name) ||
    getCleanString(currentUser?.email ? currentUser.email.split('@')[0] : null) ||
    'کاربر مهمان';

  const initial = displayName.charAt(0).toUpperCase() || 'U';

  const effectiveTenants =
    tenants && tenants.length > 0
      ? tenants
      : [
          {
            id: 'default',
            name: 'سازمان مرکزی آلفادسک',
            slug: 'alphadesk-hq',
            status: 'active',
            date_created: '',
          },
        ];

  // Determine allowed tenants for current user (strictly all for admin, only own org for non-admin)
  const userAllowedTenants = getUserAllowedTenants(currentPersonnel, currentUser, effectiveTenants);
  const canSwitchTenants = isStrictAdmin;

  const normalizedOrgSearch = orgSearchQuery.trim().toLowerCase();
  const filteredAllowedTenants = normalizedOrgSearch
    ? userAllowedTenants.filter(
        (t) =>
          String(t.name || '').toLowerCase().includes(normalizedOrgSearch) ||
          String(t.slug || '').toLowerCase().includes(normalizedOrgSearch)
      )
    : userAllowedTenants;

  const activeTenant = userAllowedTenants.find((t) =>
    isTenantIdMatch(t.id, activeTenantId, t.slug)
  );
  const activeTenantName =
    activeTenantId === 'all' && isStrictAdmin
      ? 'همه سازمان‌ها (تجمیعی)'
      : activeTenant?.name ||
        (String(currentPersonnel?.tenant_id) === String(activeTenantId) ? currentPersonnel?.tenant_name : null) ||
        userAllowedTenants[0]?.name ||
        currentPersonnel?.tenant_name ||
        (activeTenantId === 'default' || activeTenantId === '1' ? 'سازمان مرکزی آلفادسک' : 'سازمان مرکزی');


  return (
    <header className="shrink-0 relative z-40 pt-safe bg-white dark:bg-[#121212] border-b border-slate-200 dark:border-[#282828] select-none shadow-xs transition-colors">
      <div className="h-16 sm:h-18 px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4">
      {/* Mobile Hamburger & Responsive Global Search */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleMobileMenu?.();
          }}
          className="lg:hidden relative z-20 w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 dark:bg-[#1e1e1e] dark:hover:bg-[#282828] text-slate-700 hover:text-slate-900 dark:text-white dark:hover:text-[#1DB954] focus:outline-none transition-all border border-slate-200 dark:border-[#2e2e2e] shrink-0 touch-manipulation cursor-pointer"
          aria-label={isMobileMenuOpen ? 'بستن منو' : 'باز کردن منو'}
          aria-expanded={isMobileMenuOpen}
          title="منوی اصلی"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5 pointer-events-none" /> : <Menu className="w-5 h-5 pointer-events-none" />}
        </button>

        {currentUser && (
          <GlobalSearch
            searchQuery={searchQuery}
            onSearchChange={onSearchChange}
            customers={customers}
            allCustomers={allCustomers}
            reports={reports}
            personnelList={personnelList}
            currentPersonnel={currentPersonnel}
            currentUser={currentUser}
            isAdmin={isAdmin}
            canViewAllCustomers={canViewAllCustomers}
            onSelectCustomer={(c) => onSelectCustomer?.(c)}
            onOpenAddReport={(cid, opts) => onOpenAddReport?.(cid, opts)}
            onOpenQuickAddWithPhone={(phone) =>
              onOpenQuickAddWithPhone ? onOpenQuickAddWithPhone(phone) : onOpenQuickAddCustomer()
            }
            onNavigateToTab={(tab, sub) => onNavigateToTab?.(tab, sub)}
            onApplyToCustomersList={onApplyToCustomersList}
          />
        )}
      </div>



      {/* Action Controls & User Profile */}
      <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0">
        {/* Header Quick Organization Switcher (admin-only dropdown on sm+) */}
        {currentUser && canSwitchTenants && (
          <div className="relative hidden sm:block">
            <button
              type="button"
              onClick={() => {
                setIsProfileMenuOpen(false);
                setIsProfileOrgDropdownOpen(false);
                setOrgSearchQuery('');
                setIsOrgMenuOpen((prev) => !prev);
              }}
              className="flex items-center gap-1.5 h-8 sm:h-9 px-2.5 sm:px-3 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-[#181818] dark:hover:bg-[#242424] border border-slate-200 dark:border-[#2e2e2e] hover:border-emerald-500/50 dark:hover:border-[#1DB954]/50 text-xs font-bold text-slate-800 dark:text-white transition-all cursor-pointer max-w-[190px]"
              title="تغییر سازمان فعال"
            >
              <Building2 className="w-3.5 h-3.5 text-emerald-600 dark:text-[#1DB954] shrink-0" />
              <span className="truncate">{activeTenantName}</span>
              <ChevronDown
                className={`w-3 h-3 text-slate-400 dark:text-[#888] shrink-0 transition-transform ${
                  isOrgMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isOrgMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => {
                    setIsOrgMenuOpen(false);
                    setOrgSearchQuery('');
                  }}
                />
                <div className="absolute left-0 mt-2 w-64 bg-white dark:bg-[#181818] border border-slate-200 dark:border-[#2e2e2e] rounded-2xl shadow-2xl shadow-slate-900/15 dark:shadow-black/80 py-2 z-50 text-right">
                  <div className="px-3.5 py-2 border-b border-slate-200 dark:border-[#282828] flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-[#ccc] flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-emerald-600 dark:text-[#1DB954]" />
                      <span>انتخاب سازمان فعال</span>
                    </span>
                    <span className="text-[10px] font-mono text-emerald-600 dark:text-[#1DB954]">
                      {userAllowedTenants.length} سازمان
                    </span>
                  </div>

                  {userAllowedTenants.length > 5 && (
                    <div className="px-2 pt-2 pb-1">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 dark:text-[#777] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          value={orgSearchQuery}
                          onChange={(e) => setOrgSearchQuery(e.target.value)}
                          placeholder="جستجوی سازمان..."
                          className="w-full pr-8 pl-2.5 py-1.5 text-xs rounded-lg bg-slate-100 dark:bg-[#121212] border border-slate-200 dark:border-[#2e2e2e] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#666] focus:outline-none focus:border-emerald-500 dark:focus:border-[#1DB954]"
                        />
                      </div>
                    </div>
                  )}

                  <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5">
                    {(!normalizedOrgSearch || 'همه سازمان‌ها (تجمیعی)'.includes(normalizedOrgSearch)) && (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectTenant?.('all');
                          setIsOrgMenuOpen(false);
                          setOrgSearchQuery('');
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
                          activeTenantId === 'all'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-[#1DB954]/15 dark:text-[#1DB954] font-bold'
                            : 'text-slate-700 hover:bg-slate-100 dark:text-[#ccc] dark:hover:text-white dark:hover:bg-[#242424]'
                        }`}
                      >
                        <span className="flex items-center gap-2 truncate">
                          <Layers className="w-3.5 h-3.5 text-emerald-600 dark:text-[#1DB954] shrink-0" />
                          <span className="truncate">همه سازمان‌ها (تجمیعی)</span>
                        </span>
                        {activeTenantId === 'all' && (
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-[#1DB954] shrink-0" />
                        )}
                      </button>
                    )}

                    {filteredAllowedTenants.map((t) => {
                      const isSelected = isTenantIdMatch(activeTenantId, t.id, t.slug);
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            onSelectTenant?.(String(t.id));
                            setIsOrgMenuOpen(false);
                            setOrgSearchQuery('');
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-[#1DB954]/15 dark:text-[#1DB954] font-bold'
                              : 'text-slate-700 hover:bg-slate-100 dark:text-[#ccc] dark:hover:text-white dark:hover:bg-[#242424]'
                          }`}
                        >
                          <span className="truncate">{t.name}</span>
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-[#1DB954] shrink-0" />
                          )}
                        </button>
                      );
                    })}

                    {filteredAllowedTenants.length === 0 && normalizedOrgSearch && (
                      <div className="px-2.5 py-3 text-center text-[11px] text-slate-400 dark:text-[#777]">
                        سازمانی با این نام یافت نشد
                      </div>
                    )}
                  </div>

                  {canAccessTenants && onOpenTenantsManagement && (
                    <div className="px-2 pt-1.5 mt-1 border-t border-slate-200 dark:border-[#282828]">
                      <button
                        type="button"
                        onClick={() => {
                          setIsOrgMenuOpen(false);
                          setOrgSearchQuery('');
                          onOpenTenantsManagement();
                        }}
                        className="w-full px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-[#A7A7A7] dark:hover:text-white dark:hover:bg-[#282828] rounded-xl flex items-center justify-between transition-colors cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-slate-400 dark:text-[#888]" />
                          <span>مدیریت سازمان‌ها و شعب</span>
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-[#777]">⚙</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* PWA Install Prompt Button */}
        <PWAInstallButton />

        {/* Quick Action: Theme Mode Toggle */}
        <ThemeToggle />

        {/* Quick Action: Quick Add Customer by Phone (Icon only) */}
        <button
          onClick={onOpenQuickAddCustomer}
          className="w-8 sm:w-9 h-8 sm:h-9 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-[#282828] dark:hover:bg-[#333333] text-slate-700 dark:text-white border border-slate-200 dark:border-[#3e3e3e] flex items-center justify-center transition-all hover:scale-105 shadow-xs cursor-pointer"
          title="افزودن سریع شماره (ثبت مشتری)"
          aria-label="افزودن سریع شماره (ثبت مشتری)"
        >
          <PhoneCall className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-emerald-600 dark:text-[#1DB954]" />
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
              onClick={() => {
                setIsOrgMenuOpen(false);
                setIsProfileOrgDropdownOpen(false);
                setOrgSearchQuery('');
                setIsProfileMenuOpen(!isProfileMenuOpen);
              }}
              className="flex items-center gap-1.5 sm:gap-2 pl-2 pr-1.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-[#181818] dark:hover:bg-[#222222] border border-slate-200 dark:border-[#282828] rounded-full transition-colors cursor-pointer group"
              title="حساب کاربری و سازمان"
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-sm overflow-hidden relative ${
                  isAdmin
                    ? 'bg-[#1DB954] text-black'
                    : 'bg-emerald-100 text-emerald-800 dark:bg-[#282828] dark:text-[#1DB954] border border-emerald-200 dark:border-[#3e3e3e]'
                }`}
              >
                <span>{initial}</span>
                {getAvatarUrl(currentPersonnel?.profile_image || currentPersonnel?.avatar || currentUser?.avatar, displayName) ? (
                  <img
                    key={getAvatarUrl(currentPersonnel?.profile_image || currentPersonnel?.avatar || currentUser?.avatar, displayName)}
                    src={getAvatarUrl(currentPersonnel?.profile_image || currentPersonnel?.avatar || currentUser?.avatar, displayName)}
                    alt={displayName}
                    className="absolute inset-0 w-full h-full object-cover z-10 block"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : null}
              </div>

              <div className="hidden md:flex flex-col text-right leading-tight pr-0.5">
                <span className="text-xs font-bold text-slate-900 dark:text-white max-w-[110px] truncate">
                  {displayName}
                </span>
                <span className={`text-[10px] ${isAdmin ? 'text-emerald-600 dark:text-[#1DB954]' : 'text-slate-500 dark:text-[#888888]'}`}>
                  {isAdmin ? 'مدیر سیستم' : activeTenantName}
                </span>
              </div>

              <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-slate-700 dark:text-[#777777] dark:group-hover:text-white transition-colors" />
            </button>

            {/* Dropdown Menu */}
            {isProfileMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    setIsProfileOrgDropdownOpen(false);
                    setOrgSearchQuery('');
                  }}
                />
                <div className="absolute left-0 mt-2 w-64 bg-white dark:bg-[#181818] border border-slate-200 dark:border-[#2e2e2e] rounded-2xl shadow-2xl shadow-slate-900/10 dark:shadow-black/80 py-2 z-50 animate-fade-in text-right">
                  <div className="px-3.5 py-2 border-b border-slate-200 dark:border-[#282828]">
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate">{displayName}</div>
                    <div className="text-[11px] text-slate-500 dark:text-[#777777] truncate font-mono" dir="ltr">
                      {currentUser.email}
                    </div>
                    <div className="mt-1.5 flex items-center gap-1">
                      {isAdmin ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-[#1DB954] text-[10px] font-bold">
                          <ShieldCheck className="w-3 h-3" />
                          <span>مدیر سیستم (دسترسی کامل)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#333333] border border-slate-200 dark:border-[#444444] text-slate-800 dark:text-white text-[10px]">
                          <UserCheck className="w-3 h-3 text-emerald-600 dark:text-[#1DB954]" />
                          <span>کارشناس فروش</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Active Organization & Dropdown Switcher */}
                  <div className="px-3.5 py-2 border-b border-slate-200 dark:border-[#282828] space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-[#777777] font-medium">
                      <span className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-emerald-600 dark:text-[#1DB954]" />
                        <span>{canSwitchTenants ? 'سازمان فعال:' : 'سازمان شما:'}</span>
                      </span>
                      {canSwitchTenants && (
                        <span className="text-[9px] font-mono text-emerald-600 dark:text-[#1DB954]">
                          {userAllowedTenants.length} سازمان
                        </span>
                      )}
                    </div>

                    {canSwitchTenants ? (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsProfileOrgDropdownOpen((prev) => !prev);
                          }}
                          className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-[#121212] dark:hover:bg-[#1e1e1e] border border-slate-200 dark:border-[#2e2e2e] hover:border-emerald-500/50 dark:hover:border-[#1DB954]/50 text-xs font-bold text-slate-900 dark:text-white transition-colors cursor-pointer"
                          aria-expanded={isProfileOrgDropdownOpen}
                        >
                          <span className="flex items-center gap-1.5 min-w-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-[#1DB954] shrink-0" />
                            <span className="truncate">{activeTenantName}</span>
                          </span>
                          <ChevronDown
                            className={`w-3.5 h-3.5 text-slate-400 dark:text-[#888] shrink-0 transition-transform duration-150 ${
                              isProfileOrgDropdownOpen ? 'rotate-180 text-emerald-600 dark:text-[#1DB954]' : ''
                            }`}
                          />
                        </button>

                        {isProfileOrgDropdownOpen && (
                          <div className="mt-1.5 bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-[#333333] rounded-xl shadow-lg overflow-hidden">
                            {userAllowedTenants.length > 5 && (
                              <div className="p-1.5 border-b border-slate-200 dark:border-[#242424]">
                                <div className="relative">
                                  <Search className="w-3 h-3 text-slate-400 dark:text-[#777] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                                  <input
                                    type="text"
                                    value={orgSearchQuery}
                                    onChange={(e) => setOrgSearchQuery(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    placeholder="جستجوی سازمان..."
                                    className="w-full pr-7 pl-2 py-1 text-[11px] rounded-lg bg-white dark:bg-[#181818] border border-slate-200 dark:border-[#2e2e2e] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#666] focus:outline-none focus:border-emerald-500 dark:focus:border-[#1DB954]"
                                  />
                                </div>
                              </div>
                            )}

                            <div className="max-h-44 overflow-y-auto p-1 space-y-0.5">
                              {(!normalizedOrgSearch || 'همه سازمان‌ها (تجمیعی)'.includes(normalizedOrgSearch)) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onSelectTenant?.('all');
                                    setIsProfileOrgDropdownOpen(false);
                                    setIsProfileMenuOpen(false);
                                    setOrgSearchQuery('');
                                  }}
                                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                                    activeTenantId === 'all'
                                      ? 'bg-emerald-50 text-emerald-700 dark:bg-[#1DB954]/15 dark:text-[#1DB954] font-bold'
                                      : 'text-slate-700 hover:bg-slate-200/70 dark:text-[#ccc] dark:hover:text-white dark:hover:bg-[#222222]'
                                  }`}
                                >
                                  <span className="flex items-center gap-1.5 truncate">
                                    <Layers className="w-3 h-3 text-emerald-600 dark:text-[#1DB954] shrink-0" />
                                    <span className="truncate">همه سازمان‌ها (تجمیعی)</span>
                                  </span>
                                  {activeTenantId === 'all' && (
                                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-[#1DB954] shrink-0" />
                                  )}
                                </button>
                              )}

                              {filteredAllowedTenants.map((t) => {
                                const isSelected = isTenantIdMatch(activeTenantId, t.id, t.slug);
                                return (
                                  <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => {
                                      onSelectTenant?.(String(t.id));
                                      setIsProfileOrgDropdownOpen(false);
                                      setIsProfileMenuOpen(false);
                                      setOrgSearchQuery('');
                                    }}
                                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                                      isSelected
                                        ? 'bg-emerald-50 text-emerald-700 dark:bg-[#1DB954]/15 dark:text-[#1DB954] font-bold'
                                        : 'text-slate-700 hover:bg-slate-200/70 dark:text-[#ccc] dark:hover:text-white dark:hover:bg-[#222222]'
                                    }`}
                                  >
                                    <span className="truncate">{t.name}</span>
                                    {isSelected && (
                                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-[#1DB954] shrink-0" />
                                    )}
                                  </button>
                                );
                              })}

                              {filteredAllowedTenants.length === 0 && normalizedOrgSearch && (
                                <div className="px-2 py-2.5 text-center text-[11px] text-slate-400 dark:text-[#777]">
                                  سازمانی با این نام یافت نشد
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-[#121212] px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-[#282828] flex items-center justify-between">
                        <span className="truncate">{activeTenantName}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-[#1DB954]" />
                      </div>
                    )}

                    {canAccessTenants && onOpenTenantsManagement && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileOrgDropdownOpen(false);
                          setIsProfileMenuOpen(false);
                          setOrgSearchQuery('');
                          onOpenTenantsManagement();
                        }}
                        className="w-full mt-1 px-2.5 py-1.5 text-[11px] text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-[#A7A7A7] dark:hover:text-white dark:hover:bg-[#282828] rounded-lg flex items-center justify-between transition-colors border border-slate-200 dark:border-[#282828] cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5">
                          <Layers className="w-3 h-3 text-slate-400 dark:text-[#888]" />
                          <span>مدیریت سازمان‌ها و شعب</span>
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-[#777]">⚙</span>
                      </button>
                    )}
                  </div>

                  {/* Theme Mode Selector */}
                  <div className="px-3.5 py-2 border-b border-slate-200 dark:border-[#282828] space-y-1.5">
                    <div className="text-[10px] text-slate-500 dark:text-[#777777] font-medium flex items-center justify-between">
                      <span>حالت نمایش:</span>
                      <span className="text-[10px] text-emerald-600 dark:text-[#1DB954] font-medium">
                        {theme === 'dark' ? 'تیره (شب)' : theme === 'light' ? 'روشن (روز)' : 'خودکار'}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-[#121212] p-1 rounded-xl border border-slate-200 dark:border-[#282828]">
                      <button
                        type="button"
                        onClick={() => setTheme('light')}
                        className={`py-1 px-1.5 rounded-lg text-[10px] flex items-center justify-center gap-1 transition-all cursor-pointer ${
                          theme === 'light'
                            ? 'bg-white text-slate-900 font-bold shadow-xs border border-slate-200 dark:border-transparent'
                            : 'text-slate-500 hover:text-slate-900 dark:text-[#888] dark:hover:text-white'
                        }`}
                      >
                        <Sun className="w-3 h-3 text-amber-500" />
                        <span>روشن</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTheme('dark')}
                        className={`py-1 px-1.5 rounded-lg text-[10px] flex items-center justify-center gap-1 transition-all cursor-pointer ${
                          theme === 'dark'
                            ? 'bg-white text-slate-900 dark:bg-[#282828] dark:text-white font-bold shadow-xs border border-slate-200 dark:border-[#3e3e3e]'
                            : 'text-slate-500 hover:text-slate-900 dark:text-[#888] dark:hover:text-white'
                        }`}
                      >
                        <Moon className="w-3 h-3 text-blue-400" />
                        <span>تیره</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTheme('system')}
                        className={`py-1 px-1.5 rounded-lg text-[10px] flex items-center justify-center gap-1 transition-all cursor-pointer ${
                          theme === 'system'
                            ? 'bg-white text-slate-900 dark:bg-[#282828] dark:text-white font-bold shadow-xs border border-slate-200 dark:border-[#3e3e3e]'
                            : 'text-slate-500 hover:text-slate-900 dark:text-[#888] dark:hover:text-white'
                        }`}
                      >
                        <Laptop className="w-3 h-3 text-emerald-600 dark:text-[#1DB954]" />
                        <span>خودکار</span>
                      </button>
                    </div>
                  </div>

                  <div className="px-1 pt-1 space-y-0.5">
                    {onNavigateToPortal && (
                      <>
                        <button
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            onNavigateToPortal('profile');
                          }}
                          className="w-full px-3 py-2 text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-100 dark:text-[#ccc] dark:hover:text-white dark:hover:bg-[#282828] rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <UserCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-[#1DB954]" />
                          <span>پروفایل و تغییر رمز</span>
                        </button>

                        <button
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            onNavigateToPortal('leave');
                          }}
                          className="w-full px-3 py-2 text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-100 dark:text-[#ccc] dark:hover:text-white dark:hover:bg-[#282828] rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <CalendarDays className="w-3.5 h-3.5 text-blue-500" />
                          <span>درخواست‌های مرخصی</span>
                        </button>

                        <button
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            onNavigateToPortal('advance');
                          }}
                          className="w-full px-3 py-2 text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-100 dark:text-[#ccc] dark:hover:text-white dark:hover:bg-[#282828] rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                          <span>درخواست‌های مساعده</span>
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        onOpenAuthModal();
                      }}
                      className="w-full px-3 py-2 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-[#A7A7A7] dark:hover:text-white dark:hover:bg-[#282828] rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-[#1DB954]" />
                      <span>تغییر حساب / ورود دیگر</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 dark:text-[#E22134] dark:hover:bg-[#E22134]/15 rounded-xl flex items-center gap-2 transition-colors font-medium mt-0.5 cursor-pointer"
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
      </div>
    </header>
  );
};
