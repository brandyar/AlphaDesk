import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  X,
  Phone,
  PhoneCall,
  Building2,
  Unlock,
  FileText,
  FileCheck2,
  Compass,
  Clock,
  ArrowUpLeft,
  Plus,
  AlertTriangle,
  Loader2,
  SlidersHorizontal,
  LayoutDashboard,
  Users,
  MessageSquareText,
  BarChart3,
  ClipboardCheck,
  WalletCards,
  Users2,
  Layers,
  CalendarDays,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import {
  Customer,
  CustomerReport,
  Personnel,
  AuthUser,
  DuplicateCheckResult,
  DeepSearchCustomerItem,
  DeepSearchReportItem,
  DeepSearchLeadItem,
  DeepSearchPersonnelItem,
} from '../types';
import {
  normalizePersianText,
  matchesCustomerSearch,
  getCustomerPhoneOptions,
  formatStatusLabel,
  getStatusTheme,
  formatToman,
  formatDisplayDateOnly,
  toPersianDigits,
  NEGOTIATION_STATUS_OPTIONS,
} from '../utils';
import { fetchDeepSearch } from '../api';
import { NavTab } from './Sidebar';

export type SearchScopeTab = 'all' | 'customers' | 'free_pool' | 'reports' | 'navigation';

interface NavigationShortcut {
  id: string;
  label: string;
  subtitle: string;
  tab: NavTab;
  subTab?: string;
  keywords: string[];
  menuId: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface SearchActionItem {
  key: string;
  kind: 'customer' | 'free_pool' | 'report' | 'cold_lead' | 'personnel' | 'navigation' | 'quick_add';
  onSelect: () => void;
}

interface GlobalSearchProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  customers: Customer[];
  allCustomers?: Customer[];
  reports: CustomerReport[];
  personnelList: Personnel[];
  currentPersonnel: Personnel | null;
  currentUser: AuthUser | null;
  isAdmin: boolean;
  canViewAllCustomers: boolean;
  onSelectCustomer: (customer: Customer) => void;
  onOpenAddReport: (customerId?: string) => void;
  onOpenQuickAddWithPhone: (initialPhone?: string) => void;
  onNavigateToTab: (tab: NavTab, subTab?: string) => void;
  onApplyToCustomersList?: (query: string, status?: string) => void;
}

const RECENT_SEARCHES_KEY = 'alphadesk_global_recent_searches_v1';

function toEnglishDigits(str: string): string {
  const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
  const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
  return str
    .replace(/[۰-۹]/g, (w) => String(persianDigits.indexOf(w)))
    .replace(/[٠-٩]/g, (w) => String(arabicDigits.indexOf(w)));
}

function extractPhoneDigits(str: string): string {
  const eng = toEnglishDigits(str);
  return eng.replace(/[^\d]/g, '');
}

function normalizePhoneSearchDigits(digits: string): string {
  if (!digits) return '';
  if (digits.startsWith('0098') && digits.length > 4) return '0' + digits.slice(4);
  if (digits.startsWith('98') && digits.length >= 11) return '0' + digits.slice(2);
  if (digits.length === 10 && digits.startsWith('9')) return '0' + digits;
  return digits;
}

function isFreePoolCustomer(c: Customer): boolean {
  if (!c) return false;
  if (c.status === 'قرارداد' || c.status === 'قرارداد / فاکتور' || c.status === 'لیست سیاه') {
    return false;
  }
  const isUnassigned = !c.assigned_marketer_id || c.assigned_marketer_name === 'تخصیص نیافته';
  const isDeadlinePassed = Boolean(
    c.assignment_deadline && new Date().getTime() > new Date(c.assignment_deadline).getTime()
  );
  return Boolean(c.is_expired || isDeadlinePassed || isUnassigned);
}

