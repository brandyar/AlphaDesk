import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  Users,
  MessageSquareText,
  PhoneCall,
  ClipboardCheck,
  BarChart3,
  User,
  CheckCircle,
  AlertCircle,
  Info,
  X
} from 'lucide-react';
import { Sidebar, NavTab } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { CustomersView } from './components/CustomersView';
import { ReportsView } from './components/ReportsView';
import { AnalyticsView } from './components/AnalyticsView';
import { ColdLeadsView } from './components/ColdLeadsView';
import { AdminReportsView } from './components/AdminReportsView';
import { PersonalPortalView, PortalTab } from './components/PersonalPortalView';
import { TeamManagementView } from './components/TeamManagementView';
import { CustomerModal } from './components/CustomerModal';
import { CustomerDetailModal } from './components/CustomerDetailModal';
import { AddReportModal } from './components/AddReportModal';
import { MergeCustomersModal } from './components/MergeCustomersModal';
import { AuthModal } from './components/AuthModal';

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
} from './types';

import {
  fetchCustomers,
  fetchCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  reassignCustomer,
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
} from './api';

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
  const [reportPreselectedCustomerId, setReportPreselectedCustomerId] = useState<string | undefined>(undefined);
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [mergeInitialCustomerIds, setMergeInitialCustomerIds] = useState<string[]>([]);

  // Pre-fill state when converting a lead
  const [prefilledLeadPhone, setPrefilledLeadPhone] = useState('');
  const [prefilledLeadName, setPrefilledLeadName] = useState('');
  const [prefilledLeadNotes, setPrefilledLeadNotes] = useState('');

  const [loading, setLoading] = useState(true);
  const [displayedTab, setDisplayedTab] = useState<NavTab>(activeTab);
  const [isTabTransitioning, setIsTabTransitioning] = useState(false);

  // Smooth Tab Transition Handler
  useEffect(() => {
    if (activeTab !== displayedTab) {
      setIsTabTransitioning(true);
      const timer = setTimeout(() => {
        setDisplayedTab(activeTab);
        setIsTabTransitioning(false);
      }, 140);
      return () => clearTimeout(timer);
    }
  }, [activeTab, displayedTab]);

  // Initial Data Load
  const loadAllData = async (activeP?: Personnel | null) => {
    try {
      const [pData, cData, rData, lData, aData, bStatus, lrData, arData] = await Promise.all([
        fetchPersonnel().catch(() => []),
        fetchCustomers().catch(() => []),
        fetchCustomerReports().catch(() => []),
        fetchColdLeads().catch(() => []),
        fetchAdminReports().catch(() => []),
        fetchBffStatus().catch(() => null),
        fetchLeaveRequests().catch(() => []),
        fetchAdvanceRequests().catch(() => []),
      ]);

      setPersonnelList(pData);
      
      // Accurately match logged-in user to their specific personnel record
      let targetPersonnel = activeP;
      if (!targetPersonnel && currentUser) {
        targetPersonnel = pData.find(
          (p) =>
            (currentUser.email && p.email?.toLowerCase() === currentUser.email?.toLowerCase()) ||
            (currentUser.id && (p.id === currentUser.id || p.user_id === currentUser.id))
        ) || null;
      }
      if (!targetPersonnel && currentPersonnel) {
        targetPersonnel = pData.find((p) => p.id === currentPersonnel.id) || currentPersonnel;
      }
      if (!targetPersonnel && !currentUser && pData.length > 0) {
        targetPersonnel = pData[0];
      }

      if (targetPersonnel) {
        setCurrentPersonnel(targetPersonnel);
        setApiPersonnelContext(targetPersonnel);
      }

      setCustomers(cData);
      setReports(rData);
      setColdLeads(lData);
      setAdminReports(aData);
      setBffStatus(bStatus);
      setLeaveRequests(lrData);
      setAdvanceRequests(arData);
    } catch (e) {
      console.error('Error loading data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();

    // Periodic interval to check expiration timers every 30 seconds
    const interval = setInterval(() => {
      fetchCustomers().then(setCustomers).catch(() => {});
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // When active personnel (role/user) switches, update BFF context and reload role-scoped data
  useEffect(() => {
    if (currentPersonnel) {
      setApiPersonnelContext(currentPersonnel);
      Promise.all([
        fetchCustomers().catch(() => []),
        fetchCustomerReports().catch(() => []),
        fetchColdLeads().catch(() => []),
        fetchAdminReports().catch(() => []),
      ]).then(([cData, rData, lData, aData]) => {
        setCustomers(cData);
        setReports(rData);
        setColdLeads(lData);
        setAdminReports(aData);
      });
    }
  }, [currentPersonnel]);

  const handleAuthSuccess = (authData: AuthResponse) => {
    setCurrentUser(authData.user);
    if (authData.personnel) {
      setCurrentPersonnel(authData.personnel);
      setApiPersonnelContext(authData.personnel);
    }
    showToast(`خوش آمدید ${authData.user.name} (${authData.user.is_admin ? 'مدیر سیستم' : 'کارشناس فروش'})`, 'success');
    loadAllData(authData.personnel);
  };

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
    showToast('از حساب کاربری خود خارج شدید.', 'info');
    loadAllData();
  };

  // Filter customers for current view
  const filteredCustomers = customers.filter((c) => {
    if (!c) return false;
    if (showExpiredOnly && !c.is_expired) return false;
    if (selectedMarketerId !== 'همه' && c.assigned_marketer_id !== selectedMarketerId) return false;
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

  const expiredCount = customers.filter((c) => c.is_expired).length;

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
      fetchCustomers().then(setCustomers).catch(() => {});
      fetchCustomerReports().then(setReports).catch(() => {});
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
      fetchCustomerReports().then(setReports).catch(() => {});
      fetchBffStatus().then(setBffStatus).catch(() => {});
      showToast('مشتری با موفقیت به بازاریاب جدید واگذار شد.', 'success');
    } catch (err: any) {
      showToast('خطا در واگذاری مجدد مشتری: ' + (err.message || 'خطای نامشخص'), 'error');
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
      const updatedCustomer = await fetchCustomerById(reportData.customer_id!);
      setCustomers((prev) => prev.map((c) => (c.id === updatedCustomer.id ? updatedCustomer : c)));
      if (selectedCustomer?.id === updatedCustomer.id) {
        setSelectedCustomer(updatedCustomer);
      }
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

  // Handler for Daily Admin Reports
  const handleSubmitAdminReport = async (reportData: Partial<AdministrativeReport>) => {
    try {
      const created = await createAdminReport(reportData);
      setAdminReports((prev) => [created, ...prev]);
      fetchBffStatus().then(setBffStatus).catch(() => {});
      showToast('گزارش عملکرد اداری با موفقیت ثبت شد.', 'success');
    } catch (err: any) {
      showToast('خطا در ثبت گزارش اداری: ' + (err.message || 'خطای نامشخص'), 'error');
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
      setSelectedCustomer(full);
    } catch {
      setSelectedCustomer(customer);
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
          setActiveTab(tab);
          if (tab === 'personal_portal' && sub) setPortalSubTab(sub as PortalTab);
          if (tab === 'team' && sub) setTeamSubTab(sub as TeamSubTab);
          setIsMobileMenuOpen(false);
        }}
        counts={{
          customers: customers.length,
          expiredCustomers: expiredCount,
          coldLeads: coldLeads.length,
          reports: reports.length,
          adminReports: adminReports.length,
          pendingLeaves: leaveRequests.filter((r) => r.status === 'pending').length,
          pendingAdvances: advanceRequests.filter((r) => r.status === 'pending').length,
          totalPersonnel: personnelList.length,
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
          onSelectPersonnel={setCurrentPersonnel}
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
            setActiveTab('cold_leads');
          }}
          isMobileMenuOpen={isMobileMenuOpen}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          onNavigateToPortal={(sub) => {
            setActiveTab('personal_portal');
            setPortalSubTab(sub as PortalTab);
          }}
        />

        {/* Dynamic Main View */}
        <main className="flex-1 overflow-y-auto p-3.5 sm:p-5 lg:p-8 pb-24 lg:pb-8 relative">
          {/* Subtle Top Loading Line for Page Transitions */}
          {isTabTransitioning && (
            <div className="fixed top-16 sm:top-18 left-0 right-0 z-40 h-[3px] bg-gradient-to-r from-transparent via-[#1DB954] to-transparent animate-pulse shadow-sm shadow-[#1DB954]/50" />
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-3">
              <div className="w-8 h-8 rounded-full border-2 border-[#1DB954] border-t-transparent animate-spin" />
              <div className="text-xs text-[#A7A7A7]">در حال بارگذاری اطلاعات سامانه...</div>
            </div>
          ) : (
            <div
              className={`transition-all duration-150 ease-out ${
                isTabTransitioning
                  ? 'opacity-40 translate-y-1 blur-[0.5px]'
                  : 'opacity-100 translate-y-0 blur-0'
              }`}
            >
              {displayedTab === 'dashboard' && (
                <DashboardView
                  customers={customers}
                  reports={reports}
                  coldLeads={coldLeads}
                  adminReports={adminReports}
                  personnelList={personnelList}
                  bffStatus={bffStatus}
                  onSelectCustomer={openCustomerDetail}
                  onOpenNewCustomer={() => {
                    setEditingCustomer(null);
                    setIsCustomerModalOpen(true);
                  }}
                  onOpenNewLead={() => setActiveTab('cold_leads')}
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

              {displayedTab === 'customers' && (
                <CustomersView
                  customers={filteredCustomers}
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

              {displayedTab === 'reports' && (
                <ReportsView
                  reports={reports}
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
                  onOpenAddReportModal={(customerId?: string) => {
                    setReportPreselectedCustomerId(customerId);
                    setIsAddReportModalOpen(true);
                  }}
                  onSelectCustomer={openCustomerDetail}
                />
              )}

              {displayedTab === 'analytics' && (
                <AnalyticsView
                  reports={reports}
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
                  onSelectCustomer={openCustomerDetail}
                />
              )}

              {displayedTab === 'cold_leads' && (
                <ColdLeadsView
                  coldLeads={coldLeads}
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
                  onAddLead={handleAddColdLead}
                  onUpdateLeadStatus={handleUpdateLeadStatus}
                  onUpdateLeadAssignedTo={handleUpdateLeadAssignedTo}
                  onBulkAssignLeads={handleBulkAssignLeads}
                  onDeleteLead={handleDeleteLead}
                  onConvertToCustomer={handleConvertToCustomer}
                  showToast={showToast}
                />
              )}

              {displayedTab === 'admin_reports' && (
                <AdminReportsView
                  adminReports={adminReports}
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
                  onSubmitReport={handleSubmitAdminReport}
                />
              )}

              {displayedTab === 'team' && (
                <TeamManagementView
                  initialSubTab={teamSubTab}
                  personnelList={personnelList}
                  customers={customers}
                  leaveRequests={leaveRequests}
                  currentPersonnel={currentPersonnel}
                  isAdmin={Boolean(
                    currentUser?.is_admin ||
                    currentUser?.app_role === 'admin' ||
                    currentUser?.role_id === '59e261e1-56f4-401e-9889-4971e2c3c4ce' ||
                    currentUser?.role_id === 'a45beaec-0272-4c29-89ee-122dce37f565' ||
                    currentPersonnel?.role === 'admin'
                  )}
                  onCreatePersonnel={handleCreatePersonnel}
                  onUpdatePersonnel={handleUpdatePersonnel}
                  onDeletePersonnel={handleDeletePersonnel}
                  onBulkExtendOwnership={handleBulkExtendOwnership}
                  onBulkSwitchOwnership={handleBulkSwitchOwnership}
                  onUpdateLeaveStatus={handleUpdateLeaveStatus}
                  onSelectCustomer={openCustomerDetail}
                  showToast={showToast}
                />
              )}

              {displayedTab === 'personal_portal' && (
                <PersonalPortalView
                  currentPersonnel={currentPersonnel}
                  currentUser={currentUser}
                  isAdmin={Boolean(
                    currentUser?.is_admin ||
                    currentUser?.app_role === 'admin' ||
                    currentUser?.role_id === '59e261e1-56f4-401e-9889-4971e2c3c4ce' ||
                    currentUser?.role_id === 'a45beaec-0272-4c29-89ee-122dce37f565' ||
                    currentPersonnel?.role === 'admin'
                  )}
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
        isAdmin={Boolean(
          currentUser?.is_admin ||
          currentUser?.app_role === 'admin' ||
          currentUser?.role_id === '59e261e1-56f4-401e-9889-4971e2c3c4ce' ||
          currentUser?.role_id === 'a45beaec-0272-4c29-89ee-122dce37f565' ||
          currentPersonnel?.role === 'admin'
        )}
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
        isAdmin={Boolean(
          currentUser?.is_admin ||
          currentUser?.app_role === 'admin' ||
          currentUser?.role_id === '59e261e1-56f4-401e-9889-4971e2c3c4ce' ||
          currentUser?.role_id === 'a45beaec-0272-4c29-89ee-122dce37f565' ||
          currentPersonnel?.role === 'admin'
        )}
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

      {/* User Login & Registration Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
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
