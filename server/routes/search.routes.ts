import { Router, Request, Response } from 'express';
import {
  directusUrl,
  directusAdminToken,
  customersData,
  reportsData,
  coldLeadsData,
  personnelData,
} from '../config.ts';
import { directusFetch } from '../directus/client.ts';
import {
  ensureCustomersCache,
  ensureReportsCache,
  computeCustomerExpiration,
  updateExpirationFlags,
} from '../directus/cache.ts';
import { resolveDirectusTenantId } from '../directus/sync.ts';
import {
  normalizePersianString,
  normalizeContactValue,
  asyncCheckContactDuplicate,
} from '../services/phoneNormalizer.ts';
import { matchesCustomerSearch } from './customers.routes.ts';
import { getRequestUser, matchesTenant } from '../middlewares/auth.middleware.ts';

const router = Router();

function toEnglishDigits(str: string): string {
  const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
  const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
  return String(str || '')
    .replace(/[۰-۹]/g, (w) => String(persianDigits.indexOf(w)))
    .replace(/[٠-٩]/g, (w) => String(arabicDigits.indexOf(w)));
}

function extractDigits(str: string): string {
  return toEnglishDigits(str).replace(/[^\d]/g, '');
}

function normalizePhoneDigits(digits: string): string {
  if (!digits) return '';
  if (digits.startsWith('0098') && digits.length > 4) return '0' + digits.slice(4);
  if (digits.startsWith('98') && digits.length >= 11) return '0' + digits.slice(2);
  if (digits.length === 10 && digits.startsWith('9')) return '0' + digits;
  return digits;
}

function isFreePoolCustomer(c: any): boolean {
  if (!c) return false;
  const st = String(c.status || '').trim();
  if (st === 'قرارداد' || st === 'قرارداد / فاکتور' || st === 'قرارداد/فاکتور' || st === 'لیست سیاه') {
    return false;
  }
  const isUnassigned = !c.assigned_marketer_id || c.assigned_marketer_name === 'تخصیص نیافته';
  const isDeadlinePassed = Boolean(
    c.assignment_deadline && Date.now() > new Date(c.assignment_deadline).getTime()
  );
  return Boolean(c.is_expired || isDeadlinePassed || isUnassigned);
}

function customerBelongsToUser(
  c: any,
  personnelId: string,
  userId: string,
  userName: string
): boolean {
  if (!c) return false;
  const cMid = String(c.assigned_marketer_id || '').trim().toLowerCase();
  const cMname = normalizePersianString(c.assigned_marketer_name);
  const pId = String(personnelId || '').trim().toLowerCase();
  const rawPId = pId.replace(/^p-/, '');
  const uId = String(userId || '').trim().toLowerCase();
  const uNameNorm = normalizePersianString(userName);

  if (cMid) {
    if (pId && (cMid === pId || cMid === rawPId || cMid === `p-${rawPId}`)) return true;
    if (uId && (cMid === uId || cMid === `p-${uId}`)) return true;
  }
  if (uNameNorm && cMname && (cMname === uNameNorm || cMname.includes(uNameNorm))) {
    return true;
  }
  return false;
}