function scoreCustomerRelevance(c: Customer, rawQuery: string, normQuery: string, phoneDigits: string): number {
  let score = 0;
  const companyNorm = normalizePersianText(c.company_name);
  const managerNorm = normalizePersianText(c.manager_name);
  const negotiatorNorm = normalizePersianText(c.negotiator_name);

  if (companyNorm === normQuery) score += 100;
  else if (companyNorm.startsWith(normQuery)) score += 70;
  else if (companyNorm.includes(normQuery)) score += 45;

  if (managerNorm.startsWith(normQuery) || negotiatorNorm.startsWith(normQuery)) score += 40;
  else if (managerNorm.includes(normQuery) || negotiatorNorm.includes(normQuery)) score += 25;

  if (phoneDigits.length >= 3) {
    const phones = getCustomerPhoneOptions(c);
    for (const p of phones) {
      const pDigits = normalizePhoneSearchDigits(extractPhoneDigits(p.number));
      if (pDigits === phoneDigits) {
        score += 120;
        break;
      }
      if (pDigits.endsWith(phoneDigits) || pDigits.includes(phoneDigits)) {
        score += 80;
        break;
      }
    }
  }

  if (c.status === 'قرارداد' || c.status === 'قرارداد / فاکتور') score += 5;
  return score;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({
  searchQuery,
  onSearchChange,
  customers,
  allCustomers = [],
  reports,
  personnelList,
  currentPersonnel,
  currentUser,
  isAdmin,
  canViewAllCustomers,
  onSelectCustomer,
  onOpenAddReport,
  onOpenQuickAddWithPhone,
  onNavigateToTab,
  onApplyToCustomersList,
}) => {
  const [localInput, setLocalInput] = useState(searchQuery || '');
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery || '');
  const [isDesktopOpen, setIsDesktopOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [activeScope, setActiveScope] = useState<SearchScopeTab>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [marketerFilter, setMarketerFilter] = useState<string>('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  // Deep server search results (Phase 2 unified GET /api/search)
  const [remoteCustomers, setRemoteCustomers] = useState<DeepSearchCustomerItem[]>([]);
  const [remoteFreeCustomers, setRemoteFreeCustomers] = useState<DeepSearchCustomerItem[]>([]);
  const [remoteReports, setRemoteReports] = useState<DeepSearchReportItem[]>([]);
  const [remoteColdLeads, setRemoteColdLeads] = useState<DeepSearchLeadItem[]>([]);
  const [remotePersonnel, setRemotePersonnel] = useState<DeepSearchPersonnelItem[]>([]);
  const [phoneConflict, setPhoneConflict] = useState<DuplicateCheckResult | null>(null);
  const [isSearchingRemote, setIsSearchingRemote] = useState(false);

  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.slice(0, 5);
      }
    } catch {}
    return [];
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const desktopInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const searchRequestIdRef = useRef(0);

  const isAnyOpen = isDesktopOpen || isMobileOpen;

  // Sync external searchQuery reset
  useEffect(() => {
    if (searchQuery !== localInput && searchQuery === '') {
      setLocalInput('');
      setDebouncedQuery('');
    }
  }, [searchQuery]);

  // Debounce input (200ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(localInput);
    }, 200);
    return () => clearTimeout(timer);
  }, [localInput]);

  // Save recent search helper
  const recordRecentSearch = (q: string) => {
    const cleaned = q.trim();
    if (cleaned.length < 2) return;
    setRecentSearches((prev) => {
      const next = [cleaned, ...prev.filter((item) => item !== cleaned)].slice(0, 5);
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const removeRecentSearch = (item: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentSearches((prev) => {
      const next = prev.filter((x) => x !== item);
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const clearAllRecentSearches = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch {}
  };

  // Global keyboard shortcuts: Ctrl+K / Cmd+K or "/"
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.ctrlKey || e.metaKey;
      if (isCmdOrCtrl && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (window.innerWidth >= 1024) {
          setIsDesktopOpen(true);
          setTimeout(() => desktopInputRef.current?.focus(), 10);
        } else {
          setIsMobileOpen(true);
          setTimeout(() => mobileInputRef.current?.focus(), 20);
        }
        return;
      }

      if (e.key === '/' && !isAnyOpen) {
        const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
        const isEditable = (e.target as HTMLElement)?.isContentEditable;
        if (tag !== 'input' && tag !== 'textarea' && tag !== 'select' && !isEditable) {
          e.preventDefault();
          if (window.innerWidth >= 1024) {
            setIsDesktopOpen(true);
            setTimeout(() => desktopInputRef.current?.focus(), 10);
          } else {
            setIsMobileOpen(true);
            setTimeout(() => mobileInputRef.current?.focus(), 20);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAnyOpen]);

  // Close desktop popover on outside click
  useEffect(() => {
    if (!isDesktopOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsDesktopOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDesktopOpen]);

  // Lock body scroll on mobile full-screen overlay
  useEffect(() => {
    if (isMobileOpen) {
      setTimeout(() => mobileInputRef.current?.focus(), 30);
    }
  }, [isMobileOpen]);

  const rawQuery = debouncedQuery.trim();
  const normalizedQuery = normalizePersianText(rawQuery);
  const rawDigits = extractPhoneDigits(rawQuery);
  const normalizedPhoneDigits = normalizePhoneSearchDigits(rawDigits);
  const isPhoneLikeQuery = rawDigits.length >= 4 && /^[\d۰-۹٠-٩+\s\-()]+$/.test(rawQuery);

  // Phase 2: Debounced unified server-side deep search via GET /api/search
  useEffect(() => {
    const hasFilter = statusFilter !== 'all' || marketerFilter !== 'all';
    if (!isAnyOpen || (rawQuery.length < 2 && !hasFilter)) {
      setRemoteCustomers([]);
      setRemoteFreeCustomers([]);
      setRemoteReports([]);
      setRemoteColdLeads([]);
      setRemotePersonnel([]);
      setPhoneConflict(null);
      setIsSearchingRemote(false);
      return;
    }

    const reqId = ++searchRequestIdRef.current;
    const controller = new AbortController();
    setIsSearchingRemote(true);

    fetchDeepSearch({
      q: rawQuery,
      scope: activeScope === 'navigation' ? 'all' : activeScope,
      status: statusFilter,
      marketer_id: isAdmin || canViewAllCustomers ? marketerFilter : 'all',
      limit: 10,
      signal: controller.signal,
    })
      .then((res) => {
        if (reqId !== searchRequestIdRef.current) return;
        setRemoteCustomers(Array.isArray(res?.customers) ? res.customers : []);
        setRemoteFreeCustomers(Array.isArray(res?.free_pool) ? res.free_pool : []);
        setRemoteReports(Array.isArray(res?.reports) ? res.reports : []);
        setRemoteColdLeads(Array.isArray(res?.cold_leads) ? res.cold_leads : []);
        setRemotePersonnel(Array.isArray(res?.personnel) ? res.personnel : []);
        setPhoneConflict(res?.phoneConflict && res.phoneConflict.isDuplicate ? res.phoneConflict : null);
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return;
        if (reqId === searchRequestIdRef.current) {
          setRemoteCustomers([]);
          setRemoteFreeCustomers([]);
          setRemoteReports([]);
          setRemoteColdLeads([]);
          setRemotePersonnel([]);
          setPhoneConflict(null);
        }
      })
      .finally(() => {
        if (reqId === searchRequestIdRef.current) {
          setIsSearchingRemote(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [isAnyOpen, rawQuery, activeScope, statusFilter, marketerFilter, isAdmin, canViewAllCustomers]);

  // Permission-filtered navigation shortcuts
  const allowedNavigationItems = useMemo<NavigationShortcut[]>(() => {
    const isMenuAllowed = (menuId: string): boolean => {
      if (isAdmin && !currentPersonnel) return true;
      if (currentPersonnel?.permissions?.allowed_menus && Array.isArray(currentPersonnel.permissions.allowed_menus)) {
        return currentPersonnel.permissions.allowed_menus.includes(menuId);
      }
      if (menuId === 'team' || menuId === 'tenants') {
        return Boolean(isAdmin || currentPersonnel?.role === 'admin' || currentPersonnel?.role === 'sales_manager');
      }
      if (menuId === 'payroll') {
        return Boolean(isAdmin || currentPersonnel?.role === 'admin');
      }
      return true;
    };

    const allNavs: NavigationShortcut[] = [
      {
        id: 'nav-dashboard',
        label: 'داشبورد و آمار',
        subtitle: 'نمای کلی فروش، پیگیری‌ها و قراردادها',
        tab: 'dashboard',
        keywords: ['داشبورد', 'خانه', 'امار', 'آمار', 'خلاصه', 'dashboard'],
        menuId: 'dashboard',
        icon: LayoutDashboard,
      },
      {
        id: 'nav-customers',
        label: 'مدیریت مشتریان',
        subtitle: 'لیست پرونده‌ها، فیلترها و جستجوی پیشرفته',
        tab: 'customers',
        keywords: ['مشتری', 'مشتریان', 'پرونده', 'فروش', 'customers'],
        menuId: 'customers',
        icon: Users,
      },
      {
        id: 'nav-free-pool',
        label: 'حوضچه مشتریان آزاد',
        subtitle: 'پرونده‌های منقضی‌شده و قابل برداشت',
        tab: 'free_customers',
        keywords: ['حوضچه', 'ازاد', 'آزاد', 'منقضی', 'برداشت', 'free'],
        menuId: 'free_customers',
        icon: Unlock,
      },
      {
        id: 'nav-reports',
        label: 'گزارش‌های مذاکره',
        subtitle: 'تاریخچه تماس‌ها، پیگیری‌ها و قراردادها',
        tab: 'reports',
        keywords: ['گزارش', 'مذاکره', 'تماس', 'قرارداد', 'فاکتور', 'reports'],
        menuId: 'reports',
        icon: MessageSquareText,
      },
      {
        id: 'nav-analytics',
        label: 'گزارشات نموداری و تحلیل',
        subtitle: 'روند فروش، قیف تبدیل و لیدربورد پرسنل',
        tab: 'analytics',
        keywords: ['نمودار', 'تحلیل', 'عملکرد', 'قیف', 'analytics'],
        menuId: 'analytics',
        icon: BarChart3,
      },
      {
        id: 'nav-admin-reports',
        label: 'گزارش عملکرد پرسنل',
        subtitle: 'ثبت و بررسی گزارش کار روزانه همکاران',
        tab: 'admin_reports',
        keywords: ['عملکرد', 'اداری', 'کارکرد', 'گزارش روزانه'],
        menuId: 'admin_reports',
        icon: ClipboardCheck,
      },
      {
        id: 'nav-payroll',
        label: 'حقوق، پورسانت و دستمزد',
        subtitle: 'محاسبه فیش حقوقی و قرارداد پرسنل',
        tab: 'payroll',
        keywords: ['حقوق', 'پورسانت', 'دستمزد', 'فیش', 'payroll'],
        menuId: 'payroll',
        icon: WalletCards,
      },
      {
        id: 'nav-team',
        label: 'مدیریت تیم و همکاران',
        subtitle: 'پرسنل، دسترسی‌ها و انتقال مالکیت',
        tab: 'team',
        keywords: ['تیم', 'همکاران', 'پرسنل', 'دسترسی', 'انتقال'],
        menuId: 'team',
        icon: Users2,
      },
      {
        id: 'nav-portal-profile',
        label: 'پروفایل و تغییر رمز عبور',
        subtitle: 'پنل شخصی، شماره کارت/شبا و امنیت',
        tab: 'personal_portal',
        subTab: 'profile',
        keywords: ['پروفایل', 'رمز', 'شبا', 'پورتال', 'حساب'],
        menuId: 'personal_portal',
        icon: UserCheck,
      },
      {
        id: 'nav-portal-leave',
        label: 'درخواست‌های مرخصی',
        subtitle: 'ثبت و پیگیری مرخصی روزانه و ساعتی',
        tab: 'personal_portal',
        subTab: 'leave',
        keywords: ['مرخصی', 'ساعتی', 'روزانه', 'leave'],
        menuId: 'personal_portal',
        icon: CalendarDays,
      },
      {
        id: 'nav-portal-advance',
        label: 'درخواست‌های مساعده',
        subtitle: 'ثبت و پیگیری درخواست مساعده مالی',
        tab: 'personal_portal',
        subTab: 'advance',
        keywords: ['مساعده', 'وام', 'مالی', 'advance'],
        menuId: 'personal_portal',
        icon: ShieldCheck,
      },
      {
        id: 'nav-tenants',
        label: 'مدیریت سازمان‌ها و شعب',
        subtitle: 'تنظیمات مولتی‌تننت و شعب فروش',
        tab: 'tenants',
        keywords: ['سازمان', 'شعبه', 'تننت', 'tenants'],
        menuId: 'tenants',
        icon: Layers,
      },
    ];

    return allNavs.filter((n) => isMenuAllowed(n.menuId));
  }, [isAdmin, currentPersonnel]);

  // Matched Customers (Merged In-Memory + Deep Server Search, preserving match_reason)
  const matchedCustomers = useMemo<DeepSearchCustomerItem[]>(() => {
    if (!rawQuery) {
      if (statusFilter === 'all' && marketerFilter === 'all') return [];
    }

    const mergedMap = new Map<string, DeepSearchCustomerItem>();
    // Prefer server-enriched records first (they include deep match_reason & full contacts)
    for (const c of remoteCustomers) {
      if (c && c.id) mergedMap.set(String(c.id), c);
    }
    for (const c of customers) {
      if (c && c.id && !mergedMap.has(String(c.id))) {
        mergedMap.set(String(c.id), c);
      }
    }

    const list = Array.from(mergedMap.values()).filter((c) => {
      if (statusFilter === 'expired') {
        if (!c.is_expired) return false;
      } else if (statusFilter !== 'all') {
        if (statusFilter === 'قرارداد' || statusFilter === 'قرارداد / فاکتور') {
          const st = String(c.status);
          if (st !== 'قرارداد' && st !== 'قرارداد / فاکتور' && st !== 'قرارداد/فاکتور') return false;
        } else if (c.status !== statusFilter) {
          return false;
        }
      }
      if ((isAdmin || canViewAllCustomers) && marketerFilter !== 'all' && String(c.assigned_marketer_id) !== String(marketerFilter)) {
        return false;
      }
      if (!rawQuery) return true;
      return matchesCustomerSearch(c, rawQuery);
    });

    if (!rawQuery) return list.slice(0, 8);

    return list
      .sort(
        (a, b) =>
          scoreCustomerRelevance(b, rawQuery, normalizedQuery, normalizedPhoneDigits) -
          scoreCustomerRelevance(a, rawQuery, normalizedQuery, normalizedPhoneDigits)
      )
      .slice(0, 8);
  }, [customers, remoteCustomers, rawQuery, normalizedQuery, normalizedPhoneDigits, statusFilter, marketerFilter, isAdmin, canViewAllCustomers]);

  // Matched Free Pool Customers
  const matchedFreeCustomers = useMemo<DeepSearchCustomerItem[]>(() => {
    if (!rawQuery) return [];
    const mergedMap = new Map<string, DeepSearchCustomerItem>();
    for (const c of remoteFreeCustomers) {
      if (c && c.id) mergedMap.set(String(c.id), c);
    }
    for (const c of allCustomers) {
      if (c && c.id && isFreePoolCustomer(c) && !mergedMap.has(String(c.id))) {
        mergedMap.set(String(c.id), c);
      }
    }
    const scopedIds = new Set(matchedCustomers.map((mc) => String(mc.id)));
    return Array.from(mergedMap.values())
      .filter((c) => !scopedIds.has(String(c.id)) && matchesCustomerSearch(c, rawQuery))
      .slice(0, 5);
  }, [allCustomers, remoteFreeCustomers, matchedCustomers, rawQuery]);

  // Matched Reports & Contracts
  const matchedReports = useMemo<DeepSearchReportItem[]>(() => {
    if (!rawQuery) return [];
    const mergedMap = new Map<string, DeepSearchReportItem>();
    for (const r of remoteReports) {
      if (r && r.id) mergedMap.set(String(r.id), r);
    }
    for (const r of reports) {
      if (r && r.id && !mergedMap.has(String(r.id))) {
        mergedMap.set(String(r.id), r);
      }
    }

    const cleanNumQuery = rawDigits;

    return Array.from(mergedMap.values())
      .filter((r) => {
        if (statusFilter !== 'all' && statusFilter !== 'expired') {
          if (statusFilter === 'قرارداد' || statusFilter === 'قرارداد / فاکتور') {
            const st = String(r.negotiation_status);
            if (st !== 'قرارداد' && st !== 'قرارداد / فاکتور' && st !== 'قرارداد/فاکتور') return false;
          } else if (r.negotiation_status !== statusFilter) {
            return false;
          }
        }
        const textHaystack = normalizePersianText(
          `${r.customer_name || ''} ${r.negotiator_name || ''} ${r.customer_negotiator_name || ''} ${r.contract_number || ''} ${r.contract_items || ''} ${r.report_text || ''}`
        );
        if (textHaystack.includes(normalizedQuery)) return true;
        if (cleanNumQuery.length >= 3) {
          const phoneDigits = extractPhoneDigits(r.negotiation_phone || '');
          const contractDigits = extractPhoneDigits(r.contract_number || '');
          if (phoneDigits.includes(cleanNumQuery) || contractDigits.includes(cleanNumQuery)) return true;
        }
        return false;
      })
      .slice(0, 6);
  }, [reports, remoteReports, rawQuery, normalizedQuery, rawDigits, statusFilter]);

  // Matched Navigation Items
  const matchedNavigation = useMemo(() => {
    if (!rawQuery) return allowedNavigationItems.slice(0, 5);
    return allowedNavigationItems
      .filter((item) => {
        const labelNorm = normalizePersianText(item.label);
        const subNorm = normalizePersianText(item.subtitle);
        if (labelNorm.includes(normalizedQuery) || subNorm.includes(normalizedQuery)) return true;
        return item.keywords.some((kw) => normalizePersianText(kw).includes(normalizedQuery));
      })
      .slice(0, 5);
  }, [allowedNavigationItems, rawQuery, normalizedQuery]);

  // Ownership Conflict Alert (when a searched phone belongs to another marketer not visible in scoped list)
  const externalOwnerConflict = useMemo(() => {
    if (!phoneConflict || !phoneConflict.isDuplicate || !phoneConflict.matchedCustomer) return null;
    const mc = phoneConflict.matchedCustomer;
    const alreadyInMyResults = matchedCustomers.some((c) => String(c.id) === String(mc.id));
    const alreadyInFreeResults = matchedFreeCustomers.some((c) => String(c.id) === String(mc.id));
    if (alreadyInMyResults || alreadyInFreeResults) return null;
    return phoneConflict;
  }, [phoneConflict, matchedCustomers, matchedFreeCustomers]);

  const closeAll = () => {
    setIsDesktopOpen(false);
    setIsMobileOpen(false);
    setActiveIndex(-1);
  };

  const handleOpenCustomer = (customer: Customer) => {
    recordRecentSearch(localInput);
    closeAll();
    onSelectCustomer(customer);
  };

  const handleOpenReportCustomer = (rep: CustomerReport) => {
    recordRecentSearch(localInput);
    const found =
      customers.find((c) => String(c.id) === String(rep.customer_id)) ||
      allCustomers.find((c) => String(c.id) === String(rep.customer_id));
    closeAll();
    if (found) {
      onSelectCustomer(found);
    } else if (rep.customer_id) {
      onSelectCustomer({
        id: rep.customer_id,
        company_name: rep.customer_name || 'پرونده مشتری',
        business_type: '',
        province: '',
        city: '',
        manager_name: rep.customer_negotiator_name || '',
        manager_phones: [],
        negotiator_name: rep.negotiator_name || '',
        negotiator_phones: [],
        mobile_numbers: rep.negotiation_phone ? [rep.negotiation_phone] : [],
        landline_numbers: [],
        telegram_phone: '',
        telegram_ids: [],
        instagram_ids: [],
        emails: [],
        websites: [],
        is_ecommerce: false,
        interview_status: '',
        interview_report: '',
        interview_score: 7,
        assigned_marketer_name: '',
        status: rep.negotiation_status || 'تماس برقرار نشده',
        date_created: rep.date_created,
        date_updated: rep.date_created,
      });
    }
  };

  const handleOpenNav = (item: NavigationShortcut) => {
    if (rawQuery) recordRecentSearch(localInput);
    closeAll();
    onNavigateToTab(item.tab, item.subTab);
  };

  const handleQuickAddTrigger = () => {
    const phoneArg = isPhoneLikeQuery ? normalizedPhoneDigits : undefined;
    closeAll();
    onOpenQuickAddWithPhone(phoneArg);
  };

  const handleOpenColdLead = (lead: DeepSearchLeadItem) => {
    recordRecentSearch(localInput);
    closeAll();
    if (lead.converted_customer_id) {
      const found =
        customers.find((c) => String(c.id) === String(lead.converted_customer_id)) ||
        allCustomers.find((c) => String(c.id) === String(lead.converted_customer_id));
      if (found) {
        onSelectCustomer(found);
        return;
      }
    }
    onOpenQuickAddWithPhone(lead.phone_number);
  };

  const handleOpenPersonnelFilter = (p: DeepSearchPersonnelItem) => {
    recordRecentSearch(localInput);
    setMarketerFilter(String(p.id));
    setShowAdvancedFilters(true);
    setActiveScope('customers');
  };

  const showCustomers = activeScope === 'all' || activeScope === 'customers';
  const showFreePool = activeScope === 'all' || activeScope === 'free_pool';
  const showReports = activeScope === 'all' || activeScope === 'reports';
  const showColdLeads = activeScope === 'all';
  const showPersonnel = activeScope === 'all' && (isAdmin || canViewAllCustomers);
  const showNavigation = activeScope === 'all' || activeScope === 'navigation';

  // Flat list for keyboard ↑ / ↓ / Enter navigation
  const selectableActions = useMemo<SearchActionItem[]>(() => {
    const list: SearchActionItem[] = [];
    if (showCustomers) {
      matchedCustomers.forEach((c) => {
        list.push({
          key: `cust-${c.id}`,
          kind: 'customer',
          onSelect: () => handleOpenCustomer(c),
        });
      });
    }
    if (showFreePool) {
      matchedFreeCustomers.forEach((c) => {
        list.push({
          key: `free-${c.id}`,
          kind: 'free_pool',
          onSelect: () => handleOpenCustomer(c),
        });
      });
    }
    if (showReports) {
      matchedReports.forEach((r) => {
        list.push({
          key: `rep-${r.id}`,
          kind: 'report',
          onSelect: () => handleOpenReportCustomer(r),
        });
      });
    }
    if (showColdLeads) {
      remoteColdLeads.forEach((l) => {
        list.push({
          key: `lead-${l.id}`,
          kind: 'cold_lead',
          onSelect: () => handleOpenColdLead(l),
        });
      });
    }
    if (showPersonnel) {
      remotePersonnel.forEach((p) => {
        list.push({
          key: `pers-${p.id}`,
          kind: 'personnel',
          onSelect: () => handleOpenPersonnelFilter(p),
        });
      });
    }
    if (showNavigation) {
      matchedNavigation.forEach((n) => {
        list.push({
          key: n.id,
          kind: 'navigation',
          onSelect: () => handleOpenNav(n),
        });
      });
    }
    if (rawQuery.length >= 2 && !externalOwnerConflict) {
      list.push({
        key: 'quick-add-cta',
        kind: 'quick_add',
        onSelect: handleQuickAddTrigger,
      });
    }
    return list;
  }, [
    showCustomers,
    showFreePool,
    showReports,
    showColdLeads,
    showPersonnel,
    showNavigation,
    matchedCustomers,
    matchedFreeCustomers,
    matchedReports,
    remoteColdLeads,
    remotePersonnel,
    matchedNavigation,
    rawQuery,
    externalOwnerConflict,
  ]);

  useEffect(() => {
    setActiveIndex(-1);
  }, [rawQuery, activeScope, statusFilter, marketerFilter]);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeAll();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (selectableActions.length > 0) {
        setActiveIndex((prev) => (prev + 1) % selectableActions.length);
      }
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (selectableActions.length > 0) {
        setActiveIndex((prev) => (prev <= 0 ? selectableActions.length - 1 : prev - 1));
      }
      return;
    }
    if (e.key === 'Enter') {
      if (activeIndex >= 0 && selectableActions[activeIndex]) {
        e.preventDefault();
        selectableActions[activeIndex].onSelect();
      } else if (selectableActions.length > 0 && rawQuery.length >= 2) {
        e.preventDefault();
        selectableActions[0].onSelect();
      }
    }
  };

  const handleInputChange = (val: string) => {
    setLocalInput(val);
    onSearchChange(val);
    if (!isDesktopOpen && window.innerWidth >= 1024) {
      setIsDesktopOpen(true);
    }
  };

  const handleClear = () => {
    setLocalInput('');
    onSearchChange('');
    setStatusFilter('all');
    setMarketerFilter('all');
    if (isMobileOpen) {
      mobileInputRef.current?.focus();
    } else {
      desktopInputRef.current?.focus();
    }
  };

  const totalResultsCount =
    (showCustomers ? matchedCustomers.length : 0) +
    (showFreePool ? matchedFreeCustomers.length : 0) +
    (showReports ? matchedReports.length : 0) +
    (showColdLeads ? remoteColdLeads.length : 0) +
    (showPersonnel ? remotePersonnel.length : 0) +
    (showNavigation ? matchedNavigation.length : 0);

  const scopeTabs: { id: SearchScopeTab; label: string; count?: number }[] = [
    { id: 'all', label: 'همه' },
    { id: 'customers', label: 'مشتریان', count: rawQuery ? matchedCustomers.length : undefined },
    { id: 'free_pool', label: 'حوضچه آزاد', count: rawQuery ? matchedFreeCustomers.length : undefined },
    { id: 'reports', label: 'گزارش و قرارداد', count: rawQuery ? matchedReports.length : undefined },
    { id: 'navigation', label: 'بخش‌ها', count: matchedNavigation.length },
  ];

  // Shared results body rendered in both Desktop Popover & Mobile Fullscreen Overlay
  const renderPanelContent = () => {
    let flatActionCursor = 0;

    return (
      <div className="flex flex-col max-h-[75vh] lg:max-h-[540px] overflow-hidden">
        {/* Scope Tabs & Advanced Filter Toggle */}
        <div className="px-3 py-2 border-b border-slate-200 dark:border-[#282828] bg-slate-50/70 dark:bg-[#141414] flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
            {scopeTabs.map((t) => {
              const isActive = activeScope === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveScope(t.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer flex items-center gap-1 ${
                    isActive
                      ? 'bg-[#1DB954] text-black font-bold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 dark:text-[#A7A7A7] dark:hover:text-white dark:hover:bg-[#242424]'
                  }`}
                >
                  <span>{t.label}</span>
                  {typeof t.count === 'number' && t.count > 0 && (
                    <span
                      className={`font-mono tabular-nums text-[10px] ${
                        isActive ? 'text-black/80' : 'text-slate-400 dark:text-[#777]'
                      }`}
                    >
                      {toPersianDigits(t.count)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setShowAdvancedFilters((v) => !v)}
            className={`px-2 py-1 rounded-lg text-[11px] flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border ${
              showAdvancedFilters || statusFilter !== 'all' || marketerFilter !== 'all'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-[#1DB954]/15 dark:border-[#1DB954]/40 dark:text-[#1DB954] font-bold'
                : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 dark:bg-[#1e1e1e] dark:border-[#2e2e2e] dark:text-[#A7A7A7] dark:hover:text-white'
            }`}
            title="فیلتر پیشرفته وضعیت و بازاریاب"
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span>فیلترها</span>
          </button>
        </div>

        {/* Collapsible Advanced Filter Row */}
        {showAdvancedFilters && (
          <div className="px-3 py-2.5 border-b border-slate-200 dark:border-[#282828] bg-slate-50 dark:bg-[#161616] grid grid-cols-1 sm:grid-cols-2 gap-2 shrink-0">
            <div>
              <label className="block text-[10px] text-slate-500 dark:text-[#888] mb-1">
                وضعیت پرونده
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="فیلتر وضعیت پرونده در جستجو"
                className="w-full h-8 px-2 bg-white dark:bg-[#222] border border-slate-200 dark:border-[#333] rounded-lg text-xs text-slate-800 dark:text-white focus:outline-none focus:border-[#1DB954]"
              >
                <option value="all">همه وضعیت‌ها</option>
                <option value="expired">فقط پرونده‌های منقضی‌شده</option>
                {NEGOTIATION_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {(isAdmin || canViewAllCustomers) && (
              <div>
                <label className="block text-[10px] text-slate-500 dark:text-[#888] mb-1">
                  بازاریاب مسئول
                </label>
                <select
                  value={marketerFilter}
                  onChange={(e) => setMarketerFilter(e.target.value)}
                  aria-label="فیلتر بازاریاب در جستجو"
                  className="w-full h-8 px-2 bg-white dark:bg-[#222] border border-slate-200 dark:border-[#333] rounded-lg text-xs text-slate-800 dark:text-white focus:outline-none focus:border-[#1DB954]"
                >
                  <option value="all">همه همکاران</option>
                  {personnelList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Scrollable Results List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-[#242424]">
          {/* Recent Searches (when input empty & no filter active) */}
          {!rawQuery && statusFilter === 'all' && marketerFilter === 'all' && recentSearches.length > 0 && (
            <div className="p-3 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-[#888]">
                <span className="flex items-center gap-1.5 font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  <span>جستجوهای اخیر</span>
                </span>
                <button
                  type="button"
                  onClick={clearAllRecentSearches}
                  className="text-[10px] text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors cursor-pointer"
                >
                  پاک کردن تاریخچه
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {recentSearches.map((item) => (
                  <div
                    key={item}
                    onClick={() => handleInputChange(item)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#222] dark:hover:bg-[#2c2c2c] text-xs text-slate-700 dark:text-[#ddd] transition-colors cursor-pointer"
                  >
                    <span>{item}</span>
                    <button
                      type="button"
                      onClick={(e) => removeRecentSearch(item, e)}
                      className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
                      aria-label="حذف از تاریخچه"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* External Ownership Conflict Notice (Safe CRM duplicate indicator) */}
          {externalOwnerConflict?.matchedCustomer && (
            <div className="p-3 bg-amber-50/80 dark:bg-amber-950/25 border-b border-amber-200 dark:border-amber-800/50 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-0.5 min-w-0">
                <div className="font-bold text-amber-900 dark:text-amber-200">
                  این شماره در سیستم ثبت شده است
                </div>
                <div className="text-[11px] text-amber-800 dark:text-amber-300/90 leading-relaxed">
                  پرونده «{externalOwnerConflict.matchedCustomer.company_name}» هم‌اکنون در اختیار{' '}
                  <span className="font-bold">
                    {externalOwnerConflict.matchedCustomer.assigned_marketer_name || 'همکار دیگر'}
                  </span>{' '}
                  است ({formatStatusLabel(externalOwnerConflict.matchedCustomer.status)}).
                </div>
              </div>
            </div>
          )}

          {/* Section 1: Customers */}
          {showCustomers && matchedCustomers.length > 0 && (
            <div className="p-2">
              <div className="px-2 py-1 text-[11px] font-semibold text-slate-500 dark:text-[#888] flex items-center justify-between">
                <span>مشتریان و پرونده‌ها</span>
                {rawQuery && onApplyToCustomersList && (
                  <button
                    type="button"
                    onClick={() => {
                      recordRecentSearch(localInput);
                      closeAll();
                      onApplyToCustomersList(rawQuery, statusFilter !== 'all' ? statusFilter : undefined);
                    }}
                    className="text-[11px] text-emerald-600 dark:text-[#1DB954] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>نمایش در لیست مشتریان</span>
                    <ArrowUpLeft className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="space-y-0.5">
                {matchedCustomers.map((c) => {
                  const itemIdx = flatActionCursor++;
                  const isHighlighted = itemIdx === activeIndex;
                  const phones = getCustomerPhoneOptions(c);
                  const primaryPhone = phones[0]?.number || '';
                  const statusTheme = getStatusTheme(c.status);

                  return (
                    <div
                      key={c.id}
                      onClick={() => handleOpenCustomer(c)}
                      onMouseEnter={() => setActiveIndex(itemIdx)}
                      className={`group px-2.5 py-2 rounded-xl flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                        isHighlighted
                          ? 'bg-emerald-50 dark:bg-[#1DB954]/15'
                          : 'hover:bg-slate-100/80 dark:hover:bg-[#222222]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-[#242424] border border-slate-200 dark:border-[#333] flex items-center justify-center text-slate-700 dark:text-[#1DB954] shrink-0">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {c.company_name || c.manager_name || 'بدون نام'}
                            </span>
                            <span className={`text-[10px] font-semibold shrink-0 ${statusTheme.color}`}>
                              {formatStatusLabel(c.status)}
                            </span>
                          </div>

                          {/* Clean unboxed metadata with typographic separators */}
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-[#999] truncate mt-0.5">
                            {c.match_reason && (
                              <>
                                <span className="text-emerald-600 dark:text-[#1DB954] font-medium shrink-0">
                                  {c.match_reason}
                                </span>
                                <span aria-hidden="true">·</span>
                              </>
                            )}
                            {c.manager_name && (
                              <>
                                <span className="truncate">{c.manager_name}</span>
                                <span aria-hidden="true">·</span>
                              </>
                            )}
                            {c.city && (
                              <>
                                <span className="shrink-0">{c.city}</span>
                                <span aria-hidden="true">·</span>
                              </>
                            )}
                            {primaryPhone && (
                              <>
                                <span className="font-mono tabular-nums shrink-0" dir="ltr">
                                  {primaryPhone}
                                </span>
                                <span aria-hidden="true">·</span>
                              </>
                            )}
                            <span className="truncate">
                              {c.assigned_marketer_name || 'تخصیص نیافته'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Quick row actions */}
                      <div
                        className="flex items-center gap-1 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {primaryPhone && (
                          <a
                            href={`tel:${primaryPhone}`}
                            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-emerald-700 dark:bg-[#262626] dark:hover:bg-[#1DB954]/20 dark:text-[#bbb] dark:hover:text-[#1DB954] flex items-center justify-center transition-colors"
                            title={`تماس با ${primaryPhone}`}
                            aria-label="تماس تلفنی"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            recordRecentSearch(localInput);
                            closeAll();
                            onOpenAddReport(String(c.id));
                          }}
                          className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-emerald-700 dark:bg-[#262626] dark:hover:bg-[#1DB954]/20 dark:text-[#bbb] dark:hover:text-[#1DB954] flex items-center justify-center transition-colors cursor-pointer"
                          title="ثبت گزارش مذاکره"
                          aria-label="ثبت گزارش مذاکره"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 2: Free Pool Customers */}
          {showFreePool && matchedFreeCustomers.length > 0 && (
            <div className="p-2">
              <div className="px-2 py-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 flex items-center justify-between">
                <span>حوضچه مشتریان آزاد (قابل برداشت)</span>
                <button
                  type="button"
                  onClick={() => {
                    closeAll();
                    onNavigateToTab('free_customers');
                  }}
                  className="text-[11px] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>مشاهده حوضچه</span>
                  <ArrowUpLeft className="w-3 h-3" />
                </button>
              </div>

              <div className="space-y-0.5">
                {matchedFreeCustomers.map((c) => {
                  const itemIdx = flatActionCursor++;
                  const isHighlighted = itemIdx === activeIndex;
                  const phones = getCustomerPhoneOptions(c);
                  const primaryPhone = phones[0]?.number || '';

                  return (
                    <div
                      key={`free-${c.id}`}
                      onClick={() => handleOpenCustomer(c)}
                      onMouseEnter={() => setActiveIndex(itemIdx)}
                      className={`px-2.5 py-2 rounded-xl flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                        isHighlighted
                          ? 'bg-amber-50 dark:bg-amber-500/15'
                          : 'hover:bg-slate-100/80 dark:hover:bg-[#222222]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                          <Unlock className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {c.company_name || c.manager_name || 'پرونده آزاد'}
                            </span>
                            <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 shrink-0">
                              آزاد
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-[#999] truncate mt-0.5">
                            {c.city && (
                              <>
                                <span>{c.city}</span>
                                <span aria-hidden="true">·</span>
                              </>
                            )}
                            {primaryPhone && (
                              <>
                                <span className="font-mono tabular-nums" dir="ltr">
                                  {primaryPhone}
                                </span>
                                <span aria-hidden="true">·</span>
                              </>
                            )}
                            <span>{formatStatusLabel(c.status)}</span>
                          </div>
                        </div>
                      </div>
                      <ArrowUpLeft className="w-4 h-4 text-slate-400 shrink-0" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 3: Reports & Contracts */}
          {showReports && matchedReports.length > 0 && (
            <div className="p-2">
              <div className="px-2 py-1 text-[11px] font-semibold text-slate-500 dark:text-[#888]">
                گزارش‌های مذاکره و قراردادها
              </div>
              <div className="space-y-0.5">
                {matchedReports.map((r) => {
                  const itemIdx = flatActionCursor++;
                  const isHighlighted = itemIdx === activeIndex;
                  const isContract =
                    r.negotiation_status === 'قرارداد' ||
                    r.negotiation_status === 'قرارداد / فاکتور' ||
                    Boolean(r.contract_number);

                  return (
                    <div
                      key={`rep-${r.id}`}
                      onClick={() => handleOpenReportCustomer(r)}
                      onMouseEnter={() => setActiveIndex(itemIdx)}
                      className={`px-2.5 py-2 rounded-xl flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                        isHighlighted
                          ? 'bg-emerald-50 dark:bg-[#1DB954]/15'
                          : 'hover:bg-slate-100/80 dark:hover:bg-[#222222]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div
                          className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${
                            isContract
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-[#1DB954]/15 dark:border-[#1DB954]/30 dark:text-[#1DB954]'
                              : 'bg-slate-100 border-slate-200 text-slate-600 dark:bg-[#242424] dark:border-[#333] dark:text-[#aaa]'
                          }`}
                        >
                          {isContract ? <FileCheck2 className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {r.customer_name || r.customer_negotiator_name || 'گزارش مذاکره'}
                            </span>
                            {r.contract_number && (
                              <span className="text-[11px] font-mono tabular-nums text-emerald-700 dark:text-[#1DB954] font-semibold shrink-0">
                                #{toPersianDigits(r.contract_number)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-[#999] truncate mt-0.5">
                            {r.match_reason && (
                              <>
                                <span className="text-emerald-600 dark:text-[#1DB954] font-medium shrink-0">
                                  {r.match_reason}
                                </span>
                                <span aria-hidden="true">·</span>
                              </>
                            )}
                            {r.contract_amount ? (
                              <>
                                <span className="font-mono tabular-nums text-emerald-700 dark:text-[#1DB954] font-medium shrink-0">
                                  {formatToman(r.contract_amount)}
                                </span>
                                <span aria-hidden="true">·</span>
                              </>
                            ) : null}
                            <span className="truncate">{r.report_text || r.contract_items || '-'}</span>
                            <span aria-hidden="true">·</span>
                            <span className="shrink-0 tabular-nums">{formatDisplayDateOnly(r.date_created)}</span>
                          </div>
                        </div>
                      </div>
                      <ArrowUpLeft className="w-4 h-4 text-slate-400 shrink-0" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 3.5: Cold Leads (Deep Search) */}
          {showColdLeads && remoteColdLeads.length > 0 && (
            <div className="p-2">
              <div className="px-2 py-1 text-[11px] font-semibold text-slate-500 dark:text-[#888]">
                بانک شماره‌های اولیه (لیدهای سرد)
              </div>
              <div className="space-y-0.5">
                {remoteColdLeads.map((lead) => {
                  const itemIdx = flatActionCursor++;
                  const isHighlighted = itemIdx === activeIndex;

                  return (
                    <div
                      key={`lead-${lead.id}`}
                      onClick={() => handleOpenColdLead(lead)}
                      onMouseEnter={() => setActiveIndex(itemIdx)}
                      className={`px-2.5 py-2 rounded-xl flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                        isHighlighted
                          ? 'bg-emerald-50 dark:bg-[#1DB954]/15'
                          : 'hover:bg-slate-100/80 dark:hover:bg-[#222222]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-[#242424] border border-slate-200 dark:border-[#333] flex items-center justify-center text-emerald-600 dark:text-[#1DB954] shrink-0">
                          <PhoneCall className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {lead.contact_name || lead.phone_number}
                            </span>
                            <span className="text-[10px] font-medium text-slate-500 dark:text-[#aaa] shrink-0">
                              {lead.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-[#999] truncate mt-0.5">
                            <span className="font-mono tabular-nums shrink-0" dir="ltr">
                              {lead.phone_number}
                            </span>
                            {lead.source && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="truncate">{lead.source}</span>
                              </>
                            )}
                            {lead.assigned_to_name && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="truncate">{lead.assigned_to_name}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <ArrowUpLeft className="w-4 h-4 text-slate-400 shrink-0" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 3.8: Personnel (Admins / Managers only) */}
          {showPersonnel && remotePersonnel.length > 0 && (
            <div className="p-2">
              <div className="px-2 py-1 text-[11px] font-semibold text-slate-500 dark:text-[#888]">
                همکاران و کارشناسان (فیلتر پرونده‌ها)
              </div>
              <div className="space-y-0.5">
                {remotePersonnel.map((p) => {
                  const itemIdx = flatActionCursor++;
                  const isHighlighted = itemIdx === activeIndex;

                  return (
                    <div
                      key={`pers-${p.id}`}
                      onClick={() => handleOpenPersonnelFilter(p)}
                      onMouseEnter={() => setActiveIndex(itemIdx)}
                      className={`px-2.5 py-2 rounded-xl flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                        isHighlighted
                          ? 'bg-emerald-50 dark:bg-[#1DB954]/15'
                          : 'hover:bg-slate-100/80 dark:hover:bg-[#222222]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-[#242424] border border-slate-200 dark:border-[#333] flex items-center justify-center text-emerald-600 dark:text-[#1DB954] shrink-0">
                          <UserCheck className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {p.name}
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-[#888] truncate">
                            <span>فیلتر مشتریان این همکار</span>
                            {p.phone && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="font-mono tabular-nums" dir="ltr">
                                  {p.phone}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <ArrowUpLeft className="w-4 h-4 text-slate-400 shrink-0" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 4: Navigation Shortcuts */}
          {showNavigation && matchedNavigation.length > 0 && (
            <div className="p-2">
              <div className="px-2 py-1 text-[11px] font-semibold text-slate-500 dark:text-[#888] flex items-center gap-1.5">
                <Compass className="w-3 h-3" />
                <span>دسترسی سریع به بخش‌های سامانه</span>
              </div>
              <div className="space-y-0.5">
                {matchedNavigation.map((nav) => {
                  const itemIdx = flatActionCursor++;
                  const isHighlighted = itemIdx === activeIndex;
                  const NavIcon = nav.icon;

                  return (
                    <div
                      key={nav.id}
                      onClick={() => handleOpenNav(nav)}
                      onMouseEnter={() => setActiveIndex(itemIdx)}
                      className={`px-2.5 py-2 rounded-xl flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                        isHighlighted
                          ? 'bg-emerald-50 dark:bg-[#1DB954]/15'
                          : 'hover:bg-slate-100/80 dark:hover:bg-[#222222]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-[#242424] flex items-center justify-center text-slate-700 dark:text-[#1DB954] shrink-0">
                          <NavIcon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {nav.label}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-[#888] truncate">
                            {nav.subtitle}
                          </div>
                        </div>
                      </div>
                      <ArrowUpLeft className="w-4 h-4 text-slate-400 shrink-0" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty State */}
          {rawQuery.length >= 2 && totalResultsCount === 0 && !isSearchingRemote && !externalOwnerConflict && (
            <div className="p-6 text-center space-y-2">
              <div className="text-xs font-bold text-slate-700 dark:text-white">
                نتیجه‌ای برای «{rawQuery}» یافت نشد
              </div>
              <p className="text-[11px] text-slate-500 dark:text-[#888]">
                می‌توانید فیلترها را تغییر دهید یا مستقیماً این شماره/مشتری را ثبت کنید.
              </p>
            </div>
          )}

          {/* Quick-Add CTA when searching a new phone or non-conflicting query */}
          {rawQuery.length >= 2 && !externalOwnerConflict && (() => {
            const itemIdx = flatActionCursor++;
            const isHighlighted = itemIdx === activeIndex;
            return (
              <div className="p-2 bg-slate-50/70 dark:bg-[#141414]">
                <button
                  type="button"
                  onClick={handleQuickAddTrigger}
                  onMouseEnter={() => setActiveIndex(itemIdx)}
                  className={`w-full px-3 py-2.5 rounded-xl flex items-center justify-between gap-2 text-right transition-colors cursor-pointer border ${
                    isHighlighted
                      ? 'bg-emerald-50 border-emerald-300 dark:bg-[#1DB954]/15 dark:border-[#1DB954]/40'
                      : 'bg-white border-slate-200 hover:border-emerald-400 dark:bg-[#1c1c1c] dark:border-[#2c2c2c] dark:hover:border-[#1DB954]/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[#1DB954] text-black flex items-center justify-center shrink-0">
                      {isPhoneLikeQuery ? <PhoneCall className="w-4 h-4" /> : <Plus className="w-4 h-4 stroke-[2.5]" />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {isPhoneLikeQuery
                          ? `ثبت سریع مشتری با شماره ${normalizedPhoneDigits}`
                          : 'ثبت سریع مشتری جدید'}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-[#888] truncate">
                        باز کردن فرم افزودن سریع و بررسی خودکار تکراری نبودن
                      </div>
                    </div>
                  </div>
                  <ArrowUpLeft className="w-4 h-4 text-emerald-600 dark:text-[#1DB954] shrink-0" />
                </button>
              </div>
            );
          })()}
        </div>

        {/* Footer keyboard hints */}
        <div className="hidden sm:flex items-center justify-between px-3 py-2 border-t border-slate-200 dark:border-[#282828] bg-slate-50 dark:bg-[#121212] text-[10px] text-slate-500 dark:text-[#777] shrink-0">
          <div className="flex items-center gap-3">
            <span>↑↓ جابجایی</span>
            <span>Enter انتخاب</span>
            <span>Esc بستن</span>
          </div>
          {isSearchingRemote ? (
            <span className="flex items-center gap-1 text-emerald-600 dark:text-[#1DB954]">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>جستجو در کل پایگاه داده...</span>
            </span>
          ) : (
            <span className="tabular-nums">
              {rawQuery
                ? `${toPersianDigits(totalResultsCount)} نتیجه`
                : 'جستجو در مشتریان، قراردادها و منوها'}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop Header Search Input & Floating Popover */}
      <div ref={containerRef} className="hidden lg:block relative flex-1 max-w-xl mx-2">
        <div
          className={`flex items-center h-10 px-3 rounded-xl border transition-all ${
            isDesktopOpen
              ? 'bg-white dark:bg-[#1c1c1c] border-emerald-500 dark:border-[#1DB954] ring-2 ring-emerald-500/15 dark:ring-[#1DB954]/15'
              : 'bg-slate-100 hover:bg-slate-200/70 dark:bg-[#1b1b1b] dark:hover:bg-[#222222] border-slate-200 dark:border-[#2a2a2a]'
          }`}
        >
          <Search className="w-4 h-4 text-slate-400 dark:text-[#888] shrink-0 ml-2" />
          <input
            ref={desktopInputRef}
            type="text"
            value={localInput}
            onFocus={() => setIsDesktopOpen(true)}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="جستجوی مشتری، شماره تماس، کد قرارداد یا بخش‌ها..."
            aria-label="جستجوی پیشرفته سراسری"
            className="w-full bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#777] focus:outline-none"
          />

          <div className="flex items-center gap-1.5 shrink-0 mr-1">
            {isSearchingRemote && (
              <Loader2 className="w-3.5 h-3.5 text-emerald-600 dark:text-[#1DB954] animate-spin" />
            )}
            {localInput ? (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-[#2c2c2c] transition-colors cursor-pointer"
                aria-label="پاک کردن جستجو"
                title="پاک کردن"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <kbd
                className="hidden xl:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 dark:text-[#777] bg-white/80 dark:bg-[#262626] border border-slate-200 dark:border-[#333] rounded-md"
                dir="ltr"
              >
                Ctrl+K
              </kbd>
            )}
          </div>
        </div>

        {/* Desktop Floating Command Popover */}
        {isDesktopOpen && (
          <div className="absolute top-12 right-0 w-full min-w-[480px] bg-white dark:bg-[#181818] border border-slate-200 dark:border-[#2e2e2e] rounded-2xl shadow-2xl shadow-slate-900/15 dark:shadow-black/80 z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
            {renderPanelContent()}
          </div>
        )}
      </div>

      {/* Mobile / Tablet Compact Search Trigger Button */}
      <div className="lg:hidden flex items-center">
        <button
          type="button"
          onClick={() => setIsMobileOpen(true)}
          className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1e1e1e] dark:hover:bg-[#282828] text-slate-700 dark:text-white border border-slate-200 dark:border-[#2e2e2e] flex items-center justify-center transition-colors cursor-pointer"
          aria-label="جستجوی پیشرفته"
          title="جستجو"
        >
          <Search className="w-4 h-4 text-emerald-600 dark:text-[#1DB954]" />
        </button>
      </div>

      {/* Mobile / Tablet Full-Screen Responsive Search Overlay */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-white dark:bg-[#121212] flex flex-col animate-in fade-in duration-150">
          {/* Mobile Search Top Bar */}
          <div className="p-3 border-b border-slate-200 dark:border-[#282828] flex items-center gap-2 bg-white dark:bg-[#121212] shrink-0">
            <div className="flex-1 flex items-center h-11 px-3 rounded-xl bg-slate-100 dark:bg-[#1e1e1e] border border-slate-200 dark:border-[#333] focus-within:border-[#1DB954]">
              <Search className="w-4 h-4 text-emerald-600 dark:text-[#1DB954] shrink-0 ml-2" />
              <input
                ref={mobileInputRef}
                type="text"
                value={localInput}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="نام مشتری، موبایل، قرارداد..."
                aria-label="جستجوی پیشرفته موبایل"
                className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#777] focus:outline-none"
              />
              {isSearchingRemote && (
                <Loader2 className="w-4 h-4 text-emerald-600 dark:text-[#1DB954] animate-spin shrink-0 ml-1" />
              )}
              {localInput && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                  aria-label="پاک کردن"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={closeAll}
              className="h-11 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#222] dark:hover:bg-[#2c2c2c] text-xs font-bold text-slate-700 dark:text-white transition-colors shrink-0 cursor-pointer"
            >
              بستن
            </button>
          </div>

          {/* Mobile Search Results Area */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {renderPanelContent()}
          </div>
        </div>
      )}
    </>
  );
};
