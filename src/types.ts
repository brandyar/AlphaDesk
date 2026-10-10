export type NegotiationStatus =
  | 'تماس برقرار نشده'
  | 'پاسخ نمیدهد'
  | 'نمیخواد'
  | 'پیگیری قبل از انقضا'
  | 'پیگیری بلند مدت'
  | 'پیگیری قرارداد'
  | 'پیش نویس قرارداد'
  | 'قرارداد / فاکتور'
  | 'قرارداد'
  | 'لیست سیاه';

export type LeadStatus =
  | 'تماس نگرفته'
  | 'پاسخ نداد'
  | 'در حال بررسی'
  | 'تبدیل شده به مشتری'
  | 'شماره نامعتبر';

export type ChannelType =
  | 'mobile'
  | 'landline'
  | 'telegram'
  | 'instagram'
  | 'email'
  | 'website'
  | 'whatsapp'
  | 'other';

export interface CustomerContact {
  id: string;
  customer_id: string;
  tenant_id?: string;
  channel_type: ChannelType;
  value: string;
  normalized_value?: string;
  contact_name?: string;
  contact_role?: string;
  is_primary: boolean;
  notes?: string;
  date_created?: string;
  date_updated?: string;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  conflictType?: 'active_marketer' | 'expired' | 'contract';
  matchedContact?: CustomerContact;
  matchedCustomer?: {
    id: string;
    company_name: string;
    assigned_marketer_name: string;
    assigned_marketer_id: string;
    assignment_deadline: string;
    is_expired: boolean;
    status: string;
  };
  message?: string;
}

export interface Customer {
  id: string;
  tenant_id?: string;
  company_name: string;
  business_type: string;
  province: string;
  city: string;
  manager_name: string;
  manager_phones: string[];
  negotiator_name: string;
  negotiator_phones: string[];
  mobile_numbers: string[];
  landline_numbers: string[];
  telegram_phone: string;
  telegram_ids: string[];
  instagram_ids: string[];
  emails: string[];
  websites: string[];
  contacts?: CustomerContact[];
  is_ecommerce: boolean;
  interview_status: string;
  interview_report: string;
  interview_score: number;
  next_followup_date?: string | null;
  assigned_marketer_id?: string | null;
  assigned_marketer_name: string;
  assignment_date?: string;
  assignment_deadline?: string | null;
  assignment_duration_days?: number;
  status: NegotiationStatus;
  is_expired?: boolean;
  claimed_from_pool?: boolean;
  claimed_from_pool_at?: string;
  date_created: string;
  date_updated: string;
  reports?: CustomerReport[];
}

export interface CustomerReport {
  id: string;
  customer_id: string;
  tenant_id?: string;
  negotiator_name: string;
  negotiation_phone: string;
  report_text: string;
  negotiation_score: number;
  next_followup_date?: string | null;
  negotiation_status: NegotiationStatus;
  created_by?: string;
  date_created: string;
  customer_name?: string;
  contract_number?: string | null;
  contract_date?: string | null;
  contract_items?: string | null;
  contract_amount?: number | null;
}

export interface ColdLead {
  id: string;
  tenant_id?: string;
  phone_number: string;
  contact_name: string;
  source: string;
  status: LeadStatus;
  notes: string;
  assigned_to: any;
  assigned_to_id?: string | null;
  assigned_to_name?: string | null;
  assigned_to_detail?: Partial<Personnel> | null;
  converted_customer_id?: string | null;
  date_created: string;
}

export interface HourlyWorkLog {
  slot: string; // e.g. "۰۹:۰۰ الی ۱۰:۰۰"
  activity: string; // Description of calls/tasks performed
  calls_count?: number; // Optional number of calls
}

export interface AdministrativeReport {
  id: string;
  tenant_id?: string;
  personnel_id: string;
  personnel_name: string;
  report_date: string;
  calls_count: number;
  successful_contacts: number;
  leads_converted: number;
  tasks_summary: string;
  challenges: string;
  tomorrow_plan: string;
  hourly_logs?: HourlyWorkLog[] | string | null;
  date_created: string;
}

export type PersonnelRole =
  | 'admin'
  | 'sales_manager'
  | 'marketer'
  | 'office_staff'
  | 'remote_task'
  | 'finance'
  | 'operator'
  | 'custom';

export interface PersonnelContactNumber {
  id?: string;
  label: string;
  number: string;
}

export interface PersonnelPermissions {
  allowed_menus: string[]; // 'dashboard', 'customers', 'free_customers', 'reports', 'analytics', 'cold_leads', 'admin_reports', 'team', 'tenants', 'personal_portal'
  allowed_tenant_ids?: string[];
  can_view_all_customers?: boolean;
  can_edit_customer?: boolean;
  can_delete_customer?: boolean;
  can_export_data?: boolean;
  can_switch_ownership?: boolean;
  can_extend_ownership?: boolean;
  can_manage_leads?: boolean;
  can_approve_leaves?: boolean;
  can_approve_advances?: boolean;
  can_manage_personnel?: boolean;
  can_manage_tenants?: boolean;
  report_view_scope?: 'all' | 'own_only' | 'specific_personnel';
  visible_report_personnel_ids?: string[];
}