function scoreCustomerAndReason(
  c: any,
  normQuery: string,
  normPhoneDigits: string
): { score: number; match_reason: string } {
  let score = 10;
  let reason = 'تطابق مشخصات';

  const companyNorm = normalizePersianString(c.company_name);
  const managerNorm = normalizePersianString(c.manager_name);
  const negotiatorNorm = normalizePersianString(c.negotiator_name);
  const cityNorm = normalizePersianString(`${c.city || ''} ${c.province || ''}`);
  const businessNorm = normalizePersianString(c.business_type);

  if (normQuery) {
    if (companyNorm === normQuery) {
      score = Math.max(score, 120);
      reason = 'تطابق دقیق نام شرکت';
    } else if (companyNorm.startsWith(normQuery)) {
      score = Math.max(score, 90);
      reason = 'نام شرکت / برند';
    } else if (companyNorm.includes(normQuery)) {
      score = Math.max(score, 65);
      reason = 'نام شرکت / برند';
    }

    if (managerNorm.includes(normQuery)) {
      score = Math.max(score, managerNorm.startsWith(normQuery) ? 80 : 55);
      if (reason === 'تطابق مشخصات') reason = 'نام مدیریت';
    }
    if (negotiatorNorm.includes(normQuery)) {
      score = Math.max(score, negotiatorNorm.startsWith(normQuery) ? 75 : 50);
      if (reason === 'تطابق مشخصات') reason = 'طرف مذاکره';
    }
    if (businessNorm.includes(normQuery)) {
      score = Math.max(score, 40);
      if (reason === 'تطابق مشخصات') reason = 'صنف و فعالیت';
    }
    if (cityNorm.includes(normQuery)) {
      score = Math.max(score, 35);
      if (reason === 'تطابق مشخصات') reason = 'شهر / استان';
    }
  }

  if (normPhoneDigits.length >= 3) {
    const allNums = [
      ...(Array.isArray(c.mobile_numbers) ? c.mobile_numbers : []),
      ...(Array.isArray(c.landline_numbers) ? c.landline_numbers : []),
      ...(Array.isArray(c.manager_phones) ? c.manager_phones : []),
      ...(Array.isArray(c.negotiator_phones) ? c.negotiator_phones : []),
      c.telegram_phone,
      ...(Array.isArray(c.contacts) ? c.contacts.map((ct: any) => ct?.normalized_value || ct?.value) : []),
    ].filter(Boolean);

    for (const num of allNums) {
      const d = normalizePhoneDigits(extractDigits(String(num)));
      if (!d) continue;
      if (d === normPhoneDigits) {
        score = Math.max(score, 140);
        reason = 'تطابق دقیق شماره تماس';
        break;
      }
      if (d.endsWith(normPhoneDigits) || d.includes(normPhoneDigits)) {
        score = Math.max(score, 105);
        reason = 'شماره تماس';
        break;
      }
    }
  }

  const socialAndEmail = [
    ...(Array.isArray(c.telegram_ids) ? c.telegram_ids : []),
    ...(Array.isArray(c.instagram_ids) ? c.instagram_ids : []),
    ...(Array.isArray(c.emails) ? c.emails : []),
    ...(Array.isArray(c.websites) ? c.websites : []),
  ].filter(Boolean);
  if (normQuery && socialAndEmail.some((v) => String(v).toLowerCase().includes(normQuery))) {
    score = Math.max(score, 70);
    reason = 'شبکه اجتماعی / ایمیل / سایت';
  }

  if (c.status === 'قرارداد' || c.status === 'قرارداد / فاکتور') {
    score += 5;
  }

  return { score, match_reason: reason };
}

function matchesStatusFilter(statusVal: string, filterStatus: string, isExpired?: boolean): boolean {
  if (!filterStatus || filterStatus === 'all' || filterStatus === 'همه') return true;
  if (filterStatus === 'expired') return Boolean(isExpired);
  if (filterStatus === 'قرارداد' || filterStatus === 'قرارداد / فاکتور') {
    const st = String(statusVal || '').trim();
    return st === 'قرارداد' || st === 'قرارداد / فاکتور' || st === 'قرارداد/فاکتور';
  }
  return String(statusVal || '').trim() === filterStatus;
}

