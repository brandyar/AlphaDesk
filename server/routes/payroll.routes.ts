import { Router, Request, Response } from 'express';
import {
  directusUrl,
  directusAdminToken,
  personnelData,
  reportsData,
  advanceRequestsData,
  salaryConfigsData,
  payrollSlipsData,
} from '../config.ts';
import { directusFetch, directusFetchAllPages } from '../directus/client.ts';
import { getRequestUser, matchesTenant } from '../middlewares/auth.middleware.ts';
import { getSafeDirectusPersonnelForeignKey, resolvePersonnelId } from '../directus/sync.ts';
import { normalizePersianString } from '../services/phoneNormalizer.ts';
import { PersonnelSalaryConfig, PayrollSlip, CustomerReport, SalaryAdvanceRequest, CommissionTier } from '../types.ts';

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
        const list: PersonnelSalaryConfig[] = resp.data.map((c: any) => ({
          ...c,
          id: c.id,
          personnel_id: typeof c.personnel_id === 'object' && c.personnel_id !== null ? String(c.personnel_id.id) : String(c.personnel_id || ''),
          base_salary: Number(c.base_salary) || 0,
          flat_rate_percent: Number(c.flat_rate_percent) || 0,
          min_sales_target: Number(c.min_sales_target) || 0,
          is_active: Boolean(c.is_active),
          commission_tiers: typeof c.commission_tiers === 'string' ? JSON.parse(c.commission_tiers || '[]') : (c.commission_tiers || []),
        }));
        return res.json(list);
      }
    } catch (err: any) {
      console.warn('Directus personnel_salary_configs fetch notice:', err.message);
    }
  }

  res.json(salaryConfigsData);
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
      const resp = await directusFetch(`/items/personnel_salary_configs?filter[personnel_id][_eq]=${personnelId}&sort=-id&limit=1`);
      if (resp?.data && resp.data.length > 0) {
        const c = resp.data[0];
        const config: PersonnelSalaryConfig = {
          ...c,
          id: c.id,
          personnel_id: typeof c.personnel_id === 'object' && c.personnel_id !== null ? String(c.personnel_id.id) : String(c.personnel_id || ''),
          base_salary: Number(c.base_salary) || 0,
          flat_rate_percent: Number(c.flat_rate_percent) || 0,
          min_sales_target: Number(c.min_sales_target) || 0,
          is_active: Boolean(c.is_active),
          commission_tiers: typeof c.commission_tiers === 'string' ? JSON.parse(c.commission_tiers || '[]') : (c.commission_tiers || []),
        };
        return res.json(config);
      }
    } catch {}
  }

  const found = salaryConfigsData.find((c) => String(c.personnel_id) === String(personnelId));
  if (found) return res.json(found);

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
    base_salary: Number(payload.base_salary) || 0,
    commission_model: payload.commission_model || 'tiered',
    flat_rate_percent: Number(payload.flat_rate_percent) || 0,
    tiered_calculation_mode: payload.tiered_calculation_mode || 'marginal',
    commission_tiers: Array.isArray(payload.commission_tiers) ? payload.commission_tiers : [],
    min_sales_target: Number(payload.min_sales_target) || 0,
    is_active: payload.is_active !== undefined ? Boolean(payload.is_active) : true,
    effective_from: payload.effective_from || nowIso,
    date_updated: nowIso,
  };

  if (directusUrl && directusAdminToken) {
    try {
      const safePId = await getSafeDirectusPersonnelForeignKey(targetPersonnelId);
      const directusPayload = {
        ...normalizedConfig,
        personnel_id: safePId,
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
          const saved: PersonnelSalaryConfig = {
            ...updated.data,
            id: updated.data.id,
            personnel_id: targetPersonnelId,
            commission_tiers: typeof updated.data.commission_tiers === 'string' ? JSON.parse(updated.data.commission_tiers || '[]') : updated.data.commission_tiers,
          };
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
          const saved: PersonnelSalaryConfig = {
            ...created.data,
            id: created.data.id,
            personnel_id: targetPersonnelId,
            commission_tiers: typeof created.data.commission_tiers === 'string' ? JSON.parse(created.data.commission_tiers || '[]') : created.data.commission_tiers,
          };
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

  const { from_date, to_date, personnel_id } = req.body;
  const fromIso = from_date ? new Date(from_date).toISOString() : null;
  const toIso = to_date ? new Date(to_date).toISOString() : null;

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
        allConfigs = resp.data.map((c: any) => ({
          ...c,
          id: c.id,
          personnel_id: typeof c.personnel_id === 'object' && c.personnel_id !== null ? String(c.personnel_id.id) : String(c.personnel_id || ''),
          base_salary: Number(c.base_salary) || 0,
          flat_rate_percent: Number(c.flat_rate_percent) || 0,
          min_sales_target: Number(c.min_sales_target) || 0,
          is_active: Boolean(c.is_active),
          commission_tiers: typeof c.commission_tiers === 'string' ? JSON.parse(c.commission_tiers || '[]') : (c.commission_tiers || []),
        }));
      }
    } catch {}
  }
  if (allConfigs.length === 0) {
    allConfigs = [...salaryConfigsData];
  }

  // 4. Target personnel list
  let targetPersonnel = [...personnelData].filter((p) => p.status !== 'inactive' && p.active !== false);
  if (personnel_id && personnel_id !== 'all') {
    targetPersonnel = targetPersonnel.filter((p) => String(p.id) === String(personnel_id));
  }

  const results = targetPersonnel.map((p) => {
    // A. Match qualifying contract reports within the time range
    const matchingContracts = allReports.filter((r) => {
      // Must be marked as contract and have an amount
      const isContract = String(r.negotiation_status || '').trim() === 'قرارداد' || String(r.negotiation_status || '').includes('قرارداد');
      if (!isContract) return false;
      const amt = Number(r.contract_amount || 0);
      if (amt <= 0) return false;

      // Match personnel
      if (!isReportByPersonnel(r, p)) return false;

      // Match date range
      const reportDate = r.contract_date || r.date_created;
      if (!reportDate) return true;
      if (fromIso && new Date(reportDate) < new Date(fromIso)) return false;
      if (toIso && new Date(reportDate) > new Date(toIso)) return false;

      return true;
    });

    const totalContractsAmount = matchingContracts.reduce((sum, r) => sum + (Number(r.contract_amount) || 0), 0);
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

      // If needed_date or date_created is in range
      const advDate = a.needed_date || a.date_created;
      if (advDate) {
        if (fromIso && new Date(advDate) < new Date(fromIso)) return false;
        if (toIso && new Date(advDate) > new Date(toIso)) return false;
      }

      return true;
    });

    const totalAdvancesDeducted = matchingAdvances.reduce((sum, a) => sum + (Number(a.approved_amount ?? a.amount) || 0), 0);

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
        total_contracts_amount: totalContractsAmount,
        contracts_list: matchingContracts.map((c) => ({
          id: c.id,
          contract_number: c.contract_number,
          contract_date: c.contract_date || c.date_created,
          contract_amount: c.contract_amount,
          contract_items: c.contract_items,
          customer_id: c.customer_id,
        })),
        base_salary_amount: 0,
        commission_amount: 0,
        commission_breakdown: { note: 'حکم حقوقی برای این همکار هنوز تعریف نشده است' },
        advances_deducted: totalAdvancesDeducted,
        advances_list: matchingAdvances,
        bonuses_amount: 0,
        deductions_amount: 0,
        net_payable: 0,
      };
    }

    // D. Compute Base Salary
    const baseSalary = config.salary_type === 'commission' ? 0 : Number(config.base_salary) || 0;

    // E. Compute Commission
    const { commission, breakdown } = calculateCommissionForSales(totalContractsAmount, config);

    // F. Final Net Payable
    const netPayable = Math.max(0, baseSalary + commission - totalAdvancesDeducted);

    return {
      personnel_id: p.id,
      personnel_name: p.name,
      personnel_role: p.role,
      avatar: p.profile_image || p.avatar || '',
      has_config: true,
      salary_config: config,
      contracts_count: contractsCount,
      total_contracts_amount: totalContractsAmount,
      contracts_list: matchingContracts.map((c) => ({
        id: c.id,
        contract_number: c.contract_number,
        contract_date: c.contract_date || c.date_created,
        contract_amount: c.contract_amount,
        contract_items: c.contract_items,
        customer_id: c.customer_id,
      })),
      base_salary_amount: baseSalary,
      commission_amount: commission,
      commission_breakdown: breakdown,
      advances_deducted: totalAdvancesDeducted,
      advances_list: matchingAdvances,
      bonuses_amount: 0,
      deductions_amount: 0,
      net_payable: netPayable,
    };
  });


  res.json({
    from_date: fromIso,
    to_date: toIso,
    total_payable: results.reduce((sum, r) => sum + r.net_payable, 0),
    total_sales: results.reduce((sum, r) => sum + r.total_contracts_amount, 0),
    total_contracts: results.reduce((sum, r) => sum + r.contracts_count, 0),
    total_advances: results.reduce((sum, r) => sum + r.advances_deducted, 0),
    items: results,
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

          return {
            ...s,
            id: s.id,
            personnel_id: pIdStr,
            personnel_name: pName,
            base_salary_amount: Number(s.base_salary_amount) || 0,
            total_contracts_amount: Number(s.total_contracts_amount) || 0,
            contracts_count: Number(s.contracts_count) || 0,
            commission_amount: Number(s.commission_amount) || 0,
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

  const { userName } = getRequestUser(req);
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

    const newSlip: PayrollSlip = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      personnel_id: rawPId,
      personnel_name: targetName,
      from_date: item.from_date || null,
      to_date: item.to_date || null,
      base_salary_amount: Number(item.base_salary_amount) || 0,
      total_contracts_amount: Number(item.total_contracts_amount) || 0,
      contracts_count: Number(item.contracts_count) || 0,
      commission_amount: Number(item.commission_amount) || 0,
      advances_deducted: Number(item.advances_deducted) || 0,
      bonuses_amount: Number(item.bonuses_amount) || 0,
      deductions_amount: Number(item.deductions_amount) || 0,
      net_payable: Number(item.net_payable) || 0,
      calculation_breakdown: item.calculation_breakdown || {},
      status: item.status || 'approved',
      payment_date: item.payment_date || null,
      payment_ref: item.payment_ref || null,
      created_by: userName || 'مدیر سیستم',
      date_created: nowIso,
    };

    if (directusUrl && directusAdminToken) {
      try {
        const safePId = await getSafeDirectusPersonnelForeignKey(rawPId);
        const directusSlipPayload = {
          personnel_id: safePId,
          from_date: newSlip.from_date,
          to_date: newSlip.to_date,
          base_salary_amount: newSlip.base_salary_amount,
          total_contracts_amount: newSlip.total_contracts_amount,
          contracts_count: newSlip.contracts_count,
          commission_amount: newSlip.commission_amount,
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
      await directusFetch(`/items/payroll_slips/${id}`, { method: 'DELETE' });
    } catch {}
  }

  const idx = payrollSlipsData.findIndex((s) => String(s.id) === String(id));
  if (idx >= 0) {
    payrollSlipsData.splice(idx, 1);
  }

  res.json({ success: true });
});

export default router;
