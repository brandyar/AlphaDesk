export type NegotiationStatus =
  | 'تماس برقرار نشده'
  | 'پاسخ نمیدهد'
  | 'نمیخواد'
  | 'پیگیری قبل از انقضا'
  | 'پیگیری بلند مدت'
  | 'پیگیری قرارداد'
  | 'پیش نویس قرارداد'
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
  date_created: string;
  date_updated: string;
  reports?: CustomerReport[];
}

export interface CustomerReport {
  id: string;
  customer_id: string;
  negotiator_name: string;
  negotiation_phone: string;
  report_text: string;
  negotiation_score: number;
  next_followup_date?: string | null;
  negotiation_status: NegotiationStatus;
  created_by?: string;
  date_created: string;
  customer_name?: string;
}

export interface ColdLead {
  id: string;
  phone_number: string;
  contact_name: string;
  source: string;
  status: LeadStatus;
  notes: string;
  assigned_to: string;
  converted_customer_id?: string;
  date_created: string;
}

export interface AdministrativeReport {
  id: string;
  personnel_id: string;
  personnel_name: string;
  report_date: string;
  calls_count: number;
  successful_contacts: number;
  leads_converted: number;
  tasks_summary: string;
  challenges: string;
  tomorrow_plan: string;
  date_created: string;
}

export interface Personnel {
  id: string;
  name: string;
  role: 'admin' | 'sales_manager' | 'marketer' | 'operator';
  email: string;
  phone: string;
  avatar?: string;
  active: boolean;
  user_id?: string | null;
}

export const DIRECTUS_ADMIN_ROLE_ID = '59e261e1-56f4-401e-9889-4971e2c3c4ce';
export const ADMIN_ROLE_ID = '59e261e1-56f4-401e-9889-4971e2c3c4ce';

export interface AuthUser {
  id: string;
  email: string;
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
  email: string;
  password: string;
  name: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
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
