import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  Users2,
  Unlock,
  User,
  UserPlus,
  ArrowLeftRight,
  Clock,
  CalendarCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  Shield,
  ShieldCheck,
  Phone,
  Mail,
  UserCheck,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  CalendarDays,
  Send,
  Sparkles,
  Check,
  X,
  RefreshCw,
  FolderOpen,
  Award,
  LayoutDashboard,
  MessageSquareText,
  BarChart3,
  PhoneCall,
  ClipboardCheck,
  Eye,
  Copy,
  Briefcase,
  Laptop,
  Headphones,
  DollarSign,
  ChevronDown,
  Layers,
  KeyRound,
  FileCheck,
  Building2,
  HeartHandshake,
  UserCog,
} from 'lucide-react';
import {
  Personnel,
  Customer,
  LeaveRequest,
  TeamSubTab,
  CreateColleaguePayload,
  RequestStatus,
  PersonnelRole,
  PersonnelPermissions,
  PersonnelContactNumber,
  FamilyContact,
  Tenant,
} from '../types';
import {
  formatPersianDate,
  formatPersianDateTime,
  formatTimeRemaining,
  getStatusTheme,
  toPersianDigits,
} from '../utils';

export const FAMILY_RELATION_OPTIONS = [
  'پدر',
  'مادر',
  'همسر',
  'برادر',
  'خواهر',
  'فرزند',
  'سرپرست قانونی',
  'سایر بستگان',
];

export const COMMON_PHONE_LABELS = [
  'موبایل اصلی',
  'شماره دوم',
  'تلفن ثابت / داخلی',
  'تلگرام',
  'واتساپ',
  'شماره اضطراری',
];

export const PERSONNEL_ROLE_CONFIG: Record<
  PersonnelRole,
  {
    label: string;
    description: string;
    badgeClass: string;
    icon: React.ComponentType<{ className?: string }>;
    defaultMenus: string[];
    defaultReportScope: 'all' | 'own_only' | 'specific_personnel';
  }
> = {
  admin: {
    label: 'مدیر ارشد / سیستم',
    description: 'دسترسی کامل مدیریتی به تمامی منوها، پرونده‌ها و تنظیمات سامانه',
    badgeClass: 'bg-[#1DB954]/15 text-[#1DB954] border-[#1DB954]/30',
    icon: ShieldCheck,
    defaultMenus: [
      'dashboard',
      'customers',
      'free_customers',
      'reports',
      'analytics',
      'cold_leads',
      'admin_reports',
      'team',
      'tenants',
      'personal_portal',
    ],
    defaultReportScope: 'all',
  },
  sales_manager: {
    label: 'مدیر فروش و بازاریابی',
    description: 'مدیریت تیم، تمدید و سوئیچ مالکیت‌ها، نظارت بر پایپ‌لاین و گزارش‌ها',
    badgeClass: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    icon: Briefcase,
    defaultMenus: [
      'dashboard',
      'customers',
      'free_customers',
      'reports',
      'analytics',
      'cold_leads',
      'admin_reports',
      'team',
      'personal_portal',
    ],
    defaultReportScope: 'all',
  },
  marketer: {
    label: 'کارشناس فروش و مذاکره',
    description: 'پیگیری پرونده‌ها، ثبت مذاکرات، فاکتورها، بانک شماره‌ها و گزارش کار روزانه',
    badgeClass: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    icon: PhoneCall,
    defaultMenus: [
      'dashboard',
      'customers',
      'free_customers',
      'reports',
      'cold_leads',
      'admin_reports',
      'personal_portal',
    ],
    defaultReportScope: 'own_only',
  },
  office_staff: {
    label: 'همکار اداری و دفتری',
    description: 'انجام وظایف اداری و سازمانی، ثبت گزارش عملکرد روزانه و امور پرسنلی',
    badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    icon: ClipboardCheck,
    defaultMenus: ['dashboard', 'admin_reports', 'personal_portal'],
    defaultReportScope: 'own_only',
  },
  remote_task: {
    label: 'همکار دورکاری و تسک‌محور',
    description: 'فعالیت پروژه‌ای و تسک‌محور دورکاری با دسترسی به ثبت کار روزانه و امور پرسنلی',
    badgeClass: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    icon: Laptop,
    defaultMenus: ['admin_reports', 'personal_portal'],
    defaultReportScope: 'own_only',
  },
  operator: {
    label: 'اپراتور پشتیبانی و ورود اطلاعات',
    description: 'پاسخگویی اولیه و ثبت شماره‌های ورودی در بانک لید سرد',
    badgeClass: 'bg-teal-500/15 text-teal-400 border-teal-500/30',
    icon: Headphones,
    defaultMenus: ['dashboard', 'cold_leads', 'admin_reports', 'personal_portal'],
    defaultReportScope: 'own_only',
  },
  finance: {
    label: 'امور مالی و حسابداری',
    description: 'بررسی مبالغ قراردادها، فاکتورها و کارتابل درخواست‌های مساعده',
    badgeClass: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    icon: DollarSign,
    defaultMenus: ['dashboard', 'reports', 'analytics', 'personal_portal'],
    defaultReportScope: 'own_only',
  },
  custom: {
    label: 'نقش سفارشی (تخصیص دستی دسترسی‌ها)',
    description: 'تعیین دلخواه و تیک زدن موردی منوها، اختیارات کاری و گزارش‌ها',
    badgeClass: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30',
    icon: Layers,
    defaultMenus: ['dashboard', 'admin_reports', 'personal_portal'],
    defaultReportScope: 'own_only',
  },
};

export const SYSTEM_MENUS = [
  { id: 'dashboard', label: 'داشبورد و آمار', icon: LayoutDashboard, desc: 'آمار کلان و دسترسی‌های سریع' },
  { id: 'customers', label: 'مدیریت مشتریان', icon: Users, desc: 'مشاهده پرونده‌ها و تایمرهای انقضا' },
  { id: 'free_customers', label: 'مشتریان آزاد', icon: Unlock, desc: 'حوضچه مشتریان منقضی‌شده و بدون مالک با امکان اختصاص' },
  { id: 'reports', label: 'گزارش‌های مذاکره', icon: MessageSquareText, desc: 'تاریخچه تماس‌ها و فاکتورها' },
  { id: 'analytics', label: 'گزارشات نموداری', icon: BarChart3, desc: 'نمودارهای روزانه و قیف فروش' },
  { id: 'cold_leads', label: 'بانک شماره‌های اولیه', icon: PhoneCall, desc: 'لیدهای سرد و تماس‌های اولیه' },
  { id: 'admin_reports', label: 'گزارش عملکرد پرسنل', icon: ClipboardCheck, desc: 'فرم ثبت کار روزانه و ساعت کاری' },
  { id: 'team', label: 'مدیریت همکاران و تیم', icon: Users2, desc: 'ثبت همکار، تمدید و سوئیچ مالکیت' },
  { id: 'tenants', label: 'سازمان‌ها و شعب (چندسازمانی)', icon: Building2, desc: 'مشاهده لیست سازمان‌ها و تعریف شرکت یا شعبه جدید' },
  { id: 'personal_portal', label: 'پنل شخصی و پرسنلی', icon: User, desc: 'پروفایل، مرخصی و مساعده' },
];

export const SYSTEM_ACTIONS = [
  { key: 'can_view_all_customers', label: 'مشاهده مشتریان همه همکاران (نه فقط مال خودش)' },
  { key: 'can_edit_customer', label: 'ویرایش مشخصات پرونده‌های مشتریان' },
  { key: 'can_delete_customer', label: 'حذف پرونده‌های مشتریان' },
  { key: 'can_export_data', label: 'کپی اطلاعات و خروجی داده‌ها' },
  { key: 'can_extend_ownership', label: 'تمدید مهلت مالکیت پرونده‌ها (Deadline)' },
  { key: 'can_switch_ownership', label: 'سوئیچ و واگذاری پرونده به بازاریاب دیگر' },
  { key: 'can_manage_leads', label: 'تخصیص شماره‌های لید سرد به دیگران' },
  { key: 'can_approve_leaves', label: 'تایید یا رد درخواست‌های مرخصی همکاران' },
  { key: 'can_approve_advances', label: 'بررسی و تایید درخواست‌های مساعده مالی' },
  { key: 'can_manage_tenants', label: 'مدیریت سازمان‌ها، شعب و ایجاد سازمان جدید' },
];

interface TeamManagementViewProps {
  initialSubTab?: TeamSubTab;
  personnelList: Personnel[];
  customers: Customer[];
  leaveRequests: LeaveRequest[];
  currentPersonnel: Personnel | null;
  isAdmin: boolean;
  tenants?: Tenant[];
  activeTenantId?: string;
  onOpenTenantsModal?: () => void;
  onCreatePersonnel: (payload: CreateColleaguePayload) => Promise<void>;
  onUpdatePersonnel: (id: string, payload: Partial<Personnel>) => Promise<void>;
  onDeletePersonnel: (id: string) => Promise<void>;
  onBulkExtendOwnership: (customerIds: string[], days: number) => Promise<void>;
  onBulkSwitchOwnership: (customerIds: string[], targetPersonnelId: string, targetPersonnelName: string, days: number) => Promise<void>;
  onUpdateLeaveStatus: (id: string, status: RequestStatus, managerNote?: string) => Promise<void>;
  onSelectCustomer: (customer: Customer) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const TeamManagementView: React.FC<TeamManagementViewProps> = ({
  initialSubTab = 'colleagues_list',
  personnelList,
  customers,
  leaveRequests,
  currentPersonnel,
  isAdmin,
  tenants = [],
  activeTenantId = 'default',
  onOpenTenantsModal,
  onCreatePersonnel,
  onUpdatePersonnel,
  onDeletePersonnel,
  onBulkExtendOwnership,
  onBulkSwitchOwnership,
  onUpdateLeaveStatus,
  onSelectCustomer,
  showToast,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<TeamSubTab>(initialSubTab);

  // Sync with prop when sidebar changes
  React.useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  // -------------------------------------------------------------
  // TAB 1: New Colleague Form State
  // -------------------------------------------------------------
  const [colleagueName, setColleagueName] = useState('');
  const [colleagueUsername, setColleagueUsername] = useState('');
  const [colleagueEmail, setColleagueEmail] = useState('');
  const [colleagueRole, setColleagueRole] = useState<PersonnelRole>('marketer');
  const [colleaguePassword, setColleaguePassword] = useState('');
  const [colleagueTenantId, setColleagueTenantId] = useState(
    activeTenantId && activeTenantId !== 'all' ? activeTenantId : 'default'
  );
  const [colleagueAllowedTenantIds, setColleagueAllowedTenantIds] = useState<string[]>([]);
  const [isSubmittingPersonnel, setIsSubmittingPersonnel] = useState(false);

  // Multiple contact numbers state
  const [colleaguePhones, setColleaguePhones] = useState<Array<{ id: string; label: string; number: string }>>([
    { id: 'phone-1', label: 'موبایل اصلی', number: '' },
  ]);

  // Family Contacts State (اطلاعات تماس بستگان و خانواده همکار)
  const [colleagueFamilyContacts, setColleagueFamilyContacts] = useState<Array<{
    id: string;
    name: string;
    relation: string;
    phone: string;
    phone2?: string;
    notes?: string;
  }>>([
    { id: 'fc-1', name: '', relation: 'پدر', phone: '', phone2: '', notes: '' },
  ]);

  const handleAddColleagueFamilyContact = () => {
    setColleagueFamilyContacts((prev) => [
      ...prev,
      { id: 'fc-' + Date.now(), name: '', relation: 'پدر', phone: '', phone2: '', notes: '' },
    ]);
  };

  const handleRemoveColleagueFamilyContact = (id: string) => {
    if (colleagueFamilyContacts.length <= 1) return;
    setColleagueFamilyContacts((prev) => prev.filter((f) => f.id !== id));
  };

  const handleChangeColleagueFamilyContact = (
    id: string,
    field: 'name' | 'relation' | 'phone' | 'phone2' | 'notes',
    val: string
  ) => {
    setColleagueFamilyContacts((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: val } : item))
    );
  };

