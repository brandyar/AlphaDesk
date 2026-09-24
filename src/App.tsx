import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  MessageSquareText,
  PhoneCall,
  ClipboardCheck
} from 'lucide-react';
import { Sidebar, NavTab } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { CustomersView } from './components/CustomersView';
import { ReportsView } from './components/ReportsView';
import { ColdLeadsView } from './components/ColdLeadsView';
import { AdminReportsView } from './components/AdminReportsView';
import { ShiftsView } from './components/ShiftsView';
import { CustomerModal } from './components/CustomerModal';
import { CustomerDetailModal } from './components/CustomerDetailModal';
import { AddReportModal } from './components/AddReportModal';

import {
  Customer,
  CustomerReport,
  ColdLead,
  AdministrativeReport,
  Personnel,
  BffStatus,
  LeadStatus,
} from './types';

import {
  fetchCustomers,
  fetchCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  reassignCustomer,
  fetchCustomerReports,
  createCustomerReport,
  fetchColdLeads,
  createColdLead,
  updateColdLead,
  convertColdLead,
  fetchAdminReports,
  createAdminReport,
  fetchPersonnel,
  fetchBffStatus,
} from './api';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Core Data State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [reports, setReports] = useState<CustomerReport[]>([]);
  const [coldLeads, setColdLeads] = useState<ColdLead[]>([]);
  const [adminReports, setAdminReports] = useState<AdministrativeReport[]>([]);
  const [personnelList, setPersonnelList] = useState<Personnel[]>([]);
  const [currentPersonnel, setCurrentPersonnel] = useState<Personnel | null>(null);
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

  // Pre-fill state when converting a lead
  const [prefilledLeadPhone, setPrefilledLeadPhone] = useState('');
  const [prefilledLeadName, setPrefilledLeadName] = useState('');
  const [prefilledLeadNotes, setPrefilledLeadNotes] = useState('');

  const [loading, setLoading] = useState(true);

  // Initial Data Load
  const loadAllData = async () => {
    try {
      const [pData, cData, rData, lData, aData, bStatus] = await Promise.all([
        fetchPersonnel().catch(() => []),
        fetchCustomers().catch(() => []),
        fetchCustomerReports().catch(() => []),
        fetchColdLeads().catch(() => []),
        fetchAdminReports().catch(() => []),
        fetchBffStatus().catch(() => null),
      ]);

      setPersonnelList(pData);
      if (pData.length > 0 && !currentPersonnel) {
        setCurrentPersonnel(pData[0]);
      }
      setCustomers(cData);
      setReports(rData);
      setColdLeads(lData);
      setAdminReports(aData);
      setBffStatus(bStatus);
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

  // Filter customers for current view
  const filteredCustomers = customers.filter((c) => {
    if (showExpiredOnly && !c.is_expired) return false;
    if (selectedMarketerId !== 'همه' && c.assigned_marketer_id !== selectedMarketerId) return false;
    if (statusFilter !== 'همه' && c.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCompany = c.company_name.toLowerCase().includes(q);
      const matchManager = c.manager_name?.toLowerCase().includes(q);
      const matchCity = c.city?.toLowerCase().includes(q);
      const matchJob = c.business_type?.toLowerCase().includes(q);
      const matchPhone = c.mobile_numbers.some((m) => m.includes(q));
      if (!matchCompany && !matchManager && !matchCity && !matchJob && !matchPhone) return false;
    }
    return true;
  });

  const expiredCount = customers.filter((c) => c.is_expired).length;

  // Handlers for Customer Operations
  const handleSaveCustomer = async (
    customerData: Partial<Customer> & { assignment_duration_days?: number }
  ) => {
    if (editingCustomer) {
      const updated = await updateCustomer(editingCustomer.id, customerData);
      setCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      if (selectedCustomer?.id === updated.id) {
        setSelectedCustomer(updated);
      }
    } else {
      const created = await createCustomer(customerData);
      setCustomers((prev) => [created, ...prev]);

      // If created from a lead, mark lead as converted
      if (prefilledLeadPhone) {
        const lead = coldLeads.find((l) => l.phone_number === prefilledLeadPhone);
        if (lead) {
          await updateColdLead(lead.id, {
            status: 'تبدیل شده به مشتری',
            converted_customer_id: created.id,
          });
          setColdLeads((prev) =>
            prev.map((l) =>
              l.id === lead.id
                ? { ...l, status: 'تبدیل شده به مشتری', converted_customer_id: created.id }
                : l
            )
          );
        }
      }
    }
    setEditingCustomer(null);
    setPrefilledLeadPhone('');
    setPrefilledLeadName('');
    setPrefilledLeadNotes('');
    // Refresh reports list in case initial interview report was added
    fetchCustomerReports().then(setReports).catch(() => {});
  };

  const handleDeleteCustomer = async (id: string) => {
    await deleteCustomer(id);
    setCustomers((prev) => prev.filter((c) => c.id !== id));
    setReports((prev) => prev.filter((r) => r.customer_id !== id));
    setSelectedCustomer(null);
  };

  const handleReassignCustomer = async (
    customerId: string,
    marketerId: string,
    marketerName: string,
    days: number
  ) => {
    const updated = await reassignCustomer(customerId, marketerId, marketerName, days);
    setCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    setSelectedCustomer(updated);
    fetchCustomerReports().then(setReports).catch(() => {});
  };

  // Handlers for Customer Follow-up Reports
  const handleAddCustomerReport = async (reportData: Partial<CustomerReport>) => {
    const created = await createCustomerReport(reportData);
    setReports((prev) => [created, ...prev]);

    // Refresh customer list to get updated status and followup date
    const updatedCustomer = await fetchCustomerById(reportData.customer_id!);
    setCustomers((prev) => prev.map((c) => (c.id === updatedCustomer.id ? updatedCustomer : c)));
    if (selectedCustomer?.id === updatedCustomer.id) {
      setSelectedCustomer(updatedCustomer);
    }
  };

  // Handlers for Cold Leads
  const handleAddColdLead = async (leadData: Partial<ColdLead>) => {
    const created = await createColdLead(leadData);
    setColdLeads((prev) => [created, ...prev]);
  };

  const handleUpdateLeadStatus = async (leadId: string, status: LeadStatus) => {
    const updated = await updateColdLead(leadId, { status });
    setColdLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
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
    const created = await createAdminReport(reportData);
    setAdminReports((prev) => [created, ...prev]);
  };

  const openCustomerDetail = async (customer: Customer) => {
    try {
      const full = await fetchCustomerById(customer.id);
      setSelectedCustomer(full);
    } catch {
      setSelectedCustomer(customer);
    }
  };

  return (
    <div className="flex h-screen bg-[#121212] text-white overflow-hidden font-sans">
      {/* Spotify-style AlphaDesk Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setIsMobileMenuOpen(false);
        }}
        counts={{
          customers: customers.length,
          expiredCustomers: expiredCount,
          coldLeads: coldLeads.length,
          reports: reports.length,
          adminReports: adminReports.length,
        }}
        currentPersonnel={currentPersonnel}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header */}
        <Header
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          personnelList={personnelList}
          currentPersonnel={currentPersonnel}
          onSelectPersonnel={setCurrentPersonnel}
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
        />

        {/* Dynamic Main View */}
        <main className="flex-1 overflow-y-auto p-3.5 sm:p-5 lg:p-8 pb-24 lg:pb-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-3">
              <div className="w-8 h-8 rounded-full border-2 border-[#1DB954] border-t-transparent animate-spin" />
              <div className="text-xs text-[#A7A7A7]">در حال بارگذاری اطلاعات سامانه...</div>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && (
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
                  onNavigateToTab={setActiveTab}
                />
              )}

              {activeTab === 'customers' && (
                <CustomersView
                  customers={filteredCustomers}
                  personnelList={personnelList}
                  onSelectCustomer={openCustomerDetail}
                  onOpenNewCustomerModal={() => {
                    setEditingCustomer(null);
                    setPrefilledLeadPhone('');
                    setPrefilledLeadName('');
                    setPrefilledLeadNotes('');
                    setIsCustomerModalOpen(true);
                  }}
                  selectedMarketerId={selectedMarketerId}
                  onSelectMarketerId={setSelectedMarketerId}
                  statusFilter={statusFilter}
                  onSelectStatusFilter={setStatusFilter}
                  showExpiredOnly={showExpiredOnly}
                  onToggleExpiredOnly={setShowExpiredOnly}
                />
              )}

              {activeTab === 'reports' && (
                <ReportsView
                  reports={reports}
                  customers={customers}
                  personnelList={personnelList}
                  onOpenAddReportModal={() => setIsAddReportModalOpen(true)}
                  onSelectCustomer={openCustomerDetail}
                />
              )}

              {activeTab === 'cold_leads' && (
                <ColdLeadsView
                  coldLeads={coldLeads}
                  personnelList={personnelList}
                  onAddLead={handleAddColdLead}
                  onUpdateLeadStatus={handleUpdateLeadStatus}
                  onConvertToCustomer={handleConvertToCustomer}
                />
              )}

              {activeTab === 'admin_reports' && (
                <AdminReportsView
                  adminReports={adminReports}
                  personnelList={personnelList}
                  currentPersonnel={currentPersonnel}
                  onSubmitReport={handleSubmitAdminReport}
                />
              )}

              {activeTab === 'shifts' && (
                <ShiftsView
                  personnelList={personnelList}
                  currentPersonnel={currentPersonnel}
                />
              )}
            </>
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
        onEdit={(cust) => {
          setSelectedCustomer(null);
          setEditingCustomer(cust);
          setIsCustomerModalOpen(true);
        }}
        onDelete={handleDeleteCustomer}
        personnelList={personnelList}
        currentPersonnel={currentPersonnel}
      />

      {/* Standalone Add Report Modal */}
      <AddReportModal
        isOpen={isAddReportModalOpen}
        onClose={() => setIsAddReportModalOpen(false)}
        customers={customers}
        personnelList={personnelList}
        currentPersonnel={currentPersonnel}
        onSaveReport={handleAddCustomerReport}
      />
    </div>
  );
}
