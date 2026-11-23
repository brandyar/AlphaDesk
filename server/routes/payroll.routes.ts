import { Router, Request, Response } from 'express';
import {
  directusUrl,
  directusAdminToken,
  personnelData,
  reportsData,
  advanceRequestsData,
  salaryConfigsData,
  payrollSlipsData,
  payrollAdjustmentsData,
} from '../config.ts';
import { directusFetch, directusFetchAllPages } from '../directus/client.ts';
import { getRequestUser, matchesTenant } from '../middlewares/auth.middleware.ts';
import {
  getSafeDirectusPersonnelForeignKey,
  resolvePersonnelId,
  resolveDirectusTenantId,
} from '../directus/sync.ts';
import { normalizePersianString } from '../services/phoneNormalizer.ts';
import crypto from 'crypto';
import {
  PersonnelSalaryConfig,
  PayrollSlip,
  CustomerReport,
  SalaryAdvanceRequest,
  CommissionTier,
  PayrollAdjustment,
  BaseSalaryMinSalesBasis,
  BaseSalaryBelowTargetMode,
  ReportCommissionType,
  ManualCommissionStatus,
  UnitCommissionItem,
} from '../types.ts';
import { normalizePayrollAdjustment } from './payrollAdjustments.routes.ts';
import {
  normalizeCommissionType,
  parseUnitCommissionItems,
  normalizeReportRecord,
} from './reports.routes.ts';
import { invalidateReportsCache } from '../directus/cache.ts';

const VALID_BASE_SALARY_BASES: BaseSalaryMinSalesBasis[] = [
  'percentage_sales_amount',
  'total_sales_amount',
  'unit_sales_count',
  'contracts_count',
  'either_amount_or_units',
  'both_amount_and_units',
];

const VALID_BELOW_TARGET_MODES: BaseSalaryBelowTargetMode[] = ['zero', 'prorata'];

function normalizeBaseSalaryBasis(val: any): BaseSalaryMinSalesBasis {
  return VALID_BASE_SALARY_BASES.includes(val) ? val : 'percentage_sales_amount';
}

function normalizeBelowTargetMode(val: any): BaseSalaryBelowTargetMode {
  return VALID_BELOW_TARGET_MODES.includes(val) ? val : 'zero';
}

function normalizeSalaryConfigRecord(c: any): PersonnelSalaryConfig {
  return {
    ...c,
    id: c.id,
    personnel_id: typeof c.personnel_id === 'object' && c.personnel_id !== null ? String(c.personnel_id.id) : String(c.personnel_id || ''),
    base_salary: Math.max(0, Math.round(Number(c.base_salary) || 0)),
    flat_rate_percent: Math.max(0, Number(c.flat_rate_percent) || 0),
    min_sales_target: Math.max(0, Math.round(Number(c.min_sales_target) || 0)),
    require_min_sales_for_base_salary: Boolean(c.require_min_sales_for_base_salary),
    base_salary_min_sales_basis: normalizeBaseSalaryBasis(c.base_salary_min_sales_basis),
    base_salary_min_sales_amount: Math.max(0, Math.round(Number(c.base_salary_min_sales_amount) || 0)),
    base_salary_min_units_count: Math.max(0, Math.round(Number(c.base_salary_min_units_count) || 0)),
    base_salary_below_target_mode: normalizeBelowTargetMode(c.base_salary_below_target_mode),
    is_active: c.is_active !== undefined ? Boolean(c.is_active) : true,
    commission_tiers: typeof c.commission_tiers === 'string' ? JSON.parse(c.commission_tiers || '[]') : (c.commission_tiers || []),
  };
}

