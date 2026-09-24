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
  is_ecommerce: boolean;
  interview_status: string;
  interview_report: string;
  interview_score: number;
  next_followup_date: string;
  assigned_marketer_id: string;
  assigned_marketer_name: string;
  assignment_date: string;
  assignment_deadline: string;
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
  next_followup_date: string;
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
}

export interface BffStatus {
  mode: 'DIRECTUS_CONNECTED' | 'LOCAL_BFF_FALLBACK';
  directus_url: string;
  has_token: boolean;
  directus_reachable: boolean;
  directus_collections: string[];
  error: string | null;
  counts: {
    customers: number;
    reports: number;
    cold_leads: number;
    admin_reports: number;
    personnel: number;
  };
}