export interface FamilyContact {
  id?: string;
  name: string;
  relation: string;
  phone: string;
  phone2?: string;
  notes?: string;
}

export interface Personnel {
  id: string;
  tenant_id?: string;
  tenant_name?: string;
  allowed_tenant_ids?: string[];
  name: string;
  username?: string;
  role: PersonnelRole;
  email: string;
  phone: string;
  phones?: Array<string | PersonnelContactNumber>;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relation?: string;
  family_contacts?: FamilyContact[];
  permissions?: PersonnelPermissions;
  avatar?: string;
  active: boolean;
  status?: string;
  user_id?: string | null;
  bank_card_number?: string;
  iban?: string;
  national_id?: string;
}

export type LeaveType = 'daily' | 'hourly';
export type RequestStatus = 'pending' | 'approved' | 'rejected';

export interface LeaveRequest {
  id: string;
  tenant_id?: string;
  personnel_id: string;
  personnel_name: string;
  leave_type: LeaveType;
  start_date: string;
  end_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  hours_count?: number | null;
  days_count?: number | null;
  reason: string;
  status: RequestStatus;
  manager_note?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  date_created: string;
}

export interface SalaryAdvanceRequest {
  id: string;
  tenant_id?: string;
  personnel_id: string;
  personnel_name: string;
  amount: number;
  target_month?: string;
  needed_date?: string | null;
  reason: string;
  bank_card_number?: string | null;
  iban?: string | null;
  status: RequestStatus;
  approved_amount?: number | null;
  manager_note?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  date_created: string;
}

export interface UserProfileUpdatePayload {
  name?: string;
  username?: string;
  phone?: string;
  avatar?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relation?: string;
  family_contacts?: FamilyContact[];
  bank_card_number?: string;
  iban?: string;
  national_id?: string;
}

export interface PasswordChangePayload {
  current_password?: string;
  new_password: string;
}

export const DIRECTUS_ADMIN_ROLE_ID = '59e261e1-56f4-401e-9889-4971e2c3c4ce';
export const ADMIN_ROLE_ID = '59e261e1-56f4-401e-9889-4971e2c3c4ce';

export interface Tenant {
  id: string;
  name: string;
  slug?: string;
  logo?: string;
  description?: string;
  phone?: string;
  address?: string;
  status: 'active' | 'inactive';
  date_created: string;
}

export interface AuthUser {
  id: string;
  tenant_id?: string;
  tenant_name?: string;
  is_super_admin?: boolean;
  email: string;
  username?: string;
  name: string;
  first_name?: string;
  last_name?: string;
  role_id?: string;
  is_admin: boolean;
  app_role: 'admin' | 'marketer' | 'sales_manager';
}

export interface AuthResponse {
  success: boolean;
  access_token: string;
  user: AuthUser;
  personnel: Personnel;
  message?: string;
}

export interface RegisterPayload {
  tenant_id?: string;
  email: string;
  username?: string;
  password: string;
  name: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
}

export type TeamSubTab =
  | 'new_colleague'
  | 'colleagues_list'
  | 'extend_ownership'
  | 'switch_ownership'
  | 'leave_approvals'
  | 'import_data';

export interface DataMigrationPreviewItem {
  id?: string;
  sourceType: 'personnel' | 'customer' | 'report';
  nameOrTitle: string;
  phone?: string;
  details: string;
  status: 'valid' | 'warning' | 'error';
  statusMessage?: string;
}

export interface DataMigrationResult {
  success: boolean;
  importedPersonnelCount: number;
  importedCustomersCount: number;
  importedReportsCount: number;
  skippedCount: number;
  errors: string[];
  message: string;
}

export interface CreateColleaguePayload {
  tenant_id?: string;
  allowed_tenant_ids?: string[];
  name: string;
  username?: string;
  email: string;
  phone?: string;
  phones?: Array<string | PersonnelContactNumber>;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relation?: string;
  family_contacts?: FamilyContact[];
  role: PersonnelRole;
  permissions?: PersonnelPermissions;
  password?: string;
  status?: string;
}

export interface BffStatus {
  mode: 'DATABASE_CONNECTED' | 'DIRECTUS_CONNECTED' | 'LOCAL_BFF_FALLBACK';
  has_token: boolean;
  database_reachable?: boolean;
  directus_reachable?: boolean;
  error: string | null;
  counts: {
    customers: number;
    reports: number;
    cold_leads: number;
    admin_reports: number;
    personnel: number;
  };
}

export interface ProjectSettings {
  id?: number;
  ippanel_api?: string;
  free_customers_claim_limit?: number;
}

