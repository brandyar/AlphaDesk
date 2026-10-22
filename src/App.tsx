import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  Users,
  Unlock,
  MessageSquareText,
  PhoneCall,
  ClipboardCheck,
  BarChart3,
  User,
  CheckCircle,
  AlertCircle,
  Info,
  X,
  Building2,
  Plus,
  Edit2,
} from 'lucide-react';
import { Sidebar, NavTab } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { CustomersView } from './components/CustomersView';
import { FreeCustomersView } from './components/FreeCustomersView';
import { ReportsView } from './components/ReportsView';
import { AnalyticsView } from './components/AnalyticsView';
import { ColdLeadsView } from './components/ColdLeadsView';
import { AdminReportsView } from './components/AdminReportsView';
import { PersonalPortalView, PortalTab } from './components/PersonalPortalView';
import { TeamManagementView } from './components/TeamManagementView';
import { CustomerModal } from './components/CustomerModal';
import { CustomerDetailModal } from './components/CustomerDetailModal';
import { AddReportModal } from './components/AddReportModal';
import { AddColdLeadModal } from './components/AddColdLeadModal';
import { MergeCustomersModal } from './components/MergeCustomersModal';
import { AuthModal } from './components/AuthModal';
import { TenantsManagementModal } from './components/TenantsManagementModal';
import { TenantsManagementView } from './components/TenantsManagementView';
import { ErrorBoundary } from './components/ErrorBoundary';

import {
  Customer,
  CustomerContact,
  CustomerReport,
  ColdLead,
  AdministrativeReport,
  Personnel,
  BffStatus,
  LeadStatus,
  AuthUser,
  AuthResponse,
  LeaveRequest,
  SalaryAdvanceRequest,
  RequestStatus,
  UserProfileUpdatePayload,
  PasswordChangePayload,
  TeamSubTab,
  CreateColleaguePayload,
  Tenant,
} from './types';