  // Granular permissions state
  const [allowedMenus, setAllowedMenus] = useState<string[]>(
    PERSONNEL_ROLE_CONFIG['marketer'].defaultMenus
  );
  const [actionPermissions, setActionPermissions] = useState<Record<string, boolean>>({
    can_view_all_customers: false,
    can_edit_customer: true,
    can_delete_customer: false,
    can_export_data: false,
    can_extend_ownership: false,
    can_switch_ownership: false,
    can_manage_leads: false,
    can_approve_leaves: false,
    can_approve_advances: false,
    can_manage_tenants: false,
  });
  const [reportScope, setReportScope] = useState<'all' | 'own_only' | 'specific_personnel'>('own_only');
  const [visibleReportPersonnelIds, setVisibleReportPersonnelIds] = useState<string[]>([]);

  const handleRoleChange = (newRole: PersonnelRole) => {
    setColleagueRole(newRole);
    const config = PERSONNEL_ROLE_CONFIG[newRole];
    if (config) {
      setAllowedMenus([...config.defaultMenus]);
      setReportScope(config.defaultReportScope);
      if (newRole === 'admin') {
        setActionPermissions({
          can_view_all_customers: true,
          can_edit_customer: true,
          can_delete_customer: true,
          can_export_data: true,
          can_extend_ownership: true,
          can_switch_ownership: true,
          can_manage_leads: true,
          can_approve_leaves: true,
          can_approve_advances: true,
          can_manage_tenants: true,
        });
      } else if (newRole === 'sales_manager') {
        setActionPermissions({
          can_view_all_customers: true,
          can_edit_customer: true,
          can_delete_customer: false,
          can_export_data: true,
          can_extend_ownership: true,
          can_switch_ownership: true,
          can_manage_leads: true,
          can_approve_leaves: true,
          can_approve_advances: false,
          can_manage_tenants: false,
        });
      } else {
        setActionPermissions({
          can_view_all_customers: false,
          can_edit_customer: true,
          can_delete_customer: false,
          can_export_data: false,
          can_extend_ownership: false,
          can_switch_ownership: false,
          can_manage_leads: false,
          can_approve_leaves: false,
          can_approve_advances: false,
          can_manage_tenants: false,
        });
      }
    }
  };

  const handleAddColleaguePhone = () => {
    setColleaguePhones((prev) => [
      ...prev,
      { id: 'phone-' + Date.now(), label: 'شماره دوم', number: '' },
    ]);
  };

  const handleRemoveColleaguePhone = (id: string) => {
    if (colleaguePhones.length <= 1) return;
    setColleaguePhones((prev) => prev.filter((p) => p.id !== id));
  };

