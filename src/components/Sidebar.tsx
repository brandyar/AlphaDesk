import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  Unlock,
  MessageSquareText,
  PhoneCall,
  ClipboardCheck,
  CalendarDays,
  Building2,
  BarChart3,
  User,
  Wallet,
  LogOut,
  ChevronDown,
  KeyRound,
  X,
  Users2,
  UserPlus,
  ArrowLeftRight,
  Clock,
  CalendarCheck,
  ShieldAlert,
} from 'lucide-react';
import { Personnel, TeamSubTab } from '../types';

export type NavTab =
  | 'dashboard'
  | 'customers'
  | 'free_customers'
  | 'reports'
  | 'analytics'
  | 'cold_leads'
  | 'admin_reports'
  | 'team'
  | 'personal_portal';

interface SidebarProps {
  activeTab: NavTab;
  portalSubTab?: 'profile' | 'leave' | 'advance' | 'logout';
  teamSubTab?: TeamSubTab;
  onSelectTab: (tab: NavTab, subTab?: string) => void;
  counts: {
    customers: number;
    expiredCustomers: number;
    freeCustomers?: number;
    coldLeads: number;
    reports: number;
    adminReports: number;
    pendingLeaves?: number;
    pendingAdvances?: number;
    totalPersonnel?: number;
  };
  currentPersonnel: Personnel | null;
  isAdmin?: boolean;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  portalSubTab = 'profile',
  teamSubTab = 'colleagues_list',
  onSelectTab,
  counts,
  currentPersonnel,
  isAdmin = false,
  isOpenMobile,
  onCloseMobile,
  onLogout,
}) => {
  // Collapsible states (auto-expand when active)
  const [isTeamExpanded, setIsTeamExpanded] = useState(activeTab === 'team');
  const [isPortalExpanded, setIsPortalExpanded] = useState(activeTab === 'personal_portal');

  useEffect(() => {
    if (activeTab === 'team') {
      setIsTeamExpanded(true);
    }
    if (activeTab === 'personal_portal') {
      setIsPortalExpanded(true);
    }
  }, [activeTab]);

  const navItems: {
    id: NavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number;
    highlight?: boolean;
    badgeText?: string;
  }[] = [
    {
      id: 'dashboard',
      label: 'داشبورد و آمار',
      icon: LayoutDashboard,
    },
    {
      id: 'customers',
      label: 'مدیریت مشتریان',
      icon: Users,
      count: counts.customers,
      highlight: counts.expiredCustomers > 0,
    },
    {
      id: 'free_customers',
      label: 'مشتریان آزاد',
      icon: Unlock,
      count: counts.freeCustomers,
      highlight: Boolean(counts.freeCustomers && counts.freeCustomers > 0),
      badgeText: counts.freeCustomers && counts.freeCustomers > 0 ? 'آزاد' : undefined,
    },
    {
      id: 'reports',
      label: 'گزارش‌های مذاکره',
      icon: MessageSquareText,
      count: counts.reports,
    },
    {
      id: 'analytics',
      label: 'گزارشات نموداری',
      icon: BarChart3,
    },
    {
      id: 'cold_leads',
      label: 'بانک شماره‌های اولیه',
      icon: PhoneCall,
      count: counts.coldLeads,
    },
    {
      id: 'admin_reports',
      label: 'گزارش عملکرد پرسنل',
      icon: ClipboardCheck,
      count: counts.adminReports,
    },
  ];

  const totalPortalPending = (counts.pendingLeaves || 0) + (counts.pendingAdvances || 0);
  const isTeamActive = activeTab === 'team';
  const isPortalActive = activeTab === 'personal_portal';

  // Granular menu permission helper
  const isMenuAllowed = (menuId: string): boolean => {
    if (isAdmin || currentPersonnel?.role === 'admin') return true;
    if (!currentPersonnel?.permissions?.allowed_menus) {
      if (menuId === 'team') return false;
      return true;
    }
    return currentPersonnel.permissions.allowed_menus.includes(menuId);
  };

  const visibleNavItems = navItems.filter((item) => isMenuAllowed(item.id));
  const canAccessTeam = isAdmin || currentPersonnel?.role === 'admin' || isMenuAllowed('team');
  const canAccessPortal = isMenuAllowed('personal_portal');

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/75 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar Element */}
      <aside
        className={`fixed top-0 bottom-0 right-0 z-50 w-72 max-w-[85vw] bg-[#000000] h-screen flex flex-col border-l border-[#282828] select-none transition-transform duration-300 ease-in-out lg:static lg:w-64 lg:h-screen lg:flex-shrink-0 lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0 shadow-2xl' : 'translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 sm:p-6 pb-4 flex items-center justify-between border-b border-[#181818] lg:border-none">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#1DB954] flex items-center justify-center text-black font-black text-lg shadow-lg shadow-[#1DB954]/20 flex-shrink-0">
              <Building2 className="w-5 h-5 text-black stroke-[2.5]" />
            </div>
            <div>
              <h1 className="font-extrabold text-white text-base tracking-tight flex items-center gap-1.5">
                <span>AlphaDesk</span>
                <span className="text-[#1DB954] text-xs font-mono font-normal px-1.5 py-0.5 bg-[#1DB954]/15 rounded">
                  CRM
                </span>
              </h1>
              <p className="text-[#A7A7A7] text-[11px]">آلفادسک • مدیریت ارتباط و پرسنل</p>
            </div>
          </div>

          {/* Close button on mobile */}
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg bg-[#181818] text-[#A7A7A7] hover:text-white"
            aria-label="بستن منو"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          <div className="px-3 pb-1.5 text-[10px] font-bold tracking-wider text-[#777] uppercase">
            بخش‌های اصلی سامانه
          </div>

          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  onCloseMobile?.();
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all group ${
                  isActive
                    ? 'bg-[#282828] text-white shadow-sm'
                    : 'text-[#B3B3B3] hover:text-white hover:bg-[#181818]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-[#1DB954]' : 'text-[#A7A7A7] group-hover:text-white'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {item.count !== undefined && (
                    <span
                      className={`text-[11px] px-1.5 py-0.2 rounded font-mono ${
                        isActive
                          ? 'bg-[#1DB954] text-black font-bold'
                          : 'bg-[#181818] text-[#B3B3B3]'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                  {item.badgeText && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#282828] text-[#A7A7A7] font-normal border border-[#3e3e3e]">
                      {item.badgeText}
                    </span>
                  )}
                </div>
              </button>
            );
          })}

          {/* -------------------------------------------------------- */}
          {/* Admin Accordion: همکاران (Colleagues & Ownership)       */}
          {/* -------------------------------------------------------- */}
          {canAccessTeam && (
            <div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsTeamExpanded((prev) => !prev);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all group ${
                  isTeamActive
                    ? 'bg-[#282828] text-white shadow-sm'
                    : 'text-[#B3B3B3] hover:text-white hover:bg-[#181818]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Users2
                    className={`w-4 h-4 transition-colors ${
                      isTeamActive ? 'text-[#1DB954]' : 'text-[#A7A7A7] group-hover:text-white'
                    }`}
                  />
                  <span>همکاران</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {counts.pendingLeaves !== undefined && counts.pendingLeaves > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500 text-black font-mono font-bold">
                      {counts.pendingLeaves}
                    </span>
                  )}
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-[#888] transition-transform duration-200 ${
                      isTeamExpanded ? 'rotate-180 text-white' : ''
                    }`}
                  />
                </div>
              </button>

              {/* Team Sub-menu Items */}
              {isTeamExpanded && (
                <div className="mt-1 mr-3 pr-2.5 border-r-2 border-[#282828] space-y-1 animate-in fade-in slide-in-from-top-1 duration-150">
                  {/* 1. Register New Colleague */}
                  <button
                    onClick={() => {
                      onSelectTab('team', 'new_colleague');
                      onCloseMobile?.();
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                      isTeamActive && teamSubTab === 'new_colleague'
                        ? 'bg-[#1DB954]/15 text-[#1DB954]'
                        : 'text-[#B3B3B3] hover:text-white hover:bg-[#181818]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <UserPlus className={`w-3.5 h-3.5 ${isTeamActive && teamSubTab === 'new_colleague' ? 'text-[#1DB954]' : 'text-[#888]'}`} />
                      <span>ثبت همکار جدید</span>
                    </div>
                  </button>

                  {/* 2. Colleagues List */}
                  <button
                    onClick={() => {
                      onSelectTab('team', 'colleagues_list');
                      onCloseMobile?.();
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                      isTeamActive && teamSubTab === 'colleagues_list'
                        ? 'bg-[#1DB954]/15 text-[#1DB954]'
                        : 'text-[#B3B3B3] hover:text-white hover:bg-[#181818]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Users2 className={`w-3.5 h-3.5 ${isTeamActive && teamSubTab === 'colleagues_list' ? 'text-[#1DB954]' : 'text-[#888]'}`} />
                      <span>لیست همکاران</span>
                    </div>
                  </button>

                  {/* 3. Extend Ownership */}
                  <button
                    onClick={() => {
                      onSelectTab('team', 'extend_ownership');
                      onCloseMobile?.();
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                      isTeamActive && teamSubTab === 'extend_ownership'
                        ? 'bg-[#1DB954]/15 text-[#1DB954]'
                        : 'text-[#B3B3B3] hover:text-white hover:bg-[#181818]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Clock className={`w-3.5 h-3.5 ${isTeamActive && teamSubTab === 'extend_ownership' ? 'text-[#1DB954]' : 'text-[#888]'}`} />
                      <span>تمدید مالکیت</span>
                    </div>
                  </button>

                  {/* 4. Switch Ownership */}
                  <button
                    onClick={() => {
                      onSelectTab('team', 'switch_ownership');
                      onCloseMobile?.();
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                      isTeamActive && teamSubTab === 'switch_ownership'
                        ? 'bg-[#1DB954]/15 text-[#1DB954]'
                        : 'text-[#B3B3B3] hover:text-white hover:bg-[#181818]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <ArrowLeftRight className={`w-3.5 h-3.5 ${isTeamActive && teamSubTab === 'switch_ownership' ? 'text-[#1DB954]' : 'text-[#888]'}`} />
                      <span>سوئیچ مالکیت</span>
                    </div>
                  </button>

                  {/* 5. Leave Approvals */}
                  <button
                    onClick={() => {
                      onSelectTab('team', 'leave_approvals');
                      onCloseMobile?.();
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                      isTeamActive && teamSubTab === 'leave_approvals'
                        ? 'bg-[#1DB954]/15 text-[#1DB954]'
                        : 'text-[#B3B3B3] hover:text-white hover:bg-[#181818]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <CalendarCheck className={`w-3.5 h-3.5 ${isTeamActive && teamSubTab === 'leave_approvals' ? 'text-[#1DB954]' : 'text-[#888]'}`} />
                      <span>درخواست‌های مرخصی</span>
                    </div>
                    {counts.pendingLeaves !== undefined && counts.pendingLeaves > 0 && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-400 font-mono font-bold">
                        {counts.pendingLeaves}
                      </span>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* -------------------------------------------------------- */}
          {/* Collapsible Accordion: پنل شخصی (Personal Portal)        */}
          {/* -------------------------------------------------------- */}
          {canAccessPortal && (
            <div>
              {/* Main Collapsible Trigger Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsPortalExpanded((prev) => !prev);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all group ${
                  isPortalActive
                    ? 'bg-[#282828] text-white shadow-sm'
                    : 'text-[#B3B3B3] hover:text-white hover:bg-[#181818]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <User
                    className={`w-4 h-4 transition-colors ${
                      isPortalActive ? 'text-[#1DB954]' : 'text-[#A7A7A7] group-hover:text-white'
                    }`}
                  />
                  <span>پنل شخصی</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {totalPortalPending > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500 text-black font-mono font-bold">
                      {totalPortalPending}
                    </span>
                  )}
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-[#888] transition-transform duration-200 ${
                      isPortalExpanded ? 'rotate-180 text-white' : ''
                    }`}
                  />
                </div>
              </button>

            {/* Sub-menu Items (Dropdown) */}
            {isPortalExpanded && (
              <div className="mt-1 mr-3 pr-2.5 border-r-2 border-[#282828] space-y-1 animate-in fade-in slide-in-from-top-1 duration-150">
                {/* 1. Profile Sub-item */}
                <button
                  onClick={() => {
                    onSelectTab('personal_portal', 'profile');
                    onCloseMobile?.();
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                    isPortalActive && portalSubTab === 'profile'
                      ? 'bg-[#1DB954]/15 text-[#1DB954]'
                      : 'text-[#B3B3B3] hover:text-white hover:bg-[#181818]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <KeyRound className={`w-3.5 h-3.5 ${isPortalActive && portalSubTab === 'profile' ? 'text-[#1DB954]' : 'text-[#888]'}`} />
                    <span>پروفایل و تغییر رمز</span>
                  </div>
                </button>

                {/* 2. Leave Requests Sub-item */}
                <button
                  onClick={() => {
                    onSelectTab('personal_portal', 'leave');
                    onCloseMobile?.();
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                    isPortalActive && portalSubTab === 'leave'
                      ? 'bg-[#1DB954]/15 text-[#1DB954]'
                      : 'text-[#B3B3B3] hover:text-white hover:bg-[#181818]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <CalendarDays className={`w-3.5 h-3.5 ${isPortalActive && portalSubTab === 'leave' ? 'text-[#1DB954]' : 'text-[#888]'}`} />
                    <span>درخواست مرخصی</span>
                  </div>
                  {counts.pendingLeaves !== undefined && counts.pendingLeaves > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-400 font-mono font-bold">
                      {counts.pendingLeaves}
                    </span>
                  )}
                </button>

                {/* 3. Salary Advance Sub-item */}
                <button
                  onClick={() => {
                    onSelectTab('personal_portal', 'advance');
                    onCloseMobile?.();
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                    isPortalActive && portalSubTab === 'advance'
                      ? 'bg-[#1DB954]/15 text-[#1DB954]'
                      : 'text-[#B3B3B3] hover:text-white hover:bg-[#181818]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Wallet className={`w-3.5 h-3.5 ${isPortalActive && portalSubTab === 'advance' ? 'text-[#1DB954]' : 'text-[#888]'}`} />
                    <span>درخواست مساعده</span>
                  </div>
                  {counts.pendingAdvances !== undefined && counts.pendingAdvances > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-400 font-mono font-bold">
                      {counts.pendingAdvances}
                    </span>
                  )}
                </button>

                {/* 4. Logout Sub-item */}
                <button
                  onClick={() => {
                    if (onLogout) onLogout();
                    else onSelectTab('personal_portal', 'logout');
                    onCloseMobile?.();
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold text-rose-400/90 hover:text-rose-300 hover:bg-rose-500/10 transition-all"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>خروج از حساب</span>
                </button>
              </div>
            )}
          </div>
          )}
        </nav>

        {/* User Info Bar at bottom of sidebar */}
        <div
          onClick={() => {
            onSelectTab('personal_portal', 'profile');
            onCloseMobile?.();
          }}
          className="p-3 border-t border-[#282828] bg-[#0c0c0c] flex items-center justify-between cursor-pointer hover:bg-[#151515] transition-colors"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#282828] flex items-center justify-center text-[#1DB954] font-bold text-xs border border-[#3e3e3e] flex-shrink-0 overflow-hidden">
              {currentPersonnel?.avatar ? (
                <img src={currentPersonnel.avatar} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                currentPersonnel ? currentPersonnel.name.charAt(0) : 'U'
              )}
            </div>
            <div className="truncate">
              <div className="text-xs font-bold text-white truncate flex items-center gap-1">
                <span>{currentPersonnel?.name || 'کاربر سیستم'}</span>
              </div>
              <div className="text-[10px] text-[#888] truncate">
                {currentPersonnel?.role === 'admin'
                  ? 'مدیر سیستم'
                  : currentPersonnel?.role === 'sales_manager'
                  ? 'مدیر فروش'
                  : 'کارشناس فروش'}
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
