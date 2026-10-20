export interface CustomerContact {
  id: string;
  customer_id: string;
  channel_type: 'mobile' | 'landline' | 'telegram' | 'instagram' | 'email' | 'website' | 'whatsapp' | 'other';
  value: string;
  normalized_value: string;
  contact_name?: string;
  contact_role?: string;
  is_primary: boolean;
  notes?: string;
  date_created: string;
  date_updated: string;
}

export interface Customer {
  id: string;
  tenant_id?: string;
  tenant_name?: string;
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
  next_followup_date: string | null;
  assigned_marketer_id: string | null;
  assigned_marketer_name: string;
  assignment_deadline: string | null;
  assignment_duration_days?: number;
  status: string;
  is_expired?: boolean;
  claimed_from_pool?: boolean;
  claimed_from_pool_at?: string;
  date_created: string;
  date_updated: string;
}

export interface CustomerReport {
  id: string;
  customer_id: string;
  negotiator_name: string;
  negotiation_phone: string;
  report_text: string;
  negotiation_score: number;
  next_followup_date: string | null;
  negotiation_status: string;
  created_by?: string;
  tenant_id?: string;
  date_created: string;
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
  status: 'تماس نگرفته' | 'پاسخ نداد' | 'در حال بررسی' | 'تبدیل شده به مشتری' | 'شماره نامعتبر' | string;
  notes: string;
  assigned_to: string;
  assigned_to_id?: string | null;
  assigned_to_name?: string;
  converted_customer_id?: string | null;
  date_created: string;
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
  hourly_logs?: any;
  status?: 'draft' | 'submitted';
  date_created: string;
}

export interface LeaveRequest {
  id: string;
  tenant_id?: string;
  personnel_id: string;
  personnel_name: string;
  leave_type: 'daily' | 'hourly';
  start_date: string;
  end_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  hours_count?: number | null;
  days_count?: number | null;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
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
  status: 'pending' | 'approved' | 'rejected';
  approved_amount?: number | null;
  manager_note?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  date_created: string;
}

export interface PersonnelContactNumber {
  id?: string;
  label: string;
  number: string;
}

export interface PersonnelPermissions {
  allowed_menus: string[];
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
  report_view_scope?: 'all' | 'own_only' | 'specific_personnel';
  visible_report_personnel_ids?: string[];
}

export interface Personnel {
  id: string;
  tenant_id?: string;
  tenant_name?: string;
  allowed_tenant_ids?: string[];
  name: string;
  username?: string;
  role: 'admin' | 'sales_manager' | 'marketer' | 'office_staff' | 'remote_task' | 'operator' | 'finance' | 'custom' | string;
  email: string;
  phone: string;
  phones?: Array<string | PersonnelContactNumber>;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relation?: string;
  family_contacts?: any;
  permissions?: PersonnelPermissions;
  avatar?: string;
  status?: string;
  active?: boolean;
  user_id?: string | null;
  bank_card_number?: string;
  iban?: string;
  national_id?: string;
}

export interface ProjectSettingsState {
  id?: number;
  ippanel_api?: string;
  ippanel_sender?: string;
  ippanel_line_number?: string;
  free_customers_claim_limit?: number;

  login_pattern?: string;
  login_pattern_text?: string;
  dayli_leave_request_pattern?: string;
  dayli_leave_request_text?: string;
  hourly_leave_request_pattern?: string;
  hourly_leave_request_text?: string;
  dayli_leave_reject_pattern?: string;
  dayli_leave_reject_text?: string;
  dayli_leave_accept_pattern?: string;
  dayli_leave_accept_text?: string;
  hourly_leave_reject_pattern?: string;
  hourly_leave_reject_text?: string;
  hourly_leave_accept_pattern?: string;
  hourly_leave_accept_text?: string;
  addvance_request_pattern?: string;
  addvance_request_text?: string;
  addvance_reject_pattern?: string;
  addvance_reject_text?: string;
  addvance_accept_pattern?: string;
  addvance_accept_text?: string;
  lower_addvance_accept_pattern?: string;
  lower_addvance_accept_text?: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug?: string;
  logo?: string;
  phone?: string;
  address?: string;
  description?: string;
  status: 'active' | 'inactive';
  date_created: string;
}

export interface TenantSettingsState {
  id?: string | number;
  tenant_id: string;
  sms_phones?: string[];
  date_created?: string;
  date_updated?: string;
}

export interface RequestUserContext {
  userId: string;
  personnelId: string;
  userRole: string;
  roleId: string;
  isAdmin: boolean;
  userName: string;
  userEmail: string;
  tenantId: string;
  isAuthenticated: boolean;
  isSessionRevoked: boolean;
}