export function calculateBaseSalaryWithThreshold(
  config: PersonnelSalaryConfig,
  metrics: {
    percentageSalesAmount: number;
    totalSalesAmount: number;
    approvedUnitItemsCount: number;
    contractsCount: number;
  }
) {
  if (!config || config.salary_type === 'commission') {
    return {
      appliedBaseSalary: 0,
      breakdown: {
        threshold_active: false,
        configured_base_salary: 0,
        applied_base_salary: 0,
        target_met: true,
        fulfillment_ratio: 1,
        note: 'حکم حقوق صرفاً پورسانتی است (فاقد حقوق ثابت)',
      },
    };
  }

  const configuredBaseSalary = Math.max(0, Math.round(Number(config.base_salary) || 0));
  if (!config.require_min_sales_for_base_salary || configuredBaseSalary === 0) {
    return {
      appliedBaseSalary: configuredBaseSalary,
      breakdown: {
        threshold_active: false,
        configured_base_salary: configuredBaseSalary,
        applied_base_salary: configuredBaseSalary,
        target_met: true,
        fulfillment_ratio: 1,
        note: 'شرط کف فروش برای حقوق ثابت فعال نیست',
      },
    };
  }

  const basis = normalizeBaseSalaryBasis(config.base_salary_min_sales_basis);
  const belowMode = normalizeBelowTargetMode(config.base_salary_below_target_mode);
  const minAmt = Math.max(0, Math.round(Number(config.base_salary_min_sales_amount) || 0));
  const minUnits = Math.max(0, Math.round(Number(config.base_salary_min_units_count) || 0));

  let targetMet = true;
  let fulfillmentRatio = 1;
  let actualSalesAmount = metrics.percentageSalesAmount;
  let actualUnitsCount = metrics.approvedUnitItemsCount;
  let note = '';

  switch (basis) {
    case 'percentage_sales_amount': {
      actualSalesAmount = metrics.percentageSalesAmount;
      targetMet = minAmt <= 0 || actualSalesAmount >= minAmt;
      fulfillmentRatio = minAmt > 0 ? Math.min(1, Math.max(0, actualSalesAmount / minAmt)) : 1;
      note = targetMet
        ? 'کف مبلغ فروش درصدی جهت دریافت حقوق ثابت محقق شد'
        : belowMode === 'prorata'
        ? `کف مبلغ فروش درصدی محقق نشد (${Math.round(fulfillmentRatio * 100)}٪ پرداخت نسبی)`
        : 'کف مبلغ فروش درصدی محقق نشد (حقوق ثابت صفر شد)';
      break;
    }
    case 'total_sales_amount': {
      actualSalesAmount = metrics.totalSalesAmount;
      targetMet = minAmt <= 0 || actualSalesAmount >= minAmt;
      fulfillmentRatio = minAmt > 0 ? Math.min(1, Math.max(0, actualSalesAmount / minAmt)) : 1;
      note = targetMet
        ? 'کف مبلغ کل فروش جهت دریافت حقوق ثابت محقق شد'
        : belowMode === 'prorata'
        ? `کف مبلغ کل فروش محقق نشد (${Math.round(fulfillmentRatio * 100)}٪ پرداخت نسبی)`
        : 'کف مبلغ کل فروش محقق نشد (حقوق ثابت صفر شد)';
      break;
    }
    case 'unit_sales_count': {
      actualUnitsCount = metrics.approvedUnitItemsCount;
      targetMet = minUnits <= 0 || actualUnitsCount >= minUnits;
      fulfillmentRatio = minUnits > 0 ? Math.min(1, Math.max(0, actualUnitsCount / minUnits)) : 1;
      note = targetMet
        ? 'کف تعداد اقلام فروش تعدادی تاییدشده محقق شد'
        : belowMode === 'prorata'
        ? `کف تعداد اقلام فروش تعدادی محقق نشد (${Math.round(fulfillmentRatio * 100)}٪ پرداخت نسبی)`
        : 'کف تعداد اقلام فروش تعدادی تاییدشده محقق نشد (حقوق ثابت صفر شد)';
      break;
    }
    case 'contracts_count': {
      actualUnitsCount = metrics.contractsCount;
      targetMet = minUnits <= 0 || actualUnitsCount >= minUnits;
      fulfillmentRatio = minUnits > 0 ? Math.min(1, Math.max(0, actualUnitsCount / minUnits)) : 1;
      note = targetMet
        ? 'کف تعداد قراردادهای موفق محقق شد'
        : belowMode === 'prorata'
        ? `کف تعداد قراردادهای موفق محقق نشد (${Math.round(fulfillmentRatio * 100)}٪ پرداخت نسبی)`
        : 'کف تعداد قراردادهای موفق محقق نشد (حقوق ثابت صفر شد)';
      break;
    }
    case 'either_amount_or_units': {
      actualSalesAmount = metrics.percentageSalesAmount;
      actualUnitsCount = metrics.approvedUnitItemsCount;
      if (minAmt <= 0 && minUnits <= 0) {
        targetMet = true;
        fulfillmentRatio = 1;
      } else {
        const amtMet = minAmt > 0 && actualSalesAmount >= minAmt;
        const unitMet = minUnits > 0 && actualUnitsCount >= minUnits;
        targetMet = amtMet || unitMet;
        const amtRatio = minAmt > 0 ? Math.min(1, Math.max(0, actualSalesAmount / minAmt)) : 0;
        const unitRatio = minUnits > 0 ? Math.min(1, Math.max(0, actualUnitsCount / minUnits)) : 0;
        fulfillmentRatio = targetMet ? 1 : Math.max(amtRatio, unitRatio);
      }
      note = targetMet
        ? 'حداقل یکی از شروط کف فروش (مبلغ درصدی یا تعداد تعدادی) محقق شد'
        : belowMode === 'prorata'
        ? `هیچ‌یک از شروط کف فروش محقق نشد (${Math.round(fulfillmentRatio * 100)}٪ پرداخت نسبی)`
        : 'هیچ‌یک از شروط کف فروش (مبلغ درصدی یا تعداد تعدادی) محقق نشد (حقوق ثابت صفر شد)';
      break;
    }
    case 'both_amount_and_units': {
      actualSalesAmount = metrics.percentageSalesAmount;
      actualUnitsCount = metrics.approvedUnitItemsCount;
      const amtMet = minAmt <= 0 || actualSalesAmount >= minAmt;
      const unitMet = minUnits <= 0 || actualUnitsCount >= minUnits;
      targetMet = amtMet && unitMet;
      const amtRatio = minAmt > 0 ? Math.min(1, Math.max(0, actualSalesAmount / minAmt)) : 1;
      const unitRatio = minUnits > 0 ? Math.min(1, Math.max(0, actualUnitsCount / minUnits)) : 1;
      fulfillmentRatio = targetMet
        ? 1
        : minAmt > 0 && minUnits > 0
        ? (amtRatio + unitRatio) / 2
        : Math.min(amtRatio, unitRatio);
      note = targetMet
        ? 'هر دو شرط کف فروش (مبلغ درصدی و تعداد تعدادی) محقق شد'
        : belowMode === 'prorata'
        ? `هر دو شرط کف فروش به طور کامل محقق نشد (${Math.round(fulfillmentRatio * 100)}٪ پرداخت نسبی)`
        : 'هر دو شرط کف فروش (مبلغ درصدی و تعداد تعدادی) محقق نشد (حقوق ثابت صفر شد)';
      break;
    }
  }

  const appliedBaseSalary = targetMet
    ? configuredBaseSalary
    : belowMode === 'prorata'
    ? Math.round(configuredBaseSalary * fulfillmentRatio)
    : 0;

  return {
    appliedBaseSalary,
    breakdown: {
      threshold_active: true,
      configured_base_salary: configuredBaseSalary,
      applied_base_salary: appliedBaseSalary,
      target_met: targetMet,
      basis,
      below_target_mode: belowMode,
      min_sales_amount: minAmt,
      min_units_count: minUnits,
      actual_sales_amount: actualSalesAmount,
      actual_units_count: actualUnitsCount,
      fulfillment_ratio: Math.round(fulfillmentRatio * 1000) / 1000,
      note,
    },
  };
}

const router = Router();

// Helper to check admin access for payroll
function hasPayrollAccess(req: Request): boolean {
  const { isAdmin, userRole, personnelId } = getRequestUser(req);
  if (isAdmin || userRole === 'admin' || userRole === 'sales_manager') return true;
  const p = personnelData.find((item) => item.id === personnelId);
  return Boolean(p?.permissions?.allowed_menus?.includes('payroll'));
}

// Helper to check if a report belongs to a personnel
function isReportByPersonnel(report: CustomerReport, p: any): boolean {
  if (!report || !p) return false;
  const createdBy = String(report.created_by || '').trim().toLowerCase();
  const rawPId = String(p.id || '').trim().toLowerCase();
  const cleanPId = rawPId.replace(/^p-/, '');
  const userId = p.user_id ? String(p.user_id).trim().toLowerCase() : '';
  const username = p.username ? String(p.username).trim().toLowerCase() : '';

  if (createdBy) {
    if (createdBy === rawPId || createdBy === cleanPId || (userId && createdBy === userId) || (username && createdBy === username)) {
      return true;
    }
  }

  const negNorm = normalizePersianString(report.negotiator_name);
  const pNameNorm = normalizePersianString(p.name);
  if (negNorm && pNameNorm && (negNorm === pNameNorm || negNorm.includes(pNameNorm) || pNameNorm.includes(negNorm))) {
    return true;
  }

  return false;
}

// Helper to compute commission
export function calculateCommissionForSales(
  totalSales: number,
  config: PersonnelSalaryConfig
): {
  commission: number;
  breakdown: any;
} {
  if (!config || config.salary_type === 'fixed') {
    return { commission: 0, breakdown: { model: 'none', note: 'حقوق ثابت فاقد پورسانت' } };
  }

  // Check minimum sales target if configured
  if (config.min_sales_target && config.min_sales_target > 0 && totalSales < config.min_sales_target) {
    return {
      commission: 0,
      breakdown: {
        model: config.commission_model || 'flat',
        target_met: false,
        min_sales_target: config.min_sales_target,
        total_sales: totalSales,
        note: 'حجم فروش به حد نصاب کف فروش نرسیده است',
      },
    };
  }

  if (config.commission_model === 'flat') {
    const rate = Number(config.flat_rate_percent) || 0;
    const commission = Math.round(totalSales * (rate / 100));
    return {
      commission,
      breakdown: {
        model: 'flat',
        rate_percent: rate,
        total_sales: totalSales,
        commission,
      },
    };
  }

  if (config.commission_model === 'tiered') {
    const tiers: CommissionTier[] = Array.isArray(config.commission_tiers)
      ? [...config.commission_tiers].sort((a, b) => Number(a.from_amount || 0) - Number(b.from_amount || 0))
      : [];

    if (tiers.length === 0) {
      return { commission: 0, breakdown: { model: 'tiered', note: 'پله‌ای تعریف نشده است' } };
    }

    if (config.tiered_calculation_mode === 'retroactive') {
      // Find highest qualifying tier
      let appliedTier: CommissionTier | null = null;
      for (const t of tiers) {
        if (totalSales >= Number(t.from_amount || 0)) {
          appliedTier = t;
        }
      }

      if (appliedTier) {
        const rate = Number(appliedTier.rate_percent) || 0;
        const commission = Math.round(totalSales * (rate / 100));
        return {
          commission,
          breakdown: {
            model: 'tiered',
            mode: 'retroactive',
            note: 'عطف‌به‌ماسبق: اعمال بالاترین پله به کل فروش',
            applied_tier: appliedTier,
            rate_percent: rate,
            total_sales: totalSales,
            commission,
          },
        };
      }

      return {
        commission: 0,
        breakdown: {
          model: 'tiered',
          mode: 'retroactive',
          note: 'فروش کمتر از اولین پله بوده است',
        },
      };
    }

    // Default or Marginal (Bracket-based)
    let totalCommission = 0;
    const appliedBrackets: any[] = [];

    for (const t of tiers) {
      const bStart = Number(t.from_amount || 0);
      const bEnd = t.to_amount !== null && t.to_amount !== undefined ? Math.min(totalSales, Number(t.to_amount)) : totalSales;

      if (totalSales > bStart && bEnd > bStart) {
        const slice = bEnd - bStart;
        const rate = Number(t.rate_percent) || 0;
        const earned = Math.round(slice * (rate / 100));
        totalCommission += earned;
        appliedBrackets.push({
          from_amount: bStart,
          to_amount: t.to_amount,
          slice_amount: slice,
          rate_percent: rate,
          earned,
        });
      }
    }

    return {
      commission: totalCommission,
      breakdown: {
        model: 'tiered',
        mode: 'marginal',
        note: 'پله‌ای مازاد: اعمال درصد هر پله بر مبلغ واقع در همان بازه',
        applied_brackets: appliedBrackets,
        total_sales: totalSales,
        commission: totalCommission,
      },
    };
  }

  return { commission: 0, breakdown: { model: 'unknown' } };
}

