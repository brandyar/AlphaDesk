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

export type ReportCommissionType = 'percentage' | 'unit';
export type ManualCommissionStatus = 'pending' | 'approved' | 'partially_approved' | 'rejected';
export type UnitItemReviewStatus = 'pending' | 'approved' | 'rejected';

export interface UnitCommissionItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_commission: number;
  total_commission: number;
  status: UnitItemReviewStatus;
  approved_quantity?: number | null;
  approved_unit_commission?: number | null;
  approved_total_commission?: number | null;
  manager_note?: string | null;
}

export interface CustomerReport {
  id: string;
  customer_id: string;
  negotiator_name: string;
  customer_negotiator_name?: string | null;
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
  commission_type?: ReportCommissionType | string[] | null;
  unit_commission_items?: UnitCommissionItem[] | string | null;
  manual_commission_amount?: number | null;
  approved_commission_amount?: number | null;
  manual_commission_status?: ManualCommissionStatus | null;
  commission_review_note?: string | null;
  commission_reviewed_by?: string | null;
  commission_reviewed_at?: string | null;
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
  can_request_bonus?: boolean;
  can_approve_bonuses?: boolean;
  can_manage_personnel?: boolean;
  can_manage_tenants?: boolean;
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
  profile_image?: string;
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
  enable_unit_sales_commission?: boolean;
  unit_commission_catalog?: any[];
  date_created?: string;
  date_updated?: string;
}

export interface RequestUserContext {
  userId: string;
  personnelId: string;
  userRole: string;
  roleId: string;
  isAdmin: boolean;
  isPersonnelAdmin?: boolean;
  canViewAllCustomers?: boolean;
  reportViewScope?: 'all' | 'own_only' | 'specific_personnel';
  visibleReportPersonnelIds?: string[];
  userName: string;
  userEmail: string;
  tenantId: string;
  isAuthenticated: boolean;
  isSessionRevoked: boolean;
  isDayExpired?: boolean;
  isInactive?: boolean;
}

export interface CommissionTier {
  from_amount: number;
  to_amount: number | null;
  rate_percent: number;
}

export type BaseSalaryMinSalesBasis =
  | 'percentage_sales_amount'
  | 'total_sales_amount'
  | 'unit_sales_count'
  | 'contracts_count'
  | 'either_amount_or_units'
  | 'both_amount_and_units';

export type BaseSalaryBelowTargetMode = 'zero' | 'prorata';

export interface PersonnelSalaryConfig {
  id?: number | string;
  personnel_id: string;
  salary_type: 'fixed' | 'commission' | 'fixed_plus_commission';
  base_salary: number;
  commission_model?: 'flat' | 'tiered';
  flat_rate_percent?: number;
  tiered_calculation_mode?: 'marginal' | 'retroactive';
  commission_tiers?: CommissionTier[];
  min_sales_target?: number;
  require_min_sales_for_base_salary?: boolean;
  base_salary_min_sales_basis?: BaseSalaryMinSalesBasis;
  base_salary_min_sales_amount?: number;
  base_salary_min_units_count?: number;
  base_salary_below_target_mode?: BaseSalaryBelowTargetMode;
  is_active: boolean;
  effective_from?: string | null;
  tenant_id?: string;
  date_created?: string;
  date_updated?: string;
}

export interface PayrollSlip {
  id: number | string;
  personnel_id: string;
  personnel_name?: string;
  from_date?: string | null;
  to_date?: string | null;
  base_salary_amount: number;
  total_contracts_amount: number;
  contracts_count: number;
  commission_amount: number;
  percentage_commission_amount?: number;
  unit_commission_amount?: number;
  advances_deducted: number;
  bonuses_amount: number;
  deductions_amount: number;
  net_payable: number;
  calculation_breakdown?: any;
  status: 'draft' | 'approved' | 'paid';
  payment_date?: string | null;
  payment_ref?: string | null;
  created_by?: string | null;
  tenant_id?: string;
  date_created?: string;
}

export type PayrollAdjustmentType = 'bonus' | 'deduction';
export type PayrollAdjustmentCategory =
  | 'sales_bonus'
  | 'overtime'
  | 'delay'
  | 'insurance'
  | 'penalty'
  | 'other';
export type PayrollAdjustmentStatus = 'pending' | 'approved' | 'rejected';
export type PayrollAdjustmentSource = 'self_request' | 'manager_direct';

export interface PayrollAdjustment {
  id: number | string;
  tenant_id?: string | number | null;
  personnel_id: string;
  personnel_name?: string;
  type: PayrollAdjustmentType;
  category?: PayrollAdjustmentCategory | string | null;
  title: string;
  amount: number;
  approved_amount?: number | null;
  target_year?: number | null;
  target_month?: number | null;
  effective_date?: string | null;
  reason?: string | null;
  status: PayrollAdjustmentStatus;
  source?: PayrollAdjustmentSource | null;
  created_by?: string | null;
  manager_note?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  payroll_slip_id?: number | string | null;
  date_created?: string;
  date_updated?: string;
}