import {
  fetchCustomers,
  fetchCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  reassignCustomer,
  claimFreeCustomer,
  mergeCustomers,
  createCustomerContact,
  fetchCustomerReports,
  createCustomerReport,
  fetchColdLeads,
  createColdLead,
  updateColdLead,
  bulkAssignColdLeads,
  deleteColdLead,
  convertColdLead,
  fetchAdminReports,
  createAdminReport,
  updateAdminReport,
  fetchPersonnel,
  createPersonnel,
  updatePersonnel,
  deletePersonnel,
  bulkExtendOwnership,
  bulkSwitchOwnership,
  fetchBffStatus,
  setApiPersonnelContext,
  getStoredAuthSession,
  saveAuthSession,
  logoutUser,
  logoutAllUsers,
  fetchLeaveRequests,
  createLeaveRequest,
  updateLeaveRequestStatus,
  deleteLeaveRequest,
  fetchAdvanceRequests,
  createAdvanceRequest,
  updateAdvanceRequestStatus,
  deleteAdvanceRequest,
  updateUserProfile,
  uploadAvatar,
  changeUserPassword,
  fetchTenants,
  getActiveTenantId,
  setActiveTenantId,
  fetchDashboardSummary,
  DashboardSummary,
  getMe,
} from './api';
import { matchPersonnelToCustomer, matchPersonnelToReport } from './utils';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Authentication State
  const initialSession = getStoredAuthSession();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(initialSession.user);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const isSavingCustomerRef = useRef(false);

  // Toast Notifications
  const [toast, setToast] = useState<{ id: number; message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now();
    setToast({ id, message, type });
    setTimeout(() => {
      setToast((curr) => (curr?.id === id ? null : curr));
    }, 4500);
  };

  // Core Data State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [reports, setReports] = useState<CustomerReport[]>([]);
  const [coldLeads, setColdLeads] = useState<ColdLead[]>([]);
  const [adminReports, setAdminReports] = useState<AdministrativeReport[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [advanceRequests, setAdvanceRequests] = useState<SalaryAdvanceRequest[]>([]);
  const [portalSubTab, setPortalSubTab] = useState<PortalTab>('profile');
  const [teamSubTab, setTeamSubTab] = useState<TeamSubTab>('colleagues_list');
  const [personnelList, setPersonnelList] = useState<Personnel[]>([]);
  const [currentPersonnel, setCurrentPersonnel] = useState<Personnel | null>(initialSession.personnel);
  const [bffStatus, setBffStatus] = useState<BffStatus | null>(null);
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(null);

  // Multi-Tenancy State
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [activeTenantId, setActiveTenantIdState] = useState<string>(() => getActiveTenantId() || 'all');
  const [isTenantsModalOpen, setIsTenantsModalOpen] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMarketerId, setSelectedMarketerId] = useState<string>('همه');
  const [statusFilter, setStatusFilter] = useState<string>('همه');
  const [showExpiredOnly, setShowExpiredOnly] = useState(false);

  // Modals State
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isAddReportModalOpen, setIsAddReportModalOpen] = useState(false);
  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);
  const [reportPreselectedCustomerId, setReportPreselectedCustomerId] = useState<string | undefined>(undefined);
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [mergeInitialCustomerIds, setMergeInitialCustomerIds] = useState<string[]>([]);

  // Pre-fill state when converting a lead
  const [prefilledLeadPhone, setPrefilledLeadPhone] = useState('');
  const [prefilledLeadName, setPrefilledLeadName] = useState('');
  const [prefilledLeadNotes, setPrefilledLeadNotes] = useState('');

  const [loading, setLoading] = useState(true);

  // Load and refresh tenants
  const loadTenants = async () => {
    try {
      const data = await fetchTenants();
      setTenants(data);
    } catch (err) {
      console.warn('Failed to load tenants:', err);
    }
  };

  const isCurrentUserAdmin = Boolean(
    currentPersonnel
      ? currentPersonnel.role === 'admin' || currentPersonnel.role === 'sales_manager'
      : currentUser?.is_admin ||
        currentUser?.app_role === 'admin' ||
        currentUser?.app_role === 'sales_manager'
  );

  const canAccessTenantsTab =
    isCurrentUserAdmin ||
    (currentPersonnel?.permissions?.can_manage_tenants ?? false) ||
    (currentPersonnel?.permissions?.allowed_menus?.includes('tenants') ?? false);

  const handleSelectTenant = (tenantId: string) => {
    if (!isCurrentUserAdmin && tenantId === 'all') {
      showToast('مشاهده تجمیعی همه سازمان‌ها فقط برای مدیر سیستم مجاز است.', 'error');
      return;
    }
    setActiveTenantId(tenantId);
    setActiveTenantIdState(tenantId);
    const target = tenants.find((t) => String(t.id) === String(tenantId));
    const name = tenantId === 'all' ? 'همه سازمان‌ها (تجمیعی)' : target?.name || 'سازمان منتخب';
    showToast(`سازمان فعال: ${name}`, 'info');
    setDashboardSummary(null);
    loadAllData(currentPersonnel, currentUser);
  };

  // Versioned fetch token to cancel stale concurrent requests cleanly
  const fetchVersionRef = useRef(0);

  // Initial & Reactive Data Load with intelligent user-scoped querying and caching
  const loadAllData = async (activeP?: Personnel | null, activeUser?: AuthUser | null) => {
    const currentVersion = ++fetchVersionRef.current;
    setLoading(true);

    try {
      const targetUser = activeUser !== undefined ? activeUser : currentUser;
      const targetPContext = activeP !== undefined ? activeP : currentPersonnel;

      // 1. Fetch Core Metadata (personnel, tenants, status, summary, leave & advance requests, customers, reports)
      const [pData, tData, bStatus, dSummary, lData, aData, cData, rData] = await Promise.all([
        fetchPersonnel().catch(() => []),
        fetchTenants().catch(() => []),
        fetchBffStatus().catch(() => null),
        fetchDashboardSummary().catch(() => null),
        fetchLeaveRequests().catch(() => []),
        fetchAdvanceRequests().catch(() => []),
        fetchCustomers({ all: true }).catch(() => []),
        fetchCustomerReports().catch(() => []),
      ]);

      // If a newer fetch was started (e.g. user switched tenant or logged in), discard stale results
      if (currentVersion !== fetchVersionRef.current) return;

      setPersonnelList(pData);
      setTenants(tData);
      setBffStatus(bStatus);
      if (dSummary) setDashboardSummary(dSummary);
      if (Array.isArray(lData)) setLeaveRequests(lData);
      if (Array.isArray(aData)) setAdvanceRequests(aData);
      if (Array.isArray(cData)) setCustomers(cData);
      if (Array.isArray(rData)) setReports(rData);

      // Accurately match logged-in user to their specific personnel record
      let targetPersonnel = activeP !== undefined ? activeP : null;
      if (!targetPersonnel && targetUser) {
        targetPersonnel = pData.find(
          (p) =>
            (targetUser.email && p.email?.toLowerCase() === targetUser.email?.toLowerCase()) ||
            (targetUser.id && (p.id === targetUser.id || p.user_id === targetUser.id))
        ) || null;
      }
      if (!targetPersonnel && currentPersonnel) {
        targetPersonnel = pData.find((p) => p.id === currentPersonnel.id) || currentPersonnel;
      }

      if (targetPersonnel) {
        setCurrentPersonnel(targetPersonnel);
        setApiPersonnelContext(targetPersonnel);

        // For non-admin, auto-correct active tenant if they don't have access to 'all' or selected tenant
        const isUserAdmin = Boolean(
          targetPersonnel
            ? targetPersonnel.role === 'admin' || targetPersonnel.role === 'sales_manager'
            : targetUser?.is_admin ||
              targetUser?.app_role === 'admin' ||
              targetUser?.app_role === 'sales_manager'
        );

        if (!isUserAdmin) {
          const userAllowed =
            targetPersonnel.allowed_tenant_ids ||
            targetPersonnel.permissions?.allowed_tenant_ids;
          const currentActive = getActiveTenantId();
          const fallback =
            userAllowed && userAllowed.length > 0
              ? String(userAllowed[0])
              : targetPersonnel.tenant_id
              ? String(targetPersonnel.tenant_id)
              : 'default';

          if (
            currentActive === 'all' ||
            (userAllowed && userAllowed.length > 0 && !userAllowed.some((id) => String(id) === currentActive))
          ) {
            setActiveTenantId(fallback);
            setActiveTenantIdState(fallback);
          }
        }
      }

      // Core load finished: release loading spinner immediately for instant responsiveness!
      setLoading(false);
    } catch (e) {
      console.error('Error loading data:', e);
    } finally {
      if (currentVersion === fetchVersionRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    // Verify & refresh user session and roles dynamically from server on mount
    const stored = getStoredAuthSession();
    if (stored.token || stored.user) {
      getMe()
        .then((data) => {
          if (data && data.user) {
            setCurrentUser(data.user);
            if (data.personnel) {
              setCurrentPersonnel(data.personnel);
              setApiPersonnelContext(data.personnel);
            }
            saveAuthSession({
              success: true,
              access_token: stored.token || 'verified',
              user: data.user,
              personnel: data.personnel || stored.personnel,
            });
          }
        })
        .catch(() => {});
    }

    loadAllData();

    // Lightweight status refresh every 45 seconds (does NOT spam large datasets)
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchBffStatus().then(setBffStatus).catch(() => {});
      }
    }, 45000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchBffStatus().then(setBffStatus).catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleSelectPersonnel = (p: Personnel | null) => {
    setCurrentPersonnel(p);
    setApiPersonnelContext(p);
    setCustomers([]);
    setReports([]);
    setLoading(true);
    loadAllData(p, currentUser);
  };

  const handleAuthSuccess = (authData: AuthResponse) => {
    // 1. Immediately reset data state so previous session or full data is cleared instantly
    setCustomers([]);
    setReports([]);
    setColdLeads([]);
    setAdminReports([]);
    setDashboardSummary(null);
    setLoading(true);

    // 2. Set user and personnel context
    setCurrentUser(authData.user);
    if (authData.personnel) {
      setCurrentPersonnel(authData.personnel);
      setApiPersonnelContext(authData.personnel);

      // Auto-set active tenant for personnel
      if (!authData.user.is_admin && authData.personnel.tenant_id) {
        const pTenant = String(authData.personnel.tenant_id);
        setActiveTenantId(pTenant);
        setActiveTenantIdState(pTenant);
      }
    }
    showToast(`خوش آمدید ${authData.user.name} (${authData.user.is_admin ? 'مدیر سیستم' : 'کارشناس فروش'})`, 'success');
    loadAllData(authData.personnel, authData.user);
  };

  useEffect(() => {
    const handleForceLogoutEvent = (e: any) => {
      const msg = e.detail?.message || 'نشست کاری شما لغو شده است.';
      setCurrentUser(null);
      setCurrentPersonnel(null);
      setApiPersonnelContext(null);
      setCustomers([]);
      setReports([]);
      setColdLeads([]);
      setAdminReports([]);
      setDashboardSummary(null);
      setIsAuthModalOpen(true);
      showToast(msg, 'error');
    };
    window.addEventListener('crm_force_logout', handleForceLogoutEvent);
    return () => window.removeEventListener('crm_force_logout', handleForceLogoutEvent);
  }, []);

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
    setCurrentPersonnel(null);
    setApiPersonnelContext(null);
    setCustomers([]);
    setReports([]);
    setColdLeads([]);
    setAdminReports([]);
    setDashboardSummary(null);
    showToast('از حساب کاربری خود خارج شدید.', 'info');
    loadAllData(null, null);
  };

  const handleLogoutAllUsers = async () => {
    try {
      const res = await logoutAllUsers();
      showToast(res.message || 'تمامی کاربران با موفقیت از سامانه خارج شدند.', 'success');
      handleLogout();
    } catch (err: any) {
      showToast(err.message || 'خطا در خروج همگانی کاربران', 'error');
    }
  };

  // Strictly user-scoped customers: if non-admin, strictly restrict to this marketer's portfolio
  const userScopedCustomers = React.useMemo(() => {
    if (!currentUser) return [];
    if (isCurrentUserAdmin) return customers;

    return customers.filter((c) => matchPersonnelToCustomer(c, currentPersonnel, currentUser));
  }, [customers, isCurrentUserAdmin, currentPersonnel, currentUser]);

  // Strictly user-scoped reports: if non-admin, strictly restrict to this marketer's reports
  const userScopedReports = React.useMemo(() => {
    if (!currentUser) return [];
    if (isCurrentUserAdmin) return reports;

    return reports.filter((r) => matchPersonnelToReport(r, currentPersonnel, currentUser));
  }, [reports, isCurrentUserAdmin, currentPersonnel, currentUser]);

  // Filter customers for current view
  const filteredCustomers = React.useMemo(() => {
    return userScopedCustomers.filter((c) => {
      if (!c) return false;
      if (showExpiredOnly && !c.is_expired) return false;
      if (isCurrentUserAdmin && selectedMarketerId !== 'همه' && c.assigned_marketer_id !== selectedMarketerId) return false;
      if (statusFilter !== 'همه') {
        if (statusFilter === 'قرارداد' || statusFilter === 'قرارداد / فاکتور') {
          const stStr = String(c.status);
          const isContract = stStr === 'قرارداد' || stStr === 'قرارداد / فاکتور' || stStr === 'قرارداد/فاکتور';
          if (!isContract) return false;
        } else if (c.status !== statusFilter) {
          return false;
        }
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCompany = c.company_name?.toLowerCase().includes(q);
        const matchManager = c.manager_name?.toLowerCase().includes(q);
        const matchCity = c.city?.toLowerCase().includes(q);
        const matchJob = c.business_type?.toLowerCase().includes(q);
        const matchPhone = Array.isArray(c.mobile_numbers) && c.mobile_numbers.some((m) => m && m.includes(q));
        const matchContact = Array.isArray(c.contacts) && c.contacts.some(
          (ct) =>
            (ct?.value && ct.value.toLowerCase().includes(q)) ||
            (ct?.contact_name && ct.contact_name.toLowerCase().includes(q)) ||
            (ct?.contact_role && ct.contact_role.toLowerCase().includes(q))
        );
        if (!matchCompany && !matchManager && !matchCity && !matchJob && !matchPhone && !matchContact) return false;
      }
      return true;
    });
  }, [userScopedCustomers, showExpiredOnly, isCurrentUserAdmin, selectedMarketerId, statusFilter, searchQuery]);

  const expiredCount = userScopedCustomers.filter((c) => c.is_expired).length;

  const freeCustomersCount = customers.filter((c) => {
    if (c.status === 'قرارداد' || c.status === 'لیست سیاه') return false;
    const isUnassigned = !c.assigned_marketer_id || c.assigned_marketer_name === 'تخصیص نیافته';
    const isDeadlinePassed = Boolean(
      c.assignment_deadline && new Date().getTime() > new Date(c.assignment_deadline).getTime()
    );
    return Boolean(c.is_expired || isDeadlinePassed || isUnassigned);
  }).length;

  // Handlers for Customer Operations
  const handleSaveCustomer = async (
    customerData: Partial<Customer> & { assignment_duration_days?: number }
  ) => {
    if (isSavingCustomerRef.current) return;
    isSavingCustomerRef.current = true;
    try {
      if (editingCustomer) {
        const updated = await updateCustomer(editingCustomer.id, customerData);
        setCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        if (selectedCustomer?.id === updated.id) {
          setSelectedCustomer(updated);
        }
        showToast('پرونده و شماره‌های مشتری با موفقیت ذخیره شدند.', 'success');
      } else {
        const created = await createCustomer(customerData);
        setCustomers((prev) => {
          const filtered = prev.filter((c) => c.id !== created.id);
          return [created, ...filtered];
        });

        // If created from a lead, mark lead as converted
        if (prefilledLeadPhone) {
          const lead = coldLeads.find((l) => l.phone_number === prefilledLeadPhone);
          if (lead) {
            await updateColdLead(lead.id, {
              status: 'تبدیل شده به مشتری',
              converted_customer_id: created.id,
            }).catch(() => {});
            setColdLeads((prev) =>
              prev.map((l) =>
                l.id === lead.id
                  ? { ...l, status: 'تبدیل شده به مشتری', converted_customer_id: created.id }
                  : l
              )
            );
          }
        }
        showToast('پرونده مشتری جدید با موفقیت در سامانه ثبت شد.', 'success');
      }
      setIsCustomerModalOpen(false);
      setEditingCustomer(null);
      setPrefilledLeadPhone('');
      setPrefilledLeadName('');
      setPrefilledLeadNotes('');

      // Synchronize latest state
      const savedCustomer = editingCustomer ? (editingCustomer.id ? { ...editingCustomer, ...customerData } : null) : null;
      window.dispatchEvent(new CustomEvent('crm_customer_saved', { detail: savedCustomer || customerData }));
      fetchDashboardSummary().then(setDashboardSummary).catch(() => {});
      fetchBffStatus().then(setBffStatus).catch(() => {});
    } catch (err: any) {
      showToast(err.message || 'خطا در ذخیره‌سازی اطلاعات مشتری', 'error');
      throw err;
    } finally {
      isSavingCustomerRef.current = false;
    }
  };

  const handleAddCustomerContact = async (contactData: Partial<CustomerContact>) => {
    try {
      const created = await createCustomerContact(contactData);
      if (contactData.customer_id) {
        const updated = await fetchCustomerById(contactData.customer_id);
        setCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        if (selectedCustomer?.id === updated.id) {
          setSelectedCustomer(updated);
        }
      }
      showToast(`شماره تماس «${created.value}» با موفقیت افزوده شد.`, 'success');
    } catch (err: any) {
      showToast(err.message || 'خطا در ثبت شماره تماس', 'error');
      throw err;
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    try {
      await deleteCustomer(id);
      setCustomers((prev) => prev.filter((c) => c.id !== id));
      setReports((prev) => prev.filter((r) => r.customer_id !== id));
      setSelectedCustomer(null);
      fetchBffStatus().then(setBffStatus).catch(() => {});
      showToast('پرونده مشتری با موفقیت حذف شد.', 'info');
    } catch (err: any) {
      showToast('خطا در حذف پرونده مشتری: ' + (err.message || 'خطای نامشخص'), 'error');
    }
  };

  const handleReassignCustomer = async (
    customerId: string,
    marketerId: string,
    marketerName: string,
    days: number
  ) => {
    try {
      const updated = await reassignCustomer(customerId, marketerId, marketerName, days);
      setCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setSelectedCustomer(updated);
      window.dispatchEvent(new CustomEvent('crm_customer_saved', { detail: updated }));
      fetchDashboardSummary().then(setDashboardSummary).catch(() => {});
      fetchBffStatus().then(setBffStatus).catch(() => {});
      showToast('مشتری با موفقیت به بازاریاب جدید واگذار شد.', 'success');
    } catch (err: any) {
      showToast('خطا در واگذاری مجدد مشتری: ' + (err.message || 'خطای نامشخص'), 'error');
    }
  };

  const handleClaimCustomer = async (customerId: string, durationDays: number): Promise<boolean> => {
    try {
      const res = await claimFreeCustomer(customerId, {
        personnel_id: currentPersonnel?.id || currentUser?.id,
        personnel_name: currentPersonnel?.name || currentUser?.name,
        duration_days: durationDays,
      });

      if (res && res.customer) {
        setCustomers((prev) => prev.map((c) => (c.id === res.customer.id ? res.customer : c)));
        window.dispatchEvent(new CustomEvent('crm_customer_saved', { detail: res.customer }));
        fetchDashboardSummary().then(setDashboardSummary).catch(() => {});
        fetchBffStatus().then(setBffStatus).catch(() => {});
        showToast(res.message || 'پرونده با موفقیت به شما اختصاص یافت.', 'success');
        return true;
      }
      return false;
    } catch (err: any) {
      showToast(err.message || 'خطا در اختصاص پرونده آزاد', 'error');
      return false;
    }
  };

  const handleMergeCustomers = async (
    primaryCustomerId: string,
    mergedCustomerIds: string[],
    assignedMarketerId?: string,
    assignedMarketerName?: string,
    notes?: string
  ) => {
    try {
      const res = await mergeCustomers(
        primaryCustomerId,
        mergedCustomerIds,
        assignedMarketerId,
        assignedMarketerName,
        notes
      );
      showToast(res.message || 'پرونده‌های مشتری با موفقیت ادغام شدند.', 'success');
      await loadAllData();
      setIsMergeModalOpen(false);
      setMergeInitialCustomerIds([]);
      if (selectedCustomer) {
        setSelectedCustomer(null);
      }
    } catch (err: any) {
      showToast('خطا در ادغام پرونده‌های مشتریان: ' + (err.message || 'خطای نامشخص'), 'error');
      throw err;
    }
  };

  // Handlers for Customer Follow-up Reports
  const handleAddCustomerReport = async (reportData: Partial<CustomerReport>) => {
    try {
      const created = await createCustomerReport(reportData);
      setReports((prev) => [created, ...prev]);

      // Refresh customer list to get updated status and followup date
      const updatedCustomer = await fetchCustomerById(reportData.customer_id!).catch(() => null);
      if (updatedCustomer) {
        setCustomers((prev) => prev.map((c) => (c.id === updatedCustomer.id ? updatedCustomer : c)));
        if (selectedCustomer?.id === updatedCustomer.id) {
          setSelectedCustomer(updatedCustomer);
        }
        window.dispatchEvent(new CustomEvent('crm_customer_saved', { detail: updatedCustomer }));
      }
      window.dispatchEvent(new CustomEvent('crm_report_saved', { detail: created }));
      fetchDashboardSummary().then(setDashboardSummary).catch(() => {});
      fetchBffStatus().then(setBffStatus).catch(() => {});
      showToast('گزارش پیگیری با موفقیت در سامانه ثبت شد.', 'success');
    } catch (err: any) {
      showToast('خطا در ثبت گزارش مذاکره: ' + (err.message || 'خطای نامشخص'), 'error');
    }
  };

  // Handlers for Cold Leads
  const handleAddColdLead = async (leadData: Partial<ColdLead>) => {
    try {
      const created = await createColdLead(leadData);
      setColdLeads((prev) => [created, ...prev]);
      fetchBffStatus().then(setBffStatus).catch(() => {});
      showToast('شماره جدید به بانک لید اولیه افزوده شد.', 'success');
    } catch (err: any) {
      showToast('خطا در ثبت شماره: ' + (err.message || 'خطای نامشخص'), 'error');
    }
  };

  const handleUpdateLeadStatus = async (leadId: string, status: LeadStatus) => {
    try {
      const updated = await updateColdLead(leadId, { status });
      setColdLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
      fetchBffStatus().then(setBffStatus).catch(() => {});
      showToast('وضعیت لید بروزرسانی شد.', 'success');
    } catch (err: any) {
      showToast('خطا در بروزرسانی وضعیت لید: ' + (err.message || 'خطای نامشخص'), 'error');
    }
  };

  const handleUpdateLeadAssignedTo = async (leadId: string, assignedToId: string) => {
    try {
      const updated = await updateColdLead(leadId, { assigned_to: assignedToId });
      setColdLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
      fetchBffStatus().then(setBffStatus).catch(() => {});
    } catch (err: any) {
      showToast('خطا در تغییر بازاریاب لید: ' + (err.message || 'خطای نامشخص'), 'error');
    }
  };

  const handleBulkAssignLeads = async (leadIds: string[], targetMarketerId: string) => {
    await bulkAssignColdLeads(leadIds, targetMarketerId);
    const refreshed = await fetchColdLeads();
    setColdLeads(refreshed);
    fetchBffStatus().then(setBffStatus).catch(() => {});
  };

  const handleDeleteLead = async (leadId: string) => {
    await deleteColdLead(leadId);
    setColdLeads((prev) => prev.filter((l) => l.id !== leadId));
    fetchBffStatus().then(setBffStatus).catch(() => {});
  };

  const handleConvertToCustomer = (lead: ColdLead) => {
    setPrefilledLeadPhone(lead.phone_number);
    setPrefilledLeadName(lead.contact_name || '');
    setPrefilledLeadNotes(`لید اولیه از ${lead.source}. یادداشت: ${lead.notes || 'ندارد'}`);
    setEditingCustomer(null);
    setIsCustomerModalOpen(true);
  };

  // Handler for Daily Admin Reports (Create or Edit)
  const handleSubmitAdminReport = async (reportData: Partial<AdministrativeReport>) => {
    try {
      if (reportData.id) {
        const updated = await updateAdminReport(reportData.id, reportData);
        setAdminReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
        showToast('گزارش عملکرد اداری با موفقیت بروزرسانی شد.', 'success');
      } else {
        const created = await createAdminReport(reportData);
        setAdminReports((prev) => [created, ...prev]);
        showToast('گزارش عملکرد اداری با موفقیت ثبت شد.', 'success');
      }
      fetchBffStatus().then(setBffStatus).catch(() => {});
    } catch (err: any) {
      showToast('خطا در ثبت/ویرایش گزارش اداری: ' + (err.message || 'خطای نامشخص'), 'error');
      throw err;
    }
  };

  // Handlers for Personal Portal (Leave, Advance, Profile)
  const handleCreateLeaveRequest = async (payload: Partial<LeaveRequest>) => {
    const created = await createLeaveRequest(payload);
    setLeaveRequests((prev) => [created, ...prev]);
  };

  const handleUpdateLeaveStatus = async (id: string, status: RequestStatus, managerNote?: string) => {
    const updated = await updateLeaveRequestStatus(id, status, managerNote);
    setLeaveRequests((prev) => prev.map((r) => (r.id === id ? updated : r)));
  };

  const handleDeleteLeaveRequest = async (id: string) => {
    await deleteLeaveRequest(id);
    setLeaveRequests((prev) => prev.filter((r) => r.id !== id));
    showToast('درخواست مرخصی با موفقیت حذف شد.', 'info');
  };

  const handleCreateAdvanceRequest = async (payload: Partial<SalaryAdvanceRequest>) => {
    const created = await createAdvanceRequest(payload);
    setAdvanceRequests((prev) => [created, ...prev]);
  };

  const handleUpdateAdvanceStatus = async (
    id: string,
    status: RequestStatus,
    approvedAmount?: number,
    managerNote?: string
  ) => {
    const updated = await updateAdvanceRequestStatus(id, status, approvedAmount, managerNote);
    setAdvanceRequests((prev) => prev.map((r) => (r.id === id ? updated : r)));
  };

  const handleDeleteAdvanceRequest = async (id: string) => {
    await deleteAdvanceRequest(id);
    setAdvanceRequests((prev) => prev.filter((r) => r.id !== id));
    showToast('درخواست مساعده با موفقیت حذف شد.', 'info');
  };

  const handleUpdateProfile = async (payload: UserProfileUpdatePayload) => {
    const res = await updateUserProfile(payload);
    if (res.personnel) {
      setCurrentPersonnel(res.personnel);
      setApiPersonnelContext(res.personnel);
      if (currentUser) {
        const updatedUser = {
          ...currentUser,
          name: res.personnel.name || currentUser.name,
        };
        setCurrentUser(updatedUser);
        saveAuthSession({
          success: true,
          access_token: getStoredAuthSession().token,
          user: updatedUser,
          personnel: res.personnel,
        });
      }
      setPersonnelList((prev) =>
        prev.map((p) => (p.id === res.personnel.id ? { ...p, ...res.personnel } : p))
      );
    }
  };

  const handleChangePassword = async (payload: PasswordChangePayload) => {
    await changeUserPassword(payload);
  };

  // Colleague & Ownership Handlers
  const handleCreatePersonnel = async (payload: CreateColleaguePayload) => {
    const created = await createPersonnel(payload);
    setPersonnelList((prev) => [...prev, created]);
  };

  const handleUpdatePersonnel = async (id: string, payload: Partial<Personnel>) => {
    const updated = await updatePersonnel(id, payload);
    setPersonnelList((prev) => prev.map((p) => (p.id === id ? updated : p)));
    if (currentPersonnel?.id === id) {
      setCurrentPersonnel(updated);
    }
  };

  const handleDeletePersonnel = async (id: string) => {
    await deletePersonnel(id);
    setPersonnelList((prev) => prev.filter((p) => p.id !== id));
  };

  const handleBulkExtendOwnership = async (customerIds: string[], days: number) => {
    await bulkExtendOwnership(customerIds, days);
    const refreshed = await fetchCustomers();
    setCustomers(refreshed);
  };

  const handleBulkSwitchOwnership = async (
    customerIds: string[],
    targetPersonnelId: string,
    targetPersonnelName: string,
    days: number
  ) => {
    await bulkSwitchOwnership(customerIds, targetPersonnelId, targetPersonnelName, days);
    const refreshed = await fetchCustomers();
    setCustomers(refreshed);
  };

  const openCustomerDetail = async (customer: Customer) => {
    try {
      const full = await fetchCustomerById(customer.id);
      const matchReports = reports.filter(
        (r) =>
          String(r.customer_id) === String(customer.id) ||
          (typeof r.customer_id === 'object' && r.customer_id !== null && String((r.customer_id as any).id) === String(customer.id))
      );
      const combinedReports = (full.reports && full.reports.length > 0)
        ? full.reports
        : matchReports.length > 0 ? matchReports : (customer.reports || []);

      setSelectedCustomer({
        ...full,
        reports: combinedReports,
      });
    } catch {
      const matchReports = reports.filter(
        (r) =>
          String(r.customer_id) === String(customer.id) ||
          (typeof r.customer_id === 'object' && r.customer_id !== null && String((r.customer_id as any).id) === String(customer.id))
      );
      setSelectedCustomer({
        ...customer,
        reports: matchReports.length > 0 ? matchReports : (customer.reports || []),
      });
    }
  };

  // If not authenticated, block dashboard and show full-screen login/register
  if (!currentUser) {
    return (
      <>
        <AuthModal
          isOpen={true}
          isFullScreen={true}
          canClose={false}
          onAuthSuccess={handleAuthSuccess}
        />
        {toast && (
          <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] max-w-md w-full px-4 animate-in slide-in-from-top-4 duration-200">
            <div
              className={`p-3.5 rounded-2xl shadow-2xl flex items-center justify-between gap-3 border ${
                toast.type === 'success'
                  ? 'bg-[#141414]/95 border-[#1DB954]/50 text-white shadow-[#1DB954]/10'
                  : toast.type === 'error'
                  ? 'bg-red-950/95 border-red-500/50 text-white shadow-red-500/20'
                  : 'bg-[#222222]/95 border-[#444] text-white shadow-black/40'
              } backdrop-blur-md`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-[#1DB954] flex-shrink-0" />}
                {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />}
                {toast.type === 'info' && <Info className="w-5 h-5 text-blue-400 flex-shrink-0" />}
                <span className="text-xs font-semibold leading-relaxed truncate">{toast.message}</span>
              </div>
              <button
                onClick={() => setToast(null)}
                className="text-[#888] hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="flex h-screen bg-[#121212] text-white overflow-hidden font-sans">
      {/* Spotify-style AlphaDesk Sidebar */}
      <Sidebar
        activeTab={activeTab}
        portalSubTab={portalSubTab}
        teamSubTab={teamSubTab}
        onSelectTab={(tab, sub) => {
          if (tab === 'tenants' && !canAccessTenantsTab) {
            showToast('دسترسی به بخش سازمان‌ها برای حساب کاربری شما فعال نیست.', 'error');
            return;
          }
          setActiveTab(tab);
          if (tab === 'personal_portal' && sub) setPortalSubTab(sub as PortalTab);
          if (tab === 'team' && sub) setTeamSubTab(sub as TeamSubTab);
          setIsMobileMenuOpen(false);
        }}
        counts={{
          customers: dashboardSummary?.total_customers ?? userScopedCustomers.length,
          expiredCustomers: dashboardSummary?.expired_customers_count ?? expiredCount,
          freeCustomers: dashboardSummary?.free_customers_count ?? freeCustomersCount,
          coldLeads: dashboardSummary?.total_cold_leads_count ?? (isCurrentUserAdmin ? coldLeads.length : coldLeads.filter((l) => l.assigned_to === currentPersonnel?.id).length),
          reports: dashboardSummary?.total_reports_count ?? userScopedReports.length,
          adminReports: dashboardSummary?.admin_reports_count ?? adminReports.length,
          pendingLeaves: leaveRequests.filter((r) => r.status === 'pending').length,
          pendingAdvances: advanceRequests.filter((r) => r.status === 'pending').length,
          totalPersonnel: personnelList.length,
          totalTenants: tenants.length,
        }}
        currentPersonnel={currentPersonnel}
        isAdmin={Boolean(
          currentUser?.is_admin ||
          currentUser?.app_role === 'admin' ||
          currentUser?.role_id === '59e261e1-56f4-401e-9889-4971e2c3c4ce' ||
          currentUser?.role_id === 'a45beaec-0272-4c29-89ee-122dce37f565' ||
          currentPersonnel?.role === 'admin'
        )}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        onLogout={handleLogout}
        tenants={tenants}
        activeTenantId={activeTenantId}
        onSelectTenant={handleSelectTenant}
        onOpenTenantsManagement={() => setIsTenantsModalOpen(true)}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header */}
        <Header
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          personnelList={personnelList}
          currentPersonnel={currentPersonnel}
          currentUser={currentUser}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onLogout={handleLogout}
          expiredCount={expiredCount}
          onViewExpired={() => {
            setActiveTab('customers');
            setShowExpiredOnly(true);
          }}
          onOpenNewCustomer={() => {
            setEditingCustomer(null);
            setPrefilledLeadPhone('');
            setPrefilledLeadName('');
            setPrefilledLeadNotes('');
            setIsCustomerModalOpen(true);
          }}
          onOpenNewLead={() => {
            setIsAddLeadModalOpen(true);
          }}
          isMobileMenuOpen={isMobileMenuOpen}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          onNavigateToPortal={(sub) => {
            setActiveTab('personal_portal');
            setPortalSubTab(sub as PortalTab);
          }}
          tenants={tenants}
          activeTenantId={activeTenantId}
          onSelectTenant={handleSelectTenant}
          onOpenTenantsManagement={() => setIsTenantsModalOpen(true)}
        />

        {/* Dynamic Main View */}
        <main className="flex-1 overflow-y-auto p-3.5 sm:p-5 lg:p-8 pb-24 lg:pb-8 relative">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-3">
              <div className="w-8 h-8 rounded-full border-2 border-[#1DB954] border-t-transparent animate-spin" />
              <div className="text-xs text-[#A7A7A7]">در حال بارگذاری اطلاعات سامانه...</div>
            </div>
          ) : (
            <div className="w-full">
              <ErrorBoundary key={`${activeTab}_${activeTenantId}_${currentUser?.id || 'guest'}`} fallbackTitle="خطا در بارگذاری این صفحه" onReset={loadAllData}>
                {activeTab === 'dashboard' && (
                  <DashboardView
                    customers={userScopedCustomers}
                    reports={userScopedReports}
                    coldLeads={coldLeads}
                    adminReports={adminReports}
                    personnelList={personnelList}
                    bffStatus={bffStatus}
                    dashboardSummary={dashboardSummary}
                    activeTenantId={activeTenantId}
                    onSelectCustomer={openCustomerDetail}
                    onOpenNewCustomer={() => {
                      setEditingCustomer(null);
                      setIsCustomerModalOpen(true);
                    }}
                    onOpenNewLead={() => setIsAddLeadModalOpen(true)}
                    onOpenAddReport={() => {
                      setReportPreselectedCustomerId(undefined);
                      setIsAddReportModalOpen(true);
                    }}
                    onNavigateToTab={(tab, sub) => {
                      setActiveTab(tab);
                      if (sub) setPortalSubTab(sub as PortalTab);
                    }}
                  />
                )}

                {activeTab === 'customers' && (
                  <CustomersView
                    customers={filteredCustomers}
                    personnelList={personnelList}
                    currentPersonnel={currentPersonnel}
                    currentUser={currentUser}
                    isAdmin={isCurrentUserAdmin}
                    activeTenantId={activeTenantId}
                    onSelectCustomer={openCustomerDetail}
                    onOpenNewCustomerModal={() => {
                      setEditingCustomer(null);
                      setPrefilledLeadPhone('');
                      setPrefilledLeadName('');
                      setPrefilledLeadNotes('');
                      setIsCustomerModalOpen(true);
                    }}
                    onOpenMergeModal={() => {
                      setMergeInitialCustomerIds([]);
                      setIsMergeModalOpen(true);
                    }}
                    selectedMarketerId={selectedMarketerId}
                    onSelectMarketerId={setSelectedMarketerId}
                    statusFilter={statusFilter}
                    onSelectStatusFilter={setStatusFilter}
                    showExpiredOnly={showExpiredOnly}
                    onToggleExpiredOnly={setShowExpiredOnly}
                  />
                )}

                {activeTab === 'free_customers' && (
                  <FreeCustomersView
                    customers={customers}
                    reports={reports}
                    personnelList={personnelList}
                    currentPersonnel={currentPersonnel}
                    currentUser={currentUser}
                    isAdmin={isCurrentUserAdmin}
                    activeTenantId={activeTenantId}
                    onClaimCustomer={handleClaimCustomer}
                    onSelectCustomer={openCustomerDetail}
                    showToast={showToast}
                  />
                )}

                {activeTab === 'reports' && (
                  <ReportsView
                    reports={userScopedReports}
                    customers={userScopedCustomers}
                    personnelList={personnelList}
                    currentPersonnel={currentPersonnel}
                    currentUser={currentUser}
                    isAdmin={isCurrentUserAdmin}
                    activeTenantId={activeTenantId}
                    onOpenAddReportModal={(customerId?: string) => {
                      setReportPreselectedCustomerId(customerId);
                      setIsAddReportModalOpen(true);
                    }}
                    onSelectCustomer={openCustomerDetail}
                  />
                )}

                {activeTab === 'analytics' && (
                  <AnalyticsView
                    reports={userScopedReports}
                    customers={userScopedCustomers}
                    personnelList={personnelList}
                    currentPersonnel={currentPersonnel}
                    currentUser={currentUser}
                    isAdmin={isCurrentUserAdmin}
                    activeTenantId={activeTenantId}
                    onSelectCustomer={openCustomerDetail}
                  />
                )}

                {activeTab === 'cold_leads' && (
                  <ColdLeadsView
                    coldLeads={coldLeads}
                    personnelList={personnelList}
                    currentPersonnel={currentPersonnel}
                    currentUser={currentUser}
                    isAdmin={isCurrentUserAdmin}
                    activeTenantId={activeTenantId}
                    onAddLead={handleAddColdLead}
                    onUpdateLeadStatus={handleUpdateLeadStatus}
                    onUpdateLeadAssignedTo={handleUpdateLeadAssignedTo}
                    onBulkAssignLeads={handleBulkAssignLeads}
                    onDeleteLead={handleDeleteLead}
                    onConvertToCustomer={handleConvertToCustomer}
                    showToast={showToast}
                  />
                )}

                {activeTab === 'admin_reports' && (
                  <AdminReportsView
                    adminReports={adminReports}
                    personnelList={personnelList}
                    currentPersonnel={currentPersonnel}
                    currentUser={currentUser}
                    isAdmin={isCurrentUserAdmin}
                    onSubmitReport={handleSubmitAdminReport}
                  />
                )}

                {activeTab === 'team' && (
                  <TeamManagementView
                    initialSubTab={teamSubTab}
                    personnelList={personnelList}
                    customers={customers}
                    dashboardSummary={dashboardSummary}
                    leaveRequests={leaveRequests}
                    currentPersonnel={currentPersonnel}
                    isAdmin={isCurrentUserAdmin}
                    tenants={tenants}
                    activeTenantId={activeTenantId}
                    onCreatePersonnel={handleCreatePersonnel}
                    onUpdatePersonnel={handleUpdatePersonnel}
                    onDeletePersonnel={handleDeletePersonnel}
                    onBulkExtendOwnership={handleBulkExtendOwnership}
                    onBulkSwitchOwnership={handleBulkSwitchOwnership}
                    onUpdateLeaveStatus={handleUpdateLeaveStatus}
                    onSelectCustomer={openCustomerDetail}
                    onLogoutAllUsers={handleLogoutAllUsers}
                    onRefreshData={loadAllData}
                    showToast={showToast}
                  />
                )}

                {activeTab === 'personal_portal' && (
                  <PersonalPortalView
                    currentPersonnel={currentPersonnel}
                    currentUser={currentUser}
                    isAdmin={isCurrentUserAdmin}
                    leaveRequests={leaveRequests}
                    advanceRequests={advanceRequests}
                    personnelList={personnelList}
                    initialTab={portalSubTab}
                    onUpdateProfile={handleUpdateProfile}
                    onChangePassword={handleChangePassword}
                    onCreateLeaveRequest={handleCreateLeaveRequest}
                    onUpdateLeaveStatus={handleUpdateLeaveStatus}
                    onDeleteLeaveRequest={handleDeleteLeaveRequest}
                    onCreateAdvanceRequest={handleCreateAdvanceRequest}
                    onUpdateAdvanceStatus={handleUpdateAdvanceStatus}
                    onDeleteAdvanceRequest={handleDeleteAdvanceRequest}
                    onLogout={handleLogout}
                    showToast={showToast}
                  />
                )}

                {activeTab === 'tenants' && (
                  <TenantsManagementView
                    tenants={tenants}
                    activeTenantId={activeTenantId}
                    onSelectTenant={handleSelectTenant}
                    onRefreshTenants={loadTenants}
                    showToast={showToast}
                    isAdmin={isCurrentUserAdmin}
                    customers={customers}
                    personnelList={personnelList}
                  />
                )}
              </ErrorBoundary>
            </div>
          )}
        </main>

        {/* Mobile Bottom Navigation Bar (Phone-friendly) */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 h-16 bg-[#0c0c0c]/95 backdrop-blur-md border-t border-[#282828] flex items-center justify-around px-1 select-none">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] transition-colors ${
              activeTab === 'dashboard' ? 'text-[#1DB954] font-bold' : 'text-[#888888]'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 mb-0.5" />
            <span>داشبورد</span>
          </button>

          <button
            onClick={() => setActiveTab('customers')}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] transition-colors relative ${
              activeTab === 'customers' ? 'text-[#1DB954] font-bold' : 'text-[#888888]'
            }`}
          >
            <div className="relative">
              <Users className="w-4 h-4 mb-0.5" />
              {expiredCount > 0 && (
                <span className="absolute -top-1 -right-2 w-2 h-2 rounded-full bg-[#E22134] animate-pulse" />
              )}
            </div>
            <span>مشتریان</span>
          </button>

          <button
            onClick={() => setActiveTab('free_customers')}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] transition-colors relative ${
              activeTab === 'free_customers' ? 'text-[#1DB954] font-bold' : 'text-[#888888]'
            }`}
          >
            <div className="relative">
              <Unlock className="w-4 h-4 mb-0.5" />
              {freeCustomersCount > 0 && (
                <span className="absolute -top-1 -right-2 px-1 py-0.2 rounded-full bg-[#1DB954] text-black font-mono font-bold text-[8px]">
                  {freeCustomersCount}
                </span>
              )}
            </div>
            <span>آزاد</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] transition-colors ${
              activeTab === 'reports' ? 'text-[#1DB954] font-bold' : 'text-[#888888]'
            }`}
          >
            <MessageSquareText className="w-4 h-4 mb-0.5" />
            <span>مذاکرات</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] transition-colors ${
              activeTab === 'analytics' ? 'text-[#1DB954] font-bold' : 'text-[#888888]'
            }`}
          >
            <BarChart3 className="w-4 h-4 mb-0.5" />
            <span>نمودارها</span>
          </button>

          <button
            onClick={() => setActiveTab('cold_leads')}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] transition-colors ${
              activeTab === 'cold_leads' ? 'text-[#1DB954] font-bold' : 'text-[#888888]'
            }`}
          >
            <PhoneCall className="w-4 h-4 mb-0.5" />
            <span>لیدها</span>
          </button>

          <button
            onClick={() => setActiveTab('admin_reports')}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] transition-colors ${
              activeTab === 'admin_reports' ? 'text-[#1DB954] font-bold' : 'text-[#888888]'
            }`}
          >
            <ClipboardCheck className="w-4 h-4 mb-0.5" />
            <span>عملکرد</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('personal_portal');
              setPortalSubTab('profile');
            }}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] transition-colors ${
              activeTab === 'personal_portal' ? 'text-[#1DB954] font-bold' : 'text-[#888888]'
            }`}
          >
            <User className="w-4 h-4 mb-0.5" />
            <span>پنل من</span>
          </button>
        </nav>
      </div>

      {/* Customer Registration & Edit Modal */}
      <CustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => {
          setIsCustomerModalOpen(false);
          setEditingCustomer(null);
          setPrefilledLeadPhone('');
          setPrefilledLeadName('');
          setPrefilledLeadNotes('');
        }}
        onSave={handleSaveCustomer}
        editingCustomer={editingCustomer}
        personnelList={personnelList}
        currentPersonnel={currentPersonnel}
        currentUser={currentUser}
        isAdmin={isCurrentUserAdmin}
        prefilledPhone={prefilledLeadPhone}
        prefilledName={prefilledLeadName}
        prefilledNotes={prefilledLeadNotes}
      />

      {/* Customer Profile & Timeline Detail Modal */}
      <CustomerDetailModal
        customer={selectedCustomer}
        isOpen={!!selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
        onAddReport={handleAddCustomerReport}
        onReassign={handleReassignCustomer}
        onAddContact={handleAddCustomerContact}
        onEdit={(cust) => {
          setSelectedCustomer(null);
          setEditingCustomer(cust);
          setIsCustomerModalOpen(true);
        }}
        onDelete={handleDeleteCustomer}
        onOpenMerge={(customerId) => {
          setMergeInitialCustomerIds([customerId]);
          setIsMergeModalOpen(true);
        }}
        personnelList={personnelList}
        currentPersonnel={currentPersonnel}
        currentUser={currentUser}
        isAdmin={isCurrentUserAdmin}
      />

      {/* Standalone Add Report Modal */}
      <AddReportModal
        isOpen={isAddReportModalOpen}
        onClose={() => {
          setIsAddReportModalOpen(false);
          setReportPreselectedCustomerId(undefined);
        }}
        customers={customers}
        personnelList={personnelList}
        currentPersonnel={currentPersonnel}
        currentUser={currentUser}
        isAdmin={Boolean(
          currentUser?.is_admin ||
          currentUser?.app_role === 'admin' ||
          currentUser?.role_id === '59e261e1-56f4-401e-9889-4971e2c3c4ce' ||
          currentUser?.role_id === 'a45beaec-0272-4c29-89ee-122dce37f565' ||
          currentPersonnel?.role === 'admin'
        )}
        onSaveReport={handleAddCustomerReport}
        preselectedCustomerId={reportPreselectedCustomerId}
      />

      {/* Admin Customer Merge Modal */}
      <MergeCustomersModal
        isOpen={isMergeModalOpen}
        onClose={() => {
          setIsMergeModalOpen(false);
          setMergeInitialCustomerIds([]);
        }}
        customers={customers}
        reports={reports}
        personnelList={personnelList}
        initialSelectedCustomerIds={mergeInitialCustomerIds}
        onMerge={handleMergeCustomers}
      />

      {/* Quick Add Cold Lead Modal */}
      <AddColdLeadModal
        isOpen={isAddLeadModalOpen}
        onClose={() => setIsAddLeadModalOpen(false)}
        onAddLead={handleAddColdLead}
        personnelList={personnelList}
        currentPersonnel={currentPersonnel}
        currentUser={currentUser}
        isAdmin={Boolean(
          currentUser?.is_admin ||
          currentUser?.app_role === 'admin' ||
          currentUser?.role_id === '59e261e1-56f4-401e-9889-4971e2c3c4ce' ||
          currentUser?.role_id === 'a45beaec-0272-4c29-89ee-122dce37f565' ||
          currentPersonnel?.role === 'admin'
        )}
        showToast={showToast}
      />

      {/* User Login & Registration Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* Multi-Tenant Organization Management Modal */}
      <TenantsManagementModal
        isOpen={isTenantsModalOpen}
        onClose={() => setIsTenantsModalOpen(false)}
        tenants={tenants}
        activeTenantId={activeTenantId}
        onSelectTenant={handleSelectTenant}
        onRefreshTenants={loadTenants}
        showToast={showToast}
        isAdmin={Boolean(
          currentUser?.is_admin ||
          currentUser?.app_role === 'admin' ||
          currentUser?.role_id === '59e261e1-56f4-401e-9889-4971e2c3c4ce' ||
          currentUser?.role_id === 'a45beaec-0272-4c29-89ee-122dce37f565' ||
          currentPersonnel?.role === 'admin'
        )}
      />

      {/* Floating System Toast Notifications */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] max-w-md w-full px-4 animate-in slide-in-from-top-4 duration-200">
          <div
            className={`p-3.5 rounded-2xl shadow-2xl flex items-center justify-between gap-3 border ${
              toast.type === 'success'
                ? 'bg-[#141414]/95 border-[#1DB954]/50 text-white shadow-[#1DB954]/10'
                : toast.type === 'error'
                ? 'bg-red-950/95 border-red-500/50 text-white shadow-red-500/20'
                : 'bg-[#222222]/95 border-[#444] text-white shadow-black/40'
            } backdrop-blur-md`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-[#1DB954] flex-shrink-0" />}
              {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />}
              {toast.type === 'info' && <Info className="w-5 h-5 text-blue-400 flex-shrink-0" />}
              <span className="text-xs font-semibold leading-relaxed truncate">{toast.message}</span>
            </div>
            <button
              onClick={() => setToast(null)}
              className="text-[#888] hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
