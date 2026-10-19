import { Customer, CustomerReport } from '../../types';

export type AnalyticsTab = 'daily_reports' | 'daily_customers' | 'periodic';
export type PeriodPreset = 'today' | 'last_7_days' | 'last_30_days' | 'last_90_days' | 'this_year' | 'custom';

export interface DailyReportDayItem {
  dateIso: string;
  dateJalali: string;
  dayName: string;
  reportsCount: number;
  scoresSum: number;
  scoresCount: number;
  contractsCount: number;
  contractsAmount: number;
  statusCounts: Record<string, number>;
  reports: CustomerReport[];
}

export interface DailyReportStats {
  daysList: DailyReportDayItem[];
  totalReports: number;
  totalContracts: number;
  totalAmount: number;
  avgScore: string;
  activeDaysCount: number;
  avgPerActiveDay: string;
  peakDay: DailyReportDayItem | undefined;
}

export interface DailyCustomerDayItem {
  dateIso: string;
  dateJalali: string;
  dayName: string;
  uniqueCustomerIds: Set<string>;
  customersList: { customer: Customer | null; latestReport: CustomerReport }[];
  contractCustomerIds: Set<string>;
  newContactCount: number;
  followupCount: number;
  uniqueCount: number;
  contractCount: number;
}

export interface DailyCustomerStats {
  daysList: DailyCustomerDayItem[];
  totalUniqueCustomersTouched: number;
  avgCustomersPerDay: string;
  totalAssignedCustomers: number;
}

export interface PersonnelRankingItem {
  personnelName: string;
  reportsCount: number;
  uniqueCustomers: Set<string>;
  contractsCount: number;
  totalAmount: number;
  scoresSum: number;
  scoresCount: number;
  uniqueCustomersCount: number;
  avgScore: string;
}

export interface PeriodicStats {
  totalReports: number;
  totalUniqueCustomers: number;
  totalContracts: number;
  totalContractAmount: number;
  avgScore: string;
  conversionRate: string;
  statusBreakdown: Record<string, number>;
  personnelRanking: PersonnelRankingItem[];
}
