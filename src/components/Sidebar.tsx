import React from 'react';
import {
  LayoutDashboard,
  Users,
  MessageSquareText,
  PhoneCall,
  ClipboardCheck,
  CalendarDays,
  ShieldCheck,
  Building2,
  X
} from 'lucide-react';
import { Personnel } from '../types';

export type NavTab =
  | 'dashboard'
  | 'customers'
  | 'reports'
  | 'cold_leads'
  | 'admin_reports'
  | 'shifts';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  counts: {
    customers: number;
    expiredCustomers: number;
    coldLeads: number;
    reports: number;
    adminReports: number;
  };
  currentPersonnel: Personnel | null;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  counts,
  currentPersonnel,
  isOpenMobile,
  onCloseMobile,
}) => {
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
      id: 'reports',
      label: 'گزارش‌های مذاکره',
      icon: MessageSquareText,
      count: counts.reports,
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
    {
      id: 'shifts',
      label: 'شیفت‌ها و مرخصی‌ها',
      icon: CalendarDays,
      badgeText: 'فاز بعدی',
    },
  ];

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
          <div className="px-3 pb-2 text-[10px] font-bold tracking-wider text-[#A7A7A7] uppercase">
            بخش‌های اصلی
          </div>

          {navItems.map((item) => {
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
        </nav>

        {/* Expiration Rules Reminder Banner */}
        <div className="p-3 mx-3 mb-3 rounded-lg bg-[#181818] border border-[#282828] text-[11px] text-[#A7A7A7] leading-relaxed hidden sm:block">
          <div className="flex items-center gap-1.5 text-white font-medium mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#1DB954]" />
            <span>قانون بازاریابی</span>
          </div>
          <p>
            مشتریان دارای مهلت زمانی هستند. در صورت عدم تبدیل، سلب امتیاز و به لیست اشتراکی بازمی‌گردند.
          </p>
        </div>

        {/* User Info Bar */}
        <div className="p-4 border-t border-[#282828] bg-[#0c0c0c] flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#282828] flex items-center justify-center text-[#1DB954] font-bold text-xs border border-[#3e3e3e] flex-shrink-0">
              {currentPersonnel ? currentPersonnel.name.charAt(0) : 'U'}
            </div>
            <div className="truncate">
              <div className="text-xs font-bold text-white truncate">
                {currentPersonnel?.name || 'کاربر سیستم'}
              </div>
              <div className="text-[11px] text-[#A7A7A7] truncate">
                {currentPersonnel?.role === 'admin'
                  ? 'مدیر ارشد'
                  : currentPersonnel?.role === 'sales_manager'
                  ? 'مدیر فروش'
                  : 'کارشناس بازاریابی'}
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