// --------------------------------------------------------------------------
// 1. GET /api/payroll/configs - List salary configurations
// --------------------------------------------------------------------------
router.get(['/api/payroll/configs', '/payroll/configs'], async (req: Request, res: Response) => {
  if (!hasPayrollAccess(req)) {
    return res.status(403).json({ error: 'دسترسی غیرمجاز. فقط مدیر سیستم امکان مشاهده احکام حقوق را دارد.' });
  }

  if (directusUrl && directusAdminToken) {
    try {
      const resp = await directusFetchAllPages('/items/personnel_salary_configs?sort=-id');
      if (resp && Array.isArray(resp.data)) {
        const list: PersonnelSalaryConfig[] = resp.data.map(normalizeSalaryConfigRecord);
        return res.json(list);
      }
    } catch (err: any) {
      console.warn('Directus personnel_salary_configs fetch notice:', err.message);
    }
  }

  res.json(salaryConfigsData.map(normalizeSalaryConfigRecord));
});

// --------------------------------------------------------------------------
// 2. GET /api/payroll/configs/:personnelId - Get config for specific personnel
// --------------------------------------------------------------------------
router.get(['/api/payroll/configs/:personnelId', '/payroll/configs/:personnelId'], async (req: Request, res: Response) => {
  if (!hasPayrollAccess(req)) {
    return res.status(403).json({ error: 'دسترسی غیرمجاز.' });
  }

  const { personnelId } = req.params;

  if (directusUrl && directusAdminToken) {
    try {
      const resp = await directusFetch(`/items/personnel_salary_configs?filter[personnel_id][_eq]=${encodeURIComponent(personnelId)}&sort=-id&limit=1`);
      if (resp?.data && resp.data.length > 0) {
        return res.json(normalizeSalaryConfigRecord(resp.data[0]));
      }
    } catch {}
  }

  const found = salaryConfigsData.find((c) => String(c.personnel_id) === String(personnelId));
  if (found) return res.json(normalizeSalaryConfigRecord(found));

  return res.status(404).json({
    personnel_id: personnelId,
    exists: false,
    error: 'حکم حقوقی برای این همکار هنوز تعریف نشده است.',
  });
});


// --------------------------------------------------------------------------
// 3. POST /api/payroll/configs - Create or update salary config
// --------------------------------------------------------------------------
router.post(['/api/payroll/configs', '/payroll/configs'], async (req: Request, res: Response) => {
  if (!hasPayrollAccess(req)) {
    return res.status(403).json({ error: 'دسترسی غیرمجاز.' });
  }

  const payload: PersonnelSalaryConfig = req.body;
  const rawPId = String(payload.personnel_id || '').trim();
  if (!rawPId) {
    return res.status(400).json({ error: 'شناسه پرسنل الزامی است.' });
  }

  const resolved = await resolvePersonnelId(rawPId);
  const targetPersonnelId = resolved.personnelId || rawPId;
  const nowIso = new Date().toISOString();

  const normalizedConfig: PersonnelSalaryConfig = {
    personnel_id: targetPersonnelId,
    salary_type: payload.salary_type || 'fixed_plus_commission',
    base_salary: Math.max(0, Math.round(Number(payload.base_salary) || 0)),
    commission_model: payload.commission_model || 'tiered',
    flat_rate_percent: Math.max(0, Number(payload.flat_rate_percent) || 0),
    tiered_calculation_mode: payload.tiered_calculation_mode || 'marginal',
    commission_tiers: Array.isArray(payload.commission_tiers) ? payload.commission_tiers : [],
    min_sales_target: Math.max(0, Math.round(Number(payload.min_sales_target) || 0)),
    require_min_sales_for_base_salary: Boolean(payload.require_min_sales_for_base_salary),
    base_salary_min_sales_basis: normalizeBaseSalaryBasis(payload.base_salary_min_sales_basis),
    base_salary_min_sales_amount: Math.max(0, Math.round(Number(payload.base_salary_min_sales_amount) || 0)),
    base_salary_min_units_count: Math.max(0, Math.round(Number(payload.base_salary_min_units_count) || 0)),
    base_salary_below_target_mode: normalizeBelowTargetMode(payload.base_salary_below_target_mode),
    is_active: payload.is_active !== undefined ? Boolean(payload.is_active) : true,
    effective_from: payload.effective_from || nowIso,
    date_updated: nowIso,
  };

  const { tenantId } = getRequestUser(req);
  const resolvedTenantNum = resolveDirectusTenantId(payload.tenant_id || tenantId || 'default');

  if (directusUrl && directusAdminToken) {
    try {
      const safePId = await getSafeDirectusPersonnelForeignKey(targetPersonnelId);
      const directusPayload = {
        ...normalizedConfig,
        personnel_id: safePId,
        tenant_id: resolvedTenantNum,
      };

      // Check if existing item exists
      const existing = await directusFetch(`/items/personnel_salary_configs?filter[personnel_id][_eq]=${safePId || targetPersonnelId}&limit=1`);
      if (existing?.data && existing.data.length > 0) {
        const existId = existing.data[0].id;
        const updated = await directusFetch(`/items/personnel_salary_configs/${existId}`, {
          method: 'PATCH',
          body: JSON.stringify(directusPayload),
        });
        if (updated?.data) {
          const saved = normalizeSalaryConfigRecord({
            ...updated.data,
            personnel_id: targetPersonnelId,
          });
          const idx = salaryConfigsData.findIndex((c) => String(c.personnel_id) === String(targetPersonnelId));
          if (idx >= 0) salaryConfigsData[idx] = saved;
          else salaryConfigsData.push(saved);
          return res.json(saved);
        }
      } else {
        const created = await directusFetch('/items/personnel_salary_configs', {
          method: 'POST',
          body: JSON.stringify(directusPayload),
        });
        if (created?.data) {
          const saved = normalizeSalaryConfigRecord({
            ...created.data,
            personnel_id: targetPersonnelId,
          });
          salaryConfigsData.push(saved);
          return res.status(201).json(saved);
        }
      }
    } catch (err: any) {
      console.warn('Directus personnel_salary_configs write error, fallback to local store:', err.message);
    }
  }

  // Local fallback
  const idx = salaryConfigsData.findIndex((c) => String(c.personnel_id) === String(targetPersonnelId));
  if (idx >= 0) {
    salaryConfigsData[idx] = {
      ...salaryConfigsData[idx],
      ...normalizedConfig,
      id: salaryConfigsData[idx].id || Date.now(),
    };
    return res.json(salaryConfigsData[idx]);
  } else {
    const newItem = {
      ...normalizedConfig,
      id: Date.now(),
      date_created: nowIso,
    };
    salaryConfigsData.push(newItem);
    return res.status(201).json(newItem);
  }
});