  const handleChangeColleaguePhone = (id: string, field: 'label' | 'number', val: string) => {
    setColleaguePhones((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: val } : item))
    );
  };

  const handleRegisterColleague = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!colleagueName.trim() || !colleagueEmail.trim()) {
      showToast('نام و ایمیل همکار الزامی است.', 'error');
      return;
    }
    setIsSubmittingPersonnel(true);
    try {
      const primaryPhone = colleaguePhones[0]?.number?.trim() || '';
      const cleanPhones = colleaguePhones
        .filter((p) => p.number.trim().length > 0)
        .map((p) => ({
          id: p.id,
          label: p.label.trim() || 'شماره تماس',
          number: p.number.trim(),
        }));

      const cleanFamilyContacts: FamilyContact[] = colleagueFamilyContacts
        .filter((f) => f.name.trim() || f.phone.trim())
        .map((f) => ({
          id: f.id,
          name: f.name.trim(),
          relation: f.relation.trim() || 'بستگان',
          phone: f.phone.trim(),
          phone2: f.phone2?.trim() || undefined,
          notes: f.notes?.trim() || undefined,
        }));

      const primaryFamily = cleanFamilyContacts[0];

      const effectiveAllowed = colleagueAllowedTenantIds.length > 0
        ? Array.from(new Set([colleagueTenantId, ...colleagueAllowedTenantIds]))
        : [colleagueTenantId || 'default'];

      const permissions: PersonnelPermissions = {
        allowed_menus: allowedMenus,
        ...actionPermissions,
        can_manage_tenants: Boolean(actionPermissions.can_manage_tenants),
        allowed_tenant_ids: effectiveAllowed,
        report_view_scope: reportScope,
        visible_report_personnel_ids: reportScope === 'specific_personnel' ? visibleReportPersonnelIds : [],
      };

      await onCreatePersonnel({
        name: colleagueName.trim(),
        username: colleagueUsername.trim() || undefined,
        email: colleagueEmail.trim(),
        phone: primaryPhone,
        phones: cleanPhones,
        tenant_id: colleagueTenantId || 'default',
        allowed_tenant_ids: effectiveAllowed,
        emergency_contact_name: primaryFamily?.name || undefined,
        emergency_contact_phone: primaryFamily?.phone || undefined,
        emergency_contact_relation: primaryFamily?.relation || undefined,
        family_contacts: cleanFamilyContacts.length > 0 ? cleanFamilyContacts : undefined,
        role: colleagueRole,
        permissions,
        password: colleaguePassword.trim() || undefined,
        status: 'active',
      });
      showToast(`همکار جدید «${colleagueName}» با موفقیت افزوده شد.`, 'success');
      setColleagueName('');
      setColleagueUsername('');
      setColleagueEmail('');
      setColleaguePhones([{ id: 'phone-1', label: 'موبایل اصلی', number: '' }]);
      setColleagueFamilyContacts([{ id: 'fc-1', name: '', relation: 'پدر', phone: '', phone2: '', notes: '' }]);
      setColleagueAllowedTenantIds([]);
      setColleaguePassword('');
      setActiveSubTab('colleagues_list');
    } catch (err: any) {
      showToast(err.message || 'خطا در ثبت همکار جدید', 'error');
    } finally {
      setIsSubmittingPersonnel(false);
    }
  };

  // -------------------------------------------------------------
  // TAB 2: Colleagues List Search & Edit Modal State
  // -------------------------------------------------------------
  const [personnelSearch, setPersonnelSearch] = useState('');
  const [selectedTenantFilter, setSelectedTenantFilter] = useState<string>('all');
  const [viewingFamilyModalPersonnel, setViewingFamilyModalPersonnel] = useState<Personnel | null>(null);
  const [editingColleague, setEditingColleague] = useState<Personnel | null>(null);
  const [isUpdatingColleague, setIsUpdatingColleague] = useState(false);

  // Edit Colleague multi-phones, family contacts, and permissions state
  const [editingPhones, setEditingPhones] = useState<Array<{ id: string; label: string; number: string }>>([]);
  const [editingFamilyContacts, setEditingFamilyContacts] = useState<FamilyContact[]>([]);
  const [editingTenantId, setEditingTenantId] = useState<string>('default');
  const [editingAllowedTenantIds, setEditingAllowedTenantIds] = useState<string[]>([]);
  const [editingRole, setEditingRole] = useState<PersonnelRole>('marketer');
  const [editingAllowedMenus, setEditingAllowedMenus] = useState<string[]>([]);
  const [editingActionPermissions, setEditingActionPermissions] = useState<Record<string, boolean>>({});
  const [editingReportScope, setEditingReportScope] = useState<'all' | 'own_only' | 'specific_personnel'>('own_only');
  const [editingVisibleReportPersonnelIds, setEditingVisibleReportPersonnelIds] = useState<string[]>([]);

  const handleAddEditingFamilyContact = () => {
    setEditingFamilyContacts((prev) => [
      ...prev,
      { id: 'efc-' + Date.now(), name: '', relation: 'پدر', phone: '', phone2: '', notes: '' },
    ]);
  };

  const handleRemoveEditingFamilyContact = (id: string) => {
    if (editingFamilyContacts.length <= 1) return;
    setEditingFamilyContacts((prev) => prev.filter((f) => f.id !== id));
  };

  const handleChangeEditingFamilyContact = (
    id: string,
    field: 'name' | 'relation' | 'phone' | 'phone2' | 'notes',
    val: string
  ) => {
    setEditingFamilyContacts((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: val } : item))
    );
  };

  const openEditColleague = (p: Personnel) => {
    setEditingColleague(p);
    setEditingRole((p.role as PersonnelRole) || 'marketer');
    const primaryTenant = p.tenant_id || 'default';
    setEditingTenantId(primaryTenant);
    
    const initialAllowed = p.allowed_tenant_ids || p.permissions?.allowed_tenant_ids || [primaryTenant];
    setEditingAllowedTenantIds(initialAllowed);

    // Parse phones
    if (p.phones && Array.isArray(p.phones) && p.phones.length > 0) {
      setEditingPhones(
        p.phones.map((item, idx) => {
          if (typeof item === 'string') {
            return { id: `ep-${idx}`, label: idx === 0 ? 'موبایل اصلی' : 'شماره دیگر', number: item };
          }
          return { id: item.id || `ep-${idx}`, label: item.label || 'شماره تماس', number: item.number || '' };
        })
      );
    } else if (p.phone) {
      setEditingPhones([{ id: 'ep-1', label: 'موبایل اصلی', number: p.phone }]);
    } else {
      setEditingPhones([{ id: 'ep-1', label: 'موبایل اصلی', number: '' }]);
    }

    // Parse family contacts
    if (p.family_contacts && Array.isArray(p.family_contacts) && p.family_contacts.length > 0) {
      setEditingFamilyContacts(
        p.family_contacts.map((f, i) => ({
          id: f.id || `efc-${i}`,
          name: f.name || '',
          relation: f.relation || 'پدر',
          phone: f.phone || '',
          phone2: f.phone2 || '',
          notes: f.notes || '',
        }))
      );
    } else if (p.emergency_contact_phone || p.emergency_contact_name) {
      setEditingFamilyContacts([
        {
          id: 'efc-1',
          name: p.emergency_contact_name || '',
          relation: p.emergency_contact_relation || 'پدر',
          phone: p.emergency_contact_phone || '',
          phone2: '',
          notes: '',
        },
      ]);
    } else {
      setEditingFamilyContacts([
        { id: 'efc-1', name: '', relation: 'پدر', phone: '', phone2: '', notes: '' },
      ]);
    }

    // Parse permissions
    const perms = p.permissions;
    const defaultMenus = PERSONNEL_ROLE_CONFIG[(p.role as PersonnelRole) || 'marketer']?.defaultMenus || [
      'dashboard',
      'customers',
      'reports',
      'admin_reports',
      'personal_portal',
    ];
    setEditingAllowedMenus(perms?.allowed_menus || defaultMenus);

    setEditingActionPermissions({
      can_view_all_customers: Boolean(perms?.can_view_all_customers || p.role === 'admin' || p.role === 'sales_manager'),
      can_edit_customer: perms?.can_edit_customer !== false,
      can_delete_customer: Boolean(perms?.can_delete_customer || p.role === 'admin'),
      can_export_data: Boolean(perms?.can_export_data || p.role === 'admin' || p.role === 'sales_manager'),
      can_extend_ownership: Boolean(perms?.can_extend_ownership || p.role === 'admin' || p.role === 'sales_manager'),
      can_switch_ownership: Boolean(perms?.can_switch_ownership || p.role === 'admin' || p.role === 'sales_manager'),
      can_manage_leads: Boolean(perms?.can_manage_leads || p.role === 'admin' || p.role === 'sales_manager'),
      can_approve_leaves: Boolean(perms?.can_approve_leaves || p.role === 'admin'),
      can_approve_advances: Boolean(perms?.can_approve_advances || p.role === 'admin'),
      can_manage_tenants: Boolean(perms?.can_manage_tenants || p.role === 'admin'),
    });

    setEditingReportScope(perms?.report_view_scope || (p.role === 'admin' || p.role === 'sales_manager' ? 'all' : 'own_only'));
    setEditingVisibleReportPersonnelIds(perms?.visible_report_personnel_ids || []);
  };

  const filteredPersonnel = useMemo(() => {
    return personnelList.filter((p) => {
      if (selectedTenantFilter !== 'all') {
        const pTenant = p.tenant_id || 'default';
        if (pTenant !== selectedTenantFilter) return false;
      }
      if (!personnelSearch.trim()) return true;
      const q = personnelSearch.toLowerCase();
      const hasPhone = p.phone?.includes(q) || (Array.isArray(p.phones) && p.phones.some((ph) => (typeof ph === 'string' ? ph : ph.number)?.includes(q)));
      return (
        p.name?.toLowerCase().includes(q) ||
        p.username?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q) ||
        hasPhone
      );
    });
  }, [personnelList, personnelSearch, selectedTenantFilter]);

  const handleSaveColleagueEdit = async () => {
    if (!editingColleague) return;
    setIsUpdatingColleague(true);
    try {
      const primaryPhone = editingPhones[0]?.number?.trim() || editingColleague.phone || '';
      const cleanPhones = editingPhones
        .filter((p) => p.number.trim().length > 0)
        .map((p) => ({
          id: p.id,
          label: p.label.trim() || 'شماره تماس',
          number: p.number.trim(),
        }));

      const cleanFamilyContacts: FamilyContact[] = editingFamilyContacts
        .filter((f) => f.name.trim() || f.phone.trim())
        .map((f) => ({
          id: f.id,
          name: f.name.trim(),
          relation: f.relation.trim() || 'بستگان',
          phone: f.phone.trim(),
          phone2: f.phone2?.trim() || undefined,
          notes: f.notes?.trim() || undefined,
        }));

      const primaryFamily = cleanFamilyContacts[0];

      const effectiveAllowed = editingAllowedTenantIds.length > 0
        ? Array.from(new Set([editingTenantId, ...editingAllowedTenantIds]))
        : [editingTenantId || 'default'];

      const permissions: PersonnelPermissions = {
        allowed_menus: editingAllowedMenus,
        ...editingActionPermissions,
        can_manage_tenants: Boolean(editingActionPermissions.can_manage_tenants),
        allowed_tenant_ids: effectiveAllowed,
        report_view_scope: editingReportScope,
        visible_report_personnel_ids:
          editingReportScope === 'specific_personnel' ? editingVisibleReportPersonnelIds : [],
      };

      await onUpdatePersonnel(editingColleague.id, {
        name: editingColleague.name,
        username: editingColleague.username,
        email: editingColleague.email,
        phone: primaryPhone,
        phones: cleanPhones,
        tenant_id: editingTenantId || 'default',
        allowed_tenant_ids: effectiveAllowed,
        emergency_contact_name: primaryFamily?.name || undefined,
        emergency_contact_phone: primaryFamily?.phone || undefined,
        emergency_contact_relation: primaryFamily?.relation || undefined,
        family_contacts: cleanFamilyContacts.length > 0 ? cleanFamilyContacts : undefined,
        role: editingRole,
        permissions,
        status: editingColleague.status,
      });
      showToast('مشخصات و دسترسی‌های همکار با موفقیت به‌روزرسانی شد.', 'success');
      setEditingColleague(null);
    } catch (err: any) {
      showToast(err.message || 'خطا در ویرایش همکار', 'error');
    } finally {
      setIsUpdatingColleague(false);
    }
  };

  // -------------------------------------------------------------
  // TAB 3: Extend Ownership State (تمدید مالکیت)
  // -------------------------------------------------------------
  const [extendMarketerFilter, setExtendMarketerFilter] = useState<string>('all');
  const [extendSearch, setExtendSearch] = useState('');
  const [selectedExtendCustomerIds, setSelectedExtendCustomerIds] = useState<string[]>([]);
  const [extendDaysCount, setExtendDaysCount] = useState<number>(7);
  const [isSubmittingExtend, setIsSubmittingExtend] = useState(false);

  const extendEligibleCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (extendMarketerFilter !== 'all' && c.assigned_marketer_id !== extendMarketerFilter) {
        return false;
      }
      if (extendSearch.trim()) {
        const q = extendSearch.toLowerCase();
        const matchName = c.company_name?.toLowerCase().includes(q);
        const matchManager = c.manager_name?.toLowerCase().includes(q);
        if (!matchName && !matchManager) return false;
      }
      return true;
    });
  }, [customers, extendMarketerFilter, extendSearch]);

  const handleToggleSelectExtend = (id: string) => {
    setSelectedExtendCustomerIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllExtend = () => {
    if (selectedExtendCustomerIds.length === extendEligibleCustomers.length) {
      setSelectedExtendCustomerIds([]);
    } else {
      setSelectedExtendCustomerIds(extendEligibleCustomers.map((c) => c.id));
    }
  };

  const handleConfirmExtendOwnership = async () => {
    if (selectedExtendCustomerIds.length === 0) {
      showToast('لطفاً حداقل یک مشتری را انتخاب کنید.', 'error');
      return;
    }
    setIsSubmittingExtend(true);
    try {
      await onBulkExtendOwnership(selectedExtendCustomerIds, extendDaysCount);
      showToast(
        `مهلت مالکیت ${toPersianDigits(selectedExtendCustomerIds.length)} پرونده با موفقیت ${toPersianDigits(extendDaysCount)} روز تمدید شد.`,
        'success'
      );
      setSelectedExtendCustomerIds([]);
    } catch (err: any) {
      showToast(err.message || 'خطا در تمدید مهلت پرونده‌ها', 'error');
    } finally {
      setIsSubmittingExtend(false);
    }
  };

  // -------------------------------------------------------------
  // TAB 4: Switch Ownership State (سوئیچ مالکیت)
  // -------------------------------------------------------------
  const [sourceMarketerId, setSourceMarketerId] = useState<string>('all');
  const [targetMarketerId, setTargetMarketerId] = useState<string>('');
  const [switchSearch, setSwitchSearch] = useState('');
  const [selectedSwitchCustomerIds, setSelectedSwitchCustomerIds] = useState<string[]>([]);
  const [switchDurationDays, setSwitchDurationDays] = useState<number>(7);
  const [isSubmittingSwitch, setIsSubmittingSwitch] = useState(false);

  const switchEligibleCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (sourceMarketerId !== 'all' && c.assigned_marketer_id !== sourceMarketerId) {
        return false;
      }
      if (switchSearch.trim()) {
        const q = switchSearch.toLowerCase();
        const matchName = c.company_name?.toLowerCase().includes(q);
        const matchManager = c.manager_name?.toLowerCase().includes(q);
        if (!matchName && !matchManager) return false;
      }
      return true;
    });
  }, [customers, sourceMarketerId, switchSearch]);

  const handleToggleSelectSwitch = (id: string) => {
    setSelectedSwitchCustomerIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllSwitch = () => {
    if (selectedSwitchCustomerIds.length === switchEligibleCustomers.length) {
      setSelectedSwitchCustomerIds([]);
    } else {
      setSelectedSwitchCustomerIds(switchEligibleCustomers.map((c) => c.id));
    }
  };

  const handleConfirmSwitchOwnership = async () => {
    if (selectedSwitchCustomerIds.length === 0) {
      showToast('لطفاً حداقل یک پرونده را برای انتقال انتخاب کنید.', 'error');
      return;
    }
    if (!targetMarketerId) {
      showToast('لطفاً همکار مقصد را برای تحویل پرونده‌ها مشخص کنید.', 'error');
      return;
    }
    const targetObj = personnelList.find((p) => p.id === targetMarketerId);
    const targetName = targetObj?.name || 'همکار منتخب';

    setIsSubmittingSwitch(true);
    try {
      await onBulkSwitchOwnership(
        selectedSwitchCustomerIds,
        targetMarketerId,
        targetName,
        switchDurationDays
      );
      showToast(
        `مالکیت ${toPersianDigits(selectedSwitchCustomerIds.length)} پرونده با موفقیت به «${targetName}» واگذار شد.`,
        'success'
      );
      setSelectedSwitchCustomerIds([]);
    } catch (err: any) {
      showToast(err.message || 'خطا در واگذاری پرونده‌ها', 'error');
    } finally {
      setIsSubmittingSwitch(false);
    }
  };

  // -------------------------------------------------------------
  // TAB 5: Leave Approvals State (تایید مرخصی‌ها)
  // -------------------------------------------------------------
  const [leaveStatusFilter, setLeaveStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [leaveSearch, setLeaveSearch] = useState('');
  const [reviewingLeave, setReviewingLeave] = useState<LeaveRequest | null>(null);
  const [reviewAction, setReviewAction] = useState<RequestStatus>('approved');
  const [reviewManagerNote, setReviewManagerNote] = useState('');
  const [isProcessingLeaveReview, setIsProcessingLeaveReview] = useState(false);

  const filteredLeaves = useMemo(() => {
    return leaveRequests.filter((l) => {
      if (leaveStatusFilter !== 'all' && l.status !== leaveStatusFilter) return false;
      if (leaveSearch.trim()) {
        const q = leaveSearch.toLowerCase();
        const matchName = l.personnel_name?.toLowerCase().includes(q);
        const matchReason = l.reason?.toLowerCase().includes(q);
        if (!matchName && !matchReason) return false;
      }
      return true;
    });
  }, [leaveRequests, leaveStatusFilter, leaveSearch]);

  const handleConfirmLeaveReview = async () => {
    if (!reviewingLeave) return;
    setIsProcessingLeaveReview(true);
    try {
      await onUpdateLeaveStatus(reviewingLeave.id, reviewAction, reviewManagerNote);
      showToast(
        `درخواست مرخصی با موفقیت ${reviewAction === 'approved' ? 'تایید' : 'رد'} شد.`,
        'success'
      );
      setReviewingLeave(null);
      setReviewManagerNote('');
    } catch (err: any) {
      showToast(err.message || 'خطا در ثبت وضعیت مرخصی', 'error');
    } finally {
      setIsProcessingLeaveReview(false);
    }
  };

  const pendingLeavesCount = leaveRequests.filter((r) => r.status === 'pending').length;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* ------------------------------------------------------------- */}
      {/* 1. TOP HEADER & SUB-MENUS                                     */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-[#121212] border border-[#282828] rounded-2xl p-3.5 sm:p-6 shadow-xl space-y-3.5 sm:space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-2xl bg-gradient-to-br from-[#1DB954] to-[#14833b] text-black font-black text-lg sm:text-xl flex items-center justify-center shadow-lg shadow-[#1DB954]/20 overflow-hidden border-2 border-[#1DB954] flex-shrink-0">
              <Users2 className="w-5 sm:w-6 h-5 sm:h-6 text-black stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-2xl font-black text-white tracking-tight">
                  مدیریت همکاران و دسترسی‌ها
                </h1>
                <span className="text-[10px] sm:text-[11px] px-2 sm:px-2.5 py-0.5 rounded-full bg-[#1DB954]/15 text-[#1DB954] font-bold border border-[#1DB954]/30">
                  پنل مدیریت
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-[#A7A7A7] mt-0.5">
                تعریف پرسنل، چند راه تماس، تمدید مهلت و تنظیم ریز دسترسی‌ها
              </p>
            </div>
          </div>
        </div>

        {/* Sub-menu Tabs */}
        <div className="flex items-center gap-1.5 sm:gap-2 border-t border-[#222] pt-3 overflow-x-auto scrollbar-none whitespace-nowrap pb-1">
          <button
            onClick={() => setActiveSubTab('new_colleague')}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all flex-shrink-0 ${
              activeSubTab === 'new_colleague'
                ? 'bg-[#1DB954] text-black shadow-lg shadow-[#1DB954]/25 scale-[1.02]'
                : 'bg-[#181818] hover:bg-[#222] text-[#B3B3B3] hover:text-white border border-[#282828]'
            }`}
          >
            <UserPlus className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
            <span>ثبت همکار جدید</span>
          </button>

          <button
            onClick={() => setActiveSubTab('colleagues_list')}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all flex-shrink-0 ${
              activeSubTab === 'colleagues_list'
                ? 'bg-[#1DB954] text-black shadow-lg shadow-[#1DB954]/25 scale-[1.02]'
                : 'bg-[#181818] hover:bg-[#222] text-[#B3B3B3] hover:text-white border border-[#282828]'
            }`}
          >
            <Users2 className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
            <span>لیست همکاران ({toPersianDigits(personnelList.length)})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('extend_ownership')}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all flex-shrink-0 ${
              activeSubTab === 'extend_ownership'
                ? 'bg-[#1DB954] text-black shadow-lg shadow-[#1DB954]/25 scale-[1.02]'
                : 'bg-[#181818] hover:bg-[#222] text-[#B3B3B3] hover:text-white border border-[#282828]'
            }`}
          >
            <Clock className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
            <span>تمدید مالکیت پرونده‌ها</span>
          </button>

          <button
            onClick={() => setActiveSubTab('switch_ownership')}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all flex-shrink-0 ${
              activeSubTab === 'switch_ownership'
                ? 'bg-[#1DB954] text-black shadow-lg shadow-[#1DB954]/25 scale-[1.02]'
                : 'bg-[#181818] hover:bg-[#222] text-[#B3B3B3] hover:text-white border border-[#282828]'
            }`}
          >
            <ArrowLeftRight className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
            <span>انتقال مالکیت</span>
          </button>

          <button
            onClick={() => setActiveSubTab('leave_approvals')}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all flex-shrink-0 relative ${
              activeSubTab === 'leave_approvals'
                ? 'bg-[#1DB954] text-black shadow-lg shadow-[#1DB954]/25 scale-[1.02]'
                : 'bg-[#181818] hover:bg-[#222] text-[#B3B3B3] hover:text-white border border-[#282828]'
            }`}
          >
            <CalendarCheck className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
            <span>درخواست‌های مرخصی</span>
            {pendingLeavesCount > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  activeSubTab === 'leave_approvals'
                    ? 'bg-black text-[#1DB954]'
                    : 'bg-amber-500 text-black'
                }`}
              >
                {toPersianDigits(pendingLeavesCount)}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. TAB CONTENT 1: Register New Colleague                      */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === 'new_colleague' && (
        <div className="max-w-4xl bg-[#181818] border border-[#282828] rounded-2xl p-5 sm:p-7 space-y-7 shadow-2xl">
          <div className="flex items-center justify-between border-b border-[#282828] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#1DB954]/15 border border-[#1DB954]/30 flex items-center justify-center text-[#1DB954]">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">ثبت و ایجاد همکار جدید</h3>
                <p className="text-xs text-[#888]">
                  تعریف عضو جدید، چند راه تماس، نقش سازمانی و تنظیم تیک‌به‌تیک سطوح دسترسی و گزارش‌ها
                </p>
              </div>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#222] border border-[#333] text-[11px] text-[#A7A7A7]">
              <Sparkles className="w-3.5 h-3.5 text-[#1DB954]" />
              <span>پیکربندی هوشمند دسترسی‌ها</span>
            </span>
          </div>

          <form onSubmit={handleRegisterColleague} className="space-y-6">
            {/* Section A: Identity & Credentials */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#1DB954]" />
                <span>۱. مشخصات هویتی و حساب کاربری</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 bg-[#141414] p-4 rounded-xl border border-[#262626]">
                <div>
                  <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
                    نام و نام خانوادگی <span className="text-[#E22134]">*</span>
                  </label>
                  <input
                    type="text"
                    value={colleagueName}
                    onChange={(e) => setColleagueName(e.target.value)}
                    placeholder="مثلاً: سارا احمدی"
                    required
                    className="w-full h-10 px-3 bg-[#1e1e1e] rounded-xl text-xs text-white border border-[#333] focus:border-[#1DB954] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5 flex items-center justify-between">
                    <span>نام کاربری یکتا</span>
                    <span className="text-[10px] text-[#777]">جهت ورود به سیستم</span>
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={colleagueUsername}
                    onChange={(e) => setColleagueUsername(e.target.value)}
                    placeholder="sara_ahmadi"
                    className="w-full h-10 px-3 bg-[#1e1e1e] rounded-xl text-xs text-white border border-[#333] focus:border-[#1DB954] focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
                    ایمیل سازمانی <span className="text-[#E22134]">*</span>
                  </label>
                  <input
                    type="email"
                    dir="ltr"
                    value={colleagueEmail}
                    onChange={(e) => setColleagueEmail(e.target.value)}
                    placeholder="sara.ahmadi@company.ir"
                    required
                    className="w-full h-10 px-3 bg-[#1e1e1e] rounded-xl text-xs text-white border border-[#333] focus:border-[#1DB954] focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-[#1DB954]" />
                      <span>سازمان / شعبه اصلی همکار</span>
                    </span>
                    {onOpenTenantsModal && (
                      <button
                        type="button"
                        onClick={onOpenTenantsModal}
                        className="text-[10px] text-[#1DB954] hover:underline"
                      >
                        + مدیریت شعب
                      </button>
                    )}
                  </label>
                  <select
                    value={colleagueTenantId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setColleagueTenantId(val);
                      if (!colleagueAllowedTenantIds.includes(val)) {
                        setColleagueAllowedTenantIds([...colleagueAllowedTenantIds, val]);
                      }
                    }}
                    className="w-full h-10 px-3 bg-[#1e1e1e] rounded-xl text-xs text-white border border-[#333] focus:border-[#1DB954] focus:outline-none cursor-pointer"
                  >
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                    {tenants.length === 0 && (
                      <option value="default">سازمان مرکزی آلفادسک</option>
                    )}
                  </select>
                </div>

                {tenants.length > 1 && (
                  <div className="sm:col-span-2 p-3.5 bg-[#161616] rounded-xl border border-[#2a2a2a] space-y-2">
                    <label className="block text-xs font-semibold text-[#CCC] flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-blue-400" />
                        <span>سازمان‌ها و شعب مجاز جهت سوییچ (عضویت در چند شعبه):</span>
                      </span>
                      <span className="text-[10px] text-[#888]">
                        کاربر غیرادمین فقط بین شعب تیک‌خورده مجاز به سوییچ خواهد بود
                      </span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                      {tenants.map((t) => {
                        const isChecked =
                          colleagueAllowedTenantIds.includes(String(t.id)) ||
                          colleagueTenantId === String(t.id);
                        return (
                          <label
                            key={t.id}
                            className={`p-2 rounded-lg border text-xs cursor-pointer flex items-center gap-2 select-none transition-colors ${
                              isChecked
                                ? 'bg-[#1a2e20]/60 border-[#1DB954]/50 text-white'
                                : 'bg-[#1c1c1c] border-[#2c2c2c] text-[#777] hover:text-[#bbb]'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={colleagueTenantId === String(t.id)}
                              onChange={(e) => {
                                const tId = String(t.id);
                                if (e.target.checked) {
                                  setColleagueAllowedTenantIds([
                                    ...colleagueAllowedTenantIds,
                                    tId,
                                  ]);
                                } else {
                                  setColleagueAllowedTenantIds(
                                    colleagueAllowedTenantIds.filter((id) => id !== tId)
                                  );
                                }
                              }}
                              className="accent-[#1DB954]"
                            />
                            <span className="truncate">{t.name}</span>
                            {colleagueTenantId === String(t.id) && (
                              <span className="text-[9px] text-[#1DB954] bg-[#1DB954]/10 px-1 py-0.2 rounded font-mono mr-auto">
                                شعبه اصلی
                              </span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#B3B3B3] mb-1.5">
                    کلمه عبور اولیه (اختیاری)
                  </label>
                  <input
                    type="password"
                    dir="ltr"
                    value={colleaguePassword}
                    onChange={(e) => setColleaguePassword(e.target.value)}
                    placeholder="حداقل ۶ کاراکتر (در صورت خالی بودن، بعداً توسط همکار یا مدیر قابل تنظیم است)"
                    className="w-full h-10 px-3 bg-[#1e1e1e] rounded-xl text-xs text-white border border-[#333] focus:border-[#1DB954] focus:outline-none font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Section B: Multiple Contact Numbers */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <Phone className="w-4 h-4 text-blue-400" />
                  <span>۲. شماره‌ها و راه‌های ارتباطی همکار (ثبت چند شماره)</span>
                </div>
                <button
                  type="button"
                  onClick={handleAddColleaguePhone}
                  className="px-3 py-1.5 rounded-lg bg-[#242424] hover:bg-[#303030] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors border border-[#3a3a3a]"
                >
                  <Plus className="w-3.5 h-3.5 text-[#1DB954]" />
                  <span>افزودن شماره تماس دیگر</span>
                </button>
              </div>

              <div className="space-y-2 bg-[#141414] p-4 rounded-xl border border-[#262626]">
                {colleaguePhones.map((ph, idx) => (
                  <div key={ph.id} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="w-full sm:w-48 flex-shrink-0">
                      <select
                        value={ph.label}
                        onChange={(e) => handleChangeColleaguePhone(ph.id, 'label', e.target.value)}
                        className="w-full h-10 px-3 bg-[#1e1e1e] rounded-xl text-xs text-white border border-[#333] focus:border-[#1DB954] focus:outline-none cursor-pointer"
                      >
                        {COMMON_PHONE_LABELS.map((lbl) => (
                          <option key={lbl} value={lbl}>
                            {lbl}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex-1 relative">
                      <input
                        type="text"
                        dir="ltr"
                        value={ph.number}
                        onChange={(e) => handleChangeColleaguePhone(ph.id, 'number', e.target.value)}
                        placeholder={idx === 0 ? '0912xxxxxxx (شماره اصلی)' : 'شماره تماس یا آیدی'}
                        className="w-full h-10 px-3 bg-[#1e1e1e] rounded-xl text-xs text-white border border-[#333] focus:border-[#1DB954] focus:outline-none font-mono"
                      />
                    </div>

                    {colleaguePhones.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveColleaguePhone(ph.id)}
                        className="h-10 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 flex items-center justify-center transition-colors flex-shrink-0"
                        title="حذف این شماره"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <p className="text-[11px] text-[#777] pt-1">
                  * شماره اول به عنوان شماره تماس اصلی در سامانه‌های تماس سریع و پیام‌رسان استفاده خواهد شد.
                </p>
              </div>
            </div>

            {/* Section C: Family & Emergency Contacts */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <HeartHandshake className="w-4 h-4 text-rose-400" />
                  <span>۳. اطلاعات تماس بستگان و خانواده همکار (تماس اضطراری)</span>
                </div>
                <button
                  type="button"
                  onClick={handleAddColleagueFamilyContact}
                  className="px-3 py-1.5 rounded-lg bg-[#242424] hover:bg-[#303030] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors border border-[#3a3a3a]"
                >
                  <Plus className="w-3.5 h-3.5 text-[#1DB954]" />
                  <span>افزودن عضو دیگر خانواده</span>
                </button>
              </div>

              <div className="space-y-3 bg-[#141414] p-4 rounded-xl border border-[#262626]">
                <p className="text-[11px] text-[#888] leading-relaxed">
                  * ثبت شماره تماس خانواده و بستگان درجه یک جهت پیگیری‌های ضروری، حوادث غیرمترقبه و ارتباط سازمانی با خانواده همکار الزامی است.
                </p>

                {colleagueFamilyContacts.map((fc, idx) => (
                  <div
                    key={fc.id}
                    className="p-3 bg-[#1a1a1a] rounded-xl border border-[#2c2c2c] space-y-2.5"
                  >
                    <div className="flex items-center justify-between border-b border-[#262626] pb-2">
                      <span className="text-[11px] font-bold text-[#1DB954] flex items-center gap-1.5">
                        <HeartHandshake className="w-3.5 h-3.5" />
                        <span>عضو شماره {toPersianDigits(idx + 1)} خانواده</span>
                      </span>
                      {colleagueFamilyContacts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveColleagueFamilyContact(fc.id)}
                          className="text-rose-400 hover:text-rose-300 text-[11px] flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>حذف این عضو</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                      <div>
                        <label className="block text-[11px] text-[#A7A7A7] mb-1">
                          نام و نام خانوادگی عضو خانواده
                        </label>
                        <input
                          type="text"
                          value={fc.name}
                          onChange={(e) => handleChangeColleagueFamilyContact(fc.id, 'name', e.target.value)}
                          placeholder="مثلاً: احمد احمدی"
                          className="w-full h-9 px-2.5 bg-[#121212] rounded-lg text-xs text-white border border-[#333] focus:border-[#1DB954] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-[#A7A7A7] mb-1">
                          نسبت خانوادگی
                        </label>
                        <select
                          value={fc.relation}
                          onChange={(e) => handleChangeColleagueFamilyContact(fc.id, 'relation', e.target.value)}
                          className="w-full h-9 px-2.5 bg-[#121212] rounded-lg text-xs text-white border border-[#333] focus:border-[#1DB954] focus:outline-none cursor-pointer"
                        >
                          {FAMILY_RELATION_OPTIONS.map((rel) => (
                            <option key={rel} value={rel}>
                              {rel}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] text-[#A7A7A7] mb-1">
                          شماره تماس همراه (موبایل)
                        </label>
                        <input
                          type="text"
                          dir="ltr"
                          value={fc.phone}
                          onChange={(e) => handleChangeColleagueFamilyContact(fc.id, 'phone', e.target.value)}
                          placeholder="0912xxxxxxx"
                          className="w-full h-9 px-2.5 bg-[#121212] rounded-lg text-xs text-white border border-[#333] focus:border-[#1DB954] focus:outline-none font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-[#A7A7A7] mb-1">
                          تلفن منزل / شماره دوم (اختیاری)
                        </label>
                        <input
                          type="text"
                          dir="ltr"
                          value={fc.phone2 || ''}
                          onChange={(e) => handleChangeColleagueFamilyContact(fc.id, 'phone2', e.target.value)}
                          placeholder="021-xxxxxxxx"
                          className="w-full h-9 px-2.5 bg-[#121212] rounded-lg text-xs text-white border border-[#333] focus:border-[#1DB954] focus:outline-none font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <input
                        type="text"
                        value={fc.notes || ''}
                        onChange={(e) => handleChangeColleagueFamilyContact(fc.id, 'notes', e.target.value)}
                        placeholder="نشانی محل سکونت یا توضیحات بیشتر (اختیاری)"
                        className="w-full h-8 px-2.5 bg-[#121212] rounded-lg text-[11px] text-white border border-[#282828] focus:border-[#1DB954] focus:outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section D: Role Archetype Picker */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-purple-400" />
                <span>۴. انتخاب نقش سازمانی و الگوی دسترسی</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {(Object.keys(PERSONNEL_ROLE_CONFIG) as PersonnelRole[]).map((rKey) => {
                  const cfg = PERSONNEL_ROLE_CONFIG[rKey];
                  const Icon = cfg.icon;
                  const isSelected = colleagueRole === rKey;

                  return (
                    <button
                      type="button"
                      key={rKey}
                      onClick={() => handleRoleChange(rKey)}
                      className={`text-right p-3 rounded-xl border transition-all flex flex-col justify-between gap-2 ${
                        isSelected
                          ? 'bg-[#1e1e1e] border-[#1DB954] shadow-md shadow-[#1DB954]/10 ring-1 ring-[#1DB954]'
                          : 'bg-[#141414] border-[#282828] hover:border-[#383838] opacity-80 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-bold text-xs text-white flex items-center gap-1.5">
                          <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-[#1DB954]' : 'text-[#888]'}`} />
                          <span>{cfg.label}</span>
                        </span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#1DB954]" />}
                      </div>
                      <p className="text-[10px] text-[#888] leading-relaxed line-clamp-2">
                        {cfg.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section D: Granular Permissions Matrix */}
            <div className="space-y-4 bg-[#141414] p-5 rounded-2xl border border-[#262626]">
              <div className="flex items-center justify-between border-b border-[#242424] pb-3">
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-400" />
                  <span>۴. تنظیمات دسترسی ریزدانه (تیک زدن منوها و اختیارات)</span>
                </div>
                <span className="text-[11px] text-[#A7A7A7]">
                  نقش انتخاب‌شده: <span className="text-[#1DB954] font-bold">{PERSONNEL_ROLE_CONFIG[colleagueRole]?.label}</span>
                </span>
              </div>

              {/* D1. Allowed Menus */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-[#CCC] flex items-center justify-between">
                  <span>منوهای مجاز سامانه (کدام منوها را در سایدبار ببیند):</span>
                  <span className="text-[11px] font-mono text-[#1DB954]">
                    {toPersianDigits(allowedMenus.length)} از {toPersianDigits(SYSTEM_MENUS.length)} منو فعال
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {SYSTEM_MENUS.map((menu) => {
                    const MenuIcon = menu.icon;
                    const isChecked = allowedMenus.includes(menu.id);

                    return (
                      <label
                        key={menu.id}
                        className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center gap-2.5 select-none ${
                          isChecked
                            ? 'bg-[#1a2e20]/60 border-[#1DB954]/50 text-white'
                            : 'bg-[#181818] border-[#282828] text-[#888] hover:text-[#CCC]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAllowedMenus([...allowedMenus, menu.id]);
                            } else {
                              setAllowedMenus(allowedMenus.filter((m) => m !== menu.id));
                            }
                          }}
                          className="w-4 h-4 rounded text-[#1DB954] accent-[#1DB954] cursor-pointer"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate flex items-center gap-1.5">
                            <MenuIcon className={`w-3.5 h-3.5 flex-shrink-0 ${isChecked ? 'text-[#1DB954]' : 'text-[#666]'}`} />
                            <span className="truncate">{menu.label}</span>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* D2. Action Capabilities */}
              <div className="space-y-2 pt-2 border-t border-[#222]">
                <div className="text-xs font-semibold text-[#CCC]">
                  مجوزهای کاری و اختیارات عملیاتی (چه کارهایی بتواند انجام دهد):
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {SYSTEM_ACTIONS.map((action) => {
                    const isAllowed = Boolean(actionPermissions[action.key]);

                    return (
                      <label
                        key={action.key}
                        className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 select-none ${
                          isAllowed
                            ? 'bg-[#18231c] border-[#1DB954]/40 text-white'
                            : 'bg-[#181818] border-[#282828] text-[#777] hover:text-[#B3B3B3]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isAllowed}
                          onChange={(e) => {
                            setActionPermissions({
                              ...actionPermissions,
                              [action.key]: e.target.checked,
                            });
                          }}
                          className="w-4 h-4 mt-0.5 rounded text-[#1DB954] accent-[#1DB954] cursor-pointer flex-shrink-0"
                        />
                        <span className="text-xs leading-relaxed">{action.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* D3. Report View Scope (Whose reports can they see?) */}
              <div className="space-y-3 pt-2 border-t border-[#222]">
                <div className="text-xs font-semibold text-[#CCC] flex items-center justify-between">
                  <span>دامنه مشاهده گزارش کار پرسنل (گزارش کار کیا رو ببینه و کیا رو نبینه):</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <label
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-2.5 select-none ${
                      reportScope === 'all'
                        ? 'bg-[#1a2e20]/70 border-[#1DB954] text-white'
                        : 'bg-[#181818] border-[#282828] text-[#888]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="report_scope"
                      value="all"
                      checked={reportScope === 'all'}
                      onChange={() => setReportScope('all')}
                      className="accent-[#1DB954] cursor-pointer"
                    />
                    <div>
                      <div className="text-xs font-bold text-white">همه همکاران</div>
                      <div className="text-[10px] text-[#777]">مشاهده گزارش کار کل پرسنل</div>
                    </div>
                  </label>

                  <label
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-2.5 select-none ${
                      reportScope === 'own_only'
                        ? 'bg-[#1a2e20]/70 border-[#1DB954] text-white'
                        : 'bg-[#181818] border-[#282828] text-[#888]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="report_scope"
                      value="own_only"
                      checked={reportScope === 'own_only'}
                      onChange={() => setReportScope('own_only')}
                      className="accent-[#1DB954] cursor-pointer"
                    />
                    <div>
                      <div className="text-xs font-bold text-white">فقط گزارش کار خودش</div>
                      <div className="text-[10px] text-[#777]">عدم دسترسی به گزارش دیگران</div>
                    </div>
                  </label>

                  <label
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-2.5 select-none ${
                      reportScope === 'specific_personnel'
                        ? 'bg-[#1a2e20]/70 border-[#1DB954] text-white'
                        : 'bg-[#181818] border-[#282828] text-[#888]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="report_scope"
                      value="specific_personnel"
                      checked={reportScope === 'specific_personnel'}
                      onChange={() => setReportScope('specific_personnel')}
                      className="accent-[#1DB954] cursor-pointer"
                    />
                    <div>
                      <div className="text-xs font-bold text-white">همکاران مشخص و منتخب</div>
                      <div className="text-[10px] text-[#777]">فقط افراد انتخاب‌شده</div>
                    </div>
                  </label>
                </div>

                {/* Sub-selector for specific personnel */}
                {reportScope === 'specific_personnel' && (
                  <div className="p-3 bg-[#181818] rounded-xl border border-[#333] space-y-2 animate-in fade-in">
                    <div className="text-[11px] font-semibold text-[#BBB]">
                      تیک بزنید گزارش کار کدام یک از همکاران برای این فرد قابل رویت باشد:
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                      {personnelList.map((pers) => {
                        const isSelected = visibleReportPersonnelIds.includes(pers.id);
                        return (
                          <label
                            key={pers.id}
                            className={`p-2 rounded-lg border text-xs cursor-pointer flex items-center gap-2 ${
                              isSelected
                                ? 'bg-[#1DB954]/15 border-[#1DB954]/50 text-white'
                                : 'bg-[#121212] border-[#282828] text-[#888]'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setVisibleReportPersonnelIds([...visibleReportPersonnelIds, pers.id]);
                                } else {
                                  setVisibleReportPersonnelIds(
                                    visibleReportPersonnelIds.filter((id) => id !== pers.id)
                                  );
                                }
                              }}
                              className="accent-[#1DB954]"
                            />
                            <span className="truncate">{pers.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Submit Action */}
            <div className="pt-2 flex items-center justify-between border-t border-[#282828]">
              <div className="text-[11px] text-[#777]">
                با ثبت همکار، دسترسی‌ها فوراً اعمال شده و در حساب وی فعال می‌شود.
              </div>
              <button
                type="submit"
                disabled={isSubmittingPersonnel}
                className="px-6 py-2.5 rounded-xl bg-[#1DB954] hover:bg-[#1ed760] text-black font-extrabold text-xs shadow-lg shadow-[#1DB954]/25 transition-all flex items-center gap-2 hover:scale-[1.02]"
              >
                {isSubmittingPersonnel ? (
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Check className="w-4 h-4 stroke-[3]" />
                )}
                <span>ثبت و ذخیره مشخصات همکار</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. TAB CONTENT 2: Colleagues List                             */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === 'colleagues_list' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#181818] p-3 sm:p-4 rounded-2xl border border-[#282828]">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-[#888] absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={personnelSearch}
                onChange={(e) => setPersonnelSearch(e.target.value)}
                placeholder="جستجو بر اساس نام، ایمیل، شماره تماس..."
                className="w-full h-9 pr-9 pl-3 bg-[#121212] rounded-xl text-xs text-white border border-[#2c2c2c] focus:border-[#1DB954] focus:outline-none"
              />
            </div>

            {/* Organization / Tenant Filter */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#121212] border border-[#2c2c2c] text-xs text-[#B3B3B3]">
                <Building2 className="w-3.5 h-3.5 text-[#1DB954]" />
                <select
                  value={selectedTenantFilter}
                  onChange={(e) => setSelectedTenantFilter(e.target.value)}
                  className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
                >
                  <option value="all" className="bg-[#181818]">
                    همه سازمان‌ها ({toPersianDigits(personnelList.length)})
                  </option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id} className="bg-[#181818]">
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {onOpenTenantsModal && (
                <button
                  type="button"
                  onClick={onOpenTenantsModal}
                  className="p-2 rounded-xl bg-[#222] hover:bg-[#282828] text-[#888] hover:text-white transition-colors"
                  title="مدیریت سازمان‌ها و شعب"
                >
                  <Building2 className="w-4 h-4 text-[#1DB954]" />
                </button>
              )}
            </div>

            <button
              onClick={() => setActiveSubTab('new_colleague')}
              className="px-4 py-2 rounded-xl bg-[#1DB954] text-black font-bold text-xs flex items-center gap-1.5 shadow-md hover:bg-[#1ed760] transition-colors"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>افزودن همکار</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPersonnel.map((p) => {
              const assignedCusts = customers.filter((c) => c.assigned_marketer_id === p.id);
              const wonCusts = assignedCusts.filter((c) => c.status === 'قرارداد');
              const roleCfg = PERSONNEL_ROLE_CONFIG[p.role as PersonnelRole] || {
                label: p.role,
                badgeClass: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30',
                icon: UserCheck,
              };
              const RoleIcon = roleCfg.icon;

              // Build phone list for display
              const cardPhones: Array<{ label: string; number: string }> = [];
              if (p.phones && Array.isArray(p.phones) && p.phones.length > 0) {
                p.phones.forEach((item, idx) => {
                  if (typeof item === 'string') {
                    if (item.trim()) cardPhones.push({ label: idx === 0 ? 'موبایل اصلی' : 'شماره دیگر', number: item });
                  } else if (item && item.number) {
                    cardPhones.push({ label: item.label || 'شماره تماس', number: item.number });
                  }
                });
              } else if (p.phone) {
                cardPhones.push({ label: 'موبایل اصلی', number: p.phone });
              }

              const allowedCount = p.permissions?.allowed_menus?.length ?? (p.role === 'admin' ? 8 : 6);
              const scopeLabel =
                p.permissions?.report_view_scope === 'all' || p.role === 'admin'
                  ? 'همه همکاران'
                  : p.permissions?.report_view_scope === 'specific_personnel'
                  ? `${toPersianDigits(p.permissions?.visible_report_personnel_ids?.length || 0)} همکار منتخب`
                  : 'فقط گزارش خود';

              return (
                <div
                  key={p.id}
                  className="bg-[#181818] border border-[#282828] hover:border-[#383838] rounded-2xl p-4 sm:p-5 space-y-4 transition-all shadow-md hover:shadow-xl"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-[#222] border-2 border-[#1DB954] overflow-hidden flex items-center justify-center text-[#1DB954] font-bold text-base flex-shrink-0 shadow-md">
                        {p.avatar ? (
                          <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <span>{p.name.charAt(0)}</span>
                        )}
                      </div>
                      <div className="truncate">
                        <div className="font-bold text-sm text-white truncate flex items-center gap-1.5">
                          <span>{p.name}</span>
                          {p.role === 'admin' && (
                            <Shield className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${roleCfg.badgeClass}`}
                          >
                            <RoleIcon className="w-3 h-3" />
                            <span>{roleCfg.label}</span>
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#121212] border border-[#2c2c2c] text-[#A7A7A7]">
                            <Building2 className="w-3 h-3 text-[#1DB954]" />
                            <span>{p.tenant_name || 'سازمان مرکزی'}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditColleague(p)}
                        className="p-1.5 rounded-lg bg-[#222] text-[#A7A7A7] hover:text-white hover:bg-[#333] transition-colors"
                        title="ویرایش مشخصات و دسترسی‌ها"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-[#1DB954]" />
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm(`آیا از حذف همکار «${p.name}» اطمینان دارید؟`)) {
                            await onDeletePersonnel(p.id);
                            showToast(`همکار «${p.name}» با موفقیت حذف شد.`);
                          }
                        }}
                        className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors"
                        title="حذف همکار"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Contact info & multiple phone numbers */}
                  <div className="space-y-2 text-xs border-t border-[#242424] pt-3">
                    <div className="flex items-center justify-between text-xs text-[#999]">
                      <div className="flex items-center gap-2 truncate">
                        <Mail className="w-3.5 h-3.5 text-[#666] flex-shrink-0" />
                        <span className="font-mono text-[11px] truncate" dir="ltr">
                          {p.email}
                        </span>
                      </div>
                      {p.username && (
                        <span className="font-mono text-[10px] text-[#1DB954] bg-[#1DB954]/10 px-1.5 py-0.5 rounded" dir="ltr">
                          @{p.username}
                        </span>
                      )}
                    </div>

                    {/* Phones list */}
                    {cardPhones.length > 0 && (
                      <div className="space-y-1 pt-1">
                        {cardPhones.map((ph, phIdx) => (
                          <div
                            key={phIdx}
                            className="flex items-center justify-between text-xs bg-[#121212] px-2.5 py-1.5 rounded-lg border border-[#222]"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Phone className="w-3 h-3 text-[#1DB954] flex-shrink-0" />
                              <span className="text-[10px] text-[#888] truncate">{ph.label}:</span>
                              <a
                                href={`tel:${ph.number}`}
                                dir="ltr"
                                className="font-mono text-[11px] text-white hover:text-[#1DB954] transition-colors"
                              >
                                {ph.number}
                              </a>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(ph.number);
                                showToast(`شماره ${ph.number} در حافظه کپی شد.`, 'info');
                              }}
                              className="text-[#666] hover:text-white p-1 rounded"
                              title="کپی شماره"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Granular permissions overview badges */}
                  <div className="flex items-center flex-wrap gap-1.5 pt-2 border-t border-[#222] text-[10px]">
                    <span className="px-2 py-0.5 rounded-md bg-[#121212] border border-[#262626] text-[#BBB] flex items-center gap-1">
                      <Layers className="w-3 h-3 text-[#1DB954]" />
                      <span>{toPersianDigits(allowedCount)} منوی مجاز</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-[#121212] border border-[#262626] text-[#BBB] flex items-center gap-1">
                      <Eye className="w-3 h-3 text-blue-400" />
                      <span>دید گزارش: {scopeLabel}</span>
                    </span>
                  </div>

                  {/* Family Contacts Quick Action */}
                  <div className="pt-2 border-t border-[#222]">
                    {(p.family_contacts && p.family_contacts.length > 0) || p.emergency_contact_phone ? (
                      <button
                        type="button"
                        onClick={() => setViewingFamilyModalPersonnel(p)}
                        className="w-full py-1.5 px-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/25 text-[11px] font-semibold flex items-center justify-between transition-colors shadow-sm"
                      >
                        <span className="flex items-center gap-1.5">
                          <HeartHandshake className="w-3.5 h-3.5 text-rose-400" />
                          <span>اطلاعات تماس خانواده</span>
                        </span>
                        <span className="px-2 py-0.5 bg-rose-500/20 rounded-md text-[10px] font-bold text-rose-200">
                          {toPersianDigits(
                            p.family_contacts && p.family_contacts.length > 0
                              ? p.family_contacts.length
                              : 1
                          )}{' '}
                          عضو
                        </span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openEditColleague(p)}
                        className="w-full py-1.5 px-2.5 rounded-xl bg-[#141414] hover:bg-[#202020] text-[#777] hover:text-[#B3B3B3] border border-dashed border-[#2c2c2c] text-[11px] flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <HeartHandshake className="w-3.5 h-3.5 text-[#666]" />
                        <span>ثبت شماره تماس خانواده همکار</span>
                      </button>
                    )}
                  </div>

                  {/* Stats snippet */}
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-[#121212] p-2.5 rounded-xl border border-[#222]">
                    <div>
                      <div className="text-[10px] text-[#777] font-sans">پرونده‌های فعال</div>
                      <div className="text-white font-bold mt-0.5">
                        {toPersianDigits(assignedCusts.length)} مشتری
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#777] font-sans">قرارداد نهایی</div>
                      <div className="text-[#1DB954] font-bold mt-0.5">
                        {toPersianDigits(wonCusts.length)} فقره
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. TAB CONTENT 3: Extend Ownership (تمدید مالکیت مشتریان)     */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === 'extend_ownership' && (
        <div className="bg-[#181818] border border-[#282828] rounded-2xl p-5 sm:p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#282828] pb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#1DB954]" />
              <div>
                <h3 className="text-base font-bold text-white">تمدید مهلت مالکیت پرونده‌های مشتریان</h3>
                <p className="text-xs text-[#888]">
                  انتخاب پرونده‌های در آستانه انقضا و تمدید مهلت پیگیری بازاریاب مسئول
                </p>
              </div>
            </div>

            {/* Bulk Action Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-[#A7A7A7]">مدت تمدید:</span>
              <select
                value={extendDaysCount}
                onChange={(e) => setExtendDaysCount(Number(e.target.value))}
                className="h-9 px-3 bg-[#121212] rounded-xl text-xs text-white border border-[#333] focus:border-[#1DB954]"
              >
                <option value={3}>۳ روز</option>
                <option value={7}>۷ روز (یک هفته)</option>
                <option value={14}>۱۴ روز (دو هفته)</option>
                <option value={30}>۳۰ روز (یک ماه)</option>
              </select>

              <button
                onClick={handleConfirmExtendOwnership}
                disabled={isSubmittingExtend || selectedExtendCustomerIds.length === 0}
                className="px-4 py-2 rounded-xl bg-[#1DB954] hover:bg-[#1ed760] disabled:opacity-40 disabled:hover:bg-[#1DB954] text-black font-extrabold text-xs shadow-md transition-all flex items-center gap-1.5"
              >
                {isSubmittingExtend ? (
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Clock className="w-4 h-4 stroke-[2.5]" />
                )}
                <span>تمدید {toPersianDigits(selectedExtendCustomerIds.length)} پرونده</span>
              </button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#121212] p-3 rounded-xl border border-[#242424]">
            <div className="flex items-center gap-3 flex-1 min-w-[200px]">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#888] absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={extendSearch}
                  onChange={(e) => setExtendSearch(e.target.value)}
                  placeholder="جستجو در نام شرکت یا مدیریت..."
                  className="w-full h-8 pr-9 pl-3 bg-[#181818] rounded-lg text-xs text-white border border-[#2c2c2c] focus:outline-none"
                />
              </div>

              <select
                value={extendMarketerFilter}
                onChange={(e) => setExtendMarketerFilter(e.target.value)}
                className="h-8 px-2.5 bg-[#181818] rounded-lg text-xs text-white border border-[#2c2c2c]"
              >
                <option value="all">همه بازاریابان</option>
                {personnelList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleSelectAllExtend}
              className="text-xs text-[#1DB954] hover:underline font-semibold"
            >
              {selectedExtendCustomerIds.length === extendEligibleCustomers.length
                ? 'لغو انتخاب همه'
                : 'انتخاب همه پرونده‌ها'}
            </button>
          </div>

          {/* Customers Table */}
          <div className="space-y-2">
            {extendEligibleCustomers.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#888]">
                هیچ پرونده‌ای منطبق با فیلتر یافت نشد.
              </div>
            ) : (
              extendEligibleCustomers.map((c) => {
                const isSelected = selectedExtendCustomerIds.includes(c.id);
                const statusTheme = getStatusTheme(c.status);
                const timeRem = formatTimeRemaining(c.assignment_deadline);

                return (
                  <div
                    key={c.id}
                    onClick={() => handleToggleSelectExtend(c.id)}
                    className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#1DB954]/10 border-[#1DB954]/60'
                        : 'bg-[#121212] border-[#242424] hover:border-[#383838]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="w-4 h-4 rounded text-[#1DB954] accent-[#1DB954] cursor-pointer"
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-white truncate flex items-center gap-2">
                          <span>{c.company_name}</span>
                          <span
                            className={`text-[10px] px-2 py-0.2 rounded-full border ${statusTheme.bg} ${statusTheme.color}`}
                          >
                            {c.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#888] truncate mt-0.5">
                          مدیریت: {c.manager_name || 'نامشخص'} • بازاریاب مسئول: {c.assigned_marketer_name}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0 font-mono text-xs">
                      <span className={`text-[11px] px-2 py-0.5 rounded-md ${timeRem.badgeClass}`}>
                        {timeRem.text}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 5. TAB CONTENT 4: Switch Ownership (سوئیچ و واگذاری پرونده‌ها) */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === 'switch_ownership' && (
        <div className="bg-[#181818] border border-[#282828] rounded-2xl p-5 sm:p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#282828] pb-4">
            <div className="flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-blue-400" />
              <div>
                <h3 className="text-base font-bold text-white">سوئیچ و واگذاری مالکیت پرونده‌ها</h3>
                <p className="text-xs text-[#888]">
                  انتقال تکی یا گروهی پرونده‌ها از یک همکار به همکار دیگر همراه با تعیین مهلت جدید
                </p>
              </div>
            </div>

            {/* Target Colleague Selector & Submit Button */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-[#A7A7A7]">انتقال به همکار:</span>
              <select
                value={targetMarketerId}
                onChange={(e) => setTargetMarketerId(e.target.value)}
                className="h-9 px-3 bg-[#121212] rounded-xl text-xs text-white border border-[#333] focus:border-blue-500"
              >
                <option value="">-- انتخاب همکار مقصد --</option>
                {personnelList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.role === 'admin' ? 'مدیر' : 'بازاریاب'})
                  </option>
                ))}
              </select>

              <select
                value={switchDurationDays}
                onChange={(e) => setSwitchDurationDays(Number(e.target.value))}
                className="h-9 px-3 bg-[#121212] rounded-xl text-xs text-white border border-[#333] focus:border-blue-500"
              >
                <option value={3}>مهلت ۳ روز</option>
                <option value={7}>مهلت ۷ روز</option>
                <option value={14}>مهلت ۱۴ روز</option>
                <option value={30}>مهلت ۳۰ روز</option>
              </select>

              <button
                onClick={handleConfirmSwitchOwnership}
                disabled={isSubmittingSwitch || selectedSwitchCustomerIds.length === 0 || !targetMarketerId}
                className="px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-400 disabled:opacity-40 disabled:hover:bg-blue-500 text-black font-extrabold text-xs shadow-md transition-all flex items-center gap-1.5"
              >
                {isSubmittingSwitch ? (
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ArrowLeftRight className="w-4 h-4 stroke-[2.5]" />
                )}
                <span>واگذاری {toPersianDigits(selectedSwitchCustomerIds.length)} پرونده</span>
              </button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#121212] p-3 rounded-xl border border-[#242424]">
            <div className="flex items-center gap-3 flex-1 min-w-[200px]">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#888] absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={switchSearch}
                  onChange={(e) => setSwitchSearch(e.target.value)}
                  placeholder="جستجو در نام شرکت یا مدیریت..."
                  className="w-full h-8 pr-9 pl-3 bg-[#181818] rounded-lg text-xs text-white border border-[#2c2c2c] focus:outline-none"
                />
              </div>

              <select
                value={sourceMarketerId}
                onChange={(e) => setSourceMarketerId(e.target.value)}
                className="h-8 px-2.5 bg-[#181818] rounded-lg text-xs text-white border border-[#2c2c2c]"
              >
                <option value="all">همه بازاریابان مبدا</option>
                {personnelList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleSelectAllSwitch}
              className="text-xs text-blue-400 hover:underline font-semibold"
            >
              {selectedSwitchCustomerIds.length === switchEligibleCustomers.length
                ? 'لغو انتخاب همه'
                : 'انتخاب همه پرونده‌ها'}
            </button>
          </div>

          {/* Customers List */}
          <div className="space-y-2">
            {switchEligibleCustomers.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#888]">
                هیچ پرونده‌ای برای واگذاری یافت نشد.
              </div>
            ) : (
              switchEligibleCustomers.map((c) => {
                const isSelected = selectedSwitchCustomerIds.includes(c.id);
                const statusTheme = getStatusTheme(c.status);
                const timeRem = formatTimeRemaining(c.assignment_deadline);

                return (
                  <div
                    key={c.id}
                    onClick={() => handleToggleSelectSwitch(c.id)}
                    className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-500/10 border-blue-500/60'
                        : 'bg-[#121212] border-[#242424] hover:border-[#383838]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="w-4 h-4 rounded text-blue-500 accent-blue-500 cursor-pointer"
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-white truncate flex items-center gap-2">
                          <span>{c.company_name}</span>
                          <span
                            className={`text-[10px] px-2 py-0.2 rounded-full border ${statusTheme.bg} ${statusTheme.color}`}
                          >
                            {c.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#888] truncate mt-0.5">
                          بازاریاب فعلی: <span className="text-white font-semibold">{c.assigned_marketer_name}</span> • شهر: {c.city || 'نامشخص'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 flex-shrink-0 font-mono text-xs">
                      <span className={`text-[11px] px-2 py-0.5 rounded-md ${timeRem.badgeClass}`}>
                        {timeRem.text}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 6. TAB CONTENT 5: Leave Approvals (کارتابل تایید مرخصی‌ها)   */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === 'leave_approvals' && (
        <div className="bg-[#181818] border border-[#282828] rounded-2xl p-5 sm:p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#282828] pb-4">
            <div className="flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-[#1DB954]" />
              <div>
                <h3 className="text-base font-bold text-white">کارتابل تایید و بررسی مرخصی‌های پرسنل</h3>
                <p className="text-xs text-[#888]">
                  مشاهده، تایید یا رد درخواست‌های مرخصی ساعتی و روزانه به همراه ثبت توضیحات مدیریت
                </p>
              </div>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5 bg-[#121212] p-1 rounded-xl border border-[#282828]">
              <button
                onClick={() => setLeaveStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  leaveStatusFilter === 'all'
                    ? 'bg-[#282828] text-white'
                    : 'text-[#888] hover:text-white'
                }`}
              >
                همه ({toPersianDigits(leaveRequests.length)})
              </button>
              <button
                onClick={() => setLeaveStatusFilter('pending')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  leaveStatusFilter === 'pending'
                    ? 'bg-amber-500 text-black'
                    : 'text-[#888] hover:text-white'
                }`}
              >
                در انتظار ({toPersianDigits(pendingLeavesCount)})
              </button>
              <button
                onClick={() => setLeaveStatusFilter('approved')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  leaveStatusFilter === 'approved'
                    ? 'bg-emerald-500 text-black'
                    : 'text-[#888] hover:text-white'
                }`}
              >
                تایید شده
              </button>
              <button
                onClick={() => setLeaveStatusFilter('rejected')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  leaveStatusFilter === 'rejected'
                    ? 'bg-rose-500 text-white'
                    : 'text-[#888] hover:text-white'
                }`}
              >
                رد شده
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#888] absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={leaveSearch}
              onChange={(e) => setLeaveSearch(e.target.value)}
              placeholder="جستجو در نام پرسنل یا علت مرخصی..."
              className="w-full h-9 pr-9 pl-3 bg-[#121212] rounded-xl text-xs text-white border border-[#2c2c2c] focus:outline-none"
            />
          </div>

          {/* Leave Requests Table */}
          <div className="space-y-3">
            {filteredLeaves.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#888]">
                هیچ درخواست مرخصی در این وضعیت ثبت نشده است.
              </div>
            ) : (
              filteredLeaves.map((l) => (
                <div
                  key={l.id}
                  className="p-4 rounded-xl bg-[#121212] border border-[#242424] space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#282828] text-[#1DB954] flex items-center justify-center font-bold text-xs">
                        {l.personnel_name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-xs text-white">{l.personnel_name}</div>
                        <div className="text-[10px] text-[#777]">
                          ثبت‌شده در {formatPersianDateTime(l.date_created)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] px-2.5 py-1 rounded-full font-bold border ${
                          l.status === 'approved'
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : l.status === 'rejected'
                            ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                            : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                        }`}
                      >
                        {l.status === 'approved'
                          ? 'تایید شده'
                          : l.status === 'rejected'
                          ? 'رد شده'
                          : 'در انتظار بررسی مدیریت'}
                      </span>

                      {l.status === 'pending' && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setReviewingLeave(l);
                              setReviewAction('approved');
                              setReviewManagerNote('');
                            }}
                            className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-lg transition-colors flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                            <span>تایید</span>
                          </button>
                          <button
                            onClick={() => {
                              setReviewingLeave(l);
                              setReviewAction('rejected');
                              setReviewManagerNote('');
                            }}
                            className="px-3 py-1 bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1"
                          >
                            <X className="w-3.5 h-3.5 stroke-[3]" />
                            <span>رد</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Leave Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-[#181818] p-3 rounded-lg text-xs">
                    <div>
                      <span className="text-[#777] block text-[10px]">نوع مرخصی:</span>
                      <span className="text-white font-bold">
                        {l.leave_type === 'daily'
                          ? `روزانه (${toPersianDigits(l.days_count || 1)} روز)`
                          : `ساعتی (${toPersianDigits(l.hours_count || 0)} ساعت)`}
                      </span>
                    </div>

                    <div>
                      <span className="text-[#777] block text-[10px]">بازه مرخصی:</span>
                      <span className="text-white font-mono">
                        {l.leave_type === 'daily'
                          ? `${formatPersianDate(l.start_date)} الی ${formatPersianDate(l.end_date || l.start_date)}`
                          : `${formatPersianDate(l.start_date)} (از ${toPersianDigits(l.start_time || '')} تا ${toPersianDigits(l.end_time || '')})`}
                      </span>
                    </div>

                    <div>
                      <span className="text-[#777] block text-[10px]">علت و شرح مرخصی:</span>
                      <span className="text-[#B3B3B3] line-clamp-1">{l.reason || 'بدون توضیح'}</span>
                    </div>
                  </div>

                  {l.manager_note && (
                    <div className="text-xs bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg text-amber-300">
                      <span className="font-bold">یادداشت مدیریت: </span>
                      <span>{l.manager_note}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 7. MODALS: Edit Colleague Modal                               */}
      {/* ------------------------------------------------------------- */}
      {editingColleague && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm overflow-y-auto animate-in fade-in">
          <div className="bg-[#181818] border border-[#282828] rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-4">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-[#121212] border-b border-[#282828] flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#1DB954]/15 border border-[#1DB954]/30 flex items-center justify-center text-[#1DB954]">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-white">
                    ویرایش همکار: {editingColleague.name}
                  </h3>
                  <p className="text-[11px] text-[#888]">
                    اصلاح اطلاعات هویتی، راه‌های تماس چندگانه و پیکربندی دقیق دسترسی‌ها
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingColleague(null)}
                className="w-8 h-8 rounded-full bg-[#242424] hover:bg-[#303030] flex items-center justify-center text-[#888] hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1 text-xs">
              {/* 1. Identity & Role */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-[#1DB954]" />
                  <span>مشخصات فردی و نقش سازمانی</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#141414] p-3.5 rounded-xl border border-[#262626]">
                  <div>
                    <label className="block text-[#B3B3B3] mb-1 font-semibold">نام و نام خانوادگی</label>
                    <input
                      type="text"
                      value={editingColleague.name}
                      onChange={(e) =>
                        setEditingColleague({ ...editingColleague, name: e.target.value })
                      }
                      className="w-full h-9 px-3 bg-[#1e1e1e] rounded-xl text-white border border-[#333] focus:border-[#1DB954]"
                    />
                  </div>

                  <div>
                    <label className="block text-[#B3B3B3] mb-1 font-semibold flex items-center justify-between">
                      <span>نام کاربری ورود</span>
                      <span className="text-[10px] text-[#777]">یکتا</span>
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={editingColleague.username || ''}
                      onChange={(e) =>
                        setEditingColleague({ ...editingColleague, username: e.target.value })
                      }
                      placeholder="sara_ahmadi"
                      className="w-full h-9 px-3 bg-[#1e1e1e] rounded-xl text-white border border-[#333] focus:border-[#1DB954] font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[#B3B3B3] mb-1 font-semibold">ایمیل سازمانی</label>
                    <input
                      type="email"
                      dir="ltr"
                      value={editingColleague.email}
                      onChange={(e) =>
                        setEditingColleague({ ...editingColleague, email: e.target.value })
                      }
                      className="w-full h-9 px-3 bg-[#1e1e1e] rounded-xl text-white border border-[#333] focus:border-[#1DB954] font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[#B3B3B3] mb-1 font-semibold flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-[#1DB954]" />
                        <span>سازمان / شعبه اصلی</span>
                      </span>
                    </label>
                    <select
                      value={editingTenantId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditingTenantId(val);
                        if (!editingAllowedTenantIds.includes(val)) {
                          setEditingAllowedTenantIds([...editingAllowedTenantIds, val]);
                        }
                      }}
                      className="w-full h-9 px-3 bg-[#1e1e1e] rounded-xl text-white border border-[#333] focus:border-[#1DB954] cursor-pointer"
                    >
                      {tenants.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                      {tenants.length === 0 && (
                        <option value="default">سازمان مرکزی آلفادسک</option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[#B3B3B3] mb-1 font-semibold">نقش سازمانی</label>
                    <select
                      value={editingRole}
                      onChange={(e) => {
                        const newR = e.target.value as PersonnelRole;
                        setEditingRole(newR);
                        const cfg = PERSONNEL_ROLE_CONFIG[newR];
                        if (cfg) {
                          setEditingAllowedMenus([...cfg.defaultMenus]);
                          setEditingReportScope(cfg.defaultReportScope);
                        }
                      }}
                      className="w-full h-9 px-3 bg-[#1e1e1e] rounded-xl text-white border border-[#333] focus:border-[#1DB954] cursor-pointer"
                    >
                      {(Object.keys(PERSONNEL_ROLE_CONFIG) as PersonnelRole[]).map((rKey) => (
                        <option key={rKey} value={rKey}>
                          {PERSONNEL_ROLE_CONFIG[rKey].label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {tenants.length > 1 && (
                    <div className="sm:col-span-2 p-3 bg-[#181818] rounded-xl border border-[#2e2e2e] space-y-2 mt-1">
                      <label className="block text-xs font-semibold text-[#CCC] flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-blue-400" />
                          <span>سازمان‌ها و شعب مجاز جهت سوییچ (عضویت در چند شعبه):</span>
                        </span>
                        <span className="text-[10px] text-[#888]">
                          فقط در شعب تیک‌خورده مجاز به فعالیت و سوییچ خواهد بود
                        </span>
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                        {tenants.map((t) => {
                          const isChecked =
                            editingAllowedTenantIds.includes(String(t.id)) ||
                            editingTenantId === String(t.id);
                          return (
                            <label
                              key={t.id}
                              className={`p-2 rounded-lg border text-xs cursor-pointer flex items-center gap-2 select-none transition-colors ${
                                isChecked
                                  ? 'bg-[#1a2e20]/60 border-[#1DB954]/50 text-white'
                                  : 'bg-[#121212] border-[#2c2c2c] text-[#777] hover:text-[#bbb]'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={editingTenantId === String(t.id)}
                                onChange={(e) => {
                                  const tId = String(t.id);
                                  if (e.target.checked) {
                                    setEditingAllowedTenantIds([
                                      ...editingAllowedTenantIds,
                                      tId,
                                    ]);
                                  } else {
                                    setEditingAllowedTenantIds(
                                      editingAllowedTenantIds.filter((id) => id !== tId)
                                    );
                                  }
                                }}
                                className="accent-[#1DB954]"
                              />
                              <span className="truncate">{t.name}</span>
                              {editingTenantId === String(t.id) && (
                                <span className="text-[9px] text-[#1DB954] bg-[#1DB954]/10 px-1 py-0.2 rounded font-mono mr-auto">
                                  شعبه اصلی
                                </span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Multiple Phones & Contact Methods */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <Phone className="w-4 h-4 text-blue-400" />
                    <span>شماره‌ها و راه‌های ارتباطی همکار</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPhones([
                        ...editingPhones,
                        { id: 'ep-' + Date.now(), label: 'شماره دوم', number: '' },
                      ]);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[#242424] hover:bg-[#303030] text-white text-xs flex items-center gap-1 border border-[#333]"
                  >
                    <Plus className="w-3 h-3 text-[#1DB954]" />
                    <span>افزودن شماره</span>
                  </button>
                </div>

                <div className="space-y-2 bg-[#141414] p-3.5 rounded-xl border border-[#262626]">
                  {editingPhones.map((ph, idx) => (
                    <div key={ph.id} className="flex items-center gap-2">
                      <select
                        value={ph.label}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditingPhones((prev) =>
                            prev.map((item) => (item.id === ph.id ? { ...item, label: val } : item))
                          );
                        }}
                        className="w-36 h-9 px-2 bg-[#1e1e1e] rounded-xl text-xs text-white border border-[#333] focus:border-[#1DB954] cursor-pointer"
                      >
                        {COMMON_PHONE_LABELS.map((lbl) => (
                          <option key={lbl} value={lbl}>
                            {lbl}
                          </option>
                        ))}
                      </select>

                      <input
                        type="text"
                        dir="ltr"
                        value={ph.number}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditingPhones((prev) =>
                            prev.map((item) => (item.id === ph.id ? { ...item, number: val } : item))
                          );
                        }}
                        placeholder={idx === 0 ? 'شماره اصلی' : 'شماره تماس'}
                        className="flex-1 h-9 px-3 bg-[#1e1e1e] rounded-xl text-white border border-[#333] focus:border-[#1DB954] font-mono text-xs"
                      />

                      {editingPhones.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPhones(editingPhones.filter((item) => item.id !== ph.id));
                          }}
                          className="w-9 h-9 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 flex items-center justify-center flex-shrink-0"
                          title="حذف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Granular Permissions (Menus, Capabilities, Reports Scope) */}
              <div className="space-y-4 bg-[#141414] p-4 rounded-xl border border-[#262626]">
                <div className="text-xs font-bold text-white flex items-center gap-2 border-b border-[#242424] pb-2.5">
                  <Shield className="w-4 h-4 text-amber-400" />
                  <span>سطوح دسترسی ریزدانه و اختیارات</span>
                </div>

                {/* 3a. Menus */}
                <div className="space-y-2">
                  <label className="block text-[#BBB] font-semibold">
                    منوهای مجاز در سایدبار:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {SYSTEM_MENUS.map((menu) => {
                      const MenuIcon = menu.icon;
                      const isChecked = editingAllowedMenus.includes(menu.id);
                      return (
                        <label
                          key={menu.id}
                          className={`p-2 rounded-lg border text-xs cursor-pointer flex items-center gap-2 select-none ${
                            isChecked
                              ? 'bg-[#1a2e20]/60 border-[#1DB954]/50 text-white'
                              : 'bg-[#181818] border-[#282828] text-[#777]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditingAllowedMenus([...editingAllowedMenus, menu.id]);
                              } else {
                                setEditingAllowedMenus(editingAllowedMenus.filter((m) => m !== menu.id));
                              }
                            }}
                            className="accent-[#1DB954]"
                          />
                          <MenuIcon className={`w-3.5 h-3.5 ${isChecked ? 'text-[#1DB954]' : 'text-[#666]'}`} />
                          <span className="truncate">{menu.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* 3b. Action capabilities */}
                <div className="space-y-2 pt-2 border-t border-[#222]">
                  <label className="block text-[#BBB] font-semibold">
                    اختیارات عملیاتی:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {SYSTEM_ACTIONS.map((action) => {
                      const isAllowed = Boolean(editingActionPermissions[action.key]);
                      return (
                        <label
                          key={action.key}
                          className={`p-2 rounded-lg border text-xs cursor-pointer flex items-start gap-2 select-none ${
                            isAllowed
                              ? 'bg-[#18231c] border-[#1DB954]/40 text-white'
                              : 'bg-[#181818] border-[#282828] text-[#777]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isAllowed}
                            onChange={(e) => {
                              setEditingActionPermissions({
                                ...editingActionPermissions,
                                [action.key]: e.target.checked,
                              });
                            }}
                            className="mt-0.5 accent-[#1DB954]"
                          />
                          <span className="leading-relaxed">{action.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* 3c. Report View Scope */}
                <div className="space-y-2.5 pt-2 border-t border-[#222]">
                  <label className="block text-[#BBB] font-semibold">
                    دامنه مشاهده گزارش کار پرسنل (گزارش کار کیا رو ببینه):
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <label
                      className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-center gap-2 select-none ${
                        editingReportScope === 'all'
                          ? 'bg-[#1a2e20]/70 border-[#1DB954] text-white'
                          : 'bg-[#181818] border-[#282828] text-[#777]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="edit_report_scope"
                        value="all"
                        checked={editingReportScope === 'all'}
                        onChange={() => setEditingReportScope('all')}
                        className="accent-[#1DB954]"
                      />
                      <span>همه همکاران</span>
                    </label>

                    <label
                      className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-center gap-2 select-none ${
                        editingReportScope === 'own_only'
                          ? 'bg-[#1a2e20]/70 border-[#1DB954] text-white'
                          : 'bg-[#181818] border-[#282828] text-[#777]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="edit_report_scope"
                        value="own_only"
                        checked={editingReportScope === 'own_only'}
                        onChange={() => setEditingReportScope('own_only')}
                        className="accent-[#1DB954]"
                      />
                      <span>فقط گزارش خود</span>
                    </label>

                    <label
                      className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-center gap-2 select-none ${
                        editingReportScope === 'specific_personnel'
                          ? 'bg-[#1a2e20]/70 border-[#1DB954] text-white'
                          : 'bg-[#181818] border-[#282828] text-[#777]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="edit_report_scope"
                        value="specific_personnel"
                        checked={editingReportScope === 'specific_personnel'}
                        onChange={() => setEditingReportScope('specific_personnel')}
                        className="accent-[#1DB954]"
                      />
                      <span>همکاران مشخص</span>
                    </label>
                  </div>

                  {/* Specific personnel picker */}
                  {editingReportScope === 'specific_personnel' && (
                    <div className="p-2.5 bg-[#181818] rounded-xl border border-[#333] space-y-1.5 animate-in fade-in">
                      <div className="text-[11px] text-[#AAA]">انتخاب همکاران مجاز:</div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto pr-1">
                        {personnelList.map((pers) => {
                          const isSel = editingVisibleReportPersonnelIds.includes(pers.id);
                          return (
                            <label
                              key={pers.id}
                              className={`p-1.5 rounded border text-xs cursor-pointer flex items-center gap-1.5 ${
                                isSel
                                  ? 'bg-[#1DB954]/15 border-[#1DB954]/50 text-white'
                                  : 'bg-[#121212] border-[#282828] text-[#888]'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSel}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setEditingVisibleReportPersonnelIds([
                                      ...editingVisibleReportPersonnelIds,
                                      pers.id,
                                    ]);
                                  } else {
                                    setEditingVisibleReportPersonnelIds(
                                      editingVisibleReportPersonnelIds.filter((id) => id !== pers.id)
                                    );
                                  }
                                }}
                                className="accent-[#1DB954]"
                              />
                              <span className="truncate">{pers.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#121212] border-t border-[#282828] flex items-center justify-end gap-2.5 flex-shrink-0">
              <button
                type="button"
                onClick={() => setEditingColleague(null)}
                className="px-4 py-2 rounded-xl bg-[#282828] hover:bg-[#333] text-white text-xs font-bold transition-colors"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleSaveColleagueEdit}
                disabled={isUpdatingColleague}
                className="px-6 py-2 rounded-xl bg-[#1DB954] hover:bg-[#1ed760] text-black text-xs font-extrabold shadow-md shadow-[#1DB954]/20 transition-all flex items-center gap-1.5"
              >
                {isUpdatingColleague ? (
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Check className="w-4 h-4 stroke-[3]" />
                )}
                <span>ذخیره تغییرات</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 8. MODALS: Leave Review Dialog                                */}
      {/* ------------------------------------------------------------- */}
      {reviewingLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#181818] border border-[#282828] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#282828] pb-3">
              <h3 className="font-bold text-sm text-white">
                {reviewAction === 'approved' ? 'تایید مرخصی' : 'رد درخواست مرخصی'}
              </h3>
              <button
                onClick={() => setReviewingLeave(null)}
                className="text-[#888] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-[#121212] rounded-xl text-[#B3B3B3] space-y-1">
                <div>
                  <span className="text-[#777]">متقاضی: </span>
                  <span className="text-white font-bold">{reviewingLeave.personnel_name}</span>
                </div>
                <div>
                  <span className="text-[#777]">نوع و تاریخ: </span>
                  <span className="text-white">
                    {reviewingLeave.leave_type === 'daily'
                      ? `روزانه (${formatPersianDate(reviewingLeave.start_date)})`
                      : `ساعتی (${reviewingLeave.hours_count} ساعت)`}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[#B3B3B3] mb-1">
                  یادداشت و پیام مدیریت (اختیاری):
                </label>
                <textarea
                  rows={3}
                  value={reviewManagerNote}
                  onChange={(e) => setReviewManagerNote(e.target.value)}
                  placeholder="علت رد یا توضیحات تایید جهت مشاهده کارشناس..."
                  className="w-full p-3 bg-[#121212] rounded-xl text-white border border-[#333] focus:border-[#1DB954] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#282828]">
              <button
                onClick={() => setReviewingLeave(null)}
                className="px-4 py-2 rounded-xl bg-[#282828] text-white text-xs font-bold"
              >
                انصراف
              </button>
              <button
                onClick={handleConfirmLeaveReview}
                disabled={isProcessingLeaveReview}
                className={`px-4 py-2 rounded-xl font-bold text-xs text-black ${
                  reviewAction === 'approved'
                    ? 'bg-emerald-500 hover:bg-emerald-400'
                    : 'bg-rose-500 hover:bg-rose-400 text-white'
                }`}
              >
                {isProcessingLeaveReview ? 'در حال ثبت...' : reviewAction === 'approved' ? 'تایید نهایی' : 'ثبت رد درخواست'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