// GET /api/search?q=...&scope=all|customers|free_pool|reports|cold_leads|personnel&status=...&marketer_id=...&limit=10
router.get('/', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const {
    q = '',
    scope = 'all',
    status = 'all',
    marketer_id = 'all',
    limit = '10',
  } = req.query;

  const userCtx = getRequestUser(req);
  const {
    userId,
    personnelId,
    isAdmin,
    isPersonnelAdmin,
    canViewAllCustomers,
    reportViewScope,
    userName,
    tenantId,
    isAuthenticated,
  } = userCtx;

  const rawQuery = String(q || '').trim();
  const maxLimit = Math.min(Math.max(1, parseInt(String(limit), 10) || 10), 25);
  const scopeStr = String(scope || 'all');
  const statusFilter = String(status || 'all');
  const marketerFilter = String(marketer_id || 'all');

  if (!isAuthenticated) {
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'برای انجام جستجو باید وارد حساب کاربری خود شوید.',
    });
  }

  if (rawQuery.length < 2 && statusFilter === 'all' && marketerFilter === 'all') {
    return res.json({
      customers: [],
      free_pool: [],
      reports: [],
      cold_leads: [],
      personnel: [],
      phoneConflict: null,
      meta: {
        query: rawQuery,
        elapsed_ms: Date.now() - startTime,
        source: directusUrl && directusAdminToken ? 'directus' : 'memory',
      },
    });
  }

  const normQuery = normalizePersianString(rawQuery);
  const rawDigits = extractDigits(rawQuery);
  const normPhoneDigits = normalizePhoneDigits(rawDigits);
  const isPhoneLike = rawDigits.length >= 4 && /^[\d۰-۹٠-٩+\s\-()]+$/.test(rawQuery);

  const canSeeAllCust = Boolean(isAdmin || isPersonnelAdmin || canViewAllCustomers);
  const canSeeAllRep = Boolean(canSeeAllCust || reportViewScope === 'all');
  const canSeePersonnel = Boolean(isAdmin || isPersonnelAdmin || canViewAllCustomers);

  const wantCustomers = scopeStr === 'all' || scopeStr === 'customers';
  const wantFreePool = scopeStr === 'all' || scopeStr === 'free_pool';
  const wantReports = scopeStr === 'all' || scopeStr === 'reports';
  const wantColdLeads = scopeStr === 'all' || scopeStr === 'cold_leads';
  const wantPersonnel = (scopeStr === 'all' || scopeStr === 'personnel') && canSeePersonnel;

  const hasDirectus = Boolean(directusUrl && directusAdminToken);

  try {
    // 1. Load/query customers + free pool
    let allTenantCustomers: any[] = [];
    if (wantCustomers || wantFreePool) {
      if (hasDirectus) {
        const cached = await ensureCustomersCache().catch(() => []);
        allTenantCustomers = (Array.isArray(cached) ? cached : []).map((c) => computeCustomerExpiration(c));

        // If query is phone-like, also probe customer_contacts directly in Directus to catch brand-new entries not yet in cache
        if (isPhoneLike && normPhoneDigits.length >= 5) {
          const contactRes = await directusFetch(
            `/items/customer_contacts?filter[_or][0][normalized_value][_icontains]=${encodeURIComponent(
              normPhoneDigits
            )}&filter[_or][1][value][_icontains]=${encodeURIComponent(
              rawDigits
            )}&fields=customer_id.*&limit=15`
          ).catch(() => null);
          if (contactRes?.data && Array.isArray(contactRes.data)) {
            const existingIds = new Set(allTenantCustomers.map((c) => String(c.id)));
            for (const row of contactRes.data) {
              const cust = row?.customer_id;
              if (cust && typeof cust === 'object' && cust.id && !existingIds.has(String(cust.id))) {
                existingIds.add(String(cust.id));
                allTenantCustomers.push(computeCustomerExpiration(cust));
              }
            }
          }
        }
      } else {
        updateExpirationFlags();
        allTenantCustomers = customersData.map((c) => computeCustomerExpiration(c));
      }

      if (tenantId && tenantId !== 'all') {
        allTenantCustomers = allTenantCustomers.filter((c) => matchesTenant(c.tenant_id, tenantId));
      }
    }

    // Build matched customers & free_pool
    let matchedCustomers: any[] = [];
    let matchedFreePool: any[] = [];

    if (wantCustomers) {
      let scoped = canSeeAllCust
        ? allTenantCustomers
        : allTenantCustomers.filter((c) => customerBelongsToUser(c, personnelId, userId, userName));

      if (canSeeAllCust && marketerFilter && marketerFilter !== 'all' && marketerFilter !== 'همه') {
        scoped = scoped.filter((c) => String(c.assigned_marketer_id || '') === marketerFilter);
      }
      if (statusFilter !== 'all') {
        scoped = scoped.filter((c) => matchesStatusFilter(c.status, statusFilter, c.is_expired));
      }
      if (rawQuery) {
        scoped = scoped.filter((c) => matchesCustomerSearch(c, rawQuery));
      }

      matchedCustomers = scoped
        .map((c) => {
          const { score, match_reason } = scoreCustomerAndReason(c, normQuery, normPhoneDigits);
          return { ...c, _search_score: score, match_reason };
        })
        .sort((a, b) => b._search_score - a._search_score)
        .slice(0, maxLimit);
    }

    const matchedCustIdSet = new Set(matchedCustomers.map((c) => String(c.id)));

    if (wantFreePool && rawQuery.length >= 2) {
      const freeCandidates = allTenantCustomers.filter(
        (c) => !matchedCustIdSet.has(String(c.id)) && isFreePoolCustomer(c) && matchesCustomerSearch(c, rawQuery)
      );
      matchedFreePool = freeCandidates
        .map((c) => {
          const { score, match_reason } = scoreCustomerAndReason(c, normQuery, normPhoneDigits);
          return { ...c, _search_score: score, match_reason };
        })
        .sort((a, b) => b._search_score - a._search_score)
        .slice(0, Math.min(maxLimit, 8));
    }

    // Build quick customer lookup map for enriching reports
    const customerNameMap = new Map<string, string>();
    for (const c of allTenantCustomers) {
      if (c?.id && c?.company_name) {
        customerNameMap.set(String(c.id), c.company_name);
      }
    }

    // 2. Deep Reports & Contracts Search + Cold Leads + Personnel + Conflict Check in Parallel
    const searchReportsPromise = (async () => {
      if (!wantReports || rawQuery.length < 2) return [];

      let rawReports: any[] = [];
      if (hasDirectus) {
        // Direct server-side query across full customer_reports table in Directus
        const searchTerm = isPhoneLike && normPhoneDigits.length >= 4 ? normPhoneDigits : rawQuery;
        let dPath = `/items/customer_reports?limit=35&sort=-date_created`;
        let andIdx = 0;

        if (tenantId && tenantId !== 'all') {
          const tNum = resolveDirectusTenantId(tenantId);
          if (tNum && tNum > 1) {
            dPath += `&filter[_and][${andIdx++}][tenant_id][_eq]=${tNum}`;
          }
        }

        if (!canSeeAllRep && (userName || personnelId || userId)) {
          let rOr = 0;
          if (userName) {
            dPath += `&filter[_and][${andIdx}][_or][${rOr++}][negotiator_name][_icontains]=${encodeURIComponent(userName)}`;
            dPath += `&filter[_and][${andIdx}][_or][${rOr++}][customer_id][assigned_marketer_name][_icontains]=${encodeURIComponent(userName)}`;
          }
          if (personnelId) {
            dPath += `&filter[_and][${andIdx}][_or][${rOr++}][customer_id][assigned_marketer_id][_eq]=${encodeURIComponent(String(personnelId))}`;
            const rawP = String(personnelId).replace(/^p-/, '');
            if (rawP !== String(personnelId)) {
              dPath += `&filter[_and][${andIdx}][_or][${rOr++}][customer_id][assigned_marketer_id][_eq]=${encodeURIComponent(rawP)}`;
            }
          }
          if (userId) {
            dPath += `&filter[_and][${andIdx}][_or][${rOr++}][customer_id][assigned_marketer_id][_eq]=${encodeURIComponent(String(userId))}`;
          }
          andIdx++;
        }

        const cleanQueryTerm = rawQuery.replace(/^#/, '');
        let qOr = 0;
        dPath += `&filter[_and][${andIdx}][_or][${qOr++}][report_text][_icontains]=${encodeURIComponent(rawQuery)}`;
        dPath += `&filter[_and][${andIdx}][_or][${qOr++}][contract_number][_icontains]=${encodeURIComponent(cleanQueryTerm)}`;
        dPath += `&filter[_and][${andIdx}][_or][${qOr++}][contract_items][_icontains]=${encodeURIComponent(rawQuery)}`;
        dPath += `&filter[_and][${andIdx}][_or][${qOr++}][negotiation_phone][_icontains]=${encodeURIComponent(searchTerm)}`;
        dPath += `&filter[_and][${andIdx}][_or][${qOr++}][negotiator_name][_icontains]=${encodeURIComponent(rawQuery)}`;
        dPath += `&filter[_and][${andIdx}][_or][${qOr++}][customer_negotiator_name][_icontains]=${encodeURIComponent(rawQuery)}`;
        dPath += `&filter[_and][${andIdx}][_or][${qOr++}][customer_id][company_name][_icontains]=${encodeURIComponent(rawQuery)}`;
        if (rawDigits && rawDigits !== cleanQueryTerm) {
          dPath += `&filter[_and][${andIdx}][_or][${qOr++}][contract_number][_icontains]=${encodeURIComponent(rawDigits)}`;
        }
        andIdx++;

        dPath += `&fields=${encodeURIComponent(
          'id,customer_id.id,customer_id.company_name,customer_id.assigned_marketer_id,customer_id.assigned_marketer_name,negotiator_name,customer_negotiator_name,negotiation_phone,report_text,negotiation_score,next_followup_date,negotiation_status,created_by,tenant_id,date_created,contract_number,contract_date,contract_items,contract_amount'
        )}`;

        const [directRes, cachedReps] = await Promise.all([
          directusFetch(dPath).catch(() => null),
          ensureReportsCache().catch(() => []),
        ]);

        const seenRepIds = new Set<string>();
        const combined: any[] = [];

        for (const r of [...(directRes?.data || []), ...(Array.isArray(cachedReps) ? cachedReps : [])]) {
          if (!r || !r.id || seenRepIds.has(String(r.id))) continue;
          seenRepIds.add(String(r.id));
          const cObj = typeof r.customer_id === 'object' && r.customer_id !== null ? r.customer_id : null;
          const cId = cObj ? String(cObj.id || '') : String(r.customer_id || '');
          const cName = r.customer_name || cObj?.company_name || customerNameMap.get(cId) || '';
          combined.push({
            ...r,
            customer_id: cId,
            customer_name: cName,
            _cust_marketer_id: cObj?.assigned_marketer_id || '',
            _cust_marketer_name: cObj?.assigned_marketer_name || '',
          });
        }
        rawReports = combined;
      } else {
        rawReports = reportsData.map((r) => ({
          ...r,
          customer_name: (r as any).customer_name || customerNameMap.get(String(r.customer_id)) || '',
        }));
      }

      if (tenantId && tenantId !== 'all') {
        rawReports = rawReports.filter((r) => matchesTenant(r.tenant_id, tenantId));
      }

      if (!canSeeAllRep) {
        const pId = String(personnelId || '').trim().toLowerCase();
        const uId = String(userId || '').trim().toLowerCase();
        const uNorm = normalizePersianString(userName);
        rawReports = rawReports.filter((r) => {
          const cb = String(r.created_by || '').trim().toLowerCase();
          const neg = normalizePersianString(r.negotiator_name);
          const mId = String(r._cust_marketer_id || '').trim().toLowerCase();
          if (pId && (cb === pId || mId === pId || mId === pId.replace(/^p-/, ''))) return true;
          if (uId && (cb === uId || mId === uId)) return true;
          if (uNorm && neg && (neg === uNorm || neg.includes(uNorm))) return true;
          return false;
        });
      }

      if (statusFilter !== 'all' && statusFilter !== 'expired') {
        rawReports = rawReports.filter((r) => matchesStatusFilter(r.negotiation_status, statusFilter));
      }

      const cleanContractNeedle = rawDigits || normQuery.replace(/^#/, '');

      return rawReports
        .map((r) => {
          let score = 0;
          let matchReason = '';

          const contractNumDigits = extractDigits(r.contract_number || '');
          const contractNumNorm = normalizePersianString(r.contract_number || '');
          const phoneDigits = normalizePhoneDigits(extractDigits(r.negotiation_phone || ''));
          const itemsNorm = normalizePersianString(r.contract_items || '');
          const textNorm = normalizePersianString(r.report_text || '');
          const custNameNorm = normalizePersianString(r.customer_name || '');
          const negNorm = normalizePersianString(`${r.negotiator_name || ''} ${r.customer_negotiator_name || ''}`);

          if (cleanContractNeedle && (contractNumDigits.includes(cleanContractNeedle) || contractNumNorm.includes(cleanContractNeedle))) {
            score = contractNumDigits === cleanContractNeedle ? 140 : 110;
            matchReason = `شماره قرارداد ${r.contract_number}`;
          } else if (normPhoneDigits.length >= 4 && phoneDigits.includes(normPhoneDigits)) {
            score = phoneDigits === normPhoneDigits ? 130 : 95;
            matchReason = 'شماره تماس مذاکره';
          } else if (normQuery && itemsNorm.includes(normQuery)) {
            score = 80;
            matchReason = 'اقلام قرارداد';
          } else if (normQuery && custNameNorm.includes(normQuery)) {
            score = 65;
            matchReason = 'نام مشتری';
          } else if (normQuery && negNorm.includes(normQuery)) {
            score = 55;
            matchReason = 'مذاکره‌کننده';
          } else if (normQuery && textNorm.includes(normQuery)) {
            score = 45;
            matchReason = 'متن مذاکره';
          }

          return score > 0 ? { ...r, _search_score: score, match_reason: matchReason } : null;
        })
        .filter(Boolean)
        .sort((a: any, b: any) => b._search_score - a._search_score)
        .slice(0, Math.min(maxLimit, 8));
    })();

    const searchColdLeadsPromise = (async () => {
      if (!wantColdLeads || rawQuery.length < 2) return [];
      let leads: any[] = [];
      if (hasDirectus) {
        const cleanTerm = isPhoneLike && normPhoneDigits ? normPhoneDigits : rawQuery;
        let lPath = `/items/cold_leads?limit=20&sort=-date_created`;
        lPath += `&filter[_or][0][phone_number][_icontains]=${encodeURIComponent(cleanTerm)}`;
        lPath += `&filter[_or][1][contact_name][_icontains]=${encodeURIComponent(rawQuery)}`;
        lPath += `&filter[_or][2][notes][_icontains]=${encodeURIComponent(rawQuery)}`;
        lPath += `&filter[_or][3][source][_icontains]=${encodeURIComponent(rawQuery)}`;
        if (rawDigits && rawDigits !== cleanTerm) {
          lPath += `&filter[_or][4][phone_number][_icontains]=${encodeURIComponent(rawDigits)}`;
        }
        const lRes = await directusFetch(lPath).catch(() => null);
        if (lRes?.data && Array.isArray(lRes.data)) {
          leads = lRes.data.map((l: any) => ({
            ...l,
            assigned_to_id: typeof l.assigned_to === 'object' && l.assigned_to !== null ? l.assigned_to.id : String(l.assigned_to || ''),
            assigned_to_name:
              l.assigned_to_name ||
              (typeof l.assigned_to === 'object' && l.assigned_to !== null ? l.assigned_to.name || l.assigned_to.first_name : 'تخصیص نیافته'),
          }));
        }
      } else {
        leads = coldLeadsData;
      }

      if (tenantId && tenantId !== 'all') {
        leads = leads.filter((l) => matchesTenant(l.tenant_id, tenantId));
      }

      if (!canSeeAllCust) {
        leads = leads.filter(
          (l) =>
            (personnelId && (l.assigned_to_id === personnelId || l.assigned_to === personnelId)) ||
            (userId && (l.assigned_to_id === userId || l.assigned_to === userId)) ||
            (userName && (l.assigned_to_name === userName || l.assigned_to === userName))
        );
      }

      return leads
        .filter((l) => {
          const pDigits = normalizePhoneDigits(extractDigits(l.phone_number || ''));
          if (normPhoneDigits.length >= 3 && pDigits.includes(normPhoneDigits)) return true;
          const hay = normalizePersianString(`${l.contact_name || ''} ${l.source || ''} ${l.notes || ''}`);
          return Boolean(normQuery && hay.includes(normQuery));
        })
        .slice(0, 6)
        .map((l) => ({
          ...l,
          match_reason:
            normPhoneDigits.length >= 3 && normalizePhoneDigits(extractDigits(l.phone_number || '')).includes(normPhoneDigits)
              ? 'شماره لید سرد'
              : 'مشخصات لید سرد',
        }));
    })();

    const searchPersonnelPromise = (async () => {
      if (!wantPersonnel || rawQuery.length < 2) return [];
      let pList = personnelData;
      if (tenantId && tenantId !== 'all') {
        pList = pList.filter((p) => matchesTenant(p.tenant_id, tenantId));
      }
      return pList
        .filter((p) => {
          if (p.status === 'inactive' || p.active === false) return false;
          const hay = normalizePersianString(`${p.name || ''} ${p.username || ''} ${p.email || ''} ${p.role || ''}`);
          if (normQuery && hay.includes(normQuery)) return true;
          if (normPhoneDigits.length >= 3) {
            const pPhone = normalizePhoneDigits(extractDigits(p.phone || ''));
            if (pPhone.includes(normPhoneDigits)) return true;
          }
          return false;
        })
        .slice(0, 5)
        .map((p) => ({
          id: p.id,
          name: p.name,
          username: p.username,
          role: p.role,
          phone: p.phone,
          avatar: p.profile_image || p.avatar,
        }));
    })();

    const conflictPromise = (async () => {
      if (rawDigits.length < 5) return null;
      const dup = await asyncCheckContactDuplicate(normPhoneDigits || rawDigits, 'mobile').catch(() => null);
      if (!dup || !dup.isDuplicate || !dup.matchedCustomer) return null;
      const mcId = String(dup.matchedCustomer.id);
      const alreadyVisible =
        matchedCustIdSet.has(mcId) || matchedFreePool.some((fc) => String(fc.id) === mcId);
      if (alreadyVisible) return null;
      return dup;
    })();

    const [matchedReports, matchedColdLeads, matchedPersonnel, phoneConflict] = await Promise.all([
      searchReportsPromise,
      searchColdLeadsPromise,
      searchPersonnelPromise,
      conflictPromise,
    ]);

    return res.json({
      customers: matchedCustomers,
      free_pool: matchedFreePool,
      reports: matchedReports,
      cold_leads: matchedColdLeads,
      personnel: matchedPersonnel,
      phoneConflict,
      meta: {
        query: rawQuery,
        normalized_phone: isPhoneLike ? normPhoneDigits : null,
        elapsed_ms: Date.now() - startTime,
        source: hasDirectus ? 'directus' : 'memory',
      },
    });
  } catch (err: any) {
    console.error('Deep search endpoint error:', err);
    return res.status(500).json({
      error: 'SEARCH_ERROR',
      message: err?.message || 'خطا در اجرای جستجوی عمیق سرور',
    });
  }
});

export default router;