// --------------------------------------------------------------------------
// 4. POST /api/payroll/calculate - Live Monthly Simulation & Calculations
// --------------------------------------------------------------------------
router.post(['/api/payroll/calculate', '/payroll/calculate'], async (req: Request, res: Response) => {
  if (!hasPayrollAccess(req)) {
    return res.status(403).json({ error: 'دسترسی غیرمجاز.' });
  }

  const { from_date, to_date, personnel_id, target_year, target_month } = req.body;
  const { tenantId } = getRequestUser(req);
  const fromIso = from_date ? new Date(from_date).toISOString() : null;
  const toIso = to_date ? new Date(to_date).toISOString() : null;
  const targetYearNum = target_year ? Number(target_year) : null;
  const targetMonthNum = target_month ? Number(target_month) : null;

  // 1. Fetch current reports
  let allReports: CustomerReport[] = [];
  if (directusUrl && directusAdminToken) {
    try {
      const resp = await directusFetchAllPages('/items/customer_reports?limit=1000&sort=-date_created');
      if (resp?.data && Array.isArray(resp.data)) {
        allReports = resp.data;
      }
    } catch {}
  }
  if (allReports.length === 0) {
    allReports = [...reportsData];
  }

  // 2. Fetch approved advances
  let allAdvances: SalaryAdvanceRequest[] = [];
  if (directusUrl && directusAdminToken) {
    try {
      const resp = await directusFetchAllPages('/items/advance_requests?filter[status][_eq]=approved&sort=-date_created');
      if (resp?.data && Array.isArray(resp.data)) {
        allAdvances = resp.data;
      }
    } catch {}
  }
  if (allAdvances.length === 0) {
    allAdvances = advanceRequestsData.filter((a) => a.status === 'approved');
  }

  // 3. Fetch salary configs
  let allConfigs: PersonnelSalaryConfig[] = [];
  if (directusUrl && directusAdminToken) {
    try {
      const resp = await directusFetchAllPages('/items/personnel_salary_configs');
      if (resp?.data && Array.isArray(resp.data)) {
        allConfigs = resp.data.map(normalizeSalaryConfigRecord);
      }
    } catch {}
  }
  if (allConfigs.length === 0) {
    allConfigs = salaryConfigsData.map(normalizeSalaryConfigRecord);
  }

  // 3.5 Fetch payroll adjustments (bonuses & deductions)
  let allAdjustments: PayrollAdjustment[] = [];
  if (directusUrl && directusAdminToken) {
    try {
      const resp = await directusFetchAllPages('/items/payroll_adjustments?fields=*,personnel_id.*&sort=-date_created,-id');
      if (resp?.data && Array.isArray(resp.data)) {
        allAdjustments = resp.data.map(normalizePayrollAdjustment);
      }
    } catch {}
  }
  if (allAdjustments.length === 0 && payrollAdjustmentsData.length > 0) {
    allAdjustments = payrollAdjustmentsData.map(normalizePayrollAdjustment);
  }
  if (tenantId && tenantId !== 'all') {
    allAdjustments = allAdjustments.filter((a) => {
      if (!a.tenant_id) return true;
      return (
        matchesTenant(String(a.tenant_id), tenantId) ||
        matchesTenant(String(a.tenant_id), '1') ||
        matchesTenant(String(a.tenant_id), 'default')
      );
    });
  }

  // 4. Target personnel list
  let targetPersonnel = [...personnelData].filter((p) => p.status !== 'inactive' && p.active !== false);
  if (personnel_id && personnel_id !== 'all') {
    targetPersonnel = targetPersonnel.filter((p) => String(p.id) === String(personnel_id));
  }

  const results = targetPersonnel.map((p) => {
    // A. Match qualifying contract reports within the time range
    const matchingContracts = allReports.filter((r) => {
      const isContract = String(r.negotiation_status || '').trim() === 'قرارداد' || String(r.negotiation_status || '').includes('قرارداد');
      if (!isContract) return false;

      const commType = normalizeCommissionType(r.commission_type);
      const amt = Number(r.contract_amount || 0);
      const parsedItems = parseUnitCommissionItems(r.unit_commission_items);
      const manualAmt = Number(r.manual_commission_amount || 0);
      if (amt <= 0 && !(commType === 'unit' && (manualAmt > 0 || parsedItems.length > 0))) {
        return false;
      }

      if (!isReportByPersonnel(r, p)) return false;

      const reportDate = r.contract_date || r.date_created;
      if (!reportDate) return true;
      if (fromIso && new Date(reportDate) < new Date(fromIso)) return false;
      if (toIso && new Date(reportDate) > new Date(toIso)) return false;

      return true;
    });

    // Separate percentage vs unit contracts and compute approved unit metrics
    let percentageSalesAmount = 0;
    let unitSalesAmount = 0;
    let percentageContractsCount = 0;
    let unitContractsCount = 0;
    let approvedUnitItemsCount = 0;
    let unitCommissionAmount = 0;
    let pendingUnitCommissionsCount = 0;

    const enrichedContracts = matchingContracts.map((c) => {
      const commType = normalizeCommissionType(c.commission_type);
      const contractAmt = Math.max(0, Math.round(Number(c.contract_amount) || 0));
      const unitItems = commType === 'unit' ? parseUnitCommissionItems(c.unit_commission_items) : [];
      const manualAmt = commType === 'unit'
        ? (unitItems.length > 0
            ? unitItems.reduce((s, it) => s + it.total_commission, 0)
            : Math.max(0, Math.round(Number(c.manual_commission_amount) || 0)))
        : 0;

      let contractApprovedUnits = 0;
      let contractEffectiveUnitComm = 0;
      let isPendingUnit = false;

      if (commType === 'unit') {
        unitContractsCount += 1;
        unitSalesAmount += contractAmt;
        if (unitItems.length > 0) {
          const approvedItems = unitItems.filter((it) => it.status === 'approved');
          contractApprovedUnits = approvedItems.reduce(
            (s, it) => s + Math.max(0, Math.round(Number(it.approved_quantity ?? it.quantity) || 0)),
            0
          );
          contractEffectiveUnitComm = approvedItems.reduce((s, it) => {
            const qty = Math.max(0, Math.round(Number(it.approved_quantity ?? it.quantity) || 0));
            const uComm = Math.max(0, Math.round(Number(it.approved_unit_commission ?? it.unit_commission) || 0));
            return s + Math.round(qty * uComm);
          }, 0);
          isPendingUnit =
            !c.manual_commission_status ||
            c.manual_commission_status === 'pending' ||
            unitItems.some((it) => it.status === 'pending');
        } else {
          isPendingUnit = !c.manual_commission_status || c.manual_commission_status === 'pending';
          if (c.manual_commission_status === 'approved') {
            contractApprovedUnits = 1;
            contractEffectiveUnitComm = Math.max(
              0,
              Math.round(Number(c.approved_commission_amount ?? c.manual_commission_amount) || 0)
            );
          }
        }
        approvedUnitItemsCount += contractApprovedUnits;
        unitCommissionAmount += contractEffectiveUnitComm;
        if (isPendingUnit) pendingUnitCommissionsCount += 1;
      } else {
        percentageContractsCount += 1;
        percentageSalesAmount += contractAmt;
      }

      return {
        id: c.id,
        contract_number: c.contract_number,
        contract_date: c.contract_date || c.date_created,
        contract_amount: contractAmt,
        contract_items: c.contract_items,
        customer_id: c.customer_id,
        commission_type: commType,
        unit_commission_items: unitItems,
        manual_commission_amount: manualAmt,
        approved_commission_amount:
          commType === 'unit'
            ? (c.approved_commission_amount !== undefined && c.approved_commission_amount !== null
                ? Number(c.approved_commission_amount)
                : contractEffectiveUnitComm)
            : null,
        manual_commission_status:
          commType === 'unit' ? (c.manual_commission_status || 'pending') : null,
        commission_review_note: c.commission_review_note || null,
        commission_reviewed_by: c.commission_reviewed_by || null,
        commission_reviewed_at: c.commission_reviewed_at || null,
        approved_units_count: contractApprovedUnits,
        effective_unit_commission: contractEffectiveUnitComm,
      };
    });

    const totalContractsAmount = percentageSalesAmount + unitSalesAmount;
    const contractsCount = matchingContracts.length;

    // B. Match approved advances
    const matchingAdvances = allAdvances.filter((a) => {
      const aPId = typeof a.personnel_id === 'object' && a.personnel_id !== null ? String((a.personnel_id as any).id) : String(a.personnel_id || '');
      const cleanAPId = aPId.replace(/^p-/, '');
      const rawPId = String(p.id || '').replace(/^p-/, '');
      const pNameNorm = normalizePersianString(p.name);
      const aNameNorm = normalizePersianString(a.personnel_name);

      const isMatch = aPId === p.id || cleanAPId === rawPId || (pNameNorm && aNameNorm && pNameNorm === aNameNorm);
      if (!isMatch) return false;

      const advDate = a.needed_date || a.date_created;
      if (advDate) {
        if (fromIso && new Date(advDate) < new Date(fromIso)) return false;
        if (toIso && new Date(advDate) > new Date(toIso)) return false;
      }

      return true;
    });

    const totalAdvancesDeducted = matchingAdvances.reduce((sum, a) => sum + (Number(a.approved_amount ?? a.amount) || 0), 0);

    // B.5 Match unlinked payroll adjustments (bonuses & deductions) for this personnel and period
    const rawPIdClean = String(p.id || '').trim().toLowerCase().replace(/^p-/, '');
    const pNameNorm = normalizePersianString(p.name);
    const matchingPeriodAdjustments = allAdjustments.filter((a) => {
      // Skip items already settled/linked into another payroll slip
      if (a.payroll_slip_id) return false;
      if (a.status === 'rejected') return false;

      const aPId = String(a.personnel_id || '').trim().toLowerCase();
      const cleanAPId = aPId.replace(/^p-/, '');
      const aNameNorm = normalizePersianString(a.personnel_name);
      const isOwner =
        aPId === String(p.id || '').trim().toLowerCase() ||
        (rawPIdClean && cleanAPId === rawPIdClean) ||
        (pNameNorm && aNameNorm && pNameNorm === aNameNorm);
      if (!isOwner) return false;

      // Prefer explicit Jalali target_year + target_month matching when both are present
      if (targetYearNum && targetMonthNum && a.target_year && a.target_month) {
        return Number(a.target_year) === targetYearNum && Number(a.target_month) === targetMonthNum;
      }

      // Fallback to effective_date / date_created within [fromIso, toIso]
      const adjDate = a.effective_date || a.date_created;
      if (adjDate) {
        if (fromIso && new Date(adjDate) < new Date(fromIso)) return false;
        if (toIso && new Date(adjDate) > new Date(toIso)) return false;
      }
      return true;
    });

    const approvedAdjustments = matchingPeriodAdjustments.filter((a) => a.status === 'approved');
    const pendingAdjustments = matchingPeriodAdjustments.filter((a) => a.status === 'pending');

    const bonusesAmount = approvedAdjustments
      .filter((a) => a.type === 'bonus')
      .reduce((sum, a) => sum + (Number(a.approved_amount ?? a.amount) || 0), 0);

    const deductionsAmount = approvedAdjustments
      .filter((a) => a.type === 'deduction')
      .reduce((sum, a) => sum + (Number(a.approved_amount ?? a.amount) || 0), 0);

    // C. Find active salary configuration
    const config = allConfigs.find((c) => String(c.personnel_id) === String(p.id) && c.is_active !== false) || null;

    if (!config) {
      return {
        personnel_id: p.id,
        personnel_name: p.name,
        personnel_role: p.role,
        avatar: p.profile_image || p.avatar || '',
        has_config: false,
        salary_config: null,
        contracts_count: contractsCount,
        percentage_contracts_count: percentageContractsCount,
        unit_contracts_count: unitContractsCount,
        total_contracts_amount: totalContractsAmount,
        percentage_sales_amount: percentageSalesAmount,
        unit_sales_amount: unitSalesAmount,
        approved_unit_items_count: approvedUnitItemsCount,
        contracts_list: enrichedContracts,
        configured_base_salary: 0,
        base_salary_amount: 0,
        base_salary_threshold_breakdown: null,
        commission_amount: unitCommissionAmount,
        percentage_commission_amount: 0,
        unit_commission_amount: unitCommissionAmount,
        pending_unit_commissions_count: pendingUnitCommissionsCount,
        commission_breakdown: { note: 'حکم حقوقی برای این همکار هنوز تعریف نشده است' },
        advances_deducted: totalAdvancesDeducted,
        advances_list: matchingAdvances,
        bonuses_amount: bonusesAmount,
        deductions_amount: deductionsAmount,
        adjustments_list: approvedAdjustments,
        pending_adjustments_count: pendingAdjustments.length,
        pending_adjustments_list: pendingAdjustments,
        raw_net_payable: 0,
        net_payable: 0,
      };
    }

    // D. Compute Base Salary with Minimum Sales Threshold
    const configuredBaseSalary = config.salary_type === 'commission' ? 0 : Math.max(0, Math.round(Number(config.base_salary) || 0));
    const { appliedBaseSalary: baseSalary, breakdown: baseSalaryThresholdBreakdown } = calculateBaseSalaryWithThreshold(config, {
      percentageSalesAmount,
      totalSalesAmount: totalContractsAmount,
      approvedUnitItemsCount,
      contractsCount,
    });

    // E. Compute Commission (Percentage commission ONLY on percentage sales + approved unit commission)
    const { commission: percentageCommission, breakdown } = calculateCommissionForSales(percentageSalesAmount, config);
    const commission = percentageCommission + unitCommissionAmount;

    // F. Final Net Payable
    const rawNetPayable = baseSalary + commission + bonusesAmount - totalAdvancesDeducted - deductionsAmount;
    const netPayable = Math.max(0, rawNetPayable);

    return {
      personnel_id: p.id,
      personnel_name: p.name,
      personnel_role: p.role,
      avatar: p.profile_image || p.avatar || '',
      has_config: true,
      salary_config: config,
      contracts_count: contractsCount,
      percentage_contracts_count: percentageContractsCount,
      unit_contracts_count: unitContractsCount,
      total_contracts_amount: totalContractsAmount,
      percentage_sales_amount: percentageSalesAmount,
      unit_sales_amount: unitSalesAmount,
      approved_unit_items_count: approvedUnitItemsCount,
      contracts_list: enrichedContracts,
      configured_base_salary: configuredBaseSalary,
      base_salary_amount: baseSalary,
      base_salary_threshold_breakdown: baseSalaryThresholdBreakdown,
      commission_amount: commission,
      percentage_commission_amount: percentageCommission,
      unit_commission_amount: unitCommissionAmount,
      pending_unit_commissions_count: pendingUnitCommissionsCount,
      commission_breakdown: breakdown,
      advances_deducted: totalAdvancesDeducted,
      advances_list: matchingAdvances,
      bonuses_amount: bonusesAmount,
      deductions_amount: deductionsAmount,
      adjustments_list: approvedAdjustments,
      pending_adjustments_count: pendingAdjustments.length,
      pending_adjustments_list: pendingAdjustments,
      raw_net_payable: rawNetPayable,
      net_payable: netPayable,
    };
  });

  res.json({
    from_date: fromIso,
    to_date: toIso,
    target_year: targetYearNum,
    target_month: targetMonthNum,
    total_payable: results.reduce((sum, r) => sum + r.net_payable, 0),
    total_sales: results.reduce((sum, r) => sum + r.total_contracts_amount, 0),
    total_contracts: results.reduce((sum, r) => sum + r.contracts_count, 0),
    total_advances: results.reduce((sum, r) => sum + r.advances_deducted, 0),
    total_bonuses: results.reduce((sum, r) => sum + r.bonuses_amount, 0),
    total_deductions: results.reduce((sum, r) => sum + r.deductions_amount, 0),
    total_percentage_commission: results.reduce((sum, r) => sum + (r.percentage_commission_amount || 0), 0),
    total_unit_commission: results.reduce((sum, r) => sum + (r.unit_commission_amount || 0), 0),
    total_pending_unit_commissions: results.reduce((sum, r) => sum + (r.pending_unit_commissions_count || 0), 0),
    items: results,
  });
});

