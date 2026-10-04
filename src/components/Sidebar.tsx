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
  Check,
  Layers,
  Plus,
} from 'lucide-react';
import { Personnel, TeamSubTab, Tenant } from '../types';

export type NavTab =
  | 'dashboard'
  | 'customers'
  | 'free_customers'
  | 'reports'
  | 'analytics'
  | 'cold_leads'
  | 'admin_reports'
  | 'team'
  | 'tenants'
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
    totalTenants?: number;
  };
  currentPersonnel: Personnel | null;
  isAdmin?: boolean;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  onLogout?: () => void;
  tenants?: Tenant[];
  activeTenantId?: string;
  onSelectTenant?: (tenantId: string) => void;
  onOpenTenantsManagement?: () => void;
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
  tenants = [],
  activeTenantId = 'all',
  onSelectTenant,
  onOpenTenantsManagement,
}) => {
  // Collapsible states (auto-expand when active)
  const [isTeamExpanded, setIsTeamExpanded] = useState(activeTab === 'team');
  const [isPortalExpanded, setIsPortalExpanded] = useState(activeTab === 'personal_portal');
  const [isTenantsExpanded, setIsTenantsExpanded] = useState(activeTab === 'tenants');
  const [isOrgMenuOpen, setIsOrgMenuOpen] = useState(false);

  useEffect(() => {
    if (activeTab === 'team') {
      setIsTeamExpanded(true);
    }
    if (activeTab === 'personal_portal') {
      setIsPortalExpanded(true);
    }
    if (activeTab === 'tenants') {
      setIsTenantsExpanded(true);
    }
  }, [activeTab]);

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

  // Determine allowed tenants for current user
  const userAllowedTenants =
    isAdmin || currentPersonnel?.role === 'admin'
      ? effectiveTenants
      : effectiveTenants.filter((t) => {
          const allowed =
            currentPersonnel?.allowed_tenant_ids ||
            currentPersonnel?.permissions?.allowed_tenant_ids;
          if (allowed && allowed.length > 0) {
            return allowed.some(
              (id) =>
                String(id) === String(t.id) ||
                (id === 'default' && (String(t.id) === '1' || String(t.id) === 'default'))
            );
          }
          if (currentPersonnel?.tenant_id) {
            return (
              String(currentPersonnel.tenant_id) === String(t.id) ||
              (currentPersonnel.tenant_id === 'default' &&
                (String(t.id) === '1' || String(t.id) === 'default'))
            );
          }
          return String(t.id) === '1' || String(t.id) === 'default';
        });

  const canSwitchTenants =
    (isAdmin || currentPersonnel?.role === 'admin')
      ? effectiveTenants.length > 1
      : userAllowedTenants.length > 1;

  const activeTenant = effectiveTenants.find((t) => String(t.id) === String(activeTenantId));
  const activeTenantName =
    activeTenantId === 'all'
      ? 'همه سازمان‌ها (تجمیعی)'
      : activeTenant?.name || (userAllowedTenants[0]?.name ?? 'سازمان مرکزی آلفادسک');

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
  const isTenantsActive = activeTab === 'tenants';

  // Granular menu permission helper
  const isMenuAllowed = (menuId: string): boolean => {
    if (isAdmin || currentPersonnel?.role === 'admin') return true;
    if (!currentPersonnel?.permissions?.allowed_menus) {
      if (menuId === 'team' || menuId === 'tenants') return false;
      return true;
    }
    return currentPersonnel.permissions.allowed_menus.includes(menuId);
  };

  const visibleNavItems = navItems.filter((item) => isMenuAllowed(item.id));
  const canAccessTeam = isAdmin || currentPersonnel?.role === 'admin' || isMenuAllowed('team');
  const canAccessPortal = isMenuAllowed('personal_portal');
  const canAccessTenants =
    isAdmin ||
    currentPersonnel?.role === 'admin' ||
    (currentPersonnel?.permissions?.can_manage_tenants ?? false) ||
    (currentPersonnel?.permissions?.allowed_menus?.includes('tenants') ?? false);

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

        {/* Active Organization Switcher in Sidebar */}
        <div className="px-3 pt-2 pb-1 relative z-20">
          <div className="relative">
            {canSwitchTenants ? (
              <button
                onClick={() => setIsOrgMenuOpen(!isOrgMenuOpen)}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#141414] hover:bg-[#1a1a1a] border border-[#262626] hover:border-[#1DB954]/50 transition-all text-right group shadow-xs cursor-pointer"
                title="تغییر یا مدیریت سازمان فعال"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-[#202020] border border-[#303030] flex items-center justify-center text-[#1DB954] flex-shrink-0 group-hover:scale-105 transition-transform">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 text-right">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-[#888888] font-medium">سازمان فعال:</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1DB954] animate-pulse"></span>
                    </div>
                    <div className="text-xs font-bold text-white truncate max-w-[130px]">
                      {activeTenantName}
                    </div>
                  </div>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-[#888888] group-hover:text-white transition-transform ${
                    isOrgMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
            ) : (
              <div className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#141414] border border-[#262626] text-right">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-[#202020] border border-[#303030] flex items-center justify-center text-[#1DB954] flex-shrink-0">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 text-right">
                    <div className="text-[10px] text-[#888888] font-medium">سازمان شما:</div>
                    <div className="text-xs font-bold text-white truncate max-w-[150px]">
                      {userAllowedTenants[0]?.name || activeTenantName}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Dropdown Menu (only if user can switch) */}
            {canSwitchTenants && isOrgMenuOpen && (
              <div className="absolute top-full right-0 left-0 mt-1.5 bg-[#181818] border border-[#333333] rounded-xl shadow-2xl p-1.5 z-50 text-right backdrop-blur-md animate-in fade-in zoom-in-95 duration-100">
                <div className="px-2 py-1.5 text-[10px] text-[#888] font-semibold border-b border-[#252525] flex items-center justify-between">
                  <span>انتخاب سازمان فعال</span>
                  <span className="text-[9px] font-mono text-[#1DB954]">
                    {userAllowedTenants.length} سازمان
                  </span>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-0.5 py-1">
                  {isAdmin && (
                    <button
                      onClick={() => {
                        onSelectTenant?.('all');
                        setIsOrgMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                        activeTenantId === 'all'
                          ? 'bg-[#1DB954]/15 text-[#1DB954] font-bold'
                          : 'text-[#B3B3B3] hover:text-white hover:bg-[#222222]'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Layers className="w-3.5 h-3.5 text-[#1DB954]" />
                        <span>همه سازمان‌ها (تجمیعی)</span>
                      </span>
                      {activeTenantId === 'all' && <Check className="w-3.5 h-3.5 text-[#1DB954]" />}
                    </button>
                  )}

                  {userAllowedTenants.map((t) => {
                    const isSelected =
                      activeTenantId === String(t.id) ||
                      (activeTenantId === 'default' && (t.id === 'default' || t.id === '1'));
                    return (
                      <button
                        key={t.id}
                        onClick={() => {
                          onSelectTenant?.(String(t.id));
                          setIsOrgMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#1DB954]/15 text-[#1DB954] font-bold'
                            : 'text-[#B3B3B3] hover:text-white hover:bg-[#222222]'
                        }`}
                      >
                        <span className="truncate max-w-[140px]">{t.name}</span>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-[#1DB954] flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {canAccessTenants && (
                  <div className="pt-1.5 mt-1 border-t border-[#252525]">
                    <button
                      onClick={() => {
                        setIsOrgMenuOpen(false);
                        onOpenTenantsManagement?.();
                      }}
                      className="w-full flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg bg-[#202020] hover:bg-[#282828] text-[#CCC] hover:text-white text-xs font-semibold transition-colors border border-[#333333] cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#888]" />
                      <span>مدیریت و ایجاد سازمان جدید</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-3 space-y-1.5 overflow-y-auto">
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
          {/* Collapsible Accordion: سازمان‌ها و شعب (Multi-Tenant)      */}
          {/* -------------------------------------------------------- */}
          {canAccessTenants && (
            <div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsTenantsExpanded((prev) => !prev);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all group ${
                  isTenantsActive
                    ? 'bg-[#282828] text-white shadow-sm'
                    : 'text-[#B3B3B3] hover:text-white hover:bg-[#181818]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Building2
                    className={`w-4 h-4 transition-colors ${
                      isTenantsActive ? 'text-[#1DB954]' : 'text-[#A7A7A7] group-hover:text-white'
                    }`}
                  />
                  <span>سازمان‌ها و شعب</span>
                </div>

                <ChevronDown
                  className={`w-3.5 h-3.5 text-[#888] transition-transform duration-200 ${
                    isTenantsExpanded ? 'rotate-180 text-white' : ''
                  }`}
                />
              </button>

              {/* Tenants Sub-menu Items */}
              {isTenantsExpanded && (
                <div className="mt-1 mr-3 pr-2.5 border-r-2 border-[#282828] space-y-1 animate-in fade-in slide-in-from-top-1 duration-150">
                  {/* 1. View & Switch Organizations */}
                  <button
                    onClick={() => {
                      onSelectTab('tenants');
                      onCloseMobile?.();
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      isTenantsActive
                        ? 'bg-[#1DB954]/15 text-[#1DB954]'
                        : 'text-[#B3B3B3] hover:text-white hover:bg-[#181818]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Building2 className={`w-3.5 h-3.5 ${isTenantsActive ? 'text-[#1DB954]' : 'text-[#888]'}`} />
                      <span>مشاهده لیست سازمان‌ها</span>
                    </div>
                  </button>

                  {/* 2. Create New Organization */}
                  <button
                    onClick={() => {
                      onSelectTab('tenants');
                      onOpenTenantsManagement?.();
                      onCloseMobile?.();
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold text-[#B3B3B3] hover:text-white hover:bg-[#181818] transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Plus className="w-3.5 h-3.5 text-[#888]" />
                      <span>ساخت سازمان جدید</span>
                    </div>
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