// --------------------------------------------------------------------------
// 4.5 PATCH /api/payroll/reports/:id/commission-review - Admin review of unit sales commission
// --------------------------------------------------------------------------
router.patch(['/api/payroll/reports/:id/commission-review', '/payroll/reports/:id/commission-review'], async (req: Request, res: Response) => {
  if (!hasPayrollAccess(req)) {
    return res.status(403).json({ error: 'دسترسی غیرمجاز. فقط مدیر سیستم امکان بررسی و تایید پورسانت تعدادی را دارد.' });
  }

  const { id } = req.params;
  const { userName } = getRequestUser(req);
  const body = req.body || {};
  const nowIso = new Date().toISOString();

  // Fetch existing report
  let existingReport: CustomerReport | null = null;
  if (directusUrl && directusAdminToken) {
    try {
      const resp = await directusFetch(`/items/customer_reports/${encodeURIComponent(id)}`);
      if (resp?.data) {
        existingReport = normalizeReportRecord(resp.data);
      }
    } catch {}
  }
  if (!existingReport) {
    const localFound = reportsData.find((r) => String(r.id) === String(id));
    if (localFound) existingReport = normalizeReportRecord(localFound);
  }
  if (!existingReport) {
    return res.status(404).json({ error: 'گزارش قرارداد مورد نظر یافت نشد.' });
  }

  const targetType: ReportCommissionType =
    body.commission_type !== undefined && body.commission_type !== null
      ? normalizeCommissionType(body.commission_type)
      : normalizeCommissionType(existingReport.commission_type);

  const reviewNote =
    body.commission_review_note !== undefined
      ? (body.commission_review_note ? String(body.commission_review_note).trim().slice(0, 1000) : null)
      : (existingReport.commission_review_note || null);

  let patchPayload: Record<string, any> = {};

  if (targetType === 'percentage') {
    patchPayload = {
      commission_type: 'percentage' as ReportCommissionType,
      unit_commission_items: null,
      manual_commission_amount: 0,
      approved_commission_amount: null,
      manual_commission_status: null,
      commission_review_note: reviewNote,
      commission_reviewed_by: userName || 'مدیر سیستم',
      commission_reviewed_at: nowIso,
    };
  } else {
    let workingItems: UnitCommissionItem[] = parseUnitCommissionItems(existingReport.unit_commission_items);

    // If admin sends explicit items array (editing existing or converting percentage -> unit)
    if (Array.isArray(body.items) && body.items.length > 0) {
      const existingById = new Map(workingItems.map((it) => [String(it.id), it]));
      const nextItems: UnitCommissionItem[] = [];

      for (const raw of body.items.slice(0, 50)) {
        if (!raw || typeof raw !== 'object') continue;
        const orig = raw.id ? existingById.get(String(raw.id)) : undefined;
        const productName = String(raw.product_name ?? orig?.product_name ?? '').trim().slice(0, 200);
        if (!productName) continue;

        const baseQty = orig
          ? orig.quantity
          : Math.max(1, Math.round(Number(raw.quantity ?? raw.approved_quantity) || 1));
        const baseUnitComm = orig
          ? orig.unit_commission
          : Math.max(0, Math.round(Number(raw.unit_commission ?? raw.approved_unit_commission) || 0));

        const rawStatus = String(raw.status ?? orig?.status ?? 'pending');
        const status: 'pending' | 'approved' | 'rejected' =
          rawStatus === 'approved' || rawStatus === 'rejected' ? rawStatus : 'pending';

        const appQtyInput =
          raw.approved_quantity !== undefined && raw.approved_quantity !== null && raw.approved_quantity !== ''
            ? Number(raw.approved_quantity)
            : orig?.approved_quantity ?? null;
        const approvedQty =
          appQtyInput !== null && Number.isFinite(appQtyInput) && appQtyInput >= 0
            ? Math.min(1000000, Math.round(appQtyInput))
            : null;

        const appUnitInput =
          raw.approved_unit_commission !== undefined && raw.approved_unit_commission !== null && raw.approved_unit_commission !== ''
            ? Number(raw.approved_unit_commission)
            : orig?.approved_unit_commission ?? null;
        const approvedUnit =
          appUnitInput !== null && Number.isFinite(appUnitInput) && appUnitInput >= 0
            ? Math.min(100000000000, Math.round(appUnitInput))
            : null;

        let approvedTotal: number | null = null;
        if (status === 'approved') {
          const finalQty = approvedQty !== null ? approvedQty : baseQty;
          const finalUnit = approvedUnit !== null ? approvedUnit : baseUnitComm;
          approvedTotal = Math.round(finalQty * finalUnit);
        } else if (status === 'rejected') {
          approvedTotal = 0;
        }

        nextItems.push({
          id: orig?.id || (typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim().slice(0, 64) : crypto.randomUUID()),
          product_name: productName,
          quantity: baseQty,
          unit_commission: baseUnitComm,
          total_commission: Math.round(baseQty * baseUnitComm),
          status,
          approved_quantity: status === 'approved' ? (approvedQty !== null ? approvedQty : baseQty) : approvedQty,
          approved_unit_commission: status === 'approved' ? (approvedUnit !== null ? approvedUnit : baseUnitComm) : approvedUnit,
          approved_total_commission: approvedTotal,
          manager_note:
            raw.manager_note !== undefined
              ? (raw.manager_note ? String(raw.manager_note).trim().slice(0, 500) : null)
              : (orig?.manager_note || null),
        });
      }
      workingItems = nextItems;
    }

    if (body.action === 'approve_all') {
      workingItems = workingItems.map((it) => {
        const finalQty = it.approved_quantity !== null && it.approved_quantity !== undefined ? it.approved_quantity : it.quantity;
        const finalUnit = it.approved_unit_commission !== null && it.approved_unit_commission !== undefined ? it.approved_unit_commission : it.unit_commission;
        return {
          ...it,
          status: 'approved',
          approved_quantity: finalQty,
          approved_unit_commission: finalUnit,
          approved_total_commission: Math.round(finalQty * finalUnit),
        };
      });
    } else if (body.action === 'reject_all') {
      workingItems = workingItems.map((it) => ({
        ...it,
        status: 'rejected',
        approved_total_commission: 0,
      }));
    }

    if (workingItems.length === 0) {
      return res.status(400).json({ error: 'برای فروش تعدادی، وجود حداقل یک ردیف محصول الزامی است.' });
    }

    const manualTotal = workingItems.reduce((s, it) => s + it.total_commission, 0);
    const approvedTotal = workingItems.reduce(
      (s, it) => s + (it.status === 'approved' ? (it.approved_total_commission || 0) : 0),
      0
    );

    const allApproved = workingItems.every((it) => it.status === 'approved');
    const allRejected = workingItems.every((it) => it.status === 'rejected');
    const anyApproved = workingItems.some((it) => it.status === 'approved');

    let computedStatus: ManualCommissionStatus = 'pending';
    if (allApproved) computedStatus = 'approved';
    else if (allRejected) computedStatus = 'rejected';
    else if (anyApproved) computedStatus = 'partially_approved';
    else computedStatus = 'pending';

    patchPayload = {
      commission_type: 'unit' as ReportCommissionType,
      unit_commission_items: workingItems,
      manual_commission_amount: manualTotal,
      approved_commission_amount: approvedTotal,
      manual_commission_status: computedStatus,
      commission_review_note: reviewNote,
      commission_reviewed_by: userName || 'مدیر سیستم',
      commission_reviewed_at: nowIso,
    };
  }

  let savedReport: any = { ...existingReport, ...patchPayload };

  if (directusUrl && directusAdminToken) {
    try {
      const directusPatch = {
        ...patchPayload,
        // Directus schema defines commission_type as JSON (select-multiple-dropdown)
        commission_type: [targetType],
      };
      const updated = await directusFetch(`/items/customer_reports/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(directusPatch),
      });
      if (updated?.data) {
        savedReport = normalizeReportRecord(updated.data);
      }
    } catch (err: any) {
      console.warn('Directus commission review PATCH notice:', err.message);
    }
  }

  // Update in-memory fallback array & invalidate reports cache
  const localIdx = reportsData.findIndex((r) => String(r.id) === String(id));
  if (localIdx >= 0) {
    reportsData[localIdx] = { ...reportsData[localIdx], ...patchPayload };
  }
  invalidateReportsCache();

  return res.json({
    success: true,
    report: normalizeReportRecord(savedReport),
  });
});

// --------------------------------------------------------------------------
// 5. GET /api/payroll/slips - Get issued payroll slips
// --------------------------------------------------------------------------
router.get(['/api/payroll/slips', '/payroll/slips'], async (req: Request, res: Response) => {
  if (!hasPayrollAccess(req)) {
    return res.status(403).json({ error: 'دسترسی غیرمجاز.' });
  }

  const { personnel_id, status } = req.query;

  if (directusUrl && directusAdminToken) {
    try {
      let filterQuery = '';
      const filters: string[] = [];
      if (personnel_id && personnel_id !== 'all') {
        filters.push(`filter[personnel_id][_eq]=${personnel_id}`);
      }
      if (status && status !== 'all') {
        filters.push(`filter[status][_eq]=${status}`);
      }
      if (filters.length > 0) {
        filterQuery = '&' + filters.join('&');
      }

      const resp = await directusFetchAllPages(`/items/payroll_slips?fields=*,personnel_id.*&sort=-id${filterQuery}`);
      if (resp?.data && Array.isArray(resp.data)) {
        const list: PayrollSlip[] = resp.data.map((s: any) => {
          const pIdStr = typeof s.personnel_id === 'object' && s.personnel_id !== null ? String(s.personnel_id.id) : String(s.personnel_id || '');
          const pObj = personnelData.find((p) => String(p.id) === pIdStr);
          const pName =
            (typeof s.personnel_id === 'object' && s.personnel_id !== null ? s.personnel_id.name : undefined) ||
            (s.personnel_name && s.personnel_name !== pIdStr ? s.personnel_name : '') ||
            pObj?.name ||
            'همکار گرامی';

          const totalComm = Number(s.commission_amount) || 0;
          const hasSplit = s.percentage_commission_amount !== undefined && s.percentage_commission_amount !== null ||
            s.unit_commission_amount !== undefined && s.unit_commission_amount !== null;
          const pctComm = hasSplit ? (Number(s.percentage_commission_amount) || 0) : totalComm;
          const unitComm = hasSplit ? (Number(s.unit_commission_amount) || 0) : 0;

          return {
            ...s,
            id: s.id,
            personnel_id: pIdStr,
            personnel_name: pName,
            base_salary_amount: Number(s.base_salary_amount) || 0,
            total_contracts_amount: Number(s.total_contracts_amount) || 0,
            contracts_count: Number(s.contracts_count) || 0,
            commission_amount: totalComm,
            percentage_commission_amount: pctComm,
            unit_commission_amount: unitComm,
            advances_deducted: Number(s.advances_deducted) || 0,
            bonuses_amount: Number(s.bonuses_amount) || 0,
            deductions_amount: Number(s.deductions_amount) || 0,
            net_payable: Number(s.net_payable) || 0,
            calculation_breakdown:
              typeof s.calculation_breakdown === 'string'
                ? JSON.parse(s.calculation_breakdown || '{}')
                : (s.calculation_breakdown || {}),
          };
        });
        return res.json(list);
      }
    } catch (err: any) {
      console.warn('Directus payroll_slips fetch notice:', err.message);
    }
  }

  let list = payrollSlipsData.map((s) => {
    const pObj = personnelData.find((p) => String(p.id) === String(s.personnel_id));
    return {
      ...s,
      personnel_name: (s.personnel_name && s.personnel_name !== String(s.personnel_id) ? s.personnel_name : '') || pObj?.name || 'همکار گرامی',
    };
  });

  if (personnel_id && personnel_id !== 'all') {
    list = list.filter((s) => String(s.personnel_id) === String(personnel_id));
  }
  if (status && status !== 'all') {
    list = list.filter((s) => s.status === status);
  }

  res.json(list);
});

// --------------------------------------------------------------------------
// 6. POST /api/payroll/slips - Finalize and Issue Payroll Slip(s)
// --------------------------------------------------------------------------
router.post(['/api/payroll/slips', '/payroll/slips'], async (req: Request, res: Response) => {
  if (!hasPayrollAccess(req)) {
    return res.status(403).json({ error: 'دسترسی غیرمجاز.' });
  }

  const { userName, tenantId } = getRequestUser(req);
  const body = req.body;
  const items = Array.isArray(body) ? body : [body];
  const createdSlips: PayrollSlip[] = [];
  const nowIso = new Date().toISOString();

  for (const item of items) {
    const rawPId = String(item.personnel_id || '');
    const pObj = personnelData.find((p) => String(p.id) === rawPId);
    const targetName =
      (item.personnel_name && item.personnel_name !== rawPId ? item.personnel_name : '') ||
      pObj?.name ||
      'همکار گرامی';

    const baseSalaryAmt = Math.max(0, Math.round(Number(item.base_salary_amount) || 0));
    const hasSplitInput =
      (item.percentage_commission_amount !== undefined && item.percentage_commission_amount !== null) ||
      (item.unit_commission_amount !== undefined && item.unit_commission_amount !== null);
    const pctCommissionAmt = hasSplitInput
      ? Math.max(0, Math.round(Number(item.percentage_commission_amount) || 0))
      : Math.max(0, Math.round(Number(item.commission_amount) || 0));
    const unitCommissionAmt = hasSplitInput
      ? Math.max(0, Math.round(Number(item.unit_commission_amount) || 0))
      : 0;
    const commissionAmt = hasSplitInput
      ? pctCommissionAmt + unitCommissionAmt
      : Math.max(0, Math.round(Number(item.commission_amount) || 0));
    const advancesAmt = Math.max(0, Math.round(Number(item.advances_deducted) || 0));
    const bonusesAmt = Math.max(0, Math.round(Number(item.bonuses_amount) || 0));
    const deductionsAmt = Math.max(0, Math.round(Number(item.deductions_amount) || 0));

    // Server-side authoritative net_payable recomputation
    const computedNetPayable = Math.max(
      0,
      baseSalaryAmt + commissionAmt + bonusesAmt - advancesAmt - deductionsAmt
    );

    const targetTenantId = pObj?.tenant_id || item.tenant_id || tenantId || 'default';
    const resolvedTenantNum = resolveDirectusTenantId(targetTenantId);

    const newSlip: PayrollSlip = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      personnel_id: rawPId,
      personnel_name: targetName,
      from_date: item.from_date || null,
      to_date: item.to_date || null,
      base_salary_amount: baseSalaryAmt,
      total_contracts_amount: Math.max(0, Math.round(Number(item.total_contracts_amount) || 0)),
      contracts_count: Math.max(0, Math.round(Number(item.contracts_count) || 0)),
      commission_amount: commissionAmt,
      percentage_commission_amount: pctCommissionAmt,
      unit_commission_amount: unitCommissionAmt,
      advances_deducted: advancesAmt,
      bonuses_amount: bonusesAmt,
      deductions_amount: deductionsAmt,
      net_payable: computedNetPayable,
      calculation_breakdown: item.calculation_breakdown || {},
      status: item.status || 'approved',
      payment_date: item.payment_date || null,
      payment_ref: item.payment_ref || null,
      created_by: userName || 'مدیر سیستم',
      tenant_id: targetTenantId,
      date_created: nowIso,
    };

    if (directusUrl && directusAdminToken) {
      try {
        const safePId = await getSafeDirectusPersonnelForeignKey(rawPId);
        const directusSlipPayload = {
          personnel_id: safePId,
          tenant_id: resolvedTenantNum,
          from_date: newSlip.from_date,
          to_date: newSlip.to_date,
          base_salary_amount: newSlip.base_salary_amount,
          total_contracts_amount: newSlip.total_contracts_amount,
          contracts_count: newSlip.contracts_count,
          commission_amount: newSlip.commission_amount,
          percentage_commission_amount: newSlip.percentage_commission_amount,
          unit_commission_amount: newSlip.unit_commission_amount,
          advances_deducted: newSlip.advances_deducted,
          bonuses_amount: newSlip.bonuses_amount,
          deductions_amount: newSlip.deductions_amount,
          net_payable: newSlip.net_payable,
          calculation_breakdown: newSlip.calculation_breakdown,
          status: newSlip.status,
          payment_date: newSlip.payment_date,
          payment_ref: newSlip.payment_ref,
          created_by: newSlip.created_by,
        };

        const resCreated = await directusFetch('/items/payroll_slips', {
          method: 'POST',
          body: JSON.stringify(directusSlipPayload),
        });

        if (resCreated?.data) {
          newSlip.id = resCreated.data.id;
        }
      } catch (err: any) {
        console.warn('Directus payroll_slips POST notice:', err.message);
      }
    }

    // Link included payroll adjustments to this newly issued slip so they are not double-counted
    const adjustmentIds: Array<string | number> = Array.isArray(item.adjustment_ids)
      ? item.adjustment_ids
      : Array.isArray(item.calculation_breakdown?.adjustments)
      ? item.calculation_breakdown.adjustments.map((a: any) => a.id).filter(Boolean)
      : [];

    for (const adjId of adjustmentIds) {
      const localAdj = payrollAdjustmentsData.find((a) => String(a.id) === String(adjId));
      if (localAdj) {
        localAdj.payroll_slip_id = newSlip.id;
      }
      if (directusUrl && directusAdminToken) {
        try {
          await directusFetch(`/items/payroll_adjustments/${encodeURIComponent(String(adjId))}`, {
            method: 'PATCH',
            body: JSON.stringify({ payroll_slip_id: newSlip.id }),
          });
        } catch (linkErr: any) {
          console.warn(`Could not link payroll_adjustment ${adjId} to slip ${newSlip.id}:`, linkErr.message);
        }
      }
    }

    payrollSlipsData.unshift(newSlip);
    createdSlips.push(newSlip);
  }

  res.status(201).json(Array.isArray(body) ? createdSlips : createdSlips[0]);
});

// --------------------------------------------------------------------------
// 7. PATCH /api/payroll/slips/:id - Update slip status (e.g. mark paid)
// --------------------------------------------------------------------------
router.patch(['/api/payroll/slips/:id', '/payroll/slips/:id'], async (req: Request, res: Response) => {
  if (!hasPayrollAccess(req)) {
    return res.status(403).json({ error: 'دسترسی غیرمجاز.' });
  }

  const { id } = req.params;
  const patch = req.body;

  if (directusUrl && directusAdminToken) {
    try {
      const updated = await directusFetch(`/items/payroll_slips/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
      if (updated?.data) {
        const idx = payrollSlipsData.findIndex((s) => String(s.id) === String(id));
        if (idx >= 0) payrollSlipsData[idx] = { ...payrollSlipsData[idx], ...updated.data };
        return res.json(updated.data);
      }
    } catch (err: any) {
      console.warn('Directus payroll_slips PATCH notice:', err.message);
    }
  }

  const idx = payrollSlipsData.findIndex((s) => String(s.id) === String(id));
  if (idx >= 0) {
    payrollSlipsData[idx] = { ...payrollSlipsData[idx], ...patch };
    return res.json(payrollSlipsData[idx]);
  }

  res.status(404).json({ error: 'فیش حقوقی یافت نشد' });
});

// --------------------------------------------------------------------------
// 8. DELETE /api/payroll/slips/:id - Delete draft slip
// --------------------------------------------------------------------------
router.delete(['/api/payroll/slips/:id', '/payroll/slips/:id'], async (req: Request, res: Response) => {
  if (!hasPayrollAccess(req)) {
    return res.status(403).json({ error: 'دسترسی غیرمجاز.' });
  }

  const { id } = req.params;

  if (directusUrl && directusAdminToken) {
    try {
      await directusFetch(`/items/payroll_slips/${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch {}
  }

  // Unlink any local adjustments tied to this deleted slip
  payrollAdjustmentsData.forEach((adj) => {
    if (String(adj.payroll_slip_id) === String(id)) {
      adj.payroll_slip_id = null;
    }
  });

  const idx = payrollSlipsData.findIndex((s) => String(s.id) === String(id));
  if (idx >= 0) {
    payrollSlipsData.splice(idx, 1);
  }

  res.json({ success: true });
});

export default router;
